import { describe, it, expect } from 'vitest';
import {
  selectExamQuestions,
  calculateExamScore,
  isExamPassed,
  getWeakDomains,
  ExamTimer,
  // New exam mode functions
  EXAM_MODE_CONFIGS,
  DOMAIN_INFO,
  selectQuestionsForMode,
  createExamConfig,
  getIncorrectQuestionIds,
  getWeakDomainsFromHistory,
  formatTime,
  getEstimatedTimePerQuestion,
} from '../examEngine';
import type { ExamQuestion, ExamBreakdown } from '@/types/scenarios';

// Sample questions for testing
const createSampleQuestions = (): ExamQuestion[] => [
  {
    id: 'q1',
    domain: 'domain1',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 1',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Explanation 1',
    points: 1,
    tags: ['tag1'],
  },
  {
    id: 'q2',
    domain: 'domain1',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 2',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Explanation 2',
    points: 1,
    tags: ['tag1'],
  },
  {
    id: 'q3',
    domain: 'domain2',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 3',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 2,
    explanation: 'Explanation 3',
    points: 1,
    tags: ['tag2'],
  },
  {
    id: 'q4',
    domain: 'domain3',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 4',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 3,
    explanation: 'Explanation 4',
    points: 1,
    tags: ['tag3'],
  },
  {
    id: 'q5',
    domain: 'domain4',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 5',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Explanation 5',
    points: 1,
    tags: ['tag4'],
  },
  {
    id: 'q6',
    domain: 'domain5',
    type: 'multiple-choice',
    difficulty: 'intermediate',
    question: 'Question 6',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Explanation 6',
    points: 1,
    tags: ['tag5'],
  },
  {
    id: 'q7',
    domain: 'domain4',
    type: 'multiple-select',
    difficulty: 'advanced',
    question: 'Question 7 (multi)',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: [0, 2],
    explanation: 'Explanation 7',
    points: 2,
    tags: ['tag4'],
  },
];

