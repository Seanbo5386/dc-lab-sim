# Scenario Job Injection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CLI output (`sinfo`, `squeue`, `nvidia-smi`) reflect the narrative context of each scenario by injecting realistic pre-existing jobs when scenarios load.

**Architecture:** Two new fault types (`allocate-job`, `set-slurm-state`) flow through the existing `applyFaultsToContext()` pipeline. `allocate-job` sets node slurmState + GPU allocation on ScenarioContext AND stores a job descriptor in a new `seedJobs` array. When Terminal mounts or scenario changes, SlurmSimulator reads seed jobs and populates its internal `jobs[]` array. All existing CLI commands then reflect realistic state.

**Tech Stack:** TypeScript, Zustand, Vitest

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/types/scenarios.ts` | FaultType union, SeedJob interface | Modify |
| `src/store/scenarioContext.ts` | ScenarioContext seed job storage | Modify |
| `src/utils/scenarioLoader.ts` | Fault application logic | Modify |
| `src/simulators/slurmSimulator.ts` | Job injection + context sync | Modify |
| `src/components/Terminal.tsx` | Trigger sync on scenario change | Modify |
| `src/data/narrativeScenarios.json` | Scenario autoFaults data | Modify |
| `src/store/__tests__/scenarioContext.test.ts` | ScenarioContext seed job tests | Modify |
| `src/utils/__tests__/scenarioLoader.test.ts` | applyFaultsToContext tests | Modify |
| `src/simulators/__tests__/slurmSimulator.inject.test.ts` | SlurmSimulator injection tests | Create |

---

## Chunk 1: Types and ScenarioContext

### Task 1: Add new fault types and SeedJob interface

**Files:**
- Modify: `src/types/scenarios.ts:7-17` (FaultType union)
- Modify: `src/types/scenarios.ts` (new SeedJob export after FaultInjectionConfig)

- [ ] **Step 1: Add `allocate-job` and `set-slurm-state` to FaultType union**

In `src/types/scenarios.ts`, change the FaultType union (lines 7-17) from:

```typescript
export type FaultType =
  | "xid-error"
  | "ecc-error"
  | "thermal"
  | "power"
  | "nvlink-failure"
  | "gpu-hang"
  | "memory-full"
  | "driver-error"
  | "pcie-error"
  | "add-node";
```

To:

```typescript
export type FaultType =
  | "xid-error"
  | "ecc-error"
  | "thermal"
  | "power"
  | "nvlink-failure"
  | "gpu-hang"
  | "memory-full"
  | "driver-error"
  | "pcie-error"
  | "add-node"
  | "allocate-job"
  | "set-slurm-state";
```

- [ ] **Step 2: Add SeedJob interface**

After the `FaultInjectionConfig` interface (line 26), add:

```typescript
/**
 * Describes a pre-existing Slurm job to inject into scenarios.
 * Used by the `allocate-job` fault type to populate squeue output
 * and set realistic node/GPU state.
 */
