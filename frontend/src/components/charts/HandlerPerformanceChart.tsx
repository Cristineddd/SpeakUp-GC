import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CODIMemberData {
  codiMemberName: string;
  casesResolved: number;
  casesInProgress: number;
  casesAssigned: number;
}

interface HandlerPerformanceChartProps {
  data: CODIMemberData[];
}

export const HandlerPerformanceChart: React.FC<HandlerPerformanceChartProps> = ({ data }) => {
  // Format data for chart - take top 8 CODI members by total cases
  const chartData = data
    .slice(0, 8)
    .map(codiMember => ({
      name: codiMember.codiMemberName.length > 15 
        ? codiMember.codiMemberName.substring(0, 12) + '...' 
        : codiMember.codiMemberName,
      Resolved: codiMember.casesResolved,
      'In Progress': codiMember.casesInProgress,
      Pending: codiMember.casesAssigned - codiMember.casesResolved - codiMember.casesInProgress,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
          <p className="text-xs text-gray-500 mt-1 pt-1 border-t">Total: {total}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
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
        <Legend 
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="square"
        />
        <Bar dataKey="Resolved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
        <Bar dataKey="In Progress" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Pending" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
