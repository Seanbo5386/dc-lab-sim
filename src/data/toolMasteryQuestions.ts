import type { CommandFamilyId } from "../store/learningProgressStore";

export type MasteryCategory =
  | "flags-options"
  | "output-interpretation"
  | "troubleshooting"
  | "command-syntax"
  | "conceptual"
  | "best-practice";

export interface ToolMasteryQuestion {
  id: string;
  familyId: CommandFamilyId;
  tool: string;
  category: MasteryCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionText: string;
  codeSnippet?: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  examRelevance?: string;
}

// ============================================================================
// GPU MONITORING (tm-gpu-001 through tm-gpu-025)
// Tools: nvidia-smi (8), dcgmi (7), nvtop (5), nvsm (5)
// ============================================================================

const gpuMonitoringQuestions: ToolMasteryQuestion[] = [
  // nvidia-smi (5 questions)
  {
    id: "tm-gpu-001",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "flags-options",
    difficulty: "beginner",
    questionText: "Which nvidia-smi flag enables persistence mode on GPU 0?",
    choices: [
      "nvidia-smi --pm 1 -i 0",
      "nvidia-smi --persist-mode -i 0",
      "nvidia-smi -pm enable -i 0",
      "nvidia-smi --daemon -i 0",
    ],
    correctAnswer: 0,
    explanation:
      "nvidia-smi uses --pm (or -pm) with a value of 0 or 1 to disable or enable persistence mode. Persistence mode keeps the NVIDIA driver loaded even when no GPU clients are connected, reducing latency for the first GPU call after idle periods.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-002",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this nvidia-smi output indicate about the GPU health?",
    codeSnippet: `$ nvidia-smi -q -d ECC
GPU 0000:3B:00.0
    ECC Mode
        Current                           : Enabled
        Pending                           : Enabled
    ECC Errors
        Volatile
            SRAM Correctable              : 0
            SRAM Uncorrectable            : 3
            DRAM Correctable              : 15
            DRAM Uncorrectable            : 0`,
    choices: [
      "The GPU is healthy with only correctable errors",
      "The GPU has uncorrectable SRAM errors that may indicate failing memory and should be investigated",
      "ECC is disabled so errors are not being tracked",
      "The GPU needs a driver update to clear pending ECC mode",
    ],
    correctAnswer: 1,
    explanation:
      "SRAM Uncorrectable errors (3 in this case) are serious because they cannot be corrected by ECC. While DRAM correctable errors (15) are normal over time and handled automatically, uncorrectable SRAM errors can cause compute corruption and may indicate degrading GPU memory. This GPU should be monitored and potentially replaced.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-003",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which nvidia-smi command displays the GPU interconnect topology matrix showing NVLink and PCIe connections between GPUs?",
    choices: [
      "nvidia-smi nvlink --status",
      "nvidia-smi topo -m",
      "nvidia-smi -q -d TOPOLOGY",
      "nvidia-smi --interconnect",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-smi topo -m (or --matrix) displays the topology matrix showing how GPUs are connected to each other via NVLink, PCIe, or through CPU sockets. The matrix uses abbreviations like NV18 (NVLink with 18 links), PHB (PCIe Host Bridge), SYS (cross-socket), and PIX (same PCIe switch).",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-004",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which nvidia-smi command enables Multi-Instance GPU (MIG) mode on GPU 0?",
    choices: [
      "nvidia-smi --mig 1 -i 0",
      "nvidia-smi mig -cgi 0 -i 0",
      "nvidia-smi -q -d MIG -i 0",
      "nvidia-smi --mig-mode enable -i 0",
    ],
    correctAnswer: 0,
    explanation:
      "nvidia-smi --mig 1 -i 0 (or -mig 1) enables MIG mode on GPU 0. After enabling MIG mode, a GPU reset is required for the change to take effect. MIG partitions an A100/H100/H200 GPU into up to seven isolated instances, each with dedicated compute, memory, and cache resources.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-005",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "You need to continuously log GPU power draw, temperature, and utilization to a CSV file every 2 seconds. Which command is most appropriate?",
    choices: [
      "nvidia-smi -l 2 > gpu_log.csv",
      "nvidia-smi dmon -s put -d 2 > gpu_log.csv",
      "nvidia-smi --query-gpu=power.draw,temperature.gpu,utilization.gpu --format=csv -l 2 > gpu_log.csv",
      "nvidia-smi -q -d POWER,TEMPERATURE -l 2 > gpu_log.csv",
    ],
    correctAnswer: 2,
    explanation:
      "nvidia-smi --query-gpu with --format=csv produces clean, parseable CSV output. The -l 2 flag loops every 2 seconds. The dmon subcommand also works for monitoring but outputs a fixed-width table, not CSV. The -q flag produces verbose human-readable output that is harder to parse programmatically.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },

  // dcgmi (4 questions)
  {
    id: "tm-gpu-006",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "flags-options",
    difficulty: "beginner",
    questionText: "What does the -r flag control in the dcgmi diag command?",
    choices: [
      "The report output format",
      "The diagnostic run level (1=quick, 2=medium, 3=long)",
      "Whether to reset GPU state before running diagnostics",
      "The number of times to repeat each test",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi diag -r specifies the diagnostic run level. Level 1 runs quick deployment tests (seconds). Level 2 adds medium-length stress tests (minutes). Level 3 runs comprehensive long-duration tests including extended memory and compute stress tests that can take 15+ minutes per GPU.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-007",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "In DCGM field groups, what does field ID 150 (DCGM_FI_PROF_SM_ACTIVE) measure?",
    choices: [
      "The number of active CUDA streams on the GPU",
      "The ratio of cycles where at least one warp is active on a Streaming Multiprocessor",
      "The total count of Streaming Multiprocessors on the GPU",
      "The GPU memory bandwidth utilization percentage",
    ],
    correctAnswer: 1,
    explanation:
      "DCGM field ID 150 (DCGM_FI_PROF_SM_ACTIVE) measures the ratio of cycles where at least one warp is active across all SMs. A value below 1.0 indicates that some SMs are idle, suggesting the workload may not be fully utilizing the GPU compute resources. This is a key metric for GPU profiling.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-008",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "What does this dcgmi dmon output indicate?",
    codeSnippet: `$ dcgmi dmon -e 203,150,155 -d 1000
#Entity   GPUTEMP   SMACT   FP32A
GPU 0       82      0.95    0.87
GPU 1       84      0.93    0.85
GPU 2       91      0.12    0.03
GPU 3       83      0.94    0.86`,
    choices: [
      "All GPUs are running a balanced workload",
      "GPU 2 is thermal throttling and should be checked for cooling issues",
      "GPU 2 has very low SM activity and FP32 activity despite high temperature, suggesting a stuck or failed job",
      "The GPUs need a firmware update to fix temperature readings",
    ],
    correctAnswer: 2,
    explanation:
      "GPU 2 shows a concerning pattern: high temperature (91C) but extremely low SM activity (0.12) and almost no FP32 activity (0.03). On a healthy GPU under load, high temperature would correlate with high activity. This combination suggests a process may be stuck (spinning without doing useful compute) or there is a hardware issue causing thermal dissipation problems. Field IDs: 203=GPU Temperature, 150=SM Active, 155=FP32 Engine Active.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-gpu-009",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which dcgmi command lists all GPUs discovered in the system along with their PCI bus IDs and UUIDs?",
    choices: [
      "dcgmi stats -l",
      "dcgmi discovery -l",
      "dcgmi group --list",
      "dcgmi health -c",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi discovery -l (or --list) enumerates all GPUs in the system and displays their entity IDs, PCI bus IDs, device names, and UUIDs. This is useful for identifying GPUs before creating groups or running diagnostics on specific devices.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },

  // nvtop (2 questions)
  {
    id: "tm-gpu-010",
    familyId: "gpu-monitoring",
    tool: "nvtop",
    category: "conceptual",
    difficulty: "beginner",
    questionText:
      "What type of GPU monitoring does nvtop provide that nvidia-smi does not natively offer?",
    choices: [
      "ECC error counting",
      "A continuously updating interactive dashboard with per-process GPU utilization graphs",
      "MIG partition management",
      "Remote GPU management over IPMI",
    ],
    correctAnswer: 1,
    explanation:
      "nvtop provides a htop-like interactive terminal UI with real-time bar charts for GPU utilization, memory, temperature, and per-process breakdowns. While nvidia-smi can loop with -l, it redraws the entire text output each time rather than providing a smooth interactive dashboard with process sorting and filtering.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-011",
    familyId: "gpu-monitoring",
    tool: "nvtop",
    category: "troubleshooting",
    difficulty: "intermediate",
    questionText:
      "You are using nvtop and notice one GPU shows 98% memory utilization but 0% compute utilization. What is the most likely explanation?",
    choices: [
      "The GPU driver has crashed and needs to be reloaded",
      "A process has allocated GPU memory but is not actively running kernels, possibly a memory leak or idle framework",
      "nvtop is reporting incorrect data and you should use nvidia-smi instead",
      "The GPU is in persistence mode which disables compute reporting",
    ],
    correctAnswer: 1,
    explanation:
      "High memory utilization with zero compute utilization typically indicates a process that has allocated GPU memory buffers but is not actively launching CUDA kernels. This is common with deep learning frameworks (PyTorch, TensorFlow) that pre-allocate GPU memory at startup. It could also indicate a memory leak where a process has exited but not freed GPU memory, or an idle interactive session holding resources.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },

  // nvsm (2 questions)
  {
    id: "tm-gpu-012",
    familyId: "gpu-monitoring",
    tool: "nvsm",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which nvsm command displays the overall health status of a DGX system?",
    choices: [
      "nvsm dump health",
      "nvsm show health",
      "nvsm status --all",
      "nvsm diag --quick",
    ],
    correctAnswer: 1,
    explanation:
      "nvsm show health displays the system-wide health status of a DGX system, including GPU, NVLink, InfiniBand, storage, and other subsystem statuses. nvsm (NVIDIA System Management) is the fleet management CLI specific to DGX systems and requires root privileges.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-013",
    familyId: "gpu-monitoring",
    tool: "nvsm",
    category: "conceptual",
    difficulty: "advanced",
    questionText:
      "What distinguishes nvsm from nvidia-smi and dcgmi in a DGX BasePOD environment?",
    choices: [
      "nvsm can only monitor GPUs while nvidia-smi and dcgmi can monitor all components",
      "nvsm provides fleet-level health management across multiple DGX nodes, while nvidia-smi and dcgmi are single-node tools",
      "nvsm is a userspace tool while nvidia-smi and dcgmi require root privileges",
      "nvsm replaces nvidia-smi and dcgmi entirely on DGX systems",
    ],
    correctAnswer: 1,
    explanation:
      "nvsm is designed for managing multiple DGX systems in a BasePOD or SuperPOD configuration. It aggregates health data across the entire DGX fleet and provides centralized management. nvidia-smi and dcgmi operate at the single-node level. nvsm also monitors non-GPU subsystems like storage, networking, and chassis components specific to DGX hardware.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-014",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which nvidia-smi flag allows you to target a specific GPU by its index when querying information?",
    choices: [
      "nvidia-smi --gpu 0",
      "nvidia-smi -i 0",
      "nvidia-smi --select 0",
      "nvidia-smi -g 0",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-smi -i (or --id) selects a specific GPU by its index, PCI bus ID, or UUID. For example, nvidia-smi -i 0 targets GPU 0, nvidia-smi -i 00000000:3B:00.0 targets by PCI bus address, and nvidia-smi -i GPU-xxxxxxxx targets by UUID. This flag can be combined with most other nvidia-smi commands and queries.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-015",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText:
      "What does this nvidia-smi pmon output reveal about the running processes?",
    codeSnippet: `$ nvidia-smi pmon -i 0 -s um -c 1
# gpu   pid  type    sm   mem   enc   dec    fb   command
# Idx     #   C/G     %     %     %     %    MB   name
    0  12345   C      95    78     0     0  39421  python
    0  12346   C       0     0     0     0   2048  python
    0  12347   G       3     5     0     0    512  Xorg`,
    choices: [
      "All three processes are competing equally for GPU resources",
      "PID 12345 is actively computing (95% SM, 78% mem) using 39 GB framebuffer; PID 12346 has allocated 2 GB but is idle (0% utilization); PID 12347 is a graphics process with minimal usage",
      "The GPU is overloaded and processes should be migrated",
      "PID 12346 is a zombie process that should be killed",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-smi pmon (process monitor) shows per-process GPU utilization. PID 12345 is a compute (C) process actively using 95% of SM and 78% of memory bandwidth with 39 GB allocated. PID 12346 is also compute but shows 0% utilization despite holding 2 GB of framebuffer memory, suggesting it is between computation phases or idle. PID 12347 is a graphics (G) process (Xorg) with minimal overhead.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-gpu-016",
    familyId: "gpu-monitoring",
    tool: "nvidia-smi",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which nvidia-smi command checks the NVLink status for a specific GPU?",
    choices: [
      "nvidia-smi topo -m",
      "nvidia-smi nvlink --status -i 0",
      "nvidia-smi -q -d NVLINK",
      "nvidia-smi nvlink -l",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-smi nvlink --status -i 0 displays the NVLink link status for GPU 0, showing each NVLink lane, its connected peer GPU, and whether the link is active or inactive. This is distinct from topo -m which shows the topology matrix, and -q -d NVLINK which shows NVLink error counters rather than connection status.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-017",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this dcgmi health output indicate?",
    codeSnippet: `$ dcgmi health -c -g 1
Health Monitor Report for group 1
+------------+--------+-------------------------------------------+
| Entity     | Health | Detail                                    |
+============+========+===========================================+
| GPU 0      | Green  | Healthy                                   |
| GPU 1      | Yellow | Thermal violations detected               |
| GPU 2      | Green  | Healthy                                   |
| GPU 3      | Red    | PCIe replay count exceeds threshold       |
+============+========+===========================================+
| Overall    | Red    |                                           |
+------------+--------+-------------------------------------------+`,
    choices: [
      "All GPUs are operational and no action is needed",
      "GPU 1 has minor thermal issues and GPU 3 has a critical PCIe problem; the overall group health is Red because any Red GPU makes the group Red",
      "The group needs to be reconfigured because the health check is failing",
      "Only GPU 3 needs attention; GPU 1's Yellow status is informational",
    ],
    correctAnswer: 1,
    explanation:
      "DCGM health monitoring uses a traffic-light system: Green (healthy), Yellow (warning), Red (critical). GPU 1's Yellow for thermal violations means it is overheating but still functional. GPU 3's Red for PCIe replay count indicates the PCIe link is unstable and retransmitting packets, which degrades performance and may indicate a failing PCIe connection. The overall group health takes the worst status of any member.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-gpu-018",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which dcgmi command creates a named GPU group for targeted monitoring or diagnostics?",
    choices: [
      "dcgmi group --create --name my_gpus --add 0,1",
      "dcgmi group -c my_gpus -a 0,1",
      "dcgmi group --new my_gpus --gpus 0,1",
      "dcgmi create-group my_gpus 0,1",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi group -c (--create) creates a new group with a name, and -a (--add) adds GPU entity IDs to it. Groups allow you to target specific subsets of GPUs for diagnostics (dcgmi diag -g <groupId>), monitoring (dcgmi dmon -g <groupId>), and health checks (dcgmi health -g <groupId>). This is useful when managing systems with 8 GPUs where you want to isolate tests to specific GPUs.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-019",
    familyId: "gpu-monitoring",
    tool: "dcgmi",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A user reports that dcgmi commands return 'Unable to connect to host engine'. What is the most likely cause?",
    choices: [
      "The NVIDIA driver is not installed",
      "The nv-hostengine daemon (DCGM host engine) is not running and needs to be started with nv-hostengine or systemctl start nvidia-dcgm",
      "The user does not have GPU access permissions",
      "DCGM is not compatible with the installed GPU model",
    ],
    correctAnswer: 1,
    explanation:
      "DCGM operates on a client-server architecture. The nv-hostengine daemon (or nvidia-dcgm systemd service) must be running for dcgmi commands to function. dcgmi is a CLI client that communicates with the host engine over a socket. If the host engine is not running, all dcgmi commands will fail with the connection error. Start it with 'nv-hostengine' (standalone) or 'systemctl start nvidia-dcgm' (systemd).",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-020",
    familyId: "gpu-monitoring",
    tool: "nvtop",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "While running nvtop, which keyboard key sorts the process list by GPU utilization?",
    choices: [
      "Press 'u' to sort by utilization",
      "Press 'g' to sort by GPU percentage",
      "Press F6 or use the sort menu to select the sort column",
      "Press 's' to switch sort order",
    ],
    correctAnswer: 2,
    explanation:
      "nvtop uses function keys and an interactive menu for sorting. F6 opens the sort column selector where you can choose to sort by GPU usage, memory usage, PID, or other fields. The interface is similar to htop, providing an interactive way to analyze which processes consume the most GPU resources.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-021",
    familyId: "gpu-monitoring",
    tool: "nvtop",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "In nvtop, you observe GPU 0 showing 100% utilization and 80 GB/80 GB memory with temperature at 83C, while GPU 1-7 show 0% utilization and 0 GB memory. What does this suggest about the workload?",
    choices: [
      "A single-GPU training job is running and not using distributed training across all 8 GPUs",
      "GPUs 1-7 have hardware failures and are unavailable",
      "The workload is using MIG mode on GPU 0 only",
      "nvtop is only configured to show GPU 0",
    ],
    correctAnswer: 0,
    explanation:
      "When only one GPU out of 8 shows utilization in a DGX system, it typically means the workload is not configured for multi-GPU or distributed training. Deep learning frameworks like PyTorch require explicit configuration (DataParallel, DistributedDataParallel, or FSDP) to use multiple GPUs. This is a common oversight that leaves 7 GPUs idle while one is fully loaded.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-gpu-022",
    familyId: "gpu-monitoring",
    tool: "nvtop",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "What is the primary advantage of using nvtop over nvidia-smi -l for real-time GPU monitoring during a training job?",
    choices: [
      "nvtop can access more sensor data than nvidia-smi",
      "nvtop provides a continuously updating dashboard with historical graphs, per-process breakdowns, and interactive sorting without screen flicker",
      "nvtop works remotely while nvidia-smi does not",
      "nvtop supports monitoring non-NVIDIA GPUs",
    ],
    correctAnswer: 1,
    explanation:
      "nvtop provides a smooth interactive terminal UI similar to htop. It shows historical utilization graphs over time, per-process GPU and memory usage with interactive sorting, and updates in place without redrawing the entire screen. nvidia-smi -l redraws the full output each refresh, which is harder to read and does not show historical trends. nvtop is the preferred tool for live monitoring during training runs.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-gpu-023",
    familyId: "gpu-monitoring",
    tool: "nvsm",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which nvsm command displays active hardware alerts and warnings on a DGX system?",
    choices: [
      "nvsm show alerts",
      "nvsm dump alerts",
      "nvsm list warnings",
      "nvsm status --alerts",
    ],
    correctAnswer: 0,
    explanation:
      "nvsm show alerts displays current active alerts and warnings on a DGX system, including hardware failures, thermal events, and component degradation notices. This is a key command for proactive maintenance, allowing administrators to identify and address issues before they cause downtime. nvsm also supports 'show health' for overall health and 'dump' for detailed diagnostic data.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-gpu-024",
    familyId: "gpu-monitoring",
    tool: "nvsm",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "nvsm show health reports a 'degraded' status for the NVSwitch subsystem on a DGX H100. What is the recommended next step?",
    choices: [
      "Immediately power off the system and replace all NVSwitches",
      "Run nvidia-smi topo -m to verify the NVLink topology, then check nvsm show alerts for specific NVSwitch error details before planning maintenance",
      "Ignore it since DGX systems have redundant NVSwitches",
      "Reboot the system to clear the degraded status",
    ],
    correctAnswer: 1,
    explanation:
      "A degraded NVSwitch status does not necessarily mean total failure. First, verify which NVLink paths are affected using nvidia-smi topo -m and check nvsm show alerts for the specific error. DGX H100 systems have 4 NVSwitches; a single degraded switch reduces bisection bandwidth but the system may still operate. Gathering diagnostic details before scheduling maintenance avoids unnecessary downtime.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-gpu-025",
    familyId: "gpu-monitoring",
    tool: "nvsm",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "In a DGX SuperPOD deployment with 20 DGX nodes, what is the most effective way to use nvsm for fleet monitoring?",
    choices: [
      "SSH into each node individually and run nvsm show health",
      "Use nvsm's centralized fleet management to aggregate health data across all nodes and set up automated alerts for degraded components",
      "Rely solely on nvidia-smi on each node",
      "Only check nvsm when a user reports a problem",
    ],
    correctAnswer: 1,
    explanation:
      "nvsm is specifically designed for fleet-level management in DGX BasePOD and SuperPOD deployments. It can aggregate health status across all DGX nodes from a central point, providing a single-pane-of-glass view of the entire cluster. Automated alerting ensures degraded components are caught early. This proactive approach prevents cascading failures and reduces unplanned downtime across the fleet.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
];

// ============================================================================
// INFINIBAND TOOLS (tm-ib-001 through tm-ib-025)
// Tools: ibstat (7), perfquery (6), ibdiagnet (6), iblinkinfo (6)
// ============================================================================

const infinibandQuestions: ToolMasteryQuestion[] = [
  // ibstat (4 questions)
  {
    id: "tm-ib-001",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "output-interpretation",
    difficulty: "beginner",
    questionText: "What does this ibstat output tell you about port 1?",
    codeSnippet: `CA 'mlx5_0'
\tCA type: MT4129
\tNumber of ports: 1
\tFirmware version: 22.39.1002
\tPort 1:
\t\tState: Active
\t\tPhysical state: LinkUp
\t\tRate: 400 Gb/s (NDR)
\t\tBase lid: 5
\t\tLMC: 0
\t\tSM lid: 1
\t\tPort GUID: 0x0c42a10300f1a4e2
\t\tLink layer: InfiniBand`,
    choices: [
      "The port is down and needs to be reset",
      "The port is active, linked at NDR 400 Gb/s, and has been assigned LID 5 by the subnet manager",
      "The port is in initialization state and waiting for the subnet manager",
      "The port has a firmware error on the ConnectX-7 adapter",
    ],
    correctAnswer: 1,
    explanation:
      "State: Active means the port has completed link negotiation and is fully operational. Physical state: LinkUp confirms the physical cable connection is good. Rate 400 Gb/s (NDR) shows it is running at full NDR speed. Base lid: 5 indicates the subnet manager has assigned Local Identifier 5 to this port. MT4129 is the device ID for ConnectX-7 adapters.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-002",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "troubleshooting",
    difficulty: "intermediate",
    questionText:
      "An ibstat output shows State: Down and Physical state: Polling. What should you check first?",
    choices: [
      "Update the HCA firmware to the latest version",
      "Restart the opensm subnet manager daemon",
      "Check the physical cable connection, as Polling means the port is trying to establish a link but cannot",
      "Reboot the server to reinitialize the InfiniBand driver",
    ],
    correctAnswer: 2,
    explanation:
      "Physical state: Polling means the HCA port is actively trying to establish a physical link but has not succeeded. The most common cause is a disconnected, damaged, or improperly seated cable or transceiver. Check the physical cable connections first before investigating software issues like the subnet manager.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-003",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "An ibstat output shows State: Initializing and Physical state: LinkUp. What does this mean?",
    choices: [
      "The cable is bad and needs replacement",
      "The physical link is up but the subnet manager has not yet configured the port with a LID",
      "The HCA firmware is being updated",
      "The port speed is being auto-negotiated",
    ],
    correctAnswer: 1,
    explanation:
      "State: Initializing with Physical state: LinkUp means the physical cable connection is fine (LinkUp) but the port is waiting for the subnet manager (SM) to assign it a Local Identifier (LID) and complete logical configuration. Check if opensm is running and if the SM can reach this port through the fabric.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-004",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "Which ibstat flag produces a short one-line summary of each port instead of the full detailed output?",
    choices: ["ibstat -v", "ibstat -s", "ibstat -1", "ibstat --brief"],
    correctAnswer: 1,
    explanation:
      "ibstat -s (or --short) produces a condensed single-line-per-port summary showing just the CA name, port number, state, physical state, and rate. This is useful for quick checks across systems with multiple HCAs and ports.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },

  // perfquery (3 questions)
  {
    id: "tm-ib-005",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "In perfquery output, which counter is most concerning and indicates a potential cable or signal integrity issue?",
    codeSnippet: `# Port counters: Lid 5 port 1 (CapMask: 0x5300)
PortSelect:......................1
SymbolErrorCounter:..............1542
LinkErrorRecoveryCounter:........3
LinkDownedCounter:...............1
PortRcvErrors:...................287
PortRcvRemotePhysicalErrors:.....0
PortRcvSwitchRelayErrors:........0
PortXmitDiscards:................0
PortXmitConstraintErrors:........0
PortRcvConstraintErrors:.........0`,
    choices: [
      "PortXmitDiscards at 0 means the port is not transmitting data",
      "SymbolErrorCounter at 1542 indicates physical layer signal integrity problems likely caused by a bad cable or connector",
      "LinkDownedCounter at 1 is normal and just shows the port was initialized",
      "PortRcvRemotePhysicalErrors at 0 confirms there are no issues",
    ],
    correctAnswer: 1,
    explanation:
      "SymbolErrorCounter tracks 8b/10b or 64b/66b encoding errors at the physical layer. A count of 1542 is abnormally high and typically indicates cable degradation, a dirty connector, or a marginal transceiver. Combined with 287 PortRcvErrors and 3 LinkErrorRecoveryCounter events, this port has significant physical layer issues requiring cable inspection or replacement.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-006",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "flags-options",
    difficulty: "advanced",
    questionText: "What does the perfquery -x flag do?",
    choices: [
      "Exports the counters in XML format",
      "Shows extended 64-bit port counters instead of the default 32-bit counters",
      "Performs an extended diagnostic test on the port",
      "Resets all counters to zero after displaying them",
    ],
    correctAnswer: 1,
    explanation:
      "perfquery -x queries the extended 64-bit port counters (PortCountersExtended). The default perfquery uses 32-bit counters which can wrap around on high-bandwidth links (especially NDR at 400 Gb/s). The -x flag is essential for accurate bandwidth measurement on modern high-speed InfiniBand fabrics.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-007",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "You want to measure actual data throughput on an InfiniBand port over a 10-second interval. What is the correct approach using perfquery?",
    choices: [
      "Run perfquery -x once and divide the byte counters by uptime",
      "Run perfquery -x, wait 10 seconds, run perfquery -x again, and calculate the difference in PortXmitData and PortRcvData",
      "Run perfquery with the -d 10 flag to specify a 10-second duration",
      "Use perfquery --bandwidth to directly display throughput in Gb/s",
    ],
    correctAnswer: 1,
    explanation:
      "perfquery displays cumulative counters since the last reset, not rates. To measure throughput over an interval, you must take two readings with -x (for 64-bit counters) and calculate the difference. PortXmitData and PortRcvData count data octets (divided by 4). There is no built-in rate or bandwidth flag in perfquery.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },

  // ibdiagnet (3 questions)
  {
    id: "tm-ib-008",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What is the primary purpose of running ibdiagnet on an InfiniBand fabric?",
    choices: [
      "To configure switch routing tables",
      "To perform a comprehensive fabric-wide diagnostic scan checking topology, routing, error counters, and link health",
      "To update firmware on all InfiniBand switches",
      "To benchmark RDMA throughput between nodes",
    ],
    correctAnswer: 1,
    explanation:
      "ibdiagnet performs a comprehensive scan of the entire InfiniBand fabric. It checks link health, error counters on all ports, routing consistency, topology validation, and can detect duplicate GUIDs or LIDs. It requires root privileges and is typically run as a pre-deployment validation step or when troubleshooting fabric-wide issues.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-009",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which ibdiagnet output files are generated by default and where are they stored?",
    choices: [
      "A single ibdiagnet.log in the current directory",
      "Multiple files in /var/tmp/ibdiagnet2/ including ibdiagnet2.log, ibdiagnet2.db_csv, ibdiagnet2.net_dump, and others",
      "A single JSON report in /var/log/ibdiagnet/",
      "Reports are only displayed on stdout and not saved to files",
    ],
    correctAnswer: 1,
    explanation:
      "ibdiagnet2 generates multiple output files in /var/tmp/ibdiagnet2/ by default. Key files include ibdiagnet2.log (main log), ibdiagnet2.db_csv (database of all nodes and ports), ibdiagnet2.net_dump (topology dump), and ibdiagnet2.pm (performance counter data). The output directory can be changed with the -o flag.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-010",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      'ibdiagnet reports "Duplicated Node GUIDs" in the fabric. What does this error indicate?',
    choices: [
      "Two switches have the same firmware version",
      "Two nodes in the fabric have the same GUID, which is typically caused by cloning VMs with virtual HCAs or a manufacturing defect",
      "The subnet manager has assigned duplicate LIDs",
      "Two cables are connected between the same pair of switches",
    ],
    correctAnswer: 1,
    explanation:
      "Duplicated Node GUIDs means two separate nodes in the fabric share the same globally unique identifier. GUIDs should be unique per HCA. This can occur when virtual machines with virtual InfiniBand HCAs are cloned without regenerating GUIDs, or in rare cases from manufacturing defects. Duplicate GUIDs cause routing failures because the subnet manager cannot distinguish between the two nodes.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },

  // iblinkinfo (3 questions)
  {
    id: "tm-ib-011",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which iblinkinfo flag limits the output to show only InfiniBand switch connections?",
    choices: [
      "iblinkinfo --switches-only",
      "iblinkinfo -s",
      "iblinkinfo --filter switch",
      "iblinkinfo --type=switch",
    ],
    correctAnswer: 0,
    explanation:
      "iblinkinfo --switches-only filters the output to display only links between switches, omitting HCA (host) connections. This is useful for examining the switch-level fabric topology without the clutter of all host connections.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-012",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this iblinkinfo output tell you about the link?",
    codeSnippet: `0x0c42a10300f1a4e0 "dgx-01 mlx5_0" 1  ==( NDR  )==>  1 "MF0;QM3400:switch1/U1" ( )
0x0c42a10300f1a4e2 "dgx-01 mlx5_1" 1  ==(  4X  )==>  2 "MF0;QM3400:switch1/U1" ( )`,
    choices: [
      "Both links are running at the same speed",
      "The first link is at full NDR speed, but the second shows only 4X width without a speed label, indicating it may be running at a reduced rate",
      "The 4X means four times the NDR bandwidth",
      "Both links are connected to different switches",
    ],
    correctAnswer: 1,
    explanation:
      'In iblinkinfo output, the link description between ==( and )==> shows speed and width. The first link shows NDR (400 Gb/s). The second shows only "4X" (width) without a speed designation, which may indicate the link negotiated at a reduced rate or iblinkinfo could not read the full speed info. Both connect to the same switch (switch1) but on different ports. This warrants investigation.',
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-013",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "After replacing a cable between two InfiniBand switches, what is the best way to verify the new link is operating correctly?",
    choices: [
      "Run nvidia-smi to check GPU connectivity",
      "Run iblinkinfo to confirm the link is at the expected speed and width, then run perfquery on both switch ports to verify zero error counters",
      "Simply check if ibstat shows Active state on any host port",
      "Reboot both switches and check syslog",
    ],
    correctAnswer: 1,
    explanation:
      "After cable replacement, iblinkinfo verifies the new link speed and width match expectations (e.g., NDR 4X). Then perfquery on both switch ports confirms the error counters are at zero after the cable swap. If SymbolErrorCounter or PortRcvErrors start accumulating on the new cable, it may also be faulty.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-014",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "How do you use ibstat to display information for a specific HCA by name?",
    choices: [
      "ibstat --device mlx5_0",
      "ibstat mlx5_0",
      "ibstat -d mlx5_0",
      "ibstat --hca mlx5_0",
    ],
    correctAnswer: 1,
    explanation:
      "ibstat accepts a CA (Channel Adapter) name as a positional argument. Running 'ibstat mlx5_0' displays information only for that specific HCA. On a DGX system with multiple HCAs (mlx5_0 through mlx5_7), this filters the output to a single adapter. Without a CA name, ibstat shows all HCAs.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-015",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this ibstat output indicate about the port's link speed?",
    codeSnippet: `CA 'mlx5_0'
\tCA type: MT4129
\tNumber of ports: 1
\tFirmware version: 22.39.1002
\tPort 1:
\t\tState: Active
\t\tPhysical state: LinkUp
\t\tRate: 200 Gb/s (HDR)
\t\tBase lid: 12
\t\tSM lid: 1`,
    choices: [
      "The port is running at the maximum NDR speed for ConnectX-7",
      "The port is running at HDR (200 Gb/s) despite the MT4129 (ConnectX-7) supporting NDR (400 Gb/s), which means the link has negotiated at a reduced speed",
      "HDR 200 Gb/s is the maximum speed for this adapter",
      "The port is inactive and waiting for speed negotiation",
    ],
    correctAnswer: 1,
    explanation:
      "MT4129 is the ConnectX-7 adapter which supports NDR (400 Gb/s). Showing HDR (200 Gb/s) means the link negotiated at half the maximum speed. This can be caused by a cable rated only for HDR, a remote port that only supports HDR, a partially damaged cable, or a switch port configured for HDR. The cable and remote port should be investigated.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-016",
    familyId: "infiniband-tools",
    tool: "ibstat",
    category: "conceptual",
    difficulty: "beginner",
    questionText:
      "What is the difference between the 'State' and 'Physical state' fields in ibstat output?",
    choices: [
      "They show the same information in different formats",
      "State shows the logical/protocol status (Active, Down, Initializing) while Physical state shows the physical layer link status (LinkUp, Polling, Disabled)",
      "State is for InfiniBand mode and Physical state is for Ethernet mode",
      "Physical state is updated in real-time while State is cached",
    ],
    correctAnswer: 1,
    explanation:
      "These are two separate layers of the InfiniBand port status. Physical state reflects the physical cable/transceiver link (LinkUp means cable connected and signal OK, Polling means trying to establish link). State reflects the logical protocol layer (Active means the subnet manager has configured the port, Initializing means waiting for SM configuration). A port can be Physical state: LinkUp but State: Initializing if the SM has not yet assigned a LID.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-017",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText:
      "What does this perfquery extended counters output tell you about the port's traffic?",
    codeSnippet: `$ perfquery -x 5 1
# Port extended counters: Lid 5 port 1
PortSelect:......................1
PortXmitData:....................982451678234
PortRcvData:.....................456789012345
PortXmitPkts:....................1234567890
PortRcvPkts:.....................987654321
PortUnicastXmitPkts:.............1234567800
PortUnicastRcvPkts:..............987654200
PortMulticastXmitPkts:...........90
PortMulticastRcvPkts:............121`,
    choices: [
      "The port is transmitting more data than receiving, indicating a possible routing loop",
      "The port shows highly asymmetric traffic (transmitting ~2x more data than receiving), which is normal for a storage server or data source node, with minimal multicast traffic",
      "The high multicast packet count indicates a broadcast storm",
      "The counters are about to overflow and need to be reset",
    ],
    correctAnswer: 1,
    explanation:
      "The extended 64-bit counters show PortXmitData (~982B octets) is roughly double PortRcvData (~457B octets). This asymmetry is common for nodes that serve data (storage servers, data sources). The multicast counts (90/121) are very low relative to unicast, indicating normal point-to-point traffic. These 64-bit counters (-x flag) avoid the wrapping issues of default 32-bit counters on high-speed links.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-018",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "After clearing port counters, perfquery shows PortRcvErrors climbing rapidly on a specific switch port. All other ports on the same switch are clean. What is the most likely cause?",
    choices: [
      "The switch firmware is corrupted and needs to be reflashed",
      "The cable connected to that specific port is damaged or the transceiver is failing, since the issue is isolated to one port",
      "The host connected to that port has a driver bug",
      "The subnet manager is misconfiguring that port's routing",
    ],
    correctAnswer: 1,
    explanation:
      "When PortRcvErrors accumulate rapidly on a single switch port while all other ports are clean, the problem is almost certainly the physical connection on that specific port. The cable or transceiver attached to that port is the most likely culprit. Swap the cable first, then the transceiver if available. If the errors follow the cable to a different port, the cable is confirmed bad. If errors remain on the same port after cable swap, the switch port itself may be faulty.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-019",
    familyId: "infiniband-tools",
    tool: "perfquery",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "What do the two positional arguments in 'perfquery 5 1' specify?",
    choices: [
      "GPU ID 5 and NVLink lane 1",
      "LID (Local Identifier) 5 and port number 1 of the target device",
      "Switch ID 5 and host ID 1",
      "The first 5 ports starting from port 1",
    ],
    correctAnswer: 1,
    explanation:
      "perfquery takes a LID (Local Identifier) and port number as positional arguments. 'perfquery 5 1' queries the performance counters for LID 5, port 1. The LID is assigned by the subnet manager and can be found via ibstat (Base lid field) or via the subnet manager's LID table. Without arguments, perfquery queries the local HCA's first port.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-020",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which ibdiagnet flag collects port counters from all ports in the fabric?",
    choices: [
      "ibdiagnet --counters",
      "ibdiagnet --pc",
      "ibdiagnet -p",
      "ibdiagnet --perf-all",
    ],
    correctAnswer: 1,
    explanation:
      "ibdiagnet --pc (port counters) collects performance and error counters from every port discovered in the fabric. The counter data is saved to the ibdiagnet2.pm file in the output directory (/var/tmp/ibdiagnet2/). This is invaluable for identifying ports with high error rates across the entire fabric in a single sweep.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-021",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "ibdiagnet reports the following warning. What does it mean?",
    codeSnippet: `-W- Link at the expected speed NDR but width is 2X instead of 4X
    Source: "dgx-05 HCA-1"/1 (lid 42)
    Destination: "MF0;QM3400:leaf-sw3"/15 (lid 3)`,
    choices: [
      "The link is running at double speed because 2X means two times faster",
      "The link negotiated at half the expected width (2X instead of 4X), reducing bandwidth from 400 Gb/s to 200 Gb/s, likely due to a damaged cable with broken lanes",
      "This is an informational message and no action is needed",
      "The switch port needs to be reconfigured for 4X width",
    ],
    correctAnswer: 1,
    explanation:
      "NDR at 4X width provides 400 Gb/s. At 2X width, bandwidth drops to 200 Gb/s. Width degradation from 4X to 2X typically means 2 of the 4 lanes in the cable or transceiver are non-functional. This is usually caused by a damaged cable (bent fibers), dirty connectors, or a partially failed transceiver. The cable should be inspected and replaced.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-022",
    familyId: "infiniband-tools",
    tool: "ibdiagnet",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "When should ibdiagnet be run as part of a standard cluster deployment workflow?",
    choices: [
      "Only when users report network performance issues",
      "After all InfiniBand cabling is complete and the subnet manager is running, as a pre-deployment fabric validation step before running workloads",
      "Only during the initial cable installation, never after",
      "Monthly during production, while jobs are running",
    ],
    correctAnswer: 1,
    explanation:
      "ibdiagnet should be run as a standard pre-deployment validation step after the InfiniBand fabric is fully cabled and the subnet manager has configured all ports. It validates the entire fabric topology, checks for cabling errors, mismatched speeds, duplicate GUIDs, and port errors. Running it before deployment catches issues that would cause hard-to-diagnose performance problems later.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-023",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which iblinkinfo flag displays the output in a compact line-by-line format?",
    choices: [
      "iblinkinfo --line",
      "iblinkinfo --compact",
      "iblinkinfo -1",
      "iblinkinfo --brief",
    ],
    correctAnswer: 0,
    explanation:
      "iblinkinfo --line produces a compact one-line-per-link format that is easier to parse and grep through than the default multi-line format. Each line shows the source and destination ports, their LIDs, and the link speed and width. This format is especially useful for scripting and when searching for specific links in a large fabric.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-024",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "iblinkinfo shows several links between two leaf switches at NDR 4X, but one link between them shows 'Down'. What is the impact and what should you investigate?",
    choices: [
      "The entire path between the switches is down and no traffic can flow",
      "The down link reduces the aggregate bandwidth between those switches; check the cable, reseat connectors, and verify the switch port LEDs before replacing the cable",
      "The switches will automatically reroute all traffic around the down link with no performance impact",
      "The subnet manager will crash because of the inconsistent link state",
    ],
    correctAnswer: 1,
    explanation:
      "InfiniBand fabrics often have multiple links (link aggregation/trunking) between switches for higher aggregate bandwidth. A single down link reduces total inter-switch bandwidth but does not cause complete connectivity loss. The physical layer should be investigated: check cable seating, look for bent fibers, check switch port LEDs, and try swapping the cable. The subnet manager will reroute traffic around the down link, but at reduced bandwidth.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
  {
    id: "tm-ib-025",
    familyId: "infiniband-tools",
    tool: "iblinkinfo",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "What is the most efficient way to use iblinkinfo to check if all links in the fabric are running at the expected NDR 4X speed?",
    choices: [
      "Manually inspect each line of the full iblinkinfo output",
      "Run iblinkinfo and grep for lines that do NOT contain 'NDR' or show unexpected speeds to quickly identify degraded links",
      "Run ibstat on each node individually",
      "Only check switch-to-switch links since host links are always correct",
    ],
    correctAnswer: 1,
    explanation:
      "Piping iblinkinfo output through grep to filter for links not at the expected speed is a quick way to identify any links running below NDR 4X. For example, searching for lines containing 'HDR' or 'Down' or missing 'NDR' highlights problem links. In a large fabric with hundreds of links, this approach finds issues in seconds rather than requiring manual inspection of every line.",
    examRelevance: "NCP-AII Domain 2: Physical Layer Management",
  },
];

// ============================================================================
// BMC & HARDWARE (tm-bmc-001 through tm-bmc-025)
// Tools: ipmitool (8), sensors (7), dmidecode (7)
// ============================================================================

const bmcHardwareQuestions: ToolMasteryQuestion[] = [
  // ipmitool (5 questions)
  {
    id: "tm-bmc-001",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which ipmitool command displays the System Event Log (SEL) with human-readable event descriptions?",
    choices: [
      "ipmitool sel list",
      "ipmitool sel elist",
      "ipmitool event list",
      "ipmitool log show",
    ],
    correctAnswer: 1,
    explanation:
      'ipmitool sel elist displays the System Event Log with extended human-readable descriptions of each event. The plain "sel list" shows a more compact format with hex event codes. The SEL contains hardware events like temperature thresholds, power supply failures, memory errors, and other critical platform events.',
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-002",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this ipmitool sel elist output indicate?",
    codeSnippet: `$ ipmitool sel elist
   1 | 02/10/2026 | 14:23:05 | Memory #0x48 | Correctable ECC | Asserted
   2 | 02/10/2026 | 14:23:06 | Memory #0x48 | Correctable ECC | Asserted
   3 | 02/10/2026 | 14:23:06 | Memory #0x48 | Correctable ECC | Asserted
   4 | 02/10/2026 | 14:25:12 | Memory #0x48 | Uncorrectable ECC | Asserted
   5 | 02/10/2026 | 14:25:12 | Critical Interrupt #0x72 | Bus Correctable Error | Asserted`,
    choices: [
      "Normal memory operation with expected ECC corrections",
      "A DIMM at sensor 0x48 is failing, showing escalating correctable ECC errors followed by an uncorrectable ECC error",
      "The BMC firmware is generating false alarms and should be updated",
      "The memory controller needs reconfiguration",
    ],
    correctAnswer: 1,
    explanation:
      "Multiple correctable ECC events on the same sensor (0x48) in rapid succession followed by an uncorrectable ECC error is a classic pattern of a failing DIMM. Correctable errors are handled transparently, but when they increase rapidly, they often precede uncorrectable errors that cause data corruption or system crashes. The affected DIMM should be identified and replaced.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-003",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which ipmitool command retrieves the Field Replaceable Unit (FRU) information including serial number and part number?",
    choices: [
      "ipmitool fru print 0",
      "ipmitool chassis identify",
      "ipmitool sdr list",
      "ipmitool mc info",
    ],
    correctAnswer: 0,
    explanation:
      "ipmitool fru print 0 reads the FRU inventory area 0 (main board) and displays the board manufacturer, product name, serial number, part number, and asset tag. FRU data is stored in EEPROM on the baseboard and is essential for hardware inventory tracking and warranty claims.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-004",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A remote DGX node is unresponsive to SSH. You have BMC network access. What is the correct ipmitool sequence to perform an out-of-band power cycle?",
    choices: [
      "ipmitool -I lanplus -H <bmc-ip> -U admin -P <pass> chassis power cycle",
      "ipmitool -I lanplus -H <bmc-ip> -U admin -P <pass> chassis power off && sleep 5 && ipmitool -I lanplus -H <bmc-ip> -U admin -P <pass> chassis power on",
      "ipmitool -I lan -H <bmc-ip> chassis power reset",
      "Both A and B are valid approaches, but A is preferred as it is atomic",
    ],
    correctAnswer: 3,
    explanation:
      'Both "chassis power cycle" (atomic off+on) and separate "power off" then "power on" commands work. However, "power cycle" is preferred because it is a single atomic operation handled by the BMC. The -I lanplus flag uses IPMI v2.0 with encryption (RMCP+), which is more secure than -I lan. The power cycle command is the standard out-of-band recovery method when a server is unresponsive.',
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-005",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "Before performing maintenance on a DGX node, which ipmitool command should you run to capture a baseline of all sensor readings?",
    choices: [
      "ipmitool sel elist",
      "ipmitool sensor list",
      "ipmitool sdr list",
      "ipmitool chassis status",
    ],
    correctAnswer: 1,
    explanation:
      'ipmitool sensor list displays all hardware sensor readings including temperatures, voltages, fan speeds, and power consumption with their current values, thresholds, and status. Capturing this before maintenance provides a baseline to compare against post-maintenance readings to verify no new issues were introduced. "sdr list" shows the Sensor Data Repository which lists sensors but with less detail on thresholds.',
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },

  // sensors (4 questions)
  {
    id: "tm-bmc-006",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "output-interpretation",
    difficulty: "beginner",
    questionText: "What does this lm-sensors output indicate?",
    codeSnippet: `coretemp-isa-0000
Adapter: ISA adapter
Core 0:       +82.0\u00b0C  (high = +100.0\u00b0C, crit = +110.0\u00b0C)
Core 1:       +79.0\u00b0C  (high = +100.0\u00b0C, crit = +110.0\u00b0C)
Core 2:       +81.0\u00b0C  (high = +100.0\u00b0C, crit = +110.0\u00b0C)
Core 3:       +99.0\u00b0C  (high = +100.0\u00b0C, crit = +110.0\u00b0C)  ALARM`,
    choices: [
      "All CPU cores are within safe operating temperatures",
      "Core 3 is at its high threshold and in ALARM state, indicating it is approaching critical temperature",
      "The sensor is reporting in Fahrenheit and temperatures are normal",
      "The coretemp driver is malfunctioning",
    ],
    correctAnswer: 1,
    explanation:
      "Core 3 at 99.0C is at the high threshold (100.0C) and the ALARM flag is shown. While not yet at the critical threshold (110.0C, where thermal shutdown occurs), this core is running dangerously hot. Possible causes include a failing fan, dried thermal paste, blocked airflow, or excessive workload on that core. The issue should be investigated before it reaches the critical threshold.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-007",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "What must you run before the sensors command will produce output on a new Linux installation?",
    choices: [
      "sensors --configure",
      "sensors-detect to probe for and configure hardware monitoring chips",
      "modprobe lm-sensors",
      "systemctl start sensors",
    ],
    correctAnswer: 1,
    explanation:
      "sensors-detect is an interactive script that probes for available hardware monitoring chips (Super I/O, SMBus, ACPI, ISA) and loads the appropriate kernel modules. Without running sensors-detect first, the sensors command may not find any monitoring chips and produce no output. On many server distributions, the required modules are auto-loaded, but sensors-detect ensures proper configuration.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-008",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "troubleshooting",
    difficulty: "intermediate",
    questionText:
      "The sensors command shows all fan speeds at 0 RPM but the system is running normally. What is the most likely explanation?",
    choices: [
      "All fans have failed and the system will overshoot shortly",
      "The fan speed sensors may not be supported by the loaded monitoring driver, or the fans are controlled by the BMC and not visible through in-band sensor readings",
      "The system uses passive cooling with no fans",
      "The sensors configuration file is corrupted",
    ],
    correctAnswer: 1,
    explanation:
      "On many server platforms, including DGX systems, fan control is managed by the BMC (Baseboard Management Controller) and fan speed readings are only available through IPMI (ipmitool sensor list), not through in-band lm-sensors. If the system is running normally with reasonable temperatures, this is likely a sensor visibility issue rather than actual fan failure.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-009",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What is the difference between the sensors command (lm-sensors) and ipmitool sensor readings?",
    choices: [
      "They read the same sensors through the same interface",
      "sensors uses in-band kernel drivers to read monitoring chips directly, while ipmitool reads sensors through the BMC over the IPMI interface",
      "sensors can only read temperature, while ipmitool reads all sensor types",
      "ipmitool is faster because it reads from the BMC cache",
    ],
    correctAnswer: 1,
    explanation:
      "lm-sensors uses in-band Linux kernel drivers (like coretemp, nct6775) to directly access hardware monitoring chips on the motherboard. ipmitool communicates with the BMC (Baseboard Management Controller) over the KCS or BT interface to read sensor data managed by the BMC firmware. The BMC may expose different or additional sensors not available to in-band drivers, and vice versa.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },

  // dmidecode (4 questions)
  {
    id: "tm-bmc-010",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which dmidecode command shows the system memory configuration including DIMM sizes, speeds, and slot locations?",
    choices: [
      "dmidecode -t memory",
      "dmidecode -t cpu",
      "dmidecode --memory-info",
      "dmidecode -s memory-size",
    ],
    correctAnswer: 0,
    explanation:
      "dmidecode -t memory (or --type memory, or --type 17 for individual DIMM entries) displays Memory Device entries from SMBIOS. This shows each DIMM slot with its size, speed, type (DDR4/DDR5), manufacturer, serial number, and part number. This is essential for verifying memory configuration during system bring-up.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-011",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this dmidecode output tell you about the memory configuration?",
    codeSnippet: `Memory Device
\tSize: 64 GB
\tForm Factor: DIMM
\tLocator: DIMM_A0
\tType: DDR5
\tSpeed: 4800 MT/s
\tConfigured Memory Speed: 4400 MT/s
\tManufacturer: Samsung
\tPart Number: M321R8GA0BB0-CQKZJ`,
    choices: [
      "The DIMM is running at its full rated speed",
      "The DIMM is rated for 4800 MT/s but is configured to run at 4400 MT/s, possibly due to BIOS settings or mixed-speed DIMM population",
      "The DIMM is faulty because the speeds do not match",
      "The 4400 MT/s is the read speed and 4800 MT/s is the write speed",
    ],
    correctAnswer: 1,
    explanation:
      'The "Speed" field shows the DIMM\'s maximum rated speed (4800 MT/s) while "Configured Memory Speed" shows the actual operating speed (4400 MT/s). This mismatch commonly occurs when DIMMs of different speed ratings are mixed in the same system, causing all DIMMs to run at the lowest common speed, or when BIOS settings are not optimized.',
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-012",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which dmidecode command extracts just the BIOS version string without showing all other SMBIOS data?",
    choices: [
      "dmidecode -t bios | grep Version",
      "dmidecode -s bios-version",
      "dmidecode --bios-version",
      "dmidecode -q -t 0",
    ],
    correctAnswer: 1,
    explanation:
      "dmidecode -s bios-version uses the --string option to output only the BIOS version string with no other data. The -s flag supports various keywords including bios-version, bios-release-date, system-manufacturer, system-product-name, system-serial-number, and baseboard-serial-number. This is ideal for scripting.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-013",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "During system bring-up of a new DGX node, which dmidecode information is most critical to verify before starting GPU workloads?",
    choices: [
      "The chassis asset tag string",
      "The system UUID for license management",
      "The total installed memory (dmidecode -t memory) and CPU count/model (dmidecode -t processor) to confirm hardware matches the expected BOM",
      "The BIOS vendor name",
    ],
    correctAnswer: 2,
    explanation:
      "During system bring-up, verifying that the installed hardware matches the Bill of Materials (BOM) is essential. dmidecode -t memory confirms all DIMM slots are populated with the correct capacity and speed. dmidecode -t processor confirms the correct CPU model and count. Missing or incorrect hardware would impact GPU workload performance and should be caught before deployment.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-014",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which ipmitool command displays the BMC firmware version and manufacturer information?",
    choices: [
      "ipmitool bmc info",
      "ipmitool mc info",
      "ipmitool chassis identify",
      "ipmitool fru print",
    ],
    correctAnswer: 1,
    explanation:
      "ipmitool mc info (management controller info) displays the BMC firmware version, manufacturer ID, IPMI specification version, and device ID. This is essential during system bring-up to verify the BMC firmware is at the expected version before deploying workloads.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-015",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this ipmitool sensor output indicate?",
    codeSnippet: `$ ipmitool sensor list | grep -i fan
Fan1             | 8400.000   | RPM  | ok    | 600.000  | 900.000  | na  | na  | 25000.000 | 25400.000
Fan2             | 8500.000   | RPM  | ok    | 600.000  | 900.000  | na  | na  | 25000.000 | 25400.000
Fan3             | 0.000      | RPM  | cr    | 600.000  | 900.000  | na  | na  | 25000.000 | 25400.000
Fan4             | 8350.000   | RPM  | ok    | 600.000  | 900.000  | na  | na  | 25000.000 | 25400.000`,
    choices: [
      "All fans are operating normally within thresholds",
      "Fan3 is reading 0 RPM with a critical (cr) status, indicating the fan has failed or is disconnected; the lower critical threshold is 600 RPM",
      "Fan3 is temporarily stopped for noise reduction",
      "The sensor is miscalibrated and the fan is actually spinning",
    ],
    correctAnswer: 1,
    explanation:
      "Fan3 shows 0 RPM with status 'cr' (critical). The lower critical threshold is 600 RPM, and 0 RPM means the fan is not spinning at all. This is a hardware failure requiring immediate attention, as inadequate cooling will lead to thermal shutdown. The system should be scheduled for fan replacement before thermal damage occurs to GPUs or CPUs.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-016",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which ipmitool command configures the BMC network settings for remote out-of-band management?",
    choices: [
      "ipmitool lan set 1 ipaddr 10.0.1.100",
      "ipmitool network set 10.0.1.100",
      "ipmitool bmc network --ip 10.0.1.100",
      "ipmitool config lan ip=10.0.1.100",
    ],
    correctAnswer: 0,
    explanation:
      "ipmitool lan set <channel> <parameter> <value> configures BMC networking. Channel 1 is typically the dedicated BMC management port. Parameters include ipaddr, netmask, defgw ipaddr (default gateway), and ipsrc (static/dhcp). Example: 'ipmitool lan set 1 ipsrc static' followed by 'ipmitool lan set 1 ipaddr 10.0.1.100'. Verify with 'ipmitool lan print 1'.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-017",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this sensors output indicate about the power supply?",
    codeSnippet: `power_meter-acpi-0
Adapter: ACPI interface
power1:      2847.00 W  (interval = 1.000 s)

nct6775-isa-0a20
Adapter: ISA adapter
+12V:          +11.78 V  (min = +10.80 V, max = +13.20 V)
+5V:            +4.87 V  (min =  +4.50 V, max =  +5.50 V)
+3.3V:          +3.28 V  (min =  +2.97 V, max =  +3.63 V)`,
    choices: [
      "All voltages are critically low and the power supply is failing",
      "The system is drawing 2847W total power and all voltage rails are within their acceptable min/max thresholds, indicating normal operation",
      "The +12V rail at 11.78V is dangerously close to the minimum threshold",
      "The power supply is oversized for this system at 2847W",
    ],
    correctAnswer: 1,
    explanation:
      "All three voltage rails (+12V at 11.78V, +5V at 4.87V, +3.3V at 3.28V) are within their specified min/max ranges, indicating stable power delivery. The 2847W total power draw is typical for a DGX system under load with 8 GPUs. The +12V rail reading of 11.78V is within the 10.80-13.20V range and is not concerning.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-018",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "The sensors command shows a CPU VRM temperature reading of 105C with an ALARM flag. What is the likely impact on system performance?",
    choices: [
      "No impact; VRM temperatures are not related to CPU performance",
      "The CPU is likely being thermally throttled because the VRM (Voltage Regulator Module) is overheating, which can cause reduced clock speeds and power delivery instability",
      "The ALARM is cosmetic and only affects the sensor display",
      "The GPU will throttle because VRM temperature affects GPU power",
    ],
    correctAnswer: 1,
    explanation:
      "VRM (Voltage Regulator Module) overheating at 105C is a serious issue. VRMs convert the 12V input to the precise voltages the CPU requires. When VRMs overheat, they reduce power output to protect themselves, which forces the CPU to throttle. This can also cause voltage instability leading to system crashes. Common causes include blocked airflow, failed fans, or excessive sustained CPU load. VRM heatsink and airflow should be inspected.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-bmc-019",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "What is the recommended approach for monitoring sensor readings over time to detect gradual hardware degradation?",
    choices: [
      "Manually run the sensors command once a day and visually check for changes",
      "Script periodic sensor readings to a log file or monitoring system, and set alerts when values approach warning thresholds or show consistent upward/downward trends",
      "Only check sensors when a hardware failure occurs",
      "Replace all hardware annually regardless of sensor readings",
    ],
    correctAnswer: 1,
    explanation:
      "Proactive monitoring involves scripting periodic 'sensors' output collection (e.g., via cron) and feeding the data to a time-series monitoring system like Prometheus, Grafana, or Nagios. Setting threshold-based alerts catches degradation early. For example, a CPU temperature trending upward over weeks may indicate thermal paste degradation or fan bearing wear before an actual failure occurs.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-020",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this dmidecode output reveal about a DIMM slot?",
    codeSnippet: `Memory Device
\tTotal Width: Unknown
\tData Width: Unknown
\tSize: No Module Installed
\tForm Factor: Unknown
\tLocator: DIMM_P1_G2
\tBank Locator: NODE 1
\tType: Unknown
\tSpeed: Unknown`,
    choices: [
      "The DIMM is installed but its speed could not be read",
      "The DIMM slot DIMM_P1_G2 is empty (no module installed), which may indicate a missing DIMM if the BOM specifies full population",
      "The DIMM has failed and needs replacement",
      "The DIMM is running in single-channel mode",
    ],
    correctAnswer: 1,
    explanation:
      "When dmidecode shows 'Size: No Module Installed' with all other fields as Unknown, the physical DIMM slot is empty. During system bring-up, comparing this against the Bill of Materials (BOM) is critical. An empty slot where a DIMM should be installed means reduced memory capacity and potentially suboptimal memory channel configuration, which affects memory bandwidth.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-021",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which dmidecode command shows processor (CPU) information including model, speed, and core count?",
    choices: [
      "dmidecode -t processor",
      "dmidecode -t cpu",
      "dmidecode --cpu-info",
      "dmidecode -s processor-model",
    ],
    correctAnswer: 0,
    explanation:
      "dmidecode -t processor (or -t 4, since SMBIOS type 4 is Processor) displays detailed CPU information including the processor family, model name, maximum speed, current speed, core count, thread count, and socket designation. This is essential for verifying the CPU configuration matches the expected hardware specification during server bring-up.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-022",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which dmidecode command extracts the system serial number in a format suitable for inventory scripts?",
    choices: [
      "dmidecode -t system | grep Serial",
      "dmidecode -s system-serial-number",
      "dmidecode --serial",
      "dmidecode -q -t 1",
    ],
    correctAnswer: 1,
    explanation:
      "dmidecode -s system-serial-number uses the --string flag to output only the system serial number with no headers or extra text. This clean single-line output is ideal for scripting and inventory automation. The -s flag supports keywords like system-serial-number, system-product-name, system-manufacturer, bios-version, and baseboard-serial-number.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-023",
    familyId: "bmc-hardware",
    tool: "ipmitool",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "The ipmitool sel elist output shows 'SEL is full' and no new events are being recorded. What should you do?",
    choices: [
      "Replace the BMC battery to restore SEL storage",
      "Save the current SEL entries for analysis, then clear the SEL with 'ipmitool sel clear' to allow new events to be logged",
      "Reboot the system to automatically clear the SEL",
      "Upgrade the BMC firmware to increase SEL storage capacity",
    ],
    correctAnswer: 1,
    explanation:
      "The SEL (System Event Log) has a fixed size in the BMC's non-volatile storage. When full, new events are silently dropped, which means critical hardware events go unrecorded. The correct procedure is to first save the current entries (ipmitool sel elist > sel_backup.txt) for analysis, then clear the log (ipmitool sel clear) to make room for new events. Regular SEL harvesting should be automated to prevent this.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-024",
    familyId: "bmc-hardware",
    tool: "dmidecode",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What is the source of the data that dmidecode reads, and why does it require root privileges?",
    choices: [
      "dmidecode reads from the BIOS chip directly via SPI",
      "dmidecode reads SMBIOS/DMI tables from system firmware that are mapped into memory by the BIOS/UEFI, requiring root to access /dev/mem or /sys/firmware/dmi",
      "dmidecode queries the CPU directly for hardware information",
      "dmidecode reads from the BMC's sensor data repository",
    ],
    correctAnswer: 1,
    explanation:
      "dmidecode reads SMBIOS (System Management BIOS) tables that the BIOS/UEFI firmware populates during POST and maps into physical memory. On Linux, these are accessed either through /dev/mem (raw memory access) or /sys/firmware/dmi/tables/ (sysfs). Both require root privileges. The data includes hardware inventory information that the firmware collects about installed components.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-bmc-025",
    familyId: "bmc-hardware",
    tool: "sensors",
    category: "best-practice",
    difficulty: "beginner",
    questionText:
      "After running sensors-detect on a new system, what file stores the persistent configuration for which sensor modules to load at boot?",
    choices: [
      "/etc/sensors.conf",
      "/etc/modules-load.d/ or /etc/modprobe.d/ (depending on distribution), with modules detected by sensors-detect",
      "/var/lib/sensors/config",
      "/usr/share/sensors/drivers.conf",
    ],
    correctAnswer: 1,
    explanation:
      "sensors-detect probes for hardware monitoring chips and offers to add the required kernel modules to the system's module auto-loading configuration. On systemd-based systems, this is typically /etc/modules-load.d/lm-sensors.conf. On older systems, modules are added to /etc/modules. The sensors thresholds and label configuration is separate, stored in /etc/sensors3.conf or /etc/sensors.d/.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
];

// ============================================================================
// CLUSTER TOOLS (tm-clus-001 through tm-clus-025)
// Tools: sinfo (7), squeue (6), scontrol (6), sacct (6)
// ============================================================================

const clusterToolsQuestions: ToolMasteryQuestion[] = [
  // sinfo (4 questions)
  {
    id: "tm-clus-001",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "output-interpretation",
    difficulty: "beginner",
    questionText: "What do these sinfo node states mean?",
    codeSnippet: `$ sinfo -N -l
NODELIST    NODES PARTITION STATE      CPUS MEMORY  GRES
dgx-01          1 gpu*      idle       256  2048000 gpu:a100:8
dgx-02          1 gpu*      alloc      256  2048000 gpu:a100:8
dgx-03          1 gpu*      drain      256  2048000 gpu:a100:8
dgx-04          1 gpu*      down       256  2048000 gpu:a100:8`,
    choices: [
      "idle=available, alloc=has jobs, drain=being emptied for maintenance, down=unavailable/failed",
      "idle=powered off, alloc=booting, drain=updating, down=busy",
      "idle=no GPUs, alloc=GPUs allocated, drain=low memory, down=network issue",
      "All states mean the nodes are operational with different load levels",
    ],
    correctAnswer: 0,
    explanation:
      'In Slurm, "idle" means the node is available and not running any jobs. "alloc" (allocated) means all resources are assigned to running jobs. "drain" means the node is marked for maintenance; running jobs will complete but no new jobs will be scheduled. "down" means the node is unavailable, either due to failure or manual admin action.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-002",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which sinfo command shows only nodes that are in a drained state along with the reason they were drained?",
    choices: [
      "sinfo -t drain -R",
      "sinfo --state=drain --list-reasons",
      'sinfo -N -t drain -o "%N %T %E"',
      "Both A and C would show drained nodes with reasons",
    ],
    correctAnswer: 3,
    explanation:
      "sinfo -t drain filters to only drained nodes. The -R flag or the %E format specifier in -o (output format) both display the reason a node was drained. Option A uses -R for a reason summary, while option C uses a custom output format showing node name (%N), state (%T), and reason (%E). Both approaches are valid.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-003",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      'You see a node in "mixed" state in sinfo output. What does this mean?',
    choices: [
      "The node has both CPU and GPU resources",
      "The node has some resources allocated to jobs and some resources still available for new jobs",
      "The node is running both batch and interactive jobs",
      "The node has a mix of healthy and faulty GPUs",
    ],
    correctAnswer: 1,
    explanation:
      'The "mixed" state in Slurm means the node is partially allocated. Some CPUs, memory, or GPUs are assigned to running jobs while the remaining resources are available for new job scheduling. This is common on large nodes like DGX systems with 8 GPUs where one job may use 4 GPUs, leaving the other 4 available.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-004",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which sinfo flag provides a node-oriented listing showing one line per node instead of summarized groups?",
    choices: ["sinfo -a", "sinfo -N", "sinfo --long", "sinfo -p all"],
    correctAnswer: 1,
    explanation:
      'sinfo -N (or --Node) switches to a node-oriented format showing one line per node. By default, sinfo groups nodes with the same state and partition together. The -N flag is commonly combined with -l (long format) as "sinfo -N -l" to get detailed per-node information.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },

  // squeue (3 questions)
  {
    id: "tm-clus-005",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "output-interpretation",
    difficulty: "beginner",
    questionText: "What do the PENDING job reasons in this squeue output mean?",
    codeSnippet: `$ squeue
JOBID  PARTITION  NAME      USER    ST  TIME   NODES NODELIST(REASON)
1001   gpu        train_llm alice   PD  0:00   4     (Priority)
1002   gpu        inference bob     PD  0:00   1     (Resources)
1003   gpu        eval      carol   R   2:15:30 2    dgx-[01-02]`,
    choices: [
      "Both pending jobs are waiting for the same reason",
      "Job 1001 is waiting because higher-priority jobs exist ahead of it; job 1002 is waiting because the requested resources (nodes/GPUs) are not currently available",
      "Job 1001 has been deprioritized by the admin; job 1002 has a resource request error",
      "Both jobs will start as soon as job 1003 completes",
    ],
    correctAnswer: 1,
    explanation:
      "(Priority) means the job is eligible to run but other jobs with higher priority are ahead of it in the queue. (Resources) means the job could run based on priority but the specific resources it requested (CPUs, GPUs, memory, or nodes) are currently in use. Job 1003 is running (ST=R) on dgx-01 and dgx-02.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-006",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which squeue command shows only your own jobs with a custom format including job ID, name, state, elapsed time, and node list?",
    choices: [
      'squeue -u $USER --format="%.18i %.30j %.8T %.10M %R"',
      "squeue --me --long",
      'squeue -u $USER -o "JobID,Name,State,Time,NodeList"',
      "squeue --user=$USER --verbose",
    ],
    correctAnswer: 0,
    explanation:
      "squeue -u $USER filters to your jobs. The --format flag uses printf-style field specifiers: %i=JobID, %j=JobName, %T=State (full word), %M=TimeUsed, %R=ReasonOrNodeList. The dot-number prefix (e.g., %.18i) specifies field width. This produces clean columnar output for monitoring your own job queue.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-007",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A user reports their job has been pending for 3 hours with reason (ReqNodeNotAvail, Reserved for maintenance). What does this mean and what should you check?",
    choices: [
      "The job requested a specific node that does not exist in the cluster",
      "One or more nodes that the job could run on are reserved or in a drain/down state, and there are not enough remaining nodes to satisfy the request",
      "The Slurm controller is down and not processing job requests",
      "The user does not have permission to submit jobs to that partition",
    ],
    correctAnswer: 1,
    explanation:
      'The reason "ReqNodeNotAvail, Reserved for maintenance" means that nodes the scheduler would assign to this job are currently drained or reserved. If the job requires more nodes than are available in non-drained state, it will wait indefinitely. Check "sinfo -t drain,down -R" to see which nodes are unavailable and why, and whether the maintenance window can be shortened.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },

  // scontrol (3 questions)
  {
    id: "tm-clus-008",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which scontrol command properly drains a node for maintenance with a reason message?",
    choices: [
      'scontrol update NodeName=dgx-03 State=DRAIN Reason="GPU replacement"',
      'scontrol drain dgx-03 "GPU replacement"',
      'scontrol set node dgx-03 --state=drain --reason="GPU replacement"',
      'scontrol node dgx-03 drain "GPU replacement"',
    ],
    correctAnswer: 0,
    explanation:
      'scontrol update NodeName=<node> State=DRAIN Reason="<text>" is the correct syntax. The "update" subcommand modifies Slurm entity properties. Setting State=DRAIN allows running jobs to finish but prevents new jobs from being scheduled. The Reason string is recorded and visible in sinfo -R output, providing an audit trail for why the node was drained.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-009",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      'After replacing a GPU and rebooting, a node still shows as "down" in Slurm. What scontrol command brings it back to service?',
    choices: [
      "scontrol update NodeName=dgx-03 State=IDLE",
      "scontrol update NodeName=dgx-03 State=RESUME",
      "scontrol reboot NodeName=dgx-03",
      "scontrol update NodeName=dgx-03 State=UNDRAIN",
    ],
    correctAnswer: 1,
    explanation:
      "scontrol update NodeName=<node> State=RESUME clears the down or drained state and returns the node to active service. State=IDLE would also work if the node is currently down (not drained). State=RESUME is the standard way to undo both DRAIN and DOWN states. The slurmd daemon must be running on the node for it to successfully resume.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-010",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which scontrol command shows the detailed configuration and current state of a specific node?",
    choices: [
      "scontrol info node dgx-01",
      "scontrol show node dgx-01",
      "scontrol status dgx-01",
      "scontrol describe node dgx-01",
    ],
    correctAnswer: 1,
    explanation:
      "scontrol show node <nodename> displays detailed information about a node including its state, reason (if drained/down), configured resources (CPUs, memory, GPUs), allocated resources, last boot time, Slurm version, and current load. This is the go-to command for detailed node troubleshooting.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },

  // sacct (3 questions)
  {
    id: "tm-clus-011",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which sacct command shows detailed resource usage for a completed job including elapsed time, maximum memory, and exit code?",
    choices: [
      "sacct -j 12345 --format=JobID,JobName,Elapsed,MaxRSS,ExitCode",
      "sacct --job 12345 --long",
      "sacct -j 12345 -v",
      "sacct --jobid=12345 --details",
    ],
    correctAnswer: 0,
    explanation:
      "sacct -j <jobid> queries a specific job. The --format flag selects which fields to display. Key fields include Elapsed (wall clock time), MaxRSS (maximum resident set size / peak memory), ExitCode (return code:signal), MaxVMSize (peak virtual memory), and CPUTime (total CPU time across all cores). Custom format strings are essential for job post-mortem analysis.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-012",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "What does this sacct output reveal about the failed job?",
    codeSnippet: `$ sacct -j 5678 --format=JobID,JobName,State,ExitCode,MaxRSS,Elapsed,NodeList
JobID        JobName    State      ExitCode  MaxRSS     Elapsed    NodeList
5678         train_gpt  FAILED     0:9       ---        1:23:45    dgx-01
5678.batch   batch      FAILED     0:9       1843200K   1:23:45    dgx-01
5678.0       orted      COMPLETED  0:0       52480K     1:23:42    dgx-01`,
    choices: [
      "The job ran out of memory (OOM killed)",
      "The job was killed by signal 9 (SIGKILL), which combined with MaxRSS near the memory limit suggests an out-of-memory kill by the kernel OOM killer or Slurm cgroup enforcement",
      "The job completed successfully but Slurm misreported the status",
      "The user cancelled the job with scancel",
    ],
    correctAnswer: 1,
    explanation:
      "ExitCode 0:9 means the process exited with return code 0 but was killed by signal 9 (SIGKILL). SIGKILL is the signal used by the Linux OOM (Out Of Memory) killer and by Slurm's cgroup memory enforcement when a job exceeds its memory allocation. MaxRSS of 1843200K (~1.8TB) for the batch step suggests the job consumed enormous memory. Check dmesg for OOM killer messages.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-013",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "You need to analyze GPU utilization patterns across all jobs in the past 7 days to justify a cluster expansion. Which sacct approach is best?",
    choices: [
      "sacct -a --starttime=now-7days --format=JobID,AllocTRES,Elapsed,State -P",
      'sacct --allusers --starttime=$(date -d "7 days ago" +%Y-%m-%d) --format=JobID,User,Partition,AllocTRES,Elapsed,State,ReqTRES -P --delimiter="|"',
      "sacct -a -S now-7days -o ALL",
      "sacct -a --json > usage.json",
    ],
    correctAnswer: 1,
    explanation:
      "Option B provides the most useful data for capacity analysis. --allusers shows all users (requires admin), --starttime filters the date range, --format includes AllocTRES (showing allocated GPUs) and ReqTRES (requested GPUs) to identify over-requesting. The -P flag with --delimiter produces parseable output. Comparing ReqTRES vs AllocTRES reveals whether users are requesting more GPUs than they utilize.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-014",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "Which sinfo command shows detailed long-format output including CPU count, memory, GRES (GPUs), and disk info?",
    choices: [
      "sinfo --verbose",
      "sinfo -l",
      "sinfo --detail",
      "sinfo -a --long-format",
    ],
    correctAnswer: 1,
    explanation:
      "sinfo -l (or --long) displays extended information including CPU count, allocated/idle/other/total, S:C:T (sockets:cores:threads), memory in MB, temporary disk space, node weight, available features, and GRES (Generic Resources such as GPUs). This is commonly combined with -N as 'sinfo -N -l' for per-node detailed listings.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-015",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this sinfo output tell you about the partition configuration?",
    codeSnippet: `$ sinfo -a
PARTITION  AVAIL  TIMELIMIT  NODES  STATE  NODELIST
gpu*       up     7-00:00:00   8    idle   dgx-[01-08]
debug      up     1:00:00      2    idle   dgx-[01-02]
priority   up     3-00:00:00   4    idle   dgx-[05-08]`,
    choices: [
      "There are 14 total nodes across three partitions",
      "The gpu partition is the default (indicated by *), allows 7-day jobs, and contains all 8 nodes; the debug partition limits jobs to 1 hour on 2 nodes; nodes can belong to multiple partitions",
      "The priority partition has dedicated nodes that cannot be used by other partitions",
      "Only the gpu partition is active because it has the asterisk",
    ],
    correctAnswer: 1,
    explanation:
      "The asterisk (*) on 'gpu*' indicates it is the default partition. Nodes can belong to multiple partitions simultaneously (dgx-01 and dgx-02 are in both gpu and debug). TIMELIMIT shows maximum job duration: 7 days for gpu, 1 hour for debug, 3 days for priority. All partitions show AVAIL=up. The 8 unique nodes serve all three partitions with different policies.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-016",
    familyId: "cluster-tools",
    tool: "sinfo",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "Which sinfo command is most useful for quickly generating a custom report of GPU availability across the cluster?",
    choices: [
      "sinfo -N -l | grep gpu",
      'sinfo -N -o "%N %P %T %G" --state=idle,mixed',
      "sinfo --json",
      "sinfo -a -t idle",
    ],
    correctAnswer: 1,
    explanation:
      "The -o (--format) flag with custom format specifiers provides targeted output: %N=NodeName, %P=Partition, %T=State, %G=GRES (GPUs). Filtering with --state=idle,mixed shows only nodes with available resources. This custom format produces clean output for dashboards or scripts that track GPU availability across the cluster.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-017",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "What does this squeue output indicate about job 2001?",
    codeSnippet: `$ squeue -j 2001 --format="%.18i %.30j %.8T %.10M %.9P %.6D %R"
JOBID                          NAME    STATE       TIME PARTITION  NODES NODELIST(REASON)
2001              multi_node_train  RUNNING   5:42:30       gpu      4 dgx-[01-04]`,
    choices: [
      "The job is pending and waiting for 4 nodes",
      "The job is running across 4 DGX nodes (dgx-01 through dgx-04) and has been executing for 5 hours and 42 minutes",
      "The job failed after 5 hours and 42 minutes",
      "The job is using 4 GPUs on a single node",
    ],
    correctAnswer: 1,
    explanation:
      "State RUNNING means the job is actively executing. NODES=4 with NODELIST=dgx-[01-04] shows it is a multi-node distributed job spanning 4 DGX systems. TIME of 5:42:30 is the elapsed wall-clock time. This is typical for large-scale distributed training jobs in HPC GPU clusters where multiple DGX nodes are used together.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-018",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which squeue flag shows the estimated start time for pending jobs?",
    choices: [
      "squeue --estimate",
      "squeue --start",
      "squeue -t PD --eta",
      "squeue --when",
    ],
    correctAnswer: 1,
    explanation:
      "squeue --start displays the estimated start time for pending jobs based on the scheduler's backfill calculations. This helps users understand when their queued jobs are expected to begin. The estimate depends on the current running jobs' time limits and resource availability. It is commonly used as 'squeue --start -u $USER' to check your own pending jobs.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-019",
    familyId: "cluster-tools",
    tool: "squeue",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A user's job has been pending for 12 hours with reason (QOSMaxGRESPerUser). What does this mean and how should it be resolved?",
    choices: [
      "The user's account has expired and needs to be renewed",
      "The user has reached their QOS (Quality of Service) limit for maximum GRES (GPUs) per user, and must wait for their other running jobs to finish before more GPUs can be allocated",
      "The GRES plugin is not configured on the cluster",
      "The job is requesting more GPUs than exist in the cluster",
    ],
    correctAnswer: 1,
    explanation:
      "QOSMaxGRESPerUser means the QOS policy limits how many GRES (GPU) resources a single user can have allocated simultaneously. The user has already reached that limit with other running jobs. Solutions: wait for existing jobs to complete, cancel lower-priority jobs, or ask an administrator to adjust the QOS limits if justified. This policy ensures fair GPU sharing among users.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-020",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "Which scontrol command places a hold on a pending job to prevent it from starting?",
    choices: [
      "scontrol suspend 12345",
      "scontrol hold 12345",
      "scontrol update JobId=12345 Priority=0",
      "Both B and C can prevent a pending job from starting",
    ],
    correctAnswer: 3,
    explanation:
      "Both 'scontrol hold <jobid>' and 'scontrol update JobId=<jobid> Priority=0' prevent a pending job from being scheduled. The hold command is the standard approach and sets a user hold. Setting Priority=0 also works since jobs with priority 0 are never scheduled. To release a held job, use 'scontrol release <jobid>'. Note: 'suspend' pauses a running job, not a pending one.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-021",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "What does this scontrol show node output reveal?",
    codeSnippet: `$ scontrol show node dgx-03
NodeName=dgx-03 Arch=x86_64 CoresPerSocket=64
   CPUAlloc=128 CPUTot=256 CPULoad=64.52
   Gres=gpu:a100:8
   GresUsed=gpu:a100:4(IDX:0-3)
   State=MIXED
   RealMemory=2048000 AllocMem=1024000
   Reason=scheduled maintenance [admin@2026-02-15T10:00:00]`,
    choices: [
      "The node is fully allocated and cannot accept new jobs",
      "The node has 4 of 8 GPUs allocated (indices 0-3), 128 of 256 CPUs in use, is in MIXED state, and has a scheduled maintenance reason set by an admin",
      "The node is down for maintenance and all jobs have been stopped",
      "The node has a hardware failure on GPUs 4-7",
    ],
    correctAnswer: 1,
    explanation:
      "The MIXED state means the node is partially allocated. GresUsed shows gpu:a100:4(IDX:0-3) meaning GPUs 0-3 are allocated to jobs while GPUs 4-7 are available. CPUAlloc=128 of CPUTot=256 and AllocMem=1024000 of 2048000 confirm partial allocation. The Reason field shows a scheduled maintenance note, but since the state is MIXED (not DRAIN), the node is still accepting new jobs. The reason may be informational or from a previous drain state.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-022",
    familyId: "cluster-tools",
    tool: "scontrol",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "After changing slurm.conf on the Slurm controller, what scontrol command applies the new configuration without restarting the slurmctld daemon?",
    choices: [
      "scontrol reload",
      "scontrol reconfig",
      "scontrol update config",
      "scontrol apply",
    ],
    correctAnswer: 1,
    explanation:
      "scontrol reconfig tells the Slurm controller (slurmctld) to re-read its configuration file (slurm.conf) and apply changes without requiring a daemon restart. This avoids disrupting running jobs. Not all configuration changes can be applied live; some require a full restart. It also triggers slurmd on all compute nodes to re-read their local configuration.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-023",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "Which sacct flag produces parseable output with pipe-delimited fields instead of the default fixed-width format?",
    choices: [
      "sacct --csv",
      'sacct -P --delimiter="|"',
      "sacct --parsable",
      "sacct -o tsv",
    ],
    correctAnswer: 1,
    explanation:
      "sacct -P (or --parsable2) produces output without trailing delimiters, using | as the default delimiter. Adding --delimiter='|' explicitly sets the pipe character (though it is the default). The -P flag is essential for scripting and data analysis because the default fixed-width format is difficult to parse programmatically. You can also use --delimiter=',' for CSV output.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-024",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does the AllocTRES field in this sacct output tell you?",
    codeSnippet: `$ sacct -j 9999 --format=JobID,AllocTRES%60,Elapsed
JobID                                                    AllocTRES    Elapsed
9999             billing=256,cpu=256,gres/gpu=8,mem=2048000M,node=1   4:30:15
9999.batch       cpu=256,mem=2048000M,node=1                          4:30:15
9999.0           billing=256,cpu=256,gres/gpu=8,mem=2048000M,node=1   4:30:12`,
    choices: [
      "The job requested but did not actually use these resources",
      "The job was allocated 256 CPUs, 8 GPUs, ~2TB of memory on 1 node, showing the Trackable RESources (TRES) that Slurm accounted for",
      "The billing field means the user was charged 256 credits",
      "The AllocTRES only shows limits, not actual allocation",
    ],
    correctAnswer: 1,
    explanation:
      "AllocTRES (Allocated Trackable RESources) shows the exact resources Slurm allocated to the job. gres/gpu=8 means 8 GPUs, cpu=256 means 256 CPU cores, mem=2048000M means approximately 2TB of memory, node=1 means one node. The billing field is used for fairshare calculations. This data is essential for capacity planning and understanding actual resource consumption.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-clus-025",
    familyId: "cluster-tools",
    tool: "sacct",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "sacct shows a job with State=TIMEOUT and Elapsed matching the partition's MaxTime exactly. What happened and how should the user fix this?",
    choices: [
      "The Slurm controller crashed and the job was killed",
      "The job ran until the partition's maximum walltime limit and was terminated by Slurm; the user should estimate runtime more accurately and request more time with --time, or use checkpointing to resume",
      "The node the job was running on went down",
      "The user's account ran out of allocation hours",
    ],
    correctAnswer: 1,
    explanation:
      "State=TIMEOUT means the job exceeded its walltime limit. When Elapsed matches the partition's MaxTime, the job consumed the entire allowed duration. Solutions include: requesting more time with sbatch --time if the partition allows it, moving to a partition with a higher time limit, implementing application-level checkpointing to save progress and resume in a new job, or optimizing the workload to complete faster.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
];

// ============================================================================
// CONTAINER TOOLS (tm-cont-001 through tm-cont-025)
// Tools: docker (7), enroot (8), pyxis (7)
// ============================================================================

const containerToolsQuestions: ToolMasteryQuestion[] = [
  // docker (4 questions)
  {
    id: "tm-cont-001",
    familyId: "container-tools",
    tool: "docker",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which docker run flag enables GPU access inside a container using the NVIDIA Container Toolkit?",
    choices: [
      "--device=/dev/nvidia0",
      "--gpus all",
      "--nvidia-gpu",
      "--runtime=gpu",
    ],
    correctAnswer: 1,
    explanation:
      'The --gpus flag (introduced with Docker 19.03+) is the standard way to expose GPUs to containers when the NVIDIA Container Toolkit (nvidia-container-toolkit) is installed. "--gpus all" exposes all GPUs, while "--gpus 2" or "--gpus device=0,1" limit which GPUs are visible. This flag requires the nvidia-container-runtime to be configured as a Docker runtime.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-002",
    familyId: "container-tools",
    tool: "docker",
    category: "troubleshooting",
    difficulty: "intermediate",
    questionText:
      'Running "docker run --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi" fails with "could not select device driver". What is the likely cause?',
    choices: [
      "The CUDA version in the container does not match the host driver",
      "The NVIDIA Container Toolkit (nvidia-container-toolkit) is not installed or the nvidia-container-runtime is not configured in Docker's daemon.json",
      "The docker daemon needs to be restarted",
      "The GPU is in exclusive compute mode",
    ],
    correctAnswer: 1,
    explanation:
      'The error "could not select device driver" with the --gpus flag means Docker cannot find the NVIDIA container runtime. The nvidia-container-toolkit package must be installed and either configured as the default runtime in /etc/docker/daemon.json or specified with --runtime=nvidia. After installation, the Docker daemon must be restarted with "systemctl restart docker".',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-003",
    familyId: "container-tools",
    tool: "docker",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "When pulling GPU container images for a DGX cluster, what is the recommended image registry?",
    choices: [
      "Docker Hub (docker.io)",
      "NVIDIA NGC Container Registry (nvcr.io)",
      "GitHub Container Registry (ghcr.io)",
      "Amazon ECR Public",
    ],
    correctAnswer: 1,
    explanation:
      "The NVIDIA NGC (GPU Cloud) Container Registry at nvcr.io provides optimized, tested, and NVIDIA-supported GPU container images. NGC images for PyTorch, TensorFlow, RAPIDS, and other frameworks are pre-built with optimized CUDA, cuDNN, NCCL, and driver compatibility tested on DGX systems. Example: nvcr.io/nvidia/pytorch:24.01-py3.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-004",
    familyId: "container-tools",
    tool: "docker",
    category: "conceptual",
    difficulty: "advanced",
    questionText:
      "Why is Docker generally not recommended for multi-node GPU jobs in HPC environments?",
    choices: [
      "Docker cannot access GPUs",
      "Docker requires root privileges for the daemon, does not natively integrate with job schedulers like Slurm, and has overhead from its layered filesystem and network namespace",
      "Docker images are too large for HPC storage",
      "Docker does not support NVIDIA GPUs newer than A100",
    ],
    correctAnswer: 1,
    explanation:
      "Docker's architecture has several limitations for HPC: the daemon runs as root (security concern on shared clusters), it does not integrate with Slurm or other schedulers natively, its overlay filesystem adds I/O overhead, and its network namespacing complicates high-performance InfiniBand networking. Enroot and Pyxis were specifically designed to solve these problems for HPC GPU workloads.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },

  // enroot (5 questions)
  {
    id: "tm-cont-005",
    familyId: "container-tools",
    tool: "enroot",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "What is the correct three-step enroot workflow to go from a Docker image to a running container?",
    choices: [
      "enroot pull, enroot build, enroot run",
      "enroot import, enroot create, enroot start",
      "enroot download, enroot install, enroot exec",
      "enroot fetch, enroot unpack, enroot launch",
    ],
    correctAnswer: 1,
    explanation:
      'The enroot workflow is: 1) "enroot import" downloads a container image and saves it as a squashfs file (.sqsh). 2) "enroot create" unpacks the squashfs into a rootfs directory (a container sandbox). 3) "enroot start" launches a process inside the sandbox. This unprivileged workflow requires no daemon and no root access.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-006",
    familyId: "container-tools",
    tool: "enroot",
    category: "flags-options",
    difficulty: "intermediate",
    questionText: "What does the following enroot import command do?",
    codeSnippet: `$ enroot import docker://nvcr.io#nvidia/pytorch:24.01-py3`,
    choices: [
      "It pulls and runs the PyTorch container from NGC",
      "It downloads the NGC PyTorch image and converts it to a squashfs file (nvidia+pytorch+24.01-py3.sqsh) for later use with enroot create",
      "It creates a Docker volume from the NGC image",
      "It installs PyTorch directly on the host system",
    ],
    correctAnswer: 1,
    explanation:
      'enroot import with the docker:// scheme downloads the specified container image from a registry (in this case NGC at nvcr.io) and converts it into a compressed squashfs archive (.sqsh file). The # separates the registry host from the image path. This .sqsh file is a portable, read-only image that can be used with "enroot create" to create runnable container sandboxes.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-007",
    familyId: "container-tools",
    tool: "enroot",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What is the key advantage of enroot over Docker for running GPU containers on a shared HPC cluster?",
    choices: [
      "Enroot supports more GPU architectures than Docker",
      "Enroot runs entirely unprivileged (no root daemon), uses no overlay filesystem, and directly accesses the host network and GPU devices without namespace overhead",
      "Enroot has a built-in job scheduler",
      "Enroot containers are faster to build than Docker images",
    ],
    correctAnswer: 1,
    explanation:
      "Enroot was designed by NVIDIA specifically for HPC environments. It requires no root-privileged daemon, uses simple rootfs directories instead of layered overlay filesystems, shares the host network stack (critical for InfiniBand RDMA), and directly accesses GPU devices. This eliminates the security, performance, and networking issues that make Docker problematic on shared HPC clusters.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-008",
    familyId: "container-tools",
    tool: "enroot",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      'An enroot start command fails with "nvidia-container-cli: device error: unknown device id". What should you check?',
    choices: [
      "The enroot squashfs file is corrupted",
      "The CUDA version inside the container exceeds the host driver capability",
      "The nvidia-container-cli hook is failing because the GPU driver is not loaded or the libnvidia-container package is misconfigured",
      "The container needs to be re-imported from the registry",
    ],
    correctAnswer: 2,
    explanation:
      'enroot uses nvidia-container-cli hooks to inject GPU device files and driver libraries into containers. The "unknown device id" error means nvidia-container-cli cannot enumerate GPUs, typically because the NVIDIA kernel driver is not loaded (check with lsmod | grep nvidia), the /dev/nvidia* device files do not exist, or libnvidia-container is not properly installed. Run nvidia-smi on the host first to verify GPU access.',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-009",
    familyId: "container-tools",
    tool: "enroot",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which enroot start flags mount the host filesystem and pass environment variables into the container?",
    choices: [
      "enroot start --bind /data:/data --env NCCL_DEBUG=INFO my_container",
      "enroot start --mount /data:/data --env NCCL_DEBUG=INFO my_container",
      "enroot start -m /data:/data -e NCCL_DEBUG=INFO my_container",
      "enroot start --volume /data:/data --export NCCL_DEBUG=INFO my_container",
    ],
    correctAnswer: 1,
    explanation:
      "enroot start uses --mount (or -m) to bind-mount host paths into the container, following the format source:destination. The --env (or -e) flag passes environment variables. Unlike Docker's --bind or -v syntax, enroot uses --mount. This is essential for accessing shared filesystems (like Lustre or NFS) and configuring NCCL for multi-node GPU communication.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },

  // pyxis (4 questions)
  {
    id: "tm-cont-010",
    familyId: "container-tools",
    tool: "pyxis",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which srun flag, provided by the Pyxis plugin, specifies a container image to run a job in?",
    choices: [
      "srun --docker-image=<image>",
      "srun --container-image=<image>",
      "srun --enroot-image=<image>",
      "srun --image=<image>",
    ],
    correctAnswer: 1,
    explanation:
      "Pyxis adds the --container-image flag to srun (and sbatch). This flag specifies the container image URI, which Pyxis passes to enroot to import, create, and start the container. Example: srun --container-image=nvcr.io#nvidia/pytorch:24.01-py3 python train.py.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-011",
    familyId: "container-tools",
    tool: "pyxis",
    category: "conceptual",
    difficulty: "intermediate",
    questionText: "What is the relationship between Pyxis and Enroot?",
    choices: [
      "Pyxis is a replacement for Enroot that works directly with Docker",
      "Pyxis is a Slurm SPANK plugin that uses Enroot as its container runtime backend to execute containerized jobs through Slurm",
      "Enroot is a plugin for Pyxis that adds GPU support",
      "They are independent tools that can be used separately but not together",
    ],
    correctAnswer: 1,
    explanation:
      "Pyxis is a Slurm SPANK (Slurm Plug-in Architecture for Node and job Kontrol) plugin developed by NVIDIA. When a user submits a job with --container-image, Pyxis intercepts the job launch and uses Enroot behind the scenes to import, create, and start the container on each allocated node. This provides seamless container integration with Slurm without users needing to manage Enroot directly.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-012",
    familyId: "container-tools",
    tool: "pyxis",
    category: "flags-options",
    difficulty: "advanced",
    questionText:
      "Which Pyxis flag mounts a host directory inside the container when running with srun?",
    choices: [
      "srun --container-image=<img> --bind=/data:/data python train.py",
      "srun --container-image=<img> --container-mounts=/data:/data python train.py",
      "srun --container-image=<img> --mount=/data:/data python train.py",
      "srun --container-image=<img> --volume=/data:/data python train.py",
    ],
    correctAnswer: 1,
    explanation:
      "Pyxis provides the --container-mounts flag for bind-mounting host directories into the container, using source:destination[:flags] format. Multiple mounts can be comma-separated. This is essential for accessing shared storage (e.g., Lustre, GPFS, NFS) containing datasets and model checkpoints from within the container.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-013",
    familyId: "container-tools",
    tool: "pyxis",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      'A multi-node Slurm job with --container-image works on one node but fails on others with "No such file" for the squashfs image. What is the likely issue?',
    choices: [
      "The container image is too large for the other nodes",
      "The enroot image cache (typically ~/.local/share/enroot/) is on local storage and the imported image is only available on the node where the srun command was issued",
      "The other nodes do not have GPUs",
      "The Slurm controller cannot reach the other nodes",
    ],
    correctAnswer: 1,
    explanation:
      "By default, enroot stores imported images and created containers in ~/.local/share/enroot/ on local disk. In a multi-node job, each node needs access to the image. If the user's home directory is on local storage instead of shared NFS/Lustre, the image will only exist on the submission node. Solutions include using shared storage for enroot data, pre-pulling images on all nodes, or configuring Pyxis to import on each node.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-014",
    familyId: "container-tools",
    tool: "docker",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which docker run flag limits a container to use only specific GPUs (e.g., GPUs 0 and 2)?",
    choices: [
      'docker run --gpus "device=0,2"',
      "docker run --gpus 2",
      "docker run --gpu-ids 0,2",
      "docker run --nvidia device=0,2",
    ],
    correctAnswer: 0,
    explanation:
      'The --gpus flag accepts device specifications. "--gpus \'device=0,2\'" exposes only GPUs 0 and 2 to the container. This is useful for running multiple containers on a single DGX system, each with a subset of GPUs. You can also use GPU UUIDs instead of indices. Note that "--gpus 2" means "any 2 GPUs" (count), not "GPU index 2".',
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-015",
    familyId: "container-tools",
    tool: "docker",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this daemon.json configuration enable?",
    codeSnippet: `$ cat /etc/docker/daemon.json
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    }
}`,
    choices: [
      "It installs the NVIDIA driver inside all Docker containers",
      "It sets the NVIDIA container runtime as the default for all Docker containers, eliminating the need to specify --gpus or --runtime=nvidia on every docker run command",
      "It restricts Docker to only run NVIDIA-based containers",
      "It configures Docker to use GPU acceleration for image builds",
    ],
    correctAnswer: 1,
    explanation:
      "Setting 'default-runtime' to 'nvidia' in daemon.json means every container launched by this Docker daemon will automatically use the NVIDIA container runtime. This eliminates the need to pass --gpus or --runtime=nvidia on every docker run command. The NVIDIA runtime handles injecting GPU device files and driver libraries into containers transparently.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-016",
    familyId: "container-tools",
    tool: "docker",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A Docker GPU container starts successfully but nvidia-smi inside the container shows fewer GPUs than the host. What is the most likely cause?",
    choices: [
      "The container's CUDA version is incompatible with some GPUs",
      "The NVIDIA_VISIBLE_DEVICES environment variable or the --gpus flag is restricting which GPUs are visible to the container",
      "Some GPUs have failed since the container was built",
      "The Docker image was built on a system with fewer GPUs",
    ],
    correctAnswer: 1,
    explanation:
      "The NVIDIA Container Toolkit uses the NVIDIA_VISIBLE_DEVICES environment variable (set automatically by --gpus) to control GPU visibility. If --gpus is set to a specific count or device list, only those GPUs appear inside the container. Check the docker run command for --gpus specifications and the NVIDIA_VISIBLE_DEVICES variable. Use '--gpus all' to expose all GPUs.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-017",
    familyId: "container-tools",
    tool: "enroot",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which enroot command lists all created container sandboxes on the system?",
    choices: [
      "enroot ps",
      "enroot list",
      "enroot containers",
      "enroot show --all",
    ],
    correctAnswer: 1,
    explanation:
      "enroot list displays all container sandboxes (rootfs directories) that have been created with 'enroot create'. Each entry shows the container name. Containers in this list can be started with 'enroot start <name>' and removed with 'enroot remove <name>'. This is analogous to listing Docker containers, but enroot containers are simply unpacked directories.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-018",
    familyId: "container-tools",
    tool: "enroot",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does this enroot import output tell you about the process?",
    codeSnippet: `$ enroot import docker://nvcr.io#nvidia/pytorch:24.01-py3
[INFO] Querying registry for permission grant
[INFO] Authenticating with user credentials
[INFO] Fetching image manifest list
[INFO] Fetching image manifest
[INFO] Downloading 47 missing layers
[INFO] Extracting image layers
[INFO] Converting to squashfs filesystem
nvidia+pytorch+24.01-py3.sqsh`,
    choices: [
      "The import failed because it needed to download 47 layers",
      "The import successfully authenticated with NGC, downloaded the image layers, and created a squashfs file named nvidia+pytorch+24.01-py3.sqsh",
      "The image was cached locally and no download occurred",
      "The container is now running with the PyTorch framework",
    ],
    correctAnswer: 1,
    explanation:
      "The output shows enroot's import workflow: authenticating with the NGC registry (using credentials from $ENROOT_CONFIG_PATH/.credentials), downloading 47 container layers, extracting them, and converting the result to a compressed squashfs filesystem. The final output line shows the resulting .sqsh file name. This file can now be used with 'enroot create' to make a runnable sandbox.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-019",
    familyId: "container-tools",
    tool: "enroot",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "In an HPC cluster with shared NFS storage, where should enroot squashfs images (.sqsh) be stored for multi-node jobs?",
    choices: [
      "On each node's local /tmp directory for performance",
      "In a shared filesystem location accessible from all compute nodes, so all nodes can create containers from the same image without re-importing",
      "Only on the login/submission node since enroot handles distribution",
      "In the Docker registry since enroot always re-downloads",
    ],
    correctAnswer: 1,
    explanation:
      "Storing .sqsh images on shared storage (NFS, Lustre, GPFS) ensures all compute nodes can access the same image file. When a multi-node Slurm job starts, each node needs to 'enroot create' from the .sqsh file. If the file is on local storage, it only exists on the node where 'enroot import' was run. Shared storage eliminates the need to import the image on every node separately.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-020",
    familyId: "container-tools",
    tool: "enroot",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "An enroot import from NGC fails with 'HTTP 401 Unauthorized'. What should you check?",
    choices: [
      "The NGC container image has been deprecated and is no longer available",
      "The NGC API key in the enroot credentials file ($ENROOT_CONFIG_PATH/.credentials or ~/.config/enroot/.credentials) is missing, expired, or incorrectly formatted",
      "The system clock is wrong and the TLS certificate has expired",
      "enroot does not support authenticated registries",
    ],
    correctAnswer: 1,
    explanation:
      "NGC requires an API key for pulling container images. enroot reads credentials from a .credentials file (typically at ~/.config/enroot/.credentials). The file format is: 'machine nvcr.io login $oauthtoken password <YOUR_NGC_API_KEY>'. A 401 error means the credentials are missing, the API key has expired, or the file format is incorrect. Generate a new API key at ngc.nvidia.com.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-021",
    familyId: "container-tools",
    tool: "pyxis",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which Pyxis flag sets the working directory inside the container when running a Slurm job?",
    choices: [
      "srun --container-image=<img> --chdir=/workspace python train.py",
      "srun --container-image=<img> --container-workdir=/workspace python train.py",
      "srun --container-image=<img> --workdir=/workspace python train.py",
      "srun --container-image=<img> --cd=/workspace python train.py",
    ],
    correctAnswer: 1,
    explanation:
      "Pyxis provides the --container-workdir flag to set the working directory inside the container. Without this, the working directory defaults to the container's configured WORKDIR. This is useful when the container expects files in a specific location or when you want to change to a mounted data directory before running the application.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-022",
    familyId: "container-tools",
    tool: "pyxis",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText:
      "What does the --container-name flag do in this Pyxis command?",
    codeSnippet: `$ srun --container-image=nvcr.io#nvidia/pytorch:24.01-py3 \\
       --container-name=pytorch_training \\
       --container-mounts=/data:/data \\
       python train.py`,
    choices: [
      "It assigns a hostname to the container",
      "It names the enroot container sandbox, allowing it to be reused across multiple srun invocations without re-importing and re-creating the container",
      "It sets the Slurm job name",
      "It creates a DNS entry for the container",
    ],
    correctAnswer: 1,
    explanation:
      "The --container-name flag gives a persistent name to the enroot sandbox. Without it, Pyxis creates a temporary container that is destroyed after the job. With a name, the container persists and subsequent srun commands using the same --container-name will reuse the existing sandbox, skipping the import and create steps. This dramatically speeds up iterative development workflows.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-023",
    familyId: "container-tools",
    tool: "pyxis",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "A Slurm job with --container-image fails with 'pyxis: container start failed'. The same image works fine with 'enroot start' directly. What should you investigate?",
    choices: [
      "The image is too large for Pyxis to handle",
      "Check the Pyxis SPANK plugin configuration in plugstack.conf, verify that enroot is in the PATH for the Slurm daemon, and check slurmd logs for detailed error messages",
      "Pyxis requires a newer version of Slurm than what is installed",
      "The container image must be pre-imported before using with Pyxis",
    ],
    correctAnswer: 1,
    explanation:
      "When enroot works directly but Pyxis fails, the issue is typically in the Slurm-Pyxis integration. Check: 1) plugstack.conf references the correct pyxis.so path, 2) the slurmd service has enroot in its PATH, 3) required directories (like /run/enroot) exist and have correct permissions. The slurmd log (usually /var/log/slurm/slurmd.log) contains the detailed error from the SPANK plugin.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-024",
    familyId: "container-tools",
    tool: "pyxis",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "For a multi-node distributed training job using Pyxis, which combination of flags ensures all nodes have the same container environment with access to the shared dataset?",
    choices: [
      "--container-image only; Pyxis handles everything else automatically",
      "--container-image=nvcr.io#nvidia/pytorch:24.01-py3 --container-mounts=/shared/datasets:/data,/shared/checkpoints:/checkpoints --no-container-remap-root",
      "--container-image=<img> --container-mounts=/data:/data --container-name=training_env to import once and reuse across nodes",
      "Multi-node jobs cannot use containers",
    ],
    correctAnswer: 1,
    explanation:
      "For multi-node training: --container-image specifies the NGC image (Pyxis imports it on each node if not cached), --container-mounts makes shared filesystem paths available inside the container for datasets and checkpoint saving, and --no-container-remap-root keeps the user mapping consistent for shared filesystem permissions. Each node independently creates the container from the same image.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
  {
    id: "tm-cont-025",
    familyId: "container-tools",
    tool: "enroot",
    category: "conceptual",
    difficulty: "beginner",
    questionText:
      "What file format does enroot use for portable container images, and why was this format chosen over Docker's layered format?",
    choices: [
      "TAR archives, for compatibility with standard Unix tools",
      "Squashfs (.sqsh), a compressed read-only filesystem format that provides fast random access, small image sizes, and avoids the overhead of Docker's overlay filesystem layers",
      "OCI image format, identical to Docker's format",
      "ISO disk images, for direct mounting as virtual drives",
    ],
    correctAnswer: 1,
    explanation:
      "Enroot uses squashfs, a compressed read-only filesystem format native to the Linux kernel. Squashfs provides excellent compression ratios (reducing storage), fast random-access reads (no need to decompress entire layers), and can be loop-mounted directly. Unlike Docker's layered overlay filesystem which introduces I/O overhead, a single squashfs file is simple and performant, ideal for HPC workloads.",
    examRelevance: "NCP-AII Domain 3: Control Plane Installation",
  },
];

// ============================================================================
// DIAGNOSTICS (tm-diag-001 through tm-diag-025)
// Tools: dcgmi diag (8), nvidia-bug-report (7), gpu-burn (7)
// ============================================================================

const diagnosticsQuestions: ToolMasteryQuestion[] = [
  // dcgmi diag (5 questions)
  {
    id: "tm-diag-001",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "conceptual",
    difficulty: "beginner",
    questionText:
      "What are the three diagnostic levels available in dcgmi diag and how do they differ?",
    choices: [
      "Levels 1, 2, 3: quick GPU info, driver check, full hardware scan",
      "Levels 1, 2, 3: quick deployment check (seconds), medium stress tests (minutes), comprehensive long-duration tests (15+ minutes) including PCIe, memory, compute, and NVLink stress",
      "Levels A, B, C: basic, standard, advanced",
      "Levels 1, 2, 3: single GPU, multi-GPU, full system",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi diag -r 1 runs quick deployment tests in seconds (software/driver verification, basic GPU checks). -r 2 adds medium-length stress tests lasting a few minutes. -r 3 runs the full comprehensive suite including extended memory bandwidth, PCIe stress, NVLink bandwidth, and compute stress tests that can take 15+ minutes per GPU. Level 3 is recommended for pre-deployment validation.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-002",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this dcgmi diag output indicate?",
    codeSnippet: `$ dcgmi diag -r 3 -i 0
+---------------------------+--------------------------------+
| Diagnostic                | Result                         |
+===========================+================================+
| Deployment                | Pass                           |
| PCIe                      | Pass                           |
| Memory                    | Pass                           |
| SM Stress                 | Pass                           |
| Targeted Stress           | Pass                           |
| Targeted Power            | Pass                           |
| Memory Bandwidth          | Fail (GPU 0: 1523 GB/s,       |
|                           |  expected >= 1800 GB/s)        |
| NVLink                    | Pass                           |
+---------------------------+--------------------------------+`,
    choices: [
      "The GPU passed all tests and is healthy",
      "The GPU failed the memory bandwidth test, achieving only 1523 GB/s instead of the expected 1800+ GB/s, indicating possible HBM degradation or thermal throttling",
      "The NVLink test failed",
      "The test is incomplete because it did not reach level 3",
    ],
    correctAnswer: 1,
    explanation:
      "The Memory Bandwidth test failed because GPU 0 achieved only 1523 GB/s, below the 1800 GB/s threshold. This can indicate degraded HBM (High Bandwidth Memory) modules, thermal throttling reducing memory clock speeds, or ECC errors causing page retirements that reduce available bandwidth. The GPU should be investigated further and potentially RMA'd.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-003",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "How do you run dcgmi diag on a specific GPU rather than all GPUs in the system?",
    choices: [
      "dcgmi diag -r 3 --gpu 0",
      "dcgmi diag -r 3 -i 0",
      "dcgmi diag -r 3 --device=0",
      "dcgmi diag -r 3 -g 0",
    ],
    correctAnswer: 1,
    explanation:
      'dcgmi diag -i (or --gpu-id) specifies which GPU to test by entity ID. "dcgmi diag -r 3 -i 0" runs a comprehensive (level 3) diagnostic on GPU 0 only. Without the -i flag, dcgmi diag tests all GPUs in the default group. You can also specify a DCGM group ID with -g to test a pre-defined set of GPUs.',
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-004",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "When should you run dcgmi diag -r 3 on a production DGX system?",
    choices: [
      "While production jobs are running to test under real load",
      "During scheduled maintenance windows, after hardware changes, or during initial system bring-up, because level 3 tests are destructive to running workloads",
      "Only when NVIDIA support requests it",
      "Every hour as a health monitoring routine",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi diag -r 3 is a stress test that fully utilizes GPU compute, memory, PCIe, and NVLink resources. Running it during production would interfere with and likely crash running workloads. It should be run during maintenance windows, after hardware replacements (GPU, NVLink cables, PCIe risers), and during initial system bring-up validation. For ongoing health monitoring, use dcgmi health -c or -r 1 instead.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-005",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      'dcgmi diag -r 3 shows "NVLink: Fail" for GPU 2 to GPU 3. All other GPU pair tests pass. What is the most likely hardware cause?',
    choices: [
      "The GPU driver needs to be updated",
      "The NVLink bridge or cable connecting GPU 2 and GPU 3 is faulty or improperly seated",
      "Both GPU 2 and GPU 3 need to be replaced",
      "The PCIe switch connecting the GPUs has failed",
    ],
    correctAnswer: 1,
    explanation:
      "When NVLink fails between a specific pair of GPUs while all other NVLink connections pass, the most likely cause is a faulty NVLink bridge (in systems like DGX A100) or NVLink cable (in NVSwitch-based systems like DGX H100). Since both GPUs pass NVLink tests with other peers, the GPUs themselves are likely functional. Reseating or replacing the NVLink bridge/cable between GPU 2 and GPU 3 should resolve the issue.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },

  // nvidia-bug-report (4 questions)
  {
    id: "tm-diag-006",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "What is the correct command to generate an NVIDIA bug report bundle?",
    choices: [
      "nvidia-bug-report --generate",
      "nvidia-bug-report.sh",
      "nvidia-smi --bug-report",
      "dcgmi bugreport",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-bug-report.sh is a shell script provided with the NVIDIA driver package. It collects comprehensive system and GPU diagnostic information and saves it as a compressed log file (nvidia-bug-report.log.gz). The script must be run with root privileges to capture all information including kernel logs and driver internals.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-007",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What types of information does nvidia-bug-report.sh collect in its output bundle?",
    choices: [
      "Only the nvidia-smi output and driver version",
      "GPU state, driver version, kernel logs (dmesg), Xorg logs, loaded kernel modules, PCI topology, VBIOS versions, ECC status, NVLink status, and system configuration",
      "Only GPU temperature and utilization history",
      "Only the last 100 lines of syslog",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-bug-report.sh is comprehensive. It captures: nvidia-smi output, driver and VBIOS versions, kernel ring buffer (dmesg) including XID errors, loaded kernel modules, PCI device tree, ECC error counts, NVLink status, thermal and power data, Xorg/display logs, system information (OS, CPU, memory), and relevant configuration files. This complete snapshot is what NVIDIA support needs for issue investigation.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-008",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "When should you run nvidia-bug-report.sh in a troubleshooting workflow?",
    choices: [
      "After rebooting the system to get a clean state",
      "Immediately when the issue occurs and before any remediation steps, to capture the current problematic state",
      "Only after running all other diagnostic tools first",
      "Once a week as a routine health check",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-bug-report.sh should be run immediately when an issue is observed, before any remediation (reboots, driver reloads, GPU resets). The report captures volatile state like current kernel messages (dmesg), XID errors, GPU registers, and process information that would be lost after a reboot or reset. Running it first preserves the evidence needed for root cause analysis.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-009",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "In the nvidia-bug-report.log output, you find repeated XID Error 79 entries in the dmesg section. What does XID 79 indicate?",
    choices: [
      "A GPU fan failure",
      "A GPU has fallen off the PCIe bus, typically due to a hardware failure, power issue, or PCIe link instability",
      "An application used too much GPU memory",
      "The display output is disconnected",
    ],
    correctAnswer: 1,
    explanation:
      'XID Error 79 means "GPU has fallen off the bus." This is a critical hardware error indicating the GPU is no longer responding on the PCIe bus. Common causes include failing GPU hardware, power supply issues to the GPU, PCIe riser card problems, or motherboard PCIe slot defects. The GPU will be inaccessible until a power cycle. This typically requires hardware replacement (GPU, riser, or power cable).',
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },

  // gpu-burn (4 questions)
  {
    id: "tm-diag-010",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which gpu-burn command runs a stress test on all GPUs for 5 minutes (300 seconds)?",
    choices: [
      "gpu-burn --time 300",
      "gpu-burn -d 300",
      "gpu-burn 300",
      "gpu-burn -t 5m",
    ],
    correctAnswer: 2,
    explanation:
      'gpu-burn takes the duration in seconds as a positional argument. "gpu-burn 300" runs the stress test for 300 seconds (5 minutes) on all available GPUs. By default, it uses double-precision floating point and periodically verifies computation results to detect errors.',
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-011",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this gpu-burn output indicate?",
    codeSnippet: `$ gpu-burn 120
GPU 0: OK - temp: 72C - 18234 Gflop/s
GPU 1: OK - temp: 74C - 18198 Gflop/s
GPU 2: FAULTY - temp: 81C - 4521 Gflop/s (mismatch detected)
GPU 3: OK - temp: 73C - 18201 Gflop/s
GPU 4: OK - temp: 71C - 18245 Gflop/s
GPU 5: OK - temp: 75C - 18187 Gflop/s
GPU 6: OK - temp: 74C - 18203 Gflop/s
GPU 7: OK - temp: 73C - 18219 Gflop/s`,
    choices: [
      "All GPUs passed the stress test",
      "GPU 2 is running hot but otherwise functional",
      "GPU 2 produced incorrect computation results (mismatch) and has significantly lower throughput, indicating a hardware fault",
      "The test was too short to produce reliable results",
    ],
    correctAnswer: 2,
    explanation:
      'GPU 2 shows "FAULTY" with "mismatch detected," meaning the stress test computation results did not match expected values. This indicates the GPU is producing incorrect mathematical results, which is a serious hardware fault. The dramatically lower throughput (4521 vs ~18200 Gflop/s) and higher temperature also suggest hardware degradation. This GPU should be replaced.',
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-012",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "best-practice",
    difficulty: "advanced",
    questionText:
      "How long should a gpu-burn stress test run to be considered a thorough burn-in test for new DGX hardware?",
    choices: [
      "60 seconds is sufficient for a quick check",
      "5-10 minutes to verify basic functionality",
      "At least 1-4 hours to stress test thermal and power delivery systems under sustained load and catch intermittent faults",
      "Exactly 24 hours as specified by NVIDIA",
    ],
    correctAnswer: 2,
    explanation:
      "For a thorough burn-in test, 1-4 hours is recommended because intermittent hardware faults (thermal throttling, power delivery issues, marginal memory cells) may not manifest during short tests. Sustained load forces all GPUs to maximum temperature and power draw, which stresses cooling, VRMs, and memory. Short tests (minutes) catch gross failures but miss intermittent issues that appear only after thermal saturation.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-013",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "conceptual",
    difficulty: "intermediate",
    questionText:
      "What is the key difference between gpu-burn and dcgmi diag -r 3 for GPU stress testing?",
    choices: [
      "They test the same things in the same way",
      "gpu-burn focuses purely on sustained compute stress and thermal stability, while dcgmi diag -r 3 tests multiple subsystems (memory, PCIe, NVLink, compute) individually with pass/fail thresholds",
      "dcgmi diag is only for NVIDIA GPUs while gpu-burn works on any GPU",
      "gpu-burn is an official NVIDIA tool while dcgmi diag is third-party",
    ],
    correctAnswer: 1,
    explanation:
      "gpu-burn is a focused CUDA compute stress test that maximizes GPU utilization to test thermal and power stability, verifying computation correctness over time. dcgmi diag -r 3 is a comprehensive diagnostic suite that individually tests deployment health, PCIe bandwidth, memory bandwidth, SM compute, NVLink bandwidth, and power delivery with specific pass/fail thresholds for each. They complement each other: dcgmi diag identifies which subsystem has issues, while gpu-burn validates sustained compute reliability.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-014",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "Which dcgmi diag flag runs diagnostics on a specific DCGM group rather than the default group?",
    choices: [
      "dcgmi diag -r 3 --group 2",
      "dcgmi diag -r 3 -g 2",
      "dcgmi diag -r 3 --target-group 2",
      "dcgmi diag -r 3 -G 2",
    ],
    correctAnswer: 1,
    explanation:
      "dcgmi diag -g (--group) specifies a DCGM group ID to run diagnostics against. First create a group with 'dcgmi group -c mygroup -a 0,1' and note the returned group ID. Then 'dcgmi diag -r 3 -g <groupId>' runs diagnostics on only the GPUs in that group. This is useful for testing a subset of GPUs, for example after replacing a specific GPU.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-015",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText: "What does this dcgmi diag level 1 output indicate?",
    codeSnippet: `$ dcgmi diag -r 1
+---------------------------+--------------------------------+
| Diagnostic                | Result                         |
+===========================+================================+
| Deployment                | Fail                           |
|                           | Error: NVML library not found  |
+---------------------------+--------------------------------+`,
    choices: [
      "The GPU hardware has failed and needs replacement",
      "The NVIDIA driver is not properly installed or the NVML shared library (libnvidia-ml.so) is missing from the library path",
      "DCGM is not compatible with the installed GPU",
      "The GPU needs a firmware update before diagnostics can run",
    ],
    correctAnswer: 1,
    explanation:
      "The Deployment test at level 1 checks basic software prerequisites. 'NVML library not found' means the NVIDIA Management Library (libnvidia-ml.so) is not in the library search path. This typically indicates the NVIDIA driver is not installed, not loaded (check with 'lsmod | grep nvidia'), or the library path is misconfigured. This must be fixed before any GPU operations can work.",
    examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
  },
  {
    id: "tm-diag-016",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "command-syntax",
    difficulty: "beginner",
    questionText:
      "Which dcgmi diag command runs only the quick deployment validation tests?",
    choices: [
      "dcgmi diag -r 1",
      "dcgmi diag --quick",
      "dcgmi diag -r 0",
      "dcgmi diag --deploy",
    ],
    correctAnswer: 0,
    explanation:
      "dcgmi diag -r 1 runs level 1 diagnostics, which are quick deployment validation tests that complete in seconds. These tests verify the NVIDIA driver is loaded, GPUs are accessible, ECC mode is as expected, and basic GPU health indicators are normal. Level 1 is suitable for quick health checks without impacting running workloads.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-017",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "output-interpretation",
    difficulty: "advanced",
    questionText:
      "In the nvidia-bug-report output, you find this dmesg entry. What does it mean?",
    codeSnippet: `[  142.835421] NVRM: Xid (PCI:0000:3b:00): 48, pid=12345, name=python, Ch 00000010
[  142.835423] NVRM: Xid (PCI:0000:3b:00): 48, pid=12345, name=python, Ch 00000010
[  142.835425] NVRM: Xid (PCI:0000:3b:00): 48, pid=12345, name=python, Ch 00000010`,
    choices: [
      "The GPU has fallen off the PCIe bus",
      "XID 48 indicates a double-bit ECC error in GPU memory, and the repeated errors from the same process suggest corrupted GPU memory pages that need to be retired",
      "The Python process is using too much GPU memory",
      "The GPU temperature is too high and thermal throttling is occurring",
    ],
    correctAnswer: 1,
    explanation:
      "XID 48 is a double-bit (uncorrectable) ECC error. Unlike single-bit errors that ECC corrects transparently, double-bit errors corrupt data and typically cause the CUDA context to be destroyed. Repeated XID 48 errors on the same GPU indicate degrading memory cells. The affected memory pages should be retired (nvidia-smi --retire-pages), and if errors persist, the GPU should be RMA'd.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-018",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "flags-options",
    difficulty: "intermediate",
    questionText:
      "What is the default output filename and format generated by nvidia-bug-report.sh?",
    choices: [
      "nvidia-diagnostics.txt in the current directory",
      "nvidia-bug-report.log.gz - a gzip-compressed log file in the current directory",
      "/var/log/nvidia-bug-report.json",
      "nvidia-report.tar.gz containing multiple diagnostic files",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-bug-report.sh generates a file named nvidia-bug-report.log.gz in the current working directory. The .gz extension indicates gzip compression. To read it, use 'zcat nvidia-bug-report.log.gz' or 'gunzip nvidia-bug-report.log.gz' followed by viewing the resulting .log file. The compressed format reduces the file size for easy sharing with NVIDIA support.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-019",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "nvidia-bug-report.sh generates an incomplete report with warnings about missing information. What is the most likely cause?",
    choices: [
      "The disk is full and the report cannot be written",
      "The script was run without root/sudo privileges, preventing it from accessing kernel logs, device files, and driver internals",
      "The NVIDIA driver version is too old for the bug report tool",
      "The system has too many GPUs for the report tool to handle",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-bug-report.sh requires root privileges to collect complete information. Without root: dmesg (kernel ring buffer) may be restricted, /dev/nvidia* device file details may be inaccessible, driver internal state cannot be queried, and some system configuration files cannot be read. Always run as 'sudo nvidia-bug-report.sh' to ensure a complete diagnostic bundle.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-020",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "flags-options",
    difficulty: "beginner",
    questionText:
      "Which gpu-burn flag forces the stress test to use double-precision (FP64) floating-point operations?",
    choices: [
      "gpu-burn --fp64 120",
      "gpu-burn -d 120",
      "gpu-burn --double 120",
      "gpu-burn -p double 120",
    ],
    correctAnswer: 1,
    explanation:
      "gpu-burn -d enables double-precision (FP64) mode for the stress test. Without -d, gpu-burn uses single-precision (FP32) by default. Double-precision tests are important because A100 and H100 GPUs have significant FP64 compute capability used in scientific computing workloads. FP64 mode also generates more heat, making it better for thermal stress testing.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-021",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "output-interpretation",
    difficulty: "intermediate",
    questionText: "What does this gpu-burn temperature progression indicate?",
    codeSnippet: `GPU 0: OK - temp: 45C - 18230 Gflop/s  (10s elapsed)
GPU 0: OK - temp: 62C - 18215 Gflop/s  (30s elapsed)
GPU 0: OK - temp: 75C - 18198 Gflop/s  (60s elapsed)
GPU 0: OK - temp: 78C - 18180 Gflop/s  (120s elapsed)
GPU 0: OK - temp: 79C - 18175 Gflop/s  (180s elapsed)
GPU 0: OK - temp: 79C - 18172 Gflop/s  (240s elapsed)`,
    choices: [
      "The GPU is overheating and will soon reach critical temperature",
      "The GPU temperature rose from 45C to 79C and stabilized, showing normal thermal saturation behavior with consistent Gflop/s, indicating healthy cooling",
      "The decreasing Gflop/s indicates the GPU is throttling",
      "The test should be stopped because temperature has plateaued",
    ],
    correctAnswer: 1,
    explanation:
      "This shows a healthy thermal profile. The GPU temperature rises from ambient (45C) during ramp-up, then stabilizes at 79C after about 2 minutes as the cooling system reaches equilibrium. The Gflop/s decrease is minimal (18230 to 18172, less than 0.5%) and consistent with slight thermal management adjustments. A problematic GPU would show continued temperature rise or significant Gflop/s drops.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-022",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "troubleshooting",
    difficulty: "advanced",
    questionText:
      "gpu-burn exits immediately with 'CUDA Error: out of memory' on a GPU that nvidia-smi shows as having 80 GB free. What could cause this?",
    choices: [
      "gpu-burn has a memory leak in its initialization code",
      "Another process has allocated GPU memory without actively using it (showing 0% utilization in nvidia-smi but reserving memory), or ECC page retirements have reduced available memory below what gpu-burn requires",
      "The GPU's memory clock is running too slowly",
      "gpu-burn does not support GPUs with more than 40 GB memory",
    ],
    correctAnswer: 1,
    explanation:
      "nvidia-smi's 'free' memory may not reflect reservations by idle processes or frameworks like PyTorch that pre-allocate GPU memory. Check nvidia-smi for processes holding memory with 'nvidia-smi pmon'. Also, extensive ECC page retirements (nvidia-smi -q -d RETIRED_PAGES) can reduce usable memory. Kill any idle processes holding GPU memory before running gpu-burn.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-023",
    familyId: "diagnostics",
    tool: "dcgmi diag",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "What is the recommended diagnostic sequence when bringing up a new DGX node before putting it into production?",
    choices: [
      "Just run gpu-burn for 5 minutes and deploy if it passes",
      "Run dcgmi diag -r 1 first to verify basic deployment, then -r 3 for comprehensive hardware validation, followed by gpu-burn for extended thermal stress testing",
      "Only check nvidia-smi output and deploy if all GPUs are visible",
      "Run nvidia-bug-report.sh and send it to NVIDIA support for approval",
    ],
    correctAnswer: 1,
    explanation:
      "A proper bring-up sequence starts with dcgmi diag -r 1 to quickly verify driver installation and basic GPU health (seconds). If that passes, dcgmi diag -r 3 tests all subsystems including PCIe, memory, NVLink, and compute (15+ minutes). Finally, gpu-burn runs an extended stress test (1-4 hours) to verify thermal stability under sustained load. This layered approach catches issues at each level.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
  {
    id: "tm-diag-024",
    familyId: "diagnostics",
    tool: "nvidia-bug-report",
    category: "best-practice",
    difficulty: "intermediate",
    questionText:
      "When filing an RMA (Return Merchandise Authorization) request for a failed GPU, which diagnostic artifacts should you include?",
    choices: [
      "Only the nvidia-smi output showing the error",
      "The nvidia-bug-report.log.gz, dcgmi diag -r 3 output, nvidia-smi -q output for the failed GPU, and the GPU serial number from nvidia-smi -q -d SERIAL",
      "A photo of the GPU and the purchase receipt",
      "Only the dmesg output showing XID errors",
    ],
    correctAnswer: 1,
    explanation:
      "A thorough RMA submission includes: nvidia-bug-report.log.gz (comprehensive system state), dcgmi diag -r 3 results (specific test failures), nvidia-smi -q for the failed GPU (ECC errors, retired pages, temperature history), and the GPU serial number. This documentation helps NVIDIA validate the failure and expedite the replacement. Without these artifacts, the RMA process may be delayed.",
    examRelevance: "NCP-AII Domain 5: Troubleshooting & Optimization",
  },
  {
    id: "tm-diag-025",
    familyId: "diagnostics",
    tool: "gpu-burn",
    category: "command-syntax",
    difficulty: "intermediate",
    questionText:
      "How would you run gpu-burn to stress test only specific GPUs (e.g., GPUs 2 and 5) rather than all GPUs in the system?",
    choices: [
      "gpu-burn --gpus 2,5 300",
      "gpu-burn -i 2,5 300",
      "Set CUDA_VISIBLE_DEVICES=2,5 before running gpu-burn 300",
      "gpu-burn 300 --device 2 --device 5",
    ],
    correctAnswer: 2,
    explanation:
      "gpu-burn does not have a built-in GPU selection flag. To limit which GPUs are tested, use the CUDA_VISIBLE_DEVICES environment variable. Setting 'CUDA_VISIBLE_DEVICES=2,5 gpu-burn 300' makes gpu-burn only see and test GPUs 2 and 5. This environment variable is a standard CUDA mechanism for controlling GPU visibility that works with all CUDA applications.",
    examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
  },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const TOOL_MASTERY_QUESTIONS: ToolMasteryQuestion[] = [
  ...gpuMonitoringQuestions,
  ...infinibandQuestions,
  ...bmcHardwareQuestions,
  ...clusterToolsQuestions,
  ...containerToolsQuestions,
  ...diagnosticsQuestions,
];

export function getQuestionsForFamily(
  familyId: CommandFamilyId,
): ToolMasteryQuestion[] {
  return TOOL_MASTERY_QUESTIONS.filter((q) => q.familyId === familyId);
}
