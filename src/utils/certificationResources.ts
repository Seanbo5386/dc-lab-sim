/**
 * Certification Prep Resources
 *
 * Comprehensive study materials for NCP-AII certification exam preparation.
 */

export type DomainId = 'domain1' | 'domain2' | 'domain3' | 'domain4' | 'domain5';

// Domain metadata with exam weights
export interface DomainInfo {
  id: DomainId;
  name: string;
  weight: number;
  description: string;
  objectives: string[];
}

export const DOMAIN_INFO: Record<DomainId, DomainInfo> = {
  domain1: {
    id: 'domain1',
    name: 'DGX System Platform Bring-Up',
    weight: 31,
    description: 'Initialize and configure DGX systems from bare metal to operational state',
    objectives: [
      'Complete system POST and BIOS configuration',
      'Configure BMC/IPMI for remote management',
      'Install and verify NVIDIA drivers',
      'Configure network interfaces and storage',
      'Verify system discovery and inventory',
      'Update firmware components',
      'Configure Fabric Manager for NVSwitch',
    ],
  },
  domain2: {
    id: 'domain2',
    name: 'Accelerator Configuration',
    weight: 5,
    description: 'Configure GPU accelerators for optimal performance',
    objectives: [
      'Configure Multi-Instance GPU (MIG) partitions',
      'Verify NVLink topology and bandwidth',
      'Set GPU power limits and clocks',
      'Configure GPU persistence mode',
      'Manage GPU compute modes',
    ],
  },
  domain3: {
    id: 'domain3',
    name: 'Base Infrastructure and Software',
    weight: 19,
    description: 'Deploy and manage software infrastructure for AI workloads',
    objectives: [
      'Configure Slurm workload manager',
      'Deploy and manage containers with Docker/Enroot',
      'Configure NGC container registry access',
      'Set up shared storage (NFS, Lustre, BeeGFS)',
      'Configure Pyxis for Slurm container integration',
      'Manage software modules and environments',
    ],
  },
  domain4: {
    id: 'domain4',
    name: 'Platform Validation and Testing',
    weight: 33,
    description: 'Validate system health and benchmark performance',
    objectives: [
      'Run DCGM diagnostics and health checks',
      'Execute HPL benchmark for system validation',
      'Perform NCCL tests for multi-GPU communication',
      'Validate GPU-to-GPU bandwidth',
      'Test InfiniBand fabric performance',
      'Establish performance baselines',
    ],
  },
  domain5: {
    id: 'domain5',
    name: 'Troubleshooting',
    weight: 12,
    description: 'Diagnose and resolve system issues',
    objectives: [
      'Interpret XID error codes',
      'Diagnose thermal and power issues',
      'Troubleshoot NVLink connectivity',
      'Resolve driver and firmware issues',
      'Debug container GPU visibility',
      'Analyze system logs and events',
    ],
  },
};

// Key commands per domain
export interface KeyCommand {
  command: string;
  description: string;
  example: string;
  commonFlags?: string[];
  examTip?: string;
}

