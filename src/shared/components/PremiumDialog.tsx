import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Field {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'url';
  defaultValue?: string | number;
}

interface PremiumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: Record<string, any>) => void;
  title: string;
  description?: string;
  fields: Field[];
  confirmLabel?: string;
}

export function PremiumDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  fields, 
  confirmLabel = 'Confirmar' 
}: PremiumDialogProps) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      fields.forEach(f => {
        initial[f.id] = f.defaultValue || '';
      });
      setValues(initial);
    }
  }, [isOpen, fields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(values);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0c12]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                {description && <p className="text-sm text-gray-400 font-medium">{description}</p>}
              </div>

              <div className="space-y-4">
                {fields.map(field => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={values[field.id] || ''}
                      onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
                      placeholder={field.placeholder}
                      autoFocus={fields[0].id === field.id}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary-500/50 focus:ring-0 transition-all font-medium"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl bg-primary-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
