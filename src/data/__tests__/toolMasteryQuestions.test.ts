import { describe, it, expect } from "vitest";
import {
  TOOL_MASTERY_QUESTIONS,
  getQuestionsForFamily,
  type MasteryCategory,
} from "../toolMasteryQuestions";
import commandFamiliesData from "../commandFamilies.json";

const VALID_FAMILY_IDS = [
  "gpu-monitoring",
  "infiniband-tools",
  "bmc-hardware",
  "cluster-tools",
  "container-tools",
  "diagnostics",
];

const VALID_CATEGORIES: MasteryCategory[] = [
  "flags-options",
  "output-interpretation",
  "troubleshooting",
  "command-syntax",
  "conceptual",
  "best-practice",
];

const VALID_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

// Build a map of familyId -> tool names from commandFamilies.json
const familyToolMap: Record<string, string[]> = {};
(
  commandFamiliesData as {
    families: Array<{ id: string; tools: Array<{ name: string }> }>;
  }
).families.forEach((f) => {
  familyToolMap[f.id] = f.tools.map((t) => t.name);
});

describe("toolMasteryQuestions", () => {
  describe("question count", () => {
    it("should have at least 60 questions total", () => {
      expect(TOOL_MASTERY_QUESTIONS.length).toBeGreaterThanOrEqual(60);
    });

    it("each family should have at least 10 questions", () => {
      VALID_FAMILY_IDS.forEach((familyId) => {
        const count = TOOL_MASTERY_QUESTIONS.filter(
          (q) => q.familyId === familyId,
        ).length;
        expect(
          count,
          `Family ${familyId} has only ${count} questions (need >= 10)`,
        ).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe("question IDs", () => {
    it("all question IDs should be unique", () => {
      const ids = TOOL_MASTERY_QUESTIONS.map((q) => q.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("all question IDs should follow tm- prefix format", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(q.id).toMatch(
          /^tm-/,
          `Question ID '${q.id}' does not start with 'tm-'`,
        );
      });
    });
  });

  describe("family IDs", () => {
    it("all questions should have valid familyId", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          VALID_FAMILY_IDS,
          `Question ${q.id} has invalid familyId '${q.familyId}'`,
        ).toContain(q.familyId);
      });
    });
  });

  describe("tools", () => {
    it("all questions should reference a tool that exists in that family", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        const validTools = familyToolMap[q.familyId] || [];
        expect(
          validTools,
          `Question ${q.id}: tool '${q.tool}' not found in family '${q.familyId}' (valid: ${validTools.join(", ")})`,
        ).toContain(q.tool);
      });
    });
  });

  describe("categories", () => {
    it("all questions should have valid category", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          VALID_CATEGORIES as string[],
          `Question ${q.id} has invalid category '${q.category}'`,
        ).toContain(q.category);
      });
    });

    it("each family should cover at least 3 different categories", () => {
      VALID_FAMILY_IDS.forEach((familyId) => {
        const categories = new Set(
          TOOL_MASTERY_QUESTIONS.filter((q) => q.familyId === familyId).map(
            (q) => q.category,
          ),
        );
        expect(
          categories.size,
          `Family ${familyId} only covers ${categories.size} categories (need >= 3)`,
        ).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe("difficulty", () => {
    it("all questions should have valid difficulty", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          VALID_DIFFICULTIES,
          `Question ${q.id} has invalid difficulty '${q.difficulty}'`,
        ).toContain(q.difficulty);
      });
    });
  });

  describe("choices and correctAnswer", () => {
    it("all questions should have exactly 4 choices", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          q.choices.length,
          `Question ${q.id} has ${q.choices.length} choices instead of 4`,
        ).toBe(4);
      });
    });

    it("all correctAnswer indices should be within choices bounds", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          q.correctAnswer,
          `Question ${q.id} correctAnswer ${q.correctAnswer} out of range`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          q.correctAnswer,
          `Question ${q.id} correctAnswer ${q.correctAnswer} out of range`,
        ).toBeLessThan(q.choices.length);
      });
    });

    it("no choices should be empty strings", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        q.choices.forEach((choice, i) => {
          expect(
            choice.trim().length,
            `Question ${q.id} choice ${i} is empty`,
          ).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("question text and explanation", () => {
    it("all questions should have non-empty questionText", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          q.questionText.trim().length,
          `Question ${q.id} has empty questionText`,
        ).toBeGreaterThan(0);
      });
    });

    it("all questions should have non-empty explanation", () => {
      TOOL_MASTERY_QUESTIONS.forEach((q) => {
        expect(
          q.explanation.trim().length,
          `Question ${q.id} has empty explanation`,
        ).toBeGreaterThan(0);
      });
    });
  });

  describe("getQuestionsForFamily", () => {
    it("should return only questions for the specified family", () => {
      const gpuQuestions = getQuestionsForFamily("gpu-monitoring");
      gpuQuestions.forEach((q) => {
        expect(q.familyId).toBe("gpu-monitoring");
      });
    });

    it("should return empty array for unknown family", () => {
      const questions = getQuestionsForFamily("nonexistent" as never);
      expect(questions).toHaveLength(0);
    });
  });
});
