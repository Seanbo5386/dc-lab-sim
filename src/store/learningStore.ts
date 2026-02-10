/**
 * Learning Store - Tracks learning progress and adaptive learning data
 *
 * Uses Zustand for state management with localStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DomainId, ExamBreakdown } from '@/types/scenarios';

// ============================================================================
// TYPES
// ============================================================================

export type MasteryLevel = 'novice' | 'beginner' | 'intermediate' | 'proficient' | 'expert';

export interface CommandProficiency {
  command: string;
  successCount: number;
  failureCount: number;
  lastUsed: number;  // timestamp
  masteryLevel: MasteryLevel;
  streakCount: number;  // consecutive successes
}

export interface DomainProgress {
  domainId: DomainId;
  questionsAttempted: number;
  questionsCorrect: number;
  labsCompleted: number;
  labsTotal: number;
  lastStudied: number;  // timestamp
  studyTimeSeconds: number;
}

export interface StudySessionRecord {
  id: string;
  mode: string;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  questionsAnswered: number;
  questionsCorrect: number;
  commandsExecuted: number;
  domain?: DomainId;
  score?: number;
}

export interface GauntletAttempt {
  timestamp: number;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  domainBreakdown: Record<DomainId, { correct: number; total: number }>;
}

export interface LearnerProfile {
  // Command proficiency tracking
  commandProficiency: Record<string, CommandProficiency>;

  // Domain progress
  domainProgress: Record<DomainId, DomainProgress>;

  // Study session history
  sessionHistory: StudySessionRecord[];

  // Overall stats
  totalStudyTimeSeconds: number;
  totalSessions: number;
  currentStreak: number;  // days in a row
  longestStreak: number;
  lastStudyDate: string;  // YYYY-MM-DD format

  // Exam history
  examAttempts: ExamBreakdown[];
  gauntletAttempts: GauntletAttempt[];

  // Achievements
  achievements: string[];
}

export interface LearningState extends LearnerProfile {
  // Active session
  activeSession: StudySessionRecord | null;

  // Actions
  startSession: (mode: string, domain?: DomainId) => string;
  endSession: (questionsAnswered: number, questionsCorrect: number, commandsExecuted: number, score?: number) => void;

  trackCommand: (command: string, success: boolean) => void;
  trackQuestion: (domainId: DomainId, correct: boolean) => void;
  trackLabCompletion: (domainId: DomainId) => void;

  addExamAttempt: (breakdown: ExamBreakdown) => void;
  recordGauntletAttempt: (result: GauntletAttempt) => void;

  getWeakDomains: (threshold?: number) => DomainId[];
  getRecommendedCommands: () => string[];
  getReadinessScore: () => number;
  getMasteryLevel: (command: string) => MasteryLevel;

  resetProgress: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const createInitialDomainProgress = (): Record<DomainId, DomainProgress> => ({
  domain1: {
    domainId: 'domain1',
    questionsAttempted: 0,
    questionsCorrect: 0,
    labsCompleted: 0,
    labsTotal: 10,
    lastStudied: 0,
    studyTimeSeconds: 0,
  },
  domain2: {
    domainId: 'domain2',
    questionsAttempted: 0,
    questionsCorrect: 0,
    labsCompleted: 0,
    labsTotal: 6,
    lastStudied: 0,
    studyTimeSeconds: 0,
  },
  domain3: {
    domainId: 'domain3',
    questionsAttempted: 0,
    questionsCorrect: 0,
    labsCompleted: 0,
    labsTotal: 9,
    lastStudied: 0,
    studyTimeSeconds: 0,
  },
  domain4: {
    domainId: 'domain4',
    questionsAttempted: 0,
    questionsCorrect: 0,
    labsCompleted: 0,
    labsTotal: 9,
    lastStudied: 0,
    studyTimeSeconds: 0,
  },
  domain5: {
    domainId: 'domain5',
    questionsAttempted: 0,
    questionsCorrect: 0,
    labsCompleted: 0,
    labsTotal: 8,
    lastStudied: 0,
    studyTimeSeconds: 0,
  },
});

const LEGACY_PROGRESS_KEY = 'ncp-aii-learning-progress-v2';

const loadLegacyGauntletAttempts = (): GauntletAttempt[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { state?: { gauntletAttempts?: GauntletAttempt[] } };
    const attempts = parsed?.state?.gauntletAttempts;
    return Array.isArray(attempts) ? attempts : [];
  } catch {
    return [];
  }
};

const initialState: Omit<LearningState, 'startSession' | 'endSession' | 'trackCommand' | 'trackQuestion' | 'trackLabCompletion' | 'addExamAttempt' | 'recordGauntletAttempt' | 'getWeakDomains' | 'getRecommendedCommands' | 'getReadinessScore' | 'getMasteryLevel' | 'resetProgress'> = {
  commandProficiency: {},
  domainProgress: createInitialDomainProgress(),
  sessionHistory: [],
  totalStudyTimeSeconds: 0,
  totalSessions: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: '',
  examAttempts: [],
  gauntletAttempts: loadLegacyGauntletAttempts(),
  achievements: [],
  activeSession: null,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMasteryLevel(successRate: number, attemptCount: number): MasteryLevel {
  if (attemptCount < 3) return 'novice';
  if (successRate < 0.4) return 'beginner';
  if (successRate < 0.6) return 'intermediate';
  if (successRate < 0.8) return 'proficient';
  return 'expert';
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function updateStreak(lastDate: string, currentStreak: number): { streak: number; isNewDay: boolean } {
  const today = getTodayString();
  if (lastDate === today) {
    return { streak: currentStreak, isNewDay: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yesterdayStr) {
    return { streak: currentStreak + 1, isNewDay: true };
  }

  // Streak broken
  return { streak: 1, isNewDay: true };
}

// ============================================================================
// STORE
// ============================================================================

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startSession: (mode: string, domain?: DomainId): string => {
        const sessionId = generateSessionId();
        const session: StudySessionRecord = {
          id: sessionId,
          mode,
          startTime: Date.now(),
          durationSeconds: 0,
          questionsAnswered: 0,
          questionsCorrect: 0,
          commandsExecuted: 0,
          domain,
        };

        set({ activeSession: session });
        return sessionId;
      },

      endSession: (questionsAnswered: number, questionsCorrect: number, commandsExecuted: number, score?: number): void => {
        const state = get();
        const { activeSession, lastStudyDate, currentStreak, longestStreak } = state;

        if (!activeSession) return;

        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - activeSession.startTime) / 1000);

        const completedSession: StudySessionRecord = {
          ...activeSession,
          endTime,
          durationSeconds,
          questionsAnswered,
          questionsCorrect,
          commandsExecuted,
          score,
        };

        // Update streak
        const { streak } = updateStreak(lastStudyDate, currentStreak);

        set(state => ({
          activeSession: null,
          sessionHistory: [...state.sessionHistory.slice(-99), completedSession], // Keep last 100
          totalStudyTimeSeconds: state.totalStudyTimeSeconds + durationSeconds,
          totalSessions: state.totalSessions + 1,
          currentStreak: streak,
          longestStreak: Math.max(longestStreak, streak),
          lastStudyDate: getTodayString(),
        }));
      },

      trackCommand: (command: string, success: boolean): void => {
        set(state => {
          const existing = state.commandProficiency[command] || {
            command,
            successCount: 0,
            failureCount: 0,
            lastUsed: 0,
            masteryLevel: 'novice' as MasteryLevel,
            streakCount: 0,
          };

          const successCount = existing.successCount + (success ? 1 : 0);
          const failureCount = existing.failureCount + (success ? 0 : 1);
          const totalAttempts = successCount + failureCount;
          const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;

          const updated: CommandProficiency = {
            ...existing,
            successCount,
            failureCount,
            lastUsed: Date.now(),
            masteryLevel: calculateMasteryLevel(successRate, totalAttempts),
            streakCount: success ? existing.streakCount + 1 : 0,
          };

          return {
            commandProficiency: {
              ...state.commandProficiency,
              [command]: updated,
            },
          };
        });
      },

      trackQuestion: (domainId: DomainId, correct: boolean): void => {
        set(state => {
          const domain = state.domainProgress[domainId];
          return {
            domainProgress: {
              ...state.domainProgress,
              [domainId]: {
                ...domain,
                questionsAttempted: domain.questionsAttempted + 1,
                questionsCorrect: domain.questionsCorrect + (correct ? 1 : 0),
                lastStudied: Date.now(),
              },
            },
          };
        });
      },

      trackLabCompletion: (domainId: DomainId): void => {
        set(state => {
          const domain = state.domainProgress[domainId];
          return {
            domainProgress: {
              ...state.domainProgress,
              [domainId]: {
                ...domain,
                labsCompleted: domain.labsCompleted + 1,
                lastStudied: Date.now(),
              },
            },
          };
        });
      },

      addExamAttempt: (breakdown: ExamBreakdown): void => {
        set(state => ({
          examAttempts: [...state.examAttempts.slice(-19), breakdown], // Keep last 20
        }));
      },

      recordGauntletAttempt: (result: GauntletAttempt): void => {
        set(state => ({
          gauntletAttempts: [...state.gauntletAttempts.slice(-49), result], // Keep last 50
        }));
      },

      getWeakDomains: (threshold: number = 70): DomainId[] => {
        const state = get();
        const weakDomains: DomainId[] = [];

        (Object.keys(state.domainProgress) as DomainId[]).forEach(domainId => {
          const domain = state.domainProgress[domainId];
          if (domain.questionsAttempted >= 3) {
            const percentage = (domain.questionsCorrect / domain.questionsAttempted) * 100;
            if (percentage < threshold) {
              weakDomains.push(domainId);
            }
          } else {
            // Not enough data - consider it weak
            weakDomains.push(domainId);
          }
        });

        return weakDomains;
      },

      getRecommendedCommands: (): string[] => {
        const state = get();
        const commands = Object.values(state.commandProficiency);

        // Find commands that need practice (low mastery or not used recently)
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

        const needsPractice = commands
          .filter(c =>
            c.masteryLevel !== 'expert' ||
            c.lastUsed < oneWeekAgo ||
            c.streakCount < 3
          )
          .sort((a, b) => {
            // Prioritize lower mastery levels
            const levelOrder = { novice: 0, beginner: 1, intermediate: 2, proficient: 3, expert: 4 };
            return levelOrder[a.masteryLevel] - levelOrder[b.masteryLevel];
          })
          .slice(0, 5)
          .map(c => c.command);

        return needsPractice;
      },

      getReadinessScore: (): number => {
        const state = get();
        let totalWeight = 0;
        let weightedScore = 0;

        const domainWeights: Record<DomainId, number> = {
          domain1: 31,
          domain2: 5,
          domain3: 19,
          domain4: 33,
          domain5: 12,
        };

        (Object.keys(state.domainProgress) as DomainId[]).forEach(domainId => {
          const domain = state.domainProgress[domainId];
          const weight = domainWeights[domainId];
          totalWeight += weight;

          if (domain.questionsAttempted > 0) {
            const questionScore = (domain.questionsCorrect / domain.questionsAttempted) * 100;
            const labScore = domain.labsTotal > 0
              ? (domain.labsCompleted / domain.labsTotal) * 100
              : 0;

            // Weight questions 70%, labs 30%
            const domainScore = questionScore * 0.7 + labScore * 0.3;
            weightedScore += domainScore * weight;
          }
        });

        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
      },

      getMasteryLevel: (command: string): MasteryLevel => {
        const state = get();
        return state.commandProficiency[command]?.masteryLevel || 'novice';
      },

      resetProgress: (): void => {
        set({
          ...initialState,
          domainProgress: createInitialDomainProgress(),
          gauntletAttempts: [],
        });
      },
    }),
    {
      name: 'ncp-aii-learning-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        commandProficiency: state.commandProficiency,
        domainProgress: state.domainProgress,
        sessionHistory: state.sessionHistory,
        totalStudyTimeSeconds: state.totalStudyTimeSeconds,
        totalSessions: state.totalSessions,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastStudyDate: state.lastStudyDate,
        examAttempts: state.examAttempts,
        gauntletAttempts: state.gauntletAttempts,
        achievements: state.achievements,
      }),
    }
  )
);
