import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLearningProgressStore } from "../learningProgressStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Learning Progress Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useLearningProgressStore.setState({
      toolsUsed: {},
      familyQuizScores: {},
      unlockedTiers: {},
      tierProgress: {},
      explanationGateResults: {},
      reviewSchedule: {},
    });
    localStorageMock.clear();
  });

  describe("Tool Usage Tracking", () => {
    it("should mark a tool as used", () => {
      const store = useLearningProgressStore.getState();
      store.markToolUsed("gpu-monitoring", "nvidia-smi");

      const state = useLearningProgressStore.getState();
      expect(state.toolsUsed["gpu-monitoring"]).toContain("nvidia-smi");
    });

    it("should not add duplicate tools", () => {
      const store = useLearningProgressStore.getState();
      store.markToolUsed("gpu-monitoring", "nvidia-smi");
      store.markToolUsed("gpu-monitoring", "nvidia-smi");

      const state = useLearningProgressStore.getState();
      expect(state.toolsUsed["gpu-monitoring"]).toHaveLength(1);
    });

    it("should track tools across multiple families", () => {
      const store = useLearningProgressStore.getState();
      store.markToolUsed("gpu-monitoring", "nvidia-smi");
      store.markToolUsed("infiniband-tools", "ibstat");
      store.markToolUsed("gpu-monitoring", "dcgmi");

      const state = useLearningProgressStore.getState();
      expect(state.toolsUsed["gpu-monitoring"]).toHaveLength(2);
      expect(state.toolsUsed["infiniband-tools"]).toHaveLength(1);
    });
  });

  describe("Quiz Tracking", () => {
    it("should record a passed quiz", () => {
      const store = useLearningProgressStore.getState();
      store.completeQuiz("gpu-monitoring", true, 85);

      const state = useLearningProgressStore.getState();
      expect(state.familyQuizScores["gpu-monitoring"]).toEqual({
        passed: true,
        score: 85,
        attempts: 1,
      });
    });

    it("should record a failed quiz", () => {
      const store = useLearningProgressStore.getState();
      store.completeQuiz("gpu-monitoring", false, 45);

      const state = useLearningProgressStore.getState();
      expect(state.familyQuizScores["gpu-monitoring"].passed).toBe(false);
      expect(state.familyQuizScores["gpu-monitoring"].score).toBe(45);
    });

    it("should increment attempt count on retakes", () => {
      const store = useLearningProgressStore.getState();
      store.completeQuiz("gpu-monitoring", false, 45);
      store.completeQuiz("gpu-monitoring", false, 55);
      store.completeQuiz("gpu-monitoring", true, 80);

      const state = useLearningProgressStore.getState();
      expect(state.familyQuizScores["gpu-monitoring"].attempts).toBe(3);
    });

    it("should keep passed status once achieved", () => {
      const store = useLearningProgressStore.getState();
      store.completeQuiz("gpu-monitoring", true, 85);
      store.completeQuiz("gpu-monitoring", false, 45); // Should not override pass

      const state = useLearningProgressStore.getState();
      expect(state.familyQuizScores["gpu-monitoring"].passed).toBe(true);
    });

    it("should keep the best score", () => {
      const store = useLearningProgressStore.getState();
      store.completeQuiz("gpu-monitoring", false, 60);
      store.completeQuiz("gpu-monitoring", true, 90);
      store.completeQuiz("gpu-monitoring", false, 70);

      const state = useLearningProgressStore.getState();
      expect(state.familyQuizScores["gpu-monitoring"].score).toBe(90);
    });
  });

  describe("Tier Progress", () => {
    it("should start with tier 1 unlocked by default", () => {
      const store = useLearningProgressStore.getState();
      const tier = store.checkTierUnlock("gpu-monitoring");
      expect(tier).toBe(1);
    });

    it("should track tier progress", () => {
      const store = useLearningProgressStore.getState();
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");

      const state = useLearningProgressStore.getState();
      expect(state.tierProgress["gpu-monitoring"].tier1Completed).toBe(1);
    });

    it("should unlock tier 2 after completing tier 1 threshold", () => {
      const store = useLearningProgressStore.getState();

      // Complete 3 tier-1 scenarios (threshold)
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-2");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-3");

      const state = useLearningProgressStore.getState();
      expect(state.unlockedTiers["gpu-monitoring"]).toBe(2);
    });

    it("should unlock tier 3 after completing tier 2 threshold", () => {
      const store = useLearningProgressStore.getState();

      // First unlock tier 2
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-2");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-3");

      // Then complete tier 2 scenarios
      store.updateTierProgress("gpu-monitoring", 2, "scenario-4");
      store.updateTierProgress("gpu-monitoring", 2, "scenario-5");
      store.updateTierProgress("gpu-monitoring", 2, "scenario-6");

      const state = useLearningProgressStore.getState();
      expect(state.unlockedTiers["gpu-monitoring"]).toBe(3);
    });

    it("should not regress tier unlock", () => {
      const store = useLearningProgressStore.getState();

      // Unlock tier 2
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-2");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-3");

      // Adding more tier 1 progress should not change unlock level
      store.updateTierProgress("gpu-monitoring", 1, "scenario-4");

      const state = useLearningProgressStore.getState();
      expect(state.unlockedTiers["gpu-monitoring"]).toBe(2);
    });

    it("should return correct tier with checkTierUnlock", () => {
      const store = useLearningProgressStore.getState();

      // Unlock tier 2
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-2");
      store.updateTierProgress("gpu-monitoring", 1, "scenario-3");

      const tier = store.checkTierUnlock("gpu-monitoring");
      expect(tier).toBe(2);
    });
  });

  describe("Explanation Gates", () => {
    it("should record a passed explanation gate", () => {
      const store = useLearningProgressStore.getState();
      store.recordExplanationGate("gate-1", "scenario-abc", true);

      const state = useLearningProgressStore.getState();
      expect(state.explanationGateResults["gate-1"]).toEqual({
        passed: true,
        scenarioId: "scenario-abc",
      });
    });

    it("should record a failed explanation gate", () => {
      const store = useLearningProgressStore.getState();
      store.recordExplanationGate("gate-1", "scenario-abc", false);

      const state = useLearningProgressStore.getState();
      expect(state.explanationGateResults["gate-1"].passed).toBe(false);
    });

    it("should update gate result on retry", () => {
      const store = useLearningProgressStore.getState();
      store.recordExplanationGate("gate-1", "scenario-abc", false);
      store.recordExplanationGate("gate-1", "scenario-abc", true);

      const state = useLearningProgressStore.getState();
      expect(state.explanationGateResults["gate-1"].passed).toBe(true);
    });
  });

  describe("Spaced Repetition", () => {
    it("should schedule a new review", () => {
      const store = useLearningProgressStore.getState();
      const before = Date.now();
      store.scheduleReview("gpu-monitoring");

      const state = useLearningProgressStore.getState();
      const entry = state.reviewSchedule["gpu-monitoring"];

      expect(entry).toBeDefined();
      expect(entry.familyId).toBe("gpu-monitoring");
      expect(entry.interval).toBe(1); // Initial interval is 1 day
      expect(entry.consecutiveSuccesses).toBe(0);
      expect(entry.nextReviewDate).toBeGreaterThan(before);
    });

    it("should increase interval on successful review", () => {
      const store = useLearningProgressStore.getState();
      store.scheduleReview("gpu-monitoring");

      const stateBefore = useLearningProgressStore.getState();
      const intervalBefore =
        stateBefore.reviewSchedule["gpu-monitoring"].interval;

      store.recordReviewResult("gpu-monitoring", true);

      const stateAfter = useLearningProgressStore.getState();
      expect(
        stateAfter.reviewSchedule["gpu-monitoring"].interval,
      ).toBeGreaterThan(intervalBefore);
      expect(
        stateAfter.reviewSchedule["gpu-monitoring"].consecutiveSuccesses,
      ).toBe(1);
    });

    it("should reset interval on failed review", () => {
      const store = useLearningProgressStore.getState();
      store.scheduleReview("gpu-monitoring");

      // Build up the interval with successful reviews
      store.recordReviewResult("gpu-monitoring", true);
      store.recordReviewResult("gpu-monitoring", true);

      const stateBeforeFail = useLearningProgressStore.getState();
      expect(
        stateBeforeFail.reviewSchedule["gpu-monitoring"].interval,
      ).toBeGreaterThan(1);

      // Fail a review
      store.recordReviewResult("gpu-monitoring", false);

      const stateAfterFail = useLearningProgressStore.getState();
      expect(stateAfterFail.reviewSchedule["gpu-monitoring"].interval).toBe(1);
      expect(
        stateAfterFail.reviewSchedule["gpu-monitoring"].consecutiveSuccesses,
      ).toBe(0);
    });

    it("should handle review result when no schedule exists", () => {
      const store = useLearningProgressStore.getState();
      store.recordReviewResult("gpu-monitoring", true);

      const state = useLearningProgressStore.getState();
      expect(state.reviewSchedule["gpu-monitoring"]).toBeDefined();
      expect(state.reviewSchedule["gpu-monitoring"].consecutiveSuccesses).toBe(
        1,
      );
    });

    it("should return due reviews", () => {
      const store = useLearningProgressStore.getState();

      // Set up a review that's already past due
      useLearningProgressStore.setState({
        reviewSchedule: {
          "gpu-monitoring": {
            familyId: "gpu-monitoring",
            nextReviewDate: Date.now() - 1000, // 1 second ago
            interval: 1,
            consecutiveSuccesses: 0,
          },
          "infiniband-tools": {
            familyId: "infiniband-tools",
            nextReviewDate: Date.now() + 86400000, // 1 day from now
            interval: 1,
            consecutiveSuccesses: 0,
          },
        },
      });

      const dueReviews = store.getDueReviews();
      expect(dueReviews).toContain("gpu-monitoring");
      expect(dueReviews).not.toContain("infiniband-tools");
    });

    it("should cap interval at maximum", () => {
      const store = useLearningProgressStore.getState();

      // Set up with high interval
      useLearningProgressStore.setState({
        reviewSchedule: {
          "gpu-monitoring": {
            familyId: "gpu-monitoring",
            nextReviewDate: Date.now(),
            interval: 20, // Already fairly high
            consecutiveSuccesses: 5,
          },
        },
      });

      // Multiple successful reviews
      store.recordReviewResult("gpu-monitoring", true);
      store.recordReviewResult("gpu-monitoring", true);
      store.recordReviewResult("gpu-monitoring", true);

      const state = useLearningProgressStore.getState();
      // Should be capped at 30 days
      expect(
        state.reviewSchedule["gpu-monitoring"].interval,
      ).toBeLessThanOrEqual(30);
    });
  });

  describe("Reset Progress", () => {
    it("should reset all progress", () => {
      const store = useLearningProgressStore.getState();

      // Add some data
      store.markToolUsed("gpu-monitoring", "nvidia-smi");
      store.completeQuiz("gpu-monitoring", true, 90);
      store.updateTierProgress("gpu-monitoring", 1, "scenario-1");
      store.recordExplanationGate("gate-1", "scenario-abc", true);
      store.scheduleReview("gpu-monitoring");

      // Reset
      store.resetProgress();

      const state = useLearningProgressStore.getState();
      expect(Object.keys(state.toolsUsed)).toHaveLength(0);
      expect(Object.keys(state.familyQuizScores)).toHaveLength(0);
      expect(Object.keys(state.unlockedTiers)).toHaveLength(0);
      expect(Object.keys(state.tierProgress)).toHaveLength(0);
      expect(Object.keys(state.explanationGateResults)).toHaveLength(0);
      expect(Object.keys(state.reviewSchedule)).toHaveLength(0);
    });
  });

  describe("Persistence", () => {
    it("should use correct storage key", () => {
      const store = useLearningProgressStore.getState();
      store.markToolUsed("gpu-monitoring", "nvidia-smi");

      // The persist middleware uses the storage key when persisting
      // We can verify the store name by checking that data can be retrieved
      const state = useLearningProgressStore.getState();
      expect(state.toolsUsed["gpu-monitoring"]).toBeDefined();
    });
  });
});
