/**
 * Tier Progression Engine
 *
 * Manages unlock logic for tiered scenarios and selects scenarios for the
 * exam gauntlet. Users progress through tiers by demonstrating competency.
 */

import type { DomainId } from "@/types/scenarios";

// ============================================================================
// TYPES
// ============================================================================

/**
 * State tracking user progress across tool families and tiers
 */
export interface TierProgressState {
  /** Tools used per command family (familyId -> array of tool names) */
  toolsUsed: Record<string, string[]>;
  /** Quiz scores per family (familyId -> quiz result) */
  familyQuizScores: Record<
    string,
    { passed: boolean; score: number; attempts: number }
  >;
  /** Current unlocked tier per family (familyId -> tier number) */
  unlockedTiers: Record<string, number>;
  /** Completion counts per tier (familyId -> tier completion counts) */
  tierProgress: Record<
    string,
    { tier1Completed: number; tier2Completed: number; tier3Completed: number }
  >;
  /** Explanation gate results (familyId -> gate result) */
  explanationGateResults: Record<
    string,
    { passed: boolean; scenarioId: string }
  >;
}

/**
 * Scenario type for gauntlet selection
 */
export interface Scenario {
  id: string;
  domain: DomainId;
  tier?: 1 | 2 | 3;
  commandFamilies?: string[];
}

/**
 * Random number generator function type for dependency injection
 */
export type RandomFn = () => number;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Number of tools in each command family
 */
export const FAMILY_TOOL_COUNTS: Record<string, number> = {
  "gpu-monitoring": 4, // nvidia-smi, nvsm, dcgmi, nvtop
  "infiniband-tools": 4, // ibstat, perfquery, ibdiagnet, iblinkinfo
  "bmc-hardware": 3, // ipmitool, sensors, dmidecode
  "cluster-tools": 4, // sinfo, squeue, scontrol, sacct
  "container-tools": 3, // docker, enroot, pyxis
  diagnostics: 3, // dcgmi diag, nvidia-bug-report, gpu-burn
  "xid-diagnostics": 4, // dmesg, nvidia-smi, dcgmi, nvidia-bug-report
};

/**
 * Domain weights for exam gauntlet (NCP-AII exam distribution)
 */
export const EXAM_DOMAIN_WEIGHTS: Record<DomainId, number> = {
  domain1: 31,
  domain2: 5,
  domain3: 19,
  domain4: 33,
  domain5: 12,
};

/**
 * Accuracy threshold required for Tier 3 unlock
 */
export const TIER_2_ACCURACY_THRESHOLD = 0.8; // 80%

/**
 * Default number of scenarios for gauntlet selection
 */
export const DEFAULT_GAUNTLET_COUNT = 10;

// ============================================================================
// TIER UNLOCK FUNCTIONS
// ============================================================================

/**
 * Check if a specific tier is unlocked for a command family.
 *
 * - Tier 1: Always unlocked
 * - Tier 2: Requires quiz passed AND all tools in family used at least once
 * - Tier 3: Requires 80%+ accuracy in Tier 2 AND explanation gates passed
 *
 * @param familyId - The command family identifier
 * @param tier - The tier to check (1, 2, or 3)
 * @param state - The user's current progress state
 * @returns True if the tier is unlocked, false otherwise
 */
export function isTierUnlocked(
  familyId: string,
  tier: 1 | 2 | 3,
  state: TierProgressState,
): boolean {
  // Tier 1 is always unlocked
  if (tier === 1) {
    return true;
  }

  // Check if already explicitly unlocked
  const currentUnlockedTier = state.unlockedTiers[familyId] ?? 1;
  if (currentUnlockedTier >= tier) {
    return true;
  }

  // Tier 2 requirements: quiz passed AND all tools used
  if (tier === 2) {
    return checkTier2Requirements(familyId, state);
  }

  // Tier 3 requirements: 80%+ accuracy in Tier 2 AND explanation gate passed
  if (tier === 3) {
    // Must have Tier 2 unlocked first
    if (!isTierUnlocked(familyId, 2, state)) {
      return false;
    }
    return checkTier3Requirements(familyId, state);
  }

  return false;
}

