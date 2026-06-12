import { Link, useParams, Navigate } from 'react-router-dom';
import {
  Check, X, ArrowRight, Shield, Zap, Lock, Globe,
  TrendingUp, ChevronRight, Star, ArrowLeft, Building2,
} from 'lucide-react';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const dateLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

// ─── Competitor data ──────────────────────────────────────────────────────────
interface CompetitorData {
  slug: string; name: string; tagline: string; description: string;
  targetMarket: string; pricingLabel: string; pricingNote: string;
  logoText: string; logoColor: string; strengths: string[]; weaknesses: string[]; verdict: string;
}
const getCOMPETITORS = (t: TFunction): Record<string, CompetitorData> => ({
  sweep: {
    slug: 'sweep', name: 'Sweep', logoText: 'SW', logoColor: '#1a56db',
    tagline: t('compare.sweep.tagline', 'Plateforme carbone & ESG enterprise'),
    description: t('compare.sweep.description', 'Sweep est une plateforme parisienne de comptabilité carbone et de reporting CSRD orientée grands groupes. Elle a levé $98M et est reconnue Leader IDC MarketScape 2025.'),
    targetMarket: t('compare.sweep.targetMarket', 'Grands groupes internationaux (CAC 40, multinationales)'),
    pricingLabel: t('compare.sweep.pricingLabel', 'À partir de ~$250/mois (enterprise)'),
    pricingNote: t('compare.sweep.pricingNote', 'Sans prix publics, tarification opaque, add-ons nombreux'),
    verdict: t('compare.sweep.verdict', "Sweep est excellent pour les grands groupes avec des budgets ESG importants. Mais avec un coût minimum estimé à plusieurs milliers d'euros par mois et une configuration complexe, il est totalement inadapté aux PME et ETI françaises."),
    strengths: [
      t('compare.sweep.s0', 'Leader IDC MarketScape & Verdantix 2025'),
      t('compare.sweep.s1', 'Connecteurs très riches (60+)'),
      t('compare.sweep.s2', 'Forte notoriété sur le marché français'),
      t('compare.sweep.s3', 'Partenariats KPMG, Capgemini, ERM'),
      t('compare.sweep.s4', 'Engagement fournisseurs (Scope 3 supply chain)'),
    ],
    weaknesses: [
      t('compare.sweep.w0', 'Aucun plan accessible pour les PME'),
      t('compare.sweep.w1', 'Tarification non transparente'),
      t('compare.sweep.w2', 'Focalisé carbone — Social/Gouvernance ESRS limité'),
      t('compare.sweep.w3', 'Taxonomie UE peu couverte'),
      t('compare.sweep.w4', 'DPEF : non supporté'),
      t('compare.sweep.w5', 'iXBRL / ESEF : non disponible'),
    ],
  },
  workiva: {
    slug: 'workiva', name: 'Workiva', logoText: 'WK', logoColor: '#0052cc',
    tagline: t('compare.workiva.tagline', 'Reporting financier + ESG enterprise'),
    description: t('compare.workiva.description', 'Workiva (NYSE: WK) est le leader mondial du reporting intégré financier + ESG. Coté en bourse, 6 400+ clients, reconnu Leader Verdantix, Gartner et IDC. Standard de facto pour les grandes entreprises cotées.'),
    targetMarket: t('compare.workiva.targetMarket', 'Grandes entreprises cotées, +5 000 salariés'),
    pricingLabel: t('compare.workiva.pricingLabel', 'De $31 500 à $145 000+/an'),
    pricingNote: t('compare.workiva.pricingNote', 'Médiane ~$59 500/an. Implémentation 3–6 mois. Add-ons en plus.'),
    verdict: t('compare.workiva.verdict', "Workiva est la Rolls-Royce du reporting ESG — pour les entreprises du CAC 40 qui allouent $60 000–$150 000/an à leur solution de reporting. Pour une PME ou ETI française, c'est 100× le budget nécessaire et 6 mois de déploiement."),
    strengths: [
      t('compare.workiva.s0', 'Leader absolu du reporting intégré finance + ESG'),
      t('compare.workiva.s1', "Piste d'audit de qualité financière (best-in-class)"),
      t('compare.workiva.s2', 'XBRL natif + ESAP submission'),
      t('compare.workiva.s3', 'CSRD / ESRS : couverture la plus complète du marché'),
      t('compare.workiva.s4', 'Double matérialité + ESRS Transition Accelerator IA'),
      t('compare.workiva.s5', "Intégrations ERP de niveau enterprise"),
    ],
    weaknesses: [
      t('compare.workiva.w0', 'Prix : $31 500–$145 000/an — inabordable pour PME/ETI'),
      t('compare.workiva.w1', "3 à 6 mois d'implémentation minimum"),
      t('compare.workiva.w2', 'Complexité excessive pour équipes RSE sans DSI'),
      t('compare.workiva.w3', 'EU Taxonomy (Article 8) : template disponible mais non natif'),
      t('compare.workiva.w4', 'DPEF : indirect uniquement'),
      t('compare.workiva.w5', "Conçu pour la finance d'abord, ESG ensuite"),
      t('compare.workiva.w6', 'Support uniquement en anglais pour les fonctions clés'),
    ],
  },
  greenly: {
    slug: 'greenly', name: 'Greenly', logoText: 'GR', logoColor: '#16a34a',
    tagline: t('compare.greenly.tagline', 'Plateforme carbone & ESG pour PME/ETI'),
    description: t('compare.greenly.description', 'Greenly est une scale-up française fondée en 2019, spécialisée dans le bilan carbone et le reporting climat. Levée totale ~$72M, plus de 2 000 clients revendiqués sur le segment PME/ETI.'),
    targetMarket: t('compare.greenly.targetMarket', 'PME et ETI (cible similaire à ESG Flow)'),
    pricingLabel: t('compare.greenly.pricingLabel', 'À partir de ~500 €/mois (estimé*)'),
    pricingNote: t('compare.greenly.pricingNote', "Prix non publiés sur leur site, plans Climate/Climate+ négociés au cas par cas. Add-ons CSRD et Supply Chain facturés séparément."),
    verdict: t('compare.greenly.verdict', "Greenly est une bonne référence pour les PME qui veulent un accompagnement carbone clé-en-main. Mais pour la conformité CSRD complète, la souveraineté française et un budget maîtrisé, ESG Flow offre 2× plus de modules ESG pour environ la moitié du prix, avec un essai gratuit immédiat."),
    strengths: [
      t('compare.greenly.s0', 'Forte notoriété sur le marché PME français'),
      t('compare.greenly.s1', 'Onboarding accompagné avec consultant dédié'),
      t('compare.greenly.s2', 'Calcul Scope 1/2/3 automatisé via API bancaire'),
      t('compare.greenly.s3', "Base de données facteurs d'émission étendue"),
      t('compare.greenly.s4', 'Communauté et formations "Climate School"'),
    ],
    weaknesses: [
      t('compare.greenly.w0', 'CSRD / ESRS : module en supplément, non inclus de base'),
      t('compare.greenly.w1', 'EU Taxonomie : couverture partielle'),
      t('compare.greenly.w2', 'DPEF / iXBRL ESEF : non supportés'),
      t('compare.greenly.w3', 'Tarifs opaques — pas de prix publics, devis obligatoire'),
      t('compare.greenly.w4', "Pas de tier gratuit ni d'essai self-service"),
      t('compare.greenly.w5', 'Multi-réglementaire limité (focus carbone)'),
      t('compare.greenly.w6', "Piste d'audit ISAE 3000 : non native"),
      t('compare.greenly.w7', "Coût d'entrée élevé pour les PME (~500 €/mois minimum estimé)"),
    ],
  },
  persefoni: {
    slug: 'persefoni', name: 'Persefoni', logoText: 'PE', logoColor: '#7c3aed',
    tagline: t('compare.persefoni.tagline', 'Carbon management platform'),
    description: t('compare.persefoni.description', 'Persefoni est une plateforme américaine de comptabilité carbone avec une offre gratuite limitée. Spécialisée dans les émissions financées (PCAF) et forte de $194M levés.'),
    targetMarket: t('compare.persefoni.targetMarket', 'Entreprises et institutions financières, US-first'),
    pricingLabel: t('compare.persefoni.pricingLabel', 'Tier gratuit (1 user) · Enterprise $55K–$250K/an'),
    pricingNote: t('compare.persefoni.pricingNote', 'Le tier gratuit est limité à 1 utilisateur, sans multi-entités ni EU Taxonomy'),
    verdict: t('compare.persefoni.verdict', "Persefoni est l'option gratuite la plus connue — mais son free tier est anémique (1 utilisateur, pas d'EU Taxonomy, pas de DPEF, pas de CSRD complet). Pour une équipe RSE française qui veut couvrir réellement ses obligations, il ne couvre qu'une fraction du besoin."),
    strengths: [
      t('compare.persefoni.s0', 'Seul concurrent avec un tier réellement gratuit'),
      t('compare.persefoni.s1', 'PersefoniAI (IA intégrée) sur tous les plans'),
      t('compare.persefoni.s2', 'Très fort sur PCAF (émissions financées pour banques)'),
      t('compare.persefoni.s3', 'Assurance-grade GHG (SOC-2 Type 2)'),
      t('compare.persefoni.s4', 'Interface UX moderne et accessible'),
    ],
    weaknesses: [
      t('compare.persefoni.w0', 'Tier gratuit limité à 1 utilisateur — inutilisable en équipe'),
      t('compare.persefoni.w1', 'Focalisé carbone uniquement (Scope 1/2/3)'),
      t('compare.persefoni.w2', 'CSRD / ESRS : partiel — Social & Gouvernance absents'),
      t('compare.persefoni.w3', 'Taxonomie UE : non supportée'),
      t('compare.persefoni.w4', 'DPEF France : non supporté'),
      t('compare.persefoni.w5', 'iXBRL / ESEF : non disponible'),
      t('compare.persefoni.w6', 'Multi-entités : uniquement en Enterprise ($55K+/an)'),
      t('compare.persefoni.w7', 'Plateforme US — pas de souveraineté des données en France'),
      t('compare.persefoni.w8', 'Données hébergées aux États-Unis'),
    ],
  },
});

