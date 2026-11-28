import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, ChartNoAxesCombined, House, Plus, RefreshCw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button } from '@shared/design-system';
import { getBankBalance, money, parseMoney, shiftMonth, today, type BankAccount, type LedgerEntry } from '../ledger';
import { importDocumentId, type usePersonalFinance } from '../usePersonalFinance';
import { assetKinds, type Asset, type Maintenance, type ReportSettings, type useAnalysisData } from './analysisData';
import { monthDay, monthDayCount, monthName, numberForInput, percent, reportControl, reportHeading, reportPanel, shortDate, simulateIndependence } from './analysisUtils';
import { authFetch } from '@/lib/authFetch';

const kindLabel: Record<Asset['kind'], string> = { investment: 'Investimento', property: 'Imóvel', vehicle: 'Veículo', other: 'Outro bem' };

type Data = ReturnType<typeof useAnalysisData>;

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-medium text-text-muted">{label}{children}</label>;
}

function MoneyField({ name, label, cents, required = true }: { name: string; label: string; cents?: number; required?: boolean }) {
  return <Field label={label}><input name={name} inputMode="decimal" placeholder="0,00" defaultValue={cents === undefined ? undefined : numberForInput(cents)} required={required} className={reportControl} /></Field>;
}

function amount(data: FormData, key: string, fallback?: number) {
  const raw = String(data.get(key) ?? '');
  if (!raw && fallback !== undefined) return fallback;
  const cents = parseMoney(raw);
  if (cents === null || cents < 0) throw new Error('Informe valores em reais maiores ou iguais a zero.');
  return cents;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

function AssetEditor({ asset, onSave, onClose }: {
  asset?: Asset;
  onSave: (asset: Omit<Asset, 'id' | 'maintenance'>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Asset['kind']>(asset?.kind ?? 'investment');
  const [busy, setBusy] = useState(false);
  const investment = kind === 'investment';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) ?? '').trim();
    setBusy(true);
    try {
      await onSave({
        name: field('name'), kind, category: field('category'), purchaseCents: amount(data, 'purchaseCents'),
        currentCents: amount(data, 'currentCents'), acquiredOn: field('acquiredOn'), note: field('note'),
        maturityOn: investment ? field('maturityOn') : '', issuer: investment ? field('issuer') : '',
        dividendCents: investment ? amount(data, 'dividendCents', 0) : 0,
        dividendDay: investment ? Number(field('dividendDay') || '1') : 1,
        ...(investment && field('ticker') ? {
          ticker: field('ticker').toUpperCase(), quantity: Number(field('quantity')),
          averageCostCents: amount(data, 'averageCostCents', 0),
        } : {}),
      }, asset?.id);
      toast.success(asset ? 'Bem atualizado.' : 'Bem cadastrado.');
      onClose();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={reportPanel + ' grid gap-4 p-4 sm:p-6'} onSubmit={submit}>
      <h3 className={reportHeading}>{asset ? 'Editar bem ou investimento' : 'Adicionar ao patrimônio'}</h3>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><input name="name" className={reportControl} required maxLength={100} defaultValue={asset?.name} /></Field>
        <Field label="Tipo"><select value={kind} name="kind" onChange={event => setKind(event.target.value as Asset['kind'])} className={reportControl}>
          {assetKinds.map(key => <option key={key} value={key}>{kindLabel[key]}</option>)}
        </select></Field>
        <Field label="Categoria"><input name="category" className={reportControl} maxLength={65} defaultValue={asset?.category} placeholder={investment ? 'Ex.: Renda fixa' : 'Ex.: Residencial'} /></Field>
        <Field label="Data de aquisição"><input name="acquiredOn" type="date" className={reportControl} defaultValue={asset?.acquiredOn ?? today()} required /></Field>
        <MoneyField name="purchaseCents" label="Valor de aquisição (R$)" cents={asset?.purchaseCents} />
        <MoneyField name="currentCents" label="Valor atual (R$)" cents={asset?.currentCents} />
        {investment && <>
          <Field label="Ticker (B3)"><input name="ticker" className={reportControl} maxLength={12} defaultValue={asset?.ticker} placeholder="Ex.: PETR4, HGLG11" /></Field>
          <Field label="Quantidade"><input name="quantity" type="number" min="0.000001" step="any" className={reportControl} defaultValue={asset?.quantity} placeholder="Ex.: 10" /></Field>
          <MoneyField name="averageCostCents" label="Preço médio por unidade (R$)" cents={asset?.averageCostCents} required={false} />
          <Field label="Instituição ou emissor"><input name="issuer" className={reportControl} maxLength={100} defaultValue={asset?.issuer} /></Field>
          <Field label="Data de vencimento"><input name="maturityOn" type="date" className={reportControl} defaultValue={asset?.maturityOn} /></Field>
          <MoneyField name="dividendCents" label="Provento mensal estimado (R$)" cents={asset?.dividendCents} required={false} />
          <Field label="Dia estimado do provento"><input name="dividendDay" type="number" min={1} max={31} className={reportControl} defaultValue={asset?.dividendDay ?? 1} /></Field>
        </>}
        <div className="sm:col-span-2"><Field label="Observações"><textarea name="note" rows={2} className={reportControl} maxLength={1200} defaultValue={asset?.note} /></Field></div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={busy}>Salvar</Button>
      </div>
    </form>
  );
}

function MaintenanceEditor({ asset, row, onSave, onClose }: {
  asset: Asset;
  row?: Maintenance;
  onSave: Data['saveMaintenance'];
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const description = String(data.get('description') ?? '').trim();
      if (!description) throw new Error('Informe a descrição da manutenção.');
      await onSave(asset.id, {
        id: row?.id ?? crypto.randomUUID(), description, date: String(data.get('date')),
        costCents: amount(data, 'costCents'),
      });
      toast.success('Manutenção registrada.');
      onClose();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-text-muted/15 bg-surface-bg p-3">
      <Field label="Descrição da manutenção"><input name="description" required maxLength={160} defaultValue={row?.description} className={reportControl} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data"><input name="date" type="date" required defaultValue={row?.date ?? today()} className={reportControl} /></Field>
        <MoneyField name="costCents" label="Custo (R$)" cents={row?.costCents} />
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button size="sm" type="submit" isLoading={busy}>Salvar manutenção</Button>
      </div>
    </form>
  );
}

function PostAssetMovement({ asset, row, month, accounts, entries, trash, addEntry }: {
  asset: Asset;
  row?: Maintenance;
  month: string;
  accounts: BankAccount[];
  entries: LedgerEntry[];
  trash: LedgerEntry[];
  addEntry: ReturnType<typeof usePersonalFinance>['addEntry'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const date = row?.date ?? monthDay(month, Math.min(asset.dividendDay, monthDayCount(month)));
  const cents = row?.costCents ?? asset.dividendCents;
  const description = row ? ('Manutenção · ' + asset.name + ' · ' + row.description).slice(0, 160) : ('Provento · ' + asset.name).slice(0, 160);
  const kind = row ? 'expense' : 'income';
  const active = accounts.filter(account => !account.archived);
  const externalId = row ? `patrimonio:manutencao:${asset.id}:${row.id}` : `patrimonio:provento:${asset.id}:${month}`;
  const [entryId, setEntryId] = useState<string>();
  useEffect(() => {
    let subscribed = true;
    void importDocumentId(externalId).then(id => { if (subscribed) setEntryId(id); });
    return () => { subscribed = false; };
  }, [externalId]);
  const posted = entries.some(item => item.id === entryId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || posted || !cents) return;
    const bankAccountId = String(new FormData(event.currentTarget).get('account'));
    setBusy(true);
    try {
      const status = date > today() ? 'pending' : 'paid';
      await addEntry({ amountCents: cents, kind, description, date, bankAccountId, status, externalId, category: row ? 'Manutenção' : 'Investimentos' });
      toast.success(status === 'pending' ? 'Movimentação prevista no extrato.' : 'Movimentação registrada no extrato.');
      setExpanded(false);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  }

  if (!cents) return null;
  if (posted) return <Badge variant="success">No extrato</Badge>;
  if (trash.some(item => item.id === entryId)) return <Badge variant="warning">Lançamento na lixeira</Badge>;
  if (!active.length) return null;
  return expanded ? (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="Conta"><select name="account" className={reportControl} required defaultValue="">
        <option value="">Selecione</option>
        {active.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select></Field>
      <Button size="sm" type="submit" isLoading={busy}>Confirmar</Button>
      <Button size="sm" type="button" variant="ghost" disabled={busy} onClick={() => setExpanded(false)}>Cancelar</Button>
    </form>
  ) : <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>{row ? 'Lançar despesa' : 'Lançar provento'}</Button>;
}

function AssetCard({ asset, data, edit, finance, month }: {
  asset: Asset;
  data: Data;
  edit: () => void;
  finance: ReturnType<typeof usePersonalFinance>;
  month: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null | undefined>(undefined);
  const investment = asset.kind === 'investment';
  const gain = asset.currentCents - asset.purchaseCents;
  const Icon = investment ? ChartNoAxesCombined : House;

  async function remove(row?: Maintenance) {
    if (working) return;
    setWorking(true);
    try {
      if (row) await data.saveMaintenance(asset.id, row, true);
      else await data.deleteAsset(asset.id);
      toast.success(row ? 'Manutenção excluída.' : 'Bem removido do patrimônio.');
      setConfirm('');
    } catch (error) {
      toast.error(message(error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <article className={reportPanel + ' grid min-w-0 content-start gap-3 p-4 sm:p-5'}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500/12 text-primary-500"><Icon size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-text-main">{asset.name}</h3>
          <p className="mt-0.5 text-xs text-text-muted">{[kindLabel[asset.kind], asset.category, asset.issuer].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-text-muted/10 bg-surface-bg p-3">
        <div><p className="text-xs text-text-muted">Valor atual</p><p className="mt-1 break-words text-base font-semibold tabular-nums text-text-main">{money(asset.currentCents)}</p></div>
        <div><p className="text-xs text-text-muted">Variação desde a compra</p><p className={'mt-1 flex items-center gap-1 text-sm font-semibold tabular-nums ' + (gain < 0 ? 'text-accent-error' : 'text-accent-success')}>
          {gain < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{money(gain)}
        </p></div>
      </div>
      {asset.maturityOn && <p className="flex items-center gap-2 text-sm text-text-muted"><CalendarClock size={16} /> Vencimento em {shortDate(asset.maturityOn)}</p>}
      {asset.note && <p className="break-words text-sm text-text-muted">{asset.note}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={edit}>Editar</Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}><Wrench size={13} className="mr-1" /> Manutenções</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm('asset')}>Excluir</Button>
      </div>
      {confirm === 'asset' && <div className="rounded-xl border border-accent-error/25 p-3 text-sm text-text-muted">
        Excluir {asset.name} e seu histórico de manutenções?
        <div className="mt-2 flex gap-2">
          <Button variant="danger" size="sm" onClick={() => void remove()} isLoading={working}>Confirmar exclusão</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm('')} disabled={working}>Cancelar</Button>
        </div>
      </div>}
      {expanded && <div className="border-t border-text-muted/15 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-main">Histórico de manutenções</p>
          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Adicionar</Button>
        </div>
        {editing !== undefined && <MaintenanceEditor key={editing?.id ?? 'new'} asset={asset} row={editing ?? undefined} onSave={data.saveMaintenance} onClose={() => setEditing(undefined)} />}
        {!asset.maintenance.length && <p className="mt-2 text-xs text-text-muted">Nenhuma manutenção registrada.</p>}
        {asset.maintenance.slice().sort((a, b) => b.date.localeCompare(a.date)).map(row => (
          <div key={row.id} className="mt-3 border-t border-text-muted/15 pt-3 text-sm">
            <p className="break-words font-medium text-text-main">{row.description}</p>
            <p className="mt-0.5 text-xs text-text-muted">{shortDate(row.date)} · {money(row.costCents)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Editar</Button>
              {confirm === row.id ? <><Button variant="danger" size="sm" onClick={() => void remove(row)} isLoading={working}>Confirmar exclusão</Button>
                <Button variant="ghost" size="sm" disabled={working} onClick={() => setConfirm('')}>Cancelar</Button></> :
                <Button variant="ghost" size="sm" onClick={() => setConfirm(row.id)}>Excluir</Button>}
              <PostAssetMovement asset={asset} month={month} row={row} accounts={finance.accounts} entries={finance.entries} trash={finance.trash} addEntry={finance.addEntry} />
            </div>
          </div>
        ))}
      </div>}
    </article>
  );
}

function Independence({ settings, onSave, invested }: { settings: ReportSettings; onSave: Data['saveSettings']; invested: number }) {
  const [busy, setBusy] = useState(false);
  const target = Math.round(settings.essentialExpenseCents * 12 / (settings.withdrawalPercent / 100));
  const progress = target > 0 ? Math.min(100, invested / target * 100) : 0;
  const months = simulateIndependence(invested, settings.monthlyContributionCents, settings.annualRealReturnPercent, target);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onSave({ essentialExpenseCents: amount(data, 'essentialExpenseCents'),
        monthlyContributionCents: amount(data, 'monthlyContributionCents'),
        annualRealReturnPercent: Number(data.get('annualRealReturnPercent')), withdrawalPercent: Number(data.get('withdrawalPercent')),
      });
      toast.success('Simulação atualizada.');
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={reportPanel + ' p-4 sm:p-6'}>
      <h3 className={reportHeading}>Independência financeira</h3>
      <p className="mt-1 text-sm text-text-muted">Estimativa com retorno real constante e retiradas anuais sobre o patrimônio investido.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-text-muted/15 bg-surface-bg p-4">
          <p className="text-xs text-text-muted">Patrimônio investido / meta</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text-main">{money(invested)} <span className="text-sm font-normal text-text-muted">/ {money(target)}</span></p>
          <progress className="mt-3 h-2 w-full accent-primary-500" max={100} value={progress} aria-label="Progresso da meta de independência" />
          <p className="mt-1 text-xs text-text-muted">
            {target === 0 ? 'Informe o gasto mensal para calcular a meta.' : months === null ? 'A meta não é atingida em até 100 anos com estes parâmetros.' :
              months === 0 ? 'Meta alcançada.' : `Prazo estimado de ${Math.floor(months / 12)} anos e ${months % 12} meses.`}
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-3 min-[440px]:grid-cols-2">
          <MoneyField name="essentialExpenseCents" label="Gasto mensal desejado (R$)" cents={settings.essentialExpenseCents} />
          <MoneyField name="monthlyContributionCents" label="Aporte mensal (R$)" cents={settings.monthlyContributionCents} />
          <Field label="Retorno real anual (%)"><input type="number" min={-30} max={40} step="0.1" name="annualRealReturnPercent" className={reportControl} defaultValue={settings.annualRealReturnPercent} required /></Field>
          <Field label="Taxa de retirada anual (%)"><input type="number" min={1} max={20} step="0.1" name="withdrawalPercent" className={reportControl} defaultValue={settings.withdrawalPercent} required /></Field>
          <div className="min-[440px]:col-span-2"><Button size="sm" isLoading={busy}>Simular</Button></div>
        </form>
      </div>
    </section>
  );
}

function NetWorth({ data, finance, month }: { data: Data; finance: ReturnType<typeof usePersonalFinance>; month: string }) {
  const [year, monthIndex] = month.split('-').map(Number);
  const span = Math.min(6, (year - 1900) * 12 + monthIndex);
  const paid = new Map(finance.invoices.map(invoice => [invoice.cardId + '/' + invoice.month, invoice.paidDate]));
  const rows = Array.from({ length: span }, (_, index) => {
    const period = shiftMonth(month, index - span + 1);
    const date = monthDay(period, monthDayCount(period));
    const bank = finance.accounts.reduce((sum, account) => sum + getBankBalance(account, finance.entries, date), 0);
    const assets = data.assets.reduce((sum, asset) => sum + (asset.acquiredOn <= date ? asset.currentCents : 0), 0);
    let creditDebt = 0;
    let bills = 0;
    for (const entry of finance.entries) {
      if (entry.date > date) continue;
      if (entry.kind === 'expense' && entry.status === 'pending') bills += entry.amountCents;
      if (entry.kind === 'purchase' || entry.kind === 'cardCredit') {
        const paidDate = paid.get(entry.cardId + '/' + entry.invoiceMonth);
        if (paidDate && paidDate <= date) continue;
        creditDebt += entry.kind === 'cardCredit' ? -entry.amountCents : entry.amountCents;
      }
    }
    const liabilities = bills + Math.max(0, creditDebt);
    return { period, label: monthName(period).slice(0, 3), bank, assets, liabilities, worth: bank + assets - liabilities };
  });
  const current = rows.at(-1);
  const previous = rows.at(-2);
  if (!current) return null;
  const change = previous ? current.worth - previous.worth : null;
  const renderCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  return (
    <section className={reportPanel + ' p-4 sm:p-6'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={reportHeading}>Patrimônio líquido estimado</h3>
          <p className="mt-1 text-xs text-text-muted">Histórico de saldos registrados e bens avaliados pelo valor atual, a partir da data de aquisição.</p>
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight tabular-nums text-text-main">{money(current.worth)}</p>
          {change !== null && change !== 0 && <p className={'mt-1 text-xs ' + (change > 0 ? 'text-accent-success' : 'text-accent-error')}>{change > 0 ? '+' : ''}{money(change)} no mês</p>}
        </div>
      </div>
      <dl className="mt-4 grid gap-2 min-[475px]:grid-cols-3">
        {([['Saldo nas contas', current.bank], ['Bens e investimentos', current.assets], ['Faturas e despesas bancárias pendentes', current.liabilities]] as const).map(([label, value]) => (
          <div className="rounded-xl border border-text-muted/15 bg-surface-bg p-3" key={label}>
            <dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-text-main">{money(value)}</dd>
          </div>
        ))}
      </dl>
      <div role="img" aria-label="Patrimônio líquido estimado nos últimos seis meses" className="mt-4 h-44 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={rows} margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke="var(--text-muted)" strokeOpacity={0.16} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis width={52} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={value => renderCompact.format(Number(value) / 100)} />
            <Tooltip formatter={value => money(Number(value))} contentStyle={{ color: 'var(--text-main)', background: 'var(--surface-elevated)' }} />
            <Area dataKey="worth" name="Patrimônio líquido estimado" stroke="var(--primary-500)" strokeWidth={2} fill="var(--primary-500)" fillOpacity={0.08} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function AssetsPanel({ data, finance, month }: { data: Data; finance: ReturnType<typeof usePersonalFinance>; month: string }) {
  const [editing, setEditing] = useState<Asset | null | undefined>(undefined);
  const [tab, setTab] = useState<'all' | 'investment' | 'property'>('all');
  const [updatingQuotes, setUpdatingQuotes] = useState(false);
  const quotedAssets = data.assets.filter(asset => asset.kind === 'investment' && asset.ticker && asset.quantity);
  async function refreshQuotes() {
    if (updatingQuotes || !quotedAssets.length) return;
    setUpdatingQuotes(true);
    let updated = 0;
    try {
      for (const asset of quotedAssets) {
        const response = await authFetch(`/api/system_handler?action=market-quote&ticker=${encodeURIComponent(asset.ticker!)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível consultar as cotações.');
        const { id, maintenance: _maintenance, ...savedAsset } = asset;
        await data.saveAsset({
          ...savedAsset, quotePriceCents: payload.priceCents, quoteChangePercent: payload.changePercent,
          quoteUpdatedAt: payload.updatedAt, currentCents: Math.round(asset.quantity! * payload.priceCents),
        }, id);
        updated++;
      }
      toast.success(`${updated} ${updated === 1 ? 'cotação atualizada' : 'cotações atualizadas'}.`);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setUpdatingQuotes(false);
    }
  }
  const invested = data.assets.filter(asset => asset.kind === 'investment').reduce((total, asset) => total + asset.currentCents, 0);
  const total = data.assets.reduce((sum, asset) => sum + asset.currentCents, 0);
  const shown = data.assets.filter(asset => tab === 'all' || (tab === 'investment' ? asset.kind === 'investment' : asset.kind !== 'investment'));
  const variations = new Map<string, number>();
  for (const asset of data.assets) variations.set(kindLabel[asset.kind], (variations.get(kindLabel[asset.kind]) ?? 0) + asset.currentCents);
  const now = today();
  const cutoff = new Date(now + 'T00:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate() + 90);
  const due = data.assets.filter(asset => asset.maturityOn >= now && asset.maturityOn <= cutoff.toISOString().slice(0, 10))
    .sort((a, b) => a.maturityOn.localeCompare(b.maturityOn));
  const yields = data.assets.filter(asset => asset.dividendCents > 0 && asset.acquiredOn <= monthDay(month, monthDayCount(month))
    && (!asset.maturityOn || asset.maturityOn >= month + '-01'));

  return (
    <div className="min-w-0 space-y-5">
      <section className={reportPanel + ' p-4 sm:p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-text-main">Patrimônio e investimentos</h2>
            <p className="mt-1 text-sm text-text-muted">Acompanhe seus bens e posições de investimento em um só lugar.</p></div>
          <div className="flex flex-wrap gap-2">
            {quotedAssets.length > 0 && <Button size="sm" variant="secondary" className="gap-1.5" disabled={updatingQuotes} onClick={refreshQuotes}><RefreshCw size={15} className={updatingQuotes ? 'animate-spin' : ''} /> Atualizar cotações</Button>}
            <Button size="sm" className="gap-1.5" onClick={() => setEditing(null)}><Plus size={16} /> Adicionar patrimônio</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-text-muted/15 bg-surface-bg p-4">
            <p className="text-xs text-text-muted">Valor de bens e investimentos</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-text-main">{money(total)}</p>
          </div>
          <div className="grid content-center gap-2">
            {[...variations].map(([label, value]) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-text-muted">{label}</span><span className="font-medium text-text-main">{money(value)} · {percent(total ? value / total * 100 : 0)}</span>
            </div>)}
            {!variations.size && <p className="text-sm text-text-muted">Cadastre o primeiro bem para acompanhar a composição.</p>}
          </div>
        </div>
      </section>
      {editing !== undefined && <AssetEditor key={editing?.id ?? 'new'} asset={editing ?? undefined} onSave={data.saveAsset} onClose={() => setEditing(undefined)} />}
      {quotedAssets.length > 0 && <section className={reportPanel + ' p-4 sm:p-5'}>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className={reportHeading}>Carteira de investimentos</h3>
          <p className="mt-1 text-xs text-text-muted">Cotações B3 com atraso da fonte gratuita; atualize manualmente quando quiser.</p></div>
          <span className="text-xs text-text-muted">Cache de 30 min · limite mensal protegido</span></div>
        <div className="mt-3 divide-y divide-text-muted/15">{quotedAssets.map(asset => {
          const result = asset.quotePriceCents && asset.quantity ? Math.round(asset.quotePriceCents * asset.quantity) : undefined;
          const dailyChange = asset.quoteChangePercent;
          const previousValue = result !== undefined && dailyChange !== undefined && dailyChange > -100
            ? result / (1 + dailyChange / 100)
            : undefined;
          const dayGain = result !== undefined && previousValue !== undefined ? result - previousValue : undefined;
          const costBasis = asset.averageCostCents && asset.quantity ? Math.round(asset.averageCostCents * asset.quantity) : undefined;
          const totalGain = result !== undefined && costBasis !== undefined ? result - costBasis : undefined;
          const updatedAt = asset.quoteUpdatedAt ? new Date(asset.quoteUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Ainda sem cotação';
          return <div className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5" key={asset.id}>
            <div><p className="font-medium text-text-main">{asset.ticker} <span className="font-normal text-text-muted">· {asset.name}</span></p><p className="text-xs text-text-muted">{asset.quantity} unidades · {updatedAt}</p></div>
            <div className="text-sm text-text-main">{result === undefined ? 'Sem cotação' : <>{money(result)}{totalGain !== undefined && <p className={'text-xs ' + (totalGain >= 0 ? 'text-emerald-500' : 'text-rose-500')}>Total: {totalGain >= 0 ? '+' : ''}{money(totalGain)}</p>}</>}</div>
            <div className={'text-sm font-medium tabular-nums ' + ((dayGain ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {asset.quoteChangePercent === undefined ? '—' : `${asset.quoteChangePercent >= 0 ? '+' : ''}${asset.quoteChangePercent.toFixed(2)}% · ${money(Math.round(dayGain ?? 0))}`}
            </div>
          </div>;
        })}</div>
      </section>}
      {data.assets.length > 0 && <div className="flex flex-wrap gap-1.5">
        {([['all', 'Todos'], ['investment', 'Investimentos'], ['property', 'Bens']] as const).map(([value, label]) =>
          <Button size="sm" key={value} variant={tab === value ? 'secondary' : 'ghost'} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</Button>)}
      </div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(asset => <AssetCard key={asset.id} asset={asset} data={data} finance={finance} month={month} edit={() => setEditing(asset)} />)}
      </div>
      {(due.length > 0 || yields.length > 0) && <div className="grid gap-4 lg:grid-cols-2">
        {due.length > 0 && <section className={reportPanel + ' p-4'}>
          <h3 className={reportHeading}>Vencimentos em 90 dias</h3>
          <ul className="mt-2 divide-y divide-text-muted/15">{due.map(asset => (
            <li className="flex flex-wrap justify-between gap-2 py-2 text-sm" key={asset.id}><span className="break-words text-text-main">{asset.name}</span><span className="text-text-muted">{shortDate(asset.maturityOn)}</span></li>
          ))}</ul>
        </section>}
        {yields.length > 0 && <section className={reportPanel + ' p-4'}>
          <h3 className={reportHeading + ' flex items-center gap-2'}><Banknote size={17} className="text-primary-500" /> Proventos previstos no mês</h3>
          <ul className="mt-2 divide-y divide-text-muted/15">{yields.map(asset => (
            <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={asset.id}>
              <span className="text-text-main">{asset.name} · {money(asset.dividendCents)}</span>
              <PostAssetMovement asset={asset} month={month} accounts={finance.accounts} entries={finance.entries} trash={finance.trash} addEntry={finance.addEntry} />
            </li>
          ))}</ul>
        </section>}
      </div>}
      <NetWorth data={data} finance={finance} month={month} />
      <Independence settings={data.settings} onSave={data.saveSettings} invested={invested} />
    </div>
  );
}
