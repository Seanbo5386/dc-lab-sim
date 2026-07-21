import type {
  ClusterConfig,
  DGXNode,
  GPU,
  GPUType,
  BlueFieldDPU,
  InfiniBandHCA,
  BMC,
  NVLinkConnection,
  InfiniBandPort,
  BMCSensor,
} from "@/types/hardware";
import {
  getHardwareSpecs,
  type SystemType,
  type HardwareSpec,
} from "@/data/hardwareSpecs";
import { IDLE_POWER_FLOOR } from "@/simulation/clusterPhysicsEngine";

const GPU_TYPE_MAP: Record<SystemType, GPUType> = {
  "DGX-A100": "A100-80GB",
  "DGX-H100": "H100-SXM",
  "DGX-H200": "H200-SXM",
  "DGX-B200": "B200",
  "DGX-GB200": "B200",
  "DGX-VR200": "R200",
};

// MIG profiles for A100/H100
export const MIG_PROFILES = [
  {
    id: 19,
    name: "1g.5gb",
    memory: 4.75,
    computeSlices: 14,
    gpuInstances: 1,
    maxInstances: 7,
  },
  {
    id: 20,
    name: "1g.10gb",
    memory: 9.62,
    computeSlices: 14,
    gpuInstances: 1,
    maxInstances: 4,
  },
  {
    id: 14,
    name: "2g.10gb",
    memory: 9.62,
    computeSlices: 28,
    gpuInstances: 2,
    maxInstances: 3,
  },
  {
    id: 9,
    name: "3g.20gb",
    memory: 19.5,
    computeSlices: 42,
    gpuInstances: 3,
    maxInstances: 2,
  },
  {
    id: 5,
    name: "4g.20gb",
    memory: 19.5,
    computeSlices: 56,
    gpuInstances: 4,
    maxInstances: 1,
  },
  {
    id: 0,
    name: "7g.40gb",
    memory: 39.25,
    computeSlices: 98,
    gpuInstances: 7,
    maxInstances: 1,
  },
];

function generateUUID(): string {
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return `GPU-${uuid}`;
}

function createNVLinkConnections(specs: HardwareSpec): NVLinkConnection[] {
  return Array.from({ length: specs.nvlink.linksPerGpu }, (_, i) => ({
    linkId: i,
    status: "Active" as const,
    speed: specs.nvlink.totalBandwidthGBs,
    txErrors: 0,
    rxErrors: 0,
    replayErrors: 0,
  }));
}

function createGPU(id: number, specs: HardwareSpec): GPU {
  return {
    id,
    uuid: generateUUID(),
    name: specs.gpu.model,
    type: GPU_TYPE_MAP[specs.system.type] || "A100-80GB",
    pciAddress: `00000000:${(0x10 + id).toString(16).padStart(2, "0")}:00.0`,
    temperature: 30 + Math.random() * 10,
    // Idle equilibrium: 0% utilization should draw ~IDLE_POWER_FLOOR of TDP
    // (the same floor ClusterPhysicsEngine.tickGPU() converges every GPU
    // toward at 0% utilization), not 60-80% of TDP — PHYS-4's "0% util at
    // 249-318W" symptom. Temperature is left as-is: it already lands close
    // to this same floor's implied ~41.5-44.6°C equilibrium.
    powerDraw:
      specs.gpu.tdpWatts * IDLE_POWER_FLOOR +
      Math.random() * specs.gpu.tdpWatts * 0.05,
    powerLimit: specs.gpu.tdpWatts,
    memoryTotal: specs.gpu.memoryMiB,
    memoryUsed: 0,
    utilization: 0,
    clocksSM: specs.gpu.boostClockMHz,
    clocksMem: specs.gpu.memoryClockMHz,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: {
        singleBit: 0,
        doubleBit: 0,
      },
    },
    migMode: false,
    migInstances: [],
    nvlinks: createNVLinkConnections(specs),
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    computeMode: "Default",
  };
}

function createBlueFieldDPU(id: number, systemType: SystemType): BlueFieldDPU {
  // BF-2 (mt41686) for Ampere; BF-3 (mt41692) for Hopper+
  const isBF3 = systemType !== "DGX-A100";
  const deviceId = isBF3 ? "mt41692" : "mt41686";
  const firmwareVersion = isBF3 ? "24.35.2000" : "24.26.1610";
  return {
    id,
    pciAddress: `0000:${(0xa0 + id).toString(16)}:00.0`,
    devicePath: `/dev/mst/${deviceId}_pciconf${id}`,
    firmwareVersion,
    mode: {
      mode: "DPU",
      internalCpuModel: 1,
      description: "DPU mode - Arm cores own NIC resources",
    },
    ipAddress: `192.168.100.${10 + id}`,
    armOS: "Ubuntu 22.04.3 LTS",
    ovsConfigured: true,
    rshimAvailable: true,
  };
}

