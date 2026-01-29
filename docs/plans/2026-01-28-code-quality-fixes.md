# Code Quality Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 102 ESLint errors and warnings to achieve a clean `npm run lint` pass.

**Architecture:** Systematic file-by-file fixes organized by error type. We'll fix the simplest issues first (let→const, unused variables, useless escapes), then address type safety (any→proper types), then structural issues (case block declarations), and finally the complex React hook dependency warnings.

**Tech Stack:** TypeScript, React, ESLint with @typescript-eslint rules

---

## Task 1: Auto-fixable Issues

**Files:**
- Multiple files with `let` that should be `const`
- Test files with useless escape characters

**Step 1: Run ESLint auto-fix**

```bash
npm run lint -- --fix
```

**Step 2: Verify auto-fix results**

```bash
npm run lint 2>&1 | head -20
```

Expected: 7 errors auto-fixed (prefer-const, no-useless-escape)

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: apply ESLint auto-fixes (let→const, escape chars)"
```

---

## Task 2: Remove Unused Variables in Components

**Files:**
- Modify: `src/components/Terminal.tsx:45`
- Modify: `src/components/MIGConfigurator.tsx:51`
- Modify: `src/components/SplitPane.tsx:42`
- Modify: `src/components/StudyModes.tsx:47,53`
- Modify: `src/components/TopologyViewer.tsx:53`

**Step 1: Fix Terminal.tsx - remove _currentCommand**

Change line 45 from:
```typescript
const [_currentCommand, setCurrentCommand] = useState('');
```
to:
```typescript
const [, setCurrentCommand] = useState('');
```

**Step 2: Fix MIGConfigurator.tsx - remove _selectedProfile**

Change line 51 from:
```typescript
const [_selectedProfile, setSelectedProfile] = useState<MIGProfile | null>(null);
```
to:
```typescript
const [, setSelectedProfile] = useState<MIGProfile | null>(null);
```

**Step 3: Fix SplitPane.tsx - remove _resizing and _setResizing**

Change line 42 from:
```typescript
const [_resizing, _setResizing] = useState(false);
```
to (remove the line entirely since neither is used):
```typescript
// Remove entirely - resizing state not needed
```

**Step 4: Fix StudyModes.tsx - remove _selectedDomain and _setCommandsUsed**

Change line 47 from:
```typescript
const [_selectedDomain, setSelectedDomain] = useState<string | null>(null);
```
to:
```typescript
const [, setSelectedDomain] = useState<string | null>(null);
```

Change line 53 from:
```typescript
const [commandsUsed, _setCommandsUsed] = useState<string[]>([]);
```
to:
```typescript
const [commandsUsed] = useState<string[]>([]);
```

**Step 5: Fix TopologyViewer.tsx - remove _setDataFlowPath**

Change line 53 from:
```typescript
const [dataFlowPath, _setDataFlowPath] = useState<string[]>([]);
```
to:
```typescript
const [dataFlowPath] = useState<string[]>([]);
```

**Step 6: Run lint to verify**

```bash
npm run lint 2>&1 | grep -c "unused"
```

Expected: Count reduced significantly

**Step 7: Commit**

```bash
git add src/components/Terminal.tsx src/components/MIGConfigurator.tsx src/components/SplitPane.tsx src/components/StudyModes.tsx src/components/TopologyViewer.tsx
git commit -m "fix: remove unused variables in React components"
```

---

## Task 3: Remove Unused Variables in Utils/Tests

**Files:**
- Modify: `src/utils/terminalKeyboardHandler.ts:264`
- Modify: `src/utils/__tests__/studyModeEngine.test.ts:1`
- Modify: `src/utils/__tests__/terminalSplitManager.test.ts:24`
- Modify: `src/simulators/nvsmSimulator.ts:126`

**Step 1: Fix terminalKeyboardHandler.ts**

Line 264 - find and fix the unused `_currentNode`:
```typescript
// Change destructuring to omit unused variable
```

**Step 2: Fix studyModeEngine.test.ts**

Line 1 - remove `beforeEach` from import if not used:
```typescript
import { describe, it, expect } from 'vitest';
```

**Step 3: Fix terminalSplitManager.test.ts**

Line 24 - remove `TerminalSplitState` from import if not used.

**Step 4: Fix nvsmSimulator.ts**

Line 126 - remove unused `ids2` variable.

**Step 5: Run lint to verify**

```bash
npm run lint 2>&1 | grep "unused"
```

**Step 6: Commit**

```bash
git add src/utils/ src/simulators/nvsmSimulator.ts
git commit -m "fix: remove unused variables in utils and simulators"
```

---

## Task 4: Fix Case Block Declarations

**Files:**
- Modify: `src/components/PerformanceComparison.tsx:88`
- Modify: `src/simulators/fabricManagerSimulator.ts:156`
- Modify: `src/utils/examEngine.ts:144,155`
- Modify: `src/utils/outputTemplates.ts:42,43`
- Modify: `src/utils/studyModeEngine.ts:387,396`

**Step 1: Fix PerformanceComparison.tsx**

Wrap case block in braces at line 88:
```typescript
case 'bandwidth': {
  const activeLinks = gpu.nvlinks.filter(l => l.status === 'Active').length;
  actual = (activeLinks / gpu.nvlinks.length) * baseline.expected * (0.9 + Math.random() * 0.15);
  break;
}
```

**Step 2: Fix fabricManagerSimulator.ts**

Wrap case block in braces at line 156.

**Step 3: Fix examEngine.ts**

Wrap case blocks in braces at lines 144 and 155:
```typescript
case 'weak-area-focus': {
  // code...
  break;
}

