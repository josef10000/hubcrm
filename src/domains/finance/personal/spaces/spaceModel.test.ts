import { describe, expect, it } from 'vitest';
import { participantBalances, splitExpense, suggestedSettlements, type Participant, type SpaceExpense } from './spaceModel';

function person(id: string, incomeCents: number, dependent = false): Participant {
  return { id, name: id, active: true, dependent, incomeCents, allowanceCents: 0, linkedUid: '' };
}

describe('Rateio dos espaços', () => {
  it('distribui centavos restantes em partes iguais sem incluir dependentes', () => {
    const allocations = splitExpense(1000, 'a', 'equal', [person('a', 1), person('b', 1), person('c', 1), person('d', 1, true)]);
    expect(allocations).toEqual({ a: 334, b: 333, c: 333 });
  });

  it('mantém precisão proporcional com valores grandes', () => {
    expect(splitExpense(999_999_999_999, 'a', 'income', [
      person('a', 999_999_999_998), person('b', 999_999_999_999),
    ])).toEqual({ a: 499_999_999_999, b: 500_000_000_000 });
  });

  it('sugere acertos apenas para despesas aprovadas com alocação íntegra', () => {
    const expense: SpaceExpense = {
      id: 'base', name: 'Jantar', date: '2026-11-26', category: '',
      amountCents: 1001, allocations: { a: 501, b: 500 },
      paidBy: 'a', createdBy: 'a', split: 'equal', status: 'approved', source: 'manual',
    };
    expect(suggestedSettlements(participantBalances([
      expense, { ...expense, id: 'pending', status: 'pending' }, { ...expense, id: 'malformed', allocations: { a: -1, b: 1002 } },
    ]))).toEqual([{ from: 'b', to: 'a', amountCents: 500 }]);
  });
});
