import { useState, useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import {
  X,
  ChevronRight,
  Check,
  HelpCircle,
  Clock,
  Lightbulb,
  CheckCircle,
  Circle,
  Eye,
  BookOpen,
} from "lucide-react";
import { HintManager } from "@/utils/hintManager";
import { commandTracker } from "@/utils/commandValidator";
import { getVisualizationContext } from "@/utils/scenarioVisualizationMap";

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
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const isSmallScreen = useMediaQuery("(max-width: 1279px)");

  // Initialize panel visibility based on screen size
  useEffect(() => {
    // Only auto-hide on component mount, not on resize
    setLabPanelVisible(!isSmallScreen);
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
            <h2 className="text-xl font-bold text-green-400">
              {activeScenario.title}
            </h2>
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
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

            <p className="text-gray-300 mb-4 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Objectives */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-green-400 mb-2">
                OBJECTIVES
              </h4>
              <ul className="space-y-2">
                {currentStep.objectives.map((objective, idx) => {
                  // Check if this objective has a corresponding validation rule
                  const ruleResult = currentValidation?.ruleResults?.[idx];
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
                        className={isPassed ? "text-gray-400 line-through" : ""}
                      >
                        {objective}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Validation Progress Indicator */}
            {validationConfig.enabled &&
              currentValidation &&
              !isStepCompleted && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3">
                    VALIDATION STATUS
                  </h4>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Progress</span>
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
                              {currentValidation.failedRules.length} more needed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

            {/* Expected Commands with Progress Tracking */}
            {currentStep.expectedCommands &&
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
                        commandTracker.getExecutedCommands([cmd]).length > 0;
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

            {/* Hints - Enhanced System */}
            {(hintEvaluation?.totalCount || 0) > 0 ? (
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
                      💡 Get Hint
                    </button>
                  )}
                </div>

                {/* Revealed Hints */}
                {(hintEvaluation?.revealedCount || 0) > 0 && (
                  <div className="space-y-3 mt-3">
                    {hintEvaluation?.allHints
                      .filter((hint) =>
                        currentStepProgress?.revealedHintIds.includes(hint.id),
                      )
                      .map((hint, idx) => {
                        const levelEmoji =
                          hint.level === 1
                            ? "💡"
                            : hint.level === 2
                              ? "🔍"
                              : "🎯";
                        return (
                          <div
                            key={hint.id}
                            className="bg-gray-900 rounded-lg p-3 border border-yellow-500/30"
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-400 text-lg">
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
                        <li>• After spending time on the step</li>
                        <li>• After failed validation attempts</li>
                        <li>• Based on commands you try</li>
                      </ul>
                      <p className="mt-2 text-yellow-400">
                        💡 Tip: Type{" "}
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
                      ⏳ More hints will unlock as you continue working on this
                      step.
                    </p>
                  )}

                {/* All hints revealed */}
                {(hintEvaluation?.revealedCount || 0) ===
                  (hintEvaluation?.totalCount || 0) &&
                  (hintEvaluation?.totalCount || 0) > 0 && (
                    <p className="text-xs text-green-400 mt-3">
                      ✓ All hints revealed! You've got this!
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
                  {legacyCurrentHintCount < legacyAvailableHints.length && (
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
            ) : null}

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
                      {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
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

          {/* Terminal Instructions */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-400 text-2xl">→</div>
              <div>
                <p className="text-sm font-semibold text-blue-300 mb-1">
                  Use the Terminal
                </p>
                <p className="text-xs text-gray-400">
                  Execute the commands shown above in the main terminal (on the
                  right side of the screen) to complete this step.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          {/* Step Status */}
          <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700">
            {isStepCompleted ? (
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm font-semibold">Step Completed!</span>
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
                            style={{ width: `${currentValidation.progress}%` }}
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
                      Execute the commands in the terminal to complete this step
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
                Exit Lab
                <X className="w-4 h-4" />
              </>
            ) : currentStepIndex < activeScenario.steps.length - 1 ? (
              <>
                {isStepCompleted ? "Next Step" : "Complete Step in Terminal"}
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Complete Lab
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Progress is automatically saved
          </p>
        </div>
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
