import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assertDate, MAX_AMOUNT_CENTS, parseMoney, today } from '../ledger';

export interface CategoryRule {
  id: string;
  kind: 'rule';
  pattern: string;
  category: string;
  matchMode?: 'contains' | 'startsWith' | 'exact';
  activityType?: 'all' | 'income' | 'expense';
  createdAt: number;
}

export interface Receipt {
  id: string;
  kind: 'receipt';
  name: string;
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  dataUrl: string;
  entryId?: string;
  createdAt: number;
}

export interface ImportRow {
  id: string;
  externalId?: string;
  date: string;
  description: string;
  amountCents: number;
  kind: 'income' | 'expense';
  category: string;
}

export function useFinanceRules(uid: string) {
  const [data, setData] = useState<{ uid: string; rules: CategoryRule[]; ready: boolean; error: boolean }>({
    uid, rules: [], ready: false, error: false,
  });
  useEffect(() => {
    return onSnapshot(query(collection(db, 'personalFinance', uid, 'tools'), where('kind', '==', 'rule')), snapshot => {
      setData({ uid, rules: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CategoryRule)), ready: true, error: false });
    }, () => setData({ uid, rules: [], ready: true, error: true }));
  }, [uid]);
  return data.uid === uid ? data : { uid, rules: [], ready: false, error: false };
}

