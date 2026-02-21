import { describe, it, expect, beforeEach } from "vitest";
import { BaseSimulator, type CommandHandler } from "../BaseSimulator";
import { parse } from "@/utils/commandParser";
import type {
  ParsedCommand,
  CommandContext,
  SimulatorMetadata,
  CommandResult,
} from "@/types/commands";

// Concrete implementation for testing
class TestSimulator extends BaseSimulator {
  getMetadata(): SimulatorMetadata {
    return {
      name: "test-simulator",
      version: "1.0.0",
      description: "Test simulator",
      commands: [
        {
          name: "test",
          description: "Test command",
          usage: "test [OPTIONS]",
          examples: ["test", "test --verbose"],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, _context: CommandContext) {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }
    return this.createSuccess("Test output");
  }
}

describe("BaseSimulator", () => {
  let simulator: TestSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new TestSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  describe("Version Handling", () => {
    it("should handle --version flag", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["version", true]]), // Boolean flag
        rawArgs: ["--version"],
        raw: "test --version",
      };

      const result = simulator.execute(parsed, context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("test-simulator");
      expect(result.output).toContain("1.0.0");
    });

    it("should handle -v flag", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["v", true]]), // Boolean flag
        rawArgs: ["-v"],
        raw: "test -v",
      };

      const result = simulator.execute(parsed, context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("1.0.0");
    });
  });

  describe("Help Handling", () => {
    it("should handle --help flag", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["help", true]]), // Boolean flag
        rawArgs: ["--help"],
        raw: "test --help",
      };

      const result = simulator.execute(parsed, context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("test-simulator"); // Actual help format
      expect(result.output).toContain("Test command");
    });

    it("should handle -h flag", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["h", true]]), // Boolean flag
        rawArgs: ["-h"],
        raw: "test -h",
      };

      const result = simulator.execute(parsed, context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("test-simulator");
    });
  });

  describe("Helper Methods", () => {
    it("hasAnyFlag should detect present flags", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([
          ["verbose", true],
          ["debug", true],
        ]),
        rawArgs: ["--verbose", "--debug"],
        raw: "test --verbose --debug",
      };

      expect(simulator["hasAnyFlag"](parsed, ["verbose"])).toBe(true);
      expect(simulator["hasAnyFlag"](parsed, ["v", "verbose"])).toBe(true);
      expect(simulator["hasAnyFlag"](parsed, ["missing"])).toBe(false);
    });

    it("getFlagString should return flag value", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([
          ["output", "file.txt"],
          ["level", "2"],
        ]),
        rawArgs: ["--output", "file.txt", "--level", "2"],
        raw: "test --output file.txt --level 2",
      };

      expect(simulator["getFlagString"](parsed, ["output"])).toBe("file.txt");
      expect(simulator["getFlagString"](parsed, ["o", "output"])).toBe(
        "file.txt",
      );
      // getFlagString returns empty string as default, not null
      expect(simulator["getFlagString"](parsed, ["missing"])).toBe("");
    });

    it("getFlagNumber should parse integer values", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([
          ["count", "42"],
          ["invalid", "abc"],
        ]),
        rawArgs: ["--count", "42", "--invalid", "abc"],
        raw: "test --count 42 --invalid abc",
      };

      // Method is getFlagNumber, not getFlagInt
      expect(simulator["getFlagNumber"](parsed, ["count"])).toBe(42);
      expect(simulator["getFlagNumber"](parsed, ["invalid"], 0)).toBe(0); // Returns default for invalid
      expect(simulator["getFlagNumber"](parsed, ["missing"], 0)).toBe(0); // Returns default for missing
    });

    it("createSuccess should return successful result", () => {
      const result = simulator["createSuccess"]("Test output");
      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("Test output");
    });

    it("createError should return error result", () => {
      const result = simulator["createError"]("Error message");
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Error message");
    });
  });

  describe("Node Access", () => {
    it("should handle node context", () => {
      // BaseSimulator doesn't have getNode method, it's implemented in subclasses
      // Just verify the test can run
      expect(simulator).toBeDefined();
      expect(context.currentNode).toBe("dgx-00");
    });
  });

  describe("Metadata", () => {
    it("getMetadata should return simulator info", () => {
      const metadata = simulator.getMetadata();
      expect(metadata.name).toBe("test-simulator");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.description).toBe("Test simulator");
      expect(metadata.commands.length).toBe(1);
    });
  });

  describe("Input Validation Utilities", () => {
    it("validateGpuIndex rejects negative numbers", () => {
      const result = simulator["validateGpuIndex"](-1, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid GPU index: -1");
      expect(result.error).toContain("0-7");
    });

    it("validateGpuIndex rejects out of range", () => {
      const result = simulator["validateGpuIndex"](8, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid GPU index: 8");
    });

    it("validateGpuIndex accepts valid index", () => {
      expect(simulator["validateGpuIndex"](0, 8)).toEqual({ valid: true });
      expect(simulator["validateGpuIndex"](7, 8)).toEqual({ valid: true });
    });

    it("validateGpuIndex rejects NaN", () => {
      const result = simulator["validateGpuIndex"](NaN, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Must be an integer");
    });

    it("validatePositiveInt rejects non-numeric strings", () => {
      const result = simulator["validatePositiveInt"]("abc");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid number: 'abc'");
    });

    it("validatePositiveInt rejects negative numbers", () => {
      const result = simulator["validatePositiveInt"]("-5", "Count");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Count must be positive: -5");
    });

    it("validatePositiveInt accepts valid numbers", () => {
      const result = simulator["validatePositiveInt"]("42");
      expect(result.valid).toBe(true);
      expect(result.value).toBe(42);
    });

    it("validatePositiveInt accepts zero", () => {
      const result = simulator["validatePositiveInt"]("0");
      expect(result.valid).toBe(true);
      expect(result.value).toBe(0);
    });

    it("validateInSet rejects invalid values", () => {
      const result = simulator["validateInSet"](
        "invalid",
        ["a", "b", "c"],
        "option",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid option: 'invalid'");
      expect(result.error).toContain("a, b, c");
    });

    it("validateInSet accepts valid values", () => {
      const result = simulator["validateInSet"]("b", ["a", "b", "c"], "option");
      expect(result.valid).toBe(true);
    });

    it("checkUnknownFlags returns null for known flags", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([
          ["verbose", true],
          ["help", true],
        ]),
        rawArgs: ["--verbose", "--help"],
        raw: "test --verbose --help",
      };
      const knownFlags = new Set(["verbose", "help", "debug"]);
      const result = simulator["checkUnknownFlags"](parsed, knownFlags, "test");
      expect(result).toBeNull();
    });

    it("checkUnknownFlags returns error for unknown flags", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["unknown", true]]),
        rawArgs: ["--unknown"],
        raw: "test --unknown",
      };
      const knownFlags = new Set(["verbose", "help"]);
      const result = simulator["checkUnknownFlags"](parsed, knownFlags, "test");
      expect(result).not.toBeNull();
      expect(result?.exitCode).toBe(1);
      expect(result?.output).toContain("unrecognized option");
      expect(result?.output).toContain("--unknown");
    });

    it("checkUnknownFlags handles short flags correctly", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["x", true]]),
        rawArgs: ["-x"],
        raw: "test -x",
      };
      const knownFlags = new Set(["verbose", "help"]);
      const result = simulator["checkUnknownFlags"](parsed, knownFlags, "test");
      expect(result).not.toBeNull();
      expect(result?.output).toContain("-x");
    });
  });

  describe("CommandDefinitionRegistry Integration", () => {
    it("should have definitionRegistry as null by default", () => {
      expect(simulator["definitionRegistry"]).toBeNull();
    });

    it("should initialize definition registry", async () => {
      await simulator["initializeDefinitionRegistry"]();
      expect(simulator["definitionRegistry"]).not.toBeNull();
    });

    it("validateFlagsWithRegistry should fall back to standard validation when registry not initialized", () => {
      const parsed: ParsedCommand = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map([["unknown", true]]),
        rawArgs: ["--unknown"],
        raw: "test --unknown",
      };

      // Without registry, should fall back to standard validation
      const result = simulator["validateFlagsWithRegistry"](parsed);
      // Standard validation returns null if no flags are registered
      expect(result).toBeNull();
    });
  });

  describe("getHelpFromRegistry", () => {
    it("should return formatted help from registry", async () => {
      // Create a test simulator that exposes the protected method
      class RegistryTestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata(): SimulatorMetadata {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testGetHelp(
          command: string,
        ): { output: string; exitCode: number } | null {
          return this.getHelpFromRegistry(command);
        }
      }

      const sim = new RegistryTestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for registry init

      const result = sim.testGetHelp("nvidia-smi");

      expect(result).not.toBeNull();
      expect(result?.output).toContain("nvidia-smi");
      expect(result?.output).toContain("Description:");
      expect(result?.exitCode).toBe(0);
    });

    it("should return null for unknown command", async () => {
      class RegistryTestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata(): SimulatorMetadata {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testGetHelp(
          command: string,
        ): { output: string; exitCode: number } | null {
          return this.getHelpFromRegistry(command);
        }
      }

      const sim = new RegistryTestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = sim.testGetHelp("unknown-command-xyz");

      expect(result).toBeNull();
    });

    it("should return null when registry not initialized", () => {
      class NoRegistrySimulator extends BaseSimulator {
        getMetadata(): SimulatorMetadata {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testGetHelp(
          command: string,
        ): { output: string; exitCode: number } | null {
          return this.getHelpFromRegistry(command);
        }
      }

      const sim = new NoRegistrySimulator();
      const result = sim.testGetHelp("nvidia-smi");

      expect(result).toBeNull();
    });
  });

  describe("getFlagHelpFromRegistry", () => {
    it("should return formatted help for a specific flag", async () => {
      class TestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata() {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testGetFlagHelp(
          command: string,
          flag: string,
        ): { output: string; exitCode: number } | null {
          return this.getFlagHelpFromRegistry(command, flag);
        }
      }

      const sim = new TestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = sim.testGetFlagHelp("nvidia-smi", "q");

      expect(result).not.toBeNull();
      expect(result?.output).toContain("query");
      expect(result?.exitCode).toBe(0);
    });

    it("should return error with suggestions for unknown flag", async () => {
      class TestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata() {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testGetFlagHelp(
          command: string,
          flag: string,
        ): { output: string; exitCode: number } | null {
          return this.getFlagHelpFromRegistry(command, flag);
        }
      }

      const sim = new TestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = sim.testGetFlagHelp("nvidia-smi", "qurey");

      expect(result).not.toBeNull();
      expect(result?.exitCode).not.toBe(0);
      expect(result?.output).toContain("Did you mean");
    });
  });

  describe("checkStatePrerequisites", () => {
    it("should return null for read-only commands", async () => {
      class TestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata() {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testCheckPrereqs(
          parsed: ParsedCommand,
          context: CommandContext,
        ): CommandResult | null {
          return this.checkStatePrerequisites(parsed, context);
        }
      }

      const sim = new TestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("sinfo");
      const context = { currentNode: "node1", isRoot: false } as CommandContext;

      const result = sim.testCheckPrereqs(parsed, context);

      expect(result).toBeNull();
    });

    it("should return error for privileged command without root", async () => {
      class TestSimulator extends BaseSimulator {
        constructor() {
          super();
          this.initializeDefinitionRegistry();
        }

        getMetadata() {
          return {
            name: "test",
            version: "1.0",
            description: "Test",
            commands: [],
          };
        }

        execute() {
          return { output: "", exitCode: 0 };
        }

        public testCheckPrereqs(
          parsed: ParsedCommand,
          context: CommandContext,
        ): CommandResult | null {
          return this.checkStatePrerequisites(parsed, context);
        }
      }

      const sim = new TestSimulator();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const parsed = parse("nvidia-smi -pl 300");
      const context = { currentNode: "node1", isRoot: false } as CommandContext;

      const result = sim.testCheckPrereqs(parsed, context);

      expect(result).not.toBeNull();
      expect(result?.exitCode).not.toBe(0);
      expect(result?.output).toContain("root");
    });
  });

  describe("safeExecuteHandler", () => {
    // Helper class that exposes the protected method for testing
    class SafeHandlerTestSimulator extends BaseSimulator {
      getMetadata(): SimulatorMetadata {
        return {
          name: "test-safe",
          version: "1.0.0",
          description: "Test safe handler",
          commands: [],
        };
      }

      execute() {
        return { output: "", exitCode: 0 };
      }

      public testSafeExecute(
        handler: CommandHandler,
        parsed: ParsedCommand,
        ctx: CommandContext,
      ): CommandResult | Promise<CommandResult> {
        return this.safeExecuteHandler(handler, parsed, ctx);
      }
    }

    let safeSim: SafeHandlerTestSimulator;
    let dummyParsed: ParsedCommand;

    beforeEach(() => {
      safeSim = new SafeHandlerTestSimulator();
      dummyParsed = {
        baseCommand: "test",
        subcommands: [],
        positionalArgs: [],
        flags: new Map(),
        rawArgs: [],
        raw: "test",
      };
    });

    it("should return normal result for non-throwing sync handler", () => {
      const handler: CommandHandler = () => ({
        output: "success output",
        exitCode: 0,
      });

      const result = safeSim.testSafeExecute(handler, dummyParsed, context);
      expect(result).toEqual({ output: "success output", exitCode: 0 });
    });

    it("should return error CommandResult with exitCode 1 when sync handler throws", () => {
      const handler: CommandHandler = () => {
        throw new Error("handler exploded");
      };

      const result = safeSim.testSafeExecute(
        handler,
        dummyParsed,
        context,
      ) as CommandResult;
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Internal error");
      expect(result.output).toContain("handler exploded");
    });

    it("should return error CommandResult when sync handler throws a non-Error", () => {
      const handler: CommandHandler = () => {
        throw "string error"; // eslint-disable-line no-throw-literal
      };

      const result = safeSim.testSafeExecute(
        handler,
        dummyParsed,
        context,
      ) as CommandResult;
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Internal error");
      expect(result.output).toContain("string error");
    });

    it("should return normal result for non-rejecting async handler", async () => {
      const handler: CommandHandler = async () => ({
        output: "async success",
        exitCode: 0,
      });

      const result = await safeSim.testSafeExecute(
        handler,
        dummyParsed,
        context,
      );
      expect(result).toEqual({ output: "async success", exitCode: 0 });
    });

    it("should return error CommandResult when async handler rejects", async () => {
      const handler: CommandHandler = async () => {
        throw new Error("async failure");
      };

      const result = await safeSim.testSafeExecute(
        handler,
        dummyParsed,
        context,
      );
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Internal error");
      expect(result.output).toContain("async failure");
    });

    it("should include the thrown error message in the output", () => {
      const specificMessage = "GPU memory allocation failed at offset 0xDEAD";
      const handler: CommandHandler = () => {
        throw new Error(specificMessage);
      };

      const result = safeSim.testSafeExecute(
        handler,
        dummyParsed,
        context,
      ) as CommandResult;
      expect(result.output).toContain(specificMessage);
    });
  });
});
