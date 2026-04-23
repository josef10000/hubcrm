import React, { createContext, useContext, useState, useCallback } from 'react';

type DialogType = 'alert' | 'confirm' | 'prompt';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success';
  placeholder?: string;
  defaultValue?: string;
}

interface DialogState extends DialogOptions {
  type: DialogType;
  resolve: (value: any) => void;
}

interface DialogContextType {
  alert: (options: DialogOptions | string) => Promise<void>;
  confirm: (options: DialogOptions | string) => Promise<boolean>;
  prompt: (options: DialogOptions | string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const showDialog = useCallback((type: DialogType, options: DialogOptions | string) => {
    return new Promise((resolve) => {
      const baseOptions = typeof options === 'string' ? { message: options, title: 'Atenção' } : options;
      setDialog({
        ...baseOptions,
        type,
        resolve,
      });
    });
  }, []);

  const alert = (options: DialogOptions | string) => showDialog('alert', options) as Promise<void>;
  const confirm = (options: DialogOptions | string) => showDialog('confirm', options) as Promise<boolean>;
  const prompt = (options: DialogOptions | string) => showDialog('prompt', options) as Promise<string | null>;

  const handleClose = (value: any) => {
    if (dialog) {
      dialog.resolve(value);
      setDialog(null);
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {dialog && (
        <CustomDialogRenderer dialog={dialog} onClose={handleClose} />
      )}
    </DialogContext.Provider>
  );
}

// Separate component to handle the UI and animations
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, HelpCircle, Info, CheckCircle2, Trash2, X } from 'lucide-react';

function CustomDialogRenderer({ dialog, onClose }: { dialog: DialogState; onClose: (value: any) => void }) {
  const [inputValue, setInputValue] = useState(dialog.defaultValue || '');

  const getIcon = () => {
    switch (dialog.variant) {
      case 'danger': return <Trash2 className="w-6 h-6" />;
      case 'warning': return <AlertCircle className="w-6 h-6" />;
      case 'success': return <CheckCircle2 className="w-6 h-6" />;
      case 'info': return <Info className="w-6 h-6" />;
      default: return <HelpCircle className="w-6 h-6" />;
    }
  };

  const getColorClass = () => {
    switch (dialog.variant) {
      case 'danger': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'warning': return 'bg-amber-500/20 text-amber-500 border-amber-500/20';
      case 'success': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      case 'primary': return 'bg-primary-500/20 text-primary-500 border-primary-500/20';
      default: return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
    }
  };

  const getButtonClass = () => {
    switch (dialog.variant) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
      case 'success': return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';
      default: return 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dialog.type !== 'prompt' && onClose(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#0f1117] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
        >
          {/* Header/Banner Effect */}
          <div className={`h-2 w-full ${dialog.variant === 'danger' ? 'bg-red-500' : 'bg-primary-500'}`} />

          <div className="p-8">
            <div className="flex items-start gap-5 mb-6">
              <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${getColorClass()}`}>
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                  {dialog.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {dialog.message}
                </p>
              </div>
            </div>

            {dialog.type === 'prompt' && (
              <div className="mb-6">
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={dialog.placeholder || 'Digite aqui...'}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onClose(inputValue);
                    if (e.key === 'Escape') onClose(null);
                  }}
                />
              </div>
            )}

            <div className="flex gap-3">
              {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                <button
                  onClick={() => onClose(dialog.type === 'prompt' ? null : false)}
                  className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 active:scale-95"
                >
                  {dialog.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                onClick={() => onClose(dialog.type === 'prompt' ? inputValue : true)}
                className={`flex-1 px-6 py-4 text-white rounded-2xl font-black transition-all shadow-xl active:scale-95 ${getButtonClass()}`}
              >
                {dialog.confirmText || (dialog.type === 'alert' ? 'Entendido' : 'Confirmar')}
              </button>
            </div>
          </div>

          {/* Close button icon for accessibility */}
          <button
            onClick={() => onClose(null)}
            className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
