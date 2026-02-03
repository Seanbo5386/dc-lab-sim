/**
 * Shallow comparison utilities for performance-critical metrics updates.
 * These functions replace JSON.stringify comparisons in the metrics loop
 * to avoid the overhead of full object serialization.
 */

import type { GPU, InfiniBandHCA, InfiniBandPort } from '@/types/hardware';

/**
 * Shallow compare two GPU objects for equality on key metrics fields.
 * Only compares fields that are likely to change during simulation updates.
 *
 * @param a - First GPU object
 * @param b - Second GPU object
 * @returns true if the GPU objects are considered equal for update purposes
 */
export function shallowCompareGPU(a: GPU, b: GPU): boolean {
  // Compare primitive fields that change during simulation
  if (a.id !== b.id) return false;
  if (a.temperature !== b.temperature) return false;
  if (a.powerDraw !== b.powerDraw) return false;
  if (a.memoryUsed !== b.memoryUsed) return false;
  if (a.utilization !== b.utilization) return false;
  if (a.clocksSM !== b.clocksSM) return false;
  if (a.clocksMem !== b.clocksMem) return false;
  if (a.healthStatus !== b.healthStatus) return false;

  // Compare ECC errors (nested but shallow)
  if (a.eccErrors.singleBit !== b.eccErrors.singleBit) return false;
  if (a.eccErrors.doubleBit !== b.eccErrors.doubleBit) return false;
  if (a.eccErrors.aggregated.singleBit !== b.eccErrors.aggregated.singleBit) return false;
  if (a.eccErrors.aggregated.doubleBit !== b.eccErrors.aggregated.doubleBit) return false;

  // Compare XID errors array length (quick check for changes)
  if (a.xidErrors.length !== b.xidErrors.length) return false;

  // Compare NVLink connection states
  if (a.nvlinks.length !== b.nvlinks.length) return false;
  for (let i = 0; i < a.nvlinks.length; i++) {
    const nvlinkA = a.nvlinks[i];
    const nvlinkB = b.nvlinks[i];
    if (nvlinkA.status !== nvlinkB.status) return false;
    if (nvlinkA.txErrors !== nvlinkB.txErrors) return false;
    if (nvlinkA.rxErrors !== nvlinkB.rxErrors) return false;
    if (nvlinkA.replayErrors !== nvlinkB.replayErrors) return false;
  }

  return true;
}

/**
 * Shallow compare an InfiniBand port for equality.
 *
 * @param a - First port object
 * @param b - Second port object
 * @returns true if the ports are considered equal
 */
function shallowComparePort(a: InfiniBandPort, b: InfiniBandPort): boolean {
  if (a.portNumber !== b.portNumber) return false;
  if (a.state !== b.state) return false;
  if (a.physicalState !== b.physicalState) return false;
  if (a.rate !== b.rate) return false;

  // Compare error counters
  if (a.errors.symbolErrors !== b.errors.symbolErrors) return false;
  if (a.errors.linkDowned !== b.errors.linkDowned) return false;
  if (a.errors.portRcvErrors !== b.errors.portRcvErrors) return false;
  if (a.errors.portXmitDiscards !== b.errors.portXmitDiscards) return false;
  if (a.errors.portXmitWait !== b.errors.portXmitWait) return false;

  return true;
}

/**
 * Shallow compare two InfiniBandHCA objects for equality.
 *
 * @param a - First HCA object
 * @param b - Second HCA object
 * @returns true if the HCA objects are considered equal for update purposes
 */
export function shallowCompareHCA(a: InfiniBandHCA, b: InfiniBandHCA): boolean {
  if (a.id !== b.id) return false;
  if (a.devicePath !== b.devicePath) return false;
  if (a.caType !== b.caType) return false;
  if (a.firmwareVersion !== b.firmwareVersion) return false;

  // Compare ports
  if (a.ports.length !== b.ports.length) return false;
  for (let i = 0; i < a.ports.length; i++) {
    if (!shallowComparePort(a.ports[i], b.ports[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Compare two arrays of HCAs for equality.
 *
 * @param a - First array of HCAs
 * @param b - Second array of HCAs
 * @returns true if the arrays are considered equal
 */
export function shallowCompareHCAs(a: InfiniBandHCA[], b: InfiniBandHCA[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!shallowCompareHCA(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
