import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";

interface BCMJob {
  id: number;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime: string;
  description: string;
}

export class BcmSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  private jobs: BCMJob[] = [
    {
      id: 1,
      type: "node-discovery",
      status: "completed",
      startTime: "2024-01-10T08:00:00",
      description: "Initial node discovery",
    },
    {
      id: 2,
      type: "firmware-update",
      status: "completed",
      startTime: "2024-01-10T09:30:00",
      description: "GPU firmware update",
    },
  ];

  getMetadata(): SimulatorMetadata {
    return {
      name: "bcm-tools",
      version: "10.3.0",
      description: "Base Command Manager and cluster tools",
      commands: [
        {
          name: "bcm",
          description: "Base Command Manager shell",
          usage: "bcm [OPTIONS]",
          examples: ["bcm", "bcm --help"],
        },
        {
          name: "bcm-node",
          description: "Node management commands",
          usage: "bcm-node list | show <node-id>",
          examples: ["bcm-node list", "bcm-node show dgx-00"],
        },
        {
          name: "crm",
          description: "Pacemaker cluster resource manager",
          usage: "crm status",
          examples: ["crm status"],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --version flag at root level
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    // Handle --help flag at root level
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }

    // Route to appropriate handler based on baseCommand
    const tool = parsed.baseCommand;

    switch (tool) {
      case "bcm":
        return this.handleBcm(parsed, context);
      case "bcm-node":
        return this.handleBcmNode(parsed, context);
      case "crm":
        return this.handleCrm(parsed, context);
      default:
        return this.createError(`Unknown BCM tool: ${tool}`);
    }
  }

  private getNodes(_context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes;
  }

  private getCluster(_context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster;
  }

  // Main BCM command (interactive shell)
  private handleBcm(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      let output = "Base Command Manager (BCM) v10.3.0\n\n";
      output += "Usage: bcm [OPTIONS] COMMAND\n\n";
      output += "Options:\n";
      output += "  -h, --help       Show this help message\n\n";
      output += "Commands:\n";
      output += "  bcm-node list         List all cluster nodes\n";
      output += "  bcm-node show <id>    Show detailed node information\n";
      output += "  bcm ha status         Show HA status\n";
      output += "  bcm job list        List deployment jobs\n";
      output += "  bcm job logs <id>   Show job logs\n";
      output += "  bcm validate pod    Validate SuperPOD configuration\n";
      output += "  crm status          Show Pacemaker cluster status\n";
      return this.createSuccess(output);
    }

    if (parsed.subcommands.length === 0) {
      return this.createSuccess(
        "\n\x1b[1;32mBase Command Manager (BCM) Shell\x1b[0m\n\n" +
          'Type "help" for available commands.\n' +
          'Type "exit" to leave BCM shell.\n\n' +
          "Available commands:\n" +
          "  bcm-node list         - List all cluster nodes\n" +
          "  bcm-node show <id>    - Show detailed node information\n" +
          "  bcm ha status         - Show HA status\n" +
          "  bcm job list        - List deployment jobs\n" +
          "  bcm job logs <id>   - Show job logs\n" +
          "  bcm validate pod    - Validate SuperPOD configuration\n" +
          "  crm status          - Show Pacemaker cluster status\n",
      );
    }

    const command = parsed.subcommands[0];

    if (command === "help") {
      return this.handleBcm({ ...parsed, subcommands: [] }, context);
    }

    if (command === "ha" && parsed.subcommands[1] === "status") {
      return this.handleBcmHA(parsed, context);
    }

    if (command === "job") {
      if (parsed.subcommands[1] === "list") {
        return this.handleBcmJobList(parsed, context);
      }
      if (parsed.subcommands[1] === "logs") {
        return this.handleBcmJobLogs(parsed, context);
      }
    }

    if (command === "validate" && parsed.subcommands[1] === "pod") {
      return this.handleBcmValidate(parsed, context);
    }

    return this.createError(
      `bcm: unknown command "${command}"\nType "bcm" for help.`,
    );
  }

  // bcm-node list | show <nodeid>
  private handleBcmNode(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[0];
    const nodes = this.getNodes(context);

    if (command === "show") {
      const nodeId = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!nodeId) {
        return this.createError("Usage: bcm-node show <node-id>");
      }
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        return this.createError(`Error: Node '${nodeId}' not found in cluster`);
      }
      return this.showNodeDetails(node);
    }

    if (command !== "list") {
      return this.createError("Usage: bcm-node list | show <node-id>");
    }

    // SOURCE OF TRUTH: Column widths for node inventory
    const COL_NODEID = 17;
    const COL_HOSTNAME = 28;
    const COL_TYPE = 12;
    const COL_STATUS = 12;
    // GPUS has no fixed width (last column)

    // Helper to pad content accounting for ANSI codes
    const padColAnsi = (content: string, width: number): string => {
      // eslint-disable-next-line no-control-regex
      const stripped = content.replace(/\x1b\[[0-9;]*m/g, "");
      const actualLength = stripped.length;
      if (actualLength > width) return content.substring(0, width);
      return content + " ".repeat(width - actualLength);
    };

    let output =
      "\n╔═══════════════════════════════════════════════════════════════════╗\n";
    output +=
      "║                    BCM Node Inventory                              ║\n";
    output +=
      "╚═══════════════════════════════════════════════════════════════════╝\n\n";

    output +=
      "Node ID".padEnd(COL_NODEID) +
      "Hostname".padEnd(COL_HOSTNAME) +
      "Type".padEnd(COL_TYPE) +
      "Status".padEnd(COL_STATUS) +
      "GPUs\n";

    // Generate separator dynamically
    const TOTAL_WIDTH = COL_NODEID + COL_HOSTNAME + COL_TYPE + COL_STATUS + 4;
    output += "-".repeat(TOTAL_WIDTH) + "\n";

    nodes.forEach((node) => {
      const status =
        node.healthStatus === "OK"
          ? "\x1b[32mHealthy\x1b[0m"
          : node.healthStatus === "Warning"
            ? "\x1b[33mWarning\x1b[0m"
            : "\x1b[31mCritical\x1b[0m";

      output +=
        node.id.padEnd(COL_NODEID) +
        node.hostname.padEnd(COL_HOSTNAME) +
        node.systemType.padEnd(COL_TYPE) +
        padColAnsi(status, COL_STATUS) +
        node.gpus.length +
        "\n";
    });

    output += "\n";
    output += `Total Nodes: ${nodes.length}\n`;
    output += `Total GPUs:  ${nodes.reduce((sum, n) => sum + n.gpus.length, 0)}\n`;

    return this.createSuccess(output);
  }

  // Show detailed node information
  private showNodeDetails(
    node: ReturnType<typeof this.getNodes>[0],
  ): CommandResult {
    const healthColor =
      node.healthStatus === "OK"
        ? "\x1b[32m"
        : node.healthStatus === "Warning"
          ? "\x1b[33m"
          : "\x1b[31m";
    const reset = "\x1b[0m";

    let output =
      "\n╔═══════════════════════════════════════════════════════════════════╗\n";
    output += `║                    Node Details: ${node.id.padEnd(33)}║\n`;
    output +=
      "╚═══════════════════════════════════════════════════════════════════╝\n\n";

    output += "General Information:\n";
    output += "--------------------\n";
    output += `Node ID:          ${node.id}\n`;
    output += `Hostname:         ${node.hostname}\n`;
    output += `System Type:      ${node.systemType}\n`;
    output += `Health Status:    ${healthColor}${node.healthStatus}${reset}\n`;
    output += `OS Version:       ${node.osVersion}\n`;
    output += `Kernel:           ${node.kernelVersion}\n\n`;

    output += "Hardware Configuration:\n";
    output += "-----------------------\n";
    output += `CPU Model:        ${node.cpuModel}\n`;
    output += `CPU Cores:        ${node.cpuCount}\n`;
    output += `Total RAM:        ${node.ramTotal} GB\n`;
    output += `Used RAM:         ${node.ramUsed} GB\n`;
    output += `GPU Count:        ${node.gpus.length}\n\n`;

    output += "Software Versions:\n";
    output += "------------------\n";
    output += `NVIDIA Driver:    ${node.nvidiaDriverVersion}\n`;
    output += `CUDA Version:     ${node.cudaVersion}\n\n`;

    output += "Slurm Status:\n";
    output += "-------------\n";
    const slurmColor =
      node.slurmState === "idle"
        ? "\x1b[32m"
        : node.slurmState === "alloc"
          ? "\x1b[34m"
          : node.slurmState === "drain"
            ? "\x1b[33m"
            : "\x1b[31m";
    output += `State:            ${slurmColor}${node.slurmState}${reset}\n`;
    if (node.slurmReason) {
      output += `Reason:           ${node.slurmReason}\n`;
    }
    output += "\n";

    output += "GPU Summary:\n";
    output += "------------\n";
    node.gpus.forEach((gpu, idx) => {
      const gpuHealth =
        gpu.healthStatus === "OK"
          ? "\x1b[32m●\x1b[0m"
          : gpu.healthStatus === "Warning"
            ? "\x1b[33m●\x1b[0m"
            : "\x1b[31m●\x1b[0m";
      output += `  GPU ${idx}: ${gpuHealth} ${gpu.name} - ${Math.round(gpu.utilization)}% util, ${Math.round(gpu.temperature)}°C\n`;
    });

    output += "\n";
    output += "InfiniBand HCAs:\n";
    output += "----------------\n";
    if (node.hcas && node.hcas.length > 0) {
      node.hcas.forEach((hca, idx) => {
        output += `  HCA ${idx}: ${hca.caType} - ${hca.ports.length} port(s)\n`;
      });
    } else {
      output += "  No HCAs detected\n";
    }

    return this.createSuccess(output);
  }

  // bcm ha status
  private handleBcmHA(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[1]; // 'status' is second subcommand after 'ha'
    if (command !== "status") {
      return this.createError("Usage: bcm ha status");
    }

    const cluster = this.getCluster(context);

    let output =
      "\n╔═══════════════════════════════════════════════════════════════════╗\n";
    output +=
      "║              Base Command Manager - High Availability              ║\n";
    output +=
      "╚═══════════════════════════════════════════════════════════════════╝\n\n";

    output += "HA Configuration:\n";
    output += "-----------------\n";
    output += `Status:           ${cluster.bcmHA.enabled ? "\x1b[32mEnabled\x1b[0m" : "\x1b[31mDisabled\x1b[0m"}\n`;
    output += `Primary Node:     ${cluster.bcmHA.primary}\n`;
    output += `Secondary Node:   ${cluster.bcmHA.secondary}\n`;
    output += `Current State:    ${cluster.bcmHA.state === "Active" ? "\x1b[32mActive\x1b[0m" : cluster.bcmHA.state}\n\n`;

    output += "Shared Resources:\n";
    output += "-----------------\n";
    output += `Shared Storage:   /cm_shared (NFS)\n`;
    output += `Home Directory:   /home (NFS)\n`;
    output += `Virtual IP:       10.0.0.100\n`;
    output += `Heartbeat:        \x1b[32mHealthy\x1b[0m\n\n`;

    output += "Last Failover:    Never\n";
    output += "Uptime:           15 days, 3 hours\n";

    return this.createSuccess(output);
  }

  // bcm job list
  private handleBcmJobList(
    _parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    // SOURCE OF TRUTH: Column widths for job list
    const COL_JOBID = 9;
    const COL_TYPE = 18;
    const COL_STATUS = 12;
    const COL_STARTTIME = 21;
    // DESCRIPTION has no fixed width (last column)

    // Helper to pad content accounting for ANSI codes
    const padColAnsi = (content: string, width: number): string => {
      // eslint-disable-next-line no-control-regex
      const stripped = content.replace(/\x1b\[[0-9;]*m/g, "");
      const actualLength = stripped.length;
      if (actualLength > width) return content.substring(0, width);
      return content + " ".repeat(width - actualLength);
    };

    let output =
      "\n╔═══════════════════════════════════════════════════════════════════╗\n";
    output +=
      "║                    BCM Deployment Jobs                             ║\n";
    output +=
      "╚═══════════════════════════════════════════════════════════════════╝\n\n";

    output +=
      "Job ID".padEnd(COL_JOBID) +
      "Type".padEnd(COL_TYPE) +
      "Status".padEnd(COL_STATUS) +
      "Start Time".padEnd(COL_STARTTIME) +
      "Description\n";

    // Generate separator dynamically
    const TOTAL_WIDTH = COL_JOBID + COL_TYPE + COL_STATUS + COL_STARTTIME + 11;
    output += "-".repeat(TOTAL_WIDTH) + "\n";

    this.jobs.forEach((job) => {
      const status =
        job.status === "completed"
          ? "\x1b[32mcompleted\x1b[0m"
          : job.status === "running"
            ? "\x1b[33mrunning\x1b[0m"
            : job.status === "failed"
              ? "\x1b[31mfailed\x1b[0m"
              : "pending";

      output +=
        job.id.toString().padEnd(COL_JOBID) +
        job.type.padEnd(COL_TYPE) +
        padColAnsi(status, COL_STATUS) +
        job.startTime.padEnd(COL_STARTTIME) +
        job.description +
        "\n";
    });

    return this.createSuccess(output);
  }

  // bcm job logs
  private handleBcmJobLogs(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const jobIdStr = parsed.positionalArgs[0];
    if (!jobIdStr) {
      return this.createError(
        "Error: Job ID not specified\nUsage: bcm job logs <job_id>",
      );
    }

    const jobId = parseInt(jobIdStr);
    const job = this.jobs.find((j) => j.id === jobId);

    if (!job) {
      return this.createError(`Error: Job ${jobId} not found`);
    }

    let output = `\n=== Job Logs for Job #${jobId} ===\n`;
    output += `Type: ${job.type}\n`;
    output += `Status: ${job.status}\n`;
    output += `Started: ${job.startTime}\n\n`;

    output += "--- Log Output ---\n";

    if (job.type === "node-discovery") {
      output += "[2024-01-10 08:00:00] Starting node discovery...\n";
      output += "[2024-01-10 08:00:05] Scanning network for DGX nodes...\n";
      output += "[2024-01-10 08:00:15] Found 8 DGX nodes\n";
      output += "[2024-01-10 08:00:20] Collecting hardware inventory...\n";
      output += "[2024-01-10 08:01:00] Discovery completed successfully\n";
    } else if (job.type === "firmware-update") {
      output += "[2024-01-10 09:30:00] Starting firmware update...\n";
      output += "[2024-01-10 09:30:10] Checking current firmware versions...\n";
      output += "[2024-01-10 09:30:30] Downloading firmware packages...\n";
      output += "[2024-01-10 09:35:00] Applying GPU firmware updates...\n";
      output += "[2024-01-10 09:45:00] Update completed successfully\n";
      output +=
        "[2024-01-10 09:45:05] Reboot required for changes to take effect\n";
    }

    output += "\n--- End of Logs ---\n";

    return this.createSuccess(output);
  }

  // bcm validate pod
  private handleBcmValidate(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[1]; // 'pod' is second subcommand after 'validate'
    if (command !== "pod") {
      return this.createError("Usage: bcm validate pod");
    }

    const nodes = this.getNodes(context);

    let output =
      "\n╔═══════════════════════════════════════════════════════════════════╗\n";
    output +=
      "║              SuperPOD Configuration Validation                     ║\n";
    output +=
      "╚═══════════════════════════════════════════════════════════════════╝\n\n";

    output += "Running validation checks...\n\n";

    // Check 1: Node Count
    output += "✓ Node Count: 8 nodes detected\n";

    // Check 2: GPU Count
    const totalGPUs = nodes.reduce((sum, n) => sum + n.gpus.length, 0);
    output += `✓ GPU Count: ${totalGPUs} GPUs total (${totalGPUs / nodes.length} per node)\n`;

    // Check 3: Network Connectivity
    output += "✓ Network Connectivity: All nodes reachable\n";

    // Check 4: InfiniBand Fabric
    const totalPorts = nodes.reduce((sum, n) => sum + n.hcas.length, 0);
    output += `✓ InfiniBand Fabric: ${totalPorts} HCA ports active\n`;

    // Check 5: Firmware Versions
    output += "✓ Firmware Versions: All nodes running compatible firmware\n";

    // Check 6: Storage
    output += "✓ Shared Storage: /cm_shared mounted on all nodes\n";

    // Check 7: Slurm
    output += "✓ Slurm: Controller responding, all nodes registered\n";

    // Check 8: GPU Health
    const healthyGPUs = nodes.reduce(
      (sum, n) => sum + n.gpus.filter((g) => g.healthStatus === "OK").length,
      0,
    );
    output += `${healthyGPUs === totalGPUs ? "✓" : "⚠"} GPU Health: ${healthyGPUs}/${totalGPUs} GPUs healthy\n`;

    output += "\n";

    if (healthyGPUs === totalGPUs) {
      output += "\x1b[32m✓ SuperPOD validation passed!\x1b[0m\n";
    } else {
      output +=
        "\x1b[33m⚠ SuperPOD validation completed with warnings\x1b[0m\n";
    }

    return { output, exitCode: healthyGPUs === totalGPUs ? 0 : 1 };
  }

  // crm status (Pacemaker)
  private handleCrm(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[0];
    if (command !== "status") {
      return this.createError("Usage: crm status");
    }

    return this.handleCrmStatus(parsed, context);
  }

  private handleCrmStatus(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const cluster = this.getCluster(context);

    let output = "\nCluster name: bcm-ha\n";
    output += "Cluster Summary:\n";
    output += `  * Stack: corosync\n`;
    output += `  * Current DC: ${cluster.bcmHA.primary} (version 2.1.2-4) - partition with quorum\n`;
    output += `  * Last updated: ${new Date().toISOString()}\n`;
    output += `  * Last change:  2024-01-10T08:00:00Z\n`;
    output += `  * 2 nodes configured\n`;
    output += `  * 4 resource instances configured\n\n`;

    output += "Node List:\n";
    output += `  * Online: [ ${cluster.bcmHA.primary} ${cluster.bcmHA.secondary} ]\n\n`;

    output += "Active Resources:\n";
    output += `  * virtual-ip    (ocf::heartbeat:IPaddr2):       Started ${cluster.bcmHA.primary}\n`;
    output += `  * bcm-manager   (systemd:bcm):                  Started ${cluster.bcmHA.primary}\n`;
    output += `  * nfs-server    (systemd:nfs-server):           Started ${cluster.bcmHA.primary}\n`;
    output += `  * drbd-master   (ocf::linbit:drbd):             Started ${cluster.bcmHA.primary}\n\n`;

    output += "Operations:\n";
    output += "  * virtual-ip: monitor (interval=10s)\n";
    output += "  * bcm-manager: monitor (interval=30s)\n";

    return this.createSuccess(output);
  }
}
