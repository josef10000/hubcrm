import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Station {
  id: string;
  name: string;
  url: string;
  favicon?: string;
  tags?: string[];
  type: 'vibe' | 'real';
  vibeType?: 'lofi' | 'synthwave' | 'nordic' | 'nature' | 'cafe';
}

interface RadioState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentStation: Station | null;
  favoriteStationIds: string[];
  activeTab: 'vibes' | 'real';
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
  searchStations: (query: string) => Promise<void>;
  toggleMinimize: () => void;
  setActiveTab: (tab: 'vibes' | 'real') => void;
  setPlayingState: (isPlaying: boolean) => void;
}

// Estações curadas de Focus Vibes (totalmente HTTPS e estáveis)
export const FOCUS_VIBES_STATIONS: Station[] = [
  {
    id: 'vibe-lofi',
    name: 'Lofi Focus Beats',
    url: 'https://play.streamafrica.net/lofiradio', // Stream de rádio Lofi confiável e HTTPS
    favicon: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=80&h=80&fit=crop',
    tags: ['lofi', 'beats', 'study', 'focus'],
    type: 'vibe',
    vibeType: 'lofi'
  },
  {
    id: 'vibe-synthwave',
    name: 'Synthwave Pulse',
    url: 'https://synthetix.fm/stream', // Rádio Synthwave/Retro HTTPS
    favicon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&h=80&fit=crop',
    tags: ['synthwave', 'electro', 'cyberpunk', 'retro'],
    type: 'vibe',
    vibeType: 'synthwave'
  },
  {
    id: 'vibe-nature',
    name: 'Chuva na Floresta (Sons da Natureza)',
    url: 'https://ambient.suitemusic.io/rain', // Stream de som de chuva contínuo HTTPS
    favicon: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=80&h=80&fit=crop',
    tags: ['chuva', 'natureza', 'relax', 'ruído branco'],
    type: 'vibe',
    vibeType: 'nature'
  },
  {
    id: 'vibe-nordic',
    name: 'Nordic Piano & Ambient',
    url: 'https://stream.zeno.fm/9sgz7v64n0eux', // Rádio clássica/ambient HTTPS
    favicon: 'https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=80&h=80&fit=crop',
    tags: ['piano', 'ambient', 'calmo', 'nordic'],
    type: 'vibe',
    vibeType: 'nordic'
  },
  {
    id: 'vibe-cafe',
    name: 'Café Parisienne Jazz',
    url: 'https://jazz.streamr.vip/jazz-cafe', // Stream clássico de Jazz HTTPS
    favicon: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=80&h=80&fit=crop',
    tags: ['jazz', 'instrumental', 'café', 'smooth'],
    type: 'vibe',
    vibeType: 'cafe'
  }
];

// Rádios Reais Brasileiras recomendadas por padrão (HTTPS)
export const DEFAULT_REAL_STATIONS: Station[] = [
  {
    id: 'real-antena1',
    name: 'Antena 1 FM',
    url: 'https://stream.antena1.com.br/stream3',
    favicon: 'https://static.radios.com.br/img/logo_antena1.png',
    tags: ['pop', 'flashback', 'nacional', 'internacional'],
    type: 'real'
  },
  {
    id: 'real-cbn-sp',
    name: 'CBN São Paulo (News)',
    url: 'https://26763.live.streamtheworld.com/CBN_SP_AAC.aac',
    favicon: 'https://globoplay.globo.com/cbn/logo.png',
    tags: ['notícias', 'esportes', 'talk'],
    type: 'real'
  },
  {
    id: 'real-89fm',
    name: '89 FM A Rádio Rock',
    url: 'https://24493.live.streamtheworld.com/RADIO_89FM_AAC.aac',
    favicon: 'https://static.radios.com.br/img/logo_89fm.png',
    tags: ['rock', 'pop-rock', 'nacional', 'alternativo'],
    type: 'real'
  },
  {
    id: 'real-mixfm',
    name: 'Mix FM São Paulo',
    url: 'https://24353.live.streamtheworld.com/MIXFM_SP_AAC.aac',
    favicon: 'https://static.radios.com.br/img/logo_mixfm.png',
    tags: ['pop', 'jovem', 'hits'],
    type: 'real'
  },
  {
    id: 'real-alpha',
    name: 'Alpha FM 101.7',
    url: 'https://26183.live.streamtheworld.com/ALPHAFM_SP_AAC.aac',
    favicon: 'https://static.radios.com.br/img/logo_alphafm.png',
    tags: ['adulto-contemporâneo', 'flashback', 'smooth'],
    type: 'real'
  },
  {
    id: 'real-jovempan',
    name: 'Jovem Pan FM São Paulo',
    url: 'https://24313.live.streamtheworld.com/JP_FM_SP_AAC.aac',
    favicon: 'https://static.radios.com.br/img/logo_jovempan.png',
    tags: ['pop', 'jovem', 'notícias'],
    type: 'real'
  }
];

export const useRadioStore = create<RadioState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      volume: 0.5,
      isMuted: false,
      currentStation: FOCUS_VIBES_STATIONS[0], // Começa com o Lofi Beats por padrão
      favoriteStationIds: [],
      activeTab: 'vibes',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      isMinimized: true, // Começa minimizado de forma elegante por padrão

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

      searchStations: async (query) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: '', isSearching: false });
          return;
        }

        set({ searchQuery: query, isSearching: true });

        try {
          // Consultando servidores espelhos estáveis da API Radio-Browser comunitária
          const response = await fetch(
            `https://de1.api.radio-browser.info/json/stations/search?countrycode=BR&https=true&name=${encodeURIComponent(
              query
            )}&order=clickcount&reverse=true&limit=25`
          );

          if (!response.ok) throw new Error('Falha ao buscar rádios');

          const data = await response.json();

          const formattedStations: Station[] = data.map((item: any) => ({
            id: item.changeuuid,
            name: item.name,
            url: item.url_resolved || item.url,
            favicon: item.favicon || 'https://images.unsplash.com/photo-1484755560693-a4074577af3a?w=80&h=80&fit=crop',
            tags: item.tags ? item.tags.split(',').slice(0, 3).map((t: string) => t.trim()) : [],
            type: 'real',
          }));

          set({ searchResults: formattedStations, isSearching: false });
        } catch (error) {
          console.error('Erro ao buscar rádios online:', error);
          set({ isSearching: false, searchResults: [] });
        }
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
        currentStation: state.currentStation,
        activeTab: state.activeTab,
      }),
    }
  )
);
