import { test, expect } from '@playwright/test';
import { createHelper } from '../setup/test-helpers';

test.describe('Integration Workflows', () => {
  test.beforeEach(async ({ page }) => {
    const helper = await createHelper(page);
    await helper.navigateToSimulator();
  });

  test.describe('Production Readiness Workflow', () => {
    test('should complete full production validation workflow', async ({ page }) => {
      const helper = await createHelper(page);

      // 1. Run burn-in tests
      await helper.typeCommand('nccl-test --burn-in --iterations 10');
      await helper.waitForCommandOutput(15000);
      const ncclOutput = await helper.getTerminalOutput();
      expect(ncclOutput.toLowerCase()).not.toMatch(/error|fail/);

      await helper.typeCommand('hpl --burn-in --iterations 5');
      await helper.waitForCommandOutput(15000);

      // 2. Verify cluster health
      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Health');

      // 3. Check GPU status
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('GPU');

      // 4. Validate network
      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('State');

      // All commands should execute without fatal errors
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).not.toMatch(/fatal|crash|exception/);
    });

    test('should detect issues in workflow', async ({ page }) => {
      const helper = await createHelper(page);

      // Run diagnostics
      await helper.typeCommand('dcgmi diag -r 1');
      await helper.waitForCommandOutput();

      // Check that status indicators work
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/pass|warn|fail|ok|error/);
    });
  });

  test.describe('Cross-tool validation', () => {
    test('should correlate ClusterKit results with nvidia-smi', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      const clusterKitOutput = await helper.getTerminalOutput();

      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      const nvidiaSmiOutput = await helper.getTerminalOutput();

      // Both should show GPU information
      expect(clusterKitOutput.toLowerCase()).toMatch(/gpu|health/);
      expect(nvidiaSmiOutput).toContain('GPU');
    });

    test('should correlate network health across tools', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();

      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();

      await helper.typeCommand('iblinkinfo');
      await helper.waitForCommandOutput();

      // All three should complete without errors
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).not.toContain('fatal error');
    });

    test('should verify firmware consistency', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('nvidia-smi -q');
      await helper.waitForCommandOutput();

      await helper.typeCommand('ipmitool mc info');
      await helper.waitForCommandOutput();

      // Both should show version information
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/version|firmware/);
    });
  });

  test.describe('Sequential command execution', () => {
    test('should handle long command sequences', async ({ page }) => {
      const helper = await createHelper(page);

      const commands = [
        'clusterkit',
        'nvidia-smi',
        'ibstat',
        'dcgmi diag -r 1',
        'nccl-test --burn-in --iterations 5',
        'hpl --burn-in --iterations 3',
        'clusterkit --verbose',
      ];

      for (const cmd of commands) {
        await helper.typeCommand(cmd);
        await helper.waitForCommandOutput(cmd.includes('burn-in') ? 15000 : 5000);
      }

      // All commands should execute successfully
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).not.toMatch(/fatal|crash/);
    });

    test('should maintain state across commands', async ({ page }) => {
      const helper = await createHelper(page);

      // Run diagnostic
      await helper.typeCommand('dcgmi diag -r 1');
      await helper.waitForCommandOutput();

      // Check GPU
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      // Next command should still work
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Health');
    });

    test('should handle alternating command types', async ({ page }) => {
      const helper = await createHelper(page);

      // Alternate between GPU and network commands
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();

      await helper.typeCommand('dcgmi health -c');
      await helper.waitForCommandOutput();

      await helper.typeCommand('iblinkinfo');
      await helper.waitForCommandOutput();

      // All should complete
      const output = await helper.getTerminalOutput();
      expect(output).toContain('GPU');
      expect(output.toLowerCase()).toMatch(/state|link/);
    });
  });

  test.describe('Performance and stress tests', () => {
    test('should handle rapid command execution', async ({ page }) => {
      const helper = await createHelper(page);

      // Fire commands rapidly
      for (let i = 0; i < 10; i++) {
        await helper.typeCommand('nvidia-smi');
        await helper.waitForCommandOutput(2000);
      }

      // Terminal should still be responsive
      await helper.typeCommand('help');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Available');
    });

    test('should handle very long output without breaking UI', async ({ page }) => {
      const helper = await createHelper(page);

      // Commands that produce lots of output
      await helper.typeCommand('clusterkit --verbose');
      await helper.waitForCommandOutput();

      await helper.typeCommand('nvidia-smi -q');
      await helper.waitForCommandOutput();

      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();

      // Terminal should still scroll and be usable
      await helper.typeCommand('help');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Available');
    });

    test('should handle concurrent operations gracefully', async ({ page }) => {
      const helper = await createHelper(page);

      // Start burn-in test
      await helper.typeCommand('nccl-test --burn-in --iterations 20');
      await helper.waitForCommandOutput(15000);

      // Immediately run another command
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      // Both should complete
      const output = await helper.getTerminalOutput();
      expect(output).toContain('GPU');
    });
  });

  test.describe('Error recovery workflows', () => {
    test('should recover from invalid commands', async ({ page }) => {
      const helper = await createHelper(page);

      // Run invalid command
      await helper.typeCommand('invalid-command-xyz');
      await helper.waitForCommandOutput();

      // Terminal should still work
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('GPU');
    });

    test('should handle commands with invalid flags', async ({ page }) => {
      const helper = await createHelper(page);

      // Invalid flag
      await helper.typeCommand('nvidia-smi --nonexistent-flag');
      await helper.waitForCommandOutput();

      // Should show error but terminal continues
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('GPU');
    });

    test('should continue after help commands', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('help');
      await helper.waitForCommandOutput();

      await helper.typeCommand('nvidia-smi --help');
      await helper.waitForCommandOutput();

      // Normal commands should still work
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('GPU');
    });
  });

  test.describe('Node switching workflows', () => {
    test('should SSH to different nodes', async ({ page }) => {
      const helper = await createHelper(page);

      // SSH to a different node
      await helper.typeCommand('ssh dgx-01');
      await helper.waitForCommandOutput();

      // Verify connection
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/connect|dgx-01/);
    });

    test('should run commands after node switch', async ({ page }) => {
      const helper = await createHelper(page);

      // Switch to different node
      await helper.typeCommand('ssh dgx-01');
      await helper.waitForCommandOutput();

      // Run command on new node
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('GPU');
    });

    test('should show available nodes', async ({ page }) => {
      const helper = await createHelper(page);

      await helper.typeCommand('ssh');
      await helper.waitForCommandOutput();

      // Should show available nodes
      const output = await helper.getTerminalOutput();
      expect(output.toLowerCase()).toMatch(/dgx|node|available/);
    });
  });

  test.describe('Clear and reset workflows', () => {
    test('should clear terminal and continue', async ({ page }) => {
      const helper = await createHelper(page);

      // Run some commands
      await helper.typeCommand('nvidia-smi');
      await helper.waitForCommandOutput();

      // Clear terminal
      await helper.typeCommand('clear');
      await helper.waitForCommandOutput();

      // Run more commands
      await helper.typeCommand('ibstat');
      await helper.waitForCommandOutput();

      await helper.verifyOutputContains('State');
    });

    test('should work after multiple clears', async ({ page }) => {
      const helper = await createHelper(page);

      for (let i = 0; i < 3; i++) {
        await helper.typeCommand('nvidia-smi');
        await helper.waitForCommandOutput();
        await helper.typeCommand('clear');
        await helper.waitForCommandOutput();
      }

      // Terminal should still work
      await helper.typeCommand('clusterkit');
      await helper.waitForCommandOutput();
      await helper.verifyOutputContains('Health');
    });
  });
});
