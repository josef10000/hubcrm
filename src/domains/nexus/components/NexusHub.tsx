import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexusStore, NoteFolder, NexusNote, PersonalGoal, NexusTask, PersonalLink } from '@store/useNexusStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Nexus3DWorkspace } from './Nexus3DWorkspace';

interface NexusHubProps {
  confirm: (options: any) => Promise<boolean>;
  setModalConfig: (config: any) => void;
}

export const NexusHub: React.FC<NexusHubProps> = ({ confirm, setModalConfig }) => {
  const notes = useNexusStore(state => state.notes);
  const noteFolders = useNexusStore(state => state.noteFolders);
  const goals = useNexusStore(state => state.goals);
  const tasks = useNexusStore(state => state.tasks);
  const vaultLinks = useNexusStore(state => state.links);
  const vaultFolders = useNexusStore(state => state.folders);
  const books = useNexusStore(state => state.books);

  // Actions
  const addNote = useNexusStore(state => state.addNote);
  const updateNote = useNexusStore(state => state.updateNote);
  const deleteNote = useNexusStore(state => state.deleteNote);
  const addNoteFolder = useNexusStore(state => state.addNoteFolder);
  const updateNoteFolder = useNexusStore(state => state.updateNoteFolder);
  const deleteNoteFolder = useNexusStore(state => state.deleteNoteFolder);
  const setGoals = useNexusStore(state => state.setGoals);
  const setTasks = useNexusStore(state => state.setTasks);
  const setVaultLinks = useNexusStore(state => state.setLinks);

  // UI State (Inicia OBRIGATORIAMENTE em 'dashboard' 2D clássico para evitar travamentos)
  const [viewMode, setViewMode] = useState<'explorer' | 'dashboard' | 'immersive3d'>('dashboard');
  const [activeEntity, setActiveEntity] = useState<{ id: string, type: 'note' | 'goal' | 'task' | 'vault' } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskLabel, setEditingTaskLabel] = useState('');

  // Sincronizar folders abertos
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Componente Recursivo para Tree View
  const TreeItem = ({ folderId, level = 0 }: { folderId: string | '', level?: number }) => {
    const subFolders = noteFolders.filter(f => f.parentId === folderId);
    const folderNotes = notes.filter(n => n.folderId === folderId);
    const folder = noteFolders.find(f => f.id === folderId);
    const isExpanded = expandedFolders.has(folderId);

    return (
      <div className="space-y-1">
        {folder && (
          <div 
            className="group flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all relative"
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => toggleFolder(folderId)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, folderId)}
          >
            <i className={`ph-fill ph-caret-right text-[10px] transition-transform ${isExpanded ? 'rotate-90' : ''} text-gray-600`} />
            <i className={`ph-duotone ${isExpanded ? 'ph-folder-open' : 'ph-folder'} text-primary-400`} />
            
            {editingId === folderId ? (
              <input 
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => handleRenameFolder(folderId)}
                onKeyDown={e => e.key === 'Enter' && handleRenameFolder(folderId)}
                className="bg-white/10 border-none rounded px-1 text-[11px] font-bold text-white outline-none w-full"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-[11px] font-bold text-gray-300 truncate flex-1">{folder.name}</span>
            )}

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddNote(folderId); }} 
                className="p-1 hover:text-primary-400"
                title="Nova Nota"
              >
                <i className="ph ph-plus" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingId(folderId); setEditingName(folder.name); }} 
                className="p-1 hover:text-amber-400"
                title="Renomear"
              >
                <i className="ph ph-pencil-simple" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folderId); }} 
                className="p-1 hover:text-rose-500"
                title="Excluir Pasta"
              >
                <i className="ph ph-trash" />
              </button>
            </div>
          </div>
        )}

        {(isExpanded || !folderId) && (
          <div className="space-y-1">
            {subFolders.map(sf => <TreeItem key={sf.id} folderId={sf.id} level={folderId ? level + 1 : level} />)}
            {folderNotes.map(note => (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id, 'note')}
                onClick={() => { setActiveEntity({ id: note.id, type: 'note' }); setViewMode('explorer'); }}
                className={`group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all relative ${activeEntity?.id === note.id ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'hover:bg-white/5 text-gray-500'}`}
                style={{ paddingLeft: `${(folderId ? level + 1 : level) * 12 + 24}px` }}
              >
                <i className="ph ph-file-text text-sm opacity-40" />
                
                {editingId === note.id ? (
                  <input 
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleRenameNote(note.id)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameNote(note.id)}
                    className="bg-white/10 border-none rounded px-1 text-[11px] font-bold text-white outline-none w-full"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-[11px] font-bold truncate flex-1">{note.title || 'Sem título'}</span>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingId(note.id); setEditingName(note.title); }} 
                    className="p-1 hover:text-amber-400"
                    title="Renomear"
                  >
                    <i className="ph ph-pencil-simple" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} 
                    className="p-1 hover:text-rose-500"
                    title="Excluir Nota"
                  >
                    <i className="ph ph-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handlers de Gerenciamento
  const handleRenameFolder = async (id: string) => {
    if (editingName.trim()) await updateNoteFolder(id, { name: editingName });
    setEditingId(null);
  };

  const handleRenameNote = async (id: string) => {
    if (editingName.trim()) await updateNote(id, { title: editingName });
    setEditingId(null);
  };

  const handleDeleteFolder = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Pasta',
      message: 'Tem certeza que deseja excluir esta pasta? Todas as subpastas e notas serão movidas para a raiz.',
      confirmText: 'Sim, Excluir',
      type: 'danger'
    });
    if (confirmed) await deleteNoteFolder(id);
  };

  const handleDeleteNote = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Nota',
      message: 'Tem certeza que deseja excluir esta nota permanentemente?',
      confirmText: 'Sim, Excluir',
      type: 'danger'
    });
    if (confirmed) {
      await deleteNote(id);
      if (activeEntity?.id === id) setActiveEntity(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Tarefa',
      message: 'Deseja remover esta tarefa da sua lista?',
      confirmText: 'Sim, Excluir',
      type: 'danger'
    });
    if (confirmed) {
      const updatedTasks = tasks.filter(t => t.id !== id);
      await setTasks(updatedTasks);
    }
  };

  const handleAddTask = async () => {
    const newTask: NexusTask = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Nova Tarefa',
      completed: false,
      createdAt: Date.now()
    };
    await setTasks([...tasks, newTask]);
    setEditingTaskId(newTask.id);
    setEditingTaskLabel(newTask.label);
  };

  const handleRenameTask = async (id: string) => {
    if (editingTaskLabel.trim()) {
      const updatedTasks = tasks.map(t => t.id === id ? { ...t, label: editingTaskLabel } : t);
      await setTasks(updatedTasks);
    }
    setEditingTaskId(null);
  };

  const handleDeleteGoal = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Meta',
      message: 'Tem certeza que deseja excluir esta meta estratégica? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Excluir',
      type: 'danger'
    });
    if (confirmed) {
      const updatedGoals = goals.filter(g => g.id !== id);
      await setGoals(updatedGoals);
      if (activeEntity?.id === id) setActiveEntity(null);
    }
  };

  // Handlers de Criação
  const handleAddNote = async (folderId?: string) => {
    const tId = toast.loading('Criando nota...');
    const id = await addNote({ title: 'Nova Nota', content: '', folderId: folderId || '', updatedAt: Date.now() });
    if (id) {
      setActiveEntity({ id, type: 'note' });
      if (folderId) toggleFolder(folderId);
      toast.success('Nota pronta!', { id: tId });
    } else {
      toast.error('Erro ao criar nota', { id: tId });
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'note' | 'folder') => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | '') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('id');
    const type = e.dataTransfer.getData('type');
    if (type === 'note') await updateNote(id, { folderId: targetFolderId });
    else if (type === 'folder' && id !== targetFolderId) await updateNoteFolder(id, { parentId: targetFolderId });
  };

  // Entidade Ativa
  const activeNote = activeEntity?.type === 'note' ? notes.find(n => n.id === activeEntity.id) : null;
  const activeGoal = activeEntity?.type === 'goal' ? goals.find(g => g.id === activeEntity.id) : null;

  return (
    <div className="flex gap-6 h-[800px] text-white">
      {/* 1. SIDEBAR: UNIFIED EXPLORER */}
      <div className="w-80 flex flex-col gap-6 bg-[#0a0c12]/40 rounded-[3rem] border border-white/5 p-6 shadow-2xl overflow-hidden group">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Nexus Hub</h3>
            <span className="text-[9px] font-bold text-primary-500/50 uppercase">Intelligence OS v1.0</span>
          </div>
          <div className="flex gap-1">
             <button onClick={() => setViewMode('dashboard')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${viewMode === 'dashboard' ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`} title="Dashboard"><i className="ph ph-squares-four" /></button>
             <button onClick={() => setViewMode('immersive3d')} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${viewMode === 'immersive3d' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-amber-500/10 hover:text-amber-400'}`} title="Escritório Virtual 3D"><i className="ph-duotone ph-cube text-base" /></button>
          </div>
        </div>

        <div className="relative group/search">
           <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/search:text-primary-400 transition-colors" />
           <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar em tudo..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white placeholder-gray-700 focus:border-primary-500/30 outline-none transition-all"
           />
        </div>

        {/* Tree Explorer */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-1" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, '')}>
          
          {/* Seção: Metas Estratégicas */}
          <div className="space-y-1">
             <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Metas</span>
                <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'add' })} className="text-gray-700 hover:text-primary-400"><i className="ph-bold ph-plus" /></button>
             </div>
             {goals.map(goal => (
               <div 
                key={goal.id}
                className={`group w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative ${activeEntity?.id === goal.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-white/5 text-gray-500'}`}
               >
                  <div 
                    onClick={() => { setActiveEntity({ id: goal.id, type: 'goal' }); setViewMode('explorer'); }}
                    className="flex-1 flex items-center gap-3 cursor-pointer overflow-hidden"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-bold truncate">{goal.label}</span>
                    <span className="text-[9px] opacity-40 ml-auto shrink-0">{Math.round((goal.current / goal.target) * 100)}%</span>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button 
                      onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'edit', data: goal })}
                      className="p-1 hover:text-amber-400"
                      title="Editar"
                    >
                      <i className="ph ph-pencil-simple" />
                    </button>
                    <button 
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 hover:text-rose-500"
                      title="Excluir"
                    >
                      <i className="ph ph-trash" />
                    </button>
                  </div>
               </div>
             ))}
          </div>

          {/* Seção: Tarefas Ativas */}
          <div className="space-y-1">
             <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Tarefas</span>
                <div className="flex gap-1">
                  <button onClick={handleAddTask} className="text-gray-700 hover:text-amber-400" title="Adicionar Tarefa"><i className="ph-bold ph-plus" /></button>
                  <button onClick={() => setViewMode('dashboard')} className="text-gray-700 hover:text-amber-400" title="Ver Dashboard"><i className="ph-bold ph-arrow-square-out" /></button>
                </div>
             </div>
             {tasks.slice(0, 5).map(task => (
               <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-gray-500 group relative">
                  <div 
                    onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                    className={`w-4 h-4 rounded-md border-2 border-amber-500/30 flex items-center justify-center cursor-pointer ${task.completed ? 'bg-amber-500 border-amber-500' : ''}`}
                  >
                    {task.completed && <i className="ph ph-check text-[10px] text-white" />}
                  </div>
                  <span className={`text-[11px] font-bold truncate flex-1 ${task.completed ? 'line-through opacity-30' : ''}`}>{task.label}</span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all"
                  >
                    <i className="ph ph-trash" />
                  </button>
               </div>
             ))}
          </div>

          {/* Seção: Notas & Conhecimento (Pastas) */}
          <div className="space-y-1">
             <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Conhecimento</span>
                <div className="flex gap-1">
                  <button onClick={() => handleAddNote()} className="text-gray-700 hover:text-primary-400"><i className="ph-bold ph-note-pencil" /></button>
                  <button onClick={() => addNoteFolder({ name: 'Nova Pasta', parentId: '', isOpen: true })} className="text-gray-700 hover:text-primary-400"><i className="ph-bold ph-folder-plus" /></button>
                </div>
             </div>
             
             <TreeItem folderId="" />
          </div>
        </div>
      </div>

      {/* 2. CENTER: DYNAMIC CANVAS */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full h-full bg-[#0a0c12]/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-2">
                  <h2 className="text-4xl font-black text-white tracking-tighter">Daily Briefing</h2>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Sincronia Total de Inteligência e Ação</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
                        <i className="ph-bold ph-target" /> Metas em Foco
                      </h4>
                      <div className="space-y-4">
                        {goals.slice(0, 3).map(g => (
                          <div key={g.id} className="group space-y-2 relative">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="flex-1 truncate">{g.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400">{Math.round((g.current/g.target)*100)}%</span>
                                <button 
                                  onClick={() => handleDeleteGoal(g.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all"
                                >
                                  <i className="ph ph-trash" />
                                </button>
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(g.current/g.target)*100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 flex items-center gap-2">
                          <i className="ph-bold ph-checks" /> Tarefas Críticas
                        </h4>
                        <button 
                          onClick={handleAddTask}
                          className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"
                          title="Nova Tarefa"
                        >
                          <i className="ph-bold ph-plus" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {tasks.filter(t => !t.completed).slice(0, 5).map(t => (
                          <div key={t.id} className="group flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-all relative">
                             <div 
                              onClick={() => setTasks(tasks.map(task => task.id === t.id ? { ...task, completed: true } : task))}
                              className="w-5 h-5 rounded-md border-2 border-amber-500/30 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-all"
                             >
                               <i className="ph ph-check text-[10px] text-amber-500 opacity-0 hover:opacity-100" />
                             </div>
                             
                             {editingTaskId === t.id ? (
                               <input 
                                autoFocus
                                value={editingTaskLabel}
                                onChange={e => setEditingTaskLabel(e.target.value)}
                                onBlur={() => handleRenameTask(t.id)}
                                onKeyDown={e => e.key === 'Enter' && handleRenameTask(t.id)}
                                className="flex-1 bg-white/10 border-none rounded px-2 py-1 text-sm font-bold text-white outline-none"
                               />
                             ) : (
                               <span className="text-[13px] font-bold text-gray-200 flex-1">{t.label}</span>
                             )}

                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => { setEditingTaskId(t.id); setEditingTaskLabel(t.label); }}
                                  className="p-1.5 rounded-lg hover:bg-amber-500/20 text-gray-500 hover:text-amber-400 transition-all"
                                  title="Editar"
                                >
                                  <i className="ph ph-pencil-simple" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-500 hover:text-rose-500 transition-all"
                                  title="Excluir"
                                >
                                  <i className="ph ph-trash" />
                                </button>
                             </div>
                          </div>
                        ))}
                        {tasks.filter(t => !t.completed).length === 0 && (
                          <div className="py-8 text-center space-y-2 opacity-20">
                            <i className="ph ph-sparkle text-3xl" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Tudo em dia!</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 flex items-center gap-2">
                    <i className="ph-bold ph-clock-counter-clockwise" /> Notas Recentes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.slice(0, 6).map(n => (
                      <button 
                        key={n.id} 
                        onClick={() => { setActiveEntity({ id: n.id, type: 'note' }); setViewMode('explorer'); }}
                        className="p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl text-left transition-all group"
                      >
                         <i className="ph-duotone ph-file-text text-2xl text-primary-500/40 mb-3 group-hover:scale-110 transition-transform" />
                         <h5 className="text-[11px] font-bold text-white truncate">{n.title || 'Sem título'}</h5>
                         <p className="text-[9px] text-gray-500 font-medium mt-1 uppercase tracking-widest">{format(n.updatedAt, 'dd MMM')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          ) : viewMode === 'immersive3d' ? (
            <motion.div 
              key="immersive3d" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full h-full"
            >
              <Nexus3DWorkspace 
                onOpenBook={(bookId) => {
                  const targetBook = books.find(b => b.id === bookId);
                  if (targetBook) {
                    if (targetBook.linkedNoteId) {
                      setActiveEntity({ id: targetBook.linkedNoteId, type: 'note' });
                      setViewMode('explorer');
                    } else {
                      toast.info(`Selecionado: "${targetBook.title}". Abra-o no leitor 2D ou vincule uma anotação.`);
                    }
                  }
                }}
                onOpenNote={(noteId) => {
                  setActiveEntity({ id: noteId, type: 'note' });
                  setViewMode('explorer');
                }}
                onOpenNotesTab={() => {
                  const firstNote = notes[0];
                  if (firstNote) {
                    setActiveEntity({ id: firstNote.id, type: 'note' });
                    setViewMode('explorer');
                  } else {
                    handleAddNote();
                  }
                }}
                onOpenLinksTab={() => {
                  toast.success("Pastas de recursos ativas! Você pode gerenciá-las através dos favoritos e da central de conhecimento.");
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="explorer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full">
              {activeNote ? (
                <div className="w-full h-full bg-[#0a0c12]/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 flex flex-col gap-8 shadow-2xl relative">
                   <div className="flex items-center justify-between">
                       <input 
                        value={activeNote.title}
                        onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                        placeholder="Título da nota..."
                        className="bg-transparent text-4xl font-black border-none focus:ring-0 w-full placeholder:text-white/5"
                       />
                       <button onClick={() => deleteNote(activeNote.id)} className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><i className="ph-bold ph-trash text-lg" /></button>
                   </div>
                   <textarea 
                    value={activeNote.content}
                    onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                    placeholder="Comece a escrever... Use [[Nome]] para conectar com Metas, Notas ou Tarefas."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none custom-scrollbar text-xl text-gray-300 leading-relaxed placeholder:text-white/5"
                   />
                </div>
              ) : activeGoal ? (
                <div className="w-full h-full bg-[#0a0c12]/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 flex flex-col items-center justify-center text-center gap-10 shadow-2xl">
                   <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-6xl text-emerald-500">
                      <i className="ph-duotone ph-target" />
                   </div>
                   <div className="space-y-4">
                      <h2 className="text-5xl font-black text-white tracking-tighter">{activeGoal.label}</h2>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Objetivo Estratégico</p>
                   </div>
                   <div className="w-full max-w-md space-y-4">
                      <div className="flex justify-between text-2xl font-black text-white">
                         <span>{activeGoal.current} <span className="text-gray-600 text-sm">/ {activeGoal.target} {activeGoal.unit}</span></span>
                         <span className="text-emerald-400">{Math.round((activeGoal.current/activeGoal.target)*100)}%</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${(activeGoal.current/activeGoal.target)*100}%` }} />
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setGoals(goals.map(g => g.id === activeGoal.id ? { ...g, current: g.current + 1 } : g))} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">+ Incrementar</button>
                      <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'edit', data: activeGoal })} className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">Editar Configuração</button>
                   </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-10 grayscale">
                   <i className="ph-duotone ph-layout text-[15rem]" />
                   <h3 className="text-3xl font-black uppercase tracking-[0.3em] mt-10">Nexus Command Center</h3>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. CONTEXT SIDEBAR (OPCIONAL/DYNAMIC) */}
      {viewMode === 'explorer' && (activeNote || activeGoal) && (
        <div className="w-64 flex flex-col gap-6 bg-[#0a0c12]/40 rounded-[3rem] border border-white/5 p-6 shadow-2xl">
           <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Propriedades</h4>
           <div className="space-y-4">
              <div className="space-y-1">
                 <span className="text-[9px] font-bold text-gray-700 uppercase">Criado em</span>
                 <p className="text-[10px] font-bold text-gray-400">Ontem às 14:30</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[9px] font-bold text-gray-700 uppercase">Status</span>
                 <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black inline-block uppercase">Em Progresso</div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
