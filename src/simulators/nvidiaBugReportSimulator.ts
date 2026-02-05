import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import type { DGXNode, GPU } from "@/types/hardware";

/**
 * NVIDIA Bug Report Simulator
 *
 * Simulates nvidia-bug-report.sh - NVIDIA's official diagnostic collection script.
 * Generates comprehensive system reports including GPU info, driver status,
 * NVLink state, XID errors, and system logs.
 *
 * Critical for NCP-AII certification: Understanding diagnostic report generation
 * and interpretation is essential for troubleshooting.
 */
export class NvidiaBugReportSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "nvidia-bug-report.sh",
      version: "535.104.05",
      description: "NVIDIA System Diagnostic Report Generator",
      commands: [
        {
          name: "nvidia-bug-report.sh",
          description: "Generate comprehensive NVIDIA diagnostic report",
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle help
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.showHelp();
    }

    // Handle version
    if (this.hasAnyFlag(parsed, ["version"])) {
      return this.createSuccess("nvidia-bug-report.sh version 535.104.05");
    }

    // Get output file from flags
    const outputFile = this.getFlagString(
      parsed,
      ["output-file", "o"],
      "/tmp/nvidia-bug-report.log.gz",
    );
    const verbose = this.hasAnyFlag(parsed, ["verbose", "v"]);
    const noCompress = this.hasAnyFlag(parsed, ["no-compress"]);
    const extra = this.hasAnyFlag(parsed, ["extra-system-data"]);

    return this.generateReport(context, outputFile, verbose, noCompress, extra);
  }

  private showHelp(): CommandResult {
    let output = `nvidia-bug-report.sh - NVIDIA Bug Report Generator\n\n`;
    output += `Usage: nvidia-bug-report.sh [OPTIONS]\n\n`;
    output += `Description:\n`;
    output += `  Collects system information for NVIDIA support. Creates a compressed\n`;
    output += `  log file containing GPU state, driver info, and system diagnostics.\n\n`;
    output += `Options:\n`;
    output += `  -h, --help              Show this help message\n`;
    output += `  --version               Show version information\n`;
    output += `  -o, --output-file FILE  Specify output file (default: /tmp/nvidia-bug-report.log.gz)\n`;
    output += `  -v, --verbose           Enable verbose output\n`;
    output += `  --no-compress           Don't compress the output file\n`;
    output += `  --extra-system-data     Collect additional system information\n`;
    output += `  --safe-mode             Skip commands that may hang\n`;
    output += `  --dmesg                 Include full dmesg output\n`;
    output += `  --journalctl            Include journalctl nvidia messages\n\n`;
    output += `Output:\n`;
    output += `  The report includes:\n`;
    output += `  - nvidia-smi output\n`;
    output += `  - GPU driver and CUDA versions\n`;
    output += `  - NVLink and NVSwitch status\n`;
    output += `  - XID error history\n`;
    output += `  - PCIe configuration\n`;
    output += `  - Kernel messages related to NVIDIA\n`;
    output += `  - System configuration\n\n`;
    output += `Examples:\n`;
    output += `  nvidia-bug-report.sh\n`;
    output += `  nvidia-bug-report.sh -o /home/user/gpu-report.log.gz\n`;
    output += `  nvidia-bug-report.sh --verbose --extra-system-data\n`;
    return this.createSuccess(output);
  }

  private getNode(context: CommandContext): DGXNode | undefined {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n) => n.id === context.currentNode);
  }

  private generateReport(
    context: CommandContext,
    outputFile: string,
    verbose: boolean,
    noCompress: boolean,
    extra: boolean,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const timestamp = new Date().toISOString();
    const actualFile = noCompress ? outputFile.replace(".gz", "") : outputFile;

    let output = `\x1b[1mNVIDIA Bug Report Generator\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;
    output += `nvidia-bug-report.sh will now collect information about your\n`;
    output += `system and create the file '${actualFile}'.\n\n`;

    // Collecting sections
    const sections = [
      "nvidia-smi",
      "GPU driver version",
      "CUDA version",
      "NVLink status",
      "NVSwitch status",
      "PCIe configuration",
      "ECC memory status",
      "XID error history",
      "Thermal information",
      "Power information",
      "dmesg nvidia messages",
      "System information",
    ];

    if (extra) {
      sections.push(
        "lspci verbose",
        "dmidecode",
        "kernel modules",
        "boot parameters",
      );
    }

    output += `Collecting:\n`;
    sections.forEach((section, idx) => {
      if (verbose) {
        output += `  [${idx + 1}/${sections.length}] ${section}...\n`;
      } else {
        output += `  - ${section}\n`;
      }
    });
    output += `\n`;

    // Generate summary of findings
    output += `${"─".repeat(60)}\n`;
    output += `\x1b[1mReport Summary\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;

    // System info
    output += `\x1b[1mSystem Information:\x1b[0m\n`;
    output += `  Hostname:          ${node.hostname}\n`;
    output += `  System Type:       ${node.systemType}\n`;
    output += `  Date:              ${timestamp}\n`;
    output += `  Kernel:            5.15.0-91-generic\n`;
    output += `  Architecture:      x86_64\n\n`;

    // Driver info
    output += `\x1b[1mDriver Information:\x1b[0m\n`;
    output += `  Driver Version:    535.104.05\n`;
    output += `  CUDA Version:      12.2\n`;
    output += `  NVML Version:      12.535.104.05\n\n`;

    // GPU summary
    output += `\x1b[1mGPU Summary:\x1b[0m\n`;
    output += `  Total GPUs:        ${node.gpus.length}\n`;
    const healthyGpus = node.gpus.filter(
      (g: GPU) => g.healthStatus === "OK",
    ).length;
    const warningGpus = node.gpus.filter(
      (g: GPU) => g.healthStatus === "Warning",
    ).length;
    const errorGpus = node.gpus.filter(
      (g: GPU) => g.healthStatus === "Critical",
    ).length;
    output += `  Healthy:           ${healthyGpus}\n`;
    if (warningGpus > 0)
      output += `  \x1b[33mWarning:           ${warningGpus}\x1b[0m\n`;
    if (errorGpus > 0)
      output += `  \x1b[31mError:             ${errorGpus}\x1b[0m\n`;
    output += `\n`;

    // GPU details
    output += `\x1b[1mGPU Details:\x1b[0m\n`;
    node.gpus.forEach((gpu: GPU, idx: number) => {
      const statusColor =
        gpu.healthStatus === "OK"
          ? "\x1b[32m"
          : gpu.healthStatus === "Warning"
            ? "\x1b[33m"
            : "\x1b[31m";
      output += `  GPU ${idx}: ${gpu.name}\n`;
      output += `    UUID:            ${gpu.uuid}\n`;
      output += `    PCI Bus:         ${gpu.pciAddress}\n`;
      output += `    Status:          ${statusColor}${gpu.healthStatus}\x1b[0m\n`;
      output += `    Temperature:     ${Math.round(gpu.temperature)}°C\n`;
      output += `    Power:           ${Math.round(gpu.powerDraw)}W / ${gpu.powerLimit}W\n`;
      output += `    Memory:          ${Math.round(gpu.memoryUsed / 1024)}GB / ${Math.round(gpu.memoryTotal / 1024)}GB\n`;
    });
    output += `\n`;

    // NVLink status
    output += `\x1b[1mNVLink Summary:\x1b[0m\n`;
    const totalNvlinks = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.nvlinks.length,
      0,
    );
    const activeNvlinks = node.gpus.reduce(
      (sum: number, g: GPU) =>
        sum + g.nvlinks.filter((l) => l.status === "Active").length,
      0,
    );
    output += `  Total Links:       ${totalNvlinks}\n`;
    output += `  Active:            ${activeNvlinks}\n`;
    output += `  Inactive:          ${totalNvlinks - activeNvlinks}\n`;
    if (totalNvlinks > activeNvlinks) {
      output += `  \x1b[33mWarning: Some NVLinks are inactive\x1b[0m\n`;
    }
    output += `\n`;

    // ECC Status
    output += `\x1b[1mECC Memory Status:\x1b[0m\n`;
    const totalSingleBit = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.eccErrors.singleBit,
      0,
    );
    const totalDoubleBit = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.eccErrors.doubleBit,
      0,
    );
    output += `  Single-Bit Errors: ${totalSingleBit}\n`;
    output += `  Double-Bit Errors: ${totalDoubleBit}\n`;
    if (totalDoubleBit > 0) {
      output += `  \x1b[31mCritical: Uncorrectable ECC errors detected!\x1b[0m\n`;
    }
    output += `\n`;

    // XID Errors
    output += `\x1b[1mXID Error History:\x1b[0m\n`;
    const allXidErrors = node.gpus.flatMap((gpu: GPU, idx: number) =>
      gpu.xidErrors.map((xid) => ({ ...xid, gpuId: idx })),
    );

    if (allXidErrors.length === 0) {
      output += `  No XID errors recorded.\n`;
    } else {
      output += `  Total XID Errors:  ${allXidErrors.length}\n\n`;
      // Group by XID code
      const xidCounts: Record<number, number> = {};
      allXidErrors.forEach((xid) => {
        xidCounts[xid.code] = (xidCounts[xid.code] || 0) + 1;
      });

      output += `  XID Code | Count | Severity    | Description\n`;
      output += `  ${"─".repeat(55)}\n`;
      Object.entries(xidCounts).forEach(([code, count]) => {
        const xidInfo = this.getXidInfo(parseInt(code));
        const severityColor =
          xidInfo.severity === "critical"
            ? "\x1b[31m"
            : xidInfo.severity === "warning"
              ? "\x1b[33m"
              : "\x1b[0m";
        output += `     ${code.padStart(3)}    |   ${count.toString().padStart(2)}  | ${severityColor}${xidInfo.severity.padEnd(11)}\x1b[0m | ${xidInfo.description}\n`;
      });
    }
    output += `\n`;

    // Recommendations
    output += `\x1b[1mRecommendations:\x1b[0m\n`;
    const recommendations = this.generateRecommendations(node);
    if (recommendations.length === 0) {
      output += `  \x1b[32mNo issues detected. System appears healthy.\x1b[0m\n`;
    } else {
      recommendations.forEach((rec, idx) => {
        output += `  ${idx + 1}. ${rec}\n`;
      });
    }
    output += `\n`;

    // File output
    output += `${"─".repeat(60)}\n`;
    if (noCompress) {
      output += `Report saved to: ${actualFile}\n`;
      output += `File size: ${Math.floor(Math.random() * 5 + 2)}MB\n`;
    } else {
      output += `Report saved to: ${actualFile}\n`;
      output += `Compressed size: ${Math.floor(Math.random() * 500 + 200)}KB\n`;
    }
    output += `\n\x1b[32mnvidia-bug-report.sh completed successfully.\x1b[0m\n`;
    output += `\nPlease include this report when contacting NVIDIA support.\n`;

    return this.createSuccess(output);
  }

  private getXidInfo(code: number): { severity: string; description: string } {
    const xidDatabase: Record<
      number,
      { severity: string; description: string }
    > = {
      13: { severity: "warning", description: "Graphics Engine Exception" },
      31: { severity: "critical", description: "GPU memory page fault" },
      32: {
        severity: "warning",
        description: "Invalid or corrupted push buffer",
      },
      38: { severity: "warning", description: "Driver firmware error" },
      43: { severity: "critical", description: "GPU stopped processing" },
      45: { severity: "warning", description: "Preemptive cleanup" },
      48: { severity: "critical", description: "Double Bit ECC Error" },
      56: { severity: "warning", description: "Display engine error" },
      61: {
        severity: "warning",
        description: "Internal micro-controller breakpoint",
      },
      62: {
        severity: "warning",
        description: "Internal micro-controller halt",
      },
      63: {
        severity: "warning",
        description: "ECC page retirement / Row remapping",
      },
      64: {
        severity: "warning",
        description: "ECC page retirement / Row remapping",
      },
      68: { severity: "warning", description: "Video processor exception" },
      69: { severity: "warning", description: "Graphics engine class error" },
      72: {
        severity: "critical",
        description: "NVLink error - Link training failed",
      },
      73: { severity: "warning", description: "NVLink FLA access error" },
      74: { severity: "critical", description: "NVLink error - Link failed" },
      76: { severity: "critical", description: "NVSwitch fatal error" },
      77: { severity: "critical", description: "NVLink data CRC error" },
      78: {
        severity: "critical",
        description: "NVLink flow control CRC error",
      },
      79: { severity: "critical", description: "GPU has fallen off the bus" },
      92: {
        severity: "critical",
        description: "High single-bit ECC error rate",
      },
      94: { severity: "critical", description: "Contained ECC error" },
      95: { severity: "critical", description: "Uncontained ECC error" },
      119: { severity: "critical", description: "GSP RPC timeout" },
      120: { severity: "critical", description: "GSP error" },
    };

    return (
      xidDatabase[code] || { severity: "info", description: "Unknown error" }
    );
  }

  private generateRecommendations(node: DGXNode): string[] {
    const recommendations: string[] = [];

    // Check for critical XID errors
    const criticalXids = node.gpus
      .flatMap((g: GPU) => g.xidErrors)
      .filter((xid) =>
        [31, 43, 48, 72, 74, 76, 77, 78, 79, 92, 94, 95, 119, 120].includes(
          xid.code,
        ),
      );
    if (criticalXids.length > 0) {
      recommendations.push(
        "Critical XID errors detected. Review error history and consider GPU RMA if persistent.",
      );
    }

    // Check for ECC errors
    const hasDoubleBitEcc = node.gpus.some(
      (g: GPU) => g.eccErrors.doubleBit > 0,
    );
    if (hasDoubleBitEcc) {
      recommendations.push(
        "Uncorrectable ECC errors detected. Schedule maintenance or replacement.",
      );
    }

    // Check for inactive NVLinks
    const inactiveNvlinks = node.gpus.some((g: GPU) =>
      g.nvlinks.some((l) => l.status !== "Active"),
    );
    if (inactiveNvlinks) {
      recommendations.push(
        "Inactive NVLinks detected. Check fabric manager status and NVSwitch health.",
      );
    }

    // Check for high temperatures
    const highTempGpus = node.gpus.filter((g: GPU) => g.temperature > 80);
    if (highTempGpus.length > 0) {
      recommendations.push(
        `GPU(s) running hot (>80°C). Check cooling system and airflow.`,
      );
    }

    // Check for power issues
    const powerIssues = node.gpus.filter(
      (g: GPU) => g.powerDraw > g.powerLimit * 0.95,
    );
    if (powerIssues.length > 0) {
      recommendations.push(
        "GPU(s) near power limit. Consider power management adjustments.",
      );
    }

    // Check for unhealthy GPUs
    const unhealthyGpus = node.gpus.filter((g: GPU) => g.healthStatus !== "OK");
    if (unhealthyGpus.length > 0) {
      recommendations.push(
        `${unhealthyGpus.length} GPU(s) in non-OK state. Run dcgmi diag for detailed diagnostics.`,
      );
    }

    return recommendations;
  }
}
