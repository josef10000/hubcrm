import React, { useMemo } from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { getPlanPrice } from '../../helpers';

export default function DREChart() {
  const { 
    transactions = [], 
    clients = [] 
  } = useCRM();
  
  const currentYear = new Date().getFullYear();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Process data for the chart (Income vs Expense per month)
  const chartData = useMemo(() => {
    const data = months.map(m => ({ month: m, income: 0, expense: 0, profit: 0, margin: 0 }));

    (transactions || []).forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== currentYear) return;
      const monthIdx = date.getMonth();
      
      if (t.type === 'INCOME') data[monthIdx].income += t.amount;
      else if (t.type === 'EXPENSE') data[monthIdx].expense += t.amount;
    });

    // Add MRR recurrences if needed, or simply use what's logged in transactions.
    // For DRE, we typically look at actual recognized income (competência).
    // So we'll stick to transactions here.

    // Calculate profit and margin
    data.forEach(d => {
      d.profit = d.income - d.expense;
      d.margin = d.income > 0 ? (d.profit / d.income) * 100 : 0;
    });

    return data;
  }, [transactions, currentYear]);

  // Find max value for scaling the bars dynamically
  const maxVal = Math.max(...chartData.flatMap(d => [d.income, d.expense])) || 1;

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6 mb-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Receitas vs Custos ({currentYear})</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Análise de Margem de Lucro e Evolução Financeira</p>
      </div>

      {/* CSS Grid Chart */}
      <div className="relative h-64 flex items-end gap-2 sm:gap-4 mt-8">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center h-full group relative">
            
            {/* Tooltip on hover */}
            <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 pointer-events-none z-10 w-max text-center shadow-xl">
              <div className="font-bold mb-1">{d.month}</div>
              <div className="text-emerald-400 dark:text-emerald-600">Rec: R$ {d.income.toFixed(2)}</div>
              <div className="text-red-400 dark:text-red-600">Cus: R$ {d.expense.toFixed(2)}</div>
              <div className="text-blue-400 dark:text-blue-600 font-bold mt-1 border-t border-white/20 pt-1">
                Lucro: R$ {d.profit.toFixed(2)} ({d.margin.toFixed(1)}%)
              </div>
            </div>

            {/* Bars container */}
            <div className="flex gap-1 w-full h-full items-end justify-center">
              {/* Income Bar */}
              <div 
                className="w-1/3 max-w-[12px] md:max-w-[20px] bg-emerald-400/80 hover:bg-emerald-400 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max((d.income / maxVal) * 100, 2)}%` }}
              ></div>
              {/* Expense Bar */}
              <div 
                className="w-1/3 max-w-[12px] md:max-w-[20px] bg-red-400/80 hover:bg-red-400 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max((d.expense / maxVal) * 100, 2)}%` }}
              ></div>
            </div>

            {/* X-axis label */}
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium">{d.month}</span>
          </div>
        ))}

        {/* Y-axis horizontal lines (purely visual decoration) */}
        <div className="absolute inset-x-0 bottom-6 border-b border-gray-200 dark:border-white/5 z-[-1]"></div>
        <div className="absolute inset-x-0 bottom-1/2 border-b border-gray-100 dark:border-white/5 border-dashed z-[-1]"></div>
        <div className="absolute inset-x-0 top-0 border-b border-gray-100 dark:border-white/5 border-dashed z-[-1]"></div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6 border-t border-gray-100 dark:border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Custos / Despesas</span>
        </div>
      </div>
    </div>
  );
}
