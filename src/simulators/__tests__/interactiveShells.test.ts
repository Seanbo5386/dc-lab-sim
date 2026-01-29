import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NvsmSimulator } from '../nvsmSimulator';
import { CmshSimulator } from '../cmshSimulator';
import { parse } from '@/utils/commandParser';
import type { CommandContext } from '@/types/commands';

// Mock the store
vi.mock('@/store/simulationStore', () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
      cluster: {
        nodes: [
          {
            id: 'dgx-00',
            hostname: 'dgx-node01',
            systemType: 'H100',
            healthStatus: 'OK',
            nvidiaDriverVersion: '535.129.03',
            cudaVersion: '12.2',
            gpus: [
              {
                id: 0,
                name: 'NVIDIA H100 80GB HBM3',
                type: 'H100-SXM',
                uuid: 'GPU-12345678-1234-1234-1234-123456789012',
                pciAddress: '0000:17:00.0',
                temperature: 45,
                powerDraw: 250,
                powerLimit: 700,
                memoryTotal: 81920,
                memoryUsed: 1024,
                utilization: 0,
                clocksSM: 1980,
                clocksMem: 2619,
                eccEnabled: true,
                eccErrors: {
                  singleBit: 0,
                  doubleBit: 0,
                  aggregated: { singleBit: 0, doubleBit: 0 },
                },
                migMode: false,
                migInstances: [],
                nvlinks: [], // Empty array to prevent forEach errors
                healthStatus: 'OK',
                xidErrors: [],
                persistenceMode: true,
              },
            ],
            hcas: [],
          },
        ],
      },
    })),
  },
}));

