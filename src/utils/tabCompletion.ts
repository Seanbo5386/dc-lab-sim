/**
 * Tab Completion Engine for Terminal
 *
 * Provides intelligent command completion including:
 * - Command name completion
 * - Subcommand completion
 * - Flag completion
 * - File path completion (simulated)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CompletionResult {
  /** Possible completions */
  completions: string[];
  /** Common prefix of all completions (for partial completion) */
  commonPrefix: string;
  /** Whether this is a partial completion (more than one option) */
  isPartial: boolean;
  /** Type of completion */
  type: 'command' | 'subcommand' | 'flag' | 'path' | 'value';
}

export interface CompletionContext {
  /** Full input line */
  line: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Current word being completed */
  currentWord: string;
  /** Word index (0 = command, 1+ = arguments) */
  wordIndex: number;
  /** Previous words in the line */
  previousWords: string[];
}

// ============================================================================
// COMMAND DEFINITIONS
// ============================================================================

/**
 * All available commands for completion
 */
export const AVAILABLE_COMMANDS: string[] = [
  // GPU Management
  'nvidia-smi',
  'dcgmi',
  'nvsm',
  'nvlink-audit',
  'nv-fabricmanager',

  // System
  'ls', 'cat', 'grep', 'cd', 'pwd', 'clear', 'help', 'exit', 'hostname',
  'hostnamectl', 'timedatectl', 'systemctl', 'journalctl', 'dmesg',

  // Networking
  'ibstat', 'ibstatus', 'iblinkinfo', 'ibnetdiscover', 'ibportstate',
  'perfquery', 'ibdiagnet', 'ibcheckerrors', 'ibporterrors',
  'mlxconfig', 'mlxlink', 'mlxcables', 'mlxtrace', 'mlxfwmanager', 'mst',

  // Slurm
  'sinfo', 'squeue', 'scontrol', 'sbatch', 'srun', 'scancel', 'sacct',

  // Containers
  'docker', 'nvidia-docker', 'singularity', 'enroot',

  // BMC/IPMI
  'ipmitool',

  // BCM
  'bcm', 'cmsh',

  // Storage
  'mount', 'df', 'lsblk',

  // PCI
  'lspci', 'setpci',

  // Benchmarks
  'nccl-tests', 'hpl',
];

/**
 * Subcommands for each command
 */
export const COMMAND_SUBCOMMANDS: Record<string, string[]> = {
  'nvidia-smi': [
    '-L', '-q', '-i', '-l', '-a', '-pm', '-mig', '-pl', '-lgc', '-rgc',
    '--query-gpu', '--format', '-d', '-r', 'topo', 'nvlink', 'mig', 'pci',
    'drain', 'reset', 'daemon', 'ecc', 'compute', 'accounting',
  ],
  'dcgmi': [
    'discovery', 'diag', 'dmon', 'health', 'group', 'config', 'policy',
    'stats', 'topo', 'profile', 'modules', 'introspect', 'nvlink', 'test',
  ],
  'ipmitool': [
    'fru', 'sensor', 'sel', 'lan', 'chassis', 'power', 'user', 'mc', 'sdr',
    'raw', 'sol', 'session', 'bmc', 'channel',
  ],
  'scontrol': [
    'show', 'update', 'create', 'delete', 'hold', 'release', 'requeue',
    'suspend', 'resume', 'wait', 'notify', 'completing', 'power',
  ],
  'docker': [
    'run', 'ps', 'images', 'pull', 'push', 'build', 'exec', 'logs',
    'stop', 'start', 'rm', 'rmi', 'inspect', 'network', 'volume',
  ],
  'systemctl': [
    'start', 'stop', 'restart', 'reload', 'status', 'enable', 'disable',
    'is-active', 'is-enabled', 'list-units', 'list-unit-files', 'daemon-reload',
  ],
  'mst': [
    'start', 'stop', 'restart', 'status',
  ],
  'hostnamectl': [
    'status', 'hostname', 'set-hostname', 'icon-name', 'chassis', 'deployment',
  ],
  'timedatectl': [
    'status', 'set-time', 'set-timezone', 'list-timezones', 'set-ntp',
    'timesync-status', 'show-timesync',
  ],
  'nvsm': [
    'show', 'dump', 'health', 'inventory', 'topo',
  ],
  'bcm': [
    'status', 'cluster', 'node', 'partition', 'image', 'network', 'job',
  ],
  'cmsh': [
    'device', 'partition', 'category', 'group', 'network', 'softwareimage',
  ],
  'mlxconfig': [
    '-d', '-q', 'query', 'set', 'reset',
  ],
  'mlxlink': [
    '-d', '-m', '-p', '-c', '-e',
  ],
  'nvlink-audit': [
    '--verbose', '-v', '-i', '--check-all', '--report', '--help', '--version',
  ],
  'mlxfwmanager': [
    '--query', '-q', '--online-query', '-u', '--update', '-d', '-y', '-h',
  ],
  'nv-fabricmanager': [
    'status', 'query', 'start', 'stop', 'restart', 'config', 'diag', 'topo',
  ],
  'ibnetdiscover': [
    '-l', '--list', '-g', '--grouping', '-s', '--switch', '-H', '--Hca_list',
    '-S', '--Switch_list', '-p', '--ports', '-V', '--version', '-h', '--help',
  ],
};

