import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mock setup - these are available to vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockUpdateGPU,
  mockAddXIDError,
  mockUpdateNodeHealth,
  mockSetMIGMode,
  mockSetSlurmState,
  mockContextUpdateGPU,
  mockContextAddXIDError,
  mockInjectFault,
  mockSimulateWorkload,
  mockActiveContext,
  shared,
} = vi.hoisted(() => {
  // -- store mocks --
  const mockUpdateGPU = vi.fn();
  const mockAddXIDError = vi.fn();
  const mockUpdateNodeHealth = vi.fn();
  const mockSetMIGMode = vi.fn();
  const mockSetSlurmState = vi.fn();

  // -- scenario context mocks --
  const mockContextUpdateGPU = vi.fn();
  const mockContextAddXIDError = vi.fn();
  const mockContextUpdateNodeHealth = vi.fn();
  const mockContextSetMIGMode = vi.fn();
  const mockContextSetSlurmState = vi.fn();

  // -- metrics simulator mocks --
  const mockInjectFault = vi.fn(
    (gpu: Record<string, unknown>, _faultType: string) => ({
      ...gpu,
      healthStatus: "Critical",
    }),
  );
  const mockSimulateWorkload = vi.fn(
    (gpus: Array<Record<string, unknown>>, _pattern: string) =>
      gpus.map((gpu) => ({
        ...gpu,
        utilization: 95,
      })),
  );

  // -- shared mutable state --
  const shared: {
    activeContextReturn: unknown;
    currentCluster: unknown;
  } = {
    activeContextReturn: undefined,
    currentCluster: null, // will be set after createMockNode is defined
  };

  const mockActiveContext = {
    getCluster: vi.fn(() => shared.currentCluster),
    updateGPU: mockContextUpdateGPU,
    addXIDError: mockContextAddXIDError,
    updateNodeHealth: mockContextUpdateNodeHealth,
    setMIGMode: mockContextSetMIGMode,
    setSlurmState: mockContextSetSlurmState,
  };

  return {
    mockUpdateGPU,
    mockAddXIDError,
    mockUpdateNodeHealth,
    mockSetMIGMode,
    mockSetSlurmState,
    mockContextUpdateGPU,
    mockContextAddXIDError,
    mockContextUpdateNodeHealth,
    mockContextSetMIGMode,
    mockContextSetSlurmState,
    mockInjectFault,
    mockSimulateWorkload,
    mockActiveContext,
    shared,
  };
});

// ---------------------------------------------------------------------------
// vi.mock calls (hoisted above imports, reference hoisted variables)
// ---------------------------------------------------------------------------

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: Object.assign(
    vi.fn((selector?: (state: unknown) => unknown) => {
      const state = {
        cluster: shared.currentCluster,
        updateGPU: mockUpdateGPU,
        addXIDError: mockAddXIDError,
        updateNodeHealth: mockUpdateNodeHealth,
        setMIGMode: mockSetMIGMode,
        setSlurmState: mockSetSlurmState,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        cluster: shared.currentCluster,
        updateGPU: mockUpdateGPU,
        addXIDError: mockAddXIDError,
        updateNodeHealth: mockUpdateNodeHealth,
        setMIGMode: mockSetMIGMode,
        setSlurmState: mockSetSlurmState,
      })),
    },
  ),
}));

vi.mock("@/store/scenarioContext", () => ({
  scenarioContextManager: {
    getActiveContext: vi.fn(() => shared.activeContextReturn),
  },
}));

vi.mock("@/utils/metricsSimulator", () => ({
  MetricsSimulator: vi.fn().mockImplementation(() => ({
    injectFault: mockInjectFault,
    simulateWorkload: mockSimulateWorkload,
  })),
}));

vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = (props: any) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    AlertTriangle: createIcon("AlertTriangle"),
    Zap: createIcon("Zap"),
    Thermometer: createIcon("Thermometer"),
    Link2: createIcon("Link2"),
    Cpu: createIcon("Cpu"),
    RotateCcw: createIcon("RotateCcw"),
    Ban: createIcon("Ban"),
    Radio: createIcon("Radio"),
    Flame: createIcon("Flame"),
    AlertOctagon: createIcon("AlertOctagon"),
    Info: createIcon("Info"),
    ChevronDown: createIcon("ChevronDown"),
    ChevronUp: createIcon("ChevronUp"),
    X: createIcon("X"),
  };
});

vi.mock("@/store/faultToastStore", () => ({
  useFaultToastStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })),
  }),
}));

// ---------------------------------------------------------------------------
// Import the component under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { FaultInjection } from "../FaultInjection";

// ---------------------------------------------------------------------------
// Mock data factory helpers
// ---------------------------------------------------------------------------

function createMockGPU(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    uuid: `GPU-${String(id).padStart(4, "0")}`,
    name: "NVIDIA A100-SXM4-80GB",
    type: "A100-80GB",
    pciAddress: `00000000:${(0x10 + id).toString(16).padStart(2, "0")}:00.0`,
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
    nvlinks: [
      {
        linkId: 0,
        status: "Active",
        speed: 600,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
      {
        linkId: 1,
        status: "Active",
        speed: 600,
        txErrors: 0,
        rxErrors: 0,
        replayErrors: 0,
      },
    ],
    healthStatus: "OK",
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  };
}

function createMockNode(id: string, hostname: string, gpuCount: number = 2) {
  return {
    id,
    hostname,
    systemType: "DGX-A100",
    gpus: Array.from({ length: gpuCount }, (_, i) => createMockGPU(i)),
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "10.0.0.1",
      macAddress: "00:00:00:00:00:01",
      firmwareVersion: "1.0.0",
      manufacturer: "NVIDIA",
      powerState: "On",
      sensors: [],
    },
    cpuModel: "AMD EPYC 7742",
    cpuCount: 128,
    ramTotal: 1024,
    ramUsed: 256,
    osVersion: "Ubuntu 22.04.3 LTS",
    kernelVersion: "5.15.0-91-generic",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
  };
}

const mockNode0 = createMockNode("dgx-00", "dgx-00.local", 2);
const mockNode1 = createMockNode("dgx-01", "dgx-01.local", 4);

const mockCluster = {
  name: "Test Cluster",
  nodes: [mockNode0, mockNode1],
  fabricTopology: "FatTree",
  bcmHA: {
    enabled: true,
    primary: "bcm-01",
    secondary: "bcm-02",
    state: "Active",
  },
  slurmConfig: { controlMachine: "slurm-ctrl", partitions: ["dgx"] },
};

