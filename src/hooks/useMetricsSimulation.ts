/**
 * Metrics Simulation Hook
 *
 * Manages the GPU and HCA metrics simulation lifecycle.
 * Extracts the metrics simulation logic from App.tsx for better separation of concerns.
 */

import { useEffect, useRef } from 'react';
import { MetricsSimulator } from '@/utils/metricsSimulator';
import { useSimulationStore } from '@/store/simulationStore';
import { shallowCompareGPU, shallowCompareHCAs } from '@/utils/shallowCompare';

/**
 * Hook that manages metrics simulation based on running state.
 * Creates and manages a MetricsSimulator instance internally.
 * Updates the simulation store with GPU and HCA metrics changes.
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
        store.cluster.nodes.forEach(node => {
          const updated = updater({ gpus: node.gpus, hcas: node.hcas });

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
      }, 1000);
    } else {
      simulator.stop();
    }

    return () => {
      simulator.stop();
    };
  }, [isRunning]);
}
