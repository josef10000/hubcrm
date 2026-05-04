import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

export interface BotCommand {
  name: string;
  description: string;
  icon: string;
  handler: (context: BotContext) => Promise<string>;
}

export interface BotContext {
  orgId: string;
  userId: string;
  userName: string;
  chatId: string;
  members: string[];
}

// ========== HANDLERS DOS COMANDOS ==========

async function handleAjuda(): Promise<string> {
  return [
    '🤖 **HubBot — Comandos Disponíveis**',
    '',
    '`/ajuda` — Exibe esta lista de comandos',
    '`/lead` — Mostra os últimos 5 leads capturados',
    '`/metas` — Progresso de vendas do mês atual',
    '`/aniversarios` — Aniversariantes do mês na equipe',
    '`/membros` — Lista os membros deste canal/grupo',
    '',
    '_Digite `/` para ver as sugestões em tempo real._'
  ].join('\n');
}

async function handleLeads(ctx: BotContext): Promise<string> {
  try {
    const q = query(
      collection(db, 'organizations', ctx.orgId, 'clients'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return '🤖 Nenhum lead encontrado no CRM.';
    }

    const lines = snap.docs.map((doc, i) => {
      const d = doc.data();
      const name = d.name || d.razaoSocial || 'Sem nome';
      const status = d.status || 'Novo';
      return `${i + 1}. **${name}** — _${status}_`;
    });

    return [
      '🤖 **Últimos 5 Leads Capturados:**',
      '',
      ...lines,
      '',
      '_Consulte o CRM para mais detalhes._'
    ].join('\n');
  } catch (error) {
    console.error('[HubBot /lead]', error);
    return '🤖 Erro ao consultar leads. Tente novamente.';
  }
}

async function handleMetas(ctx: BotContext): Promise<string> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Tenta buscar contratos fechados no mês
    const q = query(
      collection(db, 'organizations', ctx.orgId, 'clients'),
      where('status', '==', 'Fechado'),
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
    );
    const snap = await getDocs(q);
    
    const totalContracts = snap.size;
    let totalValue = 0;
    snap.docs.forEach(doc => {
      const d = doc.data();
      totalValue += (d.contractValue || d.valor || d.value || 0);
    });

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    return [
      `🤖 **Metas de Vendas — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}**`,
      '',
      `📋 Contratos fechados: **${totalContracts}**`,
      `💰 Valor total: **R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**`,
      '',
      '_Dados atualizados em tempo real do CRM._'
    ].join('\n');
  } catch (error) {
    console.error('[HubBot /metas]', error);
    return '🤖 Erro ao consultar metas. Tente novamente.';
  }
}

async function handleAniversarios(ctx: BotContext): Promise<string> {
  try {
    // Busca perfis na coleção correta: "profiles" (raiz) com filtro por orgId
    const q = query(
      collection(db, 'profiles'),
      where('orgId', '==', ctx.orgId)
    );
    const snap = await getDocs(q);
    
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Janeiro)
    const currentDay = now.getDate();
    
    const aniversariantes: { name: string; day: number; isToday: boolean }[] = [];
    
    snap.docs.forEach(doc => {
      const member = doc.data();
      
      // birthDate é string no formato "YYYY-MM-DD"
      const birthStr = member.birthDate;
      if (!birthStr) return;
      
      let birthMonth: number;
      let birthDay: number;
      
      if (typeof birthStr === 'string') {
        // Formato "YYYY-MM-DD"
        const parts = birthStr.split('-');
        if (parts.length >= 3) {
          birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
          birthDay = parseInt(parts[2], 10);
        } else {
          return;
        }
      } else if (birthStr.toDate) {
        // Se for Timestamp do Firestore (fallback)
        const d = birthStr.toDate();
        birthMonth = d.getMonth();
        birthDay = d.getDate();
      } else {
        return;
      }
      
      if (birthMonth === currentMonth) {
        const displayName = member.displayName || member.name || 'Membro';
        const isToday = birthDay === currentDay;
        aniversariantes.push({ name: displayName, day: birthDay, isToday });
      }
    });

    // Ordena por dia do mês
    aniversariantes.sort((a, b) => a.day - b.day);

    if (aniversariantes.length === 0) {
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
      return `🤖 Nenhum aniversariante encontrado em ${monthName}.`;
    }

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
    
    const lines = aniversariantes.map(a => {
      if (a.isToday) {
        return `🎂 **${a.name}** — dia ${a.day} 🎉 **HOJE!**`;
      }
      const isPast = a.day < currentDay;
      return `${isPast ? '✅' : '🎂'} **${a.name}** — dia ${a.day}${isPast ? ' _(já passou)_' : ''}`;
    });

    return [
      `🤖 **Aniversariantes de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}:**`,
      '',
      ...lines,
      '',
      `_${aniversariantes.filter(a => a.isToday).length > 0 ? '🎉 Temos aniversariante(s) hoje! Parabéns!' : 'Parabéns aos aniversariantes! 🎉'}_`
    ].join('\n');
  } catch (error) {
    console.error('[HubBot /aniversarios]', error);
    return '🤖 Erro ao consultar aniversários. Tente novamente.';
  }
}

