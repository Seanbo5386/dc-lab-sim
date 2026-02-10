/**
 * ExamGauntlet Component - Timed weighted practice exam
 *
 * Simulates the DCA certification experience with:
 * - 10 weighted scenarios distributed across domains
 * - Configurable time limit (30, 60, or 90 minutes)
 * - Random selection from unlocked scenarios
 * - Results breakdown with domain analysis
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  selectGauntletScenarios,
  EXAM_DOMAIN_WEIGHTS,
  type Scenario,
} from "../utils/tierProgressionEngine";
import {
  useLearningProgressStore,
  type GauntletAttempt,
} from "../store/learningProgressStore";
import {
  getAllScenarios,
  getScenarioMetadata,
  loadScenarioFromFile,
} from "../utils/scenarioLoader";
import {
  DOMAINS,
  type DomainId,
  type Scenario as FullScenario,
} from "../types/scenarios";

// ============================================================================
// TYPES
// ============================================================================

export interface ExamGauntletProps {
  onExit: () => void;
  /** Optional callback when a scenario is launched */
  onLaunchScenario?: (scenarioId: string) => void;
}

type GauntletState = "setup" | "active" | "results";

interface SelectedScenario {
  id: string;
  title: string;
  domain: DomainId;
  difficulty: string;
  estimatedTime: number;
  completed: boolean;
}

type TimeOption = 30 | 60 | 90;

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_OPTIONS: TimeOption[] = [30, 60, 90];
const SCENARIO_COUNT = 10;

const DOMAIN_NAMES: Record<DomainId, string> = {
  domain1: "Platform Bring-Up",
  domain2: "Accelerator Configuration",
  domain3: "Base Infrastructure",
  domain4: "Validation & Testing",
  domain5: "Troubleshooting",
};

