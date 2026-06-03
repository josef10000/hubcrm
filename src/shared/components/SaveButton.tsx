import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SaveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<any> | any;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export function SaveButton({
  children,
  onClick,
  className,
  disabled,
  loadingText = 'Salvando...',
  successText = 'Salvo!',
  errorText = 'Erro ao salvar!',
  ...props
}: SaveButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dynErrorText, setDynErrorText] = useState(errorText);

  const handlePress = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (status !== 'idle' || disabled) return;
    setStatus('loading');

    try {
      // Executa o callback e aguarda se for uma promise
      await onClick(e);
      setStatus('success');
      
      // Retorna ao estado inicial após 2 segundos
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      console.error('[SaveButton] Falha na operação:', err);
      setDynErrorText(err?.message || errorText);
      setStatus('error');
      
      // Retorna ao estado inicial após 2.5 segundos
      setTimeout(() => {
        setStatus('idle');
        setDynErrorText(errorText);
      }, 2500);
    }
  };

  // Variações de classe com base no estado atual
  const statusClasses = {
    idle: '',
    loading: 'cursor-not-allowed opacity-80',
    success: 'bg-emerald-500! border-emerald-500/30! text-white! hover:bg-emerald-600!',
    error: 'bg-rose-500! border-rose-500/30! text-white! hover:bg-rose-600!',
  };

  // Efeito de vibração (shake) para o estado de erro
  const shakeAnimation = {
    x: [0, -6, 6, -6, 6, -3, 3, 0],
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  return (
    <motion.button
      type="button"
      onClick={handlePress}
      disabled={status === 'loading' || disabled}
      animate={status === 'error' ? shakeAnimation : { x: 0 }}
      className={cn(
        "px-6 py-2.5 rounded-xl font-bold transition-all relative flex items-center justify-center gap-2 border shadow-sm select-none active:scale-98 overflow-hidden",
        statusClasses[status],
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'loading' && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{loadingText}</span>
          </motion.span>
        )}

        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center gap-2"
          >
            {/* SVG customizado e animado para desenhar o checkmark na tela */}
            <svg
              className="h-4 w-4 shrink-0 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{successText}</span>
          </motion.span>
        )}

        {status === 'error' && (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dynErrorText}</span>
          </motion.span>
        )}

        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
