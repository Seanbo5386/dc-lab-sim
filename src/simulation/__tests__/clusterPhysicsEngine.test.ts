import { describe, it, expect } from "vitest";
import {
  ClusterPhysicsEngine,
  getRatedTDP,
  deriveThermalSeverity,
  heatWattsFraction,
} from "../clusterPhysicsEngine";
import type { GPU } from "@/types/hardware";

function createTestGPU(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: "GPU-TEST",
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: "00000000:10:00.0",
    temperature: 35,
    powerDraw: 100,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 0,
    utilization: 0,
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

describe("ClusterPhysicsEngine", () => {
  it("should increase temperature when utilization is high", () => {
    const engine = new ClusterPhysicsEngine();
    const gpu = createTestGPU({
      utilization: 95,
      temperature: 40,
      powerDraw: 350,
      powerLimit: 400,
    });
    const updated = engine.tickGPU(gpu);
    expect(updated.temperature).toBeGreaterThan(40);
  });

  it("should decrease temperature when utilization is low", () => {
    const engine = new ClusterPhysicsEngine();
    const gpu = createTestGPU({
      utilization: 0,
      temperature: 80,
      powerDraw: 60,
      powerLimit: 400,
    });
    const updated = engine.tickGPU(gpu);
    expect(updated.temperature).toBeLessThan(80);
  });

  it("should throttle SM clocks when temperature exceeds the per-arch max operating temp", () => {
    const engine = new ClusterPhysicsEngine();
    // High utilization gives the equilibrium target a real reason to sit
    // above the throttle threshold (A100 maxOp = 85) — a "hot but idle"
    // GPU has no physical basis to stay hot and correctly cools instead.
    const gpu = createTestGPU({
      temperature: 90,
      clocksSM: 1410,
      utilization: 95,
      powerDraw: 380,
      powerLimit: 400,
    });
    const updated = engine.tickGPU(gpu);
    expect(updated.clocksSM).toBeLessThan(1410);
  });

  it("should not throttle clocks well below the per-arch max operating temp", () => {
    const engine = new ClusterPhysicsEngine();
    const gpu = createTestGPU({ temperature: 70, clocksSM: 1410 });
    const updated = engine.tickGPU(gpu);
    expect(updated.clocksSM).toBe(1410);
  });

  it("should derive power from utilization", () => {
    const engine = new ClusterPhysicsEngine();
    const idleGpu = createTestGPU({ utilization: 0 });
    const busyGpu = createTestGPU({ utilization: 95 });
    const idleResult = engine.tickGPU(idleGpu);
    const busyResult = engine.tickGPU(busyGpu);
    expect(busyResult.powerDraw).toBeGreaterThan(idleResult.powerDraw);
  });

  it("should fire ecc-accumulation on crossing threshold", () => {
    const engine = new ClusterPhysicsEngine();
    // First tick: ECC below threshold — no event
    const gpuBelow = createTestGPU({
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 90, doubleBit: 0 },
      },
    });
    engine.tickGPU(gpuBelow);
    expect(
      engine.getThresholdEvents().some((e) => e.type === "ecc-accumulation"),
    ).toBe(false);

    // Second tick: crosses above 100
    const gpuAbove = createTestGPU({
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 110, doubleBit: 0 },
      },
    });
    engine.tickGPU(gpuAbove);
    expect(
      engine.getThresholdEvents().some((e) => e.type === "ecc-accumulation"),
    ).toBe(true);
  });

  it("should NOT re-fire ecc-accumulation on subsequent ticks above threshold", () => {
    const engine = new ClusterPhysicsEngine();
    // Tick 1: cross the threshold
    const gpuFirst = createTestGPU({
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 110, doubleBit: 0 },
      },
    });
    engine.tickGPU(gpuFirst);
    engine.consumeThresholdEvents(); // drain events

    // Tick 2: still above — should NOT fire again
    const gpuSecond = createTestGPU({
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 120, doubleBit: 0 },
      },
    });
    engine.tickGPU(gpuSecond);
    const events = engine.getThresholdEvents();
    expect(events.some((e) => e.type === "ecc-accumulation")).toBe(false);
  });

  it("should detect thermal threshold crossing when a persistent fault holds temperature up", () => {
    const engine = new ClusterPhysicsEngine();
    // A moderate persistent fault (60% of TDP as extra heat) plus moderate
    // load will, over many ticks, cross the A100's 85°C maxOp threshold —
    // proving crossing-detection still works once something legitimate
    // (not load alone) drives the temperature there.
    let gpu = createTestGPU({
      temperature: 40,
      utilization: 50,
      powerDraw: 100,
      powerLimit: 400,
      activeFaultHeatWatts: 240, // 400 * 0.6
    });
    let firedWarning = false;
    for (let i = 0; i < 60 && !firedWarning; i++) {
      gpu = engine.tickGPU(gpu);
      firedWarning = engine
        .consumeThresholdEvents()
        .some((e) => e.type === "thermal-warning");
    }
    expect(firedWarning).toBe(true);
  });

  it("should settle full-utilization, no-fault load at 70-75C without throttling", () => {
    const engine = new ClusterPhysicsEngine();
    let gpu = createTestGPU({
      temperature: 35,
      powerDraw: 60,
      powerLimit: 400,
      utilization: 100,
      clocksSM: 1410,
    });
    for (let i = 0; i < 200; i++) {
      gpu = engine.tickGPU(gpu);
    }
    expect(gpu.temperature).toBeGreaterThanOrEqual(68);
    expect(gpu.temperature).toBeLessThanOrEqual(76);
    expect(gpu.clocksSM).toBe(1410); // never throttled — equilibrium stays below A100's 85C maxOp
  });

  it("should hold a persistent fault's temperature elevated across many ticks, not decay it", () => {
    const engine = new ClusterPhysicsEngine();
    let gpu = createTestGPU({
      temperature: 40,
      powerDraw: 60,
      powerLimit: 400,
      utilization: 5,
      activeFaultHeatWatts: 400, // A100's ratedTDP * 1.0 — saturating fault (powerLimit is uncapped here, so it equals ratedTDP)
    });
    for (let i = 0; i < 30; i++) {
      gpu = engine.tickGPU(gpu);
    }
    const heldTemp = gpu.temperature;
    expect(heldTemp).toBeGreaterThan(85); // well above A100 maxOp
    // Run 30 MORE ticks with the fault still active — temperature must not
    // decay back down on its own (this is the fix for PHYS-9/LIVE-2's
    // fault-evaporation bug: the old one-shot write decayed within ~10-20s).
    for (let i = 0; i < 30; i++) {
      gpu = engine.tickGPU(gpu);
    }
    expect(gpu.temperature).toBeGreaterThanOrEqual(heldTemp - 1);
  });

  it("should cool back toward the load-appropriate equilibrium once the fault is cleared", () => {
    const engine = new ClusterPhysicsEngine();
    let gpu = createTestGPU({
      temperature: 40,
      powerDraw: 60,
      powerLimit: 400,
      utilization: 5,
      activeFaultHeatWatts: 400,
    });
    for (let i = 0; i < 30; i++) {
      gpu = engine.tickGPU(gpu);
    }
    expect(gpu.temperature).toBeGreaterThan(85);

    // Remediation clears the fault term (does NOT snap temperature directly).
    gpu = { ...gpu, activeFaultHeatWatts: 0 };
    for (let i = 0; i < 100; i++) {
      gpu = engine.tickGPU(gpu);
    }
    // At 5% utilization with no fault, equilibrium is ~38C — well below maxOp.
    expect(gpu.temperature).toBeLessThan(50);
  });

  it("should let a lower power limit measurably reduce equilibrium temperature (power-capping cools — PHYS-2)", () => {
    const engineHigh = new ClusterPhysicsEngine();
    const engineLow = new ClusterPhysicsEngine();
    let gpuHighLimit = createTestGPU({
      temperature: 40,
      powerDraw: 100,
      powerLimit: 400, // A100's rated TDP — uncapped
      utilization: 100,
    });
    let gpuLowLimit = createTestGPU({
      temperature: 40,
      powerDraw: 100,
      powerLimit: 250, // capped, as if `nvidia-smi -pl 250` had been applied
      utilization: 100,
    });
    for (let i = 0; i < 200; i++) {
      gpuHighLimit = engineHigh.tickGPU(gpuHighLimit);
      gpuLowLimit = engineLow.tickGPU(gpuLowLimit);
    }
    // Uncapped settles ~72C (loadRatio = 400/ratedTDP(400) = 1.0).
    // Capped settles ~57C (loadRatio = 250/ratedTDP(400) = 0.625) — a REAL,
    // substantial difference, because the ratio's denominator is the fixed
    // rated TDP, not the (now-lower) current limit. If this ever regresses
    // to dividing by gpu.powerLimit instead, both would converge to the
    // same ~72C and this assertion would catch it immediately.
    expect(gpuHighLimit.temperature).toBeGreaterThanOrEqual(68);
    expect(gpuHighLimit.temperature).toBeLessThanOrEqual(76);
    expect(gpuLowLimit.temperature).toBeLessThan(gpuHighLimit.temperature - 10);
    expect(gpuLowLimit.powerDraw).toBeLessThan(gpuHighLimit.powerDraw);
  });

  it("should tag threshold events with the GPU's globally-unique uuid", () => {
    // gpuId is node-local (0-7) and repeats across nodes, so the uuid is what
    // routes an event back to its node. Two GPUs sharing id 0 must be told
    // apart by uuid.
    const engine = new ClusterPhysicsEngine();
    const gpu = createTestGPU({
      id: 0,
      uuid: "GPU-NODE3-0",
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 110, doubleBit: 0 },
      },
    });
    engine.tickGPU(gpu);
    const eccEvent = engine
      .getThresholdEvents()
      .find((e) => e.type === "ecc-accumulation");
    expect(eccEvent?.gpuUuid).toBe("GPU-NODE3-0");
  });
});

