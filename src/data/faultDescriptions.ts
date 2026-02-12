/**
 * Fault Descriptions — Educational metadata for the Fault Injection Training System
 *
 * Provides explanations of what each fault does, why it matters for the NCP-AII exam,
 * what Dashboard indicators to look for, and which terminal commands to run.
 */

export interface FaultDescription {
  type: string;
  title: string;
  whatHappens: string;
  whyItMatters: string;
  dashboardIndicators: string[];
  suggestedCommands: string[];
  relatedXIDCodes?: number[];
}

export interface ComplexScenarioDescription {
  type: string;
  title: string;
  whatHappens: string;
  whyItMatters: string;
  dashboardIndicators: string[];
  suggestedCommands: string[];
  relatedXIDCodes?: number[];
}

export interface WorkloadDescription {
  pattern: string;
  title: string;
  description: string;
  dashboardChanges: string[];
}

// ============================================================================
// BASIC FAULT DESCRIPTIONS
// ============================================================================

export const BASIC_FAULT_DESCRIPTIONS: FaultDescription[] = [
  {
    type: "xid",
    title: "XID Error (Double-Bit ECC)",
    whatHappens: "Injects XID 48 (double-bit ECC error). GPU marked Critical.",
    whyItMatters:
      "XID errors are the primary GPU fault reporting mechanism. Knowing how to read XID codes from dmesg and nvidia-smi is essential for NCP-AII troubleshooting questions.",
    dashboardIndicators: [
      "Red 'Critical' health badge on GPU card",
      "Red XID error box showing '\u26A0 1 XID Error(s)'",
      "Cluster health alert expands with affected GPU",
    ],
    suggestedCommands: [
      "nvidia-smi",
      "nvidia-smi -q -d ECC",
      "dmesg | grep -i xid",
    ],
    relatedXIDCodes: [48],
  },
  {
    type: "ecc",
    title: "ECC Memory Error",
    whatHappens:
      "Adds uncorrectable double-bit ECC error to GPU memory counters. GPU marked Critical.",
    whyItMatters:
      "ECC errors indicate GPU memory degradation. The exam tests whether you can distinguish correctable (single-bit) from uncorrectable (double-bit) errors and know when replacement is needed.",
    dashboardIndicators: [
      "Red 'Critical' health badge on GPU card",
      "ECC error counters increase in GPU details",
      "Memory health indicator turns red",
    ],
    suggestedCommands: [
      "nvidia-smi -q -d ECC",
      "nvidia-smi -q -d MEMORY",
      "dcgmi diag -r 3",
    ],
    relatedXIDCodes: [],
  },
  {
    type: "thermal",
    title: "Thermal Throttling",
    whatHappens:
      "Raises GPU temperature to 85\u00B0C. SM clocks throttled. GPU marked Warning.",
    whyItMatters:
      "Thermal management is critical in DGX systems. The exam covers how to identify thermal throttling, check cooling systems, and understand the relationship between temperature, power, and clock speeds.",
    dashboardIndicators: [
      "Yellow 'Warning' health badge",
      "Temperature display turns red with \u2715 symbol at ~85\u00B0C",
      "Power draw increases with temperature",
    ],
    suggestedCommands: [
      "nvidia-smi -q -d TEMPERATURE",
      "nvidia-smi -q -d CLOCK",
      "ipmitool sensor list",
    ],
    relatedXIDCodes: [],
  },
  {
    type: "nvlink",
    title: "NVLink Failure",
    whatHappens:
      "Sets NVLink 0 to Down with 100 TX errors. GPU marked Warning.",
    whyItMatters:
      "NVLink is the high-bandwidth GPU interconnect in DGX systems. Link failures degrade multi-GPU training performance. The exam tests NVLink topology understanding and error diagnosis.",
    dashboardIndicators: [
      "Yellow 'Warning' health badge on GPU card",
      "NVLink status shows 'Down' for affected link",
      "NVLink error counters increase in topology view",
    ],
    suggestedCommands: [
      "nvidia-smi nvlink -s",
      "nvidia-smi nvlink -e",
      "nvidia-smi topo -m",
    ],
    relatedXIDCodes: [74],
  },
  {
    type: "power",
    title: "Power Limit Exceeded",
    whatHappens: "Sets power draw to 95% of TDP limit. GPU marked Warning.",
    whyItMatters:
      "Power management affects GPU performance and system stability. The exam covers power capping, TDP limits, and how to interpret power-related warnings in datacenter environments.",
    dashboardIndicators: [
      "Yellow 'Warning' health badge",
      "Power draw bar nearly full (~95% of limit)",
      "Temperature may increase due to high power draw",
    ],
    suggestedCommands: [
      "nvidia-smi -q -d POWER",
      "nvidia-smi",
      "ipmitool sensor list",
    ],
    relatedXIDCodes: [],
  },
  {
    type: "pcie",
    title: "PCIe Bus Error",
    whatHappens: "Injects XID 62 (PCIe internal error). GPU marked Critical.",
    whyItMatters:
      "PCIe errors can indicate physical connectivity problems, riser card issues, or motherboard faults. The exam tests your ability to distinguish GPU faults from bus-level communication failures.",
    dashboardIndicators: [
      "Red 'Critical' health badge on GPU card",
      "XID error indicator shows PCIe-related error",
      "GPU may show degraded throughput",
    ],
    suggestedCommands: ["nvidia-smi", "dmesg | grep -i xid", "lspci -vv"],
    relatedXIDCodes: [62],
  },
];

// ============================================================================
// COMPLEX SCENARIO DESCRIPTIONS
// ============================================================================

