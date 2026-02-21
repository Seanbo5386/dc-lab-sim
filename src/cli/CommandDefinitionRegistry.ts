import type { CommandDefinition, CommandCategory, CommandOption, UsagePattern } from "./types";
import {
  CommandDefinitionLoader,
  getCommandDefinitionLoader,
} from "./CommandDefinitionLoader";
import { levenshteinDistance } from "@/utils/stringDistance";

export interface ValidationResult {
  valid: boolean;
  suggestions?: string[];
}

/**
 * Central registry for command definitions
 *
 * Provides APIs for:
 * - Flag and subcommand validation
 * - Help text generation
 * - Usage examples and output templates
 * - Permission checking
 * - Error message resolution
 */
export class CommandDefinitionRegistry {
  private loader: CommandDefinitionLoader;
  private initialized = false;

  constructor(loader?: CommandDefinitionLoader) {
    this.loader = loader || getCommandDefinitionLoader();
  }

  /**
   * Whether the registry has finished loading definitions
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the registry by loading all command definitions
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loader.loadAll();
    this.initialized = true;
  }

  /**
   * Get a command definition
   */
  getDefinition(command: string): CommandDefinition | undefined {
    return this.getDefinitionSync(command);
  }

  /**
   * Validate a flag for a command
   */
  validateFlag(command: string, flag: string): ValidationResult {
    if (!this.initialized) {
      // Registry not yet loaded; skip validation rather than rejecting valid flags
      return { valid: true };
    }

    const def = this.getDefinitionSync(command);
    if (!def) {
      return { valid: false, suggestions: [] };
    }

    const validFlags = this.extractValidFlags(def);

    // Exact match (with or without dashes)
    const normalizedFlag = flag.replace(/^-+/, "");
    if (validFlags.some((f) => f.replace(/^-+/, "") === normalizedFlag)) {
      return { valid: true };
    }

    // Fuzzy match for suggestions
    const suggestions = this.fuzzyMatch(normalizedFlag, validFlags);
    return { valid: false, suggestions };
  }

  /**
   * Validate a subcommand for a command
   */
  validateSubcommand(command: string, subcommand: string): ValidationResult {
    if (!this.initialized) {
      // Registry not yet loaded; skip validation rather than rejecting valid subcommands
      return { valid: true };
    }

    const def = this.getDefinitionSync(command);
    if (!def || !def.subcommands) {
      return { valid: false, suggestions: [] };
    }

    const validSubcommands = def.subcommands.map((s) => s.name);

    if (validSubcommands.includes(subcommand)) {
      return { valid: true };
    }

    const suggestions = this.fuzzyMatch(subcommand, validSubcommands);
    return { valid: false, suggestions };
  }

  /**
   * Generate help text for a command
   */
  getCommandHelp(command: string): string {
    const def = this.getDefinitionSync(command);
    if (!def) {
      return `Unknown command: ${command}`;
    }

    let help = `${def.command} - ${def.description}\n\n`;
    help += `Usage: ${def.synopsis}\n\n`;

    if (def.global_options && def.global_options.length > 0) {
      help += "Options:\n";
      for (const opt of def.global_options) {
        const shortPart = opt.short ? `-${opt.short}, ` : "    ";
        const longPart = opt.long ? `--${opt.long}` : opt.flag || "";
        help += `  ${shortPart}${longPart}\n`;
        help += `      ${opt.description}\n`;
      }
      help += "\n";
    }

    if (def.subcommands && def.subcommands.length > 0) {
      help += "Subcommands:\n";
      for (const sub of def.subcommands) {
        help += `  ${sub.name.padEnd(20)} ${sub.description}\n`;
      }
    }

    return help;
  }

  /**
   * Get help for a specific flag
   */
  getFlagHelp(command: string, flag: string): string {
    const def = this.getDefinitionSync(command);
    if (!def || !def.global_options) {
      return `Unknown flag: ${flag}`;
    }

    const normalizedFlag = flag.replace(/^-+/, "");
    const opt = def.global_options.find((o) => {
      const shortNorm = o.short?.replace(/^-+/, "");
      const longNorm = o.long?.replace(/^-+/, "").replace(/=$/, "");
      const flagNorm = o.flag?.replace(/^-+/, "").replace(/=$/, "");
      return (
        shortNorm === normalizedFlag ||
        longNorm === normalizedFlag ||
        flagNorm === normalizedFlag
      );
    });

    if (!opt) {
      return `Unknown flag: ${flag}`;
    }

    let help = `${opt.short ? `-${opt.short}, ` : ""}${opt.long ? `--${opt.long}` : opt.flag || ""}\n`;
    help += `  ${opt.description}\n`;
    if (opt.example) {
      help += `  Example: ${opt.example}\n`;
    }

    return help;
  }

  /**
   * Get usage examples for a command
   */
  getUsageExamples(command: string): UsagePattern[] {
    const def = this.getDefinitionSync(command);
    return def?.common_usage_patterns || [];
  }

  /**
   * Get exit code meaning
   */
  getExitCodeMeaning(command: string, code: number): string {
    const def = this.getDefinitionSync(command);
    const exitCode = def?.exit_codes?.find((e) => e.code === code);
    return exitCode?.meaning || `Unknown exit code: ${code}`;
  }

