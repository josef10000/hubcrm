import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

interface PollCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (question: string, options: string[]) => void;
}

export const PollCreatorModal: React.FC<PollCreatorModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    const validOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (question.trim() && validOptions.length >= 2) {
      onSelect(question.trim(), validOptions);
      setQuestion('');
      setOptions(['', '']);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500">
              <BarChart2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Criar Enquete</h3>
              <p className="text-xs text-gray-500">Faça uma pergunta para a equipe</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Question */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Pergunta</label>
            <textarea
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: O que vamos pedir de almoço hoje?"
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none text-sm"
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opções de Voto</label>
              <span className="text-[10px] text-gray-500">{options.length}/10</span>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 group">
                  <input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                  {options.length > 2 && (
                    <button 
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button 
                onClick={handleAddOption}
                className="w-full p-3 flex items-center justify-center gap-2 text-primary-500 hover:bg-primary-500/5 rounded-xl border border-dashed border-primary-500/30 transition-all text-sm font-medium mt-2"
              >
                <Plus size={18} />
                Adicionar mais uma opção
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
          <button
            disabled={!question.trim() || options.filter(o => o.trim() !== '').length < 2}
            onClick={handleCreate}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold shadow-xl shadow-black/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          >
            Enviar Enquete
          </button>
        </div>
      </div>
      
      {/* Overlay Close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
