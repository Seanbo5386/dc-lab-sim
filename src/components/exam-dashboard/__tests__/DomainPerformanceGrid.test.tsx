import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockDomainProgress = {
  domain1: { questionsAttempted: 20, questionsCorrect: 16 },
  domain2: { questionsAttempted: 5, questionsCorrect: 3 },
  domain3: { questionsAttempted: 10, questionsCorrect: 4 },
  domain4: { questionsAttempted: 15, questionsCorrect: 12 },
  domain5: { questionsAttempted: 0, questionsCorrect: 0 },
};

vi.mock("../../../store/learningStore", () => ({
  useLearningStore: vi.fn(
    (
      selector?: (s: { domainProgress: typeof mockDomainProgress }) => unknown,
    ) =>
      selector
        ? selector({ domainProgress: mockDomainProgress })
        : { domainProgress: mockDomainProgress },
  ),
}));

import { DomainPerformanceGrid } from "../DomainPerformanceGrid";

describe("DomainPerformanceGrid", () => {
  it("renders all 5 domains with correct weights", () => {
    render(<DomainPerformanceGrid />);
    expect(screen.getByText("Platform Bring-Up")).toBeInTheDocument();
    expect(screen.getByText("Accelerator Configuration")).toBeInTheDocument();
    expect(screen.getByText("Base Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Validation & Testing")).toBeInTheDocument();
    expect(screen.getByText("Troubleshooting")).toBeInTheDocument();

    // Check weights
    expect(screen.getByText("Weight: 31%")).toBeInTheDocument();
    expect(screen.getByText("Weight: 5%")).toBeInTheDocument();
    expect(screen.getByText("Weight: 19%")).toBeInTheDocument();
    expect(screen.getByText("Weight: 33%")).toBeInTheDocument();
    expect(screen.getByText("Weight: 12%")).toBeInTheDocument();
  });

  it("shows correct fractions and percentages for domains with data", () => {
    render(<DomainPerformanceGrid />);
    // domain1: 16/20 = 80%
    expect(screen.getByText("16/20 (80%)")).toBeInTheDocument();
    // domain2: 3/5 = 60%
    expect(screen.getByText("3/5 (60%)")).toBeInTheDocument();
    // domain3: 4/10 = 40%
    expect(screen.getByText("4/10 (40%)")).toBeInTheDocument();
    // domain4: 12/15 = 80%
    expect(screen.getByText("12/15 (80%)")).toBeInTheDocument();
  });

  it("does not show fractions for domains with 0 attempts", () => {
    render(<DomainPerformanceGrid />);
    // domain5 has 0 attempts, should not show fraction
    expect(screen.queryByText("0/0")).not.toBeInTheDocument();
  });
});
