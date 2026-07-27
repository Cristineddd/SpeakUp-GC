import React from 'react';
import type { TrendDataPoint } from './TrendLineChart';

interface MiniTrendSparklineProps {
  dataPoints: TrendDataPoint[];
  color: string;
  width?: number;
  height?: number;
}

export const MiniTrendSparkline: React.FC<MiniTrendSparklineProps> = ({
  dataPoints,
  color,
  width = 72,
  height = 28,
}) => {
  if (dataPoints.length === 0) {
    return <span className="text-xs text-gray-400">No data</span>;
  }

  if (dataPoints.length === 1) {
    return (
      <svg width={width} height={height} aria-hidden className="shrink-0">
        <circle
          cx={width / 2}
          cy={height / 2}
          r={4}
          fill={color}
          opacity={0.85}
        />
      </svg>
    );
  }

  const sorted = [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  const max = Math.max(...sorted.map((dp) => dp.count), 1);
  const padding = 2;

  const points = sorted
    .map((dp, index) => {
      const x =
        padding +
        (index / Math.max(sorted.length - 1, 1)) * (width - padding * 2);
      const y =
        padding +
        (1 - dp.count / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {sorted.map((dp, index) => {
        const x =
          padding +
          (index / Math.max(sorted.length - 1, 1)) * (width - padding * 2);
        const y =
          padding +
          (1 - dp.count / max) * (height - padding * 2);
        return (
          <circle
            key={`${dp.date.getTime()}-${index}`}
            cx={x}
            cy={y}
            r={2}
            fill={color}
          />
        );
      })}
    </svg>
  );
};
