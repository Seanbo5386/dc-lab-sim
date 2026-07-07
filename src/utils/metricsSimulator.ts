import type { GPU, InfiniBandHCA } from "@/types/hardware";
import {
  ClusterPhysicsEngine,
  AMBIENT_TEMP,
  NORMAL_FULL_LOAD_TEMP,
  THERMAL_CEILING,
  IDLE_POWER_FLOOR,
  getRatedTDP,
} from "@/simulation/clusterPhysicsEngine";

export interface MetricsUpdate {
  gpus: GPU[];
  hcas: InfiniBandHCA[];
}

/**
 * Utilization (%) above which a GPU is treated as "under load" even without a
 * Slurm-allocated job. Chosen to separate real workloads (inference ~60,
 * training ~95) from idle jitter (<2%) and the "idle" workload pattern (~10%).
 */
const ACTIVE_UTILIZATION_THRESHOLD = 15;

export class MetricsSimulator {
  private intervalId: number | null = null;
  private isRunning: boolean = false;
  private physicsEngine: ClusterPhysicsEngine;

  constructor() {
    this.physicsEngine = new ClusterPhysicsEngine();
  }

  /** Expose the physics engine for external access to threshold events. */
  getPhysicsEngine(): ClusterPhysicsEngine {
    return this.physicsEngine;
  }

