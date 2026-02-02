# NCP-AI Infrastructure Certification Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand DC-Sim to provide comprehensive coverage of all NVIDIA NCP-AI Infrastructure certification exam domains.

**Architecture:** Phased approach adding scenarios, simulator enhancements, and learning path content. Each phase targets specific certification gaps while maintaining backward compatibility.

**Tech Stack:** TypeScript, React, Vitest, Zustand, JSON scenarios

---

## Phase Overview

| Phase | Focus Area | Exam Coverage Impact | Effort |
|-------|------------|---------------------|--------|
| 1 | Control Plane Installation (Domain 3) | +15% coverage | Medium |
| 2 | System Bring-up Gaps (Domain 1) | +12% coverage | Medium |
| 3 | Multi-Node Verification (Domain 2) | +8% coverage | Medium |
| 4 | Physical Layer & Advanced (Domain 5) | +3% coverage | Small |

**Total Estimated Impact:** Domain coverage from ~55% → ~90%

---

## Phase 1: Control Plane Installation (Domain 3 - Currently 30% → 75%)

This is the weakest area. Focus on Slurm configuration, DCGM policies, and Kubernetes basics.

---

### Task 1.1: Add Slurm Configuration Scenario

**Files:**
- Create: `src/data/scenarios/domain3/slurm-gres-configuration.json`
- Modify: `src/utils/scenarioLoader.ts:15-25` (add to scenarioFiles)

**Step 1: Create scenario JSON**

```json
{
  "id": "domain3-slurm-gres",
  "title": "Configure Slurm GRES for GPU Scheduling",
  "domain": "domain3",
  "difficulty": "intermediate",
  "description": "Learn to configure Slurm Generic Resources (GRES) for proper GPU job scheduling. This is essential for multi-GPU workloads.",
  "learningObjectives": [
    "Understand GRES configuration syntax",
    "Configure GPU resources in slurm.conf",
    "Verify GRES is properly detected",
    "Submit jobs requesting specific GPU counts"
  ],
  "faults": [],
  "initialClusterState": {},
  "steps": [
    {
      "id": "step1",
      "title": "Check Current Slurm Configuration",
      "description": "First, examine the current Slurm configuration to understand the baseline.",
      "objectives": ["View current GRES configuration"],
      "expectedCommands": ["scontrol show config", "scontrol show nodes"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "View Slurm configuration",
          "expectedCommands": ["scontrol show config"],
          "requireAllCommands": false
        }
      ],
      "hints": ["Use scontrol to view the current configuration"],
      "enhancedHints": [
        {
          "id": "step1-hint1",
          "level": 1,
          "message": "The scontrol command can show you Slurm's configuration",
          "trigger": { "type": "time-based", "timeSeconds": 30 }
        },
        {
          "id": "step1-hint2",
          "level": 2,
          "message": "Try: scontrol show config | grep -i gres",
          "trigger": { "type": "time-based", "timeSeconds": 60 }
        }
      ],
      "estimatedDuration": 3,
      "documentationLinks": [
        { "title": "Slurm GRES Documentation", "url": "https://slurm.schedmd.com/gres.html" }
      ]
    },
    {
      "id": "step2",
      "title": "Verify GPU Detection",
      "description": "Confirm that Slurm detects the GPUs on each node.",
      "objectives": ["Verify GPU count matches hardware"],
      "expectedCommands": ["sinfo -o '%n %G'", "scontrol show node dgx-00"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check node GRES",
          "expectedCommands": ["sinfo", "scontrol show node"],
          "requireAllCommands": false
        },
        {
          "type": "output-match",
          "description": "Verify GPU count shown",
          "outputPattern": "gpu:[0-9]+"
        }
      ],
      "hints": ["sinfo can show GRES with custom format"],
      "estimatedDuration": 3
    },
    {
      "id": "step3",
      "title": "Submit GPU Job",
      "description": "Submit a test job requesting GPU resources.",
      "objectives": ["Successfully submit a job with GPU GRES request"],
      "expectedCommands": ["sbatch --gres=gpu:2"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Submit job with GPU request",
          "expectedCommands": ["sbatch"],
          "requireAllCommands": true
        }
      ],
      "hints": ["Use --gres=gpu:N to request N GPUs"],
      "enhancedHints": [
        {
          "id": "step3-hint1",
          "level": 1,
          "message": "The --gres flag specifies generic resources",
          "trigger": { "type": "time-based", "timeSeconds": 30 }
        },
        {
          "id": "step3-hint2",
          "level": 3,
          "message": "Example: sbatch --gres=gpu:2 --wrap='nvidia-smi'",
          "trigger": { "type": "time-based", "timeSeconds": 60 }
        }
      ],
      "estimatedDuration": 3
    },
    {
      "id": "step4",
      "title": "Verify Job Allocation",
      "description": "Confirm the job received the requested GPU resources.",
      "objectives": ["Verify correct GPU allocation"],
      "expectedCommands": ["squeue", "scontrol show job"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check job details",
          "expectedCommands": ["squeue", "scontrol show job"],
          "requireAllCommands": false
        }
      ],
      "hints": ["scontrol show job shows detailed allocation info"],
      "estimatedDuration": 2
    }
  ],
  "successCriteria": [
    "Understood GRES configuration",
    "Verified GPU detection in Slurm",
    "Successfully submitted GPU job",
    "Verified resource allocation"
  ],
  "estimatedTime": 15,
  "prerequisites": ["domain3-slurm-basics"],
  "tags": ["slurm", "gres", "gpu", "scheduling", "configuration"]
}
```

