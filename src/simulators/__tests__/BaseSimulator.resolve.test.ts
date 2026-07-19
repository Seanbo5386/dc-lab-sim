import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseSimulator, type StateMutator } from "../BaseSimulator";
import type {
  ParsedCommand,
  CommandContext,
  SimulatorMetadata,
  CommandResult,
} from "@/types/commands";
import type { ClusterConfig } from "@/types/hardware";
import { ScenarioContext } from "@/store/scenarioContext";

// Mock the simulation store
const mockCluster: ClusterConfig = {
  name: "test-cluster",
  nodes: [
    {
      id: "dgx-00",
      hostname: "dgx-00",
      systemType: "DGX-H100",
      gpus: [
        {
          id: 0,
          uuid: "GPU-test-0",
          name: "H100-SXM",
          type: "H100-SXM",
          pciAddress: "00:00.0",
          temperature: 45,
          powerDraw: 300,
          powerLimit: 700,
          memoryTotal: 81920,
          memoryUsed: 0,
          utilization: 0,
          clocksSM: 1980,
          clocksMem: 1593,
          eccEnabled: true,
          eccErrors: {
            singleBit: 0,
            doubleBit: 0,
            aggregated: { singleBit: 0, doubleBit: 0 },
          },
          migMode: false,
          migInstances: [],
          nvlinks: [],
          healthStatus: "OK",
          xidErrors: [],
          persistenceMode: true,
          computeMode: "Default",
        },
      ],
      dpus: [],
      hcas: [],
      bmc: {
        ipAddress: "10.0.0.1",
        macAddress: "00:11:22:33:44:55",
        firmwareVersion: "1.0",
        manufacturer: "NVIDIA",
        sensors: [],
        powerState: "On",
      },
      cpuModel: "AMD EPYC 7742",
      cpuCount: 2,
      ramTotal: 1024,
      ramUsed: 256,
      osVersion: "Ubuntu 22.04",
      kernelVersion: "5.15.0",
      nvidiaDriverVersion: "535.129.03",
      cudaVersion: "12.2",
      healthStatus: "OK",
      slurmState: "idle",
    },
    {
      id: "dgx-01",
      hostname: "dgx-01",
      systemType: "DGX-H100",
      gpus: [],
      dpus: [],
      hcas: [],
      bmc: {
        ipAddress: "10.0.0.2",
        macAddress: "00:11:22:33:44:66",
        firmwareVersion: "1.0",
        manufacturer: "NVIDIA",
        sensors: [],
        powerState: "On",
      },
      cpuModel: "AMD EPYC 7742",
      cpuCount: 2,
      ramTotal: 1024,
      ramUsed: 128,
      osVersion: "Ubuntu 22.04",
      kernelVersion: "5.15.0",
      nvidiaDriverVersion: "535.129.03",
      cudaVersion: "12.2",
      healthStatus: "OK",
      slurmState: "idle",
    },
  ],
  fabricTopology: "FatTree",
  bcmHA: {
    enabled: true,
    primary: "bcm-01",
    secondary: "bcm-02",
    state: "Active",
  },
  slurmConfig: {
    controlMachine: "slurm-ctrl",
    partitions: ["gpu"],
  },
};

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: () => ({
      cluster: mockCluster,
      updateGPU: vi.fn(),
      addXIDError: vi.fn(),
      updateNodeHealth: vi.fn(),
      setMIGMode: vi.fn(),
      setSlurmState: vi.fn(),
    }),
  },
}));

