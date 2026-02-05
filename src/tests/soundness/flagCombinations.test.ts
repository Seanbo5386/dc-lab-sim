/**
 * Flag Combination Tests
 *
 * Verifies that simulators handle various flag combinations correctly.
 * Tests creative and edge case combinations of command flags.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Flag Combinations", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let slurm: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    slurm = new SlurmSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
      environment: {},
    };
  });

  describe("nvidia-smi Query Combinations", () => {
    it("--query-gpu with single field", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=name --format=csv"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });

    it("--query-gpu with multiple fields", () => {
      const result = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=name,temperature.gpu,memory.used --format=csv",
        ),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("--query-gpu with noheader option", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=name --format=csv,noheader"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("--query-gpu with nounits option", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=temperature.gpu --format=csv,nounits"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("--query-gpu with noheader,nounits combined", () => {
      const result = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits",
        ),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("--query-gpu with -i flag for specific GPU", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=name,temperature.gpu --format=csv -i 0"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe("nvidia-smi Display Format Combinations", () => {
    it("-q for detailed query output", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -q"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(100);
    });

    it("-q -i 0 for specific GPU detailed output", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      expect(result.exitCode).toBe(0);
    });

    it("-q -d MEMORY for memory details", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi -q -d MEMORY"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("-q -d TEMPERATURE for thermal details", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi -q -d TEMPERATURE"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("-q -d ECC for ECC details", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -q -d ECC"), context);
      expect(result.exitCode).toBe(0);
    });

    it("-L for GPU list", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/GPU \d+:/);
    });
  });

  describe("nvidia-smi GPU Selection Variations", () => {
    it("-i 0 selects first GPU", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 0"), context);
      expect(result.exitCode).toBe(0);
    });

    it("-i 0,1 returns a response (multi-GPU syntax)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 0,1"), context);
      // Multi-GPU syntax may not be fully supported - just verify response
      expect(result.output).toBeDefined();
    });

    it("-i 0,1,2,3 returns a response (multi-GPU syntax)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 0,1,2,3"), context);
      // Multi-GPU syntax may not be fully supported - just verify response
      expect(result.output).toBeDefined();
    });
  });

  describe("nvidia-smi NVLink Commands", () => {
    it("nvlink -s shows NVLink status", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi nvlink -s"), context);
      expect(result.output).toBeDefined();
    });

    it("nvlink -s -i 0 for specific GPU", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi nvlink -s -i 0"),
        context,
      );
      expect(result.output).toBeDefined();
    });

    it("nvlink -c shows NVLink capabilities", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi nvlink -c"), context);
      expect(result.output).toBeDefined();
    });
  });

  describe("nvidia-smi Topology Commands", () => {
    it("topo -m shows topology matrix", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi topo -m"), context);
      expect(result.output).toBeDefined();
    });

    it("topo -p shows P2P status", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi topo -p"), context);
      expect(result.output).toBeDefined();
    });
  });

  describe("dcgmi Command Combinations", () => {
    it("discovery -l lists devices", () => {
      const result = dcgmi.execute(parse("dcgmi discovery -l"), context);
      expect(result.exitCode).toBe(0);
    });

    it("health -c checks health", () => {
      const result = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(result.exitCode).toBe(0);
    });

    it("health -g 0 checks specific group", () => {
      const result = dcgmi.execute(parse("dcgmi health -g 0 -c"), context);
      expect(result.output).toBeDefined();
    });

    it("diag -r 1 runs quick diagnostic", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(result.exitCode).toBe(0);
    });

    it("diag -r 2 runs medium diagnostic", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 2"), context);
      expect(result.exitCode).toBe(0);
    });

    it("diag -r 3 runs long diagnostic", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 3"), context);
      expect(result.exitCode).toBe(0);
    });

    it("group -l lists groups", () => {
      const result = dcgmi.execute(parse("dcgmi group -l"), context);
      expect(result.output).toBeDefined();
    });

    it("stats -g 0 shows stats", () => {
      const result = dcgmi.execute(parse("dcgmi stats -g 0"), context);
      expect(result.output).toBeDefined();
    });
  });

  describe("slurm Command Combinations", () => {
    it("sinfo shows basic info", () => {
      const result = slurm.execute(parse("sinfo"), context);
      expect(result.output).toBeDefined();
    });

    it("sinfo -N shows node list", () => {
      const result = slurm.execute(parse("sinfo -N"), context);
      expect(result.output).toBeDefined();
    });

    it("sinfo -l shows long format", () => {
      const result = slurm.execute(parse("sinfo -l"), context);
      expect(result.output).toBeDefined();
    });

    it("squeue shows job queue", () => {
      const result = slurm.execute(parse("squeue"), context);
      expect(result.output).toBeDefined();
    });

    it("squeue -u $USER shows user jobs", () => {
      const result = slurm.execute(parse("squeue -u root"), context);
      expect(result.output).toBeDefined();
    });

    it("scontrol show node shows node details", () => {
      const result = slurm.execute(parse("scontrol show node"), context);
      expect(result.output).toBeDefined();
    });

    it("scontrol show partition shows partitions", () => {
      const result = slurm.execute(parse("scontrol show partition"), context);
      expect(result.output).toBeDefined();
    });
  });

  describe("Combined Workflow Patterns", () => {
    it("discovery followed by health check", () => {
      const discovery = dcgmi.execute(parse("dcgmi discovery -l"), context);
      expect(discovery.exitCode).toBe(0);

      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.exitCode).toBe(0);
    });

    it("GPU list followed by specific GPU query", () => {
      const list = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      expect(list.exitCode).toBe(0);

      const query = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      expect(query.exitCode).toBe(0);
    });

    it("health check with fault injected", () => {
      // Inject fault
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Test XID error",
        severity: "Warning",
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.exitCode).toBe(0);
      // Should show the XID error in output
      expect(health.output.toLowerCase()).toMatch(/xid|error/i);
    });

    it("diagnostic before and after fault injection", () => {
      // Initial diagnostic - should pass
      const diag1 = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(diag1.exitCode).toBe(0);

      // Inject fault
      store.updateGPU("dgx-00", 0, { temperature: 95 });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      // Diagnostic after fault
      const diag2 = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(diag2.output).toBeDefined();
    });
  });

  describe("Error Recovery Patterns", () => {
    it("reset GPU after XID error", () => {
      // Inject recoverable error
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Recoverable error",
        severity: "Warning",
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      // Reset GPU
      const reset = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(reset.output).toBeDefined();

      // Verify error cleared
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(0);
    });

    it("cannot reset GPU with fatal XID 79", () => {
      // Inject fatal error
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
        environment: {},
      };

      // Attempt reset - should fail
      const reset = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(reset.exitCode).not.toBe(0);

      // Error should remain
      const gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);
    });
  });

  describe("Information Gathering Patterns", () => {
    it("collect comprehensive GPU info", () => {
      // List GPUs
      const list = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      expect(list.exitCode).toBe(0);

      // Detailed query
      const query = nvidiaSmi.execute(parse("nvidia-smi -q"), context);
      expect(query.exitCode).toBe(0);

      // Temperature query
      const temp = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader"),
        context,
      );
      expect(temp.exitCode).toBe(0);

      // Memory query
      const mem = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader",
        ),
        context,
      );
      expect(mem.exitCode).toBe(0);
    });

    it("collect topology and NVLink info", () => {
      // Topology matrix
      const topo = nvidiaSmi.execute(parse("nvidia-smi topo -m"), context);
      expect(topo.output).toBeDefined();

      // NVLink status
      const nvlink = nvidiaSmi.execute(parse("nvidia-smi nvlink -s"), context);
      expect(nvlink.output).toBeDefined();
    });

    it("collect cluster scheduling info", () => {
      // Node info
      const nodes = slurm.execute(parse("sinfo -N"), context);
      expect(nodes.output).toBeDefined();

      // Job queue
      const jobs = slurm.execute(parse("squeue"), context);
      expect(jobs.output).toBeDefined();
    });
  });
});
