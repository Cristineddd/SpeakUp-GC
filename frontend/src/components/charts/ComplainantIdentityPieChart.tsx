import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FILING_IDENTITY_COLORS, type FilingIdentityLabel } from '../../constants/filingIdentity';

interface IdentitySlice {
  label: string;
  count: number;
  percentage: number;
}

interface ComplainantIdentityPieChartProps {
  data: IdentitySlice[];
}

export const ComplainantIdentityPieChart: React.FC<ComplainantIdentityPieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = (['Anonymous', 'Identified'] as FilingIdentityLabel[])
    .map((label) => {
      const row = data.find((item) => item.label === label);
      return {
        name: label,
        value: row?.count ?? 0,
        percentage: row?.percentage ?? 0,
      };
    })
    .filter((item) => item.value > 0);

  if (chartData.length === 0 || total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">
        No filing identity data for this period
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-700">Cases: {payload[0].value}</p>
          <p className="text-xs text-gray-500">{payload[0].payload.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={58}
            dataKey="value"
            paddingAngle={chartData.length > 1 ? 3 : 0}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={FILING_IDENTITY_COLORS[entry.name as FilingIdentityLabel] || '#6b7280'}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="circle"
            formatter={(value: string) => (
              <span className="text-sm text-gray-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">total filings</p>
        </div>
      </div>
    </div>
  );
};
