# Adversarial Input Handling Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 45 input validation and error handling issues found by adversarial testing so simulators gracefully handle invalid inputs instead of crashing or returning incorrect output.

**Architecture:** Add defensive programming at two layers: (1) BaseSimulator gets null-safe parsing helpers and input validation utilities, (2) Individual simulators add specific validation for their command arguments. Tests drive the implementation - each fix makes a failing adversarial test pass.

**Tech Stack:** TypeScript, Vitest, Zustand store

---

## Task 1: Fix BaseSimulator Crash on Empty Commands

**Files:**
- Modify: `src/simulators/BaseSimulator.ts:540`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run the failing tests to confirm the bug**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "empty command"`
Expected: FAIL with `Cannot read properties of undefined (reading 'has')`

**Step 2: Fix hasAnyFlag to handle undefined flags**

In `src/simulators/BaseSimulator.ts`, find the `hasAnyFlag` method around line 540:

```typescript
// BEFORE (crashes when parsed.flags is undefined)
protected hasAnyFlag(parsed: ParsedCommand, flags: string[]): boolean {
  return flags.some(flag => parsed.flags.has(flag));
}

// AFTER (null-safe)
protected hasAnyFlag(parsed: ParsedCommand, flags: string[]): boolean {
  if (!parsed?.flags) return false;
  return flags.some(flag => parsed.flags.has(flag));
}
```

**Step 3: Run test to verify it passes**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "empty command"`
Expected: PASS (or different error, not the crash)

**Step 4: Fix similar null-safety issues in BaseSimulator**

Check and fix these methods if they have similar issues:
- `hasFlag()`
- `getFlag()`
- Any method accessing `parsed.flags` or `parsed.positionalArgs`

```typescript
protected hasFlag(parsed: ParsedCommand, flag: string): boolean {
  return parsed?.flags?.has(flag) ?? false;
}

protected getFlag(parsed: ParsedCommand, flag: string): string | boolean | undefined {
  return parsed?.flags?.get(flag);
}
```

**Step 5: Run all adversarial tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts`
Expected: Fewer failures (empty/whitespace tests should pass now)

**Step 6: Commit**

```bash
git add src/simulators/BaseSimulator.ts
git commit -m "fix: add null-safety to BaseSimulator flag helpers

Fixes crashes when executing empty or whitespace-only commands.
The hasAnyFlag, hasFlag, and getFlag methods now handle undefined
parsed.flags gracefully."
```

---

## Task 2: Add Input Validation Utility Functions

**Files:**
- Modify: `src/simulators/BaseSimulator.ts`
- Test: `src/simulators/__tests__/BaseSimulator.test.ts`

**Step 1: Write failing tests for validation utilities**

Add to `src/simulators/__tests__/BaseSimulator.test.ts`:

```typescript
describe('Input Validation Utilities', () => {
  it('validateGpuIndex rejects negative numbers', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidateGpuIndex(-1, 8)).toEqual({
      valid: false,
      error: 'Invalid GPU index: -1. Valid range is 0-7.'
    });
  });

  it('validateGpuIndex rejects out of range', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidateGpuIndex(8, 8)).toEqual({
      valid: false,
      error: 'Invalid GPU index: 8. Valid range is 0-7.'
    });
  });

  it('validateGpuIndex accepts valid index', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidateGpuIndex(0, 8)).toEqual({ valid: true });
    expect(simulator.testValidateGpuIndex(7, 8)).toEqual({ valid: true });
  });

  it('validatePositiveInt rejects non-numeric strings', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidatePositiveInt('abc')).toEqual({
      valid: false,
      error: "Invalid number: 'abc'"
    });
  });

  it('validatePositiveInt rejects negative numbers', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidatePositiveInt('-5')).toEqual({
      valid: false,
      error: 'Value must be positive: -5'
    });
  });

  it('validatePositiveInt accepts valid numbers', () => {
    const simulator = new TestSimulator();
    expect(simulator.testValidatePositiveInt('42')).toEqual({ valid: true, value: 42 });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/simulators/__tests__/BaseSimulator.test.ts -t "Input Validation"`
Expected: FAIL (methods don't exist)

**Step 3: Implement validation utilities in BaseSimulator**

Add to `src/simulators/BaseSimulator.ts`:

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: number;
}

protected validateGpuIndex(index: number, maxGpus: number): ValidationResult {
  if (isNaN(index) || !Number.isInteger(index)) {
    return { valid: false, error: `Invalid GPU index: ${index}. Must be an integer.` };
  }
  if (index < 0 || index >= maxGpus) {
    return { valid: false, error: `Invalid GPU index: ${index}. Valid range is 0-${maxGpus - 1}.` };
  }
  return { valid: true };
}

protected validatePositiveInt(value: string, name: string = 'Value'): ValidationResult {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return { valid: false, error: `Invalid number: '${value}'` };
  }
  if (num < 0) {
    return { valid: false, error: `${name} must be positive: ${num}` };
  }
  return { valid: true, value: num };
}

protected validateInSet<T>(value: T, validValues: T[], name: string): ValidationResult {
  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid ${name}: '${value}'. Valid options: ${validValues.join(', ')}`
    };
  }
  return { valid: true };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/simulators/__tests__/BaseSimulator.test.ts -t "Input Validation"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/simulators/BaseSimulator.ts src/simulators/__tests__/BaseSimulator.test.ts
