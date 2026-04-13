import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Brain, Code } from 'lucide-react';
import { Skill, SkillMatrix } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { toast } from 'sonner';

interface EditSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  initialSkills?: SkillMatrix;
  onSuccess: () => void;
}

export default function EditSkillsModal({ isOpen, onClose, targetUserId, initialSkills, onSuccess }: EditSkillsModalProps) {
  const { softSkillsPool } = useCRM();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<SkillMatrix>(initialSkills || { hard: [], soft: [] });
  const [newSkill, setNewSkill] = useState({ name: '', type: 'hard' as 'hard' | 'soft' });

  if (!isOpen) return null;

  const handleLevelChange = (type: 'hard' | 'soft', name: string, level: number) => {
    const updated = [...skills[type]];
    const index = updated.findIndex(s => s.name === name);
    if (index >= 0) {
      updated[index] = { ...updated[index], level };
    } else {
      updated.push({ name, level });
    }
    setSkills({ ...skills, [type]: updated });
  };

  const removeSkill = (type: 'hard' | 'soft', name: string) => {
    setSkills({
      ...skills,
      [type]: skills[type].filter(s => s.name !== name)
    });
  };

  const addNewSkill = () => {
    if (!newSkill.name.trim()) return;
    if (skills[newSkill.type].some(s => s.name === newSkill.name)) {
      toast.error('Esta competência já existe!');
      return;
    }
    const updated = [...skills[newSkill.type], { name: newSkill.name, level: 3 }];
    setSkills({ ...skills, [newSkill.type]: updated });
    setNewSkill({ ...newSkill, name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Garantir que as soft skills apenas contenham o que está no pool atual
      const filteredSoft = skills.soft.filter(s => softSkillsPool.includes(s.name));
      const submissionSkills = { ...skills, soft: filteredSoft };

      const idToken = typeof window !== 'undefined' ? (await (window as any).getAuthToken?.()) || "" : "";
      const res = await fetch(`/api/team_handler?action=update-skills`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ targetUid: targetUserId, skills: submissionSkills })
      });

      if (!res.ok) throw new Error('Falha ao atualizar competências');

      toast.success('Matriz de competências atualizada!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar competências');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-primary-500/5">
          <div>
            <h3 className="text-2xl font-bold">Mapeamento de Competências</h3>
            <p className="text-xs text-gray-500 mt-1">Defina os níveis de 1 a 5 para cada habilidade.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* HARD SKILLS */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-primary-500">
              <Code size={20} />
              <h4 className="text-sm font-black uppercase tracking-widest">Hard Skills</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.hard.map(s => (
                <div key={s.name} className="p-4 bg-primary-500/5 dark:bg-primary-500/5 rounded-2xl border border-primary-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeSkill('hard', s.name)} className="text-red-500 hover:scale-110 transition-all"><Trash2 size={14}/></button>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleLevelChange('hard', s.name, v)}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${s.level >= v ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {skills.hard.length === 0 && (
                <div className="md:col-span-2 py-8 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl text-gray-400 text-sm italic">
                  Nenhuma hard skill adicionada. Adicione uma abaixo.
                </div>
              )}
            </div>
          </section>

          {/* SOFT SKILLS */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-500">
              <Brain size={20} />
              <h4 className="text-sm font-black uppercase tracking-widest">Soft Skills (Pool Global)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {softSkillsPool.map(name => {
                const s = skills.soft.find(sk => sk.name === name);
                const level = s?.level || 0;
                return (
                  <div key={name} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-sm font-medium">{name}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleLevelChange('soft', name, v)}
                          className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${level >= v ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ADD CUSTOM HARD SKILL */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Adicionar Hard Skill Personalizada</h4>
            <div className="flex gap-4 p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <input
                type="text"
                placeholder="Ex: Marketing Digital, Python, Gestão Comercial..."
                value={newSkill.name}
                onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                onKeyPress={e => e.key === 'Enter' && addNewSkill()}
                className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button
                onClick={addNewSkill}
                className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={16}/> Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            Salvar Matriz PDI
          </button>
        </div>
      </div>
    </div>
  );
}
