import { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, Check, ChevronLeft,
  ChevronRight, CreditCard as CreditCardIcon, Landmark, LayoutDashboard, Plus,
  ReceiptText, Search, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { Badge, Button, Card } from '@shared/design-system';
import PersonalWallet from './PersonalWallet';
import PersonalFinanceDialog, { type FinanceDialog } from './PersonalFinanceDialog';
import {
  getBankBalance, getEntryMonth, getMonthlySummary, money, monthOf, shiftMonth, today,
  type CardInvoice, type LedgerEntry,
} from './ledger';
import { usePersonalFinance } from './usePersonalFinance';

type Section = 'overview' | 'statement' | 'wallet';
const sections = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'statement', label: 'Extrato', icon: ReceiptText },
  { id: 'wallet', label: 'Carteira 3D', icon: Wallet },
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

function EntryList({ entries, nameFor, onStatus }: {
  entries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  onStatus?: (entry: LedgerEntry, status: 'paid' | 'pending') => Promise<void>;
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
  if (!entries.length) return <p className="px-5 py-9 text-center text-sm text-text-muted">Nenhum lançamento encontrado neste período.</p>;
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
          formatDate(entry.date), source, entry.category,
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Overview({ balance, accountCount, summary, invoices, cardNames, entries, nameFor, goTo }: {
  balance: number;
  accountCount: number;
  summary: ReturnType<typeof getMonthlySummary>;
  invoices: CardInvoice[];
  cardNames: ReadonlyMap<string, string>;
  entries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  goTo: (section: Section) => void;
}) {
  const max = Math.max(summary.incomeCents, summary.expenseCents, 1);
  const invoiceTotal = invoices.reduce((total, invoice) => total + invoice.totalCents, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card glass className="relative min-h-48 p-5 sm:p-6 lg:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary-500/18 via-primary-500/4 to-transparent" />
          <div className="relative flex h-full flex-col items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-500/12 text-primary-500"><Landmark size={20} /></span>
            <h2 className="text-sm font-medium text-text-muted">Saldo atual em contas ativas</h2>
            <p className="break-all text-3xl font-bold tracking-tight text-text-main tabular-nums sm:text-4xl">{money(balance)}</p>
            <button type="button" onClick={() => goTo('wallet')} className="mt-auto text-sm font-semibold text-primary-500 hover:underline focus-visible:outline-2">
              {accountCount ? `Ver carteira · ${accountCount} ${accountCount === 1 ? 'conta' : 'contas'}` : 'Cadastrar primeira conta'}
            </button>
          </div>
        </Card>
        <Card glass className="p-5 sm:p-6 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-semibold text-text-main">Resultado do mês</h2>
            <span className="text-lg font-bold tabular-nums text-text-main">{money(summary.netCents)}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              { label: 'Receitas', amount: summary.incomeCents, pending: summary.pendingIncomeCents, bar: 'bg-accent-success' },
              { label: 'Despesas líquidas', amount: summary.expenseCents, pending: summary.pendingExpenseCents, bar: 'bg-primary-500' },
            ].map(metric => (
              <div key={metric.label} className="grid gap-1.5">
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-text-muted">{metric.label}</span>
                  <strong className="tabular-nums text-text-main">{money(metric.amount)}</strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-text-muted/15" aria-hidden="true">
                  <div className={`h-full rounded-full ${metric.bar}`} style={{ width: `${Math.max(0, metric.amount) / max * 100}%` }} />
                </div>
                {metric.pending > 0 && <p className="text-xs text-text-muted">{money(metric.pending)} em lançamentos bancários pendentes</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card glass className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-text-muted/15 px-5 py-3">
            <h2 className="font-semibold text-text-main">Lançamentos do mês</h2>
            <Button variant="ghost" size="sm" onClick={() => goTo('statement')}>Abrir extrato <ChevronRight size={14} /></Button>
          </div>
          <EntryList entries={entries.slice(0, 5)} nameFor={nameFor} />
        </Card>
        <Card glass className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-text-main">Faturas em aberto no mês</h2>
            <strong className="tabular-nums text-text-main">{money(invoiceTotal)}</strong>
          </div>
          {invoices.length ? (
            <ul className="mt-3 divide-y divide-text-muted/15">
              {invoices.map(invoice => (
                <li key={invoice.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-text-main">{cardNames.get(invoice.cardId) ?? 'Cartão'}</p>
                    <p className="text-xs text-text-muted">Vence em {formatDate(invoice.dueDate)}</p>
                  </div>
                  <span className="whitespace-nowrap tabular-nums text-text-main">{money(invoice.totalCents)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-text-muted">Nenhuma fatura em aberto neste mês.</p>}
          <Button className="mt-3" variant="ghost" size="sm" onClick={() => goTo('wallet')}>Ver faturas na carteira <ChevronRight size={14} /></Button>
        </Card>
      </div>
    </div>
  );
}

function Statement({ entries, nameFor, onStatus }: {
  entries: LedgerEntry[];
  nameFor: (entry: LedgerEntry) => string;
  onStatus: (entry: LedgerEntry, status: 'paid' | 'pending') => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const search = normalize(query.trim());
  const filtered = entries.filter(entry => (
    (!kind || entry.kind === kind) &&
    normalize(`${entry.description} ${entry.category ?? ''} ${nameFor(entry)}`).includes(search)
  ));
  return (
    <Card glass>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-text-muted/15 p-4">
        <h2 className="font-semibold text-text-main">Extrato do mês <span className="ml-1 text-sm font-normal text-text-muted">({filtered.length})</span></h2>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="flex min-w-36 flex-1 items-center gap-2 rounded-xl border border-text-muted/25 bg-surface-bg px-3">
            <Search size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)}
              aria-label="Pesquisar lançamentos" placeholder="Pesquisar" className="w-full bg-transparent py-2.5 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500" />
          </label>
          <select aria-label="Tipo de lançamento" className="rounded-xl border border-text-muted/25 px-3 py-2.5 text-sm" value={kind}
            onChange={event => setKind(event.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
      </div>
      <EntryList entries={filtered} nameFor={nameFor} onStatus={onStatus} />
    </Card>
  );
}

function PersonalFinance({ uid }: { uid: string }) {
  const finance = usePersonalFinance(uid);
  const { accounts, cards, entries, invoices, loading, error } = finance;
  const currentDate = today();
  const [month, setMonth] = useState(() => monthOf(currentDate));
  const [section, setSection] = useState<Section>('overview');
  const [dialog, setDialog] = useState<FinanceDialog | null>(null);
  const currentAccounts = accounts.filter(account => !account.archived);
  const canLaunch = currentAccounts.length > 0 || cards.some(card => !card.archived);
  const balances = useMemo(() => new Map(accounts.map(account => [account.id, getBankBalance(account, entries, currentDate)])), [accounts, entries, currentDate]);
  const accountNames = useMemo(() => new Map(accounts.map(account => [account.id, account.name])), [accounts]);
  const cardNames = useMemo(() => new Map(cards.map(card => [card.id, card.name])), [cards]);
  const summary = getMonthlySummary(month, entries);
  const monthEntries = useMemo(() => entries.filter(entry => getEntryMonth(entry) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [entries, month]);
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

  function openEntry() {
    if (canLaunch) setDialog({ type: 'entry' });
    else {
      setSection('wallet');
      setDialog({ type: 'account' });
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 text-text-main sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Finanças pessoais" className="flex max-w-full flex-wrap gap-1 rounded-xl border border-text-muted/20 bg-surface-glass p-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" size="sm" aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
              className={`min-h-9 shrink-0 gap-1.5 ${section === id ? 'bg-primary-500/13 !text-primary-500' : ''}`}>
              <Icon size={16} aria-hidden="true" />{label}
            </Button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <MonthControl month={month} change={setMonth} />
          <Button size="sm" className="min-h-10 gap-1.5" disabled={loading || Boolean(error)} onClick={openEntry}>
            <Plus size={17} aria-hidden="true" />{canLaunch ? 'Novo lançamento' : 'Cadastrar conta'}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-accent-error/25 bg-accent-error/10 p-4 text-sm text-accent-error">{error}</p>}
      {loading && !error && <p role="status" className="p-5 text-sm text-text-muted">Carregando finanças…</p>}
      {!loading && !error && (
        <>
          {section === 'overview' && <Overview balance={total} accountCount={currentAccounts.length} summary={summary}
            invoices={monthInvoices} cardNames={cardNames} entries={monthEntries} nameFor={nameFor} goTo={setSection} />}
          {section === 'statement' && <Statement entries={monthEntries} nameFor={nameFor}
            onStatus={(entry, status) => finance.setEntryStatus(entry.id, status)} />}
          {section === 'wallet' && <PersonalWallet accounts={accounts} cards={cards} balances={balances}
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
            onPayInvoice={(card, invoice) => setDialog({ type: 'payment', card, invoice })}
            onCardCredit={card => setDialog({ type: 'credit', card, month })} />}
        </>
      )}
      {dialog && <PersonalFinanceDialog dialog={dialog} finance={finance} onClose={() => setDialog(null)}
        onSuccess={message => { setDialog(null); toast.success(message); }} />}
    </div>
  );
}

export default function PersonalFinanceView() {
  const { user } = useAuth();
  return user ? <PersonalFinance key={user.uid} uid={user.uid} /> : null;
}
