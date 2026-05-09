import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Client, Transaction } from '@/types';
import { getPlanPrice } from '@/helpers';

/**
 * Função utilitária para converter strings de data flexíveis (DD/MM/YYYY, YYYY-MM-DD, DD/MM) 
 * em um objeto Date válido para comparação de dia e mês.
 */
const parseFlexibleDate = (dateStr: string | undefined): { day: number, month: number } | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Formatos comuns: "25/12/1990", "1990-12-25", "25/12"
  let day: number = 0;
  let month: number = 0;

  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length >= 2) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // JS months are 0-11
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      // YYYY-MM-DD
      day = parseInt(parts[2], 10);
      month = parseInt(parts[1], 10) - 1;
    } else if (parts.length === 2) {
       // MM-DD
       day = parseInt(parts[1], 10);
       month = parseInt(parts[0], 10) - 1;
    }
  }

  if (isNaN(day) || isNaN(month) || day === 0) return null;
  return { day, month };
};

const isToday = (day: number, month: number): boolean => {
  const today = new Date();
  return today.getDate() === day && today.getMonth() === month;
};

export const handleAniversarios = async (ctx: any) => {
  try {
    const orgId = ctx.orgId || ctx.user?.orgId;
    if (!orgId) return "Não consegui identificar sua organização para buscar os aniversariantes.";

    // Busca todos os perfis da organização
    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    
    const profiles = snapshot.docs.map(doc => doc.data() as UserProfile);
    
    const bdays = profiles.filter(p => {
      const parsed = parseFlexibleDate(p.birthDate);
      return parsed && isToday(parsed.day, parsed.month);
    });

    if (bdays.length === 0) {
      return "🎉 Não temos aniversariantes hoje na equipe. Mas todo dia é dia de celebrar!";
    }

    const names = bdays.map(p => `• *${p.displayName}*`).join('\n');
    return `🎂 *HOJE É DIA DE FESTA!* 🎂\n\nParabéns aos aniversariantes do dia:\n${names}\n\nDesejamos muito sucesso e felicidade! 🚀✨`;
  } catch (error) {
    console.error("Erro ao buscar aniversários:", error);
    return "Ops! Tive um problema ao consultar a lista de aniversariantes. Tente novamente em instantes.";
  }
};

export const handleMembros = async (ctx: any) => {
  // Tenta pegar membros do contexto do chat (canal) ou da lista global da equipe
  const members = ctx.members || [];
  const teamProfiles = ctx.teamProfiles || [];
  
  // Se estiver em um canal e tiver membros, lista eles. 
  // Senão, lista todo mundo da organização (teamProfiles)
  const source = (members && members.length > 0) ? members : teamProfiles;

  if (source.length === 0) {
    return "Não encontrei membros registrados neste canal ou na organização. Verifique as configurações de equipe.";
  }

  const list = source.map((m: any) => {
    const statusIcon = m.online ? '🟢' : '⚪';
    const role = m.role || m.roleId || 'Membro';
    return `${statusIcon} *${m.displayName}* (${role})`;
  }).join('\n');

  return `👥 *Membros Disponíveis*:\n\n${list}\n\nTotal: ${source.length} integrantes.`;
};

