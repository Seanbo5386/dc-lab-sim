import type { Terminal as XTerm } from "@xterm/xterm";
import type { CommandContext, CommandResult } from "@/types/commands";

/**
 * Shell state for tracking current shell mode and prompt
 */
export interface ShellState {
  mode: "bash" | "nvsm" | "cmsh";
  prompt: string;
}

/**
 * Interface for simulators that support interactive shell mode
 */
export interface InteractiveShellSimulator {
  executeInteractive(input: string, context: CommandContext): CommandResult;
}

/**
 * Handle interactive shell input for nvsm, cmsh, and other shell modes
 *
 * This utility centralizes the logic for:
 * - Routing commands to the interactive shell simulator
 * - Detecting shell exit (no prompt returned)
 * - Computing new shell state
 * - Displaying output and prompts
 *
 * @param simulator - The interactive shell simulator (e.g., nvsmSimulator, cmshSimulator)
 * @param cmdLine - The command line input from the user
 * @param context - The current command execution context
 * @param term - The XTerm terminal instance
 * @param currentState - Current shell state (read-only)
 * @param promptFn - Function to display the appropriate prompt
 * @returns New shell state after executing the command
 */
export function handleInteractiveShellInput(
  simulator: InteractiveShellSimulator,
  cmdLine: string,
  context: CommandContext,
  term: XTerm,
  currentState: ShellState,
  promptFn: () => void,
): ShellState {
  // Execute command through the interactive shell
  const result = simulator.executeInteractive(cmdLine, context);

  // Compute new shell state
  let newState: ShellState;
  if (!result.prompt) {
    // Exiting shell - return to bash
    newState = { mode: "bash", prompt: "" };
  } else {
    // Staying in shell - update prompt
    newState = { mode: currentState.mode, prompt: result.prompt };
  }

  // Display output if any
  if (result.output) {
    term.write("\r\n" + result.output);
  }

  // New line and display next prompt
  term.write("\r\n");
  promptFn();

  return newState;
}

/**
 * Check if a command result should enter interactive shell mode
 *
 * A command enters interactive mode when:
 * 1. It has no subcommands (just the base command like "nvsm" or "cmsh")
 * 2. It returns a custom prompt string
 *
 * @param result - Command execution result
 * @param hasSubcommands - Whether the command had subcommands
 * @returns true if entering interactive mode
 */
export function shouldEnterInteractiveMode(
  result: CommandResult,
  hasSubcommands: boolean,
): boolean {
  return !hasSubcommands && !!result.prompt;
}
