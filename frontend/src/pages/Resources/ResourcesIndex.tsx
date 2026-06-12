import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Flame, Layers, Newspaper, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const getGuides = (t: TFunction) => [
  {
    category: t('resources.index.guides.0.category', 'Réglementation'),
    color: 'emerald',
    icon: FileText,
    title: t('resources.index.guides.0.title', 'Omnibus CSRD : ce qui change et ce que vous devez faire maintenant'),
    excerpt: t('resources.index.guides.0.excerpt', 'Le paquet Omnibus I a relevé le seuil à 1 000 salariés et 450 M€ de CA. Qui est encore obligé ? Quel impact sur les PME non soumises ?'),
    date: t('resources.index.guides.0.date', '17 mai 2026'),
    readTime: t('resources.index.guides.0.readTime', '12 min'),
    to: '/omnibus-csrd',
  },
  {
    category: t('resources.index.guides.1.category', 'CSDDD'),
    color: 'violet',
    icon: Shield,
    title: t('resources.index.guides.1.title', 'CSDDD : devoir de vigilance fournisseurs — guide complet PME / ETI'),
    excerpt: t('resources.index.guides.1.excerpt', 'Obligations de due diligence, calendrier 2027-2029, effet de ruissellement sur les PME sous-traitantes des grands groupes. Méthode en 7 étapes.'),
    date: t('resources.index.guides.1.date', '12 mai 2026'),
    readTime: t('resources.index.guides.1.readTime', '14 min'),
    to: '/guide/csddd-supply-chain',
  },
  {
    category: t('resources.index.guides.2.category', 'Bilan Carbone'),
    color: 'orange',
    icon: Flame,
    title: t('resources.index.guides.2.title', 'Scope 3 par import FEC : calculez vos émissions en 1 clic'),
    excerpt: t('resources.index.guides.2.excerpt', 'Importez votre Fichier des Écritures Comptables depuis Sage ou Pennylane et obtenez vos 15 catégories GHG Protocol avec les facteurs ADEME 2024.'),
    date: t('resources.index.guides.2.date', '8 mai 2026'),
    readTime: t('resources.index.guides.2.readTime', '8 min'),
    to: '/guide/scope3-fec',
  },
  {
    category: t('resources.index.guides.3.category', 'Taxonomie UE'),
    color: 'blue',
    icon: Layers,
    title: t('resources.index.guides.3.title', 'Taxonomie européenne 2024 : éligibilité vs alignement, les pièges à éviter'),
    excerpt: t('resources.index.guides.3.excerpt', 'Critères de contribution substantielle, DNSH et garanties minimales : décryptage des obligations pour vos activités économiques.'),
    date: t('resources.index.guides.3.date', '28 avr. 2026'),
    readTime: t('resources.index.guides.3.readTime', '10 min'),
    to: '/guide/taxonomie',
  },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  violet:  'bg-violet-50  text-violet-700  border-violet-100',
  orange:  'bg-orange-50  text-orange-700  border-orange-100',
  blue:    'bg-blue-50    text-blue-700    border-blue-100',
};
const iconBg: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  violet:  'bg-violet-100  text-violet-600',
  orange:  'bg-orange-100  text-orange-600',
  blue:    'bg-blue-100    text-blue-600',
};

export default function ResourcesIndex() {
  const { t } = useTranslation();
  const GUIDES = getGuides(t);
  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t('resources.index.nav.home', 'Accueil')}
          </Link>
          <Link to="/register" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
            {t('resources.index.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 pt-14 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-emerald-300 text-xs font-semibold mb-6">
            <Newspaper className="h-3.5 w-3.5" /> {t('resources.index.hero.badge', 'Guides & Ressources ESG')}
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            {t('resources.index.hero.title', "Tout ce qu'il faut savoir sur la réglementation ESG")}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            {t('resources.index.hero.subtitle', 'Guides pratiques, décryptages réglementaires et bonnes pratiques — rédigés par les experts ESG de GreenConnect.')}
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          {t('resources.index.guidesAvailable', { count: GUIDES.length, defaultValue: '{{count}} guide disponible', defaultValue_other: '{{count}} guides disponibles' })}
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {GUIDES.map((g, i) => {
            const Icon = g.icon;
            return (
              <Link
                key={i}
                to={g.to}
                className="group bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="px-6 pt-6 pb-4 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorMap[g.color]}`}>
                      <Icon className="h-3 w-3" />{g.category}
                    </span>
                    <span className="text-xs text-gray-400">{g.readTime}</span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 leading-snug mb-3 group-hover:text-emerald-700 transition-colors">
                    {g.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{g.excerpt}</p>
                </div>
                <div className="px-6 pb-6 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{g.date}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                    {t('resources.index.card.read', 'Lire')} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #134e4a 50%, #1e3a5f 100%)' }} className="rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">{t('resources.index.cta.title', "Prêt à passer à l'action ?")}</h2>
          <p className="text-slate-300 mb-6 text-sm max-w-md mx-auto">
            {t('resources.index.cta.subtitle', 'ESG Flow met en pratique tout ce que ces guides expliquent — CSRD, Scope 3, Taxonomie — dans une seule plateforme à partir de 249 €/mois.')}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 text-sm"
          >
            {t('resources.index.cta.button', 'Démarrer gratuitement — 14 jours')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>© 2026 GreenConnect SAS · <Link to="/" className="hover:text-gray-600">{t('resources.index.footer.home', 'Accueil')}</Link> · <Link to="/security" className="hover:text-gray-600">{t('resources.index.footer.security', 'Sécurité')}</Link> · <Link to="/privacy-policy" className="hover:text-gray-600">{t('resources.index.footer.privacy', 'Confidentialité')}</Link></p>
      </footer>
    </div>
  );
}
