import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ScenarioContext,
  ScenarioContextManager,
  scenarioContextManager,
} from "../scenarioContext";
import type { ClusterConfig, GPU, XIDError } from "@/types/hardware";
import { createDefaultCluster } from "@/utils/clusterFactory";

// Mock localStorage for Zustand persist middleware
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

// Mock the logger to suppress console output during tests
vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Creates a minimal but valid ClusterConfig for testing.
 * Uses deterministic values (no randomness) so assertions are stable.
 */
function createTestCluster(): ClusterConfig {
  return {
    name: "Test Cluster",
    nodes: [
      {
        id: "node-01",
        hostname: "node-01.test.local",
        systemType: "DGX-A100",
        gpus: [createTestGPU(0), createTestGPU(1)],
        dpus: [],
        hcas: [],
        bmc: {
          ipAddress: "192.168.0.101",
          macAddress: "00:0a:f7:01:00:01",
          firmwareVersion: "3.47.00",
          manufacturer: "NVIDIA",
          sensors: [],
          powerState: "On",
        },
        cpuModel: "AMD EPYC 7742",
        cpuCount: 2,
        ramTotal: 1024,
        ramUsed: 128,
        osVersion: "Ubuntu 22.04.3 LTS",
        kernelVersion: "5.15.0-91-generic",
        nvidiaDriverVersion: "535.129.03",
        cudaVersion: "12.2",
        healthStatus: "OK",
        slurmState: "idle",
      },
      {
        id: "node-02",
        hostname: "node-02.test.local",
        systemType: "DGX-A100",
        gpus: [createTestGPU(0), createTestGPU(1)],
        dpus: [],
        hcas: [],
        bmc: {
          ipAddress: "192.168.0.102",
          macAddress: "00:0a:f7:02:00:01",
          firmwareVersion: "3.47.00",
          manufacturer: "NVIDIA",
          sensors: [],
          powerState: "On",
        },
        cpuModel: "AMD EPYC 7742",
        cpuCount: 2,
        ramTotal: 1024,
        ramUsed: 256,
        osVersion: "Ubuntu 22.04.3 LTS",
        kernelVersion: "5.15.0-91-generic",
        nvidiaDriverVersion: "535.129.03",
        cudaVersion: "12.2",
        healthStatus: "OK",
        slurmState: "idle",
      },
    ],
    fabricTopology: "FatTree",
    bcmHA: {
      enabled: true,
      primary: "mgmt-node0",
      secondary: "mgmt-node1",
      state: "Active",
    },
    slurmConfig: {
      controlMachine: "mgmt-node0",
      partitions: ["batch", "interactive"],
    },
  };
}