git commit -m "feat: add input validation utilities to BaseSimulator

Adds validateGpuIndex, validatePositiveInt, and validateInSet
helpers for consistent input validation across all simulators."
```

---

## Task 3: Fix nvidia-smi Invalid GPU Index Handling

**Files:**
- Modify: `src/simulators/nvidiaSmiSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "nvidia-smi"`
Expected: Multiple failures for GPU index validation

**Step 2: Add GPU index validation to nvidia-smi**

Find where `-i` flag is processed in `nvidiaSmiSimulator.ts` and add validation:

```typescript
// In the method that handles -i flag
const gpuIndexStr = parsed.flags.get('i') || parsed.flags.get('id');
if (gpuIndexStr !== undefined) {
  const gpuIndex = parseInt(String(gpuIndexStr), 10);
  const validation = this.validateGpuIndex(gpuIndex, node.gpus.length);
  if (!validation.valid) {
    return this.createError(validation.error!);
  }
  // Continue with valid index...
}
```

**Step 3: Add unknown flag detection**

```typescript
// Add at start of execute method or relevant handler
const knownFlags = new Set(['i', 'id', 'q', 'L', 'l', 'query-gpu', 'format', ...]);
for (const flag of parsed.flags.keys()) {
  if (!knownFlags.has(flag)) {
    return this.createError(`Unknown option: --${flag}\nRun 'nvidia-smi --help' for usage.`);
  }
}
```

**Step 4: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "nvidia-smi"`
Expected: More tests pass

**Step 5: Commit**

```bash
git add src/simulators/nvidiaSmiSimulator.ts
git commit -m "fix: add input validation to nvidia-smi simulator

- Validates GPU index is within valid range
- Rejects unknown flags with helpful error message
- Handles non-numeric GPU indices gracefully"
```

---

## Task 4: Fix dcgmi Input Validation

**Files:**
- Modify: `src/simulators/dcgmiSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "dcgmi"`
Expected: 6 failures

**Step 2: Add subcommand validation**

```typescript
// At start of execute method
const validSubcommands = ['discovery', 'health', 'diag', 'group', 'config', 'policy', 'stats', 'topo'];
const subcommand = parsed.positionalArgs[0];

if (!subcommand) {
  return this.createSuccess(this.getUsageHelp());
}

if (!validSubcommands.includes(subcommand)) {
  return this.createError(`Unknown subcommand: '${subcommand}'\nValid subcommands: ${validSubcommands.join(', ')}`);
}
```

**Step 3: Add group ID validation**

```typescript
// In health command handler
const groupId = parsed.flags.get('g') || parsed.flags.get('group');
if (groupId !== undefined) {
  const validation = this.validatePositiveInt(String(groupId), 'Group ID');
  if (!validation.valid) {
    return this.createError(validation.error!);
  }
  // Also check if group exists...
}
```

**Step 4: Add diag level validation**

```typescript
// In diag command handler
const runLevel = parsed.flags.get('r') || parsed.flags.get('run');
if (runLevel !== undefined) {
  const validation = this.validateInSet(String(runLevel), ['1', '2', '3', '4'], 'diagnostic level');
  if (!validation.valid) {
    return this.createError(validation.error!);
  }
}
```

**Step 5: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "dcgmi"`
Expected: All 6 tests pass

**Step 6: Commit**

```bash
git add src/simulators/dcgmiSimulator.ts
git commit -m "fix: add input validation to dcgmi simulator

- Shows usage help when no subcommand provided
- Validates subcommand is recognized
- Validates group ID and diagnostic level values"
```

---

## Task 5: Fix Slurm Input Validation

**Files:**
- Modify: `src/simulators/slurmSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "slurm"`
Expected: 4 failures

**Step 2: Add scontrol entity validation**

```typescript
// In scontrol handler
const validEntities = ['node', 'nodes', 'job', 'jobs', 'partition', 'partitions', 'reservation'];
const entity = parsed.positionalArgs[1]; // "show <entity>"

