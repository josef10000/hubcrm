import { cloneElement, useEffect, useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/design-system';
import {
  MAX_INSTALLMENTS, TAX_DEDUCTION_CATEGORIES, money, parseMoney, today,
  type BankAccount, type CardInvoice, type CreditCard, type EntryInput, type LedgerEntry,
} from './ledger';
import type { usePersonalFinance } from './usePersonalFinance';
import { categorize, useFinanceRules } from './tools/financeToolData';
import { bankPresets, inferBankPreset } from './walletBranding';

export type FinanceDialog =
  | { type: 'account'; account?: BankAccount }
  | { type: 'card'; card?: CreditCard }
  | { type: 'entry'; entry?: LedgerEntry; settled?: boolean }
  | { type: 'trashEntry'; entry: LedgerEntry }
  | { type: 'payment'; card: CreditCard; invoice: CardInvoice }
  | { type: 'credit'; card: CreditCard; month: string }
  | { type: 'reconcile'; account: BankAccount; balance: number }
  | { type: 'archiveAccount'; account: BankAccount }
  | { type: 'archiveCard'; card: CreditCard }
  | { type: 'deleteAccount'; account: BankAccount }
  | { type: 'deleteCard'; card: CreditCard };

type EntryKind = Extract<LedgerEntry['kind'], 'income' | 'expense' | 'transfer' | 'purchase'>;
type Finance = ReturnType<typeof usePersonalFinance>;

const control = 'w-full rounded-xl border border-text-muted/25 bg-surface-bg px-3 py-2.5 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';
const brlInput = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (date: string) => date.split('-').reverse().join('/');

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5 text-sm font-medium text-text-main">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

function Amount({ label = 'Valor (R$)', cents, readOnly }: { label?: string; cents?: number; readOnly?: boolean }) {
  return (
    <Field label={label}>
      <input name="amount" className={control} inputMode="decimal" placeholder="0,00" required readOnly={readOnly}
        defaultValue={cents === undefined ? undefined : brlInput.format(cents / 100)} />
    </Field>
  );
}

function DateField({ label = 'Data', max, date = today(), readOnly }: { label?: string; max?: string; date?: string; readOnly?: boolean }) {
  return (
    <Field label={label}>
      <input name="date" type="date" className={control} required defaultValue={date} max={max} readOnly={readOnly} />
    </Field>
  );
}

function AccountField({ accounts, label = 'Conta', name = 'bankAccountId', defaultValue, optional }: {
  accounts: BankAccount[];
  label?: string;
  name?: string;
  defaultValue?: string;
  optional?: boolean;
}) {
  return (
    <Field label={label}>
      <select name={name} className={control} required={!optional} defaultValue={defaultValue || ''}>
        <option value="">{optional ? 'Sem conta vinculada' : 'Selecione uma conta'}</option>
        {accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.archived ? ' (arquivada)' : ''}</option>)}
      </select>
    </Field>
  );
}

const finishes = [
  ['gradient', 'Degradê'], ['solid', 'Sólido'], ['metallic', 'Metálico'],
  ['brushed', 'Escovado'], ['glass', 'Vidro'], ['holographic', 'Holográfico'],
] as const;

