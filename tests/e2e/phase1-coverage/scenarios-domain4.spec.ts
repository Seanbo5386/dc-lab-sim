import { test, expect, type Page } from "@playwright/test";
import { createHelper } from "../setup/test-helpers";

const UI_TIMEOUT = 10_000;

/**
 * Click a domain card's first scenario and accept the Mission Briefing,
 * landing in Mission Mode with the instruction panel visible.
 *
 * NOTE ON UI DRIFT (src/components/LabsAndScenariosView.tsx,
 * src/components/MissionBriefing.tsx, src/App.tsx): the old "Start Labs"
 * button + [data-testid="lab-workspace"] flow this spec originally targeted
 * no longer exists. Every scenario in src/data/narrativeScenarios.json has a
 * `narrative` block, so App.tsx's handleStartScenario always routes through
 * MissionBriefing -> Mission Mode (MissionModeBar + MissionInstructionPanel),
 * never through the legacy LabWorkspace component (which only renders when
 * `showLabWorkspace && !activeScenario`, unreachable for any real scenario
 * start). Each domain card's scenarios render as individual buttons (no
 * domain-level "Start Labs"); clicking the first one starts that domain's
 * first scenario, mirroring what "Start Labs" used to do.
 */
async function startFirstScenario(page: Page, domainNumber: number) {
  const card = page.locator(`[data-testid="domain-${domainNumber}-card"]`);
  await card.locator("button").first().click();
  await acceptMissionBriefing(page);
}

/**
 * Start a specific scenario by its exact title, scoped to a domain card.
 * Scenarios within a domain card are sorted by difficulty
 * (LabsAndScenariosView.tsx's DIFFICULTY_ORDER sort), so "first scenario in
 * the domain" is not a stable target for tests that depend on a step having
 * particular content (hints/expectedCommands) — those tests pick a scenario
 * by name instead.
 */
async function startScenarioByTitle(
  page: Page,
  domainNumber: number,
  title: string,
) {
  const card = page.locator(`[data-testid="domain-${domainNumber}-card"]`);
  await card.locator("button", { hasText: title }).click();
  await acceptMissionBriefing(page);
}

async function acceptMissionBriefing(page: Page) {
  const acceptBtn = page.locator(
    '[data-testid="mission-briefing"] button:has-text("Accept Mission")',
  );
  await acceptBtn.waitFor({ state: "visible", timeout: UI_TIMEOUT });
  await acceptBtn.click();

  await page.waitForSelector('[data-testid="mission-instruction-panel"]', {
    timeout: UI_TIMEOUT,
  });
}

/**
 * Abort the active mission via MissionModeBar's Abort button + the
 * confirmation modal (src/components/ConfirmModal.tsx), returning to the
 * normal (non-mission) app shell.
 */
async function abortMission(page: Page) {
  await page.click('button[aria-label="Abort mission"]');
  const modal = page.locator('[data-testid="confirm-modal-backdrop"]');
  await modal.waitFor({ state: "visible", timeout: UI_TIMEOUT });
  await modal.locator('button:has-text("Abort")').click();
}

