/**
 * AfterActionReview Component Tests
 *
 * Tests the post-incident debrief panel that displays:
 * - Diagnosis result (correct/incorrect)
 * - 5 score dimension bars with values
 * - Total score
 * - Timeline comparison (cluster events + user commands)
 * - Actionable tip text
 * - Review Optimal Path, Try Similar, and Exit buttons
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AfterActionReview } from "../AfterActionReview";
import type { WorkflowScore, PhaseEntry } from "@/simulation/workflowTracker";
import type { ClusterEvent } from "@/simulation/eventLog";

function createMockScore(overrides?: Partial<WorkflowScore>): WorkflowScore {
  return {
    methodology: 16,
    efficiency: 14,
    accuracy: 20,
    noCollateral: 18,
    completeness: 15,
    total: 83,
    ...overrides,
  };
}

function createMockEvents(): ClusterEvent[] {
  return [
    {
      id: 1,
      timestamp: 1000,
      type: "xid-error",
      nodeId: "dgx-01",
      gpuId: 3,
      message: "XID 48 error on GPU 3",
      severity: "critical",
    },
    {
      id: 2,
      timestamp: 3000,
      type: "thermal",
      nodeId: "dgx-01",
      gpuId: 3,
      message: "GPU 3 temperature exceeded 90C",
      severity: "warning",
    },
  ];
}

function createMockCommands(): PhaseEntry[] {
  return [
    { command: "nvidia-smi", phase: "survey", timestamp: 2000 },
    { command: "nvidia-smi -i 3", phase: "triage", timestamp: 4000 },
    {
      command: "dcgmi diag -r 3",
      phase: "isolation",
      timestamp: 5000,
    },
  ];
}

function defaultProps() {
  return {
    score: createMockScore(),
    correctDiagnosis: true,
    selectedRootCause: "Faulty GPU memory",
    correctRootCause: "Faulty GPU memory",
    events: createMockEvents(),
    commands: createMockCommands(),
    tip: "Run nvidia-smi -q -d ECC early to isolate memory errors faster.",
    onReviewOptimalPath: vi.fn(),
    onRestart: vi.fn(),
    onClose: vi.fn(),
  };
}

describe("AfterActionReview", () => {
  // ==========================================================================
  // CSS Positioning
  // ==========================================================================

  describe("CSS Positioning", () => {
    it("renders as a fixed modal overlay with correct positioning classes", () => {
      const { container } = render(<AfterActionReview {...defaultProps()} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("fixed");
      expect(root.className).toContain("inset-0");
      expect(root.className).toContain("z-50");
    });
  });

  // ==========================================================================
  // Diagnosis Result
  // ==========================================================================

  describe("Diagnosis Result", () => {
    it("renders correct diagnosis result when diagnosis is correct", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText(/correct diagnosis/i)).toBeInTheDocument();
    });

    it("renders incorrect diagnosis result when diagnosis is wrong", () => {
      const props = defaultProps();
      props.correctDiagnosis = false;
      props.selectedRootCause = "NVLink failure";
      render(<AfterActionReview {...props} />);
      expect(screen.getByText(/incorrect diagnosis/i)).toBeInTheDocument();
    });

    it("shows what the user selected", () => {
      const props = defaultProps();
      props.correctDiagnosis = false;
      props.selectedRootCause = "NVLink failure";
      props.correctRootCause = "Faulty GPU memory";
      render(<AfterActionReview {...props} />);
      expect(screen.getByText(/NVLink failure/)).toBeInTheDocument();
    });

    it("shows the correct root cause when diagnosis is wrong", () => {
      const props = defaultProps();
      props.correctDiagnosis = false;
      props.selectedRootCause = "NVLink failure";
      props.correctRootCause = "Faulty GPU memory";
      render(<AfterActionReview {...props} />);
      expect(screen.getByText(/Faulty GPU memory/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Score Dimension Bars
  // ==========================================================================

  describe("Score Dimension Bars", () => {
    it("shows all 5 score dimension labels", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("Methodology")).toBeInTheDocument();
      expect(screen.getByText("Efficiency")).toBeInTheDocument();
      expect(screen.getByText("Accuracy")).toBeInTheDocument();
      expect(screen.getByText("No Collateral")).toBeInTheDocument();
      expect(screen.getByText("Completeness")).toBeInTheDocument();
    });

    it("shows score values for each dimension", () => {
      render(<AfterActionReview {...defaultProps()} />);
      // Each dimension shows score/20
      expect(screen.getByText("16/20")).toBeInTheDocument();
      expect(screen.getByText("14/20")).toBeInTheDocument();
      expect(screen.getByText("20/20")).toBeInTheDocument();
      expect(screen.getByText("18/20")).toBeInTheDocument();
      expect(screen.getByText("15/20")).toBeInTheDocument();
    });

    it("renders progress bar elements for each dimension", () => {
      const { container } = render(<AfterActionReview {...defaultProps()} />);
      const scoreBars = container.querySelectorAll(
        "[data-testid^='score-bar-']",
      );
      expect(scoreBars).toHaveLength(5);
    });
  });

  // ==========================================================================
  // Total Score
  // ==========================================================================

  describe("Total Score", () => {
    it("shows total score prominently", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("83")).toBeInTheDocument();
      expect(screen.getByText(/\/100/)).toBeInTheDocument();
    });

    it("uses green color for high scores (>70)", () => {
      const { container } = render(<AfterActionReview {...defaultProps()} />);
      const totalScore = container.querySelector("[data-testid='total-score']");
      expect(totalScore).toBeInTheDocument();
      expect(totalScore?.className).toMatch(/green/);
    });

    it("uses yellow color for medium scores (40-70)", () => {
      const props = defaultProps();
      props.score = createMockScore({ total: 55 });
      const { container } = render(<AfterActionReview {...props} />);
      const totalScore = container.querySelector("[data-testid='total-score']");
      expect(totalScore?.className).toMatch(/yellow/);
    });

    it("uses red color for low scores (<40)", () => {
      const props = defaultProps();
      props.score = createMockScore({ total: 25 });
      const { container } = render(<AfterActionReview {...props} />);
      const totalScore = container.querySelector("[data-testid='total-score']");
      expect(totalScore?.className).toMatch(/red/);
    });
  });

  // ==========================================================================
  // Timeline Comparison
  // ==========================================================================

  describe("Timeline Comparison", () => {
    it("renders cluster events in the timeline", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("XID 48 error on GPU 3")).toBeInTheDocument();
      expect(
        screen.getByText("GPU 3 temperature exceeded 90C"),
      ).toBeInTheDocument();
    });

    it("renders user commands in the timeline", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
      expect(screen.getByText("nvidia-smi -i 3")).toBeInTheDocument();
      expect(screen.getByText("dcgmi diag -r 3")).toBeInTheDocument();
    });

    it("shows phase badges for user commands", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("survey")).toBeInTheDocument();
      expect(screen.getByText("triage")).toBeInTheDocument();
      expect(screen.getByText("isolation")).toBeInTheDocument();
    });

    it("shows event severity indicators", () => {
      const { container } = render(<AfterActionReview {...defaultProps()} />);
      const criticalIndicators = container.querySelectorAll(
        "[data-severity='critical']",
      );
      const warningIndicators = container.querySelectorAll(
        "[data-severity='warning']",
      );
      expect(criticalIndicators.length).toBeGreaterThanOrEqual(1);
      expect(warningIndicators.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Actionable Tip
  // ==========================================================================

  describe("Actionable Tip", () => {
    it("shows improvement tip heading", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByText("Improvement Tip")).toBeInTheDocument();
    });

    it("shows tip text", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(
        screen.getByText(
          "Run nvidia-smi -q -d ECC early to isolate memory errors faster.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Action Buttons
  // ==========================================================================

  describe("Action Buttons", () => {
    it("renders Review Optimal Path button", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(
        screen.getByRole("button", { name: /review optimal path/i }),
      ).toBeInTheDocument();
    });

    it("calls onReviewOptimalPath when Review Optimal Path is clicked", () => {
      const props = defaultProps();
      render(<AfterActionReview {...props} />);
      fireEvent.click(
        screen.getByRole("button", { name: /review optimal path/i }),
      );
      expect(props.onReviewOptimalPath).toHaveBeenCalled();
    });

    it("renders Try Similar button", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(
        screen.getByRole("button", { name: /try similar/i }),
      ).toBeInTheDocument();
    });

    it("calls onRestart when Try Similar is clicked", () => {
      const props = defaultProps();
      render(<AfterActionReview {...props} />);
      fireEvent.click(screen.getByRole("button", { name: /try similar/i }));
      expect(props.onRestart).toHaveBeenCalled();
    });

    it("renders Exit button", () => {
      render(<AfterActionReview {...defaultProps()} />);
      expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument();
    });

    it("calls onClose when Exit is clicked", () => {
      const props = defaultProps();
      render(<AfterActionReview {...props} />);
      fireEvent.click(screen.getByRole("button", { name: /exit/i }));
      expect(props.onClose).toHaveBeenCalled();
    });
  });
});
