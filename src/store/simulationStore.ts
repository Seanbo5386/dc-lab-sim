import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ClusterConfig,
  GPU,
  HealthStatus,
  XIDError,
  InfiniBandHCA,
} from "@/types/hardware";
import type {
  Scenario,
  ScenarioProgress,
  ExamState,
  ExamBreakdown,
} from "@/types/scenarios";
import type { ValidationResult, ValidationConfig } from "@/types/validation";
import { createDefaultCluster } from "@/utils/clusterFactory";
import { useLearningProgressStore } from "./learningProgressStore";
// isTierUnlocked will be used in isScenarioAccessible once scenarios have tiers
// import { isTierUnlocked } from '@/utils/tierProgressionEngine';

// ============================================================================
// TOOL FAMILY MAPPING
// ============================================================================

/**
 * Maps command names to their command family IDs for tracking tool usage
 */
const toolFamilyMap: Record<string, string> = {
  // GPU Monitoring tools
  "nvidia-smi": "gpu-monitoring",
  nvsm: "gpu-monitoring",
  dcgmi: "gpu-monitoring",
  nvtop: "gpu-monitoring",
  // InfiniBand tools
  ibstat: "infiniband-tools",
  perfquery: "infiniband-tools",
  ibdiagnet: "infiniband-tools",
  iblinkinfo: "infiniband-tools",
  // BMC/Hardware tools
  ipmitool: "bmc-hardware",
  sensors: "bmc-hardware",
  dmidecode: "bmc-hardware",
  // Cluster tools
  sinfo: "cluster-tools",
  squeue: "cluster-tools",
  scontrol: "cluster-tools",
  sacct: "cluster-tools",
  // Container tools
  docker: "container-tools",
  enroot: "container-tools",
  pyxis: "container-tools",
  // Diagnostics
  "dcgmi-diag": "diagnostics",
  "nvidia-bug-report": "diagnostics",
  "gpu-burn": "diagnostics",
};

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
  requestedVisualizationView: "topology" | "network" | null;

  // Actions
  setCluster: (cluster: ClusterConfig) => void;
  selectNode: (nodeId: string) => void;
  updateGPU: (nodeId: string, gpuId: number, updates: Partial<GPU>) => void;
  updateHCAs: (nodeId: string, hcas: InfiniBandHCA[]) => void;
  updateNodeHealth: (nodeId: string, health: HealthStatus) => void;
  addXIDError: (nodeId: string, gpuId: number, error: XIDError) => void;
  setMIGMode: (nodeId: string, gpuId: number, enabled: boolean) => void;
  setSlurmState: (
    nodeId: string,
    state: "idle" | "alloc" | "drain" | "down",
    reason?: string,
  ) => void;

  // Cross-tool state synchronization actions
  allocateGPUsForJob: (
    nodeId: string,
    gpuIds: number[],
    jobId: number,
    targetUtilization?: number,
  ) => void;
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

  // Learning progress integration
  trackToolUsage: (command: string) => void;

  // Validation actions
  validateStep: (
    scenarioId: string,
    stepId: string,
    result: ValidationResult,
  ) => void;
  clearStepValidation: (scenarioId: string, stepId: string) => void;
  updateValidationConfig: (config: Partial<ValidationConfig>) => void;

  // Exam actions
  startExam: (examId: string) => void;
  submitExamAnswer: (
    questionId: string,
    answer: number | number[] | string,
  ) => void;
  endExam: () => ExamBreakdown | null;
  exitExam: () => void;

  // Simulation lifecycle
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;

  // Visualization navigation
  setRequestedVisualizationView: (view: "topology" | "network" | null) => void;

  // Persistence
  exportCluster: () => string;
  importCluster: (json: string) => void;
}

