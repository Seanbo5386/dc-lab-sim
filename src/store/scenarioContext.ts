/**
 * ScenarioContext - Provides isolated state execution for scenarios
 *
 * Each scenario runs in its own context with a copy of the cluster state.
 * Changes are tracked and can optionally be merged back to the main state.
 */

import type { ClusterConfig, GPU, DGXNode as Node, HealthStatus, XIDError } from '@/types/hardware';
import { useSimulationStore } from './simulationStore';

/**
 * Base interface for all state changes
 */
interface StateChangeBase {
  timestamp: number;
  nodeId?: string;
  gpuId?: number;
  command?: string;
  description?: string;
}

/**
 * Discriminated union type for state changes with properly typed data
 */
export type StateChange =
  | (StateChangeBase & { type: 'gpu-update'; data: Partial<GPU> })
  | (StateChangeBase & { type: 'node-update'; data: Partial<Node> })
  | (StateChangeBase & { type: 'node-health'; data: { health: HealthStatus } })
  | (StateChangeBase & { type: 'xid-error'; data: XIDError })
  | (StateChangeBase & { type: 'slurm-state'; data: { state: 'idle' | 'alloc' | 'drain' | 'down'; reason?: string } })
  | (StateChangeBase & { type: 'mig-mode'; data: { enabled: boolean } });

export class ScenarioContext {
  private scenarioId: string;
  private isolatedCluster: ClusterConfig;
  private mutations: StateChange[] = [];
  private startTime: number;
  private readonly: boolean = false;

  constructor(scenarioId: string, baseCluster?: ClusterConfig) {
    this.scenarioId = scenarioId;
    this.startTime = Date.now();

    // Use provided cluster or get from store
    const cluster = baseCluster || useSimulationStore.getState().cluster;

    // Deep clone to prevent reference issues
    this.isolatedCluster = structuredClone(cluster);
  }

  /**
   * Get the current isolated cluster state
   */
  getCluster(): ClusterConfig {
    return this.isolatedCluster;
  }

  /**
   * Get a specific node from the isolated state
   */
  getNode(nodeId: string): Node | undefined {
    return this.isolatedCluster.nodes.find(n => n.id === nodeId);
  }

  /**
   * Get a specific GPU from the isolated state
   */
  getGPU(nodeId: string, gpuId: number): GPU | undefined {
    const node = this.getNode(nodeId);
    return node?.gpus.find((g: GPU) => g.id === gpuId);
  }

  /**
   * Update a GPU in the isolated state
   */
  updateGPU(nodeId: string, gpuId: number, updates: Partial<GPU>, command?: string): void {
    if (this.readonly) {
      console.warn('Cannot update GPU in readonly context');
      return;
    }

    const node = this.getNode(nodeId);
    if (!node) {
      console.error(`Node ${nodeId} not found in scenario context`);
      return;
    }

    const gpu = node.gpus.find((g: GPU) => g.id === gpuId);
    if (!gpu) {
      console.error(`GPU ${gpuId} not found on node ${nodeId}`);
      return;
    }

    // Apply updates
    Object.assign(gpu, updates);

    // Track mutation
    this.mutations.push({
      type: 'gpu-update',
      timestamp: Date.now(),
      nodeId,
      gpuId,
      data: updates,
      command,
      description: `Updated GPU ${gpuId} on ${nodeId}`
    });
  }

  /**
   * Update node health status in isolated state
   */
  updateNodeHealth(nodeId: string, health: HealthStatus, command?: string): void {
    if (this.readonly) {
      console.warn('Cannot update node health in readonly context');
      return;
    }

    const node = this.getNode(nodeId);
    if (!node) {
      console.error(`Node ${nodeId} not found in scenario context`);
      return;
    }

    node.healthStatus = health;

    this.mutations.push({
      type: 'node-health',
      timestamp: Date.now(),
      nodeId,
      data: { health },
      command,
      description: `Set ${nodeId} health to ${health}`
    });
  }

