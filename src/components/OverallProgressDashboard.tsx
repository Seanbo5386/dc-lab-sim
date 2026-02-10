import React, { useMemo } from "react";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import { useLearningStore } from "@/store/learningStore";
import { ProgressRing } from "./ProgressRing";

export const OverallProgressDashboard: React.FC = () => {
  const { familyQuizScores, reviewSchedule } = useLearningProgressStore();
  const { gauntletAttempts } = useLearningStore();

  // Calculate quiz statistics
  const quizStats = useMemo(() => {
    const families = Object.values(familyQuizScores);
    const totalAttempts = families.reduce((sum, f) => sum + f.attempts, 0);
    const passedFamilies = families.filter((f) => f.passed).length;
    const totalFamilies = 6; // We have 6 command families
    const avgScore =
      families.length > 0
        ? Math.round(
            families.reduce((sum, f) => sum + f.score, 0) / families.length,
          )
        : 0;

    return {
      totalAttempts,
      passedFamilies,
      totalFamilies,
      avgScore,
      passRate:
        totalFamilies > 0
          ? Math.round((passedFamilies / totalFamilies) * 100)
          : 0,
    };
  }, [familyQuizScores]);

  // Calculate spaced repetition streak
  const streakStats = useMemo(() => {
    const schedules = Object.values(reviewSchedule);
    const totalSuccesses = schedules.reduce(
      (sum, s) => sum + s.consecutiveSuccesses,
      0,
    );
    const maxStreak =
      schedules.length > 0
        ? Math.max(...schedules.map((s) => s.consecutiveSuccesses))
        : 0;
    const masteredFamilies = schedules.filter(
      (s) => s.consecutiveSuccesses >= 5,
    ).length;

    return {
      totalSuccesses,
      maxStreak,
      masteredFamilies,
    };
  }, [reviewSchedule]);

  // Calculate exam gauntlet stats
  const examStats = useMemo(() => {
    if (gauntletAttempts.length === 0) {
      return { attempts: 0, bestScore: 0, avgScore: 0, passed: 0 };
    }

    const scores = gauntletAttempts.map((a) =>
      Math.round((a.score / a.totalQuestions) * 100),
    );
    const bestScore = Math.max(...scores);
    const avgScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length,
    );
    const passed = gauntletAttempts.filter(
      (a) => a.score / a.totalQuestions >= 0.7,
    ).length;

    return {
      attempts: gauntletAttempts.length,
      bestScore,
      avgScore,
      passed,
    };
  }, [gauntletAttempts]);

  return (
    <div className="mb-8 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Your Learning Progress
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Quiz Pass Rate */}
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            progress={quizStats.passRate}
            size="lg"
            showLabel={true}
          />
          <div className="mt-2">
            <div className="text-sm font-medium text-white">Quiz Pass Rate</div>
            <div className="text-xs text-gray-500">
              {quizStats.passedFamilies}/{quizStats.totalFamilies} families
            </div>
          </div>
        </div>

        {/* Average Quiz Score */}
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            progress={quizStats.avgScore}
            size="lg"
            showLabel={true}
          />
          <div className="mt-2">
            <div className="text-sm font-medium text-white">Avg Quiz Score</div>
            <div className="text-xs text-gray-500">
              {quizStats.totalAttempts} total attempts
            </div>
          </div>
        </div>

        {/* Spaced Repetition Mastery */}
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            progress={Math.round((streakStats.masteredFamilies / 6) * 100)}
            size="lg"
            showLabel={true}
            color="#76B900"
          />
          <div className="mt-2">
            <div className="text-sm font-medium text-white">
              Mastered Families
            </div>
            <div className="text-xs text-gray-500">
              {streakStats.masteredFamilies}/6 (max streak:{" "}
              {streakStats.maxStreak})
            </div>
          </div>
        </div>

        {/* Exam Gauntlet Performance */}
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            progress={examStats.bestScore}
            size="lg"
            showLabel={true}
          />
          <div className="mt-2">
            <div className="text-sm font-medium text-white">
              Best Exam Score
            </div>
            <div className="text-xs text-gray-500">
              {examStats.attempts} attempts, {examStats.passed} passed
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="mt-6 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-nvidia-green">
            {quizStats.totalAttempts}
          </div>
          <div className="text-xs text-gray-500">Quiz Attempts</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-nvidia-green">
            {streakStats.totalSuccesses}
          </div>
          <div className="text-xs text-gray-500">Review Successes</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-nvidia-green">
            {examStats.attempts}
          </div>
          <div className="text-xs text-gray-500">Exam Attempts</div>
        </div>
      </div>
    </div>
  );
};
