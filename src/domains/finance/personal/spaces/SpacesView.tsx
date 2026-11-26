import { useState, type ReactNode } from 'react';
import {
  Archive, ArrowRight, CalendarDays, Check, ClipboardCheck, Copy, GitPullRequestArrow, LockKeyhole, Pencil, Plane,
  Plus, ReceiptText, Settings2, ShieldCheck, Sparkles, UserRound, UsersRound, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { Badge, Button, Card } from '@shared/design-system';
import { money, monthOf } from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import {
  ExpenseForm, expenseFrom, Field, InviteForm, invitationFrom, participantFrom, ParticipantForm, read,
  RewardForm, SettingsForm, settingsFrom, SpaceDialog, TaskForm, cents, control,
} from './SpaceForms';
import {
  expenseStatuses, participantBalances, roleLabels, spaceKinds, suggestedSettlements, taskStates,
  type FamilyTask, type FinanceSpace, type InvitationRole, type Participant, type SpaceExpense, type SpaceInvitation,
} from './spaceModel';
import { useFinanceSpaces, useSpaceDetails } from './useFinanceSpaces';

export interface SpacesProps {
  uid: string;
  finance: ReturnType<typeof usePersonalFinance>;
  month: string;
}

type Section = 'expenses' | 'people' | 'family';

type SpaceAction =
  | { type: 'settings' | 'archiveSpace' | 'invite' | 'expense' | 'task' }
  | { type: 'person'; person?: Participant }
  | { type: 'role'; memberUid: string }
  | { type: 'remove'; memberUid: string }
  | { type: 'reward'; person: Participant; task?: FamilyTask };

const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const formatDay = (date: string) => dateFormat.format(new Date(`${date}T12:00:00Z`));
const sectionLabels = {
  expenses: { label: 'Despesas', icon: ReceiptText },
  people: { label: 'Pessoas e rateio', icon: UsersRound },
  family: { label: 'Mesadas e tarefas', icon: Sparkles },
} as const;

const panel = 'rounded-[1.25rem] border-text-muted/15';

function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-text-main">{title}</h3>
        {detail && <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-text-muted/20 px-4 py-6 text-center text-sm text-text-muted">{children}</p>;
}

async function copyId(id: string, message: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success(message);
  } catch {
    toast.error('Selecione o identificador para copiá-lo.');
  }
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function IdPanel({ uid }: { uid: string }) {
  return (
    <Card className={`${panel} p-4`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
        <ShieldCheck size={16} className="text-primary-400" aria-hidden="true" /> Seu ID para convites
      </div>
      <div className="mt-2 flex min-w-0 gap-1.5">
        <input className={`${control} font-mono !text-xs`} aria-label="Seu ID para convites" value={uid} readOnly
          onFocus={event => event.currentTarget.select()} />
        <Button variant="outline" size="sm" onClick={() => void copyId(uid, 'ID copiado.')} aria-label="Copiar meu ID">
          <Copy size={15} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

function Invitations({ invitations, accept, dismiss, busy }: {
  invitations: SpaceInvitation[];
  accept: (invitation: SpaceInvitation) => void;
  dismiss: (invitation: SpaceInvitation) => void;
  busy: boolean;
}) {
  if (!invitations.length) return null;
  return (
    <Card className={`${panel} p-4 sm:p-5`}>
      <PanelTitle title="Convites recebidos" />
      <ul className="mt-3 divide-y divide-text-muted/15">
        {invitations.map(invitation => (
          <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-text-main">{invitation.spaceName}</p>
              <p className="text-xs text-text-muted">{roleLabels[invitation.role]}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => accept(invitation)} disabled={busy}>Aceitar</Button>
              <Button variant="ghost" size="sm" onClick={() => dismiss(invitation)} disabled={busy}>Recusar</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SpaceOverview({ space, expenses, canManage, openSettings, openArchive }: {
  space: FinanceSpace; expenses: SpaceExpense[]; canManage: boolean; openSettings: () => void; openArchive: () => void;
}) {
  const spending = expenses.filter(expense => expense.status === 'approved').reduce((total, expense) => total + expense.amountCents, 0);
  const pending = expenses.filter(expense => expense.status === 'pending');
  const percentage = space.budgetCents > 0 ? Math.round(100 * spending / space.budgetCents) : 0;
  const balance = space.budgetCents - spending;
  const Icon = space.kind === 'travel' ? Plane : UsersRound;
  return (
    <Card className={`${panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500/12 text-primary-400">
            <Icon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">
              {spaceKinds[space.kind]}{space.archived ? ' · Arquivado' : ''}
            </p>
            <h2 className="break-words text-xl font-semibold tracking-tight text-text-main">{space.name}</h2>
            {space.kind === 'travel' && <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
              <CalendarDays size={13} aria-hidden="true" /> {formatDay(space.startsOn)} a {formatDay(space.endsOn)}
            </p>}
          </div>
        </div>
        {canManage && <div className="flex flex-wrap gap-1">
          {!space.archived && <Button size="sm" variant="outline" className="gap-1.5" onClick={openSettings}>
            <Settings2 size={14} aria-hidden="true" /> Configurar
          </Button>}
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={openArchive}>
            <Archive size={14} aria-hidden="true" /> {space.archived ? 'Reativar espaço' : 'Arquivar espaço'}
          </Button>
        </div>}
      </div>
      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3 border-t border-text-muted/15 pt-4">
        <div><p className="text-xs text-text-muted">Despesas aprovadas</p><p className="mt-1 text-xl font-semibold tabular-nums">{money(spending)}</p></div>
        <div><p className="text-xs text-text-muted">{space.kind === 'travel' ? 'Orçamento da viagem' : 'Orçamento do mês'}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{space.budgetCents ? money(space.budgetCents) : '—'}</p>
        </div>
        <div><p className="text-xs text-text-muted">Saldo do orçamento</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${balance < 0 && space.budgetCents ? 'text-accent-error' : 'text-text-main'}`}>
            {space.budgetCents ? money(balance) : '—'}
          </p>
        </div>
      </div>
      {space.budgetCents > 0 && <div className="mt-3">
        <progress className="sr-only" value={Math.min(percentage, 100)} max={100} aria-label="Orçamento consumido" />
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-text-muted/15">
          <div className={`h-full rounded-full ${percentage > 100 ? 'bg-accent-error' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-text-muted">{percentage}% utilizado</p>
      </div>}
      {pending.length > 0 && <p className="mt-3 text-xs font-medium text-accent-warning">
        {pending.length} {pending.length === 1 ? 'despesa aguardando' : 'despesas aguardando'} aprovação
      </p>}
    </Card>
  );
}

function ExpensesPanel({ expenses, peopleName, canWrite, canManage, busy, create, decide }: {
  expenses: SpaceExpense[];
  peopleName: (id: string) => string;
  canWrite: boolean;
  canManage: boolean;
  busy: boolean;
  create: () => void;
  decide: (expense: SpaceExpense, state: 'approved' | 'rejected') => void;
}) {
  return (
    <Card className={`${panel} space-y-4 p-4 sm:p-5`}>
      <PanelTitle title="Despesas compartilhadas"
        action={canWrite && <Button size="sm" className="gap-1.5" onClick={create} disabled={busy}><Plus size={16} aria-hidden="true" /> Despesa</Button>} />
      {expenses.length === 0 ? <Empty>Nenhuma despesa neste período.</Empty> : (
        <ul className="divide-y divide-text-muted/15">
          {expenses.map(expense => (
            <li key={expense.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-500/10 text-primary-400">
                  <ReceiptText size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-text-main">{expense.name}</p>
                  <p className="mt-0.5 break-words text-xs text-text-muted">{[
                    formatDay(expense.date), peopleName(expense.paidBy), expense.category,
                    expense.split === 'income' ? 'Rateio por renda' : expense.split === 'equal' ? 'Rateio igual' : '',
                  ].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums text-text-main">{money(expense.amountCents)}</span>
                {expense.status !== 'approved' && <Badge variant={expense.status === 'pending' ? 'warning' : 'danger'}>
                  {expenseStatuses[expense.status]}
                </Badge>}
                {canManage && expense.status === 'pending' && <>
                  <Button variant="outline" size="sm" className="gap-1" disabled={busy} onClick={() => decide(expense, 'approved')}>
                    <Check size={13} aria-hidden="true" /> Aprovar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1" disabled={busy} onClick={() => decide(expense, 'rejected')}>
                    <X size={13} aria-hidden="true" /> Recusar
                  </Button>
                </>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PeoplePanel({ space, people, name, expenses, canManage, busy, open, toggle, outgoing, dismiss }: {
  space: FinanceSpace;
  people: Participant[];
  name: (id: string) => string;
  expenses: SpaceExpense[];
  canManage: boolean;
  busy: boolean;
  open: (action: SpaceAction) => void;
  toggle: (person: Participant) => void;
  outgoing: SpaceInvitation[];
  dismiss: (invitation: SpaceInvitation) => void;
}) {
  const outstanding = suggestedSettlements(participantBalances(expenses));
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card className={`${panel} space-y-4 p-4 sm:p-5`}>
        <PanelTitle title="Participantes do rateio"
          action={canManage && !space.archived && <Button className="gap-1.5" size="sm" variant="outline" onClick={() => open({ type: 'person' })}>
            <Plus size={15} aria-hidden="true" /> Participante
          </Button>} />
        <ul className="divide-y divide-text-muted/15">
          {people.map(person => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-text-main">{person.name}</p>
                <p className="text-xs text-text-muted">{[
                  person.dependent ? 'Dependente' : 'Participante',
                  person.incomeCents ? money(person.incomeCents) + ' em renda' : '',
                  !person.active ? 'Inativo no rateio' : '',
                ].filter(Boolean).join(' · ')}</p>
              </div>
              {canManage && !space.archived && <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" aria-label={`Editar ${person.name}`}
                  onClick={() => open({ type: 'person', person })}><Pencil size={14} aria-hidden="true" /></Button>
                <Button size="sm" variant="ghost" disabled={busy || (person.linkedUid !== '' && space.memberIds.includes(person.linkedUid))}
                  onClick={() => toggle(person)}>{person.active ? 'Retirar do rateio' : 'Reativar'}</Button>
              </div>}
            </li>
          ))}
        </ul>
        <div className="border-t border-text-muted/15 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-main">
            <GitPullRequestArrow size={15} aria-hidden="true" className="text-primary-400" /> Acertos sugeridos
          </p>
          {outstanding.length === 0 ? <p className="text-xs text-text-muted">Nenhum saldo a acertar nas despesas aprovadas do período.</p> : (
            <ul className="space-y-1.5">
              {outstanding.map((item, index) => <li key={`${item.from}:${item.to}:${index}`}
                className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-muted">
                <span className="break-all">{name(item.from)}</span><ArrowRight size={13} aria-label="para" />
                <span className="break-all">{name(item.to)}</span><strong className="ml-auto whitespace-nowrap text-text-main">{money(item.amountCents)}</strong>
              </li>)}
            </ul>
          )}
        </div>
      </Card>

      <Card className={`${panel} space-y-4 p-4 sm:p-5`}>
        <PanelTitle title="Contas com acesso"
          action={canManage && !space.archived && <Button className="gap-1.5" size="sm" variant="outline" onClick={() => open({ type: 'invite' })}>
            <Plus size={15} aria-hidden="true" /> Convidar
          </Button>} />
        <ul className="divide-y divide-text-muted/15">
          {space.memberIds.map(id => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-text-main">{name(id)}</p>
                <p className="text-xs text-text-muted">{roleLabels[space.memberRoles[id]]}</p>
              </div>
              {canManage && id !== space.ownerId && <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => open({ type: 'role', memberUid: id })}>Alterar acesso</Button>
                <Button size="sm" variant="ghost" onClick={() => open({ type: 'remove', memberUid: id })}>Revogar</Button>
              </div>}
            </li>
          ))}
        </ul>
        {outgoing.length > 0 && <div className="border-t border-text-muted/15 pt-3">
          <h4 className="mb-1 text-sm font-semibold text-text-main">Convites enviados</h4>
          <ul className="divide-y divide-text-muted/15">
            {outgoing.map(invitation => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <code className="min-w-0 break-all text-xs text-text-muted" title={invitation.invitedUid}>{shortId(invitation.invitedUid)}</code>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => dismiss(invitation)}>Cancelar convite</Button>
            </li>)}
          </ul>
        </div>}
      </Card>
    </div>
  );
}

function FamilyPanel({ people, tasks, expenseIds, month, canManage, busy, open, complete, remove }: {
  people: Participant[];
  tasks: FamilyTask[];
  expenseIds: ReadonlySet<string>;
  month: string;
  canManage: boolean;
  busy: boolean;
  open: (action: SpaceAction) => void;
  complete: (task: FamilyTask) => void;
  remove: (task: FamilyTask) => void;
}) {
  const dependents = people.filter(person => person.dependent && person.active);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card className={`${panel} space-y-4 p-4 sm:p-5`}>
        <PanelTitle title="Mesadas do mês" />
        {!dependents.length ? <Empty>Cadastre um dependente em Pessoas e rateio.</Empty> : (
          <ul className="divide-y divide-text-muted/15">
            {dependents.map(person => {
              const logged = expenseIds.has(`allowance-${person.id}-${month}`);
              return (
                <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-text-main">{person.name}</p>
                    <p className="text-xs text-text-muted">{person.allowanceCents ? money(person.allowanceCents) : 'Sem valor definido'}</p>
                  </div>
                  {logged ? <Badge variant="success">Registrada</Badge> : canManage && <Button size="sm" variant="outline"
                    disabled={busy || !person.allowanceCents} onClick={() => open({ type: 'reward', person })}>Registrar mesada</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card className={`${panel} space-y-4 p-4 sm:p-5`}>
        <PanelTitle title="Tarefas com bônus" action={canManage && <Button className="gap-1.5" size="sm" variant="outline"
          disabled={!dependents.length} onClick={() => open({ type: 'task' })}><Plus size={15} aria-hidden="true" /> Tarefa</Button>} />
        {tasks.length === 0 ? <Empty>Nenhuma tarefa registrada.</Empty> : (
          <ul className="divide-y divide-text-muted/15">
            {tasks.map(task => {
              const person = people.find(item => item.id === task.participantId);
              return <li key={task.id} className="space-y-2 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-text-main">{task.name}</p>
                    <p className="break-words text-xs text-text-muted">{person?.name ?? 'Dependente'} · {money(task.amountCents)}</p>
                  </div>
                  <Badge variant={task.state === 'paid' ? 'success' : 'primary'}>{taskStates[task.state]}</Badge>
                </div>
                {canManage && task.state !== 'paid' && <div className="flex flex-wrap gap-1.5">
                  {task.state === 'open' && <Button variant="outline" size="sm" disabled={busy} onClick={() => complete(task)}>Concluir</Button>}
                  {task.state === 'done' && person?.active && person.dependent && <Button variant="outline" size="sm" disabled={busy}
                    onClick={() => open({ type: 'reward', person, task })}>Registrar bônus</Button>}
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(task)}>Excluir tarefa</Button>
                </div>}
              </li>;
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MemberSpace({ space, uid, month, directories }: {
  space: FinanceSpace; uid: string; month: string; directories: ReturnType<typeof useFinanceSpaces>;
}) {
  const [section, setSection] = useState<Section>('expenses');
  const [action, setAction] = useState<SpaceAction | null>(null);
  const [busy, setBusy] = useState(false);
  const data = useSpaceDetails(uid, space.id);
  const canManage = uid === space.ownerId;
  const canWrite = !space.archived && (canManage || space.memberRoles[uid] === 'editor');
  const people = [...data.participants];
  for (const id of space.memberIds) {
    if (!people.some(person => person.id === id)) {
      people.push({
        id, name: id === uid ? 'Você' : `Conta ${shortId(id)}`, active: true, linkedUid: id,
        incomeCents: 0, allowanceCents: 0, dependent: false,
      });
    }
  }
  const name = (id: string) => people.find(person => person.id === id)?.name ?? `Conta ${shortId(id)}`;
  const expenses = data.expenses.filter(expense => (space.kind === 'travel' || monthOf(expense.date) === month) &&
    expense.date && Number.isInteger(expense.amountCents))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'pt-BR'));
  const expenseIds = new Set(data.expenses.map(expense => expense.id));
  const sectionItems: Section[] = space.kind === 'family' ? ['expenses', 'people', 'family'] : ['expenses', 'people'];

  async function perform(callback: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    try {
      await callback();
      toast.success(success);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível atualizar o espaço.');
    } finally {
      setBusy(false);
    }
  }

  const dismissAction = () => setAction(null);

  function renderDialog() {
    if (!action) return null;
    if (action.type === 'settings') return <SpaceDialog title="Configurar espaço" dismiss={dismissAction}
      submit={async form => { await directories.updateSpace(space.id, settingsFrom(form)); toast.success('Espaço atualizado.'); }}>
      <SettingsForm space={space} />
    </SpaceDialog>;
    if (action.type === 'archiveSpace') return <SpaceDialog title={space.archived ? 'Reativar espaço' : 'Arquivar espaço'}
      dismiss={dismissAction} label={space.archived ? 'Reativar' : 'Arquivar'}
      submit={async () => {
        await directories.archiveSpace(space.id, !space.archived);
        toast.success(space.archived ? 'Espaço reativado.' : 'Espaço arquivado.');
      }}>
      <p className="text-sm text-text-muted">{space.archived
        ? 'O espaço voltará a receber despesas, tarefas e convites.'
        : 'As pessoas com acesso poderão consultar o histórico enquanto o espaço estiver arquivado.'}</p>
    </SpaceDialog>;
    if (action.type === 'invite') return <SpaceDialog title="Convidar para o espaço" dismiss={dismissAction} label="Enviar convite"
      submit={async form => {
        const invitation = invitationFrom(form);
        await directories.invite(space, invitation.uid, invitation.role);
        toast.success('Convite enviado para a conta do Hub.');
      }}><InviteForm /></SpaceDialog>;
    if (action.type === 'expense') return <SpaceDialog title="Nova despesa compartilhada" dismiss={dismissAction}
      submit={async form => { await data.saveExpense(space, expenseFrom(form), people); toast.success('Despesa registrada.'); }}>
      <ExpenseForm people={people} uid={uid} />
    </SpaceDialog>;
    if (action.type === 'person') return <SpaceDialog title={action.person ? 'Editar participante' : 'Novo participante'} dismiss={dismissAction}
      submit={async form => { await data.saveParticipant(participantFrom(form), action.person); toast.success('Participante salvo.'); }}>
      <ParticipantForm person={action.person} kind={space.kind} />
    </SpaceDialog>;
    if (action.type === 'role') return <SpaceDialog title="Alterar acesso" dismiss={dismissAction}
      submit={async form => {
        await directories.changeRole(space.id, action.memberUid, read(form, 'role') as InvitationRole);
        toast.success('Permissão atualizada.');
      }}>
      <Field label="Papel">
        <select defaultValue={space.memberRoles[action.memberUid]} name="role" className={control}>
          <option value="editor">Colaborador</option><option value="viewer">Leitura</option>
        </select>
      </Field>
    </SpaceDialog>;
    if (action.type === 'remove') return <SpaceDialog title="Revogar acesso ao espaço" dismiss={dismissAction} label="Revogar"
      submit={async () => { await directories.removeMember(space.id, action.memberUid); toast.success('Acesso revogado.'); }}>
      <p className="text-sm text-text-muted">{name(action.memberUid)} perderá a permissão para consultar e registrar dados neste espaço. Os lançamentos já registrados ficam no histórico.</p>
    </SpaceDialog>;
    if (action.type === 'task') return <SpaceDialog title="Nova tarefa com bônus" dismiss={dismissAction}
      submit={async form => { await data.saveTask(read(form, 'participantId'), read(form, 'name'), cents(form, 'amount')); toast.success('Tarefa criada.'); }}>
      <TaskForm people={people.filter(person => person.active && person.dependent)} />
    </SpaceDialog>;
    if (action.type === 'reward') return <SpaceDialog title={action.task ? 'Registrar bônus' : 'Registrar mesada'} dismiss={dismissAction} label="Registrar"
      submit={async () => {
        const logged = await data.logFamilyReward(action.person.id, month, action.task?.id);
        toast.success(logged ? 'Despesa registrada.' : 'A despesa já consta no espaço.');
      }}><RewardForm person={action.person} task={action.task} /></SpaceDialog>;
    return null;
  }

  return (
    <div className="min-w-0 space-y-4">
      <SpaceOverview space={space} expenses={expenses} canManage={canManage} openSettings={() => setAction({ type: 'settings' })}
        openArchive={() => setAction({ type: 'archiveSpace' })} />
      {data.error && <p role="alert" className="rounded-xl bg-accent-error/10 p-3 text-sm text-accent-error">{data.error}</p>}
      {data.loading && <p role="status" className="rounded-xl p-3 text-sm text-text-muted">Carregando espaço…</p>}
      {!data.loading && !data.error && <>
        <nav aria-label="Navegação do espaço" className="flex flex-wrap gap-1 rounded-xl border border-text-muted/15 bg-surface-elevated p-1">
          {sectionItems.map(id => {
            const { label, icon: Icon } = sectionLabels[id];
            return <Button key={id} variant={section === id ? 'outline' : 'ghost'} size="sm" className="gap-1.5"
              aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>
              <Icon size={14} aria-hidden="true" /> {label}
            </Button>;
          })}
        </nav>
        {section === 'expenses' && <ExpensesPanel expenses={expenses} peopleName={name} canWrite={canWrite} canManage={canManage && !space.archived} busy={busy}
          create={() => setAction({ type: 'expense' })} decide={(expense, state) => void perform(
            () => data.setApproval(expense.id, state), state === 'approved' ? 'Despesa aprovada.' : 'Despesa recusada.',
          )} />}
        {section === 'people' && <PeoplePanel space={space} people={people} name={name} expenses={expenses}
          outgoing={directories.outgoing.filter(invitation => invitation.spaceId === space.id)} canManage={canManage} busy={busy} open={setAction}
          dismiss={invitation => void perform(() => directories.dismiss(invitation), 'Convite cancelado.')}
          toggle={person => void perform(() => data.archiveParticipant(person.id, !person.active), 'Participação atualizada.')} />}
        {section === 'family' && <FamilyPanel people={people} tasks={data.tasks} expenseIds={expenseIds} month={month}
          canManage={canManage && !space.archived} busy={busy} open={setAction} complete={task => void perform(() => data.completeTask(task.id), 'Tarefa concluída.')}
          remove={task => void perform(() => data.deleteTask(task.id), 'Tarefa excluída.')} />}
      </>}
      {renderDialog()}
    </div>
  );
}

export default function SpacesView({ uid, month }: SpacesProps) {
  const directories = useFinanceSpaces(uid);
  const { user, userProfile } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const spaces = [...directories.spaces].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const selected = spaces.find(space => space.id === selectedId) ?? spaces[0];

  async function respond(invitation: SpaceInvitation, accept: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (accept) {
        await directories.accept(invitation);
        setSelectedId(invitation.spaceId);
      } else await directories.dismiss(invitation);
      toast.success(accept ? 'Convite aceito.' : 'Convite recusado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível responder ao convite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className={`${panel} flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500/12 text-primary-400">
            <LockKeyhole size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-text-main">Espaços compartilhados</h2>
            <p className="mt-0.5 text-sm text-text-muted">Organize despesas de família ou viagem com as pessoas que você convidar. Sua carteira e seu extrato pessoal ficam privados.</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" disabled={directories.loading} onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Novo espaço</Button>
      </Card>
      {directories.error && <p role="alert" className="rounded-xl bg-accent-error/10 p-3 text-sm text-accent-error">{directories.error}</p>}
      <Invitations invitations={directories.incoming} accept={invitation => void respond(invitation, true)}
        dismiss={invitation => void respond(invitation, false)} busy={busy} />
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card className={`${panel} p-4`}>
            <h3 className="mb-2 text-sm font-semibold text-text-main">Seus espaços</h3>
            {directories.loading ? <p role="status" className="text-xs text-text-muted">Carregando espaços…</p>
              : spaces.length === 0 ? <p className="text-xs text-text-muted">Crie um espaço ou aceite um convite.</p>
                : <nav aria-label="Seus espaços" className="grid min-w-0 gap-1">
                  {spaces.map(space => {
                    const Icon = space.kind === 'travel' ? Plane : UsersRound;
                    return (
                      <Button key={space.id} variant={space.id === selected?.id ? 'outline' : 'ghost'} size="sm"
                        aria-current={space.id === selected?.id ? 'page' : undefined}
                        className="min-w-0 !justify-start gap-2 text-left" onClick={() => setSelectedId(space.id)}>
                        <Icon size={15} className="shrink-0" aria-hidden="true" /> <span className="truncate">{space.name}{space.archived ? " · Arquivado" : ""}</span>
                      </Button>
                    );
                  })}
                </nav>}
          </Card>
          <IdPanel uid={uid} />
        </div>
        {selected ? <MemberSpace key={selected.id} space={selected} uid={uid} month={month} directories={directories} />
          : !directories.loading && !directories.error && <Card className={`${panel} grid justify-items-center gap-3 p-6 text-center sm:p-8`}>
            <UserRound size={26} className="text-primary-400" aria-hidden="true" />
            <h3 className="font-semibold text-text-main">Divida as despesas com quem participa</h3>
            <p className="max-w-sm text-sm text-text-muted">Defina um orçamento e acompanhe quanto cada pessoa pagou e quanto ficou para acertar.</p>
          </Card>}
      </div>
      {creating && <SpaceDialog title="Novo espaço" dismiss={() => setCreating(false)}
        submit={async form => {
          const id = await directories.createSpace(settingsFrom(form), userProfile?.displayName?.trim() || user?.displayName?.trim() || 'Titular');
          setSelectedId(id);
          toast.success('Espaço criado.');
        }}><SettingsForm /></SpaceDialog>}
    </div>
  );
}
