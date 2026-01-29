import type { CommandResult, CommandContext, ParsedCommand, SimulatorMetadata } from '@/types/commands';
import { BaseSimulator } from './BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';
import type { BlueFieldDPU, InfiniBandHCA } from '@/types/hardware';

// Alias for shorter code
type HCA = InfiniBandHCA;

export class MellanoxSimulator extends BaseSimulator {
  private mstStarted: boolean = false;

  getMetadata(): SimulatorMetadata {
    return {
      name: 'mellanox-tools',
      version: '4.22.0',
      description: 'Mellanox Software Tools for HCA/DPU management',
      commands: [
        {
          name: 'mst',
          description: 'Mellanox Software Tools driver management',
          usage: 'mst <start|stop|status|version> [-v]',
          examples: ['mst start', 'mst status', 'mst status -v'],
        },
        {
          name: 'mlxconfig',
          description: 'Configure Mellanox devices',
          usage: 'mlxconfig -d <device> <query|set> [KEY=VALUE]',
          examples: ['mlxconfig -d /dev/mst/mt4119_pciconf0 query', 'mlxconfig -d /dev/mst/mt4119_pciconf0 set INTERNAL_CPU_MODEL=1'],
        },
        {
          name: 'mlxlink',
          description: 'Link diagnostics and monitoring',
          usage: 'mlxlink -d <device> [-c|--show_eye]',
          examples: ['mlxlink -d /dev/mst/mt4119_pciconf0', 'mlxlink -d /dev/mst/mt4119_pciconf0 -c'],
        },
        {
          name: 'mlxcables',
          description: 'Cable and transceiver information',
          usage: 'mlxcables [-d <device>]',
          examples: ['mlxcables', 'mlxcables -d /dev/mst/mt4119_pciconf0'],
        },
        {
          name: 'mlxup',
          description: 'Firmware update utility',
          usage: 'mlxup -d <device> <-q|--online|--img <file>>',
          examples: ['mlxup -d /dev/mst/mt4119_pciconf0 -q', 'mlxup -d /dev/mst/mt4119_pciconf0 --online'],
        },
        {
          name: 'mlxfwmanager',
          description: 'Firmware manager for Mellanox/NVIDIA devices',
          usage: 'mlxfwmanager [OPTIONS]',
          examples: ['mlxfwmanager', 'mlxfwmanager --query', 'mlxfwmanager -d /dev/mst/mt4119_pciconf0 --query'],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --version flag at root level
    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.handleVersion();
    }

    // Handle --help flag at root level
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      return this.handleHelp();
    }

    // Route to appropriate tool based on baseCommand
    const tool = parsed.baseCommand;

    switch (tool) {
      case 'mst':
        return this.handleMST(parsed, context);
      case 'mlxconfig':
        return this.handleMLXConfig(parsed, context);
      case 'mlxlink':
        return this.handleMLXLink(parsed, context);
      case 'mlxcables':
        return this.handleMLXCables(parsed, context);
      case 'mlxup':
        return this.handleMLXUp(parsed, context);
      case 'mlxfwmanager':
        return this.handleMLXFwManager(parsed, context);
      default:
        return this.createError(`Unknown Mellanox tool: ${tool}`);
    }
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find(n => n.id === context.currentNode);
  }

  // MST (Mellanox Software Tools)
  private handleMST(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --help flag
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      let output = 'Mellanox Software Tools (MST)\n\n';
      output += 'Usage: mst <command> [options]\n\n';
      output += 'Commands:\n';
      output += '  start       Start MST driver service\n';
      output += '  stop        Stop MST driver service\n';
      output += '  status      Show MST devices status\n';
      output += '  version     Show MST version\n\n';
      output += 'Options:\n';
      output += '  -h, --help     Show this help message\n';
      output += '  -v             Verbose mode (with status)\n';
      return this.createSuccess(output);
    }

    // Handle version subcommand (not --version flag)
    const command = parsed.subcommands[0];
    if (command === 'version') {
      return this.createSuccess('mst, version 4.22.0-1');
    }

    if (command === 'start') {
      this.mstStarted = true;
      return this.createSuccess('Starting MST (Mellanox Software Tools) driver set\nLoading MST PCI module - Success\nLoading MST PCI configuration module - Success\nCreate devices\nUnloading MST PCI module (unused) - Success');
    }

    if (command === 'stop') {
      this.mstStarted = false;
      return this.createSuccess('Stopping MST (Mellanox Software Tools) driver set\nRemoving MST PCI module - Success');
    }

    if (command === 'status') {
      if (!this.mstStarted) {
        return this.createError('MST driver is not loaded');
      }

      const node = this.getNode(context);
      if (!node) {
        return this.createError('Error: Unable to determine current node');
      }

      const verbose = this.hasAnyFlag(parsed, ['v']);
      let output = 'MST modules:\n';
      output += '------------\n';
      output += '    MST PCI module loaded\n';
      output += '    MST PCI configuration module loaded\n\n';

      output += 'MST devices:\n';
      output += '------------\n';

      // List HCAs per spec Section 5.1
      node.hcas.forEach((hca, idx) => {
        const pciAddr = `0000:${(0xa0 + idx).toString(16)}:00.0`;
        output += `${hca.devicePath}                      - MT4129 [${hca.caType}]\n`;

        if (verbose) {
          output += `         PCI Address:        ${pciAddr}\n`;
          output += `         Board ID:           NVIDIA_MCX755106AS-HEAT\n`;
          output += `         PSID:               MT_0000000889\n`;
          output += `         Firmware Version:   ${hca.firmwareVersion}\n`;
          output += `         Device Type:        ${hca.caType}\n`;
          output += `         Link Speed:         ${hca.ports[0]?.rate || 400} Gb/s\n\n`;
        }
      });

      // List DPUs (BlueField) per spec
      node.dpus.forEach((dpu) => {
        output += `${dpu.devicePath}                 - MT42822 [BlueField-2]\n`;

        if (verbose) {
          output += `         PCI Address:        ${dpu.pciAddress}\n`;
          output += `         Board ID:           NVIDIA_MBF2M516A-CENAT\n`;
          output += `         PSID:               MT_0000000664\n`;
          output += `         Firmware Version:   ${dpu.firmwareVersion}\n`;
          output += `         Device Type:        BlueField DPU\n`;
          output += `         Host Mode:          ${dpu.mode.mode}\n`;
          output += `         ARM IP:             ${dpu.ipAddress || '192.168.100.2'}\n\n`;
        }
      });

      return this.createSuccess(output);
    }

    return this.createError('Usage: mst <start|stop|status> [-v]');
  }

