import { describe, expect, it } from 'vitest';
import {
  categorySpend, debtDueDate, debtPaymentAmount, envelopePreview, parsePlanItem, remainingDebt, simulatePurchase, type DebtPlan,
} from './planningModel';
import type { CreditCard, LedgerEntry } from '../ledger';

const card: CreditCard = {
  id: 'card', name: 'Cartão', bank: 'Banco', brand: 'visa', lastDigits: '', bankAccountId: 'account',
  limitCents: 10_000, closingDay: 10, dueDay: 20, archived: false,
};
const budget = { id: 'budget', kind: 'budget', month: '2026-11', name: 'Alimentação', amountCents: 2_000 } as const;
const entries: LedgerEntry[] = [
  { id: '1', kind: 'income', amountCents: 9_000, date: '2026-11-01', description: 'Salário', status: 'paid' },
  { id: '2', kind: 'expense', amountCents: 1_000, date: '2026-11-02', description: 'Mercado', status: 'pending', category: 'Alimentação' },
  { id: '3', kind: 'purchase', amountCents: 1_400, date: '2026-10-30', invoiceMonth: '2026-11', description: 'Mercado', category: 'alimentacao' },
  { id: '4', kind: 'cardCredit', amountCents: 300, date: '2026-11-01', invoiceMonth: '2026-11', description: 'Estorno', category: 'ALIMENTAÇÃO' },
  { id: '5', kind: 'invoicePayment', amountCents: 1_100, date: '2026-11-20', description: 'Fatura', category: 'Alimentação' },
];

describe('planejamento pessoal', () => {
  it('separa valores pendentes e reconhece parcelas e estornos na competência da fatura', () => {
    expect(categorySpend(entries, '2026-11', 'Alimentação')).toEqual({ recorded: 1_100, pending: 1_000 });
  });

  it('arredonda envelopes sem distribuir centavos adicionais', () => {
    const full = envelopePreview([
      { id: 'a', kind: 'envelope', name: 'A', percentBps: 5_000 },
      { id: 'b', kind: 'envelope', name: 'B', percentBps: 3_000 },
      { id: 'c', kind: 'envelope', name: 'C', percentBps: 2_000 },
    ], 10_001);
    expect(full.allocated).toBe(10_001);
    expect(full.allocations).toEqual(new Map([['a', 5_001], ['b', 3_000], ['c', 2_000]]));
    expect(envelopePreview([{ id: 'a', kind: 'envelope', name: 'A', percentBps: 9_999 }], 2).allocated).toBe(1);
  });

  it('preserva as condições e os centavos do financiamento ao fechar o segundo mês', () => {
    const plan: DebtPlan = {
      kind: 'debt', name: 'FIES', debtType: 'student', amountCents: 10_001,
      date: '2027-01-31', installments: 3, paidInstallments: 2,
    };
    expect(debtDueDate(plan, 1)).toBe('2027-02-28');
    expect(debtPaymentAmount(plan, 0)).toBe(3_334);
    expect(remainingDebt(plan)).toBe(3_333);
    expect(parsePlanItem({ id: 'a', ...plan, amountCents: 2 })).toBeNull();
  });

  it('usa o ciclo do cartão e informa quando a renda futura é estimada', () => {
    const result = simulatePurchase({
      amountCents: 2_001, date: '2026-11-05', installments: 2, card, month: '2026-11',
      category: 'Alimentação', entries, budgets: [budget], invoices: [],
    });
    expect(result.projection.map(item => [item.month, item.cost, item.estimatedIncome])).toEqual([
      ['2026-11', 1_001, false], ['2026-12', 1_000, true],
    ]);
    expect(result.projection[0].remaining).toBe(5_899);
    expect(result.overBudget).toBe(true);
  });
});
