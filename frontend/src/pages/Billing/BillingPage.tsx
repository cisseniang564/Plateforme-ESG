import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import {
  CreditCard, Zap, Shield, BarChart3, Users, Building2,
  CheckCircle, ArrowUpRight, Download, AlertCircle, RefreshCw,
  Sparkles, TrendingUp, Activity, Calendar, ExternalLink,
  AlertTriangle, Clock, ArrowRight, Repeat,
} from 'lucide-react';
import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  plan_tier: string;
  status: string;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  max_users: number;
  max_organizations: number;
  max_api_calls: number;
}

interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  pdf_url?: string;
  hosted_url?: string;
}

interface UsageSummary {
  today: { date: string; calls: number };
  current_month: { month: string; calls: number; limit: number | null };
  usage_pct: number | null;
}

// ─── Plan config ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Pour découvrir ESGFlow',
    highlight: false,
    features: [
      '3 utilisateurs',
      '5 organisations',
      '1 000 appels API/mois',
      'Rapports basiques',
      'Matrice de matérialité',
      'Support email',
    ],
    notIncluded: ['Rapports CSRD', 'Analyses IA', 'Connecteurs avancés'],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    priceYearly: 23,   // ~20% off
    description: 'Pour les PME ESG-actives',
    highlight: false,
    features: [
      '10 utilisateurs',
      '25 organisations',
      '10 000 appels API/mois',
      'Rapports CSRD & DPEF',
      'Bilan Carbone & SBTi',
      'Supply Chain ESG',
      'Import FEC',
      'Support prioritaire',
    ],
    notIncluded: ['Rapports SFDR', 'IA narrative', 'Connecteurs avancés'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 79,   // ~20% off
    description: 'Pour les entreprises en croissance',
    highlight: true,
    badge: 'Populaire',
    features: [
      '50 utilisateurs',
      '100 organisations',
      '100 000 appels API/mois',
      'Tous les rapports ESG',
      'IA prédictive & narrative',
      'Connecteurs avancés',
      'Benchmarking sectoriel',
      'Multi-standards (GRI, SASB…)',
      'Support dédié',
    ],
    notIncluded: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    priceYearly: null,
    description: 'Pour les grandes organisations',
    highlight: false,
    features: [
      'Utilisateurs illimités',
      'Organisations illimitées',
      'API illimitée',
      'SLA garanti 99.9%',
      'SSO / SAML',
      'Déploiement on-premise',
      'Support 24/7 dédié',
    ],
    notIncluded: [],
  },
];

