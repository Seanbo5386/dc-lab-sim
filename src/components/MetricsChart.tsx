/**
 * Metrics Chart Component
 *
 * Displays time-series charts for GPU metrics using Recharts.
 * Shows historical data over a rolling 5-minute window.
 */

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MetricsHistory } from "@/utils/metricsHistory";
import { useSimulationStore } from "@/store/simulationStore";
import {
  Activity,
  Thermometer,
  Zap,
  HardDrive,
  Play,
  BarChart3,
} from "lucide-react";

interface MetricsChartProps {
  nodeId: string;
  gpuId: string;
}

type MetricType = "utilization" | "temperature" | "power" | "memory";

export const MetricsChart: React.FC<MetricsChartProps> = ({
  nodeId,
  gpuId,
}) => {
  const isRunning = useSimulationStore((state) => state.isRunning);
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>("utilization");
  const [hasEverCollected, setHasEverCollected] = useState(false);
  interface ChartDataPoint {
    time: string;
    utilization: number;
    temperature: number;
    power: number;
    memory: number;
  }
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Helper to get metric value from chart data point
  const getMetricValue = (d: ChartDataPoint, key: MetricType): number => {
    return d[key];
  };

  useEffect(() => {
    // Update chart data every second
    const updateChart = () => {
      const history = MetricsHistory.getHistory(nodeId, gpuId);

      if (history.length === 0) {
        setChartData([]);
        return;
      }

      // Mark that we've collected data at least once
      if (!hasEverCollected && history.length > 0) {
        setHasEverCollected(true);
      }

      // Format data for Recharts
      const formatted = history.map((snapshot) => {
        const time = new Date(snapshot.timestamp);
        const timeStr = time.toLocaleTimeString("en-US", {
          hour12: false,
          minute: "2-digit",
          second: "2-digit",
        });

        return {
          time: timeStr,
          timestamp: snapshot.timestamp,
          utilization: snapshot.utilization,
          temperature: snapshot.temperature,
          power: snapshot.powerDraw,
          memory: (snapshot.memoryUsed / snapshot.memoryTotal) * 100,
          memoryGB: snapshot.memoryUsed / 1024,
        };
      });

      setChartData(formatted);
    };

    updateChart();
    const interval = setInterval(updateChart, 1000);

    return () => clearInterval(interval);
  }, [nodeId, gpuId, hasEverCollected]);

  const metricConfigs = {
    utilization: {
      label: "GPU Utilization",
      dataKey: "utilization",
      color: "#3B82F6",
      unit: "%",
      icon: Activity,
      yDomain: [0, 100],
    },
    temperature: {
      label: "Temperature",
      dataKey: "temperature",
      color: "#EF4444",
      unit: "°C",
      icon: Thermometer,
      yDomain: [0, 100],
    },
    power: {
      label: "Power Draw",
      dataKey: "power",
      color: "#10B981",
      unit: "W",
      icon: Zap,
      yDomain: [0, 500],
    },
    memory: {
      label: "Memory Usage",
      dataKey: "memory",
      color: "#8B5CF6",
      unit: "%",
      icon: HardDrive,
      yDomain: [0, 100],
    },
  };

  const config = metricConfigs[selectedMetric];
  const Icon = config.icon;

  // Calculate statistics from recent data - use selectedMetric for type-safe access
  const stats =
    chartData.length > 0
      ? {
          current: getMetricValue(
            chartData[chartData.length - 1],
            selectedMetric,
          ),
          min: Math.min(
            ...chartData.map((d) => getMetricValue(d, selectedMetric)),
          ),
          max: Math.max(
            ...chartData.map((d) => getMetricValue(d, selectedMetric)),
          ),
          avg:
            chartData.reduce(
              (sum, d) => sum + getMetricValue(d, selectedMetric),
              0,
            ) / chartData.length,
        }
      : null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            GPU {gpuId} - Historical Metrics
          </h3>
        </div>

        {stats && (
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current: </span>
              <span className="text-nvidia-green font-medium">
                {stats.current.toFixed(1)}
                {config.unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg: </span>
              <span className="text-gray-300 font-medium">
                {stats.avg.toFixed(1)}
                {config.unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Min/Max: </span>
              <span className="text-gray-300 font-medium">
                {stats.min.toFixed(1)}/{stats.max.toFixed(1)}
                {config.unit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Metric Selector — scrollable when narrow */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(Object.keys(metricConfigs) as MetricType[]).map((metric) => {
          const cfg = metricConfigs[metric];
          const MetricIcon = cfg.icon;
          return (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedMetric === metric
                  ? "bg-nvidia-green text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <MetricIcon className="w-4 h-4 shrink-0" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              domain={config.yDomain}
              label={{
                value: config.unit,
                angle: -90,
                position: "insideLeft",
                style: { fill: "#9CA3AF" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "#E5E7EB" }}
              itemStyle={{ color: config.color }}
              formatter={(value: number) => `${value.toFixed(2)}${config.unit}`}
            />
            <Legend wrapperStyle={{ color: "#9CA3AF" }} iconType="line" />
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              name={config.label}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          {isRunning || hasEverCollected ? (
            // Loading state - simulation is running, waiting for data
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Collecting metrics data...</p>
              <p className="text-sm mt-1">
                Data will appear after a few seconds
              </p>
            </div>
          ) : (
            // Initial state - simulation not started yet
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-300 mb-2">
                No Metrics Data Yet
              </p>
              <p className="text-sm text-gray-500 mb-6 max-w-md">
                Start the simulation to begin collecting real-time GPU metrics
                including utilization, temperature, power draw, and memory
                usage.
              </p>
              <button
                onClick={startSimulation}
                className="inline-flex items-center gap-2 px-6 py-3 bg-nvidia-green text-black font-semibold rounded-lg hover:bg-nvidia-darkgreen transition-colors"
              >
                <Play className="w-5 h-5" />
                Run Simulation
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        Showing last {chartData.length} samples (~
        {Math.floor(chartData.length / 60)} minutes)
      </div>
    </div>
  );
};
