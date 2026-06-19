import React, { useState } from 'react';
import { 
  Play, FileText, Image as ImageIcon, Layers, Copy, Check, 
  TrendingUp, Users, DollarSign, Eye, ExternalLink, HelpCircle
} from 'lucide-react';
import { CreativeEntity } from '../entities/creative.entity';

interface CreativeCardProps {
  creative: CreativeEntity;
  realLeadsCount: number;
  realRevenueCount: number;
  onClick: () => void;
}

export function CreativeCard({ creative, realLeadsCount, realRevenueCount, onClick }: CreativeCardProps) {
  const [copied, setCopied] = useState(false);

  // Normalização de métricas: usa reais se existirem, senão manuais
  const leadsCount = realLeadsCount > 0 ? realLeadsCount : creative.conversions;
  const revenueCount = realRevenueCount > 0 ? realRevenueCount : creative.revenue;

  // Cálculos de métricas em tempo real
  const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0;
  const cpc = creative.clicks > 0 ? creative.investment / creative.clicks : 0;
  const cpl = leadsCount > 0 ? creative.investment / leadsCount : 0;
  const roas = creative.investment > 0 ? revenueCount / creative.investment : 0;

  const copyTrackingCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(creative.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'approved': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'archived': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-purple-500/10 text-purple-400 border-purple-500/20'; // draft
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'approved': return 'Aprovado';
      case 'paused': return 'Pausado';
      case 'archived': return 'Arquivado';
      default: return 'Rascunho';
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'success': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'average': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      case 'failure': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
      default: return 'bg-slate-500';
    }
  };

  const getPlatformStyle = (plat: string) => {
    switch (plat.toLowerCase()) {
      case 'meta': return 'bg-blue-600/10 text-blue-400 border-blue-600/20';
      case 'google': return 'bg-rose-600/10 text-rose-400 border-rose-600/20';
      case 'tiktok': return 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20';
      case 'linkedin': return 'bg-sky-700/10 text-sky-400 border-sky-700/20';
      default: return 'bg-slate-600/10 text-slate-400 border-slate-600/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4 text-primary-400" />;
      case 'carousel': return <Layers className="w-4 h-4 text-purple-400" />;
      case 'text': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'reference': return <ExternalLink className="w-4 h-4 text-emerald-400" />;
      default: return <ImageIcon className="w-4 h-4 text-blue-400" />; // image
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Thumbnail URL ou placeholder moderno
  const hasMedia = creative.mediaUrls && creative.mediaUrls.length > 0;
  const mainMediaUrl = hasMedia ? creative.mediaUrls[0] : '';
  const isVideo = creative.type === 'video';

  return (
    <div 
      onClick={onClick}
      className="bg-[#0b0e14]/40 hover:bg-[#0b0e14]/70 backdrop-blur-xl border border-white/10 hover:border-primary-500/30 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer group flex flex-col h-full shadow-lg"
    >
      {/* Container de mídia (topo do card) */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center border-b border-white/5">
        {hasMedia ? (
          isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <video src={mainMediaUrl} className="w-full h-full object-cover opacity-60" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="p-3 bg-primary-500/20 border border-primary-500/40 rounded-full group-hover:bg-primary-500/40 transition-colors">
                  <Play className="w-6 h-6 text-primary-400 fill-primary-400" />
                </div>
              </div>
            </div>
          ) : (
            <img 
              src={mainMediaUrl} 
              alt={creative.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            {getTypeIcon(creative.type)}
            <span className="text-xs uppercase tracking-wider font-semibold">Sem Mídia</span>
          </div>
        )}

        {/* Canto superior esquerdo: score indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`w-3.5 h-3.5 rounded-full ${getScoreColor(creative.score)}`} title={`Score: ${creative.score}`} />
        </div>

        {/* Canto superior direito: status badge */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full border ${getStatusColor(creative.status)}`}>
            {getStatusLabel(creative.status)}
          </span>
          <span className="px-2 py-0.5 text-[10px] bg-slate-900/80 backdrop-blur border border-white/10 rounded-md text-slate-400 font-mono">
            {creative.trackingCode}
          </span>
        </div>

        {/* Hover overlay para copiar trackingCode */}
        <button 
          onClick={copyTrackingCode}
          className="absolute bottom-3 right-3 p-2 bg-slate-900/90 hover:bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs opacity-0 group-hover:opacity-100 duration-200"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Tracking</span>
            </>
          )}
        </button>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Título & Categoria */}
          <div className="flex items-center gap-2 mb-1.5">
            {getTypeIcon(creative.type)}
            <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">
              {creative.category}
            </span>
          </div>
          <h4 className="text-base font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1 mb-1">
            {creative.title}
          </h4>
          {creative.headline && (
            <p className="text-xs text-gray-400 line-clamp-2 italic mb-3">
              "{creative.headline}"
            </p>
          )}
        </div>

        {/* Plataformas e Rodapé */}
        <div>
          {/* Badges de Plataforma */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {creative.platform.map(plat => (
              <span 
                key={plat} 
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase border ${getPlatformStyle(plat)}`}
              >
                {plat}
              </span>
            ))}
            {creative.origin !== 'own' && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase border border-amber-500/20 bg-amber-500/10 text-amber-400">
                {creative.origin === 'competitor' ? 'Concorrente' : 'Inspiração'}
              </span>
            )}
          </div>

          <div className="h-[1px] bg-white/5 my-3" />

          {/* Grid de Mini-Métricas */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-[9px] text-gray-500 block">Investido</span>
              <span className="text-xs font-semibold text-white font-mono">{formatCurrency(creative.investment)}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block">Leads</span>
              <span className="text-xs font-semibold text-white font-mono">{leadsCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block">CTR</span>
              <span className="text-xs font-semibold text-white font-mono">{ctr.toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block">ROAS</span>
              <span className={`text-xs font-bold font-mono ${roas >= 2 ? 'text-emerald-400' : roas > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {roas.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
