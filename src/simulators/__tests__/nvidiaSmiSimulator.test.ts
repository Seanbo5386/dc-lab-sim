import { describe, it, expect, beforeEach, vi } from "vitest";
import { NvidiaSmiSimulator } from "../nvidiaSmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "DGX-H100",
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
                memoryUsed: 40960,
                utilization: 75,
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
    })),
  },
}));

describe("NvidiaSmiSimulator", () => {
  let simulator: NvidiaSmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvidiaSmiSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  describe("Basic Command", () => {
    it("should execute nvidia-smi without flags", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA-SMI");
      expect(result.output).toContain("H100");
      expect(result.output).toContain("Driver Version");
      expect(result.output).toContain("CUDA Version");
    });

    it("should display GPU table with correct format", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("No running processes found"); // Processes section
      expect(result.output).toContain("GPU  Name");
      expect(result.output).toContain("Persistence-M");
    });
  });

  describe("List GPUs (-L flag)", () => {
    it("should list all GPUs with -L flag", () => {
      const parsed = parse("nvidia-smi -L");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPU 0:");
      expect(result.output).toContain("GPU 1:");
      expect(result.output).toContain("H100 80GB HBM3");
      expect(result.output).toContain("UUID: GPU-");
    });

    it("should show correct UUID format", () => {
      const parsed = parse("nvidia-smi -L");
      const result = simulator.execute(parsed, context);

      expect(result.output).toMatch(
        /UUID: GPU-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
    });
  });

  describe("Query Command (-q flag)", () => {
    it("should show detailed info with -q flag", () => {
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPU 00000000"); // Actual format
      expect(result.output).toContain("Product Name");
      expect(result.output).toContain("GPU Current Temp"); // Actual key name
      expect(result.output).toContain("Power Draw");
      expect(result.output).toContain("FB Memory Usage");
    });

    it("should show memory details with -q -d MEMORY", () => {
      const parsed = parse("nvidia-smi -q -d MEMORY");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("FB Memory Usage");
      expect(result.output).toContain("Total");
      expect(result.output).toContain("Used");
      expect(result.output).toContain("Free");
      expect(result.output).toMatch(/\d+ MiB/);
    });

    it("should show specific GPU with -q -i 0", () => {
      const parsed = parse("nvidia-smi -q -i 0");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPU 00000000"); // Actual format
      expect(result.output).not.toContain("GPU 00000001"); // Second GPU
    });

    it("should handle invalid GPU ID", () => {
      const parsed = parse("nvidia-smi -q -i 99");
      const result = simulator.execute(parsed, context);

      // Simulator validates GPU IDs and returns error for invalid index
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("GPU not found");
    });

    it("should reject a negative GPU index cleanly (F4)", () => {
      // -5 is now consumed as the value of -i (not misparsed as option --5)
      const parsed = parse("nvidia-smi -q -i -5");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Invalid GPU index '-5'");
      expect(result.output).not.toContain("unrecognized option");
    });
  });

  describe("Help and Version", () => {
    it("should show help with --help", () => {
      const parsed = parse("nvidia-smi --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-smi");
      expect(result.output.length).toBeGreaterThan(0);
    });

    it("should show version with --version", () => {
      const parsed = parse("nvidia-smi --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA-SMI version"); // Actual format
      expect(result.output).toContain("NVML version"); // Note: lowercase 'v'
    });
  });

  describe("GPU State Integration", () => {
    it("should reflect GPU utilization", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      // GPU 0 has 0% utilization, GPU 1 has 75%
      expect(result.output).toContain("0%"); // GPU 0
      expect(result.output).toContain("75%"); // GPU 1
    });

    it("should show correct memory usage", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      // GPU 0: 1024 MiB used, GPU 1: 40960 MiB used (values already in MiB)
      expect(result.output).toContain("1024MiB");
      expect(result.output).toContain("40960MiB");
    });

    it("should show temperature values", () => {
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.output).toMatch(/GPU Current Temp\s+:\s+45 C/);
      expect(result.output).toMatch(/GPU Current Temp\s+:\s+50 C/);
    });

    it("should show power usage", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("250W");
      expect(result.output).toContain("300W");
    });
  });

  describe("Edge Cases", () => {
    it("should handle no GPUs gracefully", () => {
      // Mock empty GPU list
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: {
          nodes: [
            {
              id: "dgx-00",
              hostname: "dgx-node01",
              systemType: "DGX-H100",
              healthStatus: "OK",
              nvidiaDriverVersion: "535.129.03",
              cudaVersion: "12.2",
              gpus: [],
              hcas: [],
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      // Returns success with empty GPU listing
      expect(result.exitCode).toBe(0);
    });

    it("should handle unknown flags gracefully", () => {
      const parsed = parse("nvidia-smi --unknown-flag");
      const result = simulator.execute(parsed, context);

      // Simulator validates flags using fuzzy matching and returns error for unknown flags
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("unrecognized option");
    });

    it("should handle conflicting flags", () => {
      const parsed = parse("nvidia-smi -L -q");
      const result = simulator.execute(parsed, context);

      // Should handle gracefully (typically one takes precedence)
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Output Format", () => {
    it("should maintain consistent column alignment", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      const lines = result.output.split("\n");
      const headerLines = lines.filter((line) => line.includes("GPU  Name"));
      expect(headerLines.length).toBeGreaterThan(0);

      // Check for consistent separator lines
      const separators = lines.filter((line) => line.includes("======="));
      expect(separators.length).toBeGreaterThan(0);
    });

    it("should produce table output", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      // Verify table structure
      expect(result.output).toContain("+-------");
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

    it("should validate flags using registry", () => {
      // Valid flag should not error
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Help from JSON definitions", () => {
    it("nvidia-smi --help should return registry-based help", async () => {
      // Wait for lazy-loaded JSON definitions to be available
      await vi.waitFor(
        () => {
          expect(simulator["definitionRegistry"]).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const parsed = parse("nvidia-smi --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-smi");
      expect(result.output).toContain("Description:");
      expect(result.output).toContain("Options:");
    });
  });

  describe("Topology Matrix", () => {
    it("should show uniform NVLink count for DGX NVSwitch topology", () => {
      const parsed = parse("nvidia-smi topo -m");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // In a DGX H100 with NVSwitch, all GPU pairs should show NV18
      const lines = result.output
        .split("\n")
        .filter((l) => l.startsWith("GPU"));
      for (const line of lines) {
        // Should NOT contain "NV6" for a full NVSwitch system
        expect(line).not.toContain("NV6");
        // Should contain NV18 for H100
        expect(line).toContain("NV18");
      }
    });

    it("should show X for self-connections", () => {
      const parsed = parse("nvidia-smi topo -m");
      const result = simulator.execute(parsed, context);

      const lines = result.output
        .split("\n")
        .filter((l) => l.startsWith("GPU"));
      // GPU0 line should have X in position 0, GPU1 line should have X in position 1, etc.
      expect(lines[0]).toMatch(/GPU0\s+X/);
      expect(lines[1]).toMatch(/GPU1\s+NV18\s+X/);
    });
  });

  describe("Schema-aware parsing", () => {
    it("should treat -q as a boolean flag and not consume the next token", () => {
      // Regression: before parseWithSchema(), `nvidia-smi -q` could mis-parse
      // if a subcommand followed, because -q eagerly consumed the next token.
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // -q should produce query output containing GPU details
      expect(result.output).toContain("GPU");
      expect(result.output).toContain("Product Name");
    });

    it("should treat -L as a boolean flag", () => {
      const parsed = parse("nvidia-smi -L");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPU 0:");
      expect(result.output).toContain("UUID: GPU-");
    });

    it("should allow -i to consume the next token as its value", () => {
      // -i is a value flag, so `nvidia-smi -q -i 0` should parse -i with value "0"
      const parsed = parse("nvidia-smi -q -i 0");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Should show only GPU 0, not GPU 1
      expect(result.output).toContain("GPU 00000000");
      expect(result.output).not.toContain("GPU 00000001");
    });

    it("should correctly parse -q followed by -d as separate flags", () => {
      // -q is boolean, so -d should not be swallowed as -q's value
      const parsed = parse("nvidia-smi -q -d MEMORY");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("FB Memory Usage");
      expect(result.output).toContain("Total");
    });
  });

  describe("Bug Fixes: Driver Version, Architecture, and Memory", () => {
    it("should show numeric driver version in -q output, not GPU name", () => {
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Should show the node's driver version string, not the GPU name
      expect(result.output).toContain(
        "Driver Version                            : 535.129.03",
      );
      expect(result.output).not.toContain(
        "Driver Version                            : NVIDIA H100 80GB HBM3",
      );
      // Should also show CUDA version
      expect(result.output).toContain(
        "CUDA Version                              : 12.2",
      );
    });

    it("should show Hopper architecture for H100 GPUs in -q output", () => {
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "Product Architecture                      : Hopper",
      );
      expect(result.output).not.toContain(
        "Product Architecture                      : Ampere",
      );
    });

    it("should not exceed hardware TDP for max power limit on SXM GPUs", () => {
      const parsed = parse("nvidia-smi -q");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // H100 SXM max power = 700W, should NOT show 770W (which was 700 * 1.1)
      expect(result.output).not.toContain("770");
      const lines = result.output.split("\n");
      const maxPowerLine = lines.find((l) => l.includes("Max Power Limit"));
      if (maxPowerLine) {
        const value = parseFloat(maxPowerLine.match(/(\d+\.?\d*)/)?.[1] || "0");
        expect(value).toBeLessThanOrEqual(700);
      }
    });

    it("should display memory in MiB without dividing by 1024 in default view", () => {
      const parsed = parse("nvidia-smi");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // GPU memory values are already in MiB (81920 MiB = 80 GB for H100)
      // Should show 81920MiB, not 80MiB (which was the result of dividing by 1024)
      expect(result.output).toContain("81920MiB");
      expect(result.output).not.toContain("80MiB");
    });
  });

  describe("unsupported flags rejected explicitly (not silently ignored)", () => {
    it("rejects -lgc instead of falling through to the default GPU table", () => {
      const result = simulator.execute(
        parse("nvidia-smi -lgc 1200,1500"),
        context,
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("not supported in this simulator");
    });

    it("rejects -rgc instead of falling through to the default GPU table", () => {
      const result = simulator.execute(parse("nvidia-smi -rgc"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("not supported in this simulator");
    });

    it("rejects -x instead of falling through to the default GPU table", () => {
      const result = simulator.execute(parse("nvidia-smi -x -q"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("not supported in this simulator");
    });
  });
});

describe("remediation routing", () => {
  let simulator: NvidiaSmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvidiaSmiSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  afterEach(() => vi.clearAllMocks());

  // A faulted node with an updateGPU spy, returned by a local getState mock.
  function buildContextWithSpy(
    gpu: Partial<import("@/types/hardware").GPU>,
    nodeOverrides: Partial<import("@/types/hardware").DGXNode> = {},
  ) {
    const baseGpu = {
      id: 0,
      uuid: "GPU-x",
      // Exact HARDWARE_SPECS model string (not the display-only "NVIDIA H100
      // 80GB HBM3" used elsewhere in this file) so architecture lookups like
      // getPowerLimitBounds/getRatedTDP resolve real H100 bounds (200-700W)
      // instead of silently falling back to A100's (100-400W).
      name: "NVIDIA H100-SXM5-80GB",
      type: "H100-SXM",
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
      ...gpu,
    };
    const updateGPU = vi.fn();
    const state = {
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "n",
            systemType: "DGX-H100",
            healthStatus: "OK",
            slurmState: "idle",
            gpus: [baseGpu],
            hcas: [],
            ...nodeOverrides,
          },
        ],
      },
      updateGPU,
    };
    vi.mocked(useSimulationStore.getState).mockReturnValue(state as never);
    return { updateGPU };
  }

  it("--gpu-reset clears a critical XID and reports success", () => {
    const { updateGPU } = buildContextWithSpy({
      xidErrors: [
        {
          code: 43,
          timestamp: new Date(),
          description: "x",
          severity: "Critical",
        },
      ],
      healthStatus: "Critical",
    });
    const result = simulator.execute(
      parse("nvidia-smi --gpu-reset -i 0"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(updateGPU).toHaveBeenCalledWith(
      "dgx-00",
      0,
      expect.objectContaining({ xidErrors: [], healthStatus: "OK" }),
    );
  });

  it("--gpu-reset refuses an off-the-bus GPU (XID 79)", () => {
    const { updateGPU } = buildContextWithSpy({
      xidErrors: [
        {
          code: 79,
          timestamp: new Date(),
          description: "x",
          severity: "Critical",
        },
      ],
      healthStatus: "Critical",
    });
    const result = simulator.execute(
      parse("nvidia-smi --gpu-reset -i 0"),
      context,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toMatch(/power-cycle/i);
    expect(updateGPU).not.toHaveBeenCalled();
  });

  it("--gpu-reset is blocked while the node is allocated", () => {
    const { updateGPU } = buildContextWithSpy(
      {
        xidErrors: [
          {
            code: 43,
            timestamp: new Date(),
            description: "x",
            severity: "Critical",
          },
        ],
        healthStatus: "Critical",
      },
      { slurmState: "alloc" },
    );
    const result = simulator.execute(
      parse("nvidia-smi --gpu-reset -i 0"),
      context,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toMatch(/drain/i);
    expect(updateGPU).not.toHaveBeenCalled();
  });

  it("--reset-ecc-errors clears double-bit ECC", () => {
    const { updateGPU } = buildContextWithSpy({
      eccErrors: {
        singleBit: 0,
        doubleBit: 5,
        aggregated: { singleBit: 0, doubleBit: 5 },
      },
      healthStatus: "Critical",
    });
    const result = simulator.execute(
      parse("nvidia-smi -i 0 --reset-ecc-errors"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(updateGPU).toHaveBeenCalledWith(
      "dgx-00",
      0,
      expect.objectContaining({
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: { singleBit: 0, doubleBit: 0 },
        },
        healthStatus: "OK",
      }),
    );
  });

  it("-p (short form of --reset-ecc-errors) clears double-bit ECC", () => {
    const { updateGPU } = buildContextWithSpy({
      eccErrors: {
        singleBit: 0,
        doubleBit: 5,
        aggregated: { singleBit: 0, doubleBit: 5 },
      },
      healthStatus: "Critical",
    });
    const result = simulator.execute(parse("nvidia-smi -i 0 -p"), context);
    expect(result.exitCode).toBe(0);
    expect(updateGPU).toHaveBeenCalledWith(
      "dgx-00",
      0,
      expect.objectContaining({
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: { singleBit: 0, doubleBit: 0 },
        },
        healthStatus: "OK",
      }),
    );
  });

  it("-pl resolves a thermal fault while setting the limit", () => {
    const { updateGPU } = buildContextWithSpy({
      temperature: 85,
      activeFaultHeatWatts: 240,
      healthStatus: "Warning",
    });
    const result = simulator.execute(parse("nvidia-smi -i 0 -pl 500"), context);
    expect(result.exitCode).toBe(0);
    expect(updateGPU).toHaveBeenCalledWith(
      "dgx-00",
      0,
      expect.objectContaining({
        powerLimit: 500,
        activeFaultHeatWatts: 0,
        healthStatus: "OK",
      }),
    );
    const call = updateGPU.mock.calls[0][2] as Record<string, unknown>;
    expect(call).not.toHaveProperty("temperature");
  });

  it("accepts a power limit above the GPU's CURRENT (already-capped) limit, using the fixed architecture ceiling instead", () => {
    // Simulate a GPU a prior `-pl 150` already capped: current powerLimit is
    // 150, well below this H100 fixture's real fixed ceiling (700W). The OLD
    // buggy code derived the max bound from this CURRENT powerLimit (150),
    // so -pl 350 would have been wrongly rejected (350 > 150). The fix must
    // derive the max bound from the fixed architecture ceiling (700)
    // instead, so 350 (<= 700) is accepted — this is the exact SIM-2
    // regression guard.
    buildContextWithSpy({ powerLimit: 150 });
    const result = simulator.execute(parse("nvidia-smi -i 0 -pl 350"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("350 W");
  });

  it("-q reports the fixed architecture Min/Max Power Limit, not values derived from the current (capped) limit", () => {
    // A prior -pl already lowered the current limit to 150W; Min/Max Power
    // Limit in `-q` output must still reflect H100's real fixed bounds
    // (200-700W), not "100.00 W" / "150.00 W" derived from the current cap.
    buildContextWithSpy({ powerLimit: 150 });
    const result = simulator.execute(parse("nvidia-smi -q -i 0"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(
      "Min Power Limit                       : 200.00 W",
    );
    expect(result.output).toContain(
      "Max Power Limit                       : 700.00 W",
    );
  });

  it("--query-gpu=power.max_limit reports the fixed architecture ceiling, not a value derived from the current (capped) limit", () => {
    buildContextWithSpy({ powerLimit: 150 });
    const result = simulator.execute(
      parse("nvidia-smi --query-gpu=power.max_limit --format=csv,noheader"),
      context,
    );
    expect(result.exitCode).toBe(0);
    expect(result.output.trim()).toBe("700 W");
  });
});

describe("-e / --ecc-config", () => {
  let simulator: NvidiaSmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvidiaSmiSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // A single-GPU node with a real updateGPU implementation (not just a
    // spy) so the "persists" test below can observe a subsequent query
    // reflecting the mutation, mirroring how the real StateMutator/store
    // round-trip behaves.
    const gpu: import("@/types/hardware").GPU = {
      id: 0,
      uuid: "GPU-ecc-config-0",
      name: "NVIDIA H100-SXM5-80GB",
      type: "H100-SXM",
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
    };

    const state = {
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "DGX-H100",
            healthStatus: "OK",
            slurmState: "idle",
            gpus: [gpu],
            hcas: [],
          },
        ],
      },
      updateGPU: vi.fn(
        (
          nodeId: string,
          gpuId: number,
          updates: Partial<import("@/types/hardware").GPU>,
        ) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            Object.assign(node.gpus[gpuId], updates);
          }
        },
      ),
    };
    vi.mocked(useSimulationStore.getState).mockReturnValue(state as never);
  });

  afterEach(() => vi.clearAllMocks());

  it("enables ECC and reports the reboot requirement", () => {
    const result = simulator.execute(parse("nvidia-smi -i 0 -e 1"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("ECC support enabled");
    expect(result.output).toContain("reset");
  });

  it("disables ECC", () => {
    const result = simulator.execute(parse("nvidia-smi -i 0 -e 0"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("ECC support disabled");
  });

  it("persists the change so a subsequent query reflects it", () => {
    simulator.execute(parse("nvidia-smi -i 0 -e 0"), context);
    const queryResult = simulator.execute(
      parse("nvidia-smi --query-gpu=ecc.mode.current --format=csv,noheader"),
      context,
    );
    expect(queryResult.output).toContain("Disabled");
  });
});

describe("-c / --compute-mode", () => {
  let simulator: NvidiaSmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvidiaSmiSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };

    // A single-GPU node with a real updateGPU implementation (not just a
    // spy) so the "reflects it in a later query" test below can observe a
    // subsequent query reflecting the mutation, mirroring how the real
    // StateMutator/store round-trip behaves. Same pattern as the
    // -e/--ecc-config describe block above.
    const gpu: import("@/types/hardware").GPU = {
      id: 0,
      uuid: "GPU-compute-mode-0",
      name: "NVIDIA H100-SXM5-80GB",
      type: "H100-SXM",
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
    };

    const state = {
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-node01",
            systemType: "DGX-H100",
            healthStatus: "OK",
            slurmState: "idle",
            gpus: [gpu],
            hcas: [],
          },
        ],
      },
      updateGPU: vi.fn(
        (
          nodeId: string,
          gpuId: number,
          updates: Partial<import("@/types/hardware").GPU>,
        ) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            Object.assign(node.gpus[gpuId], updates);
          }
        },
      ),
    };
    vi.mocked(useSimulationStore.getState).mockReturnValue(state as never);
  });

  afterEach(() => vi.clearAllMocks());

  it("sets compute mode to Exclusive_Process and reflects it in a later query", () => {
    const result = simulator.execute(parse("nvidia-smi -i 0 -c 3"), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Exclusive_Process");

    const queryResult = simulator.execute(
      parse("nvidia-smi --query-gpu=compute_mode --format=csv,noheader"),
      context,
    );
    expect(queryResult.output).toContain("Exclusive_Process");
  });

  it("rejects an out-of-range mode value", () => {
    const result = simulator.execute(parse("nvidia-smi -i 0 -c 9"), context);
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Invalid compute mode");
  });
});
