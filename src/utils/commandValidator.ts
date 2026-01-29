import type { ValidationRule, ValidationResult } from '@/types/scenarios';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * Parses a command into its components
 */
function parseCommand(command: string): {
  baseCommand: string;
  args: string[];
  flags: Map<string, string | boolean>;
  isPiped: boolean;
  pipedCommands?: string[];
} {
  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0] || '';
  const args: string[] = [];
  const flags = new Map<string, string | boolean>();

  // Check for pipes
  const isPiped = command.includes('|');
  let pipedCommands: string[] | undefined;

  if (isPiped) {
    pipedCommands = command.split('|').map(c => c.trim());
  }

  // Parse flags and arguments
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part.startsWith('--')) {
      // Long flag
      const flagName = part.substring(2);
      const nextPart = parts[i + 1];

      if (nextPart && !nextPart.startsWith('-')) {
        flags.set(flagName, nextPart);
        i++; // Skip the value
      } else {
        flags.set(flagName, true);
      }
    } else if (part.startsWith('-') && part.length > 1 && !/^-\d+$/.test(part)) {
      // Short flag(s) - but not negative numbers
      const flagChars = part.substring(1);

      if (flagChars.length === 1) {
        // Single short flag, might have a value
        const nextPart = parts[i + 1];

        if (nextPart && !nextPart.startsWith('-')) {
          flags.set(flagChars, nextPart);
          i++; // Skip the value
        } else {
          flags.set(flagChars, true);
        }
      } else {
        // Multiple short flags combined (e.g., -Nel)
        for (const char of flagChars) {
          flags.set(char, true);
        }
      }
    } else {
      // Regular argument
      args.push(part);
    }
  }

  return { baseCommand, args, flags, isPiped, pipedCommands };
}

/**
 * Validates a command execution against expected commands with improved matching
 */
export function validateCommandExecuted(
  executedCommand: string,
  expectedCommands: string[]
): boolean {
  const normalizedExecuted = executedCommand.trim().toLowerCase();

  // Check for common invalid patterns first
  const invalidPatterns = [
    /\s-i\s+-\d+/,           // -i -0 (negative GPU ID)
    /\s--id\s+-\d+/,         // --id -0
    /nvidia-smi.*\s-gpu\s/,  // -gpu instead of -i
    /sinfo\s+help/,          // sinfo help (not a valid subcommand)
    /scontrol\s+help(?!\s)/  // scontrol help without proper argument
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(normalizedExecuted)) {
      return false;
    }
  }

  const executedParsed = parseCommand(normalizedExecuted);

  return expectedCommands.some(expected => {
    const normalizedExpected = expected.trim().toLowerCase();
    const expectedParsed = parseCommand(normalizedExpected);

    // Strategy 1: Exact match
    if (normalizedExecuted === normalizedExpected) {
      return true;
    }

    // Strategy 2: For piped commands, check each segment
    if (executedParsed.isPiped && expectedParsed.isPiped) {
      const execPipes = executedParsed.pipedCommands || [];
      const expPipes = expectedParsed.pipedCommands || [];

      // Check if all expected pipe segments are present
      return expPipes.every(expSegment => {
        const expCmd = parseCommand(expSegment);
        return execPipes.some(execSegment => {
          const execCmd = parseCommand(execSegment);
          return execCmd.baseCommand === expCmd.baseCommand;
        });
      });
    }

    // Strategy 3: Base command and flags matching
    if (executedParsed.baseCommand === expectedParsed.baseCommand) {
      // If expected command has no flags/args, just matching base command is enough
      if (expectedParsed.flags.size === 0 && expectedParsed.args.length === 0) {
        return true;
      }

      // Check if all expected flags are present in executed command
      let allFlagsMatch = true;
      for (const [flag, value] of expectedParsed.flags) {
        if (!executedParsed.flags.has(flag)) {
          allFlagsMatch = false;
          break;
        }

        // If expected flag has a specific value, check it matches
        if (value !== true && executedParsed.flags.get(flag) !== value) {
          allFlagsMatch = false;
          break;
        }
      }

      if (allFlagsMatch) {
        // Check critical arguments if any
        if (expectedParsed.args.length > 0) {
          // For commands like "scontrol show node", check args match
          return expectedParsed.args.every((arg, idx) =>
            executedParsed.args[idx] === arg
          );
        }
        return true;
      }
    }

    // Strategy 4: Special handling for common command patterns
    // Handle "sinfo -o" with format strings
    if (executedParsed.baseCommand === 'sinfo' && expectedParsed.baseCommand === 'sinfo') {
      const execHasO = executedParsed.flags.has('o') || executedParsed.flags.has('output-format');
      const expHasO = expectedParsed.flags.has('o') || expectedParsed.flags.has('output-format');

      if (execHasO && expHasO) {
        // Both have output format flag, consider it a match
        return true;
      }
    }

    // Handle "scontrol show <type>" commands
    if (executedParsed.baseCommand === 'scontrol' && expectedParsed.baseCommand === 'scontrol') {
      if (executedParsed.args[0] === 'show' && expectedParsed.args[0] === 'show') {
        // If both are show commands, check the target type
        const execTarget = executedParsed.args[1]?.toLowerCase();
        const expTarget = expectedParsed.args[1]?.toLowerCase();

        // Handle variations: "node", "nodes", "partition", "partitions"
        if (execTarget && expTarget) {
          const normalizeTarget = (t: string) => t.replace(/s$/, ''); // Remove trailing 's'
          return normalizeTarget(execTarget) === normalizeTarget(expTarget);
        }
      }
    }

    return false;
  });
}

