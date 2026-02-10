import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ExamGauntlet } from "../ExamGauntlet";

// Mock the entire module
vi.mock("../../utils/scenarioLoader", () => ({
  getAllScenarios: () => ({
    domain1: ["domain1-hw-inventory", "domain1-server-post"],
    domain2: ["domain2-mig-setup"],
    domain3: ["domain3-slurm-config"],
    domain4: ["domain4-dcgmi-diag"],
    domain5: ["domain5-xid-errors"],
  }),
  getScenarioMetadata: (id: string) => {
    const metadata: Record<
      string,
      { title: string; difficulty: string; estimatedTime: number }
    > = {
      "domain1-hw-inventory": {
        title: "Hardware Inventory Validation",
        difficulty: "beginner",
        estimatedTime: 35,
      },
      "domain1-server-post": {
        title: "Server POST Verification",
        difficulty: "intermediate",
        estimatedTime: 25,
      },
      "domain2-mig-setup": {
        title: "MIG Configuration",
        difficulty: "advanced",
        estimatedTime: 40,
      },
      "domain3-slurm-config": {
        title: "Slurm Configuration",
        difficulty: "intermediate",
        estimatedTime: 40,
      },
      "domain4-dcgmi-diag": {
        title: "DCGM Diagnostics",
        difficulty: "intermediate",
        estimatedTime: 45,
      },
      "domain5-xid-errors": {
        title: "XID Error Analysis",
        difficulty: "advanced",
        estimatedTime: 65,
      },
    };
    return metadata[id] || null;
  },
  loadScenarioFromFile: () =>
    Promise.resolve({
      id: "domain1-hw-inventory",
      title: "Hardware Inventory Validation",
      domain: "domain1",
      difficulty: "beginner",
      description: "Learn to validate hardware inventory",
      learningObjectives: ["Objective 1", "Objective 2"],
      steps: [
        {
          id: "step1",
          title: "Step 1",
          description: "Do step 1",
          objectives: [],
          estimatedDuration: 5,
        },
        {
          id: "step2",
          title: "Step 2",
          description: "Do step 2",
          objectives: [],
          estimatedDuration: 5,
        },
      ],
      faults: [],
      successCriteria: [],
      estimatedTime: 35,
      tier: 2,
    }),
}));

// Mock tier progression engine
vi.mock("../../utils/tierProgressionEngine", async () => {
  const actual = await vi.importActual<
    typeof import("../../utils/tierProgressionEngine")
  >("../../utils/tierProgressionEngine");
  return {
    ...actual,
    selectGauntletScenarios: () => [
      { id: "domain1-hw-inventory", domain: "domain1", tier: 2 },
      { id: "domain1-server-post", domain: "domain1", tier: 2 },
      { id: "domain2-mig-setup", domain: "domain2", tier: 2 },
      { id: "domain3-slurm-config", domain: "domain3", tier: 2 },
      { id: "domain4-dcgmi-diag", domain: "domain4", tier: 2 },
    ],
  };
});

// Mock the learning store
const mockRecordGauntletAttempt = vi.fn();
vi.mock("../../store/learningStore", () => ({
  useLearningStore: (
    selector: (state: { recordGauntletAttempt: () => void }) => unknown,
  ) => {
    const state = {
      recordGauntletAttempt: mockRecordGauntletAttempt,
    };
    return selector(state);
  },
}));

