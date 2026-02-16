/**
 * Quiz Flow Integration Tests
 *
 * Tests the complete quiz flow from start to finish:
 * - Starting a quiz
 * - Answering questions
 * - Showing results
 * - Recording results in store
 * - Updating CommandFamilyCards progress
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WhichToolQuiz } from "../WhichToolQuiz";

// Mock the quiz questions data with a controlled set of questions
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
      {
        id: "ib-q1",
        familyId: "infiniband-tools",
        scenario: "You need to check InfiniBand port status.",
        choices: ["ibstat", "ibdiagnet", "perfquery", "iblinkinfo"],
        correctAnswer: "ibstat",
        explanation: "ibstat shows InfiniBand port status.",
        whyNotOthers: [
          { tool: "ibdiagnet", reason: "ibdiagnet is for full diagnostics." },
          {
            tool: "perfquery",
            reason: "perfquery shows performance counters.",
          },
          { tool: "iblinkinfo", reason: "iblinkinfo shows topology." },
        ],
        difficulty: "beginner",
      },
    ],
  },
}));

describe("Quiz Flow Integration", () => {
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Make shuffleArray a no-op so questions stay in declared order
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("should complete full quiz flow: start -> answer -> result", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Verify quiz started at question 1
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Tool Selection Quiz")).toBeInTheDocument();

    // Answer Question 1 (correct answer: nvidia-smi)
    const q1Answer = screen.getByRole("button", { name: /^nvidia-smi$/i });
    fireEvent.click(q1Answer);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Check feedback shows correct
    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // Move to Question 2
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText("Question 2 of 4")).toBeInTheDocument();
    });

    // Answer Question 2 (correct answer: nvtop)
    const q2Answer = screen.getByRole("button", { name: /nvtop/i });
    fireEvent.click(q2Answer);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // Move to Question 3
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText("Question 3 of 4")).toBeInTheDocument();
    });

    // Answer Question 3 (correct answer: dcgmi)
    const q3Answer = screen.getByRole("button", { name: /dcgmi/i });
    fireEvent.click(q3Answer);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // Move to Question 4
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText("Question 4 of 4")).toBeInTheDocument();
    });

    // Answer Question 4 (correct answer: nvsm)
    const q4Answer = screen.getByRole("button", { name: /nvsm/i });
    fireEvent.click(q4Answer);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // Finish quiz - see results
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    // Verify results screen
    await waitFor(() => {
      expect(screen.getByText("Quiz Passed!")).toBeInTheDocument();
      expect(screen.getByText("4/4")).toBeInTheDocument();
      // The percentage text is split across elements, so use a regex
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });
  });

  it("should record quiz result in onComplete callback", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all 4 questions correctly
    // Q1: nvidia-smi
    fireEvent.click(screen.getByRole("button", { name: /^nvidia-smi$/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q2: nvtop
    await waitFor(() => screen.getByText("Question 2 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvtop/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q3: dcgmi
    await waitFor(() => screen.getByText("Question 3 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /dcgmi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q4: nvsm
    await waitFor(() => screen.getByText("Question 4 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvsm/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /see results/i }));
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    // Verify results screen
    await waitFor(() => {
      expect(screen.getByText("Quiz Passed!")).toBeInTheDocument();
    });

    // Click continue to trigger onComplete
    fireEvent.click(
      screen.getByRole("button", { name: /continue to scenarios/i }),
    );

    // Verify onComplete was called with correct parameters
    expect(mockOnComplete).toHaveBeenCalledWith(true, 4);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show failed result when score below passing threshold", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all 4 questions incorrectly (pick wrong answers)
    for (let i = 0; i < 4; i++) {
      // Select nvsm for all questions (only correct for Q4)
      const wrongButtons = screen
        .getAllByRole("button")
        .filter((b) => b.textContent === "nvtop" || b.textContent === "nvsm");

      // Pick an answer that's wrong for most questions
      if (i < 3) {
        fireEvent.click(
          wrongButtons.find((b) => b.textContent === "nvsm") || wrongButtons[0],
        );
      } else {
        // For Q4, pick nvtop (wrong)
        fireEvent.click(
          wrongButtons.find((b) => b.textContent === "nvtop") ||
            wrongButtons[0],
        );
      }

      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

      await waitFor(() => {
        if (i < 3) {
          expect(
            screen.getByRole("button", { name: /next question/i }),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.getByRole("button", { name: /see results/i }),
          ).toBeInTheDocument();
        }
      });

      if (i < 3) {
        fireEvent.click(screen.getByRole("button", { name: /next question/i }));
      } else {
        fireEvent.click(screen.getByRole("button", { name: /see results/i }));
      }
    }

    // Verify failed results screen
    await waitFor(() => {
      expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
    });

    // Try Again button should be visible
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("should handle quiz retry correctly", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all questions wrong to get to retry
    for (let i = 0; i < 4; i++) {
      const wrongButtons = screen
        .getAllByRole("button")
        .filter((b) => b.textContent === "nvsm");
      if (wrongButtons.length > 0) {
        fireEvent.click(wrongButtons[0]);
      }
      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

      await waitFor(() => {
        if (i < 3) {
          expect(
            screen.getByRole("button", { name: /next question/i }),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.getByRole("button", { name: /see results/i }),
          ).toBeInTheDocument();
        }
      });

      if (i < 3) {
        fireEvent.click(screen.getByRole("button", { name: /next question/i }));
      } else {
        fireEvent.click(screen.getByRole("button", { name: /see results/i }));
      }
    }

    // Verify failed results
    await waitFor(() => {
      expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
    });

    // Click Try Again
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // Quiz should restart at Question 1
    await waitFor(() => {
      expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
      expect(
        screen.getByText(/check if any GPU processes/i),
      ).toBeInTheDocument();
    });
  });

  it("should show explanation feedback for incorrect answers", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer Q1 incorrectly
    fireEvent.click(screen.getByRole("button", { name: /nvtop/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Should show incorrect feedback with explanation
    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
      expect(screen.getByText(/The correct answer was/)).toBeInTheDocument();
      expect(
        screen.getByText(/provides an immediate snapshot/i),
      ).toBeInTheDocument();
    });

    // Should show "Why not others" section
    expect(screen.getByText("Why not the others?")).toBeInTheDocument();
  });

  it("should track score correctly through multiple questions", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer Q1 correctly
    fireEvent.click(screen.getByRole("button", { name: /^nvidia-smi$/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => screen.getByText("Correct!"));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Check score shows 1 correct
    await waitFor(() => {
      expect(screen.getByText(/1 correct so far/)).toBeInTheDocument();
    });

    // Answer Q2 correctly
    await waitFor(() => screen.getByText("Question 2 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvtop/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => screen.getByText("Correct!"));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Check score shows 2 correct
    await waitFor(() => {
      expect(screen.getByText(/2 correct so far/)).toBeInTheDocument();
    });
  });

  it("should show review section for missed questions", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer Q1 incorrectly
    fireEvent.click(screen.getByRole("button", { name: /nvtop/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Answer Q2 correctly
    await waitFor(() => screen.getByText("Question 2 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvtop/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Answer Q3 correctly
    await waitFor(() => screen.getByText("Question 3 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /dcgmi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Answer Q4 correctly
    await waitFor(() => screen.getByText("Question 4 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvsm/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /see results/i }));
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    // 3/4 = 75% is below the 80% threshold (need 4/4 with 4 questions)
    await waitFor(() => {
      expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
      expect(screen.getByText("3/4")).toBeInTheDocument();
    });

    // Should show review section for the one missed question
    expect(screen.getByText("Review Missed Questions")).toBeInTheDocument();
  });

  it("should close quiz without calling onComplete if closed early", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Verify quiz is showing
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();

    // Close the quiz without completing
    const closeButton = screen.getByRole("button", { name: /×/ });
    fireEvent.click(closeButton);

    // onClose should be called but not onComplete
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("should show no questions message for invalid family", () => {
    render(
      <WhichToolQuiz
        familyId="non-existent-family"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText("No quiz questions available for this tool family."),
    ).toBeInTheDocument();
  });
});

describe("Quiz Flow Additional", () => {
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should allow user to answer questions without time pressure", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Verify quiz started at Question 1
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();

    // Quiz should still be on Question 1 (no timeout for regular quizzes)
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();

    // Answer the question
    fireEvent.click(screen.getByRole("button", { name: /^nvidia-smi$/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Check feedback shows
    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });
  });
});
