import { describe, it, expect } from 'vitest';
import { shallowCompareGPU, shallowCompareHCA, shallowCompareHCAs } from '../shallowCompare';
import type { GPU, InfiniBandHCA } from '@/types/hardware';

// Factory function to create a mock GPU with defaults
function createMockGPU(overrides: Partial<GPU> = {}): GPU {
  return {
    id: 0,
    uuid: 'GPU-12345678-1234-1234-1234-123456789abc',
    name: 'NVIDIA H100 80GB HBM3',
    type: 'H100-SXM',
    pciAddress: '0000:3b:00.0',
    temperature: 45,
    powerDraw: 350,
    powerLimit: 700,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 0,
    clocksSM: 1980,
    clocksMem: 1593,
    eccEnabled: true,
    eccErrors: {
      singleBit: 0,
      doubleBit: 0,
      aggregated: {
        singleBit: 0,
        doubleBit: 0,
      },
    },
    migMode: false,
    migInstances: [],
    nvlinks: [
      { linkId: 0, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
      { linkId: 1, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
    ],
    healthStatus: 'OK',
    xidErrors: [],
    persistenceMode: true,
    ...overrides,
  };
}

// Factory function to create a mock HCA with defaults
function createMockHCA(overrides: Partial<InfiniBandHCA> = {}): InfiniBandHCA {
  return {
    id: 0,
    devicePath: '/dev/infiniband/mlx5_0',
    pciAddress: '0000:ca:00.0',
    caType: 'ConnectX-7',
    firmwareVersion: '28.35.1000',
    ports: [
      {
        portNumber: 1,
        state: 'Active',
        physicalState: 'LinkUp',
        rate: 400,
        lid: 1,
        guid: '0x98039b03009a1234',
        linkLayer: 'InfiniBand',
        errors: {
          symbolErrors: 0,
          linkDowned: 0,
          portRcvErrors: 0,
          portXmitDiscards: 0,
          portXmitWait: 0,
        },
      },
    ],
    ...overrides,
  };
}

describe('shallowCompareGPU', () => {
  describe('identical GPUs', () => {
    it('should return true for identical GPU objects', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU();
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(true);
    });

    it('should return true when comparing same object reference', () => {
      const gpu = createMockGPU();
      expect(shallowCompareGPU(gpu, gpu)).toBe(true);
    });
  });

  describe('different primitive fields', () => {
    it('should return false when id differs', () => {
      const gpu1 = createMockGPU({ id: 0 });
      const gpu2 = createMockGPU({ id: 1 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when temperature differs', () => {
      const gpu1 = createMockGPU({ temperature: 45 });
      const gpu2 = createMockGPU({ temperature: 50 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when powerDraw differs', () => {
      const gpu1 = createMockGPU({ powerDraw: 350 });
      const gpu2 = createMockGPU({ powerDraw: 400 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when memoryUsed differs', () => {
      const gpu1 = createMockGPU({ memoryUsed: 1024 });
      const gpu2 = createMockGPU({ memoryUsed: 2048 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when utilization differs', () => {
      const gpu1 = createMockGPU({ utilization: 0 });
      const gpu2 = createMockGPU({ utilization: 50 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when clocksSM differs', () => {
      const gpu1 = createMockGPU({ clocksSM: 1980 });
      const gpu2 = createMockGPU({ clocksSM: 2100 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when clocksMem differs', () => {
      const gpu1 = createMockGPU({ clocksMem: 1593 });
      const gpu2 = createMockGPU({ clocksMem: 1700 });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when healthStatus differs', () => {
      const gpu1 = createMockGPU({ healthStatus: 'OK' });
      const gpu2 = createMockGPU({ healthStatus: 'Warning' });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });
  });

  describe('ECC errors', () => {
    it('should return false when singleBit errors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        eccErrors: { ...gpu1.eccErrors, singleBit: 5 },
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when doubleBit errors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        eccErrors: { ...gpu1.eccErrors, doubleBit: 1 },
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when aggregated singleBit errors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        eccErrors: {
          ...gpu1.eccErrors,
          aggregated: { singleBit: 10, doubleBit: 0 },
        },
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when aggregated doubleBit errors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        eccErrors: {
          ...gpu1.eccErrors,
          aggregated: { singleBit: 0, doubleBit: 2 },
        },
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });
  });

  describe('XID errors', () => {
    it('should return false when xidErrors array length differs', () => {
      const gpu1 = createMockGPU({ xidErrors: [] });
      const gpu2 = createMockGPU({
        xidErrors: [
          { code: 79, timestamp: new Date(), description: 'GPU has fallen off the bus', severity: 'Critical' },
        ],
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return true when xidErrors array length is same (shallow check)', () => {
      const gpu1 = createMockGPU({
        xidErrors: [
          { code: 79, timestamp: new Date(), description: 'Error A', severity: 'Critical' },
        ],
      });
      const gpu2 = createMockGPU({
        xidErrors: [
          { code: 80, timestamp: new Date(), description: 'Error B', severity: 'Warning' },
        ],
      });
      // Shallow comparison only checks length, not contents
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(true);
    });
  });

  describe('NVLink connections', () => {
    it('should return false when nvlinks array length differs', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({ nvlinks: [] });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when nvlink status differs', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        nvlinks: [
          { linkId: 0, status: 'Down', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
          { linkId: 1, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
        ],
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when nvlink txErrors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        nvlinks: [
          { linkId: 0, status: 'Active', speed: 900, txErrors: 5, rxErrors: 0, replayErrors: 0 },
          { linkId: 1, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
        ],
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when nvlink rxErrors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        nvlinks: [
          { linkId: 0, status: 'Active', speed: 900, txErrors: 0, rxErrors: 3, replayErrors: 0 },
          { linkId: 1, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
        ],
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });

    it('should return false when nvlink replayErrors differ', () => {
      const gpu1 = createMockGPU();
      const gpu2 = createMockGPU({
        nvlinks: [
          { linkId: 0, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 2 },
          { linkId: 1, status: 'Active', speed: 900, txErrors: 0, rxErrors: 0, replayErrors: 0 },
        ],
      });
      expect(shallowCompareGPU(gpu1, gpu2)).toBe(false);
    });
  });
});

describe('shallowCompareHCA', () => {
  describe('identical HCAs', () => {
    it('should return true for identical HCA objects', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA();
      expect(shallowCompareHCA(hca1, hca2)).toBe(true);
    });

    it('should return true when comparing same object reference', () => {
      const hca = createMockHCA();
      expect(shallowCompareHCA(hca, hca)).toBe(true);
    });
  });

  describe('different primitive fields', () => {
    it('should return false when id differs', () => {
      const hca1 = createMockHCA({ id: 0 });
      const hca2 = createMockHCA({ id: 1 });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when devicePath differs', () => {
      const hca1 = createMockHCA({ devicePath: '/dev/infiniband/mlx5_0' });
      const hca2 = createMockHCA({ devicePath: '/dev/infiniband/mlx5_1' });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when caType differs', () => {
      const hca1 = createMockHCA({ caType: 'ConnectX-7' });
      const hca2 = createMockHCA({ caType: 'ConnectX-6' });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when firmwareVersion differs', () => {
      const hca1 = createMockHCA({ firmwareVersion: '28.35.1000' });
      const hca2 = createMockHCA({ firmwareVersion: '28.35.2000' });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });
  });

  describe('port comparisons', () => {
    it('should return false when ports array length differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [
          ...createMockHCA().ports,
          {
            portNumber: 2,
            state: 'Active',
            physicalState: 'LinkUp',
            rate: 400,
            lid: 2,
            guid: '0x98039b03009a5678',
            linkLayer: 'InfiniBand',
            errors: {
              symbolErrors: 0,
              linkDowned: 0,
              portRcvErrors: 0,
              portXmitDiscards: 0,
              portXmitWait: 0,
            },
          },
        ],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port state differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{ ...hca1.ports[0], state: 'Down' }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port physicalState differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{ ...hca1.ports[0], physicalState: 'LinkDown' }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port rate differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{ ...hca1.ports[0], rate: 200 }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port symbolErrors differ', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{
          ...hca1.ports[0],
          errors: { ...hca1.ports[0].errors, symbolErrors: 10 },
        }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port linkDowned differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{
          ...hca1.ports[0],
          errors: { ...hca1.ports[0].errors, linkDowned: 2 },
        }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port portRcvErrors differ', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{
          ...hca1.ports[0],
          errors: { ...hca1.ports[0].errors, portRcvErrors: 5 },
        }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port portXmitDiscards differ', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{
          ...hca1.ports[0],
          errors: { ...hca1.ports[0].errors, portXmitDiscards: 3 },
        }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });

    it('should return false when port portXmitWait differs', () => {
      const hca1 = createMockHCA();
      const hca2 = createMockHCA({
        ports: [{
          ...hca1.ports[0],
          errors: { ...hca1.ports[0].errors, portXmitWait: 100 },
        }],
      });
      expect(shallowCompareHCA(hca1, hca2)).toBe(false);
    });
  });
});

describe('shallowCompareHCAs', () => {
  it('should return true for identical HCA arrays', () => {
    const hcas1 = [createMockHCA({ id: 0 }), createMockHCA({ id: 1 })];
    const hcas2 = [createMockHCA({ id: 0 }), createMockHCA({ id: 1 })];
    expect(shallowCompareHCAs(hcas1, hcas2)).toBe(true);
  });

  it('should return true for empty arrays', () => {
    expect(shallowCompareHCAs([], [])).toBe(true);
  });

  it('should return false when array lengths differ', () => {
    const hcas1 = [createMockHCA({ id: 0 })];
    const hcas2 = [createMockHCA({ id: 0 }), createMockHCA({ id: 1 })];
    expect(shallowCompareHCAs(hcas1, hcas2)).toBe(false);
  });

  it('should return false when any HCA differs', () => {
    const hcas1 = [createMockHCA({ id: 0 }), createMockHCA({ id: 1 })];
    const hcas2 = [createMockHCA({ id: 0 }), createMockHCA({ id: 2 })];
    expect(shallowCompareHCAs(hcas1, hcas2)).toBe(false);
  });
});
