import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dashboard } from './Dashboard';
import { Terminal } from './Terminal';
import { GripVertical, PanelLeftClose, PanelRightClose, Maximize2 } from 'lucide-react';

interface SimulatorViewProps {
  className?: string;
}

const STORAGE_KEY = 'simulator-split-ratio';
const DEFAULT_RATIO = 50;
const MIN_PANEL_WIDTH = 20;
const MOBILE_BREAKPOINT = 768;

/**
 * SimulatorView - Unified splitscreen view combining Dashboard and Terminal
 *
 * Allows users to see the infrastructure dashboard and terminal side-by-side,
 * providing instant visual feedback when running commands.
 *
 * Features:
 * - Draggable resize handle
 * - Collapsible panels
 * - Persisted split ratio
 * - Responsive mobile layout (stacked vertically)
 */
export const SimulatorView: React.FC<SimulatorViewProps> = ({ className = '' }) => {
  // Load persisted ratio from localStorage
  const getInitialRatio = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= 100 - MIN_PANEL_WIDTH) {
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Persist split ratio to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(splitRatio));
    } catch {
      // localStorage not available
    }
  }, [splitRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

      // Clamp the ratio between MIN_PANEL_WIDTH and (100 - MIN_PANEL_WIDTH)
      const clampedRatio = Math.max(MIN_PANEL_WIDTH, Math.min(100 - MIN_PANEL_WIDTH, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Handle keyboard shortcut to reset split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+\ to reset split ratio
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        setSplitRatio(DEFAULT_RATIO);
        setLeftCollapsed(false);
        setRightCollapsed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate effective widths based on collapse state
  const getLeftWidth = () => {
    if (leftCollapsed) return 0;
    if (rightCollapsed) return 100;
    return splitRatio;
  };

  const getRightWidth = () => {
    if (rightCollapsed) return 0;
    if (leftCollapsed) return 100;
    return 100 - splitRatio;
  };

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

  // Mobile layout: stacked vertically with tabs
  if (isMobile) {
    return (
      <div className={`flex flex-col h-full w-full ${className}`}>
        {/* Mobile Tab Bar */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => { setLeftCollapsed(false); setRightCollapsed(true); }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              !leftCollapsed && rightCollapsed
                ? 'bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setLeftCollapsed(true); setRightCollapsed(false); }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              leftCollapsed && !rightCollapsed
                ? 'bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Terminal
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {!leftCollapsed && rightCollapsed && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <Dashboard />
            </div>
          )}
          {leftCollapsed && !rightCollapsed && (
            <div className="h-full bg-gray-900">
              <Terminal className="h-full" />
            </div>
          )}
          {!leftCollapsed && !rightCollapsed && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <Dashboard />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: side-by-side with draggable divider
  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''} ${className}`}
    >
      {/* Left Panel - Dashboard */}
      <div
        className={`h-full overflow-hidden flex flex-col bg-gray-900 transition-all duration-200 ${leftCollapsed ? 'w-0' : ''}`}
        style={{ width: leftCollapsed ? 0 : `${getLeftWidth()}%` }}
      >
        {!leftCollapsed && (
          <div className="flex-1 overflow-auto p-4">
            <Dashboard />
          </div>
        )}
      </div>

      {/* Resize Handle / Control Bar */}
      <div className="flex flex-col items-center bg-gray-800 border-x border-gray-700">
        {/* Collapse Left Button */}
        <button
          onClick={toggleLeftPanel}
          className="p-1.5 hover:bg-gray-700 transition-colors"
          title={leftCollapsed ? 'Show Dashboard' : 'Hide Dashboard'}
        >
          <PanelLeftClose className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${leftCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Draggable Handle */}
        <div
          className={`flex-1 w-full cursor-col-resize flex items-center justify-center hover:bg-nvidia-green/20 transition-colors ${isDragging ? 'bg-nvidia-green/30' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className={`w-4 h-4 ${isDragging ? 'text-nvidia-green' : 'text-gray-500'}`} />
        </div>

        {/* Reset Button */}
        <button
          onClick={resetPanels}
          className="p-1.5 hover:bg-gray-700 transition-colors"
          title="Reset split (Ctrl+\)"
        >
          <Maximize2 className="w-4 h-4 text-gray-400 hover:text-nvidia-green" />
        </button>

        {/* Collapse Right Button */}
        <button
          onClick={toggleRightPanel}
          className="p-1.5 hover:bg-gray-700 transition-colors"
          title={rightCollapsed ? 'Show Terminal' : 'Hide Terminal'}
        >
          <PanelRightClose className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${rightCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Right Panel - Terminal */}
      <div
        className={`h-full overflow-hidden flex flex-col transition-all duration-200 ${rightCollapsed ? 'w-0' : ''}`}
        style={{ width: rightCollapsed ? 0 : `${getRightWidth()}%` }}
      >
        {!rightCollapsed && (
          <div className="flex-1 bg-gray-900 overflow-hidden">
            <Terminal className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
};
