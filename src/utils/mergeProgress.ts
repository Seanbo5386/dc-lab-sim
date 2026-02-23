/**
 * Progress Merge Logic for Cloud Sync
 *
 * When a user logs in and has both local (localStorage) and cloud data,
 * these functions merge them using "keep the best" semantics:
 * - Arrays are unioned (deduplicated)
 * - Scalar counters take the max
 * - Scores take the highest
 * - Tiers take the highest unlocked
 * - Review schedules take the later date (more progress)
 * - Passed/completed flags use OR (once passed, stays passed)
 *
 * All functions accept partial/empty objects gracefully since either
 * local or cloud data may be missing.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Union two arrays, removing duplicates.
 */
function unionArrays<T>(a: T[] | undefined, b: T[] | undefined): T[] {
  return [...new Set([...(a || []), ...(b || [])])];
}

/**
 * Merge two Record<string, string[]> by unioning arrays per key.
 */
function mergeRecordArrays(
  a: Record<string, string[]> | undefined,
  b: Record<string, string[]> | undefined,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    result[key] = unionArrays(a?.[key], b?.[key]);
  }
  return result;
}

/**
 * Merge two Record<string, number> by taking the max per key.
 */
function mergeRecordMax(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    result[key] = Math.max(a?.[key] ?? 0, b?.[key] ?? 0);
  }
  return result;
}

/**
 * Merge two Record<string, T> by applying a per-entry merge function.
 * If only one side has a key, that value is used directly.
 */
function mergeRecordByField<T>(
  a: Record<string, T> | undefined,
  b: Record<string, T> | undefined,
  mergeFn: (localEntry: T, cloudEntry: T) => T,
): Record<string, T> {
  const result: Record<string, T> = {};
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    const aVal = a?.[key];
    const bVal = b?.[key];
    if (aVal && bVal) {
      result[key] = mergeFn(aVal, bVal);
    } else {
      result[key] = (aVal || bVal)!;
    }
  }
  return result;
}

/**
 * Union two arrays of objects by a key field, capping at maxItems.
 * When both have an entry with the same key, the first source (local) wins.
 */
function unionByKey<T>(
  a: T[] | undefined,
  b: T[] | undefined,
  keyFn: (item: T) => string | number,
  maxItems: number,
): T[] {
  const map = new Map<string | number, T>();
  for (const item of a || []) {
    map.set(keyFn(item), item);
  }
  for (const item of b || []) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  const all = [...map.values()];
  // Keep most recent entries (last N)
  return all.slice(-maxItems);
}

// ============================================================================
// SIMULATION DATA MERGE
// ============================================================================

/**
 * Merges simulation store data from local and cloud sources.
 *
 * Strategy:
 * - completedScenarios: union
 * - scenarioProgress: merge per scenario, local overrides per key
 * - systemType: local wins (user's current preference)
 * - simulationSpeed: local wins
 */
export function mergeSimulationData(local: any, cloud: any): any {
  const result: any = {};

  // Union completedScenarios
  result.completedScenarios = unionArrays(
    local.completedScenarios,
    cloud.completedScenarios,
  );

  // Merge scenarioProgress: local overrides per scenario key
  result.scenarioProgress = mergeRecordByField(
    local.scenarioProgress,
    cloud.scenarioProgress,
    (localEntry: any, _cloudEntry: any) => localEntry, // local wins per scenario
  );

  // Cluster: local wins if present (current in-memory state takes priority)
  result.cluster = local.cluster ?? cloud.cluster ?? null;

  // Scalar preferences: local wins if present
  result.systemType = local.systemType ?? cloud.systemType ?? "DGX-A100";
  result.simulationSpeed =
    local.simulationSpeed ?? cloud.simulationSpeed ?? 1.0;

  return result;
}

// ============================================================================
// LEARNING PROGRESS MERGE (learningProgressStore)
// ============================================================================

/**
 * Merges learning progress store data from local and cloud sources.
 *
 * Strategy:
 * - toolsUsed: union per family
 * - familyQuizScores: higher score wins, passed = OR
 * - masteryQuizScores: higher bestScore wins, passed = OR
 * - unlockedTiers: higher tier wins per family
 * - tierProgress: higher completion count wins per tier per family
 * - explanationGateResults: passed = true wins
 * - reviewSchedule: later nextReviewDate wins (more progress)
 */
