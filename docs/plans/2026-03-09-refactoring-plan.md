# Targeted Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve CI reliability, extract nvidia-smi display formatters into a testable module, and extract AppHeader from App.tsx.

**Architecture:** Three independent changes: (1) swap CI to `npm ci` with caching, (2) extract 18 pure formatter functions from nvidiaSmiSimulator class methods into standalone exports with a dispatch map, (3) extract header+nav JSX from App.tsx into an AppHeader component with clean props.

**Tech Stack:** GitHub Actions, TypeScript, React

---

### Task 1: Fix CI to use deterministic dependency resolution

**Files:**
- Modify: `.github/workflows/e2e-tests.yml`

**Step 1: Update the workflow**

In `.github/workflows/e2e-tests.yml`, make two changes:

1. Add `cache: 'npm'` to the `actions/setup-node@v4` step
2. Replace the install step `rm package-lock.json && npm install --force` with `npm ci`

The result should be:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
```

**Step 2: Verify package-lock.json exists and is current**

Run: `ls -la package-lock.json`

If it doesn't exist or is stale, run `npm install` locally to regenerate it.

**Step 3: Commit**

```bash
git add .github/workflows/e2e-tests.yml
git commit -m "fix: use npm ci with caching in CI workflow"
```

---

### Task 2: Create nvidiaSmiFormatters.ts with all 18 formatter functions

**Files:**
- Create: `src/simulators/nvidiaSmiFormatters.ts`
- Test: `src/simulators/__tests__/nvidiaSmiFormatters.test.ts`

**Step 1: Write tests for key formatters**

Create `src/simulators/__tests__/nvidiaSmiFormatters.test.ts`. Test at least 4 representative formatters that cover the main patterns (uses gpu fields, uses node param, uses eccErrors, static output):

```typescript
import { describe, it, expect } from "vitest";
import {
  formatDisplayMemory,
  formatDisplayECC,
  formatDisplayTemperature,
  formatDisplayPids,
  DISPLAY_FORMATTERS,
} from "../nvidiaSmiFormatters";
import type { GPU, DGXNode } from "@/types/hardware";

// Minimal GPU fixture matching the GPU type
const makeGpu = (overrides?: Partial<GPU>): GPU =>
  ({
    id: 0,
    type: "NVIDIA A100-SXM4-80GB",
    memoryTotal: 81920,
    memoryUsed: 40960,
    utilization: 50,
    temperature: 45,
    powerDraw: 300,
    powerLimit: 400,
    clocksSM: 1410,
    clocksMem: 1593,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: { singleBit: 0, doubleBit: 0 },
    },
    migMode: false,
    xidErrors: [],
    ...overrides,
  }) as unknown as GPU;

const makeNode = (systemType = "DGX-A100"): DGXNode =>
  ({ systemType }) as unknown as DGXNode;

