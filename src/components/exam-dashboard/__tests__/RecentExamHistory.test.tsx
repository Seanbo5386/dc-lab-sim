import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockState = {
  examAttempts: [] as { percentage: number; timeSpent: number }[],
  gauntletAttempts: [] as {
    timestamp: number;
    score: number;
    totalQuestions: number;
    timeSpentSeconds: number;
  }[],
};

let mockProgressState = {
  familyQuizScores: {} as Record<
    string,
    {
      passed: boolean;
      score: number;
      attempts: number;
      lastAttemptDate?: number;
    }
  >,
  masteryQuizScores: {} as Record<
    string,
    {
      passed: boolean;
      bestScore: number;
      totalQuestions: number;
      attempts: number;
      lastAttemptDate?: number;
    }
  >,
};

vi.mock("../../../store/learningStore", () => ({
  useLearningStore: vi.fn((selector?: (s: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
  ),
}));

vi.mock("../../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn(
    (selector?: (s: typeof mockProgressState) => unknown) =>
      selector ? selector(mockProgressState) : mockProgressState,
  ),
}));

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const stub = (props: Record<string, unknown>) => <svg {...props} />;
  return { ...actual, GraduationCap: stub, Trophy: stub, Zap: stub };
});

import { RecentExamHistory } from "../RecentExamHistory";

describe("RecentExamHistory", () => {
  beforeEach(() => {
    mockProgressState = { familyQuizScores: {}, masteryQuizScores: {} };
  });

  it("shows empty state when no attempts", () => {
    mockState = { examAttempts: [], gauntletAttempts: [] };
    render(<RecentExamHistory />);
    expect(screen.getByTestId("empty-history")).toBeInTheDocument();
    expect(screen.getByText(/no exam attempts yet/i)).toBeInTheDocument();
  });

  it("renders merged/sorted history", () => {
    mockState = {
      examAttempts: [
        { percentage: 70, timeSpent: 3600 },
        { percentage: 85, timeSpent: 2700 },
      ],
      gauntletAttempts: [
        {
          timestamp: 9999,
          score: 8,
          totalQuestions: 10,
          timeSpentSeconds: 1800,
        },
      ],
    };
    render(<RecentExamHistory />);
    // Should not show empty state
    expect(screen.queryByTestId("empty-history")).not.toBeInTheDocument();
    // Should show all 3 entries
    expect(screen.getByText("Practice Exam #1")).toBeInTheDocument();
    expect(screen.getByText("Practice Exam #2")).toBeInTheDocument();
    expect(screen.getByText("Gauntlet #1")).toBeInTheDocument();
  });

  it("limits to maxItems", () => {
    mockState = {
      examAttempts: [
        { percentage: 60, timeSpent: 100 },
        { percentage: 70, timeSpent: 100 },
        { percentage: 80, timeSpent: 100 },
      ],
      gauntletAttempts: [],
    };
    render(<RecentExamHistory maxItems={2} />);
    // Only 2 most recent (highest index = most recent for exams)
    expect(screen.getByText("Practice Exam #3")).toBeInTheDocument();
    expect(screen.getByText("Practice Exam #2")).toBeInTheDocument();
    expect(screen.queryByText("Practice Exam #1")).not.toBeInTheDocument();
  });

  it("includes Tool Selection quiz results in history", () => {
    mockState = { examAttempts: [], gauntletAttempts: [] };
    mockProgressState = {
      familyQuizScores: {
        "gpu-monitoring": {
          passed: false,
          score: 50,
          attempts: 1,
          lastAttemptDate: Date.now(),
        },
      },
      masteryQuizScores: {},
    };
    render(<RecentExamHistory />);
    expect(screen.queryByTestId("empty-history")).not.toBeInTheDocument();
    expect(
      screen.getByText("GPU Monitoring — Tool Selection"),
    ).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
  });

  it("includes Deep Mastery quiz results in history", () => {
    mockState = { examAttempts: [], gauntletAttempts: [] };
    mockProgressState = {
      familyQuizScores: {},
      masteryQuizScores: {
        "infiniband-tools": {
          passed: true,
          bestScore: 8,
          totalQuestions: 10,
          attempts: 2,
          lastAttemptDate: Date.now(),
        },
      },
    };
    render(<RecentExamHistory />);
    expect(screen.queryByTestId("empty-history")).not.toBeInTheDocument();
    expect(
      screen.getByText("InfiniBand Tools — Deep Mastery"),
    ).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("skips quiz results without lastAttemptDate", () => {
    mockState = { examAttempts: [], gauntletAttempts: [] };
    mockProgressState = {
      familyQuizScores: {
        "gpu-monitoring": {
          passed: true,
          score: 75,
          attempts: 1,
          // no lastAttemptDate — legacy data
        },
      },
      masteryQuizScores: {},
    };
    render(<RecentExamHistory />);
    expect(screen.getByTestId("empty-history")).toBeInTheDocument();
  });
});
