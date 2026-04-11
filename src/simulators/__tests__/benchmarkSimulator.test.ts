import { describe, it, expect, beforeEach, vi } from "vitest";
import { BenchmarkSimulator } from "../benchmarkSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

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

      // DGX-H100 baseline is 240 TFLOPS; range is 90-100% of baseline
      tflopsValues.forEach((tf) => {
        expect(tf).toBeGreaterThanOrEqual(200);
        expect(tf).toBeLessThanOrEqual(260);
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
        // DGX-H100 baseline 240 TFLOPS at 90-100%
        expect(min).toBeGreaterThanOrEqual(200);
        expect(max).toBeLessThanOrEqual(260);
        // Std deviation should be positive
        expect(stdDev).toBeGreaterThan(0);
      }
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
      expect(result.output).toContain("NVIDIA H100 80GB HBM3");
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
});
