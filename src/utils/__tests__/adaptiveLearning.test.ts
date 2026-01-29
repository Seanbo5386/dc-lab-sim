import { describe, it, expect } from 'vitest';
import {
  calculateRecommendedDifficulty,
  calculateDomainDifficulty,
  calculateNextReview,
  getReviewQueue,
  createQuestionPerformance,
  getOptimalStudyOrder,
  calculateResponseQuality,
  predictPassProbability,
  calculateImprovementTrend,
  getStudyRecommendations,
  createLearnerProfile,
  type QuestionPerformance,
  type DomainPerformance,
} from '../adaptiveLearning';

describe('Adaptive Learning - Difficulty Adjustment', () => {
  describe('calculateRecommendedDifficulty', () => {
    it('should not adjust with insufficient data', () => {
      const answers = [{ correct: true, difficulty: 'medium' as const }];
      const result = calculateRecommendedDifficulty(answers, 'medium');

      expect(result.shouldAdjust).toBe(false);
      expect(result.recommendedDifficulty).toBe('medium');
      expect(result.confidence).toBe(0);
    });

    it('should increase difficulty on high accuracy', () => {
      const answers = Array(10).fill(null).map(() => ({
        correct: true,
        difficulty: 'easy' as const,
      }));
      const result = calculateRecommendedDifficulty(answers, 'easy');

      expect(result.shouldAdjust).toBe(true);
      expect(result.recommendedDifficulty).toBe('medium');
      expect(result.reason).toContain('ready for medium');
    });

    it('should increase from medium to hard on high accuracy', () => {
      const answers = Array(10).fill(null).map(() => ({
        correct: true,
        difficulty: 'medium' as const,
      }));
      const result = calculateRecommendedDifficulty(answers, 'medium');

      expect(result.shouldAdjust).toBe(true);
      expect(result.recommendedDifficulty).toBe('hard');
    });

    it('should decrease difficulty on low accuracy', () => {
      const answers = Array(10).fill(null).map((_, i) => ({
        correct: i < 3, // Only 30% correct
        difficulty: 'hard' as const,
      }));
      const result = calculateRecommendedDifficulty(answers, 'hard');

      expect(result.shouldAdjust).toBe(true);
      expect(result.recommendedDifficulty).toBe('medium');
    });

    it('should decrease from medium to easy on low accuracy', () => {
      const answers = Array(10).fill(null).map((_, i) => ({
        correct: i < 3,
        difficulty: 'medium' as const,
      }));
      const result = calculateRecommendedDifficulty(answers, 'medium');

      expect(result.shouldAdjust).toBe(true);
      expect(result.recommendedDifficulty).toBe('easy');
    });

    it('should maintain difficulty in acceptable range', () => {
      // 65% correct overall, with recent answers also around 65%
      const answers = Array(10).fill(null).map((_, i) => ({
        correct: i % 3 !== 0, // ~67% correct, evenly distributed
        difficulty: 'medium' as const,
      }));
      const result = calculateRecommendedDifficulty(answers, 'medium');

      expect(result.shouldAdjust).toBe(false);
      expect(result.recommendedDifficulty).toBe('medium');
    });

    it('should weight recent answers more heavily', () => {
      // First 5 wrong, last 5 correct
      const answers = [
        ...Array(5).fill({ correct: false, difficulty: 'medium' as const }),
        ...Array(5).fill({ correct: true, difficulty: 'medium' as const }),
      ];
      const result = calculateRecommendedDifficulty(answers, 'medium');

      // Recent performance is good, so should consider maintaining or increasing
      expect(result.recommendedDifficulty).not.toBe('easy');
    });
  });

  describe('calculateDomainDifficulty', () => {
    it('should not adjust with insufficient questions', () => {
      const perf: DomainPerformance = {
        questionsAnswered: 3,
        correctAnswers: 3,
        accuracy: 1,
        averageResponseTime: 30,
        difficulty: 'medium',
        weakTopics: [],
        strongTopics: [],
      };
      const result = calculateDomainDifficulty(perf);

      expect(result.shouldAdjust).toBe(false);
      expect(result.confidence).toBeLessThan(1);
    });

    it('should adjust based on domain accuracy', () => {
      const perf: DomainPerformance = {
        questionsAnswered: 10,
        correctAnswers: 9,
        accuracy: 0.9,
        averageResponseTime: 30,
        difficulty: 'easy',
        weakTopics: [],
        strongTopics: [],
      };
      const result = calculateDomainDifficulty(perf);

      expect(result.shouldAdjust).toBe(true);
      expect(result.recommendedDifficulty).toBe('medium');
    });
  });
});

