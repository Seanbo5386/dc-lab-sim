// ---------------------------------------------------------------------------
// Incident Templates
// Building-block templates that the IncidentComposer assembles into dynamic
// incidents. Each template describes a single failure scenario: the symptoms a
// technician would observe, the underlying root cause, the faults to inject,
// the diagnostic command sequence for scoring, and multiple-choice options for
// the root cause diagnosis.
// ---------------------------------------------------------------------------

export interface IncidentTemplate {
  /** Unique identifier, e.g. "gpu-memory-xid48" */
  id: string;
  /** Short human-readable title */
  title: string;
  /** Situation briefing — describes observable symptoms only, never the root cause */
  situation: string;
  /** Description of the actual underlying problem (hidden until after-action review) */
  rootCause: string;
  /** Difficulty tier */
  difficulty: "beginner" | "intermediate" | "advanced";
  /** NCP-AII exam domains this incident covers (1-5) */
  domains: number[];
  /** Faults to inject when this incident starts */
  primaryFaults: Array<{
    faultType: string;
    target: "random-gpu" | "specific-gpu" | "node";
  }>;
  /** Links to a trigger ID in faultPropagationRules.ts */
  propagationTrigger: string;
  /** Expected command sequence the technician should run, in order */
  diagnosticPath: string[];
  /** Multiple-choice options shown when the user submits their diagnosis */
  rootCauseOptions: string[];
  /** The correct answer — must be one of rootCauseOptions */
  correctRootCause: string;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  // =========================================================================
  // 1. GPU Memory Failure (XID 48) — beginner, domain 1
  // =========================================================================
  {
    id: "gpu-memory-xid48",
    title: "GPU Memory Failure (XID 48)",
    situation:
      "Nagios fires a critical alert: node dgx-07 reports an uncorrectable ECC error on GPU 3. " +
      "The training job running on that node has stalled, and the user reports that their loss " +
      "curve flatlined 12 minutes ago. The Slurm dashboard shows the job is still listed as " +
      "RUNNING but no progress has been made.",
    rootCause:
      "An uncorrectable double-bit ECC error (XID 48) in GPU 3 HBM2e memory corrupted " +
      "in-flight tensor data, causing the CUDA context to become invalid. The GPU is no longer " +
      "usable until a reset or reboot.",
    difficulty: "beginner",
    domains: [1],
    primaryFaults: [{ faultType: "ecc-error", target: "specific-gpu" }],
    propagationTrigger: "xid-48",
    diagnosticPath: [
      "nvidia-smi",
      "nvidia-smi -q -d ECC",
      "dmesg | grep -i xid",
      "nvidia-smi -q -d PAGE_RETIREMENT",
    ],
    rootCauseOptions: [
      "Uncorrectable ECC memory error (XID 48) on GPU 3",
      "GPU driver crash caused by incompatible CUDA version",
      "PCIe bus timeout due to faulty riser card",
      "Thermal shutdown triggered by blocked airflow",
    ],
    correctRootCause: "Uncorrectable ECC memory error (XID 48) on GPU 3",
  },

  // =========================================================================
  // 2. GPU Hang (XID 43) — intermediate, domain 4
  // =========================================================================
  {
    id: "gpu-hang-xid43",
    title: "GPU Hang (XID 43)",
    situation:
      "A multi-node NCCL all-reduce training job across 4 DGX nodes has been stuck for 8 minutes. " +
      "Rank 0 on dgx-12 stopped logging. Other ranks show NCCL timeout warnings in their stderr. " +
      "The Slurm job is still RUNNING but the user says 'nothing is happening.' Grafana shows GPU " +
      "utilization on dgx-12 GPU 5 dropped to 0% while peers remain at 100%.",
    rootCause:
      "GPU 5 on dgx-12 entered a hung state (XID 43 — GPU stopped responding to commands). " +
      "This blocked the NCCL all-reduce collective, causing all other ranks across the 4-node " +
      "job to stall waiting for the unresponsive GPU.",
    difficulty: "intermediate",
    domains: [4],
    primaryFaults: [{ faultType: "gpu-hang", target: "specific-gpu" }],
    propagationTrigger: "xid-43",
    diagnosticPath: [
      "nvidia-smi",
      "dmesg | grep -i xid",
      "nvidia-smi -q -d PERFORMANCE",
      "squeue -u $USER",
      "nvidia-smi nvlink -s",
    ],
    rootCauseOptions: [
      "GPU 5 hang (XID 43) blocking NCCL collective across all ranks",
      "InfiniBand port flapping causing NCCL timeout",
      "Slurm scheduler preempted the job due to higher priority reservation",
      "NVLink CRC errors between GPU 4 and GPU 5",
    ],
    correctRootCause:
      "GPU 5 hang (XID 43) blocking NCCL collective across all ranks",
  },

