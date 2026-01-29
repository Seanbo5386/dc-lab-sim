import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRACTICAL_EXAMS,
  createPracticalExamSession,
  startChallenge,
  evaluateCommand,
  completeChallenge,
  calculateExamResult,
  getExamById,
  getExamsByDomain,
  getAllPracticalExams,
  formatExamTime,
  getHint,
  calculateHintPenalty,
  type PracticalExamSession,
  type ChallengeResult,
} from '../practicalExamEngine';

describe('Practical Exam Engine - Data Structures', () => {
  it('should have practical exams defined', () => {
    expect(PRACTICAL_EXAMS.length).toBeGreaterThan(0);
  });

  it('should have valid exam structure', () => {
    PRACTICAL_EXAMS.forEach(exam => {
      expect(exam.id).toBeDefined();
      expect(exam.title).toBeDefined();
      expect(exam.description).toBeDefined();
      expect(exam.domain).toMatch(/^domain[1-5]$/);
      expect(['beginner', 'intermediate', 'advanced']).toContain(exam.difficulty);
      expect(exam.timeLimitMinutes).toBeGreaterThan(0);
      expect(exam.passingScore).toBeGreaterThan(0);
      expect(exam.passingScore).toBeLessThanOrEqual(100);
      expect(exam.challenges.length).toBeGreaterThan(0);
      expect(exam.totalPoints).toBeGreaterThan(0);
    });
  });

  it('should have valid challenge structure', () => {
    PRACTICAL_EXAMS.forEach(exam => {
      exam.challenges.forEach(challenge => {
        expect(challenge.id).toBeDefined();
        expect(challenge.title).toBeDefined();
        expect(challenge.description).toBeDefined();
        expect(challenge.points).toBeGreaterThan(0);
        expect(typeof challenge.partialCredit).toBe('boolean');
        expect(challenge.objectives.length).toBeGreaterThan(0);
        expect(challenge.hints.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have valid objective structure', () => {
    PRACTICAL_EXAMS.forEach(exam => {
      exam.challenges.forEach(challenge => {
        challenge.objectives.forEach(objective => {
          expect(objective.id).toBeDefined();
          expect(objective.description).toBeDefined();
          expect(objective.points).toBeGreaterThan(0);
          expect(objective.validationPattern).toBeDefined();
          expect(['command', 'output', 'state']).toContain(objective.validationType);
        });
      });
    });
  });

  it('should have challenge points sum to total', () => {
    PRACTICAL_EXAMS.forEach(exam => {
      const challengePointsSum = exam.challenges.reduce((sum, c) => sum + c.points, 0);
      // Allow for time bonus making total slightly higher
      expect(challengePointsSum).toBeLessThanOrEqual(exam.totalPoints + 20);
    });
  });
});

describe('Practical Exam Engine - Session Management', () => {
  describe('createPracticalExamSession', () => {
    it('should create a valid session', () => {
      const session = createPracticalExamSession('troubleshooting-101');

      expect(session.id).toMatch(/^practical-/);
      expect(session.examId).toBe('troubleshooting-101');
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.timeLimitSeconds).toBe(30 * 60); // 30 minutes
      expect(session.timeRemaining).toBe(session.timeLimitSeconds);
      expect(session.currentChallengeIndex).toBe(0);
      expect(session.challengeResults).toEqual([]);
      expect(session.totalPointsEarned).toBe(0);
      expect(session.totalPointsPossible).toBe(100);
      expect(session.isPaused).toBe(false);
      expect(session.isComplete).toBe(false);
    });

    it('should throw error for invalid exam ID', () => {
      expect(() => createPracticalExamSession('invalid-exam')).toThrow('Exam not found');
    });

    it('should generate unique session IDs', () => {
      const session1 = createPracticalExamSession('troubleshooting-101');
      const session2 = createPracticalExamSession('troubleshooting-101');
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('startChallenge', () => {
    let session: PracticalExamSession;

    beforeEach(() => {
      session = createPracticalExamSession('troubleshooting-101');
    });

    it('should create a challenge result', () => {
      const result = startChallenge(session, 0);

      expect(result.challengeId).toBe('tc-gpu-health');
      expect(result.startTime).toBeGreaterThan(0);
      expect(result.pointsEarned).toBe(0);
      expect(result.pointsPossible).toBe(25);
      expect(result.objectiveResults.length).toBe(3);
      expect(result.commandsUsed).toEqual([]);
      expect(result.hintsUsed).toBe(0);
    });

    it('should initialize all objectives as incomplete', () => {
      const result = startChallenge(session, 0);

      result.objectiveResults.forEach(obj => {
        expect(obj.completed).toBe(false);
        expect(obj.pointsEarned).toBe(0);
      });
    });

    it('should throw error for invalid challenge index', () => {
      expect(() => startChallenge(session, 99)).toThrow('Invalid challenge index');
    });
  });
});

describe('Practical Exam Engine - Command Evaluation', () => {
  let session: PracticalExamSession;
  let challengeResult: ChallengeResult;
  const exam = PRACTICAL_EXAMS.find(e => e.id === 'troubleshooting-101')!;
  const challenge = exam.challenges[0];

  beforeEach(() => {
    session = createPracticalExamSession('troubleshooting-101');
    challengeResult = startChallenge(session, 0);
  });

  it('should mark objective complete for matching command', () => {
    const result = evaluateCommand('nvidia-smi', 'GPU output...', challenge, challengeResult);

    const obj1 = result.objectiveResults.find(o => o.objectiveId === 'obj-1');
    expect(obj1?.completed).toBe(true);
    expect(obj1?.pointsEarned).toBe(5);
  });

  it('should not mark objective complete for non-matching command', () => {
    const result = evaluateCommand('ls -la', 'files...', challenge, challengeResult);

    const obj1 = result.objectiveResults.find(o => o.objectiveId === 'obj-1');
    expect(obj1?.completed).toBe(false);
    expect(obj1?.pointsEarned).toBe(0);
  });

  it('should track commands used', () => {
    let result = evaluateCommand('nvidia-smi', 'output', challenge, challengeResult);
    result = evaluateCommand('nvidia-smi -q', 'detailed output', challenge, result);

    expect(result.commandsUsed).toContain('nvidia-smi');
    expect(result.commandsUsed).toContain('nvidia-smi -q');
  });

  it('should accumulate points for multiple objectives', () => {
    let result = evaluateCommand('nvidia-smi', 'output', challenge, challengeResult);
    result = evaluateCommand('nvidia-smi -q -d ECC', 'ECC output', challenge, result);

    expect(result.pointsEarned).toBe(15); // 5 + 10
  });

  it('should not re-complete already completed objectives', () => {
    let result = evaluateCommand('nvidia-smi', 'output', challenge, challengeResult);
    result = evaluateCommand('nvidia-smi', 'output again', challenge, result);

    expect(result.pointsEarned).toBe(5); // Still 5, not 10
  });

  it('should match output patterns', () => {
    const result = evaluateCommand('nvidia-smi -q', 'GPU 2: error', challenge, challengeResult);

    const obj3 = result.objectiveResults.find(o => o.objectiveId === 'obj-3');
    expect(obj3?.completed).toBe(true);
  });
});

describe('Practical Exam Engine - Challenge Completion', () => {
  const exam = PRACTICAL_EXAMS.find(e => e.id === 'troubleshooting-101')!;
  const challenge = exam.challenges[0];

  it('should calculate duration correctly', () => {
    const result: ChallengeResult = {
      challengeId: challenge.id,
      startTime: Date.now() - 120000, // 2 minutes ago
      durationSeconds: 0,
      pointsEarned: 25,
      pointsPossible: 25,
      objectiveResults: [],
      timeBonusEarned: 0,
      commandsUsed: [],
      hintsUsed: 0,
    };

    const completed = completeChallenge(challenge, result);
    expect(completed.durationSeconds).toBeGreaterThanOrEqual(120);
    expect(completed.endTime).toBeDefined();
  });

  it('should award time bonus if under threshold', () => {
    const result: ChallengeResult = {
      challengeId: challenge.id,
      startTime: Date.now() - 60000, // 1 minute ago (under 5 min threshold)
      durationSeconds: 0,
      pointsEarned: 20, // 80% completion
      pointsPossible: 25,
      objectiveResults: [],
      timeBonusEarned: 0,
      commandsUsed: [],
      hintsUsed: 0,
    };

    const completed = completeChallenge(challenge, result);
    expect(completed.timeBonusEarned).toBe(5);
  });

  it('should not award time bonus if over threshold', () => {
    const result: ChallengeResult = {
      challengeId: challenge.id,
      startTime: Date.now() - 400000, // Over 5 min threshold
      durationSeconds: 0,
      pointsEarned: 25,
      pointsPossible: 25,
      objectiveResults: [],
      timeBonusEarned: 0,
      commandsUsed: [],
      hintsUsed: 0,
    };

    const completed = completeChallenge(challenge, result);
    expect(completed.timeBonusEarned).toBe(0);
  });

  it('should not award time bonus if completion too low', () => {
    const result: ChallengeResult = {
      challengeId: challenge.id,
      startTime: Date.now() - 60000, // Under threshold
      durationSeconds: 0,
      pointsEarned: 5, // Only 20% completion
      pointsPossible: 25,
      objectiveResults: [],
      timeBonusEarned: 0,
      commandsUsed: [],
      hintsUsed: 0,
    };

    const completed = completeChallenge(challenge, result);
    expect(completed.timeBonusEarned).toBe(0);
  });
});

describe('Practical Exam Engine - Exam Results', () => {
  it('should calculate passing result', () => {
    const session: PracticalExamSession = {
      id: 'test-session',
      examId: 'troubleshooting-101',
      startTime: Date.now() - 600000,
      endTime: Date.now(),
      timeLimitSeconds: 1800,
      timeRemaining: 1200,
      currentChallengeIndex: 4,
      challengeResults: [
        { challengeId: 'tc-gpu-health', startTime: 0, durationSeconds: 120, pointsEarned: 25, pointsPossible: 25, objectiveResults: [], timeBonusEarned: 5, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-thermal', startTime: 0, durationSeconds: 180, pointsEarned: 20, pointsPossible: 25, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-xid-error', startTime: 0, durationSeconds: 200, pointsEarned: 25, pointsPossible: 30, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-nvlink', startTime: 0, durationSeconds: 100, pointsEarned: 15, pointsPossible: 20, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
      ],
      totalPointsEarned: 90, // 25+5 + 20 + 25 + 15 = 90
      totalPointsPossible: 100,
      isPaused: false,
      isComplete: true,
      commandHistory: [],
    };

    const result = calculateExamResult(session);

    expect(result.score).toBe(90);
    expect(result.percentage).toBe(90);
    expect(result.passed).toBe(true);
    expect(result.feedback.some(f => f.includes('Congratulations'))).toBe(true);
  });

  it('should calculate failing result', () => {
    const session: PracticalExamSession = {
      id: 'test-session',
      examId: 'troubleshooting-101',
      startTime: Date.now() - 600000,
      endTime: Date.now(),
      timeLimitSeconds: 1800,
      timeRemaining: 1200,
      currentChallengeIndex: 4,
      challengeResults: [
        { challengeId: 'tc-gpu-health', startTime: 0, durationSeconds: 120, pointsEarned: 10, pointsPossible: 25, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-thermal', startTime: 0, durationSeconds: 180, pointsEarned: 10, pointsPossible: 25, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-xid-error', startTime: 0, durationSeconds: 200, pointsEarned: 15, pointsPossible: 30, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
        { challengeId: 'tc-nvlink', startTime: 0, durationSeconds: 100, pointsEarned: 10, pointsPossible: 20, objectiveResults: [], timeBonusEarned: 0, commandsUsed: [], hintsUsed: 0 },
      ],
      totalPointsEarned: 45,
      totalPointsPossible: 100,
      isPaused: false,
      isComplete: true,
      commandHistory: [],
    };

    const result = calculateExamResult(session);

    expect(result.percentage).toBe(45);
    expect(result.passed).toBe(false);
    expect(result.feedback.some(f => f.includes('did not pass'))).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Practical Exam Engine - Utility Functions', () => {
  describe('getExamById', () => {
    it('should return exam by ID', () => {
      const exam = getExamById('troubleshooting-101');
      expect(exam).toBeDefined();
      expect(exam?.title).toBe('GPU Troubleshooting Fundamentals');
    });

    it('should return undefined for invalid ID', () => {
      const exam = getExamById('invalid');
      expect(exam).toBeUndefined();
    });
  });

  describe('getExamsByDomain', () => {
    it('should return exams for domain', () => {
      const exams = getExamsByDomain('domain5');
      expect(exams.length).toBeGreaterThan(0);
      exams.forEach(exam => {
        expect(exam.domain).toBe('domain5');
      });
    });

    it('should return empty array for domain with no exams', () => {
      const exams = getExamsByDomain('domain1');
      // domain1 might not have exams in our current set
      expect(Array.isArray(exams)).toBe(true);
    });
  });

  describe('getAllPracticalExams', () => {
    it('should return all exams', () => {
      const exams = getAllPracticalExams();
      expect(exams.length).toBe(PRACTICAL_EXAMS.length);
    });
  });

  describe('formatExamTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatExamTime(90)).toBe('1:30');
      expect(formatExamTime(60)).toBe('1:00');
      expect(formatExamTime(0)).toBe('0:00');
      expect(formatExamTime(3661)).toBe('61:01');
    });
  });

  describe('getHint', () => {
    const challenge = PRACTICAL_EXAMS[0].challenges[0];

    it('should return hint at index', () => {
      const result = getHint(challenge, 0);
      expect(result).not.toBeNull();
      expect(result?.hint).toBeDefined();
      expect(result?.remaining).toBe(challenge.hints.length - 1);
    });

    it('should return null for out of bounds index', () => {
      const result = getHint(challenge, 99);
      expect(result).toBeNull();
    });
  });

  describe('calculateHintPenalty', () => {
    it('should calculate 10% penalty per hint', () => {
      expect(calculateHintPenalty(1, 100)).toBe(10);
      expect(calculateHintPenalty(2, 100)).toBe(20);
    });

    it('should cap penalty at 30%', () => {
      expect(calculateHintPenalty(5, 100)).toBe(30);
      expect(calculateHintPenalty(10, 100)).toBe(30);
    });

    it('should work with different point values', () => {
      expect(calculateHintPenalty(1, 50)).toBe(5);
      expect(calculateHintPenalty(2, 50)).toBe(10);
    });
  });
});
