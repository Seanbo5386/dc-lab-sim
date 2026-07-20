import { describe, it, expect, beforeEach, vi } from "vitest";
import { BenchmarkSimulator } from "../benchmarkSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";
import type { GPU, DGXNode } from "@/types/hardware";
import type { SystemType } from "@/data/hardwareSpecs";

// Mock the store
vi.mock("@/store/simulationStore");

// The ONE fixture-construction helper this plan adds to this file. Tasks 4-8
// reuse it verbatim rather than writing a parallel helper (PHYS-6+).
function buildContextWithGpu(
  gpuOverrides: Partial<GPU> = {},
  systemType: SystemType = "DGX-H100",
  gpuCount = 1,
): {
  context: CommandContext;
  node: DGXNode;
  updateGPU: ReturnType<typeof vi.fn>;
} {
  const baseGpu: GPU = {
    id: 0,
    uuid: "GPU-bench-0",
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
    ...gpuOverrides,
  };
  // Only GPU 0 gets gpuOverrides applied above; additional GPUs (gpuCount > 1)
  // start as plain healthy copies with a fresh id/uuid -- tests needing a
  // SPECIFIC other GPU's fields (e.g. Task 7's per-pair NVLink test) mutate
  // `node.gpus[i]` directly on the returned `node` after construction.
  const gpus: GPU[] = Array.from({ length: gpuCount }, (_, i) =>
    i === 0
      ? baseGpu
      : {
          ...baseGpu,
          id: i,
          uuid: `GPU-bench-${i}`,
          name: baseGpu.name,
        },
  );
  const node: DGXNode = {
    id: "dgx-00",
    hostname: "dgx-node01",
    systemType,
    healthStatus: "OK",
    slurmState: "idle",
    nvidiaDriverVersion: "535.129.03",
    cudaVersion: "12.2",
    gpus,
    hcas: [],
  };
  const updateGPU = vi.fn(
    (nodeId: string, gpuId: number, updates: Partial<GPU>) => {
      const g = node.gpus.find((x) => x.id === gpuId);
      if (g) Object.assign(g, updates);
    },
  );
  const state = { cluster: { nodes: [node] }, updateGPU };
  vi.mocked(useSimulationStore.getState).mockReturnValue(state as never);
  const context: CommandContext = {
    currentNode: "dgx-00",
    currentPath: "/root",
    environment: {},
    history: [],
  };
  return { context, node, updateGPU };
}