test.describe("Domain 4 Lab Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    const helper = await createHelper(page);
    await helper.navigateToSimulator();
  });

  test.describe("Scenario Loading and Navigation", () => {
    test("should navigate to labs section", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();

      // Labs list should be visible
      await expect(page.locator('[data-testid="labs-list"]')).toBeVisible();
    });

    test("should display Domain 4 lab cards", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();

      // Should show Domain 4 section. "Cluster Test & Verification" also
      // appears as an <option> in an unrelated domain-filter dropdown
      // elsewhere on the page, so scope to the heading to avoid Playwright's
      // strict-mode ambiguity.
      const domain4Card = page.locator('[data-testid="domain-4-card"]');
      await expect(domain4Card).toBeVisible();
      await expect(
        domain4Card.getByRole("heading", {
          name: "Cluster Test & Verification",
        }),
      ).toBeVisible();
    });

    test("should start Domain 4 lab when scenario clicked", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Mission Mode should now be active
      await expect(
        page.locator('[data-testid="mission-instruction-panel"]'),
      ).toBeVisible();
    });
  });

  test.describe("Mission Mode UI", () => {
    test("should show scenario title", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();

      const domain4Card = page.locator('[data-testid="domain-4-card"]');
      await domain4Card.locator("button").first().click();

      // MissionBriefing (src/components/MissionBriefing.tsx) shows the
      // scenario title as an <h2> before Mission Mode starts — this
      // replaces the old lab-workspace title/difficulty check.
      //
      // NOTE: MissionBriefing also supports a tier badge
      // (tierConfig["Guided"|"Choice"|"Realistic"] for tier 1/2/3), but
      // `tier` is optional on NarrativeScenario (src/types/scenarios.ts)
      // and the domain-4 card's first scenario by difficulty sort
      // ("domain4-bandwidth-bottleneck") has no `tier` field in
      // narrativeScenarios.json, so no tier badge renders for this flow.
      // Not asserting on it here to avoid a false failure.
      const briefing = page.locator('[data-testid="mission-briefing"]');
      await expect(briefing).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(briefing.locator("h2")).toBeVisible();
    });

    test("should show step progress", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Progress bar should be visible (MissionModeBar + MissionInstructionPanel
      // both render "Step N of M")
      await expect(page.locator("text=Step 1 of").first()).toBeVisible();
    });

    test("should show exit (abort) affordance", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Mission Mode's exit path is the Abort button in MissionModeBar
      // (src/components/MissionModeBar.tsx), not a "lab-workspace" exit
      // button — that testid no longer exists.
      await expect(
        page.locator('button[aria-label="Abort mission"]'),
      ).toBeVisible();
    });

    test("should show objectives for current step", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // narrativeAdapter.ts's narrativeStepToScenarioStep() synthesizes a
      // single-item `objectives: [step.task]` for every non-concept step, so
      // MissionInstructionPanel's Objectives section renders for any
      // command/observe step. Scope to the heading role — the objective text
      // itself often contains the substring "commands" (e.g. step tasks like
      // "...using Slurm commands."), which collides with a plain text=
      // locator for the sibling "Commands" section.
      const panel = page.locator('[data-testid="mission-instruction-panel"]');
      await expect(
        panel.getByRole("heading", { name: "Objectives" }),
      ).toBeVisible();
    });
  });

  test.describe("Command Execution in Lab Context", () => {
    test("should allow terminal commands during lab", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Terminal should still be accessible
      await helper.typeCommand("nvidia-smi");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("GPU");
    });

    test("should track command execution for step validation", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Execute a diagnostic command
      await helper.typeCommand("dcgmi diag -r 1");
      await helper.waitForCommandOutput();

      // The lab should register the command execution. Level-1 diag output
      // (src/simulators/dcgmiSimulator.ts) doesn't print the literal string
      // "DCGM" anywhere in its result table — only "Running level 1
      // diagnostic..." / "Successfully ran diagnostic" / a Diagnostic/Result
      // table — so assert on that instead.
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/diagnostic/);
    });

    test("should show suggested commands in lab panel", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      // Domain cards sort scenarios by difficulty, so pick a specific
      // scenario by title rather than relying on card position — "The
      // Silent Cluster" (domain4-silent-cluster) has a command-type first
      // step with expectedCommands: ['squeue'].
      await startScenarioByTitle(page, 4, "The Silent Cluster");

      // MissionInstructionPanel renders a "Commands" section with clickable
      // command chips for command-type steps with expectedCommands. Scope to
      // the heading role — a plain text= locator also matches the sibling
      // Objectives item's task text, which contains "commands" as a substring
      // (e.g. "...using Slurm commands.").
      const panel = page.locator('[data-testid="mission-instruction-panel"]');
      await expect(
        panel.getByRole("heading", { name: "Commands" }),
      ).toBeVisible();
    });
  });

  test.describe("Hints System", () => {
    test("should show hint control in mission panel", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      // "The Silent Cluster" step 1 has 3 hints available.
      await startScenarioByTitle(page, 4, "The Silent Cluster");

      // MissionInstructionPanel shows a "Hint (revealed/available)" button
      // rather than a "HINTS" heading.
      const panel = page.locator('[data-testid="mission-instruction-panel"]');
      await expect(
        panel.getByRole("button", { name: /Hint \(\d+\/\d+\)/ }),
      ).toBeVisible();
    });

    test("should allow getting hints via terminal command", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Type hint command in terminal
      await helper.typeCommand("hint");
      await helper.waitForCommandOutput();

      // Should show hint or hint-related message
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/hint|tip|suggestion|try/);
    });
  });

  test.describe("Lab Exit and Progress", () => {
    test("should exit mission when abort is confirmed", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      await abortMission(page);

      // Mission Mode should close
      await expect(
        page.locator('[data-testid="mission-instruction-panel"]'),
      ).not.toBeVisible({ timeout: 5000 });
    });

    test("should show step indicators in mission panel", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // The old "ALL STEPS" overview section (src/components/LabWorkspace.tsx)
      // has no equivalent in Mission Mode's redesigned instruction panel;
      // the closest current analog is the per-step dot indicators rendered
      // in MissionModeBar (data-testid="step-dots").
      await expect(page.locator('[data-testid="step-dots"]')).toBeVisible();
    });

    test("should show learning objectives", async ({ page }) => {
      test.skip(
        true,
        "product bug E2E-FINDING-2 — see ledger. SimulatorView.tsx passes " +
          "`learningObjectives={activeScenario!.learningObjectives}` and " +
          "`narrativeContext={activeScenario!.narrative?.setting}` into " +
          "MissionInstructionPanel (SimulatorView.tsx:483-484), but " +
          "MissionInstructionPanel never destructures or renders either prop " +
          "(compare to MissionCard.tsx:207-213, the compact variant, which does " +
          "render a \"What You'll Learn\" list from the same data). The mission's " +
          "learning objectives and narrative setting recap are silently dropped " +
          "from the primary Mission Mode view. Repro: start any mission — no " +
          '"What You\'ll Learn" content appears anywhere in the instruction panel.',
      );

      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      const panel = page.locator('[data-testid="mission-instruction-panel"]');
      await expect(panel.locator("text=What You")).toBeVisible();
    });
  });

  test.describe("Responsive Lab Panel", () => {
    test("should show lab panel on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Lab panel should be visible on desktop
      const panel = page.locator('[data-testid="mission-instruction-panel"]');
      const boundingBox = await panel.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox!.width).toBeGreaterThan(400);
    });

    test("should adapt to laptop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.navigateToLabs();
      await startFirstScenario(page, 4);

      // Lab workspace should still be functional
      await expect(
        page.locator('[data-testid="mission-instruction-panel"]'),
      ).toBeVisible();
    });
  });

  test.describe("Multiple Domain Labs", () => {
    test("should be able to start Domain 1 lab", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 1);

      await expect(
        page.locator('[data-testid="mission-instruction-panel"]'),
      ).toBeVisible();
    });

    test("should be able to start Domain 5 lab", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.navigateToLabs();
      await startFirstScenario(page, 5);

      await expect(
        page.locator('[data-testid="mission-instruction-panel"]'),
      ).toBeVisible();
    });
  });

  test.describe("Practice Exam Access", () => {
    // Practice exams moved out of the Labs view entirely (there is no
    // "practice-exam-card" or "Begin Practice Exam" button in
    // src/components/LabsAndScenariosView.tsx). Exam modes are now their own
    // top-level nav tab (data-testid="nav-exams" -> ExamsView, testid
    // "exams-list") with cards rendered from EXAM_MODE_REGISTRY
    // (src/components/exam-dashboard/ExamModeCard.tsx, testid
    // `exam-mode-card-${mode.id}`).
    test("should show practice exam mode card in Exams tab", async ({
      page,
    }) => {
      await page.click('[data-testid="nav-exams"]');
      await page.waitForSelector('[data-testid="exams-list"]', {
        timeout: UI_TIMEOUT,
      });

      await expect(
        page.locator('[data-testid="exam-mode-card-full-practice"]'),
      ).toBeVisible();
    });

    test("should be able to start a practice exam", async ({ page }) => {
      await page.click('[data-testid="nav-exams"]');
      await page.waitForSelector('[data-testid="exams-list"]', {
        timeout: UI_TIMEOUT,
      });

      const card = page.locator('[data-testid="exam-mode-card-full-practice"]');
      await card.locator("button").click();

      // Exam workspace should appear (ExamWorkspace.tsx renders an
      // "NCP-AII Practice Exam" heading once questions load)
      await expect(
        page.getByRole("heading", { name: "NCP-AII Practice Exam" }),
      ).toBeVisible({
        timeout: UI_TIMEOUT,
      });
    });
  });
});
