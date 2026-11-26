import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Archive, CreditCard as CreditCardIcon, Landmark, Pencil, Plus, RotateCw, Scale } from 'lucide-react';
import { Badge, Button, Card } from '@shared/design-system';
import { getUsedLimit, money, type BankAccount, type CardInvoice, type CreditCard } from './ledger';
import './PersonalWallet.css';

export interface PersonalWalletProps {
  accounts: BankAccount[];
  cards: CreditCard[];
  balances: ReadonlyMap<string, number>;
  invoices: CardInvoice[];
  selectedMonth: string;
  actionsDisabled?: boolean;
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

function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? dateFormatter.format(parsed) : date;
}

function Instrument({ name, color, finish, front, back, frontDescription, backDescription }: {
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
      className="personal-instrument mx-auto block w-full max-w-[22rem] cursor-pointer rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
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
        <RotateCw size={13} /> Girar
      </span>
    </button>
  );
}

const gridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';

export default function PersonalWallet({
  accounts, cards, balances, invoices, selectedMonth, actionsDisabled = false,
  onCreateAccount, onCreateCard, onEditAccount, onEditCard, onArchiveAccount, onArchiveCard,
  onRestoreAccount, onRestoreCard, onReconcile, onPayInvoice, onCardCredit,
}: PersonalWalletProps) {
  const activeAccounts = accounts.filter(account => !account.archived);
  const activeCards = cards.filter(card => !card.archived);
  const archivedAccounts = accounts.filter(account => account.archived);
  const archivedCards = cards.filter(card => card.archived);

  function renderAccount(account: BankAccount) {
    const balance = balances.get(account.id) ?? account.initialBalanceCents;
    const accountType = account.accountType ? accountTypes[account.accountType] : 'Conta bancária';

    return (
      <Card key={account.id} className="flex min-w-0 flex-col gap-3 p-3" glass>
        <Instrument
          name={account.name}
          color={account.color}
          finish={account.style}
          frontDescription={`Frente. ${account.bank || accountType}. Saldo atual de ${money(balance)}.`}
          backDescription={`Verso. ${accountType}. Saldo inicial de ${money(account.initialBalanceCents)}.`}
          front={<>
            <span className="flex items-center gap-2 text-sm font-semibold"><Landmark size={17} aria-hidden="true" /><span className="truncate">{account.bank || accountType}</span></span>
            <span>
              <span className="block truncate text-lg font-semibold tracking-tight">{account.name}</span>
              <span className="mt-1 block text-xs text-white/85">Saldo atual</span>
              <span className="block text-2xl font-semibold tabular-nums">{money(balance)}</span>
            </span>
          </>}
          back={<>
            <span className="block truncate text-sm font-semibold">{account.name}</span>
            <span className="space-y-3 text-sm">
              <span className="block"><span className="block text-xs text-white/85">Tipo de conta</span>{accountType}</span>
              <span className="block"><span className="block text-xs text-white/85">Saldo inicial</span>{money(account.initialBalanceCents)}</span>
            </span>
          </>}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Ações da conta ${account.name}`}>
          {account.archived ? (
            onRestoreAccount && <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={() => onRestoreAccount(account)}>Reativar</Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={() => onReconcile(account)} className="gap-1.5"><Scale size={14} aria-hidden="true" /> Conciliar</Button>
              <Button type="button" size="sm" variant="ghost" disabled={actionsDisabled} onClick={() => onEditAccount(account)} className="gap-1.5"><Pencil size={14} aria-hidden="true" /> Editar</Button>
              <Button type="button" size="sm" variant="ghost" disabled={actionsDisabled} onClick={() => onArchiveAccount(account)} className="gap-1.5"><Archive size={14} aria-hidden="true" /> Arquivar</Button>
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
    const linkedAccount = accounts.find(account => account.id === card.bankAccountId);
    const linkedAccountLabel = linkedAccount ? `${linkedAccount.name}${linkedAccount.archived ? ' (arquivada)' : ''}` : 'Sem vínculo';
    const cardType = card.virtual ? 'Cartão virtual' : 'Cartão físico';
    const brand = cardBrands[card.brand] ?? card.brand;
    const invoiceAmount = invoice?.totalCents ?? 0;
    const canPay = invoice && invoice.totalCents > 0 && !invoice.paidDate && activeAccounts.length > 0;
    const canCredit = invoices.some(item => item.cardId === card.id && item.totalCents > 0 && !item.paidDate);

    return (
      <Card key={card.id} className="flex min-w-0 flex-col gap-3 p-3" glass>
        <Instrument
          name={card.name}
          color={card.color}
          finish={card.style}
          frontDescription={['Frente', cardType, card.bank, brand, card.lastDigits && `final ${card.lastDigits}`].filter(Boolean).join('. ')}
          backDescription={`Verso. Fecha no dia ${card.closingDay}. Vence no dia ${card.dueDay}. Conta vinculada: ${linkedAccountLabel}.`}
          front={<>
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="flex min-w-0 items-center gap-2"><CreditCardIcon size={17} className="shrink-0" aria-hidden="true" /><span className="truncate">{card.bank || 'Crédito'}</span></span>
              {brand && <span className="truncate rounded-md bg-black/25 px-2 py-1 text-xs">{brand}</span>}
            </span>
            <span>
              <span className="block truncate text-lg font-semibold tracking-tight">{card.name}</span>
              <span className="mt-1 block text-xs text-white/85">{cardType}</span>
              {card.lastDigits && <span className="mt-1 block font-mono text-sm tracking-widest">•••• {card.lastDigits}</span>}
            </span>
          </>}
          back={<>
            <span className="block truncate text-sm font-semibold">{card.name}</span>
            <span className="space-y-3 text-sm">
              <span className="flex gap-5">
                <span><span className="block text-xs text-white/85">Fecha</span>Dia {card.closingDay}</span>
                <span><span className="block text-xs text-white/85">Vence</span>Dia {card.dueDay}</span>
              </span>
              <span className="block truncate"><span className="block text-xs text-white/85">Conta vinculada</span>{linkedAccountLabel}</span>
            </span>
          </>}
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-1 text-sm">
          <div className="min-w-0"><p className="text-xs text-text-muted">Limite disponível</p><p className="font-semibold tabular-nums text-text-main">{money(available)}</p></div>
          <div className="min-w-0"><p className="text-xs text-text-muted">Limite total</p><p className="font-semibold tabular-nums text-text-main">{money(card.limitCents)}</p></div>
          <div className="col-span-2 mt-2 border-t border-text-muted/20 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-text-main">
              <p className="font-medium">{invoiceAmount < 0 ? 'Crédito na fatura' : 'Fatura do mês'}</p>
              <span className="font-semibold tabular-nums">{money(Math.abs(invoiceAmount))}</span>
            </div>
            {invoice && <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs text-text-muted">
              {invoice.paidDate ? <><span>Pagamento em {dateLabel(invoice.paidDate)}</span><Badge variant="success">Paga</Badge></> : <span>Vence em {dateLabel(invoice.dueDate)}</span>}
            </div>}
            {invoice && invoice.totalCents > 0 && !invoice.paidDate && activeAccounts.length === 0 && (
              <p className="mt-1 text-xs text-text-muted">Cadastre ou reative uma conta para pagar.</p>
            )}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5" role="group" aria-label={`Ações do cartão ${card.name}`}>
          {canPay && <Button type="button" size="sm" disabled={actionsDisabled} onClick={() => onPayInvoice(card, invoice)}>Registrar pagamento</Button>}
          {card.archived ? (
            onRestoreCard && <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={() => onRestoreCard(card)}>Reativar</Button>
          ) : (
            <>
              {canCredit && <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={() => onCardCredit(card)}>Estorno ou cashback</Button>}
              <Button type="button" size="sm" variant="ghost" disabled={actionsDisabled} onClick={() => onEditCard(card)} className="gap-1.5"><Pencil size={14} aria-hidden="true" /> Editar</Button>
              <Button type="button" size="sm" variant="ghost" disabled={actionsDisabled} onClick={() => onArchiveCard(card)} className="gap-1.5"><Archive size={14} aria-hidden="true" /> Arquivar</Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="wallet-accounts">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="wallet-accounts" className="flex items-center gap-2 text-lg font-semibold text-text-main"><Landmark size={20} className="text-primary-500" aria-hidden="true" /> Contas bancárias</h2>
          <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={onCreateAccount} className="gap-1.5"><Plus size={15} aria-hidden="true" /> Nova conta</Button>
        </div>
        {activeAccounts.length > 0 ? <div className={gridClass}>{activeAccounts.map(renderAccount)}</div> : (
          <Card glass className="px-4 py-5 text-sm text-text-muted">Cadastre uma conta para acompanhar o saldo, registrar transferências e conciliar lançamentos.</Card>
        )}
      </section>
      <section aria-labelledby="wallet-cards">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="wallet-cards" className="flex items-center gap-2 text-lg font-semibold text-text-main"><CreditCardIcon size={20} className="text-primary-500" aria-hidden="true" /> Cartões de crédito</h2>
          <Button type="button" size="sm" variant="secondary" disabled={actionsDisabled} onClick={onCreateCard} className="gap-1.5"><Plus size={15} aria-hidden="true" /> Novo cartão</Button>
        </div>
        {activeCards.length > 0 ? <div className={gridClass}>{activeCards.map(renderCard)}</div> : (
          <Card glass className="px-4 py-5 text-sm text-text-muted">Cadastre um cartão para acompanhar compras parceladas, limites e faturas.</Card>
        )}
      </section>
      {(archivedAccounts.length > 0 || archivedCards.length > 0) && (
        <details>
          <summary className="mb-3 cursor-pointer text-sm font-medium text-text-muted focus-visible:outline-2 focus-visible:outline-primary-500">Contas e cartões arquivados ({archivedAccounts.length + archivedCards.length})</summary>
          <div className={gridClass}>{archivedAccounts.map(renderAccount)}{archivedCards.map(renderCard)}</div>
        </details>
      )}
    </div>
  );
}