describe("nvidiaSmiFormatters", () => {
  describe("formatDisplayMemory", () => {
    it("should include FB Memory and BAR1 sections", () => {
      const output = formatDisplayMemory(makeGpu(), makeNode());
      expect(output).toContain("FB Memory Usage");
      expect(output).toContain("BAR1 Memory Usage");
      expect(output).toContain("81920 MiB");
      expect(output).toContain("40960 MiB");
    });
  });

  describe("formatDisplayECC", () => {
    it("should show ECC enabled and error counts", () => {
      const gpu = makeGpu({
        eccErrors: {
          singleBit: 3,
          doubleBit: 1,
          aggregated: { singleBit: 5, doubleBit: 2 },
        },
      });
      const output = formatDisplayECC(gpu);
      expect(output).toContain("Enabled");
      expect(output).toContain("DRAM Correctable              : 3");
      expect(output).toContain("DRAM Uncorrectable            : 1");
    });
  });

  describe("formatDisplayTemperature", () => {
    it("should show current GPU temp and limits", () => {
      const output = formatDisplayTemperature(makeGpu({ temperature: 62 }));
      expect(output).toContain("GPU Current Temp                  : 62 C");
      expect(output).toContain("GPU Shutdown Temp                 : 90 C");
    });
  });

  describe("formatDisplayPids", () => {
    it("should show no processes", () => {
      const output = formatDisplayPids(makeGpu());
      expect(output).toContain("Processes");
      expect(output).toContain("None");
    });
  });

  describe("DISPLAY_FORMATTERS dispatch map", () => {
    it("should have entries for all 18 display types", () => {
      const expectedKeys = [
        "MEMORY", "UTILIZATION", "ECC", "TEMPERATURE", "POWER",
        "CLOCKS", "COMPUTE", "PIDS", "PERFORMANCE", "SUPPORTED_CLOCKS",
        "PAGE_RETIREMENT", "ACCOUNTING", "ENCODER_STATS",
        "SUPPORTED_GPU_TARGET_TEMP", "VOLTAGE", "FBC_STATS",
        "ROW_REMAPPER", "RESET_STATUS",
      ];
      for (const key of expectedKeys) {
        expect(DISPLAY_FORMATTERS).toHaveProperty(key);
        expect(typeof DISPLAY_FORMATTERS[key]).toBe("function");
      }
    });

    it("should return a string for each formatter", () => {
      const gpu = makeGpu();
      const node = makeNode();
      for (const [key, fn] of Object.entries(DISPLAY_FORMATTERS)) {
        const result = fn(gpu, node);
        expect(typeof result).toBe("string");
      }
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiFormatters.test.ts`

Expected: FAIL — module `../nvidiaSmiFormatters` does not exist.

**Step 3: Create nvidiaSmiFormatters.ts**

Create `src/simulators/nvidiaSmiFormatters.ts`. Copy all 18 `formatDisplay*` methods from `nvidiaSmiSimulator.ts` (lines 882-1115) as standalone exported functions. Each function keeps its exact same logic — the only change is removing `private` and `this.`:

```typescript
import type { GPU, DGXNode } from "@/types/hardware";
import { getHardwareSpecs } from "@/data/hardwareSpecs";

/**
 * Pure display formatter functions extracted from NvidiaSmiSimulator.
 * Each takes GPU data in, returns a formatted string out.
 */

export function formatDisplayMemory(gpu: GPU, node?: DGXNode): string {
  // ... exact same body as nvidiaSmiSimulator lines 883-898
}

export function formatDisplayUtilization(gpu: GPU, _node?: DGXNode): string {
  // ... exact same body as nvidiaSmiSimulator lines 902-910
}

// ... all 18 functions ...

export function formatDisplayResetStatus(gpu: GPU, _node?: DGXNode): string {
  // ... exact same body as nvidiaSmiSimulator lines 1110-1114
}

/**
 * Dispatch map: display type string → formatter function.
 * Used by handleDisplayFlag to replace the switch statement.
 */
export const DISPLAY_FORMATTERS: Record<string, (gpu: GPU, node?: DGXNode) => string> = {
  MEMORY: formatDisplayMemory,
  UTILIZATION: formatDisplayUtilization,
  ECC: formatDisplayECC,
  TEMPERATURE: formatDisplayTemperature,
  POWER: formatDisplayPower,
  CLOCKS: formatDisplayClocks,
  COMPUTE: formatDisplayCompute,
  PIDS: formatDisplayPids,
  PERFORMANCE: formatDisplayPerformance,
  SUPPORTED_CLOCKS: formatDisplaySupportedClocks,
  PAGE_RETIREMENT: formatDisplayPageRetirement,
  ACCOUNTING: formatDisplayAccounting,
  ENCODER_STATS: formatDisplayEncoderStats,
  SUPPORTED_GPU_TARGET_TEMP: formatDisplayTargetTemp,
  VOLTAGE: formatDisplayVoltage,
  FBC_STATS: formatDisplayFBCStats,
  ROW_REMAPPER: formatDisplayRowRemapper,
  RESET_STATUS: formatDisplayResetStatus,
};
```

**Important signature note:** All functions must accept `(gpu: GPU, node?: DGXNode)` even if they don't use `node`, so the dispatch map has a uniform signature. For functions that originally only took `gpu`, add `_node?: DGXNode` as a second parameter.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/simulators/__tests__/nvidiaSmiFormatters.test.ts`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiFormatters.ts src/simulators/__tests__/nvidiaSmiFormatters.test.ts
git commit -m "feat: extract nvidia-smi display formatters into standalone module"
```

---

### Task 3: Wire nvidiaSmiSimulator to use extracted formatters

**Files:**
- Modify: `src/simulators/nvidiaSmiSimulator.ts:1-10` (add import)
- Modify: `src/simulators/nvidiaSmiSimulator.ts:795-880` (replace switch with dispatch map)
- Modify: `src/simulators/nvidiaSmiSimulator.ts:882-1115` (delete 18 methods)

**Step 1: Add import and replace switch statement**

At the top of `nvidiaSmiSimulator.ts`, add:
```typescript
import { DISPLAY_FORMATTERS } from "@/simulators/nvidiaSmiFormatters";
```

In `handleDisplayFlag` (around line 816-876), replace the entire `for (const dtype of displayTypes) { switch ... }` block with:

```typescript
      for (const dtype of displayTypes) {
        const formatter = DISPLAY_FORMATTERS[dtype];
        if (formatter) {
          output += formatter(gpu, node);
        } else {
          output += `    Unknown display type: ${dtype}\n`;
        }
      }
```

**Step 2: Delete all 18 private formatDisplay methods**

Delete lines 882-1115 (from `private formatDisplayMemory` through the closing brace of `formatDisplayResetStatus`).

**Step 3: Run full test suite**

Run: `npm run test:run`

Expected: All 3,500+ tests pass. The existing integration tests for `nvidia-smi -d MEMORY`, `-d ECC`, etc. exercise the same code path through `execute()` → `handleDisplayFlag()` → `DISPLAY_FORMATTERS[dtype]()`.

**Step 4: Run lint**

Run: `npm run lint`

Expected: 0 errors, 0 warnings. If there are unused import warnings (e.g., `getHardwareSpecs` was only used by the deleted formatters), remove them.

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts
git commit -m "refactor: replace display formatter switch with dispatch map"
```

---

### Task 4: Create AppHeader component

**Files:**
- Create: `src/components/AppHeader.tsx`

**Step 1: Create the component file**

Create `src/components/AppHeader.tsx` that:
- Exports `type View = "simulator" | "labs" | "exams" | "reference" | "about"`
- Exports `AppHeader` component
- Imports its own icons from lucide-react: `Monitor`, `BookOpen`, `FlaskConical`, `GraduationCap`, `Play`, `Pause`, `RotateCcw`, `HelpCircle`, `Info`, `X`
- Imports `UserMenu` from `./UserMenu`
- Imports `ClusterConfig` from the types (check: `import type { ClusterConfig } from "@/types/hardware"`)

Props interface:
```typescript
interface AppHeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  cluster: ClusterConfig;
  isRunning: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onResetSimulation: () => void;
  onStartTour: () => void;
  dueReviewCount: number;
  onReviewClick: () => void;
  isLoggedIn: boolean;
  syncStatus: string;
  userEmail?: string;
  smallScreenDismissed: boolean;
  onDismissSmallScreen: () => void;
  sidebarOpen: boolean;
}
```

The component renders the exact JSX currently in App.tsx from the `{/* Skip Link */}` comment (line 315) through `{/* overflow-x-auto */}` (line 545). Cut-paste, replacing:
- `currentView` → `props.currentView`
- `setCurrentView(...)` → `props.onViewChange(...)`
- `isRunning ? stopSimulation : startSimulation` → `props.isRunning ? props.onStopSimulation : props.onStartSimulation`
- `resetSimulation` → `props.onResetSimulation`
- `handleStartTour` → `props.onStartTour`
- `setShowSpacedReviewDrill(true)` → `props.onReviewClick`
- `setSmallScreenDismissed(true)` → `props.onDismissSmallScreen`
- `smallScreenDismissed` → `props.smallScreenDismissed`
- `cluster` → `props.cluster`
- `isLoggedIn`, `syncStatus`, `userEmail` → from props
- The sidebar margin class condition `(showLabWorkspace && !activeScenario) || incidentState === "active"` → `props.sidebarOpen`
- `dueReviewCount` → `props.dueReviewCount`

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: create AppHeader component with header and nav"
```

---

### Task 5: Wire App.tsx to use AppHeader

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update imports**

Add:
```typescript
import { AppHeader, type View } from "./components/AppHeader";
```

Remove the local `type View` declaration (line 79).

Remove icon imports that are ONLY used in the header (line 60-71):
```typescript
// DELETE these:
import { Monitor, BookOpen, FlaskConical, GraduationCap, Play, Pause, RotateCcw, HelpCircle, Info, X } from "lucide-react";
```

Remove the `UserMenu` import (line 75) since it's now imported by AppHeader.

**Check before removing:** Verify none of these icons are used elsewhere in App.tsx outside the header block. Search for `<Monitor`, `<BookOpen`, `<FlaskConical`, etc. in the remaining JSX (lines 547+). If any are used elsewhere, keep that import.

**Step 2: Replace header JSX with AppHeader component**

Replace the block from `{/* Skip Link for Keyboard Navigation */}` (line 315) through `{/* overflow-x-auto */}` (line 545) with:

```tsx
          <AppHeader
            currentView={currentView}
            onViewChange={setCurrentView}
            cluster={cluster}
            isRunning={isRunning}
            onStartSimulation={startSimulation}
            onStopSimulation={stopSimulation}
            onResetSimulation={resetSimulation}
            onStartTour={handleStartTour}
            dueReviewCount={dueReviewCount}
            onReviewClick={() => setShowSpacedReviewDrill(true)}
            isLoggedIn={isLoggedIn}
            syncStatus={syncStatus}
            userEmail={userEmail}
            smallScreenDismissed={smallScreenDismissed}
            onDismissSmallScreen={() => setSmallScreenDismissed(true)}
            sidebarOpen={(showLabWorkspace && !activeScenario) || incidentState === "active"}
          />
```

**Step 3: Verify**

Run: `npm run lint && npm run test:run && npm run build`

Expected: 0 lint errors, all tests pass, clean build. Existing tests that query for `data-testid="nav-labs"` etc. should still find them since AppHeader renders the same DOM.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/AppHeader.tsx
git commit -m "refactor: extract AppHeader component from App.tsx"
```

---

### Task 6: Final verification

**Step 1: Run full verification suite**

```bash
npm run lint
npm run test:run
npm run build
```

Expected:
- 0 lint errors, 0 warnings
- All tests pass
- Clean production build

**Step 2: Verify file size reductions**

Check that:
- `nvidiaSmiSimulator.ts` dropped from ~1,943 to ~1,710 lines
- `App.tsx` dropped from ~789 to ~570 lines
- New files exist: `nvidiaSmiFormatters.ts` (~280 lines), `AppHeader.tsx` (~250 lines)

**Step 3: Final commit (if any polish needed)**

```bash
git add -A
git commit -m "chore: final verification after refactoring"
```

---

## Execution Order

```
Task 1: CI fix (independent, quick win)
Task 2: Create formatters module + tests (TDD)
Task 3: Wire simulator to use formatters (depends on Task 2)
Task 4: Create AppHeader component (independent of Tasks 2-3)
Task 5: Wire App.tsx to use AppHeader (depends on Task 4)
Task 6: Final verification (depends on all)
```

Tasks 1, 2, and 4 are independent and could be parallelized. Tasks 3 and 5 depend on their predecessors.
