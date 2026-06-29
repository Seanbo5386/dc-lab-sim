/**
 * Metrics Simulation Hook
 *
 * Manages the GPU and HCA metrics simulation lifecycle.
 * Extracts the metrics simulation logic from App.tsx for better separation of concerns.
 * Feeds physics-engine threshold events into the active ScenarioContext's EventLog.
 */

import { useEffect, useRef } from "react";
import { MetricsSimulator } from "@/utils/metricsSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { shallowCompareGPU, shallowCompareHCAs } from "@/utils/shallowCompare";
import { scenarioContextManager } from "@/store/scenarioContext";
import type { ThresholdEvent } from "@/simulation/clusterPhysicsEngine";
import type {
  ClusterEventInput,
  EventSeverity,
  ClusterEventType,
} from "@/simulation/eventLog";

/** Map a physics ThresholdEvent to an EventLog-compatible ClusterEventInput. */
function thresholdToClusterEvent(
  event: ThresholdEvent,
  gpuToNode: Map<string, string>,
): ClusterEventInput | null {
  // Route by globally-unique uuid: gpuId is node-local (0-7) and collides
  // across the 8 nodes, so it cannot identify the originating node.
  const nodeId = gpuToNode.get(event.gpuUuid);
  if (!nodeId) return null;

  const typeMap: Record<ThresholdEvent["type"], ClusterEventType> = {
    "thermal-warning": "thermal",
    "thermal-critical": "thermal",
    "power-warning": "power",
    "ecc-accumulation": "ecc",
  };

  const severityMap: Record<ThresholdEvent["type"], EventSeverity> = {
    "thermal-warning": "warning",
    "thermal-critical": "critical",
    "power-warning": "warning",
    "ecc-accumulation": "warning",
  };

  const messageMap: Record<ThresholdEvent["type"], string> = {
    "thermal-warning": `GPU ${event.gpuId} temperature reached ${Math.round(event.value)}°C (throttle threshold)`,
    "thermal-critical": `GPU ${event.gpuId} temperature reached ${Math.round(event.value)}°C (critical)`,
    "power-warning": `GPU ${event.gpuId} power draw at ${Math.round(event.value)}W (near limit)`,
    "ecc-accumulation": `GPU ${event.gpuId} accumulated ${event.value} single-bit ECC errors`,
  };

  return {
    type: typeMap[event.type],
    nodeId,
    gpuId: event.gpuId,
    message: messageMap[event.type],
    severity: severityMap[event.type],
  };
}

/**
 * Hook that manages metrics simulation based on running state.
 * Creates and manages a MetricsSimulator instance internally.
 * Updates the simulation store with GPU and HCA metrics changes.
 * Feeds physics threshold events into the active ScenarioContext's EventLog.
 *
 * @param isRunning - Whether the simulation should be running
 */
export function useMetricsSimulation(isRunning: boolean): void {
  const simulatorRef = useRef<MetricsSimulator | null>(null);

  useEffect(() => {
    // Lazily create the simulator instance
    if (!simulatorRef.current) {
      simulatorRef.current = new MetricsSimulator();
    }

    const simulator = simulatorRef.current;

    if (isRunning) {
      simulator.start((updater) => {
        const store = useSimulationStore.getState();

        // Build gpuUuid -> nodeId mapping for threshold event routing.
        // Keyed on uuid (not gpu.id) because gpu.id is node-local and repeats
        // across nodes — keying on it would collide and misroute events.
        const gpuToNode = new Map<string, string>();

        store.cluster.nodes.forEach((node) => {
          const updated = updater({ gpus: node.gpus, hcas: node.hcas });

          // Track GPU-to-node mapping for threshold events
          for (const gpu of node.gpus) {
            gpuToNode.set(gpu.uuid, node.id);
          }

          // Update GPUs - use shallow comparison for better performance
          updated.gpus.forEach((gpu, idx) => {
            if (!shallowCompareGPU(gpu, node.gpus[idx])) {
              store.updateGPU(node.id, gpu.id, gpu);
            }
          });

          // Update HCAs (InfiniBand port errors) - use shallow comparison
          if (!shallowCompareHCAs(updated.hcas, node.hcas)) {
            store.updateHCAs(node.id, updated.hcas);
          }
        });

        // Consume threshold events once per tick (after all nodes processed)
        const thresholdEvents = simulator
          .getPhysicsEngine()
          .consumeThresholdEvents();
        if (thresholdEvents.length > 0) {
          const activeCtx = scenarioContextManager.getActiveContext();
          if (activeCtx) {
            const eventLog = activeCtx.getEventLog();
            for (const te of thresholdEvents) {
              const clusterEvent = thresholdToClusterEvent(te, gpuToNode);
              if (clusterEvent) {
                eventLog.append(clusterEvent);
              }
            }
          }
        }
      }, 1000);
    } else {
      simulator.stop();
    }

    return () => {
      simulator.stop();
    };
  }, [isRunning]);
}
