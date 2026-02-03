# Master Logic Test Suite Plan

## Overview

Create a comprehensive test suite that validates logical consistency across the entire simulation. When faults are injected or state changes occur, all related metrics, commands, and visualizations must reflect those changes accurately.

## Output Format

- Vitest test suite running with `npm test`
- Detailed console output showing what was tested and any inconsistencies
- Tests fail if logic gaps are found

## Files to Create

- `src/__tests__/logicConsistency.test.ts` - Main test file with all categories

## Test Categories

---

### Category 1: Fault Injection Cascades

For each fault type, verify the complete cascade of effects.

#### 1.1 XID Error Injection

```
Inject XID 79 (GPU fallen off bus) on GPU 0
├─ Verify: gpu.healthStatus === 'Critical'
├─ Verify: gpu.xidErrors contains {code: 79}
├─ Verify: nvidia-smi -q shows error state or limited info
├─ Verify: dcgmi diag -r 3 -i 0 shows failure
├─ Verify: dcgmi health -c shows GPU Critical
├─ Verify: dmesg output contains "Xid.*79"
├─ Verify: nv-fabricmanager diag shows attention needed
└─ Verify: bcm validate pod shows warning for unhealthy GPU
```

#### 1.2 ECC Double-Bit Error

```
Inject ECC DBE on GPU 0
├─ Verify: gpu.healthStatus === 'Critical'
├─ Verify: gpu.eccErrors.doubleBit > 0
├─ Verify: nvidia-smi -q shows ECC error count
├─ Verify: dcgmi health shows ECC violation
├─ Verify: dcgmi policy --get shows ECC policy triggered
└─ Verify: dmesg contains ECC error message
```

#### 1.3 Thermal Fault (85°C)

```
Inject thermal fault on GPU 0
├─ Verify: gpu.temperature >= 85
├─ Verify: gpu.healthStatus === 'Warning'
├─ Verify: gpu.clocksSM reduced by thermal throttling formula
│         Expected: 1410 - ((85-70) * 10) = 1260 MHz or less
├─ Verify: nvidia-smi shows "SW Thermal Slowdown" in throttle reasons
├─ Verify: dcgmi health shows temperature warning
├─ Verify: ipmitool sdr shows high temp reading
└─ Verify: Power draw adjusts (may increase then decrease as throttled)
```

#### 1.4 NVLink Failure

```
Inject NVLink failure on GPU 0, link 0
├─ Verify: gpu.nvlinks[0].status === 'Down'
├─ Verify: gpu.nvlinks[0].txErrors > 0 or rxErrors > 0
├─ Verify: gpu.healthStatus === 'Warning'
├─ Verify: nvidia-smi nvlink --status shows inactive link
├─ Verify: dcgmi nvlink -s shows link error
├─ Verify: nv-fabricmanager query nvlink shows 7/8 active (or similar)
├─ Verify: nv-fabricmanager diag shows degraded fabric
└─ Verify: Topology visualization would show broken link
```

#### 1.5 Power Fault

```
Inject power fault on GPU 0
├─ Verify: gpu.powerDraw significantly changed
├─ Verify: gpu.healthStatus === 'Warning' or 'Critical'
├─ Verify: nvidia-smi shows power state/throttling info
├─ Verify: ipmitool dcmi get_power_reading reflects change
└─ Verify: dcgmi policy shows power violation if policy set
```

#### 1.6 PCIe Error

```
Inject PCIe error on GPU 0
├─ Verify: gpu.healthStatus === 'Critical' or 'Warning'
├─ Verify: lspci shows error state or degraded link
├─ Verify: nvidia-smi shows PCIe info reflecting error
├─ Verify: dmesg shows PCIe AER error
└─ Verify: Bandwidth may be affected
```

Note: The following fault types are NOT currently implemented in metricsSimulator:

- memory-full
- gpu-hang
- driver-error

If these are needed, they should be added to metricsSimulator.ts first.

---

### Category 2: Command Output Consistency

After any state change, ALL commands reading that state must report consistently.

#### 2.1 Cross-Command GPU State Consistency

```
For each GPU in each node:
├─ Get GPU state from store
├─ Run nvidia-smi -q -i <gpu>
├─ Run dcgmi dmon -i <gpu> (single sample)
├─ Run dcgmi health -c
├─ Verify: Temperature matches across all (within tolerance)
├─ Verify: Utilization matches across all (within tolerance)
├─ Verify: Memory used matches across all
├─ Verify: Power draw matches across all
├─ Verify: Health status interpretation is consistent
└─ Verify: Clock speeds match
```

