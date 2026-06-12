import { FileText, BookOpen, CheckCircle, Shield, Download, GitMerge, ClipboardList, Layers, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function CSRDReportingPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={FileText}
      color="#0369a1"
      colorLight="#f0f9ff"
      title={t('features.csrdReporting.title', "Reporting CSRD / ESRS")}
      subtitle={t('features.csrdReporting.subtitle', "Construisez votre rapport de durabilité CSRD conforme aux normes ESRS")}
      description={t('features.csrdReporting.description', "ESG Flow couvre les 82 exigences des normes ESRS (European Sustainability Reporting Standards) avec un éditeur de rapport structuré, une gap analysis automatique et des exports multi-formats prêts pour vos auditeurs.")}
      frameworks={['CSRD', 'ESRS Set 1', 'EFRAG', 'ESEF/iXBRL']}
      appPath="/app/reports/csrd-builder"
      benefits={[
        {
          icon: BookOpen,
          title: t('features.csrdReporting.benefits.0.title', "82 exigences ESRS mappées"),
          description: t('features.csrdReporting.benefits.0.description', "Chaque exigence ESRS est structurée avec ses indicateurs requis, ses seuils de matérialité et ses exemples de réponse. Vous ne manquez rien."),
        },
        {
          icon: CheckCircle,
          title: t('features.csrdReporting.benefits.1.title', "Gap analysis automatique"),
          description: t('features.csrdReporting.benefits.1.description', "Identifiez en un clic les exigences non couvertes, partiellement renseignées ou complètes. Score de conformité global et par standard."),
        },
        {
          icon: Download,
          title: t('features.csrdReporting.benefits.2.title', "Export multi-formats"),
          description: t('features.csrdReporting.benefits.2.description', "Générez votre rapport en PDF, Word, Excel ou JSON. Format iXBRL/ESEF pour le dépôt réglementaire européen."),
        },
        {
          icon: Shield,
          title: t('features.csrdReporting.benefits.3.title', "Prêt pour l'audit"),
          description: t('features.csrdReporting.benefits.3.description', "Chaque indicateur est tracé avec sa source, sa date et son responsable. Journal d'audit détaillé avec empreintes SHA-256 par entrée."),
        },
      ]}
      capabilities={[
        { title: t('features.csrdReporting.capabilities.0.title', "Éditeur de rapport structuré"), description: t('features.csrdReporting.capabilities.0.description', "Construisez votre rapport section par section selon la structure ESRS : informations générales (ESRS 2), environnement (E1-E5), social (S1-S4) et gouvernance (G1).") },
        { title: t('features.csrdReporting.capabilities.1.title', "Score de complétion en temps réel"), description: t('features.csrdReporting.capabilities.1.description', "Suivez votre progression avec un score global /100 et par standard. Identifiez les sections qui nécessitent encore du travail.") },
        { title: t('features.csrdReporting.capabilities.2.title', "Double matérialité intégrée"), description: t('features.csrdReporting.capabilities.2.description', "Lien direct avec votre analyse de double matérialité : seuls les standards matériels pour votre entreprise sont requis dans le rapport.") },
        { title: t('features.csrdReporting.capabilities.3.title', "Indicateurs quantitatifs & narratifs"), description: t('features.csrdReporting.capabilities.3.description', "Saisissez vos données chiffrées ET vos explications narratives. L'IA peut générer des ébauches de narratifs conformes ESRS.") },
        { title: t('features.csrdReporting.capabilities.4.title', "Mapping multi-référentiels"), description: t('features.csrdReporting.capabilities.4.description', "Vos données CSRD sont automatiquement mappées vers GRI, CDP, TCFD et SDG. Une seule saisie pour tous vos reportings.") },
        { title: t('features.csrdReporting.capabilities.5.title', "Workflow de validation"), description: t('features.csrdReporting.capabilities.5.description', "Soumettez chaque section pour révision et approbation. Historique complet des modifications avec motifs.") },
        { title: t('features.csrdReporting.capabilities.6.title', "Export iXBRL/ESEF"), description: t('features.csrdReporting.capabilities.6.description', "Produisez le balisage iXBRL conforme au format ESEF pour le dépôt auprès des autorités de marché européennes.") },
        { title: t('features.csrdReporting.capabilities.7.title', "Comparaison N/N-1"), description: t('features.csrdReporting.capabilities.7.description', "Comparez automatiquement vos indicateurs avec l'exercice précédent. Variations calculées et mises en évidence.") },
      ]}
      steps={[
        { step: 1, title: t('features.csrdReporting.steps.0.title', "Réalisez votre gap analysis"), description: t('features.csrdReporting.steps.0.description', "ESG Flow analyse vos données existantes et identifie les écarts par rapport aux 82 exigences ESRS. Score de conformité instant.") },
        { step: 2, title: t('features.csrdReporting.steps.1.title', "Complétez votre rapport"), description: t('features.csrdReporting.steps.1.description', "Renseignez les indicateurs manquants section par section. L'IA vous aide à rédiger les narratifs conformes.") },
        { step: 3, title: t('features.csrdReporting.steps.2.title', "Exportez et soumettez"), description: t('features.csrdReporting.steps.2.description', "Générez votre rapport en PDF/Word pour la direction et en iXBRL pour le dépôt réglementaire. Tout est auditable.") },
      ]}
      faqs={[
        { question: t('features.csrdReporting.faqs.0.question', "Mon entreprise est-elle concernée par la CSRD ?"), answer: t('features.csrdReporting.faqs.0.answer', "La CSRD s'applique par vagues : 2025 pour les grandes entreprises cotées (>500 salariés), 2026 pour les grandes entreprises (>250 salariés, >40M€ CA ou >20M€ bilan), et progressivement pour les PME cotées. L'Omnibus CSRD (2025) pourrait relever ces seuils.") },
        { question: t('features.csrdReporting.faqs.1.question', "Quelles normes ESRS sont couvertes ?"), answer: t('features.csrdReporting.faqs.1.answer', "ESG Flow couvre l'intégralité du Set 1 ESRS publié par l'EFRAG : ESRS 1 (exigences générales), ESRS 2 (informations générales), E1 à E5 (environnement), S1 à S4 (social) et G1 (gouvernance). Les standards sectoriels seront ajoutés dès leur publication.") },
        { question: t('features.csrdReporting.faqs.2.question', "L'IA peut-elle rédiger mon rapport ?"), answer: t('features.csrdReporting.faqs.2.answer', "L'IA d'ESG Flow génère des ébauches de sections narratives conformes à la terminologie ESRS. Vous gardez le contrôle total : chaque texte est modifiable et doit être validé avant publication. L'IA accélère la rédaction, elle ne la remplace pas.") },
        { question: t('features.csrdReporting.faqs.3.question', "Le format iXBRL est-il obligatoire ?"), answer: t('features.csrdReporting.faqs.3.answer', "Le balisage iXBRL au format ESEF est requis pour les rapports de durabilité des entreprises cotées soumises à la directive Transparence. ESG Flow génère le balisage automatiquement à partir de vos données structurées.") },
        { question: t('features.csrdReporting.faqs.4.question', "Puis-je utiliser ESG Flow pour la DPEF ?"), answer: t('features.csrdReporting.faqs.4.answer', "Oui. ESG Flow prend en charge la Déclaration de Performance Extra-Financière (DPEF, Art. L.225-102-1 du Code de commerce) en plus de la CSRD. Vos données sont réutilisables d'un format à l'autre.") },
      ]}
      relatedModules={[
        { name: t('features.csrdReporting.related.0.name', "Analyse ESRS / Gap"), path: '/app/esrs-gap', icon: BookOpen, color: '#7c3aed' },
        { name: t('features.csrdReporting.related.1.name', "Multi-Référentiels"), path: '/app/reports/multi-standards', icon: GitMerge, color: '#0d9488' },
        { name: t('features.csrdReporting.related.2.name', "Piste d'Audit"), path: '/features/audit-trail', icon: ClipboardList, color: '#374151' },
        { name: t('features.csrdReporting.related.3.name', "Taxonomie UE"), path: '/features/taxonomie-ue', icon: Layers, color: '#0369a1' },
      ]}
    />
  );
}
