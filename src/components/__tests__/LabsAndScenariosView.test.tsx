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
  CheckCircle2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-CheckCircle2" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Clock" {...props} />
  ),
  Crosshair: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Crosshair" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-ChevronRight" {...props} />
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
  {
    title: string;
    difficulty: string;
    estimatedTime: number;
    description?: string;
  }
> = {
  "domain1-midnight-deployment": {
    title: "The Midnight Deployment",
    difficulty: "intermediate",
    estimatedTime: 25,
    description:
      "Four pristine nodes need to be online before the morning run.",
  },
  "domain1-rack-expansion": {
    title: "The Rack Expansion",
    difficulty: "beginner",
    estimatedTime: 28,
    description: "Bring four new {{GPU_MODEL}} nodes into the fabric.",
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
  getScenarioMetadata: (id: string) =>
    Promise.resolve(mockMetadata[id] || null),
}));

// Mock simulationStore for completedScenarios + systemType (drives placeholder
// substitution). DGX-A100 makes {{GPU_MODEL}} resolve to "A100".
let mockCompletedScenarios: string[] = [];
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: vi.fn(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = {
        completedScenarios: mockCompletedScenarios,
        systemType: "DGX-A100",
      };
      return selector ? selector(state) : state;
    },
  ),
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
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("LabsAndScenariosView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletedScenarios = [];
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
    await waitFor(() => {
      expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
      expect(screen.getByText("The NVLink Mystery")).toBeInTheDocument();
      expect(screen.getByText("The Slurm Setup")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Domain cards visible
  // --------------------------------------------------------------------------

  it("shows all six domain cards", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByTestId("domain-0-card")).toBeInTheDocument();
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
    expect(screen.getByText("Foundational Skills")).toBeInTheDocument();
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
    await waitFor(() => {
      const domain1Card = screen.getByTestId("domain-1-card");
      expect(
        within(domain1Card).getByText("The Midnight Deployment"),
      ).toBeInTheDocument();
      expect(
        within(domain1Card).getByText("The Rack Expansion"),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Scenario card shows difficulty badge
  // --------------------------------------------------------------------------

  it("displays difficulty badges on scenario cards", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      expect(screen.getAllByText("beginner").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("intermediate").length).toBeGreaterThanOrEqual(
        2,
      );
      expect(screen.getAllByText("advanced").length).toBeGreaterThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Scenario card shows estimated time
  // --------------------------------------------------------------------------

  it("displays estimated time on scenario cards", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      expect(screen.getByText("28m")).toBeInTheDocument();
      expect(screen.getByText("23m")).toBeInTheDocument();
      expect(screen.getByText("24m")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 8. Scenario card shows domain badge (domain number & weight)
  // --------------------------------------------------------------------------

  it("displays domain numbers", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText(/Domain 1/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. Clicking scenario button calls onStartScenario with correct ID
  // --------------------------------------------------------------------------

  it("calls onStartScenario with the correct scenario ID when clicked", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
    });
    const button = screen
      .getByText("The Midnight Deployment")
      .closest("button")!;
    fireEvent.click(button);
    expect(props.onStartScenario).toHaveBeenCalledWith(
      "domain1-midnight-deployment",
    );
  });

  // --------------------------------------------------------------------------
  // 18. All domains display their scenarios
  // --------------------------------------------------------------------------

  it("shows scenarios for all domains", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      // Domain 1
      expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
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
  });

  // --------------------------------------------------------------------------
  // 17. Missions header and description present
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

    await waitFor(() => {
      expect(screen.getByText("The NVLink Mystery")).toBeInTheDocument();
    });

    const nvlinkButton = screen
      .getByText("The NVLink Mystery")
      .closest("button")!;
    fireEvent.click(nvlinkButton);
    expect(props.onStartScenario).toHaveBeenCalledWith(
      "domain2-nvlink-mystery",
    );

    const slurmButton = screen.getByText("The Slurm Setup").closest("button")!;
    fireEvent.click(slurmButton);
    expect(props.onStartScenario).toHaveBeenCalledWith("domain3-slurm-setup");
  });

  // --------------------------------------------------------------------------
  // 23. Completed scenarios show a checkmark icon
  // --------------------------------------------------------------------------

  it("shows a checkmark icon on completed scenarios", async () => {
    mockCompletedScenarios = [
      "domain1-midnight-deployment",
      "domain4-silent-cluster",
    ];
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("completed-domain1-midnight-deployment"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("completed-domain4-silent-cluster"),
      ).toBeInTheDocument();
    });

    // Non-completed scenarios should NOT have a checkmark
    expect(
      screen.queryByTestId("completed-domain1-rack-expansion"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("completed-domain2-nvlink-mystery"),
    ).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 24. Domain card shows completion count
  // --------------------------------------------------------------------------

  it("shows completion count on domain cards", async () => {
    mockCompletedScenarios = [
      "domain1-midnight-deployment",
      "domain4-silent-cluster",
    ];
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);

    await waitFor(() => {
      // Domain 1: 1 of 2 completed
      const d1 = screen.getByTestId("domain-1-completion");
      expect(d1).toHaveTextContent("1/2 completed");

      // Domain 4: 1 of 2 completed
      const d4 = screen.getByTestId("domain-4-completion");
      expect(d4).toHaveTextContent("1/2 completed");

      // Domain 2: 0 of 1 completed
      const d2 = screen.getByTestId("domain-2-completion");
      expect(d2).toHaveTextContent("0/1 completed");
    });
  });

  // --------------------------------------------------------------------------
  // 25. Each domain renders a labeled horizontal scroll region
  // --------------------------------------------------------------------------

  it("renders a labeled horizontal track per domain", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Domain 1 missions" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Domain 4 missions" }),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 26. Exam-weight badge per domain ("Foundational" for domain 0)
  // --------------------------------------------------------------------------

  it("shows the exam-weight badge per domain (and 'Foundational' for domain 0)", () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    expect(screen.getByText("31% of exam")).toBeInTheDocument();
    expect(screen.getByText("33% of exam")).toBeInTheDocument();
    expect(screen.getByText("Foundational")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 27. Scenario description renders when metadata provides one
  // --------------------------------------------------------------------------

  it("renders a scenario description when metadata provides one", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Four pristine nodes need to be online before the morning run.",
        ),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 28. Hardware placeholders in descriptions are substituted (not raw tokens)
  // --------------------------------------------------------------------------

  it("substitutes {{PLACEHOLDER}} tokens in descriptions with hardware values", async () => {
    const props = defaultProps();
    render(<LabsAndScenariosView {...props} />);
    await waitFor(() => {
      // {{GPU_MODEL}} resolves to "A100" for the DGX-A100 system type
      expect(
        screen.getByText("Bring four new A100 nodes into the fabric."),
      ).toBeInTheDocument();
    });
    // The raw token must NOT leak through
    expect(screen.queryByText(/\{\{GPU_MODEL\}\}/)).not.toBeInTheDocument();
  });
});
