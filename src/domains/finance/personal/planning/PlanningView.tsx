import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CalendarClock, ChartPie, CreditCard, Layers3, PiggyBank, ShoppingBag, Target, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button } from '@shared/design-system';
import { getEntryMonth, monthOf, money, parseMoney, shiftMonth, today, type CardInvoice, type LedgerEntry } from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import { AddAction, AmountField, EditorActions, Empty, Panel, PlanEditorModal, ProgressBar, type PlanEditor } from './PlanningControls';
import { PurchaseCalculator, ReserveCalculator } from './PlanningCalculators';
import {
  categoryKey, categorySpend, debtDueDate, debtLabels, debtPaidAmount, debtPaymentAmount, displayAmount,
  displayDate, displayMonth, envelopePreview, monthsUntil, remainingDebt, WISH_COOLING_MS,
  type ItemOf, type PlanItem,
} from './planningModel';
import { useFinancePlanning } from './useFinancePlanning';

type Props = { uid: string; finance: ReturnType<typeof usePersonalFinance>; month: string };
type Section = 'budget' | 'goals' | 'debts' | 'purchases';
type Edit = (editor: PlanEditor) => void;
type RunAction = (action: () => Promise<unknown>, message: string) => Promise<boolean>;
type Planning = ReturnType<typeof useFinancePlanning>;

const tabs = [
  { id: 'budget', name: 'Orçamentos', icon: ChartPie },
  { id: 'goals', name: 'Metas e reserva', icon: PiggyBank },
  { id: 'debts', name: 'Dívidas e parcelas', icon: Layers3 },
  { id: 'purchases', name: 'Envelopes e compras', icon: ShoppingBag },
] as const;

const suggestedCategories = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Contas fixas', 'Educação', 'Lazer', 'Compras',
];
const listClass = 'space-y-3';
const rowClass = 'grid gap-2 rounded-2xl border border-text-muted/15 bg-surface-bg/45 p-3 sm:p-4';
const compactButton = 'min-h-9';

function itemsOf<K extends PlanItem['kind']>(items: PlanItem[], kind: K) {
  return items.filter((item): item is ItemOf<K> => item.kind === kind);
}

function Metrics({ children }: { children: ReactNode }) {
  return <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-text-muted/15 bg-surface-bg/50 p-3 sm:p-4">{children}</dl>;
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="min-w-0 flex-1 basis-24"><dt className="text-xs text-text-muted">{label}</dt>
    <dd className={`break-words text-lg font-semibold tracking-tight tabular-nums ${alert ? 'text-accent-error' : 'text-text-main'}`}>{value}</dd></div>;
}

function RowActions({ edit, item, allowEdit }: {
  edit: Edit;
  item: Exclude<PlanItem, { kind: 'distribution' }>;
  allowEdit?: boolean;
}) {
  return <EditorActions item={item} onEdit={current => edit({ mode: 'edit', kind: current.kind, item: current })}
    onRemove={current => edit({ mode: 'remove', item: current })} allowEdit={allowEdit} />;
}

