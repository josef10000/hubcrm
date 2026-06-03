import React, { useState, useEffect } from 'react';
import { Coffee, Briefcase, Sun, Loader2, Headphones } from 'lucide-react';
import BentoTicker from '../components/BentoTicker';
import FeedAnimeList from '../components/FeedAnimeList';
import CompanyAnnouncements from '../components/CompanyAnnouncements';
import TeamCelebrations from '../components/TeamCelebrations';
import FeedSchedule from '../components/FeedSchedule';
import FeedTrivia from '../components/FeedTrivia';
import SunriseBriefing from '../components/SunriseBriefing';
const DashboardView = React.lazy(() => import('./DashboardView'));

export default function MorningFeedView() {
  const [viewMode, setViewMode] = useState<'morning' | 'work'>('morning');
  const [feedData, setFeedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBriefing, setShowBriefing] = useState(true);
  const [forceBriefingPlay, setForceBriefingPlay] = useState(false);

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
      {showBriefing && (
        <SunriseBriefing 
          forcePlay={forceBriefingPlay}
          onClose={() => {
            setShowBriefing(false);
            setForceBriefingPlay(false);
          }}
        />
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho Customizado e Seletor de Modo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 text-primary-400 text-xs font-black uppercase tracking-wider">
              <Sun size={14} className="animate-pulse" />
              <span>Praça da Comunidade</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">Central Hub</h1>
              <button
                onClick={() => {
                  setForceBriefingPlay(true);
                  setShowBriefing(true);
                }}
                className="p-2 bg-white/5 hover:bg-primary-500/20 border border-white/10 hover:border-primary-500/30 text-gray-400 hover:text-primary-400 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 group shadow-lg"
                title="Ouvir Briefing Matinal"
              >
                <Headphones size={14} className="group-hover:animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-wider pr-1 hidden sm:inline">Briefing</span>
              </button>
            </div>
          </div>

          {/* Toggle Switch Premium */}
          <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1 shadow-inner self-start sm:self-center">
            <button
              onClick={() => setViewMode('morning')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                viewMode === 'morning' 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
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
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
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

            {/* Linha 1: Mural de Comunicados (8 colunas) e Lançamentos Geek (4 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 h-full">
                <CompanyAnnouncements />
              </div>
              <div className="lg:col-span-4 h-full">
                <FeedAnimeList animes={feedData?.animes || []} />
              </div>
            </div>

            {/* Linha 2: Agenda Semanal (8 colunas) e Desafio da Trivia (4 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 h-full">
                <FeedSchedule />
              </div>
              <div className="lg:col-span-4 h-full">
                <FeedTrivia />
              </div>
            </div>

            {/* Linha 3: Aniversariantes do Mês (12 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-12 h-full">
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
