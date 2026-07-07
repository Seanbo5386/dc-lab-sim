import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MIGConfigurator } from "../MIGConfigurator";
import { SlurmJobVisualizer } from "../SlurmJobVisualizer";
import { ClusterBuilder } from "../ClusterBuilder";
import { IBCableTracer } from "../IBCableTracer";
import type {
  DGXNode,
  GPU,
  InfiniBandHCA,
  InfiniBandPort,
} from "@/types/hardware";

describe("MIGConfigurator", () => {
  const createMockGPU = (id: number, migMode: boolean = false): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: "A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920, // 80GB
    memoryUsed: 1024,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode,
    migInstances: [],
    nvlinks: [],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    computeMode: "Default",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component title", () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByText(/MIG Configurator/)).toBeInTheDocument();
    });

    it("should show GPU ID in title", () => {
      render(<MIGConfigurator gpu={createMockGPU(3)} />);

      expect(screen.getByText(/GPU 3/)).toBeInTheDocument();
    });

    it("should show MIG toggle button", () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByRole("button", { name: /MIG/ })).toBeInTheDocument();
    });
  });

  describe("MIG Toggle", () => {
    it("should show disabled state initially for non-MIG GPU", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      expect(screen.getByText(/MIG Disabled/)).toBeInTheDocument();
    });

    it("should show enabled state for MIG GPU", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText(/MIG Enabled/)).toBeInTheDocument();
    });

    it("should toggle MIG state on button click", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      const toggleButton = screen.getByRole("button", { name: /MIG/ });
      fireEvent.click(toggleButton);

      expect(screen.getByText(/MIG Enabled/)).toBeInTheDocument();
    });

    it("should show enable message when disabled", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      expect(
        screen.getByText(/Enable MIG mode to configure GPU partitions/),
      ).toBeInTheDocument();
    });
  });

  describe("Profile Selection", () => {
    it("should show MIG profiles when enabled", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Profiles appear in both buttons and reference section
      expect(screen.getAllByText("1g.5gb").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2g.10gb").length).toBeGreaterThan(0);
      expect(screen.getAllByText("3g.20gb").length).toBeGreaterThan(0);
      expect(screen.getAllByText("7g.40gb").length).toBeGreaterThan(0);
    });

    it("should show Add MIG Instance section", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText("Add MIG Instance")).toBeInTheDocument();
    });
  });

  describe("Instance Management", () => {
    it("should add instance when profile is clicked", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Find the profile button in the Add MIG Instance section (first occurrence)
      const profileButtons = screen.getAllByText("1g.5gb");
      const profileButton = profileButtons[0].closest("button");
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      // Should show configured instances section
      expect(screen.getByText("Configured Instances")).toBeInTheDocument();
    });

    it("should show Clear All button when instances exist", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Add an instance - use first occurrence which is the button
      const profileButtons = screen.getAllByText("1g.5gb");
      const profileButton = profileButtons[0].closest("button");
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });
  });

  describe("Command Preview", () => {
    it("should show nvidia-smi Commands section", () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText("nvidia-smi Commands")).toBeInTheDocument();
    });
  });

  describe("Profile Reference", () => {
    it("should show MIG Profile Reference section", () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByText("MIG Profile Reference")).toBeInTheDocument();
    });
  });

  describe("Apply Callback", () => {
    it("should show Apply button when instances configured and callback provided", () => {
      const onApply = vi.fn();
      render(
        <MIGConfigurator gpu={createMockGPU(0, true)} onApply={onApply} />,
      );

      // Add an instance first - use getAllByText
      const profileButtons = screen.getAllByText("1g.5gb");
      const profileButton = profileButtons[0].closest("button");
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      expect(screen.getByText("Apply Configuration")).toBeInTheDocument();
    });
  });
});

