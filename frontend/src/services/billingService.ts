/**
 * Billing Service — Stripe checkout, portal, subscription, invoices.
 */
import api from './api';

export interface Subscription {
  plan_tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  max_users: number;
  max_orgs: number;
  max_monthly_api_calls: number;
}

export interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number; // Unix timestamp
  pdf_url: string | null;
  hosted_url: string | null;
}

const billingService = {
  /** Get current subscription info */
  async getSubscription(): Promise<Subscription> {
    const response = await api.get('/billing/subscription');
    return response.data;
  },

  /** Create Stripe Checkout session → returns redirect URL */
  async createCheckout(priceId: string): Promise<string> {
    const response = await api.post('/billing/checkout', {
      price_id: priceId,
      success_url: `${window.location.origin}/app/settings?tab=billing&checkout=success`,
      cancel_url: `${window.location.origin}/app/settings?tab=billing`,
    });
    return response.data.checkout_url;
  },

  /** Create Stripe Customer Portal session → returns redirect URL */
  async createPortal(): Promise<string> {
    const response = await api.post('/billing/portal', {
      return_url: `${window.location.origin}/app/settings?tab=billing`,
    });
    return response.data.portal_url;
  },

  /** Cancel subscription at end of period */
  async cancelSubscription(): Promise<{ message: string }> {
    const response = await api.post('/billing/cancel');
    return response.data;
  },

  /** Reactivate a subscription that was set to cancel */
  async reactivateSubscription(): Promise<{ message: string }> {
    const response = await api.post('/billing/reactivate');
    return response.data;
  },

  /** List recent invoices */
  async listInvoices(): Promise<Invoice[]> {
    const response = await api.get('/billing/invoices');
    return response.data;
  },

  /** Format unix timestamp to French date */
  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  },

  /** Format amount with currency */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  },

  /** Plan display names */
  planLabel(tier: string): string {
    const labels: Record<string, string> = {
      free: 'Gratuit',
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return labels[tier] || tier;
  },

  /** Status display info */
  statusInfo(status: string | null): { label: string; color: string } {
    const map: Record<string, { label: string; color: string }> = {
      active: { label: 'Actif', color: 'text-green-700 bg-green-100' },
      trialing: { label: 'Essai gratuit', color: 'text-blue-700 bg-blue-100' },
      past_due: { label: 'Paiement en attente', color: 'text-red-700 bg-red-100' },
      canceled: { label: 'Annulé', color: 'text-gray-700 bg-gray-100' },
      unpaid: { label: 'Impayé', color: 'text-red-700 bg-red-100' },
    };
    return map[status || ''] || { label: 'Inconnu', color: 'text-gray-700 bg-gray-100' };
  },
};

export default billingService;