export interface SeedJob {
  jobName: string;
  nodeIds: string[];
  gpusPerNode: number;
  runtime: string;
  user: string;
  partition: string;
  state: "RUNNING" | "PENDING" | "FAILED";
  reasonPending?: string;
  utilization?: number;
  memoryPercent?: number;
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (new types are additive)

- [ ] **Step 4: Commit**

```bash
git add src/types/scenarios.ts
git commit -m "feat: add allocate-job and set-slurm-state fault types"
```

### Task 2: Add seed job storage to ScenarioContext

**Files:**
- Modify: `src/store/scenarioContext.ts:45-51` (private fields)
- Modify: `src/store/scenarioContext.ts` (new public methods)
- Test: `src/store/__tests__/scenarioContext.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/store/__tests__/scenarioContext.test.ts`, inside the existing top-level describe:

```typescript
describe("Seed Jobs", () => {
  it("should store and retrieve seed jobs", () => {
    const cluster = createTestCluster();
    const ctx = new ScenarioContext("test-scenario", cluster);

    ctx.addSeedJob({
      jobName: "test-training",
      nodeIds: ["node-01"],
      gpusPerNode: 2,
      runtime: "1:00:00",
      user: "researcher",
      partition: "gpu",
      state: "RUNNING",
    });

    const seeds = ctx.getSeedJobs();
    expect(seeds).toHaveLength(1);
    expect(seeds[0].jobName).toBe("test-training");
  });

  it("should clear seed jobs", () => {
    const cluster = createTestCluster();
    const ctx = new ScenarioContext("test-scenario", cluster);

    ctx.addSeedJob({
      jobName: "job-1",
      nodeIds: ["node-01"],
      gpusPerNode: 2,
      runtime: "1:00:00",
      user: "user1",
      partition: "gpu",
      state: "RUNNING",
    });

    ctx.clearSeedJobs();
    expect(ctx.getSeedJobs()).toHaveLength(0);
  });

  it("should accumulate multiple seed jobs", () => {
    const cluster = createTestCluster();
    const ctx = new ScenarioContext("test-scenario", cluster);

    ctx.addSeedJob({
      jobName: "job-1",
      nodeIds: ["node-01"],
      gpusPerNode: 2,
      runtime: "1:00:00",
      user: "user1",
      partition: "gpu",
      state: "RUNNING",
    });
    ctx.addSeedJob({
      jobName: "job-2",
      nodeIds: ["node-02"],
      gpusPerNode: 2,
      runtime: "2:00:00",
      user: "user2",
      partition: "gpu",
      state: "PENDING",
      reasonPending: "Resources",
    });

    expect(ctx.getSeedJobs()).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/scenarioContext.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `addSeedJob` is not a function

- [ ] **Step 3: Add seed job storage to ScenarioContext**

In `src/store/scenarioContext.ts`, add to the private fields (after line 51, `private eventLog: EventLog;`):

```typescript
  private seedJobs: SeedJob[] = [];
```

Add the import at the top of the file (alongside existing scenario type imports):

```typescript
import type { SeedJob } from "@/types/scenarios";
```

Add three public methods after the existing `getDiff()` method (after line ~504):

```typescript
  // ── Seed Jobs (for allocate-job fault type) ──────────────────────

  addSeedJob(job: SeedJob): void {
    this.seedJobs.push(job);
  }

  getSeedJobs(): SeedJob[] {
    return [...this.seedJobs];
  }

