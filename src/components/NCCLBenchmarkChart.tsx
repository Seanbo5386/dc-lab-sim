/**
 * NCCL Benchmark Chart Component
 *
 * Visualizes NCCL all-reduce bandwidth during benchmark runs.
 * Shows GPU-to-GPU communication performance over time.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Activity, Zap, ArrowUpDown } from 'lucide-react';

interface BenchmarkDataPoint {
  timestamp: number;
  messageSize: string;
  bandwidth: number;
  latency: number;
  gpuPair?: string;
}

interface NCCLBenchmarkChartProps {
  data?: BenchmarkDataPoint[];
  expectedBandwidth?: number; // Expected bandwidth in GB/s
  isRunning?: boolean;
  className?: string;
}

// Simulated benchmark data generator for demo
const generateBenchmarkData = (): BenchmarkDataPoint[] => {
  const messageSizes = ['1B', '4B', '16B', '64B', '256B', '1KB', '4KB', '16KB', '64KB', '256KB', '1MB', '4MB', '16MB', '64MB', '128MB', '256MB'];
  const data: BenchmarkDataPoint[] = [];

  messageSizes.forEach((size, index) => {
    // Bandwidth increases with message size, then plateaus
    const baseValue = Math.min(index * 15, 200) + Math.random() * 20;
    // Peak around 256KB-64MB
    const peakBonus = index >= 10 && index <= 14 ? 50 : 0;
    const bandwidth = baseValue + peakBonus + (Math.random() - 0.5) * 10;

    // Latency decreases as bandwidth increases (inverse relationship at large sizes)
    const latency = Math.max(2, 50 - index * 3 + Math.random() * 5);

    data.push({
      timestamp: Date.now() - (16 - index) * 1000,
      messageSize: size,
      bandwidth: Math.max(0, bandwidth),
      latency,
    });
  });

  return data;
};

export const NCCLBenchmarkChart: React.FC<NCCLBenchmarkChartProps> = ({
  data: externalData,
  expectedBandwidth = 200, // GB/s for NVLink
  isRunning = false,
  className = '',
}) => {
  const [data, setData] = useState<BenchmarkDataPoint[]>(externalData || []);
  const [showLatency, setShowLatency] = useState(false);

  useEffect(() => {
    if (externalData) {
      setData(externalData);
    } else if (isRunning) {
      // Simulate benchmark data
      const interval = setInterval(() => {
        setData(generateBenchmarkData());
      }, 2000);
      return () => clearInterval(interval);
    } else {
      // Generate demo data
      setData(generateBenchmarkData());
    }
  }, [externalData, isRunning]);

  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const bandwidths = data.map(d => d.bandwidth);
    return {
      peak: Math.max(...bandwidths),
      avg: bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length,
      current: bandwidths[bandwidths.length - 1],
    };
  }, [data]);

  // Calculate efficiency
  const efficiency = stats ? (stats.peak / expectedBandwidth * 100) : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            NCCL All-Reduce Bandwidth
          </h3>
          {isRunning && (
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded animate-pulse">
              Running
            </span>
          )}
        </div>

        {stats && (
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-400">Peak: </span>
              <span className="text-nvidia-green font-medium">
                {stats.peak.toFixed(1)} GB/s
              </span>
            </div>
            <div>
              <span className="text-gray-400">Efficiency: </span>
              <span className={`font-medium ${efficiency >= 80 ? 'text-green-400' : efficiency >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {efficiency.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowLatency(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !showLatency
              ? 'bg-nvidia-green text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Zap className="w-4 h-4" />
          Bandwidth
        </button>
        <button
          onClick={() => setShowLatency(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showLatency
              ? 'bg-nvidia-green text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Activity className="w-4 h-4" />
          Latency
        </button>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="messageSize"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={[0, expectedBandwidth * 1.2]}
              label={{
                value: showLatency ? 'Latency (μs)' : 'Bandwidth (GB/s)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#9CA3AF' },
              }}
            />
            {showLatency && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                label={{
                  value: 'Bandwidth (GB/s)',
                  angle: 90,
                  position: 'insideRight',
                  style: { fill: '#9CA3AF' },
                }}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value: number, name: string) => {
                if (name === 'bandwidth') return [`${value.toFixed(2)} GB/s`, 'Bandwidth'];
                if (name === 'latency') return [`${value.toFixed(2)} μs`, 'Latency'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />

            {/* Expected bandwidth reference line */}
            {!showLatency && (
              <ReferenceLine
                yAxisId="left"
                y={expectedBandwidth}
                stroke="#76B900"
                strokeDasharray="5 5"
                label={{
                  value: `Expected: ${expectedBandwidth} GB/s`,
                  position: 'right',
                  fill: '#76B900',
                  fontSize: 11,
                }}
              />
            )}

            {/* Bandwidth area and line */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="bandwidth"
              fill="#3B82F6"
              fillOpacity={0.2}
              stroke="#3B82F6"
              strokeWidth={0}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="bandwidth"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
              name="bandwidth"
              isAnimationActive={false}
            />

            {/* Latency line (optional) */}
            {showLatency && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="latency"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 3 }}
                name="latency"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <ArrowUpDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No benchmark data</p>
            <p className="text-sm mt-1">Run NCCL test to see results</p>
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Peak Bandwidth</div>
          <div className="text-xl font-bold text-blue-400">
            {stats?.peak.toFixed(1) ?? '--'} <span className="text-sm font-normal">GB/s</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Average Bandwidth</div>
          <div className="text-xl font-bold text-gray-300">
            {stats?.avg.toFixed(1) ?? '--'} <span className="text-sm font-normal">GB/s</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Bus Efficiency</div>
          <div className={`text-xl font-bold ${efficiency >= 80 ? 'text-green-400' : efficiency >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {efficiency.toFixed(1)} <span className="text-sm font-normal">%</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Showing NCCL all_reduce bandwidth vs message size. Expected peak: {expectedBandwidth} GB/s (NVLink 4.0)
      </p>
    </div>
  );
};

export default NCCLBenchmarkChart;
