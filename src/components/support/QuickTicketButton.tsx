import React, { useState } from 'react';
import { Zap, X, MessageSquare, Send } from 'lucide-react';
import { useSupport } from '@/hooks/useSupport';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export function QuickTicketButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Suporte Técnico');
  const [submitting, setSubmitting] = useState(false);

  const { effectiveOrgId } = useSupport();
  const { userProfile } = useCRM();
  const { user } = useAuth();

  const CATEGORIES = ['Suporte Técnico', 'Financeiro', 'Onboarding', 'Comercial', 'Infraestrutura', 'Outro'];

  const handleSubmit = async () => {
    if (!message.trim() || !effectiveOrgId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'supportRequests'), {
        clientId: user?.uid,
        clientName: userProfile?.displayName || user?.email || 'Equipe Interna',
        category,
        message: message.trim(),
        status: 'aberto',
        priority: 'media',
        origin: 'interno',
        createdAt: serverTimestamp(),
        assignedTo: null,
      });
      toast.success('✅ Ticket aberto com sucesso!');
      setMessage('');
      setIsOpen(false);
    } catch {
      toast.error('Erro ao abrir ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500/20 to-violet-500/20 hover:from-primary-500/30 hover:to-violet-500/30 border border-primary-500/30 text-primary-400 font-bold rounded-2xl transition-all shadow-xl shadow-primary-500/10 active:scale-95 text-sm"
        title="Abrir Ticket Rápido Interno"
      >
        <Zap size={16} />
        Quick Ticket
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <Zap size={18} className="text-primary-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Quick Ticket Interno</h3>
                  <p className="text-xs text-gray-500">Abre um chamado sem sair da tela</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Descrição do Problema</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Descreva o problema brevemente..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[100px] resize-none placeholder-gray-600"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
              >
                <Send size={16} />
                {submitting ? 'Abrindo...' : 'Abrir Ticket Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
