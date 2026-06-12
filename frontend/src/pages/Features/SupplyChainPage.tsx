import { Truck, Users, Shield, AlertTriangle, Search, Flame, ClipboardList, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function SupplyChainPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Truck}
      color="#2563eb"
      colorLight="#eff6ff"
      title={t('features.supplyChain.title', "Supply Chain ESG & Due Diligence")}
      subtitle={t('features.supplyChain.subtitle', "Évaluez, suivez et sécurisez la performance ESG de vos fournisseurs")}
      description={t('features.supplyChain.description', "Conformez-vous au Devoir de Vigilance, à la CSDDD et au LkSG avec un outil complet de scoring fournisseurs, de questionnaires automatisés et de cartographie des risques supply chain. Pilotez la due diligence de bout en bout.")}
      frameworks={['CSDDD', 'Loi Devoir de Vigilance', 'LkSG', 'CSRD ESRS S2']}
      appPath="/app/supply-chain"
      benefits={[
        {
          icon: Search,
          title: t('features.supplyChain.benefits.0.title', "Scoring 6 dimensions"),
          description: t('features.supplyChain.benefits.0.description', "Évaluez chaque fournisseur sur 6 axes ESG : environnement, droits humains, conditions de travail, éthique, achats responsables et gouvernance."),
        },
        {
          icon: Users,
          title: t('features.supplyChain.benefits.1.title', "Questionnaires automatisés"),
          description: t('features.supplyChain.benefits.1.description', "Envoyez des questionnaires ESG personnalisés à vos fournisseurs via un portail dédié. Relances automatiques et suivi en temps réel."),
        },
        {
          icon: AlertTriangle,
          title: t('features.supplyChain.benefits.2.title', "Cartographie des risques"),
          description: t('features.supplyChain.benefits.2.description', "Identifiez les fournisseurs à risque avec une matrice probabilité/impact. Alertes automatiques sur les fournisseurs critiques."),
        },
        {
          icon: Shield,
          title: t('features.supplyChain.benefits.3.title', "Conformité réglementaire"),
          description: t('features.supplyChain.benefits.3.description', "Préparez vos obligations au titre du Devoir de Vigilance (loi 2017-399), de la CSDDD européenne et du LkSG allemand."),
        },
      ]}
      capabilities={[
        { title: t('features.supplyChain.capabilities.0.title', "Fiche fournisseur enrichie"), description: t('features.supplyChain.capabilities.0.description', "Profil complet par fournisseur : informations légales, score ESG, historique d'évaluations, documents justificatifs et plan d'actions correctives.") },
        { title: t('features.supplyChain.capabilities.1.title', "Portail fournisseur dédié"), description: t('features.supplyChain.capabilities.1.description', "Vos fournisseurs accèdent à un portail sécurisé pour répondre aux questionnaires, télécharger leurs certifications et suivre leur score ESG.") },
        { title: t('features.supplyChain.capabilities.2.title', "Plans d'action corrective"), description: t('features.supplyChain.capabilities.2.description', "Créez des plans d'amélioration pour chaque fournisseur non conforme avec jalons, responsables et suivi de progression.") },
        { title: t('features.supplyChain.capabilities.3.title', "Due diligence documentée"), description: t('features.supplyChain.capabilities.3.description', "Piste d'audit complète de votre processus de due diligence : dates d'évaluation, résultats, mesures prises et suivi de remédiation.") },
        { title: t('features.supplyChain.capabilities.4.title', "Import et enrichissement"), description: t('features.supplyChain.capabilities.4.description', "Importez votre base fournisseurs depuis votre ERP ou un fichier CSV. Enrichissement automatique avec les données INSEE et EcoVadis.") },
        { title: t('features.supplyChain.capabilities.5.title', "Alertes fournisseurs critiques"), description: t('features.supplyChain.capabilities.5.description', "Recevez des notifications lorsqu'un fournisseur passe sous un seuil de score ESG ou lorsqu'une certification expire.") },
        { title: t('features.supplyChain.capabilities.6.title', "Reporting réglementaire"), description: t('features.supplyChain.capabilities.6.description', "Exportez votre plan de vigilance, votre cartographie des risques et vos KPIs supply chain pour votre rapport CSRD (ESRS S2).") },
      ]}
      steps={[
        { step: 1, title: t('features.supplyChain.steps.0.title', "Importez vos fournisseurs"), description: t('features.supplyChain.steps.0.description', "Chargez votre base depuis votre ERP, un CSV ou saisissez-les manuellement. Enrichissement automatique INSEE.") },
        { step: 2, title: t('features.supplyChain.steps.1.title', "Évaluez et scorez"), description: t('features.supplyChain.steps.1.description', "Envoyez les questionnaires ESG, collectez les certifications et calculez le score ESG de chaque fournisseur sur 6 dimensions.") },
        { step: 3, title: t('features.supplyChain.steps.2.title', "Suivez et améliorez"), description: t('features.supplyChain.steps.2.description', "Identifiez les fournisseurs à risque, créez des plans d'action corrective et suivez la progression dans le temps.") },
      ]}
      faqs={[
        { question: t('features.supplyChain.faqs.0.question', "Qu'est-ce que la CSDDD et quand entre-t-elle en vigueur ?"), answer: t('features.supplyChain.faqs.0.answer', "La Corporate Sustainability Due Diligence Directive (CSDDD) impose aux grandes entreprises européennes de réaliser une due diligence sur les impacts environnementaux et sociaux de leur chaîne de valeur. Elle s'applique progressivement de 2027 à 2029 selon la taille de l'entreprise.") },
        { question: t('features.supplyChain.faqs.1.question', "Comment le scoring fournisseur fonctionne-t-il ?"), answer: t('features.supplyChain.faqs.1.answer', "Chaque fournisseur est évalué sur 6 dimensions pondérées : environnement, droits humains, conditions de travail, éthique des affaires, achats responsables et gouvernance. Le score combine les réponses au questionnaire, les certifications fournies et les données publiques disponibles.") },
        { question: t('features.supplyChain.faqs.2.question', "Mes fournisseurs doivent-ils créer un compte ?"), answer: t('features.supplyChain.faqs.2.answer', "Non. Vos fournisseurs reçoivent un lien sécurisé vers le portail fournisseur ESG Flow. Ils peuvent répondre au questionnaire, uploader des documents et consulter leur score sans créer de compte.") },
        { question: t('features.supplyChain.faqs.3.question', "Puis-je utiliser ESG Flow pour le Devoir de Vigilance français ?"), answer: t('features.supplyChain.faqs.3.answer', "Oui. ESG Flow structure votre démarche selon les exigences de la loi 2017-399 : cartographie des risques, procédures d'évaluation, actions de prévention et de remédiation, mécanisme d'alerte et suivi. Le tout exportable pour votre plan de vigilance.") },
      ]}
      relatedModules={[
        { name: t('features.supplyChain.related.0.name', "Registre des Risques"), path: '/app/risks', icon: AlertTriangle, color: '#dc2626' },
        { name: t('features.supplyChain.related.1.name', "Compliance"), path: '/app/compliance', icon: ShieldCheck, color: '#7c3aed' },
        { name: t('features.supplyChain.related.2.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.supplyChain.related.3.name', "Piste d'Audit"), path: '/features/audit-trail', icon: ClipboardList, color: '#374151' },
      ]}
    />
  );
}
