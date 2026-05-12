import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, FileText, 
  ShieldCheck, ArrowRight, Zap, Info 
} from 'lucide-react';
import { proposalService } from '../services/proposalService';
import { Proposal } from '../entities/proposal.entity';
import { HUB_TOKENS, GLASS_STYLES } from '@/shared/ui-system/tokens';

const ProposalPublicView: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    if (proposalId) {
      loadProposal();
    }
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      const data = await proposalService.getById(proposalId!);
      if (data) {
        setProposal(data);
        if (data.status === 'sent') {
          await proposalService.markAsViewed(proposalId!);
        }
        // Inicializar com itens que não são opcionais + os que já estão selecionados
        setSelectedAddons(data.items.filter(i => i.isSelected).map(i => i.id));
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    if (!proposal) return 0;
    return proposal.items
      .filter(i => !i.isOptional || selectedAddons.includes(i.id))
      .reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0);
  };

  const handleApprove = async () => {
    if (!proposalId) return;
    setApproving(true);
    try {
      const metadata = {
        ip: 'capture-on-server',
        userAgent: navigator.userAgent
      };
      const result = await proposalService.approve(proposalId, metadata, selectedAddons);
      
      if (result.checkoutUrl) {
        // Redirecionamento direto se possível
        window.location.href = result.checkoutUrl;
      }
      
      setApproved(true);
    } catch (error) {
      console.error('Error approving proposal:', error);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Proposta não encontrada</h1>
          <p className="text-gray-400">O link pode ter expirado ou não existe mais.</p>
        </div>
      </div>
    );
  }

  if (approved || proposal.status === 'approved') {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Proposta Aprovada!</h1>
            <p className="text-gray-400">Excelente escolha! O seu acesso já está sendo preparado. Clique no botão abaixo para concluir o pagamento e ativar sua conta.</p>
          </div>
          
          {proposal.checkoutUrl ? (
            <a 
              href={proposal.checkoutUrl}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              Ir para Pagamento (Asaas)
              <ArrowRight className="w-5 h-5" />
            </a>
          ) : (
            <div style={GLASS_STYLES.base} className="p-6 rounded-2xl text-xs text-amber-400/70 border-amber-500/20">
              Aguardando geração do link de pagamento automático...
            </div>
          )}

          <div style={GLASS_STYLES.base} className="p-4 rounded-2xl text-[10px] text-emerald-400/50 border-emerald-500/10 uppercase tracking-widest font-bold">
            Protocolo de Aceite Digital Arquivado
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-primary-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <header className="flex flex-wrap items-center justify-between gap-6 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-full text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                Proposta Comercial
              </span>
              <span className="text-gray-500 text-xs">#{proposal.id.slice(-6).toUpperCase()}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">{proposal.title}</h1>
            <p className="text-gray-400">Preparado para <span className="text-white font-semibold">{proposal.leadName}</span></p>
          </div>
          
          <div className="flex items-center gap-4">
            <img src="https://i.imgur.com/zCvL7xy.png" alt="HubCRM" className="h-10 opacity-50 transition-all" />
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Detalhamento do Projeto
              </h2>
              <div style={GLASS_STYLES.base} className="p-8 rounded-[2rem] border-white/5 leading-relaxed text-gray-400">
                {proposal.description || 'Nenhum detalhamento adicional fornecido.'}
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Serviços e Opcionais
              </h2>
              <div className="space-y-4">
                {proposal.items.map((item) => (
                  <div 
                    key={item.id}
                    style={GLASS_STYLES.base}
                    className={`p-6 rounded-2xl border-white/5 transition-all duration-500 flex items-center gap-4 ${
                      item.isOptional ? 'cursor-pointer group' : ''
                    } ${item.isOptional && selectedAddons.includes(item.id) ? 'bg-primary-500/5 border-primary-500/20' : ''}`}
                    onClick={() => item.isOptional && toggleAddon(item.id)}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isOptional ? (selectedAddons.includes(item.id) ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-500') : 'bg-primary-500/20 text-primary-400'
                    }`}>
                      {item.isOptional ? (selectedAddons.includes(item.id) ? <CheckCircle2 className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />) : <ShieldCheck className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{item.name}</h4>
                        {item.isOptional && (
                          <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">Opcional</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-white">R$ {item.price.toLocaleString('pt-BR')}</p>
                      {item.quantity > 1 && <p className="text-[10px] text-gray-500">x{item.quantity} unidades</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Checkout Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-12 space-y-6">
              <div style={GLASS_STYLES.base} className="p-8 rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary-500/20 transition-colors" />
                
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-8">Resumo do Investimento</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Serviços Base</span>
                    <span>R$ {proposal.items.filter(i => !i.isOptional).reduce((a, b) => a + b.price, 0).toLocaleString('pt-BR')}</span>
                  </div>
                  {proposal.items.filter(i => i.isOptional && selectedAddons.includes(i.id)).map(addon => (
                    <div key={addon.id} className="flex justify-between text-sm animate-in slide-in-from-right-2">
                      <span className="text-gray-500">{addon.name}</span>
                      <span className="text-primary-400">+ R$ {addon.price.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-3xl font-black text-primary-500 tracking-tight">R$ {calculateTotal().toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <button
                  disabled={approving}
                  onClick={handleApprove}
                  className="w-full py-5 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-gray-900 font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_15px_40px_rgba(var(--primary-rgb),0.5)] hover:-translate-y-1 flex items-center justify-center gap-3"
                >
                  {approving ? (
                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Aprovar Proposta
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="mt-6 text-[10px] text-gray-500 text-center uppercase tracking-widest leading-relaxed">
                  Ao aprovar, você aceita os termos e condições do contrato de prestação de serviços.
                </p>
              </div>

              <div style={GLASS_STYLES.base} className="p-6 rounded-2xl border-white/5 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary-500 shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Esta proposta tem validade de <span className="text-white">7 dias</span>. Após esse período, os valores e condições podem sofrer alterações.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalPublicView;
