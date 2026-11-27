import { useEffect, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  collection, doc, getDocFromServer, getDocsFromServer, increment, onSnapshot, or, query, runTransaction,
  setDoc, updateDoc, where,
  type DocumentData, type DocumentSnapshot, type Transaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  assertCents, assertDate, assertMonth, getBankBalance, getEntryDetails, getFirstInvoiceMonth, getPurchaseInstallments,
  getRecurrenceDates, invoiceDueDate, normalizeAccount, normalizeCard, normalizeEntry, normalizeRecurrence, today,
  MAX_AMOUNT_CENTS,
  type AuditEvent, type RecurringEntry, type RecurringEntryInput,
  type BankAccount, type BankAccountInput, type CardInvoice, type CreditCard, type CreditCardInput,
  type EntryInput, type EntryStatus, type LedgerEntry,
} from './ledger';

interface Collections {
  accounts: BankAccount[];
  cards: CreditCard[];
  entries: LedgerEntry[];
  invoices: CardInvoice[];
  recurrences: RecurringEntry[];
  audit: AuditEvent[];
}

type CollectionName = keyof Collections;

const collectionNames: readonly CollectionName[] = ['accounts', 'cards', 'entries', 'invoices', 'recurrences', 'audit'];
const emptyCollections: Collections = { accounts: [], cards: [], entries: [], invoices: [], recurrences: [], audit: [] };

interface SnapshotState {
  uid: string;
  data: Collections;
  errors: Partial<Record<CollectionName, string>>;
  loaded: Partial<Record<CollectionName, boolean>>;
}

function initialState(uid: string): SnapshotState {
  return { uid, data: emptyCollections, errors: {}, loaded: {} };
}

function collectionRef(uid: string, name: CollectionName) {
  return collection(db, 'personalFinance', uid, name);
}

function fromSnapshot<T>(snapshot: DocumentSnapshot<DocumentData>): T {
  return { ...snapshot.data(), id: snapshot.id } as T;
}

function readAccount(snapshot: DocumentSnapshot<DocumentData>, allowArchived = false) {
  if (!snapshot.exists() || (!allowArchived && snapshot.data().archived)) {
    throw new Error('Selecione uma conta bancária ativa.');
  }
  return fromSnapshot<BankAccount>(snapshot);
}

function readCard(snapshot: DocumentSnapshot<DocumentData>, allowArchived = false) {
  if (!snapshot.exists() || (!allowArchived && snapshot.data().archived)) throw new Error('Selecione um cartão ativo.');
  return fromSnapshot<CreditCard>(snapshot);
}

function makeInvoiceId(cardId: string, month: string) {
  return `${cardId}-${month}`;
}

function requiredId(id: string | undefined, message: string) {
  if (!id) throw new Error(message);
  return id;
}

export async function importDocumentId(externalId: string | undefined) {
  if (!externalId) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(externalId));
  return 'import-' + Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function withoutId<T extends { id: string }>(document: T) {
  const { id, ...data } = document;
  return data;
}

