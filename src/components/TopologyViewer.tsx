/**
 * Unified Topology Viewer
 *
 * Combines NVLink, NVSwitch, and InfiniBand topology visualizations
 * with fault injection capabilities for interactive learning.
 */

import React, { useState, useCallback } from "react";
import { NVSwitchTopology } from "./NVSwitchTopology";
import { InfiniBandMap } from "./InfiniBandMap";
import { TopologyGraph } from "./TopologyGraph";
import type { DGXNode, GPU, XIDError } from "@/types/hardware";
import { useSimulationStore } from "@/store/simulationStore";
import { Cpu, Network, Zap, AlertTriangle, Play, X } from "lucide-react";

interface TopologyViewerProps {
  nodes: DGXNode[];
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
}

type ViewMode = "nvlink" | "nvswitch" | "infiniband";

// XID error types for fault injection
const XID_ERRORS: Array<{
  code: number;
  description: string;
  severity: "Warning" | "Critical";
}> = [
  { code: 13, description: "Graphics Engine Exception", severity: "Critical" },
  { code: 31, description: "GPU memory page fault", severity: "Critical" },
  { code: 43, description: "GPU stopped processing", severity: "Critical" },
  {
    code: 45,
    description: "Preemptive cleanup, due to previous errors",
    severity: "Warning",
  },
  { code: 48, description: "Double Bit ECC Error", severity: "Critical" },
  {
    code: 61,
    description: "Internal micro-controller breakpoint",
    severity: "Warning",
  },
  {
    code: 62,
    description: "Internal micro-controller halt",
    severity: "Warning",
  },
  {
    code: 63,
    description: "ECC page retirement or row remapping recording",
    severity: "Warning",
  },
  {
    code: 64,
    description: "ECC page retirement or row remapping recording failure",
    severity: "Warning",
  },
  { code: 68, description: "Video processor exception", severity: "Warning" },
  {
    code: 69,
    description: "Graphics Engine class error",
    severity: "Critical",
  },
  { code: 74, description: "NVLink Error", severity: "Warning" },
  { code: 79, description: "GPU has fallen off the bus", severity: "Critical" },
  {
    code: 92,
    description: "High Single-bit ECC error rate",
    severity: "Warning",
  },
  { code: 94, description: "Contained ECC error", severity: "Warning" },
  { code: 95, description: "Uncontained ECC error", severity: "Critical" },
];

