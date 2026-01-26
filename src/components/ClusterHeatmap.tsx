/**
 * Cluster Heatmap Component
 *
 * Displays a heatmap view of all GPUs across the cluster.
 * Useful for quickly identifying hotspots or underutilized resources.
 */

import React, { useState, useMemo } from 'react';
import type { DGXNode, GPU } from '@/types/hardware';
import { Activity, Thermometer, Zap, HardDrive } from 'lucide-react';

interface ClusterHeatmapProps {
  nodes: DGXNode[];
  onGPUClick?: (nodeId: string, gpu: GPU) => void;
}

type MetricType = 'utilization' | 'temperature' | 'power' | 'memory';

interface MetricConfig {
  label: string;
  icon: React.FC<{ className?: string }>;
  getValue: (gpu: GPU) => number;
  getColor: (value: number) => string;
  unit: string;
  ranges: { min: number; max: number };
}

const metricConfigs: Record<MetricType, MetricConfig> = {
  utilization: {
    label: 'Utilization',
    icon: Activity,
    getValue: (gpu) => gpu.utilization,
    getColor: (value) => {
      // Blue (low) -> Green (medium) -> Yellow (high)
      if (value < 25) return '#3B82F6'; // Blue
      if (value < 50) return '#10B981'; // Green
      if (value < 75) return '#76B900'; // NVIDIA Green
      if (value < 90) return '#F59E0B'; // Yellow
      return '#EF4444'; // Red (very high)
    },
    unit: '%',
    ranges: { min: 0, max: 100 },
  },
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    getValue: (gpu) => gpu.temperature,
    getColor: (value) => {
      // Green (cool) -> Yellow (warm) -> Red (hot)
      if (value < 50) return '#10B981'; // Green
      if (value < 65) return '#76B900'; // NVIDIA Green
      if (value < 75) return '#F59E0B'; // Yellow
      if (value < 85) return '#F97316'; // Orange
      return '#EF4444'; // Red
    },
    unit: '°C',
    ranges: { min: 30, max: 100 },
  },
  power: {
    label: 'Power Draw',
    icon: Zap,
    getValue: (gpu) => (gpu.powerDraw / gpu.powerLimit) * 100,
    getColor: (value) => {
      if (value < 25) return '#6B7280'; // Gray (idle)
      if (value < 50) return '#10B981'; // Green
      if (value < 75) return '#76B900'; // NVIDIA Green
      if (value < 90) return '#F59E0B'; // Yellow
      return '#EF4444'; // Red
    },
    unit: '%',
    ranges: { min: 0, max: 100 },
  },
  memory: {
    label: 'Memory Usage',
    icon: HardDrive,
    getValue: (gpu) => (gpu.memoryUsed / gpu.memoryTotal) * 100,
    getColor: (value) => {
      if (value < 25) return '#3B82F6'; // Blue (low)
      if (value < 50) return '#10B981'; // Green
      if (value < 75) return '#76B900'; // NVIDIA Green
      if (value < 90) return '#F59E0B'; // Yellow
      return '#EF4444'; // Red (almost full)
    },
    unit: '%',
    ranges: { min: 0, max: 100 },
  },
};

