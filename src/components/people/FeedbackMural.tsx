import React from 'react';
import { 
  Heart, 
  MessageSquare, 
  ShieldAlert, 
  User as UserIcon,
  Calendar,
  Lock,
  Globe
} from 'lucide-react';
import { FeedbackItem, UserProfile } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackMuralProps {
  feedbacks: FeedbackItem[];
  currentUserProfile: UserProfile | null;
  profileOwnerId: string;
}

export default function FeedbackMural({ feedbacks, currentUserProfile, profileOwnerId }: FeedbackMuralProps) {
  const isOwnProfile = currentUserProfile?.uid === profileOwnerId;
  const isAdmin = currentUserProfile?.role === 'Administrador' || currentUserProfile?.role === 'People & Culture';

  const visibleFeedbacks = feedbacks.filter(f => {
    if (!f.isPrivate) return true;
    if (isAdmin) return true;
    if (isOwnProfile) return true;
    if (f.fromId === currentUserProfile?.uid) return true;
    return false;
  }).sort((a, b) => b.date - a.date);

  if (visibleFeedbacks.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/5">
        <MessageSquare size={40} className="mx-auto text-gray-300 mb-4 opacity-20" />
        <p className="text-gray-500 text-sm">Ainda não há elogios ou feedbacks neste mural.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {visibleFeedbacks.map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-[2rem] border transition-all ${
              item.isPrivate 
              ? 'bg-amber-500/5 border-amber-500/10 shadow-lg' 
              : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-500">
                  <UserIcon size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{item.fromName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    <Calendar size={10} />
                    {format(item.date, "dd 'de' MMMM", { locale: ptBR })}
                    <span>•</span>
                    {item.isPrivate ? (
                      <span className="flex items-center gap-1 text-amber-500"><Lock size={10} /> Privado</span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-500"><Globe size={10} /> Público</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={`p-2 rounded-xl ${item.type === 'kudo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary-500/10 text-primary-500'}`}>
                {item.type === 'kudo' ? <Heart size={18} fill="currentColor" /> : <ShieldAlert size={18} />}
              </div>
            </div>

            <p className={`text-sm leading-relaxed ${item.isPrivate ? 'text-amber-200/80 italic' : 'text-gray-300'}`}>
              "{item.text}"
            </p>

            {item.isPrivate && !isOwnProfile && isAdmin && (
              <div className="mt-4 pt-4 border-t border-amber-500/10 text-[10px] text-amber-500 font-bold uppercase tracking-widest text-right">
                Visualização de Administrador / P&C
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
