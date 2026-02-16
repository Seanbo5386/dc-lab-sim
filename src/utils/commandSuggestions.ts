import {
  COMMAND_METADATA,
  type CommandMetadata,
  getCommandMetadata,
} from "./commandMetadata";

/**
 * Common command errors and their explanations
 */
interface ErrorExplanation {
  pattern: RegExp;
  explanation: string;
  suggestion: string;
  docLink?: string;
}

const ERROR_EXPLANATIONS: ErrorExplanation[] = [
  {
    pattern: /command not found/i,
    explanation: "The command you entered is not recognized.",
    suggestion: 'Check the spelling or type "help" to see available commands.',
  },
  {
    pattern: /permission denied/i,
    explanation: "This operation requires elevated privileges.",
    suggestion:
      "Try running with sudo (in production) or check your user permissions.",
  },
  {
    pattern: /device not found|no device/i,
    explanation: "The specified device does not exist or is not accessible.",
    suggestion:
      "Verify the device path using nvidia-smi, lspci, or mst status.",
  },
  {
    pattern: /MST driver not loaded/i,
    explanation: "Mellanox Software Tools (MST) driver is not initialized.",
    suggestion: 'Run "mst start" before using mlx* or InfiniBand commands.',
    docLink:
      "https://docs.nvidia.com/networking/display/mft/mstconfig+commands",
  },
  {
    pattern: /invalid option|unrecognized option/i,
    explanation: "The flag or option you used is not valid for this command.",
    suggestion: 'Use "--help" to see available options for this command.',
  },
  {
    pattern: /missing.*argument|required.*argument/i,
    explanation: "A required argument was not provided.",
    suggestion: 'Check the command syntax using "<command> --help".',
  },
  {
    pattern: /GPU.*error|XID.*error/i,
    explanation: "A GPU hardware or driver error was detected.",
    suggestion: "Check dmesg and nvidia-smi -q for detailed error information.",
    docLink: "https://docs.nvidia.com/deploy/xid-errors/index.html",
  },
  {
    pattern: /ECC.*error/i,
    explanation: "Memory error correction detected issues.",
    suggestion:
      "Monitor with dcgmi health and consider GPU replacement if errors persist.",
    docLink: "https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/",
  },
  {
    pattern: /thermal|temperature|throttl/i,
    explanation:
      "Temperature threshold exceeded, causing performance throttling.",
    suggestion: "Check cooling systems and GPU fan status with nvidia-smi -q.",
  },
  {
    pattern: /NVLink.*error|nvlink.*inactive/i,
    explanation: "NVLink interconnect issue detected.",
    suggestion:
      "Run nvlink-audit or nvidia-smi nvlink --status for diagnostics.",
  },
  {
    pattern: /InfiniBand|port.*down|link.*down/i,
    explanation: "InfiniBand fabric connectivity issue.",
    suggestion:
      "Check cable connections and use ibstat, iblinkinfo for diagnostics.",
  },
  {
    pattern: /SLURM.*error|job.*failed/i,
    explanation: "Slurm job scheduler encountered an issue.",
    suggestion: "Check job logs with sacct and node status with sinfo.",
  },
  {
    pattern: /container.*not found|image.*not found/i,
    explanation: "The container or image specified does not exist.",
    suggestion:
      'Pull the image first with "docker pull" or "ngc registry image list".',
  },
  {
    pattern: /out of memory|OOM/i,
    explanation: "GPU or system ran out of memory.",
    suggestion:
      "Reduce batch size, use gradient checkpointing, or check for memory leaks.",
  },
];

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy command matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Find similar commands based on typo/fuzzy matching
 */
