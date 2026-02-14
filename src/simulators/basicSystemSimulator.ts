import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import type { GPU, InfiniBandHCA } from "@/types/hardware";
import { getHardwareSpecs } from "@/data/hardwareSpecs";

/**
 * BasicSystemSimulator
 * Handles basic Linux system utilities for cluster inspection
 *
 * Commands:
 * - lscpu: Display CPU architecture information
 * - free: Display memory usage information
 * - dmidecode: Display BIOS/hardware information
 * - dmesg: Display kernel ring buffer logs
 * - systemctl: Service management (status, start, stop, restart)
 */
export class BasicSystemSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "system-tools",
      version: "1.0.0",
      description: "Basic Linux system utilities",
      commands: [
        {
          name: "lscpu",
          description: "Display CPU architecture information",
          usage: "lscpu [OPTIONS]",
          examples: ["lscpu"],
        },
        {
          name: "free",
          description: "Display memory usage information",
          usage: "free [OPTIONS]",
          examples: ["free", "free -h"],
        },
        {
          name: "dmidecode",
          description: "Display BIOS/hardware information",
          usage: "dmidecode -t <type>",
          examples: [
            "dmidecode -t bios",
            "dmidecode -t memory",
            "dmidecode -t processor",
          ],
        },
        {
          name: "dmesg",
          description: "Display kernel ring buffer logs",
          usage: "dmesg [OPTIONS]",
          examples: [
            "dmesg",
            "dmesg | grep -i error",
            "dmesg | grep -i warning",
          ],
        },
        {
          name: "systemctl",
          description: "Service management",
          usage: "systemctl [action] <service>",
          examples: [
            "systemctl status nvsm-core",
            "systemctl start nvsm-core",
            "systemctl restart nvsm-core",
          ],
        },
        {
          name: "hostnamectl",
          description: "Query or change system hostname",
          usage: "hostnamectl [status|set-hostname <name>]",
          examples: [
            "hostnamectl",
            "hostnamectl status",
            "hostnamectl set-hostname dgx-01",
          ],
        },
        {
          name: "timedatectl",
          description: "Query or change system time settings",
          usage: "timedatectl [status|set-timezone <tz>|set-ntp <bool>]",
          examples: [
            "timedatectl",
            "timedatectl status",
            "timedatectl set-timezone UTC",
          ],
        },
        {
          name: "lsmod",
          description: "Show the status of loaded kernel modules",
          usage: "lsmod",
          examples: ["lsmod", "lsmod | grep nvidia"],
        },
        {
          name: "modinfo",
          description: "Show information about a Linux kernel module",
          usage: "modinfo <module>",
          examples: ["modinfo nvidia", "modinfo nvidia_uvm", "modinfo ib_core"],
        },
        {
          name: "top",
          description: "Display Linux processes",
          usage: "top [OPTIONS]",
          examples: ["top", "top -b -n 1", "top -b -n 1 | head -20"],
        },
        {
          name: "ps",
          description: "Report a snapshot of current processes",
          usage: "ps [OPTIONS]",
          examples: ["ps", "ps aux", "ps aux | grep nvidia", "ps -ef"],
        },
        {
          name: "numactl",
          description: "Control NUMA policy for processes or shared memory",
          usage: "numactl [OPTIONS]",
          examples: ["numactl --hardware", "numactl -H", "numactl --show"],
        },
        {
          name: "uptime",
          description: "Tell how long the system has been running",
          usage: "uptime",
          examples: ["uptime"],
        },
        {
          name: "uname",
          description: "Print system information",
          usage: "uname [OPTIONS]",
          examples: ["uname", "uname -a", "uname -r"],
        },
        {
          name: "hostname",
          description: "Show or set the system hostname",
          usage: "hostname",
          examples: ["hostname"],
        },
        {
          name: "fw-check",
          description: "Check firmware versions on components",
          usage: "fw-check [bmc|gpu|switch|bluefield|transceiver|all]",
          examples: [
            "fw-check all",
            "fw-check bmc",
            "fw-check gpu",
            "fw-check transceiver",
          ],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle empty/invalid parsed commands
    if (!parsed?.flags) {
      return this.createSuccess("");
    }

    // Handle --version flag (global)
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    // Handle --help flag (only long form is global, -h may have command-specific meaning)
    // Commands like 'free' use -h for human-readable, so only intercept --help for those
    const hasHelpFlag = parsed.flags.has("help");
    const hasShortH = parsed.flags.has("h");

    // For lscpu, dmidecode, dmesg, systemctl: -h means help
    // For free: -h means human-readable
    if (hasHelpFlag) {
      return this.handleHelp();
    }

    // Route -h to help ONLY for commands where -h doesn't have another meaning
    if (hasShortH && parsed.baseCommand !== "free") {
      return this.handleHelp();
    }

    // Route to appropriate handler
    switch (parsed.baseCommand) {
      case "lscpu":
        return this.handleLscpu(parsed, context);
      case "free":
        return this.handleFree(parsed, context);
      case "dmidecode":
        return this.handleDmidecode(parsed, context);
      case "dmesg":
        return this.handleDmesg(parsed, context);
      case "systemctl":
        return this.handleSystemctl(parsed, context);
      case "hostnamectl":
        return this.handleHostnamectl(parsed, context);
      case "timedatectl":
        return this.handleTimedatectl(parsed, context);
      case "lsmod":
        return this.handleLsmod(parsed, context);
      case "modinfo":
        return this.handleModinfo(parsed, context);
      case "top":
        return this.handleTop(parsed, context);
      case "ps":
        return this.handlePs(parsed, context);
      case "numactl":
        return this.handleNumactl(parsed, context);
      case "uptime":
        return this.handleUptime(parsed, context);
      case "uname":
        return this.handleUname(parsed, context);
      case "hostname":
        return this.handleHostname(parsed, context);
      case "sensors":
        return this.handleSensors(parsed, context);
      case "fw-check":
      case "firmware":
        return this.handleFirmwareCheck(parsed, context);
      default:
        return this.createError(
          `Unknown system command: ${parsed.baseCommand}`,
        );
    }
  }

  /**
   * Handle lscpu command
   * Displays CPU architecture information
   */
  private handleLscpu(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.resolveNode(context);
    const specs = getHardwareSpecs(node?.systemType || "DGX-A100");
    const cpu = specs.system.cpu;
    const isAMD = cpu.model.includes("AMD");
    const totalCPUs = cpu.sockets * cpu.coresPerSocket * 2;
    const halfCPUs = cpu.coresPerSocket;
    const vendorId = isAMD ? "AuthenticAMD" : "GenuineIntel";
    const cpuFamily = isAMD ? "25" : "6";
    const model = isAMD ? "1" : "143";
    const maxMHz = isAMD ? "3400.0000" : "3800.0000";
    const minMHz = isAMD ? "1500.0000" : "800.0000";
    const curMHz = isAMD ? "2245.781" : "2000.000";
    const bogomips = isAMD ? "4491.56" : "4000.00";
    const virt = isAMD ? "AMD-V" : "VT-x";
    const numaHalf = halfCPUs - 1;
    const numaHigh0 = totalCPUs / 2;
    const numaHigh1 = totalCPUs - 1;

    const output = `Architecture:        x86_64
CPU op-mode(s):      32-bit, 64-bit
Byte Order:          Little Endian
CPU(s):              ${totalCPUs}
On-line CPU(s) list: 0-${totalCPUs - 1}
Thread(s) per core:  2
Core(s) per socket:  ${cpu.coresPerSocket}
Socket(s):           ${cpu.sockets}
NUMA node(s):        ${cpu.sockets}
Vendor ID:           ${vendorId}
CPU family:          ${cpuFamily}
Model:               ${model}
Model name:          ${cpu.model}
Stepping:            1
CPU MHz:             ${curMHz}
CPU max MHz:         ${maxMHz}
CPU min MHz:         ${minMHz}
BogoMIPS:            ${bogomips}
Virtualization:      ${virt}
L1d cache:           32K
L1i cache:           32K
L2 cache:            ${isAMD ? "512K" : "2048K"}
L3 cache:            ${isAMD ? "16384K" : "107520K"}
NUMA node0 CPU(s):   0-${numaHalf},${numaHigh0}-${numaHigh0 + numaHalf}
NUMA node1 CPU(s):   ${halfCPUs}-${halfCPUs + numaHalf},${numaHigh0 + halfCPUs}-${numaHigh1}`;

    return this.createSuccess(output);
  }

  /**
   * Handle free command
   * Displays memory usage information
   * Supports -h flag for human-readable output
   */
  private handleFree(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const showHuman = this.hasAnyFlag(parsed, ["h", "human"]);
    const node = this.resolveNode(context);
    const specs = getHardwareSpecs(node?.systemType || "DGX-A100");
    const totalGB = specs.system.systemMemoryGB;
    const totalKB = totalGB * 1024 * 1024; // KB
    const usedKB = Math.round(totalKB * 0.0625); // ~6.25% used
    const buffCacheKB = Math.round(totalKB * 0.088);
    const freeKB = totalKB - usedKB - buffCacheKB;
    const availableKB = totalKB - usedKB;

    let output: string;
    if (showHuman) {
      const totalHuman =
        totalGB >= 1024 ? `${(totalGB / 1024).toFixed(1)}T` : `${totalGB}G`;
      const freeHuman = `${(freeKB / 1024 / 1024).toFixed(1)}T`;
      const availHuman = `${(availableKB / 1024 / 1024).toFixed(1)}T`;
      output = `              total        used        free      shared  buff/cache   available
Mem:           ${totalHuman.padStart(4)}        128G        ${freeHuman}        4.0G        ${Math.round(buffCacheKB / 1024 / 1024)}G        ${availHuman}
Swap:           32G          0B         32G`;
    } else {
      output = `              total        used        free      shared  buff/cache   available
Mem:      ${totalKB}   ${usedKB}  ${freeKB}     4194304   ${buffCacheKB}  ${availableKB}
Swap:       33554432           0    33554432`;
    }

    return this.createSuccess(output);
  }

  /**
   * Handle dmidecode command
   * Displays BIOS/hardware information
   * Supports -t flag for specific types: system, bios, memory, processor, baseboard
   */
  private handleDmidecode(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const hasTypeFlag = this.hasAnyFlag(parsed, ["t"]);
    const type = parsed.flags.get("t") || parsed.positionalArgs[0]; // Get the value of -t flag or positional arg
    const hostname = context.currentNode || "dgx-00";
    const node = this.resolveNode(context);
    const specs = getHardwareSpecs(node?.systemType || "DGX-A100");
    const displayName = (node?.systemType || "DGX-A100").replace("-", " ");
    const serialPrefix = (node?.systemType || "DGX-A100").replace("-", "");

    // No flag - show full system summary
    if (!hasTypeFlag && !type) {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0001, DMI type 1, 27 bytes
System Information
        Manufacturer: NVIDIA
        Product Name: ${displayName}
        Version: Not Specified
        Serial Number: ${serialPrefix}-${hostname.toUpperCase()}-SN001
        UUID: 12345678-1234-1234-1234-123456789abc
        Wake-up Type: Power Switch
        SKU Number: 920-23687-2512-000
        Family: DGX

Handle 0x0002, DMI type 2, 15 bytes
Base Board Information
        Manufacturer: NVIDIA
        Product Name: ${displayName} Baseboard
        Version: Rev 1.0
        Serial Number: ${serialPrefix}-BB-${hostname.toUpperCase()}-001`;
      return this.createSuccess(output);
    }

    if (type === "system" || type === "1") {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0001, DMI type 1, 27 bytes
System Information
        Manufacturer: NVIDIA
        Product Name: ${displayName}
        Version: Not Specified
        Serial Number: ${serialPrefix}-${hostname.toUpperCase()}-SN001
        UUID: 12345678-1234-1234-1234-123456789abc
        Wake-up Type: Power Switch
        SKU Number: 920-23687-2512-000
        Family: DGX`;
      return this.createSuccess(output);
    }

    if (type === "bios" || type === "0") {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0000, DMI type 0, 26 bytes
BIOS Information
        Vendor: American Megatrends Inc.
        Version: 1.2.3
        Release Date: 09/15/2023
        Address: 0xF0000
        Runtime Size: 64 kB
        ROM Size: 32 MB
        Characteristics:
                PCI is supported
                BIOS is upgradeable
                BIOS shadowing is allowed
                Boot from CD is supported
                Selectable boot is supported
                BIOS ROM is socketed
                EDD is supported
                ACPI is supported
                USB legacy is supported
                UEFI is supported
        BIOS Revision: 5.17
        Firmware Revision: 3.2`;
      return this.createSuccess(output);
    }

    if (type === "processor" || type === "4") {
      const cpuModel = specs.system.cpu.model;
      const cores = specs.system.cpu.coresPerSocket;
      const threads = cores * 2;
      const isAMD = cpuModel.includes("AMD");
      const manufacturer = isAMD ? "AMD" : "Intel";
      const family = isAMD ? "Zen" : "Sapphire Rapids";
      const maxSpeed = isAMD ? "3400 MHz" : "3800 MHz";
      const currentSpeed = isAMD ? "2250 MHz" : "2000 MHz";
      const voltage = isAMD ? "1.1 V" : "1.0 V";
      const vendorId = isAMD ? "FF FB 8B 17" : "6A 06 06 00";
      const signature = isAMD
        ? "Family 23, Model 49, Stepping 0"
        : "Family 6, Model 143, Stepping 8";

      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0040, DMI type 4, 48 bytes
Processor Information
        Socket Designation: CPU0
        Type: Central Processor
        Family: ${family}
        Manufacturer: ${manufacturer}
        ID: 10 0F 83 00 ${vendorId}
        Signature: ${signature}
        Version: ${cpuModel}
        Voltage: ${voltage}
        External Clock: 100 MHz
        Max Speed: ${maxSpeed}
        Current Speed: ${currentSpeed}
        Status: Populated, Enabled
        Core Count: ${cores}
        Core Enabled: ${cores}
        Thread Count: ${threads}
        Characteristics:
                64-bit capable
                Multi-Core
                Hardware Thread

Handle 0x0041, DMI type 4, 48 bytes
Processor Information
        Socket Designation: CPU1
        Type: Central Processor
        Family: ${family}
        Manufacturer: ${manufacturer}
        Version: ${cpuModel}
        Max Speed: ${maxSpeed}
        Current Speed: ${currentSpeed}
        Status: Populated, Enabled
        Core Count: ${cores}
        Core Enabled: ${cores}
        Thread Count: ${threads}`;
      return this.createSuccess(output);
    }

    if (type === "memory" || type === "17") {
      const totalMemGB = specs.system.systemMemoryGB;
      const dimmSizeGB = 64;
      const totalDimms = totalMemGB / dimmSizeGB;
      const remainingDimms = totalDimms - 2;
      const isAMD = specs.system.cpu.model.includes("AMD");
      const memType = isAMD ? "DDR4" : "DDR5";
      const memSpeed = isAMD ? "3200 MT/s" : "4800 MT/s";
      const partNumber = isAMD ? "M393A8G40AB2-CWE" : "M393A8G40DB2-CVF";

      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x003C, DMI type 17, 84 bytes
Memory Device
        Array Handle: 0x0039
        Error Information Handle: Not Provided
        Total Width: 72 bits
        Data Width: 64 bits
        Size: ${dimmSizeGB} GB
        Form Factor: DIMM
        Set: None
        Locator: DIMM_A1
        Bank Locator: P0_Node0_Channel0_Dimm0
        Type: ${memType}
        Type Detail: Synchronous Registered (Buffered)
        Speed: ${memSpeed}
        Manufacturer: Samsung
        Serial Number: 12345678
        Asset Tag: DIMM_A1_AssetTag
        Part Number: ${partNumber}
        Rank: 2
        Configured Memory Speed: ${memSpeed}

Handle 0x003D, DMI type 17, 84 bytes
Memory Device
        Array Handle: 0x0039
        Total Width: 72 bits
        Data Width: 64 bits
        Size: ${dimmSizeGB} GB
        Form Factor: DIMM
        Locator: DIMM_A2
        Bank Locator: P0_Node0_Channel0_Dimm1
        Type: ${memType}
        Speed: ${memSpeed}
        Manufacturer: Samsung
        Part Number: ${partNumber}

[... ${remainingDimms} more DIMMs totaling ${totalMemGB} GB ...]`;
      return this.createSuccess(output);
    }

    if (type === "baseboard" || type === "2") {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0002, DMI type 2, 15 bytes
Base Board Information
        Manufacturer: NVIDIA
        Product Name: ${displayName} Baseboard
        Version: Rev 1.0
        Serial Number: ${serialPrefix}-BB-${hostname.toUpperCase()}-001
        Asset Tag: Not Specified
        Features:
                Board is a hosting board
                Board is replaceable
        Location In Chassis: Not Specified
        Chassis Handle: 0x0003
        Type: Motherboard
        Contained Object Handles: 0`;
      return this.createSuccess(output);
    }

    if (type === "chassis" || type === "3") {
      const output = `# dmidecode 3.2
Getting SMBIOS data from sysfs.
SMBIOS 3.2.0 present.

Handle 0x0003, DMI type 3, 22 bytes
Chassis Information
        Manufacturer: NVIDIA
        Type: Rack Mount Chassis
        Lock: Not Present
        Version: ${displayName}
        Serial Number: ${serialPrefix}-CH-${hostname.toUpperCase()}-001
        Asset Tag: Not Specified
        Boot-up State: Safe
        Power Supply State: Safe
        Thermal State: Safe
        Security Status: None
        OEM Information: 0x00000000
        Height: 6 U
        Number Of Power Cords: 6`;
      return this.createSuccess(output);
    }

    return this.createError(`Usage: dmidecode [-t <type>]
Available types:
  0, bios         BIOS Information
  1, system       System Information
  2, baseboard    Base Board Information
  3, chassis      Chassis Information
  4, processor    Processor Information
  17, memory      Memory Device`);
  }

  /**
   * Handle dmesg command
   * Displays kernel ring buffer logs with XID error integration
   * Supports: -T (human-readable timestamps), piped grep for filtering
   *
   * Critical for NCP-AII exam - searching for XID errors in dmesg
   */
  private handleDmesg(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Use parsed.raw to get the full command line including any piped commands
    const rawCommand = parsed.raw;
    const humanTime = this.hasAnyFlag(parsed, ["T"]);
    const grepError = rawCommand.includes("grep -i error");
    const grepWarning = rawCommand.includes("grep -i warning");
    const grepXid =
      rawCommand.includes("grep -i xid") || rawCommand.includes("grep -i nvrm");
    const grepFallen =
      rawCommand.includes("grep -i fallen") ||
      rawCommand.includes('grep -i "fallen off"');
    const grepNvidia = rawCommand.includes("grep -i nvidia");

    // Check simulation store for any active XID errors (from fault injection)
    const xidMessages: string[] = [];

    // Only check current node's GPUs for XID errors
    const currentNode = this.resolveNode(context);

    // Generate timestamp formatter
    const formatTimestamp = (seconds: number): string => {
      if (humanTime) {
        const date = new Date();
        date.setSeconds(date.getSeconds() - (300 - seconds)); // Simulate recent timestamps
        return `[${date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}]`;
      }
      return `[  ${seconds.toFixed(6)}]`;
    };

    if (currentNode) {
      currentNode.gpus.forEach((gpu) => {
        if (gpu.xidErrors && gpu.xidErrors.length > 0) {
          gpu.xidErrors.forEach((error) => {
            // Format as kernel-style XID error message
            const pciBase = 0x10 + gpu.id;
            const pciAddr = `0000:${pciBase.toString(16).padStart(2, "0")}:00.0`;
            const timestamp = 100 + gpu.id * 10 + Math.random() * 5;

            // Main XID error message
            xidMessages.push(
              `${formatTimestamp(timestamp)} NVRM: Xid (PCI:${pciAddr}): ${error.code}, ${error.description}`,
            );

            // Add additional context for critical XID codes
            if (error.code === 79) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU at ${pciAddr} has fallen off the bus.`,
              );
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.002)} NVRM: GPU is lost. Power cycle or reboot required.`,
              );
            } else if (error.code === 74) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: NVLink: Link ${gpu.id % 6} has detected errors`,
              );
            } else if (error.code === 48) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: Uncorrectable ECC error detected in DRAM`,
              );
            } else if (error.code === 63) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: Row remapping failed - no spare rows available`,
              );
            } else if (error.code === 43) {
              xidMessages.push(
                `${formatTimestamp(timestamp + 0.001)} NVRM: GPU ${gpu.id}: GPU stopped responding to commands`,
              );
            }
          });
        }

        // Add thermal warnings to dmesg
        if (gpu.temperature > 83) {
          const timestamp = 200 + gpu.id * 5;
          xidMessages.push(
            `${formatTimestamp(timestamp)} NVRM: GPU at 0000:${(0x10 + gpu.id).toString(16).padStart(2, "0")}:00.0: GPU has reached thermal slowdown temperature (${Math.round(gpu.temperature)}C)`,
          );
        }

        // Add ECC errors
        if (gpu.eccErrors && gpu.eccErrors.doubleBit > 0) {
          const timestamp = 150 + gpu.id * 5;
          xidMessages.push(
            `${formatTimestamp(timestamp)} NVRM: GPU ${gpu.id}: DBE (double-bit error) detected in GPU memory`,
          );
        }
      });
    }

    let output: string;
    if (grepXid || grepNvidia) {
      // Return XID messages and NVIDIA-related messages when grepping
      if (xidMessages.length > 0) {
        output = xidMessages.join("\n");
      } else {
        // Show normal NVIDIA messages if no errors
        output = [
          `${formatTimestamp(2.456789)} nvidia: module verification: NVIDIA module signed with external signing key`,
          `${formatTimestamp(2.56789)} nvidia: loading out-of-tree module taints kernel`,
          `${formatTimestamp(2.678901)} nvidia-nvlink: Nvlink Core is being initialized`,
          `${formatTimestamp(2.789012)} NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03  Thu Dec 7 19:01:02 UTC 2023`,
          `${formatTimestamp(3.012345)} nvidia-uvm: Loaded the UVM driver, major device number 235`,
        ].join("\n");
      }
    } else if (grepFallen) {
      // Specific grep for "fallen off the bus"
      const fallenMessages = xidMessages.filter((m) =>
        m.includes("fallen off"),
      );
      output = fallenMessages.length > 0 ? fallenMessages.join("\n") : "";
    } else if (grepError) {
      // Include XID errors when grepping for errors
      const errorMessages = [
        `${formatTimestamp(0.234567)} ACPI Error: No handler for Region [SYSI] (ffff888123456789) [SystemMemory] (20200110/evregion-127)`,
        `${formatTimestamp(2.456789)} PCIe Bus Error: severity=Corrected, type=Physical Layer, id=00e8(Receiver ID)`,
      ];

      // Add XID errors to error grep
      if (xidMessages.length > 0) {
        errorMessages.push(...xidMessages);
      }

      output = errorMessages.join("\n");
    } else if (grepWarning) {
      output = `${formatTimestamp(1.123456)} Warning: NMI watchdog not available
${formatTimestamp(3.789012)} ACPI Warning: SystemIO range conflicts with OpRegion (20200110/utaddress-204)`;
    } else {
      // Full dmesg output - include boot messages AND any XID errors
      const bootMessages = [
        `${formatTimestamp(0.0)} Linux version 5.15.0-91-generic (buildd@lcy02-amd64-030) (gcc-11)`,
        `${formatTimestamp(0.0)} Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=1234-5678`,
        `${formatTimestamp(0.0)} KERNEL supported cpus:`,
        `${formatTimestamp(0.000001)}   Intel GenuineIntel`,
        `${formatTimestamp(0.000002)}   AMD AuthenticAMD`,
        `${formatTimestamp(0.234567)} ACPI: Interpreter enabled`,
        `${formatTimestamp(1.123456)} PCI: Using ACPI for IRQ routing`,
        `${formatTimestamp(1.234567)} pci 0000:10:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.345678)} pci 0000:11:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.456789)} pci 0000:12:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.56789)} pci 0000:13:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.678901)} pci 0000:14:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.789012)} pci 0000:15:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.890123)} pci 0000:16:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(1.901234)} pci 0000:17:00.0: [10de:20b2] type 00 class 0x030200`,
        `${formatTimestamp(2.456789)} NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03`,
        `${formatTimestamp(2.56789)} nvidia-nvlink: Nvlink Core is being initialized`,
        `${formatTimestamp(3.789012)} nvidia-uvm: Loaded the UVM driver, major device number 235`,
        `${formatTimestamp(4.56789)} NVRM: GPU 0000:10:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.678901)} NVRM: GPU 0000:11:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.789012)} NVRM: GPU 0000:12:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.890123)} NVRM: GPU 0000:13:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(4.901234)} NVRM: GPU 0000:14:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.012345)} NVRM: GPU 0000:15:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.123456)} NVRM: GPU 0000:16:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.234567)} NVRM: GPU 0000:17:00.0: RmInitAdapter succeeded!`,
        `${formatTimestamp(5.678901)} All 8 GPUs detected and initialized successfully`,
      ];

      // Add XID errors to the full dmesg output if they exist
      if (xidMessages.length > 0) {
        bootMessages.push(...xidMessages);
      }

      output = bootMessages.join("\n");
    }

    return this.createSuccess(output);
  }

  /**
   * Handle systemctl command
   * Service management: status, start, stop, restart
   * Special handling for nvsm-core service per spec Section 2.1
   */
  private handleSystemctl(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const action = parsed.subcommands[0];
    const service = parsed.subcommands[1];

    if (action === "status") {
      if (!service) {
        return this.createError("Usage: systemctl status <service>");
      }

      if (service.startsWith("nvsm")) {
        // Per spec Golden Output Reference for nvsm-core service
        const uptime = `${Math.floor(Math.random() * 12)}h ${Math.floor(Math.random() * 60)}min`;
        const pid = Math.floor(1000 + Math.random() * 5000);
        const output = `● ${service}.service - NVSM Core Service
   Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled; vendor preset: enabled)
   Active: active (running) since ${new Date().toUTCString()}; ${uptime} ago
 Main PID: ${pid} (nvsm-core)
    Tasks: 18 (limit: 4915)
   CGroup: /system.slice/${service}.service
           └─${pid} /usr/bin/nvsm-core`;
        return this.createSuccess(output);
      }

      // Generic service status
      const output = `● ${service}.service - ${service}
   Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled)
   Active: active (running)`;
      return this.createSuccess(output);
    }

    if (action === "start" || action === "stop" || action === "restart") {
      if (!service) {
        return this.createError(`Usage: systemctl ${action} <service>`);
      }
      // Silent success for start/stop/restart
      return this.createSuccess("");
    }

    return this.createError(
      "Usage: systemctl [status|start|stop|restart] <service>",
    );
  }

  /**
   * Handle hostnamectl command
   * Query or change system hostname
   */
  private handleHostnamectl(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const action = parsed.subcommands[0] || "status";
    const hostname = context.currentNode || "dgx-00";

    if (action === "status" || action === undefined) {
      const hctlNode = this.resolveNode(context);
      const hctlDisplayName = (hctlNode?.systemType || "DGX-A100").replace(
        "-",
        " ",
      );
      const output = `   Static hostname: ${hostname}
         Icon name: computer-server
           Chassis: server
        Machine ID: 1234567890abcdef1234567890abcdef
           Boot ID: abcdef1234567890abcdef1234567890
  Operating System: Ubuntu 22.04.3 LTS
            Kernel: Linux 5.15.0-91-generic
      Architecture: x86-64
   Hardware Vendor: NVIDIA
    Hardware Model: ${hctlDisplayName}
  Firmware Version: 1.2.3`;
      return this.createSuccess(output);
    }

    if (action === "set-hostname") {
      const newHostname = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!newHostname) {
        return this.createError("hostnamectl: missing hostname argument");
      }
      return this.createSuccess(""); // Silent success
    }

    return this.createError("Usage: hostnamectl [status|set-hostname <name>]");
  }

  /**
   * Handle timedatectl command
   * Query or change system time settings
   */
  private handleTimedatectl(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const action = parsed.subcommands[0] || "status";
    const now = new Date();

    if (action === "status" || action === undefined) {
      const output = `               Local time: ${now.toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} UTC
           Universal time: ${now.toUTCString()}
                 RTC time: ${now.toUTCString()}
                Time zone: UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no`;
      return this.createSuccess(output);
    }

    if (action === "set-timezone") {
      const tz = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!tz) {
        return this.createError("timedatectl: missing timezone argument");
      }
      return this.createSuccess(""); // Silent success
    }

    if (action === "set-ntp") {
      const enabled = parsed.subcommands[1] || parsed.positionalArgs[0];
      if (!enabled) {
        return this.createError("timedatectl: missing boolean argument");
      }
      return this.createSuccess(""); // Silent success
    }

    if (action === "list-timezones") {
      const output = `Africa/Abidjan
