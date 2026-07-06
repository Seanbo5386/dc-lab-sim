/**
 * E2E Incident Flow Smoke Test
 *
 * Verifies that the Live Incidents feature is accessible from
 * the Labs & Scenarios tab and renders correctly. Since incidents
 * require prerequisite progress (3 completed scenarios + 2 passed
 * quizzes), this test verifies the locked state by default and
 * the unlocked state after seeding localStorage.
 *
 * Uses a single desktop viewport (1920x1080).
 */

import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1920, height: 1080 } });
test.setTimeout(60_000);

const UI_TIMEOUT = 10_000;

test.describe("Live Incidents", () => {
  test("shows prerequisite message when requirements not met", async ({
    page,
  }) => {
    await page.goto("/");

    // Dismiss welcome screen
    await page.waitForSelector('[data-testid="welcome-screen"]', {
      timeout: UI_TIMEOUT,
    });
    await page.click('button:has-text("Enter Virtual Datacenter")');

    // Navigate to Labs tab
    await page.click('[data-testid="nav-labs"]');
    await page.waitForSelector('[data-testid="labs-list"]', {
      timeout: UI_TIMEOUT,
    });

    // Scroll down to find the Live Incidents section
    const liveIncidentsHeading = page.locator("text=Live Incidents");
    await expect(liveIncidentsHeading).toBeVisible({ timeout: UI_TIMEOUT });

    // The Start Incident button should be disabled (prerequisites not met)
    const startButton = page.locator('button:has-text("Start Incident")');
    await expect(startButton).toBeDisabled();

    // Should show prerequisite message
    const prereqMessage = page.locator("text=Complete at least");
    await expect(prereqMessage).toBeVisible();
  });

  test("shows incident launcher with rating display", async ({ page }) => {
    await page.goto("/");

    // Dismiss welcome screen
    await page.waitForSelector('[data-testid="welcome-screen"]', {
      timeout: UI_TIMEOUT,
    });
    await page.click('button:has-text("Enter Virtual Datacenter")');

    // Navigate to Labs tab
    await page.click('[data-testid="nav-labs"]');
    await page.waitForSelector('[data-testid="labs-list"]', {
      timeout: UI_TIMEOUT,
    });

    // Verify the Live Incidents section renders with rating
    const liveIncidentsHeading = page.locator("text=Live Incidents");
    await expect(liveIncidentsHeading).toBeVisible({ timeout: UI_TIMEOUT });

    // Rating should be visible (default 1000)
    const rating = page.locator("text=1000");
    await expect(rating).toBeVisible();

    // Domain filter dropdown should be visible
    const anySelect = page.locator("select").first();
    await expect(anySelect).toBeVisible();
  });

  test("enables launch when prerequisites are seeded", async ({ page }) => {
    // Seed localStorage with prerequisite progress before navigating
    await page.addInitScript(() => {
      const learningData = {
        state: {
          toolsUsed: {},
          familyQuizScores: {
            "gpu-monitoring": {
              passed: true,
              score: 100,
              attempts: 1,
              lastAttemptDate: Date.now(),
            },
            "infiniband-tools": {
              passed: true,
              score: 80,
              attempts: 1,
              lastAttemptDate: Date.now(),
            },
          },
          masteryQuizScores: {},
          unlockedTiers: {},
          tierProgress: {},
          explanationGateResults: {},
          reviewSchedule: {},
          incidentRating: 1000,
          incidentHistory: [],
        },
        version: 0,
      };

      const simData = {
        state: {
          completedScenarios: [
            "domain1-midnight-deployment",
            "domain1-rack-expansion",
            "domain4-silent-cluster",
          ],
        },
        version: 1,
      };

      localStorage.setItem(
        "ncp-aii-learning-progress-v2",
        JSON.stringify(learningData),
      );
      // NOTE: the simulationStore persist key is "nvidia-simulator-storage"
      // (src/store/simulationStore.ts), not "ncp-aii-simulation-store" — the
      // old key name silently no-oped this seed and left completedScenarios
      // empty, so the prerequisite gate never unlocked.
      localStorage.setItem("nvidia-simulator-storage", JSON.stringify(simData));
    });

    await page.goto("/");

    // Dismiss welcome screen
    await page.waitForSelector('[data-testid="welcome-screen"]', {
      timeout: UI_TIMEOUT,
    });
    await page.click('button:has-text("Enter Virtual Datacenter")');

    // Navigate to Labs tab
    await page.click('[data-testid="nav-labs"]');
    await page.waitForSelector('[data-testid="labs-list"]', {
      timeout: UI_TIMEOUT,
    });

    // The Live Incidents heading should be visible
    const liveIncidentsHeading = page.locator("text=Live Incidents");
    await expect(liveIncidentsHeading).toBeVisible({ timeout: UI_TIMEOUT });

    // Start Incident button should be enabled
    const startButton = page.locator('button:has-text("Start Incident")');
    await expect(startButton).toBeEnabled({ timeout: UI_TIMEOUT });
  });
});
