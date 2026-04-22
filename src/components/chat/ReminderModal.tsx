import React, { useState } from 'react';
import { X, Bell, Calendar, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours, addDays, startOfDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  messageText: string;
}

export function ReminderModal({ isOpen, onClose, onConfirm, messageText }: ReminderModalProps) {
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customTime, setCustomTime] = useState(format(new Date(), "HH:mm"));

  const quickOptions = [
    { label: 'Em 30 minutos', date: addHours(new Date(), 0.5) },
    { label: 'Em 1 hora', date: addHours(new Date(), 1) },
    { label: 'Amanhã de manhã', date: setMinutes(setHours(addDays(startOfDay(new Date()), 1), 9), 0) },
    { label: 'Segunda-feira', date: setMinutes(setHours(addDays(startOfDay(new Date()), (8 - new Date().getDay()) % 7 || 7), 9), 0) },
  ];

  const handleCustomConfirm = () => {
    const date = new Date(`${customDate}T${customTime}`);
    onConfirm(date);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Bell size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Lembrar-me</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 mb-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Mensagem:</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                  "{messageText}"
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {mode === 'quick' ? (
                <div className="space-y-2">
                  {quickOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onConfirm(opt.date);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 border border-transparent transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">
                          {format(opt.date, "eee, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-amber-500" />
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setMode('custom')}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500 hover:text-amber-500 hover:border-amber-500/50 transition-all mt-4"
                  >
                    <Calendar size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Escolher data personalizada</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-sm dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Horário</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-sm dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setMode('quick')}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCustomConfirm}
                      className="flex-[2] bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