describe("ExamGauntlet", () => {
  const mockOnExit = vi.fn();
  const mockOnLaunchScenario = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Setup Screen", () => {
    it("should render setup screen with exam gauntlet title", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Timed practice exam simulating the DCA certification/,
        ),
      ).toBeInTheDocument();
    });

    it("should display time limit options", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      expect(screen.getByText("30 min")).toBeInTheDocument();
      expect(screen.getByText("60 min")).toBeInTheDocument();
      expect(screen.getByText("90 min")).toBeInTheDocument();
    });

    it("should have 60 min selected by default", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      const button60 = screen.getByText("60 min");
      expect(button60).toHaveClass("bg-blue-600");
    });

    it("should allow changing time limit selection", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      const button30 = screen.getByText("30 min");
      fireEvent.click(button30);

      expect(button30).toHaveClass("bg-blue-600");
    });

    it("should display domain weights information", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      expect(screen.getByText("Domain Distribution")).toBeInTheDocument();
      expect(screen.getByText(/Platform Bring-Up/)).toBeInTheDocument();
      expect(screen.getByText(/Validation & Testing/)).toBeInTheDocument();
    });

    it("should display exam information", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      expect(screen.getByText("About This Exam")).toBeInTheDocument();
      expect(screen.getByText(/10 scenarios/)).toBeInTheDocument();
      expect(screen.getByText(/weighted by domain/)).toBeInTheDocument();
    });

    it("should display start exam button", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      expect(screen.getByText("Start Exam")).toBeInTheDocument();
    });

    it("should call onExit when close button is clicked", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      expect(mockOnExit).toHaveBeenCalled();
    });
  });

  describe("Starting Exam", () => {
    it("should start exam and show active state when start button is clicked", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      expect(screen.getByText("0 / 5 completed")).toBeInTheDocument();
    });

    it("should display timer with correct initial time", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      expect(screen.getByText("60:00")).toBeInTheDocument();
    });

    it("should display scenarios list after starting", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      expect(
        screen.getByText(/Hardware Inventory Validation/),
      ).toBeInTheDocument();
    });
  });

  describe("Active Exam", () => {
    function startExam() {
      render(
        <ExamGauntlet
          onExit={mockOnExit}
          onLaunchScenario={mockOnLaunchScenario}
        />,
      );
      fireEvent.click(screen.getByText("Start Exam"));
    }

    it("should show progress indicator", () => {
      startExam();
      expect(screen.getByText("0 / 5 completed")).toBeInTheDocument();
    });

    it("should have finish exam button", () => {
      startExam();
      expect(screen.getByText("Finish Exam")).toBeInTheDocument();
    });

    it("should show launch and mark complete buttons for scenarios", () => {
      startExam();

      const launchButtons = screen.getAllByText("Launch");
      const markCompleteButtons = screen.getAllByText("Mark Complete");

      expect(launchButtons.length).toBeGreaterThan(0);
      expect(markCompleteButtons.length).toBeGreaterThan(0);
    });

    it("should mark scenario as complete when mark complete is clicked", () => {
      startExam();

      const markCompleteButtons = screen.getAllByText("Mark Complete");
      fireEvent.click(markCompleteButtons[0]);

      expect(screen.getByText("1 / 5 completed")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("should show domain badges on scenario cards", () => {
      startExam();
      expect(screen.getAllByText("Platform Bring-Up").length).toBeGreaterThan(
        0,
      );
    });

    it("should show estimated time on scenario cards", () => {
      startExam();
      expect(screen.getAllByText(/\d+ min/).length).toBeGreaterThan(0);
    });

    it("should call onLaunchScenario when provided and launch is clicked", () => {
      startExam();

      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      expect(mockOnLaunchScenario).toHaveBeenCalledWith("domain1-hw-inventory");
    });
  });

  describe("Timer Functionality", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should countdown the timer", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      expect(screen.getByText("60:00")).toBeInTheDocument();

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText("59:55")).toBeInTheDocument();
    });

    it("should show red timer when time is low", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      // Select 30 min
      fireEvent.click(screen.getByText("30 min"));
      fireEvent.click(screen.getByText("Start Exam"));

      expect(screen.getByText("30:00")).toBeInTheDocument();

      // Fast forward to under 5 minutes remaining (26 minutes)
      act(() => {
        vi.advanceTimersByTime(26 * 60 * 1000);
      });

      const timer = screen.getByText(/04:\d{2}/);
      expect(timer).toHaveClass("text-red-500");
    });
  });

  describe("Results Screen", () => {
    function startAndFinishExam(completeScenarios: number = 0) {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Mark some scenarios complete
      for (let i = 0; i < completeScenarios; i++) {
        const markCompleteButtons = screen.getAllByText("Mark Complete");
        if (markCompleteButtons[0]) {
          fireEvent.click(markCompleteButtons[0]);
        }
      }

      // Finish exam
      fireEvent.click(screen.getByText("Finish Exam"));
    }

    it("should show results screen when finish exam is clicked", () => {
      startAndFinishExam();
      expect(screen.getByText("Exam Complete")).toBeInTheDocument();
    });

    it("should display score percentage", () => {
      startAndFinishExam(2);
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("should show passing message when score >= 70%", () => {
      startAndFinishExam(4);
      expect(screen.getByText("Exam Passed!")).toBeInTheDocument();
    });

    it("should show domain breakdown", () => {
      startAndFinishExam();
      expect(screen.getByText("Domain Breakdown")).toBeInTheDocument();
    });

    it("should show scenario results", () => {
      startAndFinishExam(1);

      expect(screen.getByText("Scenario Results")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getAllByText("Incomplete").length).toBeGreaterThan(0);
    });

    it("should have try again button", () => {
      startAndFinishExam();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    it("should have exit button", () => {
      startAndFinishExam();
      expect(screen.getByText("Exit")).toBeInTheDocument();
    });

    it("should reset to setup screen when try again is clicked", () => {
      startAndFinishExam();

      fireEvent.click(screen.getByText("Try Again"));

      expect(screen.getByText("About This Exam")).toBeInTheDocument();
      expect(screen.getByText("Start Exam")).toBeInTheDocument();
    });

    it("should call onExit when exit button is clicked", () => {
      startAndFinishExam();

      fireEvent.click(screen.getByText("Exit"));

      expect(mockOnExit).toHaveBeenCalled();
    });

    it("should show time taken", () => {
      startAndFinishExam();
      expect(screen.getByText(/Time:/)).toBeInTheDocument();
    });

    it("should show passing score requirement", () => {
      startAndFinishExam();
      expect(screen.getByText(/Passing: 70%/)).toBeInTheDocument();
    });

    it("should record gauntlet attempt when finishing exam", () => {
      startAndFinishExam(2);

      expect(mockRecordGauntletAttempt).toHaveBeenCalled();
      expect(mockRecordGauntletAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 40,
          totalQuestions: 5,
        }),
      );
    });
  });

  describe("Scenario Detail View", () => {
    it("should show scenario details when launch is clicked without onLaunchScenario", async () => {
      // Render without onLaunchScenario to test internal scenario view
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Click launch button
      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      // Wait for async scenario loading
      await waitFor(() => {
        expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
        expect(screen.getByText("Steps (2)")).toBeInTheDocument();
      });
    });

    it("should show step list in scenario detail view", async () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Step 1")).toBeInTheDocument();
        expect(screen.getByText("Step 2")).toBeInTheDocument();
      });
    });

    it("should have back to list button in scenario detail view", async () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Back to List")).toBeInTheDocument();
      });
    });

    it("should return to scenario list when back to list is clicked", async () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Back to List")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Back to List"));

      // Should see all scenario cards again
      expect(screen.getAllByText("Launch").length).toBeGreaterThan(0);
    });

    it("should mark complete from detail view", async () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Learning Objectives")).toBeInTheDocument();
      });

      // Find the mark complete button in detail view - it's the one with class flex-1
      const detailMarkComplete = screen
        .getAllByText("Mark Complete")
        .find((button) => button.classList.contains("flex-1"));

      if (detailMarkComplete) {
        fireEvent.click(detailMarkComplete);
      }

      expect(screen.getByText("1 / 5 completed")).toBeInTheDocument();
    });
  });

  describe("ExamGauntlet Integration", () => {
    it("should calculate correct score with scenario completion", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Complete 3 out of 5 scenarios
      const markCompleteButtons = screen.getAllByText("Mark Complete");
      fireEvent.click(markCompleteButtons[0]);
      fireEvent.click(markCompleteButtons[1]);
      fireEvent.click(markCompleteButtons[2]);

      expect(screen.getByText("3 / 5 completed")).toBeInTheDocument();

      // Finish the exam
      fireEvent.click(screen.getByText("Finish Exam"));

      // Score should be 60% (3/5)
      expect(screen.getByText("60%")).toBeInTheDocument();
    });

    it("should record gauntlet attempt with correct domain breakdown", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Mark all scenarios complete
      const markCompleteButtons = screen.getAllByText("Mark Complete");
      markCompleteButtons.forEach((button) => fireEvent.click(button));

      // Finish the exam
      fireEvent.click(screen.getByText("Finish Exam"));

      // Verify the gauntlet attempt was recorded with domain breakdown
      expect(mockRecordGauntletAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          domainBreakdown: expect.any(Object),
          score: expect.any(Number),
          totalQuestions: 5,
          timeSpentSeconds: expect.any(Number),
        }),
      );
    });

    it("should maintain exam state through scenario viewing", async () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Mark one scenario complete
      const markCompleteButtons = screen.getAllByText("Mark Complete");
      fireEvent.click(markCompleteButtons[0]);

      expect(screen.getByText("1 / 5 completed")).toBeInTheDocument();

      // View a different scenario (if no onLaunchScenario)
      const launchButtons = screen.getAllByText("Launch");
      fireEvent.click(launchButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Back to List")).toBeInTheDocument();
      });

      // Go back to list
      fireEvent.click(screen.getByText("Back to List"));

      // Progress should still be maintained
      expect(screen.getByText("1 / 5 completed")).toBeInTheDocument();
    });

    it("should display domain distribution in results", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Complete some scenarios and finish
      const markCompleteButtons = screen.getAllByText("Mark Complete");
      fireEvent.click(markCompleteButtons[0]);

      fireEvent.click(screen.getByText("Finish Exam"));

      // Domain breakdown should be visible
      expect(screen.getByText("Domain Breakdown")).toBeInTheDocument();
    });

    it("should calculate passing status correctly at 70% threshold", () => {
      render(<ExamGauntlet onExit={mockOnExit} />);

      fireEvent.click(screen.getByText("Start Exam"));

      // Complete 4 out of 5 scenarios (80%)
      const markCompleteButtons = screen.getAllByText("Mark Complete");
      fireEvent.click(markCompleteButtons[0]);
      fireEvent.click(markCompleteButtons[1]);
      fireEvent.click(markCompleteButtons[2]);
      fireEvent.click(markCompleteButtons[3]);

      fireEvent.click(screen.getByText("Finish Exam"));

      // Score should be 80% which passes
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("Exam Passed!")).toBeInTheDocument();
    });
  });
});
