import { useState } from "react";
import { Zap, Lock, Trophy, ChevronRight } from "lucide-react";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import { useSimulationStore } from "@/store/simulationStore";
import { DifficultyScaler } from "@/simulation/difficultyScaler";

// ============================================================================
// Types
// ============================================================================

interface IncidentLauncherProps {
  onStartIncident: (difficulty: string, domain?: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-900/50 text-green-300 border-green-700",
  intermediate: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  advanced: "bg-red-900/50 text-red-300 border-red-700",
};

const DOMAIN_OPTIONS = [
  { value: "", label: "Any Domain" },
  { value: "1", label: "Domain 1 - Systems & Server Bring-Up" },
  { value: "2", label: "Domain 2 - Physical Layer Management" },
  { value: "3", label: "Domain 3 - Control Plane Installation" },
  { value: "4", label: "Domain 4 - Cluster Test & Verification" },
  { value: "5", label: "Domain 5 - Troubleshooting & Optimization" },
];

const MIN_COMPLETED_SCENARIOS = 3;
const MIN_PASSED_QUIZZES = 2;

// ============================================================================
// Component
// ============================================================================

export function IncidentLauncher({ onStartIncident }: IncidentLauncherProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  // Read from stores
  const incidentRating = useLearningProgressStore((s) => s.incidentRating);
  const incidentHistory = useLearningProgressStore((s) => s.incidentHistory);
  const familyQuizScores = useLearningProgressStore((s) => s.familyQuizScores);
  const completedScenarios = useSimulationStore((s) => s.completedScenarios);

  // Compute recommended difficulty from rating
  const scaler = new DifficultyScaler(incidentRating);
  const recommendedDifficulty = scaler.getRecommendedDifficulty();

  // Prerequisite gate
  const scenariosCompleted =
    completedScenarios.length >= MIN_COMPLETED_SCENARIOS;
  const passedQuizCount = Object.values(familyQuizScores).filter(
    (q) => q.passed,
  ).length;
  const quizzesPassed = passedQuizCount >= MIN_PASSED_QUIZZES;
  const prerequisitesMet = scenariosCompleted && quizzesPassed;

  // Sort history by date, most recent first
  const sortedHistory = [...incidentHistory].sort((a, b) => b.date - a.date);

  function handleStart() {
    if (!prerequisitesMet) return;
    const domain = selectedDomain ? parseInt(selectedDomain, 10) : undefined;
    onStartIncident(recommendedDifficulty, domain);
  }

  return (
    <div data-testid="incident-launcher" className="mt-12">
      {/* Visual separator */}
      <div className="border-t border-gray-700 mb-8" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Zap className="w-6 h-6 text-nvidia-green" />
        <h2 className="text-2xl font-bold text-nvidia-green">Live Incidents</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Unguided troubleshooting scenarios that adapt to your skill level.
        Diagnose and resolve realistic datacenter incidents without hints.
      </p>

      {/* Rating and controls card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Rating display */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Skill Rating
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white">
                  {incidentRating}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded border ${DIFFICULTY_COLORS[recommendedDifficulty] || "bg-gray-700 text-gray-300 border-gray-600"}`}
                >
                  {recommendedDifficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Domain filter and start button */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-gray-900 text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-nvidia-green"
            >
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleStart}
              disabled={!prerequisitesMet}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                prerequisitesMet
                  ? "bg-nvidia-green text-black hover:bg-nvidia-green/90"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {prerequisitesMet ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Start Incident
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prerequisite message when locked */}
        {!prerequisitesMet && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
              <Lock className="w-4 h-4" />
              Prerequisites Required
            </div>
            <ul className="text-sm text-gray-400 space-y-1 ml-6 list-disc">
              {!scenariosCompleted && (
                <li>
                  Complete at least {MIN_COMPLETED_SCENARIOS} missions (
                  {completedScenarios.length}/{MIN_COMPLETED_SCENARIOS})
                </li>
              )}
              {!quizzesPassed && (
                <li>
                  Pass at least {MIN_PASSED_QUIZZES} quizzes ({passedQuizCount}/
                  {MIN_PASSED_QUIZZES})
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Incident history */}
      {sortedHistory.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-nvidia-green" />
            Incident History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedHistory.map((entry, index) => (
              <div
                key={`${entry.templateId}-${entry.date}-${index}`}
                data-testid="incident-history-entry"
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">
                    {entry.templateId}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-semibold ${
                      entry.score >= 80
                        ? "text-green-400"
                        : entry.score >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {entry.score}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
