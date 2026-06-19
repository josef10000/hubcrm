import React from 'react';
import { DollarSign, Users, TrendingUp, Award } from 'lucide-react';
import { CreativeEntity } from '../entities/creative.entity';
import { Lead, Client } from '@/types';

interface HubAdsStatsProps {
  creatives: CreativeEntity[];
  leads: Lead[];
  clients: Client[];
}

export function HubAdsStats({ creatives, leads, clients }: HubAdsStatsProps) {
  // Relação de Leads e Clientes por trackingCode do criativo
  const leadsByCreative = React.useMemo(() => {
    const map: Record<string, { leadsCount: number; revenueCount: number }> = {};
    
    // Inicializa o mapa com as informações do criativo
    creatives.forEach(c => {
      map[c.trackingCode] = {
        leadsCount: 0,
        revenueCount: 0
      };
    });

    // Contabiliza Leads reais baseados no leadSource
    leads.forEach(l => {
      if (l.leadSource && map[l.leadSource] !== undefined) {
        map[l.leadSource].leadsCount += 1;
      }
    });

    // Contabiliza Clientes reais/faturamento baseados no leadSource
    clients.forEach(c => {
      if (c.leadSource && map[c.leadSource] !== undefined) {
        // Se houver algum campo de valor contratado ou receita no cliente, somamos.
        // Alguns CRM têm c.estimatedValue ou c.value. Vamos usar fallback
        const clientVal = (c as any).value || (c as any).estimatedValue || 0;
        map[c.leadSource].revenueCount += Number(clientVal);
      }
    });

    return map;
  }, [creatives, leads, clients]);

  // Cálculos consolidados
  const stats = React.useMemo(() => {
    let totalInvested = 0;
    let totalLeads = 0;
    let totalRevenue = 0;
    let bestCreative: CreativeEntity | null = null;
    let bestCreativeRoas = 0;

    creatives.forEach(c => {
      // Investimento é sempre manual do criativo
      totalInvested += c.investment;

      // Leads: se tiver leads reais cadastrados com o trackingCode dele, usa o real. Senão, cai no manual.
      const realLeads = leadsByCreative[c.trackingCode]?.leadsCount || 0;
      const creativeLeads = realLeads > 0 ? realLeads : c.conversions;
      totalLeads += creativeLeads;

      // Receita: se tiver receita real de clientes do leadSource dele, usa a real. Senão, cai na manual.
      const realRevenue = leadsByCreative[c.trackingCode]?.revenueCount || 0;
      const creativeRevenue = realRevenue > 0 ? realRevenue : c.revenue;
      totalRevenue += creativeRevenue;

      // ROAS do criativo
      const creativeRoas = c.investment > 0 ? creativeRevenue / c.investment : 0;
      
      if (c.status === 'active' && creativeRoas > bestCreativeRoas) {
        bestCreativeRoas = creativeRoas;
        bestCreative = c;
      }
    });

    const averageRoas = totalInvested > 0 ? totalRevenue / totalInvested : 0;

    return {
      totalInvested,
      totalLeads,
      averageRoas,
      totalRevenue,
      bestCreative
    };
  }, [creatives, leadsByCreative]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Investido */}
      <div className="bg-[#0b0e14]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all duration-300 group-hover:bg-primary-500/10" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-400">Total Investido</p>
            <h3 className="text-2xl font-bold text-white mt-2 font-mono">
              {formatCurrency(stats.totalInvested)}
            </h3>
          </div>
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">Somatório de investimento em ads</p>
      </div>

      {/* Total de Leads */}
      <div className="bg-[#0b0e14]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all duration-300 group-hover:bg-amber-500/10" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-400">Total de Leads</p>
            <h3 className="text-2xl font-bold text-white mt-2 font-mono">
              {stats.totalLeads}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">Atribuídos via código de rastreamento</p>
      </div>

      {/* ROAS Médio */}
      <div className="bg-[#0b0e14]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all duration-300 group-hover:bg-emerald-500/10" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-400">ROAS Médio</p>
            <h3 className="text-2xl font-bold text-white mt-2 font-mono">
              {stats.averageRoas.toFixed(2)}x
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Retorno sobre investimento</span>
          <span className="text-xs font-semibold text-emerald-400">
            {stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : 'R$ 0,00'}
          </span>
        </div>
      </div>

      {/* Melhor Criativo */}
      <div className="bg-[#0b0e14]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all duration-300 group-hover:bg-purple-500/10" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-400">Melhor Criativo</p>
            <h3 className="text-base font-bold text-white mt-2 line-clamp-1">
              {stats.bestCreative ? stats.bestCreative.title : 'Nenhum ativo'}
            </h3>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          {stats.bestCreative 
            ? `Código: ${stats.bestCreative.trackingCode}` 
            : 'Requer criativos ativos com faturamento'
          }
        </p>
      </div>
    </div>
  );
}
