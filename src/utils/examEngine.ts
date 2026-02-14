import type {
  ExamQuestion,
  ExamBreakdown,
  DomainPerformance,
  DomainId,
} from "@/types/scenarios";
import { logger } from "@/utils/logger";

/**
 * Exam modes for different study scenarios
 */
export type ExamMode =
  | "full-practice" // 90 min, 60 questions, domain-weighted
  | "quick-quiz" // 15 min, 15 questions
  | "domain-test" // All questions from one domain
  | "weak-area-focus" // Auto-generated from performance history
  | "review-mode"; // Review previous attempt's wrong answers

/**
 * Configuration for each exam mode
 */
export interface ExamModeConfig {
  mode: ExamMode;
  name: string;
  description: string;
  questionCount: number;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  showExplanations: "never" | "after-answer" | "after-exam";
  domain?: DomainId; // For domain-test mode
  weakDomains?: DomainId[]; // For weak-area-focus mode
  reviewQuestionIds?: string[]; // For review mode
}

/**
 * Predefined exam mode configurations
 */
export const EXAM_MODE_CONFIGS: Record<
  ExamMode,
  Omit<ExamModeConfig, "domain" | "weakDomains" | "reviewQuestionIds">
> = {
  "full-practice": {
    mode: "full-practice",
    name: "Full Practice Exam",
    description: "Complete 60-question exam with domain weighting (90 minutes)",
    questionCount: 60,
    timeLimitMinutes: 90,
    shuffleQuestions: true,
    showExplanations: "after-exam",
  },
  "quick-quiz": {
    mode: "quick-quiz",
    name: "Quick Quiz",
    description: "Fast 15-question review across all domains (15 minutes)",
    questionCount: 15,
    timeLimitMinutes: 15,
    shuffleQuestions: true,
    showExplanations: "after-answer",
  },
  "domain-test": {
    mode: "domain-test",
    name: "Domain Focus",
    description: "All questions from a single domain (no time limit)",
    questionCount: -1, // Will be set based on domain
    timeLimitMinutes: 0, // No limit
    shuffleQuestions: true,
    showExplanations: "after-answer",
  },
  "weak-area-focus": {
    mode: "weak-area-focus",
    name: "Weak Area Focus",
    description: "Questions from domains where you scored below 70%",
    questionCount: 20,
    timeLimitMinutes: 30,
    shuffleQuestions: true,
    showExplanations: "after-answer",
  },
  "review-mode": {
    mode: "review-mode",
    name: "Review Mistakes",
    description: "Review questions you answered incorrectly",
    questionCount: -1, // Will be set based on mistakes
    timeLimitMinutes: 0, // No limit
    shuffleQuestions: false,
    showExplanations: "after-answer",
  },
};

/**
 * Domain names and their descriptions
 */
export const DOMAIN_INFO: Record<
  DomainId,
  { name: string; weight: number; description: string }
> = {
  domain1: {
    name: "Platform Bring-Up",
    weight: 31,
    description:
      "Hardware verification, BIOS, BMC, drivers, and POST procedures",
  },
  domain2: {
    name: "Accelerator Configuration",
    weight: 5,
    description: "GPU configuration, MIG, NVLink, and accelerator setup",
  },
  domain3: {
    name: "Base Infrastructure",
    weight: 19,
    description: "Slurm, containers, storage, and network configuration",
  },
  domain4: {
    name: "Validation & Testing",
    weight: 33,
    description: "DCGM, benchmarks, health checks, and performance validation",
  },
  domain5: {
    name: "Troubleshooting",
    weight: 12,
    description:
      "Error diagnosis, XID codes, thermal issues, and problem resolution",
  },
};

/**
 * Select questions based on exam mode
 */
