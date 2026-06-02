import React from 'react';
import { Tv, Sparkles, Clock } from 'lucide-react';

interface AnimeItem {
  id: number;
  title: string;
  imageUrl: string | null;
  score: string | number;
  episodes: string | number;
  time: string;
  synopsis: string | null;
}

interface FeedAnimeListProps {
  animes: AnimeItem[];
}

export default function FeedAnimeList({ animes }: FeedAnimeListProps) {
  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-6 text-left h-full min-h-[420px] flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Tv size={18} className="text-primary-500" />
          Lançamentos Geek de Hoje
        </h3>
        <span className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 text-[9px] font-black text-primary-400 rounded-lg uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={10} />
          MAL
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[380px] custom-scrollbar">
        {animes.length === 0 ? (
          <div className="h-full flex items-center justify-center py-12">
            <p className="text-xs text-gray-500 text-center">Nenhum anime agendado para lançamento hoje.</p>
          </div>
        ) : (
          animes.map(anime => (
            <div 
              key={anime.id} 
              className="flex gap-4 p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group"
            >
              {anime.imageUrl && (
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                  <img 
                    src={anime.imageUrl} 
                    alt={anime.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between text-left space-y-1">
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-primary-400 transition-colors">
                    {anime.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {anime.synopsis || 'Sem sinopse disponível.'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/5 px-1.5 py-0.5 rounded border border-amber-400/10">
                    ★ {anime.score}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                    <Clock size={10} className="text-primary-400" />
                    {anime.time} JST
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
