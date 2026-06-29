/**
 * Pipe Handler Utility
 *
 * Handles Unix-style pipe operators (|) and common filter commands
 * like grep, tail, head, wc, sort, etc.
 *
 * This is applied AFTER command output is generated to filter results.
 */

export interface PipeCommand {
  command: string;
  args: string[];
}

/**
 * Parse pipe chain from command line
 * @param cmdLine - Full command line string
 * @returns Array of pipe commands (first element is the main command)
 */
/**
 * Split a command line on unquoted, unescaped pipe characters. Quotes and
 * backslash escapes are honored the way the command tokenizer treats them: a
 * backslash escapes the next character EXCEPT inside single quotes, where it is
 * literal (bash semantics). Returns raw (untrimmed) segments; callers decide how
 * to treat whitespace and empty segments. Centralizing the scan here keeps the
 * escape/quote handling identical for both parsePipeChain and the raw splitter.
 */
function splitOnUnquotedPipes(cmdLine: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (const char of cmdLine) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && !inSingleQuote) {
      escaped = true;
      current += char;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (char === "|" && !inSingleQuote && !inDoubleQuote) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts;
}

export function parsePipeChain(cmdLine: string): string[] {
  const parts = splitOnUnquotedPipes(cmdLine).map((s) => s.trim());
  // Drop only a trailing empty segment (a dangling final pipe produced no
  // command); intermediate empties are preserved as before.
  if (parts.length > 0 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
}

/**
 * Check if command line contains pipes
 */
export function hasPipes(cmdLine: string): boolean {
  return parsePipeChain(cmdLine).length > 1;
}

/**
 * Pipe filters this simulator supports. A pipe stage whose command is not in
 * this set is treated as "command not found" (matching a real shell) rather
 * than silently passing the upstream output through.
 */
const KNOWN_PIPE_FILTERS = new Set([
  "grep",
  "tail",
  "head",
  "wc",
  "sort",
  "uniq",
  "cut",
  "awk",
  "cat",
]);

/**
 * Quote-aware split that PRESERVES empty segments (unlike parsePipeChain, which
 * trims them away). Used only for syntax validation so an empty pipe segment
 * (`cmd | | grep`) is detectable.
 */
function splitPipeSegmentsRaw(cmdLine: string): string[] {
  return splitOnUnquotedPipes(cmdLine).map((s) => s.trim());
}

/**
 * Validate a piped command line the way a shell would, BEFORE applying filters.
 *
 * Returns an error line to print (and a non-zero exit) when:
 * - any pipe segment is empty/whitespace (`cmd | | grep`) → syntax error
 * - any pipe stage names a command this simulator does not implement
 *   (`cmd | nonexistent`) → command not found
 *
 * Returns null when the line has no pipes or is a valid pipe chain. The base
 * command (first segment) is NOT validated here — it is handled by the command
 * router; only the downstream filter stages are checked.
 */
/**
 * Parse-time pipe validation: an empty pipe segment (`cmd | | grep`) is a
 * SYNTAX error — a real shell rejects the whole line and runs nothing. Callers
 * should check this BEFORE dispatching to side-effecting handlers so a malformed
 * pipeline cannot mutate state (GPU reset, scenario/remediation progress) and
 * only then surface the error. Returns null for no-pipe or syntactically valid
 * lines.
 */
export function validatePipeSyntax(cmdLine: string): string | null {
  const segments = splitPipeSegmentsRaw(cmdLine);
  if (segments.length <= 1) {
    return null; // no pipes
  }
  if (segments.some((segment) => segment === "")) {
    return "bash: syntax error near unexpected token '|'";
  }
  return null;
}

/**
 * Runtime pipe validation: a downstream stage that names a command this
 * simulator does not implement (`cmd | nonexistent`) is "command not found".
 * Unlike a syntax error, this is a RUNTIME failure — a real shell still runs the
 * upstream command (side effects occur) — so this is checked AFTER the handler
 * runs. Returns null when every downstream stage is a known filter.
 */
export function validatePipeStages(cmdLine: string): string | null {
  const segments = splitPipeSegmentsRaw(cmdLine);
  if (segments.length <= 1) {
    return null;
  }
  for (const segment of segments.slice(1)) {
    if (segment === "") continue; // empty segments are a syntax concern, not here
    const cmd = segment.split(/\s+/)[0];
    if (!KNOWN_PIPE_FILTERS.has(cmd)) {
      return `bash: ${cmd}: command not found`;
    }
  }
  return null;
}

/**
 * Combined pipe validation (syntax first, then unknown-stage). Retained for
 * callers that validate the whole chain at once; the Terminal uses the granular
 * validatePipeSyntax/validatePipeStages to correctly order side effects.
 */
export function validatePipeChain(cmdLine: string): string | null {
  return validatePipeSyntax(cmdLine) ?? validatePipeStages(cmdLine);
}

/**
 * Get the base command (first command before any pipes)
 */
export function getBaseCommand(cmdLine: string): string {
  return parsePipeChain(cmdLine)[0];
}

/**
 * Apply grep filter to output
 * Supports: -i (case insensitive), -v (invert), -E (extended regex)
 */
function applyGrep(output: string, args: string[]): string {
  if (!output) return "";

  let caseInsensitive = false;
  let invertMatch = false;
  let extendedRegex = false;
  let pattern = "";

  // Parse grep arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-i") {
      caseInsensitive = true;
    } else if (arg === "-v") {
      invertMatch = true;
    } else if (arg === "-E") {
      extendedRegex = true;
    } else if (arg === "-iv" || arg === "-vi") {
      caseInsensitive = true;
      invertMatch = true;
    } else if (arg.startsWith("-")) {
      // Handle combined flags like -iE
      if (arg.includes("i")) caseInsensitive = true;
      if (arg.includes("v")) invertMatch = true;
      if (arg.includes("E")) extendedRegex = true;
    } else {
      // Pattern (might be quoted)
      pattern = arg.replace(/^["']|["']$/g, "");
    }
  }

  if (!pattern) return output;

  const lines = output.split("\n");
  const matchedLines: string[] = [];

  for (const line of lines) {
    let matches = false;

    try {
      if (extendedRegex) {
        const regex = new RegExp(pattern, caseInsensitive ? "i" : "");
        matches = regex.test(line);
      } else {
        // Simple substring match
        const searchIn = caseInsensitive ? line.toLowerCase() : line;
        const searchFor = caseInsensitive ? pattern.toLowerCase() : pattern;
        matches = searchIn.includes(searchFor);
      }
    } catch {
      // Invalid regex, fall back to literal match
      const searchIn = caseInsensitive ? line.toLowerCase() : line;
      const searchFor = caseInsensitive ? pattern.toLowerCase() : pattern;
      matches = searchIn.includes(searchFor);
    }

    // Apply invert if needed
    if (invertMatch ? !matches : matches) {
      matchedLines.push(line);
    }
  }

  return matchedLines.join("\n");
}

/**
 * Apply tail filter to output
 * Supports: -n (number of lines), -f is ignored (can't follow in simulation)
 */
function applyTail(output: string, args: string[]): string {
  if (!output) return "";

  let numLines = 10; // Default for tail

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-n" && args[i + 1]) {
      numLines = parseInt(args[i + 1], 10) || 10;
      i++;
    } else if (arg.startsWith("-") && !isNaN(parseInt(arg.slice(1), 10))) {
      // Handle -N format (e.g., tail -20)
      numLines = parseInt(arg.slice(1), 10);
    }
  }

  const lines = output.split("\n");
  return lines.slice(-numLines).join("\n");
}

