# Cleanup and Commit Uncommitted Work

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Organize and commit all uncommitted work into logical, atomic commits.

**Architecture:** Group related changes into separate commits: new lab scenarios, test files, component improvements, and documentation. Exclude local config files.

**Tech Stack:** Git, npm test for verification

---

## Summary of Uncommitted Work

**New Lab Scenarios (10 files):**

- domain1: bmc-ipmi-configuration, firmware-update-procedure, network-bonding
- domain3: dcgm-policy-setup, slurm-gres-configuration
- domain4: gpudirect-rdma-verify, multi-node-nccl-test
- domain5: cable-diagnostics, physical-inspection

**New Test Files (3 files):**

- src/**tests**/logicConsistency.test.ts
- src/simulators/**tests**/dcgmiSimulator.policy.test.ts
- src/simulators/**tests**/slurmSimulator.gres.test.ts

**Modified Source Files (3 files):**

- src/components/TopologyGraph.tsx - NVSwitch click handlers
- src/simulators/nvidiaSmiSimulator.ts - ECC field validation
- src/utils/scenarioLoader.ts - New scenario mappings

**Documentation (5 files):**

- docs/plans/\*.md - Implementation plans
- docs/testing/2026-02-02-adversarial-ux-audit.md

**To Exclude:**

- .claude/_.local._ (local config, matches \*.local in .gitignore)
- .playwright-mcp/ (add to .gitignore)
- nul (Windows artifact)
- UI-UX-REPORT.md (temporary report)

---

### Task 1: Update .gitignore

**Files:**

- Modify: `.gitignore`

**Step 1: Add entries for files that should be ignored**

Add these lines to .gitignore:

```
# Playwright MCP cache
.playwright-mcp/

# Windows artifacts
nul
```

**Step 2: Verify the additions**

Run: `cat .gitignore | tail -10`
Expected: See the new entries at the end

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for playwright-mcp and windows artifacts"
```

---

### Task 2: Commit New Lab Scenarios

**Files:**

- Create: `src/data/scenarios/domain1/bmc-ipmi-configuration.json`
- Create: `src/data/scenarios/domain1/firmware-update-procedure.json`
- Create: `src/data/scenarios/domain1/network-bonding.json`
- Create: `src/data/scenarios/domain3/dcgm-policy-setup.json`
- Create: `src/data/scenarios/domain3/slurm-gres-configuration.json`
- Create: `src/data/scenarios/domain4/gpudirect-rdma-verify.json`
- Create: `src/data/scenarios/domain4/multi-node-nccl-test.json`
- Create: `src/data/scenarios/domain5/cable-diagnostics.json`
- Create: `src/data/scenarios/domain5/physical-inspection.json`
- Modify: `src/utils/scenarioLoader.ts`

**Step 1: Verify scenarios load correctly**

Run: `npm test -- --run src/tests/scenarioValidator.test.ts`
Expected: All scenario tests pass

**Step 2: Stage scenario files and loader**

```bash
git add src/data/scenarios/domain1/bmc-ipmi-configuration.json
git add src/data/scenarios/domain1/firmware-update-procedure.json
git add src/data/scenarios/domain1/network-bonding.json
git add src/data/scenarios/domain3/dcgm-policy-setup.json
git add src/data/scenarios/domain3/slurm-gres-configuration.json
git add src/data/scenarios/domain4/gpudirect-rdma-verify.json
git add src/data/scenarios/domain4/multi-node-nccl-test.json
git add src/data/scenarios/domain5/cable-diagnostics.json
git add src/data/scenarios/domain5/physical-inspection.json
git add src/utils/scenarioLoader.ts
```

**Step 3: Commit**

```bash
git commit -m "feat: add 9 new NCP-AII certification lab scenarios

- Domain 1: BMC/IPMI config, firmware update, network bonding
- Domain 3: DCGM policy setup, Slurm GRES configuration
- Domain 4: GPUDirect RDMA verify, multi-node NCCL test
- Domain 5: Cable diagnostics, physical inspection

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Commit New Test Files

**Files:**

