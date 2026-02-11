# NVIDIA AI Infrastructure Certification Simulator

<div align="center">

![Version](https://img.shields.io/badge/version-0.9.0-blue?style=for-the-badge)
![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**A browser-based training environment for the NCP-AII (NVIDIA-Certified Professional: AI Infrastructure) certification exam**

[Features](#features) · [Quick Start](#quick-start) · [Commands](#available-commands) · [Scenarios](#narrative-scenarios) · [Architecture](#architecture)

</div>

---

## Overview

The NVIDIA AI Infrastructure Certification Simulator provides realistic, hands-on experience with the complete NVIDIA datacenter stack. Practice every task from the NCP-AII certification exam in a safe, simulated environment that feels like operating a real DGX SuperPOD.

### What You Can Practice

- **GPU Management**: nvidia-smi, MIG partitioning, power/clock management
- **BMC Operations**: ipmitool for out-of-band management and sensor monitoring
- **Health Monitoring**: DCGM diagnostics, NVSM health checks, Fabric Manager
- **InfiniBand Fabric**: Cable validation, error counters, fabric diagnostics
- **Troubleshooting**: XID errors, performance issues, hardware faults
- **Cluster Management**: Slurm, BCM, Docker, NGC, Enroot containers
- **Storage**: Lustre, NFS, df, mount

## Features

### Realistic Terminal Emulation

- Full xterm.js-powered terminal with ANSI color support
- Command history (Up/Down arrows) and readline shortcuts (Ctrl+A/E/W/U/K)
- Accurate output formatting validated against real NVIDIA tool output
- Tab completion for commands and arguments
- Pipe support (`|`) for command chaining with `grep`, `head`, `tail`

### Narrative Scenario Engine

32 story-driven scenarios across all 5 NCP-AII exam domains. Each scenario puts you in the role of a datacenter engineer responding to real-world situations:

- **Mission briefing** with narrative hook, setting, and stakes
- **SITUATION/TASK framing** per step — what's happening and what you need to do
- **Inline quizzes** that test conceptual understanding mid-scenario
- **autoFaults** — automatic fault injection per step so cluster state matches the narrative
- **Resolution screen** that ties the story together and reinforces learning
- Difficulty levels (beginner/intermediate/advanced) with estimated completion times

### Sandbox Isolation

Each scenario runs in its own isolated sandbox — faults and mutations never leak between scenarios or to the global cluster:

- Per-scenario deep-cloned cluster state (ScenarioContext)
- All 19 simulators route through sandbox-aware resolve helpers
- Clean exit discards the sandbox entirely; global state stays pristine

### Multi-Architecture Support

Switch between four DGX system types from the dashboard:

- **DGX A100** — 8x A100 80GB, NVLink 3rd-gen (12 links), HDR InfiniBand (200Gb/s)
- **DGX H100** — 8x H100 SXM, NVLink 4th-gen (18 links), NDR InfiniBand (400Gb/s)
- **DGX H200** — 8x H200 SXM (141GB HBM3e), NVLink 4th-gen, NDR InfiniBand
- **DGX B200** — 8x B200, NVLink 5th-gen (18 links), NDR InfiniBand (400Gb/s)

All simulators, visualizations, and metrics dynamically adapt to the selected architecture.

### Spotlight Tour

Built-in guided tours for each tab (Simulator, Labs, Documentation) that walk new users through key UI elements with highlighted overlays and step-by-step explanations.

### Learning System

A tiered progression system built on spaced repetition:

- **6 Command Families**: gpu-monitoring, infiniband-tools, bmc-hardware, cluster-tools, container-tools, diagnostics
- **3-Tier Progression**: Guided (tool specified) → Choice (problem area identified) → Realistic (symptom only, no hints)
- **WhichToolQuiz**: Scenario-based quizzes testing tool selection intuition
- **SpacedReviewDrill**: SM-2 algorithm schedules retention drills at optimal intervals
- **ExplanationGates**: 56 post-scenario conceptual checks
- **ExamGauntlet**: Timed random scenario testing for exam prep
- **StudyDashboard**: Progress overview with domain breakdown and study recommendations

### Real-Time Dashboard

- Live GPU metrics (utilization, memory, temperature, power)
- Cluster health monitoring with heatmap visualization
- Per-node GPU status cards
- XID error tracking
- InfiniBand fabric status
- Interactive NVLink topology visualization (D3.js)
- InfiniBand fabric map with switch and host details

### Comprehensive Tool Simulation

#### nvidia-smi

- GPU listing and detailed queries
- MIG mode enable/disable
- MIG instance creation/deletion
- Power limit management
- NVLink topology and status
- ECC error reporting

#### dcgmi (Data Center GPU Manager)

- GPU discovery
- Diagnostic modes (short/medium/long)
- Health monitoring with 8 subsystems
- Group management
- Statistics collection

#### ipmitool

- BMC sensor readings
- LAN configuration
- Chassis power control
- User management
- FRU inventory
- SEL (System Event Log)

#### nvsm (NVIDIA System Management)

- Interactive hierarchical navigation (CWT mode)
- Health checks with dot-leader formatting
- Show alerts and system overview

#### InfiniBand Tools

- `ibstat` - HCA status and port information
- `ibdiagnet` - Full fabric diagnostics
- `iblinkinfo` - Fabric link discovery
- `perfquery` - Performance counters

#### Cluster Management

- `sinfo`, `squeue`, `scontrol`, `sbatch`, `scancel` - Slurm workload manager
- `bcm` - Base Command Manager with node/job management
- `cmsh` - Cluster management shell with interactive modes
- `docker`, `enroot`, `pyxis` - Container runtimes

#### Additional Tools

- `nv-fabricmanager` - NVSwitch fabric management and diagnostics
- `lspci` - PCI device listing with verbose modes
- `journalctl` - System journal with XID error tracking
- `nvidia-bug-report.sh` - Bug report generation with XID database
- `df`, `mount`, `lfs` - Storage and Lustre filesystem tools
- `sensors`, `dmidecode` - Hardware monitoring

### Practice Exam

- 168 questions across all 5 NCP-AII domains
- Timed exam mode (90 minutes) with question navigation
- Multiple-choice and multiple-select question types
- Domain breakdown in results
- Passing score tracking

### Documentation & Reference

- System architecture overview with node layout and hardware specs
- Architecture comparison across DGX A100, H100, H200, and B200
- Searchable CLI tool reference with 214 commands across 17 categories
- Glossary & Acronyms reference with 42 searchable terms
- Troubleshooting playbooks with 4 diagnostic scenarios
- XID error reference with severity filtering
- Exam guide with domain coverage and study tips

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/Seanbo5386/NVIDIA-Certification-Simulator.git
cd NVIDIA-Certification-Simulator

# Install dependencies
npm install

# Start development server
npm run dev
```

The simulator will open at `http://localhost:5173`

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### Getting Started

1. **Simulator**: Terminal and dashboard for hands-on command practice
2. **Labs & Scenarios**: 32 narrative missions with guided exercises across all 5 exam domains
3. **Documentation**: Reference materials, command guides, troubleshooting playbooks, and XID error lookup
4. **About**: Project background, changelog, and contribution info

### Your First Commands

Open the Terminal tab and try these commands:

```bash
# Check GPU status
nvidia-smi

# Detailed GPU query
nvidia-smi -q

# Enable MIG mode on GPU 0
nvidia-smi -i 0 -mig 1

# List MIG profiles
nvidia-smi mig -lgip

# Check BMC sensors
ipmitool sensor list

# Run DCGM diagnostics
dcgmi diag --mode 1

# Check InfiniBand status
ibstat

# Get help on any command
help nvidia-smi

# Practice exercises
practice nvidia-smi
```

### Learning Commands

- `help <command>` - Detailed command reference with options and usage examples
- `practice <command>` - Auto-generated practice exercises
- `hint` - Context-aware guidance during scenarios

## Available Commands

### GPU Management

| Command                      | Description           | Example                                |
| ---------------------------- | --------------------- | -------------------------------------- |
| `nvidia-smi`                 | Display GPU status    | `nvidia-smi`                           |
| `nvidia-smi -q`              | Detailed GPU query    | `nvidia-smi -q -i 0`                   |
| `nvidia-smi -i <id> -mig 1`  | Enable MIG mode       | `nvidia-smi -i 0 -mig 1`               |
| `nvidia-smi mig -lgip`       | List MIG profiles     | `nvidia-smi mig -lgip`                 |
| `nvidia-smi mig -cgi <ids>`  | Create GPU instances  | `nvidia-smi mig -i 0 -cgi 19,19,19 -C` |
| `nvidia-smi mig -lgi`        | List GPU instances    | `nvidia-smi mig -lgi`                  |
| `nvidia-smi mig -dgi`        | Destroy GPU instances | `nvidia-smi mig -i 0 -dgi`             |
| `nvidia-smi -pl <watts>`     | Set power limit       | `nvidia-smi -i 0 -pl 350`              |
| `nvidia-smi nvlink --status` | NVLink status         | `nvidia-smi nvlink --status`           |
| `nvidia-smi topo -m`         | Topology matrix       | `nvidia-smi topo -m`                   |

### DCGM (Data Center GPU Manager)

| Command                   | Description      | Example                   |
| ------------------------- | ---------------- | ------------------------- |
| `dcgmi discovery -l`      | List GPUs        | `dcgmi discovery -l`      |
| `dcgmi diag --mode <1-3>` | Run diagnostics  | `dcgmi diag --mode 2`     |
| `dcgmi health --check`    | Check GPU health | `dcgmi health --check`    |
| `dcgmi group -c <name>`   | Create GPU group | `dcgmi group -c my-group` |

### BMC Management (ipmitool)

| Command                        | Description       | Example                        |
| ------------------------------ | ----------------- | ------------------------------ |
| `ipmitool sensor list`         | Read all sensors  | `ipmitool sensor list`         |
| `ipmitool mc info`             | BMC firmware info | `ipmitool mc info`             |
| `ipmitool chassis status`      | Power state       | `ipmitool chassis status`      |
| `ipmitool chassis power cycle` | Power cycle       | `ipmitool chassis power cycle` |
| `ipmitool lan print`           | LAN configuration | `ipmitool lan print 1`         |
| `ipmitool user list`           | List BMC users    | `ipmitool user list 1`         |

### InfiniBand Tools

| Command      | Description            | Example         |
| ------------ | ---------------------- | --------------- |
| `ibstat`     | Port status            | `ibstat`        |
| `iblinkinfo` | Fabric link info       | `iblinkinfo -v` |
| `perfquery`  | Performance counters   | `perfquery`     |
| `ibdiagnet`  | Full fabric diagnostic | `ibdiagnet`     |

### Cluster Management

| Command              | Description              | Example                     |
| -------------------- | ------------------------ | --------------------------- |
| `sinfo`              | Slurm partition status   | `sinfo`                     |
| `squeue`             | Job queue                | `squeue`                    |
| `scontrol show node` | Node details             | `scontrol show node dgx-01` |
| `sbatch`             | Submit batch job         | `sbatch job.sh`             |
| `bcm`                | Base Command Manager     | `bcm-node list`             |
| `cmsh`               | Cluster management shell | `cmsh`                      |

## Narrative Scenarios

The simulator includes **32 narrative scenarios** covering all 5 NCP-AII exam domains:

### Domain 1: Systems and Server Bring-Up (31%)

Story-driven scenarios covering BMC configuration, server POST verification, driver installation, firmware validation, GPU discovery, hardware inventory, network bonding, and Fabric Manager setup.

### Domain 2: Physical Layer Management (5%)

Scenarios for NVLink topology analysis, MIG configuration, NVLink error recovery, GPU power optimization, and cable diagnostics.

### Domain 3: Control Plane Installation (19%)

Scenarios for Slurm configuration, container runtime setup, NGC pipelines, Pyxis/Enroot workflows, Lustre validation, and DCGM policy configuration.

### Domain 4: Cluster Test and Verification (33%)

Scenarios for DCGMI diagnostics, NCCL testing, HPL benchmarks, cluster health monitoring, GPU bandwidth validation, InfiniBand stress testing, ECC error investigation, and ClusterKit assessment.

### Domain 5: Troubleshooting and Optimization (12%)

Scenarios for XID error investigation, thermal troubleshooting, network diagnostics, memory issues, and cable detective work — each with automatic fault injection that makes the simulated cluster exhibit the exact symptoms you're investigating.

## Architecture

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Terminal**: xterm.js with FitAddon and WebLinksAddon
- **State Management**: Zustand with persistence (5 stores)
- **Styling**: TailwindCSS with custom NVIDIA theme
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Visualization**: Recharts (metrics), D3.js (topology and network maps)
- **Testing**: Vitest, React Testing Library
- **CI/CD**: GitHub Actions (lint, test, build)

### Project Structure

```
src/
├── components/          # React components (54 components)
│   ├── Terminal.tsx      # xterm.js terminal with command routing
│   ├── Dashboard.tsx     # Real-time metrics dashboard
│   ├── LabWorkspace.tsx  # Scenario execution workspace
│   ├── LabsAndScenariosView.tsx # Mission browser with domain cards
│   ├── Documentation.tsx # Tabbed reference (Architecture, Commands, XID, Exam Guide, Glossary)
│   ├── About.tsx         # Project info, changelog, and links
│   ├── FaultInjection.tsx # Fault injection controls
│   ├── NarrativeIntro.tsx # Mission briefing screen
│   ├── SpotlightTour.tsx # Guided tour overlay
│   ├── ExamWorkspace.tsx  # Timed practice exam
│   ├── ArchitectureComparison.tsx # Side-by-side DGX spec comparison
│   ├── ClusterHeatmap.tsx # GPU utilization heatmap
│   ├── TopologyGraph.tsx  # D3.js NVLink visualization
│   └── ...
├── simulators/          # Command simulators (19 simulators + BaseSimulator)
│   ├── BaseSimulator.ts   # Base class with sandbox-aware resolve helpers
│   ├── nvidiaSmiSimulator.ts
│   ├── dcgmiSimulator.ts
│   ├── ipmitoolSimulator.ts
│   ├── infinibandSimulator.ts
│   ├── slurmSimulator.ts
│   ├── fabricManagerSimulator.ts
│   ├── nvsmSimulator.ts
│   └── ...
├── cli/                 # Data-driven CLI framework
│   ├── CommandDefinitionLoader.ts
│   ├── CommandDefinitionRegistry.ts
│   └── CommandExerciseGenerator.ts
├── data/                # Static data
│   ├── narrativeScenarios.json  # 32 narrative scenarios
│   ├── examQuestions.json       # 168 practice exam questions
│   ├── commandFamilies.json     # 6 command family definitions
│   ├── quizQuestions.json       # Tool selection quizzes
│   ├── explanationGates.json    # 56 post-scenario knowledge checks
│   ├── hardwareSpecs.ts         # DGX A100/H100/H200/B200 spec registry
│   └── output/                  # 228 JSON command definitions
├── store/               # Zustand state management
│   ├── simulationStore.ts       # Cluster state, GPU metrics, exam state
│   ├── scenarioContext.ts       # Per-scenario sandbox isolation
│   ├── learningProgressStore.ts # Quiz scores, tier unlocks, spaced repetition
│   ├── learningStore.ts         # Domain progress, study sessions
│   └── tierNotificationStore.ts # Tier unlock notifications
├── types/               # TypeScript type definitions
├── utils/               # Utilities (36 modules)
│   ├── scenarioLoader.ts        # Scenario loading and fault application
│   ├── narrativeAdapter.ts      # Narrative-to-scenario conversion
│   ├── tierProgressionEngine.ts # Tier unlock logic
│   ├── spacedRepetition.ts      # SM-2 algorithm
│   ├── examEngine.ts            # Exam question selection and scoring
│   ├── clusterFactory.ts        # DGX cluster generation
│   └── tabCompletion.ts         # Terminal tab completion
└── App.tsx              # Main application (4-tab layout)
```

### Hardware Models

The simulator accurately models:

- **DGX Systems**: A100, H100, H200, B200 with switchable architecture
- **GPUs**: A100 (80GB HBM2e), H100 SXM (80GB HBM3), H200 SXM (141GB HBM3e), B200 (192GB HBM3e)
- **MIG Profiles**: All 6 standard profiles (1g.5gb through 7g.40gb)
- **NVLink**: 12 links (A100) / 18 links (H100/H200/B200) with error tracking
- **InfiniBand**: HDR (200Gb/s) for A100, NDR (400Gb/s) for H100/H200/B200
- **BMC**: Sensor readings, power management, firmware info
- **NVSwitch**: UUID format, power ranges, diagnostic modes

## XID Error Reference

Common GPU XID errors you'll encounter:

| XID | Description               | Action                                   |
| --- | ------------------------- | ---------------------------------------- |
| 8   | GPU memory access fault   | Check application memory usage           |
| 13  | Graphics engine exception | Check application, possible GPU issue    |
| 14  | GPU driver error          | Update driver, check compatibility       |
| 31  | GPU memory page fault     | Application bug or memory corruption     |
| 48  | Double-bit ECC error      | Replace GPU if persistent                |
| 63  | ECC page retirement       | Monitor; excessive retirements = replace |
| 79  | GPU fallen off bus        | Check PCIe slot, reseat GPU              |
| 119 | GSP error                 | Driver/firmware mismatch                 |

## Testing

### Unit Tests

The project has **2,913 unit tests** across 128 test files covering simulators, stores, utilities, components, and data validation:

```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage report
```

### CI/CD

GitHub Actions runs lint, unit tests, and production build on every push.

## Roadmap

### Completed

- [x] 19 command simulators with realistic output validated against real tools
- [x] 32 narrative scenarios with story-driven learning across all 5 domains
- [x] Sandbox isolation (per-scenario deep-cloned state)
- [x] AutoFaults system for automatic per-step fault injection
- [x] Multi-architecture support (DGX A100, H100, H200, B200)
- [x] Spotlight tour for guided onboarding
- [x] 3-tier learning progression with spaced repetition
- [x] Practice exam with 168 timed questions
- [x] D3.js topology visualization (NVLink and InfiniBand fabric maps)
- [x] Tab completion and readline shortcuts
- [x] Data-driven CLI framework with 228 JSON command definitions
- [x] `help` and `practice` terminal commands
- [x] Fault injection system for troubleshooting practice
- [x] Study dashboard with progress analytics
- [x] CI/CD pipeline (lint, test, build)
- [x] 2,913 unit tests with 0 TypeScript errors

### Future Enhancements

- E2E test coverage with Playwright
- Command history search (Ctrl+R)
- WebSocket support for multi-user scenarios
- Achievement/badge system for completed missions
- Custom scenario creation
- API for integration with LMS platforms
- Instructor dashboard

## Contributing

Contributions are welcome! This simulator is designed to help engineers prepare for NVIDIA certification. If you'd like to add features or fix issues:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is provided for educational purposes. NVIDIA, DGX, A100, H100, and related trademarks are property of NVIDIA Corporation.

## Acknowledgments

- [Claude Code](https://www.anthropic.com/claude-code) (Anthropic's Claude Opus 4.6) — AI pair-programming partner throughout development
- NVIDIA for comprehensive datacenter documentation
- The open-source community for amazing tools (xterm.js, React, Vite)
- All engineers preparing for NCP-AII certification

## Support

If you encounter issues or have questions:

- Check the Documentation tab in the simulator
- Review the [Issues](https://github.com/Seanbo5386/NVIDIA-Certification-Simulator/issues) page
- Consult the official [NVIDIA Certification resources](https://www.nvidia.com/en-us/learn/certification/)

---

<div align="center">

**Built for AI Infrastructure Engineers by [Sean Woods](https://www.linkedin.com/in/sean-m-woods/)**

[Get Started](#quick-start) · [View Scenarios](#narrative-scenarios) · [Report Bug](https://github.com/Seanbo5386/NVIDIA-Certification-Simulator/issues)

</div>
