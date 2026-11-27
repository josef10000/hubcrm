import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArchiveRestore, ArrowDownToLine, FileCheck2, FileJson, FileSpreadsheet, History,
  ListFilter, Printer, ScanLine, Trash2, Upload, WandSparkles,
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { Button, Card } from '@shared/design-system';
import { getEntryMonth, money, parseMoney, today, type LedgerEntry } from '../ledger';
import type { usePersonalFinance } from '../usePersonalFinance';
import {
  categorize, downloadData, exportCsvCell, importFingerprint, parseImportDate, parseQuickText, parseStatement, receiptDraft,
  useFinanceRules, type CategoryRule, type ImportRow, type Receipt,
} from './financeToolData';
import { exportFinanceBackup, monthCsv, readFinanceBackup, restoreFinanceBackup, type RestorePreview, type RestoreStatus } from './financeBackup';

type Finance = ReturnType<typeof usePersonalFinance>;
interface Props { uid: string; finance: Finance; month: string }
type ToolTab = 'import' | 'rules' | 'receipts' | 'files' | 'activity';
const tabs = [
  ['import', 'Importar', Upload], ['rules', 'Categorias automáticas', ListFilter], ['receipts', 'Comprovantes', FileCheck2],
  ['files', 'Exportar e restaurar', ArrowDownToLine], ['activity', 'Atividade', History],
] as const;
const input = 'w-full min-w-0 rounded-xl border border-text-muted/25 bg-surface-bg px-3 py-2.5 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30';
const muted = 'text-sm leading-relaxed text-text-muted';
const line = 'border-t border-text-muted/15';
const formattedDate = (date: string) => date.split('-').reverse().join('/');
const formattedAmount = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const activityClock = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const periodLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const countOf = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card glass className="!rounded-[20px] border-text-muted/20 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-text-main">{title}</h3>
      {description && <p className={`mt-1 ${muted}`}>{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-text-main">{label}{children}</label>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-text-muted/25 p-4 text-center text-sm text-text-muted">{children}</p>;
}

function FilePicker({ label, accept, onFile, disabled }: { label: string; accept: string; onFile: (file: File) => void; disabled?: boolean }) {
  return (
    <label className="group flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-text-muted/35 bg-surface-bg/50 px-3 py-4 text-sm font-semibold text-text-main focus-within:ring-2 focus-within:ring-primary-500/45 has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
      <Upload size={17} aria-hidden className="text-primary-500" /> {label}
      <input type="file" className="sr-only" accept={accept} disabled={disabled} onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (file) onFile(file);
        event.currentTarget.value = '';
      }} />
    </label>
  );
}

interface PreviewRow extends ImportRow {
  selected: boolean;
  duplicate: boolean;
  amountText: string;
}

