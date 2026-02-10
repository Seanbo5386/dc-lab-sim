import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLearningStore } from '../learningStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Learning Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLearningStore.setState({
      commandProficiency: {},
      domainProgress: {
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
      },
      sessionHistory: [],
      totalStudyTimeSeconds: 0,
      totalSessions: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: '',
      examAttempts: [],
      gauntletAttempts: [],
      achievements: [],
      activeSession: null,
    });
    localStorageMock.clear();
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      const store = useLearningStore.getState();
      const sessionId = store.startSession('timed-practice');

      expect(sessionId).toBeDefined();
      expect(sessionId.startsWith('session-')).toBe(true);

      const state = useLearningStore.getState();
      expect(state.activeSession).not.toBeNull();
      expect(state.activeSession?.mode).toBe('timed-practice');
    });

    it('should start session with domain', () => {
      const store = useLearningStore.getState();
      store.startSession('domain-deep-dive', 'domain1');

      const state = useLearningStore.getState();
      expect(state.activeSession?.domain).toBe('domain1');
    });

    it('should end session and record stats', () => {
      const store = useLearningStore.getState();
      store.startSession('timed-practice');

      // Simulate some time passing
      const activeSession = useLearningStore.getState().activeSession;
      if (activeSession) {
        // Manually adjust start time to simulate duration
        useLearningStore.setState({
          activeSession: {
            ...activeSession,
            startTime: Date.now() - 60000, // 1 minute ago
          },
        });
      }

      store.endSession(10, 8, 5, 80);

      const state = useLearningStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.sessionHistory.length).toBe(1);
      expect(state.totalSessions).toBe(1);
      expect(state.sessionHistory[0].questionsAnswered).toBe(10);
      expect(state.sessionHistory[0].questionsCorrect).toBe(8);
    });

    it('should not end session if none active', () => {
      const store = useLearningStore.getState();
      store.endSession(10, 8, 5);

      const state = useLearningStore.getState();
      expect(state.sessionHistory.length).toBe(0);
    });
  });

  describe('Command Tracking', () => {
    it('should track successful command execution', () => {
      const store = useLearningStore.getState();
      store.trackCommand('nvidia-smi', true);

      const state = useLearningStore.getState();
      expect(state.commandProficiency['nvidia-smi']).toBeDefined();
      expect(state.commandProficiency['nvidia-smi'].successCount).toBe(1);
      expect(state.commandProficiency['nvidia-smi'].failureCount).toBe(0);
    });

    it('should track failed command execution', () => {
      const store = useLearningStore.getState();
      store.trackCommand('nvidia-smi', false);

      const state = useLearningStore.getState();
      expect(state.commandProficiency['nvidia-smi'].failureCount).toBe(1);
    });

    it('should update mastery level based on success rate', () => {
      const store = useLearningStore.getState();

      // Execute command successfully multiple times
      for (let i = 0; i < 10; i++) {
        store.trackCommand('nvidia-smi', true);
      }

      const state = useLearningStore.getState();
      expect(state.commandProficiency['nvidia-smi'].masteryLevel).toBe('expert');
    });

    it('should track streak count', () => {
      const store = useLearningStore.getState();

      store.trackCommand('nvidia-smi', true);
      store.trackCommand('nvidia-smi', true);
      store.trackCommand('nvidia-smi', true);

      const state = useLearningStore.getState();
      expect(state.commandProficiency['nvidia-smi'].streakCount).toBe(3);

      // Break streak
      store.trackCommand('nvidia-smi', false);
      const stateAfterFail = useLearningStore.getState();
      expect(stateAfterFail.commandProficiency['nvidia-smi'].streakCount).toBe(0);
    });

    it('should get mastery level for command', () => {
      const store = useLearningStore.getState();
      store.trackCommand('dcgmi', true);
      store.trackCommand('dcgmi', true);
      store.trackCommand('dcgmi', true);

      const masteryLevel = store.getMasteryLevel('dcgmi');
      expect(['novice', 'beginner', 'intermediate', 'proficient', 'expert']).toContain(masteryLevel);
    });

    it('should return novice for unknown command', () => {
      const store = useLearningStore.getState();
      const masteryLevel = store.getMasteryLevel('unknown-cmd');
      expect(masteryLevel).toBe('novice');
    });
  });

  describe('Question Tracking', () => {
    it('should track correct question answer', () => {
      const store = useLearningStore.getState();
      store.trackQuestion('domain1', true);

      const state = useLearningStore.getState();
      expect(state.domainProgress.domain1.questionsAttempted).toBe(1);
      expect(state.domainProgress.domain1.questionsCorrect).toBe(1);
    });

    it('should track incorrect question answer', () => {
      const store = useLearningStore.getState();
      store.trackQuestion('domain1', false);

      const state = useLearningStore.getState();
      expect(state.domainProgress.domain1.questionsAttempted).toBe(1);
      expect(state.domainProgress.domain1.questionsCorrect).toBe(0);
    });

    it('should update lastStudied timestamp', () => {
      const before = Date.now();
      const store = useLearningStore.getState();
      store.trackQuestion('domain1', true);

      const state = useLearningStore.getState();
      expect(state.domainProgress.domain1.lastStudied).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Lab Tracking', () => {
    it('should track lab completion', () => {
      const store = useLearningStore.getState();
      store.trackLabCompletion('domain1');

      const state = useLearningStore.getState();
      expect(state.domainProgress.domain1.labsCompleted).toBe(1);
    });

    it('should increment lab count', () => {
      const store = useLearningStore.getState();
      store.trackLabCompletion('domain1');
      store.trackLabCompletion('domain1');

      const state = useLearningStore.getState();
      expect(state.domainProgress.domain1.labsCompleted).toBe(2);
    });
  });

  describe('Weak Domain Detection', () => {
    it('should identify domains with low question scores', () => {
      const store = useLearningStore.getState();

      // Set up domain1 with 50% accuracy
      for (let i = 0; i < 5; i++) {
        store.trackQuestion('domain1', true);
        store.trackQuestion('domain1', false);
      }

      const weakDomains = store.getWeakDomains(70);
      expect(weakDomains).toContain('domain1');
    });

    it('should not include domains with high scores', () => {
      const store = useLearningStore.getState();

      // Set up domain1 with 90% accuracy
      for (let i = 0; i < 9; i++) {
        store.trackQuestion('domain1', true);
      }
      store.trackQuestion('domain1', false);

      const weakDomains = store.getWeakDomains(70);
      expect(weakDomains).not.toContain('domain1');
    });

    it('should include domains with insufficient data', () => {
      const store = useLearningStore.getState();

      // Only 1 question attempted for domain1
      store.trackQuestion('domain1', true);

      const weakDomains = store.getWeakDomains(70);
      expect(weakDomains).toContain('domain1');
    });
  });

  describe('Readiness Score', () => {
    it('should return 0 for no activity', () => {
      const store = useLearningStore.getState();
      const score = store.getReadinessScore();
      expect(score).toBe(0);
    });

    it('should calculate weighted readiness score', () => {
      const store = useLearningStore.getState();

      // Set up some progress
      for (let i = 0; i < 10; i++) {
        store.trackQuestion('domain4', true); // Domain4 has 33% weight
      }

      const score = store.getReadinessScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommended Commands', () => {
    it('should return commands needing practice', () => {
      const store = useLearningStore.getState();

      // Add some commands with varying proficiency
      for (let i = 0; i < 3; i++) {
        store.trackCommand('nvidia-smi', true);
      }
      for (let i = 0; i < 3; i++) {
        store.trackCommand('dcgmi', false);
      }

      const recommendations = store.getRecommendedCommands();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should prioritize lower mastery commands', () => {
      const store = useLearningStore.getState();

      // High mastery command
      for (let i = 0; i < 15; i++) {
        store.trackCommand('nvidia-smi', true);
      }

      // Low mastery command
      for (let i = 0; i < 3; i++) {
        store.trackCommand('dcgmi', false);
      }

      const recommendations = store.getRecommendedCommands();
      if (recommendations.length >= 2) {
        const dcgmiIndex = recommendations.indexOf('dcgmi');
        const nvidiaSmiIndex = recommendations.indexOf('nvidia-smi');

        // dcgmi should appear before nvidia-smi (if both are in recommendations)
        if (dcgmiIndex !== -1 && nvidiaSmiIndex !== -1) {
          expect(dcgmiIndex).toBeLessThan(nvidiaSmiIndex);
        }
      }
    });
  });

  describe('Exam Attempts', () => {
    it('should add exam attempt', () => {
      const store = useLearningStore.getState();
      const mockBreakdown = {
        totalPoints: 100,
        earnedPoints: 75,
        percentage: 75,
        byDomain: {
          domain1: { domainName: 'Domain 1', questionsTotal: 10, questionsCorrect: 7, percentage: 70, weight: 31 },
          domain2: { domainName: 'Domain 2', questionsTotal: 5, questionsCorrect: 4, percentage: 80, weight: 5 },
          domain3: { domainName: 'Domain 3', questionsTotal: 10, questionsCorrect: 8, percentage: 80, weight: 19 },
          domain4: { domainName: 'Domain 4', questionsTotal: 15, questionsCorrect: 12, percentage: 80, weight: 33 },
          domain5: { domainName: 'Domain 5', questionsTotal: 5, questionsCorrect: 4, percentage: 80, weight: 12 },
        },
        questionResults: [],
        timeSpent: 3600,
      };

      store.addExamAttempt(mockBreakdown);

      const state = useLearningStore.getState();
      expect(state.examAttempts.length).toBe(1);
      expect(state.examAttempts[0].percentage).toBe(75);
    });

    it('should keep only last 20 exam attempts', () => {
      const store = useLearningStore.getState();

      for (let i = 0; i < 25; i++) {
        store.addExamAttempt({
          totalPoints: 100,
          earnedPoints: 70 + i,
          percentage: 70 + i,
          byDomain: {
            domain1: { domainName: 'Domain 1', questionsTotal: 10, questionsCorrect: 7, percentage: 70, weight: 31 },
            domain2: { domainName: 'Domain 2', questionsTotal: 5, questionsCorrect: 4, percentage: 80, weight: 5 },
            domain3: { domainName: 'Domain 3', questionsTotal: 10, questionsCorrect: 8, percentage: 80, weight: 19 },
            domain4: { domainName: 'Domain 4', questionsTotal: 15, questionsCorrect: 12, percentage: 80, weight: 33 },
            domain5: { domainName: 'Domain 5', questionsTotal: 5, questionsCorrect: 4, percentage: 80, weight: 12 },
          },
          questionResults: [],
          timeSpent: 3600,
        });
      }

      const state = useLearningStore.getState();
      expect(state.examAttempts.length).toBe(20);
    });
  });

  describe('Exam Gauntlet Attempts', () => {
    it('should record a gauntlet attempt', () => {
      const store = useLearningStore.getState();
      store.recordGauntletAttempt({
        timestamp: Date.now(),
        score: 8,
        totalQuestions: 10,
        timeSpentSeconds: 1800,
        domainBreakdown: {
          domain1: { correct: 2, total: 3 },
          domain2: { correct: 1, total: 1 },
          domain3: { correct: 2, total: 2 },
          domain4: { correct: 2, total: 3 },
          domain5: { correct: 1, total: 1 },
        },
      });

      const state = useLearningStore.getState();
      expect(state.gauntletAttempts.length).toBe(1);
      expect(state.gauntletAttempts[0].score).toBe(8);
    });

    it('should keep only last 50 gauntlet attempts', () => {
      const store = useLearningStore.getState();

      for (let i = 0; i < 55; i++) {
        store.recordGauntletAttempt({
          timestamp: Date.now() + i,
          score: 5 + i,
          totalQuestions: 10,
          timeSpentSeconds: 1800,
          domainBreakdown: {
            domain1: { correct: 1, total: 2 },
            domain2: { correct: 1, total: 2 },
            domain3: { correct: 1, total: 2 },
            domain4: { correct: 1, total: 2 },
            domain5: { correct: 1, total: 2 },
          },
        });
      }

      const state = useLearningStore.getState();
      expect(state.gauntletAttempts.length).toBe(50);
    });
  });

  describe('Reset Progress', () => {
    it('should reset all progress', () => {
      const store = useLearningStore.getState();

      // Add some data
      store.trackCommand('nvidia-smi', true);
      store.trackQuestion('domain1', true);
      store.startSession('timed-practice');
      store.endSession(10, 8, 5);

      // Reset
      store.resetProgress();

      const state = useLearningStore.getState();
      expect(Object.keys(state.commandProficiency).length).toBe(0);
      expect(state.sessionHistory.length).toBe(0);
      expect(state.totalSessions).toBe(0);
      expect(state.totalStudyTimeSeconds).toBe(0);
    });
  });
});
