import { useEffect, useState } from 'react';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, FieldPath, onSnapshot, query,
  runTransaction, setDoc, updateDoc, where, writeBatch,
  type CollectionReference, type DocumentData, type DocumentSnapshot, type Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assertMonth, monthOf, today } from '../ledger';
import {
  approvalStatus, assertParticipantsLimit, splitExpense, text, validExpense, validParticipant, validSettings,
  validateReward,
  type ExpenseInput, type ExpenseStatus, type FinanceSpace, type FamilyTask, type InvitationRole,
  type Participant, type ParticipantInput, type SpaceExpense, type SpaceInvitation, type SpaceSettings,
} from './spaceModel';

const spaceCollection = () => collection(db, 'personalFinanceSpaces');
const invitationCollection = () => collection(db, 'personalFinanceSpaceInvitations');
const spaceDocument = (id: string) => doc(spaceCollection(), id);
const scopedCollection = (spaceId: string, name: 'expenses' | 'participants' | 'tasks') => collection(spaceDocument(spaceId), name);
const invitationDocument = (spaceId: string, uid: string) => doc(invitationCollection(), `${spaceId}_${uid}`);

function attachId<T>(snapshot: DocumentSnapshot<DocumentData>): T {
  return { ...snapshot.data(), id: snapshot.id } as T;
}

function useDocuments<T>(
  key: string,
  source: () => Query<DocumentData> | CollectionReference<DocumentData>,
  waitForServer = false,
) {
  const [state, setState] = useState<{ key: string; data: T[]; error: string | null }>({ key: '', data: [], error: null });
  useEffect(() => {
    if (!key) return;
    return onSnapshot(source(), { includeMetadataChanges: waitForServer }, result => {
      // A pending space may appear before its membership is visible to the backend.
      // Keep the previously confirmed directory until the write is acknowledged.
      if (waitForServer && result.metadata.hasPendingWrites) return;
      setState({ key, data: result.docs.map(item => attachId<T>(item)), error: null });
    }, error => {
      setState({
        key, data: [], error: error.code === 'permission-denied'
          ? 'Você não tem acesso a estes dados.'
          : 'Não foi possível sincronizar os dados do espaço.',
      });
    });
  // Key identifies both the user and the query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, waitForServer]);
  return state.key === key ? { ...state, loading: false } : { data: [] as T[], error: null, loading: Boolean(key) };
}

export function useFinanceSpaces(uid: string) {
  const own = useDocuments<FinanceSpace>(uid && `spaces:${uid}`, () =>
    query(spaceCollection(), where('memberIds', 'array-contains', uid)), true);
  const incoming = useDocuments<SpaceInvitation>(uid && `received:${uid}`, () =>
    query(invitationCollection(), where('invitedUid', '==', uid)));
  const outgoing = useDocuments<SpaceInvitation>(uid && `sent:${uid}`, () =>
    query(invitationCollection(), where('inviterUid', '==', uid)));

  async function createSpace(input: SpaceSettings, ownerName: string) {
    const settings = validSettings(input);
    const target = doc(spaceCollection());
    const batch = writeBatch(db);
    batch.set(target, { ...settings, ownerId: uid, archived: false, memberIds: [uid], memberRoles: { [uid]: 'owner' } });
    batch.set(doc(scopedCollection(target.id, 'participants'), uid), {
      name: text(ownerName, 'seu nome', 80),
      linkedUid: uid, dependent: false, incomeCents: 0, allowanceCents: 0, active: true,
    });
    await batch.commit();
    return target.id;
  }

  async function updateSpace(spaceId: string, settings: SpaceSettings) {
    await updateDoc(spaceDocument(spaceId), { ...validSettings(settings) });
  }

  async function invite(space: FinanceSpace, invitedUid: string, role: InvitationRole) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(invitedUid)) throw new Error('Informe o identificador da conta do Hub.');
    if (space.memberIds.includes(invitedUid)) throw new Error('Esta pessoa já tem acesso ao espaço.');
    if (space.memberIds.length >= 20) throw new Error('O espaço já tem 20 contas com acesso.');
    await setDoc(invitationDocument(space.id, invitedUid), {
      spaceId: space.id, spaceName: space.name, inviterUid: uid, invitedUid, role,
    });
  }

  async function accept(invitation: SpaceInvitation) {
    const batch = writeBatch(db);
    batch.update(spaceDocument(invitation.spaceId), 'memberIds', arrayUnion(uid),
      new FieldPath('memberRoles', uid), invitation.role);
    batch.delete(invitationDocument(invitation.spaceId, uid));
    await batch.commit();
  }

  async function changeRole(spaceId: string, memberUid: string, role: InvitationRole) {
    await updateDoc(spaceDocument(spaceId), new FieldPath('memberRoles', memberUid), role);
  }

  async function removeMember(spaceId: string, memberUid: string) {
    await updateDoc(spaceDocument(spaceId), 'memberIds', arrayRemove(memberUid),
      new FieldPath('memberRoles', memberUid), deleteField());
  }

  return {
    spaces: own.data, incoming: incoming.data, outgoing: outgoing.data, loading: own.loading || incoming.loading || outgoing.loading,
    error: own.error ?? incoming.error ?? outgoing.error,
    createSpace, updateSpace, invite, accept, changeRole, removeMember,
    archiveSpace: (spaceId: string, archived: boolean) => updateDoc(spaceDocument(spaceId), { archived }),
    dismiss: (invite: SpaceInvitation) => deleteDoc(invitationDocument(invite.spaceId, invite.invitedUid)),
  };
}

