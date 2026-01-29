import type { Terminal as XTerm } from 'xterm';
import {
  getCompletions,
  parseCompletionContext,
  formatCompletionsForDisplay,
  applyCompletion,
  getCompletionSuffix,
  type CompletionResult,
} from './tabCompletion';

/**
 * Configuration for keyboard input handler
 */
export interface KeyboardHandlerConfig {
  term: XTerm;
  commandHistory: string[];
  historyIndex: number;
  currentLine: string;
  currentNode: string;
  onExecute: (cmdLine: string) => void;
  onHistoryChange: (index: number) => void;
  onLineChange: (line: string) => void;
  onPrompt: () => void;
  shellMode?: 'bash' | 'nvsm' | 'cmsh';
  shellPrompt?: string;
}

/**
 * Result from keyboard input handling
 * Contains updated state that should be applied by the caller
 */
export interface KeyboardHandlerResult {
  currentLine: string;
  historyIndex: number;
  searchMode?: boolean;
  searchQuery?: string;
}

/**
 * State for history search mode (Ctrl+R)
 */
export interface HistorySearchState {
  isActive: boolean;
  query: string;
  matchIndex: number;
  matches: string[];
}

// Track history search state
let historySearchState: HistorySearchState = {
  isActive: false,
  query: '',
  matchIndex: -1,
  matches: [],
};

// Track last tab press for double-tab behavior
let lastTabTime = 0;
let lastCompletionResult: CompletionResult | null = null;

/**
 * Get the prompt string for the current shell mode
 */
function getPromptString(config: KeyboardHandlerConfig): string {
  if (config.shellMode === 'nvsm') {
    return config.shellPrompt || 'nvsm-> ';
  } else if (config.shellMode === 'cmsh') {
    return config.shellPrompt || '[root@dgx-headnode]% ';
  }
  return `\x1b[1;32mroot@${config.currentNode}\x1b[0m:\x1b[1;34m~\x1b[0m# `;
}

/**
 * Redraw the current line with prompt
 */
function redrawLine(term: XTerm, config: KeyboardHandlerConfig, line: string): void {
  term.write('\r\x1b[K'); // Clear line
  term.write(getPromptString(config));
  term.write(line);
}

/**
 * Handle tab completion
 */
function handleTabCompletion(
  term: XTerm,
  config: KeyboardHandlerConfig,
  currentLine: string
): KeyboardHandlerResult | null {
  const now = Date.now();
  const isDoubleTab = (now - lastTabTime) < 500 && lastCompletionResult !== null;
  lastTabTime = now;

  const result = getCompletions(currentLine);
  lastCompletionResult = result;

  // No completions
  if (result.completions.length === 0) {
    term.write('\x07'); // Bell
    return null;
  }

  // Single completion - apply it
  if (result.completions.length === 1) {
    const context = parseCompletionContext(currentLine);
    const completed = applyCompletion(currentLine, result.completions[0], context);
    const suffix = getCompletionSuffix(result);
    const newLine = completed + suffix;

    redrawLine(term, config, newLine);
    return {
      currentLine: newLine,
      historyIndex: config.historyIndex,
    };
  }

  // Multiple completions
  if (result.commonPrefix.length > parseCompletionContext(currentLine).currentWord.length) {
    // Partial completion possible - complete up to common prefix
    const context = parseCompletionContext(currentLine);
    const completed = applyCompletion(currentLine, result.commonPrefix, context);

    redrawLine(term, config, completed);
    return {
      currentLine: completed,
      historyIndex: config.historyIndex,
    };
  }

  // Show all completions on double-tab or if no partial completion
  if (isDoubleTab || result.commonPrefix === parseCompletionContext(currentLine).currentWord) {
    term.writeln('');
    const display = formatCompletionsForDisplay(result.completions, 80);
    term.writeln(display);
    config.onPrompt();
    term.write(currentLine);
  } else {
    term.write('\x07'); // Bell to indicate multiple options
  }

  return null;
}

/**
 * Handle Ctrl+R history search
 */
function handleHistorySearch(
  term: XTerm,
  config: KeyboardHandlerConfig,
  data: string
): KeyboardHandlerResult | null {
  const code = data.charCodeAt(0);

  // Start search mode
  if (!historySearchState.isActive) {
    historySearchState = {
      isActive: true,
      query: '',
      matchIndex: -1,
      matches: [],
    };
    term.write('\r\x1b[K(reverse-i-search)`\': ');
    return null;
  }

  // Enter - accept match and exit search
  if (code === 13) {
    const match = historySearchState.matches[historySearchState.matchIndex] || '';
    historySearchState.isActive = false;
    term.writeln('');
    config.onPrompt();
    if (match) {
      term.write(match);
    }
    return {
      currentLine: match,
      historyIndex: -1,
      searchMode: false,
    };
  }

  // Ctrl+C or Escape - cancel search
  if (code === 3 || code === 27) {
    historySearchState.isActive = false;
    term.writeln('');
    config.onPrompt();
    return {
      currentLine: config.currentLine,
      historyIndex: config.historyIndex,
      searchMode: false,
    };
  }

  // Ctrl+R again - search next match
  if (code === 18) {
    if (historySearchState.matches.length > 0) {
      historySearchState.matchIndex = Math.min(
        historySearchState.matchIndex + 1,
        historySearchState.matches.length - 1
      );
      const match = historySearchState.matches[historySearchState.matchIndex] || '';
      term.write(`\r\x1b[K(reverse-i-search)\`${historySearchState.query}': ${match}`);
    }
    return null;
  }

  // Backspace - remove last char from query
  if (code === 127) {
    if (historySearchState.query.length > 0) {
      historySearchState.query = historySearchState.query.slice(0, -1);
      updateSearchMatches(config.commandHistory);
      const match = historySearchState.matches[0] || '';
      term.write(`\r\x1b[K(reverse-i-search)\`${historySearchState.query}': ${match}`);
    }
    return null;
  }

  // Regular character - add to query
  if (code >= 32 && code < 127) {
    historySearchState.query += data;
    updateSearchMatches(config.commandHistory);
    const match = historySearchState.matches[0] || '';
    historySearchState.matchIndex = 0;
    term.write(`\r\x1b[K(reverse-i-search)\`${historySearchState.query}': ${match}`);
    return null;
  }

  return null;
}

