import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Archive, CreditCard as CreditCardIcon, Landmark, Pencil, Plus, RotateCw, Scale } from 'lucide-react';
import { Button, Card } from '@shared/design-system';
import { getUsedLimit, money, today, type BankAccount, type CardInvoice, type CreditCard } from './ledger';
import WalletCardComparison from './WalletCardComparison';
import './PersonalWallet.css';

export interface PersonalWalletProps {
  accounts: BankAccount[];
  cards: CreditCard[];
  balances: ReadonlyMap<string, number>;
  invoices: CardInvoice[];
  selectedMonth: string;
  actionsDisabled?: boolean;
  discreet?: boolean;
  onCreateAccount: () => void;
  onCreateCard: () => void;
  onEditAccount: (account: BankAccount) => void;
  onEditCard: (card: CreditCard) => void;
  onArchiveAccount: (account: BankAccount) => void;
  onArchiveCard: (card: CreditCard) => void;
  onRestoreAccount?: (account: BankAccount) => void;
  onRestoreCard?: (card: CreditCard) => void;
  onReconcile: (account: BankAccount) => void;
  onPayInvoice: (card: CreditCard, invoice: CardInvoice) => void;
  onCardCredit: (card: CreditCard) => void;
}

const accountTypes = {
  checking: 'Conta corrente',
  digital: 'Conta digital',
  savings: 'Poupança',
  salary: 'Conta salário',
  investment: 'Conta de investimento',
};

const cardBrands: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  other: '',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? dateFormatter.format(parsed) : date;
}

