/**
 * StudyModes Component - Study mode selection and management
 *
 * Provides UI for selecting and using different study modes:
 * - Domain Deep-Dive
 * - Timed Practice
 * - Review Mistakes
 * - Flashcard Review
 * - Random Challenge
 */

import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
  BookOpen,
  Layers,
  Shuffle,
  CheckCircle,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { useLearningStore } from "@/store/learningStore";
import {
  StudyMode,
  STUDY_MODE_CONFIGS,
  createStudySession,
  getFlashcardsForSession,
  calculateSessionResult,
  getRecommendedStudyMode,
  formatStudyDuration,
  getAllStudyModes,
  Flashcard,
  StudySession,
} from "@/utils/studyModeEngine";
import { loadExamQuestions } from "@/utils/examEngine";
import { DOMAINS, type DomainId, type ExamQuestion } from "@/types/scenarios";

interface StudyModesProps {
  onClose: () => void;
  onStartLab?: (domain: DomainId) => void;
}

// Icon mapping for study modes
const MODE_ICONS: Record<StudyMode, React.ReactNode> = {
  "domain-deep-dive": <Target className="w-6 h-6" />,
  "timed-practice": <Clock className="w-6 h-6" />,
  "review-mode": <BookOpen className="w-6 h-6" />,
  "flashcard-mode": <Layers className="w-6 h-6" />,
  "random-challenge": <Shuffle className="w-6 h-6" />,
};