function BudgetSection({ month, budgets, entries, edit, actions, runAction, busy }: {
  month: string;
  budgets: ItemOf<'budget'>[];
  entries: LedgerEntry[];
  edit: Edit;
  actions: Planning;
  runAction: RunAction;
  busy: boolean;
}) {
  const previous = month === '1900-01' ? undefined : shiftMonth(month, -1);
  const thisMonthNames = new Set(budgets.filter(item => item.month === month).map(item => categoryKey(item.name)));
  const copyable = budgets.filter(item => item.month === previous && !thisMonthNames.has(categoryKey(item.name)));
  const rows = budgets.filter(item => item.month === month).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(item => ({ item, ...categorySpend(entries, month, item.name) }));
  const total = rows.reduce((sum, row) => sum + row.item.amountCents, 0);
  const used = rows.reduce((sum, row) => sum + row.recorded, 0);
  const pending = rows.reduce((sum, row) => sum + row.pending, 0);
  return (
    <Panel icon={ChartPie} title="Orçamentos por categoria" detail={`Limites e gastos de ${displayMonth(month)}.`}
      action={<div className="flex flex-wrap items-center gap-2">
        {copyable.length > 0 && <Button type="button" variant="ghost" size="sm" className={compactButton} disabled={busy}
          onClick={() => void runAction(() => actions.copyBudgets(month, copyable), 'Limites do mês anterior copiados.')}>Copiar mês anterior</Button>}
        <AddAction text="Novo orçamento" onClick={() => edit({ mode: 'edit', kind: 'budget' })} />
      </div>}>
      {rows.length === 0 ? <Empty>Defina o primeiro orçamento para acompanhar quanto cada categoria consome no mês.</Empty> : (
        <>
          <Metrics>
            <Metric label="Limite planejado" value={money(total)} />
            <Metric label="Despesas registradas" value={money(used)} />
            <Metric label="Despesas pendentes" value={money(pending)} />
            <Metric label="Margem após pendências" value={money(total - used - pending)} alert={used + pending > total} />
          </Metrics>
          <ul className="grid gap-3 lg:grid-cols-2">
            {rows.map(({ item, recorded, pending }) => {
              const remaining = item.amountCents - recorded - pending;
              return <li key={item.id} className={rowClass}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{item.name}</h3>
                    <p className="mt-0.5 text-xs text-text-muted">{money(recorded)} de {money(item.amountCents)}{pending > 0 && ` · ${money(pending)} pendentes`}</p></div>
                  <RowActions edit={edit} item={item} />
                </div>
                <ProgressBar ratio={(recorded + pending) / item.amountCents} label={`Uso do orçamento ${item.name}`} tone={remaining < 0 ? 'danger' : 'default'} />
                <p className={`text-xs ${remaining < 0 ? 'text-accent-error' : 'text-text-muted'}`}>
                  {remaining < 0 ? `${money(-remaining)} acima do limite` : `${money(remaining)} disponíveis`}
                </p>
              </li>;
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

function GoalsSection({ goals, provisions, entries, month, edit, actions, runAction, busy }: {
  goals: ItemOf<'goal'>[];
  provisions: ItemOf<'provision'>[];
  entries: LedgerEntry[];
  month: string;
  edit: Edit;
  actions: Planning;
  runAction: RunAction;
  busy: boolean;
}) {
  const monthNow = monthOf(today());
  const reserve = goals.find(goal => goal.emergency);
  const allSaved = goals.reduce((sum, goal) => sum + goal.savedCents, 0);
  const pendingProvision = provisions.filter(item => !item.paid)
    .reduce((amount, item) => amount + Math.ceil(Math.max(0, item.amountCents - item.savedCents) / monthsUntil(monthNow, item.date)), 0);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={Target} title="Metas de economia"
          action={<AddAction text="Nova meta" onClick={() => edit({ mode: 'edit', kind: 'goal' })} />}>
          {goals.length === 0 ? <Empty>Crie uma meta com um valor que você quer guardar.</Empty> : (
            <>
              <Metrics><Metric label="Guardado nas metas" value={money(allSaved)} /><Metric label="Total das metas" value={money(goals.reduce((sum, goal) => sum + goal.amountCents, 0))} /></Metrics>
              <ul className={listClass}>
                {goals.map(goal => (
                  <li className={rowClass} key={goal.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{goal.name}</h3>
                        <p className="mt-0.5 text-xs text-text-muted">{money(goal.savedCents)} de {money(goal.amountCents)}{goal.date && ` · até ${displayDate(goal.date)}`}</p></div>
                      <RowActions edit={edit} item={goal} />
                    </div>
                    <ProgressBar label={`Meta ${goal.name}`} ratio={goal.savedCents / goal.amountCents} tone={goal.savedCents >= goal.amountCents ? 'success' : 'default'} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {goal.savedCents >= goal.amountCents ? <Badge variant="success">Meta atingida</Badge> : <p className="text-xs text-text-muted">Faltam {money(goal.amountCents - goal.savedCents)}</p>}
                      <Button type="button" size="sm" variant="secondary" className={compactButton} onClick={() => edit({ mode: 'progress', item: goal })}>Ajustar saldo</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <ReserveCalculator key={month} entries={entries} month={month} goal={reserve}
          onSave={async (amountCents, savedCents) => {
            await runAction(() => actions.save({
              kind: 'goal', name: reserve?.name || 'Reserva de emergência', amountCents, savedCents, emergency: true,
              ...(reserve?.date ? { date: reserve.date } : {}),
            }, reserve?.id || 'goal-reserve', reserve?.savedCents), 'Meta da reserva salva.');
          }} />
      </div>

      <Panel icon={CalendarClock} title="Provisões anuais" detail="Separe um pouco por mês para despesas como IPVA, seguro e matrícula."
        action={<AddAction text="Nova provisão" onClick={() => edit({ mode: 'edit', kind: 'provision' })} />}>
        {provisions.length === 0 ? <Empty>Cadastre uma despesa anual para calcular o aporte mensal até o vencimento.</Empty> : (
          <>
            <Metrics><Metric label="Aporte mensal sugerido" value={money(pendingProvision)} /><Metric label="Reservado nas provisões em aberto" value={money(provisions.filter(item => !item.paid).reduce((sum, item) => sum + item.savedCents, 0))} /></Metrics>
            <ul className="grid gap-3 lg:grid-cols-2">
              {[...provisions].sort((a, b) => Number(a.paid) - Number(b.paid) || a.date.localeCompare(b.date)).map(item => (
                <li key={item.id} className={rowClass}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-text-muted">Vencimento em {displayDate(item.date)} · {money(item.savedCents)} de {money(item.amountCents)}</p></div>
                    <RowActions edit={edit} item={item} allowEdit={!item.paid} />
                  </div>
                  <ProgressBar label={`Provisão ${item.name}`} ratio={item.paid ? 1 : item.savedCents / item.amountCents} tone={item.paid ? 'success' : 'default'} />
                  <div className="flex flex-wrap items-center gap-2">
                    {item.paid ? (
                      <><Badge variant="success">Paga</Badge><Button type="button" size="sm" variant="secondary" className={compactButton} disabled={busy}
                        onClick={() => void runAction(() => actions.finishProvision(item, true), 'Provisão renovada para o próximo ano.')}>Renovar para o próximo ano</Button></>
                    ) : (
                      <><span className="grow text-xs text-text-muted">{money(Math.ceil(Math.max(0, item.amountCents - item.savedCents) / monthsUntil(monthNow, item.date)))} por mês</span>
                        <Button type="button" size="sm" variant="ghost" className={compactButton} onClick={() => edit({ mode: 'progress', item })}>Ajustar saldo</Button>
                        <Button type="button" size="sm" variant="secondary" className={compactButton} disabled={busy}
                          onClick={() => void runAction(() => actions.finishProvision(item, false), 'Provisão registrada como paga.')}>Marcar paga</Button></>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

function DebtSection({ debts, finance, month, actions, edit, runAction, busy }: {
  debts: ItemOf<'debt'>[];
  finance: Props['finance'];
  month: string;
  actions: Planning;
  edit: Edit;
  runAction: RunAction;
  busy: boolean;
}) {
  const invoiceMap = new Map(finance.invoices.map(invoice => [`${invoice.cardId}:${invoice.month}`, invoice]));
  const cardNames = new Map(finance.cards.map(card => [card.id, card.name]));
  const cards = new Map<string, { name: string; bank: string; entries: LedgerEntry[]; outstanding: number; settled: number }>();
  function isPaid(entry: LedgerEntry) {
    const invoice: CardInvoice | undefined = invoiceMap.get(`${entry.cardId}:${entry.invoiceMonth}`);
    return invoice?.paidDate !== undefined || invoice?.totalCents === 0;
  }
  const installments = finance.entries.filter(entry => entry.kind === 'purchase' && entry.groupId && (entry.installmentCount ?? 0) > 1);
  installments.forEach(entry => {
    const id = entry.groupId as string;
    const existing = cards.get(id) ?? { name: entry.description, bank: cardNames.get(entry.cardId ?? '') ?? 'Cartão', entries: [], outstanding: 0, settled: 0 };
    existing.entries.push(entry);
    if (isPaid(entry)) existing.settled += 1;
    else existing.outstanding += entry.amountCents;
    cards.set(id, existing);
  });
  const openCredit = [...cards.values()].reduce((sum, item) => sum + item.outstanding, 0);
  const openPlans = debts.reduce((sum, item) => sum + remainingDebt(item), 0);
  const horizon = month.startsWith('9999-') ? Math.min(6, 13 - Number(month.slice(5))) : 6;
  const upcoming = Array.from({ length: horizon }, (_, index) => index ? shiftMonth(month, index) : month).map(affectedMonth => {
    const cardPayments = installments.filter(entry => entry.invoiceMonth === affectedMonth && !isPaid(entry)).reduce((total, entry) => total + entry.amountCents, 0);
    const [year, month] = affectedMonth.split('-').map(Number);
    const plans = debts.reduce((sum, debt) => {
      const [startYear, startMonth] = monthOf(debt.date).split('-').map(Number);
      const index = (year - startYear) * 12 + month - startMonth;
      return index >= debt.paidInstallments && index < debt.installments ? sum + debtPaymentAmount(debt, index) : sum;
    }, 0);
    return { month: affectedMonth, total: plans + cardPayments };
  });
  const max = Math.max(1, ...upcoming.map(item => item.total));
  const anyDebt = debts.length > 0 || cards.size > 0;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={Layers3} title="Planos de dívida e financiamento"
          action={<AddAction text="Novo plano" onClick={() => edit({ mode: 'edit', kind: 'debt' })} />}>
          {!debts.length ? <Empty>Acompanhe aqui as parcelas de um empréstimo, financiamento ou FIES.</Empty> : (
            <ul className={listClass}>
              {debts.map(debt => {
                const done = debt.paidInstallments === debt.installments;
                return (
                  <li key={debt.id} className={rowClass}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{debt.name}</h3><p className="mt-0.5 text-xs text-text-muted">{debtLabels[debt.debtType]} · {debt.paidInstallments} de {debt.installments} parcelas quitadas</p></div>
                      <RowActions edit={edit} item={debt} />
                    </div>
                    <ProgressBar label={`Parcelas quitadas de ${debt.name}`} ratio={debt.paidInstallments / debt.installments} tone={done ? 'success' : 'default'} />
                    <p className="text-xs text-text-muted">Pago {money(debtPaidAmount(debt))} · em aberto {money(remainingDebt(debt))}</p>
                    {!done && <p className="text-sm font-medium">Parcela {debt.paidInstallments + 1} · {money(debtPaymentAmount(debt, debt.paidInstallments))} em {displayDate(debtDueDate(debt, debt.paidInstallments))}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      {done ? <Badge variant="success">Quitado</Badge> : <Button type="button" size="sm" className={compactButton} disabled={busy}
                        onClick={() => void runAction(() => actions.trackDebt(debt, 1), 'Quitação da parcela registrada no plano.')}>Registrar parcela quitada</Button>}
                      {debt.paidInstallments > 0 && <Button type="button" size="sm" variant="ghost" className={compactButton} disabled={busy}
                        onClick={() => void runAction(() => actions.trackDebt(debt, -1), 'Registro da última parcela desfeito.')}>Desfazer última baixa</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel icon={CalendarClock} title="Compromissos nos próximos meses" detail="Parcelas de compras e planos de dívida em aberto.">
          {!anyDebt ? <Empty>As próximas parcelas aparecem aqui ao registrar uma compra parcelada ou um plano de dívida.</Empty> : (
            <>
              <Metrics><Metric label="Compras em aberto" value={money(openCredit)} /><Metric label="Planos em aberto" value={money(openPlans)} /></Metrics>
              <ul className="space-y-2.5">
                {upcoming.map(item => (
                  <li key={item.month} className="grid gap-1">
                    <div className="flex justify-between gap-2 text-xs"><span className="text-text-muted">{displayMonth(item.month)}</span><span className="font-semibold tabular-nums">{money(item.total)}</span></div>
                    <ProgressBar label={`Compromissos de ${displayMonth(item.month)}`} ratio={item.total / max} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <Panel icon={CreditCard} title="Compras parceladas no cartão" detail="A quitação acompanha o registro de pagamento das faturas na Carteira.">
        {!cards.size ? <Empty>Compras com mais de uma parcela aparecerão aqui automaticamente.</Empty> : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {[...cards.entries()].map(([id, item]) => {
              const next = item.entries.filter(entry => !isPaid(entry)).sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0))[0];
              return (
                <li key={id} className={rowClass}>
                  <h3 className="break-words text-sm font-semibold">{item.name}</h3>
                  <p className="text-xs text-text-muted">{item.bank} · {item.settled} de {item.entries.length} parcelas quitadas</p>
                  <ProgressBar label={`Parcelas quitadas da compra ${item.name}`} ratio={item.settled / item.entries.length} tone={next ? 'default' : 'success'} />
                  <p className="flex flex-wrap justify-between gap-2 text-xs text-text-muted">
                    <span>{next?.invoiceDueDate ? `Próxima em ${displayDate(next.invoiceDueDate)}` : 'Quitada'}</span>
                    <span>{money(item.outstanding)} em parcelas abertas</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function PurchaseSection({ finance, month, budgets, categories, envelopes, goals, distribution, wishes, actions, edit, runAction, busy }: {
  finance: Props['finance'];
  month: string;
  budgets: ItemOf<'budget'>[];
  categories: string[];
  envelopes: ItemOf<'envelope'>[];
  goals: ItemOf<'goal'>[];
  distribution?: ItemOf<'distribution'>;
  wishes: ItemOf<'wish'>[];
  actions: Planning;
  edit: Edit;
  runAction: RunAction;
  busy: boolean;
}) {
  const [receivedInput, setReceivedInput] = useState<string>();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const monthIncome = finance.entries.filter(entry => entry.kind === 'income' && entry.status !== 'pending' && getEntryMonth(entry) === month)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const receivedText = receivedInput ?? (monthIncome > 0 ? displayAmount(monthIncome) : '');
  const received = Math.max(parseMoney(receivedText) ?? 0, 0);
  const preview = envelopePreview(envelopes, received);
  const over = preview.totalBps > 10000;
  const unresolved = wishes.filter(wish => wish.decision === 'waiting').length;
  const avoided = wishes.filter(wish => wish.decision === 'skipped').reduce((sum, item) => sum + item.amountCents, 0);
  const byGoalId = new Map(goals.map(goal => [goal.id, goal.name]));
  const localizedPercent = (bps: number) => (bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={WalletCards} title="Envelopes de renda" detail="Divida a renda do mês por percentual e vincule parcelas a metas."
          action={<AddAction text="Novo envelope" onClick={() => edit({ mode: 'edit', kind: 'envelope' })} />}>
          <div className="grid gap-3">
            {distribution ? (
              <p className="rounded-2xl border border-accent-success/25 bg-accent-success/10 p-3 text-sm">Distribuição de {displayMonth(month)} registrada. <strong>{money(distribution.allocatedCents)}</strong> separados de {money(distribution.amountCents)}.</p>
            ) : (
              <AmountField label="Renda para distribuir (R$)" value={receivedText} onChange={event => setReceivedInput(event.target.value)} required={false} />
            )}
            {envelopes.length ? (
              <>
                <ul className={listClass}>
                  {envelopes.map(item => (
                    <li key={item.id} className={rowClass}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{item.name}</h3>
                          <p className="mt-0.5 text-xs text-text-muted">{localizedPercent(item.percentBps)}%{item.goalId ? ` · Meta: ${byGoalId.get(item.goalId) ?? 'vínculo a atualizar'}` : ''}</p></div>
                        <RowActions edit={edit} item={item} />
                      </div>
                      <ProgressBar ratio={item.percentBps / 10000} label={`Percentual do envelope ${item.name}`} />
                      {!distribution && received > 0 && <p className="text-sm font-semibold tabular-nums">{money(preview.allocations.get(item.id) ?? 0)}</p>}
                    </li>
                  ))}
                </ul>
                {!distribution && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-text-muted/15 bg-surface-bg/55 p-3">
                    <p className={`text-xs ${over ? 'text-accent-error' : 'text-text-muted'}`}>{localizedPercent(preview.totalBps)}% distribuídos
                      {over ? ' · revise as porcentagens para somar até 100%' : ` · ${money(received - preview.allocated)} livres`}</p>
                    <Button type="button" size="sm" className={compactButton} disabled={busy || over || preview.allocated <= 0}
                      onClick={() => void runAction(() => actions.distribute(month, received, envelopes), 'Distribuição registrada para o mês.')}>Registrar distribuição</Button>
                  </div>
                )}
              </>
            ) : <Empty>Crie envelopes como Essenciais, Lazer e Metas para montar sua divisão de renda.</Empty>}
          </div>
        </Panel>
        <PurchaseCalculator finance={finance} month={month} budgets={budgets} categories={categories}
          onWishlist={(name, amountCents) => runAction(() => actions.save({
            kind: 'wish', name, amountCents, createdAt: Date.now(), decision: 'waiting',
          }), 'Compra guardada na lista de 48 horas.')} />
      </div>
      <Panel icon={ShoppingBag} title="Lista de espera de 48 horas" detail="Guarde compras que podem esperar e decida depois do período de reflexão."
        action={<AddAction text="Adicionar desejo" onClick={() => edit({ mode: 'edit', kind: 'wish' })} />}>
        {!wishes.length ? <Empty>Adicione uma compra que você quer reconsiderar antes de decidir.</Empty> : (
          <>
            <Metrics><Metric label="Compras em avaliação" value={String(unresolved)} /><Metric label="Gastos evitados" value={money(avoided)} /></Metrics>
            <ul className="grid gap-3 lg:grid-cols-2">
              {[...wishes].sort((a, b) => Number(a.decision !== 'waiting') - Number(b.decision !== 'waiting') || b.createdAt - a.createdAt).map(wish => {
                const wait = Math.max(0, Math.ceil((wish.createdAt + WISH_COOLING_MS - Math.max(now, wish.createdAt)) / 3_600_000));
                return (
                  <li key={wish.id} className={rowClass}>
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{wish.name}</h3><p className="mt-0.5 text-sm font-semibold tabular-nums">{money(wish.amountCents)}</p></div>
                      <RowActions edit={edit} item={wish} allowEdit={wish.decision === 'waiting'} />
                    </div>
                    {wish.note && <p className="break-words text-xs text-text-muted">{wish.note}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      {wish.decision !== 'waiting' ? (
                        <Badge variant={wish.decision === 'skipped' ? 'success' : 'primary'}>{wish.decision === 'skipped' ? 'Compra dispensada' : 'Compra confirmada'}</Badge>
                      ) : (
                        <>
                          {wait > 0 ? <Badge variant="warning">{wait} h até a decisão</Badge> : <Button type="button" className={compactButton} size="sm" disabled={busy}
                            onClick={() => void runAction(() => actions.decideWish(wish, 'bought'), 'Decisão registrada.')}>Confirmar compra</Button>}
                          <Button type="button" size="sm" variant="ghost" className={compactButton} disabled={busy}
                            onClick={() => void runAction(() => actions.decideWish(wish, 'skipped'), 'Compra dispensada.')}>Dispensar compra</Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

export default function PlanningView({ uid, finance, month }: Props) {
  const [section, setSection] = useState<Section>('budget');
  const [editor, setEditor] = useState<PlanEditor | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const planning = useFinancePlanning(uid);
  const { items } = planning;
  const budgets = itemsOf(items, 'budget');
  const goals = itemsOf(items, 'goal');

  const categories = useMemo(() => [...new Map(
    [...suggestedCategories, ...finance.entries.flatMap(entry => entry.category ? [entry.category] : [])]
      .map(name => [categoryKey(name), name]),
  ).values()].sort((a, b) => a.localeCompare(b, 'pt-BR')), [finance.entries]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
      toast.success(message);
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-label="Planejamento pessoal" className="grid min-w-0 gap-4">
      <nav aria-label="Seções de planejamento" className="flex flex-wrap items-center gap-1.5">
        {tabs.map(({ id, name, icon: Icon }) => (
          <Button type="button" key={id} variant={section === id ? 'secondary' : 'ghost'} size="sm" aria-current={section === id ? 'page' : undefined}
            className={`min-h-9 gap-1.5 !rounded-xl ${section === id ? '!border-primary-500/35 !bg-primary-500/10 !text-primary-500' : ''}`}
            onClick={() => setSection(id)}><Icon size={15} aria-hidden="true" />{name}</Button>
        ))}
      </nav>
      {planning.loading ? <p role="status" className="py-5 text-sm text-text-muted">Carregando planejamento…</p>
        : planning.error ? <p role="alert" className="rounded-2xl border border-accent-error/25 bg-accent-error/10 px-4 py-3 text-sm text-accent-error">{planning.error}</p>
        : (
          <>
            {section === 'budget' && <BudgetSection month={month} budgets={budgets} entries={finance.entries}
              edit={setEditor} actions={planning} runAction={runAction} busy={busy} />}
            {section === 'goals' && <GoalsSection goals={goals} provisions={itemsOf(items, 'provision')} entries={finance.entries} month={month}
              actions={planning} edit={setEditor} runAction={runAction} busy={busy} />}
            {section === 'debts' && <DebtSection finance={finance} month={month} debts={itemsOf(items, 'debt')} actions={planning} edit={setEditor} runAction={runAction} busy={busy} />}
            {section === 'purchases' && <PurchaseSection key={month} finance={finance} month={month} budgets={budgets} categories={categories}
              envelopes={itemsOf(items, 'envelope')} goals={goals} distribution={itemsOf(items, 'distribution').find(item => item.month === month)}
              wishes={itemsOf(items, 'wish')} actions={planning} edit={setEditor} runAction={runAction} busy={busy} />}
          </>
        )}
      {editor && <PlanEditorModal editor={editor} month={month} categories={categories} goals={goals} actions={planning}
        onClose={() => setEditor(null)} onSuccess={message => { setEditor(null); toast.success(message); }} />}
    </section>
  );
}
