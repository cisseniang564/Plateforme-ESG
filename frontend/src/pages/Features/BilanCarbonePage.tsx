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
      description={t('features.bilanCarbone.description', "Mesurez vos émissions de gaz à effet de serre sur les 3 scopes du GHG Protocol. ESG Flow intègre nativement les facteurs d'émission ADEME Base Carbone et couvre les 15 catégories du Scope 3 pour un bilan carbone réglementaire et auditable.")}
      frameworks={['GHG Protocol', 'ADEME Base Carbone', 'ISO 14064']}
      appPath="/app/carbon"
      benefits={[
        {
          icon: Database,
          title: t('features.bilanCarbone.benefits.0.title', "Facteurs ADEME intégrés"),
          description: t('features.bilanCarbone.benefits.0.description', "Plus de 600 facteurs d'émission de la Base Carbone ADEME mis à jour automatiquement. Aucune saisie manuelle des coefficients."),
        },
        {
          icon: BarChart3,
          title: t('features.bilanCarbone.benefits.1.title', "15 catégories Scope 3"),
          description: t('features.bilanCarbone.benefits.1.description', "Couverture complète des émissions indirectes : achats, fret, déplacements, déchets, immobilisations, fin de vie des produits vendus, et plus."),
        },
        {
          icon: TrendingDown,
          title: t('features.bilanCarbone.benefits.2.title', "Benchmarks sectoriels"),
          description: t('features.bilanCarbone.benefits.2.description', "Comparez vos émissions aux moyennes de votre secteur d'activité grâce aux données ADEME, CDP et MSCI. Identifiez vos écarts."),
        },
        {
          icon: Zap,
          title: t('features.bilanCarbone.benefits.3.title', "Import automatique"),
          description: t('features.bilanCarbone.benefits.3.description', "Connectez vos factures d'énergie (Enedis, EDF), vos données comptables (FEC) et vos ERP pour un calcul automatisé sans ressaisie."),
        },
      ]}
      capabilities={[
        { title: t('features.bilanCarbone.capabilities.0.title', "Scope 1 — Émissions directes"), description: t('features.bilanCarbone.capabilities.0.description', "Combustion de combustibles fossiles, fuites de fluides frigorigènes, émissions de procédés industriels. Saisie guidée par type de source.") },
        { title: t('features.bilanCarbone.capabilities.1.title', "Scope 2 — Électricité & chaleur"), description: t('features.bilanCarbone.capabilities.1.description', "Calcul location-based et market-based selon le GHG Protocol Scope 2 Guidance. Facteurs réseau France et UE.") },
        { title: t('features.bilanCarbone.capabilities.2.title', "Scope 3 — 15 catégories"), description: t('features.bilanCarbone.capabilities.2.description', "Achats de biens et services, fret amont/aval, déplacements domicile-travail, déchets, immobilisations, utilisation et fin de vie des produits vendus.") },
        { title: t('features.bilanCarbone.capabilities.3.title', "Import FEC comptable"), description: t('features.bilanCarbone.capabilities.3.description', "Importez votre Fichier des Écritures Comptables (FEC) et calculez automatiquement vos émissions Scope 3 catégories 1-2 à partir de vos postes de charges.") },
        { title: t('features.bilanCarbone.capabilities.4.title', "Graphiques interactifs"), description: t('features.bilanCarbone.capabilities.4.description', "Visualisez la répartition de vos émissions par scope, catégorie, site et période. Évolution temporelle et comparaison N/N-1.") },
        { title: t('features.bilanCarbone.capabilities.5.title', "Export réglementaire"), description: t('features.bilanCarbone.capabilities.5.description', "Générez votre bilan GES réglementaire au format ADEME (Art. L.229-25 du Code de l'environnement) en PDF prêt pour publication.") },
        { title: t('features.bilanCarbone.capabilities.6.title', "Facteurs personnalisés"), description: t('features.bilanCarbone.capabilities.6.description', "Ajoutez vos propres facteurs d'émission spécifiques (données fournisseurs, analyses de cycle de vie) en complément de la base ADEME.") },
        { title: t('features.bilanCarbone.capabilities.7.title', "Données traçables"), description: t('features.bilanCarbone.capabilities.7.description', "Chaque donnée est tracée avec sa source, sa méthode de calcul et son facteur d'émission. Journal d'audit détaillé pour faciliter vos revues auditeurs.") },
      ]}
      steps={[
        { step: 1, title: t('features.bilanCarbone.steps.0.title', "Connectez vos sources"), description: t('features.bilanCarbone.steps.0.description', "Reliez vos factures d'énergie, données RH, comptabilité et ERP. Ou importez un fichier CSV/Excel.") },
        { step: 2, title: t('features.bilanCarbone.steps.1.title', "Calculez automatiquement"), description: t('features.bilanCarbone.steps.1.description', "ESG Flow applique les facteurs ADEME et calcule vos émissions par scope, catégorie et site. Résultats en temps réel.") },
        { step: 3, title: t('features.bilanCarbone.steps.2.title', "Analysez et réduisez"), description: t('features.bilanCarbone.steps.2.description', "Identifiez vos hotspots d'émissions, comparez au secteur et passez au plan de décarbonation SBTi.") },
      ]}
      faqs={[
        { question: t('features.bilanCarbone.faqs.0.question', "Quels facteurs d'émission sont inclus ?"), answer: t('features.bilanCarbone.faqs.0.answer', "ESG Flow intègre nativement la Base Carbone ADEME (v23.0) avec plus de 600 facteurs couvrant l'énergie, les transports, les matériaux, l'alimentation et les services. Les facteurs sont mis à jour automatiquement lors des nouvelles publications ADEME.") },
        { question: t('features.bilanCarbone.faqs.1.question', "Le bilan carbone est-il conforme à la réglementation française ?"), answer: t('features.bilanCarbone.faqs.1.answer', "Oui. Le bilan produit par ESG Flow est conforme à l'article L.229-25 du Code de l'environnement (bilan GES réglementaire), au GHG Protocol Corporate Standard et à la norme ISO 14064-1. Il est accepté par l'ADEME pour publication sur la plateforme Bilans GES.") },
        { question: t('features.bilanCarbone.faqs.2.question', "Puis-je importer mes données comptables pour le Scope 3 ?"), answer: t('features.bilanCarbone.faqs.2.answer', "Oui. ESG Flow peut importer votre Fichier des Écritures Comptables (FEC) et convertir automatiquement vos postes de charges en émissions Scope 3 catégories 1 (achats) et 2 (immobilisations) grâce à la méthode monétaire ADEME.") },
        { question: t('features.bilanCarbone.faqs.3.question', "Comment se compare ESG Flow aux outils comme Greenly ou Sweep ?"), answer: t('features.bilanCarbone.faqs.3.answer', "ESG Flow couvre les 3 scopes avec 15 catégories Scope 3, là où Greenly se concentre sur le carbone uniquement et Sweep sur les grandes entreprises. Notre avantage : le bilan carbone est intégré à une plateforme ESG complète (CSRD, supply chain, taxonomie UE) dès 249 €/mois.") },
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