describe("SlurmJobVisualizer", () => {
  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: "Active",
    physicalState: "LinkUp",
    rate: 400,
    lid: portNumber,
    guid: `0x${portNumber.toString(16).padStart(16, "0")}`,
    linkLayer: "InfiniBand",
    errors: {
      symbolErrors: 0,
      linkDowned: 0,
      portRcvErrors: 0,
      portXmitDiscards: 0,
      portXmitWait: 0,
    },
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    id,
    devicePath: `/dev/infiniband/umad${id}`,
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    caType: "ConnectX-7",
    firmwareVersion: "22.35.1012",
    ports: [createMockPort(1), createMockPort(2)],
  });

  const createMockGPU = (id: number): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: "A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
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
  });

  const mockNodes: DGXNode[] = [
    {
      id: "dgx-00",
      hostname: "dgx-00.local",
      systemType: "DGX-A100",
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0)],
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
      slurmState: "alloc",
    },
    {
      id: "dgx-01",
      hostname: "dgx-01.local",
      systemType: "DGX-A100",
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i + 8)),
      dpus: [],
      hcas: [createMockHCA(1)],
      bmc: {
        ipAddress: "192.168.0.101",
        macAddress: "00:00:00:00:00:02",
        firmwareVersion: "1.2.3",
        manufacturer: "NVIDIA",
        sensors: [],
        powerState: "On",
      },
      cpuModel: "AMD EPYC 7742",
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 512,
      osVersion: "Ubuntu 22.04",
      kernelVersion: "5.15.0",
      nvidiaDriverVersion: "535.104.05",
      cudaVersion: "12.2",
      healthStatus: "OK",
      slurmState: "alloc",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component title", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/Slurm Job Placement/)).toBeInTheDocument();
    });

    it("should show job count summary in header", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // The header shows both running and pending counts
      expect(screen.getAllByText(/Running/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pending/).length).toBeGreaterThan(0);
    });
  });

  describe("Node Grid", () => {
    it("should display all nodes", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText("dgx-00.local")).toBeInTheDocument();
      expect(screen.getByText("dgx-01.local")).toBeInTheDocument();
    });

    it("should show node slurm state badges", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // These are state badges in the nodes
      expect(screen.getAllByText("alloc").length).toBeGreaterThan(0);
    });

    it("should display GPU allocation info", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Should show GPU allocation info for each node
      expect(
        screen.getAllByText(/GPUs allocated/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Job Queue", () => {
    it("should show Running Jobs section header", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Use heading role or more specific query
      const headings = screen.getAllByText("Running Jobs");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should show Pending Queue section header", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText("Pending Queue")).toBeInTheDocument();
    });
  });

  describe("Job Details", () => {
    it("should show job details when a job is selected", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Find a running job and click it
      const jobElement = screen.getByText("llama3_finetune").closest("div");
      if (jobElement) {
        fireEvent.click(jobElement);
      }

      expect(screen.getByText("Job Details")).toBeInTheDocument();
    });
  });

  describe("Slurm Commands", () => {
    it("should show squeue command example", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/squeue/)).toBeInTheDocument();
    });

    it("should show scontrol command example", () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/scontrol/)).toBeInTheDocument();
    });
  });

  describe("Single Node", () => {
    it("should handle single node cluster", () => {
      const singleNode = [mockNodes[0]];
      render(<SlurmJobVisualizer nodes={singleNode} />);

      expect(screen.getByText("dgx-00.local")).toBeInTheDocument();
      expect(screen.queryByText("dgx-01.local")).not.toBeInTheDocument();
    });
  });
});

describe("ClusterBuilder", () => {
  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: "Active",
    physicalState: "LinkUp",
    rate: 400,
    lid: portNumber,
    guid: `0x${portNumber.toString(16).padStart(16, "0")}`,
    linkLayer: "InfiniBand",
    errors: {
      symbolErrors: 0,
      linkDowned: 0,
      portRcvErrors: 0,
      portXmitDiscards: 0,
      portXmitWait: 0,
    },
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    id,
    devicePath: `/dev/infiniband/umad${id}`,
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    caType: "ConnectX-7",
    firmwareVersion: "22.35.1012",
    ports: [createMockPort(1), createMockPort(2)],
  });

  const createMockGPU = (id: number): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: "A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
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
  });

  const mockNodes: DGXNode[] = [
    {
      id: "dgx-00",
      hostname: "dgx-00.local",
      systemType: "DGX-A100",
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0)],
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
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component title", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText(/Cluster Builder/)).toBeInTheDocument();
    });

    it("should show Add Nodes section", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText("Add Nodes")).toBeInTheDocument();
    });

    it("should show node type options", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText("DGX A100")).toBeInTheDocument();
      expect(screen.getByText("DGX H100")).toBeInTheDocument();
      expect(screen.getByText("DGX B200")).toBeInTheDocument();
    });

    it("should show empty state when no nodes", () => {
      render(<ClusterBuilder />);

      expect(
        screen.getByText(/Click "Add Nodes" above to build your cluster/),
      ).toBeInTheDocument();
    });
  });

  describe("Node Operations", () => {
    it("should add a node when type is clicked", () => {
      render(<ClusterBuilder />);

      const addA100Button = screen.getByText("DGX A100").closest("button");
      if (addA100Button) {
        fireEvent.click(addA100Button);
      }

      // Should show node in canvas (via stats)
      expect(screen.getByText("1")).toBeInTheDocument(); // 1 node in stats
    });

    it("should show stats bar", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText("Nodes")).toBeInTheDocument();
      expect(screen.getByText("GPUs")).toBeInTheDocument();
      expect(screen.getByText("HCAs")).toBeInTheDocument();
      expect(screen.getByText("Connections")).toBeInTheDocument();
    });

    it("should show Reset button", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText("Reset")).toBeInTheDocument();
    });
  });

  describe("With Initial Nodes", () => {
    it("should render initial nodes", () => {
      render(<ClusterBuilder initialNodes={mockNodes} />);

      expect(screen.getByText("dgx-00")).toBeInTheDocument();
    });

    it("should show correct stats for initial nodes", () => {
      render(<ClusterBuilder initialNodes={mockNodes} />);

      // 1 node, 8 GPUs, 1 HCA
      const statsNumbers = screen.getAllByText("8");
      expect(statsNumbers.length).toBeGreaterThan(0); // 8 GPUs shown
    });
  });

  describe("Instructions", () => {
    it("should show instructions section", () => {
      render(<ClusterBuilder />);

      expect(screen.getByText("Instructions:")).toBeInTheDocument();
    });
  });
});