// ─── Feature comparison ───────────────────────────────────────────────────────
interface Feature {
  label: string;
  esgflow: boolean | string;
  competitor: boolean | string;
  important?: boolean;
}

function getFeatures(slug: string, t: TFunction): Feature[] {
  const vStrong  = t('compare.vStrong',  '✓ Fort');
  const vPartial = t('compare.vPartial', '⚠ Partiel');
  const vBankAPI = t('compare.vBankAPI', '⚠ Via API bancaire');
  const vBest    = t('compare.vBest',    '✓ Meilleur');
  const base: Feature[] = [
    { label: t('compare.fCSRD',    'CSRD / ESRS (82 exigences)'),                  esgflow: true, competitor: slug === 'workiva' ? vStrong : slug === 'sweep' ? vStrong : slug === 'greenly' ? '⚠ Add-on' : vPartial, important: true },
    { label: t('compare.fTaxo',    'EU Taxonomie (DNSH + alignement)'),             esgflow: true, competitor: slug === 'workiva' ? '⚠ Template' : slug === 'greenly' ? vPartial : false, important: true },
    { label: t('compare.fDPEF',    'DPEF'),                                          esgflow: true, competitor: false, important: true },
    { label: t('compare.fIXBRL',   'iXBRL / ESEF (35 concepts ESRS)'),              esgflow: true, competitor: slug === 'workiva' ? '✓ XBRL' : false, important: true },
    { label: t('compare.fGRI',     'Mapping multi-standards GRI/CDP/TCFD (46 indicateurs, 24 séries GRI)'), esgflow: true, competitor: slug === 'workiva' ? vStrong : slug === 'persefoni' ? false : vPartial, important: true },
    { label: t('compare.fVSME',    'Norme VSME EFRAG — template PME prêt à l\'emploi (B1–B11)'), esgflow: true, competitor: slug === 'greenly' ? vPartial : false, important: true },
    { label: t('compare.fDMA',     'Double matérialité IRO'),                        esgflow: true, competitor: slug === 'persefoni' ? false : slug === 'greenly' ? vPartial : true },
    { label: t('compare.fCarbon',  'Bilan Carbone Scope 3 (15 catégories)'),         esgflow: true, competitor: true },
    { label: t('compare.fFEC',     'Import FEC → Scope 3 automatique'),              esgflow: true, competitor: slug === 'greenly' ? vBankAPI : false, important: true },
    { label: t('compare.fIPCC',    'Scénarios climatiques IPCC AR6'),                esgflow: true, competitor: slug === 'workiva' ? vPartial : slug === 'sweep' ? vPartial : false },
    { label: t('compare.fSBTi',    'Plan de décarbonation SBTi'),                   esgflow: true, competitor: slug === 'sweep' ? true : slug === 'persefoni' ? vPartial : slug === 'greenly' ? vPartial : true },
    { label: t('compare.fSupply',  'Supply Chain ESG (6 dimensions)'),               esgflow: true, competitor: slug === 'sweep' ? vStrong : slug === 'workiva' ? vPartial : slug === 'greenly' ? '⚠ Add-on' : false },
    { label: t('compare.fAudit',   "Journal d'audit détaillé + empreintes SHA-256"), esgflow: true, competitor: slug === 'workiva' ? vBest : slug === 'sweep' ? vPartial : slug === 'persefoni' ? '✓ SOC-2' : vPartial },
    { label: t('compare.fAI',      'IA embarquée + chatbot ESG'),                   esgflow: true, competitor: slug === 'greenly' ? false : true },
    { label: t('compare.fInvest',  'Relations Investisseurs (CDP/MSCI)'),            esgflow: true, competitor: slug === 'sweep' ? vPartial : false },
    { label: t('compare.fHosting', 'Hébergement France / souveraineté RGPD'),        esgflow: true, competitor: slug === 'sweep' ? '⚠ AWS EU' : slug === 'greenly' ? '⚠ AWS EU' : false, important: true },
    { label: t('compare.fPricing', 'Tarifs transparents et publics'),                esgflow: true, competitor: slug === 'persefoni' ? vPartial : false, important: true },
    { label: t('compare.fSelfSvc', 'Self-service PME (sans consultant)'),            esgflow: true, competitor: false, important: true },
    { label: t('compare.fMultiOrg','Multi-organisations par tenant'),                esgflow: true, competitor: slug === 'persefoni' ? false : true },
    { label: t('compare.fAPI',     'API REST + webhooks'),                           esgflow: true, competitor: true },
    { label: t('compare.fTrial',   'Essai gratuit 14 jours sans CB'),               esgflow: true, competitor: false },
    { label: t('compare.fSupFR',   'Support en français'),                           esgflow: true, competitor: slug === 'sweep' || slug === 'greenly' ? true : false },
  ];
  return base;
}