function Instrument({ kind, name, color, finish, front, back, frontDescription, backDescription }: {
  kind: 'bank' | 'credit';
  name: string;
  color?: string;
  finish?: BankAccount['style'];
  front: ReactNode;
  back: ReactNode;
  frontDescription: string;
  backDescription: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const descriptionId = useId();
  const accent = color && /^#[0-9a-f]{6}$/i.test(color) ? color : 'var(--primary-500)';

  return (
    <button
      type="button"
      className="personal-instrument block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
      data-kind={kind}
      data-flipped={flipped}
      data-finish={finish || 'gradient'}
      style={{ '--instrument-accent': accent } as CSSProperties}
      onClick={() => setFlipped(value => !value)}
      aria-label={`Girar ${name}`}
      aria-pressed={flipped}
      aria-describedby={descriptionId}
    >
      <span className="sr-only" id={descriptionId}>{flipped ? backDescription : frontDescription}</span>
      <span className="personal-instrument-rotation" aria-hidden="true">
        <span className="personal-instrument-face">
          {front}
        </span>
        <span className="personal-instrument-face personal-instrument-back">
          {back}
        </span>
      </span>
      <span className="personal-instrument-hint" aria-hidden="true">
        <RotateCw size={13} /> {flipped ? 'Ver frente' : 'Ver verso'}
      </span>
    </button>
  );
}

const actionClass = 'min-h-10 gap-1.5';

function EmptyWallet({ kind }: { kind: 'bank' | 'credit' }) {
  const Icon = kind === 'bank' ? Landmark : CreditCardIcon;
  return (
    <Card className="personal-wallet-empty flex items-start gap-3 p-4 text-sm sm:items-center sm:p-5">
      <span className="personal-wallet-icon"><Icon size={19} aria-hidden="true" /></span>
      <p>
        {kind === 'bank' ? 'Cadastre uma conta para acompanhar saldos e transferências.' : 'Cadastre um cartão para acompanhar compras parceladas e faturas.'}
      </p>
    </Card>
  );
}

function InvoiceStatus({ invoice, currentDate }: { invoice?: CardInvoice; currentDate: string }) {
  if (!invoice) return null;

  if (invoice.paidDate) {
    return <span className="personal-wallet-status" data-status="paid">Paga em {dateLabel(invoice.paidDate)}</span>;
  }

  if (invoice.totalCents > 0) {
    const overdue = invoice.dueDate < currentDate;
    return (
      <span className="personal-wallet-status" data-status={overdue ? 'overdue' : 'open'}>
        {overdue ? 'Vencida em' : 'Vence em'} {dateLabel(invoice.dueDate)}
      </span>
    );
  }

  return null;
}

export default function PersonalWallet({
  accounts, cards, balances, invoices, selectedMonth, actionsDisabled = false, discreet = false,
  onCreateAccount, onCreateCard, onEditAccount, onEditCard, onArchiveAccount, onArchiveCard,
  onRestoreAccount, onRestoreCard, onReconcile, onPayInvoice, onCardCredit,
}: PersonalWalletProps) {
  const activeAccounts = accounts.filter(account => !account.archived);
  const activeCards = cards.filter(card => !card.archived);
  const archivedAccounts = accounts.filter(account => account.archived);
  const archivedCards = cards.filter(card => card.archived);
  const currentDate = today();
  const amountLabel = (cents: number) => discreet ? '••••' : money(cents);

  function renderAccount(account: BankAccount) {
    const balance = balances.get(account.id) ?? account.initialBalanceCents;
    const accountType = account.accountType ? accountTypes[account.accountType] : 'Conta bancária';
    const balanceLabel = amountLabel(balance);
    const initialBalanceLabel = amountLabel(account.initialBalanceCents);

    return (
      <Card key={`account-${account.id}`} className="personal-wallet-item flex min-w-0 flex-col gap-3 p-3">
        <Instrument
          kind="bank"
          name={account.name}
          color={account.color}
          finish={account.style}
          frontDescription={`Frente. ${account.bank || accountType}. ${discreet ? 'Saldo atual oculto.' : `Saldo atual de ${balanceLabel}.`}`}
          backDescription={`Verso. ${accountType}. ${discreet ? 'Saldo inicial oculto.' : `Saldo inicial de ${initialBalanceLabel}.`}`}
          front={<>
            <span className="personal-instrument-issuer"><Landmark size={16} className="shrink-0" /><span className="truncate">{account.bank || accountType}</span></span>
            <span className="grid min-w-0 gap-1">
              <span className="personal-instrument-name">{account.name}</span>
              <span className="personal-instrument-caption">Saldo atual</span>
              <span className="personal-instrument-balance">{balanceLabel}</span>
            </span>
          </>}
          back={<>
            <span className="personal-instrument-name">{account.name}</span>
            <span className="grid gap-3">
              <span><span className="personal-instrument-caption">Tipo de conta</span><span className="block truncate text-sm font-semibold">{accountType}</span></span>
              <span><span className="personal-instrument-caption">Saldo inicial</span><span className="block text-sm font-semibold [font-variant-numeric:tabular-nums]">{initialBalanceLabel}</span></span>
            </span>
          </>}
        />
        <div className="personal-wallet-actions flex flex-wrap gap-1.5" role="group" aria-label={`Ações da conta ${account.name}`}>
          {account.archived ? (
            onRestoreAccount && <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={() => onRestoreAccount(account)}>Reativar</Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={() => onReconcile(account)}><Scale size={14} aria-hidden="true" /> Conciliar</Button>
              <Button type="button" size="sm" variant="ghost" className={actionClass} disabled={actionsDisabled} onClick={() => onEditAccount(account)}><Pencil size={14} aria-hidden="true" /> Editar</Button>
              <Button type="button" size="sm" variant="ghost" className={actionClass} disabled={actionsDisabled} onClick={() => onArchiveAccount(account)}><Archive size={14} aria-hidden="true" /> Arquivar</Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  function renderCard(card: CreditCard) {
    const invoice = invoices.find(item => item.cardId === card.id && item.month === selectedMonth);
    const usedLimit = getUsedLimit(card.id, invoices);
    const available = Math.max(0, card.limitCents - usedLimit);
    const usedShare = card.limitCents > 0 ? Math.max(0, usedLimit / card.limitCents) : 0;
    const linkedAccount = accounts.find(account => account.id === card.bankAccountId);
    const linkedAccountLabel = linkedAccount ? `${linkedAccount.name}${linkedAccount.archived ? ' (arquivada)' : ''}` : 'Sem vínculo';
    const cardType = card.virtual ? 'Cartão virtual' : 'Cartão físico';
    const brand = cardBrands[card.brand] ?? card.brand;
    const lastDigits = !discreet && /^\d{4}$/.test(card.lastDigits) ? card.lastDigits : '';
    const invoiceAmount = invoice?.totalCents ?? 0;
    const canPay = invoice && invoice.totalCents > 0 && !invoice.paidDate && activeAccounts.length > 0;
    const canCredit = invoices.some(item => item.cardId === card.id && item.totalCents > 0 && !item.paidDate);
    const rewards = [
      card.cashbackPercent ? `${percentFormatter.format(card.cashbackPercent / 100)} de cashback` : '',
      card.pointsPerDollar ? `${numberFormatter.format(card.pointsPerDollar)} ${card.pointsPerDollar === 1 ? 'ponto' : 'pontos'} por US$ 1` : '',
    ].filter(Boolean);

    return (
      <Card key={`card-${card.id}`} className="personal-wallet-item flex min-w-0 flex-col gap-3 p-3">
        <Instrument
          kind="credit"
          name={card.name}
          color={card.color}
          finish={card.style}
          frontDescription={['Frente', cardType, card.bank, brand, lastDigits && `final ${lastDigits}`].filter(Boolean).join('. ')}
          backDescription={`Verso. Fecha no dia ${card.closingDay}. Vence no dia ${card.dueDay}. Conta vinculada: ${linkedAccountLabel}.`}
          front={<>
            <span className="flex items-center justify-between gap-2">
              <span className="personal-instrument-issuer"><CreditCardIcon size={16} className="shrink-0" /><span className="truncate">{card.bank || 'Crédito'}</span></span>
              {brand && <span className="personal-instrument-brand truncate">{brand}</span>}
            </span>
            <span className="grid min-w-0 gap-1">
              <span className="personal-instrument-name">{card.name}</span>
              <span className="personal-instrument-caption">{cardType}</span>
              {lastDigits && <span className="font-mono text-xs tracking-widest">•••• {lastDigits}</span>}
            </span>
          </>}
          back={<>
            <span className="personal-instrument-name">{card.name}</span>
            <span className="grid gap-3 text-sm font-semibold">
              <span className="grid grid-cols-2 gap-3">
                <span><span className="personal-instrument-caption">Fecha</span>Dia {card.closingDay}</span>
                <span><span className="personal-instrument-caption">Vence</span>Dia {card.dueDay}</span>
              </span>
              <span className="truncate"><span className="personal-instrument-caption">Conta vinculada</span>{linkedAccountLabel}</span>
            </span>
          </>}
        />
        <div className="grid gap-3">
          <div className="personal-wallet-invoice">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium">{invoiceAmount < 0 ? 'Crédito na fatura' : 'Fatura do mês'}</p>
              <p className="personal-wallet-amount text-base">{amountLabel(Math.abs(invoiceAmount))}</p>
            </div>
            <InvoiceStatus invoice={invoice} currentDate={currentDate} />
            {invoiceAmount > 0 && !invoice?.paidDate && activeAccounts.length === 0 && <p className="mt-1 text-xs text-text-muted">Cadastre ou reative uma conta para pagar.</p>}
          </div>
          <div className="grid gap-2 px-1">
            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0"><dt className="personal-wallet-label">Limite disponível</dt><dd className="personal-wallet-amount">{amountLabel(available)}</dd></div>
              <div className="min-w-0"><dt className="personal-wallet-label">Limite total</dt><dd className="personal-wallet-amount">{amountLabel(card.limitCents)}</dd></div>
              {card.monthlyLimitCents !== undefined && <div className="col-span-2 min-w-0"><dt className="personal-wallet-label">Limite mensal</dt><dd className="personal-wallet-amount">{amountLabel(card.monthlyLimitCents)}</dd></div>}
            </dl>
            {!discreet && card.limitCents > 0 && (
              <>
                <div className="personal-wallet-usage" data-high-usage={usedShare >= 0.9} aria-hidden="true"><span style={{ width: `${Math.min(usedShare, 1) * 100}%` }} /></div>
                <p className="personal-wallet-label">{percentFormatter.format(usedShare)} utilizado</p>
              </>
            )}
            {(card.rewardProgramName || rewards.length > 0) && (
              <div className="personal-wallet-rewards grid gap-1 text-sm">
                <p className="text-sm font-medium [overflow-wrap:anywhere]">{card.rewardProgramName || 'Benefícios'}</p>
                {rewards.map(reward => <p key={reward} className="personal-wallet-label">{reward}</p>)}
              </div>
            )}
          </div>
        </div>
        <div className="personal-wallet-actions mt-auto flex flex-wrap gap-1.5" role="group" aria-label={`Ações do cartão ${card.name}`}>
          {canPay && <Button type="button" size="sm" className={actionClass} disabled={actionsDisabled} onClick={() => onPayInvoice(card, invoice)}>Registrar pagamento</Button>}
          {card.archived ? (
            onRestoreCard && <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={() => onRestoreCard(card)}>Reativar</Button>
          ) : (
            <>
              {canCredit && <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={() => onCardCredit(card)}>Estorno ou cashback</Button>}
              <Button type="button" size="sm" variant="ghost" className={actionClass} disabled={actionsDisabled} onClick={() => onEditCard(card)}><Pencil size={14} aria-hidden="true" /> Editar</Button>
              <Button type="button" size="sm" variant="ghost" className={actionClass} disabled={actionsDisabled} onClick={() => onArchiveCard(card)}><Archive size={14} aria-hidden="true" /> Arquivar</Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="personal-wallet" data-compact={activeAccounts.length <= 1 && activeCards.length <= 1}>
      <section aria-labelledby="wallet-accounts">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="wallet-accounts" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"><span className="personal-wallet-icon"><Landmark size={19} aria-hidden="true" /></span> Contas bancárias</h2>
          <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={onCreateAccount}><Plus size={15} aria-hidden="true" /> Nova conta</Button>
        </div>
        {activeAccounts.length > 0 ? <div className="personal-wallet-grid">{activeAccounts.map(renderAccount)}</div> : <EmptyWallet kind="bank" />}
      </section>
      <section aria-labelledby="wallet-cards">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="wallet-cards" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"><span className="personal-wallet-icon"><CreditCardIcon size={19} aria-hidden="true" /></span> Cartões de crédito</h2>
          <Button type="button" size="sm" variant="secondary" className={actionClass} disabled={actionsDisabled} onClick={onCreateCard}><Plus size={15} aria-hidden="true" /> Novo cartão</Button>
        </div>
        {activeCards.length > 0 ? <>
          <WalletCardComparison cards={activeCards} invoices={invoices} discreet={discreet} />
          <div className="personal-wallet-grid">{activeCards.map(renderCard)}</div>
        </> : <EmptyWallet kind="credit" />}
      </section>
      {(archivedAccounts.length > 0 || archivedCards.length > 0) && (
        <details>
          <summary className="personal-wallet-archive cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary-500">Contas e cartões arquivados ({archivedAccounts.length + archivedCards.length})</summary>
          <div className="personal-wallet-grid mt-3">{archivedAccounts.map(renderAccount)}{archivedCards.map(renderCard)}</div>
        </details>
      )}
    </div>
  );
}
