# InfiniBand Fabric Tab Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the InfiniBand Fabric tab with rich host details, fabric health summary, and link error highlighting

**Architecture:** Three coordinated improvements: (1) Expand NetworkNodeDetail for hosts to show HCA/port details with error counters, (2) Add new FabricHealthSummary component showing overall fabric status, (3) Modify link rendering in InfiniBandMap to color-code by error rates

**Tech Stack:** React, TypeScript, D3.js, TailwindCSS

---

## Overview

### Feature 1: Rich Host Detail Panel

Enhance the host click panel to show detailed HCA information, per-port statistics, error counters, and relevant commands.

### Feature 2: Fabric Health Summary Panel

Add a new panel above the topology showing overall fabric health score, active/down link counts, and error summaries.

### Feature 3: Link Error Highlighting

Color-code links based on simulated error rates and highlight degraded connections visually.

---

## Task 1: Add Error Simulation to InfiniBand Ports

The current simulation doesn't generate varied error data for ports. We need to add simulated error counters that the visualizations can use.

**Files:**

- Modify: `src/utils/simulationEngine.ts` (or wherever port state is updated)
- Reference: `src/types/hardware.ts:109-116` for InfiniBandPort.errors structure

**Step 1: Read the simulation engine to understand update patterns**

Read `src/utils/simulationEngine.ts` to find where HCA/port state is updated during simulation ticks.

**Step 2: Add error counter simulation logic**

In the simulation tick function, add logic to occasionally increment port error counters:

```typescript
// Inside the node update loop where ports are processed
hca.ports.forEach((port) => {
  if (port.state === "Active") {
    // Simulate occasional errors (rare events)
    if (Math.random() < 0.02) {
      // 2% chance per tick
      const errorType = Math.floor(Math.random() * 4);
      switch (errorType) {
        case 0:
          port.errors.symbolErrors += Math.floor(Math.random() * 3);
          break;
        case 1:
          port.errors.portRcvErrors += 1;
          break;
        case 2:
          port.errors.portXmitWait += Math.floor(Math.random() * 10);
          break;
        // linkDowned only if major fault
      }
    }
  }
});
```

**Step 3: Verify the simulation generates errors**

Run: `npm run dev`
Open console, observe that ports now have varying error counters over time.

**Step 4: Commit**

```bash
git add src/utils/simulationEngine.ts
git commit -m "feat(sim): add InfiniBand port error counter simulation

Ports now accumulate realistic error counters during simulation
for symbol errors, receive errors, and transmit waits.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create FabricHealthSummary Component

Create a new summary panel that calculates and displays fabric-wide health metrics.

**Files:**

- Create: `src/components/FabricHealthSummary.tsx`
- Reference: `src/types/hardware.ts:101-125` for HCA/Port types

**Step 1: Create the component file**

```typescript
// src/components/FabricHealthSummary.tsx
/**
 * Fabric Health Summary Panel
 *
 * Displays overall InfiniBand fabric health metrics including
 * active/down links, error summaries, and health score.
 */

import React from 'react';
import { Activity, AlertTriangle, CheckCircle, Link2, Server } from 'lucide-react';
import type { ClusterConfig } from '@/types/hardware';

interface FabricHealthSummaryProps {
  cluster: ClusterConfig;
}

interface FabricMetrics {
  totalPorts: number;
  activePorts: number;
  downPorts: number;
  degradedPorts: number; // Active but with errors
  totalHosts: number;
  connectedHosts: number;
  totalErrors: {
    symbolErrors: number;
    linkDowned: number;
    portRcvErrors: number;
    portXmitDiscards: number;
  };
  healthScore: number; // 0-100
}

