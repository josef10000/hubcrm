import { describe, expect, it, vi } from 'vitest';
import { categorize, exportCsvCell, parseImportDate, parseQuickText, parseStatement, receiptDraft } from './financeToolData';

vi.mock('@/lib/firebase', () => ({ db: null }));

describe('importar extratos pessoais', () => {
  it('preserva campos com separadores, quebras e aspas e recusa linhas inválidas', () => {
    const parsed = parseStatement('Data;Descrição;Valor;Tipo\r\n25/11/2026;"Mercado; LOJA ""A""";1.233,57;Débito\r\n31/02/2026;Dia inválido;500;Entrada\r\n26/11/2026;"Cliente\nImportado";50,10;Receita');
    expect(parsed.skipped).toBe(1);
    expect(parsed.rows).toMatchObject([
      { date: '2026-11-25', description: 'Mercado; LOJA "A"', amountCents: 123357, kind: 'expense' },
      { date: '2026-11-26', description: 'Cliente Importado', amountCents: 5010, kind: 'income' },
    ]);
  });

  it('mantém sinais, identificadores e texto nos extratos OFX antigos e de cartão', () => {
    const parsed = parseStatement('OFXHEADER:100\n<OFX>\n<STMTTRN>\n<DTPOSTED>20261125000000.000[-3:BRT]\n<TRNAMT>-19.99\n<FITID>001\n<MEMO>Mercearia &amp; Padaria\n</STMTTRN>', false);
    expect(parsed.rows[0]).toMatchObject({ date: '2026-11-25', amountCents: 1999, externalId: '001', description: 'Mercearia & Padaria', kind: 'expense' });
    const card = parseStatement('date,title,amount\n2026-11-25,Compra,198.50\n2026-11-26,Estorno,-12.50', true);
    expect(card.rows.map(item => item.kind)).toEqual(['expense', 'income']);
  });

  it('evita reclassificar ajustes, transferências ou pagamentos de fatura na importação CSV', () => {
    const parsed = parseStatement('Data;Descrição;Tipo;Valor (R$)\n26/11/2026;Ajuste;Conciliação;10,05\n26/11/2026;Pix entre contas;Transferência;25,00\n26/11/2026;Fatura;Pagamento de fatura;80,00');
    expect(parsed.rows).toEqual([]);
    expect(parsed.skipped).toBe(3);
  });

  it('exige data válida e neutraliza fórmulas no CSV', () => {
    expect(parseImportDate('29/02/2024')).toBe('2024-02-29');
    expect(parseImportDate('29/02/2026')).toBe('');
    expect(exportCsvCell(' =2+2')).toBe('"\' =2+2"');
    expect(exportCsvCell('loja "A"')).toBe('"loja ""A"""');
  });
});

describe('lançamento por texto', () => {
  it('interpreta hoje, ontem, datas explícitas, valores brasileiros e recebimentos', () => {
    const parsed = parseQuickText('Ontem mercado R$ 84,90\nRecebi R$ 1.450,40 do cliente em 20/11/2026\nSem valor', '2026-11-26');
    expect(parsed.rows).toMatchObject([
      { date: '2026-11-25', description: 'mercado', amountCents: 8490, kind: 'expense' },
      { date: '2026-11-20', description: 'Recebi do cliente', amountCents: 145040, kind: 'income' },
    ]);
    expect(parsed.skipped).toBe(1);
  });

  it('sugere apenas o total do comprovante e permite revisar a categoria', () => {
    const draft = receiptDraft('Nota fiscal\nMercado das Flores\n25/11/2026\nTOTAL A PAGAR\nR$ 54,90\nTroco 0,00');
    const item = parseQuickText(draft).rows[0];
    expect(item).toMatchObject({ amountCents: 5490, date: '2026-11-25', description: 'Mercado das Flores' });
    expect(categorize(item.description, 'expense', [])).toBe('Alimentação');
    const rule = { id: 'r1', kind: 'rule', pattern: 'mercado das flores', category: 'Jardinagem', createdAt: 1, matchMode: 'exact', activityType: 'expense' } as const;
    expect(categorize(item.description, 'expense', [rule])).toBe('Jardinagem');
    expect(categorize(item.description, 'income', [rule])).toBe('');
  });
});
