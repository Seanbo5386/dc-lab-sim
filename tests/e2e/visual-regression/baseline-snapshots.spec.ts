import { test, expect } from '@playwright/test';
import { createHelper } from '../setup/test-helpers';

test.describe('Visual Regression Baselines', () => {
  test.describe('Desktop 1920x1080', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('welcome screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
      await expect(page).toHaveScreenshot('welcome-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('simulator terminal', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await page.waitForTimeout(1000); // Allow terminal to fully render
      await expect(page).toHaveScreenshot('terminal-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('clusterkit output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('clusterkit-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('nvidia-smi output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('nvidia-smi-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('labs page', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.navigateToLabs();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('labs-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('lab workspace', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.navigateToLabs();

      const domain4Card = page.locator('text=Domain 4').locator('..').locator('..');
      await domain4Card.locator('button:has-text("Start Labs")').click();
      await expect(page.locator('[data-testid="lab-workspace"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('lab-workspace-1920.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });
  });

  test.describe('Laptop 1366x768', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('welcome screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
      await expect(page).toHaveScreenshot('welcome-1366.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('simulator terminal', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('terminal-1366.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('clusterkit output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('clusterkit-1366.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('labs page responsive', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.navigateToLabs();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('labs-1366.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('lab workspace responsive', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.navigateToLabs();

      const domain4Card = page.locator('text=Domain 4').locator('..').locator('..');
      await domain4Card.locator('button:has-text("Start Labs")').click();
      await expect(page.locator('[data-testid="lab-workspace"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('lab-workspace-1366.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });
  });

  test.describe('Large Display 2560x1440', () => {
    test.use({ viewport: { width: 2560, height: 1440 } });

    test('welcome screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
      await expect(page).toHaveScreenshot('welcome-2560.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('simulator terminal', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('terminal-2560.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('clusterkit output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('clusterkit-2560.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });

    test('labs page large display', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.navigateToLabs();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('labs-2560.png', {
        maxDiffPixels: 500,
        timeout: 15000,
      });
    });
  });

  test.describe('Component-specific snapshots', () => {
    test('terminal with verbose output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);

      // Take screenshot of just the terminal area
      const terminal = page.locator('[data-testid="terminal"]');
      await expect(terminal).toHaveScreenshot('terminal-verbose-output.png', {
        maxDiffPixels: 300,
      });
    });

    test('terminal with error output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('invalid-command');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);

      const terminal = page.locator('[data-testid="terminal"]');
      await expect(terminal).toHaveScreenshot('terminal-error-output.png', {
        maxDiffPixels: 300,
      });
    });

    test('terminal with help output', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();
      await helper.typeCommand('help');
      await helper.waitForCommandOutput();
      await page.waitForTimeout(500);

      const terminal = page.locator('[data-testid="terminal"]');
      await expect(terminal).toHaveScreenshot('terminal-help-output.png', {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Dark theme consistency', () => {
    test('consistent color scheme across pages', async ({ page }) => {
      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      // Check simulator page
      const bgColor1 = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      await helper.navigateToLabs();

      const bgColor2 = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      // Background colors should be consistent (dark theme)
      expect(bgColor1).toBe(bgColor2);
    });
  });
});
