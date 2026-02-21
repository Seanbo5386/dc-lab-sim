/**
 * Command Parser Utility
 *
 * Parses command-line strings into structured ParsedCommand objects with proper
 * flag handling, subcommand extraction, and argument parsing.
 *
 * Supports:
 * - Long flags: --version, --flag=value
 * - Short flags: -i, -abc (combined)
 * - Flag values: --flag value, --flag=value, -i value
 * - Quoted arguments: "string with spaces", 'single quotes'
 * - Escape sequences: \", \\
 * - Special: -- stops flag parsing
 */

export interface ParsedCommand {
  /** Base command name (e.g., "nvidia-smi") */
  baseCommand: string;

  /** Subcommands in order (e.g., ["mig", "lgip"]) */
  subcommands: string[];

  /** Parsed flags with values (e.g., {i: "0", mig: true, help: true}) */
  flags: Map<string, string | boolean>;

  /** Positional arguments (non-flag arguments after subcommands) */
  positionalArgs: string[];

  /** Original arguments array (for backward compatibility) */
  rawArgs: string[];

  /** Original command line string */
  raw: string;
}

/**
 * Parser state machine for tokenizing command line
 */
enum ParserState {
  NORMAL,
  IN_SINGLE_QUOTE,
  IN_DOUBLE_QUOTE,
  ESCAPE,
}

/**
 * Tokenizes a command line string, handling quotes and escapes
 * @param cmdLine - Raw command line string
 * @returns Array of tokens
 */
function tokenize(cmdLine: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let state = ParserState.NORMAL;

  for (let i = 0; i < cmdLine.length; i++) {
    const char = cmdLine[i];
    const nextChar = cmdLine[i + 1];

    switch (state) {
      case ParserState.NORMAL:
        if (char === '\\' && (nextChar === '"' || nextChar === "'" || nextChar === '\\')) {
          state = ParserState.ESCAPE;
        } else if (char === '"') {
          state = ParserState.IN_DOUBLE_QUOTE;
        } else if (char === "'") {
          state = ParserState.IN_SINGLE_QUOTE;
        } else if (char === ' ' || char === '\t') {
          if (currentToken) {
            tokens.push(currentToken);
            currentToken = '';
          }
        } else {
          currentToken += char;
        }
        break;

      case ParserState.ESCAPE:
        currentToken += char;
        state = ParserState.NORMAL;
        break;

      case ParserState.IN_SINGLE_QUOTE:
        if (char === "'") {
          state = ParserState.NORMAL;
        } else {
          currentToken += char;
        }
        break;

      case ParserState.IN_DOUBLE_QUOTE:
        if (char === '\\' && nextChar === '"') {
          state = ParserState.ESCAPE;
        } else if (char === '"') {
          state = ParserState.NORMAL;
        } else {
          currentToken += char;
        }
        break;
    }
  }

  // Push final token
  if (currentToken) {
    tokens.push(currentToken);
  }

  return tokens;
}

/**
 * Checks if a token is a flag (starts with - or --)
 */
function isFlag(token: string): boolean {
  return token.startsWith('-') && token.length > 1 && token !== '--';
}

/**
 * Checks if a token is a long flag (starts with --)
 */
function isLongFlag(token: string): boolean {
  return token.startsWith('--') && token.length > 2;
}

/**
 * Checks if a token is a short flag (starts with single -)
 */
function isShortFlag(token: string): boolean {
  return token.startsWith('-') && !token.startsWith('--') && token.length > 1;
}

/**
 * Parses a long flag (--flag or --flag=value)
 * @returns [flagName, flagValue, consumedNextToken]
 */