Africa/Cairo
America/Chicago
America/Los_Angeles
America/New_York
Asia/Shanghai
Asia/Tokyo
Europe/London
Europe/Paris
Pacific/Auckland
UTC`;
      return this.createSuccess(output);
    }

    return this.createError(
      "Usage: timedatectl [status|set-timezone <tz>|set-ntp <bool>|list-timezones]",
    );
  }

  /**
   * Handle lsmod command
   * Show the status of loaded kernel modules
   * Critical for NCP-AII: Checking NVIDIA driver and InfiniBand modules
   */
  private handleLsmod(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const rawCommand = parsed.raw || "";
    const grepNvidia =
      rawCommand.includes("grep nvidia") ||
      rawCommand.includes("grep -i nvidia");
    const grepIb =
      rawCommand.includes("grep ib") ||
      rawCommand.includes("grep -i ib") ||
      rawCommand.includes("grep mlx") ||
      rawCommand.includes("grep -i mlx");

    // Full module list
    const modules = [
      { name: "nvidia_uvm", size: 1478656, usedBy: 8, dependencies: [] },
      { name: "nvidia_drm", size: 77824, usedBy: 0, dependencies: ["nvidia"] },
      {
        name: "nvidia_modeset",
        size: 1314816,
        usedBy: 1,
        dependencies: ["nvidia_drm", "nvidia"],
      },
      {
        name: "nvidia",
        size: 56401920,
        usedBy: 1697,
        dependencies: ["nvidia_uvm", "nvidia_modeset", "nvidia_drm"],
      },
      {
        name: "nvidia_peermem",
        size: 16384,
        usedBy: 0,
        dependencies: ["nvidia", "ib_core"],
      },
      { name: "nv_peer_mem", size: 16384, usedBy: 0, dependencies: ["nvidia"] },
      {
        name: "mlx5_ib",
        size: 450560,
        usedBy: 0,
        dependencies: ["ib_uverbs", "ib_core", "mlx5_core"],
      },
      {
        name: "mlx5_core",
        size: 1900544,
        usedBy: 1,
        dependencies: ["mlx5_ib"],
      },
      { name: "ib_uverbs", size: 167936, usedBy: 1, dependencies: ["mlx5_ib"] },
      {
        name: "ib_core",
        size: 409600,
        usedBy: 4,
        dependencies: ["mlx5_ib", "ib_uverbs", "nvidia_peermem", "rdma_cm"],
      },
      { name: "ib_umad", size: 28672, usedBy: 0, dependencies: ["ib_core"] },
      { name: "rdma_cm", size: 73728, usedBy: 0, dependencies: ["ib_core"] },
      {
        name: "rdma_ucm",
        size: 32768,
        usedBy: 0,
        dependencies: ["rdma_cm", "ib_core"],
      },
      { name: "iw_cm", size: 57344, usedBy: 0, dependencies: ["ib_core"] },
      {
        name: "drm_kms_helper",
        size: 315392,
        usedBy: 1,
        dependencies: ["nvidia_drm"],
      },
      {
        name: "drm",
        size: 622592,
        usedBy: 4,
        dependencies: ["nvidia_drm", "drm_kms_helper"],
      },
      { name: "nvme", size: 49152, usedBy: 7, dependencies: [] },
      { name: "nvme_core", size: 131072, usedBy: 8, dependencies: ["nvme"] },
      { name: "i2c_nvidia_gpu", size: 16384, usedBy: 0, dependencies: [] },
      { name: "acpi_ipmi", size: 20480, usedBy: 0, dependencies: [] },
      { name: "ipmi_si", size: 73728, usedBy: 0, dependencies: [] },
      { name: "ipmi_devintf", size: 28672, usedBy: 0, dependencies: [] },
      {
        name: "ipmi_msghandler",
        size: 114688,
        usedBy: 3,
        dependencies: ["acpi_ipmi", "ipmi_si", "ipmi_devintf"],
      },
    ];

    let filteredModules = modules;
    if (grepNvidia) {
      filteredModules = modules.filter(
        (m) => m.name.includes("nvidia") || m.name.includes("nv_peer"),
      );
    } else if (grepIb) {
      filteredModules = modules.filter(
        (m) =>
          m.name.includes("ib_") ||
          m.name.includes("mlx") ||
          m.name.includes("rdma"),
      );
    }

    let output = "Module                  Size  Used by\n";
    filteredModules.forEach((m) => {
      const deps = m.dependencies.length > 0 ? m.dependencies.join(",") : "";
      output += `${m.name.padEnd(23)} ${m.size.toString().padStart(8)}  ${m.usedBy} ${deps}\n`;
    });

    return this.createSuccess(output);
  }

  /**
   * Handle modinfo command
   * Show information about a Linux kernel module
   * Commonly used to verify NVIDIA driver version
   */
  private handleModinfo(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const moduleName = parsed.subcommands[0] || parsed.positionalArgs[0];

    if (!moduleName) {
      return this.createError("modinfo: ERROR: missing module name.");
    }

    const moduleInfo: Record<string, string> = {
      nvidia: `filename:       /lib/modules/5.15.0-91-generic/updates/dkms/nvidia.ko
