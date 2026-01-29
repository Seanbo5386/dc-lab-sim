import type { CommandResult, CommandContext, ParsedCommand } from '@/types/commands';
import type { GPU, DGXNode, NVLinkConnection, XIDError } from '@/types/hardware';
import { BaseSimulator, type SimulatorMetadata } from '@/simulators/BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';

export class DcgmiSimulator extends BaseSimulator {
  constructor() {
    super();
    this.registerCommands();
  }

  /**
   * Register all DCGM commands with metadata
   */
  private registerCommands(): void {
    this.registerCommand('discovery', this.handleDiscovery.bind(this), {
      name: 'discovery',
      description: 'Discover GPUs in the system',
      usage: 'dcgmi discovery [OPTIONS]',
      flags: [
        { short: 'l', long: 'list', description: 'List all discovered GPUs with details' },
        { short: 'c', long: 'compute', description: 'Show compute capability' },
      ],
      examples: [
        'dcgmi discovery -l',
        'dcgmi discovery --list',
      ],
    });

    this.registerCommand('diag', this.handleDiag.bind(this), {
      name: 'diag',
      description: 'Run GPU diagnostics',
      usage: 'dcgmi diag [OPTIONS]',
      flags: [
        { short: 'r', long: 'mode', description: 'Diagnostic level (1=short, 2=medium, 3=long)', takesValue: true, defaultValue: '1' },
        { short: 'i', long: 'gpu-id', description: 'Specify GPU ID to test', takesValue: true },
      ],
      examples: [
        'dcgmi diag -r 1',
        'dcgmi diag --mode 2',
        'dcgmi diag -r 3 -i 0',
      ],
    });

    this.registerCommand('health', this.handleHealth.bind(this), {
      name: 'health',
      description: 'Check GPU health status',
      usage: 'dcgmi health [OPTIONS]',
      flags: [
        { short: 'c', long: 'check', description: 'Check health status of all GPUs' },
      ],
      examples: [
        'dcgmi health -c',
        'dcgmi health --check',
      ],
    });

    this.registerCommand('group', this.handleGroup.bind(this), {
      name: 'group',
      description: 'Manage GPU groups',
      usage: 'dcgmi group [OPTIONS]',
      flags: [
        { short: 'l', long: 'list', description: 'List all GPU groups' },
        { short: 'c', long: 'create', description: 'Create a new group', takesValue: true },
        { short: 'd', long: 'delete', description: 'Delete a group', takesValue: true },
      ],
      examples: [
        'dcgmi group -l',
        'dcgmi group -c my-group',
        'dcgmi group --create my-group',
      ],
    });

    this.registerCommand('stats', this.handleStats.bind(this), {
      name: 'stats',
      description: 'Collect GPU statistics',
      usage: 'dcgmi stats [OPTIONS]',
      flags: [
        { short: 'g', long: 'group', description: 'Specify group ID', takesValue: true },
        { short: 'e', long: 'enable', description: 'Enable stats collection' },
      ],
      examples: [
        'dcgmi stats -g 0 -e',
        'dcgmi stats --enable',
      ],
    });

    this.registerCommand('policy', this.handlePolicy.bind(this), {
      name: 'policy',
      description: 'Manage health monitoring policies and violation actions',
      usage: 'dcgmi policy [OPTIONS]',
      flags: [
        { short: 'g', long: 'group', description: 'Specify group ID', takesValue: true },
        { long: 'set', description: 'Set a policy condition', takesValue: true },
        { long: 'get', description: 'Get current policy settings' },
        { long: 'reg', description: 'Register for policy notifications' },
        { long: 'unreg', description: 'Unregister from policy notifications' },
        { long: 'clear', description: 'Clear all policies for group' },
        { long: 'action', description: 'Set violation action (none, gpureset, log)', takesValue: true },
        { long: 'condition', description: 'Policy condition type', takesValue: true },
        { long: 'threshold', description: 'Threshold value for condition', takesValue: true },
      ],
      examples: [
        'dcgmi policy --get',
        'dcgmi policy --set --condition ecc --threshold 10 --action log',
        'dcgmi policy -g 0 --set --condition thermal --threshold 85 --action log',
        'dcgmi policy --reg --condition pcie',
        'dcgmi policy -g 0 --clear',
      ],
    });

    this.registerCommand('fieldgroup', this.handleFieldGroup.bind(this), {
      name: 'fieldgroup',
      description: 'Manage field groups for monitoring',
      usage: 'dcgmi fieldgroup [OPTIONS]',
      flags: [
        { short: 'l', long: 'list', description: 'List all field groups' },
        { short: 'c', long: 'create', description: 'Create field group', takesValue: true },
        { short: 'd', long: 'delete', description: 'Delete field group', takesValue: true },
        { short: 'i', long: 'info', description: 'Show field group info', takesValue: true },
      ],
      examples: [
        'dcgmi fieldgroup -l',
        'dcgmi fieldgroup -c perf_fields',
        'dcgmi fieldgroup -i 0',
      ],
    });

    this.registerCommand('dmon', this.handleDmon.bind(this), {
      name: 'dmon',
      description: 'Device monitoring - continuous GPU metrics',
      usage: 'dcgmi dmon [OPTIONS]',
      flags: [
        { short: 'i', long: 'gpu-id', description: 'GPU ID to monitor', takesValue: true },
        { short: 'g', long: 'group', description: 'Group ID to monitor', takesValue: true },
        { short: 'd', long: 'delay', description: 'Update delay in ms', takesValue: true },
        { short: 'c', long: 'count', description: 'Number of samples', takesValue: true },
        { short: 'e', long: 'fields', description: 'Field IDs to display', takesValue: true },
      ],
      examples: [
        'dcgmi dmon -i 0',
        'dcgmi dmon -g 0 -d 1000 -c 10',
        'dcgmi dmon -e 155,156,157',
      ],
    });
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: 'dcgmi',
      version: '3.1.3',
      description: 'NVIDIA Data Center GPU Manager Interface',
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle root-level flags (--version, --help)
    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.handleVersion();
    }

    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      // If a subcommand is specified, show help for that command
      const subcommand = parsed.subcommands[0];
      return this.handleHelp(subcommand);
    }

    // Get the subcommand
    const subcommand = parsed.subcommands[0];

    if (!subcommand) {
      return this.createError('No command specified. Run "dcgmi --help" for usage.');
    }

    // Route to command handler
    const handler = this.getCommand(subcommand);

    if (!handler) {
      const metadata = this.getMetadata();
      const availableCommands = metadata.commands.map(cmd => `  ${cmd.name.padEnd(12)} ${cmd.description}`).join('\n');
      return this.createError(`Unknown command: ${subcommand}\n\nAvailable commands:\n${availableCommands}\n\nRun "dcgmi --help" for more information.`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    const result = handler(parsed, context);
    return result as CommandResult;
  }

  /**
   * Get the current node from simulation store
   */
  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find(n => n.id === context.currentNode);
  }

  /**
   * Simulate DCGM diagnostic output
   */
  private simulateDiagnostic(mode: number, gpus: GPU[]): string {
    // SOURCE OF TRUTH: Column widths
    const COL_1 = 27; // Diagnostic name
    const COL_2 = 48; // Result

    // Generate borders dynamically
    const BORDER = '+' + '-'.repeat(COL_1) + '+' + '-'.repeat(COL_2) + '+';
    const DOUBLE_BORDER = '+' + '='.repeat(COL_1) + '+' + '='.repeat(COL_2) + '+';

    // Helper to pad content to exact column width (handles ANSI color codes)
    const padCol = (content: string, width: number): string => {
      // Strip ANSI color codes to measure actual visual length
      const stripped = content.replace(/\x1b\[[0-9;]*m/g, '');
      const actualLength = stripped.length;

      if (actualLength > width) {
        return content.substring(0, width);
      }

      // Add spaces after the content (before closing |)
      const padding = ' '.repeat(width - actualLength);
      return content + padding;
    };

    let output = `\nSuccessfully ran diagnostic for group.\n`;
    output += BORDER + '\n';
    output += '| ' + padCol('Diagnostic', COL_1 - 1) + '| ' + padCol('Result', COL_2 - 1) + '|\n';
    output += DOUBLE_BORDER + '\n';

    const tests = [
      { name: 'Deployment', desc: 'Blacklist', pass: true },
      { name: 'Deployment', desc: 'NVML Library', pass: true },
      { name: 'Deployment', desc: 'CUDA Main Library', pass: true },
      { name: 'Deployment', desc: 'Permissions and OS Blocks', pass: true },
      { name: 'Deployment', desc: 'Persistence Mode', pass: true },
      { name: 'Deployment', desc: 'Environment Variables', pass: true },
      { name: 'Deployment', desc: 'Page Retirement/Row Remap', pass: true },
      { name: 'Deployment', desc: 'Graphics Processes', pass: true },
      { name: 'Hardware', desc: 'GPU Memory', pass: true },
      { name: 'Hardware', desc: 'Pulse Test', pass: true },
    ];

    if (mode >= 2) {
      tests.push(
        { name: 'Integration', desc: 'PCIe', pass: true },
        { name: 'Performance', desc: 'SM Stress', pass: true },
        { name: 'Performance', desc: 'Targeted Stress', pass: true }
      );
    }

    if (mode >= 3) {
      tests.push(
        { name: 'Performance', desc: 'Memory Bandwidth', pass: true },
        { name: 'Performance', desc: 'Diagnostic', pass: true },
        { name: 'Hardware', desc: 'ECC Check', pass: gpus.every(g => g.eccErrors.doubleBit === 0) }
      );
    }

    tests.forEach(test => {
      const status = test.pass ? '\x1b[32mPass\x1b[0m' : '\x1b[31mFail\x1b[0m';
      const col1Content = padCol(test.name, COL_1 - 1);
      const col2Content = padCol(test.desc + ' ' + status, COL_2 - 1);
      output += '| ' + col1Content + '| ' + col2Content + '|\n';
    });

    output += BORDER + '\n\n';

    const failedTests = tests.filter(t => !t.pass);
    if (failedTests.length > 0) {
      output += `\x1b[31mWarning: ${failedTests.length} test(s) failed. Check GPU health.\x1b[0m\n`;
    } else {
      output += `\x1b[32mAll tests passed successfully.\x1b[0m\n`;
    }

    return output;
  }

  /**
   * Handle discovery command
   */
  private handleDiscovery(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Unable to determine current node');
    }

    // Check for -l or --list flag
    if (this.hasAnyFlag(parsed, ['l', 'list'])) {
      let output = `${node.gpus.length} GPU(s) found.\n`;
      node.gpus.forEach((gpu, idx) => {
        output += `\nGPU ${idx}: ${gpu.uuid}\n`;
        output += `  Device Information:\n`;
        output += `    UUID:        ${gpu.uuid}\n`;
        output += `    PCI Bus ID:  ${gpu.pciAddress}\n`;
        output += `    Device Name: ${gpu.name}\n`;
      });
      return this.createSuccess(output);
    }

    // Default: just show count
    return this.createSuccess(`${node.gpus.length} GPU(s) found. Use -l for details.`);
  }

  /**
   * Handle diag command
   */
  private handleDiag(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Unable to determine current node');
    }

    // Get mode from -r or --mode flag
    const mode = this.getFlagNumber(parsed, ['r', 'mode'], 1);

    if (mode < 1 || mode > 3) {
      return this.createError('mode must be 1 (short), 2 (medium), or 3 (long)');
    }

    // Check if specific GPU was requested
    const gpuId = this.getFlagString(parsed, ['i', 'gpu-id']);
    const gpus = gpuId ? [node.gpus[parseInt(gpuId)]] : node.gpus;

    if (!gpus || gpus.length === 0 || !gpus[0]) {
      return this.createError(`GPU ${gpuId} not found`);
    }

    // Check if any GPU has critical XID errors (XID 79: fallen off bus)
    const criticalXidGpus = gpus.filter(gpu =>
      gpu.xidErrors.some(xid => xid.code === 79)
    );

    if (criticalXidGpus.length > 0) {
      const gpuIdList = criticalXidGpus.map(g => g.id).join(', ');
      return this.createError(
        `Error: Unable to run diagnostics on GPU(s): ${gpuIdList}\n` +
        `GPU has fallen off the bus (XID 79).\n` +
        `This indicates a severe PCIe communication failure.\n\n` +
        `The GPU is not accessible and cannot be tested.\n` +
        `Possible causes:\n` +
        `  - PCIe slot failure\n` +
        `  - GPU hardware failure\n` +
        `  - Power delivery issue\n` +
        `  - System board defect\n\n` +
        `Recommended actions:\n` +
        `  1. System reboot may restore GPU access\n` +
        `  2. If error persists, reseat GPU in PCIe slot\n` +
        `  3. If reseating fails, GPU or motherboard RMA may be required\n` +
        `  4. Check 'dmesg | grep -i xid' for additional details`
      );
    }

    const output = `Running level ${mode} diagnostic...\n` +
                  this.simulateDiagnostic(mode, gpus);
    return this.createSuccess(output);
  }

  /**
   * Handle health command
   */
  private handleHealth(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Unable to determine current node');
    }

    // Check for -c or --check flag
    if (!this.hasAnyFlag(parsed, ['c', 'check'])) {
      return this.createError('Missing required flag: -c/--check');
    }

    let output = `Health monitoring:\n`;
    node.gpus.forEach((gpu, idx) => {
      const health = gpu.healthStatus;
      const symbol = health === 'OK' ? '✓' : health === 'Warning' ? '⚠' : '✗';
      const color = health === 'OK' ? '\x1b[32m' : health === 'Warning' ? '\x1b[33m' : '\x1b[31m';
      output += `\n  GPU ${idx}: ${color}${symbol} ${health}\x1b[0m\n`;

      if (gpu.xidErrors.length > 0) {
        output += `    XID Errors: ${gpu.xidErrors.length}\n`;
      }
      if (gpu.eccErrors.doubleBit > 0) {
        output += `    ECC Errors: ${gpu.eccErrors.doubleBit} uncorrectable\n`;
      }
      if (gpu.temperature > 80) {
        output += `    Temperature: ${Math.round(gpu.temperature)}°C (HIGH)\n`;
      }
    });
    return this.createSuccess(output);
  }

  /**
   * Handle group command
   */
  private handleGroup(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Check for -l or --list flag
    if (this.hasAnyFlag(parsed, ['l', 'list'])) {
      return this.createSuccess('No groups configured.\nUse "dcgmi group -c <name>" to create a group.');
    }

    // Check for -c or --create flag
    if (this.hasAnyFlag(parsed, ['c', 'create'])) {
      const name = this.getFlagString(parsed, ['c', 'create'], 'default-group');
      return this.createSuccess(`Successfully created group "${name}" with group ID 0.`);
    }

    return this.createError('Missing required flag: -l/--list or -c/--create\nRun "dcgmi group --help" for usage.');
  }

  /**
   * Handle stats command
   */
  private handleStats(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createSuccess('DCGM stats collection not yet configured.\nUse "dcgmi stats -g <group> -e" to enable.');
  }

  /**
   * Handle policy command - comprehensive policy management
   */
  private handlePolicy(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Unable to determine current node');
    }

    const groupId = this.getFlagString(parsed, ['g', 'group'], '0');

    // Get current policies
    if (this.hasAnyFlag(parsed, ['get'])) {
      return this.showPolicies(groupId, node);
    }

    // Set a policy
    if (this.hasAnyFlag(parsed, ['set'])) {
      const condition = this.getFlagString(parsed, ['condition']);
      const threshold = this.getFlagString(parsed, ['threshold']);
      const action = this.getFlagString(parsed, ['action'], 'log');

      if (!condition) {
        return this.createError('Missing --condition. Valid conditions: ecc, thermal, power, pcie, nvlink, xid');
      }

      return this.setPolicy(groupId, condition, threshold, action);
    }

    // Register for notifications
    if (this.hasAnyFlag(parsed, ['reg'])) {
      const condition = this.getFlagString(parsed, ['condition'], 'all');
      return this.createSuccess(
        `Successfully registered for policy notifications.\n` +
        `  Group ID: ${groupId}\n` +
        `  Condition: ${condition}\n` +
        `  Callback registered: Yes\n\n` +
        `Policy violations will trigger notifications.`
      );
    }

    // Unregister
    if (this.hasAnyFlag(parsed, ['unreg'])) {
      return this.createSuccess(`Successfully unregistered from policy notifications for group ${groupId}.`);
    }

    // Clear policies
    if (this.hasAnyFlag(parsed, ['clear'])) {
      return this.createSuccess(
        `Successfully cleared all policies for group ${groupId}.\n\n` +
        `All monitoring thresholds have been reset to defaults.`
      );
    }

    // Default: show help
    return this.showPolicyHelp();
  }

  private showPolicies(groupId: string, node: DGXNode): CommandResult {
    let output = `\x1b[1mDCGM Health Policies - Group ${groupId}\x1b[0m\n`;
    output += `${'─'.repeat(70)}\n\n`;

    output += `Group Info:\n`;
    output += `  Group ID:       ${groupId}\n`;
    output += `  GPU Count:      ${node.gpus.length}\n`;
    output += `  Policy Status:  Active\n\n`;

    output += `\x1b[1mActive Policies:\x1b[0m\n`;
    output += `  Condition         | Threshold        | Action    | Status\n`;
    output += `  ${'─'.repeat(60)}\n`;
    output += `  ECC Double-Bit    | > 0 errors       | Log+Alert | \x1b[32mEnabled\x1b[0m\n`;
    output += `  ECC Single-Bit    | > 100/day        | Log       | \x1b[32mEnabled\x1b[0m\n`;
    output += `  Thermal           | > 83°C           | Throttle  | \x1b[32mEnabled\x1b[0m\n`;
    output += `  Thermal Critical  | > 90°C           | Shutdown  | \x1b[32mEnabled\x1b[0m\n`;
    output += `  Power             | > 100% TDP       | Log       | \x1b[32mEnabled\x1b[0m\n`;
    output += `  PCIe              | Replay > 1000    | Log       | \x1b[32mEnabled\x1b[0m\n`;
    output += `  NVLink            | CRC > 100        | Log+Alert | \x1b[32mEnabled\x1b[0m\n`;
    output += `  XID Errors        | Any critical     | Log+Alert | \x1b[32mEnabled\x1b[0m\n\n`;

    output += `\x1b[1mRecent Violations:\x1b[0m\n`;
    const violations = this.getRecentViolations(node);
    if (violations.length === 0) {
      output += `  No policy violations in the last 24 hours.\n`;
    } else {
      violations.forEach(v => {
        output += `  ${v}\n`;
      });
    }

    output += `\n\x1b[1mPolicy Configuration:\x1b[0m\n`;
    output += `  Notification callbacks: Enabled\n`;
    output += `  Log to file:           /var/log/dcgm-policy.log\n`;
    output += `  Alert integration:     Configured\n`;

    return this.createSuccess(output);
  }

  private setPolicy(groupId: string, condition: string, threshold: string, action: string): CommandResult {
    const validConditions = ['ecc', 'thermal', 'power', 'pcie', 'nvlink', 'xid', 'memory'];
    const validActions = ['none', 'log', 'gpureset', 'alert', 'throttle', 'shutdown'];

    if (!validConditions.includes(condition.toLowerCase())) {
      return this.createError(
        `Invalid condition: ${condition}\n\n` +
        `Valid conditions:\n` +
        `  ecc      - ECC memory error threshold\n` +
        `  thermal  - Temperature threshold (°C)\n` +
        `  power    - Power usage threshold (%TDP or Watts)\n` +
        `  pcie     - PCIe replay/error threshold\n` +
        `  nvlink   - NVLink error threshold\n` +
        `  xid      - XID error types to monitor\n` +
        `  memory   - Memory utilization threshold`
      );
    }

    if (!validActions.includes(action.toLowerCase())) {
      return this.createError(
        `Invalid action: ${action}\n\n` +
        `Valid actions:\n` +
        `  none     - Monitor only, no action\n` +
        `  log      - Log violation to DCGM logs\n` +
        `  alert    - Send alert notification\n` +
        `  gpureset - Attempt GPU reset\n` +
        `  throttle - Reduce GPU clocks\n` +
        `  shutdown - Request safe shutdown`
      );
    }

    let output = `\x1b[32mPolicy set successfully.\x1b[0m\n\n`;
    output += `Policy Details:\n`;
    output += `  Group ID:   ${groupId}\n`;
    output += `  Condition:  ${condition}\n`;
    output += `  Threshold:  ${threshold || 'default'}\n`;
    output += `  Action:     ${action}\n\n`;

    // Show condition-specific info
    switch (condition.toLowerCase()) {
      case 'ecc':
        output += `ECC Policy Configuration:\n`;
        output += `  Single-bit errors will be logged at threshold.\n`;
        output += `  Double-bit errors always trigger immediate action.\n`;
        break;
      case 'thermal':
        output += `Thermal Policy Configuration:\n`;
        output += `  Temperature monitored continuously.\n`;
        output += `  Throttling begins at warning threshold.\n`;
        output += `  Critical threshold triggers configured action.\n`;
        break;
      case 'nvlink':
        output += `NVLink Policy Configuration:\n`;
        output += `  Monitors CRC errors, replay counts, and link status.\n`;
        output += `  Link failures trigger immediate notification.\n`;
        break;
      case 'xid':
        output += `XID Policy Configuration:\n`;
        output += `  Critical XIDs (31, 43, 48, 79): Always alert\n`;
        output += `  Warning XIDs (13, 32, 45, 63): Log only\n`;
        output += `  Custom threshold affects warning-level XIDs.\n`;
        break;
    }

    return this.createSuccess(output);
  }

  private showPolicyHelp(): CommandResult {
    let output = `\x1b[1mDCGM Policy Management\x1b[0m\n\n`;
    output += `Usage: dcgmi policy [OPTIONS]\n\n`;
    output += `Policy Commands:\n`;
    output += `  --get                     Show current policies\n`;
    output += `  --set                     Set a policy condition\n`;
    output += `  --reg                     Register for notifications\n`;
    output += `  --unreg                   Unregister from notifications\n`;
    output += `  --clear                   Clear all policies\n\n`;
    output += `Options:\n`;
    output += `  -g, --group <ID>          Specify GPU group (default: 0)\n`;
    output += `  --condition <TYPE>        Policy condition type\n`;
    output += `  --threshold <VALUE>       Threshold for condition\n`;
    output += `  --action <ACTION>         Action on violation\n\n`;
    output += `Conditions:\n`;
    output += `  ecc      - ECC memory errors\n`;
    output += `  thermal  - GPU temperature\n`;
    output += `  power    - Power consumption\n`;
    output += `  pcie     - PCIe errors\n`;
    output += `  nvlink   - NVLink errors\n`;
    output += `  xid      - XID error events\n`;
    output += `  memory   - Memory utilization\n\n`;
    output += `Actions:\n`;
    output += `  none     - Monitor only\n`;
    output += `  log      - Log to DCGM logs\n`;
    output += `  alert    - Send notification\n`;
    output += `  gpureset - Reset GPU\n`;
    output += `  throttle - Reduce clocks\n\n`;
    output += `Examples:\n`;
    output += `  dcgmi policy --get\n`;
    output += `  dcgmi policy --set --condition thermal --threshold 85 --action alert\n`;
    output += `  dcgmi policy --set --condition ecc --threshold 10 --action log\n`;
    output += `  dcgmi policy -g 0 --reg --condition xid\n`;

    return this.createSuccess(output);
  }

  private getRecentViolations(node: DGXNode): string[] {
    const violations: string[] = [];

    // Check for any actual issues in the node
    node.gpus.forEach((gpu: GPU, idx: number) => {
      if (gpu.temperature > 80) {
        violations.push(`\x1b[33m[Thermal] GPU ${idx}: Temperature ${Math.round(gpu.temperature)}°C exceeds warning threshold\x1b[0m`);
      }
      if (gpu.eccErrors.doubleBit > 0) {
        violations.push(`\x1b[31m[ECC] GPU ${idx}: ${gpu.eccErrors.doubleBit} uncorrectable ECC errors detected\x1b[0m`);
      }
      if (gpu.xidErrors.length > 0) {
        const criticalXids = gpu.xidErrors.filter((x: XIDError) => [31, 43, 48, 79].includes(x.code));
        if (criticalXids.length > 0) {
          violations.push(`\x1b[31m[XID] GPU ${idx}: Critical XID error(s) - ${criticalXids.map((x: XIDError) => x.code).join(', ')}\x1b[0m`);
        }
      }
      const inactiveLinks = gpu.nvlinks.filter((l: NVLinkConnection) => l.status !== 'Active').length;
      if (inactiveLinks > 0) {
        violations.push(`\x1b[33m[NVLink] GPU ${idx}: ${inactiveLinks} inactive link(s) detected\x1b[0m`);
      }
    });

    return violations;
  }

  /**
   * Handle fieldgroup command
   */
  private handleFieldGroup(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ['l', 'list'])) {
      let output = `\x1b[1mDCGM Field Groups\x1b[0m\n`;
      output += `${'─'.repeat(60)}\n\n`;
      output += `ID | Name                    | Fields | Created\n`;
      output += `${'─'.repeat(60)}\n`;
      output += ` 0 | DCGM_DEFAULT            |   15   | System\n`;
      output += ` 1 | DCGM_PROFILING          |   23   | System\n`;
      output += ` 2 | DCGM_JOB_STATS          |   12   | System\n`;
      output += ` 3 | custom_perf             |    8   | User\n`;
      output += `\n`;
      output += `Use 'dcgmi fieldgroup -i <ID>' for field details.\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['i', 'info'])) {
      const id = this.getFlagString(parsed, ['i', 'info'], '0');
      let output = `\x1b[1mField Group Details - ID ${id}\x1b[0m\n`;
      output += `${'─'.repeat(50)}\n\n`;
      output += `Group Name: DCGM_DEFAULT\n`;
      output += `Field Count: 15\n\n`;
      output += `Fields:\n`;
      output += `  203  - GPU_TEMP\n`;
      output += `  204  - POWER_USAGE\n`;
      output += `  252  - SM_CLOCK\n`;
      output += `  253  - MEM_CLOCK\n`;
      output += `  310  - PCIE_TX_BYTES\n`;
      output += `  311  - PCIE_RX_BYTES\n`;
      output += `  312  - NVLINK_TX_BYTES\n`;
      output += `  313  - NVLINK_RX_BYTES\n`;
      output += `  1001 - ECC_SBE_TOTAL\n`;
      output += `  1002 - ECC_DBE_TOTAL\n`;
      output += `  1003 - RETIRED_PAGES\n`;
      output += `  155  - GPU_UTILIZATION\n`;
      output += `  156  - MEM_UTILIZATION\n`;
      output += `  254  - FB_USED\n`;
      output += `  255  - FB_FREE\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['c', 'create'])) {
      const name = this.getFlagString(parsed, ['c', 'create'], 'new_group');
      return this.createSuccess(`Successfully created field group "${name}" with ID 4.`);
    }

    if (this.hasAnyFlag(parsed, ['d', 'delete'])) {
      const id = this.getFlagString(parsed, ['d', 'delete']);
      if (!id || id === '0' || id === '1' || id === '2') {
        return this.createError('Cannot delete system field groups.');
      }
      return this.createSuccess(`Successfully deleted field group ID ${id}.`);
    }

    return this.createError('Missing required flag. Run "dcgmi fieldgroup --help" for usage.');
  }

  /**
   * Handle dmon command - device monitoring
   */
  private handleDmon(parsed: ParsedCommand, context: CommandContext): CommandResult {
    const node = this.getNode(context);
    if (!node) {
      return this.createError('Unable to determine current node');
    }

    const gpuId = this.getFlagString(parsed, ['i', 'gpu-id']);
    const delay = this.getFlagNumber(parsed, ['d', 'delay'], 1000);
    const count = this.getFlagNumber(parsed, ['c', 'count'], 5);
    const fields = this.getFlagString(parsed, ['e', 'fields'], '155,156,203,204');

    const gpus = gpuId ? [node.gpus[parseInt(gpuId)]].filter(Boolean) : node.gpus;
    if (gpus.length === 0) {
      return this.createError(`GPU ${gpuId} not found`);
    }

    let output = `\x1b[1mDCGM Device Monitor\x1b[0m\n`;
    output += `Monitoring ${gpus.length} GPU(s) | Delay: ${delay}ms | Samples: ${count}\n`;
    output += `Fields: ${fields}\n`;
    output += `${'─'.repeat(80)}\n\n`;

    // Header based on fields
    const fieldMap: Record<string, string> = {
      '155': 'GPU%',
      '156': 'MEM%',
      '203': 'Temp',
      '204': 'Power',
      '252': 'SMClk',
      '253': 'MemClk',
      '310': 'PCIeTx',
      '311': 'PCIeRx',
    };

    const requestedFields = fields.split(',').map(f => f.trim());
    const headers = ['#', 'GPU', ...requestedFields.map(f => fieldMap[f] || `F${f}`)];

    output += headers.map(h => h.padEnd(8)).join(' ') + '\n';
    output += `${'─'.repeat(80)}\n`;

    // Generate sample data
    for (let sample = 0; sample < count; sample++) {
      gpus.forEach((gpu: GPU) => {
        const values = requestedFields.map((field: string) => {
          switch (field) {
            case '155': return `${Math.floor(Math.random() * 60 + 20)}%`;
            case '156': return `${Math.floor(Math.random() * 40 + 10)}%`;
            case '203': return `${Math.round(gpu.temperature + (Math.random() - 0.5) * 5)}C`;
            case '204': return `${Math.round(gpu.powerDraw + (Math.random() - 0.5) * 20)}W`;
            case '252': return `${1400 + Math.floor(Math.random() * 200)}`;
            case '253': return `${1500 + Math.floor(Math.random() * 100)}`;
            case '310': return `${Math.floor(Math.random() * 5000)}MB`;
            case '311': return `${Math.floor(Math.random() * 5000)}MB`;
            default: return 'N/A';
          }
        });
        output += [sample.toString(), gpu.id.toString(), ...values].map((v: string) => String(v).padEnd(8)).join(' ') + '\n';
      });
    }

    output += `\n\x1b[90m${count} samples collected.\x1b[0m\n`;
    output += `\nTip: Use 'dcgmi dmon -e 155,156,203,204 -d 500' for custom monitoring.\n`;

    return this.createSuccess(output);
  }
}
