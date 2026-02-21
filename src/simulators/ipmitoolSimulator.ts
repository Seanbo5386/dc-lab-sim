import type { CommandResult, CommandContext } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";
import type { BMCSensor } from "@/types/hardware";
import {
  BaseSimulator,
  type SimulatorMetadata,
} from "@/simulators/BaseSimulator";

export class IpmitoolSimulator extends BaseSimulator {
  /**
   * Persistent state for cross-command data sharing
   * Per spec Section 6.1: raw power limit should persist to dcmi power reading
   */
  private powerLimitState = {
    limit: 12000, // Default power limit in watts
    activationState: 0, // 0 = no active policy, 1 = active
    correctionTime: 6000, // ms
    samplingPeriod: 1, // seconds
  };

  constructor() {
    super();
    this.registerCommands();
    this.registerValidFlagsAndSubcommands();
    this.initializeDefinitionRegistry();
  }

  /**
   * Register valid flags and subcommands for fuzzy matching
   */
  private registerValidFlagsAndSubcommands(): void {
    // Register valid root-level flags
    this.registerValidFlags([
      { short: "h", long: "help" },
      { short: "V", long: "version" },
      { short: "v", long: "verbose" },
      { short: "c", long: "csv" },
      { short: "d", long: "device" },
      { short: "I", long: "interface" },
      { short: "H", long: "hostname" },
      { short: "p", long: "port" },
      { short: "U", long: "username" },
      { short: "f", long: "file" },
      { short: "z", long: "size" },
      { short: "S", long: "sdr" },
      { short: "D", long: "tty" },
      { short: "L", long: "level" },
      { short: "A", long: "authtype" },
      { short: "t", long: "target" },
      { short: "b", long: "channel" },
      { short: "C", long: "ciphersuite" },
      { short: "l", long: "lun" },
      { short: "m", long: "address" },
      { short: "o", long: "oemtype" },
      { short: "O", long: "seloem" },
      { short: "N", long: "timeout" },
      { short: "R", long: "retry" },
      { short: "P", long: "password", aliases: ["E"] },
      { short: "a", long: "prompt" },
    ]);

    // Register valid subcommands
    this.registerValidSubcommands([
      "sensor",
      "mc",
      "chassis",
      "lan",
      "user",
      "sdr",
      "sel",
      "fru",
      "dcmi",
      "raw",
      "power",
      "event",
      "pef",
      "sol",
      "channel",
      "session",
      "nm",
      "sunoem",
      "kontronoem",
      "picmg",
      "fwum",
      "firewall",
      "delloem",
      "shell",
      "exec",
      "set",
      "hpm",
    ]);
  }

