import { Layers, CheckCircle, BarChart3, Shield, FileText, Target, Flame, FlameKindling } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function TaxonomieUEPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Layers}
      color="#0369a1"
      colorLight="#f0f9ff"
      title={t('features.taxonomieUe.title', "Taxonomie Européenne")}
      subtitle={t('features.taxonomieUe.subtitle', "Évaluez l'éligibilité et l'alignement de vos activités économiques")}
      description={t('features.taxonomieUe.description', "Analysez vos activités au regard des 6 objectifs environnementaux de la Taxonomie UE. Déterminez l'éligibilité, vérifiez les critères de contribution substantielle, les critères DNSH et les garanties minimales sociales pour calculer vos KPIs d'alignement (CA, CapEx, OpEx).")}
      frameworks={['Taxonomie UE', 'Règlement 2020/852', 'Actes délégués', 'CSRD Art. 8']}
      appPath="/app/taxonomy"
      benefits={[
        {
          icon: CheckCircle,
          title: t('features.taxonomieUe.benefits.0.title', "6 objectifs environnementaux"),
          description: t('features.taxonomieUe.benefits.0.description', "Couverture complète des 6 objectifs : atténuation du changement climatique, adaptation, eau, économie circulaire, pollution et biodiversité."),
        },
        {
          icon: BarChart3,
          title: t('features.taxonomieUe.benefits.1.title', "KPIs d'alignement"),
          description: t('features.taxonomieUe.benefits.1.description', "Calcul automatique des 3 KPIs réglementaires : pourcentage du chiffre d'affaires, des CapEx et des OpEx alignés avec la Taxonomie."),
        },
        {
          icon: Shield,
          title: t('features.taxonomieUe.benefits.2.title', "Vérification DNSH"),
          description: t('features.taxonomieUe.benefits.2.description', "Checklist guidée pour chaque critère Do No Significant Harm. Vérifiez que votre contribution à un objectif ne nuit pas aux 5 autres."),
        },
        {
          icon: FileText,
          title: t('features.taxonomieUe.benefits.3.title', "Rapport Art. 8 prêt"),
          description: t('features.taxonomieUe.benefits.3.description', "Générez les tableaux réglementaires de l'Article 8 du règlement Taxonomie avec les KPIs d'éligibilité et d'alignement, prêts pour publication."),
        },
      ]}
      capabilities={[
        { title: t('features.taxonomieUe.capabilities.0.title', "Classification des activités"), description: t('features.taxonomieUe.capabilities.0.description', "Identifiez vos activités éligibles parmi les activités listées dans les actes délégués. Recherche par code NACE, description ou secteur d'activité.") },
        { title: t('features.taxonomieUe.capabilities.1.title', "Critères de contribution substantielle"), description: t('features.taxonomieUe.capabilities.1.description', "Pour chaque activité éligible, vérifiez les seuils techniques de contribution substantielle à l'objectif environnemental concerné avec les données de votre entreprise.") },
        { title: t('features.taxonomieUe.capabilities.2.title', "Checklist DNSH détaillée"), description: t('features.taxonomieUe.capabilities.2.description', "Parcourez les critères Do No Significant Harm pour chaque objectif non ciblé. Questions guidées avec références réglementaires et exemples de preuves acceptées.") },
        { title: t('features.taxonomieUe.capabilities.3.title', "Garanties minimales sociales"), description: t('features.taxonomieUe.capabilities.3.description', "Vérification des 4 garanties minimales (OCDE, ONU, OIT, Charte des droits fondamentaux UE) avec questionnaire d'auto-évaluation et documentation requise.") },
        { title: t('features.taxonomieUe.capabilities.4.title', "Calcul KPIs automatique"), description: t('features.taxonomieUe.capabilities.4.description', "Saisissez vos données financières (CA, CapEx, OpEx) par activité. ESG Flow calcule automatiquement les pourcentages d'éligibilité et d'alignement.") },
        { title: t('features.taxonomieUe.capabilities.5.title', "Tableaux réglementaires"), description: t('features.taxonomieUe.capabilities.5.description', "Génération automatique des 5 tableaux obligatoires de l'Article 8 : activités éligibles, activités alignées, nucléaire/gaz, et KPIs consolidés.") },
        { title: t('features.taxonomieUe.capabilities.6.title', "Mise à jour actes délégués"), description: t('features.taxonomieUe.capabilities.6.description', "Les critères techniques sont mis à jour lors de chaque nouveau Compl. Delegated Act publié par la Commission européenne. Historique des versions conservé.") },
      ]}
      steps={[
        { step: 1, title: t('features.taxonomieUe.steps.0.title', "Identifiez vos activités éligibles"), description: t('features.taxonomieUe.steps.0.description', "Recherchez vos activités économiques dans le référentiel Taxonomie. ESG Flow suggère les activités pertinentes à partir de votre code NACE.") },
        { step: 2, title: t('features.taxonomieUe.steps.1.title', "Évaluez l'alignement"), description: t('features.taxonomieUe.steps.1.description', "Pour chaque activité éligible, vérifiez les critères de contribution substantielle, DNSH et garanties minimales avec les données de votre entreprise.") },
        { step: 3, title: t('features.taxonomieUe.steps.2.title', "Publiez vos KPIs"), description: t('features.taxonomieUe.steps.2.description', "Calculez vos KPIs d'alignement (CA%, CapEx%, OpEx%) et générez les tableaux réglementaires Art. 8 pour votre rapport annuel.") },
      ]}
      faqs={[
        { question: t('features.taxonomieUe.faqs.0.question', "Qu'est-ce que la Taxonomie européenne ?"), answer: t('features.taxonomieUe.faqs.0.answer', "La Taxonomie UE (Règlement 2020/852) est un système de classification qui définit quelles activités économiques sont considérées comme durables sur le plan environnemental. Elle couvre 6 objectifs environnementaux et impose aux entreprises soumises à la CSRD de publier leurs KPIs d'alignement.") },
        { question: t('features.taxonomieUe.faqs.1.question', "Quelle est la différence entre éligibilité et alignement ?"), answer: t('features.taxonomieUe.faqs.1.answer', "L'éligibilité indique qu'une activité est listée dans les actes délégués de la Taxonomie. L'alignement va plus loin : l'activité doit contribuer substantiellement à au moins un objectif, ne pas causer de préjudice significatif aux autres (DNSH) et respecter les garanties minimales sociales. Le taux d'alignement est toujours inférieur ou égal au taux d'éligibilité.") },
        { question: t('features.taxonomieUe.faqs.2.question', "Mon entreprise est-elle concernée ?"), answer: t('features.taxonomieUe.faqs.2.answer', "Les obligations de reporting Taxonomie (Art. 8) s'appliquent aux entreprises soumises à la CSRD. Les institutions financières ont des obligations supplémentaires (Green Asset Ratio). Les PME non cotées ne sont pas directement concernées mais peuvent être sollicitées par leurs partenaires financiers.") },
        { question: t('features.taxonomieUe.faqs.3.question', "Comment ESG Flow gère-t-il les activités gaz et nucléaire ?"), answer: t('features.taxonomieUe.faqs.3.answer', "ESG Flow intègre l'Acte délégué complémentaire (Règlement 2022/1214) qui inclut le gaz naturel et le nucléaire sous conditions strictes. Les critères spécifiques et les tableaux de reporting dédiés sont pris en charge.") },
      ]}
      relatedModules={[
        { name: t('features.taxonomieUe.related.0.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.taxonomieUe.related.1.name', "Double Matérialité"), path: '/features/double-materialite', icon: Target, color: '#7c3aed' },
        { name: t('features.taxonomieUe.related.2.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.taxonomieUe.related.3.name', "Décarbonation SBTi"), path: '/features/decarbonation', icon: FlameKindling, color: '#059669' },
      ]}
    />
  );
}
