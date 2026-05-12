import React from 'react';
import { Heart, Award, ThumbsUp } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function KudosWall() {
  const userProfile = useCRMStore(state => state.userProfile);
  const myFeedbacks = userProfile?.feedbacks || [];
  const publicKudos = myFeedbacks.filter(f => f.type === 'kudo' && !f.isPrivate);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Mural de Kudos</h3>
            <p className="text-sm text-gray-400">Reconhecimentos Públicos</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {publicKudos.length === 0 ? (
          <div className="text-center py-10">
            <Award className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum Kudo recebido ainda.</p>
            <p className="text-gray-500 text-xs mt-1">Seja o primeiro a reconhecer um colega!</p>
          </div>
        ) : (
          publicKudos.map((kudo) => (
            <div key={kudo.id} className="bg-black/20 rounded-xl p-4 border border-white/5 relative group">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/40 to-purple-500/40 flex items-center justify-center border border-white/10 flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {kudo.fromName.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-white">{kudo.fromName}</span>
                    <span className="text-[10px] text-gray-500">
                      {format(new Date(kudo.date), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 italic mb-2">"{kudo.text}"</p>
                  
                  {kudo.tags && kudo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {kudo.tags.map(tag => (
                         <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/5">
                           {tag}
                         </span>
                      ))}
                    </div>
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
