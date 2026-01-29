import { describe, it, expect } from 'vitest';
import {
  LEARNING_PATHS,
  ALL_PATHS,
  getLearningPath,
  getPathsByWeight,
  getLessonById,
  getModuleById,
  areLessonPrerequisitesMet,
  areModulePrerequisitesMet,
  getNextLesson,
  calculatePathProgress,
  validateCommand,
  getTotalPathStats,
  getDomainWithPath,
  EXAM_COMMAND_REFERENCE,
  XID_REFERENCE,
  DGX_A100_SPECS,
  getStudyPriorities,
} from '../learningPathEngine';

describe('learningPathEngine', () => {
  describe('LEARNING_PATHS constant', () => {
    it('should have paths for all 5 domains', () => {
      expect(Object.keys(LEARNING_PATHS)).toHaveLength(5);
      expect(LEARNING_PATHS.domain1).toBeDefined();
      expect(LEARNING_PATHS.domain2).toBeDefined();
      expect(LEARNING_PATHS.domain3).toBeDefined();
      expect(LEARNING_PATHS.domain4).toBeDefined();
      expect(LEARNING_PATHS.domain5).toBeDefined();
    });

    it('should have correct exam weights totaling 100%', () => {
      const totalWeight = ALL_PATHS.reduce((sum, path) => sum + path.examWeight, 0);
      expect(totalWeight).toBe(100);
    });

    it('should have at least one module per path', () => {
      ALL_PATHS.forEach(path => {
        expect(path.modules.length).toBeGreaterThan(0);
      });
    });

    it('should have at least one lesson per module', () => {
      ALL_PATHS.forEach(path => {
        path.modules.forEach(module => {
          expect(module.lessons.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getLearningPath', () => {
    it('should return correct path for domain1', () => {
      const path = getLearningPath('domain1');
      expect(path.domainId).toBe('domain1');
      expect(path.examWeight).toBe(31);
    });

    it('should return correct path for domain4', () => {
      const path = getLearningPath('domain4');
      expect(path.domainId).toBe('domain4');
      expect(path.examWeight).toBe(33);
    });
  });

  describe('getPathsByWeight', () => {
    it('should return paths sorted by exam weight descending', () => {
      const paths = getPathsByWeight();
      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].examWeight).toBeGreaterThanOrEqual(paths[i + 1].examWeight);
      }
    });
  });

  describe('getLessonById', () => {
    it('should find existing lesson', () => {
      const result = getLessonById('lesson-d1-dmidecode');
      expect(result).not.toBeNull();
      expect(result?.lesson.title).toContain('dmidecode');
    });

    it('should return null for non-existent lesson', () => {
      const result = getLessonById('non-existent-lesson');
      expect(result).toBeNull();
    });
  });

  describe('getModuleById', () => {
    it('should find existing module', () => {
      const result = getModuleById('mod-d1-bios-bmc');
      expect(result).not.toBeNull();
      expect(result?.module.title).toContain('BIOS');
    });

    it('should return null for non-existent module', () => {
      const result = getModuleById('non-existent-module');
      expect(result).toBeNull();
    });
  });

  describe('areLessonPrerequisitesMet', () => {
    it('should return true when no prerequisites', () => {
      const result = areLessonPrerequisitesMet('lesson-d1-dmidecode', new Set());
      expect(result).toBe(true);
    });

    it('should return false when prerequisites not met', () => {
      const result = areLessonPrerequisitesMet('lesson-d1-ipmitool', new Set());
      expect(result).toBe(false);
    });

    it('should return true when prerequisites are met', () => {
      const completed = new Set(['lesson-d1-dmidecode']);
      const result = areLessonPrerequisitesMet('lesson-d1-ipmitool', completed);
      expect(result).toBe(true);
    });
  });

  describe('areModulePrerequisitesMet', () => {
    it('should return true when no prerequisites', () => {
      const result = areModulePrerequisitesMet('mod-d1-bios-bmc', new Set());
      expect(result).toBe(true);
    });

    it('should return false when prerequisites not met', () => {
      const result = areModulePrerequisitesMet('mod-d1-drivers', new Set());
      expect(result).toBe(false);
    });

    it('should return true when prerequisites are met', () => {
      const completed = new Set(['mod-d1-bios-bmc']);
      const result = areModulePrerequisitesMet('mod-d1-drivers', completed);
      expect(result).toBe(true);
    });
  });

  describe('getNextLesson', () => {
    it('should return first lesson when nothing completed', () => {
      const result = getNextLesson(new Set(), new Set());
      expect(result).not.toBeNull();
      expect(result?.lesson).toBeDefined();
    });

    it('should return next incomplete lesson', () => {
      const completedLessons = new Set(['lesson-d1-dmidecode']);
      const result = getNextLesson(completedLessons, new Set());
      expect(result).not.toBeNull();
      expect(result?.lesson.id).not.toBe('lesson-d1-dmidecode');
    });
  });

  describe('calculatePathProgress', () => {
    it('should return 0% when no lessons completed', () => {
      const progress = calculatePathProgress('path-domain1', new Set());
      expect(progress.completedLessons).toBe(0);
      expect(progress.overallPercentage).toBe(0);
    });

    it('should calculate correct percentage when lessons completed', () => {
      const completedLessons = new Set(['lesson-d1-dmidecode']);
      const progress = calculatePathProgress('path-domain1', completedLessons);
      expect(progress.completedLessons).toBe(1);
      expect(progress.overallPercentage).toBeGreaterThan(0);
    });
  });

  describe('validateCommand', () => {
    it('should validate exact command match', () => {
      const step = {
        id: 'test',
        type: 'command' as const,
        title: 'Test',
        content: 'Test',
        expectedCommand: 'nvidia-smi',
      };
      const result = validateCommand('nvidia-smi', step);
      expect(result.valid).toBe(true);
    });

    it('should validate command with pattern', () => {
      const step = {
        id: 'test',
        type: 'command' as const,
        title: 'Test',
        content: 'Test',
        expectedCommand: 'dmidecode -t bios',
        validationPattern: /dmidecode\s+(-t\s+bios|-t\s+0)/,
      };
      const result = validateCommand('dmidecode -t 0', step);
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect command', () => {
      const step = {
        id: 'test',
        type: 'command' as const,
        title: 'Test',
        content: 'Test',
        expectedCommand: 'nvidia-smi',
      };
      const result = validateCommand('wrong-command', step);
      expect(result.valid).toBe(false);
    });
  });

  describe('getTotalPathStats', () => {
    it('should return correct totals', () => {
      const stats = getTotalPathStats();
      expect(stats.totalPaths).toBe(5);
      expect(stats.totalModules).toBeGreaterThan(0);
      expect(stats.totalLessons).toBeGreaterThan(0);
      expect(stats.totalEstimatedMinutes).toBeGreaterThan(0);
    });
  });

  describe('Reference data', () => {
    it('EXAM_COMMAND_REFERENCE should have commands organized by category', () => {
      expect(EXAM_COMMAND_REFERENCE.platformBringUp).toBeDefined();
      expect(EXAM_COMMAND_REFERENCE.platformBringUp.systemInfo.length).toBeGreaterThan(0);
    });

    it('XID_REFERENCE should have XID codes', () => {
      expect(XID_REFERENCE.length).toBeGreaterThan(0);
      expect(XID_REFERENCE[0]).toHaveProperty('xid');
      expect(XID_REFERENCE[0]).toHaveProperty('desc');
    });

    it('DGX_A100_SPECS should have GPU specs', () => {
      expect(DGX_A100_SPECS.gpus.count).toBe(8);
      expect(DGX_A100_SPECS.nvlink.nvSwitchCount).toBe(6);
    });
  });

  describe('getStudyPriorities', () => {
    it('should return priorities for all 5 domains', () => {
      const priorities = getStudyPriorities();
      expect(priorities).toHaveLength(5);
    });

    it('should have High priority for Domain 4 (33%)', () => {
      const priorities = getStudyPriorities();
      const domain4 = priorities.find(p => p.domain.includes('Domain 4'));
      expect(domain4?.priority).toBe('High');
    });
  });

  describe('getDomainWithPath', () => {
    it('should return domain info with path', () => {
      const result = getDomainWithPath('domain1');
      expect(result.id).toBe('domain1');
      expect(result.path).toBeDefined();
      expect(result.path.domainId).toBe('domain1');
    });
  });
});
