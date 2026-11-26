export type WalletStyle = 'solid' | 'gradient' | 'metallic' | 'brushed' | 'glass' | 'holographic';
export type BankAccountType = 'checking' | 'digital' | 'savings' | 'salary' | 'investment';

interface WalletAppearance {
  color?: string;
  style?: WalletStyle;
}

export interface BankAccountInput extends WalletAppearance {
  name: string;
  bank: string;
  initialBalanceCents: number;
  accountType?: BankAccountType;
}

export interface CreditCardInput extends WalletAppearance {
  name: string;
  bank: string;
  brand: string;
  lastDigits: string;
  bankAccountId: string;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  virtual?: boolean;
}

export interface BankAccount extends BankAccountInput {
  id: string;
  archived: boolean;
}

export interface CreditCard extends CreditCardInput {
  id: string;
  archived: boolean;
}

export type EntryKind = 'income' | 'expense' | 'transfer' | 'purchase' | 'cardCredit' | 'invoicePayment' | 'adjustment';
export type EntryStatus = 'paid' | 'pending';

export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  description: string;
  date: string;
  amountCents: number;
  status?: EntryStatus;
  bankAccountId?: string;
  targetBankAccountId?: string;
  cardId?: string;
  invoiceMonth?: string;
  invoiceDueDate?: string;
  groupId?: string;
  installment?: number;
  installmentCount?: number;
  category?: string;
}

export interface EntryInput {
  kind: Exclude<EntryKind, 'adjustment' | 'invoicePayment'>;
  description: string;
  date: string;
  amountCents: number;
  status?: EntryStatus;
  bankAccountId?: string;
  targetBankAccountId?: string;
  cardId?: string;
  invoiceMonth?: string;
  category?: string;
}

export interface CardInvoice {
  id: string;
  cardId: string;
  month: string;
  dueDate: string;
  totalCents: number;
  paidDate?: string;
  paymentAccountId?: string;
}

export const MAX_AMOUNT_CENTS = 999_999_999_999;
export const MAX_INSTALLMENTS = 60;

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const styles: readonly WalletStyle[] = ['solid', 'gradient', 'metallic', 'brushed', 'glass', 'holographic'];
const accountTypes: readonly BankAccountType[] = ['checking', 'digital', 'savings', 'salary', 'investment'];

export function money(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/^(-?)\s*R\$\s*/, '$1');
  const brazilian = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(normalized);
  const decimal = brazilian ?? /^(-?)(\d+)\.(\d{1,2})$/.exec(normalized);
  if (!decimal) return null;

  const [, sign, whole, fraction = ''] = decimal;
  const amount = Number(whole.replaceAll('.', '')) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > MAX_AMOUNT_CENTS) return null;
  return sign === '-' && amount !== 0 ? -amount : amount;
}

export function assertCents(value: number, min = 1) {
  if (!Number.isSafeInteger(value) || value < min || value > MAX_AMOUNT_CENTS) {
    throw new Error('Informe um valor válido com até duas casas decimais.');
  }
}

