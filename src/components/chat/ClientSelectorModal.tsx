import React, { useState } from 'react';
import { Search, X, User, Hash, Globe, Building2 } from 'lucide-react';
import { useCRM } from '../../contexts/CRMContext';
import { Client } from '../../types';

interface ClientSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
}

export function ClientSelectorModal({ isOpen, onClose, onSelect }: ClientSelectorModalProps) {
  const { clients } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10); // Limitar a 10 para performance

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Vincular Cliente</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Selecione uma ficha do CRM</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-gray-50 dark:bg-black/20">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nome, nicho ou e-mail..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
          {filteredClients.length > 0 ? (
            <div className="space-y-1">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => onSelect(client)}
                  className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-primary-500/5 group transition-all border border-transparent hover:border-primary-500/20"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {client.status === 'Ativo' ? (
                      <Globe size={24} className="text-emerald-500" />
                    ) : (
                      <Building2 size={24} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{client.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">{client.niche || 'Nicho Geral'}</span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className={`text-[10px] font-bold ${
                        client.status === 'Ativo' ? 'text-emerald-500' : 'text-amber-500'
                      } uppercase tracking-widest`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center opacity-40">
              <User size={48} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/10 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {clients.length} clientes cadastrados no total
          </p>
        </div>
      </div>
    </div>
  );
}
