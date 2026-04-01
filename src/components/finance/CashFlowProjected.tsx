import React, { useMemo, useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { getPlanPrice } from '../../helpers';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

export default function CashFlowProjected() {
  const { clients, transactions } = useCRM();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [projectionMonths, setProjectionMonths] = useState<number>(3); // 3, 6, 12 meses

  // Projected Cash Flow Logic
  const projectedData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group everything by Month/Year up to projectionMonths
    const monthlyBuckets = Array.from({ length: projectionMonths }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      return {
        label: d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase(),
        month: d.getMonth(),
        year: d.getFullYear(),
        inflow: 0,
        outflow: 0,
        projectedBalance: 0
      };
    });

    // 1. Calculate future OUTFLOWS (Contas a Pagar/Transactions pending)
    transactions.forEach(t => {
      if (t.type === 'EXPENSE' && t.status !== 'PAID') {
        const tDate = new Date(t.date);
        if (tDate >= today) {
          const mIdx = (tDate.getFullYear() - today.getFullYear()) * 12 + (tDate.getMonth() - today.getMonth());
          if (mIdx >= 0 && mIdx < projectionMonths) {
            monthlyBuckets[mIdx].outflow += t.amount;
          }
        }
      }
    });

    // 2. Calculate future INFLOWS (Contas a Receber/Recurring Clients)
    // Here we project what active clients will pay us based on their billing cycles
    const activeClients = clients.filter(c => c.status === 'Ativo' || c.status === 'Inadimplente');
    
    activeClients.forEach(client => {
      const price = getPlanPrice(client.plan, client.billingCycle, client);
      if (price <= 0) return;

      if (client.billingCycle === 'MONTHLY') {
        // Assume payment every month
        monthlyBuckets.forEach(bucket => {
          bucket.inflow += price;
        });
      } else if (client.billingCycle === 'YEARLY' && client.nextDueDate) {
        // Only hits the specific month
        const nextDate = new Date(client.nextDueDate);
        if (nextDate >= today) {
          const mIdx = (nextDate.getFullYear() - today.getFullYear()) * 12 + (nextDate.getMonth() - today.getMonth());
          if (mIdx >= 0 && mIdx < projectionMonths) {
            monthlyBuckets[mIdx].inflow += price;
          }
        }
      }
    });

    // 3. Accumulate projected balance waterfall
    let runningBalance = currentBalance;
    monthlyBuckets.forEach(bucket => {
      const net = bucket.inflow - bucket.outflow;
      runningBalance += net;
      bucket.projectedBalance = runningBalance;
    });

    return monthlyBuckets;
  }, [clients, transactions, currentBalance, projectionMonths]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Fluxo de Caixa Projetado</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Projeção do saldo bancário baseada nos contratos ativos (receitas) e contas a pagar agendadas.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10">
              <span className="text-gray-500 font-medium text-sm">Saldo Inicial (Bancos):</span>
              <input 
                type="number" 
                value={currentBalance}
                onChange={(e) => setCurrentBalance(Number(e.target.value))}
                className="w-24 bg-transparent border-none outline-none text-emerald-500 font-bold p-0 focus:ring-0 text-right"
              />
            </div>
            <select 
              value={projectionMonths} 
              onChange={e => setProjectionMonths(Number(e.target.value))}
              className="bg-gray-100 dark:bg-black/40 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-medium outline-none"
            >
              <option value={3}>Próximos 3 meses</option>
              <option value={6}>Próximos 6 meses</option>
              <option value={12}>Próximos 12 meses</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {projectedData.map((data, index) => (
            <div key={index} className={`p-4 rounded-2xl border ${data.projectedBalance < 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
              <h4 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-3">{data.label}</h4>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1"><TrendingUp size={14} className="text-emerald-500" /> Entradas</span>
                  <span className="font-medium text-emerald-500">+{data.inflow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1"><TrendingDown size={14} className="text-red-400" /> Saídas</span>
                  <span className="font-medium text-red-400">-{data.outflow.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                <span className="text-gray-800 dark:text-gray-300 font-medium text-sm">Saldo Final</span>
                <span className={`font-bold ${data.projectedBalance < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  R$ {data.projectedBalance.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {projectedData.some(d => d.projectedBalance < 0) && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-400 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Alerta de Fluxo de Caixa</h4>
              <p className="text-sm mt-1">O seu saldo projetado fica negativo em algum momento no futuro (ponto de quebra). É recomendado antecipar recebíveis, reduzir custos agendados ou buscar capital de giro antes desse período.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
         {/* Espaço reservado para o Gráfico de Barras Duplo e Linha de Saldo usando Recharts ou Chart.js futuramente */}
         <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock size={40} className="text-gray-300 dark:text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Gráfico de Projeção Interativo</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md">
              A biblioteca gráfica avançada (ex: Recharts) pode ser instalada nesta visão para exibir visualmente a queima de caixa e os "vales" vermelhos do saldo.
            </p>
         </div>
      </div>
    </div>
  );
}
