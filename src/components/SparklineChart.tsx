/**
 * Sparkline Chart Component
 *
 * Compact inline charts for displaying metrics trends in GPU cards.
 * Uses SVG for lightweight rendering without full Recharts overhead.
 */

import React, { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  showRange?: boolean;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 80,
  height = 24,
  color = '#76B900',
  fill = true,
  showRange = false,
  className = '',
}) => {
  const { path, fillPath, min, max, current } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', fillPath: '', min: 0, max: 0, current: 0 };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;
      return { x, y };
    });

    // Create line path
    const linePath = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    // Create fill path (area under curve)
    const areaPath = linePath +
      ` L ${(padding + chartWidth).toFixed(1)} ${(padding + chartHeight).toFixed(1)}` +
      ` L ${padding} ${(padding + chartHeight).toFixed(1)} Z`;

    return {
      path: linePath,
      fillPath: areaPath,
      min: minVal,
      max: maxVal,
      current: data[data.length - 1],
    };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 text-xs ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Fill area */}
        {fill && (
          <path
            d={fillPath}
            fill={color}
            fillOpacity={0.2}
          />
        )}
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current value dot */}
        <circle
          cx={width - 2}
          cy={2 + (height - 4) - ((current - min) / (max - min || 1)) * (height - 4)}
          r={2}
          fill={color}
        />
      </svg>
      {showRange && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">{min.toFixed(0)}</span>
          -
          <span className="text-gray-300">{max.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Multi-line sparkline for comparing metrics
 */
interface MultiSparklineProps {
  datasets: {
    data: number[];
    color: string;
    label: string;
  }[];
  width?: number;
  height?: number;
  className?: string;
}

export const MultiSparkline: React.FC<MultiSparklineProps> = ({
  datasets,
  width = 120,
  height = 32,
  className = '',
}) => {
  const paths = useMemo(() => {
    // Find global min/max across all datasets
    const allValues = datasets.flatMap(d => d.data);
    if (allValues.length === 0) return [];

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    return datasets.map(dataset => {
      if (dataset.data.length < 2) return { path: '', color: dataset.color, label: dataset.label };

      const points = dataset.data.map((value, index) => {
        const x = padding + (index / (dataset.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;
        return { x, y };
      });

      const path = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      ).join(' ');

      return { path, color: dataset.color, label: dataset.label };
    });
  }, [datasets, width, height]);

  if (paths.length === 0 || paths.every(p => !p.path)) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 text-xs ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      {paths.map((p, i) => p.path && (
        <path
          key={i}
          d={p.path}
          fill="none"
          stroke={p.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      ))}
    </svg>
  );
};

/**
 * Sparkline with threshold indicator
 */
interface ThresholdSparklineProps {
  data: number[];
  threshold: number;
  width?: number;
  height?: number;
  normalColor?: string;
  warningColor?: string;
  className?: string;
}

export const ThresholdSparkline: React.FC<ThresholdSparklineProps> = ({
  data,
  threshold,
  width = 80,
  height = 24,
  normalColor = '#76B900',
  warningColor = '#EF4444',
  className = '',
}) => {
  const { segments, min, max } = useMemo(() => {
    if (data.length < 2) {
      return { segments: [], min: 0, max: 0 };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Create segments based on threshold crossings
    const segments: { path: string; color: string }[] = [];
    let currentSegment: { x: number; y: number }[] = [];
    let currentColor = data[0] >= threshold ? warningColor : normalColor;

    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;
      const isAbove = value >= threshold;
      const color = isAbove ? warningColor : normalColor;

      if (color !== currentColor && currentSegment.length > 0) {
        // Save current segment and start new one
        const path = currentSegment.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        ).join(' ');
        segments.push({ path, color: currentColor });
        currentSegment = [{ x, y }];
        currentColor = color;
      } else {
        currentSegment.push({ x, y });
      }
    });

    // Add final segment
    if (currentSegment.length > 0) {
      const path = currentSegment.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      ).join(' ');
      segments.push({ path, color: currentColor });
    }

    return { segments, min: minVal, max: maxVal };
  }, [data, threshold, width, height, normalColor, warningColor]);

  if (data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 text-xs ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  // Calculate threshold line position
  const thresholdY = 2 + (height - 4) - ((threshold - min) / (max - min || 1)) * (height - 4);

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      {/* Threshold line */}
      <line
        x1={2}
        y1={thresholdY}
        x2={width - 2}
        y2={thresholdY}
        stroke={warningColor}
        strokeWidth={1}
        strokeDasharray="2,2"
        opacity={0.5}
      />
      {/* Data segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={seg.path}
          fill="none"
          stroke={seg.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

export default SparklineChart;
