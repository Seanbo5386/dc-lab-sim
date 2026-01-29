/**
 * DGX System GPU Layout Data
 *
 * Accurate physical and NVLink topology for different DGX systems.
 * Used for realistic visualization of GPU interconnects.
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

/**
 * DGX A100 Layout
 *
 * 8 GPUs arranged in 2 rows of 4, connected via 6 NVSwitches.
 * GPUs 0-3 form one group, GPUs 4-7 form another.
 * NVSwitches 0-2 connect the left group, NVSwitches 3-5 connect the right group.
 * Cross-group connections via direct NVLink (GPU 1-2, GPU 5-6).
 */
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

/**
 * DGX H100 Layout
 *
 * 8 GPUs connected via 4 NVSwitches in a more symmetric topology.
 * All-to-all connectivity through the NVSwitch fabric.
 */
export const DGX_H100_LAYOUT: DGXLayout = {
  systemType: 'DGX-H100',
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

/**
 * Get the layout for a given system type.
 * Defaults to DGX A100 layout if not found.
 */
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

/**
 * Calculate pixel positions for GPUs based on layout and container dimensions.
 */
export function calculateGPUPositions(
  layout: DGXLayout,
  width: number,
  height: number,
  padding: number = 50
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
  padding: number = 50
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
