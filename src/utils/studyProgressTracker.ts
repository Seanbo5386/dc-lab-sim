import type { ExamBreakdown, DomainId } from "@/types/scenarios";
import { DOMAIN_INFO } from "./examEngine";
import { logger } from "@/utils/logger";

/**
 * Study session record for tracking progress over time
 */
export interface StudySession {
  id: string;
  timestamp: number;
  type: "exam" | "quiz" | "lab" | "review";
  mode?: string;
  breakdown?: ExamBreakdown;
  scenarioId?: string;
  scenarioTitle?: string;
  passed?: boolean;
  score?: number;
  duration?: number; // seconds
}

/**
 * Domain performance tracking over time
 */
export interface DomainTrend {
  domain: DomainId;
  domainName: string;
  scores: Array<{ timestamp: number; score: number }>;
  averageScore: number;
  trend: "improving" | "stable" | "declining";
  lastAttempt?: number;
  totalAttempts: number;
}

/**
 * Study streak tracking for gamification
 */
export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  totalDaysStudied: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

/**
 * Comprehensive progress data
 */
export interface StudyProgress {
  sessions: StudySession[];
  streak: StudyStreak;
  domainTrends: Record<DomainId, DomainTrend>;
  totalExamsTaken: number;
  totalLabsCompleted: number;
  totalStudyTime: number; // seconds
  averageScore: number;
  bestScore: number;
  passRate: number;
  lastUpdated: number;
}

const STORAGE_KEY = "ncp-aii-study-progress";

/**
 * Get initial empty progress state
 */
function getInitialProgress(): StudyProgress {
  const domainTrends: Record<DomainId, DomainTrend> = {} as Record<
    DomainId,
    DomainTrend
  >;

  (
    ["domain1", "domain2", "domain3", "domain4", "domain5"] as DomainId[]
  ).forEach((domain) => {
    domainTrends[domain] = {
      domain,
      domainName: DOMAIN_INFO[domain].name,
      scores: [],
      averageScore: 0,
      trend: "stable",
      totalAttempts: 0,
    };
  });

  return {
    sessions: [],
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: "",
      totalDaysStudied: 0,
      weeklyGoal: 5,
      weeklyProgress: 0,
    },
    domainTrends,
    totalExamsTaken: 0,
    totalLabsCompleted: 0,
    totalStudyTime: 0,
    averageScore: 0,
    bestScore: 0,
    passRate: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Load progress from localStorage
 */
export function loadProgress(): StudyProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with initial to ensure all fields exist
      return { ...getInitialProgress(), ...parsed };
    }
  } catch (error) {
    logger.error("Error loading study progress:", error);
  }
  return getInitialProgress();
}

/**
 * Save progress to localStorage
 */
export function saveProgress(progress: StudyProgress): void {
  try {
    progress.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    logger.error("Error saving study progress:", error);
  }
}

/**
 * Record an exam session
 */
export function recordExamSession(
  breakdown: ExamBreakdown,
  mode: string = "full-practice",
  duration?: number,
): StudySession {
  const progress = loadProgress();

  const session: StudySession = {
    id: `exam-${Date.now()}`,
    timestamp: Date.now(),
    type: mode === "quick-quiz" ? "quiz" : "exam",
    mode,
    breakdown,
    passed: breakdown.percentage >= 70,
    score: breakdown.percentage,
    duration: duration || breakdown.timeSpent,
  };

  progress.sessions.unshift(session); // Add to beginning

  // Keep only last 100 sessions
  if (progress.sessions.length > 100) {
    progress.sessions = progress.sessions.slice(0, 100);
  }

  // Update domain trends
  updateDomainTrends(progress, breakdown);

  // Update streak
  updateStreak(progress);

  // Update aggregate stats
  updateAggregateStats(progress);

  saveProgress(progress);
  return session;
}

/**
 * Record a lab/scenario completion
 */
export function recordLabSession(
  scenarioId: string,
  scenarioTitle: string,
  passed: boolean,
  duration: number,
): StudySession {
  const progress = loadProgress();

  const session: StudySession = {
    id: `lab-${Date.now()}`,
    timestamp: Date.now(),
    type: "lab",
    scenarioId,
    scenarioTitle,
    passed,
    duration,
  };

  progress.sessions.unshift(session);
  progress.totalLabsCompleted++;
  progress.totalStudyTime += duration;

  // Update streak
  updateStreak(progress);

  saveProgress(progress);
  return session;
}

