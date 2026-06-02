import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCRM } from '@crm/contexts/CRMContext';
import { Gift, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BirthdayPerson {
  uid: string;
  name: string;
  role: string;
  birthDate: string; // Formato YYYY-MM-DD
  dayNum: number;
  monthNum: number;
  isToday: boolean;
  formattedDay: string;
}

export default function TeamCelebrations() {
  const { effectiveOrgId } = useCRM();
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId) return;

    setLoading(true);
    const q = query(collection(db, 'profiles'), where('orgId', '==', effectiveOrgId));

    const unsubscribe = onSnapshot(q, (snap) => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1; // 1-indexed

      const list: BirthdayPerson[] = [];

      snap.forEach((doc) => {
        const data = doc.data();
        if (!data.birthDate) return;

        // Tratar formato YYYY-MM-DD ou DD/MM/YYYY se houver alguma inconsistência
        let rawDate = data.birthDate;
        if (rawDate.includes('/')) {
          rawDate = rawDate.split('/').reverse().join('-');
        }

        const parts = rawDate.split('-').map(Number);
        if (parts.length < 3) return;

        const [_, month, day] = parts;

        // Filtrar aniversariantes do mês corrente
        if (month === currentMonth) {
          const isToday = day === currentDay;
          
          // Formatar data por extenso
          const dateObj = new Date(today.getFullYear(), month - 1, day);
          const formattedDay = isToday 
            ? 'Hoje' 
            : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

          list.push({
            uid: doc.id,
            name: data.displayName || 'Colaborador',
            role: data.role || 'Membro do Time',
            birthDate: rawDate,
            dayNum: day,
            monthNum: month,
            isToday,
            formattedDay
          });
        }
      });

      // Ordenar por dia do mês de forma crescente
      list.sort((a, b) => a.dayNum - b.dayNum);
      setBirthdays(list);
      setLoading(false);
    }, (err) => {
      console.error('[TeamCelebrations] Erro ao ouvir perfis:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (loading) {
    return (
      <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-center min-h-[160px]">
        <Loader2 className="animate-spin text-primary-500 mr-2" />
        <span className="text-sm text-gray-500">Buscando aniversariantes...</span>
      </div>
    );
  }

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-4 text-left h-full min-h-[180px]">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Gift size={14} className="text-primary-500" />
        Aniversariantes do Mês
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {birthdays.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4 col-span-full text-center">Nenhum aniversariante registrado neste mês.</p>
        ) : (
          birthdays.map((person) => (
            <div 
              key={person.uid} 
              className={`flex items-center justify-between p-3 border rounded-2xl transition-all duration-300 ${
                person.isToday 
                  ? 'bg-primary-500/5 hover:bg-primary-500/10 border-primary-500/25 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.02)]' 
                  : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5'
              }`}
              onClick={person.isToday ? triggerConfetti : undefined}
            >
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  {person.name}
                  {person.isToday && (
                    <span className="px-1.5 py-0.5 bg-primary-500 text-gray-900 text-[8px] font-black rounded-md uppercase animate-pulse">
                      Hoje! 🎉
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500">{person.role}</p>
              </div>
              <span className="text-[10px] font-bold text-primary-400">{person.formattedDay}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