function ImportPanel({ uid, finance, rules, prefill }: { uid: string; finance: Finance; rules: CategoryRule[]; prefill: string }) {
  const destinations = [
    ...finance.accounts.filter(item => !item.archived).map(item => ({ value: `account:${item.id}`, label: item.name, group: 'Conta' })),
    ...finance.cards.filter(item => !item.archived).map(item => ({ value: `card:${item.id}`, label: item.name, group: 'Cartão' })),
  ];
  const [destination, setDestination] = useState('');
  const target = destinations.find(item => item.value === destination)?.value ?? destinations[0]?.value ?? '';
  const [targetType, targetId] = target.split(':');
  const asCard = targetType === 'card';
  const [rawText, setRawText] = useState(prefill);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [rejected, setRejected] = useState<string[]>([]);
  const selected = rows.filter(row => row.selected);
  useEffect(() => { if (prefill) setRawText(prefill); }, [prefill]);
  const matchingKind = (row: ImportRow) => asCard ? row.kind === 'income' ? 'cardCredit' : 'purchase' : row.kind;

  function showPreview(parsed: ReturnType<typeof parseStatement>, title: string) {
    const existing = new Set(finance.entries.filter(entry => asCard ? entry.cardId === targetId : entry.bankAccountId === targetId)
      .map(entry => importFingerprint(entry, target, entry.kind)));
    const sameFile = new Set<string>();
    const proposed = parsed.rows.slice(0, 500).map(row => {
      const fingerprint = importFingerprint(row, target, matchingKind(row));
      const unique = row.externalId ? `external:${row.externalId}` : fingerprint;
      const duplicate = existing.has(fingerprint) || sameFile.has(unique);
      sameFile.add(unique);
      return { ...row, selected: !duplicate, duplicate, amountText: formattedAmount.format(row.amountCents / 100),
        category: row.category || categorize(row.description, row.kind, rules) };
    });
    setRows(proposed);
    setSource(title);
    setRejected([]);
    const omitted = parsed.skipped + Math.max(0, parsed.rows.length - proposed.length);
    setNotice(proposed.length
      ? `${proposed.length} linha(s) para revisão${omitted ? ` · ${omitted} ignorada(s) ou fora do limite` : ''}.`
      : 'Nenhum lançamento válido encontrado. Confira os campos e tente novamente.');
  }

  async function handleFile(file: File) {
    setNotice('');
    setBusy(true);
    try {
      if (file.size > 4_000_000) throw new Error('Use um extrato de até 4 MB.');
      const bytes = await file.arrayBuffer();
      const utf8 = new TextDecoder().decode(bytes);
      const text = utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(bytes) : utf8;
      showPreview(parseStatement(text, asCard), file.name);
    } catch (cause) { setNotice(errorMessage(cause, 'Não foi possível ler esse extrato.')); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!targetId || !selected.length) return;
    setBusy(true);
    setRejected([]);
    const errors: string[] = [];
    const completed = new Set<string>();
    let count = 0;
    for (const row of selected) {
      try {
        const amountCents = parseMoney(row.amountText);
        const date = parseImportDate(row.date);
        if (amountCents === null || amountCents <= 0 || !date || !row.description.trim()) {
          throw new Error('Preencha descrição, data e valor positivo.');
        }
        const kind = matchingKind(row);
        const semanticKey = importFingerprint({ ...row, date, amountCents }, target, kind);
        const externalId = row.externalId ? `import|${target}|${row.externalId}` : `import|${semanticKey}`;
        await finance.addEntry({
          kind, amountCents, date, description: row.description.trim(),
          category: row.category.trim(), status: 'paid',
          ...(asCard ? { cardId: targetId } : { bankAccountId: targetId }),
          externalId,
        });
        completed.add(row.id);
        count++;
      } catch (cause) {
        errors.push(`${row.description || 'Linha sem descrição'} — ${errorMessage(cause, 'Falha no registro.')}`);
      }
    }
    setRows(previous => previous.filter(row => !completed.has(row.id)));
    setNotice(`${count} linha(s) confirmada(s)${errors.length ? ` · ${errors.length} precisa(m) de revisão` : ''}.`);
    setRejected(errors);
    setBusy(false);
  }

  function amend(id: string, changed: Partial<PreviewRow>) {
    setRows(previous => previous.map(row => row.id === id ? { ...row, ...changed } : row));
  }

  return (
    <div className="grid gap-4">
      <Panel title="Importar lançamentos">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Destino">
            <select className={input} value={target} disabled={busy || rows.length > 0 || !destinations.length} onChange={event => setDestination(event.target.value)}>
              {!destinations.length && <option value="">Nenhuma conta ou cartão ativo</option>}
              {destinations.map(item => <option key={item.value} value={item.value}>{item.group} · {item.label}</option>)}
            </select>
          </Field>
          <div className="grid min-w-0 items-end">
            <FilePicker label="Escolher extrato CSV ou OFX" accept=".csv,.ofx,.qfx,.tsv,text/csv" onFile={file => void handleFile(file)} disabled={busy || !target} />
          </div>
        </div>
        {!target && <p className={`mt-3 ${muted}`}>Cadastre uma conta ou cartão ativo na Carteira para importar.</p>}
        <div className={`mt-4 grid gap-3 pt-4 ${line}`}>
          <Field label="Lançamento rápido por texto">
            <textarea rows={3} className={input} value={rawText} maxLength={16_000} disabled={busy || !target} onChange={event => setRawText(event.target.value)}
              placeholder={'Ontem mercado R$ 84,90\nRecebi R$ 500,00 de um cliente em 20/11/2026'} />
          </Field>
          <Button variant="secondary" className="w-fit gap-2" disabled={busy || !target || !rawText.trim()} onClick={() => showPreview(parseQuickText(rawText), 'Lançamento por texto')}>
            <WandSparkles size={16} /> Pré-visualizar texto
          </Button>
          <QuickTemplates uid={uid} draft={rawText} onUse={setRawText} disabled={busy} />
        </div>
        {!!notice && <p className={`mt-3 ${muted}`} role="status">{notice}</p>}
      </Panel>
      {!!rows.length && (
        <Panel title="Revisar antes de importar" description={source}>
          <div className="grid divide-y divide-text-muted/15">
            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 py-3 first:pt-0">
                <input className="mt-3 size-4 accent-primary-500" type="checkbox" aria-label={`Selecionar linha ${index + 1}`} checked={row.selected} onChange={event => amend(row.id, { selected: event.target.checked })} disabled={busy} />
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <input className={input} aria-label={`Descrição da linha ${index + 1}`} value={row.description} maxLength={160} disabled={busy}
                    onChange={event => amend(row.id, { description: event.target.value })} />
                  <input className={input} aria-label={`Data da linha ${index + 1}`} value={row.date} type="date" disabled={busy}
                    onChange={event => amend(row.id, { date: event.target.value })} />
                  <input className={input} aria-label={`Valor da linha ${index + 1}`} value={row.amountText} inputMode="decimal" disabled={busy}
                    onChange={event => amend(row.id, { amountText: event.target.value })} />
                  <select className={input} aria-label={`Tipo da linha ${index + 1}`} value={row.kind} disabled={busy}
                    onChange={event => amend(row.id, { kind: event.target.value === 'income' ? 'income' : 'expense' })}>
                    <option value="expense">{asCard ? 'Compra' : 'Despesa'}</option><option value="income">{asCard ? 'Crédito' : 'Receita'}</option>
                  </select>
                  <input className={input} aria-label={`Categoria da linha ${index + 1}`} value={row.category} placeholder="Categoria" maxLength={80} disabled={busy}
                    onChange={event => amend(row.id, { category: event.target.value })} />
                  {row.duplicate && <p className="col-span-full text-xs text-text-muted">Possível duplicidade.</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="gap-2" disabled={busy || !selected.length} onClick={() => void confirm()}>
              <FileCheck2 size={16} /> {busy ? 'Processando…' : `Confirmar ${selected.length} linha(s)`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setRows([]); setRejected([]); }}>Descartar prévia</Button>
          </div>
        </Panel>
      )}
      {!!rejected.length && (
        <Panel title="Linhas que precisam de revisão">
          <ul className={`space-y-1 ${muted}`}>{rejected.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </Panel>
      )}
    </div>
  );
}

interface QuickTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}
function QuickTemplates({ uid, draft, onUse, disabled }: { uid: string; draft: string; onUse: (content: string) => void; disabled: boolean }) {
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [activeId, setActiveId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const ref = query(collection(db, 'personalFinance', uid, 'tools'), where('kind', '==', 'template'));
    return onSnapshot(ref, snapshot => {
      setTemplates(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as QuickTemplate))
        .sort((a, b) => b.createdAt - a.createdAt));
      setError(false);
    }, () => setError(true));
  }, [uid]);
  const selected = templates.find(item => item.id === activeId);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') || '').trim();
    const content = draft.trim();
    if (!name || !content || content.length > 2000) return;
    setSaving(true);
    try {
      const document = await addDoc(collection(db, 'personalFinance', uid, 'tools'), { kind: 'template', name, content, createdAt: Date.now() });
      setActiveId(document.id);
      form.reset();
      toast.success('Modelo salvo');
    } catch { toast.error('Não foi possível salvar o modelo.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'personalFinance', uid, 'tools', selected.id));
      setActiveId('');
      toast.success('Modelo removido');
    } catch { toast.error('Não foi possível remover o modelo.'); }
    finally { setSaving(false); }
  }
  return (
    <details className="rounded-xl border border-text-muted/20 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-text-main">Modelos de lançamento</summary>
      {error ? <p className={`mt-2 ${muted}`}>Erro ao carregar os modelos.</p> : (
        <div className="mt-3 grid gap-3">
          {!!templates.length && <div className="flex flex-wrap gap-2">
            <select className={`${input} flex-1 basis-44`} value={activeId} aria-label="Modelo de lançamento" onChange={event => setActiveId(event.target.value)}>
              <option value="">Selecione um modelo</option>
              {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Button variant="secondary" disabled={!selected || disabled} onClick={() => { if (selected) onUse(selected.content); }}>Aplicar</Button>
            <Button variant="ghost" disabled={!selected || saving || disabled} onClick={() => void remove()} aria-label="Remover modelo"><Trash2 size={16} /></Button>
          </div>}
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-44">
              <Field label="Nome do novo modelo"><input className={input} name="name" maxLength={80} required placeholder="Ex.: Mercado da semana" /></Field>
            </div>
            <Button type="submit" variant="secondary" disabled={!draft.trim() || draft.length > 2000 || saving || disabled}>Salvar texto atual</Button>
          </form>
        </div>
      )}
    </details>
  );
}

