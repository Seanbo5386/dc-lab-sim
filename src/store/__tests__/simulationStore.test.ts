import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSimulationStore } from "../simulationStore";
import { useLearningProgressStore } from "../learningProgressStore";
import { createCustomCluster } from "../../utils/clusterFactory";
import type { Scenario } from "../../types/scenarios";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("simulationStore.trackToolUsage - Multi-family mapping", () => {
  let markToolUsedSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
    localStorageMock.clear();
    markToolUsedSpy = vi.spyOn(
      useLearningProgressStore.getState(),
      "markToolUsed",
    );
  });

  it("should credit both gpu-monitoring and xid-diagnostics for nvidia-smi", () => {
    useSimulationStore.getState().trackToolUsage("nvidia-smi");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "gpu-monitoring",
      "nvidia-smi",
    );
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "xid-diagnostics",
      "nvidia-smi",
    );
  });

  it("should credit xid-diagnostics for dmesg", () => {
    useSimulationStore.getState().trackToolUsage("dmesg");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(1);
    expect(markToolUsedSpy).toHaveBeenCalledWith("xid-diagnostics", "dmesg");
  });

  it("should credit only infiniband-tools for ibstat (single-family)", () => {
    useSimulationStore.getState().trackToolUsage("ibstat");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(1);
    expect(markToolUsedSpy).toHaveBeenCalledWith("infiniband-tools", "ibstat");
  });

  it("should credit both diagnostics and xid-diagnostics for dcgmi diag (compound key)", () => {
    useSimulationStore.getState().trackToolUsage("dcgmi diag -r 1");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith("diagnostics", "dcgmi");
    expect(markToolUsedSpy).toHaveBeenCalledWith("xid-diagnostics", "dcgmi");
  });

  it("should credit both diagnostics and xid-diagnostics for nvidia-bug-report.sh", () => {
    useSimulationStore
      .getState()
      .trackToolUsage("nvidia-bug-report.sh --safe-mode");

    expect(markToolUsedSpy).toHaveBeenCalledTimes(2);
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "diagnostics",
      "nvidia-bug-report.sh",
    );
    expect(markToolUsedSpy).toHaveBeenCalledWith(
      "xid-diagnostics",
      "nvidia-bug-report.sh",
    );
  });

  it("should not call markToolUsed for unknown commands", () => {
    useSimulationStore.getState().trackToolUsage("unknowncmd --flag");

    expect(markToolUsedSpy).not.toHaveBeenCalled();
  });
});

describe("setBugReportCollected", () => {
  it("sets the bugReportCollected flag on the named node", () => {
    const store = useSimulationStore.getState();
    const nodeId = store.cluster.nodes[0].id;

    store.setBugReportCollected(nodeId, true);
    expect(
      useSimulationStore.getState().cluster.nodes.find((n) => n.id === nodeId)
        ?.bugReportCollected,
    ).toBe(true);

    store.setBugReportCollected(nodeId, false);
    expect(
      useSimulationStore.getState().cluster.nodes.find((n) => n.id === nodeId)
        ?.bugReportCollected,
    ).toBe(false);
  });

  it("ignores an unknown node id", () => {
    expect(() =>
      useSimulationStore.getState().setBugReportCollected("nope", true),
    ).not.toThrow();
  });
});

describe("persistence sanitization (partialize)", () => {
  it("strips session-scoped remediation flags from the persisted cluster", () => {
    const store = useSimulationStore.getState();
    const nodeId = store.cluster.nodes[0].id;
    store.setBugReportCollected(nodeId, true);
    store.updateGPU(nodeId, 0, { rmaStatus: "pending" });

    const partialize = useSimulationStore.persist.getOptions().partialize;
    expect(partialize).toBeDefined();

    const persisted = partialize!(useSimulationStore.getState()) as {
      cluster: {
        nodes: {
          bugReportCollected?: boolean;
          gpus: { rmaStatus?: string }[];
        }[];
      };
    };

    // Persisted blob must NOT carry in-session remediation progress.
    expect(persisted.cluster.nodes[0].bugReportCollected).toBeUndefined();
    expect(persisted.cluster.nodes[0].gpus[0].rmaStatus).toBeUndefined();

    // ...but the live in-memory state is untouched (only persistence is sanitized).
    const live = useSimulationStore.getState();
    expect(live.cluster.nodes[0].bugReportCollected).toBe(true);
    expect(live.cluster.nodes[0].gpus[0].rmaStatus).toBe("pending");
  });
});

