import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const stub = (props: Record<string, unknown>) => <svg {...props} />;
  return {
    ...actual,
    Activity: stub,
    Box: stub,
    CheckCircle: stub,
    HelpCircle: stub,
    Layers: stub,
    Network: stub,
    Server: stub,
    Stethoscope: stub,
    Zap: stub,
  };
});

import { ToolQuizCard } from "../ToolQuizCard";

const baseProps = {
  familyId: "gpu-monitoring",
  familyName: "GPU Monitoring",
  familyIcon: "📊",
  tools: ["nvidia-smi", "nvtop", "dcgmi"],
  description: "Quick check? nvidia-smi. Continuous monitoring? nvtop.",
  onTakeQuiz: vi.fn(),
  onTakeMasteryQuiz: vi.fn(),
};

describe("ToolQuizCard", () => {
  it("renders family name and description", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quick check? nvidia-smi. Continuous monitoring? nvtop.",
      ),
    ).toBeInTheDocument();
  });

  it("renders tool count", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("3 tools")).toBeInTheDocument();
  });

  it("renders both quiz rows: Tool Selection and Deep Mastery", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("Tool Selection")).toBeInTheDocument();
    expect(screen.getByText("Deep Mastery")).toBeInTheDocument();
    expect(screen.getByText("10 questions")).toBeInTheDocument();
    expect(screen.getByText("25 questions")).toBeInTheDocument();
  });

  it("shows PASSED badge only when both quizzes passed", () => {
    const { rerender } = render(
      <ToolQuizCard
        {...baseProps}
        quizResult={{ passed: true, score: 3, attempts: 1 }}
      />,
    );
    // Only tool selection passed, not mastery
    expect(screen.queryByText("PASSED")).not.toBeInTheDocument();

    rerender(
      <ToolQuizCard
        {...baseProps}
        masteryResult={{
          passed: true,
          bestScore: 8,
          totalQuestions: 10,
          attempts: 1,
        }}
      />,
    );
    // Only mastery passed, not tool selection
    expect(screen.queryByText("PASSED")).not.toBeInTheDocument();

    rerender(
      <ToolQuizCard
        {...baseProps}
        quizResult={{ passed: true, score: 4, attempts: 1 }}
        masteryResult={{
          passed: true,
          bestScore: 9,
          totalQuestions: 10,
          attempts: 1,
        }}
      />,
    );
    // Both passed
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });

  it("shows tool selection score when attempted", () => {
    render(
      <ToolQuizCard
        {...baseProps}
        quizResult={{ passed: true, score: 3, attempts: 2 }}
      />,
    );
    expect(screen.getByText("Best: 3/10 (2 attempts)")).toBeInTheDocument();
  });

  it("shows mastery score when attempted", () => {
    render(
      <ToolQuizCard
        {...baseProps}
        masteryResult={{
          passed: false,
          bestScore: 6,
          totalQuestions: 10,
          attempts: 1,
        }}
      />,
    );
    expect(screen.getByText("Best: 6/10 (1 attempt)")).toBeInTheDocument();
  });

  it("shows 'Not attempted' for both quizzes when no results", () => {
    render(<ToolQuizCard {...baseProps} />);
    const notAttempted = screen.getAllByText("Not attempted");
    expect(notAttempted).toHaveLength(2);
  });

  it("calls onTakeQuiz when Tool Selection button clicked", () => {
    const onTakeQuiz = vi.fn();
    render(<ToolQuizCard {...baseProps} onTakeQuiz={onTakeQuiz} />);
    const buttons = screen.getAllByRole("button", { name: /take quiz/i });
    fireEvent.click(buttons[0]);
    expect(onTakeQuiz).toHaveBeenCalledWith("gpu-monitoring");
  });

  it("calls onTakeMasteryQuiz when Deep Mastery button clicked", () => {
    const onTakeMasteryQuiz = vi.fn();
    render(
      <ToolQuizCard {...baseProps} onTakeMasteryQuiz={onTakeMasteryQuiz} />,
    );
    const buttons = screen.getAllByRole("button", { name: /take quiz/i });
    fireEvent.click(buttons[1]);
    expect(onTakeMasteryQuiz).toHaveBeenCalledWith("gpu-monitoring");
  });

  it("renders card with neutral border styling", () => {
    const { container } = render(<ToolQuizCard {...baseProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-gray-700");
  });
});