  clearSeedJobs(): void {
    this.seedJobs = [];
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/scenarioContext.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: All tests PASS including 3 new seed job tests

- [ ] **Step 5: Commit**

```bash
git add src/store/scenarioContext.ts src/store/__tests__/scenarioContext.test.ts
git commit -m "feat: add seed job storage to ScenarioContext"
```

---

## Chunk 2: Fault Application Logic

### Task 3: Handle allocate-job and set-slurm-state in applyFaultsToContext

**Files:**
- Modify: `src/utils/scenarioLoader.ts:193-302` (applyFaultsToContext switch)
- Test: `src/utils/__tests__/scenarioLoader.test.ts`

- [ ] **Step 1: Write the failing test for allocate-job**

Add to `src/utils/__tests__/scenarioLoader.test.ts`. Find the existing `describe("applyFaultsToContext"` block and add inside it:

```typescript
  it("should handle allocate-job fault: set node slurmState and GPU allocation", () => {
    const cluster = createMockCluster();
    const context = new ScenarioContext("test", cluster);

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        type: "allocate-job",
        severity: "warning",
        parameters: {
          jobName: "test-training",
          nodeIds: ["dgx-00"],
          gpusPerNode: 2,
          runtime: "1:30:00",
          user: "researcher",
        },
      },
    ];

    applyFaultsToContext(faults, context);

    // Node should be allocated
    const node = context.getNode("dgx-00");
    expect(node?.slurmState).toBe("alloc");

    // GPUs should have utilization set (default ~85)
    const gpu0 = context.getGPU("dgx-00", 0);
    expect(gpu0?.allocatedJobId).toBeDefined();
    expect(gpu0?.utilization).toBeGreaterThan(50);

    // Seed job should be stored
    const seeds = context.getSeedJobs();
    expect(seeds).toHaveLength(1);
    expect(seeds[0].jobName).toBe("test-training");
    expect(seeds[0].state).toBe("RUNNING");
  });

  it("should handle allocate-job with custom utilization", () => {
    const cluster = createMockCluster();
    const context = new ScenarioContext("test", cluster);

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        type: "allocate-job",
        severity: "warning",
        parameters: {
          jobName: "deadlocked-job",
          nodeIds: ["dgx-00"],
          gpusPerNode: 2,
          runtime: "3:00:00",
          user: "user1",
          utilization: 0,
        },
      },
    ];

    applyFaultsToContext(faults, context);

    const gpu0 = context.getGPU("dgx-00", 0);
    expect(gpu0?.utilization).toBe(0);
  });

  it("should handle allocate-job with FAILED state (no GPU allocation)", () => {
    const cluster = createMockCluster();
    const context = new ScenarioContext("test", cluster);

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        type: "allocate-job",
        severity: "warning",
        parameters: {
          jobName: "crashed-job",
          nodeIds: ["dgx-00"],
          gpusPerNode: 2,
          runtime: "0:05:00",
          user: "user1",
          state: "FAILED",
        },
      },
    ];

    applyFaultsToContext(faults, context);

    // FAILED jobs should NOT allocate GPUs or change node state
    const node = context.getNode("dgx-00");
    expect(node?.slurmState).toBe("idle");

    // But seed job should still be stored (for squeue history)
    const seeds = context.getSeedJobs();
    expect(seeds).toHaveLength(1);
    expect(seeds[0].state).toBe("FAILED");
  });

  it("should handle set-slurm-state fault", () => {
    const cluster = createMockCluster();
    const context = new ScenarioContext("test", cluster);

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        type: "set-slurm-state",
        severity: "warning",
        parameters: {
          state: "drain",
          reason: "BMC firmware update",
        },
      },
    ];

    applyFaultsToContext(faults, context);

    const node = context.getNode("dgx-00");
    expect(node?.slurmState).toBe("drain");
  });

  it("should handle allocate-job spanning multiple nodes", () => {
    const cluster = createMockCluster();
    // Ensure cluster has at least 2 nodes — createMockCluster may only have 1.
    // If so, add a second node or use a cluster with 2+ nodes.
    const context = new ScenarioContext("test", cluster);

    const faults: FaultInjectionConfig[] = [
      {
        nodeId: "dgx-00",
        type: "allocate-job",
        severity: "warning",
        parameters: {
          jobName: "multi-node-train",
          nodeIds: ["dgx-00", "dgx-01"],
          gpusPerNode: 2,
          runtime: "2:00:00",
          user: "researcher",
        },
      },
    ];

    applyFaultsToContext(faults, context);

    // Both nodes should be allocated (if they exist in cluster)
    const node0 = context.getNode("dgx-00");
    expect(node0?.slurmState).toBe("alloc");
    // node dgx-01 may not exist in mock — test conditionally
    const node1 = context.getNode("dgx-01");
    if (node1) {
      expect(node1.slurmState).toBe("alloc");
    }
  });
```

Note: You may need to add `SeedJob` to imports and ensure `createMockCluster()` produces nodes with IDs like `dgx-00`. Check the existing mock — if it uses different node IDs, adapt the test to match.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/scenarioLoader.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — new tests fail because allocate-job/set-slurm-state hit the `default` case (unknown fault type warning)

- [ ] **Step 3: Implement the new fault handlers**

In `src/utils/scenarioLoader.ts`, in the `applyFaultsToContext()` function's switch statement, add two new cases **before** the `default` case (before line ~298):

```typescript
      case "allocate-job": {
        const jobName = (parameters?.jobName as string) ?? "training-job";
        const nodeIds = (parameters?.nodeIds as string[]) ?? [nodeId];
        const gpusPerNode = (parameters?.gpusPerNode as number) ?? 8;
        const runtime = (parameters?.runtime as string) ?? "1:00:00";
        const user = (parameters?.user as string) ?? "researcher";
        const partition = (parameters?.partition as string) ?? "gpu";
        const jobState = (parameters?.state as "RUNNING" | "PENDING" | "FAILED") ?? "RUNNING";
        const utilization = parameters?.utilization as number | undefined;
        const memoryPercent = parameters?.memoryPercent as number | undefined;
        const reasonPending = parameters?.reasonPending as string | undefined;

        // Store seed job for SlurmSimulator to pick up
        context.addSeedJob({
          jobName,
          nodeIds,
          gpusPerNode,
          runtime,
          user,
          partition,
          state: jobState,
          reasonPending,
          utilization,
          memoryPercent,
        });

        // Only RUNNING jobs allocate nodes and GPUs
        if (jobState === "RUNNING") {
          // Use a deterministic job ID based on seed job count
          const seedJobId = 1000 + context.getSeedJobs().length - 1;
          const targetUtil = utilization ?? 85;
          const memPct = memoryPercent ?? 75;

          for (const nId of nodeIds) {
            const node = context.getNode(nId);
            if (!node) continue;

            context.setSlurmState(nId, "alloc");

            // Allocate GPUs with deterministic values (no jitter for reproducibility)
            const gpuIds = node.gpus.slice(0, gpusPerNode).map((g) => g.id);
            for (const gId of gpuIds) {
              const gpu = context.getGPU(nId, gId);
              if (!gpu) continue;
              context.updateGPU(nId, gId, {
                utilization: targetUtil,
                memoryUsed: Math.floor(gpu.memoryTotal * (memPct / 100)),
                powerDraw: gpu.powerLimit * (targetUtil > 0 ? 0.80 : 0.15),
                temperature: targetUtil > 0 ? 72 : 35,
                allocatedJobId: seedJobId,
              });
            }
          }
        }
        break;
      }

      case "set-slurm-state": {
        const targetState = (parameters?.state as string) ?? "idle";
        const reason = parameters?.reason as string | undefined;
        context.setSlurmState(
          nodeId,
          targetState as "idle" | "alloc" | "drain" | "down",
          reason,
        );
        break;
      }
```

Also add the `SeedJob` import if not already present — but since we import `FaultInjectionConfig` from `@/types/scenarios`, the `SeedJob` type is used internally by `ScenarioContext`, so no additional import is needed here (the `context.addSeedJob()` call takes the inline object).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/scenarioLoader.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run 2>&1 | tail -5`
Expected: All tests pass, no regressions

- [ ] **Step 6: Commit**

```bash
git add src/utils/scenarioLoader.ts src/utils/__tests__/scenarioLoader.test.ts
git commit -m "feat: handle allocate-job and set-slurm-state in applyFaultsToContext"
```

---

## Chunk 3: SlurmSimulator Job Injection

### Task 4: Add injectJob, syncFromContext, and clearJobs to SlurmSimulator

**Files:**
- Modify: `src/simulators/slurmSimulator.ts:42-50` (class fields/methods)
- Create: `src/simulators/__tests__/slurmSimulator.inject.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/simulators/__tests__/slurmSimulator.inject.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlurmSimulator } from "../slurmSimulator";
import type { CommandContext } from "@/types/commands";
import type { ClusterConfig } from "@/types/hardware";
import { createDefaultCluster } from "@/utils/clusterFactory";

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the simulation store (required by BaseSimulator)
vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: {
    getState: vi.fn(() => ({
      cluster: createDefaultCluster(),
      trackToolUsage: vi.fn(),
    })),
  },
}));