**Step 2: Register scenario in loader**

In `src/utils/scenarioLoader.ts`, add to scenarioFiles object:

```typescript
'domain3-slurm-gres': () => import('../data/scenarios/domain3/slurm-gres-configuration.json'),
```

**Step 3: Verify scenario loads**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/data/scenarios/domain3/slurm-gres-configuration.json src/utils/scenarioLoader.ts
git commit -m "feat(scenarios): add Slurm GRES configuration scenario"
```

---

### Task 1.2: Add DCGM Policy Configuration Scenario

**Files:**
- Create: `src/data/scenarios/domain3/dcgm-policy-setup.json`
- Modify: `src/utils/scenarioLoader.ts`

**Step 1: Create scenario JSON**

```json
{
  "id": "domain3-dcgm-policy",
  "title": "Configure DCGM Monitoring Policies",
  "domain": "domain3",
  "difficulty": "intermediate",
  "description": "Set up DCGM policies for automated GPU health monitoring and alerting. Policies can automatically respond to ECC errors, thermal events, and other GPU issues.",
  "learningObjectives": [
    "Create DCGM GPU groups",
    "Configure health watch policies",
    "Set ECC error thresholds",
    "Verify policy activation"
  ],
  "faults": [],
  "initialClusterState": {},
  "steps": [
    {
      "id": "step1",
      "title": "Create GPU Group",
      "description": "Create a DCGM group containing the GPUs you want to monitor.",
      "objectives": ["Create a named GPU group"],
      "expectedCommands": ["dcgmi group -c", "dcgmi group -l"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Create or list groups",
          "expectedCommands": ["dcgmi group"],
          "requireAllCommands": true
        }
      ],
      "hints": ["Use dcgmi group -c to create a new group"],
      "enhancedHints": [
        {
          "id": "step1-hint1",
          "level": 2,
          "message": "Try: dcgmi group -c allgpus",
          "trigger": { "type": "time-based", "timeSeconds": 45 }
        }
      ],
      "estimatedDuration": 3
    },
    {
      "id": "step2",
      "title": "Add GPUs to Group",
      "description": "Add specific GPUs to your monitoring group.",
      "objectives": ["Add GPUs to the group"],
      "expectedCommands": ["dcgmi group -g 1 -a"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Add GPUs to group",
          "expectedCommands": ["dcgmi group"],
          "requireAllCommands": true
        }
      ],
      "hints": ["Use -a flag to add GPUs, -g to specify group ID"],
      "estimatedDuration": 2
    },
    {
      "id": "step3",
      "title": "Configure Health Watch",
      "description": "Set up health monitoring policies for the GPU group.",
      "objectives": ["Enable health watches"],
      "expectedCommands": ["dcgmi policy --set", "dcgmi policy --get"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Configure policy",
          "expectedCommands": ["dcgmi policy"],
          "requireAllCommands": true
        }
      ],
      "hints": ["dcgmi policy --set enables monitoring policies"],
      "enhancedHints": [
        {
          "id": "step3-hint1",
          "level": 2,
          "message": "Try: dcgmi policy --set -g 1 -e",
          "trigger": { "type": "time-based", "timeSeconds": 45 }
        },
        {
          "id": "step3-hint2",
          "level": 3,
          "message": "Flags: -e (ECC), -p (PCIe), -m (memory), -P (power), -t (thermal)",
          "trigger": { "type": "time-based", "timeSeconds": 90 }
        }
      ],
      "estimatedDuration": 5
    },
    {
      "id": "step4",
      "title": "Verify Policy Configuration",
      "description": "Confirm the policies are active and monitoring.",
      "objectives": ["Verify policies are enabled"],
      "expectedCommands": ["dcgmi policy --get", "dcgmi health -c"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check policy status",
          "expectedCommands": ["dcgmi policy --get"],
          "requireAllCommands": true
        },
        {
          "type": "output-match",
          "description": "Policy should show enabled",
          "outputPattern": "Enabled|enabled|Active"
        }
      ],
      "hints": ["Use --get to view current policy settings"],
      "estimatedDuration": 3
    }
  ],
  "successCriteria": [
    "Created GPU monitoring group",
    "Added GPUs to the group",
    "Configured health watch policies",
    "Verified policy activation"
  ],
  "estimatedTime": 15,
  "prerequisites": [],
  "tags": ["dcgm", "policy", "monitoring", "health", "configuration"]
}
```

**Step 2: Register scenario**

Add to `scenarioLoader.ts`:

```typescript
'domain3-dcgm-policy': () => import('../data/scenarios/domain3/dcgm-policy-setup.json'),
```

**Step 3: Build verification**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/data/scenarios/domain3/dcgm-policy-setup.json src/utils/scenarioLoader.ts
git commit -m "feat(scenarios): add DCGM policy configuration scenario"
```

