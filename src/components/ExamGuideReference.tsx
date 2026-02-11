import React, { useState } from "react";
import {
  BookOpen,
  Award,
  Clock,
  Target,
  CheckCircle,
  GraduationCap,
  FileText,
  ExternalLink,
  Server,
  AlertTriangle,
  Terminal,
  Network,
  Activity,
  Cpu,
  HardDrive,
  Shield,
  List,
  Monitor,
  Settings,
  Link,
  Thermometer,
  Brain,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

// Exam domain data
const examDomains = [
  {
    id: 1,
    title: "Domain 1: System Installation & Configuration",
    weight: 31,
    color: "#76b900",
    objectives: [
      "Verify hardware inventory and validate physical connections",
      "Configure BMC/IPMI settings and network parameters",
      "Perform firmware updates and BIOS configuration",
      "Validate GPU topology and NVLink connectivity",
      "Configure storage and file systems",
      "Understand DGX system architecture and components",
      "Configure network interfaces (management, compute, storage)",
    ],
    keyCommands: [
      "ipmitool",
      "nvidia-smi -L",
      "dmidecode",
      "lspci",
      "nvsm",
      "nvidia-smi topo -m",
      "ibstat",
    ],
    studyTips: [
      "Know the DGX A100/H100 hardware specifications cold",
      "Practice BMC configuration via ipmitool sensor, sel, fru commands",
      "Understand the boot sequence and POST verification",
      "Memorize GPU memory sizes: A100 (40GB/80GB), H100 (80GB)",
    ],
  },
  {
    id: 2,
    title: "Domain 2: Physical Layer Management",
    weight: 5,
    color: "#3b82f6",
    objectives: [
      "Configure InfiniBand HCAs and DPUs",
      "Manage NVLink and NVSwitch fabric",
      "Configure MIG (Multi-Instance GPU) partitioning",
      "Validate network topology and bandwidth",
      "Understand ConnectX adapter configuration",
    ],
    keyCommands: [
      "mlxconfig",
      "mst start",
      "mst status",
      "ibstat",
      "nvidia-smi mig -lgip",
      "nvidia-smi mig -cgi",
      "nvidia-smi topo -m",
    ],
    studyTips: [
      "Memorize MIG profile IDs: 1g.5gb, 2g.10gb, 3g.20gb, 4g.20gb, 7g.40gb",
      "Understand NVLink topology matrix output symbols",
      "Know InfiniBand port states: Active, Init, Down",
      "Small domain (5%) but don't skip it - easy points!",
    ],
  },
  {
    id: 3,
    title: "Domain 3: Control Plane Installation",
    weight: 19,
    color: "#8b5cf6",
    objectives: [
      "Deploy Base Command Manager (BCM)",
      "Configure Slurm scheduler with GPU GRES",
      "Set up container runtime (Docker, Enroot, Pyxis)",
      "Configure high availability for management services",
      "Deploy Kubernetes with GPU operator",
      "Understand BCM architecture and components",
    ],
    keyCommands: [
      "cmsh",
      "sinfo",
      "scontrol show node",
      "srun",
      "sbatch",
      "docker",
      "enroot",
      "kubectl",
    ],
    studyTips: [
      "Understand Slurm GRES configuration: gres.conf and slurm.conf",
      "Know BCM HA failover procedures and health checks",
      "Practice container deployment with --gpus flag",
      "Understand the difference between Enroot and Pyxis",
    ],
  },
  {
    id: 4,
    title: "Domain 4: Validation & Troubleshooting",
    weight: 33,
    color: "#eab308",
    objectives: [
      "Run and interpret DCGM diagnostics (levels 1-3)",
      "Execute HPL and NCCL benchmarks",
      "Diagnose GPU health issues and XID errors",
      "Troubleshoot InfiniBand fabric problems",
      "Analyze thermal and power issues",
      "Interpret nvidia-smi output for troubleshooting",
      "Use system logs for root cause analysis",
    ],
    keyCommands: [
      "dcgmi diag -r 1/2/3",
      "dcgmi health -c",
      "nvsm show health",
      "nvidia-smi -q",
      "nvidia-smi -q -d ECC",
      "ibdiagnet",
      "dmesg | grep -i nvrm",
    ],
    studyTips: [
      "THIS IS THE LARGEST DOMAIN (33%) - Master it!",
      "Memorize critical XID codes: 43, 48, 63, 64, 74, 79, 92, 94, 95",
      "Know the diagnostic workflow: symptoms -> logs -> tools -> resolution",
      "Understand DCGM diagnostic levels and what each tests",
      "Practice interpreting ECC error counts and their significance",
    ],
  },
  {
    id: 5,
    title: "Domain 5: Maintenance",
    weight: 12,
    color: "#f97316",
    objectives: [
      "Collect diagnostic logs and support bundles",
      "Perform driver and firmware upgrades",
      "Execute GPU and component replacement procedures",
      "Manage backup and restore operations",
      "Understand RMA procedures and when to use them",
    ],
    keyCommands: [
      "nvsm dump health",
      "nvidia-bug-report.sh",
      "apt",
      "nvidia-installer",
      "fwupdmgr",
    ],
    studyTips: [
      "Know the proper upgrade sequence: stop workloads -> backup -> upgrade driver -> upgrade firmware",
      "Understand when to RMA vs troubleshoot (ECC errors, row remapping)",
      "Practice log collection with nvidia-bug-report.sh",
      "Know how to create and restore system snapshots",
    ],
  },
];

// Official resources data
const officialResources = [
  {
    title: "NCP-AII Certification Page",
    url: "https://www.nvidia.com/en-us/learn/certification/",
    description:
      "Official certification overview, registration, and exam details",
    icon: Award,
  },
  {
    title: "NVIDIA Deep Learning Institute (DLI)",
    url: "https://www.nvidia.com/en-us/training/",
    description: "Official training courses and learning paths",
    icon: GraduationCap,
  },
  {
    title: "DGX System Documentation",
    url: "https://docs.nvidia.com/dgx/",
    description: "Complete DGX A100/H100 user guides and admin manuals",
    icon: BookOpen,
  },
  {
    title: "Base Command Manager Docs",
    url: "https://docs.nvidia.com/base-command-manager/",
    description: "BCM installation, configuration, and administration",
    icon: Server,
  },
  {
    title: "DCGM Documentation",
    url: "https://docs.nvidia.com/datacenter/dcgm/latest/",
    description: "Data Center GPU Manager user guide and API reference",
    icon: Monitor,
  },
  {
    title: "NVIDIA Driver Documentation",
    url: "https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/",
    description: "CUDA toolkit and driver compatibility matrices",
    icon: Settings,
  },
  {
    title: "NVSM User Guide",
    url: "https://docs.nvidia.com/datacenter/nvsm/",
    description: "NVIDIA System Management Interface documentation",
    icon: Activity,
  },
  {
    title: "XID Error Reference",
    url: "https://docs.nvidia.com/deploy/xid-errors/",
    description: "Official XID error codes and troubleshooting guide",
    icon: AlertTriangle,
  },
];

// Additional study resources
const additionalResources = [
  {
    title: "NVIDIA Networking (Mellanox) Docs",
    url: "https://docs.nvidia.com/networking/",
    description: "InfiniBand, ConnectX, and BlueField documentation",
    icon: Network,
  },
  {
    title: "Slurm Workload Manager",
    url: "https://slurm.schedmd.com/documentation.html",
    description: "Slurm configuration, GRES, and GPU scheduling",
    icon: List,
  },
  {
    title: "NVIDIA GPU Operator",
    url: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/",
    description: "Kubernetes GPU operator deployment and config",
    icon: Cpu,
  },
  {
    title: "NCCL Documentation",
    url: "https://docs.nvidia.com/deeplearning/nccl/",
    description: "Collective communications library for multi-GPU",
    icon: Link,
  },
  {
    title: "MIG User Guide",
    url: "https://docs.nvidia.com/datacenter/tesla/mig-user-guide/",
    description: "Multi-Instance GPU configuration and management",
    icon: HardDrive,
  },
  {
    title: "IPMI Guide",
    url: "https://www.intel.com/content/www/us/en/search.html#q=iPMI",
    description: "IPMI protocol reference for BMC management",
    icon: Shield,
  },
];

// Reusable components
const Card: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors">
    <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
      {icon && <span className="text-nvidia-green">{icon}</span>}
      {title}
    </h4>
    {children}
  </div>
);

