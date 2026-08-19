import React from 'react';
import { X, Target, Building2, User, AlertCircle, Sparkles, Layers, Edit2, CheckCircle2, ShieldAlert, Radio, DollarSign, Briefcase } from 'lucide-react';
import { ICP, Offer } from '@/types';

interface ICPDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  icp: ICP | null;
  offers: Offer[];
  onEdit: (icp: ICP) => void;
}

export default function ICPDetailsModal({
  isOpen,
  onClose,
  icp,
  offers,
  onEdit
}: ICPDetailsModalProps) {
  if (!isOpen || !icp) return null;

  const isB2C = icp.targetType === 'B2C';
  const safeOffers = Array.isArray(offers) ? offers : [];
  const linkedOffers = safeOffers.filter(o => (icp.linkedOfferIds || []).includes(o.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden custom-scrollbar">
        
        {/* Accent Bar Topo */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${isB2C ? 'from-emerald-500 via-teal-400' : 'from-blue-500 via-indigo-400'} to-amber-500`} />

        {/* Cabeçalho do Dossier */}
        <div className="p-6 border-b border-white/10 bg-black/40 flex items-start justify-between gap-4 relative">
          <div className="flex items-start gap-4">
            {/* Avatar Ilustrativo Grande */}
            {isB2C ? (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 shrink-0">
                <User size={30} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10 shrink-0">
                <Building2 size={30} />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full border inline-block ${
                  isB2C 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {isB2C ? '👤 B2C Consumidor Final' : '🏢 B2B Cliente Empresarial'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {icp.niche || 'Geral'}
                </span>
              </div>

              <h2 className="text-xl font-black text-white leading-tight">{icp.name}</h2>
              <p className="text-xs text-gray-400">Dossier Executivo do Perfil de Cliente Ideal</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Dossier (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* PAINEL DE DADOS PRINCIPAIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isB2C ? (
              <>
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Faixa Etária</span>
                  <span className="text-xs font-bold text-emerald-300 truncate block mt-0.5">{icp.ageGroup || 'Não informada'}</span>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Gênero / Público</span>
                  <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">{icp.gender || 'Todos'}</span>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Faixa de Renda</span>
                  <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">{icp.incomeRange || 'N/I'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Cargo do Decisor</span>
                  <span className="text-xs font-bold text-blue-300 truncate block mt-0.5">{icp.decisionMakerRole || 'Não informado'}</span>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Nicho / Setor</span>
                  <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">{icp.niche || 'Geral'}</span>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Porte / Faturamento</span>
                  <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">{icp.companySize || 'N/I'}</span>
                </div>
              </>
            )}

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <span className="text-[9px] text-amber-400 uppercase font-bold block">Ticket Médio</span>
              <span className="text-sm font-black text-amber-300 block mt-0.5">
                R$ {(icp.avgTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* DORES & DESAFIOS (PAIN POINTS) */}
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={15} /> Principais Dores & Desafios (Pain Points)
            </h4>
            {(!icp.painPoints || icp.painPoints.length === 0) ? (
              <p className="text-xs text-gray-500 italic">Nenhuma dor mapeada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {icp.painPoints.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold">
                    • {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* DESEJOS & OBJETIVOS */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={15} /> Objetivos & Transformação Desejada
            </h4>
            {(!icp.desires || icp.desires.length === 0) ? (
              <p className="text-xs text-gray-500 italic">Nenhum desejo mapeado ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {icp.desires.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold">
                    ✓ {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* OBJEÇÕES DE VENDA */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={15} /> Objeções Frequentes em Vendas
            </h4>
            {(!icp.objections || icp.objections.length === 0) ? (
              <p className="text-xs text-gray-500 italic">Nenhuma objeção mapeada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {icp.objections.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold">
                    ⚠️ {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* PITCH RECOMENDADO & CANAIS */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={15} className="text-amber-400" /> Argumentos de Venda & Canais
            </h4>
            
            {icp.pitchNotes ? (
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 leading-relaxed font-sans">
                {icp.pitchNotes}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Nenhum pitch cadastrado.</p>
            )}

            {icp.channels && icp.channels.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1.5">Canais de Aquisição Recomendados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {icp.channels.map((ch, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-xs font-medium">
                      📡 {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PRODUTOS CONECTADOS */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={15} className="text-amber-400" /> Produtos/Ofertas Vinculados ({linkedOffers.length})
            </h4>

            {linkedOffers.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhum produto do CRM vinculado a este ICP.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {linkedOffers.map(offer => (
                  <div key={offer.id} className="p-3 bg-black/40 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white truncate">{offer.name}</p>
                      <p className="text-[10px] text-amber-400 font-semibold">
                        R$ {(offer.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Ativo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(icp);
            }}
            className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Edit2 size={14} /> Editar Perfil
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold transition-colors"
          >
            Fechar Dossier
          </button>
        </div>

      </div>
    </div>
  );
}
