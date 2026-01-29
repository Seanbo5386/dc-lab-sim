/**
 * Learning Path Engine - Structured learning paths for NCP-AII certification
 *
 * Provides guided curricula with modules, lessons, and interactive tutorials
 * that integrate with the existing learningStore for progress tracking.
 */

import type { DomainId, DomainInfo } from '@/types/scenarios';
import { DOMAINS } from '@/types/scenarios';

// ============================================================================
// TYPES
// ============================================================================

export type TutorialStepType =
  | 'concept'      // Explanation/reading material
  | 'command'      // Execute a command
  | 'observe'      // Observe output without action
  | 'quiz'         // Quick comprehension check
  | 'practice';    // Free-form practice

export interface TutorialStep {
  id: string;
  type: TutorialStepType;
  title: string;
  content: string;           // Main instruction/explanation text

  // For 'command' type
  expectedCommand?: string;  // The command user should type
  commandHint?: string;      // Hint shown if user is stuck
  validationPattern?: RegExp; // Pattern to validate command (more flexible than exact match)

  // For 'quiz' type
  quizQuestion?: string;
  quizChoices?: string[];
  quizCorrectIndex?: number;
  quizExplanation?: string;

  // For 'observe' type
  observeCommand?: string;   // Command to auto-execute and show output

  // Feedback messages
  successMessage?: string;
  failureMessage?: string;

  // Optional tips
  tips?: string[];

  // Documentation reference
  docLink?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];

  // Tutorial steps (interactive walkthrough)
  steps: TutorialStep[];

  // Prerequisites (other lesson IDs in this module)
  prerequisites?: string[];

  // Estimated completion time (minutes)
  estimatedMinutes: number;

  // Related commands covered
  commands: string[];

  // Difficulty level
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Module {
  id: string;
  title: string;
  description: string;

  // Lessons in this module
  lessons: Lesson[];

  // Module prerequisites (other module IDs)
  prerequisites?: string[];

  // Icon for UI
  icon: string;

  // Order within the learning path
  order: number;
}

export interface LearningPath {
  id: string;
  domainId: DomainId;
  title: string;
  description: string;

  // Modules in this path
  modules: Module[];

  // Total estimated time (calculated from modules)
  totalEstimatedMinutes: number;

  // Exam weight for this domain
  examWeight: number;

  // Skills/competencies gained
  skills: string[];
}

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  pathId: string;
  started: boolean;
  completed: boolean;
  currentStepIndex: number;
  completedSteps: string[];
  startedAt?: number;
  completedAt?: number;
  timeSpentSeconds: number;
  quizScores: Record<string, boolean>; // stepId -> correct/incorrect
}

export interface ModuleProgress {
  moduleId: string;
  pathId: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  completedLessonIds: string[];
}

export interface PathProgress {
  pathId: string;
  modulesCompleted: number;
  modulesTotal: number;
  totalLessons: number;
  completedLessons: number;
  overallPercentage: number;
  startedAt?: number;
  lastActivityAt?: number;
  totalTimeSpentSeconds: number;
}

// ============================================================================
// LEARNING PATH DEFINITIONS
// ============================================================================

/**
 * Domain 1: Platform Bring-Up (31% of exam)
 * Comprehensive coverage of server POST, BIOS, BMC, drivers, firmware, and DGX system setup
 */
