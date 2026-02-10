import { useEffect, useMemo, useState } from "react";
import { FaultInjection } from "./FaultInjection";
import {
  Trophy,
  GraduationCap,
  TrendingUp,
  Clock,
  Crosshair,
  FlaskConical,
  Lock,
} from "lucide-react";
import { useSimulationStore } from "../store/simulationStore";
import { getAllScenarios, getScenarioMetadata } from "../utils/scenarioLoader";

interface LabsAndScenariosViewProps {
  onStartScenario: (scenarioId: string) => void;
  onBeginExam: () => void;
  onOpenLearningPaths: () => void;
  onOpenStudyDashboard: () => void;
  onOpenExamGauntlet: () => void;
  onOpenFreeMode: () => void;
  learningProgress: { completed: number; total: number };
}

const DOMAIN_INFO: Record<
  string,
  { name: string; weight: string; number: number }
> = {
  domain1: { name: "Systems & Server Bring-Up", weight: "31%", number: 1 },
  domain2: { name: "Physical Layer Management", weight: "5%", number: 2 },
  domain3: { name: "Control Plane Installation", weight: "19%", number: 3 },
  domain4: { name: "Cluster Test & Verification", weight: "33%", number: 4 },
  domain5: { name: "Troubleshooting & Optimization", weight: "12%", number: 5 },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-900/50 text-green-300 border-green-700",
  intermediate: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  advanced: "bg-red-900/50 text-red-300 border-red-700",
};