  // =========================================================================
  // 3. GPU Fallen Off Bus (XID 79) — advanced, domain 5
  // =========================================================================
  {
    id: "gpu-off-bus-xid79",
    title: "GPU Fallen Off Bus (XID 79)",
    situation:
      "The on-call team receives a page: dgx-03 has been automatically drained by Slurm with reason " +
      "'GPU not responding.' nvidia-smi shows only 7 of 8 GPUs. The node was running a critical " +
      "inference workload for production. Users report HTTP 503 errors from the model endpoint. " +
      "The BMC event log shows a recent PCIe AER correctable error storm.",
    rootCause:
      "GPU 2 on dgx-03 fell off the PCIe bus (XID 79) after a cascade of PCIe Advanced Error " +
      "Reporting (AER) correctable errors exhausted the error threshold. The GPU is no longer " +
      "enumerated by the OS and requires a cold reboot or PCIe bus reset to recover.",
    difficulty: "advanced",
    domains: [5],
    primaryFaults: [{ faultType: "pcie-error", target: "specific-gpu" }],
    propagationTrigger: "xid-79",
    diagnosticPath: [
      "nvidia-smi",
      "dmesg | grep -i xid",
      "lspci | grep -i nvidia",
      "dmesg | grep -i aer",
      "ipmitool sel list",
      "nvidia-smi -q -d PAGE_RETIREMENT",
    ],
    rootCauseOptions: [
      "GPU 2 fell off PCIe bus (XID 79) after AER error cascade",
      "GPU 2 firmware corruption requiring reflash",
      "NVSwitch failure disconnected GPU 2 from the fabric",
      "Power supply unit 2 failed, depowering GPU 2",
      "Memory controller failure on GPU 2 HBM stack",
    ],
    correctRootCause:
      "GPU 2 fell off PCIe bus (XID 79) after AER error cascade",
  },

  // =========================================================================
  // 4. NVLink Fabric Degradation — intermediate, domain 2
  // =========================================================================
  {
    id: "nvlink-fabric-degradation",
    title: "NVLink Fabric Degradation",
    situation:
      "A large language model fine-tuning job on dgx-09 is running 40% slower than the baseline " +
      "established last week. The user has not changed any hyperparameters. GPU utilization " +
      "oscillates between 60-80% instead of the expected steady 95%. The Grafana NVLink bandwidth " +
      "panel shows link 2 between GPU 1 and GPU 2 at 50% of rated speed. No XID errors appear in " +
      "nvidia-smi output.",
    rootCause:
      "NVLink lane 2 between GPU 1 and GPU 2 on dgx-09 has degraded due to CRC replay errors. " +
      "The link automatically downshifted to half bandwidth. This bottlenecks the all-reduce " +
      "collective, reducing overall multi-GPU training throughput.",
    difficulty: "intermediate",
    domains: [2],
    primaryFaults: [{ faultType: "nvlink-failure", target: "specific-gpu" }],
    propagationTrigger: "nvlink-failure",
    diagnosticPath: [
      "nvidia-smi",
      "nvidia-smi nvlink -s",
      "nvidia-smi nvlink -e",
      "nvidia-smi topo -m",
      "dcgmi diag -r 3",
    ],
    rootCauseOptions: [
      "NVLink degradation between GPU 1 and GPU 2 causing bandwidth bottleneck",
      "GPU memory clock throttling due to thermal limits",
      "InfiniBand congestion from neighboring job traffic",
      "CUDA kernel regression in updated driver version",
    ],
    correctRootCause:
      "NVLink degradation between GPU 1 and GPU 2 causing bandwidth bottleneck",
  },

