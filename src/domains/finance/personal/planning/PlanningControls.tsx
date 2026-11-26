import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Pencil, Plus, Trash2, X, type LucideIcon } from 'lucide-react';
import { Button, Card } from '@shared/design-system';
import { money, parseMoney, today } from '../ledger';
import {
  debtLabels, displayAmount, type DebtType, type ItemOf,
  MAX_DEBT_INSTALLMENTS, type PlanInput, type PlanItem,
} from './planningModel';
import type { useFinancePlanning } from './useFinancePlanning';

type EditableKind = Exclude<PlanInput['kind'], 'distribution'>;
type Editable = Exclude<PlanItem, { kind: 'distribution' }>;
export type PlanEditor =
  | { mode: 'edit'; kind: EditableKind; item?: Editable }
  | { mode: 'remove'; item: Editable }
  | { mode: 'progress'; item: ItemOf<'goal'> | ItemOf<'provision'> };

const singular: Record<EditableKind, string> = {
  budget: 'orçamento', goal: 'meta', provision: 'provisão', debt: 'plano de dívida', envelope: 'envelope', wish: 'desejo',
};

export const controlClass = 'min-h-10 w-full min-w-0 rounded-xl border border-text-muted/25 bg-surface-bg px-3 py-2 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-text-main"><span>{label}</span>{children}</label>;
}

export function AmountField({ label = 'Valor (R$)', name = 'amount', initial, value, onChange, placeholder = '0,00', required = true }: {
  label?: string;
  name?: string;
  initial?: number;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input name={name} aria-label={label} className={controlClass} inputMode="decimal" maxLength={20} placeholder={placeholder}
        defaultValue={initial === undefined ? undefined : displayAmount(initial)} value={value} onChange={onChange} required={required} />
    </Field>
  );
}

