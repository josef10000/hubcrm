import React, { useState, useEffect } from 'react';
import { Heart, Star, MessageSquare, Globe, ArrowRight, User as UserIcon, Megaphone } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { FeedbackNote } from '../../types/people';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export function RecentKudosWidget() {
  const { effectiveOrgId, teamProfiles } = useCRM();
  const [recentKudos, setRecentKudos] = useState<FeedbackNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId) return;

    // Regra: Ciclo de 24 horas (prazo de vida no dashboard)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Busca apenas feedbacks públicos das últimas 24h
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'feedbacks'),
      where('private', '==', false),
      where('date', '>=', twentyFourHoursAgo),
      orderBy('date', 'desc'),
      limit(6)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackNote));
      setRecentKudos(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching kudos feed:", error);
      // Se houver erro de index, tentamos sem o filtro de 24h para não quebrar a UI
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  if (loading) return null;
  if (recentKudos.length === 0) return null;

  const getTypeIcon = (kudo: FeedbackNote) => {
    if (kudo.isGlobal) return Megaphone;
    switch (kudo.type) {
      case 'Elogio': return Heart;
      case 'PDI': return Star;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (kudo: FeedbackNote) => {
    if (kudo.isGlobal) return 'text-purple-500 bg-purple-500/10';
    switch (kudo.type) {
      case 'Elogio': return 'text-pink-500 bg-pink-500/10';
      case 'PDI': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-primary-500 bg-primary-500/10';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <Globe size={16} className="text-primary-500" />
          Mural de Reconhecimento
        </h3>
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest animate-pulse">
          Últimas 24h
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode='popLayout'>
          {recentKudos.map((kudo, index) => {
            const author = teamProfiles.find(p => p.uid === kudo.authorId);
            const target = kudo.isGlobal ? null : teamProfiles.find(p => p.uid === kudo.userId);
            const Icon = getTypeIcon(kudo);
            const colorClass = getTypeColor(kudo);

            return (
              <motion.div
                key={kudo.id}
                layout
                initial={{ opacity: 0, scale: 0.9, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/40 dark:bg-black/20 backdrop-blur-xl border p-5 rounded-[2rem] shadow-lg hover:shadow-primary-500/5 transition-all group overflow-hidden relative ${kudo.isGlobal ? 'border-purple-500/30' : 'border-gray-200 dark:border-white/10'}`}
              >
                {/* Background Spark */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 blur-3xl rounded-full group-hover:opacity-100 opacity-50 transition-all ${kudo.isGlobal ? 'bg-purple-500/20' : 'bg-primary-500/5'}`}></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center -space-x-2">
                    <div className="w-8 h-8 rounded-xl border-2 border-white dark:border-zinc-900 bg-gray-200 dark:bg-white/10 overflow-hidden shadow-sm" title={`De: ${author?.displayName || '...'}`}>
                      {author?.photoURL ? <img src={author.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{author?.displayName?.[0]}</div>}
                    </div>
                    
                    {!kudo.isGlobal && (
                      <>
                        <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center dark:border-zinc-900 border-white border relative z-10">
                          <ArrowRight size={8} className="text-white" />
                        </div>
                        <div className="w-8 h-8 rounded-xl border-2 border-white dark:border-zinc-900 bg-gray-200 dark:bg-white/10 overflow-hidden shadow-sm" title={`Para: ${target?.displayName || '...'}`}>
                          {target?.photoURL ? <img src={target.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary-500">{target?.displayName?.[0]}</div>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className={`p-2 rounded-xl ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-900 dark:text-white">{author?.displayName?.split(' ')[0]}</span>
                    <span className="text-[10px] text-gray-500">{kudo.isGlobal ? 'avisou ao time:' : 'reconheceu'}</span>
                    {!kudo.isGlobal && <span className="text-[10px] font-bold text-primary-500">{target?.displayName?.split(' ')[0]}</span>}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 italic">
                    "{kudo.content}"
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {index === 0 ? '✨ Novo Agora' : formatDistanceToNow(kudo.date, { addSuffix: true, locale: ptBR })}
                    </span>
                    {kudo.isGlobal && <span className="text-[8px] font-black text-purple-500 uppercase">Empresarial</span>}
                    <div className="h-px bg-gray-100 dark:bg-white/5 flex-1 mx-3"></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