---

### Task 1.3: Add Kubernetes GPU Operator Concepts Scenario

**Files:**
- Create: `src/data/scenarios/domain3/kubernetes-gpu-operator.json`
- Modify: `src/utils/scenarioLoader.ts`

**Step 1: Create scenario JSON**

```json
{
  "id": "domain3-k8s-gpu-operator",
  "title": "Kubernetes GPU Operator Concepts",
  "domain": "domain3",
  "difficulty": "advanced",
  "description": "Understand the NVIDIA GPU Operator for Kubernetes deployments. Learn the components, verification commands, and troubleshooting approaches.",
  "learningObjectives": [
    "Understand GPU Operator components",
    "Verify driver container status",
    "Check device plugin pods",
    "Validate GPU scheduling in K8s"
  ],
  "faults": [],
  "initialClusterState": {},
  "steps": [
    {
      "id": "step1",
      "title": "GPU Operator Architecture",
      "description": "The GPU Operator automates GPU driver and runtime deployment on Kubernetes. Key components:\n\n- **Driver Container**: Installs NVIDIA drivers as a container\n- **Device Plugin**: Exposes GPUs to Kubernetes scheduler\n- **DCGM Exporter**: Provides GPU metrics for Prometheus\n- **GPU Feature Discovery**: Labels nodes with GPU capabilities\n\nOn the exam, you'll need to know which pods to check for issues.",
      "objectives": ["Understand GPU Operator components"],
      "expectedCommands": ["kubectl get pods -n gpu-operator"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "List GPU operator pods (simulated)",
          "expectedCommands": ["kubectl"],
          "requireAllCommands": false
        }
      ],
      "hints": ["Review the component list above, then try kubectl commands"],
      "estimatedDuration": 5,
      "documentationLinks": [
        { "title": "NVIDIA GPU Operator Docs", "url": "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html" }
      ]
    },
    {
      "id": "step2",
      "title": "Verify Driver Container",
      "description": "The driver container must be running on each GPU node. Common issues include incompatible kernel versions or missing dependencies.",
      "objectives": ["Check driver container status"],
      "expectedCommands": ["kubectl logs", "nvidia-smi"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Verify GPU driver works",
          "expectedCommands": ["nvidia-smi"],
          "requireAllCommands": true
        }
      ],
      "hints": ["nvidia-smi confirms the driver is loaded"],
      "estimatedDuration": 3
    },
    {
      "id": "step3",
      "title": "Check Device Plugin",
      "description": "The device plugin exposes nvidia.com/gpu resources. Without it, pods cannot request GPUs.",
      "objectives": ["Verify device plugin is allocating GPUs"],
      "expectedCommands": ["kubectl describe node", "nvidia-smi -L"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check GPU allocation",
          "expectedCommands": ["nvidia-smi"],
          "requireAllCommands": true
        }
      ],
      "hints": ["nvidia-smi -L lists available GPUs"],
      "estimatedDuration": 3
    },
    {
      "id": "step4",
      "title": "GPU Scheduling Test",
      "description": "To verify end-to-end GPU scheduling, run a test pod requesting GPU resources.",
      "objectives": ["Understand GPU resource requests in pod specs"],
      "expectedCommands": ["nvidia-smi", "dcgmi discovery -l"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Verify GPUs are discoverable",
          "expectedCommands": ["nvidia-smi", "dcgmi discovery"],
          "requireAllCommands": false
        }
      ],
      "hints": ["In K8s, GPUs are requested via resources.limits.nvidia.com/gpu: 1"],
      "enhancedHints": [
        {
          "id": "step4-hint1",
          "level": 2,
          "message": "Pod spec example:\nresources:\n  limits:\n    nvidia.com/gpu: 1",
          "trigger": { "type": "time-based", "timeSeconds": 30 }
        }
      ],
      "estimatedDuration": 4
    }
  ],
  "successCriteria": [
    "Understand GPU Operator architecture",
    "Know how to verify driver container",
    "Know how to check device plugin",
    "Understand GPU resource requests"
  ],
  "estimatedTime": 20,
  "prerequisites": [],
  "tags": ["kubernetes", "gpu-operator", "containers", "device-plugin", "cloud-native"]
}
```