const calculateFabricMetrics = (cluster: ClusterConfig): FabricMetrics => {
  let totalPorts = 0;
  let activePorts = 0;
  let downPorts = 0;
  let degradedPorts = 0;
  let connectedHosts = 0;
  const totalErrors = {
    symbolErrors: 0,
    linkDowned: 0,
    portRcvErrors: 0,
    portXmitDiscards: 0,
  };

  cluster.nodes.forEach(node => {
    let nodeHasActivePort = false;

    node.hcas.forEach(hca => {
      hca.ports.forEach(port => {
        totalPorts++;

        if (port.state === 'Active') {
          activePorts++;
          nodeHasActivePort = true;

          // Check for errors indicating degradation
          const hasErrors = port.errors.symbolErrors > 0 ||
                           port.errors.portRcvErrors > 0;
          if (hasErrors) degradedPorts++;
        } else {
          downPorts++;
        }

        // Accumulate errors
        totalErrors.symbolErrors += port.errors.symbolErrors;
        totalErrors.linkDowned += port.errors.linkDowned;
        totalErrors.portRcvErrors += port.errors.portRcvErrors;
        totalErrors.portXmitDiscards += port.errors.portXmitDiscards;
      });
    });

    if (nodeHasActivePort) connectedHosts++;
  });

  // Calculate health score (simple formula)
  const portHealth = totalPorts > 0 ? (activePorts / totalPorts) * 100 : 100;
  const errorPenalty = Math.min(degradedPorts * 5, 30); // Max 30% penalty
  const healthScore = Math.max(0, Math.round(portHealth - errorPenalty));

  return {
    totalPorts,
    activePorts,
    downPorts,
    degradedPorts,
    totalHosts: cluster.nodes.length,
    connectedHosts,
    totalErrors,
    healthScore,
  };
};

