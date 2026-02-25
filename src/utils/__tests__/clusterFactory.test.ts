import { describe, it, expect } from "vitest";
import { createDefaultCluster, createCustomCluster } from "../clusterFactory";

describe("createDefaultCluster", () => {
  const cluster = createDefaultCluster();

  it("should create a cluster with 8 nodes", () => {
    expect(cluster.nodes).toHaveLength(8);
  });

  it("should create 8 GPUs per node", () => {
    for (const node of cluster.nodes) {
      expect(node.gpus).toHaveLength(8);
    }
  });

  it("should set correct memory for A100 GPUs (81920 MiB)", () => {
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.memoryTotal).toBe(81920);
  });

  it("should initialize NVLink arrays with 12 connections for A100", () => {
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.nvlinks).toHaveLength(12);
    expect(gpu.nvlinks[0].status).toBe("Active");
  });

  it("should create InfiniBand HCAs with ports", () => {
    const node = cluster.nodes[0];
    expect(node.hcas.length).toBeGreaterThan(0);
    expect(node.hcas[0].ports.length).toBeGreaterThan(0);
  });

  it("should create InfiniBand ports with 0x-prefixed GUIDs", () => {
    const port = cluster.nodes[0].hcas[0].ports[0];
    expect(port.guid).toMatch(/^0x[0-9a-f]+$/i);
  });

  it("should assign unique node IDs", () => {
    const ids = cluster.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should create BMC with sensors", () => {
    const bmc = cluster.nodes[0].bmc;
    expect(bmc.sensors.length).toBeGreaterThan(0);
    expect(bmc.powerState).toBe("On");
  });

  it("should create BlueField DPUs", () => {
    const node = cluster.nodes[0];
    expect(node.dpus.length).toBeGreaterThan(0);
    expect(node.dpus[0].firmwareVersion).toBeTruthy();
  });

  it("should set default Slurm state to idle", () => {
    for (const node of cluster.nodes) {
      expect(node.slurmState).toBe("idle");
    }
  });
});

describe("createCustomCluster", () => {
  it("should create cluster with specified node count", () => {
    const cluster = createCustomCluster(4, "DGX-A100");
    expect(cluster.nodes).toHaveLength(4);
  });

  it("should create H100 cluster with correct GPU specs", () => {
    const cluster = createCustomCluster(2, "DGX-H100");
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.name).toContain("H100");
    expect(gpu.powerLimit).toBe(700);
  });

  it("should create H100 GPUs with 18 NVLinks", () => {
    const cluster = createCustomCluster(1, "DGX-H100");
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.nvlinks).toHaveLength(18);
  });

  it("should create GB200 cluster with correct GPU specs", () => {
    const cluster = createCustomCluster(2, "DGX-GB200");
    const node = cluster.nodes[0];
    const gpu = node.gpus[0];
    expect(gpu.name).toContain("GB200");
    expect(gpu.type).toBe("GB200");
    expect(gpu.memoryTotal).toBe(196608); // 192GB in MiB
    expect(gpu.powerLimit).toBe(1200);
  });

  it("should create GB200 GPUs with 18 NVLinks", () => {
    const cluster = createCustomCluster(1, "DGX-GB200");
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.nvlinks).toHaveLength(18);
  });

  it("should create GB200 nodes with ConnectX-8 HCAs", () => {
    const cluster = createCustomCluster(1, "DGX-GB200");
    const hca = cluster.nodes[0].hcas[0];
    expect(hca.caType).toContain("ConnectX-8");
    expect(hca.ports[0].rate).toBe(800); // XDR
  });

  it("should create GB200 nodes with Grace CPU", () => {
    const cluster = createCustomCluster(1, "DGX-GB200");
    const node = cluster.nodes[0];
    expect(node.cpuModel).toContain("Grace");
  });

  it("creates a DGX-VR200 cluster", () => {
    const cluster = createCustomCluster(2, "DGX-VR200");
    expect(cluster.nodes).toHaveLength(2);
    expect(cluster.nodes[0].systemType).toBe("DGX-VR200");
    expect(cluster.nodes[0].gpus[0].name).toContain("R200");
    expect(cluster.nodes[0].gpus).toHaveLength(8);
  });

  it("should create VR200 GPUs with 18 NVLinks", () => {
    const cluster = createCustomCluster(1, "DGX-VR200");
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.nvlinks).toHaveLength(18);
  });

  it("should create VR200 nodes with ConnectX-9 HCAs", () => {
    const cluster = createCustomCluster(1, "DGX-VR200");
    const hca = cluster.nodes[0].hcas[0];
    expect(hca.caType).toContain("ConnectX-9");
    expect(hca.ports[0].rate).toBe(1600); // XDR2
  });

  it("should create VR200 nodes with Vera CPU", () => {
    const cluster = createCustomCluster(1, "DGX-VR200");
    const node = cluster.nodes[0];
    expect(node.cpuModel).toContain("Vera");
  });

  it("should create VR200 nodes with Rubin driver version", () => {
    const cluster = createCustomCluster(1, "DGX-VR200");
    const node = cluster.nodes[0];
    expect(node.nvidiaDriverVersion).toBe("570.10.01");
    expect(node.cudaVersion).toBe("13.0");
  });

  it("should create VR200 nodes with correct GPU memory (288GB)", () => {
    const cluster = createCustomCluster(1, "DGX-VR200");
    const gpu = cluster.nodes[0].gpus[0];
    expect(gpu.memoryTotal).toBe(294912); // 288GB in MiB
    expect(gpu.powerLimit).toBe(1500);
  });
});
