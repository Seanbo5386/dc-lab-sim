import { describe, it, expect } from 'vitest';
import { validateClusterConfig, safeParseClusterJSON } from '../clusterSchema';

// Helper to create a minimal valid cluster config
const createValidConfig = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Cluster',
  nodes: [
    {
      id: 'node-1',
      hostname: 'dgx-001',
      gpus: [],
    },
  ],
  fabricTopology: 'FatTree',
  bcmHA: {
    enabled: true,
    primary: 'bcm-primary',
    secondary: 'bcm-secondary',
    state: 'Active',
  },
  slurmConfig: {
    controlMachine: 'slurm-controller',
    partitions: ['gpu', 'debug'],
  },
  ...overrides,
});

describe('validateClusterConfig', () => {
  describe('prototype pollution detection', () => {
    // Note: In JavaScript object literals, __proto__ is treated specially and
    // doesn't appear as an own property. The real attack vector is via JSON.parse,
    // which creates actual properties named "__proto__". We test that via
    // safeParseClusterJSON tests below. Here we test the "constructor" and
    // "prototype" keys which DO appear as own properties.

    it('should reject constructor key', () => {
      const maliciousConfig = {
        name: 'Malicious Cluster',
        nodes: [
          {
            id: 'node-1',
            hostname: 'dgx-001',
            gpus: [],
            constructor: { prototype: { isAdmin: true } },
          },
        ],
      };
      const result = validateClusterConfig(maliciousConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('constructor'))).toBe(true);
    });

    it('should reject prototype key', () => {
      const maliciousConfig = {
        name: 'Malicious Cluster',
        nodes: [
          {
            id: 'node-1',
            hostname: 'dgx-001',
            gpus: [],
          },
        ],
        bcmHA: {
          enabled: true,
          prototype: { isAdmin: true },
        },
      };
      const result = validateClusterConfig(maliciousConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('prototype'))).toBe(true);
    });

    it('should reject deeply nested constructor pollution', () => {
      const maliciousConfig = {
        name: 'Malicious Cluster',
        nodes: [
          {
            id: 'node-1',
            hostname: 'dgx-001',
            gpus: [
              {
                id: 0,
                nested: {
                  deep: {
                    constructor: { malicious: true },
                  },
                },
              },
            ],
          },
        ],
      };
      const result = validateClusterConfig(maliciousConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('constructor'))).toBe(true);
    });
  });

  describe('required field validation', () => {
    it('should accept valid cluster config', () => {
      const config = createValidConfig();
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name field', () => {
      const config = createValidConfig();
      delete (config as Record<string, unknown>).name;
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('"name"'))).toBe(true);
    });

    it('should reject empty name field', () => {
      const config = createValidConfig({ name: '' });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('"name"'))).toBe(true);
    });

    it('should reject missing nodes field', () => {
      const config = createValidConfig();
      delete (config as Record<string, unknown>).nodes;
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('"nodes"'))).toBe(true);
    });

    it('should reject empty nodes array', () => {
      const config = createValidConfig({ nodes: [] });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least one node'))).toBe(true);
    });

    it('should reject node without id', () => {
      const config = createValidConfig({
        nodes: [{ hostname: 'dgx-001', gpus: [] }],
      });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nodes[0].id'))).toBe(true);
    });

    it('should reject node without hostname', () => {
      const config = createValidConfig({
        nodes: [{ id: 'node-1', gpus: [] }],
      });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nodes[0].hostname'))).toBe(true);
    });

    it('should reject node without gpus array', () => {
      const config = createValidConfig({
        nodes: [{ id: 'node-1', hostname: 'dgx-001' }],
      });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nodes[0].gpus'))).toBe(true);
    });
  });

  describe('optional field validation', () => {
    it('should accept valid fabricTopology values', () => {
      for (const topology of ['FatTree', 'RailOptimized', 'DragonFly']) {
        const config = createValidConfig({ fabricTopology: topology });
        const result = validateClusterConfig(config);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid fabricTopology', () => {
      const config = createValidConfig({ fabricTopology: 'InvalidTopology' });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('fabricTopology'))).toBe(true);
    });

    it('should accept config without optional fields', () => {
      const config = {
        name: 'Minimal Cluster',
        nodes: [{ id: 'node-1', hostname: 'dgx-001', gpus: [] }],
      };
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('type validation', () => {
    it('should reject null input', () => {
      const result = validateClusterConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-null object'))).toBe(true);
    });

    it('should reject array input', () => {
      const result = validateClusterConfig([]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-null object'))).toBe(true);
    });

    it('should reject primitive input', () => {
      const result = validateClusterConfig('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-null object'))).toBe(true);
    });

    it('should reject bcmHA as non-object', () => {
      const config = createValidConfig({ bcmHA: 'invalid' });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bcmHA'))).toBe(true);
    });

    it('should reject slurmConfig as non-object', () => {
      const config = createValidConfig({ slurmConfig: 'invalid' });
      const result = validateClusterConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('slurmConfig'))).toBe(true);
    });
  });
});

describe('safeParseClusterJSON', () => {
  describe('size validation', () => {
    it('should reject files exceeding default size limit (5MB)', () => {
      // Create a string larger than 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      const result = safeParseClusterJSON(largeContent);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should reject files exceeding custom size limit', () => {
      const config = createValidConfig();
      const jsonString = JSON.stringify(config);
      // Set a very small limit
      const result = safeParseClusterJSON(jsonString, 10);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should accept files within size limit', () => {
      const config = createValidConfig();
      const jsonString = JSON.stringify(config);
      const result = safeParseClusterJSON(jsonString);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('JSON parsing', () => {
    it('should reject invalid JSON syntax', () => {
      const result = safeParseClusterJSON('{ invalid json }');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should reject truncated JSON', () => {
      const result = safeParseClusterJSON('{ "name": "Test"');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should parse valid JSON', () => {
      const config = createValidConfig();
      const jsonString = JSON.stringify(config);
      const result = safeParseClusterJSON(jsonString);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(config);
    });
  });

  describe('combined validation', () => {
    it('should return parsed data for valid configs', () => {
      const config = createValidConfig();
      const jsonString = JSON.stringify(config);
      const result = safeParseClusterJSON(jsonString);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(config);
    });

    it('should not return data for invalid configs', () => {
      const invalidConfig = { name: 'Test' }; // Missing nodes
      const jsonString = JSON.stringify(invalidConfig);
      const result = safeParseClusterJSON(jsonString);
      expect(result.valid).toBe(false);
      expect(result.data).toBeUndefined();
    });

    it('should detect prototype pollution in parsed JSON', () => {
      // JSON.parse will include __proto__ as a regular key (not special)
      const maliciousJson = '{"name":"Test","nodes":[{"id":"n1","hostname":"h1","gpus":[],"__proto__":{"admin":true}}]}';
      const result = safeParseClusterJSON(maliciousJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Prototype pollution'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = safeParseClusterJSON('');
      expect(result.valid).toBe(false);
    });

    it('should handle whitespace-only string', () => {
      const result = safeParseClusterJSON('   ');
      expect(result.valid).toBe(false);
    });

    it('should handle JSON with unicode characters', () => {
      const config = createValidConfig({ name: 'Test Cluster \u4e2d\u6587' });
      const jsonString = JSON.stringify(config);
      const result = safeParseClusterJSON(jsonString);
      expect(result.valid).toBe(true);
      expect(result.data?.name).toBe('Test Cluster \u4e2d\u6587');
    });
  });
});