export const KEY_COMMANDS: Record<DomainId, KeyCommand[]> = {
  domain1: [
    {
      command: 'nvidia-smi',
      description: 'Display GPU information and status',
      example: 'nvidia-smi -L',
      commonFlags: ['-L', '-q', '--query-gpu', '-pm', '-pl'],
      examTip: 'Know the difference between -L (list GPUs) and -q (detailed query)',
    },
    {
      command: 'ipmitool',
      description: 'IPMI management utility for BMC',
      example: 'ipmitool sensor list',
      commonFlags: ['sensor', 'chassis', 'lan', 'user', 'sel'],
      examTip: 'Understand BMC network configuration with "ipmitool lan"',
    },
    {
      command: 'dcgmi discovery',
      description: 'Discover GPUs and NVSwitches in the system',
      example: 'dcgmi discovery -l',
      commonFlags: ['-l', '-c'],
      examTip: 'Use -c for compute hierarchy view',
    },
    {
      command: 'nvsm show',
      description: 'Display system inventory and status',
      example: 'nvsm show inventory',
      commonFlags: ['inventory', 'health', 'topology'],
      examTip: 'NVSM provides comprehensive DGX-specific views',
    },
    {
      command: 'nvidia-smi nvlink',
      description: 'Display NVLink topology and status',
      example: 'nvidia-smi nvlink --status',
      commonFlags: ['--status', '-c', '-e'],
      examTip: 'Check NVLink errors with -e flag',
    },
    {
      command: 'systemctl',
      description: 'Manage system services',
      example: 'systemctl status nvidia-fabricmanager',
      commonFlags: ['status', 'start', 'stop', 'restart', 'enable'],
      examTip: 'Know key NVIDIA services: nvidia-persistenced, nvidia-fabricmanager',
    },
  ],
  domain2: [
    {
      command: 'nvidia-smi mig',
      description: 'Configure Multi-Instance GPU partitions',
      example: 'nvidia-smi mig -lgip',
      commonFlags: ['-lgip', '-lgipp', '-cgi', '-cci', '-dci', '-dgi'],
      examTip: 'MIG requires persistence mode enabled first',
    },
    {
      command: 'nvidia-smi -pm',
      description: 'Set persistence mode',
      example: 'nvidia-smi -pm 1',
      commonFlags: ['0', '1'],
      examTip: 'Always enable persistence mode before MIG configuration',
    },
    {
      command: 'nvidia-smi -pl',
      description: 'Set GPU power limit',
      example: 'nvidia-smi -pl 300',
      commonFlags: ['-i'],
      examTip: 'Power limits must be within supported range (use -q for limits)',
    },
    {
      command: 'nvidia-smi topo',
      description: 'Display GPU topology',
      example: 'nvidia-smi topo -m',
      commonFlags: ['-m', '-mp'],
      examTip: 'NVL = NVLink, SYS = System (PCIe), PIX = Same PCIe switch',
    },
  ],
  domain3: [
    {
      command: 'sinfo',
      description: 'View Slurm partition/node information',
      example: 'sinfo -N -l',
      commonFlags: ['-N', '-l', '-p', '--states'],
      examTip: 'Node states: idle, allocated, down, drain, mixed',
    },
    {
      command: 'squeue',
      description: 'View Slurm job queue',
      example: 'squeue -u $USER',
      commonFlags: ['-u', '-j', '-p', '-t'],
      examTip: 'Job states: PD=pending, R=running, CG=completing',
    },
    {
      command: 'sbatch',
      description: 'Submit batch job to Slurm',
      example: 'sbatch --gres=gpu:4 script.sh',
      commonFlags: ['--gres', '-N', '-n', '-p', '-t', '--gpus'],
      examTip: 'GRES format: --gres=gpu:TYPE:COUNT or --gpus=COUNT',
    },
    {
      command: 'srun',
      description: 'Run parallel job in Slurm',
      example: 'srun --gres=gpu:1 nvidia-smi',
      commonFlags: ['--gres', '-N', '-n', '--pty'],
      examTip: 'Use --pty for interactive sessions',
    },
    {
      command: 'docker run',
      description: 'Run container with GPU support',
      example: 'docker run --gpus all nvidia/cuda:latest nvidia-smi',
      commonFlags: ['--gpus', '-v', '-e', '--rm', '-it'],
      examTip: '--gpus all OR --gpus device=0,1 for specific GPUs',
    },
    {
      command: 'enroot',
      description: 'Container runtime for HPC',
      example: 'enroot import docker://nvcr.io/nvidia/pytorch:latest',
      commonFlags: ['import', 'create', 'start', 'list'],
      examTip: 'Enroot works with Pyxis for Slurm integration',
    },
  ],
  domain4: [
    {
      command: 'dcgmi diag',
      description: 'Run DCGM diagnostic tests',
      example: 'dcgmi diag -r 3',
      commonFlags: ['-r 1', '-r 2', '-r 3', '-g'],
      examTip: 'Level 1=quick, 2=medium, 3=comprehensive (15+ min)',
    },
    {
      command: 'dcgmi health',
      description: 'Check GPU health status',
      example: 'dcgmi health -c -g 0',
      commonFlags: ['-c', '-g', '-w'],
      examTip: 'Use -w for watching continuous health status',
    },
    {
      command: 'all_reduce_perf',
      description: 'NCCL all-reduce benchmark',
      example: 'all_reduce_perf -b 8 -e 128M -f 2 -g 8',
      commonFlags: ['-b', '-e', '-f', '-g', '-n'],
      examTip: 'Expected bandwidth: ~200-250 GB/s for 8 A100 GPUs',
    },
    {
      command: 'hpl.sh',
      description: 'Run HPL benchmark',
      example: './hpl.sh --dat HPL.dat',
      commonFlags: ['--dat', '--cpu-affinity', '--gpu-affinity'],
      examTip: 'A100 theoretical peak: ~19.5 TFLOPS FP64',
    },
    {
      command: 'ibstat',
      description: 'InfiniBand port statistics',
      example: 'ibstat',
      commonFlags: ['-l', '-p'],
      examTip: 'LinkUp and Active indicate healthy IB connection',
    },
    {
      command: 'perfquery',
      description: 'Query InfiniBand port counters',
      example: 'perfquery -x',
      commonFlags: ['-x', '-l'],
      examTip: 'Check for error counters > 0',
    },
  ],
  domain5: [
    {
      command: 'nvidia-smi -q',
      description: 'Detailed GPU query for troubleshooting',
      example: 'nvidia-smi -q -d ECC,TEMPERATURE',
      commonFlags: ['-d ECC', '-d TEMPERATURE', '-d POWER', '-d CLOCK', '-d PAGE_RETIREMENT'],
      examTip: 'Use -d flags to filter specific info categories',
    },
    {
      command: 'dmesg',
      description: 'View kernel messages for GPU errors',
      example: 'dmesg | grep -i nvidia',
      commonFlags: ['-T', '-w'],
      examTip: 'XID errors appear in dmesg with "NVRM: Xid"',
    },
    {
      command: 'journalctl',
      description: 'View system logs',
      example: 'journalctl -u nvidia-fabricmanager',
      commonFlags: ['-u', '-f', '--since', '-p err'],
      examTip: 'Use -u to filter by service, -f for live tail',
    },
    {
      command: 'nvidia-bug-report.sh',
      description: 'Collect diagnostic information',
      example: 'nvidia-bug-report.sh',
      examTip: 'Run this before contacting NVIDIA support',
    },
    {
      command: 'dcgmi policy',
      description: 'Set GPU health policies',
      example: 'dcgmi policy -g 0 --set 1,1',
      commonFlags: ['--set', '-g'],
      examTip: 'Policies trigger actions on health violations',
    },
    {
      command: 'ibdiagnet',
      description: 'InfiniBand fabric diagnostics',
      example: 'ibdiagnet -ls 10',
      commonFlags: ['-ls', '-pc', '-P'],
      examTip: 'Checks fabric health, link speed, and errors',
    },
  ],
};

