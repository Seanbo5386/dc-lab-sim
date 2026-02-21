/**
 * Base Simulator Abstract Class
 *
 * Provides common functionality for all command simulators including:
 * - Standard --help and --version flag handling
 * - Command registration and routing system
 * - Error handling utilities
 * - Metadata management
 */

import type { CommandResult, CommandContext } from "@/types/commands";
import { parse, type ParsedCommand } from "@/utils/commandParser";
import type {
  ClusterConfig,
  DGXNode,
  GPU,
  HealthStatus,
  XIDError,
} from "@/types/hardware";
import {
  commandInterceptor,
  type FlagDefinition,
} from "@/simulators/CommandInterceptor";
import {
  getCommandDefinitionRegistry,
  CommandDefinitionRegistry,
} from "@/cli/CommandDefinitionRegistry";
import {
  formatCommandHelp,
  formatFlagHelp,
  formatValidationError,
} from "@/cli/formatters";
import { StateEngine } from "@/cli/StateEngine";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * Interface for routing state mutations to either ScenarioContext or global store
 */
export interface StateMutator {
  updateGPU(nodeId: string, gpuId: number, updates: Partial<GPU>): void;
  addXIDError(nodeId: string, gpuId: number, error: XIDError): void;
  updateNodeHealth(nodeId: string, health: HealthStatus): void;
  setMIGMode(nodeId: string, gpuId: number, enabled: boolean): void;
  setSlurmState(
    nodeId: string,
    state: "idle" | "alloc" | "drain" | "down",
    reason?: string,
  ): void;
  allocateGPUsForJob(
    nodeId: string,
    gpuIds: number[],
    jobId: number,
    targetUtilization?: number,
  ): void;
  deallocateGPUsForJob(jobId: number): void;
}

/**
 * Command handler function type
 */
export type CommandHandler = (
  parsed: ParsedCommand,
  context: CommandContext,
) => CommandResult | Promise<CommandResult>;

/**
 * Simulator metadata interface
 */
export interface SimulatorMetadata {
  name: string;
  version: string;
  description: string;
  commands: CommandMetadata[];
}

/**
 * Command metadata for help generation
 */
export interface CommandMetadata {
  name: string;
  description: string;
  usage?: string;
  flags?: FlagMetadata[];
  examples?: string[];
}

/**
 * Flag metadata for help generation
 */
export interface FlagMetadata {
  short?: string;
  long: string;
  description: string;
  takesValue?: boolean;
  defaultValue?: string;
}

/**
 * Abstract base class for all command simulators
 */
export abstract class BaseSimulator {
  /** Command handler registry */
  protected commands: Map<string, CommandHandler> = new Map();

  /** Command metadata for help generation */
  protected commandMetadata: Map<string, CommandMetadata> = new Map();

  /** Command definition registry for JSON-based validation (optional) */
  protected definitionRegistry: CommandDefinitionRegistry | null = null;

  /** State engine for prerequisite checking (optional) */
  protected stateEngine: StateEngine | null = null;

  /**
   * Get simulator metadata (name, version, description)
   * Must be implemented by subclasses
   */
  abstract getMetadata(): SimulatorMetadata;

