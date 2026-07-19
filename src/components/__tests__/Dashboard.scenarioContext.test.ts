import { describe, it, expect, beforeEach } from "vitest";
import {
  ScenarioContext,
  scenarioContextManager,
} from "@/store/scenarioContext";
import type { ClusterConfig } from "@/types/hardware";

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

describe("Dashboard ScenarioContext integration", () => {
  beforeEach(() => {
    scenarioContextManager.clearAll();
  });

  it("returns scenario cluster when context is active", () => {
    const cluster = createBaseCluster();
    const ctx = scenarioContextManager.createContext("test", cluster);
    scenarioContextManager.setActiveContext("test");
    ctx.updateGPU("dgx-00", 0, { temperature: 95 });

    const scenarioCluster = ctx.getCluster();
    expect(scenarioCluster.nodes[0].gpus[0].temperature).toBe(95);

    scenarioContextManager.clearAll();
  });

  it("getActiveContext returns undefined when no context is active", () => {
    expect(scenarioContextManager.getActiveContext()).toBeUndefined();
  });

  it("scenarioContext cluster is independent of base cluster", () => {
    const cluster = createBaseCluster();
    const ctx = new ScenarioContext("test", cluster);
    ctx.updateGPU("dgx-00", 0, { temperature: 95 });

    // Original cluster unchanged
    expect(cluster.nodes[0].gpus[0].temperature).toBe(45);
    // Context cluster has the fault
    expect(ctx.getCluster().nodes[0].gpus[0].temperature).toBe(95);
  });

  it("getMutationCount tracks changes for polling", () => {
    const cluster = createBaseCluster();
    const ctx = new ScenarioContext("test", cluster);

    expect(ctx.getMutationCount()).toBe(0);
    ctx.updateGPU("dgx-00", 0, { temperature: 80 });
    expect(ctx.getMutationCount()).toBe(1);
    ctx.updateGPU("dgx-00", 0, { temperature: 95 });
    expect(ctx.getMutationCount()).toBe(2);
  });
});
