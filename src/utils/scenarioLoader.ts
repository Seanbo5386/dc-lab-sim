import type {
  Scenario,
  FaultInjectionConfig,
  NarrativeScenario,
} from "@/types/scenarios";
import type { ScenarioContext } from "@/store/scenarioContext";
import { useSimulationStore } from "@/store/simulationStore";
import { narrativeToScenario } from "./narrativeAdapter";

let narrativeScenarios: NarrativeScenario[] | null = null;
let narrativeScenariosPromise: Promise<NarrativeScenario[]> | null = null;

// Cache for loaded scenarios
let scenarioCache: Map<string, Scenario> | null = null;

/**
 * Build the scenario cache from narrative scenarios.
 */
async function loadNarrativeScenarios(): Promise<NarrativeScenario[]> {
  if (narrativeScenarios) return narrativeScenarios;

  if (!narrativeScenariosPromise) {
    narrativeScenariosPromise = import("../data/narrativeScenarios.json").then(
      (module) => {
        const data = (module.default ??
          module) as unknown as {
          scenarios?: NarrativeScenario[];
        };
        const scenarios = data.scenarios ?? [];
        narrativeScenarios = scenarios;
        return scenarios;
      },
    );
  }

  return narrativeScenariosPromise;
}

/**
 * Build the scenario cache from narrative scenarios.
 */
async function ensureCache(): Promise<Map<string, Scenario>> {
  if (scenarioCache) return scenarioCache;

  const narratives = await loadNarrativeScenarios();
  scenarioCache = new Map();
  for (const narrative of narratives) {
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
    const cache = await ensureCache();
    return cache.get(scenarioId) || null;
  } catch (error) {
    console.error("Error loading scenario:", error);
    return null;
  }
}

/**
 * Gets all available scenarios grouped by domain.
 */
export async function getAllScenarios(): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  const narratives = await loadNarrativeScenarios();

  for (const scenario of narratives) {
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
export async function getScenarioMetadata(
  scenarioId: string,
): Promise<{ title: string; difficulty: string; estimatedTime: number } | null> {
  const narratives = await loadNarrativeScenarios();
  const scenario = narratives.find((s) => s.id === scenarioId);

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
export async function getScenariosByDomain(domain: number): Promise<Scenario[]> {
  const cache = await ensureCache();
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
 * Applies faults to a ScenarioContext (sandbox-isolated).
 * Same logic as applyScenarioFaults but mutations go to the context, not global store.
 */
export function applyFaultsToContext(
  faults: FaultInjectionConfig[],
  context: ScenarioContext,
): void {
  faults.forEach((fault) => {
    const { nodeId, gpuId, type, parameters } = fault;

    switch (type) {
      case "xid-error":
        if (gpuId !== undefined) {
          context.addXIDError(nodeId, gpuId, {
            code: parameters?.xid || 79,
            timestamp: new Date(),
            description: parameters?.description || "GPU error detected",
            severity: "Critical",
          });
        }
        break;

      case "thermal":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            temperature: parameters?.targetTemp || 95,
          });
        }
        break;

      case "ecc-error":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
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
          context.updateGPU(nodeId, gpuId, {
            healthStatus: "Warning",
          });
        }
        break;

      case "gpu-hang":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            utilization: 0,
            healthStatus: "Critical",
          });
        }
        break;

      case "power":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            powerDraw: parameters?.powerDraw || 700,
          });
        }
        break;

      case "memory-full":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            memoryUsed: parameters?.memoryUsed || 79000,
          });
        }
        break;

      case "driver-error":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            healthStatus: "Critical",
          });
        }
        break;

      case "pcie-error":
        if (gpuId !== undefined) {
          context.updateGPU(nodeId, gpuId, {
            healthStatus: "Warning",
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
 * Loads and initializes a scenario with sandbox isolation.
 * Creates a ScenarioContext so faults and state changes stay isolated.
 */
export async function initializeScenario(scenarioId: string): Promise<boolean> {
  try {
    // Import ScenarioContext manager for sandbox isolation
    const { scenarioContextManager } = await import("@/store/scenarioContext");

    // Load scenario from file
    const scenario = await loadScenarioFromFile(scenarioId);
    if (!scenario) {
      return false;
    }

    // Clean up any previous scenario context
    scenarioContextManager.clearAll();

    // Create a fresh sandboxed context for this scenario
    const context = scenarioContextManager.createContext(scenarioId);
    scenarioContextManager.setActiveContext(scenarioId);

    // Apply scenario-level faults to the SANDBOX (not global store)
    if (scenario.faults && scenario.faults.length > 0) {
      applyFaultsToContext(scenario.faults, context);
    }

    // Apply first step's auto-faults to the sandbox
    if (
      scenario.steps[0]?.autoFaults &&
      scenario.steps[0].autoFaults.length > 0
    ) {
      applyFaultsToContext(scenario.steps[0].autoFaults, context);
    }

    // Load scenario into store (for step tracking, progress, etc.)
    const store = useSimulationStore.getState();
    store.loadScenario(scenario);

    return true;
  } catch (error) {
    console.error("Error initializing scenario:", error);
    return false;
  }
}