/**
 * Validates command output against a regex pattern
 */
function validateOutputMatch(
  output: string,
  pattern: string
): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(output);
  } catch (error) {
    console.error('Invalid regex pattern:', pattern, error);
    return false;
  }
}

/**
 * Validates cluster state against specific checks
 */
function validateStateCheck(
  stateCheck: string,
  stateParams?: Record<string, string | number | boolean | undefined>
): boolean {
  const store = useSimulationStore.getState();
  const { cluster } = store;

  switch (stateCheck) {
    case 'gpu-healthy': {
      // Check if specified GPU (or all GPUs) are healthy
      const nodeId = stateParams?.nodeId;
      const gpuId = stateParams?.gpuId;

      if (nodeId && gpuId !== undefined) {
        const node = cluster.nodes.find(n => n.id === nodeId);
        const gpu = node?.gpus.find(g => g.id === gpuId);
        return gpu?.healthStatus === 'OK';
      }

      // Check all GPUs
      return cluster.nodes.every(node =>
        node.gpus.every(gpu => gpu.healthStatus === 'OK')
      );
    }

    case 'nvlink-active': {
      // Check if NVLink is active
      const nodeId = stateParams?.nodeId;
      const gpuId = stateParams?.gpuId;

      if (nodeId && gpuId !== undefined) {
        const node = cluster.nodes.find(n => n.id === nodeId);
        const gpu = node?.gpus.find(g => g.id === gpuId);
        return gpu?.nvlinks.every(link => link.status === 'Active') ?? false;
      }

      return cluster.nodes.every(node =>
        node.gpus.every(gpu => gpu.nvlinks.every(link => link.status === 'Active'))
      );
    }

    case 'slurm-online': {
      // Check if Slurm nodes are online (idle or alloc, not down/drain)
      return cluster.nodes.every(node =>
        node.slurmState === 'idle' || node.slurmState === 'alloc'
      );
    }

    case 'temperature-normal': {
      // Check if GPU temperatures are within normal range
      const maxTemp = typeof stateParams?.maxTemp === 'number' ? stateParams.maxTemp : 85;

      return cluster.nodes.every(node =>
        node.gpus.every(gpu => gpu.temperature < maxTemp)
      );
    }

    case 'ecc-cleared': {
      // Check if ECC errors are cleared
      return cluster.nodes.every(node =>
        node.gpus.every(gpu =>
          gpu.eccErrors.singleBit === 0 && gpu.eccErrors.doubleBit === 0
        )
      );
    }

    default:
      console.warn(`Unknown state check: ${stateCheck}`);
      return false;
  }
}

/**
 * Validates a single validation rule
 */
