import React, { useState, useEffect } from 'react';
import { 
  useRadioStore, 
  DEFAULT_REAL_STATIONS, 
  Station 
} from '@/store/useRadioStore';
import { 
  Search, 
  Heart, 
  Play, 
  Pause, 
  Loader2, 
  Radio 
} from 'lucide-react';

export default function RealRadiosTab() {
  const { 
    currentStation, 
    isPlaying, 
    playStation, 
    favoriteStationIds, 
    addFavorite, 
    removeFavorite, 
    searchStations, 
    searchResults, 
    isSearching, 
    searchQuery 
  } = useRadioStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Efeito para sincronizar a busca local com o estado global da store
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchStations(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    searchStations('');
  };

  const handleToggleFavorite = (e: React.MouseEvent, station: Station) => {
    e.stopPropagation(); // Evita dar play ao clicar em favoritar
    if (favoriteStationIds.includes(station.id)) {
      removeFavorite(station.id);
    } else {
      addFavorite(station.id);
    }
  };

  // Filtra as rádios recomendadas que o usuário favoritou para exibição na aba de favoritos
  const getFavoriteStations = () => {
    // Busca nos resultados da pesquisa + recomendadas padrão
    const allKnownStations = [...DEFAULT_REAL_STATIONS, ...searchResults];
    
    // Filtra e remove duplicatas
    const uniqueKnown = allKnownStations.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    
    return uniqueKnown.filter(station => favoriteStationIds.includes(station.id));
  };

  const favorites = getFavoriteStations();

  const renderStationItem = (station: Station) => {
    const isActive = currentStation?.id === station.id;
    const isCurrentPlaying = isActive && isPlaying;
    const isFav = favoriteStationIds.includes(station.id);

    return (
      <div
        key={station.id}
        onClick={() => playStation(station)}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-300 backdrop-blur-md cursor-pointer group ${
          isActive
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'hover:bg-white/5 border-white/5 text-white/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Favicon da Rádio com fallback de ícone */}
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
            {station.favicon ? (
              <img 
                src={station.favicon} 
                alt={station.name} 
                className="w-full h-full object-contain error-fallback-radio"
                onError={(e) => {
                  // Fallback se a imagem falhar
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <Radio className="w-4 h-4 text-white/40 absolute" />
          </div>

          {/* Nome e tags */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate group-hover:text-white transition-colors">
              {station.name}
            </div>
            <div className="flex gap-1 mt-0.5 overflow-hidden">
              {station.tags && station.tags.length > 0 ? (
                station.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="text-[8px] text-white/30 truncate max-w-[60px]"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[8px] text-white/30">Nacional</span>
              )}
            </div>
          </div>
        </div>

        {/* Ações da Rádio (Favoritar & Play) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Botão de Favorito (Coração) */}
          <button
            onClick={(e) => handleToggleFavorite(e, station)}
            className={`p-1.5 rounded-lg transition-all duration-300 hover:bg-white/10 ${
              isFav ? 'text-red-500 scale-105' : 'text-white/40 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
          </button>

          {/* Botão de Tocar/Pausar */}
          <div 
            className={`p-1.5 rounded-full transition-all duration-300 ${
              isActive 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-white/40 group-hover:bg-white/15 group-hover:text-white'
            }`}
          >
            {isCurrentPlaying ? (
              <Pause className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Formulário de Busca */}
      <form onSubmit={handleSearchSubmit} className="relative flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar CBN, Mix FM, Antena 1..."
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:border-primary/50 transition-all font-sans"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
          
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2 text-[10px] text-white/40 hover:text-white px-1.5 py-0.5 rounded bg-white/5"
            >
              limpar
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-primary/20 hover:bg-primary/30 border border-primary/20 text-white px-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
        </button>
      </form>

      {/* Conteúdo Dinâmico */}
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-6 text-white/40 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] tracking-wide font-mono">PESQUISANDO ESTAÇÕES BRASIL...</span>
          </div>
        ) : localSearch.trim() ? (
          // Exibe os resultados da pesquisa
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-white/40 tracking-wider px-1">
              RESULTADO DA PESQUISA ({searchResults.length})
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(renderStationItem)
            ) : (
              <div className="text-center py-6 text-xs text-white/40">
                Nenhuma rádio encontrada com "{localSearch}".
              </div>
            )}
          </div>
        ) : (
          // Exibe favoritos e recomendadas padrão
          <>
            {/* Favoritos */}
            {favorites.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-red-400 tracking-wider px-1 flex items-center gap-1">
                  <Heart className="w-3 h-3" fill="currentColor" /> SUAS RÁDIOS FAVORITAS
                </div>
                <div className="space-y-1.5">
                  {favorites.map(renderStationItem)}
                </div>
              </div>
            )}

            {/* Recomendadas Padrão */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-white/40 tracking-wider px-1 flex items-center gap-1">
                <Radio className="w-3 h-3" /> ESTAÇÕES RECOMENDADAS
              </div>
              <div className="space-y-1.5">
                {DEFAULT_REAL_STATIONS.map(renderStationItem)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
