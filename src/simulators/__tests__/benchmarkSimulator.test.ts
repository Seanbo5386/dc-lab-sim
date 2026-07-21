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
) {
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
    dpus: [],
    hcas: [],
    bmc: {
      ipAddress: "10.0.0.1",
      macAddress: "00:11:22:33:44:55",
      firmwareVersion: "1.0",
      manufacturer: "NVIDIA",
      sensors: [],
      powerState: "On",
    },
    cpuModel: "AMD EPYC 7742",
    cpuCount: 2,
    ramTotal: 1024,
    ramUsed: 256,
    osVersion: "Ubuntu 22.04",
    kernelVersion: "5.15.0",
  };
  const updateGPU = vi.fn(
    (_nodeId: string, gpuId: number, updates: Partial<GPU>) => {
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

    // The shared `context` fixture models a DGX-H100 node, whose
    // ncclBaselineBandwidthGBs baseline is 380 GB/s. Burn-in reports
    // 90-100% of that baseline (SIM-31 -- was a flat 280-300 literal).
    const H100_NCCL_BASELINE = 380;
    const H100_NCCL_MIN = H100_NCCL_BASELINE * 0.9;
    const H100_NCCL_MAX = H100_NCCL_BASELINE;

    it("should report bandwidth within the H100 baseline range (342-380 GB/s)", () => {
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
        expect(bw).toBeGreaterThanOrEqual(H100_NCCL_MIN);
        expect(bw).toBeLessThanOrEqual(H100_NCCL_MAX);
      });
    });

    it("NCCL burn-in bandwidth scales with the node's real architecture baseline, not a flat 280-300 GB/s literal (SIM-31)", () => {
      const a100 = buildContextWithGpu(
        { name: "NVIDIA A100-SXM4-80GB" },
        "DGX-A100",
      );
      const a100Result = simulator.execute(
        parse("nccl-test --burn-in --iterations 5"),
        a100.context,
      );
      const a100Bws = [
        ...a100Result.output.matchAll(/Iteration \d+\/\d+: ([\d.]+) GB\/s/g),
      ].map((m) => parseFloat(m[1]));
      expect(a100Bws.length).toBe(5);
      for (const bw of a100Bws) {
        expect(bw).toBeGreaterThanOrEqual(240 * 0.9);
        expect(bw).toBeLessThanOrEqual(240 * 1.05);
      }

      const vr200 = buildContextWithGpu(
        { name: "NVIDIA R200-SXM-288GB" },
        "DGX-VR200",
      );
      const vr200Result = simulator.execute(
        parse("nccl-test --burn-in --iterations 5"),
        vr200.context,
      );
      const vr200Bws = [
        ...vr200Result.output.matchAll(/Iteration \d+\/\d+: ([\d.]+) GB\/s/g),
      ].map((m) => parseFloat(m[1]));
      for (const bw of vr200Bws) {
        expect(bw).toBeGreaterThanOrEqual(1520 * 0.9);
        expect(bw).toBeLessThanOrEqual(1520 * 1.05);
      }
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
        expect(min).toBeGreaterThanOrEqual(H100_NCCL_MIN);
        expect(max).toBeLessThanOrEqual(H100_NCCL_MAX);
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
    // Small epsilon: the runtime value is computed as
    // `baseline * (0.9 + Math.random() * 0.1)`, which can round to a
    // hair below `baseline * 0.9` computed directly (IEEE-754 rounding
    // differs between the two expressions at the ~1e-13 level) when
    // Math.random() lands very close to 0 -- flaky without this margin.
    const H100_BURN_IN_2GPU_MIN = H100_BURN_IN_2GPU_BASELINE * 0.9 - 0.01;
    const H100_BURN_IN_2GPU_MAX = H100_BURN_IN_2GPU_BASELINE * 1.0 + 0.01;

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

    it("HPL: degradation is read from the CURRENT node, not node index 0 (final-review F2)", () => {
      // Node index 0 is healthy; the node the user is actually on (dgx-03)
      // is heavily degraded. Before the fix, gpusInvolved was a positional
      // slice starting at node index 0, so a single-node run on dgx-03
      // silently reported node 0's healthy numbers.
      const { node: healthyNode } = buildContextWithGpu({
        clocksSM: 1980,
        powerLimit: 700,
      });
      const degradedNode: DGXNode = {
        ...healthyNode,
        id: "dgx-03",
        hostname: "dgx-node04",
        gpus: [
          {
            ...healthyNode.gpus[0],
            uuid: "GPU-bench-remote-0",
            clocksSM: 500,
            powerLimit: 200,
          },
        ],
      };
      vi.mocked(useSimulationStore.getState).mockReturnValue({
        cluster: { nodes: [healthyNode, degradedNode] },
        updateGPU: vi.fn(),
      } as never);

      const onDegraded: CommandContext = {
        currentNode: "dgx-03",
        currentPath: "/root",
        environment: {},
        history: [],
      };
      const degradedResult = simulator.execute(
        parse("hpl --gpus-per-node 1 --nodes 1"),
        onDegraded,
      );
      expect(degradedResult.output).toContain("WARNING - Low efficiency");

      // Sanity: the same command run while actually on healthy node 0
      // still passes -- the fix only changes which node is read.
      const onHealthy: CommandContext = {
        currentNode: "dgx-00",
        currentPath: "/root",
        environment: {},
        history: [],
      };
      const healthyResult = simulator.execute(
        parse("hpl --gpus-per-node 1 --nodes 1"),
        onHealthy,
      );
      expect(healthyResult.output).toContain("PASSED");
      expect(healthyResult.output).not.toContain("WARNING - Low efficiency");
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

    it("gpu-burn: stressed GPU state persists for the requested duration, not a fixed 2 seconds (PHYS-15)", () => {
      vi.useFakeTimers();
      try {
        const { context: burnContext, updateGPU } = buildContextWithGpu({
          name: "NVIDIA H100-SXM5-80GB",
          utilization: 0,
          temperature: 45,
          powerLimit: 700,
        });
        simulator.execute(parse("gpu-burn 300"), burnContext);

        // Still within the requested 300s window: state must not have reverted.
        vi.advanceTimersByTime(250_000);
        const callsBefore = updateGPU.mock.calls.length;
        const lastCallBefore = updateGPU.mock.calls[callsBefore - 1];
        expect(lastCallBefore[2]).toMatchObject({ utilization: 100 });

        // Past the requested duration: state should now revert.
        vi.advanceTimersByTime(60_000);
        const lastCallAfter =
          updateGPU.mock.calls[updateGPU.mock.calls.length - 1];
        expect(lastCallAfter[2]).toMatchObject({ utilization: 0 });
      } finally {
        vi.useRealTimers();
      }
    });

    it("gpu-burn: reported Gflop/s scales down for a GPU already capped below its rated TDP (PHYS-15)", () => {
      const healthy = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        powerLimit: 700,
      });
      const healthyResult = simulator.execute(
        parse("gpu-burn 10"),
        healthy.context,
      );
      const healthyFlops = parseFloat(
        healthyResult.output.match(/([\d.]+) Gflop\/s/)![1],
      );

      const capped = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        powerLimit: 350,
      });
      const cappedResult = simulator.execute(
        parse("gpu-burn 10"),
        capped.context,
      );
      const cappedFlops = parseFloat(
        cappedResult.output.match(/([\d.]+) Gflop\/s/)![1],
      );

      expect(cappedFlops).toBeLessThan(healthyFlops * 0.6);
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

  describe("Single-rank NCCL runs stay finite (final-review F1)", () => {
    it("nccl-test with 1 GPU prints 0.00 algbw/busbw per row, not Infinity/NaN", () => {
      // A 1-rank all_reduce has ring factor 2*(1-1)/1 = 0; before the fix
      // the handler divided busBW by it and printed literal "Infinity".
      const { context: ctx } = buildContextWithGpu({}, "DGX-H100", 1);
      const result = simulator.execute(
        parse("nccl-test --ngpus 1 --nodes 1 -b 128M -e 128M"),
        ctx,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("Infinity");
      expect(result.output).not.toContain("NaN");
      // Row structure is preserved (real nccl-tests still prints a row per
      // size for a degenerate 1-rank run), just with 0.00 bandwidths.
      const row = result.output.split("\n").find((l) => /^\s*128M\s/.test(l));
      expect(row).toBeDefined();
      const nums = row!.trim().split(/\s+/);
      // columns: size count type redop time algbw busbw error ...
      expect(nums[5]).toBe("0.00"); // algbw
      expect(nums[6]).toBe("0.00"); // busbw
      expect(result.output).toContain("Avg bus bandwidth    : 0.00");
    });

    it("shipped scenario command 'mpirun -np 64 all_reduce_perf -b 8 -e 1G -f 2 -g 1' produces finite 0.00 rows", () => {
      // Exact expectedCommand from narrativeScenarios.json -- -g 1 hits
      // handleAllReducePerf's ngpus=1 ring-factor divide-by-zero path.
      const { context: ctx } = buildContextWithGpu({}, "DGX-H100", 8);
      const result = simulator.execute(
        parse("mpirun -np 64 all_reduce_perf -b 8 -e 1G -f 2 -g 1"),
        ctx,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("Infinity");
      expect(result.output).not.toContain("NaN");
      // Every data row reports 0.00 algbw and 0.00 busbw
      const rows = result.output
        .split("\n")
        .filter((l) => /^\s*\d+\s+\d+\s+float\s+sum/.test(l));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const nums = row.trim().split(/\s+/);
        // columns: size count type redop root time algbw busbw #wrong ...
        expect(nums[6]).toBe("0.00"); // algbw
        expect(nums[7]).toBe("0.00"); // busbw
      }
      expect(result.output).toContain("Avg bus bandwidth    : 0.0000");
      expect(result.output).toContain(
        "mpirun: all 64 process(es) completed successfully",
      );
    });
  });

  describe("NCCL bandwidth reflects NVLink health (PHYS-6)", () => {
    it("single-node all_reduce_perf busbw drops when a GPU's NVLink is Down", () => {
      const healthy = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        nvlinks: [
          {
            linkId: 0,
            status: "Active",
            speed: 25,
            txErrors: 0,
            rxErrors: 0,
            replayErrors: 0,
          },
        ],
      });
      const healthyResult = simulator.execute(
        parse("all_reduce_perf -b 128M -e 128M -g 8"),
        healthy.context,
      );
      const healthyBusbw = parseFloat(
        healthyResult.output.match(/Avg bus bandwidth\s*:\s*([\d.]+)/)![1],
      );

      const degraded = buildContextWithGpu({
        name: "NVIDIA H100-SXM5-80GB",
        nvlinks: [
          {
            linkId: 0,
            status: "Down",
            speed: 25,
            txErrors: 100,
            rxErrors: 0,
            replayErrors: 0,
          },
        ],
      });
      const degradedResult = simulator.execute(
        parse("all_reduce_perf -b 128M -e 128M -g 8"),
        degraded.context,
      );
      const degradedBusbw = parseFloat(
        degradedResult.output.match(/Avg bus bandwidth\s*:\s*([\d.]+)/)![1],
      );

      expect(degradedBusbw).toBeLessThan(healthyBusbw * 0.6);
    });

    // NOTE: all_reduce_perf's handler (handleAllReducePerf) has no "nodes"
    // flag at all -- it always calls calculateNCCLBandwidthMultiNode with a
    // hardcoded numNodes=1, so "all_reduce_perf ... --nodes 4" (as the PHYS-6
    // plan draft assumed) would silently stay on the single-node branch and
    // never touch the NIC-ceiling code path this test is meant to lock in.
    // "nccl-test" (-> handleRegularTest) is the command that actually
    // supports -n/--nodes and reaches the numNodes > 1 branch (see the
    // PHYS-5 regression describe block above, which uses the same command
    // for its single-node ceiling check).
    it("multi-node busbw never exceeds the architecture's real NIC ceiling (already-correct behavior, now locked in)", () => {
      const result = simulator.execute(
        parse("nccl-test -b 128M -e 128M -g 8 -n 4"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // DGX-H100: interNodeBandwidthGBs 50 * hcaCount 8 = 400 GB/s ceiling
      const busbwMatches = [
        ...result.output.matchAll(/\s(\d+\.\d{2})\s+\d+e\+00/g),
      ];
      expect(busbwMatches.length).toBeGreaterThan(0);
      for (const m of busbwMatches) {
        expect(parseFloat(m[1])).toBeLessThanOrEqual(400 * 1.05);
      }
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

  describe("p2pBandwidthLatencyTest per-architecture bandwidth (PHYS-12)", () => {
    it("DGX-A100 output is unchanged (the existing literals were correct for A100)", () => {
      const a100 = buildContextWithGpu(
        { name: "NVIDIA A100-SXM4-80GB" },
        "DGX-A100",
        2,
      );
      const result = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        a100.context,
      );
      expect(result.exitCode).toBe(0);
      // Byte-exact matrix rows from the pre-fix handler (diagonal 1555.2,
      // off-diagonal 252.3 + (i+j)*0.5 = 252.8 for the 0<->1 pair). The
      // calibration constants must reproduce these exactly for A100.
      expect(result.output).toContain("     0  1555.2  252.8");
      expect(result.output).toContain("     1  252.8  1555.2");
    });

    it("H100 reports its own (higher) HBM3/NVLink4 bandwidth, not A100's numbers", () => {
      const h100 = buildContextWithGpu(
        { name: "NVIDIA H100-SXM5-80GB" },
        "DGX-H100",
      );
      const result = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        h100.context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).not.toContain("1555.2");
      expect(result.output).not.toContain("  252.3");
    });

    it("a Down NVLink on GPU 0 degrades only cells touching GPU 0, not GPU 1's healthy cells", () => {
      const healthy = buildContextWithGpu(
        { name: "NVIDIA H100-SXM5-80GB" },
        "DGX-H100",
        2,
      );
      const healthyResult = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        healthy.context,
      );
      const healthyRow0 = healthyResult.output
        .split("\n")
        .find((l) => /^\s*0\s+[\d.]/.test(l))!;
      const healthyCell01 = parseFloat(healthyRow0.trim().split(/\s+/)[2]);

      const degraded = buildContextWithGpu(
        { name: "NVIDIA H100-SXM5-80GB" },
        "DGX-H100",
        2,
      );
      degraded.node.gpus[0].nvlinks = [
        {
          linkId: 0,
          status: "Down",
          speed: 25,
          txErrors: 100,
          rxErrors: 0,
          replayErrors: 0,
        },
      ];
      const degradedResult = simulator.execute(
        parse("p2pBandwidthLatencyTest"),
        degraded.context,
      );
      const degradedRow0 = degradedResult.output
        .split("\n")
        .find((l) => /^\s*0\s+[\d.]/.test(l))!;
      const degradedCell01 = parseFloat(degradedRow0.trim().split(/\s+/)[2]);

      expect(degradedCell01).toBeLessThan(healthyCell01);
    });
  });
});