const DOMAIN1_PATH: LearningPath = {
  id: 'path-domain1',
  domainId: 'domain1',
  title: 'Platform Bring-Up Mastery',
  description: 'Master server POST, BIOS configuration, BMC management, drivers, and firmware for DGX systems',
  examWeight: 31,
  skills: [
    'Server POST troubleshooting',
    'BIOS/UEFI configuration',
    'BMC/IPMI management',
    'Driver installation and verification',
    'Firmware updates',
    'DGX OS deployment',
    'Network configuration',
    'Storage setup'
  ],
  modules: [
    // Module 1: BIOS & BMC Fundamentals
    {
      id: 'mod-d1-bios-bmc',
      title: 'BIOS & BMC Fundamentals',
      description: 'Understanding and configuring BIOS settings and BMC management',
      icon: '⚙️',
      order: 1,
      lessons: [
        {
          id: 'lesson-d1-dmidecode',
          title: 'System Information with dmidecode',
          description: 'Learn to extract hardware information using dmidecode',
          objectives: [
            'Understand DMI/SMBIOS tables',
            'Query specific hardware components',
            'Interpret BIOS and system information'
          ],
          estimatedMinutes: 15,
          commands: ['dmidecode'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-1-intro',
              type: 'concept',
              title: 'What is DMI/SMBIOS?',
              content: `**Desktop Management Interface (DMI)** and **System Management BIOS (SMBIOS)** are standards that define data structures in a system's BIOS. These structures contain information about the system's hardware components.

The \`dmidecode\` command reads this information and presents it in a human-readable format. On DGX systems, this is essential for:
- Verifying hardware configuration
- Checking BIOS version
- Identifying memory modules and their specifications
- Gathering serial numbers for support

**Common DMI Types:**
| Type | Description |
|------|-------------|
| 0 | BIOS Information |
| 1 | System Information |
| 2 | Baseboard (Motherboard) |
| 4 | Processor Information |
| 17 | Memory Device |
| 38 | IPMI Device |`,
              tips: [
                'dmidecode requires root privileges on most systems',
                'The simulator runs as root by default'
              ]
            },
            {
              id: 'step-d1-1-basic',
              type: 'command',
              title: 'View All System Information',
              content: 'Start by viewing the complete DMI table. This shows all hardware information available.',
              expectedCommand: 'dmidecode',
              commandHint: 'Simply type "dmidecode" without any arguments',
              successMessage: 'You can see the full DMI table including BIOS, system, and hardware information.',
              tips: [
                'The output is organized by DMI type numbers',
                'Look for "NVIDIA" in the manufacturer fields for DGX systems'
              ]
            },
            {
              id: 'step-d1-1-bios',
              type: 'command',
              title: 'Query BIOS Information',
              content: 'Use the `-t` flag to query specific DMI types. Type 0 contains BIOS information.',
              expectedCommand: 'dmidecode -t bios',
              validationPattern: /dmidecode\s+(-t\s+bios|-t\s+0|--type\s+bios|--type\s+0)/,
              commandHint: 'Try: dmidecode -t bios (or dmidecode -t 0)',
              successMessage: 'The BIOS section shows vendor, version, and release date.',
              tips: [
                'BIOS updates may be required for new GPU support',
                'Check BIOS version against NVIDIA release notes'
              ]
            },
            {
              id: 'step-d1-1-system',
              type: 'command',
              title: 'Query System Information',
              content: 'Type 1 contains system-level information including manufacturer, product name, and serial number.',
              expectedCommand: 'dmidecode -t system',
              validationPattern: /dmidecode\s+(-t\s+system|-t\s+1|--type\s+system|--type\s+1)/,
              commandHint: 'Try: dmidecode -t system',
              successMessage: 'System information shows the DGX model (A100, H100, etc.) and serial numbers.',
              tips: [
                'Serial number is needed for NVIDIA support cases',
                'Product Name identifies the exact DGX model'
              ]
            },
            {
              id: 'step-d1-1-memory',
              type: 'command',
              title: 'Check Memory Configuration',
              content: 'Memory information is in DMI type 17. This is crucial for verifying RAM configuration on DGX systems.',
              expectedCommand: 'dmidecode -t memory',
              validationPattern: /dmidecode\s+(-t\s+memory|-t\s+17|--type\s+memory|--type\s+17)/,
              commandHint: 'Try: dmidecode -t memory (or dmidecode -t 17)',
              successMessage: 'You can see each DIMM slot with its size, speed, and manufacturer.',
              tips: [
                'DGX A100 typically has 1TB or 2TB of system RAM',
                'Verify all DIMMs are recognized and running at rated speed'
              ]
            },
            {
              id: 'step-d1-1-processor',
              type: 'command',
              title: 'Check Processor Information',
              content: 'Type 4 shows CPU details including model, cores, and speed.',
              expectedCommand: 'dmidecode -t processor',
              validationPattern: /dmidecode\s+(-t\s+processor|-t\s+4)/,
              commandHint: 'Try: dmidecode -t processor',
              successMessage: 'Shows CPU model, core count, and current/max speed.',
              tips: [
                'DGX A100 uses dual AMD EPYC 7742 (128 cores total)',
                'DGX H100 uses dual Intel Xeon Platinum 8480C'
              ]
            },
            {
              id: 'step-d1-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of dmidecode.',
              quizQuestion: 'Which dmidecode type number contains BIOS information?',
              quizChoices: ['Type 0', 'Type 1', 'Type 2', 'Type 17'],
              quizCorrectIndex: 0,
              quizExplanation: 'Type 0 contains BIOS information. Type 1 is System, Type 2 is Baseboard, Type 17 is Memory Device.'
            }
          ]
        },
        {
          id: 'lesson-d1-ipmitool',
          title: 'BMC Management with ipmitool',
          description: 'Learn to manage the Baseboard Management Controller',
          objectives: [
            'Understand IPMI and BMC concepts',
            'Query sensor readings',
            'Manage system power state',
            'Access system event logs'
          ],
          estimatedMinutes: 25,
          commands: ['ipmitool'],
          difficulty: 'beginner',
          prerequisites: ['lesson-d1-dmidecode'],
          steps: [
            {
              id: 'step-d1-2-intro',
              type: 'concept',
              title: 'Understanding IPMI and BMC',
              content: `**IPMI (Intelligent Platform Management Interface)** is a standardized interface for hardware management. The **BMC (Baseboard Management Controller)** is a specialized processor that implements IPMI.

On DGX systems, the BMC provides:
- Out-of-band management (works even when OS is down)
- Hardware sensor monitoring (temperature, voltage, fan speeds)
- System event logging
- Remote power control
- Serial-over-LAN console access
- Virtual media mounting

The \`ipmitool\` command is the primary interface for interacting with the BMC.

**Key ipmitool subcommands:**
| Command | Description |
|---------|-------------|
| sensor | Read hardware sensors |
| sel | System Event Log |
| power | Power control |
| chassis | Chassis status |
| mc | Management Controller info |
| lan | Network configuration |`,
              tips: [
                'BMC has its own IP address for network management',
                'Default credentials should be changed for security'
              ]
            },
            {
              id: 'step-d1-2-sensors',
              type: 'command',
              title: 'Reading Sensor Data',
              content: 'Check all hardware sensors including temperatures, voltages, and fan speeds.',
              expectedCommand: 'ipmitool sensor',
              validationPattern: /ipmitool\s+sensor(\s+list)?$/,
              commandHint: 'Try: ipmitool sensor',
              successMessage: 'The sensor output shows readings, thresholds, and status for all monitored components.',
              tips: [
                'Pay attention to temperature sensors for GPU and CPU',
                'Fan speeds should increase under load'
              ]
            },
            {
              id: 'step-d1-2-sensor-specific',
              type: 'command',
              title: 'Read Specific Sensor',
              content: 'Read a specific sensor by name for targeted monitoring.',
              expectedCommand: 'ipmitool sensor get "CPU Temp"',
              validationPattern: /ipmitool\s+sensor\s+(get|reading)/,
              commandHint: 'Try: ipmitool sensor get "CPU Temp"',
              successMessage: 'Shows detailed information for a single sensor including all thresholds.',
              tips: [
                'Sensor names are case-sensitive',
                'Use quotes for names with spaces'
              ]
            },
            {
              id: 'step-d1-2-sel',
              type: 'command',
              title: 'System Event Log',
              content: 'The SEL (System Event Log) records hardware events. This is crucial for troubleshooting.',
              expectedCommand: 'ipmitool sel list',
              validationPattern: /ipmitool\s+sel\s+list/,
              commandHint: 'Try: ipmitool sel list',
              successMessage: 'The SEL shows timestamped hardware events. Look for errors or warnings.',
              tips: [
                'SEL entries persist across reboots',
                'Clear old entries with "ipmitool sel clear" after reviewing'
              ]
            },
            {
              id: 'step-d1-2-sel-info',
              type: 'command',
              title: 'SEL Information',
              content: 'Check SEL capacity and usage.',
              expectedCommand: 'ipmitool sel info',
              validationPattern: /ipmitool\s+sel\s+info/,
              commandHint: 'Try: ipmitool sel info',
              successMessage: 'Shows how many entries are in the SEL and total capacity.',
              tips: [
                'If SEL is nearly full, older events may be lost',
                'Regularly export and clear the SEL'
              ]
            },
            {
              id: 'step-d1-2-power',
              type: 'command',
              title: 'Check Power Status',
              content: 'Query the current power state of the system.',
              expectedCommand: 'ipmitool power status',
              validationPattern: /ipmitool\s+(power\s+status|chassis\s+power\s+status)/,
              commandHint: 'Try: ipmitool power status',
              successMessage: 'You can see whether the chassis power is on or off.',
              tips: [
                'Other power commands: on, off, cycle, reset',
                'Use with caution on production systems!'
              ]
            },
            {
              id: 'step-d1-2-chassis',
              type: 'command',
              title: 'Chassis Status',
              content: 'Get detailed chassis status including intrusion detection.',
              expectedCommand: 'ipmitool chassis status',
              validationPattern: /ipmitool\s+chassis\s+status/,
              commandHint: 'Try: ipmitool chassis status',
              successMessage: 'Shows power state, last restart cause, and chassis intrusion status.',
              tips: [
                'Check "Last Power Event" for unexpected restarts',
                'Chassis intrusion can indicate physical tampering'
              ]
            },
            {
              id: 'step-d1-2-mc',
              type: 'command',
              title: 'BMC Information',
              content: 'Get information about the BMC itself.',
              expectedCommand: 'ipmitool mc info',
              validationPattern: /ipmitool\s+mc\s+info/,
              commandHint: 'Try: ipmitool mc info',
              successMessage: 'Shows BMC firmware version and capabilities.',
              tips: [
                'BMC firmware should be updated along with BIOS',
                'Check NVIDIA release notes for compatible versions'
              ]
            },
            {
              id: 'step-d1-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of IPMI.',
              quizQuestion: 'What does BMC stand for?',
              quizChoices: [
                'Basic Management Console',
                'Baseboard Management Controller',
                'BIOS Management Center',
                'Base Module Controller'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'BMC stands for Baseboard Management Controller. It\'s a specialized microcontroller embedded on the motherboard for out-of-band management.'
            }
          ]
        }
      ]
    },
    // Module 2: Driver Management
    {
      id: 'mod-d1-drivers',
      title: 'Driver Management',
      description: 'Installing, verifying, and troubleshooting NVIDIA drivers',
      icon: '🔧',
      order: 2,
      prerequisites: ['mod-d1-bios-bmc'],
      lessons: [
        {
          id: 'lesson-d1-nvidia-smi-basics',
          title: 'nvidia-smi Fundamentals',
          description: 'Master the essential nvidia-smi commands for driver verification',
          objectives: [
            'Check driver version and GPU detection',
            'Understand nvidia-smi output format',
            'Monitor GPU utilization and memory'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-3-intro',
              type: 'concept',
              title: 'Introduction to nvidia-smi',
              content: `**nvidia-smi** (NVIDIA System Management Interface) is the most important tool for managing NVIDIA GPUs. It provides:

- Driver version information
- GPU identification and enumeration
- Real-time monitoring of GPU state
- Configuration and management capabilities

If nvidia-smi fails to run, it usually indicates driver issues. This is often the first command to run when troubleshooting GPU problems.

**Key Information Displayed:**
| Field | Description |
|-------|-------------|
| Driver Version | Installed driver version |
| CUDA Version | Maximum supported CUDA version |
| GPU Name | Model (e.g., A100-SXM4-80GB) |
| Persistence-M | Persistence mode state |
| Temp | Current GPU temperature |
| Pwr:Usage/Cap | Power usage and limit |
| Memory-Usage | VRAM usage |
| GPU-Util | Compute utilization percentage |`,
              tips: [
                'nvidia-smi is part of the NVIDIA driver package',
                'A working nvidia-smi confirms driver is loaded'
              ]
            },
            {
              id: 'step-d1-3-basic',
              type: 'command',
              title: 'Basic GPU Status',
              content: 'Run nvidia-smi without arguments to see the default status view.',
              expectedCommand: 'nvidia-smi',
              commandHint: 'Simply type: nvidia-smi',
              successMessage: 'The default view shows all GPUs with temperature, utilization, and memory usage.',
              tips: [
                'The top section shows driver and CUDA versions',
                'Each GPU has its own row in the table'
              ]
            },
            {
              id: 'step-d1-3-list',
              type: 'command',
              title: 'List All GPUs',
              content: 'Use the -L flag to get a simple list of all detected GPUs.',
              expectedCommand: 'nvidia-smi -L',
              validationPattern: /nvidia-smi\s+(-L|--list-gpus)/,
              commandHint: 'Try: nvidia-smi -L',
              successMessage: 'Each GPU is listed with its UUID and name. DGX A100 has 8 GPUs.',
              tips: [
                'GPU UUIDs are useful for uniquely identifying GPUs',
                'Missing GPUs here indicate detection problems'
              ]
            },
            {
              id: 'step-d1-3-query',
              type: 'command',
              title: 'Query Specific GPU Info',
              content: 'Use --query-gpu to get specific information in a parseable format.',
              expectedCommand: 'nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv',
              validationPattern: /nvidia-smi\s+--query-gpu=.*--format=csv/,
              commandHint: 'Try: nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv',
              successMessage: 'Query mode provides specific data fields in CSV format for scripting.',
              tips: [
                'Use --help-query-gpu to see all available fields',
                'This format is ideal for monitoring scripts'
              ]
            },
            {
              id: 'step-d1-3-loop',
              type: 'command',
              title: 'Continuous Monitoring',
              content: 'Use the -l flag to continuously monitor GPU status.',
              expectedCommand: 'nvidia-smi -l 1',
              validationPattern: /nvidia-smi\s+(-l|--loop)/,
              commandHint: 'Try: nvidia-smi -l 1 (refreshes every 1 second)',
              successMessage: 'The display updates automatically. Press Ctrl+C to exit.',
              tips: [
                'Useful for watching GPU behavior during workloads',
                'Add -f to log to a file'
              ]
            },
            {
              id: 'step-d1-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of nvidia-smi.',
              quizQuestion: 'If nvidia-smi fails to run, what is the most likely cause?',
              quizChoices: [
                'GPU hardware failure',
                'NVIDIA driver not installed or not loaded',
                'Insufficient permissions',
                'Network connectivity issues'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'nvidia-smi requires the NVIDIA kernel driver to be loaded. If it fails, check that the driver is installed and the nvidia kernel module is loaded (lsmod | grep nvidia).'
            }
          ]
        },
        {
          id: 'lesson-d1-nvidia-smi-advanced',
          title: 'Advanced nvidia-smi Usage',
          description: 'Master advanced nvidia-smi features for detailed GPU management',
          objectives: [
            'Use display flags for focused output',
            'Configure persistence mode',
            'Understand clock and power management'
          ],
          estimatedMinutes: 20,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-nvidia-smi-basics'],
          steps: [
            {
              id: 'step-d1-3a-display',
              type: 'concept',
              title: 'Display Flags Overview',
              content: `nvidia-smi supports display flags (-d) to show specific categories of information:

| Flag | Description |
|------|-------------|
| MEMORY | Memory usage details |
| UTILIZATION | GPU and memory utilization |
| ECC | ECC error counts |
| TEMPERATURE | Thermal information |
| POWER | Power consumption |
| CLOCK | Clock frequencies |
| COMPUTE | Compute mode |
| PIDS | Running processes |
| PERFORMANCE | Performance state |
| ACCOUNTING | Process accounting |

Multiple flags can be combined: \`nvidia-smi -d MEMORY,UTILIZATION\``,
              tips: [
                'Display flags reduce output to relevant information',
                'Combine with -q for detailed query output'
              ]
            },
            {
              id: 'step-d1-3a-memory',
              type: 'command',
              title: 'Memory Information',
              content: 'View detailed memory usage information.',
              expectedCommand: 'nvidia-smi -d MEMORY',
              validationPattern: /nvidia-smi\s+(-d\s+MEMORY|--display=MEMORY)/i,
              commandHint: 'Try: nvidia-smi -d MEMORY',
              successMessage: 'Shows total, used, and free memory for each GPU.',
              tips: [
                'BAR1 memory is used for PCIe mapping',
                'FB (framebuffer) is the main GPU memory'
              ]
            },
            {
              id: 'step-d1-3a-ecc',
              type: 'command',
              title: 'ECC Error Information',
              content: 'Check ECC (Error Correcting Code) memory errors.',
              expectedCommand: 'nvidia-smi -d ECC',
              validationPattern: /nvidia-smi\s+(-d\s+ECC|--display=ECC)/i,
              commandHint: 'Try: nvidia-smi -d ECC',
              successMessage: 'Shows single-bit (corrected) and double-bit (uncorrected) errors.',
              tips: [
                'Volatile errors clear on reboot',
                'Aggregate errors are lifetime totals'
              ]
            },
            {
              id: 'step-d1-3a-persistence',
              type: 'concept',
              title: 'Persistence Mode',
              content: `**Persistence Mode** keeps the NVIDIA driver loaded even when no applications are using the GPU. Benefits:

- Faster application startup (no driver initialization)
- Consistent power management
- Required for many cluster environments

Without persistence mode:
- Driver unloads when last GPU application exits
- Next application has initialization delay
- GPU may reset to default clocks

Enable with: \`nvidia-smi -pm 1\` (requires root)`,
              tips: [
                'Always enable on production DGX systems',
                'Can also be enabled via nvidia-persistenced daemon'
              ]
            },
            {
              id: 'step-d1-3a-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of advanced nvidia-smi.',
              quizQuestion: 'What is the benefit of enabling persistence mode?',
              quizChoices: [
                'Increases GPU performance',
                'Reduces power consumption',
                'Keeps driver loaded for faster application startup',
                'Enables ECC memory'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Persistence mode keeps the NVIDIA driver loaded even when no applications are using the GPU. This eliminates the initialization delay when starting new GPU applications.'
            }
          ]
        },
        {
          id: 'lesson-d1-kernel-modules',
          title: 'Kernel Module Management',
          description: 'Understanding and managing NVIDIA kernel modules',
          objectives: [
            'List loaded kernel modules',
            'Understand module dependencies',
            'Query module information'
          ],
          estimatedMinutes: 15,
          commands: ['lsmod', 'modinfo'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-nvidia-smi-basics'],
          steps: [
            {
              id: 'step-d1-4-intro',
              type: 'concept',
              title: 'Kernel Modules for NVIDIA GPUs',
              content: `Linux kernel modules are pieces of code that can be loaded into the kernel on demand. NVIDIA GPUs require several kernel modules:

| Module | Purpose |
|--------|---------|
| nvidia | Main GPU driver module |
| nvidia_modeset | Display mode setting |
| nvidia_uvm | Unified Virtual Memory (for CUDA) |
| nvidia_drm | Direct Rendering Manager integration |
| nvidia_peermem | GPU Direct RDMA support |

Understanding these modules helps diagnose driver issues and verify proper installation.`,
              tips: [
                'Modules are loaded automatically at boot',
                'Some modules have dependencies on others'
              ]
            },
            {
              id: 'step-d1-4-lsmod',
              type: 'command',
              title: 'List NVIDIA Modules',
              content: 'Use lsmod to see all loaded kernel modules. Filter for nvidia modules.',
              expectedCommand: 'lsmod | grep nvidia',
              validationPattern: /lsmod\s*\|\s*grep\s+nvidia/,
              commandHint: 'Try: lsmod | grep nvidia',
              successMessage: 'You can see all nvidia modules and their dependencies (Used by column).',
              tips: [
                'The "Used by" count shows how many things depend on this module',
                'A module with dependencies cannot be unloaded'
              ]
            },
            {
              id: 'step-d1-4-modinfo',
              type: 'command',
              title: 'Module Information',
              content: 'Get detailed information about a specific module using modinfo.',
              expectedCommand: 'modinfo nvidia',
              validationPattern: /modinfo\s+nvidia/,
              commandHint: 'Try: modinfo nvidia',
              successMessage: 'modinfo shows the module version, parameters, and file location.',
              tips: [
                'The version here should match nvidia-smi output',
                'srcversion helps identify exact build'
              ]
            },
            {
              id: 'step-d1-4-mlx',
              type: 'command',
              title: 'InfiniBand Modules',
              content: 'DGX systems use Mellanox InfiniBand NICs. Check those modules too.',
              expectedCommand: 'lsmod | grep mlx',
              validationPattern: /lsmod\s*\|\s*grep\s+mlx/,
              commandHint: 'Try: lsmod | grep mlx',
              successMessage: 'Shows mlx5_core and related InfiniBand driver modules.',
              tips: [
                'mlx5_core is the main Mellanox driver',
                'ib_core provides InfiniBand protocol support'
              ]
            },
            {
              id: 'step-d1-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of kernel modules.',
              quizQuestion: 'Which command shows information about a kernel module including its version?',
              quizChoices: ['lsmod', 'modinfo', 'modprobe', 'insmod'],
              quizCorrectIndex: 1,
              quizExplanation: 'modinfo displays detailed information about a kernel module. lsmod lists loaded modules, modprobe loads/unloads modules, and insmod is a lower-level insert tool.'
            }
          ]
        }
      ]
    },
    // Module 3: System Information
    {
      id: 'mod-d1-sysinfo',
      title: 'System Information & Monitoring',
      description: 'Understanding DGX system configuration and monitoring',
      icon: '📊',
      order: 3,
      prerequisites: ['mod-d1-drivers'],
      lessons: [
        {
          id: 'lesson-d1-linux-basics',
          title: 'Linux System Commands',
          description: 'Essential Linux commands for DGX administration',
          objectives: [
            'Check system resources',
            'Monitor processes',
            'Understand NUMA topology'
          ],
          estimatedMinutes: 20,
          commands: ['uname', 'uptime', 'top', 'numactl'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d1-5-uname',
              type: 'command',
              title: 'System Identification',
              content: 'Use uname to identify the system and kernel version.',
              expectedCommand: 'uname -a',
              validationPattern: /uname\s+-a/,
              commandHint: 'Try: uname -a',
              successMessage: 'Shows kernel version, hostname, and architecture.',
              tips: [
                'Kernel version affects driver compatibility',
                'DGX OS is based on Ubuntu'
              ]
            },
            {
              id: 'step-d1-5-uptime',
              type: 'command',
              title: 'System Uptime',
              content: 'Check how long the system has been running and load averages.',
              expectedCommand: 'uptime',
              commandHint: 'Type: uptime',
              successMessage: 'Shows uptime, users, and load averages.',
              tips: [
                'Load average shows 1, 5, and 15 minute averages',
                'On DGX A100 (128 cores), load of 128 means full CPU utilization'
              ]
            },
            {
              id: 'step-d1-5-top',
              type: 'command',
              title: 'Process Monitoring',
              content: 'Use top to monitor system processes and resource usage.',
              expectedCommand: 'top',
              commandHint: 'Type: top (press q to quit)',
              successMessage: 'Shows real-time process list sorted by resource usage.',
              tips: [
                'Press 1 to show per-CPU usage',
                'Press M to sort by memory'
              ]
            },
            {
              id: 'step-d1-5-numa',
              type: 'concept',
              title: 'NUMA Architecture',
              content: `**NUMA (Non-Uniform Memory Access)** is a memory architecture where memory access time depends on the memory location relative to a processor.

DGX systems have multiple NUMA nodes:
- Each CPU socket is a NUMA node
- GPUs are attached to specific NUMA nodes
- Optimal performance requires matching processes to their local NUMA node

**GPU-NUMA Affinity on DGX A100:**
- GPUs 0-3: NUMA node 0 (CPU 0)
- GPUs 4-7: NUMA node 1 (CPU 1)

Placing workloads on the correct NUMA node reduces memory latency.`,
              tips: [
                'Use numactl to control NUMA placement',
                'nvidia-smi topo shows GPU NUMA affinity'
              ]
            },
            {
              id: 'step-d1-5-numactl',
              type: 'command',
              title: 'NUMA Information',
              content: 'Use numactl to view NUMA topology.',
              expectedCommand: 'numactl --hardware',
              validationPattern: /numactl\s+(--hardware|-H)/,
              commandHint: 'Try: numactl --hardware',
              successMessage: 'Shows NUMA nodes, CPUs per node, and memory per node.',
              tips: [
                'DGX A100 has 2 NUMA nodes',
                'Each node has half the CPUs and memory'
              ]
            },
            {
              id: 'step-d1-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NUMA.',
              quizQuestion: 'Why is NUMA awareness important on DGX systems?',
              quizChoices: [
                'It increases GPU memory',
                'It reduces memory access latency by keeping data local',
                'It enables more GPUs',
                'It improves network speed'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'NUMA awareness ensures that processes access memory from their local NUMA node, reducing latency. On DGX systems, this also means matching GPU workloads with the CPUs on the same NUMA node.'
            }
          ]
        },
        {
          id: 'lesson-d1-fabric-manager',
          title: 'NVIDIA Fabric Manager',
          description: 'Understanding NVSwitch and Fabric Manager for multi-GPU systems',
          objectives: [
            'Understand NVSwitch topology',
            'Check Fabric Manager status',
            'Troubleshoot fabric connectivity'
          ],
          estimatedMinutes: 15,
          commands: ['nv-fabricmanager', 'systemctl'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d1-linux-basics'],
          steps: [
            {
              id: 'step-d1-6-intro',
              type: 'concept',
              title: 'NVSwitch and Fabric Manager',
              content: `**NVSwitch** is NVIDIA's high-bandwidth switch chip that enables all-to-all GPU communication. DGX A100 has 6 NVSwitch chips.

**Fabric Manager** is a service that:
- Manages NVSwitch topology
- Configures GPU-to-GPU routing
- Monitors fabric health
- Required for multi-GPU operations

Without Fabric Manager running:
- Multi-GPU training will fail
- nvidia-smi may show topology issues
- NCCL operations will have errors`,
              tips: [
                'Fabric Manager must be running for full GPU connectivity',
                'Check with systemctl status nvidia-fabricmanager'
              ]
            },
            {
              id: 'step-d1-6-status',
              type: 'command',
              title: 'Check Fabric Manager Status',
              content: 'Verify that Fabric Manager service is running.',
              expectedCommand: 'systemctl status nvidia-fabricmanager',
              validationPattern: /systemctl\s+status\s+nvidia-fabricmanager/,
              commandHint: 'Try: systemctl status nvidia-fabricmanager',
              successMessage: 'Shows whether the service is active and recent log messages.',
              tips: [
                'Status should be "active (running)"',
                'Check logs for initialization errors'
              ]
            },
            {
              id: 'step-d1-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Fabric Manager.',
              quizQuestion: 'What happens if Fabric Manager is not running on a DGX A100?',
              quizChoices: [
                'GPUs will run at reduced clock speed',
                'Only single-GPU operations will work correctly',
                'The system will not boot',
                'GPU temperatures will increase'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Without Fabric Manager, the NVSwitch fabric is not properly configured, and multi-GPU operations will fail or have degraded performance. Single-GPU workloads will still work.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 135
};

/**
 * Domain 2: Accelerator Configuration (5% of exam)
 */
const DOMAIN2_PATH: LearningPath = {
  id: 'path-domain2',
  domainId: 'domain2',
  title: 'Accelerator Configuration',
  description: 'Configure BlueField DPUs, MIG partitions, NVLink, and GPU topology',
  examWeight: 5,
  skills: [
    'MIG configuration',
    'NVLink topology understanding',
    'GPU affinity and NUMA',
    'BlueField DPU basics',
    'Persistence mode management',
    'Compute mode settings'
  ],
  modules: [
    {
      id: 'mod-d2-topology',
      title: 'GPU Topology & NVLink',
      description: 'Understanding GPU interconnects and topology',
      icon: '🔗',
      order: 1,
      lessons: [
        {
          id: 'lesson-d2-topo',
          title: 'GPU Topology Analysis',
          description: 'Learn to analyze GPU topology and NVLink connections',
          objectives: [
            'Understand NVLink interconnects',
            'Read topology matrices',
            'Identify optimal GPU pairs for workloads'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi topo', 'nvidia-smi nvlink'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d2-1-intro',
              type: 'concept',
              title: 'NVLink and GPU Topology',
              content: `**NVLink** is NVIDIA's high-speed interconnect that provides direct GPU-to-GPU communication.

**DGX A100 Specifications:**
- 8 A100 GPUs per system
- 12 NVLink connections per GPU
- 600 GB/s total bandwidth per GPU
- 6 NVSwitch chips for all-to-all connectivity

**Connection Types in Topology Matrix:**
| Symbol | Meaning |
|--------|---------|
| X | Self (same GPU) |
| NV# | # NVLink connections |
| SYS | Through CPU/PCIe |
| PHB | Through PCIe Host Bridge |
| NODE | Same NUMA node |

Understanding topology helps optimize multi-GPU workloads by placing communicating processes on well-connected GPUs.`,
              tips: [
                'NVLink is much faster than PCIe for GPU-to-GPU transfers',
                'DGX uses NVSwitch for full bisection bandwidth'
              ]
            },
            {
              id: 'step-d2-1-topo',
              type: 'command',
              title: 'View Topology Matrix',
              content: 'Display the GPU topology matrix showing interconnect types between all GPUs.',
              expectedCommand: 'nvidia-smi topo -m',
              validationPattern: /nvidia-smi\s+topo\s+(-m|--matrix)/,
              commandHint: 'Try: nvidia-smi topo -m',
              successMessage: 'The matrix shows connection types: NV# for NVLink, SYS for system/PCIe.',
              tips: [
                'NV12 means 12 NVLink connections (best)',
                'SYS means going through system (slower)'
              ]
            },
            {
              id: 'step-d2-1-nvlink-status',
              type: 'command',
              title: 'NVLink Status',
              content: 'Check the status of all NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -s',
              validationPattern: /nvidia-smi\s+nvlink\s+(-s|--status)/,
              commandHint: 'Try: nvidia-smi nvlink -s',
              successMessage: 'This shows NVLink status per GPU. All links should be active.',
              tips: [
                'Inactive links may indicate hardware issues',
                'Check for NVLink errors in error counters'
              ]
            },
            {
              id: 'step-d2-1-nvlink-errors',
              type: 'command',
              title: 'NVLink Error Counters',
              content: 'Check for NVLink errors across all GPUs.',
              expectedCommand: 'nvidia-smi nvlink -e',
              validationPattern: /nvidia-smi\s+nvlink\s+(-e|--error)/,
              commandHint: 'Try: nvidia-smi nvlink -e',
              successMessage: 'Shows error counts for each NVLink connection.',
              tips: [
                'Non-zero errors may indicate cable or hardware issues',
                'CRC errors can occur with damaged cables'
              ]
            },
            {
              id: 'step-d2-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU topology.',
              quizQuestion: 'What does NV12 mean in the nvidia-smi topology matrix?',
              quizChoices: [
                'NVIDIA driver version 12',
                '12 NVLink connections between GPUs',
                'GPU ID 12',
                '12 GB/s bandwidth'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'NV12 indicates 12 NVLink connections between the two GPUs, providing maximum bandwidth. Each NVLink provides 50 GB/s bidirectional on A100.'
            }
          ]
        },
        {
          id: 'lesson-d2-mig',
          title: 'Multi-Instance GPU (MIG)',
          description: 'Configure and manage MIG partitions on A100 GPUs',
          objectives: [
            'Understand MIG concepts',
            'Enable and disable MIG mode',
            'Create and manage MIG instances',
            'Monitor MIG utilization'
          ],
          estimatedMinutes: 30,
          commands: ['nvidia-smi mig'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d2-topo'],
          steps: [
            {
              id: 'step-d2-2-intro',
              type: 'concept',
              title: 'Multi-Instance GPU Overview',
              content: `**MIG (Multi-Instance GPU)** allows partitioning an A100 GPU into up to 7 isolated instances. Each instance has:

- Dedicated compute resources (Streaming Multiprocessors)
- Isolated memory bandwidth and capacity
- Separate error isolation
- Independent scheduling

**MIG Profiles on A100-80GB:**
| Profile | Memory | SMs | Instances |
|---------|--------|-----|-----------|
| 7g.80gb | 80 GB | 98 | 1 |
| 4g.40gb | 40 GB | 56 | 2 |
| 3g.40gb | 40 GB | 42 | 2 |
| 2g.20gb | 20 GB | 28 | 3 |
| 1g.10gb | 10 GB | 14 | 7 |

**Key Concepts:**
- **GPU Instance (GI)**: Hardware partition with memory and compute
- **Compute Instance (CI)**: Compute-only partition within a GI
- **MIG Device**: Combination of GI + CI visible to applications`,
              tips: [
                'MIG requires A100 or newer GPUs',
                'Enabling MIG requires GPU reset (no running processes)'
              ]
            },
            {
              id: 'step-d2-2-status',
              type: 'command',
              title: 'Check MIG Mode Status',
              content: 'First, check if MIG mode is enabled on your GPUs.',
              expectedCommand: 'nvidia-smi -i 0 --query-gpu=mig.mode.current --format=csv',
              validationPattern: /nvidia-smi.*mig\.mode/,
              commandHint: 'Try: nvidia-smi -i 0 --query-gpu=mig.mode.current --format=csv',
              successMessage: 'Shows whether MIG mode is Enabled or Disabled for GPU 0.',
              tips: [
                'MIG mode change requires reboot or driver reload',
                'All GPUs can have different MIG states'
              ]
            },
            {
              id: 'step-d2-2-profiles',
              type: 'command',
              title: 'List MIG Profiles',
              content: 'View available MIG profiles for partitioning the GPU.',
              expectedCommand: 'nvidia-smi mig -lgip',
              validationPattern: /nvidia-smi\s+mig\s+(-lgip|--list-gpu-instance-profiles)/,
              commandHint: 'Try: nvidia-smi mig -lgip',
              successMessage: 'Shows available GPU Instance profiles with their memory and SM counts.',
              tips: [
                '7g.80gb (or 7g.40gb) gives full GPU resources',
                '1g.10gb (or 1g.5gb) gives 1/7 of the GPU'
              ]
            },
            {
              id: 'step-d2-2-list-gi',
              type: 'command',
              title: 'List GPU Instances',
              content: 'View currently created GPU Instances.',
              expectedCommand: 'nvidia-smi mig -lgi',
              validationPattern: /nvidia-smi\s+mig\s+(-lgi|--list-gpu-instances)/,
              commandHint: 'Try: nvidia-smi mig -lgi',
              successMessage: 'Shows all GPU Instances across all MIG-enabled GPUs.',
              tips: [
                'Each GI has an ID used for further operations',
                'GI must exist before creating CI'
              ]
            },
            {
              id: 'step-d2-2-list-ci',
              type: 'command',
              title: 'List Compute Instances',
              content: 'View Compute Instances within GPU Instances.',
              expectedCommand: 'nvidia-smi mig -lci',
              validationPattern: /nvidia-smi\s+mig\s+(-lci|--list-compute-instances)/,
              commandHint: 'Try: nvidia-smi mig -lci',
              successMessage: 'Shows all Compute Instances and their parent GPU Instances.',
              tips: [
                'CI inherits compute resources from parent GI',
                'A GI can have multiple CIs for finer granularity'
              ]
            },
            {
              id: 'step-d2-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of MIG.',
              quizQuestion: 'What is the maximum number of MIG instances on a single A100 GPU?',
              quizChoices: ['3', '5', '7', '8'],
              quizCorrectIndex: 2,
              quizExplanation: 'An A100 can be partitioned into up to 7 MIG instances using the 1g.10gb (or 1g.5gb) profile. Larger profiles result in fewer instances.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d2-gpu-config',
      title: 'GPU Configuration',
      description: 'Configuring GPU modes and settings',
      icon: '⚙️',
      order: 2,
      prerequisites: ['mod-d2-topology'],
      lessons: [
        {
          id: 'lesson-d2-persistence',
          title: 'Persistence Mode & Settings',
          description: 'Configure persistence mode and other GPU settings',
          objectives: [
            'Enable and manage persistence mode',
            'Understand compute modes',
            'Configure power limits'
          ],
          estimatedMinutes: 15,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d2-3-persist-intro',
              type: 'concept',
              title: 'GPU Configuration Options',
              content: `**Key GPU Configuration Settings:**

**Persistence Mode:**
- Keeps driver loaded between GPU applications
- Reduces startup latency
- Essential for production environments

**Compute Mode:**
| Mode | Description |
|------|-------------|
| Default | Multiple contexts allowed |
| Exclusive Process | One process per GPU |
| Prohibited | No CUDA allowed |

**Power Management:**
- Power limit can be adjusted within supported range
- Lower limits reduce heat but may reduce performance
- Useful for thermal-constrained environments`,
              tips: [
                'Changes require root privileges',
                'Some settings reset on reboot'
              ]
            },
            {
              id: 'step-d2-3-persist-check',
              type: 'command',
              title: 'Check Persistence Mode',
              content: 'Query current persistence mode setting.',
              expectedCommand: 'nvidia-smi --query-gpu=persistence_mode --format=csv',
              validationPattern: /nvidia-smi.*persistence_mode/,
              commandHint: 'Try: nvidia-smi --query-gpu=persistence_mode --format=csv',
              successMessage: 'Shows persistence mode status for each GPU.',
              tips: [
                'Should be "Enabled" for production use',
                'Can also check in main nvidia-smi output'
              ]
            },
            {
              id: 'step-d2-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU configuration.',
              quizQuestion: 'What compute mode should be used to ensure only one process can use a GPU at a time?',
              quizChoices: ['Default', 'Exclusive Process', 'Prohibited', 'Shared'],
              quizCorrectIndex: 1,
              quizExplanation: 'Exclusive Process mode ensures that only one CUDA context (process) can use the GPU at a time. This is useful for preventing resource contention.'
            }
          ]
        },
        {
          id: 'lesson-d2-power-management',
          title: 'GPU Power Management',
          description: 'Configure and monitor GPU power settings',
          objectives: [
            'Monitor power consumption',
            'Set power limits',
            'Understand power throttling'
          ],
          estimatedMinutes: 20,
          commands: ['nvidia-smi'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d2-persistence'],
          steps: [
            {
              id: 'step-d2-4-intro',
              type: 'concept',
              title: 'GPU Power Concepts',
              content: `**A100 Power Specifications:**

| Variant | TDP | Power Range |
|---------|-----|-------------|
| A100 PCIe | 250W | 100-250W |
| A100 SXM4 | 400W | 100-400W |
| H100 SXM5 | 700W | 100-700W |

**Power States (P-states):**
| State | Description |
|-------|-------------|
| P0 | Maximum performance |
| P8 | Basic 3D (not for A100) |
| P12 | Idle, low power |

**Why Adjust Power?**
- Reduce thermals in constrained environments
- Balance power budget across cluster
- Reduce noise in air-cooled systems
- Emergency thermal management`,
              tips: [
                'Lower power = lower thermals but less performance',
                'Changes require root privileges'
              ]
            },
            {
              id: 'step-d2-4-power-query',
              type: 'command',
              title: 'Check Power Usage',
              content: 'Query current power consumption and limits.',
              expectedCommand: 'nvidia-smi --query-gpu=power.draw,power.limit,power.max_limit --format=csv',
              validationPattern: /nvidia-smi.*power\.(draw|limit)/,
              commandHint: 'Try: nvidia-smi --query-gpu=power.draw,power.limit,power.max_limit --format=csv',
              successMessage: 'Shows current draw, current limit, and max allowed limit.',
              tips: [
                'power.draw is real-time consumption',
                'power.max_limit is the hardware maximum'
              ]
            },
            {
              id: 'step-d2-4-power-states',
              type: 'concept',
              title: 'Performance vs Power Tradeoffs',
              content: `**Performance Impact of Power Limits:**

| Power Limit % | Typical Perf Impact |
|---------------|---------------------|
| 100% | Baseline (max) |
| 90% | ~2-5% slower |
| 80% | ~5-10% slower |
| 70% | ~10-15% slower |
| 60% | ~15-25% slower |

**Power Efficiency Curve:**
- GPUs are most efficient at ~80% power
- Last 20% power gives diminishing returns
- Consider 350W vs 400W on A100 SXM4

**Use Cases for Power Limits:**
- Thermal constraints: Reduce to prevent throttling
- Power budget: Cluster-wide power management
- Noise: Lower power = lower fan speeds
- Efficiency: Save power with minimal perf loss`,
              tips: [
                '80% power often gives 95% performance',
                'Power efficiency varies by workload'
              ]
            },
            {
              id: 'step-d2-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of power management.',
              quizQuestion: 'What is the TDP (Thermal Design Power) of an A100 SXM4 GPU?',
              quizChoices: ['250W', '350W', '400W', '500W'],
              quizCorrectIndex: 2,
              quizExplanation: 'The A100 SXM4 has a TDP of 400W, while the PCIe variant has 250W TDP. The higher power allows for higher sustained clocks and better cooling with the SXM4 form factor.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d2-bluefield',
      title: 'BlueField DPU',
      description: 'Understanding BlueField Data Processing Units',
      icon: '🔌',
      order: 3,
      prerequisites: ['mod-d2-gpu-config'],
      lessons: [
        {
          id: 'lesson-d2-dpu-basics',
          title: 'BlueField DPU Overview',
          description: 'Introduction to BlueField Data Processing Units',
          objectives: [
            'Understand DPU architecture',
            'Know DPU modes of operation',
            'Check DPU status'
          ],
          estimatedMinutes: 20,
          commands: ['mst', 'flint'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d2-5-intro',
              type: 'concept',
              title: 'What is a DPU?',
              content: `**BlueField DPU (Data Processing Unit)** is a SmartNIC with:
- ARM CPU cores (embedded Linux)
- ConnectX network adapter
- Hardware accelerators

**DPU Capabilities:**
| Feature | Description |
|---------|-------------|
| Networking | 100-400 Gb/s Ethernet/InfiniBand |
| Security | Encryption, firewall |
| Storage | NVMe-oF, virtio-blk |
| Virtualization | SR-IOV, OVS offload |

**DGX Integration:**
- DGX A100: ConnectX-6 (not DPU)
- DGX H100: BlueField-3 DPU
- Offloads network/storage from host CPU

**DPU Operating Modes:**
| Mode | Description |
|------|-------------|
| Embedded | DPU controls NIC, host is endpoint |
| Separated | Host controls NIC, DPU is separate |
| Privileged | Full access to both |`,
              tips: [
                'DPU offloads infrastructure work from host',
                'Required for NVIDIA Magnum IO'
              ]
            },
            {
              id: 'step-d2-5-mst',
              type: 'command',
              title: 'Check MST Devices',
              content: 'List Mellanox/NVIDIA devices with MST (Mellanox Software Tools).',
              expectedCommand: 'mst status',
              validationPattern: /mst\s+status/,
              commandHint: 'Try: mst status',
              successMessage: 'Shows all Mellanox devices including ConnectX and BlueField.',
              tips: [
                'MST must be started: mst start',
                'Shows /dev/mst/mtXXXX device paths'
              ]
            },
            {
              id: 'step-d2-5-flint',
              type: 'command',
              title: 'Check Firmware Version',
              content: 'Query firmware version on a Mellanox device.',
              expectedCommand: 'flint -d /dev/mst/mt4125_pciconf0 query',
              validationPattern: /flint\s+(-d|--device).*query/,
              commandHint: 'Try: flint -d /dev/mst/mt4125_pciconf0 query',
              successMessage: 'Shows firmware version, PSID, and device info.',
              tips: [
                'Keep firmware up to date',
                'PSID identifies the exact card variant'
              ]
            },
            {
              id: 'step-d2-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DPU.',
              quizQuestion: 'What does DPU stand for in NVIDIA BlueField context?',
              quizChoices: [
                'Display Processing Unit',
                'Data Processing Unit',
                'Deep Processing Unit',
                'Distributed Processing Unit'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'DPU stands for Data Processing Unit. BlueField DPUs combine ARM CPUs, ConnectX networking, and hardware accelerators to offload infrastructure tasks from the host.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 110
};

/**
 * Domain 3: Base Infrastructure (19% of exam)
 */
const DOMAIN3_PATH: LearningPath = {
  id: 'path-domain3',
  domainId: 'domain3',
  title: 'Base Infrastructure',
  description: 'Master BCM, HA configurations, Slurm workload management, containers, and storage',
  examWeight: 19,
  skills: [
    'Slurm cluster management',
    'Container orchestration',
    'High availability concepts',
    'Storage configuration',
    'NGC containers',
    'Enroot/Pyxis integration'
  ],
  modules: [
    {
      id: 'mod-d3-slurm',
      title: 'Slurm Workload Manager',
      description: 'Managing HPC workloads with Slurm',
      icon: '📊',
      order: 1,
      lessons: [
        {
          id: 'lesson-d3-slurm-basics',
          title: 'Slurm Fundamentals',
          description: 'Learn the basics of Slurm job scheduling',
          objectives: [
            'Understand Slurm architecture',
            'Check cluster and node status',
            'Interpret node states'
          ],
          estimatedMinutes: 25,
          commands: ['sinfo', 'squeue', 'scontrol'],
          difficulty: 'beginner',
          steps: [
            {
              id: 'step-d3-1-intro',
              type: 'concept',
              title: 'Introduction to Slurm',
              content: `**Slurm** (Simple Linux Utility for Resource Management) is the workload manager used on DGX clusters. It handles:

- Job scheduling and queuing
- Resource allocation (GPUs, CPUs, memory)
- Node state management
- Job accounting

**Key Components:**
| Component | Description |
|-----------|-------------|
| slurmctld | Central controller daemon |
| slurmd | Node daemon (on each compute node) |
| slurmdbd | Database daemon for accounting |

**Key Concepts:**
- **Partition**: Group of nodes (like a queue)
- **Job**: User workload to be executed
- **Allocation**: Reserved resources for a job
- **GRES**: Generic Resources (used for GPUs)`,
              tips: [
                'Slurm is the standard for HPC and AI clusters',
                'GPU allocation uses GRES (Generic Resources)'
              ]
            },
            {
              id: 'step-d3-1-sinfo',
              type: 'command',
              title: 'Check Cluster Status',
              content: 'Use sinfo to see the status of all nodes in the cluster.',
              expectedCommand: 'sinfo',
              commandHint: 'Type: sinfo',
              successMessage: 'sinfo shows partitions, their state, and available nodes.',
              tips: [
                'States: idle (available), alloc (in use), down, drain',
                'The asterisk (*) marks the default partition'
              ]
            },
            {
              id: 'step-d3-1-sinfo-detail',
              type: 'command',
              title: 'Detailed Node Information',
              content: 'Use sinfo with format options for more details.',
              expectedCommand: 'sinfo -N -l',
              validationPattern: /sinfo\s+(-N|-l|--long|--Node)/,
              commandHint: 'Try: sinfo -N -l',
              successMessage: 'Shows each node individually with CPU, memory, and state.',
              tips: [
                '-N shows node-oriented output',
                '-l shows long (detailed) format'
              ]
            },
            {
              id: 'step-d3-1-squeue',
              type: 'command',
              title: 'View Job Queue',
              content: 'Check the current job queue with squeue.',
              expectedCommand: 'squeue',
              commandHint: 'Type: squeue',
              successMessage: 'squeue shows all pending and running jobs.',
              tips: [
                'ST column: R=Running, PD=Pending, CG=Completing',
                'Use -u $USER to see only your jobs'
              ]
            },
            {
              id: 'step-d3-1-node',
              type: 'command',
              title: 'Node Details',
              content: 'Get detailed information about a specific node.',
              expectedCommand: 'scontrol show node dgx-01',
              validationPattern: /scontrol\s+show\s+node\s+\w+/,
              commandHint: 'Try: scontrol show node dgx-01',
              successMessage: 'scontrol show node displays detailed node configuration.',
              tips: [
                'Shows CPU, memory, GRES (GPU) configuration',
                'State reasons explain why nodes are down/drain'
              ]
            },
            {
              id: 'step-d3-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Slurm.',
              quizQuestion: 'What does a node state of "drain" indicate?',
              quizChoices: [
                'Node is available for jobs',
                'Node is running a job',
                'Node is marked unavailable by admin (existing jobs continue)',
                'Node has failed'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'A drained node is marked unavailable for new jobs by an administrator, but any running jobs are allowed to complete. This is different from "down" which means the node has failed.'
            }
          ]
        },
        {
          id: 'lesson-d3-slurm-jobs',
          title: 'Job Submission and Management',
          description: 'Submit, monitor, and manage Slurm jobs',
          objectives: [
            'Submit batch jobs with sbatch',
            'Request GPU resources',
            'Monitor and cancel jobs'
          ],
          estimatedMinutes: 25,
          commands: ['sbatch', 'srun', 'scancel', 'scontrol'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d3-slurm-basics'],
          steps: [
            {
              id: 'step-d3-2-intro',
              type: 'concept',
              title: 'Job Submission Concepts',
              content: `Slurm jobs are submitted using **sbatch** (batch) or **srun** (interactive).

**Common sbatch Options:**
| Option | Description |
|--------|-------------|
| -N, --nodes | Number of nodes |
| -n, --ntasks | Number of tasks |
| -c, --cpus-per-task | CPUs per task |
| --gres=gpu:N | Number of GPUs |
| -t, --time | Time limit (D-HH:MM:SS) |
| -p, --partition | Target partition |
| -o, --output | Output file path |
| -e, --error | Error file path |

**Example Job Script:**
\`\`\`bash
#!/bin/bash
#SBATCH --job-name=gpu-test
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=16
#SBATCH --gres=gpu:8
#SBATCH --time=01:00:00

nvidia-smi
python train.py
\`\`\``,
              tips: [
                'Always specify a time limit to improve scheduling',
                'GPU jobs typically need --gres=gpu:N'
              ]
            },
            {
              id: 'step-d3-2-submit',
              type: 'command',
              title: 'Submit a Job',
              content: 'Submit a simple GPU job using sbatch.',
              expectedCommand: 'sbatch --gres=gpu:1 --wrap="nvidia-smi"',
              validationPattern: /sbatch\s+.*--gres=gpu/,
              commandHint: 'Try: sbatch --gres=gpu:1 --wrap="nvidia-smi"',
              successMessage: 'Job submitted! Note the job ID for tracking.',
              tips: [
                '--wrap runs a single command without a script file',
                'Job output goes to slurm-JOBID.out by default'
              ]
            },
            {
              id: 'step-d3-2-show',
              type: 'command',
              title: 'View Job Details',
              content: 'Check detailed information about a submitted job.',
              expectedCommand: 'scontrol show job',
              validationPattern: /scontrol\s+show\s+job/,
              commandHint: 'Try: scontrol show job (or add job ID)',
              successMessage: 'Shows comprehensive job information including resources and state.',
              tips: [
                'JobState shows current status',
                'NumNodes, NumCPUs, NumTasks show allocation'
              ]
            },
            {
              id: 'step-d3-2-srun',
              type: 'command',
              title: 'Interactive Job',
              content: 'Use srun for interactive GPU access.',
              expectedCommand: 'srun --gres=gpu:1 --pty bash',
              validationPattern: /srun\s+.*--gres=gpu.*--pty/,
              commandHint: 'Try: srun --gres=gpu:1 --pty bash',
              successMessage: 'Starts an interactive shell with GPU access.',
              tips: [
                '--pty allocates a pseudo-terminal',
                'Exit the shell to release resources'
              ]
            },
            {
              id: 'step-d3-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of job submission.',
              quizQuestion: 'Which sbatch option requests GPU resources?',
              quizChoices: ['--gpu=N', '--gres=gpu:N', '--ngpus=N', '--cuda=N'],
              quizCorrectIndex: 1,
              quizExplanation: 'GPUs are requested using --gres=gpu:N (Generic RESource). The exact syntax depends on cluster configuration but this is the standard format.'
            }
          ]
        },
        {
          id: 'lesson-d3-slurm-advanced',
          title: 'Advanced Slurm Features',
          description: 'Master job arrays, dependencies, and resource management',
          objectives: [
            'Use job arrays for parallel tasks',
            'Set up job dependencies',
            'Understand resource limits'
          ],
          estimatedMinutes: 20,
          commands: ['sbatch', 'scontrol'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-slurm-jobs'],
          steps: [
            {
              id: 'step-d3-3-arrays',
              type: 'concept',
              title: 'Job Arrays',
              content: `**Job Arrays** allow submitting many similar jobs with one command.

\`\`\`bash
#SBATCH --array=0-99        # 100 tasks (0-99)
#SBATCH --array=1,3,5,7     # Specific indices
#SBATCH --array=0-100:10    # Step by 10 (0,10,20...)
#SBATCH --array=0-100%10    # Max 10 running at once
\`\`\`

**Environment Variables:**
- \`SLURM_ARRAY_JOB_ID\`: Master job ID
- \`SLURM_ARRAY_TASK_ID\`: Individual task index
- \`SLURM_ARRAY_TASK_COUNT\`: Total number of tasks`,
              tips: [
                'Great for hyperparameter sweeps',
                'Use %N to limit concurrent tasks'
              ]
            },
            {
              id: 'step-d3-3-deps',
              type: 'concept',
              title: 'Job Dependencies',
              content: `**Dependencies** control job execution order.

\`\`\`bash
sbatch --dependency=afterok:12345 job.sh
\`\`\`

**Dependency Types:**
| Type | Description |
|------|-------------|
| after:jobid | Start after job begins |
| afterok:jobid | Start after job completes successfully |
| afternotok:jobid | Start if job fails |
| afterany:jobid | Start after job ends (any state) |
| singleton | One job of this name at a time |

Multiple dependencies: \`--dependency=afterok:123:456\``,
              tips: [
                'Useful for multi-stage pipelines',
                'Data preprocessing -> Training -> Evaluation'
              ]
            },
            {
              id: 'step-d3-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of advanced Slurm.',
              quizQuestion: 'Which dependency type waits for a job to complete successfully?',
              quizChoices: ['after', 'afterok', 'afterany', 'singleton'],
              quizCorrectIndex: 1,
              quizExplanation: 'afterok waits for the specified job to complete with exit code 0 (success). afterany runs regardless of success/failure, and after runs when the job starts.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d3-containers',
      title: 'Container Management',
      description: 'Working with containers on DGX systems',
      icon: '📦',
      order: 2,
      prerequisites: ['mod-d3-slurm'],
      lessons: [
        {
          id: 'lesson-d3-ngc',
          title: 'NGC Containers',
          description: 'Using NVIDIA NGC container registry',
          objectives: [
            'Understand NGC container ecosystem',
            'Pull and run NGC containers',
            'Configure container runtime for GPUs'
          ],
          estimatedMinutes: 20,
          commands: ['docker', 'nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d3-4-intro',
              type: 'concept',
              title: 'NVIDIA NGC Overview',
              content: `**NGC (NVIDIA GPU Cloud)** is NVIDIA's hub for GPU-optimized software:

**Container Categories:**
- **Deep Learning**: PyTorch, TensorFlow, MXNet
- **HPC**: CUDA, OpenMPI, compilers
- **Data Science**: RAPIDS, Jupyter
- **Inference**: Triton, TensorRT

**Benefits of NGC Containers:**
- Pre-configured for optimal GPU performance
- Tested driver/CUDA combinations
- Regular security updates
- Consistent environments across systems

**Container Naming:**
\`nvcr.io/nvidia/pytorch:23.10-py3\`
- Registry: nvcr.io/nvidia
- Image: pytorch
- Tag: 23.10-py3 (year.month-python version)`,
              tips: [
                'Always use specific tags, not "latest"',
                'Check release notes for driver requirements'
              ]
            },
            {
              id: 'step-d3-4-run',
              type: 'command',
              title: 'Run NGC Container',
              content: 'Run a container with GPU access using nvidia-docker.',
              expectedCommand: 'docker run --gpus all nvidia/cuda:12.0-base nvidia-smi',
              validationPattern: /docker\s+run\s+--gpus/,
              commandHint: 'Try: docker run --gpus all nvidia/cuda:12.0-base nvidia-smi',
              successMessage: 'Container runs with GPU access and shows nvidia-smi output.',
              tips: [
                '--gpus all enables all GPUs in container',
                'Can specify --gpus "device=0,1" for specific GPUs'
              ]
            },
            {
              id: 'step-d3-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NGC.',
              quizQuestion: 'What docker flag enables GPU access in containers?',
              quizChoices: ['--nvidia', '--gpu', '--gpus', '--cuda'],
              quizCorrectIndex: 2,
              quizExplanation: 'The --gpus flag enables GPU access. Use --gpus all for all GPUs or --gpus "device=0,1" for specific GPUs.'
            }
          ]
        },
        {
          id: 'lesson-d3-enroot',
          title: 'Enroot and Pyxis',
          description: 'HPC container runtime with Slurm integration',
          objectives: [
            'Understand Enroot advantages for HPC',
            'Use Pyxis for Slurm container jobs',
            'Configure container workloads'
          ],
          estimatedMinutes: 20,
          commands: ['enroot', 'srun'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-ngc'],
          steps: [
            {
              id: 'step-d3-5-intro',
              type: 'concept',
              title: 'Enroot and Pyxis Overview',
              content: `**Enroot** is a lightweight container runtime designed for HPC:
- No daemon required (unlike Docker)
- Unprivileged operation
- Efficient image distribution
- Native GPU support

**Pyxis** is the Slurm plugin for Enroot:
- Seamless container integration with Slurm
- Automatic GPU/network setup
- Simple command-line interface

**Usage with Slurm:**
\`\`\`bash
srun --container-image=nvcr.io/nvidia/pytorch:23.10-py3 \\
     python train.py
\`\`\``,
              tips: [
                'Enroot is preferred over Docker for HPC workloads',
                'Pyxis handles container setup automatically'
              ]
            },
            {
              id: 'step-d3-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of Enroot.',
              quizQuestion: 'What is the main advantage of Enroot over Docker for HPC?',
              quizChoices: [
                'More GPU support',
                'Better graphics',
                'No daemon required, unprivileged operation',
                'Faster networking'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Enroot operates without a daemon and can run unprivileged, making it more suitable for shared HPC environments where users don\'t have root access.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d3-storage',
      title: 'Storage Configuration',
      description: 'Managing storage for AI/ML workloads on DGX',
      icon: '💾',
      order: 3,
      prerequisites: ['mod-d3-containers'],
      lessons: [
        {
          id: 'lesson-d3-storage-overview',
          title: 'DGX Storage Architecture',
          description: 'Understanding storage options and configuration for DGX systems',
          objectives: [
            'Understand local vs shared storage',
            'Know DGX internal storage layout',
            'Configure storage for AI workloads'
          ],
          estimatedMinutes: 25,
          commands: ['df', 'lsblk', 'mount'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d3-6-intro',
              type: 'concept',
              title: 'DGX Storage Architecture',
              content: `**DGX A100 Internal Storage:**

| Component | Capacity | Purpose |
|-----------|----------|---------|
| OS NVMe | 2x 1.92TB | OS, /home |
| Data NVMe | Up to 8x 3.84TB | /raid, scratch |

**Storage Types for AI/ML:**

| Type | Use Case | Pros | Cons |
|------|----------|------|------|
| Local NVMe | Scratch, checkpoints | Fast, low latency | Not shared |
| NFS | Home dirs, shared data | Simple, shared | Slower |
| Lustre | Large datasets | Parallel I/O | Complex |
| GPFS | Enterprise workloads | Robust | Expensive |
| WekaFS | AI-optimized | Very fast | Newer |

**Best Practices:**
- Use local NVMe for job scratch space
- Mount shared storage for datasets
- Use parallel filesystem for large-scale training
- Monitor I/O to avoid bottlenecks`,
              tips: [
                'Local NVMe is much faster than networked storage',
                'Stage data to local scratch for best performance'
              ]
            },
            {
              id: 'step-d3-6-df',
              type: 'command',
              title: 'Check Disk Space',
              content: 'View available disk space on all mounted filesystems.',
              expectedCommand: 'df -h',
              validationPattern: /df\s+(-h|--human-readable)/,
              commandHint: 'Try: df -h',
              successMessage: 'Shows all mounted filesystems with their usage.',
              tips: [
                'Watch for nearly full filesystems',
                '/raid is typically the large local storage'
              ]
            },
            {
              id: 'step-d3-6-lsblk',
              type: 'command',
              title: 'List Block Devices',
              content: 'View all block storage devices and their partitions.',
              expectedCommand: 'lsblk',
              commandHint: 'Type: lsblk',
              successMessage: 'Shows NVMe drives and their partition layout.',
              tips: [
                'nvme0n1, nvme1n1 etc. are NVMe drives',
                'Look for RAID arrays (md devices)'
              ]
            },
            {
              id: 'step-d3-6-nvme-list',
              type: 'command',
              title: 'NVMe Drive Information',
              content: 'Get detailed information about NVMe drives.',
              expectedCommand: 'nvme list',
              validationPattern: /nvme\s+list/,
              commandHint: 'Try: nvme list',
              successMessage: 'Shows all NVMe drives with model and capacity.',
              tips: [
                'Check firmware version for drives',
                'Monitor SMART data for drive health'
              ]
            },
            {
              id: 'step-d3-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DGX storage.',
              quizQuestion: 'What is the recommended storage type for job scratch space on DGX?',
              quizChoices: [
                'NFS',
                'Local NVMe',
                'iSCSI',
                'CIFS/SMB'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Local NVMe storage provides the lowest latency and highest throughput for scratch data. It\'s ideal for temporary files, checkpoints, and staging data during training.'
            }
          ]
        },
        {
          id: 'lesson-d3-parallel-fs',
          title: 'Parallel Filesystems',
          description: 'Working with Lustre and GPFS for large-scale storage',
          objectives: [
            'Understand parallel filesystem concepts',
            'Check Lustre client status',
            'Optimize I/O for AI workloads'
          ],
          estimatedMinutes: 25,
          commands: ['lctl', 'lfs', 'mount'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d3-storage-overview'],
          steps: [
            {
              id: 'step-d3-7-intro',
              type: 'concept',
              title: 'Parallel Filesystems for AI',
              content: `**Why Parallel Filesystems?**
- Aggregate bandwidth from multiple servers
- Handle millions of files
- Scale to petabytes
- Support concurrent access from many nodes

**Lustre Architecture:**
| Component | Role |
|-----------|------|
| MDS (Metadata Server) | File names, directories |
| OSS (Object Storage Server) | File data |
| MGS (Management Server) | Configuration |
| Client | Mounts filesystem |

**Lustre Striping:**
- Files split across multiple OSTs
- Increases read/write bandwidth
- Configurable per-file or per-directory

**Optimal Settings for AI:**
- Large stripe size (1-4 MB) for large files
- Multiple OSTs for large datasets
- Avoid many small files`,
              tips: [
                'Striping improves performance for large files',
                'Many small files are inefficient on parallel FS'
              ]
            },
            {
              id: 'step-d3-7-lfs-df',
              type: 'command',
              title: 'Check Lustre Space',
              content: 'View Lustre filesystem usage.',
              expectedCommand: 'lfs df -h',
              validationPattern: /lfs\s+df/,
              commandHint: 'Try: lfs df -h',
              successMessage: 'Shows space on each OST and MDT.',
              tips: [
                'Watch for full OSTs that block writes',
                'MDT space affects file creation'
              ]
            },
            {
              id: 'step-d3-7-lfs-stripe',
              type: 'command',
              title: 'Check File Striping',
              content: 'View the stripe configuration for a file or directory.',
              expectedCommand: 'lfs getstripe /path/to/file',
              validationPattern: /lfs\s+getstripe/,
              commandHint: 'Try: lfs getstripe /path/to/file',
              successMessage: 'Shows stripe count and size.',
              tips: [
                'More stripes = more parallel I/O',
                'Set striping before creating large files'
              ]
            },
            {
              id: 'step-d3-7-io-tips',
              type: 'concept',
              title: 'I/O Optimization Tips',
              content: `**Optimizing I/O for AI/ML:**

**Data Loading:**
- Use NVIDIA DALI for GPU-accelerated loading
- Enable multiple data loading workers
- Stage frequently-used data to local NVMe
- Use memory-mapped files when possible

**Checkpointing:**
- Write to local NVMe during training
- Background copy to shared storage
- Use torch.save with pickle protocol 4+
- Consider distributed checkpointing

**Dataset Organization:**
- Use large files (TFRecord, WebDataset)
- Avoid millions of small image files
- Pre-process data into efficient formats
- Consider caching preprocessed data

**Monitoring I/O:**
\`\`\`bash
iostat -x 5       # Disk I/O stats
iotop             # Per-process I/O
\`\`\``,
              tips: [
                'I/O is often the training bottleneck',
                'Profile with nsys to find I/O issues'
              ]
            },
            {
              id: 'step-d3-7-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of parallel filesystems.',
              quizQuestion: 'What does Lustre striping do?',
              quizChoices: [
                'Compresses data',
                'Encrypts data across servers',
                'Splits files across multiple storage servers for parallel I/O',
                'Duplicates data for redundancy'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Lustre striping splits file data across multiple Object Storage Targets (OSTs), allowing parallel I/O operations that aggregate bandwidth from multiple servers.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 160
};

/**
 * Domain 4: Validation & Testing (33% of exam)
 */
const DOMAIN4_PATH: LearningPath = {
  id: 'path-domain4',
  domainId: 'domain4',
  title: 'Validation & Testing',
  description: 'Master NCCL testing, DCGMI diagnostics, health checks, and performance benchmarks',
  examWeight: 33,
  skills: [
    'NCCL performance testing',
    'DCGM diagnostics',
    'Health check procedures',
    'Performance benchmarking',
    'HPL/HPCG testing',
    'Memory bandwidth testing'
  ],
  modules: [
    {
      id: 'mod-d4-dcgm',
      title: 'DCGM Diagnostics',
      description: 'Using NVIDIA Data Center GPU Manager for diagnostics',
      icon: '🔍',
      order: 1,
      lessons: [
        {
          id: 'lesson-d4-dcgmi-basics',
          title: 'DCGMI Fundamentals',
          description: 'Learn DCGM for GPU health monitoring and diagnostics',
          objectives: [
            'Understand DCGM architecture',
            'Check GPU health status',
            'Run diagnostic tests'
          ],
          estimatedMinutes: 30,
          commands: ['dcgmi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d4-1-intro',
              type: 'concept',
              title: 'Introduction to DCGM',
              content: `**DCGM (Data Center GPU Manager)** is NVIDIA's tool for managing and monitoring GPUs at scale.

**Capabilities:**
- Health monitoring and diagnostics
- Configuration management
- Policy-based management
- Integration with cluster schedulers
- Telemetry and profiling

**Key Components:**
| Component | Description |
|-----------|-------------|
| nv-hostengine | Background daemon |
| dcgmi | Command-line interface |
| DCGM libraries | For programmatic access |

**DCGM vs nvidia-smi:**
- DCGM can detect memory health issues
- DCGM runs stress tests on GPUs
- DCGM monitors interconnects (NVLink, NVSwitch)
- DCGM integrates with monitoring systems`,
              tips: [
                'DCGM must be running (nv-hostengine)',
                'More thorough than nvidia-smi for health checks'
              ]
            },
            {
              id: 'step-d4-1-discovery',
              type: 'command',
              title: 'GPU Discovery',
              content: 'Discover all GPUs known to DCGM.',
              expectedCommand: 'dcgmi discovery -l',
              validationPattern: /dcgmi\s+discovery\s+(-l|--list)/,
              commandHint: 'Try: dcgmi discovery -l',
              successMessage: 'Shows all GPUs with their entity IDs and basic info.',
              tips: [
                'Entity IDs are used in other DCGM commands',
                'NvSwitches and NICs may also appear'
              ]
            },
            {
              id: 'step-d4-1-health',
              type: 'command',
              title: 'Check GPU Health',
              content: 'Run a quick health check on all GPUs.',
              expectedCommand: 'dcgmi health -c',
              validationPattern: /dcgmi\s+health\s+(-c|--check)/,
              commandHint: 'Try: dcgmi health -c',
              successMessage: 'Shows health status for memory, PCIe, NVLink, and more.',
              tips: [
                'Green = healthy, Yellow = warning, Red = failure',
                'Use -g for group-specific checks'
              ]
            },
            {
              id: 'step-d4-1-health-watch',
              type: 'command',
              title: 'Enable Health Watches',
              content: 'Set up continuous health monitoring.',
              expectedCommand: 'dcgmi health -s mpi',
              validationPattern: /dcgmi\s+health\s+(-s|--set)/,
              commandHint: 'Try: dcgmi health -s mpi (memory, pcie, inforom)',
              successMessage: 'Enables health watches for specified components.',
              tips: [
                'm = memory, p = PCIe, i = InfoROM',
                'Can combine: dcgmi health -s mpin'
              ]
            },
            {
              id: 'step-d4-1-diag',
              type: 'command',
              title: 'Run Diagnostics',
              content: 'Run the short diagnostic test suite.',
              expectedCommand: 'dcgmi diag -r 1',
              validationPattern: /dcgmi\s+diag\s+(-r|--run)\s+[123]/,
              commandHint: 'Try: dcgmi diag -r 1 (1=short, 2=medium, 3=long)',
              successMessage: 'Level 1 runs quick tests. Higher levels are more thorough.',
              tips: [
                'Level 1: Quick deployment check (~1 min)',
                'Level 2: Medium tests (~2 min)',
                'Level 3: Extended stress tests (~15+ min)'
              ]
            },
            {
              id: 'step-d4-1-diag-detail',
              type: 'concept',
              title: 'Diagnostic Levels',
              content: `**DCGM Diagnostic Levels:**

**Level 1 (Quick):**
- Software deployment check
- Basic GPU accessibility
- ~1 minute runtime

**Level 2 (Medium):**
- PCIe bandwidth test
- GPU memory bandwidth
- Basic compute test
- ~2 minutes runtime

**Level 3 (Extended):**
- Full memory stress test
- Extended compute stress
- NVLink bandwidth test
- Diagnostic stress test
- ~15+ minutes runtime

**When to Use Each:**
- Level 1: Quick sanity check, post-maintenance
- Level 2: Regular validation, pre-job checks
- Level 3: Initial deployment, RMA qualification`,
              tips: [
                'Level 3 should be run after hardware changes',
                'Include diag results in support tickets'
              ]
            },
            {
              id: 'step-d4-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DCGM.',
              quizQuestion: 'What diagnostic level should you run for a thorough hardware validation after new deployment?',
              quizChoices: [
                'Level 1 (quick)',
                'Level 2 (medium)',
                'Level 3 (extended)',
                'Level 0 (basic)'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Level 3 runs extended stress tests and is recommended for thorough hardware validation after deployment or maintenance. Level 2 is good for regular checks, and Level 1 is for quick deployment verification.'
            }
          ]
        },
        {
          id: 'lesson-d4-dcgm-groups',
          title: 'DCGM Groups and Policies',
          description: 'Organize GPUs and set monitoring policies',
          objectives: [
            'Create and manage GPU groups',
            'Set up health policies',
            'Configure alerts and actions'
          ],
          estimatedMinutes: 20,
          commands: ['dcgmi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-dcgmi-basics'],
          steps: [
            {
              id: 'step-d4-1b-groups',
              type: 'concept',
              title: 'GPU Groups',
              content: `**DCGM Groups** allow managing multiple GPUs as a unit.

**Use Cases:**
- Monitor all GPUs on a node
- Apply policies to specific GPU sets
- Run diagnostics on GPU subsets

**Default Groups:**
- Group 0: All GPUs in the system

**Creating Groups:**
\`\`\`bash
dcgmi group -c mygroup        # Create group
dcgmi group -a 0,1,2 mygroup  # Add GPUs 0,1,2
dcgmi group -l                # List groups
\`\`\``,
              tips: [
                'Groups persist across restarts',
                'Use groups for multi-node monitoring'
              ]
            },
            {
              id: 'step-d4-1b-list',
              type: 'command',
              title: 'List Groups',
              content: 'View all defined GPU groups.',
              expectedCommand: 'dcgmi group -l',
              validationPattern: /dcgmi\s+group\s+(-l|--list)/,
              commandHint: 'Try: dcgmi group -l',
              successMessage: 'Shows all groups and their GPU members.',
              tips: [
                'Group 0 is the default group with all GPUs',
                'Custom groups can be created for specific workloads'
              ]
            },
            {
              id: 'step-d4-1b-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of DCGM groups.',
              quizQuestion: 'What is Group 0 in DCGM?',
              quizChoices: [
                'An empty placeholder group',
                'The default group containing all GPUs',
                'A group for failed GPUs',
                'A group for MIG instances'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Group 0 is the default group that automatically contains all GPUs in the system. Custom groups can be created for managing specific GPU subsets.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d4-nccl',
      title: 'NCCL Testing',
      description: 'Validating multi-GPU communication with NCCL',
      icon: '🔄',
      order: 2,
      prerequisites: ['mod-d4-dcgm'],
      lessons: [
        {
          id: 'lesson-d4-nccl-tests',
          title: 'NCCL Performance Tests',
          description: 'Run NCCL tests to validate GPU communication',
          objectives: [
            'Understand NCCL collectives',
            'Run all_reduce benchmark',
            'Interpret performance results'
          ],
          estimatedMinutes: 30,
          commands: ['nccl-tests'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d4-2-intro',
              type: 'concept',
              title: 'NCCL Overview',
              content: `**NCCL (NVIDIA Collective Communications Library)** optimizes multi-GPU and multi-node communication.

**Supported Collectives:**
| Collective | Description |
|------------|-------------|
| AllReduce | Combine values from all, distribute result |
| AllGather | Gather data from all to all |
| Broadcast | Send from one to all |
| Reduce | Combine to one destination |
| ReduceScatter | Reduce and scatter results |
| AllToAll | Full exchange between all |

**NCCL Automatically Uses:**
- NVLink (within node, fastest)
- NVSwitch (within node, all-to-all)
- InfiniBand (between nodes)
- PCIe/Ethernet (fallback)

**nccl-tests** is the official benchmark suite for validating NCCL performance.`,
              tips: [
                'NCCL is critical for distributed training',
                'Poor NCCL performance usually indicates hardware/config issues'
              ]
            },
            {
              id: 'step-d4-2-allreduce',
              type: 'command',
              title: 'Run All-Reduce Test',
              content: 'Run the all_reduce benchmark across all local GPUs.',
              expectedCommand: './all_reduce_perf -b 8 -e 256M -f 2 -g 8',
              validationPattern: /all_reduce_perf|nccl.*all.?reduce/i,
              commandHint: 'Try: ./all_reduce_perf -b 8 -e 256M -f 2 -g 8',
              successMessage: 'This runs all_reduce with varying message sizes across 8 GPUs.',
              tips: [
                '-b: starting size, -e: ending size',
                '-f: factor to multiply size by, -g: number of GPUs'
              ]
            },
            {
              id: 'step-d4-2-interpret',
              type: 'concept',
              title: 'Interpreting NCCL Results',
              content: `**Key Metrics in NCCL Output:**

| Column | Description |
|--------|-------------|
| size | Message size in bytes |
| count | Number of elements |
| time | Operation time |
| algbw | Algorithm bandwidth |
| busbw | Bus bandwidth (actual) |

**Expected Bus Bandwidth on DGX A100:**
- 8 GPUs, large messages: ~225-240 GB/s
- Scales with NVSwitch connectivity

**Troubleshooting Low Performance:**
- Check NVLink status with nvidia-smi nvlink -s
- Verify Fabric Manager is running
- Check for NVLink errors
- Ensure proper NUMA affinity`,
              tips: [
                'Bus bandwidth should approach theoretical maximum',
                'Small messages have higher overhead, lower bandwidth is normal'
              ]
            },
            {
              id: 'step-d4-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NCCL.',
              quizQuestion: 'What collective operation is most commonly used in distributed deep learning for gradient synchronization?',
              quizChoices: ['Broadcast', 'AllGather', 'AllReduce', 'ReduceScatter'],
              quizCorrectIndex: 2,
              quizExplanation: 'AllReduce is the most common operation in distributed training because it efficiently computes gradient averages across all GPUs. Each GPU contributes its gradients, and all GPUs receive the sum/average.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d4-benchmarks',
      title: 'Performance Benchmarks',
      description: 'Running and interpreting system benchmarks',
      icon: '📈',
      order: 3,
      prerequisites: ['mod-d4-nccl'],
      lessons: [
        {
          id: 'lesson-d4-gpu-burn',
          title: 'GPU Stress Testing',
          description: 'Run stress tests to validate GPU stability',
          objectives: [
            'Understand stress testing purposes',
            'Run GPU burn tests',
            'Monitor for thermal and stability issues'
          ],
          estimatedMinutes: 20,
          commands: ['gpu-burn', 'nvidia-smi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d4-3-intro',
              type: 'concept',
              title: 'GPU Stress Testing',
              content: `**Why Stress Test GPUs?**
- Validate stability under load
- Detect thermal issues
- Find marginal hardware
- Burn-in new systems

**gpu-burn** is a popular stress testing tool that:
- Runs intensive matrix multiplications
- Tests both compute and memory
- Verifies results for correctness
- Runs for specified duration

**What to Monitor:**
- Temperature (should stabilize below throttle point)
- Power consumption (should reach TDP)
- Errors (any errors indicate problems)
- Clock speeds (should remain at boost levels)`,
              tips: [
                'Run for at least 10 minutes for meaningful results',
                'Monitor with nvidia-smi in another terminal'
              ]
            },
            {
              id: 'step-d4-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of stress testing.',
              quizQuestion: 'What is the primary purpose of running gpu-burn on a new DGX system?',
              quizChoices: [
                'To benchmark performance',
                'To validate stability and detect marginal hardware',
                'To measure power consumption',
                'To test networking'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'gpu-burn is used to stress test GPUs to validate stability and detect any marginal hardware that might fail under sustained load. It\'s commonly used for burn-in testing of new systems.'
            }
          ]
        },
        {
          id: 'lesson-d4-hpl',
          title: 'HPL Benchmarking',
          description: 'Run HPL benchmark for system validation',
          objectives: [
            'Understand HPL benchmark',
            'Interpret HPL results',
            'Compare to reference values'
          ],
          estimatedMinutes: 20,
          commands: ['hpl'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-gpu-burn'],
          steps: [
            {
              id: 'step-d4-4-intro',
              type: 'concept',
              title: 'HPL Overview',
              content: `**HPL (High Performance Linpack)** is the benchmark used for the TOP500 supercomputer list.

**What HPL Measures:**
- Dense linear algebra performance
- Overall system compute capability
- Memory bandwidth utilization
- Multi-GPU scaling efficiency

**DGX A100 Reference Performance:**
- Single node (8 GPUs): ~10 PFLOPS (FP64)
- Achieving 85%+ efficiency is considered good

**Key Parameters:**
- N: Problem size (larger = more efficient but slower)
- NB: Block size (affects efficiency)
- P x Q: Process grid (should match GPU topology)

**Why It Matters:**
- Industry standard for validation
- Required for procurement acceptance
- Baseline for performance issues`,
              tips: [
                'HPL requires careful tuning for optimal results',
                'NGC provides optimized HPL containers'
              ]
            },
            {
              id: 'step-d4-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of HPL.',
              quizQuestion: 'What does HPL measure?',
              quizChoices: [
                'Network bandwidth',
                'Storage I/O performance',
                'Dense linear algebra (compute) performance',
                'Memory capacity'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'HPL (High Performance Linpack) measures dense linear algebra performance by solving a system of linear equations. It\'s the benchmark used for the TOP500 supercomputer list.'
            }
          ]
        },
        {
          id: 'lesson-d4-memory-bandwidth',
          title: 'Memory Bandwidth Testing',
          description: 'Measure and validate GPU memory bandwidth performance',
          objectives: [
            'Understand HBM2e memory specifications',
            'Run bandwidth benchmarks',
            'Identify memory performance issues'
          ],
          estimatedMinutes: 25,
          commands: ['bandwidthTest', 'nvidia-smi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-hpl'],
          steps: [
            {
              id: 'step-d4-5-intro',
              type: 'concept',
              title: 'GPU Memory Architecture',
              content: `**HBM2e Memory on A100:**

| Specification | A100 80GB |
|---------------|-----------|
| Memory Type | HBM2e |
| Capacity | 80 GB |
| Bus Width | 5120 bits |
| Bandwidth | 2039 GB/s (theoretical) |
| ECC | Yes (reduces usable ~6%) |

**Memory Bandwidth Components:**
- **Device-to-Device (D2D)**: GPU memory to GPU memory
- **Host-to-Device (H2D)**: System RAM to GPU
- **Device-to-Host (D2H)**: GPU to System RAM
- **Peer-to-Peer (P2P)**: GPU to GPU via NVLink/PCIe

**Why Bandwidth Matters:**
- AI/ML workloads are often memory-bound
- Low bandwidth indicates hardware issues
- ECC errors can reduce effective bandwidth`,
              tips: [
                'Actual bandwidth is typically 85-90% of theoretical',
                'ECC overhead reduces bandwidth by ~6%'
              ]
            },
            {
              id: 'step-d4-5-pcie',
              type: 'concept',
              title: 'PCIe Bandwidth',
              content: `**PCIe Bandwidth on DGX:**

| PCIe Gen | Bandwidth (x16) |
|----------|-----------------|
| Gen 3 | 16 GB/s |
| Gen 4 | 32 GB/s |
| Gen 5 | 64 GB/s |

**DGX A100 PCIe:**
- Uses PCIe Gen 4 for host connectivity
- 8 GPUs share system PCIe bandwidth
- NVLink preferred for GPU-to-GPU transfers

**When PCIe Matters:**
- Initial data loading from CPU
- Checkpoint writes to host storage
- CPU-GPU communication`,
              tips: [
                'NVLink is 12x faster than PCIe Gen 4',
                'Minimize PCIe transfers for best performance'
              ]
            },
            {
              id: 'step-d4-5-query-mem',
              type: 'command',
              title: 'Check Memory Info',
              content: 'Query memory specifications for all GPUs.',
              expectedCommand: 'nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv',
              validationPattern: /nvidia-smi.*memory\.(total|free|used)/,
              commandHint: 'Try: nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv',
              successMessage: 'Shows memory capacity and current usage for each GPU.',
              tips: [
                'A100-80GB shows ~80GB total',
                'Some memory is reserved for ECC and driver'
              ]
            },
            {
              id: 'step-d4-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU memory.',
              quizQuestion: 'What is the theoretical memory bandwidth of an A100 80GB GPU?',
              quizChoices: [
                '900 GB/s',
                '1555 GB/s',
                '2039 GB/s',
                '3000 GB/s'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'The A100 80GB uses HBM2e memory with a theoretical bandwidth of 2039 GB/s (2 TB/s). Actual achieved bandwidth is typically 85-90% of theoretical.'
            }
          ]
        },
        {
          id: 'lesson-d4-hpcg',
          title: 'HPCG Benchmark',
          description: 'Run HPCG for realistic workload performance validation',
          objectives: [
            'Understand HPCG vs HPL differences',
            'Interpret HPCG results',
            'Compare to reference values'
          ],
          estimatedMinutes: 20,
          commands: ['hpcg'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d4-memory-bandwidth'],
          steps: [
            {
              id: 'step-d4-6-intro',
              type: 'concept',
              title: 'HPCG Overview',
              content: `**HPCG (High Performance Conjugate Gradient)** is a complement to HPL that tests more realistic workload patterns.

**HPL vs HPCG:**
| Aspect | HPL | HPCG |
|--------|-----|------|
| Memory Pattern | Regular | Irregular |
| Data Reuse | High | Low |
| Bottleneck | Compute | Memory BW |
| Real-world | Less realistic | More realistic |

**Why HPCG Matters:**
- Better represents actual scientific workloads
- Stresses memory subsystem
- Shows impact of memory bandwidth limitations
- Part of TOP500 evaluation

**DGX A100 Reference:**
- Single node: ~40-50 TFLOPS (much lower than HPL)
- This is expected due to memory bandwidth limits`,
              tips: [
                'Low HPCG vs HPL ratio is normal',
                'HPCG is memory-bandwidth limited'
              ]
            },
            {
              id: 'step-d4-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of HPCG.',
              quizQuestion: 'Why is HPCG performance typically much lower than HPL?',
              quizChoices: [
                'HPCG uses less GPU cores',
                'HPCG is memory-bandwidth limited with irregular access patterns',
                'HPCG only uses one GPU',
                'HPCG disables tensor cores'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'HPCG has irregular memory access patterns and low data reuse, making it memory-bandwidth limited rather than compute-limited like HPL. This better reflects real scientific workloads.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 185
};

/**
 * Domain 5: Troubleshooting (12% of exam)
 */
const DOMAIN5_PATH: LearningPath = {
  id: 'path-domain5',
  domainId: 'domain5',
  title: 'Troubleshooting Mastery',
  description: 'Diagnose and resolve XID errors, thermal issues, NVLink failures, and performance problems',
  examWeight: 12,
  skills: [
    'XID error interpretation',
    'Thermal troubleshooting',
    'NVLink diagnostics',
    'Performance analysis',
    'Log analysis',
    'InfiniBand troubleshooting'
  ],
  modules: [
    {
      id: 'mod-d5-xid',
      title: 'XID Errors',
      description: 'Understanding and resolving NVIDIA XID errors',
      icon: '⚠️',
      order: 1,
      lessons: [
        {
          id: 'lesson-d5-xid-basics',
          title: 'XID Error Fundamentals',
          description: 'Learn to interpret and respond to XID errors',
          objectives: [
            'Understand XID error categories',
            'Find XID errors in system logs',
            'Determine severity and response'
          ],
          estimatedMinutes: 35,
          commands: ['dmesg', 'nvidia-smi'],
          difficulty: 'advanced',
          steps: [
            {
              id: 'step-d5-1-intro',
              type: 'concept',
              title: 'What are XID Errors?',
              content: `**XID errors** are NVIDIA GPU error codes logged by the driver when GPU problems occur.

**Where to Find XID Errors:**
- System logs: dmesg, /var/log/messages, journalctl
- nvidia-smi output (during active errors)

**Common XID Categories:**

| XID | Description | Severity |
|-----|-------------|----------|
| 13 | Graphics Engine Exception | SW/Driver |
| 31 | GPU memory page fault | SW/Application |
| 32 | Invalid/corrupted push buffer | SW/Driver |
| 43 | GPU stopped processing | Critical |
| 45 | Preemptive cleanup | Transient |
| 48 | Double Bit ECC Error | Hardware |
| 63 | ECC page retirement | Hardware |
| 64 | ECC page retirement (DBE) | Hardware |
| 74 | NVLink error | NVLink |
| 79 | GPU fallen off bus | Critical |
| 94/95 | NVSwitch NVLink errors | NVLink |
| 119/120 | GSP errors | GSP firmware |`,
              tips: [
                'Document XID codes for NVIDIA support',
                'Check if errors are recurring or one-time'
              ]
            },
            {
              id: 'step-d5-1-dmesg',
              type: 'command',
              title: 'Check System Logs',
              content: 'Search system logs for NVIDIA XID errors.',
              expectedCommand: 'dmesg | grep -i "xid"',
              validationPattern: /dmesg.*grep.*(xid|nvidia)/i,
              commandHint: 'Try: dmesg | grep -i "xid"',
              successMessage: 'Look for lines containing "Xid" followed by a number.',
              tips: [
                'XID errors include timestamp and GPU ID',
                'Multiple XIDs may indicate cascading failures'
              ]
            },
            {
              id: 'step-d5-1-pending',
              type: 'command',
              title: 'Check for Pending Errors',
              content: 'Use nvidia-smi to check for active/pending GPU errors.',
              expectedCommand: 'nvidia-smi -d ECC',
              validationPattern: /nvidia-smi.*(-d\s+ECC|--display.*ECC)/i,
              commandHint: 'Try: nvidia-smi -d ECC',
              successMessage: 'Shows ECC error counts - volatile (since boot) and aggregate (lifetime).',
              tips: [
                'High ECC error counts may indicate failing memory',
                'Some ECC errors are normal and auto-corrected'
              ]
            },
            {
              id: 'step-d5-1-common',
              type: 'concept',
              title: 'Common XID Scenarios',
              content: `**XID 79 - GPU Fallen Off Bus:**
- GPU no longer responds on PCIe
- Requires reset or reboot
- If recurring, likely hardware failure

**XID 48/63/64 - ECC Errors:**
- Memory errors detected
- Single-bit errors are corrected (warnings)
- Double-bit errors are uncorrectable (critical)
- Page retirement may occur automatically

**XID 74/94/95 - NVLink Errors:**
- Communication issues between GPUs
- Check Fabric Manager status
- May indicate cable or NVSwitch issues

**Troubleshooting Steps:**
1. Note the exact XID code and timestamp
2. Check which GPU(s) affected
3. Review recent workload changes
4. Check temperatures and power
5. Run DCGM diagnostics
6. Collect logs for support if recurring`,
              tips: [
                'Always document errors before clearing/rebooting',
                'Use nvidia-bug-report.sh for support cases'
              ]
            },
            {
              id: 'step-d5-1-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of XID errors.',
              quizQuestion: 'Which XID error typically indicates a fallen-off-the-bus GPU requiring reset?',
              quizChoices: ['XID 13', 'XID 31', 'XID 79', 'XID 94'],
              quizCorrectIndex: 2,
              quizExplanation: 'XID 79 (GPU has fallen off the bus) indicates the GPU is no longer responding on PCIe. This requires at minimum a GPU reset, often a reboot, and may indicate hardware failure if recurring.'
            }
          ]
        },
        {
          id: 'lesson-d5-thermal',
          title: 'Thermal Troubleshooting',
          description: 'Diagnose and resolve GPU thermal issues',
          objectives: [
            'Monitor GPU temperatures',
            'Understand throttling behavior',
            'Identify cooling issues'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'ipmitool'],
          difficulty: 'intermediate',
          prerequisites: ['lesson-d5-xid-basics'],
          steps: [
            {
              id: 'step-d5-2-intro',
              type: 'concept',
              title: 'GPU Thermal Management',
              content: `GPUs have thermal limits to prevent damage. On A100:

**Temperature Thresholds:**
| Range | Status |
|-------|--------|
| 40-75°C | Normal operation |
| 75-83°C | Warm warning |
| 83°C+ | Throttling begins |
| 90°C+ | Critical (shutdown risk) |

**Throttling Types:**
- **Power Throttling**: Reduces power limit
- **Thermal Throttling**: Reduces clock speeds
- **Hardware Slowdown**: Emergency protection

**DGX Cooling:**
- DGX A100/H100 use liquid cooling
- Coolant temperature affects GPU temps
- Ambient temperature should be controlled

**Common Causes of Overheating:**
- Blocked airflow/coolant flow
- Failed cooling components
- Excessive ambient temperature
- Thermal paste degradation`,
              tips: [
                'Sustained high temps shorten GPU lifespan',
                'Check ambient temps and airflow'
              ]
            },
            {
              id: 'step-d5-2-temp',
              type: 'command',
              title: 'Monitor Temperatures',
              content: 'Check current GPU temperatures and throttle status.',
              expectedCommand: 'nvidia-smi -d TEMPERATURE',
              validationPattern: /nvidia-smi.*(-d\s+TEMPERATURE|--display=TEMPERATURE)/i,
              commandHint: 'Try: nvidia-smi -d TEMPERATURE',
              successMessage: 'Shows current, slowdown, and shutdown temperature thresholds.',
              tips: [
                'GPU Temp vs Memory Temp may differ',
                'Slowdown threshold triggers throttling'
              ]
            },
            {
              id: 'step-d5-2-throttle',
              type: 'command',
              title: 'Check Throttle Reasons',
              content: 'Query current throttle reasons for each GPU.',
              expectedCommand: 'nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv',
              validationPattern: /nvidia-smi.*clocks_throttle_reasons/,
              commandHint: 'Try: nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv',
              successMessage: 'Shows what (if anything) is causing clock throttling.',
              tips: [
                'Empty means no throttling',
                'Multiple reasons can be active simultaneously'
              ]
            },
            {
              id: 'step-d5-2-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of thermal management.',
              quizQuestion: 'At what temperature does an A100 typically begin thermal throttling?',
              quizChoices: ['65°C', '75°C', '83°C', '90°C'],
              quizCorrectIndex: 2,
              quizExplanation: '83°C is the typical thermal slowdown threshold for A100 GPUs. Above this, the GPU reduces clock speeds to prevent overheating. 90°C+ risks emergency shutdown.'
            }
          ]
        },
        {
          id: 'lesson-d5-nvlink-debug',
          title: 'NVLink Troubleshooting',
          description: 'Diagnose and resolve NVLink connectivity issues',
          objectives: [
            'Check NVLink status and errors',
            'Identify failing links',
            'Understand error counters'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi nvlink', 'dcgmi'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-thermal'],
          steps: [
            {
              id: 'step-d5-3-intro',
              type: 'concept',
              title: 'NVLink Troubleshooting Overview',
              content: `**NVLink Issues Can Cause:**
- Multi-GPU workload failures
- Degraded NCCL performance
- XID 74, 94, 95 errors
- Training job failures

**What to Check:**
1. Link status (active/inactive)
2. Error counters
3. Fabric Manager status
4. NVSwitch health

**Common Problems:**
- Inactive links (hardware failure)
- CRC errors (cable issues)
- Recovery errors (intermittent issues)
- Fabric Manager not running`,
              tips: [
                'NVLink issues often manifest as NCCL errors',
                'Check Fabric Manager first for multi-GPU issues'
              ]
            },
            {
              id: 'step-d5-3-status',
              type: 'command',
              title: 'Check NVLink Status',
              content: 'View status of all NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -s',
              validationPattern: /nvidia-smi\s+nvlink\s+(-s|--status)/,
              commandHint: 'Try: nvidia-smi nvlink -s',
              successMessage: 'Shows link status for each GPU. All should be active.',
              tips: [
                'Inactive links indicate hardware problems',
                'Check error counters for active but problematic links'
              ]
            },
            {
              id: 'step-d5-3-errors',
              type: 'command',
              title: 'Check NVLink Errors',
              content: 'View error counters for NVLink connections.',
              expectedCommand: 'nvidia-smi nvlink -e',
              validationPattern: /nvidia-smi\s+nvlink\s+(-e|--error)/,
              commandHint: 'Try: nvidia-smi nvlink -e',
              successMessage: 'Shows error counts. Non-zero values indicate issues.',
              tips: [
                'CRC errors may indicate cable problems',
                'Recovery errors indicate intermittent issues'
              ]
            },
            {
              id: 'step-d5-3-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of NVLink troubleshooting.',
              quizQuestion: 'What XID error codes are associated with NVLink problems?',
              quizChoices: [
                'XID 13, 31, 32',
                'XID 48, 63, 64',
                'XID 74, 94, 95',
                'XID 79, 119, 120'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'XID 74, 94, and 95 are NVLink-related errors. XID 74 is a general NVLink error, while XID 94 and 95 are specifically NVSwitch-related NVLink errors.'
            }
          ]
        }
      ]
    },
    {
      id: 'mod-d5-performance',
      title: 'Performance Troubleshooting',
      description: 'Diagnosing and resolving performance issues',
      icon: '📉',
      order: 2,
      prerequisites: ['mod-d5-xid'],
      lessons: [
        {
          id: 'lesson-d5-perf-analysis',
          title: 'Performance Analysis',
          description: 'Identify and diagnose GPU performance issues',
          objectives: [
            'Identify performance bottlenecks',
            'Check utilization metrics',
            'Understand common causes'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'dcgmi'],
          difficulty: 'intermediate',
          steps: [
            {
              id: 'step-d5-4-intro',
              type: 'concept',
              title: 'Performance Analysis Overview',
              content: `**Common Performance Issues:**

| Symptom | Possible Causes |
|---------|-----------------|
| Low GPU utilization | CPU bottleneck, data loading |
| Low memory bandwidth | Memory-bound code, ECC overhead |
| Throttled clocks | Thermal, power limits |
| Poor multi-GPU scaling | NVLink issues, NCCL config |
| High latency | PCIe bottleneck, driver issues |

**Key Metrics to Monitor:**
- GPU Utilization (SM activity)
- Memory Utilization
- Memory Bandwidth
- PCIe Throughput
- NVLink Throughput
- Clock Frequencies
- Power Consumption

**Tools for Analysis:**
- nvidia-smi (basic monitoring)
- dcgmi dmon (detailed metrics)
- Nsight Systems (profiling)
- NCCL debug logging`,
              tips: [
                'Low GPU utilization is often a CPU/data bottleneck',
                'Check both SM and memory utilization'
              ]
            },
            {
              id: 'step-d5-4-dmon',
              type: 'command',
              title: 'DCGM Monitoring',
              content: 'Use DCGM for detailed GPU monitoring.',
              expectedCommand: 'dcgmi dmon -e 100,101,140,150,155',
              validationPattern: /dcgmi\s+dmon/,
              commandHint: 'Try: dcgmi dmon -e 100,101,140,150,155',
              successMessage: 'Shows GPU utilization, memory utilization, and power.',
              tips: [
                'Field IDs: 100=GPU util, 101=mem util',
                '140=power, 150=SM clock, 155=mem clock'
              ]
            },
            {
              id: 'step-d5-4-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of performance analysis.',
              quizQuestion: 'If GPU utilization is low but the job is slow, what is the most likely cause?',
              quizChoices: [
                'GPU overheating',
                'ECC errors',
                'CPU or data loading bottleneck',
                'NVLink failure'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'Low GPU utilization with slow performance typically indicates the GPU is waiting for data. This is usually caused by CPU processing bottleneck, slow storage I/O, or inefficient data loading in the application.'
            }
          ]
        },
        {
          id: 'lesson-d5-infiniband',
          title: 'InfiniBand Troubleshooting',
          description: 'Diagnose InfiniBand networking issues on DGX',
          objectives: [
            'Check IB link status',
            'Identify port errors',
            'Verify connectivity'
          ],
          estimatedMinutes: 20,
          commands: ['ibstat', 'ibstatus', 'ibnetdiscover'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-perf-analysis'],
          steps: [
            {
              id: 'step-d5-5-intro',
              type: 'concept',
              title: 'InfiniBand on DGX',
              content: `**DGX InfiniBand Configuration:**
- DGX A100: 8x HDR (200 Gb/s) ports
- DGX H100: 8x NDR (400 Gb/s) ports

**Common IB Issues:**
- Link down (cable, port failure)
- Link errors (signal quality)
- Subnet manager issues
- RDMA failures

**Key Commands:**
| Command | Purpose |
|---------|---------|
| ibstat | Show HCA status |
| ibstatus | Port status summary |
| ibnetdiscover | Discover fabric topology |
| perfquery | Performance counters |
| ibdiagnet | Full diagnostics |`,
              tips: [
                'Each GPU has an associated IB port',
                'Check both link state and physical state'
              ]
            },
            {
              id: 'step-d5-5-ibstat',
              type: 'command',
              title: 'Check IB Status',
              content: 'View InfiniBand HCA status.',
              expectedCommand: 'ibstat',
              commandHint: 'Type: ibstat',
              successMessage: 'Shows all IB ports with their state and link speed.',
              tips: [
                'State should be "Active"',
                'Physical state should be "LinkUp"'
              ]
            },
            {
              id: 'step-d5-5-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of InfiniBand.',
              quizQuestion: 'What is the per-port bandwidth of HDR InfiniBand on DGX A100?',
              quizChoices: ['100 Gb/s', '200 Gb/s', '400 Gb/s', '800 Gb/s'],
              quizCorrectIndex: 1,
              quizExplanation: 'DGX A100 uses HDR (High Data Rate) InfiniBand with 200 Gb/s per port. DGX H100 upgrades to NDR (Next Data Rate) at 400 Gb/s per port.'
            }
          ]
        },
        {
          id: 'lesson-d5-log-analysis',
          title: 'Advanced Log Analysis',
          description: 'Master techniques for analyzing system and GPU logs',
          objectives: [
            'Navigate Linux log files',
            'Use journalctl effectively',
            'Collect NVIDIA bug reports',
            'Analyze MCE and hardware logs'
          ],
          estimatedMinutes: 30,
          commands: ['journalctl', 'dmesg', 'nvidia-bug-report.sh'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-infiniband'],
          steps: [
            {
              id: 'step-d5-6-intro',
              type: 'concept',
              title: 'DGX Log Locations',
              content: `**Key Log Files on DGX:**

| Location | Contents |
|----------|----------|
| /var/log/syslog | General system messages |
| /var/log/messages | System-wide messages |
| /var/log/kern.log | Kernel messages |
| /var/log/dmesg | Boot-time kernel ring buffer |
| journalctl | Systemd journal (primary) |

**NVIDIA-Specific Logs:**
| Source | How to Access |
|--------|---------------|
| GPU driver messages | dmesg | grep -i nvidia |
| XID errors | dmesg | grep -i xid |
| Fabric Manager | journalctl -u nvidia-fabricmanager |
| DCGM | journalctl -u nvidia-dcgm |

**Log Priority Levels:**
| Level | Meaning |
|-------|---------|
| emerg | System is unusable |
| alert | Action must be taken immediately |
| crit | Critical conditions |
| err | Error conditions |
| warning | Warning conditions |
| notice | Normal but significant |
| info | Informational |
| debug | Debug-level messages |`,
              tips: [
                'Use journalctl -p err for errors only',
                'Add -f flag for real-time following'
              ]
            },
            {
              id: 'step-d5-6-journal-boot',
              type: 'command',
              title: 'View Boot Logs',
              content: 'Check messages from the current boot for initialization issues.',
              expectedCommand: 'journalctl -b',
              validationPattern: /journalctl\s+(-b|--boot)/,
              commandHint: 'Try: journalctl -b',
              successMessage: 'Shows all log messages from the current boot.',
              tips: [
                'Use -b -1 for previous boot',
                'Helpful for tracking down boot failures'
              ]
            },
            {
              id: 'step-d5-6-journal-unit',
              type: 'command',
              title: 'View Service Logs',
              content: 'Check logs for a specific systemd service.',
              expectedCommand: 'journalctl -u nvidia-fabricmanager',
              validationPattern: /journalctl\s+(-u|--unit)/,
              commandHint: 'Try: journalctl -u nvidia-fabricmanager',
              successMessage: 'Shows logs for the Fabric Manager service.',
              tips: [
                'Useful for debugging service startup issues',
                'Add --since "1 hour ago" to filter by time'
              ]
            },
            {
              id: 'step-d5-6-nvidia-bug',
              type: 'concept',
              title: 'NVIDIA Bug Report',
              content: `**nvidia-bug-report.sh** collects comprehensive diagnostic information:

**What It Collects:**
- nvidia-smi output
- Driver version and module info
- Kernel logs related to NVIDIA
- System configuration
- GPU state and health
- NVLink status and errors

**Usage:**
\`\`\`bash
sudo nvidia-bug-report.sh
\`\`\`

**Output:**
- Creates nvidia-bug-report.log.gz
- Contains all diagnostic data
- Required for NVIDIA support cases

**When to Run:**
- Before and after reproducing issues
- After hardware failures
- For support ticket submission`,
              tips: [
                'Run immediately after an issue occurs',
                'Include both pre-issue and post-issue reports'
              ]
            },
            {
              id: 'step-d5-6-mce',
              type: 'concept',
              title: 'MCE (Machine Check Exception) Logs',
              content: `**MCE** reports hardware errors detected by the CPU:

**Common MCE Sources:**
- CPU cache errors
- Memory ECC failures
- PCIe bus errors
- Thermal events

**Checking MCE:**
\`\`\`bash
# Check for MCE messages
dmesg | grep -i mce

# View MCE log
mcelog --client
\`\`\`

**MCE Severity:**
| Type | Meaning |
|------|---------|
| Corrected | Hardware corrected, logged for tracking |
| Uncorrected | Data corruption possible |
| Fatal | System halt/panic |

**Action on MCE:**
1. Document the full MCE message
2. Check for patterns (same core/DIMM)
3. Run hardware diagnostics
4. Consider preventive replacement`,
              tips: [
                'Frequent corrected errors may predict failure',
                'Same core/bank repeatedly indicates failing component'
              ]
            },
            {
              id: 'step-d5-6-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of log analysis.',
              quizQuestion: 'What tool should you use to collect diagnostic information for NVIDIA support?',
              quizChoices: [
                'nvidia-smi --debug',
                'dmesg --nvidia',
                'nvidia-bug-report.sh',
                'journalctl --nvidia'
              ],
              quizCorrectIndex: 2,
              quizExplanation: 'nvidia-bug-report.sh is the official NVIDIA diagnostic collection script. It gathers all relevant logs, configuration, and state information needed for support cases.'
            }
          ]
        },
        {
          id: 'lesson-d5-recovery',
          title: 'GPU Recovery Procedures',
          description: 'Learn to recover from GPU failures and errors',
          objectives: [
            'Reset GPUs without rebooting',
            'Clear persistent errors',
            'Recover from fallen-off-bus conditions'
          ],
          estimatedMinutes: 25,
          commands: ['nvidia-smi', 'systemctl'],
          difficulty: 'advanced',
          prerequisites: ['lesson-d5-log-analysis'],
          steps: [
            {
              id: 'step-d5-7-intro',
              type: 'concept',
              title: 'GPU Recovery Overview',
              content: `**When GPU Recovery is Needed:**
- XID errors indicating GPU hang
- GPU fallen off the bus (XID 79)
- Persistent ECC errors
- Training job failures

**Recovery Methods (least to most disruptive):**

1. **Application-level reset**: Kill the process using the GPU
2. **GPU reset**: nvidia-smi -r (if supported)
3. **Driver reload**: Unload and reload nvidia modules
4. **System reboot**: Full restart

**Important Considerations:**
- Always collect logs before recovery
- Some errors require full reboot
- Hardware failures need RMA, not just reset
- Check for patterns before recovery`,
              tips: [
                'Document errors before attempting recovery',
                'Some GPUs don\'t support runtime reset'
              ]
            },
            {
              id: 'step-d5-7-check-processes',
              type: 'command',
              title: 'Check GPU Processes',
              content: 'Before reset, check what processes are using GPUs.',
              expectedCommand: 'nvidia-smi pmon -c 1',
              validationPattern: /nvidia-smi\s+pmon/,
              commandHint: 'Try: nvidia-smi pmon -c 1',
              successMessage: 'Shows processes running on each GPU.',
              tips: [
                'Processes must be terminated before GPU reset',
                'Use lsof or fuser to find all GPU file handles'
              ]
            },
            {
              id: 'step-d5-7-drain-slurm',
              type: 'concept',
              title: 'Graceful Node Drain',
              content: `**Before GPU Recovery on Slurm Nodes:**

1. **Drain the node** (prevent new jobs):
\`\`\`bash
scontrol update nodename=dgx-01 state=drain reason="GPU recovery"
\`\`\`

2. **Wait for running jobs** to complete (or cancel them):
\`\`\`bash
squeue -w dgx-01
scancel <jobid>  # if needed
\`\`\`

3. **Perform recovery**

4. **Return node to service**:
\`\`\`bash
scontrol update nodename=dgx-01 state=resume
\`\`\`

**Best Practices:**
- Always drain before maintenance
- Communicate with users if canceling jobs
- Run diagnostics before resuming`,
              tips: [
                'Draining allows jobs to finish gracefully',
                'Use scontrol show node to verify state'
              ]
            },
            {
              id: 'step-d5-7-driver-reload',
              type: 'concept',
              title: 'Driver Reload Procedure',
              content: `**Full Driver Reload (when GPU reset isn't enough):**

**Steps:**
\`\`\`bash
# 1. Stop services using NVIDIA
sudo systemctl stop nvidia-fabricmanager
sudo systemctl stop nvidia-dcgm

# 2. Kill remaining GPU processes
sudo fuser -k /dev/nvidia*

# 3. Unload modules (in order)
sudo rmmod nvidia_uvm
sudo rmmod nvidia_drm
sudo rmmod nvidia_modeset
sudo rmmod nvidia

# 4. Reload modules
sudo modprobe nvidia
sudo modprobe nvidia_uvm

# 5. Restart services
sudo systemctl start nvidia-fabricmanager
sudo systemctl start nvidia-dcgm

# 6. Verify
nvidia-smi
\`\`\`

**Note:** This is disruptive! Prefer reboot if driver won't unload.`,
              tips: [
                'Modules may refuse to unload if in use',
                'Persistence daemon prevents module unload'
              ]
            },
            {
              id: 'step-d5-7-quiz',
              type: 'quiz',
              title: 'Knowledge Check',
              content: 'Test your understanding of GPU recovery.',
              quizQuestion: 'What should you do FIRST when a GPU shows XID 79 (fallen off bus)?',
              quizChoices: [
                'Immediately reboot the system',
                'Collect nvidia-bug-report.sh and document the error',
                'Replace the GPU',
                'Clear the error with nvidia-smi'
              ],
              quizCorrectIndex: 1,
              quizExplanation: 'Before any recovery action, you should collect diagnostic information using nvidia-bug-report.sh. This preserves the error state for analysis and support. Then document timestamps and circumstances before attempting recovery.'
            }
          ]
        }
      ]
    }
  ],
  totalEstimatedMinutes: 205
};

// ============================================================================
// ALL LEARNING PATHS
// ============================================================================

export const LEARNING_PATHS: Record<DomainId, LearningPath> = {
  domain1: DOMAIN1_PATH,
  domain2: DOMAIN2_PATH,
  domain3: DOMAIN3_PATH,
  domain4: DOMAIN4_PATH,
  domain5: DOMAIN5_PATH,
};

export const ALL_PATHS = Object.values(LEARNING_PATHS);

// ============================================================================
// PATH ENGINE FUNCTIONS
// ============================================================================

/**
 * Get a specific learning path by domain ID
 */
export function getLearningPath(domainId: DomainId): LearningPath {
  return LEARNING_PATHS[domainId];
}

/**
 * Get all learning paths sorted by exam weight (highest first)
 */
export function getPathsByWeight(): LearningPath[] {
  return ALL_PATHS.sort((a, b) => b.examWeight - a.examWeight);
}

/**
 * Get a specific lesson by its ID
 */
export function getLessonById(lessonId: string): { lesson: Lesson; module: Module; path: LearningPath } | null {
  for (const path of ALL_PATHS) {
    for (const module of path.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) {
        return { lesson, module, path };
      }
    }
  }
  return null;
}

/**
 * Get a specific module by its ID
 */
export function getModuleById(moduleId: string): { module: Module; path: LearningPath } | null {
  for (const path of ALL_PATHS) {
    const module = path.modules.find(m => m.id === moduleId);
    if (module) {
      return { module, path };
    }
  }
  return null;
}

/**
 * Check if a lesson's prerequisites are met
 */
export function areLessonPrerequisitesMet(
  lessonId: string,
  completedLessonIds: Set<string>
): boolean {
  const result = getLessonById(lessonId);
  if (!result) return false;

  const { lesson } = result;
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }

  return lesson.prerequisites.every(prereq => completedLessonIds.has(prereq));
}

/**
 * Check if a module's prerequisites are met
 */
export function areModulePrerequisitesMet(
  moduleId: string,
  completedModuleIds: Set<string>
): boolean {
  const result = getModuleById(moduleId);
  if (!result) return false;

  const { module } = result;
  if (!module.prerequisites || module.prerequisites.length === 0) {
    return true;
  }

  return module.prerequisites.every(prereq => completedModuleIds.has(prereq));
}

/**
 * Get the next recommended lesson for a user
 */
export function getNextLesson(
  completedLessonIds: Set<string>,
  completedModuleIds: Set<string>,
  preferredDomain?: DomainId
): { lesson: Lesson; module: Module; path: LearningPath } | null {
  const paths = preferredDomain
    ? [LEARNING_PATHS[preferredDomain]]
    : getPathsByWeight();

  for (const path of paths) {
    for (const module of path.modules) {
      // Check module prerequisites
      if (!areModulePrerequisitesMet(module.id, completedModuleIds)) {
        continue;
      }

      for (const lesson of module.lessons) {
        // Skip completed lessons
        if (completedLessonIds.has(lesson.id)) {
          continue;
        }

        // Check lesson prerequisites
        if (areLessonPrerequisitesMet(lesson.id, completedLessonIds)) {
          return { lesson, module, path };
        }
      }
    }
  }

  return null;
}

/**
 * Calculate progress for a learning path
 */
export function calculatePathProgress(
  pathId: string,
  completedLessonIds: Set<string>
): PathProgress {
  const path = ALL_PATHS.find(p => p.id === pathId);
  if (!path) {
    return {
      pathId,
      modulesCompleted: 0,
      modulesTotal: 0,
      totalLessons: 0,
      completedLessons: 0,
      overallPercentage: 0,
      totalTimeSpentSeconds: 0,
    };
  }

  let totalLessons = 0;
  let completedLessons = 0;
  let modulesCompleted = 0;

  for (const module of path.modules) {
    let moduleComplete = true;
    for (const lesson of module.lessons) {
      totalLessons++;
      if (completedLessonIds.has(lesson.id)) {
        completedLessons++;
      } else {
        moduleComplete = false;
      }
    }
    if (moduleComplete && module.lessons.length > 0) {
      modulesCompleted++;
    }
  }

  return {
    pathId,
    modulesCompleted,
    modulesTotal: path.modules.length,
    totalLessons,
    completedLessons,
    overallPercentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    totalTimeSpentSeconds: 0, // Will be populated from store
  };
}

/**
 * Validate a command against expected pattern
 */
export function validateCommand(
  userCommand: string,
  step: TutorialStep
): { valid: boolean; message: string } {
  if (step.type !== 'command') {
    return { valid: false, message: 'This step does not expect a command.' };
  }

  const normalizedUserCmd = userCommand.trim().toLowerCase();

  // Check against validation pattern if provided
  if (step.validationPattern) {
    const regex = step.validationPattern;
    if (regex.test(userCommand)) {
      return {
        valid: true,
        message: step.successMessage || 'Correct!'
      };
    }
  }

  // Check against exact expected command
  if (step.expectedCommand) {
    const normalizedExpected = step.expectedCommand.trim().toLowerCase();
    if (normalizedUserCmd === normalizedExpected) {
      return {
        valid: true,
        message: step.successMessage || 'Correct!'
      };
    }

    // Partial match check
    if (normalizedUserCmd.includes(normalizedExpected.split(' ')[0])) {
      return {
        valid: false,
        message: step.failureMessage || `Close! The expected command is: ${step.expectedCommand}`
      };
    }
  }

  return {
    valid: false,
    message: step.failureMessage || `Try: ${step.commandHint || step.expectedCommand}`
  };
}

/**
 * Get total statistics across all paths
 */
export function getTotalPathStats(): {
  totalPaths: number;
  totalModules: number;
  totalLessons: number;
  totalSteps: number;
  totalEstimatedMinutes: number;
} {
  let totalModules = 0;
  let totalLessons = 0;
  let totalSteps = 0;
  let totalEstimatedMinutes = 0;

  for (const path of ALL_PATHS) {
    totalEstimatedMinutes += path.totalEstimatedMinutes;
    for (const module of path.modules) {
      totalModules++;
      for (const lesson of module.lessons) {
        totalLessons++;
        totalSteps += lesson.steps.length;
      }
    }
  }

  return {
    totalPaths: ALL_PATHS.length,
    totalModules,
    totalLessons,
    totalSteps,
    totalEstimatedMinutes,
  };
}

/**
 * Get domain info with learning path data
 */
export function getDomainWithPath(domainId: DomainId): DomainInfo & { path: LearningPath } {
  return {
    ...DOMAINS[domainId],
    path: LEARNING_PATHS[domainId],
  };
}

// ============================================================================
// NCP-AII EXAM QUICK REFERENCE
// ============================================================================

/**
 * Key commands to memorize for the NCP-AII exam
 */
export const EXAM_COMMAND_REFERENCE = {
  // Domain 1: Platform Bring-Up (31%)
  platformBringUp: {
    systemInfo: [
      { cmd: 'dmidecode', desc: 'System/BIOS/hardware info' },
      { cmd: 'dmidecode -t bios', desc: 'BIOS version info' },
      { cmd: 'dmidecode -t system', desc: 'System serial/model' },
      { cmd: 'dmidecode -t memory', desc: 'Memory configuration' },
    ],
    bmc: [
      { cmd: 'ipmitool sensor', desc: 'Hardware sensor readings' },
      { cmd: 'ipmitool sel list', desc: 'System Event Log' },
      { cmd: 'ipmitool power status', desc: 'Power state' },
      { cmd: 'ipmitool mc info', desc: 'BMC information' },
    ],
    drivers: [
      { cmd: 'nvidia-smi', desc: 'GPU status overview' },
      { cmd: 'nvidia-smi -L', desc: 'List all GPUs' },
      { cmd: 'lsmod | grep nvidia', desc: 'Check loaded modules' },
      { cmd: 'modinfo nvidia', desc: 'Driver version details' },
    ],
    fabricManager: [
      { cmd: 'systemctl status nvidia-fabricmanager', desc: 'FM status' },
      { cmd: 'nv-fabricmanager --version', desc: 'FM version' },
    ],
  },

  // Domain 2: Accelerator Configuration (5%)
  acceleratorConfig: {
    topology: [
      { cmd: 'nvidia-smi topo -m', desc: 'GPU topology matrix' },
      { cmd: 'nvidia-smi nvlink -s', desc: 'NVLink status' },
      { cmd: 'nvidia-smi nvlink -e', desc: 'NVLink errors' },
    ],
    mig: [
      { cmd: 'nvidia-smi mig -lgip', desc: 'List MIG profiles' },
      { cmd: 'nvidia-smi mig -lgi', desc: 'List GPU instances' },
      { cmd: 'nvidia-smi mig -lci', desc: 'List compute instances' },
    ],
    config: [
      { cmd: 'nvidia-smi -pm 1', desc: 'Enable persistence' },
      { cmd: 'nvidia-smi --query-gpu=persistence_mode --format=csv', desc: 'Check persist mode' },
    ],
  },

  // Domain 3: Base Infrastructure (19%)
  baseInfra: {
    slurm: [
      { cmd: 'sinfo', desc: 'Cluster status' },
      { cmd: 'sinfo -N -l', desc: 'Detailed node list' },
      { cmd: 'squeue', desc: 'Job queue' },
      { cmd: 'scontrol show node', desc: 'Node details' },
      { cmd: 'scontrol show job', desc: 'Job details' },
      { cmd: 'sbatch', desc: 'Submit batch job' },
      { cmd: 'srun', desc: 'Interactive job' },
    ],
    containers: [
      { cmd: 'docker run --gpus all', desc: 'Run with GPU' },
      { cmd: 'enroot import', desc: 'Import container' },
      { cmd: 'srun --container-image=', desc: 'Slurm container job' },
    ],
    storage: [
      { cmd: 'df -h', desc: 'Disk usage' },
      { cmd: 'lsblk', desc: 'Block devices' },
      { cmd: 'lfs df -h', desc: 'Lustre space' },
      { cmd: 'lfs getstripe', desc: 'File striping' },
    ],
  },

  // Domain 4: Validation & Testing (33%)
  validation: {
    dcgm: [
      { cmd: 'dcgmi discovery -l', desc: 'List GPUs' },
      { cmd: 'dcgmi health -c', desc: 'Health check' },
      { cmd: 'dcgmi diag -r 1', desc: 'Quick diagnostics' },
      { cmd: 'dcgmi diag -r 3', desc: 'Extended diagnostics' },
      { cmd: 'dcgmi dmon', desc: 'GPU monitoring' },
      { cmd: 'dcgmi group -l', desc: 'List groups' },
    ],
    nccl: [
      { cmd: './all_reduce_perf -b 8 -e 256M -f 2 -g 8', desc: 'AllReduce test' },
      { cmd: './all_gather_perf', desc: 'AllGather test' },
    ],
    benchmarks: [
      { cmd: 'gpu-burn', desc: 'GPU stress test' },
      { cmd: 'nvidia-smi -d TEMPERATURE', desc: 'Thermal monitoring' },
    ],
  },

  // Domain 5: Troubleshooting (12%)
  troubleshooting: {
    xid: [
      { cmd: 'dmesg | grep -i xid', desc: 'Find XID errors' },
      { cmd: 'nvidia-smi -d ECC', desc: 'ECC error counts' },
      { cmd: 'nvidia-bug-report.sh', desc: 'Collect diagnostics' },
    ],
    thermal: [
      { cmd: 'nvidia-smi -d TEMPERATURE', desc: 'GPU temps' },
      { cmd: 'nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv', desc: 'Throttle reasons' },
    ],
    infiniband: [
      { cmd: 'ibstat', desc: 'IB status' },
      { cmd: 'ibstatus', desc: 'Port status' },
      { cmd: 'ibnetdiscover', desc: 'Fabric topology' },
    ],
    logs: [
      { cmd: 'journalctl -b', desc: 'Boot logs' },
      { cmd: 'journalctl -u nvidia-fabricmanager', desc: 'FM logs' },
      { cmd: 'dmesg | grep -i mce', desc: 'MCE errors' },
    ],
  },
};

/**
 * XID error quick reference for exam
 */
export const XID_REFERENCE = [
  { xid: 13, desc: 'Graphics Engine Exception', category: 'SW/Driver', action: 'Check application code' },
  { xid: 31, desc: 'GPU memory page fault', category: 'SW', action: 'Application memory issue' },
  { xid: 32, desc: 'Invalid/corrupted push buffer', category: 'SW/Driver', action: 'Driver issue' },
  { xid: 43, desc: 'GPU stopped processing', category: 'Critical', action: 'GPU hang, may need reset' },
  { xid: 45, desc: 'Preemptive cleanup', category: 'Transient', action: 'Usually recoverable' },
  { xid: 48, desc: 'Double Bit ECC Error', category: 'Hardware', action: 'Memory failure, RMA' },
  { xid: 63, desc: 'ECC page retirement', category: 'Hardware', action: 'Monitor for pattern' },
  { xid: 64, desc: 'ECC page retirement (DBE)', category: 'Hardware', action: 'Memory issue' },
  { xid: 74, desc: 'NVLink error', category: 'NVLink', action: 'Check cables/NVSwitch' },
  { xid: 79, desc: 'GPU fallen off bus', category: 'Critical', action: 'Reboot required' },
  { xid: 94, desc: 'NVSwitch NVLink error', category: 'NVLink', action: 'Check Fabric Manager' },
  { xid: 95, desc: 'NVSwitch NVLink error', category: 'NVLink', action: 'Check Fabric Manager' },
  { xid: 119, desc: 'GSP error', category: 'GSP', action: 'Firmware issue' },
  { xid: 120, desc: 'GSP error', category: 'GSP', action: 'Firmware issue' },
];

/**
 * DGX A100 specifications for exam
 */
export const DGX_A100_SPECS = {
  gpus: {
    count: 8,
    model: 'A100-SXM4-80GB',
    memoryPerGPU: '80 GB HBM2e',
    totalGPUMemory: '640 GB',
    peakFP64: '19.5 TFLOPS per GPU',
    peakFP16: '312 TFLOPS per GPU (with TF32)',
    tensorCores: 432,
  },
  nvlink: {
    version: 'NVLink 3.0',
    linksPerGPU: 12,
    bandwidthPerLink: '50 GB/s bidirectional',
    totalBandwidthPerGPU: '600 GB/s',
    nvSwitchCount: 6,
  },
  cpus: {
    model: 'AMD EPYC 7742',
    count: 2,
    coresTotal: 128,
    threadsTotal: 256,
  },
  memory: {
    systemRAM: '1 TB or 2 TB',
    type: 'DDR4-3200',
  },
  networking: {
    infiniband: '8x HDR (200 Gb/s each)',
    ethernet: '2x 100 GbE',
  },
  storage: {
    osNVMe: '2x 1.92 TB',
    dataNVMe: 'Up to 8x 3.84 TB',
  },
  power: {
    maxSystem: '6.5 kW',
    gpuTDP: '400W per GPU',
  },
  thermals: {
    normalRange: '40-75°C',
    throttleStart: '83°C',
    shutdown: '90°C+',
  },
};

/**
 * Get study tips based on domain weight
 */
export function getStudyPriorities(): Array<{
  domain: string;
  weight: number;
  priority: 'High' | 'Medium' | 'Low';
  focusAreas: string[];
}> {
  return [
    {
      domain: 'Domain 4: Validation & Testing',
      weight: 33,
      priority: 'High',
      focusAreas: [
        'DCGM commands and diagnostic levels',
        'NCCL testing and interpretation',
        'Health monitoring procedures',
        'Performance benchmarking',
      ],
    },
    {
      domain: 'Domain 1: Platform Bring-Up',
      weight: 31,
      priority: 'High',
      focusAreas: [
        'dmidecode and system information',
        'IPMI/BMC management',
        'Driver verification',
        'Fabric Manager status',
      ],
    },
    {
      domain: 'Domain 3: Base Infrastructure',
      weight: 19,
      priority: 'Medium',
      focusAreas: [
        'Slurm job submission and management',
        'Container runtimes (NGC, Enroot)',
        'Storage configuration',
        'GRES for GPU allocation',
      ],
    },
    {
      domain: 'Domain 5: Troubleshooting',
      weight: 12,
      priority: 'Medium',
      focusAreas: [
        'XID error interpretation',
        'Thermal management',
        'NVLink diagnostics',
        'Log analysis techniques',
      ],
    },
    {
      domain: 'Domain 2: Accelerator Configuration',
      weight: 5,
      priority: 'Low',
      focusAreas: [
        'MIG configuration basics',
        'NVLink topology',
        'Persistence mode',
        'Power management',
      ],
    },
  ];
}
