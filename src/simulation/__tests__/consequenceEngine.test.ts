import { describe, it, expect } from "vitest";
import { ConsequenceEngine } from "../consequenceEngine";
import type { DGXNode } from "@/types/hardware";

function createTestNode(overrides: Partial<DGXNode> = {}): DGXNode {
  return {
    id: "dgx-00",
    hostname: "dgx-00.cluster.local",
    systemType: "DGX-A100",
    gpus: Array.from({ length: 8 }, (_, i) => ({
      id: i,
      uuid: `GPU-${i}`,
      name: "NVIDIA A100-SXM4-80GB",
      type: "A100-80GB" as const,
      pciAddress: `00000000:${(0x10 + i).toString(16)}:00.0`,
      temperature: 45,
      powerDraw: 200,
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
      nvlinks: [],
      healthStatus: "OK" as const,
      xidErrors: [],
      persistenceMode: true,
    })),
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "192.168.0.100",
      macAddress: "00:00:00:00:00:00",
      firmwareVersion: "3.47",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On" as const,
    },
    cpuModel: "AMD EPYC 7742",
    cpuCount: 128,
    ramTotal: 1024,
    ramUsed: 128,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    healthStatus: "OK" as const,
    slurmState: "alloc" as const,
    ...overrides,
  };
}

describe("ConsequenceEngine", () => {
  const engine = new ConsequenceEngine();

  it("should return no consequence for safe diagnostic commands", () => {
    const node = createTestNode();
    const result = engine.evaluate("nvidia-smi", node);
    expect(result).toBeNull();
  });

  it("should return consequence for GPU reset when MIG is active", () => {
    const node = createTestNode();
    node.gpus[0].migMode = true;
    node.gpus[0].migInstances = [
      {
        id: 0,
        gpuId: 0,
        profileId: 19,
        uuid: "MIG-0",
        computeInstances: [],
      },
    ];
    const result = engine.evaluate("nvidia-smi -r -i 0", node);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("mig-destroyed");
  });

  it("should return consequence for power cycle when jobs are running", () => {
    const node = createTestNode({ slurmState: "alloc" });
    node.gpus[0].allocatedJobId = 1234;
    const result = engine.evaluate("ipmitool power cycle", node);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("jobs-killed");
  });

  it("should return consequence for resuming node with unfixed fault", () => {
    const node = createTestNode({
      slurmState: "drain",
      healthStatus: "Critical",
    });
    const result = engine.evaluate(
      "scontrol update NodeName=dgx-00 State=RESUME",
      node,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("re-drain");
  });

  it("should return no consequence for power cycle on idle node", () => {
    const node = createTestNode({ slurmState: "idle" });
    const result = engine.evaluate("ipmitool power cycle", node);
    expect(result).toBeNull();
  });

  it("should return consequence for level-3 diagnostic with production load", () => {
    const node = createTestNode({ slurmState: "alloc" });
    node.gpus[0].allocatedJobId = 5678;
    node.gpus[0].utilization = 95;
    const result = engine.evaluate("dcgmi diag -r 3", node);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("diagnostic-evicts-jobs");
  });

  it("should return no consequence for level-1 diagnostic", () => {
    const node = createTestNode({ slurmState: "alloc" });
    node.gpus[0].allocatedJobId = 5678;
    const result = engine.evaluate("dcgmi diag -r 1", node);
    expect(result).toBeNull();
  });

  it("should have mutations array on returned consequences", () => {
    const node = createTestNode({ slurmState: "alloc" });
    node.gpus[0].allocatedJobId = 1234;
    const result = engine.evaluate("ipmitool power cycle", node);
    expect(result).not.toBeNull();
    expect(result!.mutations).toBeDefined();
    expect(Array.isArray(result!.mutations)).toBe(true);
    expect(result!.mutations.length).toBeGreaterThan(0);
  });
});
