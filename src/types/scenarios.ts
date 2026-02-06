import type { ClusterConfig } from "./hardware";

// ============================================================================
// FAULT INJECTION
// ============================================================================

export type FaultType =
  | "xid-error"
  | "ecc-error"
  | "thermal"
  | "power"
  | "nvlink-failure"
  | "gpu-hang"
  | "memory-full"
  | "driver-error"
  | "pcie-error";

export interface FaultInjectionConfig {
  nodeId: string;
  gpuId?: number;
  type: FaultType;
  severity: "warning" | "critical";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters?: Record<string, any>;
}

// ============================================================================
// VALIDATION
// ============================================================================

export type ValidationType =
  | "command-executed"
  | "output-match"
  | "state-check"
  | "time-limit";

export interface ValidationRule {
  type: ValidationType;
  description: string;

  // For command-executed: list of acceptable commands
  expectedCommands?: string[];

  // NEW: Require ALL expected commands to be executed (not just one)
  requireAllCommands?: boolean;

  // For output-match: regex pattern to match in command output
  outputPattern?: string;

  // For state-check: function name to call on cluster state
  stateCheck?:
    | "gpu-healthy"
    | "nvlink-active"
    | "slurm-online"
    | "temperature-normal"
    | "ecc-cleared";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateParams?: Record<string, any>;

  // For time-limit: max seconds allowed
  maxSeconds?: number;
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  timestamp: number;
  rule?: ValidationRule;
}

// ============================================================================
// SCENARIOS & LABS
// ============================================================================

// ============================================================================
// HINTS SYSTEM
// ============================================================================

export type HintTriggerType =
  | "manual" // User clicks hint button
  | "time-based" // After N seconds of inactivity
  | "attempt-based" // After N failed attempts
  | "command-based"; // After specific wrong command

export interface HintTrigger {
  type: HintTriggerType;

  // For time-based: seconds of inactivity before showing
  timeSeconds?: number;

  // For attempt-based: number of failed validation attempts
  attemptCount?: number;

  // For command-based: pattern that triggers this hint
  commandPattern?: string;
}

export interface Hint {
  id: string;
  level: number; // 1 = gentle nudge, 2 = more specific, 3 = very specific
  message: string;

  // When this hint becomes available
  trigger: HintTrigger;

  // Optional: only show if certain conditions met
  condition?: {
    // Only show if these commands haven't been run yet
    commandsNotExecuted?: string[];

    // Only show if validation rule not passed
    validationNotPassed?: string; // validation rule description
  };
}

export interface ScenarioStep {
  id: string;
  title: string;
  description: string;
  objectives: string[];

  // Expected commands user should run (for validation)
  expectedCommands?: string[];

  // Validation rules to check step completion
  validationRules?: ValidationRule[];

  // Enhanced validation criteria (new system)
  validationCriteria?: {
    minimumScore?: number; // Minimum percentage to pass (0-100, defaults to 100)
    rules?: Array<{
      id: string;
      type: "command" | "output" | "state" | "sequence";
      pattern?: string | RegExp;
      commandPattern?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stateCheck?: (context: any) => boolean;
      sequence?: string[];
      errorMessage?: string;
      weight?: number;
    }>;
  };

  // Progressive hints (revealed one at a time if user is stuck)
  // Legacy: simple string array
  hints?: string[];

  // Enhanced hints with intelligent triggering
  enhancedHints?: Hint[];

  // Estimated time to complete this step (minutes)
  estimatedDuration: number;

  // Documentation links
  documentationLinks?: Array<{
    title: string;
    url: string;
  }>;
}

export interface Scenario {
  id: string;
  title: string;
  domain: "domain1" | "domain2" | "domain3" | "domain4" | "domain5";
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  learningObjectives: string[];

  // Faults to inject when scenario loads
  faults: FaultInjectionConfig[];

  // Initial cluster state (if different from default)
  initialClusterState?: Partial<ClusterConfig>;

  // Step-by-step instructions
  steps: ScenarioStep[];

  // Overall success criteria (all must pass)
  successCriteria: string[];

  // Total estimated time (minutes)
  estimatedTime: number;

  // Prerequisites (other scenario IDs)
  prerequisites?: string[];

  // Tags for filtering/search
  tags?: string[];

  // Learning system fields
  tier?: 1 | 2 | 3;
  commandFamilies?: string[];
  prerequisiteSkills?: string[];
  cumulativeSkills?: string[];
  explanationGateId?: string;
  toolHints?: boolean;
}

export interface Lab {
  id: string;
  domain: "domain1" | "domain2" | "domain3" | "domain4" | "domain5";
  title: string;
  description: string;
  scenarios: Scenario[];
  order: number;

  // Domain-specific metadata
  domainWeight: number; // Percentage weight in NCP-AII exam (e.g., 31 for Domain 1)
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

export interface StepProgress {
  stepId: string;
  startTime: number;
  endTime?: number;
  completed: boolean;
  validationsPassed: number;
  validationsTotal: number;
  hintsRevealed: number;
  commandsExecuted: string[];

  // Enhanced hint tracking
  lastCommandTime?: number; // Timestamp of last command for time-based hints
  failedAttempts: number; // For attempt-based hints
  revealedHintIds: string[]; // IDs of enhanced hints already revealed
}

export interface ScenarioProgress {
  scenarioId: string;
  startTime: number;
  endTime?: number;
  completed: boolean;
  currentStepIndex: number;
  steps: StepProgress[];