case 'review-mode': {
  // code...
  break;
}
```

**Step 4: Fix outputTemplates.ts**

Wrap case block in braces at lines 42-43:
```typescript
case 'nvidia-smi': {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[timestamp.getDay()]} ...`;
}
```

**Step 5: Fix studyModeEngine.ts**

Wrap case blocks in braces at lines 387 and 396:
```typescript
case 'timed-practice': {
  const timedConfig = createExamConfig('full-practice');
  // ...
  break;
}

case 'review-mode': {
  const reviewSet = new Set(options.incorrectQuestionIds);
  // ...
  break;
}
```

**Step 6: Run lint to verify**

```bash
npm run lint 2>&1 | grep "case block"
```

Expected: 0 matches

**Step 7: Commit**

```bash
git add src/components/PerformanceComparison.tsx src/simulators/fabricManagerSimulator.ts src/utils/examEngine.ts src/utils/outputTemplates.ts src/utils/studyModeEngine.ts
git commit -m "fix: wrap case blocks with lexical declarations in braces"
```

---

## Task 5: Fix `any` Types in Components

**Files:**
- Modify: `src/components/FaultInjection.tsx:323`
- Modify: `src/components/MetricsChart.tsx:31`
- Modify: `src/components/PerformanceComparison.tsx:257`

**Step 1: Fix FaultInjection.tsx**

Line 323 - change:
```typescript
onChange={(e) => setWorkloadPattern(e.target.value as any)}
```
to:
```typescript
onChange={(e) => setWorkloadPattern(e.target.value as 'idle' | 'inference' | 'training' | 'stress')}
```

**Step 2: Fix MetricsChart.tsx**

Line 31 - define proper type for chartData:
```typescript
interface ChartDataPoint {
  time: string;
  utilization: number;
  temperature: number;
  power: number;
  memory: number;
}
const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
```

**Step 3: Fix PerformanceComparison.tsx**

Line 257 - define proper Recharts tooltip type:
```typescript
import { TooltipProps } from 'recharts';

// In formatter:
formatter={(value: number, name: string, props: { payload: { efficiency: number } }) => {
```

**Step 4: Run lint to verify component `any` fixes**

```bash
npm run lint 2>&1 | grep "components" | grep "any"
```

**Step 5: Commit**

```bash
git add src/components/FaultInjection.tsx src/components/MetricsChart.tsx src/components/PerformanceComparison.tsx
git commit -m "fix: replace any types with proper types in components"
```

---

## Task 6: Fix `any` Types in Simulators

**Files:**
- Modify: `src/simulators/benchmarkSimulator.ts` (8 occurrences)
- Modify: `src/simulators/mellanoxSimulator.ts` (2 occurrences)
- Modify: `src/simulators/nvlinkAuditSimulator.ts` (12 occurrences)
- Modify: `src/simulators/nvsmSimulator.ts` (7 occurrences)

**Step 1: Identify patterns in benchmarkSimulator.ts**

Read the file to understand what types are needed for lines 252, 259, 273, 291, 303, 313, 325.

**Step 2: Define proper types for benchmark results**

Create interfaces for benchmark data structures.

**Step 3: Fix mellanoxSimulator.ts**

Lines 193, 539 - define proper device types.

**Step 4: Fix nvlinkAuditSimulator.ts**

Lines 92, 141, 143, 210, 227, 246, 290, 299, 301, 306 - define proper audit types.

**Step 5: Fix nvsmSimulator.ts**

Lines 185, 190, 211, 224, 237, 458, 478 - define proper NVSM types.

**Step 6: Run lint to verify**

```bash
npm run lint 2>&1 | grep "simulators" | grep "any"
```

**Step 7: Commit**

```bash
git add src/simulators/
git commit -m "fix: replace any types with proper types in simulators"
```

---

## Task 7: Fix `any` Types in Utils

**Files:**
- Modify: `src/utils/commandRegistry.ts:261`
- Modify: `src/utils/commandValidator.ts:207`

**Step 1: Fix commandRegistry.ts**

Line 261 - define proper command handler type.

**Step 2: Fix commandValidator.ts**

Line 207 - define proper validation result type.

**Step 3: Run lint to verify**

```bash
npm run lint 2>&1 | grep "utils" | grep "any"
```

**Step 4: Commit**