/**
 * Apply head filter to output
 * Supports: -n (number of lines)
 */
function applyHead(output: string, args: string[]): string {
  if (!output) return "";

  let numLines = 10; // Default for head

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-n" && args[i + 1]) {
      numLines = parseInt(args[i + 1], 10) || 10;
      i++;
    } else if (arg.startsWith("-") && !isNaN(parseInt(arg.slice(1), 10))) {
      numLines = parseInt(arg.slice(1), 10);
    }
  }

  const lines = output.split("\n");
  return lines.slice(0, numLines).join("\n");
}

/**
 * Apply wc (word count) filter
 * Supports: -l (lines), -w (words), -c (bytes)
 */
function applyWc(output: string, args: string[]): string {
  if (!output) return "0";

  const showLines = args.includes("-l");
  const showWords = args.includes("-w");
  const showBytes = args.includes("-c");

  // If no flags, show all
  const showAll = !showLines && !showWords && !showBytes;

  const lineCount = output.split("\n").length;
  const wordCount = output.split(/\s+/).filter((w) => w.length > 0).length;
  const byteCount = output.length;

  const parts: string[] = [];

  if (showAll || showLines) parts.push(lineCount.toString().padStart(7));
  if (showAll || showWords) parts.push(wordCount.toString().padStart(7));
  if (showAll || showBytes) parts.push(byteCount.toString().padStart(7));

  return parts.join(" ");
}

/**
 * Apply sort filter
 * Supports: -r (reverse), -n (numeric), -u (unique)
 */
