# Mission Mode UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current mission UX (small MissionCard above terminal, dashboard visible) with a dedicated Mission Mode: cinematic briefing on entry, two-column layout (instruction panel + terminal), dashboard hidden but accessible via slide-over.

**Architecture:** Conditional layout swap in App.tsx. When `activeScenario` is set and briefing is dismissed, the entire app renders a different layout — MissionModeBar + MissionInstructionPanel + Terminal — instead of the normal header/nav/dashboard/footer. Terminal avoids re-mount via a portal rendered into a shared container ref. Four new components, two modified files.

**Tech Stack:** React 18, TypeScript, TailwindCSS, lucide-react icons, Zustand (useSimulationStore)

---

### Task 1: Create DashboardSlideOver Component

The simplest new component. A slide-over panel that wraps the existing Dashboard and slides in from the right.

**Files:**
- Create: `src/components/DashboardSlideOver.tsx`
- Create: `src/components/__tests__/DashboardSlideOver.test.tsx`

**Step 1: Write tests**

```tsx
// src/components/__tests__/DashboardSlideOver.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSlideOver } from "../DashboardSlideOver";

// Mock Dashboard since it has heavy dependencies
vi.mock("../Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard-content">Dashboard</div>,
}));

describe("DashboardSlideOver", () => {
  const onClose = vi.fn();

  it("renders dashboard content when open", () => {
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<DashboardSlideOver isOpen={false} onClose={onClose} />);
    expect(screen.queryByTestId("dashboard-content")).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("slide-over-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button is clicked", () => {
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    render(<DashboardSlideOver isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/DashboardSlideOver.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement DashboardSlideOver**

```tsx
// src/components/DashboardSlideOver.tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { Dashboard } from "./Dashboard";

interface DashboardSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSlideOver({ isOpen, onClose }: DashboardSlideOverProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        data-testid="slide-over-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel — slides from right */}
      <div className="absolute top-0 right-0 bottom-0 w-[60vw] max-w-[900px] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-300">Cluster State</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard content */}
        <div className="flex-1 overflow-auto">
          <Dashboard />
        </div>
      </div>

      {/* Slide animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/DashboardSlideOver.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DashboardSlideOver.tsx src/components/__tests__/DashboardSlideOver.test.tsx
git commit -m "feat: add DashboardSlideOver component for mission mode"
```

---

### Task 2: Create MissionModeBar Component

The slim header bar shown during mission mode. Displays mission title, step progress, abort button, and cluster toggle.

**Files:**
- Create: `src/components/MissionModeBar.tsx`
- Create: `src/components/__tests__/MissionModeBar.test.tsx`

**Step 1: Write tests**

```tsx
// src/components/__tests__/MissionModeBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionModeBar } from "../MissionModeBar";

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    ArrowLeft: createIcon("ArrowLeft"),
    BarChart3: createIcon("BarChart3"),
  };
});

describe("MissionModeBar", () => {
  const defaultProps = {
    title: "The Midnight Deployment",
    currentStep: 2,
    totalSteps: 10,
    tier: 1 as const,
    onAbort: vi.fn(),
    onToggleDashboard: vi.fn(),
  };

  it("renders mission title", () => {
    render(<MissionModeBar {...defaultProps} />);
    expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
  });

  it("renders step progress", () => {
    render(<MissionModeBar {...defaultProps} />);
    expect(screen.getByText(/Step 3 of 10/)).toBeInTheDocument();
  });

  it("renders correct number of step dots", () => {
    render(<MissionModeBar {...defaultProps} />);
    const dots = screen.getByTestId("step-dots").children;
    expect(dots.length).toBe(10);
  });

  it("calls onAbort when abort button is clicked", () => {
    render(<MissionModeBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /abort/i }));
    expect(defaultProps.onAbort).toHaveBeenCalledOnce();
  });

  it("calls onToggleDashboard when cluster button is clicked", () => {
    render(<MissionModeBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cluster/i }));
    expect(defaultProps.onToggleDashboard).toHaveBeenCalledOnce();
  });

  it("renders tier badge", () => {
    render(<MissionModeBar {...defaultProps} />);
    expect(screen.getByText("Guided")).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/MissionModeBar.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement MissionModeBar**

```tsx
// src/components/MissionModeBar.tsx
import { ArrowLeft, BarChart3 } from "lucide-react";

interface MissionModeBarProps {
  title: string;
  currentStep: number; // 0-indexed
  totalSteps: number;
  tier?: 1 | 2 | 3;
  onAbort: () => void;
  onToggleDashboard: () => void;
}

function getTierBadge(tier?: 1 | 2 | 3): { label: string; className: string } {
  switch (tier) {
    case 1:
      return { label: "Guided", className: "bg-green-600 text-white" };
    case 2:
      return { label: "Choice", className: "bg-yellow-500 text-black" };
    case 3:
      return { label: "Realistic", className: "bg-red-600 text-white" };
    default:
      return { label: "Standard", className: "bg-gray-600 text-white" };
  }
}

export function MissionModeBar({
  title,
  currentStep,
  totalSteps,
  tier,
  onAbort,
  onToggleDashboard,
}: MissionModeBarProps) {
  const tierBadge = getTierBadge(tier);

  return (
    <div className="bg-black border-b border-gray-800 px-4 py-2 flex items-center gap-4 shrink-0">
      {/* Abort button */}
      <button
        onClick={onAbort}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        aria-label="Abort mission"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Abort</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-700" />

      {/* Tier badge */}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierBadge.className}`}>
        {tierBadge.label}
      </span>

      {/* Title */}
      <h1 className="text-sm font-semibold text-white truncate flex-1 min-w-0">
        {title}
      </h1>

      {/* Step progress */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <div data-testid="step-dots" className="flex gap-0.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                i < currentStep
                  ? "bg-nvidia-green"
                  : i === currentStep
                    ? "ring-1 ring-nvidia-green bg-nvidia-green/40"
                    : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-700" />

      {/* Cluster toggle */}
      <button
        onClick={onToggleDashboard}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-nvidia-green transition-colors"
        aria-label="Toggle cluster dashboard"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="hidden sm:inline">Cluster</span>
      </button>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/MissionModeBar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/MissionModeBar.tsx src/components/__tests__/MissionModeBar.test.tsx
git commit -m "feat: add MissionModeBar component for mission mode header"
```

