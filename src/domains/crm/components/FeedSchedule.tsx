import React from 'react';
import { format, isSameDay, isAfter, startOfToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Video, User } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';

export default function FeedSchedule() {
  const { userProfile } = useAuth();
  const { appointments } = useCRM();
  
  if (!userProfile) return null;

  const today = startOfToday();
  const endOfWeek = addDays(today, 6);

  // Filtrar compromissos aprovados relacionados ao usuário atual na janela da próxima semana
  const userAppointments = (appointments || [])
    .filter(a => 
      (a.targetId === userProfile.uid || a.requesterId === userProfile.uid) && 
      a.status === 'approved' &&
      a.startTime >= today.getTime() &&
      a.startTime <= endOfWeek.getTime() + 24 * 60 * 60 * 1000 // até o fim do 7º dia
    )
    .sort((a, b) => a.startTime - b.startTime);

  // Agrupar compromissos por data
  const grouped: Record<string, typeof userAppointments> = {};
  userAppointments.forEach(app => {
    const dateStr = format(new Date(app.startTime), 'yyyy-MM-dd');
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(app);
  });

  // Gerar dias da semana para exibição agrupada
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-6 text-left h-full min-h-[380px] flex flex-col relative overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Calendar size={18} className="text-blue-500" />
          Sua Agenda Semanal
        </h3>
        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 rounded-lg uppercase tracking-wider">
          Reuniões
        </span>
      </div>

      {/* Conteúdo da Agenda */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[280px] custom-scrollbar">
        {userAppointments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-2">
            <span className="text-2xl">📅</span>
            <p className="text-xs text-gray-500 max-w-sm">
              Nenhum compromisso agendado para os próximos 7 dias. Aproveite o tempo livre para focar em suas metas!
            </p>
          </div>
        ) : (
          days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayApps = grouped[dateKey] || [];
            
            if (dayApps.length === 0) return null;

            const isDayToday = isSameDay(day, today);
            const isDayTomorrow = isSameDay(day, addDays(today, 1));
            
            let dayTitle = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR });
            if (isDayToday) dayTitle = 'Hoje';
            else if (isDayTomorrow) dayTitle = 'Amanhã';

            return (
              <div key={dateKey} className="space-y-2 animate-in fade-in duration-300">
                <h4 className={`text-[10px] font-black uppercase tracking-wider pl-1 ${
                  isDayToday ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {dayTitle}
                </h4>
                
                <div className="space-y-2">
                  {dayApps.map(app => {
                    const appTime = format(new Date(app.startTime), 'HH:mm');
                    const endTime = format(new Date(app.startTime + app.duration * 60 * 1000), 'HH:mm');
                    
                    return (
                      <div 
                        key={app.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                            <Video size={16} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                              {app.meetingName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold">
                              <User size={10} />
                              <span>
                                {app.requesterId === userProfile.uid 
                                  ? `Com: ${app.targetName || 'Membro do Time'}` 
                                  : `De: ${app.requesterName || 'Solicitante'}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-[10px] font-black text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 flex items-center gap-1">
                            <Clock size={10} />
                            {appTime} - {endTime}
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {app.duration}m
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
