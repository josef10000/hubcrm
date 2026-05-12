import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { useCRM } from '@crm/contexts/CRMContext';
import { formatCurrency } from '@/helpers';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

export default function CashFlowForecastChart() {
  const { cashflowProjections } = useCRM();

  const data = cashflowProjections.map(p => ({
    name: p.month,
    'Receita Real': p.realizedIncome || 0,
    'Despesa Real': p.realizedExpense || 0,
    'Receita Projetada': p.projectedIncome || 0,
    'Despesa Projetada': p.projectedExpense || 0,
    'Saldo Projetado': (p.projectedIncome || 0) - (p.projectedExpense || 0)
  }));

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary-500" /> Previsão de Fluxo de Caixa
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Análise de runway e projeções para os próximos meses</p>
        </div>
        <div className="flex items-center gap-2 bg-primary-500/10 text-primary-500 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider">
          <Calendar size={14} /> 6 Meses
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                color: '#fff'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend verticalAlign="top" height={36}/>
            
            <Area 
              type="monotone" 
              dataKey="Receita Projetada" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorIncome)" 
            />
            <Area 
              type="monotone" 
              dataKey="Despesa Projetada" 
              stroke="#ef4444" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorExpense)" 
            />
            <ReferenceLine x={currentMonth} stroke="#f59e0b" label={{ value: 'Hoje', fill: '#f59e0b', fontSize: 12 }} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-amber-500 mt-0.5" size={18} />
        <div>
          <h4 className="text-sm font-bold text-amber-500">Alerta de Runway</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Com base na média de despesas atuais e na receita recorrente projetada, seu runway estimado é de <strong>+12 meses</strong>. 
            Mantenha o acompanhamento diário para detectar desvios.
          </p>
        </div>
      </div>
    </div>
  );
}
