import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClusterConfig, GPU, HealthStatus, XIDError, InfiniBandHCA } from '@/types/hardware';
import type { Scenario, ScenarioProgress, ExamState, ExamBreakdown } from '@/types/scenarios';
import type { ValidationResult, ValidationConfig } from '@/types/validation';
import { createDefaultCluster } from '@/utils/clusterFactory';

interface SimulationState {
  // Cluster state
  cluster: ClusterConfig;
  selectedNode: string | null;

  // Simulation control
  isRunning: boolean;
  simulationSpeed: number; // 1.0 = real-time, 2.0 = 2x speed

  // Metrics
  metricsInterval: number; // ms between metric updates
  lastMetricsUpdate: number;

  // Scenario & Lab state
  activeScenario: Scenario | null;
  activeLabId: string | null;
  scenarioProgress: Record<string, ScenarioProgress>;
  completedScenarios: string[];

  // Exam state
  activeExam: ExamState | null;

  // Validation state
  stepValidation: Record<string, ValidationResult>; // key: "scenarioId-stepId"
  validationConfig: ValidationConfig;

  // Visualization navigation state
  requestedVisualizationView: 'topology' | 'network' | null;

  // Actions
  setCluster: (cluster: ClusterConfig) => void;
  selectNode: (nodeId: string) => void;
  updateGPU: (nodeId: string, gpuId: number, updates: Partial<GPU>) => void;
  updateHCAs: (nodeId: string, hcas: InfiniBandHCA[]) => void;
  updateNodeHealth: (nodeId: string, health: HealthStatus) => void;
  addXIDError: (nodeId: string, gpuId: number, error: XIDError) => void;
  setMIGMode: (nodeId: string, gpuId: number, enabled: boolean) => void;
  setSlurmState: (nodeId: string, state: 'idle' | 'alloc' | 'drain' | 'down', reason?: string) => void;

  // Cross-tool state synchronization actions
  allocateGPUsForJob: (nodeId: string, gpuIds: number[], jobId: number, targetUtilization?: number) => void;
  deallocateGPUsForJob: (jobId: number) => void;
  setClusterPowerLimit: (nodeId: string, limitWatts: number) => void;
  getClusterPowerLimit: (nodeId: string) => number | null;

  // Scenario & Lab actions
  loadScenario: (scenario: Scenario) => void;
  startLab: (labId: string) => void;
  completeScenarioStep: (scenarioId: string, stepId: string) => void;
  exitScenario: () => void;

  // Lab Panel visibility (responsive UI)
  labPanelVisible: boolean;
  setLabPanelVisible: (visible: boolean) => void;
  toggleLabPanel: () => void;

  // Hint actions
  revealHint: (scenarioId: string, stepId: string, hintId: string) => void;
  recordCommand: (scenarioId: string, stepId: string, command: string) => void;
  recordFailedAttempt: (scenarioId: string, stepId: string) => void;

  // Validation actions
  validateStep: (scenarioId: string, stepId: string, result: ValidationResult) => void;
  clearStepValidation: (scenarioId: string, stepId: string) => void;
  updateValidationConfig: (config: Partial<ValidationConfig>) => void;

  // Exam actions
  startExam: (examId: string) => void;
  submitExamAnswer: (questionId: string, answer: number | number[] | string) => void;
  endExam: () => ExamBreakdown | null;
  exitExam: () => void;

  // Simulation lifecycle
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;

  // Visualization navigation
  setRequestedVisualizationView: (view: 'topology' | 'network' | null) => void;

