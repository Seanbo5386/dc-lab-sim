// src/components/__tests__/ExamGuideReference.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamGuideReference } from "../ExamGuideReference";

describe("ExamGuideReference", () => {
  it("renders the component heading", () => {
    render(<ExamGuideReference />);
    expect(screen.getByText(/NCP-AII Exam Guide/i)).toBeInTheDocument();
  });

  it("renders all 5 exam domains", () => {
    render(<ExamGuideReference />);
    expect(screen.getByText(/Domain 1/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 2/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 3/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 5/)).toBeInTheDocument();
  });

  it("renders exam overview section", () => {
    render(<ExamGuideReference />);
    expect(screen.getByText("Exam Overview")).toBeInTheDocument();
    expect(screen.getByText("50-60")).toBeInTheDocument(); // Questions
    expect(screen.getByText("70%")).toBeInTheDocument(); // Passing score
  });

  it("renders critical knowledge section", () => {
    render(<ExamGuideReference />);
    expect(
      screen.getByText(/Critical Knowledge: Must Memorize/i),
    ).toBeInTheDocument();
  });

  it("renders study tips section", () => {
    render(<ExamGuideReference />);
    expect(screen.getByText(/Exam Preparation Strategy/i)).toBeInTheDocument();
  });

  it("renders official resources section", () => {
    render(<ExamGuideReference />);
    expect(
      screen.getAllByText(/Official NVIDIA Resources/i).length,
    ).toBeGreaterThan(0);
  });
});
