import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Crosshair, ChevronRight } from "lucide-react";
import { getAllScenarios, getScenarioMetadata } from "../utils/scenarioLoader";
import { useSimulationStore } from "@/store/simulationStore";
import { useHardwareText } from "@/utils/hardwareTextSubstitution";
import { IncidentLauncher } from "./IncidentLauncher";

interface LabsAndScenariosViewProps {
  onStartScenario: (scenarioId: string) => void;
  onStartIncident?: (difficulty: string, domain?: number) => void;
}

interface ScenarioMeta {
  id: string;
  title: string;
  difficulty: string;
  estimatedTime: number;
  description: string;
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

function progressColor(ratio: number): string {
  if (ratio >= 0.7) return "bg-nvidia-green";
  if (ratio >= 0.3) return "bg-yellow-500";
  return "bg-red-500";
}

export function LabsAndScenariosView({
  onStartScenario,
  onStartIncident,
}: LabsAndScenariosViewProps) {
  const completedScenarios = useSimulationStore((s) => s.completedScenarios);
  const substituteText = useHardwareText();
  const [domainScenarios, setDomainScenarios] = useState<
    Record<string, ScenarioMeta[]>
  >({});
  const [loadingScenarios, setLoadingScenarios] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const scenariosByDomain = await getAllScenarios();
      const result: Record<string, ScenarioMeta[]> = {};

      for (const [domain, ids] of Object.entries(scenariosByDomain)) {
        const entries = await Promise.all(
          ids.map(async (id) => {
            const meta = await getScenarioMetadata(id);
            return meta
              ? { id, ...meta, description: meta.description ?? "" }
              : null;
          }),
        );
        result[domain] = entries
          .filter((s): s is ScenarioMeta => s !== null)
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

          <div data-tour="missions-grid" className="space-y-4">
            {Object.entries(DOMAIN_INFO).map(
              ([domainKey, info], domainIndex) => {
                const scenarios = domainScenarios[domainKey] || [];
                const total = scenarios.length;
                const completedCount = scenarios.filter((s) =>
                  completedScenarios.includes(s.id),
                ).length;
                const ratio = total > 0 ? completedCount / total : 0;
                return (
                  <div
                    key={domainKey}
                    data-testid={`domain-${info.number}-card`}
                    {...(domainIndex === 0
                      ? { "data-tour": "scenario-card-first" }
                      : {})}
                    className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-nvidia-green font-semibold">
                            Domain {info.number}
                          </span>
                          <h3 className="text-lg font-bold">{info.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
                            {info.weight === "0%"
                              ? "Foundational"
                              : `${info.weight} of exam`}
                          </span>
                        </div>
                        {total > 0 && (
                          <span
                            data-testid={`domain-${info.number}-completion`}
                            className={`text-xs font-medium ${completedCount === total && completedCount > 0 ? "text-nvidia-green" : "text-gray-400"}`}
                          >
                            {completedCount}/{total} completed
                          </span>
                        )}
                      </div>
                      {total > 0 && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full ${progressColor(ratio)} transition-all`}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Horizontal mission track */}
                    <div
                      role="region"
                      aria-label={`Domain ${info.number} missions`}
                      className="flex items-stretch gap-3 px-5 pb-5 overflow-x-auto"
                      style={{ scrollSnapType: "x proximity" }}
                    >
                      {scenarios.map((scenario, scenarioIndex) => {
                        const done = completedScenarios.includes(scenario.id);
                        return (
                          <div
                            key={scenario.id}
                            className="flex items-center gap-3 flex-shrink-0"
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <button
                              onClick={() => onStartScenario(scenario.id)}
                              className={`flex w-64 flex-shrink-0 self-stretch flex-col text-left p-3 rounded-lg bg-gray-900 hover:bg-gray-700 transition-colors group ${done ? "ring-1 ring-nvidia-green" : ""}`}
                            >
                              <span className="flex items-start gap-2 flex-1">
                                <Crosshair className="w-4 h-4 text-nvidia-green mt-0.5 flex-shrink-0" />
                                <span className="flex-1 min-w-0 flex flex-col self-stretch">
                                  <span className="flex items-start gap-1.5">
                                    <span className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2">
                                      {substituteText(scenario.title)}
                                    </span>
                                    {done && (
                                      <CheckCircle2
                                        data-testid={`completed-${scenario.id}`}
                                        className="w-4 h-4 text-nvidia-green flex-shrink-0 mt-0.5"
                                      />
                                    )}
                                  </span>
                                  {scenario.description && (
                                    <span className="block text-xs text-gray-400 mt-1">
                                      {substituteText(scenario.description)}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-2 mt-auto pt-2">
                                    <span
                                      {...(domainIndex === 0 &&
                                      scenarioIndex === 0
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
                                  </span>
                                </span>
                              </span>
                            </button>
                            {scenarioIndex < scenarios.length - 1 && (
                              <ChevronRight
                                aria-hidden="true"
                                className="w-5 h-5 text-gray-600 flex-shrink-0"
                              />
                            )}
                          </div>
                        );
                      })}
                      {scenarios.length === 0 && (
                        <p className="text-xs text-gray-500 py-2">
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

        {/* Live Incidents */}
        {onStartIncident && (
          <IncidentLauncher onStartIncident={onStartIncident} />
        )}
      </div>
    </div>
  );
}
