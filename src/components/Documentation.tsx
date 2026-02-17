import React, { useState, useMemo } from "react";
import {
  Server,
  Terminal,
  AlertTriangle,
  Network,
  Shield,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  ChevronRight,
  Search,
  Zap,
  Link,
  Thermometer,
  Settings,
  Code,
  GraduationCap,
  FileText,
  Target,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Award,
  Clock,
  Brain,
  Lightbulb,
  List,
  Monitor,
} from "lucide-react";
import {
  XID_ERRORS,
  SEVERITY_COLORS,
  searchXIDs,
  type XIDError,
  type XIDSeverity,
} from "@/data/xidErrors";
import { ArchitectureComparison } from "./ArchitectureComparison";
import { CommandsReference } from "./CommandsReference";

type DocTab =
  | "architecture"
  | "commands"
  | "troubleshooting"
  | "xid"
  | "exam"
  | "glossary";

export const Documentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocTab>("architecture");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-5">
        <h2 className="text-2xl font-bold text-nvidia-green mb-1">
          Documentation & Reference
        </h2>
        <p className="text-gray-400 text-sm">
          Comprehensive guide to the DGX SuperPOD simulator, tools, and NCP-AII
          certification.
        </p>
      </div>

      {/* Tabs - responsive with flex-wrap */}
      <div
        data-tour="doc-sub-tabs"
        className="flex flex-wrap border-b border-gray-700 bg-gray-900/50"
      >
        <TabButton
          active={activeTab === "architecture"}
          onClick={() => setActiveTab("architecture")}
          icon={<Server className="w-4 h-4" />}
          label="Architecture"
          dataTour="doc-architecture"
        />
        <TabButton
          active={activeTab === "commands"}
          onClick={() => setActiveTab("commands")}
          icon={<Terminal className="w-4 h-4" />}
          label="Commands"
          dataTour="doc-commands"
        />
        <TabButton
          active={activeTab === "troubleshooting"}
          onClick={() => setActiveTab("troubleshooting")}
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Troubleshooting"
          dataTour="doc-troubleshooting"
        />
        <TabButton
          active={activeTab === "xid"}
          onClick={() => setActiveTab("xid")}
          icon={<Zap className="w-4 h-4" />}
          label="XID Reference"
          dataTour="doc-xid"
        />
        <TabButton
          active={activeTab === "exam"}
          onClick={() => setActiveTab("exam")}
          icon={<GraduationCap className="w-4 h-4" />}
          label="Exam Guide"
          dataTour="doc-exam"
        />
        <TabButton
          active={activeTab === "glossary"}
          onClick={() => setActiveTab("glossary")}
          icon={<BookOpen className="w-4 h-4" />}
          label="Glossary"
          dataTour="doc-glossary"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-900">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Architecture Tab */}
          {activeTab === "architecture" && <ArchitectureContent />}

          {/* Commands Tab */}
          {activeTab === "commands" && <CommandsReference />}

          {/* Troubleshooting Tab */}
          {activeTab === "troubleshooting" && <TroubleshootingContent />}

          {/* XID Reference Tab */}
          {activeTab === "xid" && <XIDReferenceContent />}

          {/* Exam Tab */}
          {activeTab === "exam" && <ExamGuideContent />}

          {/* Glossary Tab */}
          {activeTab === "glossary" && <GlossaryContent />}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

