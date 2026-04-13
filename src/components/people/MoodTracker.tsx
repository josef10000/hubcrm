import React, { useState, useEffect } from 'react';
import { Smile, Frown, Meh, Laugh, Angry, CheckCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { MoodUpdate } from '../../types/people';

export default function MoodTracker() {
  const { userProfile } = useAuth();
  const [lastUpdate, setLastUpdate] = useState<MoodUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchLastMood = async () => {
      if (!userProfile?.uid || !userProfile?.orgId) return;
      try {
        const q = query(
          collection(db, 'organizations', userProfile.orgId, 'mood_updates'),
          where('userId', '==', userProfile.uid),
          where('date', '==', today),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setLastUpdate({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MoodUpdate);
        }
      } catch (error) {
        console.error('Error fetching mood:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLastMood();
  }, [userProfile?.uid, userProfile?.orgId, today]);

  const handleMoodSelect = async (mood: MoodUpdate['mood']) => {
    if (!userProfile?.uid || !userProfile?.orgId) {
      toast.error('Perfil não carregado.');
      return;
    }
    
    try {
      const moodData: Omit<MoodUpdate, 'id'> = {
        userId: userProfile.uid,
        orgId: userProfile.orgId,
        date: today,
        mood,
        timestamp: Date.now()
      };
      
      const docRef = await addDoc(collection(db, 'organizations', userProfile.orgId, 'mood_updates'), moodData);
      setLastUpdate({ id: docRef.id, ...moodData });
      toast.success('Humor registrado! Tenha um ótimo dia.');
    } catch (error) {
      console.error('Mood save error:', error);
      toast.error('Erro ao registrar humor.');
    }
  };

  if (loading) return (
    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const moods: { type: MoodUpdate['mood'], icon: any, label: string, color: string }[] = [
    { type: 'very-good', icon: Laugh, label: 'Excelente', color: 'text-emerald-500' },
    { type: 'good', icon: Smile, label: 'Bom', color: 'text-blue-500' },
    { type: 'neutral', icon: Meh, label: 'Normal', color: 'text-gray-400' },
    { type: 'bad', icon: Frown, label: 'Ruim', color: 'text-orange-500' },
    { type: 'very-bad', icon: Angry, label: 'Péssimo', color: 'text-red-500' },
  ];

  return (
    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Como você está hoje?
        </h3>
        {lastUpdate && <CheckCircle size={16} className="text-emerald-500" />}
      </div>
      
      {lastUpdate ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">Humor registrado:</p>
          <div className="flex flex-col items-center">
            {moods.find(m => m.type === lastUpdate.mood)?.icon && React.createElement(moods.find(m => m.type === lastUpdate.mood)!.icon, { 
              size: 48, 
              className: `mx-auto ${moods.find(m => m.type === lastUpdate.mood)!.color}` 
            })}
            <p className="font-bold mt-2 text-gray-900 dark:text-white">
              {moods.find(m => m.type === lastUpdate.mood)?.label}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-2">
          {moods.map((m) => (
            <button
              key={m.type}
              onClick={() => handleMoodSelect(m.type)}
              className="flex flex-col items-center gap-1 group transition-all flex-1"
            >
              <div className={`p-3 rounded-2xl bg-gray-100 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 group-hover:scale-110 transition-all ${m.color} border border-transparent group-hover:border-gray-200 dark:group-hover:border-white/10`}>
                <m.icon size={28} />
              </div>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-all font-medium mt-1">
                {m.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
