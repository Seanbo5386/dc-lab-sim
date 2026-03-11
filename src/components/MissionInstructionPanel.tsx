/**
 * MissionInstructionPanel - Full-height left panel for Mission Mode.
 *
 * Shows step instructions, commands, objectives, hints, and quizzes
 * in a vertical layout with a scrollable content area and sticky bottom bar.
 */

import { useState, useCallback, useEffect } from "react";
import { validateCommandExecuted } from "@/utils/commandValidator";
import { InlineQuiz } from "./InlineQuiz";
import type { NarrativeQuiz } from "../types/scenarios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // Reset quiz state when step changes
  useEffect(() => {
    setQuizAnswered(false);
  }, [currentStepIndex]);

  const stepType = currentStep.stepType || "command";
  const isCommandStep = stepType === "command";
  const isConceptStep = stepType === "concept";
  const isObserveStep = stepType === "observe";

  const handleChipClick = useCallback(
    (cmd: string, idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.blur();
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
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 break-words">
        {/* Step counter + dot indicators */}
        <div>
          <span className="text-sm text-gray-400">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-1 mt-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full ${
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

        {/* Situation section */}
        {currentStep.situation && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Situation
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {currentStep.situation}
            </p>
          </div>
        )}

        {/* Your Task section */}
        {(currentStep.task || currentStep.description) && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Your Task
            </h4>
            <p className="text-sm text-white font-medium leading-relaxed">
              {currentStep.task || currentStep.description}
            </p>
          </div>
        )}

        {/* Commands (command steps) */}
        {isCommandStep &&
          currentStep.expectedCommands &&
          currentStep.expectedCommands.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Commands
              </h4>
              <div className="flex flex-col gap-2">
                {currentStep.expectedCommands.map((cmd, idx) => {
                  const isExecuted = commandsExecuted.some((exe) =>
                    validateCommandExecuted(exe, [cmd]),
                  );
                  const isFlashing = flashingChip === idx;
                  return (
                    <button
                      key={idx}
                      onClick={(e) =>
                        !isExecuted && handleChipClick(cmd, idx, e)
                      }
                      disabled={isExecuted}
                      className={`font-mono text-sm px-3 py-2 rounded border text-left transition-all duration-200 ${
                        isExecuted
                          ? "bg-gray-900/50 text-green-500/60 border-green-900/50 cursor-default line-through"
                          : isFlashing
                            ? "bg-gray-900 text-green-400 border-green-500 shadow-[0_0_6px_rgba(118,185,0,0.4)]"
                            : "bg-gray-900 text-gray-300 border-gray-600 hover:border-nvidia-green hover:text-nvidia-green cursor-pointer"
                      }`}
                      title={
                        isExecuted ? "Executed" : "Click to paste into terminal"
                      }
                    >
                      <span className="mr-2">
                        {isExecuted ? "\u2713" : "\u25CB"}
                      </span>
                      {cmd}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        {/* Concept content (concept steps) */}
        {isConceptStep && (
          <div
            tabIndex={0}
            className="text-sm text-purple-300 bg-purple-900/20 rounded px-4 py-3 whitespace-pre-line"
          >
            {currentStep.conceptText ||
              currentStep.conceptContent ||
              currentStep.description}
          </div>
        )}

        {/* Observe command (observe steps) */}
        {isObserveStep && currentStep.observeCommand && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Run This Command
            </h4>
            <button
              onClick={() => onPasteCommand(currentStep.observeCommand!)}
              className="font-mono text-sm bg-gray-900 text-blue-300 border border-blue-800 rounded px-3 py-2 hover:border-blue-500 cursor-pointer transition-colors"
              title="Click to paste into terminal"
            >
              $ {currentStep.observeCommand}
            </button>
          </div>
        )}

        {/* Objectives */}
        {currentStep.objectives && currentStep.objectives.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Objectives
            </h4>
            <ul className="space-y-1.5">
              {currentStep.objectives.map((obj, idx) => {
                const passed = objectivesPassed[idx] ?? false;
                return (
                  <li
                    key={idx}
                    className={`text-sm flex items-start gap-2 ${
                      passed ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {passed ? "\u2713" : "\u25CB"}
                    </span>
                    {obj}
                  </li>
                );
              })}
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
              className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium"
            >
              Hint ({revealedHintCount}/{availableHintCount})
            </button>
            {revealedHints.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {revealedHints.map((hint, idx) => (
                  <li key={idx} className="text-sm text-gray-300">
                    <span className="text-yellow-400 font-mono mr-1.5">
                      {idx + 1}.
                    </span>
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
            <div>
              <InlineQuiz
                quiz={currentStep.narrativeQuiz!}
                onComplete={(correct) => {
                  setQuizAnswered(true);
                  onQuizComplete?.(correct);
                }}
              />
            </div>
          )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-gray-700 p-3">
        {/* Next/Finish button */}
        {isStepCompleted && (!currentStep.narrativeQuiz || quizAnswered) && (
          <button
            onClick={onNextStep}
            className="w-full bg-nvidia-green hover:bg-green-500 text-black text-sm font-bold py-2.5 rounded transition-colors"
          >
            {currentStepIndex + 1 < totalSteps
              ? "Next \u2192"
              : "Finish \u2192"}
          </button>
        )}

        {/* Continue button for concept/observe steps without quiz */}
        {!isStepCompleted &&
          (isConceptStep || isObserveStep) &&
          !currentStep.narrativeQuiz && (
            <button
              onClick={onContinue}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded transition-colors"
            >
              Continue
            </button>
          )}
      </div>
    </div>
  );
}