/**
 * Update domain performance trends
 */
function updateDomainTrends(
  progress: StudyProgress,
  breakdown: ExamBreakdown,
): void {
  const timestamp = Date.now();

  (Object.keys(breakdown.byDomain) as DomainId[]).forEach((domain) => {
    const perf = breakdown.byDomain[domain];
    const trend = progress.domainTrends[domain];

    if (perf.questionsTotal > 0) {
      trend.scores.push({
        timestamp,
        score: perf.percentage,
      });

      // Keep only last 20 scores per domain
      if (trend.scores.length > 20) {
        trend.scores = trend.scores.slice(-20);
      }

      trend.totalAttempts++;
      trend.lastAttempt = timestamp;

      // Calculate average
      const sum = trend.scores.reduce((acc, s) => acc + s.score, 0);
      trend.averageScore = Math.round(sum / trend.scores.length);

      // Calculate trend direction
      if (trend.scores.length >= 3) {
        const recent = trend.scores.slice(-3);
        const older = trend.scores.slice(-6, -3);

        if (older.length >= 2) {
          const recentAvg =
            recent.reduce((a, s) => a + s.score, 0) / recent.length;
          const olderAvg =
            older.reduce((a, s) => a + s.score, 0) / older.length;

          if (recentAvg > olderAvg + 5) {
            trend.trend = "improving";
          } else if (recentAvg < olderAvg - 5) {
            trend.trend = "declining";
          } else {
            trend.trend = "stable";
          }
        }
      }
    }
  });
}

/**
 * Update study streak
 */
function updateStreak(progress: StudyProgress): void {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (progress.streak.lastStudyDate === today) {
    // Already studied today, no change needed
    return;
  }

  if (progress.streak.lastStudyDate === yesterday) {
    // Continuing streak
    progress.streak.currentStreak++;
  } else if (progress.streak.lastStudyDate !== today) {
    // Streak broken (or first study)
    progress.streak.currentStreak = 1;
  }

  // Update longest streak
  if (progress.streak.currentStreak > progress.streak.longestStreak) {
    progress.streak.longestStreak = progress.streak.currentStreak;
  }

  progress.streak.lastStudyDate = today;
  progress.streak.totalDaysStudied++;

  // Update weekly progress
  const weekStart = getWeekStart();
  const weekSessions = progress.sessions.filter(
    (s) => s.timestamp >= weekStart.getTime(),
  );
  const uniqueDays = new Set(
    weekSessions.map((s) => new Date(s.timestamp).toISOString().split("T")[0]),
  );
  progress.streak.weeklyProgress = uniqueDays.size;
}

/**
 * Get start of current week (Monday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Update aggregate statistics
 */
function updateAggregateStats(progress: StudyProgress): void {
  const examSessions = progress.sessions.filter(
    (s) => s.type === "exam" || s.type === "quiz",
  );

  progress.totalExamsTaken = examSessions.length;

  if (examSessions.length > 0) {
    const scores = examSessions.map((s) => s.score || 0);
    progress.averageScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    progress.bestScore = Math.max(...scores);

    const passed = examSessions.filter((s) => s.passed).length;
    progress.passRate = Math.round((passed / examSessions.length) * 100);
  }

  progress.totalStudyTime = progress.sessions.reduce(
    (acc, s) => acc + (s.duration || 0),
    0,
  );
}

/**
 * Get weak domains (below threshold)
 */
export function getWeakDomains(threshold: number = 70): DomainTrend[] {
  const progress = loadProgress();

  return Object.values(progress.domainTrends)
    .filter((t) => t.totalAttempts > 0 && t.averageScore < threshold)
    .sort((a, b) => a.averageScore - b.averageScore);
}

/**
 * Get strong domains (above threshold)
 */
export function getStrongDomains(threshold: number = 80): DomainTrend[] {
  const progress = loadProgress();

  return Object.values(progress.domainTrends)
    .filter((t) => t.totalAttempts > 0 && t.averageScore >= threshold)
    .sort((a, b) => b.averageScore - a.averageScore);
}

/**
 * Get study recommendations based on progress
 */