const PLAN_LABELS: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-purple-100 text-purple-700',
};
const TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ts?: string | number | null): string {
  if (!ts) return '—';
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(amount);
}
function daysUntil(ts?: string | null): number | null {
  if (!ts) return null;
  const diff = new Date(ts).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function UsageBar({ label, used, max, color }: { label: string; used: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const warn = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <span className={`text-sm font-semibold ${warn ? 'text-orange-600' : 'text-gray-800'}`}>
          {used.toLocaleString()} / {max > 0 ? max.toLocaleString() : '∞'}
          {max > 0 && <span className="text-xs text-gray-400 ml-1">({pct}%)</span>}
        </span>
      </div>
      {max > 0 && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${warn ? 'bg-orange-400' : color}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [sub, setSub]               = useState<Subscription | null>(null);
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [usage, setUsage]           = useState<UsageSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAction]  = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [billingCycle, setCycle]    = useState<'monthly' | 'yearly'>('monthly');
  const [isWelcome, setIsWelcome]   = useState(false);
  const navigate                    = useNavigate();
  const userId                      = useSelector((s: RootState) => s.auth.user?.id);
  const didInit = useRef(false);

  // Mark billing as visited — stops future redirects from useOnboarding / useAuth
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`billing_welcomed_${userId}`, '1');
    }
  }, [userId]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const p = new URLSearchParams(window.location.search);
    if (p.get('welcome') === '1') {
      setIsWelcome(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (p.get('checkout') === 'success') {
      setSuccess('Abonnement activé ! Bienvenue sur ESG Flow.');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSuccess(null), 10_000);
    }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [subRes, invRes, usageRes] = await Promise.allSettled([
        api.get('/billing/subscription'),
        api.get('/billing/invoices'),
        api.get('/api/usage/summary'),
      ]);
      if (subRes.status === 'fulfilled') setSub(subRes.value.data);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data?.invoices || invRes.value.data || []);
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data);
    } catch { setError('Impossible de charger les données de facturation.'); }
    finally { setLoading(false); }
  };

  // ── New subscription (Checkout) ──
  const handleCheckout = async (planId: string) => {
    // Free plan has no Stripe price — just go back to the app
    if (planId === 'free') { navigate('/app'); return; }
    setAction(`checkout-${planId}`); setError(null);
    try {
      const res = await api.post('/billing/checkout', {
        plan: planId,
        billing_cycle: billingCycle,
        success_url: `${window.location.origin}/app/billing?checkout=success`,
        cancel_url:  `${window.location.origin}/app/billing`,
      });
      const url = res.data.checkout_url || res.data.url;
      if (!url) throw new Error('URL de paiement manquante');
      window.location.href = url;
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur lors du paiement.');
    } finally { setAction(null); }
  };

  // ── Change plan (existing subscriber) ──
  const handleChangePlan = async (planId: string, proration: 'create_prorations' | 'none') => {
    const isUpgrade = TIER_ORDER[planId] > TIER_ORDER[sub?.plan_tier || 'free'];
    const label = isUpgrade ? 'upgrade' : 'downgrade';
    if (!confirm(
      isUpgrade
        ? `Passer au plan ${PLAN_LABELS[planId]} maintenant ? La différence de prix sera débitée immédiatement au prorata.`
        : `Passer au plan ${PLAN_LABELS[planId]} ? Le changement prendra effet à la fin de votre période en cours.`
    )) return;

    setAction(`change-${planId}`); setError(null);
    try {
      await api.post('/billing/change-plan', {
        plan: planId,
        billing_cycle: billingCycle,
        proration_behavior: proration,
      });
      setSuccess(`Plan mis à jour vers ${PLAN_LABELS[planId]} (${label}).`);
      setTimeout(() => setSuccess(null), 8_000);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur lors du changement de plan.');
    } finally { setAction(null); }
  };

  // ── Portal ──
  const handlePortal = async () => {
    setAction('portal'); setError(null);
    try {
      const res = await api.post('/billing/portal', { return_url: window.location.href });
      const url = res.data.portal_url || res.data.url;
      if (!url) throw new Error('URL portail manquante');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur portail de facturation.');
    } finally { setAction(null); }
  };

  // ── Cancel ──
  const handleCancel = async () => {
    if (!confirm("Annuler votre abonnement ? Vous conserverez l'accès jusqu'à la fin de la période.")) return;
    setAction('cancel'); setError(null);
    try {
      await api.post('/billing/cancel');
      setSuccess("Abonnement annulé — accès maintenu jusqu'à la fin de la période.");
      setTimeout(() => setSuccess(null), 8_000);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erreur lors de l\'annulation.');
    } finally { setAction(null); }
  };

  // ── Reactivate ──
  const handleReactivate = async () => {
    setAction('reactivate'); setError(null);
    try {
      await api.post('/billing/reactivate');
      setSuccess('Abonnement réactivé !');
      setTimeout(() => setSuccess(null), 6_000);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erreur lors de la réactivation.');
    } finally { setAction(null); }
  };

  // ── Retry payment ──
  const handleRetryPayment = async () => {
    setAction('retry'); setError(null);
    try {
      const res = await api.post('/billing/retry-payment');
      if (res.data.status === 'paid') {
        setSuccess('Paiement réussi ! Votre abonnement est de nouveau actif.');
        setTimeout(() => setSuccess(null), 8_000);
        await loadAll();
      } else {
        setError(`Paiement non abouti (statut : ${res.data.status}). Vérifiez votre moyen de paiement.`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Échec du paiement.');
    } finally { setAction(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  const tier = sub?.plan_tier || 'free';
  const isPaid = !!sub?.stripe_subscription_id;
  const isPastDue = sub?.status === 'past_due';
  const trialDays = sub?.is_trial ? daysUntil(sub.trial_ends_at) : null;
  const yearlyDiscount = 20; // %

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Hero ── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <CreditCard className="h-3.5 w-3.5" /> Facturation
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Abonnement & Facturation</h1>
            <p className="mt-2 text-sm text-white/80">Gérez votre plan, vos usages et vos factures Stripe.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Plan actuel', value: PLAN_LABELS[tier] || tier },
              { label: 'Statut', value: sub?.is_trial ? 'Essai' : sub?.is_active ? 'Actif' : (sub?.status || '—') },
              { label: 'Renouvellement', value: sub?.current_period_end ? fmtDate(sub.current_period_end) : '—' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">{s.label}</p>
                <p className="mt-1 text-sm font-semibold truncate">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {isWelcome && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div>
            <p className="font-bold text-emerald-900 text-lg">🎉 Votre essai gratuit de 14 jours a commencé !</p>
            <p className="text-sm text-emerald-700 mt-1">Aucune carte bancaire requise. Choisissez votre plan ci-dessous ou explorez la plateforme gratuitement.</p>
          </div>
          <button
            onClick={() => { setIsWelcome(false); navigate('/app'); }}
            className="flex-shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Continuer avec l'essai gratuit →
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {isPastDue && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 bg-red-50 border border-red-300 rounded-2xl">
          <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">Paiement en échec</p>
            <p className="text-sm text-red-700 mt-0.5">Votre dernier paiement n'a pas abouti. Mettez à jour votre moyen de paiement pour conserver l'accès.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRetryPayment} disabled={actionLoading === 'retry'}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60">
              {actionLoading === 'retry' ? <Spinner size="sm" /> : <Repeat className="h-4 w-4" />}
              Relancer le paiement
            </button>
            <button onClick={handlePortal} disabled={actionLoading === 'portal'}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition">
              <ExternalLink className="h-3.5 w-3.5" /> Mettre à jour la carte
            </button>
          </div>
        </div>
      )}
      {sub?.is_trial && trialDays !== null && (
        <div className="p-5 bg-purple-50 border border-purple-200 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <p className="font-semibold text-purple-900">Période d'essai</p>
            </div>
            <span className="text-sm font-bold text-purple-700">{trialDays} jour{trialDays !== 1 ? 's' : ''} restant{trialDays !== 1 ? 's' : ''}</span>
          </div>
          <div className="w-full h-2 bg-purple-100 rounded-full">
            <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${Math.max(5, 100 - (trialDays / 14) * 100)}%` }} />
          </div>
          <p className="text-xs text-purple-600 mt-2">Fin d'essai le {fmtDate(sub.trial_ends_at)} — souscrivez avant pour ne pas perdre vos données.</p>
        </div>
      )}
      {sub?.cancel_at_period_end && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Résiliation programmée</p>
            <p className="text-sm text-amber-700">Accès maintenu jusqu'au {fmtDate(sub.current_period_end)}.</p>
          </div>
          <button onClick={handleReactivate} disabled={actionLoading === 'reactivate'}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition disabled:opacity-60">
            {actionLoading === 'reactivate' ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Réactiver
          </button>
        </div>
      )}

      {/* ── Current plan ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${PLAN_COLORS[tier]}`}>
                {PLAN_LABELS[tier] || tier}
              </span>
              {sub?.is_trial && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Essai gratuit</span>}
              {isPastDue && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Paiement en attente</span>}
              {!isPastDue && sub?.is_active && !sub.is_trial && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Actif</span>}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{PLANS.find(p => p.id === tier)?.name || tier}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{PLANS.find(p => p.id === tier)?.description}</p>
            {sub?.current_period_end && !sub.is_trial && (
              <p className="text-sm text-gray-500 mt-2">
                {sub.cancel_at_period_end
                  ? `Accès jusqu'au ${fmtDate(sub.current_period_end)}`
                  : `Prochain renouvellement : ${fmtDate(sub.current_period_end)}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isPaid && !isPastDue && (
              <button onClick={handlePortal} disabled={actionLoading === 'portal'}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition disabled:opacity-60">
                {actionLoading === 'portal' ? <Spinner size="sm" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Portail Stripe
              </button>
            )}
            {isPaid && !sub?.cancel_at_period_end && tier !== 'free' && (
              <button onClick={handleCancel} disabled={!!actionLoading}
                className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition disabled:opacity-60">
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Usage ── */}
      {sub && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" /> Usage du mois en cours
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <UsageBar label="Appels API" used={usage?.current_month.calls || 0} max={sub.max_api_calls || 0} color="bg-violet-500" />
              <UsageBar label="Utilisateurs" used={0} max={sub.max_users || 0} color="bg-blue-500" />
              <UsageBar label="Organisations" used={0} max={sub.max_organizations || 0} color="bg-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Appels auj.", value: (usage?.today.calls || 0).toLocaleString(), icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Ce mois', value: (usage?.current_month.calls || 0).toLocaleString(), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Limite', value: sub.max_api_calls ? sub.max_api_calls.toLocaleString() : '∞', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Utilisation', value: usage?.usage_pct != null ? `${usage.usage_pct}%` : '—', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3`}>
                  <Icon className={`h-4 w-4 ${color} mb-1.5 opacity-70`} />
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Plan comparison ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {isPaid ? 'Changer de plan' : 'Choisir un plan'}
          </h3>
          {/* Monthly / yearly toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl text-sm">
            <button type="button" onClick={() => setCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className="pointer-events-none">Mensuel</span>
            </button>
            <button type="button" onClick={() => setCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className="pointer-events-none">Annuel</span>
              <span className="pointer-events-none text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">-{yearlyDiscount}%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === tier;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const isUpgrade = TIER_ORDER[plan.id] > TIER_ORDER[tier];
            const isDowngrade = TIER_ORDER[plan.id] < TIER_ORDER[tier] && plan.id !== 'free';

            return (
              <div key={plan.id}
                className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${
                  plan.highlight && !isCurrent
                    ? 'border-violet-400 bg-violet-50/40 shadow-md'
                    : isCurrent
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}>
                {(plan.badge || isCurrent) && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide whitespace-nowrap ${
                    isCurrent ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'
                  }`}>
                    {isCurrent ? 'Plan actuel' : plan.badge}
                  </span>
                )}

                <div className="mb-3">
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-0.5 mb-1">
                  {price === null ? (
                    <span className="text-xl font-bold text-gray-900">Sur devis</span>
                  ) : price === 0 ? (
                    <span className="text-2xl font-bold text-gray-900">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">{price}€</span>
                      <span className="text-xs text-gray-400">/mois</span>
                    </>
                  )}
                </div>
                {billingCycle === 'yearly' && price !== null && price > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mb-3">facturé {price * 12}€/an</p>
                )}
                {(price === null || price === 0 || billingCycle === 'monthly') && <div className="mb-3" />}

                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                  {plan.notIncluded?.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400">
                      <span className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 text-center leading-3.5">—</span> {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={() => {
                      if (plan.id === 'enterprise') { window.open('mailto:sales@esgflow.io', '_self'); return; }
                      if (plan.id === 'free') { navigate('/app'); return; }
                      if (isPaid) {
                        // Existing subscriber → change plan with proration
                        handleChangePlan(plan.id, isUpgrade ? 'create_prorations' : 'none');
                      } else {
                        // New subscriber → Stripe Checkout
                        handleCheckout(plan.id);
                      }
                    }}
                    disabled={!!actionLoading}
                    className={`w-full py-2.5 text-xs font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-1 ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : plan.id === 'free'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {(actionLoading === `checkout-${plan.id}` || actionLoading === `change-${plan.id}`) && <Spinner size="sm" />}
                    {plan.id === 'enterprise'
                      ? 'Contacter'
                      : plan.id === 'free'
                      ? 'Continuer gratuitement'
                      : isUpgrade
                      ? 'Passer à ce plan'
                      : isDowngrade
                      ? 'Réduire le plan'
                      : 'Choisir'}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Invoices ── */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Historique des factures</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Facture</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{inv.number || inv.id.slice(0, 12)}</td>
                  <td className="px-4 py-3.5 text-gray-500">{fmtDate(inv.created)}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-800">
                    {fmtAmount(inv.amount_paid, inv.currency)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                      : inv.status === 'open' ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {inv.status === 'paid' ? 'Payée' : inv.status === 'open' ? 'En attente' : inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {(inv.pdf_url || inv.hosted_url) && (
                      <a href={inv.pdf_url || inv.hosted_url || '#'} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && invoices.length === 0 && (
        <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200">
          <CreditCard className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Aucune facture pour le moment</p>
          <p className="text-gray-400 text-xs mt-1">Les factures apparaîtront ici après votre premier paiement.</p>
        </div>
      )}

    </div>
  );
}
