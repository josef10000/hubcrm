import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, BriefcaseBusiness, Download, FileText, Scale, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@shared/design-system';
import { getEntryMonth, getMonthlySummary, money, shiftMonth, today, type LedgerEntry } from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import { useAnalysisData, type ReportSettings } from './analysisData';
import {
  annualSummary, csvMoney, exportCsv, monthDay, monthDayCount, monthName, percent, reportControl, reportHeading, reportPanel, shortDate,
} from './analysisUtils';
import AssetsPanel from './AssetsPanel';

interface AnalysisProps {
  uid: string;
  finance: ReturnType<typeof usePersonalFinance>;
  month: string;
}
type Tab = 'monthly' | 'annual' | 'insight' | 'patrimony' | 'tax';
type TaxRow = { id: string; date: string; description: string; category: string; amount: number };

const tabs = [
  { id: 'monthly', label: 'Mensal', icon: BarChart3 },
  { id: 'annual', label: 'Anual', icon: TrendingUp },
  { id: 'insight', label: 'Diagnóstico', icon: Scale },
  { id: 'patrimony', label: 'Patrimônio', icon: BriefcaseBusiness },
  { id: 'tax', label: 'IRPF', icon: FileText },
] as const;

const numberCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

interface CategoryTotal { name: string; amount: number }

function splitCategories(entries: LedgerEntry[], month: string) {
  const expenses = new Map<string, number>();
  const incomes = new Map<string, number>();
  for (const entry of entries) {
    if (getEntryMonth(entry) !== month) continue;
    if (entry.kind !== 'income' && entry.kind !== 'purchase' && entry.kind !== 'expense' && entry.kind !== 'cardCredit') continue;
    const target = entry.kind === 'income' ? incomes : expenses;
    const label = entry.category?.trim() || (entry.kind === 'cardCredit' ? 'Créditos no cartão' : 'Sem categoria');
    target.set(label, (target.get(label) || 0) + (entry.kind === 'cardCredit' ? -entry.amountCents : entry.amountCents));
  }
  const order = (items: Map<string, number>): CategoryTotal[] => [...items].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  return { incomes: order(incomes), expenses: order(expenses) };
}

function CategoryReport({ items, title, color }: { items: CategoryTotal[]; title: string; color: string }) {
  const positives = items.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
  return (
    <section className={reportPanel + ' p-4 sm:p-5'}>
      <h3 className={reportHeading}>{title}</h3>
      {!items.length ? <p className="py-5 text-sm text-text-muted">Sem lançamentos para este período.</p> :
        <ul className="mt-3 grid gap-3">
          {items.map(row => (
            <li className="grid gap-1.5" key={row.name}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 break-words text-text-muted">{row.name}</span>
                <strong className="whitespace-nowrap tabular-nums text-text-main">{money(row.amount)}</strong>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-text-muted/14" aria-hidden="true">
                <span className={'block h-full rounded-full ' + color} style={{ width: (positives > 0 ? Math.max(0, row.amount / positives * 100) : 0) + '%' }} />
              </div>
            </li>
          ))}
        </ul>}
    </section>
  );
}