function createTestGPU(id: number): GPU {
  return {
    id,
    uuid: `GPU-TEST-${id}`,
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `00000000:${(0x10 + id).toString(16).padStart(2, "0")}:00.0`,
    temperature: 35,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 0,
    utilization: 0,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode: false,
    migInstances: [],
    nvlinks: [
      {
        linkId: 0,
        status: "Active",
        speed: 600,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
      {
        linkId: 1,
        status: "Active",
        speed: 600,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
    ],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
  };
}

// =============================================================================
// ScenarioContext Tests
// =============================================================================

describe("ScenarioContext", () => {
  let testCluster: ClusterConfig;

  beforeEach(() => {
    testCluster = createTestCluster();
  });

  // ---------------------------------------------------------------------------
  // Constructor and deep-clone behavior
  // ---------------------------------------------------------------------------

  describe("constructor", () => {
    it("should create a context with the provided scenario ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cluster = ctx.getCluster();
      expect(cluster).toBeDefined();
      expect(cluster.name).toBe("Test Cluster");
    });

    it("should deep-clone the base cluster so the original is not mutated", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cloned = ctx.getCluster();

      // The references must be different objects
      expect(cloned).not.toBe(testCluster);
      expect(cloned.nodes).not.toBe(testCluster.nodes);
      expect(cloned.nodes[0]).not.toBe(testCluster.nodes[0]);
      expect(cloned.nodes[0].gpus).not.toBe(testCluster.nodes[0].gpus);
      expect(cloned.nodes[0].gpus[0]).not.toBe(testCluster.nodes[0].gpus[0]);
    });

    it("should deep-clone nested arrays (nvlinks, xidErrors)", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cloned = ctx.getCluster();

      // nvlinks array should be a separate copy
      expect(cloned.nodes[0].gpus[0].nvlinks).not.toBe(
        testCluster.nodes[0].gpus[0].nvlinks,
      );
      expect(cloned.nodes[0].gpus[0].nvlinks[0]).not.toBe(
        testCluster.nodes[0].gpus[0].nvlinks[0],
      );

      // xidErrors array should be a separate copy
      expect(cloned.nodes[0].gpus[0].xidErrors).not.toBe(
        testCluster.nodes[0].gpus[0].xidErrors,
      );
    });

    it("should deep-clone nested objects (eccErrors, bmc)", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cloned = ctx.getCluster();

      expect(cloned.nodes[0].gpus[0].eccErrors).not.toBe(
        testCluster.nodes[0].gpus[0].eccErrors,
      );
      expect(cloned.nodes[0].gpus[0].eccErrors.aggregated).not.toBe(
        testCluster.nodes[0].gpus[0].eccErrors.aggregated,
      );
      expect(cloned.nodes[0].bmc).not.toBe(testCluster.nodes[0].bmc);
    });

    it("should preserve all cluster values in the clone", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cloned = ctx.getCluster();

      expect(cloned.name).toBe(testCluster.name);
      expect(cloned.fabricTopology).toBe(testCluster.fabricTopology);
      expect(cloned.nodes.length).toBe(testCluster.nodes.length);
      expect(cloned.nodes[0].id).toBe("node-01");
      expect(cloned.nodes[0].gpus[0].temperature).toBe(35);
      expect(cloned.nodes[0].gpus[0].powerLimit).toBe(400);
    });

    it("should start with zero mutations", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.getMutations()).toEqual([]);
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getCluster
  // ---------------------------------------------------------------------------

  describe("getCluster()", () => {
    it("should return the isolated cluster state", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const cluster = ctx.getCluster();

      expect(cluster.nodes.length).toBe(2);
      expect(cluster.slurmConfig.partitions).toEqual(["batch", "interactive"]);
    });

    it("should return the same cluster reference on repeated calls (no re-clone)", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const first = ctx.getCluster();
      const second = ctx.getCluster();
      expect(first).toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // getNode
  // ---------------------------------------------------------------------------

  describe("getNode()", () => {
    it("should return the correct node by ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const node = ctx.getNode("node-01");

      expect(node).toBeDefined();
      expect(node!.id).toBe("node-01");
      expect(node!.hostname).toBe("node-01.test.local");
    });

    it("should return undefined for a non-existent node ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.getNode("non-existent")).toBeUndefined();
    });

    it("should return the second node when requested", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const node = ctx.getNode("node-02");
      expect(node).toBeDefined();
      expect(node!.hostname).toBe("node-02.test.local");
    });
  });

  // ---------------------------------------------------------------------------
  // getGPU
  // ---------------------------------------------------------------------------

  describe("getGPU()", () => {
    it("should return the correct GPU by node ID and GPU ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      const gpu = ctx.getGPU("node-01", 0);

      expect(gpu).toBeDefined();
      expect(gpu!.id).toBe(0);
      expect(gpu!.uuid).toBe("GPU-TEST-0");
    });

    it("should return undefined for an invalid node ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.getGPU("bad-node", 0)).toBeUndefined();
    });

    it("should return undefined for an invalid GPU ID", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.getGPU("node-01", 99)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updateGPU
  // ---------------------------------------------------------------------------

  describe("updateGPU()", () => {
    it("should update GPU properties in the isolated cluster", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 85, utilization: 95 });

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.temperature).toBe(85);
      expect(gpu!.utilization).toBe(95);
    });

    it("should not modify the original cluster when updating the context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 99 });

      // Original cluster should be untouched
      expect(testCluster.nodes[0].gpus[0].temperature).toBe(35);
      // Context cluster should be updated
      expect(ctx.getGPU("node-01", 0)!.temperature).toBe(99);
    });

    it("should record a gpu-update mutation", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 70 }, "nvidia-smi");

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe("gpu-update");
      expect(mutations[0].nodeId).toBe("node-01");
      expect(mutations[0].gpuId).toBe(0);
      expect(mutations[0].command).toBe("nvidia-smi");
      expect(mutations[0].data).toEqual({ temperature: 70 });
    });

    it("should silently ignore update for non-existent node", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("bad-node", 0, { temperature: 99 });

      expect(ctx.getMutationCount()).toBe(0);
    });

    it("should silently ignore update for non-existent GPU", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 99, { temperature: 99 });

      expect(ctx.getMutationCount()).toBe(0);
    });

    it("should not update GPU in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);

      ctx.updateGPU("node-01", 0, { temperature: 99 });

      expect(ctx.getGPU("node-01", 0)!.temperature).toBe(35);
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // updateNodeHealth
  // ---------------------------------------------------------------------------

  describe("updateNodeHealth()", () => {
    it("should update the health status of a node", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateNodeHealth("node-01", "Critical");

      const node = ctx.getNode("node-01");
      expect(node!.healthStatus).toBe("Critical");
    });

    it("should not modify the original cluster", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateNodeHealth("node-01", "Warning");

      expect(testCluster.nodes[0].healthStatus).toBe("OK");
    });

    it("should record a node-health mutation", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateNodeHealth("node-02", "Warning", "ipmitool sensor");

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe("node-health");
      expect(mutations[0].nodeId).toBe("node-02");
      expect(mutations[0].data).toEqual({ health: "Warning" });
      expect(mutations[0].command).toBe("ipmitool sensor");
    });

    it("should silently ignore update for non-existent node", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateNodeHealth("bad-node", "Critical");

      expect(ctx.getMutationCount()).toBe(0);
    });

    it("should not update health in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      ctx.updateNodeHealth("node-01", "Critical");

      expect(ctx.getNode("node-01")!.healthStatus).toBe("OK");
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // addXIDError
  // ---------------------------------------------------------------------------

  describe("addXIDError()", () => {
    const sampleXIDError: XIDError = {
      code: 79,
      timestamp: new Date("2026-01-15T12:00:00Z"),
      description: "GPU has fallen off the bus",
      severity: "Critical",
    };

    it("should add an XID error to the specified GPU", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.addXIDError("node-01", 0, sampleXIDError);

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.xidErrors).toHaveLength(1);
      expect(gpu!.xidErrors[0].code).toBe(79);
      expect(gpu!.xidErrors[0].severity).toBe("Critical");
    });

    it("should append multiple XID errors", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      const error2: XIDError = {
        code: 48,
        timestamp: new Date("2026-01-15T12:05:00Z"),
        description: "Double bit ECC error",
        severity: "Critical",
      };

      ctx.addXIDError("node-01", 0, sampleXIDError);
      ctx.addXIDError("node-01", 0, error2);

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.xidErrors).toHaveLength(2);
      expect(gpu!.xidErrors[0].code).toBe(79);
      expect(gpu!.xidErrors[1].code).toBe(48);
    });

    it("should not modify the original cluster", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.addXIDError("node-01", 0, sampleXIDError);

      expect(testCluster.nodes[0].gpus[0].xidErrors).toHaveLength(0);
    });

    it("should record an xid-error mutation", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.addXIDError("node-01", 1, sampleXIDError, "dmesg");

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe("xid-error");
      expect(mutations[0].gpuId).toBe(1);
      expect(mutations[0].command).toBe("dmesg");
    });

    it("should silently ignore for non-existent GPU", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.addXIDError("node-01", 99, sampleXIDError);

      expect(ctx.getMutationCount()).toBe(0);
    });

    it("should initialize xidErrors array if undefined", () => {
      // Remove xidErrors from a GPU to simulate edge case
      const cluster = createTestCluster();
      (cluster.nodes[0].gpus[0] as Partial<GPU>).xidErrors = undefined;

      const ctx = new ScenarioContext("test-scenario", cluster);
      ctx.addXIDError("node-01", 0, sampleXIDError);

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.xidErrors).toHaveLength(1);
      expect(gpu!.xidErrors[0].code).toBe(79);
    });

    it("should not add XID error in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      ctx.addXIDError("node-01", 0, sampleXIDError);

      expect(ctx.getGPU("node-01", 0)!.xidErrors).toHaveLength(0);
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // setMIGMode
  // ---------------------------------------------------------------------------

  describe("setMIGMode()", () => {
    it("should enable MIG mode and initialize migInstances array", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setMIGMode("node-01", 0, true);

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.migInstances).toEqual([]);
    });

    it("should disable MIG mode and clear migInstances", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setMIGMode("node-01", 0, false);

      const gpu = ctx.getGPU("node-01", 0);
      expect(gpu!.migInstances).toEqual([]);
    });

    it("should record a mig-mode mutation", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setMIGMode("node-01", 0, true, "nvidia-smi mig");

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe("mig-mode");
      expect(mutations[0].data).toEqual({ enabled: true });
    });

    it("should not set MIG mode in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      ctx.setMIGMode("node-01", 0, true);

      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // setSlurmState
  // ---------------------------------------------------------------------------

  describe("setSlurmState()", () => {
    it("should update the Slurm state of a node", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setSlurmState("node-01", "drain", "maintenance");

      const node = ctx.getNode("node-01");
      expect(node!.slurmState).toBe("drain");
      expect(node!.slurmReason).toBe("maintenance");
    });

    it("should record a slurm-state mutation", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setSlurmState("node-02", "down", "GPU error", "scontrol");

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe("slurm-state");
      expect(mutations[0].data).toEqual({ state: "down", reason: "GPU error" });
    });

    it("should not update Slurm state in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      ctx.setSlurmState("node-01", "down");

      expect(ctx.getNode("node-01")!.slurmState).toBe("idle");
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Mutation tracking
  // ---------------------------------------------------------------------------

  describe("getMutations()", () => {
    it("should return a copy of the mutations array", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 80 });

      const mutations1 = ctx.getMutations();
      const mutations2 = ctx.getMutations();

      // Should be different array references
      expect(mutations1).not.toBe(mutations2);
      // But same content
      expect(mutations1).toEqual(mutations2);
    });

    it("should track multiple mutations in order", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      ctx.updateGPU("node-01", 0, { temperature: 80 });
      ctx.updateNodeHealth("node-02", "Warning");
      ctx.addXIDError("node-01", 1, {
        code: 63,
        timestamp: new Date(),
        description: "Row remap failure",
        severity: "Warning",
      });

      const mutations = ctx.getMutations();
      expect(mutations).toHaveLength(3);
      expect(mutations[0].type).toBe("gpu-update");
      expect(mutations[1].type).toBe("node-health");
      expect(mutations[2].type).toBe("xid-error");
    });

    it("should return getMutationCount matching mutations length", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      expect(ctx.getMutationCount()).toBe(0);

      ctx.updateGPU("node-01", 0, { temperature: 70 });
      expect(ctx.getMutationCount()).toBe(1);

      ctx.updateNodeHealth("node-01", "Warning");
      expect(ctx.getMutationCount()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Mutation isolation between contexts
  // ---------------------------------------------------------------------------

  describe("mutation isolation", () => {
    it("should not affect source cluster when context is mutated", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      ctx.updateGPU("node-01", 0, { temperature: 99, utilization: 100 });
      ctx.updateNodeHealth("node-01", "Critical");

      // Verify source is unchanged
      expect(testCluster.nodes[0].gpus[0].temperature).toBe(35);
      expect(testCluster.nodes[0].gpus[0].utilization).toBe(0);
      expect(testCluster.nodes[0].healthStatus).toBe("OK");
    });

    it("should keep two contexts independent from each other", () => {
      const ctx1 = new ScenarioContext("scenario-a", testCluster);
      const ctx2 = new ScenarioContext("scenario-b", testCluster);

      ctx1.updateGPU("node-01", 0, { temperature: 99 });
      ctx2.updateGPU("node-01", 0, { temperature: 50 });

      expect(ctx1.getGPU("node-01", 0)!.temperature).toBe(99);
      expect(ctx2.getGPU("node-01", 0)!.temperature).toBe(50);
      expect(testCluster.nodes[0].gpus[0].temperature).toBe(35);
    });
  });

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  describe("reset()", () => {
    it("should restore the cluster to its initial state from the store", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      // Make some mutations
      ctx.updateGPU("node-01", 0, { temperature: 99 });
      ctx.updateNodeHealth("node-01", "Critical");

      expect(ctx.getGPU("node-01", 0)!.temperature).toBe(99);
      expect(ctx.getNode("node-01")!.healthStatus).toBe("Critical");

      // Reset re-clones from the global store (not from the test cluster)
      ctx.reset();

      // Mutations should be cleared
      expect(ctx.getMutationCount()).toBe(0);
      expect(ctx.getMutations()).toEqual([]);
    });

    it("should clear all tracked mutations", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);

      ctx.updateGPU("node-01", 0, { temperature: 80 });
      ctx.updateNodeHealth("node-02", "Warning");
      expect(ctx.getMutationCount()).toBe(2);

      ctx.reset();
      expect(ctx.getMutationCount()).toBe(0);
    });

    it("should not reset in readonly context", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 99 });
      ctx.setReadonly(true);

      ctx.reset();

      // Mutations should still be present (reset was rejected)
      expect(ctx.getMutationCount()).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Readonly mode
  // ---------------------------------------------------------------------------

  describe("readonly mode", () => {
    it("should default to not readonly", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.isReadonly()).toBe(false);
    });

    it("should be settable to readonly", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      expect(ctx.isReadonly()).toBe(true);
    });

    it("should be togglable back to writable", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.setReadonly(true);
      expect(ctx.isReadonly()).toBe(true);

      ctx.setReadonly(false);
      expect(ctx.isReadonly()).toBe(false);

      // After toggling back, mutations should work again
      ctx.updateGPU("node-01", 0, { temperature: 70 });
      expect(ctx.getMutationCount()).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // snapshot and export
  // ---------------------------------------------------------------------------

  describe("snapshot()", () => {
    it("should return a deep copy of the current isolated cluster", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 80 });

      const snap = ctx.snapshot();

      // The snapshot should reflect the mutation
      expect(snap.nodes[0].gpus[0].temperature).toBe(80);

      // But be a separate object
      expect(snap).not.toBe(ctx.getCluster());
      expect(snap.nodes[0]).not.toBe(ctx.getCluster().nodes[0]);
    });
  });

  describe("export()", () => {
    it("should return valid JSON containing scenarioId and cluster", () => {
      const ctx = new ScenarioContext("my-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 77 });

      const exported = ctx.export();
      const parsed = JSON.parse(exported);

      expect(parsed.scenarioId).toBe("my-scenario");
      expect(parsed.cluster).toBeDefined();
      expect(parsed.cluster.name).toBe("Test Cluster");
      expect(parsed.mutations).toHaveLength(1);
      expect(parsed.runtime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getDiff()", () => {
    it("should return the same as getMutations", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      ctx.updateGPU("node-01", 0, { temperature: 70 });
      ctx.updateNodeHealth("node-02", "Warning");

      expect(ctx.getDiff()).toEqual(ctx.getMutations());
    });
  });

  describe("getRuntimeMs()", () => {
    it("should return a non-negative runtime", () => {
      const ctx = new ScenarioContext("test-scenario", testCluster);
      expect(ctx.getRuntimeMs()).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// ScenarioContextManager Tests
// =============================================================================

describe("ScenarioContextManager", () => {
  let manager: ScenarioContextManager;
  let testCluster: ClusterConfig;

  beforeEach(() => {
    // Use the exported singleton and clear all state before each test
    manager = scenarioContextManager;
    manager.clearAll();
    testCluster = createTestCluster();
  });

  // ---------------------------------------------------------------------------
  // Singleton pattern
  // ---------------------------------------------------------------------------

  describe("getInstance()", () => {
    it("should return the same instance on repeated calls", () => {
      const instance1 = ScenarioContextManager.getInstance();
      const instance2 = ScenarioContextManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should be the same instance as the exported singleton", () => {
      expect(ScenarioContextManager.getInstance()).toBe(scenarioContextManager);
    });
  });

  // ---------------------------------------------------------------------------
  // createContext
  // ---------------------------------------------------------------------------

  describe("createContext()", () => {
    it("should create a new scenario context with the given ID", () => {
      const ctx = manager.createContext("scenario-alpha", testCluster);

      expect(ctx).toBeInstanceOf(ScenarioContext);
      expect(ctx.getCluster().name).toBe("Test Cluster");
    });

    it("should store the context so getContext can retrieve it", () => {
      manager.createContext("scenario-beta", testCluster);

      const retrieved = manager.getContext("scenario-beta");
      expect(retrieved).toBeDefined();
      expect(retrieved).toBeInstanceOf(ScenarioContext);
    });

    it("should overwrite an existing context with the same ID", () => {
      const ctx1 = manager.createContext("scenario-gamma", testCluster);
      ctx1.updateGPU("node-01", 0, { temperature: 99 });

      const ctx2 = manager.createContext("scenario-gamma", testCluster);
      // The new context should not have the mutation from ctx1
      expect(ctx2.getMutationCount()).toBe(0);
      expect(ctx2.getGPU("node-01", 0)!.temperature).toBe(35);

      // And getContext should return the newer one
      expect(manager.getContext("scenario-gamma")).toBe(ctx2);
    });
  });

  // ---------------------------------------------------------------------------
  // getContext
  // ---------------------------------------------------------------------------

  describe("getContext()", () => {
    it("should return undefined for a non-existent context", () => {
      expect(manager.getContext("nonexistent")).toBeUndefined();
    });

    it("should return the correct context by ID", () => {
      const ctxA = manager.createContext("ctx-a", testCluster);
      const ctxB = manager.createContext("ctx-b", testCluster);

      expect(manager.getContext("ctx-a")).toBe(ctxA);
      expect(manager.getContext("ctx-b")).toBe(ctxB);
    });
  });

  // ---------------------------------------------------------------------------
  // getOrCreateContext
  // ---------------------------------------------------------------------------

  describe("getOrCreateContext()", () => {
    it("should return existing context if one exists", () => {
      const original = manager.createContext("test-id", testCluster);
      original.updateGPU("node-01", 0, { temperature: 77 });

      const retrieved = manager.getOrCreateContext("test-id", testCluster);
      // Should be the same instance, with mutation intact
      expect(retrieved).toBe(original);
      expect(retrieved.getMutationCount()).toBe(1);
    });

    it("should create a new context if none exists", () => {
      const ctx = manager.getOrCreateContext("new-id", testCluster);
      expect(ctx).toBeInstanceOf(ScenarioContext);
      expect(ctx.getMutationCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // setActiveContext / getActiveContext
  // ---------------------------------------------------------------------------

  describe("setActiveContext() / getActiveContext()", () => {
    it("should start with no active context", () => {
      expect(manager.getActiveContext()).toBeUndefined();
    });

    it("should set and retrieve the active context", () => {
      const ctx = manager.createContext("active-test", testCluster);
      manager.setActiveContext("active-test");

      expect(manager.getActiveContext()).toBe(ctx);
    });

    it("should return undefined if active ID does not match any context", () => {
      manager.setActiveContext("ghost-context");
      expect(manager.getActiveContext()).toBeUndefined();
    });

    it("should allow setting active context to null", () => {
      manager.createContext("some-ctx", testCluster);
      manager.setActiveContext("some-ctx");
      expect(manager.getActiveContext()).toBeDefined();

      manager.setActiveContext(null);
      expect(manager.getActiveContext()).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteContext
  // ---------------------------------------------------------------------------

  describe("deleteContext()", () => {
    it("should remove a context by ID", () => {
      manager.createContext("to-delete", testCluster);
      expect(manager.getContext("to-delete")).toBeDefined();

      const deleted = manager.deleteContext("to-delete");
      expect(deleted).toBe(true);
      expect(manager.getContext("to-delete")).toBeUndefined();
    });

    it("should return false for non-existent context", () => {
      const deleted = manager.deleteContext("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should clear active context if the deleted context was active", () => {
      manager.createContext("active-ctx", testCluster);
      manager.setActiveContext("active-ctx");
      expect(manager.getActiveContext()).toBeDefined();

      manager.deleteContext("active-ctx");
      expect(manager.getActiveContext()).toBeUndefined();
    });

    it("should not clear active context if a different context is deleted", () => {
      manager.createContext("ctx-keep", testCluster);
      manager.createContext("ctx-remove", testCluster);
      manager.setActiveContext("ctx-keep");

      manager.deleteContext("ctx-remove");
      expect(manager.getActiveContext()).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // clearAll
  // ---------------------------------------------------------------------------

  describe("clearAll()", () => {
    it("should remove all contexts", () => {
      manager.createContext("ctx-1", testCluster);
      manager.createContext("ctx-2", testCluster);
      manager.createContext("ctx-3", testCluster);

      expect(manager.getContextIds()).toHaveLength(3);

      manager.clearAll();
      expect(manager.getContextIds()).toHaveLength(0);
    });

    it("should set active context to null", () => {
      manager.createContext("active", testCluster);
      manager.setActiveContext("active");

      manager.clearAll();
      expect(manager.getActiveContext()).toBeUndefined();
    });

    it("should return empty array from getContextIds after clearAll", () => {
      manager.createContext("x", testCluster);
      manager.clearAll();
      expect(manager.getContextIds()).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getContextIds
  // ---------------------------------------------------------------------------

  describe("getContextIds()", () => {
    it("should return empty array when no contexts exist", () => {
      expect(manager.getContextIds()).toEqual([]);
    });

    it("should return all context IDs", () => {
      manager.createContext("alpha", testCluster);
      manager.createContext("beta", testCluster);

      const ids = manager.getContextIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("alpha");
      expect(ids).toContain("beta");
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple contexts with independent state
  // ---------------------------------------------------------------------------

  describe("multiple contexts with independent state", () => {
    it("should maintain independent cluster state per context", () => {
      const ctx1 = manager.createContext("scenario-1", testCluster);
      const ctx2 = manager.createContext("scenario-2", testCluster);

      ctx1.updateGPU("node-01", 0, { temperature: 90 });
      ctx2.updateNodeHealth("node-01", "Critical");

      // ctx1 has GPU temp change but node health is still OK
      expect(ctx1.getGPU("node-01", 0)!.temperature).toBe(90);
      expect(ctx1.getNode("node-01")!.healthStatus).toBe("OK");

      // ctx2 has node health change but GPU temp is original
      expect(ctx2.getGPU("node-01", 0)!.temperature).toBe(35);
      expect(ctx2.getNode("node-01")!.healthStatus).toBe("Critical");
    });

    it("should maintain independent mutation lists per context", () => {
      const ctx1 = manager.createContext("s1", testCluster);
      const ctx2 = manager.createContext("s2", testCluster);

      ctx1.updateGPU("node-01", 0, { temperature: 80 });
      ctx1.updateGPU("node-01", 1, { temperature: 82 });
      ctx2.updateNodeHealth("node-02", "Warning");

      expect(ctx1.getMutationCount()).toBe(2);
      expect(ctx2.getMutationCount()).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Using createDefaultCluster (full-size cluster)
  // ---------------------------------------------------------------------------

  describe("with full default cluster", () => {
    it("should deep-clone the full 8-node cluster from createDefaultCluster", () => {
      const fullCluster = createDefaultCluster();
      const ctx = new ScenarioContext("full-test", fullCluster);
      const cloned = ctx.getCluster();

      expect(cloned.nodes.length).toBe(8);
      expect(cloned.nodes[0].gpus.length).toBe(8);

      // Deep clone verification
      expect(cloned).not.toBe(fullCluster);
      expect(cloned.nodes[0].gpus[0]).not.toBe(fullCluster.nodes[0].gpus[0]);
    });

    it("should handle mutations on full cluster without affecting other nodes", () => {
      const fullCluster = createDefaultCluster();
      const ctx = new ScenarioContext("full-test", fullCluster);

      ctx.updateGPU("dgx-03", 5, { temperature: 95 });

      // Only the targeted GPU should change
      expect(ctx.getGPU("dgx-03", 5)!.temperature).toBe(95);
      // Other GPUs on same node remain as original
      expect(ctx.getGPU("dgx-03", 0)!.temperature).not.toBe(95);
      // GPUs on other nodes remain as original
      expect(ctx.getGPU("dgx-00", 5)!.temperature).not.toBe(95);
    });
  });

  describe("Seed Jobs", () => {
    it("should store and retrieve seed jobs", () => {
      const cluster = createTestCluster();
      const ctx = new ScenarioContext("test-scenario", cluster);

      ctx.addSeedJob({
        jobName: "test-training",
        nodeIds: ["node-01"],
        gpusPerNode: 2,
        runtime: "1:00:00",
        user: "researcher",
        partition: "gpu",
        state: "RUNNING",
      });

      const seeds = ctx.getSeedJobs();
      expect(seeds).toHaveLength(1);
      expect(seeds[0].jobName).toBe("test-training");
    });

    it("should clear seed jobs", () => {
      const cluster = createTestCluster();
      const ctx = new ScenarioContext("test-scenario", cluster);

      ctx.addSeedJob({
        jobName: "job-1",
        nodeIds: ["node-01"],
        gpusPerNode: 2,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      ctx.clearSeedJobs();
      expect(ctx.getSeedJobs()).toHaveLength(0);
    });

    it("should accumulate multiple seed jobs", () => {
      const cluster = createTestCluster();
      const ctx = new ScenarioContext("test-scenario", cluster);

      ctx.addSeedJob({
        jobName: "job-1",
        nodeIds: ["node-01"],
        gpusPerNode: 2,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });
      ctx.addSeedJob({
        jobName: "job-2",
        nodeIds: ["node-02"],
        gpusPerNode: 2,
        runtime: "2:00:00",
        user: "user2",
        partition: "gpu",
        state: "PENDING",
        reasonPending: "Resources",
      });

      expect(ctx.getSeedJobs()).toHaveLength(2);
    });
  });
});
