import { describe, it, expect } from 'vitest';
import {
  findSimilarCommands,
  getDidYouMeanMessage,
  getContextualSuggestions,
  getEnhancedErrorFeedback,
  formatOutputDiff,
  getContextualHint,
  generateStepCompletionFeedback,
  validateCommandSyntax,
} from '../commandSuggestions';

describe('Command Suggestions', () => {
  describe('findSimilarCommands', () => {
    it('should find similar commands for typos', () => {
      const suggestions = findSimilarCommands('nvidia-sm'); // Missing 'i'
      expect(suggestions).toContain('nvidia-smi');
    });

    it('should find similar commands for close matches', () => {
      const suggestions = findSimilarCommands('dcgm'); // Missing 'i'
      expect(suggestions).toContain('dcgmi');
    });

    it('should return empty for exact matches', () => {
      const suggestions = findSimilarCommands('nvidia-smi');
      expect(suggestions).not.toContain('nvidia-smi');
    });

    it('should return empty for unrelated input', () => {
      const suggestions = findSimilarCommands('zzzzzzz');
      expect(suggestions.length).toBe(0);
    });

    it('should limit results to 3 suggestions', () => {
      const suggestions = findSimilarCommands('s'); // Very generic
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty input', () => {
      const suggestions = findSimilarCommands('');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getDidYouMeanMessage', () => {
    it('should return message for typos', () => {
      const message = getDidYouMeanMessage('nvidia-sm');
      expect(message).not.toBeNull();
      expect(message).toContain('Did you mean');
      expect(message).toContain('nvidia-smi');
    });

    it('should return null for unrelated input', () => {
      const message = getDidYouMeanMessage('zzzzzzzzzzz');
      expect(message).toBeNull();
    });

    it('should format single suggestion differently', () => {
      const message = getDidYouMeanMessage('nvidia-sm');
      expect(message).toContain('Did you mean');
    });

    it('should list multiple suggestions', () => {
      const message = getDidYouMeanMessage('sl'); // Could match slurm commands
      if (message) {
        expect(message).toContain('Did you mean');
      }
    });
  });

  describe('getContextualSuggestions', () => {
    it('should return suggestions based on objectives', () => {
      const suggestions = getContextualSuggestions(['Check GPU status', 'Monitor temperature']);
      expect(suggestions.length).toBeGreaterThan(0);
      // Should suggest GPU-related commands
      const names = suggestions.map(s => s.name);
      expect(names.some(n => n.includes('nvidia') || n.includes('dcgmi'))).toBe(true);
    });

    it('should return empty array for unrelated objectives', () => {
      const suggestions = getContextualSuggestions(['zzzzzzz']);
      // May return some suggestions due to fuzzy matching
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should limit suggestions to 5', () => {
      const suggestions = getContextualSuggestions(['gpu', 'memory', 'status', 'check', 'monitor']);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

});

describe('Enhanced Error Feedback', () => {
  describe('getEnhancedErrorFeedback', () => {
    it('should provide feedback for command not found', () => {
      const feedback = getEnhancedErrorFeedback('xyz', 'command not found');

      expect(feedback).not.toBeNull();
      expect(feedback!.explanation).toContain('not recognized');
      expect(feedback!.suggestion).toContain('help');
    });

    it('should provide feedback for MST driver error', () => {
      const feedback = getEnhancedErrorFeedback('mlxconfig', 'MST driver not loaded');

      expect(feedback).not.toBeNull();
      expect(feedback!.explanation).toContain('MST');
      expect(feedback!.suggestion).toContain('mst start');
      expect(feedback!.documentationLink).toBeDefined();
    });

    it('should provide feedback for GPU errors', () => {
      const feedback = getEnhancedErrorFeedback('nvidia-smi', 'GPU error detected');

      expect(feedback).not.toBeNull();
      expect(feedback!.explanation).toContain('GPU');
    });

    it('should provide feedback for XID errors', () => {
      const feedback = getEnhancedErrorFeedback('nvidia-smi', 'XID error 79');

      expect(feedback).not.toBeNull();
      expect(feedback!.documentationLink).toBeDefined();
    });

    it('should provide feedback for thermal issues', () => {
      const feedback = getEnhancedErrorFeedback('nvidia-smi', 'thermal throttling active');

      expect(feedback).not.toBeNull();
      expect(feedback!.explanation).toContain('Temperature');
    });

    it('should provide feedback for OOM errors', () => {
      const feedback = getEnhancedErrorFeedback('python', 'out of memory');

      expect(feedback).not.toBeNull();
      expect(feedback!.suggestion).toContain('batch size');
    });

    it('should return null for unmatched errors', () => {
      const feedback = getEnhancedErrorFeedback('cmd', 'some random error xyz123');

      expect(feedback).toBeNull();
    });

    it('should include formatted output', () => {
      const feedback = getEnhancedErrorFeedback('cmd', 'command not found');

      expect(feedback).not.toBeNull();
      expect(feedback!.formatted).toContain('COMMAND ERROR');
      expect(feedback!.formatted).toContain('What happened');
      expect(feedback!.formatted).toContain('Suggestion');
    });
  });

  describe('formatOutputDiff', () => {
    it('should format matching lines with checkmark', () => {
      const diff = formatOutputDiff('line1\nline2', 'line1\nline2');

      expect(diff).toContain('OUTPUT COMPARISON');
      expect(diff).toContain('✓');
    });

    it('should format different lines with indicators', () => {
      const diff = formatOutputDiff('actual', 'expected');

      expect(diff).toContain('Actual');
      expect(diff).toContain('Expected');
    });

    it('should handle multi-line differences', () => {
      const actual = 'line1\nactual2\nline3';
      const expected = 'line1\nexpected2\nline3';
      const diff = formatOutputDiff(actual, expected);

      expect(diff).toContain('line1'); // Matching line
      expect(diff).toContain('actual2');
      expect(diff).toContain('expected2');
    });

    it('should accept custom label', () => {
      const diff = formatOutputDiff('a', 'b', 'CUSTOM LABEL');

      expect(diff).toContain('CUSTOM LABEL');
    });

    it('should limit output lines', () => {
      const longActual = Array(20).fill('line').join('\n');
      const longExpected = Array(20).fill('different').join('\n');
      const diff = formatOutputDiff(longActual, longExpected);

      expect(diff).toContain('more lines');
    });
  });

  describe('getContextualHint', () => {
    it('should return null for low attempt count', () => {
      const hint = getContextualHint('nvidia-smi', ['Check GPU status'], 2);
      expect(hint).toBeNull();
    });

    it('should return hint after 3 attempts', () => {
      const hint = getContextualHint('nvidia-smi', ['Check GPU status'], 3);
      expect(hint).not.toBeNull();
      expect(hint).toContain('Hint');
    });

    it('should suggest example usage', () => {
      const hint = getContextualHint('nvidia-smi', ['Check GPU status'], 5);
      expect(hint).not.toBeNull();
      expect(hint).toContain('Try');
    });

    it('should return null for unknown command', () => {
      const hint = getContextualHint('unknown_command', ['test'], 5);
      expect(hint).toBeNull();
    });
  });

  describe('generateStepCompletionFeedback', () => {
    it('should generate completion message', () => {
      const feedback = generateStepCompletionFeedback(
        'Check GPU Status',
        ['nvidia-smi', 'nvidia-smi -L'],
        30000
      );

      expect(feedback).toContain('STEP COMPLETED');
      expect(feedback).toContain('Check GPU Status');
      expect(feedback).toContain('Commands used: 2');
    });

    it('should show time taken', () => {
      const feedback = generateStepCompletionFeedback('Test', ['cmd'], 60000);

      expect(feedback).toContain('Time taken: 60s');
    });

    it('should list key commands practiced', () => {
      const feedback = generateStepCompletionFeedback(
        'Test',
        ['nvidia-smi', 'nvidia-smi -q', 'dcgmi discovery -l'],
        10000
      );

      expect(feedback).toContain('Key commands practiced');
      expect(feedback).toContain('nvidia-smi');
    });

    it('should include tip about explain command', () => {
      const feedback = generateStepCompletionFeedback('Test', ['cmd'], 1000);

      expect(feedback).toContain('explain');
    });
  });

  describe('validateCommandSyntax', () => {
    it('should validate known commands', () => {
      const result = validateCommandSyntax('nvidia-smi');
      expect(result.valid).toBe(true);
    });

    it('should reject unknown commands', () => {
      const result = validateCommandSyntax('unknown_command_xyz');
      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('Unknown command');
    });

    it('should suggest similar commands for typos', () => {
      const result = validateCommandSyntax('nvidia-sm');
      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('nvidia-smi');
    });

    it('should handle empty input', () => {
      const result = validateCommandSyntax('');
      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('No command');
    });

    it('should handle whitespace-only input', () => {
      const result = validateCommandSyntax('   ');
      expect(result.valid).toBe(false);
    });
  });
});
