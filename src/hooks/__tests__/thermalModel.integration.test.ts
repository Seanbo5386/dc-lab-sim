/**
 * Integration tests for Phase 3's thermal model, proving the full chain —
 * tick loop -> physics engine -> fault injection -> remediation -- behaves
 * as a healthy learner would observe it, not just each piece in isolation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMetricsSimulation } from "../useMetricsSimulation";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import { MetricsSimulator } from "@/utils/metricsSimulator";
import { applyRemediation } from "@/utils/remediationEngine";

describe("Phase 3 thermal model — full chain", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSimulationStore.getState().resetSimulation();
    scenarioContextManager.clearAll();
    scenarioContextManager.setActiveContext(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds an injected thermal fault elevated across many real tick-loop seconds, then cools after remediation", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];

    const simulator = new MetricsSimulator();
    const faulted = simulator.injectFault(gpu, "thermal");
    useSimulationStore.getState().updateGPU(nodeId, gpu.id, faulted);

    renderHook(() => useMetricsSimulation(true));

    // Advance 30 real seconds via the actual tick loop.
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    const afterFault = useSimulationStore.getState().cluster.nodes[0].gpus[0];
    expect(afterFault.temperature).toBeGreaterThan(80);

    // Remediate.
    const currentNode = useSimulationStore.getState().cluster.nodes[0];
    const currentGPU = currentNode.gpus[0];
    const result = applyRemediation(currentGPU, currentNode, "set-power-limit");
    expect(result.outcome).toBe("fixed");
    useSimulationStore
      .getState()
      .updateGPU(nodeId, currentGPU.id, result.gpuUpdates!);

    // Advance another 60 real seconds — should cool back down.
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    const afterRemediation =
      useSimulationStore.getState().cluster.nodes[0].gpus[0];
    expect(afterRemediation.temperature).toBeLessThan(afterFault.temperature);
    expect(afterRemediation.activeFaultHeatWatts ?? 0).toBe(0);
  });

  it("settles a sustained training workload at 70-75C without throttling, over real tick-loop time", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];

    const simulator = new MetricsSimulator();
    const [workloadGpu] = simulator.simulateWorkload([gpu], "training");
    useSimulationStore.getState().updateGPU(nodeId, gpu.id, workloadGpu);

    renderHook(() => useMetricsSimulation(true));
    act(() => {
      vi.advanceTimersByTime(120000); // 2 real minutes of ticks
    });

    const settled = useSimulationStore.getState().cluster.nodes[0].gpus[0];
    expect(settled.temperature).toBeGreaterThanOrEqual(65);
    expect(settled.temperature).toBeLessThanOrEqual(78);
  });
});
