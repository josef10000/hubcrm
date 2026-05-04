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
    return '🤖 Erro ao consultar leads. Tente novamente.';
  }
}

async function handleMetas(ctx: BotContext): Promise<string> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
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
      totalValue += (d.contractValue || d.valor || 0);
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
    return '🤖 Erro ao consultar metas. Tente novamente.';
  }
}

async function handleAniversarios(ctx: BotContext): Promise<string> {
  try {
    const q = query(
      collection(db, 'organizations', ctx.orgId, 'team')
    );
    const snap = await getDocs(q);
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    const aniversariantes = snap.docs
      .map(doc => doc.data())
      .filter(member => {
        if (!member.birthDate) return false;
        const birth = member.birthDate.toDate ? member.birthDate.toDate() : new Date(member.birthDate);
        return (birth.getMonth() + 1) === currentMonth;
      })
      .map(member => {
        const birth = member.birthDate.toDate ? member.birthDate.toDate() : new Date(member.birthDate);
        return `🎂 **${member.displayName || member.name}** — dia ${birth.getDate()}`;
      });

    if (aniversariantes.length === 0) {
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
      return `🤖 Nenhum aniversariante encontrado em ${monthName}.`;
    }

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
    return [
      `🤖 **Aniversariantes de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}:**`,
      '',
      ...aniversariantes,
      '',
      '_Parabéns aos aniversariantes! 🎉_'
    ].join('\n');
  } catch (error) {
    return '🤖 Erro ao consultar aniversários. Tente novamente.';
  }
}

async function handleMembros(ctx: BotContext): Promise<string> {
  try {
    const q = query(
      collection(db, 'organizations', ctx.orgId, 'team'),
      where('uid', 'in', ctx.members.slice(0, 10))
    );
    const snap = await getDocs(q);

    const lines = snap.docs.map(doc => {
      const d = doc.data();
      const role = d.jobTitle || d.role || 'Membro';
      return `👤 **${d.displayName || d.name}** — _${role}_`;
    });

    return [
      `🤖 **Membros deste canal (${ctx.members.length}):**`,
      '',
      ...lines,
      ...(ctx.members.length > 10 ? ['', `_...e mais ${ctx.members.length - 10} membros._`] : [])
    ].join('\n');
  } catch (error) {
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
