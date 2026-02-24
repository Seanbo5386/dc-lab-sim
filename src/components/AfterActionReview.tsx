/**
 * AfterActionReview - Post-incident debrief panel.
 *
 * Displays after an incident session completes:
 * - Diagnosis result banner (correct/incorrect)
 * - Total score with color-coded indicator
 * - 5 score dimension bars (methodology, efficiency, accuracy, noCollateral, completeness)
 * - Dual-column timeline comparing cluster events and user commands
 * - Actionable improvement tip callout
 * - Action buttons: Review Optimal Path, Try Similar, Exit
 */

import type { WorkflowScore, PhaseEntry } from "@/simulation/workflowTracker";
import type { ClusterEvent } from "@/simulation/eventLog";

interface AfterActionReviewProps {
  /** Composite workflow score with 5 sub-dimensions */
  score: WorkflowScore;
  /** Whether the user diagnosed correctly */
  correctDiagnosis: boolean;
  /** The root cause the user selected */
  selectedRootCause: string;
  /** The actual correct root cause */
  correctRootCause: string;
  /** Cluster events timeline */
  events: ClusterEvent[];
  /** User command history with phase classifications */
  commands: PhaseEntry[];
  /** Actionable improvement tip */
  tip: string;
  /** Called when user clicks Review Optimal Path */
  onReviewOptimalPath: () => void;
  /** Called when user clicks Try Similar */
  onRestart: () => void;
  /** Called when user clicks Exit */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Score dimension metadata
// ---------------------------------------------------------------------------

interface ScoreDimension {
  key: keyof Omit<WorkflowScore, "total">;
  label: string;
}

const SCORE_DIMENSIONS: ScoreDimension[] = [
  { key: "methodology", label: "Methodology" },
  { key: "efficiency", label: "Efficiency" },
  { key: "accuracy", label: "Accuracy" },
  { key: "noCollateral", label: "No Collateral" },
  { key: "completeness", label: "Completeness" },
];

const MAX_SUBSCORE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTotalScoreColor(total: number): string {
  if (total > 70) return "text-green-400";
  if (total >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getBarColor(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct > 70) return "bg-nvidia-green";
  if (pct >= 30) return "bg-yellow-500";
  return "bg-red-500";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    default:
      return "bg-blue-500";
  }
}

function formatTimestamp(ts: number): string {
  const seconds = (ts / 1000).toFixed(1);
  return `${seconds}s`;
}

// ---------------------------------------------------------------------------
// Timeline entry types
// ---------------------------------------------------------------------------

interface TimelineEntry {
  timestamp: number;
  kind: "event" | "command";
  event?: ClusterEvent;
  command?: PhaseEntry;
}

function buildTimeline(
  events: ClusterEvent[],
  commands: PhaseEntry[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...events.map(
      (e): TimelineEntry => ({
        timestamp: e.timestamp,
        kind: "event",
        event: e,
      }),
    ),
    ...commands.map(
      (c): TimelineEntry => ({
        timestamp: c.timestamp,
        kind: "command",
        command: c,
      }),
    ),
  ];
  entries.sort((a, b) => a.timestamp - b.timestamp);
  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AfterActionReview({
  score,
  correctDiagnosis,
  selectedRootCause,
  correctRootCause,
  events,
  commands,
  tip,
  onReviewOptimalPath,
  onRestart,
  onClose,
}: AfterActionReviewProps) {
  const timeline = buildTimeline(events, commands);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-gray-800 shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="border-b border-gray-700 p-4">
          <h2 className="text-lg font-bold text-nvidia-green">
            After-Action Review
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Diagnosis Result Banner */}
          <section
            className={`rounded-lg p-4 ${
              correctDiagnosis
                ? "border border-green-700 bg-green-900/30"
                : "border border-red-700 bg-red-900/30"
            }`}
          >
            <h3
              className={`text-lg font-bold ${
                correctDiagnosis ? "text-green-400" : "text-red-400"
              }`}
            >
              {correctDiagnosis ? "Correct Diagnosis" : "Incorrect Diagnosis"}
            </h3>
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-gray-300">
                <span className="text-gray-400">Your answer: </span>
                {selectedRootCause}
              </p>
              {!correctDiagnosis && (
                <p className="text-gray-300">
                  <span className="text-gray-400">Correct answer: </span>
                  {correctRootCause}
                </p>
              )}
            </div>
          </section>

          {/* Total Score */}
          <section className="rounded bg-gray-900 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Score
            </p>
            <p
              data-testid="total-score"
              className={`mt-1 text-4xl font-bold ${getTotalScoreColor(score.total)}`}
            >
              {score.total}
              <span className="text-lg font-normal text-gray-500">/100</span>
            </p>
          </section>

          {/* Score Breakdown */}
          <section className="rounded bg-gray-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Score Breakdown
            </h3>
            <div className="space-y-3">
              {SCORE_DIMENSIONS.map(({ key, label }) => {
                const value = score[key];
                const pct = (value / MAX_SUBSCORE) * 100;
                return (
                  <div key={key} data-testid={`score-bar-${key}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-300">{label}</span>
                      <span className="font-mono text-gray-400">
                        {value}/{MAX_SUBSCORE}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div
                        className={`h-2 rounded-full transition-all ${getBarColor(value, MAX_SUBSCORE)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Timeline Comparison */}
          <section className="rounded bg-gray-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Timeline
            </h3>
            <div className="space-y-2">
              {timeline.map((entry, idx) => {
                if (entry.kind === "event" && entry.event) {
                  const evt = entry.event;
                  return (
                    <div
                      key={`event-${evt.id}`}
                      className="flex items-start gap-2 rounded border border-gray-700 bg-gray-800 p-2 text-sm"
                    >
                      {/* Severity dot */}
                      <span
                        data-severity={evt.severity}
                        className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${getSeverityColor(evt.severity)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">
                            {formatTimestamp(evt.timestamp)}
                          </span>
                          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                            {evt.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {evt.nodeId}
                            {evt.gpuId !== undefined && `:gpu${evt.gpuId}`}
                          </span>
                        </div>
                        <p className="mt-0.5 text-gray-200">{evt.message}</p>
                      </div>
                    </div>
                  );
                }

                if (entry.kind === "command" && entry.command) {
                  const cmd = entry.command;
                  return (
                    <div
                      key={`cmd-${idx}`}
                      className="flex items-start gap-2 rounded border border-nvidia-green/30 bg-nvidia-green/5 p-2 text-sm"
                    >
                      {/* Command indicator */}
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-nvidia-green" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">
                            {formatTimestamp(cmd.timestamp)}
                          </span>
                          <span className="rounded bg-nvidia-green/20 px-1.5 py-0.5 text-xs text-nvidia-green">
                            {cmd.phase}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-gray-200">
                          {cmd.command}
                        </p>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </section>

          {/* Improvement Tip */}
          <section className="rounded-lg border border-nvidia-green bg-nvidia-green/10 p-4">
            <h3 className="mb-1 text-sm font-semibold text-nvidia-green">
              Improvement Tip
            </h3>
            <p className="text-sm leading-relaxed text-gray-200">{tip}</p>
          </section>
        </div>

        {/* Footer - Action Buttons */}
        <div className="space-y-2 border-t border-gray-700 p-4">
          <button
            onClick={onReviewOptimalPath}
            className="w-full rounded border border-nvidia-green px-4 py-2 text-sm font-semibold text-nvidia-green transition-colors hover:bg-nvidia-green/10"
          >
            Review Optimal Path
          </button>
          <button
            onClick={onRestart}
            className="w-full rounded bg-nvidia-green px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-green-500"
          >
            Try Similar
          </button>
          <button
            onClick={onClose}
            className="w-full rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-400"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