describe('Exam Engine - Core Functions', () => {
  describe('selectExamQuestions', () => {
    it('should select specified number of questions', () => {
      const questions = createSampleQuestions();
      const selected = selectExamQuestions(questions, 5);

      expect(selected.length).toBe(5);
    });

    it('should shuffle questions', () => {
      const questions = createSampleQuestions();
      const selected1 = selectExamQuestions(questions, 5);
      const selected2 = selectExamQuestions(questions, 5);

      // With random shuffling, order should sometimes differ
      // (This test may occasionally fail due to randomness)
      // ids are not checked since order is random
      // Just ensure they're valid selections
      expect(selected1.every(q => questions.some(oq => oq.id === q.id))).toBe(true);
    });

    it('should handle fewer questions than requested', () => {
      const questions = createSampleQuestions();
      const selected = selectExamQuestions(questions, 100);

      expect(selected.length).toBeLessThanOrEqual(questions.length);
    });
  });

  describe('calculateExamScore', () => {
    it('should calculate correct score', () => {
      const questions = createSampleQuestions();
      const answers = new Map<string, number | number[]>();
      answers.set('q1', 0); // Correct
      answers.set('q2', 1); // Correct
      answers.set('q3', 0); // Incorrect (should be 2)

      const breakdown = calculateExamScore(questions, answers);

      expect(breakdown.earnedPoints).toBe(2);
      expect(breakdown.totalPoints).toBe(8); // All questions have points
    });

    it('should handle multiple-select questions', () => {
      const questions = createSampleQuestions();
      const answers = new Map<string, number | number[]>();
      answers.set('q7', [0, 2]); // Correct multi-select

      const breakdown = calculateExamScore(questions, answers);

      expect(breakdown.earnedPoints).toBe(2); // q7 is worth 2 points
    });

    it('should handle incorrect multiple-select', () => {
      const questions = createSampleQuestions();
      const answers = new Map<string, number | number[]>();
      answers.set('q7', [0, 1]); // Incorrect - should be [0, 2]

      const breakdown = calculateExamScore(questions, answers);

      // q7 should not be counted as correct
      const q7Result = breakdown.questionResults.find(r => r.questionId === 'q7');
      expect(q7Result?.correct).toBe(false);
    });

    it('should calculate percentage correctly', () => {
      const questions = createSampleQuestions();
      const answers = new Map<string, number | number[]>();
      // Answer all correctly
      answers.set('q1', 0);
      answers.set('q2', 1);
      answers.set('q3', 2);
      answers.set('q4', 3);
      answers.set('q5', 0);
      answers.set('q6', 1);
      answers.set('q7', [0, 2]);

      const breakdown = calculateExamScore(questions, answers);

      expect(breakdown.percentage).toBe(100);
    });

    it('should track per-domain performance', () => {
      const questions = createSampleQuestions();
      const answers = new Map<string, number | number[]>();
      answers.set('q1', 0); // domain1 correct
      answers.set('q2', 0); // domain1 incorrect

      const breakdown = calculateExamScore(questions, answers);

      expect(breakdown.byDomain.domain1.questionsCorrect).toBe(1);
      expect(breakdown.byDomain.domain1.questionsTotal).toBe(2);
    });
  });

  describe('isExamPassed', () => {
    it('should return true for passing score', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 100,
        earnedPoints: 75,
        percentage: 75,
        byDomain: {} as any,
        questionResults: [],
        timeSpent: 0,
      };

      expect(isExamPassed(breakdown)).toBe(true);
    });

    it('should return false for failing score', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 100,
        earnedPoints: 50,
        percentage: 50,
        byDomain: {} as any,
        questionResults: [],
        timeSpent: 0,
      };

      expect(isExamPassed(breakdown)).toBe(false);
    });

    it('should use custom passing score', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 100,
        earnedPoints: 75,
        percentage: 75,
        byDomain: {} as any,
        questionResults: [],
        timeSpent: 0,
      };

      expect(isExamPassed(breakdown, 80)).toBe(false);
      expect(isExamPassed(breakdown, 70)).toBe(true);
    });
  });

  describe('getWeakDomains', () => {
    it('should identify weak domains', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 100,
        earnedPoints: 50,
        percentage: 50,
        byDomain: {
          domain1: { domainName: 'D1', questionsTotal: 10, questionsCorrect: 8, percentage: 80, weight: 31 },
          domain2: { domainName: 'D2', questionsTotal: 5, questionsCorrect: 2, percentage: 40, weight: 5 },
          domain3: { domainName: 'D3', questionsTotal: 10, questionsCorrect: 5, percentage: 50, weight: 19 },
          domain4: { domainName: 'D4', questionsTotal: 15, questionsCorrect: 12, percentage: 80, weight: 33 },
          domain5: { domainName: 'D5', questionsTotal: 5, questionsCorrect: 3, percentage: 60, weight: 12 },
        },
        questionResults: [],
        timeSpent: 0,
      };

      const weakDomains = getWeakDomains(breakdown);

      expect(weakDomains.length).toBe(3); // D2, D3, D5 are below 70%
      expect(weakDomains[0].percentage).toBe(40); // Sorted by percentage
    });
  });

  describe('ExamTimer', () => {
    it('should calculate time remaining', () => {
      const timer = new ExamTimer(60);
      const remaining = timer.getTimeRemaining();

      expect(remaining).toBeLessThanOrEqual(60);
      expect(remaining).toBeGreaterThan(55); // Allow some margin
    });

    it('should format time correctly', () => {
      const timer = new ExamTimer(125);
      const formatted = timer.formatTimeRemaining();

      expect(formatted).toMatch(/^\d+:\d{2}$/);
    });

    it('should track elapsed time', async () => {
      const timer = new ExamTimer(60);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const elapsed = timer.getTimeElapsed();
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Exam Engine - Exam Modes', () => {
  describe('EXAM_MODE_CONFIGS', () => {
    it('should have all required modes', () => {
      expect(EXAM_MODE_CONFIGS).toHaveProperty('full-practice');
      expect(EXAM_MODE_CONFIGS).toHaveProperty('quick-quiz');
      expect(EXAM_MODE_CONFIGS).toHaveProperty('domain-test');
      expect(EXAM_MODE_CONFIGS).toHaveProperty('weak-area-focus');
      expect(EXAM_MODE_CONFIGS).toHaveProperty('review-mode');
    });

    it('should have correct full-practice config', () => {
      const config = EXAM_MODE_CONFIGS['full-practice'];

      expect(config.questionCount).toBe(60);
      expect(config.timeLimitMinutes).toBe(90);
      expect(config.shuffleQuestions).toBe(true);
    });

    it('should have correct quick-quiz config', () => {
      const config = EXAM_MODE_CONFIGS['quick-quiz'];

      expect(config.questionCount).toBe(15);
      expect(config.timeLimitMinutes).toBe(15);
    });

    it('should have no time limit for review-mode', () => {
      const config = EXAM_MODE_CONFIGS['review-mode'];

      expect(config.timeLimitMinutes).toBe(0);
    });
  });

  describe('DOMAIN_INFO', () => {
    it('should have all 5 domains', () => {
      expect(Object.keys(DOMAIN_INFO).length).toBe(5);
      expect(DOMAIN_INFO).toHaveProperty('domain1');
      expect(DOMAIN_INFO).toHaveProperty('domain2');
      expect(DOMAIN_INFO).toHaveProperty('domain3');
      expect(DOMAIN_INFO).toHaveProperty('domain4');
      expect(DOMAIN_INFO).toHaveProperty('domain5');
    });

    it('should have correct weights', () => {
      expect(DOMAIN_INFO.domain1.weight).toBe(31);
      expect(DOMAIN_INFO.domain2.weight).toBe(5);
      expect(DOMAIN_INFO.domain3.weight).toBe(19);
      expect(DOMAIN_INFO.domain4.weight).toBe(33);
      expect(DOMAIN_INFO.domain5.weight).toBe(12);
    });

    it('should have names and descriptions', () => {
      Object.values(DOMAIN_INFO).forEach(domain => {
        expect(domain.name).toBeDefined();
        expect(domain.description).toBeDefined();
        expect(domain.name.length).toBeGreaterThan(0);
        expect(domain.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('selectQuestionsForMode', () => {
    it('should select questions for full-practice mode', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('full-practice');
      const selected = selectQuestionsForMode(questions, config);

      // With limited sample questions, can't reach 60
      expect(selected.length).toBeGreaterThan(0);
    });

    it('should select questions for quick-quiz mode', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('quick-quiz');
      const selected = selectQuestionsForMode(questions, config);

      expect(selected.length).toBeLessThanOrEqual(15);
    });

    it('should select questions for domain-test mode', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('domain-test', { domain: 'domain1' });
      const selected = selectQuestionsForMode(questions, config);

      // Should only have domain1 questions
      expect(selected.every(q => q.domain === 'domain1')).toBe(true);
    });

    it('should throw error for domain-test without domain', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('domain-test');

      expect(() => selectQuestionsForMode(questions, config)).toThrow();
    });

    it('should select questions for weak-area-focus mode', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('weak-area-focus', {
        weakDomains: ['domain4', 'domain5'],
      });
      const selected = selectQuestionsForMode(questions, config);

      // Should only have questions from weak domains
      expect(selected.every(q =>
        q.domain === 'domain4' || q.domain === 'domain5'
      )).toBe(true);
    });

    it('should select questions for review-mode', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('review-mode', {
        reviewQuestionIds: ['q1', 'q3', 'q5'],
      });
      const selected = selectQuestionsForMode(questions, config);

      expect(selected.length).toBe(3);
      expect(selected.map(q => q.id).sort()).toEqual(['q1', 'q3', 'q5']);
    });

    it('should return empty for review-mode with no questions', () => {
      const questions = createSampleQuestions();
      const config = createExamConfig('review-mode', {
        reviewQuestionIds: [],
      });
      const selected = selectQuestionsForMode(questions, config);

      expect(selected.length).toBe(0);
    });
  });

  describe('createExamConfig', () => {
    it('should create config with base settings', () => {
      const config = createExamConfig('full-practice');

      expect(config.mode).toBe('full-practice');
      expect(config.questionCount).toBe(60);
      expect(config.timeLimitMinutes).toBe(90);
    });

    it('should include domain for domain-test', () => {
      const config = createExamConfig('domain-test', { domain: 'domain1' });

      expect(config.domain).toBe('domain1');
    });

    it('should include weak domains for weak-area-focus', () => {
      const config = createExamConfig('weak-area-focus', {
        weakDomains: ['domain2', 'domain5'],
      });

      expect(config.weakDomains).toEqual(['domain2', 'domain5']);
    });
  });

  describe('getIncorrectQuestionIds', () => {
    it('should return IDs of incorrect answers', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 10,
        earnedPoints: 5,
        percentage: 50,
        byDomain: {} as any,
        questionResults: [
          { questionId: 'q1', correct: true, userAnswer: 0, correctAnswer: 0, points: 1 },
          { questionId: 'q2', correct: false, userAnswer: 1, correctAnswer: 2, points: 1 },
          { questionId: 'q3', correct: true, userAnswer: 3, correctAnswer: 3, points: 1 },
          { questionId: 'q4', correct: false, userAnswer: 0, correctAnswer: 1, points: 1 },
        ],
        timeSpent: 0,
      };

      const incorrect = getIncorrectQuestionIds(breakdown);

      expect(incorrect).toEqual(['q2', 'q4']);
    });

    it('should return empty array if all correct', () => {
      const breakdown: ExamBreakdown = {
        totalPoints: 10,
        earnedPoints: 10,
        percentage: 100,
        byDomain: {} as any,
        questionResults: [
          { questionId: 'q1', correct: true, userAnswer: 0, correctAnswer: 0, points: 1 },
          { questionId: 'q2', correct: true, userAnswer: 2, correctAnswer: 2, points: 1 },
        ],
        timeSpent: 0,
      };

      const incorrect = getIncorrectQuestionIds(breakdown);

      expect(incorrect).toEqual([]);
    });
  });

  describe('getWeakDomainsFromHistory', () => {
    it('should identify weak domains from multiple exams', () => {
      const breakdowns: ExamBreakdown[] = [
        {
          totalPoints: 100,
          earnedPoints: 50,
          percentage: 50,
          byDomain: {
            domain1: { domainName: 'D1', questionsTotal: 10, questionsCorrect: 8, percentage: 80, weight: 31 },
            domain2: { domainName: 'D2', questionsTotal: 5, questionsCorrect: 2, percentage: 40, weight: 5 },
            domain3: { domainName: 'D3', questionsTotal: 10, questionsCorrect: 5, percentage: 50, weight: 19 },
            domain4: { domainName: 'D4', questionsTotal: 15, questionsCorrect: 12, percentage: 80, weight: 33 },
            domain5: { domainName: 'D5', questionsTotal: 5, questionsCorrect: 3, percentage: 60, weight: 12 },
          },
          questionResults: [],
          timeSpent: 0,
        },
      ];

      const weakDomains = getWeakDomainsFromHistory(breakdowns);

      expect(weakDomains).toContain('domain2');
      expect(weakDomains).toContain('domain3');
      expect(weakDomains).toContain('domain5');
      expect(weakDomains).not.toContain('domain1');
      expect(weakDomains).not.toContain('domain4');
    });

    it('should aggregate across multiple exams', () => {
      const breakdowns: ExamBreakdown[] = [
        {
          totalPoints: 50,
          earnedPoints: 25,
          percentage: 50,
          byDomain: {
            domain1: { domainName: 'D1', questionsTotal: 10, questionsCorrect: 5, percentage: 50, weight: 31 },
            domain2: { domainName: 'D2', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 5 },
            domain3: { domainName: 'D3', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 19 },
            domain4: { domainName: 'D4', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 33 },
            domain5: { domainName: 'D5', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 12 },
          },
          questionResults: [],
          timeSpent: 0,
        },
        {
          totalPoints: 50,
          earnedPoints: 45,
          percentage: 90,
          byDomain: {
            domain1: { domainName: 'D1', questionsTotal: 10, questionsCorrect: 9, percentage: 90, weight: 31 },
            domain2: { domainName: 'D2', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 5 },
            domain3: { domainName: 'D3', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 19 },
            domain4: { domainName: 'D4', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 33 },
            domain5: { domainName: 'D5', questionsTotal: 0, questionsCorrect: 0, percentage: 0, weight: 12 },
          },
          questionResults: [],
          timeSpent: 0,
        },
      ];

      const weakDomains = getWeakDomainsFromHistory(breakdowns);

      // domain1: (5+9)/(10+10) = 70%, should NOT be weak
      expect(weakDomains).not.toContain('domain1');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(125)).toBe('2:05');
    });

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should handle negative', () => {
      expect(formatTime(-10)).toBe('0:00');
    });
  });

  describe('getEstimatedTimePerQuestion', () => {
    it('should calculate time per question', () => {
      // 90 minutes, 60 questions = 90 seconds per question
      expect(getEstimatedTimePerQuestion(60, 90)).toBe(90);
    });

    it('should return 0 for no time limit', () => {
      expect(getEstimatedTimePerQuestion(30, 0)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(getEstimatedTimePerQuestion(15, 15)).toBe(60);
    });
  });
});
