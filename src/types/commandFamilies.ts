// Command Families types and interfaces for the learning system
// These types define the structure of command family data used in the learning paths

/**
 * Permission level required to run the tool
 */
export type ToolPermission = "user" | "root";

/**
 * Individual tool within a command family
 */
export interface Tool {
  /** Tool name (command name) */
  name: string;
  /** Short 2-3 word description */
  tagline: string;
  /** What the tool shows/does */
  description: string;
  /** When to use this tool */
  bestFor: string;
  /** Common usage example */
  exampleCommand: string;
  /** Permission level required */
  permissions: ToolPermission;
  /** Related tools for cross-reference */
  relatedTools?: string[];
}

/**
 * Command family grouping related tools
 */
export interface CommandFamily {
  /** Unique identifier for the family */
  id: string;
  /** Display name for the family */
  name: string;
  /** Emoji icon for visual identification */
  icon: string;
  /** Description of what this family covers */
  description: string;
  /** Decision heuristic for choosing between tools in this family */
  quickRule: string;
  /** Tools belonging to this family */
  tools: Tool[];
}

/**
 * Root structure of the commandFamilies.json file
 */
export interface CommandFamiliesData {
  families: CommandFamily[];
}

/**
 * Valid command family IDs
 */
export type CommandFamilyId =
  | "gpu-monitoring"
  | "infiniband-tools"
  | "bmc-hardware"
  | "cluster-tools"
  | "container-tools"
  | "diagnostics";
