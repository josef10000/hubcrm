import { describe, expect, it } from 'vitest';
import {
  getBankBalance, getEntryMonth, getFirstInvoiceMonth, getMonthlySummary, getPurchaseInstallments,
  getRecurrenceDates, getUsedLimit, invoiceDueDate, normalizeRecurrence, parseMoney, splitInstallments,
  type BankAccount, type CreditCard, type LedgerEntry, type RecurringEntryInput,
} from './ledger';

const account: BankAccount = {
  id: 'account',
  name: 'Conta pessoal',
  bank: '',
  initialBalanceCents: 100_000,
  archived: false,
};

const card: CreditCard = {
  id: 'card',
  name: 'Cartão pessoal',
  bank: '',
  brand: 'Visa',
  lastDigits: '1234',
  bankAccountId: account.id,
  limitCents: 100_000,
  closingDay: 25,
  dueDay: 5,
  archived: false,
};

describe('valores monetários', () => {
  it('mantém centavos exatos e rejeita entradas ambíguas ou fora da escala', () => {
    expect(parseMoney('R$ 1.234,50')).toBe(123_450);
    expect(parseMoney('-12,07')).toBe(-1_207);
    expect(parseMoney('9.50')).toBe(950);
    expect(parseMoney('1.234')).toBe(123_400);
    expect(parseMoney('12,345')).toBeNull();
    expect(parseMoney('1,2,3')).toBeNull();
    expect(parseMoney('99999999999999')).toBeNull();
  });

  it('distribui os centavos restantes entre parcelas sem alterar o total', () => {
    expect(splitInstallments(1001, 3)).toEqual([334, 334, 333]);
    expect(() => splitInstallments(2, 3)).toThrow();
  });
});

describe('ciclo do cartão', () => {
  it('considera o dia de fechamento, a virada do ano e fevereiro bissexto', () => {
    expect(getFirstInvoiceMonth('2026-12-24', 25, 5)).toBe('2027-01');
    expect(getFirstInvoiceMonth('2026-12-25', 25, 5)).toBe('2027-02');
    expect(getFirstInvoiceMonth('2024-02-29', 31, 5)).toBe('2024-04');
    expect(invoiceDueDate('2024-02', 31)).toBe('2024-02-29');
    expect(invoiceDueDate('2026-02', 31)).toBe('2026-02-28');
    expect(() => getFirstInvoiceMonth('2026-02-29', 20, 25)).toThrow();
  });

  it('preserva a data de compra e distribui parcelas ao longo das faturas', () => {
    const installments = getPurchaseInstallments(
      card, { description: 'Compra', date: '2026-12-24', amountCents: 1001 }, 3, 'compra',
    );

    expect(installments.map(entry => [
      entry.id, entry.date, getEntryMonth(entry), entry.invoiceDueDate, entry.amountCents,
    ])).toEqual([
      ['compra-1', '2026-12-24', '2027-01', '2027-01-05', 334],
      ['compra-2', '2026-12-24', '2027-02', '2027-02-05', 334],
      ['compra-3', '2026-12-24', '2027-03', '2027-03-05', 333],
    ]);
  });

  it('preserva os centavos da moeda original sem duplicá-los nas parcelas', () => {
    const installments = getPurchaseInstallments(
      card, {
        description: 'Compra internacional', date: '2026-12-24', amountCents: 1552,
        foreignCurrency: 'USD', foreignAmountCents: 251, exchangeRate: 6.18,
      }, 3, 'internacional',
    );
    expect(installments.map(entry => entry.foreignAmountCents)).toEqual([84, 84, 83]);
    expect(installments.every(entry => entry.foreignCurrency === 'USD' && entry.exchangeRate === 6.18)).toBe(true);
  });
});

