import {
  GraduationCap,
  BarChart3,
  CheckCircle,
  Flame,
  Clock,
} from "lucide-react";
import { useLearningStore } from "@/store/learningStore";

function formatStudyTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getReadinessColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getReadinessMessage(score: number): string {
  if (score >= 80) return "You're well prepared for the exam!";
  if (score >= 70) return "Almost there - keep practicing!";
  if (score >= 50) return "Good progress, focus on weak areas.";
  if (score > 0) return "Keep studying to build your skills.";
  return "Start practicing to build your readiness.";
}

export function ExamReadinessHero() {
  const readinessScore = useLearningStore((s) => s.getReadinessScore());
  const examAttempts = useLearningStore((s) => s.examAttempts);
  const gauntletAttempts = useLearningStore((s) => s.gauntletAttempts);
  const currentStreak = useLearningStore((s) => s.currentStreak);
  const totalStudyTimeSeconds = useLearningStore(
    (s) => s.totalStudyTimeSeconds,
  );

  const totalExams = examAttempts.length + gauntletAttempts.length;

  const avgScore =
    examAttempts.length > 0
      ? Math.round(
          examAttempts.reduce((sum, a) => sum + a.percentage, 0) /
            examAttempts.length,
        )
      : 0;

  const passRate =
    examAttempts.length > 0
      ? Math.round(
          (examAttempts.filter((a) => a.percentage >= 70).length /
            examAttempts.length) *
            100,
        )
      : 0;

  return (
    <div
      data-testid="exam-readiness-hero"
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Left: Readiness Score */}
        <div className="flex items-center gap-4 md:border-r md:border-gray-700 md:pr-6">
          <div className="text-center">
            <div
              data-testid="readiness-score"
              className={`text-5xl font-bold ${getReadinessColor(readinessScore)}`}
            >
              {readinessScore}
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-semibold">
              Readiness
            </div>
          </div>
          <div className="max-w-48">
            <p className="text-sm text-gray-300 m-0">
              {getReadinessMessage(readinessScore)}
            </p>
          </div>
        </div>

        {/* Right: Stat Chips */}
        <div className="flex flex-wrap gap-3 flex-1">
          <StatChip
            icon={<GraduationCap className="w-4 h-4" />}
            label="Exams Taken"
            value={String(totalExams)}
          />
          <StatChip
            icon={<BarChart3 className="w-4 h-4" />}
            label="Avg Score"
            value={examAttempts.length > 0 ? `${avgScore}%` : "--"}
          />
          <StatChip
            icon={<CheckCircle className="w-4 h-4" />}
            label="Pass Rate"
            value={examAttempts.length > 0 ? `${passRate}%` : "--"}
          />
          <StatChip
            icon={<Flame className="w-4 h-4" />}
            label="Streak"
            value={`${currentStreak}d`}
          />
          <StatChip
            icon={<Clock className="w-4 h-4" />}
            label="Study Time"
            value={formatStudyTime(totalStudyTimeSeconds)}
          />
        </div>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
