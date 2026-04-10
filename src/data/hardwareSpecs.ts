/**
 * Hardware Spec Registry
 *
 * Single source of truth for all DGX system specifications.
 * Sourced from official NVIDIA Reference Architecture documents.
 *
 * Supported systems:
 * - DGX A100: Ampere generation, 8x A100 80GB, NVLink 3.0
 * - DGX H100: Hopper generation, 8x H100 80GB, NVLink 4.0
 * - DGX H200: Hopper generation, 8x H200 141GB, NVLink 4.0
 * - DGX B200: Blackwell generation, 8x B200 192GB, NVLink 5.0
 * - DGX VR200: Rubin generation, 8x R200 288GB, NVLink 6.0
 */

export type SystemType =
  | "DGX-A100"
  | "DGX-H100"
  | "DGX-H200"
  | "DGX-B200"
  | "DGX-GB200"
  | "DGX-VR200";

export interface HardwareSpec {
  system: {
    type: SystemType;
    generation: string;
    cpu: { model: string; sockets: number; coresPerSocket: number };
    systemMemoryGB: number;
    totalGpuMemoryGB: number;
  };
  gpu: {
    model: string;
    count: number;
    memoryGB: number;
    memoryMiB: number;
    memoryType: string;
    memoryBandwidthTBs: number;
    tdpWatts: number;
    fp16Tflops: number;
    tf32Tflops: number;
    fp64Tflops: number;
    pciDeviceId: string;
    baseClockMHz: number;
    boostClockMHz: number;
    memoryClockMHz: number;
    smCount: number;
    architecture: string;
    computeCapability: string;
    bar1MemoryMiB: number;
    sxmVersion: string; // "SXM4", "SXM5", "SXM6"
  };
  nvlink: {
    version: string;
    linksPerGpu: number;
    perLinkBandwidthGBs: number;
    totalBandwidthGBs: number;
    nvSwitchCount: number;
    nvSwitchGeneration: string;
    nvLinkLabel: string;
  };
  network: {
    hcaModel: string;
    hcaCount: number;
    protocol: string;
    portRateGbs: number;
    hcasPerGpu: number;
    interNodeBandwidthGBs: number; // Expected multi-node bandwidth per NIC (GB/s)
  };
  storage: {
    osDrives: string;
    dataDrives: string;
    totalCapacityTB: number;
  };
}

