# CLAUDE.md - Data Center Lab Simulator

## Project Overview

Browser-based training environment for the NVIDIA NCP-AII certification exam. Users practice datacenter commands in a simulated terminal (xterm.js) with realistic output from a virtual 8-node DGX SuperPOD (64 GPUs). Story-driven scenarios, fault injection, tiered learning progression, and spaced repetition (SM-2) replace static flashcards with hands-on muscle memory.

**Live site:** https://www.dclabsim.com
**Repo:** https://github.com/Seanbo5386/dc-lab-sim
**License:** MIT

## Tech Stack

| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| UI            | React 18, TypeScript (strict), TailwindCSS, Lucide icons |
| Terminal      | xterm.js (FitAddon + WebLinksAddon)                      |
| State         | Zustand 4 with persist middleware (localStorage)         |
| Visualization | D3.js (topology), Recharts (metrics)                     |
| Auth & Sync   | AWS Amplify Gen 2 (Cognito + DynamoDB) -- optional       |
| Build         | Vite 5, path alias `@` -> `./src`                        |
| Testing       | Vitest + React Testing Library (unit), Playwright (E2E)  |
| Lint/Format   | ESLint, Prettier, Husky + lint-staged pre-commit         |

## Common Commands

```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # tsc + vite build -> dist/
npm run preview          # Preview production build
npm run lint             # ESLint (0 errors, 0 warnings expected)
npm run test             # Vitest watch mode
npm run test:run         # Single test run (~3,500 unit tests)
npm run test:coverage    # Coverage report (target: 90% lines, 95% functions)
npm run test:e2e         # Playwright E2E (~307 tests)
npm run test:e2e:ui      # Playwright interactive UI
```

Pre-commit hook (Husky + lint-staged) auto-runs ESLint and Prettier on staged `.ts`/`.tsx`/`.json`/`.md` files.

## Project Structure

```
src/
├── components/          # ~75 React components (functional only)
│   └── __tests__/       # Component unit tests
├── simulators/          # 23 command-output simulators + BaseSimulator
│   └── __tests__/       # Simulator unit tests
├── cli/                 # Data-driven CLI framework (command routing, validation)
│   └── __tests__/       # CLI unit tests
├── store/               # 7 Zustand stores with persist middleware
│   └── __tests__/       # Store unit tests
├── data/                # JSON scenario/question/command data + TS hardware specs
│   └── output/          # 180+ JSON command definitions by category
├── hooks/               # 9 custom React hooks
├── utils/               # ~40 utility modules (learning, parsing, terminal)
│   └── __tests__/       # Utility unit tests
├── types/               # 9 TypeScript definition files
├── styles/              # TailwindCSS utilities
├── App.tsx              # Root: 5-tab layout + modal/overlay orchestration
└── main.tsx             # Entry point
tests/
└── e2e/                 # Playwright E2E specs
amplify/                 # AWS Amplify Gen 2 backend (auth + data)
```

## Architecture

### App Layout (App.tsx)

Two modes:

- **Normal mode**: AppHeader (5 tabs) + main content + footer + optional sidebars
- **Mission mode**: MissionModeBar + SimulatorView (full-screen terminal with instruction panel)

**Tabs:** `simulator` | `labs` | `exams` | `reference` | `about`

Non-default views are lazy-loaded with `React.lazy()` + `Suspense`.

**Overlay system** (z-ordered modals):
MissionBriefing, NarrativeResolution, ExamWorkspace, IncidentWorkspace, AfterActionReview, ExamGauntlet, StudyDashboard, SpacedReviewDrill, WhichToolQuiz, ToolMasteryQuiz, XIDDrillQuiz, SpotlightTour, WelcomeScreen, ConfirmModal

**Toast notifications:** FaultToast, SyncToast, AuthToast, TierUnlockNotification

### Simulator Pattern

All simulators extend `BaseSimulator`:

```
BaseSimulator (abstract)
├── execute(args: string[]): CommandResult
├── getMetadata(): CommandMetadata
├── Command registry (Map<string, CommandHandler>)
├── Error wrapping (try-catch)
└── State engine integration (prerequisites)
```

**23 simulators organized by domain:**

- GPU: nvidiaSmi, dcgmi, nvsm, benchmark, metrics
- Cluster: slurm, container, clusterKit
- Networking: infiniband, mellanox, nemo, fabricManager
- Hardware/BMC: ipmitool, bcm, sensor, pciTools
- System: linuxUtils, storage, nvidiaBugReport, nvlinkAudit