const ArchitectureContent: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      title="Cluster Topology: DGX SuperPOD"
      icon={<Network className="w-5 h-5 text-nvidia-green" />}
    />

    {/* Cluster Overview */}
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
        <span className="text-nvidia-green">
          <Server className="w-4 h-4" />
        </span>
        Cluster Overview
      </h4>
      <p className="text-gray-300 text-sm mb-4">
        The simulated SuperPOD consists of{" "}
        <strong className="text-nvidia-green">8 DGX nodes</strong>{" "}
        interconnected via a rail-optimized Fat Tree InfiniBand fabric. Each
        node contains 8 GPUs with NVSwitch-based all-to-all connectivity,
        multiple HCAs for multi-rail InfiniBand, and local NVMe storage. Use the
        Architecture Comparison table below to view specific hardware specs for
        each DGX generation.
      </p>

      {/* Key characteristics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Compute Nodes", value: "8", sub: "DGX systems" },
          { label: "GPUs per Node", value: "8", sub: "NVSwitch connected" },
          {
            label: "Network Planes",
            value: "3",
            sub: "Compute · Storage · Mgmt",
          },
          {
            label: "Fabric Topology",
            value: "Fat Tree",
            sub: "2-tier rail-optimized",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 rounded-lg p-3 border border-gray-700 text-center"
          >
            <div className="text-xl font-bold text-nvidia-green">
              {stat.value}
            </div>
            <div className="text-xs font-semibold text-gray-300">
              {stat.label}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Node table */}
      <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <div className="grid grid-cols-4 gap-4 text-gray-500 border-b border-gray-800 pb-2 mb-2 min-w-[400px] text-xs font-semibold uppercase tracking-wider">
          <span>Hostname</span>
          <span>Mgmt IP</span>
          <span>BMC IP</span>
          <span>IB Subnet</span>
        </div>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 min-w-[400px] py-1 hover:bg-gray-900/50 rounded transition-colors"
          >
            <span className="text-nvidia-green">
              dgx-{i.toString().padStart(2, "0")}
            </span>
            <span className="text-gray-300">10.0.0.{i + 10}</span>
            <span className="text-gray-300">192.168.0.{i + 100}</span>
            <span className="text-gray-300">172.16.{i}.0/24</span>
          </div>
        ))}
      </div>
    </div>

    {/* Network Fabric Architecture */}
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <h4 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
        <span className="text-nvidia-green">
          <Wifi className="w-4 h-4" />
        </span>
        Network Fabric Architecture
      </h4>
      <p className="text-gray-300 text-sm mb-5">
        Three isolated network planes provide dedicated bandwidth for compute,
        storage, and management traffic. Exact speeds and link counts vary by
        DGX generation&mdash;see the Architecture Comparison table for
        specifics.
      </p>

      <div className="space-y-4">
        {/* Compute Fabric */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-900/80">
            <Network className="w-4 h-4 text-nvidia-green" />
            <h5 className="font-semibold text-nvidia-green text-sm">
              Compute Fabric &mdash; InfiniBand
            </h5>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">
              Rail-optimized 2-tier Fat Tree with full bisection bandwidth. Each
              node has multiple HCAs (one per GPU rail) for GPU-Direct RDMA,
              enabling NCCL all-reduce across nodes without CPU involvement.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Topology", value: "Fat Tree (2-tier)" },
                { label: "Protocol", value: "InfiniBand HDR/NDR" },
                { label: "Routing", value: "Rail-Optimized" },
                { label: "Key Features", value: "GPU-Direct RDMA" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-sm font-mono font-semibold text-gray-200">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-black/40 rounded p-3 text-xs text-gray-400">
              <span className="text-gray-500">Multi-rail design:</span> Each GPU
              has a dedicated HCA, providing 1:1 GPU-to-network mapping.
              Adaptive Routing and SHARP in-network reduction minimize
              congestion and accelerate collective operations.
            </div>
          </div>
        </div>

        {/* Intra-Node Interconnect */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-900/80">
            <Link className="w-4 h-4 text-green-400" />
            <h5 className="font-semibold text-green-400 text-sm">
              Intra-Node Interconnect &mdash; NVLink + NVSwitch
            </h5>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">
              All 8 GPUs within each node communicate through NVSwitch, forming
              a fully-connected mesh. Every GPU can access any other GPU&apos;s
              memory at full NVLink speed&mdash;no PCIe bottleneck. NVLink
              version, link count, and bandwidth scale with each DGX generation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Topology", value: "Full Mesh" },
                { label: "Switch Fabric", value: "NVSwitch" },
                { label: "Benefit", value: "Unified GPU Memory" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-sm font-mono font-semibold text-gray-200">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Storage + Management row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-900/80">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h5 className="font-semibold text-blue-400 text-sm">
                Storage Fabric
              </h5>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-400">
                Dedicated network for parallel file system (Lustre/GPFS) access,
                checkpoint I/O, and dataset staging. Uses BlueField DPUs for
                hardware-accelerated storage networking.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Interface", value: "BlueField DPU" },
                  { label: "Protocol", value: "Ethernet / RoCE" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-sm font-mono font-semibold text-gray-200">
                      {item.value}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-900/80">
              <Shield className="w-4 h-4 text-purple-400" />
              <h5 className="font-semibold text-purple-400 text-sm">
                Management Network
              </h5>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-400">
                Out-of-Band (OOB) network for BMC/IPMI access, cluster
                orchestration, OS provisioning, and monitoring.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Interface", value: "1 GbE" },
                  { label: "Access", value: "BMC + SSH" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-sm font-mono font-semibold text-gray-200">
                      {item.value}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
      <ArchitectureComparison />
    </div>
  </div>
);

const TroubleshootingContent: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      title="Diagnostic Playbooks"
      icon={<Activity className="w-5 h-5 text-nvidia-green" />}
    />

    <TroubleshootingCard
      title="Scenario A: XID Errors (GPU Faults)"
      severity="critical"
      symptoms="Application crash, 'GPU fallen off bus', slow training performance, NCCL timeouts."
      steps={[
        "Run `dmesg | grep -i nvrm` or `journalctl -k | grep -i xid` to check for XID messages",
        "Check `nvidia-smi -q` section 'GPU Errors' for ECC counts",
        "Run `dcgmi diag -r 1` for quick GPU diagnostics",
        "Verify if the error corresponds to a known issue (see XID Reference tab)",
        "Check thermal state with `nvidia-smi -q -d TEMPERATURE`",
      ]}
    >
      <div className="mt-4 space-y-2">
        <h4 className="font-semibold text-nvidia-green text-sm">
          Common XID Codes:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <XIDCodeBadge
            code={13}
            severity="warning"
            desc="Graphics Engine Exception (Driver/SW)"
          />
          <XIDCodeBadge
            code={31}
            severity="warning"
            desc="Memory Page Fault (Application bug)"
          />
          <XIDCodeBadge
            code={43}
            severity="critical"
            desc="GPU stopped responding (check cooling)"
          />
          <XIDCodeBadge
            code={48}
            severity="critical"
            desc="Double-bit ECC Error (HW Replace)"
          />
          <XIDCodeBadge
            code={63}
            severity="critical"
            desc="Row Remapping Failure (HW Replace)"
          />
          <XIDCodeBadge
            code={79}
            severity="critical"
            desc="GPU Fallen Off Bus (Thermal/Power)"
          />
        </div>
      </div>
    </TroubleshootingCard>

    <TroubleshootingCard
      title="Scenario B: Thermal Throttling"
      severity="warning"
      symptoms="Reduced clocks (SW Power Cap), high fan speeds, performance degradation, P-state changes."
      steps={[
        "Run `ipmitool sensor list | grep -i temp` and check 'Inlet Temp' (should be < 35°C)",
        "Check `nvidia-smi -q -d TEMPERATURE` for GPU temps (warning > 83°C)",
        "Inspect `Performance State` in `nvidia-smi` (P0=max, higher = throttled)",
        "Check `nvidia-smi -q -d CLOCK` for current vs max clocks",
        "Verify airflow and check for blocked vents or failed fans",
      ]}
    />

    <TroubleshootingCard
      title="Scenario C: NVLink Errors"
      severity="warning"
      symptoms="Reduced GPU-to-GPU bandwidth, NCCL allreduce performance degradation, training slowdowns."
      steps={[
        "Run `nvidia-smi nvlink -s` to check link status (should be 'Active')",
        "Check `nvidia-smi nvlink -e` for error counts",
        "Run `dcgmi nvlink -e` for detailed NVLink error counters",
        "Use `nvidia-smi topo -m` to verify expected topology",
        "If errors persist, may require GPU reseat or cable replacement",
      ]}
    />

    <TroubleshootingCard
      title="Scenario D: InfiniBand Connectivity"
      severity="warning"
      symptoms="Network timeouts, slow distributed training, NCCL initialization failures."
      steps={[
        "Run `ibstat` to check port state (should be 'Active')",
        "Check `ibstatus` for link width and speed",
        "Run `ibdiagnet` for fabric-wide diagnostics",
        "Check `perfquery` for error counters on ports",
        "Verify cable connections and check for physical damage",
      ]}
    />
  </div>
);

const XIDReferenceContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<XIDSeverity | "all">(
    "all",
  );

  const filteredXIDs = useMemo(() => {
    let results = searchQuery ? searchXIDs(searchQuery) : XID_ERRORS;
    if (severityFilter !== "all") {
      results = results.filter((xid) => xid.severity === severityFilter);
    }
    return results.sort((a, b) => a.code - b.code);
  }, [searchQuery, severityFilter]);

  const criticalCount = XID_ERRORS.filter(
    (x) => x.severity === "Critical",
  ).length;
  const warningCount = XID_ERRORS.filter(
    (x) => x.severity === "Warning",
  ).length;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="XID Error Code Reference"
        icon={<Zap className="w-5 h-5 text-nvidia-green" />}
      />

      {/* Introduction */}
      <Card
        title="About XID Errors"
        icon={<AlertTriangle className="w-4 h-4" />}
      >
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            XID errors are logged by the NVIDIA driver when GPU events occur.
            They appear in system logs (
            <code className="text-nvidia-green">dmesg</code>,{" "}
            <code className="text-nvidia-green">journalctl</code>) and are
            critical for troubleshooting GPU issues.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span>
                <strong>{criticalCount}</strong> Critical - Requires immediate
                action
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span>
                <strong>{warningCount}</strong> Warning - Monitor and
                investigate
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search XID codes, names, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-nvidia-green"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSeverityFilter("all")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${severityFilter === "all" ? "bg-nvidia-green text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            All
          </button>
          <button
            onClick={() => setSeverityFilter("Critical")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${severityFilter === "Critical" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Critical
          </button>
          <button
            onClick={() => setSeverityFilter("Warning")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${severityFilter === "Warning" ? "bg-yellow-600 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Warning
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-400 mb-2">
        Showing {filteredXIDs.length} of {XID_ERRORS.length} XID codes
      </div>

      {/* XID List */}
      <div className="space-y-4">
        {filteredXIDs.map((xid) => (
          <XIDErrorCard key={xid.code} xid={xid} />
        ))}
      </div>
    </div>
  );
};

const ExamGuideContent: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      title="NCP-AII Certification Study Guide"
      icon={<GraduationCap className="w-5 h-5 text-nvidia-green" />}
    />

    {/* Official Resources Section */}
    <Card
      title="Official NVIDIA Resources"
      icon={<ExternalLink className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Start your preparation with these official NVIDIA resources. These are
          the authoritative sources for exam content.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ResourceLink
            title="NCP-AII Certification Page"
            url="https://www.nvidia.com/en-us/learn/certification/"
            description="Official certification overview, registration, and exam details"
            icon={<Award className="w-4 h-4" />}
          />
          <ResourceLink
            title="NVIDIA Deep Learning Institute (DLI)"
            url="https://www.nvidia.com/en-us/training/"
            description="Official training courses and learning paths"
            icon={<GraduationCap className="w-4 h-4" />}
          />
          <ResourceLink
            title="DGX System Documentation"
            url="https://docs.nvidia.com/dgx/"
            description="Complete DGX A100/H100 user guides and admin manuals"
            icon={<BookOpen className="w-4 h-4" />}
          />
          <ResourceLink
            title="Base Command Manager Docs"
            url="https://docs.nvidia.com/base-command-manager/"
            description="BCM installation, configuration, and administration"
            icon={<Server className="w-4 h-4" />}
          />
          <ResourceLink
            title="DCGM Documentation"
            url="https://docs.nvidia.com/datacenter/dcgm/latest/"
            description="Data Center GPU Manager user guide and API reference"
            icon={<Monitor className="w-4 h-4" />}
          />
          <ResourceLink
            title="NVIDIA Driver Documentation"
            url="https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/"
            description="CUDA toolkit and driver compatibility matrices"
            icon={<Settings className="w-4 h-4" />}
          />
          <ResourceLink
            title="NVSM User Guide"
            url="https://docs.nvidia.com/datacenter/nvsm/"
            description="NVIDIA System Management Interface documentation"
            icon={<Activity className="w-4 h-4" />}
          />
          <ResourceLink
            title="XID Error Reference"
            url="https://docs.nvidia.com/deploy/xid-errors/"
            description="Official XID error codes and troubleshooting guide"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
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
          <ResourceLink
            title="NVIDIA Networking (Mellanox) Docs"
            url="https://docs.nvidia.com/networking/"
            description="InfiniBand, ConnectX, and BlueField documentation"
            icon={<Network className="w-4 h-4" />}
          />
          <ResourceLink
            title="Slurm Workload Manager"
            url="https://slurm.schedmd.com/documentation.html"
            description="Slurm configuration, GRES, and GPU scheduling"
            icon={<List className="w-4 h-4" />}
          />
          <ResourceLink
            title="NVIDIA GPU Operator"
            url="https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/"
            description="Kubernetes GPU operator deployment and config"
            icon={<Cpu className="w-4 h-4" />}
          />
          <ResourceLink
            title="NCCL Documentation"
            url="https://docs.nvidia.com/deeplearning/nccl/"
            description="Collective communications library for multi-GPU"
            icon={<Link className="w-4 h-4" />}
          />
          <ResourceLink
            title="MIG User Guide"
            url="https://docs.nvidia.com/datacenter/tesla/mig-user-guide/"
            description="Multi-Instance GPU configuration and management"
            icon={<HardDrive className="w-4 h-4" />}
          />
          <ResourceLink
            title="IPMI Guide"
            url="https://www.intel.com/content/www/us/en/search.html#q=iPMI"
            description="IPMI protocol reference for BMC management"
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
      </div>
    </Card>

    {/* Exam Overview */}
    <Card title="Exam Overview" icon={<FileText className="w-4 h-4" />}>
      <div className="space-y-4 text-sm">
        <p className="text-gray-300">
          The{" "}
          <strong className="text-nvidia-green">
            NVIDIA Certified Professional - AI Infrastructure (NCP-AII)
          </strong>{" "}
          exam validates your ability to deploy, manage, and troubleshoot NVIDIA
          DGX systems and AI infrastructure.
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
            <li>• Multiple choice and multiple response questions</li>
            <li>• Scenario-based questions testing practical knowledge</li>
            <li>• Some questions may have more than one correct answer</li>
            <li>• Read questions carefully - command syntax matters</li>
            <li>• Flag difficult questions and return to them later</li>
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

      <ExamDomainDetailed
        title="Domain 1: System Installation & Configuration"
        percentage={31}
        color="#76b900"
        objectives={[
          "Verify hardware inventory and validate physical connections",
          "Configure BMC/IPMI settings and network parameters",
          "Perform firmware updates and BIOS configuration",
          "Validate GPU topology and NVLink connectivity",
          "Configure storage and file systems",
          "Understand DGX system architecture and components",
          "Configure network interfaces (management, compute, storage)",
        ]}
        keyCommands={[
          "ipmitool",
          "nvidia-smi -L",
          "dmidecode",
          "lspci",
          "nvsm",
          "nvidia-smi topo -m",
          "ibstat",
        ]}
        studyTips={[
          "Know the DGX A100/H100 hardware specifications cold",
          "Practice BMC configuration via ipmitool sensor, sel, fru commands",
          "Understand the boot sequence and POST verification",
          "Memorize GPU memory sizes: A100 (40GB/80GB), H100 (80GB)",
        ]}
      />

      <ExamDomainDetailed
        title="Domain 2: Physical Layer Management"
        percentage={5}
        color="#3b82f6"
        objectives={[
          "Configure InfiniBand HCAs and DPUs",
          "Manage NVLink and NVSwitch fabric",
          "Configure MIG (Multi-Instance GPU) partitioning",
          "Validate network topology and bandwidth",
          "Understand ConnectX adapter configuration",
        ]}
        keyCommands={[
          "mlxconfig",
          "mst start",
          "mst status",
          "ibstat",
          "nvidia-smi mig -lgip",
          "nvidia-smi mig -cgi",
          "nvidia-smi topo -m",
        ]}
        studyTips={[
          "Memorize MIG profile IDs: 1g.5gb, 2g.10gb, 3g.20gb, 4g.20gb, 7g.40gb",
          "Understand NVLink topology matrix output symbols",
          "Know InfiniBand port states: Active, Init, Down",
          "Small domain (5%) but don't skip it - easy points!",
        ]}
      />

      <ExamDomainDetailed
        title="Domain 3: Control Plane Installation"
        percentage={19}
        color="#8b5cf6"
        objectives={[
          "Deploy Base Command Manager (BCM)",
          "Configure Slurm scheduler with GPU GRES",
          "Set up container runtime (Docker, Enroot, Pyxis)",
          "Configure high availability for management services",
          "Deploy Kubernetes with GPU operator",
          "Understand BCM architecture and components",
        ]}
        keyCommands={[
          "cmsh",
          "sinfo",
          "scontrol show node",
          "srun",
          "sbatch",
          "docker",
          "enroot",
          "kubectl",
        ]}
        studyTips={[
          "Understand Slurm GRES configuration: gres.conf and slurm.conf",
          "Know BCM HA failover procedures and health checks",
          "Practice container deployment with --gpus flag",
          "Understand the difference between Enroot and Pyxis",
        ]}
      />

      <ExamDomainDetailed
        title="Domain 4: Validation & Troubleshooting"
        percentage={33}
        color="#eab308"
        objectives={[
          "Run and interpret DCGM diagnostics (levels 1-3)",
          "Execute HPL and NCCL benchmarks",
          "Diagnose GPU health issues and XID errors",
          "Troubleshoot InfiniBand fabric problems",
          "Analyze thermal and power issues",
          "Interpret nvidia-smi output for troubleshooting",
          "Use system logs for root cause analysis",
        ]}
        keyCommands={[
          "dcgmi diag -r 1/2/3",
          "dcgmi health -c",
          "nvsm show health",
          "nvidia-smi -q",
          "nvidia-smi -q -d ECC",
          "ibdiagnet",
          "dmesg | grep -i nvrm",
        ]}
        studyTips={[
          "THIS IS THE LARGEST DOMAIN (33%) - Master it!",
          "Memorize critical XID codes: 43, 48, 63, 64, 74, 79, 92, 94, 95",
          "Know the diagnostic workflow: symptoms → logs → tools → resolution",
          "Understand DCGM diagnostic levels and what each tests",
          "Practice interpreting ECC error counts and their significance",
        ]}
      />

      <ExamDomainDetailed
        title="Domain 5: Maintenance"
        percentage={12}
        color="#f97316"
        objectives={[
          "Collect diagnostic logs and support bundles",
          "Perform driver and firmware upgrades",
          "Execute GPU and component replacement procedures",
          "Manage backup and restore operations",
          "Understand RMA procedures and when to use them",
        ]}
        keyCommands={[
          "nvsm dump health",
          "nvidia-bug-report.sh",
          "apt",
          "nvidia-installer",
          "fwupdmgr",
        ]}
        studyTips={[
          "Know the proper upgrade sequence: stop workloads → backup → upgrade driver → upgrade firmware",
          "Understand when to RMA vs troubleshoot (ECC errors, row remapping)",
          "Practice log collection with nvidia-bug-report.sh",
          "Know how to create and restore system snapshots",
        ]}
      />
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
              <span className="text-red-400 font-mono font-bold">XID 43</span> -
              GPU stopped responding (thermal/hang)
            </div>
            <div className="bg-black/50 p-2 rounded">
              <span className="text-red-400 font-mono font-bold">XID 48</span> -
              Double-bit ECC error (HW failure)
            </div>
            <div className="bg-black/50 p-2 rounded">
              <span className="text-red-400 font-mono font-bold">XID 63</span> -
              Row remapping failure (HW replace)
            </div>
            <div className="bg-black/50 p-2 rounded">
              <span className="text-red-400 font-mono font-bold">XID 64</span> -
              Row remapping threshold exceeded
            </div>
            <div className="bg-black/50 p-2 rounded">
              <span className="text-red-400 font-mono font-bold">XID 74</span> -
              NVLink error (check cables/seating)
            </div>
            <div className="bg-black/50 p-2 rounded">
              <span className="text-red-400 font-mono font-bold">XID 79</span> -
              GPU fallen off bus (power/thermal)
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

    {/* Hardware Specifications */}
    <Card
      title="DGX Hardware Specifications"
      icon={<Server className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-400">
                  Specification
                </th>
                <th className="text-left py-2 px-3 text-nvidia-green">
                  DGX A100
                </th>
                <th className="text-left py-2 px-3 text-blue-400">DGX H100</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">GPUs</td>
                <td className="py-2 px-3">8x A100 80GB</td>
                <td className="py-2 px-3">8x H100 80GB</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">GPU Memory</td>
                <td className="py-2 px-3">640 GB total</td>
                <td className="py-2 px-3">640 GB total</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">CPU</td>
                <td className="py-2 px-3">2x AMD EPYC 7742</td>
                <td className="py-2 px-3">2x Intel Xeon 8480C</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">System Memory</td>
                <td className="py-2 px-3">1 TB DDR4</td>
                <td className="py-2 px-3">2 TB DDR5</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">NVLink</td>
                <td className="py-2 px-3">NVLink 3.0 (600 GB/s)</td>
                <td className="py-2 px-3">NVLink 4.0 (900 GB/s)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">NVSwitches</td>
                <td className="py-2 px-3">6x NVSwitch</td>
                <td className="py-2 px-3">4x NVSwitch</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">Networking</td>
                <td className="py-2 px-3">8x ConnectX-6 HDR</td>
                <td className="py-2 px-3">8x ConnectX-7 NDR</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 text-gray-400">Storage</td>
                <td className="py-2 px-3">30 TB NVMe</td>
                <td className="py-2 px-3">30 TB NVMe</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Power</td>
                <td className="py-2 px-3">6.5 kW max</td>
                <td className="py-2 px-3">10.2 kW max</td>
              </tr>
            </tbody>
          </table>
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
              Focus 60%+ of study time on Domains 1 (31%) and 4 (33%). These two
              domains cover 64% of the exam.
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
              Memorize critical XID codes and their meanings. Know which require
              RMA vs troubleshooting.
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
                Review weak areas. Practice troubleshooting scenarios. Memorize
                XID codes.
              </span>
            </div>
          </div>
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
            <h5 className="text-nvidia-green font-semibold mb-2">GPU Status</h5>
            <code className="text-gray-300 block">nvidia-smi</code>
            <code className="text-gray-300 block">nvidia-smi -q</code>
            <code className="text-gray-300 block">
              nvidia-smi -q -d TEMPERATURE
            </code>
            <code className="text-gray-300 block">nvidia-smi -q -d ECC</code>
            <code className="text-gray-300 block">nvidia-smi -q -d MEMORY</code>
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
            <h5 className="text-nvidia-green font-semibold mb-2">InfiniBand</h5>
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
            <code className="text-gray-300 block">ipmitool chassis status</code>
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
                • Using <code className="text-red-300">nvidia-smi -d ECC</code>{" "}
                instead of{" "}
                <code className="text-green-300">nvidia-smi -q -d ECC</code>
              </li>
              <li>
                • Forgetting <code className="text-green-300">mst start</code>{" "}
                before using mlxconfig
              </li>
              <li>
                • Using <code className="text-red-300">dcgmi diag 1</code>{" "}
                instead of{" "}
                <code className="text-green-300">dcgmi diag -r 1</code>
              </li>
              <li>
                • Confusing <code className="text-green-300">ibstat</code>{" "}
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
                • Thinking XID 43 always requires RMA (often recoverable with
                reset)
              </li>
              <li>
                • Confusing XID 63 (row remap failure) with XID 64 (threshold
                warning)
              </li>
              <li>
                • Trying GPU reset for XID 79 (won't work - GPU is off bus)
              </li>
              <li>• Not checking row remapper status for ECC errors</li>
            </ul>
          </div>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-2">
              Troubleshooting Order
            </h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Jumping to RMA without checking thermal/power first</li>
              <li>• Not correlating SEL logs with GPU events</li>
              <li>• Forgetting to check volatile vs aggregate ECC counters</li>
              <li>
                • Missing the difference between correctable and uncorrectable
                errors
              </li>
            </ul>
          </div>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-2">
              MIG Configuration
            </h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Forgetting to enable MIG mode before creating instances</li>
              <li>• Not destroying compute instances before GPU instances</li>
              <li>• Confusing GPU instance (GI) vs compute instance (CI)</li>
              <li>• Wrong profile ID syntax (1g.10gb not 1g.10GB)</li>
            </ul>
          </div>
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
                <span className="text-green-400">&lt; 35°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GPU Temp (Normal)</span>
                <span className="text-green-400">&lt; 83°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GPU Temp (Warning)</span>
                <span className="text-yellow-400">83-90°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GPU Temp (Critical)</span>
                <span className="text-red-400">&gt; 90°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Temp (Max)</span>
                <span className="text-red-400">95°C</span>
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
                <span className="text-gray-400">Single-bit ECC (Warning)</span>
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

    {/* NVLink Topology Guide */}
    <Card
      title="NVLink Topology Matrix Guide"
      icon={<Network className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          The <code className="text-nvidia-green">nvidia-smi topo -m</code>{" "}
          command shows GPU interconnect topology. Understanding this output is
          critical for the exam.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="font-semibold text-nvidia-green mb-3">
              Matrix Symbols
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex gap-3">
                <span className="text-nvidia-green font-mono w-12">X</span>
                <span className="text-gray-300">Self (same GPU)</span>
              </div>
              <div className="flex gap-3">
                <span className="text-nvidia-green font-mono w-12">NV#</span>
                <span className="text-gray-300">
                  NVLink connection (# = link count)
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-mono w-12">SYS</span>
                <span className="text-gray-300">Connected via CPU/system</span>
              </div>
              <div className="flex gap-3">
                <span className="text-purple-400 font-mono w-12">NODE</span>
                <span className="text-gray-300">Same NUMA node</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 font-mono w-12">PIX</span>
                <span className="text-gray-300">Same PCIe switch</span>
              </div>
              <div className="flex gap-3">
                <span className="text-orange-400 font-mono w-12">PXB</span>
                <span className="text-gray-300">PCIe via bridge</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 font-mono w-12">PHB</span>
                <span className="text-gray-300">PCIe via host bridge</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="font-semibold text-nvidia-green mb-3">
              Performance Hierarchy
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-nvidia-green">Fastest</span>
                <span className="text-gray-500">→</span>
                <span className="text-red-400">Slowest</span>
              </div>
              <div className="bg-black/50 p-2 rounded text-center">
                <span className="text-nvidia-green">NV12</span>
                <span className="text-gray-500 mx-1">&gt;</span>
                <span className="text-nvidia-green">NV6</span>
                <span className="text-gray-500 mx-1">&gt;</span>
                <span className="text-purple-400">NODE</span>
                <span className="text-gray-500 mx-1">&gt;</span>
                <span className="text-yellow-400">PIX</span>
                <span className="text-gray-500 mx-1">&gt;</span>
                <span className="text-orange-400">PXB</span>
                <span className="text-gray-500 mx-1">&gt;</span>
                <span className="text-red-400">SYS</span>
              </div>
              <p className="text-gray-400 mt-2">
                DGX A100/H100: All GPUs connected via NVSwitch = NV12 (full
                mesh)
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>

    {/* Troubleshooting Decision Guide */}
    <Card
      title="Troubleshooting Decision Guide"
      icon={<Activity className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-nvidia-green mb-3">
            GPU Issue Decision Tree
          </h4>
          <div className="text-xs space-y-3">
            <div className="border-l-2 border-nvidia-green pl-4">
              <div className="font-semibold text-white mb-1">
                1. GPU Unresponsive / XID Error?
              </div>
              <div className="ml-4 space-y-1 text-gray-300">
                <div>
                  → Check{" "}
                  <code className="text-nvidia-green">dmesg | grep -i xid</code>{" "}
                  for error code
                </div>
                <div>
                  → XID 79?{" "}
                  <span className="text-red-400">
                    Reboot required (GPU off bus)
                  </span>
                </div>
                <div>
                  → XID 43?{" "}
                  <span className="text-yellow-400">
                    Try nvidia-smi --gpu-reset first
                  </span>
                </div>
                <div>
                  → XID 48/63?{" "}
                  <span className="text-red-400">
                    Check ECC, likely RMA needed
                  </span>
                </div>
              </div>
            </div>
            <div className="border-l-2 border-blue-400 pl-4">
              <div className="font-semibold text-white mb-1">
                2. Performance Degradation?
              </div>
              <div className="ml-4 space-y-1 text-gray-300">
                <div>
                  → Check temperature:{" "}
                  <code className="text-nvidia-green">
                    nvidia-smi -q -d TEMPERATURE
                  </code>
                </div>
                <div>
                  → Check clocks:{" "}
                  <code className="text-nvidia-green">
                    nvidia-smi -q -d CLOCK
                  </code>
                </div>
                <div>→ High temp? Check cooling, inlet temp, fans</div>
                <div>→ Low clocks? Check power limit, thermal throttle</div>
              </div>
            </div>
            <div className="border-l-2 border-purple-400 pl-4">
              <div className="font-semibold text-white mb-1">
                3. ECC Errors Detected?
              </div>
              <div className="ml-4 space-y-1 text-gray-300">
                <div>
                  → Check{" "}
                  <code className="text-nvidia-green">
                    nvidia-smi -q -d ECC
                  </code>
                </div>
                <div>
                  → Single-bit only?{" "}
                  <span className="text-yellow-400">Monitor, may be OK</span>
                </div>
                <div>
                  → Double-bit?{" "}
                  <span className="text-red-400">
                    Check row remapper status
                  </span>
                </div>
                <div>
                  → Row remap failure?{" "}
                  <span className="text-red-400">RMA required</span>
                </div>
              </div>
            </div>
            <div className="border-l-2 border-orange-400 pl-4">
              <div className="font-semibold text-white mb-1">
                4. NVLink/Fabric Issues?
              </div>
              <div className="ml-4 space-y-1 text-gray-300">
                <div>
                  → Check{" "}
                  <code className="text-nvidia-green">
                    nvidia-smi nvlink -s
                  </code>{" "}
                  for status
                </div>
                <div>
                  → Check{" "}
                  <code className="text-nvidia-green">
                    nvidia-smi nvlink -e
                  </code>{" "}
                  for errors
                </div>
                <div>→ Link down? Check cable, reseat GPU</div>
                <div>→ Errors increasing? May need hardware replacement</div>
              </div>
            </div>
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
              <span className="text-gray-400">- Streaming Multiprocessor</span>
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
              <span className="text-gray-400">- NVIDIA System Management</span>
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
              <span className="text-gray-400">- Generic Resource (Slurm)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
);

// Resource Link Component
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

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  dataTour?: string;
}> = ({ active, onClick, icon, label, dataTour }) => (
  <button
    onClick={onClick}
    {...(dataTour ? { "data-tour": dataTour } : {})}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
      active
        ? "border-nvidia-green text-nvidia-green bg-gray-800"
        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// ============================================================================
// GLOSSARY
// ============================================================================

const GLOSSARY_SECTIONS = [
  {
    title: "GPU & Compute",
    terms: [
      {
        term: "GPU",
        definition:
          "Graphics Processing Unit — the parallel processor used for AI/ML training and inference.",
      },
      {
        term: "DGX",
        definition:
          'NVIDIA\'s integrated GPU server platform (originally "Deep Learning GPU eXperience") designed for AI workloads.',
      },
      {
        term: "CUDA",
        definition:
          "Compute Unified Device Architecture — NVIDIA's parallel computing platform and programming model.",
      },
      {
        term: "cuDNN",
        definition:
          "CUDA Deep Neural Network library — GPU-accelerated primitives for deep learning frameworks.",
      },
      {
        term: "ECC",
        definition:
          "Error Correcting Code — memory protection that detects and corrects single-bit errors.",
      },
      {
        term: "DBE",
        definition:
          "Double Bit Error — an uncorrectable ECC error (XID 48) that typically requires GPU replacement (RMA).",
      },
      {
        term: "HBM",
        definition:
          "High Bandwidth Memory — stacked DRAM used as GPU memory (HBM2e on A100, HBM3 on H100, HBM3e on H200/B200).",
      },
      {
        term: "SRAM",
        definition:
          "Static Random-Access Memory — fast on-chip GPU cache and register memory; uncorrectable SRAM errors are critical.",
      },
      {
        term: "DRAM",
        definition:
          "Dynamic Random-Access Memory — the main GPU memory (HBM); correctable DRAM ECC errors are typically normal.",
      },
      {
        term: "SXM",
        definition:
          "Server PCI Express Module — NVIDIA's mezzanine GPU form factor used in DGX systems, enabling higher TDP and NVLink.",
      },
      {
        term: "MIG",
        definition:
          "Multi-Instance GPU — partitions a single GPU into isolated instances for multi-tenant workloads.",
      },
      {
        term: "MPS",
        definition:
          "Multi-Process Service — allows multiple CUDA processes to share a single GPU concurrently.",
      },
      {
        term: "NVLink",
        definition:
          "High-bandwidth GPU-to-GPU interconnect, enabling fast data transfer between GPUs within a node.",
      },
      {
        term: "NVSwitch",
        definition:
          "Chip enabling all-to-all NVLink connectivity between GPUs in a DGX system.",
      },
      {
        term: "NVML",
        definition:
          "NVIDIA Management Library — C API for monitoring and managing NVIDIA GPUs (used by nvidia-smi).",
      },
      {
        term: "NVSM",
        definition:
          "NVIDIA System Management — fleet management tool for monitoring health across multiple DGX nodes.",
      },
      {
        term: "DCGM",
        definition:
          "Data Center GPU Manager — NVIDIA's suite for GPU health monitoring, diagnostics, and policy management.",
      },
      {
        term: "XID",
        definition:
          "NVIDIA GPU error code reported in kernel logs, identifying specific hardware or software faults.",
      },
      {
        term: "GSP",
        definition:
          "GPU System Processor — on-GPU microcontroller running firmware for management tasks; GSP errors (XID 119/120) are critical.",
      },
      {
        term: "VBIOS",
        definition:
          "Video BIOS — firmware on the GPU that initializes hardware before the OS driver loads.",
      },
      {
        term: "SM",
        definition:
          "Streaming Multiprocessor — the core compute unit inside an NVIDIA GPU.",
      },
      {
        term: "TDP",
        definition:
          "Thermal Design Power — maximum heat a component is designed to dissipate under load.",
      },
      {
        term: "FP16 / FP32 / FP64",
        definition:
          "Floating-point precision modes (16/32/64-bit) — lower precision enables higher throughput for AI training.",
      },
      {
        term: "TFLOPS",
        definition:
          "Tera Floating-Point Operations Per Second — measure of GPU compute throughput.",
      },
      {
        term: "CRC",
        definition:
          "Cyclic Redundancy Check — error-detection code on NVLink and IB links; rising CRC counts indicate link degradation.",
      },
    ],
  },
  {
    title: "Networking & InfiniBand",
    terms: [
      {
        term: "IB",
        definition:
          "InfiniBand — high-bandwidth, low-latency network fabric used in HPC and AI clusters.",
      },
      {
        term: "HCA",
        definition:
          "Host Channel Adapter — the InfiniBand network interface card installed in each node.",
      },
      {
        term: "RDMA",
        definition:
          "Remote Direct Memory Access — allows direct memory-to-memory transfers between nodes, bypassing the CPU.",
      },
      {
        term: "RoCE",
        definition:
          "RDMA over Converged Ethernet — protocol enabling RDMA on standard Ethernet networks instead of native InfiniBand.",
      },
      {
        term: "SHARP",
        definition:
          "Scalable Hierarchical Aggregation and Reduction Protocol — in-network compute that offloads collectives to IB switches.",
      },
      {
        term: "GDS",
        definition:
          "GPU-Direct Storage — enables direct data paths between storage and GPU memory, bypassing the CPU bounce buffer.",
      },
      {
        term: "GUID",
        definition:
          "Globally Unique Identifier — a unique address assigned to each InfiniBand port and node.",
      },
      {
        term: "LID",
        definition:
          "Local Identifier — a 16-bit address assigned by the Subnet Manager to each IB port.",
      },
      {
        term: "SM (IB)",
        definition:
          "Subnet Manager — manages the InfiniBand fabric, computes routing tables, and assigns LIDs.",
      },
      {
        term: "OFED",
        definition:
          "OpenFabrics Enterprise Distribution — the software stack for InfiniBand and RDMA networking.",
      },
      {
        term: "QoS",
        definition:
          "Quality of Service — traffic prioritization policies on the InfiniBand fabric.",
      },
      {
        term: "GID",
        definition:
          "Global Identifier — a 128-bit IB address used for routing across subnets.",
      },
      {
        term: "NDR",
        definition:
          "Next Data Rate — InfiniBand speed tier at 400 Gb/s per port.",
      },
      {
        term: "HDR",
        definition:
          "High Data Rate — InfiniBand speed tier at 200 Gb/s per port.",
      },
      {
        term: "NFS",
        definition:
          "Network File System — shared storage protocol; often contrasted with parallel filesystems (Lustre/GPFS) in HPC.",
      },
    ],
  },
  {
    title: "Hardware & System Management",
    terms: [
      {
        term: "BMC",
        definition:
          "Baseboard Management Controller — embedded processor for out-of-band server management (power, sensors, console).",
      },
      {
        term: "IPMI",
        definition:
          "Intelligent Platform Management Interface — standard protocol for communicating with the BMC.",
      },
      {
        term: "SOL",
        definition:
          "Serial-over-LAN — remote serial console access via IPMI, allowing out-of-band troubleshooting when SSH is unavailable.",
      },
      {
        term: "SEL",
        definition:
          "System Event Log — BMC log recording hardware events like temperature warnings and power faults.",
      },
      {
        term: "FRU",
        definition:
          "Field Replaceable Unit — a hardware component (fan, PSU, DIMM) that can be swapped in the field.",
      },
      {
        term: "SDR",
        definition:
          "Sensor Data Records — BMC database describing available sensors and their thresholds.",
      },
      {
        term: "RMA",
        definition:
          "Return Merchandise Authorization — the process for returning defective hardware to the vendor for replacement.",
      },
      {
        term: "DIMM",
        definition:
          "Dual Inline Memory Module — physical system memory module; checked via dmidecode during bring-up.",
      },
      {
        term: "PSU",
        definition:
          "Power Supply Unit — node power supply; PSU failures trigger BMC alerts and require FRU replacement.",
      },
      {
        term: "VRM",
        definition:
          "Voltage Regulator Module — converts input voltage for CPU/GPU; overheating VRMs cause throttling.",
      },
      {
        term: "SMBIOS",
        definition:
          "System Management BIOS — firmware tables describing hardware inventory; read by dmidecode.",
      },
      {
        term: "DMI",
        definition:
          "Desktop Management Interface — the specification for system hardware tables that dmidecode reads.",
      },
      {
        term: "DPU",
        definition:
          "Data Processing Unit — a SmartNIC (e.g., BlueField) that offloads networking and storage tasks.",
      },
      {
        term: "NVMe",
        definition:
          "Non-Volatile Memory Express — high-speed storage protocol for SSD drives over PCIe.",
      },
      {
        term: "PCIe",
        definition:
          "PCI Express — the high-speed serial bus connecting GPUs, NICs, and NVMe drives to the CPU.",
      },
      {
        term: "NUMA",
        definition:
          "Non-Uniform Memory Access — memory architecture where access time depends on CPU-memory locality; affects GPU/HCA affinity.",
      },
      {
        term: "UEFI",
        definition:
          "Unified Extensible Firmware Interface — modern BIOS replacement managing boot configuration and Secure Boot.",
      },
      {
        term: "POST",
        definition:
          "Power-On Self-Test — hardware initialization sequence run by firmware before the OS loads.",
      },
      {
        term: "BOM",
        definition:
          "Bill of Materials — list of expected hardware components; verified against dmidecode output during bring-up.",
      },
      {
        term: "OOM",
        definition:
          "Out of Memory — condition where a process exhausts available memory, causing the kernel or GPU driver to kill it.",
      },
      {
        term: "BAR",
        definition:
          "Base Address Register — PCIe memory region; 'Above 4G Decoding' BIOS setting is required for large GPU BARs.",
      },
      {
        term: "SR-IOV",
        definition:
          "Single Root I/O Virtualization — PCIe feature allowing a device to appear as multiple virtual devices for VMs.",
      },
    ],
  },
  {
    title: "Cluster & Workload Management",
    terms: [
      {
        term: "HPC",
        definition:
          "High-Performance Computing — the domain of large-scale parallel computing on GPU clusters.",
      },
      {
        term: "Slurm",
        definition:
          "Simple Linux Utility for Resource Management — the job scheduler used on most HPC and AI clusters.",
      },
      {
        term: "GRES",
        definition:
          "Generic Resource — Slurm's mechanism for tracking GPUs and other special resources.",
      },
      {
        term: "MPI",
        definition:
          "Message Passing Interface — standard for distributed parallel computing across cluster nodes.",
      },
      {
        term: "NCCL",
        definition:
          "NVIDIA Collective Communications Library — optimized GPU-to-GPU communication primitives for distributed training.",
      },
      {
        term: "UCX",
        definition:
          "Unified Communication X — a communication framework used by MPI and NCCL for transport selection.",
      },
      {
        term: "BCM",
        definition:
          "Base Command Manager — NVIDIA's cluster provisioning and management software for DGX SuperPOD deployments.",
      },
      {
        term: "NGC",
        definition:
          "NVIDIA GPU Cloud — container registry hosting optimized AI frameworks, models, and tools.",
      },
      {
        term: "SPANK",
        definition:
          "Slurm Plug-in Architecture for Node and job Kontrol — plugin system used by Pyxis for container integration.",
      },
      {
        term: "HPL",
        definition:
          "High-Performance Linpack — the standard benchmark for validating cluster compute performance and stability.",
      },
    ],
  },
  {
    title: "Firmware & Tools",
    terms: [
      {
        term: "MFT",
        definition:
          "Mellanox Firmware Tools — utilities for querying, updating, and managing Mellanox/NVIDIA NIC firmware.",
      },
      {
        term: "MST",
        definition:
          "Mellanox Software Tools — kernel driver and service required by MFT for device access.",
      },
      {
        term: "PSID",
        definition:
          "Parameter Set Identifier — identifies the firmware configuration profile on a Mellanox NIC.",
      },
      {
        term: "BER",
        definition:
          "Bit Error Rate — the ratio of errored bits to total transmitted bits on a network link.",
      },
      {
        term: "FEC",
        definition:
          "Forward Error Correction — encoding that allows the receiver to detect and correct transmission errors.",
      },
      {
        term: "PXE",
        definition:
          "Preboot Execution Environment — network boot protocol for OS provisioning over the management network.",
      },
    ],
  },
] as const;

const GlossaryContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return GLOSSARY_SECTIONS;
    const query = searchQuery.toLowerCase();
    return GLOSSARY_SECTIONS.map((section) => ({
      ...section,
      terms: section.terms.filter(
        (t) =>
          t.term.toLowerCase().includes(query) ||
          t.definition.toLowerCase().includes(query),
      ),
    })).filter((section) => section.terms.length > 0);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionTitle
          title="Glossary & Acronyms"
          icon={<BookOpen className="w-5 h-5 text-nvidia-green" />}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-nvidia-green w-64"
          />
        </div>
      </div>

      {filteredSections.map((section) => (
        <div
          key={section.title}
          className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-700">
            <h4 className="font-bold text-nvidia-green text-base">
              {section.title}
            </h4>
          </div>
          <div className="divide-y divide-gray-700/50">
            {section.terms.map((t) => (
              <div key={t.term} className="flex items-start gap-4 px-4 py-3">
                <code className="text-nvidia-green font-mono font-semibold text-sm shrink-0 w-24">
                  {t.term}
                </code>
                <span className="text-gray-300 text-sm">{t.definition}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredSections.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No terms match &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const SectionTitle: React.FC<{ title: string; icon: React.ReactNode }> = ({
  title,
  icon,
}) => (
  <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
    {icon}
    <h3 className="text-xl font-bold text-white">{title}</h3>
  </div>
);

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

const TroubleshootingCard: React.FC<{
  title: string;
  severity: "critical" | "warning";
  symptoms: string;
  steps: string[];
  children?: React.ReactNode;
}> = ({ title, severity, symptoms, steps, children }) => {
  const severityColors = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      icon: "text-red-400",
      text: "text-red-400",
    },
    warning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      icon: "text-yellow-400",
      text: "text-yellow-400",
    },
  };
  const colors = severityColors[severity];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className={`px-5 py-4 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
          <h4 className={`font-bold ${colors.text}`}>{title}</h4>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Symptoms
          </h5>
          <p className="text-sm text-gray-300">{symptoms}</p>
        </div>
        <div>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Diagnostic Steps
          </h5>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="text-nvidia-green font-bold">{i + 1}.</span>
                <span className="flex-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {children}
      </div>
    </div>
  );
};

const XIDCodeBadge: React.FC<{
  code: number;
  severity: "critical" | "warning";
  desc: string;
}> = ({ code, severity, desc }) => {
  const color = severity === "critical" ? "text-red-400" : "text-yellow-400";
  return (
    <div className="bg-black p-2 rounded border border-gray-800 flex items-start gap-2">
      <span className={`${color} font-bold font-mono`}>{code}</span>
      <span className="text-gray-400">{desc}</span>
    </div>
  );
};

const XIDErrorCard: React.FC<{ xid: XIDError }> = ({ xid }) => {
  const colors = SEVERITY_COLORS[xid.severity];
  const [expanded, setExpanded] = useState(false);

  const CategoryIcon =
    {
      Hardware: Cpu,
      Driver: Settings,
      Application: Code,
      Power: Zap,
      Memory: HardDrive,
      NVLink: Link,
      Thermal: Thermometer,
    }[xid.category] || AlertTriangle;

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${colors.border}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-gray-700/50 transition-colors`}
      >
        <div
          className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}
        >
          <span className={`text-lg font-bold font-mono ${colors.text}`}>
            {xid.code}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white truncate">{xid.name}</h4>
            {xid.examRelevance === "High" && (
              <span className="text-xs bg-nvidia-green/20 text-nvidia-green px-2 py-0.5 rounded">
                Exam
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{xid.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded ${colors.bg} ${colors.text}`}
          >
            {xid.severity}
          </span>
          <CategoryIcon className="w-4 h-4 text-gray-500" />
          <ChevronRight
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Root Cause
            </h5>
            <p className="text-sm text-gray-300">{xid.cause}</p>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Recommended Actions
            </h5>
            <ol className="space-y-1">
              {xid.action.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-nvidia-green">{i + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
          {xid.relatedCommands && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Related Commands
              </h5>
              <div className="flex flex-wrap gap-2">
                {xid.relatedCommands.map((cmd) => (
                  <code
                    key={cmd}
                    className="text-xs bg-black px-2 py-1 rounded border border-gray-700 text-gray-300"
                  >
                    {cmd}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ExamDomainDetailed: React.FC<{
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
                  <span className="text-nvidia-green">•</span>
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
