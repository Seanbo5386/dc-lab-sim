import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => ({
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-X" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronRight" {...props} />
  ),
  ChevronDown: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronDown" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Check" {...props} />
  ),
  HelpCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-HelpCircle" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Clock" {...props} />
  ),
  Lightbulb: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Lightbulb" {...props} />
  ),
  CheckCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-CheckCircle" {...props} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Circle" {...props} />
  ),
  Eye: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Eye" {...props} />
  ),
  BookOpen: (props: Record<string, unknown>) => (
    <svg data-testid="icon-BookOpen" {...props} />
  ),
  Lock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Lock" {...props} />
  ),
  Wrench: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Wrench" {...props} />
  ),
}));

// Mock child components
vi.mock("../NarrativeIntro", () => ({
  NarrativeIntro: ({ onBegin }: { onBegin: () => void }) => (
    <div data-testid="narrative-intro">
      <button data-testid="begin-btn" onClick={() => onBegin()}>
        Begin
      </button>
    </div>
  ),
}));
vi.mock("../NarrativeResolution", () => ({
  NarrativeResolution: () => <div data-testid="narrative-resolution" />,
}));
vi.mock("../InlineQuiz", () => ({
  InlineQuiz: ({ onComplete }: { onComplete: (correct: boolean) => void }) => (
    <div data-testid="inline-quiz">
      <button onClick={() => onComplete(true)}>Answer Quiz</button>
    </div>
  ),
}));

// Mock utilities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAvailableHints = vi.fn<any[], any>(() => null);
vi.mock("@/utils/hintManager", () => ({
  HintManager: {
    getAvailableHints: (...args: unknown[]) => mockGetAvailableHints(...args),
  },
}));
vi.mock("@/utils/commandValidator", () => ({
  validateCommandExecuted: () => false,
}));
vi.mock("@/utils/scenarioVisualizationMap", () => ({
  getVisualizationContext: () => null,
}));
vi.mock("@/utils/tierProgressionEngine", () => ({
  isTierUnlocked: () => true,
}));
vi.mock("@/data/commandFamilies.json", () => ({
  default: { families: [] },
}));

// ============================================================================
// Store Mock
// ============================================================================

const mockCompleteScenarioStep = vi.fn();

function makeMockStore(
  stepTypeOverrides: Partial<{
    stepType: string;
    conceptContent: string;
    tips: string[];
    observeCommand: string;
    narrativeQuiz:
      | {
          question: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }
      | undefined;
  }> = {},
) {
  const step = {
    id: "step-1",
    stepType: stepTypeOverrides.stepType || "command",
    title: "Test Step",
    description: "Test situation",
    objectives: ["Do something"],
    expectedCommands:
      stepTypeOverrides.stepType === "command" ? ["nvidia-smi"] : [],
    validationRules:
      stepTypeOverrides.stepType === "command"
        ? [
            {
              type: "command-executed",
              description: "Run nvidia-smi",
              expectedCommands: ["nvidia-smi"],
            },
          ]
        : [],
    hints: stepTypeOverrides.stepType === "command" ? ["Try nvidia-smi"] : [],
    estimatedDuration: 5,
    conceptContent: stepTypeOverrides.conceptContent,
    tips: stepTypeOverrides.tips,
    observeCommand: stepTypeOverrides.observeCommand,
    narrativeQuiz: stepTypeOverrides.narrativeQuiz,
  };

  return {
    activeScenario: {
      id: "test-scenario",
      title: "Test Scenario",
      domain: "domain1",
      difficulty: "beginner",
      description: "Test",
      learningObjectives: ["Learn stuff"],
      faults: [],
      steps: [step],
      successCriteria: ["Complete all steps"],
      estimatedTime: 10,
      tier: 1,
      toolHints: false,
      narrative: { hook: "Hook", setting: "Setting", resolution: "Resolution" },
    },
    scenarioProgress: {
      "test-scenario": {
        scenarioId: "test-scenario",
        currentStepIndex: 0,
        completed: false,
        steps: [
          {
            stepId: "step-1",
            completed: false,
            validationsPassed: 0,
            validationsTotal: 0,
            hintsRevealed: 0,
            commandsExecuted: [],
            failedAttempts: 0,
            revealedHintIds: [],
          },
        ],
        startTime: Date.now(),
        totalTimeSpent: 0,
        hintsUsed: 0,
        validationAttempts: 0,
        validationFailures: 0,
      },
    },
    exitScenario: vi.fn(),
    completeScenarioStep: mockCompleteScenarioStep,
    recordQuizResult: vi.fn(),
    quizResults: {},
    revealHint: vi.fn(),
    stepValidation: {},
    validationConfig: { enabled: false },
    setRequestedVisualizationView: vi.fn(),
    labPanelVisible: true,
    setLabPanelVisible: vi.fn(),
  };
}