if (parsed.positionalArgs[0] === 'show' && entity) {
  if (!validEntities.includes(entity)) {
    return this.createError(`Invalid entity: '${entity}'\nValid entities: ${validEntities.join(', ')}`);
  }
}
```

**Step 3: Add state validation for scontrol update**

```typescript
// In scontrol update handler
const validStates = ['idle', 'drain', 'resume', 'down', 'undrain'];
const stateMatch = command.match(/state=(\w+)/i);
if (stateMatch) {
  const state = stateMatch[1].toLowerCase();
  if (!validStates.includes(state)) {
    return this.createError(`Invalid state: '${state}'\nValid states: ${validStates.join(', ')}`);
  }
}
```

**Step 4: Add sbatch script validation**

```typescript
// In sbatch handler
if (parsed.positionalArgs.length === 0 && !parsed.flags.has('wrap')) {
  return this.createError('sbatch: error: No script provided\nUsage: sbatch [options] script.sh');
}
```

**Step 5: Add scancel job ID validation**

```typescript
// In scancel handler
const jobId = parsed.positionalArgs[0];
if (!jobId) {
  return this.createError('scancel: error: No job ID specified');
}
const validation = this.validatePositiveInt(jobId, 'Job ID');
if (!validation.valid) {
  return this.createError(`scancel: error: Invalid job ID '${jobId}'`);
}
```

**Step 6: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "slurm"`
Expected: All 4 tests pass

**Step 7: Commit**

```bash
git add src/simulators/slurmSimulator.ts
git commit -m "fix: add input validation to slurm simulator

- Validates scontrol entity types
- Validates node state values
- Requires script for sbatch
- Validates job ID for scancel"
```

---

## Task 6: Fix InfiniBand Input Validation

**Files:**
- Modify: `src/simulators/infinibandSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "infiniband"`
Expected: 4 failures

**Step 2: Add device validation to ibstat**

```typescript
// In ibstat handler
const device = parsed.positionalArgs[0];
if (device) {
  const validDevices = ['mlx5_0', 'mlx5_1', 'mlx5_2', 'mlx5_3', 'mlx5_4', 'mlx5_5', 'mlx5_6', 'mlx5_7'];
  if (!validDevices.some(d => device.startsWith('mlx5_'))) {
    return this.createError(`ibstat: '${device}' not found\nAvailable devices: ${validDevices.join(', ')}`);
  }
}
```

**Step 3: Add LID validation to perfquery**

```typescript
// In perfquery handler
const lid = parsed.flags.get('x');
if (lid !== undefined) {
  const validation = this.validatePositiveInt(String(lid), 'LID');
  if (!validation.valid || validation.value! > 65535) {
    return this.createError(`perfquery: Invalid LID '${lid}'. Valid range: 1-65535`);
  }
}
```

**Step 4: Add port validation**

```typescript
// In ibportstate handler
const port = parsed.positionalArgs[1];
if (port !== undefined) {
  const validation = this.validatePositiveInt(port, 'Port number');
  if (!validation.valid || validation.value! < 1 || validation.value! > 8) {
    return this.createError(`Invalid port number: ${port}. Valid range: 1-8`);
  }
}
```

**Step 5: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "infiniband"`
Expected: All 4 tests pass

**Step 6: Commit**

```bash
git add src/simulators/infinibandSimulator.ts
git commit -m "fix: add input validation to infiniband simulator