export function selectQuestionsForMode(
  allQuestions: ExamQuestion[],
  config: ExamModeConfig,
): ExamQuestion[] {
  let selectedQuestions: ExamQuestion[];

  switch (config.mode) {
    case "full-practice":
      selectedQuestions = selectExamQuestions(
        allQuestions,
        config.questionCount,
      );
      break;

    case "quick-quiz":
      // Quick quiz: proportional sampling from all domains
      selectedQuestions = selectExamQuestions(
        allQuestions,
        config.questionCount,
      );
      break;

    case "domain-test":
      // All questions from the specified domain
      if (!config.domain) {
        throw new Error("Domain must be specified for domain-test mode");
      }
      selectedQuestions = allQuestions.filter(
        (q) => q.domain === config.domain,
      );
      break;

    case "weak-area-focus": {
      // Questions from weak domains
      if (!config.weakDomains || config.weakDomains.length === 0) {
        // Default to domain4 and domain5 if no weak areas specified
        config.weakDomains = ["domain4", "domain5"];
      }
      const weakQuestions = allQuestions.filter((q) =>
        config.weakDomains!.includes(q.domain),
      );
      selectedQuestions = shuffleArray(weakQuestions).slice(
        0,
        config.questionCount,
      );
      break;
    }

    case "review-mode": {
      // Questions that were answered incorrectly
      if (!config.reviewQuestionIds || config.reviewQuestionIds.length === 0) {
        return [];
      }
      const reviewSet = new Set(config.reviewQuestionIds);
      selectedQuestions = allQuestions.filter((q) => reviewSet.has(q.id));
      break;
    }

    default:
      selectedQuestions = selectExamQuestions(allQuestions, 35);
  }

  // Shuffle if configured
  if (config.shuffleQuestions && config.mode !== "review-mode") {
    selectedQuestions = shuffleArray(selectedQuestions);
  }

  return selectedQuestions;
}

/**
 * Create exam configuration for a specific mode
 */
export function createExamConfig(
  mode: ExamMode,
  options?: {
    domain?: DomainId;
    weakDomains?: DomainId[];
    reviewQuestionIds?: string[];
  },
): ExamModeConfig {
  const baseConfig = EXAM_MODE_CONFIGS[mode];

  return {
    ...baseConfig,
    domain: options?.domain,
    weakDomains: options?.weakDomains,
    reviewQuestionIds: options?.reviewQuestionIds,
  };
}

/**
 * Get questions that were answered incorrectly from an exam breakdown
 */
export function getIncorrectQuestionIds(breakdown: ExamBreakdown): string[] {
  return breakdown.questionResults
    .filter((r) => !r.correct)
    .map((r) => r.questionId);
}

/**
 * Get domains below a threshold score
 */
export function getWeakDomainsFromHistory(
  breakdowns: ExamBreakdown[],
  threshold: number = 70,
): DomainId[] {
  // Aggregate scores across all exams
  const domainScores: Record<DomainId, { total: number; correct: number }> = {
    domain1: { total: 0, correct: 0 },
    domain2: { total: 0, correct: 0 },
    domain3: { total: 0, correct: 0 },
    domain4: { total: 0, correct: 0 },
    domain5: { total: 0, correct: 0 },
  };

  breakdowns.forEach((breakdown) => {
    (Object.keys(breakdown.byDomain) as DomainId[]).forEach((domain) => {
      const perf = breakdown.byDomain[domain];
      domainScores[domain].total += perf.questionsTotal;
      domainScores[domain].correct += perf.questionsCorrect;
    });
  });

  // Find domains below threshold
  const weakDomains: DomainId[] = [];
  (Object.keys(domainScores) as DomainId[]).forEach((domain) => {
    const stats = domainScores[domain];
    if (stats.total > 0) {
      const percentage = (stats.correct / stats.total) * 100;
      if (percentage < threshold) {
        weakDomains.push(domain);
      }
    }
  });

  return weakDomains;
}

/**
 * Format time remaining for display
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate estimated time per question
 */
export function getEstimatedTimePerQuestion(
  totalQuestions: number,
  timeLimitMinutes: number,
): number {
  if (timeLimitMinutes <= 0) return 0;
  return Math.floor((timeLimitMinutes * 60) / totalQuestions);
}

/**
 * Loads exam questions from JSON file
 */
