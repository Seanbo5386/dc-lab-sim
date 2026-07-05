/**
 * E2E Sandbox Remediation Tests
 *
 * Tests two remediation flows through the Sandbox (FaultInjection) panel and
 * the Terminal:
 *
 *  1. Happy path — GPU hang (XID 43) recovered by nvidia-smi --gpu-reset
 *  2. RMA path   — Severe ECC (XID 63) escalated through bug-report collect
 *                  then Physical Actions → Mark for RMA
 *
 * Uses a single desktop viewport (1920x1080) so the right-panel tab bar
 * ("Terminal" / "Sandbox") is always visible.
 */

import { test, expect, type Page } from "@playwright/test";
import { seedUiFlags } from "./setup/seedUiFlags";

test.use({ viewport: { width: 1920, height: 1080 } });
test.setTimeout(90_000);

const UI_TIMEOUT = 15_000;
const CMD_TIMEOUT = 8_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dismiss the welcome screen that appears on first load. */
async function dismissWelcome(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="welcome-screen"]', {
    timeout: UI_TIMEOUT,
  });
  await page.click('button:has-text("Enter Virtual Datacenter")');
  // Wait for the simulator terminal to be ready
  await page.waitForSelector('[data-testid="terminal"]', {
    timeout: UI_TIMEOUT,
  });
  await page.waitForTimeout(600);
}

/** Switch to the Sandbox tab in the right panel (desktop layout). */
async function openSandboxTab(page: Page): Promise<void> {
  // The Sandbox tab button carries data-tour="sandbox-tab" in SimulatorView
  const sandboxBtn = page.locator('[data-tour="sandbox-tab"]');
  await expect(sandboxBtn).toBeEnabled({ timeout: UI_TIMEOUT });
  await sandboxBtn.click();
  // Confirm the sandbox subtitle is visible (rendered inside FaultInjection)
  await expect(page.locator('[data-testid="sandbox-subtitle"]')).toBeVisible({
    timeout: UI_TIMEOUT,
  });
}

/** Switch to the Terminal tab in the right panel (desktop layout). */
async function openTerminalTab(page: Page): Promise<void> {
  await page.click('button:has-text("Terminal")');
  await page.waitForSelector('[data-testid="terminal"]', {
    timeout: UI_TIMEOUT,
  });
  await page.waitForTimeout(400);
}

/** Type a command into the xterm.js terminal and press Enter. */
async function typeCommand(page: Page, command: string): Promise<void> {
  const terminal = page.locator('[data-testid="terminal"]');
  await terminal.click();
  for (const char of command) {
    await page.keyboard.type(char, { delay: 10 });
  }
  await page.keyboard.press("Enter");
}

