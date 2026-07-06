import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveEffectiveCluster,
  resolveEffectiveMutator,
} from "../effectiveState";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import type { ClusterConfig } from "@/types/hardware";

describe("resolveEffectiveCluster", () => {
  beforeEach(() => {
    scenarioContextManager.clearAll();
    scenarioContextManager.setActiveContext(null);
  });

  it("returns the passed-in global cluster when no scenario is active", () => {
    const globalCluster = {
      name: "global",
      nodes: [],
    } as unknown as ClusterConfig;
    expect(resolveEffectiveCluster(globalCluster)).toBe(globalCluster);
  });

  it("returns the active ScenarioContext's isolated cluster when one is active", () => {
    const globalCluster = useSimulationStore.getState().cluster;
    const ctx = scenarioContextManager.createContext("effective-state-test");
    scenarioContextManager.setActiveContext("effective-state-test");

    const result = resolveEffectiveCluster(globalCluster);

    expect(result).toBe(ctx.getCluster());
    expect(result).not.toBe(globalCluster);
  });
});

describe("resolveEffectiveMutator", () => {
  beforeEach(() => {
    scenarioContextManager.clearAll();
    scenarioContextManager.setActiveContext(null);
    useSimulationStore.getState().resetSimulation();
  });

  it("writes to the global store when no scenario is active", () => {
    const nodeId = useSimulationStore.getState().cluster.nodes[0].id;
    const mutator = resolveEffectiveMutator();

    mutator.updateGPU(nodeId, 0, { utilization: 77 });

    expect(
      useSimulationStore.getState().cluster.nodes[0].gpus[0].utilization,
    ).toBe(77);
  });

  it("writes to the active ScenarioContext when one is active, not the global store", () => {
    const globalCluster = useSimulationStore.getState().cluster;
    const nodeId = globalCluster.nodes[0].id;
    const ctx = scenarioContextManager.createContext("effective-mutator-test");
    scenarioContextManager.setActiveContext("effective-mutator-test");

    const mutator = resolveEffectiveMutator();
    mutator.updateGPU(nodeId, 0, { utilization: 88 });

    expect(ctx.getCluster().nodes[0].gpus[0].utilization).toBe(88);
    expect(
      useSimulationStore.getState().cluster.nodes[0].gpus[0].utilization,
    ).not.toBe(88);
  });
});
