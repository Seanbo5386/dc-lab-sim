// src/components/XidErrorReference.tsx
import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  Cpu,
  Zap,
  HardDrive,
} from "lucide-react";

interface XidError {
  code: number;
  name: string;
  severity: "Critical" | "Warning";
  category: "GPU" | "Memory" | "NVLink" | "Power" | "Driver";
  rootCause: string;
  actions: string[];
  relatedCommands: string[];
  examRelevant: boolean;
}

// Extracted from Documentation.tsx - XID error database
const xidErrors: XidError[] = [
  {
    code: 13,
    name: "Graphics Engine Exception",
    severity: "Warning",
    category: "GPU",
    rootCause:
      "Application crash or GPU hang during graphics/compute operations",
    actions: [
      "Check application logs for errors",
      "Verify driver compatibility",
      "Run dcgmi diag to test GPU health",
      "If persistent, may indicate hardware issue",
    ],
    relatedCommands: [
      "nvidia-smi -q",
      "dcgmi diag --mode 2",
      "dmesg | grep -i nvrm",
    ],
    examRelevant: true,
  },
  {
    code: 31,
    name: "GPU Memory Page Fault",
    severity: "Warning",
    category: "Memory",
    rootCause: "Invalid memory access by application - often a programming bug",
    actions: [
      "Review application for memory access issues",
      "Check CUDA memory allocation patterns",
      "Verify sufficient GPU memory available",
      "Test with cuda-memcheck",
    ],
    relatedCommands: ["nvidia-smi -q -d MEMORY", "cuda-memcheck"],
    examRelevant: true,
  },
  {
    code: 43,
    name: "GPU Stopped Processing",
    severity: "Critical",
    category: "GPU",
    rootCause: "GPU is no longer responding to commands",
    actions: [
      "Reset GPU with nvidia-smi -r",
      "Check power and thermal state",
      "Review recent workload changes",
      "May require system reboot if reset fails",
    ],
    relatedCommands: ["nvidia-smi -r", "nvidia-smi -q -d POWER,TEMPERATURE"],
    examRelevant: true,
  },
  {
    code: 48,
    name: "Double-Bit ECC Error",
    severity: "Critical",
    category: "Memory",
    rootCause: "Uncorrectable memory error - data corruption has occurred",
    actions: [
      "Check nvidia-smi for retired pages count",
      "Run dcgmi diag --mode 3 for comprehensive memory test",
      "If persistent, GPU replacement recommended",
      "Document error frequency for RMA",
    ],
    relatedCommands: ["nvidia-smi -q -d ECC", "dcgmi diag --mode 3"],
    examRelevant: true,
  },
  {
    code: 63,
    name: "ECC Page Retirement",
    severity: "Warning",
    category: "Memory",
    rootCause: "Memory page retired due to ECC errors - preventive action",
    actions: [
      "Monitor retired page count over time",
      "If approaching 64 retired pages, plan GPU replacement",
      "Check nvidia-smi -q -d ECC for details",
      "Normal wear indicator in long-running systems",
    ],
    relatedCommands: ["nvidia-smi -q -d ECC", "nvidia-smi -q -d RETIRED_PAGES"],
    examRelevant: true,
  },
  {
    code: 79,
    name: "GPU Fallen Off Bus",
    severity: "Critical",
    category: "Power",
    rootCause: "GPU lost PCIe connection - hardware failure or power issue",
    actions: [
      "Check PCIe slot seating and power cables",
      "Verify PSU capacity and 12V rail stability",
      "Inspect for physical damage",
      "Test in different PCIe slot if possible",
      "Likely requires GPU replacement",
    ],
    relatedCommands: [
      "lspci | grep -i nvidia",
      "dmesg | grep -i pci",
      "ipmitool sel list",
    ],
    examRelevant: true,
  },
  {
    code: 119,
    name: "GSP Error",
    severity: "Critical",
    category: "Driver",
    rootCause: "GPU System Processor firmware/driver communication failure",
    actions: [
      "Check driver/firmware version compatibility",
      "Update to latest driver and firmware",
      "Review NVIDIA release notes for known issues",
      "May indicate need for RMA if persists after update",
    ],
    relatedCommands: [
      "nvidia-smi -q -d FIRMWARE",
      "nvidia-smi -q | grep Driver",
    ],
    examRelevant: true,
  },
  {
    code: 45,
    name: "Preemptive Channel Removal",
    severity: "Warning",
    category: "GPU",
    rootCause: "GPU channel terminated to prevent system hang",
    actions: [
      "Review application for long-running kernels",
      "Check TDR (Timeout Detection Recovery) settings",
      "May indicate inefficient compute workload",
    ],
    relatedCommands: ["nvidia-smi -q", "dcgmi health --check"],
    examRelevant: false,
  },
  {
    code: 64,
    name: "Fallen Off Bus (Secondary)",
    severity: "Critical",
    category: "Power",
    rootCause: "Secondary GPU communication failure",
    actions: [
      "Check NVLink/NVSwitch connectivity",
      "Verify multi-GPU topology",
      "Inspect baseboard connections",
    ],
    relatedCommands: ["nvidia-smi topo -m", "nvidia-smi nvlink --status"],
    examRelevant: true,
  },
  {
    code: 74,
    name: "NVLink Error",
    severity: "Critical",
    category: "NVLink",
    rootCause: "NVLink communication failure between GPUs",
    actions: [
      "Check nvidia-smi nvlink --status for error counts",
      "Verify NVSwitch health if applicable",
      "May indicate failing NVLink bridge",
      "Run dcgmi diag to test NVLink paths",
    ],
    relatedCommands: [
      "nvidia-smi nvlink --status",
      "nvidia-smi topo -m",
      "dcgmi diag --mode 2",
    ],
    examRelevant: true,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  GPU: <Cpu className="w-4 h-4" />,
  Memory: <HardDrive className="w-4 h-4" />,
  NVLink: <Zap className="w-4 h-4" />,
  Power: <AlertTriangle className="w-4 h-4" />,
  Driver: <Info className="w-4 h-4" />,
};

export function XidErrorReference() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "Critical" | "Warning"
  >("all");

  const filteredErrors = useMemo(() => {
    return xidErrors.filter((error) => {
      const matchesSeverity =
        severityFilter === "all" || error.severity === severityFilter;
      const matchesSearch =
        searchQuery === "" ||
        error.code.toString().includes(searchQuery) ||
        error.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.rootCause.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [searchQuery, severityFilter]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">XID Error Reference</h2>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search XID code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSeverityFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "all"
                ? "bg-nvidia-green text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSeverityFilter("Critical")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "Critical"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setSeverityFilter("Warning")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severityFilter === "Warning"
                ? "bg-yellow-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Warning
          </button>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-4">
        {filteredErrors.map((error) => (
          <div
            key={error.code}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    error.severity === "Critical"
                      ? "bg-red-900/50 text-red-400"
                      : "bg-yellow-900/50 text-yellow-400"
                  }`}
                >
                  {error.severity === "Critical" ? (
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                  )}
                  XID {error.code}
                </span>
                <span className="text-white font-semibold">{error.name}</span>
                <span className="text-gray-500 flex items-center gap-1">
                  {categoryIcons[error.category]}
                  {error.category}
                </span>
              </div>
              {error.examRelevant && (
                <span className="bg-nvidia-green/20 text-nvidia-green text-xs px-2 py-1 rounded">
                  Exam Relevant
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-4">{error.rootCause}</p>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Recommended Actions:
              </h4>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                {error.actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Related Commands:
              </h4>
              <div className="flex flex-wrap gap-2">
                {error.relatedCommands.map((cmd, i) => (
                  <code
                    key={i}
                    className="text-sm bg-gray-900 text-nvidia-green px-2 py-1 rounded"
                  >
                    {cmd}
                  </code>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
