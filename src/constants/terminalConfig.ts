/**
 * Terminal Theme Configuration
 * NVIDIA-themed color scheme for XTerm
 */
export const TERMINAL_THEME = {
  background: "#000000",
  foreground: "#00ff00",
  cursor: "#76B900",
  black: "#000000",
  red: "#ff5555",
  green: "#50fa7b",
  yellow: "#f1fa8c",
  blue: "#bd93f9",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#bfbfbf",
  brightBlack: "#4d4d4d",
  brightRed: "#ff6e67",
  brightGreen: "#5af78e",
  brightYellow: "#f4f99d",
  brightBlue: "#caa9fa",
  brightMagenta: "#ff92d0",
  brightCyan: "#9aedfe",
  brightWhite: "#e6e6e6",
};

/**
 * Terminal Options Configuration
 * XTerm initialization options
 */
export const TERMINAL_OPTIONS = {
  cursorBlink: true,
  fontSize: 14,
  fontFamily: "monospace",
  fontWeight: "normal",
  fontWeightBold: "bold",
  letterSpacing: 0,
  lineHeight: 1.0,
  allowTransparency: false,
  theme: TERMINAL_THEME,
  // cols and rows are not set - FitAddon will calculate dynamically
  scrollback: 5000,
  convertEol: true,
  cursorStyle: "block",
  windowsMode: false,
} as const;

/**
 * Command List - shared between welcome message and help command
 * Centralized command documentation
 */
const COMMAND_LIST = [
  "  \x1b[36mnvidia-smi\x1b[0m      - GPU management and monitoring",
  "  \x1b[36mdcgmi\x1b[0m           - Data Center GPU Manager",
  "  \x1b[36mnvsm\x1b[0m            - NVIDIA System Management",
  "  \x1b[36mipmitool\x1b[0m        - BMC management",
  "  \x1b[36mibstat\x1b[0m          - InfiniBand status",
  "  \x1b[36msinfo\x1b[0m, \x1b[36msqueue\x1b[0m, \x1b[36mscontrol\x1b[0m - Slurm workload manager",
  "  \x1b[36msbatch\x1b[0m, \x1b[36msrun\x1b[0m, \x1b[36mscancel\x1b[0m - Slurm job management",
  "  \x1b[36mdocker\x1b[0m          - Container management",
  "  \x1b[36mngc\x1b[0m             - NGC CLI",
  "  \x1b[36menroot\x1b[0m          - Enroot container tool",
  "  \x1b[36mmst\x1b[0m             - Mellanox Software Tools",
  "  \x1b[36mmlxconfig\x1b[0m       - BlueField/ConnectX configuration",
  "  \x1b[36mmlxlink\x1b[0m         - Link diagnostics",
  "  \x1b[36mmlxcables\x1b[0m       - Cable information",
  "  \x1b[36mmlxup\x1b[0m           - Firmware updates",
  "  \x1b[36mbcm\x1b[0m, \x1b[36mbcm-node\x1b[0m   - Base Command Manager",
  "  \x1b[36mcrm\x1b[0m             - Pacemaker cluster status",
  "  \x1b[36mlscpu\x1b[0m           - Display CPU information",
  "  \x1b[36mfree\x1b[0m            - Display memory information",
  "  \x1b[36mlspci\x1b[0m           - List PCI devices",
  "  \x1b[36mdmidecode\x1b[0m       - DMI table decoder (BIOS/hardware info)",
  "  \x1b[36mdmesg\x1b[0m           - Kernel ring buffer messages",
  "  \x1b[36mjournalctl\x1b[0m      - System journal logs",
  "  \x1b[36mdf\x1b[0m              - Disk space usage",
  "  \x1b[36mmount\x1b[0m           - Show mounted filesystems",
  "  \x1b[36mlfs\x1b[0m             - Lustre filesystem utilities",
  "  \x1b[36mhpl\x1b[0m             - High-Performance Linpack benchmark",
  "  \x1b[36mnccl-test\x1b[0m       - NCCL collective communication tests",
  "  \x1b[36mgpu-burn\x1b[0m        - GPU stress testing",
  "",
  "\x1b[1mLearning Tools:\x1b[0m",
  "  \x1b[36mhelp [command]\x1b[0m  - Show all commands or detailed help for a specific command",
  "  \x1b[36mhint\x1b[0m            - Get a hint for the current lab step",
  "  \x1b[36mclear\x1b[0m           - Clear terminal",
].join("\n");

/**
 * Welcome Message
 * Displayed when terminal initializes
 */
export const WELCOME_MESSAGE = `\x1b[1;32m╔════════════════════════════════════════════════╗
║  NVIDIA AI Infrastructure Certification        ║
║  Simulator - NCP-AII Training v1.0             ║
╚════════════════════════════════════════════════╝\x1b[0m

  Simulated DGX cluster for \x1b[1mNCP-AII\x1b[0m exam prep.

\x1b[1;33mGet started:\x1b[0m
  \x1b[36mnvidia-smi\x1b[0m      Check GPU status
  \x1b[36mibstat\x1b[0m          InfiniBand adapter status
  \x1b[36msinfo\x1b[0m           Slurm cluster info

\x1b[1;33mNeed help?\x1b[0m
  \x1b[36mhelp\x1b[0m            Browse all 60+ commands
  \x1b[36mhelp <command>\x1b[0m  Detailed docs & examples
  \x1b[36mhint\x1b[0m            Guidance during labs
`;

/**
 * Help Text
 * Displayed when user types 'help' command
 */
export const HELP_TEXT = `
\x1b[33mAvailable commands:\x1b[0m
${COMMAND_LIST}
`;
