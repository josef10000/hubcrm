import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { MoodLog } from '../../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MOODS = [
  { score: 1, emoji: '😫', label: 'Esgotado' },
  { score: 2, emoji: '😐', label: 'Produtivo' },
  { score: 3, emoji: '😊', label: 'Motivado' },
  { score: 4, emoji: '🚀', label: 'Incrível' },
  { score: 5, emoji: '🔥', label: 'Imparável' }
];

export default function MoodTracker() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.moodLogs && userProfile.moodLogs.length > 0) {
      const lastLog = userProfile.moodLogs[userProfile.moodLogs.length - 1];
      const lastDate = new Date(lastLog.date).toDateString();
      const today = new Date().toDateString();
      if (lastDate === today) {
        setHasVoted(true);
      }
    }
  }, [userProfile]);

  const handleVote = async (mood: typeof MOODS[0]) => {
    if (!user || hasVoted) return;
    setLoading(true);

    try {
      const log: MoodLog = {
        id: crypto.randomUUID(),
        score: mood.score,
        emoji: mood.emoji,
        date: Date.now()
      };

      const userRef = doc(db, 'profiles', user.uid);
      await updateDoc(userRef, {
        moodLogs: arrayUnion(log)
      });

      setHasVoted(true);
      toast.success(`Humor registrado: ${mood.label}! Boa jornada 🚀`);
      refreshProfile();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar humor');
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    const todayMood = userProfile?.moodLogs?.[userProfile.moodLogs.length - 1];
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl inline-block animate-bounce">{todayMood?.emoji}</span>
          <div>
            <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">Termômetro de Hoje</p>
            <p className="text-xs text-gray-400">Energia registrada com sucesso.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-primary-500/10 backdrop-blur-xl border border-primary-500/20 rounded-2xl p-3 overflow-hidden"
    >
      <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wider mb-3 text-center leading-relaxed">Como você está começando o dia?</p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.score}
            onClick={() => handleVote(mood)}
            disabled={loading}
            className="flex flex-col items-center gap-1 p-1 sm:p-2 rounded-xl hover:bg-white/10 transition-all group max-w-[40px] w-full"
            title={mood.label}
          >
            <span className="text-2xl inline-block group-hover:scale-110 transition-transform origin-center">{mood.emoji}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
