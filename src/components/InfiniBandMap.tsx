/**
 * InfiniBand Fabric Map Component
 *
 * Visualizes InfiniBand fat-tree topology using D3.js.
 * Shows switches (leaf/spine) and HCAs with link health.
 * Includes live data flow animations when simulation is running.
 */

import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import type { ClusterConfig, DGXNode } from "@/types/hardware";
import { Network } from "lucide-react";
import {
  useNetworkAnimation,
  AnimationLink,
} from "@/hooks/useNetworkAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSimulationStore } from "@/store/simulationStore";
import { NetworkNodeDetail, NetworkNodeType } from "./NetworkNodeDetail";

export interface FabricTierConfig {
  spineCount: number;
  leafCount: number;
  spineToLeafBandwidth: 100 | 200 | 400 | 800; // Gb/s (EDR, HDR, NDR, XDR)
  leafToHostBandwidth: 100 | 200 | 400 | 800;
}

const DEFAULT_FABRIC_CONFIG: FabricTierConfig = {
  spineCount: 2,
  leafCount: 4,
  spineToLeafBandwidth: 400, // NDR
  leafToHostBandwidth: 200, // HDR
};

// Helper to convert bandwidth to line width
const bandwidthToWidth = (bandwidth: number): number => {
  if (bandwidth >= 800) return 6; // XDR
  if (bandwidth >= 400) return 4; // NDR
  if (bandwidth >= 200) return 3; // HDR
  return 2; // EDR
};

// Helper to get bandwidth label
const bandwidthLabel = (bandwidth: number): string => {
  if (bandwidth >= 800) return "XDR 800 Gb/s";
  if (bandwidth >= 400) return "NDR 400 Gb/s";
  if (bandwidth >= 200) return "HDR 200 Gb/s";
  return "EDR 100 Gb/s";
};

// Helper to determine link color based on host port errors
const getLinkColor = (
  host: DGXNode | undefined,
  baseStatus: "active" | "down",
): string => {
  if (baseStatus === "down" || !host) return "#EF4444"; // Red for down

  // Sum errors across all HCA ports
  const totalErrors = host.hcas.reduce(
    (sum, hca) =>
      sum +
      hca.ports.reduce(
        (portSum, port) =>
          portSum +
          port.errors.symbolErrors +
          port.errors.portRcvErrors +
          port.errors.linkDowned,
        0,
      ),
    0,
  );

  if (totalErrors === 0) return "#10B981"; // Green - healthy
  if (totalErrors < 10) return "#EAB308"; // Yellow - minor errors
  if (totalErrors < 50) return "#F97316"; // Orange - moderate errors
  return "#EF4444"; // Red - high errors
};

interface InfiniBandMapProps {
  cluster: ClusterConfig;
  fabricConfig?: FabricTierConfig;
  highlightedNodes?: string[];
  highlightedSwitches?: string[];
}

interface FabricNode {
  id: string;
  type: "host" | "leaf" | "spine";
  label: string;
  status: "active" | "down" | "degraded";
  x: number;
  y: number;
}

interface FabricLink {
  source: FabricNode;
  target: FabricNode;
  status: "active" | "down";
  speed: string;
}

// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_NODE_ARRAY: string[] = [];
const EMPTY_SWITCH_ARRAY: string[] = [];

