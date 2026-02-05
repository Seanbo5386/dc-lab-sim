/**
 * Topology Graph Component
 *
 * Visualizes GPU NVLink topology using D3.js.
 * Shows GPU nodes and their interconnections with health status.
 * Includes live data flow animations when simulation is running.
 */

import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import type { DGXNode } from "@/types/hardware";
import { Network } from "lucide-react";
import {
  useNetworkAnimation,
  AnimationLink,
} from "@/hooks/useNetworkAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSimulationStore } from "@/store/simulationStore";
import { NetworkNodeDetail, NetworkNodeType } from "./NetworkNodeDetail";
import {
  getLayoutForSystem,
  calculateGPUPositions,
  calculateNVSwitchPositions,
} from "@/data/dgxLayouts";

interface TopologyGraphProps {
  node: DGXNode;
  highlightedGpus?: number[];
  highlightedLinks?: string[];
}

interface GraphNode {
  id: number;
  name: string;
  health: string;
  utilization: number;
  temperature: number;
  x: number;
  y: number;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  status: string;
  bandwidth: string;
}

// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_GPU_ARRAY: number[] = [];
const EMPTY_LINK_ARRAY: string[] = [];

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  node,
  highlightedGpus,
  highlightedLinks,
}) => {
  // Use stable references for empty arrays to prevent D3 useEffect re-runs
  const stableHighlightedGpus = highlightedGpus?.length
    ? highlightedGpus
    : EMPTY_GPU_ARRAY;
  const stableHighlightedLinks = highlightedLinks?.length
    ? highlightedLinks
    : EMPTY_LINK_ARRAY;
  const svgRef = useRef<SVGSVGElement>(null);
  const particleGroupRef = useRef<SVGGElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const nodeDataRef = useRef(node); // Ref to access current node data in click handlers
  const isRunning = useSimulationStore((state) => state.isRunning);
  const reducedMotion = useReducedMotion();
  const [selectedNode, setSelectedNode] = useState<NetworkNodeType | null>(
    null,
  );

  // Keep ref updated with latest node data
  useEffect(() => {
    nodeDataRef.current = node;
  }, [node]);

  // Close panel when clicking anywhere outside of it
  useEffect(() => {
    if (!selectedNode) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        detailPanelRef.current &&
        !detailPanelRef.current.contains(event.target as Node)
      ) {
        setSelectedNode(null);
      }
    };

    // Use mousedown for immediate response
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedNode]);

  // Get layout for this system type
  const layout = useMemo(
    () => getLayoutForSystem(node.systemType),
    [node.systemType],
  );

  // Calculate animation links from GPU NVLink connections using accurate layout
  const animationLinks = useMemo((): AnimationLink[] => {
    const width = 800;
    const height = 500;
    const gpuPositions = calculateGPUPositions(layout, width, height);

    const links: AnimationLink[] = [];
    for (const conn of layout.nvLinkConnections) {
      const sourcePos = gpuPositions.find((p) => p.gpuIndex === conn.from);
      const targetPos = gpuPositions.find((p) => p.gpuIndex === conn.to);
      if (!sourcePos || !targetPos) continue;

      const sourceGpu = node.gpus[conn.from];
      const targetGpu = node.gpus[conn.to];
      const avgUtil =
        sourceGpu && targetGpu
          ? (sourceGpu.utilization + targetGpu.utilization) / 2
          : 50;
      const isActive =
        sourceGpu?.nvlinks.some((l) => l.status === "Active") ?? true;

      links.push({
        id: `nvlink-${conn.from}-${conn.to}`,
        sourceX: sourcePos.x,
        sourceY: sourcePos.y,
        targetX: targetPos.x,
        targetY: targetPos.y,
        active: isActive,
        utilization: avgUtil,
        bidirectional: true,
      });
    }
    return links;
  }, [node, layout]);

  // Disable particle animations when user prefers reduced motion
  const { particles } = useNetworkAnimation({
    enabled: isRunning && !reducedMotion,
    links: animationLinks,
  });

  // Memoize STATIC layout data - only recalculate when layout or GPU count changes
  // This prevents SVG rebuilds on every simulation tick
  const { nodes, links, nvSwitchPositions } = useMemo(() => {
    const width = 800;
    const height = 500;
    const gpuPos = calculateGPUPositions(layout, width, height);
    const nvSwitchPos = calculateNVSwitchPositions(layout, width, height);

    // Create nodes with STATIC positions only - dynamic data fetched via ref in handlers
    const nodeList: GraphNode[] = node.gpus.map((gpu, idx) => {
      const pos = gpuPos.find((p) => p.gpuIndex === idx) || { x: 100, y: 100 };
      return {
        id: gpu.id,
        name: `GPU ${idx}`,
        health: gpu.healthStatus, // Initial value, updated separately
        utilization: gpu.utilization, // Initial value, updated separately
        temperature: gpu.temperature, // Initial value, updated separately
        x: pos.x,
        y: pos.y,
      };
    });

    // Create links using layout's NVLink connections
    const linkList: GraphLink[] = layout.nvLinkConnections
      .map((conn) => {
        const sourceNode = nodeList.find((n) => n.id === conn.from);
        const targetNode = nodeList.find((n) => n.id === conn.to);
        if (!sourceNode || !targetNode) return null;

        const sourceGpu = node.gpus[conn.from];
        const linkStatus = sourceGpu?.nvlinks.some((l) => l.status === "Active")
          ? "Active"
          : "Down";
        const bandwidth = sourceGpu?.nvlinks[0]?.speed || 900;

        return {
          source: sourceNode,
          target: targetNode,
          status: linkStatus,
          bandwidth: `${bandwidth} GB/s`,
        };
      })
      .filter((link): link is GraphLink => link !== null);

    return { nodes: nodeList, links: linkList, nvSwitchPositions: nvSwitchPos };
    // Only depend on layout and GPU count, NOT on GPU metrics that change every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, node.gpus.length]);

  // Initial SVG setup - only runs when layout changes, NOT on every node data update
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 500;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Draw links using memoized data
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
      .attr("stroke", (d) => {
        // Check if this link is highlighted (format: "from-to" or "nvlink-from-to")
        const linkId1 = `${d.source.id}-${d.target.id}`;
        const linkId2 = `${d.target.id}-${d.source.id}`;
        const isHighlighted =
          stableHighlightedLinks.includes(linkId1) ||
          stableHighlightedLinks.includes(linkId2);
        if (isHighlighted) return "#facc15"; // Yellow for highlighted
        return d.status === "Active" ? "#10B981" : "#EF4444";
      })
      .attr("stroke-width", (d) => {
        const linkId1 = `${d.source.id}-${d.target.id}`;
        const linkId2 = `${d.target.id}-${d.source.id}`;
        const isHighlighted =
          stableHighlightedLinks.includes(linkId1) ||
          stableHighlightedLinks.includes(linkId2);
        if (isHighlighted) return 5;
        return d.status === "Active" ? 3 : 1;
      })
      .attr("stroke-dasharray", (d) => (d.status === "Active" ? "0" : "5,5"))
      .attr("opacity", (d) => {
        const linkId1 = `${d.source.id}-${d.target.id}`;
        const linkId2 = `${d.target.id}-${d.source.id}`;
        const isHighlighted =
          stableHighlightedLinks.includes(linkId1) ||
          stableHighlightedLinks.includes(linkId2);
        return isHighlighted ? 0.9 : 0.6;
      })
      .attr("class", (d) => {
        const linkId1 = `${d.source.id}-${d.target.id}`;
        const linkId2 = `${d.target.id}-${d.source.id}`;
        const isHighlighted =
          stableHighlightedLinks.includes(linkId1) ||
          stableHighlightedLinks.includes(linkId2);
        return isHighlighted ? "highlight-pulse" : "";
      })
      .append("title")
      .text(
        (d) =>
          `${d.source.name} ↔ ${d.target.name}\nStatus: ${d.status}\nBandwidth: ${d.bandwidth}`,
      );

    // Draw NVSwitch nodes
    const nvSwitchGroup = svg.append("g").attr("class", "nvswitches");

    const nvSwitchNodes = nvSwitchGroup
      .selectAll("g")
      .data(nvSwitchPositions)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // NVSwitch rectangles
    nvSwitchNodes
      .append("rect")
      .attr("x", -20)
      .attr("y", -10)
      .attr("width", 40)
      .attr("height", 20)
      .attr("fill", "#6366F1")
      .attr("stroke", "#1F2937")
      .attr("stroke-width", 2)
      .attr("rx", 3)
      .attr("opacity", 0.8);

    // NVSwitch labels
    nvSwitchNodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .text((d) => `NVS${d.id}`);

    // NVSwitch tooltips
    nvSwitchNodes
      .append("title")
      .text(
        (d) =>
          `NVSwitch ${d.id}\nConnected GPUs: ${d.connectedGPUs.join(", ")}`,
      );

    // NVSwitch hover effects and click handlers
    nvSwitchNodes
      .style("cursor", "pointer")
      .on("mouseover", function () {
        d3.select(this)
          .select("rect")
          .attr("stroke", "#76B900")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this)
          .select("rect")
          .attr("stroke", "#1F2937")
          .attr("stroke-width", 2)
          .attr("opacity", 0.8);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        setSelectedNode({
          type: "nvswitch",
          data: {
            id: d.id,
            connectedGPUs: d.connectedGPUs,
            status: "active",
            throughput: 900,
            temperature: 65 + Math.floor(Math.random() * 10),
          },
        });
      });

    // Draw nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");

    const nodeGroups = nodeGroup
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer");

    // Node circles
    nodeGroups
      .append("circle")
      .attr("r", 35)
      .attr("fill", (d) => {
        if (d.health === "Critical") return "#EF4444";
        if (d.health === "Warning") return "#F59E0B";
        if (d.temperature > 80) return "#F59E0B";
        return "#10B981";
      })
      .attr("stroke", "#1F2937")
      .attr("stroke-width", 3)
      .attr("opacity", 0.9);

    // Highlight ring for scenario-targeted GPUs
    nodeGroups.each(function (d) {
      const isHighlighted = stableHighlightedGpus.includes(d.id);
      if (isHighlighted) {
        d3.select(this)
          .insert("circle", ":first-child")
          .attr("r", 48)
          .attr("fill", "none")
          .attr("stroke", "#facc15")
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", "6,4")
          .attr("class", "highlight-ring");
      }
    });

    // Utilization ring
    nodeGroups.each(function (d) {
      const angle = (d.utilization / 100) * 360;
      const radians = (angle * Math.PI) / 180;
      const x = 40 * Math.sin(radians);
      const y = -40 * Math.cos(radians);

      d3.select(this)
        .append("path")
        .attr("d", `M 0,-40 A 40,40 0 ${angle > 180 ? 1 : 0},1 ${x},${y}`)
        .attr("stroke", "#76B900")
        .attr("stroke-width", 4)
        .attr("fill", "none")
        .attr("stroke-linecap", "round");
    });

    // GPU number text
    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "#fff")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text((d) => String(d.id));

    // Temperature text
    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("fill", "#fff")
      .attr("font-size", "11px")
      .text((d) => `${Math.round(d.temperature)}°C`);

    // Add tooltips
    nodeGroups
      .append("title")
      .text(
        (d) =>
          `${d.name}\nHealth: ${d.health}\nUtilization: ${Math.round(d.utilization)}%\nTemperature: ${Math.round(d.temperature)}°C`,
      );

    // Add hover effects and click handlers
    nodeGroups
      .on("mouseover", function () {
        d3.select(this).select("circle").attr("r", 40).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).select("circle").attr("r", 35).attr("opacity", 0.9);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        // Use ref to get current GPU data without triggering re-render
        const gpu = nodeDataRef.current.gpus.find((g) => g.id === d.id);
        if (gpu) {
          setSelectedNode({ type: "gpu", data: gpu });
        }
      });

    // Click on background to deselect
    svg.on("click", () => setSelectedNode(null));

    // Add particle container group for animations
    particleGroupRef.current = svg
      .append("g")
      .attr("class", "particles")
      .node();
  }, [
    nodes,
    links,
    nvSwitchPositions,
    layout,
    stableHighlightedGpus,
    stableHighlightedLinks,
  ]);

  // Particle animation render effect
  useEffect(() => {
    if (!particleGroupRef.current) return;

    const group = d3.select(particleGroupRef.current);

    // Data join for particles
    const particleSelection = group
      .selectAll<SVGCircleElement, (typeof particles)[0]>("circle")
      .data(particles, (d) => d.id);

    // Enter new particles
    particleSelection
      .enter()
      .append("circle")
      .attr("r", (d) => d.size || 4)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.8)
      .merge(particleSelection)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    // Remove old particles
    particleSelection.exit().remove();
  }, [particles]);

  // Update dynamic visual attributes (colors, temperature text) without rebuilding SVG
  // This runs on every simulation tick but only updates attributes, preserving click handlers
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const nodeGroup = svg.select("g.nodes");

    // Update each GPU node's visual attributes based on current data
    nodeGroup.selectAll("g").each(function (_, i) {
      const gpu = node.gpus[i];
      if (!gpu) return;

      const group = d3.select(this);

      // Update node circle color based on current health/temperature
      group.select("circle").attr("fill", () => {
        if (gpu.healthStatus === "Critical") return "#EF4444";
        if (gpu.healthStatus === "Warning") return "#F59E0B";
        if (gpu.temperature > 80) return "#F59E0B";
        return "#10B981";
      });

      // Update temperature text
      group
        .selectAll("text")
        .filter(function () {
          return d3.select(this).text().includes("°C");
        })
        .text(`${Math.round(gpu.temperature)}°C`);

      // Update utilization ring
      const angle = (gpu.utilization / 100) * 360;
      const radians = (angle * Math.PI) / 180;
      const x = 40 * Math.sin(radians);
      const y = -40 * Math.cos(radians);
      group
        .select("path")
        .attr("d", `M 0,-40 A 40,40 0 ${angle > 180 ? 1 : 0},1 ${x},${y}`);

      // Update tooltip
      group
        .select("title")
        .text(
          `GPU ${i}\nHealth: ${gpu.healthStatus}\nUtilization: ${Math.round(gpu.utilization)}%\nTemperature: ${Math.round(gpu.temperature)}°C`,
        );
    });
  }, [node.gpus]);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 relative">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-nvidia-green" />
        <h3 className="text-lg font-semibold text-gray-200">
          NVLink Topology - {node.id}
        </h3>
      </div>

      <svg ref={svgRef} className="w-full bg-gray-900 rounded-lg" />

      {/* Network Node Detail Panel - positioned relative to main container */}
      {selectedNode && (
        <div ref={detailPanelRef}>
          <NetworkNodeDetail
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {/* Animation status indicator */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${isRunning && !reducedMotion ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
        />
        {reducedMotion
          ? "Animations disabled (reduced motion)"
          : isRunning
            ? "Live data flow"
            : "Paused"}
        {isRunning && !reducedMotion && (
          <span>({particles.length} active flows)</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-gray-300">Healthy GPU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-gray-300">Warning / Hot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-gray-300">Critical GPU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-indigo-500 rounded" />
          <span className="text-gray-300">NVSwitch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-gray-300">Active NVLink</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <p>• Green ring around GPU = Utilization level</p>
        <p>• Click on a GPU or NVSwitch to see detailed information</p>
        <p>• Active NVLinks shown as solid green lines</p>
      </div>
    </div>
  );
};