function createInfiniBandPort(
  portNum: number,
  lid: number,
  specs: HardwareSpec,
): InfiniBandPort {
  return {
    portNumber: portNum,
    state: "Active",
    physicalState: "LinkUp",
    rate: specs.network.portRateGbs as 100 | 200 | 400 | 800,
    lid,
    // Real IB GUIDs are 64-bit (16 hex digits), not 48-bit (SIM-13). The
    // string is padded to 16 digits; Number.MAX_SAFE_INTEGER only gives
    // Math.random() ~2^53 of usable range (the top two hex digits are
    // always "00"), but that's still ample entropy to avoid a collision
    // within one simulated cluster's small port count.
    guid: `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
      .toString(16)
      .padStart(16, "0")}`,
    linkLayer: "InfiniBand",
    // Seeded from the same LID-derived baseline perfquery previously
    // computed fresh on every call -- kept here as the STARTING value so a
    // freshly-built cluster's first perfquery still looks like a
    // long-running port, not a suspiciously-zeroed one. Ticks/load advance
    // these further (PHYS-7); perfquery no longer recomputes them.
    xmitDataBytes: 500000000 + ((lid * 7919) % 500000000),
    rcvDataBytes: 450000000 + ((lid * 7919 * 3) % 500000000),
    xmitPkts: 5000000 + ((lid * 7919) % 5000000),
    rcvPkts: 4800000 + ((lid * 7919 * 3) % 5000000),
    errors: {
      symbolErrors: 0,
      linkDowned: 0,
      portRcvErrors: 0,
      portXmitDiscards: 0,
      portXmitWait: 0,
    },
  };
}

function createInfiniBandHCA(id: number, specs: HardwareSpec): InfiniBandHCA {
  const hcaDeviceIds: Record<string, string> = {
    "ConnectX-6": "mt4123",
    "ConnectX-7": "mt4129",
    "ConnectX-8": "mt4131",
    "ConnectX-9": "mt4133",
  };
  const deviceId = hcaDeviceIds[specs.network.hcaModel] || "mt4123";
  return {
    id,
    devicePath: `/dev/mst/${deviceId}_pciconf${id}`,
    // Real Linux/Mellanox RDMA device name -- unique per HCA on a node via
    // its own id, not the single node-wide "ConnectX-N HCA" string every
    // HCA previously shared (SIM-3).
    caType: `mlx5_${id}`,
    model: specs.network.hcaModel,
    firmwareVersion:
      specs.network.hcaModel === "ConnectX-9"
        ? "34.42.1000"
        : specs.network.hcaModel === "ConnectX-8"
          ? "40.48.1000"
          : specs.network.hcaModel === "ConnectX-7"
            ? "28.39.1002"
            : "20.35.1012",
    // Unique LID per port across the node (100 + a running index), not the
    // same 101 for every port (SIM-13). This function only ever builds one
    // port per HCA (portNum always 1), so the HCA's own id doubles as the
    // per-node port index.
    ports: [createInfiniBandPort(1, 100 + id, specs)],
  };
}

function createBMCSensors(): BMCSensor[] {
  return [
    {
      name: "CPU1 Temp",
      reading: 45,
      unit: "°C",
      status: "OK",
      upperCritical: 95,
      upperWarning: 85,
    },
    {
      name: "CPU2 Temp",
      reading: 47,
      unit: "°C",
      status: "OK",
      upperCritical: 95,
      upperWarning: 85,
    },
    {
      name: "Inlet Temp",
      reading: 22,
      unit: "°C",
      status: "OK",
      upperCritical: 45,
      upperWarning: 40,
    },
    {
      name: "Exhaust Temp",
      reading: 35,
      unit: "°C",
      status: "OK",
      upperCritical: 70,
      upperWarning: 65,
    },
    {
      name: "PSU1 Input",
      reading: 230,
      unit: "V",
      status: "OK",
      lowerCritical: 180,
      upperCritical: 264,
    },
    {
      name: "PSU2 Input",
      reading: 229,
      unit: "V",
      status: "OK",
      lowerCritical: 180,
      upperCritical: 264,
    },
    {
      name: "PSU1 Power",
      reading: 850,
      unit: "W",
      status: "OK",
      upperCritical: 3000,
    },
    {
      name: "PSU2 Power",
      reading: 840,
      unit: "W",
      status: "OK",
      upperCritical: 3000,
    },
    {
      name: "Fan1",
      reading: 5200,
      unit: "RPM",
      status: "OK",
      lowerCritical: 1000,
    },
    {
      name: "Fan2",
      reading: 5150,
      unit: "RPM",
      status: "OK",
      lowerCritical: 1000,
    },
    {
      name: "Fan3",
      reading: 5300,
      unit: "RPM",
      status: "OK",
      lowerCritical: 1000,
    },
    {
      name: "Fan4",
      reading: 5180,
      unit: "RPM",
      status: "OK",
      lowerCritical: 1000,
    },
  ];
}