  // =========================================================================
  // 5. Thermal Runaway — beginner, domain 5
  // =========================================================================
  {
    id: "thermal-runaway",
    title: "Thermal Runaway",
    situation:
      "Facility monitoring alerts that dgx-15 inlet temperature sensors read 42C (threshold 35C). " +
      "Users on that node report training throughput dropped by 30% over the last hour. The DCIM " +
      "system shows CRAC unit 3 in the row is in alarm. nvidia-smi shows all 8 GPUs with clock " +
      "speeds significantly below the base frequency.",
    rootCause:
      "A failed CRAC unit caused ambient temperature in the hot aisle to rise above safe limits. " +
      "All 8 GPUs on dgx-15 engaged thermal throttling, reducing SM clocks to prevent hardware " +
      "damage. If uncorrected, the hottest GPU risks a thermal shutdown (XID 43).",
    difficulty: "beginner",
    domains: [5],
    primaryFaults: [{ faultType: "thermal", target: "node" }],
    propagationTrigger: "thermal-runaway",
    diagnosticPath: [
      "nvidia-smi",
      "nvidia-smi -q -d TEMPERATURE",
      "nvidia-smi -q -d PERFORMANCE",
      "sensors",
      "ipmitool sdr list",
    ],
    rootCauseOptions: [
      "Environmental thermal event causing GPU clock throttling across all GPUs",
      "GPU firmware bug causing incorrect clock frequency reporting",
      "Power cap policy applied by cluster administrator",
      "Faulty GPU voltage regulator on GPU 0",
    ],
    correctRootCause:
      "Environmental thermal event causing GPU clock throttling across all GPUs",
  },

  // =========================================================================
  // 6. ECC Accumulation Leading to Row Remap — advanced, domain 4
  // =========================================================================
  {
    id: "ecc-accumulation-row-remap",
    title: "ECC Accumulation Leading to Row Remap",
    situation:
      "Automated health checks flag dgx-21 GPU 6 with elevated correctable ECC error counts: " +
      "1,247 volatile errors in the last 24 hours (baseline < 10). The GPU is still operational " +
      "and the current training job has not failed. However, the DCGM health monitor shows a " +
      "warning state for this GPU. Page retirement pending count has increased from 0 to 3.",
    rootCause:
      "GPU 6 HBM2e memory is developing a progressive failure. Correctable ECC errors are " +
      "accumulating as memory cells degrade. The hardware has begun row remapping (XID 92) to " +
      "retire faulty rows. If remapping resources are exhausted (XID 63), the GPU will require " +
      "replacement.",
    difficulty: "advanced",
    domains: [4],
    primaryFaults: [{ faultType: "ecc-error", target: "specific-gpu" }],
    propagationTrigger: "ecc-accumulation",
    diagnosticPath: [
      "nvidia-smi -q -d ECC",
      "nvidia-smi -q -d PAGE_RETIREMENT",
      "dcgmi diag -r 3",
      "nvidia-smi -q -d ROW_REMAPPER",
      "dmesg | grep -i xid",
    ],
    rootCauseOptions: [
      "Progressive HBM memory failure with active row remapping (XID 92)",
      "Normal ECC correction — no action needed",
      "Driver bug causing inflated ECC counter reports",
      "Power delivery instability causing transient memory bit flips",
      "NVLink data corruption being misattributed to ECC errors",
    ],
    correctRootCause:
      "Progressive HBM memory failure with active row remapping (XID 92)",
  },

