/**
 * Spaced Repetition Utility Module
 *
 * Implements a simplified SM-2 algorithm for scheduling review sessions.
 * Determines when users should review command families they've learned
 * to ensure long-term retention.
 */

/**
 * Review schedule entry for a command family
 */
export interface ReviewScheduleEntry {
  /** Unique identifier for the command family */
  familyId: string;
  /** Timestamp (ms) when the next review is due */
  nextReviewDate: number;
  /** Current interval in days */
  interval: number;
  /** Number of consecutive successful reviews */
  consecutiveSuccesses: number;
}

/**
 * A review question generated for a command family
 */
export interface ReviewQuestion {
  /** The command family this question is for */
  familyId: string;
  /** The scenario description presented to the user */
  scenario: string;
  /** Array of tool name choices */
  choices: string[];
  /** The correct tool name */
  correctAnswer: string;
  /** Explanation of why this is the correct answer */
  explanation: string;
}

/**
 * Command family definition with tools
 */
export interface CommandFamily {
  /** Unique identifier for the family */
  id: string;
  /** Display name for the family */
  name: string;
  /** Tools in this family */
  tools: Array<{
    /** Tool name */
    name: string;
    /** Description of what the tool is best for */
    bestFor: string;
    /** Short tagline for the tool */
    tagline: string;
  }>;
}

/** Review intervals in days following SM-2 progression */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 120] as const;

/** Milliseconds in a day */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate the next review date and interval based on performance
 *
 * @param lastReviewDate - Timestamp of the last review
 * @param consecutiveSuccesses - Number of consecutive successful reviews
 * @param currentInterval - Current interval in days
 * @returns Object containing next review date timestamp and new interval in days
 *
 * @example
 * ```ts
 * const result = calculateNextReview(Date.now(), 2, 3);
 * // result.newInterval will be 7 (next step after 3)
 * // result.nextReviewDate will be 7 days from now
 * ```
 */
export function calculateNextReview(
  lastReviewDate: number,
  consecutiveSuccesses: number,
  _currentInterval: number,
): { nextReviewDate: number; newInterval: number } {
  // Determine the new interval based on consecutive successes
  // Cap at the maximum interval index
  const intervalIndex = Math.min(
    consecutiveSuccesses,
    REVIEW_INTERVALS.length - 1,
  );
  const newInterval = REVIEW_INTERVALS[intervalIndex];

  // Calculate next review date
  const nextReviewDate = lastReviewDate + newInterval * MS_PER_DAY;

  return {
    nextReviewDate,
    newInterval,
  };
}

/**
 * Get all command families that are due for review
 *
 * @param reviewSchedule - Record mapping family IDs to their review schedule entries
 * @returns Array of family IDs that are due for review, sorted by most overdue first
 *
 * @example
 * ```ts
 * const schedule = {
 *   'family1': { familyId: 'family1', nextReviewDate: Date.now() - 1000, interval: 1, consecutiveSuccesses: 0 },
 *   'family2': { familyId: 'family2', nextReviewDate: Date.now() + 86400000, interval: 1, consecutiveSuccesses: 0 },
 * };
 * const due = getDueReviews(schedule);
 * // Returns ['family1'] since family2 is not yet due
 * ```
 */
export function getDueReviews(
  reviewSchedule: Record<string, ReviewScheduleEntry>,
): string[] {
  const now = Date.now();

  // Filter entries where nextReviewDate <= now
  const dueEntries = Object.values(reviewSchedule).filter(
    (entry) => entry.nextReviewDate <= now,
  );

  // Sort by most overdue first (smallest nextReviewDate first)
  dueEntries.sort((a, b) => a.nextReviewDate - b.nextReviewDate);

  // Return just the family IDs
  return dueEntries.map((entry) => entry.familyId);
}

/**
 * Initialize a new review schedule entry for a command family
 *
 * @param familyId - The unique identifier for the command family
 * @returns A new ReviewScheduleEntry with initial values
 *
 * @example
 * ```ts
 * const entry = initializeReview('container-commands');
 * // entry.nextReviewDate will be 1 day from now
 * // entry.interval will be 1
 * // entry.consecutiveSuccesses will be 0
 * ```
 */
export function initializeReview(familyId: string): ReviewScheduleEntry {
  const now = Date.now();

  return {
    familyId,
    nextReviewDate: now + MS_PER_DAY, // 1 day from now
    interval: 1,
    consecutiveSuccesses: 0,
  };
}