export function mergeLearningProgress(local: any, cloud: any): any {
  const result: any = {};

  // Union toolsUsed per family
  result.toolsUsed = mergeRecordArrays(local.toolsUsed, cloud.toolsUsed);

  // Family quiz scores: higher score wins, passed = OR
  result.familyQuizScores = mergeRecordByField(
    local.familyQuizScores,
    cloud.familyQuizScores,
    (a: any, b: any) => ({
      passed: a.passed || b.passed,
      score: Math.max(a.score ?? 0, b.score ?? 0),
      attempts: Math.max(a.attempts ?? 0, b.attempts ?? 0),
      lastAttemptDate: Math.max(a.lastAttemptDate ?? 0, b.lastAttemptDate ?? 0),
    }),
  );

  // Mastery quiz scores: higher bestScore wins, passed = OR
  result.masteryQuizScores = mergeRecordByField(
    local.masteryQuizScores,
    cloud.masteryQuizScores,
    (a: any, b: any) => ({
      passed: a.passed || b.passed,
      bestScore: Math.max(a.bestScore ?? 0, b.bestScore ?? 0),
      totalQuestions: Math.max(a.totalQuestions ?? 0, b.totalQuestions ?? 0),
      attempts: Math.max(a.attempts ?? 0, b.attempts ?? 0),
      lastAttemptDate: Math.max(a.lastAttemptDate ?? 0, b.lastAttemptDate ?? 0),
    }),
  );

  // Unlocked tiers: higher tier wins per family
  result.unlockedTiers = mergeRecordMax(
    local.unlockedTiers,
    cloud.unlockedTiers,
  );

  // Tier progress: higher completion count per tier per family
  result.tierProgress = mergeRecordByField(
    local.tierProgress,
    cloud.tierProgress,
    (a: any, b: any) => ({
      tier1Completed: Math.max(a.tier1Completed ?? 0, b.tier1Completed ?? 0),
      tier2Completed: Math.max(a.tier2Completed ?? 0, b.tier2Completed ?? 0),
      tier3Completed: Math.max(a.tier3Completed ?? 0, b.tier3Completed ?? 0),
    }),
  );

  // Explanation gate results: passed = true wins
  result.explanationGateResults = mergeRecordByField(
    local.explanationGateResults,
    cloud.explanationGateResults,
    (a: any, b: any) => ({
      passed: a.passed || b.passed,
      scenarioId: a.passed ? a.scenarioId : b.scenarioId,
    }),
  );

  // Review schedule: later nextReviewDate wins (represents more progress)
  result.reviewSchedule = mergeRecordByField(
    local.reviewSchedule,
    cloud.reviewSchedule,
    (a: any, b: any) =>
      (a.nextReviewDate ?? 0) >= (b.nextReviewDate ?? 0) ? a : b,
  );

  return result;
}

// ============================================================================
// LEARNING DATA MERGE (learningStore)
// ============================================================================

/**
 * Merges learning store data from local and cloud sources.
 *
 * Strategy:
 * - commandProficiency: higher successCount wins per command
 * - domainProgress: higher questionsCorrect wins per domain
 * - sessionHistory: union by id, cap at 100
 * - totalStudyTimeSeconds: max
 * - totalSessions: max
 * - currentStreak / longestStreak: max
 * - lastStudyDate: later date wins
 * - examAttempts: union by timestamp, cap at 20
 * - gauntletAttempts: union by timestamp, cap at 50
 * - achievements: union (deduplicate)
 */
export function mergeLearningData(local: any, cloud: any): any {
  const result: any = {};

  // Command proficiency: higher successCount wins per command
  result.commandProficiency = mergeRecordByField(
    local.commandProficiency,
    cloud.commandProficiency,
    (a: any, b: any) =>
      (a.successCount ?? 0) >= (b.successCount ?? 0) ? a : b,
  );

  // Domain progress: higher questionsCorrect wins per domain
  result.domainProgress = mergeRecordByField(
    local.domainProgress,
    cloud.domainProgress,
    (a: any, b: any) =>
      (a.questionsCorrect ?? 0) >= (b.questionsCorrect ?? 0) ? a : b,
  );

  // Session history: union by id, cap at 100
  result.sessionHistory = unionByKey(
    local.sessionHistory,
    cloud.sessionHistory,
    (s: any) => s.id,
    100,
  );

  // Scalar counters: take the max
  result.totalStudyTimeSeconds = Math.max(
    local.totalStudyTimeSeconds ?? 0,
    cloud.totalStudyTimeSeconds ?? 0,
  );

  result.totalSessions = Math.max(
    local.totalSessions ?? 0,
    cloud.totalSessions ?? 0,
  );

  result.currentStreak = Math.max(
    local.currentStreak ?? 0,
    cloud.currentStreak ?? 0,
  );

  result.longestStreak = Math.max(
    local.longestStreak ?? 0,
    cloud.longestStreak ?? 0,
  );

  // Last study date: later date wins
  result.lastStudyDate =
    (local.lastStudyDate ?? "") >= (cloud.lastStudyDate ?? "")
      ? (local.lastStudyDate ?? "")
      : (cloud.lastStudyDate ?? "");

  // Exam attempts: union by timestamp, cap at 20
  result.examAttempts = unionByKey(
    local.examAttempts,
    cloud.examAttempts,
    (e: any) => e.timestamp ?? e.date ?? JSON.stringify(e),
    20,
  );

  // Gauntlet attempts: union by timestamp, cap at 50
  result.gauntletAttempts = unionByKey(
    local.gauntletAttempts,
    cloud.gauntletAttempts,
    (g: any) => g.timestamp,
    50,
  );

  // Achievements: union (deduplicate)
  result.achievements = unionArrays(local.achievements, cloud.achievements);

  return result;
}
