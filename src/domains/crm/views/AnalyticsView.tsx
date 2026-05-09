import React from 'react';
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { useCRM } from '@crm/contexts/CRMContext';
import { getPlanPrice } from '../helpers';

export default function AnalyticsView() {
  const { clients = [] } = useCRM();

  const totalClients = (clients || []).length;
  const activeClients = (clients || []).filter(c => c.status === 'Ativo').length;
  const activeClientsList = (clients || []).filter(c => c.status === 'Ativo');
  const mrr = activeClientsList.reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  
  const overdueClients = clients.filter(c => c.paymentStatus === 'OVERDUE');
  const overdueAmount = overdueClients.reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  const overdueRate = activeClients > 0 ? ((overdueClients.length / activeClients) * 100).toFixed(1) : '0.0';

  const canceledClientsList = (clients || []).filter(c => c.status === 'Cancelado');
  const canceledClients = canceledClientsList.length;
  const churnRate = totalClients > 0 ? ((canceledClients / totalClients) * 100).toFixed(1) : '0.0';

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth();

  // Novas Métricas Gerenciais
  const ticketMedio = activeClients > 0 ? mrr / activeClients : 0;
  
  const novosClientesMesList = (clients || []).filter(c => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const novosClientesMes = novosClientesMesList.length;
  
  const mrrNovo = novosClientesMesList.filter(c => c.status === 'Ativo').reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0);
  
  // Assumindo cancelamentos do mês baseados em uma data de cancelamento (se não houver, usamos os criados no mês que cancelaram para simplificar, ou apenas 0 se não tivermos a data exata)
  // Para ser mais preciso, precisaríamos de um campo canceledAt. Vamos simular com os que estão cancelados.
  const mrrPerdido = canceledClientsList.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0); // Total histórico perdido
  const mrrLiquido = mrrNovo - mrrPerdido; // Simplificado

  const clientsWithDelivery = (clients || []).filter(c => c.deliveryDate && c.createdAt);
  const tempoMedioEntrega = clientsWithDelivery.length > 0 
    ? clientsWithDelivery.reduce((acc, c) => {
        const start = new Date(c.createdAt).getTime();
        const end = new Date(c.deliveryDate!).getTime();
        return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      }, 0) / clientsWithDelivery.length
    : 0;

  const taxaBriefing = totalClients > 0 ? ((clients || []).filter(c => c.onboardingAnswers && Object.keys(c.onboardingAnswers).length > 0).length / totalClients * 100).toFixed(1) : '0.0';
  const taxaIndicacao = totalClients > 0 ? ((clients || []).filter(c => c.referredBy).length / totalClients * 100).toFixed(1) : '0.0';
  const taxaUpsell = totalClients > 0 ? ((clients || []).filter(c => c.isCombo).length / totalClients * 100).toFixed(1) : '0.0';

  // Cohorts
  const cohortsMap: Record<string, { total: number, retained: number, mrr: number, channels: Record<string, number> }> = {};
  clients.forEach(c => {
    const d = new Date(c.createdAt);
    const cohortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!cohortsMap[cohortKey]) {
      cohortsMap[cohortKey] = { total: 0, retained: 0, mrr: 0, channels: {} };
    }
    cohortsMap[cohortKey].total++;
    if (c.status === 'Ativo') {
      cohortsMap[cohortKey].retained++;
      cohortsMap[cohortKey].mrr += getPlanPrice(c.plan, c.billingCycle, c);
    }
    const source = c.leadSource || 'Desconhecido';
    cohortsMap[cohortKey].channels[source] = (cohortsMap[cohortKey].channels[source] || 0) + 1;
  });
  const cohortsData = Object.entries(cohortsMap).sort((a, b) => a[0].localeCompare(b[0])).map(([key, data]) => {
    const bestChannel = Object.entries(data.channels).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    return {
      mes: key,
      total: data.total,
      retencao: data.total > 0 ? ((data.retained / data.total) * 100).toFixed(1) : '0.0',
      mrr: data.mrr,
      melhorCanal: bestChannel
    };
  });

  // Origem do Lead
  const leadSourcesMap: Record<string, { total: number, mrr: number, overdue: number, canceled: number }> = {};
  clients.forEach(c => {
    const source = c.leadSource || 'Desconhecido';
    if (!leadSourcesMap[source]) {
      leadSourcesMap[source] = { total: 0, mrr: 0, overdue: 0, canceled: 0 };
    }
    leadSourcesMap[source].total++;
    if (c.status === 'Ativo') leadSourcesMap[source].mrr += getPlanPrice(c.plan, c.billingCycle, c);
    if (c.paymentStatus === 'OVERDUE') leadSourcesMap[source].overdue++;
    if (c.status === 'Cancelado') leadSourcesMap[source].canceled++;
  });
  const leadSourcesData = Object.entries(leadSourcesMap).sort((a, b) => b[1].total - a[1].total).map(([source, data]) => ({
    source,
    total: data.total,
    mrr: data.mrr,
    inadimplencia: data.total > 0 ? ((data.overdue / data.total) * 100).toFixed(1) : '0.0',
    cancelamento: data.total > 0 ? ((data.canceled / data.total) * 100).toFixed(1) : '0.0'
  }));
  
  let cash7Days = 0;
  let cash15Days = 0;
  let cash30Days = 0;

  clients.forEach(c => {
    if (c.status === 'Ativo' && c.nextDueDate) {
      // Asaas nextDueDate is YYYY-MM-DD
      const [year, month, day] = c.nextDueDate.split('-');
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let value = getPlanPrice(c.plan, c.billingCycle, c);

      if (diffDays >= 0 && diffDays <= 7) cash7Days += value;
      if (diffDays >= 0 && diffDays <= 15) cash15Days += value;
      if (diffDays >= 0 && diffDays <= 30) cash30Days += value;
    }
  });

  const cashFlowData = [
    { name: '7 dias', value: cash7Days },
    { name: '15 dias', value: cash15Days },
    { name: '30 dias', value: cash30Days },
  ];

  const planCounts: Record<string, number> = {};
  clients.forEach(c => {
    if (c.plan) {
      planCounts[c.plan] = (planCounts[c.plan] || 0) + 1;
    }
  });
  
  const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  const planData = Object.entries(planCounts).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length]
  }));

  const statusData = [
    { name: 'Em Desenvolvimento', value: clients.filter(c => c.status === 'Em Desenvolvimento').length, color: '#eab308' },
    { name: 'Ativo', value: activeClients, color: '#10b981' },
    { name: 'Inadimplente', value: clients.filter(c => c.status === 'Inadimplente').length, color: '#f43f5e' },
    { name: 'Cancelado', value: clients.filter(c => c.status === 'Cancelado').length, color: '#ef4444' }
  ];

  const paymentMethodData = [
    { name: 'PIX', value: clients.filter(c => c.billingType === 'PIX').length, color: '#10b981' },
    { name: 'Cartão', value: clients.filter(c => c.billingType === 'CREDIT_CARD' || !c.billingType).length, color: '#3b82f6' }
  ];

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = clients.filter(c => now - c.createdAt <= oneWeek).length;
  const lastWeekCount = clients.filter(c => (now - c.createdAt > oneWeek) && (now - c.createdAt <= 2 * oneWeek)).length;
  
  let weeklyGrowth = 0;
  if (lastWeekCount > 0) {
    weeklyGrowth = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
  } else if (thisWeekCount > 0) {
    weeklyGrowth = 100;
  }

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const monthlyData = months.map((m, i) => {
    const monthClients = clients.filter(c => {
      const d = new Date(c.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === i;
    });
    
    const mrrUpToThisMonth = activeClientsList.filter(c => {
      const d = new Date(c.createdAt);
      return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() <= i);
    }).reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);

    return { 
      name: m, 
      novos: monthClients.length,
      mrr: i <= currentMonth ? mrrUpToThisMonth : null
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Dashboard Financeiro</h2>
        
        {/* Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total de Clientes</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalClients}</p>
          </div>
          
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Clientes Ativos</p>
            <p className="text-4xl font-bold text-emerald-400">{activeClients}</p>
          </div>
          
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary-500/20 rounded-full blur-3xl"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">MRR (Recorrente)</p>
            <p className="text-4xl font-bold text-primary-400">R$ {mrr.toLocaleString('pt-BR')}</p>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Inadimplência (Atrasados)</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-red-400">R$ {overdueAmount.toLocaleString('pt-BR')}</p>
              <span className="text-sm text-red-400/80 mb-1 font-medium">({overdueRate}%)</span>
            </div>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Churn</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-gray-600 dark:text-gray-300">{churnRate}%</p>
              <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">({canceledClients} cancelados)</span>
            </div>
          </div>
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Crescimento do MRR ({currentYear})</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData.filter(d => d.mrr !== null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'MRR']}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Aquisição de Clientes ({currentYear})</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value: number) => [value, 'Novos Clientes']}
                  />
                  <Bar dataKey="novos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Projeção de Caixa</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita Prevista']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Distribuição por Plano</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {planData.map(plan => (
                <div key={plan.name} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: plan.color }}></div>
                  {plan.name} ({plan.value})
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status dos Clientes</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Formas de Pagamento</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodData.map(method => (
                <div key={method.name} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: method.color }}></div>
                  {method.name} ({method.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visão Gerencial */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-12">Visão Gerencial</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Ticket Médio</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Novos Clientes (Mês)</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-emerald-400">{novosClientesMes}</p>
              <span className="text-sm text-emerald-400/80 mb-1 font-medium">(+ R$ {mrrNovo.toLocaleString('pt-BR')})</span>
            </div>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Cancelamentos (Total)</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-red-400">{canceledClients}</p>
              <span className="text-sm text-red-400/80 mb-1 font-medium">(- R$ {mrrPerdido.toLocaleString('pt-BR')})</span>
            </div>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">MRR Líquido (Mês)</p>
            <p className={`text-3xl font-bold ${mrrLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {mrrLiquido >= 0 ? '+' : '-'} R$ {Math.abs(mrrLiquido).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Tempo Médio de Entrega</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{tempoMedioEntrega.toFixed(1)} dias</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Briefing Concluído</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaBriefing}%</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Indicação</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaIndicacao}%</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Upsell por Cliente (Combo)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaUpsell}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cohorts */}
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Análise de Cohort (Turmas)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-white/10">
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Mês de Entrada</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Retenção</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">MRR Gerado</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Melhor Canal</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortsData.map((cohort, idx) => (
                    <tr key={idx} className="border-b border-gray-300/50 dark:border-white/5 last:border-0">
                      <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{cohort.mes}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.total}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.retencao}%</td>
                      <td className="py-3 text-sm text-emerald-600 dark:text-emerald-400">R$ {cohort.mrr.toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.melhorCanal}</td>
                    </tr>
                  ))}
                  {cohortsData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Nenhum dado de cohort disponível.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Origem do Lead */}
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Origem do Lead / Canais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-white/10">
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Canal</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Clientes</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">MRR</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Inadimplência</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Cancelamento</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSourcesData.map((source, idx) => (
                    <tr key={idx} className="border-b border-gray-300/50 dark:border-white/5 last:border-0">
                      <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{source.source}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{source.total}</td>
                      <td className="py-3 text-sm text-emerald-600 dark:text-emerald-400">R$ {source.mrr.toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-sm text-red-600 dark:text-red-400">{source.inadimplencia}%</td>
                      <td className="py-3 text-sm text-red-600 dark:text-red-400">{source.cancelamento}%</td>
                    </tr>
                  ))}
                  {leadSourcesData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Nenhum dado de origem disponível.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Previsão de Caixa */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-12">Previsão de Caixa (Forecast)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Receita Prevista (30 dias)</p>
            <p className="text-3xl font-bold text-primary-400">R$ {cash30Days.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Receita Próxima (7 dias)</p>
            <p className="text-3xl font-bold text-emerald-400">R$ {cash7Days.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Cobranças em Risco</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-red-400">R$ {overdueAmount.toLocaleString('pt-BR')}</p>
              <span className="text-sm text-red-400/80 mb-1 font-medium">({overdueClients.length} clientes)</span>
            </div>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Impacto de Cancelamentos</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-red-400">R$ {mrrPerdido.toLocaleString('pt-BR')}</p>
              <span className="text-sm text-red-400/80 mb-1 font-medium">({canceledClients} clientes)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
