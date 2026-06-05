import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { useNexusStore, ActivityLog, NexusBook } from '@store/useNexusStore';
import { 
  format, 
  subMonths, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  isSameDay, 
  subDays,
  getDay,
  addDays,
  getMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-bold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const getTimestampMs = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  if (timestamp.seconds !== undefined) return timestamp.seconds * 1000;
  const parsed = new Date(timestamp).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
};

export const NexusStats: React.FC = () => {
  const { activityLogs, books, notes, bookAnimationMode, setBookAnimationMode } = useNexusStore();

  const cycleAnimationMode = () => {
    if (bookAnimationMode === 'realist_3d') {
      setBookAnimationMode('new');
    } else if (bookAnimationMode === 'new') {
      setBookAnimationMode('fixed_3d');
    } else if (bookAnimationMode === 'fixed_3d') {
      setBookAnimationMode('parallax_2.5d');
    } else if (bookAnimationMode === 'parallax_2.5d') {
      setBookAnimationMode('zoom');
    } else if (bookAnimationMode === 'zoom') {
      setBookAnimationMode('none');
    } else {
      setBookAnimationMode('realist_3d');
    }
  };

  const getAnimationLabel = (mode: string) => {
    switch (mode) {
      case 'realist_3d': return '3D Realista (Lombada)';
      case 'new': return '3D Interativo (Mouse)';
      case 'fixed_3d': return '3D Fixo (Um Lado)';
      case 'parallax_2.5d': return '2.5D Clássico (Glass Parallax)';
      case 'zoom': return 'Zoom Clássico (Plano)';
      case 'none': return 'Sem Animação (Estático)';
      default: return '3D Realista (Lombada)';
    }
  };

  const getAnimationIcon = (mode: string) => {
    switch (mode) {
      case 'realist_3d': return 'ph-book-open text-orange-400';
      case 'new': return 'ph-cube-transparent text-primary-400';
      case 'fixed_3d': return 'ph-cube text-emerald-400';
      case 'parallax_2.5d': return 'ph-sparkles text-amber-400';
      case 'zoom': return 'ph-arrow-square-out text-blue-400';
      case 'none': return 'ph-selection text-gray-500';
      default: return 'ph-book-open';
    }
  };

  // 1. Streak de Sabedoria (Dias seguidos)
  const streak = React.useMemo(() => {
    if (activityLogs.length === 0) return 0;
    
    // Pega todas as datas únicas com atividade
    const activityDays = [...new Set(activityLogs.map(log => 
      format(getTimestampMs(log.timestamp), 'yyyy-MM-dd')
    ))].sort().reverse();

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Se não leu hoje nem ontem, o streak quebrou
    if (activityDays[0] !== today && activityDays[0] !== yesterday) return 0;

    let currentStreak = 0;
    const [year, month, day] = activityDays[0].split('-').map(Number);
    let checkDate = new Date(year, month - 1, day);

    for (let i = 0; i < activityDays.length; i++) {
      const expectedDate = format(subDays(checkDate, i), 'yyyy-MM-dd');
      if (activityDays[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [activityLogs]);

  // 2. Heatmap de Calendário GitHub-style (Últimos 12 meses) — Fonte de dados híbrida
  const [hoveredDay, setHoveredDay] = React.useState<{ date: Date; pages: number; notes: number; x: number; y: number } | null>(null);

  const calendarData = React.useMemo(() => {
    const today = new Date();
    const yearAgo = subDays(today, 364);
    const days = eachDayOfInterval({ start: yearAgo, end: today });

    // Fonte híbrida: activityLogs + fallback de notas updatedAt
    const notesByDay = new Map<string, number>();
    notes.forEach(n => {
      if (n.updatedAt) {
        const key = format(getTimestampMs(n.updatedAt), 'yyyy-MM-dd');
        notesByDay.set(key, (notesByDay.get(key) || 0) + 1);
      }
    });

    const dayData = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayLogs = activityLogs.filter(log => isSameDay(getTimestampMs(log.timestamp), day));
      const pagesFromLogs = dayLogs.reduce((acc, log) => acc + (log.pagesRead || 0), 0);
      const notesFromLogs = dayLogs.filter(log => log.type === 'note').length;
      
      // Fallback: notas editadas/criadas nesse dia
      const notesFromStore = notesByDay.get(key) || 0;
      const totalNotes = Math.max(notesFromLogs, notesFromStore);
      
      const totalIntensity = pagesFromLogs + (totalNotes * 5);
      
      return {
        date: day,
        dayOfWeek: getDay(day),
        intensity: totalIntensity === 0 ? 0 : Math.min(Math.ceil(totalIntensity / 5), 4),
        pages: pagesFromLogs,
        notes: totalNotes
      };
    });

    // Organizar em semanas (colunas) para layout GitHub
    const weeks: typeof dayData[] = [];
    let currentWeek: typeof dayData = [];
    
    // Preencher dias vazios no início da primeira semana (antes do yearAgo)
    const firstDayOfWeek = getDay(yearAgo); // 0=Dom, 6=Sáb
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: addDays(yearAgo, -(firstDayOfWeek - i)), dayOfWeek: i, intensity: -1, pages: 0, notes: 0 });
    }

    dayData.forEach(d => {
      currentWeek.push(d);
      if (d.dayOfWeek === 6) { // Sábado = fim da semana
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, dayData };
  }, [activityLogs, notes]);

  // Resumo do mês atual
  const monthSummary = React.useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const monthDays = calendarData.dayData.filter(d => d.date >= mStart && d.date <= mEnd);
    
    const totalPages = monthDays.reduce((acc, d) => acc + d.pages, 0);
    const totalNotes = monthDays.reduce((acc, d) => acc + d.notes, 0);
    const activeDays = monthDays.filter(d => d.intensity > 0).length;
    const bestDay = monthDays.reduce((best, d) => d.pages > best.pages ? d : best, { pages: 0, date: now, notes: 0, intensity: 0, dayOfWeek: 0 });

    return { totalPages, totalNotes, activeDays, bestDay };
  }, [calendarData]);

  // Labels dos meses para o eixo superior
  const monthLabels = React.useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    calendarData.weeks.forEach((week, wi) => {
      const firstValidDay = week.find(d => d.intensity >= 0);
      if (firstValidDay) {
        const m = getMonth(firstValidDay.date);
        if (m !== lastMonth) {
          labels.push({ label: format(firstValidDay.date, 'MMM', { locale: ptBR }), weekIndex: wi });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [calendarData]);

  // 3. Radar de Tópicos (Baseado em páginas lidas por categoria)
  const radarData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    books.forEach(book => {
      const cat = book.category || 'Geral';
      const pages = book.currentPage || 0;
      categories[cat] = (categories[cat] || 0) + pages;
    });

    const values = Object.values(categories);
    const max = values.length > 0 ? Math.max(...values) : 100;

    return Object.entries(categories).map(([name, value]) => ({
      subject: name,
      A: value,
      fullMark: max
    }));
  }, [books]);

  // 4. Volume Mensal (Últimos 6 meses)
  const volumeData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthLogs = activityLogs.filter(log => {
        const ms = getTimestampMs(log.timestamp);
        return ms >= monthStart.getTime() && ms <= monthEnd.getTime();
      });

      const pages = monthLogs.reduce((acc, log) => acc + (log.pagesRead || 0), 0);
      const notesCount = monthLogs.filter(log => log.type === 'note').length;

      return {
        name: format(month, 'MMM', { locale: ptBR }),
        pages,
        notes: notesCount
      };
    });
  }, [activityLogs]);

  // 5. Ranking de Retenção (Insights por 100 Páginas)
  const retentionRanking = React.useMemo(() => {
    return books
      .map(book => {
        // Notas criadas especificamente vinculadas a este livro via logs
        const bookActivityNotes = activityLogs.filter(log => 
          log.type === 'note' && log.bookId === book.id
        ).length;

        // Fallback: notas que mencionam o título no conteúdo
        const mentionNotes = notes.filter(n => 
          n.content.toLowerCase().includes(book.title.toLowerCase()) || 
          n.title.toLowerCase().includes(book.title.toLowerCase())
        ).length;

        const totalInsights = Math.max(bookActivityNotes, mentionNotes);
        const pagesRead = book.currentPage || 0;
        
        // Retenção = Notas por 100 páginas lidas
        const retention = pagesRead > 0 ? (totalInsights / pagesRead) * 100 : 0;
        
        return {
          title: book.title,
          retention: Math.round(retention * 10) / 10,
          notes: totalInsights,
          pages: pagesRead,
          id: book.id
        };
      })
      .filter(b => b.pages > 0) 
      .sort((a, b) => b.retention - a.retention)
      .slice(0, 5);
  }, [books, notes, activityLogs]);

  // 6. Ritmo de Leitura + Consistência (Últimos 30 dias)
  const readingRhythm = React.useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    const last30 = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    let totalPages = 0;
    let activeDays = 0;

    last30.forEach(day => {
      const dayLogs = activityLogs.filter(log => isSameDay(getTimestampMs(log.timestamp), day));
      const pages = dayLogs.reduce((acc, log) => acc + (log.pagesRead || 0), 0);
      const hasNotes = notes.some(n => n.updatedAt && isSameDay(getTimestampMs(n.updatedAt), day));
      
      totalPages += pages;
      if (pages > 0 || dayLogs.length > 0 || hasNotes) activeDays++;
    });

    const avgPerDay = activeDays > 0 ? Math.round((totalPages / activeDays) * 10) / 10 : 0;
    const consistencyPercent = Math.round((activeDays / 30) * 100);

    return { avgPerDay, activeDays, consistencyPercent };
  }, [activityLogs, notes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
      
      {/* Controladores de Interface */}
      <div className="md:col-span-12 bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        <div className="absolute -left-4 -top-4 w-24 h-24 bg-primary-500/10 blur-3xl rounded-full" />
        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aparência da Biblioteca</span>
          <h4 className="text-xs font-black text-white uppercase tracking-widest">Efeitos Visuais das Capas</h4>
          <p className="text-[9px] font-bold text-gray-600 uppercase">Selecione o estilo de transição ao passar o mouse nas capas dos livros</p>
        </div>
        
        <button 
          onClick={cycleAnimationMode}
          className="flex items-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 px-6 py-4 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95 group/btn cursor-pointer min-w-[280px] relative z-10"
        >
          <div className="p-2.5 rounded-xl bg-white/5 group-hover/btn:scale-110 transition-all shrink-0">
            <i className={`ph-bold ${getAnimationIcon(bookAnimationMode)} text-xl`} />
          </div>
          <div className="text-left">
            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Estilo Ativo (Clique para Mudar)</div>
            <div className="text-xs font-black text-white uppercase tracking-wider">{getAnimationLabel(bookAnimationMode)}</div>
          </div>
          <i className="ph-bold ph-arrows-clockwise text-gray-500 ml-auto group-hover/btn:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {/* Header Stats */}
      <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-2 relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Streak de Sabedoria</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-orange-500">{streak}</span>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Dias Seguidos</span>
          </div>
          <i className="ph-fill ph-fire text-orange-500/20 absolute bottom-4 right-4 text-4xl" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-3 relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          {/* Ritmo */}
          <div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ritmo de Leitura</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-black text-blue-400">{readingRhythm.avgPerDay}</span>
              <span className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Pág / Dia</span>
            </div>
          </div>
          {/* Consistência */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Consistência</span>
              <span className={`text-[10px] font-black uppercase ${readingRhythm.consistencyPercent >= 80 ? 'text-emerald-400' : readingRhythm.consistencyPercent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{readingRhythm.activeDays}/30 dias</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${readingRhythm.consistencyPercent}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${readingRhythm.consistencyPercent >= 80 ? 'bg-emerald-500' : readingRhythm.consistencyPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              />
            </div>
          </div>
          <i className="ph-fill ph-chart-line-up text-blue-500/15 absolute bottom-3 right-4 text-3xl" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-2 relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Meta de {new Date().getFullYear()}</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-emerald-500">{books.filter(b => b.status === 'finished').length}</span>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Lidos / 50</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(books.filter(b => b.status === 'finished').length / 50) * 100}%` }} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-2 relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Taxa de Retenção</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-purple-500">
              {(() => {
                const totalPages = books.reduce((acc, b) => acc + (b.currentPage || 0), 0);
                if (totalPages === 0) return 0;
                return Math.round((notes.length / totalPages) * 100);
              })()}
            </span>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">% Insights</span>
          </div>
          <div className="mt-1 flex flex-col">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">Insights por 100 páginas</span>
            <p className="text-[8px] font-medium text-gray-600 uppercase leading-none mt-0.5">
              Reflete a densidade de anotações sobre o volume lido
            </p>
          </div>
          <div className="absolute bottom-4 right-4 bg-purple-500/10 w-10 h-10 rounded-xl flex items-center justify-center border border-purple-500/10">
            <span className="text-[10px] font-black text-purple-400">{notes.length}</span>
          </div>
        </motion.div>
      </div>

      {/* Heatmap de Calendário — GitHub Style */}
      <div className="md:col-span-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Calendário de Leitura</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Atividade diária de leitura e anotações no último ano</p>
          </div>
        </div>

        {/* Tooltip flutuante */}
        {hoveredDay && hoveredDay.pages + hoveredDay.notes > 0 && (
          <div 
            className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl shadow-2xl"
            style={{ left: hoveredDay.x + 12, top: hoveredDay.y - 40 }}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{format(hoveredDay.date, 'dd MMM yyyy', { locale: ptBR })}</p>
            <p className="text-[10px] font-bold text-primary-400">{hoveredDay.pages} páginas · {hoveredDay.notes} notas</p>
          </div>
        )}

        {/* Grid do Calendário */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col gap-0">
            {/* Labels dos meses no topo */}
            <div className="flex ml-8 mb-1">
              {calendarData.weeks.map((_, wi) => {
                const label = monthLabels.find(m => m.weekIndex === wi);
                return (
                  <div key={wi} className="w-[13px] flex-shrink-0 mx-[1px]">
                    {label && (
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {label.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Linhas dos dias da semana */}
            {['Dom', '', 'Ter', '', 'Qui', '', 'Sáb'].map((dayLabel, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-0">
                <div className="w-7 text-right pr-1.5 flex-shrink-0">
                  <span className="text-[8px] font-bold text-gray-600 uppercase">{dayLabel}</span>
                </div>
                <div className="flex gap-[2px]">
                  {calendarData.weeks.map((week, wi) => {
                    const day = week.find(d => d.dayOfWeek === rowIndex);
                    if (!day || day.intensity === -1) {
                      return <div key={wi} className="w-[11px] h-[11px] rounded-[2px]" />;
                    }
                    return (
                      <motion.div
                        key={wi}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: wi * 0.003, duration: 0.2 }}
                        className={`w-[11px] h-[11px] rounded-[2px] transition-all cursor-pointer hover:ring-1 hover:ring-white/30 ${
                          day.intensity === 0 ? 'bg-white/[0.04]' :
                          day.intensity === 1 ? 'bg-emerald-500/25' :
                          day.intensity === 2 ? 'bg-emerald-500/50' :
                          day.intensity === 3 ? 'bg-emerald-500/75' :
                          'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                        }`}
                        onMouseEnter={(e) => setHoveredDay({ date: day.date, pages: day.pages, notes: day.notes, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legenda + Resumo */}
        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Legenda de cores */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-gray-600 uppercase">Menos</span>
            <div className="flex gap-[3px]">
              {[0, 1, 2, 3, 4].map(level => (
                <div key={level} className={`w-[10px] h-[10px] rounded-[2px] ${
                  level === 0 ? 'bg-white/[0.04]' :
                  level === 1 ? 'bg-emerald-500/25' :
                  level === 2 ? 'bg-emerald-500/50' :
                  level === 3 ? 'bg-emerald-500/75' :
                  'bg-emerald-400'
                }`} />
              ))}
            </div>
            <span className="text-[8px] font-bold text-gray-600 uppercase">Mais</span>
          </div>

          {/* Resumo do mês */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-bold text-gray-400">{monthSummary.totalPages} páginas este mês</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[9px] font-bold text-gray-400">{monthSummary.totalNotes} notas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[9px] font-bold text-gray-400">{monthSummary.activeDays} dias ativos</span>
            </div>
            {monthSummary.bestDay.pages > 0 && (
              <span className="text-[9px] font-black text-emerald-400">🔥 Melhor dia: {monthSummary.bestDay.pages}p em {format(monthSummary.bestDay.date, 'dd/MM')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Radar de Tópicos */}
      <div className="md:col-span-4 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-8 self-start text-left">Radar de Tópicos</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} 
              />
              <Radar
                name="Volume"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="md:col-span-12 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-8">Volume Mensal (Páginas vs Notas)</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'black' }} 
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="pages" name="Páginas Lidas" radius={[10, 10, 0, 0]} barSize={40}>
                {volumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#blueGradient)" />
                ))}
              </Bar>
              <Bar dataKey="notes" name="Notas Criadas" radius={[10, 10, 0, 0]} barSize={15}>
                {volumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#purpleGradient)" />
                ))}
              </Bar>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention Ranking */}
      <div className="md:col-span-12 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 text-left">Top 5 - Ranking de Retenção (Insights/Pág)</h3>
        <div className="space-y-4">
          {retentionRanking.length > 0 ? retentionRanking.map((book, i) => (
            <div key={i} className="flex items-center gap-6 group">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-black text-gray-500 group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-all">
                #{i + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{book.title}</span>
                  <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{book.retention}% Retenção</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(book.retention * 2, 100)}%` }} // Escala para visualização
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">{book.notes} Notas</div>
                <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{book.pages} Páginas</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-10">
              <i className="ph ph-mask-unhappy text-4xl text-gray-700 mb-2" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Ainda não há dados suficientes para o ranking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
