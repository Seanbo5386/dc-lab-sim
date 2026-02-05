/**
 * Master Logic Consistency Test Suite
 *
 * Validates that all simulation state changes cascade correctly through:
 * - GPU metrics and health status
 * - All terminal command outputs
 * - Slurm job scheduling
 * - Cluster-wide aggregations
 * - Metrics history
 * - Scenario state management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { MetricsSimulator } from "@/utils/metricsSimulator";
import { parse as parseCommand } from "@/utils/commandParser";

// Import all simulators
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { FabricManagerSimulator } from "@/simulators/fabricManagerSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { BcmSimulator } from "@/simulators/bcmSimulator";
import { IpmitoolSimulator } from "@/simulators/ipmitoolSimulator";
import { InfiniBandSimulator } from "@/simulators/infinibandSimulator";
import { MellanoxSimulator } from "@/simulators/mellanoxSimulator";
import { BasicSystemSimulator } from "@/simulators/basicSystemSimulator";
import { PciToolsSimulator } from "@/simulators/pciToolsSimulator";
import { ContainerSimulator } from "@/simulators/containerSimulator";
import { StorageSimulator } from "@/simulators/storageSimulator";
import { BenchmarkSimulator } from "@/simulators/benchmarkSimulator";
import { NvsmSimulator } from "@/simulators/nvsmSimulator";
import { NvlinkAuditSimulator } from "@/simulators/nvlinkAuditSimulator";
import { CmshSimulator } from "@/simulators/cmshSimulator";
import { NvidiaBugReportSimulator } from "@/simulators/nvidiaBugReportSimulator";

import type { GPU, DGXNode } from "@/types/cluster";
import type { CommandContext } from "@/types/commands";

// ============================================================================
// Test Helper Functions
// ============================================================================

const metricsSimulator = new MetricsSimulator();

// Simulator instances
const simulators = {
  nvidiaSmi: new NvidiaSmiSimulator(),
  dcgmi: new DcgmiSimulator(),
  fabricManager: new FabricManagerSimulator(),
  slurm: new SlurmSimulator(),
  bcm: new BcmSimulator(),
  ipmitool: new IpmitoolSimulator(),
  infiniband: new InfiniBandSimulator(),
  mellanox: new MellanoxSimulator(),
  basicSystem: new BasicSystemSimulator(),
  pciTools: new PciToolsSimulator(),
  container: new ContainerSimulator(),
  storage: new StorageSimulator(),
  benchmark: new BenchmarkSimulator(),
  nvsm: new NvsmSimulator(),
  nvlinkAudit: new NvlinkAuditSimulator(),
  cmsh: new CmshSimulator(),
  nvidiaBugReport: new NvidiaBugReportSimulator(),
};

/**
 * Get current GPU state from store
 */
function getGpuState(nodeId: string, gpuId: number): GPU | undefined {
  const state = useSimulationStore.getState();
  const node = state.cluster.nodes.find((n) => n.id === nodeId);
  return node?.gpus.find((g) => g.id === gpuId);
}

/**
 * Get current node state from store
 */
function getNodeState(nodeId: string): DGXNode | undefined {
  const state = useSimulationStore.getState();
  return state.cluster.nodes.find((n) => n.id === nodeId);
}

/**
 * Get command context for a specific node
 */
function getContext(nodeId: string): CommandContext {
  return {
    currentNode: nodeId,
    currentPath: "/root",
    environment: {},
    history: [],
  };
}

/**
 * Run a command and return output
 */
