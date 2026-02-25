import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionCard } from "../MissionCard";
import type { MissionCardProps } from "../MissionCard";

// Mock commandValidator
vi.mock("../../utils/commandValidator", () => ({
  validateCommandExecuted: vi.fn((executed: string, expected: string[]) =>
    expected.some((e) => executed === e),
  ),
}));

// Mock InlineQuiz
vi.mock("../InlineQuiz", () => ({
  InlineQuiz: ({ onComplete }: { onComplete: (c: boolean) => void }) => (
    <div data-testid="inline-quiz">
      <button onClick={() => onComplete(true)}>Answer Quiz</button>
    </div>
  ),
}));

const mockStep = {
  id: "step-1",
  title: "Check GPU Status",
  situation: "A GPU on dgx-01 is showing elevated temperatures.",
  task: "Run nvidia-smi to check GPU status",
  description: "Use nvidia-smi to inspect GPU health",
  expectedCommands: ["nvidia-smi", "nvidia-smi -q"],
  objectives: ["Check GPU temperatures", "Verify GPU utilization"],
  hints: ["Try nvidia-smi first"],
  validation: { type: "command" },
  stepType: "command" as const,
};

const defaultProps: MissionCardProps = {
  missionTitle: "Thermal Runaway Investigation",
  tier: 1,
  currentStepIndex: 0,
  totalSteps: 5,
  currentStep: mockStep,
  commandsExecuted: [],
  objectivesPassed: [false, false],
  isStepCompleted: false,
  onPasteCommand: vi.fn(),
  onNextStep: vi.fn(),
  onContinue: vi.fn(),
  onRevealHint: vi.fn(),
  availableHintCount: 3,
  revealedHintCount: 0,
  revealedHints: [],
};

