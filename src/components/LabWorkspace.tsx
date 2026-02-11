import { useState, useEffect, useMemo } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import {
  X,
  ChevronRight,
  ChevronDown,
  Check,
  HelpCircle,
  Clock,
  Lightbulb,
  CheckCircle,
  Circle,
  Eye,
  BookOpen,
  Lock,
  Wrench,
} from "lucide-react";
import { HintManager } from "@/utils/hintManager";
import { commandTracker } from "@/utils/commandValidator";
import { getVisualizationContext } from "@/utils/scenarioVisualizationMap";
import {
  isTierUnlocked,
  type TierProgressState,
} from "@/utils/tierProgressionEngine";
import commandFamiliesData from "@/data/commandFamilies.json";
import type { CommandFamily } from "@/types/commandFamilies";
import { NarrativeIntro } from "./NarrativeIntro";
import { InlineQuiz } from "./InlineQuiz";
import { NarrativeResolution } from "./NarrativeResolution";

interface LabWorkspaceProps {
  onClose: () => void;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Helper to get tier badge info
function getTierBadgeInfo(tier: 1 | 2 | 3 | undefined): {
  label: string;
  colorClass: string;
} {
  switch (tier) {
    case 1:
      return { label: "Guided", colorClass: "bg-green-600 text-white" };
    case 2:
      return { label: "Choice", colorClass: "bg-yellow-500 text-black" };
    case 3:
      return { label: "Realistic", colorClass: "bg-red-600 text-white" };
    default:
      return { label: "Standard", colorClass: "bg-gray-600 text-white" };
  }
}

// Get unlock requirement message for a tier
function getUnlockRequirementMessage(
  familyId: string,
  tier: 1 | 2 | 3,
): string {
  const familyNames: Record<string, string> = {
    "gpu-monitoring": "GPU Monitoring",
    "infiniband-tools": "InfiniBand Tools",
    "bmc-hardware": "BMC & Hardware",
    "cluster-tools": "Slurm Cluster Tools",
    "container-tools": "Container Tools",
    diagnostics: "Diagnostics & Testing",
  };
  const familyName = familyNames[familyId] || familyId;

  if (tier === 2) {
    return `Pass the ${familyName} quiz and use all tools to unlock`;
  } else if (tier === 3) {
    return `Complete Tier 2 with 80%+ accuracy and pass explanation gate`;
  }
  return "Complete prerequisite scenarios to unlock";
}

export function LabWorkspace({ onClose }: LabWorkspaceProps) {
  const {
    activeScenario,
    scenarioProgress,
    exitScenario,
    completeScenarioStep,
    revealHint: revealHintAction,
    stepValidation,
    validationConfig,
    setRequestedVisualizationView,
    labPanelVisible,
    setLabPanelVisible,
  } = useSimulationStore();

  // Learning progress store for tier unlock checks
  const learningProgress = useLearningProgressStore();

  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [toolHintsSidebarOpen, setToolHintsSidebarOpen] = useState(true);
  const isSmallScreen = useMediaQuery("(max-width: 1279px)");
  const [showNarrativeIntro, setShowNarrativeIntro] = useState(true);
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});

  // Get command families for tool hints
  const commandFamilies = useMemo(() => {
    return (commandFamiliesData as { families: CommandFamily[] }).families;
  }, []);

  // Get relevant tools for this scenario's command families
  const relevantTools = useMemo(() => {
    if (!activeScenario?.commandFamilies || !activeScenario.toolHints) {
      return [];
    }

    return commandFamilies
      .filter((family) => activeScenario.commandFamilies?.includes(family.id))
      .flatMap((family) =>
        family.tools.map((tool) => ({
          ...tool,
          familyName: family.name,
          familyIcon: family.icon,
        })),
      );
  }, [activeScenario, commandFamilies]);

  // Check if scenario is unlocked based on tier and progress
  const checkScenarioUnlocked = useMemo(() => {
    if (!activeScenario) return true;

    const tier = activeScenario.tier;
    if (!tier || tier === 1) return true; // Tier 1 always unlocked

    const families = activeScenario.commandFamilies || [];
    if (families.length === 0) return true; // No family requirement

    // Build TierProgressState from learning progress store
    const progressState: TierProgressState = {
      toolsUsed: learningProgress.toolsUsed,
      familyQuizScores: learningProgress.familyQuizScores,
      unlockedTiers: learningProgress.unlockedTiers,
      tierProgress: learningProgress.tierProgress,
      explanationGateResults: learningProgress.explanationGateResults,
    };

    // Check if tier is unlocked for at least one of the command families
    return families.some((familyId) =>
      isTierUnlocked(familyId, tier, progressState),
    );
  }, [activeScenario, learningProgress]);

  // Get the first locked family for showing unlock requirements
  const lockedFamilyInfo = useMemo(() => {
    if (!activeScenario || checkScenarioUnlocked) return null;

    const tier = activeScenario.tier;
    if (!tier || tier === 1) return null;

    const families = activeScenario.commandFamilies || [];
    if (families.length === 0) return null;

    return {
      familyId: families[0],
      tier,
      message: getUnlockRequirementMessage(families[0], tier),
    };
  }, [activeScenario, checkScenarioUnlocked]);

  // Initialize panel visibility based on screen size
  useEffect(() => {
    // Only auto-hide on component mount, not on resize
    setLabPanelVisible(!isSmallScreen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once on mount

  if (!activeScenario) {
    return null;
  }

  const progress = scenarioProgress[activeScenario.id];
  const currentStepIndex = progress?.currentStepIndex || 0;
  const currentStep = activeScenario.steps[currentStepIndex];
  const currentStepProgress = progress?.steps[currentStepIndex];

  // Get current validation result
  const validationKey = `${activeScenario.id}-${currentStep?.id}`;
  const currentValidation = stepValidation[validationKey];

  // Evaluate hints using HintManager
  const hintEvaluation = currentStepProgress
    ? HintManager.getAvailableHints(currentStep, currentStepProgress)
    : null;

  // Get visualization context for this scenario
  const visualizationContext = activeScenario
    ? getVisualizationContext(activeScenario.id)
    : null;

  const handleExit = () => {
    exitScenario();
    onClose();
  };

  const handleNextStep = () => {
    // If scenario is already completed, this button acts as Exit
    if (progress?.completed) {
      handleExit();
      return;
    }

    if (currentStepIndex < activeScenario.steps.length - 1) {
      completeScenarioStep(activeScenario.id, currentStep.id);
    } else {
      // Last step completed - just mark complete, don't exit yet to show success
      completeScenarioStep(activeScenario.id, currentStep.id);
    }
  };

  const revealNextHint = () => {
    if (hintEvaluation?.nextHint) {
      revealHintAction(
        activeScenario.id,
        currentStep.id,
        hintEvaluation.nextHint.id,
      );
    }
  };

  // Keep legacy hint system for backwards compatibility with local state
  const revealLegacyHint = (stepId: string) => {
    const currentHintCount = showHints[stepId] || 0;
    setShowHints({
      ...showHints,
      [stepId]: currentHintCount + 1,
    });
  };

  // Use enhanced hints if available, otherwise fall back to legacy
  const legacyCurrentHintCount = showHints[currentStep.id] || 0;
  const legacyAvailableHints = currentStep.hints || [];
  const isStepCompleted = currentStepProgress?.completed || false;
  const isNarrative = !!activeScenario.narrative;
  const currentStepType = currentStep?.stepType || "command";
  const isConceptStep = currentStepType === "concept";
  const isObserveStep = currentStepType === "observe";
  const isCommandStep = currentStepType === "command";
  const totalQuizzes = activeScenario.steps.filter(
    (s) => s.narrativeQuiz,
  ).length;
  const correctQuizzes = Object.values(quizResults).filter(Boolean).length;

  return (
    <>
      {/* Backdrop for small screens */}
      {isSmallScreen && labPanelVisible && (
        <div
          className="fixed inset-0 bg-black/70 z-30 transition-opacity duration-300 cursor-pointer"
          onClick={() => setLabPanelVisible(false)}
          title="Click to close lab guide"
        />
      )}

      {/* Lab Panel */}
      <div
        data-testid="lab-workspace"
        className={`fixed inset-y-0 left-0 z-40 w-[90vw] max-w-[500px] sm:w-[500px] lg:w-[600px] bg-gray-900 shadow-2xl flex flex-col border-r border-green-500 overflow-hidden transition-transform duration-300 ease-in-out ${
          isSmallScreen && !labPanelVisible
            ? "-translate-x-full"
            : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-green-400">
                {activeScenario.title}
              </h2>
              {/* Tier Badge */}
              {(() => {
                const tierInfo = getTierBadgeInfo(activeScenario.tier);
                return (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${tierInfo.colorClass}`}
                    title={`Tier ${activeScenario.tier || "Standard"}: ${tierInfo.label}`}
                  >
                    {tierInfo.label}
                  </span>
                );
              })()}
              {/* Lock indicator for locked scenarios */}
              {!checkScenarioUnlocked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-700 text-gray-400 text-xs">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {activeScenario.domain.toUpperCase()} •{" "}
              {activeScenario.difficulty} • {activeScenario.estimatedTime} min
            </p>
          </div>
          <button
            onClick={handleExit}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Exit Lab"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Step {currentStepIndex + 1} of {activeScenario.steps.length}
            </span>
            <span className="text-sm text-gray-400">
              {Math.round(
                ((currentStepIndex + 1) / activeScenario.steps.length) * 100,
              )}
              % Complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / activeScenario.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Lock Warning Banner */}
        {!checkScenarioUnlocked && lockedFamilyInfo && (
          <div className="bg-amber-900/30 border-b border-amber-600/50 px-6 py-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Scenario Locked
                </p>
                <p className="text-xs text-amber-200/80">
                  {lockedFamilyInfo.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tool Hints Sidebar (Tier 1 only) */}
        {activeScenario.tier === 1 &&
          activeScenario.toolHints &&
          relevantTools.length > 0 && (
            <div className="border-b border-gray-700">
              <button
                onClick={() => setToolHintsSidebarOpen(!toolHintsSidebarOpen)}
                className="w-full px-6 py-3 flex items-center justify-between bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-blue-300">
                  <Wrench className="w-4 h-4" />
                  <span className="text-sm font-semibold">Suggested Tools</span>
                  <span className="text-xs text-blue-400/70">
                    ({relevantTools.length} tools)
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-blue-400 transition-transform ${
                    toolHintsSidebarOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {toolHintsSidebarOpen && (
                <div className="px-6 py-4 bg-gray-800/50 max-h-60 overflow-y-auto">
                  <div className="space-y-3">
                    {relevantTools.map((tool, idx) => (
                      <div
                        key={`${tool.name}-${idx}`}
                        className="bg-gray-900 rounded-lg p-3 border border-gray-700"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{tool.familyIcon}</span>
                          <code className="text-sm font-mono text-green-400 font-semibold">
                            {tool.name}
                          </code>
                          <span className="text-xs text-gray-500">
                            ({tool.familyName})
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">
                          {tool.tagline} - {tool.description}
                        </p>
                        <p className="text-xs text-blue-300">
                          <span className="font-semibold">Best for:</span>{" "}
                          {tool.bestFor}
                        </p>
                        <div className="mt-2 text-xs">
                          <code className="bg-black px-2 py-1 rounded text-gray-300">
                            {tool.exampleCommand}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isNarrative && showNarrativeIntro && !progress?.completed ? (
            <NarrativeIntro
              title={activeScenario.title}
              narrative={activeScenario.narrative!}
              onBegin={() => setShowNarrativeIntro(false)}
            />
          ) : progress?.completed && isNarrative ? (
            <NarrativeResolution
              resolution={activeScenario.narrative!.resolution}
              quizScore={{ correct: correctQuizzes, total: totalQuizzes }}
              timeSpent={activeScenario.estimatedTime}
              onExit={handleExit}
            />
          ) : (
            <>
              {/* Current Step */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 text-black rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      {currentStepIndex + 1}
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {currentStep.title}
                    </h3>
                    {isConceptStep && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-600 text-white">
                        CONCEPT
                      </span>
                    )}
                    {isObserveStep && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                        OBSERVE
                      </span>
                    )}
                  </div>
                  {/* View in Visualization button */}
                  {visualizationContext && (
                    <button
                      onClick={() => {
                        const view =
                          visualizationContext.primaryView === "network"
                            ? "network"
                            : "topology";
                        setRequestedVisualizationView(view);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-900/50 text-purple-300 rounded hover:bg-purple-900 transition-colors"
                      title="View related visualization"
                    >
                      <Eye className="w-3 h-3" />
                      View in{" "}
                      {visualizationContext.primaryView === "network"
                        ? "InfiniBand Fabric"
                        : "NVLink Topology"}
                    </button>
                  )}
                </div>

                {isNarrative ? (
                  <>
                    {/* CONTEXT box for all narrative step types */}
                    <div className="bg-gray-800/50 border-l-4 border-indigo-500 p-4 mb-4 rounded-r-lg">
                      <p className="text-sm text-indigo-300 font-semibold mb-1">
                        {isConceptStep || isObserveStep
                          ? "CONTEXT"
                          : "SITUATION"}
                      </p>
                      <p className="text-gray-300 leading-relaxed">
                        {currentStep.description}
                      </p>
                    </div>

                    {/* Concept step: rich content + tips */}
                    {isConceptStep && currentStep.conceptContent && (
                      <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-purple-700/50">
                        <div className="text-gray-200 leading-relaxed whitespace-pre-line text-sm">
                          {currentStep.conceptContent}
                        </div>
                      </div>
                    )}
                    {isConceptStep &&
                      currentStep.tips &&
                      currentStep.tips.length > 0 && (
                        <div className="bg-gray-800/50 border-l-4 border-green-500 p-4 mb-4 rounded-r-lg">
                          <p className="text-sm text-green-400 font-semibold mb-2">
                            TIPS
                          </p>
                          <ul className="space-y-1">
                            {currentStep.tips.map((tip, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-gray-300 flex items-start gap-2"
                              >
                                <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Observe step: show command to review */}
                    {isObserveStep && currentStep.observeCommand && (
                      <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-blue-700/50">
                        <p className="text-sm text-blue-300 font-semibold mb-2">
                          COMMAND OUTPUT
                        </p>
                        <div className="font-mono text-sm bg-black rounded px-3 py-2 text-green-400 mb-3">
                          $ {currentStep.observeCommand}
                        </div>
                        <p className="text-xs text-gray-400">
                          Review the output above and click Continue when ready.
                        </p>
                      </div>
                    )}

                    {/* Continue button for concept/observe steps */}
                    {(isConceptStep || isObserveStep) && !isStepCompleted && (
                      <button
                        data-testid="concept-continue-btn"
                        onClick={() =>
                          completeScenarioStep(
                            activeScenario.id,
                            currentStep.id,
                          )
                        }
                        className="w-full px-4 py-3 rounded font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-2 mb-4"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* YOUR TASK box only for command steps */}
                    {isCommandStep && (
                      <div className="bg-nvidia-green/10 border-l-4 border-nvidia-green p-4 mb-4 rounded-r-lg">
                        <p className="text-sm text-nvidia-green font-semibold mb-1">
                          YOUR TASK
                        </p>
                        <p className="text-gray-200 leading-relaxed">
                          {currentStep.objectives[0]}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {currentStep.description}
                  </p>
                )}

                {/* Objectives (command steps only) */}
                {isCommandStep && (
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2">
                      OBJECTIVES
                    </h4>
                    <ul className="space-y-2">
                      {currentStep.objectives.map((objective, idx) => {
                        // Check if this objective has a corresponding validation rule
                        const ruleResult =
                          currentValidation?.ruleResults?.[idx];
                        const isPassed = ruleResult?.passed || false;

                        return (
                          <li
                            key={idx}
                            className="text-sm text-gray-300 flex items-start gap-2"
                          >
                            {isPassed ? (
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            )}
                            <span
                              className={
                                isPassed ? "text-gray-400 line-through" : ""
                              }
                            >
                              {objective}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Validation Progress Indicator (command steps only) */}
                {isCommandStep &&
                  validationConfig.enabled &&
                  currentValidation &&
                  !isStepCompleted && (
                    <div className="bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                      <h4 className="text-sm font-semibold text-blue-400 mb-3">
                        VALIDATION STATUS
                      </h4>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            Progress
                          </span>
                          <span className="text-xs font-mono text-gray-300">
                            {currentValidation.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              currentValidation.passed
                                ? "bg-green-500"
                                : currentValidation.progress > 0
                                  ? "bg-yellow-500"
                                  : "bg-gray-600"
                            }`}
                            style={{ width: `${currentValidation.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Feedback Message */}
                      {currentValidation.feedback && (
                        <div
                          className={`text-sm p-2 rounded ${
                            currentValidation.passed
                              ? "bg-green-900/30 text-green-300"
                              : currentValidation.progress > 0
                                ? "bg-amber-900/30 text-amber-300"
                                : "bg-amber-900/30 text-amber-300"
                          }`}
                        >
                          {currentValidation.feedback}
                        </div>
                      )}

                      {/* Rule Status Details */}
                      {currentValidation.ruleResults &&
                        currentValidation.ruleResults.length > 0 && (
                          <div className="mt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                {currentValidation.matchedRules.length} done
                              </span>
                              {currentValidation.failedRules.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Circle className="w-3 h-3 text-amber-500" />
                                  {currentValidation.failedRules.length} more
                                  needed
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                {/* Expected Commands with Progress Tracking (command steps only) */}
                {isCommandStep &&
                  currentStep.expectedCommands &&
                  currentStep.expectedCommands.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">
                        SUGGESTED COMMANDS (
                        {
                          commandTracker.getExecutedCommands(
                            currentStep.expectedCommands,
                          ).length
                        }
                        /{currentStep.expectedCommands.length})
                      </h4>
                      <div className="space-y-2">
                        {currentStep.expectedCommands.map((cmd, idx) => {
                          const isExecuted =
                            commandTracker.getExecutedCommands([cmd]).length >
                            0;
                          return (
                            <div key={idx} className="flex items-start gap-2">
                              {isExecuted ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                              )}
                              <div
                                className={`font-mono text-sm bg-black rounded px-3 py-2 flex-1 ${
                                  isExecuted
                                    ? "text-green-400 border border-green-900"
                                    : "text-gray-300"
                                }`}
                              >
                                {cmd}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {isStepCompleted && (
                        <div className="mt-3 text-xs text-green-400 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Step completed! You can proceed to the next step.
                        </div>
                      )}
                      {!isStepCompleted &&
                        commandTracker.getExecutedCommands(
                          currentStep.expectedCommands,
                        ).length > 0 && (
                          <div className="mt-3 text-xs text-yellow-400">
                            Try the suggested commands to complete this step.
                          </div>
                        )}
                    </div>
                  )}

                {/* Inline Quiz (narrative scenarios) — show for concept/observe
                    immediately, or for command steps once validation passes */}
                {isNarrative &&
                  currentStep.narrativeQuiz &&
                  (isStepCompleted ||
                    isConceptStep ||
                    isObserveStep ||
                    currentValidation?.passed) && (
                    <div className="mb-4">
                      <InlineQuiz
                        quiz={currentStep.narrativeQuiz}
                        onComplete={(correct) => {
                          setQuizResults((prev) => ({
                            ...prev,
                            [currentStep.id]: correct,
                          }));
                          // Advance to next step after quiz is answered
                          if (!isStepCompleted) {
                            completeScenarioStep(
                              activeScenario.id,
                              currentStep.id,
                            );
                          }
                        }}
                      />
                    </div>
                  )}

                {/* Hints - Enhanced System (command steps only) */}
                {isCommandStep &&
                  ((hintEvaluation?.totalCount || 0) > 0 ? (
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          HINTS ({hintEvaluation?.revealedCount}/
                          {hintEvaluation?.totalCount})
                        </h4>
                        {hintEvaluation?.nextHint && (
                          <button
                            onClick={revealNextHint}
                            className="text-xs bg-yellow-500 text-black hover:bg-yellow-400 px-3 py-1 rounded transition-colors font-medium"
                          >
                            Get Hint
                          </button>
                        )}
                      </div>

                      {/* Revealed Hints */}
                      {(hintEvaluation?.revealedCount || 0) > 0 && (
                        <div className="space-y-3 mt-3">
                          {hintEvaluation?.allHints
                            .filter((hint) =>
                              currentStepProgress?.revealedHintIds.includes(
                                hint.id,
                              ),
                            )
                            .map((hint, idx) => {
                              const levelEmoji =
                                hint.level === 1
                                  ? "L1"
                                  : hint.level === 2
                                    ? "L2"
                                    : "L3";
                              return (
                                <div
                                  key={hint.id}
                                  className="bg-gray-900 rounded-lg p-3 border border-yellow-500/30"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="text-yellow-400 text-xs font-bold">
                                      {levelEmoji}
                                    </span>
                                    <div className="flex-1">
                                      <div className="text-xs text-gray-400 mb-1">
                                        Hint {idx + 1} - Level {hint.level}
                                      </div>
                                      <p className="text-sm text-gray-200">
                                        {hint.message}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Hint Status Message */}
                      {(hintEvaluation?.revealedCount || 0) === 0 && (
                        <div className="mt-3 text-sm text-gray-400 flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="mb-2">
                              Hints will unlock as you work through this step:
                            </p>
                            <ul className="text-xs text-gray-500 space-y-1 ml-4">
                              <li>- After spending time on the step</li>
                              <li>- After failed validation attempts</li>
                              <li>- Based on commands you try</li>
                            </ul>
                            <p className="mt-2 text-yellow-400">
                              Tip: Type{" "}
                              <span className="font-mono bg-black px-1 rounded">
                                hint
                              </span>{" "}
                              in the terminal anytime!
                            </p>
                          </div>
                        </div>
                      )}

                      {/* No more hints available */}
                      {!hintEvaluation?.nextHint &&
                        (hintEvaluation?.revealedCount || 0) > 0 &&
                        (hintEvaluation?.revealedCount || 0) <
                          (hintEvaluation?.totalCount || 0) && (
                          <p className="text-xs text-gray-500 mt-3">
                            More hints will unlock as you continue working on
                            this step.
                          </p>
                        )}

                      {/* All hints revealed */}
                      {(hintEvaluation?.revealedCount || 0) ===
                        (hintEvaluation?.totalCount || 0) &&
                        (hintEvaluation?.totalCount || 0) > 0 && (
                          <p className="text-xs text-green-400 mt-3">
                            All hints revealed! You've got this!
                          </p>
                        )}
                    </div>
                  ) : legacyAvailableHints.length > 0 ? (
                    // Legacy Hints Fallback (for scenarios without enhanced hints)
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          HINTS ({legacyCurrentHintCount}/
                          {legacyAvailableHints.length})
                        </h4>
                        {legacyCurrentHintCount <
                          legacyAvailableHints.length && (
                          <button
                            onClick={() => revealLegacyHint(currentStep.id)}
                            className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                          >
                            Reveal Next Hint
                          </button>
                        )}
                      </div>
                      {legacyCurrentHintCount > 0 && (
                        <div className="space-y-2 mt-3">
                          {legacyAvailableHints
                            .slice(0, legacyCurrentHintCount)
                            .map((hint, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-gray-300 flex items-start gap-2"
                              >
                                <span className="text-yellow-400 font-bold">
                                  {idx + 1}.
                                </span>
                                <span>{hint}</span>
                              </div>
                            ))}
                        </div>
                      )}
                      {legacyCurrentHintCount === 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Click "Reveal Next Hint" if you need assistance.
                        </p>
                      )}
                    </div>
                  ) : null)}

                {/* Estimated Duration */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    Estimated time: ~{currentStep.estimatedDuration} minutes
                  </span>
                </div>
              </div>

              {/* All Steps Overview */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-gray-400 mb-4">
                  ALL STEPS
                </h4>
                <div className="space-y-2">
                  {activeScenario.steps.map((step, idx) => {
                    const stepProgress = progress?.steps[idx];
                    const isCompleted = stepProgress?.completed;
                    const isCurrent = idx === currentStepIndex;
                    const sType = step.stepType || "command";

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isCurrent
                            ? "bg-gray-800 border border-green-500"
                            : "bg-gray-800/50"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-green-500 text-black"
                              : isCurrent
                                ? "bg-green-500 text-black"
                                : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : sType === "concept" ? (
                            <BookOpen className="w-3 h-3" />
                          ) : sType === "observe" ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isCurrent
                              ? "text-white font-semibold"
                              : isCompleted
                                ? "text-gray-400"
                                : "text-gray-500"
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Learning Objectives */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-green-400 mb-3">
                  WHAT YOU'LL LEARN
                </h4>
                <ul className="space-y-2">
                  {activeScenario.learningObjectives.map((objective, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-300 flex items-start gap-2"
                    >
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Terminal Instructions (command steps only) */}
              {isCommandStep && (
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-400 text-2xl">→</div>
                    <div>
                      <p className="text-sm font-semibold text-blue-300 mb-1">
                        Use the Terminal
                      </p>
                      <p className="text-xs text-gray-400">
                        Execute the commands shown above in the main terminal
                        (on the right side of the screen) to complete this step.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Action Buttons - hidden during narrative intro/resolution */}
        {!(isNarrative && showNarrativeIntro && !progress?.completed) &&
          !(progress?.completed && isNarrative) && (
            <div className="border-t border-gray-700 p-4 bg-gray-800">
              {/* Step Status */}
              <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700">
                {isStepCompleted ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-semibold">
                      Step Completed!
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-yellow-400">
                    <Clock className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">In Progress</div>
                      {validationConfig.enabled && currentValidation ? (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  currentValidation.progress > 70
                                    ? "bg-green-500"
                                    : currentValidation.progress > 30
                                      ? "bg-yellow-500"
                                      : "bg-blue-500"
                                }`}
                                style={{
                                  width: `${currentValidation.progress}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              {currentValidation.progress}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {currentValidation.matchedRules.length} of{" "}
                            {currentValidation.matchedRules.length +
                              currentValidation.failedRules.length}{" "}
                            requirements met
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">
                          Execute the commands in the terminal to complete this
                          step
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleNextStep}
                disabled={!isStepCompleted}
                className={`w-full px-4 py-3 rounded font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isStepCompleted
                    ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
                }`}
              >
                {progress?.completed ? (
                  <>
                    {isNarrative ? "View Mission Summary" : "Exit Lab"}
                    <X className="w-4 h-4" />
                  </>
                ) : currentStepIndex < activeScenario.steps.length - 1 ? (
                  <>
                    {isStepCompleted
                      ? "Next Step"
                      : "Complete Step in Terminal"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {isNarrative ? "Complete Mission" : "Complete Lab"}
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Progress is automatically saved
              </p>
            </div>
          )}
      </div>

      {/* Floating Toggle Button - Only on small screens when panel is hidden */}
      {isSmallScreen && !labPanelVisible && (
        <button
          onClick={() => setLabPanelVisible(true)}
          className="fixed left-4 bottom-4 z-50 bg-green-500 hover:bg-green-600 text-black p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2"
          title="Show Lab Instructions"
        >
          <BookOpen className="w-5 h-5" />
          <span className="font-semibold">Lab Guide</span>
        </button>
      )}
    </>
  );
}
