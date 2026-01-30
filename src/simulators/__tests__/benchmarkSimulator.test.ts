import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BenchmarkSimulator } from '../benchmarkSimulator';
import { parse } from '@/utils/commandParser';
import type { CommandContext } from '@/types/commands';
import { useSimulationStore } from '@/store/simulationStore';

// Mock the store
vi.mock('@/store/simulationStore');

describe('BenchmarkSimulator', () => {
  let simulator: BenchmarkSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new BenchmarkSimulator();
    context = {
      currentNode: 'dgx-00',
      currentPath: '/root',
      environment: {},
      history: [],
    };

    // Setup default mock
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: 'dgx-00',
            hostname: 'dgx-node01',
            systemType: 'DGX H100',
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
                memoryUsed: 2048,
                utilization: 50,
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
          },
        ],
      },
    } as any);
  });

  describe('NCCL Tests', () => {
    it('should run regular NCCL test', () => {
      const parsed = parse('nccl-test');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('nccl-tests');
      expect(result.output).toContain('all_reduce');
      expect(result.output).toContain('Using devices');
    });

    it('should run NCCL test with custom operation', () => {
      const parsed = parse('nccl-test --operation broadcast');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('broadcast');
    });

    it('should run burn-in test with --burn-in flag', () => {
      const parsed = parse('nccl-test --burn-in');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NCCL Burn-in Test');
      expect(result.output).toContain('Iterations: 1000');
      expect(result.output).toContain('Running NCCL AllReduce burn-in');
      expect(result.output).toContain('Burn-in Status: PASSED');
      expect(result.output).toContain('Average Bandwidth:');
      expect(result.output).toContain('Min Bandwidth:');
      expect(result.output).toContain('Max Bandwidth:');
      expect(result.output).toContain('Failures: 0');
    });

    it('should run burn-in test with --burnin flag (alias)', () => {
      const parsed = parse('nccl-test --burnin');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('NCCL Burn-in Test');
    });

    it('should run burn-in test with custom iterations', () => {
      const parsed = parse('nccl-test --burn-in --iterations 500');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Iterations: 500');
      expect(result.output).toContain('NCCL Burn-in Test');
    });

    it('should show only first 10 iterations for large burn-in tests', () => {
      const parsed = parse('nccl-test --burn-in --iterations 2000');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Iteration 10/2000');
      expect(result.output).toContain('... (1990 more iterations)');
    });

    it('should show all iterations for small burn-in tests', () => {
      const parsed = parse('nccl-test --burn-in --iterations 5');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Iteration 1/5');
      expect(result.output).toContain('Iteration 5/5');
      expect(result.output).not.toContain('more iterations');
    });

    it('should report bandwidth within expected range (280-300 GB/s)', () => {
      const parsed = parse('nccl-test --burn-in --iterations 10');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract bandwidth values from output
      const bandwidthMatches = result.output.matchAll(/Iteration \d+\/\d+: (\d+\.\d+) GB\/s/g);
      const bandwidths = Array.from(bandwidthMatches).map(match => parseFloat(match[1]));

      // Verify all bandwidths are in range
      bandwidths.forEach(bw => {
        expect(bw).toBeGreaterThanOrEqual(280);
        expect(bw).toBeLessThanOrEqual(300);
      });
    });

    it('should calculate correct statistics', () => {
      const parsed = parse('nccl-test --burn-in --iterations 10');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);

      // Extract statistics
      const avgMatch = result.output.match(/Average Bandwidth: (\d+\.\d+) GB\/s/);
      const minMatch = result.output.match(/Min Bandwidth: (\d+\.\d+) GB\/s/);
      const maxMatch = result.output.match(/Max Bandwidth: (\d+\.\d+) GB\/s/);

      expect(avgMatch).toBeTruthy();
      expect(minMatch).toBeTruthy();
      expect(maxMatch).toBeTruthy();

      if (avgMatch && minMatch && maxMatch) {
        const avg = parseFloat(avgMatch[1]);
        const min = parseFloat(minMatch[1]);
        const max = parseFloat(maxMatch[1]);

        // Min should be less than or equal to average
        expect(min).toBeLessThanOrEqual(avg);
        // Max should be greater than or equal to average
        expect(max).toBeGreaterThanOrEqual(avg);
        // All should be in expected range
        expect(min).toBeGreaterThanOrEqual(280);
        expect(max).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('HPL Tests', () => {
    it('should run HPL benchmark', () => {
      const parsed = parse('hpl');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('HPL - High-Performance Linpack Benchmark');
      expect(result.output).toContain('Configuration:');
      expect(result.output).toContain('RESULTS');
    });
  });

  describe('GPU Burn Tests', () => {
    it('should run GPU burn test', () => {
      const parsed = parse('gpu-burn 60');
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('GPU Burn - GPU Stress Test');
      expect(result.output).toContain('Testing');
    });
  });
});
