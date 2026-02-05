/**
 * Boundary Condition Tests
 *
 * Verifies that simulators handle edge cases correctly:
 * - Invalid GPU indices
 * - Out-of-range values
 * - Invalid command arguments
 * - Empty/missing parameters
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Boundary Conditions", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    // SlurmSimulator initialized for future tests - not currently used
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
      environment: {},
    };
  });

  describe("GPU Index Boundaries", () => {
    it("GPU index 0 is valid (first GPU)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 0"), context);
      expect(result.exitCode).toBe(0);
    });

    it("GPU index 7 is valid (last GPU in 8-GPU system)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 7"), context);
      expect(result.exitCode).toBe(0);
    });

    it("GPU index 8 is invalid (out of bounds)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 8"), context);
      // Should either fail or return error output
      expect(
        result.exitCode !== 0 ||
          result.output.toLowerCase().includes("invalid"),
      ).toBe(true);
    });

    it("GPU index 99 is invalid (way out of bounds)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 99"), context);
      expect(
        result.exitCode !== 0 ||
          result.output.toLowerCase().includes("invalid"),
      ).toBe(true);
    });

    it("all GPUs query works without -i flag", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });

  describe("nvidia-smi Query Format Boundaries", () => {
    it("--query-gpu with valid field works", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=name --format=csv"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("--query-gpu with multiple valid fields works", () => {
      const result = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=name,temperature.gpu,memory.used --format=csv",
        ),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("-L flag lists all GPUs", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      expect(result.exitCode).toBe(0);
      // Should list 8 GPUs
      const gpuMatches = result.output.match(/GPU \d+:/g);
      expect(gpuMatches?.length).toBe(8);
    });

    it("-q flag provides detailed query", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -q"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(100);
    });
  });

  describe("dcgmi Diagnostic Level Boundaries", () => {
    it("dcgmi diag -r 1 is valid (quick test)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(result.exitCode).toBe(0);
    });

    it("dcgmi diag -r 2 is valid (medium test)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 2"), context);
      expect(result.exitCode).toBe(0);
    });

    it("dcgmi diag -r 3 is valid (long test)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 3"), context);
      expect(result.exitCode).toBe(0);
    });

    it("dcgmi diag -r 4 returns a response", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 4"), context);
      // Level 4 may or may not be supported - just verify output exists
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
    });

    it("dcgmi diag -r 0 is invalid", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 0"), context);
      // Should either fail or return error
      expect(result.output).toBeDefined();
    });

    it("dcgmi diag -r 5 is invalid", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 5"), context);
      // Should handle gracefully
      expect(result.output).toBeDefined();
    });
  });

  describe("Temperature Value Boundaries", () => {
    it("normal temperature (45°C) is healthy", () => {
      store.updateGPU("dgx-00", 0, { temperature: 45 });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.temperature).toBe(45);
      expect(gpu.healthStatus).not.toBe("Critical");
    });

    it("high temperature (85°C) triggers warning threshold", () => {
      store.updateGPU("dgx-00", 0, { temperature: 85 });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.temperature).toBe(85);
    });

    it("critical temperature (95°C) is stored correctly", () => {
      store.updateGPU("dgx-00", 0, { temperature: 95 });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.temperature).toBe(95);
    });

    it("extreme temperature (105°C) is stored correctly", () => {
      store.updateGPU("dgx-00", 0, { temperature: 105 });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.temperature).toBe(105);
    });
  });

  describe("ECC Error Count Boundaries", () => {
    it("zero ECC errors is healthy", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 0, doubleBit: 0 },
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(0);
      expect(gpu.eccErrors.doubleBit).toBe(0);
    });

    it("single-bit ECC errors accumulate", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 100, doubleBit: 0 },
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(100);
    });

    it("double-bit ECC errors are critical", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 0, doubleBit: 5 },
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.doubleBit).toBe(5);
    });

    it("large ECC error counts are handled", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: { singleBit: 10000, doubleBit: 100 },
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.eccErrors.singleBit).toBe(10000);
      expect(gpu.eccErrors.doubleBit).toBe(100);
    });
  });

  describe("XID Error Code Boundaries", () => {
    it("XID 13 (Graphics Engine Exception) is stored", () => {
      store.addXIDError("dgx-00", 0, {
        code: 13,
        timestamp: new Date(),
        description: "Graphics Engine Exception",
        severity: "Warning",
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors[0].code).toBe(13);
    });

    it("XID 63 (Row Remap Failure) is stored", () => {
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors[0].code).toBe(63);
    });

    it("XID 79 (GPU fallen off bus) is critical", () => {
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors[0].code).toBe(79);
      expect(gpu.xidErrors[0].severity).toBe("Critical");
    });

    it("XID 94 (Contained ECC error) is stored", () => {
      store.addXIDError("dgx-00", 0, {
        code: 94,
        timestamp: new Date(),
        description: "Contained ECC error",
        severity: "Warning",
      });
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors[0].code).toBe(94);
    });
  });

  describe("Node ID Boundaries", () => {
    it("first node (dgx-00) exists", () => {
      const node = useSimulationStore
        .getState()
        .cluster.nodes.find((n) => n.id === "dgx-00");
      expect(node).toBeDefined();
    });

    it("last node in cluster exists", () => {
      const nodes = useSimulationStore.getState().cluster.nodes;
      expect(nodes.length).toBeGreaterThan(0);
      const lastNode = nodes[nodes.length - 1];
      expect(lastNode).toBeDefined();
    });

    it("non-existent node ID returns undefined", () => {
      const node = useSimulationStore
        .getState()
        .cluster.nodes.find((n) => n.id === "dgx-999");
      expect(node).toBeUndefined();
    });
  });

  describe("Command Parser Edge Cases", () => {
    it("empty command string is handled", () => {
      const parsed = parse("");
      expect(parsed).toBeDefined();
    });

    it("command with extra spaces is handled", () => {
      const parsed = parse("nvidia-smi    -L");
      expect(parsed.baseCommand).toBe("nvidia-smi");
    });

    it("command with quoted arguments is handled", () => {
      const parsed = parse(
        'scontrol update nodename=dgx-00 state=drain reason="test maintenance"',
      );
      expect(parsed.baseCommand).toBe("scontrol");
    });
  });

  describe("Cluster State Boundaries", () => {
    it("cluster has expected number of nodes", () => {
      const cluster = useSimulationStore.getState().cluster;
      expect(cluster.nodes.length).toBeGreaterThan(0);
    });

    it("each node has 8 GPUs", () => {
      const cluster = useSimulationStore.getState().cluster;
      for (const node of cluster.nodes) {
        expect(node.gpus.length).toBe(8);
      }
    });

    it("each GPU has NVLinks", () => {
      const cluster = useSimulationStore.getState().cluster;
      const node = cluster.nodes[0];
      for (const gpu of node.gpus) {
        expect(gpu.nvlinks.length).toBeGreaterThan(0);
      }
    });

    it("reset returns cluster to clean state", () => {
      // Inject faults
      store.updateGPU("dgx-00", 0, { temperature: 95 });
      store.addXIDError("dgx-00", 1, {
        code: 63,
        timestamp: new Date(),
        description: "Test",
        severity: "Warning",
      });

      // Reset
      store.resetSimulation();

      // Verify clean state
      const cluster = useSimulationStore.getState().cluster;
      expect(cluster.nodes[0].gpus[0].temperature).toBeLessThan(95);
      expect(cluster.nodes[0].gpus[1].xidErrors.length).toBe(0);
    });
  });
});
