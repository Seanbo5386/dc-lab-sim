# Enhanced Network Visualizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the NVLink Topology and InfiniBand Fabric tabs into interactive, animated, and training-integrated visualization components that provide realistic data center network simulation.

**Architecture:** Four-phase approach building on existing D3.js components. Phase 1 adds live data flow animations. Phase 2 adds interactive troubleshooting capabilities. Phase 3 improves hardware accuracy. Phase 4 integrates with certification training scenarios. Each phase is independently valuable and builds on previous work.

**Tech Stack:** React, TypeScript, D3.js, Zustand, Vitest, CSS animations

---

## Phase 1: Live Data Flow Visualization

### Task 1.1: Create Data Flow Animation Utilities

**Files:**
- Create: `src/utils/networkFlowAnimation.ts`
- Test: `src/utils/__tests__/networkFlowAnimation.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFlowParticle,
  updateParticlePosition,
  calculatePathPoints,
  generateTrafficIntensity,
  FlowParticle,
} from '../networkFlowAnimation';

describe('networkFlowAnimation', () => {
  describe('createFlowParticle', () => {
    it('should create a particle with correct properties', () => {
      const particle = createFlowParticle({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        speed: 2,
        linkId: 'link-1',
      });

      expect(particle.id).toBeDefined();
      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
      expect(particle.progress).toBe(0);
      expect(particle.linkId).toBe('link-1');
    });
  });

  describe('updateParticlePosition', () => {
    it('should move particle along path', () => {
      const particle: FlowParticle = {
        id: 'p1',
        x: 0,
        y: 0,
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        progress: 0,
        speed: 0.1,
        linkId: 'link-1',
        color: '#76b900',
      };

      const updated = updateParticlePosition(particle);
      expect(updated.progress).toBe(0.1);
      expect(updated.x).toBe(10);
    });

    it('should return null when particle reaches end', () => {
      const particle: FlowParticle = {
        id: 'p1',
        x: 90,
        y: 0,
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        progress: 0.95,
        speed: 0.1,
        linkId: 'link-1',
        color: '#76b900',
      };

      const updated = updateParticlePosition(particle);
      expect(updated).toBeNull();
    });
  });

  describe('calculatePathPoints', () => {
    it('should return array of points along path', () => {
      const points = calculatePathPoints(0, 0, 100, 100, 5);
      expect(points).toHaveLength(5);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[4]).toEqual({ x: 100, y: 100 });
    });
  });

  describe('generateTrafficIntensity', () => {
    it('should return value between 0 and 1 based on utilization', () => {
      expect(generateTrafficIntensity(0)).toBe(0);
      expect(generateTrafficIntensity(100)).toBe(1);
      expect(generateTrafficIntensity(50)).toBe(0.5);
    });

    it('should clamp values to valid range', () => {
      expect(generateTrafficIntensity(-10)).toBe(0);
      expect(generateTrafficIntensity(150)).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/networkFlowAnimation.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
/**
 * Network Flow Animation Utilities
 *
 * Provides utilities for animating data flow particles across network links.
 */

export interface FlowParticle {
  id: string;
  x: number;
  y: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  speed: number;    // progress per frame
  linkId: string;
  color: string;
  size?: number;
}

export interface CreateParticleOptions {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  speed?: number;
  linkId: string;
  color?: string;
  size?: number;
}

let particleCounter = 0;

export function createFlowParticle(options: CreateParticleOptions): FlowParticle {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    speed = 0.02,
    linkId,
    color = '#76b900',
    size = 4,
  } = options;

  return {
    id: `particle-${++particleCounter}`,
    x: sourceX,
    y: sourceY,
    sourceX,
    sourceY,
    targetX,
    targetY,
    progress: 0,
    speed,
    linkId,
    color,
    size,
  };
}

export function updateParticlePosition(particle: FlowParticle): FlowParticle | null {
  const newProgress = particle.progress + particle.speed;

  if (newProgress >= 1) {
    return null; // Particle reached destination
  }

  const x = particle.sourceX + (particle.targetX - particle.sourceX) * newProgress;
  const y = particle.sourceY + (particle.targetY - particle.sourceY) * newProgress;

  return {
    ...particle,
    x,
    y,
    progress: newProgress,
  };
}

export function calculatePathPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  numPoints: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    points.push({
      x: sourceX + (targetX - sourceX) * t,
      y: sourceY + (targetY - sourceY) * t,
    });
  }

  return points;
}

export function generateTrafficIntensity(utilization: number): number {
  return Math.max(0, Math.min(1, utilization / 100));
}

/**
 * Calculate how many particles should be spawned per second based on traffic intensity.
 * Higher utilization = more particles.
 */
export function calculateSpawnRate(intensity: number, baseRate: number = 2): number {
  return Math.floor(baseRate + intensity * 8); // 2-10 particles per second
}

/**
 * Generate a random offset for particles to avoid perfect alignment.
 */
export function generateParticleOffset(maxOffset: number = 3): number {
  return (Math.random() - 0.5) * 2 * maxOffset;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/__tests__/networkFlowAnimation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/networkFlowAnimation.ts src/utils/__tests__/networkFlowAnimation.test.ts
git commit -m "feat: add network flow animation utilities"
```

---

### Task 1.2: Add Animation Hook for D3 Components

