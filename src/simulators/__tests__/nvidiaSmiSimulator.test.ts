import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NvidiaSmiSimulator } from '../nvidiaSmiSimulator';
import { parse } from '@/utils/commandParser';
import type { CommandContext } from '@/types/commands';
import { useSimulationStore } from '@/store/simulationStore';

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
                nvlinks: [],
                healthStatus: 'OK',
                xidErrors: [],
                persistenceMode: true,
              },
              {
                id: 1,
                name: 'NVIDIA H100 80GB HBM3',
                type: 'H100-SXM',
                uuid: 'GPU-12345678-1234-1234-1234-123456789013',
                pciAddress: '0000:18:00.0',
                temperature: 50,
                powerDraw: 300,
                powerLimit: 700,
                memoryTotal: 81920,
                memoryUsed: 40960,
                utilization: 75,
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
                nvlinks: [],
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

describe('NvidiaSmiSimulator', () => {
  let simulator: NvidiaSmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new NvidiaSmiSimulator();
    context = {
      currentNode: 'dgx-00',
      currentPath: '/root',
      environment: {},
      history: [],
    };
  });

  describe('Basic Command', () => {
    it('should execute nvidia-smi without flags', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NVIDIA-SMI');
      expect(result.output).toContain('H100');
      expect(result.output).toContain('Driver Version');
      expect(result.output).toContain('CUDA Version');
    });

    it('should display GPU table with correct format', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain('No running processes found'); // Processes section
      expect(result.output).toContain('GPU  Name');
      expect(result.output).toContain('Persistence-M');
    });
  });

  describe('List GPUs (-L flag)', () => {
    it('should list all GPUs with -L flag', () => {
      const parsed = parse('nvidia-smi -L');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('GPU 0:');
      expect(result.output).toContain('GPU 1:');
      expect(result.output).toContain('H100 80GB HBM3');
      expect(result.output).toContain('UUID: GPU-');
    });

    it('should show correct UUID format', () => {
      const parsed = parse('nvidia-smi -L');
      const result = simulator.execute(parsed, context);

      expect(result.output).toMatch(/UUID: GPU-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    });
  });

  describe('Query Command (-q flag)', () => {
    it('should show detailed info with -q flag', () => {
      const parsed = parse('nvidia-smi -q');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('GPU 00000000'); // Actual format
      expect(result.output).toContain('Product Name');
      expect(result.output).toContain('GPU Current Temp'); // Actual key name
      expect(result.output).toContain('Power Draw');
      expect(result.output).toContain('FB Memory Usage');
    });

    it('should show memory details with -q -d MEMORY', () => {
      const parsed = parse('nvidia-smi -q -d MEMORY');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('FB Memory Usage');
      expect(result.output).toContain('Total');
      expect(result.output).toContain('Used');
      expect(result.output).toContain('Free');
      expect(result.output).toMatch(/\d+ MiB/);
    });

    it('should show specific GPU with -q -i 0', () => {
      const parsed = parse('nvidia-smi -q -i 0');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('GPU 00000000'); // Actual format
      expect(result.output).not.toContain('GPU 00000001'); // Second GPU
    });

    it('should handle invalid GPU ID', () => {
      const parsed = parse('nvidia-smi -q -i 99');
      const result = simulator.execute(parsed, context);

      // Simulator validates GPU IDs and returns error for invalid index
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain('GPU not found');
    });
  });

  describe('Help and Version', () => {
    it('should show help with --help', () => {
      const parsed = parse('nvidia-smi --help');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NVIDIA System Management Interface');
      expect(result.output).toContain('nvidia-smi [OPTION'); // Actual usage format
      expect(result.output).toContain('-L');
      expect(result.output).toContain('-q');
    });

    it('should show version with --version', () => {
      const parsed = parse('nvidia-smi --version');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NVIDIA-SMI version'); // Actual format
      expect(result.output).toContain('NVML version'); // Note: lowercase 'v'
    });
  });

  describe('GPU State Integration', () => {
    it('should reflect GPU utilization', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      // GPU 0 has 0% utilization, GPU 1 has 75%
      expect(result.output).toContain('0%'); // GPU 0
      expect(result.output).toContain('75%'); // GPU 1
    });

    it('should show correct memory usage', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      // GPU 0: 1 MiB used (1024/1024), GPU 1: 40 MiB used (40960/1024)
      expect(result.output).toContain('1MiB');
      expect(result.output).toContain('40MiB');
    });

    it('should show temperature values', () => {
      const parsed = parse('nvidia-smi -q');
      const result = simulator.execute(parsed, context);

      expect(result.output).toMatch(/GPU Current Temp\s+:\s+45 C/);
      expect(result.output).toMatch(/GPU Current Temp\s+:\s+50 C/);
    });

    it('should show power usage', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain('250W');
      expect(result.output).toContain('300W');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no GPUs gracefully', () => {
      // Mock empty GPU list
      vi.mocked(useSimulationStore.getState).mockReturnValueOnce({
        cluster: {
          nodes: [{
            id: 'dgx-00',
            hostname: 'dgx-node01',
            systemType: 'H100',
            healthStatus: 'OK',
            nvidiaDriverVersion: '535.129.03',
            cudaVersion: '12.2',
            gpus: [],
            hcas: [],
          }],
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      // Returns success with empty GPU listing
      expect(result.exitCode).toBe(0);
    });

    it('should handle unknown flags gracefully', () => {
      const parsed = parse('nvidia-smi --unknown-flag');
      const result = simulator.execute(parsed, context);

      // Simulator validates flags using fuzzy matching and returns error for unknown flags
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain('unrecognized option');
    });

    it('should handle conflicting flags', () => {
      const parsed = parse('nvidia-smi -L -q');
      const result = simulator.execute(parsed, context);

      // Should handle gracefully (typically one takes precedence)
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Output Format', () => {
    it('should maintain consistent column alignment', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      const lines = result.output.split('\n');
      const headerLines = lines.filter(line => line.includes('GPU  Name'));
      expect(headerLines.length).toBeGreaterThan(0);

      // Check for consistent separator lines
      const separators = lines.filter(line => line.includes('======='));
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should produce table output', () => {
      const parsed = parse('nvidia-smi');
      const result = simulator.execute(parsed, context);

      // Verify table structure
      expect(result.output).toContain('+-------');
      expect(result.output).toContain('|');
    });
  });
});
