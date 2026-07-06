import { Page, expect } from "@playwright/test";
import { seedUiFlags } from "./seedUiFlags";

export class SimulatorTestHelper {
  constructor(private page: Page) {}

  async navigateToSimulator() {
    // Seed tour-seen/sandbox-intro flags before the first navigation so the
    // Spotlight Tour and sandbox intro overlays never auto-start and steal
    // focus/clicks from these specs. Keep the welcome screen since this
    // helper explicitly clicks through it below.
    await seedUiFlags(this.page, { keepWelcome: true });
    await this.page.goto("/");

    // Some specs call navigateToSimulator() a second time within the same
    // test (e.g. after changing the viewport). ncp-aii-welcome-dismissed
    // persists in localStorage across page.goto() calls within a test, so
    // on a second visit the welcome screen never (re)appears and the app
    // renders the terminal directly. or() accepts either path with a single
    // promise (a Promise.race of two waitFors leaves the losing waitFor to
    // reject unhandled after its timeout).
    const welcome = this.page.locator('[data-testid="welcome-screen"]');
    const terminal = this.page.locator('[data-testid="terminal"]');
    await expect(welcome.or(terminal).first()).toBeVisible({
      timeout: 10000,
    });

    if (await welcome.isVisible()) {
      // Click the "Enter Virtual Datacenter" button
      await this.page.click('button:has-text("Enter Virtual Datacenter")');
    }

    // Wait for terminal to be ready
    await this.page.waitForSelector('[data-testid="terminal"]', {
      timeout: 10000,
    });
    // Give terminal time to initialize
    await this.page.waitForTimeout(500);
  }

  async typeCommand(command: string) {
    const terminal = this.page.locator('[data-testid="terminal"]');
    await terminal.click();
    // Type each character to trigger terminal input handling
    for (const char of command) {
      await this.page.keyboard.type(char, { delay: 10 });
    }
    await this.page.keyboard.press("Enter");
  }

  async waitForCommandOutput(timeout = 5000) {
    // Wait for terminal to process the command
    // The terminal shows a prompt after command completion
    await this.page.waitForTimeout(Math.min(timeout, 1000));
  }

  async getTerminalOutput(): Promise<string> {
    // xterm.js renders text in spans within .xterm-rows
    const terminalContent = await this.page
      .locator('[data-testid="terminal"] .xterm-rows')
      .textContent();
    return terminalContent || "";
  }

  /**
   * Read the terminal's FULL buffer text, including scrollback that has
   * scrolled out of xterm's rendered viewport. xterm only keeps the
   * *visible* rows in the .xterm-rows DOM, so on short viewports
   * (laptop-1366's 768px) the head of a long command's output — banners,
   * report titles, nvidia-smi's header table — is not in the DOM at all
   * and getTerminalOutput() can't see it.
   *
   * DOM scrolling doesn't work here (.xterm-viewport reports
   * scrollHeight === clientHeight and pins scrollTop to 0), but xterm's
   * built-in keyboard scrolling does and re-renders .xterm-rows per page.
   * So: focus the terminal, Shift+PageUp to the top of the scrollback
   * snapshotting each page, then Shift+End back to the bottom.
   *
   * Rows are rendered atomically, so every buffer row lands intact in
   * some snapshot. Pages are joined with a newline; a soft-wrapped line
   * that straddles a page boundary will be split, so keep asserted
   * substrings short (single-row) as usual. Adjacent pages can overlap,
   * so text may appear twice — use this for positive contains/match
   * assertions only, never for counting or not-contains checks.
   */
  async getFullTerminalOutput(): Promise<string> {
    const terminal = this.page.locator('[data-testid="terminal"]');
    const rows = this.page.locator('[data-testid="terminal"] .xterm-rows');
    const read = async () => (await rows.textContent()) || "";

    // Focus the terminal so xterm receives the scroll keystrokes.
    await terminal.click();

    // Collect pages bottom -> top. Stop when a page-up no longer changes
    // the rendered text (top of scrollback reached). Bounded as a safety
    // net (~60 pages ≈ 2,000 lines at laptop row counts).
    const chunks: string[] = [await read()];
    for (let i = 0; i < 60; i++) {
      await this.page.keyboard.press("Shift+PageUp");
      await this.page.waitForTimeout(50);
      const text = await read();
      if (text === chunks[chunks.length - 1]) break;
      chunks.push(text);
    }

    // Restore the view to the bottom so subsequent viewport-only reads
    // (getTerminalOutput / verifyOutputNotContains) see the latest output.
    // xterm binds Shift+End to scrollToBottom, so one keypress replaces
    // paging back down chunk by chunk.
    await this.page.keyboard.press("Shift+End");
    await this.page.waitForTimeout(50);

    // Reverse into natural top -> bottom order.
    return chunks.reverse().join("\n");
  }

  async getLastCommandOutput(): Promise<string> {
    const output = await this.getTerminalOutput();
    // The output contains all terminal history
    // Return the recent content
    return output;
  }

  async verifyOutputContains(text: string | RegExp) {
    // Positive assertions read the FULL buffer (scrollback included) so a
    // long command's header lines still match on short viewports where they
    // have scrolled out of the rendered rows. Reading a superset can only
    // make a contains/match assertion pass more, never less.
    const output = await this.getFullTerminalOutput();
    if (typeof text === "string") {
      expect(output).toContain(text);
    } else {
      expect(output).toMatch(text);
    }
  }

  async verifyOutputNotContains(text: string) {
    // Deliberately reads only the visible viewport (NOT the full buffer):
    // scrollback retains output from earlier commands in the same test, so
    // a full-buffer not-contains would fail on stale text the current
    // command never printed.
    const output = await this.getTerminalOutput();
    expect(output).not.toContain(text);
  }

  async navigateToLabs() {
    // Click on Labs/Scenarios in the navigation
    await this.page.click('[data-testid="nav-labs"]');
    await this.page.waitForSelector('[data-testid="labs-list"]', {
      timeout: 5000,
    });
  }

  async selectScenario(scenarioTitle: string) {
    // Find and click the scenario by its title
    await this.page.click(`text=${scenarioTitle}`);
    // Wait for the lab workspace panel to appear
    await this.page.waitForSelector('[data-testid="lab-workspace"]', {
      timeout: 5000,
    });
  }

  async verifyScenarioStepComplete(stepNumber: number) {
    // Check if a specific step is marked as completed
    const step = this.page.locator(
      `[data-testid="scenario-step-${stepNumber}"]`,
    );
    // The step should have a check icon or completed class when done
    await expect(step.locator("svg")).toHaveClass(/text-green-500/);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getStoreState(storeName: string): Promise<any> {
    return await this.page.evaluate((name) => {
      // Access Zustand store from window (requires store to be exposed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__STORE__?.[name] || {};
    }, storeName);
  }

  async takeSnapshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  async compareSnapshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: 100,
    });
  }

  async clearTerminal() {
    await this.typeCommand("clear");
    await this.waitForCommandOutput();
  }
}

export async function createHelper(page: Page): Promise<SimulatorTestHelper> {
  return new SimulatorTestHelper(page);
}
