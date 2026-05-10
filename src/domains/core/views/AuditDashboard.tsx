import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Trash2, Download, User, Clock, Search, Filter } from 'lucide-react';
import { auditService, AuditLog } from '@/services/auditService';
import { useCRMStore } from '@/store/useCRMStore';
import { HUB_TOKENS, GLASS_STYLES } from '@/shared/ui-system/tokens';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogWithId extends AuditLog {
  id: string;
  timestamp: number;
}

const AuditDashboard: React.FC = () => {
  const { effectiveOrgId } = useCRMStore();
  const [logs, setLogs] = useState<AuditLogWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!effectiveOrgId) return;
      const data = await auditService.getLogs(effectiveOrgId, 100);
      setLogs(data as AuditLogWithId[]);
      setLoading(false);
    };

    fetchLogs();
  }, [effectiveOrgId]);

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionIcon = (action: string) => {
    if (action.includes('DELETED')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (action.includes('DOWNLOAD') || action.includes('EXPORT')) return <Download className="w-4 h-4 text-amber-500" />;
    return <User className="w-4 h-4 text-blue-400" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETED')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (action.includes('DOWNLOAD')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Compliance & Auditoria
          </h1>
          <p className="text-gray-400 text-sm mt-1">Monitoramento de integridade e segurança de dados em tempo real.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-900/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 w-64"
            />
          </div>
          <button className="p-2 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div style={GLASS_STYLES.base} className="p-4 rounded-2xl border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Exclusões (24h)</p>
              <p className="text-2xl font-bold text-white">
                {logs.filter(l => l.action.includes('DELETED') && (Date.now() - l.timestamp < 86400000)).length}
              </p>
            </div>
          </div>
        </div>

        <div style={GLASS_STYLES.base} className="p-4 rounded-2xl border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Ações de Risco</p>
              <p className="text-2xl font-bold text-white">
                {logs.filter(l => (l.action.includes('DOWNLOAD') || l.action.includes('EXPORT'))).length}
              </p>
            </div>
          </div>
        </div>

        <div style={GLASS_STYLES.base} className="p-4 rounded-2xl border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Usuários Ativos</p>
              <p className="text-2xl font-bold text-white">
                {new Set(logs.map(l => l.userId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={GLASS_STYLES.base} className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Evento</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Detalhes</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Carregando logs de auditoria...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {log.action}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {log.userName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-200">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-400 max-w-md truncate">{log.details}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-300 font-mono">
                          {format(log.timestamp, 'HH:mm:ss')}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {format(log.timestamp, "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;
