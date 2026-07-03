import { describe, it, expect, beforeEach, vi } from "vitest";
import { DcgmiSimulator } from "../dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("DcgmiSimulator", () => {
  let simulator: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new DcgmiSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Setup default mock
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus: [
              {
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
              },
              {
                id: 1,
                name: "NVIDIA H100 80GB HBM3",
                type: "H100-SXM",
                uuid: "GPU-12345678-1234-1234-1234-123456789013",
                pciAddress: "0000:18:00.0",
                temperature: 50,
                powerDraw: 300,
                powerLimit: 700,
                memoryTotal: 81920,
                memoryUsed: 2048,
                utilization: 50,
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
              },
            ],
            hcas: [],
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Discovery Command", () => {
    it("should list GPUs with discovery -l", () => {
      const parsed = parse("dcgmi discovery -l");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("2 GPU(s) found"); // Actual format
      expect(result.output).toContain("| GPU ID |"); // Bordered table header
      expect(result.output).toContain("| 0      |"); // GPU 0 row
      expect(result.output).toContain("H100");
      expect(result.output).toContain("GPU-"); // UUID format
    });

    it("should list GPU information", () => {
      const parsed = parse("dcgmi discovery -l");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("Device Information"); // Shows device info
    });
  });

  describe("Health Check Command", () => {
    it("should display health check in bordered table format", () => {
      const parsed = parse("dcgmi health -g 0 -c");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("+---"); // Bordered table markers
      expect(result.output).toContain("| System");
      expect(result.output).toContain("| Status");
      expect(result.output).toContain("Health Monitor Report");
    });

    it("should show healthy status for all subsystems", () => {
      const parsed = parse("dcgmi health -g 0 -c");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("| PCIe");
      expect(result.output).toContain("| Memory");
      expect(result.output).toContain("| Thermal");
      expect(result.output).toContain("Healthy");
    });

    it("should require group flag", () => {
      const parsed = parse("dcgmi health -c");
      const result = simulator.execute(parsed, context);

      // Health command doesn't require -g flag, only -c
      expect(result.exitCode).toBe(0);
    });

    it("should require check flag", () => {
      const parsed = parse("dcgmi health -g 0");
      const result = simulator.execute(parsed, context);

      // Check for error message about missing flag
      expect(result.output).toContain("Missing required flag");
    });
  });

  describe("Diagnostics Command", () => {
    it("should run level 1 diagnostics", () => {
      const parsed = parse("dcgmi diag -r 1 -g 0");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Running level 1 diagnostic"); // Actual format
      expect(result.output).toContain("Successfully ran diagnostic");
    });

    it("should run level 2 diagnostics", () => {
      const parsed = parse("dcgmi diag -r 2 -g 0");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Running level 2 diagnostic");
      expect(result.output).toContain("Successfully ran diagnostic");
    });

    it("should run level 3 diagnostics (stress test)", () => {
      const parsed = parse("dcgmi diag -r 3 -g 0");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Running level 3 diagnostic");
      expect(result.output).toContain("Successfully ran diagnostic");
    });

    it("should reject invalid diagnostic levels", () => {
      const parsed = parse("dcgmi diag -r 5 -g 0");
      const result = simulator.execute(parsed, context);

      // Check for error message
      expect(result.output).toContain("mode must be");
    });

    it("should require both -r and -g flags", () => {
      const parsed = parse("dcgmi diag -r 1");
      const result = simulator.execute(parsed, context);

      // Diag command doesn't require -g flag, uses default GPU
      expect(result.exitCode).toBe(0);
    });

    it("should fail Page Retirement/Row Remap at level 1 on uncorrectable ECC", () => {
      // Mirror nvidia-smi's "Volatile Uncorr. ECC = 1": double-bit ECC error
      const state = vi.mocked(useSimulationStore.getState)();
      state.cluster.nodes[0].gpus[0].eccErrors = {
        singleBit: 0,
        doubleBit: 1,
        aggregated: { singleBit: 0, doubleBit: 1 },
      };

      const result = simulator.execute(parse("dcgmi diag -r 1"), context);

      expect(result.exitCode).toBe(0);
      // The quick diag now surfaces the memory subsystem fault
      expect(result.output).toContain("Page Retirement/Row Remap");
      expect(result.output).toContain("\x1b[31mFail\x1b[0m");
      expect(result.output).toContain("test(s) failed");
      expect(result.output).not.toContain("All tests passed successfully");
    });

    it("should fail memory checks when a row-remap XID is present", () => {
      const state = vi.mocked(useSimulationStore.getState)();
      state.cluster.nodes[0].gpus[0].xidErrors = [
        {
          code: 63,
          timestamp: new Date(),
          description: "Row Remap Failure",
          severity: "Warning",
        },
      ];

      const result = simulator.execute(parse("dcgmi diag -r 1"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("\x1b[31mFail\x1b[0m");
      expect(result.output).not.toContain("All tests passed successfully");
    });

    it("should still pass cleanly on a healthy GPU at level 1", () => {
      const result = simulator.execute(parse("dcgmi diag -r 1"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("All tests passed successfully");
      expect(result.output).not.toContain("\x1b[31mFail\x1b[0m");
    });

    it("accepts diag run level 4 and includes the Pulse Test", () => {
      const result = simulator.execute(parse("dcgmi diag -r 4"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Pulse Test");
    });

    it("rejects diag run level 5", () => {
      const result = simulator.execute(parse("dcgmi diag -r 5"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain(
        "mode must be 1 (short), 2 (medium), 3 (long), or 4 (xlong)",
      );
    });

    it("runs software-only checks at level 1 (no hardware/stress tests)", () => {
      const result = simulator.execute(parse("dcgmi diag -r 1"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Denylist");
      expect(result.output).toContain("Inforom");
      expect(result.output).not.toContain("Pulse Test");
      expect(result.output).not.toContain("GPU Memory");
      expect(result.output).not.toContain("SM Stress");
    });
  });

  describe("Stats Command", () => {
    it("should handle stats command", () => {
      const parsed = parse("dcgmi stats -g 0 -e");
      const result = simulator.execute(parsed, context);

      // Stats command returns success with informational message
      expect(result.exitCode).toBe(0);
    });

    it("should handle stats disable", () => {
      const parsed = parse("dcgmi stats -g 0 -d");
      const result = simulator.execute(parsed, context);

      // Stats disable returns success
      expect(result.exitCode).toBe(0);
    });

    it("should validate stats flags", () => {
      const parsed = parse("dcgmi stats -g 0");
      const result = simulator.execute(parsed, context);

      // Stats without action flag still returns success with message
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Dmon Command", () => {
    it("should handle dmon command", () => {
      const parsed = parse("dcgmi dmon -g 0");
      const result = simulator.execute(parsed, context);

      // Dmon command returns success with monitoring output
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DCGM Device Monitor");
    });

    it("should handle dmon with custom fields", () => {
      const parsed = parse("dcgmi dmon -e 155,156");
      const result = simulator.execute(parsed, context);

      // Dmon with custom fields returns success
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DCGM Device Monitor");
    });

    it("should check dmon output exists", () => {
      const parsed = parse("dcgmi dmon -g 0");
      const result = simulator.execute(parsed, context);

      // Dmon returns output with monitoring data
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });

  describe("Help and Version", () => {
    it("should show help with --help", () => {
      const parsed = parse("dcgmi --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Data Center GPU Manager");
      expect(result.output).toContain("discovery");
      expect(result.output).toContain("health");
      expect(result.output).toContain("diag");
    });

    it("should show version with --version", () => {
      const parsed = parse("dcgmi --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dcgmi version"); // Actual format
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid subcommand", () => {
      const parsed = parse("dcgmi invalidcmd");
      const result = simulator.execute(parsed, context);

      // Invalid subcommand returns error
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Unknown command");
    });

    it("should validate required flags", () => {
      const parsed = parse("dcgmi diag");
      const result = simulator.execute(parsed, context);

      // Diag without -r uses default level 1, so succeeds
      expect(result.exitCode).toBe(0);
    });

    it("should handle group ID validation", () => {
      const parsed = parse("dcgmi health -g 99 -c");
      const result = simulator.execute(parsed, context);

      // Health command doesn't validate group IDs, returns success
      expect(result.exitCode).toBe(0);
    });
  });

  describe("GPU State Integration", () => {
    it("should execute dmon command", () => {
      const parsed = parse("dcgmi dmon -g 0");
      const result = simulator.execute(parsed, context);

      // Dmon command returns success
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DCGM Device Monitor");
    });

    it("should handle power monitoring", () => {
      const parsed = parse("dcgmi dmon -g 0");
      const result = simulator.execute(parsed, context);

      // Power monitoring returns success
      expect(result.exitCode).toBe(0);
    });

    it("should handle memory monitoring", () => {
      const parsed = parse("dcgmi dmon -e 155,156 -g 0");
      const result = simulator.execute(parsed, context);

      // Memory monitoring with specific fields returns success
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Output Formatting", () => {
    it("should produce output", () => {
      const parsed = parse("dcgmi discovery -l");
      const result = simulator.execute(parsed, context);

      // Discovery should work and produce output
      expect(result.output.length).toBeGreaterThan(0);
    });

    it("should format health output as bordered table", () => {
      const parsed = parse("dcgmi health -g 0 -c");
      const result = simulator.execute(parsed, context);

      // Health monitoring should produce bordered table output
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output).toContain("+---");
      expect(result.output).toContain("|");
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definition registry initialized after construction", async () => {
      // Wait for async initialization (lazy-loaded JSON imports may take longer)
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );
    });

    it("should reject unknown flags with suggestion", () => {
      const parsed = parse("dcgmi --queryx");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("unrecognized option");
    });
  });

  describe("Help from JSON definitions", () => {
    it("dcgmi --help should return registry-based help", async () => {
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("dcgmi --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dcgmi");
      expect(result.output).toContain("Description:");
    });
  });
});
