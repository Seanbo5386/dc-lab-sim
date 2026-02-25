import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import type { GPU, DGXNode, XIDError } from "@/types/hardware";
import { getHardwareSpecs } from "@/data/hardwareSpecs";

// Extended node type for NVSwitch support (not in base DGXNode type)
interface ExtendedDGXNode extends DGXNode {
  nvswitches?: Array<{
    status?: string;
    firmwareVersion?: string;
    temperature?: number;
    activePorts?: number;
  }>;
}

/**
 * NvlinkAuditSimulator
 * Simulates the nvlink-audit diagnostic tool for NVLink fabric analysis
 *
 * Commands:
 * - nvlink-audit: Run NVLink diagnostics and audit
 *
 * Per spec Section 7: Cross-tool integration for diagnostics
 */
export class NvlinkAuditSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "nvlink-audit",
      version: "1.0.0",
      description: "NVLink fabric diagnostic and audit tool",
      commands: [
        {
          name: "nvlink-audit",
          description:
            "Run NVLink fabric diagnostics and generate audit report",
          usage: "nvlink-audit [OPTIONS]",
          examples: [
            "nvlink-audit",
            "nvlink-audit --verbose",
            "nvlink-audit -i 0",
            "nvlink-audit --check-all",
            "nvlink-audit --report json",
          ],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle --version flag
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.handleVersion();
    }

    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }

    return this.handleNvlinkAudit(parsed, context);
  }

  /**
   * Handle nvlink-audit command
   * Comprehensive NVLink fabric diagnostics
   */
  private handleNvlinkAudit(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.resolveNode(context) || this.resolveAllNodes(context)[0];

    if (!node) {
      return this.createError("Error: No node found");
    }

    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);
    const checkAll = this.hasAnyFlag(parsed, ["check-all"]);
    const gpuId = this.getFlagString(parsed, ["i", "id"]);
    const reportFormat = this.getFlagString(parsed, ["report", "r"]);

    // Filter GPUs if specific ID requested
    let gpusToAudit = node.gpus;
    if (gpuId !== "") {
      const id = parseInt(gpuId, 10);
      gpusToAudit = node.gpus.filter((g) => g.id === id);
      if (gpusToAudit.length === 0) {
        return this.createError(`Error: GPU ${gpuId} not found`);
      }
    }

    let output = "";
    let hasErrors = false;
    let hasWarnings = false;

    // Header
    output +=
      "================================================================================\n";
    output += "                        NVLink Fabric Audit Report\n";
    output += `                        Host: ${node.hostname}\n`;
    output += `                        Date: ${new Date().toISOString()}\n`;
    output +=
      "================================================================================\n\n";

    // System Overview
    const specs = getHardwareSpecs(node.systemType || "DGX-A100");
    const sxmVersion = specs.gpu.sxmVersion;
    output += "=== System Overview ===\n";
    output += `Total GPUs: ${node.gpus.length}\n`;
    output += `NVSwitches: ${(node as ExtendedDGXNode).nvswitches?.length || specs.nvlink.nvSwitchCount}\n`;
    output += `Architecture: ${node.systemType || "DGX-A100"} (${sxmVersion})\n`;
    output += `NVLink Version: ${specs.nvlink.version}\n`;
    output += `Links per GPU: ${specs.nvlink.linksPerGpu}\n\n`;

    // Per-GPU NVLink Status
    output += "=== NVLink Status Per GPU ===\n";
    output += "-".repeat(78) + "\n";

    gpusToAudit.forEach((gpu) => {
      const gpuStatus = this.getGpuNvlinkStatus(gpu);
      hasErrors = hasErrors || gpuStatus.hasErrors;
      hasWarnings = hasWarnings || gpuStatus.hasWarnings;

      output += `\nGPU ${gpu.id}: ${gpu.name}\n`;
      output += `  PCI Address: ${gpu.pciAddress || `0000:${(0x39 + gpu.id).toString(16)}:00.0`}\n`;
      output += `  NVLink Status: ${gpuStatus.overallStatus}\n`;

      if (verbose || checkAll) {
        output += "\n  Link Details:\n";
        for (let link = 0; link < specs.nvlink.linksPerGpu; link++) {
          const linkState = gpuStatus.links[link];
          const statusIcon = linkState.active
            ? "\x1b[32m✓\x1b[0m"
            : "\x1b[31m✗\x1b[0m";
          const peerInfo =
            linkState.peer !== null ? `GPU ${linkState.peer}` : "NVSwitch";

          output += `    Link ${link.toString().padStart(2)}: ${statusIcon} `;
          output += `State: ${linkState.state.padEnd(8)} `;
          output += `Peer: ${peerInfo.padEnd(10)} `;
          output += `Speed: ${linkState.speed} `;

          if (linkState.errors > 0) {
            output += `\x1b[31mErrors: ${linkState.errors}\x1b[0m`;
          }
          output += "\n";
        }
      }

      // Link Summary
      output += `  Active Links: ${gpuStatus.activeLinks}/${specs.nvlink.linksPerGpu}\n`;
      output += `  Total Errors: ${gpuStatus.totalErrors}\n`;

      if (gpuStatus.totalErrors > 0) {
        output += `  \x1b[31m⚠ NVLink errors detected - check link integrity\x1b[0m\n`;
      }
    });

    output += "\n" + "-".repeat(78) + "\n";

    // NVSwitch Status
    const extNode = node as ExtendedDGXNode;
    if (extNode.nvswitches && extNode.nvswitches.length > 0) {
      output += "\n=== NVSwitch Status ===\n";
      extNode.nvswitches.forEach((nvswitch, idx: number) => {
        const status = nvswitch.status || "Healthy";
        const statusColor = status === "Healthy" ? "\x1b[32m" : "\x1b[31m";
        output += `NVSwitch ${idx}: ${statusColor}${status}\x1b[0m\n`;
        if (verbose) {
          output += `  Firmware: ${nvswitch.firmwareVersion || "2.3.0"}\n`;
          output += `  Temperature: ${nvswitch.temperature || 45}°C\n`;
          output += `  Ports Active: ${nvswitch.activePorts || 36}/36\n`;
        }
      });
    }

    // Topology Verification
    output += "\n=== Topology Verification ===\n";
    const topoCheck = this.verifyTopology(node);
    output += `Full mesh connectivity: ${topoCheck.fullMesh ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}\n`;
    output += `NVSwitch routing: ${topoCheck.switchRouting ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}\n`;
    output += `Bandwidth symmetry: ${topoCheck.bandwidthSymmetry ? "\x1b[32mPASS\x1b[0m" : "\x1b[33mWARN\x1b[0m"}\n`;

    if (!topoCheck.fullMesh) {
      hasErrors = true;
      output += `\n\x1b[31m⚠ Topology issue detected: Not all GPU pairs have NVLink connectivity\x1b[0m\n`;
      if (topoCheck.missingLinks.length > 0) {
        output += `  Missing paths: ${topoCheck.missingLinks.join(", ")}\n`;
      }
    }

    // Bandwidth Test (if checkAll)
    if (checkAll) {
      output += "\n=== Bandwidth Test ===\n";
      output += "Testing peer-to-peer bandwidth...\n\n";
      output += "  GPU Pair     Bandwidth (GB/s)    Status\n";
      output += "  " + "-".repeat(45) + "\n";

      for (let i = 0; i < Math.min(gpusToAudit.length, 4); i++) {
        for (let j = i + 1; j < Math.min(gpusToAudit.length, 4); j++) {
          const bw = 200 + Math.random() * 50; // Simulated bandwidth
          const expected = 200;
          const statusIcon =
            bw >= expected * 0.9
              ? "\x1b[32mPASS\x1b[0m"
              : "\x1b[33mWARN\x1b[0m";
          output += `  GPU${i} <-> GPU${j}     ${bw.toFixed(1).padStart(6)}              ${statusIcon}\n`;
        }
      }
    }

    // Summary
    output += "\n" + "=".repeat(78) + "\n";
    output += "=== Audit Summary ===\n";

    if (hasErrors) {
      output += "\x1b[31mStatus: ERRORS DETECTED\x1b[0m\n";
      output +=
        "Action Required: Investigate NVLink errors and consider GPU reset or reseat\n";
    } else if (hasWarnings) {
      output += "\x1b[33mStatus: WARNINGS\x1b[0m\n";
      output +=
        "Recommendation: Monitor for degradation, consider preventive maintenance\n";
    } else {
      output += "\x1b[32mStatus: HEALTHY\x1b[0m\n";
      output += "All NVLink connections are operating normally\n";
    }

    output += "\n" + "=".repeat(78) + "\n";

    // JSON output format
    if (reportFormat === "json") {
      const jsonReport = {
        host: node.hostname,
        timestamp: new Date().toISOString(),
        totalGpus: node.gpus.length,
        nvswitches: (node as ExtendedDGXNode).nvswitches?.length || 0,
        status: hasErrors ? "ERROR" : hasWarnings ? "WARNING" : "HEALTHY",
        gpus: gpusToAudit.map((gpu) => ({
          id: gpu.id,
          name: gpu.name,
          nvlinkStatus: this.getGpuNvlinkStatus(gpu),
        })),
      };
      return this.createSuccess(JSON.stringify(jsonReport, null, 2));
    }

    return this.createSuccess(output);
  }

  /**
   * Get NVLink status for a specific GPU
   */
  private getGpuNvlinkStatus(gpu: GPU & { nvlinkActive?: boolean }): {
    overallStatus: string;
    activeLinks: number;
    totalErrors: number;
    hasErrors: boolean;
    hasWarnings: boolean;
    links: Array<{
      active: boolean;
      state: string;
      peer: number | null;
      speed: string;
      errors: number;
    }>;
  } {
    const links = [];
    let activeLinks = 0;
    let totalErrors = 0;

    // Check if GPU has NVLink errors from fault injection
    const hasNvlinkFault =
      gpu.nvlinkActive === false ||
      (gpu.xidErrors && gpu.xidErrors.some((e: XIDError) => e.code === 74));

    for (let i = 0; i < 12; i++) {
      // Simulate link status - some links go to other GPUs, some to NVSwitches
      const linkActive = hasNvlinkFault ? i < 8 : true; // Fault affects some links
      const linkErrors =
        hasNvlinkFault && i >= 8 ? Math.floor(Math.random() * 100) : 0;

      links.push({
        active: linkActive,
        state: linkActive ? "Active" : "Inactive",
        peer: i < 4 ? (gpu.id + i + 1) % 8 : null, // First 4 links to other GPUs
        speed: linkActive ? "50 GB/s" : "N/A",
        errors: linkErrors,
      });

      if (linkActive) activeLinks++;
      totalErrors += linkErrors;
    }

    let overallStatus = "\x1b[32mHealthy\x1b[0m";
    let hasErrors = false;
    let hasWarnings = false;

    if (totalErrors > 0) {
      overallStatus = "\x1b[31mErrors Detected\x1b[0m";
      hasErrors = true;
    } else if (activeLinks < 12) {
      overallStatus = "\x1b[33mDegraded\x1b[0m";
      hasWarnings = true;
    }

    return {
      overallStatus,
      activeLinks,
      totalErrors,
      hasErrors,
      hasWarnings,
      links,
    };
  }

  /**
   * Verify topology connectivity
   */
  private verifyTopology(node: DGXNode): {
    fullMesh: boolean;
    switchRouting: boolean;
    bandwidthSymmetry: boolean;
    missingLinks: string[];
  } {
    const missingLinks: string[] = [];

    // Check if any GPU has NVLink issues
    type ExtendedGPU = GPU & { nvlinkActive?: boolean };
    const hasNvlinkFaults = node.gpus.some((gpu) => {
      const extGpu = gpu as ExtendedGPU;
      return (
        extGpu.nvlinkActive === false ||
        (gpu.xidErrors && gpu.xidErrors.some((e: XIDError) => e.code === 74))
      );
    });

    if (hasNvlinkFaults) {
      // Find which links are affected
      node.gpus.forEach((gpu) => {
        const extGpu = gpu as ExtendedGPU;
        if (extGpu.nvlinkActive === false) {
          missingLinks.push(`GPU${gpu.id} isolated`);
        }
      });
    }

    return {
      fullMesh: !hasNvlinkFaults,
      switchRouting: !hasNvlinkFaults,
      bandwidthSymmetry: true, // Assume symmetric unless proven otherwise
      missingLinks,
    };
  }
}
