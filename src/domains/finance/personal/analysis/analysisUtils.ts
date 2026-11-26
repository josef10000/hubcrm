import { getMonthlySummary, type LedgerEntry } from '../ledger';

export const reportPanel = 'min-w-0 rounded-[20px] border border-text-muted/15 bg-surface-elevated shadow-sm';
export const reportControl = 'min-h-10 w-full rounded-xl border border-text-muted/25 bg-surface-bg px-3 py-2 text-sm !text-text-main focus-visible:outline-2 focus-visible:outline-primary-500';
export const reportHeading = 'text-base font-semibold tracking-tight text-text-main';

const formatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const shortDate = (value: string) => formatter.format(new Date(value + 'T00:00:00Z'));
export const monthName = (value: string) => monthFormatter.format(new Date(value + '-01T00:00:00Z'));
export const percent = (value: number) => decimal.format(value) + '%';

export function monthDayCount(month: string) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number, 0)).getUTCDate();
}

export function monthDay(month: string, day: number) {
  return month + '-' + String(day).padStart(2, '0');
}

export function priorDay(date: string) {
  const previous = new Date(date + 'T00:00:00Z');
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

export function numberForInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function csvMoney(cents: number) {
  return numberForInput(cents);
}

export function exportCsv(name: string, rows: (string | number)[][]) {
  const serialize = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^\s*[=+@-]|^[\t\r\n]/.test(text) && !/^-?[0-9]+,[0-9]{2}$/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = '\ufeff' + rows.map(row => row.map(serialize).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function annualSummary(year: string, entries: LedgerEntry[]) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = year + '-' + String(index + 1).padStart(2, '0');
    const summary = getMonthlySummary(month, entries);
    return { month, label: monthName(month).slice(0, 3), ...summary };
  });
}

export function simulateIndependence(startCents: number, monthlyContributionCents: number, annualRealReturnPercent: number, targetCents: number) {
  if (!targetCents) return null;
  if (startCents >= targetCents) return 0;
  const rate = (1 + annualRealReturnPercent / 100) ** (1 / 12) - 1;
  let current = startCents;
  for (let month = 1; month <= 1200; month += 1) {
    current = current * (1 + rate) + monthlyContributionCents;
    if (current >= targetCents) return month;
  }
  return null;
}
