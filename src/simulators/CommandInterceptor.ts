/**
 * CommandInterceptor - Fuzzy matching for command flags and subcommands
 *
 * Provides:
 * - Flag suggestion generation for "Did you mean?" errors
 * - Subcommand suggestion for unknown commands
 */

import {
  levenshteinDistance,
  findSimilarStrings,
} from "@/utils/stringDistance";

// Re-export for backward compatibility
export { levenshteinDistance, findSimilarStrings };

/**
 * Result of fuzzy matching operation
 */
export interface FuzzyMatchResult {
  input: string;
  suggestions: string[];
  confidence: number; // 0-1, higher = better match
  exactMatch: boolean;
}

/**
 * Flag definition for registration
 */
export interface FlagDefinition {
  short?: string; // Single char, e.g., 'h'
  long: string; // Full name, e.g., 'help'
  aliases?: string[]; // Additional names
}

/**
 * CommandInterceptor class for managing flag registries and fuzzy matching
 */
export class CommandInterceptor {
  /** Map of command name -> array of valid flags */
  private flagRegistry: Map<string, Set<string>> = new Map();

  /** Map of command name -> array of valid subcommands */
  private subcommandRegistry: Map<string, Set<string>> = new Map();

  /**
   * Register valid flags for a command
   * @param command - Command name (e.g., 'nvidia-smi')
   * @param flags - Array of flag definitions
   */
  registerFlags(command: string, flags: FlagDefinition[]): void {
    const flagSet = this.flagRegistry.get(command) || new Set();

    for (const flag of flags) {
      if (flag.short) flagSet.add(flag.short);
      flagSet.add(flag.long);
      if (flag.aliases) {
        flag.aliases.forEach((alias) => flagSet.add(alias));
      }
    }

    this.flagRegistry.set(command, flagSet);
  }

  /**
   * Register valid subcommands for a command
   * @param command - Command name
   * @param subcommands - Array of subcommand names
   */
  registerSubcommands(command: string, subcommands: string[]): void {
    const subcommandSet = this.subcommandRegistry.get(command) || new Set();
    subcommands.forEach((sub) => subcommandSet.add(sub));
    this.subcommandRegistry.set(command, subcommandSet);
  }

  /**
   * Validate a flag and return suggestions if it's a typo
   * @param command - Command name
   * @param flag - Flag to validate (without leading dashes)
   * @returns FuzzyMatchResult with suggestions
   */
  validateFlag(command: string, flag: string): FuzzyMatchResult {
    const validFlags = this.flagRegistry.get(command);

    if (!validFlags) {
      // Command not registered, can't validate
      return {
        input: flag,
        suggestions: [],
        confidence: 0,
        exactMatch: false,
      };
    }

    const flagArray = Array.from(validFlags);

    // Check for exact match
    if (validFlags.has(flag)) {
      return {
        input: flag,
        suggestions: [],
        confidence: 1.0,
        exactMatch: true,
      };
    }

    // Find similar flags
    const suggestions = findSimilarStrings(flag, flagArray);

    // Calculate confidence based on best match
    let confidence = 0;
    if (suggestions.length > 0) {
      const bestDistance = levenshteinDistance(flag, suggestions[0]);
      confidence =
        1 - bestDistance / Math.max(flag.length, suggestions[0].length);
    }

    return {
      input: flag,
      suggestions,
      confidence,
      exactMatch: false,
    };
  }

  /**
   * Validate a subcommand and return suggestions if it's a typo
   * @param command - Command name
   * @param subcommand - Subcommand to validate
   * @returns FuzzyMatchResult with suggestions
   */
  validateSubcommand(command: string, subcommand: string): FuzzyMatchResult {
    const validSubcommands = this.subcommandRegistry.get(command);

    if (!validSubcommands) {
      return {
        input: subcommand,
        suggestions: [],
        confidence: 0,
        exactMatch: false,
      };
    }

    const subcommandArray = Array.from(validSubcommands);

    // Check for exact match
    if (validSubcommands.has(subcommand)) {
      return {
        input: subcommand,
        suggestions: [],
        confidence: 1.0,
        exactMatch: true,
      };
    }

    // Find similar subcommands
    const suggestions = findSimilarStrings(subcommand, subcommandArray);

    let confidence = 0;
    if (suggestions.length > 0) {
      const bestDistance = levenshteinDistance(subcommand, suggestions[0]);
      confidence =
        1 - bestDistance / Math.max(subcommand.length, suggestions[0].length);
    }

    return {
      input: subcommand,
      suggestions,
      confidence,
      exactMatch: false,
    };
  }

  /**
   * Format a "Did you mean?" error message
   * @param command - Command name
   * @param result - FuzzyMatchResult from validation
   * @param isFlag - Whether this is a flag (true) or subcommand (false)
   * @returns Formatted error string
   */
  formatSuggestion(
    _command: string,
    result: FuzzyMatchResult,
    isFlag: boolean = true,
  ): string {
    if (result.exactMatch || result.suggestions.length === 0) {
      return "";
    }

    const prefix = isFlag ? "--" : "";

    if (result.suggestions.length === 1) {
      return `Did you mean '${prefix}${result.suggestions[0]}'?`;
    }

    const formatted = result.suggestions
      .map((s) => `'${prefix}${s}'`)
      .join(", ");

    return `Did you mean one of: ${formatted}?`;
  }

  /**
   * Get all registered flags for a command
   */
  getRegisteredFlags(command: string): string[] {
    const flags = this.flagRegistry.get(command);
    return flags ? Array.from(flags) : [];
  }

  /**
   * Get all registered subcommands for a command
   */
  getRegisteredSubcommands(command: string): string[] {
    const subcommands = this.subcommandRegistry.get(command);
    return subcommands ? Array.from(subcommands) : [];
  }
}

// Export singleton instance for global use
export const commandInterceptor = new CommandInterceptor();
