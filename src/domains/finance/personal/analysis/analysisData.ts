import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assertDate, MAX_AMOUNT_CENTS } from '../ledger';

export const assetKinds = ['investment', 'property', 'vehicle', 'other'] as const;

export interface Maintenance {
  id: string;
  date: string;
  description: string;
  costCents: number;
}

export interface Asset {
  id: string;
  name: string;
  kind: typeof assetKinds[number];
  category: string;
  purchaseCents: number;
  currentCents: number;
  acquiredOn: string;
  note: string;
  maturityOn: string;
  issuer: string;
  dividendCents: number;
  dividendDay: number;
  maintenance: Maintenance[];
  ticker?: string;
  quantity?: number;
  averageCostCents?: number;
  quotePriceCents?: number;
  quoteChangePercent?: number;
  quoteUpdatedAt?: string;
}

export interface ReportSettings {
  annualIpcaPercent: number;
  essentialExpenseCents: number;
  monthlyContributionCents: number;
  annualRealReturnPercent: number;
  withdrawalPercent: number;
}

export const reportDefaults: ReportSettings = {
  annualIpcaPercent: 4.5,
  essentialExpenseCents: 0,
  monthlyContributionCents: 0,
  annualRealReturnPercent: 5,
  withdrawalPercent: 4,
};

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, max: number) {
  return typeof value === 'string' && value.length <= max;
}

function boolMoney(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_CENTS;
}

function day(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31;
}

function date(value: unknown, optional = false) {
  if (optional && value === '') return true;
  if (typeof value !== 'string') return false;
  try {
    assertDate(value);
    return true;
  } catch {
    return false;
  }
}

function validMaintenance(value: unknown): value is Maintenance {
  const row = object(value);
  return !!row && text(row.id, 80) && date(row.date) && text(row.description, 160) && boolMoney(row.costCents);
}

export function validAsset(value: unknown): value is Omit<Asset, 'id'> {
  const row = object(value);
  const validOptionalNumber = (key: string, min: number, max: number) => row?.[key] === undefined || rate(row[key], min, max);
  const validOptionalMoney = (key: string) => row?.[key] === undefined || boolMoney(row[key]);
  return !!row && text(row.name, 100) && !!String(row.name).trim() && (assetKinds as readonly unknown[]).includes(row.kind) &&
    text(row.category, 65) && boolMoney(row.purchaseCents) && boolMoney(row.currentCents) &&
    date(row.acquiredOn) && date(row.maturityOn, true) && text(row.note, 1200) &&
    text(row.issuer, 100) && boolMoney(row.dividendCents) && day(row.dividendDay) &&
    Array.isArray(row.maintenance) && row.maintenance.length <= 250 && row.maintenance.every(validMaintenance) &&
    (row.ticker === undefined || (typeof row.ticker === 'string' && /^[A-Z0-9.]{1,12}$/.test(row.ticker))) &&
    validOptionalNumber('quantity', 0.000001, 1_000_000_000) && validOptionalMoney('averageCostCents') &&
    validOptionalMoney('quotePriceCents') && validOptionalNumber('quoteChangePercent', -100, 10000) &&
    (row.quoteUpdatedAt === undefined || (typeof row.quoteUpdatedAt === 'string' && Number.isFinite(Date.parse(row.quoteUpdatedAt))));
}

function rate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function validReportSettings(value: unknown): value is ReportSettings {
  const row = object(value);
  return !!row && rate(row.annualIpcaPercent, -20, 300) && boolMoney(row.essentialExpenseCents) &&
    boolMoney(row.monthlyContributionCents) && rate(row.annualRealReturnPercent, -30, 40) &&
    rate(row.withdrawalPercent, 1, 20);
}

export function useAnalysisData(uid: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [settings, setSettings] = useState<ReportSettings>(reportDefaults);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [error, setError] = useState('');
  const assetsCollection = () => collection(db, 'personalFinance', uid, 'assets');
  const settingsDocument = () => doc(db, 'personalFinance', uid, 'reportSettings', 'settings');

  useEffect(() => {
    const stopAssets = onSnapshot(collection(db, 'personalFinance', uid, 'assets'), snapshot => {
      setAssets(snapshot.docs.flatMap(item => {
        const value = item.data();
        return validAsset(value) ? [{ ...value, id: item.id }] : [];
      }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setAssetsLoaded(true);
    }, () => setError('Não foi possível carregar o patrimônio.'));
    const stopSettings = onSnapshot(doc(db, 'personalFinance', uid, 'reportSettings', 'settings'), snapshot => {
      const value = snapshot.data();
      setSettings(validReportSettings(value) ? value : reportDefaults);
      setSettingsLoaded(true);
    }, () => setError('Não foi possível carregar as preferências dos relatórios.'));
    return () => { stopAssets(); stopSettings(); };
  }, [uid]);

  async function saveAsset(asset: Omit<Asset, 'id' | 'maintenance'>, id?: string) {
    const target = id ? doc(assetsCollection(), id) : doc(assetsCollection());
    if (!validAsset({ ...asset, maintenance: [] })) throw new Error('Confira os dados e valores do bem.');
    if (!id) {
      await setDoc(target, { ...asset, maintenance: [] });
      return;
    }
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(target);
      const value = snapshot.data();
      if (!validAsset(value)) throw new Error('Este bem não está mais disponível.');
      transaction.set(target, { ...asset, maintenance: value.maintenance });
    });
  }

  async function saveMaintenance(assetId: string, maintenance: Maintenance, remove = false) {
    if (!validMaintenance(maintenance)) throw new Error('Confira a data e o custo da manutenção.');
    const target = doc(assetsCollection(), assetId);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(target);
      const value = snapshot.data();
      if (!validAsset(value)) throw new Error('Este bem não está mais disponível.');
      const next = value.maintenance.filter(row => row.id !== maintenance.id);
      if (!remove) next.push(maintenance);
      if (next.length > 250) throw new Error('Este bem já tem 250 manutenções cadastradas.');
      transaction.update(target, { maintenance: next });
    });
  }

  async function saveSettings(changes: Partial<ReportSettings>) {
    const ref = settingsDocument();
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.data();
      const next = { ...(validReportSettings(current) ? current : reportDefaults), ...changes };
      if (!validReportSettings(next)) throw new Error('Confira os valores e percentuais informados.');
      transaction.set(ref, next);
    });
  }

  return {
    assets, settings, error, loading: !assetsLoaded || !settingsLoaded,
    saveAsset, saveMaintenance, saveSettings, deleteAsset: (id: string) => deleteDoc(doc(assetsCollection(), id)),
  };
}
