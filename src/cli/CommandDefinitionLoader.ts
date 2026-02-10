import type { CommandDefinition, CommandCategory } from "./types";

// Import command definition JSON files from data/output using Vite's lazy glob import
// Excludes relationships/ (reference-only, no runtime consumers) and schema.json
const commandModules = import.meta.glob(
  [
    "../data/output/**/*.json",
    "!../data/output/relationships/**",
    "!../data/output/schema.json",
  ],
  { eager: false },
);

/**
 * Loads command definitions from JSON files in src/data/output/
 *
 * This loader uses Vite's lazy glob import to dynamically load JSON files
 * on demand, reducing the initial bundle size.
 */
export class CommandDefinitionLoader {
  private definitions: Map<string, CommandDefinition> = new Map();
  private loaded = false;

  /**
   * Load a single command definition by name
   */
  async load(commandName: string): Promise<CommandDefinition | undefined> {
    if (!this.loaded) {
      await this.loadAll();
    }
    return this.definitions.get(commandName);
  }

  /**
   * Load all command definitions from JSON files
   */
  async loadAll(): Promise<Map<string, CommandDefinition>> {
    if (this.loaded) {
      return this.definitions;
    }

    const entries = Object.entries(commandModules);
    const results = await Promise.all(
      entries
        .filter(
          ([path]) =>
            !path.includes("schema.json") &&
            !path.includes("state_domains.json"),
        )
        .map(async ([, importFn]) => {
          const module = await (
            importFn as () => Promise<{ default?: CommandDefinition }>
          )();
          return (
            (module as { default?: CommandDefinition }).default ||
            (module as unknown as CommandDefinition)
          );
        }),
    );

    for (const def of results) {
      if (def && typeof def === "object" && "command" in def) {
        this.definitions.set(def.command, def);
      }
    }

    this.loaded = true;
    return this.definitions;
  }

  /**
   * Get all commands in a specific category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.category === category,
    );
  }

  /**
   * Get all loaded command definitions
   */
  getDefinitions(): CommandDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get all loaded command names
   */
  getCommandNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Check if a command definition exists
   */
  has(commandName: string): boolean {
    return this.definitions.has(commandName);
  }

  /**
   * Get count of loaded definitions
   */
  get count(): number {
    return this.definitions.size;
  }
}

// Singleton instance
let loaderInstance: CommandDefinitionLoader | null = null;

export function getCommandDefinitionLoader(): CommandDefinitionLoader {
  if (!loaderInstance) {
    loaderInstance = new CommandDefinitionLoader();
  }
  return loaderInstance;
}
