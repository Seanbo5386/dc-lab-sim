import type { CommandDefinitionRegistry } from "./CommandDefinitionRegistry";
import type { CommandDefinition, UsagePattern, CommandCategory } from "./types";

export interface CommandExercise {
  id: string;
  prompt: string;
  expectedCommand: string;
  hints: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  relatedCommand: string;
  outputExample?: string;
}

/**
 * Generates learning exercises from command definitions
 *
 * Uses the comprehensive JSON command documentation to create
 * practice exercises at various difficulty levels.
 */
export class CommandExerciseGenerator {
  private allExercises: CommandExercise[] = [];
  private exercisesByDifficulty: Map<string, CommandExercise[]> = new Map();

  constructor(private registry: CommandDefinitionRegistry) {
    this.precomputeExercises();
  }

  /**
   * Pre-compute all exercises on initialization for fast retrieval
   */
  private precomputeExercises(): void {
    const commandNames = this.registry.getCommandNames();

    for (const cmdName of commandNames) {
      const exercises = this.generateExercisesForDefinition(cmdName);
      this.allExercises.push(...exercises);
    }

    // Index by difficulty
    this.exercisesByDifficulty.set("beginner", []);
    this.exercisesByDifficulty.set("intermediate", []);
    this.exercisesByDifficulty.set("advanced", []);

    for (const exercise of this.allExercises) {
      this.exercisesByDifficulty.get(exercise.difficulty)?.push(exercise);
    }
  }

  /**
   * Generate exercises for a specific command
   */
  generateForCommand(commandName: string): CommandExercise[] {
    const def = this.registry.getDefinition(commandName);
    if (!def) return [];

    return this.generateExercisesForDefinition(commandName);
  }

  /**
   * Generate exercises for a category with limit
   */
  generateForCategory(category: string, limit: number): CommandExercise[] {
    const commands = this.registry.getByCategory(category as CommandCategory);
    const exercises: CommandExercise[] = [];

    for (const cmd of commands) {
      if (exercises.length >= limit) break;
      const cmdExercises = this.generateExercisesForDefinition(cmd.command);
      for (const ex of cmdExercises) {
        if (exercises.length >= limit) break;
        exercises.push(ex);
      }
    }

    return exercises.slice(0, limit);
  }

  /**
   * Generate exercises by difficulty level
   */
  generateByDifficulty(
    difficulty: "beginner" | "intermediate" | "advanced",
    limit: number,
  ): CommandExercise[] {
    const exercises = this.exercisesByDifficulty.get(difficulty) || [];
    return exercises.slice(0, limit);
  }

  /**
   * Get random exercises across all commands
   */
  getRandomExercises(count: number): CommandExercise[] {
    const shuffled = [...this.allExercises].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Generate exercises from a command definition
   */
  private generateExercisesForDefinition(
    commandName: string,
  ): CommandExercise[] {
    const def = this.registry.getDefinition(commandName);
    if (!def) return [];

    const exercises: CommandExercise[] = [];

    // Generate exercises from usage patterns
    if (def.common_usage_patterns) {
      for (const pattern of def.common_usage_patterns) {
        exercises.push(this.patternToExercise(def, pattern));
      }
    }

    // Generate exercises from subcommands
    if (def.subcommands) {
      for (const sub of def.subcommands.slice(0, 3)) {
        exercises.push(
          this.subcommandToExercise(def, sub.name, sub.description),
        );
      }
    }

    return exercises;
  }

  /**
   * Convert a usage pattern to an exercise
   */
  private patternToExercise(
    def: CommandDefinition,
    pattern: UsagePattern,
  ): CommandExercise {
    return {
      id: `${def.command}-${this.hashString(pattern.command)}`,
      prompt: pattern.description,
      expectedCommand: pattern.command,
      hints: this.generateHints(def, pattern),
      difficulty: this.assessDifficulty(pattern),
      category: def.category,
      relatedCommand: def.command,
      outputExample: pattern.output_example,
    };
  }

  /**
   * Convert a subcommand to an exercise
   */
  private subcommandToExercise(
    def: CommandDefinition,
    subName: string,
    subDescription: string,
  ): CommandExercise {
    const command = `${def.command} ${subName}`;
    return {
      id: `${def.command}-sub-${subName}`,
      prompt: `Use the ${subName} subcommand: ${subDescription}`,
      expectedCommand: command,
      hints: [
        `The command starts with '${def.command}'`,
        `You need to use the '${subName}' subcommand`,
        `The full command is '${def.command} ${subName}'`,
      ],
      difficulty: "intermediate",
      category: def.category,
      relatedCommand: def.command,
    };
  }

  /**
   * Generate progressive hints for an exercise
   */
  private generateHints(
    def: CommandDefinition,
    pattern: UsagePattern,
  ): string[] {
    const hints: string[] = [];

    // Hint 1: Command name
    hints.push(`The command starts with '${def.command}'`);

    // Hint 2: Extract flags from the pattern
    const flags = pattern.command.match(/--?\w+/g) || [];
    if (flags.length > 0) {
      hints.push(`You'll need to use the ${flags[0]} flag`);
    }

    // Hint 3: More specific hint if multiple flags
    if (flags.length > 1) {
      hints.push(
        `This command uses ${flags.length} flags: ${flags.join(", ")}`,
      );
    }

    // Hint 4: The full command (last resort)
    hints.push(`The full command is: ${pattern.command}`);

    return hints;
  }

  /**
   * Assess difficulty based on command complexity
   */
  private assessDifficulty(
    pattern: UsagePattern,
  ): "beginner" | "intermediate" | "advanced" {
    const cmd = pattern.command;

    // Advanced indicators
    if (pattern.requires_root) return "advanced";
    if (cmd.includes("|")) return "advanced";
    if (cmd.split(" ").length > 5) return "advanced";

    // Count flags
    const flags = cmd.match(/--?\w+/g) || [];

    // Intermediate indicators
    if (flags.length >= 2) return "intermediate";
    if (cmd.split(" ").length > 3) return "intermediate";

    // Default to beginner
    return "beginner";
  }

  /**
   * Generate a short hash for unique IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }
}
