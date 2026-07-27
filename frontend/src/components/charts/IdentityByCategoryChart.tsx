import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface IdentityByCategoryRow {
  categoryLabel: string;
  anonymous: number;
  identified: number;
  total: number;
}

interface IdentityByCategoryChartProps {
  data: IdentityByCategoryRow[];
}

export const IdentityByCategoryChart: React.FC<IdentityByCategoryChartProps> = ({ data }) => {
  const chartData = data.slice(0, 8).map((row) => ({
    name: row.categoryLabel.length > 22 ? `${row.categoryLabel.slice(0, 20)}…` : row.categoryLabel,
    fullName: row.categoryLabel,
    Anonymous: row.anonymous,
    Identified: row.identified,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
        No category breakdown available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const fullName = payload[0]?.payload?.fullName || label;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-gray-900">{fullName}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          angle={-20}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="Anonymous" stackId="identity" fill="#6366f1" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Identified" stackId="identity" fill="#1D9E75" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
