import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Dashboard } from "./Dashboard";

interface DashboardSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSlideOver: React.FC<DashboardSlideOverProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        data-testid="slide-over-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-[60vw] max-w-[900px] bg-nvidia-dark border-l border-gray-700 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Cluster State</h2>
          <button
            onClick={onClose}
            aria-label="Close dashboard"
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Dashboard />
        </div>
      </div>
    </div>
  );
};
