# Data Center Lab Simulator

<div align="center">

![Version](https://img.shields.io/badge/version-1.3.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Tests](https://img.shields.io/badge/tests-3631_unit_|_307_E2E-brightgreen?style=for-the-badge)
![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**The most comprehensive browser-based training environment for the NCP-AII certification exam.**

Practice on a simulated 8-node DGX SuperPOD with 64 GPUs. No hardware required.

![Demo](docs/demo.gif)

[Live Demo](https://www.dclabsim.com) · [Get Started](#quick-start) · [Scenarios](#narrative-scenarios) · [Roadmap](docs/ROADMAP.md)

</div>

---

## Why This Exists

The NCP-AII certification exam tests hands-on datacenter skills — but most people studying for it don't have a DGX cluster in their garage. This simulator gives you a realistic terminal, dashboard, and guided scenarios so you can build muscle memory on every command in the exam blueprint before test day.

**What makes it different:**

- **It feels real** — `nvidia-smi`, `ipmitool`, `dcgmi`, `ibstat`, and 60+ other commands produce output modeled after actual DGX hardware
- **Scenarios tell a story** — You're not just running commands; you're responding to a 2AM GPU failure or debugging NCCL performance before a deadline
- **Faults inject automatically** — When a scenario says "GPU 3 has an XID 48 error," the simulated cluster actually shows it in every tool
- **Six DGX architectures** — Switch between A100, H100, H200, B200, GB200, and Vera Rubin VR200 and watch every metric, topology, and output adapt

---

## At a Glance

|                   |                                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| **Commands**      | 20 simulators, 229 CLI definitions across 18 categories                      |
| **Scenarios**     | 32 story-driven labs across all 5 exam domains                               |
| **Exam Prep**     | 199 practice questions + 60 tool selection + 150 deep mastery quizzes        |
| **Architectures** | DGX A100, H100, H200, B200, GB200, VR200 (switchable from dashboard)         |
| **Learning**      | 3-tier progression (Guided > Choice > Realistic) with SM-2 spaced repetition |
| **Cloud Sync**    | Optional sign-in to save progress across devices (AWS Cognito)               |
| **Tests**         | 3,510 unit + 307 E2E tests, 0 TypeScript errors, 0 lint warnings             |

---

## Features

### Terminal That Feels Like the Real Thing

Full xterm.js terminal with ANSI colors, command history, readline shortcuts (Ctrl+A/E/W/U/K), tab completion, and pipe support. Output formatting is validated against real NVIDIA tools.

```bash
$ nvidia-smi
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.129.03   Driver Version: 535.129.03   CUDA Version: 12.2                 |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|=========================================+========================+======================|
|   0  NVIDIA A100-SXM4-80GB         On  | 00000000:07:00.0   Off |                    0 |
| N/A   37C    P0             311W / 400W |       0MiB / 81920MiB  |      0%      Default |
...
```

### Narrative Scenarios

32 scenarios put you in the role of a datacenter engineer. Each one has a story hook, automatic fault injection, inline quizzes, and a debrief:

> **The Midnight Deployment** — It's 2AM and the training job crashed. Nodes are reporting XID errors, NCCL allreduce is hanging, and the team lead wants answers by morning. You have ibstat, dcgmi, and nvidia-smi. Go.

Scenarios run in **sandboxed isolation** — faults and mutations never leak to other scenarios or the global cluster state.

### User Feedback

Submit general feedback, bug reports, or success stories directly from the header. Authenticated submission via Cognito prevents spam.

### Multi-Architecture Support

Switch architectures from the dashboard dropdown. Everything adapts — GPU specs, NVLink topology, InfiniBand rates, and all simulator output:

| System    | GPUs        | Memory      | NVLink             | Network       |
| --------- | ----------- | ----------- | ------------------ | ------------- |
| DGX A100  | 8x A100     | 80GB HBM2e  | 3rd-gen (12 links) | HDR 200Gb/s   |
| DGX H100  | 8x H100 SXM | 80GB HBM3   | 4th-gen (18 links) | NDR 400Gb/s   |
| DGX H200  | 8x H200 SXM | 141GB HBM3e | 4th-gen (18 links) | NDR 400Gb/s   |
| DGX B200  | 8x B200     | 192GB HBM3e | 5th-gen (18 links) | NDR 400Gb/s   |
| DGX GB200 | 8x GB200    | 192GB HBM3e | 5th-gen (18 links) | XDR 800Gb/s   |
| DGX VR200 | 8x R200     | 288GB HBM4  | 6th-gen (18 links) | XDR2 1600Gb/s |

### Exam Dashboard

- **199 questions** weighted by the NCP-AII blueprint across all 5 domains
- **5 exam modes**: Full Practice (90 min), Quick Quiz, Gauntlet, Weak Area Focus, Review Mistakes
- **Tool Selection Quizzes**: 60 "which tool do you use?" questions (10 per session)
- **Deep Mastery Quizzes**: 150 questions on flags, output interpretation, and edge cases (25 per session)
- Readiness score, domain performance heatmap, and full exam history

### Learning System

- **7 Command Families**: GPU Monitoring, InfiniBand Tools, BMC/Hardware, Cluster Tools, Container Tools, Diagnostics, XID Diagnostics
- **3-Tier Progression**: Guided (tool specified) > Choice (problem area identified) > Realistic (symptom only, figure it out)
- **Spaced Repetition**: SM-2 algorithm schedules review drills at optimal intervals
- **57 Explanation Gates**: Post-scenario conceptual checks to reinforce understanding

### Real-Time Dashboard

Live cluster health monitoring with GPU metrics (utilization, memory, temp, power), per-node status cards, XID error tracking, InfiniBand fabric status, and interactive D3.js topology visualizations for NVLink and InfiniBand.

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome, Firefox, Edge, Safari)
- Desktop viewport recommended (1280px+ wide)

### Install and Run

```bash
git clone https://github.com/Seanbo5386/dc-lab-sim.git
cd dc-lab-sim
npm install
npm run dev
```

Opens at `http://localhost:5173`. That's it — no backend required.

### Your First Commands

```bash
nvidia-smi                    # GPU status overview
nvidia-smi -q -i 0            # Detailed query for GPU 0
ibstat                         # InfiniBand adapter status
dcgmi diag --mode 1           # Quick DCGM diagnostic
ipmitool sensor list          # BMC sensor readings
sinfo                          # Slurm cluster status
help nvidia-smi               # Detailed command reference
practice nvidia-smi           # Auto-generated exercises
hint                           # Context-aware help during labs
```

### Production Build

```bash
npm run build     # Optimized bundle -> dist/
npm run preview   # Preview locally
```

---

## Available Commands

<details>
<summary><strong>GPU Management</strong> — nvidia-smi, MIG, power limits, topology</summary>

| Command                        | Description                    |
| ------------------------------ | ------------------------------ |
| `nvidia-smi`                   | GPU status and utilization     |
| `nvidia-smi -q`                | Detailed GPU query             |
| `nvidia-smi -i <id> -mig 1`    | Enable MIG mode                |
| `nvidia-smi mig -lgip`         | List MIG profiles              |
| `nvidia-smi mig -cgi <ids> -C` | Create GPU + compute instances |
| `nvidia-smi mig -lgi`          | List GPU instances             |
| `nvidia-smi mig -dgi`          | Destroy GPU instances          |
| `nvidia-smi -pl <watts>`       | Set power limit                |
| `nvidia-smi nvlink --status`   | NVLink status                  |
| `nvidia-smi topo -m`           | Topology matrix                |

</details>

<details>
<summary><strong>DCGM</strong> — GPU discovery, diagnostics, health, groups</summary>

| Command                   | Description                         |
| ------------------------- | ----------------------------------- |
| `dcgmi discovery -l`      | List GPUs                           |
| `dcgmi diag --mode <1-3>` | Run diagnostics (short/medium/long) |
| `dcgmi health --check`    | Health check across 8 subsystems    |
| `dcgmi group -c <name>`   | Create GPU group                    |
| `dcgmi stats -g <id> -e`  | Enable statistics collection        |

</details>

<details>
<summary><strong>BMC / ipmitool</strong> — Sensors, power, LAN, users, FRU, SEL</summary>

| Command                        | Description                      |
| ------------------------------ | -------------------------------- |
| `ipmitool sensor list`         | Read all sensors                 |
| `ipmitool mc info`             | BMC firmware info                |
| `ipmitool chassis status`      | Power state                      |
| `ipmitool chassis power cycle` | Power cycle                      |
| `ipmitool lan print 1`         | LAN configuration                |
| `ipmitool user list 1`         | List BMC users                   |
| `ipmitool fru print`           | Field Replaceable Unit inventory |
| `ipmitool sel list`            | System Event Log                 |

</details>

<details>
<summary><strong>InfiniBand</strong> — ibstat, ibdiagnet, iblinkinfo, perfquery</summary>

| Command      | Description             |
| ------------ | ----------------------- |
| `ibstat`     | HCA port status         |
| `iblinkinfo` | Fabric link discovery   |
| `ibdiagnet`  | Full fabric diagnostics |
| `perfquery`  | Performance counters    |

</details>

<details>
<summary><strong>Cluster Management</strong> — Slurm, BCM, containers</summary>

| Command                     | Description        |
| --------------------------- | ------------------ |
| `sinfo`                     | Partition status   |
| `squeue`                    | Job queue          |
| `scontrol show node <name>` | Node details       |
| `sbatch <script>`           | Submit batch job   |
| `scancel <jobid>`           | Cancel job         |
| `bcm-node list`             | BCM node inventory |
| `docker ps`                 | Running containers |
| `enroot list`               | Enroot containers  |

</details>

<details>
<summary><strong>Additional Tools</strong> — 50+ more commands</summary>

| Command                      | Description                     |
| ---------------------------- | ------------------------------- |
| `nvsm show health`           | NVIDIA System Management health |
| `nv-fabricmanager -v`        | Fabric Manager version/status   |
| `mlxconfig -d <dev> query`   | ConnectX/BlueField config       |
| `mlxlink -d <dev>`           | Link diagnostics                |
| `lspci \| grep -i nvidia`    | PCI device listing              |
| `journalctl -k \| grep NVRM` | Kernel XID error log            |
| `nvidia-bug-report.sh`       | Bug report generation           |
| `sensors`                    | Hardware temperature monitoring |
| `dmidecode -t system`        | BIOS/hardware info              |
| `df -h`                      | Disk usage                      |
| `lfs df`                     | Lustre filesystem status        |

</details>

---

## Narrative Scenarios

32 scenarios across all 5 NCP-AII domains, weighted to match the exam blueprint:

### Domain 1: Systems and Server Bring-Up (31%)

BMC configuration, POST verification, driver installation, firmware validation, GPU discovery, hardware inventory, network bonding, Fabric Manager setup.

### Domain 2: Physical Layer Management (5%)

NVLink topology analysis, MIG configuration, NVLink error recovery, GPU power optimization, cable diagnostics.

### Domain 3: Control Plane Installation (19%)

Slurm cluster setup, container runtime configuration, NGC pipelines, Pyxis/Enroot workflows, Lustre validation, DCGM policy configuration.

### Domain 4: Cluster Test and Verification (33%)

DCGMI diagnostics, NCCL collective tests, HPL benchmarks, cluster health monitoring, GPU bandwidth validation, InfiniBand stress testing, ECC error investigation.

### Domain 5: Troubleshooting and Optimization (12%)

XID error triage, thermal troubleshooting, network diagnostics, memory fault isolation, cable detective work — each with automatic fault injection so the cluster exhibits real symptoms.

---

## XID Error Reference

Common GPU errors you'll encounter and diagnose:

| XID | Description               | Action                                   |
| --- | ------------------------- | ---------------------------------------- |
| 8   | GPU memory access fault   | Check application memory usage           |
| 13  | Graphics engine exception | Check application, possible GPU issue    |
| 31  | GPU memory page fault     | Application bug or memory corruption     |
| 48  | Double-bit ECC error      | Replace GPU if persistent                |
| 63  | ECC page retirement       | Monitor; excessive retirements = replace |
| 79  | GPU fallen off bus        | Check PCIe slot, reseat GPU              |
| 119 | GSP error                 | Driver/firmware mismatch                 |

---

## Cloud Sync & Authentication (Optional)

Sign in with email/password to sync progress across devices. Powered by AWS Amplify Gen 2 (Cognito + DynamoDB).

**The app works fully without this** — all progress is saved locally in the browser. If no backend is configured, auth calls fail silently.

<details>
<summary><strong>Setting up your own backend</strong></summary>

1. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and run `aws configure`

2. The Amplify infrastructure code lives in `amplify/` (gitignored, kept locally):
   - `amplify/auth/resource.ts` — Cognito user pool
   - `amplify/data/resource.ts` — DynamoDB tables (UserProgress + Feedback)
   - `amplify/backend.ts` — Ties auth and data together

3. Deploy:

   ```bash
   npx ampx sandbox       # Local development sandbox
   npx ampx deploy        # Production deployment
   ```

   This generates `amplify_outputs.json` (also gitignored) which the app detects at startup.

4. Run `npm run dev` — sign-in button activates automatically.

**What syncs:** Simulation state, quiz scores, learning progress, tier unlocks, spaced repetition schedules. Each user's data is isolated via Cognito owner-based authorization.

**Feedback system:** The Feedback button in the header lets authenticated users submit general feedback, bug reports, and success stories. Submissions are stored in a DynamoDB `Feedback` table with owner-based authorization (defined in `amplify/data/resource.ts`). The table is created automatically when you deploy the Amplify backend — no additional setup required. Without a backend, the Feedback button still appears but submissions fail gracefully with an error message.

To query feedback as an admin:

```bash
aws dynamodb scan --table-name Feedback-<your-stack-id> --region us-east-1
```

</details>

---

## Security & Privacy

- **All traffic encrypted** — HTTPS/TLS enforced via AWS Amplify hosting
- **Authentication** — AWS Cognito user pools with email verification and secure password policy
- **Data isolation** — DynamoDB records scoped to authenticated user (owner-based authorization); users can only read/write their own data
- **Minimal data collection** — Only learning progress is stored; no PII beyond email
- **Client-side simulation** — All commands execute locally in the browser; nothing is sent to a server
- **Open source** — Full codebase available for security review

---

## Testing

```bash
npm run test           # Watch mode
npm run test:run       # Single run (3,510 unit tests)
npm run test:coverage  # With coverage report
npm run lint           # ESLint (0 errors, 0 warnings)
npx playwright test    # 307 E2E tests (commands, scenarios, visual regression)
```

CI/CD via GitHub Actions runs lint, tests, and production build on every push.

---

## Architecture

### Tech Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| UI            | React 18, TypeScript, TailwindCSS, Lucide icons                 |
| Terminal      | xterm.js with FitAddon and WebLinksAddon                        |
| State         | Zustand (4 stores + sandbox context, persisted to localStorage) |
| Visualization | D3.js (topology maps), Recharts (metrics)                       |
| Auth & Sync   | AWS Amplify Gen 2 (Cognito, AppSync, DynamoDB) — optional       |
| Build         | Vite                                                            |
| Testing       | Vitest + React Testing Library + Playwright                     |
| CI/CD         | GitHub Actions                                                  |

### Project Structure

```
src/
├── components/       # 116 React components
├── simulators/       # 20 command simulators + BaseSimulator
├── cli/              # Data-driven CLI framework (229 JSON definitions)
├── data/             # Scenarios, exam questions, hardware specs
├── store/            # Zustand stores + sandbox context
├── utils/            # 67 utility modules
├── types/            # TypeScript definitions
└── App.tsx           # 5-tab layout (Simulator, Labs, Exams, Docs, About)
```

---

## Roadmap

### Completed (v1.2.2)

- [x] Exam scoring pipeline: real breakdown persisted and recorded in analytics
- [x] Fixed readiness benchmark inflated percentiles (was multiplying 0-100 score by 100)
- [x] Scenario sandbox: snapshot/restore cluster on exit instead of resetting to defaults
- [x] Terminal scenario context rebinds on scenario start/stop
- [x] Removed gauntlet Mark Complete (was self-certification without validation)
- [x] Question flagging wired to store action

### Completed (v1.2.1)

- [x] Security & Privacy section detailing AWS hosting, Cognito auth, and data isolation
- [x] Terminal session persistence across tab switches
- [x] Fixed double-dash flag rendering in Commands Reference
- [x] nvidia-smi formatter consistency fixes
- [x] Version consistency across all surfaces

### Completed (v1.2.0)

- [x] 20 command simulators with 229 CLI definitions across 17 categories
- [x] 32 narrative scenarios with story-driven learning across all 5 domains
- [x] 199 exam questions, 60 tool selection quizzes, and 150 deep mastery quizzes
- [x] Multi-architecture support (DGX A100, H100, H200, B200, GB200, VR200)
- [x] User authentication and cloud sync (AWS Cognito + DynamoDB)
- [x] Sandbox isolation with automatic per-step fault injection
- [x] 3-tier learning progression with spaced repetition (SM-2)
- [x] D3.js topology visualization (NVLink and InfiniBand fabric maps)
- [x] Spotlight tour, data-driven CLI framework, tab completion
- [x] CI/CD pipeline with 3,510 unit + 307 E2E tests, 0 TypeScript errors
- [x] Security hardening (secret scanning, error sanitization, rate limiting)
- [x] Bundle splitting (main chunk reduced from 2,304 kB to 1,077 kB)
- [x] E2E tests with Playwright (307 tests across 7 spec files)
- [x] Inline MissionCard with click-to-paste commands, quiz gating, and mount animation
- [x] nvidia-smi ERR! display for Critical GPU health status

### Up Next

- [ ] PWA / offline support for study on the go
- [ ] Live incident engine improvements (sidebar visibility, hint penalties)

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full roadmap with priorities and details.

---

## Contributing

Contributions welcome! Priority areas:

1. **Exam questions** — especially Domains 4 and 5
2. **Scenario authoring** — new story-driven labs
3. **Command accuracy** — validated against real DGX output
4. **Accessibility** — keyboard navigation, screen reader support

```bash
git checkout -b feature/your-feature
# make changes
npm run test:run && npm run lint
git commit -m 'Add your feature'
git push origin feature/your-feature
# Open a Pull Request
```

---

## Legal Disclaimer

NVIDIA, the NVIDIA logo, DGX, DGX A100, DGX H100, DGX H200, DGX B200, DGX GB200, A100, H100, H200, B200, GB200, Vera, Rubin, NVLink, NVSwitch, InfiniBand, Mellanox, ConnectX, BlueField, CUDA, DCGM, NCCL, and NVSM are trademarks and/or registered trademarks of **NVIDIA Corporation** in the United States and other countries.

This project is an **independent, community-built educational tool** and is **not** developed, endorsed, certified, or affiliated with NVIDIA Corporation in any way. The NCP-AII certification exam is administered solely by NVIDIA, and this simulator makes no guarantees about exam content, accuracy, or outcomes.

All simulated command outputs, hardware specifications, and diagnostic data are approximations created for **educational purposes only** and may not reflect the exact behavior of real NVIDIA hardware or software. Users should always refer to official NVIDIA documentation for authoritative technical information.

This software is provided **"as is" without warranty of any kind**, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of this software.

All other trademarks referenced herein are the property of their respective owners. Slurm is a trademark of SchedMD LLC. Linux is a registered trademark of Linus Torvalds. Docker is a trademark of Docker, Inc.

---

## Acknowledgments

- [Claude Code](https://www.anthropic.com/claude-code) (Anthropic's Claude Opus 4.6) — AI pair-programming partner throughout development
- NVIDIA for comprehensive datacenter documentation
- The open-source community for xterm.js, React, Vite, D3.js, and Zustand

---

<div align="center">

**Built for AI Infrastructure Engineers by [Sean Woods](https://www.linkedin.com/in/sean-m-woods/)**

[Live Demo](https://www.dclabsim.com) · [Get Started](#quick-start) · [Report Bug](https://github.com/Seanbo5386/dc-lab-sim/issues)

</div>
