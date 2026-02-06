# CLAUDE.md - Project Context for AI Assistants

This file provides essential context about the NVIDIA AI Infrastructure Certification Simulator codebase.

## Project Overview

A browser-based training environment for the NCP-AII certification exam. Users practice datacenter commands in a simulated terminal with realistic output, guided scenarios, and comprehensive learning features.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, TailwindCSS, xterm.js, D3.js

## Key Directories

```
src/
├── components/          # React UI components
├── simulators/          # Command output simulators
├── data/                # JSON data files + scenarios
├── store/               # Zustand state management
├── utils/               # Business logic utilities
└── types/               # TypeScript definitions
```

## Learning System Architecture

The codebase has a comprehensive learning system that transforms step-following labs into a command mastery learning experience.

### Command Families (6 Total)

| Family ID          | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `gpu-monitoring`   | nvidia-smi, nvsm, dcgmi, nvtop           |
| `infiniband-tools` | ibstat, ibdiagnet, iblinkinfo, perfquery |
| `bmc-hardware`     | ipmitool, sensors, dmidecode             |
| `cluster-tools`    | sinfo, squeue, scontrol, sacct           |
| `container-tools`  | docker, enroot, pyxis                    |
| `diagnostics`      | dcgmi diag, nvidia-bug-report, gpu-burn  |

### Tier Progression (3 Tiers)

- **Tier 1 (Guided):** Tool specified, expected commands shown
- **Tier 2 (Choice):** Problem area identified, user picks tools
- **Tier 3 (Realistic):** Symptom only, no hints, full diagnosis

### Key Files

#### Stores

- `src/store/learningProgressStore.ts` - Quiz scores, tool usage, tier unlocks, spaced repetition
- `src/store/tierNotificationStore.ts` - Tier unlock notification state

#### Utilities

- `src/utils/spacedRepetition.ts` - SM-2 algorithm for review scheduling
- `src/utils/tierProgressionEngine.ts` - Tier unlock logic and progress tracking

#### Data Files

- `src/data/commandFamilies.json` - 6 families with tools, taglines, best-for scenarios
- `src/data/quizQuestions.json` - "Which tool?" quiz questions (4 per family)
- `src/data/explanationGates.json` - Post-scenario conceptual checks (56 gates)
- `src/data/narrativeScenarios.json` - 28 narrative scenarios with story-driven steps and quizzes

#### Components

- `src/components/LearningPaths.tsx` - Main Learn/Practice/Test tab interface
- `src/components/CommandFamilyCards.tsx` - Tool reference cards with progress
- `src/components/WhichToolQuiz.tsx` - Quiz component for command selection
- `src/components/ExplanationGate.tsx` - Post-scenario knowledge check
- `src/components/SpacedReviewDrill.tsx` - 2-minute retention drill popup
- `src/components/ExamGauntlet.tsx` - Timed random scenario testing
- `src/components/ProgressRing.tsx` - SVG circular progress indicators

## Exam Domain Weights

The simulator follows NCP-AII exam blueprint:

| Domain | Title                            | Weight |
| ------ | -------------------------------- | ------ |
| 1      | Systems and Server Bring-Up      | 31%    |
| 2      | Physical Layer Management        | 5%     |
| 3      | Control Plane Installation       | 19%    |
| 4      | Cluster Test and Verification    | 33%    |
| 5      | Troubleshooting and Optimization | 12%    |

## Testing Patterns

### Vitest with React Testing Library

```typescript
// Standard mock pattern for Zustand stores with selectors
vi.mock("../../store/learningProgressStore", () => ({
  useLearningProgressStore: vi.fn((selector?) =>
    selector ? selector(mockState) : mockState,
  ),
}));
```

### Test Files

- `src/components/__tests__/` - Component unit tests
- `src/store/__tests__/` - Store unit tests
- `src/utils/__tests__/` - Utility unit tests
- `src/data/__tests__/` - Data validation tests

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Watch mode tests
npm run test:run     # Single test run
npm run lint         # ESLint check
```

## Narrative Scenario JSON Schema

```typescript
interface NarrativeScenario {
  id: string; // "domain1-midnight-deployment"
  domain: 1 | 2 | 3 | 4 | 5;
  title: string;
  narrative: { hook: string; setting: string; resolution: string };
  commandFamilies: string[];
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: NarrativeStep[];
}

interface NarrativeStep {
  id: string;
  situation: string;
  task: string;
  expectedCommands: string[];
  hints: string[];
  validation: { type: string; command?: string; pattern?: string };
  quiz?: NarrativeQuiz;
}
```

## Progress Tracking

The `learningProgressStore` tracks:

- `quizScores`: Record<familyId, {attempts, passed, bestScore}>
- `toolUsage`: Record<familyId, string[]> (tools used in each family)
- `tierProgress`: Record<scenarioId, 1|2|3> (highest tier completed)
- `reviewSchedule`: Record<familyId, {nextReviewDate, interval, consecutiveSuccesses}>

## Styling Conventions

- Dark theme using TailwindCSS
- Primary colors: `nvidia-green` (#76B900), `nvidia-dark` backgrounds
- All UI text uses Tailwind utility classes
- Progress indicators use color progression: red (<30%) → yellow (30-70%) → green (>70%)

## Architecture Notes

1. **Zustand stores** use persist middleware for localStorage
2. **Scenarios** are loaded lazily from JSON files
3. **Terminal** uses xterm.js with custom command routing
4. **Visualizations** use D3.js for network/topology graphs
5. **Tests** run with Vitest + jsdom + React Testing Library
