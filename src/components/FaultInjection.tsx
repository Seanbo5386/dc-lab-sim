import React, { useState, useMemo, useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { scenarioContextManager } from "@/store/scenarioContext";
import type { StateMutator } from "@/simulators/BaseSimulator";
import { MetricsSimulator } from "@/utils/metricsSimulator";
import { useFaultToastStore } from "@/store/faultToastStore";
import {
  BASIC_FAULT_DESCRIPTIONS,
  COMPLEX_SCENARIO_DESCRIPTIONS,
  WORKLOAD_DESCRIPTIONS,
} from "@/data/faultDescriptions";
import {
  AlertTriangle,
  Zap,
  Thermometer,
  Link2,
  Cpu,
  RotateCcw,
  Ban,
  Radio,
  Flame,
  AlertOctagon,
  Info,
  ChevronUp,
  X,
  Lightbulb,
  TerminalSquare,
  Sparkles,
  Send,
} from "lucide-react";
import { useLearningProgressStore } from "@/store/learningProgressStore";

const metricsSimulator = new MetricsSimulator();

type BasicFaultType = "xid" | "ecc" | "thermal" | "nvlink" | "power" | "pcie";

const SURPRISE_TYPES = [
  "xid",
  "ecc",
  "thermal",
  "nvlink",
  "power",
  "pcie",
] as const;

/**
 * Get a mutator that routes to ScenarioContext when active, otherwise to global store.
 */
function getMutator(): StateMutator {
  const activeContext = scenarioContextManager.getActiveContext();
  if (activeContext) {
    return {
      updateGPU: (nodeId, gpuId, updates) =>
        activeContext.updateGPU(nodeId, gpuId, updates),
      addXIDError: (nodeId, gpuId, error) =>
        activeContext.addXIDError(nodeId, gpuId, error),
      updateNodeHealth: (nodeId, health) =>
        activeContext.updateNodeHealth(nodeId, health),
      setMIGMode: (nodeId, gpuId, enabled) =>
        activeContext.setMIGMode(nodeId, gpuId, enabled),
      setSlurmState: (nodeId, state, reason) =>
        activeContext.setSlurmState(nodeId, state, reason),
      allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
        activeContext.allocateGPUsForJob(
          nodeId,
          gpuIds,
          jobId,
          targetUtilization,
        ),
      deallocateGPUsForJob: (jobId) =>
        activeContext.deallocateGPUsForJob(jobId),
    };
  }
  const store = useSimulationStore.getState();
  return {
    updateGPU: (nodeId, gpuId, updates) =>
      store.updateGPU(nodeId, gpuId, updates),
    addXIDError: (nodeId, gpuId, error) =>
      store.addXIDError(nodeId, gpuId, error),
    updateNodeHealth: (nodeId, health) =>
      store.updateNodeHealth(nodeId, health),
    setMIGMode: (nodeId, gpuId, enabled) =>
      store.setMIGMode(nodeId, gpuId, enabled),
    setSlurmState: (nodeId, state, reason) =>
      store.setSlurmState(nodeId, state, reason),
    allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
      store.allocateGPUsForJob(nodeId, gpuIds, jobId, targetUtilization),
    deallocateGPUsForJob: (jobId) => store.deallocateGPUsForJob(jobId),
  };
}

interface FaultInjectionProps {
  onPasteCommand?: (cmd: string, targetNode?: string) => void;
  onSwitchToTerminal?: () => void;
}

export const FaultInjection: React.FC<FaultInjectionProps> = ({
  onPasteCommand,
  onSwitchToTerminal,
}) => {
  const cluster = useSimulationStore((state) => state.cluster);

  // Read from active context's cluster when available, otherwise global
  const effectiveCluster = useMemo(() => {
    const activeContext = scenarioContextManager.getActiveContext();
    return activeContext ? activeContext.getCluster() : cluster;
  }, [cluster]);

  const [selectedNode, setSelectedNode] = useState<string>(
    () => effectiveCluster.nodes[0]?.id ?? "",
  );

  // If the selected node disappears (e.g. cluster rebuilt on a system-type
  // switch), fall back to the first available node.
  useEffect(() => {
    const exists = effectiveCluster.nodes.some((n) => n.id === selectedNode);
    if (!exists && effectiveCluster.nodes.length > 0) {
      setSelectedNode(effectiveCluster.nodes[0].id);
    }
  }, [effectiveCluster, selectedNode]);

  const [selectedGPU, setSelectedGPU] = useState(0);

  // Reset GPU selection when node changes
  useEffect(() => {
    setSelectedGPU(0);
  }, [selectedNode]);

  // Derive current GPU health for active-fault indicators
  const currentGPU = useMemo(() => {
    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    return node?.gpus[selectedGPU] || null;
  }, [effectiveCluster, selectedNode, selectedGPU]);

  const sandboxIntroSeen = useLearningProgressStore((s) => s.sandboxIntroSeen);
  const markSandboxIntroSeen = useLearningProgressStore(
    (s) => s.markSandboxIntroSeen,
  );
  const [introDismissed, setIntroDismissed] = useState(false);
  const showIntro = !sandboxIntroSeen && !introDismissed;

  const handleDismissIntro = () => {
    setIntroDismissed(true);
    markSandboxIntroSeen();
  };

  const [workloadPattern, setWorkloadPattern] = useState<
    "idle" | "training" | "inference" | "stress"
  >("idle");

  const [lastInjectedCommand, setLastInjectedCommand] = useState<string | null>(
    null,
  );

  // Basic faults are staged via toggle buttons, then applied together on Submit.
  const [selectedFaults, setSelectedFaults] = useState<Set<BasicFaultType>>(
    () => new Set(),
  );

  const toggleFault = (faultType: BasicFaultType) => {
    setSelectedFaults((prev) => {
      const next = new Set(prev);
      if (next.has(faultType)) {
        next.delete(faultType);
      } else {
        next.add(faultType);
      }
      return next;
    });
  };

  const runInTerminal = (cmd: string) => {
    onSwitchToTerminal?.();
    // Pass the Sandbox's selected node so the terminal connects to the
    // affected node before running the diagnostic command.
    onPasteCommand?.(cmd, selectedNode);
  };

  // Collapsible info panel state
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showComplexInfo, setShowComplexInfo] = useState(false);
  const [showWorkloadInfo, setShowWorkloadInfo] = useState(false);

  // Surprise me challenge mode
  const [surpriseFault, setSurpriseFault] = useState<
    (typeof SURPRISE_TYPES)[number] | null
  >(null);
  const [surpriseRevealed, setSurpriseRevealed] = useState(false);

  const handleInjectFault = (
    faultType: BasicFaultType,
    options?: { surprise?: boolean },
  ) => {
    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    if (!node) return;

    const gpu = node.gpus[selectedGPU];
    if (!gpu) return;

    const faultedGPU = metricsSimulator.injectFault(gpu, faultType);
    getMutator().updateGPU(selectedNode, selectedGPU, faultedGPU);

    // Fire toast notification
    const desc = BASIC_FAULT_DESCRIPTIONS.find((d) => d.type === faultType);
    if (options?.surprise) {
      useFaultToastStore.getState().addToast({
        title: "Something's wrong with this node",
        message: "A fault has been injected. Diagnose it in the Terminal.",
        suggestedCommand: desc?.suggestedCommands[0] ?? "nvidia-smi",
        severity: "warning",
        targetNode: selectedNode,
      });
    } else if (desc) {
      useFaultToastStore.getState().addToast({
        title: `${desc.title} Injected`,
        message: desc.whatHappens,
        suggestedCommand: desc.suggestedCommands[0],
        severity:
          faultType === "thermal" ||
          faultType === "nvlink" ||
          faultType === "power"
            ? "warning"
            : "critical",
        xidCode: desc.relatedXIDCodes?.[0] || undefined,
        targetNode: selectedNode,
      });
    }
    setLastInjectedCommand(desc?.suggestedCommands[0] ?? "nvidia-smi");
  };

  const handleSurpriseMe = () => {
    const type =
      SURPRISE_TYPES[Math.floor(Math.random() * SURPRISE_TYPES.length)];
    setSurpriseFault(type);
    setSurpriseRevealed(false);
    handleInjectFault(type, { surprise: true });
  };

  const handleSubmitFaults = () => {
    const types = Array.from(selectedFaults);
    if (types.length === 0) return;

    // A single selected fault reuses the descriptive single-fault path
    // (per-fault toast + suggested command).
    if (types.length === 1) {
      handleInjectFault(types[0]);
      setSelectedFaults(new Set());
      return;
    }

    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    if (!node) return;
    const gpu = node.gpus[selectedGPU];
    if (!gpu) return;

    // Chain each selected fault so they accumulate on the same GPU.
    let faulted = gpu;
    for (const type of types) {
      faulted = metricsSimulator.injectFault(faulted, type);
    }
    getMutator().updateGPU(selectedNode, selectedGPU, faulted);

    const labels = types.map(
      (t) => BASIC_FAULT_DESCRIPTIONS.find((d) => d.type === t)?.title ?? t,
    );
    useFaultToastStore.getState().addToast({
      title: `${types.length} Faults Injected`,
      message: `Injected ${labels.join(", ")} on GPU ${selectedGPU}. Diagnose in the Terminal.`,
      suggestedCommand: "nvidia-smi",
      severity: "critical",
      targetNode: selectedNode,
    });
    setLastInjectedCommand("nvidia-smi");
    setSelectedFaults(new Set());
  };

  const handleInjectScenario = (
    scenarioType: "gpu-hang" | "bus-reset" | "thermal-alert" | "severe-ecc",
  ) => {
    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    if (!node) return;

    const mutator = getMutator();

    switch (scenarioType) {
      case "gpu-hang": {
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          mutator.addXIDError(selectedNode, selectedGPU, {
            code: 43,
            timestamp: new Date(),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          });
          mutator.updateGPU(selectedNode, selectedGPU, {
            utilization: 0,
            healthStatus: "Critical",
          });
        }
        break;
      }
      case "bus-reset": {
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          mutator.addXIDError(selectedNode, selectedGPU, {
            code: 79,
            timestamp: new Date(),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          });
          mutator.updateGPU(selectedNode, selectedGPU, {
            healthStatus: "Critical",
          });
        }
        break;
      }
      case "thermal-alert": {
        node.gpus.forEach((gpu) => {
          mutator.updateGPU(selectedNode, gpu.id, {
            temperature: 90 + Math.random() * 10,
            healthStatus: "Warning",
          });
        });
        break;
      }
      case "severe-ecc": {
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          mutator.updateGPU(selectedNode, selectedGPU, {
            eccErrors: {
              singleBit: 1500,
              doubleBit: 50,
              aggregated: {
                singleBit: 1500,
                doubleBit: 50,
              },
            },
            healthStatus: "Critical",
          });
          mutator.addXIDError(selectedNode, selectedGPU, {
            code: 63,
            timestamp: new Date(),
            description:
              "Uncorrectable ECC error detected - GPU replacement required",
            severity: "Critical",
          });
        }
        break;
      }
    }

    // Fire toast notification for complex scenarios
    const desc = COMPLEX_SCENARIO_DESCRIPTIONS.find(
      (d) => d.type === scenarioType,
    );
    if (desc) {
      useFaultToastStore.getState().addToast({
        title: `${desc.title} Activated`,
        message: desc.whatHappens,
        suggestedCommand: desc.suggestedCommands[0],
        severity: scenarioType === "thermal-alert" ? "warning" : "critical",
        xidCode: desc.relatedXIDCodes?.[0] || undefined,
        targetNode: selectedNode,
      });
    }
    setLastInjectedCommand(desc?.suggestedCommands[0] ?? "nvidia-smi");
  };

  const handleSimulateWorkload = () => {
    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    if (!node) return;

    const updatedGPUs = metricsSimulator.simulateWorkload(
      node.gpus,
      workloadPattern,
    );
    const mutator = getMutator();
    updatedGPUs.forEach((gpu) => {
      mutator.updateGPU(selectedNode, gpu.id, gpu);
    });

    // Fire toast notification for workload
    const desc = WORKLOAD_DESCRIPTIONS.find(
      (w) => w.pattern === workloadPattern,
    );
    if (desc) {
      useFaultToastStore.getState().addToast({
        title: `${desc.title} Applied`,
        message: desc.description,
        suggestedCommand: "nvidia-smi",
        severity: "info",
        targetNode: selectedNode,
      });
    }
    setLastInjectedCommand("nvidia-smi");
  };

  const handleClearFaults = () => {
    const node = effectiveCluster.nodes.find((n) => n.id === selectedNode);
    if (!node) return;

    const mutator = getMutator();
    node.gpus.forEach((gpu) => {
      mutator.updateGPU(selectedNode, gpu.id, {
        xidErrors: [],
        healthStatus: "OK",
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: { singleBit: 0, doubleBit: 0 },
        },
        nvlinks: gpu.nvlinks.map((link) => ({
          ...link,
          status: "Active",
          txErrors: 0,
          rxErrors: 0,
        })),
        temperature: 65,
        powerDraw: gpu.powerLimit * 0.3,
        utilization: 5,
      });
    });

    useFaultToastStore.getState().addToast({
      title: "All Faults Cleared",
      message: "All GPUs on this node reset to healthy state.",
      suggestedCommand: "nvidia-smi",
      severity: "info",
      targetNode: selectedNode,
    });
    setLastInjectedCommand(null);
  };

  const selectedWorkloadDesc = WORKLOAD_DESCRIPTIONS.find(
    (w) => w.pattern === workloadPattern,
  );

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-nvidia-green">Sandbox</h2>
          <p data-testid="sandbox-subtitle" className="text-xs text-gray-500">
            Free experimentation — inject faults and diagnose them. No scoring.
          </p>
        </div>

        {showIntro && (
          <div
            data-testid="sandbox-intro"
            className="mb-4 p-4 bg-nvidia-green/5 border border-nvidia-green/30 rounded-lg relative"
          >
            <button
              onClick={handleDismissIntro}
              data-testid="sandbox-intro-dismiss"
              aria-label="Dismiss Sandbox intro"
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-nvidia-green" />
              <span className="font-semibold text-sm text-nvidia-green">
                Welcome to the Sandbox
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Free experimentation, no scoring. Pick a node and GPU, inject a
              fault, then switch to the{" "}
              <span className="text-nvidia-green">Terminal</span> tab and
              diagnose it with real commands like{" "}
              <code className="text-nvidia-green font-mono">nvidia-smi</code>.
              Use <span className="text-nvidia-green">Quick Reference</span>{" "}
              below for command ideas.
            </p>
          </div>
        )}

        {/* Target Node + GPU Selection */}
        <div className="flex items-center gap-4 mb-6 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <label
              className="text-gray-400 shrink-0"
              htmlFor="sandbox-node-select"
            >
              Node:
            </label>
            <select
              id="sandbox-node-select"
              aria-label="Sandbox target node"
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-nvidia-green font-mono focus:outline-none focus:border-nvidia-green"
            >
              {effectiveCluster.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.hostname || n.id}
                </option>
              ))}
            </select>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2 flex-1">
            <label
              className="text-sm text-gray-400 whitespace-nowrap"
              htmlFor="sandbox-gpu-select"
            >
              GPU:
            </label>
            <select
              id="sandbox-gpu-select"
              aria-label="Sandbox target GPU"
              value={selectedGPU}
              onChange={(e) => setSelectedGPU(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-nvidia-green"
            >
              {effectiveCluster.nodes
                .find((n) => n.id === selectedNode)
                ?.gpus.map((gpu) => (
                  <option key={gpu.id} value={gpu.id}>
                    GPU {gpu.id}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* GPU Status Indicator */}
        {currentGPU && currentGPU.healthStatus !== "OK" && (
          <div
            className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-medium ${
              currentGPU.healthStatus === "Critical"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              GPU {selectedGPU} status: {currentGPU.healthStatus}
              {currentGPU.xidErrors && currentGPU.xidErrors.length > 0 && (
                <span> — {currentGPU.xidErrors.length} XID error(s)</span>
              )}
            </span>
          </div>
        )}

        {/* Post-inject Diagnose CTA */}
        {lastInjectedCommand && (
          <button
            type="button"
            data-testid="diagnose-cta"
            onClick={() => runInTerminal(lastInjectedCommand)}
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-medium bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30 hover:bg-nvidia-green/20 transition-colors"
          >
            <TerminalSquare className="w-3.5 h-3.5 shrink-0" />
            Diagnose in Terminal — run{" "}
            <code className="font-mono">{lastInjectedCommand}</code>
          </button>
        )}

        {/* Fault Injection Buttons */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">
              Basic Fault Injection
            </h3>
            <button
              onClick={() => setShowBasicInfo(!showBasicInfo)}
              className="text-gray-400 hover:text-nvidia-green p-1 rounded transition-colors"
              aria-label="Toggle fault descriptions"
              aria-expanded={showBasicInfo}
            >
              {showBasicInfo ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Collapsible Basic Fault Info Panel */}
          {showBasicInfo && (
            <div className="mt-1 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
              {BASIC_FAULT_DESCRIPTIONS.map((fault) => (
                <div
                  key={fault.type}
                  className="pb-2 border-b border-gray-700/50 last:border-0 last:pb-0"
                >
                  <div className="font-medium text-sm text-gray-200">
                    {fault.title}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {fault.whatHappens}
                  </p>
                  <p className="text-xs text-nvidia-green/80 mt-1">
                    Exam: {fault.whyItMatters}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Dashboard: {fault.dashboardIndicators.join(" \u00B7 ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              aria-pressed={selectedFaults.has("xid")}
              onClick={() => toggleFault("xid")}
              className={`flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("xid")
                  ? "border-red-400 ring-2 ring-red-400/50"
                  : "border-red-500/30"
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">XID Error</div>
                <div className="text-xs text-gray-400">Critical GPU fault</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedFaults.has("ecc")}
              onClick={() => toggleFault("ecc")}
              className={`flex items-center gap-3 bg-orange-500/10 hover:bg-orange-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("ecc")
                  ? "border-orange-400 ring-2 ring-orange-400/50"
                  : "border-orange-500/30"
              }`}
            >
              <Cpu className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">ECC Error</div>
                <div className="text-xs text-gray-400">Memory error</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedFaults.has("thermal")}
              onClick={() => toggleFault("thermal")}
              className={`flex items-center gap-3 bg-yellow-500/10 hover:bg-yellow-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("thermal")
                  ? "border-yellow-400 ring-2 ring-yellow-400/50"
                  : "border-yellow-500/30"
              }`}
            >
              <Thermometer className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="font-medium text-yellow-400">Thermal Issue</div>
                <div className="text-xs text-gray-400">High temperature</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedFaults.has("nvlink")}
              onClick={() => toggleFault("nvlink")}
              className={`flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("nvlink")
                  ? "border-purple-400 ring-2 ring-purple-400/50"
                  : "border-purple-500/30"
              }`}
            >
              <Link2 className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-medium text-purple-400">NVLink Down</div>
                <div className="text-xs text-gray-400">Link degradation</div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedFaults.has("power")}
              onClick={() => toggleFault("power")}
              className={`flex items-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("power")
                  ? "border-blue-400 ring-2 ring-blue-400/50"
                  : "border-blue-500/30"
              }`}
            >
              <Zap className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium text-blue-400">Power Issue</div>
                <div className="text-xs text-gray-400">
                  Power limit exceeded
                </div>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedFaults.has("pcie")}
              onClick={() => toggleFault("pcie")}
              className={`flex items-center gap-3 bg-cyan-500/10 hover:bg-cyan-500/20 border rounded-lg px-4 py-3 text-left transition-colors ${
                selectedFaults.has("pcie")
                  ? "border-cyan-400 ring-2 ring-cyan-400/50"
                  : "border-cyan-500/30"
              }`}
            >
              <Radio className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-medium text-cyan-400">PCIe Error</div>
                <div className="text-xs text-gray-400">
                  Bus communication fault
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleSubmitFaults}
              disabled={selectedFaults.size === 0}
              aria-label="Submit selected faults"
              className="flex items-center gap-3 bg-nvidia-green/20 hover:bg-nvidia-green/30 border border-nvidia-green rounded-lg px-4 py-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-nvidia-green/20"
            >
              <Send className="w-5 h-5 text-nvidia-green" />
              <div>
                <div className="font-medium text-nvidia-green">Submit</div>
                <div className="text-xs text-gray-400">
                  {selectedFaults.size > 0
                    ? `Apply ${selectedFaults.size} selected`
                    : "Select faults above"}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleClearFaults}
              className="flex items-center gap-3 bg-nvidia-green/10 hover:bg-nvidia-green/20 border border-nvidia-green/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-nvidia-green" />
              <div>
                <div className="font-medium text-nvidia-green">Clear All</div>
                <div className="text-xs text-gray-400">Reset to healthy</div>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSurpriseMe}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Surprise me
          </button>

          {surpriseFault && (
            <div
              data-testid="surprise-prompt"
              className="p-3 bg-gray-900/50 rounded-lg border border-purple-500/30 text-sm text-gray-300"
            >
              Something&apos;s wrong with this node — can you find it? Switch to
              the Terminal and investigate.
              {surpriseRevealed ? (
                <span
                  data-testid="surprise-reveal-text"
                  className="block mt-2 text-purple-300"
                >
                  Injected fault:{" "}
                  {BASIC_FAULT_DESCRIPTIONS.find(
                    (d) => d.type === surpriseFault,
                  )?.title ?? surpriseFault}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSurpriseRevealed(true)}
                  className="block mt-2 text-purple-300 hover:underline"
                >
                  Reveal
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Reference - collapsible */}
        <details
          className="group mt-6 pt-6 border-t border-gray-700"
          open={showIntro}
          data-testid="quick-reference"
        >
          <summary className="flex items-center gap-2 text-sm cursor-pointer hover:text-gray-300 select-none list-none [&::-webkit-details-marker]:hidden">
            <span className="text-nvidia-green font-medium">
              Quick Reference
            </span>
            <span className="text-xs text-gray-500">— diagnostic commands</span>
          </summary>
          <div className="mt-2 p-3 bg-gray-900 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-gray-400">
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run nvidia-smi"
                  onClick={() => runInTerminal("nvidia-smi")}
                  className="text-nvidia-green hover:underline"
                >
                  nvidia-smi
                </button>{" "}
                — GPU overview
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run nvidia-smi -q -d ECC"
                  onClick={() => runInTerminal("nvidia-smi -q -d ECC")}
                  className="text-nvidia-green hover:underline"
                >
                  nvidia-smi -q -d ECC
                </button>{" "}
                — ECC errors
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run nvidia-smi -q -d TEMPERATURE"
                  onClick={() => runInTerminal("nvidia-smi -q -d TEMPERATURE")}
                  className="text-nvidia-green hover:underline"
                >
                  nvidia-smi -q -d TEMPERATURE
                </button>{" "}
                — Thermals
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run nvidia-smi nvlink -s"
                  onClick={() => runInTerminal("nvidia-smi nvlink -s")}
                  className="text-nvidia-green hover:underline"
                >
                  nvidia-smi nvlink -s
                </button>{" "}
                — NVLink status
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run nvsm show health"
                  onClick={() => runInTerminal("nvsm show health")}
                  className="text-nvidia-green hover:underline"
                >
                  nvsm show health
                </button>{" "}
                — Health summary
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run dcgmi diag -r 1"
                  onClick={() => runInTerminal("dcgmi diag -r 1")}
                  className="text-nvidia-green hover:underline"
                >
                  dcgmi diag -r 1
                </button>{" "}
                — Quick diagnostics
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run dmesg | grep -i xid"
                  onClick={() => runInTerminal("dmesg | grep -i xid")}
                  className="text-nvidia-green hover:underline"
                >
                  dmesg | grep -i xid
                </button>{" "}
                — XID errors in logs
              </div>
              <div>
                •{" "}
                <button
                  type="button"
                  aria-label="Run ipmitool sensor list"
                  onClick={() => runInTerminal("ipmitool sensor list")}
                  className="text-nvidia-green hover:underline"
                >
                  ipmitool sensor list
                </button>{" "}
                — BMC sensors
              </div>
            </div>
          </div>
        </details>

        {/* Complex Training Scenarios */}
        <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">
              Complex Training Scenarios
            </h3>
            <button
              onClick={() => setShowComplexInfo(!showComplexInfo)}
              className="text-gray-400 hover:text-nvidia-green p-1 rounded transition-colors"
              aria-label="Toggle scenario descriptions"
              aria-expanded={showComplexInfo}
            >
              {showComplexInfo ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Collapsible Complex Scenario Info Panel */}
          {showComplexInfo && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
              {COMPLEX_SCENARIO_DESCRIPTIONS.map((scenario) => (
                <div
                  key={scenario.type}
                  className="pb-2 border-b border-gray-700/50 last:border-0 last:pb-0"
                >
                  <div className="font-medium text-sm text-gray-200">
                    {scenario.title}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {scenario.whatHappens}
                  </p>
                  <p className="text-xs text-nvidia-green/80 mt-1">
                    Exam: {scenario.whyItMatters}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Dashboard: {scenario.dashboardIndicators.join(" \u00B7 ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-400">
            Realistic multi-symptom failure scenarios for advanced
            troubleshooting practice.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() => handleInjectScenario("gpu-hang")}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Ban className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">GPU Hang</div>
                <div className="text-xs text-gray-400">
                  XID 43 - GPU stopped responding
                </div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario("bus-reset")}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Radio className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">Bus Reset</div>
                <div className="text-xs text-gray-400">
                  XID 79 - GPU fallen off bus
                </div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario("thermal-alert")}
              className="flex items-center gap-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">Thermal Alert</div>
                <div className="text-xs text-gray-400">
                  All GPUs running hot (90-100°C)
                </div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario("severe-ecc")}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <AlertOctagon className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">Severe ECC Error</div>
                <div className="text-xs text-gray-400">
                  Uncorrectable - GPU replacement needed
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Workload Simulation */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              Simulate Workloads
            </h3>
            <button
              onClick={() => setShowWorkloadInfo(!showWorkloadInfo)}
              className="text-gray-400 hover:text-nvidia-green p-1 rounded transition-colors"
              aria-label="Toggle workload descriptions"
              aria-expanded={showWorkloadInfo}
            >
              {showWorkloadInfo ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Collapsible Workload Info Panel */}
          {showWorkloadInfo && (
            <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
              {WORKLOAD_DESCRIPTIONS.map((workload) => (
                <div
                  key={workload.pattern}
                  className="pb-2 border-b border-gray-700/50 last:border-0 last:pb-0"
                >
                  <div className="font-medium text-sm text-gray-200">
                    {workload.title}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {workload.description}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Dashboard: {workload.dashboardChanges.join(" \u00B7 ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={workloadPattern}
              onChange={(e) =>
                setWorkloadPattern(
                  e.target.value as
                    | "idle"
                    | "inference"
                    | "training"
                    | "stress",
                )
              }
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-nvidia-green"
            >
              <option value="idle">Idle (5% utilization)</option>
              <option value="inference">Inference (60% utilization)</option>
              <option value="training">Training (95% utilization)</option>
              <option value="stress">Stress Test (100% utilization)</option>
            </select>

            <button
              onClick={handleSimulateWorkload}
              className="px-6 py-2 bg-nvidia-green hover:bg-nvidia-darkgreen text-black rounded-lg font-medium transition-colors"
            >
              Apply Workload
            </button>
          </div>

          {/* Selected workload description */}
          {selectedWorkloadDesc && (
            <p className="text-xs text-gray-400 mt-2">
              {selectedWorkloadDesc.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
