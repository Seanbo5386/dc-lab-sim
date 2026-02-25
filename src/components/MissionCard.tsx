/**
 * MissionCard - Compact inline mission panel rendered inside the terminal column.
 *
 * Fixed-height (~100-120px) panel with four rows:
 * 1. Header: title + tier badge + step N/M indicators + info icon
 * 2. Task: current step description (2-3 lines)
 * 3. Commands: clickable command chips (click-to-paste) or concept/observe content
 * 4. Footer: objective progress + hint button + next/continue
 */

import { useState, useCallback } from "react";
import { validateCommandExecuted } from "@/utils/commandValidator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MissionCardStep {
  id: string;
  title?: string;
  situation?: string;
  task: string;
  description?: string;
  expectedCommands?: string[];
  objectives?: string[];
  hints?: string[];
  validation?: { type: string };
  stepType?: "command" | "concept" | "observe";
  conceptText?: string;
  observeCommand?: string;
  narrativeQuiz?: unknown;
}

export interface MissionCardProps {
  missionTitle: string;
  tier?: 1 | 2 | 3;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: MissionCardStep;
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
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MissionCard({
  missionTitle,
  tier,
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
  learningObjectives,
  narrativeContext,
}: MissionCardProps) {
  const [showHintDropdown, setShowHintDropdown] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [flashingChip, setFlashingChip] = useState<number | null>(null);

  const stepType = currentStep.stepType || "command";
  const isCommandStep = stepType === "command";
  const isConceptStep = stepType === "concept";
  const isObserveStep = stepType === "observe";
  const tierBadge = getTierBadge(tier);

  const passedCount = objectivesPassed.filter(Boolean).length;
  const totalObjectives = objectivesPassed.length;

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
      data-testid="mission-card"
      className="bg-gray-800 border-b border-gray-700 px-3 py-2 shrink-0 select-none"
    >
      {/* Row 1 — Header */}
      <div className="flex items-center gap-2 mb-1">
        <h3
          className="text-sm font-semibold text-white truncate flex-1"
          title={missionTitle}
        >
          {missionTitle}
        </h3>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierBadge.className}`}
        >
          {tierBadge.label}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        {/* Step dot indicators */}
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
        {/* Info popover */}
        {(learningObjectives?.length || narrativeContext) && (
          <div className="relative">
            <button
              onClick={() => setShowInfoPopover(!showInfoPopover)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Mission info"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            {showInfoPopover && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-30">
                {narrativeContext && (
                  <p className="text-xs text-gray-300 mb-2">
                    {narrativeContext}
                  </p>
                )}
                {learningObjectives && learningObjectives.length > 0 && (
                  <>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      What You&apos;ll Learn
                    </h4>
                    <ul className="space-y-0.5">
                      {learningObjectives.map((obj, idx) => (
                        <li
                          key={idx}
                          className="text-[11px] text-gray-400 flex gap-1.5"
                        >
                          <span className="text-nvidia-green">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2 — Current Step Task */}
      <p className="text-xs text-gray-300 leading-snug mb-1.5 line-clamp-2">
        {currentStep.task || currentStep.description}
      </p>

      {/* Row 3 — Commands / Concept / Observe */}
      {isCommandStep &&
        currentStep.expectedCommands &&
        currentStep.expectedCommands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
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
                  className={`font-mono text-xs px-2 py-1 rounded border transition-all duration-200 ${
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
                  <span className="mr-1.5">{isExecuted ? "✓" : "○"}</span>
                  {cmd}
                </button>
              );
            })}
          </div>
        )}

      {isConceptStep && (
        <p className="text-xs text-purple-300 bg-purple-900/20 rounded px-2 py-1.5 mb-1.5 line-clamp-3">
          {currentStep.conceptText || currentStep.description}
        </p>
      )}

      {isObserveStep && currentStep.observeCommand && (
        <div className="mb-1.5">
          <button
            onClick={() => onPasteCommand(currentStep.observeCommand!)}
            className="font-mono text-xs bg-gray-900 text-blue-300 border border-blue-800 rounded px-2 py-1 hover:border-blue-500 cursor-pointer transition-colors"
            title="Click to paste into terminal"
          >
            $ {currentStep.observeCommand}
          </button>
        </div>
      )}

      {/* Row 4 — Status Footer */}
      <div className="flex items-center gap-2 text-[11px]">
        {/* Objective progress */}
        {totalObjectives > 0 && (
          <span className="text-gray-400">
            {passedCount}/{totalObjectives} objectives
          </span>
        )}

        <div className="flex-1" />

        {/* Hint button */}
        {availableHintCount > 0 && !isStepCompleted && (
          <div className="relative">
            <button
              onClick={() => {
                if (revealedHintCount < availableHintCount) {
                  onRevealHint();
                }
                setShowHintDropdown(!showHintDropdown);
              }}
              className="text-yellow-400 hover:text-yellow-300 transition-colors text-[11px]"
            >
              Hint ({revealedHintCount}/{availableHintCount})
            </button>
            {showHintDropdown && revealedHintCount > 0 && (
              <div className="absolute bottom-full right-0 mb-1 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 z-20">
                <ul className="space-y-1">
                  {revealedHints.map((hint, idx) => (
                    <li key={idx} className="text-[11px] text-gray-300">
                      <span className="text-yellow-400 font-mono mr-1">
                        {idx + 1}.
                      </span>
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step complete / Next / Continue */}
        {isStepCompleted ? (
          <button
            onClick={onNextStep}
            className="bg-nvidia-green text-black text-[11px] font-semibold px-2.5 py-1 rounded hover:bg-green-500 transition-colors"
          >
            {currentStepIndex + 1 < totalSteps ? "Next →" : "Finish →"}
          </button>
        ) : (isConceptStep || isObserveStep) && !currentStep.narrativeQuiz ? (
          <button
            onClick={onContinue}
            className="bg-green-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
