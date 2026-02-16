import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../data/toolMasteryQuestions", () => {
  const questions = [
    {
      id: "tm-test-001",
      familyId: "gpu-monitoring",
      tool: "nvidia-smi",
      category: "flags-options" as const,
      difficulty: "beginner" as const,
      questionText: "What does the -pm flag do in nvidia-smi?",
      choices: [
        "Sets power mode",
        "Enables persistence mode",
        "Prints memory info",
        "Pauses monitoring",
      ],
      correctAnswer: 1,
      explanation: "The -pm flag enables or disables persistence mode.",
      examRelevance: "NCP-AII Domain 1: Systems & Server Bring-Up",
    },
    {
      id: "tm-test-002",
      familyId: "gpu-monitoring",
      tool: "nvidia-smi",
      category: "output-interpretation" as const,
      difficulty: "intermediate" as const,
      questionText: "What does this output indicate?",
      codeSnippet: "Temperature: 85C (threshold: 83C)",
      choices: [
        "Normal operation",
        "Thermal throttling",
        "Power limit reached",
        "Driver error",
      ],
      correctAnswer: 1,
      explanation: "Temperature exceeding threshold causes thermal throttling.",
    },
    {
      id: "tm-test-003",
      familyId: "gpu-monitoring",
      tool: "dcgmi",
      category: "command-syntax" as const,
      difficulty: "advanced" as const,
      questionText: "Which command runs a level 3 diagnostic?",
      choices: [
        "dcgmi diag -r 3",
        "dcgmi diag --level 3",
        "dcgmi test -l 3",
        "dcgmi check -r 3",
      ],
      correctAnswer: 0,
      explanation: "dcgmi diag -r 3 runs the most comprehensive diagnostic.",
      examRelevance: "NCP-AII Domain 4: Cluster Test & Verification",
    },
    {
      id: "tm-test-004",
      familyId: "gpu-monitoring",
      tool: "nvtop",
      category: "conceptual" as const,
      difficulty: "beginner" as const,
      questionText: "What is nvtop primarily used for?",
      choices: [
        "Real-time GPU monitoring",
        "GPU firmware updates",
        "Driver installation",
        "Cluster management",
      ],
      correctAnswer: 0,
      explanation: "nvtop provides a real-time monitoring dashboard for GPUs.",
    },
  ];
  return {
    TOOL_MASTERY_QUESTIONS: questions,
    getQuestionsForFamily: (familyId: string) =>
      questions.filter((q) => q.familyId === familyId),
  };
});

import { ToolMasteryQuiz } from "../ToolMasteryQuiz";

describe("ToolMasteryQuiz", () => {
  const defaultProps = {
    familyId: "gpu-monitoring",
    onComplete: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header and first question", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    expect(screen.getByText("Deep Mastery Quiz")).toBeInTheDocument();
    expect(
      screen.getByText(/flags, output interpretation, and troubleshooting/i),
    ).toBeInTheDocument();
  });

  it("renders category badge on question", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    // One of the category badges should be present
    const badges = [
      "FLAGS & OPTIONS",
      "OUTPUT INTERPRETATION",
      "COMMAND SYNTAX",
      "CONCEPTUAL",
    ];
    const found = badges.some((b) => screen.queryByText(b) !== null);
    expect(found).toBe(true);
  });

  it("renders 4 answer choices", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    // Should have A., B., C., D. markers
    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("B.")).toBeInTheDocument();
    expect(screen.getByText("C.")).toBeInTheDocument();
    expect(screen.getByText("D.")).toBeInTheDocument();
  });

  it("submit button is disabled until answer selected", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: /submit answer/i });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit after selecting an answer", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    // Click the first choice
    const choices = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent?.includes("A.") ||
          btn.textContent?.includes("B.") ||
          btn.textContent?.includes("C.") ||
          btn.textContent?.includes("D."),
      );
    fireEvent.click(choices[0]);
    const submitBtn = screen.getByRole("button", { name: /submit answer/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("shows feedback after submitting an answer", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    // Select first choice
    const choices = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent?.includes("A.") ||
          btn.textContent?.includes("B.") ||
          btn.textContent?.includes("C.") ||
          btn.textContent?.includes("D."),
      );
    fireEvent.click(choices[0]);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Should show feedback (correct or incorrect)
    const feedback =
      screen.queryByText("Correct!") || screen.queryByText("Incorrect");
    expect(feedback).toBeTruthy();
  });

  it("shows explanation in feedback", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    const choices = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent?.includes("A.") ||
          btn.textContent?.includes("B.") ||
          btn.textContent?.includes("C.") ||
          btn.textContent?.includes("D."),
      );
    fireEvent.click(choices[0]);
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(screen.getByText("Explanation")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<ToolMasteryQuiz {...defaultProps} />);
    // The close button is the × character
    const closeBtn = screen.getByRole("button", { name: "×" });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state for unknown family", () => {
    render(<ToolMasteryQuiz {...defaultProps} familyId="nonexistent" />);
    expect(
      screen.getByText(/no mastery questions available/i),
    ).toBeInTheDocument();
  });
});
