// Hardware type definitions for Data Center Lab Simulator

export type HealthStatus = "OK" | "Warning" | "Critical" | "Unknown";

export type DGXSystemType =
  | "DGX-A100"
  | "DGX-H100"
  | "DGX-H200"
  | "DGX-B200"
  | "DGX-GB200"
  | "DGX-VR200";

export type GPUType =
  | "A100-80GB"
  | "H100-SXM"
  | "H200-SXM"
  | "B200"
  | "GB200"
  | "R200"
  | "Blackwell";

export interface MIGProfile {
  id: number;
  name: string;
  memory: number; // GB
  computeSlices: number;
  gpuInstances: number;
  maxInstances: number;
}

export interface MIGInstance {
  id: number;
  gpuId: number;
  profileId: number;
  uuid: string;
  computeInstances: ComputeInstance[];
}

export interface ComputeInstance {
  id: number;
  giId: number;
  profileId: number;
  uuid: string;
}

export interface NVLinkConnection {
  linkId: number;
  status: "Active" | "Down" | "Inactive";
  speed: number; // GB/s
  txErrors: number;
  rxErrors: number;
  replayErrors: number;
}

export interface ECCErrors {
  singleBit: number;
  doubleBit: number;
  aggregated: {
    singleBit: number;
    doubleBit: number;
  };
}

export interface XIDError {
  code: number;
  timestamp: Date;
  description: string;
  severity: "Info" | "Warning" | "Critical";
}

export interface GPU {
  id: number;
  uuid: string;
  name: string;
  type: GPUType;
  pciAddress: string;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  memoryTotal: number; // MB
  memoryUsed: number; // MB
  utilization: number; // 0-100
  clocksSM: number; // MHz
  clocksMem: number; // MHz
  eccEnabled: boolean;
  eccErrors: ECCErrors;
  migMode: boolean;
  migInstances: MIGInstance[];
  nvlinks: NVLinkConnection[];
  healthStatus: HealthStatus;
  xidErrors: XIDError[];
  persistenceMode: boolean;
  allocatedJobId?: number; // Slurm job ID if GPU is allocated
}

export interface BlueFieldMode {
  mode: "DPU" | "RestrictedDPU" | "NIC" | "SeparatedHost";
  internalCpuModel: number; // 0 or 1
  description: string;
}

export interface BlueFieldDPU {
  id: number;
  pciAddress: string;
  devicePath: string; // /dev/mst/mt41692_pciconf0
  firmwareVersion: string;
  mode: BlueFieldMode;
  ipAddress?: string;
  armOS: string;
  ovsConfigured: boolean;
  rshimAvailable: boolean;
}

export interface InfiniBandPort {
  portNumber: number;
  state: "Active" | "Down" | "Polling" | "Disabled";
  physicalState: "LinkUp" | "LinkDown" | "Polling" | "Sleep";
  rate: 100 | 200 | 400 | 800 | 1600; // Gb/s (EDR, HDR, NDR, XDR, XDR2)
  lid: number;
  guid: string;
  linkLayer: "InfiniBand" | "Ethernet";
  errors: {
    symbolErrors: number;
    linkDowned: number;
    portRcvErrors: number;
    portXmitDiscards: number;
    portXmitWait: number;
  };
}

export interface InfiniBandHCA {
  id: number;
  devicePath: string;
  pciAddress?: string; // Optional for backward compatibility/simplicity
  caType: string; // ConnectX-6, ConnectX-7, ConnectX-8
  firmwareVersion: string;
  ports: InfiniBandPort[];
}

export interface BMCSensor {
  name: string;
  reading: number;
  unit: string;
  status: HealthStatus;
  lowerCritical?: number;
  upperCritical?: number;
  lowerWarning?: number;
  upperWarning?: number;
}

export interface BMC {
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  manufacturer: string;
  sensors: BMCSensor[];
  powerState: "On" | "Off";
}

export interface DGXNode {
  id: string;
  hostname: string;
  systemType: DGXSystemType;
  gpus: GPU[];
  dpus: BlueFieldDPU[];
  hcas: InfiniBandHCA[];
  bmc: BMC;
  cpuModel: string;
  cpuCount: number;
  ramTotal: number; // GB
  ramUsed: number; // GB
  osVersion: string;
  kernelVersion: string;
  nvidiaDriverVersion: string;
  cudaVersion: string;
  healthStatus: HealthStatus;
  slurmState: "idle" | "alloc" | "drain" | "down";
  slurmReason?: string;
  clusterPowerLimit?: number; // Power limit set via DCMI in watts
}

export interface ClusterConfig {
  name: string;
  nodes: DGXNode[];
  fabricTopology: "FatTree" | "RailOptimized" | "DragonFly";
  bcmHA: {
    enabled: boolean;
    primary: string;
    secondary: string;
    state: "Active" | "Standby" | "Fault";
  };
  slurmConfig: {
    controlMachine: string;
    partitions: string[];
  };
}
