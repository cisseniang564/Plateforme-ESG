import { FlameKindling, TrendingDown, Target, Zap, BarChart3, Flame, Truck, FileText, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function DecarbonationPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={FlameKindling}
      color="#059669"
      colorLight="#ecfdf5"
      title={t('features.decarbonation.title', "Plan de Décarbonation SBTi")}
      subtitle={t('features.decarbonation.subtitle', "Construisez votre trajectoire Net Zero alignée Science Based Targets")}
      description={t('features.decarbonation.description', "Définissez et pilotez votre stratégie de décarbonation avec une trajectoire 1.5°C validable SBTi. 24 actions pré-configurées avec ROI, scénarios what-if interactifs et suivi de progression 2024–2050 pour atteindre le Net Zero.")}
      frameworks={['SBTi', 'Net Zero Standard', 'GHG Protocol', 'Accord de Paris']}
      appPath="/app/decarbonation"
      benefits={[
        {
          icon: Target,
          title: t('features.decarbonation.benefits.0.title', "Trajectoire SBTi 1.5°C"),
          description: t('features.decarbonation.benefits.0.description', "Modélisez votre trajectoire de réduction alignée sur le scénario 1.5°C du SBTi. Objectifs court terme (2030) et long terme (Net Zero 2050)."),
        },
        {
          icon: Zap,
          title: t('features.decarbonation.benefits.1.title', "24 actions pré-configurées"),
          description: t('features.decarbonation.benefits.1.description', "Bibliothèque de 24 leviers de décarbonation avec estimation du potentiel de réduction, coût, ROI et délai de mise en oeuvre par secteur."),
        },
        {
          icon: BarChart3,
          title: t('features.decarbonation.benefits.2.title', "Scénarios what-if"),
          description: t('features.decarbonation.benefits.2.description', "Simulez l'impact de différentes combinaisons d'actions sur votre trajectoire. Comparez les scénarios et identifiez le mix optimal coût/réduction."),
        },
        {
          icon: TrendingDown,
          title: t('features.decarbonation.benefits.3.title', "Suivi de progression"),
          description: t('features.decarbonation.benefits.3.description', "Tableau de bord de suivi temps réel : émissions réelles vs trajectoire cible, écarts, alertes de déviation et recommandations correctives."),
        },
      ]}
      capabilities={[
        { title: t('features.decarbonation.capabilities.0.title', "Graphique trajectoire 2024–2050"), description: t('features.decarbonation.capabilities.0.description', "Visualisez votre courbe de réduction avec jalons intermédiaires, zone de conformité SBTi et comparaison aux trajectoires sectorielles.") },
        { title: t('features.decarbonation.capabilities.1.title', "Actions par scope et catégorie"), description: t('features.decarbonation.capabilities.1.description', "Chaque action est rattachée à un scope (1, 2 ou 3) et une catégorie d'émission. Priorisation automatique par potentiel de réduction et facilité de mise en oeuvre.") },
        { title: t('features.decarbonation.capabilities.2.title', "Calcul ROI par action"), description: t('features.decarbonation.capabilities.2.description', "Estimation du retour sur investissement de chaque levier : investissement initial, économies annuelles, temps de retour et tonnes CO2e évitées.") },
        { title: t('features.decarbonation.capabilities.3.title', "Scénarios comparatifs"), description: t('features.decarbonation.capabilities.3.description', "Créez jusqu'à 5 scénarios de décarbonation avec des hypothèses différentes. Matrice de comparaison : coût total, réduction cumulée, alignement SBTi.") },
        { title: t('features.decarbonation.capabilities.4.title', "Intégration Bilan Carbone"), description: t('features.decarbonation.capabilities.4.description', "Votre plan de décarbonation s'alimente directement de votre bilan carbone ESG Flow. Les émissions de référence et le suivi annuel sont synchronisés automatiquement.") },
        { title: t('features.decarbonation.capabilities.5.title', "Objectifs SBTi validables"), description: t('features.decarbonation.capabilities.5.description', "Formatez vos objectifs selon les exigences du SBTi Target Validation Protocol : base year, périmètre, ambition, méthode de calcul (sectoral decarbonization approach ou absolute contraction).") },
        { title: t('features.decarbonation.capabilities.6.title', "Export plan de décarbonation"), description: t('features.decarbonation.capabilities.6.description', "Exportez votre plan complet en PDF avec graphiques, actions, budget et calendrier. Format compatible avec les exigences de reporting CSRD (ESRS E1).") },
      ]}
      steps={[
        { step: 1, title: t('features.decarbonation.steps.0.title', "Définissez votre année de référence"), description: t('features.decarbonation.steps.0.description', "Sélectionnez votre année de base et validez votre bilan carbone de référence (Scope 1, 2 et 3 pertinents).") },
        { step: 2, title: t('features.decarbonation.steps.1.title', "Construisez votre trajectoire"), description: t('features.decarbonation.steps.1.description', "Choisissez vos actions de réduction, simulez les scénarios et définissez vos jalons intermédiaires alignés SBTi.") },
        { step: 3, title: t('features.decarbonation.steps.2.title', "Pilotez et ajustez"), description: t('features.decarbonation.steps.2.description', "Suivez vos émissions réelles vs la trajectoire cible. Ajustez vos actions et recalibrez votre plan chaque année.") },
      ]}
      faqs={[
        { question: t('features.decarbonation.faqs.0.question', "Qu'est-ce que le SBTi et pourquoi s'y conformer ?"), answer: t('features.decarbonation.faqs.0.answer', "Le Science Based Targets initiative (SBTi) est un cadre international qui valide que les objectifs de réduction d'émissions d'une entreprise sont alignés sur la science climatique (1.5°C ou bien en dessous de 2°C). S'y conformer renforce la crédibilité climatique auprès des investisseurs, clients et régulateurs.") },
        { question: t('features.decarbonation.faqs.1.question', "Dois-je avoir un bilan carbone avant de créer mon plan ?"), answer: t('features.decarbonation.faqs.1.answer', "Oui. Le plan de décarbonation nécessite une année de référence avec un bilan carbone complet (au minimum Scope 1 et 2, idéalement Scope 3). ESG Flow vous permet de réaliser votre bilan carbone et d'enchaîner directement avec le plan de décarbonation.") },
        { question: t('features.decarbonation.faqs.2.question', "Les 24 actions sont-elles personnalisables ?"), answer: t('features.decarbonation.faqs.2.answer', "Oui. Les 24 actions pré-configurées couvrent les leviers les plus courants (efficacité énergétique, ENR, mobilité, achats responsables...). Vous pouvez les personnaliser (potentiel, coût, calendrier) et ajouter vos propres actions spécifiques.") },
        { question: t('features.decarbonation.faqs.3.question', "Le plan est-il compatible avec le reporting CSRD ?"), answer: t('features.decarbonation.faqs.3.answer', "Oui. Le plan de décarbonation ESG Flow couvre les exigences de l'ESRS E1 (Climate change) en matière de plan de transition : objectifs de réduction, actions, investissements et calendrier. Les données sont exportables pour votre rapport CSRD.") },
      ]}
      relatedModules={[
        { name: t('features.decarbonation.related.0.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.decarbonation.related.1.name', "Supply Chain ESG"), path: '/features/supply-chain', icon: Truck, color: '#2563eb' },
        { name: t('features.decarbonation.related.2.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.decarbonation.related.3.name', "Analyse Cycle de Vie"), path: '/app/lca', icon: Leaf, color: '#059669' },
      ]}
    />
  );
}
