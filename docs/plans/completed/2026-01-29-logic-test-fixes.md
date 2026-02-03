# Implementation Plan: Logic Test Fixes

## Overview

The Master Logic Test Suite identified 18 failing tests revealing actual logic gaps. This plan details the root cause and fix for each issue.

---

## Issue 1: Test Context Creation (Root Cause of Multiple Failures)

### Problem

The test file creates `CommandContext` incorrectly. The context type expects:

```typescript
interface CommandContext {
  currentNode: string; // Node ID like "dgx-00"
  currentPath: string;
  environment: Record<string, string>;
  history: string[];
}
```

But the test was creating:

```typescript
{
  currentNode: node,  // Wrong! This is the DGXNode object
  cluster: state.cluster,
  environment: {},
  workingDirectory: '/root',
}
```

### Fix Location

`src/__tests__/logicConsistency.test.ts` - `getContext()` function

### Fix

```typescript
function getContext(nodeId: string): CommandContext {
  return {
    currentNode: nodeId, // String, not object
    currentPath: "/root",
    environment: {},
    history: [],
  };
}
```

### Tests Fixed

- "Unable to determine current node" errors in dcgmi
- "Unable to determine current node" errors in nv-fabricmanager
- hostname returning undefined

---

## Issue 2: Slurm Simulator Routing

### Problem

The test calls `simulators.slurm.execute(parsed, context)` but SlurmSimulator's `execute()` method returns a generic error:

```typescript
execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
  return this.createError('Use specific Slurm commands: sinfo, squeue, scontrol...');
}
```

The actual commands are exposed as separate methods: `executeSinfo()`, `executeScontrol()`, etc.

### Fix Location

`src/__tests__/logicConsistency.test.ts` - `runCommand()` function

### Fix

Update the Slurm routing to call the specific methods:

```typescript
if (
  [
    "scontrol",
    "sinfo",
    "squeue",
    "sbatch",
    "scancel",
    "sacct",
    "srun",
  ].includes(baseCmd)
) {
  switch (baseCmd) {
    case "sinfo":
      return simulators.slurm.executeSinfo(parsed, context).output;
    case "squeue":
      return simulators.slurm.executeSqueue(parsed, context).output;
    case "scontrol":
      return simulators.slurm.executeScontrol(parsed, context).output;
    case "sbatch":
      return simulators.slurm.executeSbatch(parsed, context).output;
    case "scancel":
      return simulators.slurm.executeScancel(parsed, context).output;
    case "sacct":
      return simulators.slurm.executeSacct(parsed, context).output;
    case "srun":
      return simulators.slurm.executeSrun(parsed, context).output;
    default:
      return simulators.slurm.execute(parsed, context).output;
  }
}
```

### Tests Fixed

- sinfo output tests
- scontrol show nodes tests
- Slurm sync tests

---

## Issue 3: ECC Errors Structure in clearFaults

### Problem

The test's `clearFaults()` function uses flat structure:

```typescript
eccErrors: { singleBit: 0, doubleBit: 0, aggregatedSingleBit: 0, aggregatedDoubleBit: 0 }
```

But the correct structure (per `types/hardware.ts`) is nested:

```typescript
interface ECCErrors {
  singleBit: number;
  doubleBit: number;
  aggregated: {
    singleBit: number;
    doubleBit: number;
  };
}
```

### Fix Location

`src/__tests__/logicConsistency.test.ts` - `clearFaults()` function

### Fix

```typescript
function clearFaults(nodeId: string, gpuId: number): void {
  const state = useSimulationStore.getState();
  state.updateGPU(nodeId, gpuId, {
    healthStatus: "OK",
    xidErrors: [],
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: {
        singleBit: 0,
        doubleBit: 0,
      },
    },
    temperature: 45,
    powerDraw: 100,
    clocksSM: 1410,
    clocksMem: 1593,
    nvlinks: state.cluster.nodes
      .find((n) => n.id === nodeId)
      ?.gpus.find((g) => g.id === gpuId)
      ?.nvlinks.map((l) => ({
        ...l,
        status: "Active" as const,
        txErrors: 0,
        rxErrors: 0,
      })),
  });
}
```

### Tests Fixed

- nvidia-smi -q ECC output
- All tests that run after clearFaults

---

## Issue 4: Thermal Throttling Not Immediate

### Problem

The test expects thermal fault injection to immediately reduce `clocksSM`:

```typescript
it("should reduce SM clocks due to throttling", () => {
  const gpu = injectFault("dgx-00", 0, "thermal");
  expect(gpu.clocksSM).toBeLessThan(originalClocks); // FAILS: 1410 not < 1410
});
```

But `metricsSimulator.injectFault('thermal')` only sets temperature, not clocks:

```typescript
case 'thermal':
  return {
    ...gpu,
    temperature: 85,
    healthStatus: 'Warning',
    // NOTE: clocksSM NOT modified here
  };
```

The throttling formula only applies in `updateMetrics()` during the simulation cycle.

### Decision Point

Two options:

1. **Option A**: Update `injectFault('thermal')` to also apply clock throttling immediately
2. **Option B**: Update the test to understand throttling is gradual

### Recommended Fix (Option A)

Update `metricsSimulator.ts` to apply throttling at injection:

```typescript
case 'thermal':
  const thermalTemp = 85;
  const throttledClocks = Math.round(1410 - (thermalTemp - 70) * 10); // 1410 - 150 = 1260
  return {
    ...gpu,
    temperature: thermalTemp,
    clocksSM: throttledClocks,
    healthStatus: 'Warning',
  };
```

### Fix Location

`src/utils/metricsSimulator.ts` - `injectFault()` method, case 'thermal'

### Tests Fixed

- "should reduce SM clocks due to throttling"

---

## Issue 5: dcgmi health Output Doesn't Match Pattern

### Problem

Test expects dcgmi health to contain "critical|error|fail|warning" but output says "Unable to determine current node".

### Root Cause

This is Issue 1 - context not set correctly.

### Fix

Fixed by Issue 1 fix.

---

## Issue 6: sinfo Node Count Test

### Problem

Test expects sinfo output to match `dgx-0[0-7]` pattern:

```typescript
const nodeCount = (output.match(/dgx-0[0-7]/g) || []).length;
expect(nodeCount).toBeGreaterThan(0);
```

But it gets 0 matches because sinfo returns generic error.

### Root Cause

This is Issue 2 - Slurm routing incorrect.

### Fix

Fixed by Issue 2 fix.

---

## Implementation Order

### Phase 1: Fix Test Infrastructure (fixes ~15 tests)

1. Fix `getContext()` to use correct CommandContext structure
2. Fix `runCommand()` Slurm routing to call specific methods
3. Fix `clearFaults()` to use correct eccErrors structure

### Phase 2: Fix Thermal Throttling (fixes 1 test)

4. Update `injectFault('thermal')` to apply clock throttling immediately

### Phase 3: Verify

5. Run test suite to confirm all fixes work
6. Ensure no regressions in other tests

---

## Files to Modify

| File                                     | Changes                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `src/__tests__/logicConsistency.test.ts` | Fix getContext(), runCommand(), clearFaults()   |
| `src/utils/metricsSimulator.ts`          | Add clock throttling to thermal fault injection |

---

## Verification Commands

```bash
# Run only logic consistency tests
npm test -- --run src/__tests__/logicConsistency.test.ts

# Run all tests to check for regressions
npm test

# Build to verify no type errors
npm run build
```

---

## Expected Outcome

After fixes:

- 91 tests should pass (currently 73 pass, 18 fail)
- All 6 test categories should have 100% pass rate
- No regressions in other test files
