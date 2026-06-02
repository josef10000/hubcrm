import React, { useState } from 'react';
import { X, Video, Radio, Shield, Globe } from 'lucide-react';

interface StartLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    recordEnabled: boolean;
    allowExternal: boolean;
  }) => void;
}

export const StartLiveModal: React.FC<StartLiveModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [allowExternal, setAllowExternal] = useState(false);

  if (!isOpen) return null;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        recordEnabled,
        allowExternal,
      });
      setTitle('');
      setDescription('');
      setRecordEnabled(false);
      setAllowExternal(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 animate-pulse">
              <Radio size={22} />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">Iniciar Transmissão ao Vivo</h3>
              <p className="text-xs text-gray-500">Crie um comunicado ou treinamento em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStart} className="p-8 space-y-6">
          {/* Título da Live */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
              Título da Transmissão
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alinhamento Geral de Metas - Junho/2026"
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-semibold text-gray-900 dark:text-white"
            />
          </div>

          {/* Descrição/Pauta */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
              Descrição / Pauta (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: O que vamos discutir nesta transmissão..."
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none text-sm text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          {/* Toggle 1: Gravar Transmissão */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex gap-3 text-left">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 max-h-10 mt-1">
                <Video size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Gravar Transmissão?</h4>
                <p className="text-[11px] text-gray-500 leading-normal max-w-xs">
                  O vídeo será salvo em segundo plano e enviado ao Cloudflare R2 após o término da live.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecordEnabled(!recordEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ${
                recordEnabled ? 'bg-rose-500' : 'bg-gray-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  recordEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Permitir Acesso Externo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex gap-3 text-left">
              <div className={`p-2 rounded-xl max-h-10 mt-1 ${allowExternal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                {allowExternal ? <Globe size={18} /> : <Shield size={18} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Permitir Link Externo?</h4>
                <p className="text-[11px] text-gray-500 leading-normal max-w-xs">
                  Gera um link parametrizado temporário para acesso de pessoas de fora do CRM.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowExternal(!allowExternal)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ${
                allowExternal ? 'bg-rose-500' : 'bg-gray-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allowExternal ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-2xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 text-white rounded-2xl font-bold shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Radio size={18} />
              Iniciar Agora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
