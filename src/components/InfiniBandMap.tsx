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
  spineCount: 4,
  leafCount: 8,
  spineToLeafBandwidth: 400, // NDR
  leafToHostBandwidth: 400, // NDR
};

/**
 * Derive fabric config from the cluster's actual HCA port rates.
 * All switches in a DGX SuperPOD match the host HCA speed.
 */
function deriveFabricConfig(cluster: ClusterConfig): FabricTierConfig {
  // Read port rate from first node's first HCA
  const firstPort = cluster.nodes[0]?.hcas?.[0]?.ports?.[0];
  const portRate = (firstPort?.rate || 400) as 100 | 200 | 400 | 800;
  const hcaCount = cluster.nodes[0]?.hcas?.length || 8;
  return {
    spineCount: DEFAULT_FABRIC_CONFIG.spineCount,
    leafCount: hcaCount,
    spineToLeafBandwidth: portRate,
    leafToHostBandwidth: portRate,
  };
}

/**
 * Get the correct switch model name for a given IB speed.
 */
function getSwitchModel(bandwidth: number): string {
  if (bandwidth >= 800) return "NVIDIA QM9790 (XDR)";
  if (bandwidth >= 400) return "NVIDIA QM9700 (NDR)";
  if (bandwidth >= 200) return "NVIDIA QM8790 (HDR)";
  return "NVIDIA QM8700 (EDR)";
}

