/**
 * Learning Paths Component - Interactive guided learning for NCP-AII certification
 *
 * Provides structured curricula with modules, lessons, and step-by-step tutorials.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

  // Save progress to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ncp-aii-completed-lessons', JSON.stringify([...completedLessons]));
    localStorage.setItem('ncp-aii-completed-modules', JSON.stringify([...completedModules]));
    localStorage.setItem('ncp-aii-lesson-progress', JSON.stringify(Object.fromEntries(lessonProgress)));
  }, [completedLessons, completedModules, lessonProgress]);

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
      <div style={styles.tutorialContainer}>
        {/* Progress bar */}
        <div style={styles.progressHeader}>
          <div style={styles.progressInfo}>
            <span style={styles.stepCounter}>
              Step {currentStepIndex + 1} of {selectedLesson.steps.length}
            </span>
            <span style={styles.tutorialLessonTitle}>{selectedLesson.title}</span>
          </div>
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
          </div>
        </div>

        {/* Step content */}
        <div style={styles.stepContent}>
          <h3 style={styles.stepTitle}>{step.title}</h3>

          {/* Step type badge */}
          <div style={styles.stepTypeBadge}>
            {step.type === 'concept' && '📖 Concept'}
            {step.type === 'command' && '💻 Hands-On'}
            {step.type === 'quiz' && '❓ Quiz'}
            {step.type === 'observe' && '👁️ Observe'}
            {step.type === 'practice' && '🔧 Practice'}
          </div>

          {/* Main content */}
          <div style={styles.stepDescription}>
            {step.content.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '8px 0' }}>{line}</p>
            ))}
          </div>

          {/* Tips if any */}
          {step.tips && step.tips.length > 0 && (
            <div style={styles.tipsBox}>
              <strong>💡 Tips:</strong>
              <ul style={styles.tipsList}>
                {step.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Command input for 'command' type */}
          {step.type === 'command' && (
            <div style={styles.commandSection}>
              <div style={styles.commandInputWrapper}>
                <span style={styles.prompt}>$</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
                  placeholder="Type your command here..."
                  style={styles.commandInput}
                  autoFocus
                />
                <button onClick={handleCommandSubmit} style={styles.executeButton}>
                  Execute
                </button>
              </div>

              {step.commandHint && (
                <div style={styles.hintText}>
                  💡 Hint: {step.commandHint}
                </div>
              )}

              {/* Command output */}
              {commandOutput && (
                <div style={styles.outputBox}>
                  <pre style={styles.outputText}>{commandOutput}</pre>
                </div>
              )}

              {/* Feedback */}
              {stepFeedback && (
                <div style={{
                  ...styles.feedbackBox,
                  backgroundColor: stepFeedback.success ? '#1b4d1b' : '#4d1b1b',
                  borderColor: stepFeedback.success ? '#4CAF50' : '#F44336',
                }}>
                  {stepFeedback.success ? '✅' : '❌'} {stepFeedback.message}
                </div>
              )}
            </div>
          )}

          {/* Quiz for 'quiz' type */}
          {step.type === 'quiz' && step.quizChoices && (
            <div style={styles.quizSection}>
              <p style={styles.quizQuestion}>{step.quizQuestion}</p>
              <div style={styles.quizChoices}>
                {step.quizChoices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => !showQuizResult && setQuizAnswer(i)}
                    style={{
                      ...styles.quizChoice,
                      ...(quizAnswer === i ? styles.quizChoiceSelected : {}),
                      ...(showQuizResult && i === step.quizCorrectIndex ? styles.quizChoiceCorrect : {}),
                      ...(showQuizResult && quizAnswer === i && i !== step.quizCorrectIndex ? styles.quizChoiceWrong : {}),
                    }}
                    disabled={showQuizResult}
                  >
                    {String.fromCharCode(65 + i)}. {choice}
                  </button>
                ))}
              </div>

              {!showQuizResult && quizAnswer !== null && (
                <button onClick={handleQuizSubmit} style={styles.submitQuizButton}>
                  Submit Answer
                </button>
              )}

              {showQuizResult && (
                <div style={{
                  ...styles.quizExplanation,
                  borderColor: quizAnswer === step.quizCorrectIndex ? '#4CAF50' : '#F44336',
                }}>
                  {quizAnswer === step.quizCorrectIndex ? '✅ Correct!' : '❌ Incorrect'}
                  <p>{step.quizExplanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Concept type - just show continue button */}
          {step.type === 'concept' && (
            <button onClick={advanceStep} style={styles.continueButton}>
              Continue →
            </button>
          )}
        </div>

        {/* Navigation */}
        <div style={styles.tutorialNav}>
          <button
            onClick={goBackStep}
            disabled={currentStepIndex === 0}
            style={{
              ...styles.navButton,
              opacity: currentStepIndex === 0 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>
          <button onClick={goBack} style={styles.exitButton}>
            Exit Lesson
          </button>
          {step.type !== 'command' && step.type !== 'quiz' && currentStepIndex < selectedLesson.steps.length - 1 && (
            <button onClick={advanceStep} style={styles.navButton}>
              Next →
            </button>
          )}
          {currentStepIndex === selectedLesson.steps.length - 1 && step.type !== 'command' && step.type !== 'quiz' && (
            <button
              onClick={() => {
                completeLesson(selectedLesson.id, selectedModule?.id || '');
                goBack();
              }}
              style={styles.completeButton}
            >
              Complete Lesson ✓
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {viewState !== 'paths' && (
            <button onClick={goBack} style={styles.backButton}>
              ← Back
            </button>
          )}
          <div>
            <h2 style={styles.title}>
              {viewState === 'paths' && 'Learning Paths'}
              {viewState === 'modules' && selectedPath?.title}
              {viewState === 'lessons' && selectedModule?.title}
              {viewState === 'tutorial' && selectedLesson?.title}
            </h2>
            <p style={styles.subtitle}>
              {viewState === 'paths' && 'Structured learning for NCP-AII certification'}
              {viewState === 'modules' && `${selectedPath?.modules.length} modules • ${selectedPath?.examWeight}% of exam`}
              {viewState === 'lessons' && `${selectedModule?.lessons.length} lessons`}
              {viewState === 'tutorial' && `${selectedLesson?.commands.join(', ')}`}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Paths Overview */}
        {viewState === 'paths' && (
          <>
            {/* Stats overview */}
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{totalStats.totalPaths}</div>
                <div style={styles.statLabel}>Learning Paths</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{totalStats.totalLessons}</div>
                <div style={styles.statLabel}>Total Lessons</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{completedLessons.size}</div>
                <div style={styles.statLabel}>Completed</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{totalStats.totalEstimatedMinutes}m</div>
                <div style={styles.statLabel}>Est. Time</div>
              </div>
            </div>

            {/* Recommended next lesson */}
            {recommendedNext && (
              <div style={styles.recommendedCard}>
                <div style={styles.recommendedBadge}>📌 Continue Learning</div>
                <h3 style={styles.recommendedTitle}>{recommendedNext.lesson.title}</h3>
                <p style={styles.recommendedMeta}>
                  {recommendedNext.path.title} → {recommendedNext.module.title}
                </p>
                <button
                  onClick={() => {
                    setSelectedPath(recommendedNext.path);
                    setSelectedModule(recommendedNext.module);
                    startLesson(recommendedNext.lesson);
                  }}
                  style={styles.startButton}
                >
                  Resume Learning
                </button>
              </div>
            )}

            {/* Learning paths grid */}
            <div style={styles.pathsGrid}>
              {Object.values(LEARNING_PATHS).map(path => {
                const progress = pathsProgress.get(path.id);
                const domain = DOMAINS[path.domainId];

                return (
                  <div key={path.id} style={styles.pathCard} onClick={() => selectPath(path)}>
                    <div style={styles.pathHeader}>
                      <div style={{
                        ...styles.domainBadge,
                        backgroundColor: getDomainColor(path.domainId),
                      }}>
                        {domain.title.split(':')[0]}
                      </div>
                      <span style={styles.examWeight}>{path.examWeight}%</span>
                    </div>
                    <h3 style={styles.pathTitle}>{path.title}</h3>
                    <p style={styles.pathDescription}>{path.description}</p>

                    <div style={styles.pathStats}>
                      <span>{path.modules.length} modules</span>
                      <span>{path.totalEstimatedMinutes} min</span>
                    </div>

                    {/* Progress bar */}
                    <div style={styles.pathProgress}>
                      <div style={styles.progressBarBg}>
                        <div
                          style={{
                            ...styles.progressBarFill,
                            width: `${progress?.overallPercentage || 0}%`,
                          }}
                        />
                      </div>
                      <span style={styles.progressText}>
                        {progress?.completedLessons || 0}/{progress?.totalLessons || 0} lessons
                      </span>
                    </div>

                    <div style={styles.skillsList}>
                      {path.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} style={styles.skillTag}>{skill}</span>
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
          <div style={styles.modulesList}>
            {selectedPath.modules.map((module, idx) => {
              const isLocked = !areModulePrerequisitesMet(module.id, completedModules);
              const isComplete = completedModules.has(module.id);
              const lessonsComplete = module.lessons.filter(l => completedLessons.has(l.id)).length;

              return (
                <div
                  key={module.id}
                  style={{
                    ...styles.moduleCard,
                    opacity: isLocked ? 0.6 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => selectModule(module)}
                >
                  <div style={styles.moduleOrder}>
                    {isComplete ? '✓' : isLocked ? '🔒' : idx + 1}
                  </div>
                  <div style={styles.moduleContent}>
                    <h3 style={styles.moduleTitle}>
                      {module.icon} {module.title}
                    </h3>
                    <p style={styles.moduleDescription}>{module.description}</p>
                    <div style={styles.moduleStats}>
                      <span>{lessonsComplete}/{module.lessons.length} lessons</span>
                      {module.prerequisites && module.prerequisites.length > 0 && (
                        <span style={styles.prereqBadge}>
                          Requires: {module.prerequisites.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={styles.moduleProgress}>
                    <div style={styles.circularProgress}>
                      <svg width="50" height="50" viewBox="0 0 50 50">
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          stroke="#333"
                          strokeWidth="4"
                        />
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          stroke="#76b900"
                          strokeWidth="4"
                          strokeDasharray={`${(lessonsComplete / module.lessons.length) * 125.6} 125.6`}
                          transform="rotate(-90 25 25)"
                        />
                      </svg>
                      <span style={styles.circularText}>
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
          <div style={styles.lessonsList}>
            {selectedModule.lessons.map((lesson, idx) => {
              const isLocked = !areLessonPrerequisitesMet(lesson.id, completedLessons);
              const isComplete = completedLessons.has(lesson.id);

              return (
                <div
                  key={lesson.id}
                  style={{
                    ...styles.lessonCard,
                    opacity: isLocked ? 0.6 : 1,
                    borderLeftColor: isComplete ? '#4CAF50' : isLocked ? '#666' : '#76b900',
                  }}
                  onClick={() => !isLocked && startLesson(lesson)}
                >
                  <div style={styles.lessonHeader}>
                    <div style={styles.lessonNumber}>
                      {isComplete ? '✓' : isLocked ? '🔒' : idx + 1}
                    </div>
                    <div style={styles.lessonInfo}>
                      <h4 style={styles.lessonTitle}>{lesson.title}</h4>
                      <p style={styles.lessonDescription}>{lesson.description}</p>
                    </div>
                    <div style={styles.lessonMeta}>
                      <span style={styles.difficultyBadge}>{lesson.difficulty}</span>
                      <span style={styles.durationBadge}>{lesson.estimatedMinutes} min</span>
                    </div>
                  </div>

                  <div style={styles.lessonObjectives}>
                    <strong>Objectives:</strong>
                    <ul>
                      {lesson.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={styles.lessonCommands}>
                    <strong>Commands:</strong>
                    {lesson.commands.map((cmd, i) => (
                      <code key={i} style={styles.commandTag}>{cmd}</code>
                    ))}
                  </div>

                  {!isLocked && !isComplete && (
                    <button
                      style={styles.startLessonButton}
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
                      style={{ ...styles.startLessonButton, backgroundColor: '#555' }}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    borderRadius: '8px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #333',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '4px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    color: '#76b900',
    fontSize: '24px',
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#888',
    fontSize: '14px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '28px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 10px',
  },
  content: {
    padding: '20px',
    flex: 1,
    overflow: 'auto',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '25px',
  },
  statBox: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#76b900',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
    marginTop: '5px',
  },
  recommendedCard: {
    backgroundColor: '#1a3d1a',
    border: '1px solid #76b900',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '25px',
  },
  recommendedBadge: {
    color: '#76b900',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  recommendedTitle: {
    margin: '0 0 8px 0',
    color: '#fff',
    fontSize: '18px',
  },
  recommendedMeta: {
    color: '#888',
    fontSize: '14px',
    margin: '0 0 15px 0',
  },
  startButton: {
    padding: '10px 20px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pathsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  pathCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #333',
  },
  pathHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  domainBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
  },
  examWeight: {
    color: '#888',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  pathTitle: {
    margin: '0 0 10px 0',
    color: '#fff',
    fontSize: '18px',
  },
  pathDescription: {
    color: '#888',
    fontSize: '14px',
    margin: '0 0 15px 0',
    lineHeight: 1.5,
  },
  pathStats: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
  },
  pathProgress: {
    marginBottom: '12px',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#76b900',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#888',
  },
  skillsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  skillTag: {
    padding: '3px 8px',
    backgroundColor: '#333',
    borderRadius: '3px',
    fontSize: '11px',
    color: '#aaa',
  },
  modulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  moduleCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
    gap: '20px',
    cursor: 'pointer',
  },
  moduleOrder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#76b900',
    flexShrink: 0,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    margin: '0 0 8px 0',
    color: '#fff',
    fontSize: '16px',
  },
  moduleDescription: {
    margin: '0 0 10px 0',
    color: '#888',
    fontSize: '14px',
  },
  moduleStats: {
    fontSize: '13px',
    color: '#666',
    display: 'flex',
    gap: '15px',
  },
  prereqBadge: {
    color: '#f97316',
    fontSize: '12px',
  },
  moduleProgress: {
    position: 'relative',
  },
  circularProgress: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularText: {
    position: 'absolute',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#76b900',
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  lessonCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
    borderLeft: '4px solid #76b900',
    cursor: 'pointer',
  },
  lessonHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    marginBottom: '15px',
  },
  lessonNumber: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#76b900',
    flexShrink: 0,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    margin: '0 0 5px 0',
    color: '#fff',
    fontSize: '16px',
  },
  lessonDescription: {
    margin: 0,
    color: '#888',
    fontSize: '14px',
  },
  lessonMeta: {
    display: 'flex',
    gap: '10px',
  },
  difficultyBadge: {
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    backgroundColor: '#333',
    color: '#aaa',
    textTransform: 'capitalize',
  },
  durationBadge: {
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    backgroundColor: '#333',
    color: '#76b900',
  },
  lessonObjectives: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '10px',
  },
  lessonCommands: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  commandTag: {
    padding: '2px 8px',
    backgroundColor: '#1a1a1a',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#76b900',
  },
  startLessonButton: {
    padding: '10px 20px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tutorialContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '500px',
  },
  progressHeader: {
    marginBottom: '20px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stepCounter: {
    color: '#76b900',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  tutorialLessonTitle: {
    color: '#888',
    fontSize: '14px',
  },
  progressBarContainer: {
    height: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#76b900',
    transition: 'width 0.3s ease',
  },
  stepContent: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '20px',
    overflow: 'auto',
  },
  stepTitle: {
    margin: '0 0 15px 0',
    color: '#fff',
    fontSize: '20px',
  },
  stepTypeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#333',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '20px',
  },
  stepDescription: {
    color: '#ccc',
    fontSize: '15px',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  tipsBox: {
    backgroundColor: '#1a3d1a',
    border: '1px solid #2d5a2d',
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  tipsList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px',
    color: '#aaa',
  },
  commandSection: {
    marginTop: '20px',
  },
  commandInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: '6px',
    padding: '4px',
    marginBottom: '10px',
  },
  prompt: {
    color: '#76b900',
    fontFamily: 'monospace',
    fontSize: '16px',
    padding: '0 10px',
    fontWeight: 'bold',
  },
  commandInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '10px',
    outline: 'none',
  },
  executeButton: {
    padding: '10px 20px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  hintText: {
    color: '#888',
    fontSize: '13px',
    marginBottom: '15px',
  },
  outputBox: {
    backgroundColor: '#0a0a0a',
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '15px',
    maxHeight: '200px',
    overflow: 'auto',
  },
  outputText: {
    margin: 0,
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: '13px',
    whiteSpace: 'pre-wrap',
  },
  feedbackBox: {
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
  },
  quizSection: {
    marginTop: '20px',
  },
  quizQuestion: {
    color: '#fff',
    fontSize: '16px',
    marginBottom: '20px',
  },
  quizChoices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  quizChoice: {
    padding: '15px 20px',
    backgroundColor: '#333',
    border: '2px solid #444',
    borderRadius: '6px',
    color: '#fff',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  quizChoiceSelected: {
    borderColor: '#76b900',
    backgroundColor: '#2a3a2a',
  },
  quizChoiceCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#1b4d1b',
  },
  quizChoiceWrong: {
    borderColor: '#F44336',
    backgroundColor: '#4d1b1b',
  },
  submitQuizButton: {
    marginTop: '20px',
    padding: '12px 30px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '6px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  quizExplanation: {
    marginTop: '20px',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid',
    backgroundColor: '#2a2a2a',
  },
  continueButton: {
    marginTop: '20px',
    padding: '12px 30px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '6px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tutorialNav: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  exitButton: {
    padding: '12px 24px',
    backgroundColor: '#444',
    border: 'none',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
  },
  completeButton: {
    padding: '12px 24px',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default LearningPaths;
