import React from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useClients } from '@/hooks/queries/useClients';
import { useTransactions } from '@/hooks/queries/useFinance';
import { Target, TrendingUp, BarChart3, ArrowUpRight } from 'lucide-react';
import { getPlanPrice } from '@/helpers';

export default function ROIAnalysis() {
  const { offers = [], commissions = [] } = useCRM();
  const { data: clientsData } = useClients();
  const clients = clientsData || [];
  const { data: transactionsData } = useTransactions();
  const transactions = transactionsData || [];

  const roiData = (offers || []).map(offer => {
    // 1. Receita direta dessa oferta (MRR atual de clientes ativos)
    const offerClients = (clients || []).filter(c => c.offerId === offer.id && c.status === 'Ativo');
    const revenue = offerClients.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0);
    
    // 2. Comissões pagas/devidas por essa oferta
    const offerCommissions = (commissions || []).filter(comm => 
      offerClients.some(c => c.id === comm.clientId) || comm.offerName === offer.name
    ).reduce((acc, comm) => acc + comm.amount, 0);

    // 3. Investimento em Ads vinculado diretamente a essa oferta
    const adSpend = (transactions || []).filter(t => t.type === 'EXPENSE' && t.clientId === offer.id).reduce((acc, t) => acc + t.amount, 0);

    const totalCost = adSpend + offerCommissions;
    const netProfit = revenue - totalCost;
    const roi = adSpend > 0 ? (netProfit / adSpend) * 100 : 0;
    const cac = offerClients.length > 0 ? adSpend / offerClients.length : 0;

    return {
      offer,
      revenue,
      adSpend,
      offerCommissions,
      totalCost,
      netProfit,
      roi,
      cac,
      clientCount: offerClients.length
    };
  }).filter(d => d.revenue > 0 || d.adSpend > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Investimento Total Ads</h4>
          <p className="text-2xl font-black text-white">
            R$ {(transactions || []).filter(t => t.type === 'EXPENSE' && !!t.clientId).reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Receita Atribuída</h4>
          <p className="text-2xl font-black text-emerald-400">
            R$ {(roiData || []).reduce((acc, d) => acc + d.revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">ROI Médio Ads</h4>
          <p className="text-2xl font-black text-blue-400">
            {(roiData.reduce((acc, d) => acc + d.roi, 0) / (roiData.length || 1)).toFixed(1)}%
          </p>
        </div>
        <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl text-right">
          <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Operações Monitoradas</h4>
          <p className="text-2xl font-black text-primary-500">{roiData.length}</p>
        </div>
      </div>

      <div className="bg-black/40 dark:bg-zinc-950/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <Target className="text-primary-500" /> Performance por Oferta (ROI)
            </h3>
            <p className="text-sm text-gray-500 mt-1">Comparativo de lucratividade real por produto, isolando custos de marketing e comissões.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-xs uppercase tracking-tighter">
                <th className="pb-4 font-bold">Produto / Oferta</th>
                <th className="pb-4 font-bold text-right">Invest. Ads</th>
                <th className="pb-4 font-bold text-right">Receita (MRR)</th>
                <th className="pb-4 font-bold text-right">CAC</th>
                <th className="pb-4 font-bold text-right">Lucro Op.</th>
                <th className="pb-4 font-bold text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {roiData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-500 italic">
                    Nenhum investimento em Ads vinculado a ofertas foi encontrado.
                    <br />
                    <span className="text-xs">Lance uma despesa na categoria "Marketing" e vincule a uma oferta para começar.</span>
                  </td>
                </tr>
              ) : (
                roiData.map(data => (
                  <tr key={data.offer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-6">
                      <div className="font-bold text-white">{data.offer.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-1">
                        <ArrowUpRight size={10} /> {data.clientCount} clientes adquiridos
                      </div>
                    </td>
                    <td className="py-6 text-right font-medium text-orange-400">
                      R$ {data.adSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-6 text-right font-medium text-emerald-400">
                      R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-6 text-right font-medium text-gray-400 text-sm">
                      R$ {data.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-6 text-right font-black ${data.netProfit >= 0 ? 'text-white' : 'text-red-500'}`}>
                      R$ {data.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-6 text-right">
                       <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-lg ${
                         data.roi >= 300 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                         data.roi >= 100 ? 'bg-blue-500 text-white shadow-blue-500/20' : 
                         data.roi > 0 ? 'bg-yellow-500 text-gray-900 shadow-yellow-500/10' : 
                         'bg-red-500 text-white shadow-red-500/20'
                       }`}>
                          {data.roi.toFixed(0)}%
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-primary-500/10 to-blue-500/10 border border-primary-500/20 rounded-3xl p-8 relative overflow-hidden group">
           <BarChart3 className="absolute bottom-[-20px] right-[-20px] text-primary-500/10 group-hover:scale-125 transition-transform duration-1000" size={200} />
           <div className="relative z-10">
              <h3 className="text-xl font-black text-white mb-2">Insight de Escala</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                Ofertas com ROI acima de **300%** têm luz verde para escala imediata de orçamento. 
                Ofertas negativas ou abaixo de **100%** precisam de ajuste no criativo, na oferta ou na LP antes de aumentar o investimento.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
                   <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Melhor ROI</span>
                   <span className="text-emerald-400 font-black text-lg">
                      {roiData.length > 0 ? Math.max(...roiData.map(d => d.roi)).toFixed(0) + '%' : 'N/A'}
                   </span>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
                   <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">CAC Médio</span>
                   <span className="text-white font-black text-lg">
                      R$ {(roiData.reduce((acc, d) => acc + d.cac, 0) / (roiData.length || 1)).toFixed(2)}
                   </span>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
