import { ArrowLeft, BarChart3, TerminalSquare } from "lucide-react";

export interface MissionModeBarProps {
  title: string;
  currentStep: number; // 0-indexed
  totalSteps: number;
  tier?: 1 | 2 | 3;
  onAbort: () => void;
  onToggleDashboard: () => void;
  isDashboardActive?: boolean;
  hasDashboardUpdate?: boolean;
}

const tierConfig: Record<1 | 2 | 3, { label: string; className: string }> = {
  1: {
    label: "Guided",
    className: "bg-green-900/50 text-green-400 border-green-700",
  },
  2: {
    label: "Choice",
    className: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
  },
  3: {
    label: "Realistic",
    className: "bg-red-900/50 text-red-400 border-red-700",
  },
};

const defaultTier = {
  label: "Standard",
  className: "bg-gray-800/50 text-gray-400 border-gray-600",
};

export function MissionModeBar({
  title,
  currentStep,
  totalSteps,
  tier,
  onAbort,
  onToggleDashboard,
  isDashboardActive = false,
  hasDashboardUpdate = false,
}: MissionModeBarProps) {
  const displayStep = currentStep + 1;
  const { label, className: badgeClass } = tier
    ? tierConfig[tier]
    : defaultTier;

  return (
    <div className="bg-black border-b border-gray-800 px-4 py-2 flex items-center gap-4 shrink-0">
      {/* Abort button */}
      <button
        onClick={onAbort}
        aria-label="Abort mission"
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Abort</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-700" />

      {/* Tier badge */}
      <span
        className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${badgeClass}`}
      >
        {label}
      </span>

      {/* Title */}
      <span className="text-sm font-semibold text-white truncate flex-1 min-w-0">
        {title}
      </span>

      {/* Step progress */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">
          Step {displayStep} of {totalSteps}
        </span>
        <div className="flex items-center gap-1" data-testid="step-dots">
          {Array.from({ length: totalSteps }, (_, i) => {
            let dotClass: string;
            if (i < currentStep) {
              // Completed
              dotClass = "bg-nvidia-green";
            } else if (i === currentStep) {
              // Current
              dotClass = "ring-1 ring-nvidia-green bg-nvidia-green/40";
            } else {
              // Future
              dotClass = "bg-gray-600";
            }
            return (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-700" />

      {/* Cluster/Terminal toggle pill */}
      <button
        onClick={onToggleDashboard}
        aria-label="Toggle cluster dashboard"
        className={`relative flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition-all ${
          isDashboardActive
            ? "bg-nvidia-green/20 text-nvidia-green border-nvidia-green/50"
            : hasDashboardUpdate
              ? "bg-yellow-900/40 text-yellow-300 border-yellow-500/60 animate-pulse"
              : "bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-400 hover:text-white"
        }`}
      >
        {isDashboardActive ? (
          <TerminalSquare className="w-4 h-4" />
        ) : (
          <BarChart3 className="w-4 h-4" />
        )}
        <span>{isDashboardActive ? "Terminal" : "Cluster"}</span>
        {hasDashboardUpdate && !isDashboardActive && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-black" />
        )}
      </button>
    </div>
  );
}
