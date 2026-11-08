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
          description: t('features.taxonomieUe.benefits.0.description', "Les 6 objectifs environnementaux sont disponibles à la saisie : atténuation, adaptation, eau, économie circulaire, pollution et biodiversité."),
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
          title: t('features.taxonomieUe.benefits.3.title', "Préparation de l'Article 8"),
          description: t('features.taxonomieUe.benefits.3.description', "Suivez vos KPIs d'éligibilité et d'alignement (CA, CapEx, OpEx) pour préparer les tableaux de l'Article 8. La mise en forme réglementaire finale reste à votre charge."),
        },
      ]}
      capabilities={[
        { title: t('features.taxonomieUe.capabilities.0.title', "Classification des activités"), description: t('features.taxonomieUe.capabilities.0.description', "Identifiez vos activités éligibles dans un catalogue d'une cinquantaine d'activités courantes (recherche par code NACE, description ou secteur). Ce catalogue n'est pas exhaustif : vérifiez-le avec les actes délégués.") },
        { title: t('features.taxonomieUe.capabilities.1.title', "Critères de contribution substantielle"), description: t('features.taxonomieUe.capabilities.1.description', "Pour chaque activité éligible, vérifiez les seuils techniques de contribution substantielle à l'objectif environnemental concerné avec les données de votre entreprise.") },
        { title: t('features.taxonomieUe.capabilities.2.title', "Checklist DNSH détaillée"), description: t('features.taxonomieUe.capabilities.2.description', "Parcourez les critères Do No Significant Harm pour chaque objectif non ciblé. Questions guidées avec références réglementaires et exemples de preuves acceptées.") },
        { title: t('features.taxonomieUe.capabilities.3.title', "Garanties minimales sociales"), description: t('features.taxonomieUe.capabilities.3.description', "Indiquez si les garanties minimales (OCDE, ONU, OIT, Charte des droits fondamentaux UE) sont respectées pour chaque activité. Les preuves restent à conserver de votre côté.") },
        { title: t('features.taxonomieUe.capabilities.4.title', "Calcul KPIs automatique"), description: t('features.taxonomieUe.capabilities.4.description', "Saisissez vos données financières (CA, CapEx, OpEx) par activité. ESGFlow calcule automatiquement les pourcentages d'éligibilité et d'alignement.") },
        { title: t('features.taxonomieUe.capabilities.5.title', "KPIs Taxonomie"), description: t('features.taxonomieUe.capabilities.5.description', "Calcul de vos pourcentages d'éligibilité et d'alignement en CA, CapEx et OpEx à partir des données financières saisies par activité.") },
        { title: t('features.taxonomieUe.capabilities.6.title', "Catalogue d'activités"), description: t('features.taxonomieUe.capabilities.6.description', "Le catalogue d'activités et de critères est maintenu par l'équipe ESGFlow. Il peut être en retard sur les derniers actes délégués : vérifiez toujours la version applicable.") },
      ]}
      steps={[
        { step: 1, title: t('features.taxonomieUe.steps.0.title', "Identifiez vos activités éligibles"), description: t('features.taxonomieUe.steps.0.description', "Recherchez vos activités économiques dans le référentiel Taxonomie. ESGFlow suggère les activités pertinentes à partir de votre code NACE.") },
        { step: 2, title: t('features.taxonomieUe.steps.1.title', "Évaluez l'alignement"), description: t('features.taxonomieUe.steps.1.description', "Pour chaque activité éligible, vérifiez les critères de contribution substantielle, DNSH et garanties minimales avec les données de votre entreprise.") },
        { step: 3, title: t('features.taxonomieUe.steps.2.title', "Publiez vos KPIs"), description: t('features.taxonomieUe.steps.2.description', "Calculez vos KPIs d'alignement (CA%, CapEx%, OpEx%) et préparez les tableaux de l'Article 8 de votre rapport annuel.") },
      ]}
      faqs={[
        { question: t('features.taxonomieUe.faqs.0.question', "Qu'est-ce que la Taxonomie européenne ?"), answer: t('features.taxonomieUe.faqs.0.answer', "La Taxonomie UE (Règlement 2020/852) est un système de classification qui définit quelles activités économiques sont considérées comme durables sur le plan environnemental. Elle couvre 6 objectifs environnementaux et impose aux entreprises soumises à la CSRD de publier leurs KPIs d'alignement.") },
        { question: t('features.taxonomieUe.faqs.1.question', "Quelle est la différence entre éligibilité et alignement ?"), answer: t('features.taxonomieUe.faqs.1.answer', "L'éligibilité indique qu'une activité est listée dans les actes délégués de la Taxonomie. L'alignement va plus loin : l'activité doit contribuer substantiellement à au moins un objectif, ne pas causer de préjudice significatif aux autres (DNSH) et respecter les garanties minimales sociales. Le taux d'alignement est toujours inférieur ou égal au taux d'éligibilité.") },
        { question: t('features.taxonomieUe.faqs.2.question', "Mon entreprise est-elle concernée ?"), answer: t('features.taxonomieUe.faqs.2.answer', "Les obligations de reporting Taxonomie (Art. 8) s'appliquent aux entreprises soumises à la CSRD. Les institutions financières ont des obligations supplémentaires (Green Asset Ratio). Les PME non cotées ne sont pas directement concernées mais peuvent être sollicitées par leurs partenaires financiers.") },
        { question: t('features.taxonomieUe.faqs.3.question', "Comment ESGFlow gère-t-il les activités gaz et nucléaire ?"), answer: t('features.taxonomieUe.faqs.3.answer', "Le gaz fossile et le nucléaire relèvent d'un acte délégué complémentaire (Règlement 2022/1214) avec des tableaux de déclaration dédiés. ESGFlow ne les prend pas en charge à ce jour : ces activités sont à traiter hors de l'outil.") },
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