export const COMPLEX_SCENARIO_DESCRIPTIONS: ComplexScenarioDescription[] = [
  {
    type: "gpu-hang",
    title: "GPU Hang (XID 43)",
    whatHappens:
      "GPU stops responding \u2014 utilization drops to 0% despite workload. XID 43 logged.",
    whyItMatters:
      "GPU hangs are one of the most common datacenter issues. The exam tests whether you can differentiate a hung GPU from an idle one and know the correct recovery procedure (gpu-reset vs node reboot).",
    dashboardIndicators: [
      "Red 'Critical' health badge",
      "GPU utilization drops to 0%",
      "XID 43 error logged",
    ],
    suggestedCommands: [
      "nvidia-smi",
      "nvidia-smi --gpu-reset",
      "dmesg | grep -i xid",
    ],
    relatedXIDCodes: [43],
  },
  {
    type: "bus-reset",
    title: "Bus Reset (XID 79)",
    whatHappens:
      "GPU falls off PCIe bus entirely. XID 79 logged. Cannot be GPU-reset.",
    whyItMatters:
      "A GPU falling off the bus is a severe hardware event. The exam tests whether you know that nvidia-smi --gpu-reset will NOT work in this case and a node reboot or hardware inspection is required.",
    dashboardIndicators: [
      "Red 'Critical' health badge",
      "GPU becomes unresponsive to queries",
      "XID 79 error in system logs",
    ],
    suggestedCommands: [
      "dmesg | grep -i nvidia",
      "ipmitool sel list",
      "ipmitool sensor list",
    ],
    relatedXIDCodes: [79],
  },
  {
    type: "thermal-alert",
    title: "Thermal Alert",
    whatHappens:
      "ALL GPUs on the node overheat to 90\u2013100\u00B0C simultaneously.",
    whyItMatters:
      "System-wide thermal events indicate cooling infrastructure failure (fan, airflow, or coolant). The exam covers how to use IPMI/BMC tools to check environmental sensors and identify root cause.",
    dashboardIndicators: [
      "Yellow 'Warning' badges on ALL GPU cards",
      "All temperature readings turn red (90\u2013100\u00B0C)",
      "Power draw increases across all GPUs",
    ],
    suggestedCommands: [
      "nvidia-smi -q -d TEMPERATURE",
      "ipmitool sensor list",
      "ipmitool sel list",
    ],
    relatedXIDCodes: [],
  },
  {
    type: "severe-ecc",
    title: "Severe ECC (XID 63)",
    whatHappens:
      "1500 single-bit + 50 double-bit errors. Row remapping failed. GPU replacement needed.",
    whyItMatters:
      "Severe ECC errors with row remapping failure mean the GPU has exhausted its self-healing capacity. The exam tests whether you recognize this as a hardware replacement scenario vs a software fix.",
    dashboardIndicators: [
      "Red 'Critical' health badge",
      "Very high ECC error counts in GPU details",
      "XID 63 (Row Remapping Failure) logged",
    ],
    suggestedCommands: [
      "nvidia-smi -q -d ECC",
      "nvidia-smi -q -d ROW_REMAPPER",
      "dcgmi diag -r 3",
    ],
    relatedXIDCodes: [63],
  },
];

// ============================================================================
// WORKLOAD DESCRIPTIONS
// ============================================================================

export const WORKLOAD_DESCRIPTIONS: WorkloadDescription[] = [
  {
    pattern: "idle",
    title: "Idle Workload",
    description:
      "No active compute jobs. Low utilization, minimal memory (~50\u2013200 MB), low power (~15% TDP), temperature near ambient.",
    dashboardChanges: [
      "GPU utilization near 0\u20135%",
      "Memory usage minimal (~50\u2013200 MB)",
      "Power draw at ~15% of TDP",
      "Temperature near ambient (45\u201355\u00B0C)",
    ],
  },
  {
    pattern: "inference",
    title: "Inference Workload",
    description:
      "Model serving or batch inference. ~60% utilization, moderate memory, moderate power and temperature.",
    dashboardChanges: [
      "GPU utilization around 50\u201370%",
      "Moderate memory usage for model weights",
      "Power draw at ~50\u201365% of TDP",
      "Temperature elevated but within range (60\u201370\u00B0C)",
    ],
  },
  {
    pattern: "training",
    title: "Training Workload",
    description:
      "Deep learning training run. ~95% utilization, high memory, near-max power, elevated temperature.",
    dashboardChanges: [
      "GPU utilization at 90\u201398%",
      "High memory usage for model + gradients + optimizer",
      "Power draw at ~85\u201395% of TDP",
      "Temperature elevated (70\u201380\u00B0C)",
    ],
  },
  {
    pattern: "stress",
    title: "Stress Test",
    description:
      "GPU burn or stress test. 100% utilization, maximum power draw, highest temperature.",
    dashboardChanges: [
      "GPU utilization at 100%",
      "Maximum power draw (at or near TDP limit)",
      "Highest temperature (75\u201385\u00B0C)",
      "All compute resources fully utilized",
    ],
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

export function getBasicFaultDescription(
  type: string,
): FaultDescription | undefined {
  return BASIC_FAULT_DESCRIPTIONS.find((d) => d.type === type);
}

export function getComplexScenarioDescription(
  type: string,
): ComplexScenarioDescription | undefined {
  return COMPLEX_SCENARIO_DESCRIPTIONS.find((d) => d.type === type);
}

export function getWorkloadDescription(
  pattern: string,
): WorkloadDescription | undefined {
  return WORKLOAD_DESCRIPTIONS.find((d) => d.pattern === pattern);
}
