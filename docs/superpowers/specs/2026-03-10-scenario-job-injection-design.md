# Scenario Job Injection Design

## Problem

Narrative scenarios describe running jobs, allocated nodes, and scheduler state, but the fault injection system only supports hardware faults. CLI tools (`sinfo`, `squeue`, `nvidia-smi`) show a pristine idle cluster regardless of what the narrative says.

Example: "The Firmware Emergency" step 2 says "8 nodes are running jobs" but `sinfo` shows all 8 nodes as `idle`.

## Solution

Add two new fault types that drive full realistic cluster state, plus a sync mechanism between ScenarioContext and SlurmSimulator.

## Architecture

### New Fault Types

#### `allocate-job`

Injects a running Slurm job with all downstream state effects:

- Creates a `SlurmJob` entry (visible in `squeue`, `scontrol show job`)
- Sets target nodes to `slurmState: "alloc"` (visible in `sinfo`)
- Allocates GPUs with realistic metrics (visible in `nvidia-smi`)

Parameters:

```typescript
interface AllocateJobParams {
  jobName: string;           // e.g., "llm-training-8node"
  nodeIds: string[];         // e.g., ["dgx-00", "dgx-01"] — explicit node list
  gpusPerNode?: number;      // default: 8 (all GPUs)
  runtime?: string;          // elapsed time, e.g., "2:45:30" (default: "1:00:00")
  user?: string;             // default: "researcher"
  partition?: string;        // default: "gpu"
  state?: "RUNNING" | "PENDING" | "FAILED"; // default: "RUNNING"
  utilization?: number;      // GPU util override (default: 85). Use 0 for deadlocked, 8 for I/O starved
  memoryPercent?: number;    // GPU memory usage as % of total (default: 75)
  reasonPending?: string;    // for PENDING jobs: "Resources", "Priority", etc.
}
```

#### `set-slurm-state`

Sets a node's Slurm state directly (for pre-drained or down nodes):

Parameters:

```typescript
interface SetSlurmStateParams {
  state: "idle" | "alloc" | "drain" | "down";
  reason?: string;  // e.g., "BMC firmware update"
}
```

### Data Flow

```
narrativeScenarios.json (allocate-job / set-slurm-state autoFaults)
    |
    v
scenarioLoader.ts: applyFaultsToContext()
    |-- allocate-job: sets node slurmState + GPU allocation on ScenarioContext
    |                 stores job descriptor in ScenarioContext.seedJobs[]
    |-- set-slurm-state: sets node slurmState on ScenarioContext
    |
    v
Terminal.tsx: on scenario context change
    |-- calls slurmSimulator.syncFromContext(scenarioContext)
    |-- simulator reads seedJobs, populates internal jobs[] array
    |
    v
sinfo/squeue/nvidia-smi all reflect realistic state
```

### ScenarioContext Changes

Add a `seedJobs` array to store job descriptors that the SlurmSimulator needs:

```typescript
// New type for seed job data
interface SeedJob {
  jobName: string;
  nodeIds: string[];
  gpusPerNode: number;
  runtime: string;
  user: string;
  partition: string;
  state: "RUNNING" | "PENDING" | "FAILED";
  reasonPending?: string;
}

// ScenarioContext additions
class ScenarioContext {
  private seedJobs: SeedJob[] = [];

  addSeedJob(job: SeedJob): void { ... }
  getSeedJobs(): SeedJob[] { ... }
  clearSeedJobs(): void { ... }
}
```

### SlurmSimulator Changes

Add public methods for job injection and context sync:

```typescript
class SlurmSimulator {
  // Inject a single job with full state setup
  injectJob(job: SeedJob, context: CommandContext): void {
    const slurmJob: SlurmJob = {
      jobId: this.nextJobId++,
      name: job.jobName,
      state: job.state,
      nodelist: job.nodeIds.join(","),
      nodes: job.nodeIds.length,
      gpus: job.gpusPerNode * job.nodeIds.length,
      time: job.runtime,
      user: job.user,
      partition: job.partition,
      // ... other fields with sensible defaults
    };
    this.jobs.push(slurmJob);
    // Note: GPU allocation + node slurmState already set by applyFaultsToContext
  }

  // Sync all seed jobs from scenario context
  syncFromContext(context: CommandContext): void {
    const sc = context.scenarioContext;
    if (!sc) return;
    const seeds = sc.getSeedJobs();
    for (const seed of seeds) {
      this.injectJob(seed, context);
    }
  }

  // Clear all injected state (called on scenario exit)
  clearJobs(): void {
    this.jobs = [];
    this.nextJobId = 1000;
  }
}
```

### Terminal.tsx Changes

In the scenario context effect (which already watches `activeScenarioId`), call sync:

```typescript
useEffect(() => {
  if (activeScenarioId && scenarioContext) {
    slurmSimulator.current.clearJobs();
    slurmSimulator.current.syncFromContext(commandContext);
  } else {
    slurmSimulator.current.clearJobs();
  }
}, [activeScenarioId]);
```