  // mlxconfig - Configure BlueField/ConnectX devices
  private handleMLXConfig(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    // Parse device flag first
    const deviceName = this.getFlagString(parsed, ['d']);
    if (!deviceName) {
      return this.createMissingArgumentError('mlxconfig', '-d <device>'); // Exit 1
    }

    // Check if device exists in node (check DPUs first as they are the main target for mlxconfig)
    let device: BlueFieldDPU | HCA | undefined = node.dpus.find(d => d.devicePath === deviceName);

    if (!device) {
      // Search by ID or other identifiers if full path not given
      device = node.dpus.find(d => deviceName.includes(String(d.id)));
    }

    if (!device) {
      // Also check standard HCAs just in case, though mlxconfig mainly targets configurable devices
      device = node.hcas.find(h => deviceName.includes(String(h.id)) || (h.pciAddress && deviceName.includes(h.pciAddress)));
    }

    if (!device) {
      return this.createDeviceNotFoundError('mlxconfig', deviceName);
    }

    // NOW check if MST is started (required to access the valid device)
    if (!this.mstStarted) {
      return this.createError('Error: MST driver not loaded. Run "mst start" first.');
    }

    // Continue with query/set logic...

    // Query configuration
    // Per spec Section 5.2: Configuration table with Default/Current/Next Boot columns
    const command = parsed.subcommands[0];
    if (command === 'q' || command === 'query') {
      // Check if device is a BlueFieldDPU (has mode property)
      const isDPU = 'mode' in device && 'armOS' in device;
      const cpuModel = isDPU ? (device as BlueFieldDPU).mode.internalCpuModel : 0;
      const nicMode = isDPU && cpuModel === 1 ? 'SEPARATED_HOST' : 'BASIC';

      let output = `\nDevice #1:\n`;
      output += `----------\n\n`;
      output += `Device type:    ${isDPU ? 'BlueField2' : 'ConnectX'}\n`;
      output += `Device:         ${device.devicePath}\n`;
      output += `PCI device:     ${device.pciAddress || 'N/A'}\n`;
      output += `Configurations:                              Default         Current         Next Boot\n`;
      output += `         INTERNAL_CPU_MODEL                  0               ${cpuModel}               ${cpuModel}\n`;
      output += `         INTERNAL_CPU_PAGE_SUPPLIER          0               ${cpuModel}               ${cpuModel}\n`;
      output += `         INTERNAL_CPU_ESWITCH_MANAGER        0               ${cpuModel}               ${cpuModel}\n`;
      output += `         INTERNAL_CPU_IB_VPORT0              0               ${cpuModel}               ${cpuModel}\n`;
      output += `         INTERNAL_CPU_OFFLOAD_ENGINE         0               ${cpuModel}               ${cpuModel}\n`;
      output += `         NIC_MODE                            BASIC           ${nicMode}           ${nicMode}\n`;
      output += `         PF_BAR2_ENABLE                      0               0               0\n`;
      output += `         PER_PF_NUM_SF                       0               0               0\n`;
      output += `         SRIOV_EN                            True            True            True\n`;
      output += `         NUM_OF_VFS                          16              16              16\n`;
      output += `         PCI_SWITCH_PORT_CONFIG               0               0               0\n\n`;

      return this.createSuccess(output);
    }

    // Set configuration
    if (command === 's' || command === 'set') {
      const config = parsed.positionalArgs[0];

      if (!config) {
        return this.createError('Error: Configuration not specified');
      }

      // Parse configuration setting
      const [key, value] = config.split('=');

      if (key === 'INTERNAL_CPU_MODEL') {
        // Only BlueField DPUs support INTERNAL_CPU_MODEL setting
        const isDPU = 'mode' in device && 'armOS' in device;
        if (!isDPU) {
          return this.createError('Error: INTERNAL_CPU_MODEL is only supported on BlueField DPUs');
        }

        const dpuDevice = device as BlueFieldDPU;
        const newMode = parseInt(value);

        if (newMode === 1) {
          // Switch to DPU mode
          const updatedDPU: BlueFieldDPU = {
            ...dpuDevice,
            mode: {
              mode: 'DPU' as const,
              internalCpuModel: 1,
              description: 'DPU mode - Arm cores own NIC resources',
            },
          };

          // Update state
          const state = useSimulationStore.getState();
          const nodeToUpdate = state.cluster.nodes.find(n => n.id === context.currentNode);
          if (nodeToUpdate) {
            nodeToUpdate.dpus = nodeToUpdate.dpus.map(d =>
              d.id === dpuDevice.id ? updatedDPU : d
            );
          }

          return this.createSuccess(`\nDevice #1:\n----------\n\nApplying...   Done!\n\n\x1b[33m-I- Please reboot machine to load new configurations.\x1b[0m\n`);
        } else if (newMode === 0) {
          // Switch to NIC mode
          const updatedDPU: BlueFieldDPU = {
            ...dpuDevice,
            mode: {
              mode: 'NIC' as const,
              internalCpuModel: 0,
              description: 'NIC mode - DPU acts as standard NIC, Arm disabled',
            },
          };

          const state = useSimulationStore.getState();
          const nodeToUpdate = state.cluster.nodes.find(n => n.id === context.currentNode);
          if (nodeToUpdate) {
            nodeToUpdate.dpus = nodeToUpdate.dpus.map(d =>
              d.id === dpuDevice.id ? updatedDPU : d
            );
          }

          return this.createSuccess(`\nDevice #1:\n----------\n\nApplying...   Done!\n\n\x1b[33m-I- Please reboot machine to load new configurations.\x1b[0m\n`);
        }
      }

      return this.createSuccess(`Applying configuration ${key}=${value}...\nDone!`);
    }

    return this.createError('Usage: mlxconfig -d <device> <q|s> [KEY=VALUE]');
  }