describe('Interactive Shell Tests', () => {
  let context: CommandContext;

  beforeEach(() => {
    context = {
      currentNode: 'dgx-00',
      currentPath: '/root',
      environment: {},
      history: [],
    };
  });

  describe('NvsmSimulator Interactive Mode', () => {
    let simulator: NvsmSimulator;

    beforeEach(() => {
      simulator = new NvsmSimulator();
    });

    it('should enter interactive mode with no arguments', () => {
      const parsed = parse('nvsm');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeDefined();
      expect(result.prompt).toContain('nvsm->');
      expect(result.output).toBe(''); // Output is empty when entering interactive mode
    });

    it('should execute commands in interactive mode', () => {
      // First enter interactive mode
      const enterResult = simulator.execute(parse('nvsm'), context);
      expect(enterResult.prompt).toBeDefined();

      // Execute "show" command in interactive mode
      const cmdResult = simulator.executeInteractive('show', context);
      expect(cmdResult.exitCode).toBe(0);
      expect(cmdResult.output).toContain('/systems/localhost'); // Shows current target
      expect(cmdResult.output).toContain('Properties:'); // Shows target properties
      expect(cmdResult.prompt).toBeDefined(); // Still in interactive mode
    });

    it('should show health in interactive mode', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('show health', context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Checks'); // Actual health output format
      expect(result.output).toContain('Health Summary');
    });

    it('should show detailed health', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('show health --detailed', context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Checks'); // Detailed still shows "Checks"
      expect(result.output).toContain('Health Summary');
    });

    it('should exit with exit command', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('exit', context);

      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeUndefined(); // Exited interactive mode
    });

    it('should exit with quit command', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('quit', context);

      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeUndefined();
    });

    it('should show help in interactive mode', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('help', context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NVIDIA System Management (NVSM) Interactive Shell');
      expect(result.output).toContain('show'); // Command listed
    });

    it('should handle empty input', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('', context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe('');
      expect(result.prompt).toBeDefined(); // Still in mode
    });

    it('should handle unknown commands', () => {
      simulator.execute(parse('nvsm'), context);
      const result = simulator.executeInteractive('unknown', context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('Unknown verb'); // Actual error format
      expect(result.prompt).toBeDefined(); // Still in mode
    });

    it('should execute direct command without entering interactive', () => {
      const parsed = parse('nvsm show');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('/systems/localhost'); // Shows target
      expect(result.prompt).toBeUndefined(); // Not in interactive mode
    });
  });

  describe('CmshSimulator Interactive Mode', () => {
    let simulator: CmshSimulator;

    beforeEach(() => {
      simulator = new CmshSimulator();
    });

    it('should enter interactive mode with no arguments', () => {
      const parsed = parse('cmsh');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.prompt).toBeDefined();
      expect(result.prompt).toContain('[root@dgx-headnode]%');
      expect(result.output).toContain('Cluster Management Shell');
    });

    it('should support mode switching', () => {
      simulator.execute(parse('cmsh'), context);

      // Enter device mode
      const deviceResult = simulator.executeInteractive('device', context);
      expect(deviceResult.prompt).toContain('->device');

      // List devices
      const listResult = simulator.executeInteractive('list', context);
      expect(listResult.exitCode).toBe(0);
      expect(listResult.output).toContain('Name (key)');
    });

    it('should support category mode', () => {
      simulator.execute(parse('cmsh'), context);

      const categoryResult = simulator.executeInteractive('category', context);
      expect(categoryResult.prompt).toContain('->category');

      const listResult = simulator.executeInteractive('list', context);
      expect(listResult.output).toContain('headnode');
      expect(listResult.output).toContain('dgx-h100');
    });

    it('should support softwareimage mode', () => {
      simulator.execute(parse('cmsh'), context);

      const modeResult = simulator.executeInteractive('softwareimage', context);
      expect(modeResult.prompt).toContain('->softwareimage');

      const listResult = simulator.executeInteractive('list', context);
      expect(listResult.output).toContain('baseos-image');
    });

    it('should support partition mode', () => {
      simulator.execute(parse('cmsh'), context);

      const modeResult = simulator.executeInteractive('partition', context);
      expect(modeResult.prompt).toContain('->partition');

      const listResult = simulator.executeInteractive('list', context);
      expect(listResult.output).toContain('gpu');
    });

    it('should support use command to select objects', () => {
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);

      const useResult = simulator.executeInteractive('use dgx-node01', context);
      expect(useResult.prompt).toContain('[dgx-node01]');
    });

    it('should support show command for selected objects', () => {
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);
      simulator.executeInteractive('use dgx-node01', context);

      const showResult = simulator.executeInteractive('show', context);
      expect(showResult.exitCode).toBe(0);
      expect(showResult.output).toContain('Parameter');
      expect(showResult.output).toContain('Value');
    });

    it('should support list with JSON output', () => {
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);

      const listResult = simulator.executeInteractive('list -d {}', context);
      expect(listResult.exitCode).toBe(0);
      // Should contain JSON format
      expect(listResult.output).toMatch(/[[\{]/);
    });

    it('should exit from mode to base prompt', () => {
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);

      const exitResult = simulator.executeInteractive('exit', context);
      expect(exitResult.prompt).toContain('[root@dgx-headnode]%');
      expect(exitResult.prompt).not.toContain('->device');
    });

    it('should exit completely from base prompt', () => {
      simulator.execute(parse('cmsh'), context);

      const exitResult = simulator.executeInteractive('exit', context);
      expect(exitResult.prompt).toBeUndefined();
    });

    it('should show help in interactive mode', () => {
      simulator.execute(parse('cmsh'), context);

      const helpResult = simulator.executeInteractive('help', context);
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.output).toContain('Modes:');
      expect(helpResult.output).toContain('device');
      expect(helpResult.output).toContain('category');
    });
  });

  describe('Interactive Mode Edge Cases', () => {
    it('should handle rapid mode switching in cmsh', () => {
      const simulator = new CmshSimulator();
      simulator.execute(parse('cmsh'), context);

      simulator.executeInteractive('device', context);
      simulator.executeInteractive('category', context);
      const result = simulator.executeInteractive('softwareimage', context);

      expect(result.prompt).toContain('->softwareimage');
    });

    it('should handle invalid object selection', () => {
      const simulator = new CmshSimulator();
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);

      const result = simulator.executeInteractive('use nonexistent', context);
      expect(result.prompt).toBeDefined(); // Should stay in mode
    });

    it('should handle show without selection', () => {
      const simulator = new CmshSimulator();
      simulator.execute(parse('cmsh'), context);
      simulator.executeInteractive('device', context);

      const result = simulator.executeInteractive('show', context);
      expect(result.output).toContain('No object selected');
    });

    it('should maintain state across commands', () => {
      const simulator = new NvsmSimulator();
      simulator.execute(parse('nvsm'), context);

      const result1 = simulator.executeInteractive('show', context);
      const result2 = simulator.executeInteractive('show health', context);

      expect(result1.prompt).toBeDefined();
      expect(result2.prompt).toBeDefined();
      // Both should maintain interactive mode
    });

    it('should handle very long commands in interactive mode', () => {
      const simulator = new NvsmSimulator();
      simulator.execute(parse('nvsm'), context);

      const longCommand = 'show ' + 'health '.repeat(50);
      const result = simulator.executeInteractive(longCommand, context);

      // Should handle gracefully, even if invalid
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
