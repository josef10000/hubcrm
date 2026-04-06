import { describe, it, expect } from 'vitest';
import { getPlanPrice, getSetupPrice, calculateDiscount } from './helpers';
import { Client } from './types';

describe('Helpers (Billing Logic)', () => {
  describe('getSetupPrice', () => {
    it('should return client.setupPrice if defined', () => {
      const client = { setupPrice: 5000 } as Partial<Client>;
      expect(getSetupPrice('Profissional', client)).toBe(5000);
    });

    it('should return 7500 for Profissional plan if no custom price', () => {
      expect(getSetupPrice('Profissional')).toBe(7500);
    });

    it('should return 2500 for Ecossistema Essencial plan', () => {
      expect(getSetupPrice('Ecossistema Essencial')).toBe(2500);
    });
  });

  describe('getPlanPrice', () => {
    it('should calculate monthly price for Profissional plan', () => {
      expect(getPlanPrice('Profissional', 'MONTHLY')).toBe(897);
    });

    it('should calculate yearly price with 9-month discount + setup', () => {
      // Profissional setup = 7500, Monthly = 897
      // 7500 + (897 * 9) = 7500 + 8073 = 15573
      expect(getPlanPrice('Profissional', 'YEARLY')).toBe(15573);
    });

    it('should use customMonthlyPrice if provided', () => {
      const client = { customMonthlyPrice: 500 } as Partial<Client>;
      expect(getPlanPrice('Ecossistema Essencial', 'MONTHLY', client)).toBe(500);
    });

    it('should handle numeric client parameter as a direct monthly price', () => {
      expect(getPlanPrice('Any', 'MONTHLY', 1000)).toBe(1000);
    });
  });

  describe('calculateDiscount', () => {
    const mockClients: Client[] = [
      { id: 'ref1', referredBy: 'referrer-id', status: 'Ativo', referralConfirmed: true } as Client,
      { id: 'ref2', referredBy: 'referrer-id', status: 'Ativo', referralConfirmed: true } as Client,
      { id: 'ref3', referredBy: 'other-referrer', status: 'Ativo', referralConfirmed: true } as Client,
    ];

    it('should calculate R$ 100 per active referral', () => {
      const referrer = { id: 'referrer-id', plan: 'Profissional', billingCycle: 'MONTHLY' } as Client;
      // 2 referrals = 200 discount
      expect(calculateDiscount(referrer, mockClients)).toBe(200);
    });

    it('should limit discount to 50% of the plan price', () => {
      // Plan price for Ecossistema Essencial = 397. 50% = 198.5
      const referrer = { id: 'referrer-id', plan: 'Ecossistema Essencial', billingCycle: 'MONTHLY' } as Client;
      // 2 referrals (200) should be capped at 198.5
      expect(calculateDiscount(referrer, mockClients)).toBe(198.5);
    });

    it('should return 0 if referralRewardType is commission', () => {
      const referrer = { id: 'referrer-id', plan: 'Profissional', referralRewardType: 'commission' } as Client;
      expect(calculateDiscount(referrer, mockClients)).toBe(0);
    });
  });
});
