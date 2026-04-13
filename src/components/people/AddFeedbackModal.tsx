import React, { useState } from 'react';
import { X, Send, Heart, ShieldAlert, Lock, Globe } from 'lucide-react';
import { FeedbackItem, UserProfile } from '../../types';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface AddFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  fromUser: UserProfile | null;
  onSuccess: () => void;
}

export default function AddFeedbackModal({ isOpen, onClose, targetUserId, fromUser, onSuccess }: AddFeedbackModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    type: 'kudo' as 'kudo' | 'feedback',
    isPrivate: false
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUser) return;
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/team_handler?action=add-feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: targetUserId,
          feedback: {
            text: formData.text,
            type: formData.type,
            isPrivate: formData.isPrivate
          }
        })
      });

      if (!res.ok) throw new Error('Erro ao enviar feedback');

      toast.success('Feedback enviado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-primary-500/5">
          <div>
            <h3 className="text-2xl font-bold">Enviar Feedback</h3>
            <p className="text-xs text-gray-500 mt-1">Reconheça ou sugira melhorias para o colega.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'kudo'})}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'kudo' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/10 text-gray-400 opacity-50'}`}
            >
              <Heart size={24} fill={formData.type === 'kudo' ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-black uppercase">Elogio (Kudo)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'feedback'})}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'feedback' ? 'border-primary-500 bg-primary-500/10 text-primary-500' : 'border-white/10 text-gray-400 opacity-50'}`}
            >
              <ShieldAlert size={24} />
              <span className="text-[10px] font-black uppercase">Feedback Técnico</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Mensagem</label>
            <textarea
              required
              rows={4}
              placeholder="Escreva sua mensagem aqui..."
              value={formData.text}
              onChange={e => setFormData({...formData, text: e.target.value})}
              className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              {formData.isPrivate ? <Lock size={16} className="text-amber-500" /> : <Globe size={16} className="text-emerald-500" />}
              <div>
                <p className="text-xs font-bold">{formData.isPrivate ? 'Privado' : 'Visibilidade Pública'}</p>
                <p className="text-[10px] text-gray-500">{formData.isPrivate ? 'Apenas o destinatário e RH verão.' : 'Toda a empresa poderá ver no mural.'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({...formData, isPrivate: !formData.isPrivate})}
              className={`w-12 h-6 rounded-full relative transition-all ${formData.isPrivate ? 'bg-amber-500' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPrivate ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
            Enviar Agora
          </button>
        </form>
      </div>
    </div>
  );
}