---

### Task 3: Create MissionInstructionPanel Component

The full-height left panel displaying step instructions, commands, objectives, hints. This is essentially an expanded version of MissionCard's content with more room to breathe. It reuses the same props interface.

**Files:**
- Create: `src/components/MissionInstructionPanel.tsx`
- Create: `src/components/__tests__/MissionInstructionPanel.test.tsx`

**Step 1: Write tests**

```tsx
// src/components/__tests__/MissionInstructionPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionInstructionPanel } from "../MissionInstructionPanel";

describe("MissionInstructionPanel", () => {
  const defaultProps = {
    missionTitle: "The Midnight Deployment",
    tier: 1 as const,
    currentStepIndex: 1,
    totalSteps: 5,
    currentStep: {
      id: "step-2",
      situation: "GPU 3 is showing degraded performance with rising temperatures.",
      task: "Run DCGM diagnostics to identify the root cause of the performance degradation.",
      expectedCommands: ["dcgmi diag -r 1", "nvidia-smi -q -d TEMPERATURE"],
      objectives: ["Run diagnostic level 1", "Check GPU temperatures"],
      hints: ["Try running dcgmi diag first", "Look at the ECC error counts"],
    },
    commandsExecuted: ["dcgmi diag -r 1"],
    objectivesPassed: [true, false],
    isStepCompleted: false,
    onPasteCommand: vi.fn(),
    onNextStep: vi.fn(),
    onContinue: vi.fn(),
    onRevealHint: vi.fn(),
    availableHintCount: 2,
    revealedHintCount: 0,
    revealedHints: [] as string[],
    onQuizComplete: vi.fn(),
  };

  it("renders the situation text in full", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText(/GPU 3 is showing degraded performance/)).toBeInTheDocument();
  });

  it("renders the task text in full", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText(/Run DCGM diagnostics/)).toBeInTheDocument();
  });

  it("renders command chips", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText("dcgmi diag -r 1")).toBeInTheDocument();
    expect(screen.getByText("nvidia-smi -q -d TEMPERATURE")).toBeInTheDocument();
  });

  it("marks executed commands with strikethrough styling", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    const executedChip = screen.getByText("dcgmi diag -r 1").closest("button");
    expect(executedChip?.className).toContain("line-through");
  });

  it("calls onPasteCommand when unexecuted command chip is clicked", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("nvidia-smi -q -d TEMPERATURE"));
    expect(defaultProps.onPasteCommand).toHaveBeenCalledWith("nvidia-smi -q -d TEMPERATURE");
  });

  it("renders objectives with pass/fail indicators", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText("Run diagnostic level 1")).toBeInTheDocument();
    expect(screen.getByText("Check GPU temperatures")).toBeInTheDocument();
  });

  it("renders step counter", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument();
  });

  it("shows Next button when step is completed", () => {
    render(<MissionInstructionPanel {...defaultProps} isStepCompleted={true} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("does not show Next button when step is not completed", () => {
    render(<MissionInstructionPanel {...defaultProps} isStepCompleted={false} />);
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("shows Finish instead of Next on last step", () => {
    render(
      <MissionInstructionPanel
        {...defaultProps}
        currentStepIndex={4}
        isStepCompleted={true}
      />,
    );
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
  });

  it("renders hint button with correct count", () => {
    render(<MissionInstructionPanel {...defaultProps} />);
    expect(screen.getByText(/Hint/)).toBeInTheDocument();
    expect(screen.getByText(/0\/2/)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/MissionInstructionPanel.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement MissionInstructionPanel**

This component shares logic with MissionCard but has a vertical full-height layout. Extract the shared prop types from MissionCard.

```tsx
// src/components/MissionInstructionPanel.tsx
import { useState, useCallback, useEffect } from "react";
import { validateCommandExecuted } from "@/utils/commandValidator";
import { InlineQuiz } from "./InlineQuiz";
import type { NarrativeQuiz } from "../types/scenarios";