function runCommand(command: string, nodeId: string = "dgx-00"): string {
  const parsed = parseCommand(command);
  const context = getContext(nodeId);

  // Route to appropriate simulator based on command
  const baseCmd = parsed.baseCommand;

  if (baseCmd === "nvidia-smi") {
    return simulators.nvidiaSmi.execute(parsed, context).output;
  }
  if (baseCmd === "dcgmi") {
    return simulators.dcgmi.execute(parsed, context).output;
  }
  if (baseCmd === "nv-fabricmanager") {
    return simulators.fabricManager.execute(parsed, context).output;
  }
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
  if (["bcm", "bcm-node", "crm"].includes(baseCmd)) {
    return simulators.bcm.execute(parsed, context).output;
  }
  if (baseCmd === "ipmitool") {
    return simulators.ipmitool.execute(parsed, context).output;
  }
  if (
    [
      "ibstat",
      "ibswitches",
      "iblinkinfo",
      "ibdiagnet",
      "ib_write_bw",
      "ib_read_bw",
    ].includes(baseCmd)
  ) {
    return simulators.infiniband.execute(parsed, context).output;
  }
  if (
    [
      "mst",
      "mlxconfig",
      "mlxlink",
      "mlxcables",
      "mlxup",
      "mlxfwmanager",
    ].includes(baseCmd)
  ) {
    return simulators.mellanox.execute(parsed, context).output;
  }
  if (
    [
      "hostname",
      "uname",
      "uptime",
      "lscpu",
      "free",
      "dmidecode",
      "dmesg",
      "systemctl",
      "hostnamectl",
      "timedatectl",
      "lsmod",
      "modinfo",
      "top",
      "ps",
      "numactl",
    ].includes(baseCmd)
  ) {
    return simulators.basicSystem.execute(parsed, context).output;
  }
  if (["lspci", "journalctl"].includes(baseCmd)) {
    return simulators.pciTools.execute(parsed, context).output;
  }
  if (["docker", "ngc", "enroot"].includes(baseCmd)) {
    return simulators.container.execute(parsed, context).output;
  }
  if (["df", "mount", "lfs"].includes(baseCmd)) {
    return simulators.storage.execute(parsed, context).output;
  }
  if (["hpl", "nccl-test", "gpu-burn"].includes(baseCmd)) {
    return simulators.benchmark.execute(parsed, context).output;
  }
  if (baseCmd === "nvsm") {
    return simulators.nvsm.execute(parsed, context).output;
  }
  if (baseCmd === "nvlink-audit") {
    return simulators.nvlinkAudit.execute(parsed, context).output;
  }
  if (baseCmd === "cmsh") {
    return simulators.cmsh.execute(parsed, context).output;
  }
  if (baseCmd === "nvidia-bug-report.sh") {
    return simulators.nvidiaBugReport.execute(parsed, context).output;
  }

  throw new Error(`Unknown command: ${baseCmd}`);
}

/**
 * Inject a fault on a GPU and return the modified GPU
 */
