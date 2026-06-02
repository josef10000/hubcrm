import React from 'react';
import { Megaphone } from 'lucide-react';

export default function CompanyAnnouncements() {
  // Dados fictícios simulando comunicados
  const announcements = [
    {
      id: 1,
      author: 'Diretoria / RH',
      time: 'Hoje',
      title: '[AVISO] Novo Painel Matinal no Ar',
      content: 'A partir de hoje, a tela de entrada do CRM foi atualizada para trazer notícias de economia, tech, cotações financeiras e a lista matinal de animes para começarmos o dia integrados e bem informados! O ponto eletrônico e as metas continuam disponíveis em seus respectivos submenus.',
      urgent: true
    },
    {
      id: 2,
      author: 'Financeiro',
      time: 'Ontem',
      title: 'Aprovação de Proventos e Benefícios',
      content: 'Prestadores de serviços PJ e CLT: lembrem-se de verificar suas notas e recibos na aba financeira estratégica antes do dia 05 para garantir o processamento correto dos pagamentos via Asaas.',
      urgent: false
    }
  ];

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-4 text-left h-full min-h-[220px]">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Megaphone size={14} className="text-amber-500" />
        Mural de Comunicados
      </h3>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div 
            key={ann.id} 
            className={`p-4 rounded-2xl relative overflow-hidden transition-all duration-300 ${
              ann.urgent 
                ? 'bg-amber-500/5 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.03)]' 
                : 'bg-white/[0.01] hover:bg-white/[0.03] border border-white/5'
            }`}
          >
            {ann.urgent && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[8px] font-black uppercase tracking-wider ${
                ann.urgent ? 'text-amber-400' : 'text-gray-500'
              }`}>
                {ann.author}
              </span>
              <span className="text-[8px] text-gray-500 font-bold">{ann.time}</span>
            </div>
            <h4 className="text-xs font-bold text-white leading-tight">
              {ann.title}
            </h4>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
              {ann.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
