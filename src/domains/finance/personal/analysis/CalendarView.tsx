import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button } from '@shared/design-system';
import { getBankBalance, money, monthOf, today, type CardInvoice, type CreditCard as CreditCardModel, type LedgerEntry } from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import { monthDay, monthDayCount, monthName, priorDay, reportControl, reportHeading, reportPanel, shortDate } from './analysisUtils';

interface CalendarProps {
  uid: string;
  finance: ReturnType<typeof usePersonalFinance>;
  month: string;
  onPayInvoice?: (card: CreditCardModel, invoice: CardInvoice) => void;
  onOpenWallet?: () => void;
}

type Status = 'paid' | 'pending' | 'overdue';
type Event = {
  id: string;
  date: string;
  name: string;
  amount: number;
  kind: 'income' | 'expense' | 'transfer' | 'adjustment' | 'invoice';
  status: Status;
  account: string;
  entry?: LedgerEntry;
  invoice?: CardInvoice;
};

const week = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const classes = {
  paid: 'bg-accent-success',
  pending: 'bg-primary-500',
  overdue: 'bg-accent-error',
};
const statusLabels: Record<Status, string> = { paid: 'Registrado', pending: 'Previsto', overdue: 'Em atraso' };

function calculateEvents(finance: CalendarProps['finance'], accountId: string, now: string): Event[] {
  const accounts = new Map(finance.accounts.map(account => [account.id, account.name]));
  const cardNames = new Map(finance.cards.map(card => [card.id, card.name]));
  const events: Event[] = [];
  for (const entry of finance.entries) {
    if (entry.kind === 'purchase' || entry.kind === 'cardCredit') continue;
    if (accountId && entry.bankAccountId !== accountId && entry.targetBankAccountId !== accountId) continue;
    const status = entry.status === 'pending' ? (entry.date < now ? 'overdue' : 'pending') : 'paid';
    events.push({
      id: entry.id, date: entry.date, name: entry.description,
      kind: entry.kind === 'invoicePayment' ? 'invoice' : entry.kind, status,
      amount: entry.kind === 'income' || entry.kind === 'adjustment'
        ? entry.amountCents
        : entry.kind === 'transfer'
          ? (!accountId ? 0 : entry.targetBankAccountId === accountId ? entry.amountCents : -entry.amountCents)
          : -entry.amountCents,
      account: [accounts.get(entry.bankAccountId || ''), accounts.get(entry.targetBankAccountId || '')].filter(Boolean).join(' → '),
      entry,
    });
  }
  for (const invoice of finance.invoices) {
    if (invoice.paidDate || invoice.totalCents <= 0) continue;
    const card = finance.cards.find(item => item.id === invoice.cardId);
    const payer = card?.bankAccountId || '';
    if (accountId && payer !== accountId) continue;
    events.push({
      id: 'invoice-' + invoice.id, date: invoice.dueDate, name: 'Fatura · ' + (cardNames.get(invoice.cardId) || 'Cartão'),
      kind: 'invoice', status: invoice.dueDate < now ? 'overdue' : 'pending',
      amount: -invoice.totalCents, account: accounts.get(payer) ?? 'Conta a definir', invoice,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'pt-BR'));
}

function cashFlow(finance: CalendarProps['finance'], month: string, accountId: string, events: Event[]) {
  const opening = priorDay(month + '-01');
  const accounts = finance.accounts.filter(account => accountId ? account.id === accountId : true);
  const starting = accounts.reduce((amount, account) => amount + getBankBalance(account, finance.entries, opening), 0);
  const overdue = events.reduce((total, event) => event.date <= opening && event.status !== 'paid' ? total + event.amount : total, 0);
  const totals = new Map<string, { actual: number; expected: number }>();
  for (const event of events) {
    if (monthOf(event.date) !== month) continue;
    const amount = totals.get(event.date) || { actual: 0, expected: 0 };
    amount.actual += event.status === 'paid' ? event.amount : 0;
    amount.expected += event.amount;
    totals.set(event.date, amount);
  }

  let actual = starting;
  let expected = starting + overdue;
  const points = Array.from({ length: monthDayCount(month) }, (_, index) => {
    const day = index + 1;
    const date = monthDay(month, day);
    const movements = totals.get(date);
    actual += movements?.actual || 0;
    expected += movements?.expected || 0;
    return { day, date, actual, expected };
  });
  return { starting, points, overdue };
}

function CalendarEvent({ event, finance, onPayInvoice, onOpenWallet }: { event: Event } & Pick<CalendarProps, 'finance' | 'onPayInvoice' | 'onOpenWallet'>) {
  const [saving, setSaving] = useState(false);
  const Icon = event.kind === 'invoice' ? CreditCard : event.amount > 0 ? ArrowDownLeft : ArrowUpRight;
  async function settle() {
    if (!event.entry || saving) return;
    setSaving(true);
    try {
      await finance.setEntryStatus(event.entry.id, 'paid');
      toast.success(event.entry.kind === 'income' ? 'Recebimento registrado.' : 'Pagamento registrado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o lançamento.');
    } finally {
      setSaving(false);
    }
  }

  function openInvoice() {
    const invoice = event.invoice;
    const card = finance.cards.find(item => item.id === invoice?.cardId);
    if (invoice && card && onPayInvoice) onPayInvoice(card, invoice);
    else onOpenWallet?.();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-primary-500"><Icon size={17} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-text-main">{event.name}</p>
          <p className="text-xs text-text-muted">{shortDate(event.date)}{event.account ? ' · ' + event.account : ''}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={'text-sm font-semibold tabular-nums ' + (event.amount > 0 ? 'text-accent-success' : 'text-text-main')}>{money(event.amount || event.entry?.amountCents || 0)}</p>
        <Badge variant={event.status === 'paid' ? 'success' : event.status === 'overdue' ? 'danger' : 'primary'}>{statusLabels[event.status]}</Badge>
      </div>
      {event.status !== 'paid' && event.entry && <Button size="sm" variant="outline" onClick={() => void settle()} disabled={saving || event.date > today()}>
        {saving ? 'Salvando…' : event.kind === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
      </Button>}
      {event.invoice && (onPayInvoice || onOpenWallet) && <Button size="sm" variant="outline" onClick={openInvoice}>Registrar pagamento</Button>}
    </li>
  );
}

export default function CalendarView({ finance, month, onPayInvoice, onOpenWallet }: CalendarProps) {
  const now = today();
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDate = selected?.startsWith(month) ? selected : null;
  const events = useMemo(() => calculateEvents(finance, accountId, now), [finance.accounts, finance.cards, finance.entries, finance.invoices, accountId, now]);
  const { starting, points, overdue } = useMemo(() => cashFlow(finance, month, accountId, events), [finance.accounts, finance.entries, month, accountId, events]);
  const monthEvents = events.filter(event => monthOf(event.date) === month);
  const grouped = new Map<string, Event[]>();
  for (const event of monthEvents) {
    const existing = grouped.get(event.date) || [];
    existing.push(event);
    grouped.set(event.date, existing);
  }
  const pendingEvents = events.filter(event => event.status === 'overdue');
  const listed = (status === 'overdue' && !selectedDate ? pendingEvents : monthEvents)
    .filter(event => (!selectedDate || event.date === selectedDate) && (!status || event.status === status));
  const firstWeekday = new Date(month + '-01T00:00:00Z').getUTCDay();
  const last = points.at(-1);
  const shortMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <div className="min-w-0 space-y-5">
      <section className={reportPanel + ' p-4 sm:p-6'} aria-labelledby="finance-daily-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="finance-daily-title" className="flex items-center gap-2 text-lg font-semibold text-text-main"><Wallet size={20} className="text-primary-500" /> Fluxo diário</h2>
            <p className="mt-1 text-sm text-text-muted">Acompanhe o saldo registrado e a projeção com os vencimentos do mês.</p>
          </div>
          <label className="grid min-w-40 gap-1 text-xs font-medium text-text-muted">
            Conta
            <select className={reportControl} value={accountId} onChange={event => setAccountId(event.target.value)}>
              <option value="">Todas as contas</option>
              {finance.accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.archived ? ' (arquivada)' : ''}</option>)}
            </select>
          </label>
        </div>
        <dl className="mt-5 grid gap-3 min-[480px]:grid-cols-3">
          {[
            ['Saldo inicial', starting, 'text-text-main'],
            ['Saldo após registros do mês', last?.actual ?? starting, 'text-text-main'],
            ['Saldo projetado', last?.expected ?? starting, 'text-primary-500'],
          ].map(([label, amount, color]) => (
            <div key={label} className="rounded-2xl border border-text-muted/15 bg-surface-bg p-3">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className={'mt-1 text-lg font-semibold tracking-tight tabular-nums ' + color}>{money(Number(amount))}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-accent-success" /> Registrado</span>
          <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-primary-500" /> Projetado</span>
          {overdue !== 0 && <span className="text-text-muted">{money(overdue)} de pendências anteriores na projeção</span>}
        </div>
        <div className="mt-3 h-48 min-w-0 sm:h-56" role="img" aria-label={'Gráfico do saldo diário em ' + monthName(month)}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--text-muted)" strokeOpacity={0.18} vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={20} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis width={52} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={value => shortMoney.format(Number(value) / 100)} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={(_, payload) => payload[0]?.payload?.date ? shortDate(payload[0].payload.date) : ''} formatter={value => money(Number(value))}
                contentStyle={{ background: 'var(--surface-elevated)', color: 'var(--text-main)', borderColor: 'var(--text-muted)' }} />
              <Area name="Projetado" dataKey="expected" stroke="var(--primary-500)" fill="var(--primary-500)" fillOpacity={0.08} strokeWidth={2} strokeDasharray="5 4" isAnimationActive={false} />
              <Area name="Registrado" dataKey="actual" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.09} strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(21rem,0.8fr)_minmax(0,1.2fr)]">
        <section className={reportPanel + ' p-4 sm:p-5'} aria-labelledby="finance-calendar-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="finance-calendar-title" className={reportHeading + ' flex items-center gap-2'}><CalendarDays size={18} className="text-primary-500" /> Vencimentos</h2>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setStatus(''); }}>Ver mês inteiro</Button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
            {week.map(day => <span key={day} className="py-1 text-[11px] font-medium text-text-muted">{day}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
            {points.map(({ date, day }) => {
              const eventsOnDay = grouped.get(date) || [];
              const markers = [...new Set(eventsOnDay.map(event => event.status))];
              return (
                <button key={date} type="button" onClick={() => { setSelected(date === selectedDate ? null : date); setStatus(''); }} aria-pressed={date === selectedDate}
                  aria-label={shortDate(date) + ' · ' + eventsOnDay.length + ' movimentações'} aria-current={now === date ? 'date' : undefined}
                  className={'grid aspect-square min-h-8 place-content-center gap-1 rounded-lg border text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-primary-500 ' +
                    (date === selectedDate ? 'border-primary-500 bg-primary-500/16 font-bold text-primary-500' : 'border-text-muted/12 text-text-main hover:bg-primary-500/10') +
                    (now === date ? ' font-bold' : '')}>
                  {day}
                  <span className="flex justify-center gap-0.5" aria-hidden="true">{markers.map(marker => <i key={marker} className={'size-1.25 rounded-full ' + classes[marker]} />)}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className={reportPanel + ' overflow-hidden'} aria-labelledby="finance-calendar-list-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-text-muted/15 p-4">
            <div>
              <h2 id="finance-calendar-list-title" className={reportHeading}>{selectedDate ? shortDate(selectedDate) : status === 'overdue' ? 'Pendências em atraso' : 'Movimentações do mês'}</h2>
              <p className="mt-1 text-xs text-text-muted">{listed.length} registros{pendingEvents.length > 0 ? ' · ' + pendingEvents.length + ' em atraso' : ''}</p>
            </div>
            <label className="grid min-w-36 gap-1 text-xs font-medium text-text-muted">
              Situação
              <select value={status} onChange={event => setStatus(event.target.value as Status | '')} className={reportControl}>
                <option value="">Todas</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          {listed.length ? <ul className="max-h-[34rem] divide-y divide-text-muted/15 overflow-y-auto">
            {listed.map(event => <CalendarEvent key={event.id} event={event} finance={finance} onPayInvoice={onPayInvoice} onOpenWallet={onOpenWallet} />)}
          </ul> : <p className="px-4 py-9 text-center text-sm text-text-muted">Nenhuma movimentação para esta seleção.</p>}
        </section>
      </div>
    </div>
  );
}
