/**
 * Performance Comparison Chart Component
 *
 * Compares actual performance metrics against expected baselines.
 * Useful for identifying underperforming GPUs or system issues.
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { DGXNode } from '@/types/hardware';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceComparisonProps {
  nodes: DGXNode[];
  metricType?: 'bandwidth' | 'compute' | 'memory' | 'power';
  className?: string;
}

interface ExpectedBaselines {
  [key: string]: {
    label: string;
    expected: number;
    unit: string;
    tolerance: number; // Percentage tolerance before flagging
  };
}

const baselines: ExpectedBaselines = {
  bandwidth: {
    label: 'NVLink Bandwidth',
    expected: 600, // GB/s for NVLink 4.0
    unit: 'GB/s',
    tolerance: 10,
  },
  compute: {
    label: 'GPU Compute',
    expected: 100, // % utilization achievable
    unit: '%',
    tolerance: 15,
  },
  memory: {
    label: 'Memory Bandwidth',
    expected: 2039, // GB/s for A100
    unit: 'GB/s',
    tolerance: 10,
  },
  power: {
    label: 'Power Efficiency',
    expected: 400, // Watts at full load
    unit: 'W',
    tolerance: 5,
  },
};

// Simulated performance data generator
const generatePerformanceData = (nodes: DGXNode[], metricType: string) => {
  const baseline = baselines[metricType];
  const data: Array<{
    name: string;
    nodeId: string;
    gpuId: number;
    actual: number;
    expected: number;
    efficiency: number;
    status: 'good' | 'warning' | 'critical';
  }> = [];

  nodes.forEach((node) => {
    node.gpus.forEach((gpu) => {
      // Simulate actual performance with some variance
      let actual: number;
      let expected = baseline.expected;

      switch (metricType) {
        case 'bandwidth': {
          // NVLink bandwidth based on active links
          const activeLinks = gpu.nvlinks.filter(l => l.status === 'Active').length;
          actual = (activeLinks / gpu.nvlinks.length) * baseline.expected * (0.9 + Math.random() * 0.15);
          break;
        }
        case 'compute':
          // Use actual utilization
          actual = gpu.utilization;
          break;
        case 'memory':
          // Memory bandwidth estimate based on usage
          actual = baseline.expected * (0.85 + Math.random() * 0.2);
          if (gpu.healthStatus === 'Warning') actual *= 0.8;
          if (gpu.healthStatus === 'Critical') actual *= 0.5;
          break;
        case 'power':
          actual = gpu.powerDraw;
          expected = gpu.powerLimit;
          break;
        default:
          actual = 0;
      }

      const efficiency = (actual / expected) * 100;
      const deviation = Math.abs(100 - efficiency);

      let status: 'good' | 'warning' | 'critical' = 'good';
      if (metricType === 'power') {
        // For power, being at or below limit is good
        if (actual > expected) status = 'critical';
        else if (actual > expected * 0.95) status = 'warning';
      } else {
        // For other metrics, being below expected is concerning
        if (deviation > baseline.tolerance * 2) status = 'critical';
        else if (deviation > baseline.tolerance) status = 'warning';
      }

      data.push({
        name: `${node.id.replace('dgx-', 'N')}-G${gpu.id}`,
        nodeId: node.id,
        gpuId: gpu.id,
        actual: Math.round(actual * 10) / 10,
        expected,
        efficiency: Math.round(efficiency * 10) / 10,
        status,
      });
    });
  });

  return data;
};

export const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({
  nodes,
  metricType = 'bandwidth',
  className = '',
}) => {
  const baseline = baselines[metricType];
  const data = useMemo(() => generatePerformanceData(nodes, metricType), [nodes, metricType]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const efficiencies = data.map(d => d.efficiency);
    const issues = data.filter(d => d.status !== 'good');
    return {
      avgEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
      minEfficiency: Math.min(...efficiencies),
      maxEfficiency: Math.max(...efficiencies),
      issueCount: issues.length,
      criticalCount: data.filter(d => d.status === 'critical').length,
    };
  }, [data]);

  const getBarColor = (status: string) => {
    switch (status) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#76B900';
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            {baseline.label} - Actual vs Expected
          </h3>
        </div>

        {stats && (
          <div className="flex items-center gap-4">
            {stats.issueCount > 0 ? (
              <div className="flex items-center gap-1 text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.issueCount} issue{stats.issueCount > 1 ? 's' : ''}</span>
                {stats.criticalCount > 0 && (
                  <span className="text-red-400">({stats.criticalCount} critical)</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>All GPUs within tolerance</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Expected</div>
          <div className="text-lg font-bold text-gray-300">
            {baseline.expected} <span className="text-sm font-normal">{baseline.unit}</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Avg Efficiency</div>
          <div className={`text-lg font-bold ${(stats?.avgEfficiency ?? 0) >= 90 ? 'text-green-400' : (stats?.avgEfficiency ?? 0) >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
            {stats?.avgEfficiency.toFixed(1) ?? '--'} <span className="text-sm font-normal">%</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Min Efficiency</div>
          <div className="text-lg font-bold text-gray-300">
            {stats?.minEfficiency.toFixed(1) ?? '--'} <span className="text-sm font-normal">%</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Tolerance</div>
          <div className="text-lg font-bold text-gray-300">
            ±{baseline.tolerance} <span className="text-sm font-normal">%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={[0, 'auto']}
              label={{
                value: baseline.unit,
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#9CA3AF' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value: number, name: string, props: { payload?: { efficiency?: number } }) => {
                if (name === 'actual' && props.payload?.efficiency !== undefined) {
                  return [
                    <span key="value">
                      {value} {baseline.unit} ({props.payload.efficiency}% of expected)
                    </span>,
                    'Actual'
                  ];
                }
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />

            {/* Expected line */}
            <ReferenceLine
              y={baseline.expected}
              stroke="#76B900"
              strokeDasharray="5 5"
              label={{
                value: 'Expected',
                position: 'right',
                fill: '#76B900',
                fontSize: 11,
              }}
            />

            {/* Lower tolerance line */}
            <ReferenceLine
              y={baseline.expected * (1 - baseline.tolerance / 100)}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {/* Actual values bar */}
            <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No performance data available</p>
          </div>
        </div>
      )}

      {/* Issues table */}
      {stats && stats.issueCount > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Performance Issues</h4>
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">GPU</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Actual</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Expected</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Efficiency</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(d => d.status !== 'good').map((item, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="px-3 py-2 text-gray-300">{item.name}</td>
                    <td className="px-3 py-2 text-gray-300">{item.actual} {baseline.unit}</td>
                    <td className="px-3 py-2 text-gray-400">{item.expected} {baseline.unit}</td>
                    <td className="px-3 py-2 text-gray-300">{item.efficiency}%</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'critical'
                          ? 'bg-red-900 text-red-200'
                          : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Comparing actual {baseline.label.toLowerCase()} against expected baseline. Tolerance: ±{baseline.tolerance}%
      </p>
    </div>
  );
};

export default PerformanceComparison;