export function normalizeText(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const categoryHints: Array<[RegExp, string]> = [
  [/\b(ifood|restaurante|padaria|lanche|cafe|mercado|supermercado|hortifruti)\b/, 'Alimentação'],
  [/\b(uber|99app|posto|combustivel|gasolina|pedagio|onibus|metro)\b/, 'Transporte'],
  [/\b(aluguel|condominio|iptu|energia|luz|agua|internet)\b/, 'Moradia'],
  [/\b(farmacia|drogaria|medico|dentista|exame|hospital)\b/, 'Saúde'],
  [/\b(escola|curso|livraria|faculdade|universidade)\b/, 'Educação'],
  [/\b(spotify|netflix|prime video|disney|hbo|apple music)\b/, 'Assinaturas'],
  [/\b(cinema|viagem|hotel|teatro|show)\b/, 'Lazer'],
];

export function categorize(description: string, kind: ImportRow['kind'], rules: CategoryRule[]) {
  const normalized = normalizeText(description);
  const matched = [...rules].sort((a, b) => b.pattern.length - a.pattern.length || b.createdAt - a.createdAt)
    .find(rule => {
      const pattern = normalizeText(rule.pattern);
      if (!pattern || (rule.activityType && rule.activityType !== 'all' && rule.activityType !== kind)) return false;
      if (rule.matchMode === 'exact') return normalized === pattern;
      if (rule.matchMode === 'startsWith') return normalized.startsWith(pattern);
      return normalized.includes(pattern);
    });
  if (matched) return matched.category;
  if (kind === 'income') return /\b(salario|folha|pro labore)\b/.test(normalized) ? 'Salário' : '';
  return categoryHints.find(([hint]) => hint.test(normalized))?.[1] ?? '';
}

export function parseImportDate(raw: string) {
  const text = raw.trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  const localized = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const ofx = text.match(/^(\d{4})(\d{2})(\d{2})(?:\d{6}(?:\.\d+)?(?:\[[^\]]+\])?)?$/);
  const date = iso
    ? `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    : localized
      ? `${localized[3]}-${localized[2].padStart(2, '0')}-${localized[1].padStart(2, '0')}`
      : ofx ? `${ofx[1]}-${ofx[2]}-${ofx[3]}` : '';
  try {
    assertDate(date);
    return date;
  } catch {
    return '';
  }
}

function amountFromStatement(raw: string) {
  const value = raw.replace(/[\u00a0\u202f ]/g, '').replace(/^R\$/i, '').replace(/^-R\$/i, '-')
    .replace(/([0-9])C$/i, '$1').replace(/^([0-9][0-9.,]*)D$/i, '-$1');
  const signed = /^\(.*\)$/.test(value) ? `-${value.slice(1, -1)}` : value.replace(/^\+/, '');
  return parseMoney(signed);
}

function delimit(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character !== '"') cell += character;
      else if (text[index + 1] === '"') { cell += '"'; index++; }
      else quoted = false;
    } else if (character === '"' && !cell.trim()) {
      cell = '';
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index++;
      if (row.length || cell.trim()) rows.push([...row, cell.trim()]);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('O CSV contém um campo entre aspas que ficou aberto.');
  if (row.length || cell.trim()) rows.push([...row, cell.trim()]);
  return rows;
}

const dateFields = ['data', 'date', 'data de lancamento', 'data do lancamento', 'data efetiva', 'data movimento', 'data da transacao'];
const descriptionFields = ['descricao', 'description', 'lancamento', 'historico', 'title', 'titulo', 'estabelecimento', 'memo', 'detalhes', 'nome'];
const amountFields = ['valor', 'amount', 'valor r$', 'valor da transacao', 'valor (r$)', 'trnamt', 'total'];
const categoryFields = ['categoria', 'category'];
const typeFields = ['tipo', 'type', 'natureza', 'credito/debito'];
const idFields = ['fitid', 'id', 'identificador', 'id da transacao', 'documento', 'numero do documento'];
const creditFields = ['credito', 'credit', 'creditos', 'entrada', 'entradas'];
const debitFields = ['debito', 'debit', 'debitos', 'saida', 'saidas'];

export interface ParsedImport {
  rows: ImportRow[];
  skipped: number;
}

function makeRow(index: number, date: string, description: string, signed: number, category: string, externalId?: string): ImportRow | null {
  if (!date || !description.trim() || !Number.isSafeInteger(signed) || signed === 0 || Math.abs(signed) > MAX_AMOUNT_CENTS) return null;
  return {
    id: String(index), date,
    description: description.replace(/\s+/g, ' ').trim().slice(0, 160),
    amountCents: Math.abs(signed), kind: signed < 0 ? 'expense' : 'income',
    category: category.trim().slice(0, 80), ...(externalId ? { externalId } : {}),
  };
}

export function parseStatement(text: string, asCard = false): ParsedImport {
  const clean = text.replace(/^\uFEFF/, '');
  if (/<OFX[>\s]/i.test(clean) || /<STMTTRN>/i.test(clean)) return parseOfx(clean);
  const firstLine = clean.split(/\r?\n/).find(line => line.trim()) ?? '';
  const delimiter = [',', ';', '\t'].reduce((best, current) => (
    delimit(firstLine, current)[0]?.length > delimit(firstLine, best)[0]?.length ? current : best
  ), ',');
  const records = delimit(clean, delimiter);
  if (records.length < 2) throw new Error('O CSV deve conter um cabeçalho e pelo menos uma linha.');
  const find = (choices: string[]) => records[0].findIndex(value => choices.includes(normalizeText(value)));
  const dateIndex = find(dateFields);
  const descriptionIndex = find(descriptionFields);
  const amountIndex = find(amountFields);
  const categoryIndex = find(categoryFields);
  const typeIndex = find(typeFields);
  const idIndex = find(idFields);
  const creditIndex = find(creditFields);
  const debitIndex = find(debitFields);
  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && creditIndex < 0 && debitIndex < 0)) {
    throw new Error('Use colunas Data, Descrição e Valor ou colunas de Crédito e Débito.');
  }
  const rows = records.slice(1).flatMap((columns, index) => {
    const date = parseImportDate(columns[dateIndex] ?? '');
    const value = amountIndex < 0
      ? Math.abs(amountFromStatement(columns[creditIndex] ?? '') ?? 0) - Math.abs(amountFromStatement(columns[debitIndex] ?? '') ?? 0)
      : amountFromStatement(columns[amountIndex] ?? '');
    if (value === null) return [];
    const explicitType = normalizeText(columns[typeIndex] ?? '');
    if (['transferencia', 'transfer', 'conciliacao', 'ajuste', 'pagamento de fatura', 'invoicepayment'].includes(explicitType)) return [];
    let signed = asCard && amountIndex >= 0 ? -value : value;
    if (['expense', 'despesa', 'debito', 'd', 'saida', 'compra', 'compra no cartao'].includes(explicitType)) signed = -Math.abs(value);
    if (['income', 'receita', 'credito', 'c', 'entrada', 'estorno', 'credito no cartao'].includes(explicitType)) signed = Math.abs(value);
    const externalId = columns[idIndex]?.trim();
    const record = makeRow(index, date, columns[descriptionIndex] ?? '', signed, columns[categoryIndex] ?? '', externalId);
    return record ? [record] : [];
  });
  return { rows, skipped: records.length - 1 - rows.length };
}

function parseOfx(text: string): ParsedImport {
  const sections = text.split(/<STMTTRN>/i).slice(1);
  const rows = sections.flatMap((section, index) => {
    const read = (name: string) => section.match(new RegExp(`<${name}>([^<\r\n]+)`, 'i'))?.[1]?.trim() ?? '';
    const amount = amountFromStatement(read('TRNAMT'));
    const description = (read('MEMO') || read('NAME') || read('TRNTYPE') || 'Lançamento bancário')
      .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
    const record = amount === null ? null : makeRow(index, parseImportDate(read('DTPOSTED')), description, amount, '', read('FITID'));
    return record ? [record] : [];
  });
  return { rows, skipped: sections.length - rows.length };
}

export function parseQuickText(text: string, defaultDate = today()): ParsedImport {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const rows = lines.flatMap((line, index) => {
    const dateText = line.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0];
    const yesterday = new Date(`${defaultDate}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const relative = /\bontem\b/i.test(line) ? yesterday.toISOString().slice(0, 10) : defaultDate;
    const date = dateText ? parseImportDate(dateText) : relative;
    const withoutDate = dateText ? line.replace(dateText, '') : line.replace(/\b(hoje|ontem)\b/i, '');
    const match = withoutDate.match(/R\$\s*-?\s*\d[\d.,]*/i)
      ?? withoutDate.match(/(?:^|\s)([+-]?\d[\d.,]*)(?=\s|$)/);
    if (!match) return [];
    const amount = amountFromStatement((match[1] ?? match[0]).trim());
    if (amount === null) return [];
    const incoming = /\b(recebi|receita|entrada|salario|deposito|credito|estorno)\b/.test(normalizeText(withoutDate));
    const description = withoutDate.replace(match[0], ' ').trim().replace(/\bem$/i, '').trim().replace(/^[-:;\s]+|[-:;\s]+$/g, '');
    const record = makeRow(index, date, description, incoming || match[0].trim().startsWith('+') ? Math.abs(amount) : -Math.abs(amount), '');
    return record ? [record] : [];
  });
  return { rows, skipped: lines.length - rows.length };
}

