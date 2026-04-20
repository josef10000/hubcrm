import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatChatTime = (date: number | Date) => {
  return format(date, 'HH:mm', { locale: ptBR });
};

export const formatChatDate = (date: number | Date) => {
  return format(date, "dd 'de' MMMM", { locale: ptBR });
};

export const parseMentions = (text: string, teamMembers: { uid: string, displayName: string }[]) => {
  const mentions: string[] = [];
  
  // Regex simples para capturar @nome ou @todos
  const words = text.split(/\s+/);
  
  if (text.includes('@todos') || text.includes('@everyone')) {
    return teamMembers.map(m => m.uid);
  }

  words.forEach(word => {
    if (word.startsWith('@')) {
      const name = word.slice(1);
      const member = teamMembers.find(m => m.displayName.toLowerCase().replace(/\s/g, '') === name.toLowerCase());
      if (member) mentions.push(member.uid);
    }
  });

  return Array.from(new Set(mentions));
};
