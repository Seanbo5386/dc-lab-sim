/**
 * Cluster JSON Schema Validation
 *
 * Provides secure parsing and validation of cluster configuration JSON files
 * to prevent prototype pollution attacks and ensure structural integrity.
 */

import type { ClusterConfig } from '@/types/hardware';

// Default maximum file size: 5MB
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

// Dangerous keys that could lead to prototype pollution
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ParseResult extends ValidationResult {
  data?: ClusterConfig;
}

/**
 * Recursively checks an object for prototype pollution attempts
 * Uses Object.getOwnPropertyNames to catch __proto__ which Object.keys misses
 * @param obj The object to check
 * @param path Current path for error messages
 * @returns Array of error messages for any dangerous keys found
 */
function checkPrototypePollution(obj: unknown, path: string = ''): string[] {
  const errors: string[] = [];

  if (obj === null || typeof obj !== 'object') {
    return errors;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      errors.push(...checkPrototypePollution(item, `${path}[${index}]`));
    });
    return errors;
  }

  // Use Object.getOwnPropertyNames to catch __proto__ which Object.keys() skips
  const record = obj as Record<string, unknown>;
  const allKeys = Object.getOwnPropertyNames(record);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;

    if (DANGEROUS_KEYS.includes(key)) {
      errors.push(`Prototype pollution attempt detected: "${currentPath}"`);
    }

    // Only recurse if the property is not a getter/setter and is an object
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor && 'value' in descriptor) {
      errors.push(...checkPrototypePollution(descriptor.value, currentPath));
    }
  }

  return errors;
}

/**
 * Validates that a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates the structure of a ClusterConfig object
 * @param data The data to validate
 * @returns ValidationResult with validity status and any errors
 */
export function validateClusterConfig(data: unknown): ValidationResult {
  const errors: string[] = [];

  // Check for prototype pollution first
  const pollutionErrors = checkPrototypePollution(data);
  if (pollutionErrors.length > 0) {
    return { valid: false, errors: pollutionErrors };
  }

  // Check if data is an object
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('Cluster config must be a non-null object');
    return { valid: false, errors };
  }

  const config = data as Record<string, unknown>;

  // Validate required top-level fields
  if (!isNonEmptyString(config.name)) {
    errors.push('Missing or invalid required field: "name" (must be a non-empty string)');
  }

  if (!Array.isArray(config.nodes)) {
    errors.push('Missing or invalid required field: "nodes" (must be an array)');
  } else if (config.nodes.length === 0) {
    errors.push('Field "nodes" must contain at least one node');
  } else {
    // Validate each node has required fields
    config.nodes.forEach((node: unknown, index: number) => {
      if (node === null || typeof node !== 'object' || Array.isArray(node)) {
        errors.push(`nodes[${index}] must be an object`);
        return;
      }

      const nodeRecord = node as Record<string, unknown>;

      if (!isNonEmptyString(nodeRecord.id)) {
        errors.push(`nodes[${index}].id is missing or invalid (must be a non-empty string)`);
      }

      if (!isNonEmptyString(nodeRecord.hostname)) {
        errors.push(`nodes[${index}].hostname is missing or invalid (must be a non-empty string)`);
      }

      if (!Array.isArray(nodeRecord.gpus)) {
        errors.push(`nodes[${index}].gpus is missing or invalid (must be an array)`);
      }
    });
  }

  // Validate fabricTopology if present
  const validTopologies = ['FatTree', 'RailOptimized', 'DragonFly'];
  if (config.fabricTopology !== undefined) {
    if (!validTopologies.includes(config.fabricTopology as string)) {
      errors.push(`Invalid fabricTopology: "${config.fabricTopology}" (must be one of: ${validTopologies.join(', ')})`);
    }
  }

  // Validate bcmHA structure if present
  if (config.bcmHA !== undefined) {
    if (config.bcmHA === null || typeof config.bcmHA !== 'object' || Array.isArray(config.bcmHA)) {
      errors.push('Field "bcmHA" must be an object');
    } else {
      const bcmHA = config.bcmHA as Record<string, unknown>;
      if (typeof bcmHA.enabled !== 'boolean') {
        errors.push('bcmHA.enabled must be a boolean');
      }
    }
  }

  // Validate slurmConfig structure if present
  if (config.slurmConfig !== undefined) {
    if (config.slurmConfig === null || typeof config.slurmConfig !== 'object' || Array.isArray(config.slurmConfig)) {
      errors.push('Field "slurmConfig" must be an object');
    } else {
      const slurmConfig = config.slurmConfig as Record<string, unknown>;
      if (slurmConfig.partitions !== undefined && !Array.isArray(slurmConfig.partitions)) {
        errors.push('slurmConfig.partitions must be an array');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safely parses a JSON string into a ClusterConfig with validation
 * @param jsonString The JSON string to parse
 * @param maxSize Maximum allowed size in bytes (default: 5MB)
 * @returns ParseResult with validity status, errors, and parsed data if valid
 */
export function safeParseClusterJSON(
  jsonString: string,
  maxSize: number = DEFAULT_MAX_SIZE
): ParseResult {
  const errors: string[] = [];

  // Check size limit
  const byteSize = new TextEncoder().encode(jsonString).length;
  if (byteSize > maxSize) {
    const sizeMB = (byteSize / (1024 * 1024)).toFixed(2);
    const maxMB = (maxSize / (1024 * 1024)).toFixed(2);
    errors.push(`File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`);
    return { valid: false, errors };
  }

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    errors.push(`Invalid JSON: ${message}`);
    return { valid: false, errors };
  }

  // Validate the structure
  const validation = validateClusterConfig(parsed);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors };
  }

  return {
    valid: true,
    errors: [],
    data: parsed as ClusterConfig,
  };
}
