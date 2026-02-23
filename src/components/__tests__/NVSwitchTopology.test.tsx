import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NVSwitchTopology } from "../NVSwitchTopology";
import type { DGXNode, GPU } from "@/types/hardware";

// Mock ResizeObserver (not available in jsdom)
(globalThis as Record<string, unknown>).ResizeObserver = vi
  .fn()
  .mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

// Mock D3 with chainable selection methods
vi.mock("d3", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSelection: any = {};
  const methods = [
    "selectAll",
    "select",
    "remove",
    "data",
    "enter",
    "append",
    "attr",
    "style",
    "text",
    "on",
    "each",
    "transition",
    "delay",
    "duration",
  ];
  methods.forEach((method) => {
    mockSelection[method] = vi.fn(() => mockSelection);
  });

  return {
    select: vi.fn(() => mockSelection),
    range: vi.fn((n: number) => Array.from({ length: n }, (_, i) => i)),
  };
});

describe("NVSwitchTopology", () => {
  const createMockGPU = (
    id: number,
    health: "OK" | "Warning" | "Critical" = "OK",
  ): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: "A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: health === "Critical" ? 95 : health === "Warning" ? 85 : 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 15 + id * 10,
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
    nvlinks: Array.from({ length: 6 }, (_, j) => ({
      linkId: j,
      status: "Active" as const,
      speed: 50,
      txErrors: 0,
      rxErrors: 0,
      replayErrors: 0,
    })),
    healthStatus: health,
    xidErrors: [],
    persistenceMode: true,
  });

  const mockNode: DGXNode = {
    id: "dgx-00",
    hostname: "dgx-00.local",
    systemType: "DGX-A100",
    gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "192.168.0.100",
      macAddress: "00:00:00:00:00:01",
      firmwareVersion: "1.2.3",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "AMD EPYC 7742",
    cpuCount: 128,
    ramTotal: 2048,
    ramUsed: 256,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0",
    nvidiaDriverVersion: "535.104.05",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should show node ID in title", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText(/dgx-00/)).toBeInTheDocument();
    });

    it("should render SVG element", () => {
      const { container } = render(<NVSwitchTopology node={mockNode} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Legend", () => {
    it("should show NVSwitch legend item", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText("NVSwitch")).toBeInTheDocument();
    });

    it("should show Healthy GPU legend item", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText("Healthy GPU")).toBeInTheDocument();
    });

    it("should show Warning GPU legend item", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText("Warning GPU")).toBeInTheDocument();
    });

    it("should show Critical GPU legend item", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText("Critical GPU")).toBeInTheDocument();
    });
  });

  describe("Instructions", () => {
    it("should show click instruction", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(
        screen.getByText(/Click on a GPU to select it/),
      ).toBeInTheDocument();
    });

    it("should mention active NVLinks", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.getByText(/active NVLinks/)).toBeInTheDocument();
    });
  });

  describe("Fault Injection Button", () => {
    it("should not show inject button when no GPU selected and no onFaultInject", () => {
      render(<NVSwitchTopology node={mockNode} />);

      expect(screen.queryByText("Inject XID Error")).not.toBeInTheDocument();
    });

    it("should not show inject button when onFaultInject provided but no GPU selected", () => {
      const onFaultInject = vi.fn();
      render(
        <NVSwitchTopology node={mockNode} onFaultInject={onFaultInject} />,
      );

      expect(screen.queryByText("Inject XID Error")).not.toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("should accept onGPUClick callback", () => {
      const onGPUClick = vi.fn();
      render(<NVSwitchTopology node={mockNode} onGPUClick={onGPUClick} />);

      // Component renders without error
      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should accept onFaultInject callback", () => {
      const onFaultInject = vi.fn();
      render(
        <NVSwitchTopology node={mockNode} onFaultInject={onFaultInject} />,
      );

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should accept showDataFlow prop", () => {
      render(
        <NVSwitchTopology
          node={mockNode}
          showDataFlow={true}
          dataFlowPath={[0, 7]}
        />,
      );

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should accept dataFlowPath prop", () => {
      render(
        <NVSwitchTopology
          node={mockNode}
          showDataFlow={true}
          dataFlowPath={[0, 4]}
        />,
      );

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });
  });

  describe("GPU Health Variants", () => {
    it("should handle node with warning GPU", () => {
      const nodeWithWarning: DGXNode = {
        ...mockNode,
        gpus: [
          createMockGPU(0, "OK"),
          createMockGPU(1, "Warning"),
          ...Array.from({ length: 6 }, (_, i) => createMockGPU(i + 2)),
        ],
      };

      render(<NVSwitchTopology node={nodeWithWarning} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should handle node with critical GPU", () => {
      const nodeWithCritical: DGXNode = {
        ...mockNode,
        gpus: [
          createMockGPU(0, "Critical"),
          ...Array.from({ length: 7 }, (_, i) => createMockGPU(i + 1)),
        ],
      };

      render(<NVSwitchTopology node={nodeWithCritical} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });
  });

  describe("NVLink Status", () => {
    it("should handle GPU with inactive NVLinks", () => {
      const nodeWithInactiveLinks: DGXNode = {
        ...mockNode,
        gpus: mockNode.gpus.map((gpu, idx) => ({
          ...gpu,
          nvlinks: gpu.nvlinks.map((link, linkIdx) => ({
            ...link,
            status:
              idx === 0 && linkIdx === 0
                ? ("Down" as const)
                : ("Active" as const),
          })),
        })),
      };

      render(<NVSwitchTopology node={nodeWithInactiveLinks} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });
  });

  describe("Different Node Configurations", () => {
    it("should handle node with 4 GPUs", () => {
      const nodeWith4GPUs: DGXNode = {
        ...mockNode,
        gpus: Array.from({ length: 4 }, (_, i) => createMockGPU(i)),
      };

      render(<NVSwitchTopology node={nodeWith4GPUs} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });

    it("should handle H100 system type", () => {
      const h100Node: DGXNode = {
        ...mockNode,
        systemType: "DGX-H100",
        gpus: Array.from({ length: 8 }, (_, i) => ({
          ...createMockGPU(i),
          name: "H100-SXM5-80GB",
          type: "H100-SXM" as const,
        })),
      };

      render(<NVSwitchTopology node={h100Node} />);

      expect(screen.getByText(/NVSwitch Fabric Topology/)).toBeInTheDocument();
    });
  });
});
