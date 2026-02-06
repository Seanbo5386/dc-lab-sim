import type {
  Scenario,
  FaultInjectionConfig,
  NarrativeScenario,
} from "@/types/scenarios";
import { useSimulationStore } from "@/store/simulationStore";
import { narrativeToScenario } from "./narrativeAdapter";
import narrativeData from "../data/narrativeScenarios.json";

const narrativeScenarios =
  narrativeData.scenarios as unknown as NarrativeScenario[];

// Cache for loaded scenarios
let scenarioCache: Map<string, Scenario> | null = null;

/**
 * Build the scenario cache from narrative scenarios.
 */
function ensureCache(): Map<string, Scenario> {
  if (scenarioCache) return scenarioCache;

  scenarioCache = new Map();
  for (const narrative of narrativeScenarios) {
    const scenario = narrativeToScenario(narrative);
    scenarioCache.set(scenario.id, scenario);
  }

  return scenarioCache;
}

/**
 * Loads a scenario by ID from narrative scenarios.
 */
export async function loadScenarioFromFile(
  scenarioId: string,
): Promise<Scenario | null> {
  try {
    const cache = ensureCache();
    return cache.get(scenarioId) || null;
  } catch (error) {
    console.error("Error loading scenario:", error);
    return null;
  }
}

/**
 * Gets all available scenarios grouped by domain.
 */
export function getAllScenarios(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const scenario of narrativeScenarios) {
    const domainKey = `domain${scenario.domain}`;
    if (!result[domainKey]) {
      result[domainKey] = [];
    }
    result[domainKey].push(scenario.id);
  }

  return result;
}

/**
 * Gets scenario metadata without loading full content.
 */
export function getScenarioMetadata(
  scenarioId: string,
): { title: string; difficulty: string; estimatedTime: number } | null {
  const scenario = narrativeScenarios.find((s) => s.id === scenarioId);

  if (!scenario) return null;

  return {
    title: scenario.title,
    difficulty: scenario.difficulty || "intermediate",
    estimatedTime: scenario.estimatedMinutes,
  };
}

/**
 * Get scenarios filtered by domain.
 */
export function getScenariosByDomain(domain: number): Scenario[] {
  const cache = ensureCache();
  const domainStr = `domain${domain}`;
  return Array.from(cache.values()).filter((s) => s.domain === domainStr);
}

/**
 * Applies scenario faults to the cluster
 */
export function applyScenarioFaults(faults: FaultInjectionConfig[]): void {
  const store = useSimulationStore.getState();

  faults.forEach((fault) => {
    const { nodeId, gpuId, type, parameters } = fault;

    switch (type) {
      case "xid-error":
        if (gpuId !== undefined) {
          store.addXIDError(nodeId, gpuId, {
            code: parameters?.xid || 79,
            timestamp: new Date(),
            description: parameters?.description || "GPU error detected",
            severity: "Critical",
          });
        }
        break;

      case "thermal":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            temperature: parameters?.targetTemp || 95,
          });
        }
        break;

      case "ecc-error":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            eccErrors: {
              singleBit: parameters?.singleBit || 10,
              doubleBit: parameters?.doubleBit || 1,
              aggregated: {
                singleBit: parameters?.singleBit || 10,
                doubleBit: parameters?.doubleBit || 1,
              },
            },
          });
        }
        break;

      case "nvlink-failure":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            healthStatus: "Warning",
          });
        }
        break;

      case "gpu-hang":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            utilization: 0,
          });
        }
        break;

      case "power":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            powerDraw: parameters?.powerDraw || 700,
          });
        }
        break;

      case "memory-full":
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            memoryUsed: parameters?.memoryUsed || 79000,
          });
        }
        break;

      default:
        console.warn(`Unknown fault type: ${type}`);
    }
  });
}

/**
 * Clears all faults and resets cluster to healthy state
 */
export function clearAllFaults(): void {
  const store = useSimulationStore.getState();
  const { cluster } = store;

  cluster.nodes.forEach((node) => {
    node.gpus.forEach((gpu) => {
      store.updateGPU(node.id, gpu.id, {
        temperature: 45,
        powerDraw: 300,
        utilization: 0,
        memoryUsed: 0,
        healthStatus: "OK",
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: {
            singleBit: 0,
            doubleBit: 0,
          },
        },
        xidErrors: [],
      });
    });

    store.updateNodeHealth(node.id, "OK");
  });
}

/**
 * Loads and initializes a scenario
 */
export async function initializeScenario(scenarioId: string): Promise<boolean> {
  try {
    // Import StateManager
    const { stateManager } = await import("@/store/stateManager");

    // Create snapshot before starting scenario
    stateManager.snapshotBeforeScenario(scenarioId);

    // Load scenario from file
    const scenario = await loadScenarioFromFile(scenarioId);
    if (!scenario) {
      return false;
    }

    // Clear any existing faults
    clearAllFaults();

    // Apply scenario-specific faults
    if (scenario.faults && scenario.faults.length > 0) {
      applyScenarioFaults(scenario.faults);
    }

    // Load scenario into store
    const store = useSimulationStore.getState();
    store.loadScenario(scenario);

    return true;
  } catch (error) {
    console.error("Error initializing scenario:", error);
    return false;
  }
}
