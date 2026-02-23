import { describe, it, expect } from "vitest";
import {
  mergeSimulationData,
  mergeLearningProgress,
  mergeLearningData,
} from "../mergeProgress";

describe("mergeSimulationData", () => {
  it("unions completedScenarios from both sources", () => {
    const local = { completedScenarios: ["a", "b"] };
    const cloud = { completedScenarios: ["b", "c"] };
    const result = mergeSimulationData(local, cloud);
    expect(result.completedScenarios).toEqual(
      expect.arrayContaining(["a", "b", "c"]),
    );
    expect(result.completedScenarios).toHaveLength(3);
  });

  it("keeps local scenarioProgress when cloud has none", () => {
    const local = {
      completedScenarios: [],
      scenarioProgress: { s1: { currentStepIndex: 2, steps: [] } },
    };
    const cloud = { completedScenarios: [] };
    const result = mergeSimulationData(local, cloud);
    expect(result.scenarioProgress).toEqual(local.scenarioProgress);
  });

  it("takes local systemType when present", () => {
    const local = { completedScenarios: [], systemType: "DGX-H100" };
    const cloud = { completedScenarios: [], systemType: "DGX-A100" };
    const result = mergeSimulationData(local, cloud);
    expect(result.systemType).toBe("DGX-H100");
  });
});

describe("mergeLearningProgress", () => {
  it("takes higher bestScore per mastery quiz", () => {
    const local = {
      masteryQuizScores: {
        "gpu-monitoring": {
          passed: true,
          bestScore: 80,
          totalQuestions: 10,
          attempts: 2,
        },
      },
    };
    const cloud = {
      masteryQuizScores: {
        "gpu-monitoring": {
          passed: true,
          bestScore: 90,
          totalQuestions: 10,
          attempts: 3,
        },
      },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.masteryQuizScores["gpu-monitoring"].bestScore).toBe(90);
  });

  it("takes higher tier per family", () => {
    const local = { unlockedTiers: { "gpu-monitoring": 2, "bmc-hardware": 1 } };
    const cloud = {
      unlockedTiers: { "gpu-monitoring": 1, "cluster-tools": 3 },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.unlockedTiers["gpu-monitoring"]).toBe(2);
    expect(result.unlockedTiers["bmc-hardware"]).toBe(1);
    expect(result.unlockedTiers["cluster-tools"]).toBe(3);
  });

  it("takes review entry with later nextReviewDate", () => {
    const local = {
      reviewSchedule: {
        "gpu-monitoring": {
          familyId: "gpu-monitoring",
          nextReviewDate: 1000,
          interval: 1,
          consecutiveSuccesses: 2,
        },
      },
    };
    const cloud = {
      reviewSchedule: {
        "gpu-monitoring": {
          familyId: "gpu-monitoring",
          nextReviewDate: 2000,
          interval: 3,
          consecutiveSuccesses: 4,
        },
      },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.reviewSchedule["gpu-monitoring"].nextReviewDate).toBe(2000);
  });

  it("takes higher score per family quiz and ORs passed", () => {
    const local = {
      familyQuizScores: {
        "gpu-monitoring": { passed: false, score: 70, attempts: 1 },
      },
    };
    const cloud = {
      familyQuizScores: {
        "gpu-monitoring": { passed: true, score: 60, attempts: 2 },
      },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.familyQuizScores["gpu-monitoring"].score).toBe(70);
    expect(result.familyQuizScores["gpu-monitoring"].passed).toBe(true);
  });

  it("takes passed=true for explanation gates", () => {
    const local = {
      explanationGateResults: {
        "gate-1": { passed: false, scenarioId: "s1" },
      },
    };
    const cloud = {
      explanationGateResults: {
        "gate-1": { passed: true, scenarioId: "s1" },
      },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.explanationGateResults["gate-1"].passed).toBe(true);
  });

  it("unions toolsUsed per family", () => {
    const local = {
      toolsUsed: { "gpu-monitoring": ["nvidia-smi", "nvtop"] },
    };
    const cloud = {
      toolsUsed: { "gpu-monitoring": ["nvidia-smi", "dcgmi"] },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.toolsUsed["gpu-monitoring"]).toEqual(
      expect.arrayContaining(["nvidia-smi", "nvtop", "dcgmi"]),
    );
  });
});

