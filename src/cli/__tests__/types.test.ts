// src/cli/__tests__/types.test.ts
import { describe, it, expect } from "vitest";
import type { CommandDefinition, StateInteraction } from "../types";

describe("CommandDefinition types", () => {
  it("should allow valid CommandDefinition structure", () => {
    const def: CommandDefinition = {
      command: "nvidia-smi",
      category: "gpu_management",
      description: "NVIDIA System Management Interface",
      synopsis: "nvidia-smi [OPTIONS]",
    };
    expect(def.command).toBe("nvidia-smi");
  });

  it("should allow optional fields", () => {
    const def: CommandDefinition = {
      command: "test",
      category: "general",
      description: "Test command",
      synopsis: "test",
      global_options: [],
      subcommands: [],
      exit_codes: [{ code: 0, meaning: "Success" }],
    };
    expect(def.exit_codes?.[0].code).toBe(0);
  });

  it("should type state_interactions correctly", () => {
    const interaction: StateInteraction = {
      reads_from: [{ state_domain: "gpu_state", fields: ["temperature"] }],
      writes_to: [
        {
          state_domain: "gpu_state",
          fields: ["power_limit"],
          requires_privilege: "root",
        },
      ],
    };
    expect(interaction.reads_from?.[0].state_domain).toBe("gpu_state");
  });
});
