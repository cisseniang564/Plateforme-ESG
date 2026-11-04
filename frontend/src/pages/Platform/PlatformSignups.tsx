import { useEffect, useState } from 'react';
import { Users, UserPlus, LogIn, MailX, Loader2, ShieldAlert } from 'lucide-react';
import api from '@/services/api';

interface Item {
  user_id: string; email: string; full_name: string; company: string; plan_tier: string;
  created_at: string | null; last_login_at: string | null; email_verified: boolean;
  trial_ends_at: string | null; entries_count: number;
}
interface Summary { total_users: number; total_tenants: number; new_7d: number; new_30d: number; active_7d: number; never_logged_in: number }

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-medium text-gray-600"><Icon className="h-4 w-4" aria-hidden="true" />{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export default function PlatformSignups() {
  const [data, setData] = useState<{ summary: Summary; items: Item[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');

  useEffect(() => {
    api.get('/admin/platform/signups')
      .then(r => { setData(r.data); setState('ok'); })
      .catch(e => setState(e?.response?.status === 403 ? 'forbidden' : 'error'));
  }, []);

  if (state === 'loading') return <div className="flex items-center gap-2 p-6 text-gray-600" role="status"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Chargement…</div>;
  if (state === 'forbidden') return (
    <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="alert">
      <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5" aria-hidden="true" />Accès réservé à l’exploitant de la plateforme</p>
      <p className="mt-1 text-sm">Votre email doit figurer dans PLATFORM_ADMIN_EMAILS côté serveur.</p>
    </div>
  );
  if (state === 'error' || !data) return <p className="p-6 text-red-700" role="alert">Impossible de charger les inscriptions.</p>;

  const { summary: s, items } = data;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inscriptions et activité</h1>
        <p className="mt-1 text-sm text-gray-600">Qui a créé un compte, et qui s’est réellement connecté. Aucune donnée métier n’est affichée.</p>
      </header>

      <section aria-label="Résumé" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={Users} label="Comptes" value={s.total_users} />
        <Stat icon={UserPlus} label="Nouveaux (7 jours)" value={s.new_7d} />
        <Stat icon={UserPlus} label="Nouveaux (30 jours)" value={s.new_30d} />
        <Stat icon={LogIn} label="Connectés (7 jours)" value={s.active_7d} />
        <Stat icon={MailX} label="Jamais connectés" value={s.never_logged_in} />
      </section>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <th scope="col" className="px-4 py-2.5">Compte</th><th scope="col" className="px-3 py-2.5">Société</th>
            <th scope="col" className="px-3 py-2.5">Inscrit le</th><th scope="col" className="px-3 py-2.5">Dernière connexion</th>
            <th scope="col" className="px-3 py-2.5">Email vérifié</th><th scope="col" className="px-3 py-2.5">Plan</th>
            <th scope="col" className="px-3 py-2.5 text-right">Saisies</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(i => (
              <tr key={i.user_id}>
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{i.full_name || '—'}</p><p className="text-xs text-gray-600">{i.email}</p></td>
                <td className="px-3 py-3 text-gray-800">{i.company}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{day(i.created_at)}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{i.last_login_at ? day(i.last_login_at) : <span className="font-medium text-amber-800">Jamais</span>}</td>
                <td className="px-3 py-3">{i.email_verified ? 'Oui' : 'Non'}</td>
                <td className="px-3 py-3">{i.plan_tier}{i.trial_ends_at ? ` · essai jusqu’au ${new Date(i.trial_ends_at).toLocaleDateString('fr-FR')}` : ''}</td>
                <td className="px-3 py-3 text-right tabular-nums">{i.entries_count}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600">Aucune inscription pour l’instant.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600">La dernière connexion est enregistrée depuis cette mise à jour : les comptes plus anciens affichent « Jamais » jusqu’à leur prochaine connexion.</p>
    </div>
  );
}
