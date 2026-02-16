import { CheckCircle, HelpCircle, Zap } from "lucide-react";
import type {
  FamilyQuizResult,
  MasteryQuizResult,
} from "@/store/learningProgressStore";

interface ToolQuizCardProps {
  familyId: string;
  familyName: string;
  familyIcon: string;
  tools: string[];
  description: string;
  quizResult?: FamilyQuizResult;
  masteryResult?: MasteryQuizResult;
  onTakeQuiz: (familyId: string) => void;
  onTakeMasteryQuiz: (familyId: string) => void;
}

export function ToolQuizCard({
  familyId,
  familyName,
  familyIcon,
  tools,
  description,
  quizResult,
  masteryResult,
  onTakeQuiz,
  onTakeMasteryQuiz,
}: ToolQuizCardProps) {
  const bothPassed = !!(quizResult?.passed && masteryResult?.passed);

  return (
    <div
      data-testid={`tool-quiz-card-${familyId}`}
      className="bg-gray-800 rounded-lg border border-gray-700 p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{familyIcon}</span>
          <div>
            <h3 className="text-base font-bold text-white m-0">{familyName}</h3>
            <p className="text-xs text-gray-400 m-0">{tools.length} tools</p>
          </div>
        </div>
        {bothPassed && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
            PASSED
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 flex-1">{description}</p>

      {/* Quiz rows */}
      <div className="space-y-3">
        {/* Tool Selection Quiz row */}
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-300">
                Tool Selection
              </span>
              <span className="text-[10px] text-gray-500">10 questions</span>
            </div>
            {quizResult?.passed && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            {quizResult ? (
              <span className="text-xs text-gray-400">
                Best: {quizResult.score}/10 ({quizResult.attempts} attempt
                {quizResult.attempts !== 1 ? "s" : ""})
              </span>
            ) : (
              <span className="text-xs text-gray-500">Not attempted</span>
            )}
            <button
              onClick={() => onTakeQuiz(familyId)}
              className="px-3 py-1 rounded text-xs font-semibold transition-colors bg-green-700 hover:bg-green-600 text-white"
            >
              {quizResult ? "Retake" : "Take Quiz"}
            </button>
          </div>
        </div>

        {/* Deep Mastery Quiz row */}
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-300">
                Deep Mastery
              </span>
              <span className="text-[10px] text-gray-500">25 questions</span>
            </div>
            {masteryResult?.passed && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            {masteryResult ? (
              <span className="text-xs text-gray-400">
                Best: {masteryResult.bestScore}/{masteryResult.totalQuestions} (
                {masteryResult.attempts} attempt
                {masteryResult.attempts !== 1 ? "s" : ""})
              </span>
            ) : (
              <span className="text-xs text-gray-500">Not attempted</span>
            )}
            <button
              onClick={() => onTakeMasteryQuiz(familyId)}
              className="px-3 py-1 rounded text-xs font-semibold transition-colors bg-green-700 hover:bg-green-600 text-white"
            >
              {masteryResult ? "Retake" : "Take Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