function applySort(output: string, args: string[]): string {
  if (!output) return "";

  const reverse = args.includes("-r");
  const numeric = args.includes("-n");
  const unique = args.includes("-u");

  let lines = output.split("\n");

  if (unique) {
    lines = [...new Set(lines)];
  }

  lines.sort((a, b) => {
    if (numeric) {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  if (reverse) {
    lines.reverse();
  }

  return lines.join("\n");
}

/**
 * Apply uniq filter (removes adjacent duplicates)
 * Supports: -c (count)
 */
function applyUniq(output: string, args: string[]): string {
  if (!output) return "";

  const showCount = args.includes("-c");
  const lines = output.split("\n");
  const result: string[] = [];

  let prevLine = "";
  let count = 0;

  for (const line of lines) {
    if (line === prevLine) {
      count++;
    } else {
      if (prevLine !== "" || count > 0) {
        if (showCount) {
          result.push(`${count.toString().padStart(7)} ${prevLine}`);
        } else {
          result.push(prevLine);
        }
      }
      prevLine = line;
      count = 1;
    }
  }

  // Don't forget the last line
  if (prevLine !== "" || count > 0) {
    if (showCount) {
      result.push(`${count.toString().padStart(7)} ${prevLine}`);
    } else {
      result.push(prevLine);
    }
  }

  return result.join("\n");
}

/**
 * Apply cut filter
 * Supports: -d (delimiter), -f (fields)
 */
function applyCut(output: string, args: string[]): string {
  if (!output) return "";

  let delimiter = "\t";
  let fields: number[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-d" && args[i + 1]) {
      delimiter = args[i + 1];
      i++;
    } else if (arg.startsWith("-d")) {
      delimiter = arg.slice(2);
    } else if (arg === "-f" && args[i + 1]) {
      fields = parseFieldSpec(args[i + 1]);
      i++;
    } else if (arg.startsWith("-f")) {
      fields = parseFieldSpec(arg.slice(2));
    }
  }

  if (fields.length === 0) return output;

  const lines = output.split("\n");
  return lines
    .map((line) => {
      const parts = line.split(delimiter);
      return fields.map((f) => parts[f - 1] || "").join(delimiter);
    })
    .join("\n");
}

/**
 * Parse field specification for cut (e.g., "1,2,3" or "1-3")
 */
function parseFieldSpec(spec: string): number[] {
  const fields: number[] = [];
  const parts = spec.split(",");

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = start; i <= end; i++) {
        fields.push(i);
      }
    } else {
      fields.push(parseInt(part, 10));
    }
  }

  return fields.filter((f) => !isNaN(f));
}

/**
 * Apply awk filter (basic support)
 * Supports: print $N (print field N)
 */
function applyAwk(output: string, args: string[]): string {
  if (!output) return "";

  // Reconstruct the awk script from all args. applyPipeCommand splits the pipe
  // stage on whitespace, so a quoted script like '{print $1}' arrives as
  // several tokens ("'{print", "$1}'"); rejoining them lets the print pattern
  // (which needs whitespace after "print") match instead of being torn apart.
  const script = args.join(" ");

  // Basic pattern: {print $1} or '{print $1, $2}'
  const printMatch = script.match(/print\s+(.*)/);
  if (!printMatch) return output;

  const printExpr = printMatch[1];
  const fieldRefs = printExpr.match(/\$(\d+)/g) || [];
  const fieldNums = fieldRefs.map((f) => parseInt(f.slice(1), 10));

  if (fieldNums.length === 0) return output;

  const lines = output.split("\n");
  return lines
    .map((line) => {
      // Trim first so a leading-whitespace line does not yield an empty $1
      // (real awk skips leading field separators).
      const parts = line.trim().split(/\s+/);
      return fieldNums.map((n) => parts[n - 1] || "").join(" ");
    })
    .join("\n");
}

/**
 * Apply a single pipe command to output
 */
function applyPipeCommand(output: string, pipeCmd: string): string {
  const parts = pipeCmd.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case "grep":
      return applyGrep(output, args);
    case "tail":
      return applyTail(output, args);
    case "head":
      return applyHead(output, args);
    case "wc":
      return applyWc(output, args);
    case "sort":
      return applySort(output, args);
    case "uniq":
      return applyUniq(output, args);
    case "cut":
      return applyCut(output, args);
    case "awk":
      return applyAwk(output, args);
    case "cat":
      // cat by itself just passes through
      return output;
    default:
      // Unknown pipe command - pass through unchanged
      // In a real shell this would error, but for simulation we allow it
      return output;
  }
}

/**
 * Apply all pipe commands to the output
 * @param output - Raw output from the primary command
 * @param cmdLine - Full command line (to extract pipe chain)
 * @returns Filtered output
 */
export function applyPipeFilters(output: string, cmdLine: string): string {
  const pipeChain = parsePipeChain(cmdLine);

  // First element is the main command, skip it
  const pipeCommands = pipeChain.slice(1);

  if (pipeCommands.length === 0) {
    return output;
  }

  let result = output;

  for (const pipeCmd of pipeCommands) {
    result = applyPipeCommand(result, pipeCmd);
  }

  return result;
}
