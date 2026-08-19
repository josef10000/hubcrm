import React, { useState } from 'react';
import { Target, Plus, Search, Briefcase, AlertCircle, Sparkles, Tag, Layers, Edit2, Trash2, BookOpen, Users, DollarSign, ArrowRight } from 'lucide-react';
import { useICPs } from '../hooks/useICPs';
import { useOffers } from '@/hooks/useOffers';
import ICPModal from '../components/ICPModal';
import { ICP } from '@/types';

export default function ICPView() {
  const { icps, isLoading, saveICP, deleteICP } = useICPs();
  const { offers } = useOffers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingICP, setEditingICP] = useState<ICP | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [icpToDelete, setIcpToDelete] = useState<string | null>(null);

  const filteredICPs = icps.filter(icp => {
    const search = searchTerm.toLowerCase();
    return (
      icp.name.toLowerCase().includes(search) ||
      (icp.niche && icp.niche.toLowerCase().includes(search)) ||
      (icp.decisionMakerRole && icp.decisionMakerRole.toLowerCase().includes(search))
    );
  });

  const handleOpenCreate = () => {
    setEditingICP(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (icp: ICP) => {
    setEditingICP(icp);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Perfil de Cliente Ideal (ICP)?')) {
      await deleteICP(id);
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

        {/* Barra de Pesquisa */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar ICP por nome, nicho ou decisor..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
          />
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
                Crie o primeiro Perfil de Cliente Ideal da sua empresa para alinhar a equipe de produtos e vendas.
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
              const linkedOffers = offers.filter(o => (icp.linkedOfferIds || []).includes(o.id));

              return (
                <div 
                  key={icp.id}
                  className="bg-black/40 border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 backdrop-blur-xl group hover:shadow-2xl hover:shadow-amber-500/10 relative overflow-hidden"
                >
                  {/* Accent Line Topo */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />

                  <div className="space-y-4">
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block mb-1.5">
                          {icp.niche || 'Geral'}
                        </span>
                        <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors leading-tight">
                          {icp.name}
                        </h3>
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
                          onClick={() => handleDelete(icp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir ICP"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Meta Info (Decisor & Ticket) */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Decisor</span>
                        <span className="font-bold text-gray-200 truncate block">{icp.decisionMakerRole || 'N/I'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Ticket Estimado</span>
                        <span className="font-bold text-amber-400 block">
                          R$ {(icp.avgTicket || 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

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
                      onClick={() => handleOpenEdit(icp)}
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

        {/* Modal de Criação / Edição */}
        <ICPModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={saveICP}
          editingICP={editingICP}
          offers={offers}
        />

      </div>
    </div>
  );
}
