import { useEffect, useState } from 'react';
import {
  collection, doc, getDocsFromServer, increment, onSnapshot, or, query, runTransaction, setDoc, updateDoc, where,
  type DocumentData, type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  assertCents, assertDate, assertMonth, getBankBalance, getFirstInvoiceMonth, getPurchaseInstallments,
  normalizeAccount, normalizeCard, normalizeEntry, today, MAX_AMOUNT_CENTS,
  type BankAccount, type BankAccountInput, type CardInvoice, type CreditCard, type CreditCardInput,
  type EntryInput, type EntryStatus, type LedgerEntry,
} from './ledger';

interface Collections {
  accounts: BankAccount[];
  cards: CreditCard[];
  entries: LedgerEntry[];
  invoices: CardInvoice[];
}

type CollectionName = keyof Collections;

const collectionNames: readonly CollectionName[] = ['accounts', 'cards', 'entries', 'invoices'];
const emptyCollections: Collections = { accounts: [], cards: [], entries: [], invoices: [] };

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

function readCard(snapshot: DocumentSnapshot<DocumentData>) {
  if (!snapshot.exists() || snapshot.data().archived) throw new Error('Selecione um cartão ativo.');
  return fromSnapshot<CreditCard>(snapshot);
}

function makeInvoiceId(cardId: string, month: string) {
  return `${cardId}-${month}`;
}

function requiredId(id: string | undefined, message: string) {
  if (!id) throw new Error(message);
  return id;
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

  async function saveAccount(input: BankAccountInput, id?: string) {
    const data = normalizeAccount(input);
    const ref = accountRef(id);
    if (!id) {
      await setDoc(ref, { ...data, archived: false, ledgerRevision: 0 });
      return;
    }

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const existing = readAccount(snapshot, true);
      transaction.set(ref, { ...data, archived: existing.archived, ledgerRevision: snapshot.get('ledgerRevision') + 1 });
    });
  }

  async function saveCard(input: CreditCardInput, id?: string) {
    const data = normalizeCard(input);
    const ref = cardRef(id);
    await runTransaction(db, async transaction => {
      const existing = id ? await transaction.get(ref) : null;
      if (existing && !existing.exists()) throw new Error('Este cartão não está disponível.');
      if (data.bankAccountId) {
        const keepLink = existing?.data()?.bankAccountId === data.bankAccountId;
        readAccount(await transaction.get(accountRef(data.bankAccountId)), keepLink);
      }
      transaction.set(ref, { ...data, archived: existing?.data()?.archived ?? false });
    });
  }

  async function addBankEntry(input: EntryInput) {
    const source = accountRef(requiredId(input.bankAccountId, 'Selecione a conta do lançamento.'));
    const transfer = input.kind === 'transfer';
    const target = transfer
      ? accountRef(requiredId(input.targetBankAccountId, 'Selecione a conta de destino.'))
      : null;
    if (target?.id === source.id) throw new Error('Escolha contas diferentes para a transferência.');

    const ref = entryRef();
    const status = !transfer && input.status === 'pending' ? 'pending' : 'paid';

    await runTransaction(db, async transaction => {
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
        ...(input.category ? { category: input.category } : {}),
      });
      if (status === 'paid') {
        transaction.update(source, { ledgerRevision: increment(1) });
        if (target) transaction.update(target, { ledgerRevision: increment(1) });
      }
    });
  }

  async function addPurchase(input: EntryInput, installments: number) {
    const ref = cardRef(requiredId(input.cardId, 'Selecione o cartão da compra.'));
    const groupId = entryRef().id;

    await runTransaction(db, async transaction => {
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
    });
  }

  async function addCardCredit(input: EntryInput) {
    const ref = cardRef(requiredId(input.cardId, 'Selecione o cartão do crédito.'));
    const creditRef = entryRef();

    await runTransaction(db, async transaction => {
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
        ...(input.category ? { category: input.category } : {}),
      });
    });
  }

  async function addEntry(input: EntryInput, installments = 1) {
    const data = normalizeEntry(input);
    if (data.kind === 'purchase') return addPurchase(data, installments);
    if (data.kind === 'cardCredit') return addCardCredit(data);
    return addBankEntry(data);
  }

  async function setEntryStatus(id: string, status: EntryStatus) {
    const ref = entryRef(id);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const entry = fromSnapshot<LedgerEntry>(snapshot);
      if (entry.kind !== 'income' && entry.kind !== 'expense') throw new Error('Este lançamento não pode mudar de situação.');
      if (entry.status === status) return;
      const account = accountRef(entry.bankAccountId!);
      readAccount(await transaction.get(account), true);
      transaction.update(ref, { status });
      transaction.update(account, { ledgerRevision: increment(1) });
    });
  }

  async function payInvoice(invoiceId: string, bankAccountId: string, date: string, expectedTotalCents?: number) {
    assertDate(date);
    if (date > today()) throw new Error('Informe uma data igual ou anterior a hoje.');
    const source = accountRef(requiredId(bankAccountId, 'Selecione a conta de débito.'));
    const invoiceDocument = invoiceRef(invoiceId);
    const paymentDocument = entryRef(`payment-${invoiceId}`);

    await runTransaction(db, async transaction => {
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
    });
  }

  async function reconcileAccount(bankAccountId: string, balanceCents: number, date: string) {
    assertCents(balanceCents, -MAX_AMOUNT_CENTS);
    assertDate(date);
    if (date > today()) throw new Error('Informe uma data igual ou anterior a hoje.');
    const ref = accountRef(requiredId(bankAccountId, 'Selecione a conta a conciliar.'));
    const adjustment = entryRef();

    return runTransaction(db, async transaction => {
      const account = readAccount(await transaction.get(ref));
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
      return difference;
    });
  }

  const current = state.uid === uid ? state : initialState(uid);
  return {
    ...current.data,
    loading: collectionNames.some(name => !current.loaded[name]),
    error: Object.values(current.errors).find(Boolean) ?? null,
    saveAccount,
    saveCard,
    archiveAccount: (id: string) => updateDoc(accountRef(id), { archived: true }),
    restoreAccount: (id: string) => updateDoc(accountRef(id), { archived: false }),
    archiveCard: (id: string) => updateDoc(cardRef(id), { archived: true }),
    restoreCard: (id: string) => updateDoc(cardRef(id), { archived: false }),
    addEntry,
    setEntryStatus,
    payInvoice,
    reconcileAccount,
  };
}