/**
 * Update search matches based on query
 */
function updateSearchMatches(history: string[]): void {
  const query = historySearchState.query.toLowerCase();
  historySearchState.matches = history
    .filter(cmd => cmd.toLowerCase().includes(query))
    .reverse(); // Most recent first
  historySearchState.matchIndex = 0;
}

/**
 * Handle keyboard input for terminal
 *
 * This utility centralizes keyboard event handling including:
 * - Enter: Execute command
 * - Backspace: Delete character
 * - Ctrl+C: Cancel input
 * - Ctrl+L: Clear screen
 * - Ctrl+R: Reverse history search
 * - Up/Down arrows: Command history navigation
 * - Tab: Autocomplete
 * - Regular characters: Input
 *
 * @param data - Raw keyboard data from XTerm
 * @param config - Configuration including terminal state and callbacks
 * @returns Updated state (currentLine, historyIndex) or null if no state change
 */
export function handleKeyboardInput(
  data: string,
  config: KeyboardHandlerConfig
): KeyboardHandlerResult | null {
  const code = data.charCodeAt(0);
  const { term, commandHistory, historyIndex, currentLine, onExecute, onPrompt } = config;

  // If in history search mode, handle specially
  if (historySearchState.isActive) {
    return handleHistorySearch(term, config, data);
  }

  // Handle Enter
  if (code === 13) {
    term.writeln('');
    onExecute(currentLine);
    return {
      currentLine: '',
      historyIndex: -1,
    };
  }

  // Handle Backspace
  if (code === 127) {
    if (currentLine.length > 0) {
      const newLine = currentLine.slice(0, -1);
      term.write('\b \b');
      return {
        currentLine: newLine,
        historyIndex,
      };
    }
    return null;
  }

  // Handle Ctrl+C
  if (code === 3) {
    term.writeln('^C');
    onPrompt();
    return {
      currentLine: '',
      historyIndex,
    };
  }

  // Handle Ctrl+L (clear)
  if (code === 12) {
    term.clear();
    onPrompt();
    term.write(currentLine);
    return null;
  }

  // Handle Ctrl+R (reverse history search)
  if (code === 18) {
    return handleHistorySearch(term, config, data);
  }

  // Handle Ctrl+A (move to beginning - not fully implemented, just bell)
  if (code === 1) {
    term.write('\x07');
    return null;
  }

  // Handle Ctrl+E (move to end - not fully implemented, just bell)
  if (code === 5) {
    term.write('\x07');
    return null;
  }

  // Handle Ctrl+U (clear line)
  if (code === 21) {
    redrawLine(term, config, '');
    return {
      currentLine: '',
      historyIndex,
    };
  }

  // Handle Ctrl+W (delete word)
  if (code === 23) {
    const words = currentLine.trimEnd().split(/\s+/);
    words.pop();
    const newLine = words.length > 0 ? words.join(' ') + ' ' : '';
    redrawLine(term, config, newLine);
    return {
      currentLine: newLine,
      historyIndex,
    };
  }

  // Handle arrow keys
  if (data === '\x1b[A') { // Up arrow
    if (commandHistory.length > 0) {
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      const historyCmd = commandHistory[newIndex];

      redrawLine(term, config, historyCmd);

      return {
        currentLine: historyCmd,
        historyIndex: newIndex,
      };
    }
    return null;
  }

  if (data === '\x1b[B') { // Down arrow
    if (historyIndex !== -1) {
      const newIndex = historyIndex + 1;

      if (newIndex >= commandHistory.length) {
        // Reached end of history, clear line
        redrawLine(term, config, '');
        return {
          currentLine: '',
          historyIndex: -1,
        };
      } else {
        const historyCmd = commandHistory[newIndex];
        redrawLine(term, config, historyCmd);
        return {
          currentLine: historyCmd,
          historyIndex: newIndex,
        };
      }
    }
    return null;
  }

  // Handle Tab (autocomplete)
  if (code === 9) {
    return handleTabCompletion(term, config, currentLine);
  }

  // Regular character input
  if (code >= 32 && code < 127) {
    const newLine = currentLine + data;
    term.write(data);
    return {
      currentLine: newLine,
      historyIndex,
    };
  }

  return null;
}

/**
 * Reset history search state (call when terminal is reset)
 */
export function resetHistorySearch(): void {
  historySearchState = {
    isActive: false,
    query: '',
    matchIndex: -1,
    matches: [],
  };
}

/**
 * Check if currently in history search mode
 */
export function isInHistorySearchMode(): boolean {
  return historySearchState.isActive;
}
