/**
 * Sync Toast Notification Component
 *
 * Displays a slide-in toast when cloud sync fails or the user goes offline.
 * Positioned bottom-left to avoid conflict with FaultToast (bottom-right).
 */

import React, { useEffect, useState, useCallback } from "react";
import { useSyncToastStore } from "@/store/syncToastStore";
import { WifiOff, AlertCircle, RefreshCw, X } from "lucide-react";

const AUTO_DISMISS_DELAY = 10000;
const ANIMATION_DURATION = 300;

interface SyncToastProps {
  onRetry?: () => void;
}

export const SyncToast: React.FC<SyncToastProps> = ({ onRetry }) => {
  const visible = useSyncToastStore((s) => s.visible);
  const message = useSyncToastStore((s) => s.message);
  const type = useSyncToastStore((s) => s.type);
  const dismiss = useSyncToastStore((s) => s.dismiss);

  const [isShown, setIsShown] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      dismiss();
      setIsExiting(false);
      setIsShown(false);
    }, ANIMATION_DURATION);
  }, [dismiss]);

  // Entrance animation
  useEffect(() => {
    if (visible) {
      setIsExiting(false);
      const timer = setTimeout(() => setIsShown(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsShown(false);
    }
  }, [visible]);

  // Auto-dismiss (skip for offline — stays until back online)
  useEffect(() => {
    if (visible && type !== "offline") {
      const timer = setTimeout(handleDismiss, AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [visible, type, handleDismiss]);

  if (!visible) return null;

  const animationClasses = isExiting
    ? "-translate-x-full opacity-0"
    : isShown
      ? "translate-x-0 opacity-100"
      : "-translate-x-full opacity-0";

  const Icon =
    type === "offline"
      ? WifiOff
      : type === "retrying"
        ? RefreshCw
        : AlertCircle;

  const iconColor =
    type === "offline"
      ? "text-yellow-400"
      : type === "retrying"
        ? "text-blue-400"
        : "text-red-400";

  const borderColor =
    type === "offline"
      ? "border-l-yellow-500"
      : type === "retrying"
        ? "border-l-blue-500"
        : "border-l-red-500";

  return (
    <div
      className={`
        fixed bottom-4 left-4 z-40
        bg-gray-800/95 backdrop-blur-sm
        border border-gray-700 border-l-4 ${borderColor}
        rounded-lg shadow-2xl
        p-4 pr-10 min-w-[280px] max-w-[360px]
        transform transition-all duration-300 ease-out
        ${animationClasses}
      `}
      role="alert"
      aria-live="polite"
      data-testid="sync-toast"
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        aria-label="Dismiss notification"
        data-testid="sync-toast-close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Icon + Message */}
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor} ${type === "retrying" ? "animate-spin" : ""}`}
        />
        <div className="flex-1">
          <p className="text-sm text-gray-200 leading-relaxed">{message}</p>
          {/* Retry button (only for error state) */}
          {type === "error" && onRetry && (
            <button
              onClick={() => {
                onRetry();
                handleDismiss();
              }}
              className="mt-2 text-xs font-medium text-nvidia-green hover:text-nvidia-darkgreen transition-colors"
              data-testid="sync-toast-retry"
            >
              Retry now
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for auto-dismiss (not shown for offline) */}
      {type !== "offline" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 overflow-hidden rounded-b-lg">
          <div
            className={`h-full origin-left ${
              type === "retrying" ? "bg-blue-500" : "bg-red-500"
            }`}
            style={{
              animation: `shrink-sync-toast ${AUTO_DISMISS_DELAY}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink-sync-toast {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};

export default SyncToast;