describe("MissionCard", () => {
  describe("header row", () => {
    it("renders mission title and step indicator", () => {
      render(<MissionCard {...defaultProps} />);
      expect(
        screen.getByText("Thermal Runaway Investigation"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
    });

    it("renders tier badge", () => {
      render(<MissionCard {...defaultProps} />);
      expect(screen.getByText("Guided")).toBeInTheDocument();
    });

    it("renders step dot indicators", () => {
      const { container } = render(<MissionCard {...defaultProps} />);
      const dots = container.querySelectorAll(".rounded-full.w-1\\.5");
      expect(dots.length).toBe(5);
    });
  });

  describe("task row", () => {
    it("renders step task text", () => {
      render(<MissionCard {...defaultProps} />);
      expect(screen.getByText(mockStep.task)).toBeInTheDocument();
    });
  });

  describe("command chips", () => {
    it("renders expected command chips", () => {
      render(<MissionCard {...defaultProps} />);
      expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
      expect(screen.getByText("nvidia-smi -q")).toBeInTheDocument();
    });

    it("calls onPasteCommand when clicking a command chip", () => {
      const onPaste = vi.fn();
      render(<MissionCard {...defaultProps} onPasteCommand={onPaste} />);
      fireEvent.click(screen.getByText("nvidia-smi"));
      expect(onPaste).toHaveBeenCalledWith("nvidia-smi");
    });

    it("disables executed command chips", () => {
      render(
        <MissionCard {...defaultProps} commandsExecuted={["nvidia-smi"]} />,
      );
      const chip = screen.getByText("nvidia-smi").closest("button");
      expect(chip).toBeDisabled();
    });

    it("shows checkmark on executed commands", () => {
      render(
        <MissionCard {...defaultProps} commandsExecuted={["nvidia-smi"]} />,
      );
      const chip = screen.getByText("nvidia-smi").closest("button");
      expect(chip?.textContent).toContain("✓");
    });

    it("renders concept text for concept steps", () => {
      const conceptStep = {
        ...mockStep,
        stepType: "concept" as const,
        conceptText: "NVLink provides high-bandwidth GPU interconnect.",
        expectedCommands: [],
      };
      render(<MissionCard {...defaultProps} currentStep={conceptStep} />);
      expect(screen.getByText(/NVLink provides/)).toBeInTheDocument();
      expect(screen.queryByText("nvidia-smi")).not.toBeInTheDocument();
    });

    it("renders observe command for observe steps", () => {
      const observeStep = {
        ...mockStep,
        stepType: "observe" as const,
        observeCommand: "dmesg | grep -i gpu",
        expectedCommands: [],
      };
      render(<MissionCard {...defaultProps} currentStep={observeStep} />);
      expect(screen.getByText(/dmesg \| grep -i gpu/)).toBeInTheDocument();
    });
  });

  describe("footer", () => {
    it("renders objective progress count", () => {
      render(
        <MissionCard {...defaultProps} objectivesPassed={[true, false]} />,
      );
      expect(screen.getByText(/1\/2 objectives/i)).toBeInTheDocument();
    });

    it("shows Next button when step is completed", () => {
      render(<MissionCard {...defaultProps} isStepCompleted={true} />);
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("shows Finish on last step", () => {
      render(
        <MissionCard
          {...defaultProps}
          isStepCompleted={true}
          currentStepIndex={4}
          totalSteps={5}
        />,
      );
      expect(screen.getByText("Finish")).toBeInTheDocument();
    });

    it("calls onNextStep when Next is clicked", () => {
      const onNext = vi.fn();
      render(
        <MissionCard
          {...defaultProps}
          isStepCompleted={true}
          onNextStep={onNext}
        />,
      );
      fireEvent.click(screen.getByText("Next"));
      expect(onNext).toHaveBeenCalled();
    });

    it("shows Continue button for concept steps without quiz", () => {
      const conceptStep = {
        ...mockStep,
        stepType: "concept" as const,
        expectedCommands: [],
        narrativeQuiz: undefined,
      };
      render(<MissionCard {...defaultProps} currentStep={conceptStep} />);
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("calls onContinue when Continue button is clicked", () => {
      const onContinue = vi.fn();
      const conceptStep = {
        ...mockStep,
        stepType: "concept" as const,
        expectedCommands: [],
        narrativeQuiz: undefined,
      };
      render(
        <MissionCard
          {...defaultProps}
          currentStep={conceptStep}
          onContinue={onContinue}
        />,
      );
      fireEvent.click(screen.getByText("Continue"));
      expect(onContinue).toHaveBeenCalled();
    });

    it("shows Continue button for observe steps without quiz", () => {
      const observeStep = {
        ...mockStep,
        stepType: "observe" as const,
        observeCommand: "dmesg | grep -i gpu",
        expectedCommands: [],
        narrativeQuiz: undefined,
      };
      render(<MissionCard {...defaultProps} currentStep={observeStep} />);
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("shows hint button with count", () => {
      render(
        <MissionCard
          {...defaultProps}
          availableHintCount={3}
          revealedHintCount={1}
          revealedHints={["Try running nvidia-smi first"]}
        />,
      );
      expect(screen.getByText(/Hint \(1\/3\)/)).toBeInTheDocument();
    });

    it("calls onRevealHint when hint button clicked", () => {
      const onHint = vi.fn();
      render(
        <MissionCard
          {...defaultProps}
          onRevealHint={onHint}
          availableHintCount={3}
          revealedHintCount={0}
        />,
      );
      fireEvent.click(screen.getByText(/Hint/));
      expect(onHint).toHaveBeenCalled();
    });
  });

  describe("info popover", () => {
    it("shows learning objectives when info icon clicked", () => {
      render(
        <MissionCard
          {...defaultProps}
          learningObjectives={[
            "Understand GPU monitoring",
            "Read temperature data",
          ]}
          narrativeContext="You're investigating a thermal alert."
        />,
      );
      fireEvent.click(screen.getByTitle("Mission info"));
      expect(screen.getByText(/What You.*Learn/)).toBeInTheDocument();
      expect(screen.getByText("Understand GPU monitoring")).toBeInTheDocument();
      expect(
        screen.getByText(/investigating a thermal alert/),
      ).toBeInTheDocument();
    });

    it("does not show info icon without objectives or context", () => {
      render(<MissionCard {...defaultProps} />);
      expect(screen.queryByTitle("Mission info")).not.toBeInTheDocument();
    });
  });

  describe("quiz expansion", () => {
    const quizStep = {
      ...mockStep,
      narrativeQuiz: {
        question: "What does nvidia-smi show?",
        options: ["GPU info", "CPU info"],
        correctIndex: 0,
        explanation: "nvidia-smi shows GPU information",
      },
    };

    it("shows InlineQuiz when step is completed and has quiz", () => {
      render(
        <MissionCard
          {...defaultProps}
          currentStep={quizStep}
          isStepCompleted={true}
          onQuizComplete={vi.fn()}
        />,
      );
      expect(screen.getByTestId("inline-quiz")).toBeInTheDocument();
    });

    it("does not show InlineQuiz before step completion for command steps", () => {
      render(
        <MissionCard
          {...defaultProps}
          currentStep={quizStep}
          isStepCompleted={false}
          onQuizComplete={vi.fn()}
        />,
      );
      expect(screen.queryByTestId("inline-quiz")).not.toBeInTheDocument();
    });

    it("shows InlineQuiz immediately for concept steps with quiz", () => {
      const conceptQuizStep = {
        ...quizStep,
        stepType: "concept" as const,
        expectedCommands: [],
      };
      render(
        <MissionCard
          {...defaultProps}
          currentStep={conceptQuizStep}
          isStepCompleted={false}
          onQuizComplete={vi.fn()}
        />,
      );
      expect(screen.getByTestId("inline-quiz")).toBeInTheDocument();
    });

    it("does not show InlineQuiz when onQuizComplete is not provided", () => {
      render(
        <MissionCard
          {...defaultProps}
          currentStep={quizStep}
          isStepCompleted={true}
        />,
      );
      expect(screen.queryByTestId("inline-quiz")).not.toBeInTheDocument();
    });

    it("calls onQuizComplete when quiz is answered", () => {
      const onQuiz = vi.fn();
      render(
        <MissionCard
          {...defaultProps}
          currentStep={quizStep}
          isStepCompleted={true}
          onQuizComplete={onQuiz}
        />,
      );
      fireEvent.click(screen.getByText("Answer Quiz"));
      expect(onQuiz).toHaveBeenCalledWith(true);
    });
  });
});
