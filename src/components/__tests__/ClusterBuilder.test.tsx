import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClusterBuilder } from "../ClusterBuilder";
import type { DGXNode } from "@/types/hardware";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", () => ({
  Server: ({ className }: { className?: string }) => (
    <span data-testid="icon-server" className={className} />
  ),
  Plus: ({ className }: { className?: string }) => (
    <span data-testid="icon-plus" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <span data-testid="icon-trash2" className={className} />
  ),
  Link: ({ className }: { className?: string }) => (
    <span data-testid="icon-link" className={className} />
  ),
  Save: ({ className }: { className?: string }) => (
    <span data-testid="icon-save" className={className} />
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="icon-rotate-ccw" className={className} />
  ),
  Move: ({ className }: { className?: string }) => (
    <span data-testid="icon-move" className={className} />
  ),
  Cpu: ({ className }: { className?: string }) => (
    <span data-testid="icon-cpu" className={className} />
  ),
  Network: ({ className }: { className?: string }) => (
    <span data-testid="icon-network" className={className} />
  ),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function makeNode(id: string, gpuCount: number): DGXNode {
  return {
    id,
    hostname: `${id}.local`,
    systemType: "DGX-A100",
    gpus: Array.from({ length: gpuCount }, (_, i) => ({
      id: i,
      uuid: `GPU-${id}-${i}`,
      name: "NVIDIA A100-SXM4-80GB",
      type: "A100-80GB" as const,
      pciAddress: `00:0${i}.0`,
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
      healthStatus: "OK" as const,
      xidErrors: [],
      persistenceMode: true,
      computeMode: "Default" as const,
    })),
    dpus: [],
    hcas: Array.from({ length: 8 }, (_, i) => ({
      id: i,
      devicePath: `/dev/infiniband/uverbs${i}`,
      caType: "ConnectX-6",
      model: "ConnectX-6",
      firmwareVersion: "20.35.1012",
      ports: [],
    })),
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

describe("ClusterBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Renders without crashing
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(<ClusterBuilder />);
    expect(container.firstChild).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // 2. Shows cluster builder heading
  // --------------------------------------------------------------------------

  it("shows 'Cluster Builder' heading text", () => {
    render(<ClusterBuilder />);
    expect(screen.getByText("Cluster Builder")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 3. Shows 'Add Nodes' section with node type buttons
  // --------------------------------------------------------------------------

  it("shows 'Add Nodes' section with DGX system type buttons", () => {
    render(<ClusterBuilder />);
    expect(screen.getByText("Add Nodes")).toBeInTheDocument();
    expect(screen.getByText("DGX A100")).toBeInTheDocument();
    expect(screen.getByText("DGX H100")).toBeInTheDocument();
    expect(screen.getByText("DGX B200")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. Shows Reset button
  // --------------------------------------------------------------------------

  it("shows Reset button", () => {
    render(<ClusterBuilder />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 5. Shows Save button when onSave callback is provided
  // --------------------------------------------------------------------------

  it("shows Save button when onSave callback is provided", () => {
    const onSave = vi.fn();
    render(<ClusterBuilder onSave={onSave} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("does not show Save button when no onSave callback is provided", () => {
    render(<ClusterBuilder />);
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 6. Stats bar shows initial counts (0 nodes, 0 GPUs, etc.)
  // --------------------------------------------------------------------------

  it("shows stats bar with zero counts when no initial nodes", () => {
    render(<ClusterBuilder />);
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getByText("GPUs")).toBeInTheDocument();
    expect(screen.getByText("HCAs")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("Aggregate BW")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Adding a node updates the display and stats
  // --------------------------------------------------------------------------

  it("clicking a node type button adds a node and updates stats", () => {
    render(<ClusterBuilder />);

    // Initially 0 nodes
    const nodesStat = screen.getByText("Nodes").previousElementSibling!;
    expect(nodesStat.textContent).toBe("0");

    // Click DGX A100 to add a node
    fireEvent.click(screen.getByText("DGX A100"));

    // Now 1 node with 8 GPUs
    expect(nodesStat.textContent).toBe("1");
    const gpusStat = screen.getByText("GPUs").previousElementSibling!;
    expect(gpusStat.textContent).toBe("8");
  });

  // --------------------------------------------------------------------------
  // 8. Adding multiple nodes updates GPU count correctly
  // --------------------------------------------------------------------------

  it("adding multiple nodes shows cumulative GPU count", () => {
    render(<ClusterBuilder />);

    fireEvent.click(screen.getByText("DGX A100"));
    fireEvent.click(screen.getByText("DGX H100"));

    const nodesStat = screen.getByText("Nodes").previousElementSibling!;
    expect(nodesStat.textContent).toBe("2");

    const gpusStat = screen.getByText("GPUs").previousElementSibling!;
    expect(gpusStat.textContent).toBe("16");
  });

  // --------------------------------------------------------------------------
  // 9. Save button triggers onSave with cluster config
  // --------------------------------------------------------------------------

  it("clicking Save calls onSave with the cluster configuration", () => {
    const onSave = vi.fn();
    render(<ClusterBuilder onSave={onSave} />);

    // Add a node first
    fireEvent.click(screen.getByText("DGX A100"));

    // Click save
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const config = onSave.mock.calls[0][0];
    expect(config.nodes).toHaveLength(1);
    expect(config.nodes[0].type).toBe("DGX-A100");
    expect(config.nodes[0].gpuCount).toBe(8);
    expect(config.layout).toHaveLength(1);
    expect(config.connections).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // 10. Shows empty state message when no nodes
  // --------------------------------------------------------------------------

  it("shows empty state message when no nodes are present", () => {
    render(<ClusterBuilder />);
    expect(
      screen.getByText(/Click "Add Nodes" above to build your cluster/),
    ).toBeInTheDocument();
  });

  it("empty state disappears after adding a node", () => {
    render(<ClusterBuilder />);
    expect(
      screen.getByText(/Click "Add Nodes" above to build your cluster/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("DGX A100"));

    expect(
      screen.queryByText(/Click "Add Nodes" above to build your cluster/),
    ).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 11. Renders with initial nodes
  // --------------------------------------------------------------------------

  it("renders with initial nodes and shows correct stats", () => {
    const initialNodes = [makeNode("dgx-01", 8), makeNode("dgx-02", 8)];
    render(<ClusterBuilder initialNodes={initialNodes} />);

    const nodesStat = screen.getByText("Nodes").previousElementSibling!;
    expect(nodesStat.textContent).toBe("2");

    const gpusStat = screen.getByText("GPUs").previousElementSibling!;
    expect(gpusStat.textContent).toBe("16");

    // Empty state should not appear
    expect(
      screen.queryByText(/Click "Add Nodes" above to build your cluster/),
    ).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 12. Instructions section is present
  // --------------------------------------------------------------------------

  it("shows the instructions section", () => {
    render(<ClusterBuilder />);
    expect(screen.getByText("Instructions:")).toBeInTheDocument();
    expect(
      screen.getByText(/Drag nodes to reposition them/),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 13. Reset restores initial state
  // --------------------------------------------------------------------------

  it("Reset button restores to the initial node configuration", () => {
    const initialNodes = [makeNode("dgx-01", 8)];
    render(<ClusterBuilder initialNodes={initialNodes} />);

    // Add an extra node
    fireEvent.click(screen.getByText("DGX H100"));
    const nodesStat = screen.getByText("Nodes").previousElementSibling!;
    expect(nodesStat.textContent).toBe("2");

    // Reset
    fireEvent.click(screen.getByText("Reset"));
    expect(nodesStat.textContent).toBe("1");
  });
});