**Step 2: Register scenario**

**Step 3: Build and commit**

---

### Task 1.4: Enhance Slurm Simulator with GRES Output

**Files:**
- Modify: `src/simulators/slurmSimulator.ts`
- Create: `src/simulators/__tests__/slurmSimulator.gres.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlurmSimulator } from '../slurmSimulator';
import { useSimulationStore } from '@/store/simulationStore';
import { parse } from '@/utils/commandParser';

vi.mock('@/store/simulationStore');

describe('SlurmSimulator GRES', () => {
  let simulator: SlurmSimulator;
  const context = {
    currentNode: 'dgx-00',
    currentPath: '/root',
    environment: {},
    history: [],
  };

  beforeEach(() => {
    simulator = new SlurmSimulator();
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          { id: 'dgx-00', gpus: Array(8).fill({ id: 0 }) },
        ],
      },
    } as any);
  });

  it('should show GRES in sinfo output', () => {
    const result = simulator.executeSinfo(parse('sinfo -o "%n %G"'), context);
    expect(result.output).toContain('gpu:');
  });

  it('should show GRES in scontrol show node', () => {
    const result = simulator.executeScontrol(parse('scontrol show node dgx-00'), context);
    expect(result.output).toContain('Gres=');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/simulators/__tests__/slurmSimulator.gres.test.ts`
