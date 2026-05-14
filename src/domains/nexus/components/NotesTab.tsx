import React, { useMemo, useState } from 'react';
import { useNexusStore, NoteFolder } from '@store/useNexusStore';
import type { NexusNote } from '@store/useNexusStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { NoteGraphView } from './NoteGraphView';

interface NotesTabProps {
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  confirm: (options: any) => Promise<boolean>;
}

export const NotesTab: React.FC<NotesTabProps> = ({ 
  selectedNoteId, 
  setSelectedNoteId,
  confirm
}) => {
  const notes = useNexusStore(state => state.notes);
  const noteFolders = useNexusStore(state => state.noteFolders);
  const addNote = useNexusStore(state => state.addNote);
  const updateNote = useNexusStore(state => state.updateNote);
  const deleteNoteAction = useNexusStore(state => state.deleteNote);
  const addNoteFolder = useNexusStore(state => state.addNoteFolder);
  const deleteNoteFolder = useNexusStore(state => state.deleteNoteFolder);
  const updateNoteFolder = useNexusStore(state => state.updateNoteFolder);

  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleAddNote = async (folderId?: string) => {
    try {
      const newId = await addNote({
        title: '',
        content: '',
        folderId: folderId || '',
        updatedAt: Date.now()
      });
      if (newId) {
        setSelectedNoteId(newId);
        if (folderId) toggleFolder(folderId, true);
      }
    } catch (err) {
      toast.error('Erro ao criar nota');
    }
  };

  const handleAddFolder = async (parentId?: string) => {
    try {
      await addNoteFolder({
        name: 'Nova Pasta',
        parentId: parentId || '',
        isOpen: true
      });
      toast.success('Pasta criada');
    } catch (err) {
      toast.error('Erro ao criar pasta');
    }
  };

  const toggleFolder = (id: string, force?: boolean) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (force === true) next.add(id);
      else if (force === false) next.delete(id);
      else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteNote = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Nota',
      message: 'Tem certeza que deseja excluir esta nota permanentemente?',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      try {
        await deleteNoteAction(id);
        if (selectedNoteId === id) setSelectedNoteId(null);
        toast.success('Nota removida');
      } catch (err) {
        toast.error('Erro ao excluir nota');
      }
    }
  };

  const activeNote = notes.find(n => n.id === selectedNoteId);

  // Backlinks
  const backlinks = useMemo(() => {
    if (!activeNote || !activeNote.title) return [];
    return notes.filter(n => 
      n.id !== activeNote.id && 
      n.content.toLowerCase().includes(`[[${activeNote.title.toLowerCase()}]]`)
    );
  }, [activeNote, notes]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string, type: 'note' | 'folder') => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('id');
    const type = e.dataTransfer.getData('type');

    if (type === 'note') {
      await updateNote(id, { folderId: targetFolderId || '' });
    } else if (type === 'folder' && id !== targetFolderId) {
      await updateNoteFolder(id, { parentId: targetFolderId || '' });
    }
  };

  const renderFolder = (folder: NoteFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = noteFolders.filter(f => f.parentId === folder.id);
    const folderNotes = notes.filter(n => n.folderId === folder.id);

    return (
      <div 
        key={folder.id} 
        className="space-y-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, folder.id)}
      >
        <div 
          draggable
          onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <i className={`ph-bold ph-caret-${isExpanded ? 'down' : 'right'} text-[10px] text-gray-600`} />
          <i className={`ph-bold ph-folder${isExpanded ? '-open' : ''} text-primary-400`} />
          <span className="text-[11px] font-bold text-gray-400 flex-1 truncate">{folder.name}</span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleAddNote(folder.id); }} className="p-1 hover:text-primary-400"><i className="ph ph-file-plus" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleAddFolder(folder.id); }} className="p-1 hover:text-primary-400"><i className="ph ph-folder-plus" /></button>
            <button onClick={(e) => { e.stopPropagation(); deleteNoteFolder(folder.id); }} className="p-1 hover:text-rose-400"><i className="ph ph-trash" /></button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1">
            {subfolders.map(sf => renderFolder(sf, level + 1))}
            {folderNotes.map(note => renderNoteItem(note, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNoteItem = (note: NexusNote, level = 0) => (
    <button
      key={note.id}
      draggable
      onDragStart={(e) => handleDragStart(e, note.id, 'note')}
      onClick={() => { setSelectedNoteId(note.id); setViewMode('editor'); }}
      className={`w-full text-left px-3 py-2 rounded-xl transition-all group flex items-center gap-2 ${
        selectedNoteId === note.id 
        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
        : 'hover:bg-white/5 text-gray-500 hover:text-gray-300'
      }`}
      style={{ paddingLeft: `${(level + 1) * 12 + 18}px` }}
    >
      <i className="ph-bold ph-file-text text-sm opacity-50" />
      <span className="text-[11px] font-medium truncate flex-1">{note.title || 'Sem título'}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all"
      >
        <i className="ph ph-x text-[10px]" />
      </button>
    </button>
  );

  return (
    <div className="flex gap-8 h-[750px] text-white">
      {/* Sidebar Explorer */}
      <div className="w-72 flex flex-col gap-6 overflow-hidden bg-[#0a0c12]/40 rounded-[2.5rem] border border-white/5 p-6 shadow-2xl">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Vault</h3>
            <span className="text-[9px] font-bold text-primary-500/50 uppercase">{notes.length} Notas</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleAddFolder()} className="w-7 h-7 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ph-bold ph-folder-plus text-xs" /></button>
            <button onClick={() => handleAddNote()} className="w-7 h-7 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-lg"><i className="ph-bold ph-plus text-xs" /></button>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl mx-2">
           <button onClick={() => setViewMode('editor')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500'}`}><i className="ph ph-sidebar mr-2" /> Explorer</button>
           <button onClick={() => setViewMode('graph')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'graph' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500'}`}><i className="ph ph-graph mr-2" /> Graph</button>
        </div>

        <div 
          className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          {/* Notas na Raiz */}
          {notes.filter(n => !n.folderId || n.folderId === '').map(note => renderNoteItem(note))}
          
          {/* Pastas na Raiz */}
          {noteFolders.filter(f => !f.parentId || f.parentId === '').map(folder => renderFolder(folder))}

          {notes.length === 0 && noteFolders.length === 0 && (
            <div className="py-20 text-center opacity-10">
              <i className="ph-duotone ph-tree text-5xl mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Cofre Vazio</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor / Graph View */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'graph' ? (
            <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <NoteGraphView 
                notes={notes} 
                goals={[]} 
                tasks={[]} 
                links={[]} 
                selectedId={selectedNoteId} 
                onSelectNode={(id) => setSelectedNoteId(id)} 
              />
            </motion.div>
          ) : (
            <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col gap-6">
              <div className="flex-1 bg-[#0a0c12]/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col gap-6 shadow-2xl relative">
                {!activeNote ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                    <i className="ph-duotone ph-brain text-9xl mb-6" />
                    <h3 className="text-xl font-black uppercase tracking-widest">Selecione uma nota</h3>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                       <input 
                        value={activeNote.title}
                        onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                        placeholder="Título da nota..."
                        className="bg-transparent text-3xl font-black border-none focus:ring-0 w-full placeholder:text-white/5"
                       />
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{activeNote.content.split(/\s+/).filter(x => x).length} Palavras</span>
                          <button onClick={() => deleteNote(activeNote.id)} className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><i className="ph-bold ph-trash" /></button>
                       </div>
                    </div>

                    <textarea 
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      placeholder="Comece a escrever... Use [[Nome da Nota]] para criar conexões."
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none custom-scrollbar text-lg text-gray-300 leading-relaxed placeholder:text-white/5"
                    />

                    {backlinks.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-4 flex items-center gap-2">
                           <i className="ph-bold ph-link" /> Backlinks ({backlinks.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {backlinks.map(bn => (
                              <button 
                                key={bn.id}
                                onClick={() => setSelectedNoteId(bn.id)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2 border border-white/5"
                              >
                                 <i className="ph ph-file-text" /> {bn.title || 'Sem título'}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