#### 2.2 Cross-Command NVLink Consistency

```
For each GPU:
├─ Get NVLink state from store
├─ Run nvidia-smi nvlink --status -i <gpu>
├─ Run dcgmi nvlink -s -i <gpu>
├─ Run nv-fabricmanager query nvlink
├─ Verify: Active link count matches
├─ Verify: Link status (active/inactive) matches
├─ Verify: Error counts are consistent
└─ Verify: Bandwidth readings are plausible
```

#### 2.3 Cross-Command Slurm Consistency

```
For each node:
├─ Get node.slurmState from store
├─ Run sinfo
├─ Run scontrol show node <node>
├─ Verify: State (idle/alloc/drain/down) matches
├─ Verify: Reason (if drained) matches
├─ Verify: Available resources match GPU count
└─ Verify: Allocated resources match running jobs
```

#### 2.4 Cross-Command Cluster Consistency

```
├─ Get cluster state from store
├─ Run bcm-node list
├─ Run sinfo
├─ Run crm status
├─ Verify: Node count matches
├─ Verify: Node health status matches
├─ Verify: Total GPU count matches
└─ Verify: BCM HA status reflects cluster config
```

#### 2.5 All Simulators Output Validation

For each simulator, verify it produces valid output and reflects current state:

```
Simulators to test (ALL 17 simulators):

NVIDIA GPU Tools (nvidiaSmiSimulator):
├─ nvidia-smi (subcommands: -q, -L, dmon, nvlink, topo, mig)

DCGM Tools (dcgmiSimulator):
├─ dcgmi (subcommands: diag, dmon, health, policy, nvlink, group, discovery, stats, fieldgroup)

Fabric Manager (fabricManagerSimulator):
├─ nv-fabricmanager (subcommands: query, diag, status, help)

Slurm Tools (slurmSimulator):
├─ scontrol (show nodes, show job, update)
├─ sinfo (various formats)
├─ squeue (running jobs)
├─ sbatch (job submission)
├─ scancel (job cancellation)
├─ sacct (job history)

BCM Tools (bcmSimulator):
├─ bcm (shell commands, ha status, job list/logs, validate pod)
├─ bcm-node (list, show)
├─ crm status

IPMI Tools (ipmitoolSimulator):
├─ ipmitool (subcommands: sdr, dcmi, sel, mc, sensor, chassis, lan, user, fru, raw)

InfiniBand Tools (infinibandSimulator):
├─ ibstat (HCA status)
├─ ibswitches (switch list)
├─ iblinkinfo (link info)
├─ ibdiagnet (diagnostics)
├─ perftest (bandwidth tests)
├─ ib_write_bw, ib_read_bw (RDMA benchmarks)

Mellanox Tools (mellanoxSimulator):
├─ mst (Mellanox Software Tools)
├─ mlxconfig (configuration)
├─ mlxlink (link diagnostics)
├─ mlxcables (cable info)
├─ mlxup (firmware update)
├─ mlxfwmanager (firmware management)

Basic System Tools (basicSystemSimulator):
├─ hostname
├─ uname
├─ uptime
├─ lscpu
├─ free
├─ dmidecode
├─ dmesg
├─ systemctl
├─ hostnamectl
├─ timedatectl
├─ lsmod
├─ modinfo
├─ top
├─ ps
├─ numactl

PCI Tools (pciToolsSimulator):
├─ lspci (PCI device info)
├─ journalctl (system journal)

Container Tools (containerSimulator):
├─ docker (container management)
├─ ngc (NVIDIA GPU Cloud)
├─ enroot (container runtime)

Storage Tools (storageSimulator):
├─ df (disk free)
├─ mount (mount info)
├─ lfs (Lustre filesystem)

Benchmark Tools (benchmarkSimulator):
├─ hpl (High Performance Linpack)
├─ nccl-test (NCCL benchmarks)
├─ gpu-burn (GPU stress test)

NVSM (nvsmSimulator):
├─ nvsm (NVIDIA System Management - show, dump commands)

NVLink Audit (nvlinkAuditSimulator):
├─ nvlink-audit (NVLink health auditing)

CMSH (cmshSimulator):
├─ cmsh (Cluster Management Shell)

NVIDIA Bug Report (nvidiaBugReportSimulator):
├─ nvidia-bug-report.sh (diagnostic report generation)
```

