/**
 * XIDDrillQuiz Component - Modal quiz for XID error code learning
 *
 * Three tiers of progression:
 * - Tier 1: "What does XID X indicate?" identification questions
 * - Tier 2: Triage with code snippets — severity and next-action questions
 * - Tier 3: Multi-XID scenario — prioritization and complex diagnosis
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  xidDrillQuestions,
  type XIDDrillQuestion,
} from "../data/xidDrillQuestions";
import {
  getXIDByCode,
  SEVERITY_COLORS,
  CATEGORY_ICONS,
  type XIDSeverity,
} from "../data/xidErrors";

interface XIDDrillQuizProps {
  tier: 1 | 2 | 3;
  onComplete: (passed: boolean, score: number, totalQuestions: number) => void;
  onClose: () => void;
}

interface AnswerResult {
  questionId: string;
  xidCode: number | number[];
  selectedAnswer: number;
  isCorrect: boolean;
}

type QuizState = "question" | "feedback" | "results";

const TIER_NAMES: Record<1 | 2 | 3, string> = {
  1: "Tier 1: Identification",
  2: "Tier 2: Triage",
  3: "Tier 3: Scenario Analysis",
};

const TIER_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: "Identify what each XID error code indicates",
  2: "Triage XID errors from log output",
  3: "Analyze multi-XID scenarios and prioritize response",
};

const QUESTIONS_PER_TIER: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 10,
  3: 5,
};

const PASS_THRESHOLDS: Record<1 | 2 | 3, number> = {
  1: 0.8,
  2: 0.75,
  3: 0.8,
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const XIDDrillQuiz: React.FC<XIDDrillQuizProps> = ({
  tier,
  onComplete,
  onClose,
}) => {
  const allTierQuestions = useMemo(() => {
    return xidDrillQuestions.filter((q) => q.tier === tier);
  }, [tier]);

  const [questions, setQuestions] = useState<XIDDrillQuestion[]>(() =>
    shuffleArray(allTierQuestions).slice(0, QUESTIONS_PER_TIER[tier]),
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const passingScore = Math.ceil(totalQuestions * PASS_THRESHOLDS[tier]);

  const score = useMemo(() => {
    return results.filter((r) => r.isCorrect).length;
  }, [results]);

  const handleAnswerSelect = useCallback(
    (index: number) => {
      if (quizState === "question") {
        setSelectedAnswer(index);
      }
    },
    [quizState],
  );

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const result: AnswerResult = {
      questionId: currentQuestion.id,
      xidCode: currentQuestion.xidCode,
      selectedAnswer,
      isCorrect,
    };

    setResults((prev) => [...prev, result]);
    setQuizState("feedback");
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizState("question");
    } else {
      setQuizState("results");
    }
  }, [currentQuestionIndex, totalQuestions]);

  const handleRetry = useCallback(() => {
    setQuestions(
      shuffleArray(allTierQuestions).slice(0, QUESTIONS_PER_TIER[tier]),
    );
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setResults([]);
    setQuizState("question");
  }, [allTierQuestions, tier]);

  const handleClose = useCallback(() => {
    if (quizState === "results") {
      onComplete(score >= passingScore, score, totalQuestions);
    }
    onClose();
  }, [quizState, score, passingScore, totalQuestions, onComplete, onClose]);

  // Look up XID info for the current question's code(s)
  const getXIDInfo = (code: number | number[]) => {
    const primaryCode = Array.isArray(code) ? code[0] : code;
    return getXIDByCode(primaryCode);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-nvidia-green font-bold text-sm">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-gray-500 text-sm">
              {score} correct so far
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-nvidia-green transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question text */}
        <p className="text-white text-base font-semibold mb-4">
          {currentQuestion.questionText}
        </p>

        {/* Code snippet for tier 2/3 */}
        {currentQuestion.codeSnippet && (
          <pre className="bg-black text-green-400 font-mono rounded p-4 overflow-x-auto text-sm mb-4 whitespace-pre-wrap">
            {currentQuestion.codeSnippet}
          </pre>
        )}

        {/* Answer choices */}
        <div className="space-y-2 mb-6">
          {currentQuestion.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all text-sm ${
                selectedAnswer === index
                  ? "border-nvidia-green bg-nvidia-green/10 text-white"
                  : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
              }`}
            >
              <span className="text-gray-500 font-mono mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {choice}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={selectedAnswer === null}
          className={`w-full py-3 rounded-lg font-bold transition-colors ${
            selectedAnswer !== null
              ? "bg-nvidia-green hover:bg-nvidia-darkgreen text-black cursor-pointer"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Submit Answer
        </button>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!currentQuestion) return null;

    const lastResult = results[results.length - 1];
    const isCorrect = lastResult?.isCorrect;
    const xidInfo = getXIDInfo(currentQuestion.xidCode);

    return (
      <div className="flex flex-col h-full">
        {/* Result header */}
        <div
          className={`rounded-lg p-5 mb-6 border ${
            isCorrect
              ? "bg-green-900/30 border-green-500"
              : "bg-red-900/30 border-red-500"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{isCorrect ? "✓" : "✗"}</span>
            <span
              className={`text-lg font-bold ${
                isCorrect ? "text-green-400" : "text-red-400"
              }`}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </span>
          </div>
          {!isCorrect && (
            <p className="text-gray-300 text-sm m-0">
              The correct answer was{" "}
              <span className="text-nvidia-green font-semibold">
                {String.fromCharCode(65 + currentQuestion.correctAnswer)}.{" "}
                {currentQuestion.choices[currentQuestion.correctAnswer]}
              </span>
            </p>
          )}
        </div>

        {/* XID Info badges */}
        {xidInfo && (
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded border ${SEVERITY_COLORS[xidInfo.severity].text} ${SEVERITY_COLORS[xidInfo.severity].bg} ${SEVERITY_COLORS[xidInfo.severity].border}`}
              data-testid="severity-badge"
            >
              {xidInfo.severity}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="text-gray-500">
                {CATEGORY_ICONS[xidInfo.category]}
              </span>
              {xidInfo.category}
            </span>
          </div>
        )}

        {/* Explanation */}
        <div className="bg-gray-800/50 rounded-lg p-5 mb-4 border border-gray-700">
          <div className="text-nvidia-green text-xs uppercase tracking-wide font-semibold mb-2">
            Explanation
          </div>
          <p className="text-gray-300 text-sm leading-relaxed m-0">
            {currentQuestion.explanation}
          </p>
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors mt-auto"
        >
          {currentQuestionIndex < totalQuestions - 1
            ? "Next Question"
            : "See Results"}
        </button>
      </div>
    );
  };

  const renderResults = () => {
    const passed = score >= passingScore;
    const percentage = Math.round((score / totalQuestions) * 100);

    // Missed questions
    const missedResults = results.filter((r) => !r.isCorrect);
    const missedQuestions = missedResults
      .map((r) => questions.find((q) => q.id === r.questionId))
      .filter((q): q is XIDDrillQuestion => q !== undefined);

    // Severity breakdown of missed questions
    const severityBreakdown: Record<string, number> = {};
    missedResults.forEach((r) => {
      const q = questions.find((q) => q.id === r.questionId);
      if (q) {
        const xidInfo = getXIDInfo(q.xidCode);
        if (xidInfo) {
          const sev = xidInfo.severity;
          severityBreakdown[sev] = (severityBreakdown[sev] || 0) + 1;
        }
      }
    });

    return (
      <div className="flex flex-col h-full">
        {/* Result header */}
        <div
          className={`rounded-lg p-6 mb-6 text-center border ${
            passed
              ? "bg-green-900/30 border-green-500"
              : "bg-red-900/30 border-red-500"
          }`}
        >
          <h3
            className={`text-2xl font-bold m-0 mb-2 ${
              passed ? "text-green-400" : "text-red-400"
            }`}
          >
            {passed ? "Quiz Passed!" : "Keep Practicing"}
          </h3>
          <p className="text-gray-300 text-lg m-0">
            You scored{" "}
            <span className="font-bold text-white">
              {score}/{totalQuestions}
            </span>{" "}
            ({percentage}%)
          </p>
          <p className="text-gray-400 text-sm m-0 mt-2">
            {passed
              ? `You've demonstrated XID ${TIER_NAMES[tier].toLowerCase()} mastery!`
              : `You need ${passingScore}/${totalQuestions} (${Math.round(PASS_THRESHOLDS[tier] * 100)}%) to pass.`}
          </p>
        </div>

        {/* Severity breakdown of missed questions */}
        {Object.keys(severityBreakdown).length > 0 && (
          <div className="mb-6">
            <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
              Missed by Severity
            </div>
            <div className="flex gap-3">
              {Object.entries(severityBreakdown).map(([severity, count]) => {
                const colors = SEVERITY_COLORS[severity as XIDSeverity];
                return (
                  <div
                    key={severity}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <span className={`text-sm font-bold ${colors.text}`}>
                      {count}
                    </span>
                    <span className={`text-xs ${colors.text}`}>{severity}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Missed questions review */}
        {missedQuestions.length > 0 && (
          <div className="flex-1 overflow-auto mb-6">
            <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
              Review Missed Questions
            </div>
            <div className="space-y-4">
              {missedQuestions.map((question) => {
                const userResult = results.find(
                  (r) => r.questionId === question.id,
                );

                return (
                  <div
                    key={question.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <p className="text-gray-300 text-sm m-0 mb-3">
                      {question.questionText}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Your answer: </span>
                        <span className="text-red-400">
                          {question.choices[userResult?.selectedAnswer ?? 0]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Correct: </span>
                      <span className="text-green-400">
                        {question.choices[question.correctAnswer]}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs m-0 mt-2">
                      {question.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  if (allTierQuestions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full text-center">
          <p className="text-gray-400 mb-4">
            No XID drill questions available for this tier.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <div>
            <h2 className="m-0 text-nvidia-green text-xl font-semibold">
              {TIER_NAMES[tier]}
            </h2>
            <p className="m-0 mt-1 text-gray-500 text-sm">
              {TIER_DESCRIPTIONS[tier]}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="bg-transparent border-none text-gray-500 text-2xl cursor-pointer leading-none px-2 hover:text-gray-300 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-auto">
          {quizState === "question" && renderQuestion()}
          {quizState === "feedback" && renderFeedback()}
          {quizState === "results" && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default XIDDrillQuiz;
