/**
 * Resolves the cluster/mutator a caller without a CommandContext (React
 * components, hooks) should read and write: the active ScenarioContext's
 * isolated cluster when a scenario/incident/mission is running, otherwise
 * the global store. Mirrors BaseSimulator's resolveCluster()/resolveMutator()
 * for command simulators — this is the same fallback for non-command
 * callers, consolidated here instead of hand-duplicated per caller.
 */
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import type { ClusterConfig } from "@/types/hardware";
import type { StateMutator } from "@/simulators/BaseSimulator";

/**
 * @param globalCluster - the caller's already-subscribed global cluster
 *   value (e.g. from `useSimulationStore((s) => s.cluster)` in a component,
 *   or `useSimulationStore.getState().cluster` in an imperative caller).
 *   Passed in rather than read internally so React components keep
 *   reactivity to global cluster changes when no scenario is active.
 */
export function resolveEffectiveCluster(
  globalCluster: ClusterConfig,
): ClusterConfig {
  const activeContext = scenarioContextManager.getActiveContext();
  return activeContext ? activeContext.getCluster() : globalCluster;
}

export function resolveEffectiveMutator(): StateMutator {
  const activeContext = scenarioContextManager.getActiveContext();
  if (activeContext) {
    return {
      updateGPU: (nodeId, gpuId, updates) =>
        activeContext.updateGPU(nodeId, gpuId, updates),
      addXIDError: (nodeId, gpuId, error) =>
        activeContext.addXIDError(nodeId, gpuId, error),
      updateNodeHealth: (nodeId, health) =>
        activeContext.updateNodeHealth(nodeId, health),
      setMIGMode: (nodeId, gpuId, enabled) =>
        activeContext.setMIGMode(nodeId, gpuId, enabled),
      setSlurmState: (nodeId, state, reason) =>
        activeContext.setSlurmState(nodeId, state, reason),
      allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
        activeContext.allocateGPUsForJob(
          nodeId,
          gpuIds,
          jobId,
          targetUtilization,
        ),
      deallocateGPUsForJob: (jobId) =>
        activeContext.deallocateGPUsForJob(jobId),
    };
  }
  const store = useSimulationStore.getState();
  return {
    updateGPU: (nodeId, gpuId, updates) =>
      store.updateGPU(nodeId, gpuId, updates),
    addXIDError: (nodeId, gpuId, error) =>
      store.addXIDError(nodeId, gpuId, error),
    updateNodeHealth: (nodeId, health) =>
      store.updateNodeHealth(nodeId, health),
    setMIGMode: (nodeId, gpuId, enabled) =>
      store.setMIGMode(nodeId, gpuId, enabled),
    setSlurmState: (nodeId, state, reason) =>
      store.setSlurmState(nodeId, state, reason),
    allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
      store.allocateGPUsForJob(nodeId, gpuIds, jobId, targetUtilization),
    deallocateGPUsForJob: (jobId) => store.deallocateGPUsForJob(jobId),
  };
}