---

### Category 3: Slurm ↔ GPU State Synchronization

#### 3.1 Job Allocation Updates GPU State

```
Submit job requiring 4 GPUs on node dgx-00
├─ Wait for job to start (state = RUNNING)
├─ Verify: 4 GPUs have allocatedJobId set
├─ Verify: Those GPUs have utilization ~85% (not idle ~5%)
├─ Verify: Those GPUs have memory allocated (~70%)
├─ Verify: Those GPUs have power draw increased (~75% of limit)
├─ Verify: Node slurmState === 'alloc'
├─ Verify: squeue shows job running on dgx-00
└─ Verify: scontrol show job shows correct resource allocation
```

#### 3.2 Job Completion Releases GPU State

```
After job completes or is cancelled:
├─ Verify: GPUs have allocatedJobId cleared
├─ Verify: GPU utilization returns to idle (~5%)
├─ Verify: GPU memory returns to minimal (~1%)
├─ Verify: GPU power returns to idle (~15% of limit)
├─ Verify: Node slurmState === 'idle' (if no other jobs)
├─ Verify: squeue no longer shows the job
└─ Verify: sacct shows job completed
```

#### 3.3 Node Drain Prevents Scheduling

```
Drain node dgx-00 with reason "maintenance"
├─ Verify: node.slurmState === 'drain'
├─ Verify: node.slurmReason === 'maintenance'
├─ Verify: sinfo shows dgx-00 as drained
├─ Submit new job
├─ Verify: Job does NOT get scheduled on dgx-00
└─ Verify: Job schedules on other available node or stays pending
```

#### 3.4 GPU Failure Affects Job Scheduling

```
Inject critical fault on GPU 0 of dgx-00
├─ If job was running on that GPU:
│  ├─ Verify: Job state reflects issue (or continues on other GPUs)
│  └─ Verify: squeue/sacct shows appropriate status
├─ Submit new job requiring that specific GPU
└─ Verify: Scheduling behavior is appropriate (may fail or use other GPUs)
```

---

### Category 4: Metrics History Accuracy

#### 4.1 State Changes Appear in History

```
├─ Record initial metrics at T0
├─ Inject thermal fault at T1
├─ Wait for metrics update cycle
├─ Verify: History contains temperature spike at ~T1
├─ Verify: History shows clock reduction at ~T1
├─ Clear fault at T2
├─ Wait for metrics to normalize
├─ Verify: History shows temperature recovery at ~T2
└─ Verify: History shows clock restoration at ~T2
```

#### 4.2 Aggregated Cluster Metrics Track Correctly

```
├─ Get initial cluster aggregates (total power, avg temp, healthy GPUs)
├─ Inject fault on one GPU
├─ Verify: Healthy GPU count decreased by 1
├─ Verify: If temp raised, avg cluster temp increased
├─ Verify: Total cluster power reflects individual changes
├─ Clear fault
└─ Verify: Aggregates return to original values
```

#### 4.3 No Stale Data in History

```
├─ Make rapid state changes
├─ Verify: Each change is captured (no dropped updates)
├─ Verify: Timestamps are monotonically increasing
├─ Verify: No duplicate entries
└─ Verify: History length respects configured limits
```

---

### Category 5: Cross-Node Cluster Effects

#### 5.1 Node Failure Reduces Cluster Capacity

```
├─ Get initial cluster: 8 nodes, 64 GPUs
├─ Mark dgx-00 as down (all GPUs critical)
├─ Verify: Cluster healthy GPU count = 56 (64 - 8)
├─ Verify: sinfo shows 7 available nodes
├─ Verify: bcm-node list shows 1 critical node
└─ Verify: bcm validate pod shows warning
```

#### 5.2 Scheduler Respects Node Availability

```
├─ Drain 7 of 8 nodes
├─ Submit job requiring 2 nodes
├─ Verify: Job stays PENDING (insufficient resources)
├─ Undrain one more node
├─ Verify: Job can now potentially run (2 nodes available)
└─ Verify: squeue shows appropriate state changes
```

#### 5.3 Cluster Health Aggregation