export function Panel({ icon: Icon, title, detail, action, children }: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="h-full !rounded-[1.25rem] !border-text-muted/20 p-4 sm:p-5" glass>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-500/12 text-primary-500"><Icon size={19} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="pt-0.5 text-lg font-semibold tracking-tight text-text-main">{title}</h2>
            {detail && <p className="mt-0.5 text-sm text-text-muted">{detail}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function AddAction({ text, onClick }: { text: string; onClick: () => void }) {
  return <Button type="button" variant="secondary" size="sm" className="min-h-9 gap-1.5 !rounded-xl !border-text-muted/20" onClick={onClick}><Plus size={15} aria-hidden="true" />{text}</Button>;
}

export function EditorActions({ item, onEdit, onRemove, allowEdit = true }: {
  item: Editable;
  onEdit: (item: Editable) => void;
  onRemove: (item: Editable) => void;
  allowEdit?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {allowEdit && <Button type="button" aria-label={`Editar ${item.name}`} title="Editar" variant="ghost" size="sm" className="min-h-9 !px-2.5" onClick={() => onEdit(item)}><Pencil size={15} /></Button>}
      <Button type="button" aria-label={`Excluir ${item.name}`} title="Excluir" variant="ghost" size="sm" className="min-h-9 !px-2.5 hover:!text-accent-error" onClick={() => onRemove(item)}><Trash2 size={15} /></Button>
    </div>
  );
}

export function ProgressBar({ ratio, label, tone = 'default' }: { ratio: number; label: string; tone?: 'danger' | 'success' | 'default' }) {
  const percent = Math.min(100, Math.max(0, ratio * 100));
  const color = tone === 'danger' ? 'bg-accent-error' : tone === 'success' ? 'bg-accent-success' : 'bg-primary-500';
  return <div className="h-2 overflow-hidden rounded-full bg-text-muted/15" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
    <div className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${color}`} style={{ width: `${percent}%` }} />
  </div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-text-muted/25 px-4 py-7 text-center text-sm text-text-muted">{children}</p>;
}

export function readAmount(data: FormData, name = 'amount', minimum = 1) {
  const value = parseMoney(String(data.get(name) ?? '')) ?? NaN;
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Informe um valor válido para continuar.');
  return value;
}

export function PlanEditorModal({ editor, month, categories, goals, actions, onClose, onSuccess }: {
  editor: PlanEditor;
  month: string;
  categories: string[];
  goals: ItemOf<'goal'>[];
  actions: ReturnType<typeof useFinancePlanning>;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const element = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const headingId = useId();
  const categoryList = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const modal = element.current;
    if (modal && !modal.open) {
      modal.showModal();
      modal.querySelector<HTMLElement>('[data-editor] input, [data-editor] select')?.focus();
    }
  }, []);
  const kind = editor.mode === 'edit' ? editor.kind : editor.item.kind;
  const item = editor.item;
  const isEditing = editor.mode === 'edit';
  const isDebtLocked = item?.kind === 'debt' && item.paidInstallments > 0;
  const names = kind === 'budget' ? 'Categoria' : 'Nome';
  const formTitle = editor.mode === 'remove'
    ? `Excluir ${singular[kind]}`
    : editor.mode === 'progress' ? `Ajustar saldo de ${editor.item.name}` : `${item ? 'Editar' : 'Adicionar'} ${singular[kind]}`;
  const dateLabel = kind === 'debt' ? 'Primeiro vencimento' : kind === 'provision' ? 'Vencimento' : 'Prazo da meta';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? '').trim();
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      if (editor.mode === 'remove') {
        await actions.remove(editor.item.id);
        onSuccess('Item excluído do planejamento.');
        return;
      }
      if (editor.mode === 'progress') {
        await actions.updateProgress(editor.item, readAmount(form) * (field('operation') === 'withdraw' ? -1 : 1));
        onSuccess('Progresso atualizado.');
        return;
      }

      const name = field('name');
      const date = field('date');
      const amountCents = editor.kind === 'envelope' ? 0
        : isDebtLocked && item?.kind === 'debt' ? item.amountCents : readAmount(form);
      let input: PlanInput;
      switch (editor.kind) {
        case 'budget':
          input = { kind: 'budget', name, month: item?.kind === 'budget' ? item.month : month, amountCents };
          break;
        case 'goal':
          input = {
            kind: 'goal', name, amountCents,
            savedCents: item?.kind === 'goal' ? item.savedCents : readAmount(form, 'initial', 0),
            ...(date ? { date } : {}),
          };
          break;
        case 'provision':
          input = {
            kind: 'provision', name, amountCents, date,
            savedCents: item?.kind === 'provision' ? item.savedCents : readAmount(form, 'initial', 0),
            paid: item?.kind === 'provision' && item.paid,
          };
          break;
        case 'debt':
          input = {
            kind: 'debt', name, amountCents,
            date: isDebtLocked && item?.kind === 'debt' ? item.date : date,
            debtType: field('debtType') as DebtType,
            installments: isDebtLocked && item?.kind === 'debt' ? item.installments : Number(field('installments')),
            paidInstallments: item?.kind === 'debt' ? item.paidInstallments : 0,
          };
          break;
        case 'envelope': {
          const percentBps = readAmount(form, 'percent');
          if (percentBps > 10000) throw new Error('Informe uma porcentagem de até 100%.');
          input = { kind: 'envelope', name, percentBps, ...(field('goalId') ? { goalId: field('goalId') } : {}) };
          break;
        }
        case 'wish':
          input = {
            kind: 'wish', name, amountCents,
            createdAt: item?.kind === 'wish' ? item.createdAt : Date.now(),
            decision: 'waiting',
            ...(field('note') ? { note: field('note') } : {}),
          };
          break;
      }

      await actions.save(input, item?.id);
      onSuccess(item ? 'Planejamento atualizado.' : 'Novo item salvo no planejamento.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar agora.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={element} aria-labelledby={headingId}
      className="m-auto max-h-[90dvh] w-[min(100%-2rem,32rem)] overflow-y-auto rounded-3xl border border-text-muted/20 bg-surface-elevated text-text-main shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <form className="grid gap-4 p-5 sm:p-6" onSubmit={submit}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="min-w-0 break-words text-xl font-semibold text-text-main">{formTitle}</h2>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose} aria-label="Fechar"><X size={18} /></Button>
        </div>
        <fieldset data-editor disabled={busy} className="grid min-w-0 gap-4">
          {editor.mode === 'remove' && <p className="text-sm text-text-muted">Confirma a exclusão de <strong className="text-text-main">{editor.item.name}</strong>?</p>}
          {editor.mode === 'progress' && (
            <>
              <p className="text-sm text-text-muted">Saldo registrado de {money(editor.item.savedCents)}.</p>
              <Field label="Operação">
                <select name="operation" aria-label="Operação" className={controlClass}>
                  <option value="contribute">Adicionar valor</option>
                  <option value="withdraw">Retirar valor</option>
                </select>
              </Field>
              <AmountField />
            </>
          )}
          {isEditing && (
            <>
              <Field label={names}>
                <input name="name" aria-label={names} list={kind === 'budget' ? categoryList : undefined}
                  className={controlClass} defaultValue={item?.name} maxLength={80} required />
              </Field>
              {kind === 'budget' && <datalist id={categoryList}>{categories.map(category => <option key={category} value={category} />)}</datalist>}
              {kind !== 'envelope' && !isDebtLocked && (
                <AmountField label={kind === 'budget' ? 'Limite mensal (R$)' : kind === 'debt' ? 'Total a pagar, com juros (R$)' : 'Valor (R$)'}
                  initial={item && 'amountCents' in item ? item.amountCents : undefined} />
              )}
              {!item && (kind === 'goal' || kind === 'provision') && <AmountField name="initial" label="Valor já guardado (R$)" initial={0} />}
              {(kind === 'goal' || kind === 'provision' || kind === 'debt') && !isDebtLocked && (
                <Field label={dateLabel}>
                  <input name="date" aria-label={dateLabel} className={controlClass} type="date"
                    min="1900-01-01" max="9999-12-31" required={kind !== 'goal'}
                    defaultValue={item && 'date' in item ? item.date : kind === 'goal' ? undefined : today()} />
                </Field>
              )}
              {kind === 'debt' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo de dívida">
                    <select name="debtType" aria-label="Tipo de dívida" className={controlClass} defaultValue={item?.kind === 'debt' ? item.debtType : 'loan'}>
                      {Object.entries(debtLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  {!isDebtLocked && (
                    <Field label="Quantidade de parcelas">
                      <input name="installments" aria-label="Quantidade de parcelas" type="number" min={1} max={MAX_DEBT_INSTALLMENTS}
                        className={controlClass} defaultValue={item?.kind === 'debt' ? item.installments : 1} required />
                    </Field>
                  )}
                </div>
              )}
              {kind === 'envelope' && (
                <>
                  <AmountField label="Porcentagem da renda (%)" name="percent" initial={item?.kind === 'envelope' ? item.percentBps : undefined} />
                  <Field label="Vincular a uma meta">
                    <select name="goalId" aria-label="Vincular a uma meta" className={controlClass} defaultValue={item?.kind === 'envelope' ? item.goalId ?? '' : ''}>
                      <option value="">Sem meta vinculada</option>
                      {goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                    </select>
                  </Field>
                </>
              )}
              {kind === 'wish' && (
                <Field label="Motivo da compra">
                  <textarea name="note" aria-label="Motivo da compra" className={controlClass} rows={3} maxLength={240}
                    defaultValue={item?.kind === 'wish' ? item.note : undefined} placeholder="Opcional" />
                </Field>
              )}
            </>
          )}
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-accent-error/12 px-3 py-2 text-sm text-accent-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant={editor.mode === 'remove' ? 'danger' : 'primary'} disabled={busy}>
            {busy ? 'Salvando…' : editor.mode === 'remove' ? 'Excluir item' : 'Salvar'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