export function validateRule(
  rule: ValidationRule,
  context: {
    executedCommand?: string;
    commandOutput?: string;
    executionTime?: number;
  }
): ValidationResult {
  const { type, expectedCommands, outputPattern, stateCheck, stateParams, maxSeconds, requireAllCommands } = rule;

  switch (type) {
    case 'command-executed': {
      if (!expectedCommands) {
        return {
          passed: false,
          message: 'No expected commands defined',
          timestamp: Date.now(),
          rule,
        };
      }

      // If requireAllCommands is true, check if all commands have been executed
      if (requireAllCommands) {
        const executedCommands = commandTracker.getExecutedCommands(expectedCommands);
        const passed = executedCommands.length === expectedCommands.length;

        if (!passed) {
          const remaining = expectedCommands.filter(cmd => !executedCommands.includes(cmd));
          return {
            passed: false,
            message: `Try all suggested commands. Remaining: ${remaining.length}/${expectedCommands.length}`,
            timestamp: Date.now(),
            rule,
          };
        }

        return {
          passed: true,
          message: 'All suggested commands executed successfully',
          timestamp: Date.now(),
          rule,
        };
      }

      // Original behavior: check if current command matches any expected
      if (!context.executedCommand) {
        return {
          passed: false,
          message: 'No command executed',
          timestamp: Date.now(),
          rule,
        };
      }

      const passed = validateCommandExecuted(context.executedCommand, expectedCommands);

      // Special handling for GPU reset with XID 79 errors
      // When attempting GPU reset, if the output contains XID 79 error message,
      // the attempt itself is valid even though the command "failed"
      if (passed && context.commandOutput) {
        const isGpuReset = context.executedCommand.includes('--gpu-reset') ||
                           context.executedCommand.includes('-r');
        const hasXid79Error = context.commandOutput.includes('XID 79') ||
                              context.commandOutput.includes('fallen off the bus');

        if (isGpuReset && hasXid79Error) {
          // For XID 79, attempting the reset is the correct action
          // The failure message is the expected outcome
          return {
            passed: true,
            message: 'GPU reset attempted (XID 79: reset not possible, as expected)',
            timestamp: Date.now(),
            rule,
          };
        }
      }

      return {
        passed,
        message: passed
          ? 'Command executed successfully'
          : `Expected one of: ${expectedCommands.join(', ')}`,
        timestamp: Date.now(),
        rule,
      };
    }

    case 'output-match': {
      if (!context.commandOutput || !outputPattern) {
        return {
          passed: false,
          message: 'No output to validate',
          timestamp: Date.now(),
          rule,
        };
      }

      const passed = validateOutputMatch(context.commandOutput, outputPattern);

      return {
        passed,
        message: passed
          ? 'Output matches expected pattern'
          : `Output did not match pattern: ${outputPattern}`,
        timestamp: Date.now(),
        rule,
      };
    }

    case 'state-check': {
      if (!stateCheck) {
        return {
          passed: false,
          message: 'No state check specified',
          timestamp: Date.now(),
          rule,
        };
      }

      const passed = validateStateCheck(stateCheck, stateParams);

      return {
        passed,
        message: passed
          ? 'State validation passed'
          : `State check failed: ${stateCheck}`,
        timestamp: Date.now(),
        rule,
      };
    }

    case 'time-limit': {
      if (context.executionTime === undefined || !maxSeconds) {
        return {
          passed: true,
          message: 'Time limit not applicable',
          timestamp: Date.now(),
          rule,
        };
      }

      const passed = context.executionTime <= maxSeconds;

      return {
        passed,
        message: passed
          ? `Completed in ${context.executionTime}s`
          : `Exceeded time limit of ${maxSeconds}s (took ${context.executionTime}s)`,
        timestamp: Date.now(),
        rule,
      };
    }

    default:
      return {
        passed: false,
        message: `Unknown validation type: ${type}`,
        timestamp: Date.now(),
        rule,
      };
  }
}

/**
 * Validates all rules for a scenario step
 */
export function validateStepRules(
  rules: ValidationRule[],
  context: {
    executedCommand?: string;
    commandOutput?: string;
    executionTime?: number;
  }
): ValidationResult[] {
  return rules.map(rule => validateRule(rule, context));
}

/**
 * Checks if step is completed based on validation results
 */
export function isStepCompleted(validationResults: ValidationResult[]): boolean {
  // Step is completed if all validations pass
  return validationResults.every(result => result.passed);
}

/**
 * Tracks command execution for validation
 */
export class CommandTracker {
  private commandHistory: Array<{
    command: string;
    output: string;
    timestamp: number;
    exitCode: number;
  }> = [];

  recordCommand(command: string, output: string, exitCode: number): void {
    this.commandHistory.push({
      command,
      output,
      timestamp: Date.now(),
      exitCode,
    });
  }

  getRecentCommand(): {
    command: string;
    output: string;
    timestamp: number;
    exitCode: number;
  } | null {
    return this.commandHistory[this.commandHistory.length - 1] || null;
  }

  getCommandHistory(): Array<{
    command: string;
    output: string;
    timestamp: number;
    exitCode: number;
  }> {
    return [...this.commandHistory];
  }

  clear(): void {
    this.commandHistory = [];
  }

  /**
   * Checks if a specific command was executed recently
   */
  wasCommandExecuted(expectedCommand: string, withinSeconds: number = 60): boolean {
    const cutoffTime = Date.now() - (withinSeconds * 1000);
    const recentCommands = this.commandHistory.filter(cmd => cmd.timestamp >= cutoffTime);

    return recentCommands.some(cmd =>
      validateCommandExecuted(cmd.command, [expectedCommand])
    );
  }

  /**
   * Get which expected commands have been executed for the current step
   */
  getExecutedCommands(expectedCommands: string[], withinSeconds: number = 3600): string[] {
    const cutoffTime = Date.now() - (withinSeconds * 1000);
    const recentCommands = this.commandHistory.filter(cmd => cmd.timestamp >= cutoffTime);

    const executed: string[] = [];
    for (const expected of expectedCommands) {
      if (recentCommands.some(cmd => validateCommandExecuted(cmd.command, [expected]))) {
        executed.push(expected);
      }
    }

    return executed;
  }

  /**
   * Check if all expected commands have been executed
   */
  allCommandsExecuted(expectedCommands: string[], withinSeconds: number = 3600): boolean {
    const executed = this.getExecutedCommands(expectedCommands, withinSeconds);
    return executed.length === expectedCommands.length;
  }
}

// Singleton instance for the application
export const commandTracker = new CommandTracker();