let currentMockStore = makeMockStore();

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn(() => currentMockStore),
}));

vi.mock("@/store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn(() => ({
    toolsUsed: {},
    familyQuizScores: {},
    unlockedTiers: {},
    tierProgress: {},
    explanationGateResults: {},
  })),
}));

// matchMedia mock
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// Import after mocks
// ============================================================================

import { LabWorkspace } from "../LabWorkspace";

// Helper: render and dismiss the narrative intro
function renderAndBegin() {
  const result = render(<LabWorkspace onClose={vi.fn()} />);
  // Dismiss the narrative intro to see step content
  const beginBtn = screen.queryByTestId("begin-btn");
  if (beginBtn) {
    fireEvent.click(beginBtn);
  }
  return result;
}

// ============================================================================
// Tests
// ============================================================================

describe("LabWorkspace Step Types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockStore = makeMockStore();
  });

  // --------------------------------------------------------------------------
  // Command step (default) — regression
  // --------------------------------------------------------------------------

  it("renders command step without type badge", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    renderAndBegin();

    // Should NOT show CONCEPT or OBSERVE badges
    expect(screen.queryByText("CONCEPT")).not.toBeInTheDocument();
    expect(screen.queryByText("OBSERVE")).not.toBeInTheDocument();

    // Should show terminal instructions
    expect(screen.getByText("Use the Terminal")).toBeInTheDocument();

    // Should show OBJECTIVES section
    expect(screen.getByText("OBJECTIVES")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Concept step
  // --------------------------------------------------------------------------

  it("renders concept step with CONCEPT badge and content", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "This is a concept explanation about GPUs.",
      tips: ["Tip 1: Check the manual", "Tip 2: Use nvidia-smi"],
    });
    renderAndBegin();

    // Should show CONCEPT badge
    expect(screen.getByText("CONCEPT")).toBeInTheDocument();

    // Should show concept content
    expect(
      screen.getByText("This is a concept explanation about GPUs."),
    ).toBeInTheDocument();

    // Should show tips
    expect(screen.getByText("TIPS")).toBeInTheDocument();
    expect(screen.getByText("Tip 1: Check the manual")).toBeInTheDocument();
    expect(screen.getByText("Tip 2: Use nvidia-smi")).toBeInTheDocument();
  });

  it("hides command-only sections for concept steps", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
    });
    renderAndBegin();

    // Should NOT show terminal instructions
    expect(screen.queryByText("Use the Terminal")).not.toBeInTheDocument();

    // Should NOT show OBJECTIVES section (concept steps don't show it)
    expect(screen.queryByText("OBJECTIVES")).not.toBeInTheDocument();

    // Should NOT show YOUR TASK box
    expect(screen.queryByText("YOUR TASK")).not.toBeInTheDocument();
  });

  it("shows Continue button for concept steps", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
    });
    renderAndBegin();

    const continueBtn = screen.getByTestId("concept-continue-btn");
    expect(continueBtn).toBeInTheDocument();
    expect(continueBtn).toHaveTextContent("Continue");
  });

  it("Continue button calls completeScenarioStep for concept steps", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
    });
    renderAndBegin();

    fireEvent.click(screen.getByTestId("concept-continue-btn"));
    expect(mockCompleteScenarioStep).toHaveBeenCalledWith(
      "test-scenario",
      "step-1",
    );
  });

  // --------------------------------------------------------------------------
  // Observe step
  // --------------------------------------------------------------------------

  it("renders observe step with OBSERVE badge and command", () => {
    currentMockStore = makeMockStore({
      stepType: "observe",
      observeCommand: "nvidia-smi -q",
    });
    renderAndBegin();

    // Should show OBSERVE badge
    expect(screen.getByText("OBSERVE")).toBeInTheDocument();

    // Should show the observe command
    expect(screen.getByText("$ nvidia-smi -q")).toBeInTheDocument();

    // Should show review instruction
    expect(
      screen.getByText(
        "Review the output above and click Continue when ready.",
      ),
    ).toBeInTheDocument();
  });

  it("hides command-only sections for observe steps", () => {
    currentMockStore = makeMockStore({
      stepType: "observe",
      observeCommand: "ls -la",
    });
    renderAndBegin();

    // Should NOT show terminal instructions
    expect(screen.queryByText("Use the Terminal")).not.toBeInTheDocument();

    // Should NOT show OBJECTIVES section
    expect(screen.queryByText("OBJECTIVES")).not.toBeInTheDocument();

    // Should NOT show YOUR TASK box
    expect(screen.queryByText("YOUR TASK")).not.toBeInTheDocument();
  });

  it("shows Continue button for observe steps", () => {
    currentMockStore = makeMockStore({
      stepType: "observe",
      observeCommand: "ls -la",
    });
    renderAndBegin();

    const continueBtn = screen.getByTestId("concept-continue-btn");
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);
    expect(mockCompleteScenarioStep).toHaveBeenCalledWith(
      "test-scenario",
      "step-1",
    );
  });

  // --------------------------------------------------------------------------
  // Quiz bypass prevention — Continue button hidden when quiz exists
  // --------------------------------------------------------------------------

  it("hides Continue button for concept steps with quiz", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
      narrativeQuiz: {
        question: "What is the answer?",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "B is correct.",
      },
    });
    renderAndBegin();

    // Continue button should NOT render since quiz exists
    expect(
      screen.queryByTestId("concept-continue-btn"),
    ).not.toBeInTheDocument();
  });

  it("shows Continue button for concept steps without quiz", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
    });
    renderAndBegin();

    // Continue button should render
    expect(screen.getByTestId("concept-continue-btn")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // InlineQuiz for concept/observe steps (shows immediately)
  // --------------------------------------------------------------------------

  it("shows InlineQuiz immediately for concept steps with quiz", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
      narrativeQuiz: {
        question: "What is the answer?",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "B is correct.",
      },
    });
    renderAndBegin();

    // Quiz should be visible even though step is NOT completed
    expect(screen.getByTestId("inline-quiz")).toBeInTheDocument();
  });

  it("shows InlineQuiz immediately for observe steps with quiz", () => {
    currentMockStore = makeMockStore({
      stepType: "observe",
      observeCommand: "nvidia-smi",
      narrativeQuiz: {
        question: "What did you see?",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "A is correct.",
      },
    });
    renderAndBegin();

    expect(screen.getByTestId("inline-quiz")).toBeInTheDocument();
  });

  it("does NOT show InlineQuiz for incomplete command steps", () => {
    currentMockStore = makeMockStore({
      stepType: "command",
      narrativeQuiz: {
        question: "Quiz?",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "A.",
      },
    });
    renderAndBegin();

    // Quiz should NOT be visible since command step is not completed
    expect(screen.queryByTestId("inline-quiz")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Show Answer button
  // --------------------------------------------------------------------------

  it("does NOT show Show Answer button when enhanced hints remain unrevealed", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    mockGetAvailableHints.mockReturnValue({
      availableHints: [],
      nextHint: { id: "h2", level: 2, message: "hint 2" },
      allHints: [
        { id: "h1", level: 1, message: "hint 1" },
        { id: "h2", level: 2, message: "hint 2" },
      ],
      revealedCount: 1,
      totalCount: 2,
    });
    renderAndBegin();

    expect(screen.queryByTestId("show-answer-btn")).not.toBeInTheDocument();
  });

  it("shows Show Answer button when all enhanced hints are revealed and step is not completed", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    mockGetAvailableHints.mockReturnValue({
      availableHints: [],
      nextHint: null,
      allHints: [
        { id: "h1", level: 1, message: "hint 1" },
        { id: "h2", level: 2, message: "hint 2" },
      ],
      revealedCount: 2,
      totalCount: 2,
    });
    renderAndBegin();

    expect(screen.getByTestId("show-answer-btn")).toBeInTheDocument();
    expect(screen.getByText("Stuck? Show the answer")).toBeInTheDocument();
  });

  it("clicking Show Answer reveals expected commands", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    mockGetAvailableHints.mockReturnValue({
      availableHints: [],
      nextHint: null,
      allHints: [{ id: "h1", level: 1, message: "hint 1" }],
      revealedCount: 1,
      totalCount: 1,
    });
    renderAndBegin();

    fireEvent.click(screen.getByTestId("show-answer-btn"));

    // Should show expected command
    expect(screen.getByText("$ nvidia-smi")).toBeInTheDocument();
    // Should show skip button
    expect(screen.getByTestId("skip-step-btn")).toBeInTheDocument();
    expect(screen.getByText("Skip this step")).toBeInTheDocument();
  });

  it("clicking Skip Step calls completeScenarioStep", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    mockGetAvailableHints.mockReturnValue({
      availableHints: [],
      nextHint: null,
      allHints: [{ id: "h1", level: 1, message: "hint 1" }],
      revealedCount: 1,
      totalCount: 1,
    });
    renderAndBegin();

    fireEvent.click(screen.getByTestId("show-answer-btn"));
    fireEvent.click(screen.getByTestId("skip-step-btn"));

    expect(mockCompleteScenarioStep).toHaveBeenCalledWith(
      "test-scenario",
      "step-1",
    );
  });

  it("shows Show Answer button via legacy hint path when all legacy hints are revealed", () => {
    currentMockStore = makeMockStore({ stepType: "command" });
    // hintEvaluation is null (mockGetAvailableHints returns null by default)
    mockGetAvailableHints.mockReturnValue(null);
    renderAndBegin();

    // Legacy hints exist (step.hints = ["Try nvidia-smi"]) but none revealed yet
    expect(screen.queryByTestId("show-answer-btn")).not.toBeInTheDocument();

    // Reveal the single legacy hint
    fireEvent.click(screen.getByText("Reveal Next Hint"));

    // Now all legacy hints are revealed → show-answer button should appear
    expect(screen.getByTestId("show-answer-btn")).toBeInTheDocument();
    expect(screen.getByText("Stuck? Show the answer")).toBeInTheDocument();
  });

  it("does NOT show Show Answer button on concept steps", () => {
    currentMockStore = makeMockStore({
      stepType: "concept",
      conceptContent: "Concept.",
    });
    mockGetAvailableHints.mockReturnValue(null);
    renderAndBegin();

    expect(screen.queryByTestId("show-answer-btn")).not.toBeInTheDocument();
  });

  it("does NOT show Show Answer button on observe steps", () => {
    currentMockStore = makeMockStore({
      stepType: "observe",
      observeCommand: "nvidia-smi",
    });
    mockGetAvailableHints.mockReturnValue(null);
    renderAndBegin();

    expect(screen.queryByTestId("show-answer-btn")).not.toBeInTheDocument();
  });
});