  // =========================================================================
  // 7. Multi-Node Job Failure (Slurm) — intermediate, domain 4
  // =========================================================================
  {
    id: "multi-node-job-failure",
    title: "Multi-Node Job Failure (Slurm)",
    situation:
      "A 16-node distributed training job (job ID 84291) failed after 6 hours of successful " +
      "training. The user reports the job exited with NCCL error 'unhandled system error.' " +
      "squeue shows the job as FAILED. sacct shows ExitCode 1 on rank 12 (node dgx-19) while " +
      "all other ranks show ExitCode 9 (SIGKILL). The Slurm dashboard shows dgx-19 is now in " +
      "DRAIN state with reason 'GPU not responding.'",
    rootCause:
      "GPU 7 on dgx-19 experienced a hang (XID 43). The NCCL collective stalled, rank 12 " +
      "reported the unhandled system error, and Slurm killed the remaining ranks. Slurm's " +
      "HealthCheckProgram subsequently drained dgx-19.",
    difficulty: "intermediate",
    domains: [4],
    primaryFaults: [{ faultType: "gpu-hang", target: "specific-gpu" }],
    propagationTrigger: "xid-43",
    diagnosticPath: [
      "sacct -j 84291 --format=JobID,NodeList,ExitCode,State",
      "sinfo -N -n dgx-19",
      "ssh dgx-19 nvidia-smi",
      "ssh dgx-19 dmesg | grep -i xid",
      "scontrol show node dgx-19",
    ],
    rootCauseOptions: [
      "GPU 7 hang (XID 43) on dgx-19 crashed rank 12 and cascaded to all ranks",
      "InfiniBand link failure between dgx-19 and spine switch",
      "Out-of-memory (OOM) kill on dgx-19 due to CPU memory exhaustion",
      "Slurm scheduler timeout expired for the job's time limit",
    ],
    correctRootCause:
      "GPU 7 hang (XID 43) on dgx-19 crashed rank 12 and cascaded to all ranks",
  },

  // =========================================================================
  // 8. Power Supply Stress — beginner, domain 1
  // =========================================================================
  {
    id: "power-supply-stress",
    title: "Power Supply Stress",
    situation:
      "The BMC on dgx-05 is reporting a power warning event. IPMI sensor readings show PSU 1 " +
      "output wattage at 2,850W (rated 3,000W). GPU power draw appears normal individually, but " +
      "nvidia-smi shows GPUs 0-3 have power limits reduced from 400W to 300W. The user reports " +
      "that their training job is running 20% slower than expected. No thermal warnings are present.",
    rootCause:
      "PSU 1 on dgx-05 is operating near capacity, triggering the system's power balancing " +
      "firmware to reduce GPU power limits on GPUs 0-3 (fed by PSU 1). This power capping reduces " +
      "GPU boost clocks and throughput.",
    difficulty: "beginner",
    domains: [1],
    primaryFaults: [{ faultType: "power", target: "node" }],
    propagationTrigger: "power-anomaly",
    diagnosticPath: [
      "nvidia-smi",
      "nvidia-smi -q -d POWER",
      "ipmitool sdr list",
      "ipmitool sel list",
      "sensors",
    ],
    rootCauseOptions: [
      "PSU 1 near capacity causing firmware-enforced GPU power capping",
      "GPU thermal throttling from high ambient temperature",
      "Administrator-configured power limit policy change",
      "Faulty GPU voltage regulators reporting incorrect power draw",
    ],
    correctRootCause:
      "PSU 1 near capacity causing firmware-enforced GPU power capping",
  },

  // =========================================================================
  // 9. InfiniBand Link Down — intermediate, domain 2
  // =========================================================================
  {
    id: "infiniband-link-down",
    title: "InfiniBand Link Down",
    situation:
      "Users report that multi-node jobs involving dgx-11 are failing immediately at launch. " +
      "Single-node jobs on dgx-11 work fine. The NCCL log shows 'No route to host' for the " +
      "IB interface. Monitoring shows dgx-11 was running normally until 45 minutes ago. The " +
      "facility team reports no recent maintenance. Other nodes in the same leaf switch group " +
      "are unaffected.",
    rootCause:
      "InfiniBand HCA port 1 on dgx-11 has gone to PhysLinkDown state. The port negotiation " +
      "failed after a transient cable or connector issue. The link is physically present but the " +
      "port cannot establish a connection to the leaf switch.",
    difficulty: "intermediate",
    domains: [2],
    primaryFaults: [{ faultType: "nvlink-failure", target: "node" }],
    propagationTrigger: "nvlink-failure",
    diagnosticPath: [
      "ibstat",
      "ibdiagnet",
      "iblinkinfo",
      "dmesg | grep -i mlx",
      "ip addr show ib0",
    ],
    rootCauseOptions: [
      "InfiniBand HCA port in PhysLinkDown state due to link negotiation failure",
      "Subnet manager misconfiguration after firmware update",
      "InfiniBand cable physically disconnected by facility team",
      "OFED driver crash requiring module reload",
    ],
    correctRootCause:
      "InfiniBand HCA port in PhysLinkDown state due to link negotiation failure",
  },