export function findSimilarCommands(
  input: string,
  threshold: number = 0.6,
): string[] {
  const commandNames = Object.keys(COMMAND_METADATA);
  const suggestions: Array<{ command: string; similarity: number }> = [];

  for (const commandName of commandNames) {
    const similarity = similarityRatio(input, commandName);
    if (similarity >= threshold && similarity < 1) {
      suggestions.push({ command: commandName, similarity });
    }

    // Also check aliases
    const metadata = COMMAND_METADATA[commandName];
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        const aliasSimilarity = similarityRatio(input, alias);
        if (aliasSimilarity >= threshold && aliasSimilarity < 1) {
          suggestions.push({
            command: commandName,
            similarity: aliasSimilarity,
          });
        }
      }
    }
  }

  // Sort by similarity (highest first) and return unique commands
  return [
    ...new Set(
      suggestions
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map((s) => s.command),
    ),
  ];
}

/**
 * Get "Did you mean?" message for unknown commands
 */
export function getDidYouMeanMessage(input: string): string | null {
  const suggestions = findSimilarCommands(input);

  if (suggestions.length === 0) {
    return null;
  }

  if (suggestions.length === 1) {
    return `\x1b[33mCommand not found.\x1b[0m Did you mean \x1b[1;36m${suggestions[0]}\x1b[0m?`;
  }

  return `\x1b[33mCommand not found.\x1b[0m Did you mean one of these?\n${suggestions.map((cmd) => `  \x1b[1;36m${cmd}\x1b[0m`).join("\n")}`;
}

/**
 * Get context-aware command suggestions based on current scenario step
 */
export function getContextualSuggestions(
  stepObjectives: string[],
): CommandMetadata[] {
  const suggestions: CommandMetadata[] = [];
  const keywords = stepObjectives.join(" ").toLowerCase();

  // Match commands based on objectives
  for (const cmd of Object.values(COMMAND_METADATA)) {
    const relevanceScore = calculateRelevance(cmd, keywords);
    if (relevanceScore > 0) {
      suggestions.push(cmd);
    }
  }

  return suggestions
    .sort((a, b) => {
      const scoreA = calculateRelevance(a, keywords);
      const scoreB = calculateRelevance(b, keywords);
      return scoreB - scoreA;
    })
    .slice(0, 5);
}

/**
 * Calculate how relevant a command is to given keywords
 */
function calculateRelevance(cmd: CommandMetadata, keywords: string): number {
  let score = 0;

  // Check if command name appears
  if (keywords.includes(cmd.name.toLowerCase())) {
    score += 10;
  }

  // Check description
  const description = (
    cmd.shortDescription +
    " " +
    cmd.longDescription
  ).toLowerCase();
  const keywordList = keywords.split(/\s+/);

  for (const keyword of keywordList) {
    if (keyword.length < 3) continue; // Skip short words
    if (description.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Format command help for terminal output.
 * @param metadata  Command metadata to format
 * @param cols      Terminal column width (default 80)
 */
export function formatCommandHelp(
  metadata: CommandMetadata,
  cols = 80,
): string {
  const lines: string[] = [];
  // Usable width minus small margin; minimum 40 to avoid degenerate wrapping
  const w = Math.max(40, cols - 2);
  // Box inner width (content area between ║…║)
  const boxInner = w - 4; // "║  " + content + " ║"
  const rule = "═".repeat(w - 2);

  // Header box — scales to terminal width
  lines.push(`\x1b[1;36m╔${rule}╗\x1b[0m`);
  lines.push(
    `\x1b[1;36m║  ${metadata.name.toUpperCase().padEnd(boxInner)}║\x1b[0m`,
  );
  lines.push(`\x1b[1;36m╠${rule}╣\x1b[0m`);
  lines.push(
    `\x1b[1;36m║\x1b[0m  \x1b[1mCategory:\x1b[0m ${metadata.category.padEnd(boxInner - 12)}\x1b[1;36m║\x1b[0m`,
  );
  lines.push(
    `\x1b[1;36m║\x1b[0m  \x1b[1mDifficulty:\x1b[0m ${metadata.difficulty.padEnd(boxInner - 14)}\x1b[1;36m║\x1b[0m`,
  );
  lines.push(`\x1b[1;36m╚${rule}╝\x1b[0m`);
  lines.push("");

  // Description
  lines.push(`\x1b[1mDESCRIPTION:\x1b[0m`);
  lines.push(wrapText(metadata.longDescription, w, 2).join("\n"));
  lines.push("");

  // Syntax
  lines.push(`\x1b[1mSYNTAX:\x1b[0m`);
  lines.push(`  \x1b[36m${metadata.syntax}\x1b[0m`);
  lines.push("");

  // Flag column width: adaptive but capped
  const flagPad = Math.min(25, Math.floor(w * 0.35));
  const descStart = flagPad + 2; // "  " + flagPad

  // Common Flags — wrap long descriptions with hanging indent
  if (metadata.commonFlags && metadata.commonFlags.length > 0) {
    lines.push(`\x1b[1mCOMMON FLAGS:\x1b[0m`);
    for (const flag of metadata.commonFlags) {
      const flagStr = `  \x1b[33m${flag.flag.padEnd(flagPad)}\x1b[0m `;
      const descLines = wrapText(
        flag.description,
        w - descStart - 1,
        descStart + 1,
      );
      lines.push(flagStr + descLines[0]);
      for (let i = 1; i < descLines.length; i++) {
        lines.push(descLines[i]);
      }
      if (flag.example) {
        lines.push(`    \x1b[90mExample: ${flag.example}\x1b[0m`);
      }
    }
    lines.push("");
  }

  // Examples
  lines.push(`\x1b[1mEXAMPLES:\x1b[0m`);
  for (let i = 0; i < metadata.examples.length; i++) {
    const example = metadata.examples[i];
    lines.push(
      `  \x1b[1;32m${i + 1}.\x1b[0m \x1b[36m${example.command}\x1b[0m`,
    );
    const descLines = wrapText(example.description, w - 5, 5);
    for (const dl of descLines) {
      lines.push(dl);
    }
    if (i < metadata.examples.length - 1) {
      lines.push("");
    }
  }
  lines.push("");

  // When to Use
  lines.push(`\x1b[1mWHEN TO USE:\x1b[0m`);
  lines.push(wrapText(metadata.whenToUse, w, 2).join("\n"));
  lines.push("");

  // Related Commands
  if (metadata.relatedCommands && metadata.relatedCommands.length > 0) {
    lines.push(`\x1b[1mRELATED COMMANDS:\x1b[0m`);
    lines.push(
      `  ${metadata.relatedCommands.map((cmd) => `\x1b[36m${cmd}\x1b[0m`).join(", ")}`,
    );
    lines.push("");
  }

  // Common Mistakes — wrap each bullet with hanging indent
  if (metadata.commonMistakes && metadata.commonMistakes.length > 0) {
    lines.push(`\x1b[1m⚠️  COMMON MISTAKES:\x1b[0m`);
    for (const mistake of metadata.commonMistakes) {
      const wrapped = wrapText(mistake, w - 4, 4);
      lines.push(`  • ${wrapped[0]}`);
      for (let i = 1; i < wrapped.length; i++) {
        lines.push(wrapped[i]);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Wrap text to specified width with optional hanging indent.
 * @param text      The text to wrap
 * @param width     Maximum line width
 * @param indent    Number of spaces to indent continuation lines (default 0)
 */
function wrapText(text: string, width: number, indent = 0): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  const pad = " ".repeat(indent);

  for (const word of words) {
    const isFirst = lines.length === 0;
    const prefix = isFirst ? "" : pad;
    const testLine = currentLine
      ? `${currentLine} ${word}`
      : `${prefix}${word}`;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = `${pad}${word}`;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Format a brief command list for help overview.
 * @param cols  Terminal column width (default 80)
 */
export function formatCommandList(cols = 80): string {
  const categories = new Map<string, CommandMetadata[]>();

  // Group commands by category
  for (const cmd of Object.values(COMMAND_METADATA)) {
    if (!categories.has(cmd.category)) {
      categories.set(cmd.category, []);
    }
    categories.get(cmd.category)!.push(cmd);
  }

  const w = Math.max(40, cols - 2);
  const rule = "═".repeat(w - 2);
  const boxInner = w - 4;
  const namePad = Math.min(20, Math.floor(w * 0.3));

  const lines: string[] = [];
  lines.push(`\x1b[1;32m╔${rule}╗\x1b[0m`);
  lines.push(`\x1b[1;32m║  ${"COMMAND REFERENCE".padEnd(boxInner)}║\x1b[0m`);
  lines.push(`\x1b[1;32m╚${rule}╝\x1b[0m`);
  lines.push("");
  lines.push(
    "\x1b[33mType \x1b[1;36mhelp <command>\x1b[0m\x1b[33m for detailed help on any command.\x1b[0m",
  );
  lines.push(
    "\x1b[33mType \x1b[1;36mman <command>\x1b[0m\x1b[33m for Linux/HPC command manual pages.\x1b[0m",
  );
  lines.push("");

  // Print each category
  const descStart = namePad + 2;
  for (const [category, commands] of categories) {
    const categoryName = category.replace(/-/g, " ").toUpperCase();
    lines.push(`\x1b[1m${categoryName}:\x1b[0m`);

    for (const cmd of commands) {
      const descLines = wrapText(
        cmd.shortDescription,
        w - descStart,
        descStart,
      );
      lines.push(
        `  \x1b[36m${cmd.name.padEnd(namePad)}\x1b[0m ${descLines[0]}`,
      );
      for (let i = 1; i < descLines.length; i++) {
        lines.push(descLines[i]);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Enhanced error feedback with explanation and suggestions
 */
export interface EnhancedErrorFeedback {
  originalError: string;
  explanation: string;
  suggestion: string;
  documentationLink?: string;
  relatedCommands?: string[];
  formatted: string;
}

/**
 * Get enhanced error feedback for a command error
 */
export function getEnhancedErrorFeedback(
  command: string,
  errorMessage: string,
): EnhancedErrorFeedback | null {
  // Find matching error pattern
  for (const errorExp of ERROR_EXPLANATIONS) {
    if (errorExp.pattern.test(errorMessage)) {
      const lines: string[] = [];

      lines.push(
        `\n\x1b[1;33m╔══════════════════════════════════════════════════════════╗\x1b[0m`,
      );
      lines.push(
        `\x1b[1;33m║  COMMAND ERROR                                           ║\x1b[0m`,
      );
      lines.push(
        `\x1b[1;33m╚══════════════════════════════════════════════════════════╝\x1b[0m`,
      );
      lines.push("");
      lines.push(`\x1b[1mWhat happened:\x1b[0m`);
      lines.push(`  ${errorExp.explanation}`);
      lines.push("");
      lines.push(`\x1b[1;32mSuggestion:\x1b[0m`);
      lines.push(`  ${errorExp.suggestion}`);

      if (errorExp.docLink) {
        lines.push("");
        lines.push(`\x1b[1;36mDocumentation:\x1b[0m`);
        lines.push(`  ${errorExp.docLink}`);
      }

      // Get related commands from metadata
      const cmdMetadata = getCommandMetadata(command.split(" ")[0]);
      if (cmdMetadata?.relatedCommands) {
        lines.push("");
        lines.push(`\x1b[1mRelated commands:\x1b[0m`);
        lines.push(
          `  ${cmdMetadata.relatedCommands.map((c) => `\x1b[36m${c}\x1b[0m`).join(", ")}`,
        );
      }

      lines.push("");

      return {
        originalError: errorMessage,
        explanation: errorExp.explanation,
        suggestion: errorExp.suggestion,
        documentationLink: errorExp.docLink,
        relatedCommands: cmdMetadata?.relatedCommands,
        formatted: lines.join("\n"),
      };
    }
  }

  return null;
}

/**
 * Format an output diff for scenario validation
 */
export function formatOutputDiff(
  actual: string,
  expected: string,
  label?: string,
): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const lines: string[] = [];

  lines.push(
    `\n\x1b[1;35m╔══════════════════════════════════════════════════════════╗\x1b[0m`,
  );
  lines.push(
    `\x1b[1;35m║  ${(label || "OUTPUT COMPARISON").padEnd(56)}║\x1b[0m`,
  );
  lines.push(
    `\x1b[1;35m╚══════════════════════════════════════════════════════════╝\x1b[0m`,
  );
  lines.push("");

  const maxLines = Math.max(actualLines.length, expectedLines.length);

  for (let i = 0; i < maxLines && i < 10; i++) {
    // Limit to 10 lines for readability
    const actualLine = actualLines[i] || "";
    const expectedLine = expectedLines[i] || "";

    if (actualLine === expectedLine) {
      lines.push(`  \x1b[32m✓\x1b[0m ${actualLine}`);
    } else {
      lines.push(`  \x1b[31m✗ Actual:   ${actualLine}\x1b[0m`);
      lines.push(`  \x1b[33m  Expected: ${expectedLine}\x1b[0m`);
    }
  }

  if (maxLines > 10) {
    lines.push(`  ... and ${maxLines - 10} more lines`);
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Get contextual hint based on command and current step
 */
export function getContextualHint(
  command: string,
  _stepObjectives: string[],
  attemptCount: number,
): string | null {
  // After 3 attempts, provide more specific hints
  if (attemptCount < 3) {
    return null;
  }

  const cmdMetadata = getCommandMetadata(command);
  if (!cmdMetadata) {
    return null;
  }

  const lines: string[] = [];
  lines.push(`\n\x1b[1;33m💡 Hint:\x1b[0m`);

  // Suggest common usage
  if (cmdMetadata.examples.length > 0) {
    lines.push(`  Try: \x1b[36m${cmdMetadata.examples[0].command}\x1b[0m`);
  }

  // Point out common mistakes
  if (cmdMetadata.commonMistakes && cmdMetadata.commonMistakes.length > 0) {
    lines.push(`  Common mistake: ${cmdMetadata.commonMistakes[0]}`);
  }

  return lines.join("\n");
}

/**
 * Generate learning feedback for completed step
 */
export function generateStepCompletionFeedback(
  stepTitle: string,
  commandsUsed: string[],
  timeTaken: number,
): string {
  const lines: string[] = [];

  lines.push(
    `\n\x1b[1;32m╔══════════════════════════════════════════════════════════╗\x1b[0m`,
  );
  lines.push(
    `\x1b[1;32m║  ✓ STEP COMPLETED                                        ║\x1b[0m`,
  );
  lines.push(
    `\x1b[1;32m╚══════════════════════════════════════════════════════════╝\x1b[0m`,
  );
  lines.push("");
  lines.push(`\x1b[1m${stepTitle}\x1b[0m`);
  lines.push("");
  lines.push(`Commands used: ${commandsUsed.length}`);
  lines.push(`Time taken: ${Math.round(timeTaken / 1000)}s`);
  lines.push("");

  // Provide learning reinforcement
  const uniqueCommands = [...new Set(commandsUsed.map((c) => c.split(" ")[0]))];
  if (uniqueCommands.length > 0) {
    lines.push(`\x1b[1mKey commands practiced:\x1b[0m`);
    for (const cmd of uniqueCommands.slice(0, 5)) {
      const metadata = getCommandMetadata(cmd);
      if (metadata) {
        lines.push(`  \x1b[36m${cmd}\x1b[0m - ${metadata.shortDescription}`);
      }
    }
  }

  lines.push("");
  lines.push(
    `\x1b[33mTip: Use "help <command>" to learn more about any command.\x1b[0m`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Validate command syntax and provide helpful feedback
 */
export function validateCommandSyntax(command: string): {
  valid: boolean;
  feedback?: string;
} {
  const parts = command.trim().split(/\s+/);
  const baseCmd = parts[0];

  // Check for empty command
  if (!baseCmd) {
    return { valid: false, feedback: "No command entered." };
  }

  // Check for known command
  const metadata = getCommandMetadata(baseCmd);
  if (!metadata) {
    // Try to suggest similar commands
    const suggestions = findSimilarCommands(baseCmd);
    if (suggestions.length > 0) {
      return {
        valid: false,
        feedback: `Unknown command "${baseCmd}". Did you mean: ${suggestions.join(", ")}?`,
      };
    }
    return { valid: false, feedback: `Unknown command "${baseCmd}".` };
  }

  // Basic syntax validation passed
  return { valid: true };
}
