// src/cli/__tests__/helpCommand.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { generateHelpOutput } from "../helpCommand";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";
import type { CommandMetadata } from "../../utils/commandMetadata";

describe("helpCommand", () => {
  let registry: CommandDefinitionRegistry;

  beforeAll(async () => {
    registry = new CommandDefinitionRegistry();
    await registry.initialize();
  });

  it("should show help for nvidia-smi with rich details", async () => {
    const output = await generateHelpOutput("nvidia-smi", registry);

    expect(output).toContain("nvidia-smi");
    expect(output).toContain("NVIDIA");
    expect(output).toContain("Examples:");
  });

  it("should show help for nvidia-smi -q flag", async () => {
    const output = await generateHelpOutput("nvidia-smi -q", registry);

    expect(output).toContain("-q");
    expect(output).toContain("query");
  });

  it("should show help for squeue with Slurm details", async () => {
    const output = await generateHelpOutput("squeue", registry);

    expect(output).toContain("squeue");
    expect(output).toContain("Slurm");
  });

  it("should show error messages section when available", async () => {
    const output = await generateHelpOutput("nvidia-smi", registry, {
      includeErrors: true,
    });

    expect(output).toContain("Common Errors:");
  });

  it("should handle unknown commands gracefully", async () => {
    const output = await generateHelpOutput("nonexistent", registry);

    expect(output).toContain("not found");
  });

  it("should show subcommands when available", async () => {
    const output = await generateHelpOutput("nvidia-smi", registry);

    expect(output).toContain("Subcommands:");
    expect(output).toContain("topo"); // First subcommand shown
  });

  it("should show related commands when available", async () => {
    const output = await generateHelpOutput("nvidia-smi", registry);

    expect(output).toContain("Related Commands:");
  });

  describe("learning aids integration", () => {
    const mockLearningMetadata: CommandMetadata = {
      name: "nvidia-smi",
      category: "gpu-management",
      shortDescription: "NVIDIA GPU monitoring tool",
      longDescription: "Full GPU management interface",
      syntax: "nvidia-smi [options]",
      examples: [{ command: "nvidia-smi", description: "Show GPU status" }],
      whenToUse:
        "First tool to run when investigating GPU issues or monitoring utilization",
      commonMistakes: [
        "Not using -l for continuous monitoring",
        "Forgetting to check persistence mode",
      ],
      difficulty: "beginner",
      domains: ["domain1", "domain5"],
    };

    it("should include Learning Aids section when metadata provided", async () => {
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        mockLearningMetadata,
      );

      expect(output).toContain("Learning Aids");
      expect(output).toContain("When to Use:");
      expect(output).toContain(
        "First tool to run when investigating GPU issues",
      );
    });

    it("should show common mistakes with markers", async () => {
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        mockLearningMetadata,
      );

      expect(output).toContain("Common Mistakes:");
      expect(output).toContain("Not using -l for continuous monitoring");
      expect(output).toContain("Forgetting to check persistence mode");
    });

    it("should show difficulty level", async () => {
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        mockLearningMetadata,
      );

      expect(output).toContain("Difficulty:");
      expect(output).toContain("Beginner");
    });

    it("should show exam domains", async () => {
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        { cols: 120 },
        mockLearningMetadata,
      );

      expect(output).toContain("Exam Domains:");
      expect(output).toContain("Domain 1 (Systems/Server Bring-Up)");
      expect(output).toContain("Domain 5 (Troubleshooting/Optimization)");
    });

    it("should not show Learning Aids section when metadata is null", async () => {
      const output = await generateHelpOutput("nvidia-smi", registry, {}, null);

      expect(output).not.toContain("Learning Aids");
      expect(output).not.toContain("When to Use:");
    });

    it("should not show Learning Aids when metadata is undefined", async () => {
      const output = await generateHelpOutput("nvidia-smi", registry, {});

      expect(output).not.toContain("Learning Aids");
    });

    it("should handle metadata with empty commonMistakes", async () => {
      const metaNoMistakes: CommandMetadata = {
        ...mockLearningMetadata,
        commonMistakes: [],
      };
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        metaNoMistakes,
      );

      expect(output).toContain("Learning Aids");
      expect(output).toContain("When to Use:");
      expect(output).not.toContain("Common Mistakes:");
    });

    it("should show intermediate difficulty in yellow", async () => {
      const metaIntermediate: CommandMetadata = {
        ...mockLearningMetadata,
        difficulty: "intermediate",
      };
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        metaIntermediate,
      );

      expect(output).toContain("Intermediate");
    });

    it("should show advanced difficulty in red", async () => {
      const metaAdvanced: CommandMetadata = {
        ...mockLearningMetadata,
        difficulty: "advanced",
      };
      const output = await generateHelpOutput(
        "nvidia-smi",
        registry,
        {},
        metaAdvanced,
      );

      expect(output).toContain("Advanced");
    });
  });
});