export async function loadExamQuestions(): Promise<ExamQuestion[]> {
  try {
    const mod = await import("../data/examQuestions.json");
    return (mod.default.questions || []) as ExamQuestion[];
  } catch (error) {
    logger.error("Error loading exam questions:", error);
    return [];
  }
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Selects questions according to domain weighting
 */
export function selectExamQuestions(
  allQuestions: ExamQuestion[],
  totalQuestions: number = 35,
): ExamQuestion[] {
  // Group questions by domain
  const questionsByDomain: Record<DomainId, ExamQuestion[]> = {
    domain1: [],
    domain2: [],
    domain3: [],
    domain4: [],
    domain5: [],
  };

  allQuestions.forEach((q) => {
    questionsByDomain[q.domain].push(q);
  });

  // Domain weights from NCP-AII specification
  const domainWeights: Record<DomainId, number> = {
    domain1: 0.31, // 31%
    domain2: 0.05, // 5%
    domain3: 0.19, // 19%
    domain4: 0.33, // 33%
    domain5: 0.12, // 12%
  };

  // Calculate question count per domain
  const questionsPerDomain: Record<DomainId, number> = {
    domain1: Math.round(totalQuestions * domainWeights.domain1),
    domain2: Math.max(1, Math.round(totalQuestions * domainWeights.domain2)), // At least 1
    domain3: Math.round(totalQuestions * domainWeights.domain3),
    domain4: Math.round(totalQuestions * domainWeights.domain4),
    domain5: Math.round(totalQuestions * domainWeights.domain5),
  };

  // Adjust to ensure total is exactly the target
  const currentTotal = Object.values(questionsPerDomain).reduce(
    (a, b) => a + b,
    0,
  );
  const diff = totalQuestions - currentTotal;
  if (diff !== 0) {
    // Add/remove from domain4 (largest domain)
    questionsPerDomain.domain4 += diff;
  }

  // Select and shuffle questions from each domain
  const selectedQuestions: ExamQuestion[] = [];

  (Object.keys(questionsPerDomain) as DomainId[]).forEach((domain) => {
    const available = questionsByDomain[domain];
    const needed = questionsPerDomain[domain];

    if (available.length < needed) {
      logger.warn(
        `Not enough questions for ${domain}: have ${available.length}, need ${needed}`,
      );
    }

    const shuffled = shuffleArray(available);
    const selected = shuffled.slice(0, Math.min(needed, available.length));
    selectedQuestions.push(...selected);
  });

  // Shuffle the final question order
  return shuffleArray(selectedQuestions);
}

/**
 * Checks if an answer is correct
 */
function isAnswerCorrect(
  question: ExamQuestion,
  userAnswer: number | number[] | string,
): boolean {
  const correctAnswer = question.correctAnswer;

  if (question.type === "multiple-select") {
    // Both should be arrays
    if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
      return false;
    }

    // Check if arrays have same length and same elements (order doesn't matter)
    if (userAnswer.length !== correctAnswer.length) {
      return false;
    }

    const sortedUser = [...userAnswer].sort();
    const sortedCorrect = [...correctAnswer].sort();

    return sortedUser.every((val, idx) => val === sortedCorrect[idx]);
  }

  // For single answer questions (multiple-choice, true-false)
  return userAnswer === correctAnswer;
}

/**
 * Calculates exam score and generates detailed breakdown
 */
export function calculateExamScore(
  questions: ExamQuestion[],
  answers: Record<string, number | number[] | string>,
): ExamBreakdown {
  let totalPoints = 0;
  let earnedPoints = 0;

  const domainStats: Record<
    DomainId,
    { total: number; correct: number; weight: number }
  > = {
    domain1: { total: 0, correct: 0, weight: 31 },
    domain2: { total: 0, correct: 0, weight: 5 },
    domain3: { total: 0, correct: 0, weight: 19 },
    domain4: { total: 0, correct: 0, weight: 33 },
    domain5: { total: 0, correct: 0, weight: 12 },
  };

  const domainNames: Record<DomainId, string> = {
    domain1: "Platform Bring-Up",
    domain2: "Accelerator Configuration",
    domain3: "Base Infrastructure",
    domain4: "Validation & Testing",
    domain5: "Troubleshooting",
  };

  const questionResults: ExamBreakdown["questionResults"] = [];

  questions.forEach((question) => {
    totalPoints += question.points;
    domainStats[question.domain].total++;

    const userAnswer = answers[question.id];
    const correct =
      userAnswer !== undefined && isAnswerCorrect(question, userAnswer);

    if (correct) {
      earnedPoints += question.points;
      domainStats[question.domain].correct++;
    }

    questionResults.push({
      questionId: question.id,
      correct,
      userAnswer: userAnswer || "",
      correctAnswer: question.correctAnswer,
      points: question.points,
    });
  });

  const percentage =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // Build domain performance breakdown
  const byDomain: ExamBreakdown["byDomain"] = {
    domain1: createDomainPerformance("domain1", domainNames, domainStats),
    domain2: createDomainPerformance("domain2", domainNames, domainStats),
    domain3: createDomainPerformance("domain3", domainNames, domainStats),
    domain4: createDomainPerformance("domain4", domainNames, domainStats),
    domain5: createDomainPerformance("domain5", domainNames, domainStats),
  };

  return {
    totalPoints,
    earnedPoints,
    percentage,
    byDomain,
    questionResults,
    timeSpent: 0, // Will be set by caller
  };
}

