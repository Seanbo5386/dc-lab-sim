// src/cli/formatters.ts
import type {
  CommandDefinition,
  CommandOption,
  ExitCode,
  ErrorMessage,
} from "./types";
import type { ValidationResult } from "./CommandDefinitionRegistry";

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

  // Options
  if (def.global_options && def.global_options.length > 0) {
    output += `${ANSI.BOLD}Options:${ANSI.RESET}\n`;
    const maxOptions = 10;

    for (const opt of def.global_options.slice(0, maxOptions)) {
      const shortStr = opt.short ? `-${opt.short.replace(/^-+/, "")}` : "";
      const longStr = opt.long ? `--${opt.long.replace(/^-+/, "")}` : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");

      let desc = opt.description;
      if (desc.length > 60) {
        desc = desc.substring(0, 57) + "...";
      }

      output += `  ${ANSI.CYAN}${combined.padEnd(25)}${ANSI.RESET} ${desc}\n`;
    }

    if (def.global_options.length > maxOptions) {
      output += `  ... and ${def.global_options.length - maxOptions} more options\n`;
    }
    output += "\n";
  }

  // Subcommands (add after options section)
  if (def.subcommands && def.subcommands.length > 0) {
    output += `${ANSI.BOLD}Subcommands:${ANSI.RESET}\n`;
    const maxSubs = 8;

    for (const sub of def.subcommands.slice(0, maxSubs)) {
      let desc = sub.description;
      if (desc.length > 50) {
        desc = desc.substring(0, 47) + "...";
      }
      output += `  ${ANSI.CYAN}${sub.name.padEnd(15)}${ANSI.RESET} ${desc}\n`;
    }

    if (def.subcommands.length > maxSubs) {
      output += `  ... and ${def.subcommands.length - maxSubs} more\n`;
    }
    output += "\n";
  }

  // Examples
  if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
    output += `${ANSI.BOLD}Examples:${ANSI.RESET}\n`;

    for (const pattern of def.common_usage_patterns.slice(0, 5)) {
      output += `\n  ${ANSI.CYAN}${pattern.command}${ANSI.RESET}\n`;
      output += `    ${pattern.description}\n`;
      if (pattern.requires_root) {
        output += `    ${ANSI.YELLOW}⚠ Requires root privileges${ANSI.RESET}\n`;
      }
    }
    output += "\n";
  }

  // Exit Codes
  if (def.exit_codes && def.exit_codes.length > 0) {
    output += `${ANSI.BOLD}Exit Codes:${ANSI.RESET}\n`;
    for (const ec of def.exit_codes.slice(0, 6)) {
      output += formatExitCode(ec);
    }
    output += "\n";
  }

  // Error Messages
  if (def.error_messages && def.error_messages.length > 0) {
    output += `${ANSI.BOLD}Common Errors:${ANSI.RESET}\n`;
    for (const err of def.error_messages.slice(0, 3)) {
      const msgPreview =
        err.message.length > 50
          ? err.message.substring(0, 47) + "..."
          : err.message;
      output += `  ${ANSI.RED}${msgPreview}${ANSI.RESET}\n`;
      output += `    Meaning: ${err.meaning}\n`;
      if (err.resolution) {
        const resPreview =
          err.resolution.length > 70
            ? err.resolution.substring(0, 67) + "..."
            : err.resolution;
        output += `    ${ANSI.GREEN}Fix: ${resPreview}${ANSI.RESET}\n`;
      }
    }
    output += "\n";
  }

  return output;
}

function formatCategoryName(category: string): string {
  return category.replace(/_/g, " ").toUpperCase();
}

/**
 * Format an overview list of commands from JSON definitions
 */
