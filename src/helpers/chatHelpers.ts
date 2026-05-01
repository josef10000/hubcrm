import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatChatTime = (date: number | Date) => {
  return format(date, 'HH:mm', { locale: ptBR });
};

export const formatChatDate = (date: number | Date) => {
  return format(date, "dd 'de' MMMM", { locale: ptBR });
};

export const formatChatDividerDate = (date: number | Date) => {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
};

export const formatChatDateTime = (date: number | Date) => {
  return format(date, "dd/MM HH:mm", { locale: ptBR });
};

export const isSameDay = (date1: number | Date, date2: number | Date) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const parseMentions = (
  text: string, 
  teamMembers: { uid: string, displayName: string, roleId?: string }[],
  roles: { id: string, name: string }[] = []
) => {
  const mentions: string[] = [];
  const words = text.split(/\s+/);
  
  if (text.includes('@todos') || text.includes('@everyone')) {
    return teamMembers.map(m => m.uid);
  }

  words.forEach(word => {
    if (word.startsWith('@')) {
      // Remove @ e converte para slug comparável (sem espaços, minúsculo)
      const slug = word.slice(1).toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '');
      
      // 1. Tenta encontrar um membro direto
      const member = teamMembers.find(m => 
        m.displayName.toLowerCase().replace(/\s/g, '') === slug
      );
      
      if (member) {
        mentions.push(member.uid);
      } else {
        // 2. Tenta encontrar um cargo/grupo
        const role = roles.find(r => 
          r.name.toLowerCase().replace(/\s/g, '') === slug
        );
        
        if (role) {
          // Se encontrou o cargo, adiciona todos os membros que possuem esse roleId
          const roleMembers = teamMembers
            .filter(m => m.roleId === role.id)
            .map(m => m.uid);
          mentions.push(...roleMembers);
        }
      }
    }
  });

  return Array.from(new Set(mentions));
};

export const highlightMentions = (text: string) => {
  if (!text) return [];
  // Regex para capturar @todos, @everyone e @nomeUsuário
  const mentionRegex = /(@todos|@everyone|@[a-zA-Z0-9_\u00C0-\u017F]+)/g;
  return text.split(mentionRegex);
};
