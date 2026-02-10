// src/cli/index.ts
// Barrel export for CLI module

// Types
export type {
  CommandCategory,
  StateDomain,
  CommandOption,
  Subcommand,
  ExitCode,
  UsagePattern,
  ErrorMessage,
  StateInteraction,
  CommandDefinition,
} from "./types";

// Loader
export {
  CommandDefinitionLoader,
  getCommandDefinitionLoader,
} from "./CommandDefinitionLoader";

// Registry
export {
  CommandDefinitionRegistry,
  getCommandDefinitionRegistry,
} from "./CommandDefinitionRegistry";
export type { ValidationResult } from "./CommandDefinitionRegistry";

// Explain Command
export { generateExplainOutput } from "./explainCommand";
export type { ExplainOptions } from "./explainCommand";

// Exercise Generator
export { CommandExerciseGenerator } from "./CommandExerciseGenerator";
export type { CommandExercise } from "./CommandExerciseGenerator";

// Formatters
export {
  ANSI,
  formatCommandHelp,
  formatCommandList,
  formatFlagHelp,
  formatErrorMessage,
  formatExitCode,
  formatValidationError,
} from "./formatters";

// State Engine
export { StateEngine } from "./StateEngine";
export type { ExecutionContext, CanExecuteResult } from "./StateEngine";