**Files:**
- Create: `src/hooks/useNetworkAnimation.ts`
- Test: `src/hooks/__tests__/useNetworkAnimation.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkAnimation } from '../useNetworkAnimation';

describe('useNetworkAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with empty particles array', () => {
    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: false, links: [] })
    );

    expect(result.current.particles).toEqual([]);
  });

  it('should not spawn particles when disabled', () => {
    const links = [
      { id: 'link-1', sourceX: 0, sourceY: 0, targetX: 100, targetY: 0, active: true, utilization: 50 },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: false, links })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.particles).toEqual([]);
  });

  it('should spawn particles when enabled', () => {
    const links = [
      { id: 'link-1', sourceX: 0, sourceY: 0, targetX: 100, targetY: 0, active: true, utilization: 50 },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.particles.length).toBeGreaterThan(0);
  });

  it('should clean up on unmount', () => {
    const links = [
      { id: 'link-1', sourceX: 0, sourceY: 0, targetX: 100, targetY: 0, active: true, utilization: 50 },
    ];

    const { result, unmount } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links })
    );

    unmount();

    // No errors should occur after unmount
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useNetworkAnimation.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
/**
 * Network Animation Hook
 *
 * Manages animated particle flow for network topology visualizations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlowParticle,
  createFlowParticle,
  updateParticlePosition,
  generateTrafficIntensity,
  calculateSpawnRate,
  generateParticleOffset,
} from '@/utils/networkFlowAnimation';

export interface AnimationLink {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  active: boolean;
  utilization: number;
  bidirectional?: boolean;
}

export interface UseNetworkAnimationOptions {
  enabled: boolean;
  links: AnimationLink[];
  frameRate?: number;
  maxParticles?: number;
}

export interface UseNetworkAnimationReturn {
  particles: FlowParticle[];
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useNetworkAnimation({
  enabled,
  links,
  frameRate = 60,
  maxParticles = 100,
}: UseNetworkAnimationOptions): UseNetworkAnimationReturn {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const mountedRef = useRef(true);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const reset = useCallback(() => {
    setParticles([]);
    lastSpawnTimeRef.current.clear();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / frameRate;
    let lastFrameTime = performance.now();

    const animate = (currentTime: number) => {
      if (!mountedRef.current) return;

      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime >= frameInterval) {
        lastFrameTime = currentTime;

        setParticles((prevParticles) => {
          // Update existing particles
          const updated = prevParticles
            .map(updateParticlePosition)
            .filter((p): p is FlowParticle => p !== null);

          // Spawn new particles for active links
          const activeLinks = links.filter((l) => l.active && l.utilization > 0);
          const newParticles: FlowParticle[] = [];

          activeLinks.forEach((link) => {
            const intensity = generateTrafficIntensity(link.utilization);
            const spawnRate = calculateSpawnRate(intensity);
            const spawnInterval = 1000 / spawnRate;

            const lastSpawn = lastSpawnTimeRef.current.get(link.id) || 0;
            if (currentTime - lastSpawn >= spawnInterval) {
              if (updated.length + newParticles.length < maxParticles) {
                const offset = generateParticleOffset();

                // Forward direction
                newParticles.push(
                  createFlowParticle({
                    sourceX: link.sourceX + offset,
                    sourceY: link.sourceY + offset,
                    targetX: link.targetX + offset,
                    targetY: link.targetY + offset,
                    speed: 0.015 + intensity * 0.01,
                    linkId: link.id,
                    color: '#76b900',
                  })
                );

                // Reverse direction for bidirectional links
                if (link.bidirectional !== false) {
                  newParticles.push(
                    createFlowParticle({
                      sourceX: link.targetX - offset,
                      sourceY: link.targetY - offset,
                      targetX: link.sourceX - offset,
                      targetY: link.sourceY - offset,
                      speed: 0.015 + intensity * 0.01,
                      linkId: link.id,
                      color: '#3b82f6',
                    })
                  );
                }

                lastSpawnTimeRef.current.set(link.id, currentTime);
              }
            }
          });

          return [...updated, ...newParticles];
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [enabled, isPaused, links, frameRate, maxParticles]);

  return {
    particles,
    isPaused,
    pause,
    resume,
    reset,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useNetworkAnimation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useNetworkAnimation.ts src/hooks/__tests__/useNetworkAnimation.test.ts
git commit -m "feat: add useNetworkAnimation hook for particle flow"
```

---

### Task 1.3: Integrate Animation into TopologyGraph

**Files:**
- Modify: `src/components/TopologyGraph.tsx`

**Step 1: Read current TopologyGraph implementation**

Review `src/components/TopologyGraph.tsx` to understand the current D3.js structure.

**Step 2: Add imports and animation hook**

At the top of the file, add:

```typescript
import { useNetworkAnimation, AnimationLink } from '@/hooks/useNetworkAnimation';
import { useSimulationStore } from '@/store/simulationStore';
```

**Step 3: Modify the component to include animation**

Replace the component body with:

```typescript
export const TopologyGraph: React.FC<TopologyGraphProps> = ({ node }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const particleGroupRef = useRef<SVGGElement | null>(null);
  const isRunning = useSimulationStore((state) => state.isRunning);

  // Calculate animation links from GPU NVLink connections
  const animationLinks: AnimationLink[] = useMemo(() => {
    const links: AnimationLink[] = [];
    const nodePositions = node.gpus.map((gpu, idx) => ({
      id: gpu.id,
      x: (idx % 4) * 180 + 120,
      y: Math.floor(idx / 4) * 250 + 120,
    }));

    for (let i = 0; i < node.gpus.length; i++) {
      for (let j = i + 1; j < node.gpus.length; j++) {
        const shouldConnect =
          Math.floor(i / 4) === Math.floor(j / 4) || j === i + 1 || j === i + 4;
        if (shouldConnect && node.gpus[i].nvlinks.length > 0) {
          const link = node.gpus[i].nvlinks[Math.min(i, node.gpus[i].nvlinks.length - 1)];
          const avgUtil = (node.gpus[i].utilization + node.gpus[j].utilization) / 2;

          links.push({
            id: `nvlink-${i}-${j}`,
            sourceX: nodePositions[i].x,
            sourceY: nodePositions[i].y,
            targetX: nodePositions[j].x,
            targetY: nodePositions[j].y,
            active: link.status === 'Active',
            utilization: avgUtil,
            bidirectional: true,
          });
        }
      }
    }

    return links;
  }, [node]);

  const { particles } = useNetworkAnimation({
    enabled: isRunning,
    links: animationLinks,
  });

  // D3 static render effect (existing code, modified)
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 500;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // ... rest of existing D3 code for nodes and links ...

    // Add particle container group at the end
    particleGroupRef.current = svg.append('g').attr('class', 'particles').node();
  }, [node]);

  // Particle animation render effect
  useEffect(() => {
    if (!particleGroupRef.current) return;

    const group = d3.select(particleGroupRef.current);

    // Data join for particles
    const particleSelection = group
      .selectAll<SVGCircleElement, typeof particles[0]>('circle')
      .data(particles, (d) => d.id);

    // Enter new particles
    particleSelection
      .enter()
      .append('circle')
      .attr('r', (d) => d.size || 4)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.8)
      .merge(particleSelection)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);

    // Remove old particles
    particleSelection.exit().remove();
  }, [particles]);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* ... existing header ... */}

      <svg ref={svgRef} className="w-full bg-gray-900 rounded-lg" />

      {/* Animation status indicator */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
        />
        {isRunning ? 'Live data flow' : 'Paused'}
        {isRunning && <span>({particles.length} active flows)</span>}
      </div>

      {/* ... existing legend ... */}
    </div>
  );
};
```

**Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

**Step 5: Test visually**

```bash
npm run dev
```

Navigate to Simulator → NVLink Topology tab. Start simulation. Verify particles animate along links.

**Step 6: Commit**

```bash
git add src/components/TopologyGraph.tsx
git commit -m "feat: add live data flow animation to NVLink topology"
```

---

### Task 1.4: Integrate Animation into InfiniBandMap

**Files:**
- Modify: `src/components/InfiniBandMap.tsx`

**Step 1: Add imports and animation hook**

Same pattern as TopologyGraph:

```typescript
import { useNetworkAnimation, AnimationLink } from '@/hooks/useNetworkAnimation';
import { useSimulationStore } from '@/store/simulationStore';
import { useMemo } from 'react';
```

**Step 2: Calculate animation links from fabric topology**

Add before the D3 useEffect:

