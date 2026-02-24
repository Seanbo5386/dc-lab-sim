import type { GPU } from "@/types/hardware";

const AMBIENT_TEMP = 32;
const THERMAL_CEILING = 95;
const THROTTLE_THRESHOLD = 83;
const THROTTLE_RATE_MHZ_PER_DEGREE = 10;
const TEMP_SMOOTHING = 0.15;
const POWER_SMOOTHING = 0.2;
const IDLE_POWER_FLOOR = 0.15;

export interface ThresholdEvent {
  type:
    | "thermal-warning"
    | "thermal-critical"
    | "power-warning"
    | "ecc-accumulation";
  gpuId: number;
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
        value: updated.temperature,
      });
    }
    if (prevTemp < 92 && updated.temperature >= 92) {
      this.thresholdEvents.push({
        type: "thermal-critical",
        gpuId: gpu.id,
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