export function getStudyRecommendations(): string[] {
  const progress = loadProgress();
  const recommendations: string[] = [];

  // Check for weak domains
  const weakDomains = getWeakDomains();
  if (weakDomains.length > 0) {
    const weakest = weakDomains[0];
    recommendations.push(
      `Focus on ${weakest.domainName} - your average score is ${weakest.averageScore}%. ` +
        `This domain carries ${DOMAIN_INFO[weakest.domain].weight}% exam weight.`,
    );
  }

  // Check for declining trends
  const declining = Object.values(progress.domainTrends).filter(
    (t) => t.trend === "declining" && t.totalAttempts >= 3,
  );

  if (declining.length > 0) {
    recommendations.push(
      `Performance declining in ${declining.map((d) => d.domainName).join(", ")}. ` +
        `Consider reviewing these topics.`,
    );
  }

  // Check for domains not attempted
  const notAttempted = Object.values(progress.domainTrends).filter(
    (t) => t.totalAttempts === 0,
  );

  if (notAttempted.length > 0) {
    recommendations.push(
      `You haven't practiced ${notAttempted.map((d) => d.domainName).join(", ")} yet. ` +
        `Try taking a domain-focused quiz.`,
    );
  }

  // Streak encouragement
  if (progress.streak.currentStreak >= 3) {
    recommendations.push(
      `Great job! You're on a ${progress.streak.currentStreak}-day streak. Keep it up!`,
    );
  } else if (
    progress.streak.currentStreak === 0 &&
    progress.streak.longestStreak > 0
  ) {
    recommendations.push(
      `Your study streak was reset. Start studying today to build it back up!`,
    );
  }

  // Weekly goal
  const remaining = progress.streak.weeklyGoal - progress.streak.weeklyProgress;
  if (remaining > 0) {
    recommendations.push(
      `Study ${remaining} more day${remaining > 1 ? "s" : ""} this week to meet your weekly goal.`,
    );
  } else if (remaining === 0) {
    recommendations.push(
      `You've met your weekly study goal! Consider increasing it for more practice.`,
    );
  }

  // Overall readiness
  if (progress.totalExamsTaken >= 5) {
    if (progress.passRate >= 80 && progress.averageScore >= 75) {
      recommendations.push(
        `Strong performance! Consider scheduling your NCP-AII certification exam.`,
      );
    } else if (progress.passRate < 50) {
      recommendations.push(
        `Focus on the fundamentals. Try completing more lab scenarios before practice exams.`,
      );
    }
  }

  return recommendations;
}

/**
 * Get recent sessions
 */
export function getRecentSessions(limit: number = 10): StudySession[] {
  const progress = loadProgress();
  return progress.sessions.slice(0, limit);
}

/**
 * Get progress summary for dashboard
 */
export function getProgressSummary(): {
  totalExams: number;
  totalLabs: number;
  averageScore: number;
  passRate: number;
  streak: number;
  totalTime: string;
  weakestDomain: string | null;
  strongestDomain: string | null;
} {
  const progress = loadProgress();

  // Format time
  const hours = Math.floor(progress.totalStudyTime / 3600);
  const minutes = Math.floor((progress.totalStudyTime % 3600) / 60);
  const totalTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Find weakest and strongest
  const withAttempts = Object.values(progress.domainTrends).filter(
    (t) => t.totalAttempts > 0,
  );
  const sorted = [...withAttempts].sort(
    (a, b) => a.averageScore - b.averageScore,
  );

  return {
    totalExams: progress.totalExamsTaken,
    totalLabs: progress.totalLabsCompleted,
    averageScore: progress.averageScore,
    passRate: progress.passRate,
    streak: progress.streak.currentStreak,
    totalTime,
    weakestDomain: sorted.length > 0 ? sorted[0].domainName : null,
    strongestDomain:
      sorted.length > 0 ? sorted[sorted.length - 1].domainName : null,
  };
}

/**
 * Export progress data (for backup)
 */
export function exportProgress(): string {
  const progress = loadProgress();
  return JSON.stringify(progress, null, 2);
}

/**
 * Import progress data (from backup)
 */
export function importProgress(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    // Validate structure
    if (parsed.sessions && parsed.streak && parsed.domainTrends) {
      saveProgress(parsed);
      return true;
    }
  } catch (error) {
    logger.error("Error importing progress:", error);
  }
  return false;
}

/**
 * Reset all progress
 */
export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
