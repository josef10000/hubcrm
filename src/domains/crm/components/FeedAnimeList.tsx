import React, { useState, useEffect } from 'react';
import { Tv, Sparkles, Clock, Search, X, ArrowLeft, Loader2 } from 'lucide-react';

interface AnimeItem {
  id: number;
  title: string;
  imageUrl: string | null;
  score: string | number;
  episodes: string | number;
  time: string;
  synopsis: string | null;
  status?: string;
  broadcastInfo?: string;
}

interface FeedAnimeListProps {
  animes: AnimeItem[];
}

function translateStatus(status: string | null): string {
  if (!status) return 'Status Desconhecido';
  switch (status.trim()) {
    case 'Currently Airing':
      return 'Em Lançamento 🟢';
    case 'Finished Airing':
      return 'Finalizado 🔴';
    case 'Not yet aired':
      return 'A Estrear 🟡';
    default:
      return status;
  }
}

function translateBroadcast(broadcastStr: string | null, broadcastDay: string | null, broadcastTime: string | null): string {
  if (!broadcastStr || broadcastStr === 'N/A' || broadcastStr.toLowerCase() === 'not scheduled') {
    return 'Transmissão não agendada';
  }
  
  const daysMap: Record<string, string> = {
    'sundays': 'Domingo',
    'mondays': 'Segunda-feira',
    'tuesdays': 'Terça-feira',
    'wednesdays': 'Quarta-feira',
    'thursdays': 'Quinta-feira',
    'fridays': 'Sexta-feira',
    'saturdays': 'Sábado',
    'sunday': 'Domingo',
    'monday': 'Segunda-feira',
    'tuesday': 'Terça-feira',
    'wednesday': 'Quarta-feira',
    'thursday': 'Quinta-feira',
    'friday': 'Sexta-feira',
    'saturday': 'Sábado'
  };

  const dayClean = (broadcastDay || '').trim().replace(/s$/, '').toLowerCase(); // remove o 's' do final se houver
  const translatedDay = daysMap[dayClean] || broadcastDay;

  if (translatedDay && broadcastTime) {
    return `Toda ${translatedDay} às ${broadcastTime} (JST)`;
  }
  return broadcastStr;
}

export default function FeedAnimeList({ animes }: FeedAnimeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&limit=5`)
        .then((res) => {
          if (!res.ok) throw new Error('Erro na resposta da API');
          return res.json();
        })
        .then((resData) => {
          const list = (resData.data || []).map((anime: any) => ({
            id: anime.mal_id,
            title: anime.title_english || anime.title,
            imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
            score: anime.score || 'N/A',
            episodes: anime.episodes || '?',
            time: anime.broadcast?.time || anime.broadcast?.string || 'N/A',
            synopsis: anime.synopsis || null,
            status: translateStatus(anime.status),
            broadcastInfo: translateBroadcast(anime.broadcast?.string, anime.broadcast?.day, anime.broadcast?.time)
          }));
          setSearchResults(list);
          setSearching(false);
        })
        .catch((err) => {
          console.error('[FeedAnimeList] Erro na busca de animes:', err);
          setSearching(false);
        });
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-4 text-left h-full min-h-[420px] flex flex-col relative">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Tv size={18} className="text-primary-500" />
          Lançamentos Geek
        </h3>
        <span className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 text-[9px] font-black text-primary-400 rounded-lg uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={10} />
          MAL
        </span>
      </div>

      {/* Input de Busca */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" /> : <Search className="w-3.5 h-3.5" />}
        </div>
        <input
          type="text"
          placeholder="Buscar anime específico..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-2 flex items-center px-1 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown de Sugestões / Autocomplete */}
      {searchQuery && searchResults.length > 0 && (
        <div className="absolute left-6 right-6 top-[105px] z-50 bg-[#0c0e14]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 max-h-[240px] overflow-y-auto custom-scrollbar animate-in fade-in duration-200 space-y-1">
          {searchResults.map((anime) => (
            <button
              key={anime.id}
              onClick={() => {
                setSelectedAnime(anime);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all text-left group"
            >
              {anime.imageUrl && (
                <img 
                  src={anime.imageUrl} 
                  alt={anime.title} 
                  className="w-8 h-10 object-cover rounded-md border border-white/5 flex-shrink-0" 
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate group-hover:text-primary-400 transition-colors">{anime.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold">
                  <span className="text-amber-400">★ {anime.score}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 text-[8px] font-black">{anime.status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Renderização do Anime Focado ou da Lista Diária */}
      {selectedAnime ? (
        <div className="flex-1 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300 min-h-0">
          <button
            onClick={() => setSelectedAnime(null)}
            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-bold transition-colors w-fit mr-auto cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar para Hoje
          </button>

          <div className="flex-1 flex flex-col p-4 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar max-h-[280px] space-y-4">
            <div className="flex gap-4">
              {selectedAnime.imageUrl && (
                <img 
                  src={selectedAnime.imageUrl} 
                  alt={selectedAnime.title} 
                  className="w-16 h-24 object-cover rounded-xl border border-white/10 flex-shrink-0" 
                />
              )}
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-xs font-black text-white leading-tight break-words">{selectedAnime.title}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10 flex items-center gap-1">
                    ★ {selectedAnime.score}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {selectedAnime.episodes} eps
                  </span>
                </div>
                <div className="space-y-0.5 pt-0.5">
                  <div className="text-[9px] font-medium text-gray-400">
                    Status: <span className="font-bold text-white">{selectedAnime.status}</span>
                  </div>
                  {selectedAnime.broadcastInfo && (
                    <div className="text-[9px] font-medium text-gray-400">
                      Transmissão: <span className="font-bold text-primary-400">{selectedAnime.broadcastInfo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Sinopse</p>
              <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                {selectedAnime.synopsis || 'Nenhuma sinopse disponível.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[320px] custom-scrollbar">
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
      )}
    </div>
  );
}
