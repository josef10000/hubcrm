import type { BankPresetId } from './ledger';

export const bankPresets: ReadonlyArray<{ id: BankPresetId; name: string; color: string; style: 'solid' | 'gradient' | 'metallic' | 'brushed' | 'glass' | 'holographic' }> = [
  { id: 'nubank', name: 'Nubank', color: '#820ad1', style: 'gradient' },
  { id: 'itau', name: 'Itaú', color: '#ec7000', style: 'gradient' },
  { id: 'bradesco', name: 'Bradesco', color: '#cc092f', style: 'metallic' },
  { id: 'santander', name: 'Santander', color: '#ec0000', style: 'gradient' },
  { id: 'bb', name: 'Banco do Brasil', color: '#0038a8', style: 'metallic' },
  { id: 'caixa', name: 'Caixa', color: '#005ca9', style: 'gradient' },
  { id: 'inter', name: 'Inter', color: '#ff7a00', style: 'gradient' },
  { id: 'c6', name: 'C6 Bank', color: '#334155', style: 'brushed' },
  { id: 'btg', name: 'BTG Pactual', color: '#0284c7', style: 'metallic' },
  { id: 'xp', name: 'XP Investimentos', color: '#ca8a04', style: 'solid' },
  { id: 'mercadopago', name: 'Mercado Pago', color: '#009ee3', style: 'gradient' },
  { id: 'picpay', name: 'PicPay', color: '#11c76f', style: 'gradient' },
  { id: 'sicredi', name: 'Sicredi', color: '#3fa110', style: 'gradient' },
  { id: 'custom', name: 'Outro banco', color: '#059669', style: 'glass' },
];

export function inferBankPreset(value: string): BankPresetId {
  const text = value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/nubank|roxinho|ultravioleta/.test(text)) return 'nubank';
  if (/itau|uniclass|personnalite/.test(text)) return 'itau';
  if (/bradesco|next|digio/.test(text)) return 'bradesco';
  if (/santander|way|esfera/.test(text)) return 'santander';
  if (/banco do brasil|ourocard|\bbb\b/.test(text)) return 'bb';
  if (/caixa|cef/.test(text)) return 'caixa';
  if (/inter/.test(text)) return 'inter';
  if (/c6|carbon/.test(text)) return 'c6';
  if (/btg|pactual/.test(text)) return 'btg';
  if (/\bxp\b|rico/.test(text)) return 'xp';
  if (/mercado\s*pago|meli/.test(text)) return 'mercadopago';
  if (/pic\s*pay/.test(text)) return 'picpay';
  if (/sicredi/.test(text)) return 'sicredi';
  return 'custom';
}

export function bankLogoPath(id: BankPresetId | undefined): string | undefined {
  return id && id !== 'custom' ? `/logos/banks/${id}.svg` : undefined;
}

export function cardBrandLogo(brand: string): { src: string; alt: string } | undefined {
  const normalized = brand.toLowerCase();
  const key = normalized === 'american express' ? 'amex' : normalized;
  return ['visa', 'mastercard', 'elo', 'amex'].includes(key)
    ? { src: `/logos/brands/${key}.svg`, alt: normalized === 'amex' ? 'American Express' : brand }
    : undefined;
}