/** Return the text content of the xterm.js rows container. */
async function getTerminalOutput(page: Page): Promise<string> {
  const text = await page
    .locator('[data-testid="terminal"] .xterm-rows')
    .textContent();
  return text ?? "";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Sandbox remediation", () => {
  test("inject XID hang -> gpu-reset recovers the GPU", async ({ page }) => {
    await seedUiFlags(page, { keepWelcome: true });
    await page.goto("/");
    await dismissWelcome(page);

    // ── 1. Open the Sandbox tab ──────────────────────────────────────────────
    await openSandboxTab(page);

    // ── 2. Node and GPU default to dgx-00 / GPU 0 ───────────────────────────
    const nodeSelect = page.locator("#sandbox-node-select");
    await expect(nodeSelect).toBeVisible({ timeout: UI_TIMEOUT });

    // ── 3. Inject the "GPU Hang" complex scenario (XID 43) ──────────────────
    // The button text is "GPU Hang" with sub-text "XID 43 - GPU stopped responding"
    const gpuHangBtn = page.locator('button:has-text("GPU Hang")');
    await expect(gpuHangBtn).toBeVisible({ timeout: UI_TIMEOUT });
    await gpuHangBtn.click();

    // The GPU status indicator appears when healthStatus is not OK
    const statusAlert = page.locator("text=GPU 0 status: Critical");
    await expect(statusAlert).toBeVisible({ timeout: UI_TIMEOUT });

    // ── 4. Switch to Terminal and run gpu-reset ──────────────────────────────
    await openTerminalTab(page);

    await typeCommand(page, "nvidia-smi --gpu-reset -i 0");
    await page.waitForTimeout(CMD_TIMEOUT);

    const outputAfterReset = await getTerminalOutput(page);
    // nvidiaSmiSimulator: "GPU 0 reset successfully.\nAll compute applications..."
    expect(outputAfterReset.toLowerCase()).toContain("reset successfully");

    // ── 5. Return to Sandbox and verify GPU is now Healthy ──────────────────
    await openSandboxTab(page);

    // After a successful reset healthStatus = "OK"; FaultInjection renders:
    //   <p data-testid="gpu-status">GPU 0: ✓ Healthy</p>
    await expect(page.getByTestId("gpu-status")).toContainText("Healthy", {
      timeout: UI_TIMEOUT,
    });
  });

  test("severe ECC -> bug report + RMA gate -> Mark for RMA", async ({
    page,
  }) => {
    await seedUiFlags(page, { keepWelcome: true });
    await page.goto("/");
    await dismissWelcome(page);

    // ── 1. Open the Sandbox tab ──────────────────────────────────────────────
    await openSandboxTab(page);

    const nodeSelect = page.locator("#sandbox-node-select");
    await expect(nodeSelect).toBeVisible({ timeout: UI_TIMEOUT });

    // ── 2. Inject "Severe ECC Error" scenario (XID 63) ──────────────────────
    const severeEccBtn = page.locator('button:has-text("Severe ECC Error")');
    await expect(severeEccBtn).toBeVisible({ timeout: UI_TIMEOUT });
    await severeEccBtn.click();

    // GPU status should reflect Critical health
    const statusAlert = page.locator("text=GPU 0 status: Critical");
    await expect(statusAlert).toBeVisible({ timeout: UI_TIMEOUT });

    // ── 3. "Mark for RMA" is disabled before prerequisites are met ───────────
    const rmaBtn = page.locator('button:has-text("Mark for RMA")');
    await expect(rmaBtn).toBeDisabled({ timeout: UI_TIMEOUT });

    // ── 4. Switch to Terminal: gpu-reset should be refused (escalate) ────────
    await openTerminalTab(page);

    await typeCommand(page, "nvidia-smi --gpu-reset -i 0");
    await page.waitForTimeout(CMD_TIMEOUT);

    const outputAfterReset = await getTerminalOutput(page);
    // remediationEngine outcome = "insufficient"; escalateHint =
    // "Unrecoverable fault — collect nvidia-bug-report.sh, drain the node, then mark for RMA"
    // nvidiaSmiSimulator wraps as: "Unable to reset GPU 0: <hint>"
    expect(outputAfterReset.toLowerCase()).toMatch(/unrecoverable|rma/);

    // ── 5. Run nvidia-bug-report.sh (sets bugReportCollected = true) ─────────
    await typeCommand(page, "nvidia-bug-report.sh");
    await page.waitForTimeout(CMD_TIMEOUT);

    const outputAfterBugReport = await getTerminalOutput(page);
    // nvidiaBugReportSimulator ends with: "nvidia-bug-report.sh completed successfully."
    expect(outputAfterBugReport.toLowerCase()).toContain(
      "completed successfully",
    );

    // ── 6. Node drain check ───────────────────────────────────────────────────
    // The default slurmState for every node is "idle" (clusterFactory.ts:351).
    // FaultInjection.tsx: nodeDrained = slurmState !== "alloc" → true for idle.
    // rmaReady = bugReportCollected && nodeDrained  →  true once bug report runs.
    // No explicit drain command is needed; the button becomes enabled on its own.
    // If the cluster ever initialises a node in "alloc" state, add:
    //   await typeCommand(page, "scontrol update nodename=dgx-00 state=drain");

    // ── 7. Back on Sandbox: "Mark for RMA" button is now enabled ─────────────
    await openSandboxTab(page);

    await expect(rmaBtn).toBeEnabled({ timeout: UI_TIMEOUT });

    // ── 8. Click "Mark for RMA" ───────────────────────────────────────────────
    await rmaBtn.click();

    // ── 9. GPU status should now read "RMA pending" ───────────────────────────
    // FaultInjection.tsx: rmaStatus === "pending" → "GPU 0: RMA pending"
    await expect(page.getByTestId("gpu-status")).toContainText("RMA pending", {
      timeout: UI_TIMEOUT,
    });
  });
});
