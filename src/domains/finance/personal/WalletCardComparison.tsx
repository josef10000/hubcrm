import { useState, type FormEvent } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@shared/design-system';
import {
  assertDate, getFirstInvoiceMonth, getUsedLimit, invoiceDueDate, MAX_INSTALLMENTS,
  money, parseMoney, shiftMonth, splitInstallments, today, type CardInvoice, type CreditCard,
} from './ledger';

interface Scenario {
  amountCents: number;
  date: string;
  installments: number[];
  exchangeCents: number | null;
}

const control = 'min-h-10 w-full rounded-lg border border-text-muted/25 bg-surface-bg px-2.5 py-2 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';
const points = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const formatDate = (date: string) => date.split('-').reverse().join('/');

function estimate(card: CreditCard, invoices: CardInvoice[], scenario: Scenario) {
  const firstMonth = getFirstInvoiceMonth(scenario.date, card.closingDay, card.dueDay);
  const firstInvoice = invoices.find(invoice => invoice.cardId === card.id && invoice.month === firstMonth);
  const dueDate = firstInvoice?.dueDate ?? invoiceDueDate(firstMonth, card.dueDay);
  const projectedMonths = scenario.installments.map((cents, index) => {
    const month = shiftMonth(firstMonth, index);
    const invoice = invoices.find(item => item.cardId === card.id && item.month === month);
    return { invoice, totalCents: cents + (invoice?.totalCents ?? 0) };
  });
  const paidCycle = projectedMonths.some(({ invoice }) => invoice?.paidDate);
  const monthlyLimit = card.monthlyLimitCents;
  const aboveMonthly = monthlyLimit !== undefined && projectedMonths.some(({ totalCents }) => totalCents > monthlyLimit);
  const availableCents = Math.max(0, card.limitCents - getUsedLimit(card.id, invoices));
  const remainingCents = availableCents - scenario.amountCents;
  const cashbackCents = card.cashbackPercent ? Math.round(scenario.amountCents * card.cashbackPercent / 100) : undefined;
  const estimatedPoints = card.pointsPerDollar && scenario.exchangeCents
    ? scenario.amountCents / scenario.exchangeCents * card.pointsPerDollar : undefined;

  return { card, dueDate, paidCycle, aboveMonthly, availableCents, remainingCents, cashbackCents, estimatedPoints };
}

