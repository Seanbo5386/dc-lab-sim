import { describe, it, expect } from "vitest";
import { applyRemediation } from "@/utils/remediationEngine";
import type { GPU, DGXNode, XIDError } from "@/types/hardware";

const xid = (code: number): XIDError => ({
  code,
  timestamp: new Date(),
  description: `XID ${code}`,
  severity: "Critical",
});

function makeGpu(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: "GPU-test",
    name: "NVIDIA H100 80GB HBM3",
    type: "H100-SXM",
    pciAddress: "0000:17:00.0",
    temperature: 45,
    powerDraw: 250,
    powerLimit: 700,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 0,
    clocksSM: 1980,
    clocksMem: 2619,
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
        speed: 400,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
    ],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  };
}

function makeNode(
  overrides: Partial<DGXNode> = {},
  gpus: GPU[] = [makeGpu()],
): DGXNode {
  return {
    id: "dgx-04",
    hostname: "dgx-node05",
    systemType: "DGX-H100",
    gpus,
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "10.0.0.5",
      macAddress: "aa:bb:cc:dd:ee:ff",
      firmwareVersion: "1.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "x",
    cpuCount: 2,
    ramTotal: 2048,
    ramUsed: 100,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
    ...overrides,
  };
}

describe("applyRemediation", () => {
  it("gpu-reset clears a recoverable XID (43)", () => {
    const gpu = makeGpu({
      xidErrors: [xid(43)],
      utilization: 0,
      healthStatus: "Critical",
    });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates).toMatchObject({ xidErrors: [], healthStatus: "OK" });
  });

  it("gpu-reset on XID 79 (off bus) is insufficient and names the power cycle", () => {
    const gpu = makeGpu({ xidErrors: [xid(79)], healthStatus: "Critical" });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset");
    expect(r.outcome).toBe("insufficient");
    expect(r.message).toMatch(/power-cycle/i);
  });

  it("power-cycle clears XID 79", () => {
    const gpu = makeGpu({ xidErrors: [xid(79)], healthStatus: "Critical" });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "power-cycle");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates).toMatchObject({ xidErrors: [], healthStatus: "OK" });
  });

  it("power-cycle restores downed NVLinks on an off-bus (XID 79) GPU", () => {
    const gpu = makeGpu({
      xidErrors: [xid(79)],
      healthStatus: "Critical",
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 5,
          replayErrors: 0,
        },
      ],
    });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "power-cycle");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates?.nvlinks?.[0]).toMatchObject({
      status: "Active",
      txErrors: 0,
      rxErrors: 0,
    });
    // off-bus does not change temperature, so recovery must not touch it
    expect(r.gpuUpdates?.temperature).toBeUndefined();
  });

  it("reset-ecc-errors clears double-bit ECC", () => {
    const gpu = makeGpu({
      eccErrors: {
        singleBit: 0,
        doubleBit: 3,
        aggregated: { singleBit: 0, doubleBit: 3 },
      },
      healthStatus: "Critical",
    });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "reset-ecc-errors");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates?.eccErrors).toEqual({
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    });
  });

  it("gpu-reset also clears double-bit ECC", () => {
    const gpu = makeGpu({
      eccErrors: {
        singleBit: 0,
        doubleBit: 3,
        aggregated: { singleBit: 0, doubleBit: 3 },
      },
      healthStatus: "Critical",
    });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset").outcome,
    ).toBe("fixed");
  });

  it("set-power-limit resolves a thermal (85C) fault", () => {
    const gpu = makeGpu({ temperature: 85, healthStatus: "Warning" });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "set-power-limit");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates).toMatchObject({ temperature: 65, healthStatus: "OK" });
  });

  it("set-power-limit resolves a power fault", () => {
    const gpu = makeGpu({ powerDraw: 700 * 0.96, healthStatus: "Warning" });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "set-power-limit");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates?.healthStatus).toBe("OK");
  });

  it("a healthy GPU at >=95% TDP is NOT a power fault (heavy load, not remediable)", () => {
    const gpu = makeGpu({ powerDraw: 700 * 0.96, healthStatus: "OK" });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "set-power-limit").outcome,
    ).toBe("not-applicable");
  });

  it("set-power-limit on a node-wide thermal alert (>=90C) is insufficient", () => {
    const gpu = makeGpu({ temperature: 95, healthStatus: "Warning" });
    const r = applyRemediation(gpu, makeNode({}, [gpu]), "set-power-limit");
    expect(r.outcome).toBe("insufficient");
  });

  it("power-cycle resolves a node-wide thermal alert", () => {
    const gpu = makeGpu({ temperature: 95, healthStatus: "Warning" });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "power-cycle").outcome,
    ).toBe("fixed");
  });

  it("fabricmanager-restart resolves a downed NVLink", () => {
    const gpu = makeGpu({
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ],
      healthStatus: "Warning",
    });
    const r = applyRemediation(
      gpu,
      makeNode({}, [gpu]),
      "fabricmanager-restart",
    );
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates?.nvlinks?.[0]).toMatchObject({
      status: "Active",
      txErrors: 0,
    });
  });

  it("gpu-reset on a downed NVLink is insufficient", () => {
    const gpu = makeGpu({
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ],
      healthStatus: "Warning",
    });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset").outcome,
    ).toBe("insufficient");
  });

  it("reseat-nvlink resolves a downed NVLink", () => {
    const gpu = makeGpu({
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ],
      healthStatus: "Warning",
    });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "reseat-nvlink").outcome,
    ).toBe("fixed");
  });

  it("gpu-reset and reseat-gpu both resolve a PCIe (XID 62) fault", () => {
    const gpu = makeGpu({ xidErrors: [xid(62)], healthStatus: "Critical" });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset").outcome,
    ).toBe("fixed");
    const gpu2 = makeGpu({ xidErrors: [xid(62)], healthStatus: "Critical" });
    expect(
      applyRemediation(gpu2, makeNode({}, [gpu2]), "reseat-gpu").outcome,
    ).toBe("fixed");
  });

  it("severe ECC (XID 63) is not fixed by any software/physical action", () => {
    const faulted = () =>
      makeGpu({
        xidErrors: [xid(63)],
        eccErrors: {
          singleBit: 1500,
          doubleBit: 50,
          aggregated: { singleBit: 1500, doubleBit: 50 },
        },
        healthStatus: "Critical",
      });
    for (const action of [
      "gpu-reset",
      "reset-ecc-errors",
      "power-cycle",
    ] as const) {
      expect(
        applyRemediation(faulted(), makeNode({}, [faulted()]), action).outcome,
      ).toBe("insufficient");
    }
    for (const action of ["reseat-gpu", "reseat-nvlink"] as const) {
      expect(
        applyRemediation(faulted(), makeNode({}, [faulted()]), action).outcome,
      ).toBe("not-applicable");
    }
  });

  it("rma flags an XID-63 GPU once a bug report exists and the node is drained", () => {
    const gpu = makeGpu({ xidErrors: [xid(63)], healthStatus: "Critical" });
    const node = makeNode({ bugReportCollected: true, slurmState: "drain" }, [
      gpu,
    ]);
    const r = applyRemediation(gpu, node, "rma");
    expect(r.outcome).toBe("fixed");
    expect(r.gpuUpdates).toMatchObject({ rmaStatus: "pending" });
  });

  it("rma is blocked without a bug report", () => {
    const gpu = makeGpu({ xidErrors: [xid(63)], healthStatus: "Critical" });
    const node = makeNode({ bugReportCollected: false, slurmState: "drain" }, [
      gpu,
    ]);
    expect(applyRemediation(gpu, node, "rma").outcome).toBe("blocked");
  });

  it("rma is blocked while the node is allocated", () => {
    const gpu = makeGpu({ xidErrors: [xid(63)], healthStatus: "Critical" });
    const node = makeNode({ bugReportCollected: true, slurmState: "alloc" }, [
      gpu,
    ]);
    expect(applyRemediation(gpu, node, "rma").outcome).toBe("blocked");
  });

  it("rma on a recoverable fault is not-applicable", () => {
    const gpu = makeGpu({ xidErrors: [xid(43)], healthStatus: "Critical" });
    const node = makeNode({ bugReportCollected: true, slurmState: "drain" }, [
      gpu,
    ]);
    expect(applyRemediation(gpu, node, "rma").outcome).toBe("not-applicable");
  });

  it("gpu-reset is blocked while the node is allocated", () => {
    const gpu = makeGpu({ xidErrors: [xid(43)], healthStatus: "Critical" });
    const node = makeNode({ slurmState: "alloc" }, [gpu]);
    expect(applyRemediation(gpu, node, "gpu-reset").outcome).toBe("blocked");
  });

  it("power-cycle is blocked while the node is allocated", () => {
    const gpu = makeGpu({ xidErrors: [xid(79)], healthStatus: "Critical" });
    const node = makeNode({ slurmState: "alloc" }, [gpu]);
    expect(applyRemediation(gpu, node, "power-cycle").outcome).toBe("blocked");
  });

  it("reseat-gpu on an unrelated fault is not-applicable", () => {
    const gpu = makeGpu({
      nvlinks: [
        {
          linkId: 0,
          status: "Down",
          speed: 400,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ],
      healthStatus: "Warning",
    });
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "reseat-gpu").outcome,
    ).toBe("not-applicable");
  });

  it("any action on a healthy GPU is not-applicable", () => {
    const gpu = makeGpu();
    expect(
      applyRemediation(gpu, makeNode({}, [gpu]), "gpu-reset").outcome,
    ).toBe("not-applicable");
  });
});
