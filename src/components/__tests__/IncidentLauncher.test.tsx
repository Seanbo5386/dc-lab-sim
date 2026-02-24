import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Zap: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Zap" {...props} />
  ),
  Lock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Lock" {...props} />
  ),
  Trophy: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Trophy" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronRight" {...props} />
  ),
}));

// Mock DifficultyScaler
vi.mock("@/simulation/difficultyScaler", () => ({
  DifficultyScaler: vi.fn().mockImplementation((rating: number) => ({
    getRecommendedDifficulty: () => {
      if (rating < 900) return "beginner";
      if (rating < 1400) return "intermediate";
      return "advanced";
    },
  })),
}));

// Mutable mock state
let mockLearningState: {
  incidentRating: number;
  incidentHistory: { templateId: string; score: number; date: number }[];
  familyQuizScores: Record<
    string,
    { passed: boolean; score: number; attempts: number }
  >;
};

let mockCompletedScenarios: string[];

vi.mock("@/store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn(
    (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(mockLearningState) : mockLearningState,
  ),
}));

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { completedScenarios: mockCompletedScenarios };
      return selector ? selector(state) : state;
    },
  ),
}));

// ============================================================================
// Import component under test AFTER mocks are set up
// ============================================================================
import { IncidentLauncher } from "../IncidentLauncher";

// ============================================================================
// Default props factory
// ============================================================================
function defaultProps() {
  return {
    onStartIncident: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================
describe("IncidentLauncher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletedScenarios = [
      "scenario-1",
      "scenario-2",
      "scenario-3",
      "scenario-4",
    ];
    mockLearningState = {
      incidentRating: 1000,
      incidentHistory: [],
      familyQuizScores: {
        "gpu-monitoring": { passed: true, score: 90, attempts: 1 },
        "infiniband-tools": { passed: true, score: 85, attempts: 2 },
      },
    };
  });

  // --------------------------------------------------------------------------
  // 1. Renders "Live Incidents" heading
  // --------------------------------------------------------------------------
  it('renders "Live Incidents" heading', () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(screen.getByText("Live Incidents")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 2. Shows current difficulty rating and recommended difficulty label
  // --------------------------------------------------------------------------
  it("shows current difficulty rating and recommended difficulty label", () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText("intermediate")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 3. Shows "Start Incident" button
  // --------------------------------------------------------------------------
  it('shows "Start Incident" button', () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(
      screen.getByRole("button", { name: /start incident/i }),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. Calls onStartIncident with recommended difficulty when clicked
  // --------------------------------------------------------------------------
  it("calls onStartIncident with recommended difficulty when clicked", () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    const button = screen.getByRole("button", { name: /start incident/i });
    fireEvent.click(button);
    expect(props.onStartIncident).toHaveBeenCalledWith(
      "intermediate",
      undefined,
    );
  });

  // --------------------------------------------------------------------------
  // 5. Calls onStartIncident with domain filter when selected
  // --------------------------------------------------------------------------
  it("calls onStartIncident with domain filter when domain selected", () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);

    // Select a domain from the dropdown
    const domainSelect = screen.getByRole("combobox");
    fireEvent.change(domainSelect, { target: { value: "3" } });

    const button = screen.getByRole("button", { name: /start incident/i });
    fireEvent.click(button);
    expect(props.onStartIncident).toHaveBeenCalledWith("intermediate", 3);
  });

  // --------------------------------------------------------------------------
  // 6. Shows incident history entries with scores
  // --------------------------------------------------------------------------
  it("shows incident history entries with scores", () => {
    mockLearningState = {
      ...mockLearningState,
      incidentHistory: [
        {
          templateId: "thermal-cascade",
          score: 85,
          date: new Date("2026-02-20").getTime(),
        },
        {
          templateId: "gpu-memory-leak",
          score: 72,
          date: new Date("2026-02-18").getTime(),
        },
      ],
    };

    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(screen.getByText(/thermal-cascade/)).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText(/gpu-memory-leak/)).toBeInTheDocument();
    expect(screen.getByText(/72/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Disables start button when < 3 completed scenarios
  // --------------------------------------------------------------------------
  it("disables start button when fewer than 3 scenarios completed", () => {
    mockCompletedScenarios = ["scenario-1", "scenario-2"];
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    const button = screen.getByRole("button", { name: /start incident/i });
    expect(button).toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 8. Disables start button when < 2 quizzes passed
  // --------------------------------------------------------------------------
  it("disables start button when fewer than 2 quizzes passed", () => {
    mockLearningState = {
      ...mockLearningState,
      familyQuizScores: {
        "gpu-monitoring": { passed: true, score: 90, attempts: 1 },
      },
    };
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    const button = screen.getByRole("button", { name: /start incident/i });
    expect(button).toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 9. Shows prerequisite message when locked
  // --------------------------------------------------------------------------
  it("shows prerequisite message when prerequisites not met", () => {
    mockCompletedScenarios = ["scenario-1"];
    mockLearningState = {
      ...mockLearningState,
      familyQuizScores: {},
    };
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(
      screen.getByText(/complete at least 3 missions/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pass at least 2 quizzes/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 10. Enables start button when prerequisites are met
  // --------------------------------------------------------------------------
  it("enables start button when all prerequisites met", () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    const button = screen.getByRole("button", { name: /start incident/i });
    expect(button).not.toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 11. Does not show prerequisite message when unlocked
  // --------------------------------------------------------------------------
  it("does not show prerequisite message when prerequisites are met", () => {
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(
      screen.queryByText(/complete at least 3 missions/i),
    ).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 12. Shows beginner difficulty for low rating
  // --------------------------------------------------------------------------
  it("shows beginner difficulty for low rating", () => {
    mockLearningState = {
      ...mockLearningState,
      incidentRating: 500,
    };
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 13. Shows advanced difficulty for high rating
  // --------------------------------------------------------------------------
  it("shows advanced difficulty for high rating", () => {
    mockLearningState = {
      ...mockLearningState,
      incidentRating: 1500,
    };
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByText("advanced")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 14. Does not call onStartIncident when button is disabled
  // --------------------------------------------------------------------------
  it("does not call onStartIncident when button is disabled", () => {
    mockCompletedScenarios = [];
    const props = defaultProps();
    render(<IncidentLauncher {...props} />);
    const button = screen.getByRole("button", { name: /start incident/i });
    fireEvent.click(button);
    expect(props.onStartIncident).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 15. History shows most recent first
  // --------------------------------------------------------------------------
  it("shows incident history in most recent first order", () => {
    mockLearningState = {
      ...mockLearningState,
      incidentHistory: [
        {
          templateId: "older-incident",
          score: 60,
          date: new Date("2026-02-10").getTime(),
        },
        {
          templateId: "newer-incident",
          score: 90,
          date: new Date("2026-02-20").getTime(),
        },
      ],
    };

    const props = defaultProps();
    render(<IncidentLauncher {...props} />);

    const historyItems = screen.getAllByTestId("incident-history-entry");
    expect(historyItems).toHaveLength(2);
    // Most recent (newer-incident) should come first
    expect(historyItems[0]).toHaveTextContent(/newer-incident/);
    expect(historyItems[1]).toHaveTextContent(/older-incident/);
  });
});