interface MissionStep {
  id: string;
  title?: string;
  situation?: string;
  task?: string;
  description?: string;
  expectedCommands?: string[];
  objectives?: string[];
  hints?: string[];
  validation?: { type: string };
  stepType?: "command" | "concept" | "observe";
  conceptText?: string;
  conceptContent?: string;
  observeCommand?: string;
  narrativeQuiz?: NarrativeQuiz;
}

export interface MissionInstructionPanelProps {
  missionTitle: string;
  tier?: 1 | 2 | 3;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: MissionStep;
  commandsExecuted: string[];
  objectivesPassed: boolean[];
  isStepCompleted: boolean;
  onPasteCommand: (cmd: string) => void;
  onNextStep: () => void;
  onContinue: () => void;
  onRevealHint: () => void;
  availableHintCount: number;
  revealedHintCount: number;
  revealedHints: string[];
  learningObjectives?: string[];
  narrativeContext?: string;
  onQuizComplete?: (correct: boolean) => void;
}

export function MissionInstructionPanel({
  currentStepIndex,
  totalSteps,
  currentStep,
  commandsExecuted,
  objectivesPassed,
  isStepCompleted,
  onPasteCommand,
  onNextStep,
  onContinue,
  onRevealHint,
  availableHintCount,
  revealedHintCount,
  revealedHints,
  onQuizComplete,
}: MissionInstructionPanelProps) {
  const [flashingChip, setFlashingChip] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  useEffect(() => {
    setQuizAnswered(false);
  }, [currentStepIndex]);

  const stepType = currentStep.stepType || "command";
  const isCommandStep = stepType === "command";
  const isConceptStep = stepType === "concept";
  const isObserveStep = stepType === "observe";

  const handleChipClick = useCallback(
    (cmd: string, idx: number) => {
      onPasteCommand(cmd);
      setFlashingChip(idx);
      setTimeout(() => setFlashingChip(null), 600);
    },
    [onPasteCommand],
  );

  return (
    <div
      data-testid="mission-instruction-panel"
      className="flex flex-col h-full bg-gray-900 border-r border-gray-700"
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Step counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  i < currentStepIndex
                    ? "bg-nvidia-green"
                    : i === currentStepIndex
                      ? "ring-1 ring-nvidia-green bg-nvidia-green/40"
                      : "bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Situation */}
        {currentStep.situation && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Situation
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {currentStep.situation}
            </p>
          </div>
        )}

        {/* Task */}
        {(currentStep.task || currentStep.description) && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Your Task
            </h3>
            <p className="text-sm text-white leading-relaxed font-medium">
              {currentStep.task || currentStep.description}
            </p>
          </div>
        )}

        {/* Commands (command steps) */}
        {isCommandStep && currentStep.expectedCommands && currentStep.expectedCommands.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Commands
            </h3>
            <div className="flex flex-col gap-2">
              {currentStep.expectedCommands.map((cmd, idx) => {
                const isExecuted = commandsExecuted.some((exe) =>
                  validateCommandExecuted(exe, [cmd]),
                );
                const isFlashing = flashingChip === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => !isExecuted && handleChipClick(cmd, idx)}
                    disabled={isExecuted}
                    className={`font-mono text-sm px-3 py-2 rounded border text-left transition-all duration-200 ${
                      isExecuted
                        ? "bg-gray-900/50 text-green-500/60 border-green-900/50 cursor-default line-through"
                        : isFlashing
                          ? "bg-gray-900 text-green-400 border-green-500 shadow-[0_0_6px_rgba(118,185,0,0.4)]"
                          : "bg-gray-800 text-gray-300 border-gray-600 hover:border-nvidia-green hover:text-nvidia-green cursor-pointer"
                    }`}
                    title={isExecuted ? "Executed" : "Click to paste into terminal"}
                  >
                    <span className="mr-2">{isExecuted ? "✓" : "○"}</span>
                    {cmd}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Concept content */}
        {isConceptStep && (
          <div
            tabIndex={0}
            className="text-sm text-purple-300 bg-purple-900/20 rounded-lg px-4 py-3 whitespace-pre-line leading-relaxed"
          >
            {currentStep.conceptText || currentStep.conceptContent || currentStep.description}
          </div>
        )}

        {/* Observe command */}
        {isObserveStep && currentStep.observeCommand && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Run This Command
            </h3>
            <button
              onClick={() => onPasteCommand(currentStep.observeCommand!)}
              className="font-mono text-sm bg-gray-800 text-blue-300 border border-blue-800 rounded-lg px-4 py-2 hover:border-blue-500 cursor-pointer transition-colors w-full text-left"
              title="Click to paste into terminal"
            >
              $ {currentStep.observeCommand}
            </button>
          </div>
        )}

        {/* Objectives */}
        {currentStep.objectives && currentStep.objectives.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Objectives
            </h3>
            <ul className="space-y-1.5">
              {currentStep.objectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className={objectivesPassed[idx] ? "text-nvidia-green" : "text-gray-600"}>
                    {objectivesPassed[idx] ? "✓" : "○"}
                  </span>
                  <span className={objectivesPassed[idx] ? "text-gray-400" : "text-gray-300"}>
                    {obj}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hints */}
        {availableHintCount > 0 && !isStepCompleted && (
          <div>
            <button
              onClick={() => {
                if (revealedHintCount < availableHintCount) {
                  onRevealHint();
                }
              }}
              className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Hint ({revealedHintCount}/{availableHintCount})
            </button>
            {revealedHintCount > 0 && (
              <ul className="mt-2 space-y-1.5">
                {revealedHints.map((hint, idx) => (
                  <li key={idx} className="text-sm text-gray-400 flex gap-2">
                    <span className="text-yellow-400 font-mono">{idx + 1}.</span>
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Inline quiz */}
        {!!currentStep.narrativeQuiz &&
          onQuizComplete &&
          (isStepCompleted || isConceptStep || isObserveStep) && (
            <InlineQuiz
              quiz={currentStep.narrativeQuiz!}
              onComplete={(correct) => {
                setQuizAnswered(true);
                onQuizComplete?.(correct);
              }}
            />
          )}
      </div>

      {/* Bottom bar — Next/Continue/Finish */}
      <div className="shrink-0 border-t border-gray-700 p-3">
        {isStepCompleted && (!currentStep.narrativeQuiz || quizAnswered) && (
          <button
            onClick={onNextStep}
            className="w-full bg-nvidia-green hover:bg-green-500 text-black font-bold py-3 rounded-lg transition-colors text-sm"
          >
            {currentStepIndex + 1 < totalSteps ? "Next →" : "Finish →"}
          </button>
        )}
        {!isStepCompleted && (isConceptStep || isObserveStep) && !currentStep.narrativeQuiz && (
          <button
            onClick={onContinue}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/MissionInstructionPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/MissionInstructionPanel.tsx src/components/__tests__/MissionInstructionPanel.test.tsx
git commit -m "feat: add MissionInstructionPanel for full-height mission instructions"
```

---

### Task 4: Create MissionBriefing Component

The cinematic full-screen briefing that plays when a mission starts. Features animated text reveal and typed narrative hook.

**Files:**
- Create: `src/components/MissionBriefing.tsx`
- Create: `src/components/__tests__/MissionBriefing.test.tsx`

**Step 1: Write tests**

```tsx
// src/components/__tests__/MissionBriefing.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionBriefing } from "../MissionBriefing";

// Mock useFocusTrap
const mockUseFocusTrap = vi.fn();
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: (...args: unknown[]) => mockUseFocusTrap(...args),
}));

describe("MissionBriefing", () => {
  const defaultProps = {
    title: "The Midnight Deployment",
    narrative: {
      hook: "A new cluster has arrived at midnight.",
      setting: "You're the lead engineer on call.",
      resolution: "Successfully bring the cluster online.",
    },
    tier: 1 as const,
    estimatedTime: 15,
    onBegin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the mission title", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByText("The Midnight Deployment")).toBeInTheDocument();
  });

  it("renders the narrative setting text", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByText(/lead engineer on call/)).toBeInTheDocument();
  });

  it("renders the Accept Mission button", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByRole("button", { name: /accept mission/i })).toBeInTheDocument();
  });

  it("calls onBegin when Accept Mission is clicked", () => {
    render(<MissionBriefing {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /accept mission/i }));
    expect(defaultProps.onBegin).toHaveBeenCalledOnce();
  });

  it("renders tier badge", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByText("Guided")).toBeInTheDocument();
  });

  it("renders estimated time", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    render(<MissionBriefing {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders skip button when skippable", () => {
    render(<MissionBriefing {...defaultProps} skippable={true} onSkip={vi.fn()} />);
    expect(screen.getByText(/skip/i)).toBeInTheDocument();
  });

  it("does not render skip button when not skippable", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(screen.queryByText(/skip/i)).not.toBeInTheDocument();
  });

  it("configures useFocusTrap", () => {
    render(<MissionBriefing {...defaultProps} />);
    expect(mockUseFocusTrap).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/MissionBriefing.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement MissionBriefing**

```tsx
// src/components/MissionBriefing.tsx
import { useState, useEffect, useRef } from "react";
import { Crosshair, Clock, Zap } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface MissionBriefingProps {
  title: string;
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  tier?: 1 | 2 | 3;
  estimatedTime?: number;
  onBegin: () => void;
  skippable?: boolean;
  onSkip?: () => void;
}

function getTierBadge(tier?: 1 | 2 | 3): { label: string; className: string } {
  switch (tier) {
    case 1:
      return { label: "Guided", className: "bg-green-600 text-white" };
    case 2:
      return { label: "Choice", className: "bg-yellow-500 text-black" };
    case 3:
      return { label: "Realistic", className: "bg-red-600 text-white" };
    default:
      return { label: "Standard", className: "bg-gray-600 text-white" };
  }
}

const CHAR_DELAY = 35; // ms per character for typing the hook

export function MissionBriefing({
  title,
  narrative,
  tier,
  estimatedTime,
  onBegin,
  skippable,
  onSkip,
}: MissionBriefingProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0); // 0=fade-in, 1=title, 2=hook-typing, 3=setting, 4=ready
  const [typedHook, setTypedHook] = useState("");
  const [skippedAnimation, setSkippedAnimation] = useState(false);

  const tierBadge = getTierBadge(tier);

  useFocusTrap(modalRef, {
    isActive: true,
    onEscape: onBegin,
  });

  // Animation sequence
  useEffect(() => {
    if (skippedAnimation) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Title appears (400ms)
    timers.push(setTimeout(() => setPhase(1), 400));

    // Phase 2: Start typing hook (800ms)
    timers.push(setTimeout(() => setPhase(2), 800));

    // Phase 2 typing: character by character
    const hookText = narrative.hook;
    for (let i = 0; i <= hookText.length; i++) {
      timers.push(
        setTimeout(() => {
          setTypedHook(hookText.slice(0, i));
        }, 800 + i * CHAR_DELAY),
      );
    }

    // Phase 3: Setting fades in (after hook finishes)
    const hookDone = 800 + hookText.length * CHAR_DELAY + 300;
    timers.push(setTimeout(() => setPhase(3), hookDone));

    // Phase 4: Button ready (after setting)
    timers.push(setTimeout(() => setPhase(4), hookDone + 500));

    return () => timers.forEach(clearTimeout);
  }, [narrative.hook, skippedAnimation]);

  // Skip animation on click
  const handleSkipAnimation = () => {
    if (phase < 4) {
      setSkippedAnimation(true);
      setTypedHook(narrative.hook);
      setPhase(4);
    }
  };

  return (
    <div
      data-testid="mission-briefing"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleSkipAnimation}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-briefing-title"
        className="relative w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Green accent bar */}
        <div className="h-1 bg-nvidia-green rounded-t-xl shadow-[0_0_20px_rgba(118,185,0,0.4)]" />

        <div className="bg-gray-900 border border-gray-700 border-t-0 rounded-b-xl px-8 py-8">
          {/* Icon */}
          <div
            className={`w-16 h-16 mx-auto mb-5 rounded-full bg-nvidia-green/20 flex items-center justify-center transition-all duration-500 ${
              phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
          >
            <Crosshair className="w-8 h-8 text-nvidia-green" />
          </div>

          {/* Title + badges */}
          <div
            className={`text-center mb-5 transition-all duration-500 ${
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2
              id="mission-briefing-title"
              className="text-2xl font-bold text-nvidia-green mb-2"
            >
              {title}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${tierBadge.className}`}>
                {tierBadge.label}
              </span>
              {estimatedTime && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  ~{estimatedTime} min
                </span>
              )}
            </div>
          </div>

          {/* Hook — typed out */}
          <div
            className={`mb-5 min-h-[3rem] transition-opacity duration-300 ${
              phase >= 2 ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-base text-white font-medium leading-relaxed italic text-center">
              &ldquo;{typedHook}&rdquo;
              {phase === 2 && !skippedAnimation && (
                <span className="inline-block w-0.5 h-4 bg-nvidia-green ml-0.5 animate-pulse" />
              )}
            </p>
          </div>

          {/* Setting */}
          <div
            className={`mb-6 transition-all duration-500 ${
              phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-sm text-gray-400 leading-relaxed text-center">
              {narrative.setting}
            </p>
          </div>

          {/* Accept Mission button */}
          <div
            className={`transition-all duration-500 ${
              phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBegin();
              }}
              className="w-full px-6 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-all text-base shadow-[0_0_15px_rgba(118,185,0,0.3)] hover:shadow-[0_0_25px_rgba(118,185,0,0.5)]"
            >
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Accept Mission
              </span>
            </button>

            {skippable && onSkip && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="mt-3 text-sm text-gray-400 hover:text-gray-200 underline transition-colors block mx-auto"
              >
                I'm familiar with Linux basics — skip this tutorial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/MissionBriefing.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/MissionBriefing.tsx src/components/__tests__/MissionBriefing.test.tsx
git commit -m "feat: add cinematic MissionBriefing component"
```

---

### Task 5: Wire Up Mission Mode Layout in App.tsx

This is the main integration task. Modify App.tsx to conditionally swap between the normal layout and mission mode layout.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add imports at the top of App.tsx**

Add these imports alongside the existing component imports:

```tsx
import { MissionBriefing } from "./components/MissionBriefing";
import { MissionModeBar } from "./components/MissionModeBar";
import { MissionInstructionPanel } from "./components/MissionInstructionPanel";
import { DashboardSlideOver } from "./components/DashboardSlideOver";
```

**Step 2: Add `showDashboardSlideOver` state**

Near the existing `showNarrativeIntro` state (around line 136), add:

```tsx
const [showDashboardSlideOver, setShowDashboardSlideOver] = useState(false);
```

Also reset it when scenario ends. In the `useEffect` that watches `activeScenario?.id` (around line 151), add:

```tsx
useEffect(() => {
  if (activeScenario) {
    setShowNarrativeIntro(true);
    setShowDashboardSlideOver(false); // Reset slide-over on new scenario
  }
}, [activeScenario?.id]);
```

**Step 3: Add abort handler**

Near `handleStartScenario` (around line 201), add:

```tsx
const handleAbortMission = useCallback(() => {
  if (window.confirm("Abort this mission? Your progress on the current step will be lost.")) {
    exitScenario();
    setShowLabWorkspace(false);
    setShowDashboardSlideOver(false);
  }
}, [exitScenario]);
```

**Step 4: Derive `isMissionMode` flag**

After the existing `isNarrative` derivation (around line 140), add:

```tsx
const isMissionMode =
  activeScenario != null &&
  !showNarrativeIntro &&
  !scenarioProgressData?.completed;
```

**Step 5: Wrap the existing layout in the conditional**

The key structural change. The existing layout (header + nav + main + footer) only renders when NOT in mission mode. When in mission mode, render the new layout instead.

Replace the JSX inside the outer `<div className="h-screen ...">` with:

```tsx
{isMissionMode ? (
  /* ============ MISSION MODE LAYOUT ============ */
  <>
    <MissionModeBar
      title={activeScenario!.title}
      currentStep={/* derived from SimulatorView — see Step 6 */}
      totalSteps={activeScenario!.steps.length}
      tier={activeScenario!.tier}
      onAbort={handleAbortMission}
      onToggleDashboard={() => setShowDashboardSlideOver((v) => !v)}
    />
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Instructions (~35%) */}
      <div className="w-[35%] min-w-[300px] max-w-[480px] shrink-0">
        <MissionInstructionPanel
          {/* props derived same as MissionCard — see Step 6 */}
        />
      </div>
      {/* Right: Terminal (~65%) */}
      <div className="flex-1 overflow-hidden">
        <Terminal className="h-full" onReady={/* see Step 6 */} />
      </div>
    </div>
    <DashboardSlideOver
      isOpen={showDashboardSlideOver}
      onClose={() => setShowDashboardSlideOver(false)}
    />
  </>
) : (
  /* ============ NORMAL LAYOUT ============ */
  <>
    {/* Skip link */}
    {/* Small screen warning */}
    {/* Header + Nav */}
    {/* Main content */}
    {/* Footer */}
    {/* LabWorkspace overlay */}
  </>
)}
```

**Step 6: Lift MissionCard data derivation from SimulatorView to App.tsx**

The MissionInstructionPanel needs the same props that MissionCard gets in SimulatorView (lines 245-283). These are derived from `activeScenario`, `scenarioProgress`, `stepValidation`, etc.

Move this derivation logic into App.tsx (or into a custom hook `useMissionData`) so both the MissionModeBar and MissionInstructionPanel can access it.

Create a helper in App.tsx:

```tsx
// Derive mission data when activeScenario exists
const missionProgress = activeScenario ? scenarioProgress[activeScenario.id] : undefined;
const missionStepIndex = missionProgress?.currentStepIndex ?? 0;
const missionCurrentStep = activeScenario?.steps[missionStepIndex];
```

Pass `missionStepIndex` to `MissionModeBar.currentStep`.

For MissionInstructionPanel, the full prop derivation needs `stepValidation`, `HintManager`, and `revealHint` — these are currently only available inside SimulatorView. The cleanest approach: **keep SimulatorView rendering in mission mode but have it conditionally render just the Terminal** (no Dashboard, no MissionCard). MissionInstructionPanel gets wired in App.tsx using a new `pasteCommandRef` that SimulatorView exposes.

Alternative (simpler): Keep SimulatorView as the right panel in mission mode. SimulatorView already has all the MissionCard data derivation. Just add a `missionMode` prop to SimulatorView that:
- Hides the Dashboard (left panel)
- Hides the tab bar
- Hides MissionCard
- Renders only the Terminal at full size
- Exposes the derived mission data via a callback prop

**Recommended approach — add `missionMode` prop to SimulatorView:**

```tsx
// SimulatorView.tsx — new prop
interface SimulatorViewProps {
  className?: string;
  missionMode?: boolean;
  onMissionData?: (data: MissionData) => void;
}
```

When `missionMode` is true:
- Skip rendering Dashboard, drag handle, tab bar, MissionCard
- Render only Terminal at full size
- Call `onMissionData` with current step data so App.tsx can feed MissionInstructionPanel

**Step 7: Replace NarrativeIntro with MissionBriefing**

Replace the NarrativeIntro conditional (App.tsx lines 564-581) with:

```tsx
{activeScenario &&
  isNarrative &&
  showNarrativeIntro &&
  !scenarioProgressData?.completed && (
    <MissionBriefing
      title={activeScenario.title}
      narrative={activeScenario.narrative!}
      tier={activeScenario.tier}
      estimatedTime={activeScenario.estimatedTime}
      onBegin={() => setShowNarrativeIntro(false)}
      skippable={activeScenario.skippable}
      onSkip={() => {
        activeScenario.steps.forEach((step) => {
          completeScenarioStep(activeScenario.id, step.id);
        });
        setShowNarrativeIntro(false);
      }}
    />
  )}
```

**Step 8: Run all tests**

Run: `npx vitest run`
Expected: All tests pass. Some existing App-level tests may need updates if they rely on NarrativeIntro rendering.

**Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up Mission Mode layout with conditional layout swap"
```

---

### Task 6: Add missionMode Prop to SimulatorView

Modify SimulatorView to support a `missionMode` prop that renders only the Terminal (no Dashboard, no tabs, no MissionCard).

**Files:**
- Modify: `src/components/SimulatorView.tsx`

**Step 1: Add missionMode prop and MissionData callback**

At the top of SimulatorView, update the props interface:

```tsx
export interface MissionData {
  currentStepIndex: number;
  totalSteps: number;
  currentStep: MissionCardStep; // reuse existing type from MissionCard
  commandsExecuted: string[];
  objectivesPassed: boolean[];
  isStepCompleted: boolean;
  availableHintCount: number;
  revealedHintCount: number;
  revealedHints: string[];
  learningObjectives?: string[];
  narrativeContext?: string;
  handlePasteCommand: (cmd: string) => void;
  handleNextStep: () => void;
  handleContinue: () => void;
  handleRevealHint: () => void;
  handleQuizComplete: (correct: boolean) => void;
}

interface SimulatorViewProps {
  className?: string;
  missionMode?: boolean;
  onMissionData?: (data: MissionData) => void;
}
```

**Step 2: Emit mission data via callback**

After the existing MissionCard data derivation block (lines 245-283), add:

```tsx
// Emit mission data for MissionInstructionPanel in mission mode
useEffect(() => {
  if (missionMode && onMissionData && activeScenario && currentStep) {
    onMissionData({
      currentStepIndex,
      totalSteps: activeScenario.steps.length,
      currentStep,
      commandsExecuted: currentStepProgress?.commandsExecuted || [],
      objectivesPassed,
      isStepCompleted,
      availableHintCount: hintEvaluation?.totalCount || 0,
      revealedHintCount: hintEvaluation?.revealedCount || 0,
      revealedHints: revealedHintTexts,
      learningObjectives: activeScenario.learningObjectives,
      narrativeContext: activeScenario.narrative?.setting,
      handlePasteCommand,
      handleNextStep: () => {
        if (!progress?.completed) {
          completeScenarioStep(activeScenario!.id, currentStep.id);
        }
      },
      handleContinue: () => {
        completeScenarioStep(activeScenario!.id, currentStep.id);
      },
      handleRevealHint: () => {
        if (hintEvaluation?.nextHint) {
          revealHint(activeScenario!.id, currentStep.id, hintEvaluation.nextHint.id);
        }
      },
      handleQuizComplete: (_correct: boolean) => {
        completeScenarioStep(activeScenario!.id, currentStep.id);
      },
    });
  }
}, [
  missionMode, onMissionData, activeScenario, currentStep, currentStepIndex,
  currentStepProgress, objectivesPassed, isStepCompleted, hintEvaluation,
  revealedHintTexts, progress, handlePasteCommand, completeScenarioStep, revealHint,
]);
```

**Step 3: Add early return for mission mode in desktop layout**

Before the existing desktop layout JSX (after the mobile layout `if (isMobile)` block), add:

```tsx
// Mission mode: render only Terminal, no Dashboard/tabs/MissionCard
if (missionMode) {
  return (
    <div className={`flex flex-col ${className}`}>
      <Terminal className="flex-1" onReady={handleTerminalReady} />
    </div>
  );
}
```

**Step 4: Run tests**

Run: `npx vitest run src/components/__tests__/SimulatorView.test.tsx`
Expected: PASS (existing tests unaffected — missionMode defaults to undefined/false)

**Step 5: Commit**

```bash
git add src/components/SimulatorView.tsx
git commit -m "feat: add missionMode prop to SimulatorView for terminal-only rendering"
```

---

### Task 7: Complete App.tsx Integration with MissionData

Now wire the MissionInstructionPanel in App.tsx to the MissionData emitted by SimulatorView.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add missionData state**

```tsx
import type { MissionData } from "./components/SimulatorView";

// Near the other state declarations:
const [missionData, setMissionData] = useState<MissionData | null>(null);
```

**Step 2: Update the mission mode layout JSX**

In the mission mode conditional block, wire everything together:

```tsx
{isMissionMode ? (
  <>
    <MissionModeBar
      title={activeScenario!.title}
      currentStep={missionData?.currentStepIndex ?? 0}
      totalSteps={activeScenario!.steps.length}
      tier={activeScenario!.tier}
      onAbort={handleAbortMission}
      onToggleDashboard={() => setShowDashboardSlideOver((v) => !v)}
    />
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[35%] min-w-[300px] max-w-[480px] shrink-0">
        {missionData && (
          <MissionInstructionPanel
            missionTitle={activeScenario!.title}
            tier={activeScenario!.tier}
            currentStepIndex={missionData.currentStepIndex}
            totalSteps={missionData.totalSteps}
            currentStep={missionData.currentStep}
            commandsExecuted={missionData.commandsExecuted}
            objectivesPassed={missionData.objectivesPassed}
            isStepCompleted={missionData.isStepCompleted}
            onPasteCommand={missionData.handlePasteCommand}
            onNextStep={missionData.handleNextStep}
            onContinue={missionData.handleContinue}
            onRevealHint={missionData.handleRevealHint}
            availableHintCount={missionData.availableHintCount}
            revealedHintCount={missionData.revealedHintCount}
            revealedHints={missionData.revealedHints}
            learningObjectives={missionData.learningObjectives}
            narrativeContext={missionData.narrativeContext}
            onQuizComplete={missionData.handleQuizComplete}
          />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <SimulatorView
          className="h-full"
          missionMode={true}
          onMissionData={setMissionData}
        />
      </div>
    </div>
    <DashboardSlideOver
      isOpen={showDashboardSlideOver}
      onClose={() => setShowDashboardSlideOver(false)}
    />
  </>
) : (
  /* Normal layout — unchanged */
)}
```

**Step 3: Also keep SimulatorView in the normal layout unchanged**

The existing `<SimulatorView className="flex-1 h-full" />` in the normal layout stays as-is (no `missionMode` prop, so it renders the full Dashboard + Terminal).

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: complete Mission Mode integration with instruction panel and data flow"
```

---

### Task 8: Visual Polish and Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual test checklist**

Navigate to the app and run through these scenarios:

1. **Start a narrative mission** — verify cinematic MissionBriefing appears
2. **Click Accept Mission** — verify layout switches to Mission Mode (no header, no nav, no dashboard, no footer)
3. **Check instruction panel** — verify situation, task, commands are visible and readable
4. **Click a command chip** — verify it pastes into terminal
5. **Execute commands** — verify objectives update with green checkmarks
6. **Click Next** — verify step advances, instruction panel updates
7. **Click Cluster button** — verify dashboard slide-over opens from right
8. **Close slide-over** — verify it closes (backdrop click, X button, Escape)
9. **Click Abort** — verify confirmation dialog, then return to normal layout
10. **Complete all steps** — verify NarrativeResolution modal shows
11. **Exit mission** — verify normal layout returns completely
12. **Test at 1366px width** — verify instruction panel doesn't squeeze terminal too much
13. **Test at 1920px width** — verify comfortable spacing

**Step 3: Fix any visual issues**

Common things to adjust:
- Instruction panel width ratio (currently 35%, adjust if needed)
- Spacing between sections in instruction panel
- MissionModeBar height and alignment
- Terminal resize on layout switch (xterm.js needs to `fit()` on container change)

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 5: Run lint and type check**

Run: `npx tsc --noEmit && npx eslint src/components/MissionBriefing.tsx src/components/MissionModeBar.tsx src/components/MissionInstructionPanel.tsx src/components/DashboardSlideOver.tsx src/App.tsx src/components/SimulatorView.tsx`
Expected: 0 errors

**Step 6: Commit any polish fixes**

```bash
git add -A
git commit -m "style: polish Mission Mode layout and responsive adjustments"
```

---

### Task 9: Push and Merge

**Step 1: Push dev branch**

```bash
git push origin dev
```

**Step 2: Merge to main**

```bash
git checkout main && git merge dev --no-edit && git push origin main && git checkout dev
```