export function StudyModes({
  onClose,
  onStartLab: _onStartLab,
}: StudyModesProps) {
  const [view, setView] = useState<
    "select" | "domain-select" | "session" | "flashcards" | "results"
  >("select");
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
  const [, setSelectedDomain] = useState<DomainId | null>(null);
  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [commandsUsed] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const {
    startSession: storeStartSession,
    endSession: storeEndSession,
    examAttempts,
    sessionHistory,
    getWeakDomains,
    getReadinessScore,
    totalStudyTimeSeconds,
    currentStreak,
  } = useLearningStore();

  // Load questions on mount
  useEffect(() => {
    loadExamQuestions().then(setAllQuestions);
  }, []);

  // Timer effect
  useEffect(() => {
    if (!session?.timeLimitSeconds || isPaused || !timeRemaining) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPaused, timeRemaining]); // handleSessionComplete is stable

  const handleSelectMode = (mode: StudyMode) => {
    setSelectedMode(mode);
    const config = STUDY_MODE_CONFIGS[mode];

    if (config.requiresDomain) {
      setView("domain-select");
    } else if (mode === "flashcard-mode") {
      startFlashcardSession();
    } else if (mode === "review-mode") {
      startReviewSession();
    } else {
      startSession(mode);
    }
  };

  const startSession = (mode: StudyMode, domain?: DomainId) => {
    try {
      getWeakDomains(); // Called for side effects
      const incorrectIds =
        examAttempts.length > 0
          ? examAttempts[examAttempts.length - 1].questionResults
              .filter((r) => !r.correct)
              .map((r) => r.questionId)
          : [];

      const newSession = createStudySession(mode, allQuestions, {
        domain,
        incorrectQuestionIds: incorrectIds,
      });

      setSession(newSession);
      setTimeRemaining(newSession.timeLimitSeconds || null);
      storeStartSession(mode, domain);
      setView("session");
    } catch (error) {
      logger.error("Failed to start session:", error);
      // Could show error message to user
    }
  };

  const startFlashcardSession = (domain?: DomainId) => {
    const cards = getFlashcardsForSession(domain, 20);
    setFlashcards(cards);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    storeStartSession("flashcard-mode", domain);
    setView("flashcards");
  };

  const startReviewSession = () => {
    if (examAttempts.length === 0) {
      alert("No exam history to review. Take an exam first!");
      return;
    }
    startSession("review-mode");
  };

  const handleSessionComplete = () => {
    if (!session) return;

    const result = calculateSessionResult(session, commandsUsed);
    storeEndSession(
      session.questionsAnswered,
      session.questionsCorrect,
      session.commandsExecuted,
      result.accuracy,
    );

    setView("results");
  };

  const handleAnswerQuestion = (correct: boolean) => {
    if (!session) return;

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1,
        questionsCorrect: prev.questionsCorrect + (correct ? 1 : 0),
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        isComplete: prev.currentQuestionIndex + 1 >= prev.questionsTotal,
      };
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get recommendations
  const recommendations = getRecommendedStudyMode(
    examAttempts,
    sessionHistory.map((s) => s.mode as StudyMode),
  );

  // Mode Selection View
  if (view === "select") {
    const readinessScore = getReadinessScore();
    const weakDomains = getWeakDomains();

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl border border-green-500 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">Study Modes</h2>
              <p className="text-sm text-gray-400 mt-1">
                Choose how you want to study today
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {readinessScore}%
                </div>
                <div className="text-xs text-gray-400">Readiness</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatStudyDuration(totalStudyTimeSeconds)}
                </div>
                <div className="text-xs text-gray-400">Study Time</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {currentStreak}
                </div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {sessionHistory.length}
                </div>
                <div className="text-xs text-gray-400">Sessions</div>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">
                  Recommended for You
                </h3>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectMode(rec.mode)}
                      className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <span className="text-green-400">
                        {MODE_ICONS[rec.mode]}
                      </span>
                      <div className="flex-1">
                        <div className="text-white font-semibold">
                          {STUDY_MODE_CONFIGS[rec.mode].name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {rec.reason}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Study Modes */}
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              ALL STUDY MODES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAllStudyModes().map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-green-500 rounded-lg p-4 text-left transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-green-400 mt-1">
                      {MODE_ICONS[mode.id]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {mode.name}
                        </span>
                        <span className="text-xl">{mode.icon}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {mode.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {mode.hasTimeLimit && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {mode.timeLimitMinutes}min
                          </span>
                        )}
                        {mode.questionCount && mode.questionCount > 0 && (
                          <span>{mode.questionCount} questions</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Weak Areas */}
            {weakDomains.length > 0 && (
              <div className="mt-6 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                  Areas Needing Focus
                </h3>
                <div className="flex flex-wrap gap-2">
                  {weakDomains.map((domain) => (
                    <span
                      key={domain}
                      className="px-3 py-1 bg-yellow-900 bg-opacity-50 text-yellow-300 rounded-full text-sm"
                    >
                      {
                        DOMAINS[domain].title
                          .replace("Domain ", "")
                          .split(":")[1]
                      }
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Domain Selection View
  if (view === "domain-select") {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl border border-green-500 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">
                Select Domain
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Choose a domain to focus on
              </p>
            </div>
            <button
              onClick={() => setView("select")}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {(Object.keys(DOMAINS) as DomainId[]).map((domainId) => {
              const domain = DOMAINS[domainId];
              const isWeak = getWeakDomains().includes(domainId);

              return (
                <button
                  key={domainId}
                  onClick={() => {
                    setSelectedDomain(domainId);
                    if (selectedMode === "flashcard-mode") {
                      startFlashcardSession(domainId);
                    } else {
                      startSession(selectedMode!, domainId);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:border-green-500 ${
                    isWeak
                      ? "border-yellow-600 bg-yellow-900 bg-opacity-20"
                      : "border-gray-700 bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">
                        {domain.title}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {domain.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {domain.weight}%
                      </div>
                      <div className="text-xs text-gray-500">Exam Weight</div>
                      {isWeak && (
                        <div className="text-xs text-yellow-400 mt-1">
                          Needs Focus
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Flashcard View
  if (view === "flashcards" && flashcards.length > 0) {
    const currentCard = flashcards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / flashcards.length) * 100;

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl border border-green-500 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">
                Flashcard Review
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Card {currentCardIndex + 1} of {flashcards.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 px-6 py-2 border-b border-gray-700">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="p-6">
            <div
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className={`min-h-[300px] p-8 rounded-xl cursor-pointer transition-all duration-300 transform ${
                isCardFlipped
                  ? "bg-green-900 bg-opacity-30 border-2 border-green-500"
                  : "bg-gray-800 border-2 border-gray-700 hover:border-green-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded-full">
                  {currentCard.domain.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                  {currentCard.category}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    currentCard.difficulty === "easy"
                      ? "bg-green-900 text-green-300"
                      : currentCard.difficulty === "medium"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-red-900 text-red-300"
                  }`}
                >
                  {currentCard.difficulty}
                </span>
              </div>

              <div className="text-center">
                {isCardFlipped ? (
                  <div className="text-gray-200 whitespace-pre-wrap text-lg leading-relaxed">
                    {currentCard.back}
                  </div>
                ) : (
                  <div className="text-white text-xl leading-relaxed">
                    {currentCard.front}
                  </div>
                )}
              </div>

              <div className="text-center mt-6 text-sm text-gray-500">
                {isCardFlipped
                  ? "Click to see question"
                  : "Click to reveal answer"}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                setIsCardFlipped(false);
              }}
              disabled={currentCardIndex === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Flip
            </button>

            {currentCardIndex < flashcards.length - 1 ? (
              <button
                onClick={() => {
                  setCurrentCardIndex(currentCardIndex + 1);
                  setIsCardFlipped(false);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  storeEndSession(flashcards.length, 0, 0);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
              >
                Complete
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Session View (Questions)
  if (view === "session" && session) {
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const progress =
      ((session.currentQuestionIndex + 1) / session.questionsTotal) * 100;

    if (
      session.isComplete ||
      session.currentQuestionIndex >= session.questions.length
    ) {
      // Show completion
      return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg border border-green-500 overflow-hidden">
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Session Complete!
              </h2>
              <div className="text-4xl font-bold text-green-400 mb-2">
                {session.questionsTotal > 0
                  ? Math.round(
                      (session.questionsCorrect / session.questionsAnswered) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-gray-400 mb-6">
                {session.questionsCorrect} / {session.questionsAnswered} correct
              </p>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setView("select");
                    setSession(null);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
                >
                  Study More
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-green-500">
          {/* Header */}
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">
                {STUDY_MODE_CONFIGS[session.mode].name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Question {session.currentQuestionIndex + 1} of{" "}
                {session.questionsTotal}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded ${
                    timeRemaining < 60
                      ? "bg-red-900 text-red-300"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="ml-2 hover:text-white transition-colors"
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 px-6 py-2 border-b border-gray-700">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 overflow-y-auto p-8">
            {currentQuestion && (
              <>
                <div className="inline-block bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full mb-4">
                  {currentQuestion.domain.toUpperCase()}
                </div>

                <h3 className="text-xl text-white mb-6 leading-relaxed">
                  {currentQuestion.questionText}
                </h3>

                <div className="space-y-3">
                  {currentQuestion.choices?.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const isCorrect = Array.isArray(
                          currentQuestion.correctAnswer,
                        )
                          ? currentQuestion.correctAnswer.includes(idx)
                          : currentQuestion.correctAnswer === idx;
                        handleAnswerQuestion(isCorrect);
                      }}
                      className="w-full text-left p-4 rounded-lg border-2 border-gray-700 bg-gray-800 hover:border-green-500 hover:bg-gray-700 transition-all"
                    >
                      <span className="text-gray-300">{choice}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Score: {session.questionsCorrect} / {session.questionsAnswered}
            </div>
            <button
              onClick={handleSessionComplete}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