function createTestContext(): CommandContext {
  const cluster = createDefaultCluster();
  return {
    currentNode: cluster.nodes[0].id,
    currentPath: "/root",
    environment: { PATH: "/usr/bin", HOME: "/root", USER: "root" },
    history: [],
    cluster,
  };
}

describe("SlurmSimulator Job Injection", () => {
  let sim: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    sim = new SlurmSimulator();
    context = createTestContext();
  });

  describe("injectJob", () => {
    it("should add a RUNNING job visible in squeue", () => {
      sim.injectJob({
        jobName: "test-training",
        nodeIds: ["dgx-00", "dgx-01"],
        gpusPerNode: 8,
        runtime: "2:30:00",
        user: "researcher",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.execute("squeue", [], context);
      expect(result.output).toContain("test-training");
      expect(result.output).toContain("researcher");
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("R");
    });

    it("should add a PENDING job with reason", () => {
      sim.injectJob({
        jobName: "waiting-job",
        nodeIds: [],
        gpusPerNode: 8,
        runtime: "0:00:00",
        user: "user2",
        partition: "gpu",
        state: "PENDING",
        reasonPending: "Resources",
      });

      const result = sim.execute("squeue", [], context);
      expect(result.output).toContain("waiting-job");
      expect(result.output).toContain("PD");
      expect(result.output).toContain("Resources");
    });

    it("should add a FAILED job visible in squeue", () => {
      sim.injectJob({
        jobName: "crashed-job",
        nodeIds: ["dgx-02"],
        gpusPerNode: 4,
        runtime: "0:05:30",
        user: "mlteam",
        partition: "gpu",
        state: "FAILED",
      });

      const result = sim.execute("squeue", ["-t", "all"], context);
      expect(result.output).toContain("crashed-job");
      expect(result.output).toContain("F");
    });

    it("should increment job IDs for multiple injected jobs", () => {
      sim.injectJob({
        jobName: "job-1",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });
      sim.injectJob({
        jobName: "job-2",
        nodeIds: ["dgx-01"],
        gpusPerNode: 8,
        runtime: "2:00:00",
        user: "user2",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.execute("squeue", [], context);
      expect(result.output).toContain("job-1");
      expect(result.output).toContain("job-2");
    });
  });

  describe("clearJobs", () => {
    it("should remove all injected jobs", () => {
      sim.injectJob({
        jobName: "will-be-cleared",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      sim.clearJobs();

      const result = sim.execute("squeue", [], context);
      // Should show only the header, no jobs
      expect(result.output).not.toContain("will-be-cleared");
    });

    it("should reset job ID counter", () => {
      sim.injectJob({
        jobName: "old-job",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      sim.clearJobs();

      sim.injectJob({
        jobName: "new-job",
        nodeIds: ["dgx-00"],
        gpusPerNode: 8,
        runtime: "1:00:00",
        user: "user1",
        partition: "gpu",
        state: "RUNNING",
      });

      const result = sim.execute("squeue", [], context);
      expect(result.output).toContain("1000");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/simulators/__tests__/slurmSimulator.inject.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `sim.injectJob is not a function`

- [ ] **Step 3: Implement injectJob, clearJobs, and syncFromContext**

In `src/simulators/slurmSimulator.ts`, add the import near the top (with other type imports):

```typescript
import type { SeedJob } from "@/types/scenarios";
```

Add three public methods to the `SlurmSimulator` class. Place them right after the constructor (after `this.initializeDefinitionRegistry();` closing brace, around line 50):

```typescript
  /**
   * Inject a pre-existing job into the simulator.
   * Used by scenario initialization to populate squeue/scontrol output.
   * Node slurmState and GPU allocation are handled separately by applyFaultsToContext.
   */
  injectJob(seed: SeedJob): void {
    const job: SlurmJob = {
      jobId: this.nextJobId++,
      partition: seed.partition,
      name: seed.jobName,
      user: seed.user,
      state: seed.state,
      time: seed.runtime,
      timeLimit: "infinite",
      nodes: seed.state === "PENDING" ? 0 : seed.nodeIds.length,
      nodelist:
        seed.state === "PENDING"
          ? `(${seed.reasonPending ?? "Resources"})`
          : seed.nodeIds.join(","),
      cpus: seed.nodeIds.length * 128,
      gpus: seed.nodeIds.length * seed.gpusPerNode,
      memory: "512G",
      submitTime: new Date(Date.now() - this.parseRuntime(seed.runtime)),
      startTime:
        seed.state === "RUNNING"
          ? new Date(Date.now() - this.parseRuntime(seed.runtime))
          : undefined,
      endTime: seed.state === "FAILED" ? new Date() : undefined,
      priority: 1000 + Math.floor(Math.random() * 100),
      account: "default",
      qos: "normal",
      workDir: `/home/${seed.user}`,
      command: `${seed.jobName}.sh`,
      reasonPending: seed.reasonPending,
    };
    this.jobs.push(job);
  }

  /**
   * Read seed jobs from a ScenarioContext and populate internal job state.
   */
  syncFromContext(context: CommandContext): void {
    const sc = context.scenarioContext;
    if (!sc) return;
    const seeds = sc.getSeedJobs();
    for (const seed of seeds) {
      this.injectJob(seed);
    }
  }

  /**
   * Clear all jobs and reset the job ID counter.
   * Called when exiting a scenario or loading a new one.
   */
  clearJobs(): void {
    this.jobs = [];
    this.nextJobId = 1000;
  }

  /** Parse "H:MM:SS" runtime string to milliseconds */
  private parseRuntime(runtime: string): number {
    const parts = runtime.split(":").map(Number);
    if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
    return 0;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/simulators/__tests__/slurmSimulator.inject.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/simulators/slurmSimulator.ts src/simulators/__tests__/slurmSimulator.inject.test.ts
git commit -m "feat: add job injection to SlurmSimulator"
```

---

## Chunk 4: Terminal Sync Wiring

### Task 5: Wire Terminal to sync slurm jobs on scenario change

**Files:**
- Modify: `src/components/Terminal.tsx:216-241` (scenario context effect)

- [ ] **Step 1: Update the scenario context effect**

In `src/components/Terminal.tsx`, find the scenario context effect (lines 216-241). Replace it with:

```typescript
  useEffect(() => {
    const store = useSimulationStore.getState();
    if (store.activeScenario) {
      const context = scenarioContextManager.getActiveContext();
      if (context) {
        currentContext.current.scenarioContext = context;
        currentContext.current.cluster = context.getCluster();

        // Sync seed jobs from scenario context into slurm simulator
        slurmSimulator.current.clearJobs();
        slurmSimulator.current.syncFromContext(currentContext.current);

        logger.debug(
          `Terminal: Using scenario context for ${store.activeScenario.id}`,
        );
      } else {
        scenarioContextManager.setActiveContext(null);
        currentContext.current.scenarioContext = undefined;
        currentContext.current.cluster = cluster;

        slurmSimulator.current.clearJobs();

        logger.debug("Terminal: Cleared scenario context");
      }
    } else {
      // No active scenario — clear any leftover scenario state
      if (currentContext.current.scenarioContext) {
        currentContext.current.scenarioContext = undefined;
        currentContext.current.cluster = cluster;
        slurmSimulator.current.clearJobs();
      }
    }
  }, [cluster, activeScenarioId]);
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal.tsx
git commit -m "feat: sync slurm seed jobs on scenario context change"
```

---

## Chunk 5: Scenario Data Updates

### Task 6: Add allocate-job autoFaults to The Firmware Emergency

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain1-firmware-emergency step 1)

- [ ] **Step 1: Add autoFaults to step 1**

In `src/data/narrativeScenarios.json`, find the `domain1-firmware-emergency` scenario's step 1 (around line 629). The step currently has no `autoFaults` field. Add one after the `validation` object:

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "bert-finetune-4node",
            "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03"],
            "gpusPerNode": 8,
            "runtime": "4:12:33",
            "user": "jchen"
          }
        },
        {
          "nodeId": "dgx-04",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "gpt-pretrain-2node",
            "nodeIds": ["dgx-04", "dgx-05"],
            "gpusPerNode": 8,
            "runtime": "1:45:10",
            "user": "mwilson"
          }
        },
        {
          "nodeId": "dgx-06",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "diffusion-train",
            "nodeIds": ["dgx-06"],
            "gpusPerNode": 8,
            "runtime": "6:30:22",
            "user": "apark"
          }
        },
        {
          "nodeId": "dgx-07",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "vit-eval-batch",
            "nodeIds": ["dgx-07"],
            "gpusPerNode": 4,
            "runtime": "0:22:15",
            "user": "lzhang"
          }
        }
      ]
```

This gives: 4 jobs across dgx-00..dgx-07 (8 nodes allocated), dgx-08..dgx-15 remain idle.

- [ ] **Step 2: Update step 1 validation pattern**

The current validation pattern is `"STATE|alloc|idle"`. This should still work since `sinfo` will now show both `alloc` and `idle` states. No change needed.

- [ ] **Step 3: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to Firmware Emergency scenario"
```

### Task 7: Add allocate-job autoFaults to The Silent Cluster

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain4-silent-cluster step 1)

- [ ] **Step 1: Find the silent-cluster scenario and add autoFaults to step 1**

Find `domain4-silent-cluster` step 1 in the JSON. Add `autoFaults` after the step's `validation` object:

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "llm-megatron-8node",
            "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03", "dgx-04", "dgx-05", "dgx-06", "dgx-07"],
            "gpusPerNode": 8,
            "runtime": "3:22:45",
            "user": "researcher1",
            "utilization": 0
          }
        },
        {
          "nodeId": "dgx-08",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "resnet-benchmark",
            "nodeIds": ["dgx-08"],
            "gpusPerNode": 8,
            "runtime": "0:45:12",
            "user": "benchuser"
          }
        },
        {
          "nodeId": "dgx-09",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "vae-training",
            "nodeIds": ["dgx-09", "dgx-10"],
            "gpusPerNode": 8,
            "runtime": "5:10:30",
            "user": "genai_lab"
          }
        },
        {
          "nodeId": "dgx-11",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "data-preprocessing",
            "nodeIds": ["dgx-11"],
            "gpusPerNode": 4,
            "runtime": "0:15:45",
            "user": "dataeng"
          }
        }
      ]
