import React, { useState, useEffect } from 'react';
import { Calendar, Briefcase, TrendingUp, Award, UserPlus, Trash2, PlusCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { CareerEvent } from '../../types/people';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface CareerTimelineProps {
  userId: string;
}

export default function CareerTimeline({ userId }: CareerTimelineProps) {
  const { effectiveOrgId } = useCRM();
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CareerEvent>>({
    type: 'Marco',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!effectiveOrgId || !userId) return;
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'career_events'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CareerEvent));
      setEvents(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [effectiveOrgId, userId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'career_events'), {
        ...newEvent,
        userId,
        orgId: effectiveOrgId
      });
      setShowAddForm(false);
      setNewEvent({ type: 'Marco', date: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Evento de carreira registrado!');
    } catch (error) {
      console.error('Error adding career event:', error);
      toast.error('Erro ao salvar evento.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'career_events', id));
      toast.success('Evento removido.');
    } catch (error) {
      toast.error('Erro ao remover evento.');
    }
  };

  const getEventIcon = (type: CareerEvent['type']) => {
    switch (type) {
      case 'Promoção': return TrendingUp;
      case 'Mudança de Cargo': return Briefcase;
      case 'Marco': return Award;
      case 'Entrada': return UserPlus;
      default: return Calendar;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Linha do Tempo de Carreira
        </h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-primary-500 hover:text-primary-600 transition-all flex items-center gap-1 text-sm font-bold"
        >
          <PlusCircle size={18} /> Adicionar Marco
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEvent} className="bg-gray-100/50 dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 animate-in slide-in-from-top mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Título do Evento</label>
              <input 
                type="text" 
                required
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newEvent.title || ''}
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Data</label>
              <input 
                type="date" 
                required
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newEvent.date || ''}
                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Tipo</label>
              <select 
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newEvent.type}
                onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
              >
                <option value="Entrada">Entrada na Empresa</option>
                <option value="Promoção">Promoção</option>
                <option value="Mudança de Cargo">Mudança de Cargo</option>
                <option value="Marco">Marco Importante</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Descrição (Opcional)</label>
              <input 
                type="text" 
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newEvent.description || ''}
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20">Salvar Evento</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-500 px-4 py-2 text-xs font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-white/10 before:to-transparent">
        {events.map((event, index) => {
          const Icon = getEventIcon(event.type);
          return (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-white/10 bg-gray-100 dark:bg-[#1a1c1e] text-primary-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all group-hover:scale-110">
                <Icon size={18} />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[2rem] bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-xl transition-all hover:border-primary-500/50">
                <div className="flex items-center justify-between mb-2">
                  <time className="font-black text-[10px] text-primary-500 uppercase tracking-tighter">
                    {format(parseISO(event.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </time>
                  <button onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-gray-900 dark:text-white font-bold text-lg mb-1">{event.title}</div>
                <div className="text-gray-500 text-sm">{event.description}</div>
              </div>
            </div>
          );
        })}
        {events.length === 0 && !loading && (
          <div className="py-20 text-center opacity-40">
            <p className="text-gray-500 dark:text-gray-400">Nenhum evento registrado na carreira.</p>
          </div>
        )}
      </div>
    </div>
  );
}