// Concrete test implementation to access protected methods
class TestResolveSimulator extends BaseSimulator {
  getMetadata(): SimulatorMetadata {
    return {
      name: "test-resolve",
      version: "1.0.0",
      description: "Test resolve simulator",
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createSuccess("ok");
  }

  // Expose protected methods for testing
  public testResolveCluster(context: CommandContext) {
    return this.resolveCluster(context);
  }

  public testResolveNode(context: CommandContext) {
    return this.resolveNode(context);
  }

  public testResolveAllNodes(context: CommandContext) {
    return this.resolveAllNodes(context);
  }

  public testResolveMutator(context: CommandContext): StateMutator {
    return this.resolveMutator(context);
  }
}

describe("BaseSimulator resolve helpers", () => {
  let simulator: TestResolveSimulator;
  let baseContext: CommandContext;

  beforeEach(() => {
    simulator = new TestResolveSimulator();
    baseContext = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  describe("resolveCluster", () => {
    it("falls back to global store when no context fields set", () => {
      const cluster = simulator.testResolveCluster(baseContext);
      expect(cluster.name).toBe("test-cluster");
      expect(cluster.nodes).toHaveLength(2);
    });

    it("reads from context.cluster when set", () => {
      const overrideCluster: ClusterConfig = {
        ...mockCluster,
        name: "override-cluster",
        nodes: [mockCluster.nodes[0]],
      };
      const context: CommandContext = {
        ...baseContext,
        cluster: overrideCluster,
      };
      const cluster = simulator.testResolveCluster(context);
      expect(cluster.name).toBe("override-cluster");
      expect(cluster.nodes).toHaveLength(1);
    });

    it("reads from scenarioContext when set", () => {
      const scenarioCluster: ClusterConfig = {
        ...mockCluster,
        name: "scenario-cluster",
      };
      const sc = new ScenarioContext("test-scenario", scenarioCluster);
      const context: CommandContext = {
        ...baseContext,
        scenarioContext: sc,
      };
      const cluster = simulator.testResolveCluster(context);
      expect(cluster.name).toBe("scenario-cluster");
    });

    it("prioritizes context.cluster over scenarioContext", () => {
      const directCluster: ClusterConfig = {
        ...mockCluster,
        name: "direct-cluster",
      };
      const scenarioCluster: ClusterConfig = {
        ...mockCluster,
        name: "scenario-cluster",
      };
      const sc = new ScenarioContext("test-scenario", scenarioCluster);
      const context: CommandContext = {
        ...baseContext,
        cluster: directCluster,
        scenarioContext: sc,
      };
      const cluster = simulator.testResolveCluster(context);
      expect(cluster.name).toBe("direct-cluster");
    });
  });

  describe("resolveNode", () => {
    it("finds node by currentNode from global store", () => {
      const node = simulator.testResolveNode(baseContext);
      expect(node).toBeDefined();
      expect(node!.id).toBe("dgx-00");
    });

    it("finds node from scenarioContext", () => {
      const sc = new ScenarioContext("test-scenario", mockCluster);
      const context: CommandContext = {
        ...baseContext,
        currentNode: "dgx-01",
        scenarioContext: sc,
      };
      const node = simulator.testResolveNode(context);
      expect(node).toBeDefined();
      expect(node!.id).toBe("dgx-01");
    });

    it("returns undefined for non-existent node", () => {
      const context: CommandContext = {
        ...baseContext,
        currentNode: "dgx-99",
      };
      const node = simulator.testResolveNode(context);
      expect(node).toBeUndefined();
    });
  });

  describe("resolveAllNodes", () => {
    it("returns all nodes from global store", () => {
      const nodes = simulator.testResolveAllNodes(baseContext);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe("dgx-00");
      expect(nodes[1].id).toBe("dgx-01");
    });

    it("returns all nodes from scenarioContext", () => {
      const singleNodeCluster: ClusterConfig = {
        ...mockCluster,
        nodes: [mockCluster.nodes[0]],
      };
      const sc = new ScenarioContext("test-scenario", singleNodeCluster);
      const context: CommandContext = {
        ...baseContext,
        scenarioContext: sc,
      };
      const nodes = simulator.testResolveAllNodes(context);
      expect(nodes).toHaveLength(1);
    });
  });

  describe("resolveMutator", () => {
    it("routes to global store when no scenarioContext", () => {
      const mutator = simulator.testResolveMutator(baseContext);
      mutator.updateGPU("dgx-00", 0, { temperature: 90 });
      // Should not throw — calls the mock store
      expect(mutator).toBeDefined();
    });

    it("routes to scenarioContext when active", () => {
      const sc = new ScenarioContext("test-scenario", mockCluster);
      const updateSpy = vi.spyOn(sc, "updateGPU");
      const context: CommandContext = {
        ...baseContext,
        scenarioContext: sc,
      };
      const mutator = simulator.testResolveMutator(context);
      mutator.updateGPU("dgx-00", 0, { temperature: 90 });
      expect(updateSpy).toHaveBeenCalledWith("dgx-00", 0, {
        temperature: 90,
      });
    });

    it("tracks mutations in scenarioContext", () => {
      const sc = new ScenarioContext("test-scenario", mockCluster);
      const context: CommandContext = {
        ...baseContext,
        scenarioContext: sc,
      };
      const mutator = simulator.testResolveMutator(context);

      expect(sc.getMutationCount()).toBe(0);
      mutator.updateGPU("dgx-00", 0, { temperature: 90 });
      expect(sc.getMutationCount()).toBe(1);
      mutator.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU fallen off bus",
        severity: "Critical",
      });
      expect(sc.getMutationCount()).toBe(2);
    });
  });
});
