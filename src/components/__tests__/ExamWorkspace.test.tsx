import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import type { ExamBreakdown, ExamQuestion, ExamState } from "@/types/scenarios";
import type { ExamModeConfig } from "@/utils/examEngine";

// ============================================================================
// Mock data
// ============================================================================

const mockQuestions: ExamQuestion[] = [
  {
    id: "q1",
    domain: "domain1",
    questionText: "What command checks GPU status?",
    type: "multiple-choice",
    choices: ["nvidia-smi", "lspci", "dmesg", "top"],
    correctAnswer: 0,
    explanation: "nvidia-smi shows GPU status.",
    points: 1,
    difficulty: "beginner",
  },
  {
    id: "q2",
    domain: "domain2",
    questionText: "Which tool monitors InfiniBand?",
    type: "multiple-choice",
    choices: ["ibstat", "ifconfig", "netstat", "ss"],
    correctAnswer: 0,
    explanation: "ibstat shows InfiniBand adapter status.",
    points: 1,
    difficulty: "beginner",
  },
  {
    id: "q3",
    domain: "domain4",
    questionText: "Select all DCGM diagnostic levels.",
    type: "multiple-select",
    choices: ["Level 1", "Level 2", "Level 3", "Level 4"],
    correctAnswer: [0, 1, 2],
    explanation: "DCGM supports diagnostic levels 1-3.",
    points: 2,
    difficulty: "intermediate",
  },
];

// The exam state the store holds right after startExam()
const baseExamState: ExamState = {
  examId: "ncp-aii-practice",
  startTime: Date.now(),
  timeRemaining: 90 * 60,
  answers: {},
  currentQuestionIndex: 0,
  flaggedQuestions: [],
  answeredQuestions: [],
  submitted: false,
};

// The config createExamConfig returns unless a test overrides it
const baseConfig: ExamModeConfig = {
  mode: "full-practice",
  name: "Full Practice Exam",
  description: "Complete 60-question exam",
  questionCount: 60,
  timeLimitMinutes: 90,
  shuffleQuestions: true,
  showExplanations: "after-exam",
};

// What the scorer reports when an exam asked nothing in any domain: all five
// are still present, each at 0 %. Tests spread this and fill in the domains
// their exam did cover.
const unaskedDomains: ExamBreakdown["byDomain"] = {
  domain1: {
    domainName: "Platform Bring-Up",
    questionsTotal: 0,
    questionsCorrect: 0,
    percentage: 0,
    weight: 31,
  },
  domain2: {
    domainName: "Accelerator Configuration",
    questionsTotal: 0,
    questionsCorrect: 0,
    percentage: 0,
    weight: 5,
  },
  domain3: {
    domainName: "Base Infrastructure",
    questionsTotal: 0,
    questionsCorrect: 0,
    percentage: 0,
    weight: 19,
  },
  domain4: {
    domainName: "Validation & Testing",
    questionsTotal: 0,
    questionsCorrect: 0,
    percentage: 0,
    weight: 33,
  },
  domain5: {
    domainName: "Troubleshooting",
    questionsTotal: 0,
    questionsCorrect: 0,
    percentage: 0,
    weight: 12,
  },
};

// ============================================================================
// Store mock
// ============================================================================

const mockStartExam = vi.fn();
const mockSubmitExamAnswer = vi.fn();
const mockToggleQuestionFlag = vi.fn();
const mockExitExam = vi.fn();

let mockActiveExam: ExamState | null = null;

// Like the real store, endExam records the breakdown on the active exam. The
// results screen only renders once it is there.
const mockEndExam = vi.fn((breakdown: ExamBreakdown) => {
  if (mockActiveExam) {
    mockActiveExam = { ...mockActiveExam, submitted: true, breakdown };
  }
});

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn(() => ({
    activeExam: mockActiveExam,
    startExam: mockStartExam,
    submitExamAnswer: mockSubmitExamAnswer,
    toggleQuestionFlag: mockToggleQuestionFlag,
    endExam: mockEndExam,
    exitExam: mockExitExam,
  })),
}));

const mockAddExamAttempt = vi.fn();