function createDomainPerformance(
  domainId: DomainId,
  domainNames: Record<DomainId, string>,
  domainStats: Record<
    DomainId,
    { total: number; correct: number; weight: number }
  >,
): DomainPerformance {
  const stats = domainStats[domainId];
  const percentage =
    stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return {
    domainName: domainNames[domainId],
    questionsTotal: stats.total,
    questionsCorrect: stats.correct,
    percentage,
    weight: stats.weight,
  };
}

/**
 * Determines if exam is passed based on score
 */
export function isExamPassed(
  breakdown: ExamBreakdown,
  passingScore: number = 70,
): boolean {
  return breakdown.percentage >= passingScore;
}

/**
 * Generates a summary message for exam results
 */
export function getExamResultSummary(
  breakdown: ExamBreakdown,
  passed: boolean,
): string {
  const { percentage, totalPoints, earnedPoints, timeSpent } = breakdown;

  const timeMinutes = Math.floor(timeSpent / 60);
  const timeSeconds = timeSpent % 60;

  let summary = passed
    ? `Congratulations! You passed the NCP-AII Practice Exam!\n\n`
    : `You did not pass the NCP-AII Practice Exam.\n\n`;

  summary += `Score: ${earnedPoints}/${totalPoints} points (${percentage}%)\n`;
  summary += `Passing Score: 70%\n`;
  summary += `Time: ${timeMinutes}m ${timeSeconds}s\n\n`;

  summary += `Performance by Domain:\n`;
  Object.values(breakdown.byDomain).forEach((domain) => {
    const icon = domain.percentage >= 70 ? "✓" : "✗";
    summary += `  ${icon} ${domain.domainName}: ${domain.questionsCorrect}/${domain.questionsTotal} (${domain.percentage}%)\n`;
  });

  return summary;
}

/**
 * Gets weak domains that need improvement
 */
export function getWeakDomains(
  breakdown: ExamBreakdown,
  threshold: number = 70,
): DomainPerformance[] {
  return Object.values(breakdown.byDomain)
    .filter((domain) => domain.percentage < threshold)
    .sort((a, b) => a.percentage - b.percentage);
}

/**
 * Timer class for exam duration tracking
 */
export class ExamTimer {
  private startTime: number;
  private durationSeconds: number;
  private intervalId: number | null = null;
  private onTick?: (remaining: number) => void;
  private onExpire?: () => void;

  constructor(durationSeconds: number) {
    this.startTime = Date.now();
    this.durationSeconds = durationSeconds;
  }

  start(onTick?: (remaining: number) => void, onExpire?: () => void): void {
    this.onTick = onTick;
    this.onExpire = onExpire;

    this.intervalId = window.setInterval(() => {
      const remaining = this.getTimeRemaining();

      if (remaining <= 0) {
        this.stop();
        if (this.onExpire) {
          this.onExpire();
        }
      } else if (this.onTick) {
        this.onTick(remaining);
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getTimeRemaining(): number {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    return Math.max(0, this.durationSeconds - elapsed);
  }

  getTimeElapsed(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  formatTimeRemaining(): string {
    const remaining = this.getTimeRemaining();
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