const DIFFICULTY_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export function LabsAndScenariosView({
  onStartScenario,
  onBeginExam,
  onOpenLearningPaths,
  onOpenStudyDashboard,
  onOpenExamGauntlet,
  onOpenFreeMode,
  learningProgress,
}: LabsAndScenariosViewProps) {
  const scenarioProgress = useSimulationStore((s) => s.scenarioProgress);
  const completedCount = useMemo(
    () => Object.values(scenarioProgress).filter((p) => p.completed).length,
    [scenarioProgress],
  );
  const freeModeUnlocked = completedCount >= 3;

  const [domainScenarios, setDomainScenarios] = useState<
    Record<
      string,
      { id: string; title: string; difficulty: string; estimatedTime: number }[]
    >
  >({});

  useEffect(() => {
    let isActive = true;

    const loadScenarios = async () => {
      const scenariosByDomain = await getAllScenarios();
      const result: Record<
        string,
        {
          id: string;
          title: string;
          difficulty: string;
          estimatedTime: number;
        }[]
      > = {};

      for (const [domain, ids] of Object.entries(scenariosByDomain)) {
        const entries = await Promise.all(
          ids.map(async (id) => {
            const meta = await getScenarioMetadata(id);
            return meta ? { id, ...meta } : null;
          }),
        );
        result[domain] = entries
          .filter(
            (
              s,
            ): s is {
              id: string;
              title: string;
              difficulty: string;
              estimatedTime: number;
            } => s !== null,
          )
          .sort(
            (a, b) =>
              (DIFFICULTY_ORDER[a.difficulty] ?? 99) -
              (DIFFICULTY_ORDER[b.difficulty] ?? 99),
          );
      }

      if (isActive) {
        setDomainScenarios(result);
      }
    };

    loadScenarios();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div data-testid="labs-list" className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Fault Injection System */}
        <FaultInjection />

        {/* Narrative Missions */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-nvidia-green mb-2">
            Missions
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Immersive narrative scenarios covering all NCP-AII exam domains.
            Each mission puts you in a realistic datacenter situation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(DOMAIN_INFO).map(([domainKey, info]) => {
              const scenarios = domainScenarios[domainKey] || [];
              return (
                <div
                  key={domainKey}
                  data-testid={`domain-${info.number}-card`}
                  className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                >
                  <div className="px-6 pt-5 pb-3">
                    <div className="text-sm text-nvidia-green font-semibold mb-1">
                      Domain {info.number} &bull; {info.weight}
                    </div>
                    <h3 className="text-lg font-bold mb-3">{info.name}</h3>
                  </div>

                  <div className="px-4 pb-4 space-y-2">
                    {scenarios.map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => onStartScenario(scenario.id)}
                        className="w-full text-left p-3 rounded-lg bg-gray-900 hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <Crosshair className="w-4 h-4 text-nvidia-green mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                              {scenario.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[scenario.difficulty] || "bg-gray-700 text-gray-300 border-gray-600"}`}
                              >
                                {scenario.difficulty}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {scenario.estimatedTime}m
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {scenarios.length === 0 && (
                      <p className="text-xs text-gray-500 px-3 py-2">
                        No scenarios available
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Practice Exam */}
            <div
              data-testid="practice-exam-card"
              className="bg-gradient-to-br from-nvidia-green to-nvidia-darkgreen rounded-lg p-6 border border-nvidia-green"
            >
              <div className="text-sm text-black font-semibold mb-2">
                Full Exam Simulation
              </div>
              <h3 className="text-lg font-bold text-black mb-3">
                NCP-AII Practice Exam
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                Take a timed mock exam with questions covering all five domains.
                Get instant feedback and detailed explanations.
              </p>
              <button
                onClick={onBeginExam}
                className="w-full bg-black text-nvidia-green py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
              >
                Begin Practice Exam
              </button>
            </div>

            {/* Exam Gauntlet */}
            <div
              data-testid="exam-gauntlet-card"
              className="bg-gray-800 rounded-lg p-6 border border-orange-600"
            >
              <div className="text-sm text-orange-400 font-semibold mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Timed Challenge
              </div>
              <h3 className="text-lg font-bold mb-3">Exam Gauntlet</h3>
              <p className="text-sm text-gray-300 mb-4">
                Tackle 10 weighted scenarios in a timed exam format. Simulates
                the real DCA certification experience with domain-based scoring.
              </p>
              <button
                onClick={onOpenExamGauntlet}
                className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Start Gauntlet
              </button>
            </div>

            {/* Learning Paths */}
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-600">
              <div className="text-sm text-purple-400 font-semibold mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Guided Learning
              </div>
              <h3 className="text-lg font-bold mb-3">Learning Paths</h3>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-purple-400">
                    {learningProgress.completed}/{learningProgress.total}{" "}
                    lessons
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{
                      width: `${learningProgress.total > 0 ? (learningProgress.completed / learningProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={onOpenLearningPaths}
                className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                {learningProgress.completed > 0
                  ? "Continue Learning"
                  : "Start Learning"}
              </button>
            </div>

            {/* Study Progress Dashboard */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Track Your Progress
              </div>
              <h3 className="text-lg font-bold mb-3">Study Dashboard</h3>
              <p className="text-sm text-gray-300 mb-4">
                View exam history, track domain performance, and identify weak
                areas to focus your study.
              </p>
              <button
                onClick={onOpenStudyDashboard}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View Progress
              </button>
            </div>

            {/* Free Mode */}
            <div
              data-testid="free-mode-card"
              className={`bg-gray-800 rounded-lg p-6 border ${freeModeUnlocked ? "border-teal-600" : "border-gray-700 opacity-75"}`}
            >
              <div className="text-sm text-teal-400 font-semibold mb-2 flex items-center gap-2">
                {freeModeUnlocked ? (
                  <FlaskConical className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Sandbox
              </div>
              <h3 className="text-lg font-bold mb-3">Free Mode</h3>
              <p className="text-sm text-gray-300 mb-4">
                {freeModeUnlocked
                  ? "Open sandbox with manual fault injection. Explore commands and scenarios without guided steps."
                  : `Complete ${3 - completedCount} more mission${3 - completedCount !== 1 ? "s" : ""} to unlock Free Mode.`}
              </p>
              <button
                onClick={onOpenFreeMode}
                disabled={!freeModeUnlocked}
                className={`mt-4 w-full py-2 rounded-lg font-medium transition-colors ${
                  freeModeUnlocked
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {freeModeUnlocked ? "Enter Free Mode" : "Locked"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
