import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client } from '@/types';
import { getPlanPrice } from '@/helpers';
import { TrendingUp } from 'lucide-react';

interface CashFlowProjectionProps {
  clients: Client[];
}

export function CashFlowProjection({ clients }: CashFlowProjectionProps) {
  const projectionData = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'Ativo');
    const monthlyMrr = activeClients.reduce((acc, c) => acc + getPlanPrice(c.plan, 'MONTHLY', c), 0);
    const yearlyRevPerMonth = activeClients
      .filter(c => c.billingCycle === 'YEARLY')
      .reduce((acc, c) => acc + getPlanPrice(c.plan, 'MONTHLY', c), 0);

    const today = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const month = addMonths(startOfMonth(today), i);
      // Projeção conservadora: MRR × (1 - taxa de churn estimada de 2%)
      const churnFactor = Math.pow(0.98, i);
      const projected = Math.round((monthlyMrr + yearlyRevPerMonth) * churnFactor);
      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        projetado: projected,
        atual: i === 0 ? projected : 0,
      };
    });
  }, [clients]);

  const totalProjected = projectionData.reduce((acc, d) => acc + d.projetado, 0);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-xl mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-emerald-500/20 rounded-2xl">
          <TrendingUp size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Projeção de Receita (Próximos 3 meses)</h3>
          <p className="text-[11px] text-gray-500">
            Total projetado: R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelStyle={{ color: '#fff', fontWeight: 700 }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Projetado']}
          />
          <Area
            type="monotone"
            dataKey="projetado"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#cashFlowGrad)"
            dot={{ fill: '#10b981', r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
