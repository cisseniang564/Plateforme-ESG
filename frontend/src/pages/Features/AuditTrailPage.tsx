import { ClipboardList, Shield, Lock, FileSearch, FileText, Flame, Target, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function AuditTrailPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={ClipboardList}
      color="#374151"
      colorLight="#f9fafb"
      title={t('features.auditTrail.title', "Piste d'Audit & Traçabilité")}
      subtitle={t('features.auditTrail.subtitle', "Journal d'audit détaillé avec empreintes SHA-256 par entrée")}
      description={t('features.auditTrail.description', "Tracez chaque action ESG de bout en bout : qui a modifié quoi, quand, pourquoi et avec quelle source. Versionning avant/après, pièces justificatives attachées, empreintes SHA-256 par entrée et export complet pour vos auditeurs externes.")}
      frameworks={['CSRD Art. 34', 'ISO 27001', 'NIS 2', 'RGPD Art. 30']}
      appPath="/app/audit-trail"
      benefits={[
        {
          icon: ClipboardList,
          title: t('features.auditTrail.benefits.0.title', "Journal complet"),
          description: t('features.auditTrail.benefits.0.description', "Chaque création, modification et suppression de donnée ESG est enregistrée avec l'identité de l'utilisateur, l'horodatage précis et le contexte."),
        },
        {
          icon: Shield,
          title: t('features.auditTrail.benefits.1.title', "Versionning avant/après"),
          description: t('features.auditTrail.benefits.1.description', "Visualisez l'état exact d'une donnée avant et après chaque modification. Diff visuel pour identifier rapidement les changements."),
        },
        {
          icon: Lock,
          title: t('features.auditTrail.benefits.2.title', "Empreintes SHA-256"),
          description: t('features.auditTrail.benefits.2.description', "Chaque entrée du journal porte une empreinte cryptographique SHA-256 calculée à partir de son contenu et de son horodatage. Toute modification de l'entrée est détectable."),
        },
        {
          icon: FileSearch,
          title: t('features.auditTrail.benefits.3.title', "Export auditeur"),
          description: t('features.auditTrail.benefits.3.description', "Exportez la piste d'audit filtrée par période, utilisateur, type de donnée ou action. Formats PDF et CSV."),
        },
      ]}
      capabilities={[
        { title: t('features.auditTrail.capabilities.0.title', "Traçabilité granulaire"), description: t('features.auditTrail.capabilities.0.description', "Chaque action est tracée au niveau du champ : utilisateur, date/heure UTC, adresse IP, valeur avant, valeur après, motif de modification et pièce justificative.") },
        { title: t('features.auditTrail.capabilities.1.title', "Pièces justificatives"), description: t('features.auditTrail.capabilities.1.description', "Attachez des documents sources à chaque donnée ESG : factures, certifications, rapports de mesure, procès-verbaux. Lien direct entre la donnée et sa preuve.") },
        { title: t('features.auditTrail.capabilities.2.title', "Empreintes SHA-256"), description: t('features.auditTrail.capabilities.2.description', "Chaque entrée du journal d'audit porte une empreinte SHA-256 calculée à partir de son contenu et de son horodatage UTC. Toute modification d'une entrée individuelle est détectable.") },
        { title: t('features.auditTrail.capabilities.3.title', "Recherche et filtres avancés"), description: t('features.auditTrail.capabilities.3.description', "Recherchez dans le journal par utilisateur, type d'entité (indicateur, score, émission...), action (création, modification, suppression), période et mot-clé.") },
        { title: t('features.auditTrail.capabilities.4.title', "Alertes d'intégrité"), description: t('features.auditTrail.capabilities.4.description', "Détection automatique des tentatives de modification du journal. Notification immédiate aux administrateurs en cas d'anomalie d'intégrité.") },
        { title: t('features.auditTrail.capabilities.5.title', "Rétention configurable"), description: t('features.auditTrail.capabilities.5.description', "Définissez la durée de rétention du journal d'audit : 3 ans (par défaut CSRD), 5 ans ou 10 ans selon vos obligations réglementaires et sectorielles.") },
        { title: t('features.auditTrail.capabilities.6.title', "Portail auditeur dédié"), description: t('features.auditTrail.capabilities.6.description', "Donnez un accès en lecture seule à vos auditeurs externes via un lien sécurisé. Ils consultent la piste d'audit, les pièces justificatives et les rapports sans modifier vos données.") },
      ]}
      steps={[
        { step: 1, title: t('features.auditTrail.steps.0.title', "Automatique dès le jour 1"), description: t('features.auditTrail.steps.0.description', "La piste d'audit s'active automatiquement. Chaque action dans ESG Flow est tracée sans configuration ni action de votre part.") },
        { step: 2, title: t('features.auditTrail.steps.1.title', "Consultez et recherchez"), description: t('features.auditTrail.steps.1.description', "Explorez le journal d'audit avec les filtres avancés. Retrouvez l'historique complet de n'importe quelle donnée en un clic.") },
        { step: 3, title: t('features.auditTrail.steps.2.title', "Exportez pour l'audit"), description: t('features.auditTrail.steps.2.description', "Générez un export filtré de la piste d'audit pour vos auditeurs externes. PDF avec vérification SHA-256 intégrée.") },
      ]}
      faqs={[
        { question: t('features.auditTrail.faqs.0.question', "La piste d'audit est-elle obligatoire pour la CSRD ?"), answer: t('features.auditTrail.faqs.0.answer', "L'Article 34 de la directive CSRD impose que les informations de durabilité soient auditées avec une assurance limitée (puis raisonnable). La piste d'audit ESG Flow fournit les éléments utiles : traçabilité des données, sources, responsables et méthodes de calcul.") },
        { question: t('features.auditTrail.faqs.1.question', "Qu'est-ce que l'ISAE 3000 ?"), answer: t('features.auditTrail.faqs.1.answer', "L'ISAE 3000 (International Standard on Assurance Engagements) est la norme d'audit utilisée pour vérifier les rapports de durabilité. Elle exige une traçabilité complète, des contrôles internes documentés et des preuves de fiabilité. Le journal d'ESG Flow facilite la production de ces éléments — l'attestation ISAE 3000 reste délivrée par votre auditeur externe.") },
        { question: t('features.auditTrail.faqs.2.question', "Puis-je modifier ou supprimer des entrées du journal ?"), answer: t('features.auditTrail.faqs.2.answer', "Non. Le journal d'audit est en écriture seule (append-only) côté application. Aucune entrée ne peut être modifiée ou supprimée via l'interface utilisateur. Les empreintes SHA-256 par entrée permettent de détecter une éventuelle modification.") },
        { question: t('features.auditTrail.faqs.3.question', "Quelle est la durée de conservation ?"), answer: t('features.auditTrail.faqs.3.answer', "Par défaut, le journal est conservé 3 ans conformément aux exigences CSRD. Vous pouvez configurer une rétention de 5 ou 10 ans selon vos obligations sectorielles (finance, énergie, santé). Les données archivées restent consultables et exportables.") },
      ]}
      relatedModules={[
        { name: t('features.auditTrail.related.0.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.auditTrail.related.1.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.auditTrail.related.2.name', "Double Matérialité"), path: '/features/double-materialite', icon: Target, color: '#7c3aed' },
        { name: t('features.auditTrail.related.3.name', "Supply Chain ESG"), path: '/features/supply-chain', icon: Truck, color: '#2563eb' },
      ]}
    />
  );
}