```

Note: The 8-node LLM job has `utilization: 0` (deadlocked — narrative says it's frozen).

- [ ] **Step 2: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to Silent Cluster scenario"
```

### Task 8: Add allocate-job autoFaults to The NCCL Nightmare

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain4-nccl-nightmare step 1)

- [ ] **Step 1: Find the nccl-nightmare scenario and add autoFaults to step 1**

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "llm-70b-pretrain",
            "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03", "dgx-04", "dgx-05", "dgx-06", "dgx-07"],
            "gpusPerNode": 8,
            "runtime": "3:15:42",
            "user": "airesearch",
            "utilization": 0
          }
        }
      ]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to NCCL Nightmare scenario"
```

### Task 9: Add allocate-job autoFaults to The Bandwidth Bottleneck

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain4-bandwidth-bottleneck step 1)

- [ ] **Step 1: Find the bandwidth-bottleneck scenario and add autoFaults to step 1**

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "nccl-allreduce-test",
            "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03"],
            "gpusPerNode": 8,
            "runtime": "0:35:20",
            "user": "mlops"
          }
        },
        {
          "nodeId": "dgx-06",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "llama-finetune",
            "nodeIds": ["dgx-06", "dgx-07"],
            "gpusPerNode": 8,
            "runtime": "2:10:45",
            "user": "researcher2"
          }
        }
      ]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to Bandwidth Bottleneck scenario"
```