```
├─ Verify: Cluster health = OK when all nodes OK
├─ Inject Warning on one node
├─ Verify: Cluster health shows degradation
├─ Inject Critical on another node
├─ Verify: Cluster health reflects worst case
├─ Clear all faults
└─ Verify: Cluster health returns to OK
```

---

### Category 6: Scenario/Lab State Setup

#### 6.1 Scenario Loads Expected State

```
For each defined scenario:
├─ Load scenario
├─ Verify: Expected faults are present
├─ Verify: Expected node states are set
├─ Verify: Expected GPU conditions match scenario definition
├─ Verify: Terminal context is appropriate
└─ Verify: All commands reflect scenario state
```

#### 6.2 Scenario State Isolation

```
├─ Load scenario A (with faults)
├─ Verify: Faults present
├─ Load scenario B (clean state)
├─ Verify: Faults from A are NOT present
├─ Verify: State is clean per scenario B definition
├─ Unload scenario
└─ Verify: Returns to baseline state
```

#### 6.3 Scenario Does Not Pollute Baseline

```
├─ Record baseline state
├─ Load scenario with faults
├─ Make additional changes during scenario
├─ Unload scenario
├─ Verify: State matches original baseline
└─ Verify: Additional changes were also reverted
```

---

## Implementation Steps

### Step 1: Create Test Infrastructure

- Create `src/__tests__/logicConsistency.test.ts`
- Import all simulators and store
- Create helper functions for:
  - Injecting faults programmatically
  - Running commands and capturing output
  - Comparing values with tolerances
  - Resetting state between tests

### Step 2: Implement Category 1 Tests (Fault Cascades)

- Test each fault type (6 implemented: xid, ecc, thermal, nvlink, power, pcie)
- Verify GPU state changes
- Verify command outputs reflect faults
- Use describe/it blocks for organization

### Step 3: Implement Category 2 Tests (Command Consistency)

- Create cross-command comparison tests
- Test all simulators produce valid output
- Verify state consistency across tools

### Step 4: Implement Category 3 Tests (Slurm Sync)

- Test job lifecycle effects on GPU state
- Test node state affects scheduling
- Test bidirectional synchronization

### Step 5: Implement Category 5 Tests (Cluster Effects)

- Test node failure impacts cluster metrics
- Test scheduler respects availability
- Test health aggregation

### Step 6: Implement Category 4 Tests (History Accuracy)

- Test state changes appear in history
- Test aggregated metrics
- Test no stale data

### Step 7: Implement Category 6 Tests (Scenarios)

- Test scenario loading
- Test state isolation
- Test baseline preservation

---

## Helper Functions Needed

```typescript
// Fault injection helpers
function injectFault(nodeId: string, gpuId: number, faultType: FaultType): void;
function clearFault(nodeId: string, gpuId: number): void;
function clearAllFaults(): void;

// Command execution helpers
function runCommand(command: string): CommandResult;
function parseNvidiaSmiOutput(output: string): ParsedGpuInfo;
function parseDcgmiOutput(output: string): ParsedGpuInfo;

// Comparison helpers
function assertValuesMatch(
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
): void;
function assertHealthStatus(
  nodeId: string,
  gpuId: number,
  expected: HealthStatus,
): void;
function assertCommandContains(output: string, expected: string): void;
function assertCommandNotContains(output: string, unexpected: string): void;

// State helpers
function getGpuState(nodeId: string, gpuId: number): GPU;
function getNodeState(nodeId: string): DGXNode;
function getClusterMetrics(): ClusterMetrics;
function resetSimulationState(): void;

// Timing helpers
function waitForMetricsUpdate(): Promise<void>;
function waitForJobState(jobId: number, state: string): Promise<void>;
```

---

## Success Criteria

All tests pass, meaning:

1. Fault injection produces expected state changes
2. All commands report consistent state
3. Slurm and GPU state stay synchronized
4. Metrics history accurately captures changes
5. Cluster-wide metrics aggregate correctly
6. Scenarios load/unload cleanly

If any test fails, it identifies a logic gap that needs fixing.

---

## Estimated Test Count

- Category 1: ~30 tests (6 fault types × 5 verifications each)
- Category 2: ~80 tests (consistency across all 17 simulators, ~50+ commands)
- Category 3: ~20 tests (Slurm sync scenarios)
- Category 4: ~15 tests (history accuracy)
- Category 5: ~15 tests (cluster effects)
- Category 6: ~15 tests (scenario management)

**Total: ~175 tests**