```bash
git add src/utils/commandRegistry.ts src/utils/commandValidator.ts
git commit -m "fix: replace any types with proper types in utils"
```

---

## Task 8: Fix `any` Types in Test Files

**Files:**
- Modify: `src/components/__tests__/TopologyViewer.test.tsx` (3 occurrences)
- Modify: `src/simulators/__tests__/dcgmiSimulator.test.ts`
- Modify: `src/simulators/__tests__/nvidiaSmiSimulator.test.ts`

**Step 1: Fix TopologyViewer.test.tsx**

Lines 23, 34, 46 - use proper mock types or `unknown`.

**Step 2: Fix dcgmiSimulator.test.ts**

Line 94 - use proper simulator result type.

**Step 3: Fix nvidiaSmiSimulator.test.ts**

Line 258 - use proper simulator result type.

**Step 4: Run lint to verify**

```bash
npm run lint 2>&1 | grep "__tests__" | grep "any"
```

**Step 5: Commit**

```bash
git add src/components/__tests__/ src/simulators/__tests__/
git commit -m "fix: replace any types with proper types in tests"
```

---

## Task 9: Fix Control Character Regex Warnings

**Files:**
- Modify: `src/simulators/bcmSimulator.ts:170,253`
- Modify: `src/simulators/dcgmiSimulator.ts:213`
- Modify: `src/utils/__tests__/syntaxHighlighter.test.ts:190`

**Step 1: Review bcmSimulator.ts regex usage**

These regexes use `\x1b` to match ANSI escape codes. This is intentional for stripping terminal colors.

**Step 2: Add eslint-disable comment for intentional control chars**

```typescript
// eslint-disable-next-line no-control-regex
const stripAnsi = /\x1b\[[0-9;]*m/g;
```

**Step 3: Apply same pattern to dcgmiSimulator.ts and test file**

**Step 4: Run lint to verify**

```bash
npm run lint 2>&1 | grep "control"
```

**Step 5: Commit**

```bash
git add src/simulators/bcmSimulator.ts src/simulators/dcgmiSimulator.ts src/utils/__tests__/syntaxHighlighter.test.ts
git commit -m "fix: add eslint-disable for intentional ANSI control char regex"
```

---

## Task 10: Fix React Hook Dependencies

**Files:**
- Modify: `src/components/ExamWorkspace.tsx:94`
- Modify: `src/components/PracticalExams.tsx:73`
- Modify: `src/components/StudyModes.tsx:89`
- Modify: `src/components/Terminal.tsx:826`

**Step 1: Fix ExamWorkspace.tsx useEffect**

The useEffect at line 94 is missing `examTimer`, `handleTimeExpired`, and `startExam`. Wrap callbacks in useCallback:

```typescript
const handleTimeExpired = useCallback(() => {
  handleSubmitExam();
}, [handleSubmitExam]);

const startExam = useCallback(async () => {
  // existing code
}, [/* deps */]);
```

Then update the useEffect dependency array.

**Step 2: Fix PracticalExams.tsx useEffect**

Line 73 - wrap `handleTimeUp` in useCallback and add to deps.

**Step 3: Fix StudyModes.tsx useEffect**

Line 89 - wrap `handleSessionComplete` in useCallback and add to deps.

**Step 4: Fix Terminal.tsx useEffect**

Line 826 - this is intentionally run once on mount. Add eslint-disable comment:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Step 5: Run lint to verify all hook warnings resolved**

```bash
npm run lint 2>&1 | grep "exhaustive-deps"
```

Expected: 0 matches

**Step 6: Commit**

```bash
git add src/components/ExamWorkspace.tsx src/components/PracticalExams.tsx src/components/StudyModes.tsx src/components/Terminal.tsx
git commit -m "fix: resolve React hook dependency warnings"
```

---

## Task 11: Final Verification

**Step 1: Run full lint check**

```bash
npm run lint
```

Expected: Clean exit with no errors or warnings

**Step 2: Run tests to ensure no regressions**

```bash
npm test
```

Expected: All tests pass

**Step 3: Commit any remaining fixes**

```bash
git status
git add -A
git commit -m "fix: final lint cleanup"
```

---

## Summary

| Task | Type | Files | Est. Changes |
|------|------|-------|--------------|
| 1 | Auto-fix | Multiple | 7 auto-fixes |
| 2 | Unused vars | 5 components | 6 changes |
| 3 | Unused vars | 4 utils/tests | 4 changes |
| 4 | Case blocks | 5 files | 8 case wraps |
| 5 | any→types | 3 components | 3 type fixes |
| 6 | any→types | 4 simulators | 29 type fixes |
| 7 | any→types | 2 utils | 2 type fixes |
| 8 | any→types | 3 test files | 5 type fixes |
| 9 | Control regex | 3 files | 4 eslint-disable |
| 10 | Hook deps | 4 components | 4 useCallback wraps |
| 11 | Verify | All | Final check |

**Total: 102 issues across ~30 files**
