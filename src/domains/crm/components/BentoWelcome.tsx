import React from 'react';
import { CloudSun, Calendar } from 'lucide-react';

interface BentoWelcomeProps {
  userName: string;
}

export default function BentoWelcome({ userName }: BentoWelcomeProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="h-full min-h-[160px] bg-gradient-to-br from-primary-500/10 to-violet-500/10 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between text-left group hover:border-primary-500/20 transition-all duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary-400 text-xs font-black uppercase tracking-wider">
          <CloudSun size={14} className="animate-pulse" />
          <span>Clima Corporativo</span>
        </div>
        <h2 className="text-xl font-black text-white leading-tight">
          {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-violet-400">{userName}</span>! ☕
        </h2>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-gray-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl w-fit">
        <Calendar size={12} className="text-violet-400" />
        <span className="capitalize">{formattedDate}</span>
      </div>
    </div>
  );
}
