import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteICPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  icpName?: string;
  isDeleting: boolean;
}

export default function ConfirmDeleteICPModal({
  isOpen,
  onClose,
  onConfirm,
  icpName,
  isDeleting
}: ConfirmDeleteICPModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl relative overflow-hidden">
        
        {/* Glow Superior */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Ícone de Alerta */}
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30 shadow-lg">
          <AlertTriangle size={32} />
        </div>

        {/* Título & Descrição */}
        <div className="space-y-2 relative z-10">
          <h3 className="text-lg font-black text-white">Excluir Perfil de ICP?</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Você está prestes a remover o perfil <strong className="text-white">"{icpName}"</strong>. Esta ação não poderá ser desfeita e os produtos vinculados perderão essa referência.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3 pt-2 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>

      </div>
    </div>
  );
}
