# Soft-Block Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all soft-blocks found in the 32-mission audit — one blocker (no step skip), systemic pipe validation gaps, simulator gaps, and narrative data mismatches.

**Architecture:** Four categories of fixes: (1) Add a "Show Answer" button to LabWorkspace so stuck users can advance, (2) change pipe-command steps to use `output` validation so the pipe is enforced, (3) add missing simulator features (`squeue -w`, `journalctl -u opensmd`), (4) fix narrative JSON data errors (wrong node names, vague hints, misleading tasks).

**Tech Stack:** React, TypeScript, Vitest, Zustand, xterm.js simulators

---

## File Map

| File                                                      | Action | Responsibility                                                                 |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `src/components/LabWorkspace.tsx`                         | Modify | Add "Show Answer" button for stuck users                                       |
| `src/components/__tests__/LabWorkspaceStepTypes.test.tsx` | Modify | Test the show-answer feature (existing step-type test file)                    |
| `src/data/narrativeScenarios.json`                        | Modify | Fix validation types, hints, task text, node names                             |
| `src/simulators/slurmSimulator.ts`                        | Modify | Add `-w`/`--nodelist` flag filtering to squeue                                 |
| `src/simulators/__tests__/slurmSimulator.squeue.test.ts`  | Create | Test squeue -w filtering (follows existing naming: `slurmSimulator.*.test.ts`) |
| `src/simulators/pciToolsSimulator.ts`                     | Modify | Add `opensmd` unit to journalctl handler                                       |

---

### Task 1: Add "Show Answer" Button to LabWorkspace

The only BLOCKER found in the audit. Users stuck on a command step have no way to advance except exiting the entire scenario.

**Files:**

- Modify: `src/components/LabWorkspace.tsx` (state at ~line 111, button after line 923)
- Test: `src/components/__tests__/LabWorkspaceStepTypes.test.tsx`

**Note:** LabWorkspace has TWO hint systems: the enhanced `hintEvaluation` system (lines 779-879) and a legacy hint fallback (lines 881-922). The "Show Answer" button must appear after BOTH hint sections (after line 923, before the "Estimated Duration" section). The condition must handle both systems.

- [ ] **Step 1: Add "Show Answer" state and button**

In `LabWorkspace.tsx`, add state after the existing `useState` declarations (after line 111):

```tsx
const [showAnswer, setShowAnswer] = useState(false);

// Reset showAnswer when step changes
useEffect(() => {
  setShowAnswer(false);
}, [currentStepIndex]);
```

Add the button after BOTH hint sections end (after line 923, before the "Estimated Duration" div at line 925). The condition must cover both hint systems — enhanced hints (all revealed) OR legacy hints (all revealed):

```tsx
{
  /* Show Answer - appears when all hints revealed and step not completed */
}
{
  requiresCLIInput &&
    !isStepCompleted &&
    // Enhanced hints: all revealed
    (((hintEvaluation?.revealedCount || 0) ===
      (hintEvaluation?.totalCount || 0) &&
      (hintEvaluation?.totalCount || 0) > 0) ||
      // Legacy hints: all revealed
      (!hintEvaluation &&
        legacyAvailableHints.length > 0 &&
        legacyCurrentHintCount >= legacyAvailableHints.length)) && (
      <div className="bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-amber-500">
        {!showAnswer ? (
          <button
            data-testid="show-answer-btn"
            onClick={() => setShowAnswer(true)}
            className="w-full px-4 py-2 rounded font-medium bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/50 transition-colors text-sm"
          >
            Stuck? Show the answer
          </button>
        ) : (
          <div>
            <p className="text-xs text-amber-400 font-semibold mb-2">ANSWER</p>
            <div className="space-y-1 mb-3">
              {currentStep.expectedCommands.map((cmd, i) => (
                <div
                  key={i}
                  className="font-mono text-sm bg-black rounded px-3 py-2 text-green-400"
                >
                  $ {cmd}
                </div>
              ))}
            </div>
            <button
              data-testid="skip-step-btn"
              onClick={() => {
                completeScenarioStep(activeScenario.id, currentStep.id);
                setShowAnswer(false);
              }}
              className="w-full px-4 py-2 rounded font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors text-sm"
            >
              Skip this step
            </button>
          </div>
        )}
      </div>
    );
}
```