export function formatCommandList(definitions: CommandDefinition[]): string {
  const categories = new Map<string, CommandDefinition[]>();

  for (const def of definitions) {
    if (!categories.has(def.category)) {
      categories.set(def.category, []);
    }
    categories.get(def.category)?.push(def);
  }

  const lines: string[] = [];
  const headerStyle = `${ANSI.BOLD}${ANSI.GREEN}`;
  lines.push(
    `${headerStyle}╔════════════════════════════════════════════════════════════════╗${ANSI.RESET}`,
  );
  lines.push(
    `${headerStyle}║  COMMAND REFERENCE                                             ║${ANSI.RESET}`,
  );
  lines.push(
    `${headerStyle}╚════════════════════════════════════════════════════════════════╝${ANSI.RESET}`,
  );
  lines.push("");
  lines.push(
    `${ANSI.YELLOW}Type ${ANSI.BOLD_CYAN}explain <command>${ANSI.RESET}${ANSI.YELLOW} for detailed help on any command.${ANSI.RESET}`,
  );
  lines.push("");

  const sortedCategories = Array.from(categories.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const [category, commands] of sortedCategories) {
    lines.push(`${ANSI.BOLD}${formatCategoryName(category)}:${ANSI.RESET}`);

    const sortedCommands = [...commands].sort((a, b) =>
      a.command.localeCompare(b.command),
    );
    for (const cmd of sortedCommands) {
      lines.push(
        `  ${ANSI.CYAN}${cmd.command.padEnd(20)}${ANSI.RESET} ${cmd.description}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single error message with resolution
 */
export function formatErrorMessage(error: ErrorMessage): string {
  let output = `${ANSI.RED}${error.message}${ANSI.RESET}\n`;
  output += `  Meaning: ${error.meaning}\n`;
  if (error.resolution) {
    output += `  ${ANSI.GREEN}Fix: ${error.resolution}${ANSI.RESET}\n`;
  }
  return output;
}

/**
 * Format an exit code with its meaning
 */
export function formatExitCode(exitCode: ExitCode): string {
  return `  ${ANSI.CYAN}${exitCode.code.toString().padEnd(5)}${ANSI.RESET} ${exitCode.meaning}\n`;
}

/**
 * Format detailed help for a specific flag
 */
export function formatFlagHelp(command: string, opt: CommandOption): string {
  let output = "";

  // Header
  output += `${ANSI.BOLD_CYAN}━━━ ${command} flag ━━━${ANSI.RESET}\n\n`;

  // Flag name
  const shortStr = opt.short ? `-${opt.short.replace(/^-+/, "")}` : "";
  const longStr = opt.long ? `--${opt.long.replace(/^-+/, "")}` : "";
  const combined = [shortStr, longStr].filter(Boolean).join(", ");
  output += `${ANSI.BOLD}Flag:${ANSI.RESET} ${combined}\n\n`;

  // Description
  output += `${ANSI.BOLD}Description:${ANSI.RESET}\n  ${opt.description}\n\n`;

  // Arguments
  if (opt.arguments) {
    output += `${ANSI.BOLD}Arguments:${ANSI.RESET} ${opt.arguments}`;
    if (opt.argument_type) {
      output += ` (${opt.argument_type})`;
    }
    output += "\n\n";
  }

  // Default
  if (opt.default) {
    output += `${ANSI.BOLD}Default:${ANSI.RESET} ${opt.default}\n\n`;
  }

  // Example
  if (opt.example) {
    output += `${ANSI.BOLD}Example:${ANSI.RESET}\n  ${ANSI.CYAN}${opt.example}${ANSI.RESET}\n\n`;
  }

  return output;
}

/**
 * Format a validation error with suggestions
 */
export function formatValidationError(
  command: string,
  flag: string,
  result: ValidationResult,
): string {
  let output = `${command}: unrecognized option '${flag}'\n`;

  if (result.suggestions && result.suggestions.length > 0) {
    output += `Did you mean: ${result.suggestions.join(", ")}?\n`;
  }

  output += `Try '${command} --help' for more information.\n`;

  return output;
}
