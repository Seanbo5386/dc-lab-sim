import type { GPU, InfiniBandHCA } from "@/types/hardware";
import { HARDWARE_SPECS } from "@/data/hardwareSpecs";
import {
  ClusterPhysicsEngine,
  AMBIENT_TEMP,
  THERMAL_CEILING,
  IDLE_POWER_FLOOR,
} from "@/simulation/clusterPhysicsEngine";

/** Look up the boost clock for a GPU by its model name. Falls back to A100's 1410 MHz. */
function getBoostClock(gpuName: string): number {
  for (const spec of Object.values(HARDWARE_SPECS)) {
    if (spec.gpu.model === gpuName) return spec.gpu.boostClockMHz;
  }
  return 1410;
}

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
      // utilization without an allocatedJobId). The threshold separates real
      // loads from idle jitter and the "idle" workload pattern, so applied
      // workloads sustain and drive power/temperature instead of being reset
      // to idle on the next tick (see ACTIVE_UTILIZATION_THRESHOLD).
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

      // Power: correlates with utilization (15% TDP idle floor)
      const idlePower = gpu.powerLimit * 0.15;
      const targetPower =
        idlePower + (newUtilization / 100) * (gpu.powerLimit - idlePower);
      const powerChange = (targetPower - gpu.powerDraw) * 0.15;
      const newPower = Math.max(
        idlePower * 0.8,
        Math.min(gpu.powerLimit, gpu.powerDraw + powerChange),
      );

      // Temperature: derives from power draw, not utilization directly
      const ambientTemp = 32;
      const tempRange = 48;
      const targetTemp = ambientTemp + (newPower / gpu.powerLimit) * tempRange;
      const tempChange = (targetTemp - gpu.temperature) * 0.1;
      const newTemp = gpu.temperature + tempChange;

      // SM clock: architecture-aware boost with thermal throttling
      const boostClock = getBoostClock(gpu.name);
      const targetSMClock =
        boostClock - (newTemp > 70 ? (newTemp - 70) * 10 : 0);
      const smClockChange = (targetSMClock - gpu.clocksSM) * 0.2;
      const newSMClock = Math.round(
        Math.max(300, gpu.clocksSM + smClockChange),
      );

      // ECC errors: only accumulate under load, at realistic rates
      const eccSingleBitIncrement = isActive && Math.random() < 0.00005 ? 1 : 0;
      const eccDoubleBitIncrement =
        isActive && Math.random() < 0.0000005 ? 1 : 0;

      const jittered: GPU = {
        ...gpu,
        utilization: Math.round(newUtilization * 10) / 10,
        memoryUsed: Math.round(newMemoryUsed),
        temperature: Math.round(newTemp * 10) / 10,
        powerDraw: Math.round(newPower * 10) / 10,
        clocksSM: newSMClock,
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

      // Apply causal physics adjustments (temperature, power, clock throttling)
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

      // Jump directly to the physics engine's equilibrium point for the new
      // utilization so the GPU is internally consistent the instant a
      // workload is applied, instead of reporting the new utilization at
      // whatever power/temperature it happened to have before (PHYS-4/
      // LIVE-5: sandbox Apply Workload previously left power/temp
      // untouched — 95% util at idle watts). Uses the same constants
      // ClusterPhysicsEngine.tickGPU() converges toward every tick, so
      // there's no discontinuity once ticking resumes.
      const targetPower =
        gpu.powerLimit *
        (IDLE_POWER_FLOOR + (utilization / 100) * (1 - IDLE_POWER_FLOOR));
      const targetTemp =
        AMBIENT_TEMP +
        (targetPower / gpu.powerLimit) * (THERMAL_CEILING - AMBIENT_TEMP);

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
        const thermalTemp = 85;
        const boostClock = getBoostClock(gpu.name);
        const throttledClocks = Math.round(
          boostClock - (thermalTemp - 70) * 10,
        );
        return {
          ...gpu,
          temperature: thermalTemp,
          clocksSM: throttledClocks,
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
