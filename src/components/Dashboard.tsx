import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyData } from '../hooks/useDataTracker';

interface DashboardProps {
  data: DailyData[];
  todayUsage: number;
}

export function Dashboard({ data, todayUsage }: DashboardProps) {
  // Format data for chart
  const chartData = data.slice(-7).map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
    mb: parseFloat(d.mbUsed.toFixed(2))
  }));

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Data Usage History</h2>
        <div className="text-right">
          <p className="text-xs text-neutral-500 font-medium">Today</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{todayUsage.toFixed(2)} MB</p>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="flex-1 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
              <XAxis 
                dataKey="dateLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#888' }} 
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value} MB`, 'Data Used']}
              />
              <Bar dataKey="mb" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[200px] bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">No usage data recorded yet.</p>
        </div>
      )}
    </div>
  );
}
