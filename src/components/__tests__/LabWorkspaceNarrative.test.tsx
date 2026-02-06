import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LabWorkspace } from "../LabWorkspace";

// Mock window.matchMedia for useMediaQuery hook
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

// Mock scenario with narrative data
const mockNarrativeScenario = {
  id: "test-narrative",
  title: "The Test Mission",
  domain: "domain1",
  difficulty: "intermediate",
  description: "Test scenario setting",
  learningObjectives: ["Learn testing"],
  faults: [],
  steps: [
    {
      id: "step-1",
      title: "First step task",
      description: "You arrive at the datacenter",
      objectives: ["Run nvidia-smi to check GPUs"],
      expectedCommands: ["nvidia-smi"],
      validationRules: [],
      hints: ["Try nvidia-smi"],
      estimatedDuration: 3,
      narrativeQuiz: {
        question: "What does nvidia-smi show?",
        options: ["GPU info", "CPU info", "Disk info", "Network info"],
        correctIndex: 0,
        explanation: "nvidia-smi shows GPU information.",
      },
    },
    {
      id: "step-2",
      title: "Second step task",
      description: "Check the InfiniBand fabric",
      objectives: ["Run ibstat"],
      expectedCommands: ["ibstat"],
      validationRules: [],
      hints: ["Try ibstat"],
      estimatedDuration: 3,
    },
  ],
  successCriteria: ["Complete all steps"],
  estimatedTime: 10,
  commandFamilies: ["gpu-monitoring"],
  tier: 1 as const,
  toolHints: true,
  tags: ["narrative"],
  narrative: {
    hook: "A critical alert just fired across the datacenter.",
    setting: "You are the on-call engineer for a 16-node DGX cluster.",
    resolution: "You successfully diagnosed and resolved the issue.",
  },
};

// Mock scenario without narrative
const mockStandardScenario = {
  ...mockNarrativeScenario,
  id: "test-standard",
  title: "Standard Lab",
  narrative: undefined,
  steps: [
    {
      ...mockNarrativeScenario.steps[0],
      narrativeQuiz: undefined,
    },
    mockNarrativeScenario.steps[1],
  ],
};

const mockProgress = {
  currentStepIndex: 0,
  completed: false,
  steps: [
    { completed: false, revealedHintIds: [] },
    { completed: false, revealedHintIds: [] },
  ],
};

const mockCompletedProgress = {
  currentStepIndex: 1,
  completed: true,
  steps: [
    { completed: true, revealedHintIds: [] },
    { completed: true, revealedHintIds: [] },
  ],
};

const mockStepCompletedProgress = {
  currentStepIndex: 0,
  completed: false,
  steps: [
    { completed: true, revealedHintIds: [] },
    { completed: false, revealedHintIds: [] },
  ],
};

let mockStoreState: Record<string, unknown>;

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: Object.assign(
    vi.fn((selector?: (state: unknown) => unknown) => {
      return selector ? selector(mockStoreState) : mockStoreState;
    }),
    {
      getState: vi.fn(() => mockStoreState),
    },
  ),
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

vi.mock("@/utils/hintManager", () => ({
  HintManager: {
    getAvailableHints: vi.fn(() => ({
      allHints: [],
      revealedCount: 0,
      totalCount: 0,
      nextHint: null,
    })),
  },
}));

vi.mock("@/utils/commandValidator", () => ({
  commandTracker: {
    getExecutedCommands: vi.fn(() => []),
  },
}));

vi.mock("@/utils/scenarioVisualizationMap", () => ({
  getVisualizationContext: vi.fn(() => null),
}));

vi.mock("@/data/commandFamilies.json", () => ({
  default: { families: [] },
}));

