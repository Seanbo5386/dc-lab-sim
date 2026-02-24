/**
 * IncidentWorkspace Component Tests
 *
 * Tests the incident workspace sidebar panel that displays during active
 * incidents: situation briefing, elapsed timer, workflow progress checklist,
 * diagnosis submission, hint system, and abandon button.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { IncidentWorkspace } from "../IncidentWorkspace";
import type { PhaseEntry } from "@/simulation/workflowTracker";

function defaultProps() {
  return {
    situation:
      "GPU 3 on dgx-02 is reporting XID 48 errors. Training jobs are failing.",
    phaseHistory: [] as PhaseEntry[],
    rootCauseOptions: [
      "Faulty GPU memory",
      "NVLink failure",
      "Thermal throttling",
      "Driver issue",
    ],
    diagnosticPath: ["nvidia-smi", "dmesg | grep -i xid", "dcgmi diag -r 3"],
    onSubmitDiagnosis: vi.fn(),
    onRequestHint: vi.fn(),
    onClose: vi.fn(),
  };
}

describe("IncidentWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // CSS Positioning
  // ==========================================================================

  describe("CSS Positioning", () => {
    it("renders as a fixed sidebar with correct positioning classes", () => {
      const { container } = render(<IncidentWorkspace {...defaultProps()} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("fixed");
      expect(root.className).toContain("inset-y-0");
      expect(root.className).toContain("z-40");
    });
  });

  // ==========================================================================
  // Situation Briefing
  // ==========================================================================

  describe("Situation Briefing", () => {
    it("renders situation briefing text", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(
        screen.getByText(
          "GPU 3 on dgx-02 is reporting XID 48 errors. Training jobs are failing.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Elapsed Timer
  // ==========================================================================

  describe("Elapsed Timer", () => {
    it("shows elapsed timer starting at 00:00", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("advances timer after 1 second", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(screen.getByText("00:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("00:01")).toBeInTheDocument();
    });

    it("formats timer as MM:SS for multi-minute durations", () => {
      render(<IncidentWorkspace {...defaultProps()} />);

      act(() => {
        vi.advanceTimersByTime(125_000); // 2 minutes 5 seconds
      });

      expect(screen.getByText("02:05")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Workflow Progress Checklist
  // ==========================================================================

  describe("Workflow Progress Checklist", () => {
    it("shows all 5 workflow phase labels", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(screen.getByText("Survey")).toBeInTheDocument();
      expect(screen.getByText("Triage")).toBeInTheDocument();
      expect(screen.getByText("Isolation")).toBeInTheDocument();
      expect(screen.getByText("Remediation")).toBeInTheDocument();
      expect(screen.getByText("Verification")).toBeInTheDocument();
    });

    it("marks phases as reached when phaseHistory contains them", () => {
      const props = defaultProps();
      props.phaseHistory = [
        { command: "nvidia-smi", phase: "survey", timestamp: Date.now() },
        {
          command: "nvidia-smi -i 3",
          phase: "triage",
          timestamp: Date.now() + 1000,
        },
      ];

      const { container } = render(<IncidentWorkspace {...props} />);

      // Survey and Triage should be marked as reached (have checkmark or filled indicator)
      const phaseItems = container.querySelectorAll("[data-phase]");
      expect(phaseItems).toHaveLength(5);

      const surveyItem = container.querySelector('[data-phase="survey"]');
      const triageItem = container.querySelector('[data-phase="triage"]');
      const isolationItem = container.querySelector('[data-phase="isolation"]');

      expect(surveyItem).toHaveAttribute("data-reached", "true");
      expect(triageItem).toHaveAttribute("data-reached", "true");
      expect(isolationItem).toHaveAttribute("data-reached", "false");
    });

    it("marks all phases when all are present in history", () => {
      const props = defaultProps();
      props.phaseHistory = [
        { command: "nvidia-smi", phase: "survey", timestamp: 1 },
        { command: "nvidia-smi -i 3", phase: "triage", timestamp: 2 },
        { command: "dcgmi diag -r 3", phase: "isolation", timestamp: 3 },
        {
          command: "nvidia-smi --gpu-reset -i 3",
          phase: "remediation",
          timestamp: 4,
        },
        { command: "nvidia-smi", phase: "verification", timestamp: 5 },
      ];

      const { container } = render(<IncidentWorkspace {...props} />);

      const phases = [
        "survey",
        "triage",
        "isolation",
        "remediation",
        "verification",
      ];
      for (const phase of phases) {
        const item = container.querySelector(`[data-phase="${phase}"]`);
        expect(item).toHaveAttribute("data-reached", "true");
      }
    });
  });

  // ==========================================================================
  // Diagnosis Submission
  // ==========================================================================

  describe("Diagnosis Submission", () => {
    it("renders Submit Diagnosis button", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(
        screen.getByRole("button", { name: /submit diagnosis/i }),
      ).toBeInTheDocument();
    });

    it("shows root cause options when Submit Diagnosis is clicked", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      fireEvent.click(
        screen.getByRole("button", { name: /submit diagnosis/i }),
      );

      expect(screen.getByText("Faulty GPU memory")).toBeInTheDocument();
      expect(screen.getByText("NVLink failure")).toBeInTheDocument();
      expect(screen.getByText("Thermal throttling")).toBeInTheDocument();
      expect(screen.getByText("Driver issue")).toBeInTheDocument();
    });

    it("calls onSubmitDiagnosis when root cause is selected and confirmed", () => {
      const props = defaultProps();
      render(<IncidentWorkspace {...props} />);

      fireEvent.click(
        screen.getByRole("button", { name: /submit diagnosis/i }),
      );

      // Select a root cause
      fireEvent.click(screen.getByText("Faulty GPU memory"));

      // Confirm
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      expect(props.onSubmitDiagnosis).toHaveBeenCalledWith("Faulty GPU memory");
    });

    it("does not show Confirm button until a root cause is selected", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      fireEvent.click(
        screen.getByRole("button", { name: /submit diagnosis/i }),
      );

      // Confirm button should be disabled
      const confirmBtn = screen.getByRole("button", { name: /confirm/i });
      expect(confirmBtn).toBeDisabled();
    });
  });

  // ==========================================================================
  // Hint System
  // ==========================================================================

  describe("Hint System", () => {
    it("renders Request Hint button with score penalty label", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      const hintBtn = screen.getByRole("button", { name: /request hint/i });
      expect(hintBtn).toBeInTheDocument();
      expect(screen.getByText(/-5 pts/i)).toBeInTheDocument();
    });

    it("calls onRequestHint and reveals diagnostic path step when clicked", () => {
      const props = defaultProps();
      render(<IncidentWorkspace {...props} />);
      fireEvent.click(screen.getByRole("button", { name: /request hint/i }));
      expect(props.onRequestHint).toHaveBeenCalled();
      // First diagnostic path step should be revealed
      expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
    });

    it("reveals diagnostic path steps incrementally", () => {
      const props = defaultProps();
      render(<IncidentWorkspace {...props} />);

      // Click hint twice
      fireEvent.click(screen.getByRole("button", { name: /request hint/i }));
      fireEvent.click(screen.getByRole("button", { name: /request hint/i }));

      // Both steps should now be visible
      expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
      expect(screen.getByText("dmesg | grep -i xid")).toBeInTheDocument();
    });

    it("disables hint button when all diagnostic path steps are revealed", () => {
      const props = defaultProps();
      render(<IncidentWorkspace {...props} />);

      // Click once for each step (3 steps in diagnosticPath)
      for (let i = 0; i < props.diagnosticPath.length; i++) {
        fireEvent.click(screen.getByRole("button", { name: /request hint/i }));
      }

      // Button should be disabled now
      const hintBtn = screen.getByRole("button", { name: /request hint/i });
      expect(hintBtn).toBeDisabled();
    });
  });

  // ==========================================================================
  // Abandon Incident
  // ==========================================================================

  describe("Abandon Incident", () => {
    it("renders Abandon Incident button", () => {
      render(<IncidentWorkspace {...defaultProps()} />);
      expect(
        screen.getByRole("button", { name: /abandon incident/i }),
      ).toBeInTheDocument();
    });

    it("calls onClose when Abandon Incident is clicked", () => {
      const props = defaultProps();
      render(<IncidentWorkspace {...props} />);
      fireEvent.click(
        screen.getByRole("button", { name: /abandon incident/i }),
      );
      expect(props.onClose).toHaveBeenCalled();
    });
  });
});
