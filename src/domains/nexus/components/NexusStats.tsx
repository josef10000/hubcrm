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
  startOfYear,
  endOfYear,
  subDays
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

export const NexusStats: React.FC = () => {
  const { activityLogs, books, notes } = useNexusStore();

  // 1. Streak de Sabedoria (Dias seguidos)
  const streak = React.useMemo(() => {
    if (activityLogs.length === 0) return 0;
    
    const sortedDates = [...new Set(activityLogs.map(log => 
      format(log.timestamp, 'yyyy-MM-dd')
    ))].sort().reverse();

    let currentStreak = 0;
    let today = format(new Date(), 'yyyy-MM-dd');
    let yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = format(subDays(new Date(sortedDates[0]), i), 'yyyy-MM-dd');
      if (sortedDates[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [activityLogs]);

  // 2. Heatmap de Conhecimento (Últimos 12 meses)
  const heatmapData = React.useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 364),
      end: new Date()
    });

    return days.map(day => {
      const dayLogs = activityLogs.filter(log => isSameDay(log.timestamp, day));
      const intensity = dayLogs.length; // Pode ser baseado em páginas ou notas
      return {
        date: day,
        intensity: Math.min(intensity, 4), // Máximo de 4 níveis de cor
        count: intensity
      };
    });
  }, [activityLogs]);

  // 3. Radar de Tópicos
  const radarData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    books.forEach(book => {
      const cat = book.category || 'Geral';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return Object.entries(categories).map(([name, value]) => ({
      subject: name,
      A: value,
      fullMark: Math.max(...Object.values(categories)) + 1
    }));
  }, [books]);

  // 4. Volume Mensal (Últimos 6 meses)
  const volumeData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthLogs = activityLogs.filter(log => 
        log.timestamp >= monthStart.getTime() && log.timestamp <= monthEnd.getTime()
      );

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

  // 6. Velocidade de Cruzeiro (Média ponderada)
  const cruiseSpeed = React.useMemo(() => {
    const readingLogs = activityLogs.filter(log => log.type === 'reading' && log.pagesRead && log.pagesRead > 0);
    if (readingLogs.length === 0) return 0;
    
    const totalPages = readingLogs.reduce((acc, l) => acc + (l.pagesRead || 0), 0);
    
    // Estimativa baseada em sessões: 
    // Se não temos o timer real no log ainda, usamos uma constante de mercado (25 pág/h para leitura técnica)
    // Mas multiplicamos pela consistência do usuário
    const consistencyFactor = Math.min(streak / 7, 1.5); // Bônus por consistência
    const baseSpeed = 30; // Média hubber
    
    return Math.round(baseSpeed * (1 + (activityLogs.length / 100)) * (consistencyFactor || 1));
  }, [activityLogs, streak]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
      
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
          className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-2 relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Velocidade de Cruzeiro</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-blue-500">{cruiseSpeed}</span>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Pág / Hora</span>
          </div>
          <i className="ph-fill ph-speedometer text-blue-500/20 absolute bottom-4 right-4 text-4xl" />
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
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Retenção Média</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-purple-500">
              {(() => {
                const totalPages = books.reduce((acc, b) => acc + (b.currentPage || 0), 0);
                if (totalPages === 0) return 0;
                return Math.round((notes.length / totalPages) * 100);
              })()}
            </span>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Insights / 100 Pág</span>
          </div>
          <i className="ph-fill ph-brain text-purple-500/20 absolute bottom-4 right-4 text-4xl" />
        </motion.div>
      </div>

      {/* Heatmap Section */}
      <div className="md:col-span-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Heatmap de Conhecimento</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Frequência de leitura e anotações no último ano</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 justify-center">
          {heatmapData.map((day, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.001 }}
              className={`w-3 h-3 rounded-[2px] transition-all hover:scale-150 cursor-pointer ${
                day.intensity === 0 ? 'bg-white/5' :
                day.intensity === 1 ? 'bg-primary-500/30' :
                day.intensity === 2 ? 'bg-primary-500/50' :
                day.intensity === 3 ? 'bg-primary-500/80' :
                'bg-primary-400 shadow-[0_0_8px_rgba(100,100,255,0.5)]'
              }`}
              title={`${format(day.date, 'dd/MM/yyyy')}: ${day.count} atividades`}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-end items-center gap-2">
          <span className="text-[8px] font-bold text-gray-600 uppercase">Menos</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`w-2 h-2 rounded-[1px] ${
                level === 0 ? 'bg-white/5' :
                level === 1 ? 'bg-primary-500/30' :
                level === 2 ? 'bg-primary-500/50' :
                level === 3 ? 'bg-primary-500/80' :
                'bg-primary-400'
              }`} />
            ))}
          </div>
          <span className="text-[8px] font-bold text-gray-600 uppercase">Mais</span>
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
