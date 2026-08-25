import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResolutionData {
  category: string;
  averageTime: number;
  count: number;
}

interface ResolutionBarChartProps {
  data: ResolutionData[];
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#f0fdfa'];

export const ResolutionBarChart: React.FC<ResolutionBarChartProps> = ({ data }) => {
  // Format data for chart and sort by average time
  const chartData = data
    .map(item => ({
      name: item.category,
      hours: item.averageTime,
      days: item.averageTime / 24,
      cases: item.count,
    }))
    .sort((a, b) => b.hours - a.hours);

  const useDays = chartData.some((row) => row.hours >= 24);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-amber-600 text-sm">
            Avg: {useDays ? `${payload[0].payload.days.toFixed(1)} days` : `${Math.round(payload[0].payload.hours)} hours`}
          </p>
          <p className="text-gray-500 text-xs">{payload[0].payload.cases} cases</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={chartData} 
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: useDays ? 'Days' : 'Hours', position: 'insideBottom', offset: -10 }} />
        <YAxis 
          type="category" 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={useDays ? 'days' : 'hours'} radius={[0, 8, 8, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
