import { z } from 'zod';
import {
  assertDate, assertMonth, MAX_AMOUNT_CENTS, getEntryMonth, getFirstInvoiceMonth, getMonthlySummary, getUsedLimit, invoiceDueDate, monthOf, shiftMonth,
  splitInstallments, type CardInvoice, type CreditCard, type LedgerEntry,
} from '../ledger';

interface PlanBase { name: string }

export interface Budget extends PlanBase { kind: 'budget'; month: string; amountCents: number }
export interface Goal extends PlanBase {
  kind: 'goal';
  amountCents: number;
  savedCents: number;
  date?: string;
  emergency?: boolean;
}
export interface Provision extends PlanBase {
  kind: 'provision';
  amountCents: number;
  savedCents: number;
  date: string;
  paid: boolean;
}
export type DebtType = 'loan' | 'financing' | 'student' | 'other';
export interface DebtPlan extends PlanBase {
  kind: 'debt';
  amountCents: number;
  date: string;
  installments: number;
  paidInstallments: number;
  debtType: DebtType;
}
export interface Envelope extends PlanBase { kind: 'envelope'; percentBps: number; goalId?: string }
export interface Wish extends PlanBase {
  kind: 'wish';
  amountCents: number;
  createdAt: number;
  decision: 'waiting' | 'bought' | 'skipped';
  note?: string;
}
export interface EnvelopeDistribution extends PlanBase {
  kind: 'distribution';
  month: string;
  amountCents: number;
  allocatedCents: number;
  createdAt: number;
}
export type PlanInput = Budget | Goal | Provision | DebtPlan | Envelope | Wish | EnvelopeDistribution;
export type PlanItem = PlanInput & { id: string };
export type ItemOf<Kind extends PlanInput['kind']> = Extract<PlanItem, { kind: Kind }>;
export const WISH_COOLING_MS = 48 * 60 * 60 * 1000;
export const MAX_DEBT_INSTALLMENTS = 600;
export const debtLabels: Record<DebtType, string> = {
  loan: 'Empréstimo', financing: 'Financiamento', student: 'Financiamento estudantil (FIES)', other: 'Outras dívidas',
};

export const categoryKey = (name = '') => name.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
export const displayAmount = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const displayDate = (date: string) => shortDateFormatter.format(new Date(`${date}T12:00:00Z`));
export const displayMonth = (month: string) => monthFormatter.format(new Date(`${month}-01T12:00:00Z`));

export function categorySpend(entries: LedgerEntry[], month: string, category: string) {
  const key = categoryKey(category);
  return entries.reduce((total, entry) => {
    if (getEntryMonth(entry) !== month || categoryKey(entry.category) !== key) return total;
    if (entry.kind === 'cardCredit') return { ...total, recorded: total.recorded - entry.amountCents };
    if (entry.kind !== 'expense' && entry.kind !== 'purchase') return total;
    if (entry.status === 'pending') return { ...total, pending: total.pending + entry.amountCents };
    return { ...total, recorded: total.recorded + entry.amountCents };
  }, { recorded: 0, pending: 0 });
}

export function monthsUntil(start: string, end: string) {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  return Math.max(1, 12 * (endYear - startYear) + endMonth - startMonth + 1);
}

export function debtPaymentAmount(debt: DebtPlan, index: number) {
  const base = Math.floor(debt.amountCents / debt.installments);
  return base + Number(index < debt.amountCents % debt.installments);
}

export function debtPaidAmount(debt: DebtPlan) {
  const base = Math.floor(debt.amountCents / debt.installments);
  return base * debt.paidInstallments + Math.min(debt.amountCents % debt.installments, debt.paidInstallments);
}

export function debtDueDate(debt: DebtPlan, index: number) {
  return invoiceDueDate(shiftMonth(monthOf(debt.date), index), Number(debt.date.slice(8)));
}

export function remainingDebt(debt: DebtPlan) {
  return debt.amountCents - debtPaidAmount(debt);
}

export function envelopePreview(envelopes: ItemOf<'envelope'>[], amountCents: number) {
  const amountBase = Math.floor(amountCents / 10_000);
  const amountTail = amountCents % 10_000;
  const slices = envelopes.map(envelope => {
    const head = amountBase * envelope.percentBps;
    const tail = amountTail * envelope.percentBps;
    return { id: envelope.id, cents: head + Math.floor(tail / 10_000), remainder: tail % 10_000 };
  });
  const totalBps = envelopes.reduce((sum, envelope) => sum + envelope.percentBps, 0);
  const allocated = Math.floor(amountBase * totalBps + amountTail * totalBps / 10_000);
  const rounded = slices.reduce((sum, slice) => sum + slice.cents, 0);
  slices.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id))
    .slice(0, allocated - rounded)
    .forEach(slice => { slice.cents += 1; });
  return { allocations: new Map(slices.map(slice => [slice.id, slice.cents])), allocated, totalBps };
}