Expected: FAIL (GRES not in output)

**Step 3: Implement GRES in sinfo**

In `slurmSimulator.ts`, update `executeSinfo` to include GRES column when format includes `%G`:

```typescript
// Add to sinfo format handling
if (format.includes('%G')) {
  // Add GRES column showing gpu:8 for each node
  const gresCount = node.gpus?.length || 8;
  row += ` gpu:${gresCount}`;
}
```

**Step 4: Implement GRES in scontrol show node**

```typescript
// Add to scontrol show node output
const gresCount = node.gpus?.length || 8;
lines.push(`Gres=gpu:${gresCount}`);
lines.push(`GresUsed=gpu:${allocatedGpus}`);
```

**Step 5: Run tests**

Run: `npm test -- --run src/simulators/__tests__/slurmSimulator.gres.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/simulators/slurmSimulator.ts src/simulators/__tests__/slurmSimulator.gres.test.ts
git commit -m "feat(slurm): add GRES output for GPU scheduling"
```

---

### Task 1.5: Add DCGM Policy Commands to Simulator

**Files:**
- Modify: `src/simulators/dcgmiSimulator.ts`
- Create: `src/simulators/__tests__/dcgmiSimulator.policy.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DcgmiSimulator } from '../dcgmiSimulator';
import { useSimulationStore } from '@/store/simulationStore';
import { parse } from '@/utils/commandParser';

vi.mock('@/store/simulationStore');

describe('DcgmiSimulator Policy', () => {
  let simulator: DcgmiSimulator;
  const context = {
    currentNode: 'dgx-00',
    currentPath: '/root',
    environment: {},
    history: [],
  };

  beforeEach(() => {
    simulator = new DcgmiSimulator();
    // Mock store...
  });

  it('should handle dcgmi policy --set', () => {
    const result = simulator.execute(parse('dcgmi policy --set -g 1 -e'), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Policy');
  });

  it('should handle dcgmi policy --get', () => {
    const result = simulator.execute(parse('dcgmi policy --get -g 1'), context);
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatch(/ECC|Thermal|Power/i);
  });
});
```

**Step 2: Run test (expect fail)**

**Step 3: Implement policy subcommand**

Add to `dcgmiSimulator.ts`:

```typescript
private handlePolicy(parsed: ParsedCommand, context: CommandContext): CommandResult {
  const isSet = parsed.flags.has('set');
  const isGet = parsed.flags.has('get');
  const groupId = parsed.flags.get('g') || '1';

  if (isSet) {
    const policies: string[] = [];
    if (parsed.flags.has('e')) policies.push('ECC');
    if (parsed.flags.has('p')) policies.push('PCIe');
    if (parsed.flags.has('t')) policies.push('Thermal');
    if (parsed.flags.has('P')) policies.push('Power');
    if (parsed.flags.has('m')) policies.push('Memory');

    return this.createSuccess(
      `Policy successfully set for group ${groupId}.\n` +
      `Enabled watches: ${policies.join(', ') || 'None'}\n` +
      `Policies will trigger on violation.`
    );
  }

  if (isGet) {
    return this.createSuccess(
      `Policy for group ${groupId}:\n` +
      `+------------------+----------+\n` +
      `| Policy           | Status   |\n` +
      `+------------------+----------+\n` +
      `| ECC Errors       | Enabled  |\n` +
      `| PCIe Errors      | Disabled |\n` +
      `| Thermal          | Enabled  |\n` +
      `| Power            | Disabled |\n` +
      `| Memory           | Disabled |\n` +
      `+------------------+----------+`
    );
  }

  return this.createError('Usage: dcgmi policy --set|-get -g <groupId> [-e] [-p] [-t] [-P] [-m]');
}
```

**Step 4: Register command and run tests**

**Step 5: Commit**

