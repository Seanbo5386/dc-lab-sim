import { describe, it, expect } from "vitest";
import { ScenarioValidator } from "../scenarioValidator";
import type { ScenarioStep } from "@/types/scenarios";

/**
 * Helper to build a minimal ScenarioStep with validation rules.
 */
function makeStep(
  expectedCommands: string[],
  validationCommand: string,
  validationPattern?: string,
  requireAll = false,
): ScenarioStep {
  return {
    id: "test-step",
    title: "Test Step",
    objectives: [`Run ${validationCommand}`],
    expectedCommands,
    validationRules: [
      {
        type: "command-executed",
        description: `Run ${validationCommand}`,
        expectedCommands,
        outputPattern: validationPattern,
        requireAllCommands: requireAll,
      },
    ],
  } as unknown as ScenarioStep;
}

const ctx = {
  currentNode: "dgx-00",
  currentPath: "/root",
  environment: {},
  history: [],
};

describe("ScenarioValidator - command matching", () => {
  describe("single-word commands", () => {
    const step = makeStep(["sinfo"], "sinfo", "STATE|alloc|idle");

    it("matches the exact command", () => {
      const r = ScenarioValidator.validateCommand(
        "sinfo",
        "PARTITION...",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("matches with flags", () => {
      const r = ScenarioValidator.validateCommand(
        "sinfo -N",
        "PARTITION...",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("rejects a different command", () => {
      const r = ScenarioValidator.validateCommand(
        "squeue",
        "JOBID...",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });
  });

  describe("multi-part commands with quoted args", () => {
    const step = makeStep(
      [
        "scontrol update nodename=dgx-01 state=drain reason='BMC firmware update'",
      ],
      "scontrol",
      "drain|update|state",
    );

    it("matches the expected command exactly", () => {
      const r = ScenarioValidator.validateCommand(
        "scontrol update nodename=dgx-01 state=drain reason='BMC firmware update'",
        "Node dgx-01 updated successfully",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("matches with different casing in reason", () => {
      const r = ScenarioValidator.validateCommand(
        "scontrol update nodename=dgx-01 state=drain reason='BMC Firmware Update'",
        "Node dgx-01 updated successfully",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("matches with a different node name", () => {
      const r = ScenarioValidator.validateCommand(
        "scontrol update nodename=dgx-05 state=drain reason='maintenance'",
        "Node dgx-05 updated successfully",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("rejects scontrol show (wrong subcommand)", () => {
      const r = ScenarioValidator.validateCommand(
        "scontrol show node dgx-01",
        "NodeName=dgx-01 State=IDLE",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });

    it("rejects a completely different command", () => {
      const r = ScenarioValidator.validateCommand(
        "sinfo",
        "PARTITION AVAIL...",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });
  });

  describe("commands with flags (dcgmi diag)", () => {
    const step = makeStep(["dcgmi diag -r 1"], "dcgmi", "PASS|FAIL");

    it("matches the expected command", () => {
      const r = ScenarioValidator.validateCommand(
        "dcgmi diag -r 1",
        "PASS",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("matches with a different run level", () => {
      const r = ScenarioValidator.validateCommand(
        "dcgmi diag -r 3",
        "PASS",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("rejects dcgmi discovery (wrong subcommand)", () => {
      const r = ScenarioValidator.validateCommand(
        "dcgmi discovery -l",
        "GPU 0...",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });
  });

  describe("commands with pipes", () => {
    const step = makeStep(["nvidia-smi | grep GPU"], "nvidia-smi", "GPU");

    it("matches piped command", () => {
      const r = ScenarioValidator.validateCommand(
        "nvidia-smi | grep GPU",
        "GPU 0: NVIDIA A100",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("rejects command without pipe when expected command has pipe", () => {
      const r = ScenarioValidator.validateCommand(
        "nvidia-smi",
        "GPU 0: NVIDIA A100",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });
  });

  describe("ipmitool subcommands", () => {
    const step = makeStep(["ipmitool mc info"], "ipmitool", "version|firmware");

    it("matches ipmitool mc info", () => {
      const r = ScenarioValidator.validateCommand(
        "ipmitool mc info",
        "Firmware Revision : 1.8.18",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("rejects ipmitool sensor list (wrong subcommand)", () => {
      const r = ScenarioValidator.validateCommand(
        "ipmitool sensor list",
        "Inlet Temp | 24.000",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });
  });

  describe("quoted argument: ipmitool sensor get 'Inlet Temp'", () => {
    const step = makeStep(
      ["ipmitool sensor get 'Inlet Temp'"],
      "ipmitool",
      "Inlet Temp",
    );

    it("matches the exact command", () => {
      const r = ScenarioValidator.validateCommand(
        "ipmitool sensor get 'Inlet Temp'",
        "Inlet Temp | 24.000",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });

    it("matches with different case in quoted arg", () => {
      const r = ScenarioValidator.validateCommand(
        "ipmitool sensor get 'inlet temp'",
        "Inlet Temp | 24.000",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });
  });

  describe("shell substitution: taskset -p $(pgrep hpl)", () => {
    const step = makeStep(
      ["taskset -p $(pgrep hpl)"],
      "taskset",
      "taskset|numactl|bind|affinity",
    );

    it("matches the command with a real PID", () => {
      const r = ScenarioValidator.validateCommand(
        "taskset -p 12345",
        "pid 12345's current affinity mask: ff",
        step,
        ctx,
      );
      expect(r.passed).toBe(true);
    });
  });

  describe("requireAllCommands with multiple expected commands", () => {
    const step = makeStep(
      ["nvidia-smi", "ibstat"],
      "nvidia-smi",
      undefined,
      true,
    );

    it("fails when only one command executed", () => {
      const r = ScenarioValidator.validateCommand(
        "nvidia-smi",
        "GPU 0...",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });

    it("passes when both commands executed", () => {
      const r = ScenarioValidator.validateCommand(
        "ibstat",
        "CA: mlx5_0",
        step,
        ctx,
        ["nvidia-smi"],
      );
      expect(r.passed).toBe(true);
    });
  });

  describe("requireAllCommands distinguishes flag-value pairs", () => {
    const step = makeStep(
      ["dmidecode -t system", "dmidecode -t memory"],
      "dmidecode",
      undefined,
      true,
    );

    it("fails when only one -t variant was executed", () => {
      const r = ScenarioValidator.validateCommand(
        "dmidecode -t system",
        "DMI table...",
        step,
        ctx,
      );
      expect(r.passed).toBe(false);
    });

    it("passes when both -t variants were executed", () => {
      const r = ScenarioValidator.validateCommand(
        "dmidecode -t memory",
        "Memory Device...",
        step,
        ctx,
        ["dmidecode -t system"],
      );
      expect(r.passed).toBe(true);
    });

    it("keeps numeric flag values flexible (dcgmi diag -r 1 vs -r 3)", () => {
      const dcgmiStep = makeStep(["dcgmi diag -r 1"], "dcgmi", undefined, true);
      const r = ScenarioValidator.validateCommand(
        "dcgmi diag -r 3",
        "PASS",
        dcgmiStep,
        ctx,
      );
      expect(r.passed).toBe(true);
    });
  });
});
