import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = "danger"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  cancelText?: string,
  variant?: 'danger' | 'primary'
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-primary-500/20 text-primary-500'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-2xl transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 text-white rounded-2xl transition-colors font-bold shadow-lg ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