  /**
   * Register all ipmitool subcommands with metadata
   */
  private registerCommands(): void {
    this.registerCommand("sensor", this.handleSensor.bind(this), {
      name: "sensor",
      description: "Print detailed sensor information",
      usage: "ipmitool sensor [list|get|thresh]",
      flags: [],
      examples: ["ipmitool sensor list", 'ipmitool sensor get "CPU Temp"'],
    });

    this.registerCommand("mc", this.handleMc.bind(this), {
      name: "mc",
      description: "Management Controller status and global enables",
      usage: "ipmitool mc [info|reset|guid]",
      flags: [],
      examples: ["ipmitool mc info"],
    });

    this.registerCommand("chassis", this.handleChassis.bind(this), {
      name: "chassis",
      description: "Get chassis status and set power state",
      usage: "ipmitool chassis [status|power]",
      flags: [],
      examples: [
        "ipmitool chassis status",
        "ipmitool chassis power status",
        "ipmitool chassis power on",
      ],
    });

    this.registerCommand("lan", this.handleLan.bind(this), {
      name: "lan",
      description: "Configure LAN Channels",
      usage: "ipmitool lan [print|set] [channel]",
      flags: [],
      examples: [
        "ipmitool lan print 1",
        "ipmitool lan set 1 ipaddr 192.168.1.100",
      ],
    });

    this.registerCommand("user", this.handleUser.bind(this), {
      name: "user",
      description: "Configure Management Controller users",
      usage: "ipmitool user [list|set|enable|disable]",
      flags: [],
      examples: ["ipmitool user list 1", "ipmitool user set name 2 admin"],
    });

    this.registerCommand("sdr", this.handleSdr.bind(this), {
      name: "sdr",
      description: "Print Sensor Data Repository entries and readings",
      usage: "ipmitool sdr [list|info|type|get]",
      flags: [],
      examples: ["ipmitool sdr list"],
    });

    this.registerCommand("sel", this.handleSel.bind(this), {
      name: "sel",
      description: "Print System Event Log (SEL)",
      usage: "ipmitool sel [list|elist|clear|info]",
      flags: [],
      examples: [
        "ipmitool sel list",
        "ipmitool sel elist",
        "ipmitool sel clear",
      ],
    });

    this.registerCommand("fru", this.handleFru.bind(this), {
      name: "fru",
      description: "Print built-in FRU and scan SDR for FRU locators",
      usage: "ipmitool fru [print|list]",
      flags: [],
      examples: ["ipmitool fru print"],
    });

    this.registerCommand("dcmi", this.handleDcmi.bind(this), {
      name: "dcmi",
      description: "Data Center Management Interface operations",
      usage: "ipmitool dcmi [power|discover|sensors]",
      flags: [],
      examples: ["ipmitool dcmi power reading", "ipmitool dcmi discover"],
    });

    this.registerCommand("raw", this.handleRaw.bind(this), {
      name: "raw",
      description: "Send a RAW IPMI request and print response",
      usage: "ipmitool raw <netfn> <cmd> [data]",
      flags: [],
      examples: [
        "ipmitool raw 0x3c 0x81 0x05 0xE0 0x2E", // Set power limit
        "ipmitool raw 0x3c 0x80 0x05", // Get power limit
      ],
    });

    this.registerCommand("power", this.handlePower.bind(this), {
      name: "power",
      description: "Shortcut to chassis power commands",
      usage: "ipmitool power [status|on|off|cycle|reset]",
      flags: [],
      examples: ["ipmitool power status", "ipmitool power on"],
    });
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "ipmitool",
      version: "1.8.18",
      description: "Intelligent Platform Management Interface utility",
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  /**
   * Handle --version flag
   */
  protected handleVersion(): CommandResult {
    return this.createSuccess(`ipmitool version 1.8.18`);
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    // Handle root-level flags (--version, --help, -V, -h) first
    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.handleVersion();
    }

    if (
      this.hasAnyFlag(parsed, ["help", "h"]) ||
      parsed.subcommands[0] === "help"
    ) {
      const subcommand =
        parsed.subcommands[0] === "help"
          ? parsed.subcommands[1]
          : parsed.subcommands[0];
      return (
        this.getHelpFromRegistry("ipmitool", parsed) ||
        this.handleHelp(subcommand)
      );
    }

    // Only validate root-level flags when no subcommand is specified
    // Subcommand flags are validated within individual handlers
    if (parsed.subcommands.length === 0) {
      const flagError = this.validateFlagsWithRegistry(parsed, "ipmitool");
      if (flagError) return flagError;
    }

    // Get the subcommand
    const subcommand = parsed.subcommands[0];

    if (!subcommand) {
      return this.handleHelp();
    }

    // Route to command handler
    const handler = this.getCommand(subcommand);

    if (!handler) {
      return this.createError(
        `Invalid command: ${subcommand}\n\n` +
          `Commands:\n` +
          `       sensor        Print detailed sensor information\n` +
          `       mc            Management Controller status and global enables\n` +
          `       chassis       Get chassis status and set power state\n` +
          `       lan           Configure LAN Channels\n` +
          `       user          Configure Management Controller users\n` +
          `       sdr           Print Sensor Data Repository entries and readings\n` +
          `       sel           Print System Event Log (SEL)\n` +
          `       fru           Print built-in FRU and scan SDR for FRU locators\n`,
      );
    }

    return this.safeExecuteHandler(handler, parsed, context) as CommandResult;
  }

  private getNode(context: CommandContext) {
    return this.resolveNode(context) || this.resolveAllNodes(context)[0];
  }