```typescript
const isRunning = useSimulationStore((state) => state.isRunning);

const animationLinks: AnimationLink[] = useMemo(() => {
  const links: AnimationLink[] = [];
  const width = 1000;

  // Spine positions
  const spineCount = 2;
  const spineNodes = Array.from({ length: spineCount }, (_, i) => ({
    id: `spine-${i}`,
    x: (width / (spineCount + 1)) * (i + 1),
    y: 80,
  }));

  // Leaf positions
  const leafCount = Math.min(cluster.nodes.length, 4);
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
    active: node.hcas.some((hca) => hca.ports.some((p) => p.state === 'Active')),
    utilization: node.gpus.reduce((sum, g) => sum + g.utilization, 0) / node.gpus.length,
  }));

  // Spine to Leaf links
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
    const leafIdx = Math.floor(idx / Math.ceil(hostNodes.length / leafNodes.length));
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
}, [cluster]);

const { particles } = useNetworkAnimation({
  enabled: isRunning,
  links: animationLinks,
});
```

**Step 3: Add particle rendering (same pattern as TopologyGraph)**

**Step 4: Run and verify**

```bash
npm run dev
```

**Step 5: Commit**

```bash
git add src/components/InfiniBandMap.tsx
git commit -m "feat: add live data flow animation to InfiniBand fabric"
```

---

## Phase 2: Interactive Troubleshooting

### Task 2.1: Create Network Node Detail Panel

**Files:**
- Create: `src/components/NetworkNodeDetail.tsx`
- Test: `src/components/__tests__/NetworkNodeDetail.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkNodeDetail } from '../NetworkNodeDetail';

describe('NetworkNodeDetail', () => {
  const mockGpuNode = {
    type: 'gpu' as const,
    id: 'GPU0',
    name: 'NVIDIA H100',
    health: 'OK' as const,
    temperature: 65,
    utilization: 85,
    memoryUsed: 70000,
    memoryTotal: 81920,
    nvlinks: [
      { linkId: 0, status: 'Active' as const, speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
      { linkId: 1, status: 'Down' as const, speed: 0, txErrors: 5, rxErrors: 3, replayErrors: 1 },
    ],
  };

  it('should render GPU details', () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    expect(screen.getByText('GPU0')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA H100')).toBeInTheDocument();
    expect(screen.getByText('65°C')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should show NVLink status table', () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    expect(screen.getByText('NVLink Connections')).toBeInTheDocument();
    expect(screen.getByText('Link 0')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
  });

  it('should highlight errors', () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    // Link 1 has errors
    const errorCell = screen.getByText('5');
    expect(errorCell).toHaveClass('text-red-500');
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<NetworkNodeDetail node={mockGpuNode} onClose={onClose} />);

    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/NetworkNodeDetail.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```typescript
/**
 * Network Node Detail Panel
 *
 * Displays detailed information about a selected network node (GPU, switch, or host).
 */

