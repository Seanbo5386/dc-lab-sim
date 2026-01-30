import { BaseSimulator } from './BaseSimulator';
import type { CommandResult, CommandContext } from '@/types/commands';
import type { ParsedCommand } from '@/utils/commandParser';
import type { ClusterKitAssessment } from '@/types/clusterKit';
import { useSimulationStore } from '@/store/simulationStore';

export class ClusterKitSimulator extends BaseSimulator {
  constructor() {
    super();

    this.registerCommand('assess', this.handleAssess.bind(this), {
      name: 'assess',
      description: 'Run full node assessment',
      usage: 'clusterkit assess',
      examples: ['clusterkit assess'],
    });

    this.registerCommand('check', this.handleCheck.bind(this), {
      name: 'check',
      description: 'Run specific category check',
      usage: 'clusterkit check <category>',
      examples: [
        'clusterkit check gpu',
        'clusterkit check network',
        'clusterkit check storage',
        'clusterkit check firmware',
        'clusterkit check drivers',
      ],
    });

    this.registerValidSubcommands(['assess', 'check']);
  }

  getMetadata() {
    return {
      name: 'clusterkit',
      version: '1.0.0',
      description: 'Comprehensive Node Assessment Tool',
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle global flags
    if (this.hasAnyFlag(parsed, ['version', 'v'])) {
      return this.handleVersion();
    }
    if (this.hasAnyFlag(parsed, ['help', 'h'])) {
      return this.handleHelp();
    }

    // Get subcommand
    const subcommand = parsed.subcommands[0] || parsed.positionalArgs[0];

    if (!subcommand) {
      return this.handleHelp();
    }

    // Validate subcommand
    const validationError = this.validateSubcommand(subcommand);
    if (validationError) {
      return validationError;
    }

    const handler = this.getCommand(subcommand);
    if (!handler) {
      return this.createError(`Unknown subcommand: ${subcommand}`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    return handler(parsed, context) as CommandResult;
  }

  private getTargetNode(parsed: ParsedCommand, _context: CommandContext): any {
    const cluster = useSimulationStore.getState().cluster;
    const nodeFlag = parsed.flags.get('node');

    if (nodeFlag) {
      const node = cluster.nodes.find((n: any) => n.id === nodeFlag);
      if (!node) {
        throw new Error(`Node ${nodeFlag} not found in cluster`);
      }
      return node;
    }

    // Default to first node
    return cluster.nodes[0];
  }

  private handleAssess(parsed: ParsedCommand, context: CommandContext): CommandResult {
    try {
      const node = this.getTargetNode(parsed, context);
      const verbose = parsed.flags.get('verbose') || parsed.flags.get('v');

      const assessment: ClusterKitAssessment = {
        nodeId: node.id,
        hostname: node.hostname || `${node.id}.cluster.local`,
        timestamp: new Date(),
        overallHealth: 'pass',
        checks: {
          gpu: { status: 'pass', message: 'GPU check placeholder' },
          network: { status: 'pass', message: 'Network check placeholder' },
          storage: { status: 'pass', message: 'Storage check placeholder' },
          firmware: { status: 'pass', message: 'Firmware check placeholder' },
          drivers: { status: 'pass', message: 'Driver check placeholder' }
        }
      };

      return {
        output: this.formatAssessmentOutput(assessment, !!verbose),
        exitCode: 0
      };
    } catch (error) {
      return {
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1
      };
    }
  }

  private handleCheck(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    const category = parsed.positionalArgs[0];

    if (!category) {
      return this.createError(
        'Missing required argument: category\n\n' +
        'Valid categories: gpu, network, storage, firmware, drivers\n\n' +
        'Example: clusterkit check gpu'
      );
    }

    const validCategories = ['gpu', 'network', 'storage', 'firmware', 'drivers'];
    if (!validCategories.includes(category)) {
      return this.createError(
        `Invalid category: ${category}\n\n` +
        'Valid categories: gpu, network, storage, firmware, drivers'
      );
    }

    // Skeleton - will be implemented in Task 2
    return this.createSuccess('Specific check functionality coming soon');
  }

  private formatAssessmentOutput(assessment: ClusterKitAssessment, verbose: boolean = false): string {
    let output = `ClusterKit Assessment Report\n`;
    output += `Node: ${assessment.nodeId}\n`;
    output += `Hostname: ${assessment.hostname}\n`;
    output += `Timestamp: ${assessment.timestamp.toISOString()}\n`;
    output += `Overall Health: ${assessment.overallHealth.toUpperCase()}\n\n`;

    if (verbose) {
      output += `Detailed Checks:\n`;
      Object.entries(assessment.checks).forEach(([category, result]) => {
        output += `  ${category}: ${result.status} - ${result.message}\n`;
        if (result.details) {
          result.details.forEach(detail => output += `    - ${detail}\n`);
        }
      });
    }

    return output;
  }
}
