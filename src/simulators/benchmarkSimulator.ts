/**
 * Benchmark Simulator
 *
 * Simulates performance benchmarking tools:
 * - HPL (High-Performance Linpack) - CPU/GPU compute performance
 * - NCCL Tests - GPU collective communication performance
 * - GPU-Burn - GPU stress testing and thermal validation
 */

import { BaseSimulator } from "./BaseSimulator";
import type { CommandContext, CommandResult } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import type { GPU, DGXNode } from "@/types/hardware";
import { getHardwareSpecs } from "@/data/hardwareSpecs";
import type { SystemType } from "@/data/hardwareSpecs";
import {
  getClockRatio,
  getPowerCapRatio,
  getNvlinkHealthRatio,
} from "@/simulation/clusterPhysicsEngine";

const ncclBaselineBandwidthGBs: Record<SystemType, number> = {
  "DGX-A100": 240,
  "DGX-H100": 380,
  "DGX-H200": 380,
  "DGX-B200": 760,
  "DGX-GB200": 760,
  "DGX-VR200": 1520,
};

export class BenchmarkSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();

    this.registerCommand("hpl", this.handleHPL.bind(this), {
      name: "hpl",
      description: "High-Performance Linpack benchmark for measuring FLOPS",
      usage: "hpl [--burn-in] [--iterations N] [--nodes N] [--gpus-per-node N]",
      flags: [
        {
          long: "nodes",
          description: "Number of nodes to use (default: 1)",
          takesValue: true,
        },
        {
          long: "gpus-per-node",
          description: "GPUs per node (default: 8)",
          takesValue: true,
        },
        {
          long: "problem-size",
          description: "Problem size N (default: auto)",
          takesValue: true,
        },
        {
          long: "N",
          description: "Problem size N (alias for --problem-size)",
          takesValue: true,
        },
        {
          long: "burn-in",
          description: "Run extended burn-in test",
          takesValue: false,
        },
        {
          long: "burnin",
          description: "Run extended burn-in test (alias)",
          takesValue: false,
        },
        {
          long: "iterations",
          description: "Number of burn-in iterations (default: 100)",
          takesValue: true,
        },
      ],
      examples: [
        "hpl",
        "hpl --nodes 4 --gpus-per-node 8",
        "hpl --problem-size 100000",
        "hpl --burn-in --iterations 100",
        "hpl --burn-in --N 90000 --iterations 50",
      ],
    });

    this.registerCommand("nccl-test", this.handleNCCL.bind(this), {
      name: "nccl-test",
      description: "Run NCCL collective tests with burn-in support",
      usage: "nccl-test [--burn-in] [--iterations N] [operation] [options]",
      flags: [
        {
          short: "b",
          long: "minbytes",
          description: "Minimum message size (default: 8B)",
          takesValue: true,
        },
        {
          short: "e",
          long: "maxbytes",
          description: "Maximum message size (default: 128MB)",
          takesValue: true,
        },
        {
          short: "g",
          long: "ngpus",
          description: "Number of GPUs per node (default: 8)",
          takesValue: true,
        },
        {
          short: "n",
          long: "nodes",
          description: "Number of nodes (default: 1)",
          takesValue: true,
        },
        {
          short: "t",
          long: "operation",
          description:
            "Operation: all_reduce, all_gather, reduce_scatter, broadcast (default: all_reduce)",
          takesValue: true,
        },
        {
          long: "check",
          description: "Check results for correctness",
          takesValue: false,
        },
        {
          long: "burn-in",
          description: "Run extended burn-in test",
          takesValue: false,
        },
        {
          long: "burnin",
          description: "Run extended burn-in test (alias)",
          takesValue: false,
        },
        {
          long: "iterations",
          description: "Number of burn-in iterations (default: 1000)",
          takesValue: true,
        },
      ],
      examples: [
        "nccl-test -t all_reduce -b 8M -e 128M -g 8",
        "nccl-test -t all_reduce -g 8 -n 2",
        "nccl-test --burn-in --iterations 1000",
        "nccl-test -t all_gather -g 8 -n 4 -b 1G -e 8G",
      ],
    });

    this.registerCommand(
      "all_reduce_perf",
      this.handleAllReducePerf.bind(this),
      {
        name: "all_reduce_perf",
        description: "NCCL all-reduce performance benchmark",
        usage: "all_reduce_perf [-b minbytes] [-e maxbytes] [-g ngpus]",
        flags: [
          {
            short: "b",
            long: "minbytes",
            description: "Minimum message size (default: 8B)",
            takesValue: true,
          },
          {
            short: "e",
            long: "maxbytes",
            description: "Maximum message size (default: 128MB)",
            takesValue: true,
          },
          {
            short: "g",
            long: "ngpus",
            description: "Number of GPUs per node (default: 8)",
            takesValue: true,
          },
          {
            short: "f",
            long: "stepfactor",
            description: "Step factor for message sizes (default: 2)",
            takesValue: true,
          },
        ],
        examples: [
          "all_reduce_perf -b 8 -e 128M",
          "all_reduce_perf -b 8 -e 128M -g 8",
        ],
      },
    );

    this.registerCommand("mpirun", this.handleMpirun.bind(this), {
      name: "mpirun",
      description: "Launch parallel jobs across nodes via MPI",
      usage: "mpirun [-np N] [-H hostlist] <command> [args...]",
      flags: [
        {
          long: "np",
          description: "Number of processes (default: 1)",
          takesValue: true,
        },
        {
          short: "H",
          long: "host",
          description: "Comma-separated host list",
          takesValue: true,
        },
        {
          long: "bind-to",
          description: "Binding policy (none, core, socket)",
          takesValue: true,
        },
        {
          long: "map-by",
          description: "Mapping policy (slot, node, socket)",
          takesValue: true,
        },
      ],
      examples: [
        "mpirun -np 16 -H node1,node2 all_reduce_perf",
        "mpirun -np 8 ./hpl",
      ],
    });

    this.registerCommand("gpu-burn", this.handleGPUBurn.bind(this), {
      name: "gpu-burn",
      description: "GPU stress test for thermal and stability validation",
      usage: "gpu-burn [duration]",
      flags: [
        {
          short: "d",
          long: "duration",
          description: "Test duration in seconds (default: 60)",
          takesValue: true,
        },
        {
          short: "g",
          long: "gpu",
          description: "GPU index to test (default: all)",
          takesValue: true,
        },
      ],
      examples: ["gpu-burn 300", "gpu-burn -d 60 -g 0"],
    });

    this.registerCommand("nvbandwidth", this.handleNvbandwidth.bind(this), {
      name: "nvbandwidth",
      description: "NVIDIA GPU memory bandwidth measurement tool",
      usage: "nvbandwidth [--testcase <name>]",
      flags: [
        {
          long: "testcase",
          description:
            "Test case (host_to_device, device_to_host, device_to_device)",
          takesValue: true,
        },
      ],
      examples: ["nvbandwidth", "nvbandwidth --testcase device_to_device"],
    });

    this.registerCommand(
      "p2pBandwidthLatencyTest",
      this.handleP2pBandwidth.bind(this),
      {
        name: "p2pBandwidthLatencyTest",
        description: "CUDA P2P bandwidth and latency test between GPU pairs",
        usage: "p2pBandwidthLatencyTest",
        flags: [],
        examples: ["p2pBandwidthLatencyTest"],
      },
    );

    const ncclCollectives = [
      "reduce_perf",
      "broadcast_perf",
      "all_gather_perf",
      "reduce_scatter_perf",
      "sendrecv_perf",
      "scatter_perf",
      "gather_perf",
    ] as const;

    for (const name of ncclCollectives) {
      const operation = name.replace("_perf", "");
      this.registerCommand(
        name,
        (p: ParsedCommand, c: CommandContext) => {
          if (!p.flags.has("t") && !p.flags.has("operation")) {
            p.flags.set("t", operation);
          }
          return this.handleRegularTest(p, c);
        },
        {
          name,
          description: `NCCL ${operation} performance benchmark`,
          usage: `${name} [-b minbytes] [-e maxbytes] [-g ngpus]`,
          flags: [
            {
              short: "b",
              long: "minbytes",
              description: "Minimum message size",
              takesValue: true,
            },
            {
              short: "e",
              long: "maxbytes",
              description: "Maximum message size",
              takesValue: true,
            },
            {
              short: "g",
              long: "ngpus",
              description: "Number of GPUs per node",
              takesValue: true,
            },
          ],
          examples: [`${name} -b 8 -e 128M -g 8`],
        },
      );
    }
  }

  getMetadata() {
    return {
      name: "benchmark-tools",
      version: "1.0.0",
      description: "Performance benchmarking tools for GPU clusters",
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }
    if (
      this.hasAnyFlag(parsed, ["help", "h"]) &&
      !["nvbandwidth", "p2pBandwidthLatencyTest"].includes(parsed.baseCommand)
    ) {
      return this.handleHelp();
    }

    const handler = this.getCommand(parsed.baseCommand);
    if (!handler) {
      return this.createError(`Unknown benchmark: ${parsed.baseCommand}`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    return this.safeExecuteHandler(handler, parsed, context) as CommandResult;
  }

  private handleHPL(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const burnIn = this.hasAnyFlag(parsed, ["burn-in", "burnin"]);

    if (burnIn) {
      return this.handleHPLBurnIn(parsed, context);
    }

    // Regular HPL test
    const nodesStr = parsed.flags.get("nodes");
    const gpusPerNodeStr = parsed.flags.get("gpus-per-node");
    const problemSizeStr =
      parsed.flags.get("problem-size") || parsed.flags.get("N");

    // Validate problem size if provided
    if (problemSizeStr !== undefined) {
      const sizeValue =
        typeof problemSizeStr === "string"
          ? problemSizeStr
          : String(problemSizeStr);
      const validation = this.validatePositiveInt(sizeValue, "Problem size");
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value === 0) {
        return this.createError("Problem size must be positive");
      }
    }

    const nodes = parseInt(typeof nodesStr === "string" ? nodesStr : "1");
    const gpusPerNode = parseInt(
      typeof gpusPerNodeStr === "string" ? gpusPerNodeStr : "8",
    );
    const totalGPUs = nodes * gpusPerNode;
    const problemSize = parseInt(
      typeof problemSizeStr === "string"
        ? problemSizeStr
        : String(100000 * Math.sqrt(totalGPUs)),
    );

    // Simulate HPL execution
    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    // Calculate theoretical peak performance (TFLOPS) from hardware specs
    const hplSpecs = getHardwareSpecs(node.systemType || "DGX-A100");
    const tflopsPerGPU = hplSpecs.gpu.fp64Tflops;

    const theoreticalPeak = tflopsPerGPU * totalGPUs;

    // A cluster-wide job runs at the pace of its worst-performing GPU
    // (the pedagogically important "detect the sick node" behavior --
    // PHYS-6): take the minimum degradation ratio across every GPU
    // actually involved in the run, not an average.
    //
    // For a single-node run (the default), the involved node is the node
    // the user is actually ON (`node`, resolved from context.currentNode)
    // -- a positional slice of the cluster array always started at node
    // index 0 regardless of where the user was, so running hpl on a sick
    // dgx-03 reported dgx-00's healthy numbers. Multi-node runs keep the
    // documented first-N-nodes simplification.
    const involvedNodes =
      nodes === 1 ? [node] : this.resolveAllNodes(context).slice(0, nodes);
    const gpusInvolved = involvedNodes.flatMap((n) =>
      n.gpus.slice(0, gpusPerNode),
    );
    const computeRatio =
      gpusInvolved.length === 0
        ? 1
        : Math.min(
            ...gpusInvolved.map((gpu) =>
              Math.min(getClockRatio(gpu), getPowerCapRatio(gpu)),
            ),
          );

    // Efficiency: 85-92% is realistic for a well-tuned, healthy HPL run;
    // degraded hardware (throttled clocks, a capped power limit) scales
    // this down further, making the low-efficiency warning branch below
    // genuinely reachable instead of dead code.
    const efficiency = (0.85 + Math.random() * 0.07) * computeRatio;
    const achievedTFLOPS = theoreticalPeak * efficiency;

    // Execution time estimate (scales with problem size^3 and inversely with FLOPS)
    const operations = Math.pow(problemSize, 3) * (2 / 3); // FLOPS for LU factorization
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
  GPU model:       ${node.gpus[0]?.name || "Unknown"}
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

Status: ${efficiency > 0.8 ? "\x1b[32mPASSED\x1b[0m" : "\x1b[33mWARNING - Low efficiency\x1b[0m"}

${efficiency < 0.8 ? "\n\x1b[33mNote: Efficiency below 80% may indicate:\n  - Suboptimal configuration\n  - Hardware issues\n  - Thermal throttling\n  - Network bottlenecks\x1b[0m\n" : ""}
================================================================================
`;

    return this.createSuccess(output);
  }

  private handleHPLBurnIn(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const iterationsStr = parsed.flags.get("iterations");
    const iterations = parseInt(
      typeof iterationsStr === "string" ? iterationsStr : "100",
      10,
    );
    const problemSizeStr =
      parsed.flags.get("N") || parsed.flags.get("problem-size");
    const problemSize =
      typeof problemSizeStr === "string" ? problemSizeStr : "90000";

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    let output = `HPL Burn-in Test\n`;
    output += `================\n`;
    output += `Problem Size (N): ${problemSize}\n`;
    output += `Iterations: ${iterations}\n`;
    output += `Start time: ${new Date().toLocaleString()}\n\n`;

    output += `Running High-Performance Linpack burn-in...\n`;
    output += `Each iteration takes approximately 2-3 minutes\n\n`;

    // Simulate burn-in iterations
    // Same source of truth as the non-burn-in HPL path (handleHPL) and
    // the same degradation ratios -- previously this read a second,
    // independent, hand-maintained table that disagreed with
    // hardwareSpecs.gpu.fp64Tflops and never reflected live GPU state
    // (PHYS-13).
    const burnInSpecs = getHardwareSpecs(node.systemType || "DGX-A100");
    const computeRatio =
      node.gpus.length === 0
        ? 1
        : Math.min(
            ...node.gpus.map((gpu) =>
              Math.min(getClockRatio(gpu), getPowerCapRatio(gpu)),
            ),
          );
    const baseline = burnInSpecs.gpu.fp64Tflops * node.gpus.length;
    const tflopsValues: number[] = [];
    for (let i = 1; i <= Math.min(5, iterations); i++) {
      const gflops = baseline * (0.9 + Math.random() * 0.1) * computeRatio;
      tflopsValues.push(gflops);
      output += `Iteration ${i}/${iterations}: ${gflops.toFixed(2)} TFLOPS\n`;
    }

    if (iterations > 5) {
      output += `... (${iterations - 5} more iterations)\n`;
      // Generate additional TFLOPS values for statistics
      for (let i = 6; i <= iterations; i++) {
        tflopsValues.push(
          baseline * (0.9 + Math.random() * 0.1) * computeRatio,
        );
      }
    }

    // Calculate statistics
    const avgTFLOPS =
      tflopsValues.reduce((sum, tf) => sum + tf, 0) / tflopsValues.length;
    const minTFLOPS = Math.min(...tflopsValues);
    const maxTFLOPS = Math.max(...tflopsValues);

    // Calculate standard deviation
    const variance =
      tflopsValues.reduce((sum, tf) => sum + Math.pow(tf - avgTFLOPS, 2), 0) /
      tflopsValues.length;
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

  private handleNCCL(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const burnIn = this.hasAnyFlag(parsed, ["burn-in", "burnin"]);

    if (burnIn) {
      return this.handleBurnIn(parsed, context);
    }

    // Regular NCCL test logic
    return this.handleRegularTest(parsed, context);
  }

  private handleRegularTest(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const minBytesStr = parsed.flags.get("minbytes") || parsed.flags.get("b");
    const maxBytesStr = parsed.flags.get("maxbytes") || parsed.flags.get("e");
    const ngpusStr = parsed.flags.get("ngpus") || parsed.flags.get("g");
    const nodesStr = parsed.flags.get("nodes") || parsed.flags.get("n");
    const operationStr = parsed.flags.get("operation") || parsed.flags.get("t");

    // Validate GPU count
    if (ngpusStr !== undefined) {
      const ngpusValue =
        typeof ngpusStr === "string" ? ngpusStr : String(ngpusStr);
      const validation = this.validatePositiveInt(ngpusValue, "GPU count");
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value === 0) {
        return this.createError("GPU count must be at least 1");
      }
    }

    // Validate operation type
    const validOperations = [
      "all_reduce",
      "all_gather",
      "reduce_scatter",
      "broadcast",
      "reduce",
      "alltoall",
      "sendrecv",
      "scatter",
      "gather",
    ];
    if (operationStr !== undefined) {
      const opValue =
        typeof operationStr === "string" ? operationStr : String(operationStr);
      const validation = this.validateInSet(
        opValue,
        validOperations,
        "operation",
      );
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
    }

    const minBytes = this.parseSize(
      typeof minBytesStr === "string" ? minBytesStr : "8",
    );
    const maxBytes = this.parseSize(
      typeof maxBytesStr === "string" ? maxBytesStr : "134217728",
    ); // 128MB
    const ngpus = parseInt(typeof ngpusStr === "string" ? ngpusStr : "8");
    const numNodes = parseInt(typeof nodesStr === "string" ? nodesStr : "1");
    const operation =
      typeof operationStr === "string" ? operationStr : "all_reduce";

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    const allNodes = this.resolveAllNodes(context);
    const totalGPUs = ngpus * numNodes;
    const isMultiNode = numNodes > 1;
    // A single-rank "collective" has nothing to communicate: the ring
    // factor for all_reduce/all_gather/reduce_scatter is 0 when
    // totalGPUs === 1, and dividing by it printed literal "Infinity".
    // Real nccl-tests still prints a row per message size for a
    // degenerate 1-rank run -- just with 0.00 bandwidths.
    const singleRank = totalGPUs <= 1;

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
    output += `# minBytes ${minBytes} maxBytes ${maxBytes}\n`;
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
      const currentNode = allNodes[nodeIdx] || node;
      const hostname =
        currentNode.hostname ||
        `dgx-${nodeIdx.toString().padStart(2, "0")}.cluster.local`;

      for (
        let gpuIdx = 0;
        gpuIdx < Math.min(ngpus, currentNode.gpus.length);
        gpuIdx++
      ) {
        const gpuName =
          currentNode.gpus[gpuIdx]?.name || "NVIDIA H100 80GB HBM3";
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
    sizes.forEach((sizeBytes) => {
      // calculateNCCLBandwidthMultiNode already returns a real-world
      // ACHIEVED BUS-BANDWIDTH ceiling (ncclBaselineBandwidthGBs is a
      // documented busbw figure, not algbw) -- so busBW is that value
      // directly, and algbw is DERIVED by dividing out the collective's
      // ring factor (busbw = algbw * ringFactor is the real NCCL-tests
      // relationship). The old code multiplied the busbw-scale baseline
      // by the ring factor a SECOND time, inflating results ~1.75x for
      // all_reduce (PHYS-5).
      const busBW = singleRank
        ? 0
        : this.calculateNCCLBandwidthMultiNode(
            sizeBytes,
            node.gpus.slice(0, ngpus),
            numNodes,
            node.systemType,
          );
      const latency = this.calculateNCCLLatencyMultiNode(
        sizeBytes,
        ngpus,
        numNodes,
        node.systemType,
      );

      let ringFactor: number;
      switch (operation) {
        case "all_reduce":
          ringFactor = (2 * (totalGPUs - 1)) / totalGPUs;
          break;
        case "all_gather":
        case "reduce_scatter":
          ringFactor = (totalGPUs - 1) / totalGPUs;
          break;
        case "broadcast":
          ringFactor = 1;
          break;
        default:
          ringFactor = 2;
      }
      // Guard the singleRank case explicitly: busBW is already 0 there,
      // but ringFactor is also 0 for all_reduce, and 0/0 is NaN.
      const algBW = singleRank ? 0 : busBW / ringFactor;

      totalBusBW += busBW;

      const sizeStr = this.formatSize(sizeBytes).padStart(12);
      const countStr = Math.floor(sizeBytes / 4)
        .toString()
        .padStart(12); // Assuming float32
      const timeStr = latency.toFixed(1).padStart(8);
      const algbwStr = algBW.toFixed(2).padStart(7);
      const busbwStr = busBW.toFixed(2).padStart(7);

      output += `${sizeStr} ${countStr}   float     sum   ${timeStr} ${algbwStr} ${busbwStr}  0e+00   ${timeStr} ${algbwStr} ${busbwStr}  0e+00\n`;
    });

    const avgBusBW = totalBusBW / sizes.length;
    output += `# Out of bounds values : 0 OK\n`;
    output += `# Avg bus bandwidth    : ${avgBusBW.toFixed(2)}\n`;
    output += `#\n`;

    // Add performance summary for multi-node
    if (isMultiNode) {
      const bwSpecs = getHardwareSpecs(node.systemType || "DGX-A100");
      // totalBandwidthGBs is bidirectional; divide by 2 for unidirectional bus bandwidth
      const expectedIntraNode = Math.round(
        bwSpecs.nvlink.totalBandwidthGBs / 2,
      );
      const expectedInterNode =
        bwSpecs.network.interNodeBandwidthGBs * bwSpecs.network.hcaCount;

      output += `# Performance Summary\n`;
      output += `# -------------------\n`;
      output += `# Intra-node (NVLink): ~${expectedIntraNode} GB/s expected\n`;
      output += `# Inter-node (IB ${bwSpecs.network.protocol}): ~${expectedInterNode} GB/s expected (${bwSpecs.network.hcaCount}x ${bwSpecs.network.hcaModel})\n`;
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

  private handleBurnIn(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const iterationsStr = parsed.flags.get("iterations");
    const iterations = parseInt(
      typeof iterationsStr === "string" ? iterationsStr : "1000",
      10,
    );

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    let output = `NCCL Burn-in Test\n`;
    output += `================\n`;
    output += `Iterations: ${iterations}\n`;
    output += `Start time: ${new Date().toLocaleString()}\n\n`;

    // Simulate burn-in test with progress
    output += `Running NCCL AllReduce burn-in...\n`;

    // Real per-architecture busbw ceiling (same source Task 1/5's NCCL
    // handlers use), scaled by NVLink health -- previously a flat
    // 280-300 GB/s literal regardless of architecture (SIM-31).
    const sysType = (node.systemType || "DGX-A100") as SystemType;
    const baseline =
      ncclBaselineBandwidthGBs[sysType] ?? ncclBaselineBandwidthGBs["DGX-A100"];
    const nvlinkHealth = getNvlinkHealthRatio(node.gpus);

    const bandwidths: number[] = [];

    for (let i = 1; i <= Math.min(10, iterations); i++) {
      const bandwidth = baseline * (0.9 + Math.random() * 0.1) * nvlinkHealth;
      bandwidths.push(bandwidth);
      output += `Iteration ${i}/${iterations}: ${bandwidth.toFixed(2)} GB/s\n`;
    }

    if (iterations > 10) {
      output += `... (${iterations - 10} more iterations)\n`;
      // Generate additional bandwidth values for statistics
      for (let i = 11; i <= iterations; i++) {
        bandwidths.push(baseline * (0.9 + Math.random() * 0.1) * nvlinkHealth);
      }
    }

    // Calculate statistics
    const avgBandwidth =
      bandwidths.reduce((sum, bw) => sum + bw, 0) / bandwidths.length;
    const minBandwidth = Math.min(...bandwidths);
    const maxBandwidth = Math.max(...bandwidths);

    output += `\nBurn-in Status: PASSED\n`;
    output += `Average Bandwidth: ${avgBandwidth.toFixed(2)} GB/s\n`;
    output += `Min Bandwidth: ${minBandwidth.toFixed(2)} GB/s\n`;
    output += `Max Bandwidth: ${maxBandwidth.toFixed(2)} GB/s\n`;
    output += `Failures: 0\n`;

    return this.createSuccess(output);
  }

  private handleGPUBurn(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const durationStr =
      parsed.flags.get("duration") ||
      parsed.flags.get("d") ||
      parsed.positionalArgs[0];

    // Validate duration if provided
    if (durationStr !== undefined) {
      const durValue =
        typeof durationStr === "string" ? durationStr : String(durationStr);
      const validation = this.validatePositiveInt(durValue, "Duration");
      if (!validation.valid) {
        return this.createError(validation.error!);
      }
      if (validation.value! <= 0) {
        return this.createError(
          "Duration must be a positive number of seconds",
        );
      }
    }

    const duration = parseInt(
      typeof durationStr === "string" ? durationStr : "60",
    );
    const specificGPU = parsed.flags.get("gpu") || parsed.flags.get("g");

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    const gpusToTest =
      specificGPU !== undefined
        ? [
            node.gpus[
              parseInt(typeof specificGPU === "string" ? specificGPU : "0")
            ],
          ]
        : node.gpus;

    if (!gpusToTest[0]) {
      return this.createError(`GPU not found`);
    }

    // Simulate stress test - ramp up utilization and temperature
    const originalState = gpusToTest.map((gpu: GPU) => ({
      id: gpu.id,
      utilization: gpu.utilization,
      temperature: gpu.temperature,
      powerDraw: gpu.powerDraw,
    }));

    // Set to stress levels via StateMutator (routes to ScenarioContext when active)
    const mutator = this.resolveMutator(context);
    gpusToTest.forEach((gpu: GPU) => {
      mutator.updateGPU(node.id, gpu.id, {
        utilization: 100,
        temperature: Math.min(85, gpu.temperature + 30),
        powerDraw: gpu.powerLimit * 0.95,
      });
    });

    const hplSpecs = getHardwareSpecs(node.systemType || "DGX-A100");

    let output = `gpu-burn ${duration}\n`;
    output += `GPU 0: ${gpusToTest[0]?.name || "Unknown GPU"}\n`;

    // Simulate progress updates (real gpu-burn emits lines like these)
    const sampleCount = Math.min(5, Math.floor(duration / 10));
    const elapsedStep = Math.floor(duration / sampleCount);
    for (let sample = 0; sample < sampleCount; sample++) {
      const elapsed = (sample + 1) * elapsedStep;
      const pct = Math.round((elapsed / duration) * 100);
      const processed = Math.round((pct / 100) * 8192);
      gpusToTest.forEach((gpu: GPU, idx: number) => {
        const temp = Math.min(85, gpu.temperature + 10 + sample * 2);
        // A GPU already capped below its rated TDP can't sustain the
        // static theoretical Gflop/s figure -- previously this number
        // never reflected powerLimit at all (PHYS-15).
        const gpuFlops = hplSpecs.gpu.fp64Tflops * 1000 * getPowerCapRatio(gpu);
        const flops = gpuFlops * (0.97 + Math.random() * 0.02);
        output += `GPU ${idx}: ${pct}% proc'd: ${processed} (8192) - ${flops.toFixed(1)} Gflop/s - temp: ${temp.toFixed(0)}C [OK]\n`;
      });
    }

    // Final summary line
    const thermalIssues = gpusToTest.filter((gpu: GPU) => gpu.temperature > 83);
    output +=
      thermalIssues.length === 0
        ? `\x1b[32mOK\x1b[0m\n`
        : `\x1b[33mNote: ${thermalIssues.length} GPU(s) near thermal limit\x1b[0m\n`;

    // Reset GPUs to original state after test via StateMutator. Delay
    // matches the user-requested duration (converted to ms), not a fixed
    // 2 seconds -- previously a 300-second burn's simulated "GPU is under
    // load" state reverted after 2 real seconds regardless of what
    // duration was requested (PHYS-15).
    setTimeout(() => {
      const restoreMutator = this.resolveMutator(context);
      originalState.forEach((saved) => {
        restoreMutator.updateGPU(node.id, saved.id, {
          utilization: saved.utilization,
          temperature: saved.temperature,
          powerDraw: saved.powerDraw,
        });
      });
    }, duration * 1000);

    return this.createSuccess(output);
  }

  private handleAllReducePerf(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const minBytesStr = parsed.flags.get("minbytes") || parsed.flags.get("b");
    const maxBytesStr = parsed.flags.get("maxbytes") || parsed.flags.get("e");
    const ngpusStr = parsed.flags.get("ngpus") || parsed.flags.get("g");

    const minBytes = this.parseSize(
      typeof minBytesStr === "string" ? minBytesStr : "8",
    );
    const maxBytes = this.parseSize(
      typeof maxBytesStr === "string" ? maxBytesStr : "134217728",
    );
    const ngpus = parseInt(typeof ngpusStr === "string" ? ngpusStr : "8");

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    const gpuName = node.gpus[0]?.name || "NVIDIA A100-SXM4-80GB";

    let output = `# nThread 1 nGpus 1 minBytes ${minBytes} maxBytes ${maxBytes} step: 2(factor) warmup iters: 5 iters: 20 agg iters: 1 validation: 1 graph: 0\n`;
    output += `#\n`;
    output += `# Using devices\n`;

    for (let i = 0; i < Math.min(ngpus, node.gpus.length); i++) {
      const pci =
        node.gpus[i]?.pciAddress ||
        `0x${(7 + i * 3).toString(16).padStart(2, "0")}`;
      output += `#  Rank  ${i} Group  0 Pid  ${12345 + i} on ${node.hostname || node.id} device  ${i} [${pci.substring(pci.length - 4, pci.length - 2)}] ${gpuName}\n`;
    }

    output += `#\n`;
    output += `#                                                              out-of-place                       in-place\n`;
    output += `#       size         count      type   redop    root     time   algbw   busbw #wrong     time   algbw   busbw #wrong\n`;
    output += `#        (B)    (elements)                               (us)  (GB/s)  (GB/s)            (us)  (GB/s)  (GB/s)\n`;

    const sizes: number[] = [];
    let size = minBytes;
    while (size <= maxBytes) {
      sizes.push(size);
      size *= 2;
    }

    // Same degenerate-run guard as handleRegularTest: a 1-rank all_reduce
    // has ring factor 2*(1-1)/1 = 0, and dividing by it printed literal
    // "Infinity". Rows are still printed, just with 0.00 bandwidths.
    const singleRank = ngpus <= 1;

    let totalBusBW = 0;
    sizes.forEach((sizeBytes) => {
      // Same fix as handleRegularTest above: the baseline is already
      // busbw-scale, so busBW is the direct value and algbw is derived by
      // dividing out the ring factor (this handler is always all_reduce).
      const busBW = singleRank
        ? 0
        : this.calculateNCCLBandwidthMultiNode(
            sizeBytes,
            node.gpus.slice(0, ngpus),
            1,
            node.systemType,
          );
      const latency = this.calculateNCCLLatencyMultiNode(
        sizeBytes,
        ngpus,
        1,
        node.systemType,
      );
      const ringFactor = (2 * (ngpus - 1)) / ngpus;
      const algBW = singleRank ? 0 : busBW / ringFactor;
      totalBusBW += busBW;

      const sizeStr = sizeBytes.toString().padStart(12);
      const countStr = Math.floor(sizeBytes / 4)
        .toString()
        .padStart(12);
      const timeStr = latency.toFixed(2).padStart(9);
      const algbwStr = algBW.toFixed(2).padStart(7);
      const busbwStr = busBW.toFixed(2).padStart(7);

      output += `${sizeStr} ${countStr}     float     sum      -1  ${timeStr} ${algbwStr} ${busbwStr}      0  ${timeStr} ${algbwStr} ${busbwStr}      0\n`;
    });

    const avgBusBW = totalBusBW / sizes.length;
    output += `# Out of bounds values : 0 OK\n`;
    output += `# Avg bus bandwidth    : ${avgBusBW.toFixed(4)}\n`;

    return this.createSuccess(output);
  }

  private handleMpirun(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const npStr = parsed.flags.get("np");
    const hostStr = parsed.flags.get("H") || parsed.flags.get("host");
    const np = parseInt(typeof npStr === "string" ? npStr : "1");

    // Determine the underlying command from positional args
    const args = parsed.positionalArgs;
    if (args.length === 0) {
      return this.createError("mpirun: no executable specified");
    }

    const executable = args[0].replace("./", "");

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    // Build mpirun header
    let output = `--------------------------------------------------------------------------\n`;
    output += `mpirun: launching ${np} process(es)`;
    if (hostStr) {
      output += ` on hosts: ${typeof hostStr === "string" ? hostStr : "localhost"}`;
    }
    output += `\n--------------------------------------------------------------------------\n\n`;

    // Determine what the wrapped command should produce
    if (executable === "all_reduce_perf" || executable.includes("all_reduce")) {
      // Delegate to all_reduce_perf handler, passing remaining args
      const innerParsed = { ...parsed, baseCommand: "all_reduce_perf" };
      const innerResult = this.handleAllReducePerf(innerParsed, context);
      output += innerResult.output;
    } else if (executable === "hpl" || executable.includes("hpl")) {
      // Delegate to HPL handler
      const innerParsed = {
        ...parsed,
        baseCommand: "hpl",
        flags: new Map(parsed.flags),
      };
      // Set nodes based on np / gpus-per-node
      if (!innerParsed.flags.has("nodes")) {
        innerParsed.flags.set("nodes", "1");
      }
      if (!innerParsed.flags.has("gpus-per-node")) {
        innerParsed.flags.set("gpus-per-node", String(np));
      }
      const innerResult = this.handleHPL(innerParsed, context);
      output += innerResult.output;
    } else {
      // Generic wrapped command
      output += `Executing: ${args.join(" ")}\n`;
      output += `Process 0 completed successfully\n`;
      for (let i = 1; i < Math.min(np, 4); i++) {
        output += `Process ${i} completed successfully\n`;
      }
      if (np > 4) {
        output += `... (${np - 4} more processes completed)\n`;
      }
    }

    output += `\n--------------------------------------------------------------------------\n`;
    output += `mpirun: all ${np} process(es) completed successfully\n`;
    output += `--------------------------------------------------------------------------\n`;

    return this.createSuccess(output);
  }

  private handleNvbandwidth(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.createSuccess(
        "Usage: nvbandwidth [options]\n" +
          "Options:\n" +
          "  -h, --help           Print this help message\n" +
          "  --testcase <name>    Run specific testcase",
      );
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    if (!node.gpus || node.gpus.length === 0) {
      return this.createError("No GPUs found on this node");
    }

    const testcase =
      typeof parsed.flags.get("testcase") === "string"
        ? parsed.flags.get("testcase")
        : "device_to_device";

    const gpuName = node.gpus[0]?.name || "NVIDIA A100-SXM4-80GB";
    const bwSpecs = getHardwareSpecs(node.systemType || "DGX-A100");
    const hbmBwGBs = Math.round(bwSpecs.gpu.memoryBandwidthTBs * 1000);

    const lines = [
      `nvbandwidth Version: 0.4`,
      `Built from revision: v0.4`,
      ``,
      `NOTE: This tool reports PEAK bandwidth, not sustained.`,
      ``,
      `Running ${testcase}...`,
      ``,
      `Device ${gpuName}:`,
      `  memcpy CE GPU${testcase === "device_to_host" ? "->Host" : testcase === "host_to_device" ? "Host->GPU" : "->GPU"}:`,
      `    Bandwidth (GB/s): ${(hbmBwGBs * 0.92).toFixed(2)}`,
      ``,
      `Summary:`,
      `  Peak bandwidth: ${(hbmBwGBs * 0.92).toFixed(2)} GB/s`,
      `  HBM theoretical: ${hbmBwGBs} GB/s`,
      `  Efficiency: ${(0.92 * 100).toFixed(1)}%`,
    ];

    return this.createSuccess(lines.join("\n"));
  }

  private handleP2pBandwidth(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.createSuccess(
        "Usage: p2pBandwidthLatencyTest [options]\n" +
          "Options:\n" +
          "  -h, --help           Print this help message",
      );
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("No node selected");
    }

    if (!node.gpus || node.gpus.length === 0) {
      return this.createError("No GPUs found on this node");
    }

    const gpuCount = Math.min(node.gpus.length, 8);
    const gpuName = node.gpus[0]?.name || "NVIDIA A100-SXM4-80GB";
    const bwSpecs = getHardwareSpecs(node.systemType || "DGX-A100");

    // Calibrated against DGX-A100's real p2pBandwidthLatencyTest figures
    // (diagonal 1555.2 GB/s self-bandwidth, off-diagonal 252.3 GB/s P2P)
    // so A100's output is unchanged; generalized to other architectures
    // via their own HBM/NVLink specs (PHYS-12 -- previously these two
    // constants were printed identically for every architecture).
    const P2P_SELF_BW_EFFICIENCY = 1555.2 / (2.039 * 1000); // vs A100's 2039 GB/s HBM peak
    const P2P_PEER_BW_EFFICIENCY = 252.3 / (600 / 2); // vs A100's 300 GB/s per-direction NVLink aggregate
    const selfBW =
      bwSpecs.gpu.memoryBandwidthTBs * 1000 * P2P_SELF_BW_EFFICIENCY;
    const peerBWBase =
      (bwSpecs.nvlink.totalBandwidthGBs / 2) * P2P_PEER_BW_EFFICIENCY;

    const lines = [
      `[P2P (Peer-to-Peer) GPU Bandwidth Latency Test]`,
      ``,
      `Device count: ${gpuCount}`,
      ``,
    ];

    for (let i = 0; i < gpuCount; i++) {
      lines.push(`Device ${i}: ${gpuName}`);
    }

    lines.push(``);
    lines.push(`Unidirectional P2P=Enabled Bandwidth (GB/s)`);

    const header =
      `   D\\D` +
      Array.from({ length: gpuCount }, (_, i) => `     ${i}`).join("");
    lines.push(header);

    for (let i = 0; i < gpuCount; i++) {
      let row = `     ${i}`;
      for (let j = 0; j < gpuCount; j++) {
        let bw: number;
        if (i === j) {
          bw = selfBW;
        } else {
          const pairHealth = getNvlinkHealthRatio([node.gpus[i], node.gpus[j]]);
          bw = (peerBWBase + (i + j) * 0.5) * pairHealth;
        }
        row += `  ${bw.toFixed(1).padStart(5)}`;
      }
      lines.push(row);
    }

    lines.push(``);
    lines.push(`P2P=Enabled Latency (us)`);

    const latHeader =
      `   D\\D` +
      Array.from({ length: gpuCount }, (_, i) => `     ${i}`).join("");
    lines.push(latHeader);

    for (let i = 0; i < gpuCount; i++) {
      let row = `     ${i}`;
      for (let j = 0; j < gpuCount; j++) {
        const lat = i === j ? 1.02 : 2.15 + (Math.abs(i - j) - 1) * 0.1;
        row += `  ${lat.toFixed(2).padStart(5)}`;
      }
      lines.push(row);
    }

    return this.createSuccess(lines.join("\n"));
  }

  private getNode(context: CommandContext): DGXNode | undefined {
    return this.resolveNode(context) || this.resolveAllNodes(context)[0];
  }

  private calculateNCCLBandwidthMultiNode(
    sizeBytes: number,
    gpusInvolved: GPU[],
    numNodes: number,
    systemType: string,
  ): number {
    const bwSpecs = getHardwareSpecs(systemType || "DGX-A100");
    const sysType = (systemType || "DGX-A100") as SystemType;

    // Inter-node bandwidth (InfiniBand)
    const interNodeBW =
      bwSpecs.network.interNodeBandwidthGBs * bwSpecs.network.hcaCount;

    // Message size efficiency
    const sizeMB = sizeBytes / (1024 * 1024);
    let efficiency = 1.0;

    if (sizeMB < 1) {
      efficiency = 0.2 + sizeMB * 0.6;
    } else if (sizeMB < 8) {
      efficiency = 0.6 + ((sizeMB - 1) / 7) * 0.25;
    } else {
      efficiency = 0.85 + ((Math.min(sizeMB, 128) - 8) / 120) * 0.1;
    }

    // For multi-node, bottleneck is inter-node bandwidth -- already
    // correctly ceiling-bound by real per-arch NIC specs (PHYS-6:
    // multi-node NIC ceiling, verified and regression-locked, not
    // changed here).
    if (numNodes > 1) {
      const effectiveBW = interNodeBW * efficiency * 0.85;
      return effectiveBW;
    }

    // Single node: intra-node NVLink bandwidth, scaled down when any of
    // the GPUs actually running this collective have a Down NVLink
    // connection (PHYS-6).
    const intraNodeBW =
      ncclBaselineBandwidthGBs[sysType] ?? ncclBaselineBandwidthGBs["DGX-A100"];
    const nvlinkHealth = getNvlinkHealthRatio(gpusInvolved);
    return intraNodeBW * efficiency * 0.9 * nvlinkHealth;
  }

  private calculateNCCLLatencyMultiNode(
    sizeBytes: number,
    gpusPerNode: number,
    numNodes: number,
    systemType?: string,
  ): number {
    // Base latency
    const intraNodeLatency = 2; // us (NVLink)
    const interNodeLatency = 5; // us (InfiniBand)

    const sysType = (systemType || "DGX-A100") as SystemType;
    const intraNodeBW =
      ncclBaselineBandwidthGBs[sysType] ?? ncclBaselineBandwidthGBs["DGX-A100"];
    const bwSpecs = getHardwareSpecs(sysType);
    const interNodeBW =
      bwSpecs.network.interNodeBandwidthGBs * bwSpecs.network.hcaCount;
    const bandwidth = numNodes > 1 ? interNodeBW : intraNodeBW;
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
    const unit = (match[2] || "B").toUpperCase();

    const multipliers: Record<string, number> = {
      B: 1,
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
    };

    return Math.floor(value * multipliers[unit]);
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(0)}M`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}G`;
  }
}