- Create: `src/__tests__/logicConsistency.test.ts`
- Create: `src/simulators/__tests__/dcgmiSimulator.policy.test.ts`
- Create: `src/simulators/__tests__/slurmSimulator.gres.test.ts`

**Step 1: Run the new tests to verify they pass**

Run: `npm test -- --run src/__tests__/logicConsistency.test.ts src/simulators/__tests__/dcgmiSimulator.policy.test.ts src/simulators/__tests__/slurmSimulator.gres.test.ts`
Expected: All tests pass

**Step 2: Stage test files**

```bash
git add src/__tests__/logicConsistency.test.ts
git add src/simulators/__tests__/dcgmiSimulator.policy.test.ts
git add src/simulators/__tests__/slurmSimulator.gres.test.ts
```

**Step 3: Commit**

```bash
git commit -m "test: add logic consistency and simulator policy tests

- logicConsistency.test.ts: Cross-simulator validation tests
- dcgmiSimulator.policy.test.ts: DCGM policy command tests
- slurmSimulator.gres.test.ts: Slurm GRES configuration tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Commit Component Improvements

**Files:**

- Modify: `src/components/TopologyGraph.tsx`
- Modify: `src/simulators/nvidiaSmiSimulator.ts`

**Step 1: Run component tests**

Run: `npm test -- --run src/components/__tests__/TopologyViewer.test.ts src/simulators/__tests__/nvidiaSmiSimulator.test.ts`
Expected: All tests pass

**Step 2: Stage modified source files**

```bash
git add src/components/TopologyGraph.tsx
git add src/simulators/nvidiaSmiSimulator.ts
```

**Step 3: Commit**

```bash
git commit -m "feat: improve topology graph and nvidia-smi validation

- TopologyGraph: Add NVSwitch click handlers and detail panel
- nvidiaSmiSimulator: Add ECC aggregate field validation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Commit Documentation

**Files:**

- Create: `docs/plans/2026-01-29-logic-test-fixes.md`
- Create: `docs/plans/2026-01-29-master-logic-test.md`
- Create: `docs/plans/2026-01-29-ncp-aii-certification-coverage.md`
- Create: `docs/plans/2026-02-02-adversarial-input-fixes.md`
- Create: `docs/testing/2026-02-02-adversarial-ux-audit.md`

**Step 1: Stage documentation files**

```bash
git add docs/plans/2026-01-29-logic-test-fixes.md
git add docs/plans/2026-01-29-master-logic-test.md
git add docs/plans/2026-01-29-ncp-aii-certification-coverage.md
git add docs/plans/2026-02-02-adversarial-input-fixes.md
git add docs/testing/2026-02-02-adversarial-ux-audit.md
```

**Step 2: Commit**

```bash
git commit -m "docs: add implementation plans and testing documentation

- Logic test fixes plan
- Master logic test plan
- NCP-AII certification coverage plan
- Adversarial input fixes plan
- Adversarial UX audit results

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Clean Up Deleted Files

**Files:**

- Delete: `IMPLEMENTATION-PLAN.md`
- Delete: `UI-2.0-IMPLEMENTATION-PLAN.md`

**Step 1: Stage deletions**

```bash
git add IMPLEMENTATION-PLAN.md
git add UI-2.0-IMPLEMENTATION-PLAN.md
```

**Step 2: Commit**

```bash
git commit -m "chore: remove obsolete implementation plan files

Plans have been moved to docs/plans/ directory

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Final Verification

**Step 1: Verify clean working directory**

Run: `git status`
Expected: Only untracked local config files (.claude/_.local._, .playwright-mcp/, nul, UI-UX-REPORT.md)

**Step 2: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass (1317+)

**Step 3: View commit history**

Run: `git log --oneline -10`
Expected: See the 6 new commits in logical order

---

## Verification Checklist

- [ ] .gitignore updated with new exclusions
- [ ] 9 new lab scenarios committed
- [ ] 3 new test files committed
- [ ] TopologyGraph and nvidiaSmiSimulator improvements committed
- [ ] Documentation committed
- [ ] Obsolete plan files removed
- [ ] Working directory clean (except local files)
- [ ] All tests pass
