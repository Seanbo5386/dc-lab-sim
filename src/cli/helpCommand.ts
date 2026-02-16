import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { CommandDefinition } from "./types";
import type { CommandMetadata } from "../utils/commandMetadata";

export interface HelpOptions {
  includeErrors?: boolean;
  includeExamples?: boolean;
  includePermissions?: boolean;
  cols?: number;
}

/**
 * Generate rich help output for a command.
 * Uses the comprehensive JSON definitions for detailed help,
 * enriched with learning metadata when available.
 */
export async function generateHelpOutput(
  input: string,
  registry: CommandDefinitionRegistry,
  options: HelpOptions = {},
  learningMetadata?: CommandMetadata | null,
): Promise<string> {
  const parts = input.trim().split(/\s+/);
  const commandName = parts[0];
  const flagOrSub = parts[1];

  const def = registry.getDefinition(commandName);

  if (!def) {
    return (
      `\x1b[31mCommand '${commandName}' not found in documentation.\x1b[0m\n` +
      `Try 'help' to see available commands.`
    );
  }

  // If explaining a specific flag
  if (flagOrSub && flagOrSub.startsWith("-")) {
    return generateFlagExplanation(def, flagOrSub, registry);
  }

  // If explaining a subcommand
  if (flagOrSub && def.subcommands?.some((s) => s.name === flagOrSub)) {
    return generateSubcommandExplanation(def, flagOrSub);
  }

  return generateCommandExplanation(
    def,
    options,
    learningMetadata,
    options.cols,
  );
}

function wrapHelpText(text: string, width: number, indent: number): string {
  const pad = " ".repeat(indent);
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const isFirst = lines.length === 0;
    const prefix = isFirst ? "" : pad;
    const testLine = currentLine
      ? `${currentLine} ${word}`
      : `${prefix}${word}`;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = `${pad}${word}`;
    }
  }
  if (currentLine) lines.push(currentLine);
  return (lines.length > 0 ? lines : [""]).join("\n");
}

