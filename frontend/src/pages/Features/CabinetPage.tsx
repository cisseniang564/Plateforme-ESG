import {
  Building2,
  Layers,
  RefreshCw,
  Lock,
  BarChart3,
  Users,
  GitMerge,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function CabinetPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Building2}
      color="#4f46e5"
      colorLight="#eef2ff"
      title={t('features.cabinet.title', "Mode Cabinet — Pilotez tous vos clients depuis un espace unique")}
      subtitle={t('features.cabinet.subtitle', "La plateforme pensée pour les cabinets d'expertise comptable, d'audit et de conseil RSE")}
      description={t('features.cabinet.description', "Gérez l'ensemble de vos clients ESG/CSRD depuis un espace unique : passez d'une organisation à l'autre en un clic, comparez leurs scores et leur niveau de maturité, et générez des rapports personnalisés pour chacun. Chaque organisation cliente bénéficie d'un cloisonnement strict de ses données (isolation multi-tenant), tandis que votre équipe garde une vue consolidée pour piloter l'ensemble du portefeuille.")}
      frameworks={['Multi-tenant RLS', 'ISO 27001', 'RGPD']}
      appPath="/app/cabinet"
      benefits={[
        {
          icon: Layers,
          title: t('features.cabinet.benefits.0.title', "Vue consolidée multi-clients"),
          description: t('features.cabinet.benefits.0.description', "Accédez en un coup d'œil à l'état d'avancement, au score ESG et au niveau de conformité CSRD de chacun de vos clients, sans changer d'outil ni jongler entre plusieurs comptes."),
        },
        {
          icon: RefreshCw,
          title: t('features.cabinet.benefits.1.title', "Changement d'organisation en un clic"),
          description: t('features.cabinet.benefits.1.description', "Naviguez instantanément d'une organisation cliente à l'autre depuis un sélecteur unique, tout en conservant votre identité et vos préférences d'affichage."),
        },
        {
          icon: Lock,
          title: t('features.cabinet.benefits.2.title', "Isolation stricte des données (RLS)"),
          description: t('features.cabinet.benefits.2.description', "Chaque organisation cliente dispose de son propre périmètre de données, isolé au niveau base de données (Row-Level Security). Aucune donnée d'un client n'est jamais visible par un autre."),
        },
        {
          icon: BarChart3,
          title: t('features.cabinet.benefits.3.title', "Comparaison et benchmark inter-clients"),
          description: t('features.cabinet.benefits.3.description', "Comparez les scores ESG, la maturité CSRD et la progression des indicateurs entre plusieurs organisations clientes pour identifier les bonnes pratiques à diffuser et prioriser votre accompagnement."),
        },
      ]}
      capabilities={[
        { title: t('features.cabinet.capabilities.0.title', "Sélecteur d'organisations"), description: t('features.cabinet.capabilities.0.description', "Un sélecteur dédié permet à votre équipe de basculer instantanément d'un client à l'autre, avec mémorisation du dernier client consulté et accès rapide aux clients favoris.") },
        { title: t('features.cabinet.capabilities.1.title', "Tableau de bord portefeuille"), description: t('features.cabinet.capabilities.1.description', "Visualisez en un seul écran l'état de chaque client : score ESG global, taux de complétion des indicateurs, statut de validation et échéances de reporting à venir.") },
        { title: t('features.cabinet.capabilities.2.title', "Comparateur d'organisations"), description: t('features.cabinet.capabilities.2.description', "Sélectionnez plusieurs organisations clientes et comparez leurs scores par pilier (Environnement, Social, Gouvernance), leur taux de couverture ESRS et leur trajectoire de décarbonation.") },
        { title: t('features.cabinet.capabilities.3.title', "Gestion des accès par client"), description: t('features.cabinet.capabilities.3.description', "Définissez précisément quels collaborateurs de votre cabinet ont accès à quels clients, avec des rôles différenciés (consultation, contribution, validation) selon les missions.") },
        { title: t('features.cabinet.capabilities.4.title', "Rapports personnalisés par client"), description: t('features.cabinet.capabilities.4.description', "Générez des rapports CSRD, des bilans carbone ou des analyses de matérialité pour chaque client avec leur propre identité (logo, nom, périmètre), tout en réutilisant vos modèles et méthodologies.") },
        { title: t('features.cabinet.capabilities.5.title', "Méthodologies et référentiels partagés"), description: t('features.cabinet.capabilities.5.description', "Configurez vos propres référentiels de notation, pondérations et seuils de matérialité une seule fois, puis appliquez-les de façon cohérente à l'ensemble de votre portefeuille de clients.") },
        { title: t('features.cabinet.capabilities.6.title', "Suivi des échéances réglementaires"), description: t('features.cabinet.capabilities.6.description', "Centralisez les dates limites de dépôt CSRD, de publication du plan de vigilance ou de remise du bilan carbone pour chacun de vos clients, avec des rappels automatiques.") },
        { title: t('features.cabinet.capabilities.7.title', "Onboarding simplifié des nouveaux clients"), description: t('features.cabinet.capabilities.7.description', "Ajoutez rapidement une nouvelle organisation cliente, importez ses données existantes et configurez son périmètre de reporting grâce à un assistant de mise en route guidé.") },
      ]}
      steps={[
        { step: 1, title: t('features.cabinet.steps.0.title', "Ajoutez vos organisations clientes"), description: t('features.cabinet.steps.0.description', "Créez un espace dédié pour chaque client avec son propre périmètre de données, isolé et sécurisé, en quelques minutes via l'assistant de configuration.") },
        { step: 2, title: t('features.cabinet.steps.1.title', "Naviguez entre vos clients"), description: t('features.cabinet.steps.1.description', "Basculez d'un client à l'autre depuis le sélecteur d'organisations pour accéder à leurs données, tableaux de bord et rapports respectifs.") },
        { step: 3, title: t('features.cabinet.steps.2.title', "Pilotez et comparez votre portefeuille"), description: t('features.cabinet.steps.2.description', "Suivez l'avancement de chaque client depuis le tableau de bord portefeuille, comparez leurs performances et générez des rapports personnalisés pour chacun.") },
      ]}
      faqs={[
        { question: t('features.cabinet.faqs.0.question', "Les données de mes différents clients sont-elles séparées ?"), answer: t('features.cabinet.faqs.0.answer', "Oui. Chaque organisation cliente dispose d'un cloisonnement strict de ses données au niveau de la base (Row-Level Security PostgreSQL). Un client ne peut jamais accéder, même indirectement, aux données d'un autre client de votre cabinet.") },
        { question: t('features.cabinet.faqs.1.question', "Combien de clients puis-je gérer en mode cabinet ?"), answer: t('features.cabinet.faqs.1.answer', "Le mode cabinet est conçu pour gérer un portefeuille de plusieurs organisations clientes sans limite technique. Le nombre d'organisations incluses dépend de votre formule d'abonnement ; contactez notre équipe pour un accompagnement multi-clients à grande échelle.") },
        { question: t('features.cabinet.faqs.2.question', "Mes clients peuvent-ils accéder directement à leur espace ?"), answer: t('features.cabinet.faqs.2.answer', "Oui. Vous pouvez inviter les équipes de vos clients à accéder directement à leur organisation, avec les rôles et permissions de votre choix, tout en conservant un accès de supervision pour votre cabinet.") },
        { question: t('features.cabinet.faqs.3.question', "Puis-je personnaliser les rapports générés pour chaque client ?"), answer: t('features.cabinet.faqs.3.answer', "Oui. Les rapports CSRD, bilans carbone et analyses de matérialité reprennent l'identité de l'organisation cliente sélectionnée (nom, périmètre, indicateurs propres), tout en s'appuyant sur les méthodologies et modèles configurés par votre cabinet.") },
        { question: t('features.cabinet.faqs.4.question', "Comment gérer les accès de mon équipe sur plusieurs clients ?"), answer: t('features.cabinet.faqs.4.answer', "Depuis la gestion des accès, vous attribuez à chaque collaborateur de votre cabinet un rôle (consultation, contribution, validation) sur chacune des organisations clientes auxquelles il intervient, sans avoir à créer de comptes distincts.") },
      ]}
      relatedModules={[
        { name: t('features.cabinet.related.0.name', "Comparateur d'organisations"), path: '/app/organizations/compare', icon: GitMerge, color: '#7c3aed' },
        { name: t('features.cabinet.related.1.name', "Organisations"), path: '/app/organizations', icon: Building2, color: '#4f46e5' },
        { name: t('features.cabinet.related.2.name', "Gestion des utilisateurs"), path: '/app/settings/users', icon: Users, color: '#059669' },
        { name: t('features.cabinet.related.3.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
      ]}
    />
  );
}