  /**
   * Main execute method - must be implemented by subclasses
   * @param parsed - Parsed command object
   * @param context - Command execution context
   * @returns Command result with output and exit code
   */
  abstract execute(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult | Promise<CommandResult>;

  /**
   * Register a command handler with metadata
   * @param name - Command name
   * @param handler - Command handler function
   * @param metadata - Command metadata for help
   */
  protected registerCommand(
    name: string,
    handler: CommandHandler,
    metadata?: CommandMetadata,
  ): void {
    this.commands.set(name, handler);
    if (metadata) {
      this.commandMetadata.set(name, metadata);
    }
  }

  /**
   * Get a registered command handler
   * @param name - Command name
   * @returns Command handler or undefined
   */
  protected getCommand(name: string): CommandHandler | undefined {
    return this.commands.get(name);
  }

  /**
   * Safely execute a command handler with try-catch protection.
   * Returns a standardized error result if the handler throws.
   */
  protected safeExecuteHandler(
    handler: CommandHandler,
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult | Promise<CommandResult> {
    try {
      const result = handler(parsed, context);
      // Handle async handlers
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          return this.createError(`Internal error: ${message}`);
        });
      }
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createError(`Internal error: ${message}`);
    }
  }

  /**
   * Check if a command is registered
   * @param name - Command name
   * @returns true if command exists
   */
  protected hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Handle --version flag (common to all simulators)
   * Subclasses can override to provide dynamic versions from node config.
   * @param context - Optional command context for dynamic version lookup
   * @returns Command result with version info
   */
  protected handleVersion(context?: CommandContext): CommandResult {
    const metadata = this.getMetadata();
    return {
      output: `${metadata.name} version ${metadata.version}`,
      exitCode: 0,
    };
  }

  /**
   * Handle --help flag (common to all simulators)
   * @param commandName - Optional specific command to show help for
   * @returns Command result with help text
   */
  protected handleHelp(commandName?: string): CommandResult {
    const metadata = this.getMetadata();

    // If specific command requested, show that command's help
    if (commandName) {
      const cmdMeta = this.commandMetadata.get(commandName);
      if (cmdMeta) {
        return this.generateCommandHelp(cmdMeta);
      }
      return {
        output: `Unknown command: ${commandName}\n\nRun '${metadata.name} --help' to see available commands.`,
        exitCode: 1,
      };
    }

    // Show general help
    return this.generateGeneralHelp();
  }

  /**
   * Generate general help text for the simulator
   */
  private generateGeneralHelp(): CommandResult {
    const metadata = this.getMetadata();
    let output = `${metadata.name} - ${metadata.description}\n\n`;

    output += `Usage: ${metadata.name} [OPTIONS] COMMAND [ARGS...]\n\n`;

    output += `Options:\n`;
    output += `  --help, -h       Show this help message\n`;
    output += `  --version, -v    Show version information\n\n`;

    if (metadata.commands.length > 0) {
      output += `Commands:\n`;

      const maxLength = Math.max(
        ...metadata.commands.map((cmd) => cmd.name.length),
      );

      for (const cmd of metadata.commands) {
        const padding = " ".repeat(maxLength - cmd.name.length + 2);
        output += `  ${cmd.name}${padding}${cmd.description}\n`;
      }

      output += `\nRun '${metadata.name} COMMAND --help' for more information on a command.\n`;
    }

    return {
      output,
      exitCode: 0,
    };
  }

  /**
   * Generate help text for a specific command
   */
  private generateCommandHelp(cmdMeta: CommandMetadata): CommandResult {
    const metadata = this.getMetadata();
    let output = `${metadata.name} ${cmdMeta.name} - ${cmdMeta.description}\n\n`;

    if (cmdMeta.usage) {
      output += `Usage: ${cmdMeta.usage}\n\n`;
    }

    if (cmdMeta.flags && cmdMeta.flags.length > 0) {
      output += `Options:\n`;
      for (const flag of cmdMeta.flags) {
        const shortPart = flag.short ? `-${flag.short}, ` : "    ";
        const longPart = `--${flag.long}`;
        const valuePart = flag.takesValue ? " VALUE" : "";
        const defaultPart = flag.defaultValue
          ? ` (default: ${flag.defaultValue})`
          : "";
        output += `  ${shortPart}${longPart}${valuePart}\n`;
        output += `      ${flag.description}${defaultPart}\n`;
      }
      output += "\n";
    }

    if (cmdMeta.examples && cmdMeta.examples.length > 0) {
      output += `Examples:\n`;
      for (const example of cmdMeta.examples) {
        output += `  ${example}\n`;
      }
    }

    return {
      output,
      exitCode: 0,
    };
  }

  /**
   * Create an error result
   * @param message - Error message
   * @param exitCode - Exit code (default: 1)
   * @returns Command result with error
   */
  protected createError(message: string, exitCode = 1): CommandResult {
    return {
      output: `\x1b[31m${message}\x1b[0m`,
      exitCode,
    };
  }

  /**
   * Create a success result
   * @param output - Output message
   * @returns Command result with exit code 0
   */
  protected createSuccess(output: string): CommandResult {
    return {
      output,
      exitCode: 0,
    };
  }

  /**
   * Per spec Section 8.1: Permission denied error
   * @param command - Command name
   * @param operation - What requires permission
   * @returns Command result with exit code 13 (EACCES)
   */
  protected createPermissionError(
    command: string,
    operation: string = "access",
  ): CommandResult {
    return {
      output: `\x1b[31m${command}: Permission denied: ${operation} requires root privileges\x1b[0m`,
      exitCode: 13, // EACCES
    };
  }

  /**
   * Per spec Section 8.2: Device not found error
   * @param command - Command name
   * @param device - Device path or identifier
   * @returns Command result with exit code 2
   */
  protected createDeviceNotFoundError(
    command: string,
    device: string,
  ): CommandResult {
    return {
      output: `\x1b[31m${command}: Error: Device not found: ${device}\x1b[0m`,
      exitCode: 2,
    };
  }

  /**
   * Per spec Section 8.3: Invalid flag/option error
   * @param command - Command name
   * @param flag - Invalid flag
   * @returns Command result with exit code 2
   */
  protected createInvalidFlagError(
    command: string,
    flag: string,
  ): CommandResult {
    return {
      output: `\x1b[31m${command}: invalid option -- '${flag.replace(/^-+/, "")}'\x1b[0m\nTry '${command} --help' for more information.`,
      exitCode: 2,
    };
  }

  /**
   * Per spec Section 8.4: Missing argument error
   * @param command - Command name
   * @param argument - Missing argument name
   * @returns Command result with exit code 1
   */
  protected createMissingArgumentError(
    command: string,
    argument: string,
  ): CommandResult {
    return {
      output: `\x1b[31m${command}: missing required argument: ${argument}\x1b[0m\nTry '${command} --help' for more information.`,
      exitCode: 1,
    };
  }

  /**
   * Per spec Section 8.5: Invalid flag with suggestion
   * Uses fuzzy matching to suggest corrections for typos
   * @param command - Command name
   * @param flag - Invalid flag
   * @param suggestions - Array of suggested corrections
   * @returns Command result with exit code 2
   */
  protected createFlagSuggestionError(
    command: string,
    flag: string,
    suggestions: string[],
  ): CommandResult {
    let output = `\x1b[31m${command}: unrecognized option '--${flag.replace(/^-+/, "")}'\x1b[0m\n`;

    if (suggestions.length === 1) {
      output += `Did you mean '--${suggestions[0]}'?\n`;
    } else if (suggestions.length > 1) {
      output += `Did you mean one of: ${suggestions.map((s) => `'--${s}'`).join(", ")}?\n`;
    }

    output += `Try '${command} --help' for more information.`;

    return {
      output,
      exitCode: 2,
    };
  }

  /**
   * Per spec Section 8.6: Unknown subcommand with suggestion
   * @param command - Command name
   * @param subcommand - Unknown subcommand
   * @param suggestions - Array of suggested corrections
   * @returns Command result with exit code 1
   */
  protected createSubcommandSuggestionError(
    command: string,
    subcommand: string,
    suggestions: string[],
  ): CommandResult {
    let output = `\x1b[31m${command}: '${subcommand}' is not a ${command} command.\x1b[0m\n`;

    if (suggestions.length === 1) {
      output += `Did you mean '${suggestions[0]}'?\n`;
    } else if (suggestions.length > 1) {
      output += `Similar commands: ${suggestions.join(", ")}\n`;
    }

    output += `See '${command} --help'.`;

    return {
      output,
      exitCode: 1,
    };
  }

  /**
   * Register valid flags for this simulator with the command interceptor
   * Should be called in constructor after registering commands
   * @param flags - Array of flag definitions
   */
  protected registerValidFlags(flags: FlagDefinition[]): void {
    const metadata = this.getMetadata();
    commandInterceptor.registerFlags(metadata.name, flags);
  }

  /**
   * Register valid subcommands for this simulator with the command interceptor
   * @param subcommands - Array of subcommand names
   */
  protected registerValidSubcommands(subcommands: string[]): void {
    const metadata = this.getMetadata();
    commandInterceptor.registerSubcommands(metadata.name, subcommands);
  }

  /**
   * Validate all flags in parsed command using fuzzy matching
   * Returns error result with suggestions if invalid flags found
   * @param parsed - Parsed command
   * @param validFlags - Optional override of valid flags for this specific command
   * @returns CommandResult if error, null if all flags valid
   */
  protected validateFlags(
    parsed: ParsedCommand,
    validFlags?: string[],
  ): CommandResult | null {
    const metadata = this.getMetadata();

    for (const [flag] of parsed.flags) {
      // If validFlags provided, use those; otherwise use registered flags
      if (validFlags) {
        if (!validFlags.includes(flag)) {
          const result = commandInterceptor.validateFlag(metadata.name, flag);
          if (!result.exactMatch) {
            return this.createFlagSuggestionError(
              metadata.name,
              flag,
              result.suggestions,
            );
          }
        }
      } else {
        const result = commandInterceptor.validateFlag(metadata.name, flag);
        // Only error if there are registered flags AND it's not a match
        if (
          commandInterceptor.getRegisteredFlags(metadata.name).length > 0 &&
          !result.exactMatch
        ) {
          return this.createFlagSuggestionError(
            metadata.name,
            flag,
            result.suggestions,
          );
        }
      }
    }
    return null;
  }

  /**
   * Validate a subcommand using fuzzy matching
   * @param subcommand - Subcommand to validate
   * @returns CommandResult if error, null if valid
   */
  protected validateSubcommand(subcommand: string): CommandResult | null {
    const metadata = this.getMetadata();
    const result = commandInterceptor.validateSubcommand(
      metadata.name,
      subcommand,
    );

    // Only error if there are registered subcommands AND it's not a match
    if (
      commandInterceptor.getRegisteredSubcommands(metadata.name).length > 0 &&
      !result.exactMatch
    ) {
      return this.createSubcommandSuggestionError(
        metadata.name,
        subcommand,
        result.suggestions,
      );
    }
    return null;
  }

  // ============================================
  // Command Definition Registry Integration
  // ============================================

  /**
   * Initialize the command definition registry for enhanced validation
   * Call this in simulator constructors to enable JSON-based validation
   */
  protected async initializeDefinitionRegistry(): Promise<void> {
    this.definitionRegistry = await getCommandDefinitionRegistry();
    this.stateEngine = new StateEngine(this.definitionRegistry);
  }

  /**
   * Parse a command string using schema-aware flag parsing.
   * Uses the definition registry to determine which flags are boolean
   * vs value-consuming. Falls back to heuristic parsing if registry
   * is unavailable.
   * @param cmdLine - Raw command line string
   * @returns Parsed command object
   */
  protected parseWithSchema(cmdLine: string): ParsedCommand {
    if (!this.definitionRegistry) {
      return parse(cmdLine);
    }

    const schema = this.definitionRegistry.getFlagSchema(this.getMetadata().name);
    return parse(cmdLine, schema);
  }

  /**
   * Validate flags using the definition registry (if available)
   * Falls back to existing validation if registry not initialized
   * @param parsed - Parsed command
   * @param commandName - Optional command name override (for commands like nvidia-smi)
   * @returns CommandResult if error, null if all flags valid
   */
  protected validateFlagsWithRegistry(
    parsed: ParsedCommand,
    commandName?: string,
  ): CommandResult | null {
    if (!this.definitionRegistry) {
      // Fall back to standard validation
      return this.validateFlags(parsed);
    }

    const name = commandName || this.getMetadata().name;

    for (const [flag] of parsed.flags) {
      const result = this.definitionRegistry.validateFlag(name, flag);
      if (!result.valid) {
        return this.createFlagSuggestionError(
          name,
          flag,
          result.suggestions || [],
        );
      }
    }

    return null;
  }

  /**
   * Validate a subcommand using the definition registry (if available)
   * Falls back to existing validation if registry not initialized
   * @param subcommand - Subcommand to validate
   * @param commandName - Optional command name override
   * @returns CommandResult if error, null if valid
   */
  protected validateSubcommandWithRegistry(
    subcommand: string,
    commandName?: string,
  ): CommandResult | null {
    if (!this.definitionRegistry) {
      return this.validateSubcommand(subcommand);
    }

    const name = commandName || this.getMetadata().name;
    const result = this.definitionRegistry.validateSubcommand(name, subcommand);

    if (!result.valid) {
      return this.createSubcommandSuggestionError(
        name,
        subcommand,
        result.suggestions || [],
      );
    }

    return null;
  }

  /**
   * Get help output from JSON definitions instead of hardcoded methods
   * @param commandName - Command name (uses metadata name if not provided)
   * @returns CommandResult with help text, or null if not found
   */
  protected getHelpFromRegistry(
    commandName?: string,
    parsed?: ParsedCommand,
  ): CommandResult | null {
    if (!this.definitionRegistry) return null;

    const name = commandName || this.getMetadata().name;
    const def = this.definitionRegistry.getDefinition(name);
    if (!def) return null;

    const verbose = parsed?.positionalArgs?.includes("more") ?? false;
    return this.createSuccess(formatCommandHelp(def, verbose));
  }

  /**
   * Get help for a specific flag from JSON definitions
   * @param commandName - Command name
   * @param flag - Flag to get help for (normalized, no leading dashes)
   * @returns CommandResult with flag help or error with suggestions
   */
  protected getFlagHelpFromRegistry(
    commandName: string,
    flag: string,
  ): CommandResult | null {
    if (!this.definitionRegistry) return null;

    const def = this.definitionRegistry.getDefinition(commandName);
    if (!def) return null;

    // Normalize flag
    const normalizedFlag = flag.replace(/^-+/, "");

    // Find the option
    const opt = def.global_options?.find((o) => {
      const shortNorm = o.short?.replace(/^-+/, "");
      const longNorm = o.long?.replace(/^-+/, "").replace(/=$/, "");
      return shortNorm === normalizedFlag || longNorm === normalizedFlag;
    });

    if (opt) {
      return this.createSuccess(formatFlagHelp(commandName, opt));
    }

    // Flag not found - try to get suggestions
    const validation = this.definitionRegistry.validateFlag(
      commandName,
      normalizedFlag,
    );
    return this.createError(
      formatValidationError(commandName, flag, validation),
    );
  }

  /**
   * Check state prerequisites before executing a command
   * @param parsed - Parsed command
   * @param context - Command context with isRoot flag
   * @returns CommandResult with error if prerequisites not met, null if OK
   */
  protected checkStatePrerequisites(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult | null {
    if (!this.stateEngine) return null;

    // Use baseCommand from parsed, or fall back to simulator metadata name
    const commandName = parsed.baseCommand || this.getMetadata().name;

    const flags = Array.from(parsed.flags.keys());

    const error = this.stateEngine.getPrerequisiteError(commandName, flags, {
      isRoot:
        (context as CommandContext & { isRoot?: boolean }).isRoot ?? false,
    });

    if (error) {
      return this.createPermissionError(commandName, "this operation");
    }

    return null;
  }

  /**
   * Format a table for output
   * @param headers - Table headers
   * @param rows - Table rows
   * @param columnWidths - Optional column widths
   * @returns Formatted table string
   */
  protected formatTable(
    headers: string[],
    rows: string[][],
    columnWidths?: number[],
  ): string {
    // Calculate column widths if not provided
    if (!columnWidths) {
      columnWidths = headers.map((header, i) => {
        const maxRowWidth = Math.max(
          ...rows.map((row) => (row[i] || "").length),
        );
        return Math.max(header.length, maxRowWidth);
      });
    }

    // Create separator
    const separator =
      "+" + columnWidths.map((w) => "-".repeat(w + 2)).join("+") + "+";

    // Format header
    const headerRow =
      "| " +
      headers.map((h, i) => h.padEnd(columnWidths![i])).join(" | ") +
      " |";

    // Format rows
    const dataRows = rows.map(
      (row) =>
        "| " +
        row
          .map((cell, i) => (cell || "").padEnd(columnWidths![i]))
          .join(" | ") +
        " |",
    );

    return [separator, headerRow, separator, ...dataRows, separator].join("\n");
  }

  /**
   * Validate required flags are present
   * @param parsed - Parsed command
   * @param requiredFlags - Array of flag names (can include alternatives like ['i', 'id'])
   * @returns Error result if validation fails, null if passes
   */
  protected validateRequiredFlags(
    parsed: ParsedCommand,
    requiredFlags: string[][],
  ): CommandResult | null {
    for (const flagGroup of requiredFlags) {
      const hasAny = flagGroup.some((flag) => parsed.flags.has(flag));
      if (!hasAny) {
        const flagList = flagGroup
          .map((f) => (f.length === 1 ? `-${f}` : `--${f}`))
          .join("/");
        return this.createError(`Missing required flag: ${flagList}`);
      }
    }
    return null;
  }

  /**
   * Get flag value with fallbacks
   * @param parsed - Parsed command
   * @param flags - Array of flag names to try (in order of preference)
   * @param defaultValue - Default value if flag not found
   * @returns Flag value or default
   */
  protected getFlag(
    parsed: ParsedCommand,
    flags: string[],
    defaultValue?: string | boolean,
  ): string | boolean | undefined {
    if (!parsed?.flags) return defaultValue;
    for (const flag of flags) {
      if (parsed.flags.has(flag)) {
        return parsed.flags.get(flag);
      }
    }
    return defaultValue;
  }

  /**
   * Get flag value as string
   * @param parsed - Parsed command
   * @param flags - Array of flag names to try
   * @param defaultValue - Default value if flag not found
   * @returns Flag value as string
   */
  protected getFlagString(
    parsed: ParsedCommand,
    flags: string[],
    defaultValue = "",
  ): string {
    const value = this.getFlag(parsed, flags);
    return typeof value === "string" ? value : defaultValue;
  }

  /**
   * Get flag value as number
   * @param parsed - Parsed command
   * @param flags - Array of flag names to try
   * @param defaultValue - Default value if flag not found or invalid
   * @returns Flag value as number
   */
  protected getFlagNumber(
    parsed: ParsedCommand,
    flags: string[],
    defaultValue = 0,
  ): number {
    const value = this.getFlag(parsed, flags);
    if (typeof value === "string") {
      const num = parseInt(value, 10);
      return isNaN(num) ? defaultValue : num;
    }
    return defaultValue;
  }

  /**
   * Check if any of the specified flags are present
   * @param parsed - Parsed command
   * @param flags - Array of flag names to check
   * @returns true if any flag is present
   */
  protected hasAnyFlag(parsed: ParsedCommand, flags: string[]): boolean {
    if (!parsed?.flags) return false;
    return flags.some((flag) => parsed.flags.has(flag));
  }

  // ============================================
  // Input Validation Utilities
  // ============================================

  /**
   * Validate a GPU index is within valid range
   * @param index - GPU index to validate
   * @param maxGpus - Maximum number of GPUs
   * @returns Validation result with error message if invalid
   */
  protected validateGpuIndex(
    index: number,
    maxGpus: number,
  ): { valid: boolean; error?: string } {
    if (isNaN(index) || !Number.isInteger(index)) {
      return {
        valid: false,
        error: `Invalid GPU index: ${index}. Must be an integer.`,
      };
    }
    if (index < 0 || index >= maxGpus) {
      return {
        valid: false,
        error: `Invalid GPU index: ${index}. Valid range is 0-${maxGpus - 1}.`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate a string represents a positive integer
   * @param value - String value to validate
   * @param name - Name of the parameter for error messages
   * @returns Validation result with parsed value if valid
   */
  protected validatePositiveInt(
    value: string,
    name: string = "Value",
  ): { valid: boolean; error?: string; value?: number } {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return { valid: false, error: `Invalid number: '${value}'` };
    }
    if (num < 0) {
      return { valid: false, error: `${name} must be positive: ${num}` };
    }
    return { valid: true, value: num };
  }

  /**
   * Validate a value is one of a set of valid options
   * @param value - Value to validate
   * @param validValues - Array of valid values
   * @param name - Name of the parameter for error messages
   * @returns Validation result with error message if invalid
   */
  protected validateInSet<T>(
    value: T,
    validValues: T[],
    name: string,
  ): { valid: boolean; error?: string } {
    if (!validValues.includes(value)) {
      return {
        valid: false,
        error: `Invalid ${name}: '${value}'. Valid options: ${validValues.join(", ")}`,
      };
    }
    return { valid: true };
  }

  /**
   * Check for unknown flags and return an error if found
   * @param parsed - Parsed command
   * @param knownFlags - Set of known flag names
   * @param commandName - Command name for error message
   * @returns Error CommandResult if unknown flags found, null otherwise
   */
  protected checkUnknownFlags(
    parsed: ParsedCommand,
    knownFlags: Set<string>,
    commandName: string,
  ): CommandResult | null {
    if (!parsed?.flags) return null;
    for (const flag of parsed.flags.keys()) {
      if (!knownFlags.has(flag)) {
        const flagStr = flag.length === 1 ? `-${flag}` : `--${flag}`;
        return this.createError(
          `${commandName}: unrecognized option '${flagStr}'\nTry '${commandName} --help' for more information.`,
        );
      }
    }
    return null;
  }

  // ============================================
  // Context-Aware State Access (Sandbox Support)
  // ============================================

  /**
   * Resolve the cluster config from context or global store.
   * Priority: context.cluster > context.scenarioContext.getCluster() > global store
   */
  protected resolveCluster(context: CommandContext): ClusterConfig {
    if (context.cluster) {
      return context.cluster;
    }
    if (context.scenarioContext) {
      return context.scenarioContext.getCluster();
    }
    return useSimulationStore.getState().cluster;
  }

  /**
   * Resolve the current node from context or global store.
   * Uses resolveCluster() and finds by context.currentNode.
   */
  protected resolveNode(context: CommandContext): DGXNode | undefined {
    const cluster = this.resolveCluster(context);
    return cluster.nodes.find((n) => n.id === context.currentNode);
  }

  /**
   * Resolve all nodes from context or global store.
   */
  protected resolveAllNodes(context: CommandContext): DGXNode[] {
    return this.resolveCluster(context).nodes;
  }

  /**
   * Resolve a StateMutator that routes mutations to ScenarioContext when active,
   * or to the global simulation store otherwise.
   */
  protected resolveMutator(context: CommandContext): StateMutator {
    const sc = context.scenarioContext;
    if (sc) {
      return {
        updateGPU: (nodeId, gpuId, updates) =>
          sc.updateGPU(nodeId, gpuId, updates),
        addXIDError: (nodeId, gpuId, error) =>
          sc.addXIDError(nodeId, gpuId, error),
        updateNodeHealth: (nodeId, health) =>
          sc.updateNodeHealth(nodeId, health),
        setMIGMode: (nodeId, gpuId, enabled) =>
          sc.setMIGMode(nodeId, gpuId, enabled),
        setSlurmState: (nodeId, state, reason) =>
          sc.setSlurmState(nodeId, state, reason),
        allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
          sc.allocateGPUsForJob(nodeId, gpuIds, jobId, targetUtilization),
        deallocateGPUsForJob: (jobId) => sc.deallocateGPUsForJob(jobId),
      };
    }
    const store = useSimulationStore.getState();
    return {
      updateGPU: (nodeId, gpuId, updates) =>
        store.updateGPU(nodeId, gpuId, updates),
      addXIDError: (nodeId, gpuId, error) =>
        store.addXIDError(nodeId, gpuId, error),
      updateNodeHealth: (nodeId, health) =>
        store.updateNodeHealth(nodeId, health),
      setMIGMode: (nodeId, gpuId, enabled) =>
        store.setMIGMode(nodeId, gpuId, enabled),
      setSlurmState: (nodeId, state, reason) =>
        store.setSlurmState(nodeId, state, reason),
      allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization) =>
        store.allocateGPUsForJob(nodeId, gpuIds, jobId, targetUtilization),
      deallocateGPUsForJob: (jobId) => store.deallocateGPUsForJob(jobId),
    };
  }
}
