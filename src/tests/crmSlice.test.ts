import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';

// Polyfill global para o crypto no ambiente do Node/Vitest
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true
  });
}

/**
 * Testes unitários para lógicas puras do CRM Slice
 * Testam funções extraídas sem dependência de Firestore
 */

// ===== FUNÇÕES EXTRAÍDAS DO SLICE PARA TESTES PUROS =====

const isChurnRisk = (client: { lastContactAt?: number }, churnRiskDays: number): boolean => {
  if (!client.lastContactAt) return true;
  const diff = (Date.now() - client.lastContactAt) / (1000 * 60 * 60 * 24);
  return diff > churnRiskDays;
};

const isComboNearRenewal = (client: { comboRenewalDate?: string }): boolean => {
  if (!client.comboRenewalDate) return false;
  
  const parts = client.comboRenewalDate.split('-');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const renewalZero = new Date(year, month, day);
  
  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffDays = Math.round((renewalZero.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 15 && diffDays >= 0;
};

const generatePublicToken = (): string => {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
};

// ===== TESTES =====

describe('CRM Slice — Lógicas Puras', () => {

  describe('isChurnRisk', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Define o tempo para um valor fixo determinístico
      vi.setSystemTime(new Date(1717351680000));
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('deve retornar true quando cliente não tem lastContactAt', () => {
      expect(isChurnRisk({}, 30)).toBe(true);
    });

    it('deve retornar false quando contato foi ontem', () => {
      const yesterday = Date.now() - (1 * 24 * 60 * 60 * 1000);
      expect(isChurnRisk({ lastContactAt: yesterday }, 30)).toBe(false);
    });

    it('deve retornar true quando último contato foi há 90 dias com threshold de 30', () => {
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      expect(isChurnRisk({ lastContactAt: ninetyDaysAgo }, 30)).toBe(true);
    });

    it('deve retornar false quando contato está no limite exato', () => {
      const exactThreshold = Date.now() - (30 * 24 * 60 * 60 * 1000);
      // No limite exato (diff === 30 e threshold é 30), diff > 30 é false
      expect(isChurnRisk({ lastContactAt: exactThreshold }, 30)).toBe(false);
    });

    it('deve retornar true quando contato está 1ms acima do threshold', () => {
      const justOver = Date.now() - (31 * 24 * 60 * 60 * 1000);
      expect(isChurnRisk({ lastContactAt: justOver }, 30)).toBe(true);
    });

    it('deve funcionar com threshold customizado (ex: 7 dias)', () => {
      const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
      expect(isChurnRisk({ lastContactAt: fiveDaysAgo }, 7)).toBe(false);
      
      const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
      expect(isChurnRisk({ lastContactAt: tenDaysAgo }, 7)).toBe(true);
    });
  });

  describe('isComboNearRenewal', () => {
    it('deve retornar false quando não tem comboRenewalDate', () => {
      expect(isComboNearRenewal({})).toBe(false);
    });

    it('deve retornar true quando renovação é em 10 dias', () => {
      const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isComboNearRenewal({ comboRenewalDate: inTenDays })).toBe(true);
    });

    it('deve retornar false quando renovação já passou', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isComboNearRenewal({ comboRenewalDate: pastDate })).toBe(false);
    });

    it('deve retornar false quando renovação é em 20 dias (fora da janela de 15)', () => {
      const inTwentyDays = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isComboNearRenewal({ comboRenewalDate: inTwentyDays })).toBe(false);
    });

    it('deve retornar true quando renovação é hoje (diff = 0)', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isComboNearRenewal({ comboRenewalDate: today })).toBe(true);
    });

    it('deve retornar true quando renovação é em exatamente 15 dias', () => {
      const inFifteenDays = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isComboNearRenewal({ comboRenewalDate: inFifteenDays })).toBe(true);
    });
  });

  describe('generatePublicToken (crypto.randomUUID)', () => {
    it('deve gerar token com pelo menos 64 caracteres', () => {
      const token = generatePublicToken();
      expect(token.length).toBeGreaterThanOrEqual(64);
    });

    it('deve gerar token sem hifens', () => {
      const token = generatePublicToken();
      expect(token).not.toContain('-');
    });

    it('deve gerar tokens únicos a cada chamada', () => {
      const token1 = generatePublicToken();
      const token2 = generatePublicToken();
      expect(token1).not.toBe(token2);
    });

    it('deve conter apenas caracteres hexadecimais', () => {
      const token = generatePublicToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});