// ─── Pricing comparison ───────────────────────────────────────────────────────
// IMPORTANT — Legal: pour respecter l'Article L122-1 du Code de la consommation
// (publicité comparative), les chiffres des concurrents doivent être :
//   • Objectifs et vérifiables (sources publiques)
//   • Étiquetés comme "estimés" / "à date du …" si non officiels
//   • Non trompeurs ni dénigrants
// Les prix ci-dessous proviennent de sources publiques (rapports analystes,
// G2, Capterra, témoignages publics) à date de 2026-05. Toute publication
// officielle du concurrent prévaut.
function getPricingRows(slug: string, t: TFunction) {
  const surMesure = t('compare.surMesure', 'Sur mesure');
  const surDevis  = t('compare.surDevis',  'Sur devis');
  const esgflowPlans = [
    { name: t('compare.planFreeName','Gratuit'), price: '0 €/mois',    features: t('compare.planFeat0','3 utilisateurs · 5 organisations · Dashboard & scores ESG') },
    { name: 'PME',                               price: '249 €/mois',   features: t('compare.planFeat1','25 utilisateurs · 50 orgs · CSRD · Carbone · FEC · Taxonomie') },
    { name: 'ETI',                               price: '599 €/mois',   features: t('compare.planFeat2','100 utilisateurs · 250 orgs · IA narrative · Connecteurs avancés') },
    { name: 'Groupe',                            price: '1 199 €/mois', features: t('compare.planFeat3','500 utilisateurs · SSO/SAML · Consolidation multi-entités IFRS 10 · Marque blanche') },
    { name: 'Enterprise',                        price: surMesure,       features: t('compare.planFeat4',"SLA 99,9% · Account manager dédié · On-premise possible") },
  ];

  const competitorPlanMap: Record<string, Array<{ name: string; price: string; features: string }>> = {
    sweep: [
      { name: t('compare.sweepPlan0name','Non disponible'), price: '~$250/mois (estimé*)',       features: t('compare.sweepPlan0feat','Accès limité — Enterprise requis') },
      { name: 'Growth',                                     price: '~$800–3 600/mois (estimé*)', features: t('compare.sweepPlan1feat','Fonctions avancées — prix non publics') },
      { name: 'Enterprise',                                 price: surDevis,                     features: t('compare.sweepPlan2feat','Prix non publiés, négociés') },
    ],
    workiva: [
      { name: t('compare.wkPlan0name','Enterprise seulement'), price: '$31 500–$59 500/an (médiane estimée*)', features: t('compare.wkPlan0feat','Implémentation 3–6 mois') },
      { name: 'Enterprise+',                                    price: "Jusqu'à $145 000/an (estimé*)",        features: t('compare.wkPlan1feat','Add-ons et services en sus') },
      { name: 'Enterprise custom',                              price: '$335 000–$369 000/an (estimé*)',        features: t('compare.wkPlan2feat','Grands groupes / multinationales') },
    ],
    persefoni: [
      { name: 'PRO (Free)',  price: '0 $/mois',                      features: t('compare.pePlan0feat','1 utilisateur · Scope 1/2/3 basique · Pas de taxonomie UE') },
      { name: 'Advanced',    price: '$55 000–$250 000/an (estimé*)', features: t('compare.pePlan1feat','Enterprise uniquement · Sur devis') },
    ],
    greenly: [
      { name: 'Climate Essentials', price: '~500 €/mois (estimé*)',      features: t('compare.gnPlan0feat','Bilan Carbone Scope 1/2/3 · Reporting basique') },
      { name: 'Climate+',           price: '~1 200–2 500 €/mois (estimé*)', features: t('compare.gnPlan1feat','CSRD en add-on · Supply Chain en supplément') },
      { name: 'Enterprise',         price: surDevis,                      features: t('compare.gnPlan2feat','Prix négociés · Onboarding consultant inclus') },
    ],
  };

  return { esgflowPlans, competitorPlans: competitorPlanMap[slug] ?? [] };
}

