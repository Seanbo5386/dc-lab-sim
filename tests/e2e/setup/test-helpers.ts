import { Page, expect } from '@playwright/test';

export class SimulatorTestHelper {
  constructor(private page: Page) {}

  async navigateToSimulator() {
    await this.page.goto('/');
    // Wait for welcome screen animation to complete
    await this.page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
    // Click the "Enter Virtual Datacenter" button
    await this.page.click('button:has-text("Enter Virtual Datacenter")');
    // Wait for terminal to be ready
    await this.page.waitForSelector('[data-testid="terminal"]', { timeout: 10000 });
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
    await this.page.keyboard.press('Enter');
  }

  async waitForCommandOutput(timeout = 5000) {
    // Wait for terminal to process the command
    // The terminal shows a prompt after command completion
    await this.page.waitForTimeout(Math.min(timeout, 1000));
  }

  async getTerminalOutput(): Promise<string> {
    // xterm.js renders text in spans within .xterm-rows
    const terminalContent = await this.page.locator('[data-testid="terminal"] .xterm-rows').textContent();
    return terminalContent || '';
  }

  async getLastCommandOutput(): Promise<string> {
    const output = await this.getTerminalOutput();
    // The output contains all terminal history
    // Return the recent content
    return output;
  }

  async verifyOutputContains(text: string | RegExp) {
    const output = await this.getTerminalOutput();
    if (typeof text === 'string') {
      expect(output).toContain(text);
    } else {
      expect(output).toMatch(text);
    }
  }

  async verifyOutputNotContains(text: string) {
    const output = await this.getTerminalOutput();
    expect(output).not.toContain(text);
  }

  async navigateToLabs() {
    // Click on Labs/Scenarios in the navigation
    await this.page.click('[data-testid="nav-labs"]');
    await this.page.waitForSelector('[data-testid="labs-list"]', { timeout: 5000 });
  }

  async selectScenario(scenarioTitle: string) {
    // Find and click the scenario by its title
    await this.page.click(`text=${scenarioTitle}`);
    // Wait for the lab workspace panel to appear
    await this.page.waitForSelector('[data-testid="lab-workspace"]', { timeout: 5000 });
  }

  async verifyScenarioStepComplete(stepNumber: number) {
    // Check if a specific step is marked as completed
    const step = this.page.locator(`[data-testid="scenario-step-${stepNumber}"]`);
    // The step should have a check icon or completed class when done
    await expect(step.locator('svg')).toHaveClass(/text-green-500/);
  }

  async getStoreState(storeName: string): Promise<any> {
    return await this.page.evaluate((name) => {
      // Access Zustand store from window (requires store to be exposed)
      return (window as any).__STORE__?.[name] || {};
    }, storeName);
  }

  async takeSnapshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }

  async compareSnapshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: 100,
    });
  }

  async clearTerminal() {
    await this.typeCommand('clear');
    await this.waitForCommandOutput();
  }
}

export async function createHelper(page: Page): Promise<SimulatorTestHelper> {
  return new SimulatorTestHelper(page);
}
