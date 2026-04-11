import { describe, it, expect, beforeEach, vi } from "vitest";
import { FabricManagerSimulator } from "../fabricManagerSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";
import type { NVLinkConnection, XIDError } from "@/types/hardware";
import * as hardwareSpecsModule from "@/data/hardwareSpecs";

// Mock the store
vi.mock("@/store/simulationStore");

/**
 * Helper to build NVLink arrays for mock GPUs.
 */
function makeNvlinks(count: number, allActive = true): NVLinkConnection[] {
  return Array.from({ length: count }, (_, i) => ({
    linkId: i,
    status: allActive
      ? ("Active" as const)
      : i === 0
        ? ("Inactive" as const)
        : ("Active" as const),
    speed: 50,
    txErrors: 0,
    rxErrors: 0,
    replayErrors: 0,
  }));
}

/**
 * Build a mock GPU object.
 */
function makeGpu(
  id: number,
  opts: {
    nvlinks?: NVLinkConnection[];
    healthStatus?: "OK" | "Warning" | "Critical";
    xidErrors?: XIDError[];
  } = {},
) {
  return {
    id,
    name: "NVIDIA H100 80GB HBM3",
    type: "H100-SXM" as const,
    uuid: `GPU-00000000-0000-0000-0000-00000000000${id}`,
    pciAddress: `0000:${(0x17 + id).toString(16)}:00.0`,
    temperature: 45 + id * 2,
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
    nvlinks: opts.nvlinks ?? makeNvlinks(4),
    healthStatus: opts.healthStatus ?? ("OK" as const),
    xidErrors: opts.xidErrors ?? [],
    persistenceMode: true,
  };
}

