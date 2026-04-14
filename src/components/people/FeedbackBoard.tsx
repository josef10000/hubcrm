import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Heart, AlertCircle, Plus, Trash2, Shield, Lock, Globe } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { FeedbackNote } from '../../types/people';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FeedbackBoardProps {
  userId: string;
}

export default function FeedbackBoard({ userId }: FeedbackBoardProps) {
  const { userProfile: currentUser } = useAuth();
  const { effectiveOrgId, teamProfiles } = useCRM();
  const [feedbacks, setFeedbacks] = useState<FeedbackNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState<Partial<FeedbackNote>>({
    type: 'Feedback',
    private: true
  });

  useEffect(() => {
    if (!effectiveOrgId || !userId) return;
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'feedbacks'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackNote));
      
      // Filtro de Privacidade:
      const canSeePrivate = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente' || currentUser?.role === 'People & Culture';
      
      const filtered = loaded.filter(f => {
        if (!f.private) return true; // Público todos vêem
        if (f.authorId === currentUser?.uid) return true; // Eu escrevi
        if (f.userId === currentUser?.uid && !f.private) return true; // É pra mim e é público
        return canSeePrivate; // Eu sou gestor
      });
      
      setFeedbacks(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [effectiveOrgId, userId, currentUser?.uid, currentUser?.role]);

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.content) return;
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'feedbacks'), {
        ...newFeedback,
        userId,
        authorId: currentUser?.uid,
        date: Date.now(),
        orgId: effectiveOrgId
      });
      setShowAddForm(false);
      setNewFeedback({ type: 'Feedback', private: true });
      toast.success('Feedback registrado!');
    } catch (error) {
      console.error('Feedback save error:', error);
      toast.error('Erro ao salvar feedback.');
    }
  };

  const handleRemoveFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'feedbacks', id));
      toast.success('Registro removido.');
    } catch (error) {
      toast.error('Erro ao remover registro.');
    }
  };

  const getTypeIcon = (type: FeedbackNote['type']) => {
    switch (type) {
      case 'Elogio': return Heart;
      case 'Atenção': return AlertCircle;
      case 'PDI': return Star;
      default: return MessageSquare;
    }
  };

  const getBadgeColor = (type: FeedbackNote['type']) => {
    switch (type) {
      case 'Elogio': return 'bg-pink-500/10 text-pink-500';
      case 'Atenção': return 'bg-red-500/10 text-red-500';
      case 'PDI': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  const isAdminOrManager = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente' || currentUser?.role === 'People & Culture';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Mural de Feedbacks & Reconhecimento
        </h3>
        {isAdminOrManager && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20 flex items-center gap-1 hover:bg-primary-600 transition-all font-sans"
          >
            <Plus size={16} /> Novo Registro
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddFeedback} className="bg-white/80 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-200 dark:border-white/10 animate-in slide-in-from-top mb-8 shadow-xl">
          <div className="mb-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Conteúdo do Feedback</label>
            <textarea 
              required
              rows={3}
              className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 dark:text-white"
              placeholder="Descreva o feedback, elogio ou ponto de atenção..."
              value={newFeedback.content || ''}
              onChange={e => setNewFeedback({...newFeedback, content: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Tipo de Registro</label>
              <select 
                className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white font-medium"
                value={newFeedback.type}
                onChange={e => setNewFeedback({...newFeedback, type: e.target.value as any})}
              >
                <option value="Feedback">Feedback Geral</option>
                <option value="Elogio">Elogio (Reconhecimento)</option>
                <option value="PDI">Vínculo com PDI</option>
                <option value="Atenção">Ponto de Atenção</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Visibilidade</label>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/10">
                <button 
                  type="button" 
                  onClick={() => setNewFeedback({...newFeedback, private: false})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${!newFeedback.private ? 'bg-white dark:bg-black/40 text-primary-500 shadow-sm' : 'text-gray-400'}`}
                >
                  <Globe size={14} /> Público
                </button>
                <button 
                  type="button" 
                  onClick={() => setNewFeedback({...newFeedback, private: true})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${newFeedback.private ? 'bg-white dark:bg-black/40 text-primary-500 shadow-sm' : 'text-gray-400'}`}
                >
                  <Lock size={14} /> Privado
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-primary-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all">Registrar Agora</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 text-gray-500 font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {feedbacks.map(f => {
          const Icon = getTypeIcon(f.type);
          const author = teamProfiles.find(p => p.uid === f.authorId);
          return (
            <div key={f.id} className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-6 rounded-[2rem] shadow-sm relative group overflow-hidden">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-3xl ${getBadgeColor(f.type)} shrink-0`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Escrito por</span>
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex items-center justify-center">
                           {author?.photoURL ? <img src={author.photoURL} alt="" /> : <span className="text-[8px] font-bold">{author?.displayName?.[0]}</span>}
                        </div>
                        <span className="text-[10px] font-bold dark:text-white">{author?.displayName || 'Desconhecido'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 font-medium">{format(f.date, "dd 'de' MMMM", { locale: ptBR })}</span>
                      {f.private ? (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Lock size={10} /> Privado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Globe size={10} /> Público
                        </div>
                      )}
                      {(currentUser?.role === 'Administrador' || f.authorId === currentUser?.uid) && (
                        <button onClick={() => handleRemoveFeedback(f.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-all ml-2">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed whitespace-pre-line">{f.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        {feedbacks.length === 0 && !loading && (
          <div className="py-20 text-center opacity-40">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhum feedback registrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
