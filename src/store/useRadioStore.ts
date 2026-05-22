import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Station {
  id: string;
  name: string;
  url: string; // URL da playlist ou música do Spotify (ex: https://open.spotify.com/playlist/...)
  favicon?: string;
  tags?: string[];
  type: 'vibe' | 'spotify';
  vibeType?: 'lofi';
  isCustom?: boolean; // Identificador para playlists adicionadas pelo usuário
}

interface RadioState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentStation: Station | null;
  favoriteStationIds: string[];
  customStations: Station[]; // Playlists customizadas adicionadas pelo usuário
  activeTab: 'vibes' | 'spotify';
  searchQuery: string;
  searchResults: Station[];
  isSearching: boolean;
  isMinimized: boolean;
  
  // Actions
  playStation: (station: Station) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  addFavorite: (stationId: string) => void;
  removeFavorite: (stationId: string) => void;
  addCustomStation: (name: string, url: string, favicon?: string) => void;
  removeCustomStation: (id: string) => void;
  updateCustomStation: (id: string, updates: Partial<Station>) => void;
  searchStations: (query: string) => void;
  toggleMinimize: () => void;
  setActiveTab: (tab: 'vibes' | 'spotify') => void;
  setPlayingState: (isPlaying: boolean) => void;
}

// Focus Vibes (Apenas Lofi conforme solicitado pelo usuário)
export const FOCUS_VIBES_STATIONS: Station[] = [
  {
    id: 'vibe-lofi',
    name: 'Lofi Focus Beats',
    url: 'https://play.streamafrica.net/lofiradio', // Stream de rádio Lofi confiável e HTTPS
    favicon: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=80&h=80&fit=crop',
    tags: ['lofi', 'beats', 'study', 'focus'],
    type: 'vibe',
    vibeType: 'lofi'
  }
];

// Playlists Recomendadas do Spotify (Apenas a playlist oficial Hub SiYmples do cliente)
export const DEFAULT_SPOTIFY_PLAYLISTS: Station[] = [
  {
    id: 'spotify-empresa',
    name: 'Hub SiYmples',
    url: 'https://open.spotify.com/playlist/5kVEIXiuRnwkh5EEfLuFXF?si=4ezkB4XdTd-kdRWzjuLESg',
    favicon: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80&h=80&fit=crop',
    tags: ['empresa', 'colaborativa', 'hub', 'siymples'],
    type: 'spotify'
  }
];

export const useRadioStore = create<RadioState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      volume: 0.5,
      isMuted: false,
      currentStation: FOCUS_VIBES_STATIONS[0], // Começa com Lofi beats por padrão
      favoriteStationIds: [],
      customStations: [],
      activeTab: 'vibes',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      isMinimized: true,

      playStation: (station) => {
        set({ currentStation: station, isPlaying: true });
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
      },

      setVolume: (vol) => {
        const parsedVol = Math.max(0, Math.min(1, vol));
        set({ volume: parsedVol, isMuted: parsedVol === 0 ? true : false });
      },

      toggleMute: () => {
        set((state) => ({ isMuted: !state.isMuted }));
      },

      addFavorite: (stationId) => {
        set((state) => {
          if (state.favoriteStationIds.includes(stationId)) return state;
          return { favoriteStationIds: [...state.favoriteStationIds, stationId] };
        });
      },

      removeFavorite: (stationId) => {
        set((state) => ({
          favoriteStationIds: state.favoriteStationIds.filter((id) => id !== stationId),
        }));
      },

      addCustomStation: (name, url, favicon) => {
        const newStation: Station = {
          id: `spotify-custom-${Date.now()}`,
          name: name.trim(),
          url: url.trim(),
          favicon: favicon?.trim() || 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=80&h=80&fit=crop',
          tags: ['spotify', 'playlist', 'equipe'],
          type: 'spotify',
          isCustom: true
        };

        set((state) => ({
          customStations: [...state.customStations, newStation]
        }));
      },

      removeCustomStation: (id) => {
        set((state) => {
          const nextCustom = state.customStations.filter((s) => s.id !== id);
          
          // Se a playlist deletada era a que estava tocando atualmente, define o Lofi como padrão
          const nextCurrent = state.currentStation?.id === id 
            ? FOCUS_VIBES_STATIONS[0] 
            : state.currentStation;

          // Se estava nos favoritos, remove também
          const nextFavs = state.favoriteStationIds.filter((favId) => favId !== id);

          return {
            customStations: nextCustom,
            currentStation: nextCurrent,
            favoriteStationIds: nextFavs
          };
        });
      },

      updateCustomStation: (id, updates) => {
        set((state) => {
          const nextCustom = state.customStations.map((station) => {
            if (station.id === id) {
              return { ...station, ...updates };
            }
            return station;
          });

          // Se a playlist editada for a que está tocando no momento, atualiza também a currentStation
          const nextCurrent = state.currentStation?.id === id 
            ? { ...state.currentStation, ...updates }
            : state.currentStation;

          return {
            customStations: nextCustom,
            currentStation: nextCurrent
          };
        });
      },

      // Busca local rápida e resiliente que filtra playlists recomendadas, customizadas e favoritas
      searchStations: (query) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: '', isSearching: false });
          return;
        }

        set({ searchQuery: query, isSearching: true });

        const searchLower = query.toLowerCase().trim();
        const allKnownPlaylists = [...get().customStations];
        
        const filtered = allKnownPlaylists.filter((item) => {
          const matchesName = item.name.toLowerCase().includes(searchLower);
          const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(searchLower)) || false;
          return matchesName || matchesTags;
        });

        set({ searchResults: filtered, isSearching: false });
      },

      toggleMinimize: () => {
        set((state) => ({ isMinimized: !state.isMinimized }));
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setPlayingState: (isPlaying) => {
        set({ isPlaying });
      }
    }),
    {
      name: 'hub-focus-station-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        favoriteStationIds: state.favoriteStationIds,
        customStations: state.customStations,
        currentStation: state.currentStation,
        activeTab: state.activeTab,
      }),
      // Garante migração/auto-seed da playlist padrão da empresa para ser 100% editável e deletável
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hasEmpresa = state.customStations.some((s) => 
            s.url.includes('5kVEIXiuRnwkh5EEfLuFXF')
          );
          if (!hasEmpresa) {
            state.customStations = [
              {
                id: 'spotify-empresa',
                name: 'Hub SiYmples',
                url: 'https://open.spotify.com/playlist/5kVEIXiuRnwkh5EEfLuFXF?si=4ezkB4XdTd-kdRWzjuLESg',
                favicon: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80&h=80&fit=crop',
                tags: ['empresa', 'colaborativa', 'hub', 'siymples'],
                type: 'spotify',
                isCustom: true
              },
              ...state.customStations
            ];
          }
        }
      }
    }
  )
);
