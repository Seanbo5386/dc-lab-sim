/**
 * Scenario Validation Engine
 *
 * Validates user commands against scenario step requirements,
 * providing real-time feedback and progress tracking.
 */

import type { ScenarioStep } from "@/types/scenarios";
import type { CommandContext } from "@/types/commands";
import type { ValidationRule, ValidationResult } from "@/types/validation";

/**
 * Expand $(command) shell substitutions to fixed values so that
 * both expected and actual commands normalize to the same form.
 */
function expandShellSubstitutions(cmd: string): string {
  return cmd.replace(/\$\([^)]+\)/g, "12345");
}

/**
 * Tokenize a command string, respecting quoted substrings.
 * e.g. "scontrol update reason='BMC firmware update'" →
 *   ["scontrol", "update", "reason='BMC firmware update'"]
 */
function tokenizeCommand(cmd: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (inQuote) {
      current += ch;
      if (ch === inQuote) {
        inQuote = null;
      }
    } else if (ch === "'" || ch === '"') {
      inQuote = ch;
      current += ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Extract the "command key" — the leading non-flag, non-argument tokens
 * that identify the command + subcommand. Stops at flags (-/--), key=value
 * args, quoted strings, numbers, or pipes.
 *
 * Examples:
 *   ["scontrol", "update", "nodename=dgx-01", ...] → ["scontrol", "update"]
 *   ["dcgmi", "diag", "-r", "1"] → ["dcgmi", "diag"]
 *   ["nvidia-smi", "-q", "-i", "6"] → ["nvidia-smi"]
 *   ["ipmitool", "mc", "info"] → ["ipmitool", "mc", "info"]
 *   ["nvidia-smi", "|", "grep", "GPU"] → ["nvidia-smi"]
 */
function extractCommandKey(tokens: string[]): string[] {
  const key: string[] = [];
  for (const token of tokens) {
    if (
      token.startsWith("-") ||
      token.includes("=") ||
      token.startsWith("'") ||
      token.startsWith('"') ||
      /^\d+$/.test(token) ||
      token === "|"
    ) {
      break;
    }
    key.push(token);
  }
  return key.length > 0 ? key : [tokens[0]];
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ScenarioValidator {
  /**
   * Validates a command execution against scenario step requirements
   *
   * @param command - The command that was executed
   * @param output - The output from the command
   * @param step - The current scenario step
   * @param context - The command execution context
   * @param executedCommands - Array of previously executed commands in this step
   * @returns Validation result with feedback and progress
   */
  static validateCommand(
    command: string,
    output: string,
    step: ScenarioStep,
    context: CommandContext,
    executedCommands: string[] = [],
  ): ValidationResult {
    const rules = this.getRulesForStep(step);

    if (rules.length === 0) {
      // No validation rules defined - assume step is complete if any command runs
      return {
        passed: true,
        matchedRules: [],
        failedRules: [],
        feedback: "✓ Step completed",
        progress: 100,
        score: 1.0,
        ruleResults: [],
      };
    }

    // Evaluate each rule
    const ruleResults = rules.map((rule) =>
      this.validateRule(rule, command, output, context, [
        ...executedCommands,
        command,
      ]),
    );

    // Calculate overall results
    const matchedRules = ruleResults
      .filter((r) => r.passed)
      .map((r) => r.ruleId);
    const failedRules = ruleResults
      .filter((r) => !r.passed)
      .map((r) => r.ruleId);

    // Calculate weighted score
    const totalWeight = rules.reduce(
      (sum, rule) => sum + (rule.weight || 1),
      0,
    );
    const earnedWeight = ruleResults
      .filter((r) => r.passed)
      .reduce((sum, r) => {
        const rule = rules.find((rule) => rule.id === r.ruleId);
        return sum + (rule?.weight || 1);
      }, 0);

    const score = totalWeight > 0 ? earnedWeight / totalWeight : 0;
    const progress = Math.round(score * 100);

    // Determine if passed based on minimum score
    const minimumScore = step.validationCriteria?.minimumScore || 100;
    const passed = progress >= minimumScore;

    // Generate feedback message
    const feedback = this.generateFeedback(ruleResults, step, passed, progress);

    return {
      passed,
      matchedRules,
      failedRules,
      feedback,
      progress,
      score,
      ruleResults,
    };
  }

  /**
   * Extract validation rules from a scenario step
   */
  private static getRulesForStep(step: ScenarioStep): ValidationRule[] {
    // If step has explicit validation criteria, use those
    if (
      step.validationCriteria?.rules &&
      Array.isArray(step.validationCriteria.rules)
    ) {
      return step.validationCriteria.rules.map((criteria) => ({
        id: criteria.id,
        type: criteria.type,
        pattern: criteria.pattern,
        commandPattern: criteria.commandPattern,
        errorMessage: criteria.errorMessage,
        weight: criteria.weight || 1,
      }));
    }

    // Check for legacy validationRules format (from scenario JSON)
    if (step.validationRules && Array.isArray(step.validationRules)) {
      return step.validationRules.map((rule, idx) => {
        // Convert legacy validation rule types to new format
        let type: "command" | "output" | "state" | "sequence";
        let commandPattern: string | undefined;

        // When requireAllCommands is true, use step.expectedCommands (what user sees in UI)
        // instead of rule.expectedCommands (which may be a different list of alternatives)
        const commandsToValidate =
          rule.requireAllCommands &&
          step.expectedCommands &&
          step.expectedCommands.length > 0
            ? step.expectedCommands
            : rule.expectedCommands;

        switch (rule.type) {
          case "command-executed":
            type = "command";
            // Create flexible patterns for command matching
            if (commandsToValidate && commandsToValidate.length > 0) {
              const patterns = commandsToValidate.map((rawCmd) => {
                const cmd = expandShellSubstitutions(rawCmd);
                // Strip everything after pipe for matching the primary command
                const primaryCmd = cmd.split("|")[0].trim();
                const tokens = tokenizeCommand(primaryCmd);

                if (tokens.length === 1) {
                  // Single word command - match standalone or with any flags/args
                  return `^${escapeRegex(tokens[0])}\\b`;
                }

                // Extract command key (command + subcommand words)
                // e.g. ["scontrol", "update"] or ["dcgmi", "diag"]
                const key = extractCommandKey(tokens);
                const keyPattern = key.map(escapeRegex).join("\\s+");
                return `^${keyPattern}\\b`;
              });
              commandPattern = patterns.join("|");
            } else {
              commandPattern = commandsToValidate?.join("|");
            }
            break;
          case "output-match":
            type = "output";
            break;
          case "state-check":
            type = "state";
            break;
          default:
            type = "command";
        }

        return {
          id: `rule-${idx}`,
          type,
          // Only use outputPattern as pattern for non-command rules (output-match, state-check).
          // For command rules, pattern would shadow commandPattern and incorrectly
          // test the output regex against the command string instead.
          pattern:
            type !== "command" && rule.outputPattern
              ? new RegExp(rule.outputPattern, "i")
              : undefined,
          commandPattern,
          errorMessage: rule.description,
          weight: 1,
          // Preserve requireAllCommands flag from the JSON rule
          requireAllCommands: rule.requireAllCommands || false,
          // Use step.expectedCommands when requireAllCommands is true (what user sees in UI)
          expectedCommands: commandsToValidate,
        };
      });
    }

    // Fallback: infer rules from objectives
    return this.inferRulesFromObjectives(step);
  }

  /**
   * Infer validation rules from step objectives (legacy support)
   */
  private static inferRulesFromObjectives(
    step: ScenarioStep,
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    step.objectives.forEach((objective, idx) => {
      // Look for command mentions in objectives
      // Pattern: "Run <command>" or "Use <command>"
      const commandMatch = objective.match(
        /(?:run|use|execute)\s+([a-z-]+(?:\s+[a-z-]+)*)/i,
      );

      if (commandMatch) {
        const commandName = commandMatch[1].trim();

        rules.push({
          id: `objective-${idx}`,
          type: "command",
          commandPattern: commandName,
          pattern: new RegExp(commandName.replace(/\s+/g, "\\s+"), "i"),
          errorMessage: `Try running the ${commandName} command`,
          weight: 1,
        });
      }

      // Look for output validation mentions
      // Pattern: "should see" or "displays" or "shows"
      const outputMatch = objective.match(
        /(?:should see|displays?|shows?)\s+"([^"]+)"/i,
      );

      if (outputMatch) {
        const expectedOutput = outputMatch[1];

        rules.push({
          id: `output-${idx}`,
          type: "output",
          pattern: new RegExp(expectedOutput, "i"),
          errorMessage: `Output should contain: ${expectedOutput}`,
          weight: 0.5, // Lower weight for output validation
        });
      }
    });

    return rules;
  }

  /**
   * Validate a single rule against command execution
   */
  private static validateRule(
    rule: ValidationRule,
    command: string,
    output: string,
    context: CommandContext,
    allCommands: string[],
  ): { ruleId: string; passed: boolean; message?: string } {
    switch (rule.type) {
      case "command":
        return this.validateCommandRule(rule, command, allCommands, output);

      case "output":
        return this.validateOutputRule(rule, output);

      case "state":
        return this.validateStateRule(rule, context);

      case "sequence":
        return this.validateSequenceRule(rule, allCommands);

      default:
        return { ruleId: rule.id, passed: false, message: "Unknown rule type" };
    }
  }

  /**
   * Validate command execution rule
   */
  private static validateCommandRule(
    rule: ValidationRule,
    command: string,
    allCommands: string[],
    output?: string,
  ): { ruleId: string; passed: boolean; message?: string } {
    // Handle requireAllCommands mode - must check ALL expected commands were executed
    if (
      rule.requireAllCommands &&
      rule.expectedCommands &&
      rule.expectedCommands.length > 0
    ) {
      const expectedCommands = rule.expectedCommands;

      // Check which expected commands have been executed
      const executedExpected: string[] = [];
      const notExecuted: string[] = [];

      for (const expected of expectedCommands) {
        // Expand shell substitutions so "$(pgrep hpl)" normalizes to "12345"
        const expectedNormalized = expandShellSubstitutions(
          expected.trim().toLowerCase(),
        );
        // Tokenize respecting quotes so "reason='BMC firmware update'" stays as one token
        const expectedTokens = tokenizeCommand(expectedNormalized);
        const expectedKey = extractCommandKey(expectedTokens);

        // Check if any command in history matches this expected command
        const wasExecuted = allCommands.some((cmd) => {
          const cmdNormalized = expandShellSubstitutions(
            cmd.trim().toLowerCase(),
          );
          const cmdTokens = tokenizeCommand(cmdNormalized);
          const cmdKey = extractCommandKey(cmdTokens);

          // Command key must match (e.g. ["scontrol", "update"])
          if (expectedKey.length !== cmdKey.length) return false;
          for (let i = 0; i < expectedKey.length; i++) {
            if (cmdKey[i] !== expectedKey[i]) return false;
          }

          // For commands with flags/args beyond the key, check key parts are present
          for (let i = expectedKey.length; i < expectedTokens.length; i++) {
            const token = expectedTokens[i];
            const nextToken = expectedTokens[i + 1];

            // Skip generic flexible flags
            if (token === "--format=csv") continue;
            // -i (GPU index): flexible; also skip its numeric value
            if (token === "-i") {
              if (nextToken && /^\d+$/.test(nextToken)) i++;
              continue;
            }

            // For key=value args, check the key prefix exists (flexible on value)
            if (
              token.includes("=") &&
              !token.startsWith("'") &&
              !token.startsWith('"')
            ) {
              const prefix = token.split("=")[0];
              if (!cmdNormalized.includes(prefix)) return false;
              continue;
            }

            // Flag followed by a non-numeric, non-quoted, non-flag value
            // (e.g. "-t memory", "-u docker"): treat as a subcommand selector
            // pair and require both flag and value to appear together in the
            // user's command. Without this, "dmidecode -t system" and
            // "dmidecode -t memory" would match each other.
            if (
              token.startsWith("-") &&
              nextToken &&
              !nextToken.startsWith("-") &&
              !nextToken.startsWith("'") &&
              !nextToken.startsWith('"') &&
              !nextToken.includes("=") &&
              !/^\d+$/.test(nextToken)
            ) {
              const pairPattern = new RegExp(
                `${escapeRegex(token)}\\s+${escapeRegex(nextToken)}\\b`,
              );
              if (!pairPattern.test(cmdNormalized)) return false;
              i++; // consume the value, already verified
              continue;
            }

            if (token.startsWith("-")) {
              // Standalone flag (or flag followed by numeric/quoted/flag value)
              if (!cmdNormalized.includes(token)) return false;
            }
            // Else: skip quoted values and bare positional args
          }

          return true;
        });

        if (wasExecuted) {
          executedExpected.push(expected);
        } else {
          notExecuted.push(expected);
        }
      }

      const allExecuted = notExecuted.length === 0;

      if (!allExecuted) {
        return {
          ruleId: rule.id,
          passed: false,
          message: `⏳ Keep going! ${executedExpected.length}/${expectedCommands.length} commands completed`,
        };
      }

      return {
        ruleId: rule.id,
        passed: true,
        message: "All suggested commands executed successfully",
      };
    }

    // Standard single-command validation (original behavior)
    const pattern = rule.pattern
      ? typeof rule.pattern === "string"
        ? new RegExp(rule.pattern, "i")
        : rule.pattern
      : rule.commandPattern
        ? new RegExp(rule.commandPattern, "i")
        : null;

    if (!pattern) {
      return { ruleId: rule.id, passed: false, message: "No pattern defined" };
    }

    // Check if current command matches (expand shell substitutions for matching)
    const currentMatch = pattern.test(expandShellSubstitutions(command));

    // Also check if any previous command matched (for multi-step validation)
    const previousMatch = allCommands.some((cmd) =>
      pattern.test(expandShellSubstitutions(cmd)),
    );

    const passed = currentMatch || previousMatch;

    // For pipe commands, also require the user typed a pipe
    if (passed && rule.expectedCommands?.some((cmd) => cmd.includes("|"))) {
      const hasPipe =
        command.includes("|") || allCommands.some((cmd) => cmd.includes("|"));
      if (!hasPipe) {
        return {
          ruleId: rule.id,
          passed: false,
          message: "Try using a pipe (|) to filter the output",
        };
      }
    }

    // Special handling for GPU reset with XID 79 errors
    // When attempting GPU reset, if the output contains XID 79 error message,
    // the attempt itself is valid even though the command "failed"
    if (passed && output) {
      const isGpuReset =
        command.includes("--gpu-reset") ||
        (command.includes("nvidia-smi") && /\s-r\b/.test(command));
      const hasXid79Error =
        output.includes("XID 79") || output.includes("fallen off the bus");

      if (isGpuReset && hasXid79Error) {
        // For XID 79, attempting the reset is the correct action
        // The failure message is the expected outcome
        return {
          ruleId: rule.id,
          passed: true,
          message:
            "GPU reset attempted (XID 79: reset not possible, as expected)",
        };
      }
    }

    return {
      ruleId: rule.id,
      passed,
      message: passed ? "Command requirement met" : rule.errorMessage,
    };
  }

  /**
   * Validate output content rule
   */
  private static validateOutputRule(
    rule: ValidationRule,
    output: string,
  ): { ruleId: string; passed: boolean; message?: string } {
    const pattern = rule.pattern
      ? typeof rule.pattern === "string"
        ? new RegExp(rule.pattern, "i")
        : rule.pattern
      : null;

    if (!pattern) {
      return { ruleId: rule.id, passed: false, message: "No pattern defined" };
    }

    const passed = pattern.test(output);

    return {
      ruleId: rule.id,
      passed,
      message: passed ? "Output requirement met" : rule.errorMessage,
    };
  }

  /**
   * Validate system state rule
   */
  private static validateStateRule(
    rule: ValidationRule,
    context: CommandContext,
  ): { ruleId: string; passed: boolean; message?: string } {
    if (!rule.stateCheck) {
      return {
        ruleId: rule.id,
        passed: false,
        message: "No state check function",
      };
    }

    try {
      const passed = rule.stateCheck(context);
      return {
        ruleId: rule.id,
        passed,
        message: passed ? "State requirement met" : rule.errorMessage,
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        passed: false,
        message: `State check error: ${error}`,
      };
    }
  }

  /**
   * Validate command sequence rule
   */
  private static validateSequenceRule(
    rule: ValidationRule,
    allCommands: string[],
  ): { ruleId: string; passed: boolean; message?: string } {
    if (!rule.sequence || rule.sequence.length === 0) {
      return { ruleId: rule.id, passed: false, message: "No sequence defined" };
    }

    // Check if commands were executed in the correct order
    let sequenceIndex = 0;

    for (const command of allCommands) {
      const expectedCommand = rule.sequence[sequenceIndex];
      const pattern = new RegExp(expectedCommand, "i");

      if (pattern.test(command)) {
        sequenceIndex++;

        if (sequenceIndex === rule.sequence.length) {
          // All commands in sequence executed
          return {
            ruleId: rule.id,
            passed: true,
            message: "Sequence completed",
          };
        }
      }
    }

    return {
      ruleId: rule.id,
      passed: false,
      message: `Sequence incomplete: ${sequenceIndex}/${rule.sequence.length} commands executed`,
    };
  }

  /**
   * Generate helpful feedback based on validation results
   */
  private static generateFeedback(
    ruleResults: Array<{ ruleId: string; passed: boolean; message?: string }>,
    _step: ScenarioStep,
    passed: boolean,
    progress: number,
  ): string {
    const failedCount = ruleResults.filter((r) => !r.passed).length;
    const totalCount = ruleResults.length;

    if (passed) {
      if (progress === 100) {
        return "✓ Step completed successfully! Moving to next step.";
      } else {
        return `✓ Step requirements met (${progress}% complete). You may proceed.`;
      }
    }

    if (failedCount === totalCount) {
      // No rules passed yet
      const firstFailedRule = ruleResults.find((r) => !r.passed);
      if (firstFailedRule?.message) {
        return `✗ ${firstFailedRule.message}`;
      }
      return '✗ This command doesn\'t match the step requirements. Type "hint" for guidance.';
    }

    // Partial progress
    const passedCount = totalCount - failedCount;
    return `⚠ Partially correct (${passedCount}/${totalCount} requirements met). Progress: ${progress}%`;
  }

  /**
   * Check if a step is complete based on validation state
   */
  static isStepComplete(
    step: ScenarioStep,
    executedCommands: string[],
    context: CommandContext,
  ): boolean {
    const rules = this.getRulesForStep(step);

    if (rules.length === 0) {
      // No validation rules - consider complete if any command executed
      return executedCommands.length > 0;
    }

    // Check if all rules would pass
    const ruleResults = rules.map((rule) =>
      this.validateRule(
        rule,
        executedCommands[executedCommands.length - 1] || "",
        "",
        context,
        executedCommands,
      ),
    );

    const totalWeight = rules.reduce(
      (sum, rule) => sum + (rule.weight || 1),
      0,
    );
    const earnedWeight = ruleResults
      .filter((r) => r.passed)
      .reduce((sum, r) => {
        const rule = rules.find((rule) => rule.id === r.ruleId);
        return sum + (rule?.weight || 1);
      }, 0);

    const score = totalWeight > 0 ? earnedWeight / totalWeight : 0;
    const progress = Math.round(score * 100);
    const minimumScore = step.validationCriteria?.minimumScore || 100;

    return progress >= minimumScore;
  }

  /**
   * Get next hint based on failed validation rules
   */
  static getNextHint(
    validationResult: ValidationResult,
    _step: ScenarioStep,
  ): string | null {
    if (validationResult.passed) {
      return null;
    }

    // Find first failed rule with an error message
    const failedRule = validationResult.ruleResults.find(
      (r) => !r.passed && r.message,
    );

    if (failedRule?.message) {
      return failedRule.message;
    }

    // Fallback to generic hint
    return 'Review the step objectives and try a different approach. Type "hint" for more guidance.';
  }
}