- Validates device names for ibstat
- Validates LID range for perfquery
- Validates port numbers"
```

---

## Task 7: Fix Benchmark Input Validation

**Files:**
- Modify: `src/simulators/benchmarkSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "benchmark"`
Expected: 6 failures

**Step 2: Add GPU count validation to nccl-test**

```typescript
// In handleNCCL or handleRegularTest
const ngpusStr = parsed.flags.get('ngpus') || parsed.flags.get('g');
if (ngpusStr !== undefined) {
  const validation = this.validatePositiveInt(String(ngpusStr), 'GPU count');
  if (!validation.valid) {
    return this.createError(validation.error!);
  }
  if (validation.value === 0) {
    return this.createError('GPU count must be at least 1');
  }
  if (validation.value! > node.gpus.length) {
    return this.createError(`GPU count ${validation.value} exceeds available GPUs (${node.gpus.length})`);
  }
}
```

**Step 3: Add operation validation**

```typescript
// In handleNCCL
const validOperations = ['all_reduce', 'all_gather', 'reduce_scatter', 'broadcast', 'reduce', 'alltoall'];
const operation = parsed.flags.get('operation') || parsed.flags.get('t') || 'all_reduce';
if (!validOperations.includes(String(operation))) {
  return this.createError(`Invalid operation: '${operation}'\nValid operations: ${validOperations.join(', ')}`);
}
```

**Step 4: Add min/max bytes validation**

```typescript
// In handleRegularTest
const minBytes = this.parseSize(minBytesStr);
const maxBytes = this.parseSize(maxBytesStr);
if (minBytes > maxBytes) {
  return this.createError(`minbytes (${minBytesStr}) cannot be greater than maxbytes (${maxBytesStr})`);
}
```

**Step 5: Add duration validation to gpu-burn**

```typescript
// In handleGPUBurn
const duration = parseInt(durationStr, 10);
if (isNaN(duration) || duration <= 0) {
  return this.createError(`Invalid duration: '${durationStr}'. Must be a positive number of seconds.`);
}
```

**Step 6: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "benchmark"`
Expected: All 6 tests pass

**Step 7: Commit**

```bash
git add src/simulators/benchmarkSimulator.ts
git commit -m "fix: add input validation to benchmark simulator

- Validates GPU count is positive and within range
- Validates operation type
- Ensures minbytes <= maxbytes
- Validates duration is positive"
```

---

## Task 8: Fix Basic System and Fabric Manager Validation

**Files:**
- Modify: `src/simulators/basicSystemSimulator.ts`
- Modify: `src/simulators/fabricManagerSimulator.ts`
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run failing tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "basic system|fabric manager"`
Expected: 7 failures

**Step 2: Fix basicSystemSimulator to handle undefined parsed**

```typescript
// At start of execute method
execute(command: string, context: CommandContext): CommandResult {
  if (!command || !command.trim()) {
    return this.createSuccess('');
  }

  const parsed = this.parseCommand(command);
  if (!parsed) {
    return this.createError(`Command not found: ${command.split(' ')[0]}`);
  }
  // ... rest of method
}
```

**Step 3: Add cat file validation**

```typescript
// In cat handler
const filePath = parsed.positionalArgs[0];
if (!filePath) {
  return this.createError('cat: missing file operand');
}
// Check if file exists in simulated filesystem
if (!this.fileExists(filePath)) {
  return this.createError(`cat: ${filePath}: No such file or directory`);
}
```

**Step 4: Fix fabricManagerSimulator subcommand handling**

```typescript
// In execute method
const subcommand = parsed.positionalArgs[0];
if (!subcommand) {
  return this.createSuccess(this.getUsageHelp());
}

const validSubcommands = ['query', 'status', '--start', '--stop'];
if (!validSubcommands.includes(subcommand)) {
  return this.createError(`Unknown subcommand: '${subcommand}'`);
}
```

**Step 5: Run tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts -t "basic system|fabric manager"`
Expected: All 7 tests pass

**Step 6: Commit**

```bash
git add src/simulators/basicSystemSimulator.ts src/simulators/fabricManagerSimulator.ts
git commit -m "fix: add input validation to basic system and fabric manager

- Handle empty/whitespace commands gracefully
- Validate file paths for cat command
- Add subcommand validation to fabric manager"
```

---

## Task 9: Final Verification and Cleanup

**Files:**
- Test: `src/simulators/__tests__/adversarialInputs.test.ts`

**Step 1: Run all adversarial tests**

Run: `npm test -- --run src/simulators/__tests__/adversarialInputs.test.ts`
Expected: 48/48 pass (or close to it)

**Step 2: Run full test suite to check for regressions**

Run: `npm test -- --run`
Expected: All 1300+ tests pass

**Step 3: Update any tests that need adjustment**

If any existing tests fail due to new validation, update them to use valid inputs.

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: all adversarial input tests passing

Completes input validation improvements across all simulators.
45 edge cases now handled gracefully."
```

---

## Summary

| Task | Component | Tests Fixed |
|------|-----------|-------------|
| 1 | BaseSimulator null-safety | 4 |
| 2 | Validation utilities | 0 (infrastructure) |
| 3 | nvidia-smi | 10 |
| 4 | dcgmi | 6 |
| 5 | slurm | 4 |
| 6 | infiniband | 4 |
| 7 | benchmark | 6 |
| 8 | basic system + fabric manager | 7 |
| 9 | Final verification | 4 (boundary) |
| **Total** | | **45** |

---

*Plan created: 2026-02-02*
