import { describe, it, expect } from 'vitest';
import {
  StudyMode,
  STUDY_MODE_CONFIGS,
  FLASHCARDS,
  createStudySession,
  getFlashcardsForSession,
  getFlashcardsByCategory,
  calculateSessionResult,
  getRecommendedStudyMode,
  formatStudyDuration,
  getDomainInfo,
  getAllStudyModes,
} from '../studyModeEngine';
import type { ExamQuestion, ExamBreakdown, DomainId } from '@/types/scenarios';

// Mock exam questions for testing
const mockQuestions: ExamQuestion[] = [
  {
    id: 'q1',
    domain: 'domain1',
    questionText: 'Test question 1',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Explanation 1',
    points: 1,
    difficulty: 'beginner',
  },
  {
    id: 'q2',
    domain: 'domain1',
    questionText: 'Test question 2',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Explanation 2',
    points: 1,
    difficulty: 'intermediate',
  },
  {
    id: 'q3',
    domain: 'domain2',
    questionText: 'Test question 3',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 2,
    explanation: 'Explanation 3',
    points: 1,
    difficulty: 'advanced',
  },
  {
    id: 'q4',
    domain: 'domain3',
    questionText: 'Test question 4',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Explanation 4',
    points: 1,
    difficulty: 'beginner',
  },
  {
    id: 'q5',
    domain: 'domain4',
    questionText: 'Test question 5',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Explanation 5',
    points: 1,
    difficulty: 'intermediate',
  },
  {
    id: 'q6',
    domain: 'domain5',
    questionText: 'Test question 6',
    type: 'multiple-choice',
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 3,
    explanation: 'Explanation 6',
    points: 1,
    difficulty: 'advanced',
  },
];

describe('Study Mode Configurations', () => {
  it('should have all 5 study modes configured', () => {
    const modes: StudyMode[] = [
      'domain-deep-dive',
      'timed-practice',
      'review-mode',
      'flashcard-mode',
      'random-challenge',
    ];

    modes.forEach(mode => {
      expect(STUDY_MODE_CONFIGS[mode]).toBeDefined();
    });
  });

  it('should have valid configuration for each mode', () => {
    Object.values(STUDY_MODE_CONFIGS).forEach(config => {
      expect(config.id).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(typeof config.hasTimeLimit).toBe('boolean');
    });
  });

  it('should have time limits set for timed modes', () => {
    expect(STUDY_MODE_CONFIGS['timed-practice'].timeLimitMinutes).toBe(30);
    expect(STUDY_MODE_CONFIGS['random-challenge'].timeLimitMinutes).toBe(15);
  });

  it('should require domain for domain-deep-dive', () => {
    expect(STUDY_MODE_CONFIGS['domain-deep-dive'].requiresDomain).toBe(true);
  });

  it('should require history for review-mode', () => {
    expect(STUDY_MODE_CONFIGS['review-mode'].requiresHistory).toBe(true);
  });
});

describe('createStudySession', () => {
  it('should create session for domain-deep-dive with domain', () => {
    const session = createStudySession('domain-deep-dive', mockQuestions, {
      domain: 'domain1',
    });

    expect(session.mode).toBe('domain-deep-dive');
    expect(session.domain).toBe('domain1');
    expect(session.questions.every(q => q.domain === 'domain1')).toBe(true);
    expect(session.isComplete).toBe(false);
    expect(session.questionsAnswered).toBe(0);
  });

  it('should throw error for domain-deep-dive without domain', () => {
    expect(() => {
      createStudySession('domain-deep-dive', mockQuestions);
    }).toThrow('Domain required');
  });

  it('should create session for timed-practice', () => {
    const session = createStudySession('timed-practice', mockQuestions);

    expect(session.mode).toBe('timed-practice');
    expect(session.timeLimitSeconds).toBe(30 * 60);
    expect(session.questions.length).toBeLessThanOrEqual(20);
  });

  it('should create session for random-challenge', () => {
    const session = createStudySession('random-challenge', mockQuestions);

    expect(session.mode).toBe('random-challenge');
    expect(session.timeLimitSeconds).toBe(15 * 60);
    expect(session.questions.length).toBeLessThanOrEqual(15);
  });

  it('should create session for review-mode with incorrect questions', () => {
    const session = createStudySession('review-mode', mockQuestions, {
      incorrectQuestionIds: ['q1', 'q3'],
    });

    expect(session.mode).toBe('review-mode');
    expect(session.questions.length).toBe(2);
    expect(session.questions.map(q => q.id)).toContain('q1');
    expect(session.questions.map(q => q.id)).toContain('q3');
  });

  it('should throw error for review-mode without incorrect questions', () => {
    expect(() => {
      createStudySession('review-mode', mockQuestions, {
        incorrectQuestionIds: [],
      });
    }).toThrow('No incorrect questions');
  });

  it('should generate unique session IDs', () => {
    const session1 = createStudySession('random-challenge', mockQuestions);
    const session2 = createStudySession('random-challenge', mockQuestions);

    expect(session1.id).not.toBe(session2.id);
  });
});

describe('Flashcards', () => {
  it('should have flashcards defined', () => {
    expect(FLASHCARDS.length).toBeGreaterThan(0);
  });

  it('should have valid flashcard structure', () => {
    FLASHCARDS.forEach(card => {
      expect(card.id).toBeDefined();
      expect(card.front).toBeDefined();
      expect(card.back).toBeDefined();
      expect(['command', 'concept', 'error-code', 'procedure']).toContain(card.category);
      expect(['domain1', 'domain2', 'domain3', 'domain4', 'domain5']).toContain(card.domain);
      expect(['easy', 'medium', 'hard']).toContain(card.difficulty);
    });
  });

  it('should get flashcards for session', () => {
    const cards = getFlashcardsForSession(undefined, 10);

    expect(cards.length).toBeLessThanOrEqual(10);
    expect(Array.isArray(cards)).toBe(true);
  });

  it('should filter flashcards by domain', () => {
    const cards = getFlashcardsForSession('domain1', 20);

    cards.forEach(card => {
      expect(card.domain).toBe('domain1');
    });
  });

  it('should get flashcards by category', () => {
    const commandCards = getFlashcardsByCategory('command');

    commandCards.forEach(card => {
      expect(card.category).toBe('command');
    });
  });
});

