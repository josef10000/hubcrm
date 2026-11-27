import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  assertCents, assertMonth, getFirstInvoiceMonth, monthOf, normalizeAccount, normalizeCard, normalizeRecurrence,
  splitInstallments, TAX_DEDUCTION_CATEGORIES, today, type EntryInput, type LedgerEntry, type RecurringEntryInput,
} from '../ledger';
import { importDocumentId, type usePersonalFinance } from '../usePersonalFinance';
import { validAsset, validReportSettings, reportDefaults } from '../analysis/analysisData';
import { parsePlanItem } from '../planning/planningModel';
import { bankPresets, inferBankPreset } from '../walletBranding';
import { downloadData, parseImportDate } from './financeToolData';

const backupCollections = ['accounts', 'cards', 'entries', 'invoices', 'recurrences', 'audit', 'tools', 'planning', 'assets', 'reportSettings'] as const;
type BackupCollection = typeof backupCollections[number];
type RecordValue = Record<string, unknown>;
type Finance = ReturnType<typeof usePersonalFinance>;
type Records = Record<BackupCollection, RecordValue[]>;
export interface FinanceBackup {
  format: 'hub-personal-finance';
  version: 1;
  exportedAt: string;
  collections: Records;
}
export interface RestorePreview {
  source: 'Hub' | 'FamíliaFin';
  records: Records;
}
const snapshotLimit = 5000;

const exportKeys: Record<BackupCollection, readonly string[]> = {
  accounts: ['name', 'bank', 'bankPreset', 'initialBalanceCents', 'archived', 'accountType', 'color', 'style'],
  cards: ['name', 'bank', 'bankPreset', 'brand', 'lastDigits', 'bankAccountId', 'limitCents', 'closingDay', 'dueDay', 'archived', 'color',
    'style', 'virtual', 'monthlyLimitCents', 'cashbackPercent', 'pointsPerDollar', 'rewardProgramName'],
  entries: ['kind', 'description', 'date', 'amountCents', 'status', 'bankAccountId', 'targetBankAccountId', 'cardId', 'invoiceMonth',
    'invoiceDueDate', 'groupId', 'installment', 'installmentCount', 'category', 'tags', 'warrantyUntil', 'reimbursement',
    'taxDeductionCategory', 'foreignCurrency', 'foreignAmountCents', 'exchangeRate', 'recurrenceId', 'deletedAt'],
  invoices: ['cardId', 'month', 'dueDate', 'totalCents', 'paidDate', 'paymentAccountId'],
  recurrences: ['type', 'frequency', 'kind', 'description', 'amountCents', 'startDate', 'endDate', 'bankAccountId', 'cardId', 'category', 'paused'],
  audit: ['action', 'entity', 'entityId', 'label', 'at'],
  tools: ['kind', 'pattern', 'category', 'matchMode', 'activityType', 'createdAt', 'name', 'content', 'mime', 'dataUrl', 'entryId'],
  planning: ['kind', 'name', 'month', 'amountCents', 'savedCents', 'date', 'emergency', 'paid', 'installments', 'paidInstallments', 'debtType',
    'percentBps', 'goalId', 'createdAt', 'decision', 'note', 'allocatedCents'],
  assets: ['name', 'kind', 'category', 'purchaseCents', 'currentCents', 'acquiredOn', 'note', 'maturityOn', 'issuer', 'dividendCents', 'dividendDay', 'maintenance'],
  reportSettings: ['annualIpcaPercent', 'essentialExpenseCents', 'monthlyContributionCents', 'annualRealReturnPercent', 'withdrawalPercent'],
};

function onlyFields(item: RecordValue, keys: readonly string[]) {
  return Object.fromEntries(keys.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]));
}