  /**
   * Format sensor list with pipe-delimited columns and thresholds
   * Per spec Section 4.1: Column alignment with | delimiter
   * Format: Name | Reading | Units | Status | LNR | LC | LNC | UNC | UC | UNR
   * (LNR=Lower Non-Recoverable, LC=Lower Critical, LNC=Lower Non-Critical,
   *  UNC=Upper Non-Critical, UC=Upper Critical, UNR=Upper Non-Recoverable)
   */
  private formatSensorList(sensors: BMCSensor[]): string {
    let output = "";

    sensors.forEach((sensor) => {
      // Determine status: ok, nc (non-critical), cr (critical), nr (non-recoverable)
      let status = "ok";
      if (sensor.status === "Warning") status = "nc";
      else if (sensor.status === "Critical") status = "cr";

      // Format reading with appropriate precision
      const reading = sensor.reading.toFixed(3);

      // Get thresholds (with defaults based on sensor type)
      const thresholds = this.getSensorThresholds(sensor);

      // Build pipe-delimited line
      // Each column is pipe-separated with consistent spacing
      output += `${sensor.name.padEnd(16)} | `;
      output += `${reading.padStart(8)} | `;
      output += `${sensor.unit.padEnd(10)} | `;
      output += `${status.padEnd(2)} | `;
      output += `${thresholds.lnr.padStart(7)} | `;
      output += `${thresholds.lc.padStart(7)} | `;
      output += `${thresholds.lnc.padStart(7)} | `;
      output += `${thresholds.unc.padStart(8)} | `;
      output += `${thresholds.uc.padStart(8)} | `;
      output += `${thresholds.unr.padStart(8)}`;
      output += "\n";
    });

    return output;
  }

  /**
   * Get sensor thresholds based on sensor type/name
   * Per spec: Use 'na' for non-applicable thresholds
   */
  private getSensorThresholds(sensor: BMCSensor): {
    lnr: string;
    lc: string;
    lnc: string;
    unc: string;
    uc: string;
    unr: string;
  } {
    const name = sensor.name.toLowerCase();

    // Temperature sensors
    if (name.includes("temp")) {
      return {
        lnr: "-9.000",
        lc: "-7.000",
        lnc: "-5.000",
        unc: "80.000",
        uc: "85.000",
        unr: "90.000",
      };
    }

    // GPU temperature sensors - higher thresholds
    if (name.includes("gpu")) {
      return {
        lnr: "0.000",
        lc: "0.000",
        lnc: "0.000",
        unc: "83.000",
        uc: "90.000",
        unr: "100.000",
      };
    }

    // Power sensors - typically only upper thresholds
    if (
      name.includes("pwr") ||
      name.includes("power") ||
      name.includes("watts")
    ) {
      return {
        lnr: "na",
        lc: "na",
        lnc: "na",
        unc: "19890.000",
        uc: "19890.000",
        unr: "na",
      };
    }

    // Fan sensors - typically only lower thresholds
    if (name.includes("fan") || name.includes("rpm")) {
      return {
        lnr: "300.000",
        lc: "500.000",
        lnc: "800.000",
        unc: "na",
        uc: "na",
        unr: "na",
      };
    }

    // Voltage sensors
    if (
      name.includes("volt") ||
      (name.includes("v") && sensor.unit.toLowerCase() === "volts")
    ) {
      return {
        lnr: "0.000",
        lc: "0.000",
        lnc: "0.000",
        unc: "15.000",
        uc: "16.000",
        unr: "17.000",
      };
    }

    // Default - show na for all
    return {
      lnr: "na",
      lc: "na",
      lnc: "na",
      unc: "na",
      uc: "na",
      unr: "na",
    };
  }

  /**
   * Handle sensor command
   */
  private handleSensor(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "list" || !subsubcommand) {
      return this.createSuccess(this.formatSensorList(node.bmc.sensors));
    }

