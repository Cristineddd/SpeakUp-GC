import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface CategoryBarChartProps {
  data: CategoryData[];
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  // Format data for chart
  const chartData = data.map(item => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1).replace(/_/g, ' '),
    cases: item.count,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-green-600 text-sm">Cases: {payload[0].value}</p>
          <p className="text-gray-500 text-xs">{payload[0].payload.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="cases" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
