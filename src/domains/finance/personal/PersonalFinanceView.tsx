import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, Check, ChevronLeft,
  ChevronRight, CreditCard as CreditCardIcon, Eye, EyeOff, Landmark, LayoutDashboard, LineChart, LockKeyhole,
  Pencil, PiggyBank, Plus, ReceiptText, Search, SlidersHorizontal, Trash2, Users, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { Badge, Button } from '@shared/design-system';
import PersonalWallet from './PersonalWallet';
import PersonalFinanceDialog, { type FinanceDialog } from './PersonalFinanceDialog';
import {
  getBankBalance, getEntryMonth, getMonthlySummary, money, monthOf, shiftMonth, today,
  type CardInvoice, type CreditCard, type LedgerEntry,
} from './ledger';
import { usePersonalFinance } from './usePersonalFinance';
import { FinancePreferences, FinanceUnlock, useFinancePreferences } from './FinancePreferences';
import './PersonalFinance.css';
import FinanceRecurrences from './FinanceRecurrences';

const CalendarView = lazy(() => import('./analysis/CalendarView'));
const AnalysisView = lazy(() => import('./analysis/AnalysisView'));
const PlanningView = lazy(() => import('./planning/PlanningView'));
const FinanceToolsView = lazy(() => import('./tools/FinanceToolsView'));
const SpacesView = lazy(() => import('./spaces/SpacesView'));

type Section = 'overview' | 'statement' | 'wallet' | 'calendar' | 'planning' | 'reports' | 'tools' | 'spaces';
const sections = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'statement', label: 'Extrato', icon: ReceiptText },
  { id: 'wallet', label: 'Carteira 3D', icon: Wallet },
  { id: 'calendar', label: 'Agenda', icon: CalendarDays },
  { id: 'planning', label: 'Planejamento', icon: PiggyBank },
  { id: 'reports', label: 'Relatórios', icon: LineChart },
  { id: 'tools', label: 'Ferramentas', icon: SlidersHorizontal },
  { id: 'spaces', label: 'Espaços', icon: Users },
] as const;

const labels: Record<LedgerEntry['kind'], string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
  purchase: 'Compra no cartão',
  cardCredit: 'Crédito no cartão',
  invoicePayment: 'Pagamento de fatura',
  adjustment: 'Ajuste de saldo',
};

const icons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  purchase: CreditCardIcon,
  cardCredit: CreditCardIcon,
  invoicePayment: ReceiptText,
  adjustment: Landmark,
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDate = (date: string) => date.split('-').reverse().join('/');

function MonthControl({ month, change }: { month: string; change: (month: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-text-muted/20 bg-surface-glass p-0.5">
      <Button variant="ghost" size="sm" onClick={() => change(shiftMonth(month, -1))} aria-label="Mês anterior" disabled={month === '1900-01'}>
        <ChevronLeft size={17} />
      </Button>
      <label className="relative flex items-center gap-1.5 rounded-lg p-2 text-sm text-text-main focus-within:ring-2 focus-within:ring-primary-500">
        <CalendarDays size={15} className="shrink-0 text-text-muted" aria-hidden="true" />
        <span className="whitespace-nowrap first-letter:uppercase">{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</span>
        <input type="month" aria-label="Mês do extrato" className="absolute inset-0 h-full w-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full"
          value={month} min="1900-01" max="9999-12"
          onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value) && event.target.value >= '1900-01') change(event.target.value); }} />
      </label>
      <Button variant="ghost" size="sm" onClick={() => change(shiftMonth(month, 1))} aria-label="Próximo mês" disabled={month === '9999-12'}>
        <ChevronRight size={17} />
      </Button>
    </div>
  );
}