---

## Phase 2: System Bring-up Gaps (Domain 1)

Focus on firmware, BMC configuration, and network setup.

---

### Task 2.1: Add Firmware Update Scenario

**Files:**
- Create: `src/data/scenarios/domain1/firmware-update-procedure.json`
- Modify: `src/utils/scenarioLoader.ts`

**Step 1: Create scenario**

```json
{
  "id": "domain1-firmware-update",
  "title": "GPU and NIC Firmware Update Procedure",
  "domain": "domain1",
  "difficulty": "intermediate",
  "description": "Learn the proper procedure for updating GPU and network adapter firmware. This includes pre-checks, update commands, and verification.",
  "learningObjectives": [
    "Check current firmware versions",
    "Understand update prerequisites",
    "Execute firmware update commands",
    "Verify successful update"
  ],
  "faults": [],
  "steps": [
    {
      "id": "step1",
      "title": "Check Current GPU Firmware",
      "description": "Before updating, document the current firmware versions.",
      "objectives": ["Record current GPU VBIOS version"],
      "expectedCommands": ["nvidia-smi -q", "nvidia-smi --query-gpu=vbios_version --format=csv"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check GPU firmware",
          "expectedCommands": ["nvidia-smi"],
          "requireAllCommands": true
        }
      ],
      "hints": ["nvidia-smi -q shows VBIOS version in GPU details"],
      "estimatedDuration": 3
    },
    {
      "id": "step2",
      "title": "Check NIC Firmware",
      "description": "Check Mellanox/NVIDIA NIC firmware versions.",
      "objectives": ["Record current NIC firmware"],
      "expectedCommands": ["mlxfwmanager --query", "mst status"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check NIC firmware",
          "expectedCommands": ["mlxfwmanager", "mst"],
          "requireAllCommands": false
        }
      ],
      "hints": ["mlxfwmanager --query shows firmware versions"],
      "estimatedDuration": 3
    },
    {
      "id": "step3",
      "title": "Review Update Prerequisites",
      "description": "Before updating:\n- Drain node from scheduler\n- Stop running workloads\n- Ensure BMC access for recovery\n- Have previous firmware for rollback",
      "objectives": ["Understand update safety requirements"],
      "expectedCommands": ["scontrol update node=dgx-00 state=drain reason=firmware"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Drain node before update",
          "expectedCommands": ["scontrol"],
          "requireAllCommands": true
        }
      ],
      "hints": ["Always drain the node before firmware updates"],
      "estimatedDuration": 3
    },
    {
      "id": "step4",
      "title": "Verify Post-Update",
      "description": "After firmware update and reboot, verify the new versions are active.",
      "objectives": ["Confirm firmware update success"],
      "expectedCommands": ["nvidia-smi -q", "mlxfwmanager --query", "dcgmi diag -r 1"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Verify GPU health post-update",
          "expectedCommands": ["nvidia-smi", "dcgmi diag"],
          "requireAllCommands": false
        }
      ],
      "hints": ["Run diagnostics after firmware updates"],
      "estimatedDuration": 5
    }
  ],
  "successCriteria": [
    "Checked current firmware versions",
    "Understood update prerequisites",
    "Properly drained node",
    "Verified post-update health"
  ],
  "estimatedTime": 15,
  "prerequisites": [],
  "tags": ["firmware", "update", "maintenance", "mlxfwmanager", "vbios"]
}
```

**Step 2-4: Register, build, commit**

---

### Task 2.2: Add BMC/IPMI Configuration Scenario

**Files:**
- Create: `src/data/scenarios/domain1/bmc-ipmi-configuration.json`

**Step 1: Create scenario**

