import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail, ChevronDown, ChevronUp,
  BookOpen, Shield, LifeBuoy, FileText,
  ArrowRight,
} from 'lucide-react';

const FAQ = [
  {
    q: 'Comment exporter mes rapports ESG en PDF ?',
    a: "Rendez-vous dans Rapports → Tableau de bord, sélectionnez votre rapport généré et cliquez sur « Télécharger ». Vous pouvez choisir le format PDF, Excel ou Word avant de générer.",
  },
  {
    q: 'Comment configurer un connecteur de données externe ?',
    a: "Allez dans Données → Connecteurs, cliquez sur « Ajouter un connecteur » et sélectionnez votre source (Pennylane, Qonto, Enedis…). Suivez le guide de configuration pas-à-pas.",
  },
  {
    q: 'Mes données CSRD sont-elles conformes ESRS ?',
    a: "ESGFlow structure la collecte selon les normes ESRS (E1-E5, S1-S4, G1), mais la conformité de votre déclaration dépend de la qualité de vos données et de leur vérification. La page Conformité indique votre taux de couverture par référentiel ; elle ne vaut pas attestation.",
  },
  {
    q: 'Comment ajouter un nouvel utilisateur à mon espace ?',
    a: "Dans Paramètres → Utilisateurs, cliquez sur « Nouvel utilisateur », renseignez l'email et choisissez le rôle. L'invitation est envoyée automatiquement par email.",
  },
  {
    q: 'Quelle est la fréquence de calcul des scores ESG ?',
    a: "Les scores sont calculés à partir de vos données ; relancez un calcul depuis Scores → Calcul après une nouvelle saisie ou un import.",
  },
];

const RESOURCES = [
  { icon: BookOpen, title: 'Centre d’aide', desc: 'Guides et réponses aux questions courantes', color: 'bg-blue-50 text-blue-600', link: '/help' },
  { icon: Shield, title: 'État des services', desc: 'Disponibilité mesurée en direct', color: 'bg-green-50 text-green-600', link: '/status' },
];

export default function Support() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                Centre d'Assistance
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <LifeBuoy className="h-8 w-8" />
              Support ESGFlow
            </h1>
            <p className="text-emerald-100">Contactez-nous par e-mail ou consultez le centre d’aide</p>
          </div>
        </div>
      </div>

      {/* ── Contact channels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Mail,
            title: 'Email',
            value: 'support@greenconnect.cloud',
            sub: 'Nous répondons dès que possible',
            action: 'Envoyer un email',
            href: 'mailto:support@greenconnect.cloud',
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-600',
          },
          {
            icon: BookOpen,
            title: 'Centre d’aide',
            value: 'Guides et questions fréquentes',
            sub: 'Pas-à-pas pour les fonctions courantes',
            action: 'Ouvrir le centre d’aide',
            href: '/help',
            color: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
          },
        ].map(ch => {
          const Icon = ch.icon;
          return (
            <div key={ch.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className={`h-1.5 bg-gradient-to-r ${ch.color}`} />
              <div className="p-6">
                <div className={`w-12 h-12 ${ch.bg} rounded-2xl flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${ch.text}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">{ch.title}</h3>
                <p className={`text-sm font-semibold ${ch.text} mb-1`}>{ch.value}</p>
                <p className="text-xs text-gray-400 mb-4">{ch.sub}</p>
                <a
                  href={ch.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${ch.text} hover:gap-2.5 transition-all`}
                >
                  {ch.action}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── FAQ ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-50 rounded-xl">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Questions fréquentes</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Resources + Status ── */}
        <div className="space-y-4">
          {/* Resources */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-blue-50 rounded-xl">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Ressources</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESOURCES.map(r => {
                const Icon = r.icon;
                return (
                  <a
                    key={r.title}
                    href={r.link}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
                  >
                    <div className={`p-2 rounded-lg ${r.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900">{r.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{r.desc}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
