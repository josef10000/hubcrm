import React, { useState } from 'react';
import { ExternalLink, Newspaper, Calendar } from 'lucide-react';

interface NewsItem {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  imageUrl: string | null;
}

interface FeedNewsProps {
  news: NewsItem[];
}

export default function FeedNews({ news }: FeedNewsProps) {
  const [filter, setFilter] = useState<'all' | 'tech' | 'economy'>('all');

  const filteredNews = news.filter(item => {
    if (filter === 'tech') return item.source === 'G1 Tecnologia';
    if (filter === 'economy') return item.source === 'InfoMoney';
    return true;
  });

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-6 text-left h-full min-h-[420px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Newspaper size={18} className="text-primary-500" />
          Radar Corporativo & Tech
        </h3>
        
        {/* Filtros em Abas Segmentadas */}
        <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 text-[10px] font-bold w-fit">
          {(['all', 'tech', 'economy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                filter === tab ? 'bg-primary-500 text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'Tudo' : tab === 'tech' ? 'Tech' : 'Economia'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[380px] custom-scrollbar">
        {filteredNews.length === 0 ? (
          <div className="h-full flex items-center justify-center py-12">
            <p className="text-xs text-gray-500">Nenhuma notícia disponível para o filtro selecionado.</p>
          </div>
        ) : (
          filteredNews.map((item, idx) => {
            const dateStr = item.pubDate 
              ? new Date(item.pubDate).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 p-4 rounded-2xl transition-all duration-300"
              >
                {item.imageUrl && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        item.source === 'InfoMoney' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {item.source}
                      </span>
                      {dateStr && (
                        <span className="text-[8px] text-gray-500 font-bold flex items-center gap-1">
                          <Calendar size={8} />
                          {dateStr}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1.5 leading-tight group-hover:text-primary-400 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{item.summary}</p>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