```json
{
  "id": "domain1-bmc-config",
  "title": "BMC and IPMI Configuration",
  "domain": "domain1",
  "difficulty": "intermediate",
  "description": "Configure BMC (Baseboard Management Controller) settings for remote management. Essential for out-of-band system management.",
  "learningObjectives": [
    "Query BMC information",
    "Check sensor readings",
    "View system event log",
    "Understand power management"
  ],
  "faults": [],
  "steps": [
    {
      "id": "step1",
      "title": "Query BMC Information",
      "description": "Get basic BMC info including firmware version and network settings.",
      "objectives": ["View BMC details"],
      "expectedCommands": ["ipmitool mc info", "ipmitool lan print"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Query BMC",
          "expectedCommands": ["ipmitool mc info"],
          "requireAllCommands": true
        }
      ],
      "hints": ["ipmitool mc info shows management controller details"],
      "estimatedDuration": 3
    },
    {
      "id": "step2",
      "title": "Check Hardware Sensors",
      "description": "View temperature, voltage, and fan sensors via IPMI.",
      "objectives": ["Read sensor values"],
      "expectedCommands": ["ipmitool sdr list", "ipmitool sensor list"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Read sensors",
          "expectedCommands": ["ipmitool sdr", "ipmitool sensor"],
          "requireAllCommands": false
        }
      ],
      "hints": ["sdr = Sensor Data Repository"],
      "estimatedDuration": 3
    },
    {
      "id": "step3",
      "title": "View System Event Log",
      "description": "The SEL contains hardware events and errors. Critical for troubleshooting.",
      "objectives": ["View SEL entries"],
      "expectedCommands": ["ipmitool sel list", "ipmitool sel info"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "View SEL",
          "expectedCommands": ["ipmitool sel"],
          "requireAllCommands": true
        }
      ],
      "hints": ["SEL = System Event Log"],
      "estimatedDuration": 3
    },
    {
      "id": "step4",
      "title": "Power Management",
      "description": "IPMI allows remote power control - essential for hung systems.",
      "objectives": ["Understand power commands"],
      "expectedCommands": ["ipmitool chassis status", "ipmitool dcmi get_power_reading"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check power status",
          "expectedCommands": ["ipmitool chassis", "ipmitool dcmi"],
          "requireAllCommands": false
        }
      ],
      "hints": ["chassis status shows power state"],
      "estimatedDuration": 3
    }
  ],
  "successCriteria": [
    "Queried BMC information",
    "Read hardware sensors",
    "Viewed system event log",
    "Understood power management"
  ],
  "estimatedTime": 15,
  "prerequisites": [],
  "tags": ["bmc", "ipmi", "sensors", "sel", "power", "remote-management"]
}
```

---

### Task 2.3: Add Network Bonding Concepts Scenario

**Files:**
- Create: `src/data/scenarios/domain1/network-bonding.json`

**Step 1: Create scenario covering InfiniBand link aggregation concepts**

---

## Phase 3: Multi-Node Verification (Domain 2)

Focus on cluster-wide testing and GPUDirect RDMA verification.

---

### Task 3.1: Add Multi-Node NCCL Test Scenario

**Files:**
- Create: `src/data/scenarios/domain4/multi-node-nccl-test.json`

**Step 1: Create scenario**