// Set the initial cluster value
shared.currentCluster = mockCluster;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("FaultInjection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.activeContextReturn = undefined;
    shared.currentCluster = mockCluster;
    // Re-set mockActiveContext.getCluster default
    mockActiveContext.getCluster.mockReturnValue(mockCluster);
  });

  // =========================================================================
  // Rendering
  // =========================================================================

  describe("Rendering", () => {
    it("should render the fault injection panel with heading", () => {
      render(<FaultInjection />);
      expect(
        screen.getByText("Fault Injection Training System"),
      ).toBeInTheDocument();
    });

    it("should render the safe-environment description text", () => {
      render(<FaultInjection />);
      expect(
        screen.getByText(/Inject faults and simulate workloads/),
      ).toBeInTheDocument();
      expect(screen.getByText(/safe training environment/)).toBeInTheDocument();
    });

    it("should render all basic fault injection buttons", () => {
      render(<FaultInjection />);

      expect(screen.getByText("XID Error")).toBeInTheDocument();
      expect(screen.getByText("ECC Error")).toBeInTheDocument();
      expect(screen.getByText("Thermal Issue")).toBeInTheDocument();
      expect(screen.getByText("NVLink Down")).toBeInTheDocument();
      expect(screen.getByText("Power Issue")).toBeInTheDocument();
      expect(screen.getByText("PCIe Error")).toBeInTheDocument();
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    it("should render fault type descriptions", () => {
      render(<FaultInjection />);

      expect(screen.getByText("Critical GPU fault")).toBeInTheDocument();
      expect(screen.getByText("Memory error")).toBeInTheDocument();
      expect(screen.getByText("High temperature")).toBeInTheDocument();
      expect(screen.getByText("Link degradation")).toBeInTheDocument();
      expect(screen.getByText("Power limit exceeded")).toBeInTheDocument();
      expect(screen.getByText("Bus communication fault")).toBeInTheDocument();
      expect(screen.getByText("Reset to healthy")).toBeInTheDocument();
    });

    it("should render complex training scenario buttons", () => {
      render(<FaultInjection />);

      expect(
        screen.getByText("Complex Training Scenarios"),
      ).toBeInTheDocument();
      expect(screen.getByText("GPU Hang")).toBeInTheDocument();
      expect(screen.getByText("Bus Reset")).toBeInTheDocument();
      expect(screen.getByText("Thermal Alert")).toBeInTheDocument();
      expect(screen.getByText("Severe ECC Error")).toBeInTheDocument();
    });

    it("should render complex scenario descriptions", () => {
      render(<FaultInjection />);

      expect(
        screen.getByText("XID 43 - GPU stopped responding"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("XID 79 - GPU fallen off bus"),
      ).toBeInTheDocument();
      expect(screen.getByText(/All GPUs running hot/)).toBeInTheDocument();
      expect(
        screen.getByText(/Uncorrectable - GPU replacement needed/),
      ).toBeInTheDocument();
    });

    it("should render the diagnostic commands section with suggested commands", () => {
      render(<FaultInjection />);

      expect(
        screen.getByText("Diagnostic Commands by Category:"),
      ).toBeInTheDocument();
      expect(screen.getByText(/nvidia-smi$/)).toBeInTheDocument();
      expect(screen.getByText("nvsm show health")).toBeInTheDocument();
      expect(screen.getByText("dcgmi diag -r 1")).toBeInTheDocument();
      expect(screen.getByText("dmesg | grep -i xid")).toBeInTheDocument();
      expect(screen.getByText("ipmitool sensor list")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Node Selection
  // =========================================================================

  describe("Node Selection", () => {
    it("should render Select Node label and dropdown", () => {
      render(<FaultInjection />);

      expect(screen.getByText("Select Node")).toBeInTheDocument();
      const nodeSelect = screen.getByDisplayValue("dgx-00.local (dgx-00)");
      expect(nodeSelect).toBeInTheDocument();
    });

    it("should display all cluster nodes as dropdown options", () => {
      render(<FaultInjection />);

      expect(screen.getByText("dgx-00.local (dgx-00)")).toBeInTheDocument();
      expect(screen.getByText("dgx-01.local (dgx-01)")).toBeInTheDocument();
    });

    it("should update selected node when dropdown changes", () => {
      render(<FaultInjection />);

      const nodeSelect = screen.getByDisplayValue("dgx-00.local (dgx-00)");
      fireEvent.change(nodeSelect, { target: { value: "dgx-01" } });

      expect((nodeSelect as HTMLSelectElement).value).toBe("dgx-01");
    });

    it("should reset GPU selection to 0 when node changes", () => {
      render(<FaultInjection />);

      // First select GPU 1
      const gpuSelect = screen.getByDisplayValue(
        "GPU 0: NVIDIA A100-SXM4-80GB",
      );
      fireEvent.change(gpuSelect, { target: { value: "1" } });
      expect((gpuSelect as HTMLSelectElement).value).toBe("1");

      // Now change node - GPU should reset to 0
      const nodeSelect = screen.getByDisplayValue("dgx-00.local (dgx-00)");
      fireEvent.change(nodeSelect, { target: { value: "dgx-01" } });

      // The GPU select should now show GPU 0
      const updatedGpuSelect = screen.getByDisplayValue(
        "GPU 0: NVIDIA A100-SXM4-80GB",
      );
      expect(updatedGpuSelect).toBeInTheDocument();
    });
  });

  // =========================================================================
  // GPU Selection
  // =========================================================================

  describe("GPU Selection", () => {
    it("should render Select GPU label and dropdown", () => {
      render(<FaultInjection />);

      expect(screen.getByText("Select GPU")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("GPU 0: NVIDIA A100-SXM4-80GB"),
      ).toBeInTheDocument();
    });

    it("should list GPUs for the selected node", () => {
      render(<FaultInjection />);

      // dgx-00 has 2 GPUs by default
      const gpuSelect = screen.getByDisplayValue(
        "GPU 0: NVIDIA A100-SXM4-80GB",
      );
      const options = gpuSelect.querySelectorAll("option");
      expect(options).toHaveLength(2);
    });

    it("should update GPU list when node changes to one with more GPUs", () => {
      render(<FaultInjection />);

      // Switch to dgx-01 which has 4 GPUs
      const nodeSelect = screen.getByDisplayValue("dgx-00.local (dgx-00)");
      fireEvent.change(nodeSelect, { target: { value: "dgx-01" } });

      // Now query all GPU options from the GPU select
      const gpuSelects = screen.getAllByRole("combobox");
      const gpuSelect = gpuSelects[1]; // second combobox is GPU selection
      const options = gpuSelect.querySelectorAll("option");
      expect(options).toHaveLength(4);
    });

    it("should update selected GPU when dropdown changes", () => {
      render(<FaultInjection />);

      const gpuSelect = screen.getByDisplayValue(
        "GPU 0: NVIDIA A100-SXM4-80GB",
      );
      fireEvent.change(gpuSelect, { target: { value: "1" } });
      expect((gpuSelect as HTMLSelectElement).value).toBe("1");
    });
  });

  // =========================================================================
  // Basic Fault Injection (via MetricsSimulator)
  // =========================================================================

  describe("Basic Fault Injection", () => {
    it("should call injectFault with 'xid' and updateGPU when XID Error clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("XID Error"));

      expect(mockInjectFault).toHaveBeenCalledTimes(1);
      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "xid",
      );
      expect(mockUpdateGPU).toHaveBeenCalledTimes(1);
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ healthStatus: "Critical" }),
      );
    });

    it("should call injectFault with 'ecc' when ECC Error clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("ECC Error"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "ecc",
      );
    });

    it("should call injectFault with 'thermal' when Thermal Issue clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Thermal Issue"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "thermal",
      );
    });

    it("should call injectFault with 'nvlink' when NVLink Down clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("NVLink Down"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "nvlink",
      );
    });

    it("should call injectFault with 'power' when Power Issue clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Power Issue"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "power",
      );
    });

    it("should call injectFault with 'pcie' when PCIe Error clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("PCIe Error"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0 }),
        "pcie",
      );
    });

    it("should inject fault to the selected GPU, not always GPU 0", () => {
      render(<FaultInjection />);

      // Select GPU 1
      const gpuSelect = screen.getByDisplayValue(
        "GPU 0: NVIDIA A100-SXM4-80GB",
      );
      fireEvent.change(gpuSelect, { target: { value: "1" } });

      fireEvent.click(screen.getByText("XID Error"));

      expect(mockInjectFault).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        "xid",
      );
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        1,
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Clear Faults
  // =========================================================================

  describe("Clear Faults", () => {
    it("should reset all GPUs on the selected node when Clear All clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Clear All"));

      // dgx-00 has 2 GPUs, so updateGPU should be called for each
      expect(mockUpdateGPU).toHaveBeenCalledTimes(2);
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          xidErrors: [],
          healthStatus: "OK",
          temperature: 65,
          utilization: 5,
        }),
      );
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        1,
        expect.objectContaining({
          xidErrors: [],
          healthStatus: "OK",
          temperature: 65,
          utilization: 5,
        }),
      );
    });

    it("should reset ECC errors when Clear All is clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Clear All"));

      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        expect.any(Number),
        expect.objectContaining({
          eccErrors: {
            singleBit: 0,
            doubleBit: 0,
            aggregated: { singleBit: 0, doubleBit: 0 },
          },
        }),
      );
    });

    it("should reset NVLink statuses to Active when Clear All is clicked", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Clear All"));

      const calls = mockUpdateGPU.mock.calls;
      const firstGPUUpdate = calls[0][2];
      expect(firstGPUUpdate.nvlinks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: "Active",
            txErrors: 0,
            rxErrors: 0,
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // Complex Training Scenarios
  // =========================================================================

  describe("Complex Training Scenarios", () => {
    it("should inject GPU hang with XID 43 error", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("GPU Hang"));

      expect(mockAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          code: 43,
          description: "GPU has fallen off the bus",
          severity: "Critical",
        }),
      );
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          utilization: 0,
          healthStatus: "Critical",
        }),
      );
    });

    it("should inject bus reset with XID 79 error", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Bus Reset"));

      expect(mockAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          code: 79,
          description: "GPU has fallen off the bus",
          severity: "Critical",
        }),
      );
      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ healthStatus: "Critical" }),
      );
    });

    it("should inject thermal alert on ALL GPUs of the selected node", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Thermal Alert"));

      // dgx-00 has 2 GPUs; thermal alert affects all of them
      expect(mockUpdateGPU).toHaveBeenCalledTimes(2);

      for (const call of mockUpdateGPU.mock.calls) {
        expect(call[0]).toBe("dgx-00");
        const updates = call[2];
        expect(updates.temperature).toBeGreaterThanOrEqual(90);
        expect(updates.temperature).toBeLessThanOrEqual(100);
        expect(updates.healthStatus).toBe("Warning");
      }
    });

    it("should inject severe ECC error with XID 63", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Severe ECC Error"));

      expect(mockUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          eccErrors: expect.objectContaining({
            singleBit: 1500,
            doubleBit: 50,
          }),
          healthStatus: "Critical",
        }),
      );
      expect(mockAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({
          code: 63,
          description: expect.stringContaining("Uncorrectable ECC error"),
          severity: "Critical",
        }),
      );
    });
  });

  // =========================================================================
  // Workload Simulation
  // =========================================================================

  describe("Workload Simulation", () => {
    it("should render workload pattern dropdown and Apply Workload button", () => {
      render(<FaultInjection />);

      expect(screen.getByText("Simulate Workloads")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Idle (5% utilization)"),
      ).toBeInTheDocument();
      expect(screen.getByText("Apply Workload")).toBeInTheDocument();
    });

    it("should render all workload pattern options", () => {
      render(<FaultInjection />);

      expect(screen.getByText("Idle (5% utilization)")).toBeInTheDocument();
      expect(
        screen.getByText("Inference (60% utilization)"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Training (95% utilization)"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Stress Test (100% utilization)"),
      ).toBeInTheDocument();
    });

    it("should call simulateWorkload with selected pattern when Apply Workload clicked", () => {
      render(<FaultInjection />);

      // Change pattern to training
      const workloadSelect = screen.getByDisplayValue("Idle (5% utilization)");
      fireEvent.change(workloadSelect, { target: { value: "training" } });

      fireEvent.click(screen.getByText("Apply Workload"));

      expect(mockSimulateWorkload).toHaveBeenCalledWith(
        expect.any(Array),
        "training",
      );
    });

    it("should call updateGPU for each GPU after workload simulation", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Apply Workload"));

      // dgx-00 has 2 GPUs, so updateGPU is called for each
      expect(mockUpdateGPU).toHaveBeenCalledTimes(2);
    });

    it("should use idle pattern by default", () => {
      render(<FaultInjection />);

      fireEvent.click(screen.getByText("Apply Workload"));

      expect(mockSimulateWorkload).toHaveBeenCalledWith(
        expect.any(Array),
        "idle",
      );
    });
  });

  // =========================================================================
  // Scenario Context Routing
  // =========================================================================

  describe("Scenario Context Routing", () => {
    it("should route fault injection to global store when no active context", () => {
      shared.activeContextReturn = undefined;

      render(<FaultInjection />);
      fireEvent.click(screen.getByText("XID Error"));

      expect(mockUpdateGPU).toHaveBeenCalled();
      expect(mockContextUpdateGPU).not.toHaveBeenCalled();
    });

    it("should route fault injection to ScenarioContext when active", () => {
      shared.activeContextReturn = mockActiveContext;

      render(<FaultInjection />);
      fireEvent.click(screen.getByText("XID Error"));

      expect(mockContextUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ healthStatus: "Critical" }),
      );
      // Global store should NOT be called
      expect(mockUpdateGPU).not.toHaveBeenCalled();
    });

    it("should route complex scenarios to ScenarioContext when active", () => {
      shared.activeContextReturn = mockActiveContext;

      render(<FaultInjection />);
      fireEvent.click(screen.getByText("GPU Hang"));

      expect(mockContextAddXIDError).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ code: 43 }),
      );
      expect(mockContextUpdateGPU).toHaveBeenCalledWith(
        "dgx-00",
        0,
        expect.objectContaining({ utilization: 0, healthStatus: "Critical" }),
      );
    });

    it("should route Clear All to ScenarioContext when active", () => {
      shared.activeContextReturn = mockActiveContext;

      render(<FaultInjection />);
      fireEvent.click(screen.getByText("Clear All"));

      // Should have called context updateGPU for each GPU
      expect(mockContextUpdateGPU).toHaveBeenCalledTimes(2);
      expect(mockUpdateGPU).not.toHaveBeenCalled();
    });

    it("should route workload simulation to ScenarioContext when active", () => {
      shared.activeContextReturn = mockActiveContext;

      render(<FaultInjection />);
      fireEvent.click(screen.getByText("Apply Workload"));

      expect(mockContextUpdateGPU).toHaveBeenCalledTimes(2);
      expect(mockUpdateGPU).not.toHaveBeenCalled();
    });

    it("should read cluster from ScenarioContext when active context exists", () => {
      const scenarioCluster = {
        ...mockCluster,
        nodes: [createMockNode("scenario-node", "scenario-node.local", 1)],
      };
      mockActiveContext.getCluster.mockReturnValue(scenarioCluster);
      shared.activeContextReturn = mockActiveContext;

      render(<FaultInjection />);

      expect(
        screen.getByText("scenario-node.local (scenario-node)"),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle empty nodes array without crashing", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shared.currentCluster = { ...mockCluster, nodes: [] } as any;

      // Should render without errors
      const { container } = render(<FaultInjection />);
      expect(container).toBeInTheDocument();

      // Should not crash when clicking inject with no nodes
      fireEvent.click(screen.getByText("XID Error"));
      expect(mockInjectFault).not.toHaveBeenCalled();
    });

    it("should render the 'Basic Fault Injection' section heading", () => {
      render(<FaultInjection />);
      expect(screen.getByText("Basic Fault Injection")).toBeInTheDocument();
    });

    it("should render advanced practice description text", () => {
      render(<FaultInjection />);
      expect(
        screen.getByText(/Realistic multi-symptom failure scenarios/),
      ).toBeInTheDocument();
    });

    it("should render section headings for all three areas", () => {
      render(<FaultInjection />);
      expect(screen.getByText("Basic Fault Injection")).toBeInTheDocument();
      expect(
        screen.getByText("Complex Training Scenarios"),
      ).toBeInTheDocument();
      expect(screen.getByText("Simulate Workloads")).toBeInTheDocument();
    });
  });
});
