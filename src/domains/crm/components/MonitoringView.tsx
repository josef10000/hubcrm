import React, { useState, useEffect } from 'react';
import { Globe, CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink, Activity } from 'lucide-react';
import { Client } from '@/types';
import { toast } from 'sonner';

interface UptimeMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  sub_type: string;
  keyword_type: number;
  keyword_value: string;
  http_username: string;
  http_password: string;
  port: string;
  interval: number;
  status: number; // 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down
  create_datetime: number;
}

export default function MonitoringView({ clients }: { clients: Client[] }) {
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchMonitors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/uptimerobot/monitors');
      if (res.status === 429) {
        toast.error('Limite de requisições atingido. Tente novamente mais tarde.');
        return;
      }
      if (!res.ok) {
        throw new Error('Falha ao buscar monitores');
      }
      const data = await res.json();
      setMonitors(data);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao conectar com UptimeRobot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const createMonitor = async (client: Client) => {
    if (!client.siteLink) return;
    
    // Sanitização e validação de segurança da URL
    const sanitizedUrl = client.siteLink.trim().replace(/\s+/g, '');
    
    if (sanitizedUrl.includes('localhost') || sanitizedUrl.includes('127.0.0.1')) {
      toast.warning('O motor de monitoramento exige um domínio público de produção (ex: https://meusite.com) e não aceita monitoramento de endereços locais (localhost).');
      return;
    }

    try {
      setSyncing(true);
      const res = await fetch('/api/uptimerobot/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: client.id,
          friendly_name: client.name,
          url: sanitizedUrl.startsWith('http') ? sanitizedUrl : `https://${sanitizedUrl}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar monitor');
      }
      
      toast.success(`Monitoramento ativado para ${client.name}`);
      await fetchMonitors();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const clientsWithSites = clients.filter(c => c.siteLink && c.siteLink.trim() !== '');

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 2:
        return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-medium"><CheckCircle size={14} /> Online</span>;
      case 8:
      case 9:
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded-md text-xs font-medium"><XCircle size={14} /> Offline</span>;
      case 0:
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-500 rounded-md text-xs font-medium"><AlertTriangle size={14} /> Pausado</span>;
      case 1:
      default:
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded-md text-xs font-medium"><RefreshCw size={14} className="animate-spin" /> Verificando</span>;
    }
  };

  const onlineCount = monitors.filter(m => m.status === 2).length;
  const offlineCount = monitors.filter(m => m.status === 8 || m.status === 9).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Sites Monitorados</h3>
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
                <Globe size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{monitors.length}</p>
          </div>
          
          <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Sites Online</h3>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-500">{onlineCount}</p>
          </div>

          <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">Sites Offline</h3>
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <XCircle size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-500">{offlineCount}</p>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="text-primary-500" size={20} />
              Monitoramento em Tempo Real
            </h3>
            <button 
              onClick={fetchMonitors}
              disabled={loading || syncing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-sm">Cliente</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-sm">URL do Site</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-sm text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {clientsWithSites.map(client => {
                  const clientUrl = client.siteLink?.replace(/^https?:\/\//, '').replace(/\/$/, '');
                  const monitor = monitors.find(m => m.url.includes(clientUrl || ''));

                  return (
                    <tr key={client.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 text-gray-900 dark:text-white font-medium">{client.name}</td>
                      <td className="py-4 text-gray-500 dark:text-gray-400 text-sm">
                        <a href={client.siteLink?.startsWith('http') ? client.siteLink : `https://${client.siteLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                          {client.siteLink} <ExternalLink size={14} />
                        </a>
                      </td>
                      <td className="py-4">
                        {monitor ? getStatusBadge(monitor.status) : <span className="text-xs text-gray-400">Não monitorado</span>}
                      </td>
                      <td className="py-4 text-right">
                        {!monitor && (
                          <button
                            onClick={() => createMonitor(client)}
                            disabled={syncing}
                            className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            Iniciar Monitoramento
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {clientsWithSites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum cliente com site cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