// Helper to convert bandwidth to line width
const bandwidthToWidth = (bandwidth: number): number => {
  if (bandwidth >= 800) return 4; // XDR
  if (bandwidth >= 400) return 3; // NDR
  if (bandwidth >= 200) return 2.5; // HDR
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
  fabricConfig: fabricConfigProp,
  highlightedNodes,
  highlightedSwitches,
}) => {
  const fabricConfig = fabricConfigProp || deriveFabricConfig(cluster);
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

    // Use click (not mousedown) so D3's stopPropagation() on node clicks
    // prevents this handler from firing when switching between nodes
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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

    // Leaf to Host links (rail-optimized: each host connects to ALL leafs)
    hostNodes.forEach((host) => {
      leafNodes.forEach((leaf) => {
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
      });
    });

    return links;
  }, [cluster, fabricConfig]);

  // Disable particle animations when user prefers reduced motion
  const { particleCount } = useNetworkAnimation({
    enabled: isRunning && !reducedMotion,
    links: animationLinks,
    renderTarget: particleGroupRef,
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
        label: `R${i}`,
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

    // Create links: Leaf to Hosts (rail-optimized: each host connects to ALL leafs)
    hostNodes.forEach((host) => {
      leafNodes.forEach((leaf) => {
        links.push({
          source: leaf,
          target: host,
          status: host.status === "active" ? "active" : "down",
          speed: bandwidthLabel(fabricConfig.leafToHostBandwidth),
        });
      });
    });

    // Draw links with error-based coloring
    const linkGroup = svg.append("g").attr("class", "links");

    linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("data-link-source", (d) => d.source.id)
      .attr("data-link-target", (d) => d.target.id)
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
        if (isBackbone)
          return bandwidthToWidth(fabricConfig.spineToLeafBandwidth);
        return 1.5;
      })
      .attr("stroke-dasharray", (d) => (d.status === "active" ? "0" : "5,5"))
      .attr("opacity", (d) => {
        const isHostLink = d.target.type === "host";
        if (!isHostLink) return 0.7;
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
        if (totalErrors > 0) return 0.6;
        return 0.15;
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

    // Invisible wider lines for click detection on IB links
    const clickGroup = svg.append("g").attr("class", "link-click-targets");

    clickGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .attr("stroke", "transparent")
      .attr("stroke-width", 12)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        event.stopPropagation();
        const hostNode = clusterRef.current.nodes.find(
          (n) => n.id === d.target.id,
        );

        // Collect port info from host (if target is a host)
        const ports = hostNode
          ? hostNode.hcas.flatMap((hca) =>
              hca.ports.map((p) => ({
                portNumber: p.portNumber,
                state: p.state,
                rate: p.rate,
                errors: {
                  symbolErrors: p.errors.symbolErrors,
                  linkDowned: p.errors.linkDowned,
                  portRcvErrors: p.errors.portRcvErrors,
                  portXmitDiscards: p.errors.portXmitDiscards,
                },
              })),
            )
          : [];

        const totalErrors = ports.reduce(
          (sum, p) =>
            sum +
            p.errors.symbolErrors +
            p.errors.portRcvErrors +
            p.errors.linkDowned,
          0,
        );

        setSelectedNode({
          type: "iblink",
          data: {
            sourceLabel: d.source.label,
            targetLabel: d.target.label,
            speed: d.speed,
            status: d.status,
            totalErrors,
            ports,
          },
        });
      })
      .on("mouseover", function () {
        d3.select(this).attr("stroke", "rgba(118, 185, 0, 0.15)");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "transparent");
      });

    // Draw nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");

    const nodeGroups = nodeGroup
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("data-node-id", (d) => d.id)
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

    // Error badge for host nodes (hidden by default, shown by dynamic update effect)
    nodeGroups
      .filter((d) => d.type === "host")
      .append("circle")
      .attr("class", "error-badge")
      .attr("cx", 18)
      .attr("cy", -18)
      .attr("r", 8)
      .attr("fill", "#EF4444")
      .attr("stroke", "#1F2937")
      .attr("stroke-width", 1.5)
      .attr("display", "none");

    nodeGroups
      .filter((d) => d.type === "host")
      .append("text")
      .attr("class", "error-badge-text")
      .attr("x", 18)
      .attr("y", -18)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", "8px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .attr("display", "none")
      .text("");

    // Add hover effects and click handlers
    nodeGroups
      .on("mouseover", function (_event, d) {
        d3.select(this).select("rect,circle,polygon").attr("opacity", 1);

        // Determine which link IDs are connected to this node
        const connectedSet = new Set<string>();

        if (d.type === "host") {
          // Host → highlight leaf-host links for this host
          links
            .filter((l) => l.target.id === d.id)
            .forEach((l) => connectedSet.add(`${l.source.id}|${l.target.id}`));
        } else if (d.type === "leaf") {
          // Leaf → highlight spine-leaf links AND leaf-host links for this leaf
          links
            .filter((l) => l.source.id === d.id || l.target.id === d.id)
            .forEach((l) => connectedSet.add(`${l.source.id}|${l.target.id}`));
        } else if (d.type === "spine") {
          // Spine → highlight spine-leaf links for this spine
          links
            .filter((l) => l.source.id === d.id)
            .forEach((l) => connectedSet.add(`${l.source.id}|${l.target.id}`));
        }

        // Brighten connected links, dim the rest
        svg
          .select("g.links")
          .selectAll("line")
          .each(function () {
            const line = d3.select(this);
            const src = line.attr("data-link-source");
            const tgt = line.attr("data-link-target");
            if (!src || !tgt) return;
            const key = `${src}|${tgt}`;
            if (connectedSet.has(key)) {
              line
                .attr("stroke", "#4ade80")
                .attr("stroke-width", 3.5)
                .attr("opacity", 0.7);
            } else {
              line.attr("opacity", 0.06);
            }
          });
      })
      .on("mouseout", function () {
        d3.select(this).select("rect,circle,polygon").attr("opacity", 0.9);

        // Reset all visible links to their default styles
        svg
          .select("g.links")
          .selectAll("line")
          .each(function () {
            const line = d3.select(this);
            const tgt = line.attr("data-link-target");
            if (!tgt) return;
            const isHostLink =
              tgt.startsWith("dgx-") || tgt.startsWith("node-");
            if (isHostLink) {
              const hostNode = clusterRef.current.nodes.find(
                (n) => n.id === tgt,
              );
              const baseStatus: "active" | "down" = hostNode?.hcas.some((hca) =>
                hca.ports.some((p) => p.state === "Active"),
              )
                ? "active"
                : "down";
              const color = getLinkColor(hostNode, baseStatus);
              const totalErrors =
                hostNode?.hcas.reduce(
                  (sum, hca) =>
                    sum +
                    hca.ports.reduce(
                      (ps, port) =>
                        ps +
                        port.errors.symbolErrors +
                        port.errors.portRcvErrors,
                      0,
                    ),
                  0,
                ) || 0;
              line
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .attr("opacity", totalErrors > 0 ? 0.6 : 0.15);
            } else {
              // Spine-leaf link
              line
                .attr("stroke", "#10B981")
                .attr(
                  "stroke-width",
                  bandwidthToWidth(fabricConfig.spineToLeafBandwidth),
                )
                .attr("opacity", 0.7);
            }
          });
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
            // Leaf (Rail) connects to ALL hosts + spines
            portCount = spineCount + hostNodes.length;
            bandwidth = bandwidthLabel(fabricConfig.leafToHostBandwidth);

            hostNodes.forEach((h) => {
              connectedNodes.push(h.label.replace("dgx-", ""));
            });
          }

          // Deterministic switch metrics
          const switchIdx = parseInt(d.id.split("-")[1]);
          const baseTemp = d.type === "spine" ? 52 : 48;
          const switchTemp = baseTemp + ((switchIdx * 3) % 10);

          // Calculate active port count from connected hosts' HCA state
          let computedActivePortCount = 0;
          if (d.type === "spine") {
            // Spine: all leaf ports assumed active when spine is active
            computedActivePortCount = d.status === "active" ? portCount : 0;
          } else {
            // Leaf (Rail): count hosts with active HCA for this rail
            const leafIdx = parseInt(d.id.split("-")[1]);
            let activeHosts = 0;
            clusterRef.current.nodes.forEach((host) => {
              const hca = host.hcas[leafIdx];
              if (hca?.ports.some((p) => p.state === "Active")) {
                activeHosts++;
              }
            });
            computedActivePortCount = spineCount + activeHosts;
          }

          // Derive throughput from connected hosts' HCA port rates
          const connectedHosts =
            d.type === "spine"
              ? clusterRef.current.nodes
              : clusterRef.current.nodes; // Rail connects to ALL hosts
          const activePortRate = connectedHosts.reduce(
            (sum, host) =>
              sum +
              host.hcas.reduce(
                (hcaSum, hca) =>
                  hcaSum +
                  hca.ports
                    .filter((p) => p.state === "Active")
                    .reduce((portSum, p) => portSum + p.rate, 0),
                0,
              ),
            0,
          );
          // Convert Gb/s to GB/s (divide by 8)
          const throughput = Math.round(activePortRate / 8);

          setSelectedNode({
            type: "switch",
            data: {
              id: d.id,
              switchType: d.type,
              status: d.status === "active" ? "active" : "down",
              portCount,
              activePortCount: computedActivePortCount,
              bandwidth,
              connectedNodes,
              throughput,
              temperature: switchTemp,
              model: getSwitchModel(
                d.type === "spine"
                  ? fabricConfig.spineToLeafBandwidth
                  : fabricConfig.leafToHostBandwidth,
              ),
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

    const leafLabel = svg
      .append("text")
      .attr("x", 10)
      .attr("y", 250)
      .attr("fill", "#9CA3AF")
      .attr("font-size", "14px")
      .attr("font-weight", "bold");
    leafLabel.append("tspan").text("Leaf Tier");
    leafLabel
      .append("tspan")
      .attr("x", 10)
      .attr("dy", "1.2em")
      .attr("font-size", "12px")
      .attr("font-weight", "normal")
      .text("(Rails)");

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 450)
      .attr("fill", "#9CA3AF")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Host Tier");

    // Add particle container group for animations (pointer-events: none so
    // particles don't intercept clicks on nodes/links beneath them)
    particleGroupRef.current = svg
      .append("g")
      .attr("class", "particles")
      .attr("pointer-events", "none")
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

  // Dynamic update effect: update link/node colors when HCA state changes
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const linkGroup = svg.select("g.links");
    const nodeGroup = svg.select("g.nodes");

    // Update host-link colors based on current HCA state
    linkGroup.selectAll("line").each(function () {
      const line = d3.select(this);
      const targetId = line.attr("data-link-target");
      if (!targetId) return;

      // Only update host links (target is a host node id, not spine/leaf)
      const hostNode = cluster.nodes.find((n) => n.id === targetId);
      if (!hostNode) return;

      const hasActivePort = hostNode.hcas.some((hca) =>
        hca.ports.some((p) => p.state === "Active"),
      );
      const baseStatus: "active" | "down" = hasActivePort ? "active" : "down";
      const color = getLinkColor(hostNode, baseStatus);

      line
        .attr("stroke", color)
        .attr("stroke-dasharray", hasActivePort ? "0" : "5,5");

      // Update tooltip
      const totalErrors = hostNode.hcas.reduce(
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
      line.select("title").text((d) => {
        const data = d as FabricLink;
        return `${data.source.label} → ${data.target.label}\nStatus: ${baseStatus}\nPort Errors: ${totalErrors}`;
      });
    });

    // Update host node circle fill and error badges based on HCA state
    nodeGroup.selectAll("g").each(function () {
      const group = d3.select(this);
      const nodeId = group.attr("data-node-id");
      if (!nodeId) return;

      const hostNode = cluster.nodes.find((n) => n.id === nodeId);
      if (!hostNode) return; // Skip spine/leaf switches

      const hasActivePort = hostNode.hcas.some((hca) =>
        hca.ports.some((p) => p.state === "Active"),
      );
      group
        .select("circle:not(.error-badge)")
        .attr("fill", hasActivePort ? "#10B981" : "#EF4444");

      // Update error badge
      const totalErrors = hostNode.hcas.reduce(
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
      const badge = group.select("circle.error-badge");
      const badgeText = group.select("text.error-badge-text");

      if (totalErrors > 0) {
        badge.attr("display", null);
        badgeText
          .attr("display", null)
          .text(totalErrors > 99 ? "99+" : String(totalErrors));
      } else {
        badge.attr("display", "none");
        badgeText.attr("display", "none");
      }
    });
  }, [cluster.nodes]);

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
        <div className="overflow-x-auto">
          <svg
            ref={svgRef}
            className="w-full min-w-[600px] bg-gray-900 rounded-lg"
          />
        </div>

        {/* Network Node Detail Panel - outside scroll container to avoid clipping */}
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
          <span>({particleCount} active flows)</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
          <span className="text-gray-300">Minor Errors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-orange-500" />
          <span className="text-gray-300">High Errors</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 bg-red-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span className="text-gray-300">Down</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 bg-red-500 rounded-full text-white text-center"
            style={{ fontSize: "7px", lineHeight: "12px" }}
          >
            !
          </div>
          <span className="text-gray-300">Error Badge</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <p>
          • Click on any node or link for details. Hover to highlight
          connections.
        </p>
        <p>
          • Rail-optimized fat-tree: {fabricConfig.spineCount} spine,{" "}
          {fabricConfig.leafCount} rail (leaf) switches
        </p>
        <p>
          • Each host connects to all {fabricConfig.leafCount} rails (HCA N →
          Rail N)
        </p>
        <p>
          • Spine↔Leaf: {bandwidthLabel(fabricConfig.spineToLeafBandwidth)} |
          Rail↔Host: {bandwidthLabel(fabricConfig.leafToHostBandwidth)}
        </p>
      </div>
    </div>
  );
};
