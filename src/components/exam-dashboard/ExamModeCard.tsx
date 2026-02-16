import { Clock, HelpCircle } from "lucide-react";
import type { ExamModeEntry } from "@/data/examModeRegistry";

interface ExamModeCardProps {
  mode: ExamModeEntry;
  onLaunch: () => void;
  lastScore?: number;
  lastDate?: string;
}

export function ExamModeCard({
  mode,
  onLaunch,
  lastScore,
  lastDate,
}: ExamModeCardProps) {
  const Icon = mode.icon;

  return (
    <div
      data-testid={`exam-mode-card-${mode.id}`}
      className="bg-gray-800 rounded-lg border border-gray-700 p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-base font-bold text-white m-0">{mode.title}</h3>
            <p className="text-xs text-gray-400 m-0">{mode.subtitle}</p>
          </div>
        </div>
        {mode.badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
            {mode.badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 flex-1">{mode.description}</p>

      {/* Meta pills */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1 bg-gray-700/50 rounded px-2 py-1">
          <Clock className="w-3 h-3" />
          {mode.duration}
        </span>
        <span className="flex items-center gap-1 bg-gray-700/50 rounded px-2 py-1">
          <HelpCircle className="w-3 h-3" />
          {mode.questionCount}
        </span>
      </div>

      {/* Last score */}
      {lastScore !== undefined && (
        <div className="text-xs text-gray-400 mb-3">
          Last: {lastScore}%{lastDate && ` on ${lastDate}`}
        </div>
      )}

      {/* Launch button */}
      <button
        onClick={onLaunch}
        className="w-full py-2 rounded-lg font-semibold text-white text-sm transition-colors bg-green-700 hover:bg-green-600"
      >
        Start {mode.title}
      </button>
    </div>
  );
}
