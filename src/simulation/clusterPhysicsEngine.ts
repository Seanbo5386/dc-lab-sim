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
 *
 * tickGPU's loadRatio is computed from POST-fault-inflated power draw
 * (newPowerDraw includes activeFaultHeatWatts via targetPower), so a
 * fault's heat drives temperature through BOTH the load-ratio term
 * (scaled to NORMAL_FULL_LOAD_TEMP) and the fault-ratio term (scaled to
 * THERMAL_CEILING) for a near-idle GPU. Solving for the fraction that
 * lands a near-idle GPU at targetTempC requires inverting both channels
 * together, not just the fault-ratio term alone — the single-channel
 * version of this formula caused all of narrativeScenarios.json's
 * authored thermal faults (83C, 85C, 92C) to converge to the same 95C
 * ceiling regardless of their intended severity.
 */
export function heatWattsFraction(targetTempC: number): number {
  return Math.max(
    0,
    (targetTempC -
      AMBIENT_TEMP -
      IDLE_POWER_FLOOR * (NORMAL_FULL_LOAD_TEMP - AMBIENT_TEMP)) /
      (NORMAL_FULL_LOAD_TEMP - AMBIENT_TEMP + (THERMAL_CEILING - AMBIENT_TEMP)),
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

/**
 * Single source of truth for "how severe is this temperature," used by both
 * Dashboard's temperature icon and (separately) fault-injection/remediation
 * code that sets healthStatus — so the two stop disagreeing (LIVE-4).
 */
export function deriveThermalSeverity(
  temperature: number,
  gpuName: string,
): { severity: "ok" | "warning" | "critical"; label: string } {
  const thresholds = getThermalThresholds(gpuName);
  if (temperature >= thresholds.shutdown) {
    return { severity: "critical", label: "Critical" };
  }
  if (temperature >= thresholds.maxOp) {
    return { severity: "warning", label: "Warm" };
  }
  return { severity: "ok", label: "OK" };
}

export interface ThrottleReasons {
  idle: boolean;
  appClocksSetting: boolean;
  swPowerCap: boolean;
  hwThermalSlowdown: boolean;
  hwPowerBrakeSlowdown: boolean;
  /** True whenever any HW-prefixed reason above is true — a child reason
   * being active while its parent reports inactive is a self-contradiction
   * real nvidia-smi never produces (PHYS-3). */
  hwSlowdown: boolean;
  syncBoost: boolean;
  swThermalSlowdown: boolean;
  displayClockSetting: boolean;
}

/**
 * Single source of truth for "Clocks Throttle Reasons," used by both
 * `nvidia-smi -q`'s formatQuery and its -d PERFORMANCE display path
 * (formatDisplayPerformance) — previously two independent hardcoded
 * implementations that could (and did) disagree.
 */
export function deriveThrottleReasons(gpu: GPU): ThrottleReasons {
  const thresholds = getThermalThresholds(gpu.name || "");
  const hwThermalSlowdown = gpu.temperature >= thresholds.slowdown;
  // No modeled power-brake-triggering fault exists yet — always false,
  // same as every other simulated GPU's current (correct) value.
  const hwPowerBrakeSlowdown = false;
  return {
    idle: gpu.utilization < 5,
    appClocksSetting: false,
    swPowerCap: gpu.powerDraw > gpu.powerLimit * 0.95,
    hwThermalSlowdown,
    hwPowerBrakeSlowdown,
    hwSlowdown: hwThermalSlowdown || hwPowerBrakeSlowdown,
    syncBoost: false,
    swThermalSlowdown: false,
    displayClockSetting: false,
  };
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

/**
 * Look up a GPU's real min/max power-limit bounds by model name — the
 * range `-pl`/nvidia-smi's power-limit query fields must report, NOT a
 * range derived from `gpu.powerLimit` (the CURRENT, possibly already-capped
 * value). Deriving bounds from the current limit means a GPU capped to
 * 250W would report a "max" of 250W to a query run immediately afterward —
 * the reported ceiling would shrink every time -pl lowers it, instead of
 * staying fixed at the hardware's real ceiling (SIM-2). Falls back to
 * A100's 100-400W.
 */
export function getPowerLimitBounds(gpuName: string): {
  min: number;
  max: number;
} {
  for (const spec of Object.values(HARDWARE_SPECS)) {
    if (spec.gpu.model === gpuName) {
      return { min: spec.gpu.minPowerLimitW, max: spec.gpu.maxPowerLimitW };
    }
  }
  return { min: 100, max: 400 };
}

/**
 * Fraction (0-1) of a GPU's rated boost clock it's currently running at.
 * Used to scale compute-bound benchmark results (HPL FLOPS, gpu-burn) so a
 * thermally-throttled or otherwise clock-reduced GPU measurably
 * underperforms instead of a benchmark always reporting its static
 * theoretical peak regardless of live state (PHYS-6).
 */
export function getClockRatio(gpu: GPU): number {
  const boostClock = getBoostClock(gpu.name);
  if (boostClock <= 0) return 1;
  return Math.max(0, Math.min(1, gpu.clocksSM / boostClock));
}

/**
 * Fraction (0-1) of a GPU's rated TDP its current -pl power limit allows.
 * A capped power limit constrains sustained clocks even before thermal
 * throttling kicks in, so compute-bound benchmarks should scale down too
 * (PHYS-6).
 */
export function getPowerCapRatio(gpu: GPU): number {
  const ratedTDP = getRatedTDP(gpu.name);
  if (ratedTDP <= 0) return 1;
  return Math.max(0, Math.min(1, gpu.powerLimit / ratedTDP));
}

/**
 * Fraction (0-1) of NVLink connections across the given GPUs that are NOT
 * Down. Used to scale bandwidth-bound benchmark results (NCCL, p2p tests)
 * so a down link measurably reduces achieved bandwidth (PHYS-6). Returns 1
 * (fully healthy) if none of the given GPUs model any NVLink connections
 * at all, so fixtures/architectures without a populated `nvlinks` array
 * aren't spuriously zeroed out.
 */
export function getNvlinkHealthRatio(gpus: GPU[]): number {
  const allLinks = gpus.flatMap((g) => g.nvlinks);
  if (allLinks.length === 0) return 1;
  const upCount = allLinks.filter((l) => l.status !== "Down").length;
  return upCount / allLinks.length;
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
    const boostClock = getBoostClock(gpu.name);

    // Power follows utilization; displayed power draw stays clamped at the
    // rated limit (matches real nvidia-smi — a fault or cap never makes the
    // shown wattage exceed or bypass the limit itself).
    const loadTargetPower =
      gpu.powerLimit *
      (IDLE_POWER_FLOOR + (gpu.utilization / 100) * (1 - IDLE_POWER_FLOOR));
    const targetPower = loadTargetPower + faultHeat;

    // gpu.powerDraw (this tick's input) already has LAST tick's throttle
    // factor baked in (see updated.powerDraw below) — smoothing directly
    // from it and then re-applying throttleFactor at the end would
    // compound the reduction every tick, decaying power draw far below the
    // intended THROTTLE_POWER_FLOOR_RATIO floor (verified: a stable 0.7
    // factor applied this way settles at ~32% of target, not 70%).
    // Reconstruct what the pre-throttle smoothing baseline would have been,
    // using last tick's clock state (gpu.clocksSM) to recover last tick's
    // throttle factor, so smoothing starts from an unthrottled baseline
    // every tick and throttleFactor is applied exactly once.
    const prevThrottleFactor =
      THROTTLE_POWER_FLOOR_RATIO +
      (1 - THROTTLE_POWER_FLOOR_RATIO) * (gpu.clocksSM / boostClock);
    const prevUnthrottledPowerDraw = gpu.powerDraw / prevThrottleFactor;

    let newPowerDraw =
      prevUnthrottledPowerDraw +
      (targetPower - prevUnthrottledPowerDraw) * POWER_SMOOTHING;
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
