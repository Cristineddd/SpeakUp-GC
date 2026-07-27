import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export interface TrendDataPoint {
  date: Date;
  count: number;
}

export interface CategoryTrend {
  category: string;
  dataPoints: TrendDataPoint[];
}

interface TrendLineChartProps {
  trends: CategoryTrend[];
  height?: number;
}

export const TREND_CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export function formatTrendCategoryLabel(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getUniqueTimestamps(trends: CategoryTrend[]): number[] {
  return Array.from(
    new Set(trends.flatMap((t) => t.dataPoints.map((dp) => dp.date.getTime())))
  ).sort((a, b) => a - b);
}

export function hasEnoughTrendData(trends: CategoryTrend[]): boolean {
  return getUniqueTimestamps(trends).length >= 2;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ trends, height = 300 }) => {
  const uniqueTimestamps = useMemo(() => getUniqueTimestamps(trends), [trends]);
  const sparseData = uniqueTimestamps.length < 2;

  const chartData = useMemo(() => {
    return uniqueTimestamps.map((timestamp) => {
      const date = new Date(timestamp);
      const dataPoint: Record<string, string | number> = {
        date: format(date, 'MMM dd'),
        timestamp,
      };

      trends.forEach((trend) => {
        const point = trend.dataPoints.find((dp) => dp.date.getTime() === timestamp);
        dataPoint[trend.category] = point?.count ?? 0;
      });

      return dataPoint;
    });
  }, [trends, uniqueTimestamps]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {formatTrendCategoryLabel(String(entry.name))}: {entry.value} cases
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (sparseData) {
    const snapshotDate = uniqueTimestamps[0] ? new Date(uniqueTimestamps[0]) : null;

    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-purple-50">
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            Trend will appear once more data is available
          </p>
          <p className="mt-1 text-xs text-gray-500">
            At least two time periods are needed to draw a trend line.
            {snapshotDate ? ` Current snapshot: ${format(snapshotDate, 'MMM dd, yyyy')}.` : ''}
          </p>
        </div>

        {trends.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {trends.map((trend, index) => {
              const count = trend.dataPoints.reduce((sum, dp) => sum + dp.count, 0);
              const color = TREND_CHART_COLORS[index % TREND_CHART_COLORS.length];

              return (
                <div
                  key={trend.category}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-gray-700">
                    {formatTrendCategoryLabel(trend.category)}
                  </span>
                  <span className="tabular-nums text-gray-500">{count} case{count === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
          iconType="line"
          formatter={(value: string) => formatTrendCategoryLabel(value)}
        />
        {trends.map((trend, index) => (
          <Line
            key={trend.category}
            type="monotone"
            dataKey={trend.category}
            stroke={TREND_CHART_COLORS[index % TREND_CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name={trend.category}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
