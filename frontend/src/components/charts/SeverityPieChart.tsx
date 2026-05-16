import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SeverityData {
  severity: string;
  count: number;
  percentage: number;
}

interface SeverityPieChartProps {
  data: SeverityData[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',      // Green
  medium: '#f59e0b',   // Amber
  high: '#ef4444',     // Red
  critical: '#dc2626', // Dark Red
};

export const SeverityPieChart: React.FC<SeverityPieChartProps> = ({ data }) => {
  // Format data for chart
  const chartData = data.map(item => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: item.count,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-gray-700 text-sm">Cases: {payload[0].value}</p>
          <p className="text-gray-500 text-xs">{payload[0].payload.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => {
            const severity = data[index].severity.toLowerCase();
            const color = SEVERITY_COLORS[severity] || '#6b7280';
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
