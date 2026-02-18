import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Crosshair } from "lucide-react";
import { getAllScenarios, getScenarioMetadata } from "../utils/scenarioLoader";
import { useSimulationStore } from "@/store/simulationStore";

interface LabsAndScenariosViewProps {
  onStartScenario: (scenarioId: string) => void;
}

const DOMAIN_INFO: Record<
  string,
  { name: string; weight: string; number: number }
> = {
  domain0: { name: "Foundational Skills", weight: "0%", number: 0 },
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
}: LabsAndScenariosViewProps) {
  const completedScenarios = useSimulationStore((s) => s.completedScenarios);
  const [domainScenarios, setDomainScenarios] = useState<
    Record<
      string,
      { id: string; title: string; difficulty: string; estimatedTime: number }[]
    >
  >({});
  const [loadingScenarios, setLoadingScenarios] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

      if (!cancelled) {
        setDomainScenarios(result);
        setLoadingScenarios(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div data-testid="labs-list" className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Narrative Missions */}
        <div>
          {loadingScenarios && (
            <div className="text-gray-400 text-sm mb-4">
              Loading scenarios...
            </div>
          )}
          <h2 className="text-2xl font-bold text-nvidia-green mb-2">
            Missions
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Immersive narrative scenarios covering all NCP-AII exam domains.
            Each mission puts you in a realistic datacenter situation.
          </p>

          <div
            data-tour="missions-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Object.entries(DOMAIN_INFO).map(
              ([domainKey, info], domainIndex) => {
                const scenarios = domainScenarios[domainKey] || [];
                const completedCount = scenarios.filter((s) =>
                  completedScenarios.includes(s.id),
                ).length;
                return (
                  <div
                    key={domainKey}
                    data-testid={`domain-${info.number}-card`}
                    {...(domainIndex === 0
                      ? { "data-tour": "scenario-card-first" }
                      : {})}
                    className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                  >
                    <div className="px-6 pt-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-nvidia-green font-semibold mb-1">
                          Domain {info.number} &bull; {info.weight}
                        </div>
                        {scenarios.length > 0 && (
                          <span
                            data-testid={`domain-${info.number}-completion`}
                            className={`text-xs font-medium ${completedCount === scenarios.length && completedCount > 0 ? "text-nvidia-green" : "text-gray-400"}`}
                          >
                            {completedCount}/{scenarios.length} completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mb-3">{info.name}</h3>
                    </div>

                    <div className="px-4 pb-4 space-y-2">
                      {scenarios.map((scenario, scenarioIndex) => (
                        <button
                          key={scenario.id}
                          onClick={() => onStartScenario(scenario.id)}
                          className="w-full text-left p-3 rounded-lg bg-gray-900 hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <Crosshair className="w-4 h-4 text-nvidia-green mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                                  {scenario.title}
                                </span>
                                {completedScenarios.includes(scenario.id) && (
                                  <CheckCircle2
                                    data-testid={`completed-${scenario.id}`}
                                    className="w-4 h-4 text-nvidia-green flex-shrink-0"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  {...(domainIndex === 0 && scenarioIndex === 0
                                    ? { "data-tour": "difficulty-badges" }
                                    : {})}
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
              },
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
