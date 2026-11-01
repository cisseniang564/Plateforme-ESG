import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail, Phone, MessageCircle, ExternalLink, ChevronDown, ChevronUp,
  CheckCircle, Clock, BookOpen, Zap, Shield, LifeBuoy,
  FileText, Video, ArrowRight,
} from 'lucide-react';

const FAQ = [
  {
    q: 'Comment exporter mes rapports ESG en PDF ?',
    a: "Rendez-vous dans Rapports → Tableau de bord, sélectionnez votre rapport généré et cliquez sur « Télécharger ». Vous pouvez choisir le format PDF, Excel ou Word avant de générer.",
  },
  {
    q: 'Comment configurer un connecteur de données externe ?',
    a: "Allez dans Données → Connecteurs, cliquez sur « Ajouter un connecteur » et sélectionnez votre source (SAP, Salesforce, Google Sheets…). Suivez le guide de configuration pas-à-pas.",
  },
  {
    q: 'Mes données CSRD sont-elles conformes ESRS ?',
    a: "Oui — ESGFlow implémente les normes ESRS E1-E5, S1-S4 et G1. Consultez la page Conformité pour voir votre score de conformité par référentiel.",
  },
  {
    q: 'Comment ajouter un nouvel utilisateur à mon espace ?',
    a: "Dans Paramètres → Utilisateurs, cliquez sur « Nouvel utilisateur », renseignez l'email et choisissez le rôle. L'invitation est envoyée automatiquement par email.",
  },
  {
    q: 'Quelle est la fréquence de calcul des scores ESG ?',
    a: "Les scores sont recalculés en temps réel à chaque nouvelle saisie ou import de données. Vous pouvez aussi déclencher un recalcul manuel depuis Scores → Calcul.",
  },
];

const RESOURCES = [
  { icon: BookOpen, title: 'Documentation complète', desc: 'Guides détaillés pour chaque fonctionnalité', color: 'bg-blue-50 text-blue-600', link: '#' },
  { icon: Video, title: 'Tutoriels vidéo', desc: 'Vidéos pas-à-pas pour démarrer rapidement', color: 'bg-purple-50 text-purple-600', link: '#' },
  { icon: FileText, title: 'Notes de version', desc: 'Nouveautés et corrections de bugs', color: 'bg-green-50 text-green-600', link: '#' },
  { icon: Zap, title: 'API & Webhooks', desc: 'Documentation technique pour intégrateurs', color: 'bg-orange-50 text-orange-600', link: '#' },
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
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-400/20 border border-green-300/30 rounded-full text-xs font-semibold text-green-200">
                <CheckCircle className="h-3 w-3" />
                Tous les services opérationnels
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <LifeBuoy className="h-8 w-8" />
              Support ESGFlow
            </h1>
            <p className="text-emerald-100">Notre équipe est disponible pour vous accompagner</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
            <Clock className="h-5 w-5 text-emerald-200" />
            <div>
              <p className="text-sm font-bold">Temps de réponse</p>
              <p className="text-xs text-emerald-200">Moyen : &lt; 4 heures</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact channels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Mail,
            title: 'Email',
            value: 'support@esgflow.com',
            sub: 'Réponse sous 4h en jours ouvrés',
            action: 'Envoyer un email',
            href: 'mailto:support@esgflow.com',
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-600',
          },
          {
            icon: Phone,
            title: 'Téléphone',
            value: '+33 1 23 45 67 89',
            sub: 'Lun–Ven, 9h–18h (CET)',
            action: 'Appeler maintenant',
            href: 'tel:+33123456789',
            color: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
          },
          {
            icon: MessageCircle,
            title: 'Chat en direct',
            value: 'Chat disponible',
            sub: 'Réponse instantanée en semaine',
            action: 'Démarrer un chat',
            href: '#',
            color: 'from-violet-500 to-purple-600',
            bg: 'bg-violet-50',
            text: 'text-violet-600',
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
            <div className="grid grid-cols-2 gap-3">
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

          {/* System Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-xl">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Statut des services</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Opérationnel
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'API & Backend',       status: 'ok' },
                { name: 'Calcul des scores',   status: 'ok' },
                { name: 'Génération rapports', status: 'ok' },
                { name: 'Connecteurs données', status: 'ok' },
              ].map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{s.name}</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Opérationnel
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
