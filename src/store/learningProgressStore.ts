/**
 * Learning Progress Store - Tracks learning progress for the tiered learning system
 *
 * This store manages:
 * - Command family tool usage tracking
 * - Tier unlocking and progress
 * - Explanation gate results
 * - Spaced repetition scheduling
 *
 * Uses Zustand for state management with localStorage persistence.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  useTierNotificationStore,
  FAMILY_METADATA,
} from "./tierNotificationStore";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Command families available in the system
 */
export type CommandFamilyId =
  | "gpu-monitoring"
  | "infiniband-tools"
  | "bmc-hardware"
  | "cluster-tools"
  | "container-tools"
  | "diagnostics";

/**
 * Quiz result for a command family
 */
export interface FamilyQuizResult {
  passed: boolean;
  score: number;
  attempts: number;
}

/**
 * Progress within each tier of a command family
 */
export interface TierProgress {
  tier1Completed: number;
  tier2Completed: number;
  tier3Completed: number;
}

/**
 * Result from an explanation gate assessment
 */
export interface ExplanationGateResult {
  passed: boolean;
  scenarioId: string;
}

/**
 * Spaced repetition review schedule for a command family
 */
export interface ReviewScheduleEntry {
  familyId: string;
  nextReviewDate: number;
  interval: number;
  consecutiveSuccesses: number;
}

/**
 * Core state shape for learning progress
 */
export interface LearningProgressData {
  // Command Family Progress - which tools user has used per family
  toolsUsed: Record<string, string[]>; // familyId -> tool names (array for persistence)
  familyQuizScores: Record<string, FamilyQuizResult>;

  // Tier Unlocking
  unlockedTiers: Record<string, number>; // familyId -> highest unlocked tier (1, 2, or 3)
  tierProgress: Record<string, TierProgress>;

  // Explanation Gates
  explanationGateResults: Record<string, ExplanationGateResult>;

  // Spaced Repetition
  reviewSchedule: Record<string, ReviewScheduleEntry>;

}

/**
 * Full store state including actions
 */
export interface LearningProgressState extends LearningProgressData {
  // Tool usage tracking
  markToolUsed: (familyId: string, toolName: string) => void;

  // Quiz tracking
  completeQuiz: (familyId: string, passed: boolean, score: number) => void;

  // Tier progress
  updateTierProgress: (
    familyId: string,
    tier: number,
    scenarioId: string,
  ) => void;
  checkTierUnlock: (familyId: string) => number;

  // Explanation gates
  recordExplanationGate: (
    gateId: string,
    scenarioId: string,
    passed: boolean,
  ) => void;

  // Spaced repetition
  scheduleReview: (familyId: string) => void;
  recordReviewResult: (familyId: string, success: boolean) => void;
  getDueReviews: () => string[];

