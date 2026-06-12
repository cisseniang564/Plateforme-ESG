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
      description={t('features.doubleMaterialite.description', "Réalisez votre analyse de double matérialité conforme aux exigences CSRD et aux guidelines EFRAG. Outil interactif avec questionnaire parties prenantes, matrice drag & drop, suggestions IA sectorielles et export certifiable pour vos auditeurs.")}
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
          title: t('features.doubleMaterialite.benefits.2.title', "Suggestions IA sectorielles"),
          description: t('features.doubleMaterialite.benefits.2.description', "L'IA analyse votre secteur d'activité (code NAF) et propose une pré-sélection d'enjeux matériels basée sur les standards GRI et les benchmarks sectoriels."),
        },
        {
          icon: BarChart3,
          title: t('features.doubleMaterialite.benefits.3.title', "Export certifiable"),
          description: t('features.doubleMaterialite.benefits.3.description', "Générez un rapport de matérialité PDF avec méthodologie détaillée, résultats des consultations et justification de chaque enjeu. Prêt pour la revue de votre auditeur externe."),
        },
      ]}
      capabilities={[
        { title: t('features.doubleMaterialite.capabilities.0.title', "Double axe CSRD/EFRAG"), description: t('features.doubleMaterialite.capabilities.0.description', "Évaluation sur deux dimensions conformément à l'ESRS 1 : matérialité d'impact (inside-out) et matérialité financière (outside-in). Seuils personnalisables.") },
        { title: t('features.doubleMaterialite.capabilities.1.title', "Bibliothèque d'enjeux ESRS"), description: t('features.doubleMaterialite.capabilities.1.description', "Liste complète des enjeux ESG issus des 12 standards ESRS (E1-E5, S1-S4, G1) avec descriptions et sous-thèmes. Ajoutez vos enjeux spécifiques.") },
        { title: t('features.doubleMaterialite.capabilities.2.title', "Consultation multi-parties prenantes"), description: t('features.doubleMaterialite.capabilities.2.description', "Créez des campagnes de consultation ciblées : employés, investisseurs, clients, fournisseurs, ONG, communautés locales. Pondération par catégorie de partie prenante.") },
        { title: t('features.doubleMaterialite.capabilities.3.title', "Scoring automatique"), description: t('features.doubleMaterialite.capabilities.3.description', "Calcul automatique du score de matérialité par enjeu basé sur les réponses collectées, avec intervalles de confiance et détection des divergences entre groupes.") },
        { title: t('features.doubleMaterialite.capabilities.4.title', "Matrice interactive"), description: t('features.doubleMaterialite.capabilities.4.description', "Interface drag & drop pour positionner et ajuster les enjeux sur la matrice. Zoom, filtres par pilier E/S/G et visualisation des seuils de matérialité.") },
        { title: t('features.doubleMaterialite.capabilities.5.title', "Lien avec les standards ESRS"), description: t('features.doubleMaterialite.capabilities.5.description', "Chaque enjeu matériel est automatiquement lié aux standards ESRS correspondants. Seuls les standards matériels sont requis dans votre rapport CSRD.") },
        { title: t('features.doubleMaterialite.capabilities.6.title', "Historique et comparaison"), description: t('features.doubleMaterialite.capabilities.6.description', "Comparez vos analyses de matérialité N/N-1. Identifiez les enjeux émergents, les évolutions de positionnement et les tendances sectorielles.") },
      ]}
      steps={[
        { step: 1, title: t('features.doubleMaterialite.steps.0.title', "Identifiez vos enjeux"), description: t('features.doubleMaterialite.steps.0.description', "Partez de la bibliothèque ESRS ou des suggestions IA sectorielles. Ajoutez vos enjeux spécifiques et définissez votre périmètre.") },
        { step: 2, title: t('features.doubleMaterialite.steps.1.title', "Consultez vos parties prenantes"), description: t('features.doubleMaterialite.steps.1.description', "Envoyez les questionnaires, collectez les réponses et analysez les résultats agrégés par catégorie de partie prenante.") },
        { step: 3, title: t('features.doubleMaterialite.steps.2.title', "Validez et exportez"), description: t('features.doubleMaterialite.steps.2.description', "Positionnez les enjeux sur la matrice, validez les seuils de matérialité et exportez votre rapport pour l'audit.") },
      ]}
      faqs={[
        { question: t('features.doubleMaterialite.faqs.0.question', "Qu'est-ce que la double matérialité ?"), answer: t('features.doubleMaterialite.faqs.0.answer', "La double matérialité est le concept central de la CSRD. Elle combine deux perspectives : la matérialité d'impact (comment l'entreprise affecte l'environnement et la société) et la matérialité financière (comment les enjeux ESG affectent la performance financière de l'entreprise). Un enjeu est matériel s'il est significatif sur l'une ou l'autre dimension.") },
        { question: t('features.doubleMaterialite.faqs.1.question', "La double matérialité est-elle obligatoire pour la CSRD ?"), answer: t('features.doubleMaterialite.faqs.1.answer', "Oui. L'ESRS 1 (paragraphes 21-33) impose une analyse de double matérialité comme point de départ du reporting CSRD. Elle détermine quels standards ESRS sont applicables à votre entreprise. Sans analyse de matérialité, votre rapport CSRD est non conforme.") },
        { question: t('features.doubleMaterialite.faqs.2.question', "Combien de parties prenantes dois-je consulter ?"), answer: t('features.doubleMaterialite.faqs.2.answer', "L'EFRAG recommande de consulter un panel représentatif de parties prenantes affectées et intéressées. En pratique, 50 à 200 répondants couvrant 4 à 6 catégories (employés, clients, fournisseurs, investisseurs, experts, communautés) donnent des résultats statistiquement robustes.") },
        { question: t('features.doubleMaterialite.faqs.3.question', "L'IA remplace-t-elle la consultation des parties prenantes ?"), answer: t('features.doubleMaterialite.faqs.3.answer', "Non. Les suggestions IA fournissent un point de départ sectoriel pour accélérer l'identification des enjeux potentiels. La consultation des parties prenantes reste indispensable pour valider et pondérer les enjeux selon votre contexte spécifique.") },
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