describe("heatWattsFraction", () => {
  // tickGPU's loadRatio is computed from the fault-inflated newPowerDraw, so
  // a fault's heat drives temperature through BOTH the load-ratio term and
  // the fault-ratio term for a near-idle GPU. heatWattsFraction must invert
  // BOTH channels together so an authored `targetTemp` (e.g. narrativeScenarios
  // .json's 83/85/92) actually converges near that temperature instead of
  // every authored fault collapsing to the same THERMAL_CEILING.
  function convergeTempForTargetTemp(targetTemp: number): number {
    const engine = new ClusterPhysicsEngine();
    const gpuName = "NVIDIA A100-SXM4-80GB";
    let gpu = createTestGPU({
      name: gpuName,
      temperature: 35,
      powerDraw: 60,
      powerLimit: 400,
      utilization: 0, // near-idle: the realistic case when a scenario injects a fault
      activeFaultHeatWatts:
        getRatedTDP(gpuName) * heatWattsFraction(targetTemp),
    });
    for (let i = 0; i < 200; i++) {
      gpu = engine.tickGPU(gpu);
    }
    return gpu.temperature;
  }

  it("converges a near-idle GPU close to the authored 83C targetTemp", () => {
    const temp = convergeTempForTargetTemp(83);
    expect(temp).toBeGreaterThanOrEqual(80);
    expect(temp).toBeLessThanOrEqual(86);
  });

  it("converges a near-idle GPU close to the authored 85C targetTemp", () => {
    const temp = convergeTempForTargetTemp(85);
    expect(temp).toBeGreaterThanOrEqual(82);
    expect(temp).toBeLessThanOrEqual(88);
  });

  it("distinguishes fault severities instead of collapsing them all to THERMAL_CEILING", () => {
    const temp83 = convergeTempForTargetTemp(83);
    const temp85 = convergeTempForTargetTemp(85);
    const temp92 = convergeTempForTargetTemp(92);

    // Previously all three converged to the same 95C ceiling. Now they must
    // be measurably distinguishable and monotonically increasing.
    expect(temp85).toBeGreaterThan(temp83);
    expect(temp92).toBeGreaterThan(temp85);
    expect(temp92).toBeLessThanOrEqual(97);
  });
});