function exportedDocument(key: BackupCollection, id: string, item: RecordValue): RecordValue & { id: string } {
  const data = onlyFields(item, exportKeys[key]);
  if (key === 'cards' && !/^\d{4}$/.test(string(data.lastDigits))) data.lastDigits = '';
  if (key === 'assets' && Array.isArray(data.maintenance)) {
    data.maintenance = data.maintenance.map(value => onlyFields(mapObject(value), ['id', 'date', 'description', 'costCents']));
  }
  return { ...data, id };
}

function mapObject(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function safeArray(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(mapObject) : [];
}

function string(value: unknown, limit = 160) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function documentId(value: unknown) {
  const id = string(value, 1024);
  return id && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id) ? id : '';
}

function cents(value: unknown, min = 0) {
  if (typeof value !== 'number') throw new Error('Valor ausente no backup.');
  assertCents(value, min);
  return value;
}

function legacyAmount(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : fallback;
}

function isStyle(value: unknown): value is 'solid' | 'gradient' | 'metallic' | 'brushed' | 'glass' | 'holographic' {
  return typeof value === 'string' && ['solid', 'gradient', 'metallic', 'brushed', 'glass', 'holographic'].includes(value);
}

function isAccountType(value: unknown): value is 'checking' | 'digital' | 'savings' | 'salary' | 'investment' {
  return typeof value === 'string' && ['checking', 'digital', 'savings', 'salary', 'investment'].includes(value);
}

function appearance(item: RecordValue) {
  return {
    color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '',
    ...(isStyle(item.style) ? { style: item.style } : {}),
  };
}

export async function exportFinanceBackup(uid: string) {
  const listed = await Promise.all(backupCollections.map(async key => {
    if (key === 'reportSettings') {
      const settings = await getDocFromServer(doc(db, 'personalFinance', uid, key, 'settings'));
      return [key, settings.exists() ? [exportedDocument(key, settings.id, settings.data())] : []] as const;
    }
    const snapshot = await getDocsFromServer(collection(db, 'personalFinance', uid, key));
    return [key, snapshot.docs.map(document => exportedDocument(key, document.id, document.data()))] as const;
  }));
  const collections = {} as Records;
  for (const [key, records] of listed) collections[key] = records;
  const backup: FinanceBackup = {
    format: 'hub-personal-finance', version: 1, exportedAt: new Date().toISOString(), collections,
  };
  downloadData(JSON.stringify(backup, null, 2), `hub-financas-${backup.exportedAt.slice(0, 10)}.json`, 'application/json');
}

