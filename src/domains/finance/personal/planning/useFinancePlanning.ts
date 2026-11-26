import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assertCents, invoiceDueDate, monthOf, shiftMonth } from '../ledger';
import {
  WISH_COOLING_MS, envelopePreview, newBudgetId, parsePlanItem,
  type ItemOf, type PlanInput, type PlanItem, type Wish,
} from './planningModel';

const empty: PlanItem[] = [];

export function useFinancePlanning(uid: string) {
  const [items, setItems] = useState<PlanItem[]>(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    setItems(empty);
    return onSnapshot(collection(db, 'personalFinance', uid, 'planning'), snapshot => {
      const ready = snapshot.docs.flatMap(row => {
        const item = parsePlanItem({ ...row.data(), id: row.id });
        return item ? [item] : [];
      });
      setItems(ready);
      setLoading(false);
    }, () => {
      setError('O Hub não conseguiu carregar o planejamento. Verifique sua conexão e tente novamente.');
      setLoading(false);
    });
  }, [uid]);

  const planRef = (id?: string) => {
    const plans = collection(db, 'personalFinance', uid, 'planning');
    return id ? doc(plans, id) : doc(plans);
  };

  async function save(input: PlanInput, existingId?: string, expectedSavedCents?: number) {
    const id = input.kind === 'budget' ? newBudgetId(input.month, input.name) : existingId;
    const reference = planRef(id);
    const validated = parsePlanItem({ ...input, id: reference.id });
    if (!validated) throw new Error('Confira o nome, os valores e as datas informadas.');
    const { id: _, ...data } = validated;
    if (data.kind === 'budget') {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        const oldRef = existingId && existingId !== reference.id ? planRef(existingId) : null;
        if (snapshot.exists() && existingId !== reference.id) {
          throw new Error('Já existe um orçamento desta categoria no mês.');
        }
        if (oldRef && !(await transaction.get(oldRef)).exists()) {
          throw new Error('O orçamento já foi alterado em outra sessão.');
        }
        transaction.set(reference, data);
        if (oldRef) transaction.delete(oldRef);
      });
      return;
    }
    if (!existingId) {
      await setDoc(reference, data);
      return;
    }
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = parsePlanItem({ ...snapshot.data(), id: reference.id });
      if (!current || current.kind !== data.kind) {
        if (!current && data.kind === 'goal' && data.emergency) {
          transaction.set(reference, data);
          return;
        }
        throw new Error('Este item mudou em outra sessão. Atualize a página e tente novamente.');
      }
      if (data.kind === 'goal' && current.kind === 'goal') {
        if (expectedSavedCents !== undefined && current.savedCents !== expectedSavedCents) {
          throw new Error('O saldo da meta mudou em outra sessão. Confira o valor antes de salvar.');
        }
        transaction.set(reference, {
          ...data, savedCents: expectedSavedCents === undefined ? current.savedCents : data.savedCents,
          emergency: current.emergency ?? false,
        });
      } else if (data.kind === 'provision' && current.kind === 'provision') {
        transaction.set(reference, { ...data, savedCents: current.savedCents, paid: current.paid });
      } else if (data.kind === 'debt' && current.kind === 'debt') {
        const termsChanged = data.installments !== current.installments || data.amountCents !== current.amountCents || data.date !== current.date;
        if (termsChanged && current.paidInstallments > 0) {
          throw new Error('As parcelas registradas já seguem as condições originais deste plano.');
        }
        transaction.set(reference, { ...data, paidInstallments: current.paidInstallments });
      } else if (data.kind === 'wish' && current.kind === 'wish') {
        if (current.decision !== 'waiting') throw new Error('Esta compra já foi decidida.');
        transaction.set(reference, { ...data, createdAt: current.createdAt, decision: current.decision });
      } else {
        transaction.set(reference, data);
      }
    });
  }

  async function copyBudgets(month: string, source: ItemOf<'budget'>[]) {
    await runTransaction(db, async transaction => {
      const targets = await Promise.all(source.map(async item => {
        const reference = planRef(newBudgetId(month, item.name));
        return { item, reference, previous: await transaction.get(reference) };
      }));
      for (const { item, reference, previous } of targets) {
        if (!previous.exists()) {
          transaction.set(reference, { kind: 'budget', name: item.name, amountCents: item.amountCents, month });
        }
      }
    });
  }

  async function updateProgress(item: ItemOf<'goal'> | ItemOf<'provision'>, amountCents: number) {
    const reference = planRef(item.id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = parsePlanItem({ ...snapshot.data(), id: reference.id });
      if (current?.kind !== item.kind || (current.kind === 'provision' && current.paid)) {
        throw new Error('Este item não aceita ajustes de progresso.');
      }
      const next = current.savedCents + amountCents;
      if (next < 0) throw new Error('O valor retirado excede o saldo registrado.');
      assertCents(next, 0);
      transaction.update(reference, { savedCents: next });
    });
  }

  async function finishProvision(provision: ItemOf<'provision'>, renew: boolean) {
    const reference = planRef(provision.id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = parsePlanItem({ ...snapshot.data(), id: reference.id });
      if (current?.kind !== 'provision' || current.paid !== renew || current.date !== provision.date) {
        throw new Error('Esta provisão mudou. Atualize os dados antes de continuar.');
      }
      if (renew) {
        transaction.update(reference, {
          paid: false, savedCents: 0,
          date: invoiceDueDate(shiftMonth(monthOf(current.date), 12), Number(current.date.slice(8))),
        });
      } else {
        transaction.update(reference, { paid: true });
      }
    });
  }

  async function trackDebt(debt: ItemOf<'debt'>, step: number) {
    const reference = planRef(debt.id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = parsePlanItem({ ...snapshot.data(), id: reference.id });
      if (current?.kind !== 'debt' || current.paidInstallments !== debt.paidInstallments) {
        throw new Error('Este plano já foi atualizado. Confira as parcelas registradas.');
      }
      const paidInstallments = current.paidInstallments + step;
      if (paidInstallments > current.installments || paidInstallments < 0) {
        throw new Error('Confira a quantidade de parcelas do plano.');
      }
      transaction.update(reference, { paidInstallments });
    });
  }

  async function decideWish(wish: ItemOf<'wish'>, decision: Exclude<Wish['decision'], 'waiting'>) {
    const reference = planRef(wish.id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = parsePlanItem({ ...snapshot.data(), id: reference.id });
      if (current?.kind !== 'wish' || current.decision !== 'waiting') {
        throw new Error('Esta compra já foi decidida.');
      }
      if (decision === 'bought' && Date.now() - current.createdAt < WISH_COOLING_MS) {
        throw new Error('A compra ainda está no prazo de reflexão de 48 horas.');
      }
      transaction.update(reference, { decision });
    });
  }

  async function distribute(month: string, amountCents: number, envelopes: ItemOf<'envelope'>[]) {
    assertCents(amountCents);
    const reference = planRef(`distribution-${month}`);
    await runTransaction(db, async transaction => {
      const [distribution, ...snapshots] = await Promise.all([
        transaction.get(reference),
        ...envelopes.map(envelope => transaction.get(planRef(envelope.id))),
      ]);
      if (distribution.exists()) throw new Error('Já existe uma distribuição registrada neste mês.');
      const selected: ItemOf<'envelope'>[] = [];
      for (const snapshot of snapshots) {
        const item = parsePlanItem({ ...snapshot.data(), id: snapshot.id });
        const displayed = envelopes.find(envelope => envelope.id === snapshot.id);
        if (item?.kind !== 'envelope' || item.percentBps !== displayed?.percentBps || item.goalId !== displayed?.goalId) {
          throw new Error('Os envelopes foram alterados. Confira a divisão antes de registrar.');
        }
        selected.push(item);
      }
      const split = envelopePreview(selected, amountCents);
      if (split.totalBps > 10_000 || split.allocated <= 0) {
        throw new Error('A distribuição precisa somar até 100% e separar pelo menos um centavo.');
      }
      const goalDeltas = new Map<string, number>();
      for (const envelope of selected) {
        const delta = split.allocations.get(envelope.id) ?? 0;
        if (envelope.goalId && delta > 0) {
          goalDeltas.set(envelope.goalId, (goalDeltas.get(envelope.goalId) ?? 0) + delta);
        }
      }
      const goals = await Promise.all([...goalDeltas.keys()].map(goalId => transaction.get(planRef(goalId))));
      for (const snapshot of goals) {
        const goal = parsePlanItem({ ...snapshot.data(), id: snapshot.id });
        if (goal?.kind !== 'goal') throw new Error('Atualize o vínculo de um dos envelopes. A meta vinculada foi removida.');
        const savedCents = goal.savedCents + (goalDeltas.get(goal.id) ?? 0);
        assertCents(savedCents, 0);
        transaction.update(snapshot.ref, { savedCents });
      }
      transaction.set(reference, {
        kind: 'distribution', name: 'Distribuição de renda', month, amountCents,
        allocatedCents: split.allocated, createdAt: Date.now(),
      });
    });
  }

  return {
    items, error, loading, save, copyBudgets, updateProgress, finishProvision, trackDebt, decideWish, distribute,
    remove: (id: string) => deleteDoc(planRef(id)),
  };
}
