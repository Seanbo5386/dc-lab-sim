import { GraduationCap, Trophy } from "lucide-react";
import { useLearningStore } from "@/store/learningStore";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return "<1m";
  return `${mins}m`;
}

interface HistoryEntry {
  type: "exam" | "gauntlet";
  label: string;
  score: number;
  passed: boolean;
  duration: number;
  sortKey: number;
}

interface RecentExamHistoryProps {
  maxItems?: number;
}

export function RecentExamHistory({ maxItems = 5 }: RecentExamHistoryProps) {
  const examAttempts = useLearningStore((s) => s.examAttempts);
  const gauntletAttempts = useLearningStore((s) => s.gauntletAttempts);

  // Build unified history list
  const entries: HistoryEntry[] = [];

  // Exams: stored newest-last in array, use index as sort key
  examAttempts.forEach((attempt, idx) => {
    entries.push({
      type: "exam",
      label: `Practice Exam #${idx + 1}`,
      score: attempt.percentage,
      passed: attempt.percentage >= 70,
      duration: attempt.timeSpent,
      sortKey: idx, // higher index = more recent
    });
  });

  // Gauntlets: have timestamps
  gauntletAttempts.forEach((attempt, idx) => {
    const score =
      attempt.totalQuestions > 0
        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
        : 0;
    entries.push({
      type: "gauntlet",
      label: `Gauntlet #${idx + 1}`,
      score,
      passed: score >= 70,
      duration: attempt.timeSpentSeconds,
      sortKey: attempt.timestamp,
    });
  });

  // Sort by sortKey descending (most recent first) and take top N
  const sorted = entries
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, maxItems);

  return (
    <div
      data-testid="recent-exam-history"
      className="bg-gray-800 rounded-lg border border-gray-700 p-5"
    >
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">
        Recent Activity
      </h3>

      {sorted.length === 0 ? (
        <p data-testid="empty-history" className="text-sm text-gray-400">
          No exam attempts yet. Take your first exam above!
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, idx) => (
            <div
              key={`${entry.type}-${idx}`}
              className="flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2"
            >
              {/* Type icon */}
              {entry.type === "exam" ? (
                <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
              )}

              {/* Label */}
              <span className="text-sm text-gray-300 flex-1 truncate">
                {entry.label}
              </span>

              {/* Score */}
              <span className="text-sm font-semibold text-gray-200">
                {entry.score}%
              </span>

              {/* Pass/fail badge */}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  entry.passed
                    ? "bg-green-900/40 text-green-400"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {entry.passed ? "PASS" : "FAIL"}
              </span>

              {/* Duration */}
              <span className="text-xs text-gray-500 w-10 text-right">
                {formatDuration(entry.duration)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
