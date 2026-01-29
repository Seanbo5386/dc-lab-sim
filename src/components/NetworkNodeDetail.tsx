/**
 * Network Node Detail Panel
 *
 * Displays detailed information about a selected network node (GPU, switch, or host).
 * Used in TopologyGraph and InfiniBandMap for click-to-inspect functionality.
 */

import React from 'react';
import { X, Thermometer, Activity, HardDrive, AlertTriangle, CheckCircle, XCircle, Zap, Cpu } from 'lucide-react';
import type { GPU, InfiniBandHCA, HealthStatus, NVLinkConnection } from '@/types/hardware';

export type NetworkNodeType =
  | { type: 'gpu'; data: GPU }
  | { type: 'nvswitch'; data: {
      id: number;
      connectedGPUs: number[];
      status: 'active' | 'Warning' | 'down';
      throughput: number;
      temperature: number;
    }}
  | { type: 'switch'; data: { id: string; switchType: 'spine' | 'leaf'; status: 'active' | 'down' } }
  | { type: 'host'; data: { id: string; hostname: string; hcas: InfiniBandHCA[]; gpuCount: number } };

interface NetworkNodeDetailProps {
  node: NetworkNodeType;
  onClose: () => void;
  onInjectFault?: (faultType: string) => void;
}

const HealthBadge: React.FC<{ status: HealthStatus | 'active' | 'down' }> = ({ status }) => {
  const config: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    OK: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Healthy' },
    active: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Active' },
    Warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Warning' },
    Critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Critical' },
    down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Down' },
    Unknown: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-500/20', label: 'Unknown' },
  };

  const { icon: Icon, color, bg, label } = config[status] || config.Unknown;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const NVLinkTable: React.FC<{ links: NVLinkConnection[] }> = ({ links }) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-gray-300 mb-2">NVLink Connections</h4>
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-700">
          <th className="py-1 text-left">Link</th>
          <th className="py-1 text-left">Status</th>
          <th className="py-1 text-right">Speed</th>
          <th className="py-1 text-right">TX Err</th>
          <th className="py-1 text-right">RX Err</th>
          <th className="py-1 text-right">Replay</th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr key={link.linkId} className="border-b border-gray-800">
            <td className="py-1">Link {link.linkId}</td>
            <td className="py-1">
              <span className={link.status === 'Active' ? 'text-green-500' : 'text-red-500'}>
                {link.status}
              </span>
            </td>
            <td className="py-1 text-right">{link.speed} GB/s</td>
            <td className={`py-1 text-right ${link.txErrors > 0 ? 'text-red-500' : ''}`}>
              {link.txErrors}
            </td>
            <td className={`py-1 text-right ${link.rxErrors > 0 ? 'text-red-500' : ''}`}>
              {link.rxErrors}
            </td>
            <td className={`py-1 text-right ${link.replayErrors > 0 ? 'text-red-500' : ''}`}>
              {link.replayErrors}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const NetworkNodeDetail: React.FC<NetworkNodeDetailProps> = ({
  node,
  onClose,
  onInjectFault,
}) => {
  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-900 border-2 border-nvidia-green/50 rounded-lg shadow-2xl z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
        <h3 className="text-sm font-semibold text-nvidia-green">
          {node.type === 'gpu' && `GPU ${node.data.id}`}
          {node.type === 'nvswitch' && `NVSwitch ${node.data.id}`}
          {node.type === 'switch' && `${node.data.switchType === 'spine' ? 'Spine' : 'Leaf'} Switch`}
          {node.type === 'host' && node.data.hostname}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        {node.type === 'gpu' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">{node.data.name}</span>
              <HealthBadge status={node.data.healthStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">{node.data.temperature}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-gray-400">Utilization</div>
                  <div className="text-white font-medium">{Math.round(node.data.utilization)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <HardDrive className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-gray-400">Memory</div>
                  <div className="text-white font-medium">
                    {(node.data.memoryUsed / 1024).toFixed(1)} / {(node.data.memoryTotal / 1024).toFixed(1)} GB
                  </div>
                </div>
              </div>
            </div>

            <NVLinkTable links={node.data.nvlinks} />
          </>
        )}

        {node.type === 'switch' && (
          <div className="text-center py-4">
            <HealthBadge status={node.data.status} />
            <p className="text-gray-400 text-xs mt-2">
              {node.data.switchType === 'spine' ? 'Core switch in fabric backbone' : 'Aggregation switch'}
            </p>
          </div>
        )}

        {node.type === 'nvswitch' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">NVSwitch Fabric Component</span>
              <HealthBadge status={node.data.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-gray-400">Temperature</div>
                  <div className="text-white font-medium">{node.data.temperature}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-gray-400">Throughput</div>
                  <div className="text-white font-medium">{node.data.throughput} GB/s</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Connected GPUs</div>
              <div className="flex flex-wrap gap-1">
                {node.data.connectedGPUs.map(gpuId => (
                  <span key={gpuId} className="px-2 py-1 bg-gray-800 rounded text-xs text-nvidia-green">
                    GPU {gpuId}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="text-gray-400">Switch Role</div>
                  <div className="text-white font-medium">High-speed GPU interconnect</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {node.type === 'host' && (
          <>
            <div className="mb-3">
              <HealthBadge status={node.data.hcas.some(h => h.ports.some(p => p.state === 'Active')) ? 'active' : 'down'} />
            </div>
            <div className="text-xs text-gray-400">
              <div>{node.data.gpuCount} GPUs</div>
              <div>{node.data.hcas.length} HCA(s)</div>
            </div>
          </>
        )}

        {/* Fault injection buttons for training scenarios */}
        {onInjectFault && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Training: Inject Fault</div>
            <div className="flex gap-2 flex-wrap">
              {node.type === 'gpu' && (
                <>
                  <button
                    onClick={() => onInjectFault('nvlink-down')}
                    className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                  >
                    NVLink Fail
                  </button>
                  <button
                    onClick={() => onInjectFault('thermal')}
                    className="px-2 py-1 text-xs bg-orange-900/50 text-orange-400 rounded hover:bg-orange-900"
                  >
                    Overheat
                  </button>
                  <button
                    onClick={() => onInjectFault('xid-error')}
                    className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-400 rounded hover:bg-yellow-900"
                  >
                    XID Error
                  </button>
                </>
              )}
              {node.type === 'nvswitch' && (
                <>
                  <button
                    onClick={() => onInjectFault('nvswitch-down')}
                    className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                  >
                    Switch Down
                  </button>
                  <button
                    onClick={() => onInjectFault('nvswitch-thermal')}
                    className="px-2 py-1 text-xs bg-orange-900/50 text-orange-400 rounded hover:bg-orange-900"
                  >
                    Overheat
                  </button>
                </>
              )}
              {(node.type === 'switch' || node.type === 'host') && (
                <button
                  onClick={() => onInjectFault('link-down')}
                  className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                >
                  Link Down
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