/**
 * Check Tier 2 unlock requirements
 */
function checkTier2Requirements(
  familyId: string,
  state: TierProgressState,
): boolean {
  // Check if quiz passed
  const quizScore = state.familyQuizScores[familyId];
  if (!quizScore || !quizScore.passed) {
    return false;
  }

  // Check if all tools in family have been used at least once
  const toolsUsed = state.toolsUsed[familyId] ?? [];
  const requiredToolCount = FAMILY_TOOL_COUNTS[familyId] ?? 0;

  // If family not in FAMILY_TOOL_COUNTS, require at least one tool used
  if (requiredToolCount === 0) {
    return toolsUsed.length > 0;
  }

  return toolsUsed.length >= requiredToolCount;
}

/**
 * Check Tier 3 unlock requirements
 */
function checkTier3Requirements(
  familyId: string,
  state: TierProgressState,
): boolean {
  // Check Tier 2 accuracy (80%+ required)
  const tierProg = state.tierProgress[familyId];
  if (!tierProg || tierProg.tier2Completed === 0) {
    return false;
  }

  // Calculate accuracy based on completed scenarios vs total attempts
  // For this implementation, we assume tier2Completed represents successful completions
  // and we track accuracy separately. Since we don't have a separate "tier2Attempts" field,
  // we use the quiz score as a proxy for understanding and the tier completions as progress.
  const quizScore = state.familyQuizScores[familyId];
  if (!quizScore || quizScore.score < TIER_2_ACCURACY_THRESHOLD) {
    return false;
  }

  // Check if explanation gate passed
  const gateResult = state.explanationGateResults[familyId];
  if (!gateResult || !gateResult.passed) {
    return false;
  }

  return true;
}

/**
 * Evaluate whether the user should unlock the next tier.
 *
 * Returns the next tier number that should be unlocked based on current progress,
 * or null if no new tier should be unlocked.
 *
 * @param familyId - The command family identifier
 * @param currentTier - The user's current tier (1, 2, or 3)
 * @param state - The user's current progress state
 * @returns The next tier to unlock (2 or 3), or null if no unlock available
 */
export function evaluateTierUnlock(
  familyId: string,
  currentTier: number,
  state: TierProgressState,
): number | null {
  // Already at max tier
  if (currentTier >= 3) {
    return null;
  }

  // Check if next tier should be unlocked
  const nextTier = (currentTier + 1) as 1 | 2 | 3;

  // Only check requirements, not current unlock status
  if (nextTier === 2) {
    if (checkTier2Requirements(familyId, state)) {
      return 2;
    }
  } else if (nextTier === 3) {
    if (checkTier3Requirements(familyId, state)) {
      return 3;
    }
  }

  return null;
}

// ============================================================================
// GAUNTLET SELECTION FUNCTIONS
// ============================================================================

/**
 * Select scenarios for the exam gauntlet using weighted random selection.
 *
 * - Uses domain weights matching the NCP-AII exam distribution
 * - Only selects Tier 2+ scenarios (more realistic difficulty)
 * - Shuffles the final selection for variety
 *
 * @param domainWeights - Custom domain weights (or use EXAM_DOMAIN_WEIGHTS)
 * @param availableScenarios - Pool of scenarios to select from
 * @param count - Number of scenarios to select (default: 10)
 * @param randomFn - Random function for testability (default: Math.random)
 * @returns Array of selected scenarios
 */