### Task 10: Add allocate-job autoFaults to The Container Crisis

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain3-container-crisis step 1)

- [ ] **Step 1: Find the container-crisis scenario and add autoFaults to step 1**

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "pytorch-train-v2",
            "nodeIds": ["dgx-00", "dgx-01"],
            "gpusPerNode": 8,
            "runtime": "0:05:30",
            "user": "mlteam",
            "state": "FAILED"
          }
        },
        {
          "nodeId": "dgx-02",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "tf-distributed",
            "nodeIds": ["dgx-02", "dgx-03"],
            "gpusPerNode": 8,
            "runtime": "0:02:15",
            "user": "dataeng",
            "state": "FAILED"
          }
        },
        {
          "nodeId": "dgx-04",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "inference-server",
            "nodeIds": ["dgx-04"],
            "gpusPerNode": 4,
            "runtime": "12:30:00",
            "user": "prodops"
          }
        }
      ]
```

Note: Two FAILED container jobs (no GPU allocation) + one running non-container job.

- [ ] **Step 2: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to Container Crisis scenario"
```

### Task 11: Add allocate-job autoFaults to The Storage Showdown

**Files:**
- Modify: `src/data/narrativeScenarios.json` (domain3-storage-showdown step 1)

- [ ] **Step 1: Find the storage-showdown scenario and add autoFaults to step 1**

