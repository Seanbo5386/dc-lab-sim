import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dashboard } from './Dashboard';
import { Terminal } from './Terminal';
import { GripHorizontal, PanelTopClose, PanelBottomClose, Maximize2 } from 'lucide-react';

interface SimulatorViewProps {
  className?: string;
}

const STORAGE_KEY = 'simulator-split-ratio';
const DEFAULT_RATIO = 50;
const MIN_PANEL_HEIGHT = 15;
const MOBILE_BREAKPOINT = 768;

/**
 * SimulatorView - Unified view combining Dashboard and Terminal
 *
 * Dashboard on top, Terminal below - providing instant visual feedback
 * when running commands.
 *
 * Features:
 * - Draggable horizontal resize handle
 * - Collapsible panels
 * - Persisted split ratio
 * - Responsive mobile layout (tabbed)
 */
export const SimulatorView: React.FC<SimulatorViewProps> = ({ className = '' }) => {
  // Load persisted ratio from localStorage
  const getInitialRatio = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= MIN_PANEL_HEIGHT && parsed <= 100 - MIN_PANEL_HEIGHT) {
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
  const [topCollapsed, setTopCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
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
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp the ratio between MIN_PANEL_HEIGHT and (100 - MIN_PANEL_HEIGHT)
      const clampedRatio = Math.max(MIN_PANEL_HEIGHT, Math.min(100 - MIN_PANEL_HEIGHT, newRatio));
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
        setTopCollapsed(false);
        setBottomCollapsed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate effective heights based on collapse state
  const getTopHeight = () => {
    if (topCollapsed) return 0;
    if (bottomCollapsed) return 100;
    return splitRatio;
  };

  const getBottomHeight = () => {
    if (bottomCollapsed) return 0;
    if (topCollapsed) return 100;
    return 100 - splitRatio;
  };

  const toggleTopPanel = () => {
    setTopCollapsed(!topCollapsed);
    if (bottomCollapsed) setBottomCollapsed(false);
  };

  const toggleBottomPanel = () => {
    setBottomCollapsed(!bottomCollapsed);
    if (topCollapsed) setTopCollapsed(false);
  };

  const resetPanels = () => {
    setTopCollapsed(false);
    setBottomCollapsed(false);
    setSplitRatio(DEFAULT_RATIO);
  };

  // Mobile layout: tabbed interface
  if (isMobile) {
    return (
      <div className={`flex flex-col h-full w-full ${className}`}>
        {/* Mobile Tab Bar */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => { setTopCollapsed(false); setBottomCollapsed(true); }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              !topCollapsed && bottomCollapsed
                ? 'bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setTopCollapsed(true); setBottomCollapsed(false); }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              topCollapsed && !bottomCollapsed
                ? 'bg-gray-900 text-nvidia-green border-b-2 border-nvidia-green'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Terminal
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {!topCollapsed && bottomCollapsed && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <Dashboard />
            </div>
          )}
          {topCollapsed && !bottomCollapsed && (
            <div className="h-full bg-gray-900">
              <Terminal className="h-full" />
            </div>
          )}
          {!topCollapsed && !bottomCollapsed && (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <Dashboard />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: vertical split with Dashboard on top, Terminal below
  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full overflow-hidden ${isDragging ? 'select-none cursor-row-resize' : ''} ${className}`}
    >
      {/* Top Panel - Dashboard */}
      <div
        className={`w-full overflow-hidden flex flex-col bg-gray-900 transition-all duration-200 ${topCollapsed ? 'h-0' : ''}`}
        style={{ height: topCollapsed ? 0 : `${getTopHeight()}%` }}
      >
        {!topCollapsed && (
          <div className="flex-1 overflow-auto p-4">
            <Dashboard />
          </div>
        )}
      </div>

      {/* Resize Handle / Control Bar */}
      <div className="flex items-center bg-gray-800 border-y border-gray-700 h-7 min-h-[28px]">
        {/* Collapse Top Button */}
        <button
          onClick={toggleTopPanel}
          className="px-2 h-full hover:bg-gray-700 transition-colors"
          title={topCollapsed ? 'Show Dashboard' : 'Hide Dashboard'}
        >
          <PanelTopClose className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${topCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Draggable Handle */}
        <div
          className={`flex-1 h-full cursor-row-resize flex items-center justify-center hover:bg-nvidia-green/20 transition-colors ${isDragging ? 'bg-nvidia-green/30' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className={`w-4 h-4 ${isDragging ? 'text-nvidia-green' : 'text-gray-500'}`} />
        </div>

        {/* Reset Button */}
        <button
          onClick={resetPanels}
          className="px-2 h-full hover:bg-gray-700 transition-colors"
          title="Reset split (Ctrl+\)"
        >
          <Maximize2 className="w-4 h-4 text-gray-400 hover:text-nvidia-green" />
        </button>

        {/* Collapse Bottom Button */}
        <button
          onClick={toggleBottomPanel}
          className="px-2 h-full hover:bg-gray-700 transition-colors"
          title={bottomCollapsed ? 'Show Terminal' : 'Hide Terminal'}
        >
          <PanelBottomClose className={`w-4 h-4 text-gray-400 hover:text-nvidia-green transition-transform ${bottomCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Bottom Panel - Terminal */}
      <div
        className={`w-full overflow-hidden flex flex-col transition-all duration-200 ${bottomCollapsed ? 'h-0' : ''}`}
        style={{ height: bottomCollapsed ? 0 : `${getBottomHeight()}%` }}
      >
        {!bottomCollapsed && (
          <div className="flex-1 bg-gray-900 overflow-hidden">
            <Terminal className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
};