describe("FabricManagerSimulator", () => {
  let simulator: FabricManagerSimulator;
  let context: CommandContext;

  /**
   * Setup mock with the given number of GPUs.
   * 8 GPUs => 6 NVSwitches (full mesh), <8 => fewer or 0.
   */
  function setupMock(
    gpuCount: number,
    opts: {
      allNvlinksActive?: boolean;
      healthStatus?: "OK" | "Warning" | "Critical";
      xidErrors?: XIDError[];
    } = {},
  ) {
    const gpus = Array.from({ length: gpuCount }, (_, i) =>
      makeGpu(i, {
        nvlinks: makeNvlinks(4, opts.allNvlinksActive ?? true),
        healthStatus: opts.healthStatus,
        xidErrors: opts.xidErrors,
      }),
    );

    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "DGX-H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus,
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  beforeEach(() => {
    simulator = new FabricManagerSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // Default: 8 GPUs, all healthy
    setupMock(8);
  });

  // =========================================================
  // Help & Version
  // =========================================================
  describe("Help and version", () => {
    it("should show help with --help flag", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager --help"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA Fabric Manager CLI");
      expect(result.output).toContain("Usage:");
      expect(result.output).toContain("Commands:");
    });

    it("should show help with -h flag", () => {
      const result = simulator.execute(parse("nv-fabricmanager -h"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA Fabric Manager CLI");
    });

    it("should show version with --version flag", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager --version"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("535.129.03");
      expect(result.output).toContain("CUDA Version");
    });

    it("should show version with -v flag", () => {
      const result = simulator.execute(parse("nv-fabricmanager -v"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("535.129.03");
    });
  });

  // =========================================================
  // Status command
  // =========================================================
  describe("Status command", () => {
    it("should show service status as Running", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Running");
      expect(result.output).toContain("Service Status");
    });

    it("should show fabric health information", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Health Status");
      expect(result.output).toContain("Healthy");
    });

    it("should show NVSwitch count from hardware registry for 8-GPU system", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVSwitches:");
      expect(result.output).toMatch(/NVSwitches:\s+4/); // DGX-H100 has 4 NVSwitches
    });

    it("should show fabric version/driver info", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DGX-H100");
    });

    it("should show config file path", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "/etc/nvidia-fabricmanager/fabricmanager.cfg",
      );
    });

    it("should show Degraded status when NVLinks are inactive", () => {
      setupMock(8, { allNvlinksActive: false });
      const result = simulator.execute(
        parse("nv-fabricmanager status"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Degraded");
    });
  });

  // =========================================================
  // Query commands
  // =========================================================
  describe("Query NVSwitch", () => {
    it("should list NVSwitches with UUID, status, temp, power", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVSwitch Status");
      expect(result.output).toContain("UUID");
      expect(result.output).toContain("State");
      expect(result.output).toContain("Temp");
      expect(result.output).toContain("Power");
      expect(result.output).toContain("Active");
    });

    it("should generate NVSwitch UUIDs matching the realistic format", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // Match pattern: NVSwitch-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
      const uuidPattern =
        /NVSwitch-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}/;
      const matches = result.output.match(new RegExp(uuidPattern, "g"));
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(4); // DGX-H100 has 4 NVSwitches
    });

    it("should have NVSwitch power values within 60-120W range", () => {
      // Run multiple times to reduce flakiness from randomness
      for (let trial = 0; trial < 5; trial++) {
        const result = simulator.execute(
          parse("nv-fabricmanager query nvswitch"),
          context,
        );
        // Extract power values: pattern like "| 85W"
        const powerMatches = result.output.match(/\|\s+(\d+)W/g);
        expect(powerMatches).not.toBeNull();
        for (const match of powerMatches!) {
          const watts = parseInt(match.replace(/[^0-9]/g, ""), 10);
          expect(watts).toBeGreaterThanOrEqual(60);
          expect(watts).toBeLessThanOrEqual(120);
        }
      }
    });

    it("should show total NVSwitch count", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Total NVSwitches: 4"); // DGX-H100 has 4 NVSwitches
    });

    it("should show 'No NVSwitches detected' for systems without NVSwitch", () => {
      setupMock(2);
      // Mock getHardwareSpecs to return a spec with 0 NVSwitches
      const spy = vi
        .spyOn(hardwareSpecsModule, "getHardwareSpecs")
        .mockReturnValue({
          ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"],
          nvlink: {
            ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"].nvlink,
            nvSwitchCount: 0,
          },
        });
      const result = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No NVSwitches detected");
      spy.mockRestore();
    });

    it("should generate deterministic UUIDs for same switch index", () => {
      const result1 = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      const result2 = simulator.execute(
        parse("nv-fabricmanager query nvswitch"),
        context,
      );
      const uuidPattern =
        /NVSwitch-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}/g;
      const uuids1 = result1.output.match(uuidPattern);
      const uuids2 = result2.output.match(uuidPattern);
      expect(uuids1).toEqual(uuids2);
    });
  });

  describe("Query Topology", () => {
    it("should show topology information", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query topology"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Fabric Topology");
      expect(result.output).toContain("DGX-H100");
      expect(result.output).toContain("dgx-node01");
    });

    it("should show GPU topology with NVLink info", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query topology"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPU Topology");
      expect(result.output).toContain("GPU 0:");
    });

    it("should show NVSwitch connectivity for 8-GPU systems", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query topology"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVSwitch Connectivity");
      expect(result.output).toContain("NVSwitch 0:");
    });
  });

  describe("Query NVLink", () => {
    it("should show NVLink connection details", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query nvlink"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVLink Status");
      expect(result.output).toContain("GPU | Link | State");
      expect(result.output).toContain("Active");
      expect(result.output).toContain("NVLink4");
    });

    it("should show total and active NVLink counts", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query nvlink"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Total NVLinks: 32"); // 8 GPUs * 4 links each
      expect(result.output).toContain("Active NVLinks: 32");
      expect(result.output).toContain("Inactive NVLinks: 0");
    });

    it("should report inactive links when present", () => {
      setupMock(8, { allNvlinksActive: false });
      const result = simulator.execute(
        parse("nv-fabricmanager query nvlink"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // Each GPU has 1 inactive link (linkId 0), 8 GPUs => 8 inactive
      expect(result.output).toContain("Inactive NVLinks: 8");
    });
  });

  describe("Query with no type or invalid type", () => {
    it("should show query help when no type specified", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Query types:");
      expect(result.output).toContain("nvswitch");
      expect(result.output).toContain("topology");
      expect(result.output).toContain("nvlink");
    });

    it("should return error for invalid query type", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager query badtype"),
        context,
      );
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Invalid query type");
    });
  });

  // =========================================================
  // Service control commands
  // =========================================================
  describe("Service control", () => {
    it("should show success message for start", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager start"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Starting NVIDIA Fabric Manager");
      expect(result.output).toContain("started successfully");
    });

    it("should show success message for stop", () => {
      const result = simulator.execute(parse("nv-fabricmanager stop"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Stopping NVIDIA Fabric Manager");
      expect(result.output).toContain("stopped");
    });

    it("should show success message for restart", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager restart"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Restarting NVIDIA Fabric Manager");
      expect(result.output).toContain("restarted successfully");
    });
  });

  // =========================================================
  // Config command
  // =========================================================
  describe("Config command", () => {
    it("should show configuration file contents", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager config"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Fabric Manager Configuration");
      expect(result.output).toContain(
        "/etc/nvidia-fabricmanager/fabricmanager.cfg",
      );
    });

    it("should show config sections", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager config"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("[General]");
      expect(result.output).toContain("[Fabric]");
      expect(result.output).toContain("[NVSwitch]");
      expect(result.output).toContain("[Health]");
    });

    it("should show key config values", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager config"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("FABRIC_MODE=FULL_SPEED");
      expect(result.output).toContain("FM_CMD_PORT_NUMBER=16001");
      expect(result.output).toContain("HEALTH_CHECK_ENABLED=1");
    });

    it("should show config with 'show' subcommand", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager config show"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Fabric Manager Configuration");
    });
  });

  // =========================================================
  // Diagnostics command
  // =========================================================
  describe("Diagnostics - default (no mode)", () => {
    it("should run basic diagnostics when no mode specified", () => {
      const result = simulator.execute(parse("nv-fabricmanager diag"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Fabric Manager Diagnostics");
      expect(result.output).toContain("[1/5]");
      expect(result.output).toContain("[5/5]");
      expect(result.output).toContain("Diagnostic Summary:");
    });
  });

  describe("Diagnostics - quick", () => {
    it("should run quick health check", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag quick"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Quick Fabric Health Check");
      expect(result.output).toContain("Fabric Manager:");
      expect(result.output).toContain("Running");
    });

    it("should report HEALTHY for all-active NVLinks with no errors", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag quick"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("HEALTHY");
    });

    it("should report ATTENTION NEEDED when links are inactive", () => {
      setupMock(8, { allNvlinksActive: false });
      const result = simulator.execute(
        parse("nv-fabricmanager diag quick"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ATTENTION NEEDED");
    });
  });

  describe("Diagnostics - full", () => {
    it("should run full diagnostic suite", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag full"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Full Fabric Diagnostic Suite");
      expect(result.output).toContain("Phase 1");
      expect(result.output).toContain("Phase 2");
      expect(result.output).toContain("Phase 3");
      expect(result.output).toContain("Phase 4");
      expect(result.output).toContain("Phase 5");
    });

    it("should show hardware detection counts", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag full"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPUs detected:");
      expect(result.output).toMatch(/GPUs detected:\s+8/);
      expect(result.output).toContain("NVSwitches detected:");
      expect(result.output).toMatch(/NVSwitches detected:\s+4/); // DGX-H100 has 4 NVSwitches
    });

    it("should report ALL TESTS PASSED when healthy", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag full"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ALL TESTS PASSED");
    });

    it("should report ISSUES DETECTED when NVLinks are down", () => {
      setupMock(8, { allNvlinksActive: false });
      const result = simulator.execute(
        parse("nv-fabricmanager diag full"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ISSUES DETECTED");
    });
  });

  describe("Diagnostics - stress", () => {
    it("should run NVLink stress test", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag stress"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVLink Stress Test");
      expect(result.output).toContain("Warning");
      expect(result.output).toContain("Bidirectional all-to-all");
    });

    it("should show stress test results with bandwidth", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag stress"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Peak bandwidth:");
      expect(result.output).toContain("Average bandwidth:");
      expect(result.output).toContain("Minimum bandwidth:");
      expect(result.output).toContain("Stress test completed successfully");
    });
  });

  describe("Diagnostics - errors", () => {
    it("should show fabric error analysis", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag errors"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Fabric Error Analysis");
      expect(result.output).toContain("Error Summary");
    });

    it("should show no errors when clean", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag errors"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No fabric errors detected");
    });

    it("should show error details when XID errors present", () => {
      const xidErrors: XIDError[] = [
        {
          code: 74,
          timestamp: new Date("2025-01-15T10:30:00Z"),
          description: "NVLink link failed",
          severity: "Critical",
        },
      ];
      setupMock(8, { xidErrors });
      const result = simulator.execute(
        parse("nv-fabricmanager diag errors"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // Should have fabric-related errors (code 74)
      expect(result.output).toContain("Error Details");
      expect(result.output).toContain("74");
      expect(result.output).toContain("NVLink link failed");
    });

    it("should show port error counters", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag errors"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port Error Counters");
      expect(result.output).toContain("CRC Errors");
      expect(result.output).toContain("Replay");
    });

    it("should show recommendations when errors exist", () => {
      const xidErrors: XIDError[] = [
        {
          code: 72,
          timestamp: new Date("2025-01-15T10:30:00Z"),
          description: "NVLink link training failed",
          severity: "Critical",
        },
      ];
      setupMock(8, { xidErrors });
      const result = simulator.execute(
        parse("nv-fabricmanager diag errors"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Recommendations");
      expect(result.output).toContain("Review XID error patterns");
    });
  });

  describe("Diagnostics - ports", () => {
    it("should show port-level diagnostics", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag ports"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Port-Level Diagnostics");
      expect(result.output).toContain("GPU NVLink Ports");
    });

    it("should show NVSwitch ports for 8-GPU system", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager diag ports"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVSwitch Ports");
    });

    it("should show direct NVLink message for systems without NVSwitch", () => {
      setupMock(2);
      // Mock getHardwareSpecs to return a spec with 0 NVSwitches
      const spy = vi
        .spyOn(hardwareSpecsModule, "getHardwareSpecs")
        .mockReturnValue({
          ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"],
          nvlink: {
            ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"].nvlink,
            nvSwitchCount: 0,
          },
        });
      const result = simulator.execute(
        parse("nv-fabricmanager diag ports"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No NVSwitch devices detected");
      spy.mockRestore();
    });
  });

  // =========================================================
  // Topology command
  // =========================================================
  describe("Topo command", () => {
    it("should display ASCII topology map", () => {
      const result = simulator.execute(parse("nv-fabricmanager topo"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVSwitch Fabric Topology Map");
      expect(result.output).toContain("[SW0]");
      expect(result.output).toContain("[G0]");
    });

    it("should show legend", () => {
      const result = simulator.execute(parse("nv-fabricmanager topo"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Legend:");
      expect(result.output).toContain("[SW#] = NVSwitch #");
      expect(result.output).toContain("[G#]  = GPU #");
    });

    it("should show connectivity info", () => {
      const result = simulator.execute(parse("nv-fabricmanager topo"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Connectivity:");
      expect(result.output).toContain("Full mesh GPU-to-GPU via NVSwitch");
    });

    it("should show no NVSwitch message for systems without NVSwitch", () => {
      setupMock(4);
      // Mock getHardwareSpecs to return a spec with 0 NVSwitches
      const spy = vi
        .spyOn(hardwareSpecsModule, "getHardwareSpecs")
        .mockReturnValue({
          ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"],
          nvlink: {
            ...hardwareSpecsModule.HARDWARE_SPECS["DGX-H100"].nvlink,
            nvSwitchCount: 0,
          },
        });
      const result = simulator.execute(parse("nv-fabricmanager topo"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("No NVSwitch fabric detected");
      expect(result.output).toContain("direct GPU-to-GPU NVLink");
      spy.mockRestore();
    });
  });

  // =========================================================
  // Edge cases
  // =========================================================
  describe("Edge cases", () => {
    it("should show help when no arguments given", () => {
      const result = simulator.execute(parse("nv-fabricmanager"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA Fabric Manager CLI");
      expect(result.output).toContain("Commands:");
    });

    it("should return error for unknown subcommand", () => {
      const result = simulator.execute(
        parse("nv-fabricmanager badcommand"),
        context,
      );
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Unknown subcommand: badcommand");
      expect(result.output).toContain("--help");
    });

    it("should return metadata with correct name and version", () => {
      const meta = simulator.getMetadata();
      expect(meta.name).toBe("nv-fabricmanager");
      expect(meta.version).toBe("535.129.03");
      expect(meta.description).toBe("NVIDIA Fabric Manager CLI");
    });
  });
});
