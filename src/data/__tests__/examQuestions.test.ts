import { describe, it, expect } from "vitest";
import examData from "../examQuestions.json";

interface ExamQuestion {
  id: string;
  domain: string;
  questionText: string;
  type: string;
  choices: string[];
  correctAnswer: number | number[];
  explanation: string;
  points: number;
  difficulty: string;
}

const questions = examData.questions as ExamQuestion[];

const VALID_DOMAINS = ["domain1", "domain2", "domain3", "domain4", "domain5"];
const VALID_TYPES = ["multiple-choice", "multiple-select"];
const VALID_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

// Exam domain weights from NCP-AII blueprint
const DOMAIN_WEIGHTS: Record<string, number> = {
  domain1: 31,
  domain2: 5,
  domain3: 19,
  domain4: 33,
  domain5: 12,
};

describe("examQuestions.json", () => {
  describe("top-level structure", () => {
    it("should have required top-level fields", () => {
      expect(examData).toHaveProperty("examId");
      expect(examData).toHaveProperty("title");
      expect(examData).toHaveProperty("description");
      expect(examData).toHaveProperty("duration");
      expect(examData).toHaveProperty("passingScore");
      expect(examData).toHaveProperty("domainWeights");
      expect(examData).toHaveProperty("questions");
    });

    it("should have a questions array", () => {
      expect(Array.isArray(questions)).toBe(true);
    });

    it("should have a reasonable passing score between 50 and 100", () => {
      expect(examData.passingScore).toBeGreaterThanOrEqual(50);
      expect(examData.passingScore).toBeLessThanOrEqual(100);
    });

    it("should have domain weights that sum to 100", () => {
      const weights = examData.domainWeights;
      const sum =
        weights.domain1 +
        weights.domain2 +
        weights.domain3 +
        weights.domain4 +
        weights.domain5;
      expect(sum).toBe(100);
    });
  });

  describe("question count", () => {
    it("should have at least 180 questions", () => {
      expect(questions.length).toBeGreaterThanOrEqual(180);
    });

    it("should have multiple-select questions", () => {
      const msCount = questions.filter(
        (q) => q.type === "multiple-select",
      ).length;
      expect(
        msCount,
        "Should have at least 5 multiple-select questions",
      ).toBeGreaterThanOrEqual(5);
    });
  });

  describe("required fields", () => {
    it("all questions should have required fields: id, domain, questionText, choices, correctAnswer", () => {
      questions.forEach((q, i) => {
        expect(q.id, `Question index ${i} missing id`).toBeDefined();
        expect(q.domain, `Question ${q.id} missing domain`).toBeDefined();
        expect(
          q.questionText,
          `Question ${q.id} missing questionText`,
        ).toBeDefined();
        expect(q.choices, `Question ${q.id} missing choices`).toBeDefined();
        expect(
          q.correctAnswer,
          `Question ${q.id} missing correctAnswer`,
        ).toBeDefined();
      });
    });

    it("all questions should have explanation field", () => {
      questions.forEach((q) => {
        expect(
          q.explanation,
          `Question ${q.id} missing explanation`,
        ).toBeDefined();
      });
    });

    it("all questions should have type field", () => {
      questions.forEach((q) => {
        expect(q.type, `Question ${q.id} missing type`).toBeDefined();
      });
    });

    it("all questions should have difficulty field", () => {
      questions.forEach((q) => {
        expect(
          q.difficulty,
          `Question ${q.id} missing difficulty`,
        ).toBeDefined();
      });
    });

    it("all questions should have points field", () => {
      questions.forEach((q) => {
        expect(q.points, `Question ${q.id} missing points`).toBeDefined();
      });
    });
  });

  describe("question IDs", () => {
    it("all question IDs should be unique", () => {
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all question IDs should follow consistent format (q followed by digits)", () => {
      questions.forEach((q) => {
        expect(q.id).toMatch(
          /^q\d{3}$/,
          `Question ID '${q.id}' does not match expected format q###`,
        );
      });
    });
  });

  describe("domains", () => {
    it("all domains should be valid (domain1 through domain5)", () => {
      questions.forEach((q) => {
        expect(
          VALID_DOMAINS,
          `Question ${q.id} has invalid domain '${q.domain}'`,
        ).toContain(q.domain);
      });
    });

    it("each domain should have at least one question", () => {
      VALID_DOMAINS.forEach((domain) => {
        const domainQuestions = questions.filter((q) => q.domain === domain);
        expect(
          domainQuestions.length,
          `Domain ${domain} has no questions`,
        ).toBeGreaterThan(0);
      });
    });

    it("domain 4 (Cluster Test and Verification, 33%) should have the most questions", () => {
      const domainCounts: Record<string, number> = {};
      VALID_DOMAINS.forEach((d) => {
        domainCounts[d] = questions.filter((q) => q.domain === d).length;
      });
      const domain4Count = domainCounts["domain4"];
      // Domain 4 at 33% should have the most questions
      Object.entries(domainCounts).forEach(([domain, count]) => {
        if (domain !== "domain4") {
          expect(
            domain4Count,
            `Domain 4 (${domain4Count}) should have >= questions than ${domain} (${count})`,
          ).toBeGreaterThanOrEqual(count);
        }
      });
    });

    it("domain distribution should roughly match exam weights (within 15 percentage points)", () => {
      const total = questions.length;
      VALID_DOMAINS.forEach((domain) => {
        const domainCount = questions.filter((q) => q.domain === domain).length;
        const actualPercent = (domainCount / total) * 100;
        const expectedPercent = DOMAIN_WEIGHTS[domain];
        const diff = Math.abs(actualPercent - expectedPercent);
        expect(
          diff,
          `Domain ${domain}: actual ${actualPercent.toFixed(1)}% vs expected ${expectedPercent}% (diff ${diff.toFixed(1)}pp)`,
        ).toBeLessThanOrEqual(15);
      });
    });

    it("domain 2 (Physical Layer, 5%) should have the fewest questions", () => {
      const domainCounts: Record<string, number> = {};
      VALID_DOMAINS.forEach((d) => {
        domainCounts[d] = questions.filter((q) => q.domain === d).length;
      });
      const domain2Count = domainCounts["domain2"];
      Object.entries(domainCounts).forEach(([domain, count]) => {
        if (domain !== "domain2") {
          expect(
            domain2Count,
            `Domain 2 (${domain2Count}) should have <= questions than ${domain} (${count})`,
          ).toBeLessThanOrEqual(count);
        }
      });
    });
  });

  describe("question types", () => {
    it("all questions should have a valid type", () => {
      questions.forEach((q) => {
        expect(
          VALID_TYPES,
          `Question ${q.id} has invalid type '${q.type}'`,
        ).toContain(q.type);
      });
    });

    it("all questions should have a valid difficulty", () => {
      questions.forEach((q) => {
        expect(
          VALID_DIFFICULTIES,
          `Question ${q.id} has invalid difficulty '${q.difficulty}'`,
        ).toContain(q.difficulty);
      });
    });
  });

  describe("choices", () => {
    it("all questions should have exactly 4 choices", () => {
      questions.forEach((q) => {
        expect(
          q.choices.length,
          `Question ${q.id} has ${q.choices.length} choices instead of 4`,
        ).toBe(4);
      });
    });

    it("no choices should be empty strings", () => {
      questions.forEach((q) => {
        q.choices.forEach((choice, i) => {
          expect(
            choice.trim().length,
            `Question ${q.id} choice ${i} is empty`,
          ).toBeGreaterThan(0);
        });
      });
    });

    it("non-numeric choices should be at least 3 characters long", () => {
      questions.forEach((q) => {
        q.choices.forEach((choice, i) => {
          // Skip purely numeric/hex choices (e.g., "4", "7", "10de") which are valid short answers
          if (/^[0-9a-fA-F]+$/.test(choice.trim())) return;
          expect(
            choice.length,
            `Question ${q.id} choice ${i} ('${choice}') is suspiciously short`,
          ).toBeGreaterThanOrEqual(3);
        });
      });
    });

    it("no duplicate choices within a single question", () => {
      questions.forEach((q) => {
        const normalized = q.choices.map((c) => c.toLowerCase().trim());
        const unique = new Set(normalized);
        expect(unique.size, `Question ${q.id} has duplicate choices`).toBe(
          normalized.length,
        );
      });
    });
  });

  describe("correct answers", () => {
    it("multiple-choice questions should have correctAnswer as a valid index", () => {
      const mcQuestions = questions.filter((q) => q.type === "multiple-choice");
      mcQuestions.forEach((q) => {
        expect(
          typeof q.correctAnswer,
          `Question ${q.id} correctAnswer should be a number`,
        ).toBe("number");
        const answer = q.correctAnswer as number;
        expect(
          answer,
          `Question ${q.id} correctAnswer ${answer} out of range`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          answer,
          `Question ${q.id} correctAnswer ${answer} out of range`,
        ).toBeLessThan(q.choices.length);
      });
    });

    it("multiple-select questions should have correctAnswer as an array of valid indices", () => {
      const msQuestions = questions.filter((q) => q.type === "multiple-select");
      msQuestions.forEach((q) => {
        expect(
          Array.isArray(q.correctAnswer),
          `Question ${q.id} correctAnswer should be an array`,
        ).toBe(true);
        const answers = q.correctAnswer as number[];
        expect(
          answers.length,
          `Question ${q.id} has empty correctAnswer array`,
        ).toBeGreaterThan(0);
        answers.forEach((idx) => {
          expect(
            idx,
            `Question ${q.id} correctAnswer index ${idx} out of range`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            idx,
            `Question ${q.id} correctAnswer index ${idx} out of range`,
          ).toBeLessThan(q.choices.length);
        });
      });
    });
  });

  describe("question text quality", () => {
    it("no question text should be empty", () => {
      questions.forEach((q) => {
        expect(
          q.questionText.trim().length,
          `Question ${q.id} has empty questionText`,
        ).toBeGreaterThan(0);
      });
    });

    it("all question texts should be at least 10 characters long", () => {
      questions.forEach((q) => {
        expect(
          q.questionText.length,
          `Question ${q.id} questionText is too short: '${q.questionText}'`,
        ).toBeGreaterThanOrEqual(10);
      });
    });

    it("no duplicate question texts", () => {
      const texts = questions.map((q) => q.questionText.toLowerCase().trim());
      const unique = new Set(texts);
      expect(
        unique.size,
        `Found ${texts.length - unique.size} duplicate question texts`,
      ).toBe(texts.length);
    });
  });

  describe("explanations", () => {
    it("all explanations should be non-empty strings", () => {
      questions.forEach((q) => {
        expect(
          typeof q.explanation,
          `Question ${q.id} explanation is not a string`,
        ).toBe("string");
        expect(
          q.explanation.trim().length,
          `Question ${q.id} has empty explanation`,
        ).toBeGreaterThan(0);
      });
    });

    it("all explanations should be at least 20 characters (meaningful content)", () => {
      questions.forEach((q) => {
        expect(
          q.explanation.length,
          `Question ${q.id} explanation is too short: '${q.explanation}'`,
        ).toBeGreaterThanOrEqual(20);
      });
    });
  });

  describe("points", () => {
    it("all questions should have positive point values", () => {
      questions.forEach((q) => {
        expect(
          q.points,
          `Question ${q.id} has non-positive points`,
        ).toBeGreaterThan(0);
      });
    });
  });

  describe("overall data integrity", () => {
    it("question IDs should be sequential (no gaps)", () => {
      const ids = questions.map((q) => parseInt(q.id.replace("q", ""), 10));
      ids.sort((a, b) => a - b);
      for (let i = 0; i < ids.length; i++) {
        expect(
          ids[i],
          `Expected q${String(i + 1).padStart(3, "0")} but sequence has gap`,
        ).toBe(i + 1);
      }
    });

    it("should have at least 3 difficulty levels represented", () => {
      const difficulties = new Set(questions.map((q) => q.difficulty));
      expect(difficulties.size).toBeGreaterThanOrEqual(3);
    });

    it("each difficulty level should have multiple questions", () => {
      VALID_DIFFICULTIES.forEach((diff) => {
        const count = questions.filter((q) => q.difficulty === diff).length;
        expect(
          count,
          `Difficulty '${diff}' has only ${count} question(s)`,
        ).toBeGreaterThan(1);
      });
    });
  });
});