describe("mergeLearningData", () => {
  it("takes larger totalStudyTimeSeconds", () => {
    const local = { totalStudyTimeSeconds: 3600 };
    const cloud = { totalStudyTimeSeconds: 7200 };
    const result = mergeLearningData(local, cloud);
    expect(result.totalStudyTimeSeconds).toBe(7200);
  });

  it("takes larger streak values", () => {
    const local = { currentStreak: 5, longestStreak: 10 };
    const cloud = { currentStreak: 3, longestStreak: 12 };
    const result = mergeLearningData(local, cloud);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(12);
  });

  it("takes higher proficiency per command", () => {
    const local = {
      commandProficiency: {
        "nvidia-smi": {
          command: "nvidia-smi",
          successCount: 10,
          failureCount: 2,
          lastUsed: 100,
          masteryLevel: "intermediate",
          streakCount: 3,
        },
      },
    };
    const cloud = {
      commandProficiency: {
        "nvidia-smi": {
          command: "nvidia-smi",
          successCount: 20,
          failureCount: 1,
          lastUsed: 200,
          masteryLevel: "advanced",
          streakCount: 5,
        },
      },
    };
    const result = mergeLearningData(local, cloud);
    expect(result.commandProficiency["nvidia-smi"].successCount).toBe(20);
  });

  it("takes larger totalSessions", () => {
    const local = { totalSessions: 15 };
    const cloud = { totalSessions: 10 };
    const result = mergeLearningData(local, cloud);
    expect(result.totalSessions).toBe(15);
  });

  it("takes higher questionsCorrect per domain", () => {
    const local = {
      domainProgress: {
        domain1: {
          domainId: "domain1",
          questionsCorrect: 10,
          questionsAttempted: 15,
        },
      },
    };
    const cloud = {
      domainProgress: {
        domain1: {
          domainId: "domain1",
          questionsCorrect: 15,
          questionsAttempted: 20,
        },
      },
    };
    const result = mergeLearningData(local, cloud);
    expect(result.domainProgress["domain1"].questionsCorrect).toBe(15);
  });

  it("unions sessionHistory by id and caps at 100", () => {
    const local = {
      sessionHistory: [
        { id: "s1", mode: "practice" },
        { id: "s2", mode: "exam" },
      ],
    };
    const cloud = {
      sessionHistory: [
        { id: "s2", mode: "exam" },
        { id: "s3", mode: "review" },
      ],
    };
    const result = mergeLearningData(local, cloud);
    expect(result.sessionHistory).toHaveLength(3);
    expect(result.sessionHistory.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(["s1", "s2", "s3"]),
    );
  });

  it("takes later lastStudyDate", () => {
    const local = { lastStudyDate: "2026-02-20" };
    const cloud = { lastStudyDate: "2026-02-21" };
    const result = mergeLearningData(local, cloud);
    expect(result.lastStudyDate).toBe("2026-02-21");
  });

  it("unions examAttempts by timestamp and caps at 20", () => {
    const local = { examAttempts: [{ timestamp: 1000, score: 80 }] };
    const cloud = {
      examAttempts: [
        { timestamp: 2000, score: 90 },
        { timestamp: 1000, score: 80 },
      ],
    };
    const result = mergeLearningData(local, cloud);
    expect(result.examAttempts).toHaveLength(2);
  });

  it("unions gauntletAttempts by timestamp and caps at 50", () => {
    const local = { gauntletAttempts: [{ timestamp: 1000, score: 70 }] };
    const cloud = { gauntletAttempts: [{ timestamp: 2000, score: 85 }] };
    const result = mergeLearningData(local, cloud);
    expect(result.gauntletAttempts).toHaveLength(2);
  });

  it("unions achievements", () => {
    const local = { achievements: ["first-scenario", "speed-runner"] };
    const cloud = { achievements: ["first-scenario", "quiz-master"] };
    const result = mergeLearningData(local, cloud);
    expect(result.achievements).toEqual(
      expect.arrayContaining(["first-scenario", "speed-runner", "quiz-master"]),
    );
    expect(result.achievements).toHaveLength(3);
  });
});

describe("merge edge cases", () => {
  it("mergeSimulationData handles empty cloud data", () => {
    const local = { completedScenarios: ["a"], systemType: "DGX-H100" };
    const cloud = {};
    const result = mergeSimulationData(local, cloud);
    expect(result.completedScenarios).toEqual(["a"]);
    expect(result.systemType).toBe("DGX-H100");
  });

  it("mergeLearningProgress handles empty local data", () => {
    const local = {};
    const cloud = {
      toolsUsed: { "gpu-monitoring": ["nvidia-smi"] },
      unlockedTiers: { "gpu-monitoring": 2 },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.toolsUsed["gpu-monitoring"]).toEqual(["nvidia-smi"]);
    expect(result.unlockedTiers["gpu-monitoring"]).toBe(2);
  });

  it("mergeLearningData handles both empty", () => {
    const result = mergeLearningData({}, {});
    expect(result.totalStudyTimeSeconds).toBe(0);
    expect(result.achievements).toEqual([]);
  });
});
