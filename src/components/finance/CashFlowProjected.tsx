import React, { useMemo, useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { getPlanPrice } from '../../helpers';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

export default function CashFlowProjected() {
  const { clients, transactions, offers } = useCRM();
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

      const offer = offers.find(o => o.id === client.offerId || o.name === client.plan);
      const commValue = offer?.commissionValue || 0;

      if (client.billingCycle === 'MONTHLY') {
        // Assume payment every month
        monthlyBuckets.forEach(bucket => {
          bucket.inflow += price;
          // Project commission outflow if applicable
          if (commValue > 0) bucket.outflow += commValue;
        });
      } else if (client.billingCycle === 'YEARLY' && client.nextDueDate) {
        // Only hits the specific month
        const nextDate = new Date(client.nextDueDate);
        if (nextDate >= today) {
          const mIdx = (nextDate.getFullYear() - today.getFullYear()) * 12 + (nextDate.getMonth() - today.getMonth());
          if (mIdx >= 0 && mIdx < projectionMonths) {
            monthlyBuckets[mIdx].inflow += price;
            if (commValue > 0) monthlyBuckets[mIdx].outflow += commValue;
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

        {/* Investment Margin Indicator */}
        <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
            <TrendingUp size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <h4 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
              <TrendingUp size={18} /> Capacidade de Investimento Segura (Ads)
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Baseado no lucro líquido projetado (MRR - Custos - Comissões), esta é a margem recomendada para investir no funil de leads.
            </p>
            
            <div className="flex flex-wrap gap-6">
              {projectedData.slice(0, 3).map((data, i) => {
                const profit = data.inflow - data.outflow;
                const safeMargin = profit > 0 ? profit * 0.4 : 0; // 40% safety margin for ads
                return (
                  <div key={i} className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{data.label}</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">R$ {safeMargin.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  </div>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <div className="text-right">
                  <span className="block text-[10px] text-emerald-500 font-bold uppercase">ROI Alvo Funil R$ 97</span>
                  <span className="text-sm font-medium text-gray-500">Mínimo 3.5x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
         <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Gráfico de Projeção Interativo</h3>
         <div className="relative h-64 flex items-end justify-between gap-2 overflow-x-auto pb-6 mt-8">
            {projectedData.length > 0 && (() => {
               // Find max value to scale the chart (comparing both absolute amounts)
               const maxAbsValue = Math.max(...projectedData.map(d => Math.max(d.inflow, d.outflow, Math.abs(d.projectedBalance))));
               // Avoid division by zero
               const scale = maxAbsValue === 0 ? 1 : maxAbsValue;

               return projectedData.map((data, index) => {
                 const inflowH = (data.inflow / scale) * 100;
                 const outflowH = (data.outflow / scale) * 100;
                 
                 // Linha do saldo pode ser negativa, vamos colocá-la num sistema de balão suspenso ou ponto
                 // Para saldo projetado, vamos fazer um mini-badge "flutuando" acima das barras
                 const balancePos = (Math.abs(data.projectedBalance) / scale) * 100;

                 return (
                   <div key={index} className="flex flex-col items-center justify-end w-full min-w-[60px] group relative h-full">
                     {/* Tooltip Hover */}
                     <div className="absolute top-[-40px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 pointer-events-none shadow-xl border border-white/10">
                       <p className="font-bold border-b border-white/20 pb-1 mb-1">{data.label}</p>
                       <p className="text-emerald-400">Entradas: R$ {data.inflow.toFixed(2)}</p>
                       <p className="text-red-400">Saídas: R$ {data.outflow.toFixed(2)}</p>
                       <p className={`font-bold mt-1 ${data.projectedBalance < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                         Saldo Final: R$ {data.projectedBalance.toFixed(2)}
                       </p>
                     </div>

                     {/* Floating Balance Point */}
                     <div 
                        className={`absolute w-3 h-3 rounded-full shadow-lg z-10 transition-all duration-700 ${data.projectedBalance < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ bottom: `${Math.min(balancePos, 100)}%`, marginBottom: '16px' }}
                     >
                        {/* Connecting line to previous point visually difficult to do pure HTML without SVG, so we just use points */}
                        <div className={`absolute left-4 opacity-0 group-hover:opacity-100 text-[10px] font-bold px-1 rounded -translate-y-1/2 ${data.projectedBalance < 0 ? 'text-red-500 bg-red-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                          R$ {data.projectedBalance.toFixed(0)}
                        </div>
                     </div>

                     {/* Bar Container */}
                     <div className="flex items-end justify-center w-full gap-1 h-full z-0 px-1">
                        {/* Inflow Bar */}
                        <div 
                          className="w-1/2 bg-emerald-500/80 hover:bg-emerald-400 rounded-t-sm transition-all duration-700" 
                          style={{ height: `${inflowH}%` }}
                        />
                        {/* Outflow Bar */}
                        <div 
                          className="w-1/2 bg-red-400/80 hover:bg-red-400 rounded-t-sm transition-all duration-700" 
                          style={{ height: `${outflowH}%` }}
                        />
                     </div>
                     
                     <div className="absolute -bottom-6 text-xs text-center text-gray-500 dark:text-gray-400 w-full truncate">
                       {data.label}
                     </div>
                   </div>
                 );
               });
            })()}
         </div>
         <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5 pt-4">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-sm bg-emerald-500/80"></div> Receitas Previstas
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-sm bg-red-400/80"></div> Despesas Agendadas
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-blue-500"></div> Saldo Projetado
           </div>
         </div>
      </div>
    </div>
  );
}
