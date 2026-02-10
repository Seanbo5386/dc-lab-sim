import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FaultInjectionConfig } from "@/types/scenarios";
import type { ClusterConfig } from "@/types/hardware";

// ── Mock data for the simulation store ────────────────────────────

function createMockCluster(): ClusterConfig {
  return {
    name: "test-cluster",
    nodes: [
      {
        id: "dgx-00",
        hostname: "dgx-00",
        systemType: "DGX-H100",
        gpus: [
          {
            id: 0,
            uuid: "GPU-0",
            name: "H100-SXM",
            type: "H100-SXM",
            pciAddress: "00:00.0",
            temperature: 45,
            powerDraw: 300,
            powerLimit: 700,
            memoryTotal: 81920,
            memoryUsed: 0,
            utilization: 50,
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
          },
          {
            id: 1,
            uuid: "GPU-1",
            name: "H100-SXM",
            type: "H100-SXM",
            pciAddress: "00:01.0",
            temperature: 45,
            powerDraw: 300,
            powerLimit: 700,
            memoryTotal: 81920,
            memoryUsed: 0,
            utilization: 50,
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
}

// ── Mock simulation store ─────────────────────────────────────────

const mockAddXIDError = vi.fn();
const mockUpdateGPU = vi.fn();
const mockUpdateNodeHealth = vi.fn();
const mockLoadScenario = vi.fn();

const mockCluster = createMockCluster();

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: () => ({
      cluster: mockCluster,
      addXIDError: mockAddXIDError,
      updateGPU: mockUpdateGPU,
      updateNodeHealth: mockUpdateNodeHealth,
      loadScenario: mockLoadScenario,
    }),
  },
}));

// ── Import SUT after mocks are configured ─────────────────────────

import {
  loadScenarioFromFile,
  getAllScenarios,
  getScenarioMetadata,
  getScenariosByDomain,
  applyScenarioFaults,
  applyFaultsToContext,
  clearAllFaults,
  initializeScenario,
} from "../scenarioLoader";
import { ScenarioContext } from "@/store/scenarioContext";

// ── Tests ─────────────────────────────────────────────────────────

describe("scenarioLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── loadScenarioFromFile ──────────────────────────────────────

  describe("loadScenarioFromFile", () => {
    it("returns a scenario for a valid ID", async () => {
      const scenario = await loadScenarioFromFile(
        "domain1-midnight-deployment",
      );

      expect(scenario).not.toBeNull();
      expect(scenario!.id).toBe("domain1-midnight-deployment");
      expect(scenario!.title).toBe("The Midnight Deployment");
      expect(scenario!.domain).toBe("domain1");
    });

    it("returns null for an invalid ID", async () => {
      const scenario = await loadScenarioFromFile("nonexistent-scenario");

      expect(scenario).toBeNull();
    });

    it("returns a fully-formed Scenario object with all required fields", async () => {
      const scenario = await loadScenarioFromFile(
        "domain1-midnight-deployment",
      );

      expect(scenario).not.toBeNull();
      expect(scenario!.steps).toBeDefined();
      expect(scenario!.steps.length).toBeGreaterThan(0);
      expect(scenario!.learningObjectives).toBeDefined();
      expect(scenario!.faults).toBeDefined();
      expect(scenario!.successCriteria).toBeDefined();
      expect(scenario!.estimatedTime).toBeGreaterThan(0);
      expect(scenario!.difficulty).toBeDefined();
    });
  });

  // ── getAllScenarios ───────────────────────────────────────────

  describe("getAllScenarios", () => {
    it("returns scenarios grouped by domain", async () => {
      const result = await getAllScenarios();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      // Each key should follow the "domainN" pattern
      for (const key of Object.keys(result)) {
        expect(key).toMatch(/^domain[1-5]$/);
      }
    });

    it("all 5 domains have scenarios", async () => {
      const result = await getAllScenarios();

      expect(result["domain1"]).toBeDefined();
      expect(result["domain1"].length).toBeGreaterThan(0);

      expect(result["domain2"]).toBeDefined();
      expect(result["domain2"].length).toBeGreaterThan(0);

      expect(result["domain3"]).toBeDefined();
      expect(result["domain3"].length).toBeGreaterThan(0);

      expect(result["domain4"]).toBeDefined();
      expect(result["domain4"].length).toBeGreaterThan(0);

      expect(result["domain5"]).toBeDefined();
      expect(result["domain5"].length).toBeGreaterThan(0);
    });

    it("each domain array contains string IDs", async () => {
      const result = await getAllScenarios();

      for (const ids of Object.values(result)) {
        for (const id of ids) {
          expect(typeof id).toBe("string");
          expect(id.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ── getScenarioMetadata ───────────────────────────────────────

  describe("getScenarioMetadata", () => {
    it("returns title, difficulty, and estimatedTime for a valid ID", async () => {
      const meta = await getScenarioMetadata("domain1-midnight-deployment");

      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("The Midnight Deployment");
      expect(meta!.difficulty).toBe("intermediate");
      expect(meta!.estimatedTime).toBe(25);
    });

    it("returns null for an invalid ID", async () => {
      const meta = await getScenarioMetadata("does-not-exist");

      expect(meta).toBeNull();
    });

    it("returns metadata without loading full scenario steps", async () => {
      const meta = await getScenarioMetadata("domain5-xid-investigation");

      expect(meta).not.toBeNull();
      expect(meta!.title).toBeDefined();
      // Metadata object should NOT have steps or faults
      expect(meta).not.toHaveProperty("steps");
      expect(meta).not.toHaveProperty("faults");
    });
  });

  // ── getScenariosByDomain ──────────────────────────────────────

  describe("getScenariosByDomain", () => {
    it("returns scenarios for a valid domain number", async () => {
      const scenarios = await getScenariosByDomain(1);

      expect(scenarios.length).toBeGreaterThan(0);
      for (const s of scenarios) {
        expect(s.domain).toBe("domain1");
      }
    });

    it("returns scenarios for each domain", async () => {
      for (let d = 1; d <= 5; d++) {
        const scenarios = await getScenariosByDomain(d);
        expect(scenarios.length).toBeGreaterThan(0);
      }
    });

    it("returns empty array for an invalid domain", async () => {
      const scenarios = await getScenariosByDomain(99);

      expect(scenarios).toEqual([]);
    });

    it("returned scenarios have all required Scenario fields", async () => {
      const scenarios = await getScenariosByDomain(4);

      expect(scenarios.length).toBeGreaterThan(0);
      const scenario = scenarios[0];
      expect(scenario.id).toBeDefined();
      expect(scenario.title).toBeDefined();
      expect(scenario.steps).toBeDefined();
      expect(scenario.domain).toBe("domain4");
    });
  });

  // ── applyScenarioFaults (global store) ────────────────────────

  describe("applyScenarioFaults", () => {
    it("applies xid-error fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "xid-error",
          severity: "critical",
          parameters: { xid: 79 },
        },
      ];

      applyScenarioFaults(faults);

      expect(mockAddXIDError).toHaveBeenCalledTimes(1);
      expect(mockAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          code: 79,
          severity: "Critical",
        }),
      );
    });

    it("applies thermal fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 1,
          type: "thermal",
          severity: "warning",
          parameters: { targetTemp: 92 },
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 1, {
        temperature: 92,
      });
    });

    it("applies ecc-error fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "ecc-error",
          severity: "critical",
          parameters: { singleBit: 50, doubleBit: 3 },
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        eccErrors: {
          singleBit: 50,
          doubleBit: 3,
          aggregated: { singleBit: 50, doubleBit: 3 },
        },
      });
    });

    it("applies nvlink-failure fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "nvlink-failure",
          severity: "warning",
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        healthStatus: "Warning",
      });
    });

    it("applies gpu-hang fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "gpu-hang",
          severity: "critical",
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        utilization: 0,
      });
    });

    it("applies power fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "power",
          severity: "critical",
          parameters: { powerDraw: 650 },
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        powerDraw: 650,
      });
    });

    it("applies memory-full fault to global store", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "memory-full",
          severity: "critical",
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        memoryUsed: 79000,
      });
    });

    it("ignores faults with undefined gpuId", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          // gpuId deliberately omitted
          type: "thermal",
          severity: "warning",
          parameters: { targetTemp: 95 },
        },
      ];

      applyScenarioFaults(faults);

      expect(mockUpdateGPU).not.toHaveBeenCalled();
      expect(mockAddXIDError).not.toHaveBeenCalled();
    });

    it("uses default parameter values when parameters are not provided", () => {
      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "xid-error",
          severity: "critical",
          // No parameters: should default xid to 79
        },
      ];

      applyScenarioFaults(faults);

      expect(mockAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ code: 79 }),
      );
    });
  });

  // ── applyFaultsToContext (sandbox isolation) ──────────────────

  describe("applyFaultsToContext", () => {
    it("applies faults to ScenarioContext instead of global store", () => {
      const cluster = createMockCluster();
      const context = new ScenarioContext("test", cluster);

      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "thermal",
          severity: "warning",
          parameters: { targetTemp: 88 },
        },
      ];

      applyFaultsToContext(faults, context);

      // Context should be updated
      const gpu = context.getGPU("dgx-00", 0);
      expect(gpu?.temperature).toBe(88);

      // Global store mocks should NOT have been called
      expect(mockUpdateGPU).not.toHaveBeenCalled();
    });

    it("applies driver-error fault to context", () => {
      const cluster = createMockCluster();
      const context = new ScenarioContext("test", cluster);

      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "driver-error",
          severity: "critical",
        },
      ];

      applyFaultsToContext(faults, context);

      const gpu = context.getGPU("dgx-00", 0);
      expect(gpu?.healthStatus).toBe("Critical");
    });

    it("applies pcie-error fault to context", () => {
      const cluster = createMockCluster();
      const context = new ScenarioContext("test", cluster);

      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "pcie-error",
          severity: "warning",
        },
      ];

      applyFaultsToContext(faults, context);

      const gpu = context.getGPU("dgx-00", 0);
      expect(gpu?.healthStatus).toBe("Warning");
    });

    it("handles empty faults array as no-op", () => {
      const cluster = createMockCluster();
      const context = new ScenarioContext("test", cluster);

      applyFaultsToContext([], context);

      expect(context.getMutationCount()).toBe(0);
    });
  });

  // ── clearAllFaults ────────────────────────────────────────────

  describe("clearAllFaults", () => {
    it("resets all GPUs to healthy defaults", () => {
      clearAllFaults();

      // Should call updateGPU for every GPU in the cluster
      expect(mockUpdateGPU).toHaveBeenCalledTimes(
        mockCluster.nodes.reduce((sum, n) => sum + n.gpus.length, 0),
      );

      // Check that it resets to healthy defaults
      expect(mockUpdateGPU).toHaveBeenCalledWith("dgx-00", 0, {
        temperature: 45,
        powerDraw: 300,
        utilization: 0,
        memoryUsed: 0,
        healthStatus: "OK",
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: { singleBit: 0, doubleBit: 0 },
        },
        xidErrors: [],
      });
    });

    it("resets node health to OK", () => {
      clearAllFaults();

      expect(mockUpdateNodeHealth).toHaveBeenCalledWith("dgx-00", "OK");
    });
  });

  // ── Unknown fault type ────────────────────────────────────────

  describe("unknown fault type", () => {
    it("warns but does not crash for applyScenarioFaults", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "bogus-fault" as FaultInjectionConfig["type"],
          severity: "critical",
        },
      ];

      expect(() => applyScenarioFaults(faults)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown fault type"),
      );

      warnSpy.mockRestore();
    });

    it("warns but does not crash for applyFaultsToContext", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const cluster = createMockCluster();
      const context = new ScenarioContext("test", cluster);

      const faults: FaultInjectionConfig[] = [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "bogus-fault" as FaultInjectionConfig["type"],
          severity: "critical",
        },
      ];

      expect(() => applyFaultsToContext(faults, context)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown fault type"),
      );

      warnSpy.mockRestore();
    });
  });

  // ── initializeScenario ────────────────────────────────────────

  describe("initializeScenario", () => {
    // We need to mock the dynamic import of scenarioContext
    let mockClearAll: ReturnType<typeof vi.fn>;
    let mockCreateContext: ReturnType<typeof vi.fn>;
    let mockSetActiveContext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockClearAll = vi.fn();
      mockCreateContext = vi.fn(() => {
        // Return a real ScenarioContext for fault application
        return new ScenarioContext("test", createMockCluster());
      });
      mockSetActiveContext = vi.fn();

      // Mock the dynamic import() used inside initializeScenario
      vi.doMock("@/store/scenarioContext", () => ({
        scenarioContextManager: {
          clearAll: mockClearAll,
          createContext: mockCreateContext,
          setActiveContext: mockSetActiveContext,
        },
        ScenarioContext: ScenarioContext,
      }));
    });

    afterEach(() => {
      vi.doUnmock("@/store/scenarioContext");
    });

    it("returns true for a valid scenario ID", async () => {
      const result = await initializeScenario("domain1-midnight-deployment");

      expect(result).toBe(true);
    });

    it("returns false for an invalid scenario ID", async () => {
      const result = await initializeScenario("nonexistent-scenario-xyz");

      expect(result).toBe(false);
    });

    it("calls loadScenario on the simulation store", async () => {
      await initializeScenario("domain1-midnight-deployment");

      expect(mockLoadScenario).toHaveBeenCalledTimes(1);
      expect(mockLoadScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "domain1-midnight-deployment",
        }),
      );
    });

    it("creates sandbox context via scenarioContextManager", async () => {
      await initializeScenario("domain1-midnight-deployment");

      expect(mockClearAll).toHaveBeenCalled();
      expect(mockCreateContext).toHaveBeenCalledWith(
        "domain1-midnight-deployment",
      );
      expect(mockSetActiveContext).toHaveBeenCalledWith(
        "domain1-midnight-deployment",
      );
    });
  });
});