  /**
   * Add XID error to GPU in isolated state
   */
  addXIDError(nodeId: string, gpuId: number, error: XIDError, command?: string): void {
    if (this.readonly) {
      console.warn('Cannot add XID error in readonly context');
      return;
    }

    const gpu = this.getGPU(nodeId, gpuId);
    if (!gpu) {
      console.error(`GPU ${gpuId} not found on node ${nodeId}`);
      return;
    }

    if (!gpu.xidErrors) {
      gpu.xidErrors = [];
    }
    gpu.xidErrors.push(error);

    this.mutations.push({
      type: 'xid-error',
      timestamp: Date.now(),
      nodeId,
      gpuId,
      data: error,
      command,
      description: `Added XID ${error.code} to GPU ${gpuId}`
    });
  }

  /**
   * Set MIG mode for GPU in isolated state
   */
  setMIGMode(nodeId: string, gpuId: number, enabled: boolean, command?: string): void {
    if (this.readonly) {
      console.warn('Cannot set MIG mode in readonly context');
      return;
    }

    const gpu = this.getGPU(nodeId, gpuId);
    if (!gpu) {
      console.error(`GPU ${gpuId} not found on node ${nodeId}`);
      return;
    }

    // MIG is tracked differently in our GPU type
    if (enabled && !gpu.migInstances) {
      gpu.migInstances = [];
    } else if (!enabled) {
      gpu.migInstances = [];  // Empty array instead of undefined
    }

    this.mutations.push({
      type: 'mig-mode',
      timestamp: Date.now(),
      nodeId,
      gpuId,
      data: { enabled },
      command,
      description: `Set MIG mode to ${enabled} for GPU ${gpuId}`
    });
  }

  /**
   * Set Slurm state for node in isolated state
   */
  setSlurmState(nodeId: string, state: 'idle' | 'alloc' | 'drain' | 'down', reason?: string, command?: string): void {
    if (this.readonly) {
      console.warn('Cannot set Slurm state in readonly context');
      return;
    }

    const node = this.getNode(nodeId);
    if (!node) {
      console.error(`Node ${nodeId} not found in scenario context`);
      return;
    }

    node.slurmState = state;
    if (reason) {
      node.slurmReason = reason;
    }

    this.mutations.push({
      type: 'slurm-state',
      timestamp: Date.now(),
      nodeId,
      data: { state, reason },
      command,
      description: `Set ${nodeId} Slurm state to ${state}`
    });
  }

  /**
   * Get all mutations that have been applied
   */
  getMutations(): StateChange[] {
    return [...this.mutations];
  }

  /**
   * Get mutation count
   */
  getMutationCount(): number {
    return this.mutations.length;
  }

  /**
   * Apply all mutations to the global state
   * Used when we want to merge scenario changes back
   */
  applyToGlobalState(): void {
    if (this.readonly) {
      console.warn('Cannot apply changes from readonly context');
      return;
    }

    const store = useSimulationStore.getState();

    // Apply each mutation to the global state
    this.mutations.forEach(mutation => {
      switch (mutation.type) {
        case 'gpu-update':
          if (mutation.nodeId !== undefined && mutation.gpuId !== undefined) {
            store.updateGPU(mutation.nodeId, mutation.gpuId, mutation.data);
          }
          break;

        case 'node-health':
          if (mutation.nodeId) {
            store.updateNodeHealth(mutation.nodeId, mutation.data.health);
          }
          break;

        case 'xid-error':
          if (mutation.nodeId !== undefined && mutation.gpuId !== undefined) {
            store.addXIDError(mutation.nodeId, mutation.gpuId, mutation.data);
          }
          break;

        case 'mig-mode':
          if (mutation.nodeId !== undefined && mutation.gpuId !== undefined) {
            store.setMIGMode(mutation.nodeId, mutation.gpuId, mutation.data.enabled);
          }
          break;

        case 'slurm-state':
          if (mutation.nodeId) {
            store.setSlurmState(mutation.nodeId, mutation.data.state, mutation.data.reason);
          }
          break;

        default:
          console.warn(`Unknown mutation type: ${mutation.type}`);
      }
    });

    console.log(`Applied ${this.mutations.length} mutations from scenario ${this.scenarioId} to global state`);
  }

