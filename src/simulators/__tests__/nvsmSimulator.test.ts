import { describe, it, expect, beforeEach, vi } from "vitest";
import { NvsmSimulator } from "../nvsmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import type {
  DGXNode,
  GPU,
  NVLinkConnection,
  XIDError,
} from "@/types/hardware";

// Mock the store
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
      cluster: {
        nodes: [],
      },
    })),
  },
}));

/**
 * Helper: strip ANSI escape codes from a string so we can measure visible width
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Create a healthy GPU with configurable overrides
 */
function makeGpu(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    name: "NVIDIA H100 80GB HBM3",
    type: "H100-SXM",
    uuid: "GPU-12345678-1234-1234-1234-123456789012",
    pciAddress: "0000:17:00.0",
    temperature: 45,
    powerDraw: 250,
    powerLimit: 700,
    memoryTotal: 81920,
    memoryUsed: 1024,
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
  };
}

/**
 * Create an NVLink connection
 */
function makeNvlink(
  overrides: Partial<NVLinkConnection> = {},
): NVLinkConnection {
  return {
    linkId: 0,
    status: "Active",
    speed: 900,
    txErrors: 0,
    rxErrors: 0,
    replayErrors: 0,
    ...overrides,
  };
}

/**
 * Create a DGX node with configurable GPUs
 */
function makeNode(overrides: Partial<DGXNode> = {}): DGXNode {
  return {
    id: "dgx-00",
    hostname: "dgx-node01",
    systemType: "DGX-H100",
    gpus: [
      makeGpu({ id: 0 }),
      makeGpu({
        id: 1,
        pciAddress: "0000:18:00.0",
        uuid: "GPU-12345678-1234-1234-1234-123456789013",
      }),
    ],
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "10.0.0.1",
      macAddress: "aa:bb:cc:dd:ee:ff",
      firmwareVersion: "1.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "AMD EPYC 9534",
    cpuCount: 2,
    ramTotal: 2048,
    ramUsed: 128,
    osVersion: "Ubuntu 22.04.3 LTS",
    kernelVersion: "5.15.0-86-generic",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    healthStatus: "OK",
    slurmState: "idle",
    ...overrides,
  };
}

function makeContext(node: DGXNode): CommandContext {
  return {
    currentNode: node.id,
    currentPath: "/root",
    environment: {},
    history: [],
    cluster: {
      name: "test-cluster",
      nodes: [node],
      fabricTopology: "FatTree",
      bcmHA: { enabled: false, primary: "", secondary: "", state: "Active" },
      slurmConfig: { controlMachine: "head", partitions: ["gpu"] },
    },
  };
}