```json
      "autoFaults": [
        {
          "nodeId": "dgx-00",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "imagenet-train",
            "nodeIds": ["dgx-00", "dgx-01"],
            "gpusPerNode": 8,
            "runtime": "1:20:00",
            "user": "vision_team",
            "utilization": 8
          }
        },
        {
          "nodeId": "dgx-02",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "nlp-preprocessing",
            "nodeIds": ["dgx-02"],
            "gpusPerNode": 4,
            "runtime": "0:45:30",
            "user": "nlp_team",
            "utilization": 10
          }
        },
        {
          "nodeId": "dgx-03",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "diffusion-train-large",
            "nodeIds": ["dgx-03", "dgx-04", "dgx-05", "dgx-06"],
            "gpusPerNode": 8,
            "runtime": "3:55:12",
            "user": "genai_lab",
            "utilization": 8
          }
        },
        {
          "nodeId": "dgx-07",
          "type": "allocate-job",
          "severity": "warning",
          "parameters": {
            "jobName": "rl-training",
            "nodeIds": ["dgx-07"],
            "gpusPerNode": 8,
            "runtime": "0:30:22",
            "user": "rl_team",
            "utilization": 10
          }
        }
      ]
```

Note: All jobs have low utilization (8-10%) to reflect the I/O bottleneck narrative.

