// src/cli/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest";
import { ANSI, formatCommandHelp } from "../formatters";

describe("Formatter Constants", () => {
  it("should export ANSI color codes", () => {
    expect(ANSI.RESET).toBe("\x1b[0m");
    expect(ANSI.BOLD).toBe("\x1b[1m");
    expect(ANSI.RED).toBe("\x1b[31m");
    expect(ANSI.CYAN).toBe("\x1b[36m");
  });
});

describe("formatCommandHelp", () => {
  it("should format a minimal command definition", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "A test command",
      synopsis: "test-cmd [OPTIONS]",
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("test-cmd");
    expect(output).toContain("A test command");
    expect(output).toContain("test-cmd [OPTIONS]");
  });
});