version:        535.129.03
license:        NVIDIA
srcversion:     E1234567890ABCDEF123456
alias:          char-major-195-*
alias:          pci:v000010DEd*sv*sd*bc03sc02i00*
alias:          pci:v000010DEd*sv*sd*bc03sc00i00*
depends:        drm
retpoline:      Y
name:           nvidia
vermagic:       5.15.0-91-generic SMP mod_unload modversions
parm:           NVreg_DeviceFileUID:int
parm:           NVreg_DeviceFileGID:int
parm:           NVreg_DeviceFileMode:int
parm:           NVreg_InitializeSystemMemoryAllocations:int
parm:           NVreg_UsePageAttributeTable:int
parm:           NVreg_RegisterForACPIEvents:int
parm:           NVreg_EnablePCIeGen3:int
parm:           NVreg_EnableMSI:int
parm:           NVreg_MemoryPoolSize:int
parm:           NVreg_RegistryDwords:charp
parm:           NVreg_RegistryDwordsPerDevice:charp
parm:           NVreg_RmMsg:charp
parm:           NVreg_GpuBlacklist:charp`,

      nvidia_uvm: `filename:       /lib/modules/5.15.0-91-generic/updates/dkms/nvidia-uvm.ko
version:        535.129.03
license:        NVIDIA
srcversion:     ABCDEF1234567890ABCDEF
depends:        nvidia
retpoline:      Y
name:           nvidia_uvm
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      nvidia_modeset: `filename:       /lib/modules/5.15.0-91-generic/updates/dkms/nvidia-modeset.ko
version:        535.129.03
license:        NVIDIA
srcversion:     FEDCBA0987654321FEDCBA
depends:        nvidia,drm
retpoline:      Y
name:           nvidia_modeset
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      nvidia_drm: `filename:       /lib/modules/5.15.0-91-generic/updates/dkms/nvidia-drm.ko
version:        535.129.03
license:        NVIDIA
srcversion:     123ABC456DEF789GHI012J
depends:        nvidia,nvidia-modeset,drm,drm_kms_helper
retpoline:      Y
name:           nvidia_drm
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      nvidia_peermem: `filename:       /lib/modules/5.15.0-91-generic/updates/dkms/nvidia-peermem.ko
version:        535.129.03
license:        GPL
description:    NVIDIA GPUDirect Peer Memory Client
srcversion:     A1B2C3D4E5F6G7H8I9J0K
depends:        nvidia,ib_core
retpoline:      Y
name:           nvidia_peermem
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      mlx5_core: `filename:       /lib/modules/5.15.0-91-generic/kernel/drivers/net/ethernet/mellanox/mlx5/core/mlx5_core.ko
version:        23.10-1.1.9
license:        Dual BSD/GPL
description:    Mellanox 5th generation network adapters (ConnectX series) core driver
author:         Eli Cohen <eli@mellanox.com>
srcversion:     MLX5CORE123456789ABCDEF
alias:          pci:v000015B3d0000A2DCsv*sd*bc*sc*i*
alias:          pci:v000015B3d0000101Fsv*sd*bc*sc*i*
alias:          pci:v000015B3d0000101Dsv*sd*bc*sc*i*
depends:        mlxfw,pci-hyperv-intf,mlxdevm,psample
retpoline:      Y
name:           mlx5_core
vermagic:       5.15.0-91-generic SMP mod_unload modversions
parm:           debug_mask:debug mask: 1 = dump cmd data, 2 = dump poll data, 4 = dump aeq data (uint)`,

      mlx5_ib: `filename:       /lib/modules/5.15.0-91-generic/kernel/drivers/infiniband/hw/mlx5/mlx5_ib.ko
