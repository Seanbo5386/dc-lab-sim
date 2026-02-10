import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons explicitly (Proxy approach can hang vitest)
vi.mock("lucide-react", () => ({
  Trophy: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Trophy" {...props} />
  ),
  GraduationCap: (props: Record<string, unknown>) => (
    <svg data-testid="icon-GraduationCap" {...props} />
  ),
  TrendingUp: (props: Record<string, unknown>) => (
    <svg data-testid="icon-TrendingUp" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Clock" {...props} />
  ),
  Crosshair: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Crosshair" {...props} />
  ),
  FlaskConical: (props: Record<string, unknown>) => (
    <svg data-testid="icon-FlaskConical" {...props} />
  ),
  Lock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Lock" {...props} />
  ),
}));

// Mock FaultInjection to isolate LabsAndScenariosView testing
vi.mock("../FaultInjection", () => ({
  FaultInjection: () => (
    <div data-testid="fault-injection">Fault Injection Panel</div>
  ),
}));

// Mock scenario data
const mockScenariosByDomain: Record<string, string[]> = {
  domain1: ["domain1-midnight-deployment", "domain1-rack-expansion"],
  domain2: ["domain2-nvlink-mystery"],
  domain3: ["domain3-slurm-setup"],
  domain4: ["domain4-silent-cluster", "domain4-bandwidth-bottleneck"],
  domain5: ["domain5-xid-investigation"],
};

const mockMetadata: Record<
  string,
  { title: string; difficulty: string; estimatedTime: number }
> = {
  "domain1-midnight-deployment": {
    title: "The Midnight Deployment",
    difficulty: "intermediate",
    estimatedTime: 25,
  },
  "domain1-rack-expansion": {
    title: "The Rack Expansion",
    difficulty: "beginner",
    estimatedTime: 28,
  },
  "domain2-nvlink-mystery": {
    title: "The NVLink Mystery",
    difficulty: "advanced",
    estimatedTime: 25,
  },
  "domain3-slurm-setup": {
    title: "The Slurm Setup",
    difficulty: "beginner",
    estimatedTime: 25,
  },
  "domain4-silent-cluster": {
    title: "The Silent Cluster",
    difficulty: "advanced",
    estimatedTime: 25,
  },
  "domain4-bandwidth-bottleneck": {
    title: "The Bandwidth Bottleneck",
    difficulty: "intermediate",
    estimatedTime: 23,
  },
  "domain5-xid-investigation": {
    title: "The XID Investigation",
    difficulty: "advanced",
    estimatedTime: 24,
  },
};

vi.mock("@/utils/scenarioLoader", () => ({
  getAllScenarios: () => Promise.resolve(mockScenariosByDomain),
  getScenarioMetadata: (id: string) => Promise.resolve(mockMetadata[id] || null),
}));

// Mock simulationStore - default: no completed scenarios
let mockScenarioProgress: Record<
  string,
  { completed: boolean; [key: string]: unknown }
> = {};

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      scenarioProgress: mockScenarioProgress,
    };
    return selector ? selector(state) : state;
  }),
}));

// ============================================================================
// Import component under test AFTER mocks are set up
// ============================================================================
import { LabsAndScenariosView } from "../LabsAndScenariosView";

// ============================================================================
// Default props factory
// ============================================================================

