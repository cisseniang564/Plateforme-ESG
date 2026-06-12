/**
 * TrialBanner — persistent top banner managing the trial lifecycle:
 *
 *  • During trial (≤7 days left): amber countdown "se termine dans X jours"
 *  • During trial (>7 days):      subtle blue reminder
 *  • Trial expired, not on Free:  red/amber "est terminée" with upgrade CTA
 *  • On Free plan or paid plan:   hidden
 *  • On /app/billing:             always hidden (page has its own section)
 *
 * Dismissible per session for the countdown variants only.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Zap, Clock, AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

const DISMISSED_KEY = 'trial_banner_dismissed_v2';

// Shape of the /billing/subscription API response
interface BillingStatus {
  plan_tier: string;
  status: string;           // "trialing" | "active" | "past_due" | "canceled" | "incomplete"
  trial_ends_at?: string | null;
  // Legacy fields — may or may not be present; derived below if missing
  is_active?: boolean;
  is_trial?: boolean;
}

function daysLeft(trial_ends_at?: string | null): number | null {
  if (!trial_ends_at) return null;
  const diff = new Date(trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function TrialBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const [sub, setSub] = useState<BillingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Never render on the billing page (has its own detailed trial section)
  const isBillingPage = location.pathname === '/app/billing';

  useEffect(() => {
    if (isBillingPage) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
    }
    api.get<BillingStatus>('/billing/subscription')
      .then(({ data }) => setSub(data))
      .catch(() => {});
  }, [isBillingPage]);

  if (isBillingPage || !sub) return null;

  const { plan_tier, status, trial_ends_at } = sub;

  // Derive booleans from `status` (API source of truth) with fallback to legacy fields
  const is_trial  = sub.is_trial  ?? status === 'trialing';
  const is_active = sub.is_active ?? (status === 'active' || status === 'trialing');

  const days = daysLeft(trial_ends_at);

  // ── Case 1: Active paid subscription → nothing to show ───────────────────
  if (is_active && !is_trial) return null;

  // ── Case 2: On Free plan (user chose free voluntarily) → nothing to show ─
  if (plan_tier === 'free') return null;

  // ── Case 3: Trial expired, not yet downgraded to Free ─────────────────────
  // Only show if trial has genuinely ended: status not "trialing" AND trial_ends_at is in the past
  const trialDatePast = trial_ends_at ? new Date(trial_ends_at).getTime() < Date.now() : true;
  const isExpired = !is_active && !is_trial && trialDatePast;
  if (isExpired) {
    return (
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-900 text-sm">
        <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        </div>
        <p className="flex-1 leading-snug">
          <span className="font-semibold">{t('trial.expiredTitle', "Votre période d'essai est terminée.")}</span>
          {' '}{t('trial.expiredDesc', 'Continuez à naviguer gratuitement ou choisissez un plan pour débloquer toutes les fonctionnalités.')}
        </p>
        <Link
          to="/app/billing"
          className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          {t('trial.choosePlan', 'Choisir un plan')}
        </Link>
      </div>
    );
  }

  // ── Case 4: In trial ───────────────────────────────────────────────────────
  if (!is_trial || days === null || days === 0 || dismissed) return null;

  const isUrgent = days <= 7;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  if (isUrgent) {
    // Amber warning: ≤7 days
    return (
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <p className="flex-1 leading-snug">
          <span className="font-semibold">
            {t('trial.endsIn', "Votre période d'essai se termine dans {{n}} jour{{s}}.", { n: days, s: days > 1 ? 's' : '' })}
          </span>
          {' '}{t('trial.subscribeBefore', 'Souscrivez avant la fin pour conserver vos données et accès.')}
        </p>
        <Link
          to="/app/billing"
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          {t('trial.viewPlans', 'Voir les plans')}
        </Link>
        <button
          onClick={handleDismiss}
          aria-label={t('trial.hide', 'Masquer')}
          className="flex-shrink-0 p-1 rounded hover:bg-amber-100 transition-colors"
        >
          <X className="w-4 h-4 text-amber-500" />
        </button>
      </div>
    );
  }

  // Blue info: >7 days — subtle, dismissible
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-800 text-sm">
      <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
      <p className="flex-1 leading-snug text-xs">
        {t('trial.freeTrialA', "Vous êtes en période d'essai gratuite — encore")}{' '}
        <span className="font-semibold">{t('trial.daysLeft', '{{n}} jours', { n: days })}</span> {t('trial.remaining', 'restants.')}{' '}
        <Link to="/app/billing" className="underline hover:text-blue-900">{t('trial.viewPlans', 'Voir les plans')}</Link>
      </p>
      <button
        onClick={handleDismiss}
        aria-label={t('trial.hide', 'Masquer')}
        className="flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors"
      >
        <X className="w-3.5 h-3.5 text-blue-400" />
      </button>
    </div>
  );
}
