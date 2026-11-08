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
      description={t('features.decarbonation.description', "Construisez votre plan de décarbonation à partir d'une trajectoire de référence 1.5°C : catalogue d'actions avec ROI estimé, scénarios prédéfinis et suivi jusqu'en 2050. La validation des objectifs relève du SBTi.")}
      frameworks={['SBTi', 'Net Zero Standard', 'GHG Protocol', 'Accord de Paris']}
      appPath="/app/decarbonation"
      benefits={[
        {
          icon: Target,
          title: t('features.decarbonation.benefits.0.title', "Trajectoire SBTi 1.5°C"),
          description: t('features.decarbonation.benefits.0.description', "Comparez votre plan à une trajectoire de référence alignée sur un scénario 1.5°C (-42 % en 2030 par rapport à l'année de base). Le plan n'est pas une validation SBTi."),
        },
        {
          icon: Zap,
          title: t('features.decarbonation.benefits.1.title', "Catalogue d'actions"),
          description: t('features.decarbonation.benefits.1.description', "Un catalogue d'une trentaine de leviers de décarbonation avec potentiel de réduction, coût, ROI et difficulté estimés. Ce sont des ordres de grandeur à adapter à votre situation."),
        },
        {
          icon: BarChart3,
          title: t('features.decarbonation.benefits.2.title', "Scénarios what-if"),
          description: t('features.decarbonation.benefits.2.description', "Composez votre plan en sélectionnant des actions et en appliquant des scénarios prédéfinis (gains rapides, objectif -42 %, Net Zero) pour voir l'effet sur votre trajectoire."),
        },
        {
          icon: TrendingDown,
          title: t('features.decarbonation.benefits.3.title', "Suivi du plan"),
          description: t('features.decarbonation.benefits.3.description', "Suivez l'avancement de chaque action (à faire, en cours, terminé) et comparez vos émissions enregistrées à la trajectoire de référence."),
        },
      ]}
      capabilities={[
        { title: t('features.decarbonation.capabilities.0.title', "Graphique trajectoire 2024–2050"), description: t('features.decarbonation.capabilities.0.description', "Visualisez votre trajectoire de référence, votre scénario sans action et l'effet de votre plan, jusqu'en 2050.") },
        { title: t('features.decarbonation.capabilities.1.title', "Actions par scope et catégorie"), description: t('features.decarbonation.capabilities.1.description', "Chaque action est rattachée à un scope (1, 2 ou 3) et une catégorie d'émission, avec une estimation de son impact.") },
        { title: t('features.decarbonation.capabilities.2.title', "Calcul ROI par action"), description: t('features.decarbonation.capabilities.2.description', "Estimation du retour sur investissement de chaque levier : investissement initial, économies annuelles, temps de retour et tonnes CO2e évitées.") },
        { title: t('features.decarbonation.capabilities.3.title', "Scénarios prédéfinis"), description: t('features.decarbonation.capabilities.3.description', "Appliquez l'un des scénarios prédéfinis (gains rapides, objectif -42 %, Net Zero) pour pré-sélectionner des actions. Les scénarios ne sont pas personnalisables.") },
        { title: t('features.decarbonation.capabilities.4.title', "Intégration Bilan Carbone"), description: t('features.decarbonation.capabilities.4.description', "Le plan part de vos émissions enregistrées dans le Bilan carbone ; sans données, la trajectoire reste indisponible.") },
        { title: t('features.decarbonation.capabilities.5.title', "Suivi d'engagement SBTi"), description: t('features.decarbonation.capabilities.5.description', "Suivez l'étape de votre démarche SBTi (engagement, objectifs définis, validation). La validation elle-même est faite par le SBTi.") },
        { title: t('features.decarbonation.capabilities.6.title', "Export plan de décarbonation"), description: t('features.decarbonation.capabilities.6.description', "Exportez votre plan en PDF avec actions et budget estimé, comme base de travail pour votre plan de transition (ESRS E1).") },
      ]}
      steps={[
        { step: 1, title: t('features.decarbonation.steps.0.title', "Définissez votre année de référence"), description: t('features.decarbonation.steps.0.description', "Sélectionnez votre année de base et validez votre bilan carbone de référence (Scope 1, 2 et 3 pertinents).") },
        { step: 2, title: t('features.decarbonation.steps.1.title', "Construisez votre trajectoire"), description: t('features.decarbonation.steps.1.description', "Choisissez vos actions de réduction, simulez les scénarios et définissez vos jalons intermédiaires alignés SBTi.") },
        { step: 3, title: t('features.decarbonation.steps.2.title', "Pilotez et ajustez"), description: t('features.decarbonation.steps.2.description', "Suivez vos émissions réelles vs la trajectoire cible. Ajustez vos actions et recalibrez votre plan chaque année.") },
      ]}
      faqs={[
        { question: t('features.decarbonation.faqs.0.question', "Qu'est-ce que le SBTi et pourquoi s'y conformer ?"), answer: t('features.decarbonation.faqs.0.answer', "Le Science Based Targets initiative (SBTi) est un cadre international qui valide que les objectifs de réduction d'émissions d'une entreprise sont alignés sur la science climatique (1.5°C ou bien en dessous de 2°C). S'y conformer renforce la crédibilité climatique auprès des investisseurs, clients et régulateurs.") },
        { question: t('features.decarbonation.faqs.1.question', "Dois-je avoir un bilan carbone avant de créer mon plan ?"), answer: t('features.decarbonation.faqs.1.answer', "Oui. Le plan de décarbonation nécessite une année de référence avec un bilan carbone complet (au minimum Scope 1 et 2, idéalement Scope 3). ESGFlow vous permet de réaliser votre bilan carbone et d'enchaîner directement avec le plan de décarbonation.") },
        { question: t('features.decarbonation.faqs.2.question', "Les actions du catalogue sont-elles personnalisables ?"), answer: t('features.decarbonation.faqs.2.answer', "Le catalogue d'une trentaine d'actions couvre les leviers courants (efficacité énergétique, énergies renouvelables, mobilité, achats responsables...). Les chiffres sont des estimations génériques à adapter à votre contexte.") },
        { question: t('features.decarbonation.faqs.3.question', "Le plan est-il compatible avec le reporting CSRD ?"), answer: t('features.decarbonation.faqs.3.answer', "Le plan peut alimenter la réflexion sur le plan de transition de l'ESRS E1 (objectifs, actions, budget), mais il ne suffit pas à lui seul à couvrir les exigences de l'ESRS E1.") },
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
