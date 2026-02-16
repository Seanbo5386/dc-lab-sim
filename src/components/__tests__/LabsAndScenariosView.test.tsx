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
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Clock" {...props} />
  ),
  Crosshair: (props: Record<string, unknown>) => (
    <svg data-testid="icon-Crosshair" {...props} />
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
  getScenarioMetadata: (id: string) =>
    Promise.resolve(mockMetadata[id] || null),
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
});