describe("LabWorkspace Narrative Integration", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      activeScenario: mockNarrativeScenario,
      scenarioProgress: { "test-narrative": mockProgress },
      exitScenario: vi.fn(),
      completeScenarioStep: vi.fn(),
      revealHint: vi.fn(),
      stepValidation: {},
      validationConfig: { enabled: false },
      setRequestedVisualizationView: vi.fn(),
      labPanelVisible: true,
      setLabPanelVisible: vi.fn(),
    };
  });

  it("should show NarrativeIntro for narrative scenarios", () => {
    render(<LabWorkspace onClose={onClose} />);
    expect(screen.getByText(/critical alert just fired/i)).toBeInTheDocument();
    expect(screen.getByText("Begin Mission")).toBeInTheDocument();
  });

  it("should not show NarrativeIntro for standard scenarios", () => {
    mockStoreState = {
      ...mockStoreState,
      activeScenario: mockStandardScenario,
      scenarioProgress: { "test-standard": mockProgress },
    };
    render(<LabWorkspace onClose={onClose} />);
    expect(screen.queryByText("Begin Mission")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("First step task").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("should show step content after clicking Begin Mission", () => {
    render(<LabWorkspace onClose={onClose} />);
    fireEvent.click(screen.getByText("Begin Mission"));
    expect(screen.queryByText("Begin Mission")).not.toBeInTheDocument();
    expect(screen.getByText("SITUATION")).toBeInTheDocument();
    expect(screen.getByText("YOUR TASK")).toBeInTheDocument();
  });

  it("should show narrative situation and task styling for narrative steps", () => {
    render(<LabWorkspace onClose={onClose} />);
    fireEvent.click(screen.getByText("Begin Mission"));
    expect(
      screen.getByText("You arrive at the datacenter"),
    ).toBeInTheDocument();
    // Task text appears in both TASK section and OBJECTIVES
    expect(
      screen.getAllByText("Run nvidia-smi to check GPUs").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("should show InlineQuiz when step is completed and has quiz", () => {
    mockStoreState = {
      ...mockStoreState,
      scenarioProgress: { "test-narrative": mockStepCompletedProgress },
    };
    render(<LabWorkspace onClose={onClose} />);
    // Dismiss intro first
    fireEvent.click(screen.getByText("Begin Mission"));
    expect(screen.getByText("What does nvidia-smi show?")).toBeInTheDocument();
  });

  it("should show NarrativeResolution when scenario is completed", () => {
    mockStoreState = {
      ...mockStoreState,
      scenarioProgress: { "test-narrative": mockCompletedProgress },
    };
    render(<LabWorkspace onClose={onClose} />);
    expect(screen.getByText(/successfully diagnosed/i)).toBeInTheDocument();
    expect(screen.getByText("Mission Complete")).toBeInTheDocument();
    expect(screen.getByText("Exit Mission")).toBeInTheDocument();
  });

  it("should hide footer when showing NarrativeIntro", () => {
    render(<LabWorkspace onClose={onClose} />);
    expect(
      screen.queryByText("Complete Step in Terminal"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Progress is automatically saved"),
    ).not.toBeInTheDocument();
  });

  it("should hide footer when showing NarrativeResolution", () => {
    mockStoreState = {
      ...mockStoreState,
      scenarioProgress: { "test-narrative": mockCompletedProgress },
    };
    render(<LabWorkspace onClose={onClose} />);
    expect(
      screen.queryByText("Progress is automatically saved"),
    ).not.toBeInTheDocument();
  });

  it("should use mission terminology in buttons for narrative scenarios", () => {
    mockStoreState = {
      ...mockStoreState,
      scenarioProgress: {
        "test-narrative": {
          currentStepIndex: 1,
          completed: false,
          steps: [
            { completed: true, revealedHintIds: [] },
            { completed: true, revealedHintIds: [] },
          ],
        },
      },
    };
    render(<LabWorkspace onClose={onClose} />);
    // Dismiss intro
    fireEvent.click(screen.getByText("Begin Mission"));
    expect(screen.getByText("Complete Mission")).toBeInTheDocument();
  });
});