describe('saldos e extrato', () => {
  it('registra pagamento como saída bancária sem somar despesa duas vezes', () => {
    const purchase = getPurchaseInstallments(
      card, { description: 'Compra', date: '2026-10-24', amountCents: 1001 }, 2, 'compra',
    );
    const referencedInvoice = {
      date: '2026-11-02',
      cardId: card.id,
      invoiceMonth: '2026-11',
      invoiceDueDate: '2026-11-05',
    };
    const entries: LedgerEntry[] = [
      ...purchase,
      { ...referencedInvoice, id: 'credit', kind: 'cardCredit', description: 'Estorno', amountCents: 100 },
      { ...referencedInvoice, id: 'payment', kind: 'invoicePayment', description: 'Fatura', bankAccountId: account.id, amountCents: 401 },
    ];

    expect(getMonthlySummary('2026-11', entries).expenseCents).toBe(401);
    expect(getMonthlySummary('2026-12', entries).expenseCents).toBe(500);
    expect(getBankBalance(account, entries, '2026-11-01')).toBe(100_000);
    expect(getBankBalance(account, entries, '2026-11-02')).toBe(99_599);
    expect(getUsedLimit(card.id, [
      { id: 'november', cardId: card.id, month: '2026-11', dueDate: '2026-11-05', totalCents: 401, paidDate: '2026-11-02' },
      { id: 'december', cardId: card.id, month: '2026-12', dueDate: '2026-12-05', totalCents: 500 },
    ])).toBe(500);
  });

  it('considera transferências, conciliação e previsões de forma independente', () => {
    const other = { ...account, id: 'other', initialBalanceCents: 0 };
    const date = '2026-11-24';
    const entries: LedgerEntry[] = [
      { id: 'transfer', kind: 'transfer', description: 'Transferência', date, amountCents: 600, bankAccountId: account.id, targetBankAccountId: other.id },
      { id: 'adjustment', kind: 'adjustment', description: 'Ajuste de conciliação', date, amountCents: -75, bankAccountId: account.id },
      { id: 'income', kind: 'income', description: 'Receita prevista', date, amountCents: 200, status: 'pending', bankAccountId: account.id },
      { id: 'expense', kind: 'expense', description: 'Conta a pagar', date, amountCents: 100, status: 'pending', bankAccountId: account.id },
    ];

    expect(getBankBalance(account, entries)).toBe(99_325);
    expect(getBankBalance(other, entries)).toBe(600);
    expect(getMonthlySummary('2026-11', entries)).toEqual({
      incomeCents: 200, expenseCents: 100, netCents: 100, pendingIncomeCents: 200, pendingExpenseCents: 100,
    });
  });

  it('desconsidera lançamentos na lixeira em saldos e relatórios', () => {
    const entry: LedgerEntry = {
      id: 'trashed',
      kind: 'expense',
      description: 'Despesa excluída',
      date: '2026-11-24',
      amountCents: 1_000,
      bankAccountId: account.id,
      deletedAt: '2026-11-24T12:00:00Z',
    };
    expect(getBankBalance(account, [entry])).toBe(account.initialBalanceCents);
    expect(getMonthlySummary('2026-11', [entry]).expenseCents).toBe(0);
  });
});

describe('programação de recorrências', () => {
  const rule: RecurringEntryInput = {
    type: 'subscription', frequency: 'monthly', kind: 'expense', description: 'Assinatura',
    amountCents: 5000, startDate: '2024-01-31', bankAccountId: account.id, paused: false,
  };

  it('ajusta dias ao mês sem mudar a data de referência', () => {
    expect(getRecurrenceDates(rule, '2024-01')).toEqual(['2024-01-31']);
    expect(getRecurrenceDates(rule, '2024-02')).toEqual(['2024-02-29']);
    expect(getRecurrenceDates(rule, '2024-03')).toEqual(['2024-03-31']);
    expect(getRecurrenceDates({ ...rule, frequency: 'yearly', startDate: '2024-02-29' }, '2025-02')).toEqual(['2025-02-28']);
  });

  it('mantém a cadência semanal, respeita o término e ignora regras pausadas', () => {
    const weekly = { ...rule, frequency: 'weekly' as const, endDate: '2024-02-15' };
    expect(getRecurrenceDates(weekly, '2024-02')).toEqual(['2024-02-07', '2024-02-14']);
    expect(getRecurrenceDates(weekly, '2024-03')).toEqual([]);
    expect(getRecurrenceDates({ ...weekly, paused: true }, '2024-02')).toEqual([]);
    expect(() => normalizeRecurrence({ ...weekly, endDate: '2024-01-30' })).toThrow();
  });
});