- [ ] **Step 2: Write tests for the show-answer feature**

Add tests to verify:

1. "Show Answer" button does NOT appear when hints remain unrevealed
2. "Show Answer" button appears when all hints are revealed and step is not completed
3. Clicking "Show Answer" reveals expected commands
4. Clicking "Skip Step" calls `completeScenarioStep`
5. "Show Answer" button does NOT appear on concept/observe steps

- [ ] **Step 3: Run tests and verify**

Run: `npm run test:run -- --reporter=verbose src/components/__tests__/LabWorkspaceStepTypes`
Expected: All new tests pass

- [ ] **Step 4: Verify in browser**

Start a scenario, reveal all hints on a step, confirm "Show Answer" button appears and functions correctly. Test with both enhanced-hint and legacy-hint scenarios.

- [ ] **Step 5: Commit**

```bash
git add src/components/LabWorkspace.tsx src/components/__tests__/LabWorkspaceStepTypes.test.tsx
git commit -m "feat: add show-answer button for stuck users on scenario steps"
```

---

### Task 2: Fix Pipe-Command Validation (7 steps)

Pipe steps like `nvidia-smi | grep GPU` currently validate on just the base command. Change these steps from `validation.type: "command"` to `validation.type: "output"` so the filtered output is checked, enforcing the pipe.

**How it works:** In `narrativeAdapter.ts:117`, `validation.type === "output"` creates an `output-match` rule. In `scenarioValidator.ts:250-253`, output-match rules DO check the `outputPattern` against the command's actual output. The pipe handler in Terminal.tsx executes the base command through its simulator and applies pipe filters, so `nvidia-smi | grep GPU` will produce filtered output containing "GPU". The output-match validation will then verify this pattern exists.

**Prerequisite:** Verify each simulator's output contains the expected pattern when piped. `nvidia-smi` output contains "GPU", `sinfo` output contains "idle", `squeue` output contains numbers (for `wc -l`), `lsmod` output contains "nvidia", `dmesg` output contains "NVRM"/"nvidia".

**Files:**

- Modify: `src/data/narrativeScenarios.json`

The following steps need their validation changed from `"type": "command"` to `"type": "output"`:

| Scenario                 | Step   | Command                   | New pattern      |
| ------------------------ | ------ | ------------------------- | ---------------- |
| domain0-linux-output     | step-2 | `nvidia-smi \| grep GPU`  | `GPU`            |
| domain0-linux-output     | step-4 | `sinfo \| grep idle`      | `idle`           |
| domain0-linux-output     | step-6 | `squeue \| wc -l`         | `\\d+`           |
| domain1-driver-disaster  | step-2 | `lsmod \| grep nvidia`    | `nvidia`         |
| domain1-driver-disaster  | step-3 | `dmesg \| grep -i nvrm`   | `nvrm\|NVRM`     |
| domain1-fabric-awakening | step-5 | `lsmod \| grep nvidia`    | `nvidia`         |
| domain1-fabric-awakening | step-7 | `dmesg \| grep -i nvidia` | `nvidia\|NVIDIA` |

- [ ] **Step 1: Update domain0-linux-output pipe steps**

In `narrativeScenarios.json`, find the 3 pipe steps in `domain0-linux-output` and change:

```json
// FROM:
"validation": { "type": "command", "pattern": "grep" }
// TO:
"validation": { "type": "output", "pattern": "GPU" }
```

Apply the correct pattern for each step per the table above.

- [ ] **Step 2: Update domain1-driver-disaster pipe steps**

Change steps 2 and 3 validation type from `"command"` to `"output"` with their respective patterns.

- [ ] **Step 3: Update domain1-fabric-awakening pipe steps**

Change steps 5 and 7 validation type from `"command"` to `"output"` with their respective patterns.

- [ ] **Step 4: Run existing scenario/data tests**

Run: `npm run test:run -- --reporter=verbose src/data/__tests__`
Expected: All data validation tests pass

