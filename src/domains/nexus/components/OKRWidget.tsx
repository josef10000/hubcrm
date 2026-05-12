import React, { useState } from 'react';
import { Target, ChevronRight, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { Objective, KeyResult } from '@/types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

export function OKRWidget() {
  const okrs = useCRMStore(state => state.okrs);
  const handleSaveObjective = useCRMStore(state => state.handleSaveObjective);
  const handleDeleteObjective = useCRMStore(state => state.handleDeleteObjective);
  const currentUserId = useCRMStore(state => state.currentUserId);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const [editingKR, setEditingKR] = useState<{ objectiveId: string; krId: string } | null>(null);
  const [krEditForm, setKrEditForm] = useState<{ title: string; targetValue: number; metric: string }>({ title: '', targetValue: 100, metric: '%' });
  
  // Exibiremos os OKRs do usuário e da companhia
  const myOkrs = okrs?.filter(o => o.ownerId === currentUserId || o.type === 'company') || [];

  const handleAddOKR = () => {
    if (!newTitle.trim() || !currentUserId) return;
    
    const newObjective: Partial<Objective> = {
      title: newTitle,
      ownerId: currentUserId,
      type: 'individual',
      progress: 0,
      period: 'Atual',
      keyResults: []
    };
    
    handleSaveObjective(newObjective);
    setNewTitle('');
    setIsAdding(false);
  };

  const handleUpdateKR = (objective: Objective, krId: string, newValue: number) => {
    const updatedKRs = objective.keyResults.map(kr => {
      if (kr.id === krId) {
        return { ...kr, currentValue: newValue };
      }
      return kr;
    });

    // Recalcular progresso geral
    const totalProgress = updatedKRs.reduce((acc, kr) => {
      const percentage = Math.min(100, Math.max(0, ((kr.currentValue - kr.initialValue) / (kr.targetValue - kr.initialValue)) * 100));
      return acc + (isNaN(percentage) ? 0 : percentage);
    }, 0);

    const averageProgress = updatedKRs.length > 0 ? Math.round(totalProgress / updatedKRs.length) : 0;

    handleSaveObjective({
      ...objective,
      progress: averageProgress,
      keyResults: updatedKRs
    });
  };

  const openEditKR = (objectiveId: string, kr: KeyResult) => {
    setEditingKR({ objectiveId, krId: kr.id });
    setKrEditForm({ title: kr.title, targetValue: kr.targetValue, metric: kr.metric });
  };

  const saveEditKR = (objective: Objective) => {
    if (!editingKR) return;
    const updatedKRs = objective.keyResults.map(kr => {
      if (kr.id === editingKR.krId) {
        return { 
          ...kr, 
          title: krEditForm.title, 
          targetValue: Number(krEditForm.targetValue) || 0, 
          metric: krEditForm.metric 
        };
      }
      return kr;
    });

    const totalProgress = updatedKRs.reduce((acc, kr) => {
      const targetDiff = kr.targetValue - kr.initialValue;
      if (targetDiff === 0) return acc;
      const percentage = Math.min(100, Math.max(0, ((kr.currentValue - kr.initialValue) / targetDiff) * 100));
      return acc + (isNaN(percentage) ? 0 : percentage);
    }, 0);

    const averageProgress = updatedKRs.length > 0 ? Math.round(totalProgress / updatedKRs.length) : 0;

    handleSaveObjective({
      ...objective,
      progress: averageProgress,
      keyResults: updatedKRs
    });
    setEditingKR(null);
  };

  const addKeyResult = (objective: Objective) => {
    const newKR: KeyResult = {
      id: Math.random().toString(36).substring(7),
      title: 'Novo Key Result',
      initialValue: 0,
      currentValue: 0,
      targetValue: 100,
      metric: '%'
    };

    handleSaveObjective({
      ...objective,
      keyResults: [...objective.keyResults, newKR]
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Objetivos & Key Results</h3>
            <p className="text-sm text-gray-400">Alinhamento Estratégico</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
          <input
            type="text"
            placeholder="Qual o seu novo grande objetivo?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-3"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAddOKR}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Criar Objetivo
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {myOkrs.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum OKR definido para este ciclo.</p>
          </div>
        ) : (
          myOkrs.map((okr) => (
            <div key={okr.id} className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                {/* Gráfico Radial de Progresso */}
                <div className="w-16 h-16 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" cy="50%" 
                      innerRadius="80%" outerRadius="100%" 
                      barSize={6} 
                      data={[{ name: 'Progress', value: okr.progress, fill: okr.progress >= 70 ? '#10B981' : okr.progress >= 30 ? '#F59E0B' : '#EF4444' }]} 
                      startAngle={90} endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{okr.progress}%</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${okr.type === 'company' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {okr.type === 'company' ? 'Global' : 'Pessoal'}
                      </span>
                      <h4 className="text-sm font-medium text-white">{okr.title}</h4>
                    </div>
                    {okr.type !== 'company' && (
                      <button 
                        onClick={() => handleDeleteObjective(okr.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Results */}
              <div className="bg-white/5 px-4 py-3 border-t border-white/5">
                <div className="space-y-3">
                  {okr.keyResults?.map(kr => {
                    const isEditing = editingKR?.krId === kr.id;
                    
                    if (isEditing) {
                      return (
                        <div key={kr.id} className="flex flex-col gap-2 p-2 bg-black/40 rounded-lg border border-white/10">
                          <input 
                            type="text" 
                            value={krEditForm.title}
                            onChange={e => setKrEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-transparent border-b border-white/20 text-white text-xs px-1 py-1 focus:outline-none focus:border-blue-500"
                            placeholder="Título"
                          />
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={krEditForm.targetValue}
                              onChange={e => setKrEditForm(prev => ({ ...prev, targetValue: Number(e.target.value) }))}
                              className="bg-transparent border-b border-white/20 text-white text-xs px-1 py-1 w-20 focus:outline-none focus:border-blue-500"
                              placeholder="Meta"
                            />
                            <input 
                              type="text" 
                              value={krEditForm.metric}
                              onChange={e => setKrEditForm(prev => ({ ...prev, metric: e.target.value }))}
                              className="bg-transparent border-b border-white/20 text-white text-xs px-1 py-1 w-16 focus:outline-none focus:border-blue-500"
                              placeholder="Métrica"
                            />
                            <div className="flex ml-auto gap-1">
                              <button onClick={() => setEditingKR(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button>
                              <button onClick={() => saveEditKR(okr)} className="p-1 text-blue-400 hover:text-blue-300"><Check className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={kr.id} className="flex flex-col gap-1 group">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{kr.title}</span>
                            {okr.type !== 'company' && (
                              <button 
                                onClick={() => openEditKR(okr.id, kr)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <span className="text-gray-400">{kr.currentValue} / {kr.targetValue} {kr.metric}</span>
                        </div>
                        <input 
                          type="range" 
                          min={kr.initialValue} 
                          max={kr.targetValue} 
                          value={kr.currentValue}
                          onChange={(e) => handleUpdateKR(okr, kr.id, Number(e.target.value))}
                          className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          disabled={okr.type === 'company'}
                        />
                      </div>
                    );
                  })}
                  {okr.type !== 'company' && (
                    <button 
                      onClick={() => addKeyResult(okr)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                    >
                      <Plus className="w-3 h-3" /> Add Key Result
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
