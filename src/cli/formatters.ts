// src/cli/formatters.ts
import type {
  CommandDefinition,
  CommandOption,
  Subcommand,
  ExitCode,
  ErrorMessage,
  UsagePattern,
} from "./types";

/**
 * ANSI escape codes for terminal formatting
 * Matches patterns from explainCommand.ts
 */
export const ANSI = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  GRAY: "\x1b[90m",
  BOLD_CYAN: "\x1b[1;36m",
  BOLD_WHITE: "\x1b[1;37m",
} as const;

/**
 * Format a complete command help output from JSON definition
 */
export function formatCommandHelp(def: CommandDefinition): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${def.command} ━━━${ANSI.RESET}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n`;
  output += `  ${def.description}\n\n`;

  // Synopsis
  output += `${ANSI.BOLD}Usage:${ANSI.RESET}\n`;
  output += `  ${def.synopsis}\n\n`;

  return output;
}
