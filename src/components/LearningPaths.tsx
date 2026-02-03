/**
 * Learning Paths Component - Interactive guided learning for NCP-AII certification
 *
 * Provides structured curricula with modules, lessons, and step-by-step tutorials.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LEARNING_PATHS,
  getNextLesson,
  calculatePathProgress,
  areLessonPrerequisitesMet,
  areModulePrerequisitesMet,
  validateCommand,
  getTotalPathStats,
  type LearningPath,
  type Module,
  type Lesson,
  type PathProgress,
} from '../utils/learningPathEngine';
import { DOMAINS, type DomainId } from '@/types/scenarios';
import { useLearningStore } from '@/store/learningStore';
import { useDebouncedStorage } from '@/hooks/useDebouncedStorage';

interface LearningPathsProps {
  onClose?: () => void;
  onExecuteCommand?: (command: string) => Promise<string>;
  onStartScenario?: (scenarioId: string) => void;
}

type ViewState = 'paths' | 'modules' | 'lessons' | 'tutorial';

export const LearningPaths: React.FC<LearningPathsProps> = ({
  onClose,
  onExecuteCommand,
}) => {
  // Navigation state
  const [viewState, setViewState] = useState<ViewState>('paths');
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Tutorial state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [commandInput, setCommandInput] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [stepFeedback, setStepFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Progress state
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [lessonProgress, setLessonProgress] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [pathsProgress, setPathsProgress] = useState<Map<string, PathProgress>>(new Map());

  // Learning store integration
  const { trackCommand } = useLearningStore();

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedLessons = localStorage.getItem('ncp-aii-completed-lessons');
    const savedModules = localStorage.getItem('ncp-aii-completed-modules');
    const savedLessonProgress = localStorage.getItem('ncp-aii-lesson-progress');

    if (savedLessons) {
      setCompletedLessons(new Set(JSON.parse(savedLessons)));
    }
    if (savedModules) {
      setCompletedModules(new Set(JSON.parse(savedModules)));
    }
    if (savedLessonProgress) {
      const parsed = JSON.parse(savedLessonProgress);
      setLessonProgress(new Map(Object.entries(parsed)));
    }
  }, []);

  // Save progress to localStorage with debouncing to prevent UI blocking
  // Memoize values to ensure stable references for the debounced storage hook
  const completedLessonsArray = useMemo(() => [...completedLessons], [completedLessons]);
  const completedModulesArray = useMemo(() => [...completedModules], [completedModules]);
  const lessonProgressObject = useMemo(() => Object.fromEntries(lessonProgress), [lessonProgress]);

  useDebouncedStorage('ncp-aii-completed-lessons', completedLessonsArray, 500);
  useDebouncedStorage('ncp-aii-completed-modules', completedModulesArray, 500);
  useDebouncedStorage('ncp-aii-lesson-progress', lessonProgressObject, 500);

  // Calculate path progress when completed lessons change
  useEffect(() => {
    const newPathsProgress = new Map<string, PathProgress>();
    Object.values(LEARNING_PATHS).forEach(path => {
      newPathsProgress.set(path.id, calculatePathProgress(path.id, completedLessons));
    });
    setPathsProgress(newPathsProgress);
  }, [completedLessons]);

  // Mark lesson as complete
  const completeLesson = useCallback((lessonId: string, moduleId: string) => {
    setCompletedLessons(prev => {
      const updated = new Set(prev);
      updated.add(lessonId);
      return updated;
    });

    // Check if module is complete
    if (selectedModule) {
      const allLessonsComplete = selectedModule.lessons.every(
        l => completedLessons.has(l.id) || l.id === lessonId
      );
      if (allLessonsComplete) {
        setCompletedModules(prev => {
          const updated = new Set(prev);
          updated.add(moduleId);
          return updated;
        });
      }
    }
  }, [selectedModule, completedLessons]);

  // Reset all progress
  const resetProgress = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      setCompletedLessons(new Set());
      setCompletedModules(new Set());
      setLessonProgress(new Map());
      localStorage.removeItem('ncp-aii-completed-lessons');
      localStorage.removeItem('ncp-aii-completed-modules');
      localStorage.removeItem('ncp-aii-lesson-progress');
    }
  }, []);

  // Handle command submission in tutorial
  const handleCommandSubmit = async () => {
    if (!selectedLesson || !commandInput.trim()) return;

    const currentStep = selectedLesson.steps[currentStepIndex];
    if (currentStep.type !== 'command') return;

    // Validate command
    const result = validateCommand(commandInput, currentStep);
    setStepFeedback({ message: result.message, success: result.valid });

    // Execute command if we have a handler
    if (onExecuteCommand) {
      try {
        const output = await onExecuteCommand(commandInput);
        setCommandOutput(output);
        trackCommand(commandInput.split(' ')[0], result.valid);
      } catch (error) {
        setCommandOutput(`Error: ${error}`);
      }
    }

    // If successful, auto-advance after a delay
    if (result.valid) {
      setTimeout(() => {
        if (currentStepIndex < selectedLesson.steps.length - 1) {
          advanceStep();
        } else {
          // Lesson complete
          completeLesson(selectedLesson.id, selectedModule?.id || '');
        }
      }, 2000);
    }
  };

  // Handle quiz answer
  const handleQuizSubmit = () => {
    if (!selectedLesson || quizAnswer === null) return;

    const currentStep = selectedLesson.steps[currentStepIndex];
    if (currentStep.type !== 'quiz' || currentStep.quizCorrectIndex === undefined) return;

    setShowQuizResult(true);

    // Auto-advance after showing result
    setTimeout(() => {
      if (currentStepIndex < selectedLesson.steps.length - 1) {
        advanceStep();
      } else {
        completeLesson(selectedLesson.id, selectedModule?.id || '');
      }
    }, 3000);
  };

  // Advance to next step
  const advanceStep = () => {
    setCurrentStepIndex(prev => prev + 1);
    setCommandInput('');
    setCommandOutput('');
    setStepFeedback(null);
    setQuizAnswer(null);
    setShowQuizResult(false);
  };

  // Go back to previous step
  const goBackStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setCommandInput('');
      setCommandOutput('');
      setStepFeedback(null);
      setQuizAnswer(null);
      setShowQuizResult(false);
    }
  };

  // Navigate to a specific path
  const selectPath = (path: LearningPath) => {
    setSelectedPath(path);
    setViewState('modules');
  };

  // Navigate to a specific module
  const selectModule = (module: Module) => {
    if (!areModulePrerequisitesMet(module.id, completedModules)) {
      alert('Please complete the prerequisite modules first.');
      return;
    }
    setSelectedModule(module);
    setViewState('lessons');
  };

  // Start a lesson
  const startLesson = (lesson: Lesson) => {
    if (!areLessonPrerequisitesMet(lesson.id, completedLessons)) {
      alert('Please complete the prerequisite lessons first.');
      return;
    }
    setSelectedLesson(lesson);
    setCurrentStepIndex(0);
    setViewState('tutorial');
    setCommandInput('');
    setCommandOutput('');
    setStepFeedback(null);
  };

  // Go back navigation
  const goBack = () => {
    switch (viewState) {
      case 'tutorial':
        setViewState('lessons');
        setSelectedLesson(null);
        break;
      case 'lessons':
        setViewState('modules');
        setSelectedModule(null);
        break;
      case 'modules':
        setViewState('paths');
        setSelectedPath(null);
        break;
      default:
        break;
    }
  };

  // Get recommended next lesson
  const recommendedNext = getNextLesson(completedLessons, completedModules);

  // Overall stats
  const totalStats = getTotalPathStats();

  // Render current step in tutorial
  const renderTutorialStep = () => {
    if (!selectedLesson) return null;

    const step = selectedLesson.steps[currentStepIndex];
    const progress = Math.round(((currentStepIndex + 1) / selectedLesson.steps.length) * 100);

    return (
      <div className="flex flex-col h-full min-h-[500px]">
        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between mb-2">
            <span className="text-nvidia-green font-bold text-sm">
              Step {currentStepIndex + 1} of {selectedLesson.steps.length}
            </span>
            <span className="text-gray-500 text-sm">{selectedLesson.title}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-nvidia-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 bg-gray-800 rounded-lg p-6 mb-5 overflow-auto">
          <h3 className="m-0 mb-4 text-white text-xl">{step.title}</h3>

          {/* Step type badge */}
          <div className="inline-block px-3 py-1 bg-gray-700 rounded text-xs text-gray-400 mb-5">
            {step.type === 'concept' && '📖 Concept'}
            {step.type === 'command' && '💻 Hands-On'}
            {step.type === 'quiz' && '❓ Quiz'}
            {step.type === 'observe' && '👁️ Observe'}
            {step.type === 'practice' && '🔧 Practice'}
          </div>

          {/* Main content */}
          <div className="text-gray-300 text-base leading-7 mb-5">
            {step.content.split('\n').map((line, i) => (
              <p key={i} className="my-2">{line}</p>
            ))}
          </div>

          {/* Tips if any */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-green-900/30 border border-green-800 rounded-md p-4 mb-5 text-sm">
              <strong>💡 Tips:</strong>
              <ul className="mt-2.5 mb-0 pl-5 text-gray-400">
                {step.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Command input for 'command' type */}
          {step.type === 'command' && (
            <div className="mt-5">
              <div className="flex items-center bg-black rounded-md p-1 mb-2.5">
                <span className="text-nvidia-green font-mono text-base px-2.5 font-bold">$</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
                  placeholder="Type your command here..."
                  className="flex-1 bg-transparent border-none text-white font-mono text-sm p-2.5 outline-none"
                  autoFocus
                />
                <button onClick={handleCommandSubmit} className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
                  Execute
                </button>
              </div>

              {step.commandHint && (
                <div className="text-gray-500 text-sm mb-4">
                  💡 Hint: {step.commandHint}
                </div>
              )}

              {/* Command output */}
              {commandOutput && (
                <div className="bg-black rounded-md p-4 mb-4 max-h-52 overflow-auto">
                  <pre className="m-0 text-gray-300 font-mono text-sm whitespace-pre-wrap">{commandOutput}</pre>
                </div>
              )}

              {/* Feedback */}
              {stepFeedback && (
                <div className={`p-4 rounded-md border text-sm ${stepFeedback.success ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                  {stepFeedback.success ? '✅' : '❌'} {stepFeedback.message}
                </div>
              )}
            </div>
          )}

          {/* Quiz for 'quiz' type */}
          {step.type === 'quiz' && step.quizChoices && (
            <div className="mt-5">
              <p className="text-white text-base mb-5">{step.quizQuestion}</p>
              <div className="flex flex-col gap-2.5">
                {step.quizChoices.map((choice, i) => {
                  let choiceClasses = "p-4 bg-gray-700 border-2 border-gray-600 rounded-md text-white text-left cursor-pointer text-sm transition-all hover:border-gray-500";
                  if (quizAnswer === i && !showQuizResult) {
                    choiceClasses = "p-4 bg-gray-700 border-2 border-nvidia-green rounded-md text-white text-left cursor-pointer text-sm";
                  }
                  if (showQuizResult && i === step.quizCorrectIndex) {
                    choiceClasses = "p-4 bg-green-900/50 border-2 border-green-500 rounded-md text-white text-left text-sm";
                  }
                  if (showQuizResult && quizAnswer === i && i !== step.quizCorrectIndex) {
                    choiceClasses = "p-4 bg-red-900/50 border-2 border-red-500 rounded-md text-white text-left text-sm";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => !showQuizResult && setQuizAnswer(i)}
                      className={choiceClasses}
                      disabled={showQuizResult}
                    >
                      {String.fromCharCode(65 + i)}. {choice}
                    </button>
                  );
                })}
              </div>

              {!showQuizResult && quizAnswer !== null && (
                <button onClick={handleQuizSubmit} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
                  Submit Answer
                </button>
              )}

              {showQuizResult && (
                <div className={`mt-5 p-4 rounded-md border bg-gray-800 ${quizAnswer === step.quizCorrectIndex ? 'border-green-500' : 'border-red-500'}`}>
                  {quizAnswer === step.quizCorrectIndex ? '✅ Correct!' : '❌ Incorrect'}
                  <p>{step.quizExplanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Observe type - auto-execute and show output */}
          {step.type === 'observe' && (
            <div className="mt-5">
              <div className="text-nvidia-green text-sm font-bold mb-4">👁️ Observe the following command output:</div>
              <div className="bg-black rounded-md p-4 mb-4">
                <code className="text-nvidia-green font-mono text-sm">{step.expectedCommand}</code>
              </div>
              {commandOutput ? (
                <div className="bg-black rounded-md p-4 mb-4 max-h-52 overflow-auto">
                  <pre className="m-0 text-gray-300 font-mono text-sm whitespace-pre-wrap">{commandOutput}</pre>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (onExecuteCommand && step.expectedCommand) {
                      try {
                        const output = await onExecuteCommand(step.expectedCommand);
                        setCommandOutput(output);
                        trackCommand(step.expectedCommand.split(' ')[0], true);
                      } catch (error) {
                        setCommandOutput(`Error: ${error}`);
                      }
                    }
                  }}
                  className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors"
                >
                  Run Command
                </button>
              )}
              {commandOutput && (
                <button onClick={advanceStep} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
                  Continue →
                </button>
              )}
            </div>
          )}

          {/* Practice type - free-form practice */}
          {step.type === 'practice' && (
            <div className="mt-5">
              <div className="text-orange-500 text-sm font-bold mb-4">🔧 Practice on your own:</div>
              <div className="flex items-center bg-black rounded-md p-1 mb-2.5">
                <span className="text-nvidia-green font-mono text-base px-2.5 font-bold">$</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && commandInput.trim()) {
                      if (onExecuteCommand) {
                        try {
                          const output = await onExecuteCommand(commandInput);
                          setCommandOutput(output);
                          trackCommand(commandInput.split(' ')[0], true);
                        } catch (error) {
                          setCommandOutput(`Error: ${error}`);
                        }
                      }
                    }
                  }}
                  placeholder="Try the commands yourself..."
                  className="flex-1 bg-transparent border-none text-white font-mono text-sm p-2.5 outline-none"
                  autoFocus
                />
                <button
                  onClick={async () => {
                    if (commandInput.trim() && onExecuteCommand) {
                      try {
                        const output = await onExecuteCommand(commandInput);
                        setCommandOutput(output);
                        trackCommand(commandInput.split(' ')[0], true);
                      } catch (error) {
                        setCommandOutput(`Error: ${error}`);
                      }
                    }
                  }}
                  className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors"
                >
                  Execute
                </button>
              </div>

              {/* Command output */}
              {commandOutput && (
                <div className="bg-black rounded-md p-4 mb-4 max-h-52 overflow-auto">
                  <pre className="m-0 text-gray-300 font-mono text-sm whitespace-pre-wrap">{commandOutput}</pre>
                </div>
              )}

              <button onClick={advanceStep} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
                Continue →
              </button>
            </div>
          )}

          {/* Concept type - just show continue button */}
          {step.type === 'concept' && (
            <button onClick={advanceStep} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
              Continue →
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-2.5">
          <button
            onClick={goBackStep}
            disabled={currentStepIndex === 0}
            className={`px-6 py-3 bg-gray-700 border-none rounded-md text-white cursor-pointer text-sm hover:bg-gray-600 transition-colors ${currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ← Previous
          </button>
          <button onClick={goBack} className="px-6 py-3 bg-gray-600 border-none rounded-md text-gray-400 cursor-pointer text-sm hover:bg-gray-500 transition-colors">
            Exit Lesson
          </button>
          {step.type !== 'command' && step.type !== 'quiz' && currentStepIndex < selectedLesson.steps.length - 1 && (
            <button onClick={advanceStep} className="px-6 py-3 bg-gray-700 border-none rounded-md text-white cursor-pointer text-sm hover:bg-gray-600 transition-colors">
              Next →
            </button>
          )}
          {currentStepIndex === selectedLesson.steps.length - 1 && step.type !== 'command' && step.type !== 'quiz' && (
            <button
              onClick={() => {
                completeLesson(selectedLesson.id, selectedModule?.id || '');
                goBack();
              }}
              className="px-6 py-3 bg-green-600 border-none rounded-md text-white font-bold cursor-pointer text-sm hover:bg-green-500 transition-colors"
            >
              Complete Lesson ✓
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-gray-200 rounded-lg max-w-6xl mx-auto font-sans min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {viewState !== 'paths' && (
            <button onClick={goBack} className="px-4 py-2 bg-gray-700 border-none rounded text-gray-500 cursor-pointer text-sm hover:bg-gray-600 transition-colors">
              ← Back
            </button>
          )}
          <div>
            <h2 className="m-0 text-nvidia-green text-2xl font-semibold">
              {viewState === 'paths' && 'Learning Paths'}
              {viewState === 'modules' && selectedPath?.title}
              {viewState === 'lessons' && selectedModule?.title}
              {viewState === 'tutorial' && selectedLesson?.title}
            </h2>
            <p className="mt-1 mb-0 text-gray-500 text-sm">
              {viewState === 'paths' && 'Structured learning for NCP-AII certification'}
              {viewState === 'modules' && `${selectedPath?.modules.length} modules • ${selectedPath?.examWeight}% of exam`}
              {viewState === 'lessons' && `${selectedModule?.lessons.length} lessons`}
              {viewState === 'tutorial' && `${selectedLesson?.commands.join(', ')}`}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="bg-transparent border-none text-gray-500 text-3xl cursor-pointer leading-none px-2.5 hover:text-gray-300 transition-colors">
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 overflow-auto">
        {/* Paths Overview */}
        {viewState === 'paths' && (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-5 text-center">
                <div className="text-3xl font-bold text-nvidia-green">{totalStats.totalPaths}</div>
                <div className="text-xs text-gray-500 mt-1">Learning Paths</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-5 text-center">
                <div className="text-3xl font-bold text-nvidia-green">{totalStats.totalLessons}</div>
                <div className="text-xs text-gray-500 mt-1">Total Lessons</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-5 text-center">
                <div className="text-3xl font-bold text-nvidia-green">{completedLessons.size}</div>
                <div className="text-xs text-gray-500 mt-1">Completed</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-5 text-center">
                <div className="text-3xl font-bold text-nvidia-green">{totalStats.totalEstimatedMinutes}m</div>
                <div className="text-xs text-gray-500 mt-1">Est. Time</div>
              </div>
            </div>

            {/* Reset progress button - only show if there's progress to reset */}
            {completedLessons.size > 0 && (
              <div className="flex justify-end mb-4">
                <button onClick={resetProgress} className="px-4 py-2 bg-transparent border border-gray-600 rounded text-gray-500 cursor-pointer text-xs hover:border-gray-500 hover:text-gray-400 transition-all">
                  Reset Progress
                </button>
              </div>
            )}

            {/* Recommended next lesson */}
            {recommendedNext && (
              <div className="bg-green-900/30 border border-nvidia-green rounded-lg p-5 mb-6">
                <div className="text-nvidia-green text-xs font-bold mb-2.5">📌 Continue Learning</div>
                <h3 className="m-0 mb-2 text-white text-lg">{recommendedNext.lesson.title}</h3>
                <p className="text-gray-500 text-sm m-0 mb-4">
                  {recommendedNext.path.title} → {recommendedNext.module.title}
                </p>
                <button
                  onClick={() => {
                    setSelectedPath(recommendedNext.path);
                    setSelectedModule(recommendedNext.module);
                    startLesson(recommendedNext.lesson);
                  }}
                  className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors"
                >
                  Resume Learning
                </button>
              </div>
            )}

            {/* Learning paths grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.values(LEARNING_PATHS).map(path => {
                const progress = pathsProgress.get(path.id);
                const domain = DOMAINS[path.domainId];

                return (
                  <div
                    key={path.id}
                    className="bg-gray-800 rounded-lg p-5 cursor-pointer border border-gray-700 hover:border-nvidia-green hover:shadow-lg transition-all"
                    onClick={() => selectPath(path)}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div
                        className="px-2.5 py-1 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: getDomainColor(path.domainId) }}
                      >
                        {domain.title.split(':')[0]}
                      </div>
                      <span className="text-gray-500 text-sm font-bold">{path.examWeight}%</span>
                    </div>
                    <h3 className="m-0 mb-2.5 text-white text-lg">{path.title}</h3>
                    <p className="text-gray-500 text-sm m-0 mb-4 leading-relaxed">{path.description}</p>

                    <div className="flex gap-4 text-sm text-gray-600 mb-3">
                      <span>{path.modules.length} modules</span>
                      <span>{path.totalEstimatedMinutes} min</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-1.5 bg-gray-700 rounded-sm overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-nvidia-green transition-all duration-300"
                          style={{ width: `${progress?.overallPercentage || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {progress?.completedLessons || 0}/{progress?.totalLessons || 0} lessons
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {path.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-700 rounded-sm text-xs text-gray-400">{skill}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Modules view */}
        {viewState === 'modules' && selectedPath && (
          <div className="flex flex-col gap-4">
            {selectedPath.modules.map((module, idx) => {
              const isLocked = !areModulePrerequisitesMet(module.id, completedModules);
              const isComplete = completedModules.has(module.id);
              const lessonsComplete = module.lessons.filter(l => completedLessons.has(l.id)).length;

              return (
                <div
                  key={module.id}
                  className={`flex items-center bg-gray-800 rounded-lg p-5 gap-5 ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-nvidia-green'} border border-gray-700 transition-colors`}
                  onClick={() => selectModule(module)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-base text-nvidia-green shrink-0">
                    {isComplete ? '✓' : isLocked ? '🔒' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="m-0 mb-2 text-white text-base">
                      {module.icon} {module.title}
                    </h3>
                    <p className="m-0 mb-2.5 text-gray-500 text-sm">{module.description}</p>
                    <div className="text-sm text-gray-600 flex gap-4">
                      <span>{lessonsComplete}/{module.lessons.length} lessons</span>
                      {module.prerequisites && module.prerequisites.length > 0 && (
                        <span className="text-orange-500 text-xs">
                          Requires: {module.prerequisites.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="relative flex items-center justify-center">
                      <svg width="50" height="50" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#374151" strokeWidth="4" />
                        <circle
                          cx="25" cy="25" r="20" fill="none"
                          className="stroke-nvidia-green"
                          strokeWidth="4"
                          strokeDasharray={`${(lessonsComplete / module.lessons.length) * 125.6} 125.6`}
                          transform="rotate(-90 25 25)"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-nvidia-green">
                        {Math.round((lessonsComplete / module.lessons.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lessons view */}
        {viewState === 'lessons' && selectedModule && (
          <div className="flex flex-col gap-4">
            {selectedModule.lessons.map((lesson, idx) => {
              const isLocked = !areLessonPrerequisitesMet(lesson.id, completedLessons);
              const isComplete = completedLessons.has(lesson.id);

              return (
                <div
                  key={lesson.id}
                  className={`bg-gray-800 rounded-lg p-5 border-l-4 ${isComplete ? 'border-l-green-500' : isLocked ? 'border-l-gray-600' : 'border-l-nvidia-green'} ${isLocked ? 'opacity-60' : 'cursor-pointer hover:bg-gray-750'} transition-colors`}
                  onClick={() => !isLocked && startLesson(lesson)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-sm text-nvidia-green shrink-0">
                      {isComplete ? '✓' : isLocked ? '🔒' : idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="m-0 mb-1 text-white text-base">{lesson.title}</h4>
                      <p className="m-0 text-gray-500 text-sm">{lesson.description}</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="px-2 py-0.5 rounded-sm text-xs bg-gray-700 text-gray-400 capitalize">{lesson.difficulty}</span>
                      <span className="px-2 py-0.5 rounded-sm text-xs bg-gray-700 text-nvidia-green">{lesson.estimatedMinutes} min</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-2.5">
                    <strong>Objectives:</strong>
                    <ul className="mt-1 mb-0 pl-5">
                      {lesson.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-sm text-gray-500 mb-4 flex items-center gap-2 flex-wrap">
                    <strong>Commands:</strong>
                    {lesson.commands.map((cmd, i) => (
                      <code key={i} className="px-2 py-0.5 bg-black rounded-sm font-mono text-xs text-nvidia-green">{cmd}</code>
                    ))}
                  </div>

                  {!isLocked && !isComplete && (
                    <button
                      className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        startLesson(lesson);
                      }}
                    >
                      Start Lesson →
                    </button>
                  )}
                  {isComplete && (
                    <button
                      className="px-5 py-2.5 bg-gray-600 border-none rounded text-white font-bold cursor-pointer text-sm hover:bg-gray-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        startLesson(lesson);
                      }}
                    >
                      Review Lesson
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tutorial view */}
        {viewState === 'tutorial' && renderTutorialStep()}
      </div>
    </div>
  );
};

// Helper function to get domain color
function getDomainColor(domainId: DomainId): string {
  const colors: Record<DomainId, string> = {
    domain1: '#3b82f6', // blue
    domain2: '#22c55e', // green
    domain3: '#a855f7', // purple
    domain4: '#f97316', // orange
    domain5: '#ef4444', // red
  };
  return colors[domainId];
}

export default LearningPaths;
