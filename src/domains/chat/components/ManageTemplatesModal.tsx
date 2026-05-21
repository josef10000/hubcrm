import React, { useState } from 'react';
import { X, Trash2, Plus, Zap, Check } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { toast } from 'sonner';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageTemplatesModal({ isOpen, onClose }: ManageTemplatesModalProps) {
  const quickTemplates = useChatStore(state => state.quickTemplates);
  const addQuickTemplate = useChatStore(state => state.addQuickTemplate);
  const deleteQuickTemplate = useChatStore(state => state.deleteQuickTemplate);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      return toast.error('Preencha o título e o texto do template!');
    }
    
    addQuickTemplate(title.trim(), text.trim());
    setTitle('');
    setText('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
              <Zap size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Templates Rápidos</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Respostas personalizadas instantâneas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Formulário Novo Template */}
          <form onSubmit={handleSave} className="bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 p-5 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-500 flex items-center gap-1.5">
              <Plus size={14} /> Novo Template
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                  Título do Atalho
                </label>
                <input 
                  type="text" 
                  placeholder="ex: Proposta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-primary-500 transition-all dark:text-white"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                  Texto da Mensagem
                </label>
                <div className="flex gap-2">
                  <textarea 
                    placeholder="Texto que será preenchido automaticamente ao clicar..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={1}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3.5 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white resize-none max-h-24 custom-scrollbar"
                  />
                  <button 
                    type="submit"
                    className="px-5 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20"
                  >
                    <Check size={18} />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Lista de Templates Atuais */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
              Templates Disponíveis ({quickTemplates.length})
            </h3>
            
            {quickTemplates.length === 0 ? (
              <div className="text-center p-8 bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-250 dark:border-white/5 rounded-3xl opacity-60">
                <Zap size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Nenhum template cadastrado.</p>
                <p className="text-[10px] text-gray-400 mt-1">Cadastre seu primeiro atalho usando o formulário acima!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[38vh] overflow-y-auto custom-scrollbar pr-1">
                {quickTemplates.map(tpl => (
                  <div 
                    key={tpl.id}
                    className="group flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-white/10 rounded-2xl hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/[0.02] transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0 font-black text-xs uppercase group-hover:scale-105 transition-transform">
                      ⚡
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                          {tpl.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 whitespace-pre-wrap leading-relaxed break-words">
                        {tpl.text}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteQuickTemplate(tpl.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors shrink-0 group-hover:opacity-100 lg:opacity-0"
                      title="Excluir Template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