  // =========================================================================
  // 10. Combined: NVLink + Thermal (Two Root Causes) — advanced, domain 5
  // =========================================================================
  {
    id: "combined-nvlink-thermal",
    title: "Combined: NVLink + Thermal Failure",
    situation:
      "A high-priority 8-GPU training job on dgx-22 has degraded over the last 2 hours. The user " +
      "reports iteration time increased from 4.2s to 11.8s. Grafana shows GPU utilization varying " +
      "widely between 30-90% across GPUs instead of the usual uniform 95%. Two separate anomalies " +
      "are visible: NVLink error counters on links between GPUs 3-4 are climbing, and inlet " +
      "temperature reads 39C (warning threshold 35C). GPU clock speeds on GPUs 6-7 are below " +
      "base frequency. The user insists 'nothing changed on our end.'",
    rootCause:
      "Two independent failures are compounding. First, NVLink lanes between GPU 3 and GPU 4 " +
      "are experiencing CRC replay errors, reducing peer bandwidth by 50%. Second, rising ambient " +
      "temperature (likely from adjacent rack exhaust recirculation) has triggered thermal " +
      "throttling on GPUs 6 and 7. The combined effect creates a severe all-reduce bottleneck " +
      "from both bandwidth reduction and clock throttling.",
    difficulty: "advanced",
    domains: [5, 2],
    primaryFaults: [
      { faultType: "nvlink-failure", target: "specific-gpu" },
      { faultType: "thermal", target: "node" },
    ],
    propagationTrigger: "nvlink-failure",
    diagnosticPath: [
      "nvidia-smi",
      "nvidia-smi nvlink -s",
      "nvidia-smi nvlink -e",
      "nvidia-smi -q -d TEMPERATURE",
      "nvidia-smi -q -d PERFORMANCE",
      "sensors",
      "dcgmi diag -r 3",
    ],
    rootCauseOptions: [
      "Dual failure: NVLink degradation (GPUs 3-4) combined with thermal throttling (GPUs 6-7)",
      "NVSwitch firmware bug causing intermittent routing errors",
      "GPU memory leak in user code consuming all HBM capacity",
      "PCIe gen downgrade from Gen5 to Gen4 on multiple GPUs",
      "InfiniBand congestion from co-located noisy neighbor job",
    ],
    correctRootCause:
      "Dual failure: NVLink degradation (GPUs 3-4) combined with thermal throttling (GPUs 6-7)",
  },

  // =========================================================================
  // 11. BONUS: Driver Error During Bring-Up — beginner, domain 3
  // =========================================================================
  {
    id: "driver-error-bringup",
    title: "Driver Error During Bring-Up",
    situation:
      "After a scheduled OS update on dgx-01, the system rebooted but nvidia-smi returns " +
      "'NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.' " +
      "The Kubernetes kubelet on this node is reporting NotReady. Pods that were scheduled " +
      "here are in CrashLoopBackOff. The update ticket shows kernel was upgraded from " +
      "5.15.0-91 to 5.15.0-97.",
    rootCause:
      "The OS kernel upgrade to 5.15.0-97 invalidated the NVIDIA kernel module (nvidia.ko). " +
      "The DKMS auto-rebuild failed silently during the update. The NVIDIA driver is not loaded, " +
      "making all GPUs invisible to the system.",
    difficulty: "beginner",
    domains: [3],
    primaryFaults: [{ faultType: "driver-error", target: "node" }],
    propagationTrigger: "xid-79",
    diagnosticPath: [
      "nvidia-smi",
      "dmesg | grep -i nvidia",
      "lsmod | grep nvidia",
      "dkms status",
      "uname -r",
    ],
    rootCauseOptions: [
      "NVIDIA kernel module not loaded after kernel upgrade — DKMS rebuild failed",
      "GPU hardware failure on all 8 GPUs simultaneously",
      "Incorrect BIOS setting disabling PCIe slots after update",
      "CUDA toolkit version incompatible with installed driver",
    ],
    correctRootCause:
      "NVIDIA kernel module not loaded after kernel upgrade — DKMS rebuild failed",
  },
];
