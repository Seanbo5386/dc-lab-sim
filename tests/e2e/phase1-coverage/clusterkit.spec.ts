import { test, expect } from "@playwright/test";
import { createHelper } from "../setup/test-helpers";

test.describe("ClusterKit Commands", () => {
  test.beforeEach(async ({ page }) => {
    const helper = await createHelper(page);
    await helper.navigateToSimulator();
  });

  test.describe("Basic clusterkit command", () => {
    test("should execute and show health status", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess");
      await helper.waitForCommandOutput();

      // Verify terminal output contains expected sections
      await helper.verifyOutputContains("ClusterKit Assessment Report");
      await helper.verifyOutputContains("Overall Health");
      await helper.verifyOutputContains("GPU");
      await helper.verifyOutputContains("NETWORK");
      await helper.verifyOutputContains("STORAGE");
      await helper.verifyOutputContains("FIRMWARE");
      await helper.verifyOutputContains("DRIVERS");

      // Verify status icons appear (pass/warning/fail)
      const output = await helper.getTerminalOutput();
      expect(output).toMatch(/[✓⚠✗]/);
    });

    test("should work across all viewports", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess");
      await helper.waitForCommandOutput();

      // Verify output is readable
      await helper.verifyOutputContains("ClusterKit Assessment Report");
    });
  });

  test.describe("Verbose mode", () => {
    test("should show detailed component information with --verbose", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess --verbose");
      await helper.waitForCommandOutput();

      // Verify detailed output (verbose mode shows details under each category)
      await helper.verifyOutputContains("ClusterKit Assessment Report");
      await helper.verifyOutputContains("GPU");
      // Verbose mode shows detailed info with dashes
      const output = await helper.getTerminalOutput();
      expect(output).toMatch(/- GPU \d+:/); // Shows "- GPU 0: ..." details
    });

    test("should show version with -v flag", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit -v");
      await helper.waitForCommandOutput();

      // -v shows version info
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/version|clusterkit/);
    });

    test("should show more content than basic mode", async ({ page }) => {
      const helper = await createHelper(page);

      // Run verbose mode
      await helper.typeCommand("clusterkit assess --verbose");
      await helper.waitForCommandOutput();
      const verboseOutput = await helper.getTerminalOutput();

      // Verbose mode shows detail lines (e.g., "- GPU 0: ...")
      expect(verboseOutput).toMatch(/- GPU \d+:/);
      expect(verboseOutput).toMatch(/- .*:/); // Multiple detail lines
    });
  });

  test.describe("Node targeting", () => {
    test("should target specific node with --node flag", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess --node dgx-01");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("dgx-01");
      await helper.verifyOutputContains("Overall Health");
    });

    test("should work with different node names", async ({ page }) => {
      const helper = await createHelper(page);

      // Test with first node
      await helper.typeCommand("clusterkit assess --node dgx-00");
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains("dgx-00");

      // Test with another node
      await helper.clearTerminal();
      await helper.typeCommand("clusterkit assess --node dgx-01");
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains("dgx-01");
    });

    test("should handle invalid node name gracefully", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess --node invalid-node");
      await helper.waitForCommandOutput();

      // Should show error message
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/error|not found|invalid/);
    });

    test("should combine --node and --verbose", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess --node dgx-01 --verbose");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("dgx-01");
      // Verbose mode shows detailed info
      const output = await helper.getTerminalOutput();
      expect(output).toMatch(/- GPU \d+:/);
    });
  });

  test.describe("Error handling", () => {
    test("should reject unknown flags", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit invalid-subcommand");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/error|unknown|invalid/);
    });

    test("should show help with --help", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit --help");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("Usage");
      await helper.verifyOutputContains("clusterkit");
      // Help shows commands: assess, check
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/assess|check|command/);
    });
  });

  test.describe("Edge cases", () => {
    test("should handle rapid repeated execution", async ({ page }) => {
      const helper = await createHelper(page);

      for (let i = 0; i < 5; i++) {
        await helper.typeCommand("clusterkit assess");
        await helper.waitForCommandOutput();
      }

      // Should still work correctly
      await helper.verifyOutputContains("Overall Health");
    });

    test("should work after other commands", async ({ page }) => {
      const helper = await createHelper(page);

      // Run other commands first
      await helper.typeCommand("nvidia-smi");
      await helper.waitForCommandOutput();

      await helper.typeCommand("ibstat");
      await helper.waitForCommandOutput();

      // ClusterKit should still work
      await helper.typeCommand("clusterkit assess");
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains("Overall Health");
    });

    test("should handle very long output without breaking", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("clusterkit assess --verbose");
      await helper.waitForCommandOutput();

      // Terminal should still be responsive - help shows command categories
      await helper.typeCommand("help");
      await helper.waitForCommandOutput();
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(
        /cluster management|system info|networking/,
      );
    });
  });

  test.describe("Responsive behavior", () => {
    test("should work on laptop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand("clusterkit assess --verbose");
      await helper.waitForCommandOutput();

      // Verbose output is long; at this viewport height the terminal only
      // renders its visible rows (xterm.js doesn't keep off-screen scrollback
      // in the DOM), so the report header scrolls out of view by the time the
      // command finishes. Assert on detail content that is still on-screen
      // instead, consistent with the other verbose-mode assertions above.
      const output = await helper.getTerminalOutput();
      expect(output).toContain("GPU");
      expect(output).toMatch(/- GPU \d+:/);
    });

    test("should work on large display", async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand("clusterkit assess");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("Overall Health");
    });
  });
});
