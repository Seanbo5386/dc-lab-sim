/**
 * LearningPaths Integration Tests
 *
 * Tests the integration between LearningPaths and its child components:
 * - Tab navigation between Learn/Practice/Test
 * - ExamGauntlet modal opening/closing
 * - WhichToolQuiz modal opening/closing from CommandFamilyCards
 * - Practice tab scenario launching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LearningPaths } from "../LearningPaths";

// Mock the learningStore
vi.mock("@/store/learningStore", () => ({
  useLearningStore: () => ({
    trackCommand: vi.fn(),
  }),
}));

// Mock the quiz questions data
vi.mock("../../data/quizQuestions.json", () => ({
  default: {
    version: "1.0.0",
    questions: [
      {
        id: "gpu-mon-q1",
        familyId: "gpu-monitoring",
        scenario:
          "You need to quickly check if any GPU processes are running on a server.",
        choices: ["nvidia-smi", "nvtop", "dcgmi", "nvsm"],
        correctAnswer: "nvidia-smi",
        explanation:
          "nvidia-smi provides an immediate snapshot of running processes.",
        whyNotOthers: [
          { tool: "nvtop", reason: "nvtop is for continuous monitoring." },
          { tool: "dcgmi", reason: "dcgmi is for detailed metrics." },
          { tool: "nvsm", reason: "nvsm is for fleet management." },
        ],
        difficulty: "beginner",
      },
      {
        id: "gpu-mon-q2",
        familyId: "gpu-monitoring",
        scenario: "You want to watch GPU utilization in real-time.",
        choices: ["nvidia-smi", "nvtop", "dcgmi", "nvsm"],
        correctAnswer: "nvtop",
        explanation: "nvtop provides a continuously updating dashboard.",
        whyNotOthers: [
          { tool: "nvidia-smi", reason: "nvidia-smi is point-in-time." },
          { tool: "dcgmi", reason: "dcgmi is for diagnostics." },
          { tool: "nvsm", reason: "nvsm is for multi-node management." },
        ],
        difficulty: "intermediate",
      },
      {
        id: "gpu-mon-q3",
        familyId: "gpu-monitoring",
        scenario: "You need to track ECC memory errors over a week.",
        choices: ["nvidia-smi", "nvtop", "dcgmi", "nvsm"],
        correctAnswer: "dcgmi",
        explanation: "dcgmi provides detailed telemetry and policy monitoring.",
        whyNotOthers: [
          {
            tool: "nvidia-smi",
            reason: "nvidia-smi lacks automated collection.",
          },
          { tool: "nvtop", reason: "nvtop is interactive only." },
          { tool: "nvsm", reason: "nvsm is for fleet health status." },
        ],
        difficulty: "intermediate",
      },
      {
        id: "gpu-mon-q4",
        familyId: "gpu-monitoring",
        scenario:
          "You manage 50 DGX nodes and need cluster-wide health status.",
        choices: ["nvidia-smi", "nvtop", "dcgmi", "nvsm"],
        correctAnswer: "nvsm",
        explanation: "nvsm is designed for fleet management of DGX systems.",
        whyNotOthers: [
          {
            tool: "nvidia-smi",
            reason: "nvidia-smi runs on individual nodes.",
          },
          { tool: "nvtop", reason: "nvtop is single-node only." },
          { tool: "dcgmi", reason: "dcgmi runs per-node." },
        ],
        difficulty: "advanced",
      },
    ],
  },
}));

// Mock scenario loader for ExamGauntlet
vi.mock("../../utils/scenarioLoader", () => ({
  getAllScenarios: () =>
    Promise.resolve({
      domain1: ["domain1-hw-inventory"],
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
    return Promise.resolve(metadata[id] || null);
  },
  loadScenarioFromFile: () =>
    Promise.resolve({
      id: "domain1-hw-inventory",
      title: "Hardware Inventory Validation",
      domain: "domain1",
      difficulty: "beginner",
      description: "Learn to validate hardware inventory",
      learningObjectives: ["Objective 1"],
      steps: [{ id: "step1", title: "Step 1", description: "Do step 1" }],
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
      { id: "domain2-mig-setup", domain: "domain2", tier: 2 },
      { id: "domain3-slurm-config", domain: "domain3", tier: 2 },
      { id: "domain4-dcgmi-diag", domain: "domain4", tier: 2 },
      { id: "domain5-xid-errors", domain: "domain5", tier: 2 },
    ],
  };
});

// Mock the learning progress store
const mockRecordGauntletAttempt = vi.fn();
const mockLearningProgressState = {
  recordGauntletAttempt: mockRecordGauntletAttempt,
  familyQuizScores: {},
  reviewSchedule: {},
  gauntletAttempts: [],
  toolsUsed: {},
  unlockedTiers: {},
  tierProgress: {},
  explanationGateResults: {},
  markToolUsed: vi.fn(),
  completeQuiz: vi.fn(),
  updateTierProgress: vi.fn(),
  checkTierUnlock: vi.fn(),
  recordExplanationGate: vi.fn(),
  scheduleReview: vi.fn(),
  recordReviewResult: vi.fn(),
  getDueReviews: vi.fn(() => []),
  resetProgress: vi.fn(),
};

vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn(
    (selector?: (state: typeof mockLearningProgressState) => unknown) => {
      // If selector is provided, use it; otherwise return the full state
      if (selector && typeof selector === "function") {
        return selector(mockLearningProgressState);
      }
      return mockLearningProgressState;
    },
  ),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("LearningPaths Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Tab Navigation", () => {
    it("should render Learn tab by default", () => {
      render(<LearningPaths />);

      // Learn tab should be active
      const learnTab = screen.getByRole("button", { name: /📚\s*Learn/i });
      expect(learnTab).toHaveClass("bg-gray-700");

      // Learning Paths content should be visible
      expect(screen.getByText("Learning Center")).toBeInTheDocument();
      expect(
        screen.getByText("Command Families Reference"),
      ).toBeInTheDocument();
    });

    it("should switch to Practice tab when clicked", async () => {
      render(<LearningPaths />);

      // Click Practice tab
      const practiceTab = screen.getByRole("button", {
        name: /🔧\s*Practice/i,
      });
      fireEvent.click(practiceTab);

      // Practice tab should be active
      await waitFor(() => {
        expect(practiceTab).toHaveClass("bg-gray-700");
      });

      // Practice content should be visible
      expect(screen.getByText("Practice Labs")).toBeInTheDocument();
      expect(screen.getByText("Hands-On Practice")).toBeInTheDocument();
      expect(
        screen.getByText("Practice Scenarios by Domain"),
      ).toBeInTheDocument();
    });

    it("should switch to Test tab when clicked", async () => {
      render(<LearningPaths />);

      // Click Test tab
      const testTab = screen.getByRole("button", { name: /📝\s*Test/i });
      fireEvent.click(testTab);

      // Test tab should be active
      await waitFor(() => {
        expect(testTab).toHaveClass("bg-gray-700");
      });

      // Test content should be visible
      expect(screen.getByText("Test Your Knowledge")).toBeInTheDocument();
      expect(screen.getByText("Assess Your Knowledge")).toBeInTheDocument();
      expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
    });
  });

  describe("Test Tab Integration", () => {
    it("should open ExamGauntlet when Start Exam Gauntlet clicked", async () => {
      render(<LearningPaths />);

      // Navigate to Test tab
      const testTab = screen.getByRole("button", { name: /📝\s*Test/i });
      fireEvent.click(testTab);

      await waitFor(() => {
        expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
      });

      // Click Start Exam Gauntlet button
      const startExamButton = screen.getByRole("button", {
        name: /Start Exam Gauntlet/i,
      });
      fireEvent.click(startExamButton);

      // ExamGauntlet modal should appear with its setup screen
      await waitFor(() => {
        expect(screen.getByText("About This Exam")).toBeInTheDocument();
        expect(screen.getByText("Domain Distribution")).toBeInTheDocument();
        expect(screen.getByText("Start Exam")).toBeInTheDocument();
      });
    });

    it("should open WhichToolQuiz when quiz button clicked on CommandFamilyCards", async () => {
      render(<LearningPaths />);

      // Navigate to Test tab
      const testTab = screen.getByRole("button", { name: /📝\s*Test/i });
      fireEvent.click(testTab);

      await waitFor(() => {
        expect(screen.getByText("Tool Selection Quizzes")).toBeInTheDocument();
      });

      // Find and click a quiz button (GPU Monitoring Quiz)
      const quizButton = screen.getByRole("button", {
        name: /Start GPU Monitoring Quiz/i,
      });
      fireEvent.click(quizButton);

      // WhichToolQuiz modal should appear
      await waitFor(() => {
        expect(screen.getByText("Tool Selection Quiz")).toBeInTheDocument();
        expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
      });
    });

    it("should close quiz modal when completed", async () => {
      render(<LearningPaths />);

      // Navigate to Test tab
      const testTab = screen.getByRole("button", { name: /📝\s*Test/i });
      fireEvent.click(testTab);

      await waitFor(() => {
        expect(screen.getByText("Tool Selection Quizzes")).toBeInTheDocument();
      });

      // Open quiz
      const quizButton = screen.getByRole("button", {
        name: /Start GPU Monitoring Quiz/i,
      });
      fireEvent.click(quizButton);

      await waitFor(() => {
        expect(screen.getByText("Tool Selection Quiz")).toBeInTheDocument();
      });

      // Close the quiz using the close button
      const closeButton = screen.getByRole("button", { name: /×/ });
      fireEvent.click(closeButton);

      // Quiz modal should close
      await waitFor(() => {
        expect(
          screen.queryByText("Tool Selection Quiz"),
        ).not.toBeInTheDocument();
      });

      // Test tab content should still be visible
      expect(screen.getByText("Tool Selection Quizzes")).toBeInTheDocument();
    });
  });

  describe("Practice Tab Integration", () => {
    it("should render domain cards with correct weights", async () => {
      render(<LearningPaths />);

      // Navigate to Practice tab
      const practiceTab = screen.getByRole("button", {
        name: /🔧\s*Practice/i,
      });
      fireEvent.click(practiceTab);

      await waitFor(() => {
        expect(screen.getByText("Hands-On Practice")).toBeInTheDocument();
      });

      // Check domain cards are rendered with weights
      expect(screen.getByText("Systems & Server Bring-Up")).toBeInTheDocument();
      expect(screen.getByText("31% of exam")).toBeInTheDocument();

      expect(screen.getByText("Physical Layer Management")).toBeInTheDocument();
      expect(screen.getByText("5% of exam")).toBeInTheDocument();

      expect(
        screen.getByText("Control Plane Installation"),
      ).toBeInTheDocument();
      expect(screen.getByText("19% of exam")).toBeInTheDocument();

      expect(
        screen.getByText("Cluster Test & Verification"),
      ).toBeInTheDocument();
      expect(screen.getByText("33% of exam")).toBeInTheDocument();

      expect(
        screen.getByText("Troubleshooting & Optimization"),
      ).toBeInTheDocument();
      expect(screen.getByText("12% of exam")).toBeInTheDocument();
    });

    it("should call onStartScenario when Start Labs clicked", async () => {
      const mockOnStartScenario = vi.fn();
      render(<LearningPaths onStartScenario={mockOnStartScenario} />);

      // Navigate to Practice tab
      const practiceTab = screen.getByRole("button", {
        name: /🔧\s*Practice/i,
      });
      fireEvent.click(practiceTab);

      await waitFor(() => {
        expect(screen.getByText("Hands-On Practice")).toBeInTheDocument();
      });

      // Click Start Labs on Domain 1
      const startLabsButtons = screen.getAllByRole("button", {
        name: /Start Labs/i,
      });
      fireEvent.click(startLabsButtons[0]); // First Start Labs button (Domain 1)

      // onStartScenario should be called with the correct scenario ID
      expect(mockOnStartScenario).toHaveBeenCalledWith("domain1-server-post");
    });

    it("should call onStartScenario for different domains", async () => {
      const mockOnStartScenario = vi.fn();
      render(<LearningPaths onStartScenario={mockOnStartScenario} />);

      // Navigate to Practice tab
      const practiceTab = screen.getByRole("button", {
        name: /🔧\s*Practice/i,
      });
      fireEvent.click(practiceTab);

      await waitFor(() => {
        expect(screen.getByText("Hands-On Practice")).toBeInTheDocument();
      });

      // Click Start Labs on Domain 4 (Cluster Test & Verification)
      const startLabsButtons = screen.getAllByRole("button", {
        name: /Start Labs/i,
      });
      fireEvent.click(startLabsButtons[3]); // Fourth Start Labs button (Domain 4)

      expect(mockOnStartScenario).toHaveBeenCalledWith("domain4-dcgmi-diag");
    });

    it("should call onStartScenario with empty string for View All Scenarios", async () => {
      const mockOnStartScenario = vi.fn();
      render(<LearningPaths onStartScenario={mockOnStartScenario} />);

      // Navigate to Practice tab
      const practiceTab = screen.getByRole("button", {
        name: /🔧\s*Practice/i,
      });
      fireEvent.click(practiceTab);

      await waitFor(() => {
        expect(screen.getByText("Browse All Scenarios")).toBeInTheDocument();
      });

      // Click View All Scenarios
      const viewAllButton = screen.getByRole("button", {
        name: /View All Scenarios/i,
      });
      fireEvent.click(viewAllButton);

      expect(mockOnStartScenario).toHaveBeenCalledWith("");
    });
  });

  describe("ExamGauntlet Flow", () => {
    it("should close ExamGauntlet when exit button clicked", async () => {
      render(<LearningPaths />);

      // Navigate to Test tab and open ExamGauntlet
      const testTab = screen.getByRole("button", { name: /📝\s*Test/i });
      fireEvent.click(testTab);

      await waitFor(() => {
        expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
      });

      const startExamButton = screen.getByRole("button", {
        name: /Start Exam Gauntlet/i,
      });
      fireEvent.click(startExamButton);

      await waitFor(() => {
        expect(screen.getByText("About This Exam")).toBeInTheDocument();
      });

      // Close the ExamGauntlet using the close button
      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      // ExamGauntlet modal should close
      await waitFor(() => {
        expect(screen.queryByText("About This Exam")).not.toBeInTheDocument();
      });

      // Test tab content should still be visible
      expect(screen.getByText("Exam Gauntlet")).toBeInTheDocument();
    });
  });

  describe("Learn Tab Integration", () => {
    it("should display CommandFamilyCards in reference mode", async () => {
      render(<LearningPaths />);

      // Learn tab is active by default
      expect(
        screen.getByText("Command Families Reference"),
      ).toBeInTheDocument();

      // Check that command families are displayed
      expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
      expect(screen.getByText("InfiniBand Tools")).toBeInTheDocument();
      expect(screen.getByText("BMC & Hardware")).toBeInTheDocument();
    });

    it("should display Learning Paths section", async () => {
      render(<LearningPaths />);

      // Learning Paths section should be visible
      const learningPathsHeaders = screen.getAllByText("Learning Paths");
      expect(learningPathsHeaders.length).toBeGreaterThan(0);

      // Path cards should be visible
      expect(screen.getByText("Platform Bring-Up Mastery")).toBeInTheDocument();
    });
  });
});
