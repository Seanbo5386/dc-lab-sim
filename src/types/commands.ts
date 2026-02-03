// Command types and interfaces for terminal simulation

import type { ClusterConfig } from '@/types/hardware';
import type { ScenarioContext } from '@/store/scenarioContext';

/**
 * Command execution context
 */
export interface CommandContext {
  /** Current node identifier (e.g., "dgx-00") */
  currentNode: string;
  /** Current working directory path */
  currentPath: string;
  /** Environment variables */
  environment: Record<string, string>;
  /** Command history */
  history: string[];
  /** Optional scenario context for isolated state */
  scenarioContext?: ScenarioContext;
  /** Optional cluster config override (for isolated execution) */
  cluster?: ClusterConfig;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Output text (with ANSI color codes) */
  output: string;
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number;
  /** Optional execution time in milliseconds */
  executionTime?: number;
  /**
   * Optional custom prompt for interactive shell modes.
   *
   * **When to use:**
   * - Set when command enters an interactive mode (nvsm, cmsh, etc.)
   * - Return the new prompt string to display
   * - Return undefined/null to exit interactive mode and return to bash
   *
   * **Examples:**
   * ```typescript
   * // Enter interactive mode
   * return { output: 'Starting nvsm...', exitCode: 0, prompt: 'nvsm-> ' };
   *
   * // Stay in interactive mode with new prompt
   * return { output: 'Switched mode', exitCode: 0, prompt: '[root@node->device]% ' };
   *
   * // Exit interactive mode
   * return { output: 'Exiting...', exitCode: 0, prompt: undefined };
   * ```
   */
  prompt?: string;
}

/**
 * Legacy command interface (for backward compatibility)
 * @deprecated Use BaseSimulator instead
 */
export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  execute: (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;
  autocomplete?: (partial: string, context: CommandContext) => string[];
}

/**
 * Command history entry
 */
export interface CommandHistory {
  command: string;
  timestamp: Date;
  exitCode: number;
}

/**
 * Terminal theme option
 */
export type TerminalTheme = 'dark' | 'nvidia' | 'matrix';

// Re-export types from other modules for convenience
export type { ParsedCommand } from '@/utils/commandParser';
export type { CommandHandler, SimulatorMetadata, CommandMetadata, FlagMetadata } from '@/simulators/BaseSimulator';
export type { CommandDescriptor, CommandCategory } from '@/utils/commandRegistry';