// Common exam pitfalls and tips
export interface ExamTip {
  id: string;
  category: 'command' | 'concept' | 'procedure' | 'gotcha';
  domain: DomainId | 'general';
  title: string;
  description: string;
  details?: string;
}

export const EXAM_TIPS: ExamTip[] = [
  // General tips
  {
    id: 'tip-1',
    category: 'concept',
    domain: 'general',
    title: 'Know the Exam Weights',
    description: 'Domain 4 (Validation) at 33% and Domain 1 (Bring-Up) at 31% make up 64% of the exam.',
    details: 'Focus your study time proportionally: Domain 4 > Domain 1 > Domain 3 > Domain 5 > Domain 2',
  },
  {
    id: 'tip-2',
    category: 'gotcha',
    domain: 'general',
    title: 'Command vs Output',
    description: 'Questions may show command output and ask which command produced it.',
    details: 'Memorize the distinctive output format of key commands like nvidia-smi, dcgmi, ibstat',
  },

  // Domain 1 tips
  {
    id: 'tip-d1-1',
    category: 'procedure',
    domain: 'domain1',
    title: 'POST Sequence',
    description: 'Know the correct order: BIOS/UEFI → BMC init → Driver load → GPU enumeration',
    details: 'POST failures often manifest as missing GPUs in nvidia-smi',
  },
  {
    id: 'tip-d1-2',
    category: 'command',
    domain: 'domain1',
    title: 'BMC vs Host Commands',
    description: 'ipmitool runs from host OS, but some operations (like sol activate) connect to BMC',
    details: 'BMC has its own network interface configured separately from host',
  },
  {
    id: 'tip-d1-3',
    category: 'gotcha',
    domain: 'domain1',
    title: 'Fabric Manager Dependency',
    description: 'NVSwitch systems require nvidia-fabricmanager service for full NVLink functionality',
    details: 'Check service status: systemctl status nvidia-fabricmanager',
  },

  // Domain 2 tips
  {
    id: 'tip-d2-1',
    category: 'procedure',
    domain: 'domain2',
    title: 'MIG Setup Order',
    description: 'Enable MIG mode → Create GPU instances → Create compute instances',
    details: 'nvidia-smi -mig 1 -i 0, then nvidia-smi mig -cgi <profile>, then nvidia-smi mig -cci',
  },
  {
    id: 'tip-d2-2',
    category: 'gotcha',
    domain: 'domain2',
    title: 'MIG and Persistence Mode',
    description: 'MIG configuration requires persistence mode enabled first',
    details: 'nvidia-smi -pm 1 must succeed before MIG operations',
  },
  {
    id: 'tip-d2-3',
    category: 'concept',
    domain: 'domain2',
    title: 'NVLink Topology Codes',
    description: 'Know topology matrix abbreviations: NV# = NVLink, SYS = System/PCIe, PIX = Same switch',
    details: 'Higher NV numbers = more NVLink connections (NV12 = 12 links)',
  },

  // Domain 3 tips
  {
    id: 'tip-d3-1',
    category: 'command',
    domain: 'domain3',
    title: 'GRES Configuration',
    description: 'Slurm GPU allocation: --gres=gpu:N or --gpus=N or --gpus-per-node=N',
    details: 'Check gres.conf for GPU definitions: Name=gpu Type=a100 File=/dev/nvidia[0-7]',
  },
  {
    id: 'tip-d3-2',
    category: 'gotcha',
    domain: 'domain3',
    title: 'Container GPU Visibility',
    description: 'Docker needs --gpus flag, NVIDIA_VISIBLE_DEVICES env var, or device mapping',
    details: 'nvidia-container-toolkit must be installed and configured',
  },
  {
    id: 'tip-d3-3',
    category: 'concept',
    domain: 'domain3',
    title: 'NGC Authentication',
    description: 'NGC containers require API key: docker login nvcr.io',
    details: 'Username: $oauthtoken, Password: <NGC API Key>',
  },

  // Domain 4 tips
  {
    id: 'tip-d4-1',
    category: 'procedure',
    domain: 'domain4',
    title: 'DCGM Diagnostic Levels',
    description: 'Level 1: Quick (1-2 min), Level 2: Medium (5-10 min), Level 3: Long (15+ min)',
    details: 'Level 3 includes stress tests - use for thorough validation, not daily checks',
  },
  {
    id: 'tip-d4-2',
    category: 'concept',
    domain: 'domain4',
    title: 'Expected NCCL Bandwidth',
    description: '8x A100 with NVLink: ~200-250 GB/s aggregate for all_reduce',
    details: 'Significantly lower indicates NVLink or configuration issues',
  },
  {
    id: 'tip-d4-3',
    category: 'gotcha',
    domain: 'domain4',
    title: 'HPL Problem Size',
    description: 'HPL efficiency depends on problem size - larger N = better efficiency',
    details: 'Too small N = memory bandwidth bound, not compute bound',
  },

  // Domain 5 tips
  {
    id: 'tip-d5-1',
    category: 'concept',
    domain: 'domain5',
    title: 'Critical XID Codes',
    description: 'XID 31: GPU memory page fault, XID 43: GPU stopped processing, XID 79: GPU fallen off bus',
    details: 'XID 79 usually requires reboot or GPU reset',
  },
  {
    id: 'tip-d5-2',
    category: 'procedure',
    domain: 'domain5',
    title: 'Thermal Troubleshooting',
    description: 'Check: Fan RPM → Airflow → Ambient temp → GPU load → Power limits',
    details: 'nvidia-smi -q -d TEMPERATURE shows thresholds and current values',
  },
  {
    id: 'tip-d5-3',
    category: 'gotcha',
    domain: 'domain5',
    title: 'ECC vs Non-ECC Errors',
    description: 'Volatile ECC errors clear on reboot, Aggregate ECC errors persist',
    details: 'Check both: nvidia-smi -q -d ECC (volatile and aggregate counts)',
  },
];

