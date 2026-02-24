/**
 * Consequence rules map user commands to consequences given current cluster state.
 *
 * Each rule defines:
 * - A command pattern (tool + optional flag patterns)
 * - A condition function that checks whether the node state makes this command dangerous
 * - A consequence descriptor with type, description, and mutations to apply
 */

export interface ConsequenceMutation {
  action: string;
  target: string;
  params: Record<string, unknown>;
}

export interface ConsequenceResult {
  type: string;
  description: string;
  mutations: ConsequenceMutation[];
}

export interface ConsequenceRule {
  /** Human-readable rule ID */
  id: string;
  /** The base command tool name to match (e.g., "nvidia-smi", "ipmitool") */
  tool: string;
  /** Regex pattern to match against the full command string */
  commandPattern: RegExp;
  /** Check whether the node state makes this command dangerous */
  condition: (node: NodeConditionInput) => boolean;
  /** The consequence to return when matched and condition is true */
  consequence: ConsequenceResult;
}

/**
 * Minimal node state shape needed for condition evaluation.
 * This avoids importing the full DGXNode type into the rules file.
 */
export interface NodeConditionInput {
  slurmState: string;
  healthStatus: string;
  gpus: Array<{
    id: number;
    migMode: boolean;
    migInstances: Array<{ id: number }>;
    allocatedJobId?: number;
    utilization: number;
  }>;
}

export const CONSEQUENCE_RULES: ConsequenceRule[] = [
  // Rule 1: GPU reset when MIG instances are active
  {
    id: "gpu-reset-with-mig",
    tool: "nvidia-smi",
    commandPattern: /nvidia-smi\s+.*-r/,
    condition: (node) => {
      // Parse GPU index from command later; here we check if any GPU has MIG active
      return node.gpus.some((g) => g.migMode && g.migInstances.length > 0);
    },
    consequence: {
      type: "mig-destroyed",
      description:
        "GPU reset destroyed active MIG instances. Any workloads running on MIG partitions have been terminated.",
      mutations: [
        {
          action: "clear-mig-instances",
          target: "gpu",
          params: {},
        },
        {
          action: "set-mig-mode",
          target: "gpu",
          params: { enabled: false },
        },
      ],
    },
  },

  // Rule 2: Power cycle when Slurm jobs are running
  {
    id: "power-cycle-with-jobs",
    tool: "ipmitool",
    commandPattern: /ipmitool\s+power\s+(cycle|off|reset)/,
    condition: (node) => {
      return (
        node.slurmState === "alloc" &&
        node.gpus.some((g) => g.allocatedJobId !== undefined)
      );
    },
    consequence: {
      type: "jobs-killed",
      description:
        "Power cycle killed all running Slurm jobs on this node. Users will receive job failure notifications.",
      mutations: [
        {
          action: "kill-all-jobs",
          target: "node",
          params: {},
        },
        {
          action: "set-slurm-state",
          target: "node",
          params: { state: "down", reason: "Power cycled by administrator" },
        },
      ],
    },
  },

  // Rule 3: Resuming a drained node with unfixed hardware fault
  {
    id: "resume-with-fault",
    tool: "scontrol",
    commandPattern: /scontrol\s+update\s+.*State=RESUME/i,
    condition: (node) => {
      return (
        node.slurmState === "drain" &&
        (node.healthStatus === "Critical" || node.healthStatus === "Warning")
      );
    },
    consequence: {
      type: "re-drain",
      description:
        "Node was resumed with unresolved hardware fault. Slurm health check will re-drain it within seconds.",
      mutations: [
        {
          action: "set-slurm-state",
          target: "node",
          params: {
            state: "drain",
            reason: "Health check failed — hardware fault unresolved",
          },
        },
      ],
    },
  },

  // Rule 4: Level-3 diagnostic on node with production load
  {
    id: "diag-evicts-jobs",
    tool: "dcgmi",
    commandPattern: /dcgmi\s+diag\s+-r\s+[3-5]/,
    condition: (node) => {
      return (
        node.slurmState === "alloc" &&
        node.gpus.some((g) => g.allocatedJobId !== undefined)
      );
    },
    consequence: {
      type: "diagnostic-evicts-jobs",
      description:
        "Level-3 DCGM diagnostic requires exclusive GPU access. All running jobs on this node have been evicted.",
      mutations: [
        {
          action: "kill-all-jobs",
          target: "node",
          params: {},
        },
        {
          action: "set-slurm-state",
          target: "node",
          params: { state: "drain", reason: "DCGM diagnostic in progress" },
        },
      ],
    },
  },
];

/**
 * Regex patterns for commands that are always safe (read-only diagnostics).
 * Each string is anchored at `^` by the ConsequenceEngine before matching.
 * If a command matches any pattern and doesn't match a dangerous rule,
 * it returns null.
 */
export const SAFE_COMMAND_PATTERNS: string[] = [
  "nvidia-smi$", // bare nvidia-smi (no flags) is safe
  "nvidia-smi\\s+-q", // query mode
  "nvidia-smi\\s+-L", // list GPUs
  "nvidia-smi\\s+topo", // topology
  "nvidia-smi\\s+nvlink", // nvlink status
  "sinfo",
  "squeue",
  "sacct",
  "dmesg",
  "ibstat",
  "ibstatus",
  "iblinkinfo",
  "perfquery",
  "cat\\s+",
  "grep\\s+",
  "tail\\s+",
  "head\\s+",
  "sensors",
  "dmidecode",
  "lspci",
  "lsblk",
  "free",
  "top",
  "htop",
  "nvtop",
  "nvsm\\s+show",
  "dcgmi\\s+discovery",
  "dcgmi\\s+diag\\s+-r\\s+[12]", // Level 1-2 diagnostics are safe
  "dcgmi\\s+stats",
  "dcgmi\\s+health",
  "dcgmi\\s+topo",
];
