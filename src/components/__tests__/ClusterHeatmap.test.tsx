import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClusterHeatmap } from "../ClusterHeatmap";
import type { DGXNode, GPU } from "@/types/hardware";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", () => ({
  Activity: ({ className }: { className?: string }) => (
    <span data-testid="icon-activity" className={className} />
  ),
  Thermometer: ({ className }: { className?: string }) => (
    <span data-testid="icon-thermometer" className={className} />
  ),
  Zap: ({ className }: { className?: string }) => (
    <span data-testid="icon-zap" className={className} />
  ),
  HardDrive: ({ className }: { className?: string }) => (
    <span data-testid="icon-harddrive" className={className} />
  ),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function makeGPU(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: "GPU-00000000-0000-0000-0000-000000000000",
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: "00:00.0",
    temperature: 45,
    powerDraw: 200,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 20480,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode: false,
    migInstances: [],
    nvlinks: [],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    computeMode: "Default",
    ...overrides,
  };
}

function makeNode(
  id: string,
  gpuCount: number,
  gpuOverrides: Partial<GPU> = {},
): DGXNode {
  return {
    id,
    hostname: `${id}.local`,
    systemType: "DGX-A100",
    gpus: Array.from({ length: gpuCount }, (_, i) =>
      makeGPU({ id: i, uuid: `GPU-${id}-${i}`, ...gpuOverrides }),
    ),
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "10.0.0.1",
      macAddress: "00:00:00:00:00:01",
      firmwareVersion: "1.0.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "AMD EPYC 7742",
    cpuCount: 2,
    ramTotal: 1024,
    ramUsed: 256,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0",
    nvidiaDriverVersion: "535.104.05",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ClusterHeatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Renders without crashing
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const nodes = [makeNode("node-01", 4)];
    const { container } = render(<ClusterHeatmap nodes={nodes} />);
    expect(container.firstChild).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // 2. Shows heatmap grid/cells for GPUs
  // --------------------------------------------------------------------------

  it("shows heatmap cells for GPUs with title attributes", () => {
    const nodes = [makeNode("node-01", 4, { utilization: 72 })];
    render(<ClusterHeatmap nodes={nodes} />);

    // Each GPU cell has a title attribute with "GPU <id>: <value><unit>"
    for (let i = 0; i < 4; i++) {
      const cell = screen.getByTitle(`GPU ${i}: 72.0%`);
      expect(cell).toBeInTheDocument();
    }
  });

  // --------------------------------------------------------------------------
  // 3. Shows node labels/identifiers
  // --------------------------------------------------------------------------

  it("shows node identifiers as labels", () => {
    const nodes = [makeNode("node-01", 2), makeNode("node-02", 2)];
    render(<ClusterHeatmap nodes={nodes} />);

    expect(screen.getByText("node-01")).toBeInTheDocument();
    expect(screen.getByText("node-02")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. GPU cells display utilization info
  // --------------------------------------------------------------------------

  it("GPU cells display utilization values in title", () => {
    const nodes = [makeNode("node-01", 2, { utilization: 88 })];
    render(<ClusterHeatmap nodes={nodes} />);

    // Default metric is utilization; title should show value
    expect(screen.getByTitle("GPU 0: 88.0%")).toBeInTheDocument();
    expect(screen.getByTitle("GPU 1: 88.0%")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 5. Color coding varies by utilization level
  // --------------------------------------------------------------------------

  it("applies different background colors for different utilization levels", () => {
    const lowGPU = makeGPU({ id: 0, utilization: 10, uuid: "GPU-low" });
    const highGPU = makeGPU({ id: 1, utilization: 95, uuid: "GPU-high" });
    const node: DGXNode = {
      ...makeNode("node-01", 0),
      gpus: [lowGPU, highGPU],
    };
    render(<ClusterHeatmap nodes={[node]} />);

    const lowCell = screen.getByTitle("GPU 0: 10.0%");
    const highCell = screen.getByTitle("GPU 1: 95.0%");

    // Low utilization should be blue (#3B82F6)
    expect(lowCell.style.backgroundColor).toBe("rgb(59, 130, 246)");
    // Very high utilization should be red (#EF4444)
    expect(highCell.style.backgroundColor).toBe("rgb(239, 68, 68)");
  });

  // --------------------------------------------------------------------------
  // 6. Shows color scale legend
  // --------------------------------------------------------------------------

  it("shows 'Low' and 'High' labels for the color scale legend", () => {
    const nodes = [makeNode("node-01", 2)];
    render(<ClusterHeatmap nodes={nodes} />);

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Handles empty cluster (no nodes) gracefully
  // --------------------------------------------------------------------------

  it("handles empty cluster (no nodes) gracefully", () => {
    const { container } = render(<ClusterHeatmap nodes={[]} />);
    // Should render without crashing
    expect(container.firstChild).toBeTruthy();
    // Heading should still be present
    expect(screen.getByText(/Cluster Heatmap/)).toBeInTheDocument();
    // No stats should be shown (stats is null)
    expect(screen.queryByText(/Avg:/)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 8. Handles multiple nodes
  // --------------------------------------------------------------------------

  it("handles multiple nodes and shows all of them", () => {
    const nodes = [
      makeNode("dgx-01", 4),
      makeNode("dgx-02", 4),
      makeNode("dgx-03", 4),
    ];
    render(<ClusterHeatmap nodes={nodes} />);

    expect(screen.getByText("dgx-01")).toBeInTheDocument();
    expect(screen.getByText("dgx-02")).toBeInTheDocument();
    expect(screen.getByText("dgx-03")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. Shows correct number of GPU cells per node
  // --------------------------------------------------------------------------

  it("shows the correct number of GPU cells per node", () => {
    const nodes = [
      makeNode("node-01", 2, { utilization: 30 }),
      makeNode("node-02", 8, { utilization: 60 }),
    ];
    render(<ClusterHeatmap nodes={nodes} />);

    // node-01 has 2 GPUs (id=0,1), node-02 has 8 GPUs (id=0..7)
    // Titles for node-01: GPU 0: 30.0%, GPU 1: 30.0%
    // Titles for node-02: GPU 0: 60.0%, GPU 1: 60.0%, ..., GPU 7: 60.0%
    const cells30 = screen.getAllByTitle(/30\.0%/);
    const cells60 = screen.getAllByTitle(/60\.0%/);

    expect(cells30).toHaveLength(2);
    expect(cells60).toHaveLength(8);
  });

  // --------------------------------------------------------------------------
  // 10. Metric selector buttons present and switch metrics
  // --------------------------------------------------------------------------

  it("shows metric selector buttons and switches to temperature metric", () => {
    const nodes = [
      makeNode("node-01", 2, { utilization: 50, temperature: 72 }),
    ];
    render(<ClusterHeatmap nodes={nodes} />);

    // All four metric buttons should be present
    expect(screen.getByText("Utilization")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("Power Draw")).toBeInTheDocument();
    expect(screen.getByText("Memory Usage")).toBeInTheDocument();

    // Header should initially say "Cluster Heatmap - Utilization"
    expect(
      screen.getByText("Cluster Heatmap - Utilization"),
    ).toBeInTheDocument();

    // Click temperature button
    fireEvent.click(screen.getByText("Temperature"));

    // Header should now say temperature
    expect(
      screen.getByText("Cluster Heatmap - Temperature"),
    ).toBeInTheDocument();

    // GPU cells should now show temperature values
    expect(screen.getByTitle("GPU 0: 72.0°C")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 11. Statistics display (avg, range)
  // --------------------------------------------------------------------------

  it("shows average and range statistics for GPU metrics", () => {
    const gpu0 = makeGPU({ id: 0, utilization: 20, uuid: "GPU-0" });
    const gpu1 = makeGPU({ id: 1, utilization: 80, uuid: "GPU-1" });
    const node: DGXNode = {
      ...makeNode("node-01", 0),
      gpus: [gpu0, gpu1],
    };
    render(<ClusterHeatmap nodes={[node]} />);

    // Average of 20 and 80 = 50.0
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    // Range
    expect(screen.getByText("Avg:")).toBeInTheDocument();
    expect(screen.getByText("Range:")).toBeInTheDocument();
    expect(screen.getByText("20.0 - 80.0%")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 12. GPU click handler fires
  // --------------------------------------------------------------------------

  it("fires onGPUClick callback when a GPU cell is clicked", () => {
    const onGPUClick = vi.fn();
    const nodes = [makeNode("node-01", 2, { utilization: 55 })];
    render(<ClusterHeatmap nodes={nodes} onGPUClick={onGPUClick} />);

    fireEvent.click(screen.getByTitle("GPU 0: 55.0%"));

    expect(onGPUClick).toHaveBeenCalledTimes(1);
    expect(onGPUClick).toHaveBeenCalledWith(
      "node-01",
      expect.objectContaining({ id: 0 }),
    );
  });

  // --------------------------------------------------------------------------
  // 13. Health indicator for non-OK GPUs
  // --------------------------------------------------------------------------

  it("renders health indicator for GPUs with non-OK health status", () => {
    const warningGPU = makeGPU({
      id: 0,
      healthStatus: "Warning",
      uuid: "GPU-warn",
    });
    const okGPU = makeGPU({ id: 1, healthStatus: "OK", uuid: "GPU-ok" });
    const node: DGXNode = {
      ...makeNode("node-01", 0),
      gpus: [warningGPU, okGPU],
    };
    render(<ClusterHeatmap nodes={[node]} />);

    // The warning GPU cell should have a child span for the health indicator
    const warningCell = screen.getByTitle("GPU 0: 50.0%");
    // The health indicator is a span with specific background color (#F59E0B for Warning)
    const healthDots = warningCell.querySelectorAll("span");
    const warningDot = Array.from(healthDots).find(
      (el) => (el as HTMLElement).style.backgroundColor === "rgb(245, 158, 11)",
    );
    expect(warningDot).toBeTruthy();

    // The OK GPU should NOT have a health indicator dot with warning/critical color
    const okCell = screen.getByTitle("GPU 1: 50.0%");
    const okDots = okCell.querySelectorAll("span");
    const okWarningDot = Array.from(okDots).find(
      (el) =>
        (el as HTMLElement).style.backgroundColor === "rgb(245, 158, 11)" ||
        (el as HTMLElement).style.backgroundColor === "rgb(239, 68, 68)",
    );
    expect(okWarningDot).toBeFalsy();
  });
});
