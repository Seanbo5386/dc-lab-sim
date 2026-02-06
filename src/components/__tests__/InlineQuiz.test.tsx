import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineQuiz } from "../InlineQuiz";

const mockQuiz = {
  question: "What does SEL stand for?",
  options: [
    "System Event Log",
    "Serial Error Log",
    "Sensor Entry List",
    "Server Event Ledger",
  ],
  correctIndex: 0,
  explanation: "SEL = System Event Log.",
};

describe("InlineQuiz", () => {
  it("should render the question", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    expect(screen.getByText(/what does sel stand for/i)).toBeInTheDocument();
  });

  it("should render all 4 options", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    expect(screen.getByText("System Event Log")).toBeInTheDocument();
    expect(screen.getByText("Serial Error Log")).toBeInTheDocument();
    expect(screen.getByText("Sensor Entry List")).toBeInTheDocument();
    expect(screen.getByText("Server Event Ledger")).toBeInTheDocument();
  });

  it("should show correct feedback on right answer", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("System Event Log"));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(/SEL = System Event Log/i)).toBeInTheDocument();
  });

  it("should show incorrect feedback on wrong answer", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Serial Error Log"));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("should call onComplete with result", () => {
    const onComplete = vi.fn();
    render(<InlineQuiz quiz={mockQuiz} onComplete={onComplete} />);
    fireEvent.click(screen.getByText("System Event Log"));
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it("should call onComplete with false on wrong answer", () => {
    const onComplete = vi.fn();
    render(<InlineQuiz quiz={mockQuiz} onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Serial Error Log"));
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it("should disable options after answering", () => {
    render(<InlineQuiz quiz={mockQuiz} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("System Event Log"));
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