function createBMC(nodeId: number): BMC {
  return {
    ipAddress: `192.168.0.${100 + nodeId}`,
    macAddress: `b8:ce:f6:${nodeId.toString(16).padStart(2, "0")}:00:01`,
    firmwareVersion: "3.47.00",
    manufacturer: "NVIDIA",
    sensors: createBMCSensors(),
    powerState: "On",
  };
}

export function createDGXNode(
  id: number,
  systemType: SystemType = "DGX-A100",
): DGXNode {
  const specs = getHardwareSpecs(systemType);
  const cpu = specs.system.cpu;

  // Driver/CUDA versions appropriate to generation
  const driverVersions: Record<string, { driver: string; cuda: string }> = {
    Ampere: { driver: "535.129.03", cuda: "12.2" },
    Hopper: { driver: "550.54.15", cuda: "12.4" },
    Blackwell: { driver: "560.35.03", cuda: "12.6" },
    "Blackwell Ultra": { driver: "565.57.01", cuda: "12.7" },
    Rubin: { driver: "570.86.15", cuda: "12.8" },
  };
  const versions =
    driverVersions[specs.system.generation] || driverVersions["Ampere"];

  return {
    id: `dgx-${id.toString().padStart(2, "0")}`,
    hostname: `dgx-${id.toString().padStart(2, "0")}.cluster.local`,
    systemType,
    gpus: Array.from({ length: specs.gpu.count }, (_, i) =>
      createGPU(i, specs),
    ),
    dpus: Array.from({ length: 2 }, (_, i) =>
      createBlueFieldDPU(i, systemType),
    ),
    hcas: Array.from({ length: specs.network.hcaCount }, (_, i) =>
      createInfiniBandHCA(i, specs),
    ),
    bmc: createBMC(id),
    cpuModel: `${cpu.model} ${cpu.coresPerSocket}-Core Processor`,
    cpuCount: cpu.sockets * cpu.coresPerSocket,
    ramTotal: specs.system.systemMemoryGB,
    ramUsed: 128,
    osVersion: "Ubuntu 22.04.3 LTS",
    kernelVersion: "5.15.0-91-generic",
    nvidiaDriverVersion: versions.driver,
    cudaVersion: versions.cuda,
    healthStatus: "OK",
    slurmState: "idle",
  };
}

/**
 * Validates that an unknown value has the structural shape of a ClusterConfig
 * with non-null nodes that each carry an id and a gpus array. Used on persist
 * rehydrate to reject corrupted/partial localStorage blobs before they reach
 * components that iterate nodes/gpus unguarded.
 */
export function isValidCluster(value: unknown): value is ClusterConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ClusterConfig>;
  if (!Array.isArray(c.nodes) || c.nodes.length === 0) return false;
  return c.nodes.every(
    (n) =>
      !!n &&
      typeof n === "object" &&
      typeof n.id === "string" &&
      Array.isArray(n.gpus) &&
      n.gpus.every((g) => !!g && typeof g === "object"),
  );
}

export function createDefaultCluster(): ClusterConfig {
  return {
    name: "DGX SuperPOD",
    nodes: Array.from({ length: 8 }, (_, i) => createDGXNode(i)),
    fabricTopology: "FatTree",
    bcmHA: {
      enabled: true,
      primary: "mgmt-node0",
      secondary: "mgmt-node1",
      state: "Active",
    },
    slurmConfig: {
      controlMachine: "mgmt-node0",
      partitions: ["batch", "interactive", "gpu"],
    },
  };
}

export function createCustomCluster(
  nodeCount: number,
  systemType: SystemType,
): ClusterConfig {
  const nodes = Array.from({ length: nodeCount }, (_, i) =>
    createDGXNode(i, systemType),
  );

  return {
    name: `${systemType} Cluster`,
    nodes,
    fabricTopology: "FatTree",
    bcmHA: {
      enabled: true,
      primary: "mgmt-node0",
      secondary: "mgmt-node1",
      state: "Active",
    },
    slurmConfig: {
      controlMachine: "mgmt-node0",
      partitions: ["batch", "interactive", "gpu"],
    },
  };
}

export type { SystemType };