export function today() {
  const date = new Date();
  const localMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${localMonth}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function assertMonth(month: string) {
  if (!monthPattern.test(month) || Number(month.slice(0, 4)) < 1900) {
    throw new Error('Informe um mês válido.');
  }
}

export function shiftMonth(month: string, offset: number) {
  assertMonth(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * 12 + monthNumber - 1 + offset;
  const shifted = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  assertMonth(shifted);
  return shifted;
}

function dateInMonth(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function assertDate(date: string) {
  const day = Number(date.slice(8));
  if (!datePattern.test(date) || Number(date.slice(0, 4)) < 1900 || dateInMonth(monthOf(date), day) !== date) {
    throw new Error('Informe uma data válida.');
  }
}

function assertCardDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Informe um dia entre 1 e 31.');
}

export function invoiceDueDate(month: string, dueDay: number) {
  assertMonth(month);
  assertCardDay(dueDay);
  return dateInMonth(month, dueDay);
}

export function getFirstInvoiceMonth(date: string, closingDay: number, dueDay: number) {
  assertDate(date);
  assertCardDay(closingDay);
  assertCardDay(dueDay);
  const month = monthOf(date);
  const pastClosing = date >= dateInMonth(month, closingDay);
  return shiftMonth(month, Number(pastClosing) + Number(dueDay < closingDay));
}

export function splitInstallments(amountCents: number, installmentCount: number) {
  assertCents(amountCents);
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > MAX_INSTALLMENTS) {
    throw new Error(`Informe entre 1 e ${MAX_INSTALLMENTS} parcelas.`);
  }
  if (amountCents < installmentCount) throw new Error('Cada parcela deve ter pelo menos R$ 0,01.');

  const amount = Math.floor(amountCents / installmentCount);
  const remainder = amountCents % installmentCount;
  return Array.from({ length: installmentCount }, (_, index) => amount + Number(index < remainder));
}

export function getPurchaseInstallments(
  card: CreditCard,
  entry: Pick<EntryInput, 'description' | 'date' | 'amountCents' | 'category'>,
  installmentCount: number,
  groupId: string,
): LedgerEntry[] {
  const firstMonth = getFirstInvoiceMonth(entry.date, card.closingDay, card.dueDay);
  return splitInstallments(entry.amountCents, installmentCount).map((amountCents, index) => {
    const invoiceMonth = shiftMonth(firstMonth, index);
    return {
      id: `${groupId}-${index + 1}`,
      kind: 'purchase',
      description: entry.description,
      date: entry.date,
      amountCents,
      cardId: card.id,
      invoiceMonth,
      invoiceDueDate: invoiceDueDate(invoiceMonth, card.dueDay),
      groupId,
      installment: index + 1,
      installmentCount,
      ...(entry.category ? { category: entry.category } : {}),
    };
  });
}

export function getEntryMonth(entry: LedgerEntry) {
  return entry.kind === 'purchase' || entry.kind === 'cardCredit'
    ? entry.invoiceMonth ?? monthOf(entry.date)
    : monthOf(entry.date);
}

export function getBankBalance(account: BankAccount, entries: LedgerEntry[], asOf?: string) {
  return entries.reduce((balance, entry) => {
    if (entry.status === 'pending' || (asOf && entry.date > asOf)) return balance;
    if (entry.kind === 'transfer' && entry.targetBankAccountId === account.id) return balance + entry.amountCents;
    if (entry.bankAccountId !== account.id) return balance;
    switch (entry.kind) {
      case 'income':
      case 'adjustment':
        return balance + entry.amountCents;
      case 'expense':
      case 'transfer':
      case 'invoicePayment':
        return balance - entry.amountCents;
      default:
        return balance;
    }
  }, account.initialBalanceCents);
}

export function getUsedLimit(cardId: string, invoices: CardInvoice[]) {
  return invoices.reduce((total, invoice) => (
    invoice.cardId === cardId && !invoice.paidDate ? total + invoice.totalCents : total
  ), 0);
}

export function getMonthlySummary(month: string, entries: LedgerEntry[]) {
  let incomeCents = 0;
  let expenseCents = 0;
  let pendingIncomeCents = 0;
  let pendingExpenseCents = 0;

  for (const entry of entries) {
    if (getEntryMonth(entry) !== month) continue;
    if (entry.kind === 'income') {
      incomeCents += entry.amountCents;
      if (entry.status === 'pending') pendingIncomeCents += entry.amountCents;
    } else if (entry.kind === 'expense' || entry.kind === 'purchase') {
      expenseCents += entry.amountCents;
      if (entry.status === 'pending') pendingExpenseCents += entry.amountCents;
    } else if (entry.kind === 'cardCredit') {
      expenseCents -= entry.amountCents;
    }
  }

  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents, pendingIncomeCents, pendingExpenseCents };
}

function cleanName(value: string, label: string, maxLength = 80) {
  const result = value.trim();
  if (!result || result.length > maxLength) throw new Error(`Informe ${label} com até ${maxLength} caracteres.`);
  return result;
}

function cleanAppearance({ color, style }: WalletAppearance) {
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Escolha uma cor válida.');
  if (style && !styles.includes(style)) throw new Error('Escolha um acabamento válido.');
  return { ...(color !== undefined ? { color } : {}), ...(style ? { style } : {}) };
}

export function normalizeAccount(input: BankAccountInput): BankAccountInput {
  assertCents(input.initialBalanceCents, -MAX_AMOUNT_CENTS);
  if (input.accountType && !accountTypes.includes(input.accountType)) throw new Error('Escolha um tipo de conta válido.');
  return {
    name: cleanName(input.name, 'o nome da conta'),
    bank: input.bank.trim(),
    initialBalanceCents: input.initialBalanceCents,
    ...(input.accountType ? { accountType: input.accountType } : {}),
    ...cleanAppearance(input),
  };
}

export function normalizeCard(input: CreditCardInput): CreditCardInput {
  assertCents(input.limitCents, 0);
  assertCardDay(input.closingDay);
  assertCardDay(input.dueDay);
  if (input.lastDigits && !/^\d{4}$/.test(input.lastDigits)) throw new Error('Informe os quatro últimos dígitos do cartão.');
  return {
    name: cleanName(input.name, 'o nome do cartão'),
    bank: input.bank.trim(),
    brand: input.brand.trim(),
    lastDigits: input.lastDigits.trim(),
    bankAccountId: input.bankAccountId,
    limitCents: input.limitCents,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    ...(input.virtual !== undefined ? { virtual: input.virtual } : {}),
    ...cleanAppearance(input),
  };
}

export function normalizeEntry(input: EntryInput): EntryInput {
  assertCents(input.amountCents);
  assertDate(input.date);
  const description = cleanName(input.description, 'a descrição', 160);
  const category = input.category?.trim();
  if (category && category.length > 80) throw new Error('Informe uma categoria com até 80 caracteres.');
  return { ...input, description, ...(category ? { category } : {}) };
}