function RulesPanel({ uid, rules, ready, error }: { uid: string; rules: CategoryRule[]; ready: boolean; error: boolean }) {
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const pattern = String(data.get('pattern') || '').trim();
    const category = String(data.get('category') || '').trim();
    const matchMode = String(data.get('mode') || 'contains');
    const activityType = String(data.get('type') || 'all');
    if (!pattern || !category) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'personalFinance', uid, 'tools'), { kind: 'rule', pattern, category, matchMode, activityType, createdAt: Date.now() });
      form.reset();
      toast.success('Regra criada');
    } catch { toast.error('Não foi possível salvar a regra.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { await deleteDoc(doc(db, 'personalFinance', uid, 'tools', id)); toast.success('Regra removida'); }
    catch { toast.error('Não foi possível remover a regra.'); }
  }

  return (
    <Panel title="Categorias automáticas" description="Defina palavras que sugerem uma categoria na importação e no lançamento por texto.">
      <form onSubmit={save} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <Field label="Termo da descrição"><input className={input} name="pattern" placeholder="Ex.: padaria central" maxLength={120} required /></Field>
        <Field label="Categoria sugerida"><input className={input} name="category" placeholder="Ex.: Alimentação" maxLength={80} required /></Field>
        <Field label="Correspondência"><select className={input} name="mode"><option value="contains">Contém</option><option value="startsWith">Começa com</option><option value="exact">Igual a</option></select></Field>
        <Field label="Tipo de lançamento"><select className={input} name="type"><option value="all">Receitas e despesas</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></Field>
        <Button type="submit" disabled={busy || error} className="min-h-10">Criar regra</Button>
      </form>
      <div className={`mt-4 pt-4 ${line}`}>
        {error ? <Empty>Erro ao carregar as regras.</Empty> : !ready ? <p className={muted}>Carregando regras…</p> : !rules.length ? <Empty>Nenhuma regra cadastrada.</Empty> : (
          <ul className="divide-y divide-text-muted/15">
            {[...rules].sort((a, b) => b.createdAt - a.createdAt).map(rule => (
              <li key={rule.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2">
                <p className="min-w-0 break-words text-sm text-text-main"><strong>{rule.pattern}</strong><span aria-hidden className="text-text-muted"> → </span><span className="text-text-muted">{rule.category}</span></p>
                <Button variant="ghost" size="sm" aria-label={`Remover regra ${rule.pattern}`} onClick={() => void remove(rule.id)}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const receiptTypes = [...imageTypes, 'application/pdf'];
const receiptLimit = 700_000;

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
}

async function privateReceipt(file: File): Promise<Pick<Receipt, 'mime' | 'dataUrl'>> {
  if (!receiptTypes.includes(file.type)) throw new Error('Use PDF, JPEG, PNG ou WebP.');
  if (file.size > 12_000_000) throw new Error('O arquivo excede 12 MB.');
  if (file.size <= 510_000) {
    return { mime: file.type as Receipt['mime'], dataUrl: await readDataUrl(file) };
  }
  if (file.type === 'application/pdf') throw new Error('Use um PDF de até 510 KB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const factor = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
    if (dataUrl.length > receiptLimit) throw new Error('Use uma imagem menor para anexar o comprovante.');
    return { mime: 'image/jpeg', dataUrl };
  } finally { bitmap.close(); }
}

type DeviceTextDetector = new () => { detect(image: ImageBitmap): Promise<Array<{ rawValue: string }>> };

function ReceiptPanel({ uid, entries, startImport }: { uid: string; entries: LedgerEntry[]; startImport: (text: string) => void }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [entryId, setEntryId] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const Detector = (window as Window & { TextDetector?: DeviceTextDetector }).TextDetector;
  useEffect(() => {
    return onSnapshot(query(collection(db, 'personalFinance', uid, 'tools'), where('kind', '==', 'receipt')), snapshot => {
      setReceipts(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Receipt)).sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
      setListError(false);
    }, () => { setLoading(false); setListError(true); });
  }, [uid]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const data = await privateReceipt(file);
      await addDoc(collection(db, 'personalFinance', uid, 'tools'), {
        kind: 'receipt', name: file.name.slice(0, 150), createdAt: Date.now(), ...data, ...(entryId ? { entryId } : {}),
      });
      setFile(null);
      setEntryId('');
      toast.success('Comprovante guardado');
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível guardar o comprovante.')); }
    finally { setBusy(false); }
  }

  async function scan() {
    if (!Detector || !file || !imageTypes.includes(file.type)) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const detected = await new Detector().detect(bitmap);
        const text = detected.map(item => item.rawValue).join('\n');
        if (!text.trim()) throw new Error('Nenhum texto encontrado na imagem.');
        setContent(text.slice(0, 16_000));
      } finally { bitmap.close(); }
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível ler a imagem.')); }
    finally { setBusy(false); }
  }

  function openQuickImport() {
    const draft = receiptDraft(content) || content;
    if (!parseQuickText(draft).rows.length) { toast.error('Inclua descrição e valor, por exemplo: Mercado R$ 59,90.'); return; }
    startImport(draft);
  }

  async function remove(id: string) {
    try { await deleteDoc(doc(db, 'personalFinance', uid, 'tools', id)); toast.success('Comprovante removido'); }
    catch { toast.error('Não foi possível remover o comprovante.'); }
  }

  async function download(receipt: Receipt) {
    try {
      if (!receiptTypes.includes(receipt.mime) || !receipt.dataUrl.startsWith(`data:${receipt.mime};base64,`)) throw new Error('Formato desconhecido.');
      const bytes = Uint8Array.from(atob(receipt.dataUrl.split(',', 2)[1]), value => value.charCodeAt(0));
      downloadData(new Blob([bytes], { type: receipt.mime }), receipt.name);
    } catch { toast.error('Não foi possível abrir o comprovante.'); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Anexar comprovante" description="Guarde uma imagem ou PDF no seu espaço pessoal e, se quiser, vincule a um lançamento.">
        <form onSubmit={save} className="grid gap-3">
          <FilePicker label={file ? 'Substituir arquivo' : 'Escolher imagem ou PDF'} accept="image/jpeg,image/png,image/webp,application/pdf" onFile={setFile} disabled={busy} />
          {!!file && <p className={`break-words ${muted}`}>{file.name}</p>}
          <Field label="Lançamento vinculado">
            <select className={input} value={entryId} onChange={event => setEntryId(event.target.value)}>
              <option value="">Sem vínculo</option>
              {entries.slice(0, 250).map(item => <option key={item.id} value={item.id}>{formattedDate(item.date)} · {item.description}</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!file || busy} className="gap-2"><FileCheck2 size={16} /> Guardar comprovante</Button>
            {Detector && file && imageTypes.includes(file.type) && (
              <Button variant="secondary" disabled={busy} className="gap-2" onClick={() => void scan()}><ScanLine size={16} /> Ler imagem</Button>
            )}
          </div>
        </form>
        <div className={`mt-4 grid gap-2 pt-4 ${line}`}>
          <Field label="Texto para lançamento">
            <textarea className={input} rows={3} value={content} maxLength={16_000} onChange={event => setContent(event.target.value)} placeholder="Mercado R$ 59,90" />
          </Field>
          <Button variant="secondary" className="w-fit" disabled={!content.trim()} onClick={openQuickImport}>Revisar como lançamento</Button>
        </div>
      </Panel>
      <Panel title="Comprovantes guardados">
        {listError ? <Empty>Erro ao carregar os comprovantes.</Empty> : loading ? <p className={muted}>Carregando comprovantes…</p> : !receipts.length ? <Empty>Nenhum comprovante guardado.</Empty> : (
          <ul className="divide-y divide-text-muted/15">
            {receipts.map(receipt => (
              <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-text-main">{receipt.name}</p>
                  <p className="break-words text-xs text-text-muted">{entries.find(entry => entry.id === receipt.entryId)?.description ?? 'Sem lançamento ativo vinculado'}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" aria-label={`Baixar ${receipt.name}`} onClick={() => void download(receipt)}><ArrowDownToLine size={16} /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Remover ${receipt.name}`} onClick={() => void remove(receipt.id)}><Trash2 size={16} /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function printRows(month: string, records: ReturnType<typeof monthCsv>) {
  const frame = document.createElement('iframe');
  frame.title = 'Impressão do extrato';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:0;bottom:0';
  document.body.append(frame);
  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;
  if (!printDocument || !printWindow) { frame.remove(); return; }
  printDocument.title = `Hub Central · Extrato ${month}`;
  const add = (element: string, text: string, parent: HTMLElement) => {
    const node = printDocument.createElement(element);
    node.textContent = text;
    parent.append(node);
    return node;
  };
  add('style', 'body{font:12px system-ui;color:#172033;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left;border-bottom:1px solid #d9deea}thead{display:table-header-group}tr{break-inside:avoid}th{background:#eff3fb}', printDocument.head);
  add('h1', `Hub Central · Extrato ${month}`, printDocument.body);
  if (!records.length) add('p', 'Sem lançamentos no período.', printDocument.body);
  const table = add('table', '', printDocument.body);
  const header = add('tr', '', add('thead', '', table));
  ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Situação'].forEach(title => add('th', title, header));
  const tbody = add('tbody', '', table);
  records.forEach(record => {
    const row = add('tr', '', tbody);
    record.forEach((value, index) => add('td', index === 4 ? money(Number(value)) : String(value), row));
  });
  printWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
  printWindow.focus();
  printWindow.print();
}

function FilesPanel({ uid, month, finance }: Props) {
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [result, setResult] = useState<RestoreStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = monthCsv(finance.entries.filter(entry => getEntryMonth(entry) === month));

  function csv() {
    const headings = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Situação'];
    const data = rows.map(row => row.map((value, index) => index === 4 ? formattedAmount.format(Number(value) / 100) : value));
    const file = [headings, ...data].map(row => row.map(exportCsvCell).join(';')).join('\r\n');
    downloadData(`\uFEFF${file}`, `hub-extrato-${month}.csv`, 'text/csv;charset=utf-8');
  }

  async function backup() {
    setBusy(true);
    try { await exportFinanceBackup(uid); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível exportar o backup.')); }
    finally { setBusy(false); }
  }

  async function loadBackup(file: File) {
    setResult(null);
    setPreview(null);
    try {
      if (file.size > 16_000_000) throw new Error('Use um backup JSON de até 16 MB.');
      setPreview(readFinanceBackup(await file.text()));
    } catch (cause) { toast.error(errorMessage(cause, 'Arquivo de backup inválido.')); }
  }

  async function restore() {
    if (!preview) return;
    setBusy(true);
    try {
      setResult(await restoreFinanceBackup(uid, preview, finance));
      setPreview(null);
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível concluir a restauração.')); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Extrato do mês" description={`${countOf(rows.length, 'lançamento', 'lançamentos')} em ${periodLabel.format(new Date(`${month}-01T12:00:00Z`))}.`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="gap-2" onClick={csv}><FileSpreadsheet size={16} /> Exportar CSV</Button>
          <Button variant="secondary" className="gap-2" onClick={() => printRows(month, rows)}><Printer size={16} /> Imprimir ou salvar PDF</Button>
        </div>
      </Panel>
      <Panel title="Backup e restauração" description="O JSON inclui lançamentos, comprovantes e outros dados do seu espaço pessoal. Guarde o arquivo em local privado.">
        <div className="grid gap-3">
          <Button variant="secondary" disabled={busy} className="w-fit gap-2" onClick={() => void backup()}><FileJson size={16} /> Exportar backup JSON</Button>
          <FilePicker label="Selecionar backup JSON" accept=".json,application/json" onFile={file => void loadBackup(file)} disabled={busy} />
          {preview && (
            <div className="grid gap-3 rounded-xl border border-text-muted/25 p-3">
              <div>
                <p className="text-sm font-semibold text-text-main">Backup {preview.source}</p>
                <p className={muted}>{countOf(preview.records.accounts.length, 'conta', 'contas')} · {countOf(preview.records.cards.length, 'cartão', 'cartões')} · {countOf(preview.records.entries.length, 'lançamento', 'lançamentos')}</p>
                <p className={`mt-1 ${muted}`}>A restauração adiciona itens compatíveis. Ajustes bancários precisam de nova conciliação. O histórico de alterações é mantido no arquivo.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void restore()}>{busy ? 'Restaurando…' : 'Confirmar restauração'}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setPreview(null)}>Cancelar</Button>
              </div>
            </div>
          )}
          {result && (
            <div role="status" className="grid gap-2">
              <p className={muted}>{result.verified} registro(s) confirmado(s), {result.untouched} preservado(s) ou informativo(s), {result.rejected.length} incompatível(is).</p>
              {!!result.rejected.length && <details><summary className="cursor-pointer text-sm font-semibold">Ver itens incompatíveis</summary>
                <ul className={`mt-2 space-y-1 ${muted}`}>{result.rejected.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
              </details>}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

const actionLabels: Record<string, string> = {
  create: 'Criação', edit: 'Edição', status: 'Situação atualizada', trash: 'Enviado à lixeira', restore: 'Restaurado',
  payInvoice: 'Pagamento registrado', reconcile: 'Conciliação', saveRecurrence: 'Recorrência salva',
  archiveRecurrence: 'Recorrência pausada', generate: 'Lançamentos gerados',
  delete: 'Item excluído',
};

function ActivityPanel({ finance }: { finance: Finance }) {
  const [restoring, setRestoring] = useState('');
  async function restore(id: string) {
    setRestoring(id);
    try { await finance.restoreEntry(id); toast.success('Lançamento restaurado'); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível restaurar o lançamento.')); }
    finally { setRestoring(''); }
  }
  const events = [...finance.audit].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Lixeira" description="Restaure lançamentos que foram removidos do extrato.">
        {!finance.trash.length ? <Empty>Lixeira vazia.</Empty> : (
          <ul className="divide-y divide-text-muted/15">
            {finance.trash.map(entry => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-text-main">{entry.description}</p>
                  <p className="text-xs text-text-muted">{formattedDate(entry.date)} · {money(entry.amountCents)}</p>
                </div>
                <Button variant="secondary" size="sm" className="gap-2" disabled={!!restoring} onClick={() => void restore(entry.id)}><ArchiveRestore size={15} /> Restaurar</Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Histórico de alterações">
        {!events.length ? <Empty>Nenhuma atividade registrada.</Empty> : (
          <ul className="max-h-[420px] divide-y divide-text-muted/15 overflow-auto pr-2">
            {events.slice(0, 150).map(event => {
              const time = new Date(event.at);
              return (
                <li key={event.id} className="py-3 first:pt-0">
                  <p className="text-sm font-semibold text-text-main">{actionLabels[event.action] ?? event.action}</p>
                  <p className="break-words text-xs text-text-muted">{event.label}{Number.isFinite(time.getTime()) ? ` · ${activityClock.format(time)}` : ''}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default function FinanceToolsView({ uid, finance, month }: Props) {
  const [tab, setTab] = useState<ToolTab>('import');
  const [prefill, setPrefill] = useState('');
  const ruleState = useFinanceRules(uid);
  const entries = useMemo(() => [...finance.entries].sort((a, b) => b.date.localeCompare(a.date)), [finance.entries]);
  return (
    <section className="grid gap-4" aria-label="Ferramentas">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ferramentas financeiras">
        {tabs.map(([key, label, Icon]) => (
          <Button key={key} variant={key === tab ? 'secondary' : 'ghost'} className={`gap-2 rounded-xl ${key === tab ? 'text-primary-500 ring-1 ring-primary-500/30' : ''}`}
            size="sm" aria-pressed={key === tab} onClick={() => setTab(key)}>
            <Icon size={15} aria-hidden /> {label}
          </Button>
        ))}
      </div>
      {tab === 'import' && <ImportPanel uid={uid} finance={finance} rules={ruleState.rules} prefill={prefill} />}
      {tab === 'rules' && <RulesPanel {...ruleState} />}
      {tab === 'receipts' && <ReceiptPanel uid={uid} entries={entries} startImport={text => { setPrefill(text); setTab('import'); }} />}
      {tab === 'files' && <FilesPanel uid={uid} month={month} finance={finance} />}
      {tab === 'activity' && <ActivityPanel finance={finance} />}
    </section>
  );
}
