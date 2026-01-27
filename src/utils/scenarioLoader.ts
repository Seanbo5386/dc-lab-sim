import type { Scenario, FaultInjectionConfig } from '@/types/scenarios';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * Loads a scenario from JSON file
 */
export async function loadScenarioFromFile(scenarioId: string): Promise<Scenario | null> {
  try {
    // Map scenario IDs to their file paths - ALL 42 scenarios
    const scenarioFiles: Record<string, string> = {
      // Domain 1: Platform Bring-Up (11 scenarios)
      'domain1-server-post': '/src/data/scenarios/domain1/server-post-verification.json',
      'domain1-bmc-config': '/src/data/scenarios/domain1/bmc-configuration.json',
      'domain1-driver-install': '/src/data/scenarios/domain1/driver-installation.json',
      'domain1-gpu-discovery': '/src/data/scenarios/domain1/gpu-feature-discovery.json',
      'domain1-driver-troubleshoot': '/src/data/scenarios/domain1/driver-troubleshooting.json',
      'domain1-firmware-verification': '/src/data/scenarios/domain1/firmware-verification.json',
      'domain1-bmc-security': '/src/data/scenarios/domain1/bmc-security-hardening.json',
      'domain1-uefi-validation': '/src/data/scenarios/domain1/uefi-bios-validation.json',
      'domain1-fabric-manager': '/src/data/scenarios/domain1/fabric-manager-setup.json',
      'domain1-driver-rollback': '/src/data/scenarios/domain1/driver-rollback.json',
      'domain1-hw-inventory': '/src/data/scenarios/domain1/hardware-inventory-validation.json',

      // Domain 2: Accelerator Configuration (6 scenarios)
      'domain2-mig-setup': '/src/data/scenarios/domain2/mig-configuration.json',
      'domain2-nvlink-topo': '/src/data/scenarios/domain2/nvlink-topology.json',
      'domain2-advanced-mig': '/src/data/scenarios/domain2/advanced-mig-reconfiguration.json',
      'domain2-nvlink-recovery': '/src/data/scenarios/domain2/nvlink-error-recovery.json',
      'domain2-gpu-power': '/src/data/scenarios/domain2/gpu-power-optimization.json',
      'domain2-bluefield-dpu': '/src/data/scenarios/domain2/bluefield-dpu-config.json',

      // Domain 3: Base Infrastructure (9 scenarios)
      'domain3-slurm-config': '/src/data/scenarios/domain3/slurm-configuration.json',
      'domain3-containers': '/src/data/scenarios/domain3/container-runtime.json',
      'domain3-storage': '/src/data/scenarios/domain3/storage-validation.json',
      'domain3-slurm-full-setup': '/src/data/scenarios/domain3/full-slurm-cluster-setup.json',
      'domain3-mixed-gpu-gres': '/src/data/scenarios/domain3/mixed-gpu-gres.json',
      'domain3-ngc-pipeline': '/src/data/scenarios/domain3/ngc-container-pipeline.json',
      'domain3-pyxis-advanced': '/src/data/scenarios/domain3/pyxis-enroot-advanced.json',
      'domain3-lustre-validation': '/src/data/scenarios/domain3/lustre-client-validation.json',
      'domain3-nfs-tuning': '/src/data/scenarios/domain3/nfs-performance-tuning.json',

      // Domain 4: Validation & Testing (11 scenarios)
      'domain4-dcgmi-diag': '/src/data/scenarios/domain4/dcgmi-diagnostics.json',
      'domain4-nccl-test': '/src/data/scenarios/domain4/nccl-testing.json',
      'domain4-cluster-health': '/src/data/scenarios/domain4/cluster-health.json',
      'domain4-hpl-workflow': '/src/data/scenarios/domain4/hpl-benchmark-workflow.json',
      'domain4-nccl-multinode': '/src/data/scenarios/domain4/nccl-multi-node-optimization.json',
      'domain4-perf-baseline': '/src/data/scenarios/domain4/performance-baseline-establishment.json',
      'domain4-gpu-bandwidth': '/src/data/scenarios/domain4/gpu-bandwidth-validation.json',
      'domain4-ib-stress': '/src/data/scenarios/domain4/infiniband-stress-test.json',
      'domain4-ai-validation': '/src/data/scenarios/domain4/ai-training-validation.json',
      'domain4-ecc-investigation': '/src/data/scenarios/domain4/ecc-error-investigation.json',
      'domain4-gpu-reset': '/src/data/scenarios/domain4/gpu-reset-recovery.json',

      // Domain 5: Troubleshooting (10 scenarios)
      'domain5-xid-errors': '/src/data/scenarios/domain5/xid-error-analysis.json',
      'domain5-thermal': '/src/data/scenarios/domain5/thermal-troubleshooting.json',
      'domain5-xid-triage': '/src/data/scenarios/domain5/xid-error-triage-comprehensive.json',
      'domain5-pcie-diagnosis': '/src/data/scenarios/domain5/pcie-bandwidth-diagnosis.json',
      'domain5-ib-partitioning': '/src/data/scenarios/domain5/infiniband-fabric-partitioning.json',
      'domain5-container-gpu': '/src/data/scenarios/domain5/container-gpu-visibility-debug.json',
      'domain5-memory-leak': '/src/data/scenarios/domain5/memory-leak-detection.json',
      'domain5-driver-mismatch': '/src/data/scenarios/domain5/driver-mismatch-resolution.json',
      'domain5-sel-analysis': '/src/data/scenarios/domain5/sel-log-analysis.json',
      'domain5-critical-xid': '/src/data/scenarios/domain5/critical-xid-response.json',
    };

    const filePath = scenarioFiles[scenarioId];
    if (!filePath) {
      console.error(`Unknown scenario ID: ${scenarioId}`);
      return null;
    }

    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Failed to load scenario: ${response.statusText}`);
      return null;
    }

    const scenario: Scenario = await response.json();
    return scenario;
  } catch (error) {
    console.error('Error loading scenario:', error);
    return null;
  }
}

/**
 * Applies scenario faults to the cluster
 */
export function applyScenarioFaults(faults: FaultInjectionConfig[]): void {
  const store = useSimulationStore.getState();

  faults.forEach(fault => {
    const { nodeId, gpuId, type, parameters } = fault;

    switch (type) {
      case 'xid-error':
        if (gpuId !== undefined) {
          store.addXIDError(nodeId, gpuId, {
            code: parameters?.xid || 79,
            timestamp: new Date(),
            description: parameters?.description || 'GPU error detected',
            severity: 'Critical',
          });
        }
        break;

      case 'thermal':
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            temperature: parameters?.targetTemp || 95,
          });
        }
        break;

      case 'ecc-error':
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            eccErrors: {
              singleBit: parameters?.singleBit || 10,
              doubleBit: parameters?.doubleBit || 1,
              aggregated: {
                singleBit: parameters?.singleBit || 10,
                doubleBit: parameters?.doubleBit || 1,
              },
            },
          });
        }
        break;

      case 'nvlink-failure':
        if (gpuId !== undefined) {
          // NVLink failures are tracked in the nvlinks array, not a single status
          // This would require modifying the nvlinks array to set connection status to 'Down'
          // For now, we'll set healthStatus to Warning as an indicator
          store.updateGPU(nodeId, gpuId, {
            healthStatus: 'Warning',
          });
        }
        break;

      case 'gpu-hang':
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            utilization: 0,
          });
        }
        break;

      case 'power':
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            powerDraw: parameters?.powerDraw || 700,
          });
        }
        break;

      case 'memory-full':
        if (gpuId !== undefined) {
          store.updateGPU(nodeId, gpuId, {
            memoryUsed: parameters?.memoryUsed || 79000,
          });
        }
        break;

      default:
        console.warn(`Unknown fault type: ${type}`);
    }
  });
}

/**
 * Clears all faults and resets cluster to healthy state
 */
export function clearAllFaults(): void {
  const store = useSimulationStore.getState();
  const { cluster } = store;

  cluster.nodes.forEach(node => {
    node.gpus.forEach(gpu => {
      store.updateGPU(node.id, gpu.id, {
        temperature: 45,
        powerDraw: 300,
        utilization: 0,
        memoryUsed: 0,
        healthStatus: 'OK',
        eccErrors: {
          singleBit: 0,
          doubleBit: 0,
          aggregated: {
            singleBit: 0,
            doubleBit: 0,
          },
        },
        xidErrors: [],
      });
    });

    store.updateNodeHealth(node.id, 'OK');
  });
}

/**
 * Loads and initializes a scenario
 */
export async function initializeScenario(scenarioId: string): Promise<boolean> {
  try {
    // Import StateManager
    const { stateManager } = await import('@/store/stateManager');

    // Create snapshot before starting scenario
    stateManager.snapshotBeforeScenario(scenarioId);

    // Load scenario from file
    const scenario = await loadScenarioFromFile(scenarioId);
    if (!scenario) {
      return false;
    }

    // Clear any existing faults
    clearAllFaults();

    // Apply scenario-specific faults
    if (scenario.faults && scenario.faults.length > 0) {
      applyScenarioFaults(scenario.faults);
    }

    // Apply initial cluster state if specified
    if (scenario.initialClusterState) {
      // This would merge the initial state with current cluster
      // For now, we'll just apply faults
    }

    // Load scenario into store
    const store = useSimulationStore.getState();
    store.loadScenario(scenario);

    return true;
  } catch (error) {
    console.error('Error initializing scenario:', error);
    return false;
  }
}

/**
 * Gets all available scenarios grouped by domain (47 total)
 */
export function getAllScenarios(): Record<string, string[]> {
  return {
    domain1: [
      'domain1-hw-inventory',      // NEW: Beginner hardware inventory
      'domain1-server-post',
      'domain1-bmc-config',
      'domain1-driver-install',
      'domain1-gpu-discovery',
      'domain1-driver-troubleshoot',
      'domain1-firmware-verification',
      'domain1-bmc-security',
      'domain1-uefi-validation',
      'domain1-fabric-manager',
      'domain1-driver-rollback',
    ],
    domain2: [
      'domain2-mig-setup',
      'domain2-nvlink-topo',
      'domain2-advanced-mig',
      'domain2-nvlink-recovery',
      'domain2-gpu-power',
      'domain2-bluefield-dpu',
    ],
    domain3: [
      'domain3-slurm-config',
      'domain3-containers',
      'domain3-storage',
      'domain3-slurm-full-setup',
      'domain3-mixed-gpu-gres',
      'domain3-ngc-pipeline',
      'domain3-pyxis-advanced',
      'domain3-lustre-validation',
      'domain3-nfs-tuning',
    ],
    domain4: [
      'domain4-dcgmi-diag',
      'domain4-nccl-test',
      'domain4-cluster-health',
      'domain4-hpl-workflow',
      'domain4-nccl-multinode',
      'domain4-perf-baseline',
      'domain4-gpu-bandwidth',
      'domain4-ib-stress',
      'domain4-ai-validation',
      'domain4-ecc-investigation',  // NEW: ECC error investigation
      'domain4-gpu-reset',          // NEW: GPU reset and recovery
    ],
    domain5: [
      'domain5-xid-errors',
      'domain5-thermal',
      'domain5-xid-triage',
      'domain5-pcie-diagnosis',
      'domain5-ib-partitioning',
      'domain5-container-gpu',
      'domain5-memory-leak',
      'domain5-driver-mismatch',
      'domain5-sel-analysis',       // NEW: SEL log analysis
      'domain5-critical-xid',       // NEW: Critical XID response
    ],
  };
}

/**
 * Gets scenario metadata without loading full content (47 scenarios)
 */
export function getScenarioMetadata(scenarioId: string): { title: string; difficulty: string; estimatedTime: number } | null {
  const metadata: Record<string, { title: string; difficulty: string; estimatedTime: number }> = {
    // Domain 1: Platform Bring-Up (11 scenarios)
    'domain1-hw-inventory': { title: 'Hardware Inventory Validation', difficulty: 'beginner', estimatedTime: 35 },
    'domain1-server-post': { title: 'Server POST and BIOS Verification', difficulty: 'beginner', estimatedTime: 25 },
    'domain1-bmc-config': { title: 'BMC Configuration and Monitoring', difficulty: 'intermediate', estimatedTime: 30 },
    'domain1-driver-install': { title: 'NVIDIA Driver Installation and Validation', difficulty: 'intermediate', estimatedTime: 37 },
    'domain1-gpu-discovery': { title: 'GPU Feature Discovery and Capabilities', difficulty: 'intermediate', estimatedTime: 38 },
    'domain1-driver-troubleshoot': { title: 'GPU Driver Troubleshooting', difficulty: 'intermediate', estimatedTime: 44 },
    'domain1-firmware-verification': { title: 'Firmware Version Verification and Compliance', difficulty: 'intermediate', estimatedTime: 35 },
    'domain1-bmc-security': { title: 'BMC Security Hardening and Access Control', difficulty: 'advanced', estimatedTime: 40 },
    'domain1-uefi-validation': { title: 'UEFI BIOS Settings Validation for DGX', difficulty: 'intermediate', estimatedTime: 30 },
    'domain1-fabric-manager': { title: 'Fabric Manager Configuration and Validation', difficulty: 'advanced', estimatedTime: 45 },
    'domain1-driver-rollback': { title: 'GPU Driver Rollback Procedures', difficulty: 'advanced', estimatedTime: 35 },

    // Domain 2: Accelerator Configuration (6 scenarios)
    'domain2-mig-setup': { title: 'Multi-Instance GPU (MIG) Configuration', difficulty: 'advanced', estimatedTime: 40 },
    'domain2-nvlink-topo': { title: 'NVLink Topology Verification', difficulty: 'intermediate', estimatedTime: 35 },
    'domain2-advanced-mig': { title: 'Advanced MIG Dynamic Reconfiguration', difficulty: 'advanced', estimatedTime: 50 },
    'domain2-nvlink-recovery': { title: 'NVLink Error Detection and Recovery', difficulty: 'advanced', estimatedTime: 45 },
    'domain2-gpu-power': { title: 'GPU Clock and Power Optimization', difficulty: 'intermediate', estimatedTime: 35 },
    'domain2-bluefield-dpu': { title: 'BlueField DPU Configuration and Mode Switching', difficulty: 'advanced', estimatedTime: 55 },

    // Domain 3: Base Infrastructure (9 scenarios)
    'domain3-slurm-config': { title: 'Slurm Workload Manager Configuration', difficulty: 'intermediate', estimatedTime: 40 },
    'domain3-containers': { title: 'GPU-Enabled Container Runtime Setup', difficulty: 'intermediate', estimatedTime: 40 },
    'domain3-storage': { title: 'HPC Storage System Validation', difficulty: 'intermediate', estimatedTime: 35 },
    'domain3-slurm-full-setup': { title: 'Complete Slurm Cluster Configuration', difficulty: 'advanced', estimatedTime: 60 },
    'domain3-mixed-gpu-gres': { title: 'GRES Configuration for Mixed GPU Types', difficulty: 'advanced', estimatedTime: 45 },
    'domain3-ngc-pipeline': { title: 'NGC Container Deployment Pipeline', difficulty: 'intermediate', estimatedTime: 40 },
    'domain3-pyxis-advanced': { title: 'Advanced Pyxis and Enroot Integration', difficulty: 'advanced', estimatedTime: 50 },
    'domain3-lustre-validation': { title: 'Lustre Client Configuration and Validation', difficulty: 'intermediate', estimatedTime: 35 },
    'domain3-nfs-tuning': { title: 'NFS Performance Tuning for GPU Workloads', difficulty: 'intermediate', estimatedTime: 30 },

    // Domain 4: Validation & Testing (11 scenarios)
    'domain4-dcgmi-diag': { title: 'DCGM Diagnostics and Health Monitoring', difficulty: 'intermediate', estimatedTime: 45 },
    'domain4-nccl-test': { title: 'NCCL Communication Testing and Validation', difficulty: 'advanced', estimatedTime: 63 },
    'domain4-cluster-health': { title: 'Comprehensive Cluster Health Validation', difficulty: 'advanced', estimatedTime: 100 },
    'domain4-hpl-workflow': { title: 'HPL Benchmark Workflow and Analysis', difficulty: 'advanced', estimatedTime: 55 },
    'domain4-nccl-multinode': { title: 'Multi-Node NCCL Optimization', difficulty: 'advanced', estimatedTime: 60 },
    'domain4-perf-baseline': { title: 'Establishing Performance Baselines', difficulty: 'intermediate', estimatedTime: 45 },
    'domain4-gpu-bandwidth': { title: 'GPU-to-GPU Bandwidth Validation', difficulty: 'intermediate', estimatedTime: 40 },
    'domain4-ib-stress': { title: 'InfiniBand Fabric Stress Testing', difficulty: 'advanced', estimatedTime: 50 },
    'domain4-ai-validation': { title: 'End-to-End AI Training Validation', difficulty: 'advanced', estimatedTime: 70 },
    'domain4-ecc-investigation': { title: 'ECC Error Investigation and Row Remapping', difficulty: 'advanced', estimatedTime: 50 },
    'domain4-gpu-reset': { title: 'GPU Reset and Recovery Procedures', difficulty: 'intermediate', estimatedTime: 37 },

    // Domain 5: Troubleshooting (10 scenarios)
    'domain5-xid-errors': { title: 'XID Error Analysis and Resolution', difficulty: 'advanced', estimatedTime: 65 },
    'domain5-thermal': { title: 'GPU Thermal Issue Troubleshooting', difficulty: 'intermediate', estimatedTime: 65 },
    'domain5-xid-triage': { title: 'Comprehensive XID Error Triage', difficulty: 'advanced', estimatedTime: 70 },
    'domain5-pcie-diagnosis': { title: 'PCIe Bandwidth Degradation Diagnosis', difficulty: 'advanced', estimatedTime: 50 },
    'domain5-ib-partitioning': { title: 'InfiniBand Fabric Partitioning Issues', difficulty: 'advanced', estimatedTime: 55 },
    'domain5-container-gpu': { title: 'Container GPU Visibility Debugging', difficulty: 'intermediate', estimatedTime: 40 },
    'domain5-memory-leak': { title: 'GPU Memory Leak Detection', difficulty: 'intermediate', estimatedTime: 45 },
    'domain5-driver-mismatch': { title: 'Driver Version Mismatch Resolution', difficulty: 'intermediate', estimatedTime: 35 },
    'domain5-sel-analysis': { title: 'System Event Log (SEL) Analysis', difficulty: 'intermediate', estimatedTime: 40 },
    'domain5-critical-xid': { title: 'Critical XID Error Response (43, 48, 63, 74, 79)', difficulty: 'advanced', estimatedTime: 50 },
  };

  return metadata[scenarioId] || null;
}
