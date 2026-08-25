import React, { useState } from 'react';
import { Target, Plus, Search, Briefcase, AlertCircle, Sparkles, Tag, Layers, Edit2, Trash2, BookOpen, Users, DollarSign, ArrowRight, Building2, UserCheck, User } from 'lucide-react';
import { useICPs } from '../hooks/useICPs';
import { useCRMStore } from '@/store/useCRMStore';
import ICPModal from '../components/ICPModal';
import ConfirmDeleteICPModal from '../components/ConfirmDeleteICPModal';
import ICPDetailsModal from '../components/ICPDetailsModal';
import { ICP } from '@/types';

export default function ICPView() {
  const { icps, isLoading, saveICP, deleteICP } = useICPs();
  const offers = useCRMStore(state => state.offers) || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingICP, setEditingICP] = useState<ICP | null>(null);
  const [viewingDetailsICP, setViewingDetailsICP] = useState<ICP | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [icpToDelete, setIcpToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');

  const filteredICPs = icps.filter(icp => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      icp.name.toLowerCase().includes(search) ||
      (icp.niche && icp.niche.toLowerCase().includes(search)) ||
      (icp.decisionMakerRole && icp.decisionMakerRole.toLowerCase().includes(search)) ||
      (icp.ageGroup && icp.ageGroup.toLowerCase().includes(search))
    );

    const matchesType = filterType === 'ALL' || icp.targetType === filterType || (!icp.targetType && filterType === 'B2B');
    return matchesSearch && matchesType;
  });

  const [isDeletingICP, setIsDeletingICP] = useState(false);

  const handleOpenCreate = () => {
    setEditingICP(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (icp: ICP) => {
    setEditingICP(icp);
    setIsModalOpen(true);
  };

  const handleRequestDelete = (id: string) => {
    setIcpToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!icpToDelete) return;
    try {
      setIsDeletingICP(true);
      await deleteICP(icpToDelete);
      setIcpToDelete(null);
    } finally {
      setIsDeletingICP(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Cabeçalho do Módulo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Target size={22} />
              </div>
              <h2 className="text-xl font-black text-white">Perfis de Cliente Ideal (ICP)</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Mapeie a firmografia, dores e argumentos dos seus clientes ideias para conectar aos seus produtos.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 text-xs"
          >
            <Plus size={16} />
            Novo Perfil ICP
          </button>
        </div>

        {/* Barra de Pesquisa & Filtros de Tipo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar ICP por nome, nicho, decisor ou idade..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filtros B2B vs B2C */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 border border-white/10 rounded-2xl">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'ALL' ? 'bg-amber-500 text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos os Perfis ({icps.length})
            </button>
            <button
              onClick={() => setFilterType('B2B')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'B2B' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              🏢 B2B Empresas ({icps.filter(i => i.targetType !== 'B2C').length})
            </button>
            <button
              onClick={() => setFilterType('B2C')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'B2C' ? 'bg-emerald-500 text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              👤 B2C Consumidor ({icps.filter(i => i.targetType === 'B2C').length})
            </button>
          </div>
        </div>

        {/* Grid de Cards ICP - Persona Canvas */}
        {isLoading ? (
          <div className="py-20 text-center text-gray-500 text-xs">Carregando Perfis de ICP...</div>
        ) : filteredICPs.length === 0 ? (
          <div className="p-12 text-center bg-white/[0.02] border border-white/10 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <Target size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Nenhum Perfil ICP Encontrado</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Crie o primeiro Perfil de Cliente Ideal (B2B ou B2C) da sua empresa para alinhar a equipe de produtos e vendas.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-amber-500 text-gray-900 font-extrabold rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus size={16} /> Criar Primeiro ICP
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredICPs.map(icp => {
              const safeOffersList = Array.isArray(offers) ? offers : [];
              const linkedOffers = safeOffersList.filter(o => (icp.linkedOfferIds || []).includes(o.id));
              const isB2C = icp.targetType === 'B2C';

              return (
                <div 
                  key={icp.id}
                  className="bg-black/40 border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 backdrop-blur-xl group hover:shadow-2xl hover:shadow-amber-500/10 relative overflow-hidden"
                >
                  {/* Accent Line Topo */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isB2C ? 'from-emerald-500 via-emerald-400' : 'from-blue-500 via-blue-400'} to-transparent`} />

                  <div className="space-y-4">
                    {/* Topo do Card com Avatar e Ações */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar / Ilustração do Perfil */}
                        {isB2C ? (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
                            <User size={24} />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 shrink-0">
                            <Building2 size={24} />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full border inline-block ${
                              isB2C 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {isB2C ? '👤 B2C Consumidor' : '🏢 B2B Empresa'}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
                              {icp.niche || 'Geral'}
                            </span>
                          </div>

                          <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors leading-tight">
                            {icp.name}
                          </h3>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(icp)}
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Editar ICP"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleRequestDelete(icp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir ICP"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Meta Info Dinâmica (B2B vs B2C) */}
                    {isB2C ? (
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Faixa Etária</span>
                          <span className="font-bold text-emerald-300 truncate block">{icp.ageGroup || 'Geral'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Renda Estimada</span>
                          <span className="font-bold text-amber-400 truncate block">{icp.incomeRange || 'N/I'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Decisor</span>
                          <span className="font-bold text-blue-300 truncate block">{icp.decisionMakerRole || 'N/I'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Ticket Estimado</span>
                          <span className="font-bold text-amber-400 block">
                            R$ {(icp.avgTicket || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dores (Pain Points) */}
                    {icp.painPoints && icp.painPoints.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
                          <AlertCircle size={12} /> Principais Dores:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {icp.painPoints.slice(0, 3).map((pain, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md">
                              {pain}
                            </span>
                          ))}
                          {icp.painPoints.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-400 rounded-md">
                              +{icp.painPoints.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Desejos (Gains) */}
                    {icp.desires && icp.desires.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <Sparkles size={12} /> Objetivos Desejados:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {icp.desires.slice(0, 3).map((desire, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md">
                              {desire}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Produtos Vinculados */}
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                        <Layers size={12} className="text-amber-400" /> Produtos Conectados ({linkedOffers.length}):
                      </span>
                      {linkedOffers.length === 0 ? (
                        <span className="text-[11px] text-gray-500 italic block">Nenhum produto vinculado ainda.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {linkedOffers.map(offer => (
                            <span key={offer.id} className="text-[10px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
                              {offer.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                    <span>Canais: {(icp.channels || []).join(', ') || 'N/I'}</span>
                    <button 
                      onClick={() => setViewingDetailsICP(icp)}
                      className="text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      Ver Detalhes <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Detalhes (Somente Leitura - Executive Persona Dossier) */}
        <ICPDetailsModal
          isOpen={!!viewingDetailsICP}
          onClose={() => setViewingDetailsICP(null)}
          icp={viewingDetailsICP}
          offers={offers}
          onEdit={(targetIcp) => {
            setViewingDetailsICP(null);
            handleOpenEdit(targetIcp);
          }}
        />

        {/* Modal de Criação / Edição */}
        <ICPModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={async (data) => { await saveICP(data); }}
          editingICP={editingICP}
          offers={offers}
        />

        {/* Modal Customizado de Confirmação de Exclusão */}
        <ConfirmDeleteICPModal
          isOpen={!!icpToDelete}
          onClose={() => setIcpToDelete(null)}
          onConfirm={handleConfirmDelete}
          icpName={icps.find(i => i.id === icpToDelete)?.name}
          isDeleting={isDeletingICP}
        />

      </div>
    </div>
  );
}
