/**
 * Newsletter signup — formulaire inline pour le footer.
 *
 * POST /api/v1/leads/newsletter avec { email, source }.
 * Single opt-in (validation par clic), pas de double opt-in pour réduire le drop.
 * RFC 8058 List-Unsubscribe est ajouté à chaque email envoyé.
 */
import { useState } from 'react';
import { Mail, Check, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function NewsletterFooter({ source = 'footer' }: { source?: string }) {
  const { t } = useTranslation();
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/v1/leads/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Erreur ${res.status}`);
      }
      setStatus('ok');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setErrMsg(err.message || t('nl.errNetwork', 'Erreur réseau'));
    }
  };

  if (status === 'ok') {
    return (
      <div
        role="status"
        className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300 flex items-start gap-2"
      >
        <Check className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>{t('nl.confirmed', "Inscription confirmée — premier email d'ici quelques minutes.")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <label htmlFor="footer-newsletter-email" className="sr-only">{t('nl.emailLabel', 'Email pour newsletter')}</label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
        <input
          id="footer-newsletter-email"
          type="email"
          required
          aria-required="true"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        aria-disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {t('nl.subscribing', 'Inscription…')}
          </>
        ) : (
          t('nl.subscribe', "S'abonner gratuitement")
        )}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-xs text-red-400 flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
          {errMsg}
        </p>
      )}
      <p className="text-[10px] text-gray-500 leading-relaxed">
        {t('nl.privacy', '1 email par mois max. Désabonnement en un clic. Aucun partage de données.')}
      </p>
    </form>
  );
}
