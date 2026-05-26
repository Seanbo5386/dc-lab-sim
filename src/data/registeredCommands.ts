// Registered terminal commands. Keep in sync with router.register() calls in src/components/Terminal.tsx.
export const TERMINAL_COMMANDS = new Set<string>([
  // Built-in shell commands
  "help",
  "practice",
  "ssh",
  "hint",
  "clear",

  // NVIDIA GPU monitoring
  "nvidia-smi",
  "dcgmi",
  "ipmitool",
  "nvsm",
  "cmsh",

  // InfiniBand tools
  "ibstat",
  "ibportstate",
  "ibporterrors",
  "iblinkinfo",
  "perfquery",
  "ibdiagnet",
  "ibdev2netdev",
  "ibnetdiscover",
  "ibhosts",
  "ibswitches",
  "ibcableerrors",
  "ibping",
  "ibtracert",
  "ib_write_bw",
  "ib_read_bw",
  "sminfo",
  "smpquery",
  "ofed_info",

  // Slurm cluster tools
  "sinfo",
  "squeue",
  "scontrol",
  "sbatch",
  "srun",
  "scancel",
  "sacct",
  "sacctmgr",

  // Container tools
  "docker",
  "ngc",
  "enroot",
  "nvidia-container-cli",

  // Mellanox tools
  "mst",
  "mlxconfig",
  "mlxlink",
  "mlxcables",
  "mlxup",
  "mlxfwmanager",

  // BCM tools
  "bcm",
  "bcm-node",
  "crm",

  // Basic system / Linux commands
  "lscpu",
  "free",
  "dmidecode",
  "dmesg",
  "systemctl",
  "hostnamectl",
  "timedatectl",
  "lsmod",
  "modinfo",
  "top",
  "ps",
  "numactl",
  "uptime",
  "uname",
  "hostname",
  "sensors",

  // PCI / journalctl
  "lspci",
  "journalctl",

  // Other simulators
  "nvlink-audit",
  "nv-fabricmanager",
  "nvidia-bug-report.sh",
  "hpl",
  "nccl-test",
  "gpu-burn",
  "all_reduce_perf",
  "mpirun",

  // Storage
  "df",
  "mount",
  "lfs",

  // Cluster / NeMo
  "clusterkit",
  "nemo",

  // Shell builtins
  "cd",
  "export",

  // Linux utilities (LinuxUtilsSimulator)
  "cat",
  "pwd",
  "ls",
  "head",
  "tail",
  "echo",
  "wc",
  "grep",
  "ip",
  "env",
  "dpkg",
  "apt",
  "nvcc",
  "iostat",
  "efibootmgr",
  "nfsstat",
  "ldconfig",
  "taskset",

  // Shell builtins registered directly in Terminal.tsx
  "chmod",
  "chown",
  "cp",
  "id",
  "mkdir",
  "mv",
  "rm",
  "sleep",
  "touch",
  "which",
  "whoami",
]);