const DOMAIN_COLORS: Record<DomainId, string> = {
  domain1: "bg-blue-600",
  domain2: "bg-green-600",
  domain3: "bg-purple-600",
  domain4: "bg-orange-600",
  domain5: "bg-red-600",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Build available scenarios from the scenario loader (synchronous version)
 * For testing and quick selection, we don't need to load full scenarios
 */
async function buildAvailableScenarios(): Promise<Scenario[]> {
  const allScenarioIds = await getAllScenarios();
  const scenarios: Scenario[] = [];

  for (const [domain, ids] of Object.entries(allScenarioIds)) {
    const metadataList = await Promise.all(
      ids.map(async (id) => ({
        id,
        metadata: await getScenarioMetadata(id),
      })),
    );
    metadataList.forEach(({ id, metadata }) => {
      if (metadata) {
        // Use default tier 2 for gauntlet selection (tier info is only needed for filtering)
        scenarios.push({
          id,
          domain: domain as DomainId,
          tier: 2, // Default to tier 2 for gauntlet
        });
      }
    });
  }

  return scenarios;
}

/**
 * Build selected scenarios with metadata
 */
async function buildSelectedScenariosWithMetadata(
  selectedIds: Scenario[],
): Promise<SelectedScenario[]> {
  const metadataList = await Promise.all(
    selectedIds.map(async (scenario) => ({
      scenario,
      metadata: await getScenarioMetadata(scenario.id),
    })),
  );
  return metadataList.map(({ scenario, metadata }) => ({
    id: scenario.id,
    title: metadata?.title ?? scenario.id,
    domain: scenario.domain,
    difficulty: metadata?.difficulty ?? "intermediate",
    estimatedTime: metadata?.estimatedTime ?? 30,
    completed: false,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ExamGauntlet: React.FC<ExamGauntletProps> = ({
  onExit,
  onLaunchScenario,
}) => {
  // State
  const [gauntletState, setGauntletState] = useState<GauntletState>("setup");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(60);
  const [timeRemaining, setTimeRemaining] = useState<number>(60 * 60);
  const [scenarios, setScenarios] = useState<SelectedScenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<FullScenario | null>(
    null,
  );

  // Store
  const recordGauntletAttempt = useLearningProgressStore(
    (state) => state.recordGauntletAttempt,
  );

  // Computed values
  const completedCount = useMemo(
    () => scenarios.filter((s) => s.completed).length,
    [scenarios],
  );

  const score = useMemo(() => {
    if (scenarios.length === 0) return 0;
    return Math.round((completedCount / scenarios.length) * 100);
  }, [completedCount, scenarios.length]);

  const domainBreakdown = useMemo(() => {
    const breakdown: Record<DomainId, { correct: number; total: number }> = {
      domain1: { correct: 0, total: 0 },
      domain2: { correct: 0, total: 0 },
      domain3: { correct: 0, total: 0 },
      domain4: { correct: 0, total: 0 },
      domain5: { correct: 0, total: 0 },
    };

    scenarios.forEach((scenario) => {
      breakdown[scenario.domain].total += 1;
      if (scenario.completed) {
        breakdown[scenario.domain].correct += 1;
      }
    });

    return breakdown;
  }, [scenarios]);

  // Timer effect
  useEffect(() => {
    if (gauntletState !== "active" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - end the exam
          setGauntletState("results");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gauntletState, timeRemaining]);

  // Handlers
  const handleStartExam = useCallback(async () => {
    setIsLoading(true);
    try {
      const availableScenarios = await buildAvailableScenarios();
      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        availableScenarios,
        SCENARIO_COUNT,
      );

      if (selected.length === 0) {
        alert(
          "No scenarios available for the exam. Please unlock more scenarios first.",
        );
        setIsLoading(false);
        return;
      }

      const scenariosWithMetadata =
        await buildSelectedScenariosWithMetadata(selected);
      setScenarios(scenariosWithMetadata);
      setTimeRemaining(selectedTime * 60);
      setStartTime(Date.now());
      setCurrentScenarioIndex(0);
      setGauntletState("active");
    } catch (error) {
      console.error("Failed to start exam:", error);
      alert("Failed to start exam. Please try again.");
    }
    setIsLoading(false);
  }, [selectedTime]);

  const handleLaunchScenario = useCallback(
    async (index: number) => {
      const scenario = scenarios[index];
      if (!scenario) return;

      setCurrentScenarioIndex(index);

      if (onLaunchScenario) {
        onLaunchScenario(scenario.id);
      } else {
        // Load and display scenario details
        const fullScenario = await loadScenarioFromFile(scenario.id);
        setActiveScenario(fullScenario);
      }
    },
    [scenarios, onLaunchScenario],
  );

  const handleMarkComplete = useCallback(
    (index: number) => {
      setScenarios((prev) =>
        prev.map((s, i) => (i === index ? { ...s, completed: true } : s)),
      );

      // Auto-advance to next incomplete scenario
      const nextIncompleteIndex = scenarios.findIndex(
        (s, i) => i > index && !s.completed,
      );
      if (nextIncompleteIndex !== -1) {
        setCurrentScenarioIndex(nextIncompleteIndex);
      }

      // Close active scenario view
      setActiveScenario(null);
    },
    [scenarios],
  );

  const handleFinishExam = useCallback(() => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    // Record the attempt
    const attempt: GauntletAttempt = {
      timestamp: Date.now(),
      score,
      totalQuestions: scenarios.length,
      timeSpentSeconds: timeTaken,
      domainBreakdown,
    };

    recordGauntletAttempt(attempt);
    setGauntletState("results");
  }, [
    startTime,
    score,
    scenarios.length,
    domainBreakdown,
    recordGauntletAttempt,
  ]);

  const handleCloseScenario = useCallback(() => {
    setActiveScenario(null);
  }, []);

  // Render setup screen
  if (gauntletState === "setup") {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-700">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white m-0">
                Exam Gauntlet
              </h2>
              <p className="text-gray-400 text-sm mt-1 m-0">
                Timed practice exam simulating the DCA certification
              </p>
            </div>
            <button
              onClick={onExit}
              className="text-gray-500 hover:text-gray-300 text-2xl leading-none px-2"
              aria-label="Close"
            >
              x
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Exam Info */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                About This Exam
              </h3>
              <ul className="text-gray-300 space-y-2 list-disc pl-5">
                <li>
                  <strong>{SCENARIO_COUNT} scenarios</strong> randomly selected
                  from your unlocked content
                </li>
                <li>
                  Scenarios are <strong>weighted by domain</strong> to match the
                  NCP-AII exam distribution
                </li>
                <li>Complete each scenario and mark it done to earn credit</li>
                <li>
                  Your final score is based on scenarios completed within the
                  time limit
                </li>
              </ul>
            </div>

            {/* Domain Weights */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                Domain Distribution
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {(
                  Object.entries(EXAM_DOMAIN_WEIGHTS) as [DomainId, number][]
                ).map(([domain, weight]) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-300">
                      {DOMAINS[domain].title}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${DOMAIN_COLORS[domain]}`}
                          style={{ width: `${weight}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-10">
                        {weight}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Select Time Limit
              </h3>
              <div className="flex gap-3">
                {TIME_OPTIONS.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                      selectedTime === time
                        ? "bg-blue-600 text-white border-2 border-blue-400"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                    }`}
                  >
                    {time} min
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartExam}
              disabled={isLoading}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                isLoading
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white"
              }`}
            >
              {isLoading ? "Loading Scenarios..." : "Start Exam"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render active exam
  if (gauntletState === "active") {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
          {/* Header with Timer */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white m-0">
                Exam Gauntlet
              </h2>
              <span className="text-gray-400">
                {completedCount} / {scenarios.length} completed
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`text-2xl font-mono font-bold ${
                  timeRemaining < 300 ? "text-red-500" : "text-green-500"
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
              <button
                onClick={handleFinishExam}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
              >
                Finish Exam
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-700">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4">
            {activeScenario ? (
              // Scenario Detail View
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {activeScenario.title}
                    </h3>
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold text-white ${DOMAIN_COLORS[activeScenario.domain]}`}
                      >
                        {DOMAIN_NAMES[activeScenario.domain]}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          activeScenario.difficulty === "beginner"
                            ? "bg-green-600 text-white"
                            : activeScenario.difficulty === "intermediate"
                              ? "bg-yellow-600 text-white"
                              : "bg-red-600 text-white"
                        }`}
                      >
                        {activeScenario.difficulty}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseScenario}
                    className="text-gray-500 hover:text-gray-300 text-xl"
                  >
                    x
                  </button>
                </div>

                <p className="text-gray-300 mb-4">
                  {activeScenario.description}
                </p>

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                    Learning Objectives
                  </h4>
                  <ul className="text-gray-300 space-y-1 list-disc pl-5">
                    {activeScenario.learningObjectives.map((objective, i) => (
                      <li key={i}>{objective}</li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                    Steps ({activeScenario.steps.length})
                  </h4>
                  <div className="space-y-2">
                    {activeScenario.steps.map((step, i) => (
                      <div
                        key={step.id}
                        className="bg-gray-700 rounded p-3 border border-gray-600"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            {i + 1}
                          </span>
                          <span className="text-white font-medium">
                            {step.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleMarkComplete(currentScenarioIndex)}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={handleCloseScenario}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Back to List
                  </button>
                </div>
              </div>
            ) : (
              // Scenario List View
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scenario, index) => (
                  <div
                    key={scenario.id}
                    className={`bg-gray-800 rounded-lg p-4 border transition-all cursor-pointer ${
                      scenario.completed
                        ? "border-green-600 bg-green-900/20"
                        : index === currentScenarioIndex
                          ? "border-blue-500"
                          : "border-gray-700 hover:border-gray-600"
                    }`}
                    onClick={() => handleLaunchScenario(index)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-semibold">
                        {index + 1}. {scenario.title}
                      </span>
                      {scenario.completed && (
                        <span className="text-green-500 font-bold">Done</span>
                      )}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${DOMAIN_COLORS[scenario.domain]}`}
                      >
                        {DOMAIN_NAMES[scenario.domain]}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                        {scenario.estimatedTime} min
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {!scenario.completed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunchScenario(index);
                          }}
                          className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        >
                          Launch
                        </button>
                      )}
                      {!scenario.completed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkComplete(index);
                          }}
                          className="text-sm px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render results screen
  if (gauntletState === "results") {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const passed = score >= 70;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700">
          {/* Header */}
          <div
            className={`p-6 text-center ${passed ? "bg-green-900/50" : "bg-red-900/50"}`}
          >
            <h2
              className={`text-3xl font-bold mb-2 ${passed ? "text-green-400" : "text-red-400"}`}
            >
              {passed ? "Exam Passed!" : "Exam Complete"}
            </h2>
            <p className="text-gray-300">
              {passed
                ? "Congratulations! You demonstrated strong knowledge."
                : "Keep practicing to improve your score."}
            </p>
          </div>

          {/* Score Display */}
          <div className="p-6 border-b border-gray-700">
            <div className="text-center mb-6">
              <div
                className={`text-6xl font-bold mb-2 ${passed ? "text-green-500" : "text-red-500"}`}
              >
                {score}%
              </div>
              <div className="text-gray-400">
                {completedCount} of {scenarios.length} scenarios completed
              </div>
              <div className="text-gray-500 text-sm mt-1">
                Time: {formatTime(timeTaken)} | Passing: 70%
              </div>
            </div>

            {/* Domain Breakdown */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Domain Breakdown
              </h3>
              <div className="space-y-3">
                {(
                  Object.entries(domainBreakdown) as [
                    DomainId,
                    { correct: number; total: number },
                  ][]
                )
                  .filter(([, data]) => data.total > 0)
                  .map(([domain, data]) => {
                    const percentage =
                      data.total > 0
                        ? Math.round((data.correct / data.total) * 100)
                        : 0;
                    return (
                      <div key={domain}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 text-sm">
                            {DOMAIN_NAMES[domain]}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {data.correct}/{data.total} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${DOMAIN_COLORS[domain]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Scenario Results */}
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Scenario Results
            </h3>
            <div className="space-y-2 max-h-48 overflow-auto">
              {scenarios.map((scenario, index) => (
                <div
                  key={scenario.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    scenario.completed ? "bg-green-900/30" : "bg-gray-800"
                  }`}
                >
                  <span className="text-gray-300">
                    {index + 1}. {scenario.title}
                  </span>
                  <span
                    className={`font-semibold ${
                      scenario.completed ? "text-green-500" : "text-gray-500"
                    }`}
                  >
                    {scenario.completed ? "Completed" : "Incomplete"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 flex gap-4">
            <button
              onClick={() => {
                setGauntletState("setup");
                setScenarios([]);
                setActiveScenario(null);
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ExamGauntlet;
