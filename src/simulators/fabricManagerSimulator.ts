import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import type {
  GPU,
  DGXNode,
  NVLinkConnection,
  XIDError,
} from "@/types/hardware";

/**
 * NVIDIA Fabric Manager Simulator
 *
 * Simulates nv-fabricmanager CLI for managing NVSwitch fabric topology.
 * Used for DGX systems with NVSwitch interconnects.
 */
export class FabricManagerSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "nv-fabricmanager",
      version: "535.104.05",
      description: "NVIDIA Fabric Manager CLI",
      commands: [
        { name: "nv-fabricmanager", description: "NVIDIA Fabric Manager CLI" },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Main command handler
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.showHelp();
    }

    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.showVersion();
    }

    const subcommand = parsed.subcommands[0];

    switch (subcommand) {
      case "status":
        return this.executeStatus(parsed, context);
      case "query":
        return this.executeQuery(parsed, context);
      case "start":
        return this.executeStart(parsed, context);
      case "stop":
        return this.executeStop(parsed, context);
      case "restart":
        return this.executeRestart(parsed, context);
      case "config":
        return this.executeConfig(parsed, context);
      case "diag":
        return this.executeDiag(parsed, context);
      case "topo":
        return this.executeTopo(parsed, context);
      default:
        if (parsed.subcommands.length === 0) {
          return this.showHelp();
        }
        return this.createError(
          `Unknown subcommand: ${subcommand}\nRun 'nv-fabricmanager --help' for usage.`,
        );
    }
  }

  private showHelp(): CommandResult {
    let output = `NVIDIA Fabric Manager CLI\n\n`;
    output += `Usage: nv-fabricmanager [options] <command> [args]\n\n`;
    output += `Options:\n`;
    output += `  -h, --help           Show this help message\n`;
    output += `  -v, --version        Show version information\n\n`;
    output += `Commands:\n`;
    output += `  status               Show fabric manager status\n`;
    output += `  query [type]         Query fabric information\n`;
    output += `    nvswitch            NVSwitch status\n`;
    output += `    topology            Fabric topology\n`;
    output += `    nvlink              NVLink status\n`;
    output += `  start                Start fabric manager service\n`;
    output += `  stop                 Stop fabric manager service\n`;
    output += `  restart              Restart fabric manager service\n`;
    output += `  config               Show/modify configuration\n`;
    output += `  diag [mode]          Run fabric diagnostics\n`;
    output += `    quick               Quick health check\n`;
    output += `    full                Complete diagnostic suite\n`;
    output += `    stress              NVLink stress test\n`;
    output += `    errors              Detailed error analysis\n`;
    output += `    ports               Port-level diagnostics\n`;
    output += `  topo                 Display topology map\n\n`;
    output += `Examples:\n`;
    output += `  nv-fabricmanager status\n`;
    output += `  nv-fabricmanager query nvswitch\n`;
    output += `  nv-fabricmanager diag\n`;
    output += `  nv-fabricmanager diag full\n`;
    output += `  nv-fabricmanager diag errors\n`;
    return this.createSuccess(output);
  }

  private showVersion(): CommandResult {
    return this.createSuccess(
      `nv-fabricmanager version 535.104.05\nCUDA Version: 12.2\nDriver Version: 535.104.05\n`,
    );
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n) => n.id === context.currentNode);
  }

  private executeStatus(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const gpuCount = node.gpus.length;
    const nvswitchCount = gpuCount >= 8 ? 6 : gpuCount >= 4 ? 2 : 0;
    const healthyNvlinks = node.gpus.reduce(
      (sum, g) => sum + g.nvlinks.filter((l) => l.status === "Active").length,
      0,
    );
    const totalNvlinks = node.gpus.reduce(
      (sum, g) => sum + g.nvlinks.length,
      0,
    );

    let output = `\x1b[1mNVIDIA Fabric Manager Status\x1b[0m\n`;
    output += `${"─".repeat(50)}\n\n`;

    output += `\x1b[1mService Status:\x1b[0m\n`;
    output += `  Fabric Manager:       \x1b[32mRunning\x1b[0m\n`;
    output += `  PID:                  ${12345 + Math.floor(Math.random() * 1000)}\n`;
    output += `  Uptime:               ${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m\n`;
    output += `  Config File:          /etc/nvidia-fabricmanager/fabricmanager.cfg\n\n`;

    output += `\x1b[1mFabric Topology:\x1b[0m\n`;
    output += `  System Type:          ${node.systemType}\n`;
    output += `  GPUs:                 ${gpuCount}\n`;
    output += `  NVSwitches:           ${nvswitchCount}\n`;
    output += `  NVLinks Total:        ${totalNvlinks}\n`;
    output += `  NVLinks Active:       ${healthyNvlinks}\n`;
    output += `  Topology:             ${gpuCount === 8 ? "Fully Connected (NVSwitch)" : "Direct NVLink"}\n\n`;

    output += `\x1b[1mHealth Status:\x1b[0m\n`;
    const healthyGpus = node.gpus.every((g) => g.healthStatus === "OK");
    const allHealthy = healthyNvlinks === totalNvlinks && healthyGpus;
    output += `  Overall:              ${allHealthy ? "\x1b[32mHealthy\x1b[0m" : "\x1b[33mDegraded\x1b[0m"}\n`;
    output += `  Last Health Check:    ${new Date().toISOString()}\n`;
    output += `  Errors Detected:      ${allHealthy ? "0" : Math.floor(Math.random() * 5) + 1}\n`;

    return this.createSuccess(output);
  }

  private executeQuery(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const queryType = parsed.subcommands[1];

    switch (queryType) {
      case "nvswitch":
        return this.queryNvswitch(context);
      case "topology":
        return this.queryTopology(context);
      case "nvlink":
        return this.queryNvlink(context);
      case undefined:
      case "": {
        // No query type specified - show help
        let output = `Query types:\n`;
        output += `  nvswitch   - Query NVSwitch status\n`;
        output += `  topology   - Query fabric topology\n`;
        output += `  nvlink     - Query NVLink status\n\n`;
        output += `Usage: nv-fabricmanager query <type>\n`;
        return this.createSuccess(output);
      }
      default: {
        // Invalid query type - return error
        return this.createError(
          `Invalid query type: '${queryType}'\n` +
            `Valid query types: nvswitch, topology, nvlink`,
        );
      }
    }
  }

  private queryNvswitch(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const nvswitchCount =
      node.gpus.length >= 8 ? 6 : node.gpus.length >= 4 ? 2 : 0;

    let output = `\x1b[1mNVSwitch Status\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;

    if (nvswitchCount === 0) {
      output += `No NVSwitches detected in this system configuration.\n`;
      return this.createSuccess(output);
    }

    output += `NVSwitch  | UUID                                  | State  | Temp | Power\n`;
    output += `${"─".repeat(60)}\n`;

    for (let i = 0; i < nvswitchCount; i++) {
      const uuid = `NVSwitch-${i}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      const temp = 45 + Math.floor(Math.random() * 15);
      const power = 30 + Math.floor(Math.random() * 20);
      output += `   ${i}      | ${uuid.padEnd(37)} | Active | ${temp}C  | ${power}W\n`;
    }

    output += `\n`;
    output += `Total NVSwitches: ${nvswitchCount}\n`;
    output += `All NVSwitches operational.\n`;

    return this.createSuccess(output);
  }

  private queryTopology(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    let output = `\x1b[1mFabric Topology\x1b[0m\n`;
    output += `${"─".repeat(50)}\n\n`;

    output += `System: ${node.systemType}\n`;
    output += `Hostname: ${node.hostname}\n\n`;

    // GPU topology
    output += `GPU Topology:\n`;
    node.gpus.forEach((gpu) => {
      const nvlinkCount = gpu.nvlinks.length;
      const activeNvlinks = gpu.nvlinks.filter(
        (l) => l.status === "Active",
      ).length;
      output += `  GPU ${gpu.id}: ${gpu.type} - ${activeNvlinks}/${nvlinkCount} NVLinks active\n`;
    });

    output += `\n`;

    // NVSwitch connectivity
    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;
    if (nvswitchCount > 0) {
      output += `NVSwitch Connectivity:\n`;
      for (let sw = 0; sw < nvswitchCount; sw++) {
        const connectedGpus = node.gpus
          .map((_, idx) => idx)
          .filter((_) => Math.random() > 0.2);
        output += `  NVSwitch ${sw}: Connected to GPUs [${connectedGpus.join(", ")}]\n`;
      }
    }

    return this.createSuccess(output);
  }

  private queryNvlink(context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    let output = `\x1b[1mNVLink Status\x1b[0m\n`;
    output += `${"─".repeat(70)}\n\n`;

    output += `GPU | Link | State   | Speed     | Remote GPU | Bandwidth\n`;
    output += `${"─".repeat(70)}\n`;

    node.gpus.forEach((gpu) => {
      gpu.nvlinks.forEach((link, linkIdx) => {
        const state =
          link.status === "Active"
            ? "\x1b[32mActive\x1b[0m "
            : "\x1b[31mInactive\x1b[0m";
        const speed = "NVLink4";
        const bandwidth =
          link.status === "Active" ? `${link.speed}GB/s` : "N/A";
        const remoteGpu = "NVSwitch";
        output += `  ${gpu.id} |   ${linkIdx}  | ${state} | ${speed.padEnd(9)} | ${String(remoteGpu).padEnd(10)} | ${bandwidth}\n`;
      });
    });

    const totalLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.length, 0);
    const activeLinks = node.gpus.reduce(
      (sum, g) => sum + g.nvlinks.filter((l) => l.status === "Active").length,
      0,
    );
    output += `\n`;
    output += `Total NVLinks: ${totalLinks}\n`;
    output += `Active NVLinks: ${activeLinks}\n`;
    output += `Inactive NVLinks: ${totalLinks - activeLinks}\n`;

    return this.createSuccess(output);
  }

  private executeStart(
    _parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    return this.createSuccess(
      `Starting NVIDIA Fabric Manager...\n` +
        `Initializing NVSwitch fabric...\n` +
        `Discovering GPUs...\n` +
        `Configuring NVLink topology...\n` +
        `\x1b[32mNVIDIA Fabric Manager started successfully.\x1b[0m\n`,
    );
  }

  private executeStop(
    _parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    return this.createSuccess(
      `Stopping NVIDIA Fabric Manager...\n` +
        `Shutting down NVLink connections...\n` +
        `\x1b[33mNVIDIA Fabric Manager stopped.\x1b[0m\n`,
    );
  }

  private executeRestart(
    _parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    return this.createSuccess(
      `Restarting NVIDIA Fabric Manager...\n` +
        `Stopping service...\n` +
        `Waiting for cleanup...\n` +
        `Starting service...\n` +
        `Initializing NVSwitch fabric...\n` +
        `\x1b[32mNVIDIA Fabric Manager restarted successfully.\x1b[0m\n`,
    );
  }

  private executeConfig(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const configOption = parsed.subcommands[1];

    if (configOption === "show" || !configOption) {
      let output = `\x1b[1mFabric Manager Configuration\x1b[0m\n`;
      output += `${"─".repeat(50)}\n\n`;
      output += `Configuration file: /etc/nvidia-fabricmanager/fabricmanager.cfg\n\n`;
      output += `[General]\n`;
      output += `  LOG_LEVEL=4\n`;
      output += `  LOG_FILE=/var/log/nvidia-fabricmanager.log\n`;
      output += `  DAEMONIZE=1\n\n`;
      output += `[Fabric]\n`;
      output += `  FM_STAY_RESIDENT=1\n`;
      output += `  FM_NSEC_POLL_INTERVAL=100000000\n`;
      output += `  FABRIC_MODE=FULL_SPEED\n`;
      output += `  FM_CMD_BIND_INTERFACE=127.0.0.1\n`;
      output += `  FM_CMD_PORT_NUMBER=16001\n\n`;
      output += `[NVSwitch]\n`;
      output += `  NVSWITCH_BLACKLIST_MODE=0\n`;
      output += `  NVSWITCH_ERR_THRESHOLD=16\n`;
      output += `  ACCESS_LINK_TIMEOUT_MS=5000\n\n`;
      output += `[Health]\n`;
      output += `  HEALTH_CHECK_ENABLED=1\n`;
      output += `  HEALTH_CHECK_INTERVAL_SEC=60\n`;
      return this.createSuccess(output);
    }

    return this.createError(
      `Unknown config option: ${configOption}\nUse 'nv-fabricmanager config show' to display configuration.`,
    );
  }

  private executeDiag(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    // Check for specific diagnostic modes
    const diagLevel = parsed.subcommands[1];

    if (diagLevel === "quick") {
      return this.executeDiagQuick(node);
    } else if (diagLevel === "full") {
      return this.executeDiagFull(node);
    } else if (diagLevel === "stress") {
      return this.executeDiagStress(node);
    } else if (diagLevel === "errors") {
      return this.executeDiagErrors(node);
    } else if (diagLevel === "ports") {
      return this.executeDiagPorts(node);
    }

    let output = `\x1b[1mNVIDIA Fabric Manager Diagnostics\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;

    output += `Running fabric diagnostics...\n\n`;

    // Check fabric manager service
    output += `\x1b[1m[1/5] Checking Fabric Manager Service\x1b[0m\n`;
    output += `  Service Status: \x1b[32mRunning\x1b[0m\n`;
    output += `  Configuration: \x1b[32mValid\x1b[0m\n\n`;

    // Check NVSwitch
    output += `\x1b[1m[2/5] Checking NVSwitch Devices\x1b[0m\n`;
    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;
    if (nvswitchCount > 0) {
      output += `  Detected: ${nvswitchCount} NVSwitches\n`;
      output += `  Status: \x1b[32mAll Operational\x1b[0m\n\n`;
    } else {
      output += `  No NVSwitch devices detected\n\n`;
    }

    // Check NVLink
    output += `\x1b[1m[3/5] Checking NVLink Connections\x1b[0m\n`;
    const totalLinks = node.gpus.reduce((sum, g) => sum + g.nvlinks.length, 0);
    const activeLinks = node.gpus.reduce(
      (sum, g) => sum + g.nvlinks.filter((l) => l.status === "Active").length,
      0,
    );
    output += `  Total Links: ${totalLinks}\n`;
    output += `  Active Links: ${activeLinks}\n`;
    output += `  Status: ${activeLinks === totalLinks ? "\x1b[32mAll Links Active\x1b[0m" : "\x1b[33mSome Links Inactive\x1b[0m"}\n\n`;

    // Check bandwidth
    output += `\x1b[1m[4/5] Testing NVLink Bandwidth\x1b[0m\n`;
    output += `  Aggregate Bandwidth: ${activeLinks * 50}GB/s\n`;
    output += `  Per-Link Bandwidth: ~50GB/s\n`;
    output += `  Status: \x1b[32mWithin Expected Range\x1b[0m\n\n`;

    // Check errors
    output += `\x1b[1m[5/5] Checking Error Logs\x1b[0m\n`;
    const errorCount = node.gpus.reduce(
      (sum, g) => sum + g.xidErrors.length,
      0,
    );
    output += `  Recent Errors: ${errorCount}\n`;
    output += `  Status: ${errorCount === 0 ? "\x1b[32mNo Errors\x1b[0m" : "\x1b[33mErrors Detected\x1b[0m"}\n\n`;

    // Summary
    output += `${"─".repeat(60)}\n`;
    const allPassed = activeLinks === totalLinks && errorCount === 0;
    output += `\x1b[1mDiagnostic Summary:\x1b[0m ${allPassed ? "\x1b[32mPASSED\x1b[0m" : "\x1b[33mWARNINGS\x1b[0m"}\n`;
    output += `Completed at: ${new Date().toISOString()}\n\n`;

    output += `\x1b[90mAdditional diagnostic modes:\x1b[0m\n`;
    output += `  nv-fabricmanager diag quick   - Quick health check\n`;
    output += `  nv-fabricmanager diag full    - Full diagnostic suite\n`;
    output += `  nv-fabricmanager diag stress  - Stress test NVLinks\n`;
    output += `  nv-fabricmanager diag errors  - Detailed error analysis\n`;
    output += `  nv-fabricmanager diag ports   - Port-level diagnostics\n`;

    return this.createSuccess(output);
  }

  private executeDiagQuick(node: DGXNode): CommandResult {
    let output = `\x1b[1mQuick Fabric Health Check\x1b[0m\n`;
    output += `${"─".repeat(50)}\n\n`;

    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;
    const totalLinks = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.nvlinks.length,
      0,
    );
    const activeLinks = node.gpus.reduce(
      (sum: number, g: GPU) =>
        sum +
        g.nvlinks.filter((l: NVLinkConnection) => l.status === "Active").length,
      0,
    );
    const errorCount = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.xidErrors.length,
      0,
    );

    output += `Fabric Manager:  \x1b[32m✓ Running\x1b[0m\n`;
    output += `NVSwitches:      ${nvswitchCount > 0 ? `\x1b[32m✓ ${nvswitchCount} detected\x1b[0m` : "\x1b[90m- Not applicable\x1b[0m"}\n`;
    output += `NVLinks:         ${activeLinks === totalLinks ? "\x1b[32m✓" : "\x1b[33m⚠"} ${activeLinks}/${totalLinks} active\x1b[0m\n`;
    output += `Errors:          ${errorCount === 0 ? "\x1b[32m✓ None\x1b[0m" : `\x1b[33m⚠ ${errorCount} detected\x1b[0m`}\n\n`;

    const healthy = activeLinks === totalLinks && errorCount === 0;
    output += `Overall Status: ${healthy ? "\x1b[32mHEALTHY\x1b[0m" : "\x1b[33mATTENTION NEEDED\x1b[0m"}\n`;

    return this.createSuccess(output);
  }

  private executeDiagFull(node: DGXNode): CommandResult {
    let output = `\x1b[1mFull Fabric Diagnostic Suite\x1b[0m\n`;
    output += `${"─".repeat(70)}\n\n`;

    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;

    // Phase 1: Service checks
    output += `\x1b[1mPhase 1: Service Verification\x1b[0m\n`;
    output += `  Fabric Manager daemon:     \x1b[32mRunning (PID: ${12345 + Math.floor(Math.random() * 1000)})\x1b[0m\n`;
    output += `  Configuration validation:  \x1b[32mPassed\x1b[0m\n`;
    output += `  License check:             \x1b[32mValid\x1b[0m\n\n`;

    // Phase 2: Hardware detection
    output += `\x1b[1mPhase 2: Hardware Detection\x1b[0m\n`;
    output += `  GPUs detected:             ${node.gpus.length}\n`;
    output += `  NVSwitches detected:       ${nvswitchCount}\n`;
    output += `  NVLink version:            NVLink 4.0\n`;
    output += `  Topology type:             ${nvswitchCount > 0 ? "NVSwitch Full Mesh" : "Direct NVLink"}\n\n`;

    // Phase 3: Link validation
    output += `\x1b[1mPhase 3: NVLink Validation\x1b[0m\n`;
    output += `  GPU  | Links | Active | Speed    | Status\n`;
    output += `  ${"─".repeat(50)}\n`;
    node.gpus.forEach((gpu: GPU) => {
      const active = gpu.nvlinks.filter(
        (l: NVLinkConnection) => l.status === "Active",
      ).length;
      const total = gpu.nvlinks.length;
      const status =
        active === total ? "\x1b[32mOK\x1b[0m" : "\x1b[33mDegraded\x1b[0m";
      output += `   ${gpu.id}   |   ${total}   |   ${active}    | 50GB/s   | ${status}\n`;
    });
    output += `\n`;

    // Phase 4: Bandwidth test
    output += `\x1b[1mPhase 4: Bandwidth Verification\x1b[0m\n`;
    const totalLinks = node.gpus.reduce(
      (sum: number, g: GPU) => sum + g.nvlinks.length,
      0,
    );
    const activeLinks = node.gpus.reduce(
      (sum: number, g: GPU) =>
        sum +
        g.nvlinks.filter((l: NVLinkConnection) => l.status === "Active").length,
      0,
    );
    const expectedBw = activeLinks * 50;
    const measuredBw = expectedBw * (0.95 + Math.random() * 0.05);
    output += `  Expected aggregate:        ${expectedBw} GB/s\n`;
    output += `  Measured aggregate:        ${measuredBw.toFixed(1)} GB/s\n`;
    output += `  Efficiency:                ${((measuredBw / expectedBw) * 100).toFixed(1)}%\n`;
    output += `  Status:                    \x1b[32mWithin tolerance\x1b[0m\n\n`;

    // Phase 5: Error analysis
    output += `\x1b[1mPhase 5: Error Analysis\x1b[0m\n`;
    const nvlinkXids = node.gpus
      .flatMap((g: GPU) => g.xidErrors)
      .filter((x: XIDError) => [72, 73, 74, 76, 77, 78].includes(x.code));
    output += `  NVLink-related XID errors: ${nvlinkXids.length}\n`;
    output += `  CRC errors:                ${Math.floor(Math.random() * 3)}\n`;
    output += `  Replay errors:             ${Math.floor(Math.random() * 5)}\n`;
    output += `  Recovery events:           ${Math.floor(Math.random() * 2)}\n\n`;

    // Summary
    const allPassed = activeLinks === totalLinks && nvlinkXids.length === 0;
    output += `${"─".repeat(70)}\n`;
    output += `\x1b[1mDiagnostic Result:\x1b[0m ${allPassed ? "\x1b[32mALL TESTS PASSED\x1b[0m" : "\x1b[33mISSUES DETECTED\x1b[0m"}\n`;
    output += `Duration: ${(2 + Math.random() * 3).toFixed(1)}s\n`;

    return this.createSuccess(output);
  }

  private executeDiagStress(node: DGXNode): CommandResult {
    let output = `\x1b[1mNVLink Stress Test\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;

    output += `\x1b[33mWarning: This test generates heavy NVLink traffic.\x1b[0m\n`;
    output += `\x1b[33mRunning workloads may be affected.\x1b[0m\n\n`;

    output += `Initializing stress test...\n`;
    output += `Test duration: 30 seconds\n`;
    output += `Pattern: Bidirectional all-to-all\n\n`;

    output += `\x1b[1mProgress:\x1b[0m\n`;
    output += `  Phase 1 - Warmup:          \x1b[32mComplete\x1b[0m\n`;
    output += `  Phase 2 - Ramp-up:         \x1b[32mComplete\x1b[0m\n`;
    output += `  Phase 3 - Sustained load:  \x1b[32mComplete\x1b[0m\n`;
    output += `  Phase 4 - Error check:     \x1b[32mComplete\x1b[0m\n\n`;

    output += `\x1b[1mResults:\x1b[0m\n`;
    const activeLinks = node.gpus.reduce(
      (sum: number, g: GPU) =>
        sum +
        g.nvlinks.filter((l: NVLinkConnection) => l.status === "Active").length,
      0,
    );
    const peakBw = activeLinks * 50 * 0.98;
    const avgBw = activeLinks * 50 * 0.95;
    output += `  Peak bandwidth:            ${peakBw.toFixed(1)} GB/s\n`;
    output += `  Average bandwidth:         ${avgBw.toFixed(1)} GB/s\n`;
    output += `  Minimum bandwidth:         ${(avgBw * 0.93).toFixed(1)} GB/s\n`;
    output += `  Packets transmitted:       ${(Math.random() * 1000000000).toFixed(0)}\n`;
    output += `  Errors during test:        0\n`;
    output += `  Link retrains:             0\n\n`;

    output += `\x1b[32mStress test completed successfully.\x1b[0m\n`;

    return this.createSuccess(output);
  }

  private executeDiagErrors(node: DGXNode): CommandResult {
    let output = `\x1b[1mFabric Error Analysis\x1b[0m\n`;
    output += `${"─".repeat(70)}\n\n`;

    // Collect all errors
    const allXids = node.gpus.flatMap((gpu: GPU, idx: number) =>
      gpu.xidErrors.map((xid: XIDError) => ({ ...xid, gpuId: idx })),
    );
    const nvlinkXids = allXids.filter((x) =>
      [72, 73, 74, 76, 77, 78].includes(x.code),
    );

    output += `\x1b[1mError Summary:\x1b[0m\n`;
    output += `  Total fabric-related errors: ${nvlinkXids.length}\n\n`;

    if (nvlinkXids.length === 0) {
      output += `\x1b[32mNo fabric errors detected.\x1b[0m\n\n`;
    } else {
      output += `\x1b[1mError Details:\x1b[0m\n`;
      output += `  Timestamp               | GPU | XID | Description\n`;
      output += `  ${"─".repeat(65)}\n`;
      nvlinkXids.slice(0, 10).forEach((xid) => {
        const desc = this.getXidDescription(xid.code);
        output += `  ${xid.timestamp}  |  ${xid.gpuId}  | ${xid.code}  | ${desc}\n`;
      });
      if (nvlinkXids.length > 10) {
        output += `  ... and ${nvlinkXids.length - 10} more errors\n`;
      }
      output += `\n`;
    }

    // Port error counters
    output += `\x1b[1mPort Error Counters:\x1b[0m\n`;
    output += `  NVLink Port | CRC Errors | Replay | Recovery | Flit Errors\n`;
    output += `  ${"─".repeat(60)}\n`;
    for (let i = 0; i < Math.min(node.gpus.length * 2, 12); i++) {
      const crc = Math.floor(Math.random() * 5);
      const replay = Math.floor(Math.random() * 10);
      const recovery = Math.floor(Math.random() * 2);
      const flit = Math.floor(Math.random() * 3);
      output += `      ${i.toString().padStart(2)}      |     ${crc}      |   ${replay.toString().padStart(2)}   |    ${recovery}     |      ${flit}\n`;
    }
    output += `\n`;

    // Recommendations
    output += `\x1b[1mRecommendations:\x1b[0m\n`;
    if (nvlinkXids.length > 0) {
      output += `  1. Review XID error patterns for affected GPUs\n`;
      output += `  2. Check NVLink cable connections\n`;
      output += `  3. Verify NVSwitch firmware versions\n`;
      output += `  4. Consider running 'nv-fabricmanager diag stress' for verification\n`;
    } else {
      output += `  \x1b[32mNo recommendations - fabric operating normally\x1b[0m\n`;
    }

    return this.createSuccess(output);
  }

  private executeDiagPorts(node: DGXNode): CommandResult {
    let output = `\x1b[1mPort-Level Diagnostics\x1b[0m\n`;
    output += `${"─".repeat(80)}\n\n`;

    const nvswitchCount = node.gpus.length >= 8 ? 6 : 0;

    if (nvswitchCount === 0) {
      output += `No NVSwitch devices detected. Showing direct NVLink port status.\n\n`;
    }

    output += `\x1b[1mGPU NVLink Ports:\x1b[0m\n`;
    output += `  GPU | Port | State  | Remote    | Tx Rate  | Rx Rate  | Util%\n`;
    output += `  ${"─".repeat(70)}\n`;

    node.gpus.forEach((gpu: GPU) => {
      gpu.nvlinks.forEach((link: NVLinkConnection, linkIdx: number) => {
        const state =
          link.status === "Active"
            ? "\x1b[32mUp\x1b[0m    "
            : "\x1b[31mDown\x1b[0m  ";
        const remote =
          nvswitchCount > 0
            ? `NVSwitch ${linkIdx % nvswitchCount}`
            : `GPU ${(gpu.id + linkIdx + 1) % node.gpus.length}`;
        const txRate =
          link.status === "Active"
            ? `${(link.speed * 0.8 + Math.random() * link.speed * 0.2).toFixed(1)}GB/s`
            : "N/A     ";
        const rxRate =
          link.status === "Active"
            ? `${(link.speed * 0.8 + Math.random() * link.speed * 0.2).toFixed(1)}GB/s`
            : "N/A     ";
        const util =
          link.status === "Active"
            ? `${Math.floor(Math.random() * 60 + 20)}%`
            : "N/A";
        output += `   ${gpu.id}  |  ${linkIdx}   | ${state} | ${remote.padEnd(9)} | ${txRate.padEnd(8)} | ${rxRate.padEnd(8)} | ${util}\n`;
      });
    });

    output += `\n`;

    if (nvswitchCount > 0) {
      output += `\x1b[1mNVSwitch Ports:\x1b[0m\n`;
      output += `  Switch | Port | State  | Connected To | Errors\n`;
      output += `  ${"─".repeat(55)}\n`;
      for (let sw = 0; sw < nvswitchCount; sw++) {
        for (let port = 0; port < node.gpus.length; port++) {
          const state =
            Math.random() > 0.1
              ? "\x1b[32mUp\x1b[0m    "
              : "\x1b[31mDown\x1b[0m  ";
          const errors = Math.floor(Math.random() * 5);
          output += `    ${sw}    |  ${port}   | ${state} | GPU ${port}        |   ${errors}\n`;
        }
      }
    }

    return this.createSuccess(output);
  }

  private getXidDescription(code: number): string {
    const descriptions: Record<number, string> = {
      72: "NVLink link training failed",
      73: "NVLink FLA access error",
      74: "NVLink link failed",
      76: "NVSwitch fatal error",
      77: "NVLink data CRC error",
      78: "NVLink flow control CRC error",
    };
    return descriptions[code] || "Unknown NVLink error";
  }

  private executeTopo(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const gpuCount = node.gpus.length;
    const nvswitchCount = gpuCount >= 8 ? 6 : 0;

    let output = `\x1b[1mNVSwitch Fabric Topology Map\x1b[0m\n`;
    output += `${"─".repeat(60)}\n\n`;

    if (nvswitchCount === 0) {
      output += `  No NVSwitch fabric detected.\n`;
      output += `  System uses direct GPU-to-GPU NVLink connections.\n`;
      return this.createSuccess(output);
    }

    // ASCII topology diagram
    output += `  ┌─────────────────────────────────────────────────────┐\n`;
    output += `  │                  NVSwitch Fabric                    │\n`;
    output += `  ├─────────────────────────────────────────────────────┤\n`;
    output += `  │                                                     │\n`;

    // NVSwitches row
    output += `  │  `;
    for (let i = 0; i < nvswitchCount; i++) {
      output += `[SW${i}] `;
    }
    output += `           │\n`;

    output += `  │    │     │     │     │     │     │                  │\n`;
    output += `  │    └─────┴─────┴─────┴─────┴─────┘                  │\n`;
    output += `  │              │ NVLink │                             │\n`;
    output += `  │    ┌─────────┴────────┴─────────┐                  │\n`;
    output += `  │    │                            │                  │\n`;

    // GPUs row
    output += `  │  `;
    for (let i = 0; i < Math.min(gpuCount, 8); i++) {
      output += `[G${i}] `;
    }
    output += `     │\n`;

    output += `  │                                                     │\n`;
    output += `  └─────────────────────────────────────────────────────┘\n\n`;

    output += `  Legend:\n`;
    output += `    [SW#] = NVSwitch #\n`;
    output += `    [G#]  = GPU #\n\n`;

    output += `  Connectivity:\n`;
    output += `    - Each GPU connected to all ${nvswitchCount} NVSwitches\n`;
    output += `    - Full mesh GPU-to-GPU via NVSwitch\n`;
    output += `    - Aggregate bandwidth: ${nvswitchCount * 50 * gpuCount}GB/s\n`;

    return this.createSuccess(output);
  }
}
