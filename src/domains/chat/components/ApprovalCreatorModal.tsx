import React, { useState } from 'react';
import { X, Send, CheckCircle2, Percent, Calendar, DollarSign, HelpCircle } from 'lucide-react';

interface ApprovalCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (question: string, type: 'discount' | 'holiday' | 'expense' | 'other', value?: any) => void;
}

export function ApprovalCreatorModal({ isOpen, onClose, onSelect }: ApprovalCreatorModalProps) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'discount' | 'holiday' | 'expense' | 'other'>('discount');
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSelect(question, type, value);
    setQuestion('');
    setValue('');
    onClose();
  };

  const types = [
    { id: 'discount', label: 'Desconto', icon: Percent, color: 'text-amber-500' },
    { id: 'holiday', label: 'Folga/Férias', icon: Calendar, color: 'text-emerald-500' },
    { id: 'expense', label: 'Reembolso', icon: DollarSign, color: 'text-blue-500' },
    { id: 'other', label: 'Outros', icon: HelpCircle, color: 'text-gray-500' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-600">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Nova Aprovação</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Tipo de Solicitação</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    type === t.id 
                      ? 'bg-primary-500/10 border-primary-500 text-primary-700' 
                      : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <t.icon size={18} className={type === t.id ? t.color : ''} />
                  <span className="text-xs font-bold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">O que precisa ser aprovado?</label>
            <textarea 
              autoFocus
              required
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ex: Liberar 10% de desconto no plano anual do cliente X?"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-primary-500 transition-all dark:text-white resize-none h-24"
            />
          </div>

          {type !== 'other' && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Valor / Detalhe (Opcional)</label>
              <input 
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'discount' ? '10%' : type === 'expense' ? 'R$ 150,00' : 'Data da folga'}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-primary-500 transition-all dark:text-white"
              />
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Enviar para Aprovação
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
