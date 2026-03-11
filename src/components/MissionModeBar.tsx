import { ArrowLeft, BarChart3, TerminalSquare } from "lucide-react";

export interface MissionModeBarProps {
  title: string;
  currentStep: number; // 0-indexed
  totalSteps: number;
  tier?: 1 | 2 | 3;
  onAbort: () => void;
  onToggleDashboard: () => void;
  isDashboardActive?: boolean;
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

      {/* Cluster dashboard toggle */}
      <button
        onClick={onToggleDashboard}
        aria-label="Toggle cluster dashboard"
        className={`flex items-center gap-1.5 transition-colors text-sm ${
          isDashboardActive
            ? "text-nvidia-green"
            : "text-gray-400 hover:text-white"
        }`}
      >
        {isDashboardActive ? (
          <TerminalSquare className="w-4 h-4" />
        ) : (
          <BarChart3 className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isDashboardActive ? "Terminal" : "Cluster"}
        </span>
      </button>
    </div>
  );
}
