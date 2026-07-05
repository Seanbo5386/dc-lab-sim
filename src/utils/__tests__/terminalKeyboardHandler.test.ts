import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleKeyboardInput,
  resetHistorySearch,
  type KeyboardHandlerConfig,
} from "../terminalKeyboardHandler";
import type { Terminal as XTerm } from "@xterm/xterm";

function makeTerm(): XTerm {
  return {
    write: vi.fn(),
    writeln: vi.fn(),
    clear: vi.fn(),
  } as unknown as XTerm;
}

function makeConfig(
  overrides: Partial<KeyboardHandlerConfig> = {},
): KeyboardHandlerConfig {
  return {
    term: makeTerm(),
    commandHistory: [],
    historyIndex: -1,
    currentLine: "",
    currentNode: "dgx-00",
    onExecute: vi.fn(),
    onHistoryChange: vi.fn(),
    onLineChange: vi.fn(),
    onPrompt: vi.fn(),
    ...overrides,
  };
}

const UP = "\x1b[A";
const DOWN = "\x1b[B";
const CTRL_R = "\x12";
const ENTER = "\r";

describe("terminalKeyboardHandler history navigation", () => {
  beforeEach(() => resetHistorySearch());

  it("ArrowUp recalls the most recent command", () => {
    const config = makeConfig({
      commandHistory: ["nvidia-smi", "sinfo"],
      historyIndex: -1,
    });
    const result = handleKeyboardInput(UP, config);
    expect(result).toEqual({ currentLine: "sinfo", historyIndex: 1 });
  });

  it("ArrowUp again walks further back", () => {
    const config = makeConfig({
      commandHistory: ["nvidia-smi", "sinfo"],
      historyIndex: 1,
      currentLine: "sinfo",
    });
    const result = handleKeyboardInput(UP, config);
    expect(result).toEqual({ currentLine: "nvidia-smi", historyIndex: 0 });
  });

  it("ArrowUp with empty history is a no-op", () => {
    const result = handleKeyboardInput(UP, makeConfig());
    expect(result).toBeNull();
  });

  it("ArrowDown walks forward and clears past the newest entry", () => {
    const config = makeConfig({
      commandHistory: ["nvidia-smi", "sinfo"],
      historyIndex: 0,
      currentLine: "nvidia-smi",
    });
    const forward = handleKeyboardInput(DOWN, config);
    expect(forward).toEqual({ currentLine: "sinfo", historyIndex: 1 });
    const cleared = handleKeyboardInput(
      DOWN,
      makeConfig({
        commandHistory: ["nvidia-smi", "sinfo"],
        historyIndex: 1,
        currentLine: "sinfo",
      }),
    );
    expect(cleared).toEqual({ currentLine: "", historyIndex: -1 });
  });

  it("Enter executes the line and resets the history index", () => {
    const onExecute = vi.fn();
    const config = makeConfig({ currentLine: "ibstat", onExecute });
    const result = handleKeyboardInput(ENTER, config);
    expect(onExecute).toHaveBeenCalledWith("ibstat");
    expect(result).toEqual({ currentLine: "", historyIndex: -1 });
  });

  it("Ctrl+R search finds a match and Enter accepts it", () => {
    const config = makeConfig({
      commandHistory: ["nvidia-smi", "sinfo", "ibstat"],
    });
    expect(handleKeyboardInput(CTRL_R, config)).toBeNull(); // enter search mode
    expect(handleKeyboardInput("n", config)).toBeNull(); // query 'n' (matches sinfo first — most recent)
    expect(handleKeyboardInput("v", config)).toBeNull(); // query 'nv' → nvidia-smi
    const accepted = handleKeyboardInput(ENTER, config);
    expect(accepted?.currentLine).toBe("nvidia-smi");
    expect(accepted?.searchMode).toBe(false);
  });
});
