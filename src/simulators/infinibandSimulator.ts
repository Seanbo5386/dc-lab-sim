import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";

/**
 * Maps InfiniBand link rate (Gb/s) to the correct standard name.
 * - QDR = 40 Gb/s (10 Gb/s per lane x 4)
 * - FDR = 56 Gb/s (14 Gb/s per lane x 4)
 * - EDR = 100 Gb/s (25 Gb/s per lane x 4)
 * - HDR = 200 Gb/s (50 Gb/s per lane x 4)
 * - NDR = 400 Gb/s (100 Gb/s per lane x 4)
 * - XDR = 800 Gb/s (200 Gb/s per lane x 4)
 */
export function getIBStandardName(rateGbps: number): string {
  if (rateGbps >= 800) return "XDR";
  if (rateGbps >= 400) return "NDR";
  if (rateGbps >= 200) return "HDR";
  if (rateGbps >= 100) return "EDR";
  if (rateGbps >= 56) return "FDR";
  return "QDR";
}

/**
 * InfiniBand Simulator
 *
 * Handles multiple InfiniBand diagnostic commands: ibstat, ibportstate, ibporterrors,
 * iblinkinfo, perfquery, ibdiagnet
 */
export class InfiniBandSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "infiniband-tools",
      version: "5.9-0",
      description: "InfiniBand Diagnostic Tools",
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createError(
      "Use specific InfiniBand commands: ibstat, ibportstate, ibporterrors, iblinkinfo, perfquery, ibdiagnet",
    );
  }

  private getNode(context: CommandContext) {
    return this.resolveNode(context);
  }

  /**
   * ibstat - Display HCA status
   */
  executeIbstat(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibstat") ||
        this.createSuccess(`Usage: ibstat [options] [<ca_name>] [portnum]
Options:
  -d, --debug          increase debug level
  -l, --list_of_cas    list all CA names
  -s, --short          short output
  -p, --port_list      show port list
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibstat 5.9-0");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    if (node.hcas.length === 0) {
      return this.createError("No InfiniBand HCAs found");
    }

    let output = "";
    node.hcas.forEach((hca, idx) => {
      if (idx > 0) output += "\n";
      const deviceId = hca.caType.includes("ConnectX-7") ? "MT4129" : "MT4123";
      output += `CA '${hca.caType}'\n`;
      output += `\tCA type: ${deviceId}\n`;
      output += `\tNumber of ports: ${hca.ports.length}\n`;
      output += `\tFirmware version: ${hca.firmwareVersion}\n`;
      output += `\tHardware version: 0\n`;
      output += `\tNode GUID: ${hca.ports[0]?.guid}\n`;
      output += `\tSystem image GUID: ${hca.ports[0]?.guid}\n`;

      hca.ports.forEach((port) => {
        output += `\tPort ${port.portNumber}:\n`;
        output += `\t\tState: ${port.state}\n`;
        output += `\t\tPhysical state: ${port.physicalState}\n`;
        output += `\t\tRate: ${port.rate} Gb/s (${getIBStandardName(port.rate)})\n`;
        output += `\t\tBase lid: ${port.lid}\n`;
        output += `\t\tLMC: 0\n`;
        output += `\t\tSM lid: 1\n`;
        output += `\t\tCapability mask: 0x04010000\n`;
        output += `\t\tPort GUID: ${port.guid}\n`;
        output += `\t\tLink layer: ${port.linkLayer}\n`;
      });
    });

    return this.createSuccess(output);
  }

  /**
   * ibportstate - Get port state
   */
  executeIbportstate(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibportstate") ||
        this.createSuccess(`Usage: ibportstate [options] <lid|guid> <portnum>
Options:
  -d, --debug          increase debug level
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibportstate 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const port = node.hcas[0].ports[0];
    const output =
      `Port ${port.portNumber} State: ${port.state}\n` +
      `Physical Port State: ${port.physicalState}\n`;

    return this.createSuccess(output);
  }

  /**
   * ibporterrors - Show port error counters
   */
  executeIbporterrors(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibporterrors") ||
        this.createSuccess(`Usage: ibporterrors [options]
Options:
  -C, --Ca <ca>        CA name
  -P, --Port <port>    port number
  -c, --clear          clear errors after read
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibporterrors 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    let output = "Errors for:\n";
    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        output += `  Port ${port.portNumber} (lid ${port.lid}):\n`;
        output += `    SymbolErrors:            ${port.errors.symbolErrors}\n`;
        output += `    LinkDowned:              ${port.errors.linkDowned}\n`;
        output += `    PortRcvErrors:           ${port.errors.portRcvErrors}\n`;
        output += `    PortXmitDiscards:        ${port.errors.portXmitDiscards}\n`;
        output += `    PortXmitWait:            ${port.errors.portXmitWait}\n`;

        if (port.errors.symbolErrors > 0) {
          output += `    \x1b[33m⚠ Warning: Symbol errors detected - check cable quality\x1b[0m\n`;
        }
        if (port.errors.linkDowned > 0) {
          output += `    \x1b[31m⚠ Critical: Link has gone down ${port.errors.linkDowned} times\x1b[0m\n`;
        }
      });
    });

    return this.createSuccess(output);
  }

  /**
   * iblinkinfo - Show link information
   */
  executeIblinkinfo(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("iblinkinfo") ||
        this.createSuccess(`Usage: iblinkinfo [options]
Options:
  -v, --verbose        verbose output
  -l, --line           line format
  -R, --GNDN           include switches with no link down
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("iblinkinfo 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);

    let output = `InfiniBand Link Information:\n\n`;

    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        output += `CA: ${hca.caType}\n`;
        output += `      ${port.guid}\n`;
        output += `         port ${port.portNumber} lid ${port.lid} lmc 0 ${port.state} ${port.rate} Gb/s ${getIBStandardName(port.rate)} (${port.linkLayer})\n`;

        if (verbose) {
          output += `         Link errors:\n`;
          output += `           Symbol errors:      ${port.errors.symbolErrors}\n`;
          output += `           Link downed:        ${port.errors.linkDowned}\n`;
          output += `           Receive errors:     ${port.errors.portRcvErrors}\n`;
        }
      });
    });

    return this.createSuccess(output);
  }

  /**
   * perfquery - Query performance counters
   */
  executePerfquery(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("perfquery") ||
        this
          .createSuccess(`Usage: perfquery [options] [<lid|guid> [[port(s)] [reset_mask]]]
Options:
  -x, --extended       extended counters
  -X, --xmtsl          transmit data
  -r, --reset          reset after read
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("perfquery 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const port = node.hcas[0].ports[0];

    // Deterministic counters based on port LID (consistent across invocations)
    const seed = port.lid * 7919; // prime multiplier for spread
    const xmitData = 500000000 + (seed % 500000000);
    const rcvData = 450000000 + ((seed * 3) % 500000000);
    const xmitPkts = 5000000 + (seed % 5000000);
    const rcvPkts = 4800000 + ((seed * 3) % 5000000);

    const output =
      `# Port counters: Lid ${port.lid} port ${port.portNumber}\n` +
      `PortSelect:......................${port.portNumber}\n` +
      `PortXmitData:....................${xmitData}\n` +
      `PortRcvData:.....................${rcvData}\n` +
      `PortXmitPkts:....................${xmitPkts}\n` +
      `PortRcvPkts:.....................${rcvPkts}\n` +
      `PortUnicastXmitPkts:.............${xmitPkts}\n` +
      `PortUnicastRcvPkts:..............${rcvPkts}\n` +
      `PortMulticastXmitPkts:...........0\n` +
      `PortMulticastRcvPkts:............0\n` +
      `SymbolErrorCounter:..............${port.errors.symbolErrors}\n` +
      `LinkErrorRecoveryCounter:........0\n` +
      `LinkDownedCounter:...............${port.errors.linkDowned}\n` +
      `PortRcvErrors:...................${port.errors.portRcvErrors}\n` +
      `PortRcvRemotePhysicalErrors:.....0\n` +
      `PortRcvSwitchRelayErrors:........0\n` +
      `PortXmitDiscards:................${port.errors.portXmitDiscards}\n` +
      `PortXmitConstraintErrors:........0\n` +
      `PortRcvConstraintErrors:.........0\n` +
      `LocalLinkIntegrityErrors:........0\n` +
      `ExcessiveBufferOverrunErrors:....0\n` +
      `VL15Dropped:.....................0\n` +
      `PortXmitWait:....................${port.errors.portXmitWait}\n`;

    return this.createSuccess(output);
  }

  /**
   * ibdiagnet - Full fabric diagnostic with optional signal quality metrics
   */
  executeIbdiagnet(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibdiagnet") ||
        this.createSuccess(`Usage: ibdiagnet [options]
Options:
  -o, --output <dir>   output directory
  -t, --topo <file>    topology file
  -p, --port <num>     port number
  --skip <checks>      skip specific checks
  --detailed           show detailed signal quality metrics
  --signal-quality     show signal quality metrics
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibdiagnet 2.9.0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const detailed = this.hasAnyFlag(parsed, [
      "detailed",
      "d",
      "signal-quality",
    ]);

    let output =
      `\n-I- Using port 1 as the local port\n` +
      `-I- Discovering ... \n` +
      `-I- Discovering done\n` +
      `-I- # of nodes: ${node.hcas.length}\n` +
      `-I- # of links: ${node.hcas.length}\n` +
      `-I- # of CAs: ${node.hcas.length}\n` +
      `-I- # of switches: 0\n` +
      `-I- Checking fabric health...\n`;

    if (detailed) {
      output += `-I- Running signal quality checks...\n\n`;
      output += `Cable Validation Report - ${node.hostname}\n`;
      output += `${"=".repeat(60)}\n\n`;

      node.hcas.forEach((hca, idx) => {
        output += `Port ${idx + 1}: ${hca.ports[0]?.guid || "unknown"}\n`;
        output += `  Cable Type: QSFP-DD AOC\n`;
        output += `  Cable Length: 5m\n`;
        output += `  Link State: ${hca.ports[0]?.state || "Active"}\n`;
        const portRate = hca.ports[0]?.rate || 400;
        output += `  Link Speed: ${portRate} Gb/s (${getIBStandardName(portRate)})\n`;

        // Add signal quality metrics
        const rxPower = -2.5 + Math.random() * 0.5; // -2.5 to -2.0 dBm
        const txPower = -1.8 + Math.random() * 0.3; // -1.8 to -1.5 dBm
        const ber = Math.random() * 1e-12; // Bit Error Rate
        const snr = 25 + Math.random() * 5; // Signal-to-Noise Ratio 25-30 dB

        output += `\n  Signal Quality Metrics:\n`;
        output += `    RX Power: ${rxPower.toFixed(2)} dBm (Normal: -3.0 to -1.5)\n`;
        output += `    TX Power: ${txPower.toFixed(2)} dBm (Normal: -2.0 to -1.0)\n`;
        output += `    Bit Error Rate: ${ber.toExponential(2)} (Threshold: < 1e-9)\n`;
        output += `    SNR: ${snr.toFixed(1)} dB (Normal: > 20 dB)\n`;
        output += `    Eye Opening: 95% (Normal: > 80%)\n`;
        output += `    Status: ${rxPower > -3 && ber < 1e-9 && snr > 20 ? "✓ PASS" : "✗ FAIL"}\n`;
        output += `\n`;
      });
    }

    output += `-I- Fabric health check completed\n`;
    output += `-I- No errors found\n`;
    output += `-I- See report in /tmp/ibdiagnet2\n`;

    return this.createSuccess(output);
  }

  /**
   * ibnetdiscover - Discover InfiniBand fabric topology
   */
  executeIbnetdiscover(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibnetdiscover") ||
        this.createSuccess(`Usage: ibnetdiscover [options]
Options:
  -l, --list           list of connected endpoints
  -g, --grouping       group by switch
  -s, --switch <lid>   show only switch with specified lid
  -H, --Hca_list       list of HCAs only
  -S, --Switch_list    list of switches only
  -p, --ports          show port connections
  -R, --GNDN           show all nodes (including those with no desc)
  -o, --output <file>  output to file
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibnetdiscover 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);

    const hcaOnly = this.hasAnyFlag(parsed, ["H", "Hca_list"]);
    const switchOnly = this.hasAnyFlag(parsed, ["S", "Switch_list"]);
    const showPorts = this.hasAnyFlag(parsed, ["p", "ports"]);

    // Derive switch model from cluster's actual HCA port rate
    const portRate = nodes[0]?.hcas?.[0]?.ports?.[0]?.rate || 400;
    const switchModel =
      portRate >= 800
        ? "QM9790"
        : portRate >= 400
          ? "QM9700"
          : portRate >= 200
            ? "QM8790"
            : "QM8700";

    let output = `#\n`;
    output += `# Topology file: generated by ibnetdiscover\n`;
    output += `#\n`;
    output += `# Topology discovery for fabric (DGX Cluster)\n`;
    output += `#\n\n`;

    // Generate switch entries (rail-optimized spine/leaf architecture)
    if (!hcaOnly) {
      const numSpineSwitches = 4;
      const numLeafSwitches = nodes[0]?.hcas?.length || 8;

      output += `# Spine Switches\n`;
      for (let i = 0; i < numSpineSwitches; i++) {
        const switchGuid = `0x${(0x1000 + i).toString(16).padStart(16, "0")}`;
        output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Spine-${i}" enhanced port 0 lid ${10 + i}\n`;

        if (showPorts) {
          for (let j = 0; j < numLeafSwitches; j++) {
            const leafGuid = `0x${(0x2000 + j).toString(16).padStart(16, "0")}`;
            output += `[${j + 1}]\t"${leafGuid}"[${(i % 18) + 1}]\t\t# "${switchModel}/Rail-${j}" lid ${20 + j}\n`;
          }
        }
        output += "\n";
      }

      output += `# Leaf (Rail) Switches\n`;
      for (let i = 0; i < numLeafSwitches; i++) {
        const switchGuid = `0x${(0x2000 + i).toString(16).padStart(16, "0")}`;
        output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Rail-${i}" enhanced port 0 lid ${20 + i}\n`;

        if (showPorts) {
          for (let j = 0; j < numSpineSwitches; j++) {
            const spineGuid = `0x${(0x1000 + j).toString(16).padStart(16, "0")}`;
            output += `[${j + 1}]\t"${spineGuid}"[${i + 1}]\t\t# "${switchModel}/Spine-${j}" lid ${10 + j}\n`;
          }

          nodes.forEach((node, nodeIdx) => {
            const hca = node.hcas[i];
            if (hca) {
              output += `[${numSpineSwitches + nodeIdx + 1}]\t"${hca.ports[0]?.guid}"[1]\t\t# "${node.hostname}" HCA-${i}\n`;
            }
          });
        }
        output += "\n";
      }
    }

    // Generate HCA entries
    if (!switchOnly) {
      output += `# Channel Adapters (HCAs)\n`;
      nodes.forEach((node, nodeIdx) => {
        node.hcas.forEach((hca, hcaIdx) => {
          output += `Ca\t${hca.ports.length} "${hca.ports[0]?.guid}"\t# "${node.hostname}/${hca.caType}" Rail-${hcaIdx}\n`;

          if (showPorts) {
            hca.ports.forEach((port) => {
              const switchGuid = `0x${(0x2000 + hcaIdx).toString(16).padStart(16, "0")}`;
              output += `[${port.portNumber}](${hca.ports[0]?.guid})\t"${switchGuid}"[${nodeIdx + 5}]\t\t# lid ${port.lid} lmc 0 "${node.hostname}" ${port.state}\n`;
            });
          }
          output += "\n";
        });
      });
    }

    // Summary
    output += `#\n`;
    output += `# Summary:\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.length, 0)} HCAs\n`;
    output += `#   ${4 + (nodes[0]?.hcas?.length || 8)} Switches (4 spine + ${nodes[0]?.hcas?.length || 8} rail)\n`;
    output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.reduce((s, h) => s + h.ports.length, 0), 0)} Ports\n`;
    output += `#\n`;

    return this.createSuccess(output);
  }

  /**
   * ibdev2netdev - Show IB device to network interface mapping
   * Per spec Section 5.1: Network device mapping
   */
  executeIbdev2netdev(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibdev2netdev") ||
        this.createSuccess(`Usage: ibdev2netdev [options]
Options:
  -v, --verbose        verbose output with PCI addresses
  -h, --help           show this help`)
      );
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("No InfiniBand HCAs found");
    }

    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);
    let output = "";

    node.hcas.forEach((hca, idx) => {
      hca.ports.forEach((port) => {
        const netdev = `ib${idx}`;
        const pciAddr = `0000:a${idx}:00.0`; // Simulated PCI address

        if (verbose) {
          // Per spec verbose format: mlx5_0 (0000:a3:00.0) port 1 ==> ib0 (Up)
          output += `${hca.caType} (${pciAddr}) port ${port.portNumber} ==> ${netdev} (${port.state === "Active" ? "Up" : "Down"})\n`;
        } else {
          // Standard format: mlx5_0 port 1 ==> ib0 (Up)
          output += `${hca.caType} port ${port.portNumber} ==> ${netdev} (${port.state === "Active" ? "Up" : "Down"})\n`;
        }
      });
    });

    return this.createSuccess(output);
  }

  /**
   * ibhosts - List all channel adapter (host) nodes in the fabric
   */
  executeIbhosts(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibhosts") ||
        this.createSuccess(`Usage: ibhosts [options]
Options:
  -C, --Ca <ca>        CA name to use
  -P, --Port <port>    port number to use
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibhosts 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);
    let output = `# Fabric host list:\n`;

    nodes.forEach((node) => {
      node.hcas.forEach((hca) => {
        const guid = hca.ports[0]?.guid || "0x0000000000000000";
        output += `Ca\t: ${guid} ports ${hca.ports.length} "${node.hostname} ${hca.caType}"\n`;
      });
    });

    output += `\n${nodes.length} host(s) discovered\n`;

    return this.createSuccess(output);
  }

  /**
   * ibswitches - List all switch nodes discovered in the fabric
   */
  executeIbswitches(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibswitches") ||
        this.createSuccess(`Usage: ibswitches [options]
Options:
  -C, --Ca <ca>        CA name to use
  -P, --Port <port>    port number to use
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibswitches 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);
    const portRate = nodes[0]?.hcas?.[0]?.ports?.[0]?.rate || 400;
    const switchModel =
      portRate >= 800
        ? "QM9790"
        : portRate >= 400
          ? "QM9700"
          : portRate >= 200
            ? "QM8790"
            : "QM8700";

    const numSpineSwitches = 4;
    const numLeafSwitches = nodes[0]?.hcas?.length || 8;

    let output = "";

    // Spine switches
    for (let i = 0; i < numSpineSwitches; i++) {
      const switchGuid = `0x${(0xe41d2d030010 + i).toString(16).padStart(16, "0")}`;
      output += `Switch\t: ${switchGuid} ports 64 "${switchModel} Mellanox Technologies" enhanced port 0 lid ${10 + i}\n`;
    }

    // Leaf/rail switches
    for (let i = 0; i < numLeafSwitches; i++) {
      const switchGuid = `0x${(0xe41d2d030020 + i).toString(16).padStart(16, "0")}`;
      output += `Switch\t: ${switchGuid} ports 64 "${switchModel} Mellanox Technologies" enhanced port 0 lid ${20 + i}\n`;
    }

    return this.createSuccess(output);
  }

  /**
   * ibcableerrors - Report cable error counters across the fabric
   */
  executeIbcableerrors(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibcableerrors") ||
        this.createSuccess(`Usage: ibcableerrors [options]
Options:
  -C, --Ca <ca>        CA name to use
  -P, --Port <port>    port number to use
  -c, --clear          clear errors after read
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibcableerrors 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);

    let output = `Cable Error Report\n`;
    output += `${"=".repeat(60)}\n\n`;

    let totalErrors = 0;
    nodes.forEach((node) => {
      node.hcas.forEach((hca) => {
        hca.ports.forEach((port) => {
          const portErrors =
            port.errors.symbolErrors +
            port.errors.linkDowned +
            port.errors.portRcvErrors;
          totalErrors += portErrors;

          output += `${node.hostname} ${hca.caType} port ${port.portNumber} (lid ${port.lid}):\n`;
          output += `  SymbolErrors:      ${port.errors.symbolErrors}\n`;
          output += `  LinkDowned:        ${port.errors.linkDowned}\n`;
          output += `  PortRcvErrors:     ${port.errors.portRcvErrors}\n`;
          output += `  PortXmitDiscards:  ${port.errors.portXmitDiscards}\n`;

          if (portErrors > 0) {
            output += `  \x1b[33m*** cable errors detected ***\x1b[0m\n`;
          }
          output += `\n`;
        });
      });
    });

    output += `Summary: ${totalErrors} total cable errors across ${nodes.length} hosts\n`;

    return this.createSuccess(output);
  }

  /**
   * ibping - Ping an InfiniBand port by LID or GUID
   */
  executeIbping(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibping") ||
        this.createSuccess(`Usage: ibping [options] -L <lid> | -G <guid>
Options:
  -L, --Lid <lid>      destination LID
  -G, --Guid <guid>    destination GUID
  -c, --count <n>      number of pings (default 5)
  -f, --flood          flood ping
  -S, --Server         start as server
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibping 5.9-0");
    }

    if (this.hasAnyFlag(parsed, ["S", "Server"])) {
      return this.createSuccess("ibping: Listening on port 10000...");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    // Determine target LID from args or default to neighbor
    const targetLid = parsed.positionalArgs[0] || "1";
    const count = 5;

    let output = `Pinging lid ${targetLid}... \n\n`;

    for (let i = 0; i < count; i++) {
      // Deterministic latency based on sequence number
      const latency = (0.42 + i * 0.03).toFixed(3);
      output += `Pong from lid ${targetLid}: time ${latency} ms\n`;
    }

    const avgLatency = (0.42 + ((count - 1) * 0.03) / 2).toFixed(3);
    output += `\n--- lid ${targetLid} ibping statistics ---\n`;
    output += `${count} packets transmitted, ${count} received, 0% packet loss\n`;
    output += `rtt min/avg/max = 0.420/${avgLatency}/0.540 ms\n`;

    return this.createSuccess(output);
  }

  /**
   * ibtracert - Trace the InfiniBand route between two endpoints
   */
  executeIbtracert(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibtracert") ||
        this.createSuccess(`Usage: ibtracert [options] <src-lid> <dest-lid>
Options:
  -n, --no-resolve     don't resolve names
  -m, --mlid <mlid>    multicast LID
  -f, --force          force route
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibtracert 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const nodes = this.resolveAllNodes(context);
    const portRate = nodes[0]?.hcas?.[0]?.ports?.[0]?.rate || 400;
    const switchModel =
      portRate >= 800
        ? "QM9790"
        : portRate >= 400
          ? "QM9700"
          : portRate >= 200
            ? "QM8790"
            : "QM8700";

    const srcLid =
      parsed.positionalArgs[0] || String(node.hcas[0].ports[0].lid);
    const destLid = parsed.positionalArgs[1] || "1";
    const srcGuid = node.hcas[0].ports[0].guid;

    let output = `From ${srcGuid} lid ${srcLid} to lid ${destLid}:\n`;
    output += `\n`;
    output += `[1] -> ${switchModel}/Rail-0 port 5 lid 20 (hop 1)\n`;
    output += `[2] -> ${switchModel}/Spine-0 port 1 lid 10 (hop 2)\n`;
    output += `[3] -> ${switchModel}/Rail-1 port 2 lid 21 (hop 3)\n`;
    output += `[4] -> destination lid ${destLid} (hop 4)\n`;
    output += `\n`;
    output += `Route complete: 4 hops\n`;

    return this.createSuccess(output);
  }

  /**
   * ib_write_bw - InfiniBand write bandwidth benchmark
   */
  executeIbWriteBw(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ib_write_bw") ||
        this.createSuccess(`Usage: ib_write_bw [options] [server]
Options:
  -d, --ib-dev <dev>   IB device
  -s, --size <size>    message size (default 65536)
  -n, --iters <n>      number of iterations (default 1000)
  -b, --bidirectional  bidirectional test
  -D, --duration <s>   run duration in seconds
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ib_write_bw 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const portRate = node.hcas[0].ports[0].rate;
    const maxBwGbps = portRate * 0.97; // ~97% of line rate
    const maxBwMBps = ((maxBwGbps * 1000) / 8).toFixed(2); // Convert Gb/s to MB/s

    let output = `************************************\n`;
    output += `* InfiniBand Write BW Test\n`;
    output += `************************************\n\n`;
    output += ` Dual-port       : OFF\n`;
    output += ` Number of qps   : 1\n`;
    output += ` Connection type  : RC\n`;
    output += ` TX depth         : 128\n`;
    output += ` CQ Moderation    : 100\n`;
    output += ` Link type        : ${getIBStandardName(portRate)}\n`;
    output += ` Max inline data  : 0\n`;
    output += ` rdma_cm QPs      : OFF\n`;
    output += ` Data ex. method  : Ethernet\n\n`;
    output += ` local address: LID ${node.hcas[0].ports[0].lid}\n\n`;
    output += ` #bytes  #iterations  BW peak[MB/sec]  BW average[MB/sec]  MsgRate[Mpps]\n`;
    output += ` 65536   1000         ${maxBwMBps}         ${(parseFloat(maxBwMBps) * 0.98).toFixed(2)}            ${(parseFloat(maxBwMBps) / 65.536).toFixed(2)}\n`;
    output += `\n`;
    output += ` Write bandwidth: ${maxBwGbps.toFixed(2)} Gb/s (${portRate} Gb/s ${getIBStandardName(portRate)} link)\n`;

    return this.createSuccess(output);
  }

  /**
   * ib_read_bw - InfiniBand read bandwidth benchmark
   */
  executeIbReadBw(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ib_read_bw") ||
        this.createSuccess(`Usage: ib_read_bw [options] [server]
Options:
  -d, --ib-dev <dev>   IB device
  -s, --size <size>    message size (default 65536)
  -n, --iters <n>      number of iterations (default 1000)
  -b, --bidirectional  bidirectional test
  -D, --duration <s>   run duration in seconds
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ib_read_bw 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const portRate = node.hcas[0].ports[0].rate;
    const maxBwGbps = portRate * 0.95; // ~95% of line rate for read
    const maxBwMBps = ((maxBwGbps * 1000) / 8).toFixed(2);

    let output = `************************************\n`;
    output += `* InfiniBand Read BW Test\n`;
    output += `************************************\n\n`;
    output += ` Dual-port       : OFF\n`;
    output += ` Number of qps   : 1\n`;
    output += ` Connection type  : RC\n`;
    output += ` TX depth         : 128\n`;
    output += ` CQ Moderation    : 100\n`;
    output += ` Link type        : ${getIBStandardName(portRate)}\n`;
    output += ` Max inline data  : 0\n`;
    output += ` rdma_cm QPs      : OFF\n`;
    output += ` Data ex. method  : Ethernet\n\n`;
    output += ` local address: LID ${node.hcas[0].ports[0].lid}\n\n`;
    output += ` #bytes  #iterations  BW peak[MB/sec]  BW average[MB/sec]  MsgRate[Mpps]\n`;
    output += ` 65536   1000         ${maxBwMBps}         ${(parseFloat(maxBwMBps) * 0.97).toFixed(2)}            ${(parseFloat(maxBwMBps) / 65.536).toFixed(2)}\n`;
    output += `\n`;
    output += ` Read bandwidth: ${maxBwGbps.toFixed(2)} Gb/s (${portRate} Gb/s ${getIBStandardName(portRate)} link)\n`;

    return this.createSuccess(output);
  }

  /**
   * sminfo - Display Subnet Manager information
   */
  executeSminfo(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("sminfo") ||
        this.createSuccess(`Usage: sminfo [options] [<lid> [<port>]]
Options:
  -C, --Ca <ca>        CA name to use
  -P, --Port <port>    port number to use
  -s, --state          show SM state only
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("sminfo 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const smGuid = "0xe41d2d0300e60001";
    const activityCount = 1234567 + node.hcas[0].ports[0].lid;

    const output = `sminfo: sm lid 1 sm guid ${smGuid}, activity count ${activityCount} priority 14 state 3 SMINFO_MASTER\n`;

    return this.createSuccess(output);
  }

  /**
   * smpquery - Query Subnet Management attributes
   */
  executeSmpquery(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("smpquery") ||
        this.createSuccess(`Usage: smpquery [options] <op> <lid> [port]
Operations:
  nodeinfo         Node information
  nodedesc         Node description
  portinfo         Port information
  switchinfo       Switch information
  pkeytable        P_Key table
  sl2vl            SL to VL mapping table
  vlarbitration    VL arbitration table
Options:
  -C, --Ca <ca>        CA name to use
  -P, --Port <port>    port number to use
  -V, --version        show version
  -h, --help           show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("smpquery 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    // Determine the subcommand (parser may place it in subcommands or positionalArgs)
    const subcommand =
      parsed.subcommands[0] || parsed.positionalArgs[0] || "nodeinfo";
    const port = node.hcas[0].ports[0];

    if (subcommand === "nodeinfo") {
      let output = `# Node info: Lid ${port.lid}\n`;
      output += `NodeInfo:\n`;
      output += `BaseVersion:................1\n`;
      output += `ClassVersion:...............1\n`;
      output += `NodeType:...................Channel Adapter\n`;
      output += `NumPorts:...................${node.hcas.reduce((sum, h) => sum + h.ports.length, 0)}\n`;
      output += `SystemImageGUID:............${port.guid}\n`;
      output += `NodeGUID:...................${port.guid}\n`;
      output += `PortGUID:...................${port.guid}\n`;
      output += `PartitionCap:...............128\n`;
      output += `DeviceID:...................0x101b\n`;
      output += `Revision:...................0x000000\n`;
      output += `LocalPortNum:...............${port.portNumber}\n`;
      output += `VendorID:...................0x02c9\n`;

      return this.createSuccess(output);
    } else if (subcommand === "nodedesc") {
      return this.createSuccess(
        `# Node description: Lid ${port.lid}\nNodeDescription:.......${node.hostname} ${node.hcas[0].caType}\n`,
      );
    } else if (subcommand === "portinfo") {
      let output = `# Port info: Lid ${port.lid} port ${port.portNumber}\n`;
      output += `PortInfo:\n`;
      output += `Mkey:.....................0x0000000000000000\n`;
      output += `GidPrefix:................0xfe80000000000000\n`;
      output += `Lid:......................${port.lid}\n`;
      output += `SMLid:....................1\n`;
      output += `LMC:......................0\n`;
      output += `LinkWidthEnabled:.........4X\n`;
      output += `LinkSpeedActive:..........${getIBStandardName(port.rate)}\n`;
      output += `LinkState:................${port.state}\n`;
      output += `PhysLinkState:............${port.physicalState}\n`;

      return this.createSuccess(output);
    }

    return this.createError(`smpquery: unknown operation '${subcommand}'`);
  }

  /**
   * ofed_info - Display OFED/MLNX version information
   */
  executeOfedInfo(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ofed_info") ||
        this.createSuccess(`Usage: ofed_info [options]
Options:
  -s               print short version string
  -n               print package name only
  -V, --version    show version
  -h, --help       show this help`)
      );
    }

    if (this.hasAnyFlag(parsed, ["s"])) {
      return this.createSuccess("MLNX_OFED_LINUX-23.10-1.1.9.0:");
    }

    if (this.hasAnyFlag(parsed, ["n"])) {
      return this.createSuccess("MLNX_OFED_LINUX");
    }

    let output = `MLNX_OFED_LINUX-23.10-1.1.9.0 (OFED-23.10-1.1.9):\n\n`;
    output += `Installed Packages:\n`;
    output += `-------------------\n`;
    output += `mlnx-ofed-kernel-5.9-0.5.6.0\n`;
    output += `kmod-mlnx-ofed-kernel-5.9-0.5.6.0\n`;
    output += `mlnx-tools-5.2.0-0.58\n`;
    output += `ofed-scripts-5.9-0.5.6.0\n`;
    output += `rdma-core-59mlnx43-1\n`;
    output += `libibverbs-59mlnx43-1\n`;
    output += `librdmacm-59mlnx43-1\n`;
    output += `ibverbs-utils-59mlnx43-1\n`;
    output += `infiniband-diags-59mlnx43-1\n`;
    output += `mstflint-4.24.0-1\n`;
    output += `ibutils2-2.1.1-0.58\n`;
    output += `perftest-23.10.0-0.29\n`;
    output += `sharp-3.5.1.MLNX20231116.e1c1440-1\n`;
    output += `ucx-1.16.0-1\n`;
    output += `hcoll-4.8.3221-1\n`;

    return this.createSuccess(output);
  }
}