  // Utility
  resetProgress: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Number of scenarios required to complete each tier */
const TIER_COMPLETION_THRESHOLD = 3;

/** Initial review interval in days for spaced repetition */
const INITIAL_REVIEW_INTERVAL_DAYS = 1;

/** Maximum review interval in days */
const MAX_REVIEW_INTERVAL_DAYS = 30;

/** Multiplier for interval on successful review */
const INTERVAL_MULTIPLIER = 2;

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: LearningProgressData = {
  toolsUsed: {},
  familyQuizScores: {},
  unlockedTiers: {},
  tierProgress: {},
  explanationGateResults: {},
  reviewSchedule: {},
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates the default tier progress object for a family
 */
function createDefaultTierProgress(): TierProgress {
  return {
    tier1Completed: 0,
    tier2Completed: 0,
    tier3Completed: 0,
  };
}

/**
 * Calculates the next review date based on current interval
 * @param intervalDays - Current interval in days
 * @returns Timestamp for next review
 */
function calculateNextReviewDate(intervalDays: number): number {
  return Date.now() + intervalDays * MS_PER_DAY;
}

/**
 * Calculates the new interval after a successful review
 * Uses exponential backoff with a maximum cap
 * @param currentInterval - Current interval in days
 * @returns New interval in days
 */
function calculateNewInterval(currentInterval: number): number {
  const newInterval = currentInterval * INTERVAL_MULTIPLIER;
  return Math.min(newInterval, MAX_REVIEW_INTERVAL_DAYS);
}

// ============================================================================
// STORE
// ============================================================================

export const useLearningProgressStore = create<LearningProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Marks a tool as used within a command family
       * Tools are tracked to measure exploration and unlock requirements
       */
      markToolUsed: (familyId: string, toolName: string): void => {
        set((state) => {
          const currentTools = state.toolsUsed[familyId] || [];

          // Don't add duplicates
          if (currentTools.includes(toolName)) {
            return state;
          }

          return {
            toolsUsed: {
              ...state.toolsUsed,
              [familyId]: [...currentTools, toolName],
            },
          };
        });
      },

      /**
       * Records the completion of a family quiz
       * Tracks pass/fail status, score, and attempt count
       */
      completeQuiz: (
        familyId: string,
        passed: boolean,
        score: number,
      ): void => {
        set((state) => {
          const existing = state.familyQuizScores[familyId];
          const attempts = existing ? existing.attempts + 1 : 1;

          return {
            familyQuizScores: {
              ...state.familyQuizScores,
              [familyId]: {
                passed: passed || (existing?.passed ?? false), // Once passed, stays passed
                score: Math.max(score, existing?.score ?? 0), // Keep best score
                attempts,
              },
            },
          };
        });
      },

      /**
       * Updates progress for a specific tier within a command family
       * Automatically checks and unlocks higher tiers when threshold is met
       * Triggers a celebratory notification when a new tier is unlocked
       */
      updateTierProgress: (
        familyId: string,
        tier: number,
        _scenarioId: string,
      ): void => {
        // Get current tier before update to detect new unlocks
        const currentState = get();
        const previousTier = currentState.unlockedTiers[familyId] || 1;

        set((state) => {
          const progress =
            state.tierProgress[familyId] || createDefaultTierProgress();
          const tierKey = `tier${tier}Completed` as keyof TierProgress;

          const updatedProgress = {
            ...progress,
            [tierKey]: progress[tierKey] + 1,
          };

          // Check for tier unlock
          const currentUnlockedTier = state.unlockedTiers[familyId] || 1;
          let newUnlockedTier = currentUnlockedTier;

          // Unlock tier 2 if tier 1 threshold met
          if (
            tier === 1 &&
            updatedProgress.tier1Completed >= TIER_COMPLETION_THRESHOLD &&
            currentUnlockedTier < 2
          ) {
            newUnlockedTier = 2;
          }

          // Unlock tier 3 if tier 2 threshold met
          if (
            tier === 2 &&
            updatedProgress.tier2Completed >= TIER_COMPLETION_THRESHOLD &&
            currentUnlockedTier < 3
          ) {
            newUnlockedTier = 3;
          }

          return {
            tierProgress: {
              ...state.tierProgress,
              [familyId]: updatedProgress,
            },
            unlockedTiers: {
              ...state.unlockedTiers,
              [familyId]: newUnlockedTier,
            },
          };
        });

        // Trigger notification if a new tier was unlocked
        const updatedState = get();
        const newTier = updatedState.unlockedTiers[familyId] || 1;
        if (newTier > previousTier) {
          const familyMeta = FAMILY_METADATA[familyId];
          if (familyMeta) {
            useTierNotificationStore
              .getState()
              .addNotification(
                familyId,
                familyMeta.name,
                familyMeta.icon,
                newTier,
              );
          }
        }
      },

      /**
       * Returns the highest unlocked tier for a command family
       * Defaults to tier 1 if no progress exists
       */
      checkTierUnlock: (familyId: string): number => {
        const state = get();
        return state.unlockedTiers[familyId] || 1;
      },

      /**
       * Records the result of an explanation gate assessment
       */
      recordExplanationGate: (
        gateId: string,
        scenarioId: string,
        passed: boolean,
      ): void => {
        set((state) => ({
          explanationGateResults: {
            ...state.explanationGateResults,
            [gateId]: { passed, scenarioId },
          },
        }));
      },

      /**
       * Schedules a new spaced repetition review for a command family
       * Initializes with the default interval
       */
      scheduleReview: (familyId: string): void => {
        set((state) => ({
          reviewSchedule: {
            ...state.reviewSchedule,
            [familyId]: {
              familyId,
              nextReviewDate: calculateNextReviewDate(
                INITIAL_REVIEW_INTERVAL_DAYS,
              ),
              interval: INITIAL_REVIEW_INTERVAL_DAYS,
              consecutiveSuccesses: 0,
            },
          },
        }));
      },

      /**
       * Records the result of a spaced repetition review
       * On success: increases interval using exponential backoff
       * On failure: resets to initial interval
       */
      recordReviewResult: (familyId: string, success: boolean): void => {
        set((state) => {
          const existing = state.reviewSchedule[familyId];

          if (!existing) {
            // No scheduled review exists, create one
            return {
              reviewSchedule: {
                ...state.reviewSchedule,
                [familyId]: {
                  familyId,
                  nextReviewDate: calculateNextReviewDate(
                    INITIAL_REVIEW_INTERVAL_DAYS,
                  ),
                  interval: INITIAL_REVIEW_INTERVAL_DAYS,
                  consecutiveSuccesses: success ? 1 : 0,
                },
              },
            };
          }

          if (success) {
            // Increase interval on success
            const newInterval = calculateNewInterval(existing.interval);
            return {
              reviewSchedule: {
                ...state.reviewSchedule,
                [familyId]: {
                  ...existing,
                  nextReviewDate: calculateNextReviewDate(newInterval),
                  interval: newInterval,
                  consecutiveSuccesses: existing.consecutiveSuccesses + 1,
                },
              },
            };
          } else {
            // Reset interval on failure
            return {
              reviewSchedule: {
                ...state.reviewSchedule,
                [familyId]: {
                  ...existing,
                  nextReviewDate: calculateNextReviewDate(
                    INITIAL_REVIEW_INTERVAL_DAYS,
                  ),
                  interval: INITIAL_REVIEW_INTERVAL_DAYS,
                  consecutiveSuccesses: 0,
                },
              },
            };
          }
        });
      },

      /**
       * Returns the family IDs that are due for review
       * A review is due when the current time exceeds the scheduled review date
       */
      getDueReviews: (): string[] => {
        const state = get();
        const now = Date.now();

        return Object.entries(state.reviewSchedule)
          .filter(([, entry]) => entry.nextReviewDate <= now)
          .map(([familyId]) => familyId);
      },

      /**
       * Resets all learning progress to initial state
       */
      resetProgress: (): void => {
        set(initialState);
      },
    }),
    {
      name: "ncp-aii-learning-progress-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        toolsUsed: state.toolsUsed,
        familyQuizScores: state.familyQuizScores,
        unlockedTiers: state.unlockedTiers,
        tierProgress: state.tierProgress,
        explanationGateResults: state.explanationGateResults,
        reviewSchedule: state.reviewSchedule,
      }),
    },
  ),
);