export const HARDWARE_SPECS: Record<SystemType, HardwareSpec> = {
  "DGX-A100": {
    system: {
      type: "DGX-A100",
      generation: "Ampere",
      cpu: { model: "AMD EPYC 7742", sockets: 2, coresPerSocket: 64 },
      systemMemoryGB: 1024,
      totalGpuMemoryGB: 640,
    },
    gpu: {
      model: "NVIDIA A100-SXM4-80GB",
      count: 8,
      memoryGB: 80,
      memoryMiB: 81920,
      memoryType: "HBM2e",
      memoryBandwidthTBs: 2.0,
      tdpWatts: 400,
      fp16Tflops: 312,
      tf32Tflops: 156,
      fp64Tflops: 19.5,
      pciDeviceId: "20B2",
      baseClockMHz: 1095,
      boostClockMHz: 1410,
      memoryClockMHz: 1215,
      smCount: 108,
      architecture: "ga100",
      computeCapability: "8.0",
      bar1MemoryMiB: 131072,
      sxmVersion: "SXM4",
    },
    nvlink: {
      version: "3.0",
      linksPerGpu: 12,
      perLinkBandwidthGBs: 25,
      totalBandwidthGBs: 600,
      nvSwitchCount: 6,
      nvSwitchGeneration: "2nd Gen",
      nvLinkLabel: "NV12",
    },
    network: {
      hcaModel: "ConnectX-6",
      hcaCount: 8,
      protocol: "HDR",
      portRateGbs: 200,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 25,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "4x 3.84TB NVMe",
      totalCapacityTB: 19.2,
    },
  },

  "DGX-H100": {
    system: {
      type: "DGX-H100",
      generation: "Hopper",
      cpu: { model: "Intel Xeon 8480C", sockets: 2, coresPerSocket: 56 },
      systemMemoryGB: 2048,
      totalGpuMemoryGB: 640,
    },
    gpu: {
      model: "NVIDIA H100-SXM5-80GB",
      count: 8,
      memoryGB: 80,
      memoryMiB: 81920,
      memoryType: "HBM3",
      memoryBandwidthTBs: 3.35,
      tdpWatts: 700,
      fp16Tflops: 1979,
      tf32Tflops: 989,
      fp64Tflops: 34,
      pciDeviceId: "2330",
      baseClockMHz: 1590,
      boostClockMHz: 1980,
      memoryClockMHz: 1593,
      smCount: 132,
      architecture: "gh100",
      computeCapability: "9.0",
      bar1MemoryMiB: 131072,
      sxmVersion: "SXM5",
    },
    nvlink: {
      version: "4.0",
      linksPerGpu: 18,
      perLinkBandwidthGBs: 25,
      totalBandwidthGBs: 900,
      nvSwitchCount: 4,
      nvSwitchGeneration: "3rd Gen",
      nvLinkLabel: "NV18",
    },
    network: {
      hcaModel: "ConnectX-7",
      hcaCount: 8,
      protocol: "NDR",
      portRateGbs: 400,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 50,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "8x 3.84TB NVMe",
      totalCapacityTB: 34.56,
    },
  },

  "DGX-H200": {
    system: {
      type: "DGX-H200",
      generation: "Hopper",
      cpu: { model: "Intel Xeon 8480C", sockets: 2, coresPerSocket: 56 },
      systemMemoryGB: 2048,
      totalGpuMemoryGB: 1128,
    },
    gpu: {
      model: "NVIDIA H200-SXM-141GB",
      count: 8,
      memoryGB: 141,
      memoryMiB: 144384,
      memoryType: "HBM3e",
      memoryBandwidthTBs: 4.8,
      tdpWatts: 700,
      fp16Tflops: 989,
      tf32Tflops: 495,
      fp64Tflops: 34,
      pciDeviceId: "2335",
      baseClockMHz: 1095,
      boostClockMHz: 1830,
      memoryClockMHz: 2619,
      smCount: 132,
      architecture: "gh100",
      computeCapability: "9.0",
      bar1MemoryMiB: 131072,
      sxmVersion: "SXM5",
    },
    nvlink: {
      version: "4.0",
      linksPerGpu: 18,
      perLinkBandwidthGBs: 25,
      totalBandwidthGBs: 900,
      nvSwitchCount: 4,
      nvSwitchGeneration: "4th Gen",
      nvLinkLabel: "NV18",
    },
    network: {
      hcaModel: "ConnectX-7",
      hcaCount: 8,
      protocol: "NDR",
      portRateGbs: 400,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 50,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "8x 3.84TB NVMe",
      totalCapacityTB: 34.56,
    },
  },

  "DGX-B200": {
    system: {
      type: "DGX-B200",
      generation: "Blackwell",
      cpu: { model: "Intel Xeon 8570", sockets: 2, coresPerSocket: 56 },
      systemMemoryGB: 2048,
      totalGpuMemoryGB: 1536,
    },
    gpu: {
      model: "NVIDIA B200-SXM-192GB",
      count: 8,
      memoryGB: 192,
      memoryMiB: 196608,
      memoryType: "HBM3e",
      memoryBandwidthTBs: 8.0,
      tdpWatts: 1000,
      fp16Tflops: 1800,
      tf32Tflops: 900,
      fp64Tflops: 45,
      pciDeviceId: "2900",
      baseClockMHz: 1295,
      boostClockMHz: 2100,
      memoryClockMHz: 3200,
      smCount: 192,
      architecture: "gb100",
      computeCapability: "10.0",
      bar1MemoryMiB: 262144,
      sxmVersion: "SXM5",
    },
    nvlink: {
      version: "5.0",
      linksPerGpu: 18,
      perLinkBandwidthGBs: 50,
      totalBandwidthGBs: 1800,
      nvSwitchCount: 2,
      nvSwitchGeneration: "5th Gen",
      nvLinkLabel: "NV18",
    },
    network: {
      hcaModel: "ConnectX-7",
      hcaCount: 8,
      protocol: "NDR",
      portRateGbs: 400,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 50,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "8x 3.84TB NVMe",
      totalCapacityTB: 34.56,
    },
  },

  "DGX-GB200": {
    system: {
      type: "DGX-GB200",
      generation: "Blackwell Ultra",
      cpu: { model: "NVIDIA Grace", sockets: 2, coresPerSocket: 72 },
      systemMemoryGB: 1920,
      totalGpuMemoryGB: 1536,
    },
    gpu: {
      model: "NVIDIA GB200-SXM-192GB",
      count: 8,
      memoryGB: 192,
      memoryMiB: 196608,
      memoryType: "HBM3e",
      memoryBandwidthTBs: 8.0,
      tdpWatts: 1200,
      fp16Tflops: 2250,
      tf32Tflops: 1125,
      fp64Tflops: 56,
      pciDeviceId: "2950",
      baseClockMHz: 1380,
      boostClockMHz: 2250,
      memoryClockMHz: 3200,
      smCount: 192,
      architecture: "gb202",
      computeCapability: "10.0",
      bar1MemoryMiB: 262144,
      sxmVersion: "SXM5",
    },
    nvlink: {
      version: "5.0",
      linksPerGpu: 18,
      perLinkBandwidthGBs: 50,
      totalBandwidthGBs: 1800,
      nvSwitchCount: 2,
      nvSwitchGeneration: "5th Gen",
      nvLinkLabel: "NV18",
    },
    network: {
      hcaModel: "ConnectX-8",
      hcaCount: 8,
      protocol: "XDR",
      portRateGbs: 800,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 100,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "8x 3.84TB NVMe",
      totalCapacityTB: 34.56,
    },
  },

  "DGX-VR200": {
    system: {
      type: "DGX-VR200",
      generation: "Rubin",
      cpu: { model: "NVIDIA Vera (Olympus)", sockets: 1, coresPerSocket: 88 },
      systemMemoryGB: 1536,
      totalGpuMemoryGB: 2304,
    },
    gpu: {
      model: "NVIDIA R200-SXM-288GB",
      count: 8,
      memoryGB: 288,
      memoryMiB: 294912,
      memoryType: "HBM4",
      memoryBandwidthTBs: 22.0,
      tdpWatts: 1500,
      fp16Tflops: 1800,
      tf32Tflops: 900,
      fp64Tflops: 90,
      pciDeviceId: "2A00",
      baseClockMHz: 1200,
      boostClockMHz: 2100,
      memoryClockMHz: 6500,
      smCount: 256,
      architecture: "rubin",
      computeCapability: "11.0",
      bar1MemoryMiB: 524288,
      sxmVersion: "SXM6",
    },
    nvlink: {
      version: "6.0",
      linksPerGpu: 18,
      perLinkBandwidthGBs: 200,
      totalBandwidthGBs: 3600,
      nvSwitchCount: 2,
      nvSwitchGeneration: "6th Gen",
      nvLinkLabel: "NV18",
    },
    network: {
      hcaModel: "ConnectX-9",
      hcaCount: 8,
      protocol: "XDR2",
      portRateGbs: 1600,
      hcasPerGpu: 1,
      interNodeBandwidthGBs: 200,
    },
    storage: {
      osDrives: "2x 1.92TB NVMe",
      dataDrives: "8x 3.84TB NVMe",
      totalCapacityTB: 34.56,
    },
  },
};

export const ALL_SYSTEM_TYPES: SystemType[] = [
  "DGX-A100",
  "DGX-H100",
  "DGX-H200",
  "DGX-B200",
  "DGX-GB200",
  "DGX-VR200",
];

/**
 * Get hardware specs for a given system type.
 * Defaults to DGX-A100 if the type is not recognized.
 */
export function getHardwareSpecs(systemType: string): HardwareSpec {
  if (systemType in HARDWARE_SPECS) {
    return HARDWARE_SPECS[systemType as SystemType];
  }
  return HARDWARE_SPECS["DGX-A100"];
}

/**
 * Get a short display name for a system type.
 */
export function getSystemDisplayName(systemType: SystemType): string {
  switch (systemType) {
    case "DGX-A100":
      return "DGX A100";
    case "DGX-H100":
      return "DGX H100";
    case "DGX-H200":
      return "DGX H200";
    case "DGX-B200":
      return "DGX B200";
    case "DGX-GB200":
      return "DGX GB200";
    case "DGX-VR200":
      return "DGX VR200";
    default:
      return systemType;
  }
}

/**
 * Get the generation name for a system type.
 */
export function getGenerationName(systemType: SystemType): string {
  return HARDWARE_SPECS[systemType].system.generation;
}