describe("NvsmSimulator", () => {
  let simulator: NvsmSimulator;
  let context: CommandContext;
  let node: DGXNode;

  beforeEach(() => {
    simulator = new NvsmSimulator();
    node = makeNode();
    context = makeContext(node);
  });

  // =============================================
  // Health Check Tests
  // =============================================
  describe("show health", () => {
    it("should produce output with health check lines", () => {
      const result = simulator.execute(parse("nvsm show health"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Checks");
      expect(result.output).toContain("------");
      expect(result.output).toContain("Health Summary");
    });

    it("should include per-GPU detail when --detailed is passed", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // Detailed mode shows all checks, including NVLink checks for all GPUs
      expect(result.output).toContain("Checks");
      expect(result.output).toContain("Health Summary");
      // Should NOT contain the truncation message
      expect(result.output).not.toContain("more checks");
    });

    it("should truncate to 20 checks without --detailed flag", () => {
      // Create a node with many GPUs to generate >20 checks
      const gpus = Array.from({ length: 8 }, (_, i) =>
        makeGpu({
          id: i,
          pciAddress: `0000:${(0x17 + i).toString(16).padStart(2, "0")}:00.0`,
          uuid: `GPU-${i.toString().padStart(8, "0")}-0000-0000-0000-000000000000`,
          nvlinks: [makeNvlink({ linkId: 0 }), makeNvlink({ linkId: 1 })],
        }),
      );
      const bigNode = makeNode({ gpus });
      const bigContext = makeContext(bigNode);

      const result = simulator.execute(parse("nvsm show health"), bigContext);
      expect(result.output).toContain("more checks");
    });

    it("should show GPU temperature checks for each GPU", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("GPU temperature [GPU0]");
      expect(result.output).toContain("GPU temperature [GPU1]");
    });

    it("should show GPU ECC status checks for each GPU", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("GPU ECC status [GPU0]");
      expect(result.output).toContain("GPU ECC status [GPU1]");
    });

    it("should show GPU utilization-related link speed checks", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("GPU link speed");
      expect(result.output).toContain("GPU link width");
    });

    it("should show NVLink checks when GPUs have NVLinks", () => {
      const nvlinks = [makeNvlink({ linkId: 0 }), makeNvlink({ linkId: 1 })];
      const nodeWithLinks = makeNode({
        gpus: [makeGpu({ id: 0, nvlinks })],
      });
      const ctx = makeContext(nodeWithLinks);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("NVLink 0 status [GPU0]");
      expect(result.output).toContain("NVLink 1 status [GPU0]");
    });

    it("should show XID error check for each GPU", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("GPU XID error check [GPU0]");
      expect(result.output).toContain("GPU XID error check [GPU1]");
    });

    it("should show InfiniBand port checks when HCAs are present", () => {
      const nodeWithHCA = makeNode({
        hcas: [
          {
            id: 0,
            devicePath: "/dev/infiniband/mlx5_0",
            caType: "ConnectX-7",
            model: "ConnectX-7",
            firmwareVersion: "28.37.1010",
            ports: [
              {
                portNumber: 1,
                state: "Active",
                physicalState: "LinkUp",
                rate: 400,
                lid: 1,
                guid: "0x0000000000000001",
                linkLayer: "InfiniBand",
                errors: {
                  symbolErrors: 0,
                  linkDowned: 0,
                  portRcvErrors: 0,
                  portXmitDiscards: 0,
                  portXmitWait: 0,
                },
              },
            ],
          },
        ],
      });
      const ctx = makeContext(nodeWithHCA);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("InfiniBand port 1 [ConnectX-7]");
    });

    it("should show DIMM memory and CPU checks", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("Verify installed DIMM memory sticks");
      expect(result.output).toContain("Number of logical CPU cores");
    });

    it("should show root filesystem check", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      expect(result.output).toContain("Root file system usage");
    });

    it("should report overall healthy status when all checks pass", () => {
      const result = simulator.execute(parse("nvsm show health"), context);
      expect(result.output).toContain("Healthy");
      expect(result.output).toContain("Health Summary");
    });
  });

  // =============================================
  // Dot-leader alignment tests
  // =============================================
  describe("dot-leader alignment", () => {
    it("should format all health check lines to exactly 70 visible characters", () => {
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      const lines = result.output.split("\n");

      // Health check lines contain dots followed by a status
      const healthLines = lines.filter((line) => line.includes("..."));

      expect(healthLines.length).toBeGreaterThan(0);
      for (const line of healthLines) {
        const visible = stripAnsi(line);
        expect(visible.length).toBe(70);
      }
    });

    it("should format dot-leaders correctly for short descriptions", () => {
      // "Root file system usage" is relatively short
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      const lines = result.output.split("\n");
      const rootLine = lines.find((l) => l.includes("Root file system usage"));
      expect(rootLine).toBeDefined();
      const visible = stripAnsi(rootLine!);
      expect(visible.length).toBe(70);
    });

    it("should format dot-leaders correctly for long descriptions", () => {
      // GPU-specific lines with PCI addresses are longer
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      const lines = result.output.split("\n");
      const linkLine = lines.find((l) => l.includes("GPU link width"));
      expect(linkLine).toBeDefined();
      const visible = stripAnsi(linkLine!);
      expect(visible.length).toBe(70);
    });

    it("should use at least 1 dot even for very long descriptions", () => {
      // This verifies the Math.max(1, dotsNeeded) guard
      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        context,
      );
      const lines = result.output.split("\n");
      const healthLines = lines.filter((line) => line.includes("..."));
      for (const line of healthLines) {
        // Each health line should have at least one dot between description and status
        const visible = stripAnsi(line);
        expect(visible).toMatch(/\.\s+(Healthy|Warning|Critical)/);
      }
    });
  });

  // =============================================
  // Fault-aware health check tests
  // =============================================
  describe("fault-aware health checks", () => {
    it("should show FAIL/Critical status when GPU has XID errors", () => {
      const xidError: XIDError = {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      };
      const faultyNode = makeNode({
        gpus: [makeGpu({ id: 0, xidErrors: [xidError] })],
      });
      const ctx = makeContext(faultyNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("GPU XID error check [GPU0]");
      // The line should contain Critical status (rendered with ANSI codes)
      expect(result.output).toContain("Critical");
    });

    it("should show Warning for non-critical XID errors", () => {
      const xidError: XIDError = {
        code: 31,
        timestamp: new Date(),
        description: "GPU memory page retirement",
        severity: "Warning",
      };
      const faultyNode = makeNode({
        gpus: [makeGpu({ id: 0, xidErrors: [xidError] })],
      });
      const ctx = makeContext(faultyNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("Warning");
    });

    it("should show Warning/Critical for GPU with high temperature (>90)", () => {
      const hotNode = makeNode({
        gpus: [makeGpu({ id: 0, temperature: 95 })],
      });
      const ctx = makeContext(hotNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      // Temperature >90 triggers Critical
      expect(result.output).toContain("Critical");
    });

    it("should show Warning for GPU with warm temperature (80-90)", () => {
      const warmNode = makeNode({
        gpus: [makeGpu({ id: 0, temperature: 85 })],
      });
      const ctx = makeContext(warmNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("Warning");
    });

    it("should show Critical for GPU with double-bit ECC errors", () => {
      const eccNode = makeNode({
        gpus: [
          makeGpu({
            id: 0,
            eccErrors: {
              singleBit: 0,
              doubleBit: 5,
              aggregated: { singleBit: 0, doubleBit: 5 },
            },
          }),
        ],
      });
      const ctx = makeContext(eccNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("Critical");
    });

    it("should show Warning for GPU with high single-bit ECC errors (>100)", () => {
      const eccNode = makeNode({
        gpus: [
          makeGpu({
            id: 0,
            eccErrors: {
              singleBit: 150,
              doubleBit: 0,
              aggregated: { singleBit: 150, doubleBit: 0 },
            },
          }),
        ],
      });
      const ctx = makeContext(eccNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("Warning");
    });

    it("should show Critical for NVLink in Down state", () => {
      const downLink = makeNvlink({ linkId: 0, status: "Down" });
      const nlNode = makeNode({
        gpus: [makeGpu({ id: 0, nvlinks: [downLink] })],
      });
      const ctx = makeContext(nlNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      expect(result.output).toContain("Critical");
    });

    it("should reflect overall system as non-Healthy when faults exist", () => {
      const faultyNode = makeNode({
        gpus: [makeGpu({ id: 0, healthStatus: "Critical" })],
      });
      const ctx = makeContext(faultyNode);

      const result = simulator.execute(
        parse("nvsm show health --detailed"),
        ctx,
      );
      // Overall status should not be all healthy
      const summarySection = result.output.split("Health Summary")[1];
      expect(summarySection).toBeDefined();
      // Not all checks pass
      expect(summarySection).toContain("Critical");
    });
  });

  // =============================================
  // Diagnostic tests
  // =============================================
  describe("dump health", () => {
    it("should generate a diagnostic tarball message", () => {
      const result = simulator.execute(parse("nvsm dump health"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Writing output to /tmp/nvsm-health-");
      expect(result.output).toContain(".tar.xz");
      expect(result.output).toContain("Done.");
    });
  });

  // =============================================
  // Interactive mode - Prompt format tests
  // =============================================
  describe("interactive mode prompt format", () => {
    it("should use '>' not '->' in the default prompt", () => {
      const result = simulator.execute(parse("nvsm"), context);
      expect(result.prompt).toBeDefined();
      expect(result.prompt).toContain("nvsm>");
      expect(result.prompt).not.toContain("nvsm->");
    });

    it("should use '>' not '->' in path-based prompts", () => {
      simulator.execute(parse("nvsm"), context);
      const cdResult = simulator.executeInteractive(
        "cd /systems/localhost/gpus",
        context,
      );
      expect(cdResult.prompt).toBeDefined();
      expect(cdResult.prompt).toContain("nvsm(");
      expect(cdResult.prompt).toContain(")>");
      expect(cdResult.prompt).not.toContain(")->");
    });

    it("should show nvsm> at default CWT of /systems/localhost", () => {
      const result = simulator.execute(parse("nvsm"), context);
      expect(result.prompt).toBe("nvsm> ");
    });

    it("should show nvsm(/path)> after cd to non-default path", () => {
      simulator.execute(parse("nvsm"), context);
      const cdResult = simulator.executeInteractive("cd /", context);
      expect(cdResult.prompt).toBe("nvsm(/)> ");
    });
  });

  // =============================================
  // Interactive mode - cd navigation tests
  // =============================================
  describe("interactive mode - cd navigation", () => {
    beforeEach(() => {
      simulator.execute(parse("nvsm"), context);
    });

    it("should navigate to /systems/localhost with cd command", () => {
      simulator.executeInteractive("cd /", context);
      const result = simulator.executeInteractive(
        "cd /systems/localhost",
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBe("nvsm> ");
    });

    it("should navigate to /systems/localhost/gpus", () => {
      const result = simulator.executeInteractive(
        "cd /systems/localhost/gpus",
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toContain("/systems/localhost/gpus");
    });

    it("should navigate to a specific GPU path", () => {
      const result = simulator.executeInteractive(
        "cd /systems/localhost/gpus/GPU0",
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toContain("GPU0");
    });

    it("should navigate using relative paths", () => {
      const result = simulator.executeInteractive("cd gpus", context);
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toContain("gpus");
    });

    it("should go up one level with cd ..", () => {
      simulator.executeInteractive("cd /systems/localhost/gpus", context);
      const result = simulator.executeInteractive("cd ..", context);
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toContain("nvsm>");
    });

    it("should return to /systems/localhost with empty cd", () => {
      simulator.executeInteractive("cd /", context);
      const result = simulator.executeInteractive("cd", context);
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBe("nvsm> ");
    });

    it("should show error for invalid target", () => {
      const result = simulator.executeInteractive("cd /nonexistent", context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("does not exist");
    });

    it("should show available targets on error", () => {
      const result = simulator.executeInteractive("cd invalid_child", context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Available targets:");
    });
  });

  // =============================================
  // Interactive mode - show command tests
  // =============================================
  describe("interactive mode - show command", () => {
    beforeEach(() => {
      simulator.execute(parse("nvsm"), context);
    });

    it("should show properties at /systems/localhost level", () => {
      const result = simulator.executeInteractive("show", context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/systems/localhost");
      expect(result.output).toContain("Properties:");
      expect(result.output).toContain("Hostname");
      expect(result.output).toContain("SystemType");
    });

    it("should show targets section with available children", () => {
      const result = simulator.executeInteractive("show", context);
      expect(result.output).toContain("Targets:");
      expect(result.output).toContain("gpus");
      expect(result.output).toContain("storage");
      expect(result.output).toContain("network");
    });

    it("should show verbs section", () => {
      const result = simulator.executeInteractive("show", context);
      expect(result.output).toContain("Verbs:");
      expect(result.output).toContain("cd");
      expect(result.output).toContain("show");
    });

    it("should show GPU-level properties after cd to gpus", () => {
      simulator.executeInteractive("cd gpus", context);
      const result = simulator.executeInteractive("show", context);
      expect(result.output).toContain("/systems/localhost/gpus");
      expect(result.output).toContain("GPUCount");
    });

    it("should show health in interactive mode", () => {
      const result = simulator.executeInteractive("show health", context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Checks");
      expect(result.output).toContain("Health Summary");
    });

    it("should show detailed health in interactive mode", () => {
      const result = simulator.executeInteractive(
        "show health --detailed",
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Checks");
      expect(result.output).not.toContain("more checks");
    });
  });

  // =============================================
  // Interactive mode - list and other commands
  // =============================================
  describe("interactive mode - other commands", () => {
    beforeEach(() => {
      simulator.execute(parse("nvsm"), context);
    });

    it("should show error for list command (not a valid verb)", () => {
      const result = simulator.executeInteractive("list", context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Unknown verb");
    });

    it("should show error for unknown commands", () => {
      const result = simulator.executeInteractive("foobar", context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Unknown verb");
      expect(result.output).toContain("foobar");
    });

    it("should exit with exit command", () => {
      const result = simulator.executeInteractive("exit", context);
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeUndefined();
    });

    it("should exit with quit command", () => {
      const result = simulator.executeInteractive("quit", context);
      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeUndefined();
    });

    it("should show help with help command", () => {
      const result = simulator.executeInteractive("help", context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "NVIDIA System Management (NVSM) Interactive Shell",
      );
      expect(result.output).toContain("cd");
      expect(result.output).toContain("show");
      expect(result.output).toContain("dump");
      expect(result.output).toContain("exit");
    });

    it("should handle empty input", () => {
      const result = simulator.executeInteractive("", context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("");
      expect(result.prompt).toBeDefined();
    });

    it("should dump health in interactive mode", () => {
      const result = simulator.executeInteractive("dump health", context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("tar.xz");
      expect(result.output).toContain("Done.");
    });

    it("should show error for dump without subcommand", () => {
      const result = simulator.executeInteractive("dump", context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Usage: dump health");
    });
  });

  // =============================================
  // Non-interactive (direct) command tests
  // =============================================
  describe("non-interactive commands", () => {
    it("should show help with --help flag", () => {
      const result = simulator.execute(parse("nvsm --help"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA System Management");
      expect(result.output).toContain("Usage:");
    });

    it("should show version with --version flag", () => {
      const result = simulator.execute(parse("nvsm --version"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvsm");
      expect(result.output).toContain("24.03");
    });

    it("should execute show directly without entering interactive mode", () => {
      const result = simulator.execute(parse("nvsm show"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/systems/localhost");
      expect(result.prompt).toBeUndefined();
    });

    it("should execute show health directly", () => {
      const result = simulator.execute(parse("nvsm show health"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Checks");
      expect(result.prompt).toBeUndefined();
    });

    it("should execute dump health directly", () => {
      const result = simulator.execute(parse("nvsm dump health"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("tar.xz");
      expect(result.prompt).toBeUndefined();
    });

    it("should return error for unknown command", () => {
      const result = simulator.execute(parse("nvsm bogus"), context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Unknown command");
    });

    it("should return error when node is not found", () => {
      const badContext = {
        ...context,
        currentNode: "nonexistent",
        cluster: { ...context.cluster!, nodes: [] },
      };
      const result = simulator.execute(parse("nvsm show health"), badContext);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Cannot connect to NVSM daemon");
    });
  });

  // =============================================
  // Metadata
  // =============================================
  describe("metadata", () => {
    it("should return correct metadata", () => {
      const meta = simulator.getMetadata();
      expect(meta.name).toBe("nvsm");
      expect(meta.version).toBe("24.03");
      expect(meta.commands.length).toBeGreaterThan(0);
    });
  });
});
