/**
 * WhichToolQuiz Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WhichToolQuiz } from "../WhichToolQuiz";

// Mock the quiz questions data
vi.mock("../../data/quizQuestions.json", () => ({
  default: {
    version: "1.0.0",
    questions: [
      {
        id: "gpu-mon-q1",
        familyId: "gpu-monitoring",
        scenario:
          "You need to check GPU memory usage and temperature in real-time.",
        choices: ["nvidia-smi", "dcgmi", "nvlink", "ipmitool"],
        correctAnswer: "nvidia-smi",
        explanation:
          "nvidia-smi provides real-time GPU metrics including memory usage and temperature.",
        whyNotOthers: [
          {
            tool: "dcgmi",
            reason: "DCGMI is for diagnostics, not real-time monitoring.",
          },
          {
            tool: "nvlink",
            reason: "NVLink is for interconnect topology, not GPU metrics.",
          },
          {
            tool: "ipmitool",
            reason: "ipmitool is for BMC management, not GPU monitoring.",
          },
        ],
      },
      {
        id: "gpu-mon-q2",
        familyId: "gpu-monitoring",
        scenario: "You need to run a health check on all GPUs in the system.",
        choices: ["nvidia-smi", "dcgmi", "nvlink", "nvidia-bug-report"],
        correctAnswer: "dcgmi",
        explanation:
          "dcgmi diag provides comprehensive GPU health diagnostics.",
        whyNotOthers: [
          {
            tool: "nvidia-smi",
            reason: "nvidia-smi shows status but doesn't run diagnostic tests.",
          },
          {
            tool: "nvlink",
            reason: "NVLink is for topology, not diagnostics.",
          },
          {
            tool: "nvidia-bug-report",
            reason: "nvidia-bug-report collects logs, not health checks.",
          },
        ],
      },
      {
        id: "gpu-mon-q3",
        familyId: "gpu-monitoring",
        scenario: "You need to verify NVLink connections between GPUs.",
        choices: ["nvidia-smi", "dcgmi", "nvidia-smi topo", "ipmitool"],
        correctAnswer: "nvidia-smi topo",
        explanation:
          "nvidia-smi topo -m shows the GPU topology including NVLink connections.",
        whyNotOthers: [
          {
            tool: "nvidia-smi",
            reason: "Basic nvidia-smi doesn't show topology details.",
          },
          { tool: "dcgmi", reason: "DCGMI is for diagnostics, not topology." },
          {
            tool: "ipmitool",
            reason: "ipmitool is for BMC, not GPU topology.",
          },
        ],
      },
      {
        id: "gpu-mon-q4",
        familyId: "gpu-monitoring",
        scenario: "You need to continuously monitor GPU utilization.",
        choices: ["nvidia-smi dmon", "dcgmi", "nvlink", "ibstat"],
        correctAnswer: "nvidia-smi dmon",
        explanation:
          "nvidia-smi dmon provides continuous monitoring of GPU metrics.",
        whyNotOthers: [
          {
            tool: "dcgmi",
            reason: "DCGMI is for diagnostics, not monitoring.",
          },
          { tool: "nvlink", reason: "NVLink is for topology, not monitoring." },
          {
            tool: "ibstat",
            reason: "ibstat is for InfiniBand, not GPU monitoring.",
          },
        ],
      },
      {
        id: "other-q1",
        familyId: "infiniband-tools",
        scenario: "You need to check InfiniBand port status.",
        choices: ["ibstat", "ibdiagnet", "mlxlink", "nvidia-smi"],
        correctAnswer: "ibstat",
        explanation: "ibstat shows InfiniBand port status.",
        whyNotOthers: [],
      },
    ],
  },
}));

describe("WhichToolQuiz", () => {
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

  it("renders quiz for the specified family", () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Tool Selection Quiz")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
    expect(screen.getByText(/check GPU memory usage/)).toBeInTheDocument();
  });

  it("shows empty state for family with no questions", () => {
    render(
      <WhichToolQuiz
        familyId="unknown-family"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText("No quiz questions available for this tool family."),
    ).toBeInTheDocument();
  });

  it("allows selecting an answer", () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    // The button should have the selected styling
    expect(nvidiaSmiButton).toHaveClass("border-nvidia-green");
  });

  it("disables submit button when no answer selected", () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when answer is selected", () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("shows feedback after submitting correct answer", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select correct answer
    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    // Submit
    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(submitButton);

    // Check feedback appears
    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });
  });

  it("shows feedback after submitting incorrect answer", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select incorrect answer
    const ipmitoolButton = screen.getByRole("button", { name: /ipmitool/i });
    fireEvent.click(ipmitoolButton);

    // Submit
    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(submitButton);

    // Check feedback appears
    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
      expect(screen.getByText(/The correct answer was/)).toBeInTheDocument();
    });
  });

  it("shows explanation in feedback", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select and submit answer
    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(submitButton);

    // Check explanation appears
    await waitFor(() => {
      expect(
        screen.getByText(/provides real-time GPU metrics/),
      ).toBeInTheDocument();
    });
  });

  it("shows why not others in feedback", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select and submit answer
    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);

    const submitButton = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(submitButton);

    // Check "why not others" section
    await waitFor(() => {
      expect(screen.getByText("Why not the others?")).toBeInTheDocument();
    });
  });

  it("progresses to next question", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer first question
    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Click next
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /next question/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Check we're on question 2
    await waitFor(() => {
      expect(screen.getByText("Question 2 of 4")).toBeInTheDocument();
    });
  });

  it("shows results after all questions", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all 4 questions
    for (let i = 0; i < 4; i++) {
      // Get all buttons and pick the first non-submit choice
      const buttons = screen.getAllByRole("button");
      const choiceButton = buttons.find(
        (b) =>
          !b.textContent?.includes("Submit") &&
          !b.textContent?.includes("×") &&
          !b.textContent?.includes("Next") &&
          !b.textContent?.includes("See Results"),
      );
      if (choiceButton) {
        fireEvent.click(choiceButton);
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

    // Check results screen
    await waitFor(() => {
      expect(screen.getByText(/You scored/)).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /×/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("tracks score correctly", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer first question correctly
    const nvidiaSmiButton = screen.getByRole("button", { name: /nvidia-smi/i });
    fireEvent.click(nvidiaSmiButton);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // Move to next question to see score indicator
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Check score indicator shows 1 on the next question
    await waitFor(() => {
      expect(screen.getByText(/1 correct so far/)).toBeInTheDocument();
    });
  });
});

describe("WhichToolQuiz - Pass/Fail Logic", () => {
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows pass message when 3/4 correct", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer 4 questions - need to get at least 3 correct
    // Q1: nvidia-smi (correct)
    fireEvent.click(screen.getByRole("button", { name: /^nvidia-smi$/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q2: dcgmi (correct)
    await waitFor(() => screen.getByText("Question 2 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /dcgmi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q3: nvidia-smi topo (correct)
    await waitFor(() => screen.getByText("Question 3 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi topo/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q4: nvidia-smi dmon (correct)
    await waitFor(() => screen.getByText("Question 4 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi dmon/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /see results/i }));
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    // Check pass message
    await waitFor(() => {
      expect(screen.getByText("Quiz Passed!")).toBeInTheDocument();
      expect(screen.getByText("4/4")).toBeInTheDocument();
    });
  });

  it("shows fail message when less than 3/4 correct", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all questions incorrectly
    for (let i = 0; i < 4; i++) {
      // Select ipmitool (always wrong for gpu-monitoring)
      const buttons = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.textContent === "ipmitool" ||
            b.textContent === "ibstat" ||
            b.textContent === "nvlink",
        );
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
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

    // Check fail message
    await waitFor(() => {
      expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
    });
  });

  it("shows retry button when quiz failed", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all questions incorrectly to fail
    for (let i = 0; i < 4; i++) {
      const buttons = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.textContent === "ipmitool" ||
            b.textContent === "ibstat" ||
            b.textContent === "nvlink",
        );
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
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

    // Check retry button exists
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls onComplete with correct values when quiz finishes", async () => {
    render(
      <WhichToolQuiz
        familyId="gpu-monitoring"
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Answer all questions correctly
    // Q1: nvidia-smi (correct)
    fireEvent.click(screen.getByRole("button", { name: /^nvidia-smi$/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q2: dcgmi (correct)
    await waitFor(() => screen.getByText("Question 2 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /dcgmi/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q3: nvidia-smi topo (correct)
    await waitFor(() => screen.getByText("Question 3 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi topo/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /next question/i }));
    fireEvent.click(screen.getByRole("button", { name: /next question/i }));

    // Q4: nvidia-smi dmon (correct)
    await waitFor(() => screen.getByText("Question 4 of 4"));
    fireEvent.click(screen.getByRole("button", { name: /nvidia-smi dmon/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => screen.getByRole("button", { name: /see results/i }));
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    // Click continue
    await waitFor(() => {
      expect(screen.getByText("Quiz Passed!")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /continue to scenarios/i }),
    );

    // Check onComplete was called with (passed: true, score: 4)
    expect(mockOnComplete).toHaveBeenCalledWith(true, 4);
  });
});
