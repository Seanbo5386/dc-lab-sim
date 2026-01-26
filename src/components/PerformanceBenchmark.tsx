/**
 * Performance Benchmark Component
 *
 * Compares user performance against aggregate data to show:
 * - How user compares to others
 * - Topics where user is below/above average
 * - Improvement percentile over time
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { useLearningStore } from '@/store/learningStore';
import type { DomainId, ExamBreakdown } from '@/types/scenarios';

interface PerformanceBenchmarkProps {
  className?: string;
}

// Simulated aggregate benchmark data (would come from backend in production)
const BENCHMARK_DATA = {
  // Average scores by domain (out of 100)
  domainAverages: {
    domain1: 68,
    domain2: 72,
    domain3: 65,
    domain4: 70,
    domain5: 62,
  },
  // Standard deviations
  domainStdDev: {
    domain1: 12,
    domain2: 10,
    domain3: 14,
    domain4: 11,
    domain5: 15,
  },
  // Average overall exam score
  overallAverage: 67,
  overallStdDev: 10,
  // Percentile breakpoints
  percentileBreakpoints: [
    { percentile: 90, score: 82 },
    { percentile: 75, score: 75 },
    { percentile: 50, score: 67 },
    { percentile: 25, score: 58 },
    { percentile: 10, score: 50 },
  ],
  // Pass rate
  passRate: 0.68,
  // Average improvement per attempt
  avgImprovementPerAttempt: 5,
};

const DOMAIN_LABELS: Record<DomainId, string> = {
  domain1: 'Platform Bring-Up',
  domain2: 'Accelerator Configuration',
  domain3: 'Base Infrastructure',
  domain4: 'Validation & Testing',
  domain5: 'Troubleshooting',
};

interface DomainComparison {
  domainId: DomainId;
  label: string;
  userScore: number;
  benchmarkScore: number;
  percentile: number;
  status: 'above' | 'average' | 'below';
  gap: number;
}

interface TrendPoint {
  attempt: number;
  score: number;
  percentile: number;
  date: string;
}

export const PerformanceBenchmark: React.FC<PerformanceBenchmarkProps> = ({
  className = '',
}) => {
  const { domainProgress, examAttempts, getReadinessScore } = useLearningStore();

  // Calculate user's score per domain
  const domainComparisons = useMemo((): DomainComparison[] => {
    return Object.entries(domainProgress).map(([domainId, progress]) => {
      const id = domainId as DomainId;
      const userScore = progress.questionsAttempted > 0
        ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100)
        : 0;

      const benchmarkScore = BENCHMARK_DATA.domainAverages[id];
      const stdDev = BENCHMARK_DATA.domainStdDev[id];
      const gap = userScore - benchmarkScore;

      // Calculate percentile using normal distribution approximation
      const zScore = (userScore - benchmarkScore) / stdDev;
      const percentile = Math.round(Math.min(99, Math.max(1,
        50 + 34.1 * Math.sign(zScore) * Math.min(Math.abs(zScore), 2)
      )));

      let status: 'above' | 'average' | 'below' = 'average';
      if (gap > stdDev * 0.5) status = 'above';
      else if (gap < -stdDev * 0.5) status = 'below';

      return {
        domainId: id,
        label: DOMAIN_LABELS[id],
        userScore,
        benchmarkScore,
        percentile,
        status,
        gap,
      };
    });
  }, [domainProgress]);

  // Calculate overall percentile
  const overallPercentile = useMemo(() => {
    const readinessScore = getReadinessScore();
    const score = readinessScore * 100;

    for (const bp of BENCHMARK_DATA.percentileBreakpoints) {
      if (score >= bp.score) {
        return bp.percentile;
      }
    }
    return 5;
  }, [getReadinessScore]);

  // Calculate improvement trend
  const improvementTrend = useMemo((): TrendPoint[] => {
    if (examAttempts.length === 0) return [];

    return examAttempts.map((attempt, index) => {
      const overallScore = (attempt.correct / attempt.total) * 100;

      // Calculate percentile for this score
      let percentile = 5;
      for (const bp of BENCHMARK_DATA.percentileBreakpoints) {
        if (overallScore >= bp.score) {
          percentile = bp.percentile;
          break;
        }
      }

      return {
        attempt: index + 1,
        score: Math.round(overallScore),
        percentile,
        date: new Date(attempt.date || Date.now()).toLocaleDateString(),
      };
    });
  }, [examAttempts]);

  // Find weak areas (below average)
  const weakAreas = domainComparisons.filter(d => d.status === 'below');
  const strongAreas = domainComparisons.filter(d => d.status === 'above');

  // Calculate improvement from first to last attempt
  const improvementDelta = improvementTrend.length >= 2
    ? improvementTrend[improvementTrend.length - 1].score - improvementTrend[0].score
    : 0;

  const readinessScore = getReadinessScore() * 100;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-5 h-5 text-nvidia-green" />
        <h3 className="text-lg font-semibold text-gray-200">
          Performance Benchmark
        </h3>
      </div>

      {/* Overall Percentile */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Your Overall Percentile</span>
          <div className="flex items-center gap-2">
            {overallPercentile >= 75 && <Award className="w-5 h-5 text-yellow-400" />}
            <span className="text-2xl font-bold text-nvidia-green">
              {overallPercentile}th
            </span>
          </div>
        </div>

        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
            style={{ width: `${overallPercentile}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10th</span>
          <span>25th</span>
          <span>50th</span>
          <span>75th</span>
          <span>90th</span>
        </div>

        <p className="text-sm text-gray-400 mt-3">
          You're performing better than <span className="text-nvidia-green font-medium">{overallPercentile}%</span> of users.
          {readinessScore >= 70 && (
            <span className="text-green-400"> You're on track to pass!</span>
          )}
        </p>
      </div>

      {/* Domain Comparison */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Domain Comparison vs. Average</h4>
        <div className="space-y-3">
          {domainComparisons.map((domain) => (
            <div key={domain.domainId} className="p-3 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {domain.status === 'above' && <TrendingUp className="w-4 h-4 text-green-400" />}
                  {domain.status === 'below' && <TrendingDown className="w-4 h-4 text-red-400" />}
                  {domain.status === 'average' && <Target className="w-4 h-4 text-yellow-400" />}
                  <span className="text-sm text-gray-200">{domain.label}</span>
                </div>
                <span className={`text-sm font-medium ${
                  domain.status === 'above' ? 'text-green-400' :
                  domain.status === 'below' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {domain.gap > 0 ? '+' : ''}{domain.gap}%
                </span>
              </div>

              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                {/* Benchmark marker */}
                <div
                  className="absolute top-0 h-full w-1 bg-white/50"
                  style={{ left: `${domain.benchmarkScore}%` }}
                />
                {/* User score bar */}
                <div
                  className={`h-full rounded-full transition-all ${
                    domain.status === 'above' ? 'bg-green-500' :
                    domain.status === 'below' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, domain.userScore)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>You: {domain.userScore}%</span>
                <span>Avg: {domain.benchmarkScore}%</span>
                <span>{domain.percentile}th percentile</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Areas Alert */}
      {weakAreas.length > 0 && (
        <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-200">Areas Needing Improvement</span>
          </div>
          <ul className="text-sm text-red-200 space-y-1">
            {weakAreas.map((area) => (
              <li key={area.domainId} className="flex items-center gap-2">
                <span>• {area.label}</span>
                <span className="text-red-400">({area.gap}% below average)</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-300 mt-2">
            Focus on these domains to improve your overall score.
          </p>
        </div>
      )}

      {/* Strong Areas */}
      {strongAreas.length > 0 && (
        <div className="mb-6 p-3 bg-green-900/30 border border-green-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-200">Your Strengths</span>
          </div>
          <ul className="text-sm text-green-200 space-y-1">
            {strongAreas.map((area) => (
              <li key={area.domainId} className="flex items-center gap-2">
                <span>• {area.label}</span>
                <span className="text-green-400">(+{area.gap}% above average)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Trend */}
      {improvementTrend.length >= 2 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Your Improvement Over Time</h4>
          <div className="p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {improvementDelta > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : improvementDelta < 0 ? (
                <TrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <Target className="w-5 h-5 text-yellow-400" />
              )}
              <span className={`text-lg font-bold ${
                improvementDelta > 0 ? 'text-green-400' :
                improvementDelta < 0 ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {improvementDelta > 0 ? '+' : ''}{improvementDelta}%
              </span>
              <span className="text-sm text-gray-400">improvement</span>
            </div>

            {/* Simple trend visualization */}
            <div className="flex items-end gap-2 h-20">
              {improvementTrend.map((point, idx) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-nvidia-green rounded-t transition-all"
                    style={{ height: `${point.score * 0.8}%` }}
                    title={`Attempt ${point.attempt}: ${point.score}%`}
                  />
                  <span className="text-xs text-gray-500 mt-1">{point.attempt}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>First: {improvementTrend[0].score}%</span>
              <span>Latest: {improvementTrend[improvementTrend.length - 1].score}%</span>
            </div>

            {improvementDelta > 0 && (
              <p className="text-xs text-green-400 mt-2">
                Your improvement rate is {improvementDelta > BENCHMARK_DATA.avgImprovementPerAttempt ? 'above' : 'near'} average!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pass Prediction */}
      <div className="p-3 bg-gray-900 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Exam Pass Prediction</h4>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                readinessScore >= 75 ? 'bg-green-900/50 border-2 border-green-500' :
                readinessScore >= 50 ? 'bg-yellow-900/50 border-2 border-yellow-500' :
                'bg-red-900/50 border-2 border-red-500'
              }`}
            >
              <span className={`text-lg font-bold ${
                readinessScore >= 75 ? 'text-green-400' :
                readinessScore >= 50 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {Math.round(readinessScore)}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300">
              {readinessScore >= 75
                ? 'High likelihood of passing the exam!'
                : readinessScore >= 50
                ? 'Moderate likelihood. Keep practicing!'
                : 'More study needed before taking the exam.'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Based on your performance compared to {BENCHMARK_DATA.passRate * 100}% pass rate.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {examAttempts.length === 0 && (
        <div className="mt-4 p-4 bg-gray-900 rounded-lg text-center">
          <BarChart2 className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm text-gray-400">
            Complete practice exams to see your performance benchmarks.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceBenchmark;
