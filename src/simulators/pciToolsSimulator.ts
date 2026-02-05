import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * PciToolsSimulator
 * Handles PCI device enumeration and system logs with fault state integration
 *
 * Special Features:
 * - Cross-tool fault propagation (reads GPU state from store)
 * - XID errors appear in lspci verbose output
 * - Thermal warnings in journalctl
 * - ECC errors in system logs
 *
 * Per spec Section 7: Cross-tool integration for diagnostics
 */
export class PciToolsSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "pci-tools",
      version: "1.0.0",
      description: "PCI device enumeration and system logging tools",
      commands: [
        {
          name: "lspci",
          description:
            "List PCI devices with GPU/HCA detection and error state",
          usage: "lspci [OPTIONS]",
          examples: ["lspci", "lspci -v", "lspci -vv", "lspci -d 10de:"],
        },
        {
          name: "journalctl",
          description: "System logs with XID/thermal/ECC error tracking",
          usage: "journalctl [OPTIONS]",
          examples: [
            "journalctl",
            "journalctl -b",
            "journalctl -k",
            "journalctl -p err",
          ],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --version flag
    if (this.hasAnyFlag(parsed, ["version"])) {
      return this.handleVersion();
    }

    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }

    // Route to appropriate handler
    switch (parsed.baseCommand) {
      case "lspci":
        return this.handleLspci(parsed, context);
      case "journalctl":
        return this.handleJournalctl(parsed, context);
      default:
        return this.createError(`Unknown PCI tool: ${parsed.baseCommand}`);
    }
  }

  /**
   * Handle lspci command
   * Lists PCI devices with GPU fault state integration
   * Per spec Section 7.3: lspci output for GPU bus errors
   */
  private handleLspci(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const cluster = useSimulationStore.getState().cluster;
    const node =
      cluster.nodes.find((n) => n.id === context.currentNode) ||
      cluster.nodes[0];

    if (!node) {
      return this.createSuccess("No PCI devices found");
    }

    // Check for verbose flag
    const verbose = this.hasAnyFlag(parsed, ["v", "vv"]);

    // Check for device filter (-d 10de: for NVIDIA devices)
    const nvidiaFilter =
      this.hasAnyFlag(parsed, ["d"]) &&
      (parsed.flags.get("d") === "10de" ||
        parsed.flags.get("d") === "10de:" ||
        parsed.positionalArgs.includes("10de") ||
        parsed.positionalArgs.includes("10de:"));

    let output = "";

    // Generate GPU PCIe entries
    node.gpus.forEach((gpu, idx) => {
      const pciAddr =
        gpu.pciAddress || `0000:${(0x39 + idx).toString(16)}:00.0`;
      const deviceName = `NVIDIA Corporation ${gpu.name} [${gpu.type}]`;

      output += `${pciAddr} 3D controller: ${deviceName}\n`;

      if (verbose) {
        output += `\tSubsystem: NVIDIA Corporation Device 0x1234\n`;
        output += `\tControl: I/O- Mem+ BusMaster+ SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR+ FastB2B- DisINTx+\n`;
        output += `\tStatus: Cap+ 66MHz- UDF- FastB2B- ParErr+ DEVSEL=fast >TAbort- <TAbort- <MAbort- >SERR- <PERR- INTx-\n`;
        output += `\tLatency: 0, Cache Line Size: 64 bytes\n`;
        output += `\tInterrupt: pin A routed to IRQ ${16 + idx}\n`;
        output += `\tMemory at fc000000 (64-bit, prefetchable) [size=32M]\n`;

        // Add error annotations if XID errors exist - cross-tool fault propagation
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          output += `\t\x1b[31m*** Device is in error state (XID ${gpu.xidErrors[gpu.xidErrors.length - 1].code}) ***\x1b[0m\n`;
        }

        // Add thermal warning
        if (gpu.temperature > 80) {
          output += `\t\x1b[33m*** Thermal throttling active (${gpu.temperature}C) ***\x1b[0m\n`;
        }

        output += "\n";
      }
    });

    // Add InfiniBand HCAs if not filtering for NVIDIA
    if (!nvidiaFilter) {
      node.hcas.forEach((hca, idx) => {
        const pciAddr = `0000:a${idx}:00.0`;
        output += `${pciAddr} InfiniBand: Mellanox Technologies ${hca.caType}\n`;
      });
    }

    return this.createSuccess(output);
  }

  /**
   * Handle journalctl command
   * System logs with GPU fault state integration
   * Per spec Section 7.1: journalctl kernel log simulation with fault state
   *
   * Critical for NCP-AII exam - detecting XID errors in system logs
   * Supports: -b (boot), -k (kernel), -u <unit>, -p <priority>, --since, grep filters
   */
  private handleJournalctl(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const cluster = useSimulationStore.getState().cluster;
    const node =
      cluster.nodes.find((n) => n.id === context.currentNode) ||
      cluster.nodes[0];

    if (!node) {
      return this.createError("No node found");
    }

    const now = new Date();
    const rawCommand = parsed.raw || "";

    // Check for grep patterns in the command
    const grepXid =
      rawCommand.includes("grep -i xid") || rawCommand.includes("grep xid");
    const grepNvrm =
      rawCommand.includes("grep -i nvrm") || rawCommand.includes("grep NVRM");
    const grepNvidia = rawCommand.includes("grep -i nvidia");
    const grepFallen = rawCommand.includes("grep -i fallen");

    // Build log entries
    const logEntries: string[] = [];

    // Header
    logEntries.push(
      `-- Logs begin at Mon 2024-01-15 08:00:00 UTC, end at ${now.toUTCString()} --`,
    );

    // Boot messages
    logEntries.push(
      `Jan 15 08:00:01 ${node.hostname} systemd[1]: Starting Initialize hardware monitoring sensors...`,
    );
    logEntries.push(
      `Jan 15 08:00:02 ${node.hostname} kernel: Linux version 5.15.0-91-generic (buildd@lcy02-amd64-030)`,
    );
    logEntries.push(
      `Jan 15 08:00:02 ${node.hostname} kernel: Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=1234-5678`,
    );
    logEntries.push(
      `Jan 15 08:00:03 ${node.hostname} kernel: NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03`,
    );
    logEntries.push(
      `Jan 15 08:00:03 ${node.hostname} kernel: nvidia-nvlink: Nvlink Core is being initialized`,
    );
    logEntries.push(
      `Jan 15 08:00:04 ${node.hostname} kernel: nvidia-uvm: Loaded the UVM driver, major device number 235`,
    );
    logEntries.push(
      `Jan 15 08:00:05 ${node.hostname} systemd[1]: Started NVIDIA Persistence Daemon.`,
    );
    logEntries.push(
      `Jan 15 08:00:05 ${node.hostname} nvidia-persistenced: Started (15847)`,
    );

    // GPU initialization messages
    for (let i = 0; i < 8; i++) {
      const pciAddr = `0000:${(0x10 + i).toString(16).padStart(2, "0")}:00.0`;
      logEntries.push(
        `Jan 15 08:00:0${6 + Math.floor(i / 2)} ${node.hostname} kernel: NVRM: GPU ${pciAddr}: GPU Ready`,
      );
    }

    // Check for XID errors in GPU state - cross-tool fault propagation
    let hasErrors = false;
    const errorEntries: string[] = [];

    node.gpus.forEach((gpu) => {
      const pciAddr =
        gpu.pciAddress ||
        `${(0x10 + gpu.id).toString(16).padStart(2, "0")}:00.0`;

      // Add XID error entries
      if (gpu.xidErrors && gpu.xidErrors.length > 0) {
        hasErrors = true;
        gpu.xidErrors.forEach((xid) => {
          const timeStr = new Date(xid.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          // Main XID message
          errorEntries.push(
            `${timeStr} ${node.hostname} kernel: NVRM: Xid (PCI:0000:${pciAddr}): ${xid.code}, ${xid.description}`,
          );

          // Additional context for critical XID codes
          if (xid.code === 79) {
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: GPU at 0000:${pciAddr} has fallen off the bus.`,
            );
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: A GPU crash dump has been created.`,
            );
          } else if (xid.code === 74) {
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: NVLink: Fatal error detected on link`,
            );
          } else if (xid.code === 48) {
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: GPU ${gpu.id}: DBE (double-bit error) ECC error detected`,
            );
          } else if (xid.code === 63) {
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: GPU ${gpu.id}: Row remapping resources exhausted`,
            );
          } else if (xid.code === 43) {
            errorEntries.push(
              `${timeStr} ${node.hostname} kernel: NVRM: GPU ${gpu.id}: GPU exception (Xid 43) - GPU likely hung`,
            );
          }
        });
      }

      // Add thermal warnings
      if (gpu.temperature > 80) {
        hasErrors = true;
        const timeStr = now.toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        errorEntries.push(
          `${timeStr} ${node.hostname} kernel: NVRM: GPU at 0000:${pciAddr}: temperature (${gpu.temperature}C) has reached slowdown threshold`,
        );
      }

      // Add ECC errors
      if (
        gpu.eccErrors &&
        (gpu.eccErrors.singleBit > 0 || gpu.eccErrors.doubleBit > 0)
      ) {
        hasErrors = true;
        const timeStr = now.toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        if (gpu.eccErrors.doubleBit > 0) {
          errorEntries.push(
            `${timeStr} ${node.hostname} kernel: NVRM: GPU at 0000:${pciAddr}: DOUBLE-BIT ECC error detected (count: ${gpu.eccErrors.doubleBit})`,
          );
        }
        if (gpu.eccErrors.singleBit > 0) {
          errorEntries.push(
            `${timeStr} ${node.hostname} kernel: NVRM: GPU at 0000:${pciAddr}: single-bit ECC error corrected (count: ${gpu.eccErrors.singleBit})`,
          );
        }
      }
    });

    // Add error entries to main log
    logEntries.push(...errorEntries);

    if (!hasErrors) {
      logEntries.push(
        `Jan 15 08:00:10 ${node.hostname} systemd[1]: Reached target Multi-User System.`,
      );
      logEntries.push(
        `Jan 15 08:00:10 ${node.hostname} kernel: All 8 GPUs initialized successfully`,
      );
    }

    // Handle grep filters first (piped output)
    if (grepXid || grepNvrm) {
      const filtered = logEntries.filter(
        (line) => line.includes("Xid") || line.includes("NVRM:"),
      );
      return this.createSuccess(filtered.length > 0 ? filtered.join("\n") : "");
    }

    if (grepNvidia) {
      const filtered = logEntries.filter(
        (line) =>
          line.toLowerCase().includes("nvidia") || line.includes("NVRM"),
      );
      return this.createSuccess(filtered.length > 0 ? filtered.join("\n") : "");
    }

    if (grepFallen) {
      const filtered = logEntries.filter((line) => line.includes("fallen"));
      return this.createSuccess(filtered.length > 0 ? filtered.join("\n") : "");
    }

    // Check for flags to filter output
    const showBoot = this.hasAnyFlag(parsed, ["b"]);
    const showKernel = this.hasAnyFlag(parsed, ["k"]);
    const unitFlag = parsed.flags.get("u");
    const priorityFlag = parsed.flags.get("p");
    const noArgs =
      parsed.subcommands.length === 0 &&
      parsed.positionalArgs.length === 0 &&
      parsed.flags.size === 0;

    // Filter by unit (-u)
    if (unitFlag && typeof unitFlag === "string") {
      if (unitFlag.includes("nvidia") || unitFlag.includes("gpu")) {
        const filtered = logEntries.filter(
          (line) =>
            line.includes("nvidia") ||
            line.includes("NVRM") ||
            line.includes("GPU"),
        );
        return this.createSuccess(filtered.join("\n"));
      }
      if (
        unitFlag === "slurm" ||
        unitFlag === "slurmctld" ||
        unitFlag === "slurmd"
      ) {
        return this
          .createSuccess(`-- Logs begin at Mon 2024-01-15 08:00:00 UTC --
Jan 15 08:00:05 ${node.hostname} systemd[1]: Starting Slurm node daemon...
Jan 15 08:00:06 ${node.hostname} slurmd[2341]: slurmd: slurmd version 23.02.6 started
Jan 15 08:00:06 ${node.hostname} slurmd[2341]: slurmd: Slurmd started with gres/gpu count: 8
Jan 15 08:00:07 ${node.hostname} systemd[1]: Started Slurm node daemon.`);
      }
    }

    // Filter by priority (-p)
    if (
      priorityFlag === "err" ||
      priorityFlag === "error" ||
      priorityFlag === "3"
    ) {
      const filtered = logEntries.filter(
        (line) =>
          line.includes("NVRM:") ||
          line.includes("error") ||
          line.includes("Error") ||
          line.includes("DOUBLE-BIT") ||
          line.includes("Xid") ||
          line.includes("fallen"),
      );
      return this.createSuccess(
        filtered.length > 0 ? filtered.join("\n") : "No errors found",
      );
    }

    if (
      priorityFlag === "warning" ||
      priorityFlag === "warn" ||
      priorityFlag === "4"
    ) {
      const filtered = logEntries.filter(
        (line) =>
          line.includes("warning") ||
          line.includes("Warning") ||
          line.includes("slowdown") ||
          line.includes("single-bit"),
      );
      return this.createSuccess(
        filtered.length > 0 ? filtered.join("\n") : "No warnings found",
      );
    }

    if (showBoot || showKernel || noArgs) {
      return this.createSuccess(logEntries.join("\n"));
    }

    // Default - show all logs
    return this.createSuccess(logEntries.join("\n"));
  }
}
