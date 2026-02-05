import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DomainNavigation } from "../DomainNavigation";

const mockOnDomainSelect = vi.fn();
const mockOnFinalAssessment = vi.fn();

describe("DomainNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 5 domain cards", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />,
    );
    expect(screen.getByText(/Domain 1/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 2/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 3/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
    expect(screen.getByText(/Domain 5/)).toBeInTheDocument();
  });

  it("renders Final Assessment card", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />,
    );
    expect(screen.getByText("Final Assessment")).toBeInTheDocument();
  });

  it("calls onDomainSelect when domain card clicked", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />,
    );
    fireEvent.click(screen.getByText(/Domain 4/));
    expect(mockOnDomainSelect).toHaveBeenCalledWith(4);
  });

  it("calls onFinalAssessment when Start Exam clicked", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /start exam/i }));
    expect(mockOnFinalAssessment).toHaveBeenCalled();
  });

  it("shows progress on each domain card", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        progress={{
          1: { completed: 2, total: 4 },
          4: { completed: 1, total: 5 },
        }}
      />,
    );
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("1/5")).toBeInTheDocument();
  });

  it("shows overall progress summary", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        progress={{ 1: { completed: 2, total: 4 } }}
      />,
    );
    expect(screen.getByText(/Overall Progress/)).toBeInTheDocument();
  });

  it("shows recommended scenario", () => {
    render(
      <DomainNavigation
        onDomainSelect={mockOnDomainSelect}
        onFinalAssessment={mockOnFinalAssessment}
        recommendedScenario={{ id: "test", title: "Test Scenario", domain: 4 }}
      />,
    );
    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });
});
