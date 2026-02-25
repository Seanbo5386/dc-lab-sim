/**
 * DGX System GPU Layout Data
 *
 * Accurate physical and NVLink topology for different DGX systems.
 * Used for realistic visualization of GPU interconnects.
 */

export interface GPULayoutPosition {
  gpuIndex: number;
  x: number; // Relative X position (0-1)
  y: number; // Relative Y position (0-1)
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

/**
 * DGX A100 Layout
 *
 * 8 GPUs arranged in 2 rows of 4, connected via 6 NVSwitch 2.0 chips.
 * Each GPU has 2 NVLinks per NVSwitch = 12 NVLinks total per GPU.
 * All 6 NVSwitches connect to all 8 GPUs, providing all-to-all
 * non-blocking connectivity (28 unique GPU pairs, C(8,2)).
 * 600 GB/s bidirectional per GPU. Matches nvidia-smi topo -m (NV12 between all pairs).
 */
export const DGX_A100_LAYOUT: DGXLayout = {
  systemType: "DGX-A100",
  gpuCount: 8,
  nvSwitchCount: 6,
  gpuPositions: [
    // Top row (GPUs 0-3)
    { gpuIndex: 0, x: 0.15, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.38, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.62, y: 0.25, nvSwitchGroup: 0 },
    { gpuIndex: 3, x: 0.85, y: 0.25, nvSwitchGroup: 0 },
    // Bottom row (GPUs 4-7)
    { gpuIndex: 4, x: 0.15, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 5, x: 0.38, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.62, y: 0.75, nvSwitchGroup: 0 },
    { gpuIndex: 7, x: 0.85, y: 0.75, nvSwitchGroup: 0 },
  ],
  nvSwitchPositions: [
    // All 6 NVSwitches connect to all 8 GPUs (2x3 grid centered between GPU rows)
    { id: 0, x: 0.3, y: 0.42, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 1, x: 0.5, y: 0.42, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 2, x: 0.7, y: 0.42, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 3, x: 0.3, y: 0.58, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 4, x: 0.5, y: 0.58, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 5, x: 0.7, y: 0.58, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
  ],
  nvLinkConnections: [
    // All-to-all via NVSwitch fabric (28 unique pairs, C(8,2))
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
    { from: 0, to: 7 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 2, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 6 },
    { from: 2, to: 7 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 3, to: 6 },
    { from: 3, to: 7 },
    { from: 4, to: 5 },
    { from: 4, to: 6 },
    { from: 4, to: 7 },
    { from: 5, to: 6 },
    { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

/**
 * DGX H100 Layout
 *
 * 8 GPUs connected via 4 NVSwitches in a more symmetric topology.
 * All-to-all connectivity through the NVSwitch fabric.
 */
export const DGX_H100_LAYOUT: DGXLayout = {
  systemType: "DGX-H100",
  gpuCount: 8,
  nvSwitchCount: 4,
  gpuPositions: [
    // Arranged in a more circular/symmetric pattern
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
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
    { from: 0, to: 7 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 2, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 6 },
    { from: 2, to: 7 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 3, to: 6 },
    { from: 3, to: 7 },
    { from: 4, to: 5 },
    { from: 4, to: 6 },
    { from: 4, to: 7 },
    { from: 5, to: 6 },
    { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

/**
 * DGX B200 Layout
 *
 * 8 GPUs arranged in 2 rows of 4, connected via 2 NVSwitch 5th-gen chips.
 * NVLink 5.0 with 18 links per GPU at 50 GB/s each = 1800 GB/s total per GPU.
 * All-to-all non-blocking connectivity through the 2 NVSwitch chips.
 */
export const DGX_B200_LAYOUT: DGXLayout = {
  systemType: "DGX-B200",
  gpuCount: 8,
  nvSwitchCount: 2,
  gpuPositions: [
    // Top row (GPUs 0-3)
    { gpuIndex: 0, x: 0.15, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.38, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.62, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 3, x: 0.85, y: 0.2, nvSwitchGroup: 0 },
    // Bottom row (GPUs 4-7)
    { gpuIndex: 4, x: 0.15, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 5, x: 0.38, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.62, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 7, x: 0.85, y: 0.8, nvSwitchGroup: 0 },
  ],
  nvSwitchPositions: [
    // 2 NVSwitches centered between GPU rows
    { id: 0, x: 0.38, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 1, x: 0.62, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
  ],
  nvLinkConnections: [
    // All-to-all via NVSwitch fabric (28 unique pairs, C(8,2))
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
    { from: 0, to: 7 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 2, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 6 },
    { from: 2, to: 7 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 3, to: 6 },
    { from: 3, to: 7 },
    { from: 4, to: 5 },
    { from: 4, to: 6 },
    { from: 4, to: 7 },
    { from: 5, to: 6 },
    { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

/**
 * DGX GB200 Layout
 *
 * 8 GPUs arranged in 2 rows of 4, connected via 2 NVSwitch 5th-gen chips.
 * Same topology as DGX B200 — NVLink 5.0 with 18 links per GPU at 50 GB/s each.
 * All-to-all non-blocking connectivity through the 2 NVSwitch chips.
 * Grace CPU (ARM-based) instead of x86.
 * ConnectX-8 XDR 800Gb/s networking.
 */
export const DGX_GB200_LAYOUT: DGXLayout = {
  systemType: "DGX-GB200",
  gpuCount: 8,
  nvSwitchCount: 2,
  gpuPositions: [
    // Top row (GPUs 0-3)
    { gpuIndex: 0, x: 0.15, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.38, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.62, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 3, x: 0.85, y: 0.2, nvSwitchGroup: 0 },
    // Bottom row (GPUs 4-7)
    { gpuIndex: 4, x: 0.15, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 5, x: 0.38, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.62, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 7, x: 0.85, y: 0.8, nvSwitchGroup: 0 },
  ],
  nvSwitchPositions: [
    // 2 NVSwitches centered between GPU rows
    { id: 0, x: 0.38, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 1, x: 0.62, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
  ],
  nvLinkConnections: [
    // All-to-all via NVSwitch fabric (28 unique pairs, C(8,2))
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
    { from: 0, to: 7 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 2, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 6 },
    { from: 2, to: 7 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 3, to: 6 },
    { from: 3, to: 7 },
    { from: 4, to: 5 },
    { from: 4, to: 6 },
    { from: 4, to: 7 },
    { from: 5, to: 6 },
    { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

/**
 * DGX VR200 Layout
 *
 * 8 GPUs arranged in 2 rows of 4, connected via 2 NVSwitch 6th-gen chips.
 * NVLink 6.0 with 18 links per GPU at 200 GB/s each = 3600 GB/s total per GPU.
 * All-to-all non-blocking connectivity through the 2 NVSwitch chips.
 * Vera CPU (ARM-based) instead of x86.
 * ConnectX-9 XDR2 1600Gb/s networking.
 */
export const DGX_VR200_LAYOUT: DGXLayout = {
  systemType: "DGX VR200",
  gpuCount: 8,
  nvSwitchCount: 2,
  gpuPositions: [
    // Top row (GPUs 0-3)
    { gpuIndex: 0, x: 0.15, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 1, x: 0.38, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 2, x: 0.62, y: 0.2, nvSwitchGroup: 0 },
    { gpuIndex: 3, x: 0.85, y: 0.2, nvSwitchGroup: 0 },
    // Bottom row (GPUs 4-7)
    { gpuIndex: 4, x: 0.15, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 5, x: 0.38, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 6, x: 0.62, y: 0.8, nvSwitchGroup: 0 },
    { gpuIndex: 7, x: 0.85, y: 0.8, nvSwitchGroup: 0 },
  ],
  nvSwitchPositions: [
    // 2 NVSwitches centered between GPU rows
    { id: 0, x: 0.38, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
    { id: 1, x: 0.62, y: 0.5, connectedGPUs: [0, 1, 2, 3, 4, 5, 6, 7] },
  ],
  nvLinkConnections: [
    // All-to-all via NVSwitch fabric (28 unique pairs, C(8,2))
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
    { from: 0, to: 7 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 2, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 6 },
    { from: 2, to: 7 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 3, to: 6 },
    { from: 3, to: 7 },
    { from: 4, to: 5 },
    { from: 4, to: 6 },
    { from: 4, to: 7 },
    { from: 5, to: 6 },
    { from: 5, to: 7 },
    { from: 6, to: 7 },
  ],
};

/**
 * Get the layout for a given system type.
 * Defaults to DGX A100 layout if not found.
 */
export function getLayoutForSystem(systemType: string): DGXLayout {
  switch (systemType) {
    case "DGX-H100":
    case "DGX-H200":
      return DGX_H100_LAYOUT;
    case "DGX-B200":
      return DGX_B200_LAYOUT;
    case "DGX-GB200":
      return DGX_GB200_LAYOUT;
    case "DGX-VR200":
      return DGX_VR200_LAYOUT;
    case "DGX-A100":
    default:
      return DGX_A100_LAYOUT;
  }
}

/**
 * Calculate pixel positions for GPUs based on layout and container dimensions.
 */
export function calculateGPUPositions(
  layout: DGXLayout,
  width: number,
  height: number,
  padding: number = 50,
): Array<{ gpuIndex: number; x: number; y: number }> {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return layout.gpuPositions.map((pos) => ({
    gpuIndex: pos.gpuIndex,
    x: padding + pos.x * usableWidth,
    y: padding + pos.y * usableHeight,
  }));
}

/**
 * Calculate pixel positions for NVSwitches based on layout and container dimensions.
 */
export function calculateNVSwitchPositions(
  layout: DGXLayout,
  width: number,
  height: number,
  padding: number = 50,
): Array<{ id: number; x: number; y: number; connectedGPUs: number[] }> {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return layout.nvSwitchPositions.map((pos) => ({
    id: pos.id,
    x: padding + pos.x * usableWidth,
    y: padding + pos.y * usableHeight,
    connectedGPUs: pos.connectedGPUs,
  }));
}
