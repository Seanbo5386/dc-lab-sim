/**
 * IncidentWorkspace - Sidebar panel for active incident diagnosis sessions.
 *
 * Replaces the narrative step list during active incidents. Displays:
 * - Situation briefing
 * - Live elapsed timer
 * - Workflow progress checklist (5 diagnostic phases)
 * - Diagnosis submission with root cause selection
 * - Hint system with score penalty
 * - Abandon incident button
 */

import { useState, useEffect, useRef } from "react";
import type { PhaseEntry, DiagnosticPhase } from "@/simulation/workflowTracker";

interface IncidentWorkspaceProps {
  /** The incident situation briefing text */
  situation: string;
  /** Current phase history from WorkflowTracker */
  phaseHistory: PhaseEntry[];
  /** Possible root cause choices for diagnosis */
  rootCauseOptions: string[];
  /** Hint: recommended diagnostic path */
  diagnosticPath: string[];
  /** Called when user submits root cause */
  onSubmitDiagnosis: (rootCause: string) => void;
  /** Called when user requests a hint */
  onRequestHint: () => void;
  /** Called when user abandons incident */
  onClose: () => void;
}

const PHASE_ORDER: DiagnosticPhase[] = [
  "survey",
  "triage",
  "isolation",
  "remediation",
  "verification",
];

const PHASE_LABELS: Record<DiagnosticPhase, string> = {
  survey: "Survey",
  triage: "Triage",
  isolation: "Isolation",
  remediation: "Remediation",
  verification: "Verification",
};

const HINT_PENALTY = 5;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function IncidentWorkspace({
  situation,
  phaseHistory,
  rootCauseOptions,
  diagnosticPath,
  onSubmitDiagnosis,
  onRequestHint,
  onClose,
}: IncidentWorkspaceProps) {
  // ---------------------------------------------------------------------------
  // Elapsed Timer
  // ---------------------------------------------------------------------------
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Workflow Progress
  // ---------------------------------------------------------------------------
  const reachedPhases = new Set(phaseHistory.map((entry) => entry.phase));

  // ---------------------------------------------------------------------------
  // Diagnosis Submission
  // ---------------------------------------------------------------------------
  const [revealedHints, setRevealedHints] = useState(0);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  // Reset hint/diagnosis state when situation changes (e.g. restart-in-place)
  useEffect(() => {
    setRevealedHints(0);
    setShowDiagnosis(false);
    setSelectedRootCause(null);
  }, [situation]);
  const [selectedRootCause, setSelectedRootCause] = useState<string | null>(
    null,
  );

  const handleConfirmDiagnosis = () => {
    if (selectedRootCause) {
      onSubmitDiagnosis(selectedRootCause);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[400px] xl:max-w-none xl:w-[clamp(340px,30vw,560px)] bg-gray-900 shadow-2xl flex flex-col border-r border-nvidia-green overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-nvidia-green">
            Active Incident
          </h2>
          <span className="rounded bg-gray-900 px-3 py-1 font-mono text-sm text-yellow-400">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Situation Briefing */}
        <section className="rounded bg-gray-900 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Situation
          </h3>
          <p className="text-sm leading-relaxed text-gray-200">{situation}</p>
        </section>

        {/* Workflow Progress Checklist */}
        <section className="rounded bg-gray-900 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Diagnostic Progress
          </h3>
          <ul className="space-y-2">
            {PHASE_ORDER.map((phase) => {
              const reached = reachedPhases.has(phase);
              return (
                <li
                  key={phase}
                  data-phase={phase}
                  data-reached={String(reached)}
                  className="flex items-center gap-2 text-sm"
                >
                  {reached ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-nvidia-green text-xs font-bold text-black">
                      &#10003;
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 text-xs text-gray-500">
                      &nbsp;
                    </span>
                  )}
                  <span className={reached ? "text-white" : "text-gray-500"}>
                    {PHASE_LABELS[phase]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Diagnosis Submission */}
        <section className="rounded bg-gray-900 p-3">
          {!showDiagnosis ? (
            <button
              onClick={() => setShowDiagnosis(true)}
              className="w-full rounded bg-nvidia-green px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-green-500"
            >
              Submit Diagnosis
            </button>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Select Root Cause
              </h3>
              <div className="space-y-2">
                {rootCauseOptions.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm transition-colors ${
                      selectedRootCause === option
                        ? "border-nvidia-green bg-gray-800 text-white"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rootCause"
                      value={option}
                      checked={selectedRootCause === option}
                      onChange={() => setSelectedRootCause(option)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        selectedRootCause === option
                          ? "border-nvidia-green bg-nvidia-green"
                          : "border-gray-500"
                      }`}
                    >
                      {selectedRootCause === option && (
                        <span className="h-2 w-2 rounded-full bg-black" />
                      )}
                    </span>
                    <span
                      onClick={() => setSelectedRootCause(option)}
                      role="presentation"
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDiagnosis}
                  disabled={!selectedRootCause}
                  className="flex-1 rounded bg-nvidia-green px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setShowDiagnosis(false);
                    setSelectedRootCause(null);
                  }}
                  className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Hint System */}
        <section className="rounded bg-gray-900 p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setRevealedHints((prev) => prev + 1);
                onRequestHint();
              }}
              disabled={revealedHints >= diagnosticPath.length}
              className="rounded border border-yellow-600 px-3 py-2 text-sm text-yellow-400 transition-colors hover:bg-yellow-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request Hint ({revealedHints}/{diagnosticPath.length})
            </button>
            <span className="text-xs text-gray-400">
              <span className="text-yellow-400">-{HINT_PENALTY} pts</span> per
              hint
            </span>
          </div>
          {revealedHints > 0 && (
            <ul className="mt-2 space-y-1">
              {diagnosticPath.slice(0, revealedHints).map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-xs text-gray-300"
                >
                  <span className="font-mono text-nvidia-green">
                    {idx + 1}.
                  </span>
                  <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono">
                    {step}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Footer - Abandon */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={onClose}
          className="w-full rounded border border-red-700 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30"
        >
          Abandon Incident
        </button>
      </div>
    </div>
  );
}
