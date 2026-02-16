import React, { useState, useMemo, useCallback } from "react";
import {
  TOOL_MASTERY_QUESTIONS,
  type ToolMasteryQuestion,
  type MasteryCategory,
} from "../data/toolMasteryQuestions";

interface ToolMasteryQuizProps {
  familyId: string;
  onComplete: (passed: boolean, score: number, totalQuestions: number) => void;
  onClose: () => void;
}

interface AnswerResult {
  questionId: string;
  tool: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

type QuizState = "question" | "feedback" | "results";

const QUESTIONS_PER_SESSION = 10;
const PASSING_THRESHOLD = 0.75;

const CATEGORY_LABELS: Record<MasteryCategory, string> = {
  "flags-options": "FLAGS & OPTIONS",
  "output-interpretation": "OUTPUT INTERPRETATION",
  troubleshooting: "TROUBLESHOOTING",
  "command-syntax": "COMMAND SYNTAX",
  conceptual: "CONCEPTUAL",
  "best-practice": "BEST PRACTICE",
};

const CATEGORY_COLORS: Record<MasteryCategory, string> = {
  "flags-options": "bg-blue-900/50 text-blue-300 border-blue-700",
  "output-interpretation": "bg-purple-900/50 text-purple-300 border-purple-700",
  troubleshooting: "bg-red-900/50 text-red-300 border-red-700",
  "command-syntax": "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  conceptual: "bg-amber-900/50 text-amber-300 border-amber-700",
  "best-practice": "bg-green-900/50 text-green-300 border-green-700",
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const ToolMasteryQuiz: React.FC<ToolMasteryQuizProps> = ({
  familyId,
  onComplete,
  onClose,
}) => {
  const allFamilyQuestions = useMemo(() => {
    return TOOL_MASTERY_QUESTIONS.filter((q) => q.familyId === familyId);
  }, [familyId]);

  const [questions, setQuestions] = useState<ToolMasteryQuestion[]>(() =>
    shuffleArray(allFamilyQuestions).slice(0, QUESTIONS_PER_SESSION),
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const passingScore = Math.ceil(totalQuestions * PASSING_THRESHOLD);

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
      tool: currentQuestion.tool,
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
      shuffleArray(allFamilyQuestions).slice(0, QUESTIONS_PER_SESSION),
    );
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setResults([]);
    setQuizState("question");
  }, [allFamilyQuestions]);

  const handleClose = useCallback(() => {
    if (quizState === "results") {
      onComplete(score >= passingScore, score, totalQuestions);
    }
    onClose();
  }, [quizState, score, passingScore, totalQuestions, onComplete, onClose]);

  // Per-tool breakdown for results
  const toolBreakdown = useMemo(() => {
    const breakdown: Record<string, { correct: number; total: number }> = {};
    results.forEach((r) => {
      if (!breakdown[r.tool]) {
        breakdown[r.tool] = { correct: 0, total: 0 };
      }
      breakdown[r.tool].total++;
      if (r.isCorrect) breakdown[r.tool].correct++;
    });
    return breakdown;
  }, [results]);

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

        {/* Category badge + tool name */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CATEGORY_COLORS[currentQuestion.category]}`}
          >
            {CATEGORY_LABELS[currentQuestion.category]}
          </span>
          <span className="text-xs text-gray-500">
            <code className="font-mono">{currentQuestion.tool}</code>
          </span>
        </div>

        {/* Question text */}
        <p className="text-white text-base font-semibold mb-4">
          {currentQuestion.questionText}
        </p>

        {/* Code snippet */}
        {currentQuestion.codeSnippet && (
          <div className="bg-gray-950 rounded-lg p-4 mb-4 border border-gray-700 overflow-auto max-h-48">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre m-0 leading-relaxed">
              <code>{currentQuestion.codeSnippet}</code>
            </pre>
          </div>
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

        {/* Explanation */}
        <div className="bg-gray-800/50 rounded-lg p-5 mb-4 border border-gray-700">
          <div className="text-nvidia-green text-xs uppercase tracking-wide font-semibold mb-2">
            Explanation
          </div>
          <p className="text-gray-300 text-sm leading-relaxed m-0">
            {currentQuestion.explanation}
          </p>
        </div>

        {/* Exam relevance */}
        {currentQuestion.examRelevance && (
          <div className="bg-gray-800/30 rounded-lg px-4 py-3 mb-6 border border-gray-700">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Exam Relevance
            </span>
            <p className="text-gray-400 text-xs m-0 mt-1">
              {currentQuestion.examRelevance}
            </p>
          </div>
        )}

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
          <div className="text-5xl mb-3">{passed ? "🎉" : "📚"}</div>
          <h3
            className={`text-2xl font-bold m-0 mb-2 ${
              passed ? "text-green-400" : "text-red-400"
            }`}
          >
            {passed ? "Mastery Quiz Passed!" : "Keep Studying"}
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
              ? "You've demonstrated deep tool mastery for this family!"
              : `You need ${passingScore}/${totalQuestions} (75%) to pass.`}
          </p>
        </div>

        {/* Per-tool breakdown */}
        <div className="mb-6">
          <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
            Per-Tool Breakdown
          </div>
          <div className="space-y-2">
            {Object.entries(toolBreakdown).map(([tool, { correct, total }]) => (
              <div
                key={tool}
                className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700"
              >
                <code className="text-sm font-mono text-gray-300">{tool}</code>
                <span
                  className={`text-sm font-bold ${
                    correct === total
                      ? "text-green-400"
                      : correct >= total / 2
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {correct}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-auto">
          {!passed && (
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={handleClose}
            className={`${
              passed ? "w-full" : "flex-1"
            } py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  if (allFamilyQuestions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full text-center">
          <p className="text-gray-400 mb-4">
            No mastery questions available for this tool family.
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
              Deep Mastery Quiz
            </h2>
            <p className="m-0 mt-1 text-gray-500 text-sm">
              Flags, output interpretation, and troubleshooting
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

export default ToolMasteryQuiz;
