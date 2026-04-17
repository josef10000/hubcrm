import React, { useState } from 'react';
import { Shield, FileText, CheckCircle, Clock, Search, ExternalLink, Download, Mail, Filter, AlertCircle } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ContractTab = 'pending' | 'signed' | 'archive';

export default function ContractsView() {
  const { clients } = useCRM();
  const [activeTab, setActiveTab] = useState<ContractTab>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de Filtragem de Contratos
  const allContractClients = clients.filter(c => c.contracts && c.contracts.length > 0);
  
  const filteredClients = allContractClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'pending') return client.contracts?.some(con => con.status === 'pending');
    if (activeTab === 'signed') return client.contracts?.some(con => con.status === 'signed');
    return true; // Archive tab
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><CheckCircle size={10} /> Assinado</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><Clock size={10} /> Pendente</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Jurídico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                <Shield size={24} />
              </div>
              <h2 className="text-3xl font-bold text-white">Central de Contratos</h2>
            </div>
            <p className="text-gray-400">Gestão de Formalização e Segurança v4.0</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-full md:w-64 backdrop-blur-xl transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tabs de Status */}
        <div className="flex items-center gap-2 p-1 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
          <TabButton 
            active={activeTab === 'pending'} 
            onClick={() => setActiveTab('pending')}
            icon={<Clock size={16} />}
            label="Pendentes"
            count={allContractClients.filter(c => c.contracts?.some(con => con.status === 'pending')).length}
          />
          <TabButton 
            active={activeTab === 'signed'} 
            onClick={() => setActiveTab('signed')}
            icon={<CheckCircle size={16} />}
            label="Assinados"
            count={allContractClients.filter(c => c.contracts?.some(con => con.status === 'signed')).length}
          />
          <TabButton 
            active={activeTab === 'archive'} 
            onClick={() => setActiveTab('archive')}
            icon={<FileText size={16} />}
            label="Arquivo Geral"
            count={allContractClients.length}
          />
        </div>

        {/* Lista de Documentos */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative overflow-hidden p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-3xl backdrop-blur-3xl transition-all duration-500"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Document Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary-400 group-hover:scale-110 transition-all duration-500 border border-white/5">
                        <FileText size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary-400 transition-colors uppercase tracking-tight">
                          Contrato Digital: {client.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                            <Clock size={12} />
                            Enviado em {format(client.contracts?.[0].createdAt || Date.now(), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                          <span className="w-1 h-1 bg-gray-700 rounded-full" />
                          <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {client.plan}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Timing */}
                    <div className="flex items-center gap-8 px-6 border-x border-white/5 hidden lg:flex">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 leading-none tracking-widest">Status Atual</p>
                        {getStatusBadge(client.contracts?.[0].status || 'pending')}
                      </div>
                      
                      {client.contracts?.[0].status === 'signed' && (
                        <div className="text-center">
                          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 leading-none tracking-widest">Assinado em</p>
                          <p className="text-xs font-semibold text-green-500">
                             {format(client.contracts?.[0].signedAt || Date.now(), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                       <button className="p-3 bg-white/5 hover:bg-primary-500/20 text-gray-400 hover:text-primary-400 rounded-xl transition-all border border-white/5 group/btn relative" title="Visualizar">
                        <ExternalLink size={18} />
                      </button>
                       <button className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5" title="Baixar Cópia">
                        <Download size={18} />
                      </button>
                      
                      {client.contracts?.[0].status === 'pending' && (
                        <button className="flex items-center gap-2 px-5 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95">
                          <Mail size={18} />
                          Reenviar Link
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] text-center"
              >
                <div className="p-6 bg-gray-900/50 rounded-full mb-6 border border-white/5">
                  <Shield size={48} className="text-gray-700" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Sem contratos {activeTab === 'pending' ? 'pendentes' : 'nesta aba'}</h3>
                <p className="text-gray-500 max-w-sm">Tudo em ordem no jurídico! Quando houver movimentação nos documentos digitais, eles aparecerão aqui.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-500 group ${
        active 
        ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'scale-110' : 'opacity-60'} transition-transform duration-500`}>{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${active ? 'bg-black/20 text-white' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'}`}>
        {count}
      </span>
    </button>
  );
}
