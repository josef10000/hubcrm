import React from 'react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, ResponsiveContainer, PieChart, Pie } from 'recharts';

interface FinancialChartsProps {
  statusData: { name: string; value: number; color: string }[];
  nicheData: { name: string; value: number }[];
  COLORS: string[];
}

export default function FinancialCharts({ statusData, nicheData, COLORS }: FinancialChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Clientes por Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px'}} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Nichos</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={nicheData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {nicheData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