Command routing: user input -> `commandRouter.ts` -> appropriate simulator -> formatted output

### CLI Framework

Declarative JSON command definitions in `src/data/output/` (180+ files across categories like `gpu_management`, `cluster_management`, `networking`).

Key files:

- `CommandDefinitionLoader.ts` -- lazy-loads JSON via Vite glob import
- `CommandDefinitionRegistry.ts` -- in-memory lookup for validation/help
- `commandRouter.ts` -- routes parsed input to correct simulator
- `StateEngine.ts` -- checks command prerequisites
- `CommandExerciseGenerator.ts` -- generates practice exercises from definitions

### State Management (Zustand)

All stores use `persist` middleware with localStorage:

| Store                   | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `simulationStore`       | Cluster state, scenarios, quiz results, faults, active jobs |
| `learningProgressStore` | Quiz scores, tool usage, tier progress, spaced repetition   |
| `scenarioContext`       | Active scenario step state during missions                  |
| `learningStore`         | Generic learning state (complements learningProgressStore)  |
| `authToastStore`        | Auth notification queue                                     |
| `faultToastStore`       | Fault injection notification queue                          |
| `syncToastStore`        | Cloud sync status notifications                             |
| `tierNotificationStore` | Tier unlock notifications with family metadata              |

**Zustand mock pattern** (used throughout tests):

```typescript
vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn((selector?) =>
    selector ? selector(mockState) : mockState,
  ),
}));
```

### Data Architecture

| File                       | Content                                             |
| -------------------------- | --------------------------------------------------- |
| `commandFamilies.json`     | 7 families (gpu-monitoring, infiniband-tools, etc.) |
| `narrativeScenarios.json`  | 32+ narrative scenarios with steps, quizzes, faults |
| `examQuestions.json`       | 199 multiple-choice exam questions by domain        |
| `explanationGates.json`    | 57 post-scenario conceptual checks                  |
| `quizQuestions.json`       | "Which tool?" quiz questions (per family)           |
| `hardwareSpecs.ts`         | DGX specs for A100/H100/H200/B200/GB200/VR200       |
| `incidentTemplates.ts`     | Live incident diagnosis templates                   |
| `faultPropagationRules.ts` | How faults cascade across cluster                   |

### Scenario Schema

```typescript
interface NarrativeScenario {
  id: string; // "domain1-midnight-deployment"
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  narrative: { hook: string; setting: string; resolution: string };
  commandFamilies: string[];
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  tier: 1 | 2 | 3;
  steps: NarrativeStep[];
  faults?: FaultInjectionConfig[];
}

interface NarrativeStep {
  id: string;
  situation: string;
  task: string;
  expectedCommands: string[];
  hints: string[];
  autoFaults?: FaultInjectionConfig[];
  validation: { type: string; command?: string; pattern?: string };
  narrativeQuiz?: NarrativeQuiz;
}
```

Scenarios run in **sandboxed isolation** -- faults and mutations never leak to other scenarios or global cluster state.

## Learning System

### Command Families (7)

`gpu-monitoring`, `infiniband-tools`, `bmc-hardware`, `cluster-tools`, `container-tools`, `diagnostics`, `xid-diagnostics`

### Tier Progression (3 tiers)

- **Tier 1 (Guided):** Tool specified, expected commands shown
- **Tier 2 (Choice):** Problem area identified, user picks tools
- **Tier 3 (Realistic):** Symptom only, no hints, full diagnosis

Unlock logic in `tierProgressionEngine.ts`.

### Spaced Repetition

SM-2 algorithm in `spacedRepetition.ts` schedules review drills based on:

- `reviewSchedule`: Record<familyId, {nextReviewDate, interval, consecutiveSuccesses}>

### Progress Tracking (learningProgressStore)

- `quizScores`: Record<familyId, {attempts, passed, bestScore}>
- `toolUsage`: Record<familyId, string[]>
- `tierProgress`: Record<scenarioId, 1|2|3>
- `unlockedTiers`: Record<familyId, 1|2|3>

## Exam Domain Weights (NCP-AII Blueprint)

| Domain | Title                            | Weight |
| ------ | -------------------------------- | ------ |
| 1      | Systems and Server Bring-Up      | 31%    |
| 2      | Physical Layer Management        | 5%     |
| 3      | Control Plane Installation       | 19%    |
| 4      | Cluster Test and Verification    | 33%    |
| 5      | Troubleshooting and Optimization | 12%    |