const ResourceLink: React.FC<{
  title: string;
  url: string;
  description: string;
  icon: React.ReactNode;
}> = ({ title, url, description, icon }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-nvidia-green/50 hover:bg-gray-800 transition-colors group"
  >
    <div className="text-nvidia-green mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-white text-sm group-hover:text-nvidia-green transition-colors">
          {title}
        </span>
        <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-nvidia-green" />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
    </div>
  </a>
);

const ExamDomainCard: React.FC<{
  title: string;
  percentage: number;
  color: string;
  objectives: string[];
  keyCommands: string[];
  studyTips: string[];
}> = ({ title, percentage, color, objectives, keyCommands, studyTips }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h4 className="font-bold text-white flex-1">{title}</h4>
          <div className="flex items-center gap-3">
            <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-sm font-bold" style={{ color }}>
              {percentage}%
            </span>
            <ChevronRight
              className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Learning Objectives
            </h5>
            <ul className="space-y-1">
              {objectives.map((obj, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-nvidia-green shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Key Commands
            </h5>
            <div className="flex flex-wrap gap-2">
              {keyCommands.map((cmd) => (
                <code
                  key={cmd}
                  className="text-xs bg-black px-2 py-1 rounded border border-gray-700 text-nvidia-green"
                >
                  {cmd}
                </code>
              ))}
            </div>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Study Tips
            </h5>
            <ul className="space-y-1">
              {studyTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-nvidia-green">-</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export function ExamGuideReference() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-nvidia-green" />
        NCP-AII Exam Guide
      </h2>

      {/* Exam Overview */}
      <Card title="Exam Overview" icon={<FileText className="w-4 h-4" />}>
        <div className="space-y-4 text-sm">
          <p className="text-gray-300">
            The{" "}
            <strong className="text-nvidia-green">
              NVIDIA Certified Professional - AI Infrastructure (NCP-AII)
            </strong>{" "}
            exam validates your ability to deploy, manage, and troubleshoot
            NVIDIA DGX systems and AI infrastructure.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="text-nvidia-green font-bold text-lg">50-60</div>
              <div className="text-gray-400 text-xs">Questions</div>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="text-nvidia-green font-bold text-lg">90 min</div>
              <div className="text-gray-400 text-xs">Time Limit</div>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="text-nvidia-green font-bold text-lg">70%</div>
              <div className="text-gray-400 text-xs">Passing Score</div>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="text-nvidia-green font-bold text-lg">$395</div>
              <div className="text-gray-400 text-xs">Exam Fee</div>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Exam Format Tips
            </h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>- Multiple choice and multiple response questions</li>
              <li>- Scenario-based questions testing practical knowledge</li>
              <li>- Some questions may have more than one correct answer</li>
              <li>- Read questions carefully - command syntax matters</li>
              <li>- Flag difficult questions and return to them later</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Domain Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
          <Target className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-xl font-bold text-white">Exam Domains</h3>
        </div>

        {examDomains.map((domain) => (
          <ExamDomainCard
            key={domain.id}
            title={domain.title}
            percentage={domain.weight}
            color={domain.color}
            objectives={domain.objectives}
            keyCommands={domain.keyCommands}
            studyTips={domain.studyTips}
          />
        ))}
      </div>

      {/* Critical Knowledge Section */}
      <Card
        title="Critical Knowledge: Must Memorize"
        icon={<Brain className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-3">
              Critical XID Codes (Memorize These!)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 43</span>{" "}
                - GPU stopped responding (thermal/hang)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 48</span>{" "}
                - Double-bit ECC error (HW failure)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 63</span>{" "}
                - Row remapping failure (HW replace)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 64</span>{" "}
                - Row remapping threshold exceeded
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 74</span>{" "}
                - NVLink error (check cables/seating)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-red-400 font-mono font-bold">XID 79</span>{" "}
                - GPU fallen off bus (power/thermal)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-yellow-400 font-mono font-bold">
                  XID 13
                </span>{" "}
                - Graphics engine exception (SW issue)
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-yellow-400 font-mono font-bold">
                  XID 31
                </span>{" "}
                - GPU memory page fault (app bug)
              </div>
            </div>
          </div>

          <div className="bg-nvidia-green/10 border border-nvidia-green/30 rounded-lg p-4">
            <h4 className="font-semibold text-nvidia-green mb-3">
              MIG Profile IDs (A100 80GB)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-black/50 p-2 rounded">
                <span className="text-nvidia-green font-mono">1g.10gb</span> - 1
                slice, 10GB
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-nvidia-green font-mono">2g.20gb</span> - 2
                slices, 20GB
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-nvidia-green font-mono">3g.40gb</span> - 3
                slices, 40GB
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-nvidia-green font-mono">4g.40gb</span> - 4
                slices, 40GB
              </div>
              <div className="bg-black/50 p-2 rounded">
                <span className="text-nvidia-green font-mono">7g.80gb</span> - 7
                slices, 80GB
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Command:{" "}
              <code className="text-nvidia-green">nvidia-smi mig -lgip</code> to
              list profiles
            </p>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-3">
              DCGM Diagnostic Levels
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono font-bold w-24">
                  Level 1 (Quick)
                </span>
                <span className="text-gray-300">
                  ~1 min - Basic health check, memory test
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono font-bold w-24">
                  Level 2 (Medium)
                </span>
                <span className="text-gray-300">
                  ~2 min - PCIe bandwidth, basic compute
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono font-bold w-24">
                  Level 3 (Long)
                </span>
                <span className="text-gray-300">
                  ~15 min - Full stress test, memory, compute
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Command:{" "}
              <code className="text-blue-400">dcgmi diag -r [1|2|3]</code>
            </p>
          </div>

          <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400 mb-3">
              InfiniBand Port States
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-black/50 p-2 rounded text-center">
                <span className="text-green-400 font-bold">Active</span>
                <div className="text-gray-500">Normal operation</div>
              </div>
              <div className="bg-black/50 p-2 rounded text-center">
                <span className="text-yellow-400 font-bold">Init</span>
                <div className="text-gray-500">Initializing link</div>
              </div>
              <div className="bg-black/50 p-2 rounded text-center">
                <span className="text-red-400 font-bold">Down</span>
                <div className="text-gray-500">Link failure</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Command: <code className="text-purple-400">ibstat</code> or{" "}
              <code className="text-purple-400">ibstatus</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Key Thresholds Reference */}
      <Card
        title="Key Thresholds to Memorize"
        icon={<Thermometer className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-3">
                Temperature Limits
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Inlet Temp (Optimal)</span>
                  <span className="text-green-400">&lt; 35 C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GPU Temp (Normal)</span>
                  <span className="text-green-400">&lt; 83 C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GPU Temp (Warning)</span>
                  <span className="text-yellow-400">83-90 C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GPU Temp (Critical)</span>
                  <span className="text-red-400">&gt; 90 C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory Temp (Max)</span>
                  <span className="text-red-400">95 C</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-3">
                Power Limits
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">A100 TDP</span>
                  <span className="text-gray-300">400W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">H100 TDP</span>
                  <span className="text-gray-300">700W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DGX A100 System</span>
                  <span className="text-gray-300">6.5 kW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DGX H100 System</span>
                  <span className="text-gray-300">10.2 kW</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-3">
                Error Thresholds
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Single-bit ECC (OK)</span>
                  <span className="text-green-400">Low count</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    Single-bit ECC (Warning)
                  </span>
                  <span className="text-yellow-400">Increasing</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Double-bit ECC</span>
                  <span className="text-red-400">ANY = Bad</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Row Remapping</span>
                  <span className="text-red-400">Failure = RMA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Study Tips */}
      <Card
        title="Exam Preparation Strategy"
        icon={<Target className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Prioritize by Weight
              </h4>
              <p className="text-xs text-gray-400">
                Focus 60%+ of study time on Domains 1 (31%) and 4 (33%). These
                two domains cover 64% of the exam.
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Hands-On Practice
              </h4>
              <p className="text-xs text-gray-400">
                Use this simulator daily to practice commands. The exam tests
                practical skills, not just theory.
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Know Your XID Codes
              </h4>
              <p className="text-xs text-gray-400">
                Memorize critical XID codes and their meanings. Know which
                require RMA vs troubleshooting.
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-nvidia-green mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Command Syntax
              </h4>
              <p className="text-xs text-gray-400">
                Know exact flag syntax for nvidia-smi, dcgmi, ipmitool, and
                ibstat. Typos waste time.
              </p>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border border-nvidia-green/30">
            <h4 className="font-semibold text-nvidia-green mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Suggested Study Schedule (2-4 Weeks)
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex gap-3">
                <span className="text-nvidia-green font-bold w-20">Week 1</span>
                <span className="text-gray-300">
                  Read all official NVIDIA documentation. Focus on DGX
                  architecture and components.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-nvidia-green font-bold w-20">Week 2</span>
                <span className="text-gray-300">
                  Deep dive into Domains 1 & 4. Practice commands daily in the
                  simulator.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-nvidia-green font-bold w-20">Week 3</span>
                <span className="text-gray-300">
                  Cover Domains 2, 3 & 5. Complete all simulator lab scenarios.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-nvidia-green font-bold w-20">Week 4</span>
                <span className="text-gray-300">
                  Review weak areas. Practice troubleshooting scenarios.
                  Memorize XID codes.
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Official Resources Section */}
      <Card
        title="Official NVIDIA Resources"
        icon={<ExternalLink className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Start your preparation with these official NVIDIA resources. These
            are the authoritative sources for exam content.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {officialResources.map((resource) => (
              <ResourceLink
                key={resource.title}
                title={resource.title}
                url={resource.url}
                description={resource.description}
                icon={<resource.icon className="w-4 h-4" />}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Additional Study Resources */}
      <Card
        title="Additional Study Resources"
        icon={<BookOpen className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionalResources.map((resource) => (
              <ResourceLink
                key={resource.title}
                title={resource.title}
                url={resource.url}
                description={resource.description}
                icon={<resource.icon className="w-4 h-4" />}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Quick Command Reference */}
      <Card
        title="Quick Command Reference"
        icon={<Terminal className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">
                GPU Status
              </h5>
              <code className="text-gray-300 block">nvidia-smi</code>
              <code className="text-gray-300 block">nvidia-smi -q</code>
              <code className="text-gray-300 block">
                nvidia-smi -q -d TEMPERATURE
              </code>
              <code className="text-gray-300 block">nvidia-smi -q -d ECC</code>
              <code className="text-gray-300 block">
                nvidia-smi -q -d MEMORY
              </code>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">
                Health & Diagnostics
              </h5>
              <code className="text-gray-300 block">nvsm show health</code>
              <code className="text-gray-300 block">dcgmi diag -r 1</code>
              <code className="text-gray-300 block">dcgmi health -c</code>
              <code className="text-gray-300 block">nvidia-bug-report.sh</code>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">
                Topology & NVLink
              </h5>
              <code className="text-gray-300 block">nvidia-smi topo -m</code>
              <code className="text-gray-300 block">nvidia-smi nvlink -s</code>
              <code className="text-gray-300 block">nvidia-smi nvlink -e</code>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">
                InfiniBand
              </h5>
              <code className="text-gray-300 block">ibstat</code>
              <code className="text-gray-300 block">ibstatus</code>
              <code className="text-gray-300 block">ibdiagnet</code>
              <code className="text-gray-300 block">iblinkinfo</code>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">BMC/IPMI</h5>
              <code className="text-gray-300 block">ipmitool sensor list</code>
              <code className="text-gray-300 block">ipmitool sel list</code>
              <code className="text-gray-300 block">ipmitool fru print</code>
              <code className="text-gray-300 block">
                ipmitool chassis status
              </code>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <h5 className="text-nvidia-green font-semibold mb-2">MIG</h5>
              <code className="text-gray-300 block">nvidia-smi mig -lgip</code>
              <code className="text-gray-300 block">
                nvidia-smi mig -cgi [profile]
              </code>
              <code className="text-gray-300 block">nvidia-smi mig -lgi</code>
              <code className="text-gray-300 block">nvidia-smi mig -dgi</code>
            </div>
          </div>
        </div>
      </Card>

      {/* Common Exam Mistakes */}
      <Card
        title="Common Exam Mistakes to Avoid"
        icon={<AlertTriangle className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-2">
                Command Syntax Errors
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>
                  - Using{" "}
                  <code className="text-red-300">nvidia-smi -d ECC</code>{" "}
                  instead of{" "}
                  <code className="text-green-300">nvidia-smi -q -d ECC</code>
                </li>
                <li>
                  - Forgetting <code className="text-green-300">mst start</code>{" "}
                  before using mlxconfig
                </li>
                <li>
                  - Using <code className="text-red-300">dcgmi diag 1</code>{" "}
                  instead of{" "}
                  <code className="text-green-300">dcgmi diag -r 1</code>
                </li>
                <li>
                  - Confusing <code className="text-green-300">ibstat</code>{" "}
                  (detailed) vs <code className="text-green-300">ibstatus</code>{" "}
                  (brief)
                </li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-2">
                XID Code Confusion
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>
                  - Thinking XID 43 always requires RMA (often recoverable with
                  reset)
                </li>
                <li>
                  - Confusing XID 63 (row remap failure) with XID 64 (threshold
                  warning)
                </li>
                <li>
                  - Trying GPU reset for XID 79 (won't work - GPU is off bus)
                </li>
                <li>- Not checking row remapper status for ECC errors</li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-2">
                Troubleshooting Order
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>- Jumping to RMA without checking thermal/power first</li>
                <li>- Not correlating SEL logs with GPU events</li>
                <li>
                  - Forgetting to check volatile vs aggregate ECC counters
                </li>
                <li>
                  - Missing the difference between correctable and uncorrectable
                  errors
                </li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-2">
                MIG Configuration
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>
                  - Forgetting to enable MIG mode before creating instances
                </li>
                <li>- Not destroying compute instances before GPU instances</li>
                <li>- Confusing GPU instance (GI) vs compute instance (CI)</li>
                <li>- Wrong profile ID syntax (1g.10gb not 1g.10GB)</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Glossary */}
      <Card
        title="Glossary: Key Acronyms"
        icon={<BookOpen className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-2">
            <h5 className="font-semibold text-nvidia-green">GPU & Compute</h5>
            <div className="space-y-1">
              <div>
                <span className="text-white font-mono">CUDA</span>{" "}
                <span className="text-gray-400">
                  - Compute Unified Device Architecture
                </span>
              </div>
              <div>
                <span className="text-white font-mono">MIG</span>{" "}
                <span className="text-gray-400">- Multi-Instance GPU</span>
              </div>
              <div>
                <span className="text-white font-mono">GI</span>{" "}
                <span className="text-gray-400">- GPU Instance (MIG)</span>
              </div>
              <div>
                <span className="text-white font-mono">CI</span>{" "}
                <span className="text-gray-400">- Compute Instance (MIG)</span>
              </div>
              <div>
                <span className="text-white font-mono">SM</span>{" "}
                <span className="text-gray-400">
                  - Streaming Multiprocessor
                </span>
              </div>
              <div>
                <span className="text-white font-mono">HBM</span>{" "}
                <span className="text-gray-400">- High Bandwidth Memory</span>
              </div>
              <div>
                <span className="text-white font-mono">ECC</span>{" "}
                <span className="text-gray-400">- Error Correcting Code</span>
              </div>
              <div>
                <span className="text-white font-mono">XID</span>{" "}
                <span className="text-gray-400">- NVIDIA Error Identifier</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h5 className="font-semibold text-nvidia-green">Networking</h5>
            <div className="space-y-1">
              <div>
                <span className="text-white font-mono">IB</span>{" "}
                <span className="text-gray-400">- InfiniBand</span>
              </div>
              <div>
                <span className="text-white font-mono">HCA</span>{" "}
                <span className="text-gray-400">- Host Channel Adapter</span>
              </div>
              <div>
                <span className="text-white font-mono">DPU</span>{" "}
                <span className="text-gray-400">- Data Processing Unit</span>
              </div>
              <div>
                <span className="text-white font-mono">RDMA</span>{" "}
                <span className="text-gray-400">
                  - Remote Direct Memory Access
                </span>
              </div>
              <div>
                <span className="text-white font-mono">NCCL</span>{" "}
                <span className="text-gray-400">
                  - NVIDIA Collective Comm Library
                </span>
              </div>
              <div>
                <span className="text-white font-mono">NVLink</span>{" "}
                <span className="text-gray-400">- NVIDIA GPU Interconnect</span>
              </div>
              <div>
                <span className="text-white font-mono">NVSwitch</span>{" "}
                <span className="text-gray-400">- NVLink Fabric Switch</span>
              </div>
              <div>
                <span className="text-white font-mono">HDR/NDR</span>{" "}
                <span className="text-gray-400">- IB Speed (200/400 Gb/s)</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h5 className="font-semibold text-nvidia-green">
              Management & Tools
            </h5>
            <div className="space-y-1">
              <div>
                <span className="text-white font-mono">DCGM</span>{" "}
                <span className="text-gray-400">- Data Center GPU Manager</span>
              </div>
              <div>
                <span className="text-white font-mono">NVSM</span>{" "}
                <span className="text-gray-400">
                  - NVIDIA System Management
                </span>
              </div>
              <div>
                <span className="text-white font-mono">BMC</span>{" "}
                <span className="text-gray-400">
                  - Baseboard Management Controller
                </span>
              </div>
              <div>
                <span className="text-white font-mono">IPMI</span>{" "}
                <span className="text-gray-400">
                  - Intelligent Platform Mgmt Interface
                </span>
              </div>
              <div>
                <span className="text-white font-mono">SEL</span>{" "}
                <span className="text-gray-400">- System Event Log</span>
              </div>
              <div>
                <span className="text-white font-mono">FRU</span>{" "}
                <span className="text-gray-400">- Field Replaceable Unit</span>
              </div>
              <div>
                <span className="text-white font-mono">BCM</span>{" "}
                <span className="text-gray-400">- Base Command Manager</span>
              </div>
              <div>
                <span className="text-white font-mono">GRES</span>{" "}
                <span className="text-gray-400">
                  - Generic Resource (Slurm)
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
