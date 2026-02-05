import { describe, it, expect, beforeEach, vi } from "vitest";
import { NeMoSimulator } from "../nemoSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";
import { useSimulationStore } from "@/store/simulationStore";

// Mock the store
vi.mock("@/store/simulationStore");

describe("NeMoSimulator", () => {
  let simulator: NeMoSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NeMoSimulator();
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
            systemType: "DGX H100",
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
              { id: 2, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
              { id: 3, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
              { id: 4, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
              { id: 5, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
              { id: 6, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
              { id: 7, name: "NVIDIA H100 80GB HBM3", type: "H100-SXM" },
            ],
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Basic Commands", () => {
    it("should show version information", () => {
      const parsed = parse("nemo --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nemo version");
      expect(result.output).toContain("1.21.0");
    });

    it("should show help information", () => {
      const parsed = parse("nemo --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nemo -");
      expect(result.output).toContain("Commands:");
      expect(result.output).toContain("train");
      expect(result.output).toContain("burn-in");
    });

    it("should show help when no subcommand provided", () => {
      const parsed = parse("nemo");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage: nemo");
    });

    it("should reject unknown subcommand", () => {
      const parsed = parse("nemo invalid-cmd");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("not a nemo command");
    });
  });

  describe("Train Subcommand", () => {
    it("should require --model flag", () => {
      const parsed = parse("nemo train");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Missing required flag: --model");
      expect(result.output).toContain("Usage: nemo train --model");
    });

    it("should train with model name", () => {
      const parsed = parse("nemo train --model gpt3-175b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NeMo Framework - Model Training");
      expect(result.output).toContain("Model: gpt3-175b");
      expect(result.output).toContain("GPUs: 8");
      expect(result.output).toContain("Initializing distributed training");
      expect(result.output).toContain("Training completed successfully");
    });

    it("should accept any model name without validation", () => {
      const parsed = parse("nemo train --model custom-model-xyz");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Model: custom-model-xyz");
    });

    it("should train with custom GPU count", () => {
      const parsed = parse("nemo train --model llama2-70b --gpus 4");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Model: llama2-70b");
      expect(result.output).toContain("GPUs: 4");
    });

    it("should train with custom iterations", () => {
      const parsed = parse("nemo train --model bert-large --iterations 5000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iterations: 5000");
    });

    it("should show training progress with loss and throughput", () => {
      const parsed = parse("nemo train --model gpt3-7b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/loss=\d+\.\d+/);
      expect(result.output).toMatch(/throughput=\d+ samples\/sec/);
    });

    it("should show first 5 iterations for default training", () => {
      const parsed = parse("nemo train --model gpt3-7b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/1000");
      expect(result.output).toContain("Iteration 5/1000");
      expect(result.output).toContain("...");
      expect(result.output).toContain("Iteration 1000/1000");
    });

    it("should show all iterations for small iteration counts", () => {
      const parsed = parse("nemo train --model test-model --iterations 3");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/3");
      expect(result.output).toContain("Iteration 2/3");
      expect(result.output).toContain("Iteration 3/3");
      // Should not show ellipsis in iteration output (may appear in other parts like distributed training)
      expect(result.output).not.toMatch(/Iteration \d+\/\d+[\s\S]*\.\.\./);
    });

    it("should show checkpoint save location", () => {
      const parsed = parse("nemo train --model gpt3-175b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Model checkpoint saved to:");
      expect(result.output).toContain("/workspace/checkpoints/gpt3-175b/");
    });

    it("should show driver and CUDA version", () => {
      const parsed = parse("nemo train --model llama2-13b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Driver: 535.129.03");
      expect(result.output).toContain("CUDA: 12.2");
    });

    it("should show distributed training initialization", () => {
      const parsed = parse("nemo train --model gpt3-7b --gpus 8");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("[Rank 0] Initialized");
      expect(result.output).toMatch(/\[Rank \d+\] Initialized/);
    });
  });

  describe("Burn-in Subcommand", () => {
    it("should run burn-in with default parameters", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NeMo Training Burn-in Test");
      expect(result.output).toContain("Model: gpt3-7b");
      expect(result.output).toContain("GPUs: 8");
      expect(result.output).toContain("Iterations: 1000");
      expect(result.output).toContain("Burn-in Results:");
      expect(result.output).toContain("Status: PASSED");
    });

    it("should use node GPU count for burn-in", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("GPUs: 8"); // Should match node.gpus.length
    });

    it("should run burn-in with custom iterations", () => {
      const parsed = parse("nemo burn-in --iterations 500");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iterations: 500");
    });

    it("should run burn-in with custom model", () => {
      const parsed = parse("nemo burn-in --model llama2-13b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Model: llama2-13b");
    });

    it("should run burn-in with both custom model and iterations", () => {
      const parsed = parse("nemo burn-in --model llama2-13b --iterations 2000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Model: llama2-13b");
      expect(result.output).toContain("Iterations: 2000");
    });

    it("should show first 10 iterations for burn-in", () => {
      const parsed = parse("nemo burn-in --iterations 1000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/1000");
      expect(result.output).toContain("Iteration 10/1000");
      expect(result.output).toContain("... (990 more iterations)");
    });

    it("should show all iterations for small burn-in tests", () => {
      const parsed = parse("nemo burn-in --iterations 5");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/5");
      expect(result.output).toContain("Iteration 5/5");
      expect(result.output).not.toContain("more iterations");
    });

    it("should show loss, throughput, and GPU utilization metrics", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/loss=\d+\.\d+/);
      expect(result.output).toMatch(/throughput=\d+ samples\/sec/);
      expect(result.output).toMatch(/GPU util=\d+\.\d+%/);
    });

    it("should show comprehensive burn-in results", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Burn-in Results:");
      expect(result.output).toContain("Status: PASSED");
      expect(result.output).toContain("Average Loss:");
      expect(result.output).toContain("Average Throughput:");
      expect(result.output).toContain("Average GPU Utilization:");
      expect(result.output).toContain("Training Stability: Stable");
      expect(result.output).toContain("GPU Memory: No leaks detected");
      expect(result.output).toContain("Loss Convergence: Normal");
      expect(result.output).toContain("Failures: 0");
    });

    it("should monitor training stability indicators", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(
        "Monitoring: loss convergence, GPU utilization, memory stability",
      );
    });

    it("should show timestamp at start", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Start time:");
    });

    it("should report GPU utilization in expected range (95-99%)", () => {
      const parsed = parse("nemo burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract GPU utilization values from iteration output
      const utilMatches = result.output.matchAll(/GPU util=(\d+\.\d+)%/g);
      const utilValues = Array.from(utilMatches).map((match) =>
        parseFloat(match[1]),
      );

      // Verify all utilization values are in range
      utilValues.forEach((util) => {
        expect(util).toBeGreaterThanOrEqual(95);
        expect(util).toBeLessThanOrEqual(99);
      });
    });

    it("should show decreasing loss over iterations", () => {
      const parsed = parse("nemo burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract loss values from iteration output
      const lossMatches = result.output.matchAll(
        /Iteration \d+\/\d+: loss=(\d+\.\d+)/g,
      );
      const lossValues = Array.from(lossMatches).map((match) =>
        parseFloat(match[1]),
      );

      // First loss should be higher than last loss (showing convergence)
      expect(lossValues.length).toBeGreaterThan(1);
      expect(lossValues[0]).toBeGreaterThan(lossValues[lossValues.length - 1]);
    });

    it("should validate extended burn-in iterations", () => {
      const parsed = parse("nemo burn-in --iterations 5000");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iterations: 5000");
      expect(result.output).toContain("... (4990 more iterations)");
    });
  });

  describe("Output Format Validation", () => {
    it("should format training output properly", () => {
      const parsed = parse("nemo train --model gpt3-7b");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("================================");
      expect(result.output).toMatch(/Model: .+/);
      expect(result.output).toMatch(/GPUs: \d+/);
      expect(result.output).toMatch(/Iterations: \d+/);
    });

    it("should format burn-in output properly", () => {
      const parsed = parse("nemo burn-in");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("==========================");
      expect(result.output).toMatch(/Model: .+/);
      expect(result.output).toMatch(/GPUs: \d+/);
      expect(result.output).toMatch(/Iterations: \d+/);
    });

    it("should use consistent metric formatting", () => {
      const parsed = parse("nemo burn-in --iterations 5");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Check that all metrics use consistent decimal places
      const lossMatches = result.output.matchAll(/loss=(\d+\.\d{4})/g);
      expect(Array.from(lossMatches).length).toBeGreaterThan(0);

      const throughputMatches = result.output.matchAll(
        /throughput=(\d+) samples\/sec/g,
      );
      expect(Array.from(throughputMatches).length).toBeGreaterThan(0);

      const utilMatches = result.output.matchAll(/GPU util=(\d+\.\d{1})%/g);
      expect(Array.from(utilMatches).length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small iteration counts", () => {
      const parsed = parse("nemo burn-in --iterations 1");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 1/1");
      expect(result.output).not.toContain("more iterations");
    });

    it("should handle maximum iteration display properly", () => {
      const parsed = parse("nemo burn-in --iterations 10");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      // Should show all 10 iterations, not use ellipsis
      expect(result.output).toContain("Iteration 10/10");
      expect(result.output).not.toContain("more iterations");
    });

    it("should handle iteration boundary at 11", () => {
      const parsed = parse("nemo burn-in --iterations 11");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Iteration 10/11");
      expect(result.output).toContain("... (1 more iterations)");
    });
  });
});
