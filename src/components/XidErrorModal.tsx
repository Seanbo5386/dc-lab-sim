/**
 * XID Error Modal
 *
 * Focused modal showing details for a single XID error code.
 * Reuses data from xidErrors.ts and styling patterns from XidErrorReference.tsx.
 */

import React, { useEffect, useCallback } from "react";
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Cpu,
  Zap,
  HardDrive,
  Link,
  Thermometer,
  Settings,
  Code,
} from "lucide-react";
import {
  getXIDByCode,
  type XIDSeverity,
  type XIDCategory,
} from "@/data/xidErrors";

// Map category to icons (same as XidErrorReference)
const categoryIcons: Record<XIDCategory, React.ReactNode> = {
  Hardware: <Cpu className="w-4 h-4" />,
  Memory: <HardDrive className="w-4 h-4" />,
  NVLink: <Link className="w-4 h-4" />,
  Power: <Zap className="w-4 h-4" />,
  Driver: <Settings className="w-4 h-4" />,
  Application: <Code className="w-4 h-4" />,
  Thermal: <Thermometer className="w-4 h-4" />,
};

function getSeverityStyles(severity: XIDSeverity): string {
  switch (severity) {
    case "Critical":
      return "bg-red-900/50 text-red-400";
    case "Warning":
      return "bg-yellow-900/50 text-yellow-400";
    case "Informational":
      return "bg-blue-900/50 text-blue-400";
  }
}

interface XidErrorModalProps {
  xidCode: number | null;
  onClose: () => void;
}

export const XidErrorModal: React.FC<XidErrorModalProps> = ({
  xidCode,
  onClose,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (xidCode !== null) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [xidCode, handleEscape]);

  if (xidCode === null) return null;

  const error = getXIDByCode(xidCode);
  if (!error) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="xid-modal-backdrop"
      >
        <div
          className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <p className="text-gray-300">No data found for XID {xidCode}.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const SeverityIcon =
    error.severity === "Critical"
      ? AlertCircle
      : error.severity === "Warning"
        ? AlertTriangle
        : Info;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="xid-modal-backdrop"
    >
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${getSeverityStyles(error.severity)}`}
            >
              <SeverityIcon className="w-4 h-4" />
              XID {error.code}
            </span>
            {error.examRelevance === "High" && (
              <span className="bg-nvidia-green/20 text-nvidia-green text-xs px-2 py-1 rounded">
                Exam Relevant
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label="Close modal"
            data-testid="xid-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name & category */}
        <h3 className="text-lg font-bold text-white mb-1">{error.name}</h3>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
          {categoryIcons[error.category]}
          {error.category}
        </div>

        {/* Description */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-1">
            Description
          </h4>
          <p className="text-sm text-gray-400">{error.description}</p>
        </div>

        {/* Cause */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-1">Cause</h4>
          <p className="text-sm text-gray-400">{error.cause}</p>
        </div>

        {/* Recommended Actions */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Recommended Actions
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
            {error.action.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>

        {/* Related Commands */}
        {error.relatedCommands && error.relatedCommands.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">
              Related Commands
            </h4>
            <div className="flex flex-wrap gap-2">
              {error.relatedCommands.map((cmd, i) => (
                <code
                  key={i}
                  className="text-sm bg-gray-900 text-nvidia-green px-2 py-1 rounded"
                >
                  {cmd}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Exam Relevance */}
        {error.examRelevance && (
          <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-nvidia-green mb-1">
              NCP-AII Exam Relevance: {error.examRelevance}
            </h4>
            <p className="text-xs text-gray-400">
              {error.examRelevance === "High"
                ? "This XID error is commonly tested on the NCP-AII exam. Understand the cause, diagnosis steps, and resolution."
                : error.examRelevance === "Medium"
                  ? "This XID may appear in exam scenarios. Know the basic diagnosis approach."
                  : "Low exam priority, but good to know for real-world troubleshooting."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default XidErrorModal;
