import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexusStore, NexusBook, NexusNote } from '@store/useNexusStore';
import { toast } from 'sonner';

interface ReadingCompanionProps {
  book: NexusBook;
  onClose: () => void;
}

export const ReadingCompanion: React.FC<ReadingCompanionProps> = ({ book, onClose }) => {
  const { notes, addNote, updateReadingProgress, activityLogs } = useNexusStore();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  
  const recognitionRef = useRef<any>(null);

  // Notas vinculadas a este livro (backlinks ou via log)
  const bookNotes = notes.filter(n => 
    n.content.toLowerCase().includes(book.title.toLowerCase()) ||
    activityLogs.some(log => log.type === 'note' && log.bookId === book.id && log.noteId === n.id)
  );

  useEffect(() => {
    // Inicializar Speech Recognition se disponível
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setNoteContent(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
      toast.info('Ouvindo... Fale sua nota.');
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('A nota está vazia!');
      return;
    }

    const tId = toast.loading('Salvando insight...');
    try {
      const title = noteTitle.trim() || `Insight: ${book.title} (pág. ${currentPage})`;
      // Adiciona link bidirecional automaticamente
      const contentWithLink = `${noteContent}\n\n---\nRef: [[${book.title}]]`;
      
      await addNote({
        title,
        content: contentWithLink,
        updatedAt: Date.now(),
        bookId: book.id // Passamos o bookId para o log automático no store
      } as any);

      setNoteTitle('');
      setNoteContent('');
      toast.success('Insight imortalizado no seu Vault!', { id: tId });
    } catch (err) {
      toast.error('Erro ao salvar nota', { id: tId });
    }
  };

  const handleUpdatePage = async () => {
    await updateReadingProgress(book.id, currentPage);
    toast.success(`Progresso atualizado: Página ${currentPage}`);
  };

  return (
    <div className="w-80 h-full bg-[#0a0c12] border-l border-white/10 flex flex-col overflow-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500">Reading Companion</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-all">
            <i className="ph-bold ph-x" />
          </button>
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-wider line-clamp-2">{book.title}</h4>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {/* Progresso Rápido */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Progresso Atual</label>
            <span className="text-[10px] font-bold text-primary-400">Pág. {currentPage} / {book.totalPages || '?'}</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500 transition-all"
            />
            <button 
              onClick={handleUpdatePage}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20"
            >
              OK
            </button>
          </div>
        </div>

        {/* Criar Insight */}
        <div className="space-y-4 bg-white/[0.03] p-4 rounded-[2rem] border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Novo Insight</label>
            <button 
              onClick={toggleRecording}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse text-white shadow-lg shadow-rose-500/40' : 'bg-white/5 text-gray-500 hover:text-white'}`}
              title="Falar nota (Speech-to-Text)"
            >
              <i className={`ph-bold ${isRecording ? 'ph-microphone-fill' : 'ph-microphone'}`} />
            </button>
          </div>
          
          <input 
            placeholder="Título (opcional)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="w-full bg-transparent border-b border-white/10 py-1 text-xs font-bold text-white outline-none focus:border-primary-500 transition-all placeholder:text-gray-700"
          />

          <textarea 
            placeholder="O que você acabou de aprender? Use sua voz ou digite..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full h-32 bg-transparent border-none text-xs text-gray-400 leading-relaxed outline-none resize-none custom-scrollbar placeholder:text-gray-700"
          />

          <button 
            onClick={handleSaveNote}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
          >
            <i className="ph-bold ph-brain group-hover:scale-125 transition-transform" />
            Imortalizar Insight
          </button>
        </div>

        {/* Notas Relacionadas */}
        {bookNotes.length > 0 && (
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2">
              <i className="ph-bold ph-link" /> Insights Anteriores
            </label>
            <div className="space-y-2">
              {bookNotes.map(note => (
                <div key={note.id} className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-primary-500/30 transition-all">
                  <h5 className="text-[10px] font-bold text-gray-300 truncate">{note.title || 'Sem título'}</h5>
                  <p className="text-[9px] text-gray-600 mt-1 line-clamp-2">{note.content.substring(0, 100)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
