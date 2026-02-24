export interface PropagationRule {
  trigger: string;
  consequences: Array<{
    delayMs: number;
    action: string;
    target: "same-gpu" | "nvlink-peers" | "same-node" | "slurm";
    params: Record<string, unknown>;
    description: string;
  }>;
}

export const FAULT_PROPAGATION_RULES: PropagationRule[] = [
  {
    trigger: "xid-43",
    consequences: [
      {
        delayMs: 5000,
        action: "nvlink-degrade",
        target: "nvlink-peers",
        params: { xidCode: 74 },
        description: "NVLink peers detect link degradation",
      },
      {
        delayMs: 10000,
        action: "slurm-job-fail",
        target: "slurm",
        params: {},
        description: "Slurm job on affected GPU times out",
      },
      {
        delayMs: 15000,
        action: "slurm-drain",
        target: "same-node",
        params: { reason: "GPU not responding" },
        description: "Slurm drains the node",
      },
    ],
  },
  {
    trigger: "xid-48",
    consequences: [
      {
        delayMs: 2000,
        action: "gpu-health-critical",
        target: "same-gpu",
        params: {},
        description: "GPU health marked critical",
      },
      {
        delayMs: 8000,
        action: "slurm-job-fail",
        target: "slurm",
        params: {},
        description: "Running job on GPU fails",
      },
      {
        delayMs: 12000,
        action: "slurm-drain",
        target: "same-node",
        params: { reason: "Uncorrectable ECC error" },
        description: "Node drained due to ECC failure",
      },
    ],
  },
  {
    trigger: "xid-79",
    consequences: [
      {
        delayMs: 1000,
        action: "nvlink-down-all",
        target: "same-gpu",
        params: {},
        description: "All NVLinks on GPU go down (bus reset)",
      },
      {
        delayMs: 3000,
        action: "slurm-job-fail",
        target: "slurm",
        params: {},
        description: "All jobs on node fail",
      },
      {
        delayMs: 5000,
        action: "slurm-drain",
        target: "same-node",
        params: { reason: "GPU fallen off bus" },
        description: "Node drained — GPU unreachable",
      },
    ],
  },
  {
    trigger: "thermal-runaway",
    consequences: [
      {
        delayMs: 10000,
        action: "clock-throttle-all",
        target: "same-node",
        params: {},
        description: "All GPUs throttle clocks",
      },
      {
        delayMs: 20000,
        action: "utilization-drop",
        target: "same-node",
        params: {},
        description: "Job throughput drops due to throttling",
      },
      {
        delayMs: 45000,
        action: "xid-43-hottest",
        target: "same-node",
        params: {},
        description: "Hottest GPU hangs (XID 43)",
      },
    ],
  },
  {
    trigger: "nvlink-failure",
    consequences: [
      {
        delayMs: 5000,
        action: "bandwidth-degrade",
        target: "nvlink-peers",
        params: {},
        description: "Multi-GPU job bandwidth drops",
      },
      {
        delayMs: 15000,
        action: "slurm-job-slow",
        target: "slurm",
        params: {},
        description: "Training job progress stalls",
      },
    ],
  },
  {
    trigger: "power-anomaly",
    consequences: [
      {
        delayMs: 5000,
        action: "power-cap-reduce",
        target: "same-node",
        params: {},
        description: "Firmware reduces GPU power caps to protect PSU",
      },
      {
        delayMs: 15000,
        action: "clock-throttle-all",
        target: "same-node",
        params: {},
        description: "All GPUs throttle clocks under reduced power budget",
      },
      {
        delayMs: 30000,
        action: "utilization-drop",
        target: "same-node",
        params: {},
        description: "Training throughput drops from power-induced throttling",
      },
    ],
  },
  {
    trigger: "ecc-accumulation",
    consequences: [
      {
        delayMs: 30000,
        action: "row-remap",
        target: "same-gpu",
        params: { xidCode: 92 },
        description: "Row remapping triggered (XID 92)",
      },
      {
        delayMs: 60000,
        action: "xid-63",
        target: "same-gpu",
        params: {},
        description: "Row remapping exhausted (XID 63)",
      },
    ],
  },
];
