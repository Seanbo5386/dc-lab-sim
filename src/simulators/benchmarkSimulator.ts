/**
 * Benchmark Simulator
 *
 * Simulates performance benchmarking tools:
 * - HPL (High-Performance Linpack) - CPU/GPU compute performance
 * - NCCL Tests - GPU collective communication performance
 * - GPU-Burn - GPU stress testing and thermal validation
 */

import { BaseSimulator } from './BaseSimulator';
import type { CommandContext, CommandResult } from '@/types/commands';
import type { ParsedCommand } from '@/utils/commandParser';
import { useSimulationStore } from '@/store/simulationStore';

export class BenchmarkSimulator extends BaseSimulator {
  constructor() {
    super();

    this.registerCommand('hpl', this.handleHPL.bind(this), {
      name: 'hpl',
      description: 'High-Performance Linpack benchmark for measuring FLOPS',
      usage: 'hpl [--nodes N] [--gpus-per-node N]',
      flags: [
        { long: 'nodes', description: 'Number of nodes to use (default: 1)', takesValue: true },
        { long: 'gpus-per-node', description: 'GPUs per node (default: 8)', takesValue: true },
        { long: 'problem-size', description: 'Problem size N (default: auto)', takesValue: true },
      ],
      examples: [
        'hpl',
        'hpl --nodes 4 --gpus-per-node 8',
        'hpl --problem-size 100000',
      ],
    });

    this.registerCommand('nccl-test', this.handleNCCL.bind(this), {
      name: 'nccl-test',
      description: 'NCCL communication benchmark (all-reduce, broadcast, etc.)',
      usage: 'nccl-test [operation] [options]',
      flags: [
        { short: 'b', long: 'minbytes', description: 'Minimum message size (default: 8B)', takesValue: true },
        { short: 'e', long: 'maxbytes', description: 'Maximum message size (default: 128MB)', takesValue: true },
        { short: 'g', long: 'ngpus', description: 'Number of GPUs (default: 8)', takesValue: true },
        { long: 'operation', description: 'Operation: all_reduce, broadcast, reduce_scatter (default: all_reduce)', takesValue: true },
      ],
      examples: [
        'nccl-test --operation all_reduce -b 8M -e 128M -g 8',
        'nccl-test --operation broadcast -g 4',
      ],
    });

    this.registerCommand('gpu-burn', this.handleGPUBurn.bind(this), {
      name: 'gpu-burn',
      description: 'GPU stress test for thermal and stability validation',
      usage: 'gpu-burn [duration]',
      flags: [
        { short: 'd', long: 'duration', description: 'Test duration in seconds (default: 60)', takesValue: true },
        { short: 'g', long: 'gpu', description: 'GPU index to test (default: all)', takesValue: true },
      ],
      examples: [
        'gpu-burn 300',
        'gpu-burn -d 60 -g 0',
      ],
    });
  }

  getMetadata() {
    return {
      name: 'benchmark-tools',
      version: '1.0.0',
      description: 'Performance benchmarking tools for GPU clusters',
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.handleVersion();
    }
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      return this.handleHelp();
    }