- [ ] **Step 2: Commit**

```bash
git add src/data/narrativeScenarios.json
git commit -m "feat: add job allocation faults to Storage Showdown scenario"
```

---

## Chunk 6: Validation and Data Integrity

### Task 12: Add data validation test for allocate-job faults

**Files:**
- Modify: `src/data/__tests__/` (find existing narrative scenarios validation test)

- [ ] **Step 1: Find the existing data validation test file**

Look for a test file in `src/data/__tests__/` that validates `narrativeScenarios.json`. Add a test that verifies all `allocate-job` faults reference valid node IDs (i.e., node IDs that exist in the default 8-node cluster or are within the cluster size).

```typescript
it("allocate-job faults should reference valid node IDs", () => {
  const validNodeIds = Array.from({ length: 16 }, (_, i) =>
    `dgx-${i.toString().padStart(2, "0")}`
  );

  for (const scenario of scenarios) {
    const allFaults = [
      ...(scenario.faults ?? []),
      ...scenario.steps.flatMap((s) => s.autoFaults ?? []),
    ];

    for (const fault of allFaults) {
      if (fault.type === "allocate-job" && fault.parameters?.nodeIds) {
        for (const nodeId of fault.parameters.nodeIds as string[]) {
          expect(
            validNodeIds,
            `Scenario "${scenario.id}" references invalid node "${nodeId}"`,
          ).toContain(nodeId);
        }
      }
    }
  }
});
```

- [ ] **Step 2: Run the data validation tests**

Run: `npx vitest run src/data/__tests__/ --reporter=verbose 2>&1 | tail -20`
Expected: All pass

- [ ] **Step 3: Run full test suite + lint + type check**

Run: `npx vitest run 2>&1 | tail -5 && npx tsc --noEmit 2>&1 | head -5 && npm run lint 2>&1 | tail -5`
Expected: All pass, no errors

- [ ] **Step 4: Commit**

```bash
git add src/data/__tests__/
git commit -m "test: add data validation for allocate-job fault node IDs"
```

### Task 13: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify The Firmware Emergency scenario**

1. Open browser to the app
2. Start "The Firmware Emergency" scenario
3. In terminal, run `sinfo`
4. Verify: 8 nodes show `alloc`, remaining nodes show `idle`
5. Run `squeue`
6. Verify: 4 jobs listed with correct names, users, runtimes
7. Run `nvidia-smi` on an allocated node
8. Verify: GPUs show ~85% utilization, allocated memory

- [ ] **Step 3: Verify The NCCL Nightmare scenario**

1. Start "The NCCL Nightmare" scenario
2. Run `sinfo` — 8 nodes `alloc`
3. Run `squeue` — 1 job
4. Run `nvidia-smi` — GPUs at 0% utilization (deadlocked)

- [ ] **Step 4: Final commit with any adjustments**

If any fixes are needed from manual testing, commit them here.
