/**
 * WhichToolQuiz Component - Pre-scenario quiz for tool selection knowledge
 *
 * Tests "which tool for this scenario?" knowledge. Users must pass 8/10 (80%)
 * to unlock tiered scenarios for a command family.
 */

import React, { useState, useMemo, useCallback } from "react";
import quizQuestionsData from "../data/quizQuestions.json";
import type {
  QuizQuestion,
  QuizQuestionsData,
  WhyNotOther,
} from "../types/quizQuestions";

interface WhichToolQuizProps {
  /** Command family ID to filter questions */
  familyId: string;
  /** Callback when quiz is complete */
  onComplete: (passed: boolean, score: number) => void;
  /** Callback to close the quiz */
  onClose: () => void;
}

interface AnswerResult {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

type QuizState = "question" | "feedback" | "results";

const TOTAL_QUESTIONS = 10;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const WhichToolQuiz: React.FC<WhichToolQuizProps> = ({
  familyId,
  onComplete,
  onClose,
}) => {
  // All questions for this family (unshuffled pool)
  const allFamilyQuestions = useMemo(() => {
    const data = quizQuestionsData as QuizQuestionsData;
    return data.questions.filter((q) => q.familyId === familyId);
  }, [familyId]);

  // Shuffled subset for this quiz session
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    shuffleArray(allFamilyQuestions).slice(0, TOTAL_QUESTIONS),
  );

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  // Current question
  const currentQuestion = questions[currentQuestionIndex];

  // Calculate score
  const score = useMemo(() => {
    return results.filter((r) => r.isCorrect).length;
  }, [results]);

  // Dynamic passing threshold (80% of actual question count)
  const passingScore = Math.ceil(questions.length * 0.8);

  // Handle answer selection
  const handleAnswerSelect = useCallback(
    (answer: string) => {
      if (quizState === "question") {
        setSelectedAnswer(answer);
      }
    },
    [quizState],
  );

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const result: AnswerResult = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
    };

    setResults((prev) => [...prev, result]);
    setQuizState("feedback");
  }, [selectedAnswer, currentQuestion]);

  // Handle moving to next question
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizState("question");
    } else {
      setQuizState("results");
    }
  }, [currentQuestionIndex, questions.length]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setQuestions(shuffleArray(allFamilyQuestions).slice(0, TOTAL_QUESTIONS));
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setResults([]);
    setQuizState("question");
  }, [allFamilyQuestions]);

  // Handle close with completion callback
  const handleClose = useCallback(() => {
    if (quizState === "results") {
      onComplete(score >= passingScore, score);
    }
    onClose();
  }, [quizState, score, passingScore, onComplete, onClose]);

  // Get why not other explanation for a tool
  const getWhyNotOther = (tool: string): WhyNotOther | undefined => {
    return currentQuestion?.whyNotOthers.find((w) => w.tool === tool);
  };

  // Render question view
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-nvidia-green font-bold text-sm">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-gray-500 text-sm">
              {score} correct so far
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-nvidia-green transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Scenario */}
        <div className="bg-gray-800/50 rounded-lg p-5 mb-6 border border-gray-700">
          <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
            Scenario
          </div>
          <p className="text-gray-200 text-base leading-relaxed m-0">
            {currentQuestion.scenario}
          </p>
        </div>

        {/* Question prompt */}
        <p className="text-white text-lg font-semibold mb-4">
          Which tool is best for this situation?
        </p>

        {/* Answer choices */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {currentQuestion.choices.map((choice) => (
            <button
              key={choice}
              onClick={() => handleAnswerSelect(choice)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedAnswer === choice
                  ? "border-nvidia-green bg-nvidia-green/10 text-white"
                  : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
              }`}
            >
              <code className="font-mono text-sm font-semibold">{choice}</code>
            </button>
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className={`w-full py-3 rounded-lg font-bold transition-colors ${
            selectedAnswer
              ? "bg-nvidia-green hover:bg-nvidia-darkgreen text-black cursor-pointer"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Submit Answer
        </button>
      </div>
    );
  };

  // Render feedback view
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
          <div className="flex items-center gap-3 mb-3">
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
              <code className="text-nvidia-green font-mono font-semibold">
                {currentQuestion.correctAnswer}
              </code>
            </p>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-gray-800/50 rounded-lg p-5 mb-6 border border-gray-700">
          <div className="text-nvidia-green text-xs uppercase tracking-wide font-semibold mb-2">
            Why {currentQuestion.correctAnswer}?
          </div>
          <p className="text-gray-300 text-sm leading-relaxed m-0">
            {currentQuestion.explanation}
          </p>
        </div>

        {/* Why not others */}
        <div className="flex-1 overflow-auto mb-6">
          <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
            Why not the others?
          </div>
          <div className="space-y-2">
            {currentQuestion.choices
              .filter((choice) => choice !== currentQuestion.correctAnswer)
              .map((choice) => {
                const whyNot = getWhyNotOther(choice);
                return (
                  <div
                    key={choice}
                    className="bg-gray-800/30 rounded-lg p-3 border border-gray-700"
                  >
                    <code className="text-gray-400 font-mono text-sm font-semibold">
                      {choice}
                    </code>
                    <p className="text-gray-500 text-sm m-0 mt-1">
                      {whyNot?.reason ||
                        "Not the best choice for this scenario."}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors"
        >
          {currentQuestionIndex < questions.length - 1
            ? "Next Question"
            : "See Results"}
        </button>
      </div>
    );
  };

  // Render results view
  const renderResults = () => {
    const passed = score >= passingScore;
    const percentage = Math.round((score / questions.length) * 100);

    // Get missed questions
    const missedQuestions = results
      .filter((r) => !r.isCorrect)
      .map((r) => questions.find((q) => q.id === r.questionId))
      .filter((q): q is QuizQuestion => q !== undefined);

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
            {passed ? "Quiz Passed!" : "Keep Practicing"}
          </h3>
          <p className="text-gray-300 text-lg m-0">
            You scored{" "}
            <span className="font-bold text-white">
              {score}/{questions.length}
            </span>{" "}
            ({percentage}%)
          </p>
          {passed ? (
            <p className="text-green-400 text-sm m-0 mt-2">
              You can now access the tiered scenarios for this tool family!
            </p>
          ) : (
            <p className="text-gray-400 text-sm m-0 mt-2">
              You need {passingScore}/{questions.length} (80%) to unlock
              scenarios.
            </p>
          )}
        </div>

        {/* Missed questions review */}
        {missedQuestions.length > 0 && (
          <div className="flex-1 overflow-auto mb-6">
            <div className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
              Review Missed Questions
            </div>
            <div className="space-y-4">
              {missedQuestions.map((question) => {
                const userAnswer = results.find(
                  (r) => r.questionId === question.id,
                )?.selectedAnswer;

                return (
                  <div
                    key={question.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <p className="text-gray-300 text-sm m-0 mb-3">
                      {question.scenario}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Your answer: </span>
                        <code className="text-red-400 font-mono">
                          {userAnswer}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-500">Correct: </span>
                        <code className="text-green-400 font-mono">
                          {question.correctAnswer}
                        </code>
                      </div>
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
        <div className="flex gap-3">
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
            {passed ? "Continue to Scenarios" : "Close"}
          </button>
        </div>
      </div>
    );
  };

  // Handle empty questions case
  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full text-center">
          <p className="text-gray-400 mb-4">
            No quiz questions available for this tool family.
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
              Tool Selection Quiz
            </h2>
            <p className="m-0 mt-1 text-gray-500 text-sm">
              Choose the best tool for each scenario
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

export default WhichToolQuiz;