// Quick reference sheet data
export interface QuickRefSection {
  title: string;
  items: { label: string; value: string }[];
}

export const QUICK_REFERENCE: QuickRefSection[] = [
  {
    title: 'GPU Information',
    items: [
      { label: 'List all GPUs', value: 'nvidia-smi -L' },
      { label: 'Detailed GPU info', value: 'nvidia-smi -q' },
      { label: 'GPU topology', value: 'nvidia-smi topo -m' },
      { label: 'NVLink status', value: 'nvidia-smi nvlink --status' },
      { label: 'MIG profiles', value: 'nvidia-smi mig -lgip' },
    ],
  },
  {
    title: 'DCGM Commands',
    items: [
      { label: 'Discover GPUs', value: 'dcgmi discovery -l' },
      { label: 'Quick health check', value: 'dcgmi diag -r 1' },
      { label: 'Full diagnostics', value: 'dcgmi diag -r 3' },
      { label: 'Watch health', value: 'dcgmi health -c -w' },
      { label: 'GPU stats', value: 'dcgmi stats -g 0 -e' },
    ],
  },
  {
    title: 'Slurm Commands',
    items: [
      { label: 'View nodes', value: 'sinfo -N -l' },
      { label: 'View jobs', value: 'squeue -u $USER' },
      { label: 'Submit job', value: 'sbatch --gres=gpu:N script.sh' },
      { label: 'Interactive job', value: 'srun --gres=gpu:1 --pty bash' },
      { label: 'Cancel job', value: 'scancel <jobid>' },
    ],
  },
  {
    title: 'InfiniBand',
    items: [
      { label: 'Port status', value: 'ibstat' },
      { label: 'Port errors', value: 'ibporterrors' },
      { label: 'Link info', value: 'iblinkinfo' },
      { label: 'Performance counters', value: 'perfquery -x' },
      { label: 'Fabric diagnostics', value: 'ibdiagnet' },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      { label: 'Kernel GPU errors', value: 'dmesg | grep -i nvidia' },
      { label: 'Service logs', value: 'journalctl -u nvidia-fabricmanager' },
      { label: 'ECC errors', value: 'nvidia-smi -q -d ECC' },
      { label: 'Temperature', value: 'nvidia-smi -q -d TEMPERATURE' },
      { label: 'Bug report', value: 'nvidia-bug-report.sh' },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'GPU persistence', value: 'systemctl status nvidia-persistenced' },
      { label: 'Fabric manager', value: 'systemctl status nvidia-fabricmanager' },
      { label: 'DCGM service', value: 'systemctl status nvidia-dcgm' },
      { label: 'Slurm controller', value: 'systemctl status slurmctld' },
      { label: 'Slurm daemon', value: 'systemctl status slurmd' },
    ],
  },
];

