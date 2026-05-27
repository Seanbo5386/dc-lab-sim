/**
 * commandGapDetection.test.ts
 *
 * Regression guard that statically verifies every
 * `expectedCommand` base command referenced in
 * narrativeScenarios.json is supported by the terminal.
 *
 * If a new scenario step references a command that hasn't
 * been registered in Terminal.tsx (or handled as an env-var
 * assignment), this test will fail and tell you exactly
 * which command is missing.
 */

import { describe, it, expect } from "vitest";
import scenariosData from "../narrativeScenarios.json";
import { TERMINAL_COMMANDS } from "../registeredCommands";

/**
 * Environment variable assignments like NCCL_DEBUG=INFO are
 * handled by a regex pattern in Terminal.tsx, not by a
 * registered command handler.  We recognise them with the
 * same regex the terminal uses.
 */
const ENV_VAR_PATTERN = /^[A-Z_][A-Z0-9_]*=\S+$/;

/**
 * Extract the base command from a full command string.
 *
 * Examples:
 *   "nvidia-smi -q"         -> "nvidia-smi"
 *   "ipmitool sdr list"     -> "ipmitool"
 *   "NCCL_DEBUG=INFO"       -> "NCCL_DEBUG=INFO"  (env var)
 *   "cat /etc/hostname"     -> "cat"
 *   "nvidia-bug-report.sh"  -> "nvidia-bug-report.sh"
 */
function extractBaseCommand(fullCmd: string): string {
  const trimmed = fullCmd.trim();
  // If it looks like an env var assignment, return it whole
  if (ENV_VAR_PATTERN.test(trimmed)) {
    return trimmed;
  }
  // Otherwise return the first whitespace-delimited token
  return trimmed.split(/\s+/)[0];
}

// ─── Parse all expected commands from scenarios ───

interface CommandRef {
  scenarioId: string;
  stepId: string;
  fullCommand: string;
  baseCommand: string;
}

const scenarios = (
  scenariosData as {
    scenarios: Array<{
      id: string;
      steps: Array<{
        id: string;
        expectedCommands?: string[];
      }>;
    }>;
  }
).scenarios;

const allCommandRefs: CommandRef[] = [];

for (const scenario of scenarios) {
  for (const step of scenario.steps) {
    for (const cmd of step.expectedCommands ?? []) {
      allCommandRefs.push({
        scenarioId: scenario.id,
        stepId: step.id,
        fullCommand: cmd,
        baseCommand: extractBaseCommand(cmd),
      });
    }
  }
}

// ─── Tests ───

describe("Command Gap Detection", () => {
  it("should have collected at least 100 expectedCommand references", () => {
    // Sanity check — if this fails, the JSON shape may have changed.
    expect(allCommandRefs.length).toBeGreaterThanOrEqual(100);
  });

  it("every expectedCommand base should be a registered terminal command or env var assignment", () => {
    const unsupported: CommandRef[] = [];

    for (const ref of allCommandRefs) {
      const isRegistered = TERMINAL_COMMANDS.has(ref.baseCommand);
      const isEnvVar = ENV_VAR_PATTERN.test(ref.baseCommand);

      if (!isRegistered && !isEnvVar) {
        unsupported.push(ref);
      }
    }

    if (unsupported.length > 0) {
      const summary = unsupported
        .map(
          (r) =>
            `  - "${r.baseCommand}" (from ${r.scenarioId} / ${r.stepId}: "${r.fullCommand}")`,
        )
        .join("\n");

      expect.fail(
        `Found ${unsupported.length} unsupported command(s) referenced in narrativeScenarios.json:\n${summary}\n\n` +
          `Either register them in Terminal.tsx or add them to TERMINAL_COMMANDS in this test.`,
      );
    }
  });

  it("TERMINAL_COMMANDS set should not contain duplicates (sanity)", () => {
    // Set guarantees uniqueness, but verify the source array
    // would have been unique too (catches copy-paste errors).
    const arr = [...TERMINAL_COMMANDS];
    expect(new Set(arr).size).toBe(arr.length);
  });

  it("should cover all 7 command families", () => {
    // Spot-check that at least one command from each family appears
    const familyRepresentatives: Record<string, string> = {
      "gpu-monitoring": "nvidia-smi",
      "infiniband-tools": "ibstat",
      "bmc-hardware": "sensors",
      "cluster-tools": "sinfo",
      "container-tools": "docker",
      diagnostics: "gpu-burn",
      "xid-diagnostics": "dmesg",
    };

    for (const [family, cmd] of Object.entries(familyRepresentatives)) {
      expect(
        TERMINAL_COMMANDS.has(cmd),
        `Missing representative command "${cmd}" for family "${family}"`,
      ).toBe(true);
    }
  });

  it("unique base commands referenced in scenarios should all be known", () => {
    const uniqueBases = new Set(allCommandRefs.map((r) => r.baseCommand));
    const unknown: string[] = [];

    for (const base of uniqueBases) {
      if (!TERMINAL_COMMANDS.has(base) && !ENV_VAR_PATTERN.test(base)) {
        unknown.push(base);
      }
    }

    expect(unknown, `Unknown commands: ${unknown.join(", ")}`).toHaveLength(0);
  });
});
