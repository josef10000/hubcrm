export type OfficeSyncedRoomKind = 'product' | 'niche';

export interface OfficeRoomSyncRequest {
  id: string;
  kind: OfficeSyncedRoomKind;
  sourceId: string;
  name: string;
  requestedAt: number;
}

const eventName = 'hub-office-room-sync';

function queueKey(uid: string) {
  return `hub-agent-office-room-sync:v1:${uid}`;
}

export function queueOfficeRoomSync(uid: string | undefined, request: Omit<OfficeRoomSyncRequest, 'id' | 'requestedAt'>) {
  if (!uid || !request.sourceId || !request.name.trim()) return;
  try {
    const key = queueKey(uid);
    const queue = JSON.parse(localStorage.getItem(key) ?? '[]') as OfficeRoomSyncRequest[];
    const nextRequest = { ...request, id: `${request.kind}:${request.sourceId}`, name: request.name.trim(), requestedAt: Date.now() };
    const next = [...queue.filter(item => item.id !== nextRequest.id), nextRequest];
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(eventName, { detail: { key } }));
  } catch {
    // Room sync is an optional local enhancement; a product or niche save should still succeed.
  }
}

export function consumeOfficeRoomSync(uid: string | undefined) {
  if (!uid) return [] as OfficeRoomSyncRequest[];
  const key = queueKey(uid);
  try {
    const queue = JSON.parse(localStorage.getItem(key) ?? '[]') as OfficeRoomSyncRequest[];
    localStorage.removeItem(key);
    return queue.filter(item => item && (item.kind === 'product' || item.kind === 'niche') && item.sourceId && item.name);
  } catch {
    localStorage.removeItem(key);
    return [] as OfficeRoomSyncRequest[];
  }
}

export function getOfficeRoomSyncEventName() {
  return eventName;
}