function parseLongFlag(
  token: string,
  nextToken: string | undefined,
  stopFlagParsing: boolean,
  flagSchema?: Map<string, boolean>
): [string, string | boolean, boolean] {
  // Remove leading --
  const flagPart = token.slice(2);

  // Check for --flag=value syntax
  const equalsIndex = flagPart.indexOf('=');
  if (equalsIndex !== -1) {
    const name = flagPart.slice(0, equalsIndex);
    const value = flagPart.slice(equalsIndex + 1);
    return [name, value, false];
  }

  // Schema-aware: if flag is in schema, use schema to decide
  if (flagSchema && flagSchema.has(flagPart)) {
    if (flagSchema.get(flagPart) === false) {
      // Boolean flag: never consume next token
      return [flagPart, true, false];
    }
    if (flagSchema.get(flagPart) === true) {
      // Value flag: consume next token if available and it's not another flag
      if (nextToken !== undefined && !isFlag(nextToken)) {
        return [flagPart, nextToken, true];
      }
      return [flagPart, true, false];
    }
  }

  // Heuristic fallback: check if next token is a value (not a flag)
  if (!stopFlagParsing && nextToken !== undefined && !isFlag(nextToken)) {
    return [flagPart, nextToken, true];
  }

  // Boolean flag
  return [flagPart, true, false];
}

/**
 * Parses short flags (-i or -abc)
 * @returns Array of [flagName, flagValue, consumedNextToken]
 */
function parseShortFlags(
  token: string,
  nextToken: string | undefined,
  stopFlagParsing: boolean,
  flagSchema?: Map<string, boolean>
): Array<[string, string | boolean, boolean]> {
  // Remove leading -
  const flagChars = token.slice(1);
  const results: Array<[string, string | boolean, boolean]> = [];

  // IMPORTANT: Multi-character flags like -mig, -lgip, -cgi should be treated
  // as single flags, not combined short flags. Only single-character flags
  // after a dash should potentially be combined (like -abc = -a -b -c).
  // However, if ANY character is uppercase or the total is > 3 chars,
  // treat as a single flag with potential value.

  // If more than 1 character but looks like a word (e.g., -mig, -lgip, -cgi)
  // treat as a single flag, not combined short flags
  if (flagChars.length > 1) {
    // Schema-aware: if flag is in schema, use schema to decide
    if (flagSchema && flagSchema.has(flagChars)) {
      if (flagSchema.get(flagChars) === false) {
        // Boolean flag: never consume next token
        results.push([flagChars, true, false]);
        return results;
      }
      if (flagSchema.get(flagChars) === true) {
        // Value flag: consume next token if available and it's not another flag
        if (nextToken !== undefined && !isFlag(nextToken)) {
          results.push([flagChars, nextToken, true]);
        } else {
          results.push([flagChars, true, false]);
        }
        return results;
      }
    }

    // Heuristic fallback: check if next token could be a value
    if (!stopFlagParsing && nextToken !== undefined && !isFlag(nextToken)) {
      results.push([flagChars, nextToken, true]);
    } else {
      results.push([flagChars, true, false]);
    }
    return results;
  }

  // Single character flag
  // Schema-aware: if flag is in schema, use schema to decide
  if (flagSchema && flagSchema.has(flagChars)) {
    if (flagSchema.get(flagChars) === false) {
      // Boolean flag: never consume next token
      results.push([flagChars, true, false]);
      return results;
    }
    if (flagSchema.get(flagChars) === true) {
      // Value flag: consume next token if available and it's not another flag
      if (nextToken !== undefined && !isFlag(nextToken)) {
        results.push([flagChars, nextToken, true]);
      } else {
        results.push([flagChars, true, false]);
      }
      return results;
    }
  }

  // Heuristic fallback: single character flag with potential value
  if (flagChars.length === 1 && !stopFlagParsing && nextToken !== undefined && !isFlag(nextToken)) {
    results.push([flagChars, nextToken, true]);
    return results;
  }

  // Single character boolean flag
  results.push([flagChars, true, false]);
  return results;
}

/**
 * Main parser function - converts command line string to ParsedCommand
 * @param cmdLine - Raw command line string
 * @param flagSchema - Optional map of flag names to whether they consume a value (true) or are boolean (false).
 *                     When provided, schema entries take priority over heuristic detection.
 *                     Flags not in the schema fall back to heuristic behavior.
 * @returns Parsed command object
 */