version:        23.10-1.1.9
license:        Dual BSD/GPL
description:    Mellanox 5th generation network adapters (ConnectX series) IB driver
author:         Eli Cohen <eli@mellanox.com>
srcversion:     MLX5IB9876543210FEDCBA
depends:        mlx5_core,ib_core,ib_uverbs
retpoline:      Y
name:           mlx5_ib
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      ib_core: `filename:       /lib/modules/5.15.0-91-generic/kernel/drivers/infiniband/core/ib_core.ko
license:        Dual BSD/GPL
description:    core kernel InfiniBand API
srcversion:     IBCORE111222333444555AB
depends:
retpoline:      Y
name:           ib_core
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,

      ib_uverbs: `filename:       /lib/modules/5.15.0-91-generic/kernel/drivers/infiniband/core/ib_uverbs.ko
license:        Dual BSD/GPL
description:    InfiniBand userspace verbs access
srcversion:     IBUVERBS666777888999AAA
depends:        ib_core
retpoline:      Y
name:           ib_uverbs
vermagic:       5.15.0-91-generic SMP mod_unload modversions`,
    };

    // Check if module exists in our database
    const info =
      moduleInfo[moduleName] || moduleInfo[moduleName.replace(/-/g, "_")];
    if (info) {
      return this.createSuccess(info);
    }

    return this.createError(`modinfo: ERROR: Module ${moduleName} not found.`);
  }

  /**
   * Handle top command
   * Display Linux processes
   * Shows GPU-related processes for DGX systems
   */
  private handleTop(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Note: -b (batch mode) and -n (iterations) are accepted but we return a single snapshot

    const currentNode = this.resolveNode(context);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
    const uptime = "12:34:56";
    const users = 3;
    const loadAvg = currentNode
      ? [
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            2
          ).toFixed(2),
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            1.8
          ).toFixed(2),
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            1.5
          ).toFixed(2),
        ]
      : ["0.45", "0.38", "0.32"];

    const totalMem = currentNode ? currentNode.ramTotal * 1024 : 2097152;
    const usedMem = currentNode ? currentNode.ramUsed * 1024 : 134217;
    const freeMem = totalMem - usedMem;
    const buffersMem = Math.round(totalMem * 0.08);

    let output = `top - ${timeStr} up ${uptime},  ${users} users,  load average: ${loadAvg.join(", ")}\n`;
    output += `Tasks: 412 total,   1 running, 411 sleeping,   0 stopped,   0 zombie\n`;
    output += `%Cpu(s):  2.3 us,  0.8 sy,  0.0 ni, 96.5 id,  0.3 wa,  0.0 hi,  0.1 si,  0.0 st\n`;
    output += `MiB Mem : ${(totalMem / 1024).toFixed(1)} total,  ${(freeMem / 1024).toFixed(1)} free,  ${(usedMem / 1024).toFixed(1)} used,  ${(buffersMem / 1024).toFixed(1)} buff/cache\n`;
    output += `MiB Swap:  32768.0 total,  32768.0 free,      0.0 used.  ${((freeMem + buffersMem) / 1024).toFixed(1)} avail Mem\n\n`;

    output += `    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n`;

    // System processes
    const processes = [
      {
        pid: 1,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "169936",
        res: "13252",
        shr: "8452",
        s: "S",
        cpu: 0.0,
        mem: 0.0,
        time: "0:03.12",
        cmd: "systemd",
      },
      {
        pid: 2,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "0",
        res: "0",
        shr: "0",
        s: "S",
        cpu: 0.0,
        mem: 0.0,
        time: "0:00.05",
        cmd: "kthreadd",
      },
      {
        pid: 1234,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "2.5g",
        res: "125m",
        shr: "45m",
        s: "S",
        cpu: 0.3,
        mem: 0.1,
        time: "12:34.56",
        cmd: "dcgm-exporter",
      },
      {
        pid: 1456,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "1.8g",
        res: "89m",
        shr: "32m",
        s: "S",
        cpu: 0.1,
        mem: 0.0,
        time: "5:23.12",
        cmd: "nvsm-core",
      },
      {
        pid: 1789,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "3.2g",
        res: "256m",
        shr: "78m",
        s: "S",
        cpu: 0.5,
        mem: 0.1,
        time: "23:45.67",
        cmd: "nv-fabricmanag",
      },
      {
        pid: 2345,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "512m",
        res: "45m",
        shr: "18m",
        s: "S",
        cpu: 0.0,
        mem: 0.0,
        time: "1:23.45",
        cmd: "nvidia-persist",
      },
      {
        pid: 3456,
        user: "slurm",
        pr: 20,
        ni: 0,
        virt: "1.2g",
        res: "78m",
        shr: "28m",
        s: "S",
        cpu: 0.2,
        mem: 0.0,
        time: "8:56.78",
        cmd: "slurmd",
      },
      {
        pid: 4567,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "256m",
        res: "32m",
        shr: "12m",
        s: "S",
        cpu: 0.1,
        mem: 0.0,
        time: "2:34.56",
        cmd: "sshd",
      },
      {
        pid: 5678,
        user: "root",
        pr: -20,
        ni: 0,
        virt: "0",
        res: "0",
        shr: "0",
        s: "S",
        cpu: 0.0,
        mem: 0.0,
        time: "0:12.34",
        cmd: "nvidia-modeset",
      },
      {
        pid: 6789,
        user: "root",
        pr: 20,
        ni: 0,
        virt: "128m",
        res: "18m",
        shr: "8m",
        s: "S",
        cpu: 0.0,
        mem: 0.0,
        time: "0:45.67",
        cmd: "openibd",
      },
    ];

    // Add GPU processes if GPUs are being used
    if (currentNode) {
      currentNode.gpus.forEach((gpu: GPU, idx: number) => {
        if (gpu.utilization > 10) {
          processes.push({
            pid: 10000 + idx,
            user: "root",
            pr: 20,
            ni: 0,
            virt: `${Math.round(gpu.memoryUsed)}m`,
            res: `${Math.round(gpu.memoryUsed * 0.9)}m`,
            shr: "0",
            s: "R",
            cpu: gpu.utilization,
            mem: (gpu.memoryUsed / gpu.memoryTotal) * 100,
            time: "1:23.45",
            cmd: "python3",
          });
        }
      });
    }

    // Sort by CPU usage descending
    processes.sort((a, b) => b.cpu - a.cpu);

    processes.slice(0, 20).forEach((p) => {
      output += `${p.pid.toString().padStart(7)} ${p.user.padEnd(9)} ${p.pr.toString().padStart(3)} ${p.ni.toString().padStart(3)} `;
      output += `${p.virt.toString().padStart(7)} ${p.res.toString().padStart(6)} ${p.shr.toString().padStart(6)} ${p.s} `;
      output += `${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${p.time.padStart(9)} ${p.cmd}\n`;
    });

    return this.createSuccess(output);
  }

  /**
   * Handle ps command
   * Report a snapshot of current processes
   * Supports aux and -ef formats
   */
  private handlePs(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const rawCommand = parsed.raw || "";
    const auxFormat =
      rawCommand.includes("aux") || parsed.positionalArgs.includes("aux");
    const efFormat =
      rawCommand.includes("-ef") || this.hasAnyFlag(parsed, ["e", "f"]);
    const grepNvidia =
      rawCommand.includes("grep nvidia") ||
      rawCommand.includes("grep -i nvidia");
    const grepGpu =
      rawCommand.includes("grep gpu") || rawCommand.includes("grep -i gpu");
    const grepSlurm =
      rawCommand.includes("grep slurm") || rawCommand.includes("grep -i slurm");

    const currentNode = this.resolveNode(context);

    // Process list
    const processes = [
      {
        user: "root",
        pid: 1,
        ppid: 0,
        cpu: 0.0,
        mem: 0.0,
        vsz: 169936,
        rss: 13252,
        tty: "?",
        stat: "Ss",
        start: "Jan10",
        time: "0:03",
        cmd: "/sbin/init",
      },
      {
        user: "root",
        pid: 2,
        ppid: 0,
        cpu: 0.0,
        mem: 0.0,
        vsz: 0,
        rss: 0,
        tty: "?",
        stat: "S",
        start: "Jan10",
        time: "0:00",
        cmd: "[kthreadd]",
      },
      {
        user: "root",
        pid: 1234,
        ppid: 1,
        cpu: 0.3,
        mem: 0.1,
        vsz: 2621440,
        rss: 131072,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "12:34",
        cmd: "/usr/bin/dcgm-exporter",
      },
      {
        user: "root",
        pid: 1456,
        ppid: 1,
        cpu: 0.1,
        mem: 0.0,
        vsz: 1887436,
        rss: 91136,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "5:23",
        cmd: "/usr/bin/nvsm-core",
      },
      {
        user: "root",
        pid: 1789,
        ppid: 1,
        cpu: 0.5,
        mem: 0.1,
        vsz: 3355443,
        rss: 262144,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "23:45",
        cmd: "/usr/bin/nv-fabricmanager",
      },
      {
        user: "root",
        pid: 2345,
        ppid: 1,
        cpu: 0.0,
        mem: 0.0,
        vsz: 524288,
        rss: 46080,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "1:23",
        cmd: "/usr/bin/nvidia-persistenced --no-persistence-mode",
      },
      {
        user: "slurm",
        pid: 3456,
        ppid: 1,
        cpu: 0.2,
        mem: 0.0,
        vsz: 1258291,
        rss: 79872,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "8:56",
        cmd: "/usr/sbin/slurmd -D -s",
      },
      {
        user: "root",
        pid: 3457,
        ppid: 1,
        cpu: 0.1,
        mem: 0.0,
        vsz: 892342,
        rss: 45678,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "3:21",
        cmd: "/usr/sbin/slurmctld -D",
      },
      {
        user: "root",
        pid: 4567,
        ppid: 1,
        cpu: 0.1,
        mem: 0.0,
        vsz: 262144,
        rss: 32768,
        tty: "?",
        stat: "Ss",
        start: "Jan10",
        time: "2:34",
        cmd: "sshd: /usr/sbin/sshd -D",
      },
      {
        user: "root",
        pid: 5678,
        ppid: 2,
        cpu: 0.0,
        mem: 0.0,
        vsz: 0,
        rss: 0,
        tty: "?",
        stat: "S<",
        start: "Jan10",
        time: "0:12",
        cmd: "[nvidia-modeset/0]",
      },
      {
        user: "root",
        pid: 5679,
        ppid: 2,
        cpu: 0.0,
        mem: 0.0,
        vsz: 0,
        rss: 0,
        tty: "?",
        stat: "S<",
        start: "Jan10",
        time: "0:08",
        cmd: "[nvidia-uvm]",
      },
      {
        user: "root",
        pid: 5680,
        ppid: 2,
        cpu: 0.0,
        mem: 0.0,
        vsz: 0,
        rss: 0,
        tty: "?",
        stat: "S<",
        start: "Jan10",
        time: "0:05",
        cmd: "[nvidia]",
      },
      {
        user: "root",
        pid: 6789,
        ppid: 1,
        cpu: 0.0,
        mem: 0.0,
        vsz: 131072,
        rss: 18432,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "0:45",
        cmd: "/usr/sbin/openibd",
      },
      {
        user: "root",
        pid: 7890,
        ppid: 1,
        cpu: 0.0,
        mem: 0.0,
        vsz: 98304,
        rss: 12288,
        tty: "?",
        stat: "Ssl",
        start: "Jan10",
        time: "0:23",
        cmd: "/usr/sbin/opensmd",
      },
      {
        user: "root",
        pid: 8901,
        ppid: 4567,
        cpu: 0.0,
        mem: 0.0,
        vsz: 262144,
        rss: 8192,
        tty: "?",
        stat: "S",
        start: "14:30",
        time: "0:00",
        cmd: "sshd: root@pts/0",
      },
      {
        user: "root",
        pid: 8902,
        ppid: 8901,
        cpu: 0.0,
        mem: 0.0,
        vsz: 24576,
        rss: 5120,
        tty: "pts/0",
        stat: "Ss+",
        start: "14:30",
        time: "0:00",
        cmd: "-bash",
      },
    ];

    // Add GPU processes
    if (currentNode) {
      currentNode.gpus.forEach((gpu: GPU, idx: number) => {
        if (gpu.utilization > 10) {
          processes.push({
            user: "root",
            pid: 10000 + idx,
            ppid: 1,
            cpu: gpu.utilization,
            mem: (gpu.memoryUsed / gpu.memoryTotal) * 100,
            vsz: Math.round(gpu.memoryUsed * 1024),
            rss: Math.round(gpu.memoryUsed * 1024 * 0.9),
            tty: "?",
            stat: "Rl",
            start: "14:00",
            time: "1:23",
            cmd: `python3 train.py --gpus ${idx}`,
          });
        }
      });
    }

    // Filter based on grep
    let filteredProcesses = processes;
    if (grepNvidia) {
      filteredProcesses = processes.filter(
        (p) =>
          p.cmd.toLowerCase().includes("nvidia") ||
          p.cmd.toLowerCase().includes("nv-"),
      );
    } else if (grepGpu) {
      filteredProcesses = processes.filter(
        (p) =>
          p.cmd.toLowerCase().includes("gpu") ||
          p.cmd.toLowerCase().includes("nvidia") ||
          p.cmd.toLowerCase().includes("dcgm") ||
          p.cmd.toLowerCase().includes("cuda"),
      );
    } else if (grepSlurm) {
      filteredProcesses = processes.filter((p) =>
        p.cmd.toLowerCase().includes("slurm"),
      );
    }

    let output = "";

    if (auxFormat || (!efFormat && !auxFormat)) {
      // BSD-style aux format
      output =
        "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n";
      filteredProcesses.forEach((p) => {
        output += `${p.user.padEnd(8)} ${p.pid.toString().padStart(6)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} `;
        output += `${p.vsz.toString().padStart(6)} ${p.rss.toString().padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} `;
        output += `${p.start.padEnd(5)} ${p.time.padStart(6)} ${p.cmd}\n`;
      });
    } else {
      // System V -ef format
      output = "UID          PID    PPID  C STIME TTY          TIME CMD\n";
      filteredProcesses.forEach((p) => {
        output += `${p.user.padEnd(8)} ${p.pid.toString().padStart(6)} ${p.ppid.toString().padStart(6)}  ${Math.round(p.cpu).toString().padStart(1)} `;
        output += `${p.start.padEnd(5)} ${p.tty.padEnd(8)} ${p.time.padStart(8)} ${p.cmd}\n`;
      });
    }

    return this.createSuccess(output);
  }

  /**
   * Handle numactl command
   * Control NUMA policy for processes or shared memory
   * Critical for understanding GPU-CPU affinity in DGX systems
   */
  private handleNumactl(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const showHardware = this.hasAnyFlag(parsed, ["H", "hardware"]);
    const showPolicy = this.hasAnyFlag(parsed, ["show", "s"]);

    const currentNode = this.resolveNode(context);

    const numGpus = currentNode ? currentNode.gpus.length : 8;
    const specs = currentNode ? getHardwareSpecs(currentNode.systemType) : null;
    const numSockets = specs ? specs.system.cpu.sockets : 2;
    const cpusPerSocket = specs ? specs.system.cpu.coresPerSocket : 64;
    const memPerNode = currentNode
      ? Math.round(currentNode.ramTotal / numSockets)
      : 512;

    if (
      showHardware ||
      (!showPolicy &&
        parsed.positionalArgs.length === 0 &&
        parsed.subcommands.length === 0)
    ) {
      let output = `available: ${numSockets} nodes (0-${numSockets - 1})\n`;

      for (let i = 0; i < numSockets; i++) {
        const cpuStart = i * cpusPerSocket;
        const cpuEnd = cpuStart + cpusPerSocket - 1;
        const htStart = numSockets * cpusPerSocket + i * cpusPerSocket;
        const htEnd = htStart + cpusPerSocket - 1;
        output += `node ${i} cpus: ${cpuStart}-${cpuEnd} ${htStart}-${htEnd}\n`;
      }

      output += `node ${0} size: ${memPerNode * 1024} MB\n`;
      output += `node ${0} free: ${Math.round(memPerNode * 0.85 * 1024)} MB\n`;
      if (numSockets > 1) {
        output += `node ${1} size: ${memPerNode * 1024} MB\n`;
        output += `node ${1} free: ${Math.round(memPerNode * 0.8 * 1024)} MB\n`;
      }

      output += `node distances:\n`;
      output += `node   0   1\n`;
      output += `  0:  10  21\n`;
      output += `  1:  21  10\n`;

      // Add GPU affinity information (helpful for NCP-AII)
      output += `\n# GPU to NUMA node mapping:\n`;
      for (let i = 0; i < numGpus; i++) {
        const numaNode = i < numGpus / 2 ? 0 : 1;
        output += `# GPU ${i}: NUMA node ${numaNode} (optimal CPU affinity: ${numaNode * cpusPerSocket}-${(numaNode + 1) * cpusPerSocket - 1})\n`;
      }

      return this.createSuccess(output);
    }

    if (showPolicy) {
      const output = `policy: default
preferred node: current
physcpubind: 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127
cpubind: 0 1
nodebind: 0 1
membind: 0 1`;
      return this.createSuccess(output);
    }

    return this
      .createError(`Usage: numactl [--hardware] [--show] [--cpunodebind=<nodes>] [--membind=<nodes>] <command>
Options:
  -H, --hardware     Show NUMA hardware configuration
  -s, --show         Show current NUMA policy
  --cpunodebind=N    Run on CPUs of node N
  --membind=N        Allocate memory on node N
  --preferred=N      Prefer allocation on node N`);
  }

  /**
   * Handle uptime command
   * Tell how long the system has been running
   */
  private handleUptime(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const currentNode = this.resolveNode(context);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const days = Math.floor(Math.random() * 30) + 5;
    const hours = Math.floor(Math.random() * 24);
    const mins = Math.floor(Math.random() * 60);
    const users = Math.floor(Math.random() * 5) + 1;

    // Calculate load average based on GPU utilization
    const loadAvg = currentNode
      ? [
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            2
          ).toFixed(2),
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            1.8
          ).toFixed(2),
          (
            (currentNode.gpus.reduce(
              (sum: number, g: GPU) => sum + g.utilization,
              0,
            ) /
              100) *
            1.5
          ).toFixed(2),
        ]
      : ["0.45", "0.38", "0.32"];

    const output = ` ${timeStr} up ${days} days, ${hours}:${mins.toString().padStart(2, "0")},  ${users} users,  load average: ${loadAvg.join(", ")}`;

    return this.createSuccess(output);
  }

  /**
   * Handle uname command
   * Print system information
   */
  private handleUname(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const all = this.hasAnyFlag(parsed, ["a"]);
    const kernelName = this.hasAnyFlag(parsed, ["s"]);
    const nodeName = this.hasAnyFlag(parsed, ["n"]);
    const kernelRelease = this.hasAnyFlag(parsed, ["r"]);
    const kernelVersion = this.hasAnyFlag(parsed, ["v"]);
    const machine = this.hasAnyFlag(parsed, ["m"]);
    const processor = this.hasAnyFlag(parsed, ["p"]);
    const hardwarePlatform = this.hasAnyFlag(parsed, ["i"]);
    const os = this.hasAnyFlag(parsed, ["o"]);

    const hostname = context.currentNode || "dgx-00";

    if (all) {
      return this.createSuccess(
        `Linux ${hostname} 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux`,
      );
    }

    const parts: string[] = [];

    if (
      kernelName ||
      (!nodeName &&
        !kernelRelease &&
        !kernelVersion &&
        !machine &&
        !processor &&
        !hardwarePlatform &&
        !os)
    ) {
      parts.push("Linux");
    }
    if (nodeName) {
      parts.push(hostname);
    }
    if (kernelRelease) {
      parts.push("5.15.0-91-generic");
    }
    if (kernelVersion) {
      parts.push("#101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023");
    }
    if (machine) {
      parts.push("x86_64");
    }
    if (processor) {
      parts.push("x86_64");
    }
    if (hardwarePlatform) {
      parts.push("x86_64");
    }
    if (os) {
      parts.push("GNU/Linux");
    }

    return this.createSuccess(parts.join(" ") || "Linux");
  }

  /**
   * Handle hostname command
   * Show or set the system hostname
   * Returns the current node name from the context
   */
  private handleHostname(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const hostname = context.currentNode || "dgx-00";
    return this.createSuccess(hostname);
  }

  /**
   * Handle firmware version check command
   * Display firmware versions for various system components
   */
  private handleFirmwareCheck(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.resolveNode(context) || this.resolveAllNodes(context)[0];

    const component = parsed.positionalArgs[0] || "all";

    let output = `Firmware Version Report - ${node.hostname}\n`;
    output += `${"=".repeat(50)}\n\n`;

    if (component === "all" || component === "bmc") {
      output += `BMC Firmware:\n`;
      output += `  Version: 4.2.1-2024.11\n`;
      output += `  Build Date: 2024-11-15\n`;
      output += `  Status: Current\n\n`;
    }

    if (component === "all" || component === "gpu") {
      output += `GPU VBIOS (per GPU):\n`;
      node.gpus.forEach((_gpu: GPU, idx: number) => {
        output += `  GPU ${idx}: 96.00.5F.00.01\n`;
      });
      output += `  Status: Current\n\n`;
    }

    if (component === "all" || component === "switch") {
      output += `Network Switches:\n`;
      output += `  Leaf Switch 1: MLNX-OS 3.10.3300\n`;
      output += `  Leaf Switch 2: MLNX-OS 3.10.3300\n`;
      output += `  Status: Current\n\n`;
    }

    if (component === "all" || component === "bluefield") {
      output += `BlueField DPU:\n`;
      output += `  DOCA Version: 2.7.0\n`;
      output += `  BFB Version: 4.7.0-123\n`;
      output += `  Status: Current\n\n`;
    }

    if (component === "all" || component === "transceiver") {
      output += `Optical Transceivers:\n`;
      node.hcas.forEach((_hca: InfiniBandHCA, idx: number) => {
        output += `  Port ${idx + 1}: QSFP-DD 400G - FW 2.10.2000\n`;
      });
      output += `  Status: Current\n`;
    }

    return this.createSuccess(output);
  }

  /**
   * Handle sensors command (lm-sensors)
   * Displays hardware sensor readings grouped by chip
   */
  private handleSensors(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const currentNode = this.resolveNode(context);
    if (!currentNode) {
      return this.createError("sensors: No node context available");
    }

    const sensors = currentNode.bmc?.sensors || [];
    let output = "";

    // Group sensors by type for lm-sensors style output
    const tempSensors = sensors.filter(
      (s) =>
        s.unit.toLowerCase() === "degrees c" ||
        s.name.toLowerCase().includes("temp"),
    );
    const fanSensors = sensors.filter(
      (s) =>
        s.unit.toLowerCase() === "rpm" || s.name.toLowerCase().includes("fan"),
    );
    const voltSensors = sensors.filter(
      (s) =>
        s.unit.toLowerCase() === "volts" ||
        s.name.toLowerCase().includes("volt"),
    );
    const powerSensors = sensors.filter(
      (s) =>
        s.unit.toLowerCase() === "watts" ||
        s.name.toLowerCase().includes("pwr") ||
        s.name.toLowerCase().includes("power"),
    );

    // coretemp-isa-0000 chip (CPU temps)
    output += "coretemp-isa-0000\n";
    output += "Adapter: ISA adapter\n";
    const cpuTemps = tempSensors.filter(
      (s) =>
        s.name.toLowerCase().includes("cpu") ||
        s.name.toLowerCase().includes("core") ||
        s.name.toLowerCase().includes("inlet"),
    );
    if (cpuTemps.length > 0) {
      cpuTemps.forEach((s) => {
        const high = s.upperWarning || 80.0;
        const crit = s.upperCritical || 100.0;
        output += `${s.name}:      +${s.reading.toFixed(1)}°C  (high = +${high.toFixed(1)}°C, crit = +${crit.toFixed(1)}°C)\n`;
      });
    } else {
      // Default CPU temps if none in BMC data
      output += `Core 0:           +52.0°C  (high = +80.0°C, crit = +100.0°C)\n`;
      output += `Core 1:           +48.0°C  (high = +80.0°C, crit = +100.0°C)\n`;
    }
    output += "\n";

    // nct6775-isa-0290 chip (system board sensors)
    output += "nct6775-isa-0290\n";
    output += "Adapter: ISA adapter\n";

    // Voltages
    if (voltSensors.length > 0) {
      voltSensors.forEach((s) => {
        output += `${s.name}:    +${s.reading.toFixed(2)} V\n`;
      });
    }

    // Fans
    if (fanSensors.length > 0) {
      fanSensors.forEach((s) => {
        output += `${s.name}:       ${Math.round(s.reading)} RPM\n`;
      });
    } else {
      output += `fan1:             4200 RPM\n`;
      output += `fan2:             4150 RPM\n`;
    }

    // Board temps
    const boardTemps = tempSensors.filter(
      (s) =>
        !s.name.toLowerCase().includes("cpu") &&
        !s.name.toLowerCase().includes("core") &&
        !s.name.toLowerCase().includes("gpu") &&
        !s.name.toLowerCase().includes("inlet"),
    );
    boardTemps.forEach((s) => {
      const high = s.upperWarning || 85.0;
      const crit = s.upperCritical || 95.0;
      output += `${s.name}:      +${s.reading.toFixed(1)}°C  (high = +${high.toFixed(1)}°C, crit = +${crit.toFixed(1)}°C)\n`;
    });
    output += "\n";

    // nvidia GPU temps
    if (currentNode.gpus.length > 0) {
      currentNode.gpus.forEach((gpu) => {
        output += `nvidia-smi-${gpu.id}\n`;
        output += `Adapter: PCI adapter\n`;
        output += `GPU ${gpu.id} (${gpu.name}): +${gpu.temperature.toFixed(1)}°C  (high = +83.0°C, crit = +90.0°C)\n\n`;
      });
    }

    // Power sensors
    if (powerSensors.length > 0) {
      output += "power_meter-acpi-0\n";
      output += "Adapter: ACPI interface\n";
      powerSensors.forEach((s) => {
        output += `${s.name}:     ${s.reading.toFixed(1)} W\n`;
      });
      output += "\n";
    }

    return this.createSuccess(output.trimEnd());
  }
}