// NVIDIA documentation links
export interface DocLink {
  title: string;
  url: string;
  description: string;
  domain?: DomainId;
}

export const DOCUMENTATION_LINKS: DocLink[] = [
  {
    title: 'NVIDIA SMI User Guide',
    url: 'https://developer.nvidia.com/nvidia-system-management-interface',
    description: 'Official nvidia-smi documentation',
    domain: 'domain1',
  },
  {
    title: 'DCGM User Guide',
    url: 'https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/',
    description: 'Data Center GPU Manager documentation',
    domain: 'domain4',
  },
  {
    title: 'MIG User Guide',
    url: 'https://docs.nvidia.com/datacenter/tesla/mig-user-guide/',
    description: 'Multi-Instance GPU configuration guide',
    domain: 'domain2',
  },
  {
    title: 'DGX System Documentation',
    url: 'https://docs.nvidia.com/dgx/',
    description: 'DGX system user guides and reference',
    domain: 'domain1',
  },
  {
    title: 'NGC Container Registry',
    url: 'https://catalog.ngc.nvidia.com/',
    description: 'NVIDIA GPU Cloud container catalog',
    domain: 'domain3',
  },
  {
    title: 'NCCL Documentation',
    url: 'https://docs.nvidia.com/deeplearning/nccl/user-guide/',
    description: 'NVIDIA Collective Communications Library',
    domain: 'domain4',
  },
  {
    title: 'XID Error Reference',
    url: 'https://docs.nvidia.com/deploy/xid-errors/',
    description: 'GPU XID error code reference',
    domain: 'domain5',
  },
  {
    title: 'NCP-AII Exam Guide',
    url: 'https://www.nvidia.com/en-us/training/certification/',
    description: 'Official NVIDIA certification information',
  },
];