function Appearance({ color, style }: { color?: string; style?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Cor">
        <select name="color" className={control} defaultValue={color || ''}>
          <option value="">Tema do Hub</option>
          {bankPresets.map(item => <option key={item.id} value={item.color}>{item.name}</option>)}
          <option value="#6d28d9">Roxo</option>
          <option value="#1d4ed8">Azul</option>
          <option value="#047857">Verde</option>
          <option value="#be123c">Rosa</option>
          <option value="#b45309">Âmbar</option>
          <option value="#374151">Grafite</option>
        </select>
      </Field>
      <Field label="Acabamento">
        <select name="style" className={control} defaultValue={style || 'gradient'}>
          {finishes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
    </div>
  );
}

function BankIdentity({ bank, bankPreset }: { bank?: string; bankPreset?: BankAccount['bankPreset'] }) {
  const preset = bankPreset || inferBankPreset(bank || '');
  const [selected, setSelected] = useState(preset);
  const [bankName, setBankName] = useState(bank || '');
  const logo = bankPresets.find(item => item.id === selected);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Logo do banco">
        <select name="bankPreset" className={control} value={selected} onChange={event => {
          const value = event.target.value as NonNullable<BankAccount['bankPreset']>;
          setSelected(value);
          if (value !== 'custom') setBankName(bankPresets.find(item => item.id === value)?.name || bankName);
        }}>
          {bankPresets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      {logo && <span className="-mt-2 inline-flex items-center gap-2 text-xs text-text-muted sm:col-span-2">
        {logo.id !== 'custom' && <img className="personal-wallet-brand-logo" src={`/logos/banks/${logo.id}.svg`} alt="" />}
        Identidade visual {logo.name} · acabamento {logo.style}
      </span>}
      <Field label="Banco ou instituição">
        <input name="bank" className={control} required maxLength={80} value={bankName} onChange={event => setBankName(event.target.value)} placeholder="Nome do banco" />
      </Field>
    </div>
  );
}

function AccountFields({ account }: { account?: BankAccount }) {
  return (
    <>
      <BankIdentity bank={account?.bank} bankPreset={account?.bankPreset} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da conta">
          <input name="name" className={control} required maxLength={80} defaultValue={account?.name} placeholder="Conta do dia a dia" />
        </Field>
        <Field label="Banco ou instituição">
          <input name="bank" className={control} required maxLength={80} defaultValue={account?.bank} placeholder="Nome do banco" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de conta">
          <select name="accountType" className={control} defaultValue={account?.accountType || 'checking'}>
            <option value="checking">Corrente</option>
            <option value="digital">Digital</option>
            <option value="savings">Poupança</option>
            <option value="salary">Salário</option>
            <option value="investment">Investimento</option>
          </select>
        </Field>
        <Amount label="Saldo inicial (R$)" cents={account?.initialBalanceCents ?? 0} />
      </div>
      <Appearance color={account?.color || bankPresets.find(item => item.id === (account?.bankPreset || inferBankPreset(account?.bank || '')))?.color}
        style={account?.style || bankPresets.find(item => item.id === (account?.bankPreset || inferBankPreset(account?.bank || '')))?.style} />
    </>
  );
}

function CardFields({ card, accounts }: { card?: CreditCard; accounts: BankAccount[] }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome do cartão">
          <input name="name" className={control} required maxLength={80} defaultValue={card?.name} placeholder="Meu cartão" />
        </Field>
        <BankIdentity bank={card?.bank} bankPreset={card?.bankPreset} />
        <Field label="Bandeira">
          <select name="brand" className={control} defaultValue={card?.brand || 'other'}>
            <option value="other">Outra</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="elo">Elo</option>
            <option value="amex">American Express</option>
            <option value="hipercard">Hipercard</option>
          </select>
        </Field>
        <Field label="Quatro últimos dígitos">
          <input name="lastDigits" className={control} inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
            defaultValue={card?.lastDigits} placeholder="Opcional" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Amount label="Limite (R$)" cents={card?.limitCents} />
        <Field label="Limite mensal (R$)">
          <input name="monthlyLimit" className={control} inputMode="decimal" placeholder="Opcional"
            defaultValue={card?.monthlyLimitCents === undefined ? undefined : brlInput.format(card.monthlyLimitCents / 100)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dia de fechamento">
          <input name="closingDay" type="number" min={1} max={31} className={control} required defaultValue={card?.closingDay} />
        </Field>
        <Field label="Dia de vencimento">
          <input name="dueDay" type="number" min={1} max={31} className={control} required defaultValue={card?.dueDay} />
        </Field>
      </div>
      <AccountField accounts={accounts} label="Conta para pagamento" defaultValue={card?.bankAccountId} optional />
      <Appearance color={card?.color || bankPresets.find(item => item.id === (card?.bankPreset || inferBankPreset(card?.bank || '')))?.color}
        style={card?.style || bankPresets.find(item => item.id === (card?.bankPreset || inferBankPreset(card?.bank || '')))?.style} />
      <details open={Boolean(card?.cashbackPercent || card?.pointsPerDollar || card?.rewardProgramName)}
        className="rounded-xl border border-text-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Cashback e pontos</summary>
        <div className="mt-3 grid gap-3">
          <Field label="Programa de recompensas"><input name="rewardProgramName" className={control} maxLength={80} defaultValue={card?.rewardProgramName} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cashback (%)"><input name="cashbackPercent" className={control} type="number" min={0} max={100} step="any" defaultValue={card?.cashbackPercent} /></Field>
            <Field label="Pontos por dólar"><input name="pointsPerDollar" className={control} type="number" min={0} max={10000} step="any" defaultValue={card?.pointsPerDollar} /></Field>
          </div>
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm text-text-main">
        <input name="virtual" type="checkbox" className="accent-primary-500" defaultChecked={card?.virtual} /> Cartão virtual
      </label>
    </>
  );
}

function EntryFields({ uid, accounts, cards, entry, settled }: { uid: string; accounts: BankAccount[]; cards: CreditCard[]; entry?: LedgerEntry; settled?: boolean }) {
  const initialKind = entry ? entry.kind as EntryKind : accounts.length ? 'expense' : 'purchase';
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [description, setDescription] = useState(entry?.description ?? '');
  const [category, setCategory] = useState<string | undefined>(entry?.category ?? (entry ? '' : undefined));
  const { rules } = useFinanceRules(uid);
  const suggestedCategory = kind === 'transfer' ? '' : categorize(description, kind === 'income' ? 'income' : 'expense', rules);
  const cash = kind === 'income' || kind === 'expense';
  const purchaseDetails = kind === 'expense' || kind === 'purchase';
  const hasInstallments = (entry?.installmentCount ?? 0) > 1;
  const hasDetails = Boolean(entry?.tags?.length || entry?.warrantyUntil || entry?.reimbursement ||
    entry?.taxDeductionCategory || entry?.foreignCurrency);

  return (
    <>
      <Field label="Tipo de lançamento">
        <select name="kind" className={control} disabled={Boolean(entry)} value={kind} onChange={event => setKind(event.target.value as EntryKind)}>
          <option value="expense" disabled={!accounts.length && kind !== 'expense'}>Despesa em conta</option>
          <option value="income" disabled={!accounts.length && kind !== 'income'}>Receita em conta</option>
          <option value="transfer" disabled={accounts.length < 2 && kind !== 'transfer'}>Transferência entre contas</option>
          <option value="purchase" disabled={!cards.length && kind !== 'purchase'}>Compra no cartão</option>
        </select>
      </Field>
      <Field label="Descrição">
        <input name="description" className={control} required maxLength={160} placeholder="Ex. supermercado" value={description} onChange={event => setDescription(event.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Amount label={hasInstallments ? 'Valor da parcela (R$)' : 'Valor (R$)'} cents={entry?.amountCents} readOnly={settled} />
        <DateField date={entry?.date} readOnly={hasInstallments || settled} />
      </div>
      {kind === 'purchase' ? (
        <div className={`grid gap-3 ${entry ? '' : 'sm:grid-cols-2'}`}>
          <Field label="Cartão">
            <select name="cardId" className={control} required disabled={hasInstallments || settled} defaultValue={entry?.cardId ?? ''}>
              <option value="">Selecione um cartão</option>
              {cards.map(card => <option key={card.id} value={card.id}>{card.name}{card.archived ? ' (arquivado)' : ''}</option>)}
            </select>
          </Field>
          {!entry && <Field label="Número de parcelas">
            <input name="installments" type="number" min={1} max={MAX_INSTALLMENTS} className={control} required defaultValue={1} />
          </Field>}
          {settled && <p className="text-sm text-text-muted">Fatura paga. Você pode editar os detalhes do lançamento.</p>}
          {hasInstallments && <p className="text-sm text-text-muted">A edição se aplica à parcela {entry?.installment} de {entry?.installmentCount}.</p>}
        </div>
      ) : (
        <AccountField accounts={accounts} label={kind === 'transfer' ? 'Conta de origem' : 'Conta'} defaultValue={entry?.bankAccountId} />
      )}
      {kind === 'transfer' && <AccountField accounts={accounts} label="Conta de destino" name="targetBankAccountId" defaultValue={entry?.targetBankAccountId} />}
      {kind !== 'transfer' && (
        <Field label="Categoria">
          <input name="category" className={control} maxLength={80} placeholder="Opcional" value={category ?? suggestedCategory} onChange={event => setCategory(event.target.value)} />
        </Field>
      )}
      {cash && (
        <Field label="Situação">
          <select name="status" className={control} defaultValue={entry?.status ?? 'paid'}>
            <option value="paid">{kind === 'income' ? 'Recebido' : 'Pago'}</option>
            <option value="pending">Pendente</option>
          </select>
        </Field>
      )}
      {kind !== 'transfer' && (
        <details open={hasDetails} className="rounded-xl border border-text-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold">Detalhes do lançamento</summary>
          <div className="mt-3 grid gap-3">
            <Field label="Etiquetas"><input name="tags" className={control} placeholder="Separe por vírgula" maxLength={264} defaultValue={entry?.tags?.join(', ')} /></Field>
            {purchaseDetails && <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Garantia até"><input name="warrantyUntil" className={control} type="date" defaultValue={entry?.warrantyUntil} /></Field>
                <Field label="Reembolso"><select name="reimbursement" className={control} defaultValue={entry?.reimbursement ?? ''}>
                  <option value="">Sem reembolso</option><option value="pending">A reembolsar</option><option value="received">Reembolsado</option>
                </select></Field>
              </div>
              <Field label="Dedução no IRPF"><select name="taxDeductionCategory" className={control} defaultValue={entry?.taxDeductionCategory ?? ''}>
                <option value="">Sem marcação fiscal</option>
                {TAX_DEDUCTION_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </select></Field>
            </>}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Moeda original"><select name="foreignCurrency" className={control} defaultValue={entry?.foreignCurrency ?? ''}>
                <option value="">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select></Field>
              <Field label="Valor na moeda"><input name="foreignAmount" className={control} inputMode="decimal" placeholder="Opcional"
                defaultValue={entry?.foreignAmountCents ? brlInput.format(entry.foreignAmountCents / 100) : undefined} /></Field>
              <Field label="Câmbio em R$"><input name="exchangeRate" className={control} type="number" min="0.000001" max={100000} step="any" defaultValue={entry?.exchangeRate} /></Field>
            </div>
          </div>
        </details>
      )}
    </>
  );
}

function titleFor(dialog: FinanceDialog) {
  switch (dialog.type) {
    case 'account': return dialog.account ? 'Editar conta' : 'Nova conta';
    case 'card': return dialog.card ? 'Editar cartão' : 'Novo cartão';
    case 'entry': return dialog.entry ? 'Editar lançamento' : 'Novo lançamento';
    case 'trashEntry': return 'Mover para a lixeira';
    case 'payment': return 'Registrar pagamento de fatura';
    case 'credit': return 'Registrar estorno ou cashback';
    case 'reconcile': return 'Conciliar saldo';
    case 'archiveAccount': return 'Arquivar conta';
    case 'archiveCard': return 'Arquivar cartão';
    case 'deleteAccount': return 'Excluir conta';
    case 'deleteCard': return 'Excluir cartão';
  }
}

export default function PersonalFinanceDialog({ uid, dialog, finance, onClose, onSuccess }: {
  uid: string;
  dialog: FinanceDialog;
  finance: Finance;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const element = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accounts = finance.accounts.filter(account => !account.archived);
  const archiving = dialog.type === 'archiveCard' || dialog.type === 'archiveAccount';
  const deleting = dialog.type === 'trashEntry';
  const deletingWalletItem = dialog.type === 'deleteAccount' || dialog.type === 'deleteCard';
  const creditInvoices = dialog.type === 'credit'
    ? finance.invoices.filter(invoice => invoice.cardId === dialog.card.id && !invoice.paidDate && invoice.totalCents > 0)
      .sort((a, b) => a.month.localeCompare(b.month))
    : [];
  const creditMonth = dialog.type === 'credit' && creditInvoices.some(invoice => invoice.month === dialog.month)
    ? dialog.month
    : creditInvoices[0]?.month;

  useEffect(() => {
    const modal = element.current;
    if (modal && !modal.open) {
      modal.showModal();
      modal.querySelector<HTMLElement>('fieldset input:not([type="hidden"]), fieldset select')?.focus();
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? '').trim();
    const amount = (name = 'amount') => {
      const value = parseMoney(field(name));
      if (value === null) throw new Error('Digite um valor com até duas casas decimais.');
      return value;
    };
    const style = () => field('style') as NonNullable<BankAccount['style']>;
    const date = field('date');
    const bankAccountId = field('bankAccountId');
    setError('');
    saving.current = true;
    setBusy(true);
    try {
      switch (dialog.type) {
        case 'account':
          await finance.saveAccount({
            name: field('name'), bank: field('bank'), bankPreset: field('bankPreset') as BankAccount['bankPreset'], initialBalanceCents: amount(),
            accountType: field('accountType') as NonNullable<BankAccount['accountType']>,
            color: field('color'), style: style(),
          }, dialog.account?.id);
          break;
        case 'card':
          await finance.saveCard({
            name: field('name'), bank: field('bank'), bankPreset: field('bankPreset') as BankAccount['bankPreset'], brand: field('brand'), lastDigits: field('lastDigits'),
            bankAccountId, limitCents: amount(), closingDay: Number(field('closingDay')), dueDay: Number(field('dueDay')),
            color: field('color'), style: style(), virtual: data.has('virtual'),
            monthlyLimitCents: field('monthlyLimit') ? amount('monthlyLimit') : undefined,
            rewardProgramName: field('rewardProgramName') || undefined,
            cashbackPercent: field('cashbackPercent') ? Number(field('cashbackPercent')) : undefined,
            pointsPerDollar: field('pointsPerDollar') ? Number(field('pointsPerDollar')) : undefined,
          }, dialog.card?.id);
          break;
        case 'entry': {
          const kind = (dialog.entry?.kind || field('kind')) as EntryKind;
          const input: EntryInput = { kind, description: field('description'), date, amountCents: amount() };
          if (kind === 'purchase') {
            input.cardId = field('cardId') || dialog.entry?.cardId;
          } else {
            input.bankAccountId = bankAccountId;
            if (kind === 'transfer') input.targetBankAccountId = field('targetBankAccountId');
            else input.status = field('status') === 'pending' ? 'pending' : 'paid';
          }
          if (kind !== 'transfer') {
            input.category = field('category') || undefined;
            input.tags = field('tags').split(',').map(tag => tag.trim()).filter(Boolean);
            input.warrantyUntil = field('warrantyUntil') || undefined;
            input.reimbursement = (field('reimbursement') || undefined) as EntryInput['reimbursement'];
            input.taxDeductionCategory = field('taxDeductionCategory') || undefined;
            const foreignCurrency = field('foreignCurrency');
            if (foreignCurrency) {
              input.foreignCurrency = foreignCurrency as EntryInput['foreignCurrency'];
              input.foreignAmountCents = amount('foreignAmount');
              input.exchangeRate = Number(field('exchangeRate'));
            }
          }
          if (dialog.entry) await finance.updateEntry(dialog.entry.id, input);
          else await finance.addEntry(input, kind === 'purchase' ? Number(field('installments')) : 1);
          break;
        }
        case 'trashEntry':
          await finance.trashEntry(dialog.entry.id);
          break;
        case 'payment':
          await finance.payInvoice(dialog.invoice.id, bankAccountId, date, dialog.invoice.totalCents);
          break;
        case 'credit':
          await finance.addEntry({
            kind: 'cardCredit', description: field('description'), date, amountCents: amount(),
            cardId: dialog.card.id, invoiceMonth: field('invoiceMonth'),
          });
          break;
        case 'reconcile': {
          const adjustment = await finance.reconcileAccount(dialog.account.id, amount(), date);
          onSuccess(adjustment ? 'Ajuste de conciliação registrado.' : 'O saldo já está conciliado.');
          return;
        }
        case 'archiveAccount':
          await finance.archiveAccount(dialog.account.id);
          break;
        case 'archiveCard':
          await finance.archiveCard(dialog.card.id);
          break;
        case 'deleteAccount':
          await finance.deleteAccount(dialog.account.id);
          break;
        case 'deleteCard':
          await finance.deleteCard(dialog.card.id);
          break;
      }
      onSuccess(archiving ? 'Item arquivado.' : deleting ? 'Lançamento movido para a lixeira.' : deletingWalletItem ? 'Item excluído.' : 'Alteração registrada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={element} aria-labelledby="personal-finance-dialog-title"
      onCancel={event => { event.preventDefault(); if (!saving.current) onClose(); }}
      className="personal-finance-panel m-auto max-h-[90dvh] w-[min(calc(100%-2rem),34rem)] max-w-none overflow-y-auto text-text-main shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 id="personal-finance-dialog-title" className="text-xl font-bold tracking-tight">{titleFor(dialog)}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={18} /></Button>
        </div>
        <fieldset disabled={busy} className="grid min-w-0 gap-4">
          {dialog.type === 'account' && <AccountFields account={dialog.account} />}
          {dialog.type === 'card' && <CardFields card={dialog.card}
            accounts={finance.accounts.filter(account => !account.archived || account.id === dialog.card?.bankAccountId)} />}
          {dialog.type === 'entry' && <EntryFields uid={uid} entry={dialog.entry} settled={dialog.settled}
            accounts={finance.accounts.filter(account => !account.archived || account.id === dialog.entry?.bankAccountId || account.id === dialog.entry?.targetBankAccountId)}
            cards={finance.cards.filter(card => !card.archived || card.id === dialog.entry?.cardId)} />}
          {dialog.type === 'trashEntry' && <p className="text-sm text-text-muted">
            {dialog.entry.description} será removido dos totais. Você pode restaurá-lo em Ferramentas, na lixeira.
          </p>}
          {dialog.type === 'payment' && (
            <>
              <p className="text-sm text-text-muted">
                {dialog.card.name} · {money(dialog.invoice.totalCents)} · vence em {dateLabel(dialog.invoice.dueDate)}.
                Informe a conta debitada e a data do pagamento.
              </p>
              <AccountField accounts={accounts} label="Conta debitada" defaultValue={dialog.card.bankAccountId} />
              <DateField label="Data do pagamento" max={today()} />
            </>
          )}
          {dialog.type === 'credit' && (
            <>
              <Field label="Descrição">
                <input name="description" className={control} required maxLength={160} placeholder="Ex. estorno de compra" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Amount />
                <DateField />
              </div>
              <Field label="Mês da fatura">
                <select name="invoiceMonth" className={control} required defaultValue={creditMonth}>
                  {creditInvoices.length === 0 && <option value="">Sem faturas em aberto</option>}
                  {creditInvoices.map(invoice => (
                    <option key={invoice.id} value={invoice.month}>
                      Vence em {dateLabel(invoice.dueDate)} · {money(invoice.totalCents)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {dialog.type === 'reconcile' && (
            <>
              <p className="text-sm text-text-muted">Saldo registrado em {dialog.account.name} · {money(dialog.balance)}. Informe o saldo atual do banco para registrar a diferença.</p>
              <Amount label="Saldo atual no banco (R$)" cents={dialog.balance} />
              <input name="date" type="hidden" value={today()} />
            </>
          )}
          {dialog.type === 'archiveAccount' && <p className="text-sm text-text-muted">A conta {dialog.account.name} sairá da carteira ativa. O extrato mantém o histórico.</p>}
          {dialog.type === 'archiveCard' && <p className="text-sm text-text-muted">O cartão {dialog.card.name} sairá da carteira ativa. O extrato mantém o histórico.</p>}
          {dialog.type === 'deleteAccount' && <p className="text-sm text-text-muted">A conta {dialog.account.name} será excluída permanentemente. Contas com lançamentos, cartões, recorrências ou pagamentos vinculados precisam ser arquivadas para preservar o histórico.</p>}
          {dialog.type === 'deleteCard' && <p className="text-sm text-text-muted">O cartão {dialog.card.name} será excluído permanentemente. Cartões com compras, faturas ou recorrências precisam ser arquivados para preservar o histórico.</p>}
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-accent-error/10 p-3 text-sm text-accent-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant={archiving || deleting || deletingWalletItem ? 'danger' : 'primary'} disabled={busy || (dialog.type === 'credit' && creditInvoices.length === 0)}>
            {busy ? 'Salvando…' : deletingWalletItem ? 'Excluir permanentemente' : archiving ? 'Arquivar' : deleting ? 'Mover para lixeira' : 'Salvar'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
