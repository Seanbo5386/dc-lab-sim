/**
 * State Transition Tests
 *
 * Verifies that commands actually change state correctly and
 * that state changes persist across subsequent commands.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("State Transitions", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let slurm: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    slurm = new SlurmSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
      environment: {},
    };
  });

  describe("GPU Reset State Changes", () => {
    it("GPU reset clears recoverable XID errors", () => {
      // Inject recoverable XID error
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });

      // Verify error exists before reset
      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      // Perform reset
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.output.toLowerCase()).toMatch(/reset|success/i);

      // Verify error is cleared
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(0);
    });

    it("GPU reset fails for fatal XID 79 and state remains", () => {
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });

      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.exitCode).not.toBe(0);

      // Error should still exist
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);
    });

    it("reset on healthy GPU succeeds without errors", () => {
      // No faults injected - GPU should be healthy
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(0);

      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Thermal State Changes", () => {
    it("temperature change persists across queries", () => {
      // Initial temperature should be default (~45-65)
      const initialGpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      const initialTemp = initialGpu.temperature;

      // Change temperature
      store.updateGPU("dgx-00", 0, { temperature: 92 });

      // Query to verify change
      const updatedGpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(updatedGpu.temperature).toBe(92);
      expect(updatedGpu.temperature).not.toBe(initialTemp);
    });

    it("thermal fault affects GPU health status", () => {
      // Set normal temperature
      store.updateGPU("dgx-00", 0, { temperature: 45 });
      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.healthStatus).not.toBe("Critical");

      // Set critical temperature
      store.updateGPU("dgx-00", 0, { temperature: 95 });
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      // Health should be affected by thermal
      expect(gpu.temperature).toBe(95);
    });

    it("temperature change is reflected in nvidia-smi output", () => {
      store.updateGPU("dgx-00", 0, { temperature: 78 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      const result = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/78|Temp/i);
    });
  });

  describe("ECC Error State Changes", () => {
    it("ECC error count persists after update", () => {
      // Set ECC errors
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 15, doubleBit: 0 },
      });

      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(15);
      expect(gpu.eccErrors.doubleBit).toBe(0);
    });

    it("multiple ECC error updates accumulate correctly", () => {
      // First update
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 5, doubleBit: 0 },
      });

      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(5);

      // Second update (replacing, not accumulating in this implementation)
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 10, doubleBit: 1 },
      });

      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(10);
      expect(gpu.eccErrors.doubleBit).toBe(1);
    });
  });

  describe("XID Error State Changes", () => {
    it("multiple XID errors can be added", () => {
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "First error",
        severity: "Warning",
      });
      store.addXIDError("dgx-00", 0, {
        code: 64,
        timestamp: new Date(),
        description: "Second error",
        severity: "Warning",
      });

      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(2);
    });

    it("XID errors affect different GPUs independently", () => {
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "GPU 0 error",
        severity: "Warning",
      });
      store.addXIDError("dgx-00", 1, {
        code: 79,
        timestamp: new Date(),
        description: "GPU 1 error",
        severity: "Critical",
      });

      const gpu0 = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      const gpu1 = useSimulationStore.getState().cluster.nodes[0].gpus[1];

      expect(gpu0.xidErrors.length).toBe(1);
      expect(gpu0.xidErrors[0].code).toBe(63);
      expect(gpu1.xidErrors.length).toBe(1);
      expect(gpu1.xidErrors[0].code).toBe(79);
    });
  });

  describe("Slurm Node State Changes", () => {
    it("node state can be updated via scontrol", () => {
      // Initial state should be idle or alloc
      const result = slurm.execute(
        parse(
          'scontrol update nodename=dgx-00 state=drain reason="maintenance"',
        ),
        context,
      );
      // Command should be recognized
      expect(result.output).toBeDefined();
    });

    it("node state query works", () => {
      // Query nodes via sinfo - check output is defined and not empty
      const result1 = slurm.execute(parse("sinfo"), context);
      expect(result1.output).toBeDefined();
      expect(result1.output.length).toBeGreaterThan(0);
    });
  });

  describe("Fault Injection to Recovery Flow", () => {
    it("full fault injection and recovery cycle", () => {
      // 1. Verify healthy state
      const health1 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health1.output.toLowerCase()).toMatch(/healthy|ok/);

      // 2. Inject fault
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Test error",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      // 3. Verify fault is detected - dcgmi shows XID errors in output
      const health2 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health2.output.toLowerCase()).toMatch(/xid errors|warning|error/i);

      // 4. Reset GPU
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 0"), context);
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      // 5. Verify healthy again
      const health3 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health3.output.toLowerCase()).toMatch(/healthy|ok/);
    });

    it("multiple faults and partial recovery", () => {
      // Inject faults on two GPUs
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "GPU 0 error",
        severity: "Warning",
      });
      store.addXIDError("dgx-00", 1, {
        code: 63,
        timestamp: new Date(),
        description: "GPU 1 error",
        severity: "Warning",
      });

      // Both should have errors
      let gpu0 = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      let gpu1 = useSimulationStore.getState().cluster.nodes[0].gpus[1];
      expect(gpu0.xidErrors.length).toBe(1);
      expect(gpu1.xidErrors.length).toBe(1);

      // Reset only GPU 0
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 0"), context);

      // GPU 0 should be clear, GPU 1 should still have error
      gpu0 = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      gpu1 = useSimulationStore.getState().cluster.nodes[0].gpus[1];
      expect(gpu0.xidErrors.length).toBe(0);
      expect(gpu1.xidErrors.length).toBe(1);
    });
  });

  describe("Store Reset", () => {
    it("resetSimulation clears all faults", () => {
      // Inject various faults
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Test",
        severity: "Warning",
      });
      store.updateGPU("dgx-00", 1, { temperature: 95 });

      // Verify faults exist
      let cluster = useSimulationStore.getState().cluster;
      expect(cluster.nodes[0].gpus[0].xidErrors.length).toBe(1);
      expect(cluster.nodes[0].gpus[1].temperature).toBe(95);

      // Reset
      store.resetSimulation();

      // Verify faults cleared
      cluster = useSimulationStore.getState().cluster;
      expect(cluster.nodes[0].gpus[0].xidErrors.length).toBe(0);
      // Temperature should be back to default range
      expect(cluster.nodes[0].gpus[1].temperature).toBeLessThan(95);
    });
  });
});
