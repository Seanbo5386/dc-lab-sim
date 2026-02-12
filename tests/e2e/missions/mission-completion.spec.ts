/**
 * E2E Mission Completion Tests
 *
 * Iterates all 32 missions and drives each one from launch to
 * completion, verifying that no step soft-locks occur and the
 * mission-complete UI appears at the end.
 *
 * Each test is independent (own page, own navigation) so failures
 * in one mission do not affect others.
 *
 * These are functional tests only — a single desktop viewport
 * (1920x1080) is used via `test.use()`.
 */

import { test } from "@playwright/test";
import { MissionRunner } from "./mission-helpers";
import { ALL_MISSIONS } from "./mission-data";

// Desktop-only: override any multi-viewport project config
test.use({ viewport: { width: 1920, height: 1080 } });

// Missions have 8-12 steps with waits and quizzes — give plenty of time
test.setTimeout(120_000);

for (const mission of ALL_MISSIONS) {
  test(`Domain ${mission.domain} - ${mission.title}: complete all ${mission.steps.length} steps`, async ({
    page,
  }) => {
    const runner = new MissionRunner(page);

    // Step 1: Enter the simulator (dismiss welcome, wait for terminal)
    await runner.enterSimulator();

    // Step 2: Navigate to Labs, find the mission, and begin it
    await runner.launchMission(mission.title);

    // Step 3: Run every step and assert mission completion
    await runner.runFullMission(mission);
  });
}
