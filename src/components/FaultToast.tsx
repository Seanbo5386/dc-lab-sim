/**
 * Fault Toast Notification Component
 *
 * Displays slide-in toast notifications when faults are injected, with
 * educational feedback including suggested commands and optional XID lookups.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  useFaultToastStore,
  type FaultToastData,
} from "@/store/faultToastStore";
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { XidErrorModal } from "./XidErrorModal";

const AUTO_DISMISS_DELAY = 8000;
const ANIMATION_DURATION = 300;

// ============================================================================
// INDIVIDUAL TOAST ITEM
// ============================================================================

interface FaultToastItemProps {
  toast: FaultToastData;
  onDismiss: (id: string) => void;
  onViewXID: (code: number) => void;
}

const FaultToastItem: React.FC<FaultToastItemProps> = ({
  toast,
  onDismiss,
  onViewXID,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, ANIMATION_DURATION);
  }, [toast.id, onDismiss]);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(handleDismiss, AUTO_DISMISS_DELAY);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const animationClasses = isExiting
    ? "translate-x-full opacity-0"
    : isVisible
      ? "translate-x-0 opacity-100"
      : "translate-x-full opacity-0";

  const borderColor =
    toast.severity === "critical"
      ? "border-l-red-500"
      : toast.severity === "warning"
        ? "border-l-yellow-500"
        : "border-l-blue-500";

  const SeverityIcon =
    toast.severity === "critical"
      ? AlertCircle
      : toast.severity === "warning"
        ? AlertTriangle
        : Info;

  const iconColor =
    toast.severity === "critical"
      ? "text-red-400"
      : toast.severity === "warning"
        ? "text-yellow-400"
        : "text-blue-400";

  return (
    <div
      className={`
        relative overflow-hidden
        bg-gray-800/95 backdrop-blur-sm
        border border-gray-700 border-l-4 ${borderColor}
        rounded-lg shadow-2xl
        p-4 pr-10 min-w-[320px] max-w-[400px]
        transform transition-all duration-300 ease-out
        ${animationClasses}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        aria-label="Dismiss notification"
        data-testid="toast-close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <SeverityIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <span className="font-semibold text-sm text-gray-100">
          {toast.title}
        </span>
      </div>

      {/* Message */}
      <p className="text-xs text-gray-300 mb-2 leading-relaxed">
        {toast.message}
      </p>

      {/* Suggested command */}
      <div className="text-xs text-gray-400 mb-1">
        Try:{" "}
        <code className="text-nvidia-green font-mono bg-gray-900/60 px-1.5 py-0.5 rounded">
          {toast.suggestedCommand}
        </code>
      </div>

      {/* Dashboard hint */}
      <p className="text-xs text-gray-500 mb-2">
        Check the Dashboard to see changes reflected live.
      </p>

      {/* XID Info button */}
      {toast.xidCode != null && (
        <button
          onClick={() => onViewXID(toast.xidCode!)}
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          data-testid="toast-view-xid"
        >
          <ExternalLink className="w-3 h-3" />
          View XID Info
        </button>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 overflow-hidden">
        <div
          className={`h-full origin-left ${
            toast.severity === "critical"
              ? "bg-red-500"
              : toast.severity === "warning"
                ? "bg-yellow-500"
                : "bg-blue-500"
          }`}
          style={{
            animation: `shrink-toast ${AUTO_DISMISS_DELAY}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// TOAST CONTAINER
// ============================================================================

export const FaultToastContainer: React.FC = () => {
  const toasts = useFaultToastStore((state) => state.toasts);
  const removeToast = useFaultToastStore((state) => state.removeToast);
  const [xidModalCode, setXidModalCode] = useState<number | null>(null);

  if (toasts.length === 0 && xidModalCode === null) {
    return null;
  }

  return (
    <>
      {/* Keyframe for progress bar */}
      <style>{`
        @keyframes shrink-toast {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-40 flex flex-col gap-3"
          aria-label="Fault injection notifications"
        >
          {toasts.map((toast) => (
            <FaultToastItem
              key={toast.id}
              toast={toast}
              onDismiss={removeToast}
              onViewXID={setXidModalCode}
            />
          ))}
        </div>
      )}

      {/* XID Modal */}
      <XidErrorModal
        xidCode={xidModalCode}
        onClose={() => setXidModalCode(null)}
      />
    </>
  );
};

export default FaultToastContainer;