import React from 'react';
import { X, Thermometer, Activity, HardDrive, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { GPU, InfiniBandHCA, HealthStatus, NVLinkConnection } from '@/types/hardware';

export type NetworkNodeType =
  | { type: 'gpu'; data: GPU }
  | { type: 'switch'; data: { id: string; type: 'spine' | 'leaf'; status: 'active' | 'down' } }
  | { type: 'host'; data: { id: string; hostname: string; hcas: InfiniBandHCA[]; gpuCount: number } };

interface NetworkNodeDetailProps {
  node: NetworkNodeType;
  onClose: () => void;
  onInjectFault?: (faultType: string) => void;
}

const HealthBadge: React.FC<{ status: HealthStatus | 'active' | 'down' }> = ({ status }) => {
  const config = {
    OK: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Healthy' },
    active: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Active' },
    Warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Warning' },
    Critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Critical' },
    down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Down' },
    Unknown: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-500/20', label: 'Unknown' },
  };

  const { icon: Icon, color, bg, label } = config[status] || config.Unknown;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const NVLinkTable: React.FC<{ links: NVLinkConnection[] }> = ({ links }) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-gray-300 mb-2">NVLink Connections</h4>
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-700">
          <th className="py-1 text-left">Link</th>
          <th className="py-1 text-left">Status</th>
          <th className="py-1 text-right">Speed</th>
          <th className="py-1 text-right">TX Err</th>
          <th className="py-1 text-right">RX Err</th>
          <th className="py-1 text-right">Replay</th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr key={link.linkId} className="border-b border-gray-800">
            <td className="py-1">Link {link.linkId}</td>
            <td className="py-1">
              <span className={link.status === 'Active' ? 'text-green-500' : 'text-red-500'}>
                {link.status}
              </span>
            </td>
            <td className="py-1 text-right">{link.speed} GB/s</td>
            <td className={`py-1 text-right ${link.txErrors > 0 ? 'text-red-500' : ''}`}>
              {link.txErrors}
            </td>
            <td className={`py-1 text-right ${link.rxErrors > 0 ? 'text-red-500' : ''}`}>
              {link.rxErrors}
            </td>
            <td className={`py-1 text-right ${link.replayErrors > 0 ? 'text-red-500' : ''}`}>
              {link.replayErrors}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const NetworkNodeDetail: React.FC<NetworkNodeDetailProps> = ({
  node,
  onClose,
  onInjectFault,
}) => {
  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-nvidia-green">
          {node.type === 'gpu' && `GPU ${node.data.id}`}
          {node.type === 'switch' && `${node.data.type === 'spine' ? 'Spine' : 'Leaf'} Switch`}
          {node.type === 'host' && node.data.hostname}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        {node.type === 'gpu' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">{node.data.name}</span>
              <HealthBadge status={node.data.healthStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">{node.data.temperature}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-gray-400">Utilization</div>
                  <div className="text-white font-medium">{Math.round(node.data.utilization)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <HardDrive className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-gray-400">Memory</div>
                  <div className="text-white font-medium">
                    {(node.data.memoryUsed / 1024).toFixed(1)} / {(node.data.memoryTotal / 1024).toFixed(1)} GB
                  </div>
                </div>
              </div>
            </div>

            <NVLinkTable links={node.data.nvlinks} />
          </>
        )}

        {node.type === 'switch' && (
          <div className="text-center py-4">
            <HealthBadge status={node.data.status} />
            <p className="text-gray-400 text-xs mt-2">
              {node.data.type === 'spine' ? 'Core switch in fabric backbone' : 'Aggregation switch'}
            </p>
          </div>
        )}

        {node.type === 'host' && (
          <>
            <div className="mb-3">
              <HealthBadge status={node.data.hcas.some(h => h.ports.some(p => p.state === 'Active')) ? 'active' : 'down'} />
            </div>
            <div className="text-xs text-gray-400">
              <div>{node.data.gpuCount} GPUs</div>
              <div>{node.data.hcas.length} HCA(s)</div>
            </div>
          </>
        )}

        {/* Fault injection buttons for training scenarios */}
        {onInjectFault && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Training: Inject Fault</div>
            <div className="flex gap-2 flex-wrap">
              {node.type === 'gpu' && (
                <>
                  <button
                    onClick={() => onInjectFault('nvlink-down')}
                    className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                  >
                    NVLink Fail
                  </button>
                  <button
                    onClick={() => onInjectFault('thermal')}
                    className="px-2 py-1 text-xs bg-orange-900/50 text-orange-400 rounded hover:bg-orange-900"
                  >
                    Overheat
                  </button>
                  <button
                    onClick={() => onInjectFault('xid-error')}
                    className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-400 rounded hover:bg-yellow-900"
                  >
                    XID Error
                  </button>
                </>
              )}
              {(node.type === 'switch' || node.type === 'host') && (
                <button
                  onClick={() => onInjectFault('link-down')}
                  className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                >
                  Link Down
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/NetworkNodeDetail.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/NetworkNodeDetail.tsx src/components/__tests__/NetworkNodeDetail.test.tsx
git commit -m "feat: add NetworkNodeDetail panel for interactive troubleshooting"
```

---

### Task 2.2: Add Click Handlers to TopologyGraph

**Files:**
- Modify: `src/components/TopologyGraph.tsx`

**Step 1: Add state for selected node**

```typescript
const [selectedNode, setSelectedNode] = useState<NetworkNodeType | null>(null);
```

**Step 2: Add click handlers to D3 node groups**

In the D3 useEffect, after creating nodeGroups, add:

```typescript
nodeGroups.on('click', function (event, d) {
  event.stopPropagation();
  const gpu = node.gpus.find((g) => g.id === d.id);
  if (gpu) {
    setSelectedNode({ type: 'gpu', data: gpu });
  }
});

// Click on background to deselect
svg.on('click', () => setSelectedNode(null));
```

**Step 3: Render NetworkNodeDetail when selected**

```typescript
{selectedNode && (
  <NetworkNodeDetail
    node={selectedNode}
    onClose={() => setSelectedNode(null)}
    onInjectFault={(faultType) => {
      console.log('Inject fault:', faultType, 'on', selectedNode);
      // TODO: Wire to simulation store
    }}
  />
)}
```

**Step 4: Run and verify**

**Step 5: Commit**

```bash
git add src/components/TopologyGraph.tsx
git commit -m "feat: add click-to-inspect for NVLink topology nodes"
```

---

### Task 2.3: Add Click Handlers to InfiniBandMap

**Files:**
- Modify: `src/components/InfiniBandMap.tsx`

Same pattern as TopologyGraph.

**Step 1-5:** Follow same steps as Task 2.2

**Commit:**

```bash
git add src/components/InfiniBandMap.tsx
git commit -m "feat: add click-to-inspect for InfiniBand fabric nodes"
```

---

## Phase 3: Realistic Hardware Representation

### Task 3.1: Create DGX System Layout Data

**Files:**
- Create: `src/data/dgxLayouts.ts`

**Step 1: Write layout data for DGX systems**

```typescript
/**
 * DGX System GPU Layout Data
 *
 * Accurate physical and NVLink topology for different DGX systems.
 */

export interface GPULayoutPosition {
  gpuIndex: number;
  x: number;      // Relative X position (0-1)
  y: number;      // Relative Y position (0-1)
  nvSwitchGroup: number; // Which NVSwitch group this GPU connects to
}

export interface NVSwitchPosition {
  id: number;
  x: number;
  y: number;
  connectedGPUs: number[];
}

export interface DGXLayout {
  systemType: string;
  gpuCount: number;
  nvSwitchCount: number;
  gpuPositions: GPULayoutPosition[];
  nvSwitchPositions: NVSwitchPosition[];
  nvLinkConnections: Array<{ from: number; to: number; nvSwitchId?: number }>;
}

export const DGX_A100_LAYOUT: DGXLayout = {
  systemType: 'DGX-A100',
  gpuCount: 8,
  nvSwitchCount: 6,
  gpuPositions: [
    // Top row (GPUs 0-3)
    { gpuIndex: 0, x: 0.15, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.38, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.62, y: 0.25, nvSwitchGroup: 1 },
    { gpuIndex: 3, x: 0.85, y: 0.25, nvSwitchGroup: 1 },
    // Bottom row (GPUs 4-7)
    { gpuIndex: 4, x: 0.15, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 5, x: 0.38, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.62, y: 0.75, nvSwitchGroup: 1 },
    { gpuIndex: 7, x: 0.85, y: 0.75, nvSwitchGroup: 1 },
  ],
  nvSwitchPositions: [
    // Left NVSwitch group (0-2)
    { id: 0, x: 0.26, y: 0.4, connectedGPUs: [0, 1, 4, 5] },
    { id: 1, x: 0.26, y: 0.5, connectedGPUs: [0, 1, 4, 5] },
    { id: 2, x: 0.26, y: 0.6, connectedGPUs: [0, 1, 4, 5] },
    // Right NVSwitch group (3-5)
    { id: 3, x: 0.74, y: 0.4, connectedGPUs: [2, 3, 6, 7] },
    { id: 4, x: 0.74, y: 0.5, connectedGPUs: [2, 3, 6, 7] },
    { id: 5, x: 0.74, y: 0.6, connectedGPUs: [2, 3, 6, 7] },
  ],
  nvLinkConnections: [
    // Within left group (full mesh via NVSwitch)
    { from: 0, to: 1, nvSwitchId: 0 },
    { from: 0, to: 4, nvSwitchId: 1 },
    { from: 0, to: 5, nvSwitchId: 2 },
    { from: 1, to: 4, nvSwitchId: 0 },
    { from: 1, to: 5, nvSwitchId: 1 },
    { from: 4, to: 5, nvSwitchId: 2 },
    // Within right group
    { from: 2, to: 3, nvSwitchId: 3 },
    { from: 2, to: 6, nvSwitchId: 4 },
    { from: 2, to: 7, nvSwitchId: 5 },
    { from: 3, to: 6, nvSwitchId: 3 },
    { from: 3, to: 7, nvSwitchId: 4 },
    { from: 6, to: 7, nvSwitchId: 5 },
    // Cross-group connections (GPU-to-GPU NVLink)
    { from: 1, to: 2 },
    { from: 5, to: 6 },
  ],
};

export const DGX_H100_LAYOUT: DGXLayout = {
  systemType: 'DGX-H100',
  gpuCount: 8,
  nvSwitchCount: 4,
  gpuPositions: [
    // Circular arrangement
    { gpuIndex: 0, x: 0.5, y: 0.1, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.85, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.95, y: 0.5, nvSwitchGroup: 1 },
    { gpuIndex: 3, x: 0.85, y: 0.75, nvSwitchGroup: 1 },
    { gpuIndex: 4, x: 0.5, y: 0.9, nvSwitchGroup: 1 },
    { gpuIndex: 5, x: 0.15, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.05, y: 0.5, nvSwitchGroup: 0 },
    { gpuIndex: 7, x: 0.15, y: 0.25, nvSwitchGroup: 0 },
  ],
  nvSwitchPositions: [
    { id: 0, x: 0.35, y: 0.35, connectedGPUs: [0, 1, 6, 7] },
    { id: 1, x: 0.65, y: 0.35, connectedGPUs: [0, 1, 2, 3] },
    { id: 2, x: 0.65, y: 0.65, connectedGPUs: [2, 3, 4, 5] },
    { id: 3, x: 0.35, y: 0.65, connectedGPUs: [4, 5, 6, 7] },
  ],
  nvLinkConnections: [
    // Full mesh through NVSwitch (all-to-all)
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 },
    { from: 0, to: 5 }, { from: 0, to: 6 }, { from: 0, to: 7 },
    { from: 1, to: 2 }, { from: 1, to: 3 }, { from: 1, to: 4 },
    { from: 1, to: 5 }, { from: 1, to: 6 }, { from: 1, to: 7 },
    { from: 2, to: 3 }, { from: 2, to: 4 }, { from: 2, to: 5 },
    { from: 2, to: 6 }, { from: 2, to: 7 },
    { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 3, to: 6 }, { from: 3, to: 7 },
    { from: 4, to: 5 }, { from: 4, to: 6 }, { from: 4, to: 7 },
    { from: 5, to: 6 }, { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

export function getLayoutForSystem(systemType: string): DGXLayout {
  switch (systemType) {
    case 'DGX-H100':
    case 'DGX-H200':
      return DGX_H100_LAYOUT;
    case 'DGX-A100':
    default:
      return DGX_A100_LAYOUT;
  }
}
```

**Step 2: Commit**

```bash
git add src/data/dgxLayouts.ts
git commit -m "feat: add accurate DGX system layout data"
```

---

### Task 3.2: Update TopologyGraph to Use Accurate Layouts

**Files:**
- Modify: `src/components/TopologyGraph.tsx`

**Step 1: Import layout data**

```typescript
import { getLayoutForSystem } from '@/data/dgxLayouts';
```

**Step 2: Use layout positions instead of fixed grid**

Replace the hardcoded grid positions with layout-driven positions:

```typescript
const layout = getLayoutForSystem(node.systemType);

const nodes: GraphNode[] = node.gpus.map((gpu, idx) => {
  const pos = layout.gpuPositions[idx] || { x: 0.5, y: 0.5 };
  return {
    id: gpu.id,
    name: `GPU ${idx}`,
    health: gpu.healthStatus,
    utilization: gpu.utilization,
    temperature: gpu.temperature,
    x: pos.x * width,
    y: pos.y * height,
  };
});

// Add NVSwitch nodes
const nvSwitchNodes = layout.nvSwitchPositions.map((sw) => ({
  id: `nvsw-${sw.id}`,
  name: `NVSwitch ${sw.id}`,
  type: 'nvswitch' as const,
  x: sw.x * width,
  y: sw.y * height,
}));
```

**Step 3: Draw NVSwitch nodes with different styling**

```typescript
// NVSwitch rectangles
const nvSwitchGroup = svg.append('g').attr('class', 'nvswitches');

nvSwitchGroup
  .selectAll('rect')
  .data(nvSwitchNodes)
  .enter()
  .append('rect')
  .attr('x', (d) => d.x - 20)
  .attr('y', (d) => d.y - 10)
  .attr('width', 40)
  .attr('height', 20)
  .attr('fill', '#3b82f6')
  .attr('stroke', '#1e40af')
  .attr('stroke-width', 2)
  .attr('rx', 3);

nvSwitchGroup
  .selectAll('text')
  .data(nvSwitchNodes)
  .enter()
  .append('text')
  .attr('x', (d) => d.x)
  .attr('y', (d) => d.y + 4)
  .attr('text-anchor', 'middle')
  .attr('fill', '#fff')
  .attr('font-size', '9px')
  .text((d) => `SW${d.id.toString().replace('nvsw-', '')}`);
```

**Step 4: Run and verify visually**

**Step 5: Commit**

```bash
git add src/components/TopologyGraph.tsx
git commit -m "feat: use accurate DGX layouts in NVLink topology"
```

---

### Task 3.3: Add Fat-Tree Tier Configuration

**Files:**
- Modify: `src/components/InfiniBandMap.tsx`

**Step 1: Make fabric topology configurable**

Add props for spine/leaf counts:

```typescript
interface InfiniBandMapProps {
  cluster: ClusterConfig;
  spineCount?: number;
  leafCount?: number;
  showBandwidth?: boolean;
}

const {
  cluster,
  spineCount = 2,
  leafCount = Math.min(cluster.nodes.length, 4),
  showBandwidth = true,
} = props;
```

**Step 2: Add bandwidth indicators on links**

```typescript
// Draw bandwidth labels on links
if (showBandwidth) {
  linkGroup
    .selectAll('text')
    .data(links)
    .enter()
    .append('text')
    .attr('x', (d) => (d.source.x + d.target.x) / 2)
    .attr('y', (d) => (d.source.y + d.target.y) / 2 - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#9ca3af')
    .attr('font-size', '8px')
    .text((d) => d.speed);
}
```

**Step 3: Commit**

```bash
git add src/components/InfiniBandMap.tsx
git commit -m "feat: add configurable fat-tree topology and bandwidth labels"
```

---

## Phase 4: Visual-Scenario Integration

> **Note:** This phase connects the network visualizations to the existing 53 lab scenarios in `src/data/scenarios/`. It does NOT create duplicate training content. Instead, it provides visual context when users are working through existing labs.

### Task 4.1: Create Scenario-to-Visualization Mapping

**Files:**
- Create: `src/utils/scenarioVisualizationMap.ts`
- Test: `src/utils/__tests__/scenarioVisualizationMap.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  getVisualizationContext,
  getRelatedScenarios,
  extractHighlightTargets,
  VisualizationContext,
} from '../scenarioVisualizationMap';

describe('scenarioVisualizationMap', () => {
  describe('getVisualizationContext', () => {
    it('should return nvlink context for NVLink scenarios', () => {
      const context = getVisualizationContext('domain2-nvlink-topo');
      expect(context).not.toBeNull();
      expect(context?.visualizationType).toBe('nvlink');
      expect(context?.relevantTab).toBe('topology');
    });

    it('should return infiniband context for IB scenarios', () => {
      const context = getVisualizationContext('domain4-ib-stress');
      expect(context).not.toBeNull();
      expect(context?.visualizationType).toBe('infiniband');
      expect(context?.relevantTab).toBe('network');
    });

    it('should return null for scenarios without visualization', () => {
      const context = getVisualizationContext('domain3-slurm-config');
      expect(context).toBeNull();
    });
  });

  describe('getRelatedScenarios', () => {
    it('should return NVLink scenarios for topology tab', () => {
      const scenarios = getRelatedScenarios('topology');
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.every(s => s.id.includes('nvlink') || s.tags?.includes('nvlink'))).toBe(true);
    });

    it('should return InfiniBand scenarios for network tab', () => {
      const scenarios = getRelatedScenarios('network');
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.every(s => s.id.includes('ib') || s.tags?.includes('infiniband'))).toBe(true);
    });
  });

  describe('extractHighlightTargets', () => {
    it('should extract GPU indices from scenario step', () => {
      const step = {
        description: 'Check GPU 2 and GPU 3 for NVLink errors',
        expectedCommands: ['nvidia-smi nvlink -e -i 2', 'nvidia-smi nvlink -e -i 3'],
      };
      const targets = extractHighlightTargets(step);
      expect(targets.gpuIndices).toContain(2);
      expect(targets.gpuIndices).toContain(3);
    });

    it('should extract link references from commands', () => {
      const step = {
        description: 'Check link status',
        expectedCommands: ['nvidia-smi nvlink --status -i 0'],
      };
      const targets = extractHighlightTargets(step);
      expect(targets.gpuIndices).toContain(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/scenarioVisualizationMap.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
/**
 * Scenario-to-Visualization Mapping
 *
 * Maps existing lab scenarios to visualization contexts,
 * enabling visual highlighting when users work through labs.
 */

import type { Scenario, ScenarioStep } from '@/types/scenarios';

export type VisualizationType = 'nvlink' | 'infiniband' | 'gpu-overview';
export type DashboardTab = 'overview' | 'metrics' | 'topology' | 'network';

export interface VisualizationContext {
  scenarioId: string;
  visualizationType: VisualizationType;
  relevantTab: DashboardTab;
  defaultHighlights?: {
    gpuIndices?: number[];
    linkIds?: string[];
    nodeIds?: string[];
  };
}

/**
 * Scenarios that have relevant network visualizations.
 * Maps scenario IDs to their visualization context.
 */
const SCENARIO_VISUALIZATION_MAP: Record<string, Omit<VisualizationContext, 'scenarioId'>> = {
  // Domain 2: NVLink scenarios
  'domain2-nvlink-topo': {
    visualizationType: 'nvlink',
    relevantTab: 'topology',
  },
  'domain2-nvlink-recovery': {
    visualizationType: 'nvlink',
    relevantTab: 'topology',
    defaultHighlights: { gpuIndices: [2] }, // Scenario injects fault on GPU 2
  },
  'domain2-advanced-mig': {
    visualizationType: 'gpu-overview',
    relevantTab: 'overview',
  },

  // Domain 4: Bandwidth and fabric scenarios
  'domain4-gpu-bandwidth': {
    visualizationType: 'nvlink',
    relevantTab: 'topology',
  },
  'domain4-ib-stress': {
    visualizationType: 'infiniband',
    relevantTab: 'network',
  },
  'domain4-nccl-test': {
    visualizationType: 'nvlink',
    relevantTab: 'topology',
  },
  'domain4-nccl-multinode': {
    visualizationType: 'infiniband',
    relevantTab: 'network',
  },

  // Domain 5: Troubleshooting scenarios
  'domain5-xid-nvlink': {
    visualizationType: 'nvlink',
    relevantTab: 'topology',
  },
  'domain5-ib-partitioning': {
    visualizationType: 'infiniband',
    relevantTab: 'network',
  },
  'domain5-pcie-diagnosis': {
    visualizationType: 'gpu-overview',
    relevantTab: 'overview',
  },
};

/**
 * Get visualization context for a scenario.
 * Returns null if the scenario doesn't have a relevant visualization.
 */
export function getVisualizationContext(scenarioId: string): VisualizationContext | null {
  const mapping = SCENARIO_VISUALIZATION_MAP[scenarioId];
  if (!mapping) return null;

  return {
    scenarioId,
    ...mapping,
  };
}

/**
 * Get all scenarios that are relevant to a dashboard tab.
 */
export function getRelatedScenarios(tab: DashboardTab): Array<{ id: string; title: string; tags?: string[] }> {
  const related: Array<{ id: string; title: string; tags?: string[] }> = [];

  for (const [scenarioId, context] of Object.entries(SCENARIO_VISUALIZATION_MAP)) {
    if (context.relevantTab === tab) {
      related.push({
        id: scenarioId,
        title: scenarioId.replace(/-/g, ' ').replace(/domain\d+/, '').trim(),
        tags: context.visualizationType === 'nvlink' ? ['nvlink'] : ['infiniband'],
      });
    }
  }

  return related;
}

/**
 * Extract GPU indices and link IDs to highlight from a scenario step.
 * Parses expected commands and descriptions to find references.
 */
export function extractHighlightTargets(step: Partial<ScenarioStep>): {
  gpuIndices: number[];
  linkIds: string[];
  nodeIds: string[];
} {
  const gpuIndices: Set<number> = new Set();
  const linkIds: Set<string> = new Set();
  const nodeIds: Set<string> = new Set();

  // Patterns to match GPU references
  const gpuPatterns = [
    /-i\s*(\d+)/g,           // nvidia-smi -i 0
    /GPU\s*(\d+)/gi,         // "GPU 0" or "GPU0"
    /-g\s*(\d+)/g,           // nvidia-smi nvlink -g 0
    /gpu(\d+)/gi,            // gpu0, gpu1
  ];

  // Combine all text to search
  const searchText = [
    step.description || '',
    ...(step.expectedCommands || []),
  ].join(' ');

  // Extract GPU indices
  for (const pattern of gpuPatterns) {
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      const idx = parseInt(match[1], 10);
      if (!isNaN(idx) && idx >= 0 && idx < 8) {
        gpuIndices.add(idx);
      }
    }
  }

  // Extract node IDs (dgx-XX patterns)
  const nodePattern = /dgx-(\d+)/gi;
  let nodeMatch;
  while ((nodeMatch = nodePattern.exec(searchText)) !== null) {
    nodeIds.add(`dgx-${nodeMatch[1].padStart(2, '0')}`);
  }

  return {
    gpuIndices: Array.from(gpuIndices),
    linkIds: Array.from(linkIds),
    nodeIds: Array.from(nodeIds),
  };
}

/**
 * Check if a scenario has any visualization integration.
 */
export function hasVisualization(scenarioId: string): boolean {
  return scenarioId in SCENARIO_VISUALIZATION_MAP;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/__tests__/scenarioVisualizationMap.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/scenarioVisualizationMap.ts src/utils/__tests__/scenarioVisualizationMap.test.ts
git commit -m "feat: add scenario-to-visualization mapping utility"
```

---

### Task 4.2: Create Visual Context Panel Component

**Files:**
- Create: `src/components/VisualContextPanel.tsx`
- Test: `src/components/__tests__/VisualContextPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualContextPanel } from '../VisualContextPanel';

describe('VisualContextPanel', () => {
  const mockScenarios = [
    { id: 'domain2-nvlink-topo', title: 'NVLink Topology Verification' },
    { id: 'domain2-nvlink-recovery', title: 'NVLink Error Detection and Recovery' },
  ];

  it('should show related scenarios for current tab', () => {
    render(
      <VisualContextPanel
        currentTab="topology"
        relatedScenarios={mockScenarios}
        onLaunchScenario={() => {}}
      />
    );

    expect(screen.getByText('Related Labs')).toBeInTheDocument();
    expect(screen.getByText('NVLink Topology Verification')).toBeInTheDocument();
    expect(screen.getByText('NVLink Error Detection and Recovery')).toBeInTheDocument();
  });

  it('should call onLaunchScenario when lab is clicked', () => {
    const onLaunch = vi.fn();
    render(
      <VisualContextPanel
        currentTab="topology"
        relatedScenarios={mockScenarios}
        onLaunchScenario={onLaunch}
      />
    );

    fireEvent.click(screen.getByText('NVLink Topology Verification'));
    expect(onLaunch).toHaveBeenCalledWith('domain2-nvlink-topo');
  });

  it('should show active scenario step info when provided', () => {
    render(
      <VisualContextPanel
        currentTab="topology"
        relatedScenarios={mockScenarios}
        onLaunchScenario={() => {}}
        activeScenario={{
          id: 'domain2-nvlink-topo',
          title: 'NVLink Topology Verification',
          currentStep: 2,
          totalSteps: 6,
          stepTitle: 'Display NVLink Topology Matrix',
        }}
      />
    );

    expect(screen.getByText('Active Lab')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Display NVLink Topology Matrix')).toBeInTheDocument();
  });

  it('should be collapsible', () => {
    render(
      <VisualContextPanel
        currentTab="topology"
        relatedScenarios={mockScenarios}
        onLaunchScenario={() => {}}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(toggleButton);

    expect(screen.queryByText('NVLink Topology Verification')).not.toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/VisualContextPanel.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```typescript
/**
 * Visual Context Panel
 *
 * Shows related lab scenarios for the current visualization tab.
 * When a user is in a lab, shows current step and highlights relevant elements.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Play, Target, ExternalLink } from 'lucide-react';

interface RelatedScenario {
  id: string;
  title: string;
  difficulty?: string;
  estimatedTime?: number;
}

interface ActiveScenarioInfo {
  id: string;
  title: string;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  highlightGpus?: number[];
  highlightLinks?: string[];
}

interface VisualContextPanelProps {
  currentTab: 'overview' | 'metrics' | 'topology' | 'network';
  relatedScenarios: RelatedScenario[];
  onLaunchScenario: (scenarioId: string) => void;
  activeScenario?: ActiveScenarioInfo | null;
  onViewInTerminal?: () => void;
}

export const VisualContextPanel: React.FC<VisualContextPanelProps> = ({
  currentTab,
  relatedScenarios,
  onLaunchScenario,
  activeScenario,
  onViewInTerminal,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const tabLabels: Record<string, string> = {
    overview: 'GPU Overview',
    metrics: 'Historical Metrics',
    topology: 'NVLink Topology',
    network: 'InfiniBand Fabric',
  };

  return (
    <div className="bg-gray-800/90 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors"
        aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-nvidia-green" />
          <span className="text-sm font-medium text-gray-200">
            {activeScenario ? 'Active Lab' : 'Related Labs'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Active Scenario Info */}
          {activeScenario && (
            <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-nvidia-green font-medium">
                  Step {activeScenario.currentStep} of {activeScenario.totalSteps}
                </span>
                {onViewInTerminal && (
                  <button
                    onClick={onViewInTerminal}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Terminal
                  </button>
                )}
              </div>
              <h4 className="text-sm font-medium text-white mb-1">
                {activeScenario.stepTitle}
              </h4>
              <p className="text-xs text-gray-400">
                {activeScenario.title}
              </p>

              {/* Highlight indicators */}
              {(activeScenario.highlightGpus?.length || activeScenario.highlightLinks?.length) && (
                <div className="mt-2 flex items-center gap-2">
                  <Target className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-500">
                    {activeScenario.highlightGpus?.length
                      ? `Highlighting GPU${activeScenario.highlightGpus.length > 1 ? 's' : ''}: ${activeScenario.highlightGpus.join(', ')}`
                      : 'Elements highlighted in visualization'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Related Scenarios List */}
          {!activeScenario && relatedScenarios.length > 0 && (
            <>
              <p className="text-xs text-gray-400">
                Practice with {tabLabels[currentTab]} visualization:
              </p>
              <div className="space-y-1">
                {relatedScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => onLaunchScenario(scenario.id)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition-colors text-left group"
                  >
                    <Play className="w-3 h-3 text-gray-500 group-hover:text-nvidia-green transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 truncate">
                        {scenario.title}
                      </div>
                      {scenario.estimatedTime && (
                        <div className="text-xs text-gray-500">
                          ~{scenario.estimatedTime} min
                        </div>
                      )}
                    </div>
                    {scenario.difficulty && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        scenario.difficulty === 'advanced' ? 'bg-red-900/50 text-red-400' :
                        scenario.difficulty === 'intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-green-900/50 text-green-400'
                      }`}>
                        {scenario.difficulty}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!activeScenario && relatedScenarios.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">
              No labs available for this view
            </p>
          )}
        </div>
      )}
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/VisualContextPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/VisualContextPanel.tsx src/components/__tests__/VisualContextPanel.test.tsx
git commit -m "feat: add VisualContextPanel for scenario-visualization integration"
```

---

### Task 4.3: Integrate Context Panel into Dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Step 1: Import new components and utilities**

```typescript
import { VisualContextPanel } from './VisualContextPanel';
import { getRelatedScenarios, getVisualizationContext, extractHighlightTargets } from '@/utils/scenarioVisualizationMap';
import { useSimulationStore } from '@/store/simulationStore';
```

**Step 2: Add state for active scenario tracking**

```typescript
// Get active scenario from store (if user is in a lab)
const activeScenario = useSimulationStore(state => state.activeScenario);
const launchScenario = useSimulationStore(state => state.launchScenario);

// Compute highlights based on active scenario step
const highlightTargets = useMemo(() => {
  if (!activeScenario?.currentStep) return null;
  const vizContext = getVisualizationContext(activeScenario.id);
  if (!vizContext || vizContext.relevantTab !== activeView) return null;

  return extractHighlightTargets(activeScenario.currentStep);
}, [activeScenario, activeView]);
```

**Step 3: Add VisualContextPanel to topology/network tabs**

In the topology tab section:

```typescript
{activeView === 'topology' && (
  <div className="relative">
    <TopologyGraph
      node={currentNode}
      highlightedGpus={highlightTargets?.gpuIndices}
      highlightedLinks={highlightTargets?.linkIds}
    />

    {/* Context Panel - positioned in corner */}
    <div className="absolute top-4 right-4 w-72">
      <VisualContextPanel
        currentTab="topology"
        relatedScenarios={getRelatedScenarios('topology')}
        onLaunchScenario={(id) => launchScenario(id)}
        activeScenario={activeScenario && getVisualizationContext(activeScenario.id)?.relevantTab === 'topology' ? {
          id: activeScenario.id,
          title: activeScenario.title,
          currentStep: activeScenario.stepIndex + 1,
          totalSteps: activeScenario.totalSteps,
          stepTitle: activeScenario.currentStep?.title || '',
          highlightGpus: highlightTargets?.gpuIndices,
        } : null}
        onViewInTerminal={() => {/* Focus terminal pane */}}
      />
    </div>
  </div>
)}
```

**Step 4: Same pattern for InfiniBand Fabric tab**

```typescript
{activeView === 'network' && (
  <div className="relative">
    <InfiniBandMap
      cluster={cluster}
      highlightedNodes={highlightTargets?.nodeIds}
    />

    <div className="absolute top-4 right-4 w-72">
      <VisualContextPanel
        currentTab="network"
        relatedScenarios={getRelatedScenarios('network')}
        onLaunchScenario={(id) => launchScenario(id)}
        activeScenario={activeScenario && getVisualizationContext(activeScenario.id)?.relevantTab === 'network' ? {
          id: activeScenario.id,
          title: activeScenario.title,
          currentStep: activeScenario.stepIndex + 1,
          totalSteps: activeScenario.totalSteps,
          stepTitle: activeScenario.currentStep?.title || '',
        } : null}
      />
    </div>
  </div>
)}
```

**Step 5: Run and verify**

```bash
npm run dev
```

Verify:
- Context panel appears on NVLink Topology tab
- Shows related labs (domain2-nvlink-topo, domain2-nvlink-recovery, etc.)
- Clicking a lab launches it in the terminal
- When in a lab, shows current step info and highlights relevant GPUs

**Step 6: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: integrate VisualContextPanel into Dashboard tabs"
```

---

### Task 4.4: Add Highlight Props to Visualization Components

**Files:**
- Modify: `src/components/TopologyGraph.tsx`
- Modify: `src/components/InfiniBandMap.tsx`

**Step 1: Add highlight props to TopologyGraph**

```typescript
interface TopologyGraphProps {
  node: DGXNode;
  highlightedGpus?: number[];
  highlightedLinks?: string[];
}

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  node,
  highlightedGpus = [],
  highlightedLinks = [],
}) => {
```

**Step 2: Apply highlight styling in D3 (TopologyGraph)**

In the D3 useEffect, modify node rendering:

```typescript
// Highlight ring for active scenario targets
nodeGroups.each(function (d) {
  const isHighlighted = highlightedGpus.includes(d.id);

  if (isHighlighted) {
    d3.select(this)
      .insert('circle', ':first-child')
      .attr('r', 45)
      .attr('fill', 'none')
      .attr('stroke', '#76b900')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,3')
      .attr('class', 'animate-spin-slow'); // CSS animation for pulsing effect
  }
});

// Modify link styling for highlighted links
linkGroup
  .selectAll('line')
  .attr('stroke', (d) => {
    const linkId = `nvlink-${d.source.id}-${d.target.id}`;
    const isHighlighted = highlightedLinks.includes(linkId);
    if (isHighlighted) return '#facc15'; // Yellow for highlighted
    return d.status === 'Active' ? '#10B981' : '#EF4444';
  })
  .attr('stroke-width', (d) => {
    const linkId = `nvlink-${d.source.id}-${d.target.id}`;
    return highlightedLinks.includes(linkId) ? 5 : 3;
  });
```

**Step 3: Add highlight props to InfiniBandMap**

```typescript
interface InfiniBandMapProps {
  cluster: ClusterConfig;
  highlightedNodes?: string[];
  highlightedLinks?: string[];
}
```

**Step 4: Apply highlight styling (InfiniBandMap)**

Similar pattern - add pulsing highlight rings around targeted nodes.

**Step 5: Add CSS animation for highlights**

In `src/index.css` or appropriate stylesheet:

```css
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
  transform-origin: center;
}

@keyframes pulse-highlight {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.highlight-pulse {
  animation: pulse-highlight 1.5s ease-in-out infinite;
}
```

**Step 6: Run and verify**

```bash
npm run dev
```

Start a lab like `domain2-nvlink-recovery` (which has a fault on GPU 2), navigate to NVLink Topology tab, and verify GPU 2 has a pulsing highlight ring.

**Step 7: Commit**

```bash
git add src/components/TopologyGraph.tsx src/components/InfiniBandMap.tsx src/index.css
git commit -m "feat: add scenario-driven highlighting to network visualizations"
```

---

### Task 4.5: Add "Open in Visualization" Button to Lab Steps

**Files:**
- Modify: `src/components/LabWorkspace.tsx` (or wherever lab steps are rendered)

**Step 1: Import visualization utilities**

```typescript
import { hasVisualization, getVisualizationContext } from '@/utils/scenarioVisualizationMap';
```

**Step 2: Add visualization button to step rendering**

When rendering a lab step, check if the scenario has visualization integration:

```typescript
{/* Show "View in Visualization" button for relevant scenarios */}
{hasVisualization(scenario.id) && (
  <button
    onClick={() => {
      const context = getVisualizationContext(scenario.id);
      if (context) {
        // Switch to the relevant dashboard tab
        onSwitchToVisualization(context.relevantTab);
      }
    }}
    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-900/50 text-purple-300 rounded hover:bg-purple-900 transition-colors"
  >
    <Eye className="w-3 h-3" />
    View in {context?.relevantTab === 'topology' ? 'NVLink Topology' : 'InfiniBand Fabric'}
  </button>
)}
```

**Step 3: Commit**

```bash
git add src/components/LabWorkspace.tsx
git commit -m "feat: add 'View in Visualization' button to lab steps"
```

---

## Phase Summary

| Phase | Tasks | New Files | Modified Files |
|-------|-------|-----------|----------------|
| 1: Live Data Flow | 1.1-1.4 | 4 (utils, hook, tests) | 2 (TopologyGraph, InfiniBandMap) |
| 2: Interactive Troubleshooting | 2.1-2.3 | 2 (component, test) | 2 (TopologyGraph, InfiniBandMap) |
| 3: Realistic Hardware | 3.1-3.3 | 1 (data file) | 2 (TopologyGraph, InfiniBandMap) |
| 4: Visual-Scenario Integration | 4.1-4.5 | 4 (mapping util, context panel, tests) | 4 (Dashboard, TopologyGraph, InfiniBandMap, LabWorkspace) |

**Total New Files:** 11
**Total Modified Files:** 5 (with multiple modifications)
**Estimated New Tests:** ~35

---

## Key Differences in Phase 4 (Revised)

**What changed:**
- ❌ Removed: Creating new duplicate training scenarios
- ❌ Removed: NetworkScenarioOverlay with redundant scenario content
- ❌ Removed: `networkTrainingScenarios.ts` with duplicate labs

**What was added instead:**
- ✅ `scenarioVisualizationMap.ts` - Maps existing 53 scenarios to visualization contexts
- ✅ `VisualContextPanel.tsx` - Shows related labs and active step info
- ✅ Highlight props - Visualization components can highlight elements based on active lab step
- ✅ Bidirectional integration - Labs can link to visualizations, visualizations can launch labs

**Benefits:**
- No content duplication with existing labs
- Visualizations enhance existing training rather than replacing it
- Users can seamlessly move between terminal-based labs and visual context
- Automatic highlighting based on what the lab step is teaching
