// src/cli/__tests__/CommandExerciseGenerator.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { CommandExerciseGenerator } from "../CommandExerciseGenerator";
import { CommandDefinitionRegistry } from "../CommandDefinitionRegistry";

describe("CommandExerciseGenerator", () => {
  let generator: CommandExerciseGenerator;

  beforeAll(async () => {
    const registry = new CommandDefinitionRegistry();
    await registry.initialize();
    generator = new CommandExerciseGenerator(registry);
  });

  describe("generateForCommand", () => {
    it("should generate exercises for nvidia-smi", () => {
      const exercises = generator.generateForCommand("nvidia-smi");

      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises[0].prompt).toBeDefined();
      expect(exercises[0].expectedCommand).toBeDefined();
      expect(exercises[0].hints).toBeDefined();
    });

    it("should generate exercises with correct structure", () => {
      const exercises = generator.generateForCommand("nvidia-smi");

      for (const exercise of exercises) {
        expect(exercise.id).toBeDefined();
        expect(exercise.prompt).toBeTruthy();
        expect(exercise.expectedCommand).toBeTruthy();
        expect(exercise.hints.length).toBeGreaterThan(0);
        expect(["beginner", "intermediate", "advanced"]).toContain(
          exercise.difficulty,
        );
        expect(exercise.category).toBe("gpu_management");
        expect(exercise.relatedCommand).toBe("nvidia-smi");
      }
    });

    it("should return empty array for unknown command", () => {
      const exercises = generator.generateForCommand("nonexistent-command");
      expect(exercises).toEqual([]);
    });
  });

  describe("generateForCategory", () => {
    it("should generate exercises by category", () => {
      const exercises = generator.generateForCategory("gpu_management", 5);

      expect(exercises.length).toBeLessThanOrEqual(5);
      expect(exercises.length).toBeGreaterThan(0);
    });

    it("should respect the limit parameter", () => {
      const exercises = generator.generateForCategory("gpu_management", 3);
      expect(exercises.length).toBeLessThanOrEqual(3);
    });
  });

  describe("generateByDifficulty", () => {
    it("should generate beginner exercises", () => {
      const exercises = generator.generateByDifficulty("beginner", 5);

      expect(exercises.length).toBeGreaterThan(0);
      for (const exercise of exercises) {
        expect(exercise.difficulty).toBe("beginner");
      }
    });

    it("should generate intermediate exercises", () => {
      const exercises = generator.generateByDifficulty("intermediate", 5);

      expect(exercises.length).toBeGreaterThan(0);
      for (const exercise of exercises) {
        expect(exercise.difficulty).toBe("intermediate");
      }
    });

    it("should generate advanced exercises", () => {
      const exercises = generator.generateByDifficulty("advanced", 5);

      expect(exercises.length).toBeGreaterThan(0);
      for (const exercise of exercises) {
        expect(exercise.difficulty).toBe("advanced");
      }
    });
  });

  describe("exercise content quality", () => {
    it("should include output examples when available", () => {
      const exercises = generator.generateForCommand("nvidia-smi");
      const withOutput = exercises.filter((e) => e.outputExample);

      // At least some exercises should have output examples
      expect(withOutput.length).toBeGreaterThan(0);
    });

    it("should generate meaningful hints", () => {
      const exercises = generator.generateForCommand("nvidia-smi");

      for (const exercise of exercises) {
        expect(exercise.hints.length).toBeGreaterThan(0);
        // First hint should mention the command
        expect(exercise.hints[0].toLowerCase()).toContain("nvidia-smi");
      }
    });
  });
});
