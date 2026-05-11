import React, { useEffect, useState } from 'react';
import { Rocket, Bug, ShieldCheck, Zap, User, Calendar, Plus, X } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { HUB_TOKENS, GLASS_STYLES } from '@/shared/ui-system/tokens';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const ReleaseNotesView: React.FC = () => {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { releaseNotes, fetchReleaseNotes, markNotesAsRead, publishReleaseNote, isSystemLoading } = useCRMStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    version: '',
    title: '',
    content: '',
    type: 'feature' as 'feature' | 'fix' | 'security' | 'improvement'
  });

  useEffect(() => {
    fetchReleaseNotes();
    // Marca como lido após 2 segundos de visualização
    const timer = setTimeout(() => {
      markNotesAsRead();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePublish = async () => {
    if (!newNote.version || !newNote.title || !newNote.content) {
      toast.error('Preencha todos os campos!');
      return;
    }

    try {
      await publishReleaseNote({
        ...newNote,
        author: userProfile?.displayName || 'Admin'
      });
      setIsModalOpen(false);
      setNewNote({ version: '', title: '', content: '', type: 'feature' });
      toast.success('Atualização publicada com sucesso!');
    } catch (err) {
      toast.error('Erro ao publicar atualização.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Rocket className="w-4 h-4 text-emerald-400" />;
      case 'fix': return <Bug className="w-4 h-4 text-amber-400" />;
      case 'security': return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      default: return <Zap className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'Nova Funcionalidade';
      case 'fix': return 'Correção de Erro';
      case 'security': return 'Segurança';
      default: return 'Melhoria';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Central de Atualizações</h1>
          <p className="text-gray-400">Acompanhe as novidades e melhorias do HubCRM.</p>
        </div>

        {hasPermission('MANAGE_SETTINGS') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Post
          </button>
        )}
      </div>

      {isSystemLoading && releaseNotes.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : releaseNotes.length === 0 ? (
        <div style={GLASS_STYLES.base} className="p-12 text-center rounded-3xl">
          <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma atualização registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-white/10">
          {releaseNotes.map((note) => (
            <div key={note.id} className="relative pl-12 group">
              {/* Timeline Dot */}
              <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center z-10 group-hover:border-blue-500/50 transition-colors">
                {getTypeIcon(note.type)}
              </div>

              {/* Content Card */}
              <div style={GLASS_STYLES.base} className="p-6 rounded-2xl group-hover:bg-white/[0.03] transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{note.version}</span>
                      <span className="text-white font-semibold text-lg">{note.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(note.date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {note.author}
                      </span>
                    </div>
                  </div>
                  
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-400 uppercase">
                    {getTypeLabel(note.type)}
                  </span>
                </div>

                <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed">
                  {note.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal de Publicação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsModalOpen(false)} 
          />
          
          <div className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Rocket className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Publicar Novidade</h3>
                  <p className="text-sm text-gray-500">Comunique as melhorias para toda a equipe</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Versão</label>
                  <input
                    type="text"
                    value={newNote.version}
                    onChange={e => setNewNote({ ...newNote, version: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                    placeholder="v1.x.x"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Tipo</label>
                  <select
                    value={newNote.type}
                    onChange={e => setNewNote({ ...newNote, type: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all appearance-none"
                  >
                    <option value="feature">🚀 Funcionalidade</option>
                    <option value="improvement">✨ Melhoria</option>
                    <option value="fix">🛠️ Correção</option>
                    <option value="security">🔒 Segurança</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Título</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  placeholder="O que mudou?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Conteúdo</label>
                <textarea
                  value={newNote.content}
                  onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all resize-none"
                  placeholder="Descreva os detalhes..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-gray-400 font-bold hover:bg-white/5 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublish}
                  className="flex-1 py-4 bg-primary-500 text-white font-bold rounded-2xl hover:bg-primary-600 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                >
                  Publicar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseNotesView;
