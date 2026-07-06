import type { GPU } from "@/types/hardware";
import { HARDWARE_SPECS } from "@/data/hardwareSpecs";

export const AMBIENT_TEMP = 32;
// Full-utilization, NO-FAULT equilibrium — a healthy GPU under sustained
// 100% load settles here, comfortably below any architecture's throttle
// threshold (83-85C). This is the fix for PHYS-1 ("every sustained workload
// thermally throttles forever").
export const NORMAL_FULL_LOAD_TEMP = 72;
// Absolute physical ceiling, reached only via an active fault's heat term
// (see faultRatio below) — never by load alone.
export const THERMAL_CEILING = 95;
const THROTTLE_RATE_MHZ_PER_DEGREE = 10;
// A throttled GPU still draws at least this fraction of its pre-throttle
// power (memory/uncore/idle logic keeps running) — full throttle reduces
// power by at most (1 - THROTTLE_POWER_FLOOR_RATIO).
const THROTTLE_POWER_FLOOR_RATIO = 0.7;
const CLOCK_SMOOTHING = 0.2;
const TEMP_SMOOTHING = 0.15;
const POWER_SMOOTHING = 0.2;
export const IDLE_POWER_FLOOR = 0.15;

/**
 * Convert a legacy "target temperature" fault-authoring convention (e.g.
 * scenario JSON's `parameters.targetTemp`) into the faultRatio a caller
 * should multiply by `getRatedTDP(gpu.name)` (NOT `gpu.powerLimit` — see
 * the formula note at the top of this file) to get `activeFaultHeatWatts`.
 * Treats the target as "the temperature this fault alone would produce
 * from near-idle load" — actual load on top of it can only push
 * temperature higher, never lower, which is the safe direction for a
 * fault-severity approximation.
 */
export function heatWattsFraction(targetTempC: number): number {
  return Math.max(
    0,
    (targetTempC - AMBIENT_TEMP) / (THERMAL_CEILING - AMBIENT_TEMP),
  );
}

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
    const thresholds = getThermalThresholds(gpu.name || "");
    const faultHeat = gpu.activeFaultHeatWatts ?? 0;

    // Power follows utilization; displayed power draw stays clamped at the
    // rated limit (matches real nvidia-smi — a fault or cap never makes the
    // shown wattage exceed or bypass the limit itself).
    const loadTargetPower =
      gpu.powerLimit *
      (IDLE_POWER_FLOOR + (gpu.utilization / 100) * (1 - IDLE_POWER_FLOOR));
    const targetPower = loadTargetPower + faultHeat;
    let newPowerDraw =
      gpu.powerDraw + (targetPower - gpu.powerDraw) * POWER_SMOOTHING;
    newPowerDraw = Math.min(newPowerDraw, gpu.powerLimit);

    // Temperature: normal load spans AMBIENT..NORMAL_FULL_LOAD_TEMP linearly
    // with the (clamped) load ratio; a fault's heat is a SEPARATE additive
    // term spanning up to the full THERMAL_CEILING and is NOT clamped by
    // the displayed power number — this is what lets a cooling-deficit
    // fault push temperature well past anything normal load could reach.
    //
    // CRITICAL: both ratios divide by the GPU's RATED TDP (a fixed
    // per-architecture constant), NOT by gpu.powerLimit. powerLimit is
    // whatever the CURRENT (possibly `-pl`-capped) limit is — dividing by
    // it would make 100% utilization always renormalize to ratio=1.0
    // regardless of how low the cap is, reproducing PHYS-2's exact bug
    // ("temperature driven by a ratio, not watts") under a new equilibrium
    // number. Dividing by the fixed rated TDP means a lower CURRENT limit
    // genuinely produces fewer watts relative to the FIXED reference, so
    // capping power measurably cools.
    const ratedTDP = getRatedTDP(gpu.name);
    const loadRatio = Math.min(newPowerDraw / ratedTDP, 1);
    const faultRatio = faultHeat / ratedTDP;
    const targetTemp = Math.min(
      AMBIENT_TEMP +
        loadRatio * (NORMAL_FULL_LOAD_TEMP - AMBIENT_TEMP) +
        faultRatio * (THERMAL_CEILING - AMBIENT_TEMP),
      THERMAL_CEILING,
    );
    let newTemp =
      gpu.temperature + (targetTemp - gpu.temperature) * TEMP_SMOOTHING;
    newTemp = Math.max(AMBIENT_TEMP, Math.min(THERMAL_CEILING + 5, newTemp));

    // Check thermal thresholds against computed temperature (per-arch now,
    // not a single hardcoded pair) — PHYS-16.
    const prevTemp = this.previousTemps.get(gpu.uuid) ?? AMBIENT_TEMP;
    if (prevTemp < thresholds.maxOp && newTemp >= thresholds.maxOp) {
      this.thresholdEvents.push({
        type: "thermal-warning",
        gpuId: gpu.id,
        gpuUuid: gpu.uuid,
        value: newTemp,
      });
    }
    if (prevTemp < thresholds.shutdown && newTemp >= thresholds.shutdown) {
      this.thresholdEvents.push({
        type: "thermal-critical",
        gpuId: gpu.id,
        gpuUuid: gpu.uuid,
        value: newTemp,
      });
    }
    this.previousTemps.set(gpu.uuid, newTemp);

    // Clock throttling above the per-arch max operating temp, smoothed
    // rather than snapped (matches the "minutes not seconds" settle goal).
    const boostClock = getBoostClock(gpu.name);
    let targetClock = boostClock;
    if (newTemp > thresholds.maxOp) {
      const degreesOver = newTemp - thresholds.maxOp;
      const reduction = Math.round(degreesOver * THROTTLE_RATE_MHZ_PER_DEGREE);
      targetClock = Math.max(600, boostClock - reduction);
    }
    const newClocksSM = Math.round(
      gpu.clocksSM + (targetClock - gpu.clocksSM) * CLOCK_SMOOTHING,
    );

    // Closed feedback loop (PHYS-8's "throttling reduces clocks -> reduces
    // power" requirement): throttled clocks measurably draw less power,
    // which is what lets a throttling GPU cool down and recover instead of
    // pinning at the ceiling forever. clockRatio of 1.0 = no throttle.
    const clockRatio = newClocksSM / boostClock;
    const throttleFactor =
      THROTTLE_POWER_FLOOR_RATIO +
      (1 - THROTTLE_POWER_FLOOR_RATIO) * clockRatio;

    updated.powerDraw = Math.round(newPowerDraw * throttleFactor * 10) / 10;
    updated.temperature = Math.round(newTemp * 10) / 10;
    updated.clocksSM = newClocksSM;

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
