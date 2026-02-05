/**
 * SpacedReviewDrill Component - Quick retention drills for spaced repetition
 *
 * Provides 2-minute drill sessions that pop up when reviews are due,
 * testing retention of command family knowledge through scenario-based questions.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  generateReviewQuestion,
  type ReviewQuestion,
  type CommandFamily,
} from "../utils/spacedRepetition";
import { useLearningProgressStore } from "../store/learningProgressStore";
import commandFamiliesData from "../data/commandFamilies.json";
import type { CommandFamiliesData } from "../types/commandFamilies";

interface SpacedReviewDrillProps {
  /** Specific family to review, or random from due reviews if undefined */
  familyId?: string;
  /** Called when the drill is completed */
  onComplete: () => void;
  /** Called when user wants to snooze the review */
  onSnooze?: (days: number) => void;
}

type DrillState = "question" | "feedback";

/** Default timer duration in seconds */
const DRILL_TIMER_SECONDS = 120;

export const SpacedReviewDrill: React.FC<SpacedReviewDrillProps> = ({
  familyId,
  onComplete,
  onSnooze,
}) => {
  // Store access
  const { reviewSchedule, recordReviewResult, getDueReviews } =
    useLearningProgressStore();

  // State
  const [drillState, setDrillState] = useState<DrillState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] =
    useState<number>(DRILL_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState<boolean>(true);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<boolean>(false);

  // Get command families data
  const families = useMemo(() => {
    const data = commandFamiliesData as CommandFamiliesData;
    // Convert to the format expected by generateReviewQuestion
    return data.families.map((f) => ({
      id: f.id,
      name: f.name,
      tools: f.tools.map((t) => ({
        name: t.name,
        bestFor: t.bestFor,
        tagline: t.tagline,
      })),
    })) as CommandFamily[];
  }, []);

  // Determine which family to review
  const targetFamilyId = useMemo(() => {
    if (familyId) return familyId;

    // Get due reviews and pick the first one
    const dueReviews = getDueReviews();
    if (dueReviews.length > 0) {
      return dueReviews[0];
    }

    // Fallback: pick a random family from those with review schedules
    const scheduledFamilies = Object.keys(reviewSchedule);
    if (scheduledFamilies.length > 0) {
      return scheduledFamilies[
        Math.floor(Math.random() * scheduledFamilies.length)
      ];
    }

    // Final fallback: pick a random family
    return (
      families[Math.floor(Math.random() * families.length)]?.id ||
      "gpu-monitoring"
    );
  }, [familyId, getDueReviews, reviewSchedule, families]);

  // Generate question
  const question = useMemo((): ReviewQuestion => {
    return generateReviewQuestion(targetFamilyId, families);
  }, [targetFamilyId, families]);

  // Get family display info
  const familyInfo = useMemo(() => {
    const data = commandFamiliesData as CommandFamiliesData;
    return data.families.find((f) => f.id === targetFamilyId);
  }, [targetFamilyId]);

  // Timer effect
  useEffect(() => {
    if (!timerActive || drillState === "feedback") return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, drillState]);

  // Handle answer selection
  const handleSelectAnswer = useCallback(
    (answer: string) => {
      if (drillState === "feedback") return;
      setSelectedAnswer(answer);
    },
    [drillState],
  );

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || drillState === "feedback") return;

    const correct = selectedAnswer === question.correctAnswer;
    setIsCorrect(correct);
    setDrillState("feedback");
    setTimerActive(false);

    // Record the result
    recordReviewResult(targetFamilyId, correct);
  }, [
    selectedAnswer,
    drillState,
    question.correctAnswer,
    recordReviewResult,
    targetFamilyId,
  ]);

  // Handle snooze
  const handleSnooze = useCallback(
    (days: number) => {
      setShowSnoozeMenu(false);
      if (onSnooze) {
        onSnooze(days);
      }
      onComplete();
    },
    [onSnooze, onComplete],
  );

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Timer color based on remaining time
  const timerColorClass = useMemo(() => {
    if (timeRemaining <= 30) return "text-red-400";
    if (timeRemaining <= 60) return "text-yellow-400";
    return "text-gray-400";
  }, [timeRemaining]);

  // Empty state check
  if (!question || question.choices.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md mx-auto shadow-xl">
        <div className="text-center">
          <p className="text-gray-400">No review questions available.</p>
          <button
            onClick={onComplete}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg mx-auto shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-5 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{familyInfo?.icon || "📝"}</span>
            <div>
              <h3 className="text-white font-semibold text-base m-0">
                Review Drill
              </h3>
              <p className="text-gray-500 text-xs m-0 mt-0.5">
                {familyInfo?.name || "Command Family"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            {drillState === "question" && (
              <div className={`font-mono text-sm ${timerColorClass}`}>
                {formatTime(timeRemaining)}
              </div>
            )}
            {/* Snooze dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1 rounded transition-colors"
                title="Snooze"
              >
                Snooze
              </button>
              {showSnoozeMenu && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 min-w-[140px]">
                  <button
                    onClick={() => handleSnooze(1)}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
                  >
                    In 1 day
                  </button>
                  <button
                    onClick={() => handleSnooze(3)}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
                  >
                    In 3 days
                  </button>
                </div>
              )}
            </div>
            {/* Close button */}
            <button
              onClick={onComplete}
              className="text-gray-500 hover:text-gray-300 text-xl leading-none px-1 transition-colors"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="p-5">
        {drillState === "question" && (
          <>
            {/* Scenario */}
            <div className="mb-5">
              <p className="text-gray-300 text-sm leading-relaxed m-0">
                {question.scenario}
              </p>
            </div>

            {/* Answer choices */}
            <div className="space-y-2 mb-5">
              {question.choices.map((choice) => {
                const isSelected = selectedAnswer === choice;
                return (
                  <button
                    key={choice}
                    onClick={() => handleSelectAnswer(choice)}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-all text-sm ${
                      isSelected
                        ? "border-nvidia-green bg-nvidia-green/10 text-white"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                    }`}
                  >
                    <code className="font-mono text-nvidia-green">
                      {choice}
                    </code>
                  </button>
                );
              })}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className={`w-full py-3 rounded-md font-bold text-sm transition-colors ${
                selectedAnswer
                  ? "bg-nvidia-green hover:bg-nvidia-darkgreen text-black cursor-pointer"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Submit Answer
            </button>
          </>
        )}

        {drillState === "feedback" && (
          <>
            {/* Result indicator */}
            <div
              className={`text-center mb-5 p-4 rounded-lg ${
                isCorrect
                  ? "bg-green-900/30 border border-green-700"
                  : "bg-red-900/30 border border-red-700"
              }`}
            >
              <div
                className={`text-2xl mb-2 ${
                  isCorrect ? "text-green-400" : "text-red-400"
                }`}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </div>
              {!isCorrect && (
                <p className="text-gray-400 text-sm m-0">
                  The correct answer is{" "}
                  <code className="text-nvidia-green font-mono">
                    {question.correctAnswer}
                  </code>
                </p>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-gray-800 rounded-lg p-4 mb-5">
              <h4 className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                Explanation
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed m-0">
                {question.explanation}
              </p>
            </div>

            {/* Next review info */}
            <div className="bg-gray-800/50 rounded-lg p-3 mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Next review scheduled based on your result.</span>
              </div>
            </div>

            {/* Continue button */}
            <button
              onClick={onComplete}
              className="w-full py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-md text-sm transition-colors"
            >
              Continue
            </button>
          </>
        )}
      </div>

      {/* Progress indicator */}
      {drillState === "question" && (
        <div className="px-5 pb-4">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeRemaining <= 30
                  ? "bg-red-500"
                  : timeRemaining <= 60
                    ? "bg-yellow-500"
                    : "bg-nvidia-green"
              }`}
              style={{
                width: `${(timeRemaining / DRILL_TIMER_SECONDS) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SpacedReviewDrill;
