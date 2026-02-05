// Quiz Questions types and interfaces for the "When to Use" tool selection quizzes
// These types define the structure of scenario-based questions testing tool selection knowledge

import type { CommandFamilyId } from "./commandFamilies";

/**
 * Difficulty level of a quiz question
 */
export type QuizDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Explanation for why a tool is not the correct answer
 */
export interface WhyNotOther {
  /** Tool name */
  tool: string;
  /** Reason why this tool is not the best choice for the scenario */
  reason: string;
}

/**
 * Individual quiz question testing tool selection
 */
export interface QuizQuestion {
  /** Unique identifier for the question (e.g., "gpu-mon-q1") */
  id: string;
  /** Command family this question belongs to */
  familyId: CommandFamilyId;
  /** Scenario description presenting the situation */
  scenario: string;
  /** Array of 4 tool name choices */
  choices: string[];
  /** The correct tool name */
  correctAnswer: string;
  /** Other acceptable correct answers if applicable */
  acceptableAnswers?: string[];
  /** Explanation of why the correct answer is best */
  explanation: string;
  /** Explanations for why other choices are suboptimal */
  whyNotOthers: WhyNotOther[];
  /** Difficulty level of the question */
  difficulty: QuizDifficulty;
}

/**
 * Root structure of the quizQuestions.json file
 */
export interface QuizQuestionsData {
  questions: QuizQuestion[];
}

/**
 * Quiz result for a single question
 */
export interface QuizQuestionResult {
  /** Question ID */
  questionId: string;
  /** User's selected answer */
  selectedAnswer: string;
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** Time taken to answer in seconds */
  timeSpent?: number;
}

/**
 * Overall quiz session result
 */
export interface QuizSessionResult {
  /** Session identifier */
  sessionId: string;
  /** Family ID if quiz was family-specific, null for mixed */
  familyId: CommandFamilyId | null;
  /** Individual question results */
  questionResults: QuizQuestionResult[];
  /** Total score (correct answers) */
  score: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Percentage score */
  percentageScore: number;
  /** Total time taken in seconds */
  totalTime: number;
  /** Timestamp when quiz was completed */
  completedAt: string;
}