## Affected Scenarios

### 1. The Firmware Emergency (`domain1-firmware-emergency`)

**Step 1 autoFaults:** 4 training jobs across dgx-00..dgx-07 (8 nodes allocated, 8 idle)

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
    "parameters": {
      "jobName": "bert-finetune-4node",
      "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03"],
      "gpusPerNode": 8,
      "runtime": "4:12:33",
      "user": "jchen"
    }
  },
  {
    "type": "allocate-job",
    "nodeId": "dgx-04",
    "parameters": {
      "jobName": "gpt-pretrain-2node",
      "nodeIds": ["dgx-04", "dgx-05"],
      "gpusPerNode": 8,
      "runtime": "1:45:10",
      "user": "mwilson"
    }
  },
  {
    "type": "allocate-job",
    "nodeId": "dgx-06",
    "parameters": {
      "jobName": "diffusion-train",
      "nodeIds": ["dgx-06"],
      "gpusPerNode": 8,
      "runtime": "6:30:22",
      "user": "apark"
    }
  },
  {
    "type": "allocate-job",
    "nodeId": "dgx-07",
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

### 2. The Silent Cluster (`domain4-silent-cluster`)

**Step 1 autoFaults:** 4 multi-node jobs, one spanning dgx-01..dgx-08

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-01",
    "parameters": {
      "jobName": "llm-megatron-8node",
      "nodeIds": ["dgx-01", "dgx-02", "dgx-03", "dgx-04", "dgx-05", "dgx-06", "dgx-07"],
      "gpusPerNode": 8,
      "runtime": "3:22:45",
      "user": "researcher1",
      "utilization": 0
    }
  },
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
    "parameters": {
      "jobName": "resnet-benchmark",
      "nodeIds": ["dgx-00"],
      "gpusPerNode": 8,
      "runtime": "0:45:12",
      "user": "benchuser"
    }
  }
]
```

Note: The "frozen" job shows `utilization: 0` — GPUs allocated but idle (deadlock).

### 3. The Bandwidth Bottleneck (`domain4-bandwidth-bottleneck`)

**Step 1 autoFaults:** Training jobs including one on dgx-07

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
    "parameters": {
      "jobName": "nccl-allreduce-test",
      "nodeIds": ["dgx-00", "dgx-01", "dgx-02", "dgx-03"],
      "gpusPerNode": 8,
      "runtime": "0:35:20",
      "user": "mlops"
    }
  },
  {
    "type": "allocate-job",
    "nodeId": "dgx-06",
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

### 4. The NCCL Nightmare (`domain4-nccl-nightmare`)

**Step 1 autoFaults:** 1 large 8-node LLM training job, deadlocked

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
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

### 5. The Container Crisis (`domain3-container-crisis`)

**Step 1 autoFaults:** Mix of running and failed container jobs

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
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
    "type": "allocate-job",
    "nodeId": "dgx-02",
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
    "type": "allocate-job",
    "nodeId": "dgx-04",
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

Note: FAILED jobs don't allocate GPUs or set node state. The inference-server is a non-container job still running.

### 6. The Storage Showdown (`domain3-storage-showdown`)

**Step 1 autoFaults:** Multiple jobs with low GPU utilization (I/O starved)

```json
[
  {
    "type": "allocate-job",
    "nodeId": "dgx-00",
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
    "type": "allocate-job",
    "nodeId": "dgx-02",
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
    "type": "allocate-job",
    "nodeId": "dgx-03",
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
    "type": "allocate-job",
    "nodeId": "dgx-07",
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

Note: All jobs use `utilization: 8-10` to reflect the I/O bottleneck described in the narrative.

## Files Changed

| File | Change |
|---|---|
| `src/types/scenarios.ts` | Add `allocate-job` and `set-slurm-state` to `FaultType` union |
| `src/store/scenarioContext.ts` | Add `SeedJob` type, `seedJobs` array, `addSeedJob()`, `getSeedJobs()`, `clearSeedJobs()` |
| `src/utils/scenarioLoader.ts` | Handle `allocate-job` and `set-slurm-state` in `applyFaultsToContext()` |
| `src/simulators/slurmSimulator.ts` | Add `injectJob()`, `syncFromContext()`, `clearJobs()` public methods |
| `src/components/Terminal.tsx` | Call `syncFromContext()` on scenario context change, `clearJobs()` on exit |
| `src/data/narrativeScenarios.json` | Add autoFaults to 6 scenarios |

## Testing Strategy

- Unit tests for `applyFaultsToContext()` with new fault types
- Unit tests for `SlurmSimulator.injectJob()` verifying squeue/sinfo output
- Integration test: load scenario with allocate-job faults, verify sinfo shows alloc nodes
- Data validation test: all allocate-job faults reference valid node IDs
