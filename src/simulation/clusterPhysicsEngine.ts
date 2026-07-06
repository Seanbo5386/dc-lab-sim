import type { GPU } from "@/types/hardware";
import { HARDWARE_SPECS } from "@/data/hardwareSpecs";

export const AMBIENT_TEMP = 32;
export const THERMAL_CEILING = 95;
const THROTTLE_THRESHOLD = 83;
const THROTTLE_RATE_MHZ_PER_DEGREE = 10;
const TEMP_SMOOTHING = 0.15;
const POWER_SMOOTHING = 0.2;
export const IDLE_POWER_FLOOR = 0.15;

export function getThermalThresholds(gpuName: string): {
  shutdown: number;
  slowdown: number;
  maxOp: number;
} {
  if (gpuName.includes("H100") || gpuName.includes("H200")) {
    return { shutdown: 95, slowdown: 90, maxOp: 83 };
  }
  if (
    gpuName.includes("B200") ||
    gpuName.includes("GB200") ||
    gpuName.includes("R200")
  ) {
    return { shutdown: 95, slowdown: 90, maxOp: 83 };
  }
  // A100 default
  return { shutdown: 92, slowdown: 89, maxOp: 85 };
}

/** Look up the boost clock for a GPU by its model name. Falls back to A100's 1410 MHz. */
export function getBoostClock(gpuName: string): number {
  for (const spec of Object.values(HARDWARE_SPECS)) {
    if (spec.gpu.model === gpuName) return spec.gpu.boostClockMHz;
  }
  return 1410;
}

/**
 * Look up a GPU's RATED (as-shipped) TDP by model name — a fixed reference
 * that never changes, unlike `gpu.powerLimit` which `-pl` can lower. The
 * temperature formula divides by this, not by the current limit, so
 * capping the current limit genuinely reduces the computed ratio instead
 * of always renormalizing back to 1.0 at 100% utilization (PHYS-2: power
 * capping must be watts-driven, not ratio-driven). Falls back to A100's
 * 400W.
 */
export function getRatedTDP(gpuName: string): number {
  for (const spec of Object.values(HARDWARE_SPECS)) {
    if (spec.gpu.model === gpuName) return spec.gpu.tdpWatts;
  }
  return 400;
}

export interface ThresholdEvent {
  type:
    | "thermal-warning"
    | "thermal-critical"
    | "power-warning"
    | "ecc-accumulation";
  /** Node-local GPU index (0-7). Human-readable only — NOT unique across nodes. */
  gpuId: number;
  /** Globally unique GPU identifier. Use this to route the event to a node. */
  gpuUuid: string;
  value: number;
}

export class ClusterPhysicsEngine {
  private thresholdEvents: ThresholdEvent[] = [];
  private previousTemps: Map<string, number> = new Map();
  private previousEccCounts: Map<string, number> = new Map();

  tickGPU(gpu: GPU): GPU {
    const updated = { ...gpu };

    // Power follows utilization
    const targetPower =
      gpu.powerLimit *
      (IDLE_POWER_FLOOR + (gpu.utilization / 100) * (1 - IDLE_POWER_FLOOR));
    updated.powerDraw =
      gpu.powerDraw + (targetPower - gpu.powerDraw) * POWER_SMOOTHING;
    updated.powerDraw = Math.min(updated.powerDraw, gpu.powerLimit);

    // Temperature follows power ratio
    const powerRatio = updated.powerDraw / gpu.powerLimit;
    const targetTemp =
      AMBIENT_TEMP + powerRatio * (THERMAL_CEILING - AMBIENT_TEMP);
    updated.temperature =
      gpu.temperature + (targetTemp - gpu.temperature) * TEMP_SMOOTHING;
    updated.temperature = Math.max(
      AMBIENT_TEMP,
      Math.min(THERMAL_CEILING + 5, updated.temperature),
    );

    // Check thermal thresholds against computed temperature
    const prevTemp = this.previousTemps.get(gpu.uuid) ?? AMBIENT_TEMP;
    if (
      prevTemp < THROTTLE_THRESHOLD &&
      updated.temperature >= THROTTLE_THRESHOLD
    ) {
      this.thresholdEvents.push({
        type: "thermal-warning",
        gpuId: gpu.id,
        gpuUuid: gpu.uuid,
        value: updated.temperature,
      });
    }
    if (prevTemp < 92 && updated.temperature >= 92) {
      this.thresholdEvents.push({
        type: "thermal-critical",
        gpuId: gpu.id,
        gpuUuid: gpu.uuid,
        value: updated.temperature,
      });
    }
    this.previousTemps.set(gpu.uuid, updated.temperature);

    // Clock throttling above threshold
    if (updated.temperature > THROTTLE_THRESHOLD) {
      const degreesOver = updated.temperature - THROTTLE_THRESHOLD;
      const reduction = Math.round(degreesOver * THROTTLE_RATE_MHZ_PER_DEGREE);
      updated.clocksSM = Math.max(600, gpu.clocksSM - reduction);
    }

    // ECC accumulation check — fire only on crossing the threshold
    const totalEcc = gpu.eccErrors.aggregated.singleBit;
    const prevEcc = this.previousEccCounts.get(gpu.uuid) ?? 0;
    if (prevEcc <= 100 && totalEcc > 100) {
      this.thresholdEvents.push({
        type: "ecc-accumulation",
        gpuId: gpu.id,
        gpuUuid: gpu.uuid,
        value: totalEcc,
      });
    }
    this.previousEccCounts.set(gpu.uuid, totalEcc);

    return updated;
  }

  consumeThresholdEvents(): ThresholdEvent[] {
    const events = [...this.thresholdEvents];
    this.thresholdEvents = [];
    return events;
  }

  getThresholdEvents(): ThresholdEvent[] {
    return [...this.thresholdEvents];
  }

  reset(): void {
    this.thresholdEvents = [];
    this.previousTemps.clear();
    this.previousEccCounts.clear();
  }
}
