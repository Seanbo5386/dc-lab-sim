/**
 * Enhanced Command Metadata System
 * Provides detailed information about commands for help, suggestions, and learning
 */

export interface CommandFlag {
  flag: string;
  description: string;
  example?: string;
}

export interface CommandExample {
  command: string;
  description: string;
  output?: string;
}

export interface CommandMetadata {
  name: string;
  aliases?: string[];
  category: CommandCategory;
  shortDescription: string;
  longDescription: string;

  // Usage information
  syntax: string;
  commonFlags?: CommandFlag[];
  examples: CommandExample[];

  // Learning aids
  whenToUse: string;
  relatedCommands?: string[];
  commonMistakes?: string[];

  // Context
  difficulty: "beginner" | "intermediate" | "advanced";
  domains?: string[]; // Which exam domains this relates to
}

export type CommandCategory =
  | "gpu-management"
  | "system-info"
  | "networking"
  | "storage"
  | "cluster-management"
  | "containers"
  | "diagnostics"
  | "firmware"
  | "general";

export const COMMAND_METADATA: Record<string, CommandMetadata> = {
  "nvidia-smi": {
    name: "nvidia-smi",
    category: "gpu-management",
    shortDescription:
      "NVIDIA System Management Interface - GPU monitoring and management",
    longDescription:
      "nvidia-smi (NVIDIA System Management Interface) is the primary tool for querying GPU status, configuration, and metrics. It provides real-time information about GPU utilization, memory usage, temperature, power draw, and running processes.",
    syntax: "nvidia-smi [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain1", "domain4", "domain5"],

    commonFlags: [
      {
        flag: "-L",
        description: "List all GPUs with UUIDs",
        example: "nvidia-smi -L",
      },
      {
        flag: "-q",
        description: "Query detailed GPU information",
        example: "nvidia-smi -q",
      },
      {
        flag: "-i <id>",
        description: "Query specific GPU by index",
        example: "nvidia-smi -i 0",
      },
      {
        flag: "-l <sec>",
        description: "Continuously update every N seconds",
        example: "nvidia-smi -l 1",
      },
      {
        flag: "--query-gpu=<field>",
        description: "Query specific GPU fields",
        example: "nvidia-smi --query-gpu=name,temperature.gpu --format=csv",
      },
    ],

    examples: [
      {
        command: "nvidia-smi",
        description:
          "Display overview of all GPUs with utilization, memory, and processes",
      },
      {
        command: "nvidia-smi -L",
        description: "List all GPUs with their UUIDs and model names",
      },
      {
        command: "nvidia-smi -q -i 0",
        description: "Show detailed information for GPU 0",
      },
      {
        command: "nvidia-smi -q -d TEMPERATURE",
        description: "Show detailed temperature information for all GPUs",
      },
      {
        command:
          "nvidia-smi --query-gpu=timestamp,name,utilization.gpu,memory.used --format=csv -l 1",
        description:
          "Monitor GPU utilization and memory usage in CSV format, updating every second",
      },
    ],

    whenToUse:
      "Use nvidia-smi for quick GPU health checks, monitoring GPU utilization during workload execution, checking for GPU errors, and verifying GPU driver installation.",

    relatedCommands: ["dcgmi", "nvsm", "lspci"],

    commonMistakes: [
      "Forgetting that GPU indices start at 0, not 1",
      "Not using -q for detailed diagnostics - the default output is just a summary",
      "Using nvidia-smi in scripts without --query-gpu for parseable output",
    ],
  },

  dcgmi: {
    name: "dcgmi",
    category: "gpu-management",
    shortDescription:
      "Data Center GPU Manager Interface - Enterprise GPU management",
    longDescription:
      "DCGM (Data Center GPU Manager) is NVIDIA's enterprise-grade GPU management and monitoring tool. It provides health checking, diagnostics, telemetry, and policy management for GPU clusters. DCGM is designed for data center environments with features like group management and comprehensive diagnostics.",
    syntax: "dcgmi <subcommand> [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4", "domain5"],

    commonFlags: [
      {
        flag: "discovery -l",
        description: "List all GPUs in the system",
        example: "dcgmi discovery -l",
      },
      {
        flag: "health -g <group> -c",
        description: "Check health of GPU group",
        example: "dcgmi health -g 0 -c",
      },
      {
        flag: "diag -r <level> -g <group>",
        description: "Run diagnostics (levels 1-4)",
        example: "dcgmi diag -r 2 -g 0",
      },
      {
        flag: "dmon -g <group>",
        description: "Monitor GPU metrics in real-time",
        example: "dcgmi dmon -g 0",
      },
    ],

    examples: [
      {
        command: "dcgmi discovery -l",
        description: "Discover and list all GPUs with their device information",
      },
      {
        command: "dcgmi health -g 0 -c",
        description:
          "Perform health check on all GPUs in group 0 (default: all GPUs)",
      },
      {
        command: "dcgmi diag -r 1 -g 0",
        description: "Run level 1 diagnostic (quick test) on GPU group 0",
      },
      {
        command: "dcgmi diag -r 3 -g 0",
        description:
          "Run level 3 diagnostic (stress test) - this takes several minutes",
      },
      {
        command: "dcgmi dmon -e 155,156 -g 0",
        description:
          "Monitor power usage (field 155) and temperature (field 156)",
      },
    ],

    whenToUse:
      "Use dcgmi for comprehensive health checks before and after maintenance, running diagnostics to detect hardware issues, and monitoring GPU metrics in production environments. DCGM is the recommended tool for data center GPU validation.",

    relatedCommands: ["nvidia-smi", "nvsm"],

    commonMistakes: [
      "Forgetting both -r and -g flags for diag command - both are required",
      "Not waiting for level 3 diagnostics to complete - they can take 10+ minutes",
      "Running diagnostics on GPUs with active workloads - stop jobs first",
      "Confusing health check (-c) with diag (-r) - they serve different purposes",
    ],
  },

  ipmitool: {
    name: "ipmitool",
    category: "diagnostics",
    shortDescription:
      "Intelligent Platform Management Interface tool - BMC management",
    longDescription:
      "ipmitool is used to interact with the Baseboard Management Controller (BMC) using the IPMI protocol. It provides access to hardware sensors, system event logs, power control, and firmware information. Essential for out-of-band management and hardware troubleshooting.",
    syntax: "ipmitool <command> [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain1", "domain5"],

    commonFlags: [
      {
        flag: "sel list",
        description: "List System Event Log entries",
        example: "ipmitool sel list",
      },
      {
        flag: "sel elist",
        description: "Extended SEL list with descriptions",
        example: "ipmitool sel elist",
      },
      {
        flag: "sel clear",
        description: "Clear the System Event Log",
        example: "ipmitool sel clear",
      },
      {
        flag: "fru print 0",
        description: "Print Field Replaceable Unit info",
        example: "ipmitool fru print 0",
      },
      {
        flag: "sensor list",
        description: "List all sensors and readings",
        example: "ipmitool sensor list",
      },
      {
        flag: "mc info",
        description: "Display BMC information",
        example: "ipmitool mc info",
      },
    ],

    examples: [
      {
        command: "ipmitool sel list",
        description:
          "View system event log for POST errors and hardware events",
      },
      {
        command: "ipmitool fru print 0",
        description:
          "Display FRU information including BIOS version and serial numbers",
      },
      {
        command: "ipmitool sensor list | grep -i temp",
        description: "Show all temperature sensors and their current readings",
      },
      {
        command: "ipmitool mc info",
        description: "Display BMC firmware version and device information",
      },
      {
        command: "ipmitool sel elist | grep -i error",
        description: "Filter SEL for error entries",
      },
    ],

    whenToUse:
      "Use ipmitool to check POST errors after boot, verify BIOS versions, monitor hardware sensors, investigate hardware failures, and access BMC functionality for out-of-band management.",

    relatedCommands: ["dmidecode", "dmesg", "lshw"],

    commonMistakes: [
      "Not checking SEL logs after system issues - valuable diagnostic information",
      "Forgetting to clear SEL after addressing issues - makes future debugging harder",
      'Confusing "mc info" (BMC info) with "fru print" (hardware info)',
    ],
  },

  lscpu: {
    name: "lscpu",
    category: "system-info",
    shortDescription: "Display CPU architecture information",
    longDescription:
      "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo. It displays information about the CPU architecture, CPU op-mode(s), byte order, number of CPUs, threads per core, cores per socket, sockets, NUMA nodes, and CPU caches.",
    syntax: "lscpu [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain1"],

    examples: [
      {
        command: "lscpu",
        description: "Display complete CPU architecture information",
      },
      {
        command: 'lscpu | grep -i "model name"',
        description: "Show CPU model name",
      },
      {
        command: "lscpu | grep -i numa",
        description: "Display NUMA topology information",
      },
    ],

    whenToUse:
      "Use lscpu to verify CPU configuration during POST verification, check NUMA topology for optimal GPU affinity, and document system specifications.",

    relatedCommands: ["free", "dmidecode", "numactl"],

    commonMistakes: [
      "Not considering NUMA topology when diagnosing performance issues",
    ],
  },

  lspci: {
    name: "lspci",
    aliases: ["lspci -tv", "lspci -vv"],
    category: "system-info",
    shortDescription: "List all PCI devices",
    longDescription:
      "lspci lists all PCI devices detected by the system. It shows GPUs, network cards, storage controllers, and other PCIe devices. Essential for verifying hardware enumeration and troubleshooting PCIe issues.",
    syntax: "lspci [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain1", "domain5"],

    commonFlags: [
      { flag: "-v", description: "Verbose output", example: "lspci -v" },
      {
        flag: "-vv",
        description: "Very verbose output with detailed info",
        example: "lspci -vv",
      },
      {
        flag: "-tv",
        description: "Tree view showing PCIe topology",
        example: "lspci -tv",
      },
      {
        flag: "-d <vendor:device>",
        description: "Show only devices matching vendor:device ID",
        example: "lspci -d 10de:",
      },
      {
        flag: "-s <slot>",
        description: "Show only device at specific slot",
        example: "lspci -s 17:00.0",
      },
    ],

    examples: [
      {
        command: "lspci",
        description: "List all PCI devices in simple format",
      },
      {
        command: "lspci -tv",
        description:
          "Show PCIe topology as a tree - useful for understanding GPU placement",
      },
      {
        command: "lspci | grep -i nvidia",
        description: "List all NVIDIA devices (GPUs)",
      },
      {
        command: "lspci -vv -s 17:00.0",
        description:
          "Show detailed information for device at PCIe slot 17:00.0",
      },
      {
        command: "lspci -d 10de:",
        description: "Show all NVIDIA devices (vendor ID 10de)",
      },
    ],

    whenToUse:
      "Use lspci to verify GPU detection after boot, check PCIe link speeds and widths, troubleshoot missing devices, and understand system PCIe topology.",

    relatedCommands: ["nvidia-smi", "dmesg", "lshw"],

    commonMistakes: [
      "Not using -vv when troubleshooting - the detailed output shows link speed/width",
      "Forgetting that lspci shows physical devices only - use nvidia-smi for GPU status",
      "Not checking PCIe link negotiation speed - GPUs may run at reduced speeds",
    ],
  },

  dmesg: {
    name: "dmesg",
    category: "diagnostics",
    shortDescription: "Display kernel ring buffer messages",
    longDescription:
      "dmesg prints the kernel ring buffer, which contains messages from the kernel during boot and runtime. Essential for diagnosing hardware initialization issues, driver loading problems, and system errors.",
    syntax: "dmesg [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain1", "domain5"],

    commonFlags: [
      {
        flag: "-T",
        description: "Human-readable timestamps",
        example: "dmesg -T",
      },
      {
        flag: "-l <level>",
        description: "Filter by log level",
        example: "dmesg -l err",
      },
      {
        flag: "--follow",
        description: "Wait for new messages",
        example: "dmesg --follow",
      },
    ],

    examples: [
      {
        command: "dmesg",
        description: "Display all kernel messages",
      },
      {
        command: "dmesg | grep -i error",
        description: "Filter for error messages",
      },
      {
        command: "dmesg | grep -i nvidia",
        description: "Show NVIDIA driver loading messages",
      },
      {
        command: "dmesg -T | tail -50",
        description: "Show last 50 messages with human-readable timestamps",
      },
      {
        command: 'dmesg | grep -i "xid\\|pci"',
        description: "Look for XID errors or PCIe issues",
      },
    ],

    whenToUse:
      "Use dmesg to diagnose boot failures, check for hardware errors, verify driver loading, investigate XID errors, and troubleshoot system hangs or crashes.",

    relatedCommands: ["journalctl", "nvidia-smi", "ipmitool sel list"],

    commonMistakes: [
      "Not filtering output - dmesg can be thousands of lines",
      "Forgetting to check timestamps - old errors may not be relevant",
      "Ignoring XID errors in dmesg - these indicate GPU hardware problems",
    ],
  },

  free: {
    name: "free",
    aliases: ["free -h"],
    category: "system-info",
    shortDescription: "Display memory usage",
    longDescription:
      "free displays the total amount of free and used physical and swap memory in the system. With the -h flag, it shows human-readable output in GB/MB.",
    syntax: "free [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain1"],

    commonFlags: [
      {
        flag: "-h",
        description: "Human-readable output (KB, MB, GB)",
        example: "free -h",
      },
      {
        flag: "-m",
        description: "Show output in megabytes",
        example: "free -m",
      },
      {
        flag: "-g",
        description: "Show output in gigabytes",
        example: "free -g",
      },
      {
        flag: "-s <sec>",
        description: "Update every N seconds",
        example: "free -h -s 1",
      },
    ],

    examples: [
      {
        command: "free -h",
        description: "Show memory usage in human-readable format",
      },
      {
        command: "free -h -s 1",
        description: "Monitor memory usage, updating every second",
      },
    ],

    whenToUse:
      "Use free to verify total system memory during POST verification, check for memory exhaustion, and monitor available memory during workload execution.",

    relatedCommands: ["lscpu", "dmidecode -t memory", "top"],

    commonMistakes: [
      'Panicking about low "free" memory - Linux uses available memory for cache',
      "Not using -h flag - raw numbers are hard to interpret",
    ],
  },

  sinfo: {
    name: "sinfo",
    category: "cluster-management",
    shortDescription: "View Slurm partition and node information",
    longDescription:
      "sinfo displays information about Slurm partitions and nodes. Shows node states, availability, partition configurations, and resource allocation. Essential for cluster status monitoring.",
    syntax: "sinfo [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain3"],

    examples: [
      {
        command: "sinfo",
        description: "Show all partitions and their node states",
      },
      {
        command: "sinfo -N",
        description: "Show information for specific nodes",
      },
      {
        command: "sinfo -R",
        description:
          "Show reasons for node states (why nodes are down/drained)",
      },
    ],

    whenToUse:
      "Use sinfo to check cluster health, verify node availability, identify down or drained nodes, and view partition configurations.",

    relatedCommands: ["squeue", "scontrol", "srun"],

    commonMistakes: [
      "Not using -R to see why nodes are down - missing important diagnostics",
    ],
  },

  hint: {
    name: "hint",
    category: "general",
    shortDescription: "Get a hint for the current lab step",
    longDescription:
      "The hint command provides progressive hints for the current lab step. Hints unlock based on time spent, failed attempts, and commands tried. Use this when stuck on a lab exercise.",
    syntax: "hint",
    difficulty: "beginner",
    domains: ["domain1", "domain2", "domain3", "domain4", "domain5"],

    examples: [
      {
        command: "hint",
        description: "Get the next available hint for your current lab step",
      },
    ],

    whenToUse:
      "Use hint when you're stuck on a lab step and need guidance. Hints become available based on your progress and will guide you progressively from gentle nudges to specific instructions.",

    relatedCommands: ["help"],

    commonMistakes: [],
  },

  nvsm: {
    name: "nvsm",
    category: "cluster-management",
    shortDescription: "NVIDIA System Management interface",
    longDescription:
      "NVSM (NVIDIA System Management) provides cluster-wide GPU and system management capabilities. Monitors GPU health, firmware versions, and system configuration across multiple nodes. Can be used in interactive or command-line mode.",
    syntax: "nvsm [OPTIONS] [COMMAND]",
    difficulty: "intermediate",
    domains: ["domain2", "domain3"],

    examples: [
      {
        command: "nvsm",
        description: "Enter interactive mode for NVSM commands",
      },
      {
        command: "nvsm show version",
        description: "Show NVSM version information",
      },
    ],

    whenToUse:
      "Use nvsm for cluster-wide GPU management, monitoring multiple nodes, and accessing advanced system management features in Base Command Manager deployments.",

    relatedCommands: ["nvidia-smi", "dcgmi", "bcm"],

    commonMistakes: [
      "Using nvsm for single-node tasks - nvidia-smi is more appropriate",
    ],
  },

  ibstat: {
    name: "ibstat",
    category: "networking",
    shortDescription: "Display InfiniBand adapter status",
    longDescription:
      "ibstat queries InfiniBand HCA (Host Channel Adapter) status, showing link state, physical state, link speed, and port information. Essential for verifying InfiniBand connectivity.",
    syntax: "ibstat [device] [port]",
    difficulty: "intermediate",
    domains: ["domain4"],

    examples: [
      {
        command: "ibstat",
        description: "Show status of all InfiniBand adapters",
      },
      {
        command: "ibstat mlx5_0",
        description: "Show status of specific HCA device",
      },
      {
        command: "ibstat mlx5_0 1",
        description: "Show status of specific port on HCA",
      },
    ],

    whenToUse:
      "Use ibstat to verify InfiniBand links are up, check link speeds, diagnose connectivity issues, and validate adapter configuration.",

    relatedCommands: ["ibportstate", "mlxlink", "ibnetdiscover"],

    commonMistakes: [
      'Not checking that State is "Active" - link may be physically connected but not active',
      'Ignoring Physical state - should be "LinkUp"',
    ],
  },

  squeue: {
    name: "squeue",
    aliases: ["sq"],
    category: "cluster-management",
    shortDescription: "View Slurm job queue",
    longDescription:
      "squeue displays information about jobs in the Slurm queue, including running and pending jobs. Shows job ID, partition, username, job state, runtime, and allocated nodes.",
    syntax: "squeue [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain3"],

    examples: [
      {
        command: "squeue",
        description: "Show all jobs in the queue",
      },
      {
        command: "squeue -u username",
        description: "Show jobs for specific user",
      },
      {
        command: "squeue -j 12345",
        description: "Show information for specific job ID",
      },
    ],

    whenToUse:
      "Use squeue to check job status, see queue depth, verify job submission, and monitor job progress.",

    relatedCommands: ["sinfo", "scontrol", "scancel"],

    commonMistakes: [
      "Not understanding job state codes (PD=pending, R=running, CG=completing)",
    ],
  },

  scontrol: {
    name: "scontrol",
    category: "cluster-management",
    shortDescription: "Slurm control and configuration tool",
    longDescription:
      "scontrol is the administrative tool for Slurm. Views and modifies Slurm configuration, job details, node states, and partition settings. Provides detailed information not available in sinfo/squeue.",
    syntax: "scontrol [OPTIONS] [COMMAND]",
    difficulty: "advanced",
    domains: ["domain3"],

    examples: [
      {
        command: "scontrol show node",
        description: "Show detailed information for all nodes",
      },
      {
        command: "scontrol show job 12345",
        description: "Show detailed information for specific job",
      },
      {
        command: "scontrol update NodeName=dgx-01 State=RESUME",
        description: "Resume a drained node",
      },
    ],

    whenToUse:
      "Use scontrol for detailed troubleshooting, viewing full job/node details, and administrative tasks like draining or resuming nodes.",

    relatedCommands: ["sinfo", "squeue", "srun"],

    commonMistakes: [
      "Using scontrol update without proper permissions",
      "Not checking node reason when troubleshooting - scontrol show node shows detailed reason",
    ],
  },

  sbatch: {
    name: "sbatch",
    category: "cluster-management",
    shortDescription: "Submit batch job to Slurm",
    longDescription:
      "sbatch submits a batch script to Slurm for later execution. The script contains resource requests (#SBATCH directives) and the commands to run. Returns a job ID for tracking.",
    syntax: "sbatch [OPTIONS] script.sh",
    difficulty: "intermediate",
    domains: ["domain3"],

    examples: [
      {
        command: "sbatch myjob.sh",
        description: "Submit batch job script",
      },
      {
        command: "sbatch --gres=gpu:8 --time=24:00:00 train.sh",
        description: "Submit job requesting 8 GPUs for 24 hours",
      },
    ],

    whenToUse:
      "Use sbatch to submit production workloads, long-running jobs, and jobs that don't require immediate execution.",

    relatedCommands: ["srun", "scancel", "squeue"],

    commonMistakes: [
      "Not specifying resource requirements - job may not get expected resources",
      "Forgetting to request GPUs with --gres=gpu:N",
    ],
  },

  srun: {
    name: "srun",
    category: "cluster-management",
    shortDescription: "Run job step in Slurm",
    longDescription:
      "srun executes a parallel job step in Slurm. Can be used interactively or within batch scripts. Allocates resources, launches tasks across nodes, and provides real-time output.",
    syntax: "srun [OPTIONS] command",
    difficulty: "intermediate",
    domains: ["domain3"],

    examples: [
      {
        command: "srun hostname",
        description: "Run hostname command on allocated node",
      },
      {
        command: "srun --gres=gpu:1 nvidia-smi",
        description: "Allocate 1 GPU and run nvidia-smi",
      },
      {
        command: "srun -N 4 --ntasks-per-node=8 mpi_app",
        description: "Run MPI application across 4 nodes with 8 tasks per node",
      },
    ],

    whenToUse:
      "Use srun for interactive jobs, testing, and launching parallel tasks within batch jobs.",

    relatedCommands: ["sbatch", "salloc", "scancel"],

    commonMistakes: [
      "Not understanding srun blocks until job completes",
      "Forgetting srun creates a job allocation - can be slow",
    ],
  },

  scancel: {
    name: "scancel",
    category: "cluster-management",
    shortDescription: "Cancel Slurm jobs",
    longDescription:
      "scancel terminates running or pending Slurm jobs. Can cancel individual jobs by ID, all jobs for a user, or jobs matching specific criteria.",
    syntax: "scancel [OPTIONS] [job_id]",
    difficulty: "beginner",
    domains: ["domain3"],

    examples: [
      {
        command: "scancel 12345",
        description: "Cancel job with ID 12345",
      },
      {
        command: "scancel -u username",
        description: "Cancel all jobs for a user",
      },
      {
        command: "scancel -n jobname",
        description: "Cancel jobs with specific name",
      },
    ],

    whenToUse:
      "Use scancel to stop running jobs, clear pending jobs from queue, or cancel jobs that are misbehaving.",

    relatedCommands: ["squeue", "scontrol"],

    commonMistakes: [
      "Canceling wrong job - always verify job ID with squeue first",
    ],
  },

  docker: {
    name: "docker",
    category: "containers",
    shortDescription: "Container management platform",
    longDescription:
      "Docker is a container platform for building, running, and managing containerized applications. Essential for AI/ML workflows, providing isolated environments with GPU access.",
    syntax: "docker [OPTIONS] COMMAND",
    difficulty: "intermediate",
    domains: ["domain3"],

    examples: [
      {
        command: "docker ps",
        description: "List running containers",
      },
      {
        command: "docker run --gpus all nvidia/cuda:12.4.0-base nvidia-smi",
        description: "Run container with all GPUs and execute nvidia-smi",
      },
      {
        command: "docker images",
        description: "List available container images",
      },
    ],

    whenToUse:
      "Use docker to run AI frameworks in isolated environments, ensure reproducibility, and manage GPU-accelerated workloads.",

    relatedCommands: ["ngc", "enroot", "nvidia-smi"],

    commonMistakes: [
      "Forgetting --gpus flag when running GPU workloads",
      "Not using NVIDIA Container Toolkit - GPUs won't be accessible",
    ],
  },

  ngc: {
    name: "ngc",
    category: "containers",
    shortDescription: "NVIDIA NGC CLI tool",
    longDescription:
      "NGC (NVIDIA GPU Cloud) CLI provides access to NVIDIA's catalog of GPU-optimized containers, models, and resources. Download pre-built containers for AI frameworks, HPC applications, and more.",
    syntax: "ngc [OPTIONS] COMMAND",
    difficulty: "intermediate",
    domains: ["domain3"],

    examples: [
      {
        command: "ngc registry image list",
        description: "List available container images",
      },
      {
        command: "ngc registry image info nvidia/cuda",
        description: "Show details for specific image",
      },
      {
        command: "ngc config set",
        description: "Configure NGC authentication",
      },
    ],

    whenToUse:
      "Use ngc to access NVIDIA-optimized containers, download pre-trained models, and manage NGC registry resources.",

    relatedCommands: ["docker", "enroot"],

    commonMistakes: [
      "Not configuring API key - authentication required for private resources",
      "Forgetting to check for updated container versions",
    ],
  },

  enroot: {
    name: "enroot",
    category: "containers",
    shortDescription: "Simple container runtime for HPC",
    longDescription:
      "Enroot is a lightweight container runtime optimized for HPC environments. Converts Docker images to unprivileged sandboxes, providing better performance and integration with HPC workload managers.",
    syntax: "enroot [OPTIONS] COMMAND",
    difficulty: "advanced",
    domains: ["domain3"],

    examples: [
      {
        command: "enroot import docker://nvidia/cuda:12.4.0-base",
        description: "Import Docker image as enroot container",
      },
      {
        command: "enroot create nvidia+cuda+12.4.0-base.sqsh",
        description: "Create container from image",
      },
      {
        command: "enroot start cuda",
        description: "Start container",
      },
    ],

    whenToUse:
      "Use enroot for HPC workloads requiring containers, integration with Slurm, and better multi-user container support.",

    relatedCommands: ["docker", "ngc", "srun"],

    commonMistakes: [
      "Not understanding enroot creates unprivileged containers - some Docker features unavailable",
    ],
  },

  mst: {
    name: "mst",
    category: "networking",
    shortDescription: "Mellanox Software Tools",
    longDescription:
      "MST (Mellanox Software Tools) provides low-level access to Mellanox/NVIDIA networking hardware. Shows device information, firmware versions, and provides access for configuration tools.",
    syntax: "mst [COMMAND]",
    difficulty: "advanced",
    domains: ["domain4"],

    examples: [
      {
        command: "mst start",
        description: "Start MST driver",
      },
      {
        command: "mst status",
        description: "Show available MST devices",
      },
      {
        command: "mst status -v",
        description: "Show detailed device information",
      },
    ],

    whenToUse:
      "Use mst to access Mellanox devices for configuration, before running mlxconfig/mlxlink, and to verify device detection.",

    relatedCommands: ["mlxconfig", "mlxlink", "mlxup"],

    commonMistakes: [
      "Not running mst start before other Mellanox tools - devices won't be accessible",
      "Running mst commands without proper permissions",
    ],
  },

  mlxconfig: {
    name: "mlxconfig",
    category: "networking",
    shortDescription: "Configure Mellanox/NVIDIA network adapters",
    longDescription:
      "mlxconfig queries and modifies firmware configuration of Mellanox/NVIDIA network adapters. Set parameters like SR-IOV, link type, boot options, and advanced features.",
    syntax: "mlxconfig [OPTIONS] -d <device>",
    difficulty: "advanced",
    domains: ["domain4"],

    examples: [
      {
        command: "mlxconfig -d /dev/mst/mt4123_pciconf0 query",
        description: "Show current configuration of device",
      },
      {
        command: "mlxconfig -d /dev/mst/mt4123_pciconf0 set SRIOV_EN=1",
        description: "Enable SR-IOV on device",
      },
    ],

    whenToUse:
      "Use mlxconfig to configure adapter settings, enable advanced features like SR-IOV, and troubleshoot configuration issues.",

    relatedCommands: ["mst", "mlxlink", "ibstat"],

    commonMistakes: [
      "Not running mst start first - device won't be found",
      "Modifying settings without backup - some changes require reboot",
      "Not verifying changes took effect - some parameters need power cycle",
    ],
  },

  mlxlink: {
    name: "mlxlink",
    category: "networking",
    shortDescription: "Display and configure link parameters",
    longDescription:
      "mlxlink provides detailed link-level diagnostics for Mellanox/NVIDIA network adapters. Shows link status, speeds, error counters, cable information, and allows link testing.",
    syntax: "mlxlink [OPTIONS] -d <device>",
    difficulty: "advanced",
    domains: ["domain4"],

    examples: [
      {
        command: "mlxlink -d /dev/mst/mt4123_pciconf0",
        description: "Show link status and information",
      },
      {
        command: "mlxlink -d /dev/mst/mt4123_pciconf0 -e",
        description: "Show error counters",
      },
    ],

    whenToUse:
      "Use mlxlink to diagnose link issues, verify cable connections, check for errors, and validate link speed negotiations.",

    relatedCommands: ["mst", "mlxcables", "ibstat"],

    commonMistakes: [
      "Not checking error counters - link may appear up but have issues",
      "Ignoring cable information - bad cables cause performance problems",
    ],
  },

  mlxcables: {
    name: "mlxcables",
    category: "networking",
    shortDescription: "Display cable and transceiver information",
    longDescription:
      "mlxcables reads and displays information from network cables and transceivers connected to Mellanox/NVIDIA adapters. Shows cable type, vendor, length, temperature, and diagnostics.",
    syntax: "mlxcables [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    examples: [
      {
        command: "mlxcables",
        description: "Show information for all cables",
      },
      {
        command: "mlxcables -d /dev/mst/mt4123_pciconf0",
        description: "Show cable info for specific device",
      },
    ],

    whenToUse:
      "Use mlxcables to verify cable compatibility, check cable specifications, diagnose link issues, and validate cable installation.",

    relatedCommands: ["mlxlink", "mst"],

    commonMistakes: [
      "Not checking cable length matches requirements",
      "Ignoring temperature warnings - can cause link instability",
    ],
  },

  mlxup: {
    name: "mlxup",
    category: "firmware",
    shortDescription: "Update Mellanox/NVIDIA firmware",
    longDescription:
      "mlxup (Mellanox Firmware Update Tool) checks for and installs firmware updates for Mellanox/NVIDIA network adapters. Ensures adapters run latest stable firmware versions.",
    syntax: "mlxup [OPTIONS]",
    difficulty: "advanced",
    domains: ["domain4"],

    examples: [
      {
        command: "mlxup",
        description: "Check for available firmware updates",
      },
      {
        command: "mlxup -y",
        description: "Update firmware automatically (non-interactive)",
      },
      {
        command: "mlxup -d /dev/mst/mt4123_pciconf0",
        description: "Update specific device",
      },
    ],

    whenToUse:
      "Use mlxup during initial deployment, when troubleshooting issues, before enabling new features, and as part of regular maintenance.",

    relatedCommands: ["mst", "mlxconfig"],

    commonMistakes: [
      "Updating firmware without maintenance window - requires reboot",
      "Not verifying current firmware version first",
      "Interrupting update process - can brick device",
    ],
  },

  bcm: {
    name: "bcm",
    category: "cluster-management",
    shortDescription: "Base Command Manager CLI",
    longDescription:
      "BCM (Base Command Manager) CLI provides cluster management capabilities for NVIDIA DGX systems. Monitor cluster health, manage nodes, configure settings, and access administrative functions.",
    syntax: "bcm [OPTIONS] COMMAND",
    difficulty: "advanced",
    domains: ["domain2", "domain3"],

    examples: [
      {
        command: "bcm cluster list",
        description: "List all clusters",
      },
      {
        command: "bcm node list",
        description: "List all nodes in cluster",
      },
      {
        command: "bcm node show dgx-01",
        description: "Show details for specific node",
      },
    ],

    whenToUse:
      "Use bcm for cluster-wide management tasks, monitoring DGX systems, and administrative operations in Base Command Manager environments.",

    relatedCommands: ["bcm-node", "nvsm", "crm"],

    commonMistakes: [
      "Confusing bcm (cluster management) with nvsm (system management)",
    ],
  },

  "bcm-node": {
    name: "bcm-node",
    category: "cluster-management",
    shortDescription: "Base Command Manager node operations",
    longDescription:
      "bcm-node provides node-specific operations within Base Command Manager. Manage individual node configuration, status, and maintenance operations.",
    syntax: "bcm-node [OPTIONS] COMMAND",
    difficulty: "advanced",
    domains: ["domain2", "domain3"],

    examples: [
      {
        command: "bcm-node list",
        description: "List all nodes",
      },
      {
        command: "bcm-node status dgx-01",
        description: "Show status of specific node",
      },
    ],

    whenToUse:
      "Use bcm-node for node-level operations, status checks, and maintenance tasks in Base Command Manager deployments.",

    relatedCommands: ["bcm", "nvsm"],

    commonMistakes: [],
  },

  crm: {
    name: "crm",
    category: "cluster-management",
    shortDescription: "Pacemaker cluster resource manager",
    longDescription:
      "CRM (Cluster Resource Manager) is Pacemaker's management interface. Shows cluster status, resource states, and node membership for high-availability cluster configurations.",
    syntax: "crm [COMMAND]",
    difficulty: "advanced",
    domains: ["domain2"],

    examples: [
      {
        command: "crm status",
        description: "Show cluster status and resource states",
      },
      {
        command: "crm configure show",
        description: "Show cluster configuration",
      },
    ],

    whenToUse:
      "Use crm to verify high-availability cluster status, check resource states, and troubleshoot cluster issues in HA deployments.",

    relatedCommands: ["bcm", "systemctl"],

    commonMistakes: [
      "Not understanding resource states - Online doesn't mean healthy",
    ],
  },

  dmidecode: {
    name: "dmidecode",
    category: "system-info",
    shortDescription: "DMI table decoder (BIOS/hardware info)",
    longDescription:
      "dmidecode reads the DMI (Desktop Management Interface) table to display detailed hardware information from BIOS. Shows system manufacturer, model, memory configuration, BIOS version, and more.",
    syntax: "dmidecode [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain1"],

    commonFlags: [
      {
        flag: "-t bios",
        description: "Show BIOS information",
        example: "dmidecode -t bios",
      },
      {
        flag: "-t system",
        description: "Show system information",
        example: "dmidecode -t system",
      },
      {
        flag: "-t memory",
        description: "Show memory information",
        example: "dmidecode -t memory",
      },
      {
        flag: "-t processor",
        description: "Show processor information",
        example: "dmidecode -t processor",
      },
    ],

    examples: [
      {
        command: "dmidecode -t bios",
        description: "Show BIOS version and release date",
      },
      {
        command: "dmidecode -t system",
        description: "Show system manufacturer and model",
      },
      {
        command: "dmidecode -t memory",
        description: "Show detailed memory configuration",
      },
    ],

    whenToUse:
      "Use dmidecode during POST verification to check BIOS versions, verify system model, inspect memory configuration, and gather hardware details.",

    relatedCommands: ["lscpu", "free", "lshw"],

    commonMistakes: [
      "Not using -t flag to filter - output is very long",
      "Forgetting dmidecode requires root privileges",
    ],
  },

  journalctl: {
    name: "journalctl",
    category: "diagnostics",
    shortDescription: "Query systemd journal logs",
    longDescription:
      "journalctl queries and displays logs from systemd journal. Shows system events, service logs, kernel messages, and application logs. Essential for troubleshooting system issues.",
    syntax: "journalctl [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain1", "domain5"],

    commonFlags: [
      {
        flag: "-b",
        description: "Show logs from current boot",
        example: "journalctl -b",
      },
      {
        flag: "-u <unit>",
        description: "Show logs for specific service",
        example: "journalctl -u nvsm-core",
      },
      {
        flag: "-f",
        description: "Follow logs in real-time",
        example: "journalctl -f",
      },
      {
        flag: "--since",
        description: "Show logs since specific time",
        example: 'journalctl --since "1 hour ago"',
      },
      {
        flag: "-p",
        description: "Filter by priority (emerg/alert/crit/err/warning)",
        example: "journalctl -p err",
      },
    ],

    examples: [
      {
        command: "journalctl -b",
        description: "Show all logs from current boot",
      },
      {
        command: "journalctl -u nvidia-persistenced",
        description: "Show logs for NVIDIA persistence daemon",
      },
      {
        command: "journalctl -p err -b",
        description: "Show only errors from current boot",
      },
      {
        command: "journalctl -f",
        description: "Follow system logs in real-time",
      },
    ],

    whenToUse:
      "Use journalctl to troubleshoot service failures, check for errors during boot, monitor system events, and investigate hardware issues.",

    relatedCommands: ["dmesg", "systemctl"],

    commonMistakes: [
      "Not using -b flag - shows logs from all boots, very long output",
      "Forgetting to filter by priority - too much noise",
      "Not using -u to filter by service when troubleshooting specific service",
    ],
  },

  help: {
    name: "help",
    category: "general",
    shortDescription: "Display available commands",
    longDescription:
      'The help command shows all available commands organized by category. Use "help [command]" to see detailed help for a specific command with examples and documentation.',
    syntax: "help [command]",
    difficulty: "beginner",
    domains: ["domain1", "domain2", "domain3", "domain4", "domain5"],

    examples: [
      {
        command: "help",
        description: "Show all available commands by category",
      },
      {
        command: "help nvidia-smi",
        description: "Show detailed help for nvidia-smi command",
      },
    ],

    whenToUse:
      "Use help when you need to discover available commands, remember command syntax, or get quick reference information.",

    relatedCommands: ["hint"],

    commonMistakes: [],
  },

  man: {
    name: "man",
    category: "general",
    shortDescription: "Display manual pages for Linux/HPC commands",
    longDescription:
      "Linux manual pager — shows detailed help including syntax, flags, examples, and related commands for real Linux and HPC tools. For simulator-specific commands (help, hint, practice), use 'help <command>' instead.",
    syntax: "man [section] <command>",
    difficulty: "beginner",

    commonFlags: [
      {
        flag: "-k <keyword>",
        description: "Search manual pages by keyword",
        example: "man -k gpu",
      },
      {
        flag: "-f <command>",
        description: "Whatis — show one-line description of a command",
        example: "man -f nvidia-smi",
      },
    ],

    examples: [
      {
        command: "man nvidia-smi",
        description: "Show manual page for nvidia-smi",
      },
      {
        command: "man ibstat",
        description: "Show manual page for ibstat",
      },
      {
        command: "man man",
        description: "Show manual page for the man command itself",
      },
    ],

    whenToUse:
      "Use man for detailed documentation on real Linux and HPC commands. For simulator builtins like help, hint, and practice, use 'help <command>' instead.",

    relatedCommands: ["nvidia-smi", "ibstat", "dcgmi"],

    commonMistakes: [
      "Using man without arguments — specify a command name to look up",
      "Using man for simulator commands — use 'help <command>' for help, hint, practice",
    ],
  },

  practice: {
    name: "practice",
    category: "general",
    shortDescription: "Generate command learning exercises",
    longDescription:
      "The practice command generates interactive learning exercises for HPC and Linux commands. It supports filtering by difficulty level, category, or specific command. Each exercise includes a task prompt, hints, and the expected command answer.",
    syntax:
      "practice [random|beginner|intermediate|advanced|category <cat>|<command>]",
    difficulty: "beginner",
    domains: ["domain1", "domain2", "domain3", "domain4", "domain5"],

    examples: [
      {
        command: "practice",
        description: "Get 3 random exercises from all available commands",
      },
      {
        command: "practice beginner",
        description: "Get beginner-level exercises",
      },
      {
        command: "practice nvidia-smi",
        description: "Get exercises specific to nvidia-smi command",
      },
      {
        command: "practice category gpu_management",
        description: "Get exercises for GPU management commands",
      },
    ],

    whenToUse:
      "Use practice when you want to learn or test your knowledge of Linux and HPC commands with hints and expected answers.",

    relatedCommands: ["help"],

    commonMistakes: [],
  },

  clear: {
    name: "clear",
    category: "general",
    shortDescription: "Clear terminal screen",
    longDescription:
      "The clear command clears the terminal screen, removing all previous output and moving the cursor to the top. Useful for decluttering the workspace.",
    syntax: "clear",
    difficulty: "beginner",
    domains: ["domain1", "domain2", "domain3", "domain4", "domain5"],

    examples: [
      {
        command: "clear",
        description: "Clear the terminal screen",
      },
    ],

    whenToUse:
      "Use clear when the terminal screen becomes too cluttered with previous command output.",

    relatedCommands: [],

    commonMistakes: [],
  },

  df: {
    name: "df",
    category: "storage",
    shortDescription: "Report filesystem disk space usage",
    longDescription:
      "df displays the amount of disk space available on filesystems. Shows total size, used space, available space, and mount points for local and network filesystems. Essential for capacity planning and storage validation.",
    syntax: "df [OPTIONS]",
    difficulty: "beginner",
    domains: ["domain3"],

    commonFlags: [
      {
        flag: "-h",
        description: "Human-readable format (GB, TB)",
        example: "df -h",
      },
      { flag: "-T", description: "Show filesystem type", example: "df -hT" },
      {
        flag: "-i",
        description: "Show inode information instead of block usage",
        example: "df -i",
      },
    ],

    examples: [
      {
        command: "df -h",
        description:
          "Show disk usage in human-readable format for all filesystems",
      },
      {
        command: "df -hT",
        description:
          "Show disk usage with filesystem types (ext4, nfs4, lustre)",
      },
      {
        command: "df -i",
        description:
          "Show inode usage - important for datasets with many small files",
      },
    ],

    whenToUse:
      "Use df to check storage capacity, verify filesystem mounts, identify full filesystems, and plan storage requirements for AI workloads.",

    relatedCommands: ["mount", "lfs", "du"],

    commonMistakes: [
      "Not using -h flag - raw numbers are hard to interpret",
      "Ignoring inode usage - can run out of inodes even with free space",
      "Not checking all filesystems - /scratch often separate from /",
    ],
  },

  mount: {
    name: "mount",
    category: "storage",
    shortDescription: "Show mounted filesystems",
    longDescription:
      "mount displays all currently mounted filesystems with their device names, mount points, filesystem types, and mount options. Helps understand storage topology and verify network mounts.",
    syntax: "mount",
    difficulty: "beginner",
    domains: ["domain3"],

    examples: [
      {
        command: "mount",
        description: "Display all mounted filesystems with their options",
      },
      {
        command: "mount | grep lustre",
        description: "Show only Lustre filesystem mounts",
      },
      {
        command: "mount | grep nfs",
        description: "Show only NFS mounts",
      },
    ],

    whenToUse:
      "Use mount to verify filesystem mounts, check mount options, troubleshoot storage connectivity, and understand storage architecture.",

    relatedCommands: ["df", "lfs", "findmnt"],

    commonMistakes: [
      "Not checking mount options - read-only vs read-write matters",
      "Forgetting to verify network mounts after network issues",
    ],
  },

  lfs: {
    name: "lfs",
    category: "storage",
    shortDescription: "Lustre filesystem utilities",
    longDescription:
      "lfs is the Lustre filesystem utility that provides access to Lustre-specific operations. Shows Lustre filesystem usage, checks server connectivity, manages striping, and provides detailed information about Lustre components (MDT, OST).",
    syntax: "lfs <subcommand> [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain3"],

    commonFlags: [
      {
        flag: "df [-h]",
        description: "Show Lustre filesystem usage with OST breakdown",
        example: "lfs df -h",
      },
      {
        flag: "check servers",
        description: "Verify all Lustre servers are responding",
        example: "lfs check servers",
      },
    ],

    examples: [
      {
        command: "lfs df -h",
        description:
          "Show Lustre filesystem capacity with MDT and OST breakdown",
      },
      {
        command: "lfs check servers",
        description:
          "Verify all Lustre metadata and object storage servers are online",
      },
      {
        command: "lfs df",
        description:
          "Show detailed Lustre capacity in blocks (not human-readable)",
      },
    ],

    whenToUse:
      "Use lfs to check Lustre filesystem health, verify OST balance, troubleshoot storage issues, and monitor parallel filesystem capacity.",

    relatedCommands: ["df", "mount"],

    commonMistakes: [
      "Not checking OST balance - uneven usage indicates striping issues",
      "Ignoring offline OSTs - causes performance degradation",
      "Forgetting Lustre is a parallel filesystem - capacity is sum of all OSTs",
    ],
  },

  hpl: {
    name: "hpl",
    category: "diagnostics",
    shortDescription: "High-Performance Linpack benchmark",
    longDescription:
      "HPL (High-Performance Linpack) measures peak FLOPS (floating-point operations per second) performance of GPU and CPU compute resources. Industry-standard benchmark for HPC system validation and performance testing.",
    syntax: "hpl [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    commonFlags: [
      {
        flag: "--nodes N",
        description: "Number of nodes to use",
        example: "hpl --nodes 4",
      },
      {
        flag: "--gpus-per-node N",
        description: "GPUs per node (default: 8)",
        example: "hpl --gpus-per-node 8",
      },
      {
        flag: "--problem-size N",
        description: "Problem size N (default: auto)",
        example: "hpl --problem-size 100000",
      },
    ],

    examples: [
      {
        command: "hpl",
        description: "Run HPL benchmark with default settings (1 node, 8 GPUs)",
      },
      {
        command: "hpl --nodes 4 --gpus-per-node 8",
        description: "Run HPL across 4 nodes with 8 GPUs each (32 GPUs total)",
      },
      {
        command: "hpl --problem-size 100000",
        description: "Run HPL with specific problem size",
      },
    ],

    whenToUse:
      "Use HPL to validate compute performance after installation, verify GPU functionality, baseline system performance, and compare against specifications.",

    relatedCommands: ["dcgmi diag", "gpu-burn", "nccl-test"],

    commonMistakes: [
      "Not understanding efficiency - 85-92% is good, below 80% indicates issues",
      "Running HPL with active workloads - skews results",
      "Comparing FP64 and FP16 results - different metrics",
    ],
  },

  "nccl-test": {
    name: "nccl-test",
    aliases: ["nccl"],
    category: "diagnostics",
    shortDescription: "NCCL collective communication tests",
    longDescription:
      "NCCL (NVIDIA Collective Communications Library) tests measure GPU-to-GPU communication performance. Tests collective operations (all-reduce, broadcast, reduce-scatter) across GPUs, essential for multi-GPU training validation.",
    syntax: "nccl-test [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    commonFlags: [
      {
        flag: "-b, --minbytes <size>",
        description: "Minimum message size (default: 8B)",
        example: "nccl-test -b 8M",
      },
      {
        flag: "-e, --maxbytes <size>",
        description: "Maximum message size (default: 128MB)",
        example: "nccl-test -e 128M",
      },
      {
        flag: "-g, --ngpus <N>",
        description: "Number of GPUs (default: 8)",
        example: "nccl-test -g 8",
      },
      {
        flag: "--operation <op>",
        description: "Operation: all_reduce, broadcast, reduce_scatter",
        example: "nccl-test --operation all_reduce",
      },
    ],

    examples: [
      {
        command: "nccl-test",
        description: "Run all-reduce test with default parameters",
      },
      {
        command: "nccl-test --operation all_reduce -b 8M -e 128M -g 8",
        description: "Test all-reduce from 8MB to 128MB across 8 GPUs",
      },
      {
        command: "nccl-test --operation broadcast -g 4",
        description: "Test broadcast operation across 4 GPUs",
      },
    ],

    whenToUse:
      "Use nccl-test to validate GPU interconnect (NVLink, NVSwitch), verify multi-GPU communication, diagnose training slowdowns, and baseline collective operation performance.",

    relatedCommands: ["hpl", "nvidia-smi", "ibstat"],

    commonMistakes: [
      "Not testing multiple message sizes - performance varies with size",
      "Ignoring small message latency - critical for some workloads",
      "Not comparing against expected bandwidth for the system",
    ],
  },

  "gpu-burn": {
    name: "gpu-burn",
    category: "diagnostics",
    shortDescription: "GPU stress test for thermal validation",
    longDescription:
      "GPU-Burn is a stress testing tool that pushes GPUs to maximum utilization and power draw. Tests thermal management, power delivery, and stability under sustained load. Essential for validating cooling and detecting hardware issues.",
    syntax: "gpu-burn [duration] [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    commonFlags: [
      {
        flag: "-d, --duration <sec>",
        description: "Test duration in seconds (default: 60)",
        example: "gpu-burn -d 300",
      },
      {
        flag: "-g, --gpu <idx>",
        description: "Test specific GPU index (default: all)",
        example: "gpu-burn -g 0",
      },
    ],

    examples: [
      {
        command: "gpu-burn 300",
        description: "Run stress test for 300 seconds (5 minutes) on all GPUs",
      },
      {
        command: "gpu-burn -d 60 -g 0",
        description: "Test only GPU 0 for 60 seconds",
      },
      {
        command: "gpu-burn",
        description: "Run default 60-second stress test on all GPUs",
      },
    ],

    whenToUse:
      "Use gpu-burn to validate cooling systems, stress test new hardware, verify thermal management, detect unstable GPUs, and ensure sustained performance.",

    relatedCommands: ["nvidia-smi", "dcgmi diag", "hpl"],

    commonMistakes: [
      "Not monitoring temperature during test - defeats the purpose",
      "Running too short of a test - thermal issues take time to appear",
      "Testing with inadequate cooling - can damage hardware",
      "Not checking for thermal throttling in results",
    ],
  },

  hostnamectl: {
    name: "hostnamectl",
    category: "system-info",
    shortDescription: "Query or change system hostname and related settings",
    longDescription:
      "hostnamectl is used to query and change system hostname and related settings. It shows static hostname, machine ID, boot ID, operating system, kernel version, architecture, and hardware information.",
    syntax: "hostnamectl [status|set-hostname <name>]",
    difficulty: "beginner",
    domains: ["domain1"],

    commonFlags: [
      {
        flag: "status",
        description: "Show current hostname and system info (default)",
        example: "hostnamectl status",
      },
      {
        flag: "set-hostname <name>",
        description: "Set the system hostname",
        example: "hostnamectl set-hostname dgx-01",
      },
    ],

    examples: [
      {
        command: "hostnamectl",
        description: "Display current hostname and system information",
      },
      {
        command: "hostnamectl set-hostname dgx-01",
        description: "Set the system hostname to dgx-01",
      },
    ],

    whenToUse:
      "Use hostnamectl to verify system identity during cluster setup, check hardware vendor/model information, or set hostnames during node configuration.",

    relatedCommands: ["timedatectl", "systemctl", "uname"],

    commonMistakes: [
      "Forgetting that hostname changes may require service restarts",
      "Not updating /etc/hosts after changing hostname",
      "Using special characters in hostnames that cause DNS issues",
    ],
  },

  timedatectl: {
    name: "timedatectl",
    category: "system-info",
    shortDescription: "Query or change system time and date settings",
    longDescription:
      "timedatectl is used to query and change system clock and timezone settings. It can enable/disable NTP synchronization, set timezone, and show detailed time information.",
    syntax:
      "timedatectl [status|set-timezone <tz>|set-ntp <bool>|list-timezones]",
    difficulty: "beginner",
    domains: ["domain1"],

    commonFlags: [
      {
        flag: "status",
        description: "Show current time settings (default)",
        example: "timedatectl status",
      },
      {
        flag: "set-timezone <tz>",
        description: "Set the system timezone",
        example: "timedatectl set-timezone UTC",
      },
      {
        flag: "set-ntp <bool>",
        description: "Enable or disable NTP synchronization",
        example: "timedatectl set-ntp true",
      },
      {
        flag: "list-timezones",
        description: "List available timezones",
        example: "timedatectl list-timezones",
      },
    ],

    examples: [
      {
        command: "timedatectl",
        description: "Display current time, timezone, and NTP status",
      },
      {
        command: "timedatectl set-timezone UTC",
        description: "Set timezone to UTC (recommended for datacenter servers)",
      },
      {
        command: "timedatectl set-ntp true",
        description: "Enable NTP time synchronization",
      },
    ],

    whenToUse:
      "Use timedatectl to ensure time synchronization across cluster nodes, verify NTP is enabled, and set consistent timezones for log correlation.",

    relatedCommands: ["hostnamectl", "systemctl", "chronyc"],

    commonMistakes: [
      "Not enabling NTP on cluster nodes, causing time drift",
      "Using local timezone instead of UTC in datacenter environments",
      "Forgetting to verify NTP sync status after configuration",
    ],
  },

  mlxfwmanager: {
    name: "mlxfwmanager",
    category: "firmware",
    shortDescription: "Firmware manager for Mellanox/NVIDIA network devices",
    longDescription:
      "mlxfwmanager is the primary tool for managing firmware on Mellanox/NVIDIA ConnectX adapters and BlueField DPUs. It can query current firmware, check for updates, and perform firmware upgrades.",
    syntax: "mlxfwmanager [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain1", "domain5"],

    commonFlags: [
      {
        flag: "--query",
        description: "Query firmware version of all devices",
        example: "mlxfwmanager --query",
      },
      {
        flag: "-d <device>",
        description: "Target specific device",
        example: "mlxfwmanager -d /dev/mst/mt4119_pciconf0 --query",
      },
      {
        flag: "--online-query",
        description: "Check for available online updates",
        example: "mlxfwmanager --online-query",
      },
      {
        flag: "-u",
        description: "Update firmware",
        example: "mlxfwmanager -u",
      },
      {
        flag: "--force",
        description: "Force update even if same version",
        example: "mlxfwmanager -u --force",
      },
    ],

    examples: [
      {
        command: "mlxfwmanager --query",
        description: "List all Mellanox devices with their firmware versions",
      },
      {
        command: "mlxfwmanager --online-query",
        description: "Check if firmware updates are available online",
      },
      {
        command: "mlxfwmanager -u -y",
        description: "Update firmware on all devices (with auto-confirm)",
      },
    ],

    whenToUse:
      "Use mlxfwmanager to verify InfiniBand HCA firmware versions, check for updates before cluster deployment, and perform firmware upgrades during maintenance windows.",

    relatedCommands: ["mst", "mlxconfig", "mlxlink", "ibstat"],

    commonMistakes: [
      "Updating firmware without first running mst start",
      "Not rebooting after firmware update",
      "Updating firmware during active workloads",
      "Not checking compatibility with OFED driver version",
    ],
  },

  "nvlink-audit": {
    name: "nvlink-audit",
    category: "diagnostics",
    shortDescription: "NVLink fabric diagnostic and audit tool",
    longDescription:
      "nvlink-audit performs comprehensive diagnostics on the NVLink fabric connecting GPUs. It verifies link status, checks for errors, tests bandwidth, and validates topology connectivity.",
    syntax: "nvlink-audit [OPTIONS]",
    difficulty: "advanced",
    domains: ["domain4", "domain5"],

    commonFlags: [
      {
        flag: "-v, --verbose",
        description: "Show detailed per-link information",
        example: "nvlink-audit --verbose",
      },
      {
        flag: "-i, --id <gpu>",
        description: "Audit specific GPU only",
        example: "nvlink-audit -i 0",
      },
      {
        flag: "--check-all",
        description: "Run all diagnostics including bandwidth test",
        example: "nvlink-audit --check-all",
      },
      {
        flag: "--report <format>",
        description: "Output format (json)",
        example: "nvlink-audit --report json",
      },
    ],

    examples: [
      {
        command: "nvlink-audit",
        description: "Run basic NVLink audit on all GPUs",
      },
      {
        command: "nvlink-audit --verbose",
        description: "Show detailed link-by-link status",
      },
      {
        command: "nvlink-audit --check-all",
        description: "Run comprehensive diagnostics with bandwidth testing",
      },
      {
        command: "nvlink-audit --report json",
        description: "Generate JSON report for automated processing",
      },
    ],

    whenToUse:
      "Use nvlink-audit to diagnose multi-GPU communication issues, verify NVLink fabric health after hardware changes, and validate topology before running distributed training workloads.",

    relatedCommands: [
      "nvidia-smi nvlink",
      "nvidia-smi topo",
      "nccl-test",
      "dcgmi diag",
    ],

    commonMistakes: [
      "Not running with --verbose when troubleshooting specific link issues",
      "Ignoring warnings about degraded links that still show as active",
      "Not correlating results with nvidia-smi nvlink output",
      "Running during active GPU workloads which can affect results",
    ],
  },

  clusterkit: {
    name: "clusterkit",
    category: "diagnostics",
    shortDescription: "Comprehensive node assessment tool",
    longDescription:
      "ClusterKit is a comprehensive node assessment tool that validates GPU health, network connectivity, storage, firmware versions, and driver compatibility. It performs system-wide checks and provides a detailed health report.",
    syntax: "clusterkit <subcommand> [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    examples: [
      {
        command: "clusterkit assess",
        description: "Run full node assessment across all categories",
      },
      {
        command: "clusterkit check gpu",
        description: "Run GPU-specific health checks",
      },
      {
        command: "clusterkit check network",
        description: "Verify InfiniBand connectivity and performance",
      },
      {
        command: "clusterkit check storage",
        description: "Validate filesystem and storage configuration",
      },
      {
        command: "clusterkit check firmware",
        description: "Check firmware versions across all components",
      },
      {
        command: "clusterkit check drivers",
        description: "Verify driver compatibility and versions",
      },
    ],

    whenToUse:
      "Use clusterkit for comprehensive node validation after installation, pre-deployment checks, periodic health assessments, and troubleshooting multi-component issues.",

    relatedCommands: ["dcgmi health", "nvidia-smi", "ibstat", "mlxfwmanager"],

    commonMistakes: [
      "Not addressing warnings in the assessment report",
      "Running assessment during active workloads which may affect results",
      "Ignoring specific category failures in the overall report",
    ],
  },

  nemo: {
    name: "nemo",
    category: "diagnostics",
    shortDescription: "NVIDIA NeMo Framework - AI model training validation",
    longDescription:
      "NVIDIA NeMo Framework is a toolkit for building and training large language models, multimodal models, and speech AI. The burn-in test validates training stability under sustained load, verifying GPU memory management, distributed training coordination, and loss convergence over extended iterations.",
    syntax: "nemo <subcommand> [OPTIONS]",
    difficulty: "intermediate",
    domains: ["domain4"],

    commonFlags: [
      {
        flag: "--model <name>",
        description: "Specify the model name to train",
        example: "nemo train --model gpt3-175b",
      },
      {
        flag: "--gpus <N>",
        description: "Number of GPUs to use for training",
        example: "nemo train --model llama2-70b --gpus 8",
      },
      {
        flag: "--iterations <N>",
        description: "Number of training or burn-in iterations",
        example: "nemo burn-in --iterations 2000",
      },
    ],

    examples: [
      {
        command: "nemo train --model gpt3-175b",
        description: "Train GPT-3 175B model using default settings",
      },
      {
        command: "nemo train --model llama2-70b --gpus 8",
        description: "Train LLaMA 2 70B model with 8 GPUs",
      },
      {
        command: "nemo train --model bert-large --iterations 5000",
        description: "Train BERT-Large model for 5000 iterations",
      },
      {
        command: "nemo burn-in",
        description:
          "Run default burn-in test (1000 iterations) to validate training stability",
      },
      {
        command: "nemo burn-in --iterations 500",
        description: "Run burn-in test with 500 iterations",
      },
      {
        command: "nemo burn-in --model llama2-13b --iterations 2000",
        description:
          "Run extended burn-in test with LLaMA 2 13B model for 2000 iterations",
      },
    ],

    whenToUse:
      "Use NeMo for validating AI training infrastructure, running burn-in tests to ensure training stability, verifying GPU memory management under sustained load, testing distributed training coordination across multiple GPUs, and ensuring loss convergence patterns are normal.",

    relatedCommands: ["hpl", "nccl-test", "dcgmi diag", "nvidia-smi"],

    commonMistakes: [
      "Not monitoring GPU memory during burn-in - memory leaks take time to appear",
      "Running burn-in tests too short - stability issues may not surface in quick tests",
      "Ignoring loss convergence patterns - erratic loss indicates training instability",
      "Not checking GPU utilization - low utilization suggests configuration issues",
    ],
  },
};

