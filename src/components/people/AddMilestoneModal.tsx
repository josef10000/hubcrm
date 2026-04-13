import React, { useState } from 'react';
import { X, Plus, Trophy, Briefcase, GraduationCap, Calendar, Star } from 'lucide-react';
import { CareerMilestone } from '../../types';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  onSuccess: () => void;
}

const MILESTONE_TYPES: { value: CareerMilestone['type']; label: string; icon: any }[] = [
  { value: 'hired', label: 'Entrada na Empresa', icon: <Calendar size={18} /> },
  { value: 'promotion', label: 'Promoção / Mudança de Cargo', icon: <Trophy size={18} /> },
  { value: 'milestone', label: 'Meta Épica / Marco', icon: <Star size={18} /> },
  { value: 'certification', label: 'Certificação / Curso', icon: <GraduationCap size={18} /> }
];

export default function AddMilestoneModal({ isOpen, onClose, targetUserId, onSuccess }: AddMilestoneModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'milestone' as CareerMilestone['type'],
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/team_handler?action=add-milestone`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: targetUserId,
          milestone: {
            title: formData.title,
            type: formData.type,
            date: new Date(formData.date + 'T12:00:00').getTime(),
            description: formData.description
          }
        })
      });

      if (!res.ok) throw new Error('Erro ao adicionar marco');

      toast.success('Marco adicionado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar marco');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-primary-500/5">
          <div>
            <h3 className="text-2xl font-bold">Adicionar Marco</h3>
            <p className="text-xs text-gray-500 mt-1">Registre as conquistas na linha do tempo profissional.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Evento</label>
            <div className="grid grid-cols-2 gap-2">
              {MILESTONE_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({...formData, type: type.value})}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${formData.type === type.value ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'}`}
                >
                  {type.icon}
                  <span className="text-[10px] font-bold uppercase">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Título da Conquista</label>
            <input
              required
              type="text"
              placeholder="Ex: Promovido a Consultor Senior"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Data</label>
            <input
              required
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Descrição (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Detalhes sobre esta conquista..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium resize-none"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
            Salvar na Timeline
          </button>
        </form>
      </div>
    </div>
  );
}