describe('calculateSessionResult', () => {
  it('should calculate correct accuracy', () => {
    const session = createStudySession('random-challenge', mockQuestions);
    session.questionsAnswered = 10;
    session.questionsCorrect = 8;
    session.endTime = session.startTime + 300000; // 5 minutes

    const result = calculateSessionResult(session, ['nvidia-smi', 'dcgmi']);

    expect(result.accuracy).toBe(80);
    expect(result.commandsUsed).toContain('nvidia-smi');
    expect(result.commandsUsed).toContain('dcgmi');
  });

  it('should handle zero questions answered', () => {
    const session = createStudySession('random-challenge', mockQuestions);
    session.questionsAnswered = 0;
    session.questionsCorrect = 0;

    const result = calculateSessionResult(session, []);

    expect(result.accuracy).toBe(0);
  });

  it('should calculate duration correctly', () => {
    const session = createStudySession('random-challenge', mockQuestions);
    session.endTime = session.startTime + 120000; // 2 minutes

    const result = calculateSessionResult(session, []);

    expect(result.durationSeconds).toBe(120);
  });

  it('should generate recommendations for low scores', () => {
    const session = createStudySession('random-challenge', mockQuestions);
    session.questionsAnswered = 10;
    session.questionsCorrect = 3; // 30%

    const result = calculateSessionResult(session, []);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.toLowerCase().includes('fundamentals'))).toBe(true);
  });

  it('should generate recommendations for high scores', () => {
    const session = createStudySession('random-challenge', mockQuestions);
    session.questionsAnswered = 10;
    session.questionsCorrect = 9; // 90%

    const result = calculateSessionResult(session, []);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.toLowerCase().includes('excellent'))).toBe(true);
  });
});

describe('getRecommendedStudyMode', () => {
  it('should recommend domain-deep-dive for new users', () => {
    const recommendations = getRecommendedStudyMode([], []);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.mode === 'domain-deep-dive')).toBe(true);
  });

  it('should recommend review-mode after failed exam', () => {
    const mockBreakdown: ExamBreakdown = {
      totalPoints: 100,
      earnedPoints: 50,
      percentage: 50,
      byDomain: {
        domain1: { domainName: 'Platform Bring-Up', questionsTotal: 10, questionsCorrect: 5, percentage: 50, weight: 31 },
        domain2: { domainName: 'Accelerator Configuration', questionsTotal: 5, questionsCorrect: 2, percentage: 40, weight: 5 },
        domain3: { domainName: 'Base Infrastructure', questionsTotal: 10, questionsCorrect: 6, percentage: 60, weight: 19 },
        domain4: { domainName: 'Validation & Testing', questionsTotal: 15, questionsCorrect: 8, percentage: 53, weight: 33 },
        domain5: { domainName: 'Troubleshooting', questionsTotal: 5, questionsCorrect: 3, percentage: 60, weight: 12 },
      },
      questionResults: [],
      timeSpent: 3600,
    };

    const recommendations = getRecommendedStudyMode([mockBreakdown], []);

    expect(recommendations.some(r => r.mode === 'review-mode' || r.mode === 'domain-deep-dive')).toBe(true);
  });

  it('should avoid recommending recent modes', () => {
    const recentModes: StudyMode[] = ['timed-practice', 'timed-practice', 'timed-practice'];
    const recommendations = getRecommendedStudyMode([], recentModes);

    // Should suggest variety
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should limit recommendations to 3', () => {
    const recommendations = getRecommendedStudyMode([], []);

    expect(recommendations.length).toBeLessThanOrEqual(3);
  });
});

describe('formatStudyDuration', () => {
  it('should format seconds only', () => {
    expect(formatStudyDuration(45)).toBe('45s');
  });

  it('should format minutes only', () => {
    expect(formatStudyDuration(120)).toBe('2m');
  });

  it('should format minutes and seconds', () => {
    expect(formatStudyDuration(125)).toBe('2m 5s');
  });

  it('should format hours and minutes', () => {
    expect(formatStudyDuration(3720)).toBe('1h 2m');
  });
});

describe('getDomainInfo', () => {
  it('should return info for all domains', () => {
    const domains: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];

    domains.forEach(domain => {
      const info = getDomainInfo(domain);
      expect(info.name).toBeDefined();
      expect(info.weight).toBeGreaterThan(0);
      expect(info.description).toBeDefined();
    });
  });

  it('should return correct weights', () => {
    expect(getDomainInfo('domain1').weight).toBe(31);
    expect(getDomainInfo('domain2').weight).toBe(5);
    expect(getDomainInfo('domain3').weight).toBe(19);
    expect(getDomainInfo('domain4').weight).toBe(33);
    expect(getDomainInfo('domain5').weight).toBe(12);
  });
});

describe('getAllStudyModes', () => {
  it('should return all 5 study modes', () => {
    const modes = getAllStudyModes();

    expect(modes.length).toBe(5);
  });

  it('should return valid configurations', () => {
    const modes = getAllStudyModes();

    modes.forEach(mode => {
      expect(mode.id).toBeDefined();
      expect(mode.name).toBeDefined();
      expect(mode.description).toBeDefined();
    });
  });
});
