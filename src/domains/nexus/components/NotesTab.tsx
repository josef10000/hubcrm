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
        title: 'Nova Nota',
        content: '',
        folderId,
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
        parentId,
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

  // Encontrar backlinks
  const backlinks = useMemo(() => {
    if (!activeNote || !activeNote.title) return [];
    return notes.filter(n => 
      n.id !== activeNote.id && 
      n.content.toLowerCase().includes(`[[${activeNote.title.toLowerCase()}]]`)
    );
  }, [activeNote, notes]);

  const renderFolder = (folder: NoteFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = noteFolders.filter(f => f.parentId === folder.id);
    const folderNotes = notes.filter(n => n.folderId === folder.id);

    return (
      <div key={folder.id} className="space-y-1">
        <div 
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
      onClick={() => { setSelectedNoteId(note.id); setViewMode('editor'); }}
      className={`w-full text-left px-3 py-2 rounded-xl transition-all group flex items-center gap-2 ${
        selectedNoteId === note.id 
        ? 'bg-primary-500/10 text-primary-400' 
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
    <div className="flex gap-8 h-[700px] text-white">
      {/* Sidebar de Notas Estilo Obsidian */}
      <div className="w-72 flex flex-col gap-6 overflow-hidden bg-[#0a0c12]/40 rounded-[2.5rem] border border-white/5 p-6 shadow-2xl">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Workspace</h3>
            <span className="text-[9px] font-bold text-primary-500/50 uppercase">{notes.length} Objetos</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleAddFolder()}
              className="w-7 h-7 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
              title="Nova Pasta"
            >
              <i className="ph-bold ph-folder-plus text-xs" />
            </button>
            <button 
              onClick={() => handleAddNote()}
              className="w-7 h-7 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-lg"
              title="Nova Nota"
            >
              <i className="ph-bold ph-plus text-xs" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl mx-2">
           <button 
            onClick={() => setViewMode('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
           >
              <i className="ph ph-sidebar" /> Explorer
           </button>
           <button 
            onClick={() => setViewMode('graph')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'graph' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
           >
              <i className="ph ph-graph" /> Graph
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-1">
          {/* Notas na Raiz */}
          {notes.filter(n => !n.folderId).map(note => renderNoteItem(note))}
          
          {/* Pastas e seu conteúdo */}
          {noteFolders.filter(f => !f.parentId).map(folder => renderFolder(folder))}

          {notes.length === 0 && noteFolders.length === 0 && (
            <div className="py-20 text-center opacity-10">
              <i className="ph-duotone ph-tree text-5xl mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Vault Vazio</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor ou Grafo */}
      <div className="flex-1 flex flex-col gap-6 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'graph' ? (
            <motion.div 
              key="graph"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full h-full"
            >
              <NoteGraphView 
                notes={notes} 
                selectedNoteId={selectedNoteId}
                onSelectNote={(id) => { setSelectedNoteId(id); setViewMode('editor'); }}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="flex-1 bg-[#0a0c12]/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col gap-6 shadow-2xl relative overflow-hidden group/editor">
                {!activeNote ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-10">
                    <i className="ph-duotone ph-brain text-9xl" />
                    <h3 className="text-2xl font-black uppercase tracking-widest">Inicie um fluxo de pensamento</h3>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                       <input 
                        value={activeNote.title}
                        onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                        className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-black text-white uppercase tracking-tighter w-full placeholder-white/10"
                        placeholder="Sem título"
                      />
                      <div className="flex items-center gap-4 text-gray-600 text-xs font-bold uppercase tracking-widest">
                         <span>{activeNote.content.split(' ').length} Palavras</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                      </div>
                    </div>

                    <textarea 
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-gray-400 font-medium text-lg leading-relaxed resize-none custom-scrollbar placeholder-white/5 selection:bg-primary-500/30"
                      placeholder="Conecte suas ideias usando [[Links]]..."
                    />

                    {/* Backlinks Panel (Bottom) */}
                    {backlinks.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4 flex items-center gap-2">
                          <i className="ph-bold ph-link" /> Mencionado em ({backlinks.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {backlinks.map(bn => (
                             <button 
                              key={bn.id}
                              onClick={() => setSelectedNoteId(bn.id)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2"
                             >
                                <i className="ph ph-file-text" /> {bn.title}
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
