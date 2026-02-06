import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";

// Mock D3 to avoid SVG rendering issues
vi.mock("d3", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockChain: any = {};
  const methods = [
    "attr",
    "style",
    "text",
    "on",
    "each",
    "append",
    "selectAll",
    "remove",
    "data",
    "enter",
  ];
  methods.forEach((method) => {
    mockChain[method] = vi.fn(() => mockChain);
  });
  return {
    select: vi.fn(() => mockChain),
    range: vi.fn((n: number) => Array.from({ length: n }, (_, i) => i)),
  };
});

// Mock child visualization components
vi.mock("../MetricsChart", () => ({
  MetricsChart: () => <div data-testid="metrics-chart">MetricsChart</div>,
}));
vi.mock("../TopologyGraph", () => ({
  TopologyGraph: () => <div data-testid="topology-graph">TopologyGraph</div>,
}));
vi.mock("../InfiniBandMap", () => ({
  InfiniBandMap: () => <div data-testid="infiniband-map">InfiniBandMap</div>,
}));
vi.mock("../FabricHealthSummary", () => ({
  FabricHealthSummary: () => (
    <div data-testid="fabric-health">FabricHealthSummary</div>
  ),
}));

// Mock the simulation store
const mockNode = {
  id: "dgx-00",
  hostname: "dgx-00.local",
  systemType: "DGX-A100",
  cpuModel: "AMD EPYC 7742 64-Core Processor",
  cpuCount: 128,
  ramTotal: 1024,
  ramUsed: 256,
  nvidiaDriverVersion: "535.129.03",
  cudaVersion: "12.2",
  osVersion: "Ubuntu 22.04.3 LTS",
  kernelVersion: "5.15.0-91-generic",
  gpus: [
    {
      id: 0,
      uuid: "GPU-0000",
      name: "A100-SXM4-80GB",
      type: "A100-80GB",
      pciAddress: "0000:10:00.0",
      temperature: 45,
      powerDraw: 250,
      powerLimit: 400,
      memoryTotal: 81920,
      memoryUsed: 10240,
      utilization: 35,
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
    },
  ],
  dpus: [],
  hcas: [],
  bmc: {
    ipAddress: "10.0.0.1",
    macAddress: "00:00:00:00:00:01",
    firmwareVersion: "1.0.0",
    powerState: "On",
    sensors: [],
  },
  slurmState: "idle",
  slurmReason: null,
};

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: Object.assign(
    vi.fn((selector?: (state: unknown) => unknown) => {
      const state = {
        cluster: {
          name: "Test Cluster",
          nodes: [mockNode],
          bcmHA: { state: "Active" },
        },
        selectedNode: "dgx-00",
        isRunning: false,
        requestedVisualizationView: null,
        setRequestedVisualizationView: vi.fn(),
        activeScenario: null,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        cluster: { nodes: [mockNode], bcmHA: { state: "Active" } },
        selectedNode: "dgx-00",
      })),
    },
  ),
}));

describe("Dashboard", () => {
  it("should render GPU cards", () => {
    render(<Dashboard />);
    expect(screen.getByText("A100-SXM4-80GB")).toBeInTheDocument();
  });

  it("should render health status indicator", () => {
    render(<Dashboard />);
    const okElements = screen.getAllByText("OK");
    expect(okElements.length).toBeGreaterThan(0);
  });

  it("should render view navigation tabs", () => {
    render(<Dashboard />);
    // Dashboard has view tabs like Overview, Topology, etc.
    expect(screen.getByText(/overview/i)).toBeInTheDocument();
  });
});
