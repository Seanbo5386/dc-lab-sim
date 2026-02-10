# Learning Progress Persisted Data Migration Plan

## Scope
This migration consolidates exam gauntlet history into the learning store as the single source of truth.

## Persisted keys
- **Old key:** `ncp-aii-learning-progress-v2` (learning progress store, previously stored `gauntletAttempts`)
- **Current key:** `ncp-aii-learning-progress` (learning store, now stores `gauntletAttempts` and `examAttempts`)

## Plan (short)
1. On first load, read `gauntletAttempts` from `ncp-aii-learning-progress-v2` and initialize the learning store if the new key has no gauntlet data yet.
2. Continue to write gauntlet attempts only to `ncp-aii-learning-progress`.
3. After confirming successful rollout, optionally remove `gauntletAttempts` from the legacy key (leave other learning progress data untouched).