function defaultProps() {
  return {
    onStartScenario: vi.fn(),
    onBeginExam: vi.fn(),
    onOpenLearningPaths: vi.fn(),
    onOpenStudyDashboard: vi.fn(),
    onOpenExamGauntlet: vi.fn(),
    onOpenFreeMode: vi.fn(),
    learningProgress: { completed: 3, total: 10 },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("LabsAndScenariosView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScenarioProgress = {};
  });

  // --------------------------------------------------------------------------
  // 1. Basic rendering
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const props = defaultProps();
    const { container } = render(<LabsAndScenariosView {...props} />);
    expect(container.firstChild).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // 2. Shows scenario cards (titles visible)
  // --------------------------------------------------------------------------

  it("shows scenario titles from loaded data", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await screen.findByText("The Midnight Deployment");
    expect(screen.getByText("The NVLink Mystery")).toBeInTheDocument();
    expect(screen.getByText("The Slurm Setup")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 3. Domain cards visible
  // --------------------------------------------------------------------------

  it("shows all five domain cards", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByTestId("domain-1-card")).toBeInTheDocument();
    expect(screen.getByTestId("domain-2-card")).toBeInTheDocument();
    expect(screen.getByTestId("domain-3-card")).toBeInTheDocument();
    expect(screen.getByTestId("domain-4-card")).toBeInTheDocument();
    expect(screen.getByTestId("domain-5-card")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. Domain card shows domain name
  // --------------------------------------------------------------------------

  it("shows domain names on domain cards", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("Systems & Server Bring-Up")).toBeInTheDocument();
    expect(screen.getByText("Physical Layer Management")).toBeInTheDocument();
    expect(screen.getByText("Control Plane Installation")).toBeInTheDocument();
    expect(screen.getByText("Cluster Test & Verification")).toBeInTheDocument();
    expect(
      screen.getByText("Troubleshooting & Optimization"),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 5. Scenario card shows title within its domain card
  // --------------------------------------------------------------------------

  it("displays individual scenario titles within domain cards", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const domain1Card = await screen.findByTestId("domain-1-card");
    await within(domain1Card).findByText("The Midnight Deployment");
    expect(
      within(domain1Card).getByText("The Midnight Deployment"),
    ).toBeInTheDocument();
    expect(
      within(domain1Card).getByText("The Rack Expansion"),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 6. Scenario card shows difficulty badge
  // --------------------------------------------------------------------------

  it("displays difficulty badges on scenario cards", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() =>
      expect(screen.getAllByText("beginner").length).toBeGreaterThanOrEqual(2),
    );
    expect(screen.getAllByText("intermediate").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByText("advanced").length).toBeGreaterThanOrEqual(2);
  });

  // --------------------------------------------------------------------------
  // 7. Scenario card shows estimated time
  // --------------------------------------------------------------------------

  it("displays estimated time on scenario cards", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await screen.findByText("28m");
    expect(screen.getByText("23m")).toBeInTheDocument();
    expect(screen.getByText("24m")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 8. Scenario card shows domain badge (domain number & weight)
  // --------------------------------------------------------------------------

  it("displays domain numbers and exam weights", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText(/Domain 1/)).toBeInTheDocument();
    expect(screen.getByText(/31%/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. Clicking scenario button calls onStartScenario with correct ID
  // --------------------------------------------------------------------------

  it("calls onStartScenario with the correct scenario ID when clicked", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const button = (await screen.findByText("The Midnight Deployment")).closest(
      "button",
    )!;
    fireEvent.click(button);
    expect(props.onStartScenario).toHaveBeenCalledWith(
      "domain1-midnight-deployment",
    );
  });

  // --------------------------------------------------------------------------
  // 10. Learning Paths button present and calls onOpenLearningPaths
  // --------------------------------------------------------------------------

  it("shows Learning Paths card and calls handler on button click", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("Learning Paths")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: /continue learning|start learning/i,
    });
    fireEvent.click(button);
    expect(props.onOpenLearningPaths).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 11. Study Dashboard button present and calls onOpenStudyDashboard
  // --------------------------------------------------------------------------

  it("shows Study Dashboard card and calls handler on button click", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("Study Dashboard")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /view progress/i });
    fireEvent.click(button);
    expect(props.onOpenStudyDashboard).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 12. Exam Gauntlet button present and calls onOpenExamGauntlet
  // --------------------------------------------------------------------------

  it("shows Exam Gauntlet card and calls handler on button click", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /start gauntlet/i });
    fireEvent.click(button);
    expect(props.onOpenExamGauntlet).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 13. Free Mode card: locked when < 3 scenarios completed
  // --------------------------------------------------------------------------

  it("shows Free Mode as locked when fewer than 3 scenarios completed", () => {
    mockScenarioProgress = {
      "domain1-midnight-deployment": {
        completed: true,
        scenarioId: "domain1-midnight-deployment",
      },
      "domain2-nvlink-mystery": {
        completed: true,
        scenarioId: "domain2-nvlink-mystery",
      },
    };
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const freeModeCard = screen.getByTestId("free-mode-card");
    const lockButton = within(freeModeCard).getByRole("button", {
      name: /locked/i,
    });
    expect(lockButton).toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 14. Free Mode card: unlocked when >= 3 scenarios completed
  // --------------------------------------------------------------------------

  it("shows Free Mode as unlocked when 3 or more scenarios completed", () => {
    mockScenarioProgress = {
      "domain1-midnight-deployment": {
        completed: true,
        scenarioId: "domain1-midnight-deployment",
      },
      "domain2-nvlink-mystery": {
        completed: true,
        scenarioId: "domain2-nvlink-mystery",
      },
      "domain3-slurm-setup": {
        completed: true,
        scenarioId: "domain3-slurm-setup",
      },
    };
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const freeModeCard = screen.getByTestId("free-mode-card");
    const enterButton = within(freeModeCard).getByRole("button", {
      name: /enter free mode/i,
    });
    expect(enterButton).not.toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 15. Free Mode button calls onOpenFreeMode when unlocked
  // --------------------------------------------------------------------------

  it("calls onOpenFreeMode when clicking Enter Free Mode button", () => {
    mockScenarioProgress = {
      a: { completed: true, scenarioId: "a" },
      b: { completed: true, scenarioId: "b" },
      c: { completed: true, scenarioId: "c" },
    };
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const freeModeCard = screen.getByTestId("free-mode-card");
    const enterButton = within(freeModeCard).getByRole("button", {
      name: /enter free mode/i,
    });
    fireEvent.click(enterButton);
    expect(props.onOpenFreeMode).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 16. Learning progress indicator shows completed/total counts
  // --------------------------------------------------------------------------

  it("displays learning progress as completed/total lessons", () => {
    const props = defaultProps();
    props.learningProgress = { completed: 5, total: 12 };
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("5/12 lessons")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 17. Begin Exam button calls onBeginExam
  // --------------------------------------------------------------------------

  it("shows Begin Practice Exam button and calls onBeginExam when clicked", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    const examCard = screen.getByTestId("practice-exam-card");
    const button = within(examCard).getByRole("button", {
      name: /begin practice exam/i,
    });
    fireEvent.click(button);
    expect(props.onBeginExam).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 18. All domains display their scenarios
  // --------------------------------------------------------------------------

  it("shows scenarios for all domains", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    // Domain 1
    await screen.findByText("The Midnight Deployment");
    expect(screen.getByText("The Rack Expansion")).toBeInTheDocument();
    // Domain 2
    expect(screen.getByText("The NVLink Mystery")).toBeInTheDocument();
    // Domain 3
    expect(screen.getByText("The Slurm Setup")).toBeInTheDocument();
    // Domain 4
    expect(screen.getByText("The Silent Cluster")).toBeInTheDocument();
    expect(screen.getByText("The Bandwidth Bottleneck")).toBeInTheDocument();
    // Domain 5
    expect(screen.getByText("The XID Investigation")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 19. Free Mode locked text shows remaining missions count
  // --------------------------------------------------------------------------

  it("shows correct remaining missions count when Free Mode is locked", () => {
    mockScenarioProgress = {
      a: { completed: true, scenarioId: "a" },
    };
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    // 1 completed, need 3, so 2 remaining
    expect(
      screen.getByText(/complete 2 more missions to unlock free mode/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 20. Learning Paths button text changes based on progress
  // --------------------------------------------------------------------------

  it("shows 'Start Learning' when no lessons completed", () => {
    const props = defaultProps();
    props.learningProgress = { completed: 0, total: 10 };
    render(<LabsAndScenariosView {...props} />);
    expect(
      screen.getByRole("button", { name: /start learning/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Continue Learning' when some lessons completed", () => {
    const props = defaultProps();
    props.learningProgress = { completed: 5, total: 10 };
    render(<LabsAndScenariosView {...props} />);
    expect(
      screen.getByRole("button", { name: /continue learning/i }),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 21. Missions header and description present
  // --------------------------------------------------------------------------

  it("displays the Missions header and description", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("Missions")).toBeInTheDocument();
    expect(
      screen.getByText(/immersive narrative scenarios/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 22. Clicking different scenario buttons sends correct IDs
  // --------------------------------------------------------------------------

  it("calls onStartScenario with different IDs for different scenarios", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);

    const nvlinkButton = (await screen.findByText("The NVLink Mystery")).closest(
      "button",
    )!;
    fireEvent.click(nvlinkButton);
    expect(props.onStartScenario).toHaveBeenCalledWith(
      "domain2-nvlink-mystery",
    );

    const slurmButton = (await screen.findByText("The Slurm Setup")).closest(
      "button",
    )!;
    fireEvent.click(slurmButton);
    expect(props.onStartScenario).toHaveBeenCalledWith("domain3-slurm-setup");
  });
});
