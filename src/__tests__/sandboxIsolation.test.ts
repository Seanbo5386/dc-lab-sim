import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ScenarioContext,
  scenarioContextManager,
} from "@/store/scenarioContext";
import { applyFaultsToContext } from "@/utils/scenarioLoader";
import {
  getRatedTDP,
  heatWattsFraction,
} from "@/simulation/clusterPhysicsEngine";
import type { FaultInjectionConfig } from "@/types/scenarios";
import type { ClusterConfig } from "@/types/hardware";

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: () => ({
      cluster: createBaseCluster(),
    }),
  },
}));

function createBaseCluster(): ClusterConfig {
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
            computeMode: "Default",
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

describe("Sandbox Isolation", () => {
  beforeEach(() => {
    scenarioContextManager.clearAll();
  });

  it("scenario A faults do not leak to scenario B", () => {
    const clusterA = createBaseCluster();
    const contextA = new ScenarioContext("scenario-a", clusterA);
    scenarioContextManager.createContext("scenario-a", clusterA);

    const faultsA: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        gpuId: 0,
        type: "thermal",
        severity: "critical",
        parameters: { targetTemp: 95 },
      },
    ];
    applyFaultsToContext(faultsA, contextA);

    expect(contextA.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBe(
      getRatedTDP("H100-SXM") * heatWattsFraction(95),
    );

    // Create scenario B — should have clean state
    const clusterB = createBaseCluster();
    const contextB = new ScenarioContext("scenario-b", clusterB);

    expect(contextB.getGPU("dgx-00", 0)?.temperature).toBe(45);
    expect(contextB.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBeFalsy();
    expect(contextB.getMutationCount()).toBe(0);
  });

  it("auto-faults accumulate across step transitions", () => {
    const cluster = createBaseCluster();
    const context = new ScenarioContext("test-scenario", cluster);

    // Step 1 faults
    const step1Faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        gpuId: 0,
        type: "thermal",
        severity: "warning",
        parameters: { targetTemp: 80 },
      },
    ];
    applyFaultsToContext(step1Faults, context);

    expect(context.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBe(
      getRatedTDP("H100-SXM") * heatWattsFraction(80),
    );
    expect(context.getMutationCount()).toBe(1);

    // Step 2 faults — add XID error on different GPU
    const step2Faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        gpuId: 1,
        type: "xid-error",
        severity: "critical",
        parameters: { xid: 79 },
      },
    ];
    applyFaultsToContext(step2Faults, context);

    // Both faults should be present
    expect(context.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBe(
      getRatedTDP("H100-SXM") * heatWattsFraction(80),
    );
    expect(context.getGPU("dgx-00", 1)?.xidErrors).toHaveLength(1);
    expect(context.getMutationCount()).toBe(2);
  });

  it("clearing context leaves global state clean", () => {
    const cluster = createBaseCluster();
    const context = scenarioContextManager.createContext("test", cluster);
    scenarioContextManager.setActiveContext("test");

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        gpuId: 0,
        type: "memory-full",
        severity: "critical",
      },
    ];
    applyFaultsToContext(faults, context);

    expect(context.getGPU("dgx-00", 0)?.memoryUsed).toBe(79000);

    // Clear all contexts
    scenarioContextManager.clearAll();

    // No active context
    expect(scenarioContextManager.getActiveContext()).toBeUndefined();

    // A fresh cluster (simulating global store) should be untouched
    const freshCluster = createBaseCluster();
    expect(freshCluster.nodes[0].gpus[0].memoryUsed).toBe(0);
  });

  it("free mode faults do not leak to global store", () => {
    const cluster = createBaseCluster();
    const freeContext = scenarioContextManager.createContext(
      "free-mode",
      cluster,
    );
    scenarioContextManager.setActiveContext("free-mode");

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        gpuId: 0,
        type: "gpu-hang",
        severity: "critical",
      },
      {
        nodeId: "dgx-00",
        gpuId: 1,
        type: "ecc-error",
        severity: "critical",
        parameters: { singleBit: 100, doubleBit: 5 },
      },
    ];
    applyFaultsToContext(faults, freeContext);

    // Free mode context has faults
    expect(freeContext.getGPU("dgx-00", 0)?.utilization).toBe(0);
    expect(freeContext.getGPU("dgx-00", 0)?.healthStatus).toBe("Critical");
    expect(freeContext.getGPU("dgx-00", 1)?.eccErrors.singleBit).toBe(100);

    // Global store untouched
    const globalCluster = createBaseCluster();
    expect(globalCluster.nodes[0].gpus[0].utilization).toBe(50);
    expect(globalCluster.nodes[0].gpus[0].healthStatus).toBe("OK");
  });

  it("free mode exit then mission start has clean state", () => {
    // Simulate free mode
    const freeCluster = createBaseCluster();
    const freeContext = scenarioContextManager.createContext(
      "free-mode",
      freeCluster,
    );
    scenarioContextManager.setActiveContext("free-mode");

    applyFaultsToContext(
      [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "thermal",
          severity: "critical",
          parameters: { targetTemp: 99 },
        },
      ],
      freeContext,
    );

    // Exit free mode
    scenarioContextManager.deleteContext("free-mode");
    scenarioContextManager.setActiveContext(null);

    // Start a mission
    const missionCluster = createBaseCluster();
    const missionContext = scenarioContextManager.createContext(
      "domain5-test",
      missionCluster,
    );
    scenarioContextManager.setActiveContext("domain5-test");

    // Mission should have clean state
    expect(missionContext.getGPU("dgx-00", 0)?.temperature).toBe(45);
    expect(missionContext.getMutationCount()).toBe(0);
  });

  it("ScenarioContext.reset() restores initial state", () => {
    const cluster = createBaseCluster();
    const context = new ScenarioContext("test", cluster);

    applyFaultsToContext(
      [
        {
          nodeId: "dgx-00",
          gpuId: 0,
          type: "thermal",
          severity: "critical",
          parameters: { targetTemp: 95 },
        },
      ],
      context,
    );

    expect(context.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBe(
      getRatedTDP("H100-SXM") * heatWattsFraction(95),
    );
    expect(context.getMutationCount()).toBe(1);

    context.reset();

    // After reset, the context re-clones from global store (mocked at 45C default)
    expect(context.getGPU("dgx-00", 0)?.temperature).toBe(45);
    expect(context.getGPU("dgx-00", 0)?.activeFaultHeatWatts).toBeFalsy();
    expect(context.getMutationCount()).toBe(0);
  });
});
