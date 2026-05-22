import React, { useState, useEffect } from 'react';
import { 
  useRadioStore, 
  Station,
  DEFAULT_SPOTIFY_PLAYLISTS
} from '@/store/useRadioStore';
import { 
  Search, 
  Heart, 
  Play, 
  Pause, 
  Loader2, 
  Music,
  Trash2,
  Plus,
  X,
  Pencil
} from 'lucide-react';

interface RealRadiosTabProps {
  typeFilter?: 'spotify' | 'youtube';
}

export default function RealRadiosTab({ typeFilter }: RealRadiosTabProps) {
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
    searchQuery,
    customStations,
    addCustomStation,
    removeCustomStation,
    updateCustomStation
  } = useRadioStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customFavicon, setCustomFavicon] = useState('');
  const [formError, setFormError] = useState('');
  
  // Estados para Edição
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editFavicon, setEditFavicon] = useState('');
  const [editError, setEditError] = useState('');
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [isFetchingCustomCover, setIsFetchingCustomCover] = useState(false);

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

  // Helper robusto para obter o ID do vídeo do YouTube
  const getYoutubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper robusto para puxar a capa do Spotify via endpoint público do oembed
  const fetchSpotifyCover = async (spotifyUrl: string): Promise<string | null> => {
    try {
      const cleanUrl = spotifyUrl.trim();
      if (!cleanUrl) return null;
      
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.thumbnail_url) {
          return data.thumbnail_url;
        }
      }
    } catch (e) {
      console.warn('Erro ao obter capa do Spotify via oembed:', e);
    }
    return null;
  };

  // Helper unificado para buscar a capa (Spotify ou YouTube)
  const fetchCover = async (url: string): Promise<string | null> => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;
    
    const isSpotify = cleanUrl.toLowerCase().includes('spotify.com');
    if (isSpotify) {
      return await fetchSpotifyCover(cleanUrl);
    }
    
    const isYoutube = cleanUrl.toLowerCase().includes('youtube.com') || cleanUrl.toLowerCase().includes('youtu.be');
    if (isYoutube) {
      const videoId = getYoutubeVideoId(cleanUrl);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else {
        // Fallback elegante para capa do YouTube (vermelha padrão do Unsplash)
        return 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=80&h=80&fit=crop';
      }
    }
    return null;
  };

  const handleAddCustomStation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customName.trim()) {
      setFormError('Digite o nome da playlist.');
      return;
    }

    if (!customUrl.trim()) {
      setFormError(`Cole o link do ${typeFilter === 'spotify' ? 'Spotify' : 'YouTube'}.`);
      return;
    }

    const lowerUrl = customUrl.trim().toLowerCase();
    const isSpotify = lowerUrl.includes('spotify.com');
    const isYoutube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');

    if (typeFilter === 'spotify' && !isSpotify) {
      setFormError('Por favor, cole um link de playlist válido do Spotify.');
      return;
    }

    if (typeFilter === 'youtube' && !isYoutube) {
      setFormError('Por favor, cole um link de vídeo ou playlist válido do YouTube.');
      return;
    }

    if (!isSpotify && !isYoutube) {
      setFormError('Cole um link válido do Spotify ou do YouTube.');
      return;
    }

    addCustomStation(customName, customUrl, customFavicon);
    setCustomName('');
    setCustomUrl('');
    setCustomFavicon('');
    setShowAddForm(false);
  };

  // Filtra as playlists recomendadas que o usuário favoritou para exibição na aba de favoritos
  const getFavoriteStations = () => {
    // Busca nos resultados da pesquisa + personalizadas
    const allKnownPlaylists = [...customStations, ...searchResults];
    
    // Se o typeFilter for fornecido, filtramos pelo tipo
    const filteredKnown = typeFilter 
      ? allKnownPlaylists.filter(s => s.type === typeFilter) 
      : allKnownPlaylists;

    // Filtra e remove duplicatas
    const uniqueKnown = filteredKnown.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    
    return uniqueKnown.filter(station => favoriteStationIds.includes(station.id));
  };

  const favorites = getFavoriteStations();

  // Filtra as playlists personalizadas do usuário com base no typeFilter
  const filteredCustom = typeFilter 
    ? customStations.filter(s => s.type === typeFilter) 
    : customStations;

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
          {/* Capa da Playlist com fallback de ícone */}
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
            <Music className="w-4 h-4 text-white/40 absolute" />
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
                    className="text-[8px] text-white/30 truncate max-w-[60px] capitalize"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[8px] text-white/30 capitalize">{station.type}</span>
              )}
            </div>
          </div>
        </div>

        {/* Ações da Playlist (Favoritar & Play) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Botão de Editar (disponível para Spotify e YouTube) */}
          {(station.type === 'spotify' || station.type === 'youtube') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingStation(station);
                setEditName(station.name);
                setEditUrl(station.url);
                setEditFavicon(station.favicon || '');
                setEditError('');
                setShowAddForm(false); // Fecha o form de adição
              }}
              className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-white/10 transition-all duration-300"
              title="Editar Playlist"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Botão de Excluir (disponível para Spotify e YouTube) */}
          {(station.type === 'spotify' || station.type === 'youtube') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCustomStation(station.id);
              }}
              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-all duration-300"
              title="Excluir Playlist"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

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
    <div className="space-y-3 font-sans">
      {/* Formulário de Busca e Botão de Adicionar Customizada */}
      <div className="flex flex-col gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar playlist..."
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

        {/* Botão de Toggle para Adicionar Estação Personalizada */}
        {!editingStation && (
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setFormError('');
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all duration-300 ${
              showAddForm
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30'
            }`}
          >
            {showAddForm ? (
              <>
                <X className="w-3.5 h-3.5" /> Cancelar Cadastro
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Adicionar Playlist (Spotify / YouTube)
              </>
            )}
          </button>
        )}

        {/* Formulário de Adicionar Rádio Customizada (Glassmorphism) */}
        {showAddForm && !editingStation && (
          <form 
            onSubmit={handleAddCustomStation} 
            className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 animate-fade-in relative z-20"
          >
            <div className="text-[10px] font-bold text-white/40 tracking-wider">
              NOVA PLAYLIST OU VÍDEO
            </div>
            
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={typeFilter === 'spotify' ? 'Nome da Playlist (ex: Hits de Foco)' : 'Nome do Vídeo/Playlist (ex: Som Ambiente)'}
              className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
            />
            
            <div className="relative">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={typeFilter === 'spotify' ? 'Link da playlist do Spotify' : 'Link do vídeo ou playlist do YouTube'}
                className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 pr-20 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!customUrl.trim()) return;
                  setIsFetchingCustomCover(true);
                  const cover = await fetchCover(customUrl);
                  if (cover) {
                    setCustomFavicon(cover);
                  }
                  setIsFetchingCustomCover(false);
                }}
                className="absolute right-1 top-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded font-bold transition-all h-[22px] flex items-center justify-center"
                disabled={isFetchingCustomCover}
              >
                {isFetchingCustomCover ? 'Buscando...' : 'Obter Capa'}
              </button>
            </div>

            <input
              type="text"
              value={customFavicon}
              onChange={(e) => setCustomFavicon(e.target.value)}
              placeholder="URL da Capa da Playlist (Opcional)"
              className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
            />

            {customFavicon && (
              <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-lg border border-white/5">
                <img src={customFavicon} className="w-8 h-8 rounded object-cover shrink-0" alt="Prévia" />
                <span className="text-[9px] text-white/50 truncate flex-1 font-mono">{customFavicon}</span>
                <button 
                  type="button" 
                  onClick={() => setCustomFavicon('')} 
                  className="text-[9px] text-red-400 hover:underline shrink-0"
                >
                  Remover
                </button>
              </div>
            )}

            {formError && (
              <div className="text-[9px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-1.5 rounded-md leading-normal">
                ⚠️ {formError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Salvar Playlist
            </button>
          </form>
        )}

        {/* Formulário de Editar Playlist Customizada */}
        {editingStation && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setEditError('');
              if (!editName.trim()) {
                setEditError('Digite o nome da playlist.');
                return;
              }
              if (!editUrl.trim()) {
                setEditError(`Cole o link do ${typeFilter === 'spotify' ? 'Spotify' : 'YouTube'}.`);
                return;
              }
              const lowerUrl = editUrl.trim().toLowerCase();
              const isSpotify = lowerUrl.includes('spotify.com');
              const isYoutube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');

              if (typeFilter === 'spotify' && !isSpotify) {
                setEditError('Por favor, cole um link de playlist válido do Spotify.');
                return;
              }

              if (typeFilter === 'youtube' && !isYoutube) {
                setEditError('Por favor, cole um link de vídeo ou playlist válido do YouTube.');
                return;
              }

              if (!isSpotify && !isYoutube) {
                setEditError('Cole um link válido do Spotify ou do YouTube.');
                return;
              }
              
              updateCustomStation(editingStation.id, {
                name: editName.trim(),
                url: editUrl.trim(),
                favicon: editFavicon.trim() || 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=80&h=80&fit=crop'
              });
              
              setEditingStation(null);
              setEditName('');
              setEditUrl('');
              setEditFavicon('');
            }} 
            className="bg-white/5 border border-emerald-500/30 rounded-xl p-3 space-y-2 animate-fade-in relative z-20"
          >
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-bold text-emerald-400 tracking-wider font-mono">
                EDITAR STREAMING
              </div>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={typeFilter === 'spotify' ? 'Nome da Playlist do Spotify' : 'Nome da Playlist ou Vídeo do YouTube'}
              className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
            />
            
            <div className="relative">
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder={typeFilter === 'spotify' ? 'Link do Spotify' : 'Link do YouTube'}
                className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 pr-20 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!editUrl.trim()) return;
                  setIsFetchingCover(true);
                  const cover = await fetchCover(editUrl);
                  if (cover) {
                    setEditFavicon(cover);
                  }
                  setIsFetchingCover(false);
                }}
                className="absolute right-1 top-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded font-bold transition-all h-[22px] flex items-center justify-center"
                disabled={isFetchingCover}
              >
                {isFetchingCover ? 'Buscando...' : 'Obter Capa'}
              </button>
            </div>

            <input
              type="text"
              value={editFavicon}
              onChange={(e) => setEditFavicon(e.target.value)}
              placeholder="URL da Capa da Playlist"
              className="w-full bg-black/35 border border-white/5 text-white placeholder-white/30 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-emerald-500/40 transition-all font-sans"
            />

            {editFavicon && (
              <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-lg border border-white/5">
                <img src={editFavicon} className="w-8 h-8 rounded object-cover shrink-0" alt="Prévia" />
                <span className="text-[9px] text-white/50 truncate flex-1 font-mono">{editFavicon}</span>
                <button 
                  type="button" 
                  onClick={() => setEditFavicon('')} 
                  className="text-[9px] text-red-400 hover:underline shrink-0"
                >
                  Remover
                </button>
              </div>
            )}

            {editError && (
              <div className="text-[9px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-1.5 rounded-md leading-normal">
                ⚠️ {editError}
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="bg-white/10 hover:bg-white/15 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Conteúdo Dinâmico */}
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-6 text-white/40 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] tracking-wide font-mono">PESQUISANDO PLAYLISTS...</span>
          </div>
        ) : localSearch.trim() ? (
          // Exibe os resultados da pesquisa
          (() => {
            const filteredSearchResults = typeFilter 
              ? searchResults.filter(s => s.type === typeFilter) 
              : searchResults;
            return (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-white/40 tracking-wider px-1">
                  RESULTADO DA PESQUISA ({filteredSearchResults.length})
                </div>
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map(renderStationItem)
                ) : (
                  <div className="text-center py-6 text-xs text-white/40">
                    Nenhuma playlist encontrada com "{localSearch}".
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          // Exibe favoritos, personalizadas e recomendadas padrão
          <>
            {/* Favoritos */}
            {favorites.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-red-400 tracking-wider px-1 flex items-center gap-1">
                  <Heart className="w-3 h-3" fill="currentColor" /> SUAS PLAYLISTS FAVORITAS
                </div>
                <div className="space-y-1.5">
                  {favorites.map(renderStationItem)}
                </div>
              </div>
            )}

            {/* Playlist Corporativa Padrão (Hub SiYmples) */}
            {typeFilter === 'spotify' && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-400 tracking-wider px-1 flex items-center gap-1">
                  <Music className="w-3 h-3 animate-pulse" /> PLAYLIST DA EMPRESA
                </div>
                <div className="space-y-1.5">
                  {DEFAULT_SPOTIFY_PLAYLISTS.map(renderStationItem)}
                </div>
              </div>
            )}

            {/* Estações Personalizadas do Usuário */}
            {filteredCustom.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-400 tracking-wider px-1 flex items-center gap-1">
                  <Music className="w-3 h-3 animate-pulse" /> SUAS PLAYLISTS ADICIONADAS ({filteredCustom.length})
                </div>
                <div className="space-y-1.5">
                  {filteredCustom.map(renderStationItem)}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
