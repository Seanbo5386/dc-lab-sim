import { test, expect } from "@playwright/test";
import { createHelper } from "../setup/test-helpers";

test.describe("Firmware and Cable Validation", () => {
  test.beforeEach(async ({ page }) => {
    const helper = await createHelper(page);
    await helper.navigateToSimulator();
  });

  test.describe("Firmware checking with ipmitool", () => {
    test("should show BMC firmware version", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ipmitool mc info");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("Firmware Revision");
      await helper.verifyOutputContains("IPMI Version");
    });

    test("should show FRU information", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ipmitool fru print");
      await helper.waitForCommandOutput();

      // FRU output contains Board and Product info
      await helper.verifyOutputContains("Board Product");
      await helper.verifyOutputContains("Board Serial");
    });

    test("should show sensor readings", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ipmitool sensor");
      await helper.waitForCommandOutput();

      // Should show temperature and power sensors
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/temp|temperature|power|fan/);
    });
  });

  test.describe("GPU firmware with nvidia-smi", () => {
    test("should show GPU power and clocks info", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("nvidia-smi -q");
      await helper.waitForCommandOutput();

      // nvidia-smi -q output is long, verify visible sections near end
      await helper.verifyOutputContains("Power Readings");
      await helper.verifyOutputContains("Clocks");
    });

    test("should show GPU temperature info", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("nvidia-smi -q");
      await helper.waitForCommandOutput();

      // Should show temperature info
      await helper.verifyOutputContains("Temperature");
    });

    test("should show CUDA version", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("nvidia-smi");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("CUDA");
    });
  });

  test.describe("Network firmware with mlx tools", () => {
    test("should show HCA firmware with mlxfwmanager", async ({ page }) => {
      const helper = await createHelper(page);

      // mlxconfig queries device *configuration* parameters (nic_mode,
      // sriov_en, etc.), not firmware version — mlxfwmanager --query is the
      // real Mellanox/NVIDIA tool for that (see mellanoxSimulator.ts
      // handleMLXFwManager, which prints a "Firmware" column).
      await helper.typeCommand(
        "mlxfwmanager -d /dev/mst/mt4123_pciconf0 --query",
      );
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/firmware|fw|version/);
    });

    test("should show link status with mlxlink", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("mlxlink -d /dev/mst/mt4123_pciconf0");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/link|state|speed/);
    });

    test("should show cable info with mlxcables", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("mlxcables");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/cable|port|status/);
    });
  });

  test.describe("Cable signal quality with ibdiagnet", () => {
    test("should show detailed metrics with ibdiagnet --detailed", async ({
      page,
    }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ibdiagnet --detailed");
      await helper.waitForCommandOutput();

      // Should show cable validation info
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/cable|link|port|fabric/);
    });

    test("should show signal quality metrics", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ibdiagnet --detailed");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      // Should contain signal quality indicators
      expect(output.toLowerCase()).toMatch(/signal|quality|power|error/);
    });

    test("should work without detailed flag (basic mode)", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ibdiagnet");
      await helper.waitForCommandOutput();

      // Basic mode should still work
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/fabric|network|diagnostic/);
    });
  });

  test.describe("InfiniBand port status", () => {
    test("should show port state with ibstat", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ibstat");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("State");
      await helper.verifyOutputContains("Physical state");
      await helper.verifyOutputContains("Rate");
    });

    test("should show port errors with ibporterrors", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ibporterrors");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/error|counter|port/);
    });

    test("should show link info with iblinkinfo", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("iblinkinfo");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/link|switch|hca/);
    });
  });

  test.describe("Edge cases", () => {
    test("should handle rapid firmware check commands", async ({ page }) => {
      const helper = await createHelper(page);

      // Run multiple firmware checks quickly
      await helper.typeCommand("nvidia-smi");
      await helper.waitForCommandOutput();

      await helper.typeCommand("ibstat");
      await helper.waitForCommandOutput();

      await helper.typeCommand("ipmitool mc info");
      await helper.waitForCommandOutput();

      // All should complete without errors
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).not.toContain("fatal error");
    });

    test("should combine firmware and cable validation", async ({ page }) => {
      const helper = await createHelper(page);

      // Check GPU firmware
      await helper.typeCommand("nvidia-smi -q");
      await helper.waitForCommandOutput();

      // Check cable/network status
      await helper.typeCommand("ibdiagnet");
      await helper.waitForCommandOutput();

      // Both should work correctly in sequence
      const output = await helper.getTerminalOutput();
      expect(output).toContain("GPU");
    });

    test("should show help for ipmitool", async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand("ipmitool help");
      await helper.waitForCommandOutput();

      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/usage|command|option/);
    });
  });

  test.describe("Responsive behavior", () => {
    test("should display firmware info on laptop viewport", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1366, height: 768 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand("nvidia-smi");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("GPU");
    });

    test("should display cable info on large viewport", async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });

      const helper = await createHelper(page);
      await helper.navigateToSimulator();

      await helper.typeCommand("ibstat");
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains("State");
    });
  });
});