export function readFinanceBackup(text: string): RestorePreview {
  const backup = mapObject(JSON.parse(text.replace(/^\uFEFF/, '')));
  const hub = backup.format === 'hub-personal-finance' && backup.version === 1;
  const legacy = Array.isArray(backup.transactions) && (Array.isArray(backup.bankAccounts) || Array.isArray(backup.creditCards));
  if (!hub && !legacy) throw new Error('Escolha um arquivo de backup Hub v1 ou FamíliaFin.');
  const collections = mapObject(backup.collections);
  const records = Object.fromEntries(backupCollections.map(key => [key, safeArray(collections[key])])) as Records;
  if (legacy && !hub) {
    records.accounts = safeArray(backup.bankAccounts).map(item => {
      const preset = bankPresets.find(value => value.id === item.bankCode) || bankPresets.find(value => value.id === inferBankPreset(String(item.bankCode || item.name || '')))!;
      return { ...item, bankPreset: preset.id, bank: String(item.bankName || preset.name), initialBalanceCents: legacyAmount(item.initialBalance), style: item.cardStyle };
    });
    records.cards = safeArray(backup.creditCards).map(item => ({
      ...item,
      bank: bankPresets.find(value => value.id === inferBankPreset(String(item.name || '')))?.name || '',
      bankPreset: inferBankPreset(String(item.name || '')),
      limitCents: legacyAmount(item.limit), bankAccountId: item.linkedBankId,
      style: item.cardStyle, virtual: item.isVirtual,
      ...(typeof item.monthlyLimit === 'number' ? { monthlyLimitCents: legacyAmount(item.monthlyLimit) } : {}),
    }));
    records.entries = safeArray(backup.transactions).map(item => ({
      ...item, amountCents: legacyAmount(item.amount),
      kind: item.isInvoicePayment ? 'invoicePayment' : item.isCardCredit ? 'cardCredit' : item.cardId && item.type === 'expense' ? 'purchase' : item.type,
      targetBankAccountId: item.transferTargetBankId,
      groupId: item.installmentId, installment: item.installmentCurrent, installmentCount: item.installmentTotal,
      date: item.purchaseDate || item.date,
      warrantyUntil: item.warrantyUntil, reimbursement: item.isReimbursable ? item.reimbursementStatus : undefined,
      taxDeductionCategory: item.isTaxDeductible ? item.taxCategory : undefined,
      foreignCurrency: item.currencyCode, foreignAmountCents: legacyAmount(item.foreignAmount), exchangeRate: item.exchangeRate,
    }));
    const date = parseImportDate(string(backup.exportedAt)) || today();
    const family = mapObject(backup.family);
    records.tools = [
      ...safeArray(family.categorizationRules).map(item => ({
        id: item.id, kind: 'rule', pattern: item.keyword, category: item.category, createdAt: 0,
        matchMode: item.matchMode || 'contains', activityType: item.type || 'all',
      })),
      ...safeArray(family.quickTemplates).filter(item => item.type === 'expense' || item.type === 'income').map(item => ({
        id: item.id, kind: 'template', name: string(item.label, 80), createdAt: 0,
        content: `${item.type === 'income' ? 'Recebi ' : ''}${string(item.description)} R$ ${(legacyAmount(item.amount) / 100).toFixed(2).replace('.', ',')}`,
      })),
      ...safeArray(backup.transactions).filter(item => typeof item.receiptDataUrl === 'string').map(item => ({
        id: `receipt-${documentId(item.id)}`, kind: 'receipt', name: string(item.receiptName, 150) || 'Comprovante',
        mime: string(item.receiptDataUrl).match(/^data:([^;]+);base64,/)?.[1], dataUrl: item.receiptDataUrl,
        createdAt: Date.parse(string(item.createdAt)) || 0, entryId: item.id,
      })),
    ];
    records.planning = [
      ...safeArray(backup.goals).map(item => ({
        id: item.id, kind: 'goal', name: string(item.title, 80), amountCents: legacyAmount(item.targetAmount),
        savedCents: legacyAmount(item.currentAmount), emergency: item.isEmergencyFund === true,
        ...(parseImportDate(string(item.deadline)) ? { date: parseImportDate(string(item.deadline)) } : {}),
      })),
      ...safeArray(backup.categoryBudgets).filter(item => item.type !== 'income').map(item => ({
        id: item.id, kind: 'budget', name: string(item.categoryName, 80), amountCents: legacyAmount(item.budgetLimit), month: monthOf(date),
      })),
      ...safeArray(family.annualProvisions).map(item => ({
        id: item.id, kind: 'provision', name: string(item.title, 80), amountCents: legacyAmount(item.targetAmount),
        savedCents: legacyAmount(item.savedAmount), date: `${date.slice(0, 4)}-${String(item.dueMonth).padStart(2, '0')}-01`,
        paid: item.paidYear === Number(date.slice(0, 4)),
      })),
      ...safeArray(family.wishlistItems).map(item => ({
        id: item.id, kind: 'wish', name: string(item.title, 80), amountCents: legacyAmount(item.amount),
        createdAt: Date.parse(string(item.createdAt)) || 0, note: string(item.reason, 240),
        decision: item.status === 'purchased' ? 'bought' : item.status === 'skipped' ? 'skipped' : 'waiting',
      })),
      ...safeArray(family.salaryEnvelopes).map(item => ({
        id: item.id, kind: 'envelope', name: string(item.name, 80), percentBps: legacyAmount(item.percent),
        ...(documentId(item.linkedGoalId) ? { goalId: documentId(item.linkedGoalId) } : {}),
      })),
    ];
    records.assets = [
      ...safeArray(backup.investments).map(item => ({
        id: item.id, name: string(item.name, 100), kind: 'investment', category: string(item.category, 65), issuer: string(item.institution, 100),
        purchaseCents: legacyAmount(item.investedAmount), currentCents: legacyAmount(item.currentValue),
        dividendCents: legacyAmount(item.monthlyDividendAvg), dividendDay: 1, acquiredOn: parseImportDate(string(item.createdAt)) || date,
        maturityOn: parseImportDate(string(item.maturityDate)), note: string(item.notes, 1200), maintenance: [],
      })),
      ...safeArray(backup.familyAssets).map(item => ({
        id: item.id, name: string(item.name, 100), kind: ['property', 'vehicle'].includes(String(item.kind)) ? item.kind : 'other',
        category: string(item.brandModel, 65), issuer: '', purchaseCents: legacyAmount(item.purchaseValue),
        currentCents: legacyAmount(item.currentMarketValue), dividendCents: 0, dividendDay: 1,
        acquiredOn: parseImportDate(string(item.createdAt)) || date, maturityOn: '', note: string(item.notes, 1200),
        maintenance: safeArray(item.maintenanceLogs).map((log, index) => ({
          id: string(log.id, 80) || `item-${index}`, description: string(log.title, 160),
          date: parseImportDate(string(log.date)), costCents: legacyAmount(log.cost),
        })),
      })),
    ];
    if (typeof family.ipcaAnnualRate === 'number') {
      records.reportSettings = [{ id: 'settings', ...reportDefaults, annualIpcaPercent: family.ipcaAnnualRate }];
    }

  }
  for (const key of backupCollections) {
    records[key] = records[key].map(item => exportedDocument(key, documentId(item.id), item));
  }
  const total = Object.values(records).reduce((count, rows) => count + rows.length, 0);
  if (!total) throw new Error('O backup está vazio.');
  if (total > snapshotLimit) throw new Error('Para esta operação, use um arquivo com até 5.000 registros.');
  return { source: hub ? 'Hub' : 'FamíliaFin', records };
}