export const InfiniBandMap: React.FC<InfiniBandMapProps> = ({
  cluster,
  fabricConfig = DEFAULT_FABRIC_CONFIG,
  highlightedNodes,
  highlightedSwitches,
}) => {
  // Use stable references for empty arrays to prevent D3 useEffect re-runs
  const stableHighlightedNodes = highlightedNodes?.length
    ? highlightedNodes
    : EMPTY_NODE_ARRAY;
  const stableHighlightedSwitches = highlightedSwitches?.length
    ? highlightedSwitches
    : EMPTY_SWITCH_ARRAY;
  const svgRef = useRef<SVGSVGElement>(null);
  const particleGroupRef = useRef<SVGGElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef(cluster); // Ref to access current cluster data in click handlers
  const isRunning = useSimulationStore((state) => state.isRunning);
  const reducedMotion = useReducedMotion();
  const [selectedNode, setSelectedNode] = useState<NetworkNodeType | null>(
    null,
  );

  // Keep ref updated with latest cluster data
  useEffect(() => {
    clusterRef.current = cluster;
  }, [cluster]);

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

  // Calculate animation links from fabric topology
  const animationLinks: AnimationLink[] = useMemo(() => {
    const links: AnimationLink[] = [];
    const width = 1000;

    // Spine positions (use config)
    const spineCount = fabricConfig.spineCount;
    const spineNodes = Array.from({ length: spineCount }, (_, i) => ({
      id: `spine-${i}`,
      x: (width / (spineCount + 1)) * (i + 1),
      y: 80,
    }));

    // Leaf positions (use config, capped by cluster size)
    const leafCount = Math.min(cluster.nodes.length, fabricConfig.leafCount);
    const leafNodes = Array.from({ length: leafCount }, (_, i) => ({
      id: `leaf-${i}`,
      x: (width / (leafCount + 1)) * (i + 1),
      y: 250,
    }));

    // Host positions
    const nodeSpacing = width / (cluster.nodes.length + 1);
    const hostNodes = cluster.nodes.map((node, idx) => ({
      id: node.id,
      x: nodeSpacing * (idx + 1),
      y: 450,
      active: node.hcas.some((hca) =>
        hca.ports.some((p) => p.state === "Active"),
      ),
      utilization:
        node.gpus.reduce((sum, g) => sum + g.utilization, 0) / node.gpus.length,
    }));

    // Spine to Leaf links (higher bandwidth backbone)
    spineNodes.forEach((spine) => {
      leafNodes.forEach((leaf) => {
        links.push({
          id: `${spine.id}-${leaf.id}`,
          sourceX: spine.x,
          sourceY: spine.y,
          targetX: leaf.x,
          targetY: leaf.y,
          active: true,
          utilization: 30 + Math.random() * 40, // Simulated backbone traffic
          bidirectional: true,
        });
      });
    });

    // Leaf to Host links
    hostNodes.forEach((host, idx) => {
      const leafIdx = Math.floor(
        idx / Math.ceil(hostNodes.length / leafNodes.length),
      );
      const leaf = leafNodes[Math.min(leafIdx, leafNodes.length - 1)];
      if (leaf) {
        links.push({
          id: `${leaf.id}-${host.id}`,
          sourceX: leaf.x,
          sourceY: leaf.y,
          targetX: host.x,
          targetY: host.y,
          active: host.active,
          utilization: host.active ? host.utilization : 0,
          bidirectional: true,
        });
      }
    });

    return links;
  }, [cluster, fabricConfig]);

  // Disable particle animations when user prefers reduced motion
  const { particles } = useNetworkAnimation({
    enabled: isRunning && !reducedMotion,
    links: animationLinks,
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 1000;
    const height = 600;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Create fabric topology using config
    const nodes: FabricNode[] = [];
    const links: FabricLink[] = [];

    // Spine switches (top tier) - use config
    const spineCount = fabricConfig.spineCount;
    for (let i = 0; i < spineCount; i++) {
      nodes.push({
        id: `spine-${i}`,
        type: "spine",
        label: `Spine Switch ${i + 1}`,
        status: "active",
        x: (width / (spineCount + 1)) * (i + 1),
        y: 80,
      });
    }

    // Leaf switches (middle tier) - use config, capped by cluster size
    const leafCount = Math.min(cluster.nodes.length, fabricConfig.leafCount);
    for (let i = 0; i < leafCount; i++) {
      nodes.push({
        id: `leaf-${i}`,
        type: "leaf",
        label: `Leaf Switch ${i + 1}`,
        status: "active",
        x: (width / (leafCount + 1)) * (i + 1),
        y: 250,
      });
    }

    // Host nodes (bottom tier)
    const nodeSpacing = width / (cluster.nodes.length + 1);
    cluster.nodes.forEach((node, idx) => {
      // Check if any InfiniBand port is active
      const hasActiveIB = node.hcas.some((hca) =>
        hca.ports.some((port) => port.state === "Active"),
      );
      nodes.push({
        id: node.id,
        type: "host",
        label: node.id,
        status: hasActiveIB ? "active" : "down",
        x: nodeSpacing * (idx + 1),
        y: 450,
      });
    });

    // Create links: Spine to Leaf (full mesh)
    const spineNodes = nodes.filter((n) => n.type === "spine");
    const leafNodes = nodes.filter((n) => n.type === "leaf");
    const hostNodes = nodes.filter((n) => n.type === "host");

    spineNodes.forEach((spine) => {
      leafNodes.forEach((leaf) => {
        links.push({
          source: spine,
          target: leaf,
          status: "active",
          speed: bandwidthLabel(fabricConfig.spineToLeafBandwidth),
        });
      });
    });

    // Create links: Leaf to Hosts
    hostNodes.forEach((host, idx) => {
      const leafIdx = Math.floor(
        idx / Math.ceil(hostNodes.length / leafNodes.length),
      );
      const leaf = leafNodes[Math.min(leafIdx, leafNodes.length - 1)];
      if (leaf) {
        links.push({
          source: leaf,
          target: host,
          status: host.status === "active" ? "active" : "down",
          speed: bandwidthLabel(fabricConfig.leafToHostBandwidth),
        });
      }
    });

    // Draw links with error-based coloring
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
        // For host links, check host's port errors
        if (d.target.type === "host") {
          const hostNode = cluster.nodes.find((n) => n.id === d.target.id);
          return getLinkColor(hostNode, d.status);
        }
        // Spine-leaf links use simple status
        return d.status === "active" ? "#10B981" : "#EF4444";
      })
      .attr("stroke-width", (d) => {
        const isBackbone =
          d.source.type === "spine" || d.target.type === "spine";
        return isBackbone
          ? bandwidthToWidth(fabricConfig.spineToLeafBandwidth)
          : bandwidthToWidth(fabricConfig.leafToHostBandwidth);
      })
      .attr("stroke-dasharray", (d) => (d.status === "active" ? "0" : "5,5"))
      .attr("opacity", (d) => {
        // Highlight degraded links slightly
        if (d.target.type === "host") {
          const hostNode = cluster.nodes.find((n) => n.id === d.target.id);
          const totalErrors =
            hostNode?.hcas.reduce(
              (sum, hca) =>
                sum +
                hca.ports.reduce(
                  (portSum, port) =>
                    portSum +
                    port.errors.symbolErrors +
                    port.errors.portRcvErrors,
                  0,
                ),
              0,
            ) || 0;
          return totalErrors > 0 ? 0.8 : 0.5;
        }
        return 0.5;
      })
      .append("title")
      .text((d) => {
        let tooltip = `${d.source.label} → ${d.target.label}\nStatus: ${d.status}\nSpeed: ${d.speed}`;
        if (d.target.type === "host") {
          const hostNode = cluster.nodes.find((n) => n.id === d.target.id);
          if (hostNode) {
            const totalErrors = hostNode.hcas.reduce(
              (sum, hca) =>
                sum +
                hca.ports.reduce(
                  (portSum, port) =>
                    portSum +
                    port.errors.symbolErrors +
                    port.errors.portRcvErrors,
                  0,
                ),
              0,
            );
            tooltip += `\nPort Errors: ${totalErrors}`;
          }
        }
        return tooltip;
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

    // Node shapes (different for each type)
    nodeGroups.each(function (d) {
      const group = d3.select(this);

      // Check if this node should be highlighted
      const isHighlightedSwitch =
        (d.type === "spine" || d.type === "leaf") &&
        stableHighlightedSwitches.includes(d.id);
      const isHighlightedNode =
        d.type === "host" && stableHighlightedNodes.includes(d.id);
      const isHighlighted = isHighlightedSwitch || isHighlightedNode;

      // Add highlight ring first (behind the shape)
      if (isHighlighted) {
        if (d.type === "spine") {
          group
            .append("rect")
            .attr("x", -58)
            .attr("y", -33)
            .attr("width", 116)
            .attr("height", 66)
            .attr("fill", "none")
            .attr("stroke", "#facc15")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "6,4")
            .attr("rx", 8)
            .attr("class", "highlight-ring");
        } else if (d.type === "leaf") {
          group
            .append("circle")
            .attr("r", 42)
            .attr("fill", "none")
            .attr("stroke", "#facc15")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "6,4")
            .attr("class", "highlight-ring");
        } else {
          group
            .append("circle")
            .attr("r", 35)
            .attr("fill", "none")
            .attr("stroke", "#facc15")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "6,4")
            .attr("class", "highlight-ring");
        }
      }

      if (d.type === "spine") {
        // Rectangle for spine switches
        group
          .append("rect")
          .attr("x", -50)
          .attr("y", -25)
          .attr("width", 100)
          .attr("height", 50)
          .attr("fill", d.status === "active" ? "#3B82F6" : "#EF4444")
          .attr("stroke", "#1F2937")
          .attr("stroke-width", 2)
          .attr("rx", 5);
      } else if (d.type === "leaf") {
        // Hexagon for leaf switches
        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = 30 * Math.cos(angle);
          const y = 30 * Math.sin(angle);
          points.push(`${x},${y}`);
        }
        group
          .append("polygon")
          .attr("points", points.join(" "))
          .attr("fill", d.status === "active" ? "#8B5CF6" : "#EF4444")
          .attr("stroke", "#1F2937")
          .attr("stroke-width", 2);
      } else {
        // Circle for hosts
        group
          .append("circle")
          .attr("r", 25)
          .attr("fill", d.status === "active" ? "#10B981" : "#EF4444")
          .attr("stroke", "#1F2937")
          .attr("stroke-width", 2);
      }

      // Label
      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("fill", "#fff")
        .attr("font-size", d.type === "host" ? "10px" : "12px")
        .attr("font-weight", "bold")
        .text(
          d.type === "host"
            ? d.label.replace("dgx-", "")
            : d.type === "spine"
              ? "S" + d.id.split("-")[1]
              : "L" + d.id.split("-")[1],
        );
    });

    // Add tooltips
    nodeGroups
      .append("title")
      .text((d) => `${d.label}\nType: ${d.type}\nStatus: ${d.status}`);

    // Add hover effects and click handlers
    nodeGroups
      .on("mouseover", function () {
        d3.select(this).select("rect,circle,polygon").attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).select("rect,circle,polygon").attr("opacity", 0.9);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        if (d.type === "spine" || d.type === "leaf") {
          // Calculate connected nodes based on switch type
          const connectedNodes: string[] = [];
          let portCount: number;
          let bandwidth: string;

          if (d.type === "spine") {
            // Spine connects to all leaf switches
            portCount = leafCount * 2; // 2 ports per leaf connection for redundancy
            bandwidth = bandwidthLabel(fabricConfig.spineToLeafBandwidth);
            for (let i = 0; i < leafCount; i++) {
              connectedNodes.push(`Leaf ${i + 1}`);
            }
          } else {
            // Leaf connects to hosts and spines
            const hostsPerLeaf = Math.ceil(hostNodes.length / leafNodes.length);
            const leafIdx = parseInt(d.id.split("-")[1]);
            const startHost = leafIdx * hostsPerLeaf;
            const endHost = Math.min(
              startHost + hostsPerLeaf,
              hostNodes.length,
            );

            portCount = spineCount + hostsPerLeaf; // Uplinks to spines + downlinks to hosts
            bandwidth = bandwidthLabel(fabricConfig.leafToHostBandwidth);

            for (let i = startHost; i < endHost; i++) {
              if (hostNodes[i]) {
                connectedNodes.push(hostNodes[i].label.replace("dgx-", ""));
              }
            }
          }

          setSelectedNode({
            type: "switch",
            data: {
              id: d.id,
              switchType: d.type,
              status: d.status === "active" ? "active" : "down",
              portCount,
              activePortCount: d.status === "active" ? portCount : 0,
              bandwidth,
              connectedNodes,
              throughput:
                d.type === "spine"
                  ? 800 + Math.floor(Math.random() * 400) // Spine: 800-1200 GB/s
                  : 200 + Math.floor(Math.random() * 200), // Leaf: 200-400 GB/s
              temperature: 45 + Math.floor(Math.random() * 15), // 45-60°C
              model:
                d.type === "spine"
                  ? "NVIDIA QM9700 (NDR)"
                  : "NVIDIA QM8700 (HDR)",
              firmwareVersion: "29.2008.1234",
            },
          });
        } else if (d.type === "host") {
          // Use ref to get current cluster data without triggering re-render
          const clusterNode = clusterRef.current.nodes.find(
            (n) => n.id === d.id,
          );
          if (clusterNode) {
            setSelectedNode({
              type: "host",
              data: {
                id: clusterNode.id,
                hostname: clusterNode.hostname,
                hcas: clusterNode.hcas,
                gpuCount: clusterNode.gpus.length,
              },
            });
          }
        }
      });

    // Click on background to deselect
    svg.on("click", () => setSelectedNode(null));

    // Add tier labels
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 80)
      .attr("fill", "#9CA3AF")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Spine Tier");

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 250)
      .attr("fill", "#9CA3AF")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Leaf Tier");

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 450)
      .attr("fill", "#9CA3AF")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Host Tier");

    // Add particle container group for animations
    particleGroupRef.current = svg
      .append("g")
      .attr("class", "particles")
      .node();
    // Only depend on structural changes (node count, config), NOT on metrics that change every tick
    // Dynamic data updates are handled by clusterRef in click handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cluster.nodes.length,
    fabricConfig,
    stableHighlightedNodes,
    stableHighlightedSwitches,
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

  const totalLinks = cluster.nodes.length;
  const activeLinks = cluster.nodes.filter((n) =>
    n.hcas.some((hca) => hca.ports.some((port) => port.state === "Active")),
  ).length;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            InfiniBand Fabric Topology
          </h3>
        </div>
        <div className="text-sm text-gray-400">
          Active Links: {activeLinks}/{totalLinks}
        </div>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="w-full bg-gray-900 rounded-lg" />

        {/* Network Node Detail Panel */}
        {selectedNode && (
          <div ref={detailPanelRef}>
            <NetworkNodeDetail
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>

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

      <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-gray-300">Spine</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 bg-purple-500"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          />
          <span className="text-gray-300">Leaf</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-gray-300">Host</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500" />
          <span className="text-gray-300">Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-yellow-500" />
          <span className="text-gray-300">Errors</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 bg-red-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span className="text-gray-300">Down</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <p>• Click on any node to see detailed information</p>
        <p>
          • Fat-tree topology: {fabricConfig.spineCount} spine,{" "}
          {Math.min(cluster.nodes.length, fabricConfig.leafCount)} leaf switches
        </p>
        <p>
          • Spine↔Leaf: {bandwidthLabel(fabricConfig.spineToLeafBandwidth)} |
          Leaf↔Host: {bandwidthLabel(fabricConfig.leafToHostBandwidth)}
        </p>
      </div>
    </div>
  );
};
