import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  date: Date;
  count: number;
}

interface CategoryTrend {
  category: string;
  dataPoints: DataPoint[];
}

interface TrendLineChartProps {
  trends: CategoryTrend[];
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ trends }) => {
  // Combine all data points and sort by date
  const allDates = Array.from(
    new Set(
      trends.flatMap(t => t.dataPoints.map(dp => dp.date.getTime()))
    )
  ).sort();

  // Create chart data with all categories
  const chartData = allDates.map(timestamp => {
    const date = new Date(timestamp);
    const dataPoint: any = {
      date: format(date, 'MMM dd'),
      timestamp,
    };

    trends.forEach(trend => {
      const point = trend.dataPoints.find(dp => dp.date.getTime() === timestamp);
      dataPoint[trend.category] = point?.count || 0;
    });

    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} cases
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        {trends.map((trend, index) => (
          <Line
            key={trend.category}
            type="monotone"
            dataKey={trend.category}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={trend.category.charAt(0).toUpperCase() + trend.category.slice(1).replace(/_/g, ' ')}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