// Utility functions
export function getDomainInfo(domainId: DomainId): DomainInfo {
  return DOMAIN_INFO[domainId];
}

export function getKeyCommands(domainId: DomainId): KeyCommand[] {
  return KEY_COMMANDS[domainId];
}

export function getExamTips(domainId?: DomainId): ExamTip[] {
  if (!domainId) {
    return EXAM_TIPS;
  }
  return EXAM_TIPS.filter(tip => tip.domain === domainId || tip.domain === 'general');
}

export function getQuickReference(): QuickRefSection[] {
  return QUICK_REFERENCE;
}

export function getDocumentationLinks(domainId?: DomainId): DocLink[] {
  if (!domainId) {
    return DOCUMENTATION_LINKS;
  }
  return DOCUMENTATION_LINKS.filter(link => !link.domain || link.domain === domainId);
}

// Generate printable study guide text
export function generateStudyGuide(domainId: DomainId): string {
  const domain = DOMAIN_INFO[domainId];
  const commands = KEY_COMMANDS[domainId];
  const tips = getExamTips(domainId);

  const guide = `
====================================
${domain.name}
Exam Weight: ${domain.weight}%
====================================

DESCRIPTION:
${domain.description}

OBJECTIVES:
${domain.objectives.map((obj, i) => `  ${i + 1}. ${obj}`).join('\n')}

KEY COMMANDS:
${commands.map(cmd => `
  ${cmd.command}
  Description: ${cmd.description}
  Example: ${cmd.example}
  Common flags: ${cmd.commonFlags?.join(', ') || 'N/A'}
  Exam tip: ${cmd.examTip || 'N/A'}
`).join('\n')}

EXAM TIPS:
${tips.map(tip => `
  [${tip.category.toUpperCase()}] ${tip.title}
  ${tip.description}
  ${tip.details ? `Details: ${tip.details}` : ''}
`).join('\n')}
`;

  return guide.trim();
}

// Generate full quick reference sheet
export function generateQuickRefSheet(): string {
  let sheet = `
====================================
NCP-AII QUICK REFERENCE SHEET
====================================
`;

  for (const section of QUICK_REFERENCE) {
    sheet += `\n${section.title}\n${'='.repeat(section.title.length)}\n`;
    for (const item of section.items) {
      sheet += `  ${item.label.padEnd(25)} ${item.value}\n`;
    }
  }

  return sheet.trim();
}
