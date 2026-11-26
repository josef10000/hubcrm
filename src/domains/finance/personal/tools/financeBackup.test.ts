import { describe, expect, it, vi } from 'vitest';
import { readFinanceBackup } from './financeBackup';

vi.mock('@/lib/firebase', () => ({ db: null }));

describe('importação de backups pessoais', () => {
  it('mantém apenas os campos financeiros compatíveis antes da confirmação', () => {
    const backup = readFinanceBackup(JSON.stringify({
      format: 'hub-personal-finance', version: 1, collections: {
        accounts: [{ id: 'account', name: 'Conta de teste', bank: 'Banco teste', initialBalanceCents: 1000, secret: 'ignorar' }],
        cards: [{ id: 'card', name: 'Cartão teste', lastDigits: '1111222233334444', cc: 'ignorar' }],
      },
    }));
    expect(backup.source).toBe('Hub');
    expect(backup.records.accounts[0]).not.toHaveProperty('secret');
    expect(backup.records.cards[0]).toMatchObject({ id: 'card', name: 'Cartão teste', lastDigits: '' });
    expect(backup.records.cards[0]).not.toHaveProperty('cc');
  });

  it('converte centavos, campos vinculados e provisões do FamíliaFin', () => {
    const backup = readFinanceBackup(JSON.stringify({
      exportedAt: '2026-11-26T10:25:18.000Z',
      bankAccounts: [{ id: 'b1', name: 'Conta', bankCode: 'simulado', initialBalance: 54.67, pixKey: 'ignorar' }],
      creditCards: [],
      transactions: [{ id: 't1', amount: 9.12, type: 'expense', description: 'Farmácia', date: '2026-11-24', bankAccountId: 'b1' }],
      categoryBudgets: [{ id: 'p1', categoryName: 'Saúde', budgetLimit: 400 }],
      family: { annualProvisions: [{ id: 'p2', title: 'IPVA', targetAmount: 765.32, savedAmount: 270, dueMonth: 5, paidYear: 2025 }] },
    }));
    expect(backup.source).toBe('FamíliaFin');
    expect(backup.records.accounts[0]).toMatchObject({ initialBalanceCents: 5467 });
    expect(backup.records.accounts[0]).not.toHaveProperty('pixKey');
    expect(backup.records.entries[0]).toMatchObject({ amountCents: 912, kind: 'expense', bankAccountId: 'b1' });
    expect(backup.records.planning).toEqual([
      { id: 'p1', kind: 'budget', name: 'Saúde', amountCents: 40000, month: '2026-11' },
      { id: 'p2', kind: 'provision', name: 'IPVA', amountCents: 76532, savedCents: 27000, date: '2026-05-01', paid: false },
    ]);
  });
});
