import {
  Monitor,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  Info,
  X,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import type { ClusterConfig } from "../types/hardware";
import type { SyncStatus } from "../hooks/useCloudSync";

export type View = "simulator" | "labs" | "exams" | "reference" | "about";

interface AppHeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  cluster: ClusterConfig;
  isRunning: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onResetSimulation: () => void;
  onStartTour: () => void;
  dueReviewCount: number;
  onReviewClick: () => void;
  isLoggedIn: boolean;
  syncStatus: SyncStatus;
  userEmail?: string;
  smallScreenDismissed: boolean;
  onDismissSmallScreen: () => void;
  sidebarOpen: boolean;
}

export function AppHeader({
  currentView,
  onViewChange,
  cluster,
  isRunning,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStartTour,
  dueReviewCount,
  onReviewClick,
  isLoggedIn,
  syncStatus,
  userEmail,
  smallScreenDismissed,
  onDismissSmallScreen,
  sidebarOpen,
}: AppHeaderProps) {
  return (
    <>
      {/* Skip Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-nvidia-green focus:text-black focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      {/* Small screen warning */}
      {!smallScreenDismissed && (
        <div className="xl:hidden bg-yellow-900/80 border-b border-yellow-700 px-4 py-2 flex items-center justify-between text-xs text-yellow-200 flex-shrink-0">
          <span>
            Best experienced on a desktop (1280px+). Some layouts may not
            display correctly on smaller screens.
          </span>
          <button
            onClick={onDismissSmallScreen}
            className="ml-3 p-0.5 hover:text-white flex-shrink-0"
            aria-label="Dismiss screen size warning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header + Nav scrollable wrapper */}
      <div
        className={`overflow-x-auto flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "xl:ml-[clamp(340px,30vw,560px)]" : ""}`}
      >
        <div className="min-w-max">
          <header className="bg-black border-b border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-nvidia-green rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-xl">N</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-nvidia-green">
                      Data Center Lab Simulator
                    </h1>
                    <p className="text-xs text-gray-400">
                      NCP-AII Certification Training Environment
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Simulation controls */}
                <div
                  data-tour="sim-controls"
                  className="flex items-center gap-2 bg-gray-800 rounded-lg p-2"
                >
                  <button
                    onClick={isRunning ? onStopSimulation : onStartSimulation}
                    className={`p-2 rounded transition-colors ${
                      isRunning
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-nvidia-green hover:bg-nvidia-darkgreen text-black"
                    }`}
                    title={
                      isRunning ? "Pause Simulation" : "Start Simulation"
                    }
                  >
                    {isRunning ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={onResetSimulation}
                    className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                    title="Reset Simulation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Tour button */}
                <button
                  onClick={onStartTour}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-nvidia-green text-gray-400 hover:text-nvidia-green text-sm transition-colors"
                  title="Take a guided tour of this tab"
                  data-testid="tour-help-btn"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Tour</span>
                </button>

                <div data-tour="user-menu">
                  <UserMenu
                    isLoggedIn={isLoggedIn}
                    syncStatus={syncStatus}
                    userEmail={userEmail}
                  />
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-nvidia-green">
                    {cluster.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {cluster.nodes.length} nodes •{" "}
                    {cluster.nodes.reduce(
                      (sum, n) => sum + n.gpus.length,
                      0,
                    )}{" "}
                    GPUs
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav
            role="tablist"
            aria-label="Main navigation"
            className="bg-gray-800 border-b border-gray-700 px-6"
          >
            <div className="flex gap-1">
              <button
                role="tab"
                id="tab-simulator"
                aria-selected={currentView === "simulator"}
                aria-controls="panel-simulator"
                onClick={() => onViewChange("simulator")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === "simulator"
                    ? "border-nvidia-green text-nvidia-green"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="font-medium">Simulator</span>
              </button>
              <button
                role="tab"
                id="tab-labs"
                data-tour="tab-labs"
                aria-selected={currentView === "labs"}
                aria-controls="panel-labs"
                data-testid="nav-labs"
                onClick={() => onViewChange("labs")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors relative ${
                  currentView === "labs"
                    ? "border-nvidia-green text-nvidia-green"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span className="font-medium">
                  <span className="sm:hidden">Labs</span>
                  <span className="hidden sm:inline">Labs & Scenarios</span>
                </span>
                {/* Review Notification Badge */}
                {dueReviewCount > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onReviewClick();
                    }}
                    role="status"
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-full transition-colors shadow-md cursor-pointer"
                    title={`${dueReviewCount} review${dueReviewCount > 1 ? "s" : ""} due`}
                    aria-label={`${dueReviewCount} reviews due. Click to start review drill.`}
                  >
                    {dueReviewCount > 9 ? "9+" : dueReviewCount}
                  </span>
                )}
              </button>
              <button
                role="tab"
                id="tab-exams"
                data-tour="tab-exams"
                aria-selected={currentView === "exams"}
                aria-controls="panel-exams"
                data-testid="nav-exams"
                onClick={() => onViewChange("exams")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === "exams"
                    ? "border-nvidia-green text-nvidia-green"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="font-medium">Exams</span>
              </button>
              <button
                role="tab"
                id="tab-reference"
                data-tour="tab-docs"
                aria-selected={currentView === "reference"}
                aria-controls="panel-reference"
                onClick={() => onViewChange("reference")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === "reference"
                    ? "border-nvidia-green text-nvidia-green"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">
                  <span className="sm:hidden">Docs</span>
                  <span className="hidden sm:inline">Documentation</span>
                </span>
              </button>
              <button
                role="tab"
                id="tab-about"
                data-tour="tab-about"
                aria-selected={currentView === "about"}
                aria-controls="panel-about"
                onClick={() => onViewChange("about")}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === "about"
                    ? "border-nvidia-green text-nvidia-green"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Info className="w-4 h-4" />
                <span className="font-medium">About</span>
              </button>
            </div>
          </nav>
        </div>
        {/* min-w-max */}
      </div>
      {/* overflow-x-auto */}
    </>
  );
}
