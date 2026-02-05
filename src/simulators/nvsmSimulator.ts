import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import type { DGXNode, GPU } from "@/types/hardware";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * NVSM Interactive Shell State
 * Per Spec Section 2.2: Current Working Target (CWT) system
 */
interface NVSMShellState {
  isInteractive: boolean;
  currentPath: string; // CWT - Current Working Target
}

/**
 * Target hierarchy definition
 * Matches spec: /systems/localhost/, /chassis/localhost/
 */
interface TargetNode {
  name: string;
  children: string[];
  verbs: string[];
  properties?: Record<string, string | number | string[]>;
}

/**
 * NVSM Simulator
 * Implements NVIDIA System Management CLI per spec Section 2
 *
 * Supports:
 * - Interactive shell mode (nvsm->)
 * - Navigation verbs: cd, show, set, dump, exit, help
 * - Target hierarchy with CWT
 * - Health checks with dot-leader formatting
 */
export class NvsmSimulator extends BaseSimulator {
  private shellState: NVSMShellState = {
    isInteractive: false,
    currentPath: "/systems/localhost",
  };

  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "nvsm",
      version: "24.03",
      description: "NVIDIA System Management interactive shell",
      commands: [
        {
          name: "nvsm",
          description: "NVIDIA System Management CLI",
          usage: "nvsm [OPTIONS] [COMMAND]",
          examples: [
            "nvsm",
            "nvsm show health",
            "nvsm show health --detailed",
            "nvsm dump health",
          ],
        },
      ],
    };
  }

  // Dot-leader width for health checks (spec Section 2.3)
  private readonly DOT_LEADER_WIDTH = 55;

  private getNode(context: CommandContext): DGXNode | undefined {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n) => n.id === context.currentNode);
  }

  /**
   * Get target hierarchy for current node
   */
  private getTargetHierarchy(node: DGXNode): Record<string, TargetNode> {
    return {
      "/": {
        name: "root",
        children: ["systems", "chassis"],
        verbs: ["cd", "show"],
      },
      "/systems": {
        name: "systems",
        children: ["localhost"],
        verbs: ["cd", "show"],
      },
      "/systems/localhost": {
        name: "localhost",
        children: ["gpus", "storage", "network", "chassis"],
        verbs: ["cd", "show"],
        properties: {
          Hostname: node.hostname,
          SystemType: node.systemType,
          Status_Health: node.healthStatus,
        },
      },
      "/systems/localhost/gpus": {
        name: "gpus",
        children: node.gpus.map((_, i) => `GPU${i}`),
        verbs: ["cd", "show"],
        properties: {
          GPUCount: node.gpus.length,
          Status_HealthRollup: this.getGpuHealthRollup(node),
        },
      },
      "/systems/localhost/storage": {
        name: "storage",
        children: ["alerts", "drives", "policy", "volumes"],
        verbs: ["cd", "show"],
        properties: {
          DriveCount: 10,
          Volumes: ["md0", "md1", "nvme0n1p1", "nvme1n1p1"],
        },
      },
      "/systems/localhost/network": {
        name: "network",
        children: ["interfaces"],
        verbs: ["cd", "show"],
        properties: {
          InterfaceCount: node.hcas.length,
        },
      },
      "/chassis/localhost": {
        name: "chassis",
        children: ["sensors", "power", "fans"],
        verbs: ["cd", "show"],
      },
    };
  }

  private getGpuHealthRollup(node: DGXNode): string {
    const hasCritical = node.gpus.some((g) => g.healthStatus === "Critical");
    const hasWarning = node.gpus.some((g) => g.healthStatus === "Warning");
    if (hasCritical) return "Critical";
    if (hasWarning) return "Warning";
    return "OK";
  }

  /**
   * Format health status with ANSI colors
   */
  private formatHealthStatus(status: string): string {
    switch (status) {
      case "OK":
      case "Healthy":
        return "\x1b[32mHealthy\x1b[0m";
      case "Warning":
        return "\x1b[33mWarning\x1b[0m";
      case "Critical":
        return "\x1b[31mCritical\x1b[0m";
      default:
        return status;
    }
  }

  /**
   * Format a health check line with dot-leaders
   * Per spec Section 2.3: "Check description....................... Status"
   */
  private formatHealthCheck(
    description: string,
    status: "Healthy" | "Warning" | "Critical",
  ): string {
    const statusFormatted = this.formatHealthStatus(status);
    const dotsNeeded = this.DOT_LEADER_WIDTH - description.length;
    const dots = ".".repeat(Math.max(1, dotsNeeded));
    return `${description}${dots} ${statusFormatted}`;
  }

  /**
   * Generate health checks for show health command
   * Per spec Section 2.3: Golden Output Reference
   */
  private generateHealthChecks(node: DGXNode): {
    checks: string[];
    healthy: number;
    total: number;
  } {
    const checks: string[] = [];
    let healthy = 0;
    let total = 0;

    // DIMM Memory check
    checks.push(
      this.formatHealthCheck("Verify installed DIMM memory sticks", "Healthy"),
    );
    healthy++;
    total++;

    // CPU cores check
    checks.push(
      this.formatHealthCheck("Number of logical CPU cores", "Healthy"),
    );
    healthy++;
    total++;

    // GPU checks - individual per GPU
    node.gpus.forEach((gpu, idx) => {
      const pciAddr =
        gpu.pciAddress || `0000:${(0x39 + idx).toString(16)}:00.0`;

      // Link speed check
      const linkSpeedStatus =
        gpu.healthStatus === "Critical"
          ? "Critical"
          : gpu.healthStatus === "Warning"
            ? "Warning"
            : "Healthy";
      checks.push(
        this.formatHealthCheck(
          `GPU link speed [${pciAddr}]`,
          linkSpeedStatus as "Healthy" | "Warning" | "Critical",
        ),
      );
      if (linkSpeedStatus === "Healthy") healthy++;
      total++;

      // Link width check
      checks.push(
        this.formatHealthCheck(
          `GPU link width [${pciAddr}][x16]`,
          linkSpeedStatus as "Healthy" | "Warning" | "Critical",
        ),
      );
      if (linkSpeedStatus === "Healthy") healthy++;
      total++;

      // Temperature check
      const tempStatus =
        gpu.temperature > 90
          ? "Critical"
          : gpu.temperature > 80
            ? "Warning"
            : "Healthy";
      checks.push(
        this.formatHealthCheck(
          `GPU temperature [GPU${idx}]`,
          tempStatus as "Healthy" | "Warning" | "Critical",
        ),
      );
      if (tempStatus === "Healthy") healthy++;
      total++;

      // ECC check
      const eccStatus =
        gpu.eccErrors.doubleBit > 0
          ? "Critical"
          : gpu.eccErrors.singleBit > 100
            ? "Warning"
            : "Healthy";
      checks.push(
        this.formatHealthCheck(
          `GPU ECC status [GPU${idx}]`,
          eccStatus as "Healthy" | "Warning" | "Critical",
        ),
      );
      if (eccStatus === "Healthy") healthy++;
      total++;

      // XID error check - cross-tool fault propagation
      // Per spec Section 7.1: XID errors from GPU state should appear in NVSM health
      const xidStatus =
        gpu.xidErrors && gpu.xidErrors.length > 0
          ? gpu.xidErrors.some((x) => x.severity === "Critical")
            ? "Critical"
            : "Warning"
          : "Healthy";
      checks.push(
        this.formatHealthCheck(
          `GPU XID error check [GPU${idx}]`,
          xidStatus as "Healthy" | "Warning" | "Critical",
        ),
      );
      if (xidStatus === "Healthy") healthy++;
      total++;
    });

    // Root filesystem check
    checks.push(this.formatHealthCheck("Root file system usage", "Healthy"));
    healthy++;
    total++;

    // NVLink checks
    node.gpus.forEach((gpu, idx) => {
      gpu.nvlinks.forEach((link, linkIdx) => {
        const linkStatus =
          link.status === "Active"
            ? "Healthy"
            : link.status === "Down"
              ? "Critical"
              : "Warning";
        checks.push(
          this.formatHealthCheck(
            `NVLink ${linkIdx} status [GPU${idx}]`,
            linkStatus as "Healthy" | "Warning" | "Critical",
          ),
        );
        if (linkStatus === "Healthy") healthy++;
        total++;
      });
    });

    // InfiniBand checks
    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        const portStatus = port.state === "Active" ? "Healthy" : "Warning";
        checks.push(
          this.formatHealthCheck(
            `InfiniBand port ${port.portNumber} [${hca.caType}]`,
            portStatus as "Healthy" | "Warning" | "Critical",
          ),
        );
        if (portStatus === "Healthy") healthy++;
        total++;
      });
    });

    return { checks, healthy, total };
  }

  /**
   * show health command output
   * Per spec Section 2.3
   */
  private showHealth(node: DGXNode, detailed: boolean = false): string {
    const { checks, healthy, total } = this.generateHealthChecks(node);
    const overallStatus =
      healthy === total
        ? "Healthy"
        : checks.some((c) => c.includes("Critical"))
          ? "Critical"
          : "Warning";

    let output = "\nChecks\n";
    output += "------\n";

    // Show checks (limit if not detailed)
    const displayChecks = detailed ? checks : checks.slice(0, 20);
    output += displayChecks.join("\n");

    if (!detailed && checks.length > 20) {
      output += `\n... and ${checks.length - 20} more checks\n`;
    }

    output += "\n\nHealth Summary\n";
    output += "--------------\n";
    output += `${healthy} out of ${total} checks are ${this.formatHealthStatus("Healthy")}\n`;
    output += `Overall system status is ${this.formatHealthStatus(overallStatus)}\n`;

    return output;
  }

  /**
   * show command for current target
   * Per spec Section 2.2: Properties, Targets, Verbs format
   */
  private showTarget(node: DGXNode): string {
    const hierarchy = this.getTargetHierarchy(node);
    const target = hierarchy[this.shellState.currentPath];

    if (!target) {
      return `Error: Target '${this.shellState.currentPath}' does not exist.`;
    }

    let output = `\n${this.shellState.currentPath}\n`;

    // Properties section
    if (target.properties && Object.keys(target.properties).length > 0) {
      output += "Properties:\n";
      for (const [key, value] of Object.entries(target.properties)) {
        const formattedValue = Array.isArray(value)
          ? `[ ${value.join(", ")} ]`
          : String(value);
        output += `  ${key} = ${formattedValue}\n`;
      }
    }

    // Targets section
    if (target.children.length > 0) {
      output += "Targets:\n";
      target.children.forEach((child) => {
        output += `  ${child}\n`;
      });
    }

    // Verbs section
    output += "Verbs:\n";
    target.verbs.forEach((verb) => {
      output += `  ${verb}\n`;
    });

    return output;
  }

  /**
   * cd command - navigate to target
   */
  private changeDirectory(path: string, node: DGXNode): CommandResult {
    const hierarchy = this.getTargetHierarchy(node);

    // Handle empty path - return to root
    if (!path) {
      this.shellState.currentPath = "/systems/localhost";
      return { output: "", exitCode: 0 };
    }

    // Handle absolute path
    let newPath: string;
    if (path.startsWith("/")) {
      newPath = path;
    } else if (path === "..") {
      // Go up one level
      const parts = this.shellState.currentPath.split("/").filter(Boolean);
      parts.pop();
      newPath = parts.length > 0 ? "/" + parts.join("/") : "/";
    } else {
      // Relative path
      newPath =
        this.shellState.currentPath === "/"
          ? `/${path}`
          : `${this.shellState.currentPath}/${path}`;
    }

    // Validate path exists
    if (hierarchy[newPath]) {
      this.shellState.currentPath = newPath;
      return { output: "", exitCode: 0 };
    }

    // Check if it's a GPU path
    const gpuMatch = newPath.match(/\/systems\/localhost\/gpus\/GPU(\d+)$/);
    if (gpuMatch) {
      const gpuId = parseInt(gpuMatch[1]);
      if (gpuId >= 0 && gpuId < node.gpus.length) {
        this.shellState.currentPath = newPath;
        return { output: "", exitCode: 0 };
      }
    }

    return {
      output: `Error: Target '${path}' does not exist.\nAvailable targets: ${hierarchy[this.shellState.currentPath]?.children.join(", ") || "none"}`,
      exitCode: 1,
    };
  }

  /**
   * dump health command
   * Per spec Section 2.4
   */
  private dumpHealth(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const hostname = "dgx-1";
    return `Writing output to /tmp/nvsm-health-${hostname}-${timestamp}.tar.xz\nDone.`;
  }

  /**
   * Get interactive prompt
   * Per spec: nvsm-> or nvsm(/path)->
   */
  getPrompt(): string {
    if (this.shellState.currentPath === "/systems/localhost") {
      return "nvsm-> ";
    }
    return `nvsm(${this.shellState.currentPath})-> `;
  }

  /**
   * Check if shell is in interactive mode
   */
  isInteractive(): boolean {
    return this.shellState.isInteractive;
  }

  /**
   * Enter interactive mode
   */
  enterInteractiveMode(): CommandResult {
    this.shellState.isInteractive = true;
    this.shellState.currentPath = "/systems/localhost";
    return {
      output: "",
      exitCode: 0,
      prompt: this.getPrompt(),
    };
  }

  /**
   * Exit interactive mode
   */
  exitInteractiveMode(): CommandResult {
    this.shellState.isInteractive = false;
    return { output: "", exitCode: 0 };
  }

  /**
   * Execute command in interactive shell mode
   */
  executeInteractive(input: string, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return {
        output:
          "Error: Cannot connect to NVSM daemon. Is nvsm-core service running?",
        exitCode: 1,
      };
    }

    const parts = input.trim().split(/\s+/);
    const verb = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (verb) {
      case "cd": {
        const cdResult = this.changeDirectory(args[0] || "", node);
        return { ...cdResult, prompt: this.getPrompt() };
      }

      case "show":
        if (args[0] === "health") {
          const detailed =
            args.includes("--detailed") || args.includes("-display");
          return {
            output: this.showHealth(node, detailed),
            exitCode: 0,
            prompt: this.getPrompt(),
          };
        }
        return {
          output: this.showTarget(node),
          exitCode: 0,
          prompt: this.getPrompt(),
        };

      case "dump":
        if (args[0] === "health") {
          return {
            output: this.dumpHealth(),
            exitCode: 0,
            prompt: this.getPrompt(),
          };
        }
        return {
          output: "Usage: dump health",
          exitCode: 1,
          prompt: this.getPrompt(),
        };

      case "exit":
      case "quit":
        return this.exitInteractiveMode();

      case "help":
        return {
          output: this.generateHelp(),
          exitCode: 0,
          prompt: this.getPrompt(),
        };

      case "":
        return { output: "", exitCode: 0, prompt: this.getPrompt() };

      default:
        return {
          output: `Error: Unknown verb '${verb}'. Valid verbs: cd, show, set, dump, exit, help`,
          exitCode: 1,
          prompt: this.getPrompt(),
        };
    }
  }

  /**
   * Generate help output
   */
  private generateHelp(): string {
    let output = "\nNVIDIA System Management (NVSM) Interactive Shell\n\n";
    output += "Navigation:\n";
    output += "  cd <path>           Change current target\n";
    output += "  cd ..               Go up one level\n";
    output += "  cd                  Return to /systems/localhost\n\n";
    output += "Commands:\n";
    output += "  show                Show properties of current target\n";
    output += "  show health         Show system health summary\n";
    output += "  show health --detailed  Show all health checks\n";
    output += "  dump health         Generate diagnostic tarball\n";
    output += "  help                Show this help\n";
    output += "  exit                Exit interactive shell\n\n";
    output += `Current target: ${this.shellState.currentPath}\n`;
    return output;
  }

  /**
   * Main execute method - handles both interactive and non-interactive modes
   */
  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      let output = "NVIDIA System Management (NVSM) v24.03\n\n";
      output += "Usage: nvsm [OPTIONS] [COMMAND]\n\n";
      output += "Options:\n";
      output += "  -h, --help       Show this help message\n\n";
      output += "Commands:\n";
      output += "  show health           Show system health summary\n";
      output += "  show health --detailed Show detailed health status\n";
      output += "  dump health           Generate diagnostic tarball\n\n";
      output += "Interactive Mode:\n";
      output += '  Run "nvsm" without arguments to enter interactive shell.\n';
      return this.createSuccess(output);
    }

    // Handle --version flag
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError(
        "Error: Cannot connect to NVSM daemon. Is nvsm-core service running?\nHint: Run 'sudo systemctl status nvsm-core' to check service status.",
      );
    }

    // No subcommands - enter interactive mode
    if (parsed.subcommands.length === 0) {
      return this.enterInteractiveMode();
    }

    const command = parsed.subcommands[0];

    // Handle show health directly
    if (command === "show" && parsed.subcommands[1] === "health") {
      const detailed = this.hasAnyFlag(parsed, ["detailed"]);
      return this.createSuccess(this.showHealth(node, detailed));
    }

    // Handle dump health directly
    if (command === "dump" && parsed.subcommands[1] === "health") {
      return this.createSuccess(this.dumpHealth());
    }

    // Handle show command
    if (command === "show") {
      return this.createSuccess(this.showTarget(node));
    }

    // Handle cd command
    if (command === "cd") {
      const path = parsed.positionalArgs[0] || "";
      return this.changeDirectory(path, node);
    }

    // Handle path-based commands (e.g., /systems/localhost/gpus show)
    if (command?.startsWith("/")) {
      const path = command;
      const hasShow = parsed.subcommands.includes("show");

      if (hasShow) {
        // Navigate to path and show
        this.shellState.currentPath = path;
        const gpuMatch = path.match(/\/GPU(\d+)$/);
        if (gpuMatch) {
          const gpuId = parseInt(gpuMatch[1]);
          if (gpuId >= 0 && gpuId < node.gpus.length) {
            return this.createSuccess(
              this.showGPUDetails(node.gpus[gpuId], gpuId),
            );
          }
        }
        return this.createSuccess(this.showTarget(node));
      }
    }

    return this.createError(
      `Error: Unknown command '${command}'. Type 'nvsm --help' for usage.`,
    );
  }

  /**
   * Show individual GPU details
   */
  private showGPUDetails(gpu: GPU, gpuId: number): string {
    let output = `\n/systems/localhost/gpus/GPU${gpuId}\n`;
    output += "Properties:\n";
    output += `  Name = ${gpu.name}\n`;
    output += `  UUID = ${gpu.uuid}\n`;
    output += `  Temperature = ${gpu.temperature}°C\n`;
    output += `  PowerDraw = ${gpu.powerDraw}W\n`;
    output += `  Utilization = ${gpu.utilization}%\n`;
    output += `  MemoryUsed = ${gpu.memoryUsed}MB / ${gpu.memoryTotal}MB\n`;
    output += `  Status_Health = ${gpu.healthStatus}\n`;
    output += `  ECC_SingleBit = ${gpu.eccErrors.singleBit}\n`;
    output += `  ECC_DoubleBit = ${gpu.eccErrors.doubleBit}\n`;
    output += "Targets:\n";
    output += "  nvlinks\n";
    output += "Verbs:\n";
    output += "  cd\n";
    output += "  show\n";
    return output;
  }
}