// ─── Component ────────────────────────────────────────────────────────────────
function FeatureRow({ feature, last }: { feature: Feature; last?: boolean }) {
  const { t } = useTranslation();
  const renderValue = (val: boolean | string) => {
    if (val === true) return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">{t('compare.included','Inclus')}</span>
      </div>
    );
    if (val === false) return (
      <div className="flex items-center gap-1.5 text-red-400">
        <X className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{t('compare.notAvail','Non disponible')}</span>
      </div>
    );
    // partial / string
    const warn = String(val).startsWith('⚠');
    return (
      <div className={`flex items-center gap-1.5 ${warn ? 'text-amber-600' : 'text-emerald-600'}`}>
        {warn
          ? <span className="text-base leading-none">⚠</span>
          : <Check className="h-4 w-4 flex-shrink-0" />}
        <span className="text-sm font-medium">{String(val).replace('⚠ ', '').replace('✓ ', '')}</span>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-3 gap-4 py-3 px-4 ${last ? '' : 'border-b border-gray-100'} ${feature.important ? 'bg-emerald-50/40' : 'bg-white hover:bg-gray-50/60'} transition-colors`}>
      <div className="flex items-center gap-2">
        {feature.important && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
        <span className={`text-sm ${feature.important ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{feature.label}</span>
      </div>
      <div className="flex items-center">{renderValue(feature.esgflow)}</div>
      <div className="flex items-center">{renderValue(feature.competitor)}</div>
    </div>
  );
}

export default function ComparisonPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const COMPETITORS = getCOMPETITORS(t);
  const competitor = slug ? COMPETITORS[slug] : null;

  usePageSeo({
    id: `compare-${slug ?? 'unknown'}`,
    title: competitor
      ? t('compare.seoTitle', 'ESG Flow vs {{name}} — Comparatif plateforme ESG', { name: competitor.name })
      : t('compare.seoTitleDefault', 'Comparatif ESG — ESG Flow'),
    description: competitor
      ? t('compare.seoDesc', "Comparez ESG Flow et {{name}} : fonctionnalités, tarifs, conformité CSRD. Découvrez pourquoi ESG Flow est l'alternative européenne.", { name: competitor.name })
      : t('compare.seoDescDefault', 'Comparatif des plateformes ESG.'),
    url: `https://greenconnect.cloud/compare/${slug ?? ''}`,
    keywords: competitor
      ? t('compare.seoKw', 'ESG Flow vs {{name}}, comparatif ESG, alternative {{name}}', { name: competitor.name })
      : undefined,
    ogImage: 'https://greenconnect.cloud/og/compare.png',
  });

  if (!competitor) return <Navigate to="/" replace />;

  const features = getFeatures(competitor.slug, t);
  const { esgflowPlans, competitorPlans } = getPricingRows(competitor.slug, t);

  const esgflowWins = features.filter(f => f.esgflow === true && f.competitor === false).length;
  const importantWins = features.filter(f => f.important && f.esgflow === true && f.competitor === false).length;

  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('compare.back', 'Retour')}
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">ESG Flow</span>
            <span className="text-gray-300">vs</span>
            <span className="text-sm font-bold" style={{ color: competitor.logoColor }}>{competitor.name}</span>
          </div>
          <Link
            to="/register"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-600/20"
          >
            {t('compare.trialCta', 'Essai gratuit →')}
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-white/80 text-xs font-semibold mb-8">
            {t('compare.badge', 'Comparatif indépendant · Mai 2026')}
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            {/* ESG Flow */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <span className="text-white font-extrabold text-xl">E</span>
              </div>
              <span className="text-white font-bold text-sm">ESG Flow</span>
            </div>
            <div className="text-4xl font-extrabold text-white/40">vs</div>
            {/* Competitor */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl" style={{ backgroundColor: competitor.logoColor + '30', border: `2px solid ${competitor.logoColor}40` }}>
                <span className="font-extrabold text-xl" style={{ color: competitor.logoColor }}>{competitor.logoText}</span>
              </div>
              <span className="text-white font-bold text-sm">{competitor.name}</span>
            </div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            ESG Flow vs {competitor.name}
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            {t('compare.heroTagline', '{{tagline}} — comparatif complet des fonctionnalités, prix et couverture réglementaire française.', { tagline: competitor.tagline })}
          </p>

          {/* Quick score */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-white/10 border border-white/20 rounded-2xl px-6 py-4">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-emerald-400">{esgflowWins}</div>
              <div className="text-xs text-slate-300 mt-0.5">{t('compare.heroAbsA','fonctionnalités absentes')}<br />{t('compare.heroAbsB','chez {{name}}',{name:competitor.name})}</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-extrabold text-amber-300">{importantWins}</div>
              <div className="text-xs text-slate-300 mt-0.5">{t('compare.heroAdvA','avantages clés')}<br />{t('compare.heroAdvB','pour le marché français')}</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-white">249 €<span className="text-base font-normal text-slate-300">/mois</span></div>
              <div className="text-xs text-slate-300 mt-0.5">{t('compare.heroFrom','à partir de · vs')} {competitor.pricingLabel.split('·')[0].trim()}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── About the competitor ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t('compare.whatIs',"Qu'est-ce que {{name}} ?",{name:competitor.name})}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <p className="text-gray-700 leading-relaxed mb-4">{competitor.description}</p>
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{t('compare.target','Cible :')} </span>{competitor.targetMarket}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('compare.strengths','Points forts de {{name}}',{name:competitor.name})}</div>
                <ul className="space-y-1.5">
                  {competitor.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature comparison table ───────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('compare.funcTitle','Comparatif fonctionnel')}</h2>
          <p className="text-gray-500 mb-6 text-sm">{t('compare.funcSubA','Les critères en ')}<span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {t('compare.funcGreen','vert')}</span>{t('compare.funcSubB',' sont les différenciateurs clés pour le marché français.')}</p>

          <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('compare.funcHeader','Fonctionnalité')}</div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-[10px] font-extrabold">E</span>
                </div>
                <span className="text-xs font-bold text-gray-900">ESG Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: competitor.logoColor + '20' }}>
                  <span className="text-[10px] font-extrabold" style={{ color: competitor.logoColor }}>{competitor.logoText.slice(0, 1)}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{competitor.name}</span>
              </div>
            </div>

            {features.map((f, i) => (
              <FeatureRow key={i} feature={f} last={i === features.length - 1} />
            ))}
          </div>
        </section>

        {/* ── Pricing comparison ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('compare.pricingTitle','Comparatif tarifaire')}</h2>
          <p className="text-gray-500 mb-6 text-sm">{t('compare.pricingSubtitle','Tous les prix ESG Flow sont publics et disponibles sans devis.')}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ESG Flow plans */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-extrabold">E</span>
                </div>
                <span className="font-bold text-gray-900">{t('compare.esgPlans','Plans ESG Flow')}</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{t('compare.publicPrices','Prix publics')}</span>
              </div>
              <div className="space-y-3">
                {esgflowPlans.map((plan, i) => (
                  <div key={i} className="flex items-start justify-between p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{plan.features}</div>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700 whitespace-nowrap ml-4">{plan.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor plans */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: competitor.logoColor + '20' }}>
                  <span className="text-xs font-extrabold" style={{ color: competitor.logoColor }}>{competitor.logoText.slice(0, 1)}</span>
                </div>
                <span className="font-bold text-gray-900">{t('compare.compPlans','Plans {{name}}',{name:competitor.name})}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{t('compare.estPrices','Prix estimés')}</span>
              </div>
              <div className="space-y-3">
                {competitorPlans.map((plan, i) => (
                  <div key={i} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{plan.features}</div>
                    </div>
                    <div className="text-sm font-extrabold text-gray-600 whitespace-nowrap ml-4">{plan.price}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 italic">{competitor.pricingNote}</p>
            </div>
          </div>
        </section>

        {/* ── Points d'attention pour les PME/ETI françaises ─────────────────── */}
        {/* Tonalité neutre / factuelle — conforme à l'art. L122-1 (pas de dénigrement) */}
        <section className="bg-amber-50 border border-amber-100 rounded-3xl p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('compare.attentionTitle',"Points d'attention pour une PME ou ETI française")}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('compare.attentionSubA','Éléments factuels à considérer si vous évaluez {{name}} pour le marché français.',{name:competitor.name})}
            {' '}{t('compare.attentionSubB',"Information à date de 2026 ; vérifiez auprès de l'éditeur.")}
          </p>
          <ul className="space-y-3">
            {competitor.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="h-3 w-3 text-amber-600" />
                </div>
                {w}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Verdict ───────────────────────────────────────────────────────── */}
        <section className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3">{t('compare.verdictTitle','Notre verdict')}</h2>
              <p className="text-gray-700 leading-relaxed">{competitor.verdict}</p>
            </div>
          </div>
        </section>

        {/* ── ESG Flow strengths ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">{t('compare.whyTitle','Pourquoi choisir ESG Flow')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Shield,    color: 'emerald', title: t('compare.adv0title','Hébergé en France'),        desc: t('compare.adv0desc','Données souveraines, RGPD natif. Aucun cloud américain.') },
              { icon: Zap,       color: 'amber',   title: t('compare.adv1title','Opérationnel en 1 jour'),   desc: t('compare.adv1desc','Aucun consultant, aucune intégration complexe. Self-service total.') },
              { icon: Lock,      color: 'violet',  title: t('compare.adv2title','CSRD + DPEF + EU Tax'),      desc: t('compare.adv2desc','Les 3 obligations françaises dans une seule plateforme accessible.') },
              { icon: Globe,     color: 'blue',    title: t('compare.adv3title','Import FEC unique'),         desc: t('compare.adv3desc','Scope 3 calculé automatiquement depuis votre comptabilité Sage/Cegid.') },
              { icon: TrendingUp,color: 'emerald', title: t('compare.adv4title','iXBRL / ESEF inclus'),       desc: t('compare.adv4desc','35 concepts ESRS balisés, export .xhtml certifiable dès le plan ETI.') },
              { icon: Building2, color: 'slate',   title: t('compare.adv5title','À partir de 0 €/mois'),      desc: t('compare.adv5desc','Plan gratuit réel, plans payants publics. Pas de devis, pas de surprise.') },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="p-5 bg-white border border-gray-200 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all">
                <div className={`w-9 h-9 bg-${color}-100 rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section style={{ background: 'linear-gradient(135deg, #064e3b 0%, #134e4a 50%, #1e3a5f 100%)' }} className="rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="relative">
            <div className="text-4xl font-extrabold text-white mb-3">
              {t('compare.ctaTitle','Essayez ESG Flow gratuitement')}
            </div>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto text-lg">
              {t('compare.ctaDescA','14 jours, sans carte bancaire. Toutes les fonctionnalités Pro incluses.')}
              {' '}{t('compare.ctaDescB','Plus complet que {{name}} pour votre contexte réglementaire — à une fraction du prix.',{name:competitor.name})}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/30 hover:-translate-y-0.5 text-base"
              >
                {t('compare.ctaStart','Démarrer gratuitement — 14 jours')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base"
              >
                {t('compare.ctaModules','Voir tous les modules')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Other comparisons ─────────────────────────────────────────────── */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('compare.othersTitle','Autres comparatifs')}</h3>
          <div className="flex flex-wrap gap-3">
            {Object.values(COMPETITORS)
              .filter(c => c.slug !== competitor.slug)
              .map(c => (
                <Link
                  key={c.slug}
                  to={`/compare/${c.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all text-sm font-medium"
                >
                  ESG Flow vs {c.name} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ))}
          </div>
        </section>

        {/* ── Legal disclaimer — required by Article L122-1 Code de la consommation ──── */}
        <section className="border-t border-gray-100 pt-8 mt-4">
          <details className="text-xs text-gray-500 leading-relaxed">
            <summary className="font-semibold text-gray-700 cursor-pointer mb-2">
              {t('compare.legalSummary','Sources et méthodologie du comparatif')}
            </summary>
            <div className="space-y-2 mt-3">
              <p>
                <strong>*</strong>{t('compare.legalP1'," Les prix concurrents marqués « estimé » proviennent de sources publiques : rapports d'analystes (Verdantix, Gartner, IDC), plateformes d'avis B2B (G2, Capterra, TrustRadius), témoignages clients publics, articles de presse spécialisée, et appels d'offres publics. Toute publication officielle de l'éditeur prévaut. Données à date de {{date}}.", { date: new Date().toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) })}
              </p>
              <p>
                {t('compare.legalP2',"Les fonctionnalités comparées sont vérifiables sur les pages produit publiques des éditeurs. Ce comparatif n'engage pas {{name}} et ne reflète pas sa position officielle. Marques, logos et noms de produits sont la propriété de leurs détenteurs respectifs ; leur citation relève du droit de citation et de la publicité comparative (Article L122-1 et suivants du Code de la consommation, Directive 2006/114/CE).", { name: competitor.name })}
              </p>
              <p>
                {t('compare.legalP3A','Si vous représentez {{name}} et souhaitez signaler une inexactitude, contactez ',{name:competitor.name})}
                <a href="mailto:support@greenconnect.cloud" className="underline hover:text-gray-700">
                  support@greenconnect.cloud
                </a>
                {t('compare.legalP3B',' — nous corrigeons sous 5 jours ouvrés.')}
              </p>
            </div>
          </details>
        </section>
      </div>

      {/* ── Footer minimal ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>{t('compare.footerCopyright','© 2026 GreenConnect SAS —')} <Link to="/privacy-policy" className="hover:text-gray-600">{t('compare.footerPrivacy','Confidentialité')}</Link> · <Link to="/terms-of-service" className="hover:text-gray-600">{t('compare.footerTerms','CGU')}</Link></p>
        <p className="mt-1">{t('compare.footerComparatif',"Comparatif établi sur la base de sources publiques au {{date}} — publicité comparative au sens de l'art. L122-1 du Code de la consommation.", { date: new Date().toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) })}</p>
      </footer>
    </div>
  );
}
