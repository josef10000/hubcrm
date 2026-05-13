import React from 'react';
import { useNexusStore } from '@store/useNexusStore';
import type { NexusTask } from '@store/useNexusStore';
import { toast } from 'sonner';

export const TasksTab: React.FC = () => {
  const tasks = useNexusStore(state => state.tasks);
  const setTasks = useNexusStore(state => state.setTasks);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as any).taskInput;
    if (!input.value.trim()) return;
    const newTask: NexusTask = {
      id: Date.now().toString(),
      label: input.value,
      completed: false,
      createdAt: Date.now()
    };
    try {
      await setTasks([...tasks, newTask]);
      input.value = '';
    } catch (err) {
      toast.error('Erro ao salvar tarefa');
    }
  };

  const toggleTask = async (id: string) => {
    try {
      await setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    } catch (err) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa removida');
    } catch (err) {
      toast.error('Erro ao remover tarefa');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-10 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex flex-col min-h-[500px]">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl text-primary-400">
            <i className="ph-duotone ph-checks" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">Checklist de Tarefas</h3>
        </div>
        
        <form onSubmit={handleAddTask} className="flex gap-3 mb-10">
          <input
            name="taskInput"
            placeholder="O que você precisa fazer hoje?"
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:border-primary-500/50 transition-all font-medium"
          />
          <button type="submit" className="w-14 h-14 bg-primary-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-primary-500/20 hover:scale-105 transition-all">
            <i className="ph-bold ph-plus" />
          </button>
        </form>

        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
          {tasks.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 mt-10">
               <i className="ph-duotone ph-clipboard-text text-6xl" />
               <p className="text-sm font-bold uppercase tracking-widest">Nenhuma tarefa pendente</p>
            </div>
          )}
          {tasks.sort((a,b) => (a.completed ? 1 : -1)).map(task => (
            <div key={task.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${task.completed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => toggleTask(task.id)} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                  {task.completed && <i className="ph-bold ph-check text-xs" />}
                </button>
                <span className={`text-lg font-medium transition-all ${task.completed ? 'text-emerald-400/50 line-through' : 'text-gray-200'}`}>{task.label}</span>
              </div>
              <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-600 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash text-lg" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