export const FabricHealthSummary: React.FC<FabricHealthSummaryProps> = ({ cluster }) => {
  const metrics = calculateFabricMetrics(cluster);

  const healthColor = metrics.healthScore >= 90 ? 'text-green-500' :
                      metrics.healthScore >= 70 ? 'text-yellow-500' :
                      'text-red-500';

  const healthBg = metrics.healthScore >= 90 ? 'bg-green-500' :
                   metrics.healthScore >= 70 ? 'bg-yellow-500' :
                   'bg-red-500';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-nvidia-green" />
        <h3 className="text-sm font-semibold text-gray-200">Fabric Health Summary</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {/* Health Score */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Health Score</div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${healthColor}`}>
              {metrics.healthScore}%
            </div>
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${healthBg} transition-all`}
                style={{ width: `${metrics.healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Link Status */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Links</div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{metrics.activePorts}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{metrics.totalPorts}</span>
            {metrics.downPorts > 0 && (
              <span className="text-red-500 text-xs">({metrics.downPorts} down)</span>
            )}
          </div>
          {metrics.degradedPorts > 0 && (
            <div className="flex items-center gap-1 mt-1 text-yellow-500 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {metrics.degradedPorts} degraded
            </div>
          )}
        </div>

        {/* Host Status */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Hosts</div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{metrics.connectedHosts}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{metrics.totalHosts}</span>
            <span className="text-gray-500 text-xs">connected</span>
          </div>
        </div>

        {/* Error Counts */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Error Counters</div>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Symbol:</span>
              <span className={metrics.totalErrors.symbolErrors > 0 ? 'text-yellow-500' : 'text-gray-400'}>
                {metrics.totalErrors.symbolErrors}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RcvErr:</span>
              <span className={metrics.totalErrors.portRcvErrors > 0 ? 'text-yellow-500' : 'text-gray-400'}>
                {metrics.totalErrors.portRcvErrors}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">LnkDwn:</span>
              <span className={metrics.totalErrors.linkDowned > 0 ? 'text-red-500' : 'text-gray-400'}>
                {metrics.totalErrors.linkDowned}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Discard:</span>
              <span className={metrics.totalErrors.portXmitDiscards > 0 ? 'text-orange-500' : 'text-gray-400'}>
                {metrics.totalErrors.portXmitDiscards}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topology Info */}
      <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
        Topology: {cluster.fabricTopology} |
        Click nodes for detailed port information
      </div>
    </div>
  );
};
```

**Step 2: Verify the component compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/FabricHealthSummary.tsx
git commit -m "feat(ui): add FabricHealthSummary component

New component displays fabric-wide health metrics:
- Overall health score with visual indicator
- Active/down/degraded link counts
- Host connectivity status
- Aggregated error counters

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Integrate FabricHealthSummary into Dashboard

Add the new summary component to the InfiniBand Fabric tab view.

**Files:**

- Modify: `src/components/Dashboard.tsx:503-521`

**Step 1: Add import**

At the imports section (around line 7), add:

```typescript
import { FabricHealthSummary } from "./FabricHealthSummary";
```

**Step 2: Add component to network view**

Replace the network tab section (lines 503-521) with:

```typescript
{/* InfiniBand Fabric Tab */}
{activeView === 'network' && (
  <div className="space-y-4">
    {/* Fabric Health Summary - spans full width */}
    <FabricHealthSummary cluster={cluster} />

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3">
        <InfiniBandMap
          cluster={cluster}
          highlightedNodes={activeScenario?.highlightedNodes}
          highlightedSwitches={activeScenario?.highlightedSwitches}
        />
      </div>
      <div className="lg:col-span-1">
        <VisualContextPanel
          activeScenario={activeScenario}
          currentView="network"
          onLaunchScenario={handleLaunchScenario}
        />
      </div>
    </div>
  </div>
)}
```

**Step 3: Verify the integration**

Run: `npm run dev`
Navigate to Simulator → InfiniBand Fabric tab
Expected: See new Fabric Health Summary panel above the topology

**Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(ui): integrate FabricHealthSummary into InfiniBand tab

The InfiniBand Fabric view now shows fabric health metrics
above the topology visualization.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Enhance Host Detail Panel with HCA/Port Information

Expand the host node detail panel in NetworkNodeDetail to show detailed HCA and port information.

**Files:**

- Modify: `src/components/NetworkNodeDetail.tsx:203-213`

**Step 1: Read the current host section**

The current host section (lines 203-213) only shows basic info. We need to expand it.

**Step 2: Replace host section with enhanced version**

Replace lines 203-213 with:

```typescript
{node.type === 'host' && (
  <div className="space-y-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-400 text-xs">Node ID: {node.data.id}</span>
      <HealthBadge status={node.data.hcas.some(h => h.ports.some(p => p.state === 'Active')) ? 'active' : 'down'} />
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="bg-gray-800 rounded p-2">
        <div className="text-gray-400">GPUs</div>
        <div className="text-white font-medium">{node.data.gpuCount}</div>
      </div>
      <div className="bg-gray-800 rounded p-2">
        <div className="text-gray-400">HCAs</div>
        <div className="text-white font-medium">{node.data.hcas.length}</div>
      </div>
    </div>

    {/* HCA Details */}
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="text-xs text-gray-400 mb-2">InfiniBand HCAs</div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {node.data.hcas.map((hca, hcaIdx) => (
          <div key={hcaIdx} className="bg-gray-800 rounded p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-nvidia-green text-xs font-medium">
                HCA {hcaIdx}: {hca.caType}
              </span>
              <span className="text-gray-500 text-xs">
                FW: {hca.firmwareVersion}
              </span>
            </div>

            {hca.ports.map((port) => {
              const hasErrors = port.errors.symbolErrors > 0 ||
                               port.errors.portRcvErrors > 0 ||
                               port.errors.linkDowned > 0;
              const portColor = port.state !== 'Active' ? 'text-red-500' :
                               hasErrors ? 'text-yellow-500' : 'text-green-500';

              return (
                <div key={port.portNumber} className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs">Port {port.portNumber}</span>
                    <span className={`text-xs ${portColor}`}>
                      {port.state} @ {port.rate} Gb/s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                    <div className="text-gray-500">
                      LID: <span className="text-gray-300">{port.lid}</span>
                    </div>
                    <div className="text-gray-500">
                      GUID: <span className="text-gray-300 font-mono text-xs">
                        {port.guid.slice(0, 10)}...
                      </span>
                    </div>
                  </div>

                  {/* Error Counters */}
                  <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                    <div className={port.errors.symbolErrors > 0 ? 'text-yellow-500' : 'text-gray-500'}>
                      Sym: {port.errors.symbolErrors}
                    </div>
                    <div className={port.errors.linkDowned > 0 ? 'text-red-500' : 'text-gray-500'}>
                      Dwn: {port.errors.linkDowned}
                    </div>
                    <div className={port.errors.portRcvErrors > 0 ? 'text-yellow-500' : 'text-gray-500'}>
                      Rcv: {port.errors.portRcvErrors}
                    </div>
                    <div className={port.errors.portXmitDiscards > 0 ? 'text-orange-500' : 'text-gray-500'}>
                      Dsc: {port.errors.portXmitDiscards}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    {/* Command Hints */}
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="text-xs text-gray-400 mb-1">Diagnostic Commands</div>
      <div className="flex flex-wrap gap-1">
        <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">ibstat</code>
        <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">perfquery</code>
        <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-nvidia-green">ibdiagnet</code>
      </div>
    </div>
  </div>
)}
```

**Step 3: Verify the changes**

Run: `npm run dev`
Navigate to Simulator → InfiniBand Fabric tab
Click on a host node (green circle)
Expected: See expanded detail panel with HCA info, ports, error counters

**Step 4: Commit**

```bash
git add src/components/NetworkNodeDetail.tsx
git commit -m "feat(ui): enhance host detail panel with HCA/port info

Host click panel now shows:
- HCA type and firmware version
- Per-port state, rate, LID, GUID
- Error counters with color coding
- Diagnostic command hints

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Link Error Highlighting to InfiniBandMap

Color-code links in the topology based on aggregated port error counts.

**Files:**

- Modify: `src/components/InfiniBandMap.tsx:262-286`

**Step 1: Create helper function for link color calculation**

Add this function near the top of the file (around line 45, after bandwidthLabel):

```typescript
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
```

**Step 2: Add import for DGXNode type**

Update the import at line 11:

```typescript
import type { ClusterConfig, DGXNode } from "@/types/hardware";
```

**Step 3: Modify link drawing to use error-based colors**

Replace lines 262-286 with:

```typescript
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
    const isBackbone = d.source.type === "spine" || d.target.type === "spine";
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
                portSum + port.errors.symbolErrors + port.errors.portRcvErrors,
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
                portSum + port.errors.symbolErrors + port.errors.portRcvErrors,
              0,
            ),
          0,
        );
        tooltip += `\nPort Errors: ${totalErrors}`;
      }
    }
    return tooltip;
  });