export interface RestoreStatus {
  verified: number;
  untouched: number;
  rejected: string[];
}

export async function restoreFinanceBackup(uid: string, preview: RestorePreview, finance: Finance): Promise<RestoreStatus> {
  const { records, source } = preview;
  const rejected: string[] = [];
  const results: RestoreStatus = { verified: 0, untouched: 0, rejected };
  const accounts = new Map(finance.accounts.map(account => [account.id, account.id]));
  const cards = new Map(finance.cards.map(card => [card.id, card.id]));
  const entryIds = new Map(finance.entries.map(item => [item.id, item.id]));
  const archivedAccounts: string[] = [];
  const archivedCards: string[] = [];
  const matched = (id: string, remaps: Map<string, string>, label: string) => {
    const value = remaps.get(id);
    if (!value) throw new Error(`${label} não encontrada no backup.`);
    return value;
  };
  const process = async (label: string, run: () => Promise<unknown>) => {
    try { await run(); results.verified++; }
    catch (cause) { rejected.push(`${label}: ${cause instanceof Error ? cause.message : 'Não foi possível restaurar.'}`); }
  };
  for (const item of records.accounts) {
    const id = documentId(item.id);
    const name = string(item.name, 80);
    if (accounts.has(id)) { results.untouched++; continue; }
    await process(name || 'Conta', async () => {
      if (!id) throw new Error('Identificador da conta inválido.');
      const data = normalizeAccount({
        name, bank: string(item.bank, 80),
        initialBalanceCents: cents(item.initialBalanceCents, -999_999_999_999),
        ...appearance(item), ...(isAccountType(item.accountType) ? { accountType: item.accountType } : {}),
      });
      const restoredId = await finance.saveAccount(data, undefined, `backup-${source}-${id}`);
      if (!restoredId) throw new Error('Não foi possível obter o identificador da conta.');
      accounts.set(id, restoredId);
      if (item.archived === true) archivedAccounts.push(restoredId);
    });
  }
  for (const item of records.cards) {
    const id = documentId(item.id);
    const name = string(item.name, 80);
    if (cards.has(id)) { results.untouched++; continue; }
    await process(name || 'Cartão', async () => {
      if (!id) throw new Error('Identificador do cartão inválido.');
      const linkedAccount = documentId(item.bankAccountId);
      const data = normalizeCard({
        name, bank: string(item.bank, 80), brand: string(item.brand, 30),
        lastDigits: string(item.lastDigits, 4),
        bankAccountId: linkedAccount ? matched(linkedAccount, accounts, 'Conta vinculada') : '',
        limitCents: cents(item.limitCents), closingDay: Number(item.closingDay), dueDay: Number(item.dueDay),
        virtual: item.virtual === true, ...appearance(item),
        ...(typeof item.monthlyLimitCents === 'number' ? { monthlyLimitCents: item.monthlyLimitCents } : {}),
        ...(typeof item.cashbackPercent === 'number' ? { cashbackPercent: item.cashbackPercent } : {}),
        ...(typeof item.pointsPerDollar === 'number' ? { pointsPerDollar: item.pointsPerDollar } : {}),
        ...(typeof item.rewardProgramName === 'string' ? { rewardProgramName: item.rewardProgramName } : {}),
      });
      const restoredId = await finance.saveCard(data, undefined, `backup-${source}-${id}`);
      if (!restoredId) throw new Error('Não foi possível obter o identificador do cartão.');
      cards.set(id, restoredId);
      if (item.archived === true) archivedCards.push(restoredId);
    });
  }

  const grouped = new Map<string, RecordValue[]>();
  const standalone: RecordValue[] = [];
  const historic: RecordValue[] = [];
  const credits: RecordValue[] = [];
  for (const item of records.entries) {
    if (item.deletedAt || entryIds.has(documentId(item.id))) { results.untouched++; continue; }
    if (item.kind === 'invoicePayment' || item.kind === 'adjustment') historic.push(item);
    else if (item.kind === 'cardCredit') credits.push(item);
    else if (item.kind === 'purchase' && documentId(item.groupId)) {
      const id = documentId(item.groupId);
      grouped.set(id, [...(grouped.get(id) ?? []), item]);
    } else standalone.push(item);
  }
  async function restoreEntry(item: RecordValue, installments = 1, groupKey?: string) {
    const id = documentId(item.id);
    if (!id) throw new Error('Identificador do lançamento inválido.');
    const kind = string(item.kind);
    if (kind !== 'income' && kind !== 'expense' && kind !== 'transfer' && kind !== 'purchase' && kind !== 'cardCredit') {
      throw new Error('Tipo de lançamento incompatível.');
    }
    const detail: EntryInput = {
      kind, description: string(item.description),
      date: parseImportDate(string(item.date)), amountCents: cents(item.amountCents, 1),
      status: item.status === 'pending' ? 'pending' : 'paid',
      category: string(item.category, 80),
      ...(Array.isArray(item.tags) ? { tags: item.tags.map(tag => string(tag, 40)).filter(Boolean).slice(0, 12) } : {}),
      ...(parseImportDate(string(item.warrantyUntil)) ? { warrantyUntil: parseImportDate(string(item.warrantyUntil)) } : {}),
      ...(item.reimbursement === 'pending' || item.reimbursement === 'received' ? { reimbursement: item.reimbursement } : {}),
      ...(TAX_DEDUCTION_CATEGORIES.some(value => value === item.taxDeductionCategory) ? { taxDeductionCategory: string(item.taxDeductionCategory) } : {}),
      ...((item.foreignCurrency === 'USD' || item.foreignCurrency === 'EUR' || item.foreignCurrency === 'GBP') &&
        typeof item.foreignAmountCents === 'number' && typeof item.exchangeRate === 'number'
        ? { foreignCurrency: item.foreignCurrency, foreignAmountCents: item.foreignAmountCents, exchangeRate: item.exchangeRate } : {}),
      externalId: `backup-${source}-${(groupKey ?? id)}`,
    };
    if (kind === 'purchase' || kind === 'cardCredit') {
      const cardId = documentId(item.cardId);
      detail.cardId = matched(cardId, cards, 'Cartão');
      const originalCard = finance.cards.find(card => card.id === detail.cardId)
        ?? records.cards.find(card => documentId(card.id) === cardId);
      const month = string(item.invoiceMonth, 7);
      if (month) {
        assertMonth(month);
        if (kind === 'purchase' && (!originalCard || getFirstInvoiceMonth(detail.date, Number(originalCard.closingDay), Number(originalCard.dueDay)) !== month)) {
          throw new Error('O fechamento atual do cartão mudaria a fatura original.');
        }
        if (kind === 'cardCredit') detail.invoiceMonth = month;
      }
    } else {
      detail.bankAccountId = matched(documentId(item.bankAccountId), accounts, 'Conta');
      if (kind === 'transfer') detail.targetBankAccountId = matched(documentId(item.targetBankAccountId), accounts, 'Conta de destino');
    }
    await finance.addEntry(detail, installments);
    const restored = await importDocumentId(detail.externalId);
    if (restored && !groupKey) entryIds.set(id, kind === 'purchase' ? `${restored}-1` : restored);
    return restored;
  }
  for (const item of standalone) await process(string(item.description) || 'Lançamento', () => restoreEntry(item));
  for (const [groupId, items] of grouped) {
    const sorted = [...items].sort((a, b) => Number(a.installment) - Number(b.installment));
    await process(string(sorted[0].description) || 'Compra parcelada', async () => {
      const amountCents = sorted.reduce((sum, item) => sum + cents(item.amountCents, 1), 0);
      const installments = Number(sorted[0].installmentCount) || sorted.length;
      if (installments !== sorted.length || splitInstallments(amountCents, installments).some((amount, index) => sorted[index].amountCents !== amount)) {
        throw new Error('Parcelas incompletas ou alteradas, confira a fatura original.');
      }
      const restored = await restoreEntry({ ...sorted[0], amountCents }, installments, groupId);
      if (restored) sorted.forEach((item, index) => entryIds.set(documentId(item.id), `${restored}-${index + 1}`));
      results.verified += sorted.length - 1;
    });
  }
  for (const item of credits) await process(string(item.description) || 'Crédito', () => restoreEntry(item));
  for (const item of historic) {
    await process(string(item.description) || 'Ajuste ou pagamento', async () => {
      if (item.kind === 'adjustment') throw new Error('Refaça a conciliação de saldo na conta restaurada.');
      const card = matched(documentId(item.cardId), cards, 'Cartão');
      const month = string(item.invoiceMonth, 7);
      assertMonth(month);
      const bank = matched(documentId(item.bankAccountId), accounts, 'Conta debitada');
      await finance.payInvoice(`${card}-${month}`, bank, parseImportDate(string(item.date)), cents(item.amountCents, 1));
      entryIds.set(documentId(item.id), `payment-${card}-${month}`);
    });
  }
  for (const item of records.recurrences) {
    const id = documentId(item.id);
    if (finance.recurrences.some(recurrence => recurrence.id === id)) { results.untouched++; continue; }
    await process(string(item.description) || 'Recorrência', async () => {
      if (!id) throw new Error('Identificador da recorrência inválido.');
      const kind = item.kind;
      const frequency = item.frequency;
      const type = item.type;
      if ((kind !== 'income' && kind !== 'expense' && kind !== 'purchase') ||
        (frequency !== 'weekly' && frequency !== 'monthly' && frequency !== 'yearly') ||
        (type !== 'recurring' && type !== 'subscription')) throw new Error('Modelo de recorrência incompatível.');
      const recurrence: RecurringEntryInput = {
        kind, type, frequency,
        description: string(item.description), amountCents: cents(item.amountCents, 1),
        startDate: parseImportDate(string(item.startDate)), category: string(item.category, 80),
        paused: item.paused === true,
        ...(item.endDate ? { endDate: parseImportDate(string(item.endDate)) } : {}),
        ...(kind === 'purchase' ? { cardId: matched(documentId(item.cardId), cards, 'Cartão') }
          : { bankAccountId: matched(documentId(item.bankAccountId), accounts, 'Conta') }),
      };
      await finance.saveRecurrence(normalizeRecurrence(recurrence), undefined, `backup-${source}-${id}`);
    });
  }
  for (const id of archivedAccounts) {
    try { await finance.archiveAccount(id); } catch { rejected.push('Não foi possível preservar o arquivamento de uma conta.'); }
  }
  for (const id of archivedCards) {
    try { await finance.archiveCard(id); } catch { rejected.push('Não foi possível preservar o arquivamento de um cartão.'); }
  }
  results.untouched += records.invoices.length + records.audit.length;

  for (const record of records.tools) {
    const { id, ...data } = exportedDocument('tools', documentId(record.id), record);
    if (!id) { rejected.push('Ferramenta: identificador inválido.'); continue; }
    const linkedEntry = entryIds.get(documentId(data.entryId));
    if (linkedEntry) data.entryId = linkedEntry;
    else delete data.entryId;
    if (data.kind === 'receipt' && (typeof data.dataUrl !== 'string' || typeof data.mime !== 'string' ||
      !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(data.mime) ||
      !data.dataUrl.startsWith(`data:${data.mime};base64,`) || data.dataUrl.length > 700_000)) {
      rejected.push(`${string(data.name) || 'Comprovante'}: formato ou tamanho incompatível.`);
      continue;
    }
    await process(string(data.pattern || data.name) || 'Ferramenta', () => createMissing(uid, 'tools', id, data, results));
  }

  // The server validates each extension document. Existing records are left in place.
  for (const key of ['planning', 'assets', 'reportSettings'] as const) {
    for (const record of records[key]) {
      const { id, ...data } = exportedDocument(key, documentId(record.id), record);
      if (!id) { rejected.push(`${key}: identificador inválido.`); continue; }
      const valid = key === 'planning' ? parsePlanItem({ ...data, id }) !== null
        : key === 'assets' ? validAsset(data) : id === 'settings' && validReportSettings(data);
      await process(string(data.name || data.title) || 'Configuração', async () => {
        if (!valid) throw new Error('Formato ou valor incompatível.');
        await createMissing(uid, key, id, data, results);
      });
    }
  }
  return results;
}

function createMissing(uid: string, collectionName: BackupCollection, id: string, data: RecordValue, result: RestoreStatus) {
  const ref = doc(db, 'personalFinance', uid, collectionName, id);
  return runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists()) transaction.set(ref, data);
    return current.exists();
  }).then(exists => {
    if (exists) { result.untouched++; result.verified--; }
  });
}

export function monthCsv(entries: LedgerEntry[]) {
  const labels: Record<LedgerEntry['kind'], string> = {
    income: 'Receita', expense: 'Despesa', transfer: 'Transferência', purchase: 'Compra no cartão',
    cardCredit: 'Crédito no cartão', adjustment: 'Conciliação', invoicePayment: 'Pagamento de fatura',
  };
  return entries.map(entry => [entry.date, entry.description, labels[entry.kind], entry.category ?? '', entry.amountCents,
    entry.status === 'pending' ? 'Pendente' : 'Registrado']);
}