  // Persistence
  exportCluster: () => string;
  importCluster: (json: string) => void;
}

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set, get) => ({
      // Initial state
      cluster: createDefaultCluster(),
      selectedNode: null,
      isRunning: false,
      simulationSpeed: 1.0,
      metricsInterval: 1000,
      lastMetricsUpdate: Date.now(),

      // Scenario & Lab state
      activeScenario: null,
      activeLabId: null,
      scenarioProgress: {},
      completedScenarios: [],

      // Exam state
      activeExam: null,

      // Validation state
      stepValidation: {},
      validationConfig: {
        enabled: true,
        immediatefeedback: true,
        autoAdvance: true,
        autoAdvanceDelay: 1500, // 1.5 seconds
        showProgress: true,
        soundEffects: false,
      },

      // Visualization navigation
      requestedVisualizationView: null,

      // Actions
      setCluster: (cluster) => set({ cluster }),

      selectNode: (nodeId) => set({ selectedNode: nodeId }),

      updateGPU: (nodeId, gpuId, updates) => set((state) => ({
        cluster: {
          ...state.cluster,
          nodes: state.cluster.nodes.map(node =>
            node.id === nodeId
              ? {
                ...node,
                gpus: node.gpus.map(gpu =>
                  gpu.id === gpuId ? { ...gpu, ...updates } : gpu
                ),
              }
              : node
          ),
        },
      })),

      updateHCAs: (nodeId, hcas) => set((state) => ({
        cluster: {
          ...state.cluster,
          nodes: state.cluster.nodes.map(node =>
            node.id === nodeId
              ? { ...node, hcas }
              : node
          ),
        },
      })),

      updateNodeHealth: (nodeId, health) => set((state) => ({
        cluster: {
          ...state.cluster,
          nodes: state.cluster.nodes.map(node =>
            node.id === nodeId ? { ...node, healthStatus: health } : node
          ),
        },
      })),

      addXIDError: (nodeId, gpuId, error) => set((state) => ({
        cluster: {
          ...state.cluster,
          nodes: state.cluster.nodes.map(node =>
            node.id === nodeId
              ? {
                ...node,
                gpus: node.gpus.map(gpu =>
                  gpu.id === gpuId
                    ? { ...gpu, xidErrors: [...gpu.xidErrors, error] }
                    : gpu
                ),
              }
              : node
          ),
        },
      })),

      setMIGMode: (nodeId, gpuId, enabled) => set((state) => ({
        cluster: {
          ...state.cluster,
          nodes: state.cluster.nodes.map(node =>
            node.id === nodeId
              ? {
                ...node,
                gpus: node.gpus.map(gpu =>
                  gpu.id === gpuId
                    ? { ...gpu, migMode: enabled, migInstances: enabled ? gpu.migInstances : [] }
                    : gpu
                ),
              }
              : node
          ),
        },
      })),

      setSlurmState: (nodeId, state, reason) => set((prevState) => ({
        cluster: {
          ...prevState.cluster,
          nodes: prevState.cluster.nodes.map(node =>
            node.id === nodeId
              ? { ...node, slurmState: state, slurmReason: reason }
              : node
          ),
        },
      })),

      // Cross-tool state synchronization
      allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization = 85) => set((prevState) => ({
        cluster: {
          ...prevState.cluster,
          nodes: prevState.cluster.nodes.map(node =>
            node.id === nodeId
              ? {
                ...node,
                gpus: node.gpus.map(gpu =>
                  gpuIds.includes(gpu.id)
                    ? {
                      ...gpu,
                      utilization: targetUtilization + (Math.random() * 10 - 5), // Add jitter
                      memoryUsed: Math.floor(gpu.memoryTotal * (0.7 + Math.random() * 0.2)),
                      powerDraw: gpu.powerLimit * (0.75 + Math.random() * 0.15),
                      temperature: 65 + Math.random() * 15,
                      allocatedJobId: jobId,
                    }
                    : gpu
                ),
              }
              : node
          ),
        },
      })),

      deallocateGPUsForJob: (jobId) => set((prevState) => ({
        cluster: {
          ...prevState.cluster,
          nodes: prevState.cluster.nodes.map(node => ({
            ...node,
            gpus: node.gpus.map(gpu =>
              gpu.allocatedJobId === jobId
                ? {
                  ...gpu,
                  utilization: Math.random() * 5, // Idle utilization
                  memoryUsed: Math.floor(gpu.memoryTotal * 0.01),
                  powerDraw: gpu.powerLimit * 0.15,
                  temperature: 35 + Math.random() * 10,
                  allocatedJobId: undefined,
                }
                : gpu
            ),
          })),
        },
      })),

      setClusterPowerLimit: (nodeId, limitWatts) => set((prevState) => ({
        cluster: {
          ...prevState.cluster,
          nodes: prevState.cluster.nodes.map(node =>
            node.id === nodeId
              ? {
                ...node,
                clusterPowerLimit: limitWatts,
                gpus: node.gpus.map(gpu => ({
                  ...gpu,
                  powerLimit: Math.min(gpu.powerLimit, limitWatts / node.gpus.length),
                })),
              }
              : node
          ),
        },
      })),

      getClusterPowerLimit: (nodeId) => {
        const state = get();
        const node = state.cluster.nodes.find(n => n.id === nodeId);
        return node?.clusterPowerLimit ?? null;
      },

      // Scenario & Lab actions
      loadScenario: (scenario) => {
        set({
          activeScenario: scenario,
          scenarioProgress: {
            ...get().scenarioProgress,
            [scenario.id]: {
              scenarioId: scenario.id,
              startTime: Date.now(),
              completed: false,
              currentStepIndex: 0,
              steps: scenario.steps.map(step => ({
                stepId: step.id,
                startTime: 0,
                completed: false,
                validationsPassed: 0,
                validationsTotal: step.validationRules?.length || 0,
                hintsRevealed: 0,
                commandsExecuted: [],
                lastCommandTime: undefined,
                failedAttempts: 0,
                revealedHintIds: [],
              })),
              totalTimeSpent: 0,
              hintsUsed: 0,
              validationAttempts: 0,
              validationFailures: 0,
            }
          }
        });

        // Start first step
        const progress = get().scenarioProgress[scenario.id];
        if (progress && progress.steps[0]) {
          progress.steps[0].startTime = Date.now();
        }
      },

      startLab: (labId) => set({ activeLabId: labId }),

      completeScenarioStep: (scenarioId, stepId) => {
        const state = get();
        const progress = state.scenarioProgress[scenarioId];

        if (!progress) return;

        const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
        if (stepIndex === -1) return;

        const updatedSteps = [...progress.steps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: true,
          endTime: Date.now(),
        };

        // Start next step if exists
        const nextStepIndex = stepIndex + 1;
        if (nextStepIndex < updatedSteps.length) {
          updatedSteps[nextStepIndex].startTime = Date.now();
        }

        // Check if all steps completed
        const allCompleted = updatedSteps.every(s => s.completed);

        set({
          scenarioProgress: {
            ...state.scenarioProgress,
            [scenarioId]: {
              ...progress,
              steps: updatedSteps,
              currentStepIndex: Math.min(nextStepIndex, updatedSteps.length - 1),
              completed: allCompleted,
              endTime: allCompleted ? Date.now() : undefined,
            }
          },
          completedScenarios: allCompleted && !state.completedScenarios.includes(scenarioId)
            ? [...state.completedScenarios, scenarioId]
            : state.completedScenarios,
        });
      },

      exitScenario: () => set({ activeScenario: null }),

      // Hint actions
      revealHint: (scenarioId, stepId, hintId) => {
        const state = get();
        const progress = state.scenarioProgress[scenarioId];
        if (!progress) return;

        const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
        if (stepIndex === -1) return;

        const updatedSteps = [...progress.steps];
        const step = updatedSteps[stepIndex];

        // Add hint ID to revealed list if not already there
        if (!step.revealedHintIds.includes(hintId)) {
          updatedSteps[stepIndex] = {
            ...step,
            revealedHintIds: [...step.revealedHintIds, hintId],
            hintsRevealed: step.hintsRevealed + 1,
          };

          set({
            scenarioProgress: {
              ...state.scenarioProgress,
              [scenarioId]: {
                ...progress,
                steps: updatedSteps,
                hintsUsed: progress.hintsUsed + 1,
              }
            }
          });
        }
      },

      recordCommand: (scenarioId, stepId, command) => {
        const state = get();
        const progress = state.scenarioProgress[scenarioId];
        if (!progress) return;

        const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
        if (stepIndex === -1) return;

        const updatedSteps = [...progress.steps];
        const step = updatedSteps[stepIndex];

        updatedSteps[stepIndex] = {
          ...step,
          commandsExecuted: [...step.commandsExecuted, command],
          lastCommandTime: Date.now(),
        };

        set({
          scenarioProgress: {
            ...state.scenarioProgress,
            [scenarioId]: {
              ...progress,
              steps: updatedSteps,
            }
          }
        });
      },

      recordFailedAttempt: (scenarioId, stepId) => {
        const state = get();
        const progress = state.scenarioProgress[scenarioId];
        if (!progress) return;

        const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
        if (stepIndex === -1) return;

        const updatedSteps = [...progress.steps];
        const step = updatedSteps[stepIndex];

        updatedSteps[stepIndex] = {
          ...step,
          failedAttempts: step.failedAttempts + 1,
        };

        set({
          scenarioProgress: {
            ...state.scenarioProgress,
            [scenarioId]: {
              ...progress,
              steps: updatedSteps,
              validationAttempts: progress.validationAttempts + 1,
              validationFailures: progress.validationFailures + 1,
            }
          }
        });
      },

      // Validation actions
      validateStep: (scenarioId, stepId, result) => {
        const state = get();
        const key = `${scenarioId}-${stepId}`;

        set({
          stepValidation: {
            ...state.stepValidation,
            [key]: result,
          },
        });

        // Auto-advance if validation passed and config allows
        if (result.passed && state.validationConfig.autoAdvance) {
          setTimeout(() => {
            get().completeScenarioStep(scenarioId, stepId);
          }, state.validationConfig.autoAdvanceDelay);
        }

        // Record failed attempt if validation failed
        if (!result.passed) {
          get().recordFailedAttempt(scenarioId, stepId);
        }
      },

      clearStepValidation: (scenarioId, stepId) => {
        const state = get();
        const key = `${scenarioId}-${stepId}`;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = state.stepValidation;

        set({
          stepValidation: rest,
        });
      },

      updateValidationConfig: (config) => {
        const state = get();
        set({
          validationConfig: {
            ...state.validationConfig,
            ...config,
          },
        });
      },

      // Exam actions
      startExam: (examId) => {
        set({
          activeExam: {
            examId,
            startTime: Date.now(),
            timeRemaining: 90 * 60, // 90 minutes in seconds
            answers: new Map(),
            currentQuestionIndex: 0,
            flaggedQuestions: new Set(),
            answeredQuestions: new Set(),
            submitted: false,
          }
        });
      },

      submitExamAnswer: (questionId, answer) => {
        const state = get();
        if (!state.activeExam) return;

        const updatedAnswers = new Map(state.activeExam.answers);
        updatedAnswers.set(questionId, answer);

        const updatedAnswered = new Set(state.activeExam.answeredQuestions);
        updatedAnswered.add(questionId);

        set({
          activeExam: {
            ...state.activeExam,
            answers: updatedAnswers,
            answeredQuestions: updatedAnswered,
          }
        });
      },

      endExam: () => {
        const state = get();
        if (!state.activeExam) return null;

        // This will be implemented with actual scoring logic
        // For now, return a placeholder breakdown
        const breakdown: ExamBreakdown = {
          totalPoints: 35,
          earnedPoints: 0,
          percentage: 0,
          byDomain: {
            domain1: { domainName: 'Platform Bring-Up', questionsTotal: 10, questionsCorrect: 0, percentage: 0, weight: 31 },
            domain2: { domainName: 'Accelerator Configuration', questionsTotal: 2, questionsCorrect: 0, percentage: 0, weight: 5 },
            domain3: { domainName: 'Base Infrastructure', questionsTotal: 6, questionsCorrect: 0, percentage: 0, weight: 19 },
            domain4: { domainName: 'Validation & Testing', questionsTotal: 11, questionsCorrect: 0, percentage: 0, weight: 33 },
            domain5: { domainName: 'Troubleshooting', questionsTotal: 4, questionsCorrect: 0, percentage: 0, weight: 12 },
          },
          questionResults: [],
          timeSpent: Math.floor((Date.now() - state.activeExam.startTime) / 1000),
        };

        set({
          activeExam: {
            ...state.activeExam,
            submitted: true,
            endTime: Date.now(),
            breakdown,
          }
        });

        return breakdown;
      },

      exitExam: () => set({ activeExam: null }),

      startSimulation: () => set({ isRunning: true }),
      stopSimulation: () => set({ isRunning: false }),

      resetSimulation: () => set({
        cluster: createDefaultCluster(),
        selectedNode: null,
        isRunning: false,
        simulationSpeed: 1.0,
      }),

      setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

      // Visualization navigation
      setRequestedVisualizationView: (view) => set({ requestedVisualizationView: view }),

      exportCluster: () => {
        const state = get();
        return JSON.stringify(state.cluster, null, 2);
      },

      importCluster: (json) => {
        try {
          const cluster = JSON.parse(json) as ClusterConfig;
          set({ cluster });
        } catch (error) {
          console.error('Failed to import cluster:', error);
        }
      },

      // Lab Panel visibility state
      labPanelVisible: true, // Default to visible

      setLabPanelVisible: (visible: boolean) => set({ labPanelVisible: visible }),

      toggleLabPanel: () => set((state) => ({ labPanelVisible: !state.labPanelVisible })),
    }),
    {
      name: 'nvidia-simulator-storage',
      partialize: (state) => ({
        cluster: state.cluster,
        simulationSpeed: state.simulationSpeed,
        scenarioProgress: state.scenarioProgress,
        completedScenarios: state.completedScenarios,
      }),
    }
  )
);