describe("IBCableTracer", () => {
  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: "Active",
    physicalState: "LinkUp",
    rate: 400,
    lid: portNumber,
    guid: `0x${portNumber.toString(16).padStart(16, "0")}`,
    linkLayer: "InfiniBand",
    errors: {
      symbolErrors: 0,
      linkDowned: 0,
      portRcvErrors: 0,
      portXmitDiscards: 0,
      portXmitWait: 0,
    },
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    id,
    devicePath: `/dev/infiniband/umad${id}`,
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    caType: "ConnectX-7",
    firmwareVersion: "22.35.1012",
    ports: [createMockPort(1), createMockPort(2)],
  });

  const createMockGPU = (id: number): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: "A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
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
  });

  const mockNodes: DGXNode[] = [
    {
      id: "dgx-00",
      hostname: "dgx-00.local",
      systemType: "DGX-A100",
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0), createMockHCA(1)],
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
    },
    {
      id: "dgx-01",
      hostname: "dgx-01.local",
      systemType: "DGX-A100",
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i + 8)),
      dpus: [],
      hcas: [createMockHCA(2), createMockHCA(3)],
      bmc: {
        ipAddress: "192.168.0.101",
        macAddress: "00:00:00:00:00:02",
        firmwareVersion: "1.2.3",
        manufacturer: "NVIDIA",
        sensors: [],
        powerState: "On",
      },
      cpuModel: "AMD EPYC 7742",
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 512,
      osVersion: "Ubuntu 22.04",
      kernelVersion: "5.15.0",
      nvidiaDriverVersion: "535.104.05",
      cudaVersion: "12.2",
      healthStatus: "OK",
      slurmState: "idle",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component title", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText(/InfiniBand Cable Tracer/)).toBeInTheDocument();
    });

    it("should show stats bar", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText("Total Cables")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Degraded")).toBeInTheDocument();
      expect(screen.getByText("Down")).toBeInTheDocument();
    });

    it("should show filter buttons", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByRole("button", { name: /All/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Issues/ }),
      ).toBeInTheDocument();
    });
  });

  describe("Path Tracing", () => {
    it("should show Trace Path section", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText("Trace Path")).toBeInTheDocument();
    });

    it("should show node selection dropdowns", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText("Select source node...")).toBeInTheDocument();
      expect(
        screen.getByText("Select destination node..."),
      ).toBeInTheDocument();
    });

    it("should show Trace button", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByRole("button", { name: /Trace/ })).toBeInTheDocument();
    });
  });

  describe("Cable Inventory", () => {
    it("should show Cable Inventory section", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText("Cable Inventory")).toBeInTheDocument();
    });

    it("should show cable entries", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      // Should show at least one cable between nodes
      expect(screen.getAllByText(/dgx-00/).length).toBeGreaterThan(0);
    });
  });

  describe("Commands Reference", () => {
    it("should show iblinkinfo command", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText(/iblinkinfo/)).toBeInTheDocument();
    });

    it("should show mlxcables command", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText(/mlxcables/)).toBeInTheDocument();
    });

    it("should show ibporterrors command", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      expect(screen.getByText(/ibporterrors/)).toBeInTheDocument();
    });
  });

  describe("Filter", () => {
    it("should switch to issues filter", () => {
      render(<IBCableTracer nodes={mockNodes} />);

      const issuesButton = screen.getByRole("button", { name: /Issues/ });
      fireEvent.click(issuesButton);

      // The button should now be active (has different background)
      expect(issuesButton).toHaveClass("bg-red-600");
    });
  });
});
