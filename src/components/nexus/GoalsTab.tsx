import React from 'react';
import { motion } from 'framer-motion';
import { useNexusStore } from '@store/useNexusStore';
import { toast } from 'sonner';

interface GoalsTabProps {
  setModalConfig: (config: any) => void;
  confirm: (options: any) => Promise<boolean>;
}

export const GoalsTab: React.FC<GoalsTabProps> = ({ setModalConfig, confirm }) => {
  const goals = useNexusStore(state => state.goals);
  const setGoals = useNexusStore(state => state.setGoals);

  const handleUpdateGoal = (id: string, increment: boolean) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        return { ...g, current: Math.max(0, increment ? g.current + 1 : g.current - 1) };
      }
      return g;
    }));
  };

  const handleDeleteGoal = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Meta',
      message: 'Tem certeza que deseja excluir esta meta? O progresso será perdido.',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Meta removida');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {goals.map(goal => {
        const percent = Math.min(100, (goal.current / goal.target) * 100);
        return (
          <div key={goal.id} className="p-8 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl space-y-6 group relative">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'edit', data: goal })} className="p-2 bg-white/5 rounded-xl hover:bg-primary-500/20 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple" /></button>
              <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 bg-white/5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash" /></button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight">{goal.label}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Meta Individual</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl text-primary-400 border border-primary-500/30">
                <i className="ph-duotone ph-chart-line-up" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-black text-white">{goal.current} <span className="text-sm text-gray-500">/ {goal.target} {goal.unit}</span></span>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdateGoal(goal.id, true)} className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-500/40 transition-colors">+ Adicionar</button>
                    <button onClick={() => handleUpdateGoal(goal.id, false)} className="px-3 py-1 bg-white/5 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">- Reduzir</button>
                  </div>
                </div>
                <span className="text-sm font-black text-primary-400">{Math.round(percent)}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
              </div>
            </div>
          </div>
        );
      })}
      <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'add' })} className="p-8 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[220px]">
        <i className="ph-bold ph-plus-circle text-4xl group-hover:scale-110 transition-transform" />
        <span className="text-xs font-black uppercase tracking-[0.4em]">Criar Nova Meta</span>
      </button>
    </div>
  );
};