/**
 * Generate a review question for a specific command family
 *
 * Creates a "which tool for this scenario?" style question using
 * the tools from the specified family.
 *
 * @param familyId - The ID of the command family to generate a question for
 * @param commandFamilies - Array of all available command families
 * @returns A ReviewQuestion object, or a placeholder if family not found
 *
 * @example
 * ```ts
 * const families = [{
 *   id: 'networking',
 *   name: 'Networking Commands',
 *   tools: [
 *     { name: 'ping', bestFor: 'testing connectivity', tagline: 'Test network connectivity' },
 *     { name: 'traceroute', bestFor: 'tracing packet routes', tagline: 'Trace network path' },
 *   ]
 * }];
 * const question = generateReviewQuestion('networking', families);
 * // question.scenario might be "You need to test connectivity. Which tool should you use?"
 * // question.choices will contain tool names
 * // question.correctAnswer will be one of the tools
 * ```
 */
export function generateReviewQuestion(
  familyId: string,
  commandFamilies: CommandFamily[],
): ReviewQuestion {
  // Find the command family
  const family = commandFamilies.find((f) => f.id === familyId);

  if (!family || family.tools.length === 0) {
    // Return a placeholder question if family not found
    return {
      familyId,
      scenario: "Command family not found.",
      choices: [],
      correctAnswer: "",
      explanation: "The specified command family could not be found.",
    };
  }

  // Select a random tool from the family to be the correct answer
  const randomIndex = Math.floor(Math.random() * family.tools.length);
  const correctTool = family.tools[randomIndex];

  // Build the scenario based on the tool's bestFor description
  const scenario = `You need to ${correctTool.bestFor}. Which tool from the ${family.name} family should you use?`;

  // Build choices from all tools in the family
  const choices = family.tools.map((tool) => tool.name);

  // Build explanation
  const explanation = `${correctTool.name} is the best choice because it ${correctTool.bestFor}. ${correctTool.tagline}.`;

  return {
    familyId,
    scenario,
    choices,
    correctAnswer: correctTool.name,
    explanation,
  };
}

/**
 * Record the result of a review and update the schedule entry
 *
 * @param entry - The current review schedule entry
 * @param success - Whether the review was successful
 * @returns Updated ReviewScheduleEntry with new interval and next review date
 *
 * @example
 * ```ts
 * const entry = initializeReview('family1');
 * const updated = recordReviewResult(entry, true);
 * // updated.consecutiveSuccesses will be 1
 * // updated.interval will follow the progression
 * ```
 */
export function recordReviewResult(
  entry: ReviewScheduleEntry,
  success: boolean,
): ReviewScheduleEntry {
  const now = Date.now();

  if (success) {
    // On success, increment consecutive successes and calculate next interval
    const newConsecutiveSuccesses = entry.consecutiveSuccesses + 1;
    const { nextReviewDate, newInterval } = calculateNextReview(
      now,
      newConsecutiveSuccesses,
      entry.interval,
    );

    return {
      ...entry,
      nextReviewDate,
      interval: newInterval,
      consecutiveSuccesses: newConsecutiveSuccesses,
    };
  } else {
    // On failure, reset to 1 day interval
    return {
      ...entry,
      nextReviewDate: now + MS_PER_DAY,
      interval: 1,
      consecutiveSuccesses: 0,
    };
  }
}

/**
 * Get the count of reviews due within a time window
 *
 * @param reviewSchedule - Record mapping family IDs to their review schedule entries
 * @param windowMs - Time window in milliseconds (default: 24 hours)
 * @returns Count of reviews due within the window
 */
export function getUpcomingReviewCount(
  reviewSchedule: Record<string, ReviewScheduleEntry>,
  windowMs: number = MS_PER_DAY,
): number {
  const now = Date.now();
  const windowEnd = now + windowMs;

  return Object.values(reviewSchedule).filter(
    (entry) => entry.nextReviewDate <= windowEnd,
  ).length;
}

/**
 * Calculate review statistics for display
 *
 * @param reviewSchedule - Record mapping family IDs to their review schedule entries
 * @returns Statistics about the review schedule
 */
export function getReviewStats(
  reviewSchedule: Record<string, ReviewScheduleEntry>,
): {
  totalFamilies: number;
  dueNow: number;
  dueToday: number;
  longestStreak: number;
  averageInterval: number;
} {
  const entries = Object.values(reviewSchedule);
  const now = Date.now();
  const endOfDay = new Date().setHours(23, 59, 59, 999);

  if (entries.length === 0) {
    return {
      totalFamilies: 0,
      dueNow: 0,
      dueToday: 0,
      longestStreak: 0,
      averageInterval: 0,
    };
  }

  const dueNow = entries.filter((e) => e.nextReviewDate <= now).length;
  const dueToday = entries.filter((e) => e.nextReviewDate <= endOfDay).length;
  const longestStreak = Math.max(...entries.map((e) => e.consecutiveSuccesses));
  const averageInterval =
    entries.reduce((sum, e) => sum + e.interval, 0) / entries.length;

  return {
    totalFamilies: entries.length,
    dueNow,
    dueToday,
    longestStreak,
    averageInterval,
  };
}
