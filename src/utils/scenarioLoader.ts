import type {
  Scenario,
  FaultInjectionConfig,
  NarrativeScenario,
} from "@/types/scenarios";
import type { ScenarioContext } from "@/store/scenarioContext";
import { useSimulationStore } from "@/store/simulationStore";
import { narrativeToScenario } from "./narrativeAdapter";
import { createDGXNode } from "./clusterFactory";
import { logger } from "@/utils/logger";

// Cache for loaded scenarios
let scenarioCache: Map<string, Scenario> | null = null;
// Cache for raw narrative data
let narrativeScenarios: NarrativeScenario[] | null = null;

/**
 * Lazily load narrative scenario data via dynamic import.
 */
async function ensureNarratives(): Promise<NarrativeScenario[]> {
  if (narrativeScenarios) return narrativeScenarios;
  const mod = await import("../data/narrativeScenarios.json");
  narrativeScenarios = mod.default.scenarios as unknown as NarrativeScenario[];
  return narrativeScenarios;
}

/**
 * Build the scenario cache from narrative scenarios.
 */
async function ensureCache(): Promise<Map<string, Scenario>> {
  if (scenarioCache) return scenarioCache;

  const narratives = await ensureNarratives();
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
    logger.error("Error loading scenario:", error);
    return null;
  }
}

/**
 * Gets all available scenarios grouped by domain.
 */
export async function getAllScenarios(): Promise<Record<string, string[]>> {
  const narratives = await ensureNarratives();
  const result: Record<string, string[]> = {};

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
export async function getScenarioMetadata(scenarioId: string): Promise<{
  title: string;
  difficulty: string;
  estimatedTime: number;
} | null> {
  const narratives = await ensureNarratives();
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
export async function getScenariosByDomain(
  domain: number,
): Promise<Scenario[]> {
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
        logger.warn(`Unknown fault type: ${type}`);
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

      case "add-node": {
        // Parse node index from nodeId (e.g., "dgx-08" → 8)
        const match = nodeId.match(/(\d+)$/);
        const nodeIndex = match ? parseInt(match[1], 10) : 0;
        // Use systemType from parameters, or infer from existing nodes
        const systemType =
          parameters?.systemType ??
          context.getCluster().nodes[0]?.systemType ??
          "DGX-A100";
        const newNode = createDGXNode(nodeIndex, systemType);
        context.addNode(newNode);
        break;
      }

      case "allocate-job": {
        const jobName = (parameters?.jobName as string) ?? "training-job";
        const nodeIds = (parameters?.nodeIds as string[]) ?? [nodeId];
        const gpusPerNode = (parameters?.gpusPerNode as number) ?? 8;
        const runtime = (parameters?.runtime as string) ?? "1:00:00";
        const user = (parameters?.user as string) ?? "researcher";
        const partition = (parameters?.partition as string) ?? "gpu";
        const jobState =
          (parameters?.state as "RUNNING" | "PENDING" | "FAILED") ?? "RUNNING";
        const utilization = parameters?.utilization as number | undefined;
        const memoryPercent = parameters?.memoryPercent as number | undefined;
        const reasonPending = parameters?.reasonPending as string | undefined;

        // Store seed job for SlurmSimulator to pick up
        context.addSeedJob({
          jobName,
          nodeIds,
          gpusPerNode,
          runtime,
          user,
          partition,
          state: jobState,
          reasonPending,
          utilization,
          memoryPercent,
        });

        // Only RUNNING jobs allocate nodes and GPUs
        if (jobState === "RUNNING") {
          const seedJobId = 1000 + context.getSeedJobs().length - 1;
          const targetUtil = utilization ?? 85;
          const memPct = memoryPercent ?? 75;

          for (const nId of nodeIds) {
            const node = context.getNode(nId);
            if (!node) continue;

            context.setSlurmState(nId, "alloc");

            const gpuIds = node.gpus.slice(0, gpusPerNode).map((g) => g.id);
            for (const gId of gpuIds) {
              const gpu = context.getGPU(nId, gId);
              if (!gpu) continue;
              context.updateGPU(nId, gId, {
                utilization: targetUtil,
                memoryUsed: Math.floor(gpu.memoryTotal * (memPct / 100)),
                powerDraw: gpu.powerLimit * (targetUtil > 0 ? 0.8 : 0.15),
                temperature: targetUtil > 0 ? 72 : 35,
                allocatedJobId: seedJobId,
              });
            }
          }
        }
        break;
      }

      case "set-slurm-state": {
        const targetState = (parameters?.state as string) ?? "idle";
        const reason = parameters?.reason as string | undefined;
        context.setSlurmState(
          nodeId,
          targetState as "idle" | "alloc" | "drain" | "down",
          reason,
        );
        break;
      }

      default:
        logger.warn(`Unknown fault type: ${type}`);
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
    logger.error("Error initializing scenario:", error);
    return false;
  }
}