export function usePersonalFinance(uid: string) {
  const [state, setState] = useState(() => initialState(uid));

  useEffect(() => {
    const base = initialState(uid);
    setState(base);
    if (!uid) return;

    let active = true;
    const unsubscribe = collectionNames.map(name => onSnapshot(collectionRef(uid, name), snapshot => {
      if (!active) return;
      const documents = snapshot.docs.map(item => fromSnapshot(item));
      setState(previous => {
        const current = previous.uid === uid ? previous : base;
        return {
          ...current,
          data: { ...current.data, [name]: documents },
          loaded: { ...current.loaded, [name]: true },
          errors: { ...current.errors, [name]: undefined },
        };
      });
    }, error => {
      if (!active) return;
      setState(previous => {
        const current = previous.uid === uid ? previous : base;
        return {
          ...current,
          loaded: { ...current.loaded, [name]: true },
          errors: {
            ...current.errors,
            [name]: error.code === 'permission-denied'
              ? 'O Firebase recusou o acesso aos dados de Finanças Pessoais.'
              : 'Não foi possível sincronizar os dados de Finanças Pessoais.',
          },
        };
      });
    }));

    return () => {
      active = false;
      unsubscribe.forEach(stop => stop());
    };
  }, [uid]);

  function accountRef(id?: string) {
    const accounts = collectionRef(uid, 'accounts');
    return id ? doc(accounts, id) : doc(accounts);
  }

  function cardRef(id?: string) {
    const cards = collectionRef(uid, 'cards');
    return id ? doc(cards, id) : doc(cards);
  }

  function entryRef(id?: string) {
    const entries = collectionRef(uid, 'entries');
    return id ? doc(entries, id) : doc(entries);
  }

  function invoiceRef(id: string) {
    return doc(collectionRef(uid, 'invoices'), id);
  }

  function recurrenceRef(id?: string) {
    const recurrences = collectionRef(uid, 'recurrences');
    return id ? doc(recurrences, id) : doc(recurrences);
  }

  function logAudit(
    transaction: Transaction,
    action: AuditEvent['action'],
    entity: AuditEvent['entity'],
    entityId: string,
    label: string,
  ) {
    transaction.set(doc(collectionRef(uid, 'audit')), { action, entity, entityId, label, at: new Date().toISOString() });
  }

  async function saveAccount(input: BankAccountInput, id?: string, externalId?: string) {
    const data = normalizeAccount(input);
    const importId = id ? undefined : await importDocumentId(externalId);
    const ref = accountRef(id ?? importId);
    if (!id && !importId) {
      await setDoc(ref, { ...data, archived: false, ledgerRevision: 0 });
      return ref.id;
    }

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (importId) {
        if (!snapshot.exists()) transaction.set(ref, { ...data, archived: false, ledgerRevision: 0 });
        return;
      }
      const existing = readAccount(snapshot, true);
      transaction.set(ref, { ...data, archived: existing.archived, ledgerRevision: snapshot.get('ledgerRevision') + 1 });
    });
    return ref.id;
  }

  async function saveCard(input: CreditCardInput, id?: string, externalId?: string) {
    const data = normalizeCard(input);
    const importId = id ? undefined : await importDocumentId(externalId);
    const ref = cardRef(id ?? importId);
    await runTransaction(db, async transaction => {
      const existing = id || importId ? await transaction.get(ref) : null;
      if (id && !existing?.exists()) throw new Error('Este cartão não está disponível.');
      if (importId && existing?.exists()) return;
      if (data.bankAccountId) {
        const keepLink = existing?.data()?.bankAccountId === data.bankAccountId;
        readAccount(await transaction.get(accountRef(data.bankAccountId)), keepLink);
      }
      transaction.set(ref, { ...data, archived: existing?.data()?.archived ?? false });
    });
    return ref.id;
  }

  async function deleteAccount(id: string) {
    const [directEntries, transfersIn, attachedCards, paidInvoices, recurrences] = await Promise.all([
      getDocsFromServer(query(collectionRef(uid, 'entries'), where('bankAccountId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'entries'), where('targetBankAccountId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'cards'), where('bankAccountId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'invoices'), where('paymentAccountId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'recurrences'), where('bankAccountId', '==', id))),
    ]);
    if ([directEntries, transfersIn, attachedCards, paidInvoices, recurrences].some(result => !result.empty)) {
      throw new Error('Esta conta tem histórico ou cartões vinculados. Arquive a conta para preservar os registros.');
    }
    await runTransaction(db, async transaction => {
      const ref = accountRef(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Esta conta não está disponível.');
      transaction.delete(ref);
      logAudit(transaction, 'delete', 'account', id, snapshot.get('name') || 'Conta');
    });
  }

  async function deleteCard(id: string) {
    const [entries, invoices, recurrences] = await Promise.all([
      getDocsFromServer(query(collectionRef(uid, 'entries'), where('cardId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'invoices'), where('cardId', '==', id))),
      getDocsFromServer(query(collectionRef(uid, 'recurrences'), where('cardId', '==', id))),
    ]);
    if ([entries, invoices, recurrences].some(result => !result.empty)) {
      throw new Error('Este cartão tem faturas, lançamentos ou recorrências. Arquive o cartão para preservar o histórico.');
    }
    await runTransaction(db, async transaction => {
      const ref = cardRef(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Este cartão não está disponível.');
      transaction.delete(ref);
      logAudit(transaction, 'delete', 'card', id, snapshot.get('name') || 'Cartão');
    });
  }

  async function addBankEntry(input: EntryInput, importId?: string) {
    const source = accountRef(requiredId(input.bankAccountId, 'Selecione a conta do lançamento.'));
    const transfer = input.kind === 'transfer';
    const target = transfer
      ? accountRef(requiredId(input.targetBankAccountId, 'Selecione a conta de destino.'))
      : null;
    if (target?.id === source.id) throw new Error('Escolha contas diferentes para a transferência.');

    const ref = entryRef(importId);
    const status = !transfer && input.status === 'pending' ? 'pending' : 'paid';

    await runTransaction(db, async transaction => {
      if (importId && (await transaction.get(ref)).exists()) return;
      readAccount(await transaction.get(source));
      if (target) readAccount(await transaction.get(target));
      transaction.set(ref, {
        kind: input.kind,
        description: input.description,
        date: input.date,
        amountCents: input.amountCents,
        status,
        bankAccountId: source.id,
        ...(target ? { targetBankAccountId: target.id } : {}),
        ...getEntryDetails(input),
      });
      logAudit(transaction, 'create', 'entry', ref.id, input.description);
      if (status === 'paid') {
        transaction.update(source, { ledgerRevision: increment(1) });
        if (target) transaction.update(target, { ledgerRevision: increment(1) });
      }
    });
  }

  async function addPurchase(input: EntryInput, installments: number, importId?: string) {
    const ref = cardRef(requiredId(input.cardId, 'Selecione o cartão da compra.'));
    const groupId = importId ?? entryRef().id;

    await runTransaction(db, async transaction => {
      if (importId && (await transaction.get(entryRef(`${groupId}-1`))).exists()) return;
      const card = readCard(await transaction.get(ref));
      const entries = getPurchaseInstallments(card, input, installments, groupId);
      const updates = await Promise.all(entries.map(async entry => {
        const invoiceId = makeInvoiceId(card.id, entry.invoiceMonth!);
        const target = invoiceRef(invoiceId);
        const snapshot = await transaction.get(target);
        const invoice = snapshot.exists() ? fromSnapshot<CardInvoice>(snapshot) : null;
        if (invoice?.paidDate) throw new Error(`A fatura de ${entry.invoiceMonth} já foi paga.`);
        const totalCents = (invoice?.totalCents ?? 0) + entry.amountCents;
        assertCents(totalCents);
        const dueDate = invoice?.dueDate ?? entry.invoiceDueDate!;
        return { entry, target, totalCents, dueDate };
      }));

      for (const { entry, target, totalCents, dueDate } of updates) {
        const { id, ...data } = entry;
        transaction.set(entryRef(id), { ...data, invoiceDueDate: dueDate });
        transaction.set(target, { cardId: card.id, month: entry.invoiceMonth, dueDate, totalCents });
      }
      logAudit(transaction, 'create', 'entry', entries[0].id, input.description);
    });
  }

  async function addCardCredit(input: EntryInput, importId?: string) {
    const ref = cardRef(requiredId(input.cardId, 'Selecione o cartão do crédito.'));
    const creditRef = entryRef(importId);

    await runTransaction(db, async transaction => {
      if (importId && (await transaction.get(creditRef)).exists()) return;
      const card = readCard(await transaction.get(ref));
      const month = input.invoiceMonth || getFirstInvoiceMonth(input.date, card.closingDay, card.dueDay);
      assertMonth(month);
      const target = invoiceRef(makeInvoiceId(card.id, month));
      const snapshot = await transaction.get(target);
      if (!snapshot.exists()) throw new Error('Selecione uma fatura em aberto para aplicar este crédito.');
      const invoice = fromSnapshot<CardInvoice>(snapshot);
      if (invoice.paidDate) throw new Error('Esta fatura já foi paga.');
      if (input.amountCents > invoice.totalCents) throw new Error('O crédito excede o total em aberto da fatura.');

      transaction.update(target, { totalCents: invoice.totalCents - input.amountCents });
      transaction.set(creditRef, {
        kind: 'cardCredit',
        description: input.description,
        date: input.date,
        amountCents: input.amountCents,
        cardId: card.id,
        invoiceMonth: month,
        invoiceDueDate: invoice.dueDate,
        ...getEntryDetails(input),
      });
      logAudit(transaction, 'create', 'entry', creditRef.id, input.description);
    });
  }

  async function addEntry(input: EntryInput, installments = 1) {
    const data = normalizeEntry(input);
    const importId = await importDocumentId(data.externalId);
    if (data.kind === 'purchase') return addPurchase(data, installments, importId);
    if (data.kind === 'cardCredit') return addCardCredit(data, importId);
    return addBankEntry(data, importId);
  }

  async function setEntryStatus(id: string, status: EntryStatus) {
    const ref = entryRef(id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const entry = fromSnapshot<LedgerEntry>(snapshot);
      if (entry.deletedAt || (entry.kind !== 'income' && entry.kind !== 'expense')) {
        throw new Error('Este lançamento não pode mudar de situação.');
      }
      if (entry.status === status) return;
      const account = accountRef(entry.bankAccountId!);
      readAccount(await transaction.get(account), true);
      transaction.update(ref, { status });
      transaction.update(account, { ledgerRevision: increment(1) });
      logAudit(transaction, 'status', 'entry', id, entry.description);
    });
  }

  async function makeEditedEntry(transaction: Transaction, entry: LedgerEntry, input: EntryInput): Promise<LedgerEntry> {
    const data = normalizeEntry(input);
    if (data.kind !== entry.kind) throw new Error('O tipo de um lançamento existente não pode ser alterado.');
    const basic = {
      id: entry.id,
      kind: entry.kind,
      description: data.description,
      date: data.date,
      amountCents: data.amountCents,
      ...(entry.recurrenceId ? { recurrenceId: entry.recurrenceId } : {}),
      ...getEntryDetails(data),
    };
    if (data.kind === 'purchase' || data.kind === 'cardCredit') {
      const cardId = requiredId(data.cardId, 'Selecione um cartão.');
      const sameCycle = cardId === entry.cardId && data.date === entry.date;
      if ((entry.installmentCount ?? 1) > 1 && !sameCycle) {
        throw new Error('A data e o cartão fazem parte da compra original e não podem mudar em uma única parcela.');
      }
      const card = readCard(await transaction.get(cardRef(cardId)), cardId === entry.cardId);
      const month = (data.kind === 'cardCredit' ? data.invoiceMonth : undefined)
        || (sameCycle ? entry.invoiceMonth : undefined)
        || getFirstInvoiceMonth(data.date, card.closingDay, card.dueDay);
      assertMonth(month);
      return {
        ...basic,
        cardId,
        invoiceMonth: month,
        invoiceDueDate: month === entry.invoiceMonth && cardId === entry.cardId && entry.invoiceDueDate
          ? entry.invoiceDueDate : invoiceDueDate(month, card.dueDay),
        ...(entry.groupId ? {
          groupId: entry.groupId, installment: entry.installment, installmentCount: entry.installmentCount,
        } : {}),
      };
    }

    const bankAccountId = requiredId(data.bankAccountId, 'Selecione a conta do lançamento.');
    const targetBankAccountId = data.kind === 'transfer'
      ? requiredId(data.targetBankAccountId, 'Selecione a conta de destino.') : undefined;
    if (targetBankAccountId === bankAccountId) throw new Error('Escolha contas diferentes para a transferência.');
    const previousAccounts = [entry.bankAccountId, entry.targetBankAccountId];
    for (const id of [bankAccountId, targetBankAccountId]) {
      if (id) readAccount(await transaction.get(accountRef(id)), previousAccounts.includes(id));
    }
    return {
      ...basic, bankAccountId,
      status: data.kind === 'transfer' ? 'paid' : data.status ?? entry.status ?? 'paid',
      ...(targetBankAccountId ? { targetBankAccountId } : {}),
    };
  }

  async function writeEntryChange(
    transaction: Transaction, previous: LedgerEntry | null, next: LedgerEntry,
  ) {
    const invoices = new Map<string, { entry: LedgerEntry; delta: number }>();
    const accounts = new Set<string>();

    function track(entry: LedgerEntry | null, sign: number) {
      if (!entry || entry.deletedAt) return;
      if (entry.cardId && entry.invoiceMonth) {
        const id = makeInvoiceId(entry.cardId, entry.invoiceMonth);
        const effect = entry.kind === 'cardCredit' ? -entry.amountCents : entry.amountCents;
        invoices.set(id, { entry, delta: (invoices.get(id)?.delta ?? 0) + effect * sign });
      } else {
        if (entry.bankAccountId) accounts.add(entry.bankAccountId);
        if (entry.targetBankAccountId) accounts.add(entry.targetBankAccountId);
      }
    }
    track(previous, -1);
    track(next, 1);

    const invoiceChanges = await Promise.all(Array.from(invoices, async ([id, { entry, delta }]) => {
      const ref = invoiceRef(id);
      const snapshot = await transaction.get(ref);
      const invoice = snapshot.exists() ? fromSnapshot<CardInvoice>(snapshot) : null;
      const metadataOnly = delta === 0 && previous?.date === next.date && previous?.amountCents === next.amountCents;
      if (invoice?.paidDate && !metadataOnly) throw new Error(`A fatura de ${entry.invoiceMonth} já foi paga.`);
      if (!invoice && entry.kind === 'cardCredit') throw new Error('Selecione uma fatura em aberto para aplicar o crédito.');
      const totalCents = (invoice?.totalCents ?? 0) + delta;
      if (totalCents < 0) throw new Error('A alteração deixaria a fatura com valor negativo. Verifique os créditos da fatura.');
      assertCents(totalCents, 0);
      return {
        ref, cardId: entry.cardId!, month: entry.invoiceMonth!,
        dueDate: invoice?.dueDate ?? entry.invoiceDueDate!, totalCents, needsWrite: !invoice || delta !== 0,
      };
    }));

    const nextInvoice = next.cardId && next.invoiceMonth
      ? invoiceChanges.find(item => item.ref.id === makeInvoiceId(next.cardId!, next.invoiceMonth!)) : undefined;
    const withDueDate = nextInvoice ? { ...next, invoiceDueDate: nextInvoice.dueDate } : next;
    transaction.set(entryRef(next.id), withoutId(withDueDate));
    for (const { ref, needsWrite, ...invoice } of invoiceChanges) {
      if (needsWrite) transaction.set(ref, invoice);
    }
    for (const id of accounts) transaction.update(accountRef(id), { ledgerRevision: increment(1) });
  }

  async function changeEntry(id: string, action: 'edit' | 'trash' | 'restore', input?: EntryInput) {
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(entryRef(id));
      if (!snapshot.exists()) throw new Error('Este lançamento não está disponível.');
      const entry = fromSnapshot<LedgerEntry>(snapshot);
      if (entry.kind === 'invoicePayment') throw new Error('Pagamentos de fatura são registros permanentes.');
      if (action === 'trash' && entry.deletedAt) return;
      if (action === 'restore' && !entry.deletedAt) return;
      if (action === 'edit' && entry.deletedAt) throw new Error('Restaure o lançamento antes de editar.');

      const { deletedAt, ...active } = entry;
      const next = input ? await makeEditedEntry(transaction, entry, input)
        : action === 'trash' ? { ...active, deletedAt: new Date().toISOString() } : active;
      await writeEntryChange(transaction, entry, next);
      logAudit(transaction, action, 'entry', id, entry.description);
    });
  }

  async function saveRecurrence(input: RecurringEntryInput, id?: string, externalId?: string) {
    const data = normalizeRecurrence(input);
    const importId = id ? undefined : await importDocumentId(externalId);
    const ref = recurrenceRef(id ?? importId);
    await runTransaction(db, async transaction => {
      const previous = id || importId ? await transaction.get(ref) : null;
      if (id && !previous?.exists()) throw new Error('Esta recorrência não está disponível.');
      if (importId && previous?.exists()) return;
      if (data.kind === 'purchase') {
        const cardId = requiredId(data.cardId, 'Selecione o cartão da recorrência.');
        readCard(await transaction.get(cardRef(cardId)), data.paused);
      } else {
        const accountId = requiredId(data.bankAccountId, 'Selecione a conta da recorrência.');
        readAccount(await transaction.get(accountRef(accountId)), data.paused);
      }
      transaction.set(ref, data);
      logAudit(transaction, 'saveRecurrence', 'recurrence', ref.id, data.description);
    });
    return ref.id;
  }

  async function archiveRecurrence(id: string) {
    await runTransaction(db, async transaction => {
      const ref = recurrenceRef(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists() || snapshot.data().paused) return;
      transaction.update(ref, { paused: true });
      logAudit(transaction, 'archiveRecurrence', 'recurrence', id, snapshot.data().description);
    });
  }

  async function generateRecurrences(month: string) {
    assertMonth(month);
    const active = query(collectionRef(uid, 'recurrences'), where('paused', '==', false));
    const source = await getDocsFromServer(active);
    let count = 0;
    const failures: string[] = [];
    for (const item of source.docs) {
      const rule = fromSnapshot<RecurringEntry>(item);
      for (const date of getRecurrenceDates(rule, month)) {
        try {
          if (await generateOccurrence(rule.id, month, date)) count += 1;
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Falha ao registrar o lançamento.';
          failures.push(`${rule.description} (${date}). ${detail}`);
        }
      }
    }
    if (failures.length) {
      throw new Error(`A geração registrou ${count} de ${count + failures.length} ocorrências. ${failures[0]}`);
    }
    return count;
  }

  function generateOccurrence(recurrenceId: string, month: string, date: string) {
    return runTransaction(db, async transaction => {
      const id = `repeat-${recurrenceId}-${date}`;
      if ((await transaction.get(entryRef(id))).exists()) return false;
      const current = await transaction.get(recurrenceRef(recurrenceId));
      if (!current.exists()) return false;
      const latest = fromSnapshot<RecurringEntry>(current);
      if (!getRecurrenceDates(latest, month).includes(date)) return false;
      const basic = {
        id, description: latest.description, date, amountCents: latest.amountCents,
        recurrenceId, ...(latest.category ? { category: latest.category } : {}),
      };
      let entry: LedgerEntry;
      if (latest.kind === 'purchase') {
        const card = readCard(await transaction.get(cardRef(latest.cardId!)));
        [entry] = getPurchaseInstallments(card, basic, 1, id);
        entry = { ...entry, id, recurrenceId };
      } else {
        const account = readAccount(await transaction.get(accountRef(latest.bankAccountId!)));
        entry = { ...basic, kind: latest.kind, bankAccountId: account.id, status: 'pending' };
      }
      await writeEntryChange(transaction, null, entry);
      logAudit(transaction, 'generate', 'entry', id, latest.description);
      return true;
    });
  }

  async function payInvoice(invoiceId: string, bankAccountId: string, date: string, expectedTotalCents?: number) {
    assertDate(date);
    if (date > today()) throw new Error('Informe uma data igual ou anterior a hoje.');
    const source = accountRef(requiredId(bankAccountId, 'Selecione a conta de débito.'));
    const invoiceDocument = invoiceRef(invoiceId);
    const paymentDocument = entryRef(`payment-${invoiceId}`);

    async function recordPayment(transaction: Transaction) {
      const [invoiceSnapshot, paymentSnapshot] = await Promise.all([
        transaction.get(invoiceDocument),
        transaction.get(paymentDocument),
      ]);
      if (!invoiceSnapshot.exists()) throw new Error('Esta fatura não está disponível.');
      const invoice = fromSnapshot<CardInvoice>(invoiceSnapshot);
      if (invoice.paidDate && paymentSnapshot.exists()) return;
      if (invoice.paidDate || paymentSnapshot.exists()) throw new Error('O registro desta fatura está inconsistente.');
      if (invoice.totalCents <= 0) throw new Error('Esta fatura está sem valor a pagar.');
      if (expectedTotalCents !== undefined && invoice.totalCents !== expectedTotalCents) {
        throw new Error('O total da fatura mudou. Confira o novo valor antes de registrar o pagamento.');
      }
      readAccount(await transaction.get(source));
      const card = await transaction.get(cardRef(invoice.cardId));

      transaction.set(paymentDocument, {
        kind: 'invoicePayment',
        description: `Pagamento de fatura · ${card.data()?.name ?? 'Cartão'}`,
        date,
        amountCents: invoice.totalCents,
        status: 'paid',
        bankAccountId: source.id,
        cardId: invoice.cardId,
        invoiceMonth: invoice.month,
        invoiceDueDate: invoice.dueDate,
      });
      transaction.update(invoiceDocument, { paidDate: date, paymentAccountId: source.id });
      transaction.update(source, { ledgerRevision: increment(1) });
      logAudit(transaction, 'payInvoice', 'invoice', invoiceId, card.data()?.name ?? 'Cartão');
    }

    try {
      await runTransaction(db, recordPayment);
    } catch (error) {
      if (!(error instanceof FirebaseError) || error.code !== 'permission-denied') throw error;
      // Rules may evaluate against the concurrent committed payment before Firestore checks the read version.
      const committed = await Promise.all([getDocFromServer(invoiceDocument), getDocFromServer(paymentDocument)])
        .then(([invoice, payment]) => Boolean(invoice.data()?.paidDate && payment.exists()), () => false);
      if (!committed) throw error;
    }
  }

  async function reconcileAccount(bankAccountId: string, balanceCents: number, date: string) {
    assertCents(balanceCents, -MAX_AMOUNT_CENTS);
    assertDate(date);
    if (date > today()) throw new Error('Informe uma data igual ou anterior a hoje.');
    const ref = accountRef(requiredId(bankAccountId, 'Selecione a conta a conciliar.'));
    const adjustment = entryRef();
    let readRevision: number | undefined;

    async function recordAdjustment(transaction: Transaction) {
      const balanceSnapshot = await transaction.get(ref);
      const account = readAccount(balanceSnapshot);
      readRevision = balanceSnapshot.get('ledgerRevision');
      // Each balance-changing write updates the account's revision in the same transaction.
      // A concurrent change invalidates this read and retries reconciliation with fresh entries.
      const movements = query(collectionRef(uid, 'entries'), or(
        where('bankAccountId', '==', bankAccountId),
        where('targetBankAccountId', '==', bankAccountId),
      ));
      const snapshot = await getDocsFromServer(movements);
      const accountEntries = snapshot.docs.map(item => fromSnapshot<LedgerEntry>(item));
      const difference = balanceCents - getBankBalance(account, accountEntries, date);
      if (difference === 0) return 0;
      assertCents(difference, -MAX_AMOUNT_CENTS);

      transaction.set(adjustment, {
        kind: 'adjustment',
        description: 'Ajuste de conciliação',
        date,
        amountCents: difference,
        status: 'paid',
        bankAccountId,
      });
      transaction.update(ref, { ledgerRevision: increment(1) });
      logAudit(transaction, 'reconcile', 'entry', adjustment.id, account.name);
      return difference;
    }

    try {
      return await runTransaction(db, recordAdjustment);
    } catch (error) {
      if (!(error instanceof FirebaseError) || error.code !== 'permission-denied' || readRevision === undefined) throw error;
      const latestRevision = await getDocFromServer(ref).then(snapshot => snapshot.get('ledgerRevision'), () => undefined);
      if (latestRevision === undefined || latestRevision === readRevision) throw error;
      return runTransaction(db, recordAdjustment);
    }
  }

  const current = state.uid === uid ? state : initialState(uid);
  const { entries, trash } = useMemo(() => {
    const entries: LedgerEntry[] = [];
    const trash: LedgerEntry[] = [];
    for (const entry of current.data.entries) (entry.deletedAt ? trash : entries).push(entry);
    return { entries, trash };
  }, [current.data.entries]);
  return {
    ...current.data,
    entries,
    trash,
    loading: Boolean(uid) && collectionNames.some(name => !current.loaded[name]),
    error: Object.values(current.errors).find(Boolean) ?? null,
    saveAccount,
    saveCard,
    deleteAccount,
    deleteCard,
    archiveAccount: (id: string) => updateDoc(accountRef(id), { archived: true }),
    restoreAccount: (id: string) => updateDoc(accountRef(id), { archived: false }),
    archiveCard: (id: string) => updateDoc(cardRef(id), { archived: true }),
    restoreCard: (id: string) => updateDoc(cardRef(id), { archived: false }),
    addEntry,
    updateEntry: (id: string, input: EntryInput) => changeEntry(id, 'edit', input),
    trashEntry: (id: string) => changeEntry(id, 'trash'),
    restoreEntry: (id: string) => changeEntry(id, 'restore'),
    saveRecurrence,
    archiveRecurrence,
    generateRecurrences,
    setEntryStatus,
    payInvoice,
    reconcileAccount,
  };
}
