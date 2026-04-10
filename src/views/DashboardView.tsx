import React from 'react';
import { LayoutDashboard, AlignLeft, RefreshCw, ArrowDownAZ, Clock } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useFilteredClients } from '../hooks/useFilteredClients';
import { getPlanPrice } from '../helpers';

import AlertPanels from '../components/dashboard/AlertPanels';
import MetricsGrid from '../components/dashboard/MetricsGrid';
import FinancialCharts from '../components/dashboard/FinancialCharts';
import ClientsGrid from '../components/dashboard/ClientsGrid';

export default function DashboardView() {
  const { user } = useAuth();
  const { 
    clients,
    isChurnRisk,
    isComboNearRenewal,
    userProfile,
    syncPayments,
    isSyncing,
    setEditingClient,
    churnRiskDays
  } = useCRM();

  const {
    currentPage, setCurrentPage, clientsPerPage,
    dashboardMode, setDashboardMode,
    setIsModalOpen,
    filterStatus, setFilterStatus, 
    sortBy, setSortBy,
    searchTerm
  } = useUI();

  const filteredClients = useFilteredClients(clients, searchTerm, filterStatus, sortBy);

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
        
        <AlertPanels 
          overdueClients={overdueClients} 
          comboRenewalClients={comboRenewalClients} 
        />

        <MetricsGrid 
          activeClients={activeClients}
          mrr={mrr}
          overdueAmount={overdueAmount}
          expectedThisMonth={expectedThisMonth}
          role={userProfile?.role}
        />

        {userProfile?.role !== 'Atendimento' && (
          <FinancialCharts 
            statusData={statusData}
            nicheData={nicheData}
            COLORS={COLORS}
          />
        )}

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
            {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') && (
              <button 
                onClick={syncPayments} 
                disabled={isSyncing}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${isSyncing ? 'text-primary-400 bg-gray-100 dark:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:text-white'}`}
                title="Sincronizar pagamentos com Asaas"
              >
                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> 
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
            )}
            {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') && <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>}
            <button onClick={() => setDashboardMode('list')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'list' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><AlignLeft size={16} className="mr-2"/> Lista</button>
            <button onClick={() => setDashboardMode('kanban')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'kanban' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><LayoutDashboard size={16} className="mr-2"/> Kanban</button>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
            <button onClick={() => setSortBy('recent')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'recent' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><Clock size={16} className="mr-2"/> Recentes</button>
            <button onClick={() => setSortBy('alphabetical')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'alphabetical' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><ArrowDownAZ size={16} className="mr-2"/> A-Z</button>
          </div>
        </div>

        <ClientsGrid
          currentClients={currentClients}
          filteredClients={filteredClients}
          dashboardMode={dashboardMode}
          user={user}
          setEditingClient={setEditingClient}
          setIsModalOpen={setIsModalOpen}
          isChurnRisk={isChurnRisk}
          churnRiskDays={churnRiskDays}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && dashboardMode === 'list' && (
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