- [ ] **Step 5: Verify in browser**

Start `domain0-linux-output`, reach step 2. Type just `nvidia-smi` (without pipe) — confirm the step does NOT advance. Then type `nvidia-smi | grep GPU` — confirm it advances.

- [ ] **Step 6: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "fix: enforce pipe validation on 7 pipe-command scenario steps"
```

---

### Task 3: Add `squeue -w` Flag Support

The `squeue -w dgx-07` command is used in domain4-bandwidth-bottleneck step 8 and domain5-network-nightmare step 8, but the `-w`/`--nodelist` flag is accepted and silently ignored.

**Note:** The `-w`/`--nodelist` flag is already defined in `src/data/output/cluster_management/squeue.json` (line 232), so it passes `validateFlagsWithRegistry`. No changes needed in the definition JSON — only the filtering logic in the simulator is missing.

**Files:**

- Modify: `src/simulators/slurmSimulator.ts:439-461`
- Create: `src/simulators/__tests__/slurmSimulator.squeue.test.ts` (follows naming convention: `slurmSimulator.gres.test.ts`, `slurmSimulator.registry.test.ts`, etc.)

- [ ] **Step 1: Review existing slurm test patterns**

Read one of the existing tests (e.g., `src/simulators/__tests__/slurmSimulator.gres.test.ts`) to understand the test setup pattern for the slurm simulator.

- [ ] **Step 2: Write failing test for -w flag**

```typescript
it("squeue -w filters jobs by nodelist", () => {
  // Setup: add jobs on different nodes
  // Execute: squeue -w dgx-07
  // Assert: only jobs on dgx-07 appear in output
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- --reporter=verbose <test-file-path>`
Expected: FAIL

- [ ] **Step 4: Implement -w flag in executeSqueue**

In `slurmSimulator.ts`, after the existing flag parsing (line 445), add:

```typescript
const nodelistFilter = this.getFlagString(parsed, ["w", "nodelist"]);
```

Then in the filter section (after line 460), add:

```typescript
if (nodelistFilter) {
  const nodes = nodelistFilter.split(",");
  filteredJobs = filteredJobs.filter((j) => nodes.includes(j.nodelist));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- --reporter=verbose <test-file-path>`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/simulators/slurmSimulator.ts src/simulators/__tests__/slurmSimulator.squeue.test.ts
git commit -m "feat: add squeue -w/--nodelist flag filtering"
```

---

### Task 4: Add `opensmd` Unit to journalctl Simulator

The `journalctl -u opensmd` command in domain4-nccl-nightmare step 7 produces generic logs instead of subnet manager output.

**Files:**

- Modify: `src/simulators/pciToolsSimulator.ts`

- [ ] **Step 1: Read the journalctl handler**

Read `src/simulators/pciToolsSimulator.ts` and find where `-u` unit names are matched. Understand the current pattern.

- [ ] **Step 2: Add opensmd unit output**

Add a case for `opensmd` (and `opensm`) in the journalctl unit handler that returns subnet-manager-specific log lines:

```typescript
// Add to the unit matching section (use strict matching to avoid false positives)
if (unit === "opensmd" || unit === "opensm") {
  return this.createSuccess(
    `-- Logs begin at Mon 2024-01-15 00:00:00 UTC --\n` +
      `Jan 15 08:00:01 dgx-01 opensmd[1234]: OpenSM 5.18.0\n` +
      `Jan 15 08:00:01 dgx-01 opensmd[1234]: Reading Cached IB FDB\n` +
      `Jan 15 08:00:02 dgx-01 opensmd[1234]: SM port is GUID 0x0002c903000a0001\n` +
      `Jan 15 08:00:02 dgx-01 opensmd[1234]: Routing engine: minhop\n` +
      `Jan 15 08:00:03 dgx-01 opensmd[1234]: Heavy sweep completed in 0.42 seconds\n` +
      `Jan 15 08:00:03 dgx-01 opensmd[1234]: All 32 ports initialized\n` +
      `Jan 15 08:05:00 dgx-01 opensmd[1234]: Subnet change detected, starting heavy sweep\n` +
      `Jan 15 08:05:01 dgx-01 opensmd[1234]: WARNING: link on port 7 lid 15 has errors above threshold\n` +
      `Jan 15 08:05:02 dgx-01 opensmd[1234]: Re-routing around degraded link\n` +
      `Jan 15 08:05:02 dgx-01 opensmd[1234]: Heavy sweep completed in 1.87 seconds`,
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm run test:run -- --reporter=verbose`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/simulators/pciToolsSimulator.ts
git commit -m "feat: add opensmd unit output to journalctl simulator"
```

---

### Task 5: Fix Narrative JSON Data Errors

Fix the individual data errors in `narrativeScenarios.json` — wrong node names, vague hints, misleading task descriptions.

**Files:**

- Modify: `src/data/narrativeScenarios.json`

- [ ] **Step 1: Fix domain5-memory-mystery step 8 — node mismatch**

The autoFaults at step 3 inject a `memory-full` fault on `nodeId: "dgx-00"`, but step 8's expectedCommand references `dgx-01`. First determine which is authoritative — check if other steps in this scenario reference `dgx-00` or `dgx-01`, and check if the default simulation node is `dgx-00` (login node) or `dgx-01` (first worker). Then either:

- Change the autoFault `nodeId` to `dgx-01` (if dgx-01 is the intended target), OR
- Change the expectedCommand to `dgx-00` (if dgx-00 is the intended target)

Also update the `situation` text on that step to match.

- [ ] **Step 2: Fix domain5-memory-mystery step 11 — matching node resume**

Update the resume command to target the same node fixed in step 1.

- [ ] **Step 3: Fix domain1-rack-expansion step 11 — misleading task**

The task says "add the new node" but the expected command is read-only. Update the task text:

```json
// Change task from something like:
"Use scontrol to add the new node to the cluster and verify its state"
// To:
"Verify the new node's state in the cluster using scontrol"
```

- [ ] **Step 4: Fix domain1-bios-verification step 10 — vague hints**

The hints don't mention the exact command path. Update hints to be more specific:

```json
// Add or update hints to include:
"Use: cat /proc/driver/nvidia/version"
```

- [ ] **Step 5: Fix domain4-nccl-championship steps 3-5 — env var commands**

Change expectedCommands from bare assignment to `export` (which IS a registered command in Terminal.tsx at line 874 and properly sets env vars via `currentContext.current.environment`):

```json
// Step 3: Change from "NCCL_DEBUG=INFO" to:
"export NCCL_DEBUG=INFO"
// Step 4: Change from "NCCL_IB_DISABLE=0" to:
"export NCCL_IB_DISABLE=0"
// Step 5: Change from "NCCL_P2P_DISABLE=0" to:
"export NCCL_P2P_DISABLE=0"
```

Also update the task/hint text to say `export NCCL_DEBUG=INFO` instead of just `NCCL_DEBUG=INFO`.

- [ ] **Step 6: Fix domain1-network-bonding-blues step 7 — device path**

The expected command uses `/dev/mst/mt41686_pciconf0` (ConnectX-7 PCI ID). The mellanox simulator at line 389 does accept `/dev/mst/` paths generically. Read `src/simulators/mellanoxSimulator.ts` to verify whether the path produces useful output or a "device not found" error. If it errors, either:

- Update the simulator to accept `mt41686` device paths, OR
- Change the expected command to use a device path that the simulator already handles (e.g., `mlx5_0`)

- [ ] **Step 7: Run data validation tests**

Run: `npm run test:run -- --reporter=verbose src/data/__tests__`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "fix: correct narrative data errors in 6 scenarios"
```

---

### Task 6: Run Full Test Suite and Verify Build

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 3: Manual smoke test**

In the browser, run through at least one scenario from each fixed category:

1. Test "Show Answer" button flow
2. Test a pipe-validation step (domain0-linux-output)
3. Test `squeue -w` output (domain4-bandwidth-bottleneck)
4. Test the corrected node drain step (domain5-memory-mystery)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git commit -m "fix: address test/build issues from soft-block fixes"
```
