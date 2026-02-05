import { Trophy, Zap, Server, Network, Cpu, AlertTriangle } from "lucide-react";

interface DomainProgress {
  completed: number;
  total: number;
}

interface RecommendedScenario {
  id: string;
  title: string;
  domain: number;
}

interface DomainNavigationProps {
  onDomainSelect: (domain: number) => void;
  onFinalAssessment: () => void;
  progress?: Record<number, DomainProgress>;
  recommendedScenario?: RecommendedScenario;
}

const domains = [
  {
    id: 1,
    title: "Domain 1: Systems & Server Bring-Up",
    shortTitle: "Systems & Bring-Up",
    weight: "31%",
    icon: Server,
    description: "Hardware initialization, BIOS, firmware",
  },
  {
    id: 2,
    title: "Domain 2: Physical Layer Management",
    shortTitle: "Physical Layer",
    weight: "5%",
    icon: Network,
    description: "Cabling, connectivity, physical inspection",
  },
  {
    id: 3,
    title: "Domain 3: Control Plane Installation",
    shortTitle: "Control Plane",
    weight: "19%",
    icon: Cpu,
    description: "Kubernetes, Slurm, container orchestration",
  },
  {
    id: 4,
    title: "Domain 4: Cluster Test & Verification",
    shortTitle: "Cluster Testing",
    weight: "33%",
    icon: Zap,
    description: "GPU validation, NVLink, performance testing",
  },
  {
    id: 5,
    title: "Domain 5: Troubleshooting & Optimization",
    shortTitle: "Troubleshooting",
    weight: "12%",
    icon: AlertTriangle,
    description: "Error diagnosis, performance tuning",
  },
];

export function DomainNavigation({
  onDomainSelect,
  onFinalAssessment,
  progress = {},
  recommendedScenario,
}: DomainNavigationProps) {
  // Calculate overall progress
  const totalCompleted = Object.values(progress).reduce(
    (sum, p) => sum + p.completed,
    0,
  );
  const totalScenarios = Object.values(progress).reduce(
    (sum, p) => sum + p.total,
    0,
  );
  const overallPercent =
    totalScenarios > 0
      ? Math.round((totalCompleted / totalScenarios) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-white font-semibold">
            {totalCompleted}/{totalScenarios} scenarios
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-nvidia-green h-2 rounded-full transition-all"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Recommended Scenario */}
      {recommendedScenario && (
        <div className="bg-nvidia-green/10 border border-nvidia-green/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-nvidia-green mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">Recommended</span>
          </div>
          <button
            onClick={() => onDomainSelect(recommendedScenario.domain)}
            className="text-white hover:text-nvidia-green transition-colors text-left"
          >
            {recommendedScenario.title}
          </button>
        </div>
      )}

      {/* Domain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {domains.map((domain) => {
          const domainProgress = progress[domain.id];
          const Icon = domain.icon;

          return (
            <button
              key={domain.id}
              onClick={() => onDomainSelect(domain.id)}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left hover:border-nvidia-green transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-nvidia-green" />
                  <span className="text-nvidia-green text-sm font-semibold">
                    {domain.weight}
                  </span>
                </div>
                {domainProgress && (
                  <span className="text-gray-400 text-sm">
                    {domainProgress.completed}/{domainProgress.total}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-nvidia-green transition-colors mb-2">
                Domain {domain.id}
              </h3>
              <p className="text-sm text-gray-400">{domain.shortTitle}</p>
              <p className="text-xs text-gray-500 mt-1">{domain.description}</p>
            </button>
          );
        })}

        {/* Final Assessment Card */}
        <div className="bg-gradient-to-br from-nvidia-green/20 to-gray-800 border border-nvidia-green/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-6 h-6 text-nvidia-green" />
            <h3 className="text-lg font-semibold text-white">
              Final Assessment
            </h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Timed exam simulation with random scenarios from all domains.
          </p>
          <button
            onClick={onFinalAssessment}
            className="w-full py-2 bg-nvidia-green text-white rounded-lg hover:bg-nvidia-green/80 transition-colors font-semibold"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