```json
{
  "id": "domain4-multinode-nccl",
  "title": "Multi-Node NCCL Bandwidth Test",
  "domain": "domain4",
  "difficulty": "advanced",
  "description": "Run NCCL collective operations across multiple nodes to verify GPU-to-GPU communication over the network fabric.",
  "learningObjectives": [
    "Understand NCCL test parameters",
    "Run all_reduce across nodes",
    "Interpret bandwidth results",
    "Identify performance issues"
  ],
  "faults": [],
  "steps": [
    {
      "id": "step1",
      "title": "Verify InfiniBand Connectivity",
      "description": "Before running NCCL tests, ensure IB fabric is healthy.",
      "objectives": ["Confirm IB links are up"],
      "expectedCommands": ["ibstat", "ibswitches", "iblinkinfo"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check IB status",
          "expectedCommands": ["ibstat"],
          "requireAllCommands": true
        }
      ],
      "hints": ["ibstat shows HCA status and link state"],
      "estimatedDuration": 3
    },
    {
      "id": "step2",
      "title": "Run NCCL All-Reduce Test",
      "description": "Execute the NCCL all_reduce benchmark to measure collective bandwidth.",
      "objectives": ["Run NCCL bandwidth test"],
      "expectedCommands": ["nccl-test", "all_reduce_perf"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Run NCCL test",
          "expectedCommands": ["nccl-test", "all_reduce"],
          "requireAllCommands": false
        }
      ],
      "hints": ["nccl-test runs the official NCCL tests"],
      "enhancedHints": [
        {
          "id": "step2-hint1",
          "level": 2,
          "message": "Try: nccl-test -t all_reduce -g 8 -b 1G -e 8G",
          "trigger": { "type": "time-based", "timeSeconds": 45 }
        }
      ],
      "estimatedDuration": 5
    },
    {
      "id": "step3",
      "title": "Interpret Results",
      "description": "Analyze the bandwidth numbers. Expected baselines:\n- Intra-node NVLink: ~600 GB/s\n- Inter-node IB HDR: ~200 GB/s\n- Degraded performance indicates fabric issues.",
      "objectives": ["Understand expected performance"],
      "expectedCommands": ["nccl-test"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Review test output",
          "expectedCommands": ["nccl-test"],
          "requireAllCommands": false
        }
      ],
      "hints": ["Look for 'Avg bus bandwidth' in output"],
      "estimatedDuration": 5
    },
    {
      "id": "step4",
      "title": "Check for Errors",
      "description": "Verify no NCCL errors occurred during the test.",
      "objectives": ["Confirm test completed successfully"],
      "expectedCommands": ["dmesg", "dcgmi health -c"],
      "validationRules": [
        {
          "type": "command-executed",
          "description": "Check for errors",
          "expectedCommands": ["dmesg", "dcgmi health"],
          "requireAllCommands": false
        }
      ],
      "hints": ["dmesg may show NCCL-related kernel messages"],
      "estimatedDuration": 3
    }
  ],
  "successCriteria": [
    "Verified IB connectivity",
    "Successfully ran NCCL all-reduce",
    "Understood performance baselines",
    "Confirmed no errors"
  ],
  "estimatedTime": 20,
  "prerequisites": ["domain4-nccl-basics"],
  "tags": ["nccl", "multi-node", "bandwidth", "all-reduce", "collective", "infiniband"]
}
```

---

### Task 3.2: Add GPUDirect RDMA Verification Scenario

**Files:**
- Create: `src/data/scenarios/domain4/gpudirect-rdma-verify.json`

---

### Task 3.3: Enhance NCCL Simulator with Multi-Node Output

**Files:**
- Modify: `src/simulators/benchmarkSimulator.ts`

---

## Phase 4: Physical Layer & Advanced Topics (Domain 5)

---

### Task 4.1: Add Hardware Inspection Scenario

**Files:**
- Create: `src/data/scenarios/domain5/physical-inspection.json`

---

### Task 4.2: Add Cable Diagnostics Scenario

**Files:**
- Create: `src/data/scenarios/domain5/cable-diagnostics.json`

---

## Verification Checklist

After each phase:

```bash
# Build check
npm run build

# Run all tests
npm test

# Run logic consistency tests
npm test -- --run src/__tests__/logicConsistency.test.ts

# Verify scenarios load
npm run dev
# Navigate to Labs → verify new scenarios appear
```

---

## Summary

| Phase | Tasks | New Scenarios | Simulator Changes |
|-------|-------|---------------|-------------------|
| 1 | 5 | 3 | Slurm GRES, DCGM Policy |
| 2 | 3 | 3 | None |
| 3 | 3 | 2 | NCCL multi-node |
| 4 | 2 | 2 | None |
| **Total** | **13** | **10** | **3** |

This plan adds 10 new scenarios and enhances 3 simulators to significantly improve NCP-AI Infrastructure certification coverage from ~55% to ~90%.
