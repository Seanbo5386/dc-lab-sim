import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { Activity, HardDrive, Thermometer, Zap, AlertTriangle, CheckCircle, XCircle, TrendingUp, Network, Activity as ActivityIcon, ChevronDown } from 'lucide-react';
import type { GPU, HealthStatus } from '@/types/hardware';
import { MetricsChart } from './MetricsChart';
import { TopologyGraph } from './TopologyGraph';
import { InfiniBandMap } from './InfiniBandMap';
import { FabricHealthSummary } from './FabricHealthSummary';
import { MetricsHistory } from '@/utils/metricsHistory';
import { VisualContextPanel } from './VisualContextPanel';
import {
  getVisualizationContext,
  VisualizationContext,
} from '@/utils/scenarioVisualizationMap';

const HealthIndicator: React.FC<{ status: HealthStatus }> = ({ status }) => {
  const config = {
    OK: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Status: OK - System healthy' },
    Warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Status: Warning - Attention needed' },
    Critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Status: Critical - Immediate action required' },
    Unknown: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-500/20', label: 'Status: Unknown' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div
      role="status"
      aria-label={label}
      className={`flex items-center gap-2 px-3 py-1 rounded-full ${bg}`}
    >
      <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${color}`}>
        {status}
      </span>
    </div>
  );
};

const GPUCard: React.FC<{ gpu: GPU; nodeId: string }> = ({ gpu }) => {
  // Temperature status with color AND text alternatives for accessibility (WCAG 1.4.1)
  const getTempStatus = (temp: number) => {
    if (temp > 80) return { color: 'text-red-500', symbol: '✕', label: 'Critical', ariaLabel: `Temperature critical: ${Math.round(temp)} degrees Celsius` };
    if (temp > 70) return { color: 'text-yellow-500', symbol: '⚠', label: 'Warm', ariaLabel: `Temperature warning: ${Math.round(temp)} degrees Celsius` };
    return { color: 'text-green-500', symbol: '✓', label: 'OK', ariaLabel: `Temperature normal: ${Math.round(temp)} degrees Celsius` };
  };
  const tempStatus = getTempStatus(gpu.temperature);
  const memoryPercent = (gpu.memoryUsed / gpu.memoryTotal) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-nvidia-green transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-nvidia-green">GPU {gpu.id}</h3>
          <p className="text-xs text-gray-400">{gpu.name}</p>
        </div>
        <HealthIndicator status={gpu.healthStatus} />
      </div>

      <div className="space-y-2">
        {/* Utilization */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400">
              <Activity className="w-3 h-3" />
              Utilization
            </span>
            <span className="text-nvidia-green font-medium">{Math.round(gpu.utilization)}%</span>
          </div>
          <div className="gpu-bar-container">
            <div
              className="gpu-bar"
              style={{ width: `${gpu.utilization}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400">
              <HardDrive className="w-3 h-3" />
              Memory
            </span>
            <span className="text-nvidia-green font-medium">
              {(gpu.memoryUsed / 1024).toFixed(1)} / {(gpu.memoryTotal / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="gpu-bar-container">
            <div
              className="gpu-bar bg-blue-500"
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
        </div>

        {/* Temperature and Power */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2" role="status" aria-label={tempStatus.ariaLabel}>
            <Thermometer className={`w-4 h-4 ${tempStatus.color}`} aria-hidden="true" />
            <div>
              <div className="text-xs text-gray-400">Temp</div>
              <div className={`text-sm font-medium ${tempStatus.color}`}>
                <span aria-hidden="true">{tempStatus.symbol} </span>
                {Math.round(gpu.temperature)}°C
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <div>
              <div className="text-xs text-gray-400">Power</div>
              <div className="text-sm font-medium text-yellow-500">
                {Math.round(gpu.powerDraw)}W / {gpu.powerLimit}W
              </div>
            </div>
          </div>
        </div>

        {/* MIG Status */}
        {gpu.migMode && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-nvidia-green">
              MIG Enabled: {gpu.migInstances.length} instance(s)
            </div>
          </div>
        )}

        {/* XID Errors */}
        {gpu.xidErrors.length > 0 && (
          <div className="pt-2 border-t border-red-900/50">
            <div className="text-xs text-red-500 font-medium">
              ⚠ {gpu.xidErrors.length} XID Error(s)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NodeSelector: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);
  const selectedNode = useSimulationStore(state => state.selectedNode);
  const selectNode = useSimulationStore(state => state.selectNode);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nodeCount = cluster.nodes.length;
    let newIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (index + 1) % nodeCount;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (index - 1 + nodeCount) % nodeCount;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = nodeCount - 1;
        break;
      default:
        return;
    }

    if (newIndex !== null) {
      const newNode = cluster.nodes[newIndex];
      selectNode(newNode.id);
      buttonRefs.current[newIndex]?.focus();
    }
  }, [cluster.nodes, selectNode]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Node selection"
      className="flex gap-2 overflow-x-auto pb-2"
    >
      {cluster.nodes.map((node, index) => {
        const isSelected = selectedNode === node.id;
        return (
          <button
            key={node.id}
            ref={(el) => { buttonRefs.current[index] = el; }}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => selectNode(node.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              isSelected
                ? 'bg-nvidia-green text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {node.id}
          </button>
        );
      })}
    </div>
  );
};

const ClusterHealthSummary: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);
  const selectNode = useSimulationStore(state => state.selectNode);
  const [alertExpanded, setAlertExpanded] = useState(false);

  const totalNodes = cluster.nodes.length;
  const totalGPUs = cluster.nodes.reduce((sum, node) => sum + node.gpus.length, 0);
  const healthyGPUs = cluster.nodes.reduce(
    (sum, node) => sum + node.gpus.filter(gpu => gpu.healthStatus === 'OK').length,
    0
  );
  const criticalGPUs = cluster.nodes.reduce(
    (sum, node) => sum + node.gpus.filter(gpu => gpu.healthStatus === 'Critical').length,
    0
  );

  // Gather critical GPU details for expandable view
  const criticalGPUDetails = cluster.nodes.flatMap(node =>
    node.gpus
      .filter(gpu => gpu.healthStatus === 'Critical')
      .map(gpu => ({
        nodeId: node.id,
        gpuId: gpu.id,
        gpuName: gpu.name,
        issue: gpu.xidErrors.length > 0
          ? `XID Error ${gpu.xidErrors[0].code}`
          : gpu.temperature > 85
            ? `Overheating (${Math.round(gpu.temperature)}°C)`
            : 'Health Critical'
      }))
  );

  const overallHealth: HealthStatus = criticalGPUs > 0 ? 'Critical' : healthyGPUs < totalGPUs ? 'Warning' : 'OK';

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-nvidia-green">Cluster Health</h2>
        <HealthIndicator status={overallHealth} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-nvidia-green">{totalNodes}/{totalNodes}</div>
          <div className="text-sm text-gray-400">Nodes Online</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-nvidia-green">{healthyGPUs}/{totalGPUs}</div>
          <div className="text-sm text-gray-400">GPUs Healthy</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4" role="status" aria-label="InfiniBand status: Active">
          <div className="text-2xl font-bold text-green-500">
            <span aria-hidden="true">✓ </span>Active
          </div>
          <div className="text-sm text-gray-400">InfiniBand</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4" role="status" aria-label={`BCM HA state: ${cluster.bcmHA.state}`}>
          <div className="text-2xl font-bold text-green-500">
            <span aria-hidden="true">✓ </span>{cluster.bcmHA.state}
          </div>
          <div className="text-sm text-gray-400">BCM HA</div>
        </div>
      </div>

      {criticalGPUs > 0 && (
        <div
          className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors"
          onClick={() => setAlertExpanded(!alertExpanded)}
        >
          <div className="flex items-center justify-between text-sm text-red-400 font-medium">
            <span>⚠ {criticalGPUs} GPU(s) in Critical state - click for details</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${alertExpanded ? 'rotate-180' : ''}`} />
          </div>

          {alertExpanded && (
            <div className="mt-3 space-y-2 border-t border-red-500/30 pt-3">
              {criticalGPUDetails.map((detail, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-red-500/5 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-mono">{detail.nodeId}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-gray-300">GPU {detail.gpuId}</span>
                  </div>
                  <span className="text-red-300">{detail.issue}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNode(detail.nodeId);
                    }}
                    className="text-nvidia-green hover:underline ml-2"
                  >
                    View Node
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type DashboardView = 'overview' | 'metrics' | 'topology' | 'network';

export const Dashboard: React.FC = () => {
  const cluster = useSimulationStore(state => state.cluster);
  const selectedNode = useSimulationStore(state => state.selectedNode);
  const isRunning = useSimulationStore(state => state.isRunning);
  const requestedVisualizationView = useSimulationStore(state => state.requestedVisualizationView);
  const setRequestedVisualizationView = useSimulationStore(state => state.setRequestedVisualizationView);
  const storeActiveScenario = useSimulationStore(state => state.activeScenario);
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [selectedGPU, setSelectedGPU] = useState<string>('GPU0');
  const [activeScenario, setActiveScenario] = useState<VisualizationContext | null>(null);

  // Handler for launching a scenario from the context panel
  const handleLaunchScenario = (scenarioId: string) => {
    const context = getVisualizationContext(scenarioId);
    if (context) {
      setActiveScenario(context);
      // Switch to the appropriate view based on the scenario's primary view
      if (context.primaryView === 'topology' || context.primaryView === 'both') {
        setActiveView('topology');
      } else if (context.primaryView === 'network') {
        setActiveView('network');
      }
    }
  };

  // Listen for visualization view requests from LabWorkspace
  useEffect(() => {
    if (requestedVisualizationView) {
      setActiveView(requestedVisualizationView);
      // Also set the active scenario context if there's an active lab
      if (storeActiveScenario) {
        const context = getVisualizationContext(storeActiveScenario.id);
        if (context) {
          setActiveScenario(context);
        }
      }
      // Clear the request
      setRequestedVisualizationView(null);
    }
  }, [requestedVisualizationView, storeActiveScenario, setRequestedVisualizationView]);

  const currentNode = cluster.nodes.find(n => n.id === selectedNode) || cluster.nodes[0];

  // Start automatic metrics collection only when simulation is running
  useEffect(() => {
    if (isRunning) {
      // Get node from store directly to avoid stale closure
      MetricsHistory.startCollection(() => {
        const state = useSimulationStore.getState();
        const nodeId = state.selectedNode;
        return state.cluster.nodes.find(n => n.id === nodeId) || state.cluster.nodes[0];
      }, 1000);
    } else {
      MetricsHistory.stopCollection();
    }

    return () => {
      MetricsHistory.stopCollection();
    };
  }, [isRunning]); // Only depend on isRunning, not currentNode

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">No nodes available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClusterHealthSummary />

      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Node Selection</h3>
        <NodeSelector />
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: ActivityIcon },
          { id: 'metrics', label: 'Historical Metrics', icon: TrendingUp },
          { id: 'topology', label: 'NVLink Topology', icon: Network },
          { id: 'network', label: 'InfiniBand Fabric', icon: Network },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as DashboardView)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeView === id
                ? 'border-nvidia-green text-nvidia-green'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              {currentNode.id} - GPU Status
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>System: {currentNode.systemType}</span>
              <span>Driver: {currentNode.nvidiaDriverVersion}</span>
              <span>CUDA: {currentNode.cudaVersion}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentNode.gpus.map(gpu => (
              <GPUCard key={gpu.id} gpu={gpu} nodeId={currentNode.id} />
            ))}
          </div>

          {/* Enhanced Node Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Node Details</h3>

            {/* Primary Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Hostname</div>
                <div className="text-nvidia-green font-mono text-xs">{currentNode.hostname}</div>
              </div>
              <div>
                <div className="text-gray-400">System Type</div>
                <div className="text-gray-200">{currentNode.systemType}</div>
              </div>
              <div>
                <div className="text-gray-400">CPU</div>
                <div className="text-gray-200 text-xs">{currentNode.cpuModel.split(' ').slice(0, 4).join(' ')}</div>
              </div>
              <div>
                <div className="text-gray-400">CPU Cores</div>
                <div className="text-gray-200">{currentNode.cpuCount}</div>
              </div>
            </div>

            {/* Secondary Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t border-gray-700">
              <div>
                <div className="text-gray-400">RAM Usage</div>
                <div className="text-gray-200">{currentNode.ramUsed} / {currentNode.ramTotal} GB</div>
                <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(currentNode.ramUsed / currentNode.ramTotal) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-gray-400">Driver Version</div>
                <div className="text-gray-200">{currentNode.nvidiaDriverVersion}</div>
              </div>
              <div>
                <div className="text-gray-400">CUDA Version</div>
                <div className="text-gray-200">{currentNode.cudaVersion}</div>
              </div>
              <div>
                <div className="text-gray-400">OS Version</div>
                <div className="text-gray-200 text-xs">{currentNode.osVersion}</div>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t border-gray-700">
              <div>
                <div className="text-gray-400">Slurm State</div>
                <div
                  role="status"
                  aria-label={`Slurm state: ${currentNode.slurmState}${currentNode.slurmReason ? `, reason: ${currentNode.slurmReason}` : ''}`}
                  className={`font-medium ${
                    currentNode.slurmState === 'idle' ? 'text-green-500' :
                    currentNode.slurmState === 'alloc' ? 'text-blue-500' :
                    currentNode.slurmState === 'drain' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}
                >
                  <span aria-hidden="true">
                    {currentNode.slurmState === 'idle' ? '✓ ' :
                     currentNode.slurmState === 'alloc' ? '● ' :
                     currentNode.slurmState === 'drain' ? '⚠ ' : '✕ '}
                  </span>
                  {currentNode.slurmState}
                  {currentNode.slurmReason && (
                    <span className="text-gray-500 text-xs ml-1">({currentNode.slurmReason})</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-400">InfiniBand HCAs</div>
                <div
                  role="status"
                  aria-label={`InfiniBand HCAs: ${currentNode.hcas?.length || 0} active`}
                  className="text-green-500"
                >
                  <span aria-hidden="true">✓ </span>
                  {currentNode.hcas?.length || 0} Active
                </div>
              </div>
              <div>
                <div className="text-gray-400">NVLink Health</div>
                <div
                  role="status"
                  aria-label={`NVLink health: ${currentNode.gpus.filter(g => g.nvlinks.every(l => l.status === 'Active')).length} of ${currentNode.gpus.length} GPUs OK`}
                  className="text-green-500"
                >
                  <span aria-hidden="true">✓ </span>
                  {currentNode.gpus.filter(g => g.nvlinks.every(l => l.status === 'Active')).length}/{currentNode.gpus.length} GPUs OK
                </div>
              </div>
              <div>
                <div className="text-gray-400">Kernel Version</div>
                <div className="text-gray-200 text-xs">{currentNode.kernelVersion}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Metrics Tab */}
      {activeView === 'metrics' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-400">Select GPU:</label>
            <select
              value={selectedGPU}
              onChange={(e) => setSelectedGPU(e.target.value)}
              className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg border border-gray-600"
            >
              {currentNode.gpus.map(gpu => (
                <option key={gpu.id} value={gpu.id}>
                  GPU {String(gpu.id).replace('GPU', '')} - {gpu.name}
                </option>
              ))}
            </select>
          </div>
          <MetricsChart nodeId={currentNode.id} gpuId={selectedGPU} />
        </div>
      )}

      {/* NVLink Topology Tab */}
      {activeView === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <TopologyGraph
              node={currentNode}
              highlightedGpus={activeScenario?.highlightedGpus}
              highlightedLinks={activeScenario?.highlightedLinks}
            />
          </div>
          <div className="lg:col-span-1">
            <VisualContextPanel
              activeScenario={activeScenario}
              currentView="topology"
              onLaunchScenario={handleLaunchScenario}
            />
          </div>
        </div>
      )}

      {/* InfiniBand Fabric Tab */}
      {activeView === 'network' && (
        <div className="space-y-4">
          {/* Fabric Health Summary - spans full width */}
          <FabricHealthSummary cluster={cluster} />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <InfiniBandMap
                cluster={cluster}
                highlightedNodes={activeScenario?.highlightedNodes}
                highlightedSwitches={activeScenario?.highlightedSwitches}
              />
            </div>
            <div className="lg:col-span-1">
              <VisualContextPanel
                activeScenario={activeScenario}
                currentView="network"
                onLaunchScenario={handleLaunchScenario}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