  /**
   * Reset the context to initial state
   */
  reset(): void {
    if (this.readonly) {
      console.warn('Cannot reset readonly context');
      return;
    }

    const store = useSimulationStore.getState();
    this.isolatedCluster = structuredClone(store.cluster);
    this.mutations = [];
    console.log(`Reset scenario context ${this.scenarioId}`);
  }

  /**
   * Set context as readonly (no more mutations allowed)
   */
  setReadonly(readonly: boolean = true): void {
    this.readonly = readonly;
  }

  /**
   * Check if context is readonly
   */
  isReadonly(): boolean {
    return this.readonly;
  }

  /**
   * Get scenario runtime duration
   */
  getRuntimeMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Export context state as JSON
   */
  export(): string {
    return JSON.stringify({
      scenarioId: this.scenarioId,
      cluster: this.isolatedCluster,
      mutations: this.mutations,
      startTime: this.startTime,
      runtime: this.getRuntimeMs()
    }, null, 2);
  }

  /**
   * Create a snapshot of current isolated state
   */
  snapshot(): ClusterConfig {
    return structuredClone(this.isolatedCluster);
  }

  /**
   * Compare current state with initial state
   */
  getDiff(): StateChange[] {
    // Return all mutations as they represent the diff
    return this.getMutations();
  }
}

// Context manager for multiple scenarios
export class ScenarioContextManager {
  private static instance: ScenarioContextManager;
  private contexts: Map<string, ScenarioContext> = new Map();
  private activeContextId: string | null = null;

  private constructor() {}

  static getInstance(): ScenarioContextManager {
    if (!ScenarioContextManager.instance) {
      ScenarioContextManager.instance = new ScenarioContextManager();
    }
    return ScenarioContextManager.instance;
  }

  /**
   * Create a new scenario context
   */
  createContext(scenarioId: string, baseCluster?: ClusterConfig): ScenarioContext {
    const context = new ScenarioContext(scenarioId, baseCluster);
    this.contexts.set(scenarioId, context);
    console.log(`Created scenario context: ${scenarioId}`);
    return context;
  }

  /**
   * Get a scenario context
   */
  getContext(scenarioId: string): ScenarioContext | undefined {
    return this.contexts.get(scenarioId);
  }

  /**
   * Get or create a scenario context
   */
  getOrCreateContext(scenarioId: string, baseCluster?: ClusterConfig): ScenarioContext {
    let context = this.contexts.get(scenarioId);
    if (!context) {
      context = this.createContext(scenarioId, baseCluster);
    }
    return context;
  }

  /**
   * Set the active context
   */
  setActiveContext(scenarioId: string | null): void {
    this.activeContextId = scenarioId;
    console.log(`Active scenario context: ${scenarioId || 'none'}`);
  }

  /**
   * Get the active context
   */
  getActiveContext(): ScenarioContext | undefined {
    if (!this.activeContextId) return undefined;
    return this.contexts.get(this.activeContextId);
  }

  /**
   * Delete a context
   */
  deleteContext(scenarioId: string): boolean {
    const deleted = this.contexts.delete(scenarioId);
    if (deleted && this.activeContextId === scenarioId) {
      this.activeContextId = null;
    }
    console.log(`Deleted scenario context: ${scenarioId}`);
    return deleted;
  }

  /**
   * Clear all contexts
   */
  clearAll(): void {
    this.contexts.clear();
    this.activeContextId = null;
    console.log('Cleared all scenario contexts');
  }

  /**
   * Get all context IDs
   */
  getContextIds(): string[] {
    return Array.from(this.contexts.keys());
  }
}

// Export singleton instance
export const scenarioContextManager = ScenarioContextManager.getInstance();