    return this.createError(
      "sensor: Missing or invalid subcommand\nUsage: ipmitool sensor [list|get|thresh]",
    );
  }

  /**
   * Handle mc command
   */
  private handleMc(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "info") {
      const output =
        `Device ID                 : 32\n` +
        `Device Revision           : 1\n` +
        `Firmware Revision         : ${node.bmc.firmwareVersion}\n` +
        `IPMI Version              : 2.0\n` +
        `Manufacturer ID           : 10876\n` +
        `Manufacturer Name         : ${node.bmc.manufacturer}\n` +
        `Product ID                : 2384\n` +
        `Product Name              : DGX BMC\n` +
        `Device Available          : yes\n` +
        `Provides Device SDRs      : yes\n` +
        `Additional Device Support :\n` +
        `    Sensor Device\n` +
        `    SDR Repository Device\n` +
        `    SEL Device\n` +
        `    FRU Inventory Device\n` +
        `    IPMB Event Receiver\n` +
        `    Chassis Device\n`;
      return this.createSuccess(output);
    }

    return this.createError(
      "mc: Missing or invalid subcommand\nUsage: ipmitool mc [info|reset|guid]",
    );
  }

  /**
   * Handle chassis command
   */
  private handleChassis(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "status") {
      const output =
        `System Power         : ${node.bmc.powerState === "On" ? "on" : "off"}\n` +
        `Power Overload       : false\n` +
        `Power Interlock      : inactive\n` +
        `Main Power Fault     : false\n` +
        `Power Control Fault  : false\n` +
        `Power Restore Policy : always-on\n` +
        `Last Power Event     : \n` +
        `Chassis Intrusion    : inactive\n` +
        `Front-Panel Lockout  : inactive\n` +
        `Drive Fault          : false\n` +
        `Cooling/Fan Fault    : false\n`;
      return this.createSuccess(output);
    }

    if (subsubcommand === "power") {
      const action = parsed.subcommands[2];
      if (action === "status") {
        return this.createSuccess(
          `Chassis Power is ${node.bmc.powerState === "On" ? "on" : "off"}`,
        );
      } else if (["on", "off", "cycle", "reset"].includes(action)) {
        return this.createSuccess(
          `Chassis Power Control: ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        );
      }
      return this.createError(
        "chassis power: Missing or invalid action\nUsage: ipmitool chassis power [status|on|off|cycle|reset]",
      );
    }

    return this.createError(
      "chassis: Missing or invalid subcommand\nUsage: ipmitool chassis [status|power]",
    );
  }

  /**
   * Handle lan command
   */
  private handleLan(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "print") {
      const output =
        `Set in Progress         : Set Complete\n` +
        `Auth Type Support       : NONE MD2 MD5 PASSWORD\n` +
        `Auth Type Enable        : Callback : MD2 MD5 PASSWORD\n` +
        `                        : User     : MD2 MD5 PASSWORD\n` +
        `                        : Operator : MD2 MD5 PASSWORD\n` +
        `                        : Admin    : MD2 MD5 PASSWORD\n` +
        `                        : OEM      : MD2 MD5 PASSWORD\n` +
        `IP Address Source       : Static Address\n` +
        `IP Address              : ${node.bmc.ipAddress}\n` +
        `Subnet Mask             : 255.255.255.0\n` +
        `MAC Address             : ${node.bmc.macAddress}\n` +
        `SNMP Community String   : public\n` +
        `IP Header               : TTL=0x40 Flags=0x40 Precedence=0x00 TOS=0x10\n` +
        `BMC ARP Control         : ARP Responses Enabled, Gratuitous ARP Disabled\n` +
        `Default Gateway IP      : 192.168.0.1\n` +
        `802.1q VLAN ID          : Disabled\n` +
        `802.1q VLAN Priority    : 0\n` +
        `RMCP+ Cipher Suites     : 0,1,2,3,6,7,8,11,12\n` +
        `Cipher Suite Priv Max   : Not Available\n`;
      return this.createSuccess(output);
    }

    if (subsubcommand === "set") {
      const param = parsed.subcommands[3];
      const value = parsed.subcommands[4];
      if (param && value) {
        return this.createSuccess(
          `Setting LAN parameter "${param}" to "${value}"`,
        );
      }
      return this.createError(
        "lan set: Missing parameter or value\nUsage: ipmitool lan set <channel> <param> <value>",
      );
    }

    return this.createError(
      "lan: Missing or invalid subcommand\nUsage: ipmitool lan [print|set] <channel>",
    );
  }

  /**
   * Handle user command
   */
  private handleUser(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "list") {
      const output =
        `ID  Name             Callin  Link Auth  IPMI Msg   Channel Priv Limit\n` +
        `1                    true    false      true       ADMINISTRATOR\n` +
        `2   admin            true    false      true       ADMINISTRATOR\n` +
        `3   (Empty User)     true    false      false      NO ACCESS\n`;
      return this.createSuccess(output);
    }

    if (subsubcommand === "set") {
      const action = parsed.subcommands[2];
      const userId = parsed.subcommands[3];
      if (action && userId) {
        return this.createSuccess(
          `Set User ${action} command successful (user ${userId})`,
        );
      }
      return this.createError(
        "user set: Missing action or user ID\nUsage: ipmitool user set <action> <user_id>",
      );
    }

    return this.createError(
      "user: Missing or invalid subcommand\nUsage: ipmitool user [list|set|enable|disable]",
    );
  }

  /**
   * Handle sdr command
   */
  private handleSdr(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "list" || !subsubcommand) {
      let output = "";
      node.bmc.sensors.forEach((sensor) => {
        output += `${sensor.name.padEnd(20)} | ${sensor.reading.toFixed(2)} ${sensor.unit} | ${sensor.status}\n`;
      });
      return this.createSuccess(output);
    }

    return this.createError(
      "sdr: Missing or invalid subcommand\nUsage: ipmitool sdr [list|info|type|get]",
    );
  }

  /**
   * Handle sel command - System Event Log
   * Per spec Section 7.2: Cross-tool fault propagation via SEL entries
   */
  private handleSel(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const subsubcommand = parsed.subcommands[1];
    const node = this.getNode(context);

    // Support both 'list' and 'elist' (extended list with verbose descriptions)
    if (subsubcommand === "list" || subsubcommand === "elist") {
      if (!node) {
        return this.createSuccess("SEL has no entries\n");
      }

      // Generate SEL entries from GPU state - cross-tool fault propagation
      const entries: string[] = [];
      let recordId = 1;
      const isExtended = subsubcommand === "elist";

      node.gpus.forEach((gpu, gpuIdx) => {
        // Add XID error SEL entries
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          gpu.xidErrors.forEach((xid) => {
            const hexId = recordId.toString(16).padStart(4, "0");
            const timeStr = new Date(xid.timestamp).toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            if (isExtended) {
              entries.push(
                `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | XID ${xid.code} - ${xid.description} | Asserted`,
              );
            } else {
              entries.push(
                `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | XID ${xid.code} | ${xid.description}`,
              );
            }
            recordId++;
          });
        }

        // Add temperature warning SEL entries
        if (gpu.temperature > 80) {
          const hexId = recordId.toString(16).padStart(4, "0");
          const timeStr = new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          if (isExtended) {
            entries.push(
              `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | Temperature - Upper Critical going high (${gpu.temperature}C) | Asserted`,
            );
          } else {
            entries.push(
              `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | Upper Critical | Temperature (${gpu.temperature}C) exceeded threshold`,
            );
          }
          recordId++;
        }

        // Add ECC error SEL entries
        if (gpu.eccErrors && gpu.eccErrors.doubleBit > 0) {
          const hexId = recordId.toString(16).padStart(4, "0");
          const timeStr = new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          if (isExtended) {
            entries.push(
              `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | Memory - Uncorrectable ECC error detected | Asserted`,
            );
          } else {
            entries.push(
              `   ${hexId} | ${timeStr} | GPU #${gpuIdx} | Memory | Uncorrectable ECC error detected`,
            );
          }
          recordId++;
        }
      });

      if (entries.length === 0) {
        return this.createSuccess("SEL has no entries\n");
      }

      // Per spec: SEL format with hex record ID, timestamp, sensor, event
      let output = `SEL Information\n`;
      output += `Entries          : ${entries.length}\n`;
      output += `Free Space       : 8000 bytes\n\n`;
      output += entries.join("\n") + "\n";
      return this.createSuccess(output);
    }

    if (subsubcommand === "clear") {
      return this.createSuccess(
        "Clearing SEL. Please allow a few seconds to erase.\n",
      );
    }

    if (subsubcommand === "info") {
      return this.createSuccess(
        `SEL Information\n` +
          `Version          : 1.5\n` +
          `Entries          : 0\n` +
          `Free Space       : 8704 bytes\n` +
          `Last Add Time    : Not Available\n` +
          `Last Del Time    : Not Available\n` +
          `Overflow         : false\n`,
      );
    }

    return this.createError(
      "sel: Missing or invalid subcommand\nUsage: ipmitool sel [list|elist|clear|info]",
    );
  }

  /**
   * Handle fru command
   */
  private handleFru(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];

    if (subsubcommand === "print" || !subsubcommand) {
      const output =
        `FRU Device Description : Builtin FRU Device (ID 0)\n` +
        `Board Mfg Date        : Mon Jan  1 00:00:00 2024\n` +
        `Board Mfg             : ${node.bmc.manufacturer}\n` +
        `Board Product         : DGX ${node.systemType}\n` +
        `Board Serial          : ${node.id.toUpperCase()}\n` +
        `Board Part Number     : 692-2G503-0200-002\n` +
        `Product Manufacturer  : ${node.bmc.manufacturer}\n` +
        `Product Name          : DGX ${node.systemType}\n` +
        `Product Part Number   : 692-2G503-0200-002\n` +
        `Product Version       : 1\n` +
        `Product Serial        : ${node.id.toUpperCase()}\n`;
      return this.createSuccess(output);
    }

    return this.createError(
      "fru: Missing or invalid subcommand\nUsage: ipmitool fru [print|list]",
    );
  }

  /**
   * Handle dcmi command - Data Center Management Interface
   * Per spec Section 4.3: DCMI Power Readings
   */
  private handleDcmi(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    const subsubcommand = parsed.subcommands[1];
    const subsubsubcommand = parsed.subcommands[2];

    if (subsubcommand === "power") {
      if (subsubsubcommand === "reading") {
        // Calculate power from all GPUs + system overhead
        const gpuPower = node.gpus.reduce((sum, gpu) => sum + gpu.powerDraw, 0);
        const systemPower = Math.round(gpuPower + 300 + Math.random() * 50); // Add system overhead
        const minPower = Math.round(systemPower * 0.95);
        const maxPower = Math.round(systemPower * 1.5 + Math.random() * 500);

        const timestamp = new Date().toUTCString();

        // Golden Output Reference per spec Section 4.3
        const output =
          `\n    Instantaneous power reading:                  ${systemPower.toString().padStart(5)} Watts\n` +
          `    Minimum during sampling period:               ${minPower.toString().padStart(5)} Watts\n` +
          `    Maximum during sampling period:               ${maxPower.toString().padStart(5)} Watts\n` +
          `    Average power reading over sample period:     ${systemPower.toString().padStart(5)} Watts\n` +
          `    IPMI timestamp:                               ${timestamp}\n` +
          `    Sampling period:                              00000005 Seconds\n` +
          `    Power reading state is:                       activated\n`;

        return this.createSuccess(output);
      }

      // Per spec Section 6.1: get_limit shows persisted power limit from raw command
      if (subsubsubcommand === "get_limit") {
        const limitOutput =
          `\n    Current Limit State:                          ${this.powerLimitState.activationState === 1 ? "Power Limit Active" : "No Active Power Limit"}\n` +
          `    Exception actions:                           Hard Power Off & Log Event to SEL\n` +
          `    Power Limit:                                  ${this.powerLimitState.limit} Watts\n` +
          `    Correction time:                              ${this.powerLimitState.correctionTime} ms\n` +
          `    Sampling period:                              ${this.powerLimitState.samplingPeriod} Seconds\n`;
        return this.createSuccess(limitOutput);
      }

      if (subsubsubcommand === "set_limit") {
        // Parse limit value from args: dcmi power set_limit limit <value>
        // Check both subcommands and args for 'limit' keyword and value
        const allArgs = [...parsed.subcommands, ...parsed.positionalArgs];
        const limitIdx = allArgs.indexOf("limit");

        if (limitIdx !== -1 && allArgs[limitIdx + 1]) {
          const newLimit = parseInt(allArgs[limitIdx + 1]);
          if (!isNaN(newLimit)) {
            this.powerLimitState.limit = newLimit;
            return this.createSuccess(`Power Limit set to ${newLimit} Watts\n`);
          }
        }

        // Also try direct value after set_limit without 'limit' keyword
        const setLimitIdx = allArgs.indexOf("set_limit");
        if (setLimitIdx !== -1 && allArgs[setLimitIdx + 1]) {
          const directValue = parseInt(allArgs[setLimitIdx + 1]);
          if (!isNaN(directValue)) {
            this.powerLimitState.limit = directValue;
            return this.createSuccess(
              `Power Limit set to ${directValue} Watts\n`,
            );
          }
        }

        return this.createError(
          "dcmi power set_limit: Missing limit value\nUsage: ipmitool dcmi power set_limit limit <watts>",
        );
      }

      return this.createError(
        "dcmi power: Missing subcommand\nUsage: ipmitool dcmi power [reading|get_limit|set_limit]",
      );
    }

    if (subsubcommand === "discover") {
      const output =
        `    Supported DCMI version:           1.5\n` +
        `    Power management support available\n` +
        `    Platform management device available\n`;
      return this.createSuccess(output);
    }

    return this.createError(
      "dcmi: Missing or invalid subcommand\nUsage: ipmitool dcmi [power|discover|sensors]",
    );
  }

  /**
   * Handle raw command - Send raw IPMI commands
   * Per spec Section 4.2 & 6.1: Raw Command Execution for power capping with state persistence
   */
  private handleRaw(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    // Raw commands are hex bytes: raw <netfn> <cmd> [data...]
    const rawArgs = parsed.subcommands.slice(1);

    if (rawArgs.length < 2) {
      return this.createError("RAW Commands: raw <netfn> <cmd> [data]");
    }

    // Parse hex values
    try {
      const netfn = parseInt(rawArgs[0], 16);
      const cmd = parseInt(rawArgs[1], 16);

      // Handle power capping commands (per spec)
      // NetFn 0x3c (DCMI), Cmd 0x81 = Set Power Limit
      // NetFn 0x3c (DCMI), Cmd 0x80 = Get Power Limit
      if (netfn === 0x3c) {
        if (cmd === 0x81 && rawArgs.length >= 5) {
          // Set Power Limit: raw 0x3c 0x81 0x05 <low byte> <high byte>
          // Parse and store in state - cross-command persistence (Phase 6)
          const lowByte = parseInt(rawArgs[3], 16);
          const highByte = parseInt(rawArgs[4], 16);
          const newLimit = (highByte << 8) | lowByte;

          this.powerLimitState.limit = newLimit;
          this.powerLimitState.activationState = 1; // Mark as active

          // Acknowledge command (no output = success)
          return this.createSuccess(" ");
        }

        if (cmd === 0x80) {
          // Get Power Limit - return stored limit as hex bytes (little-endian)
          const lowByte = this.powerLimitState.limit & 0xff;
          const highByte = (this.powerLimitState.limit >> 8) & 0xff;
          return this.createSuccess(
            ` ${lowByte.toString(16).padStart(2, "0").toUpperCase()} ${highByte.toString(16).padStart(2, "0").toUpperCase()}`,
          );
        }
      }

      // Generic response for unhandled raw commands
      return this.createSuccess(" 00");
    } catch {
      return this.createError("Invalid hex value in raw command");
    }
  }

  /**
   * Handle power command - Shortcut to chassis power commands
   * "ipmitool power status" is equivalent to "ipmitool chassis power status"
   */
  private handlePower(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError("Error: Unable to determine current node");
    }

    // "ipmitool power status" → treat as "ipmitool chassis power status"
    const subArg = parsed.subcommands[1] || "status";

    if (subArg === "status") {
      return this.createSuccess(
        `Chassis Power is ${node.bmc.powerState === "On" ? "on" : "off"}`,
      );
    }
    if (["on", "off", "cycle", "reset"].includes(subArg)) {
      return this.createSuccess(
        `Chassis Power Control: ${subArg.charAt(0).toUpperCase() + subArg.slice(1)}`,
      );
    }
    return this.createError(
      `Invalid power command: ${subArg}\npower commands: status, on, off, cycle, reset`,
    );
  }
}
