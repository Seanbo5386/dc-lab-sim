import type { CommandResult, CommandContext } from "@/types/commands";
import type { DGXNode, InfiniBandHCA } from "@/types/hardware";
import type { ParsedCommand } from "@/utils/commandParser";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";
import { deriveFabricTopology } from "@/simulation/ibFabricTopology";

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
   * Resolve which of a node's HCAs a command should operate on, based on a
   * device-name argument (the RDMA device name, e.g. "mlx5_0" -- hca.caType
   * after the Task 1 identity fix). Falls back to every HCA on the node
   * (today's unconditional behavior) if no argument was given or it doesn't
   * match any HCA -- never silently prints nothing (SIM-13/LIVE-9).
   */
  private resolveHCA(
    node: DGXNode,
    deviceArg: string | undefined,
  ): InfiniBandHCA[] {
    if (!deviceArg) return node.hcas;
    const match = node.hcas.find((h) => h.caType === deviceArg);
    return match ? [match] : node.hcas;
  }

  /**
   * Read a bare device-name argument (e.g. "mlx5_0") for commands that take
   * it positionally (ibstat, ibdev2netdev, show_gids). The parser places
   * bare non-numeric tokens into `subcommands`, so check both locations
   * (same pattern as executeRdma's subcommand detection).
   */
  private getPositionalDeviceArg(parsed: ParsedCommand): string | undefined {
    return parsed.subcommands[0] ?? parsed.positionalArgs[0];
  }

  /**
   * ibstat - Display HCA status
   */
  executeIbstat(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibstat", parsed) || this.handleHelp();
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

    const hcas = this.resolveHCA(node, this.getPositionalDeviceArg(parsed));
    let output = "";
    hcas.forEach((hca, idx) => {
      if (idx > 0) output += "\n";
      const deviceId = hca.model === "ConnectX-7" ? "MT4129" : "MT4123";
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibportstate", parsed) || this.handleHelp()
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibporterrors", parsed) ||
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("iblinkinfo", parsed) || this.handleHelp()
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

    const nodes = this.resolveAllNodes(context);
    const { leafSwitches } = deriveFabricTopology(nodes);

    let output = `InfiniBand Link Information:\n\n`;

    node.hcas.forEach((hca) => {
      hca.ports.forEach((port) => {
        // Rail-optimized topology: HCA i on this node connects to leaf
        // switch i (the same mapping ibnetdiscover's Rail-${hcaIdx}
        // labeling already implies), falling back to leaf 0 if the
        // cluster has more HCAs than leaf switches modeled.
        const peer = leafSwitches[hca.id] ?? leafSwitches[0];
        output += `CA: ${hca.caType}\n`;
        output += `      ${port.guid}\n`;
        output += `         port ${port.portNumber} lid ${port.lid} lmc 0 ${port.state} ${port.rate} Gb/s ${getIBStandardName(port.rate)} (${port.linkLayer})`;
        if (peer) {
          output += ` ==> ${peer.model} "${peer.id}" lid ${peer.lid} port 1`;
        }
        output += `\n`;

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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("perfquery", parsed) || this.handleHelp();
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("perfquery 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    // -C/--Ca selects the local HCA, -P/--Port the port on it (SIM-13);
    // both fall back to the first HCA/port, matching real perfquery defaults.
    const caArg = this.getFlagString(parsed, ["C", "Ca"]);
    const hca = this.resolveHCA(node, caArg || undefined)[0] ?? node.hcas[0];
    const portArg = this.getFlagNumber(
      parsed,
      ["P", "Port"],
      hca.ports[0]?.portNumber ?? 1,
    );
    const port =
      hca.ports.find((p) => p.portNumber === portArg) ?? hca.ports[0];

    // Real, persistent counters (PHYS-7) -- advance under load via
    // MetricsSimulator.updateHcaMetrics, so running perfquery twice on a
    // busy port now shows a genuine nonzero delta.
    const xmitData = port.xmitDataBytes;
    const rcvData = port.rcvDataBytes;
    const xmitPkts = port.xmitPkts;
    const rcvPkts = port.rcvPkts;

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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibdiagnet", parsed) || this.handleHelp();
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

    const allNodes = this.resolveAllNodes(context);
    const { spineSwitches, leafSwitches } = deriveFabricTopology(allNodes);
    const switchCount = spineSwitches.length + leafSwitches.length;

    let output =
      `\n-I- Using port 1 as the local port\n` +
      `-I- Discovering ... \n` +
      `-I- Discovering done\n` +
      `-I- # of nodes: ${node.hcas.length}\n` +
      `-I- # of links: ${node.hcas.length}\n` +
      `-I- # of CAs: ${node.hcas.length}\n` +
      `-I- # of switches: ${switchCount}\n` +
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

    const totalPortErrors = node.hcas.reduce(
      (sum, hca) =>
        sum +
        hca.ports.reduce(
          (portSum, port) =>
            portSum +
            port.errors.symbolErrors +
            port.errors.linkDowned +
            port.errors.portRcvErrors,
          0,
        ),
      0,
    );

    output += `-I- Fabric health check completed\n`;
    if (totalPortErrors > 0) {
      output += `-I- \x1b[33m${totalPortErrors} errors found across the fabric\x1b[0m\n`;
    } else if (node.healthStatus !== "OK") {
      // Node health can be degraded by a non-IB fault (thermal/ECC/power/
      // XID/etc, set via the generic updateNodeHealth mutator any fault
      // type calls) with zero IB port errors -- "0 errors found" would
      // read as clean despite the flagged problem, so use distinct
      // wording rather than reporting a numeric error count of zero.
      output += `-I- \x1b[33mFabric health degraded (node health: ${node.healthStatus})\x1b[0m\n`;
    } else {
      output += `-I- No errors found\n`;
    }
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibnetdiscover", parsed) || this.handleHelp()
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibnetdiscover 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);

    const hcaOnly = this.hasAnyFlag(parsed, ["H", "Hca_list"]);
    const switchOnly = this.hasAnyFlag(parsed, ["S", "Switch_list"]);
    const showPorts = this.hasAnyFlag(parsed, ["p", "ports"]);

    // Single source of switch identity shared with ibswitches/ibtracert
    const { spineSwitches, leafSwitches } = deriveFabricTopology(nodes);

    let output = `#\n`;
    output += `# Topology file: generated by ibnetdiscover\n`;
    output += `#\n`;
    output += `# Topology discovery for fabric (DGX Cluster)\n`;
    output += `#\n\n`;

    // Generate switch entries (rail-optimized spine/leaf architecture)
    if (!hcaOnly) {
      output += `# Spine Switches\n`;
      spineSwitches.forEach((spine, i) => {
        output += `Switch\t64 "${spine.guid}"\t# "${spine.model}/Spine-${i}" enhanced port 0 lid ${spine.lid}\n`;

        if (showPorts) {
          leafSwitches.forEach((leaf, j) => {
            output += `[${j + 1}]\t"${leaf.guid}"[${(i % 18) + 1}]\t\t# "${leaf.model}/Rail-${j}" lid ${leaf.lid}\n`;
          });
        }
        output += "\n";
      });

      output += `# Leaf (Rail) Switches\n`;
      leafSwitches.forEach((leaf, i) => {
        output += `Switch\t64 "${leaf.guid}"\t# "${leaf.model}/Rail-${i}" enhanced port 0 lid ${leaf.lid}\n`;

        if (showPorts) {
          spineSwitches.forEach((spine, j) => {
            output += `[${j + 1}]\t"${spine.guid}"[${i + 1}]\t\t# "${spine.model}/Spine-${j}" lid ${spine.lid}\n`;
          });

          nodes.forEach((node, nodeIdx) => {
            const hca = node.hcas[i];
            if (hca) {
              output += `[${spineSwitches.length + nodeIdx + 1}]\t"${hca.ports[0]?.guid}"[1]\t\t# "${node.hostname}" HCA-${i}\n`;
            }
          });
        }
        output += "\n";
      });
    }

    // Generate HCA entries
    if (!switchOnly) {
      output += `# Channel Adapters (HCAs)\n`;
      nodes.forEach((node, nodeIdx) => {
        node.hcas.forEach((hca, hcaIdx) => {
          output += `Ca\t${hca.ports.length} "${hca.ports[0]?.guid}"\t# "${node.hostname}/${hca.caType}" Rail-${hcaIdx}\n`;

          if (showPorts) {
            hca.ports.forEach((port) => {
              const switchGuid =
                leafSwitches[hcaIdx]?.guid ?? "0x0000000000000000";
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
    output += `#   ${spineSwitches.length + leafSwitches.length} Switches (${spineSwitches.length} spine + ${leafSwitches.length} rail)\n`;
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibdev2netdev", parsed) ||
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
    const hcas = this.resolveHCA(node, this.getPositionalDeviceArg(parsed));
    let output = "";

    hcas.forEach((hca) => {
      // Index into the node's full HCA list so netdev/PCI names stay stable
      // when the output is filtered to a single device.
      const idx = node.hcas.indexOf(hca);
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibhosts", parsed) || this.handleHelp();
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibswitches", parsed) || this.handleHelp()
      );
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibswitches 5.9-0");
    }

    const nodes = this.resolveAllNodes(context);
    const { spineSwitches, leafSwitches } = deriveFabricTopology(nodes);

    let output = "";

    for (const sw of spineSwitches) {
      output += `Switch\t: ${sw.guid} ports 64 "${sw.model} Mellanox Technologies" enhanced port 0 lid ${sw.lid}\n`;
    }

    for (const sw of leafSwitches) {
      output += `Switch\t: ${sw.guid} ports 64 "${sw.model} Mellanox Technologies" enhanced port 0 lid ${sw.lid}\n`;
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibcableerrors", parsed) ||
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibping", parsed) || this.handleHelp();
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

    // Determine target LID from args, then verify it actually exists
    // somewhere in the fabric (spine/leaf switch LIDs plus every HCA
    // port LID across the cluster) instead of echoing it back
    // unconditionally (SIM-13).
    const targetLid = parsed.positionalArgs[0] || "1";
    const targetLidNum = parseInt(targetLid, 10);

    const nodes = this.resolveAllNodes(context);
    const { spineSwitches, leafSwitches } = deriveFabricTopology(nodes);
    const allKnownLids = new Set<number>([
      ...spineSwitches.map((s) => s.lid),
      ...leafSwitches.map((s) => s.lid),
      ...nodes.flatMap((n) => n.hcas.flatMap((h) => h.ports.map((p) => p.lid))),
    ]);

    if (!allKnownLids.has(targetLidNum)) {
      return this.createSuccess(
        `Pinging lid ${targetLid}...\n\nFAILED: unreachable/no route to lid ${targetLid}\n`,
      );
    }

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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibtracert", parsed) || this.handleHelp();
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibtracert 5.9-0");
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const nodes = this.resolveAllNodes(context);
    const { spineSwitches, leafSwitches } = deriveFabricTopology(nodes);
    const switchModel = spineSwitches[0]?.model ?? "QM9700";

    const srcLid =
      parsed.positionalArgs[0] || String(node.hcas[0].ports[0].lid);
    const destLid = parsed.positionalArgs[1] || "1";
    const srcGuid = node.hcas[0].ports[0].guid;

    let output = `From ${srcGuid} lid ${srcLid} to lid ${destLid}:\n`;
    output += `\n`;
    output += `[1] -> ${switchModel}/Rail-0 port 5 lid ${leafSwitches[0]?.lid ?? 20} (hop 1)\n`;
    output += `[2] -> ${switchModel}/Spine-0 port 1 lid ${spineSwitches[0]?.lid ?? 10} (hop 2)\n`;
    output += `[3] -> ${switchModel}/Rail-1 port 2 lid ${leafSwitches[1]?.lid ?? 21} (hop 3)\n`;
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ib_write_bw", parsed) || this.handleHelp()
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ib_read_bw", parsed) || this.handleHelp()
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("sminfo", parsed) || this.handleHelp();
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("smpquery", parsed) || this.handleHelp();
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
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ofed_info", parsed) ||
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

  executeIbstatus(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("ibstatus", parsed) || this.handleHelp();
    }

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess("ibstatus 5.9-0");
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    if (node.hcas.length === 0) {
      return this.createError("No InfiniBand HCAs found");
    }

    const lines: string[] = [];
    for (const hca of node.hcas) {
      for (const port of hca.ports) {
        lines.push(
          `Infiniband device '${hca.caType}' port ${port.portNumber} status:`,
        );
        lines.push(`\tdefault gid:\t ${port.guid}`);
        lines.push(`\tbase lid:\t ${port.lid}`);
        lines.push(`\tsm lid:\t\t 1`);
        const stateLabel = port.state === "Active" ? "4: ACTIVE" : "1: DOWN";
        // IBTA physical port states: 1=Sleep, 2=Polling, 3=Disabled,
        // 4=PortConfigurationTraining, 5=LinkUp, 6=LinkErrorRecovery.
        // "LinkDown" has no IBTA number of its own; it maps to Disabled.
        const physStateLabel =
          port.physicalState === "LinkUp"
            ? "5: LinkUp"
            : port.physicalState === "Polling"
              ? "2: Polling"
              : port.physicalState === "Sleep"
                ? "1: Sleep"
                : "3: Disabled";
        lines.push(`\tstate:\t\t ${stateLabel}`);
        lines.push(`\tphys state:\t ${physStateLabel}`);
        lines.push(
          `\trate:\t\t ${port.rate} Gb/sec (4X ${getIBStandardName(port.rate)})`,
        );
        lines.push(``);
      }
    }

    return this.createSuccess(lines.join("\n").trimEnd());
  }

  executeIbvDevinfo(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return (
        this.getHelpFromRegistry("ibv_devinfo", parsed) || this.handleHelp()
      );
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("No RDMA devices found");
    }

    if (this.hasAnyFlag(parsed, ["list", "l"])) {
      const lines: string[] = [];
      for (const [idx, hca] of node.hcas.entries()) {
        lines.push(`    ${idx}: ${hca.caType}`);
      }
      return this.createSuccess(lines.join("\n"));
    }

    // Real ibv_devinfo selects a device via -d/--ib-dev; -l (handled above)
    // always lists every device regardless.
    const deviceArg = this.getFlagString(parsed, ["d", "ib-dev"]);
    const hcas = this.resolveHCA(node, deviceArg || undefined);

    const lines: string[] = [];
    for (const [idx, hca] of hcas.entries()) {
      if (idx > 0) lines.push("");
      const vendorPartId = hca.model === "ConnectX-7" ? "4129" : "4123";
      lines.push(`hca_id:\t${hca.caType}`);
      lines.push(`\ttransport:\t\t\tInfiniBand (0)`);
      lines.push(`\tfw_ver:\t\t\t\t${hca.firmwareVersion}`);
      lines.push(`\tnode_guid:\t\t\t${hca.ports[0]?.guid}`);
      lines.push(`\tsys_image_guid:\t\t\t${hca.ports[0]?.guid}`);
      lines.push(`\tvendor_id:\t\t\t0x02c9`);
      lines.push(`\tvendor_part_id:\t\t\t${vendorPartId}`);
      lines.push(`\thw_ver:\t\t\t\t0x0`);
      lines.push(`\tphys_port_cnt:\t\t\t${hca.ports.length}`);

      for (const port of hca.ports) {
        lines.push(`\t\tport:\t${port.portNumber}`);
        const portStateLabel =
          port.state === "Active"
            ? "PORT_ACTIVE (4)"
            : port.state === "Polling"
              ? "PORT_POLLING (2)"
              : "PORT_DOWN (1)";
        lines.push(`\t\t\tstate:\t\t\t${portStateLabel}`);
        lines.push(`\t\t\tmax_mtu:\t\t4096 (5)`);
        lines.push(`\t\t\tactive_mtu:\t\t4096 (5)`);
        lines.push(`\t\t\tsm_lid:\t\t\t1`);
        lines.push(`\t\t\tport_lid:\t\t${port.lid}`);
        lines.push(`\t\t\tport_lmc:\t\t0x00`);
        lines.push(`\t\t\tlink_layer:\t\t${port.linkLayer}`);
      }
    }

    return this.createSuccess(lines.join("\n"));
  }

  executeShowGids(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("show_gids", parsed) || this.handleHelp();
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("No RDMA devices found");
    }

    const hcas = this.resolveHCA(node, this.getPositionalDeviceArg(parsed));

    const lines: string[] = [
      "DEV     PORT  INDEX  GID                                      IPv4            VER   DEV",
      "---     ----  -----  ---                                      ------------    ---   ---",
    ];

    for (const hca of hcas) {
      for (const port of hca.ports) {
        const guidCompact = (port.guid || "").replace(/:/g, "");
        lines.push(
          `${hca.caType}  ${port.portNumber}     0      fe80:0000:0000:0000:${guidCompact}                 v2    ndev`,
        );
        lines.push(
          `${hca.caType}  ${port.portNumber}     1      0000:0000:0000:0000:0000:ffff:c0a8:0${port.portNumber}01  192.168.${port.portNumber}.1   v1    ndev`,
        );
      }
    }

    return this.createSuccess(lines.join("\n"));
  }

  executeRdma(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry("rdma", parsed) || this.handleHelp();
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No RDMA devices found");
    }

    // Parser may place bare tokens in subcommands or positionalArgs.
    const args = [...parsed.subcommands, ...parsed.positionalArgs];
    const subcommand = args[0];
    // Real rdma selects a device positionally after the object/`show` verb
    // (e.g. `rdma dev show mlx5_0`, `rdma link show mlx5_0/1`). The link
    // form may carry a `/PORT` suffix -- match on the device part.
    const deviceArg = args
      .slice(1)
      .filter((token) => token !== "show")[0]
      ?.split("/")[0];

    if (subcommand === "dev" || subcommand === "device") {
      const lines: string[] = [];
      for (const hca of this.resolveHCA(node, deviceArg)) {
        lines.push(
          `${node.hcas.indexOf(hca) + 1}: ${hca.caType}: node_type ca fw ${hca.firmwareVersion} node_guid ${hca.ports[0]?.guid} sys_image_guid ${hca.ports[0]?.guid}`,
        );
      }
      return this.createSuccess(lines.join("\n"));
    }

    if (subcommand === "link") {
      const lines: string[] = [];
      for (const hca of this.resolveHCA(node, deviceArg)) {
        for (const port of hca.ports) {
          const stateLabel = port.state === "Active" ? "ACTIVE" : "DOWN";
          const physStateLabel =
            port.physicalState === "LinkUp" ? "LINK_UP" : "LINK_DOWN";
          lines.push(
            `link ${hca.caType}/${port.portNumber} state ${stateLabel} physical_state ${physStateLabel} netdev eth${port.portNumber}`,
          );
        }
      }
      return this.createSuccess(lines.join("\n"));
    }

    if (subcommand === "res" || subcommand === "resource") {
      const lines: string[] = [];
      for (const hca of this.resolveHCA(node, deviceArg)) {
        lines.push(`${hca.caType}: qp 4 cq 8 mr 16 pd 4`);
      }
      return this.createSuccess(lines.join("\n"));
    }

    return this.createSuccess(
      "Usage: rdma [ OPTIONS ] OBJECT { COMMAND | help }\n" +
        "where  OBJECT := { dev | link | resource | statistic }",
    );
  }

  executeIbWriteLat(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    return this.executeLatencyTest(parsed, context, "ib_write_lat", "Write", [
      { bytes: 2, min: 1.12, max: 5.43, avg: 1.28, median: 1.21 },
      { bytes: 64, min: 1.15, max: 5.67, avg: 1.31, median: 1.24 },
      { bytes: 512, min: 1.24, max: 6.12, avg: 1.42, median: 1.33 },
    ]);
  }

  executeIbReadLat(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    return this.executeLatencyTest(parsed, context, "ib_read_lat", "Read", [
      { bytes: 2, min: 1.35, max: 6.21, avg: 1.52, median: 1.42 },
      { bytes: 64, min: 1.38, max: 6.45, avg: 1.56, median: 1.46 },
      { bytes: 512, min: 1.48, max: 7.02, avg: 1.68, median: 1.55 },
    ]);
  }

  executeIbSendLat(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    return this.executeLatencyTest(parsed, context, "ib_send_lat", "Send", [
      { bytes: 2, min: 0.95, max: 4.87, avg: 1.08, median: 1.02 },
      { bytes: 64, min: 0.98, max: 5.12, avg: 1.12, median: 1.05 },
      { bytes: 512, min: 1.08, max: 5.89, avg: 1.24, median: 1.15 },
    ]);
  }

  executeIbSendBw(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    return this.executeBandwidthTest(
      parsed,
      context,
      "ib_send_bw",
      "Send",
      0.93,
    );
  }

  private executeLatencyTest(
    parsed: ParsedCommand,
    context: CommandContext,
    registryKey: string,
    testName: string,
    samples: {
      bytes: number;
      min: number;
      max: number;
      avg: number;
      median: number;
    }[],
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry(registryKey, parsed) || this.handleHelp();
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const portRate = node.hcas[0].ports[0]?.rate || 400;
    const lines = [
      `************************************`,
      `* InfiniBand ${testName} Latency Test`,
      `************************************`,
      ``,
      ` Dual-port       : OFF`,
      ` Number of qps   : 1`,
      ` Connection type  : RC`,
      ` Link type        : ${getIBStandardName(portRate)}`,
      ``,
      ` local address: LID ${node.hcas[0].ports[0].lid}`,
      ``,
      ` #bytes  #iterations  t_min[usec]  t_max[usec]  t_avg[usec]  t_median[usec]`,
    ];

    for (const s of samples) {
      lines.push(
        ` ${s.bytes.toString().padEnd(8)} 1000         ${s.min.toFixed(2).padEnd(12)} ${s.max.toFixed(2).padEnd(12)} ${s.avg.toFixed(2).padEnd(12)} ${s.median.toFixed(2)}`,
      );
    }

    return this.createSuccess(lines.join("\n"));
  }

  private executeBandwidthTest(
    parsed: ParsedCommand,
    context: CommandContext,
    registryKey: string,
    testName: string,
    efficiencyFactor: number,
  ): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.getHelpFromRegistry(registryKey, parsed) || this.handleHelp();
    }

    const node = this.getNode(context);
    if (!node || node.hcas.length === 0) {
      return this.createError("Error: No HCA found");
    }

    const portRate = node.hcas[0].ports[0]?.rate || 400;
    const maxBwGbps = portRate * efficiencyFactor;
    const maxBwMBps = ((maxBwGbps * 1000) / 8).toFixed(2);
    const avgBwMBps = (parseFloat(maxBwMBps) * 0.96).toFixed(2);
    const msgRate = (parseFloat(maxBwMBps) / 65.536).toFixed(2);

    const lines = [
      `************************************`,
      `* InfiniBand ${testName} BW Test`,
      `************************************`,
      ``,
      ` Dual-port       : OFF`,
      ` Number of qps   : 1`,
      ` Connection type  : RC`,
      ` TX depth         : 128`,
      ` Link type        : ${getIBStandardName(portRate)}`,
      ``,
      ` local address: LID ${node.hcas[0].ports[0].lid}`,
      ``,
      ` #bytes  #iterations  BW peak[MB/sec]  BW average[MB/sec]  MsgRate[Mpps]`,
      ` 65536   1000         ${maxBwMBps}         ${avgBwMBps}            ${msgRate}`,
      ``,
      ` ${testName} bandwidth: ${maxBwGbps.toFixed(2)} Gb/s (${portRate} Gb/s ${getIBStandardName(portRate)} link)`,
    ];

    return this.createSuccess(lines.join("\n"));
  }
}