export const TopologyViewer: React.FC<TopologyViewerProps> = ({
  nodes,
  selectedNodeId,
  onNodeSelect,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("nvswitch");
  const [selectedGPU, setSelectedGPU] = useState<GPU | null>(null);
  const [showFaultPanel, setShowFaultPanel] = useState(false);
  const [dataFlowActive, setDataFlowActive] = useState(false);
  const [dataFlowPath] = useState<number[]>([0, 7]);

  const { addXIDError, updateGPU, cluster } = useSimulationStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleGPUClick = useCallback((gpu: GPU) => {
    setSelectedGPU(gpu);
    setShowFaultPanel(true);
  }, []);

  const handleFaultInject = useCallback(
    (_gpuId: number, faultType: string) => {
      if (!selectedNodeId) return;

      if (faultType === "xid") {
        // Show fault selection panel
        setShowFaultPanel(true);
      }
    },
    [selectedNodeId],
  );

  const injectXIDError = useCallback(
    (xidError: (typeof XID_ERRORS)[0]) => {
      if (!selectedNodeId || !selectedGPU) return;

      const error: XIDError = {
        code: xidError.code,
        description: xidError.description,
        severity: xidError.severity,
        timestamp: new Date(),
      };

      addXIDError(selectedNodeId, selectedGPU.id, error);

      // Update GPU health status based on error severity
      if (xidError.severity === "Critical") {
        updateGPU(selectedNodeId, selectedGPU.id, { healthStatus: "Critical" });
      } else {
        updateGPU(selectedNodeId, selectedGPU.id, { healthStatus: "Warning" });
      }

      setShowFaultPanel(false);
    },
    [selectedNodeId, selectedGPU, addXIDError, updateGPU],
  );

  const injectThermalIssue = useCallback(() => {
    if (!selectedNodeId || !selectedGPU) return;

    updateGPU(selectedNodeId, selectedGPU.id, {
      temperature: 92,
      healthStatus: "Warning",
    });

    setShowFaultPanel(false);
  }, [selectedNodeId, selectedGPU, updateGPU]);

  const injectNVLinkError = useCallback(() => {
    if (!selectedNodeId || !selectedGPU) return;

    // Inject NVLink error on first link
    const updatedNVLinks = selectedGPU.nvlinks.map((link, idx) =>
      idx === 0
        ? { ...link, status: "Down" as const, txErrors: link.txErrors + 100 }
        : link,
    );

    updateGPU(selectedNodeId, selectedGPU.id, {
      nvlinks: updatedNVLinks,
      healthStatus: "Warning",
    });

    // Also inject XID 74
    addXIDError(selectedNodeId, selectedGPU.id, {
      code: 74,
      description: "NVLink Error",
      severity: "Warning",
      timestamp: new Date(),
    });

    setShowFaultPanel(false);
  }, [selectedNodeId, selectedGPU, updateGPU, addXIDError]);

  const clearGPUErrors = useCallback(() => {
    if (!selectedNodeId || !selectedGPU) return;

    // Reset GPU to healthy state
    const healthyNVLinks = selectedGPU.nvlinks.map((link) => ({
      ...link,
      status: "Active" as const,
      txErrors: 0,
      rxErrors: 0,
      replayErrors: 0,
    }));

    updateGPU(selectedNodeId, selectedGPU.id, {
      healthStatus: "OK",
      temperature: 45 + Math.random() * 10,
      xidErrors: [],
      nvlinks: healthyNVLinks,
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 0, doubleBit: 0 },
      },
    });

    setShowFaultPanel(false);
  }, [selectedNodeId, selectedGPU, updateGPU]);

  const toggleDataFlow = useCallback(() => {
    setDataFlowActive(!dataFlowActive);
  }, [dataFlowActive]);

  return (
    <div className="space-y-4">
      {/* View mode tabs */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("nvswitch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === "nvswitch"
                ? "bg-nvidia-green text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Cpu className="w-4 h-4" />
            NVSwitch Fabric
          </button>
          <button
            onClick={() => setViewMode("nvlink")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === "nvlink"
                ? "bg-nvidia-green text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Zap className="w-4 h-4" />
            NVLink Grid
          </button>
          <button
            onClick={() => setViewMode("infiniband")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === "infiniband"
                ? "bg-nvidia-green text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Network className="w-4 h-4" />
            InfiniBand
          </button>
        </div>

        {/* Data flow animation toggle */}
        {viewMode !== "infiniband" && (
          <button
            onClick={toggleDataFlow}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              dataFlowActive
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Play className="w-4 h-4" />
            {dataFlowActive ? "Stop" : "Start"} Data Flow
          </button>
        )}
      </div>

      {/* Node selector for multi-node cluster */}
      {nodes.length > 1 && viewMode !== "infiniband" && (
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
          <span className="text-sm text-gray-400">Select Node:</span>
          <div className="flex gap-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onNodeSelect?.(node.id)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedNodeId === node.id
                    ? "bg-nvidia-green text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {node.hostname}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topology visualization */}
      <div className="relative">
        {viewMode === "nvswitch" && selectedNode && (
          <NVSwitchTopology
            node={selectedNode}
            onGPUClick={handleGPUClick}
            onFaultInject={handleFaultInject}
            showDataFlow={dataFlowActive}
            dataFlowPath={dataFlowPath}
          />
        )}

        {viewMode === "nvlink" && selectedNode && (
          <TopologyGraph node={selectedNode} />
        )}

        {viewMode === "infiniband" && <InfiniBandMap cluster={cluster} />}
      </div>

      {/* Fault injection panel */}
      {showFaultPanel && selectedGPU && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Fault Injection - GPU {selectedGPU.id}
              </h3>
              <button
                onClick={() => setShowFaultPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Select a fault type to inject into GPU {selectedGPU.id}. This will
              update the simulation state and be visible in nvidia-smi, dcgmi,
              and other diagnostic tools.
            </p>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={injectThermalIssue}
                className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm"
              >
                🌡️ Thermal Issue
                <span className="block text-xs opacity-75">
                  Set temp to 92°C
                </span>
              </button>
              <button
                onClick={injectNVLinkError}
                className="p-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm"
              >
                🔗 NVLink Error
                <span className="block text-xs opacity-75">
                  Disable NVLink 0
                </span>
              </button>
              <button
                onClick={clearGPUErrors}
                className="p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm"
              >
                ✓ Clear Errors
                <span className="block text-xs opacity-75">
                  Reset to healthy
                </span>
              </button>
            </div>

            {/* XID Error selection */}
            <h4 className="text-sm font-semibold text-gray-300 mb-2">
              Inject XID Error:
            </h4>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {XID_ERRORS.map((xid) => (
                <button
                  key={xid.code}
                  onClick={() => injectXIDError(xid)}
                  className={`flex items-center justify-between p-3 rounded-lg text-left ${
                    xid.severity === "Critical"
                      ? "bg-red-900 hover:bg-red-800 border border-red-700"
                      : "bg-yellow-900 hover:bg-yellow-800 border border-yellow-700"
                  }`}
                >
                  <div>
                    <span className="text-white font-mono">XID {xid.code}</span>
                    <span className="text-gray-300 ml-2 text-sm">
                      {xid.description}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      xid.severity === "Critical"
                        ? "bg-red-700"
                        : "bg-yellow-700"
                    }`}
                  >
                    {xid.severity}
                  </span>
                </button>
              ))}
            </div>

            {/* Current GPU state */}
            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                Current GPU State:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-400">Health:</div>
                <div
                  className={`font-semibold ${
                    selectedGPU.healthStatus === "OK"
                      ? "text-green-400"
                      : selectedGPU.healthStatus === "Warning"
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {selectedGPU.healthStatus}
                </div>
                <div className="text-gray-400">Temperature:</div>
                <div className="text-gray-300">
                  {Math.round(selectedGPU.temperature)}°C
                </div>
                <div className="text-gray-400">Active XID Errors:</div>
                <div className="text-gray-300">
                  {selectedGPU.xidErrors.length}
                </div>
                <div className="text-gray-400">NVLinks Down:</div>
                <div className="text-gray-300">
                  {
                    selectedGPU.nvlinks.filter((l) => l.status !== "Active")
                      .length
                  }{" "}
                  / {selectedGPU.nvlinks.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
        <h4 className="font-semibold text-gray-300 mb-2">
          Interactive Features:
        </h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Click GPU:</strong> Select a GPU to view details and inject
            faults
          </li>
          <li>
            <strong>Data Flow:</strong> Visualize NCCL-style data movement
            between GPUs
          </li>
          <li>
            <strong>Fault Injection:</strong> Inject XID errors, thermal issues,
            or NVLink failures
          </li>
          <li>
            <strong>Cross-tool verification:</strong> Injected faults appear in
            nvidia-smi, dcgmi, journalctl
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TopologyViewer;