  // Performance metrics
  totalTimeSpent: number; // seconds
  hintsUsed: number;
  validationAttempts: number;
  validationFailures: number;
}

export interface LabProgress {
  labId: string;
  scenariosCompleted: number;
  scenariosTotal: number;
  scenarios: Map<string, ScenarioProgress>;
}

// ============================================================================
// PRACTICE EXAM
// ============================================================================

export type QuestionType =
  | "multiple-choice"
  | "multiple-select"
  | "true-false"
  | "practical";

export interface ExamQuestion {
  id: string;
  domain: "domain1" | "domain2" | "domain3" | "domain4" | "domain5";
  questionText: string;
  type: QuestionType;

  // For multiple-choice/multiple-select/true-false
  choices?: string[];

  // Correct answer (choice index for single, array of indices for multiple-select)
  correctAnswer: number | number[] | string;

  // Explanation shown after submission
  explanation: string;

  // Point value
  points: number;

  // Difficulty for balanced question selection
  difficulty: "beginner" | "intermediate" | "advanced";

  // For practical questions: scenario to load
  practicalScenarioId?: string;
}

export interface PracticeExam {
  id: string;
  title: string;
  description: string;

  // Time limit (minutes)
  duration: number;

  // Passing score (percentage)
  passingScore: number;

  // Question pool (will be randomized/sampled)
  questions: ExamQuestion[];

  // Practical scenarios included
  practicalScenarios?: Scenario[];

  // Domain weighting (ensures proper distribution)
  domainWeights: {
    domain1: number; // 31%
    domain2: number; // 5%
    domain3: number; // 19%
    domain4: number; // 33%
    domain5: number; // 12%
  };
}

export interface ExamState {
  examId: string;
  startTime: number;
  endTime?: number;
  timeRemaining: number; // seconds

  // User answers (questionId -> answer)
  answers: Record<string, number | number[] | string>;

  // Question navigation state
  currentQuestionIndex: number;
  flaggedQuestions: string[];
  answeredQuestions: string[];

  // Results (after submission)
  submitted: boolean;
  score?: number;
  passed?: boolean;
  breakdown?: ExamBreakdown;
}

export interface ExamBreakdown {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;

  // Performance by domain
  byDomain: {
    domain1: DomainPerformance;
    domain2: DomainPerformance;
    domain3: DomainPerformance;
    domain4: DomainPerformance;
    domain5: DomainPerformance;
  };

  // Question-level results
  questionResults: Array<{
    questionId: string;
    correct: boolean;
    userAnswer: number | number[] | string;
    correctAnswer: number | number[] | string;
    points: number;
  }>;

  // Time spent
  timeSpent: number; // seconds
}

export interface DomainPerformance {
  domainName: string;
  questionsTotal: number;
  questionsCorrect: number;
  percentage: number;
  weight: number; // Exam weight percentage
}

// ============================================================================
// OVERALL PROGRESS & ACHIEVEMENTS
// ============================================================================

export interface UserProgress {
  // Lab progress
  labs: Map<string, LabProgress>;

  // Completed scenarios
  completedScenarios: Set<string>;

  // Exam attempts
  examAttempts: ExamAttempt[];

  // Statistics
  totalTimeSpent: number; // seconds
  scenariosCompleted: number;
  scenariosTotal: number;

  // Certification readiness (0-100)
  readinessScore: number;
}

export interface ExamAttempt {
  examId: string;
  timestamp: number;
  score: number;
  passed: boolean;
  timeSpent: number;
  breakdown: ExamBreakdown;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DomainId =
  | "domain1"
  | "domain2"
  | "domain3"
  | "domain4"
  | "domain5";

export interface DomainInfo {
  id: DomainId;
  title: string;
  description: string;
  weight: number; // Exam weight percentage
  color: string; // UI color theme
}

// ─── Narrative Scenario Types ───────────────────────────────────

export interface NarrativeScenario {
  id: string;
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  narrative: {
    hook: string;
    setting: string;
    resolution: string;
  };
  commandFamilies: string[];
  estimatedMinutes: number;
  tier?: 1 | 2 | 3;
  faults?: FaultInjectionConfig[];
  steps: NarrativeStep[];
}

export interface NarrativeStep {
  id: string;
  situation: string;
  task: string;
  expectedCommands: string[];
  hints: string[];
  validation: {
    type: "command" | "output" | "state";
    command?: string;
    pattern?: string;
  };
  quiz?: NarrativeQuiz;
}

export interface NarrativeQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface NarrativeScenariosFile {
  scenarios: NarrativeScenario[];
}

export const DOMAINS: Record<DomainId, DomainInfo> = {
  domain1: {
    id: "domain1",
    title: "Domain 1: Platform Bring-Up",
    description: "Server POST, BIOS, BMC, drivers, firmware",
    weight: 31,
    color: "blue",
  },
  domain2: {
    id: "domain2",
    title: "Domain 2: Accelerator Configuration",
    description: "BlueField DPU, MIG, NVLink, GPU topology",
    weight: 5,
    color: "green",
  },
  domain3: {
    id: "domain3",
    title: "Domain 3: Base Infrastructure",
    description: "BCM, HA, Slurm, containers, storage",
    weight: 19,
    color: "purple",
  },
  domain4: {
    id: "domain4",
    title: "Domain 4: Validation & Testing",
    description: "NCCL, DCGMI, health checks, benchmarks",
    weight: 33,
    color: "orange",
  },
  domain5: {
    id: "domain5",
    title: "Domain 5: Troubleshooting",
    description: "XID errors, thermal, NVLink, performance",
    weight: 12,
    color: "red",
  },
};