  /**
   * Check if a flag/operation requires root
   */
  requiresRoot(command: string, flag: string): boolean {
    const def = this.getDefinitionSync(command);
    if (!def?.state_interactions?.writes_to) {
      // Fall back to checking permissions
      if (def?.permissions?.write_operations?.toLowerCase().includes("root")) {
        // Check if this flag is a write operation
        const writeFlags = ["pm", "pl", "c", "e", "r", "mig", "lgc", "rgc"];
        if (writeFlags.includes(flag.replace(/^-+/, ""))) {
          return true;
        }
      }
      return false;
    }

    // Check if this flag is in any writes_to that requires privilege
    for (const write of def.state_interactions.writes_to) {
      if (write.requires_privilege === "root") {
        if (
          write.requires_flags?.some(
            (f) => f.replace(/^-+/, "") === flag.replace(/^-+/, ""),
          )
        ) {
          return true;
        }
      }
    }

    // Also check permissions.write_operations for general guidance
    if (def.permissions?.write_operations?.toLowerCase().includes("root")) {
      // Flags that typically modify state
      const writeFlags = ["pm", "pl", "c", "e", "r", "mig", "lgc", "rgc"];
      if (writeFlags.includes(flag.replace(/^-+/, ""))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get error resolution suggestion
   */
  getErrorResolution(
    command: string,
    errorMessage: string,
  ): string | undefined {
    const def = this.getDefinitionSync(command);
    if (!def?.error_messages) {
      return undefined;
    }

    // Find matching error message (fuzzy)
    const lowerError = errorMessage.toLowerCase();
    const match = def.error_messages.find((e) =>
      lowerError.includes(e.message.toLowerCase().substring(0, 30)),
    );

    return match?.resolution;
  }

  /**
   * Get all commands by category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return this.loader.getByCategory(category);
  }

  /**
   * Get all command names
   */
  getCommandNames(): string[] {
    return this.loader.getCommandNames();
  }

  /**
   * Check if a command definition exists
   */
  has(command: string): boolean {
    return this.loader.has(command);
  }

  /**
   * Build a flag schema for the parser.
   * Maps flag names (without dashes) to whether they take a value.
   * true = takes a value, false = boolean flag.
   * Returns undefined if command not found.
   */
  getFlagSchema(command: string): Map<string, boolean> | undefined {
    const def = this.getDefinitionSync(command);
    if (!def) return undefined;

    const schema = new Map<string, boolean>();

    const processOptions = (options: CommandOption[]) => {
      for (const opt of options) {
        const takesValue = !!opt.arguments;

        if (opt.short) {
          schema.set(opt.short.replace(/^-+/, ''), takesValue);
        }
        if (opt.long) {
          schema.set(opt.long.replace(/^-+/, '').replace(/=$/, ''), takesValue);
        }
        if (opt.flag) {
          schema.set(opt.flag.replace(/^-+/, '').replace(/=$/, ''), takesValue);
        }
      }
    };

    if (def.global_options) {
      processOptions(def.global_options);
    }

    if (def.subcommands) {
      for (const sub of def.subcommands) {
        if (sub.options) {
          processOptions(sub.options);
        }
      }
    }

    return schema.size > 0 ? schema : undefined;
  }

  // Private helpers

  private getDefinitionSync(command: string): CommandDefinition | undefined {
    // The loader caches definitions, so we can access them synchronously after init
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const definitions = (this.loader as any).definitions as Map<
      string,
      CommandDefinition
    >;
    return definitions?.get(command);
  }

  private extractValidFlags(def: CommandDefinition): string[] {
    const flags: string[] = [];

    if (def.global_options) {
      for (const opt of def.global_options) {
        // Normalize by removing leading dashes and trailing = for options that take args
        if (opt.short) flags.push(opt.short.replace(/^-+/, ""));
        if (opt.long) flags.push(opt.long.replace(/^-+/, "").replace(/=$/, ""));
        if (opt.flag) flags.push(opt.flag.replace(/^-+/, "").replace(/=$/, ""));
      }
    }

    return flags;
  }

  private fuzzyMatch(
    input: string,
    candidates: string[],
    maxDistance = 2,
  ): string[] {
    const results: Array<{ candidate: string; distance: number }> = [];

    for (const candidate of candidates) {
      const distance = levenshteinDistance(
        input.toLowerCase(),
        candidate.toLowerCase(),
      );
      if (distance <= maxDistance) {
        results.push({ candidate, distance });
      }
    }

    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((r) => r.candidate);
  }
}

// Singleton with proper async initialization guard
let registryInstance: CommandDefinitionRegistry | null = null;
let registryPromise: Promise<CommandDefinitionRegistry> | null = null;

export async function getCommandDefinitionRegistry(): Promise<CommandDefinitionRegistry> {
  if (registryInstance?.isInitialized) {
    return registryInstance;
  }
  if (!registryPromise) {
    registryPromise = (async () => {
      registryInstance = new CommandDefinitionRegistry();
      await registryInstance.initialize();
      return registryInstance;
    })();
  }
  return registryPromise;
}
