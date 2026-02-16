import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Zustand stores
const mockLearningState = {
  examAttempts: [],
  gauntletAttempts: [],
  currentStreak: 0,
  totalStudyTimeSeconds: 0,
  domainProgress: {
    domain1: { questionsAttempted: 0, questionsCorrect: 0 },
    domain2: { questionsAttempted: 0, questionsCorrect: 0 },
    domain3: { questionsAttempted: 0, questionsCorrect: 0 },
    domain4: { questionsAttempted: 0, questionsCorrect: 0 },
    domain5: { questionsAttempted: 0, questionsCorrect: 0 },
  },
  getReadinessScore: () => 42,
};

vi.mock("../../store/learningStore", () => ({
  useLearningStore: vi.fn(
    (selector?: (s: typeof mockLearningState) => unknown) =>
      selector ? selector(mockLearningState) : mockLearningState,
  ),
}));

vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn(
    (
      selector?: (s: {
        familyQuizScores: Record<string, unknown>;
        masteryQuizScores: Record<string, unknown>;
      }) => unknown,
    ) =>
      selector
        ? selector({ familyQuizScores: {}, masteryQuizScores: {} })
        : { familyQuizScores: {}, masteryQuizScores: {} },
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const stub = (props: Record<string, unknown>) => <svg {...props} />;
  return {
    ...actual,
    BookOpen: stub,
    Zap: stub,
    Trophy: stub,
    Target: stub,
    RotateCcw: stub,
    Clock: stub,
    HelpCircle: stub,
    GraduationCap: stub,
    BarChart3: stub,
    CheckCircle: stub,
    XCircle: stub,
    Flame: stub,
  };
});

import { ExamsView } from "../ExamsView";

function defaultProps() {
  return {
    onBeginExam: vi.fn(),
    onOpenExamGauntlet: vi.fn(),
    onOpenToolQuiz: vi.fn(),
    onOpenMasteryQuiz: vi.fn(),
  };
}

describe("ExamsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const props = defaultProps();
    const { container } = render(<ExamsView {...props} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders all 4 sections: hero, exam modes, tool quizzes, history+domains", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    expect(screen.getByTestId("exam-readiness-hero")).toBeInTheDocument();
    expect(screen.getByText("Exam Modes")).toBeInTheDocument();
    expect(screen.getByText("Tool Mastery Quizzes")).toBeInTheDocument();
    expect(screen.getByTestId("recent-exam-history")).toBeInTheDocument();
    expect(screen.getByTestId("domain-performance-grid")).toBeInTheDocument();
  });

  it("renders 5 exam mode cards", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    expect(
      screen.getByTestId("exam-mode-card-full-practice"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("exam-mode-card-quick-quiz")).toBeInTheDocument();
    expect(
      screen.getByTestId("exam-mode-card-exam-gauntlet"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("exam-mode-card-weak-area-focus"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("exam-mode-card-review-mistakes"),
    ).toBeInTheDocument();
  });

  it("renders 6 tool quiz cards", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    expect(
      screen.getByTestId("tool-quiz-card-gpu-monitoring"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-quiz-card-infiniband-tools"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-quiz-card-bmc-hardware"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-quiz-card-cluster-tools"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-quiz-card-container-tools"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-quiz-card-diagnostics"),
    ).toBeInTheDocument();
  });

  it("calls onBeginExam with mode when exam card launched", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    const card = screen.getByTestId("exam-mode-card-full-practice");
    const btn = card.querySelector("button")!;
    fireEvent.click(btn);
    expect(props.onBeginExam).toHaveBeenCalledWith("full-practice");
  });

  it("calls onOpenExamGauntlet when gauntlet card launched", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    const card = screen.getByTestId("exam-mode-card-exam-gauntlet");
    const btn = card.querySelector("button")!;
    fireEvent.click(btn);
    expect(props.onOpenExamGauntlet).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenToolQuiz with familyId when tool quiz card clicked", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    const card = screen.getByTestId("tool-quiz-card-gpu-monitoring");
    const btn = card.querySelector("button")!;
    fireEvent.click(btn);
    expect(props.onOpenToolQuiz).toHaveBeenCalledWith("gpu-monitoring");
  });

  it("shows empty state messaging when no attempts exist", () => {
    const props = defaultProps();
    render(<ExamsView {...props} />);
    expect(screen.getByTestId("empty-history")).toBeInTheDocument();
    expect(screen.getByText(/no exam attempts yet/i)).toBeInTheDocument();
  });
});
