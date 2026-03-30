import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { SimulatorView } from "./components/SimulatorView";
import { WelcomeScreen } from "./components/WelcomeScreen";

// Lazy-loaded views (not needed on the default Simulator tab)
const LabsAndScenariosView = lazy(() =>
  import("./components/LabsAndScenariosView").then((m) => ({
    default: m.LabsAndScenariosView,
  })),
);
const ExamsView = lazy(() =>
  import("./components/ExamsView").then((m) => ({ default: m.ExamsView })),
);
const LabWorkspace = lazy(() =>
  import("./components/LabWorkspace").then((m) => ({
    default: m.LabWorkspace,
  })),
);
const ExamWorkspace = lazy(() =>
  import("./components/ExamWorkspace").then((m) => ({
    default: m.ExamWorkspace,
  })),
);
const Documentation = lazy(() =>
  import("./components/Documentation").then((m) => ({
    default: m.Documentation,
  })),
);
const About = lazy(() =>
  import("./components/About").then((m) => ({ default: m.About })),
);
const IncidentWorkspace = lazy(() =>
  import("./components/IncidentWorkspace").then((m) => ({
    default: m.IncidentWorkspace,
  })),
);
const AfterActionReview = lazy(() =>
  import("./components/AfterActionReview").then((m) => ({
    default: m.AfterActionReview,
  })),
);
import { ConfirmModal } from "./components/ConfirmModal";
import { MissionBriefing } from "./components/MissionBriefing";
import { MissionModeBar } from "./components/MissionModeBar";
import { NarrativeResolution } from "./components/NarrativeResolution";
import { StudyDashboard } from "./components/StudyDashboard";
import { SpacedReviewDrill } from "./components/SpacedReviewDrill";
import { TierUnlockNotificationContainer } from "./components/TierUnlockNotification";
import { FaultToastContainer } from "./components/FaultToast";
import { SyncToast } from "./components/SyncToast";
import { AuthToast } from "./components/AuthToast";
import { ExamGauntlet } from "./components/ExamGauntlet";
import { WhichToolQuiz } from "./components/WhichToolQuiz";
import { ToolMasteryQuiz } from "./components/ToolMasteryQuiz";
import { XIDDrillQuiz } from "./components/XIDDrillQuiz";
import { useSimulationStore } from "./store/simulationStore";
import { useLearningProgressStore } from "./store/learningProgressStore";
import { useMetricsSimulation } from "./hooks/useMetricsSimulation";
import { useIncidentSession } from "./hooks/useIncidentSession";
import { initializeScenario } from "./utils/scenarioLoader";
import { AppHeader, type View } from "./components/AppHeader";
import { SpotlightTour } from "./components/SpotlightTour";
import { TOUR_STEPS, type TourId } from "./data/tourSteps";
import { useCloudSync } from "./hooks/useCloudSync";
import { getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

const ViewFallback = () => (
  <div className="flex-1 flex items-center justify-center text-gray-500">
    Loading...
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<View>("simulator");
  const [showLabWorkspace, setShowLabWorkspace] = useState(false);
  const [showExamWorkspace, setShowExamWorkspace] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem("ncp-aii-welcome-dismissed") !== "true",
  );
  const [showStudyDashboard, setShowStudyDashboard] = useState(false);
  const [showSpacedReviewDrill, setShowSpacedReviewDrill] = useState(false);
  const [showExamGauntlet, setShowExamGauntlet] = useState(false);
  const [activeToolQuiz, setActiveToolQuiz] = useState<string | null>(null);
  const [activeMasteryQuiz, setActiveMasteryQuiz] = useState<string | null>(
    null,
  );
  const [examMode, setExamMode] = useState<string | undefined>(undefined);
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [smallScreenDismissed, setSmallScreenDismissed] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const { syncStatus, isLoggedIn, manualRetry } = useCloudSync();
  const [userEmail, setUserEmail] = useState<string>();

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user.signInDetails?.loginId);
      } catch {
        setUserEmail(undefined);
      }
    };
    fetchEmail();
    return Hub.listen("auth", () => fetchEmail());
  }, []);

  // Get due reviews count from learning progress store
  const dueReviews = useLearningProgressStore((state) => state.getDueReviews());
  const dueReviewCount = dueReviews.length;

  // Get XID diagnostics unlocked tier for XIDDrillQuiz
  const xidUnlockedTier = useLearningProgressStore(
    (state) => (state.unlockedTiers["xid-diagnostics"] || 1) as 1 | 2 | 3,
  );

  const {
    cluster,
    isRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
    activeScenario,
    scenarioProgress,
    exitScenario,
    quizResults,
    completeScenarioStep,
  } = useSimulationStore();

  // Narrative modal state for active scenarios
  const [showNarrativeIntro, setShowNarrativeIntro] = useState(true);
  const [showDashboardSlideOver, setShowDashboardSlideOver] = useState(false);
  const scenarioProgressData = activeScenario
    ? scenarioProgress[activeScenario.id]
    : undefined;
  const isNarrative = !!activeScenario?.narrative;

  // Compute quiz score from store for NarrativeResolution
  const quizScore = activeScenario
    ? {
        correct: Object.values(quizResults).filter(Boolean).length,
        total: activeScenario.steps.filter((s) => s.narrativeQuiz).length,
      }
    : { correct: 0, total: 0 };

  // Reset narrative intro when a new scenario starts
  useEffect(() => {
    if (activeScenario) {
      setShowNarrativeIntro(true);
      setShowDashboardSlideOver(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally track by ID, not object reference
  }, [activeScenario?.id]);

  // Activate metrics simulation when running
  useMetricsSimulation(isRunning);

  // Incident session orchestrator
  const incidentSession = useIncidentSession();
  const {
    incidentState,
    situation: incidentSituation,
    workflowPhases,
    reviewData,
    rootCauseOptions,
    diagnosticPath,
    startIncident,
    submitDiagnosis,
    abandonIncident,
    requestHint,
  } = incidentSession;
  // incidentSession.recordCommand is available for Terminal integration (Task 15)

  // One-time cleanup of deprecated learning path localStorage keys
  useEffect(() => {
    localStorage.removeItem("ncp-aii-completed-lessons");
    localStorage.removeItem("ncp-aii-completed-modules");
    localStorage.removeItem("ncp-aii-lesson-progress");
  }, []);

  // Start tour for the current tab (called by Tour button)
  const handleStartTour = useCallback(() => {
    const tourIdMap: Record<View, TourId> = {
      simulator: "simulator",
      labs: "labs",
      reference: "docs",
      exams: "exams",
      about: "about",
    };
    const tourId = tourIdMap[currentView];
    if (tourId) setActiveTour(tourId);
  }, [currentView]);

  const handleTourComplete = useCallback(() => {
    if (activeTour) {
      localStorage.setItem(`ncp-aii-tour-${activeTour}-seen`, "true");
    }
    setActiveTour(null);
  }, [activeTour]);

  const handleStartScenario = async (scenarioId: string) => {
    const success = await initializeScenario(scenarioId);
    if (success) {
      setCurrentView("simulator");
      setShowLabWorkspace(true);
    }
  };

  const handleAbortMission = useCallback(() => {
    setShowAbortConfirm(true);
  }, []);

  const confirmAbortMission = useCallback(() => {
    setShowAbortConfirm(false);
    exitScenario();
    setShowLabWorkspace(false);
    setShowDashboardSlideOver(false);
  }, [exitScenario]);

  // Mission Mode derivations
  const isMissionMode =
    activeScenario != null &&
    !showNarrativeIntro &&
    !scenarioProgressData?.completed;

  const missionProgress = activeScenario
    ? scenarioProgress[activeScenario.id]
    : undefined;
  const missionStepIndex = missionProgress?.currentStepIndex ?? 0;

  // Check if the current step has faults that visually affect the dashboard
  const DASHBOARD_FAULT_TYPES = new Set([
    "xid-error",
    "thermal",
    "ecc-error",
    "nvlink-failure",
    "gpu-hang",
    "power",
    "memory-full",
    "driver-error",
    "pcie-error",
    "allocate-job",
    "set-slurm-state",
    "add-node",
  ]);
  const currentStepFaults = activeScenario?.steps[missionStepIndex]?.autoFaults;
  const scenarioFaults = activeScenario?.faults;
  const hasDashboardUpdate =
    !!currentStepFaults?.some((f) => DASHBOARD_FAULT_TYPES.has(f.type)) ||
    !!scenarioFaults?.some((f) => DASHBOARD_FAULT_TYPES.has(f.type));

  const handleStartIncident = useCallback(
    (difficulty: string, domain?: number) => {
      startIncident(difficulty, domain);
      setCurrentView("simulator");
    },
    [startIncident],
  );

  const handleBeginExam = (mode?: string) => {
    setExamMode(mode);
    setCurrentView("simulator");
    setShowExamWorkspace(true);
  };

  const handleOpenToolQuiz = (familyId: string) => {
    setActiveToolQuiz(familyId);
  };

  const handleCloseToolQuiz = (passed?: boolean, score?: number) => {
    if (activeToolQuiz && passed !== undefined && score !== undefined) {
      useLearningProgressStore
        .getState()
        .completeQuiz(activeToolQuiz, passed, score);
    }
    setActiveToolQuiz(null);
  };

  const handleOpenMasteryQuiz = (familyId: string) => {
    setActiveMasteryQuiz(familyId);
  };

  const handleCloseMasteryQuiz = (
    passed?: boolean,
    score?: number,
    totalQuestions?: number,
  ) => {
    if (
      activeMasteryQuiz &&
      passed !== undefined &&
      score !== undefined &&
      totalQuestions !== undefined
    ) {
      useLearningProgressStore
        .getState()
        .completeMasteryQuiz(activeMasteryQuiz, passed, score, totalQuestions);
    }
    setActiveMasteryQuiz(null);
  };

  // Handler for tier unlock notification "Try Now" button
  const handleNavigateToTier = useCallback(
    (_familyId: string, _tier: number) => {
      setCurrentView("labs");
    },
    [],
  );

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {isMissionMode ? (
        <>
          {/* Mission Mode layout: slim bar + instruction panel + terminal */}
          <MissionModeBar
            title={activeScenario!.title}
            currentStep={missionStepIndex}
            totalSteps={activeScenario!.steps.length}
            tier={activeScenario!.tier}
            onAbort={handleAbortMission}
            onToggleDashboard={() => setShowDashboardSlideOver((v) => !v)}
            isDashboardActive={showDashboardSlideOver}
            hasDashboardUpdate={hasDashboardUpdate && !showDashboardSlideOver}
          />
          <SimulatorView
            className="flex-1 h-full"
            missionMode={true}
            showDashboard={showDashboardSlideOver}
          />
        </>
      ) : (
        <>
          <AppHeader
            currentView={currentView}
            onViewChange={setCurrentView}
            cluster={cluster}
            isRunning={isRunning}
            onStartSimulation={startSimulation}
            onStopSimulation={stopSimulation}
            onResetSimulation={resetSimulation}
            onStartTour={handleStartTour}
            dueReviewCount={dueReviewCount}
            onReviewClick={() => setShowSpacedReviewDrill(true)}
            isLoggedIn={isLoggedIn}
            syncStatus={syncStatus}
            userEmail={userEmail}
            smallScreenDismissed={smallScreenDismissed}
            onDismissSmallScreen={() => setSmallScreenDismissed(true)}
            sidebarOpen={
              (showLabWorkspace && !activeScenario) ||
              incidentState === "active"
            }
          />

          {/* Main Content */}
          <main
            id="main-content"
            role="tabpanel"
            aria-labelledby={`tab-${currentView}`}
            className={`flex-1 h-0 flex flex-col overflow-hidden transition-all duration-300 ${(showLabWorkspace && !activeScenario) || incidentState === "active" ? "xl:ml-[clamp(340px,30vw,560px)]" : ""}`}
          >
            {currentView === "simulator" && (
              <SimulatorView className="flex-1 h-full" />
            )}

            <Suspense fallback={<ViewFallback />}>
              {currentView === "labs" && (
                <LabsAndScenariosView
                  onStartScenario={handleStartScenario}
                  onStartIncident={handleStartIncident}
                />
              )}

              {currentView === "exams" && (
                <ExamsView
                  onBeginExam={handleBeginExam}
                  onOpenExamGauntlet={() => setShowExamGauntlet(true)}
                  onOpenToolQuiz={handleOpenToolQuiz}
                  onOpenMasteryQuiz={handleOpenMasteryQuiz}
                />
              )}

              {currentView === "reference" && <Documentation />}

              {currentView === "about" && <About />}
            </Suspense>
          </main>

          {/* Footer */}
          <footer
            className={`bg-black border-t border-gray-800 px-6 py-3 transition-all duration-300 ${(showLabWorkspace && !activeScenario) || incidentState === "active" ? "xl:ml-[clamp(340px,30vw,560px)]" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-400">
              <div className="whitespace-nowrap">
                v{import.meta.env.VITE_APP_VERSION}
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${isRunning ? "bg-green-500" : "bg-gray-600"}`}
                  />
                  <span className="hidden sm:inline">
                    {isRunning ? "Running" : "Idle"}
                  </span>
                </span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="hidden sm:inline">
                  NCP-AII Training Environment
                </span>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-600 mt-1">
              Not affiliated with or endorsed by NVIDIA Corporation. All NVIDIA
              trademarks are property of NVIDIA Corporation. For educational use
              only.
            </div>
          </footer>

          {/* Lab Workspace Overlay — hidden during active scenarios (MissionCard takes over) */}
          <Suspense fallback={null}>
            {showLabWorkspace && !activeScenario && (
              <LabWorkspace onClose={() => setShowLabWorkspace(false)} />
            )}
          </Suspense>
        </>
      )}

      {/* Mission Briefing (replaces NarrativeIntro for narrative missions) */}
      {activeScenario &&
        isNarrative &&
        showNarrativeIntro &&
        !scenarioProgressData?.completed && (
          <MissionBriefing
            title={activeScenario.title}
            narrative={activeScenario.narrative!}
            tier={activeScenario.tier}
            estimatedTime={activeScenario.estimatedTime}
            onBegin={() => setShowNarrativeIntro(false)}
            skippable={activeScenario.skippable}
            onSkip={() => {
              activeScenario.steps.forEach((step) => {
                completeScenarioStep(activeScenario.id, step.id);
              });
              setShowNarrativeIntro(false);
            }}
          />
        )}

      {/* Narrative Resolution Modal (missions) */}
      {activeScenario && isNarrative && scenarioProgressData?.completed && (
        <NarrativeResolution
          resolution={activeScenario.narrative!.resolution}
          quizScore={quizScore}
          timeSpent={activeScenario.estimatedTime}
          onExit={() => {
            exitScenario();
            setShowLabWorkspace(false);
          }}
        />
      )}

      {/* Exam Workspace Overlay */}
      <Suspense fallback={null}>
        {showExamWorkspace && (
          <ExamWorkspace
            mode={examMode}
            onClose={() => {
              setShowExamWorkspace(false);
              setExamMode(undefined);
            }}
          />
        )}
      </Suspense>

      {/* Incident Workspace Overlay */}
      {incidentState === "active" && (
        <Suspense fallback={null}>
          <IncidentWorkspace
            situation={incidentSituation}
            phaseHistory={workflowPhases}
            rootCauseOptions={rootCauseOptions}
            diagnosticPath={diagnosticPath}
            onSubmitDiagnosis={submitDiagnosis}
            onRequestHint={requestHint}
            onClose={abandonIncident}
          />
        </Suspense>
      )}

      {/* After-Action Review Overlay */}
      {incidentState === "review" && reviewData && (
        <Suspense fallback={null}>
          <AfterActionReview
            score={reviewData.score}
            correctDiagnosis={reviewData.correctDiagnosis}
            selectedRootCause={reviewData.selectedRootCause}
            correctRootCause={reviewData.correctRootCause}
            events={reviewData.events}
            commands={reviewData.commands}
            tip={reviewData.tip}
            onReviewOptimalPath={() => {
              /* TODO: launch as guided scenario */
            }}
            onRestart={() =>
              handleStartIncident(reviewData.difficulty, reviewData.domain)
            }
            onClose={abandonIncident}
          />
        </Suspense>
      )}

      {/* Spotlight Tour */}
      {activeTour && !showWelcome && (
        <SpotlightTour
          steps={TOUR_STEPS[activeTour]}
          onComplete={handleTourComplete}
        />
      )}

      {/* Welcome Splash Screen */}
      {showWelcome && (
        <WelcomeScreen
          onClose={() => {
            localStorage.setItem("ncp-aii-welcome-dismissed", "true");
            setShowWelcome(false);
            // Auto-start the simulator tour for first-time users
            if (
              localStorage.getItem("ncp-aii-tour-simulator-seen") !== "true"
            ) {
              setTimeout(() => setActiveTour("simulator"), 600);
            }
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

      {/* Tool Quiz Modal */}
      {activeToolQuiz &&
        (activeToolQuiz === "xid-diagnostics" ? (
          <XIDDrillQuiz
            tier={xidUnlockedTier}
            onComplete={(passed, score, totalQuestions) => {
              if (xidUnlockedTier === 1) {
                useLearningProgressStore
                  .getState()
                  .completeQuiz(activeToolQuiz, passed, score);
              } else {
                useLearningProgressStore
                  .getState()
                  .completeMasteryQuiz(
                    activeToolQuiz,
                    passed,
                    score,
                    totalQuestions,
                  );
              }
              setActiveToolQuiz(null);
            }}
            onClose={() => setActiveToolQuiz(null)}
          />
        ) : (
          <WhichToolQuiz
            familyId={activeToolQuiz}
            onComplete={(passed, score) => handleCloseToolQuiz(passed, score)}
            onClose={() => setActiveToolQuiz(null)}
          />
        ))}

      {/* Deep Mastery Quiz Modal */}
      {activeMasteryQuiz && (
        <ToolMasteryQuiz
          familyId={activeMasteryQuiz}
          onComplete={(passed, score, totalQuestions) =>
            handleCloseMasteryQuiz(passed, score, totalQuestions)
          }
          onClose={() => setActiveMasteryQuiz(null)}
        />
      )}

      {/* Tier Unlock Notifications */}
      <TierUnlockNotificationContainer
        onNavigateToTier={handleNavigateToTier}
      />

      {/* Fault Injection Toast Notifications */}
      <FaultToastContainer />

      {/* Cloud Sync Toast Notifications */}
      <SyncToast onRetry={manualRetry} />

      {/* Auth Toast Notifications */}
      <AuthToast />

      {/* Abort Mission Confirm Modal */}
      <ConfirmModal
        isOpen={showAbortConfirm}
        title="Abort Mission"
        message="Abort this mission? Your progress on the current step will be lost."
        confirmLabel="Abort"
        cancelLabel="Continue Mission"
        onConfirm={confirmAbortMission}
        onCancel={() => setShowAbortConfirm(false)}
      />
    </div>
  );
}

export default App;
