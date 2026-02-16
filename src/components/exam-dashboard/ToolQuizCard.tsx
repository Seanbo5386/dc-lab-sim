import { CheckCircle, HelpCircle, Wrench } from "lucide-react";
import type { FamilyQuizResult } from "@/store/learningProgressStore";

interface ToolQuizCardProps {
  familyId: string;
  familyName: string;
  familyIcon: string;
  tools: string[];
  description: string;
  quizResult?: FamilyQuizResult;
  onTakeQuiz: (familyId: string) => void;
}

export function ToolQuizCard({
  familyId,
  familyName,
  familyIcon,
  tools,
  description,
  quizResult,
  onTakeQuiz,
}: ToolQuizCardProps) {
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
            <p className="text-xs text-gray-400 m-0">Tool Selection Quiz</p>
          </div>
        </div>
        {quizResult?.passed && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
            PASSED
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 flex-1">{description}</p>

      {/* Meta pills */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1 bg-gray-700/50 rounded px-2 py-1">
          <Wrench className="w-3 h-3" />
          {tools.length} tools
        </span>
        <span className="flex items-center gap-1 bg-gray-700/50 rounded px-2 py-1">
          <HelpCircle className="w-3 h-3" />4 questions
        </span>
      </div>

      {/* Score / progress */}
      {quizResult ? (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <CheckCircle
            className={`w-3.5 h-3.5 ${quizResult.passed ? "text-green-400" : "text-gray-500"}`}
          />
          <span className="text-gray-300">Best: {quizResult.score}/4</span>
          <span className="text-gray-500">
            ({quizResult.attempts} attempt{quizResult.attempts !== 1 ? "s" : ""}
            )
          </span>
        </div>
      ) : (
        <div className="text-xs text-gray-500 mb-4">Not attempted yet</div>
      )}

      {/* Launch button */}
      <button
        onClick={() => onTakeQuiz(familyId)}
        className="w-full py-2 rounded-lg font-semibold text-white text-sm transition-colors bg-green-700 hover:bg-green-600"
      >
        {quizResult ? "Retake Quiz" : "Take Quiz"}
      </button>
    </div>
  );
}
