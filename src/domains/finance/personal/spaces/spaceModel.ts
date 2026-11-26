import { assertCents, assertDate } from '../ledger';

export type SpaceKind = 'family' | 'travel';
export type SpaceRole = 'owner' | 'editor' | 'viewer';
export type InvitationRole = Exclude<SpaceRole, 'owner'>;
export type ExpenseStatus = 'approved' | 'pending' | 'rejected';
export type SplitMode = 'equal' | 'income' | 'none';

export interface SpaceSettings {
  name: string;
  kind: SpaceKind;
  budgetCents: number;
  approvalThresholdCents: number;
  startsOn: string;
  endsOn: string;
}

export interface FinanceSpace extends SpaceSettings {
  id: string;
  ownerId: string;
  archived?: boolean;
  memberIds: string[];
  memberRoles: Record<string, SpaceRole>;
}

export interface SpaceInvitation {
  id: string;
  spaceId: string;
  spaceName: string;
  inviterUid: string;
  invitedUid: string;
  role: InvitationRole;
}

export interface ParticipantInput {
  name: string;
  dependent: boolean;
  incomeCents: number;
  allowanceCents: number;
}

export interface Participant extends ParticipantInput {
  id: string;
  linkedUid: string;
  active: boolean;
}

export interface ExpenseInput {
  name: string;
  date: string;
  category: string;
  amountCents: number;
  paidBy: string;
  split: SplitMode;
}

export interface SpaceExpense extends ExpenseInput {
  id: string;
  createdBy: string;
  allocations: Record<string, number>;
  status: ExpenseStatus;
  source: 'manual' | 'allowance' | 'task';
}

export interface FamilyTask {
  id: string;
  participantId: string;
  name: string;
  amountCents: number;
  state: 'open' | 'done' | 'paid';
}

export const spaceKinds: Record<SpaceKind, string> = { family: 'Família', travel: 'Viagem' };
export const roleLabels: Record<SpaceRole, string> = { owner: 'Titular', editor: 'Colaborador', viewer: 'Leitura' };
export const expenseStatuses: Record<ExpenseStatus, string> = { approved: 'Aprovada', pending: 'Em aprovação', rejected: 'Recusada' };
export const taskStates: Record<FamilyTask['state'], string> = { open: 'A fazer', done: 'Concluída', paid: 'Bônus registrado' };

export function text(value: string, label: string, max: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`Informe ${label} com até ${max} caracteres.`);
  return normalized;
}

export function validSettings(input: SpaceSettings): SpaceSettings {
  assertCents(input.budgetCents, 0);
  assertCents(input.approvalThresholdCents, 0);
  const name = text(input.name, 'o nome do espaço', 80);
  if (input.kind === 'travel') {
    assertDate(input.startsOn);
    assertDate(input.endsOn);
    if (input.endsOn < input.startsOn) throw new Error('A data de volta precisa ser igual ou posterior à data de ida.');
    return { ...input, name };
  }
  return { ...input, name, startsOn: '', endsOn: '' };
}

export function validParticipant(input: ParticipantInput): ParticipantInput {
  assertCents(input.incomeCents, 0);
  assertCents(input.allowanceCents, 0);
  return { ...input, name: text(input.name, 'o nome da pessoa', 80), allowanceCents: input.dependent ? input.allowanceCents : 0 };
}

export function approvalStatus(space: FinanceSpace, amount: number): ExpenseStatus {
  return space.approvalThresholdCents > 0 && amount >= space.approvalThresholdCents ? 'pending' : 'approved';
}

export function splitExpense(amountCents: number, paidBy: string, split: SplitMode, participants: Participant[]) {
  assertCents(amountCents);
  if (split === 'none') return { [paidBy]: amountCents };
  const active = participants.filter(item => item.active && !item.dependent);
  if (!active.length) return { [paidBy]: amountCents };
  const useIncome = split === 'income' && active.some(item => item.incomeCents > 0);
  const weights = active.map(item => BigInt(useIncome ? item.incomeCents : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0n);
  const amount = BigInt(amountCents);
  const rows = active.map((item, index) => {
    const numerator = amount * weights[index];
    return { id: item.id, cents: Number(numerator / totalWeight), remainder: numerator % totalWeight };
  });
  const distributed = rows.reduce((sum, row) => sum + row.cents, 0);
  rows.sort((a, b) => a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1);
  return Object.fromEntries(rows.map((row, index) => [row.id, row.cents + Number(index < amountCents - distributed)]));
}

export function participantBalances(expenses: SpaceExpense[]) {
  const balances = new Map<string, number>();
  function add(id: string, delta: number) { balances.set(id, (balances.get(id) ?? 0) + delta); }
  for (const expense of expenses) {
    if (expense.status !== 'approved') continue;
    const shares = Object.entries(expense.allocations);
    if (shares.some(([, amount]) => !Number.isSafeInteger(amount) || amount < 0)
      || shares.reduce((total, [, amount]) => total + amount, 0) !== expense.amountCents) continue;
    add(expense.paidBy, expense.amountCents);
    for (const [id, amount] of shares) add(id, -amount);
  }
  return balances;
}

export function suggestedSettlements(balances: Map<string, number>) {
  const receivables = [...balances].filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount }));
  const debts = [...balances].filter(([, amount]) => amount < 0).map(([id, amount]) => ({ id, amount: -amount }));
  const settlements: { from: string; to: string; amountCents: number }[] = [];
  let debtIndex = 0;
  let receivableIndex = 0;
  while (debtIndex < debts.length && receivableIndex < receivables.length) {
    const debt = debts[debtIndex];
    const receivable = receivables[receivableIndex];
    const amountCents = Math.min(debt.amount, receivable.amount);
    settlements.push({ from: debt.id, to: receivable.id, amountCents });
    debt.amount -= amountCents;
    receivable.amount -= amountCents;
    if (!debt.amount) debtIndex += 1;
    if (!receivable.amount) receivableIndex += 1;
  }
  return settlements;
}

export function assertParticipantsLimit(participants: readonly unknown[]) {
  if (participants.length >= 30) throw new Error('O espaço já tem 30 participantes.');
}

export function validExpense(input: ExpenseInput): ExpenseInput {
  assertDate(input.date);
  assertCents(input.amountCents, 1);
  if (input.category.length > 80) throw new Error('Informe uma categoria com até 80 caracteres.');
  if (!input.paidBy) throw new Error('Selecione quem pagou a despesa.');
  return { ...input, name: text(input.name, 'a descrição', 140), category: input.category.trim() };
}

export function validateReward(amountCents: number) {
  assertCents(amountCents, 1);
  return amountCents;
}
