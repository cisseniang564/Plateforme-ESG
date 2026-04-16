import { describe, it, expect } from 'vitest';
import billingService from '@/services/billingService';

describe('billingService — pure helpers', () => {

  // ── formatDate ─────────────────────────────────────────────────────────────
  describe('formatDate', () => {
    it('formats a Unix timestamp to French date', () => {
      // 2024-03-15 00:00:00 UTC → "15 mars 2024"
      const ts = new Date('2024-03-15T00:00:00Z').getTime() / 1000;
      const result = billingService.formatDate(ts);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('returns a non-empty string', () => {
      const ts = new Date('2025-01-01T00:00:00Z').getTime() / 1000;
      expect(billingService.formatDate(ts)).toBeTruthy();
    });
  });

  // ── formatAmount ───────────────────────────────────────────────────────────
  describe('formatAmount', () => {
    it('formats EUR amount with currency symbol', () => {
      const result = billingService.formatAmount(99.0, 'EUR');
      expect(result).toContain('99');
      expect(result).toMatch(/€|EUR/);
    });

    it('formats USD amount', () => {
      const result = billingService.formatAmount(149.99, 'USD');
      expect(result).toContain('149');
    });

    it('handles zero amount', () => {
      const result = billingService.formatAmount(0, 'EUR');
      expect(result).toContain('0');
    });

    it('formats large amount with separators', () => {
      const result = billingService.formatAmount(1000, 'EUR');
      expect(result).toContain('1');
      expect(result).toContain('000');
    });
  });

  // ── planLabel ──────────────────────────────────────────────────────────────
  describe('planLabel', () => {
    it('returns "Gratuit" for free tier', () => {
      expect(billingService.planLabel('free')).toBe('Gratuit');
    });

    it('returns "Starter" for starter tier', () => {
      expect(billingService.planLabel('starter')).toBe('Starter');
    });

    it('returns "Pro" for pro tier', () => {
      expect(billingService.planLabel('pro')).toBe('Pro');
    });

    it('returns "Enterprise" for enterprise tier', () => {
      expect(billingService.planLabel('enterprise')).toBe('Enterprise');
    });

    it('returns the input for unknown tier', () => {
      expect(billingService.planLabel('unknown')).toBe('unknown');
    });
  });

  // ── statusInfo ─────────────────────────────────────────────────────────────
  describe('statusInfo', () => {
    it('returns green style for active status', () => {
      const info = billingService.statusInfo('active');
      expect(info.label).toBeTruthy();
      expect(info.color).toContain('green');
    });

    it('returns blue style for trialing status', () => {
      const info = billingService.statusInfo('trialing');
      expect(info.label).toBeTruthy();
      expect(info.color).toContain('blue');
    });

    it('returns red style for past_due status', () => {
      const info = billingService.statusInfo('past_due');
      expect(info.color).toContain('red');
    });

    it('returns red style for unpaid status', () => {
      const info = billingService.statusInfo('unpaid');
      expect(info.color).toContain('red');
    });

    it('returns gray style for canceled status', () => {
      const info = billingService.statusInfo('canceled');
      expect(info.color).toContain('gray');
    });

    it('handles null status gracefully', () => {
      const info = billingService.statusInfo(null);
      expect(info).toHaveProperty('label');
      expect(info).toHaveProperty('color');
    });

    it('always returns label and color properties', () => {
      const statuses = ['active', 'trialing', 'past_due', 'canceled', 'unpaid', null, 'unknown'];
      for (const s of statuses) {
        const info = billingService.statusInfo(s as string);
        expect(info).toHaveProperty('label');
        expect(info).toHaveProperty('color');
        expect(typeof info.label).toBe('string');
        expect(typeof info.color).toBe('string');
      }
    });
  });
});