async function handleMembros(ctx: BotContext): Promise<string> {
  try {
    // Verifica se tem membros no contexto
    if (!ctx.members || ctx.members.length === 0) {
      return '🤖 Nenhum membro encontrado neste canal.';
    }

    // Busca perfis na coleção correta: "profiles" (raiz) com filtro por orgId
    // Firestore 'in' suporta até 30 itens
    const batchSize = 30;
    const batches = [];
    for (let i = 0; i < ctx.members.length; i += batchSize) {
      batches.push(ctx.members.slice(i, i + batchSize));
    }

    const allMembers: { name: string; role: string; isOnline?: boolean }[] = [];

    for (const batch of batches) {
      if (batch.length === 0) continue;
      
      const q = query(
        collection(db, 'profiles'),
        where('orgId', '==', ctx.orgId),
        where('uid', 'in', batch)
      );
      const snap = await getDocs(q);

      snap.docs.forEach(doc => {
        const d = doc.data();
        const name = d.displayName || d.name || 'Membro';
        const role = d.jobTitle || d.role?.name || 'Membro';
        allMembers.push({ name, role });
      });
    }

    // Adiciona membros que não foram encontrados nos perfis (pode ser bot ou externo)
    const foundUids = new Set(allMembers.map(() => true)); // placeholder
    
    if (allMembers.length === 0) {
      return `🤖 Este canal tem **${ctx.members.length}** membro(s), mas não foi possível carregar os perfis.`;
    }

    // Ordena alfabeticamente
    allMembers.sort((a, b) => a.name.localeCompare(b.name));

    const lines = allMembers.map(m => `👤 **${m.name}** — _${m.role}_`);

    const notLoaded = ctx.members.length - allMembers.length;

    return [
      `🤖 **Membros deste canal (${ctx.members.length}):**`,
      '',
      ...lines,
      ...(notLoaded > 0 ? ['', `_...e mais ${notLoaded} membro(s) não identificado(s)._`] : []),
      '',
      '_Lista atualizada em tempo real._'
    ].join('\n');
  } catch (error) {
    console.error('[HubBot /membros]', error);
    return '🤖 Erro ao listar membros. Tente novamente.';
  }
}

// ========== REGISTRY ==========

export const BOT_COMMANDS: BotCommand[] = [
  {
    name: '/ajuda',
    description: 'Lista todos os comandos disponíveis',
    icon: '❓',
    handler: handleAjuda,
  },
  {
    name: '/lead',
    description: 'Mostra os últimos leads capturados',
    icon: '📋',
    handler: handleLeads,
  },
  {
    name: '/metas',
    description: 'Progresso de vendas do mês',
    icon: '📊',
    handler: handleMetas,
  },
  {
    name: '/aniversarios',
    description: 'Aniversariantes do mês na equipe',
    icon: '🎂',
    handler: handleAniversarios,
  },
  {
    name: '/membros',
    description: 'Lista membros do canal/grupo',
    icon: '👥',
    handler: handleMembros,
  },
];

export function findCommand(input: string): BotCommand | undefined {
  const cmd = input.trim().split(' ')[0].toLowerCase();
  return BOT_COMMANDS.find(c => c.name === cmd);
}

export function filterCommands(query: string): BotCommand[] {
  if (!query.startsWith('/')) return [];
  const search = query.toLowerCase();
  return BOT_COMMANDS.filter(c => c.name.startsWith(search));
}
