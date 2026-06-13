/**
 * StandardsPage — Page publique "Normes & Conformité CSRD"
 * URL : /normes
 * Montre précisément quels standards ESRS/CSRD sont couverts,
 * frameworks supportés, architecture de sécurité.
 * Cible : prospects, experts-comptables, cabinets RSE.
 */
import { Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, AlertCircle, ArrowRight, ShieldCheck,
  FileText, Leaf, Users, Building2, Lock, Database,
  BarChart3, Globe, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { usePageSeo } from '@/hooks/usePageSeo';

/* ─── Données : couverture ESRS ─────────────────────────────────────── */
const ESRS_STANDARDS = [
  {
    code: 'ESRS 2', label: 'Informations générales', category: 'Transversal',
    color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500',
    items: [
      { name: 'Gouvernance & stratégie ESG', covered: 'full' },
      { name: 'Processus de double matérialité', covered: 'full' },
      { name: 'Indicateurs KPI multi-seuils', covered: 'full' },
    ]
  },
  {
    code: 'E1', label: 'Changement climatique', category: 'Environnement',
    color: 'bg-green-100 text-green-700', dot: 'bg-green-500',
    items: [
      { name: 'Émissions GES Scope 1/2/3 (tCO₂e)', covered: 'full' },
      { name: 'Intensité carbone & objectifs de réduction', covered: 'full' },
      { name: 'Scénarios climatiques (TCFD)', covered: 'full' },
      { name: 'Plan de transition & SBTi pre-flight', covered: 'full' },
      { name: 'Risques physiques & de transition', covered: 'full' },
    ]
  },
  {
    code: 'E2', label: 'Pollution', category: 'Environnement',
    color: 'bg-green-100 text-green-700', dot: 'bg-green-500',
    items: [
      { name: 'Émissions polluantes (air, eau, sol)', covered: 'partial' },
      { name: 'Substances préoccupantes', covered: 'partial' },
    ]
  },
  {
    code: 'E3', label: 'Eau et ressources marines', category: 'Environnement',
    color: 'bg-green-100 text-green-700', dot: 'bg-green-500',
    items: [
      { name: 'Consommation d\'eau & stress hydrique', covered: 'partial' },
      { name: 'Rejets aquatiques', covered: 'planned' },
    ]
  },
  {
    code: 'E4', label: 'Biodiversité & écosystèmes', category: 'Environnement',
    color: 'bg-green-100 text-green-700', dot: 'bg-green-500',
    items: [
      { name: 'Impacts sur la biodiversité', covered: 'planned' },
      { name: 'Sites Natura 2000 & zones sensibles', covered: 'planned' },
    ]
  },
  {
    code: 'E5', label: 'Économie circulaire', category: 'Environnement',
    color: 'bg-green-100 text-green-700', dot: 'bg-green-500',
    items: [
      { name: 'Flux de ressources & déchets', covered: 'partial' },
      { name: 'Analyse du cycle de vie (ACV)', covered: 'full' },
    ]
  },
  {
    code: 'S1', label: 'Effectifs propres', category: 'Social',
    color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500',
    items: [
      { name: 'Effectifs, turnover, parité', covered: 'full' },
      { name: 'Formation & développement RH', covered: 'full' },
      { name: 'Santé, sécurité au travail', covered: 'full' },
      { name: 'Rémunérations & écarts de salaire', covered: 'partial' },
    ]
  },
  {
    code: 'S2', label: 'Chaîne de valeur', category: 'Social',
    color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500',
    items: [
      { name: 'Audits sociaux fournisseurs', covered: 'full' },
      { name: 'Devoir de vigilance CSDDD', covered: 'full' },
    ]
  },
  {
    code: 'S3', label: 'Communautés affectées', category: 'Social',
    color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500',
    items: [
      { name: 'Impacts sur les communautés locales', covered: 'partial' },
    ]
  },
  {
    code: 'S4', label: 'Consommateurs & utilisateurs', category: 'Social',
    color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500',
    items: [
      { name: 'Protection des données (RGPD)', covered: 'full' },
      { name: 'Sécurité des produits & services', covered: 'partial' },
    ]
  },
  {
    code: 'G1', label: 'Gouvernance d\'entreprise', category: 'Gouvernance',
    color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500',
    items: [
      { name: 'Éthique & anti-corruption', covered: 'full' },
      { name: 'Structure de gouvernance & organes dirigeants', covered: 'full' },
      { name: 'Délais de paiement fournisseurs', covered: 'full' },
      { name: 'Lobbying & contributions politiques', covered: 'partial' },
    ]
  },
];

const FRAMEWORKS = [
  { name: 'CSRD / ESRS', desc: 'Directive européenne reporting durabilité', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', status: 'Couvert' },
  { name: 'VSME (EFRAG)', desc: 'Norme volontaire PME — template Module de Base B1–B11 inclus', icon: FileText, color: 'text-lime-600', bg: 'bg-lime-50', status: 'Couvert' },
  { name: 'GHG Protocol', desc: 'Scopes 1, 2 et 3 complets', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50', status: 'Couvert' },
  { name: 'Taxonomie UE', desc: 'Alignement activités durables', icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50', status: 'Couvert' },
  { name: 'SFDR', desc: 'Finance durable & PAI indicators', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50', status: 'Couvert' },
  { name: 'SBTi', desc: 'Science Based Targets pre-flight', icon: Award, color: 'text-orange-600', bg: 'bg-orange-50', status: 'Couvert' },
  { name: 'BEGES', desc: 'Bilan GES réglementaire France', icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', status: 'Couvert' },
  { name: 'CSDDD', desc: 'Devoir de vigilance supply chain', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', status: 'Couvert' },
  { name: 'iXBRL EFRAG', desc: 'Balisage électronique CSRD Art. 8', icon: Database, color: 'text-gray-600', bg: 'bg-gray-50', status: 'Couvert' },
  { name: 'GRI', desc: '46 indicateurs ESRS mappés vers 24 séries GRI (201→418)', icon: FileText, color: 'text-yellow-600', bg: 'bg-yellow-50', status: 'Couvert' },
  { name: 'CDP', desc: 'Carbon Disclosure Project', icon: Leaf, color: 'text-sky-600', bg: 'bg-sky-50', status: 'Couvert' },
  { name: 'TCFD', desc: 'Task Force Climate-related Disclosures', icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50', status: 'Couvert' },
  { name: 'B Corp', desc: 'Certification entreprise à mission', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', status: 'Couvert' },
];

const SECURITY = [
  { label: 'Hébergement France (IONOS)', icon: ShieldCheck },
  { label: 'Chiffrement TLS 1.3 en transit', icon: Lock },
  { label: 'Données chiffrées au repos (AES-256)', icon: Database },
  { label: 'Multi-tenancy avec isolation complète', icon: Building2 },
  { label: 'Audit trail SHA-256 (immuable)', icon: FileText },
  { label: 'RGPD Art. 30 — registre traitements', icon: ShieldCheck },
  { label: 'Rate limiting & protection DDoS', icon: Lock },
  { label: 'Authentification SSO / MFA-ready', icon: Users },
];

const FAQS = [
  {
    q: "ESG Flow est-il conforme à la CSRD ?",
    a: "ESG Flow est un outil qui vous aide à être conforme à la CSRD. Il implémente nativement les exigences ESRS sur les mandatory disclosures (E1 à G1), génère les rapports de durabilité avec balisage iXBRL EFRAG 2024 et maintient une piste d'audit certifiable. La conformité CSRD reste une démarche d'entreprise — ESG Flow fournit l'infrastructure technologique pour y parvenir."
  },
  {
    q: "Proposez-vous la norme VSME pour les PME non cotées ?",
    a: "Oui. ESG Flow inclut un template prêt à l'emploi aligné sur la norme volontaire VSME publiée par l'EFRAG (décembre 2024) : les 11 exigences du Module de Base (B1 à B11) sont pré-structurées — énergie & GES, pollution, biodiversité, eau, déchets, effectifs, santé-sécurité, rémunération & formation, corruption. Appliquez le template, ajustez les valeurs à votre réalité, et exportez un rapport VSME répondant aux demandes de vos banques et donneurs d'ordre soumis à la CSRD."
  },
  {
    q: "Quelle est votre couverture GRI ?",
    a: "ESG Flow mappe automatiquement 46 indicateurs ESRS vers les standards GRI — 24 séries couvertes, des standards économiques (GRI 201, 202, 207) aux séries environnementales (301 à 308) et sociales (401 à 418), en passant par les standards universels (GRI 2). Vous saisissez vos données une fois, le tableau de correspondance GRI/CDP/TCFD/SDG se remplit automatiquement."
  },
  {
    q: "Quels ESRS sont couverts à 100% ?",
    a: "Les mandatory disclosures des standards E1 (Climat), S1 (Effectifs), S2 (Chaîne de valeur), S4 (Consommateurs), G1 (Gouvernance) et ESRS 2 (Informations générales) sont entièrement couverts. E2, E3, S3 sont partiellement couverts. E4 (Biodiversité) est en roadmap 2026."
  },
  {
    q: "L'iXBRL généré est-il valide pour le dépôt réglementaire ?",
    a: "ESG Flow génère des fichiers iXBRL conformes au namespace EFRAG 2024-12-31 (esrs_cor). Pour un dépôt réglementaire officiel, nous recommandons une validation via Arelle (outil EFRAG). ESG Flow couvre les mandatory disclosures les plus couramment requis — une validation complète XSD reste la responsabilité de votre auditeur externe."
  },
  {
    q: "Mes données sont-elles hébergées en France ?",
    a: "Oui. ESG Flow est hébergé exclusivement sur des serveurs IONOS situés en France (région Europe). Vos données ESG ne quittent jamais le territoire européen. L'architecture est conforme au RGPD avec isolation totale entre clients (multi-tenancy)."
  },
  {
    q: "Puis-je exporter mes données pour un auditeur externe ?",
    a: "Oui. ESG Flow permet d'exporter la piste d'audit complète en PDF (avec empreintes SHA-256), les données ESG en CSV/Excel, et les rapports en format iXBRL et PDF. Un accès auditeur en lecture seule peut être accordé directement depuis la plateforme."
  },
];

/* ─── Helpers ──────────────────────────────────────────────────────── */
function CoveredBadge({ status }: { status: string }) {
  if (status === 'full') return (
    <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
      <CheckCircle className="h-3.5 w-3.5" /> Couvert
    </span>
  );
  if (status === 'partial') return (
    <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
      <AlertCircle className="h-3.5 w-3.5" /> Partiel
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-gray-400 text-xs font-medium">
      <XCircle className="h-3.5 w-3.5" /> Roadmap
    </span>
  );
}

/* ─── Composant principal ──────────────────────────────────────────── */
export default function StandardsPage() {
  usePageSeo({
    id: 'normes',
    title: 'Normes & Conformité CSRD — ESG Flow',
    description: 'Découvrez quels standards ESRS (E1-G1), frameworks (GHG Protocol, SBTi, SFDR, Taxonomie UE) et exigences de sécurité sont couverts nativement par ESG Flow.',
    url: 'https://greenconnect.cloud/normes',
    robots: 'index,follow',
    keywords: 'CSRD conformité, ESRS E1 E2 S1 G1, double matérialité, iXBRL EFRAG, GHG Protocol, SBTi, Taxonomie UE, SFDR, BEGES, CSDDD, VSME EFRAG norme volontaire PME, GRI mapping',
    breadcrumb: [
      { name: 'Accueil', url: 'https://greenconnect.cloud/' },
      { name: 'Normes & Conformité', url: 'https://greenconnect.cloud/normes' },
    ],
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [expandedStandard, setExpandedStandard] = useState<string | null>('E1');

  const fullCount = ESRS_STANDARDS.flatMap(s => s.items).filter(i => i.covered === 'full').length;
  const totalCount = ESRS_STANDARDS.flatMap(s => s.items).length;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav légère ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-esgflow-v4.svg" alt="ESG Flow" className="h-7 w-7" />
            <span className="font-semibold text-gray-900">ESG Flow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/demo" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Démo</Link>
            <Link to="/register" className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 text-green-300 text-sm font-medium mb-6">
            <ShieldCheck className="h-4 w-4" />
            Transparence totale sur notre couverture normative
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Normes & Conformité CSRD
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Voici exactement ce que couvre ESG Flow — sans marketing. Standards ESRS, frameworks, sécurité et ce qui est encore en roadmap.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-3xl font-bold text-green-400">{fullCount}/{totalCount}</div>
              <div className="text-sm text-gray-300 mt-1">Points de données couverts</div>
            </div>
            <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-3xl font-bold text-green-400">11</div>
              <div className="text-sm text-gray-300 mt-1">Standards ESRS adressés</div>
            </div>
            <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-3xl font-bold text-green-400">12</div>
              <div className="text-sm text-gray-300 mt-1">Frameworks supportés</div>
            </div>
            <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-3xl font-bold text-green-400">🇫🇷</div>
              <div className="text-sm text-gray-300 mt-1">Hébergé en France</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Essai 14 jours gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors border border-white/20">
              Demander une démo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Légende ────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200 py-3 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 text-sm">
          <span className="flex items-center gap-1.5 text-green-700"><CheckCircle className="h-4 w-4" /> Couvert — implémenté et en production</span>
          <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="h-4 w-4" /> Partiel — fonctionnel, enrichissement en cours</span>
          <span className="flex items-center gap-1.5 text-gray-400"><XCircle className="h-4 w-4" /> Roadmap — prévu H2 2026</span>
        </div>
      </div>

      {/* ── Couverture ESRS ────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Couverture ESRS détaillée</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Cliquez sur un standard pour voir le détail des points de données couverts.</p>
          </div>

          <div className="space-y-3">
            {ESRS_STANDARDS.map(std => {
              const isOpen = expandedStandard === std.code;
              const fullItems = std.items.filter(i => i.covered === 'full').length;
              return (
                <div key={std.code} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedStandard(isOpen ? null : std.code)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${std.color}`}>
                        {std.code}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">{std.label}</div>
                        <div className="text-xs text-gray-500">{std.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Progress bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${(fullItems / std.items.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">{fullItems}/{std.items.length}</span>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <div className="grid sm:grid-cols-2 gap-2">
                        {std.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                            <span className="text-sm text-gray-700">{item.name}</span>
                            <CoveredBadge status={item.covered} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Frameworks ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Frameworks & référentiels supportés</h2>
            <p className="text-gray-500">Au-delà de la CSRD, ESG Flow couvre les principaux référentiels ESG internationaux.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FRAMEWORKS.map(fw => (
              <div key={fw.name} className={`${fw.bg} rounded-xl p-4 border border-gray-100`}>
                <div className="flex items-start gap-3">
                  <fw.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${fw.color}`} />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{fw.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{fw.desc}</div>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle className="h-3 w-3" /> {fw.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité & Hébergement ─────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Sécurité & Hébergement</h2>
              <p className="text-gray-500 mb-8">
                Vos données ESG sont sensibles. ESG Flow est conçu avec une sécurité de niveau enterprise, hébergé exclusivement en France et conforme au RGPD.
              </p>
              <div className="space-y-3">
                {SECURITY.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <s.icon className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
              <div className="text-sm text-gray-400 mb-1">Architecture multi-tenant</div>
              <h3 className="text-xl font-bold mb-6">Isolation totale des données</h3>
              {[
                { label: 'Client A', color: 'bg-green-500' },
                { label: 'Client B', color: 'bg-blue-500' },
                { label: 'Client C', color: 'bg-purple-500' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className={`h-2 w-2 rounded-full ${c.color}`} />
                  <div className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm">{c.label} — tenant_id isolé</div>
                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                </div>
              ))}
              <div className="mt-6 pt-6 border-t border-white/10 text-xs text-gray-400">
                Chaque client accède uniquement à ses propres données. Aucune fuite inter-tenant possible au niveau applicatif ET base de données.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-4" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-4" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à commencer votre conformité CSRD ?</h2>
          <p className="text-green-100 mb-8 text-lg">
            14 jours gratuits, sans carte bancaire. Accès complet à tous les modules.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-sm">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
              Parler à un expert
            </Link>
          </div>
          <p className="mt-6 text-green-200 text-xs">
            Hébergé en France · Conforme RGPD · Support en français
          </p>
        </div>
      </section>

    </div>
  );
}
