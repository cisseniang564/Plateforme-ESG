import { Target, Users, BarChart3, Brain, FileText, Flame, Layers, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function DoubleMaterialitePage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Target}
      color="#7c3aed"
      colorLight="#f5f3ff"
      title={t('features.doubleMaterialite.title', "Analyse de Double Matérialité")}
      subtitle={t('features.doubleMaterialite.subtitle', "Identifiez vos enjeux ESG matériels selon la méthodologie CSRD/EFRAG")}
      description={t('features.doubleMaterialite.description', "Réalisez votre analyse de double matérialité conforme aux exigences CSRD et aux guidelines EFRAG. Outil interactif avec questionnaire parties prenantes, matrice interactive et suggestions sectorielles pour préparer la revue de vos auditeurs.")}
      frameworks={['CSRD', 'ESRS 1 & 2', 'EFRAG IG-1', 'GRI 3']}
      appPath="/app/materiality"
      benefits={[
        {
          icon: Target,
          title: t('features.doubleMaterialite.benefits.0.title', "Matrice drag & drop"),
          description: t('features.doubleMaterialite.benefits.0.description', "Positionnez vos enjeux ESG sur une matrice interactive double axe : impact financier (matérialité financière) et impact sur l'environnement/société (matérialité d'impact)."),
        },
        {
          icon: Users,
          title: t('features.doubleMaterialite.benefits.1.title', "Questionnaire parties prenantes"),
          description: t('features.doubleMaterialite.benefits.1.description', "Envoyez des questionnaires de matérialité à vos parties prenantes internes et externes. Collecte automatisée et agrégation des résultats."),
        },
        {
          icon: Brain,
          title: t('features.doubleMaterialite.benefits.2.title', "Suggestions sectorielles"),
          description: t('features.doubleMaterialite.benefits.2.description', "Des listes d'enjeux types selon votre secteur servent de point de départ. Ce sont des suggestions statiques, pas une analyse par IA."),
        },
        {
          icon: BarChart3,
          title: t('features.doubleMaterialite.benefits.3.title', "Base de travail pour l'audit"),
          description: t('features.doubleMaterialite.benefits.3.description', "Documentez vos enjeux, vos notations et vos validations pour préparer la revue de votre auditeur. Aucun rapport de matérialité PDF n'est généré automatiquement."),
        },
      ]}
      capabilities={[
        { title: t('features.doubleMaterialite.capabilities.0.title', "Double axe CSRD/EFRAG"), description: t('features.doubleMaterialite.capabilities.0.description', "Évaluation sur deux dimensions conformément à l'ESRS 1 : matérialité d'impact (inside-out) et matérialité financière (outside-in). Seuils personnalisables.") },
        { title: t('features.doubleMaterialite.capabilities.1.title', "Bibliothèque d'enjeux ESRS"), description: t('features.doubleMaterialite.capabilities.1.description', "Liste complète des enjeux ESG issus des 12 standards ESRS (E1-E5, S1-S4, G1) avec descriptions et sous-thèmes. Ajoutez vos enjeux spécifiques.") },
        { title: t('features.doubleMaterialite.capabilities.2.title', "Consultation multi-parties prenantes"), description: t('features.doubleMaterialite.capabilities.2.description', "Créez des campagnes de consultation ciblées : employés, investisseurs, clients, fournisseurs, ONG, communautés locales. Pondération par catégorie de partie prenante.") },
        { title: t('features.doubleMaterialite.capabilities.3.title', "Agrégation des réponses"), description: t('features.doubleMaterialite.capabilities.3.description', "Les réponses aux enquêtes parties prenantes sont agrégées par enjeu et par catégorie de répondants dans l'analyse de l'enquête.") },
        { title: t('features.doubleMaterialite.capabilities.4.title', "Matrice interactive"), description: t('features.doubleMaterialite.capabilities.4.description', "Matrice interactive : positionnement des enjeux sur les axes d'impact et financier, filtres par pilier E/S/G.") },
        { title: t('features.doubleMaterialite.capabilities.5.title', "Lien avec les standards ESRS"), description: t('features.doubleMaterialite.capabilities.5.description', "Chaque enjeu matériel est automatiquement lié aux standards ESRS correspondants. Seuls les standards matériels sont requis dans votre rapport CSRD.") },
        { title: t('features.doubleMaterialite.capabilities.6.title', "Suivi des validations"), description: t('features.doubleMaterialite.capabilities.6.description', "Enregistrez les validations de votre analyse de matérialité et consultez leur statut. Aucune comparaison automatique N/N-1.") },
      ]}
      steps={[
        { step: 1, title: t('features.doubleMaterialite.steps.0.title', "Identifiez vos enjeux"), description: t('features.doubleMaterialite.steps.0.description', "Partez de la bibliothèque ESRS ou des suggestions sectorielles. Ajoutez vos enjeux spécifiques et définissez votre périmètre.") },
        { step: 2, title: t('features.doubleMaterialite.steps.1.title', "Consultez vos parties prenantes"), description: t('features.doubleMaterialite.steps.1.description', "Envoyez les questionnaires, collectez les réponses et analysez les résultats agrégés par catégorie de partie prenante.") },
        { step: 3, title: t('features.doubleMaterialite.steps.2.title', "Validez et exportez"), description: t('features.doubleMaterialite.steps.2.description', "Positionnez les enjeux sur la matrice, validez les seuils de matérialité et exportez votre rapport pour l'audit.") },
      ]}
      faqs={[
        { question: t('features.doubleMaterialite.faqs.0.question', "Qu'est-ce que la double matérialité ?"), answer: t('features.doubleMaterialite.faqs.0.answer', "La double matérialité est le concept central de la CSRD. Elle combine deux perspectives : la matérialité d'impact (comment l'entreprise affecte l'environnement et la société) et la matérialité financière (comment les enjeux ESG affectent la performance financière de l'entreprise). Un enjeu est matériel s'il est significatif sur l'une ou l'autre dimension.") },
        { question: t('features.doubleMaterialite.faqs.1.question', "La double matérialité est-elle obligatoire pour la CSRD ?"), answer: t('features.doubleMaterialite.faqs.1.answer', "Oui. L'ESRS 1 (paragraphes 21-33) impose une analyse de double matérialité comme point de départ du reporting CSRD. Elle détermine quels standards ESRS sont applicables à votre entreprise. Sans analyse de matérialité, votre rapport CSRD est non conforme.") },
        { question: t('features.doubleMaterialite.faqs.2.question', "Combien de parties prenantes dois-je consulter ?"), answer: t('features.doubleMaterialite.faqs.2.answer', "Les guidelines de l'EFRAG demandent de consulter des parties prenantes pertinentes sans fixer de nombre de répondants. Adaptez le panel à votre contexte et documentez votre démarche.") },
        { question: t('features.doubleMaterialite.faqs.3.question', "L'IA remplace-t-elle la consultation des parties prenantes ?"), answer: t('features.doubleMaterialite.faqs.3.answer', "Les suggestions sectorielles sont une liste de départ statique, sans IA. La consultation des parties prenantes reste indispensable pour valider et pondérer les enjeux.") },
      ]}
      relatedModules={[
        { name: t('features.doubleMaterialite.related.0.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.doubleMaterialite.related.1.name', "Registre des Risques"), path: '/app/risks', icon: AlertTriangle, color: '#dc2626' },
        { name: t('features.doubleMaterialite.related.2.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.doubleMaterialite.related.3.name', "Taxonomie UE"), path: '/features/taxonomie-ue', icon: Layers, color: '#0369a1' },
      ]}
    />
  );
}