## Multi-Architecture Support

Switch from dashboard dropdown. All simulators, specs, and topologies adapt:

| System    | GPUs        | Memory      | NVLink             | Network       |
| --------- | ----------- | ----------- | ------------------ | ------------- |
| DGX A100  | 8x A100     | 80GB HBM2e  | 3rd-gen (12 links) | HDR 200Gb/s   |
| DGX H100  | 8x H100 SXM | 80GB HBM3   | 4th-gen (18 links) | NDR 400Gb/s   |
| DGX H200  | 8x H200 SXM | 141GB HBM3e | 4th-gen (18 links) | NDR 400Gb/s   |
| DGX B200  | 8x B200     | 192GB HBM3e | 5th-gen (18 links) | NDR 400Gb/s   |
| DGX GB200 | 8x GB200    | 192GB HBM3e | 5th-gen (18 links) | XDR 800Gb/s   |
| DGX VR200 | 8x R200     | 288GB HBM4  | 6th-gen (18 links) | XDR2 1600Gb/s |

## Styling Conventions

- Dark theme with TailwindCSS utility classes
- Custom colors: `nvidia-green` (#76B900), `nvidia-darkgreen`, `nvidia-black`, `nvidia-gray`
- Font: JetBrains Mono
- Conditional classes via `clsx` + `tailwind-merge`
- Progress color: red (<30%) -> yellow (30-70%) -> green (>70%)
- No inline styles; use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)

## Testing Patterns

### Unit Tests (Vitest + React Testing Library)

- Colocated in `__tests__/` directories adjacent to source
- File naming: `.test.ts` / `.test.tsx`
- Coverage targets (vitest.config.ts): 90% lines/statements, 95% functions, 85% branches
- Environment: jsdom with setup file at `src/__tests__/setup.ts`

### E2E Tests (Playwright)

- Located in `tests/e2e/`
- 3 viewport profiles: 1920x1080, 1366x768, 2560x1440
- Auto-starts dev server on http://localhost:5173
- Trace on retry, screenshot on failure

### Data Validation Tests

- `src/data/__tests__/` validates JSON schema integrity for scenarios, questions, and command definitions

## Cloud Sync (Optional)

AWS Amplify Gen 2 backend in `amplify/`:

- **Auth:** Cognito user pool (email/password)
- **Data models:** UserProgress (simulationData, learningProgress) + Feedback (category, message)
- **Owner-based authorization:** each user only sees own data
- App works fully offline without backend -- auth calls fail silently

## Key Utilities

| File                       | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `commandParser.ts`         | Parse user terminal input into structured tokens  |
| `commandValidator.ts`      | Validate commands against definitions             |
| `scenarioLoader.ts`        | Load and initialize scenario with fault injection |
| `spacedRepetition.ts`      | SM-2 algorithm for review scheduling              |
| `tierProgressionEngine.ts` | Tier unlock logic and progress tracking           |
| `clusterFactory.ts`        | Build cluster state for given architecture        |
| `cloudSync.ts`             | Amplify sync orchestration                        |
| `tabCompletion.ts`         | Terminal tab completion engine                    |
| `pipeHandler.ts`           | Shell pipe operator support                       |
| `hintManager.ts`           | Context-aware hint generation during scenarios    |

## Conventions

- **Functional components only** -- no class components
- **Path aliases** -- use `@/` imports, not deep relative paths
- **One component per file**, PascalCase naming
- **Conventional Commits** -- `feat(scope):`, `fix(scope):`, etc.
- **Branch naming** -- `feature/`, `fix/`, `refactor/`, `docs/`, `test/`
- **No `any` type** -- use proper types or `unknown`
- **No `console.log`** -- use logger utility
- **Version** injected from package.json via `VITE_APP_VERSION`
- **Chunk splitting** -- d3, recharts, xterm, amplify are manual chunks in vite.config.ts

## Development Workflow

1. Run `npm run dev` to start
2. Make changes with hot reload
3. Run `npm run test:run && npm run lint` before committing
4. Build with `npm run build` to verify no TypeScript errors
5. Husky pre-commit hook enforces lint + format on staged files

See `.claude/CLAUDE.md` for bug-fixing and task-focus guidelines.
See `CONTRIBUTING.md` for PR process, code review checklist, and branch conventions.
