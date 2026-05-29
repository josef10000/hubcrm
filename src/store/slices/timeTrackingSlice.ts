import { StateCreator } from 'zustand';
import { doc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { CRMStoreState } from '../types';

export interface TimeLogPause {
  type: 'lunch' | 'away' | 'meeting';
  startTime: number;
  endTime?: number;
}

export interface TimeLog {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  date: string; // Formato: YYYY-MM-DD
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed';
  pauses: TimeLogPause[];
  totalDuration: number; // Em milissegundos (líquido de pausas)
  updatedAt: number;
}

export interface TimeTrackingSlice {
  todayLog: TimeLog | null;
  allLogs: TimeLog[];
  loadingTimeLog: boolean;

  startExpediente: (userId: string, userName: string, userPhoto: string) => Promise<void>;
  endExpediente: () => Promise<void>;
  registerPause: (type: 'lunch' | 'away' | 'meeting') => Promise<void>;
  resumeExpediente: () => Promise<void>;
  loadTodayLog: (userId: string) => () => void;
  loadAllLogs: () => () => void;
}

// Auxiliar para obter a data local no formato YYYY-MM-DD no Horário de Brasília
export function getLocalDateString(): string {
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// Auxiliar para calcular duração líquida trabalhada até o momento
export function calculateNetDuration(startTime: number, endTime?: number, pauses: TimeLogPause[] = []): number {
  const end = endTime || Date.now();
  let totalTime = end - startTime;
  let totalPauseTime = 0;

  pauses.forEach(p => {
    const pauseEnd = p.endTime || Date.now();
    totalPauseTime += (pauseEnd - p.startTime);
  });

  const net = totalTime - totalPauseTime;
  return net > 0 ? net : 0;
}

export const createTimeTrackingSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  TimeTrackingSlice
> = (set, get) => ({
  todayLog: null,
  allLogs: [],
  loadingTimeLog: true,

  startExpediente: async (userId, userName, userPhoto) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;

    const dateStr = getLocalDateString();
    const docId = `${dateStr}_${userId}`;
    const docRef = doc(db, 'organizations', orgId, 'time_logs', docId);

    try {
      const now = Date.now();
      const newLog: TimeLog = {
        id: docId,
        userId,
        userName,
        userPhoto,
        date: dateStr,
        startTime: now,
        status: 'active',
        pauses: [],
        totalDuration: 0,
        updatedAt: now
      };

      await setDoc(docRef, newLog, { merge: true });

      // Atualiza o status de presença do chat para online
      const profileRef = doc(db, 'profiles', userId);
      await setDoc(profileRef, {
        presenceStatus: 'online',
        isManualStatus: true,
        lastSeen: now
      }, { merge: true });

      toast.success('Expediente iniciado com sucesso!');
    } catch (err) {
      console.error('[TimeTrackingSlice] Erro ao iniciar expediente:', err);
      toast.error('Erro ao iniciar expediente.');
    }
  },

  endExpediente: async () => {
    const orgId = get().effectiveOrgId;
    const log = get().todayLog;
    if (!orgId || !log) return;

    const docRef = doc(db, 'organizations', orgId, 'time_logs', log.id);

    try {
      const now = Date.now();
      
      // Se houver uma pausa ativa, finaliza ela antes de fechar o expediente
      const updatedPauses = log.pauses.map(p => {
        if (!p.endTime) {
          return { ...p, endTime: now };
        }
        return p;
      });

      const netDuration = calculateNetDuration(log.startTime, now, updatedPauses);

      await setDoc(docRef, {
        endTime: now,
        status: 'completed',
        pauses: updatedPauses,
        totalDuration: netDuration,
        updatedAt: now
      }, { merge: true });

      // Atualiza o status de presença do chat para offline
      const profileRef = doc(db, 'profiles', log.userId);
      await setDoc(profileRef, {
        presenceStatus: 'offline',
        isManualStatus: true,
        lastSeen: now
      }, { merge: true });

      toast.success('Expediente encerrado. Até amanhã!');
    } catch (err) {
      console.error('[TimeTrackingSlice] Erro ao encerrar expediente:', err);
      toast.error('Erro ao encerrar expediente.');
    }
  },

  registerPause: async (type) => {
    const orgId = get().effectiveOrgId;
    const log = get().todayLog;
    if (!orgId || !log || log.status !== 'active') return;

    const docRef = doc(db, 'organizations', orgId, 'time_logs', log.id);

    try {
      const now = Date.now();
      const newPause: TimeLogPause = {
        type,
        startTime: now
      };

      const updatedPauses = [...log.pauses, newPause];
      const netDuration = calculateNetDuration(log.startTime, undefined, updatedPauses);

      await setDoc(docRef, {
        status: 'paused',
        pauses: updatedPauses,
        totalDuration: netDuration,
        updatedAt: now
      }, { merge: true });

      // Sincroniza o status do chat
      const chatStatusMap = {
        lunch: 'lunch',
        away: 'away',
        meeting: 'meeting'
      };
      
      const profileRef = doc(db, 'profiles', log.userId);
      await setDoc(profileRef, {
        presenceStatus: chatStatusMap[type],
        isManualStatus: true,
        lastSeen: now
      }, { merge: true });

    } catch (err) {
      console.error('[TimeTrackingSlice] Erro ao registrar pausa:', err);
    }
  },

  resumeExpediente: async () => {
    const orgId = get().effectiveOrgId;
    const log = get().todayLog;
    if (!orgId || !log || log.status !== 'paused') return;

    const docRef = doc(db, 'organizations', orgId, 'time_logs', log.id);

    try {
      const now = Date.now();
      const updatedPauses = log.pauses.map(p => {
        if (!p.endTime) {
          return { ...p, endTime: now };
        }
        return p;
      });

      const netDuration = calculateNetDuration(log.startTime, undefined, updatedPauses);

      await setDoc(docRef, {
        status: 'active',
        pauses: updatedPauses,
        totalDuration: netDuration,
        updatedAt: now
      }, { merge: true });

      // Retorna o status do chat para online
      const profileRef = doc(db, 'profiles', log.userId);
      await setDoc(profileRef, {
        presenceStatus: 'online',
        isManualStatus: true,
        lastSeen: now
      }, { merge: true });

    } catch (err) {
      console.error('[TimeTrackingSlice] Erro ao retomar expediente:', err);
    }
  },

  loadTodayLog: (userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return () => {};

    const dateStr = getLocalDateString();
    const docId = `${dateStr}_${userId}`;
    const docRef = doc(db, 'organizations', orgId, 'time_logs', docId);

    set({ loadingTimeLog: true });

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        set({ todayLog: snap.data() as TimeLog, loadingTimeLog: false });
      } else {
        set({ todayLog: null, loadingTimeLog: false });
      }
    }, (err) => {
      console.error('[TimeTrackingSlice] Erro ao escutar log de hoje:', err);
      set({ loadingTimeLog: false });
    });

    return unsubscribe;
  },

  loadAllLogs: () => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return () => {};

    const ref = collection(db, 'organizations', orgId, 'time_logs');
    
    const unsubscribe = onSnapshot(ref, (snap) => {
      const logs = snap.docs.map(d => d.data() as TimeLog);
      set({ allLogs: logs });
    }, (err) => {
      console.error('[TimeTrackingSlice] Erro ao escutar todos os logs:', err);
    });

    return unsubscribe;
  }
});
