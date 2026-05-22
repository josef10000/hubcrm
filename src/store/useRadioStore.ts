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
  isCustom?: boolean; // Identificador para estações adicionadas pelo usuário
}

interface RadioState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentStation: Station | null;
  favoriteStationIds: string[];
  customStations: Station[]; // Estações personalizadas adicionadas pelo usuário
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
  addCustomStation: (name: string, url: string) => void;
  removeCustomStation: (id: string) => void;
  searchStations: (query: string) => Promise<void>;
  toggleMinimize: () => void;
  setActiveTab: (tab: 'vibes' | 'real') => void;
  setPlayingState: (isPlaying: boolean) => void;
}

// Estações curadas de Focus Vibes (totalmente HTTPS e imunes a firewall corporativo via CDN jsDelivr)
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
    url: 'https://stream.nightride.fm/chillsynth.mp3', // Stream Chillsynth/Synthwave HTTPS super estável da rede Nightride FM
    favicon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&h=80&fit=crop',
    tags: ['synthwave', 'electro', 'cyberpunk', 'retro'],
    type: 'vibe',
    vibeType: 'synthwave'
  },
  {
    id: 'vibe-nature',
    name: 'Chuva na Floresta (Sons da Natureza)',
    url: 'https://cdn.jsdelivr.net/gh/bradtraversy/ambient-sound-mixer@master/sounds/rain.mp3', // Loop estático no GitHub via CDN jsDelivr (totalmente livre de firewalls)
    favicon: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=80&h=80&fit=crop',
    tags: ['chuva', 'natureza', 'relax', 'ruído-branco'],
    type: 'vibe',
    vibeType: 'nature'
  },
  {
    id: 'vibe-nordic',
    name: 'Nordic Piano & Ambient',
    url: 'https://cdn.jsdelivr.net/gh/florinpop17/stream-songs@master/mp3/ambient.mp3', // Loop estático clássico/relaxante no GitHub via CDN jsDelivr
    favicon: 'https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=80&h=80&fit=crop',
    tags: ['piano', 'ambient', 'calmo', 'nordic'],
    type: 'vibe',
    vibeType: 'nordic'
  },
  {
    id: 'vibe-cafe',
    name: 'Café Parisienne Jazz',
    url: 'https://cdn.jsdelivr.net/gh/florinpop17/stream-songs@master/mp3/night-vlog.mp3', // Loop estático Lofi Jazz no GitHub via CDN jsDelivr
    favicon: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=80&h=80&fit=crop',
    tags: ['jazz', 'instrumental', 'café', 'smooth'],
    type: 'vibe',
    vibeType: 'cafe'
  }
];

// Rádios Reais Brasileiras Governamentais/Públicas (totalmente HTTPS e imunes a firewall corporativo via domínios federais .gov.br e .leg.br)
export const DEFAULT_REAL_STATIONS: Station[] = [
  {
    id: 'real-senadofm',
    name: 'Rádio Senado FM',
    url: 'https://radioaovivo.senado.leg.br/fm.mp3', // Excelente programação de Jazz, Bossa Nova, MPB e notícias, imune a bloqueios
    favicon: 'https://static.radios.com.br/img/logo_senado.png',
    tags: ['mpb', 'jazz', 'bossa-nova', 'notícias'],
    type: 'real'
  },
  {
    id: 'real-camara',
    name: 'Rádio Câmara FM',
    url: 'https://stream3.camara.gov.br/radiocamara1', // Programação musical brasileira de alta qualidade, rock nacional e notícias
    favicon: 'https://static.radios.com.br/img/logo_camara.png',
    tags: ['mpb', 'rock-nacional', 'cultura', 'informação'],
    type: 'real'
  },
  {
    id: 'real-mecfm',
    name: 'Rádio MEC FM Rio (EBC)',
    url: 'https://aovivo.ebc.com.br/radiomecfm', // Transmissão oficial da Empresa Brasil de Comunicação - Música Clássica e Jazz
    favicon: 'https://static.radios.com.br/img/logo_mecfm.png',
    tags: ['clássica', 'jazz', 'cultural', 'instrumental'],
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
      customStations: [],
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

      addCustomStation: (name, url) => {
        const newStation: Station = {
          id: `custom-${Date.now()}`,
          name: name.trim(),
          url: url.trim(),
          favicon: 'https://images.unsplash.com/photo-1484755560693-a4074577af3a?w=80&h=80&fit=crop',
          tags: ['personalizada', 'stream', 'web'],
          type: 'real',
          isCustom: true
        };

        set((state) => ({
          customStations: [...state.customStations, newStation]
        }));
      },

      removeCustomStation: (id) => {
        set((state) => {
          const nextCustom = state.customStations.filter((s) => s.id !== id);
          
          // Se a rádio deletada era a que estava tocando atualmente, define a primeira vibe como padrão
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
        customStations: state.customStations, // Persistir estações personalizadas do usuário
        currentStation: state.currentStation,
        activeTab: state.activeTab,
      }),
    }
  )
);