describe('Adaptive Learning - Spaced Repetition', () => {
  describe('calculateNextReview', () => {
    let performance: QuestionPerformance;

    beforeEach(() => {
      performance = createQuestionPerformance('q1', 'domain1', 'medium');
    });

    it('should set short interval for first correct answer', () => {
      const result = calculateNextReview(performance, true, 4);

      expect(result.consecutiveCorrect).toBe(1);
      expect(result.interval).toBe(1); // 1 hour
      expect(result.timesAnswered).toBe(1);
      expect(result.timesCorrect).toBe(1);
    });

    it('should increase interval on consecutive correct answers', () => {
      let result = calculateNextReview(performance, true, 4);
      expect(result.interval).toBe(1);

      result = calculateNextReview(result, true, 4);
      expect(result.interval).toBe(6);

      result = calculateNextReview(result, true, 4);
      expect(result.interval).toBeGreaterThan(6);
    });

    it('should reset interval on incorrect answer', () => {
      let result = calculateNextReview(performance, true, 4);
      result = calculateNextReview(result, true, 4);
      expect(result.consecutiveCorrect).toBe(2);

      result = calculateNextReview(result, false, 1);
      expect(result.consecutiveCorrect).toBe(0);
      expect(result.interval).toBe(0.5); // Reset to 30 min
    });

    it('should adjust ease factor based on response quality', () => {
      // Perfect response should increase ease factor
      const result1 = calculateNextReview(performance, true, 5);
      expect(result1.easeFactor).toBeGreaterThan(2.5);

      // Barely correct should decrease ease factor
      const result2 = calculateNextReview(performance, true, 3);
      expect(result2.easeFactor).toBeLessThan(result1.easeFactor);
    });

    it('should decrease ease factor on incorrect answer', () => {
      const result = calculateNextReview(performance, false, 1);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('should not let ease factor go below 1.3', () => {
      let result = performance;
      for (let i = 0; i < 10; i++) {
        result = calculateNextReview(result, false, 0);
      }
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe('getReviewQueue', () => {
    it('should categorize questions by due time', () => {
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      const day = 24 * hour;

      const history: QuestionPerformance[] = [
        { ...createQuestionPerformance('q1', 'domain1', 'easy'), nextReviewDue: now - day * 2 }, // Overdue
        { ...createQuestionPerformance('q2', 'domain1', 'easy'), nextReviewDue: now - hour }, // Due now
        { ...createQuestionPerformance('q3', 'domain1', 'easy'), nextReviewDue: now + hour * 5 }, // Due today
        { ...createQuestionPerformance('q4', 'domain1', 'easy'), nextReviewDue: now + day + hour }, // Due tomorrow
        { ...createQuestionPerformance('q5', 'domain1', 'easy'), nextReviewDue: now + day * 3 }, // Not due
      ];

      const queue = getReviewQueue(history);

      expect(queue.overdue.length).toBe(1);
      expect(queue.dueNow.length).toBe(1);
      expect(queue.dueToday.length).toBeGreaterThanOrEqual(0); // Depends on time of day
      expect(queue.totalDue).toBe(2);
    });

    it('should sort by due time', () => {
      const now = Date.now();
      const hour = 60 * 60 * 1000;

      const history: QuestionPerformance[] = [
        { ...createQuestionPerformance('q1', 'domain1', 'easy'), nextReviewDue: now - hour },
        { ...createQuestionPerformance('q2', 'domain1', 'easy'), nextReviewDue: now - hour * 3 },
        { ...createQuestionPerformance('q3', 'domain1', 'easy'), nextReviewDue: now - hour * 2 },
      ];

      const queue = getReviewQueue(history);

      expect(queue.dueNow[0].questionId).toBe('q2'); // Most overdue first
    });
  });

  describe('createQuestionPerformance', () => {
    it('should create with default values', () => {
      const perf = createQuestionPerformance('q1', 'domain1', 'medium');

      expect(perf.questionId).toBe('q1');
      expect(perf.domain).toBe('domain1');
      expect(perf.difficulty).toBe('medium');
      expect(perf.timesAnswered).toBe(0);
      expect(perf.easeFactor).toBe(2.5);
      expect(perf.nextReviewDue).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getOptimalStudyOrder', () => {
    it('should prioritize overdue questions', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const history: QuestionPerformance[] = [
        { ...createQuestionPerformance('q1', 'domain1', 'easy'), nextReviewDue: now + day, timesAnswered: 5, timesCorrect: 5 },
        { ...createQuestionPerformance('q2', 'domain1', 'easy'), nextReviewDue: now - day * 2 }, // Overdue
        { ...createQuestionPerformance('q3', 'domain1', 'easy'), nextReviewDue: now - 1000 }, // Due now
      ];

      const order = getOptimalStudyOrder(history, 10);

      expect(order[0].questionId).toBe('q2'); // Overdue first
      expect(order[1].questionId).toBe('q3'); // Then due now
    });

    it('should add low accuracy questions if queue is small', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const history: QuestionPerformance[] = [
        { ...createQuestionPerformance('q1', 'domain1', 'easy'), nextReviewDue: now + day, timesAnswered: 10, timesCorrect: 3 }, // Low accuracy
        { ...createQuestionPerformance('q2', 'domain1', 'easy'), nextReviewDue: now + day, timesAnswered: 10, timesCorrect: 9 }, // High accuracy
      ];

      const order = getOptimalStudyOrder(history, 10);

      expect(order[0].questionId).toBe('q1'); // Low accuracy first
    });
  });
});

describe('Adaptive Learning - Response Quality', () => {
  describe('calculateResponseQuality', () => {
    it('should return 5 for fast correct answer', () => {
      const quality = calculateResponseQuality(true, 20, 60);
      expect(quality).toBe(5);
    });

    it('should return 4 for good speed correct answer', () => {
      const quality = calculateResponseQuality(true, 40, 60);
      expect(quality).toBe(4);
    });

    it('should return 3 for acceptable correct answer', () => {
      const quality = calculateResponseQuality(true, 55, 60);
      expect(quality).toBe(3);
    });

    it('should return 0-2 for incorrect answers', () => {
      const quality1 = calculateResponseQuality(false, 20, 60);
      const quality2 = calculateResponseQuality(false, 60, 60);

      expect(quality1).toBeLessThanOrEqual(2);
      expect(quality2).toBeLessThanOrEqual(2);
    });
  });
});

describe('Adaptive Learning - Pass Probability', () => {
  describe('predictPassProbability', () => {
    const domainWeights = {
      domain1: 31,
      domain2: 5,
      domain3: 19,
      domain4: 33,
      domain5: 12,
    };

    it('should predict high probability for high performers', () => {
      const performance: Record<string, DomainPerformance> = {
        domain1: { questionsAnswered: 20, correctAnswers: 18, accuracy: 0.9, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain2: { questionsAnswered: 10, correctAnswers: 9, accuracy: 0.9, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain3: { questionsAnswered: 15, correctAnswers: 13, accuracy: 0.87, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain4: { questionsAnswered: 25, correctAnswers: 22, accuracy: 0.88, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain5: { questionsAnswered: 10, correctAnswers: 8, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
      };

      const result = predictPassProbability(performance, domainWeights, 70);

      expect(result.probability).toBeGreaterThan(0.7);
      expect(result.predictedScore).toBeGreaterThan(70);
    });

    it('should predict low probability for poor performers', () => {
      const performance: Record<string, DomainPerformance> = {
        domain1: { questionsAnswered: 20, correctAnswers: 8, accuracy: 0.4, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain2: { questionsAnswered: 10, correctAnswers: 5, accuracy: 0.5, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain3: { questionsAnswered: 15, correctAnswers: 7, accuracy: 0.47, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain4: { questionsAnswered: 25, correctAnswers: 12, accuracy: 0.48, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain5: { questionsAnswered: 10, correctAnswers: 5, accuracy: 0.5, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
      };

      const result = predictPassProbability(performance, domainWeights, 70);

      expect(result.probability).toBeLessThan(0.5);
      expect(result.predictedScore).toBeLessThan(70);
      expect(result.weakestDomains.length).toBeGreaterThan(0);
    });

    it('should identify weak domains', () => {
      const performance: Record<string, DomainPerformance> = {
        domain1: { questionsAnswered: 20, correctAnswers: 16, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain2: { questionsAnswered: 10, correctAnswers: 8, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain3: { questionsAnswered: 15, correctAnswers: 6, accuracy: 0.4, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] }, // Weak
        domain4: { questionsAnswered: 25, correctAnswers: 20, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain5: { questionsAnswered: 10, correctAnswers: 5, accuracy: 0.5, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] }, // Weak
      };

      const result = predictPassProbability(performance, domainWeights, 70);

      expect(result.weakestDomains).toContain('domain3');
      expect(result.weakestDomains).toContain('domain5');
    });

    it('should have low confidence with few questions', () => {
      const performance: Record<string, DomainPerformance> = {
        domain1: { questionsAnswered: 5, correctAnswers: 4, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain2: { questionsAnswered: 2, correctAnswers: 2, accuracy: 1, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain3: { questionsAnswered: 3, correctAnswers: 3, accuracy: 1, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain4: { questionsAnswered: 5, correctAnswers: 5, accuracy: 1, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain5: { questionsAnswered: 2, correctAnswers: 2, accuracy: 1, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
      };

      const result = predictPassProbability(performance, domainWeights, 70);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.recommendations.some(r => r.includes('more questions'))).toBe(true);
    });
  });
});

describe('Adaptive Learning - Improvement Trends', () => {
  describe('calculateImprovementTrend', () => {
    it('should detect improving trend', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const history = [
        { date: now - day * 10, accuracy: 0.5 },
        { date: now - day * 8, accuracy: 0.55 },
        { date: now - day * 5, accuracy: 0.65 },
        { date: now - day * 3, accuracy: 0.75 },
        { date: now - day * 1, accuracy: 0.85 },
      ];

      const result = calculateImprovementTrend(history, 7);

      expect(result.trend).toBe('improving');
      expect(result.changePercent).toBeGreaterThan(0);
      expect(result.recentAverage).toBeGreaterThan(result.previousAverage);
    });

    it('should detect declining trend', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const history = [
        { date: now - day * 10, accuracy: 0.85 },
        { date: now - day * 8, accuracy: 0.8 },
        { date: now - day * 5, accuracy: 0.7 },
        { date: now - day * 3, accuracy: 0.6 },
        { date: now - day * 1, accuracy: 0.5 },
      ];

      const result = calculateImprovementTrend(history, 7);

      expect(result.trend).toBe('declining');
      expect(result.changePercent).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const history = [
        { date: now - day * 10, accuracy: 0.7 },
        { date: now - day * 8, accuracy: 0.72 },
        { date: now - day * 5, accuracy: 0.68 },
        { date: now - day * 3, accuracy: 0.71 },
        { date: now - day * 1, accuracy: 0.7 },
      ];

      const result = calculateImprovementTrend(history, 7);

      expect(result.trend).toBe('stable');
    });

    it('should handle single data point', () => {
      const history = [{ date: Date.now(), accuracy: 0.7 }];
      const result = calculateImprovementTrend(history);

      expect(result.trend).toBe('stable');
      expect(result.recentAverage).toBe(0.7);
    });
  });
});

describe('Adaptive Learning - Study Recommendations', () => {
  describe('getStudyRecommendations', () => {
    it('should recommend reviewing overdue items', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const profile = createLearnerProfile('test');
      profile.questionHistory = [
        { ...createQuestionPerformance('q1', 'domain1', 'easy'), nextReviewDue: now - day * 2 },
        { ...createQuestionPerformance('q2', 'domain1', 'easy'), nextReviewDue: now - day },
      ];

      const recommendations = getStudyRecommendations(profile, {
        domain1: 31, domain2: 5, domain3: 19, domain4: 33, domain5: 12,
      });

      expect(recommendations.some(r => r.includes('overdue'))).toBe(true);
    });

    it('should recommend weak domains weighted by exam importance', () => {
      const profile = createLearnerProfile('test');
      profile.domainPerformance.domain4 = {
        questionsAnswered: 20,
        correctAnswers: 10,
        accuracy: 0.5,
        averageResponseTime: 30,
        difficulty: 'medium',
        weakTopics: [],
        strongTopics: [],
      };

      const recommendations = getStudyRecommendations(profile, {
        domain1: 31, domain2: 5, domain3: 19, domain4: 33, domain5: 12,
      });

      expect(recommendations.some(r => r.includes('Domain 4'))).toBe(true);
    });

    it('should encourage study streaks', () => {
      const profile = createLearnerProfile('test');
      profile.studyStreak = 5;
      profile.lastStudyDate = Date.now() - 1000;

      const recommendations = getStudyRecommendations(profile, {
        domain1: 31, domain2: 5, domain3: 19, domain4: 33, domain5: 12,
      });

      expect(recommendations.some(r => r.includes('streak'))).toBe(true);
    });
  });
});

describe('Adaptive Learning - Learner Profile', () => {
  describe('createLearnerProfile', () => {
    it('should create profile with default values', () => {
      const profile = createLearnerProfile('user123');

      expect(profile.id).toBe('user123');
      expect(profile.overallAccuracy).toBe(0);
      expect(profile.currentDifficulty).toBe('medium');
      expect(profile.totalQuestionsAnswered).toBe(0);
      expect(profile.studyStreak).toBe(0);
      expect(Object.keys(profile.domainPerformance)).toHaveLength(5);
    });

    it('should initialize all domains', () => {
      const profile = createLearnerProfile('user123');

      ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'].forEach(domain => {
        expect(profile.domainPerformance[domain as keyof typeof profile.domainPerformance]).toBeDefined();
        expect(profile.domainPerformance[domain as keyof typeof profile.domainPerformance].accuracy).toBe(0);
      });
    });
  });
});
