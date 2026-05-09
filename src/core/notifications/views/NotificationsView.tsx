import React, { useState, useMemo } from 'react';
import { Bell, Search, Filter, Info, Mail, LayoutGrid, List, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import ClientNotificationCard from '@crm/components/notifications/ClientNotificationCard';

export default function NotificationsView() {
  const { clients, isSyncing, syncPayments } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.whatsapp.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'Todos' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus && client.status !== 'Cancelado';
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [clients, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = clients.filter(c => c.status !== 'Cancelado').length;
    const asaasOn = clients.filter(c => c.status !== 'Cancelado' && c.asaasNotificationsEnabled).length;
    return { total, asaasOn, asaasOff: total - asaasOn };
  }, [clients]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-primary-500/10 to-transparent border border-primary-500/20 backdrop-blur-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center text-gray-900 shadow-xl shadow-primary-500/20">
              <Bell size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Notificações</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie disparos de e-mail e alertas do Asaas para seus {stats.total} clientes ativos.</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Status Asaas</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{stats.asaasOn}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 pb-1">ON</span>
              <div className="flex-1"></div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-500">✓</div>)}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Modo Manual</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{stats.asaasOff}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 pb-1">OFF</span>
              <div className="flex-1"></div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-rose-500/20 flex items-center justify-center text-[8px] font-bold text-rose-500">!</div>)}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar de Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente para notificação..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder:text-gray-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto custom-scrollbar">
            {['Todos', 'Ativo', 'Inadimplente', 'Em Desenvolvimento'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  statusFilter === status 
                  ? 'bg-primary-500 border-primary-500 text-gray-900' 
                  : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {status.toUpperCase()}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            <button 
              onClick={syncPayments}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              SYNC
            </button>
          </div>
        </div>

        {/* Grid de Cards */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredClients.map(client => (
              <ClientNotificationCard key={client.id} client={client} />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
              <Search size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nenhum cliente encontrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tente ajustar seus filtros ou termo de busca.</p>
            </div>
          </div>
        )}

        {/* Tips Footer */}
        <div className="bg-primary-500/5 border border-primary-500/10 rounded-3xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
            <Info size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Dica de Operação</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              O interruptor <strong>ASAAS ATIVO</strong> controla se o gateway de pagamento envia e-mails automáticos. 
              Para controle total e personalizado, desative o modo automático e utilize os botões de disparo manual acima. 
              Todos os envios manuais ficam registrados no histórico individual do card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