    const handler = this.getCommand(parsed.baseCommand);
    if (!handler) {
      return this.createError(`Unknown benchmark: ${parsed.baseCommand}`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    const result = handler(parsed, context);
    return result as CommandResult;
  }

  private handleHPL(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const nodesStr = parsed.flags.get('nodes');
    const gpusPerNodeStr = parsed.flags.get('gpus-per-node');
    const problemSizeStr = parsed.flags.get('problem-size');

    const nodes = parseInt(typeof nodesStr === 'string' ? nodesStr : '1');
    const gpusPerNode = parseInt(typeof gpusPerNodeStr === 'string' ? gpusPerNodeStr : '8');
    const totalGPUs = nodes * gpusPerNode;
    const problemSize = parseInt(typeof problemSizeStr === 'string' ? problemSizeStr : String(100000 * Math.sqrt(totalGPUs)));

    // Simulate HPL execution
    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    // Calculate theoretical peak performance (TFLOPS)
    // H100 SXM: ~60 TFLOPS FP64, ~990 TFLOPS FP16 Tensor
    // A100 SXM: ~19.5 TFLOPS FP64, ~312 TFLOPS FP16 Tensor
    let tflopsPerGPU = 60; // H100 FP64
    if (node.systemType.includes('A100')) {
      tflopsPerGPU = 19.5;
    }

    const theoreticalPeak = tflopsPerGPU * totalGPUs;

    // Efficiency: 85-92% is realistic for well-tuned HPL
    const efficiency = 0.85 + Math.random() * 0.07;
    const achievedTFLOPS = theoreticalPeak * efficiency;

    // Execution time estimate (scales with problem size^3 and inversely with FLOPS)
    const operations = Math.pow(problemSize, 3) * (2/3); // FLOPS for LU factorization
    const timeSeconds = operations / (achievedTFLOPS * 1e12);

    const output = `
================================================================================
HPL - High-Performance Linpack Benchmark
================================================================================

Configuration:
  Nodes:           ${nodes}
  GPUs per node:   ${gpusPerNode}
  Total GPUs:      ${totalGPUs}
  Problem size N:  ${problemSize}

System:
  Node type:       ${node.systemType}
  GPU model:       ${node.gpus[0]?.name || 'Unknown'}
  Driver version:  ${node.nvidiaDriverVersion}
  CUDA version:    ${node.cudaVersion}

================================================================================
Running HPL benchmark...
================================================================================

Matrix size: ${problemSize} x ${problemSize}
Block size: 256
Process grid: ${Math.floor(Math.sqrt(nodes))} x ${Math.ceil(nodes / Math.floor(Math.sqrt(nodes)))}

Progress: [####################] 100%

================================================================================
RESULTS
================================================================================

Theoretical Peak:    ${theoreticalPeak.toFixed(2)} TFLOPS
Achieved:            ${achievedTFLOPS.toFixed(2)} TFLOPS
Efficiency:          ${(efficiency * 100).toFixed(2)}%

Time:                ${timeSeconds.toFixed(2)} seconds
Gflops:              ${(achievedTFLOPS * 1000).toFixed(2)}

Status: ${efficiency > 0.80 ? '\x1b[32mPASSED\x1b[0m' : '\x1b[33mWARNING - Low efficiency\x1b[0m'}

${efficiency < 0.80 ? '\n\x1b[33mNote: Efficiency below 80% may indicate:\n  - Suboptimal configuration\n  - Hardware issues\n  - Thermal throttling\n  - Network bottlenecks\x1b[0m\n' : ''}
================================================================================
`;

    return this.createSuccess(output);
  }

  private handleNCCL(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const minBytesStr = parsed.flags.get('minbytes') || parsed.flags.get('b');
    const maxBytesStr = parsed.flags.get('maxbytes') || parsed.flags.get('e');
    const ngpusStr = parsed.flags.get('ngpus') || parsed.flags.get('g');
    const operationStr = parsed.flags.get('operation');

    const minBytes = this.parseSize(typeof minBytesStr === 'string' ? minBytesStr : '8');
    const maxBytes = this.parseSize(typeof maxBytesStr === 'string' ? maxBytesStr : '134217728'); // 128MB
    const ngpus = parseInt(typeof ngpusStr === 'string' ? ngpusStr : '8');
    const operation = typeof operationStr === 'string' ? operationStr : 'all_reduce';

    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    // Generate test results for different message sizes
    const sizes: number[] = [];
    let size = minBytes;
    while (size <= maxBytes) {
      sizes.push(size);
      size *= 2;
    }

    let output = `
# nccl-tests: ${operation}
#
# Using devices
`;

    for (let i = 0; i < Math.min(ngpus, node.gpus.length); i++) {
      output += `#  Rank ${i.toString().padStart(2)}: GPU ${i} - ${node.gpus[i].name}\n`;
    }

    output += `#
#                                                       out-of-place                       in-place
#       size         count    type   redop     time   algbw   busbw  error     time   algbw   busbw  error
#        (B)    (elements)                     (us)  (GB/s)  (GB/s)            (us)  (GB/s)  (GB/s)
`;

    sizes.forEach(sizeBytes => {
      const bandwidth = this.calculateNCCLBandwidth(sizeBytes, ngpus, node.systemType);
      const latency = this.calculateNCCLLatency(sizeBytes, ngpus);
      const busBW = bandwidth * 2; // For all-reduce, bus bandwidth is 2x algorithm bandwidth

      const sizeStr = this.formatSize(sizeBytes).padStart(12);
      const countStr = Math.floor(sizeBytes / 4).toString().padStart(12); // Assuming float32
      const timeStr = latency.toFixed(1).padStart(8);
      const algbwStr = bandwidth.toFixed(2).padStart(7);
      const busbwStr = busBW.toFixed(2).padStart(7);

      output += `${sizeStr} ${countStr}   float     sum   ${timeStr} ${algbwStr} ${busbwStr}  0e+00   ${timeStr} ${algbwStr} ${busbwStr}  0e+00\n`;
    });

    output += `# Out of bounds values : 0 OK\n# Avg bus bandwidth    : ${(this.calculateNCCLBandwidth(maxBytes, ngpus, node.systemType) * 2).toFixed(2)}\n#\n`;

    return this.createSuccess(output);
  }

  private handleGPUBurn(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const durationStr = parsed.flags.get('duration') || parsed.flags.get('d') || parsed.positionalArgs[0];
    const duration = parseInt(typeof durationStr === 'string' ? durationStr : '60');
    const specificGPU = parsed.flags.get('gpu') || parsed.flags.get('g');

    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    const gpusToTest = specificGPU !== undefined
      ? [node.gpus[parseInt(typeof specificGPU === 'string' ? specificGPU : '0')]]
      : node.gpus;

    if (!gpusToTest[0]) {
      return this.createError(`GPU not found`);
    }

    // Simulate stress test - ramp up utilization and temperature
    const originalState = gpusToTest.map((gpu: any) => ({
      utilization: gpu.utilization,
      temperature: gpu.temperature,
      powerDraw: gpu.powerDraw,
    }));

    // Set to stress levels
    gpusToTest.forEach((gpu: any) => {
      gpu.utilization = 100;
      gpu.temperature = Math.min(85, gpu.temperature + 30);
      gpu.powerDraw = gpu.powerLimit * 0.95; // Near power limit
    });

    let output = `
GPU Burn - GPU Stress Test
==========================

Testing ${gpusToTest.length} GPU(s) for ${duration} seconds

`;

    gpusToTest.forEach((gpu: any, idx: number) => {
      output += `GPU ${idx}: ${gpu.name}\n`;
      output += `  Temperature: ${gpu.temperature.toFixed(1)}°C\n`;
      output += `  Power: ${gpu.powerDraw.toFixed(0)}W / ${gpu.powerLimit}W\n`;
      output += `  Utilization: ${gpu.utilization}%\n`;
    });

    output += `\nStress test running... (Ctrl+C to stop)\n\n`;

    // Show progress
    const interval = Math.floor(duration / 10);
    for (let i = 1; i <= 10; i++) {
      const elapsed = i * interval;
      const percent = (elapsed / duration * 100).toFixed(0);
      output += `[${elapsed}s] ${'█'.repeat(i)}${'░'.repeat(10 - i)} ${percent}%\n`;
    }

    // Check for thermal issues
    const thermalIssues = gpusToTest.filter((gpu: any) => gpu.temperature > 83);
    const status = thermalIssues.length === 0 ? '\x1b[32mPASSED\x1b[0m' : '\x1b[33mWARNING\x1b[0m';

    output += `\n==========================\n`;
    output += `Test Duration: ${duration}s\n`;
    output += `Status: ${status}\n\n`;

    if (thermalIssues.length > 0) {
      output += `\x1b[33mThermal throttling detected on ${thermalIssues.length} GPU(s)\x1b[0m\n`;
      output += `Check cooling and GPU placement.\n\n`;
    }

    gpusToTest.forEach((gpu: any, idx: number) => {
      const avgTemp = (gpu.temperature + originalState[idx].temperature) / 2;
      output += `GPU ${idx} Results:\n`;
      output += `  Avg Temperature: ${avgTemp.toFixed(1)}°C\n`;
      output += `  Peak Power: ${gpu.powerDraw.toFixed(0)}W\n`;
      output += `  Passed: ${gpu.temperature < 85 ? '\x1b[32mYES\x1b[0m' : '\x1b[31mNO\x1b[0m'}\n\n`;
    });

    // Reset GPUs to original state after test
    setTimeout(() => {
      gpusToTest.forEach((gpu: any, idx: number) => {
        gpu.utilization = originalState[idx].utilization;
        gpu.temperature = originalState[idx].temperature;
        gpu.powerDraw = originalState[idx].powerDraw;
      });
    }, 2000);

    return this.createSuccess(output);
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n: any) => n.id === context.currentNode) || state.cluster.nodes[0];
  }

  private calculateNCCLBandwidth(sizeBytes: number, _gpuCount: number, systemType: string): number {
    // Base bandwidth depends on interconnect
    // H100 with NVSwitch: ~450 GB/s per GPU
    // A100 with NVSwitch: ~300 GB/s per GPU
    const baseBW = systemType.includes('H100') ? 450 : 300;

    // Message size efficiency (small messages have lower bandwidth)
    const sizeMB = sizeBytes / (1024 * 1024);
    let efficiency = 1.0;

    if (sizeMB < 1) {
      efficiency = 0.3 + (sizeMB * 0.7); // 30-100% efficiency
    } else if (sizeMB < 8) {
      efficiency = 0.7 + ((sizeMB - 1) / 7 * 0.2); // 70-90% efficiency
    } else {
      efficiency = 0.90 + (Math.min(sizeMB, 128) - 8) / 120 * 0.08; // 90-98% efficiency
    }

    // Algorithm bandwidth (per GPU perspective)
    return baseBW * efficiency * 0.8; // 80% of theoretical for all-reduce
  }

  private calculateNCCLLatency(sizeBytes: number, _gpuCount: number): number {
    const baseLatency = 5; // microseconds for small messages
    const transferTime = (sizeBytes / (300 * 1e9)) * 1e6; // us (assuming 300 GB/s)
    return baseLatency + transferTime;
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(B|K|M|G)?$/i);
    if (!match) return parseInt(sizeStr) || 8;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers: Record<string, number> = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
    };

    return Math.floor(value * multipliers[unit]);
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}M`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}G`;
  }
}