export const useSimulationStore = create<SimulationState>()(
  persist(
    immer((set, get) => ({
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

      updateGPU: (nodeId, gpuId, updates) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            const gpu = node.gpus.find((g) => g.id === gpuId);
            if (gpu) {
              Object.assign(gpu, updates);
            }
          }
        }),

      updateHCAs: (nodeId, hcas) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.hcas = hcas;
          }
        }),

      updateNodeHealth: (nodeId, health) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.healthStatus = health;
          }
        }),

      addXIDError: (nodeId, gpuId, error) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            const gpu = node.gpus.find((g) => g.id === gpuId);
            if (gpu) {
              gpu.xidErrors.push(error);
            }
          }
        }),

      setMIGMode: (nodeId, gpuId, enabled) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            const gpu = node.gpus.find((g) => g.id === gpuId);
            if (gpu) {
              gpu.migMode = enabled;
              gpu.migInstances = enabled ? gpu.migInstances : [];
            }
          }
        }),

      setSlurmState: (nodeId, slurmState, reason) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.slurmState = slurmState;
            node.slurmReason = reason;
          }
        }),

      // Cross-tool state synchronization
      allocateGPUsForJob: (nodeId, gpuIds, jobId, targetUtilization = 85) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            for (const gpu of node.gpus) {
              if (gpuIds.includes(gpu.id)) {
                gpu.utilization = targetUtilization + (Math.random() * 10 - 5); // Add jitter
                gpu.memoryUsed = Math.floor(
                  gpu.memoryTotal * (0.7 + Math.random() * 0.2),
                );
                gpu.powerDraw = gpu.powerLimit * (0.75 + Math.random() * 0.15);
                gpu.temperature = 65 + Math.random() * 15;
                gpu.allocatedJobId = jobId;
              }
            }
          }
        }),

      deallocateGPUsForJob: (jobId) =>
        set((state) => {
          for (const node of state.cluster.nodes) {
            for (const gpu of node.gpus) {
              if (gpu.allocatedJobId === jobId) {
                gpu.utilization = Math.random() * 5; // Idle utilization
                gpu.memoryUsed = Math.floor(gpu.memoryTotal * 0.01);
                gpu.powerDraw = gpu.powerLimit * 0.15;
                gpu.temperature = 35 + Math.random() * 10;
                gpu.allocatedJobId = undefined;
              }
            }
          }
        }),

      setClusterPowerLimit: (nodeId, limitWatts) =>
        set((state) => {
          const node = state.cluster.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.clusterPowerLimit = limitWatts;
            for (const gpu of node.gpus) {
              gpu.powerLimit = Math.min(
                gpu.powerLimit,
                limitWatts / node.gpus.length,
              );
            }
          }
        }),

      getClusterPowerLimit: (nodeId) => {
        const state = get();
        const node = state.cluster.nodes.find((n) => n.id === nodeId);
        return node?.clusterPowerLimit ?? null;
      },

      // Scenario & Lab actions
      loadScenario: (scenario) => {
        set((state) => {
          state.activeScenario = scenario;
          state.scenarioProgress[scenario.id] = {
            scenarioId: scenario.id,
            startTime: Date.now(),
            completed: false,
            currentStepIndex: 0,
            steps: scenario.steps.map((step) => ({
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
          };

          // Start first step
          const progress = state.scenarioProgress[scenario.id];
          if (progress && progress.steps[0]) {
            progress.steps[0].startTime = Date.now();
          }
        });
      },

      startLab: (labId) => set({ activeLabId: labId }),

      completeScenarioStep: (scenarioId, stepId) =>
        set((state) => {
          const progress = state.scenarioProgress[scenarioId];
          if (!progress) return;

          const stepIndex = progress.steps.findIndex(
            (s) => s.stepId === stepId,
          );
          if (stepIndex === -1) return;

          // Update the step
          progress.steps[stepIndex].completed = true;
          progress.steps[stepIndex].endTime = Date.now();

          // Start next step if exists
          const nextStepIndex = stepIndex + 1;
          if (nextStepIndex < progress.steps.length) {
            progress.steps[nextStepIndex].startTime = Date.now();
          }

          // Check if all steps completed
          const allCompleted = progress.steps.every((s) => s.completed);

          progress.currentStepIndex = Math.min(
            nextStepIndex,
            progress.steps.length - 1,
          );
          progress.completed = allCompleted;
          if (allCompleted) {
            progress.endTime = Date.now();
          }

          if (allCompleted && !state.completedScenarios.includes(scenarioId)) {
            state.completedScenarios.push(scenarioId);
          }
        }),

      exitScenario: () => set({ activeScenario: null }),

      // Hint actions
      revealHint: (scenarioId, stepId, hintId) =>
        set((state) => {
          const progress = state.scenarioProgress[scenarioId];
          if (!progress) return;

          const stepIndex = progress.steps.findIndex(
            (s) => s.stepId === stepId,
          );
          if (stepIndex === -1) return;

          const step = progress.steps[stepIndex];

          // Add hint ID to revealed list if not already there
          if (!step.revealedHintIds.includes(hintId)) {
            step.revealedHintIds.push(hintId);
            step.hintsRevealed += 1;
            progress.hintsUsed += 1;
          }
        }),

      recordCommand: (scenarioId, stepId, command) =>
        set((state) => {
          const progress = state.scenarioProgress[scenarioId];
          if (!progress) return;

          const stepIndex = progress.steps.findIndex(
            (s) => s.stepId === stepId,
          );
          if (stepIndex === -1) return;

          const step = progress.steps[stepIndex];
          step.commandsExecuted.push(command);
          step.lastCommandTime = Date.now();
        }),

      recordFailedAttempt: (scenarioId, stepId) =>
        set((state) => {
          const progress = state.scenarioProgress[scenarioId];
          if (!progress) return;

          const stepIndex = progress.steps.findIndex(
            (s) => s.stepId === stepId,
          );
          if (stepIndex === -1) return;

          progress.steps[stepIndex].failedAttempts += 1;
          progress.validationAttempts += 1;
          progress.validationFailures += 1;
        }),

      // Learning progress integration
      trackToolUsage: (command: string) => {
        const baseCommand = command.split(" ")[0];
        const familyId = toolFamilyMap[baseCommand];
        if (familyId) {
          useLearningProgressStore
            .getState()
            .markToolUsed(familyId, baseCommand);
        }
      },

      // Validation actions
      validateStep: (scenarioId, stepId, result) => {
        const key = `${scenarioId}-${stepId}`;
        const currentState = get();

        set((state) => {
          state.stepValidation[key] = result;
        });

        // Auto-advance if validation passed and config allows
        if (result.passed && currentState.validationConfig.autoAdvance) {
          setTimeout(() => {
            get().completeScenarioStep(scenarioId, stepId);
          }, currentState.validationConfig.autoAdvanceDelay);
        }

        // Record failed attempt if validation failed
        if (!result.passed) {
          get().recordFailedAttempt(scenarioId, stepId);
        }
      },

      clearStepValidation: (scenarioId, stepId) =>
        set((state) => {
          const key = `${scenarioId}-${stepId}`;
          delete state.stepValidation[key];
        }),

      updateValidationConfig: (config) =>
        set((state) => {
          Object.assign(state.validationConfig, config);
        }),

      // Exam actions
      startExam: (examId) =>
        set((state) => {
          state.activeExam = {
            examId,
            startTime: Date.now(),
            timeRemaining: 90 * 60, // 90 minutes in seconds
            answers: new Map(),
            currentQuestionIndex: 0,
            flaggedQuestions: new Set(),
            answeredQuestions: new Set(),
            submitted: false,
          };
        }),

      submitExamAnswer: (questionId, answer) =>
        set((state) => {
          if (!state.activeExam) return;
          state.activeExam.answers.set(questionId, answer);
          state.activeExam.answeredQuestions.add(questionId);
        }),

      endExam: () => {
        const currentState = get();
        if (!currentState.activeExam) return null;

        // This will be implemented with actual scoring logic
        // For now, return a placeholder breakdown
        const breakdown: ExamBreakdown = {
          totalPoints: 35,
          earnedPoints: 0,
          percentage: 0,
          byDomain: {
            domain1: {
              domainName: "Platform Bring-Up",
              questionsTotal: 10,
              questionsCorrect: 0,
              percentage: 0,
              weight: 31,
            },
            domain2: {
              domainName: "Accelerator Configuration",
              questionsTotal: 2,
              questionsCorrect: 0,
              percentage: 0,
              weight: 5,
            },
            domain3: {
              domainName: "Base Infrastructure",
              questionsTotal: 6,
              questionsCorrect: 0,
              percentage: 0,
              weight: 19,
            },
            domain4: {
              domainName: "Validation & Testing",
              questionsTotal: 11,
              questionsCorrect: 0,
              percentage: 0,
              weight: 33,
            },
            domain5: {
              domainName: "Troubleshooting",
              questionsTotal: 4,
              questionsCorrect: 0,
              percentage: 0,
              weight: 12,
            },
          },
          questionResults: [],
          timeSpent: Math.floor(
            (Date.now() - currentState.activeExam.startTime) / 1000,
          ),
        };

        set((state) => {
          if (state.activeExam) {
            state.activeExam.submitted = true;
            state.activeExam.endTime = Date.now();
            state.activeExam.breakdown = breakdown;
          }
        });

        return breakdown;
      },

      exitExam: () => set({ activeExam: null }),

      startSimulation: () => set({ isRunning: true }),
      stopSimulation: () => set({ isRunning: false }),

      resetSimulation: () =>
        set({
          cluster: createDefaultCluster(),
          selectedNode: null,
          isRunning: false,
          simulationSpeed: 1.0,
        }),

      setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

      // Visualization navigation
      setRequestedVisualizationView: (view) =>
        set({ requestedVisualizationView: view }),

      exportCluster: () => {
        const state = get();
        return JSON.stringify(state.cluster, null, 2);
      },

      importCluster: (json) => {
        try {
          const cluster = JSON.parse(json) as ClusterConfig;
          set({ cluster });
        } catch (error) {
          console.error("Failed to import cluster:", error);
        }
      },

      // Lab Panel visibility state
      labPanelVisible: true, // Default to visible

      setLabPanelVisible: (visible: boolean) =>
        set({ labPanelVisible: visible }),

      toggleLabPanel: () =>
        set((state) => {
          state.labPanelVisible = !state.labPanelVisible;
        }),
    })),
    {
      name: "nvidia-simulator-storage",
      partialize: (state) => ({
        cluster: state.cluster,
        simulationSpeed: state.simulationSpeed,
        scenarioProgress: state.scenarioProgress,
        completedScenarios: state.completedScenarios,
      }),
    },
  ),
);