export function useSpaceDetails(uid: string, spaceId: string) {
  const key = uid && spaceId ? `${uid}:${spaceId}` : '';
  const keyFor = (collectionName: string) => key && `${key}:${collectionName}`;
  const participants = useDocuments<Participant>(keyFor('people'), () => scopedCollection(spaceId, 'participants'));
  const expenses = useDocuments<SpaceExpense>(keyFor('expenses'), () => scopedCollection(spaceId, 'expenses'));
  const tasks = useDocuments<FamilyTask>(keyFor('tasks'), () => scopedCollection(spaceId, 'tasks'));

  async function saveParticipant(data: ParticipantInput, participant?: Participant, linkedUid = '') {
    const input = validParticipant(data);
    if (!participant) assertParticipantsLimit(participants.data);
    const ref = participant || linkedUid ? doc(scopedCollection(spaceId, 'participants'), participant?.id ?? linkedUid)
      : doc(scopedCollection(spaceId, 'participants'));
    await setDoc(ref, { ...input, linkedUid: participant?.linkedUid ?? linkedUid, active: participant?.active ?? true });
  }

  async function saveExpense(space: FinanceSpace, data: ExpenseInput, people: Participant[]) {
    const input = validExpense(data);
    if (!space.memberIds.includes(input.paidBy) && !people.some(person => person.id === input.paidBy && person.active)) {
      throw new Error('Selecione um pagador ativo.');
    }
    const ref = doc(scopedCollection(spaceId, 'expenses'));
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(spaceDocument(spaceId));
      if (!snapshot.exists()) throw new Error('Este espaço não está disponível.');
      const freshSpace = attachId<FinanceSpace>(snapshot);
      transaction.set(ref, {
        ...input, createdBy: uid, source: 'manual',
        status: approvalStatus(freshSpace, input.amountCents),
        allocations: splitExpense(input.amountCents, input.paidBy, input.split, people),
      });
    });
  }

  async function setApproval(expenseId: string, status: Exclude<ExpenseStatus, 'pending'>) {
    await updateDoc(doc(scopedCollection(spaceId, 'expenses'), expenseId), { status });
  }

  async function saveTask(participantId: string, name: string, amountCents: number) {
    await setDoc(doc(scopedCollection(spaceId, 'tasks')), {
      participantId, name: text(name, 'o título da tarefa', 120), amountCents: validateReward(amountCents), state: 'open',
    });
  }

  async function completeTask(taskId: string) {
    await updateDoc(doc(scopedCollection(spaceId, 'tasks'), taskId), { state: 'done' });
  }

  async function logFamilyReward(participantId: string, month: string, taskId?: string) {
    assertMonth(month);
    const personRef = doc(scopedCollection(spaceId, 'participants'), participantId);
    const taskRef = taskId ? doc(scopedCollection(spaceId, 'tasks'), taskId) : null;
    const rewardRef = doc(scopedCollection(spaceId, 'expenses'), taskId ? `task-${taskId}` : `allowance-${participantId}-${month}`);
    return runTransaction(db, async transaction => {
      const [personSnapshot, spaceSnapshot, rewardSnapshot, taskSnapshot] = await Promise.all([
        transaction.get(personRef), transaction.get(spaceDocument(spaceId)), transaction.get(rewardRef),
        taskRef ? transaction.get(taskRef) : Promise.resolve(null),
      ]);
      if (rewardSnapshot.exists()) return false;
      if (!personSnapshot.exists() || !spaceSnapshot.exists()) throw new Error('O cadastro da pessoa ou o espaço não está disponível.');
      const person = attachId<Participant>(personSnapshot);
      const space = attachId<FinanceSpace>(spaceSnapshot);
      const task = taskSnapshot?.exists() ? attachId<FamilyTask>(taskSnapshot) : null;
      if (!person.active || !person.dependent) throw new Error('A pessoa precisa estar ativa como dependente.');
      if (taskRef && (!task || task.state !== 'done' || task.participantId !== person.id)) throw new Error('Conclua a tarefa antes de registrar seu bônus.');
      const amountCents = validateReward(task?.amountCents ?? person.allowanceCents);
      const current = today();
      const date = monthOf(current) === month ? current : `${month}-01`;
      transaction.set(rewardRef, {
        amountCents, date, paidBy: uid, createdBy: uid, status: approvalStatus(space, amountCents),
        allocations: { [uid]: amountCents }, split: 'none', source: task ? 'task' : 'allowance',
        category: task ? 'Bônus de tarefa' : 'Mesada',
        name: task ? `${task.name.slice(0, 80)} · ${person.name.slice(0, 50)}` : `Mesada · ${person.name}`,
      });
      if (taskRef) transaction.update(taskRef, { state: 'paid' });
      return true;
    });
  }

  return {
    participants: participants.data, expenses: expenses.data, tasks: tasks.data,
    loading: participants.loading || expenses.loading || tasks.loading,
    error: participants.error ?? expenses.error ?? tasks.error,
    saveParticipant, saveExpense, setApproval, saveTask, completeTask, logFamilyReward,
    archiveParticipant: (participantId: string, active: boolean) =>
      updateDoc(doc(scopedCollection(spaceId, 'participants'), participantId), { active }),
    deleteTask: (taskId: string) => deleteDoc(doc(scopedCollection(spaceId, 'tasks'), taskId)),
  };
}
