import { BaseSimulator } from "./BaseSimulator";
import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import type {
  ClusterKitAssessment,
  ClusterKitCheckResult,
} from "@/types/clusterKit";
import type {
  DGXNode,
  GPU,
  InfiniBandHCA,
  InfiniBandPort,
} from "@/types/hardware";

export class ClusterKitSimulator extends BaseSimulator {
  constructor() {
    super();

    this.registerCommand("assess", this.handleAssess.bind(this), {
      name: "assess",
      description: "Run full node assessment",
      usage: "clusterkit assess",
      examples: ["clusterkit assess"],
    });

    this.registerCommand("check", this.handleCheck.bind(this), {
      name: "check",
      description: "Run specific category check",
      usage: "clusterkit check <category>",
      examples: [
        "clusterkit check gpu",
        "clusterkit check network",
        "clusterkit check storage",
        "clusterkit check firmware",
        "clusterkit check drivers",
      ],
    });

    this.registerValidSubcommands(["assess", "check"]);
  }

  getMetadata() {
    return {
      name: "clusterkit",
      version: "1.0.0",
      description: "Comprehensive Node Assessment Tool",
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle global flags
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }

    // Get subcommand
    const subcommand = parsed.subcommands[0] || parsed.positionalArgs[0];

    if (!subcommand) {
      return this.handleHelp();
    }

    // Validate subcommand
    const validationError = this.validateSubcommand(subcommand);
    if (validationError) {
      return validationError;
    }

    const handler = this.getCommand(subcommand);
    if (!handler) {
      return this.createError(`Unknown subcommand: ${subcommand}`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    return this.safeExecuteHandler(handler, parsed, context) as CommandResult;
  }

  private getTargetNode(
    parsed: ParsedCommand,
    context: CommandContext,
  ): DGXNode {
    const cluster = this.resolveCluster(context);
    const nodeFlag = parsed.flags.get("node") || context.currentNode;

    if (nodeFlag) {
      const node = cluster.nodes.find(
        (n: DGXNode) => n.id === nodeFlag || n.hostname === nodeFlag,
      );
      if (!node) {
        throw new Error(`Node ${nodeFlag} not found in cluster`);
      }
      return node;
    }

    // Default to first node
    return cluster.nodes[0];
  }

  private handleAssess(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    try {
      const node = this.getTargetNode(parsed, context);
      const verbose = parsed.flags.get("verbose") || parsed.flags.get("v");

      const assessment = this.runAssessment(node);

      return {
        output: this.formatAssessmentOutput(assessment, !!verbose),
        exitCode: 0,
      };
    } catch (error) {
      return {
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1,
      };
    }
  }

  private runAssessment(node: DGXNode): ClusterKitAssessment {
    const checks = {
      gpu: this.assessGPUs(node),
      network: this.assessNetwork(node),
      storage: this.assessStorage(node),
      firmware: this.assessFirmware(node),
      drivers: this.assessDrivers(node),
    };

    const overallHealth = this.calculateOverallHealth(checks);

    return {
      nodeId: node.id,
      hostname: node.hostname || `${node.id}.cluster.local`,
      timestamp: new Date(),
      overallHealth,
      checks,
    };
  }

  private assessGPUs(node: DGXNode): ClusterKitCheckResult {
    const gpus = node.gpus || [];
    const healthyGPUs = gpus.filter(
      (gpu: GPU) =>
        gpu.healthStatus === "OK" &&
        (!gpu.xidErrors || gpu.xidErrors.length === 0) &&
        gpu.temperature < 85,
    );

    const details: string[] = [];

    if (healthyGPUs.length < gpus.length) {
      const failedGPUs = gpus.filter(
        (gpu: GPU) =>
          gpu.healthStatus !== "OK" ||
          (gpu.xidErrors && gpu.xidErrors.length > 0) ||
          gpu.temperature >= 85,
      );

      failedGPUs.forEach((gpu: GPU) => {
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          details.push(`GPU ${gpu.id}: XID ${gpu.xidErrors[0].code} detected`);
        }
        if (gpu.temperature >= 85) {
          details.push(
            `GPU ${gpu.id}: High temperature (${Math.round(gpu.temperature)}°C)`,
          );
        }
        if (gpu.healthStatus !== "OK") {
          details.push(`GPU ${gpu.id}: Health status ${gpu.healthStatus}`);
        }
      });

      return {
        status: "fail",
        message: `${failedGPUs.length}/${gpus.length} GPUs have issues`,
        details,
      };
    }

    return {
      status: "pass",
      message: `All ${gpus.length} GPUs operational`,
      details: gpus.map((gpu: GPU) => `GPU ${gpu.id}: ${gpu.name} OK`),
    };
  }

  private assessNetwork(node: DGXNode): ClusterKitCheckResult {
    const hcas = node.hcas || [];
    const activeHCAs = hcas.filter((hca: InfiniBandHCA) => {
      // Check if HCA has at least one active port
      return (
        hca.ports &&
        hca.ports.some((port: InfiniBandPort) => port.state === "Active")
      );
    });

    if (activeHCAs.length < hcas.length) {
      return {
        status: "warning",
        message: `${activeHCAs.length}/${hcas.length} HCAs active`,
        details: hcas.map((hca: InfiniBandHCA) => {
          const activePort = hca.ports?.find(
            (p: InfiniBandPort) => p.state === "Active",
          );
          const state = activePort
            ? "Active"
            : hca.ports?.[0]?.state || "Unknown";
          return `${hca.devicePath}: ${state}`;
        }),
      };
    }

    return {
      status: "pass",
      message: `All ${hcas.length} InfiniBand HCAs active`,
      details: hcas.map(
        (hca: InfiniBandHCA) => `${hca.devicePath}: ${hca.caType} - Active`,
      ),
    };
  }

  private assessStorage(_node: DGXNode): ClusterKitCheckResult {
    // Generate simulated storage data based on node properties for realistic variation
    const usedData = Math.floor(Math.random() * 50) / 10; // 0-5.0 TB
    const usedScratch = Math.floor(Math.random() * 30) / 10; // 0-3.0 TB

    return {
      status: "pass",
      message: "Storage mounts accessible",
      details: [
        `/data: ${usedData.toFixed(1)}TB/10TB used`,
        `/scratch: ${usedScratch.toFixed(1)}TB/5TB used`,
      ],
    };
  }

  private assessFirmware(node: DGXNode): ClusterKitCheckResult {
    // Check firmware versions against expected values
    const expectedBMCVersion = "4.2.1";
    const currentBMCVersion = node.bmc?.firmwareVersion || "4.2.1";

    if (currentBMCVersion !== expectedBMCVersion) {
      return {
        status: "warning",
        message: "Firmware version mismatch detected",
        details: [`BMC: ${currentBMCVersion} (expected ${expectedBMCVersion})`],
      };
    }

    return {
      status: "pass",
      message: "Firmware versions current",
      details: [`BMC: ${currentBMCVersion}`, "GPU VBIOS: 96.00.5F.00.01"],
    };
  }

  private assessDrivers(node: DGXNode): ClusterKitCheckResult {
    const driverVersion = node.nvidiaDriverVersion || "535.129.03";
    const cudaVersion = node.cudaVersion || "12.2";

    return {
      status: "pass",
      message: "Drivers loaded and compatible",
      details: [
        `NVIDIA Driver: ${driverVersion}`,
        `CUDA: ${cudaVersion}`,
        "Fabric Manager: Active",
      ],
    };
  }

  private calculateOverallHealth(
    checks: Record<string, ClusterKitCheckResult>,
  ): "pass" | "warning" | "fail" {
    const statuses = Object.values(checks).map(
      (check: ClusterKitCheckResult) => check.status,
    );

    if (statuses.includes("fail")) {
      return "fail";
    }
    if (statuses.includes("warning")) {
      return "warning";
    }
    return "pass";
  }

  private handleCheck(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const category = parsed.subcommands[1] || parsed.positionalArgs[0];

    if (!category) {
      return this.createError(
        "Missing required argument: category\n\n" +
          "Valid categories: gpu, network, storage, firmware, drivers\n\n" +
          "Example: clusterkit check gpu",
      );
    }

    const validCategories = [
      "gpu",
      "network",
      "storage",
      "firmware",
      "drivers",
    ];
    if (!validCategories.includes(category)) {
      return this.createError(
        `Invalid category: ${category}\n\n` +
          "Valid categories: gpu, network, storage, firmware, drivers",
      );
    }

    // Skeleton - will be implemented in Task 2
    return this.createSuccess("Specific check functionality coming soon");
  }

  private formatAssessmentOutput(
    assessment: ClusterKitAssessment,
    verbose: boolean = false,
  ): string {
    let output = `ClusterKit Assessment Report\n`;
    output += `Node: ${assessment.nodeId}\n`;
    output += `Hostname: ${assessment.hostname}\n`;
    output += `Timestamp: ${assessment.timestamp.toISOString()}\n`;
    output += `Overall Health: ${assessment.overallHealth.toUpperCase()}\n\n`;

    // Always show check summary
    Object.entries(assessment.checks).forEach(([category, result]) => {
      const icon =
        result.status === "pass"
          ? "✓"
          : result.status === "warning"
            ? "⚠"
            : "✗";
      output += `${icon} ${category.toUpperCase()}: ${result.message}\n`;

      // Only show details in verbose mode
      if (verbose && result.details) {
        result.details.forEach((detail) => (output += `  - ${detail}\n`));
      }
    });

    return output;
  }
}
