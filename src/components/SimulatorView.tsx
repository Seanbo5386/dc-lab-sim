import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dashboard } from "./Dashboard";
import { Terminal } from "./Terminal";
import { FaultInjection } from "./FaultInjection";
import { useSimulationStore } from "../store/simulationStore";
import {
  GripVertical,
  Lock,
  Maximize2,
  PanelLeftClose,
  PanelRightClose,
  TerminalSquare,
  Zap,
} from "lucide-react";

interface SimulatorViewProps {
  className?: string;
}

const STORAGE_KEY = "simulator-split-ratio";
const DEFAULT_RATIO = 50;
const MIN_PANEL_WIDTH = 20;
const MOBILE_BREAKPOINT = 768;
const HANDLE_WIDTH = 28;

/**
 * SimulatorView - Unified view combining Dashboard and Terminal
 *
 * Dashboard on left, Terminal on right - providing instant visual feedback
 * when running commands.
 *
 * Features:
 * - Draggable vertical resize handle
 * - Collapsible panels
 * - Persisted split ratio
 * - Responsive mobile layout (tabbed)
 */
export const SimulatorView: React.FC<SimulatorViewProps> = ({
  className = "",
}) => {
  // Load persisted ratio from localStorage
  const getInitialRatio = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (
          !isNaN(parsed) &&
          parsed >= MIN_PANEL_WIDTH &&
          parsed <= 100 - MIN_PANEL_WIDTH
        ) {
          return parsed;
        }
      }
    } catch {
      // localStorage not available
    }
    return DEFAULT_RATIO;
  };

  const [splitRatio, setSplitRatio] = useState(getInitialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [rightTab, setRightTab] = useState<"terminal" | "faults">("terminal");
  const [mobileTab, setMobileTab] = useState<
    "dashboard" | "terminal" | "faults"
  >("dashboard");
  const activeScenario = useSimulationStore((state) => state.activeScenario);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Persist split ratio to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(splitRatio));
    } catch {
      // localStorage not available
    }
  }, [splitRatio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) {
        return;
      }

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

      // Clamp the ratio between MIN_PANEL_WIDTH and (100 - MIN_PANEL_WIDTH)
      const clampedRatio = Math.max(
        MIN_PANEL_WIDTH,
        Math.min(100 - MIN_PANEL_WIDTH, newRatio),
      );
      setSplitRatio(clampedRatio);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || !e.touches[0]) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.touches[0].clientX - rect.left) / rect.width) * 100;

      const clampedRatio = Math.max(
        MIN_PANEL_WIDTH,
        Math.min(100 - MIN_PANEL_WIDTH, newRatio),
      );
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  // Handle keyboard shortcut to reset split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+\ to reset split ratio
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        setSplitRatio(DEFAULT_RATIO);
        setLeftCollapsed(false);
        setRightCollapsed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-switch away from faults tab when a scenario becomes active
  useEffect(() => {
    if (activeScenario) {
      setRightTab((prev) => (prev === "faults" ? "terminal" : prev));
      setMobileTab((prev) => (prev === "faults" ? "terminal" : prev));
    }
  }, [activeScenario]);

  const toggleLeftPanel = () => {
    setLeftCollapsed(!leftCollapsed);
    if (rightCollapsed) setRightCollapsed(false);
  };

  const toggleRightPanel = () => {
    setRightCollapsed(!rightCollapsed);
    if (leftCollapsed) setLeftCollapsed(false);
  };

  const resetPanels = () => {
    setLeftCollapsed(false);
    setRightCollapsed(false);
    setSplitRatio(DEFAULT_RATIO);
  };

  // Mobile layout: tabbed interface
  if (isMobile) {
    return (
      <div className={`flex flex-col h-full w-full ${className}`}>
        {/* Mobile Tab Bar */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setMobileTab("dashboard")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              mobileTab === "dashboard"
                ? "bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setMobileTab("terminal")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              mobileTab === "terminal"
                ? "bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Terminal
          </button>
          <div className="relative group flex-1">
            <button
              onClick={() => !activeScenario && setMobileTab("faults")}
              disabled={!!activeScenario}
              className={`w-full py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                mobileTab === "faults"
                  ? "bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green"
                  : activeScenario
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {activeScenario && <Lock className="w-3.5 h-3.5" />}
              Sandbox
            </button>
            {activeScenario && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Scenario is active
              </div>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === "dashboard" && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <Dashboard />
            </div>
          )}
          {mobileTab === "terminal" && (
            <div className="h-full bg-gray-900">
              <Terminal className="h-full" />
            </div>
          )}
          {mobileTab === "faults" && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <FaultInjection />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate pixel widths for panels (only when container has been measured)
  const availableWidth = Math.max(0, containerWidth - HANDLE_WIDTH);
  let leftWidth: number;
  let rightWidth: number;

  if (leftCollapsed) {
    leftWidth = 0;
    rightWidth = availableWidth;
  } else if (rightCollapsed) {
    leftWidth = availableWidth;
    rightWidth = 0;
  } else {
    leftWidth = Math.round(availableWidth * (splitRatio / 100));
    rightWidth = availableWidth - leftWidth;
  }

  // Desktop layout: horizontal split with Dashboard on left, Terminal on right
  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${isDragging ? "select-none cursor-col-resize" : ""} ${className}`}
      style={{ minWidth: "400px" }}
    >
      {/* Show loading state until container is measured */}
      {containerWidth === 0 ? (
        <div className="flex h-full">
          <div className="flex-1 overflow-auto p-4 bg-gray-900">
            <Dashboard />
          </div>
          <div className="w-7 bg-gray-800 border-x border-gray-700 flex items-center justify-center">
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 overflow-hidden bg-gray-900 flex flex-col">
            <div className="flex bg-gray-800 border-b border-gray-700 shrink-0">
              <button className="flex items-center gap-1.5 py-2 px-4 text-sm font-medium bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green">
                <TerminalSquare className="w-4 h-4" />
                Terminal
              </button>
              <button className="flex items-center gap-1.5 py-2 px-4 text-sm font-medium text-gray-400">
                <Zap className="w-4 h-4" />
                Sandbox
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Terminal className="h-full" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Left Panel - Dashboard */}
          <div
            data-tour="dashboard-panel"
            className="absolute top-0 bottom-0 left-0 overflow-hidden bg-gray-900"
            style={{
              width: leftWidth,
              transition: isDragging ? "none" : "width 0.15s ease-out",
            }}
          >
            {!leftCollapsed && leftWidth > 0 && (
              <div className="h-full overflow-auto p-4">
                <Dashboard />
              </div>
            )}
          </div>

          {/* Resize Handle / Control Bar */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center bg-gray-800 border-x border-gray-700"
            style={{
              left: leftWidth,
              width: HANDLE_WIDTH,
              transition: isDragging ? "none" : "left 0.15s ease-out",
            }}
          >
            {/* Collapse Left Button */}
            <button
              onClick={toggleLeftPanel}
              className="py-2 w-full hover:bg-gray-700 transition-colors flex justify-center"
              title={leftCollapsed ? "Show Dashboard" : "Hide Dashboard"}
            >
              <PanelLeftClose
                className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${leftCollapsed ? "rotate-180" : ""}`}
              />
            </button>

            {/* Draggable Handle */}
            <div
              data-tour="split-handle"
              className={`flex-1 w-full cursor-col-resize flex items-center justify-center hover:bg-nvidia-green/20 active:bg-nvidia-green/30 transition-colors touch-none ${isDragging ? "bg-nvidia-green/30" : ""}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
              tabIndex={0}
            >
              <GripVertical
                className={`w-4 h-4 pointer-events-none ${isDragging ? "text-nvidia-green" : "text-gray-500"}`}
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={resetPanels}
              className="py-2 w-full hover:bg-gray-700 transition-colors flex justify-center"
              title="Reset split (Ctrl+\)"
            >
              <Maximize2 className="w-4 h-4 text-gray-400 hover:text-nvidia-green" />
            </button>

            {/* Collapse Right Button */}
            <button
              onClick={toggleRightPanel}
              className="py-2 w-full hover:bg-gray-700 transition-colors flex justify-center"
              title={rightCollapsed ? "Show Right Panel" : "Hide Right Panel"}
            >
              <PanelRightClose
                className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${rightCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Right Panel - Terminal / Sandbox */}
          <div
            data-tour="terminal-panel"
            className="absolute top-0 bottom-0 right-0 overflow-hidden bg-gray-900 flex flex-col"
            style={{
              width: rightWidth,
              transition: isDragging ? "none" : "width 0.15s ease-out",
            }}
          >
            {!rightCollapsed && rightWidth > 0 && (
              <>
                {/* Tab Bar */}
                <div className="flex bg-gray-800 border-b border-gray-700 shrink-0">
                  <button
                    onClick={() => setRightTab("terminal")}
                    className={`flex items-center gap-1.5 py-2 px-4 text-sm font-medium transition-colors ${
                      rightTab === "terminal"
                        ? "bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <TerminalSquare className="w-4 h-4" />
                    Terminal
                  </button>
                  <div className="relative group">
                    <button
                      onClick={() => !activeScenario && setRightTab("faults")}
                      disabled={!!activeScenario}
                      className={`flex items-center gap-1.5 py-2 px-4 text-sm font-medium transition-colors ${
                        rightTab === "faults"
                          ? "bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green"
                          : activeScenario
                            ? "text-gray-600 cursor-not-allowed"
                            : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {activeScenario ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Sandbox
                    </button>
                    {/* Tooltip when locked */}
                    {activeScenario && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Scenario is active
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  {rightTab === "terminal" ? (
                    <Terminal className="h-full" />
                  ) : (
                    <div className="h-full overflow-auto p-4">
                      <FaultInjection />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
