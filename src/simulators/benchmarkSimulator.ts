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
import type { GPU, DGXNode } from '@/types/hardware';

export class BenchmarkSimulator extends BaseSimulator {
  constructor() {
    super();

    this.registerCommand('hpl', this.handleHPL.bind(this), {
      name: 'hpl',
      description: 'High-Performance Linpack benchmark for measuring FLOPS',
      usage: 'hpl [--burn-in] [--iterations N] [--nodes N] [--gpus-per-node N]',
      flags: [
        { long: 'nodes', description: 'Number of nodes to use (default: 1)', takesValue: true },
        { long: 'gpus-per-node', description: 'GPUs per node (default: 8)', takesValue: true },
        { long: 'problem-size', description: 'Problem size N (default: auto)', takesValue: true },
        { long: 'N', description: 'Problem size N (alias for --problem-size)', takesValue: true },
        { long: 'burn-in', description: 'Run extended burn-in test', takesValue: false },
        { long: 'burnin', description: 'Run extended burn-in test (alias)', takesValue: false },
        { long: 'iterations', description: 'Number of burn-in iterations (default: 100)', takesValue: true },
      ],
      examples: [
        'hpl',
        'hpl --nodes 4 --gpus-per-node 8',
        'hpl --problem-size 100000',
        'hpl --burn-in --iterations 100',
        'hpl --burn-in --N 90000 --iterations 50',
      ],
    });

    this.registerCommand('nccl-test', this.handleNCCL.bind(this), {
      name: 'nccl-test',
      description: 'Run NCCL collective tests with burn-in support',
      usage: 'nccl-test [--burn-in] [--iterations N] [operation] [options]',
      flags: [
        { short: 'b', long: 'minbytes', description: 'Minimum message size (default: 8B)', takesValue: true },
        { short: 'e', long: 'maxbytes', description: 'Maximum message size (default: 128MB)', takesValue: true },
        { short: 'g', long: 'ngpus', description: 'Number of GPUs per node (default: 8)', takesValue: true },
        { short: 'n', long: 'nodes', description: 'Number of nodes (default: 1)', takesValue: true },
        { short: 't', long: 'operation', description: 'Operation: all_reduce, all_gather, reduce_scatter, broadcast (default: all_reduce)', takesValue: true },
        { long: 'check', description: 'Check results for correctness', takesValue: false },
        { long: 'burn-in', description: 'Run extended burn-in test', takesValue: false },
        { long: 'burnin', description: 'Run extended burn-in test (alias)', takesValue: false },
        { long: 'iterations', description: 'Number of burn-in iterations (default: 1000)', takesValue: true },
      ],
      examples: [
        'nccl-test -t all_reduce -b 8M -e 128M -g 8',
        'nccl-test -t all_reduce -g 8 -n 2',
        'nccl-test --burn-in --iterations 1000',
        'nccl-test -t all_gather -g 8 -n 4 -b 1G -e 8G',
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
    const burnIn = this.hasAnyFlag(parsed, ['burn-in', 'burnin']);

    if (burnIn) {
      return this.handleHPLBurnIn(parsed, context);
    }

    // Regular HPL test
    const nodesStr = parsed.flags.get('nodes');
    const gpusPerNodeStr = parsed.flags.get('gpus-per-node');
    const problemSizeStr = parsed.flags.get('problem-size') || parsed.flags.get('N');

    // Validate problem size if provided
    if (problemSizeStr !== undefined) {
      const sizeValue = typeof problemSizeStr === 'string' ? problemSizeStr : String(problemSizeStr);
      const validation = this.validatePositiveInt(sizeValue, 'Problem size');
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value === 0) {
        return this.createError('Problem size must be positive');
      }
    }

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

  private handleHPLBurnIn(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const iterationsStr = parsed.flags.get('iterations');
    const iterations = parseInt(typeof iterationsStr === 'string' ? iterationsStr : '100', 10);
    const problemSizeStr = parsed.flags.get('N') || parsed.flags.get('problem-size');
    const problemSize = typeof problemSizeStr === 'string' ? problemSizeStr : '90000';

    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    let output = `HPL Burn-in Test\n`;
    output += `================\n`;
    output += `Problem Size (N): ${problemSize}\n`;
    output += `Iterations: ${iterations}\n`;
    output += `Start time: ${new Date().toLocaleString()}\n\n`;

    output += `Running High-Performance Linpack burn-in...\n`;
    output += `Each iteration takes approximately 2-3 minutes\n\n`;

    // Simulate burn-in iterations
    const tflopsValues: number[] = [];
    for (let i = 1; i <= Math.min(5, iterations); i++) {
      const gflops = 450 + Math.random() * 50; // 450-500 TFLOPS
      tflopsValues.push(gflops);
      output += `Iteration ${i}/${iterations}: ${gflops.toFixed(2)} TFLOPS\n`;
    }

    if (iterations > 5) {
      output += `... (${iterations - 5} more iterations)\n`;
      // Generate additional TFLOPS values for statistics
      for (let i = 6; i <= iterations; i++) {
        tflopsValues.push(450 + Math.random() * 50);
      }
    }

    // Calculate statistics
    const avgTFLOPS = tflopsValues.reduce((sum, tf) => sum + tf, 0) / tflopsValues.length;
    const minTFLOPS = Math.min(...tflopsValues);
    const maxTFLOPS = Math.max(...tflopsValues);

    // Calculate standard deviation
    const variance = tflopsValues.reduce((sum, tf) => sum + Math.pow(tf - avgTFLOPS, 2), 0) / tflopsValues.length;
    const stdDev = Math.sqrt(variance);

    output += `\nBurn-in Results:\n`;
    output += `  Status: PASSED\n`;
    output += `  Average Performance: ${avgTFLOPS.toFixed(1)} TFLOPS\n`;
    output += `  Min Performance: ${minTFLOPS.toFixed(1)} TFLOPS\n`;
    output += `  Max Performance: ${maxTFLOPS.toFixed(1)} TFLOPS\n`;
    output += `  Std Deviation: ${stdDev.toFixed(1)} TFLOPS\n`;
    output += `  Failures: 0\n`;

    return this.createSuccess(output);
  }

  private handleNCCL(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const burnIn = this.hasAnyFlag(parsed, ['burn-in', 'burnin']);

    if (burnIn) {
      return this.handleBurnIn(parsed, context);
    }

    // Regular NCCL test logic
    return this.handleRegularTest(parsed, context);
  }

  private handleRegularTest(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const minBytesStr = parsed.flags.get('minbytes') || parsed.flags.get('b');
    const maxBytesStr = parsed.flags.get('maxbytes') || parsed.flags.get('e');
    const ngpusStr = parsed.flags.get('ngpus') || parsed.flags.get('g');
    const nodesStr = parsed.flags.get('nodes') || parsed.flags.get('n');
    const operationStr = parsed.flags.get('operation') || parsed.flags.get('t');

    // Validate GPU count
    if (ngpusStr !== undefined) {
      const ngpusValue = typeof ngpusStr === 'string' ? ngpusStr : String(ngpusStr);
      const validation = this.validatePositiveInt(ngpusValue, 'GPU count');
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value === 0) {
        return this.createError('GPU count must be at least 1');
      }
    }

    // Validate operation type
    const validOperations = ['all_reduce', 'all_gather', 'reduce_scatter', 'broadcast', 'reduce', 'alltoall'];
    if (operationStr !== undefined) {
      const opValue = typeof operationStr === 'string' ? operationStr : String(operationStr);
      const validation = this.validateInSet(opValue, validOperations, 'operation');
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
    }

    const minBytes = this.parseSize(typeof minBytesStr === 'string' ? minBytesStr : '8');
    const maxBytes = this.parseSize(typeof maxBytesStr === 'string' ? maxBytesStr : '134217728'); // 128MB
    const ngpus = parseInt(typeof ngpusStr === 'string' ? ngpusStr : '8');
    const numNodes = parseInt(typeof nodesStr === 'string' ? nodesStr : '1');
    const operation = typeof operationStr === 'string' ? operationStr : 'all_reduce';

    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    const state = useSimulationStore.getState();
    const totalGPUs = ngpus * numNodes;
    const isMultiNode = numNodes > 1;

    // Generate test results for different message sizes
    const sizes: number[] = [];
    let size = minBytes;
    while (size <= maxBytes) {
      sizes.push(size);
      size *= 2;
    }

    let output = `# nccl-tests: ${operation}\n`;
    output += `#\n`;
    output += `# nNodes ${numNodes} nGpus ${ngpus} totalGpus ${totalGPUs}\n`;
    output += `#\n`;

    if (isMultiNode) {
      output += `# Using InfiniBand for inter-node communication\n`;
      output += `# GPUDirect RDMA: Enabled\n`;
      output += `#\n`;
    }

    output += `# Using devices\n`;

    // Show devices from multiple nodes if multi-node
    let rank = 0;
    for (let nodeIdx = 0; nodeIdx < numNodes; nodeIdx++) {
      const currentNode = state.cluster.nodes[nodeIdx] || node;
      const hostname = currentNode.hostname || `dgx-${nodeIdx.toString().padStart(2, '0')}.cluster.local`;

      for (let gpuIdx = 0; gpuIdx < Math.min(ngpus, currentNode.gpus.length); gpuIdx++) {
        const gpuName = currentNode.gpus[gpuIdx]?.name || 'NVIDIA H100 80GB HBM3';
        output += `#  Rank ${rank.toString().padStart(2)}: ${hostname}:${gpuIdx} - ${gpuName}\n`;
        rank++;
      }
    }

    output += `#\n`;

    if (isMultiNode) {
      output += `# NCCL version 2.19.3+cuda12.2\n`;
      output += `# NCCL_DEBUG=INFO\n`;
      output += `# NCCL_IB_DISABLE=0\n`;
      output += `# NCCL_NET_GDR_LEVEL=5\n`;
      output += `#\n`;
    }

    output += `#                                                       out-of-place                       in-place\n`;
    output += `#       size         count    type   redop     time   algbw   busbw  error     time   algbw   busbw  error\n`;
    output += `#        (B)    (elements)                     (us)  (GB/s)  (GB/s)            (us)  (GB/s)  (GB/s)\n`;

    let totalBusBW = 0;
    sizes.forEach(sizeBytes => {
      const bandwidth = this.calculateNCCLBandwidthMultiNode(sizeBytes, ngpus, numNodes, node.systemType);
      const latency = this.calculateNCCLLatencyMultiNode(sizeBytes, ngpus, numNodes);

      // Bus bandwidth depends on collective type
      let busBW: number;
      switch (operation) {
        case 'all_reduce':
          busBW = bandwidth * 2 * (totalGPUs - 1) / totalGPUs; // Ring all-reduce
          break;
        case 'all_gather':
          busBW = bandwidth * (totalGPUs - 1) / totalGPUs;
          break;
        case 'reduce_scatter':
          busBW = bandwidth * (totalGPUs - 1) / totalGPUs;
          break;
        case 'broadcast':
          busBW = bandwidth;
          break;
        default:
          busBW = bandwidth * 2;
      }

      totalBusBW += busBW;

      const sizeStr = this.formatSize(sizeBytes).padStart(12);
      const countStr = Math.floor(sizeBytes / 4).toString().padStart(12); // Assuming float32
      const timeStr = latency.toFixed(1).padStart(8);
      const algbwStr = bandwidth.toFixed(2).padStart(7);
      const busbwStr = busBW.toFixed(2).padStart(7);

      output += `${sizeStr} ${countStr}   float     sum   ${timeStr} ${algbwStr} ${busbwStr}  0e+00   ${timeStr} ${algbwStr} ${busbwStr}  0e+00\n`;
    });

    const avgBusBW = totalBusBW / sizes.length;
    output += `# Out of bounds values : 0 OK\n`;
    output += `# Avg bus bandwidth    : ${avgBusBW.toFixed(2)}\n`;
    output += `#\n`;

    // Add performance summary for multi-node
    if (isMultiNode) {
      const expectedIntraNode = node.systemType.includes('H100') ? 450 : 300;
      const expectedInterNode = 200; // HDR InfiniBand ~200 GB/s with 8 NICs

      output += `# Performance Summary\n`;
      output += `# -------------------\n`;
      output += `# Intra-node (NVLink): ~${expectedIntraNode} GB/s expected\n`;
      output += `# Inter-node (IB HDR): ~${expectedInterNode} GB/s expected (8x ConnectX-7)\n`;
      output += `# Achieved avg:        ${avgBusBW.toFixed(2)} GB/s\n`;
      output += `#\n`;

      if (avgBusBW < expectedInterNode * 0.7) {
        output += `# \x1b[33mWARNING: Bandwidth lower than expected. Check:\x1b[0m\n`;
        output += `#   - IB link errors (ibstat, perfquery)\n`;
        output += `#   - GPU-NIC affinity (nvidia-smi topo -m)\n`;
        output += `#   - NCCL_IB_DISABLE not set\n`;
        output += `#   - GPUDirect RDMA enabled\n`;
        output += `#\n`;
      }
    }

    return this.createSuccess(output);
  }

  private handleBurnIn(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const iterationsStr = parsed.flags.get('iterations');
    const iterations = parseInt(typeof iterationsStr === 'string' ? iterationsStr : '1000', 10);

    const node = this.getNode(context);
    if (!node) {
      return this.createError('No node selected');
    }

    let output = `NCCL Burn-in Test\n`;
    output += `================\n`;
    output += `Iterations: ${iterations}\n`;
    output += `Start time: ${new Date().toLocaleString()}\n\n`;

    // Simulate burn-in test with progress
    output += `Running NCCL AllReduce burn-in...\n`;

    // Calculate bandwidth statistics
    const bandwidths: number[] = [];

    for (let i = 1; i <= Math.min(10, iterations); i++) {
      const bandwidth = 280 + Math.random() * 20; // 280-300 GB/s
      bandwidths.push(bandwidth);
      output += `Iteration ${i}/${iterations}: ${bandwidth.toFixed(2)} GB/s\n`;
    }

    if (iterations > 10) {
      output += `... (${iterations - 10} more iterations)\n`;
      // Generate additional bandwidth values for statistics
      for (let i = 11; i <= iterations; i++) {
        bandwidths.push(280 + Math.random() * 20);
      }
    }

    // Calculate statistics
    const avgBandwidth = bandwidths.reduce((sum, bw) => sum + bw, 0) / bandwidths.length;
    const minBandwidth = Math.min(...bandwidths);
    const maxBandwidth = Math.max(...bandwidths);

    output += `\nBurn-in Status: PASSED\n`;
    output += `Average Bandwidth: ${avgBandwidth.toFixed(2)} GB/s\n`;
    output += `Min Bandwidth: ${minBandwidth.toFixed(2)} GB/s\n`;
    output += `Max Bandwidth: ${maxBandwidth.toFixed(2)} GB/s\n`;
    output += `Failures: 0\n`;

    return this.createSuccess(output);
  }

  private handleGPUBurn(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const durationStr = parsed.flags.get('duration') || parsed.flags.get('d') || parsed.positionalArgs[0];

    // Validate duration if provided
    if (durationStr !== undefined) {
      const durValue = typeof durationStr === 'string' ? durationStr : String(durationStr);
      const validation = this.validatePositiveInt(durValue, 'Duration');
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value! <= 0) {
        return this.createError('Duration must be a positive number of seconds');
      }
    }

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
    const originalState = gpusToTest.map((gpu: GPU) => ({
      utilization: gpu.utilization,
      temperature: gpu.temperature,
      powerDraw: gpu.powerDraw,
    }));

    // Set to stress levels
    gpusToTest.forEach((gpu: GPU) => {
      gpu.utilization = 100;
      gpu.temperature = Math.min(85, gpu.temperature + 30);
      gpu.powerDraw = gpu.powerLimit * 0.95; // Near power limit
    });

    let output = `
GPU Burn - GPU Stress Test
==========================

Testing ${gpusToTest.length} GPU(s) for ${duration} seconds

`;

    gpusToTest.forEach((gpu: GPU, idx: number) => {
      output += `GPU ${idx}: ${gpu.name}\n`;
      output += `  Temperature: ${Math.round(gpu.temperature)}°C\n`;
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
    const thermalIssues = gpusToTest.filter((gpu: GPU) => gpu.temperature > 83);
    const status = thermalIssues.length === 0 ? '\x1b[32mPASSED\x1b[0m' : '\x1b[33mWARNING\x1b[0m';

    output += `\n==========================\n`;
    output += `Test Duration: ${duration}s\n`;
    output += `Status: ${status}\n\n`;

    if (thermalIssues.length > 0) {
      output += `\x1b[33mThermal throttling detected on ${thermalIssues.length} GPU(s)\x1b[0m\n`;
      output += `Check cooling and GPU placement.\n\n`;
    }

    gpusToTest.forEach((gpu: GPU, idx: number) => {
      const avgTemp = (gpu.temperature + originalState[idx].temperature) / 2;
      output += `GPU ${idx} Results:\n`;
      output += `  Avg Temperature: ${avgTemp.toFixed(1)}°C\n`;
      output += `  Peak Power: ${gpu.powerDraw.toFixed(0)}W\n`;
      output += `  Passed: ${gpu.temperature < 85 ? '\x1b[32mYES\x1b[0m' : '\x1b[31mNO\x1b[0m'}\n\n`;
    });

    // Reset GPUs to original state after test
    setTimeout(() => {
      gpusToTest.forEach((gpu: GPU, idx: number) => {
        gpu.utilization = originalState[idx].utilization;
        gpu.temperature = originalState[idx].temperature;
        gpu.powerDraw = originalState[idx].powerDraw;
      });
    }, 2000);

    return this.createSuccess(output);
  }

  private getNode(context: CommandContext): DGXNode | undefined {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n: DGXNode) => n.id === context.currentNode) || state.cluster.nodes[0];
  }

  private calculateNCCLBandwidthMultiNode(sizeBytes: number, _gpusPerNode: number, numNodes: number, systemType: string): number {
    // Intra-node bandwidth (NVLink)
    const intraNodeBW = systemType.includes('H100') ? 450 : 300;

    // Inter-node bandwidth (InfiniBand)
    // HDR with 8 NICs: ~200 GB/s, NDR with 8 NICs: ~400 GB/s
    const interNodeBW = systemType.includes('H100') ? 200 : 150;

    // Message size efficiency
    const sizeMB = sizeBytes / (1024 * 1024);
    let efficiency = 1.0;

    if (sizeMB < 1) {
      efficiency = 0.2 + (sizeMB * 0.6);
    } else if (sizeMB < 8) {
      efficiency = 0.6 + ((sizeMB - 1) / 7 * 0.25);
    } else {
      efficiency = 0.85 + (Math.min(sizeMB, 128) - 8) / 120 * 0.1;
    }

    // For multi-node, bottleneck is inter-node bandwidth
    if (numNodes > 1) {
      // Ring algorithm bandwidth is limited by slowest link
      // With proper NIC-GPU affinity, we get full inter-node BW
      const effectiveBW = interNodeBW * efficiency * 0.85;
      return effectiveBW;
    }

    // Single node uses NVLink
    return intraNodeBW * efficiency * 0.8;
  }

  private calculateNCCLLatencyMultiNode(sizeBytes: number, gpusPerNode: number, numNodes: number): number {
    // Base latency
    const intraNodeLatency = 2; // us (NVLink)
    const interNodeLatency = 5; // us (InfiniBand)

    // Transfer time
    const bandwidth = numNodes > 1 ? 200 : 300; // GB/s
    const transferTime = (sizeBytes / (bandwidth * 1e9)) * 1e6; // us

    if (numNodes > 1) {
      // Multi-node latency includes inter-node hops
      const hops = Math.ceil(Math.log2(numNodes * gpusPerNode));
      return interNodeLatency * hops + transferTime;
    }

    // Single node
    const hops = Math.ceil(Math.log2(gpusPerNode));
    return intraNodeLatency * hops + transferTime;
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
