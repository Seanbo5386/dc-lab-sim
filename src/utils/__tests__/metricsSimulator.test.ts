import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MetricsSimulator } from "../metricsSimulator";
import { ClusterPhysicsEngine } from "@/simulation/clusterPhysicsEngine";
import type { GPU } from "@/types/hardware";

function createMockGPU(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: "GPU-TEST-0000",
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: "0000:10:00.0",
    temperature: 40,
    powerDraw: 200,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 10000,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode: false,
    migInstances: [],
    nvlinks: [],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  };
}

describe("MetricsSimulator", () => {
  let simulator: MetricsSimulator;

  beforeEach(() => {
    simulator = new MetricsSimulator();
  });

  describe("simulateWorkload", () => {
    it("should set idle utilization near 5%", () => {
      const gpus = [createMockGPU({ utilization: 50 })];
      const result = simulator.simulateWorkload(gpus, "idle");
      expect(result[0].utilization).toBeLessThan(15);
    });

    it("should set training utilization near 95%", () => {
      const gpus = [createMockGPU({ utilization: 0 })];
      const result = simulator.simulateWorkload(gpus, "training");
      expect(result[0].utilization).toBeGreaterThan(80);
    });

    it("should set stress utilization near 100%", () => {
      const gpus = [createMockGPU({ utilization: 0 })];
      const result = simulator.simulateWorkload(gpus, "stress");
      expect(result[0].utilization).toBeGreaterThan(90);
    });

    it("should adjust memory usage based on workload", () => {
      const gpus = [createMockGPU({ memoryTotal: 81920, memoryUsed: 0 })];

      const idle = simulator.simulateWorkload(gpus, "idle");
      const training = simulator.simulateWorkload(gpus, "training");

      expect(training[0].memoryUsed).toBeGreaterThan(idle[0].memoryUsed);
    });

    it("should set powerDraw consistent with the new utilization, not the GPU's previous value", () => {
      // Idle GPU (idle powerDraw ~60W for a 400W-limit A100) gets a training
      // workload applied — before this fix, powerDraw stayed at 60W while
      // utilization jumped to ~95%. It should immediately reflect ~95% load.
      const gpus = [
        createMockGPU({ powerLimit: 400, powerDraw: 60, utilization: 0 }),
      ];
      const result = simulator.simulateWorkload(gpus, "training");
      // Physics floor/target: 400 * (0.15 + 0.90*0.85) = 366 minimum-ish for
      // 90% utilization; allow for the +/-5 utilization jitter simulateWorkload
      // applies, so assert a wide-but-meaningful band clearly above idle.
      expect(result[0].powerDraw).toBeGreaterThan(300);
      expect(result[0].powerDraw).toBeLessThanOrEqual(400);
    });

    it("should set temperature consistent with the new powerDraw, not the GPU's previous value", () => {
      const gpus = [
        createMockGPU({ powerLimit: 400, temperature: 35, utilization: 0 }),
      ];
      const result = simulator.simulateWorkload(gpus, "training");
      // AMBIENT_TEMP(32) + powerRatio * (THERMAL_CEILING(95) - 32); a ~90%+
      // power ratio should land temperature well above the idle 35°C.
      expect(result[0].temperature).toBeGreaterThan(60);
    });

    it("should leave idle-pattern GPUs near the idle power/temp floor", () => {
      const gpus = [
        createMockGPU({
          powerLimit: 400,
          powerDraw: 300,
          temperature: 80,
          utilization: 90,
        }),
      ];
      const result = simulator.simulateWorkload(gpus, "idle");
      expect(result[0].powerDraw).toBeLessThan(150);
      expect(result[0].temperature).toBeLessThan(55);
    });

    it("should set powerDraw/temperature using the SAME equilibrium formula tickGPU converges toward (no post-apply re-jump)", () => {
      // Regression guard for the Phase-3 model split: if this snapshot used
      // a different formula than tickGPU's steady state, applying a
      // workload would visibly jump to one value then re-settle at another
      // within a few ticks.
      const gpus = [
        createMockGPU({
          powerLimit: 400,
          powerDraw: 60,
          temperature: 35,
          utilization: 0,
        }),
      ];
      const [snapshot] = simulator.simulateWorkload(gpus, "training");

      const engine = new ClusterPhysicsEngine();
      let converged = { ...snapshot };
      for (let i = 0; i < 50; i++) {
        converged = engine.tickGPU(converged);
      }
      // Ticking the snapshot forward should barely move it (within a few
      // degrees/watts of noise), not drift toward a materially different
      // equilibrium.
      expect(
        Math.abs(converged.temperature - snapshot.temperature),
      ).toBeLessThan(6);
      expect(Math.abs(converged.powerDraw - snapshot.powerDraw)).toBeLessThan(
        40,
      );
    });
  });

  describe("injectFault", () => {
    it("should inject XID error and set Critical health", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "xid");

      expect(result.xidErrors.length).toBe(1);
      expect(result.xidErrors[0].code).toBe(48);
      expect(result.healthStatus).toBe("Critical");
    });

    it("should inject ECC error", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "ecc");

      expect(result.eccErrors.doubleBit).toBe(1);
      expect(result.healthStatus).toBe("Critical");
    });

    it("should inject a persistent thermal fault that gradually drives temperature up and throttles clocks (not a one-shot snap)", () => {
      // Post-Phase-3: injectFault no longer snaps temperature/clocksSM
      // directly (that self-erased within a few ticks once the next
      // physics pass pulled it back toward the unaffected load-derived
      // target — PHYS-9/LIVE-2). It sets a persistent activeFaultHeatWatts
      // term instead, so the returned GPU is unchanged until the physics
      // engine ticks it forward.
      const gpu = createMockGPU({
        temperature: 40,
        clocksSM: 1410,
        powerLimit: 400,
      });
      const faulted = simulator.injectFault(gpu, "thermal");

      expect(faulted.healthStatus).toBe("Warning");
      expect(faulted.activeFaultHeatWatts).toBeGreaterThan(0);
      expect(faulted.temperature).toBe(40);
      expect(faulted.clocksSM).toBe(1410);

      const engine = new ClusterPhysicsEngine();
      let state = faulted;
      for (let i = 0; i < 60; i++) {
        state = engine.tickGPU(state);
      }
      // Sustained fault heat should push temperature well past the A100's
      // ~85°C throttle threshold and pull clocks down from boost.
      expect(state.temperature).toBeGreaterThan(70);
      expect(state.clocksSM).toBeLessThan(1410);
    });

    it("should use architecture-appropriate boost clock for thermal throttle", () => {
      const h100Gpu = createMockGPU({
        name: "NVIDIA H100-SXM5-80GB",
        clocksSM: 1980,
        temperature: 40,
        powerLimit: 700,
      });
      const faulted = simulator.injectFault(h100Gpu, "thermal");

      const engine = new ClusterPhysicsEngine();
      let state = faulted;
      for (let i = 0; i < 60; i++) {
        state = engine.tickGPU(state);
      }
      // H100 boost is 1980 MHz; sustained fault heat should push it past
      // the H100's ~83°C throttle threshold and pull clocks down from boost.
      expect(state.temperature).toBeGreaterThan(80);
      expect(state.clocksSM).toBeLessThan(1980);
    });

    it("should inject NVLink failure", () => {
      const gpu = createMockGPU({
        nvlinks: [
          {
            linkId: 0,
            status: "Active",
            speed: 600,
            txErrors: 0,
            rxErrors: 0,
            replayErrors: 0,
          },
        ],
      });
      const result = simulator.injectFault(gpu, "nvlink");

      expect(result.nvlinks[0].status).toBe("Down");
      expect(result.nvlinks[0].txErrors).toBe(100);
    });

    it("should inject PCIe error", () => {
      const gpu = createMockGPU();
      const result = simulator.injectFault(gpu, "pcie");

      expect(result.xidErrors.length).toBe(1);
      expect(result.xidErrors[0].code).toBe(62);
    });

    it("should inject power warning", () => {
      const gpu = createMockGPU({ powerLimit: 400 });
      const result = simulator.injectFault(gpu, "power");

      expect(result.powerDraw).toBe(400 * 0.95);
      expect(result.healthStatus).toBe("Warning");
    });
  });

  describe("injectFault thermal persistence", () => {
    it("should set activeFaultHeatWatts instead of a one-shot temperature/clock snap", () => {
      const gpu = createMockGPU({
        temperature: 40,
        clocksSM: 1410,
        powerLimit: 400,
      });
      const faulted = simulator.injectFault(gpu, "thermal");
      expect(faulted.activeFaultHeatWatts).toBeGreaterThan(0);
      expect(faulted.healthStatus).toBe("Warning");
    });
  });

  describe("start and stop", () => {
    it("should not start twice", () => {
      let callCount = 0;
      simulator.start(() => {
        callCount++;
      }, 10000);

      // Try starting again - should be no-op
      simulator.start(() => {
        callCount += 100;
      }, 10000);

      simulator.stop();
      // Only one start should have been effective
      expect(callCount).toBe(0); // Never called since interval hasn't fired
    });

    it("should stop cleanly", () => {
      simulator.start(() => {}, 10000);
      simulator.stop();
      // Should not throw when stopping again
      simulator.stop();
    });
  });

  describe("job-aware GPU metrics", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Run one metrics update tick via start() + fake timer — the production path (CODE-7: previously used the legacy startGpuOnly() shim, which no production caller uses). */
    function tickMetrics(gpus: GPU[]): GPU[] {
      let result: GPU[] = gpus;
      const sim = new MetricsSimulator();
      sim.start((updater) => {
        result = updater({ gpus, hcas: [] }).gpus;
      }, 1000);
      vi.advanceTimersByTime(1000);
      sim.stop();
      return result;
    }

    it("should sustain an applied workload without an allocated job", () => {
      // Simulates the sandbox "Apply Workload" path: simulateWorkload sets a
      // high utilization but no allocatedJobId. The live tick must treat this
      // as load and keep utilization elevated instead of resetting to idle.
      const workloadGpu = createMockGPU({ utilization: 60 });
      expect(workloadGpu.allocatedJobId).toBeUndefined();

      let gpu = workloadGpu;
      for (let i = 0; i < 30; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      expect(gpu.utilization).toBeGreaterThan(40);
    });

    it("should ramp power and temperature for an applied workload", () => {
      // An applied workload (no allocated job) should drive power draw toward
      // load and temperature should follow, rather than decaying to idle.
      const workloadGpu = createMockGPU({
        utilization: 60,
        powerDraw: 60, // starting near idle
        powerLimit: 400,
        temperature: 35,
      });

      let gpu = workloadGpu;
      for (let i = 0; i < 30; i++) {
        gpu = tickMetrics([gpu])[0];
      }

      // 60% utilization on a 400W card => target ~ 0.15*400 + 0.6*(400-60) ≈ 264W
      expect(gpu.powerDraw).toBeGreaterThan(180);
      expect(gpu.temperature).toBeGreaterThan(50);
    });

    it("should keep idle GPU utilization near 0%", () => {
      const idleGpu = createMockGPU({ utilization: 0 });
      expect(idleGpu.allocatedJobId).toBeUndefined();

      let gpu = idleGpu;
      for (let i = 0; i < 50; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      expect(gpu.utilization).toBeLessThan(3);
    });

    it("should keep active GPU utilization stable around its value", () => {
      const activeGpu = createMockGPU({
        utilization: 85,
        allocatedJobId: 1001,
      });

      let gpu = activeGpu;
      for (let i = 0; i < 50; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      // Should stay within ±10% of original 85%
      expect(gpu.utilization).toBeGreaterThan(75);
      expect(gpu.utilization).toBeLessThan(95);
    });

    it("should keep idle GPU memory near zero (driver overhead only)", () => {
      const idleGpu = createMockGPU({ memoryUsed: 0, memoryTotal: 81920 });

      let gpu = idleGpu;
      for (let i = 0; i < 20; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      // Idle memory: 50-200 MB driver overhead
      expect(gpu.memoryUsed).toBeLessThan(250);
    });

    it("should keep active GPU memory stable around allocated value", () => {
      const activeGpu = createMockGPU({
        memoryUsed: 60000,
        memoryTotal: 81920,
        allocatedJobId: 1001,
      });

      let gpu = activeGpu;
      for (let i = 0; i < 50; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      // Memory jitter is ±10 MB/tick, should stay close
      expect(gpu.memoryUsed).toBeGreaterThan(59000);
      expect(gpu.memoryUsed).toBeLessThan(61000);
    });

    it("should derive temperature from power draw, not utilization", () => {
      // High-utilization GPU under load vs idle GPU.
      // The active GPU sustains higher power draw, which drives higher temperature.
      const highPowerGpu = createMockGPU({
        id: 0,
        uuid: "GPU-HIGH-POWER",
        powerDraw: 380,
        powerLimit: 400,
        temperature: 32,
        utilization: 90,
        allocatedJobId: 1001,
      });
      const lowPowerGpu = createMockGPU({
        id: 1,
        uuid: "GPU-LOW-POWER",
        powerDraw: 60,
        powerLimit: 400,
        temperature: 32,
        utilization: 5,
      });

      let highP = highPowerGpu;
      let lowP = lowPowerGpu;
      for (let i = 0; i < 30; i++) {
        highP = tickMetrics([highP])[0];
        lowP = tickMetrics([lowP])[0];
      }
      // Active GPU with sustained high power should be warmer than idle GPU
      expect(highP.temperature).toBeGreaterThan(lowP.temperature);
    });

    it("should not accumulate ECC errors on idle GPUs", () => {
      const idleGpu = createMockGPU({
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: { singleBit: 0, doubleBit: 0 },
        },
      });

      let gpu = idleGpu;
      for (let i = 0; i < 100; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      expect(gpu.eccErrors.singleBit).toBe(0);
      expect(gpu.eccErrors.doubleBit).toBe(0);
    });

    it("should use architecture-appropriate SM clock for H100", () => {
      const h100Gpu = createMockGPU({
        name: "NVIDIA H100-SXM5-80GB",
        clocksSM: 1980,
        temperature: 50,
        powerDraw: 200,
        powerLimit: 700,
        allocatedJobId: 1001,
        utilization: 50,
      });

      let gpu = h100Gpu;
      for (let i = 0; i < 20; i++) {
        gpu = tickMetrics([gpu])[0];
      }
      // H100 boost is 1980 MHz; at moderate temp (<70°C) should stay near boost
      expect(gpu.clocksSM).toBeGreaterThan(1600);
      expect(gpu.clocksSM).toBeLessThanOrEqual(1980);
    });
  });
});
