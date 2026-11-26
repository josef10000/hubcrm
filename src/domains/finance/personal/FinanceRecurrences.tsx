import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarPlus, CirclePause, Pencil, Plus, RefreshCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button } from '@shared/design-system';
import { money, parseMoney, today, type RecurringEntry, type RecurringEntryInput } from './ledger';
import type { usePersonalFinance } from './usePersonalFinance';

type Finance = ReturnType<typeof usePersonalFinance>;
const field = 'min-w-0 rounded-xl border border-text-muted/30 bg-surface-bg px-3 py-2.5 text-sm text-text-main';
const frequencyLabels = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
const formatNumber = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 });

function ScheduleDialog({ finance, existing, close }: { finance: Finance; existing?: RecurringEntry; close: () => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<RecurringEntryInput['kind']>(existing?.kind ?? (finance.accounts.some(account => !account.archived) ? 'expense' : 'purchase'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!modal.current?.open) modal.current?.showModal(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const value = parseMoney(text('amount'));
    if (value === null || value <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await finance.saveRecurrence({
        type: text('type') as RecurringEntryInput['type'],
        frequency: text('frequency') as RecurringEntryInput['frequency'],
        description: text('description'), kind, amountCents: value, startDate: text('start'),
        endDate: text('end') || undefined, category: text('category') || undefined,
        bankAccountId: kind === 'purchase' ? undefined : text('bankAccountId'),
        cardId: kind === 'purchase' ? text('cardId') : undefined,
        paused: form.has('paused'),
      }, existing?.id);
      toast.success('Recorrência salva.');
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a recorrência.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={modal} aria-labelledby="finance-recurrence-dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) close(); }}
      className="personal-finance-panel m-auto max-h-[90dvh] w-[min(calc(100%-2rem),34rem)] max-w-none overflow-auto p-5 text-text-main shadow-2xl backdrop:bg-black/65">
      <div className="flex items-center justify-between gap-2">
        <h2 id="finance-recurrence-dialog-title" className="text-lg font-semibold">{existing ? 'Editar recorrência' : 'Nova recorrência'}</h2>
        <Button variant="ghost" size="sm" aria-label="Fechar recorrência" onClick={close} disabled={busy}><X size={18} /></Button>
      </div>
      <form onSubmit={submit}>
        <fieldset className="mt-3 grid gap-3" disabled={busy}>
          <label className="grid gap-1 text-sm">Descrição<input name="description" className={field} required maxLength={160} defaultValue={existing?.description} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">Finalidade<select name="type" className={field} defaultValue={existing?.type || 'recurring'}>
              <option value="recurring">Lançamento recorrente</option><option value="subscription">Assinatura</option>
            </select></label>
            <label className="grid gap-1 text-sm">Frequência<select name="frequency" className={field} defaultValue={existing?.frequency || 'monthly'}>
              {Object.entries(frequencyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            <label className="grid gap-1 text-sm">Tipo<select name="kind" value={kind} className={field} onChange={event => setKind(event.target.value as RecurringEntryInput['kind'])}>
              <option value="expense">Despesa em conta</option><option value="income">Receita em conta</option><option value="purchase">Compra no cartão</option>
            </select></label>
            <label className="grid gap-1 text-sm">Valor (R$)<input name="amount" inputMode="decimal" className={field} required
              defaultValue={existing ? formatNumber.format(existing.amountCents / 100) : ''} placeholder="0,00" /></label>
            <label className="grid gap-1 text-sm">Início<input name="start" type="date" className={field} defaultValue={existing?.startDate || today()} required /></label>
            <label className="grid gap-1 text-sm">Término (opcional)<input name="end" type="date" className={field} defaultValue={existing?.endDate} /></label>
          </div>
          {kind === 'purchase' ? (
            <label className="grid gap-1 text-sm">Cartão<select name="cardId" className={field} required defaultValue={existing?.cardId || ''}>
              <option value="">Selecione um cartão</option>
              {finance.cards.filter(item => !item.archived || item.id === existing?.cardId).map(item => <option key={item.id} value={item.id}>{item.name}{item.archived ? ' (arquivado)' : ''}</option>)}
            </select></label>
          ) : (
            <label className="grid gap-1 text-sm">Conta<select name="bankAccountId" className={field} required defaultValue={existing?.bankAccountId || ''}>
              <option value="">Selecione uma conta</option>
              {finance.accounts.filter(item => !item.archived || item.id === existing?.bankAccountId).map(item => <option key={item.id} value={item.id}>{item.name}{item.archived ? ' (arquivada)' : ''}</option>)}
            </select></label>
          )}
          <label className="grid gap-1 text-sm">Categoria<input name="category" className={field} maxLength={80} defaultValue={existing?.category} /></label>
          <label className="flex items-center gap-2 text-sm"><input name="paused" type="checkbox" defaultChecked={existing?.paused} /> Pausar futuras gerações</label>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-accent-error">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar recorrência'}</Button>
        </div>
      </form>
    </dialog>
  );
}

export default function FinanceRecurrences({ finance, month }: { finance: Finance; month: string }) {
  const [form, setForm] = useState<{ existing?: RecurringEntry } | null>(null);
  const [busy, setBusy] = useState(false);
  const canSchedule = finance.accounts.some(account => !account.archived) || finance.cards.some(card => !card.archived);
  const recurrences = finance.recurrences;

  async function run(operation: () => Promise<string>) {
    setBusy(true);
    try { toast.success(await operation()); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'A operação não foi concluída.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <section className="personal-finance-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><CalendarPlus size={18} className="text-primary-500" aria-hidden="true" /> Recorrências e assinaturas</h2>
            <p className="mt-1 text-sm text-text-muted">Ao gerar o mês, cobranças em conta entram como pendentes. Compras entram na fatura do cartão.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5" disabled={busy || !recurrences.some(rule => !rule.paused)} onClick={() => void run(async () => {
              const count = await finance.generateRecurrences(month);
              return count ? `${count} ${count === 1 ? 'lançamento gerado' : 'lançamentos gerados'}.` : 'O mês já está em dia.';
            })}><RefreshCcw size={15} aria-hidden="true" /> Gerar lançamentos do mês</Button>
            <Button size="sm" className="gap-1.5" disabled={!canSchedule || busy} onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Nova recorrência</Button>
          </div>
        </div>
        {!canSchedule && <p className="mt-3 text-sm text-text-muted">Cadastre uma conta ou um cartão para vincular as cobranças.</p>}
      </section>
      {(['subscription', 'recurring'] as const).map(type => {
        const group = recurrences.filter(rule => rule.type === type);
        return (
          <section key={type} className="personal-finance-panel overflow-hidden">
            <h2 className="border-b border-text-muted/18 px-4 py-3 font-semibold">{type === 'subscription' ? 'Assinaturas' : 'Outras recorrências'}</h2>
            {group.length ? <ul className="divide-y divide-text-muted/15">{group.map(rule => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="break-words font-semibold">{rule.description}</p>
                  <p className="text-sm text-text-muted">{frequencyLabels[rule.frequency]} · <span data-finance-value>{money(rule.amountCents)}</span></p></div>
                <div className="flex flex-wrap gap-1.5">
                  {rule.paused && <Badge variant="warning">Pausada</Badge>}
                  <Button variant="ghost" size="sm" className="gap-1" disabled={busy} onClick={() => setForm({ existing: rule })}><Pencil size={14} aria-hidden="true" /> Editar</Button>
                  {rule.paused ? (
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void run(async () => {
                      const { id, ...input } = rule;
                      await finance.saveRecurrence({ ...input, paused: false }, id);
                      return 'Recorrência reativada.';
                    })}>Reativar</Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled={busy} className="gap-1" onClick={() => void run(async () => {
                      await finance.archiveRecurrence(rule.id);
                      return 'Recorrência pausada.';
                    })}><CirclePause size={14} aria-hidden="true" /> Pausar</Button>
                  )}
                </div>
              </li>
            ))}</ul> : <p className="p-4 text-sm text-text-muted">{type === 'subscription' ? 'Nenhuma assinatura cadastrada.' : 'Nenhum lançamento recorrente cadastrado.'}</p>}
          </section>
        );
      })}
      {form && <ScheduleDialog finance={finance} existing={form.existing} close={() => setForm(null)} />}
    </div>
  );
}
