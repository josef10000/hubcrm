import React, { useState, useEffect } from 'react';
import { Coffee, Briefcase, Sun, Loader2 } from 'lucide-react';
import BentoTicker from '../components/BentoTicker';
import FeedNews from '../components/FeedNews';
import FeedAnimeList from '../components/FeedAnimeList';
import CompanyAnnouncements from '../components/CompanyAnnouncements';
import TeamCelebrations from '../components/TeamCelebrations';
const DashboardView = React.lazy(() => import('./DashboardView'));

export default function MorningFeedView() {
  const [viewMode, setViewMode] = useState<'morning' | 'work'>('morning');
  const [feedData, setFeedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/feed')
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar feed');
        return res.json();
      })
      .then((data) => {
        setFeedData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MorningFeedView] Falha ao carregar feed:', err);
        setLoading(false);
      });
  }, []);

  if (loading && viewMode === 'morning') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] relative z-10">
        <Loader2 className="animate-spin text-primary-500 mb-2" size={32} />
        <span className="text-sm text-gray-400 font-medium">Preparando o seu café matinal...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho Customizado e Seletor de Modo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 text-primary-400 text-xs font-black uppercase tracking-wider">
              <Sun size={14} className="animate-pulse" />
              <span>Praça da Comunidade</span>
            </div>
            <h1 className="text-2xl font-black text-white">Central Hub</h1>
          </div>

          {/* Toggle Switch Premium */}
          <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1 shadow-inner self-start sm:self-center">
            <button
              onClick={() => setViewMode('morning')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                viewMode === 'morning' 
                  ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Coffee size={14} />
              Café Matinal
            </button>
            <button
              onClick={() => setViewMode('work')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                viewMode === 'work' 
                  ? 'bg-primary-500 text-gray-900 shadow-lg shadow-primary-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Briefcase size={14} />
              Operações
            </button>
          </div>
        </div>

        {/* Renderização Condicional com Transição */}
        {viewMode === 'morning' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Ticker Financeiro */}
            {feedData?.financial && (
              <BentoTicker financial={feedData.financial} />
            )}

            {/* Bento Grid Superior: Notícias (8 colunas) e Animes (4 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 h-full">
                <FeedNews news={feedData?.news || []} />
              </div>
              <div className="lg:col-span-4 h-full">
                <FeedAnimeList animes={feedData?.animes || []} />
              </div>
            </div>

            {/* Bento Grid Inferior: Comunicados (8 colunas) e Aniversariantes (4 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 h-full">
                <CompanyAnnouncements />
              </div>
              <div className="lg:col-span-4 h-full">
                <TeamCelebrations />
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <React.Suspense fallback={
              <div className="bg-black/30 border border-white/5 p-8 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center min-h-[300px] w-full">
                <Loader2 className="animate-spin text-primary-500 mb-2" size={24} />
                <span className="text-xs text-gray-400 font-medium">Sincronizando dados operacionais...</span>
              </div>
            }>
              <DashboardView />
            </React.Suspense>
          </div>
        )}

      </div>
    </div>
  );
}
