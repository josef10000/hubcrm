import { useState, type FormEvent } from 'react';
import { Calculator, CreditCard as CardIcon, Landmark, ShieldCheck } from 'lucide-react';
import { Badge, Button } from '@shared/design-system';
import {
  assertDate, getEntryMonth, MAX_AMOUNT_CENTS, MAX_INSTALLMENTS, money, parseMoney, today,
  type EntryInput, type LedgerEntry,
} from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import { AmountField, controlClass, Field, Panel, readAmount } from './PlanningControls';
import { categoryKey, displayAmount, displayMonth, simulatePurchase, type ItemOf } from './planningModel';

const essentialCategories = /moradia|aluguel|condominio|alimenta|mercado|transporte|saude|farmacia|contas fixas|energia|agua/i;

export function ReserveCalculator({ entries, month, goal, onSave }: {
  entries: LedgerEntry[];
  month: string;
  goal?: ItemOf<'goal'>;
  onSave: (target: number, saved: number) => Promise<void>;
}) {
  const calculatedCost = Math.max(0, entries.reduce((total, entry) => {
    if (getEntryMonth(entry) !== month || !essentialCategories.test(categoryKey(entry.category)) || entry.status === 'pending') return total;
    if (entry.kind === 'expense' || entry.kind === 'purchase') return total + entry.amountCents;
    if (entry.kind === 'cardCredit') return total - entry.amountCents;
    return total;
  }, 0));
  const [costInput, setCost] = useState<string>();
  const [savedInput, setSaved] = useState<string>();
  const [contributionInput, setContribution] = useState('');
  const [months, setMonths] = useState(6);
  const [saving, setSaving] = useState(false);
  const costText = costInput ?? (calculatedCost > 0 ? displayAmount(calculatedCost) : '');
  const savedText = savedInput ?? (goal ? displayAmount(goal.savedCents) : '0');
  const cost = Math.max(0, parseMoney(costText) ?? 0);
  const saved = Math.max(0, parseMoney(savedText) ?? 0);
  const contribution = Math.max(0, parseMoney(contributionInput) ?? 0);
  const target = cost * months;
  const missing = Math.max(0, target - saved);
  const covered = cost ? (saved / cost).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—';
  const duration = Math.ceil(missing / contribution);

  return (
    <Panel icon={ShieldCheck} title="Reserva de emergência" detail="Calcule quantos meses de despesas essenciais sua reserva cobre.">
      <form className="grid gap-4" onSubmit={async event => {
        event.preventDefault();
        if (saving || target < 1 || target > MAX_AMOUNT_CENTS) return;
        setSaving(true);
        try { await onSave(target, saved); } finally { setSaving(false); }
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmountField label="Custo essencial mensal (R$)" value={costText} onChange={event => setCost(event.target.value)} required={false} />
          <AmountField label="Reserva atual (R$)" value={savedText} onChange={event => setSaved(event.target.value)} required={false} />
          <AmountField label="Aporte mensal (R$)" value={contributionInput} onChange={event => setContribution(event.target.value)} required={false} />
          <Field label="Cobertura desejada">
            <select value={months} aria-label="Cobertura desejada" className={controlClass} onChange={event => setMonths(Number(event.target.value))}>
              {[3, 6, 9, 12].map(value => <option value={value} key={value}>{value} meses</option>)}
            </select>
          </Field>
        </div>
        {costInput === undefined && calculatedCost > 0 && <p className="text-xs text-text-muted">O custo inicial vem das despesas essenciais de {displayMonth(month)}.</p>}
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-bg/65 p-3 sm:p-4">
          <div className="min-w-0"><dt className="text-xs text-text-muted">Meta de reserva</dt><dd className="break-words text-lg font-semibold tabular-nums">{money(target)}</dd></div>
          <div><dt className="text-xs text-text-muted">Meses cobertos</dt><dd className="text-lg font-semibold tabular-nums">{covered}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-text-muted">Falta guardar</dt><dd className="break-words font-semibold tabular-nums">{money(missing)}</dd></div>
          <div><dt className="text-xs text-text-muted">Prazo estimado</dt><dd className="font-semibold tabular-nums">{target > 0 && missing === 0 ? 'Meta atingida' : contribution > 0 && target > 0 ? `${duration} meses` : '—'}</dd></div>
        </dl>
        <Button type="submit" size="sm" className="min-h-9 justify-self-start" disabled={saving || target <= 0 || target > MAX_AMOUNT_CENTS}>
          {saving ? 'Salvando…' : goal ? 'Atualizar meta da reserva' : 'Criar meta da reserva'}
        </Button>
      </form>
    </Panel>
  );
}

type SimulatedPurchase = {
  entry: EntryInput;
  installments: number;
  projection: ReturnType<typeof simulatePurchase>;
};

export function PurchaseCalculator({ finance, month, budgets, categories, onWishlist }: {
  finance: ReturnType<typeof usePersonalFinance>;
  month: string;
  budgets: ItemOf<'budget'>[];
  categories: string[];
  onWishlist: (name: string, amountCents: number) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'purchase' | 'expense'>('expense');
  const [result, setResult] = useState<SimulatedPurchase>();
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const cards = finance.cards.filter(card => !card.archived);
  const accounts = finance.accounts.filter(account => !account.archived);

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFeedback('');
    setResult(undefined);
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? '').trim();
    const date = field('date');

    try {
      assertDate(date);
      const description = field('description');
      if (!description) throw new Error('Informe o nome ou a descrição da compra.');
      const card = cards.find(item => item.id === field('source'));
      const account = accounts.find(item => item.id === field('source'));
      if (mode === 'purchase' && !card) throw new Error('Selecione um cartão para calcular as faturas.');
      const amountCents = readAmount(data);
      const installments = mode === 'purchase' ? Number(field('installments')) : 1;
      const category = field('category');
      const entry: EntryInput = mode === 'purchase'
        ? { kind: 'purchase', description, date, amountCents, cardId: card!.id, ...(category ? { category } : {}) }
        : { kind: 'expense', description, date, amountCents, ...(account ? { bankAccountId: account.id } : {}), ...(category ? { category } : {}) };

      setResult({
        entry, installments,
        projection: simulatePurchase({
          amountCents, date, category, installments, card, month, entries: finance.entries, invoices: finance.invoices, budgets,
        }),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível simular esta compra.');
    }
  }

  async function save(kind: 'entry' | 'wish') {
    if (!result || busy) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'entry') {
        await finance.addEntry(result.entry, result.installments);
        setFeedback('Compra registrada no extrato.');
      } else if (await onWishlist(result.entry.description, result.entry.amountCents)) {
        setFeedback('Compra enviada para a lista de 48 horas.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a compra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel icon={Calculator} title="Simulador de compras" detail="Veja como a compra afeta o limite, o orçamento da categoria e os próximos meses.">
      <form onSubmit={calculate} onChange={() => { setResult(undefined); setFeedback(''); setError(''); }} className="grid gap-4">
        <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2" disabled={busy}>
          <Field label="Descrição da compra">
            <input name="description" className={controlClass} maxLength={80} placeholder="Ex.: Computador" required />
          </Field>
          <AmountField label="Valor total (R$)" />
          <Field label="Forma de pagamento">
            <select aria-label="Forma de pagamento" name="mode" value={mode} className={controlClass}
              onChange={event => setMode(event.target.value as 'purchase' | 'expense')}>
              <option value="expense">À vista</option><option value="purchase" disabled={!cards.length}>Cartão de crédito</option>
            </select>
          </Field>
          <Field key={mode} label={mode === 'expense' ? 'Conta para registro' : 'Cartão para simular'}>
            <select aria-label={mode === 'expense' ? 'Conta para registro' : 'Cartão para simular'} name="source" className={controlClass} required={mode === 'purchase'}>
              <option value="">{mode === 'expense' ? 'Somente simular' : 'Selecione um cartão'}</option>
              {(mode === 'expense' ? accounts : cards).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Data da compra"><input name="date" type="date" className={controlClass} defaultValue={today()} required /></Field>
          <Field label="Categoria"><input name="category" list="planning-simulation-categories" maxLength={80} className={controlClass} placeholder="Opcional" /></Field>
          <datalist id="planning-simulation-categories">{categories.map(category => <option value={category} key={category} />)}</datalist>
          {mode === 'purchase' && <Field label="Parcelas"><input name="installments" type="number" min={1} max={MAX_INSTALLMENTS} className={controlClass} defaultValue={1} required /></Field>}
        </fieldset>
        <Button type="submit" className="min-h-9 justify-self-start" size="sm" disabled={busy}>Simular impacto</Button>
      </form>

      {result && (
        <div className="mt-4 grid gap-3 border-t border-text-muted/20 pt-4">
          <div className="flex flex-wrap gap-2">
            {result.projection.cardAvailable !== null && (
              <Badge variant={result.projection.overLimit ? 'danger' : 'primary'} className="text-xs">
                <CardIcon size={12} className="mr-1 inline" aria-hidden="true" />
                {result.projection.overLimit ? 'Acima do limite do cartão' : `${money(result.projection.cardAvailable)} de limite disponível`}
              </Badge>
            )}
            {result.projection.overBudget && <Badge variant="warning" className="text-xs">Acima do orçamento da categoria</Badge>}
            {result.projection.netDeficit && <Badge variant="danger" className="text-xs">Saldo projetado negativo</Badge>}
          </div>
          <ul className="max-h-64 divide-y divide-text-muted/15 overflow-y-auto rounded-2xl border border-text-muted/15">
            {result.projection.projection.map(item => (
              <li key={item.month} className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 text-sm">
                <span className="font-medium">{displayMonth(item.month)} · {money(item.cost)}</span>
                <span className={item.hasIncome && item.remaining < 0 ? 'text-accent-error' : 'text-text-muted'}>
                  {item.hasIncome ? `${money(item.remaining)} de saldo ${item.estimatedIncome ? 'estimado' : 'projetado'}` : 'Renda do mês indisponível'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="min-h-9" disabled={busy || !!feedback} onClick={() => void save('wish')}>Enviar para a lista de 48h</Button>
            {(result.entry.bankAccountId || result.entry.cardId) && (
              <Button type="button" size="sm" className="min-h-9 gap-1.5" disabled={busy || !!feedback} onClick={() => void save('entry')}>
                <Landmark size={14} aria-hidden="true" /> Registrar compra
              </Button>
            )}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-accent-error">{error}</p>}
      {feedback && <p role="status" className="mt-3 text-sm text-text-main">{feedback}</p>}
    </Panel>
  );
}
