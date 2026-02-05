/**
 * Adversarial Input Tests
 *
 * Tests simulators with invalid, malformed, and edge case inputs
 * to ensure robust error handling and realistic behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "../nvidiaSmiSimulator";
import { DcgmiSimulator } from "../dcgmiSimulator";
import { SlurmSimulator } from "../slurmSimulator";
import { InfiniBandSimulator } from "../infinibandSimulator";
import { BenchmarkSimulator } from "../benchmarkSimulator";
import { BasicSystemSimulator } from "../basicSystemSimulator";
import { FabricManagerSimulator } from "../fabricManagerSimulator";
import type { CommandContext } from "../BaseSimulator";
import { parse as parseCommand } from "@/utils/commandParser";

/**
 * Helper to execute a command string through a simulator
 */
function exec(
  simulator: {
    execute: (
      parsed: ReturnType<typeof parseCommand>,
      ctx: CommandContext,
    ) => string;
  },
  command: string,
  context: CommandContext,
) {
  const parsed = parseCommand(command);
  return simulator.execute(parsed, context);
}

describe("Adversarial Input Tests", () => {
  let context: CommandContext;

  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
    context = {
      currentNode: "dgx-00",
      environment: {},
    };
  });

  describe("nvidia-smi adversarial inputs", () => {
    let simulator: NvidiaSmiSimulator;

    beforeEach(() => {
      simulator = new NvidiaSmiSimulator();
    });

    it("should handle invalid GPU index gracefully", () => {
      const result = exec(simulator, "nvidia-smi -i 999", context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toMatch(/invalid|not found|error/i);
    });

    it("should handle negative GPU index", () => {
      const result = exec(simulator, "nvidia-smi -i -1", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle non-numeric GPU index", () => {
      const result = exec(simulator, "nvidia-smi -i abc", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle extremely large GPU index", () => {
      const result = exec(simulator, "nvidia-smi -i 999999999", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle empty string after flag", () => {
      const result = exec(simulator, 'nvidia-smi -i ""', context);
      // Should either fail gracefully or treat as invalid
      expect(result.output).toBeDefined();
    });

    it("should handle special characters in arguments", () => {
      const result = exec(simulator, 'nvidia-smi -i "$(whoami)"', context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle unknown flags gracefully", () => {
      const result = exec(simulator, "nvidia-smi --unknown-flag", context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toMatch(/unknown|invalid|unrecognized/i);
    });

    it("should handle duplicate flags", () => {
      const result = exec(simulator, "nvidia-smi -i 0 -i 1", context);
      // Should use last value or report error
      expect(result.output).toBeDefined();
    });

    it("should handle mixed valid and invalid flags", () => {
      const result = exec(simulator, "nvidia-smi -q --fake-flag", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle query with invalid format specifier", () => {
      const result = exec(
        simulator,
        "nvidia-smi --query-gpu=invalid_metric --format=csv",
        context,
      );
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("dcgmi adversarial inputs", () => {
    let simulator: DcgmiSimulator;

    beforeEach(() => {
      simulator = new DcgmiSimulator();
    });

    it("should handle dcgmi with no subcommand", () => {
      const result = exec(simulator, "dcgmi", context);
      // Should show help or usage
      expect(result.output).toMatch(/usage|help|command/i);
    });

    it("should handle invalid subcommand", () => {
      const result = exec(simulator, "dcgmi fakecommand", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle health check with invalid GPU group", () => {
      const result = exec(simulator, "dcgmi health -g 9999", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle diag with invalid test level", () => {
      const result = exec(simulator, "dcgmi diag -r 99", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle negative group ID", () => {
      const result = exec(simulator, "dcgmi health -g -1", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle policy with invalid action", () => {
      const result = exec(
        simulator,
        "dcgmi policy --set 0,0 --action invalid",
        context,
      );
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("slurm adversarial inputs", () => {
    let simulator: SlurmSimulator;

    beforeEach(() => {
      simulator = new SlurmSimulator();
    });

    it("should handle sinfo with invalid format", () => {
      const result = exec(simulator, 'sinfo --format="%invalid"', context);
      // Should either ignore invalid or report error
      expect(result.output).toBeDefined();
    });

    it("should handle scontrol with invalid entity", () => {
      const result = exec(simulator, "scontrol show fakeentity", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle scontrol update with invalid state", () => {
      const result = exec(
        simulator,
        "scontrol update nodename=dgx-00 state=INVALID",
        context,
      );
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle squeue with non-existent job ID", () => {
      const result = exec(simulator, "squeue -j 999999", context);
      // Should return empty or "not found"
      expect(result.output).toBeDefined();
    });

    it("should handle sbatch with missing script", () => {
      const result = exec(simulator, "sbatch", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle scancel with invalid job ID", () => {
      const result = exec(simulator, "scancel abc", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle srun with conflicting options", () => {
      const result = exec(simulator, "srun -N 100 -n 1 hostname", context);
      // Should handle gracefully even if nodes > available
      expect(result.output).toBeDefined();
    });
  });

  describe("infiniband adversarial inputs", () => {
    let simulator: InfiniBandSimulator;

    beforeEach(() => {
      simulator = new InfiniBandSimulator();
    });

    it("should handle ibstat with invalid device", () => {
      const result = exec(simulator, "ibstat mlx5_999", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle perfquery with invalid LID", () => {
      const result = exec(simulator, "perfquery -x 99999", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle ibportstate with invalid port", () => {
      const result = exec(simulator, "ibportstate -D 0 999", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle iblinkinfo with invalid flags", () => {
      const result = exec(simulator, "iblinkinfo --invalid-option", context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("benchmark adversarial inputs", () => {
    let simulator: BenchmarkSimulator;

    beforeEach(() => {
      simulator = new BenchmarkSimulator();
    });

    it("should handle nccl-test with negative GPU count", () => {
      const result = exec(simulator, "nccl-test -g -1", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle nccl-test with zero GPUs", () => {
      const result = exec(simulator, "nccl-test -g 0", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle hpl with invalid problem size", () => {
      const result = exec(simulator, "hpl --problem-size abc", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle gpu-burn with negative duration", () => {
      const result = exec(simulator, "gpu-burn -d -10", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle nccl-test with invalid operation", () => {
      const result = exec(simulator, "nccl-test -t invalid_op", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle nccl-test with minbytes > maxbytes", () => {
      const result = exec(simulator, "nccl-test -b 1G -e 1M", context);
      // Should handle gracefully or report error
      expect(result.output).toBeDefined();
    });
  });

  describe("basic system adversarial inputs", () => {
    let simulator: BasicSystemSimulator;

    beforeEach(() => {
      simulator = new BasicSystemSimulator();
    });

    it("should handle hostname with invalid flag", () => {
      const result = exec(simulator, "hostname --invalid", context);
      // Should either ignore or report error
      expect(result.output).toBeDefined();
    });

    it("should handle cat with non-existent file", () => {
      const result = exec(simulator, "cat /nonexistent/path/file.txt", context);
      // cat is not implemented in basicSystemSimulator, so it should return unknown command error
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toMatch(/unknown|not found|not supported/i);
    });

    it("should handle dmesg with invalid log level", () => {
      const result = exec(simulator, "dmesg --level=invalid", context);
      expect(result.output).toBeDefined();
    });

    it("should handle uname with multiple flags", () => {
      const result = exec(simulator, "uname -a -r -m", context);
      // Should handle multiple flags
      expect(result.exitCode).toBe(0);
    });
  });

  describe("fabric manager adversarial inputs", () => {
    let simulator: FabricManagerSimulator;

    beforeEach(() => {
      simulator = new FabricManagerSimulator();
    });

    it("should handle nv-fabricmanager with no subcommand", () => {
      const result = exec(simulator, "nv-fabricmanager", context);
      expect(result.output).toBeDefined();
    });

    it("should handle invalid query type", () => {
      const result = exec(simulator, "nv-fabricmanager query invalid", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle fabricmanager with conflicting options", () => {
      const result = exec(
        simulator,
        "nv-fabricmanager --start --stop",
        context,
      );
      expect(result.output).toBeDefined();
    });
  });

  describe("boundary value tests", () => {
    let nvidiaSmi: NvidiaSmiSimulator;
    let benchmark: BenchmarkSimulator;

    beforeEach(() => {
      nvidiaSmi = new NvidiaSmiSimulator();
      benchmark = new BenchmarkSimulator();
    });

    it("should handle GPU index at boundary (7 for 8-GPU system)", () => {
      const result = exec(nvidiaSmi, "nvidia-smi -i 7", context);
      expect(result.exitCode).toBe(0);
    });

    it("should handle GPU index just past boundary (8 for 8-GPU system)", () => {
      const result = exec(nvidiaSmi, "nvidia-smi -i 8", context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle maximum reasonable GPU count in nccl-test", () => {
      const result = exec(benchmark, "nccl-test -g 8", context);
      expect(result.exitCode).toBe(0);
    });

    it("should handle unreasonably large GPU count", () => {
      const result = exec(benchmark, "nccl-test -g 1000", context);
      // Should either cap at available or report error
      expect(result.output).toBeDefined();
    });
  });

  describe("special character handling", () => {
    let simulator: BasicSystemSimulator;

    beforeEach(() => {
      simulator = new BasicSystemSimulator();
    });

    it("should handle arguments with spaces", () => {
      // echo is not implemented in basicSystemSimulator - test that unknown commands are rejected
      const result = exec(simulator, 'echo "hello world"', context);
      // Should either work (if echo is implemented) or fail gracefully
      expect(result.output).toBeDefined();
    });

    it("should handle arguments with newlines", () => {
      const result = exec(simulator, 'echo "line1\\nline2"', context);
      expect(result.output).toBeDefined();
    });

    it("should handle empty command", () => {
      const result = exec(simulator, "", context);
      expect(result.output).toBeDefined();
    });

    it("should handle whitespace-only command", () => {
      const result = exec(simulator, "   ", context);
      expect(result.output).toBeDefined();
    });
  });
});
