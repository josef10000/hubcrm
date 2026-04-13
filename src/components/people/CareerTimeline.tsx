import React from 'react';
import { 
  Trophy, 
  Briefcase, 
  Calendar, 
  Star, 
  GraduationCap,
  ChevronRight
} from 'lucide-react';
import { CareerMilestone } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface CareerTimelineProps {
  milestones: CareerMilestone[];
}

const ICONS = {
  hired: <Calendar size={18} />,
  promotion: <TrendingUp size={18} />,
  milestone: <Trophy size={18} />,
  certification: <GraduationCap size={18} />
};

import { TrendingUp } from 'lucide-react';

export default function CareerTimeline({ milestones }: CareerTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => b.date - a.date);

  if (sortedMilestones.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/5">
        <Calendar size={40} className="mx-auto text-gray-300 mb-4 opacity-20" />
        <p className="text-gray-500 text-sm">Nenhuma conquista registrada no histórico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary-500/20 before:to-transparent">
      {sortedMilestones.map((item, index) => (
        <motion.div 
          key={item.id}
          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group select-none"
        >
          {/* Icon Dot */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-primary-500/50 bg-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-primary-500">
            {ICONS[item.type as keyof typeof ICONS] || <Star size={18} />}
          </div>

          {/* Content Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl group-hover:border-primary-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest bg-primary-500/10 px-2 py-0.5 rounded-md">
                {item.type === 'hired' ? 'Entrada' : item.type === 'promotion' ? 'Promoção' : item.type === 'certification' ? 'Certificação' : 'Conquista'}
              </span>
              <time className="text-[11px] font-bold text-gray-500">
                {format(item.date, "MMMM 'de' yyyy", { locale: ptBR })}
              </time>
            </div>
            <h5 className="text-white font-bold text-lg mb-1">{item.title}</h5>
            {item.description && (
              <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