/**
 * Common flags for commands
 */
export const COMMON_FLAGS: Record<string, string[]> = {
  'nvidia-smi': ['-L', '-q', '-i', '-l', '-a', '-d', '-pm', '-mig', '-pl', '--help', '--query-gpu', '--format'],
  'dcgmi': ['-l', '-i', '-g', '-r', '-j', '-v', '--help'],
  'ipmitool': ['-I', '-H', '-U', '-P', '-L', '-v', '-c'],
  'sinfo': ['-N', '-l', '-p', '-a', '-n', '-o'],
  'squeue': ['-l', '-u', '-p', '-j', '-o', '-t'],
  'scontrol': ['show', 'update'],
  'docker': ['--help', '-d', '-i', '-t', '--rm', '--gpus', '-v', '-e', '-p'],
  'systemctl': ['--help', '-l', '--no-pager', '-a', '-t'],
  'ibstat': ['-p', '-s', '-v'],
  'mlxconfig': ['-d', '-q', '-y'],
  'mlxlink': ['-d', '-p', '-m', '-c'],
  'nv-fabricmanager': ['-h', '--help', '-v', '--version'],
  'ibnetdiscover': ['-l', '-g', '-H', '-S', '-p', '-V', '-h'],
};

/**
 * Service names for systemctl
 */
export const SYSTEMCTL_SERVICES: string[] = [
  'nvidia-fabricmanager', 'nvidia-persistenced', 'dcgm', 'nvsm',
  'slurmd', 'slurmctld', 'slurmdbd', 'munge',
  'docker', 'containerd',
  'nfs-server', 'nfs-client.target', 'autofs',
  'sshd', 'networking', 'systemd-networkd',
];

/**
 * Simulated file paths for completion
 */
