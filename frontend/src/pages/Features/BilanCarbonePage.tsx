import { Flame, TrendingDown, Database, BarChart3, Zap, Truck, FlameKindling, FileText, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function BilanCarbonePage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Flame}
      color="#ea580c"
      colorLight="#fff7ed"
      title={t('features.bilanCarbone.title', "Bilan Carbone Scope 1, 2 & 3")}
      subtitle={t('features.bilanCarbone.subtitle', "Calculez l'empreinte carbone complète de votre entreprise avec les facteurs ADEME")}
      description={t('features.bilanCarbone.description', "Mesurez vos émissions de gaz à effet de serre sur les 3 scopes du GHG Protocol, avec les facteurs ADEME Base Carbone et les 15 catégories du Scope 3. Un export BEGES au format ADEME est disponible ; les résultats restent à relire avant tout dépôt.")}
      frameworks={['GHG Protocol', 'ADEME Base Carbone']}
      appPath="/app/carbon"
      benefits={[
        {
          icon: Database,
          title: t('features.bilanCarbone.benefits.0.title', "Facteurs d'émission ADEME"),
          description: t('features.bilanCarbone.benefits.0.description', "Une cinquantaine de facteurs d'émission issus de la Base Carbone ADEME (v23) pour le Scope 3 et les trajets domicile-travail. Vous pouvez saisir vos propres données d'activité."),
        },
        {
          icon: BarChart3,
          title: t('features.bilanCarbone.benefits.1.title', "15 catégories Scope 3"),
          description: t('features.bilanCarbone.benefits.1.description', "Couverture complète des émissions indirectes : achats, fret, déplacements, déchets, immobilisations, fin de vie des produits vendus, et plus."),
        },
        {
          icon: TrendingDown,
          title: t('features.bilanCarbone.benefits.2.title', "Benchmarks sectoriels"),
          description: t('features.bilanCarbone.benefits.2.description', "Comparez vos émissions à des références sectorielles publiques (ADEME, CDP, MSCI) ou, quand la cohorte est suffisante, aux autres organisations de la plateforme."),
        },
        {
          icon: Zap,
          title: t('features.bilanCarbone.benefits.3.title', "Imports de données"),
          description: t('features.bilanCarbone.benefits.3.description', "Importez vos consommations Enedis (CSV), votre FEC comptable ou vos fichiers CSV/Excel pour limiter la ressaisie. D'autres connecteurs sont en préparation."),
        },
      ]}
      capabilities={[
        { title: t('features.bilanCarbone.capabilities.0.title', "Scope 1 — Émissions directes"), description: t('features.bilanCarbone.capabilities.0.description', "Combustion de combustibles fossiles, fuites de fluides frigorigènes, émissions de procédés industriels. Saisie guidée par type de source.") },
        { title: t('features.bilanCarbone.capabilities.1.title', "Scope 2 — Électricité & chaleur"), description: t('features.bilanCarbone.capabilities.1.description', "Calcul location-based et market-based selon le GHG Protocol Scope 2 Guidance. Facteurs réseau France et UE.") },
        { title: t('features.bilanCarbone.capabilities.2.title', "Scope 3 — 15 catégories"), description: t('features.bilanCarbone.capabilities.2.description', "Achats de biens et services, fret amont/aval, déplacements domicile-travail, déchets, immobilisations, utilisation et fin de vie des produits vendus.") },
        { title: t('features.bilanCarbone.capabilities.3.title', "Import FEC comptable"), description: t('features.bilanCarbone.capabilities.3.description', "Importez votre Fichier des Écritures Comptables (FEC) : les comptes de charges sont convertis en estimations d'émissions par méthode monétaire, à relire avant usage.") },
        { title: t('features.bilanCarbone.capabilities.4.title', "Graphiques interactifs"), description: t('features.bilanCarbone.capabilities.4.description', "Visualisez la répartition de vos émissions par scope, catégorie, site et période. Évolution temporelle et comparaison N/N-1.") },
        { title: t('features.bilanCarbone.capabilities.5.title', "Export BEGES (.xlsx)"), description: t('features.bilanCarbone.capabilities.5.description', "Exportez un fichier BEGES.xlsx au format ADEME (Art. L.229-25 du Code de l'environnement) que vous déposez vous-même sur la plateforme de l'ADEME.") },
        { title: t('features.bilanCarbone.capabilities.6.title', "Données d'activité propres"), description: t('features.bilanCarbone.capabilities.6.description', "Saisissez vos données d'activité (consommations, dépenses, distances) par catégorie ; les facteurs d'émission restent ceux de la base intégrée.") },
        { title: t('features.bilanCarbone.capabilities.7.title', "Données traçables"), description: t('features.bilanCarbone.capabilities.7.description', "Chaque donnée est tracée avec sa source, sa méthode de calcul et son facteur d'émission. Journal d'audit détaillé pour faciliter vos revues auditeurs.") },
      ]}
      steps={[
        { step: 1, title: t('features.bilanCarbone.steps.0.title', "Connectez vos sources"), description: t('features.bilanCarbone.steps.0.description', "Reliez vos factures d'énergie, données RH, comptabilité et ERP. Ou importez un fichier CSV/Excel.") },
        { step: 2, title: t('features.bilanCarbone.steps.1.title', "Calculez automatiquement"), description: t('features.bilanCarbone.steps.1.description', "ESGFlow applique les facteurs ADEME et calcule vos émissions par scope, catégorie et site. Résultats en temps réel.") },
        { step: 3, title: t('features.bilanCarbone.steps.2.title', "Analysez et réduisez"), description: t('features.bilanCarbone.steps.2.description', "Identifiez vos hotspots d'émissions, comparez au secteur et passez au plan de décarbonation SBTi.") },
      ]}
      faqs={[
        { question: t('features.bilanCarbone.faqs.0.question', "Quels facteurs d'émission sont inclus ?"), answer: t('features.bilanCarbone.faqs.0.answer', "ESGFlow intègre une cinquantaine de facteurs issus de la Base Carbone ADEME (v23) pour le Scope 3 et les trajets domicile-travail. Ils sont mis à jour à chaque nouvelle version de la plateforme, pas automatiquement à chaque publication ADEME.") },
        { question: t('features.bilanCarbone.faqs.1.question', "Le bilan carbone est-il conforme à la réglementation française ?"), answer: t('features.bilanCarbone.faqs.1.answer', "La méthode suit le GHG Protocol Corporate Standard et l'export BEGES reprend le format ADEME (Art. L.229-25). ESGFlow n'est pas certifié ISO 14064-1 et ne dépose rien à votre place : le fichier est à relire et à déposer par vos soins.") },
        { question: t('features.bilanCarbone.faqs.2.question', "Puis-je importer mes données comptables pour le Scope 3 ?"), answer: t('features.bilanCarbone.faqs.2.answer', "Oui. Le FEC est converti en estimations d'émissions par méthode monétaire à partir du plan comptable. Ces estimations sont indicatives et à relire avant usage.") },
        { question: t('features.bilanCarbone.faqs.3.question', "Que couvre le bilan carbone d’ESGFlow ?"), answer: t('features.bilanCarbone.faqs.3.answer', "ESGFlow couvre les 3 scopes avec 15 catégories Scope 3. Le bilan carbone est intégré à la plateforme ESG (CSRD, supply chain, taxonomie UE), avec un plan payant dès 249 €/mois.") },
        { question: t('features.bilanCarbone.faqs.4.question', "Les données sont-elles auditables ?"), answer: t('features.bilanCarbone.faqs.4.answer', "Oui. Chaque calcul est tracé avec le facteur d'émission utilisé, la source de la donnée d'activité, la méthode de calcul et l'horodatage. Le journal d'audit porte une empreinte SHA-256 par entrée pour faciliter les revues de votre auditeur externe.") },
      ]}
      relatedModules={[
        { name: t('features.bilanCarbone.related.0.name', "Décarbonation SBTi"), path: '/features/decarbonation', icon: FlameKindling, color: '#059669' },
        { name: t('features.bilanCarbone.related.1.name', "Supply Chain ESG"), path: '/features/supply-chain', icon: Truck, color: '#2563eb' },
        { name: t('features.bilanCarbone.related.2.name', "Analyse Cycle de Vie"), path: '/app/lca', icon: Leaf, color: '#059669' },
        { name: t('features.bilanCarbone.related.3.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
      ]}
    />
  );
}
