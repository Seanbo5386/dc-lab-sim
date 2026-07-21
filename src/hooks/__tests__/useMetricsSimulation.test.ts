/**
 * Integration tests for the metrics/physics tick loop (useMetricsSimulation).
 *
 * Unlike metricsSimulator.test.ts (which tests the pure GPU-math functions
 * in isolation), these tests render the real hook against the real global
 * store and a real ScenarioContext, and drive it through actual setInterval
 * ticks via fake timers — proving the loop ticks whichever cluster is
 * active and routes threshold events from that same cluster (PHYS-4,
 * PHYS-14, CODE-7).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMetricsSimulation } from "../useMetricsSimulation";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";

describe("useMetricsSimulation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSimulationStore.getState().resetSimulation();
    scenarioContextManager.clearAll();
    scenarioContextManager.setActiveContext(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks the global cluster's GPU metrics when no scenario is active", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    // Force an active workload so the tick drives power/temp upward
    // (idle jitter alone would be too small/random to assert on reliably).
    useSimulationStore
      .getState()
      .updateGPU(nodeId, 0, { utilization: 95, allocatedJobId: 999 });
    const before = useSimulationStore.getState().cluster.nodes[0].gpus[0];

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const after = useSimulationStore.getState().cluster.nodes[0].gpus[0];
    expect(after.powerDraw).toBeGreaterThan(before.powerDraw);
  });

  it("ticks the active ScenarioContext's isolated cluster and leaves the global cluster untouched", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const globalBefore =
      useSimulationStore.getState().cluster.nodes[0].gpus[0].powerDraw;

    const ctx = scenarioContextManager.createContext("phase2-tick-test");
    scenarioContextManager.setActiveContext("phase2-tick-test");
    ctx.updateGPU(nodeId, 0, { utilization: 95, allocatedJobId: 999 });
    const scenarioBefore = ctx.getCluster().nodes[0].gpus[0].powerDraw;

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const scenarioAfter = ctx.getCluster().nodes[0].gpus[0].powerDraw;
    const globalAfter =
      useSimulationStore.getState().cluster.nodes[0].gpus[0].powerDraw;

    expect(scenarioAfter).toBeGreaterThan(scenarioBefore);
    expect(globalAfter).toBe(globalBefore);
  });

  it("routes threshold events into the active scenario's event log, describing that scenario's own cluster", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const ctx = scenarioContextManager.createContext("phase2-threshold-test");
    scenarioContextManager.setActiveContext("phase2-threshold-test");

    // Post-Phase-3: sustained load alone converges to NORMAL_FULL_LOAD_TEMP
    // (72°C) — comfortably under any architecture's throttle threshold by
    // design (PHYS-1's fix for "every sustained workload throttles
    // forever"). Only a persistent fault's activeFaultHeatWatts term can
    // push temperature into throttle range now, so this test injects one
    // (same 60%-of-rated-TDP convention as injectFault's "thermal" case)
    // and ticks forward far enough for TEMP_SMOOTHING's gradual convergence
    // to cross the default A100's 85°C maxOp threshold.
    ctx.updateGPU(nodeId, 0, {
      utilization: 100,
      allocatedJobId: 999,
      powerDraw: 400,
      temperature: 40,
      activeFaultHeatWatts: 400 * 0.6,
    });

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    const thermalEvents = ctx.getEventLog().getByType("thermal");
    expect(thermalEvents.length).toBeGreaterThan(0);
    expect(thermalEvents[0].nodeId).toBe(nodeId);
  });

  it("writes advanced HCA traffic counters back to the global store while a node's Slurm state is alloc (PHYS-7)", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    useSimulationStore.getState().setSlurmState(nodeId, "alloc");
    const before =
      useSimulationStore.getState().cluster.nodes[0].hcas[0].ports[0];

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const after =
      useSimulationStore.getState().cluster.nodes[0].hcas[0].ports[0];
    expect(after.xmitDataBytes).toBeGreaterThan(before.xmitDataBytes);
    expect(after.rcvDataBytes).toBeGreaterThan(before.rcvDataBytes);
    expect(after.xmitPkts).toBeGreaterThan(before.xmitPkts);
    expect(after.rcvPkts).toBeGreaterThan(before.rcvPkts);
    // Error counters stay fault-injection-only
    expect(after.errors).toEqual(before.errors);

    // Idle nodes' counters stay frozen
    const idleAfter =
      useSimulationStore.getState().cluster.nodes[1].hcas[0].ports[0];
    const idleBefore = useSimulationStore.getState().cluster.nodes[1];
    expect(idleBefore.slurmState).toBe("idle");
    expect(idleAfter.xmitDataBytes).toBe(
      500000000 + ((idleAfter.lid * 7919) % 500000000),
    );
  });

  it("writes advanced HCA traffic counters into the active ScenarioContext's sandbox, leaving the global cluster untouched (PHYS-7)", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const globalBefore =
      useSimulationStore.getState().cluster.nodes[0].hcas[0].ports[0]
        .xmitDataBytes;

    const ctx = scenarioContextManager.createContext("phys7-hca-tick-test");
    scenarioContextManager.setActiveContext("phys7-hca-tick-test");
    ctx.setSlurmState(nodeId, "alloc");
    const sandboxBefore =
      ctx.getCluster().nodes[0].hcas[0].ports[0].xmitDataBytes;

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const sandboxAfter =
      ctx.getCluster().nodes[0].hcas[0].ports[0].xmitDataBytes;
    const globalAfter =
      useSimulationStore.getState().cluster.nodes[0].hcas[0].ports[0]
        .xmitDataBytes;

    expect(sandboxAfter).toBeGreaterThan(sandboxBefore);
    expect(globalAfter).toBe(globalBefore);
  });
});
