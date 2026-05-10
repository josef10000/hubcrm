import React, { useEffect } from 'react';
import { Rocket, Bug, ShieldCheck, Zap, User, Calendar } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { HUB_TOKENS, GLASS_STYLES } from '@/shared/ui-system/tokens';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReleaseNotesView: React.FC = () => {
  const { releaseNotes, fetchReleaseNotes, markNotesAsRead, isSystemLoading } = useCRMStore();

  useEffect(() => {
    fetchReleaseNotes();
    // Marca como lido após 2 segundos de visualização
    const timer = setTimeout(() => {
      markNotesAsRead();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Central de Atualizações</h1>
        <p className="text-gray-400">Acompanhe as novidades e melhorias do HubCRM.</p>
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
    </div>
  );
};

export default ReleaseNotesView;
