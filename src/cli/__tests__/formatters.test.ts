// src/cli/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest";
import {
  ANSI,
  formatCommandHelp,
  formatCommandList,
  formatErrorMessage,
  formatExitCode,
  formatFlagHelp,
  formatValidationError,
} from "../formatters";

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

describe("formatCommandList", () => {
  it("should format an overview grouped by category", () => {
    const defs = [
      {
        command: "alpha",
        category: "general" as const,
        description: "Alpha command",
        synopsis: "alpha",
      },
      {
        command: "beta",
        category: "gpu_management" as const,
        description: "Beta command",
        synopsis: "beta",
      },
    ];

    const output = formatCommandList(defs);

    expect(output).toContain("COMMAND REFERENCE");
    expect(output).toContain("GENERAL");
    expect(output).toContain("GPU MANAGEMENT");
    expect(output).toContain("alpha");
    expect(output).toContain("beta");
  });
});

describe("formatCommandHelp with options", () => {
  it("should format global_options", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "A test command",
      synopsis: "test-cmd [OPTIONS]",
      global_options: [
        {
          short: "h",
          long: "help",
          description: "Show help message",
        },
        {
          short: "v",
          long: "verbose",
          description: "Enable verbose output",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Options:");
    expect(output).toContain("-h, --help");
    expect(output).toContain("Show help message");
    expect(output).toContain("-v, --verbose");
  });

  it("should truncate long descriptions at 60 chars", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      global_options: [
        {
          long: "option",
          description:
            "This is a very long description that should be truncated because it exceeds the maximum allowed width for option descriptions",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("...");
    expect(output).not.toContain("exceeds the maximum");
  });

  it("should show count when options exceed limit", () => {
    const options = Array.from({ length: 15 }, (_, i) => ({
      long: `option${i}`,
      description: `Option ${i}`,
    }));

    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      global_options: options,
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("... and 5 more options");
  });
});

describe("formatCommandHelp with subcommands", () => {
  it("should format subcommands", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd <subcommand>",
      subcommands: [
        { name: "start", description: "Start the service" },
        { name: "stop", description: "Stop the service" },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Subcommands:");
    expect(output).toContain("start");
    expect(output).toContain("Start the service");
  });
});

describe("formatCommandHelp with examples", () => {
  it("should format common_usage_patterns", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      common_usage_patterns: [
        {
          description: "Run with defaults",
          command: "test-cmd",
          requires_root: false,
        },
        {
          description: "Run as admin",
          command: "sudo test-cmd --admin",
          requires_root: true,
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Examples:");
    expect(output).toContain("test-cmd");
    expect(output).toContain("Run with defaults");
    expect(output).toContain("⚠ Requires root privileges");
  });
});

describe("formatCommandHelp with exit codes", () => {
  it("should format exit_codes", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      exit_codes: [
        { code: 0, meaning: "Success" },
        { code: 1, meaning: "General error" },
        { code: 2, meaning: "Invalid arguments" },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Exit Codes:");
    expect(output).toContain("0");
    expect(output).toContain("Success");
    expect(output).toContain("2");
  });
});

describe("formatCommandHelp with error messages", () => {
  it("should format error_messages with resolutions", () => {
    const def = {
      command: "test-cmd",
      category: "general" as const,
      description: "Test",
      synopsis: "test-cmd",
      error_messages: [
        {
          message: "Connection refused",
          meaning: "Cannot connect to server",
          resolution: "Check if server is running",
        },
      ],
    };

    const output = formatCommandHelp(def);

    expect(output).toContain("Common Errors:");
    expect(output).toContain("Connection refused");
    expect(output).toContain("Cannot connect to server");
    expect(output).toContain("Fix:");
  });
});

describe("formatErrorMessage", () => {
  it("should format a single error with resolution", () => {
    const error = {
      message: "File not found",
      meaning: "The specified file does not exist",
      resolution: "Check the file path and try again",
    };

    const output = formatErrorMessage(error);

    expect(output).toContain("File not found");
    expect(output).toContain("The specified file does not exist");
    expect(output).toContain("Check the file path");
  });
});

describe("formatExitCode", () => {
  it("should format an exit code with meaning", () => {
    const exitCode = { code: 13, meaning: "Permission denied" };

    const output = formatExitCode(exitCode);

    expect(output).toContain("13");
    expect(output).toContain("Permission denied");
  });
});

describe("formatFlagHelp", () => {
  it("should format a flag with all details", () => {
    const opt = {
      short: "i",
      long: "index",
      description: "Specify GPU index",
      arguments: "INDEX",
      argument_type: "integer",
      default: "0",
      example: "nvidia-smi -i 0",
    };

    const output = formatFlagHelp("nvidia-smi", opt);

    expect(output).toContain("-i, --index");
    expect(output).toContain("Specify GPU index");
    expect(output).toContain("Arguments:");
    expect(output).toContain("INDEX");
    expect(output).toContain("integer");
    expect(output).toContain("Default:");
    expect(output).toContain("Example:");
  });

  it("should handle flag with only long form", () => {
    const opt = {
      long: "verbose",
      description: "Enable verbose mode",
    };

    const output = formatFlagHelp("test", opt);

    expect(output).toContain("--verbose");
    expect(output).not.toContain("-,");
  });
});

describe("formatValidationError", () => {
  it("should format unknown flag with suggestions", () => {
    const result = {
      valid: false,
      suggestions: ["query", "quiet"],
    };

    const output = formatValidationError("nvidia-smi", "qurey", result);

    expect(output).toContain("nvidia-smi");
    expect(output).toContain("qurey");
    expect(output).toContain("Did you mean");
    expect(output).toContain("query");
  });

  it("should format unknown flag without suggestions", () => {
    const result = {
      valid: false,
      suggestions: [],
    };

    const output = formatValidationError("test", "xyz", result);

    expect(output).toContain("unrecognized option");
    expect(output).toContain("xyz");
    expect(output).not.toContain("Did you mean");
  });
});