export function selectGauntletScenarios(
  domainWeights: Record<DomainId, number>,
  availableScenarios: Scenario[],
  count: number = DEFAULT_GAUNTLET_COUNT,
  randomFn: RandomFn = Math.random,
): Scenario[] {
  // Filter to Tier 2+ scenarios only
  const eligibleScenarios = availableScenarios.filter(
    (scenario) => scenario.tier !== undefined && scenario.tier >= 2,
  );

  if (eligibleScenarios.length === 0) {
    return [];
  }

  // Group scenarios by domain
  const scenariosByDomain = groupScenariosByDomain(eligibleScenarios);

  // Calculate target counts per domain based on weights
  const targetCounts = calculateTargetCounts(domainWeights, count);

  // Select scenarios using weighted distribution
  const selected: Scenario[] = [];

  // First pass: select based on weighted distribution
  for (const [domain, targetCount] of Object.entries(targetCounts) as [
    DomainId,
    number,
  ][]) {
    const domainScenarios = scenariosByDomain[domain] ?? [];
    const toSelect = Math.min(targetCount, domainScenarios.length);

    // Random selection without replacement
    const shuffled = shuffleArray([...domainScenarios], randomFn);
    selected.push(...shuffled.slice(0, toSelect));
  }

  // Second pass: fill remaining slots if we haven't reached count
  if (selected.length < count) {
    const selectedIds = new Set(selected.map((s) => s.id));
    const remaining = eligibleScenarios.filter((s) => !selectedIds.has(s.id));
    const shuffledRemaining = shuffleArray(remaining, randomFn);
    const needed = count - selected.length;
    selected.push(...shuffledRemaining.slice(0, needed));
  }

  // Final shuffle to randomize order
  return shuffleArray(selected, randomFn).slice(0, count);
}

/**
 * Group scenarios by their domain
 */
function groupScenariosByDomain(
  scenarios: Scenario[],
): Record<DomainId, Scenario[]> {
  const groups: Record<DomainId, Scenario[]> = {
    domain1: [],
    domain2: [],
    domain3: [],
    domain4: [],
    domain5: [],
  };

  for (const scenario of scenarios) {
    if (scenario.domain && groups[scenario.domain]) {
      groups[scenario.domain].push(scenario);
    }
  }

  return groups;
}

/**
 * Calculate target scenario counts per domain based on weights
 */
function calculateTargetCounts(
  weights: Record<DomainId, number>,
  totalCount: number,
): Record<DomainId, number> {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const counts: Record<DomainId, number> = {
    domain1: 0,
    domain2: 0,
    domain3: 0,
    domain4: 0,
    domain5: 0,
  };

  let allocated = 0;

  // Calculate proportional counts
  const domains: DomainId[] = [
    "domain1",
    "domain2",
    "domain3",
    "domain4",
    "domain5",
  ];
  for (const domain of domains) {
    const weight = weights[domain] ?? 0;
    // Round to nearest integer
    const count = Math.round((weight / totalWeight) * totalCount);
    counts[domain] = count;
    allocated += count;
  }

  // Adjust for rounding errors - add/remove from largest domain
  const diff = totalCount - allocated;
  if (diff !== 0) {
    // Find domain with highest weight to adjust
    const largestDomain = domains.reduce((a, b) =>
      (weights[a] ?? 0) > (weights[b] ?? 0) ? a : b,
    );
    counts[largestDomain] += diff;
  }

  return counts;
}

/**
 * Shuffle an array using Fisher-Yates algorithm with injectable random function
 */
function shuffleArray<T>(array: T[], randomFn: RandomFn): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create an empty tier progress state
 */
export function createEmptyTierProgressState(): TierProgressState {
  return {
    toolsUsed: {},
    familyQuizScores: {},
    unlockedTiers: {},
    tierProgress: {},
    explanationGateResults: {},
  };
}

/**
 * Get the current tier for a family from state
 */
export function getCurrentTier(
  familyId: string,
  state: TierProgressState,
): number {
  return state.unlockedTiers[familyId] ?? 1;
}

/**
 * Check if all tools in a family have been used
 */
export function hasUsedAllTools(
  familyId: string,
  state: TierProgressState,
): boolean {
  const toolsUsed = state.toolsUsed[familyId] ?? [];
  const requiredCount = FAMILY_TOOL_COUNTS[familyId] ?? 0;
  return toolsUsed.length >= requiredCount;
}

/**
 * Get the number of tools used vs required for a family
 */
export function getToolProgress(
  familyId: string,
  state: TierProgressState,
): { used: number; required: number } {
  const toolsUsed = state.toolsUsed[familyId] ?? [];
  const requiredCount = FAMILY_TOOL_COUNTS[familyId] ?? 0;
  return {
    used: toolsUsed.length,
    required: requiredCount,
  };
}
