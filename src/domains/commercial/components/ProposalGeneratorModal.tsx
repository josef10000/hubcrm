import React, { useState } from 'react';
import { 
  X, Plus, Minus, Send, Link, 
  Copy, CheckCircle2, Zap, DollarSign, ExternalLink
} from 'lucide-react';
import { Lead } from '@/types';
import { proposalService } from '../services/proposalService';
import { ProposalItem } from '../entities/proposal.entity';
import { GLASS_STYLES } from '@/shared/ui-system/tokens';
import { toast } from 'sonner';

interface ProposalGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  orgId: string;
  userId: string;
}

const ProposalGeneratorModal: React.FC<ProposalGeneratorModalProps> = ({ 
  isOpen, onClose, lead, orgId, userId 
}) => {
  const [items, setItems] = useState<ProposalItem[]>([
    { id: '1', name: 'Plano Corporate Hub', description: 'Licença anual completa', price: 1997, quantity: 1, isOptional: false, isSelected: true },
    { id: '2', name: 'Máquina de Avaliações', description: 'Sistema de automação de reviews', price: 47, quantity: 1, isOptional: true, isSelected: false },
    { id: '3', name: 'Consultoria de Onboarding', description: 'Implementação assistida', price: 497, quantity: 1, isOptional: true, isSelected: false },
  ]);

  const [generating, setGenerating] = useState(false);
  const [proposalLink, setProposalLink] = useState<string | null>(null);

  const toggleItemSelection = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const selectedItems = items.filter(i => i.isSelected || !i.isOptional);
      const totalAmount = selectedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

      const proposalId = await proposalService.create({
        leadId: lead.id,
        leadName: lead.name,
        title: `Proposta Comercial - ${lead.name}`,
        description: `Proposta personalizada para implementação do ecossistema HubCRM.`,
        status: 'sent',
        items: items, // Enviamos todos, o cliente escolhe os opcionais na web
        totalAmount,
        createdBy: userId,
        orgId,
        checkoutUrl: ((lead as any).paymentLink || (lead as any).invoiceUrl || (lead as any).bankSlipUrl || (lead as any).invoiceHtmlUrl) || null
      });

      const link = `${window.location.origin}/p/${proposalId}`;
      setProposalLink(link);
      toast.success('Link da proposta gerado!');
    } catch (error: any) {
      console.error('Error generating proposal:', error);
      toast.error(`Erro ao gerar proposta: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (proposalLink) {
      navigator.clipboard.writeText(proposalLink);
      toast.success('Link copiado!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        style={GLASS_STYLES.base} 
        className="relative w-full max-w-2xl bg-[#0a0c10]/90 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <Zap className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gerar Proposta Web</h2>
              <p className="text-xs text-gray-500">Configuração CPQ para {lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!proposalLink ? (
            <>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Itens da Proposta</h3>
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isSelected ? 'bg-primary-500/5 border-primary-500/20' : 'bg-white/5 border-white/5'
                    } flex items-center gap-4`}
                  >
                    <div 
                      onClick={() => item.isOptional && toggleItemSelection(item.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                        item.isSelected ? 'bg-primary-500 border-primary-500 text-gray-900' : 'border-white/20'
                      }`}
                    >
                      {item.isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-gray-500">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white/5 rounded-lg border border-white/10">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-white transition-colors text-gray-500"><Minus size={14} /></button>
                        <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-white transition-colors text-gray-500"><Plus size={14} /></button>
                      </div>
                      <div className="w-24 text-right">
                        <p className="text-sm font-bold text-white">R$ {item.price.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={GLASS_STYLES.base} className="p-4 rounded-2xl bg-white/5 flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Estimado</span>
                <span className="text-2xl font-black text-primary-500">R$ {items.filter(i => i.isSelected).reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString('pt-BR')}</span>
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto">
                <Link className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Proposta Pronta!</h3>
                <p className="text-sm text-gray-400 px-12">Copie o link abaixo e envie para o cliente via WhatsApp ou E-mail.</p>
              </div>
              
              <div className="flex items-center gap-2 max-w-md mx-auto p-2 bg-white/5 border border-white/10 rounded-xl">
                <input 
                  readOnly 
                  value={proposalLink}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-primary-400 px-2 truncate"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-primary-500 text-gray-900 rounded-lg hover:bg-primary-400 transition-all"
                  title="Copiar Link"
                >
                  <Copy size={16} />
                </button>
                <a 
                  href={proposalLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  title="Abrir Proposta"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
          {!proposalLink ? (
            <>
              <button 
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={generating}
                onClick={handleGenerate}
                className="flex-1 py-3 px-4 rounded-xl bg-primary-500 text-gray-900 font-black text-xs uppercase tracking-widest hover:bg-primary-400 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {generating ? <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> Gerar Link</>}
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalGeneratorModal;
