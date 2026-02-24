/**
 * ConsequenceEngine evaluates user commands against current node state
 * to determine if a command causes sandboxed damage.
 *
 * Used by the Incident Session Orchestrator to make bad decisions
 * cause real (sandboxed) consequences — users learn through outcomes,
 * not guardrails.
 */

import {
  CONSEQUENCE_RULES,
  SAFE_COMMAND_PATTERNS,
  type ConsequenceRule,
  type ConsequenceResult,
  type NodeConditionInput,
} from "@/data/consequenceRules";
import type { DGXNode } from "@/types/hardware";

export type { ConsequenceResult as Consequence } from "@/data/consequenceRules";

export class ConsequenceEngine {
  private rules: ConsequenceRule[];
  private safePatterns: RegExp[];

  constructor(rules?: ConsequenceRule[]) {
    this.rules = rules ?? CONSEQUENCE_RULES;
    this.safePatterns = SAFE_COMMAND_PATTERNS.map(
      (prefix) => new RegExp(`^${prefix}`),
    );
  }

  /**
   * Evaluate a command against the current node state.
   *
   * @param command - The full command string entered by the user
   * @param node - The current DGXNode state
   * @returns A Consequence object if the command causes damage, or null if safe
   */
  evaluate(command: string, node: DGXNode): ConsequenceResult | null {
    const trimmed = command.trim();

    // Check if the command matches a safe pattern first
    if (this.isSafeCommand(trimmed)) {
      return null;
    }

    // Convert DGXNode to the minimal condition input shape
    const conditionInput = this.toConditionInput(node);

    // Check each rule in order — first match wins
    for (const rule of this.rules) {
      if (rule.commandPattern.test(trimmed) && rule.condition(conditionInput)) {
        return { ...rule.consequence };
      }
    }

    // No rule matched — command is safe (or unrecognized, which is also safe)
    return null;
  }

  /**
   * Check if a command matches any safe pattern.
   */
  private isSafeCommand(command: string): boolean {
    return this.safePatterns.some((pattern) => pattern.test(command));
  }

  /**
   * Convert a full DGXNode to the minimal shape needed for condition evaluation.
   */
  private toConditionInput(node: DGXNode): NodeConditionInput {
    return {
      slurmState: node.slurmState,
      healthStatus: node.healthStatus,
      gpus: node.gpus.map((g) => ({
        id: g.id,
        migMode: g.migMode,
        migInstances: g.migInstances.map((m) => ({ id: m.id })),
        allocatedJobId: g.allocatedJobId,
        utilization: g.utilization,
      })),
    };
  }
}
