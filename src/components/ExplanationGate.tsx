/**
 * ExplanationGate Component - Teachable moment for incorrect tool usage
 *
 * Shows a modal-style overlay when the learner uses the wrong tool or approaches
 * a problem inefficiently during a scenario. Presents a multiple-choice question
 * to help them understand why a particular tool is better for the task.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Lightbulb } from "lucide-react";
import { useLearningProgressStore } from "../store/learningProgressStore";

// ============================================================================
// TYPES
// ============================================================================

interface ExplanationGateData {
  id: string;
  scenarioId: string;
  familyId: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

interface ExplanationGatesJson {
  explanationGates: ExplanationGateData[];
}

interface ExplanationGateProps {
  /** ID of the gate from explanationGates.json */
  gateId: string;
  /** Called when user answers correctly */
  onComplete: () => void;
  /** Optional close without answering */
  onDismiss?: () => void;
}

type GateState = "question" | "correct" | "incorrect";

// ============================================================================
// COMPONENT
// ============================================================================

export const ExplanationGate: React.FC<ExplanationGateProps> = ({
  gateId,
  onComplete,
  onDismiss,
}) => {
  // Dynamically loaded gate data
  const [explanationGatesData, setExplanationGatesData] =
    useState<ExplanationGatesJson | null>(null);

  useEffect(() => {
    import("../data/explanationGates.json").then((m) =>
      setExplanationGatesData(m.default as ExplanationGatesJson),
    );
  }, []);

  // Load gate data
  const gateData = useMemo(() => {
    if (!explanationGatesData) return undefined;
    return explanationGatesData.explanationGates.find(
      (gate) => gate.id === gateId,
    );
  }, [gateId, explanationGatesData]);

  // Component state
  const [gateState, setGateState] = useState<GateState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Get the recordExplanationGate function from the store
  const recordExplanationGate = useLearningProgressStore(
    (state) => state.recordExplanationGate,
  );

  // Handle answer selection
  const handleAnswerSelect = useCallback(
    (index: number) => {
      if (gateState === "question") {
        setSelectedAnswer(index);
      }
    },
    [gateState],
  );

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null || !gateData) return;

    setAttemptCount((prev) => prev + 1);

    if (selectedAnswer === gateData.correctAnswer) {
      setGateState("correct");
      // Record the gate result in the store
      recordExplanationGate(gateId, gateData.scenarioId, true);
    } else {
      setGateState("incorrect");
      // Record the failed attempt
      recordExplanationGate(gateId, gateData.scenarioId, false);
    }
  }, [selectedAnswer, gateData, gateId, recordExplanationGate]);

  // Handle retry after incorrect answer
  const handleRetry = useCallback(() => {
    setGateState("question");
    setSelectedAnswer(null);
  }, []);

  // Handle continue after correct answer
  const handleContinue = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Handle dismiss (close without completing)
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  // Loading state while JSON is fetched
  if (!explanationGatesData) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full text-center border border-gray-700">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle case when gate data is not found
  if (!gateData) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full text-center border border-gray-700">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            Explanation gate not found: {gateId}
          </p>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render the question view
  const renderQuestion = () => (
    <div className="flex flex-col">
      {/* Header icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <Lightbulb className="w-8 h-8 text-yellow-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white text-center mb-2">
        Teachable Moment
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        Let's make sure you understand the right approach
      </p>

      {/* Question */}
      <div className="bg-gray-800/50 rounded-lg p-5 mb-6 border border-gray-700">
        <p className="text-gray-200 text-base leading-relaxed m-0">
          {gateData.question}
        </p>
      </div>

      {/* Answer choices */}
      <div className="space-y-3 mb-6">
        {gateData.choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            aria-label={`Select answer ${String.fromCharCode(65 + index)}`}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedAnswer === index
                ? "border-nvidia-green bg-nvidia-green/10 text-white"
                : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                  selectedAnswer === index
                    ? "border-nvidia-green bg-nvidia-green text-black"
                    : "border-gray-600 text-gray-500"
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm">{choice}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={selectedAnswer === null}
        className={`w-full py-3 rounded-lg font-bold transition-colors ${
          selectedAnswer !== null
            ? "bg-nvidia-green hover:bg-nvidia-darkgreen text-black cursor-pointer"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        Check Answer
      </button>

      {/* Dismiss button if available */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="mt-3 w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Skip for now
        </button>
      )}
    </div>
  );

  // Render correct answer feedback
  const renderCorrect = () => (
    <div className="flex flex-col">
      {/* Success header */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-green-400 text-center mb-2">
        Correct!
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        {attemptCount === 1
          ? "You got it on the first try!"
          : `You got it after ${attemptCount} attempts.`}
      </p>

      {/* Explanation */}
      <div className="bg-green-900/30 rounded-lg p-5 mb-6 border border-green-500/50">
        <div className="text-green-400 text-xs uppercase tracking-wide font-semibold mb-2">
          Explanation
        </div>
        <p className="text-gray-300 text-sm leading-relaxed m-0">
          {gateData.explanation}
        </p>
      </div>

      {/* Your answer indicator */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
          Your Answer
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-white text-sm">
            {gateData.choices[gateData.correctAnswer]}
          </span>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        className="w-full py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors"
      >
        Continue
      </button>
    </div>
  );

  // Render incorrect answer feedback
  const renderIncorrect = () => (
    <div className="flex flex-col">
      {/* Error header */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-red-400 text-center mb-2">
        Not Quite
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        Let's review the correct answer
      </p>

      {/* Correct answer reveal */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
        <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
          Your Answer
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">
            {selectedAnswer !== null && gateData.choices[selectedAnswer]}
          </span>
        </div>
      </div>

      <div className="bg-green-900/30 rounded-lg p-4 mb-4 border border-green-500/50">
        <div className="text-green-400 text-xs uppercase tracking-wide font-semibold mb-2">
          Correct Answer
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm">
            {gateData.choices[gateData.correctAnswer]}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-gray-800/50 rounded-lg p-5 mb-6 border border-gray-700">
        <div className="text-nvidia-green text-xs uppercase tracking-wide font-semibold mb-2">
          Why?
        </div>
        <p className="text-gray-300 text-sm leading-relaxed m-0">
          {gateData.explanation}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-xl w-full max-h-[90vh] overflow-auto border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Learning Check</span>
          </div>
          {onDismiss && gateState === "question" && (
            <button
              onClick={handleDismiss}
              className="bg-transparent border-none text-gray-500 text-2xl cursor-pointer leading-none px-2 hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {gateState === "question" && renderQuestion()}
          {gateState === "correct" && renderCorrect()}
          {gateState === "incorrect" && renderIncorrect()}
        </div>
      </div>
    </div>
  );
};

export default ExplanationGate;