export const handleMetas = async (ctx: any) => {
  try {
    const clients = ctx.clients || [];
    if (clients.length === 0) return "Ainda não temos dados de clientes para calcular as metas.";

    const activeClients = clients.filter((c: Client) => c.status === 'Ativo');
    
    // Agora usando getPlanPrice que prioriza planPrice personalizado
    const currentMRR = activeClients.reduce((acc: number, c: Client) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);

    const goalMRR = 10000; // Meta fixa temporária ou vinda de ctx.goal
    const progress = (currentMRR / goalMRR) * 100;
    
    // Gerar barra de progresso visual
    const barLength = 15;
    const filledLength = Math.min(Math.round((progress / 100) * barLength), barLength);
    const bar = '▓'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    return `📈 *RELATÓRIO DE METAS HUB* 🚀\n\n` +
           `• *MRR Atual:* R$ ${currentMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
           `• *Meta Mensal:* R$ ${goalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
           `*Progresso:* ${progress.toFixed(1)}%\n` +
           `[${bar}]\n\n` +
           `Faltam R$ ${(goalMRR - currentMRR).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para atingirmos o próximo nível! 💪`;
  } catch (error) {
    return "Não consegui processar as metas no momento. Verifique se os dados financeiros estão carregados.";
  }
};

export const handlePago = async (ctx: BotContext) => {
  try {
    const { orgId, clients, args } = ctx;
    if (!orgId) return "Não consegui identificar sua organização.";
    if (!args) return "Por favor, informe o nome ou ID do cliente. Ex: `/pago Joao` ou `/pago ID_DO_CLIENTE`";

    const queryStr = args.toLowerCase().trim();
    
    // Busca o cliente no cache (ctx.clients) ou ID exato
    const client = clients.find((c: Client) => 
      c.id === queryStr || c.name.toLowerCase().includes(queryStr)
    );

    if (!client) {
      return `❌ Cliente "${args}" não encontrado no CRM. Verifique se o nome está correto.`;
    }

    // Busca as transações do cliente no Firestore
    const transactionsRef = collection(db, 'organizations', orgId, 'transactions');
    const q = query(
      transactionsRef, 
      where('clientId', '==', client.id),
      where('type', '==', 'INCOME'),
      where('status', '==', 'PAID')
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as Transaction);

    const totalPaid = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const count = transactions.length;

    if (count === 0) {
      return `💸 O cliente *${client.name}* ainda não possui pagamentos confirmados no sistema.`;
    }

    return `💰 *RELATÓRIO DE PAGAMENTOS: ${client.name.toUpperCase()}* 💰\n\n` +
           `• *Total Pago:* R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
           `• *Qtd. Acordos:* ${count} pagamento(s) realizado(s)\n\n` +
           `O cliente está com o status: *${client.status}*. ✅`;
  } catch (error) {
    console.error("Erro ao processar /pago:", error);
    return "Ops! Tive um problema ao consultar os pagamentos deste cliente.";
  }
};

export const handleAjuda = async () => {
  return `🤖 *HUB BOT - COMO POSSO AJUDAR?* 🤖\n\n` +
         `Use os comandos abaixo para interagir comigo:\n\n` +
         `• */aniversarios* - Veja quem da equipe apaga as velinhas hoje 🎂\n` +
         `• */membros* - Lista os participantes ativos do canal ou organização 👥\n` +
         `• */metas* - Acompanhe o desempenho de faturamento em tempo real 📈\n` +
         `• */pago [cliente]* - Veja quanto um cliente já pagou em acordos 💰\n` +
         `• */ajuda* - Mostra esta mensagem de auxílio 🆘\n\n` +
         `Dica: Estou sempre de olho para te manter informado! 🚀`;
};

export interface BotContext {
  orgId: string;
  userId: string;
  userName: string;
  chatId: string;
  members: string[];
  teamProfiles: any[];
  clients: any[];
  args?: string;
}

export interface BotCommand {
  name: string;
  description: string;
  icon?: any;
  requiresArgs?: boolean;
  handler: (ctx: BotContext) => Promise<string | null>;
}

export const availableCommands: BotCommand[] = [
  { name: '/aniversarios', description: 'Veja aniversariantes do dia', handler: handleAniversarios },
  { name: '/membros', description: 'Lista os participantes ativos', handler: handleMembros },
  { name: '/metas', description: 'Acompanhe o desempenho de faturamento', handler: handleMetas },
  { name: '/pago', description: 'Quanto o cliente já pagou (ex: /pago Joao)', requiresArgs: true, handler: handlePago },
  { name: '/ajuda', description: 'Mostra esta mensagem de auxílio', handler: handleAjuda },
];

export const filterCommands = (query: string): BotCommand[] => {
  const q = query.toLowerCase().trim();
  return availableCommands.filter(cmd => cmd.name.startsWith(q));
};

export const findCommand = (name: string): BotCommand | undefined => {
  return availableCommands.find(cmd => cmd.name === name);
};

export const processBotCommand = async (command: string, ctx: any) => {
  const cmd = findCommand(command.toLowerCase().trim());
  if (cmd) {
    return await cmd.handler(ctx);
  }
  return null;
};
