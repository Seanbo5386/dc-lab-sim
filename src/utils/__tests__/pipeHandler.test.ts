import { describe, it, expect } from "vitest";
import {
  applyPipeFilters,
  hasPipes,
  parsePipeChain,
  validatePipeChain,
} from "../pipeHandler";

describe("pipeHandler", () => {
  describe("parsePipeChain", () => {
    it("splits a chain into stages, trimming whitespace", () => {
      expect(parsePipeChain("nvidia-smi | grep GPU | wc -l")).toEqual([
        "nvidia-smi",
        "grep GPU",
        "wc -l",
      ]);
    });

    it("preserves pipes inside quotes", () => {
      expect(parsePipeChain("echo 'a | b' | grep a")).toEqual([
        "echo 'a | b'",
        "grep a",
      ]);
    });
  });

  describe("hasPipes", () => {
    it("is true for a piped command", () => {
      expect(hasPipes("nvidia-smi | grep GPU")).toBe(true);
    });

    it("is false for a plain command", () => {
      expect(hasPipes("nvidia-smi")).toBe(false);
    });
  });

  describe("validatePipeChain (F2/F3)", () => {
    it("returns null for a command with no pipes", () => {
      expect(validatePipeChain("nvidia-smi -i 0")).toBeNull();
    });

    it("returns null for a valid pipe chain", () => {
      expect(validatePipeChain("nvidia-smi | grep GPU | wc -l")).toBeNull();
    });

    it("flags an unknown pipe-stage command as command not found (F2)", () => {
      expect(validatePipeChain("nvidia-smi | nonexistentcmd")).toBe(
        "bash: nonexistentcmd: command not found",
      );
    });

    it("flags an empty pipe segment as a syntax error (F3)", () => {
      expect(validatePipeChain("nvidia-smi | | grep x")).toBe(
        "bash: syntax error near unexpected token '|'",
      );
    });

    it("flags a trailing empty segment as a syntax error", () => {
      expect(validatePipeChain("nvidia-smi |")).toBe(
        "bash: syntax error near unexpected token '|'",
      );
    });

    it("reports the syntax error before an unknown command", () => {
      // empty segment takes precedence over the unknown-command check
      expect(validatePipeChain("nvidia-smi | | nope")).toBe(
        "bash: syntax error near unexpected token '|'",
      );
    });

    it("does not treat quoted pipes as stage separators", () => {
      expect(validatePipeChain("echo 'a | b'")).toBeNull();
    });
  });

  describe("applyPipeFilters still works for valid chains", () => {
    it("greps then counts lines", () => {
      const output = "alpha GPU\nbeta\ngamma GPU";
      const result = applyPipeFilters(output, "cmd | grep GPU | wc -l");
      expect(result.trim()).toBe("2");
    });
  });
});