describe("persistence migration (migrate)", () => {
  it("drops only the stale cluster on v0→v1, preserving user progress", () => {
    const migrate = useSimulationStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();

    const v0State = {
      cluster: { nodes: [{ id: "node-1", cpuCount: 2 }] },
      systemType: "DGX-H100",
      simulationSpeed: 2,
      scenarioProgress: { "domain1-x": { steps: [] } },
      completedScenarios: ["domain1-x"],
    };

    const migrated = migrate!(v0State, 0) as Record<string, unknown>;

    // Stale cluster is dropped so createDefaultCluster() rebuilds it correctly.
    expect(migrated.cluster).toBeUndefined();

    // Everything else the user earned/chose survives the version bump.
    expect(migrated.systemType).toBe("DGX-H100");
    expect(migrated.simulationSpeed).toBe(2);
    expect(migrated.scenarioProgress).toEqual({ "domain1-x": { steps: [] } });
    expect(migrated.completedScenarios).toEqual(["domain1-x"]);
  });

  it("preserves the cluster for the current version (v1)", () => {
    const migrate = useSimulationStore.persist.getOptions().migrate;
    const v1State = {
      cluster: { nodes: [{ id: "node-1", gpus: [] }] },
      completedScenarios: ["a"],
    };

    const migrated = migrate!(v1State, 1) as Record<string, unknown>;

    // v1 is current: the cluster is kept (merge re-validates afterward).
    expect(migrated.cluster).toEqual({ nodes: [{ id: "node-1", gpus: [] }] });
    expect(migrated.completedScenarios).toEqual(["a"]);
  });

  it("drops the cluster for unknown/future versions, preserving progress (F6)", () => {
    const migrate = useSimulationStore.persist.getOptions().migrate;
    const futureState = {
      cluster: { nodes: [{ id: "x", gpus: [] }] },
      systemType: "DGX-VR200",
      completedScenarios: ["a"],
    };

    const migrated = migrate!(futureState, 99) as Record<string, unknown>;

    // A blob written by a newer build: do not trust its cluster shape.
    expect(migrated.cluster).toBeUndefined();
    expect(migrated.systemType).toBe("DGX-VR200");
    expect(migrated.completedScenarios).toEqual(["a"]);
  });
});

describe("persistence merge (rehydrate sanitizes corrupted cluster, F5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function seed(stateOverrides: Record<string, unknown>, version = 1) {
    window.localStorage.setItem(
      "nvidia-simulator-storage",
      JSON.stringify({
        state: {
          systemType: "DGX-A100",
          completedScenarios: ["kept-scenario"],
          ...stateOverrides,
        },
        version,
      }),
    );
  }

  function corruptCluster(
    mutate: (c: { nodes: unknown[]; name: string }) => void,
  ): unknown {
    const cluster = JSON.parse(
      JSON.stringify(createCustomCluster(8, "DGX-A100")),
    ) as { nodes: unknown[]; name: string };
    mutate(cluster);
    return cluster;
  }

  it("rebuilds a fresh 8-node cluster when a node is null", async () => {
    seed({
      cluster: corruptCluster((c) => {
        c.nodes[3] = null;
      }),
    });

    await useSimulationStore.persist.rehydrate();

    const state = useSimulationStore.getState();
    expect(state.cluster.nodes).toHaveLength(8);
    expect(state.cluster.nodes.every((n) => n && Array.isArray(n.gpus))).toBe(
      true,
    );
    expect(state.completedScenarios).toEqual(["kept-scenario"]);
  });

  it("rebuilds when a node is missing its gpus array", async () => {
    seed({
      cluster: corruptCluster((c) => {
        delete (c.nodes[2] as Record<string, unknown>).gpus;
      }),
    });

    await useSimulationStore.persist.rehydrate();

    expect(useSimulationStore.getState().cluster.nodes).toHaveLength(8);
  });

  it("rebuilds when nodes is not an array", async () => {
    seed({ cluster: { nodes: "banana" } });

    await useSimulationStore.persist.rehydrate();

    const state = useSimulationStore.getState();
    expect(state.cluster.nodes).toHaveLength(8);
    expect(state.completedScenarios).toEqual(["kept-scenario"]);
  });

  it("keeps a valid persisted cluster (does not rebuild)", async () => {
    const cluster = createCustomCluster(8, "DGX-H100");
    cluster.name = "KEPT-CLUSTER"; // sentinel: survives only if not rebuilt
    seed({ cluster, systemType: "DGX-H100" });

    await useSimulationStore.persist.rehydrate();

    const state = useSimulationStore.getState();
    expect(state.cluster.name).toBe("KEPT-CLUSTER");
    expect(state.systemType).toBe("DGX-H100");
  });
});

describe("setSystemType scenario guard (F8)", () => {
  beforeEach(() => {
    useSimulationStore.setState({ activeScenario: null });
  });

  it("ignores setSystemType while a scenario is active", () => {
    useSimulationStore.setState({
      activeScenario: { id: "test-scenario" } as unknown as Scenario,
    });
    const before = useSimulationStore.getState();
    const beforeType = before.systemType;
    const beforeCluster = before.cluster;

    before.setSystemType(beforeType === "DGX-VR200" ? "DGX-A100" : "DGX-VR200");

    const after = useSimulationStore.getState();
    expect(after.systemType).toBe(beforeType);
    expect(after.cluster).toBe(beforeCluster); // unchanged reference
  });

  it("switches systemType and rebuilds the cluster when no scenario is active", () => {
    useSimulationStore.setState({ activeScenario: null });

    useSimulationStore.getState().setSystemType("DGX-H100");

    const after = useSimulationStore.getState();
    expect(after.systemType).toBe("DGX-H100");
    expect(after.cluster.nodes).toHaveLength(8);
  });
});