describe("getRatedTDP", () => {
  it("returns the A100's rated TDP (400W)", () => {
    expect(getRatedTDP("NVIDIA A100-SXM4-80GB")).toBe(400);
  });

  it("returns a DIFFERENT GPU's own rated TDP, not a shared default", () => {
    // H100 (700W) must not collapse to A100's fallback value — this is
    // what makes the per-arch power-capping math in Task 2 correct.
    expect(getRatedTDP("NVIDIA H100-SXM5-80GB")).toBe(700);
  });
});

describe("deriveThermalSeverity", () => {
  it("returns ok below the per-arch max operating temp", () => {
    const result = deriveThermalSeverity(50, "NVIDIA A100-SXM4-80GB");
    expect(result.severity).toBe("ok");
  });

  it("returns warning at or above the per-arch max operating temp", () => {
    // A100 maxOp = 85
    const result = deriveThermalSeverity(86, "NVIDIA A100-SXM4-80GB");
    expect(result.severity).toBe("warning");
  });

  it("returns critical at or above the per-arch shutdown temp", () => {
    // A100 shutdown = 92
    const result = deriveThermalSeverity(93, "NVIDIA A100-SXM4-80GB");
    expect(result.severity).toBe("critical");
  });

  it("uses H100's higher thresholds, not A100's", () => {
    // H100 maxOp = 83, shutdown = 95 — 93C is warning for H100 (below its
    // 95C shutdown) but would be critical for an A100 (at or above its 92C
    // shutdown). Picking a temperature where the two architectures actually
    // disagree is what proves gpuName is dispatched, not ignored.
    const result = deriveThermalSeverity(93, "NVIDIA H100-SXM5-80GB");
    expect(result.severity).toBe("warning");
  });
});