  // mlxlink - Link diagnostics
  private handleMLXLink(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (!this.mstStarted) {
      return this.createError('Error: MST driver not loaded. Run "mst start" first.');
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const devicePath = this.getFlagString(parsed, ['d']);
    if (!devicePath) {
      return this.createError('Error: Device not specified. Use -d /dev/mst/<device>');
    }

    const hca = node.hcas.find(h => h.devicePath === devicePath);

    if (!hca) {
      return this.createError(`Error: Device ${devicePath} not found`);
    }

    const port = hca.ports[0];

    // Show counters
    if (this.hasAnyFlag(parsed, ['c'])) {
      let output = '\nOperational Info\n';
      output += '----------------\n';
      output += `State                           : ${port.state}\n`;
      output += `Physical state                  : ${port.physicalState}\n`;
      output += `Speed                           : ${port.rate} (${port.rate}Gb/s)\n`;
      output += `Width                           : 4x\n`;
      output += `FEC                             : RS-FEC - RS(528,514)\n`;
      output += `Loopback Mode                   : No Loopback\n`;
      output += `Auto Negotiation                : ON\n\n`;

      output += 'Counters\n';
      output += '--------\n';
      output += `Symbol Errors                   : ${port.errors.symbolErrors}\n`;
      output += `Link Downed                     : ${port.errors.linkDowned}\n`;
      output += `Port Receive Errors             : ${port.errors.portRcvErrors}\n`;
      output += `Port Transmit Discards          : ${port.errors.portXmitDiscards}\n`;
      output += `Port Transmit Wait              : ${port.errors.portXmitWait}\n\n`;

      if (port.errors.symbolErrors > 0) {
        output += '\x1b[33m⚠ Warning: Symbol errors detected. Check cable quality.\x1b[0m\n';
      }
      if (port.errors.linkDowned > 0) {
        output += '\x1b[31m⚠ Critical: Link has gone down. Check cable connection.\x1b[0m\n';
      }

      return this.createSuccess(output);
    }

    // Show eye diagram (simulated)
    if (this.hasAnyFlag(parsed, ['show_eye'])) {
      let output = '\nEye Opening Measurement\n';
      output += '=======================\n\n';
      output += 'Lane 0:\n';
      output += '  Eye Height: 125 mV (Good)\n';
      output += '  Eye Width:  0.85 UI (Good)\n';
      output += '  Grade:      98/100\n\n';
      output += 'Lane 1:\n';
      output += '  Eye Height: 122 mV (Good)\n';
      output += '  Eye Width:  0.83 UI (Good)\n';
      output += '  Grade:      96/100\n\n';
      output += 'Lane 2:\n';
      output += '  Eye Height: 120 mV (Good)\n';
      output += '  Eye Width:  0.82 UI (Good)\n';
      output += '  Grade:      95/100\n\n';
      output += 'Lane 3:\n';
      output += '  Eye Height: 123 mV (Good)\n';
      output += '  Eye Width:  0.84 UI (Good)\n';
      output += '  Grade:      97/100\n\n';
      output += '\x1b[32m✓ All lanes show good signal quality\x1b[0m\n';

      return this.createSuccess(output);
    }

    // Default: show link status
    let output = `\nQuerying ${hca.caType} ${devicePath}\n\n`;
    output += 'Operational Info\n';
    output += '----------------\n';
    output += `State                           : ${port.state}\n`;
    output += `Physical state                  : ${port.physicalState}\n`;
    output += `Speed                           : ${port.rate} (${port.rate}Gb/s)\n`;
    output += `Width                           : 4x\n`;
    output += `FEC                             : RS-FEC\n`;
    output += `Vendor                          : Mellanox\n`;
    output += `Part Number                     : MCP1650-H001E30\n\n`;

    if (port.state === 'Active') {
      output += '\x1b[32m✓ Link is healthy\x1b[0m\n';
    } else {
      output += '\x1b[31m✗ Link is not active\x1b[0m\n';
    }

    return this.createSuccess(output);
  }

  // mlxcables - Cable/transceiver information
  private handleMLXCables(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (!this.mstStarted) {
      return this.createError('Error: MST driver not loaded. Run "mst start" first.');
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    // Check if device flag is provided (but not required for mlxcables)
    const devicePath = this.getFlagString(parsed, ['d']);
    if (parsed.subcommands.length > 0 && !devicePath) {
      return this.createError('Error: Device not specified. Use -d <device>');
    }

    let output = '\nCable Information\n';
    output += '=================\n\n';

    node.hcas.slice(0, 2).forEach((_hca, idx) => {
      output += `Port ${idx + 1}:\n`;
      output += '--------\n';
      output += `Cable Type:              Passive Copper Cable (DAC)\n`;
      output += `Length:                  2m\n`;
      output += `Vendor:                  Mellanox\n`;
      output += `Part Number:             MCP1650-H002E30\n`;
      output += `Serial Number:           MT${(2100000000 + idx).toString()}\n`;
      output += `Temperature:             32°C\n`;
      output += `Voltage:                 3.30V\n`;
      output += `TX Power (Lane 0):       N/A (DAC)\n`;
      output += `RX Power (Lane 0):       N/A (DAC)\n`;
      output += `Status:                  \x1b[32mOK\x1b[0m\n\n`;
    });

    return this.createSuccess(output);
  }

  // mlxup - Firmware updates
  private handleMLXUp(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (!this.mstStarted) {
      return this.createError('Error: MST driver not loaded. Run "mst start" first.');
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const devicePath = this.getFlagString(parsed, ['d']);
    if (!devicePath) {
      return this.createError('Error: Device not specified. Use -d <device>');
    }

    // Query firmware version
    if (this.hasAnyFlag(parsed, ['q']) || parsed.subcommands[0] === 'query') {
      const hca = node.hcas.find(h => h.devicePath === devicePath);
      const dpu = node.dpus.find(d => d.devicePath === devicePath);
      const device = hca || dpu;

      if (!device) {
        return this.createError(`Error: Device ${devicePath} not found`);
      }

      const deviceType = hca ? hca.caType : 'BlueField DPU';
      const pciAddr = dpu ? dpu.pciAddress : devicePath;

      let output = '\nQuerying Firmware on device:\n';
      output += `Device Type:      ${deviceType}\n`;
      output += `FW Version:       ${device.firmwareVersion}\n`;
      output += `PCI Address:      ${pciAddr}\n\n`;

      return this.createSuccess(output);
    }

    // Online update check
    if (this.hasAnyFlag(parsed, ['online'])) {
      let output = '\nChecking for available firmware updates...\n\n';
      output += '\x1b[32m✓ Firmware is up to date\x1b[0m\n';
      output += 'Current version: 20.35.1012\n';
      output += 'Latest version:  20.35.1012\n';

      return this.createSuccess(output);
    }

    // Flash firmware (simulated)
    const imagePath = this.getFlagString(parsed, ['img']);
    if (imagePath) {
      let output = '\nFlashing firmware...\n\n';
      output += `Image: ${imagePath}\n`;
      output += 'Verifying image... OK\n';
      output += 'Burning image... [████████████████████] 100%\n';
      output += 'Verifying flash... OK\n\n';
      output += '\x1b[32m✓ Firmware update completed successfully\x1b[0m\n';
      output += '\x1b[33m-I- Please reboot the system to load new firmware\x1b[0m\n';

      return this.createSuccess(output);
    }

    return this.createError('Usage: mlxup -d <device> <-q|--online|--img <file>>');
  }

  // mlxfwmanager - Firmware manager for Mellanox/NVIDIA devices
  private handleMLXFwManager(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (!this.mstStarted) {
      return this.createError('Error: MST driver not loaded. Run "mst start" first.');
    }

    const node = this.getNode(context);
    if (!node) {
      return this.createError('Error: Unable to determine current node');
    }

    const showHelp = this.hasAnyFlag(parsed, ['h', 'help']);
    if (showHelp) {
      let output = 'mlxfwmanager - Firmware manager for Mellanox/NVIDIA devices\n\n';
      output += 'Usage: mlxfwmanager [OPTIONS]\n\n';
      output += 'Options:\n';
      output += '  -d <device>     Operate on specific device\n';
      output += '  --query         Query firmware information\n';
      output += '  --online-query  Query available online updates\n';
      output += '  -u              Update firmware\n';
      output += '  --force         Force update even if same version\n';
      output += '  -y              Assume yes to all prompts\n';
      output += '  -h, --help      Show this help message\n';
      return this.createSuccess(output);
    }

    const devicePath = this.getFlagString(parsed, ['d']);
    const doQuery = this.hasAnyFlag(parsed, ['query']) || parsed.subcommands.includes('query');
    const onlineQuery = this.hasAnyFlag(parsed, ['online-query']);
    const doUpdate = this.hasAnyFlag(parsed, ['u']);

    // Build list of devices to query
    const devices: Array<{ type: string } & (HCA | BlueFieldDPU)> = [];

    if (devicePath) {
      // Find specific device
      const hca = node.hcas.find(h => h.devicePath === devicePath);
      const dpu = node.dpus.find(d => d.devicePath === devicePath);
      if (hca) devices.push({ type: 'HCA', ...hca });
      else if (dpu) devices.push({ type: 'DPU', ...dpu });
      else {
        return this.createError(`Error: Device ${devicePath} not found`);
      }
    } else {
      // All devices
      node.hcas.forEach(hca => devices.push({ type: 'HCA', ...hca }));
      node.dpus.forEach(dpu => devices.push({ type: 'DPU', ...dpu }));
    }

    if (doQuery || (!onlineQuery && !doUpdate)) {
      // Query firmware
      let output = '\nQuerying Mellanox devices firmware ...\n\n';
      output += '-------------------------------------------------------------\n';
      output += '  Device #     Device Type    Part Number     PSID             Firmware\n';
      output += '-------------------------------------------------------------\n';

      devices.forEach((device, idx) => {
        // Type guard: HCAs have caType, DPUs don't
        const isHCA = device.type === 'HCA' && 'caType' in device;
        const deviceType = isHCA ? (device as HCA).caType : 'BlueField-2';
        const partNum = isHCA ? 'MCX755106AS-HEAT' : 'MBF2M516A-CENAT';
        const psid = isHCA ? 'MT_0000000889' : 'MT_0000000664';
        output += `  ${idx + 1}            ${deviceType.padEnd(15)} ${partNum.padEnd(16)} ${psid.padEnd(17)} ${device.firmwareVersion}\n`;
      });

      output += '-------------------------------------------------------------\n';
      output += `\n  Number of devices: ${devices.length}\n`;

      return this.createSuccess(output);
    }

    if (onlineQuery) {
      // Online query
      let output = '\nQuerying Mellanox devices (online) ...\n\n';
      output += '-------------------------------------------------------------\n';
      output += '  Device #    Current FW      Available FW    Status\n';
      output += '-------------------------------------------------------------\n';

      devices.forEach((device, idx) => {
        const currentFw = device.firmwareVersion;
        const availableFw = '28.39.1002'; // Simulated latest version
        const status = currentFw === availableFw ? 'Up to date' : 'Update available';
        const statusColor = currentFw === availableFw ? '\x1b[32m' : '\x1b[33m';
        output += `  ${idx + 1}            ${currentFw.padEnd(16)} ${availableFw.padEnd(16)} ${statusColor}${status}\x1b[0m\n`;
      });

      output += '-------------------------------------------------------------\n';

      return this.createSuccess(output);
    }

    if (doUpdate) {
      // Firmware update (simulated)
      const force = this.hasAnyFlag(parsed, ['force']);
      // const assumeYes = this.hasAnyFlag(parsed, ['y']); // Reserved for interactive mode

      let output = '\nStarting firmware update ...\n\n';

      devices.forEach((device, idx) => {
        output += `Device ${idx + 1}: ${device.devicePath}\n`;
        output += `  Current FW: ${device.firmwareVersion}\n`;
        output += `  Target FW:  28.39.1002\n`;

        if (!force && device.firmwareVersion === '28.39.1002') {
          output += `  \x1b[33mSkipped: Already at latest version\x1b[0m\n\n`;
        } else {
          output += `  Downloading image... Done\n`;
          output += `  Burning firmware [████████████████████] 100%\n`;
          output += `  \x1b[32mSuccess: Firmware updated\x1b[0m\n`;
          output += `  \x1b[33mNote: Reboot required to activate new firmware\x1b[0m\n\n`;
        }
      });

      return this.createSuccess(output);
    }

    return this.createError('Usage: mlxfwmanager [--query|--online-query|-u] [-d <device>]');
  }
}
