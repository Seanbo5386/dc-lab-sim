/**
 * NVSwitch Fabric Topology Visualization
 *
 * Shows the NVSwitch fabric connecting GPUs in a DGX system.
 * DGX A100/H100 uses 6 NVSwitches to create a fully-connected GPU topology.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { DGXNode, GPU } from "@/types/hardware";

interface NVSwitchTopologyProps {
  node: DGXNode;
  onGPUClick?: (gpu: GPU) => void;
  onFaultInject?: (gpuId: number, faultType: string) => void;
  showDataFlow?: boolean;
  dataFlowPath?: number[]; // GPU IDs for data flow animation
}

interface SwitchNode {
  id: string;
  type: "nvswitch";
  x: number;
  y: number;
  health: "OK" | "Warning" | "Critical";
}

interface GPUNode {
  id: number;
  type: "gpu";
  name: string;
  health: string;
  utilization: number;
  temperature: number;
  x: number;
  y: number;
  gpu: GPU;
}

type TopologyNode = SwitchNode | GPUNode;

export const NVSwitchTopology: React.FC<NVSwitchTopologyProps> = ({
  node,
  onGPUClick,
  onFaultInject,
  showDataFlow = false,
  dataFlowPath = [],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GPUNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);

  const handleNodeClick = useCallback(
    (gpuNode: GPUNode) => {
      setSelectedNode(gpuNode);
      if (onGPUClick) {
        onGPUClick(gpuNode.gpu);
      }
    },
    [onGPUClick],
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 900;
    const height = 600;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Add gradient definitions for NVSwitch
    const defs = svg.append("defs");

    // NVIDIA green gradient
    const gradient = defs
      .append("linearGradient")
      .attr("id", "nvswitch-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#76B900");
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4a7c00");

    // Create NVSwitch nodes (6 switches in DGX A100/H100)
    const nvSwitches: SwitchNode[] = [];
    for (let i = 0; i < 6; i++) {
      nvSwitches.push({
        id: `nvswitch-${i}`,
        type: "nvswitch",
        x: 200 + (i % 3) * 250,
        y: 200 + Math.floor(i / 3) * 200,
        health: "OK",
      });
    }

    // Create GPU nodes arranged in two rows
    const gpuNodes: GPUNode[] = node.gpus.map((gpu, idx) => ({
      id: gpu.id,
      type: "gpu",
      name: `GPU ${idx}`,
      health: gpu.healthStatus,
      utilization: gpu.utilization,
      temperature: gpu.temperature,
      // Top row: GPUs 0-3, Bottom row: GPUs 4-7
      x: 100 + (idx % 4) * 200,
      y: idx < 4 ? 80 : 520,
      gpu,
    }));

    // Create links between GPUs and NVSwitches
    // Each GPU connects to all 6 NVSwitches via NVLink
    interface LinkData {
      source: { x: number; y: number };
      target: { x: number; y: number };
      gpuId: number;
      switchId: number;
      active: boolean;
    }

    const links: LinkData[] = [];
    gpuNodes.forEach((gpuNode) => {
      nvSwitches.forEach((switchNode, switchIdx) => {
        // Check if this GPU's NVLinks are active
        const nvlink =
          gpuNode.gpu.nvlinks[switchIdx % gpuNode.gpu.nvlinks.length];
        links.push({
          source: { x: gpuNode.x, y: gpuNode.y },
          target: { x: switchNode.x, y: switchNode.y },
          gpuId: gpuNode.id,
          switchId: switchIdx,
          active: nvlink?.status === "Active",
        });
      });
    });

    // Draw links first (behind nodes)
    const linkGroup = svg.append("g").attr("class", "links");

    linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .attr("stroke", (d) => (d.active ? "#76B900" : "#4B5563"))
      .attr("stroke-width", (d) => (d.active ? 2 : 1))
      .attr("stroke-dasharray", (d) => (d.active ? "0" : "3,3"))
      .attr("opacity", 0.4)
      .attr("class", "nvlink-line");

    // Draw data flow animation if enabled
    if (showDataFlow && dataFlowPath.length >= 2) {
      const animationGroup = svg.append("g").attr("class", "data-flow");

      // Create animated circles for data flow
      const flowParticles = animationGroup
        .selectAll("circle")
        .data(d3.range(5))
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", "#00D4FF")
        .attr("opacity", 0.8);

      // Animate along the path through NVSwitch
      const animatePath = () => {
        const sourceGPU = gpuNodes.find((n) => n.id === dataFlowPath[0]);
        const targetGPU = gpuNodes.find((n) => n.id === dataFlowPath[1]);
        const middleSwitch = nvSwitches[Math.floor(nvSwitches.length / 2)];

        if (!sourceGPU || !targetGPU) return;

        flowParticles.each(function (i) {
          const delay = i * 200;

          d3.select(this)
            .attr("cx", sourceGPU.x)
            .attr("cy", sourceGPU.y)
            .transition()
            .delay(delay)
            .duration(500)
            .attr("cx", middleSwitch.x)
            .attr("cy", middleSwitch.y)
            .transition()
            .duration(500)
            .attr("cx", targetGPU.x)
            .attr("cy", targetGPU.y)
            .on("end", () => {
              if (i === 4) animatePath();
            });
        });
      };

      animatePath();
    }

    // Draw NVSwitch nodes
    const switchGroup = svg.append("g").attr("class", "switches");

    const switchNodes = switchGroup
      .selectAll("g")
      .data(nvSwitches)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // NVSwitch rectangles
    switchNodes
      .append("rect")
      .attr("x", -40)
      .attr("y", -25)
      .attr("width", 80)
      .attr("height", 50)
      .attr("rx", 8)
      .attr("fill", "url(#nvswitch-gradient)")
      .attr("stroke", "#76B900")
      .attr("stroke-width", 2);

    // NVSwitch labels
    switchNodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text((d) => `NVSwitch ${d.id.split("-")[1]}`);

    // Draw GPU nodes
    const nodeGroup = svg.append("g").attr("class", "gpus");

    const gpuGroups = nodeGroup
      .selectAll("g")
      .data(gpuNodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        handleNodeClick(d);
      })
      .on("mouseover", function (_event, d) {
        setHoveredNode(d);
        d3.select(this).select("rect").attr("stroke-width", 4);
      })
      .on("mouseout", function () {
        setHoveredNode(null);
        d3.select(this).select("rect").attr("stroke-width", 2);
      });

    // GPU rectangles
    gpuGroups
      .append("rect")
      .attr("x", -35)
      .attr("y", -25)
      .attr("width", 70)
      .attr("height", 50)
      .attr("rx", 6)
      .attr("fill", (d) => {
        if (d.health === "Critical") return "#EF4444";
        if (d.health === "Warning") return "#F59E0B";
        if (d.temperature > 80) return "#F59E0B";
        return "#1F2937";
      })
      .attr("stroke", (d) => {
        if (selectedNode?.id === d.id) return "#00D4FF";
        if (d.health === "Critical") return "#EF4444";
        if (d.health === "Warning") return "#F59E0B";
        return "#76B900";
      })
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 3 : 2));

    // GPU name
    gpuGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text((d) => d.name);

    // GPU stats
    gpuGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.1em")
      .attr("fill", "#9CA3AF")
      .attr("font-size", "10px")
      .text(
        (d) => `${Math.round(d.utilization)}% | ${Math.round(d.temperature)}°C`,
      );

    // Add utilization bar
    gpuGroups.each(function (d) {
      const barWidth = 60;
      const barHeight = 4;
      const fillWidth = (d.utilization / 100) * barWidth;

      const group = d3.select(this);

      // Background bar
      group
        .append("rect")
        .attr("x", -30)
        .attr("y", 18)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", "#374151")
        .attr("rx", 2);

      // Utilization fill
      group
        .append("rect")
        .attr("x", -30)
        .attr("y", 18)
        .attr("width", fillWidth)
        .attr("height", barHeight)
        .attr("fill", d.utilization > 80 ? "#76B900" : "#10B981")
        .attr("rx", 2);
    });
  }, [node, selectedNode, handleNodeClick, showDataFlow, dataFlowPath]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          NVSwitch Fabric Topology - {node.id}
        </h3>
        <div className="flex gap-2">
          {onFaultInject && selectedNode && (
            <button
              onClick={() => onFaultInject(selectedNode.id, "xid")}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Inject XID Error
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full min-w-[600px] bg-gray-900 rounded-lg"
        />
      </div>

      {/* Info panel for selected/hovered node */}
      {(selectedNode || hoveredNode) && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            {selectedNode ? "Selected" : "Hovered"}:{" "}
            {(selectedNode || hoveredNode)?.type === "gpu"
              ? (selectedNode || (hoveredNode as GPUNode)).name
              : ""}
          </h4>
          {(selectedNode || hoveredNode)?.type === "gpu" && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">UUID:</div>
              <div className="text-gray-300 font-mono text-xs truncate">
                {((selectedNode || hoveredNode) as GPUNode).gpu.uuid}
              </div>
              <div className="text-gray-400">Temperature:</div>
              <div className="text-gray-300">
                {((selectedNode || hoveredNode) as GPUNode).temperature}°C
              </div>
              <div className="text-gray-400">Utilization:</div>
              <div className="text-gray-300">
                {((selectedNode || hoveredNode) as GPUNode).utilization}%
              </div>
              <div className="text-gray-400">Power:</div>
              <div className="text-gray-300">
                {((selectedNode || hoveredNode) as GPUNode).gpu.powerDraw}W /{" "}
                {((selectedNode || hoveredNode) as GPUNode).gpu.powerLimit}W
              </div>
              <div className="text-gray-400">Memory:</div>
              <div className="text-gray-300">
                {Math.round(
                  ((selectedNode || hoveredNode) as GPUNode).gpu.memoryUsed /
                    1024,
                )}
                GB /{" "}
                {Math.round(
                  ((selectedNode || hoveredNode) as GPUNode).gpu.memoryTotal /
                    1024,
                )}
                GB
              </div>
              <div className="text-gray-400">NVLinks Active:</div>
              <div className="text-gray-300">
                {
                  ((selectedNode || hoveredNode) as GPUNode).gpu.nvlinks.filter(
                    (l) => l.status === "Active",
                  ).length
                }{" "}
                /{" "}
                {((selectedNode || hoveredNode) as GPUNode).gpu.nvlinks.length}
              </div>
              <div className="text-gray-400">Health:</div>
              <div
                className={`font-semibold ${
                  ((selectedNode || hoveredNode) as GPUNode).health === "OK"
                    ? "text-green-400"
                    : ((selectedNode || hoveredNode) as GPUNode).health ===
                        "Warning"
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {((selectedNode || hoveredNode) as GPUNode).health}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 bg-gradient-to-r from-green-600 to-green-800 rounded" />
          <span className="text-gray-300">NVSwitch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-800 border-2 border-green-500 rounded" />
          <span className="text-gray-300">Healthy GPU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded" />
          <span className="text-gray-300">Warning GPU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-gray-300">Critical GPU</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Click on a GPU to select it. Green lines = active NVLinks. Dashed lines
        = inactive.
      </p>
    </div>
  );
};

export default NVSwitchTopology;