export function receiptDraft(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const totalIndex = lines.findIndex(line => /^(valor (total|pago)|total a pagar|total geral|total)(\b|:)/.test(normalizeText(line)));
  if (totalIndex < 0) return '';
  const adjacent = lines.slice(totalIndex, totalIndex + 2).join(' ');
  const amount = [...adjacent.matchAll(/(?:R\$\s*)?\b[0-9][0-9.]*[.,][0-9]{2}\b/g)].at(-1)?.[0] ?? '';
  const value = amountFromStatement(amount);
  if (!value || value <= 0) return '';
  const description = lines.slice(0, totalIndex).find(line => /[\p{L}]{3,}/u.test(line) &&
    !/^(cnpj|cpf|numero|nfc-e|cupom|nota fiscal|identificacao|qr code)\b/.test(normalizeText(line))) ?? 'Comprovante';
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0] ?? '';
  return `${description.slice(0, 100)} R$ ${(value / 100).toFixed(2).replace('.', ',')} ${date}`.trim();
}

export function importFingerprint(row: Pick<ImportRow, 'date' | 'description' | 'amountCents'>, destination: string, kind: string) {
  return `${destination}|${kind}|${row.date}|${row.amountCents}|${normalizeText(row.description)}`;
}

export function downloadData(content: string | Blob, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportCsvCell(value: unknown) {
  const text = String(value ?? '');
  // Spreadsheet applications can evaluate imported text even when the field is quoted.
  const escaped = /^[\s]*[=+\-@]/.test(text) && typeof value === 'string' ? `'${text}` : text;
  return `"${escaped.replaceAll('"', '""')}"`;
}
