import { useEffect, useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import {
  X,
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import type { ExamQuestion } from "@/types/scenarios";
import {
  loadExamQuestions,
  selectQuestionsForMode,
  createExamConfig,
  calculateExamScore,
  ExamTimer,
  isExamPassed,
  type ExamMode,
} from "@/utils/examEngine";

interface ExamWorkspaceProps {
  onClose: () => void;
  mode?: string;
}

// Helper function to get command recommendations based on domain
function getCommandRecommendations(domainName: string): string[] {
  const recommendations: Record<string, string[]> = {
    "Platform Bring-Up": [
      "ipmitool fru print 0",
      "ipmitool sensor list",
      "ipmitool sel list",
      "dmidecode -t bios",
      "lspci -vv",
      "nvidia-smi",
      "nvidia-smi -pm 1",
      "cat /proc/driver/nvidia/version",
    ],
    "Accelerator Configuration": [
      "nvidia-smi -i 0 -mig 1",
      "nvidia-smi mig -lgi",
      "nvidia-smi topo -m",
      "nvidia-smi nvlink --status",
      "dcgmi discovery -l",
    ],
    "Base Infrastructure": [
      "sinfo -Nel",
      "squeue",
      "scontrol show nodes",
      "scontrol update NodeName=node01 State=RESUME",
      "sbatch --gres=gpu:2 job.sh",
      "scancel <jobid>",
      "docker run --gpus all nvidia/cuda:12.4.0-base nvidia-smi",
    ],
    "Validation & Testing": [
      "dcgmi discovery -l",
      "dcgmi diag -r 1",
      "dcgmi diag -r 2",
      "dcgmi dmon",
      "dcgmi health -c",
      "dcgmi stats -v",
      "nccl-tests/build/all_reduce_perf -b 128M -e 128M -g 8",
    ],
    Troubleshooting: [
      "dmesg | grep -i xid",
      "nvidia-smi nvlink --status",
      "nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv",
      "nvidia-smi --query-gpu=ecc.mode.current,ecc.errors.corrected.volatile.total --format=csv",
      "journalctl -b | grep -i nvidia",
    ],
  };

  return recommendations[domainName] || [];
}

export function ExamWorkspace({
  onClose,
  mode = "full-practice",
}: ExamWorkspaceProps) {
  const { activeExam, startExam, submitExamAnswer, endExam, exitExam } =
    useSimulationStore();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const examConfig = createExamConfig(mode as ExamMode);
  const timeLimitSeconds = examConfig.timeLimitMinutes * 60;
  const [timeRemaining, setTimeRemaining] = useState(
    timeLimitSeconds || 90 * 60,
  );
  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [examTimer, setExamTimer] = useState<ExamTimer | null>(null);

  // Load questions on mount
  useEffect(() => {
    const init = async () => {
      const allQuestions = await loadExamQuestions();
      const selectedQuestions = selectQuestionsForMode(
        allQuestions,
        examConfig,
      );
      setQuestions(selectedQuestions);

      // Start exam in store
      startExam("ncp-aii-practice");

      // Start timer (0 = no limit, use a large value)
      const duration = timeLimitSeconds || 999 * 60;
      const timer = new ExamTimer(duration);
      timer.start(
        (remaining) => setTimeRemaining(remaining),
        () => handleTimeExpired(),
      );
      setExamTimer(timer);
    };

    init();

    return () => {
      examTimer?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run once on mount

  const handleTimeExpired = () => {
    // Auto-submit exam when time expires
    handleSubmitExam();
  };

  const handleAnswerChange = (answer: number | number[]) => {
    if (!activeExam) return;

    const currentQuestion = questions[currentQuestionIdx];
    submitExamAnswer(currentQuestion.id, answer);
  };

  const handleToggleFlag = () => {
    if (!activeExam) return;

    const currentQuestion = questions[currentQuestionIdx];
    const newFlagged = [...activeExam.flaggedQuestions];

    if (newFlagged.includes(currentQuestion.id)) {
      const idx = newFlagged.indexOf(currentQuestion.id);
      newFlagged.splice(idx, 1);
    } else {
      newFlagged.push(currentQuestion.id);
    }

    // Update store (we'd need to add this action)
    // For now, track locally
  };

  const handleSubmitExam = () => {
    if (!activeExam) return;

    examTimer?.stop();

    // Calculate score
    const breakdown = calculateExamScore(questions, activeExam.answers);

    // Update breakdown with actual time spent
    breakdown.timeSpent = examTimer?.getTimeElapsed() || 0;

    // End exam in store
    endExam();

    setShowResults(true);
  };

  const handleExit = () => {
    examTimer?.stop();
    exitExam();
    onClose();
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 text-white">
          <p>Loading exam questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const userAnswer = activeExam?.answers[currentQuestion.id];
  const isAnswered = activeExam?.answeredQuestions.includes(currentQuestion.id);
  const isFlagged = activeExam?.flaggedQuestions.includes(currentQuestion.id);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Show results screen
  if (showResults && activeExam?.breakdown) {
    const breakdown = activeExam.breakdown;
    const passed = isExamPassed(breakdown);

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl border border-green-500 overflow-hidden">
          {/* Header */}
          <div
            className={`px-6 py-4 ${passed ? "bg-green-600" : "bg-red-600"}`}
          >
            <h2 className="text-2xl font-bold text-white">Exam Results</h2>
          </div>

          {/* Results Content */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* Score */}
            <div className="text-center mb-8">
              <div
                className={`text-6xl font-bold mb-2 ${passed ? "text-green-400" : "text-red-400"}`}
              >
                {breakdown.percentage}%
              </div>
              <div className="text-xl text-gray-300 mb-2">
                {breakdown.earnedPoints} / {breakdown.totalPoints} points
              </div>
              <div
                className={`text-lg font-semibold ${passed ? "text-green-400" : "text-red-400"}`}
              >
                {passed ? "✓ PASSED" : "✗ DID NOT PASS"}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Passing Score: 70% • Time: {formatTime(breakdown.timeSpent)}
              </div>
            </div>

            {/* Domain Breakdown */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Performance by Domain
              </h3>
              <div className="space-y-4">
                {Object.values(breakdown.byDomain).map((domain) => {
                  const domainPassed = domain.percentage >= 70;
                  return (
                    <div
                      key={domain.domainName}
                      className="border-b border-gray-700 pb-4 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">
                          {domain.domainName}
                        </span>
                        <span
                          className={`font-bold ${domainPassed ? "text-green-400" : "text-red-400"}`}
                        >
                          {domain.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>
                          {domain.questionsCorrect} / {domain.questionsTotal}{" "}
                          correct
                        </span>
                        <span>Weight: {domain.weight}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${domainPassed ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${domain.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations */}
            {!passed && (
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-yellow-400 mb-2">
                  Areas for Improvement
                </h3>
                <p className="text-gray-300 mb-4">
                  Focus on these domains to improve your score:
                </p>
                <ul className="space-y-2">
                  {Object.values(breakdown.byDomain)
                    .filter((d) => d.percentage < 70)
                    .sort((a, b) => a.percentage - b.percentage)
                    .map((domain) => (
                      <li key={domain.domainName} className="text-gray-300">
                        • {domain.domainName} ({domain.percentage}%)
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Command Recommendations */}
            {Object.values(breakdown.byDomain).some(
              (d) => d.percentage < 70,
            ) && (
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-blue-400 mb-3">
                  Recommended Commands to Practice
                </h3>
                <p className="text-gray-300 mb-4">
                  Based on your performance, practice these commands in the
                  simulator:
                </p>
                <div className="space-y-4">
                  {Object.values(breakdown.byDomain)
                    .filter((d) => d.percentage < 70)
                    .map((domain) => {
                      const domainCommands = getCommandRecommendations(
                        domain.domainName,
                      );
                      return (
                        <div
                          key={domain.domainName}
                          className="border-l-4 border-blue-500 pl-4"
                        >
                          <h4 className="text-sm font-semibold text-blue-300 mb-2">
                            {domain.domainName}
                          </h4>
                          <div className="space-y-1">
                            {domainCommands.map((cmd, idx) => (
                              <div
                                key={idx}
                                className="font-mono text-sm text-gray-300 bg-black rounded px-3 py-1"
                              >
                                {cmd}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleExit}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowResults(false);
                  setShowReview(true);
                  setCurrentQuestionIdx(0);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                Review Answers
              </button>
              <button
                onClick={() => {
                  handleExit();
                  // Could restart exam here
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                Review Labs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review mode - show all questions with answers and explanations
  if (showReview && activeExam?.breakdown) {
    const currentQuestion = questions[currentQuestionIdx];
    const userAnswer = activeExam.answers[currentQuestion.id];
    const correctAnswer = currentQuestion.correctAnswer;
    const questionResult = activeExam.breakdown.questionResults.find(
      (r) => r.questionId === currentQuestion.id,
    );
    const isCorrect = questionResult?.correct || false;

    const isAnswerCorrect = (choiceIdx: number) => {
      if (Array.isArray(correctAnswer)) {
        return correctAnswer.includes(choiceIdx);
      }
      return correctAnswer === choiceIdx;
    };

    const isAnswerSelected = (choiceIdx: number) => {
      if (Array.isArray(userAnswer)) {
        return userAnswer.includes(choiceIdx);
      }
      return userAnswer === choiceIdx;
    };

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-green-500">
          {/* Header */}
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">Review Mode</h2>
              <p className="text-sm text-gray-400 mt-1">
                Question {currentQuestionIdx + 1} of {questions.length}
                {isCorrect ? (
                  <span className="text-green-400 ml-2">✓ Correct</span>
                ) : (
                  <span className="text-red-400 ml-2">✗ Incorrect</span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setShowReview(false);
                setShowResults(true);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
            >
              Back to Results
            </button>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 px-6 py-2 border-b border-gray-700">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Question Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Domain Badge */}
              <div className="inline-block bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full mb-4">
                {currentQuestion.domain.toUpperCase()}
              </div>

              {/* Question Text */}
              <h3 className="text-xl text-white mb-6 leading-relaxed">
                {currentQuestion.questionText}
              </h3>

              {/* Answer Choices with Feedback */}
              <div className="space-y-3 mb-6">
                {currentQuestion.choices?.map((choice, idx) => {
                  const isUserChoice = isAnswerSelected(idx);
                  const isCorrectChoice = isAnswerCorrect(idx);

                  let borderColor = "border-gray-700";
                  let bgColor = "bg-gray-800";

                  if (isCorrectChoice) {
                    borderColor = "border-green-500";
                    bgColor = "bg-green-900 bg-opacity-30";
                  } else if (isUserChoice && !isCorrectChoice) {
                    borderColor = "border-red-500";
                    bgColor = "bg-red-900 bg-opacity-30";
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${borderColor} ${bgColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isCorrectChoice ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : isUserChoice ? (
                            <X className="w-5 h-5 text-red-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-300">{choice}</span>
                          {isCorrectChoice && (
                            <span className="ml-2 text-sm text-green-400 font-semibold">
                              ✓ Correct Answer
                            </span>
                          )}
                          {isUserChoice && !isCorrectChoice && (
                            <span className="ml-2 text-sm text-red-400 font-semibold">
                              Your answer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-6">
                <h4 className="text-lg font-bold text-blue-400 mb-2">
                  Explanation
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>

            {/* Sidebar - Question Navigation */}
            <div className="w-80 border-l border-gray-700 bg-gray-850 p-6 overflow-y-auto">
              <h4 className="text-sm font-semibold text-gray-400 mb-4">
                QUESTION NAVIGATION
              </h4>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((q, idx) => {
                  const qResult = activeExam.breakdown?.questionResults.find(
                    (r) => r.questionId === q.id,
                  );
                  const correct = qResult?.correct || false;
                  const current = idx === currentQuestionIdx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-full aspect-square rounded flex items-center justify-center text-sm font-semibold transition-all ${
                        current
                          ? "bg-blue-500 text-white"
                          : correct
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white hover:bg-red-500"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 text-sm text-gray-400 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 rounded" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-600 rounded" />
                  <span>Incorrect</span>
                </div>
              </div>

              {/* Score Summary */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  SCORE SUMMARY
                </h4>
                <div className="text-3xl font-bold text-white mb-1">
                  {activeExam.breakdown.percentage}%
                </div>
                <div className="text-sm text-gray-400">
                  {activeExam.breakdown.earnedPoints} /{" "}
                  {activeExam.breakdown.totalPoints} points
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <button
              onClick={() =>
                setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))
              }
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="text-sm">
              {isCorrect ? (
                <span className="text-green-400 font-semibold">✓ Correct</span>
              ) : (
                <span className="text-red-400 font-semibold">✗ Incorrect</span>
              )}
            </div>

            <button
              onClick={() =>
                setCurrentQuestionIdx(
                  Math.min(questions.length - 1, currentQuestionIdx + 1),
                )
              }
              disabled={currentQuestionIdx === questions.length - 1}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main exam interface
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-green-500">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-green-400">
              NCP-AII Practice Exam
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Question {currentQuestionIdx + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded ${timeRemaining < 300 ? "bg-red-900 text-red-300" : "bg-gray-700 text-gray-300"}`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <button
              onClick={handleExit}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Exit Exam"
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
              style={{
                width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* Domain Badge */}
            <div className="inline-block bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full mb-4">
              {currentQuestion.domain.toUpperCase()}
            </div>

            {/* Question Text */}
            <h3 className="text-xl text-white mb-6 leading-relaxed">
              {currentQuestion.questionText}
            </h3>

            {/* Answer Choices */}
            <div className="space-y-3">
              {currentQuestion.choices?.map((choice, idx) => {
                const isSelected =
                  currentQuestion.type === "multiple-select"
                    ? Array.isArray(userAnswer) && userAnswer.includes(idx)
                    : userAnswer === idx;

                return (
                  <label
                    key={idx}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-900 bg-opacity-30"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type={
                          currentQuestion.type === "multiple-select"
                            ? "checkbox"
                            : "radio"
                        }
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => {
                          if (currentQuestion.type === "multiple-select") {
                            const current = (userAnswer as number[]) || [];
                            const newAnswer = current.includes(idx)
                              ? current.filter((i) => i !== idx)
                              : [...current, idx];
                            handleAnswerChange(newAnswer);
                          } else {
                            handleAnswerChange(idx);
                          }
                        }}
                        className="mt-1"
                      />
                      <span className="text-gray-300 flex-1">{choice}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {currentQuestion.type === "multiple-select" && (
              <p className="text-sm text-yellow-400 mt-4">
                Select all that apply
              </p>
            )}
          </div>

          {/* Sidebar - Question Navigation */}
          <div className="w-80 border-l border-gray-700 bg-gray-850 p-6 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-400 mb-4">
              QUESTION NAVIGATION
            </h4>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((q, idx) => {
                const answered = activeExam?.answeredQuestions.includes(q.id);
                const flagged = activeExam?.flaggedQuestions.includes(q.id);
                const current = idx === currentQuestionIdx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`relative w-full aspect-square rounded flex items-center justify-center text-sm font-semibold transition-all ${
                      current
                        ? "bg-green-500 text-black"
                        : answered
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {idx + 1}
                    {flagged && (
                      <Flag className="w-3 h-3 absolute top-0.5 right-0.5 text-yellow-400 fill-yellow-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 text-sm text-gray-400 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded" />
                <span>
                  Answered ({activeExam?.answeredQuestions.length || 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded" />
                <span>
                  Not Answered (
                  {questions.length -
                    (activeExam?.answeredQuestions.length || 0)}
                  )
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleFlag}
              className={`w-full px-4 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2 ${
                isFlagged
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Flag className="w-4 h-4" />
              {isFlagged ? "Unflag" : "Flag for Review"}
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={() =>
              setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))
            }
            disabled={currentQuestionIdx === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-gray-400">
            {isAnswered ? (
              <span className="text-green-400">✓ Answered</span>
            ) : (
              <span>Not answered</span>
            )}
          </div>

          {currentQuestionIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              Submit Exam
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