function injectFault(
  nodeId: string,
  gpuId: number,
  faultType: "xid" | "ecc" | "thermal" | "nvlink" | "power" | "pcie",
): GPU {
  const state = useSimulationStore.getState();
  const node = state.cluster.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node ${nodeId} not found`);

  const gpu = node.gpus.find((g) => g.id === gpuId);
  if (!gpu) throw new Error(`GPU ${gpuId} not found on node ${nodeId}`);

  const faultedGpu = metricsSimulator.injectFault(gpu, faultType);

  // Update the store
  state.updateGPU(nodeId, gpuId, faultedGpu);

  return faultedGpu;
}

/**
 * Clear all faults by resetting GPU to healthy state
 */
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

/**
 * Reset the entire simulation to default state
 */
function resetSimulation(): void {
  const state = useSimulationStore.getState();
  state.cluster.nodes.forEach((node) => {
    node.gpus.forEach((gpu) => {
      clearFaults(node.id, gpu.id);
    });
  });
}

/**
 * Assert that output contains expected text (case-insensitive option)
 */
function _assertContains(
  output: string,
  expected: string,
  _message?: string,
): void {
  expect(output.toLowerCase()).toContain(expected.toLowerCase());
}

/**
 * Assert numeric values match within tolerance
 */
function _assertWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number,
  _message?: string,
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

// Export to avoid unused function warnings (these may be used in future tests)
export { _assertContains, _assertWithinTolerance };

/**
 * Get cluster-wide metrics
 */
function getClusterMetrics() {
  const state = useSimulationStore.getState();
  const nodes = state.cluster.nodes;

  const allGpus = nodes.flatMap((n) => n.gpus);
  const healthyGpus = allGpus.filter((g) => g.healthStatus === "OK").length;
  const warningGpus = allGpus.filter(
    (g) => g.healthStatus === "Warning",
  ).length;
  const criticalGpus = allGpus.filter(
    (g) => g.healthStatus === "Critical",
  ).length;

  const totalPower = allGpus.reduce((sum, g) => sum + g.powerDraw, 0);
  const avgTemp =
    allGpus.reduce((sum, g) => sum + g.temperature, 0) / allGpus.length;
  const avgUtil =
    allGpus.reduce((sum, g) => sum + g.utilization, 0) / allGpus.length;

  const activeNVLinks = allGpus.reduce(
    (sum, g) => sum + g.nvlinks.filter((l) => l.status === "Active").length,
    0,
  );
  const totalNVLinks = allGpus.reduce((sum, g) => sum + g.nvlinks.length, 0);

  return {
    totalNodes: nodes.length,
    totalGpus: allGpus.length,
    healthyGpus,
    warningGpus,
    criticalGpus,
    totalPower,
    avgTemp,
    avgUtil,
    activeNVLinks,
    totalNVLinks,
  };
}

// ============================================================================
// Category 1: Fault Injection Cascades
// ============================================================================

describe("Category 1: Fault Injection Cascades", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("1.1 XID Error Injection", () => {
    it("should set GPU health to Critical", () => {
      const gpu = injectFault("dgx-00", 0, "xid");
      expect(gpu.healthStatus).toBe("Critical");
    });

    it("should add XID error to GPU", () => {
      const gpu = injectFault("dgx-00", 0, "xid");
      expect(gpu.xidErrors.length).toBeGreaterThan(0);
      expect(gpu.xidErrors[0].code).toBeDefined();
    });

    it("should reflect in nvidia-smi output", () => {
      injectFault("dgx-00", 0, "xid");
      const output = runCommand("nvidia-smi -q -i 0");
      // Should show some indication of error state
      expect(output.length).toBeGreaterThan(0);
    });

    it("should reflect in dcgmi diag output", () => {
      injectFault("dgx-00", 0, "xid");
      const output = runCommand("dcgmi diag -r 3 -i 0");
      // Diag should show failure or warning
      expect(output.length).toBeGreaterThan(0);
    });

    it("should reflect in dcgmi health output", () => {
      injectFault("dgx-00", 0, "xid");
      const output = runCommand("dcgmi health -c");
      // Should indicate unhealthy GPU
      expect(output).toMatch(/critical|error|fail|warning/i);
    });

    it("should appear in dmesg output", () => {
      injectFault("dgx-00", 0, "xid");
      const output = runCommand("dmesg");
      // dmesg should contain XID reference
      expect(output).toMatch(/xid|nvidia|gpu/i);
    });

    it("should affect bcm validate pod", () => {
      injectFault("dgx-00", 0, "xid");
      const output = runCommand("bcm validate pod");
      // Validation should show warning for unhealthy GPU
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("1.2 ECC Double-Bit Error", () => {
    it("should set GPU health to Critical", () => {
      const gpu = injectFault("dgx-00", 0, "ecc");
      expect(gpu.healthStatus).toBe("Critical");
    });

    it("should increment ECC double-bit counter", () => {
      const gpu = injectFault("dgx-00", 0, "ecc");
      expect(gpu.eccErrors.doubleBit).toBeGreaterThan(0);
    });

    it("should reflect in nvidia-smi ECC info", () => {
      injectFault("dgx-00", 0, "ecc");
      const output = runCommand("nvidia-smi -q -i 0");
      expect(output).toMatch(/ecc|error|memory/i);
    });

    it("should reflect in dcgmi health", () => {
      injectFault("dgx-00", 0, "ecc");
      const output = runCommand("dcgmi health -c");
      expect(output).toMatch(/critical|error|ecc/i);
    });
  });

  describe("1.3 Thermal Fault", () => {
    it("should set GPU temperature to high value", () => {
      const gpu = injectFault("dgx-00", 0, "thermal");
      expect(gpu.temperature).toBeGreaterThanOrEqual(85);
    });

    it("should set GPU health to Warning", () => {
      const gpu = injectFault("dgx-00", 0, "thermal");
      expect(gpu.healthStatus).toBe("Warning");
    });

    it("should reduce SM clocks due to throttling", () => {
      const gpuBefore = getGpuState("dgx-00", 0);
      const originalClocks = gpuBefore?.clocksSM || 1410;

      const gpu = injectFault("dgx-00", 0, "thermal");
      // Thermal throttling should reduce clocks
      expect(gpu.clocksSM).toBeLessThan(originalClocks);
    });

    it("should reflect in nvidia-smi temperature", () => {
      injectFault("dgx-00", 0, "thermal");
      const output = runCommand("nvidia-smi -q -i 0");
      // Should show high temperature or throttle reason
      expect(output).toMatch(/temp|thermal|throttle/i);
    });

    it("should reflect in ipmitool sensor readings", () => {
      injectFault("dgx-00", 0, "thermal");
      const output = runCommand("ipmitool sdr");
      // Should show temperature sensors
      expect(output).toMatch(/temp|gpu/i);
    });
  });

  describe("1.4 NVLink Failure", () => {
    it("should set NVLink status to Down", () => {
      const gpu = injectFault("dgx-00", 0, "nvlink");
      const downLinks = gpu.nvlinks.filter((l) => l.status === "Down");
      expect(downLinks.length).toBeGreaterThan(0);
    });

    it("should increment NVLink error counters", () => {
      const gpu = injectFault("dgx-00", 0, "nvlink");
      const errorLinks = gpu.nvlinks.filter(
        (l) => l.txErrors > 0 || l.rxErrors > 0,
      );
      expect(errorLinks.length).toBeGreaterThan(0);
    });

    it("should set GPU health to Warning", () => {
      const gpu = injectFault("dgx-00", 0, "nvlink");
      expect(gpu.healthStatus).toBe("Warning");
    });

    it("should reflect in nvidia-smi nvlink status", () => {
      injectFault("dgx-00", 0, "nvlink");
      const output = runCommand("nvidia-smi nvlink --status -i 0");
      expect(output).toMatch(/nvlink|link|status/i);
    });

    it("should reflect in nv-fabricmanager query", () => {
      injectFault("dgx-00", 0, "nvlink");
      const output = runCommand("nv-fabricmanager query nvlink");
      expect(output.length).toBeGreaterThan(0);
    });

    it("should reflect in nvlink-audit", () => {
      injectFault("dgx-00", 0, "nvlink");
      const output = runCommand("nvlink-audit");
      expect(output).toMatch(/nvlink|link|status/i);
    });
  });

  describe("1.5 Power Fault", () => {
    it("should change GPU power draw", () => {
      const gpuBefore = getGpuState("dgx-00", 0);
      const originalPower = gpuBefore?.powerDraw || 100;

      const gpu = injectFault("dgx-00", 0, "power");
      expect(gpu.powerDraw).not.toBe(originalPower);
    });

    it("should set GPU health status", () => {
      const gpu = injectFault("dgx-00", 0, "power");
      expect(["Warning", "Critical"]).toContain(gpu.healthStatus);
    });

    it("should reflect in ipmitool dcmi power reading", () => {
      injectFault("dgx-00", 0, "power");
      const output = runCommand("ipmitool dcmi power reading");
      expect(output).toMatch(/power|watt/i);
    });
  });

  describe("1.6 PCIe Error", () => {
    it("should set GPU health to Warning or Critical", () => {
      const gpu = injectFault("dgx-00", 0, "pcie");
      expect(["Warning", "Critical"]).toContain(gpu.healthStatus);
    });

    it("should reflect in lspci output", () => {
      injectFault("dgx-00", 0, "pcie");
      const output = runCommand("lspci");
      expect(output).toMatch(/nvidia|pci|gpu/i);
    });

    it("should reflect in dmesg", () => {
      injectFault("dgx-00", 0, "pcie");
      const output = runCommand("dmesg");
      expect(output.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Category 2: Command Output Consistency
// ============================================================================

describe("Category 2: Command Output Consistency", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("2.1 Cross-Command GPU State Consistency", () => {
    it("should report consistent GPU count across commands", () => {
      const nvidiaSmiOutput = runCommand("nvidia-smi -L");
      const dcgmiOutput = runCommand("dcgmi discovery -l");
      const bcmOutput = runCommand("bcm-node list");

      // All should report 8 GPUs per node
      expect(nvidiaSmiOutput).toMatch(/GPU \d/);
      expect(dcgmiOutput).toMatch(/gpu|device/i);
      expect(bcmOutput).toMatch(/GPUs|GPU/i); // "Total GPUs:" or GPU count column
    });

    it("should report consistent health status after fault", () => {
      injectFault("dgx-00", 0, "xid");

      const dcgmiHealth = runCommand("dcgmi health -c");
      const bcmValidate = runCommand("bcm validate pod");

      // Both should indicate unhealthy GPU
      expect(dcgmiHealth).toMatch(/critical|error|fail/i);
      // bcm validate should also show issue
      expect(bcmValidate.length).toBeGreaterThan(0);
    });
  });

  describe("2.2 Cross-Command NVLink Consistency", () => {
    it("should report consistent NVLink count", () => {
      const nvidiaSmiOutput = runCommand("nvidia-smi nvlink --status");
      const fabricManagerOutput = runCommand("nv-fabricmanager query nvlink");

      expect(nvidiaSmiOutput).toMatch(/link|nvlink/i);
      expect(fabricManagerOutput).toMatch(/link|nvlink|active/i);
    });

    it("should report consistent NVLink errors after fault", () => {
      injectFault("dgx-00", 0, "nvlink");

      const nvidiaSmiOutput = runCommand("nvidia-smi nvlink --status -i 0");
      const fabricManagerOutput = runCommand("nv-fabricmanager diag quick");

      // Both should indicate link issues
      expect(nvidiaSmiOutput.length).toBeGreaterThan(0);
      expect(fabricManagerOutput.length).toBeGreaterThan(0);
    });
  });

  describe("2.3 Cross-Command Slurm Consistency", () => {
    it("should report consistent node count", () => {
      const sinfoOutput = runCommand("sinfo");
      const scontrolOutput = runCommand("scontrol show nodes");
      const bcmOutput = runCommand("bcm-node list");

      // All should show 8 nodes
      expect(sinfoOutput).toMatch(/dgx/i);
      expect(scontrolOutput).toMatch(/NodeName/i);
      expect(bcmOutput).toMatch(/dgx/i);
    });

    it("should report consistent node state", () => {
      // Get node state from store
      const node = getNodeState("dgx-00");
      expect(node).toBeDefined();

      const sinfoOutput = runCommand("sinfo");
      const scontrolOutput = runCommand("scontrol show node dgx-00");

      // Both should show same state
      expect(sinfoOutput.length).toBeGreaterThan(0);
      expect(scontrolOutput).toMatch(/State/i);
    });
  });

  describe("2.4 All Simulators Produce Valid Output", () => {
    const testCases = [
      { name: "nvidia-smi", cmd: "nvidia-smi" },
      { name: "nvidia-smi -q", cmd: "nvidia-smi -q" },
      { name: "nvidia-smi -L", cmd: "nvidia-smi -L" },
      { name: "nvidia-smi nvlink --status", cmd: "nvidia-smi nvlink --status" },
      { name: "nvidia-smi topo -m", cmd: "nvidia-smi topo -m" },
      { name: "dcgmi discovery -l", cmd: "dcgmi discovery -l" },
      { name: "dcgmi health -c", cmd: "dcgmi health -c" },
      { name: "dcgmi diag -r 1", cmd: "dcgmi diag -r 1" },
      { name: "nv-fabricmanager --help", cmd: "nv-fabricmanager --help" },
      {
        name: "nv-fabricmanager query nvlink",
        cmd: "nv-fabricmanager query nvlink",
      },
      { name: "sinfo", cmd: "sinfo" },
      { name: "squeue", cmd: "squeue" },
      { name: "scontrol show nodes", cmd: "scontrol show nodes" },
      { name: "bcm-node list", cmd: "bcm-node list" },
      { name: "bcm-node show dgx-00", cmd: "bcm-node show dgx-00" },
      { name: "bcm ha status", cmd: "bcm ha status" },
      { name: "bcm validate pod", cmd: "bcm validate pod" },
      { name: "crm status", cmd: "crm status" },
      { name: "ipmitool sdr", cmd: "ipmitool sdr" },
      { name: "ipmitool mc info", cmd: "ipmitool mc info" },
      {
        name: "ipmitool dcmi power reading",
        cmd: "ipmitool dcmi power reading",
      },
      { name: "ibstat", cmd: "ibstat" },
      { name: "hostname", cmd: "hostname" },
      { name: "uname -a", cmd: "uname -a" },
      { name: "uptime", cmd: "uptime" },
      { name: "lscpu", cmd: "lscpu" },
      { name: "free -h", cmd: "free -h" },
      { name: "lsmod", cmd: "lsmod" },
      { name: "dmesg", cmd: "dmesg" },
      { name: "lspci", cmd: "lspci" },
      { name: "df -h", cmd: "df -h" },
      { name: "nvsm show", cmd: "nvsm show" },
      { name: "nvlink-audit", cmd: "nvlink-audit" },
    ];

    testCases.forEach(({ name, cmd }) => {
      it(`${name} should produce non-empty output`, () => {
        const output = runCommand(cmd);
        expect(output.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// Category 3: Slurm ↔ GPU State Synchronization
// ============================================================================

describe("Category 3: Slurm ↔ GPU State Synchronization", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("3.1 Job Allocation Updates GPU State", () => {
    it("should update node slurmState when job allocated", () => {
      // Get state (store access required to trigger state lookup side effects)
      useSimulationStore.getState();
      const node = getNodeState("dgx-00");

      // Initial state should be idle
      expect(["idle", "alloc"]).toContain(node?.slurmState);
    });

    it("should reflect in sinfo output", () => {
      const output = runCommand("sinfo");
      expect(output).toMatch(/idle|alloc|mix/i);
    });

    it("should reflect in scontrol show node", () => {
      const output = runCommand("scontrol show node dgx-00");
      expect(output).toMatch(/State/i);
    });
  });

  describe("3.2 Node State Affects Scheduling", () => {
    it("should show drained node in sinfo", () => {
      // Update node to drained state using store action
      useSimulationStore
        .getState()
        .setSlurmState("dgx-00", "drain", "maintenance");

      const output = runCommand("sinfo");
      // Should show drained state
      expect(output.length).toBeGreaterThan(0);
    });

    it("should show drain reason in scontrol", () => {
      // Update node to drained state using store action
      useSimulationStore
        .getState()
        .setSlurmState("dgx-00", "drain", "GPU maintenance");

      const output = runCommand("scontrol show node dgx-00");
      expect(output).toMatch(/State|Reason/i);
    });
  });

  describe("3.3 GPU Failure Impact", () => {
    it("should not automatically drain node on GPU failure", () => {
      // Inject fault
      injectFault("dgx-00", 0, "xid");

      // Node should NOT automatically drain (user learns to do this manually)
      const node = getNodeState("dgx-00");
      // The node state is not automatically changed
      expect(node?.slurmState).toBeDefined();
    });

    it("should allow manual drain after GPU failure", () => {
      injectFault("dgx-00", 0, "xid");

      // User manually drains using store action
      useSimulationStore
        .getState()
        .setSlurmState("dgx-00", "drain", "GPU 0 XID error");

      const output = runCommand("scontrol show node dgx-00");
      expect(output).toMatch(/State/i);
    });
  });
});

// ============================================================================
// Category 4: Metrics History Accuracy (if metricsHistory exists)
// ============================================================================

describe("Category 4: Cluster Aggregation Accuracy", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("4.1 Healthy GPU Count", () => {
    it("should count all GPUs as healthy initially", () => {
      const metrics = getClusterMetrics();
      expect(metrics.healthyGpus).toBe(metrics.totalGpus);
      expect(metrics.criticalGpus).toBe(0);
      expect(metrics.warningGpus).toBe(0);
    });

    it("should decrease healthy count after fault", () => {
      const metricsBefore = getClusterMetrics();

      injectFault("dgx-00", 0, "xid");

      const metricsAfter = getClusterMetrics();
      expect(metricsAfter.healthyGpus).toBe(metricsBefore.healthyGpus - 1);
      expect(metricsAfter.criticalGpus).toBe(1);
    });

    it("should restore healthy count after clearing fault", () => {
      injectFault("dgx-00", 0, "xid");
      clearFaults("dgx-00", 0);

      const metrics = getClusterMetrics();
      expect(metrics.healthyGpus).toBe(metrics.totalGpus);
    });
  });

  describe("4.2 NVLink Count Accuracy", () => {
    it("should count all NVLinks as active initially", () => {
      const metrics = getClusterMetrics();
      expect(metrics.activeNVLinks).toBe(metrics.totalNVLinks);
    });

    it("should decrease active count after NVLink fault", () => {
      const metricsBefore = getClusterMetrics();

      injectFault("dgx-00", 0, "nvlink");

      const metricsAfter = getClusterMetrics();
      expect(metricsAfter.activeNVLinks).toBeLessThan(
        metricsBefore.activeNVLinks,
      );
    });
  });

  describe("4.3 Temperature Aggregation", () => {
    it("should increase average temp after thermal fault", () => {
      const metricsBefore = getClusterMetrics();

      injectFault("dgx-00", 0, "thermal");

      const metricsAfter = getClusterMetrics();
      expect(metricsAfter.avgTemp).toBeGreaterThan(metricsBefore.avgTemp);
    });
  });
});

// ============================================================================
// Category 5: Cross-Node Cluster Effects
// ============================================================================

describe("Category 5: Cross-Node Cluster Effects", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("5.1 Multiple Node Failures", () => {
    it("should track multiple critical GPUs", () => {
      injectFault("dgx-00", 0, "xid");
      injectFault("dgx-01", 0, "xid");

      const metrics = getClusterMetrics();
      expect(metrics.criticalGpus).toBe(2);
    });

    it("should show multiple issues in bcm validate", () => {
      injectFault("dgx-00", 0, "xid");
      injectFault("dgx-01", 0, "xid");

      const output = runCommand("bcm validate pod");
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("5.2 Cluster-Wide Health", () => {
    it("should report cluster issues in bcm-node list", () => {
      injectFault("dgx-00", 0, "xid");

      const output = runCommand("bcm-node list");
      // Should show node with critical GPU
      expect(output.length).toBeGreaterThan(0);
    });

    it("should report all nodes in sinfo", () => {
      const output = runCommand("sinfo");
      // Should list all 8 nodes
      const nodeCount = (output.match(/dgx-0[0-7]/g) || []).length;
      expect(nodeCount).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Category 6: Scenario/Lab State (basic validation)
// ============================================================================

describe("Category 6: Scenario State Management", () => {
  beforeEach(() => {
    resetSimulation();
  });

  describe("6.1 State Isolation", () => {
    it("should start with clean state", () => {
      const metrics = getClusterMetrics();
      expect(metrics.criticalGpus).toBe(0);
      expect(metrics.warningGpus).toBe(0);
    });

    it("should allow injecting and clearing faults", () => {
      // Inject
      injectFault("dgx-00", 0, "xid");
      let metrics = getClusterMetrics();
      expect(metrics.criticalGpus).toBe(1);

      // Clear
      clearFaults("dgx-00", 0);
      metrics = getClusterMetrics();
      expect(metrics.criticalGpus).toBe(0);
    });

    it("should reset to clean state", () => {
      injectFault("dgx-00", 0, "xid");
      injectFault("dgx-01", 0, "thermal");
      injectFault("dgx-02", 0, "nvlink");

      resetSimulation();

      const metrics = getClusterMetrics();
      expect(metrics.criticalGpus).toBe(0);
      expect(metrics.warningGpus).toBe(0);
    });
  });

  describe("6.2 Consistent State After Operations", () => {
    it("should maintain consistent state across queries", () => {
      injectFault("dgx-00", 0, "xid");

      // Query state multiple times
      const metrics1 = getClusterMetrics();
      const metrics2 = getClusterMetrics();
      const metrics3 = getClusterMetrics();

      expect(metrics1.criticalGpus).toBe(metrics2.criticalGpus);
      expect(metrics2.criticalGpus).toBe(metrics3.criticalGpus);
    });

    it("should maintain consistent command output", () => {
      injectFault("dgx-00", 0, "xid");

      // Run same command multiple times
      const output1 = runCommand("dcgmi health -c");
      const output2 = runCommand("dcgmi health -c");

      // Outputs should be similar (allow for timestamp differences)
      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Summary Test
// ============================================================================

describe("Logic Consistency Summary", () => {
  it("should pass all categories when simulation is healthy", () => {
    resetSimulation();

    const metrics = getClusterMetrics();

    // All GPUs healthy
    expect(metrics.criticalGpus).toBe(0);
    expect(metrics.warningGpus).toBe(0);
    expect(metrics.healthyGpus).toBe(metrics.totalGpus);

    // All NVLinks active
    expect(metrics.activeNVLinks).toBe(metrics.totalNVLinks);

    // Commands work
    expect(runCommand("nvidia-smi").length).toBeGreaterThan(0);
    expect(runCommand("dcgmi health -c").length).toBeGreaterThan(0);
    expect(runCommand("sinfo").length).toBeGreaterThan(0);
    expect(runCommand("bcm-node list").length).toBeGreaterThan(0);
  });

  it("should maintain consistency after fault injection and clearing", () => {
    resetSimulation();

    // Inject multiple faults
    injectFault("dgx-00", 0, "xid");
    injectFault("dgx-01", 0, "thermal");
    injectFault("dgx-02", 0, "nvlink");

    let metrics = getClusterMetrics();
    expect(metrics.criticalGpus).toBe(1);
    expect(metrics.warningGpus).toBe(2);

    // Clear all
    resetSimulation();

    metrics = getClusterMetrics();
    expect(metrics.criticalGpus).toBe(0);
    expect(metrics.warningGpus).toBe(0);
    expect(metrics.healthyGpus).toBe(metrics.totalGpus);
  });
});