export const SIMULATED_PATHS: Record<string, string[]> = {
  '/': ['root', 'home', 'etc', 'var', 'usr', 'tmp', 'opt', 'dev', 'proc', 'sys'],
  '/root': ['.bashrc', '.profile', 'scripts', 'data', 'logs'],
  '/etc': ['nvidia', 'slurm', 'docker', 'infiniband', 'hosts', 'fstab', 'passwd'],
  '/etc/slurm': ['slurm.conf', 'gres.conf', 'cgroup.conf', 'topology.conf'],
  '/etc/nvidia': ['nvswitch', 'fabricmanager'],
  '/var/log': ['nvidia', 'slurm', 'messages', 'syslog', 'dmesg'],
  '/opt': ['nvidia', 'mellanox', 'slurm'],
  '/usr/local': ['cuda', 'bin', 'lib'],
  '/dev': ['nvidia0', 'nvidia1', 'nvidia2', 'nvidia3', 'nvidia4', 'nvidia5', 'nvidia6', 'nvidia7', 'nvidiactl', 'nvidia-uvm', 'infiniband'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse input line into completion context
 */
export function parseCompletionContext(line: string, cursorPos?: number): CompletionContext {
  const position = cursorPos ?? line.length;
  const beforeCursor = line.substring(0, position);

  // Split into words, respecting quotes
  const words = beforeCursor.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];

  // Determine current word
  const lastChar = beforeCursor[beforeCursor.length - 1];
  const isAtWordEnd = lastChar && lastChar !== ' ';

  let currentWord = '';
  let wordIndex = words.length;

  if (isAtWordEnd && words.length > 0) {
    currentWord = words[words.length - 1];
    wordIndex = words.length - 1;
  }

  return {
    line,
    cursorPosition: position,
    currentWord,
    wordIndex,
    previousWords: wordIndex > 0 ? words.slice(0, wordIndex) : [],
  };
}

/**
 * Find longest common prefix of strings
 */
export function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

/**
 * Filter and sort completions by prefix
 */
export function filterCompletions(candidates: string[], prefix: string): string[] {
  const lowerPrefix = prefix.toLowerCase();
  return candidates
    .filter(c => c.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// MAIN COMPLETION FUNCTIONS
// ============================================================================

/**
 * Complete command names
 */
export function completeCommand(prefix: string): CompletionResult {
  const completions = filterCompletions(AVAILABLE_COMMANDS, prefix);
  const commonPrefix = findCommonPrefix(completions);

  return {
    completions,
    commonPrefix,
    isPartial: completions.length > 1,
    type: 'command',
  };
}

/**
 * Complete subcommands and flags for a given command
 */
export function completeSubcommand(command: string, prefix: string): CompletionResult {
  const subcommands = COMMAND_SUBCOMMANDS[command] || [];
  const flags = COMMON_FLAGS[command] || [];
  const candidates = [...subcommands, ...flags];

  const completions = filterCompletions(candidates, prefix);
  const commonPrefix = findCommonPrefix(completions);

  return {
    completions,
    commonPrefix,
    isPartial: completions.length > 1,
    type: prefix.startsWith('-') ? 'flag' : 'subcommand',
  };
}

/**
 * Complete file paths
 */
export function completePath(prefix: string): CompletionResult {
  // Determine directory and partial filename
  const lastSlash = prefix.lastIndexOf('/');
  const dir = lastSlash >= 0 ? prefix.substring(0, lastSlash) || '/' : '/root';
  const partial = lastSlash >= 0 ? prefix.substring(lastSlash + 1) : prefix;

  const entries = SIMULATED_PATHS[dir] || [];
  const matches = filterCompletions(entries, partial);

  // Build full paths
  const completions = matches.map(entry => {
    const fullPath = dir === '/' ? `/${entry}` : `${dir}/${entry}`;
    return fullPath;
  });

  const commonPrefix = findCommonPrefix(completions);

  return {
    completions,
    commonPrefix,
    isPartial: completions.length > 1,
    type: 'path',
  };
}

/**
 * Complete systemctl service names
 */
export function completeSystemctlService(prefix: string): CompletionResult {
  const completions = filterCompletions(SYSTEMCTL_SERVICES, prefix);
  const commonPrefix = findCommonPrefix(completions);

  return {
    completions,
    commonPrefix,
    isPartial: completions.length > 1,
    type: 'value',
  };
}

/**
 * Main completion function
 * Analyzes context and returns appropriate completions
 */
export function getCompletions(line: string, cursorPos?: number): CompletionResult {
  const context = parseCompletionContext(line, cursorPos);

  // No input - show all commands
  if (context.line.trim() === '') {
    return {
      completions: AVAILABLE_COMMANDS.slice(0, 10), // Limit for display
      commonPrefix: '',
      isPartial: true,
      type: 'command',
    };
  }

  // Completing first word (command)
  if (context.wordIndex === 0) {
    return completeCommand(context.currentWord);
  }

  // Completing subsequent words
  const command = context.previousWords[0];

  // Special handling for systemctl with service names
  if (command === 'systemctl' && context.wordIndex >= 2) {
    const action = context.previousWords[1];
    if (['start', 'stop', 'restart', 'status', 'enable', 'disable'].includes(action)) {
      return completeSystemctlService(context.currentWord);
    }
  }

  // Check if completing a path (starts with / or ./)
  if (context.currentWord.startsWith('/') || context.currentWord.startsWith('./')) {
    return completePath(context.currentWord);
  }

  // Complete subcommands/flags for known command
  if (COMMAND_SUBCOMMANDS[command] || COMMON_FLAGS[command]) {
    return completeSubcommand(command, context.currentWord);
  }

  // Default: no completions
  return {
    completions: [],
    commonPrefix: '',
    isPartial: false,
    type: 'command',
  };
}

/**
 * Format completions for terminal display
 */
export function formatCompletionsForDisplay(completions: string[], maxWidth: number = 80): string {
  if (completions.length === 0) return '';

  // Calculate column width
  const maxLen = Math.max(...completions.map(c => c.length));
  const colWidth = maxLen + 2;
  const numCols = Math.max(1, Math.floor(maxWidth / colWidth));

  // Format into columns
  const rows: string[] = [];
  for (let i = 0; i < completions.length; i += numCols) {
    const row = completions
      .slice(i, i + numCols)
      .map(c => c.padEnd(colWidth))
      .join('');
    rows.push(row);
  }

  return rows.join('\r\n');
}

/**
 * Apply completion to current line
 */
export function applyCompletion(
  line: string,
  completion: string,
  context: CompletionContext
): string {
  const beforeWord = line.substring(0, line.length - context.currentWord.length);
  return beforeWord + completion;
}

/**
 * Get completion suffix (e.g., space after complete word)
 */
export function getCompletionSuffix(result: CompletionResult): string {
  if (result.isPartial) return '';

  // Add space after complete command or subcommand
  if (result.type === 'command' || result.type === 'subcommand' || result.type === 'value') {
    return ' ';
  }

  // Paths might need trailing slash for directories
  if (result.type === 'path') {
    return ' ';
  }

  return '';
}
