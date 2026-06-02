import React from 'react';
import { Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BirthdayPerson {
  name: string;
  role: string;
  day: string;
  isToday: boolean;
}

export default function TeamCelebrations() {
  // Lista simulada de aniversariantes da equipe
  const birthdays: BirthdayPerson[] = [
    { name: 'José Frazão', role: 'Diretor Geral', day: 'Hoje', isToday: true },
    { name: 'Aline Souza', role: 'Suporte VIP', day: 'Amanhã', isToday: false },
    { name: 'Gabriel Mendes', role: 'Desenvolvedor Frontend', day: '05 de Junho', isToday: false }
  ];

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-4 text-left h-full min-h-[220px]">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Gift size={14} className="text-primary-500" />
        Celebrações da Semana
      </h3>

      <div className="space-y-2">
        {birthdays.map((person, idx) => (
          <div 
            key={idx} 
            className={`flex items-center justify-between p-3 border rounded-2xl transition-all duration-300 ${
              person.isToday 
                ? 'bg-primary-500/5 hover:bg-primary-500/10 border-primary-500/20 cursor-pointer' 
                : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5'
            }`}
            onClick={person.isToday ? triggerConfetti : undefined}
          >
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                {person.name}
                {person.isToday && (
                  <span className="px-1.5 py-0.5 bg-primary-500 text-gray-900 text-[8px] font-black rounded-md uppercase animate-pulse">
                    Niver! 🎉
                  </span>
                )}
              </p>
              <p className="text-[10px] text-gray-500">{person.role}</p>
            </div>
            <span className="text-[10px] font-bold text-primary-400">{person.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