  start(
    updateCallback: (
      updater: (data: { gpus: GPU[]; hcas: InfiniBandHCA[] }) => MetricsUpdate,
    ) => void,
    interval: number = 1000,
  ) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      updateCallback((data) => this.updateMetrics(data));
    }, interval);
  }

  // Legacy method for backwards compatibility
  startGpuOnly(
    updateCallback: (updater: (gpus: GPU[]) => GPU[]) => void,
    interval: number = 1000,
  ) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      updateCallback((gpus) => this.updateGpuMetrics(gpus));
    }, interval);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private updateMetrics(data: {
    gpus: GPU[];
    hcas: InfiniBandHCA[];
  }): MetricsUpdate {
    return {
      gpus: this.updateGpuMetrics(data.gpus),
      hcas: this.updateHcaMetrics(data.hcas),
    };
  }

  private updateHcaMetrics(hcas: InfiniBandHCA[]): InfiniBandHCA[] {
    // HCA metrics remain stable during normal operation.
    // Errors should only be injected through explicit fault scenarios,
    // not accumulated randomly during regular simulation ticks.
    return hcas;
  }

  private updateGpuMetrics(gpus: GPU[]): GPU[] {
    return gpus.map((gpu) => {
      // A GPU is under load if Slurm has allocated a job to it OR a workload
      // has been applied directly (sandbox "Apply Workload" sets a high
      // utilization without an allocatedJobId).
      const isActive =
        gpu.allocatedJobId != null ||
        gpu.utilization > ACTIVE_UTILIZATION_THRESHOLD;

      // Utilization: stable under load, near-zero when idle
      const newUtilization = isActive
        ? Math.max(
            5,
            Math.min(100, gpu.utilization + (Math.random() - 0.5) * 1.0),
          )
        : Math.random() * 2;

      // Memory: static per job allocation, driver overhead when idle
      const newMemoryUsed = isActive
        ? Math.max(
            0,
            Math.min(
              gpu.memoryTotal,
              gpu.memoryUsed + (Math.random() - 0.5) * 20,
            ),
          )
        : 50 + Math.random() * 150;

      // ECC errors: only accumulate under load, at realistic rates
      const eccSingleBitIncrement = isActive && Math.random() < 0.00005 ? 1 : 0;
      const eccDoubleBitIncrement =
        isActive && Math.random() < 0.0000005 ? 1 : 0;

      const jittered: GPU = {
        ...gpu,
        utilization: Math.round(newUtilization * 10) / 10,
        memoryUsed: Math.round(newMemoryUsed),
        eccErrors: {
          ...gpu.eccErrors,
          singleBit: gpu.eccErrors.singleBit + eccSingleBitIncrement,
          doubleBit: gpu.eccErrors.doubleBit + eccDoubleBitIncrement,
          aggregated: {
            singleBit:
              gpu.eccErrors.aggregated.singleBit + eccSingleBitIncrement,
            doubleBit:
              gpu.eccErrors.aggregated.doubleBit + eccDoubleBitIncrement,
          },
        },
      };

      // Power, temperature, and clock throttling are computed entirely by
      // the physics engine now — no second, competing formula (PHYS-8).
      return this.physicsEngine.tickGPU(jittered);
    });
  }

  // Simulate a specific workload pattern
  simulateWorkload(
    gpus: GPU[],
    pattern: "idle" | "training" | "inference" | "stress",
  ): GPU[] {
    const utilizationTarget = {
      idle: 5,
      training: 95,
      inference: 60,
      stress: 100,
    }[pattern];

    return gpus.map((gpu) => {
      const utilization = Math.max(
        0,
        Math.min(100, utilizationTarget + (Math.random() - 0.5) * 10),
      );
      const memoryUsed =
        pattern === "idle"
          ? gpu.memoryTotal * 0.01
          : pattern === "training"
            ? gpu.memoryTotal * 0.9
            : gpu.memoryTotal * 0.6;

      // Jump directly to tickGPU's steady state for the new utilization
      // (same load-ratio/NORMAL_FULL_LOAD_TEMP split it uses every tick) so
      // the GPU is internally consistent immediately and ticking it forward
      // afterward barely moves it, instead of visibly re-settling.
      //
      // Same rule as tickGPU: the RATIO divides by the fixed rated TDP, not
      // by gpu.powerLimit (which -pl can lower) — only the DISPLAYED power
      // number is computed relative to the current limit.
      const targetPower =
        gpu.powerLimit *
        (IDLE_POWER_FLOOR + (utilization / 100) * (1 - IDLE_POWER_FLOOR));
      const ratedTDP = getRatedTDP(gpu.name);
      const loadRatio = Math.min(targetPower / ratedTDP, 1);
      const faultRatio = (gpu.activeFaultHeatWatts ?? 0) / ratedTDP;
      const targetTemp = Math.min(
        AMBIENT_TEMP +
          loadRatio * (NORMAL_FULL_LOAD_TEMP - AMBIENT_TEMP) +
          faultRatio * (THERMAL_CEILING - AMBIENT_TEMP),
        THERMAL_CEILING,
      );

      return {
        ...gpu,
        utilization: Math.round(utilization * 10) / 10,
        memoryUsed: Math.round(memoryUsed),
        powerDraw: Math.round(targetPower * 10) / 10,
        temperature: Math.round(targetTemp * 10) / 10,
      };
    });
  }

  // Inject a fault for troubleshooting practice
  injectFault(
    gpu: GPU,
    faultType: "xid" | "ecc" | "thermal" | "nvlink" | "power" | "pcie",
  ): GPU {
    switch (faultType) {
      case "xid":
        return {
          ...gpu,
          xidErrors: [
            ...gpu.xidErrors,
            {
              code: 48,
              timestamp: new Date(),
              description: "Double-bit ECC error",
              severity: "Critical",
            },
          ],
          healthStatus: "Critical",
        };

      case "ecc":
        return {
          ...gpu,
          eccErrors: {
            ...gpu.eccErrors,
            doubleBit: gpu.eccErrors.doubleBit + 1,
          },
          healthStatus: "Critical",
        };

      case "thermal": {
        // A moderate persistent fault (48% of RATED TDP as extra heat, on
        // top of whatever load-driven power already exists) — replaces the
        // old one-shot `temperature: 85` snap, which self-erased within a
        // few ticks once the next physics pass pulled it back toward the
        // (unaffected) load-derived target (PHYS-9/LIVE-2). This value
        // persists until a remediation action clears it. Uses the GPU's
        // RATED TDP (not the current, possibly-capped powerLimit) so the
        // fault's severity matches what tickGPU's faultRatio calculation
        // expects — see the formula note in Task 2.
        //
        // 48% (not 60%) is deliberate: this represents a SINGLE-GPU cooling
        // fault (e.g. degraded fan/paste) — remediationEngine's
        // classifyFault() treats it as recoverable via `set-power-limit`
        // ("thermal", 85-89.9°C) as opposed to a node-wide "thermal-alert"
        // (>=90°C) that demands a power-cycle. At 60%, a lone idle GPU's
        // equilibrium temperature overshoots past 90°C and into
        // "thermal-alert" territory, making `set-power-limit` always
        // "insufficient" for a fault this UI labels as a single-GPU "Thermal
        // Issue" — 48% settles in the mid-80s across architectures instead,
        // squarely in the fault kind its own remediation profile expects.
        return {
          ...gpu,
          activeFaultHeatWatts: getRatedTDP(gpu.name) * 0.48,
          healthStatus: "Warning",
        };
      }

      case "nvlink":
        return {
          ...gpu,
          nvlinks: gpu.nvlinks.map((link, idx) =>
            idx === 0
              ? { ...link, status: "Down" as const, txErrors: 100 }
              : link,
          ),
          healthStatus: "Warning",
        };

      case "power":
        return {
          ...gpu,
          powerDraw: gpu.powerLimit * 0.95,
          healthStatus: "Warning",
        };

      case "pcie":
        return {
          ...gpu,
          xidErrors: [
            ...gpu.xidErrors,
            {
              code: 62,
              timestamp: new Date(),
              description: "PCIe Internal error - GPU hardware or software",
              severity: "Critical",
            },
          ],
          healthStatus: "Critical",
        };

      default:
        return gpu;
    }
  }
}
