import React from 'react';
import { useNexusStore } from '../../store/useNexusStore';
import type { NexusNote } from '../../store/useNexusStore';
import { toast } from 'sonner';

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
  const setNotes = useNexusStore(state => state.setNotes);

  const handleAddNote = () => {
    const newNote: NexusNote = {
      id: Date.now().toString(),
      title: 'Nova Nota',
      content: '',
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const updateNoteContent = (id: string, content: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, content, updatedAt: Date.now() } : n));
  };

  const updateNoteTitle = (id: string, title: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n));
  };

  const deleteNote = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Nota',
      message: 'Tem certeza que deseja excluir esta nota permanentemente?',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
      toast.success('Nota removida');
    }
  };

  const activeNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[600px]">
      {/* Sidebar de Notas */}
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Coleção</h3>
          <button 
            onClick={handleAddNote}
            className="w-8 h-8 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg"
          >
            <i className="ph-bold ph-plus" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
          {notes.length === 0 && (
            <div className="py-10 text-center opacity-20">
              <i className="ph-duotone ph-note-pencil text-4xl mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Sem notas</p>
            </div>
          )}
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedNoteId(note.id)}
              className={`w-full text-left p-4 rounded-3xl transition-all group border ${
                selectedNoteId === note.id 
                ? 'bg-primary-500/20 border-primary-500/40' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold truncate ${selectedNoteId === note.id ? 'text-white' : 'text-gray-400'}`}>
                    {note.title || 'Sem título'}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all"
                  >
                    <i className="ph-bold ph-trash text-xs" />
                  </button>
                </div>
                <span className="text-[9px] font-medium text-gray-600 truncate">
                  {note.content || 'Comece a escrever...'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor de Notas */}
      <div className="lg:col-span-3 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
        {!activeNote ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-10">
             <i className="ph-duotone ph-note-pencil text-9xl" />
             <h3 className="text-2xl font-black uppercase tracking-widest">Selecione ou crie uma nota</h3>
          </div>
        ) : (
          <>
            <input 
              value={activeNote.title}
              onChange={(e) => updateNoteTitle(activeNote.id, e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-black text-white uppercase tracking-tighter w-full placeholder-gray-800"
              placeholder="Título da Nota"
            />
            <textarea 
              value={activeNote.content}
              onChange={(e) => updateNoteContent(activeNote.id, e.target.value)}
              className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-gray-400 font-medium text-lg leading-relaxed resize-none custom-scrollbar placeholder-gray-800"
              placeholder="Comece sua jornada criativa aqui..."
            />
          </>
        )}
      </div>
    </div>
  );
};
