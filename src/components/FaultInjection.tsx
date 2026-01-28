import React, { useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { MetricsSimulator } from '@/utils/metricsSimulator';
import { AlertTriangle, Zap, Thermometer, Link2, Cpu, RotateCcw, Ban, Radio, Flame, AlertOctagon } from 'lucide-react';

const metricsSimulator = new MetricsSimulator();

export const FaultInjection: React.FC = () => {
  const { cluster } = useSimulationStore();
  const [selectedNode, setSelectedNode] = useState(cluster.nodes[0]?.id || '');
  const [selectedGPU, setSelectedGPU] = useState(0);
  const [workloadPattern, setWorkloadPattern] = useState<'idle' | 'training' | 'inference' | 'stress'>('idle');

  const handleInjectFault = (faultType: 'xid' | 'ecc' | 'thermal' | 'nvlink' | 'power' | 'pcie') => {
    const node = cluster.nodes.find(n => n.id === selectedNode);
    if (!node) return;

    const gpu = node.gpus[selectedGPU];
    if (!gpu) return;

    const faultedGPU = metricsSimulator.injectFault(gpu, faultType);
    useSimulationStore.getState().updateGPU(selectedNode, selectedGPU, faultedGPU);
  };

  const handleInjectScenario = (scenarioType: 'gpu-hang' | 'bus-reset' | 'thermal-alert' | 'severe-ecc') => {
    const node = cluster.nodes.find(n => n.id === selectedNode);
    if (!node) return;

    const store = useSimulationStore.getState();

    switch (scenarioType) {
      case 'gpu-hang': {
        // XID 43: GPU stopped responding
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          store.addXIDError(selectedNode, selectedGPU, {
            code: 43,
            timestamp: new Date(),
            description: 'GPU has fallen off the bus',
            severity: 'Critical',
          });
          store.updateGPU(selectedNode, selectedGPU, {
            utilization: 0,
            healthStatus: 'Critical',
          });
        }
        break;
      }
      case 'bus-reset': {
        // XID 79: GPU has fallen off the bus
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          store.addXIDError(selectedNode, selectedGPU, {
            code: 79,
            timestamp: new Date(),
            description: 'GPU has fallen off the bus',
            severity: 'Critical',
          });
          store.updateGPU(selectedNode, selectedGPU, {
            healthStatus: 'Critical',
          });
        }
        break;
      }
      case 'thermal-alert': {
        // Multiple GPUs running hot
        node.gpus.forEach(gpu => {
          store.updateGPU(selectedNode, gpu.id, {
            temperature: 90 + Math.random() * 10, // 90-100°C
            healthStatus: 'Warning',
          });
        });
        break;
      }
      case 'severe-ecc': {
        // Uncorrectable ECC errors requiring GPU replacement
        const gpu = node.gpus[selectedGPU];
        if (gpu) {
          store.updateGPU(selectedNode, selectedGPU, {
            eccErrors: {
              singleBit: 1500,
              doubleBit: 50,
              aggregated: {
                singleBit: 1500,
                doubleBit: 50,
              },
            },
            healthStatus: 'Critical',
          });
          store.addXIDError(selectedNode, selectedGPU, {
            code: 63,
            timestamp: new Date(),
            description: 'Uncorrectable ECC error detected - GPU replacement required',
            severity: 'Critical',
          });
        }
        break;
      }
    }
  };

  const handleSimulateWorkload = () => {
    const node = cluster.nodes.find(n => n.id === selectedNode);
    if (!node) return;

    const updatedGPUs = metricsSimulator.simulateWorkload(node.gpus, workloadPattern);
    updatedGPUs.forEach(gpu => {
      useSimulationStore.getState().updateGPU(selectedNode, gpu.id, gpu);
    });
  };

  const handleClearFaults = () => {
    const node = cluster.nodes.find(n => n.id === selectedNode);
    if (!node) return;

    node.gpus.forEach(gpu => {
      useSimulationStore.getState().updateGPU(selectedNode, gpu.id, {
        xidErrors: [],
        healthStatus: 'OK',
        eccErrors: { singleBit: 0, doubleBit: 0, aggregated: { singleBit: 0, doubleBit: 0 } },
        nvlinks: gpu.nvlinks.map(link => ({ ...link, status: 'Active', txErrors: 0, rxErrors: 0 })),
        temperature: 65,
        powerDraw: gpu.powerLimit * 0.3,
        utilization: 5,
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-nvidia-green mb-4">
          Fault Injection Training System
        </h2>
        <p className="text-gray-300 mb-6">
          Inject faults and simulate workloads to practice troubleshooting scenarios.
          This is a safe training environment - all faults are simulated.
        </p>

        {/* Node and GPU Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Node
            </label>
            <select
              value={selectedNode}
              onChange={(e) => {
                setSelectedNode(e.target.value);
                setSelectedGPU(0);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-nvidia-green"
            >
              {cluster.nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.hostname} ({node.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select GPU
            </label>
            <select
              value={selectedGPU}
              onChange={(e) => setSelectedGPU(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-nvidia-green"
            >
              {cluster.nodes.find(n => n.id === selectedNode)?.gpus.map(gpu => (
                <option key={gpu.id} value={gpu.id}>
                  GPU {gpu.id}: {gpu.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fault Injection Buttons */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Basic Fault Injection</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() => handleInjectFault('xid')}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">XID Error</div>
                <div className="text-xs text-gray-400">Critical GPU fault</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectFault('ecc')}
              className="flex items-center gap-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Cpu className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">ECC Error</div>
                <div className="text-xs text-gray-400">Memory error</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectFault('thermal')}
              className="flex items-center gap-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Thermometer className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="font-medium text-yellow-400">Thermal Issue</div>
                <div className="text-xs text-gray-400">High temperature</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectFault('nvlink')}
              className="flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Link2 className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-medium text-purple-400">NVLink Down</div>
                <div className="text-xs text-gray-400">Link degradation</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectFault('power')}
              className="flex items-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Zap className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium text-blue-400">Power Issue</div>
                <div className="text-xs text-gray-400">Power limit exceeded</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectFault('pcie')}
              className="flex items-center gap-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Radio className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-medium text-cyan-400">PCIe Error</div>
                <div className="text-xs text-gray-400">Bus communication fault</div>
              </div>
            </button>

            <button
              onClick={handleClearFaults}
              className="flex items-center gap-3 bg-nvidia-green/10 hover:bg-nvidia-green/20 border border-nvidia-green/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-nvidia-green" />
              <div>
                <div className="font-medium text-nvidia-green">Clear All</div>
                <div className="text-xs text-gray-400">Reset to healthy</div>
              </div>
            </button>
          </div>
        </div>

        {/* Complex Training Scenarios */}
        <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Complex Training Scenarios</h3>
          <p className="text-sm text-gray-400">Realistic multi-symptom failure scenarios for advanced troubleshooting practice.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() => handleInjectScenario('gpu-hang')}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Ban className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">GPU Hang</div>
                <div className="text-xs text-gray-400">XID 43 - GPU stopped responding</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario('bus-reset')}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Radio className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">Bus Reset</div>
                <div className="text-xs text-gray-400">XID 79 - GPU fallen off bus</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario('thermal-alert')}
              className="flex items-center gap-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">Thermal Alert</div>
                <div className="text-xs text-gray-400">All GPUs running hot (90-100°C)</div>
              </div>
            </button>

            <button
              onClick={() => handleInjectScenario('severe-ecc')}
              className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-left transition-colors"
            >
              <AlertOctagon className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">Severe ECC Error</div>
                <div className="text-xs text-gray-400">Uncorrectable - GPU replacement needed</div>
              </div>
            </button>
          </div>
        </div>

        {/* Workload Simulation */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Simulate Workloads</h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={workloadPattern}
              onChange={(e) => setWorkloadPattern(e.target.value as any)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-nvidia-green"
            >
              <option value="idle">Idle (5% utilization)</option>
              <option value="inference">Inference (60% utilization)</option>
              <option value="training">Training (95% utilization)</option>
              <option value="stress">Stress Test (100% utilization)</option>
            </select>

            <button
              onClick={handleSimulateWorkload}
              className="px-6 py-2 bg-nvidia-green hover:bg-nvidia-darkgreen text-black rounded-lg font-medium transition-colors"
            >
              Apply Workload
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-300">
              <strong className="text-nvidia-green">Tip:</strong> After injecting faults, use the Terminal to practice troubleshooting with commands like:
            </div>
            <div className="mt-2 font-mono text-xs space-y-1 text-gray-400">
              <div>• <span className="text-nvidia-green">nvidia-smi</span> - Check GPU status</div>
              <div>• <span className="text-nvidia-green">nvidia-smi -q</span> - Detailed GPU info</div>
              <div>• <span className="text-nvidia-green">nvsm show health</span> - System health summary</div>
              <div>• <span className="text-nvidia-green">dcgmi diag -r 1</span> - Run diagnostics</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