function generateCommandExplanation(
  def: CommandDefinition,
  options: HelpOptions,
  learningMetadata?: CommandMetadata | null,
  cols = 80,
): string {
  const w = Math.max(40, cols - 2);
  const flagPad = Math.min(25, Math.floor(w * 0.35));
  const subPad = Math.min(15, Math.floor(w * 0.25));
  const descStart = flagPad + 2;
  const subDescStart = subPad + 2;
  let output = "";

  // Header
  output += `\x1b[1;36m━━━ ${def.command} ━━━\x1b[0m\n\n`;

  // Description — wrap to terminal width
  output += `\x1b[1mDescription:\x1b[0m\n`;
  output += `  ${wrapHelpText(def.description, w, 2)}\n\n`;

  // Synopsis
  output += `\x1b[1mUsage:\x1b[0m\n`;
  output += `  ${def.synopsis}\n\n`;

  // Usage examples
  if (def.common_usage_patterns && def.common_usage_patterns.length > 0) {
    output += `\x1b[1mExamples:\x1b[0m\n`;
    for (const pattern of def.common_usage_patterns) {
      output += `\n  \x1b[36m${pattern.command}\x1b[0m\n`;
      output += `  ${wrapHelpText(pattern.description, w - 4, 4)}\n`;
      if (pattern.requires_root) {
        output += `    \x1b[33m⚠ Requires root privileges\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Options — wrap long descriptions with hanging indent
  if (def.global_options && def.global_options.length > 0) {
    output += `\x1b[1mOptions:\x1b[0m\n`;
    for (const opt of def.global_options) {
      const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
      const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");
      const wrapped = wrapHelpText(
        opt.description,
        w - descStart - 1,
        descStart + 1,
      );
      output += `  \x1b[36m${combined.padEnd(flagPad)}\x1b[0m ${wrapped}\n`;
    }
    output += "\n";
  }

  // Subcommands — wrap long descriptions
  if (def.subcommands && def.subcommands.length > 0) {
    output += `\x1b[1mSubcommands:\x1b[0m\n`;
    for (const sub of def.subcommands) {
      const wrapped = wrapHelpText(
        sub.description,
        w - subDescStart - 1,
        subDescStart + 1,
      );
      output += `  \x1b[36m${sub.name.padEnd(subPad)}\x1b[0m ${wrapped}\n`;
    }
    output += "\n";
  }

  // Error messages and resolutions — wrap
  if (
    options.includeErrors !== false &&
    def.error_messages &&
    def.error_messages.length > 0
  ) {
    output += `\x1b[1mCommon Errors:\x1b[0m\n`;
    for (const err of def.error_messages) {
      output += `  \x1b[31m${err.message}\x1b[0m\n`;
      output += `    ${wrapHelpText("Meaning: " + err.meaning, w - 4, 4)}\n`;
      if (err.resolution) {
        output += `    \x1b[32m${wrapHelpText("Fix: " + err.resolution, w - 4, 4)}\x1b[0m\n`;
      }
    }
    output += "\n";
  }

  // Exit codes
  if (def.exit_codes && def.exit_codes.length > 0) {
    output += `\x1b[1mExit Codes:\x1b[0m\n`;
    for (const ec of def.exit_codes) {
      output += `  \x1b[36m${ec.code.toString().padEnd(5)}\x1b[0m ${ec.meaning}\n`;
    }
    output += "\n";
  }

  // Related commands
  if (def.interoperability?.related_commands) {
    output += `\x1b[1mRelated Commands:\x1b[0m `;
    output += def.interoperability.related_commands.join(", ");
    output += "\n\n";
  }

  // Source documentation
  if (def.source_urls && def.source_urls.length > 0) {
    output += `\x1b[90mDocumentation: ${def.source_urls[0]}\x1b[0m\n`;
  }

  // Learning aids from command metadata (when available)
  if (learningMetadata) {
    output += `\n\x1b[1;36m━━━ Learning Aids ━━━\x1b[0m\n\n`;

    if (learningMetadata.whenToUse) {
      output += `\x1b[1mWhen to Use:\x1b[0m\n`;
      output += `  ${wrapHelpText(learningMetadata.whenToUse, w, 2)}\n\n`;
    }

    if (
      learningMetadata.commonMistakes &&
      learningMetadata.commonMistakes.length > 0
    ) {
      output += `\x1b[1mCommon Mistakes:\x1b[0m\n`;
      for (const mistake of learningMetadata.commonMistakes) {
        output += `  \x1b[31m✗\x1b[0m ${wrapHelpText(mistake, w - 4, 4)}\n`;
      }
      output += "\n";
    }

    if (learningMetadata.difficulty) {
      const difficultyColors: Record<string, string> = {
        beginner: "\x1b[32m",
        intermediate: "\x1b[33m",
        advanced: "\x1b[31m",
      };
      const color = difficultyColors[learningMetadata.difficulty] || "";
      output += `\x1b[1mDifficulty:\x1b[0m ${color}${learningMetadata.difficulty.charAt(0).toUpperCase() + learningMetadata.difficulty.slice(1)}\x1b[0m\n`;
    }

    if (learningMetadata.domains && learningMetadata.domains.length > 0) {
      const domainNames: Record<string, string> = {
        domain1: "Domain 1 (Systems/Server Bring-Up)",
        domain2: "Domain 2 (Physical Layer Management)",
        domain3: "Domain 3 (Control Plane Installation)",
        domain4: "Domain 4 (Cluster Test/Verification)",
        domain5: "Domain 5 (Troubleshooting/Optimization)",
      };
      output += `\x1b[1mExam Domains:\x1b[0m `;
      output += learningMetadata.domains
        .map((d) => domainNames[d] || d)
        .join(", ");
      output += "\n";
    }
  }

  return output;
}

function generateFlagExplanation(
  def: CommandDefinition,
  flag: string,
  registry: CommandDefinitionRegistry,
): string {
  const normalizedFlag = flag.replace(/^-+/, "");

  const opt = def.global_options?.find((o) => {
    const shortNorm = o.short?.replace(/^-+/, "");
    const longNorm = o.long?.replace(/^-+/, "").replace(/=$/, "");
    return shortNorm === normalizedFlag || longNorm === normalizedFlag;
  });

  if (!opt) {
    // Check if it's a typo and suggest alternatives
    const validation = registry.validateFlag(def.command, normalizedFlag);
    if (validation.suggestions && validation.suggestions.length > 0) {
      return (
        `\x1b[31mFlag '${flag}' not found for ${def.command}.\x1b[0m\n` +
        `Did you mean: ${validation.suggestions.join(", ")}?\n` +
        `Run 'help ${def.command}' to see all available options.`
      );
    }
    return (
      `\x1b[31mFlag '${flag}' not found for ${def.command}.\x1b[0m\n` +
      `Run 'help ${def.command}' to see available options.`
    );
  }

  let output = "";
  output += `\x1b[1;36m━━━ ${def.command} ${flag} ━━━\x1b[0m\n\n`;

  const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
  const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
  output += `\x1b[1mFlag:\x1b[0m ${[shortStr, longStr].filter(Boolean).join(", ")}\n\n`;

  output += `\x1b[1mDescription:\x1b[0m\n  ${opt.description}\n\n`;

  if (opt.arguments) {
    output += `\x1b[1mArguments:\x1b[0m ${opt.arguments}`;
    if (opt.argument_type) {
      output += ` (${opt.argument_type})`;
    }
    output += "\n\n";
  }

  if (opt.default) {
    output += `\x1b[1mDefault:\x1b[0m ${opt.default}\n\n`;
  }

  if (opt.example) {
    output += `\x1b[1mExample:\x1b[0m\n  \x1b[36m${opt.example}\x1b[0m\n\n`;
  }

  // Check if requires root
  if (registry.requiresRoot(def.command, normalizedFlag)) {
    output += `\x1b[33m⚠ This option requires root privileges\x1b[0m\n`;
  }

  return output;
}

function generateSubcommandExplanation(
  def: CommandDefinition,
  subcommandName: string,
): string {
  const sub = def.subcommands?.find((s) => s.name === subcommandName);

  if (!sub) {
    return `\x1b[31mSubcommand '${subcommandName}' not found for ${def.command}.\x1b[0m\n`;
  }

  let output = "";
  output += `\x1b[1;36m━━━ ${def.command} ${sub.name} ━━━\x1b[0m\n\n`;

  output += `\x1b[1mDescription:\x1b[0m\n  ${sub.description}\n\n`;

  if (sub.synopsis) {
    output += `\x1b[1mUsage:\x1b[0m\n  ${sub.synopsis}\n\n`;
  }

  if (sub.options && sub.options.length > 0) {
    output += `\x1b[1mOptions:\x1b[0m\n`;
    for (const opt of sub.options) {
      const shortStr = opt.short ? opt.short.replace(/^-*/, "-") : "";
      const longStr = opt.long ? opt.long.replace(/^-*/, "--") : "";
      const combined = [shortStr, longStr].filter(Boolean).join(", ");
      const wrapped = wrapHelpText(opt.description, 76, 23);
      output += `  \x1b[36m${combined.padEnd(20)}\x1b[0m ${wrapped}\n`;
    }
    output += "\n";
  }

  return output;
}
