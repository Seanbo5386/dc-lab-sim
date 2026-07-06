import { describe, it, expect } from "vitest";
import { ClusterPhysicsEngine, getRatedTDP } from "../clusterPhysicsEngine";
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

  it("should throttle SM clocks when temperature exceeds 83C", () => {
    const engine = new ClusterPhysicsEngine();
    const gpu = createTestGPU({ temperature: 90, clocksSM: 1410 });
    const updated = engine.tickGPU(gpu);
    expect(updated.clocksSM).toBeLessThan(1410);
  });

  it("should not throttle clocks below 83C", () => {
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

  it("should detect thermal threshold crossing", () => {
    const engine = new ClusterPhysicsEngine();
    // First tick at 82C establishes previous temp below threshold
    const gpu82 = createTestGPU({
      utilization: 95,
      temperature: 82,
      powerDraw: 380,
      powerLimit: 400,
    });
    engine.tickGPU(gpu82);
    // Second tick at 85C — high utilization keeps output above 83C
    const gpu85 = createTestGPU({
      utilization: 95,
      temperature: 85,
      powerDraw: 380,
      powerLimit: 400,
    });
    engine.tickGPU(gpu85);
    const events = engine.getThresholdEvents();
    expect(events.some((e) => e.type === "thermal-warning")).toBe(true);
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