describe("BenchmarkSimulator", () => {
  let simulator: BenchmarkSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new BenchmarkSimulator();
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
            systemType: "DGX-H100",
            healthStatus: "OK",
            nvidiaDriverVersion: "535.129.03",
            cudaVersion: "12.2",
            gpus: [
              {
                id: 0,
                name: "NVIDIA H100-SXM5-80GB",
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
                name: "NVIDIA H100-SXM5-80GB",
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
          },
        ],
      },
      updateGPU: vi.fn(),
      addXIDError: vi.fn(),
      updateNodeHealth: vi.fn(),
      setMIGMode: vi.fn(),
      setSlurmState: vi.fn(),
      allocateGPUsForJob: vi.fn(),
      deallocateGPUsForJob: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("NCCL Tests", () => {
    it("should run regular NCCL test", () => {
      const parsed = parse("nccl-test");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nccl-tests");
      expect(result.output).toContain("all_reduce");
      expect(result.output).toContain("Using devices");
    });

    it("should run NCCL test with custom operation", () => {
      const parsed = parse("nccl-test --operation broadcast");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("broadcast");
    });

    it("should run burn-in test with --burn-in flag", () => {
      const parsed = parse("nccl-test --burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NCCL Burn-in Test");
      expect(result.output).toContain("Iterations: 1000");
      expect(result.output).toContain("Running NCCL AllReduce burn-in");
      expect(result.output).toContain("Burn-in Status: PASSED");
      expect(result.output).toContain("Average Bandwidth:");
      expect(result.output).toContain("Min Bandwidth:");
      expect(result.output).toContain("Max Bandwidth:");
      expect(result.output).toContain("Failures: 0");
    });

    it("should run burn-in test with --burnin flag (alias)", () => {
      const parsed = parse("nccl-test --burnin");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NCCL Burn-in Test");
    });

    it("should run burn-in test with custom iterations", () => {
      const parsed = parse("nccl-test --burn-in --iterations 500");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iterations: 500");
      expect(result.output).toContain("NCCL Burn-in Test");
    });

    it("should show only first 10 iterations for large burn-in tests", () => {
      const parsed = parse("nccl-test --burn-in --iterations 2000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 10/2000");
      expect(result.output).toContain("... (1990 more iterations)");
    });

    it("should show all iterations for small burn-in tests", () => {
      const parsed = parse("nccl-test --burn-in --iterations 5");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/5");
      expect(result.output).toContain("Iteration 5/5");
      expect(result.output).not.toContain("more iterations");
    });

    it("should report bandwidth within expected range (280-300 GB/s)", () => {
      const parsed = parse("nccl-test --burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract bandwidth values from output
      const bandwidthMatches = result.output.matchAll(
        /Iteration \d+\/\d+: (\d+\.\d+) GB\/s/g,
      );
      const bandwidths = Array.from(bandwidthMatches).map((match) =>
        parseFloat(match[1]),
      );

      // Verify all bandwidths are in range
      bandwidths.forEach((bw) => {
        expect(bw).toBeGreaterThanOrEqual(280);
        expect(bw).toBeLessThanOrEqual(300);
      });
    });

    it("should calculate correct statistics", () => {
      const parsed = parse("nccl-test --burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract statistics
      const avgMatch = result.output.match(
        /Average Bandwidth: (\d+\.\d+) GB\/s/,
      );
      const minMatch = result.output.match(/Min Bandwidth: (\d+\.\d+) GB\/s/);
      const maxMatch = result.output.match(/Max Bandwidth: (\d+\.\d+) GB\/s/);

      expect(avgMatch).toBeTruthy();
      expect(minMatch).toBeTruthy();
      expect(maxMatch).toBeTruthy();

      if (avgMatch && minMatch && maxMatch) {
        const avg = parseFloat(avgMatch[1]);
        const min = parseFloat(minMatch[1]);
        const max = parseFloat(maxMatch[1]);

        // Min should be less than or equal to average
        expect(min).toBeLessThanOrEqual(avg);
        // Max should be greater than or equal to average
        expect(max).toBeGreaterThanOrEqual(avg);
        // All should be in expected range
        expect(min).toBeGreaterThanOrEqual(280);
        expect(max).toBeLessThanOrEqual(300);
      }
    });
  });

  describe("HPL Tests", () => {
    // The shared `context` fixture from the outer beforeEach models a
    // DGX-H100 node with exactly 2 GPUs (not the usual 8). handleHPLBurnIn's
    // baseline is now `fp64Tflops * node.gpus.length` (PHYS-13, unified with
    // hardwareSpecs -- see Task 2/3/4), so for THIS fixture the 90-100%
    // burn-in band is 2*67 TFLOPS, not the old disconnected table's flat 240
    // (which never scaled with GPU count). Shared here so the two
    // pre-existing band assertions below don't drift independently.
    const H100_BURN_IN_2GPU_BASELINE = 2 * 67;
    const H100_BURN_IN_2GPU_MIN = H100_BURN_IN_2GPU_BASELINE * 0.9;
    const H100_BURN_IN_2GPU_MAX = H100_BURN_IN_2GPU_BASELINE * 1.0;

    it("should run HPL benchmark", () => {
      const parsed = parse("hpl");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "HPL - High-Performance Linpack Benchmark",
      );
      expect(result.output).toContain("Configuration:");
      expect(result.output).toContain("RESULTS");
    });

    it("hpl --help should print global usage and not run a benchmark", () => {
      const result = simulator.execute(parse("hpl --help"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage: benchmark-tools");
      expect(result.output).not.toContain(
        "HPL - High-Performance Linpack Benchmark",
      );
      expect(result.output).not.toContain("RESULTS");
    });

    it("should run burn-in test with --burn-in flag", () => {
      const parsed = parse("hpl --burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("HPL Burn-in Test");
      expect(result.output).toContain("Iterations: 100");
      expect(result.output).toContain("Problem Size (N): 90000");
      expect(result.output).toContain(
        "Running High-Performance Linpack burn-in",
      );
      expect(result.output).toContain(
        "Each iteration takes approximately 2-3 minutes",
      );
      expect(result.output).toContain("Burn-in Results:");
      expect(result.output).toContain("Status: PASSED");
      expect(result.output).toContain("Average Performance:");
      expect(result.output).toContain("Min Performance:");
      expect(result.output).toContain("Max Performance:");
      expect(result.output).toContain("Std Deviation:");
      expect(result.output).toContain("Failures: 0");
    });

    it("should run burn-in test with --burnin flag (alias)", () => {
      const parsed = parse("hpl --burnin");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("HPL Burn-in Test");
    });

    it("should run burn-in test with custom iterations", () => {
      const parsed = parse("hpl --burn-in --iterations 50");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iterations: 50");
      expect(result.output).toContain("HPL Burn-in Test");
    });

    it("should run burn-in test with custom problem size using --N flag", () => {
      const parsed = parse("hpl --burn-in --N 100000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Problem Size (N): 100000");
    });

    it("should run burn-in test with custom problem size using --problem-size flag", () => {
      const parsed = parse("hpl --burn-in --problem-size 80000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Problem Size (N): 80000");
    });

    it("should show only first 5 iterations for large burn-in tests", () => {
      const parsed = parse("hpl --burn-in --iterations 100");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 5/100");
      expect(result.output).toContain("... (95 more iterations)");
    });

    it("should show all iterations for small burn-in tests", () => {
      const parsed = parse("hpl --burn-in --iterations 3");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/3");
      expect(result.output).toContain("Iteration 3/3");
      expect(result.output).not.toContain("more iterations");
    });

    it("HPL burn-in: baseline TFLOPS matches hardwareSpecs.gpu.fp64Tflops (unified source, PHYS-13)", () => {
      // H100's corrected dense FP64 Tensor-Core rate is 67 TFLOPS/GPU (Task 2);
      // with 8 healthy GPUs on the node, burn-in's 90-100%-of-baseline band
      // should center near 8*67=536, not the old disconnected table's 240.
      // The shared `context` fixture from the outer beforeEach only models 2
      // GPUs, so this test builds its own 8-GPU node via buildContextWithGpu
      // (Task 3's shared fixture helper) to exercise the per-GPU-count math.
      const eightGpu = buildContextWithGpu({}, "DGX-H100", 8);
      const result = simulator.execute(
        parse("hpl --burn-in --iterations 5"),
        eightGpu.context,
      );
      expect(result.exitCode).toBe(0);
      const iterationLines = [
        ...result.output.matchAll(/Iteration \d+\/\d+: ([\d.]+) TFLOPS/g),
      ];
      expect(iterationLines.length).toBe(5);
      for (const m of iterationLines) {
        const tf = parseFloat(m[1]);
        expect(tf).toBeGreaterThanOrEqual(8 * 67 * 0.9 * 0.95); // 5% headroom for the degradation ratio on a healthy fixture
        expect(tf).toBeLessThanOrEqual(8 * 67 * 1.0 * 1.05);
      }
    });

    it("should report performance within expected range for system type", () => {
      const parsed = parse("hpl --burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract TFLOPS values from output
      const tflopsMatches = result.output.matchAll(
        /Iteration \d+\/\d+: (\d+\.\d+) TFLOPS/g,
      );
      const tflopsValues = Array.from(tflopsMatches).map((match) =>
        parseFloat(match[1]),
      );

      // DGX-H100 baseline is fp64Tflops(67) * 2 GPUs on this fixture = 134
      // TFLOPS (PHYS-13, unified source); range is 90-100% of baseline.
      tflopsValues.forEach((tf) => {
        expect(tf).toBeGreaterThanOrEqual(H100_BURN_IN_2GPU_MIN);
        expect(tf).toBeLessThanOrEqual(H100_BURN_IN_2GPU_MAX);
      });
    });

    it("should calculate correct statistics", () => {
      const parsed = parse("hpl --burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract statistics
      const avgMatch = result.output.match(
        /Average Performance: (\d+\.\d+) TFLOPS/,
      );
      const minMatch = result.output.match(
        /Min Performance: (\d+\.\d+) TFLOPS/,
      );
      const maxMatch = result.output.match(
        /Max Performance: (\d+\.\d+) TFLOPS/,
      );
      const stdDevMatch = result.output.match(
        /Std Deviation: (\d+\.\d+) TFLOPS/,
      );

      expect(avgMatch).toBeTruthy();
      expect(minMatch).toBeTruthy();
      expect(maxMatch).toBeTruthy();
      expect(stdDevMatch).toBeTruthy();

      if (avgMatch && minMatch && maxMatch && stdDevMatch) {
        const avg = parseFloat(avgMatch[1]);
        const min = parseFloat(minMatch[1]);
        const max = parseFloat(maxMatch[1]);
        const stdDev = parseFloat(stdDevMatch[1]);

        // Min should be less than or equal to average
        expect(min).toBeLessThanOrEqual(avg);
        // Max should be greater than or equal to average
        expect(max).toBeGreaterThanOrEqual(avg);
        // DGX-H100 baseline fp64Tflops(67) * 2 GPUs = 134 TFLOPS at 90-100%
        // (PHYS-13, unified source)
        expect(min).toBeGreaterThanOrEqual(H100_BURN_IN_2GPU_MIN);
        expect(max).toBeLessThanOrEqual(H100_BURN_IN_2GPU_MAX);
        // Std deviation should be positive
        expect(stdDev).toBeGreaterThan(0);
      }
    });

    it("HPL: a throttled/capped GPU measurably underperforms a healthy one (PHYS-6)", () => {
      const healthy = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        clocksSM: 1980,
        powerLimit: 700,
      });
      const healthyResult = simulator.execute(
        parse("hpl --gpus-per-node 1 --nodes 1"),
        healthy.context,
      );
      const achievedHealthy = parseFloat(
        healthyResult.output.match(/Achieved:\s+([\d.]+) TFLOPS/)![1],
      );

      const throttled = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        clocksSM: 990, // half boost clock
        powerLimit: 350, // half rated TDP
      });
      const throttledResult = simulator.execute(
        parse("hpl --gpus-per-node 1 --nodes 1"),
        throttled.context,
      );
      const achievedThrottled = parseFloat(
        throttledResult.output.match(/Achieved:\s+([\d.]+) TFLOPS/)![1],
      );

      expect(achievedThrottled).toBeLessThan(achievedHealthy * 0.6);
    });

    it("HPL: the low-efficiency warning branch is reachable for a sufficiently degraded GPU", () => {
      const degraded = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        clocksSM: 500,
        powerLimit: 200,
      });
      const result = simulator.execute(
        parse("hpl --gpus-per-node 1 --nodes 1"),
        degraded.context,
      );
      expect(result.output).toContain("WARNING - Low efficiency");
      expect(result.output).toContain("Efficiency below 80%");
    });
  });

  describe("GPU Burn Tests", () => {
    it("should run GPU burn test", () => {
      const parsed = parse("gpu-burn 60");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("gpu-burn 60");
      expect(result.output).toMatch(/Gflop\/s/);
    });
  });

  describe("all_reduce_perf Tests", () => {
    it("should run default all_reduce_perf benchmark", () => {
      const parsed = parse("all_reduce_perf");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nThread 1 nGpus 1");
      expect(result.output).toContain("Using devices");
      expect(result.output).toContain("Rank");
      expect(result.output).toContain("float");
      expect(result.output).toContain("busbw");
      expect(result.output).toContain("Avg bus bandwidth");
    });

    it("should respect -b and -e flags for message sizes", () => {
      const parsed = parse("all_reduce_perf -b 8 -e 128M");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("minBytes 8");
      expect(result.output).toContain("maxBytes 134217728");
    });

    it("should show GPU device information from node", () => {
      const parsed = parse("all_reduce_perf");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA H100-SXM5-80GB");
    });

    it("should include out-of-place and in-place columns", () => {
      const parsed = parse("all_reduce_perf -b 8 -e 128M");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("out-of-place");
      expect(result.output).toContain("in-place");
      expect(result.output).toContain("Out of bounds values : 0 OK");
    });

    it("should match validation patterns reduce|perf|bandwidth", () => {
      const parsed = parse("all_reduce_perf -b 8 -e 128M");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // The output should match all validation patterns used in scenarios
      expect(result.output).toMatch(/reduce|perf|bandwidth/i);
    });
  });

  describe("NCCL busbw/algbw math (PHYS-5 regression)", () => {
    beforeEach(() => {
      // The PHYS-5 ceiling assertions reference DGX-A100's documented
      // ~240 GB/s achieved busbw (ncclBaselineBandwidthGBs); the default
      // mock node is DGX-H100, so switch the systemType for these tests.
      useSimulationStore.getState().cluster.nodes[0].systemType = "DGX-A100";
    });

    it("nccl-test all_reduce: busbw never exceeds the architecture's real achieved-bandwidth ceiling", () => {
      // DGX-A100's real achieved busbw ceiling is ~240 GB/s (ncclBaselineBandwidthGBs).
      // The old code multiplied an already-busbw-scale baseline by the ring
      // factor a second time, producing ~359 GB/s -- physically impossible.
      const result = simulator.execute(
        parse("nccl-test -b 128M -e 128M -g 8"),
        context,
      );
      expect(result.exitCode).toBe(0);
      const busbwMatches = [
        ...result.output.matchAll(/\s(\d+\.\d{2})\s+\d+e\+00/g),
      ];
      expect(busbwMatches.length).toBeGreaterThan(0);
      for (const m of busbwMatches) {
        expect(parseFloat(m[1])).toBeLessThanOrEqual(240 * 1.05); // small headroom for the size-efficiency curve
      }
    });

    it("nccl-test all_reduce: printed busbw = printed algbw * ring factor (8 GPUs: 2*(8-1)/8 = 1.75x)", () => {
      const result = simulator.execute(
        parse("nccl-test -b 128M -e 128M -g 8"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // Data row: "        128M <count>   float     sum   <time> <algbw> <busbw>  0e+00 ..."
      const row = result.output.split("\n").find((l) => /^\s*128M\s/.test(l));
      expect(row).toBeDefined();
      const nums = row!.trim().split(/\s+/);
      // columns: size count type redop time algbw busbw error time algbw busbw error
      const algbw = parseFloat(nums[5]);
      const busbw = parseFloat(nums[6]);
      expect(busbw).toBeCloseTo(algbw * 1.75, 1);
      expect(busbw).toBeLessThanOrEqual(240 * 1.05);
    });

    it("mpirun all_reduce_perf (handleAllReducePerf path): busbw = algbw * ring factor, not double-scaled", () => {
      const result = simulator.execute(
        parse("mpirun -np 8 ./all_reduce_perf -b 128M -e 128M -g 8"),
        context,
      );
      expect(result.exitCode).toBe(0);
      const row = result.output
        .split("\n")
        .find((l) => /^\s*134217728\s/.test(l));
      expect(row).toBeDefined();
      const nums = row!.trim().split(/\s+/);
      // columns here: size count type redop root time algbw busbw #wrong ...
      const algbw = parseFloat(nums[6]);
      const busbw = parseFloat(nums[7]);
      expect(busbw).toBeCloseTo(algbw * 1.75, 1);
      expect(busbw).toBeLessThanOrEqual(240 * 1.05);
    });
  });

  describe("mpirun Tests", () => {
    it("should error when no executable is specified", () => {
      const parsed = parse("mpirun");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("no executable specified");
    });

    it("should wrap all_reduce_perf output", () => {
      const parsed = parse("mpirun -np 16 all_reduce_perf");
      // Manually set np flag since parser may treat -np differently
      parsed.flags.set("np", "16");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mpirun: launching 16 process(es)");
      expect(result.output).toContain("Avg bus bandwidth");
      expect(result.output).toContain("all 16 process(es) completed");
    });

    it("should wrap HPL output when executable is hpl", () => {
      const parsed = parse("mpirun -np 8 ./hpl");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("mpirun: launching 8 process(es)");
      expect(result.output).toContain("HPL");
      expect(result.output).toContain("Gflops");
      expect(result.output).toContain("all 8 process(es) completed");
    });

    it("should show hosts when -H flag is provided", () => {
      const parsed = parse("mpirun -np 16 -H node1,node2 all_reduce_perf");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hosts: node1,node2");
    });

    it("should handle generic wrapped command", () => {
      const parsed = parse("mpirun -np 4 my_benchmark");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Executing: my_benchmark");
      expect(result.output).toContain("Process 0 completed successfully");
      expect(result.output).toContain("all 4 process(es) completed");
    });

    it("should match validation patterns for NCCL scenario", () => {
      const parsed = parse("mpirun -np 16 -H node1,node2 all_reduce_perf");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Validation pattern: "all_reduce|perf|node"
      expect(result.output).toMatch(/reduce|perf|node/i);
    });

    it("should match validation patterns for HPL scenario", () => {
      const parsed = parse("mpirun -np 8 ./hpl");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Validation pattern: "HPL|Gflops"
      expect(result.output).toMatch(/HPL|Gflops/);
    });
  });

  describe("NCCL collective commands (PR #77)", () => {
    it.each([
      ["reduce_perf", "reduce"],
      ["broadcast_perf", "broadcast"],
      ["all_gather_perf", "all_gather"],
      ["reduce_scatter_perf", "reduce_scatter"],
      ["sendrecv_perf", "sendrecv"],
      ["scatter_perf", "scatter"],
      ["gather_perf", "gather"],
    ])("%s should run successfully with the default operation", (command) => {
      const result = simulator.execute(parse(command), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nccl-tests");
    });

    it("scatter_perf should respect an explicit -b/-e size range", () => {
      const result = simulator.execute(
        parse("scatter_perf -b 8 -e 128M"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("minBytes 8");
      expect(result.output).toContain("maxBytes 134217728");
    });
  });

  describe("nvbandwidth and p2pBandwidthLatencyTest (PR #77)", () => {
    it("nvbandwidth should default to device_to_device", () => {
      const result = simulator.execute(parse("nvbandwidth"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvbandwidth Version: 0.4");
      expect(result.output).toContain("Running device_to_device...");
      expect(result.output).toContain("Peak bandwidth:");
    });

    it("nvbandwidth should honor --testcase host_to_device", () => {
      const result = simulator.execute(
        parse("nvbandwidth --testcase host_to_device"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Running host_to_device...");
      expect(result.output).toContain("Host->GPU");
    });

    it("nvbandwidth --help should print usage and not run a test", () => {
      const result = simulator.execute(parse("nvbandwidth --help"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage: nvbandwidth");
      expect(result.output).not.toContain("Running");
    });

    it("nvbandwidth should report H100's real 3.35 TB/s HBM ceiling, not the A100 value", () => {
      const result = simulator.execute(parse("nvbandwidth"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("HBM theoretical: 3350 GB/s");
    });

    it("nvbandwidth should error when the node has no GPUs", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: {
          nodes: [{ id: "dgx-00", systemType: "DGX-H100", gpus: [] }],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = simulator.execute(parse("nvbandwidth"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No GPUs found on this node");
    });

    it("p2pBandwidthLatencyTest should print a bandwidth and latency matrix", () => {
      const result = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "P2P (Peer-to-Peer) GPU Bandwidth Latency Test",
      );
      expect(result.output).toContain("Device count: 2");
      expect(result.output).toContain(
        "Unidirectional P2P=Enabled Bandwidth (GB/s)",
      );
      expect(result.output).toContain("P2P=Enabled Latency (us)");
    });

    it("p2pBandwidthLatencyTest --help should print usage and not run a test", () => {
      const result = simulator.execute(
        parse("p2pBandwidthLatencyTest --help"),
        context,
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage: p2pBandwidthLatencyTest");
      expect(result.output).not.toContain("Device count");
    });

    it("p2pBandwidthLatencyTest should error when the node has no GPUs", () => {
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: {
          nodes: [{ id: "dgx-00", systemType: "DGX-H100", gpus: [] }],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        context,
      );

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No GPUs found on this node");
    });
  });
});