/**
 * Get all commands in a specific category
 */
export function getCommandsByCategory(
  category: CommandCategory,
): CommandMetadata[] {
  return Object.values(COMMAND_METADATA).filter(
    (cmd) => cmd.category === category,
  );
}

/**
 * Get all commands for a specific domain
 */
export function getCommandsByDomain(domain: string): CommandMetadata[] {
  return Object.values(COMMAND_METADATA).filter(
    (cmd) => cmd.domains && cmd.domains.includes(domain),
  );
}

/**
 * Search commands by name or description
 */
export function searchCommands(query: string): CommandMetadata[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(COMMAND_METADATA).filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.shortDescription.toLowerCase().includes(lowerQuery) ||
      cmd.longDescription.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get command metadata by name (including aliases)
 */
export function getCommandMetadata(
  commandName: string,
): CommandMetadata | undefined {
  // Direct match
  if (COMMAND_METADATA[commandName]) {
    return COMMAND_METADATA[commandName];
  }

  // Check aliases
  return Object.values(COMMAND_METADATA).find((cmd) =>
    cmd.aliases?.includes(commandName),
  );
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<CommandCategory, string> = {
  "gpu-management": "GPU Management",
  "system-info": "System Information",
  networking: "Networking",
  storage: "Storage",
  "cluster-management": "Cluster Management",
  containers: "Containers",
  diagnostics: "Diagnostics",
  firmware: "Firmware & Updates",
  general: "General",
};