export const ClusterHeatmap: React.FC<ClusterHeatmapProps> = ({
  nodes,
  onGPUClick,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('utilization');
  const [hoveredGPU, setHoveredGPU] = useState<{ nodeId: string; gpu: GPU } | null>(null);

  const config = metricConfigs[selectedMetric];
  const Icon = config.icon;

  // Calculate cell dimensions based on cluster size
  const cellSize = useMemo(() => {
    const totalGPUs = nodes.reduce((sum, n) => sum + n.gpus.length, 0);
    if (totalGPUs <= 16) return 48;
    if (totalGPUs <= 32) return 40;
    if (totalGPUs <= 64) return 32;
    return 24;
  }, [nodes]);

  // Calculate statistics
  const stats = useMemo(() => {
    const values = nodes.flatMap(n => n.gpus.map(g => config.getValue(g)));
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [nodes, config]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            Cluster Heatmap - {config.label}
          </h3>
        </div>

        {stats && (
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-400">Avg: </span>
              <span className="text-gray-300 font-medium">
                {stats.avg.toFixed(1)}{config.unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Range: </span>
              <span className="text-gray-300 font-medium">
                {stats.min.toFixed(1)} - {stats.max.toFixed(1)}{config.unit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Metric Selector */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(metricConfigs) as MetricType[]).map((metric) => {
          const cfg = metricConfigs[metric];
          const MetricIcon = cfg.icon;
          return (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === metric
                  ? 'bg-nvidia-green text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <MetricIcon className="w-4 h-4" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="space-y-3">
          {nodes.map((node) => (
            <div key={node.id} className="flex items-center gap-3">
              {/* Node label */}
              <div className="w-20 text-sm text-gray-400 truncate" title={node.hostname}>
                {node.id}
              </div>

              {/* GPU cells */}
              <div className="flex gap-1 flex-wrap">
                {node.gpus.map((gpu) => {
                  const value = config.getValue(gpu);
                  const color = config.getColor(value);
                  const isHovered = hoveredGPU?.nodeId === node.id && hoveredGPU?.gpu.id === gpu.id;

                  return (
                    <div
                      key={gpu.id}
                      className="relative cursor-pointer transition-transform hover:scale-110"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: color,
                        borderRadius: 4,
                        border: isHovered ? '2px solid white' : '1px solid rgba(0,0,0,0.2)',
                      }}
                      onClick={() => onGPUClick?.(node.id, gpu)}
                      onMouseEnter={() => setHoveredGPU({ nodeId: node.id, gpu })}
                      onMouseLeave={() => setHoveredGPU(null)}
                      title={`GPU ${gpu.id}: ${value.toFixed(1)}${config.unit}`}
                    >
                      {/* GPU number */}
                      <span
                        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                        style={{ color: value > 50 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)' }}
                      >
                        {gpu.id}
                      </span>

                      {/* Health indicator */}
                      {gpu.healthStatus !== 'OK' && (
                        <span
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-gray-800"
                          style={{
                            backgroundColor: gpu.healthStatus === 'Warning' ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip for hovered GPU */}
      {hoveredGPU && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">
              {hoveredGPU.nodeId} / GPU {hoveredGPU.gpu.id}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: config.getColor(config.getValue(hoveredGPU.gpu)) }}
            >
              {config.getValue(hoveredGPU.gpu).toFixed(1)}{config.unit}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
            <div>
              <span className="text-gray-500">Util:</span>{' '}
              <span className="text-gray-300">{hoveredGPU.gpu.utilization}%</span>
            </div>
            <div>
              <span className="text-gray-500">Temp:</span>{' '}
              <span className="text-gray-300">{hoveredGPU.gpu.temperature}°C</span>
            </div>
            <div>
              <span className="text-gray-500">Power:</span>{' '}
              <span className="text-gray-300">{hoveredGPU.gpu.powerDraw}W</span>
            </div>
            <div>
              <span className="text-gray-500">Mem:</span>{' '}
              <span className="text-gray-300">
                {Math.round(hoveredGPU.gpu.memoryUsed / 1024)}GB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Color Scale Legend */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-gray-400">Low</span>
        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
          {selectedMetric === 'temperature' ? (
            <>
              <div className="flex-1" style={{ backgroundColor: '#10B981' }} />
              <div className="flex-1" style={{ backgroundColor: '#76B900' }} />
              <div className="flex-1" style={{ backgroundColor: '#F59E0B' }} />
              <div className="flex-1" style={{ backgroundColor: '#F97316' }} />
              <div className="flex-1" style={{ backgroundColor: '#EF4444' }} />
            </>
          ) : (
            <>
              <div className="flex-1" style={{ backgroundColor: '#3B82F6' }} />
              <div className="flex-1" style={{ backgroundColor: '#10B981' }} />
              <div className="flex-1" style={{ backgroundColor: '#76B900' }} />
              <div className="flex-1" style={{ backgroundColor: '#F59E0B' }} />
              <div className="flex-1" style={{ backgroundColor: '#EF4444' }} />
            </>
          )}
        </div>
        <span className="text-xs text-gray-400">High</span>
      </div>
    </div>
  );
};

export default ClusterHeatmap;
