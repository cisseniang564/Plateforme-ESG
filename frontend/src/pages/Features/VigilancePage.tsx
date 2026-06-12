import {
  ShieldAlert,
  MapPin,
  ListChecks,
  Megaphone,
  Scale,
  ClipboardList,
  Truck,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function VigilancePage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={ShieldAlert}
      color="#dc2626"
      colorLight="#fef2f2"
      title={t('features.vigilance.title', "Plan de Vigilance & Alerte Éthique")}
      subtitle={t('features.vigilance.subtitle', "Cartographiez vos risques de vigilance et offrez un canal d'alerte sécurisé à toutes vos parties prenantes")}
      description={t('features.vigilance.description', "Répondez aux exigences de la loi de vigilance française et de la directive européenne CSDDD (devoir de vigilance) grâce à un module dédié : cartographie des risques sur votre chaîne de valeur, plan d'actions de prévention et de remédiation, et canal de signalement public conforme à la directive « lanceurs d'alerte » (UE 2019/1937). Centralisez la collecte, le traitement et la documentation de chaque alerte avec une traçabilité complète.")}
      frameworks={['Loi Vigilance n°2017-399', 'CSDDD (UE) 2024/1760', 'Directive 2019/1937']}
      appPath="/app/vigilance"
      benefits={[
        {
          icon: MapPin,
          title: t('features.vigilance.benefits.0.title', "Cartographie des risques de vigilance"),
          description: t('features.vigilance.benefits.0.description', "Identifiez et hiérarchisez les risques graves pour les droits humains, la santé-sécurité et l'environnement sur l'ensemble de votre chaîne de valeur, y compris vos fournisseurs et sous-traitants de rang 1 et 2."),
        },
        {
          icon: ListChecks,
          title: t('features.vigilance.benefits.1.title', "Plan d'actions structuré"),
          description: t('features.vigilance.benefits.1.description', "Définissez des actions de prévention, d'atténuation et de remédiation associées à chaque risque identifié, avec responsables, échéances et indicateurs de suivi consolidés dans un plan de vigilance publiable."),
        },
        {
          icon: Megaphone,
          title: t('features.vigilance.benefits.2.title', "Canal d'alerte public et anonyme"),
          description: t('features.vigilance.benefits.2.description', "Mettez à disposition de vos collaborateurs, fournisseurs et parties prenantes externes un canal de signalement sécurisé, accessible publiquement, avec accusé de réception et suivi anonymisé du traitement."),
        },
        {
          icon: Scale,
          title: t('features.vigilance.benefits.3.title', "Conformité loi de vigilance & CSDDD"),
          description: t('features.vigilance.benefits.3.description', "Le module est structuré pour répondre aux obligations de la loi n°2017-399 relative au devoir de vigilance et anticiper les exigences de la directive européenne CSDDD (2024/1760) sur le devoir de diligence des entreprises."),
        },
      ]}
      capabilities={[
        { title: t('features.vigilance.capabilities.0.title', "Cartographie multi-niveaux de la chaîne de valeur"), description: t('features.vigilance.capabilities.0.description', "Recensez vos filiales, fournisseurs directs et indirects, et évaluez chacun selon des critères de risque (zone géographique, secteur d'activité, historique d'incidents) pour prioriser vos actions de vigilance.") },
        { title: t('features.vigilance.capabilities.1.title', "Référentiel de risques droits humains & environnement"), description: t('features.vigilance.capabilities.1.description', "Appuyez-vous sur un référentiel structuré de risques (travail forcé, travail des enfants, santé-sécurité, atteintes environnementales graves) aligné sur les attentes des lois de vigilance française et européenne.") },
        { title: t('features.vigilance.capabilities.2.title', "Plan d'actions avec suivi d'avancement"), description: t('features.vigilance.capabilities.2.description', "Chaque action de prévention ou de remédiation est assortie d'un responsable, d'une échéance et d'indicateurs de progression, consolidés dans des tableaux de bord pour le pilotage du plan de vigilance.") },
        { title: t('features.vigilance.capabilities.3.title', "Canal de signalement public conforme"), description: t('features.vigilance.capabilities.3.description', "Une page publique de signalement (sans authentification requise) permet à tout collaborateur, sous-traitant, fournisseur ou tiers de déposer une alerte de manière confidentielle, avec ou sans identification.") },
        { title: t('features.vigilance.capabilities.4.title', "Accusé de réception et suivi anonymisé"), description: t('features.vigilance.capabilities.4.description', "Chaque signalement génère un identifiant unique permettant au lanceur d'alerte de suivre l'avancement du traitement de son signalement sans révéler son identité, conformément à la directive 2019/1937.") },
        { title: t('features.vigilance.capabilities.5.title', "Workflow de traitement des alertes"), description: t('features.vigilance.capabilities.5.description', "Les alertes sont qualifiées, attribuées à un référent et suivies jusqu'à leur clôture, avec horodatage de chaque étape et conservation des échanges dans la piste d'audit de la plateforme.") },
        { title: t('features.vigilance.capabilities.6.title', "Génération du document de plan de vigilance"), description: t('features.vigilance.capabilities.6.description', "Exportez un document de plan de vigilance structuré, prêt à être annexé au rapport de gestion ou à votre rapport de durabilité CSRD, incluant cartographie des risques, actions et indicateurs de suivi.") },
        { title: t('features.vigilance.capabilities.7.title', "Lien avec le module Supply Chain ESG"), description: t('features.vigilance.capabilities.7.description', "Les évaluations de risques fournisseurs réalisées dans le module Supply Chain ESG alimentent directement la cartographie de vigilance, évitant la double saisie et assurant la cohérence des données.") },
      ]}
      steps={[
        { step: 1, title: t('features.vigilance.steps.0.title', "Cartographiez vos risques"), description: t('features.vigilance.steps.0.description', "Recensez votre chaîne de valeur (filiales, fournisseurs, sous-traitants) et évaluez les risques droits humains, santé-sécurité et environnement selon le référentiel intégré.") },
        { step: 2, title: t('features.vigilance.steps.1.title', "Construisez votre plan d'actions et activez le canal d'alerte"), description: t('features.vigilance.steps.1.description', "Définissez les actions de prévention et de remédiation associées à chaque risque prioritaire, et publiez votre canal de signalement public pour vos parties prenantes.") },
        { step: 3, title: t('features.vigilance.steps.2.title', "Suivez, traitez et documentez"), description: t('features.vigilance.steps.2.description', "Pilotez l'avancement de votre plan de vigilance, traitez les alertes reçues via le workflow dédié, et générez le document consolidé pour votre rapport annuel ou CSRD.") },
      ]}
      faqs={[
        { question: t('features.vigilance.faqs.0.question', "Quelles entreprises sont concernées par le devoir de vigilance ?"), answer: t('features.vigilance.faqs.0.answer', "En France, la loi n°2017-399 s'applique aux entreprises employant au moins 5 000 salariés en France ou 10 000 dans le monde. La directive européenne CSDDD (2024/1760) élargit progressivement ces obligations à un périmètre plus large d'entreprises selon des seuils de chiffre d'affaires et d'effectifs définis par les États membres lors de la transposition.") },
        { question: t('features.vigilance.faqs.1.question', "Le canal d'alerte garantit-il l'anonymat du lanceur d'alerte ?"), answer: t('features.vigilance.faqs.1.answer', "Oui. Le canal de signalement public permet de déposer une alerte sans renseigner d'identité. Un identifiant de suivi unique est généré pour permettre au lanceur d'alerte de consulter l'état de traitement de son signalement, sans que son identité ne soit requise ni conservée si elle n'a pas été communiquée.") },
        { question: t('features.vigilance.faqs.2.question', "Qui peut utiliser le canal de signalement ?"), answer: t('features.vigilance.faqs.2.answer', "Le canal est accessible publiquement, sans authentification : collaborateurs, anciens collaborateurs, candidats, fournisseurs, sous-traitants, actionnaires ou toute personne ayant connaissance d'un risque ou d'une atteinte grave peut soumettre un signalement, conformément à la directive (UE) 2019/1937.") },
        { question: t('features.vigilance.faqs.3.question', "Comment les alertes reçues sont-elles traitées ?"), answer: t('features.vigilance.faqs.3.answer', "Chaque alerte est horodatée et qualifiée par un référent désigné, qui peut l'assigner, demander des compléments d'information de manière anonymisée, documenter les investigations et clôturer le dossier. L'ensemble du traitement est conservé dans la piste d'audit de la plateforme.") },
        { question: t('features.vigilance.faqs.4.question', "Le plan de vigilance généré est-il utilisable pour le rapport CSRD ?"), answer: t('features.vigilance.faqs.4.answer', "Oui. Le document de plan de vigilance produit par le module reprend la cartographie des risques, le plan d'actions et les indicateurs de suivi, des éléments directement mobilisables pour répondre aux exigences ESRS S1/S2 (forces de travail propres et de la chaîne de valeur) de votre rapport de durabilité CSRD.") },
      ]}
      relatedModules={[
        { name: t('features.vigilance.related.0.name', "Supply Chain ESG"), path: '/features/supply-chain', icon: Truck, color: '#2563eb' },
        { name: t('features.vigilance.related.1.name', "Registre des Risques"), path: '/app/risks', icon: AlertTriangle, color: '#dc2626' },
        { name: t('features.vigilance.related.2.name', "Piste d'Audit"), path: '/features/audit-trail', icon: ClipboardList, color: '#374151' },
        { name: t('features.vigilance.related.3.name', "Conformité multi-référentiels"), path: '/app/compliance', icon: Eye, color: '#7c3aed' },
      ]}
    />
  );
}