// The learner's stored attempts, oldest first. Empty unless a test sets it.
let mockExamAttempts: ExamBreakdown[] = [];

// A stored attempt. The history functions are mocked, so beyond the two fields
// the workspace checks before trusting an attempt, only its identity matters:
// the tests check that the store's history is what the engine is asked about.
const pastAttempt = {
  questionResults: [
    {
      questionId: "q2",
      correct: false,
      userAnswer: 1,
      correctAnswer: 0,
      points: 1,
    },
  ],
  byDomain: unaskedDomains,
} as unknown as ExamBreakdown;

vi.mock("@/store/learningStore", () => ({
  useLearningStore: vi.fn((selector?: unknown) => {
    const state = {
      addExamAttempt: mockAddExamAttempt,
      examAttempts: mockExamAttempts,
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

// ============================================================================
// examEngine mock
// ============================================================================

const mockTimerStart = vi.fn();
const mockTimerStop = vi.fn();
const mockTimerGetTimeElapsed = vi.fn().mockReturnValue(120);

vi.mock("@/utils/examEngine", async () => ({
  loadExamQuestions: vi.fn(),
  selectExamQuestions: vi.fn(),
  selectQuestionsForMode: vi.fn(),
  createExamConfig: vi.fn(), // returns baseConfig by default, set in beforeEach
  // The real guard, not a stub, so the tests exercise the actual shape check
  // the workspace applies to stored history
  isWellFormedExamAttempt: (
    await vi.importActual<typeof import("@/utils/examEngine")>(
      "@/utils/examEngine",
    )
  ).isWellFormedExamAttempt,
  getOutstandingIncorrectQuestionIds: vi.fn().mockReturnValue([]),
  getWeakDomainsFromHistory: vi.fn().mockReturnValue([]),
  calculateExamScore: vi.fn().mockReturnValue({
    totalPoints: 4,
    earnedPoints: 2,
    percentage: 50,
    byDomain: {
      domain1: {
        domainName: "Platform Bring-Up",
        questionsTotal: 1,
        questionsCorrect: 1,
        percentage: 100,
        weight: 31,
      },
      domain2: {
        domainName: "Accelerator Configuration",
        questionsTotal: 1,
        questionsCorrect: 0,
        percentage: 0,
        weight: 5,
      },
      domain3: {
        domainName: "Base Infrastructure",
        questionsTotal: 0,
        questionsCorrect: 0,
        percentage: 0,
        weight: 19,
      },
      domain4: {
        domainName: "Validation & Testing",
        questionsTotal: 1,
        questionsCorrect: 1,
        percentage: 100,
        weight: 33,
      },
      domain5: {
        domainName: "Troubleshooting",
        questionsTotal: 0,
        questionsCorrect: 0,
        percentage: 0,
        weight: 12,
      },
    },
    questionResults: [],
    timeSpent: 0,
  }),
  ExamTimer: vi.fn().mockImplementation(() => ({
    start: mockTimerStart,
    stop: mockTimerStop,
    getTimeElapsed: mockTimerGetTimeElapsed,
  })),
  isExamPassed: vi.fn().mockReturnValue(false),
}));

import {
  loadExamQuestions,
  selectExamQuestions,
  selectQuestionsForMode,
  createExamConfig,
  getOutstandingIncorrectQuestionIds,
  getWeakDomainsFromHistory,
  calculateExamScore,
  ExamTimer,
  isExamPassed,
} from "@/utils/examEngine";

// ============================================================================
// lucide-react mock (explicit named exports to avoid Proxy hang)
// ============================================================================

vi.mock("lucide-react", () => ({
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-X" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Clock" {...props} />
  ),
  Flag: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Flag" {...props} />
  ),
  ChevronLeft: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronLeft" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronRight" {...props} />
  ),
  CheckCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-CheckCircle" {...props} />
  ),
  // Used by ConfirmModal, which the workspace renders for the exit prompt
  AlertTriangle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-AlertTriangle" {...props} />
  ),
}));

// ============================================================================
// Component import (after mocks)
// ============================================================================

import { ExamWorkspace } from "../ExamWorkspace";

// ============================================================================
// Helpers: render with questions loaded
// ============================================================================

type ExamWorkspaceProps = ComponentProps<typeof ExamWorkspace>;

// Renders the workspace and waits for the first question. It leaves
// mockActiveExam alone, so a test can start from null (what the first render
// sees in production) or from whatever exam state it set beforehand.
async function renderLoaded(props: Partial<ExamWorkspaceProps> = {}) {
  vi.mocked(loadExamQuestions).mockResolvedValue(mockQuestions);
  vi.mocked(selectExamQuestions).mockReturnValue(mockQuestions);
  vi.mocked(selectQuestionsForMode).mockReturnValue(mockQuestions);

  const result = render(<ExamWorkspace onClose={vi.fn()} {...props} />);

  await screen.findByText(mockQuestions[0].questionText);

  return result;
}

async function renderWithQuestions(onCloseFn: () => void) {
  // Pre-populate mockActiveExam so the component sees exam state
  mockActiveExam = { ...baseExamState };

  return renderLoaded({ onClose: onCloseFn });
}

// Takes an exam in progress to its last question and submits it, leaving the
// results screen up with whatever calculateExamScore returned.
async function renderSubmitted() {
  mockActiveExam = { ...baseExamState };

  const result = await renderLoaded();

  fireEvent.click(screen.getByText("Next")); // -> q2
  fireEvent.click(screen.getByText("Next")); // -> q3
  fireEvent.click(screen.getByRole("button", { name: "Submit exam" }));

  await screen.findByText("Exam Results");

  return result;
}

// ============================================================================
// Tests
// ============================================================================

describe("ExamWorkspace", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveExam = null;

    // Default: a timed config. Reset here because clearAllMocks keeps
    // implementations, so a test's override would otherwise leak into the next.
    vi.mocked(createExamConfig).mockReturnValue(baseConfig);

    // Default: no exam history. Reset here for the same reason.
    mockExamAttempts = [];
    vi.mocked(getOutstandingIncorrectQuestionIds).mockReturnValue([]);
    vi.mocked(getWeakDomainsFromHistory).mockReturnValue([]);

    // Default: a failed exam. Reset here for the same reason.
    vi.mocked(isExamPassed).mockReturnValue(false);

    // Default: no questions, so the workspace shows the loading state and then
    // settles on the empty state
    vi.mocked(loadExamQuestions).mockResolvedValue([]);
    vi.mocked(selectExamQuestions).mockReturnValue([]);
    vi.mocked(selectQuestionsForMode).mockReturnValue([]);
  });

  // --------------------------------------------------------------------------
  // Basic rendering & loading
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(<ExamWorkspace onClose={onClose} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows loading state initially before questions load", () => {
    render(<ExamWorkspace onClose={onClose} />);
    expect(screen.getByText("Loading exam questions...")).toBeInTheDocument();
  });

  it("renders as a fixed full-screen overlay", () => {
    const { container } = render(<ExamWorkspace onClose={onClose} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("z-50");
  });

  // --------------------------------------------------------------------------
  // After questions load
  // --------------------------------------------------------------------------

  it("shows the exam title after questions load", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("NCP-AII Practice Exam")).toBeInTheDocument();
  });

  it("calls startExam on the store when questions load", async () => {
    await renderWithQuestions(onClose);
    expect(mockStartExam).toHaveBeenCalledWith("ncp-aii-practice");
  });

  // --------------------------------------------------------------------------
  // Exit button
  // --------------------------------------------------------------------------

  it("shows exit button with title 'Exit Exam'", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByTitle("Exit Exam")).toBeInTheDocument();
  });

  it("calls exitExam and onClose when exit button is clicked", async () => {
    await renderWithQuestions(onClose);
    fireEvent.click(screen.getByTitle("Exit Exam"));
    expect(mockExitExam).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Exit confirmation (an exam with answers is not discarded without asking)
  // --------------------------------------------------------------------------

  it("asks before discarding an exam with answers", async () => {
    mockActiveExam = {
      ...baseExamState,
      answers: { q1: 0 },
      answeredQuestions: ["q1"],
    };
    await renderLoaded({ onClose });

    fireEvent.click(screen.getByTitle("Exit Exam"));

    expect(screen.getByText("Leave exam?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your answers so far will be discarded and this attempt will not be scored.",
      ),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Keep going" }));
    expect(screen.queryByText("Leave exam?")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Exit Exam"));
    fireEvent.click(screen.getByRole("button", { name: "Leave exam" }));
    expect(mockExitExam).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exits immediately when nothing has been answered", async () => {
    mockActiveExam = { ...baseExamState, answers: {}, answeredQuestions: [] };
    await renderLoaded({ onClose });
    fireEvent.click(screen.getByTitle("Exit Exam"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the confirmation last inside the exam overlay", async () => {
    mockActiveExam = {
      ...baseExamState,
      answers: { q1: 0 },
      answeredQuestions: ["q1"],
    };
    const { container } = await renderLoaded({ onClose });

    fireEvent.click(screen.getByTitle("Exit Exam"));

    // jsdom cannot check paint order, so pin the placement it depends on: the
    // modal shares the overlay's z-50, and sits above the exam by being inside
    // the overlay and after its content.
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.lastElementChild).toBe(
      screen.getByTestId("confirm-modal-backdrop"),
    );
  });

  // --------------------------------------------------------------------------
  // Question display
  // --------------------------------------------------------------------------

  it("shows the first question text", async () => {
    await renderWithQuestions(onClose);
    expect(
      screen.getByText("What command checks GPU status?"),
    ).toBeInTheDocument();
  });

  it("shows the domain badge for the current question", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("DOMAIN1")).toBeInTheDocument();
  });

  it("shows answer choices for the current question", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
    expect(screen.getByText("lspci")).toBeInTheDocument();
    expect(screen.getByText("dmesg")).toBeInTheDocument();
    expect(screen.getByText("top")).toBeInTheDocument();
  });

  it("renders radio inputs for single-choice questions", async () => {
    await renderWithQuestions(onClose);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(4);
  });

  // --------------------------------------------------------------------------
  // Progress indicator
  // --------------------------------------------------------------------------

  it("shows question progress (current/total)", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Timer display
  // --------------------------------------------------------------------------

  it("shows the timer display with initial 90:00", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("90:00")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Answer selection
  // --------------------------------------------------------------------------

  it("calls submitExamAnswer when an answer is selected", async () => {
    await renderWithQuestions(onClose);
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]); // Click second option (lspci)
    expect(mockSubmitExamAnswer).toHaveBeenCalledWith("q1", 1);
  });

  // --------------------------------------------------------------------------
  // Navigation: Next / Previous
  // --------------------------------------------------------------------------

  it("advances to next question when Next is clicked", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("Next")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    expect(
      screen.getByText("Which tool monitors InfiniBand?"),
    ).toBeInTheDocument();
  });

  it("navigates back when Previous is clicked", async () => {
    await renderWithQuestions(onClose);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
  });

  it("Previous button is disabled on the first question", async () => {
    await renderWithQuestions(onClose);
    const prevButton = screen.getByText("Previous").closest("button")!;
    expect(prevButton).toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // Submit Exam button on last question
  // --------------------------------------------------------------------------

  it("shows Submit Exam button on the last question instead of Next", async () => {
    await renderWithQuestions(onClose);
    fireEvent.click(screen.getByText("Next")); // -> q2
    fireEvent.click(screen.getByText("Next")); // -> q3
    expect(screen.getByText(/Question 3 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Submit Exam")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Sidebar question navigation
  // --------------------------------------------------------------------------

  it("shows question navigation grid in sidebar", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("QUESTION NAVIGATION")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("navigates to a specific question via sidebar button", async () => {
    await renderWithQuestions(onClose);
    const navButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent === "3");
    fireEvent.click(navButtons[0]);
    expect(screen.getByText(/Question 3 of 3/)).toBeInTheDocument();
    expect(
      screen.getByText("Select all DCGM diagnostic levels."),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Multiple-select question type
  // --------------------------------------------------------------------------

  it("renders checkboxes and helper text for multiple-select questions", async () => {
    await renderWithQuestions(onClose);
    fireEvent.click(screen.getByText("Next")); // -> q2
    fireEvent.click(screen.getByText("Next")); // -> q3
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(4);
    expect(screen.getByText("Select all that apply")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Flag for review
  // --------------------------------------------------------------------------

  it("shows Flag for Review button in sidebar", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("Flag for Review")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Answered status
  // --------------------------------------------------------------------------

  it("shows 'Not answered' status for unanswered questions", async () => {
    await renderWithQuestions(onClose);
    expect(screen.getByText("Not answered")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // ExamTimer lifecycle
  // --------------------------------------------------------------------------

  it("creates and starts an ExamTimer on mount", async () => {
    await renderWithQuestions(onClose);
    expect(ExamTimer).toHaveBeenCalledWith(90 * 60);
    expect(mockTimerStart).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Timer stop on exit
  // --------------------------------------------------------------------------

  it("stops the timer when exit button is clicked", async () => {
    await renderWithQuestions(onClose);
    fireEvent.click(screen.getByTitle("Exit Exam"));
    expect(mockTimerStop).toHaveBeenCalledTimes(1);
  });

  it("stops the timer on unmount", async () => {
    const { unmount } = await renderLoaded();
    unmount();
    expect(mockTimerStop).toHaveBeenCalled();
  });

  it("does not start the exam or a timer when unmounted before questions load", async () => {
    let resolveQuestions: (questions: ExamQuestion[]) => void = () => undefined;
    const pendingQuestions = new Promise<ExamQuestion[]>((resolve) => {
      resolveQuestions = resolve;
    });
    vi.mocked(loadExamQuestions).mockReturnValue(pendingQuestions);
    vi.mocked(selectQuestionsForMode).mockReturnValue(mockQuestions);

    const { unmount } = render(<ExamWorkspace onClose={onClose} />);
    unmount();

    // The component awaited this promise first, so by the time the await below
    // returns, everything it does after the questions arrive has already run.
    await act(async () => {
      resolveQuestions(mockQuestions);
      await pendingQuestions;
    });

    expect(mockStartExam).not.toHaveBeenCalled();
    expect(mockTimerStart).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Timer expiry (auto-submit)
  // --------------------------------------------------------------------------

  it("auto-submits with the loaded questions when the timer expires", async () => {
    mockActiveExam = null; // first render, as in production
    const { rerender } = await renderLoaded({ mode: "quick-quiz" });
    mockActiveExam = {
      ...baseExamState,
      answers: { q1: 0 },
      answeredQuestions: ["q1"],
    };
    rerender(<ExamWorkspace onClose={vi.fn()} mode="quick-quiz" />);

    const onExpire = mockTimerStart.mock.calls[0][1] as () => void;
    act(() => onExpire());

    await waitFor(() => expect(mockAddExamAttempt).toHaveBeenCalledTimes(1));
    expect(vi.mocked(calculateExamScore).mock.calls[0][0]).toHaveLength(
      mockQuestions.length,
    );
    expect(screen.getByText("Exam Results")).toBeInTheDocument();
  });

  it("auto-submits an untouched exam", async () => {
    mockActiveExam = null;
    const { rerender } = await renderLoaded({ mode: "quick-quiz" });
    mockActiveExam = { ...baseExamState, answers: {}, answeredQuestions: [] };
    rerender(<ExamWorkspace onClose={vi.fn()} mode="quick-quiz" />);

    act(() => (mockTimerStart.mock.calls[0][1] as () => void)());

    await waitFor(() =>
      expect(screen.getByText("Exam Results")).toBeInTheDocument(),
    );
    // Scored from the exam's own, empty, answers
    expect(vi.mocked(calculateExamScore).mock.calls[0][1]).toEqual({});
  });

  // --------------------------------------------------------------------------
  // Untimed modes
  // --------------------------------------------------------------------------

  it("shows 'No time limit' instead of a countdown for untimed modes", async () => {
    // Held for the whole test rather than Once, so every render sees the
    // untimed config. beforeEach puts the timed default back afterwards.
    vi.mocked(createExamConfig).mockReturnValue({
      ...baseConfig,
      mode: "review-mode",
      timeLimitMinutes: 0,
    });
    await renderLoaded({ mode: "review-mode" });
    expect(await screen.findByText("No time limit")).toBeInTheDocument();
    expect(screen.queryByText("999:00")).toBeNull();
  });

  it("never arms expiry or the low-time warning for untimed modes", async () => {
    vi.mocked(createExamConfig).mockReturnValue({
      ...baseConfig,
      mode: "review-mode",
      timeLimitMinutes: 0,
    });
    await renderLoaded({ mode: "review-mode" });

    const [onTick, onExpire] = mockTimerStart.mock.calls[0] as [
      ((remaining: number) => void) | undefined,
      (() => void) | undefined,
    ];
    expect(onExpire).toBeUndefined();

    // One minute left would put a timed exam's clock in its red state
    act(() => onTick?.(60));
    const clock = screen.getByText("No time limit").parentElement;
    expect(clock).toHaveClass("bg-gray-700");
    expect(clock).not.toHaveClass("bg-red-900");
  });

  // --------------------------------------------------------------------------
  // Review Mistakes / Weak Area Focus: config built from exam history
  // --------------------------------------------------------------------------

  it("builds the review config from exam history", async () => {
    mockExamAttempts = [pastAttempt];
    vi.mocked(getOutstandingIncorrectQuestionIds).mockReturnValue(["q2"]);
    vi.mocked(getWeakDomainsFromHistory).mockReturnValue(["domain2"]);

    await renderLoaded({ mode: "review-mode" });

    expect(getOutstandingIncorrectQuestionIds).toHaveBeenCalledWith([
      pastAttempt,
    ]);
    expect(getWeakDomainsFromHistory).toHaveBeenCalledWith([pastAttempt]);
    expect(createExamConfig).toHaveBeenCalledWith("review-mode", {
      reviewQuestionIds: ["q2"],
      weakDomains: ["domain2"],
    });
    // Questions are selected with that very config, not one built separately
    expect(vi.mocked(selectQuestionsForMode).mock.calls[0][1]).toBe(
      vi.mocked(createExamConfig).mock.results[0].value,
    );
  });

  it("omits weakDomains when history has none so the engine default applies", async () => {
    await renderLoaded({ mode: "weak-area-focus" });

    expect(createExamConfig).toHaveBeenCalledWith("weak-area-focus", {
      reviewQuestionIds: [],
      weakDomains: undefined,
    });
  });

  it("ignores malformed history entries when building the config", async () => {
    // Attempts merged in from cloud sync are not shape-checked on the way in
    mockExamAttempts = [
      pastAttempt,
      {},
      null,
      // Right outer shape, unreadable entry inside
      { questionResults: [null], byDomain: unaskedDomains },
    ] as unknown as ExamBreakdown[];

    await renderLoaded({ mode: "review-mode" });

    expect(screen.getByText(mockQuestions[0].questionText)).toBeInTheDocument();
    expect(getOutstandingIncorrectQuestionIds).toHaveBeenCalledWith([
      pastAttempt,
    ]);
    expect(getWeakDomainsFromHistory).toHaveBeenCalledWith([pastAttempt]);
  });

  it("treats a missing history as no history", async () => {
    mockExamAttempts = undefined as unknown as ExamBreakdown[];

    await renderLoaded();

    expect(screen.getByText(mockQuestions[0].questionText)).toBeInTheDocument();
    expect(getOutstandingIncorrectQuestionIds).toHaveBeenCalledWith([]);
    expect(getWeakDomainsFromHistory).toHaveBeenCalledWith([]);
  });

  // --------------------------------------------------------------------------
  // Empty state (a mode with no questions to show)
  // --------------------------------------------------------------------------

  it("shows the empty state when selection returns no questions", async () => {
    vi.mocked(selectQuestionsForMode).mockReturnValue([]);
    render(<ExamWorkspace onClose={onClose} mode="review-mode" />);

    expect(
      await screen.findByText("Nothing to review yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review Mistakes fills in after you miss a question in an exam or quiz.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading exam questions...")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockExitExam).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not start the exam or the timer when there are no questions", async () => {
    vi.mocked(selectQuestionsForMode).mockReturnValue([]);
    render(<ExamWorkspace onClose={vi.fn()} mode="review-mode" />);
    await screen.findByText("Nothing to review yet");
    expect(mockStartExam).not.toHaveBeenCalled();
    expect(ExamTimer).not.toHaveBeenCalled();
    expect(mockTimerStart).not.toHaveBeenCalled();
  });

  it("presents the empty state as a labelled dialog with its button focused", async () => {
    vi.mocked(selectQuestionsForMode).mockReturnValue([]);
    render(<ExamWorkspace onClose={onClose} mode="review-mode" />);

    const dialog = await screen.findByRole("dialog", {
      name: "Nothing to review yet",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("shows a generic empty state for modes other than Review Mistakes", async () => {
    vi.mocked(selectQuestionsForMode).mockReturnValue([]);
    render(<ExamWorkspace onClose={onClose} mode="weak-area-focus" />);

    expect(
      await screen.findByRole("dialog", { name: "No questions available" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This mode has no questions to show right now."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nothing to review yet")).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Results: domains the exam asked nothing about
  // --------------------------------------------------------------------------

  it("leaves domains with no questions out of the results", async () => {
    // A Review Mistakes session: three questions, all in one domain, all right
    vi.mocked(calculateExamScore).mockReturnValueOnce({
      totalPoints: 3,
      earnedPoints: 3,
      percentage: 100,
      byDomain: {
        ...unaskedDomains,
        domain2: {
          domainName: "Accelerator Configuration",
          questionsTotal: 3,
          questionsCorrect: 3,
          percentage: 100,
          weight: 5,
        },
      },
      questionResults: [],
      timeSpent: 0,
    });
    vi.mocked(isExamPassed).mockReturnValue(true);

    await renderSubmitted();

    expect(screen.getByText("Accelerator Configuration")).toBeInTheDocument();
    expect(screen.getByText("3 / 3 correct")).toBeInTheDocument();

    [
      "Platform Bring-Up",
      "Base Infrastructure",
      "Validation & Testing",
      "Troubleshooting",
    ].forEach((unasked) => {
      expect(screen.queryByText(unasked)).toBeNull();
    });
    expect(screen.queryByText("0 / 0 correct")).toBeNull();

    // Nothing that was asked went badly, so there is nothing to recommend
    expect(screen.queryByText("Recommended Commands to Practice")).toBeNull();
  });

  it("still flags a low-scoring domain that had questions", async () => {
    vi.mocked(calculateExamScore).mockReturnValueOnce({
      totalPoints: 5,
      earnedPoints: 3,
      percentage: 60,
      byDomain: {
        ...unaskedDomains,
        domain1: {
          domainName: "Platform Bring-Up",
          questionsTotal: 3,
          questionsCorrect: 3,
          percentage: 100,
          weight: 31,
        },
        domain2: {
          domainName: "Accelerator Configuration",
          questionsTotal: 2,
          questionsCorrect: 0,
          percentage: 0,
          weight: 5,
        },
      },
      questionResults: [],
      timeSpent: 0,
    });

    await renderSubmitted();

    // The weak-area list names the missed domain and only that one
    const weakAreas = within(
      screen.getByText("Areas for Improvement").parentElement as HTMLElement,
    );
    expect(weakAreas.getAllByRole("listitem")).toHaveLength(1);
    expect(
      weakAreas.getByText("• Accelerator Configuration (0%)"),
    ).toBeInTheDocument();

    // So do the practice recommendations
    const practice = within(
      screen.getByText("Recommended Commands to Practice")
        .parentElement as HTMLElement,
    );
    expect(practice.getAllByRole("heading", { level: 4 })).toHaveLength(1);
    expect(practice.getByText("Accelerator Configuration")).toBeInTheDocument();
    expect(practice.getByText("nvidia-smi topo -m")).toBeInTheDocument();

    // Never asked about, so neither weak nor recommended
    expect(screen.queryByText("Base Infrastructure")).toBeNull();
    expect(screen.queryByText("sinfo -Nel")).toBeNull();
  });
});
