import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const stub = (props: Record<string, unknown>) => <svg {...props} />;
  return { ...actual, CheckCircle: stub, HelpCircle: stub, Wrench: stub };
});

import { ToolQuizCard } from "../ToolQuizCard";

const baseProps = {
  familyId: "gpu-monitoring",
  familyName: "GPU Monitoring",
  familyIcon: "📊",
  tools: ["nvidia-smi", "nvtop", "dcgmi"],
  description: "Quick check? nvidia-smi. Continuous monitoring? nvtop.",
  onTakeQuiz: vi.fn(),
};

describe("ToolQuizCard", () => {
  it("renders family name, description, and subtitle", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("GPU Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Tool Selection Quiz")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quick check? nvidia-smi. Continuous monitoring? nvtop.",
      ),
    ).toBeInTheDocument();
  });

  it("renders meta pills with tool count and question count", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("3 tools")).toBeInTheDocument();
    expect(screen.getByText("4 questions")).toBeInTheDocument();
  });

  it("shows PASSED badge and score when quiz completed and passed", () => {
    render(
      <ToolQuizCard
        {...baseProps}
        quizResult={{ passed: true, score: 3, attempts: 2 }}
      />,
    );
    expect(screen.getByText("PASSED")).toBeInTheDocument();
    expect(screen.getByText("Best: 3/4")).toBeInTheDocument();
    expect(screen.getByText("(2 attempts)")).toBeInTheDocument();
  });

  it("does not show PASSED badge when quiz not passed", () => {
    render(
      <ToolQuizCard
        {...baseProps}
        quizResult={{ passed: false, score: 1, attempts: 1 }}
      />,
    );
    expect(screen.queryByText("PASSED")).not.toBeInTheDocument();
    expect(screen.getByText("Best: 1/4")).toBeInTheDocument();
    expect(screen.getByText("(1 attempt)")).toBeInTheDocument();
  });

  it("calls onTakeQuiz(familyId) on button click", () => {
    const onTakeQuiz = vi.fn();
    render(<ToolQuizCard {...baseProps} onTakeQuiz={onTakeQuiz} />);
    fireEvent.click(screen.getByRole("button", { name: /take quiz/i }));
    expect(onTakeQuiz).toHaveBeenCalledWith("gpu-monitoring");
  });

  it("shows 'Not attempted yet' when no quiz result", () => {
    render(<ToolQuizCard {...baseProps} />);
    expect(screen.getByText("Not attempted yet")).toBeInTheDocument();
  });

  it("renders card with neutral border styling", () => {
    const { container } = render(<ToolQuizCard {...baseProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-gray-700");
  });
});
