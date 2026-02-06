import { useState, useEffect, useCallback } from "react";
import { SimulatorView } from "./components/SimulatorView";
import { LabsAndScenariosView } from "./components/LabsAndScenariosView";
import { LabWorkspace } from "./components/LabWorkspace";
import { ExamWorkspace } from "./components/ExamWorkspace";
import { WelcomeScreen } from "./components/WelcomeScreen";
// Documentation import kept for potential future use - component not rendered in current tab structure
import { ReferenceTab } from "./components/ReferenceTab";
import { StateManagementTab } from "./components/StateManagementTab";
import { StudyDashboard } from "./components/StudyDashboard";
import { LearningPaths } from "./components/LearningPaths";
import { SpacedReviewDrill } from "./components/SpacedReviewDrill";
import { TierUnlockNotificationContainer } from "./components/TierUnlockNotification";
import { ExamGauntlet } from "./components/ExamGauntlet";
import { getTotalPathStats } from "./utils/learningPathEngine";
import { useSimulationStore } from "./store/simulationStore";
import { useLearningProgressStore } from "./store/learningProgressStore";
import { useMetricsSimulation } from "./hooks/useMetricsSimulation";
import { initializeScenario } from "./utils/scenarioLoader";
import { safeParseClusterJSON } from "./utils/clusterSchema";
import {
  Monitor,
  BookOpen,
  Database,
  FlaskConical,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";

type View = "simulator" | "labs" | "reference" | "state";

function App() {
  const [currentView, setCurrentView] = useState<View>("simulator");
  const [showLabWorkspace, setShowLabWorkspace] = useState(false);
  const [showExamWorkspace, setShowExamWorkspace] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem("ncp-aii-welcome-dismissed") !== "true",
  );
  const [showStudyDashboard, setShowStudyDashboard] = useState(false);
  const [showLearningPaths, setShowLearningPaths] = useState(false);
  const [showSpacedReviewDrill, setShowSpacedReviewDrill] = useState(false);
  const [showExamGauntlet, setShowExamGauntlet] = useState(false);
  const [learningProgress, setLearningProgress] = useState({
    completed: 0,
    total: 0,
  });

  // Get due reviews count from learning progress store
  const dueReviews = useLearningProgressStore((state) => state.getDueReviews());
  const dueReviewCount = dueReviews.length;

  const {
    cluster,
    isRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
    exportCluster,
    importCluster,
  } = useSimulationStore();

  // Activate metrics simulation when running
  useMetricsSimulation(isRunning);

  // Load learning progress on mount and when modal closes
  useEffect(() => {
    const savedLessons = localStorage.getItem("ncp-aii-completed-lessons");
    const completed = savedLessons ? JSON.parse(savedLessons).length : 0;
    const stats = getTotalPathStats();
    setLearningProgress({ completed, total: stats.totalLessons });
  }, [showLearningPaths]); // Refresh when modal closes

  const handleExport = () => {
    const data = exportCluster();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cluster-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const result = safeParseClusterJSON(content);
          if (result.valid && result.data) {
            importCluster(JSON.stringify(result.data));
          } else {
            alert(
              `Failed to import cluster configuration:\n\n${result.errors.join("\n")}`,
            );
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleStartScenario = async (scenarioId: string) => {
    const success = await initializeScenario(scenarioId);
    if (success) {
      setCurrentView("simulator");
      setShowLabWorkspace(true);
    }
  };

  const handleBeginExam = () => {
    setCurrentView("simulator"); // Switch to simulator view
    setShowExamWorkspace(true); // Show exam workspace overlay
  };

  // Handler for tier unlock notification "Try Now" button
  const handleNavigateToTier = useCallback(
    (familyId: string, _tier: number) => {
      // Navigate to Labs view and open Learning Paths
      setCurrentView("labs");
      setShowLearningPaths(true);
      // Could be enhanced to navigate to specific family/tier content
      console.log(`Navigating to ${familyId} tier ${_tier}`);
    },
    [],
  );

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {/* Skip Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-nvidia-green focus:text-black focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        className={`bg-black border-b border-gray-800 px-6 py-4 transition-all duration-300 ${showLabWorkspace ? "ml-[600px]" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-nvidia-green rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-nvidia-green">
                  AI Infrastructure Simulator
                </h1>
                <p className="text-xs text-gray-400">
                  NCP-AII Certification Training Environment
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation controls */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
              <button
                onClick={isRunning ? stopSimulation : startSimulation}
                className={`p-2 rounded transition-colors ${
                  isRunning
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-nvidia-green hover:bg-nvidia-darkgreen text-black"
                }`}
                title={isRunning ? "Pause Simulation" : "Start Simulation"}
              >
                {isRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={resetSimulation}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-gray-700" />
              <button
                onClick={handleExport}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Export Cluster Config"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleImport}
                className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
                title="Import Cluster Config"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-nvidia-green">
                {cluster.name}
              </div>
              <div className="text-xs text-gray-400">
                {cluster.nodes.length} nodes •{" "}
                {cluster.nodes.reduce((sum, n) => sum + n.gpus.length, 0)} GPUs
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        role="tablist"
        aria-label="Main navigation"
        className={`bg-gray-800 border-b border-gray-700 px-6 transition-all duration-300 ${showLabWorkspace ? "ml-[600px]" : ""}`}
      >
        <div className="flex gap-1">
          <button
            role="tab"
            id="tab-simulator"
            aria-selected={currentView === "simulator"}
            aria-controls="panel-simulator"
            onClick={() => setCurrentView("simulator")}
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
            aria-selected={currentView === "labs"}
            aria-controls="panel-labs"
            data-testid="nav-labs"
            onClick={() => setCurrentView("labs")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors relative ${
              currentView === "labs"
                ? "border-nvidia-green text-nvidia-green"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span className="font-medium">Labs & Scenarios</span>
            {/* Review Notification Badge */}
            {dueReviewCount > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpacedReviewDrill(true);
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
            id="tab-reference"
            aria-selected={currentView === "reference"}
            aria-controls="panel-reference"
            onClick={() => setCurrentView("reference")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              currentView === "reference"
                ? "border-nvidia-green text-nvidia-green"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">Reference</span>
          </button>
          <button
            role="tab"
            id="tab-state"
            aria-selected={currentView === "state"}
            aria-controls="panel-state"
            onClick={() => setCurrentView("state")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              currentView === "state"
                ? "border-nvidia-green text-nvidia-green"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Database className="w-4 h-4" />
            <span className="font-medium">State Management</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        id="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${currentView}`}
        className={`flex-1 h-0 flex flex-col overflow-hidden transition-all duration-300 ${showLabWorkspace ? "ml-[600px]" : ""}`}
      >
        {currentView === "simulator" && (
          <SimulatorView className="flex-1 h-full" />
        )}

        {currentView === "labs" && (
          <LabsAndScenariosView
            onStartScenario={handleStartScenario}
            onBeginExam={handleBeginExam}
            onOpenLearningPaths={() => setShowLearningPaths(true)}
            onOpenStudyDashboard={() => setShowStudyDashboard(true)}
            onOpenExamGauntlet={() => setShowExamGauntlet(true)}
            learningProgress={learningProgress}
          />
        )}

        {currentView === "reference" && <ReferenceTab />}
        {currentView === "state" && <StateManagementTab />}
      </main>

      {/* Footer */}
      <footer
        className={`bg-black border-t border-gray-800 px-6 py-3 transition-all duration-300 ${showLabWorkspace ? "ml-[600px]" : ""}`}
      >
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>NVIDIA AI Infrastructure Certification Simulator v1.0</div>
          <div className="flex items-center gap-4">
            <span>Status: {isRunning ? "🟢 Running" : "🔴 Paused"}</span>
            <span>•</span>
            <span>NCP-AII Training Environment</span>
          </div>
        </div>
      </footer>

      {/* Lab Workspace Overlay */}
      {showLabWorkspace && (
        <LabWorkspace onClose={() => setShowLabWorkspace(false)} />
      )}

      {/* Exam Workspace Overlay */}
      {showExamWorkspace && (
        <ExamWorkspace onClose={() => setShowExamWorkspace(false)} />
      )}
      {/* Welcome Splash Screen */}
      {showWelcome && (
        <WelcomeScreen
          onClose={() => {
            localStorage.setItem("ncp-aii-welcome-dismissed", "true");
            setShowWelcome(false);
          }}
        />
      )}

      {/* Study Dashboard Modal */}
      {showStudyDashboard && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <StudyDashboard
              onClose={() => setShowStudyDashboard(false)}
              onStartExam={(mode) => {
                setShowStudyDashboard(false);
                if (mode === "full-practice" || mode === "quick-quiz") {
                  setShowExamWorkspace(true);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Learning Paths Modal */}
      {showLearningPaths && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
            <LearningPaths
              onClose={() => setShowLearningPaths(false)}
              onExecuteCommand={async (cmd) => {
                // Placeholder for command execution
                // Full terminal integration requires exposing Terminal's executeCommand
                return `Command executed: ${cmd}\n(Full terminal integration pending)`;
              }}
            />
          </div>
        </div>
      )}

      {/* Spaced Review Drill Modal */}
      {showSpacedReviewDrill && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <SpacedReviewDrill
            onComplete={() => setShowSpacedReviewDrill(false)}
            onSnooze={() => setShowSpacedReviewDrill(false)}
          />
        </div>
      )}

      {/* Exam Gauntlet Modal */}
      {showExamGauntlet && (
        <ExamGauntlet onExit={() => setShowExamGauntlet(false)} />
      )}

      {/* Tier Unlock Notifications */}
      <TierUnlockNotificationContainer
        onNavigateToTier={handleNavigateToTier}
      />
    </div>
  );
}

export default App;
