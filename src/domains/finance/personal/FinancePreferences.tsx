import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, LockKeyhole, PanelTopClose, X } from 'lucide-react';
import { Button } from '@shared/design-system';

type DevicePin = { salt: string; hash: string };
type Preferences = { pin?: DevicePin; compact: boolean; discreet: boolean };
const empty: Preferences = { compact: false, discreet: false };

function readPreferences(key: string): Preferences {
  try {
    const data: Partial<Preferences> = JSON.parse(localStorage.getItem(key) ?? '{}');
    const pin = data.pin && /^[a-f0-9]{32}$/.test(data.pin.salt) && /^[a-f0-9]{64}$/.test(data.pin.hash) ? data.pin : undefined;
    return { pin, compact: data.compact === true, discreet: data.discreet === true };
  } catch {
    return empty;
  }
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string) {
  const input = new TextEncoder().encode(salt + pin);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)));
}

export function useFinancePreferences(uid: string) {
  const key = `hub.finance.device.${uid}`;
  const [preferences, setPreferences] = useState(() => readPreferences(key));
  const [locked, setLocked] = useState(() => Boolean(preferences.pin));

  function save(next: Preferences) {
    localStorage.setItem(key, JSON.stringify(next));
    setPreferences(next);
  }

  function toggle(setting: 'compact' | 'discreet') {
    const next = { ...preferences, [setting]: !preferences[setting] };
    try {
      save(next);
    } catch {
      setPreferences(next);
    }
  }

  async function setPin(pin: string) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error('Use um PIN de 4 a 8 dígitos.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    save({ ...preferences, pin: { salt, hash: await hashPin(pin, salt) } });
  }

  async function unlock(pin: string) {
    if (!preferences.pin || await hashPin(pin, preferences.pin.salt) === preferences.pin.hash) {
      setLocked(false);
      return;
    }
    throw new Error('PIN incorreto.');
  }

  function removePin() {
    save({ ...preferences, pin: undefined });
  }

  return {
    compact: preferences.compact, discreet: preferences.discreet,
    hasPin: Boolean(preferences.pin), locked, lock: () => setLocked(true),
    toggle, unlock, setPin, removePin,
  };
}

type Device = ReturnType<typeof useFinancePreferences>;
const field = 'w-full min-w-0 rounded-xl border border-text-muted/32 bg-surface-bg px-3 py-2.5 text-sm text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';

export function FinanceUnlock({ unlock }: Pick<Device, 'unlock'>) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await unlock(String(new FormData(event.currentTarget).get('pin') ?? ''));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível desbloquear.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="personal-finance-panel mx-auto my-10 max-w-sm p-5 sm:p-6">
      <LockKeyhole size={21} className="mb-3 text-primary-500" aria-hidden="true" />
      <h2 className="text-xl font-semibold">Finanças Pessoais bloqueadas</h2>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <label htmlFor="finance-unlock-pin" className="text-sm font-medium">PIN deste dispositivo</label>
        <input id="finance-unlock-pin" name="pin" type="password" inputMode="numeric" autoComplete="off"
          className={field} required pattern="[0-9]{4,8}" maxLength={8} autoFocus />
        {error && <p role="alert" className="text-sm text-accent-error">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Desbloquear'}</Button>
      </form>
    </section>
  );
}

export function FinancePreferences({ device, close }: { device: Device; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal?.open) modal?.showModal();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pin = String(data.get('pin') ?? '');
    if (pin !== data.get('confirmation')) {
      setError('Os PINs precisam ser iguais.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await device.setPin(pin);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o PIN.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) close(); }}
      aria-labelledby="finance-preferences-title"
      className="personal-finance-panel m-auto max-h-[90dvh] w-[min(calc(100%-2rem),31rem)] max-w-none overflow-auto p-5 text-text-main shadow-2xl backdrop:bg-black/65">
      <div className="flex items-center justify-between gap-3">
        <h2 id="finance-preferences-title" className="text-xl font-semibold">Preferências neste dispositivo</h2>
        <Button type="button" variant="ghost" size="sm" aria-label="Fechar preferências" onClick={close} disabled={busy}><X size={18} /></Button>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={device.discreet} onChange={() => device.toggle('discreet')} />
          <Eye size={16} aria-hidden="true" /> Ocultar valores na tela
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={device.compact} onChange={() => device.toggle('compact')} />
          <PanelTopClose size={16} aria-hidden="true" /> Usar modo de bolso na visão geral
        </label>
      </div>
      <form className="mt-5 grid gap-3 border-t border-text-muted/20 pt-4" onSubmit={submit}>
        <h3 className="flex items-center gap-2 font-semibold"><LockKeyhole size={16} aria-hidden="true" /> PIN local</h3>
        <p className="text-sm text-text-muted">O PIN bloqueia esta tela neste navegador. O acesso aos dados usa sua conta do Hub.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Novo PIN<input name="pin" type="password" inputMode="numeric" autoComplete="new-password"
            className={field} required pattern="[0-9]{4,8}" maxLength={8} /></label>
          <label className="grid gap-1 text-sm">Confirmar PIN<input name="confirmation" type="password" inputMode="numeric" autoComplete="new-password"
            className={field} required pattern="[0-9]{4,8}" maxLength={8} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-accent-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {device.hasPin && <>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => {
              try { device.removePin(); } catch { setError('Não foi possível remover o PIN.'); }
            }}>Remover PIN</Button>
            <Button type="button" variant="secondary" onClick={device.lock} disabled={busy}>Bloquear agora</Button>
          </>}
          <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar PIN'}</Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-text-muted">Atalhos nesta área. N para lançar. / para pesquisar no extrato.</p>
    </dialog>
  );
}