function EntryList({ entries, nameFor, onStatus, onEdit, onTrash, isLocked }: {
  entries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  onStatus?: (entry: LedgerEntry, status: 'paid' | 'pending') => Promise<void>;
  onEdit?: (entry: LedgerEntry) => void;
  onTrash?: (entry: LedgerEntry) => void;
  isLocked?: (entry: LedgerEntry) => boolean;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  async function changeStatus(entry: LedgerEntry, status: 'paid' | 'pending') {
    if (!onStatus || saving) return;
    setSaving(entry.id);
    try {
      await onStatus(entry, status);
      toast.success('Situação atualizada.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível atualizar o lançamento.');
    } finally {
      setSaving(null);
    }
  }
  if (!entries.length) return (
    <div className="grid justify-items-center gap-2 px-5 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-primary-500/10 text-primary-500"><ReceiptText size={18} aria-hidden="true" /></span>
      <p className="text-sm text-text-muted">Nenhum lançamento encontrado neste período.</p>
    </div>
  );
  return (
    <ul className="divide-y divide-text-muted/15">
      {entries.map(entry => {
        const Icon = icons[entry.kind];
        const isCash = entry.kind === 'income' || entry.kind === 'expense';
        const pending = entry.status === 'pending';
        const increases = entry.kind === 'income' || entry.kind === 'cardCredit' || (entry.kind === 'adjustment' && entry.amountCents > 0);
        const decreases = ['expense', 'purchase', 'invoicePayment'].includes(entry.kind) || (entry.kind === 'adjustment' && entry.amountCents < 0);
        const source = nameFor(entry);
        const details = [
          formatDate(entry.date), source, entry.category, entry.tags?.length ? entry.tags.map(tag => `#${tag}`).join(' ') : '',
          entry.warrantyUntil ? `Garantia até ${formatDate(entry.warrantyUntil)}` : '',
          entry.foreignCurrency && entry.foreignAmountCents ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: entry.foreignCurrency }).format(entry.foreignAmountCents / 100) : '',
          entry.invoiceMonth && monthOf(entry.date) !== entry.invoiceMonth ? `Fatura ${entry.invoiceMonth.split('-').reverse().join('/')}` : '',
          entry.installmentCount && entry.installmentCount > 1 ? `Parcela ${entry.installment}/${entry.installmentCount}` : '',
        ].filter(Boolean);
        return (
          <li key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 px-3 py-3 sm:gap-3 sm:px-5">
            <span className={`grid size-9 place-items-center rounded-xl ${increases ? 'bg-accent-success/12 text-accent-success' : 'bg-primary-500/10 text-primary-500'}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold leading-tight text-text-main">{entry.description}</p>
              <p className="mt-1 break-words text-xs text-text-muted">{labels[entry.kind]} · {details.join(' · ')}</p>
              {onStatus && isCash && (
                <button type="button" disabled={saving !== null} onClick={() => void changeStatus(entry, pending ? 'paid' : 'pending')}
                  className="mt-1 flex min-h-7 items-center gap-1 text-xs font-medium text-primary-500 hover:underline focus-visible:outline-2 disabled:opacity-60"
                  aria-label={`${pending ? 'Confirmar' : 'Marcar como pendente'}: ${entry.description}`}>
                  {pending && <Check size={13} aria-hidden="true" />}
                  {saving === entry.id ? 'Salvando…' : pending ? (entry.kind === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento') : 'Marcar pendente'}
                </button>
              )}
            </div>
            <div className="grid justify-items-end gap-1 text-right">
              <span className={`text-sm font-semibold tabular-nums ${increases ? 'text-accent-success' : 'text-text-main'}`}>
                {increases ? '+' : decreases ? '−' : ''}{money(Math.abs(entry.amountCents))}
              </span>
              {pending && <Badge variant="warning">Pendente</Badge>}
              {entry.reimbursement && <Badge variant={entry.reimbursement === 'received' ? 'success' : 'warning'}>
                {entry.reimbursement === 'received' ? 'Reembolsado' : 'A reembolsar'}
              </Badge>}
              {entry.kind !== 'invoicePayment' && (onEdit || onTrash) && (
                <div className="flex items-center gap-1">
                  {onEdit && ['income', 'expense', 'transfer', 'purchase'].includes(entry.kind) && (
                    <Button type="button" size="sm" variant="ghost" aria-label={`Editar ${entry.description}`} onClick={() => onEdit(entry)}>
                      <Pencil size={14} aria-hidden="true" />
                    </Button>
                  )}
                  {onTrash && !isLocked?.(entry) && <Button type="button" size="sm" variant="ghost" aria-label={`Enviar ${entry.description} à lixeira`} onClick={() => onTrash(entry)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Overview({ balance, accountCount, summary, invoices, cardNames, entries, nameFor, goTo, createAccount, compact }: {
  balance: number;
  accountCount: number;
  summary: ReturnType<typeof getMonthlySummary>;
  invoices: CardInvoice[];
  cardNames: ReadonlyMap<string, string>;
  entries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  goTo: (section: Section) => void;
  createAccount: () => void;
  compact: boolean;
}) {
  const invoiceTotal = invoices.reduce((total, invoice) => total + invoice.totalCents, 0);
  const pending = invoices.filter(invoice => invoice.dueDate < today()).length;
  const metrics = [
    { label: 'Receitas', amount: summary.incomeCents, pending: summary.pendingIncomeCents, icon: ArrowDownLeft, tone: 'text-accent-success bg-accent-success/12' },
    { label: 'Despesas líquidas', amount: summary.expenseCents, pending: summary.pendingExpenseCents, icon: ArrowUpRight, tone: 'text-accent-error bg-accent-error/12' },
    { label: 'Resultado do mês', amount: summary.netCents, pending: 0, icon: LineChart, tone: 'text-primary-500 bg-primary-500/12' },
  ];
  const maxMetric = Math.max(Math.abs(summary.incomeCents), Math.abs(summary.expenseCents), 1);
  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${compact ? '' : 'lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.55fr)]'}`}>
        <section className="finance-balance personal-finance-panel flex min-w-0 flex-col justify-between gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-text-muted">Saldo em contas ativas</h2>
              <p className="mt-2 break-words text-[clamp(1.8rem,4vw,3.3rem)] leading-tight font-semibold tracking-tight tabular-nums">{money(balance)}</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-500"><Landmark size={19} aria-hidden="true" /></span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-text-muted">{accountCount} {accountCount === 1 ? 'conta ativa' : 'contas ativas'}</span>
            <Button size="sm" variant="ghost" onClick={accountCount ? () => goTo('wallet') : createAccount} className="gap-1.5">
              {accountCount ? 'Abrir carteira' : 'Cadastrar primeira conta'}<ChevronRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </section>
        <section className="personal-finance-panel p-4 sm:p-5" aria-label="Resumo do mês">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map(({ label, amount, pending: pendingAmount, icon: Icon, tone }) => (
              <div key={label} className="min-w-0 rounded-2xl border border-text-muted/18 bg-surface-bg p-3.5">
                <span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon size={16} aria-hidden="true" /></span>
                <h2 className="mt-2.5 text-xs font-semibold text-text-muted">{label}</h2>
                <p className="mt-0.5 break-words text-xl font-semibold tracking-tight tabular-nums">{money(amount)}</p>
                {pendingAmount > 0 && <p className="mt-1 text-xs text-text-muted"><span data-finance-value>{money(pendingAmount)}</span> pendentes</p>}
              </div>
            ))}
          </div>
          {(summary.incomeCents !== 0 || summary.expenseCents !== 0) && (
            <div className="mt-4 grid gap-2 rounded-xl bg-surface-bg p-3" aria-label="Comparativo de receitas e despesas">
              {[{ label: 'Receitas', amount: summary.incomeCents, color: 'bg-accent-success' },
                { label: 'Despesas', amount: summary.expenseCents, color: 'bg-accent-error' }].map(metric => (
                <div key={metric.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                  <span className="text-xs text-text-muted">{metric.label}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-text-muted/15" aria-hidden="true">
                    <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${Math.abs(metric.amount) / maxMetric * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {!compact && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className="personal-finance-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-text-muted/18 px-4 py-3 sm:px-5">
              <h2 className="flex items-center gap-2 font-semibold"><ReceiptText size={17} className="text-primary-500" aria-hidden="true" /> Lançamentos do mês</h2>
              <Button variant="ghost" size="sm" onClick={() => goTo('statement')}>Abrir extrato <ChevronRight size={14} aria-hidden="true" /></Button>
            </div>
            <EntryList entries={entries.slice(0, 5)} nameFor={nameFor} />
          </section>
          <section className="personal-finance-panel overflow-hidden p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold"><CreditCardIcon size={17} className="text-primary-500" aria-hidden="true" /> Faturas em aberto no mês</h2>
              <strong className="tabular-nums">{money(invoiceTotal)}</strong>
            </div>
            {pending > 0 && <div className="mt-2"><Badge variant="warning">{pending} {pending === 1 ? 'vencida' : 'vencidas'}</Badge></div>}
            {invoices.length ? (
              <ul className="mt-3 divide-y divide-text-muted/15">
                {invoices.map(invoice => (
                  <li key={invoice.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold">{cardNames.get(invoice.cardId) ?? 'Cartão'}</p>
                      <p className="text-xs text-text-muted">Vencimento em {formatDate(invoice.dueDate)}</p>
                    </div>
                    <span className="whitespace-nowrap tabular-nums">{money(invoice.totalCents)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 rounded-xl border border-dashed border-text-muted/25 p-4 text-sm text-text-muted">Nenhuma fatura em aberto neste mês.</p>}
            <Button className="mt-3 gap-1" variant="ghost" size="sm" onClick={() => goTo('calendar')}>Abrir agenda <ChevronRight size={14} aria-hidden="true" /></Button>
          </section>
        </div>
      )}
    </div>
  );
}

function Statement({ entries, allEntries, nameFor, onStatus, onEdit, onTrash, isLocked, focusSignal }: {
  entries: LedgerEntry[];
  allEntries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  onStatus: (entry: LedgerEntry, status: 'paid' | 'pending') => Promise<void>;
  onEdit: (entry: LedgerEntry) => void;
  onTrash: (entry: LedgerEntry) => void;
  isLocked: (entry: LedgerEntry) => boolean;
  focusSignal: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [allMonths, setAllMonths] = useState(Boolean(focusSignal));
  const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const search = normalize(query.trim());
  const filtered = (allMonths ? allEntries : entries).filter(entry => (
    (!kind || entry.kind === kind) &&
    normalize([`${entry.description} ${entry.category ?? ''}`, nameFor(entry), ...(entry.tags ?? [])].join(' ')).includes(search)
  ));

  useEffect(() => {
    if (focusSignal) {
      setAllMonths(true);
      input.current?.focus();
    }
  }, [focusSignal]);

  return (
    <section className="personal-finance-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-text-muted/18 p-4">
        <h2 className="font-semibold text-text-main">{allMonths ? 'Todos os lançamentos' : 'Extrato do mês'} <span className="ml-1 text-sm font-normal text-text-muted">({filtered.length})</span></h2>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <label className="flex min-w-36 flex-1 items-center gap-2 rounded-xl border border-text-muted/25 bg-surface-bg px-3">
            <Search size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            <input ref={input} type="search" value={query} onChange={event => setQuery(event.target.value)}
              aria-label="Pesquisar lançamentos" placeholder="Pesquisar" className="w-full py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary-500" />
          </label>
          <select aria-label="Tipo de lançamento" className="min-w-0 rounded-xl border border-text-muted/28 px-3 py-2.5 text-sm" value={kind}
            onChange={event => setKind(event.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <label className="flex min-h-9 items-center gap-2 px-1 text-sm text-text-main">
            <input type="checkbox" checked={allMonths} onChange={event => setAllMonths(event.target.checked)} /> Todos os meses
          </label>
        </div>
      </div>
      <EntryList entries={filtered} nameFor={nameFor} onStatus={onStatus} onEdit={onEdit} onTrash={onTrash} isLocked={isLocked} />
    </section>
  );
}

function FinanceLoading() {
  return (
    <div role="status" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <span className="sr-only">Carregando finanças…</span>
      <div aria-hidden="true" className="personal-finance-panel grid min-h-40 content-center gap-3 p-5 motion-safe:animate-pulse">
        <div className="h-3 w-36 max-w-full rounded bg-text-muted/16" />
        <div className="h-9 w-44 max-w-full rounded bg-text-muted/16" />
      </div>
      <div aria-hidden="true" className="personal-finance-panel grid grid-cols-3 items-center gap-3 p-5 motion-safe:animate-pulse">
        <div className="h-20 rounded-xl bg-text-muted/10" />
        <div className="h-20 rounded-xl bg-text-muted/10" />
        <div className="h-20 rounded-xl bg-text-muted/10" />
      </div>
    </div>
  );
}

function PersonalFinance({ uid }: { uid: string }) {
  const finance = usePersonalFinance(uid);
  const { accounts, cards, entries, invoices, loading, error } = finance;
  const currentDate = today();
  const [month, setMonth] = useState(() => monthOf(currentDate));
  const [section, setSection] = useState<Section>('overview');
  const [dialog, setDialog] = useState<FinanceDialog | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [focusSignal, setFocusSignal] = useState(0);
  const [calendarPage, setCalendarPage] = useState<'days' | 'recurrences'>('days');
  const device = useFinancePreferences(uid);
  const currentAccounts = accounts.filter(account => !account.archived);
  const canLaunch = currentAccounts.length > 0 || cards.some(card => !card.archived);
  const balances = useMemo(() => new Map(accounts.map(account => [account.id, getBankBalance(account, entries, currentDate)])), [accounts, entries, currentDate]);
  const accountNames = useMemo(() => new Map(accounts.map(account => [account.id, account.name])), [accounts]);
  const cardNames = useMemo(() => new Map(cards.map(card => [card.id, card.name])), [cards]);
  const summary = getMonthlySummary(month, entries);
  const sortedEntries = useMemo(() => [...entries]
    .sort((a, b) => getEntryMonth(b).localeCompare(getEntryMonth(a)) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [entries]);
  const monthEntries = useMemo(() => sortedEntries.filter(entry => getEntryMonth(entry) === month), [sortedEntries, month]);
  const paidInvoices = useMemo(() => new Set(invoices.filter(invoice => invoice.paidDate).map(invoice => invoice.id)), [invoices]);
  const monthInvoices = invoices.filter(invoice => invoice.month === month && invoice.totalCents > 0 && !invoice.paidDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = currentAccounts.reduce((balance, account) => balance + (balances.get(account.id) ?? 0), 0);

  function nameFor(entry: LedgerEntry) {
    const names = [
      entry.bankAccountId ? accountNames.get(entry.bankAccountId) : undefined,
      entry.targetBankAccountId ? accountNames.get(entry.targetBankAccountId) : undefined,
      entry.cardId ? cardNames.get(entry.cardId) : undefined,
    ];
    return names.filter(Boolean).join(entry.kind === 'transfer' ? ' → ' : ' · ');
  }

  async function restore(action: () => Promise<void>) {
    try {
      await action();
      toast.success('Item restaurado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível restaurar o item.');
    }
  }

  const createAccount = useCallback(() => {
    setSection('wallet');
    setDialog({ type: 'account' });
  }, []);
  const openEntry = useCallback(() => {
    if (canLaunch) setDialog({ type: 'entry' });
    else createAccount();
  }, [canLaunch, createAccount]);
  const openSearch = useCallback(() => {
    setSection('statement');
    setFocusSignal(value => value + 1);
  }, []);
  const ready = !loading && !error && !device.locked;

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    if (dialog || showPreferences || !ready) return;
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], dialog')) return;
      if (event.key === 'n') {
        event.preventDefault();
        openEntry();
      } else if (event.key === '/') {
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, showPreferences, ready, openEntry, openSearch]);

  function openInvoice(card: CreditCard, invoice: CardInvoice) {
    setDialog({ type: 'payment', card, invoice });
  }

  if (device.locked) return (
    <div className="personal-finance px-3">
      <FinanceUnlock unlock={device.unlock} />
    </div>
  );

  return (
    <div data-discreet={device.discreet} className={`personal-finance mx-auto w-full space-y-4 px-3 py-4 text-text-main sm:px-6 sm:py-6 ${device.compact && section === 'overview' ? 'max-w-4xl' : 'max-w-[90rem]'}`}>
      <div className="personal-finance-panel finance-screen-only min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold tracking-tight">{sections.find(item => item.id === section)?.label}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <MonthControl month={month} change={setMonth} />
            <Button type="button" variant="ghost" size="sm" className="min-h-10" onClick={openSearch} disabled={!ready} aria-label="Buscar em Finanças Pessoais" title="Buscar (/)" >
              <Search size={17} aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-10" aria-pressed={device.discreet}
              onClick={() => device.toggle('discreet')} aria-label={device.discreet ? 'Mostrar valores' : 'Ocultar valores'}>
              {device.discreet ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-10" onClick={() => setShowPreferences(true)} aria-label="Preferências neste dispositivo">
              <LockKeyhole size={17} aria-hidden="true" />
            </Button>
            <Button size="sm" className="min-h-10 gap-1.5" disabled={!ready} onClick={openEntry}>
              <Plus size={17} aria-hidden="true" />{canLaunch ? 'Novo lançamento' : 'Cadastrar conta'}
            </Button>
          </div>
        </div>
        <nav aria-label="Finanças pessoais" className="finance-navigation flex gap-1 overflow-x-auto border-t border-text-muted/15 px-2 py-2 sm:px-4">
          {sections.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" size="sm" aria-current={section === id ? 'page' : undefined}
              onClick={() => { setSection(id); if (id === 'statement') setFocusSignal(0); }}
              className="min-h-10 shrink-0 gap-1.5 whitespace-nowrap rounded-xl">
              <Icon size={16} aria-hidden="true" />{label}
            </Button>
          ))}
        </nav>
      </div>
      {error && <p role="alert" className="rounded-xl border border-accent-error/25 bg-accent-error/10 p-4 text-sm text-accent-error">{error}</p>}
      {!online && <p className="personal-finance-panel px-4 py-2.5 text-sm text-accent-warning" role="status">
        Sem conexão. Confira os dados já sincronizados. Algumas alterações precisam de conexão.
      </p>}
      {loading && !error && <FinanceLoading />}
      {!loading && !error && (
        <>
          {section === 'overview' && <Overview balance={total} accountCount={currentAccounts.length} summary={summary}
            invoices={monthInvoices} cardNames={cardNames} entries={monthEntries} nameFor={nameFor} goTo={setSection}
            createAccount={createAccount} compact={device.compact} />}
          {section === 'statement' && <Statement entries={monthEntries} allEntries={sortedEntries} nameFor={nameFor}
            onStatus={(entry, status) => finance.setEntryStatus(entry.id, status)}
            onEdit={entry => setDialog({ type: 'entry', entry,
              settled: Boolean(entry.cardId && entry.invoiceMonth && paidInvoices.has(`${entry.cardId}-${entry.invoiceMonth}`)) })}
            onTrash={entry => setDialog({ type: 'trashEntry', entry })}
            isLocked={entry => Boolean(entry.cardId && entry.invoiceMonth && paidInvoices.has(`${entry.cardId}-${entry.invoiceMonth}`))}
            focusSignal={focusSignal} />}
          {section === 'wallet' && <PersonalWallet accounts={accounts} cards={cards} balances={balances} discreet={device.discreet}
            invoices={invoices} selectedMonth={month}
            onCreateAccount={() => setDialog({ type: 'account' })}
            onCreateCard={() => setDialog({ type: 'card' })}
            onEditAccount={account => setDialog({ type: 'account', account })}
            onEditCard={card => setDialog({ type: 'card', card })}
            onArchiveAccount={account => setDialog({ type: 'archiveAccount', account })}
            onArchiveCard={card => setDialog({ type: 'archiveCard', card })}
            onRestoreAccount={account => void restore(() => finance.restoreAccount(account.id))}
            onRestoreCard={card => void restore(() => finance.restoreCard(card.id))}
            onReconcile={account => setDialog({ type: 'reconcile', account, balance: balances.get(account.id) ?? 0 })}
            onPayInvoice={openInvoice}
            onCardCredit={card => setDialog({ type: 'credit', card, month })} />}
          <Suspense fallback={<p className="personal-finance-panel p-5 text-sm text-text-muted" role="status">Carregando seção…</p>}>
            {section === 'calendar' && <>
              <div className="finance-screen-only flex flex-wrap gap-2">
                <Button variant={calendarPage === 'days' ? 'primary' : 'secondary'} size="sm" onClick={() => setCalendarPage('days')} aria-pressed={calendarPage === 'days'}>Calendário e fluxo</Button>
                <Button variant={calendarPage === 'recurrences' ? 'primary' : 'secondary'} size="sm" onClick={() => setCalendarPage('recurrences')} aria-pressed={calendarPage === 'recurrences'}>Recorrências e assinaturas</Button>
              </div>
              {calendarPage === 'days'
                ? <CalendarView uid={uid} finance={finance} month={month} onPayInvoice={openInvoice} onOpenWallet={() => setSection('wallet')} />
                : <FinanceRecurrences finance={finance} month={month} />}
            </>}
            {section === 'planning' && <PlanningView uid={uid} finance={finance} month={month} />}
            {section === 'reports' && <AnalysisView uid={uid} finance={finance} month={month} />}
            {section === 'tools' && <FinanceToolsView uid={uid} finance={finance} month={month} />}
            {section === 'spaces' && <SpacesView uid={uid} finance={finance} month={month} />}
          </Suspense>
        </>
      )}
      {showPreferences && <FinancePreferences device={{ ...device, lock: () => { setShowPreferences(false); device.lock(); } }}
        close={() => setShowPreferences(false)} />}
      {dialog && <PersonalFinanceDialog uid={uid} dialog={dialog} finance={finance} onClose={() => setDialog(null)}
        onSuccess={message => { setDialog(null); toast.success(message); }} />}
    </div>
  );
}

export default function PersonalFinanceView() {
  const { user } = useAuth();
  return user ? <PersonalFinance key={user.uid} uid={user.uid} /> : null;
}