```

**Step 4: Update legend to show error colors**

Replace the legend section (lines 540-561) with:

```typescript
<div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-blue-500 rounded" />
    <span className="text-gray-300">Spine</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-purple-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
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
    <div className="w-4 h-0.5 bg-red-500" style={{ borderTop: '2px dashed' }} />
    <span className="text-gray-300">Down</span>
  </div>
</div>
```

**Step 5: Verify the changes**

Run: `npm run dev`
Navigate to Simulator → InfiniBand Fabric tab
Start simulation, observe link colors change as errors accumulate
Hover over links to see error counts in tooltip

**Step 6: Commit**

```bash
git add src/components/InfiniBandMap.tsx
git commit -m "feat(ui): add link error highlighting to InfiniBand map

Links now color-coded by aggregated port error counts:
- Green: 0 errors (healthy)
- Yellow: 1-9 errors (minor)
- Orange: 10-49 errors (moderate)
- Red: 50+ errors or down

Includes updated legend and error count tooltips.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Final Verification and Testing

Perform comprehensive testing of all three features working together.

**Files:**

- None (testing only)

**Step 1: Build verification**

Run: `npm run build`
Expected: No errors

**Step 2: Visual testing checklist**

Run: `npm run dev`
Open browser to the app

Test checklist:

- [ ] Navigate to Simulator → InfiniBand Fabric tab
- [ ] Verify FabricHealthSummary panel shows above topology
- [ ] Health score, link counts, error counts all display
- [ ] Click on a host node → verify expanded panel shows HCA details
- [ ] Verify port error counters are displayed
- [ ] Verify diagnostic command hints appear
- [ ] Start simulation → verify link colors change over time
- [ ] Verify legend shows all color meanings
- [ ] Hover over a link → verify tooltip shows error count
- [ ] Click outside detail panel → verify it closes

**Step 3: Test error scenarios**

If fault injection is wired:

- Inject a link-down fault
- Verify the link turns red and dashed
- Verify fabric health score decreases
- Verify error counts update in summary

**Step 4: Document any issues found**

If issues found, note them for follow-up fixes.

---

## Summary

This plan implements three coordinated improvements to the InfiniBand Fabric tab:

1. **Task 1**: Add error simulation to ports (foundation)
2. **Task 2-3**: FabricHealthSummary component and integration
3. **Task 4**: Enhanced host detail panel with HCA/port info
4. **Task 5**: Link error highlighting in topology
5. **Task 6**: Final verification

Total: 6 tasks with incremental commits
