import { describe, it, expect, beforeEach, vi } from "vitest";
import { PciToolsSimulator } from "../pciToolsSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import type { GPU, DGXNode, ClusterConfig } from "@/types/hardware";

// Mock the store (needed by BaseSimulator constructor / initializeDefinitionRegistry)
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({ cluster: { nodes: [] } })),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockGPU = (id: number, overrides?: Partial<GPU>): GPU => ({
  id,
  uuid: `GPU-${id}-uuid`,
  name: "H100-SXM5-80GB",
  type: "H100-SXM",
  pciAddress: `0000:${(0x10 + id).toString(16).padStart(2, "0")}:00.0`,
  temperature: 45,
  powerDraw: 300,
  powerLimit: 700,
  memoryTotal: 81920,
  memoryUsed: 0,
  utilization: 0,
  clocksSM: 1980,
  clocksMem: 2619,
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
});

const createMockNode = (overrides?: Partial<DGXNode>): DGXNode =>
  ({
    id: "dgx-00",
    hostname: "dgx-01",
    systemType: "DGX-H100",
    gpus: [createMockGPU(0), createMockGPU(1)],
    dpus: [],
    hcas: [
      {
        id: 0,
        devicePath: "/dev/infiniband/mlx5_0",
        caType: "mlx5_0",
        model: "ConnectX-7",
        firmwareVersion: "28.39.1002",
        ports: [],
      },
    ],
    bmc: {
      ipAddress: "10.0.0.1",
      macAddress: "00:11:22:33:44:55",
      firmwareVersion: "1.0.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "AMD EPYC 9454",
    cpuCount: 2,
    ramTotal: 2048,
    ramUsed: 128,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0-91-generic",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
    ...overrides,
  }) as DGXNode;

const createMockCluster = (nodes?: DGXNode[]): ClusterConfig => ({
  name: "test-cluster",
  nodes: nodes || [createMockNode()],
  fabricTopology: "FatTree",
  bcmHA: {
    enabled: false,
    primary: "bcm-01",
    secondary: "bcm-02",
    state: "Active",
  },
  slurmConfig: {
    controlMachine: "slurm-ctrl",
    partitions: ["gpu"],
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PciToolsSimulator", () => {
  let simulator: PciToolsSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new PciToolsSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
      cluster: createMockCluster(),
    };
  });

  // =========================================================================
  // lspci tests
  // =========================================================================

  describe("lspci", () => {
    it("should list GPU devices with PCI addresses", () => {
      const result = simulator.execute(parse("lspci"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("3D controller");
      expect(result.output).toContain("NVIDIA Corporation");
      expect(result.output).toContain("H100-SXM5-80GB");
    });

    it("should list both GPU and HCA devices", () => {
      const result = simulator.execute(parse("lspci"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("3D controller");
      expect(result.output).toContain("InfiniBand");
      expect(result.output).toContain("ConnectX-7");
    });

    it("should show GPU PCI addresses in the output", () => {
      const result = simulator.execute(parse("lspci"), context);
      expect(result.output).toContain("0000:10:00.0");
      expect(result.output).toContain("0000:11:00.0");
    });

    it("-v should include subsystem info", () => {
      const result = simulator.execute(parse("lspci -v"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Subsystem: NVIDIA Corporation");
      expect(result.output).toContain("Control:");
      expect(result.output).toContain("Status:");
      expect(result.output).toContain("Latency:");
      expect(result.output).toContain("Interrupt:");
      expect(result.output).toContain("Memory at");
    });

    it("-vv should include link status in addition to subsystem info", () => {
      const result = simulator.execute(parse("lspci -vv"), context);
      expect(result.exitCode).toBe(0);
      // Should have all the -v output
      expect(result.output).toContain("Subsystem:");
      // And additionally link status
      expect(result.output).toContain("LnkCap:");
      expect(result.output).toContain("LnkSta:");
      expect(result.output).toContain("Speed 16GT/s");
      expect(result.output).toContain("Width x16");
    });

    it("-v should NOT include link status", () => {
      const result = simulator.execute(parse("lspci -v"), context);
      expect(result.output).not.toContain("LnkCap:");
      expect(result.output).not.toContain("LnkSta:");
    });

    it("-d 10de: should filter to NVIDIA devices only", () => {
      const result = simulator.execute(parse("lspci -d 10de:"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA");
      expect(result.output).not.toContain("InfiniBand");
      expect(result.output).not.toContain("ConnectX");
    });

    it("should show XID error state in verbose output (cross-tool fault propagation)", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("lspci -v"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Device is in error state (XID 79)");
    });

    it("should show thermal throttling warning in verbose output", () => {
      const hotGPU = createMockGPU(0, { temperature: 92 });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [hotGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("lspci -v"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Thermal throttling active (92C)");
    });

    it("should NOT show thermal warning when temperature is normal", () => {
      const result = simulator.execute(parse("lspci -v"), context);
      expect(result.output).not.toContain("Thermal throttling");
    });

    it("should NOT show XID error annotation without verbose flag", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("lspci"), context);
      expect(result.output).not.toContain("error state");
    });

    it("should return 'No PCI devices found' when no node available", () => {
      context.cluster = createMockCluster([]);
      context.currentNode = "nonexistent";
      const result = simulator.execute(parse("lspci"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No PCI devices found");
    });
  });

  // =========================================================================
  // journalctl tests
  // =========================================================================

  describe("journalctl", () => {
    it("-b should show boot log entries", () => {
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Logs begin at");
      expect(result.output).toContain("kernel:");
      expect(result.output).toContain("systemd[1]:");
    });

    it("-k should show kernel messages", () => {
      const result = simulator.execute(parse("journalctl -k"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("kernel:");
      expect(result.output).toContain("NVRM:");
    });

    it("-u nvidia-fabricmanager should show unit-specific logs", () => {
      const result = simulator.execute(
        parse("journalctl -u nvidia-fabricmanager"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia");
    });

    it("-u slurmd should show slurm daemon logs", () => {
      const result = simulator.execute(parse("journalctl -u slurmd"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("slurmd");
      expect(result.output).toContain("gres/gpu count: 8");
    });

    it("-p err should filter to error-priority messages", () => {
      // No errors in default state
      const result = simulator.execute(parse("journalctl -p err"), context);
      expect(result.exitCode).toBe(0);
      // With no faults, NVRM boot messages still match the filter
      // because they contain "NVRM:"
      const output = result.output;
      expect(output).toContain("NVRM:");
    });

    it("-p err should show XID errors when present", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("journalctl -p err"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Xid");
      expect(result.output).toContain("79");
      expect(result.output).toContain("fallen");
    });

    it("-p warning should show thermal warnings", () => {
      const hotGPU = createMockGPU(0, { temperature: 90 });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [hotGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("journalctl -p warning"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("slowdown");
    });

    it("timestamp format should match MMM DD HH:MM:SS pattern", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:45Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      // The timestamp from the XID error should be in MMM DD HH:MM:SS format
      // The exact hour depends on the test runner timezone, but the format should match
      const timestampPattern = /[A-Z][a-z]{2} \d{2} \d{2}:\d{2}:\d{2}/;
      expect(result.output).toMatch(timestampPattern);
    });

    it("XID errors should include pid and channel info", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toMatch(/pid=\d+/);
      expect(result.output).toMatch(/Ch [0-9a-f]{8}/);
    });

    it("XID 79 should include 'fallen off the bus' follow-up message", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 79,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU has fallen off the bus",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("has fallen off the bus");
      expect(result.output).toContain("GPU crash dump has been created");
    });

    it("XID 74 should include NVLink fatal error follow-up", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 74,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "NVLink error",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("NVLink: Fatal error detected on link");
    });

    it("XID 48 should include double-bit ECC error follow-up", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 48,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "DBE ECC error",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("DBE (double-bit error) ECC error");
    });

    it("XID 63 should include row remapping exhausted follow-up", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 63,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "Row remapping failure",
            severity: "Warning",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("Row remapping resources exhausted");
    });

    it("XID 43 should include GPU hung follow-up", () => {
      const faultyGPU = createMockGPU(0, {
        xidErrors: [
          {
            code: 43,
            timestamp: new Date("2024-06-15T10:30:00Z"),
            description: "GPU exception",
            severity: "Critical",
          },
        ],
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [faultyGPU] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("GPU likely hung");
    });

    it("should show clean output when no faults exist", () => {
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("All 8 GPUs initialized successfully");
      expect(result.output).toContain("Reached target Multi-User System");
      expect(result.output).not.toContain("Xid");
      expect(result.output).not.toContain("fallen");
    });

    it("should show ECC double-bit error in logs", () => {
      const eccGPU = createMockGPU(0, {
        eccErrors: {
          singleBit: 0,
          doubleBit: 3,
          aggregated: { singleBit: 0, doubleBit: 3 },
        },
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [eccGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("DOUBLE-BIT ECC error detected");
      expect(result.output).toContain("count: 3");
    });

    it("should show ECC single-bit error in logs", () => {
      const eccGPU = createMockGPU(0, {
        eccErrors: {
          singleBit: 5,
          doubleBit: 0,
          aggregated: { singleBit: 5, doubleBit: 0 },
        },
      });
      context.cluster = createMockCluster([
        createMockNode({ gpus: [eccGPU, createMockGPU(1)] }),
      ]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("single-bit ECC error corrected");
      expect(result.output).toContain("count: 5");
    });

    it("should show thermal warning in logs for hot GPU", () => {
      const hotGPU = createMockGPU(0, { temperature: 95 });
      context.cluster = createMockCluster([createMockNode({ gpus: [hotGPU] })]);

      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("temperature (95C)");
      expect(result.output).toContain("slowdown threshold");
    });

    it("should NOT show thermal warning for normal temperature GPU", () => {
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).not.toContain("slowdown threshold");
    });

    it("should return error when no node is found", () => {
      context.cluster = createMockCluster([]);
      context.currentNode = "nonexistent";
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("No node found");
    });

    it("should include hostname in log entries", () => {
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("dgx-01");
    });

    it("boot messages should show GPU initialization for 8 GPUs", () => {
      const result = simulator.execute(parse("journalctl -b"), context);
      expect(result.output).toContain("GPU Ready");
      // Should have 8 GPU init messages
      const gpuReadyCount = (result.output.match(/GPU Ready/g) || []).length;
      expect(gpuReadyCount).toBe(8);
    });
  });

  // =========================================================================
  // General / meta tests
  // =========================================================================

  describe("general", () => {
    it("--version should return version info", () => {
      const result = simulator.execute(parse("lspci --version"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("version");
    });

    it("--help should return help text", () => {
      const result = simulator.execute(parse("lspci --help"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("lspci");
      expect(result.output).toContain("journalctl");
    });

    it("unknown base command should return error", () => {
      const parsed = parse("unknownpci");
      parsed.baseCommand = "unknownpci";
      const result = simulator.execute(parsed, context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Unknown PCI tool");
    });
  });
});
