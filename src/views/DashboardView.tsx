import React from 'react';
import { 
  LayoutDashboard, Users, DollarSign, Clock, Phone, Tag, Briefcase, 
  BarChart3, Calendar, Copy, MessageCircle, AlertTriangle, Zap, 
  Link as LinkIcon, AlignLeft, RefreshCw, ArrowDownAZ, Globe
} from 'lucide-react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { useCRM } from '../contexts/CRMContext';
import { getPlanPrice } from '../helpers';
import { toast } from 'sonner';

export default function DashboardView() {
  const {
    user, clients, filteredClients,
    currentPage, setCurrentPage, clientsPerPage,
    view, setView, dashboardMode, setDashboardMode,
    setIsModalOpen, setEditingClient,
    filterStatus, setFilterStatus, sortBy, setSortBy,
    isSyncing, syncPayments,
    churnRiskDays, isChurnRisk, isComboNearRenewal
  } = useCRM();

  const indexOfLastClient = currentPage * clientsPerPage;
  const indexOfFirstClient = indexOfLastClient - clientsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstClient, indexOfLastClient);
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

  // Calculate Metrics
  const activeClients = clients.filter(c => c.status === 'Ativo').length;
  const mrr = clients.filter(c => c.status === 'Ativo' || c.status === 'Inadimplente').reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  const overdueAmount = clients.filter(c => c.status === 'Inadimplente').reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const expectedThisMonth = clients.filter(c => {
    if (c.status === 'Cancelado') return false;
    if (!c.nextDueDate) return true; // Assume it's due if no date
    const dueDate = new Date(c.nextDueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  }).reduce((acc, c) => {
    return acc + getPlanPrice(c.plan, c.billingCycle, c);
  }, 0);

  // Chart Data
  const statusData = [
    { name: 'Em Dev', value: clients.filter(c => c.status === 'Em Desenvolvimento').length, color: '#eab308' },
    { name: 'Ativo', value: clients.filter(c => c.status === 'Ativo').length, color: '#10b981' },
    { name: 'Inadimplente', value: clients.filter(c => c.status === 'Inadimplente').length, color: '#ef4444' },
    { name: 'Cancelado', value: clients.filter(c => c.status === 'Cancelado').length, color: '#6b7280' },
  ];

  const nicheCounts = clients.reduce((acc, c) => {
    const niche = c.niche || 'Outros';
    acc[niche] = (acc[niche] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const nicheData = Object.entries(nicheCounts)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 niches
    
  const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  const overdueClients = clients.filter(c => c.status === 'Inadimplente' || c.paymentStatus === 'OVERDUE');
  const comboRenewalClients = clients.filter(c => isComboNearRenewal(c));

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Overdue Alert Panel */}
        {overdueClients.length > 0 && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Atenção: {overdueClients.length} cliente(s) inadimplente(s)</h3>
                <p className="text-sm text-red-200/80">Verifique a situação e envie um lembrete de cobrança.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {overdueClients.slice(0, 3).map(c => (
                <button 
                  key={c.id} 
                  onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm rounded-lg transition-colors flex items-center"
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
              {overdueClients.length > 3 && (
                <button 
                  onClick={() => { setFilterStatus('Inadimplente'); setView('dashboard'); }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
                >
                  + {overdueClients.length - 3}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Combo Renewal Alert Panel */}
        {comboRenewalClients.length > 0 && (
          <div className="mb-8 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl mr-4 shrink-0">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Renovação de Combo: {comboRenewalClients.length} cliente(s)</h3>
                <p className="text-sm text-purple-200/80">Clientes com plano anual combo vencendo em breve. Entre em contato para renovar.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {comboRenewalClients.slice(0, 3).map(c => (
                <button 
                  key={c.id} 
                  onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm rounded-lg transition-colors flex items-center"
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
              {comboRenewalClients.length > 3 && (
                <button 
                  onClick={() => { setView('dashboard'); }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
                >
                  + {comboRenewalClients.length - 3}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl mr-4">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Clientes Ativos</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeClients}</h3>
            </div>
          </div>
          
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl mr-4">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">MRR (Recorrente)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {mrr.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Inadimplência</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {overdueAmount.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-primary-500/20 text-primary-400 rounded-xl mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">A Receber (Mês)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {expectedThisMonth.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Clientes por Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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

        {/* Quick Filters & Sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-2xl overflow-x-auto max-w-full custom-scrollbar">
            {['Todos', 'Em Desenvolvimento', 'Ativo', 'Inadimplente', 'Cancelado'].map((status) => {
              const count = status === 'Todos' ? clients.length : clients.filter(c => c.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => { setFilterStatus(status as any); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    filterStatus === status 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'
                  }`}
                >
                  {status} <span className="ml-1 opacity-60 text-xs">({count})</span>
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-2xl">
            <button 
              onClick={syncPayments} 
              disabled={isSyncing}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${isSyncing ? 'text-primary-400 bg-gray-100 dark:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:text-white'}`}
              title="Sincronizar pagamentos com Asaas"
            >
              <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> 
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
            <button onClick={() => setDashboardMode('list')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'list' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><AlignLeft size={16} className="mr-2"/> Lista</button>
            <button onClick={() => setDashboardMode('kanban')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'kanban' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><LayoutDashboard size={16} className="mr-2"/> Kanban</button>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
            <button onClick={() => setSortBy('recent')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'recent' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><Clock size={16} className="mr-2"/> Recentes</button>
            <button onClick={() => setSortBy('alphabetical')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'alphabetical' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><ArrowDownAZ size={16} className="mr-2"/> A-Z</button>
          </div>
        </div>

        {dashboardMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentClients.map(client => (
              <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all group relative overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.15)] hover:-translate-y-1 flex flex-col h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4 flex items-center gap-2">
                    {client.name}
                    {isChurnRisk(client) && (
                      <span title={`Fatura atrasada há mais de ${churnRiskDays} dias`} className="animate-pulse bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Risco Churn
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex gap-2">
                      {client.isCombo && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Zap size={10} />
                          Combo
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md ${
                        client.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                        client.status === 'Cancelado' ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' : 
                        client.status === 'Inadimplente' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                        'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                    {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      }`}>
                        {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                    <Phone size={16} className="mr-3 text-primary-400 opacity-80" />
                    {client.whatsapp}
                  </div>
                  
                  <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                    <Tag size={16} className="mr-3 text-primary-400 opacity-80" />
                    Plano {client.plan} <span className="ml-2 text-xs opacity-60">(R$ {getPlanPrice(client.plan, client.billingCycle, client).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  
                  {client.nextDueDate && client.status !== 'Cancelado' && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Calendar size={16} className="mr-3 text-primary-400 opacity-80" />
                      Vencimento: {new Date(client.nextDueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </div>
                  )}

                  {client.isCombo && client.comboRenewalDate && (
                    <div className="flex items-center text-purple-400 text-sm font-medium">
                      <Clock size={16} className="mr-3 opacity-80" />
                      Renovação: {new Date(client.comboRenewalDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  
                  {client.niche && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Briefcase size={16} className="mr-3 text-primary-400 opacity-80 shrink-0" />
                      <span className="truncate">{client.niche}</span>
                    </div>
                  )}
                  
                  {client.siteLink && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Globe size={16} className="mr-3 text-primary-400 opacity-80" />
                      <a href={client.siteLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" onClick={e => e.stopPropagation()}>
                        {client.siteLink}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-2">
                  {client.invoiceUrl && (
                    <div className="flex gap-2">
                      <a 
                        href={client.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-sm font-medium"
                      >
                        <DollarSign size={18} className="mr-2" />
                        Ver Fatura
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(client.invoiceUrl!);
                          toast.success('Link de pagamento copiado!');
                        }}
                        className="flex items-center justify-center px-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                        title="Copiar Link de Pagamento"
                      >
                        <LinkIcon size={18} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 w-full">
                    <a 
                      href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, tudo bem? Aqui é do Hub central.`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/30 transition-colors text-sm font-medium"
                    >
                      <MessageCircle size={18} className="mr-2" />
                      WhatsApp
                    </a>
                    {client.invoiceUrl && (
                      <a 
                        href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, sua fatura de R$ ${getPlanPrice(client.plan, client.billingCycle, client).toFixed(2).replace('.', ',')} vence dia ${client.nextDueDate ? new Date(client.nextDueDate).toLocaleDateString('pt-BR') : ''}. Segue o link para pagamento via PIX: ${client.invoiceUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium"
                        title="Cobrar Fatura"
                      >
                        <AlertTriangle size={18} className="mr-2" />
                        Cobrar
                      </a>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/cliente/${user.uid}/${client.id}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Link do Portal copiado para a área de transferência!');
                    }}
                    className="flex items-center justify-center w-full py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30 transition-colors text-sm font-medium"
                  >
                    <Copy size={18} className="mr-2" />
                    Link do Portal
                  </button>
                </div>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="col-span-full py-16 text-center border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-3xl">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400">Ajuste os filtros ou adicione um novo cliente.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar items-start">
            {['Em Desenvolvimento', 'Ativo', 'Inadimplente', 'Cancelado'].map(status => {
              const columnClients = filteredClients.filter(c => c.status === status);
              return (
                <div key={status} className="min-w-[320px] w-[320px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col max-h-[70vh]">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-gray-900 dark:text-white font-medium">{status}</h3>
                    <span className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{columnClients.length}</span>
                  </div>
                  <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
                    {columnClients.map(client => (
                      <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 p-4 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all group relative">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 flex-wrap">
                          {client.name}
                          {isChurnRisk(client) && (
                            <span title={`Fatura atrasada há mais de ${churnRiskDays} dias`} className="animate-pulse bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                              <AlertTriangle size={8} />
                              Risco
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-2">
                          <Phone size={12} className="mr-2 text-primary-400" />
                          {client.whatsapp}
                        </div>
                        {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          }`}>
                            {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                          </span>
                        )}
                      </div>
                    ))}
                    {columnClients.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === 1 
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:bg-white/20'
              }`}
            >
              Anterior
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center ${
                    currentPage === page 
                      ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/50' 
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === totalPages 
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:bg-white/20'
              }`}
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
