import { describe, it, expect } from "vitest";
import quizQuestionsData from "../quizQuestions.json";
import commandFamiliesData from "../commandFamilies.json";

interface WhyNotOther {
  tool: string;
  reason: string;
}

interface QuizQuestion {
  id: string;
  familyId: string;
  scenario: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  whyNotOthers: WhyNotOther[];
  difficulty: string;
}

interface QuizQuestionsFile {
  questions: QuizQuestion[];
}

interface CommandFamiliesFile {
  families: { id: string; tools: { name: string }[] }[];
}

const VALID_FAMILY_IDS = [
  "gpu-monitoring",
  "infiniband-tools",
  "bmc-hardware",
  "cluster-tools",
  "container-tools",
  "diagnostics",
];

describe("quizQuestions.json", () => {
  const data = quizQuestionsData as QuizQuestionsFile;
  const questions = data.questions;
  const familiesData = commandFamiliesData as CommandFamiliesFile;

  describe("file structure", () => {
    it("should have a questions array", () => {
      expect(data).toHaveProperty("questions");
      expect(Array.isArray(questions)).toBe(true);
    });

    it("should have at least 60 questions (10 per family x 6 families)", () => {
      expect(questions.length).toBeGreaterThanOrEqual(60);
    });
  });

  describe("question structure", () => {
    it("each question should have required properties: id, familyId, scenario, choices, correctAnswer, explanation, whyNotOthers", () => {
      questions.forEach((q) => {
        expect(q).toHaveProperty("id");
        expect(q).toHaveProperty("familyId");
        expect(q).toHaveProperty("scenario");
        expect(q).toHaveProperty("choices");
        expect(q).toHaveProperty("correctAnswer");
        expect(q).toHaveProperty("explanation");
        expect(q).toHaveProperty("whyNotOthers");
      });
    });
  });

  describe("familyId validation", () => {
    it("all familyIds should reference valid command families", () => {
      questions.forEach((q) => {
        expect(VALID_FAMILY_IDS).toContain(q.familyId);
      });
    });
  });

  describe("correctAnswer validation", () => {
    it("correctAnswer should be present in the choices array", () => {
      questions.forEach((q) => {
        expect(q.choices).toContain(q.correctAnswer);
      });
    });
  });

  describe("whyNotOthers coverage", () => {
    it("whyNotOthers should cover all non-correct choices", () => {
      questions.forEach((q) => {
        const nonCorrectChoices = q.choices.filter(
          (c) => c !== q.correctAnswer,
        );
        const coveredTools = q.whyNotOthers.map((w) => w.tool);
        nonCorrectChoices.forEach((choice) => {
          expect(coveredTools).toContain(choice);
        });
      });
    });

    it("whyNotOthers entries should have non-empty reasons", () => {
      questions.forEach((q) => {
        q.whyNotOthers.forEach((w) => {
          expect(typeof w.reason).toBe("string");
          expect(w.reason.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("family coverage", () => {
    it("each family should have at least 10 quiz questions", () => {
      const questionsByFamily: Record<string, number> = {};
      questions.forEach((q) => {
        questionsByFamily[q.familyId] =
          (questionsByFamily[q.familyId] || 0) + 1;
      });

      VALID_FAMILY_IDS.forEach((familyId) => {
        expect(questionsByFamily[familyId]).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe("no duplicate question IDs", () => {
    it("should have unique question IDs", () => {
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("scenario content", () => {
    it("scenarios should be non-empty strings", () => {
      questions.forEach((q) => {
        expect(typeof q.scenario).toBe("string");
        expect(q.scenario.length).toBeGreaterThan(0);
      });
    });
  });

  describe("explanation content", () => {
    it("explanations should be non-empty strings", () => {
      questions.forEach((q) => {
        expect(typeof q.explanation).toBe("string");
        expect(q.explanation.length).toBeGreaterThan(0);
      });
    });
  });

  describe("choices validation", () => {
    it("choices array should have at least 2 items", () => {
      questions.forEach((q) => {
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("no duplicate choices within a question", () => {
      questions.forEach((q) => {
        const uniqueChoices = new Set(q.choices);
        expect(uniqueChoices.size).toBe(q.choices.length);
      });
    });
  });

  describe("choices match family tools", () => {
    it("choices should correspond to tools in their command family", () => {
      questions.forEach((q) => {
        const family = familiesData.families.find((f) => f.id === q.familyId);
        expect(family).toBeDefined();
        if (family) {
          const familyToolNames = family.tools.map((t) => t.name);
          q.choices.forEach((choice) => {
            expect(familyToolNames).toContain(choice);
          });
        }
      });
    });
  });

  describe("difficulty field", () => {
    it("each question should have a valid difficulty level", () => {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      questions.forEach((q) => {
        expect(validDifficulties).toContain(q.difficulty);
      });
    });
  });

  describe("content quality", () => {
    it("scenarios should not be duplicated across questions", () => {
      const scenarios = questions.map((q) => q.scenario);
      const uniqueScenarios = new Set(scenarios);
      expect(uniqueScenarios.size).toBe(scenarios.length);
    });

    it("explanations should not be duplicated across questions", () => {
      const explanations = questions.map((q) => q.explanation);
      const uniqueExplanations = new Set(explanations);
      expect(uniqueExplanations.size).toBe(explanations.length);
    });
  });
});