export function simulatePurchase({
  amountCents, date, installments, card, month, category, entries, invoices, budgets,
}: {
  amountCents: number;
  date: string;
  installments: number;
  card?: CreditCard;
  month: string;
  category: string;
  entries: LedgerEntry[];
  invoices: CardInvoice[];
  budgets: ItemOf<'budget'>[];
}) {
  const firstMonth = card ? getFirstInvoiceMonth(date, card.closingDay, card.dueDay) : monthOf(date);
  const proportions = splitInstallments(amountCents, card ? installments : 1);
  const selectedIncome = getMonthlySummary(month, entries).incomeCents;
  const projection = proportions.map((cost, index) => {
    const affectedMonth = shiftMonth(firstMonth, index);
    const { incomeCents, expenseCents } = getMonthlySummary(affectedMonth, entries);
    const remaining = (incomeCents || selectedIncome) - expenseCents - cost;
    const budget = budgets.find(item => item.month === affectedMonth && categoryKey(item.name) === categoryKey(category));
    const { recorded, pending } = categorySpend(entries, affectedMonth, category);
    return {
      month: affectedMonth, cost, remaining,
      estimatedIncome: incomeCents === 0 && selectedIncome > 0,
      hasIncome: (incomeCents || selectedIncome) > 0,
      overBudget: Boolean(category && budget && recorded + pending + cost > budget.amountCents),
    };
  });
  const cardAvailable = card ? card.limitCents - getUsedLimit(card.id, invoices) : null;
  return {
    projection,
    cardAvailable,
    overLimit: cardAvailable !== null && amountCents > cardAvailable,
    overBudget: projection.some(item => item.overBudget),
    netDeficit: projection.some(item => item.hasIncome && item.remaining < 0),
  };
}

const NAME = z.string().trim().min(1).max(80);
const CENTS = z.int().min(0).max(MAX_AMOUNT_CENTS);
const AMOUNT = CENTS.min(1);
const ID = z.string().min(1).max(500).refine(value => !['.', '..'].includes(value) && !value.includes('/'));
const EPOCH = z.int().min(0).max(8_640_000_000_000_000);
const MONTH = z.string().refine(value => check(() => assertMonth(value)));
const DATE = z.string().refine(value => check(() => assertDate(value)));
const itemSchema = z.discriminatedUnion('kind', [
  z.object({ id: ID, name: NAME, kind: z.literal('budget'), amountCents: AMOUNT, month: MONTH }),
  z.object({ id: ID, name: NAME, kind: z.literal('goal'), amountCents: AMOUNT, savedCents: CENTS, date: DATE.optional(), emergency: z.boolean().optional() }),
  z.object({ id: ID, name: NAME, kind: z.literal('provision'), amountCents: AMOUNT, savedCents: CENTS, date: DATE, paid: z.boolean() }),
  z.object({
    id: ID, name: NAME, kind: z.literal('debt'), amountCents: AMOUNT, date: DATE,
    installments: z.int().min(1).max(MAX_DEBT_INSTALLMENTS),
    paidInstallments: z.int().min(0).max(MAX_DEBT_INSTALLMENTS), debtType: z.enum(['loan', 'financing', 'student', 'other']),
  }),
  z.object({ id: ID, name: NAME, kind: z.literal('envelope'), percentBps: z.int().min(1).max(10_000), goalId: ID.max(120).optional() }),
  z.object({
    id: ID, name: NAME, kind: z.literal('wish'), amountCents: AMOUNT, createdAt: EPOCH,
    decision: z.enum(['waiting', 'bought', 'skipped']), note: z.string().trim().max(240).optional(),
  }),
  z.object({
    id: ID, name: NAME, kind: z.literal('distribution'), month: MONTH, amountCents: AMOUNT,
    allocatedCents: CENTS, createdAt: EPOCH,
  }),
]);

function check(validate: () => void) {
  try {
    validate();
    return true;
  } catch {
    return false;
  }
}

export function parsePlanItem(value: unknown): PlanItem | null {
  const parsed = itemSchema.safeParse(value);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (item.kind === 'debt' && (
    item.paidInstallments > item.installments ||
    item.amountCents < item.installments ||
    !check(() => { debtDueDate(item, item.installments - 1); })
  )) return null;
  if (item.kind === 'distribution' && item.allocatedCents > item.amountCents) return null;
  return item;
}

export function newBudgetId(month: string, name: string) {
  return `budget-${month}-${encodeURIComponent(categoryKey(name))}`;
}
