import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, X, Check, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { Calendar as HeroUICalendar, TimeField } from '@heroui/react';
import { today, getLocalTimeZone } from '@internationalized/date';

interface MessageSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (timestamp: Timestamp | null) => void;
  currentScheduledAt: Timestamp | null;
}

export function MessageSchedulerModal({ isOpen, onClose, onSelect, currentScheduledAt }: MessageSchedulerModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => today(getLocalTimeZone()));
  const [selectedTime, setSelectedTime] = useState('09:00');

  const handleQuickSelect = (minutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    onSelect(Timestamp.fromDate(date));
    onClose();
  };

  const handleCustomSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    const dateStr = selectedDate.toString();
    const date = new Date(`${dateStr}T${selectedTime}`);
    onSelect(Timestamp.fromDate(date));
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10"
          >
            {/* Header */}
            <div className="p-8 bg-primary-500/5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-600">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">Agendar Mensagem</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Escolha quando sua mensagem será enviada</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Opções Rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleQuickSelect(60)}
                  className="p-4 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-left group"
                >
                  <Timer size={20} className="text-gray-400 group-hover:text-primary-500 mb-2" />
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">Em 1 hora</span>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Quick Action</span>
                </button>
                <button 
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(9, 0, 0, 0);
                    onSelect(Timestamp.fromDate(date));
                    onClose();
                  }}
                  className="p-4 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-left group"
                >
                  <Clock size={20} className="text-gray-400 group-hover:text-primary-500 mb-2" />
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">Amanhã 09:00</span>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Próximo Dia</span>
                </button>
              </div>

              {/* Divisor */}
              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">OU CUSTOMIZE</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
              </div>

              {/* Custom Selector */}
              <form onSubmit={handleCustomSelect} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-2">Data</label>
                    <div className="flex justify-center border border-gray-100 dark:border-white/10 rounded-2xl p-2 bg-gray-50 dark:bg-white/5">
                      <HeroUICalendar 
                        aria-label="Escolher data"
                        value={selectedDate}
                        onChange={setSelectedDate}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-2">Hora</label>
                    <TimeField 
                      className="w-full"
                      onChange={(val) => {
                        if (val) setSelectedTime(val.toString());
                      }}
                    >
                      <TimeField.Group className="flex bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 rounded-3xl text-sm dark:text-white">
                        <TimeField.Input>
                          {(segment) => <TimeField.Segment segment={segment} />}
                        </TimeField.Input>
                      </TimeField.Group>
                    </TimeField>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  {currentScheduledAt && (
                    <button 
                      type="button"
                      onClick={handleClear}
                      className="flex-1 p-4 rounded-3xl bg-rose-500/10 text-rose-600 font-bold text-sm hover:bg-rose-500/20 transition-all uppercase tracking-widest"
                    >
                      Remover
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={!selectedTime}
                    className="flex-[2] p-4 rounded-3xl bg-primary-500 text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Agendar Mensagem
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
