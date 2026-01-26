import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceBenchmark } from '../PerformanceBenchmark';
import { useLearningStore } from '@/store/learningStore';
import type { DomainId } from '@/types/scenarios';

// Mock the learning store
vi.mock('@/store/learningStore', () => ({
  useLearningStore: vi.fn(),
}));

describe('PerformanceBenchmark', () => {
  const createMockDomainProgress = (overrides: Partial<Record<DomainId, { questionsAttempted: number; questionsCorrect: number }>> = {}) => {
    const defaults = {
      domain1: { questionsAttempted: 20, questionsCorrect: 15, labsCompleted: 2, labsTotal: 5, lastStudied: Date.now(), studyTimeSeconds: 3600 },
      domain2: { questionsAttempted: 10, questionsCorrect: 8, labsCompleted: 1, labsTotal: 3, lastStudied: Date.now(), studyTimeSeconds: 1800 },
      domain3: { questionsAttempted: 15, questionsCorrect: 10, labsCompleted: 3, labsTotal: 5, lastStudied: Date.now(), studyTimeSeconds: 2400 },
      domain4: { questionsAttempted: 25, questionsCorrect: 18, labsCompleted: 4, labsTotal: 6, lastStudied: Date.now(), studyTimeSeconds: 4200 },
      domain5: { questionsAttempted: 12, questionsCorrect: 6, labsCompleted: 2, labsTotal: 4, lastStudied: Date.now(), studyTimeSeconds: 2000 },
    };

    return { ...defaults, ...overrides };
  };

  const mockLearningStore = (overrides = {}) => {
    const defaultStore = {
      domainProgress: createMockDomainProgress(),
      examAttempts: [],
      getReadinessScore: () => 0.65,
    };

    (useLearningStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const store = { ...defaultStore, ...overrides };
      if (typeof selector === 'function') {
        return selector(store);
      }
      return store;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLearningStore();
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<PerformanceBenchmark />);

      expect(screen.getByText('Performance Benchmark')).toBeInTheDocument();
    });

    it('should show overall percentile section', () => {
      render(<PerformanceBenchmark />);

      expect(screen.getByText('Your Overall Percentile')).toBeInTheDocument();
    });

    it('should show domain comparison section', () => {
      render(<PerformanceBenchmark />);

      expect(screen.getByText('Domain Comparison vs. Average')).toBeInTheDocument();
    });

    it('should show exam pass prediction section', () => {
      render(<PerformanceBenchmark />);

      expect(screen.getByText('Exam Pass Prediction')).toBeInTheDocument();
    });
  });

  describe('Domain Display', () => {
    it('should display all domain names', () => {
      render(<PerformanceBenchmark />);

      expect(screen.getByText('Platform Bring-Up')).toBeInTheDocument();
      expect(screen.getByText('Accelerator Configuration')).toBeInTheDocument();
      expect(screen.getByText('Base Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Validation & Testing')).toBeInTheDocument();
      expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    });
  });

  describe('Weak Areas Alert', () => {
    it('should show weak areas when user is below average', () => {
      mockLearningStore({
        domainProgress: createMockDomainProgress({
          domain5: { questionsAttempted: 20, questionsCorrect: 8, labsCompleted: 1, labsTotal: 4, lastStudied: Date.now(), studyTimeSeconds: 1000 },
        }),
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText('Areas Needing Improvement')).toBeInTheDocument();
    });
  });

  describe('Strong Areas Display', () => {
    it('should show strong areas when user is above average', () => {
      mockLearningStore({
        domainProgress: createMockDomainProgress({
          domain2: { questionsAttempted: 20, questionsCorrect: 18, labsCompleted: 3, labsTotal: 3, lastStudied: Date.now(), studyTimeSeconds: 3600 },
        }),
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText('Your Strengths')).toBeInTheDocument();
    });
  });

  describe('Improvement Trend', () => {
    it('should show improvement trend when multiple exam attempts exist', () => {
      mockLearningStore({
        examAttempts: [
          { total: 20, correct: 12, date: new Date('2026-01-01').toISOString(), breakdown: {} },
          { total: 20, correct: 15, date: new Date('2026-01-10').toISOString(), breakdown: {} },
          { total: 20, correct: 17, date: new Date('2026-01-20').toISOString(), breakdown: {} },
        ],
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText('Your Improvement Over Time')).toBeInTheDocument();
    });

    it('should not show improvement trend with only one attempt', () => {
      mockLearningStore({
        examAttempts: [
          { total: 20, correct: 12, date: new Date().toISOString(), breakdown: {} },
        ],
      });

      render(<PerformanceBenchmark />);

      expect(screen.queryByText('Your Improvement Over Time')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no exam attempts', () => {
      mockLearningStore({
        examAttempts: [],
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText(/Complete practice exams to see your performance benchmarks/)).toBeInTheDocument();
    });
  });

  describe('Pass Prediction', () => {
    it('should show high likelihood message for high readiness score', () => {
      mockLearningStore({
        getReadinessScore: () => 0.80,
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText(/High likelihood of passing/)).toBeInTheDocument();
    });

    it('should show moderate likelihood message for medium readiness score', () => {
      mockLearningStore({
        getReadinessScore: () => 0.60,
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText(/Moderate likelihood/)).toBeInTheDocument();
    });

    it('should show more study needed for low readiness score', () => {
      mockLearningStore({
        getReadinessScore: () => 0.35,
      });

      render(<PerformanceBenchmark />);

      expect(screen.getByText(/More study needed/)).toBeInTheDocument();
    });
  });

  describe('Percentile Calculation', () => {
    it('should display user percentile', () => {
      mockLearningStore({
        getReadinessScore: () => 0.75,
      });

      render(<PerformanceBenchmark />);

      // Should show a percentile value
      const percentileText = screen.getByText(/You're performing better than/);
      expect(percentileText).toBeInTheDocument();
    });
  });
});