export function parse(cmdLine: string, flagSchema?: Map<string, boolean>): ParsedCommand {
  const trimmed = cmdLine.trim();

  if (!trimmed) {
    return {
      baseCommand: '',
      subcommands: [],
      flags: new Map(),
      positionalArgs: [],
      rawArgs: [],
      raw: cmdLine,
    };
  }

  const tokens = tokenize(trimmed);

  if (tokens.length === 0) {
    return {
      baseCommand: '',
      subcommands: [],
      flags: new Map(),
      positionalArgs: [],
      rawArgs: [],
      raw: cmdLine,
    };
  }

  const baseCommand = tokens[0];
  const rawArgs = tokens.slice(1);
  const flags = new Map<string, string | boolean>();
  const subcommands: string[] = [];
  const positionalArgs: string[] = [];

  let stopFlagParsing = false;
  let parsingSubcommands = true;

  for (let i = 0; i < rawArgs.length; i++) {
    const token = rawArgs[i];
    const nextToken = rawArgs[i + 1];

    // Handle -- (stop flag parsing)
    if (token === '--') {
      stopFlagParsing = true;
      continue;
    }

    // If we've stopped flag parsing or token doesn't look like a flag, treat as positional
    if (stopFlagParsing || !isFlag(token)) {
      if (parsingSubcommands && !token.includes('=') && !token.match(/^-?\d+$/)) {
        // Treat as subcommand if we haven't seen flags yet and it's not a number
        subcommands.push(token);
      } else {
        parsingSubcommands = false;
        positionalArgs.push(token);
      }
      continue;
    }

    // Without a schema, seeing a flag ends subcommand parsing.
    // With a schema, flags and subcommands can be interleaved because
    // the schema precisely controls which flags consume the next token.
    if (!flagSchema) {
      parsingSubcommands = false;
    }

    // Parse long flag
    if (isLongFlag(token)) {
      const [name, value, consumedNext] = parseLongFlag(token, nextToken, stopFlagParsing, flagSchema);
      flags.set(name, value);
      if (consumedNext) {
        i++; // Skip next token as it was consumed
      }
    }
    // Parse short flag(s)
    else if (isShortFlag(token)) {
      const parsedFlags = parseShortFlags(token, nextToken, stopFlagParsing, flagSchema);
      for (const [name, value, consumedNext] of parsedFlags) {
        flags.set(name, value);
        if (consumedNext) {
          i++; // Skip next token
        }
      }
    }
  }

  return {
    baseCommand,
    subcommands,
    flags,
    positionalArgs,
    rawArgs,
    raw: cmdLine,
  };
}

/**
 * Helper function to check if a flag exists in parsed command
 */
export function hasFlag(parsed: ParsedCommand, ...flagNames: string[]): boolean {
  return flagNames.some(name => parsed.flags.has(name));
}

/**
 * Helper function to get flag value (returns undefined if not found)
 */
export function getFlagValue(parsed: ParsedCommand, ...flagNames: string[]): string | boolean | undefined {
  for (const name of flagNames) {
    if (parsed.flags.has(name)) {
      return parsed.flags.get(name);
    }
  }
  return undefined;
}

/**
 * Helper function to get flag value as string (returns default if not found or boolean)
 */
export function getFlagString(parsed: ParsedCommand, flagNames: string[], defaultValue = ''): string {
  const value = getFlagValue(parsed, ...flagNames);
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Converts ParsedCommand back to legacy args array format
 * For backward compatibility with old simulators
 */
export function toLegacyArgs(parsed: ParsedCommand): string[] {
  return parsed.rawArgs;
}

/**
 * Debug function to display parsed command structure
 */
export function debugParsedCommand(parsed: ParsedCommand): string {
  const parts: string[] = [
    `Base command: ${parsed.baseCommand}`,
  ];

  if (parsed.subcommands.length > 0) {
    parts.push(`Subcommands: ${parsed.subcommands.join(' → ')}`);
  }

  if (parsed.flags.size > 0) {
    const flagStrings = Array.from(parsed.flags.entries()).map(([k, v]) =>
      typeof v === 'boolean' ? `--${k}` : `--${k}=${v}`
    );
    parts.push(`Flags: ${flagStrings.join(', ')}`);
  }

  if (parsed.positionalArgs.length > 0) {
    parts.push(`Positional args: ${parsed.positionalArgs.join(', ')}`);
  }

  return parts.join('\n');
}
