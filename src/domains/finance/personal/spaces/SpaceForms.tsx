import { cloneElement, useEffect, useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/design-system';
import { money, parseMoney, today } from '../ledger';
import {
  type ExpenseInput, type FinanceSpace, type FamilyTask, type InvitationRole,
  type Participant, type ParticipantInput, type SpaceKind, type SpaceSettings,
} from './spaceModel';

export const control = 'w-full min-w-0 rounded-xl border border-text-muted/25 bg-surface-bg px-3 py-2.5 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';
const moneyInput = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const read = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
export function cents(data: FormData, name: string) {
  const value = parseMoney(read(data, name) || '0');
  if (value === null || value < 0) throw new Error('Digite um valor positivo, com até duas casas decimais.');
  return value;
}

export function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5 text-sm text-text-main">
      <label htmlFor={id} className="font-medium">{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

function Amount({ name, label, initial, required = false }: {
  name: string; label: string; initial?: number; required?: boolean;
}) {
  return (
    <Field label={label}>
      <input name={name} inputMode="decimal" className={control} required={required}
        defaultValue={initial === undefined ? undefined : moneyInput.format(initial / 100)} placeholder="0,00" />
    </Field>
  );
}

interface ModalProps {
  title: string;
  children: ReactNode;
  dismiss: () => void;
  submit: (form: FormData) => Promise<void>;
  label?: string;
}

export function SpaceDialog({ title, children, dismiss, submit, label = 'Salvar' }: ModalProps) {
  const modal = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = modal.current;
    if (!element?.open) {
      element?.showModal();
      element?.querySelector<HTMLElement>('fieldset input, fieldset select')?.focus();
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await submit(new FormData(event.currentTarget));
      dismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={modal} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!saving.current) dismiss(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-[1.4rem] border border-text-muted/25 bg-surface-elevated text-text-main shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">{title}</h2>
          <Button type="button" variant="ghost" size="sm" aria-label="Fechar" disabled={busy} onClick={dismiss}><X size={18} /></Button>
        </div>
        <fieldset disabled={busy} className="grid min-w-0 gap-4">{children}</fieldset>
        {error && <p role="alert" className="rounded-xl bg-accent-error/10 p-3 text-sm text-accent-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={dismiss} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : label}</Button>
        </div>
      </form>
    </dialog>
  );
}

export function SettingsForm({ space }: { space?: FinanceSpace }) {
  const [kind, setKind] = useState<SpaceKind>(space?.kind ?? 'family');
  return (
    <>
      <Field label="Nome do espaço">
        <input name="name" required maxLength={80} defaultValue={space?.name}
          placeholder={kind === 'travel' ? 'Ex. Férias em julho' : 'Ex. Nossa casa'} className={control} />
      </Field>
      {space ? <input type="hidden" name="kind" value={kind} /> : (
        <Field label="Tipo">
          <select name="kind" className={control} value={kind} onChange={event => setKind(event.target.value as SpaceKind)}>
            <option value="family">Família</option>
            <option value="travel">Viagem</option>
          </select>
        </Field>
      )}
      {kind === 'travel' && <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ida"><input type="date" name="startsOn" className={control} required defaultValue={space?.startsOn} /></Field>
        <Field label="Volta"><input type="date" name="endsOn" className={control} required defaultValue={space?.endsOn} /></Field>
      </div>}
      <Amount name="budget" label={kind === 'travel' ? 'Orçamento da viagem (R$)' : 'Orçamento mensal (R$)'} initial={space?.budgetCents} />
      <Amount name="threshold" label="Pedir aprovação a partir de (R$)" initial={space?.approvalThresholdCents} />
      <p className="text-xs text-text-muted">Use zero para registrar despesas sem aprovação.</p>
    </>
  );
}

export function settingsFrom(data: FormData): SpaceSettings {
  return {
    name: read(data, 'name'), kind: read(data, 'kind') as SpaceKind,
    budgetCents: cents(data, 'budget'), approvalThresholdCents: cents(data, 'threshold'),
    startsOn: read(data, 'startsOn'), endsOn: read(data, 'endsOn'),
  };
}

export function InviteForm() {
  return <>
    <Field label="ID da conta no Hub">
      <input name="targetUid" className={control} required maxLength={128} autoComplete="off" spellCheck={false} />
    </Field>
    <p className="text-xs text-text-muted">Peça à pessoa o ID exibido na aba Espaços da conta dela.</p>
    <Field label="Acesso">
      <select name="role" className={control} defaultValue="editor">
        <option value="editor">Colaborador · registra despesas</option>
        <option value="viewer">Leitura · apenas consulta</option>
      </select>
    </Field>
  </>;
}

export function invitationFrom(data: FormData) {
  return { uid: read(data, 'targetUid'), role: read(data, 'role') as InvitationRole };
}

export function ExpenseForm({ people, uid }: { people: Participant[]; uid: string }) {
  const active = people.filter(person => person.active);
  const preferredPayer = active.find(person => person.id === uid)?.id ?? active[0]?.id;
  return <>
    <Field label="Descrição"><input name="name" className={control} required maxLength={140} placeholder="Ex. Compras da semana" /></Field>
    <div className="grid gap-3 sm:grid-cols-2">
      <Amount name="amount" label="Valor (R$)" required />
      <Field label="Data"><input name="date" className={control} type="date" required defaultValue={today()} /></Field>
    </div>
    <Field label="Categoria"><input name="category" className={control} maxLength={80} placeholder="Opcional" /></Field>
    <Field label="Quem pagou">
      <select name="paidBy" className={control} required defaultValue={preferredPayer}>
        {active.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}
      </select>
    </Field>
    <Field label="Rateio">
      <select name="split" className={control} defaultValue="equal">
        <option value="equal">Partes iguais</option>
        <option value="income">Proporcional à renda</option>
        <option value="none">Sem rateio</option>
      </select>
    </Field>
    <p className="text-xs text-text-muted">O rateio considera participantes ativos e usa partes iguais se nenhuma renda tiver sido preenchida.</p>
  </>;
}

export function expenseFrom(data: FormData): ExpenseInput {
  return {
    name: read(data, 'name'), category: read(data, 'category'), date: read(data, 'date'),
    paidBy: read(data, 'paidBy'), split: read(data, 'split') as ExpenseInput['split'], amountCents: cents(data, 'amount'),
  };
}

export function ParticipantForm({ person, kind }: { person?: Participant; kind: SpaceKind }) {
  const [dependent, setDependent] = useState(person?.dependent ?? false);
  return <>
    <Field label="Nome"><input name="name" className={control} required maxLength={80} defaultValue={person?.name} /></Field>
    <Amount name="income" label="Renda mensal para o rateio (R$)" initial={person?.incomeCents} />
    {kind === 'family' && <>
      <label className="flex items-center gap-2 text-sm">
        <input name="dependent" type="checkbox" checked={dependent}
          className="accent-primary-500" onChange={event => setDependent(event.target.checked)} /> Dependente
      </label>
      {dependent && <Amount name="allowance" label="Mesada mensal (R$)" initial={person?.allowanceCents} />}
    </>}
  </>;
}

export function participantFrom(data: FormData): ParticipantInput {
  return {
    name: read(data, 'name'), dependent: data.has('dependent'),
    incomeCents: cents(data, 'income'), allowanceCents: cents(data, 'allowance'),
  };
}

export function TaskForm({ people }: { people: Participant[] }) {
  return <>
    <Field label="Dependente">
      <select name="participantId" className={control} required>
        {people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select>
    </Field>
    <Field label="Tarefa"><input name="name" required maxLength={120} className={control} placeholder="Ex. Ajudar a organizar a casa" /></Field>
    <Amount name="amount" label="Bônus (R$)" required />
  </>;
}

export function RewardForm({ person, task }: { person: Participant; task?: FamilyTask }) {
  return <p className="text-sm text-text-muted">
    Registre {money(task?.amountCents ?? person.allowanceCents)} como {task ? 'bônus de tarefa' : 'mesada'} de {person.name} no mês selecionado.
  </p>;
}