function Monthly({ entries, month }: { entries: LedgerEntry[]; month: string }) {
  const current = getMonthlySummary(month, entries);
  const previousMonth = month === '1900-01' ? null : shiftMonth(month, -1);
  const previous = previousMonth ? getMonthlySummary(previousMonth, entries) : null;
  const categories = splitCategories(entries, month);
  const diff = previous ? current.netCents - previous.netCents : 0;
  const indicators = [
    { label: 'Receitas', value: current.incomeCents, icon: ArrowDownLeft, color: 'text-accent-success' },
    { label: 'Despesas líquidas', value: current.expenseCents, icon: ArrowUpRight, color: 'text-primary-500' },
    { label: 'Resultado', value: current.netCents, icon: Scale, color: 'text-text-main' },
  ];
  return (
    <div className="min-w-0 space-y-4">
      <section className={reportPanel + ' p-4 sm:p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-text-main">Relatório mensal</h2>
            <p className="mt-1 text-sm text-text-muted">
              {monthName(month)} de {month.slice(0, 4)} · competência dos lançamentos, incluindo valores previstos
            </p></div>
          <Button variant="secondary" size="sm" className="gap-1.5" disabled={!categories.incomes.length && !categories.expenses.length}
            onClick={() => exportCsv('relatorio-' + month + '.csv', [
              ['Tipo', 'Categoria', 'Valor (R$)'],
              ...categories.incomes.map(item => ['Receita', item.name, csvMoney(item.amount)]),
              ...categories.expenses.map(item => ['Despesa líquida', item.name, csvMoney(item.amount)]),
            ])}><Download size={15} /> CSV</Button>
        </div>
        <dl className="mt-4 grid gap-3 min-[540px]:grid-cols-3">
          {indicators.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-text-muted/15 bg-surface-bg p-3.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-text-muted"><Icon className={color} size={15} aria-hidden="true" />{label}</dt>
              <dd className={'mt-1 text-lg font-semibold tabular-nums ' + color}>{money(value)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
          {previous && diff !== 0 && <span className={diff > 0 ? 'text-accent-success' : 'text-accent-error'}>{diff > 0 ? 'Melhora' : 'Redução'} de {money(Math.abs(diff))} no resultado em relação ao mês anterior</span>}
          {current.pendingIncomeCents > 0 && <span>{money(current.pendingIncomeCents)} de receitas pendentes</span>}
          {current.pendingExpenseCents > 0 && <span>{money(current.pendingExpenseCents)} de despesas bancárias pendentes</span>}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryReport items={categories.expenses} title="Despesas por categoria" color="bg-primary-500" />
        <CategoryReport items={categories.incomes} title="Receitas por categoria" color="bg-accent-success" />
      </div>
    </div>
  );
}

function SpendingHeatmap({ year, entries }: { year: string; entries: LedgerEntry[] }) {
  const now = today();
  const { dates, daily, max, total, freeDays } = useMemo(() => {
    const daily = new Map<string, number>();
    for (const entry of entries) {
      if (entry.kind !== 'purchase' && (entry.kind !== 'expense' || entry.status === 'pending')) continue;
      // A parcel purchase is charged to its due date in the reports.
      const date = entry.kind === 'purchase' ? entry.invoiceDueDate || entry.date : entry.date;
      if (!date.startsWith(year + '-') || date > now) continue;
      daily.set(date, (daily.get(date) || 0) + entry.amountCents);
    }
    const dates = Array.from({ length: 12 }, (_, index) => {
      const month = year + '-' + String(index + 1).padStart(2, '0');
      return { month, days: Array.from({ length: monthDayCount(month) }, (_, day) => monthDay(month, day + 1)) };
    });
    const max = Math.max(1, ...daily.values());
    const total = [...daily.values()].reduce((sum, value) => sum + value, 0);
    const freeDays = dates.flatMap(item => item.days).filter(date => date <= now && !daily.has(date)).length;
    return { dates, daily, max, total, freeDays };
  }, [entries, now, year]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected?.startsWith(year + '-') ? selected : null;
  const focusDate = active ?? year + '-01-01';

  return (
    <section className={reportPanel + ' p-4 sm:p-6'} aria-labelledby="annual-spending-heatmap-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="annual-spending-heatmap-title" className={reportHeading}>Mapa anual de gastos</h3>
          <p className="mt-1 text-xs text-text-muted">Selecione um dia para consultar os gastos. Compras no cartão aparecem no vencimento da parcela.</p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-text-main">{money(total)} até hoje</p>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <div data-spending-calendar className="grid min-w-[47rem] grid-cols-12 gap-2">
          {dates.map(({ month, days }) => (
            <div className="min-w-0" key={month}>
              <p className="mb-1 text-center text-[11px] first-letter:uppercase text-text-muted">{monthName(month).slice(0, 3)}</p>
              <div className="grid grid-cols-5 gap-[3px]">
                {days.map(date => {
                  const amount = daily.get(date) || 0;
                  const background = amount ? `color-mix(in srgb, var(--primary-500) ${Math.max(22, amount / max * 100)}%, transparent)` : 'color-mix(in srgb, var(--text-muted) 13%, transparent)';
                  return <button key={date} type="button" data-date={date} aria-label={shortDate(date) + ' · ' + money(amount)} aria-pressed={active === date}
                    disabled={date > now} title={shortDate(date) + ' · ' + money(amount)} onClick={() => setSelected(date)}
                    tabIndex={focusDate === date ? 0 : -1}
                    onKeyDown={event => {
                      const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[event.key];
                      if (offset === undefined) return;
                      const target = new Date(date + 'T00:00:00Z');
                      target.setUTCDate(target.getUTCDate() + offset);
                      const next = target.toISOString().slice(0, 10);
                      if (!next.startsWith(year + '-') || next > now) return;
                      event.preventDefault();
                      setSelected(next);
                      event.currentTarget.closest('[data-spending-calendar]')?.querySelector<HTMLButtonElement>('[data-date="' + next + '"]')?.focus();
                    }}
                    style={{ background }}
                    className={'aspect-square min-w-0 rounded-[3px] focus-visible:outline-2 focus-visible:outline-primary-500 disabled:opacity-35 ' + (active === date ? 'outline-1 outline-text-main' : '')} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-text-muted">
        <span>{freeDays} {freeDays === 1 ? 'dia sem despesas' : 'dias sem despesas'} registradas</span>
        <span role="status">{active ? shortDate(active) + ' · ' + money(daily.get(active) || 0) : 'A cor indica a intensidade dos gastos.'}</span>
      </div>
    </section>
  );
}

function Annual({ entries, year }: { entries: LedgerEntry[]; year: string }) {
  const points = useMemo(() => annualSummary(year, entries), [year, entries]);
  const income = points.reduce((sum, item) => sum + item.incomeCents, 0);
  const expense = points.reduce((sum, item) => sum + item.expenseCents, 0);
  return (
    <div className="min-w-0 space-y-4">
      <section className={reportPanel + ' p-4 sm:p-6'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Consolidado anual</h2>
          <p className="mt-1 text-sm text-text-muted">{year} · {money(income)} em receitas · {money(expense)} em despesas líquidas</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => exportCsv('consolidado-' + year + '.csv', [
          ['Mês', 'Receitas (R$)', 'Despesas líquidas (R$)', 'Resultado (R$)'],
          ...points.map(item => [item.month, csvMoney(item.incomeCents), csvMoney(item.expenseCents), csvMoney(item.netCents)]),
        ])}><Download size={15} /> CSV</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-accent-success" /> Receitas</span>
        <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary-500" /> Despesas líquidas</span>
      </div>
      <div className="mt-3 h-56 min-w-0" role="img" aria-label={'Receitas e despesas por mês em ' + year}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={points} margin={{ left: 0, right: 8, top: 5 }}>
            <CartesianGrid stroke="var(--text-muted)" strokeOpacity={0.14} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={8} />
            <YAxis width={54} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={value => numberCompact.format(Number(value) / 100)} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => money(Number(value))} contentStyle={{ color: 'var(--text-main)', background: 'var(--surface-elevated)', borderColor: 'var(--text-muted)' }} />
            <Bar name="Receitas" dataKey="incomeCents" fill="var(--color-success)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar name="Despesas líquidas" dataKey="expenseCents" fill="var(--primary-500)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-96 text-left text-sm tabular-nums">
          <thead className="border-b border-text-muted/15 text-xs text-text-muted"><tr>
            <th scope="col" className="py-2">Mês</th><th scope="col" className="py-2 text-right">Receitas</th><th scope="col" className="py-2 text-right">Despesas</th><th scope="col" className="py-2 text-right">Resultado</th>
          </tr></thead>
          <tbody className="divide-y divide-text-muted/10">
            {points.map(item => <tr className="text-text-main" key={item.month}>
              <th scope="row" className="py-2 font-medium first-letter:uppercase">{monthName(item.month)}</th>
              <td className="py-2 text-right">{money(item.incomeCents)}</td><td className="py-2 text-right">{money(item.expenseCents)}</td><td className="py-2 text-right">{money(item.netCents)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      </section>
      <SpendingHeatmap year={year} entries={entries} />
    </div>
  );
}

function Diagnostics({ entries, month, settings, save }: {
  entries: LedgerEntry[]; month: string; settings: ReportSettings; save: (changes: Partial<ReportSettings>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const current = getMonthlySummary(month, entries);
  const categories = splitCategories(entries, month).expenses;
  const essential = categories.filter(row => /aluguel|moradia|mercado|alimentacao|saude|agua|luz|energia|transporte|escola|educacao|imposto|essencial/.test(
    row.name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, ''),
  )).reduce((total, row) => total + row.amount, 0);
  const lastThree = month >= '1900-06' ? [0, -1, -2].reduce((sum, offset) => sum + getMonthlySummary(shiftMonth(month, offset), entries).expenseCents, 0) : 0;
  const priorThree = month >= '1900-06' ? [-3, -4, -5].reduce((sum, offset) => sum + getMonthlySummary(shiftMonth(month, offset), entries).expenseCents, 0) : 0;
  const personalRate = priorThree > 0 && lastThree > 0 ? (lastThree / priorThree - 1) * 100 : null;
  const comparableIpca = ((1 + settings.annualIpcaPercent / 100) ** (3 / 12) - 1) * 100;
  const guide = [
    { label: 'Gastos essenciais', target: 50, amount: essential },
    { label: 'Outras despesas', target: 30, amount: Math.max(0, current.expenseCents - essential) },
    { label: 'Disponível para guardar', target: 20, amount: Math.max(0, current.netCents) },
  ];

  async function updateIpca(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await save({ annualIpcaPercent: Number(data.get('annualIpcaPercent')) });
      toast.success('Referência de IPCA atualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a referência.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={reportPanel + ' p-4 sm:p-5'}>
        <h2 className={reportHeading}>Diagnóstico 50/30/20</h2>
        <p className="mt-1 text-sm text-text-muted">Comparação do mês com a regra de referência. As categorias dos lançamentos estimam os gastos essenciais.</p>
        <dl className="mt-5 grid gap-4">
          {guide.map(item => {
            const ratio = current.incomeCents > 0 ? item.amount / current.incomeCents * 100 : null;
            return <div key={item.label} className="grid gap-1.5">
              <dt className="flex items-center justify-between gap-2 text-sm text-text-main"><span>{item.label}</span><span className="text-xs text-text-muted">Referência {item.target}%</span></dt>
              <dd>
                <div className="relative h-2 rounded-full bg-text-muted/15" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary-500" style={{ width: Math.min(100, Math.max(0, ratio || 0)) + '%' }} />
                  <i className="absolute top-0 h-full w-0.5 bg-text-main" style={{ left: item.target + '%' }} />
                </div>
                <p className="mt-1 text-xs text-text-muted">{money(item.amount)}{ratio === null ? '' : ' · ' + percent(ratio) + ' da renda'}</p>
              </dd>
            </div>;
          })}
        </dl>
        {!current.incomeCents && <p className="mt-4 text-xs text-text-muted">Registre suas receitas para calcular a proporção da renda.</p>}
      </section>
      <section className={reportPanel + ' p-4 sm:p-5'}>
        <h2 className={reportHeading}>Custo de vida e IPCA</h2>
        <p className="mt-1 text-sm text-text-muted">Compara o gasto dos últimos três meses com o trimestre anterior. Mudanças de consumo influenciam essa variação.</p>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-text-muted/15 bg-surface-bg p-3">
            <dt className="text-xs text-text-muted">Variação dos gastos</dt><dd className="mt-1 text-lg font-semibold text-text-main">{personalRate === null ? '—' : percent(personalRate)}</dd>
          </div>
          <div className="rounded-xl border border-text-muted/15 bg-surface-bg p-3">
            <dt className="text-xs text-text-muted">IPCA de referência em 3 meses</dt><dd className="mt-1 text-lg font-semibold text-text-main">{percent(comparableIpca)}</dd>
          </div>
        </dl>
        {personalRate === null && <p className="mt-3 text-xs text-text-muted">Registre despesas nos dois trimestres para calcular a variação.</p>}
        <form onSubmit={updateIpca} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="grid min-w-36 max-w-full gap-1 text-xs font-medium text-text-muted">IPCA anual de referência (%)
            <input type="number" name="annualIpcaPercent" min={-20} max={300} step="0.01" className={reportControl} defaultValue={settings.annualIpcaPercent} required />
          </label>
          <Button size="sm" type="submit" isLoading={busy}>Atualizar referência</Button>
        </form>
      </section>
    </div>
  );
}

function TaxReport({ finance, year }: { finance: AnalysisProps['finance']; year: string }) {
  const paidInvoices = new Map(finance.invoices.filter(item => item.paidDate).map(item => [item.cardId + '/' + item.month, item.paidDate]));
  const rows: TaxRow[] = [];
  for (const entry of finance.entries) {
    const category = entry.taxDeductionCategory;
    if (!category || (entry.kind !== 'expense' && entry.kind !== 'purchase')) continue;
    const date = entry.kind === 'purchase' ? paidInvoices.get(entry.cardId + '/' + entry.invoiceMonth) : entry.status !== 'pending' ? entry.date : undefined;
    if (!date || date.slice(0, 4) !== year) continue;
    rows.push({ id: entry.id, date, description: entry.description, category, amount: entry.amountCents });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.category, (totals.get(row.category) || 0) + row.amount);
  const total = rows.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className={reportPanel + ' p-4 sm:p-6'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Pasta IRPF · {year}</h2>
          <p className="mt-1 text-sm text-text-muted">Reúne despesas pagas que você marcou nos lançamentos para conferência e exportação.</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5" disabled={!rows.length}
          onClick={() => exportCsv('irpf-' + year + '.csv', [['Data', 'Categoria', 'Descrição', 'Valor (R$)'],
            ...rows.map(row => [shortDate(row.date), row.category, row.description, csvMoney(row.amount)])])}>
          <Download size={15} /> Exportar CSV
        </Button>
      </div>
      <div className="mt-4 rounded-2xl border border-text-muted/15 bg-surface-bg p-4">
        <p className="text-xs text-text-muted">Total de despesas marcadas</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-text-main">{money(total)}</p>
        {[...totals].map(([category, value]) => <div key={category} className="mt-2 flex justify-between gap-3 border-t border-text-muted/15 pt-2 text-xs">
          <span className="break-words text-text-muted">{category}</span><strong className="whitespace-nowrap text-text-main">{money(value)}</strong>
        </div>)}
      </div>
      {rows.length ? <ul className="mt-3 divide-y divide-text-muted/15">
        {rows.map(row => <li key={row.id} className="flex justify-between gap-3 py-2.5 text-sm">
          <div className="min-w-0"><p className="break-words font-semibold text-text-main">{row.description}</p><p className="text-xs text-text-muted">{shortDate(row.date)} · {row.category}</p></div>
          <span className="whitespace-nowrap tabular-nums text-text-main">{money(row.amount)}</span>
        </li>)}
      </ul> : <p className="mt-4 text-sm text-text-muted">Ao cadastrar uma despesa, escolha a categoria de IRPF para encontrá-la aqui após o pagamento.</p>}
    </section>
  );
}

export default function AnalysisView({ uid, finance, month }: AnalysisProps) {
  const [tab, setTab] = useState<Tab>('monthly');
  const data = useAnalysisData(uid);
  const year = month.slice(0, 4);

  return (
    <div className="min-w-0 space-y-4">
      <nav aria-label="Relatórios de finanças pessoais" className="flex max-w-full flex-wrap gap-1.5">
        {tabs.map(({ id, icon: Icon, label }) => (
          <Button key={id} size="sm" variant={tab === id ? 'secondary' : 'ghost'} onClick={() => setTab(id)}
            aria-pressed={tab === id} className={'min-h-10 gap-1.5 ' + (tab === id ? '!text-primary-500' : '')}>
            <Icon size={15} aria-hidden="true" />{label}
          </Button>
        ))}
      </nav>
      {tab === 'monthly' && <Monthly entries={finance.entries} month={month} />}
      {tab === 'annual' && <Annual entries={finance.entries} year={year} />}
      {tab === 'tax' && <TaxReport finance={finance} year={year} />}
      {(tab === 'patrimony' || tab === 'insight') && data.error && <p className="rounded-xl border border-accent-error/25 p-4 text-sm text-accent-error" role="alert">{data.error}</p>}
      {(tab === 'patrimony' || tab === 'insight') && data.loading && !data.error && <p className="text-sm text-text-muted" role="status">Carregando…</p>}
      {tab === 'insight' && !data.loading && !data.error && <Diagnostics entries={finance.entries} month={month} settings={data.settings} save={data.saveSettings} />}
      {tab === 'patrimony' && !data.loading && !data.error && <AssetsPanel data={data} finance={finance} month={month} />}
    </div>
  );
}