export default function WalletCardComparison({ cards, invoices, discreet }: {
  cards: CreditCard[];
  invoices: CardInvoice[];
  discreet: boolean;
}) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [error, setError] = useState('');

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get('date') ?? '');
    const amountCents = parseMoney(String(data.get('amount') ?? ''));
    const exchangeText = String(data.get('exchange') ?? '').trim();
    const exchangeCents = exchangeText ? parseMoney(exchangeText) : null;
    try {
      if (!amountCents || amountCents < 0) throw new Error('Informe um valor de compra válido.');
      if (exchangeText && (!exchangeCents || exchangeCents < 0)) throw new Error('Informe uma cotação do dólar válida.');
      assertDate(date);
      const installments = splitInstallments(amountCents, Number(data.get('installments')));
      const nextScenario = { date, amountCents, installments, exchangeCents };
      for (const card of cards) {
        const firstMonth = getFirstInvoiceMonth(date, card.closingDay, card.dueDay);
        invoiceDueDate(shiftMonth(firstMonth, installments.length - 1), card.dueDay);
      }
      setError('');
      setScenario(nextScenario);
    } catch (cause) {
      setScenario(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível comparar os cartões.');
    }
  }

  const considersPoints = cards.some(card => Boolean(card.pointsPerDollar));
  const estimates = !discreet && scenario ? cards.map(card => estimate(card, invoices, scenario)) : [];
  estimates.sort((a, b) => Number(a.paidCycle || a.remainingCents < 0) - Number(b.paidCycle || b.remainingCents < 0)
    || Number(a.aboveMonthly) - Number(b.aboveMonthly)
    || b.dueDate.localeCompare(a.dueDate)
    || (b.cashbackCents ?? 0) - (a.cashbackCents ?? 0)
    || a.card.name.localeCompare(b.card.name, 'pt-BR'));

  return (
    <details className="personal-wallet-comparison">
      <summary className="cursor-pointer p-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary-500">
        <span className="inline-flex items-center gap-1.5 align-middle"><SlidersHorizontal size={15} aria-hidden="true" /> Comparar cartões para uma compra</span>
      </summary>
      {discreet ? <p className="px-3 pb-3 text-sm text-text-muted">Desative o modo discreto para exibir os valores da simulação.</p> : (
        <div className="grid gap-3 px-3 pb-3">
          <form onSubmit={compare} className="grid items-end gap-2 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-xs font-medium">Valor da compra (R$)<input name="amount" className={control} inputMode="decimal" required defaultValue={scenario ? points.format(scenario.amountCents / 100) : ''} placeholder="0,00" /></label>
            <label className="grid min-w-0 gap-1 text-xs font-medium">Data da compra<input name="date" className={control} type="date" defaultValue={scenario?.date ?? today()} required /></label>
            <label className="grid min-w-0 gap-1 text-xs font-medium">Parcelas<input name="installments" className={control} type="number" min={1} max={MAX_INSTALLMENTS} defaultValue={scenario?.installments.length ?? 1} required /></label>
            {considersPoints && <label className="grid min-w-0 gap-1 text-xs font-medium">Cotação do dólar em R$ (opcional)<input name="exchange" className={control} inputMode="decimal" defaultValue={scenario?.exchangeCents ? points.format(scenario.exchangeCents / 100) : ''} placeholder="Para estimar pontos" /></label>}
            <Button type="submit" size="sm" className="min-h-10 justify-self-start">Comparar</Button>
          </form>
          {error && <p role="alert" className="text-sm text-text-main">{error}</p>}
          {scenario && (
            <div className="space-y-2" aria-live="polite">
              <p className="text-xs text-text-muted">Estimativa para <strong>{money(scenario.amountCents)}</strong> em {formatDate(scenario.date)}. A ordem considera limite, orçamento mensal e vencimento. A aprovação e os benefícios dependem do emissor.</p>
              <ul className="grid gap-2">
                {estimates.map(({ card, dueDate, paidCycle, aboveMonthly, availableCents, remainingCents, cashbackCents, estimatedPoints }) => (
                  <li className="personal-wallet-invoice text-sm" key={card.id}>
                    <strong className="[overflow-wrap:anywhere]">{card.name}</strong>
                    <dl className="grid gap-1 text-xs sm:grid-cols-2">
                      <div><dt className="personal-wallet-label">Primeiro vencimento</dt><dd>{formatDate(dueDate)}</dd></div>
                      <div><dt className="personal-wallet-label">Limite disponível</dt><dd className="personal-wallet-amount">{money(availableCents)}</dd></div>
                      <div><dt className="personal-wallet-label">{remainingCents < 0 ? 'Faltaria' : 'Restaria'}</dt><dd className="personal-wallet-amount">{money(Math.abs(remainingCents))}</dd></div>
                      {cashbackCents !== undefined && <div><dt className="personal-wallet-label">Cashback estimado</dt><dd className="personal-wallet-amount">{money(cashbackCents)}</dd></div>}
                      {estimatedPoints !== undefined && <div><dt className="personal-wallet-label">Pontos estimados</dt><dd className="personal-wallet-amount">{points.format(estimatedPoints)}</dd></div>}
                    </dl>
                    {paidCycle && <p className="text-xs font-medium">Já existe uma fatura paga para uma das parcelas.</p>}
                    {aboveMonthly && <p className="text-xs font-medium">O valor projetado ultrapassa o limite mensal cadastrado.</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
