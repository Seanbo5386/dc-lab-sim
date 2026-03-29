import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock xidDrillQuestions with controlled data
vi.mock("../../data/xidDrillQuestions", () => {
  const questions = [
    {
      id: "t1-test-001",
      tier: 1,
      xidCode: 48,
      questionText: "What does XID error 48 indicate?",
      choices: [
        "GPU memory page fault",
        "Uncorrectable double-bit ECC error",
        "High single-bit ECC rate",
        "GPU memory interface failure",
      ],
      correctAnswer: 1,
      explanation: "XID 48 is a Double-Bit ECC Error.",
      category: "identify" as const,
    },
    {
      id: "t1-test-002",
      tier: 1,
      xidCode: 79,
      questionText: "What does XID error 79 indicate?",
      choices: [
        "GPU stopped responding",
        "GPU has fallen off the PCIe bus",
        "NVLink timeout",
        "ECC error uncontained",
      ],
      correctAnswer: 1,
      explanation: "XID 79 means the GPU has fallen off the PCIe bus.",
      category: "identify" as const,
    },
    {
      id: "t2-test-001",
      tier: 2,
      xidCode: 48,
      questionText: "You see this in dmesg. What is the severity?",
      codeSnippet:
        "[  842.156789] NVRM: Xid (PCI:0000:3b:00): 48, Double Bit ECC Error",
      choices: [
        "Warning — restart app",
        "Critical — check ECC counters",
        "Informational — no action",
        "Warning — update drivers",
      ],
      correctAnswer: 1,
      explanation: "XID 48 is Critical severity.",
      category: "triage" as const,
    },
    {
      id: "t2-test-002",
      tier: 2,
      xidCode: 92,
      questionText: "You see this in monitoring. What action should you take?",
      codeSnippet:
        "[12045.678901] NVRM: Xid (PCI:0000:3b:00): 92, High Single-bit ECC",
      choices: [
        "No action needed",
        "Replace GPU immediately",
        "Monitor ECC counters and schedule maintenance",
        "Reset ECC counters",
      ],
      correctAnswer: 2,
      explanation: "XID 92 is Warning severity.",
      category: "triage" as const,
    },
    {
      id: "t3-test-001",
      tier: 3,
      xidCode: [92, 48, 95],
      questionText: "Which error should you prioritize?",
      codeSnippet: `[10000.000000] NVRM: Xid: 92, High Single-bit ECC
[10890.567890] NVRM: Xid: 48, Double Bit ECC Error
[11234.901234] NVRM: Xid: 95, Uncontained ECC Error`,
      choices: [
        "Prioritize XID 92",
        "Prioritize XID 48",
        "Prioritize XID 95",
        "All are equal",
      ],
      correctAnswer: 2,
      explanation: "XID 95 is the immediate priority.",
      category: "scenario" as const,
    },
  ];
  return {
    xidDrillQuestions: questions,
  };
});

// Mock xidErrors with the codes used in test questions
vi.mock("../../data/xidErrors", () => ({
  getXIDByCode: (code: number) => {
    const errors: Record<
      number,
      { code: number; name: string; severity: string; category: string }
    > = {
      48: {
        code: 48,
        name: "Double-Bit ECC Error",
        severity: "Critical",
        category: "Memory",
      },
      79: {
        code: 79,
        name: "GPU Fallen Off Bus",
        severity: "Critical",
        category: "Hardware",
      },
      92: {
        code: 92,
        name: "High Single-Bit ECC Rate",
        severity: "Warning",
        category: "Memory",
      },
      95: {
        code: 95,
        name: "Uncontained ECC Error",
        severity: "Critical",
        category: "Memory",
      },
    };
    return errors[code];
  },
  SEVERITY_COLORS: {
    Critical: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
    Warning: {
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    Informational: {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
  },
  CATEGORY_ICONS: {
    Hardware: "Cpu",
    Driver: "Settings",
    Application: "Code",
    Power: "Zap",
    Memory: "HardDrive",
    NVLink: "Link",
    Thermal: "Thermometer",
  },
}));

import { XIDDrillQuiz } from "../XIDDrillQuiz";

describe("XIDDrillQuiz", () => {
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tier 1 questions without code snippets", () => {
    render(
      <XIDDrillQuiz
        tier={1}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Should show tier 1 header
    expect(screen.getByText("Tier 1: Identification")).toBeInTheDocument();

    // Tier 1 questions have no codeSnippet — no <pre> element should exist
    expect(document.querySelector("pre")).toBeNull();
  });

  it("renders tier 2 questions with code snippets", () => {
    render(
      <XIDDrillQuiz
        tier={2}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Should show tier 2 header
    expect(screen.getByText("Tier 2: Triage")).toBeInTheDocument();

    // Tier 2 questions have codeSnippet — a <pre> element should exist
    expect(document.querySelector("pre")).not.toBeNull();
  });

  it("shows 4 answer choices", () => {
    render(
      <XIDDrillQuiz
        tier={1}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Should have 4 answer choice buttons (plus Submit = 5 buttons, close = 6)
    // Check for the A. B. C. D. labels
    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("B.")).toBeInTheDocument();
    expect(screen.getByText("C.")).toBeInTheDocument();
    expect(screen.getByText("D.")).toBeInTheDocument();
  });

  it("shows feedback after selecting an answer", () => {
    render(
      <XIDDrillQuiz
        tier={1}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select the correct answer (index 1 for first tier 1 question)
    const choiceButtons = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent?.includes("A.") ||
          btn.textContent?.includes("B.") ||
          btn.textContent?.includes("C.") ||
          btn.textContent?.includes("D."),
      );
    fireEvent.click(choiceButtons[1]); // Select B

    // Click submit
    fireEvent.click(screen.getByText("Submit Answer"));

    // Should show feedback
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("shows question progress text", () => {
    render(
      <XIDDrillQuiz
        tier={1}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Tier 1 has 2 mock questions, so "Question 1 of 2"
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("displays severity info in feedback", () => {
    render(
      <XIDDrillQuiz
        tier={1}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />,
    );

    // Select an answer and submit to get to feedback
    const choiceButtons = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent?.includes("A.") ||
          btn.textContent?.includes("B.") ||
          btn.textContent?.includes("C.") ||
          btn.textContent?.includes("D."),
      );
    fireEvent.click(choiceButtons[0]); // Select A
    fireEvent.click(screen.getByText("Submit Answer"));

    // Should show severity badge (XID 48 is Critical)
    expect(screen.getByTestId("severity-badge")).toBeInTheDocument();
    expect(screen.getByTestId("severity-badge").textContent).toBe("Critical");

    // Should show category
    expect(screen.getByText("Memory")).toBeInTheDocument();
  });
});
