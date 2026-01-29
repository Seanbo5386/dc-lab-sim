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
const HANDLE_HEIGHT = 28;

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
  const [containerHeight, setContainerHeight] = useState(0);
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

  // Track container height
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
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

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) {
        return;
      }

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp the ratio between MIN_PANEL_HEIGHT and (100 - MIN_PANEL_HEIGHT)
      const clampedRatio = Math.max(MIN_PANEL_HEIGHT, Math.min(100 - MIN_PANEL_HEIGHT, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || !e.touches[0]) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.touches[0].clientY - rect.top) / rect.height) * 100;

      const clampedRatio = Math.max(MIN_PANEL_HEIGHT, Math.min(100 - MIN_PANEL_HEIGHT, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
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

  // Calculate pixel heights for panels (only when container has been measured)
  const availableHeight = Math.max(0, containerHeight - HANDLE_HEIGHT);
  let topHeight: number;
  let bottomHeight: number;

  if (topCollapsed) {
    topHeight = 0;
    bottomHeight = availableHeight;
  } else if (bottomCollapsed) {
    topHeight = availableHeight;
    bottomHeight = 0;
  } else {
    topHeight = Math.round(availableHeight * (splitRatio / 100));
    bottomHeight = availableHeight - topHeight;
  }

  // Desktop layout: vertical split with Dashboard on top, Terminal below
  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${isDragging ? 'select-none cursor-row-resize' : ''} ${className}`}
      style={{ minHeight: '200px' }}
    >
      {/* Show loading state until container is measured */}
      {containerHeight === 0 ? (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-4 bg-gray-900">
            <Dashboard />
          </div>
          <div className="h-7 bg-gray-800 border-y border-gray-700 flex items-center justify-center">
            <GripHorizontal className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 overflow-hidden bg-gray-900">
            <Terminal className="h-full" />
          </div>
        </div>
      ) : (
        <>
          {/* Top Panel - Dashboard */}
          <div
            className="absolute top-0 left-0 right-0 overflow-hidden bg-gray-900"
            style={{
              height: topHeight,
              transition: isDragging ? 'none' : 'height 0.15s ease-out'
            }}
          >
            {!topCollapsed && topHeight > 0 && (
              <div className="h-full overflow-auto p-4">
                <Dashboard />
              </div>
            )}
          </div>

          {/* Resize Handle / Control Bar */}
          <div
            className="absolute left-0 right-0 flex items-center bg-gray-800 border-y border-gray-700"
            style={{
              top: topHeight,
              height: HANDLE_HEIGHT,
              transition: isDragging ? 'none' : 'top 0.15s ease-out'
            }}
          >
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
              className={`flex-1 h-full cursor-row-resize flex items-center justify-center hover:bg-nvidia-green/20 active:bg-nvidia-green/30 transition-colors touch-none ${isDragging ? 'bg-nvidia-green/30' : ''}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize panels"
              tabIndex={0}
            >
              <GripHorizontal className={`w-4 h-4 pointer-events-none ${isDragging ? 'text-nvidia-green' : 'text-gray-500'}`} />
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
            className="absolute bottom-0 left-0 right-0 overflow-hidden bg-gray-900"
            style={{
              height: bottomHeight,
              transition: isDragging ? 'none' : 'height 0.15s ease-out'
            }}
          >
            {!bottomCollapsed && bottomHeight > 0 && (
              <div className="h-full overflow-hidden">
                <Terminal className="h-full" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
