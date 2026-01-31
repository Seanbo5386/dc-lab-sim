# NVIDIA AI Infrastructure Certification Simulator

<div align="center">

![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**A browser-based training environment for the NCP-AII (NVIDIA-Certified Professional: AI Infrastructure) certification exam**

[Features](#features) • [Quick Start](#quick-start) • [Commands](#available-commands) • [Labs](#interactive-labs) • [Architecture](#architecture)

</div>

---

## 🎯 Overview

The NVIDIA AI Infrastructure Certification Simulator provides realistic, hands-on experience with the complete NVIDIA datacenter stack. Practice every task from the NCP-AII certification exam in a safe, simulated environment that feels like operating a real DGX SuperPOD.

### What You Can Practice

- **GPU Management**: nvidia-smi, MIG partitioning, power/clock management
- **BMC Operations**: ipmitool for out-of-band management and sensor monitoring
- **Health Monitoring**: DCGM diagnostics, NVSM health checks
- **InfiniBand Fabric**: Cable validation, error counters, fabric diagnostics
- **Troubleshooting**: XID errors, performance issues, hardware faults
- **BlueField DPUs**: Mode switching, OVS configuration (planned)
- **Cluster Management**: Slurm, BCM, container tools (planned)

## ✨ Features

### 🖥️ Realistic Terminal Emulation
- Full xterm.js-powered terminal with ANSI color support
- Command history (↑/↓ arrows)
- Accurate output formatting matching real NVIDIA tools
- Tab completion (coming soon)

### 📊 Real-Time Dashboard
- Live GPU metrics (utilization, memory, temperature, power)
- Cluster health monitoring
- Per-node GPU status cards
- XID error tracking
- InfiniBand fabric status

### 🔧 Comprehensive Tool Simulation

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
- Health monitoring
- Group management
- Statistics collection

#### ipmitool
- BMC sensor readings
- LAN configuration
- Chassis power control
- User management
- FRU inventory
- SEL (System Event Log)

#### InfiniBand Tools
- `ibstat` - HCA status and port information
- `ibporterrors` - Error counter monitoring
- `iblinkinfo` - Fabric link discovery
- `perfquery` - Performance counters
- `ibdiagnet` - Full fabric diagnostics

### 📚 Learning Resources
- XID error reference guide
- Command documentation with examples
- Quick start tutorials
- Exam domain coverage guides

### 💾 State Management
- Persistent cluster configuration
- Export/import cluster state as JSON
- Simulation controls (play/pause/reset)
- Multi-node cluster support (up to 32 DGX systems)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd dc-sim-011126

# Install dependencies
npm install

# Start development server
npm run dev
```

The simulator will open at `http://localhost:3000`

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 📖 Usage Guide

### Getting Started

1. **Dashboard View**: Start here to see cluster health, GPU metrics, and node status
2. **Terminal View**: Access the command-line interface for hands-on practice
3. **Labs & Scenarios**: Follow guided exercises covering all 5 exam domains
4. **Documentation**: Reference materials, command guides, and XID error lookup

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
```

### Node Selection

Use the Dashboard to select which DGX node you're working on. The terminal automatically switches context when you change nodes.

### Simulation Controls

- **Play/Pause**: Start or pause the simulation (metrics updates, fault injection)
- **Reset**: Return to default cluster configuration
- **Export**: Download cluster state as JSON
- **Import**: Load a saved cluster configuration

## 🎓 Available Commands

### GPU Management

| Command | Description | Example |
|---------|-------------|---------|
| `nvidia-smi` | Display GPU status | `nvidia-smi` |
| `nvidia-smi -q` | Detailed GPU query | `nvidia-smi -q -i 0` |
| `nvidia-smi -i <id> -mig 1` | Enable MIG mode | `nvidia-smi -i 0 -mig 1` |
| `nvidia-smi mig -lgip` | List MIG profiles | `nvidia-smi mig -lgip` |
| `nvidia-smi mig -cgi <ids>` | Create GPU instances | `nvidia-smi mig -i 0 -cgi 19,19,19 -C` |
| `nvidia-smi mig -lgi` | List GPU instances | `nvidia-smi mig -lgi` |
| `nvidia-smi mig -dgi` | Destroy GPU instances | `nvidia-smi mig -i 0 -dgi` |
| `nvidia-smi -pl <watts>` | Set power limit | `nvidia-smi -i 0 -pl 350` |
| `nvidia-smi nvlink --status` | NVLink status | `nvidia-smi nvlink --status` |
| `nvidia-smi topo -m` | Topology matrix | `nvidia-smi topo -m` |

### DCGM (Data Center GPU Manager)

| Command | Description | Example |
|---------|-------------|---------|
| `dcgmi discovery -l` | List GPUs | `dcgmi discovery -l` |
| `dcgmi diag --mode <1-3>` | Run diagnostics | `dcgmi diag --mode 2` |
| `dcgmi health --check` | Check GPU health | `dcgmi health --check` |
| `dcgmi group -c <name>` | Create GPU group | `dcgmi group -c my-group` |

### BMC Management (ipmitool)

| Command | Description | Example |
|---------|-------------|---------|
| `ipmitool sensor list` | Read all sensors | `ipmitool sensor list` |
| `ipmitool mc info` | BMC firmware info | `ipmitool mc info` |
| `ipmitool chassis status` | Power state | `ipmitool chassis status` |
| `ipmitool chassis power cycle` | Power cycle | `ipmitool chassis power cycle` |
| `ipmitool lan print` | LAN configuration | `ipmitool lan print 1` |
| `ipmitool user list` | List BMC users | `ipmitool user list 1` |

### InfiniBand Tools

| Command | Description | Example |
|---------|-------------|---------|
| `ibstat` | Port status | `ibstat` |
| `ibporterrors` | Error counters | `ibporterrors` |
| `iblinkinfo` | Fabric link info | `iblinkinfo -v` |
| `perfquery` | Performance counters | `perfquery` |
| `ibdiagnet` | Full fabric diagnostic | `ibdiagnet` |

## 🧪 Interactive Labs

The simulator includes guided labs covering all 5 NCP-AII exam domains:

### Domain 1: Systems and Server Bring-Up (31%)
- DGX SuperPOD Initial Deployment
- Firmware Upgrade Workflow
- Cable Validation
- Power and Cooling Validation

### Domain 2: Physical Layer Management (5%)
- BlueField DPU Configuration
- MIG Partitioning
- Advanced MIG Scenarios

### Domain 3: Control Plane Installation (19%)
- BCM High Availability Setup
- Slurm with GPU GRES
- Container Toolkit Setup
- Pyxis/Enroot with Slurm

### Domain 4: Cluster Test and Verification (33%)
- Single-Node Stress Test
- HPL Benchmark
- NCCL Tests (Single & Multi-Node)
- Storage Validation

### Domain 5: Troubleshooting and Optimization (12%)
- Diagnose Low HPL Performance
- GPU Faults in NVSM
- InfiniBand Link Errors
- Container GPU Visibility Issues

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Terminal**: xterm.js with FitAddon and WebLinksAddon
- **State Management**: Zustand with persistence
- **Styling**: TailwindCSS with custom NVIDIA theme
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Visualization**: Recharts (for metrics), D3.js (planned for topology)

### Project Structure

```
src/
├── components/           # React components
│   ├── Terminal.tsx     # xterm.js terminal emulator
│   ├── Dashboard.tsx    # Real-time metrics dashboard
│   └── ...
├── simulators/          # Command simulators
│   ├── nvidiaSmiSimulator.ts
│   ├── dcgmiSimulator.ts
│   ├── ipmitoolSimulator.ts
│   └── infinibandSimulator.ts
├── store/               # Zustand state management
│   └── simulationStore.ts
├── types/               # TypeScript type definitions
│   ├── hardware.ts
│   └── commands.ts
├── utils/               # Utilities and factories
│   └── clusterFactory.ts
└── App.tsx             # Main application component
```

### Hardware Models

The simulator accurately models:

- **DGX Systems**: A100, H100, H200, B200, GB200 NVL72
- **GPUs**: A100 (80GB), H100 SXM, H200 SXM with full specs
- **MIG Profiles**: All 6 standard profiles (1g.5gb through 7g.40gb)
- **NVLink**: 12 links (A100) / 18 links (H100) with error tracking
- **BlueField DPUs**: All 4 operational modes
- **InfiniBand**: HDR (200Gb/s) and NDR (400Gb/s) with error counters
- **BMC**: Sensor readings, power management, firmware info

## 🔍 XID Error Reference

Common GPU XID errors you'll encounter:

| XID | Description | Action |
|-----|-------------|--------|
| 13 | Graphics engine exception | Check application, possible GPU issue |
| 31 | GPU memory page fault | Application bug or memory corruption |
| 48 | Double-bit ECC error | Replace GPU if persistent |
| 63 | ECC page retirement | Monitor; excessive retirements = replace |
| 79 | GPU fallen off bus | Check PCIe slot, reseat GPU |
| 119 | GSP error | Driver/firmware mismatch |

## 🛣️ Roadmap

### Recently Completed
- [x] NVSM simulator with hierarchical navigation
- [x] Mellanox tools (mlxconfig, mlxlink, mlxcables, mlxtrace)
- [x] Slurm commands (sinfo, squeue, scontrol, sbatch, scancel)
- [x] Docker/NGC/Singularity/Enroot commands
- [x] BCM (Base Command Manager) simulator
- [x] Interactive lab scenarios with step-by-step guidance (15 labs)
- [x] Practice exam with timed questions (53 questions)
- [x] Fault injection system for troubleshooting practice
- [x] Multi-node NCCL test simulation
- [x] HPL benchmark simulation

### In Progress
- [ ] Expand practice exam to 150+ questions
- [ ] Additional lab scenarios (target: 30+)
- [ ] Enhanced feedback system with "did you mean?" suggestions
- [ ] Domain-specific study modes

### Coming Soon
- [ ] D3.js topology visualization
- [ ] Tab completion for commands
- [ ] Command history search (Ctrl+R)
- [ ] Adaptive learning system
- [ ] Progress analytics dashboard

### Future Enhancements
- WebSocket support for multi-user scenarios
- Collaborative training sessions
- Achievement/badge system for completed labs
- Custom scenario creation
- API for integration with LMS platforms
- Instructor dashboard

## 🧪 Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage report
npm run test:ui        # Interactive UI
```

### E2E Tests

Comprehensive Playwright test suite covering all Phase 1 features:

```bash
npm run test:e2e          # All E2E tests
npm run test:e2e:ui       # Interactive mode
npm run test:e2e:debug    # Debug mode
npm run test:e2e:report   # View HTML report
```

**E2E Test Coverage:**
- ClusterKit commands (~20 tests)
- Burn-in tests: NCCL, HPL, NeMo (~25 tests)
- Firmware and cable validation (~20 tests)
- Lab scenarios across all domains (~30 tests)
- Integration workflows (~15 tests)
- Visual regression across 3 viewports

Tests run on 3 viewport sizes: Desktop (1920x1080), Laptop (1366x768), Large Display (2560x1440).

See [E2E Test Documentation](tests/e2e/README.md) for details.

## 🤝 Contributing

Contributions are welcome! This simulator is designed to help engineers prepare for NVIDIA certification. If you'd like to add features or fix issues:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is provided for educational purposes. NVIDIA, DGX, A100, H100, and related trademarks are property of NVIDIA Corporation.

## 🙏 Acknowledgments

- NVIDIA for comprehensive datacenter documentation
- The open-source community for amazing tools (xterm.js, React, Vite)
- All engineers preparing for NCP-AII certification

## 📞 Support

If you encounter issues or have questions:

- Check the Documentation tab in the simulator
- Review the [Issues](../../issues) page
- Consult the official [NVIDIA Certification resources](https://www.nvidia.com/en-us/training/certification/)

---

<div align="center">

**Built with ⚡ for AI Infrastructure Engineers**

[Get Started](#quick-start) • [View Labs](#interactive-labs) • [Report Bug](../../issues)

</div>
