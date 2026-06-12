import { Brain, MessageSquare, ScanLine, AlertTriangle, TrendingUp, FileText, Flame, ClipboardList, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function AIAutomationPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Brain}
      color="#db2777"
      colorLight="#fdf2f8"
      title={t('features.aiAutomation.title', "IA & Automatisation ESG")}
      subtitle={t('features.aiAutomation.subtitle', "Intelligence artificielle générative au service de votre reporting ESG")}
      description={t('features.aiAutomation.description', "Accélérez votre démarche ESG grâce à l'IA : chatbot expert réglementaire, OCR de factures et certifications fournisseurs, détection d'anomalies en temps réel, génération de narratifs CSRD et prédictions de tendances. L'IA qui comprend l'ESG.")}
      frameworks={['GPT-4 / Claude', 'OCR Tesseract', 'Machine Learning', 'NLP']}
      appPath="/app/ai-insights"
      benefits={[
        {
          icon: MessageSquare,
          title: t('features.aiAutomation.benefits.0.title', "Chatbot ESG expert"),
          description: t('features.aiAutomation.benefits.0.description', "Posez vos questions en langage naturel : réglementation CSRD, interprétation ESRS, bonnes pratiques sectorielles. Réponses sourcées et contextualisées."),
        },
        {
          icon: ScanLine,
          title: t('features.aiAutomation.benefits.1.title', "OCR documents"),
          description: t('features.aiAutomation.benefits.1.description', "Scannez factures d'énergie, certifications fournisseurs et rapports auditeurs. Extraction automatique des données ESG pertinentes sans ressaisie."),
        },
        {
          icon: AlertTriangle,
          title: t('features.aiAutomation.benefits.2.title', "Détection d'anomalies"),
          description: t('features.aiAutomation.benefits.2.description', "L'IA surveille vos indicateurs ESG en continu et détecte les valeurs aberrantes, les tendances anormales et les incohérences entre sources de données."),
        },
        {
          icon: TrendingUp,
          title: t('features.aiAutomation.benefits.3.title', "Prédictions et tendances"),
          description: t('features.aiAutomation.benefits.3.description', "Anticipez l'évolution de vos KPIs ESG grâce au machine learning. Projections à 12 mois avec intervalles de confiance et facteurs d'influence."),
        },
      ]}
      capabilities={[
        { title: t('features.aiAutomation.capabilities.0.title', "Chatbot réglementaire"), description: t('features.aiAutomation.capabilities.0.description', "Assistant IA formé sur l'intégralité des textes CSRD, ESRS, Taxonomie UE, Loi Sapin II et Devoir de Vigilance. Réponses avec citations des articles et paragraphes sources.") },
        { title: t('features.aiAutomation.capabilities.1.title', "Génération de narratifs CSRD"), description: t('features.aiAutomation.capabilities.1.description', "L'IA génère des ébauches de sections narratives pour votre rapport CSRD conformes à la terminologie ESRS. Politique, actions, métriques et cibles par standard.") },
        { title: t('features.aiAutomation.capabilities.2.title', "OCR factures et certifications"), description: t('features.aiAutomation.capabilities.2.description', "Upload de factures d'énergie (EDF, Enedis), certifications ISO 14001/50001, labels EcoVadis. Extraction automatique des kWh, tCO2e, scores et dates de validité.") },
        { title: t('features.aiAutomation.capabilities.3.title', "Détection d'anomalies temps réel"), description: t('features.aiAutomation.capabilities.3.description', "Algorithmes de détection d'outliers sur vos séries temporelles ESG. Alertes automatiques avec contexte : valeur attendue, écart, causes probables et action recommandée.") },
        { title: t('features.aiAutomation.capabilities.4.title', "Prédictions ML"), description: t('features.aiAutomation.capabilities.4.description', "Modèles de machine learning entraînés sur vos données historiques et les benchmarks sectoriels. Projection des émissions, scores et indicateurs à 3, 6 et 12 mois.") },
        { title: t('features.aiAutomation.capabilities.5.title', "Recommandations d'amélioration"), description: t('features.aiAutomation.capabilities.5.description', "L'IA analyse vos gaps de conformité et vos scores par pilier pour proposer des actions d'amélioration priorisées par impact et facilité de mise en oeuvre.") },
        { title: t('features.aiAutomation.capabilities.6.title', "Résumé exécutif automatique"), description: t('features.aiAutomation.capabilities.6.description', "Génération automatique d'un résumé exécutif de votre situation ESG pour le comité de direction : faits marquants, alertes, progression et prochaines étapes.") },
      ]}
      steps={[
        { step: 1, title: t('features.aiAutomation.steps.0.title', "Activez l'IA"), description: t('features.aiAutomation.steps.0.description', "L'IA s'active dès que vos données ESG sont importées. Aucune configuration requise. L'assistant chatbot est disponible immédiatement.") },
        { step: 2, title: t('features.aiAutomation.steps.1.title', "Importez vos documents"), description: t('features.aiAutomation.steps.1.description', "Uploadez factures, certifications et rapports. L'OCR extrait les données automatiquement et les intègre à votre base ESG.") },
        { step: 3, title: t('features.aiAutomation.steps.2.title', "Exploitez les insights"), description: t('features.aiAutomation.steps.2.description', "Consultez les anomalies détectées, les prédictions et les recommandations. Utilisez le chatbot pour approfondir tout sujet ESG.") },
      ]}
      faqs={[
        { question: t('features.aiAutomation.faqs.0.question', "Quels modèles d'IA sont utilisés ?"), answer: t('features.aiAutomation.faqs.0.answer', "ESG Flow utilise des modèles de langage de dernière génération (GPT-4, Claude) pour le chatbot et la génération de texte, des modèles de vision par ordinateur pour l'OCR, et des algorithmes de machine learning classiques (Isolation Forest, Prophet) pour la détection d'anomalies et les prédictions.") },
        { question: t('features.aiAutomation.faqs.1.question', "Mes données sont-elles utilisées pour entraîner les modèles ?"), answer: t('features.aiAutomation.faqs.1.answer', "Non. Vos données ESG ne sont jamais utilisées pour entraîner ou fine-tuner les modèles d'IA. Elles sont traitées en temps réel via des API sécurisées avec chiffrement en transit et au repos. Aucune donnée n'est conservée par les fournisseurs d'IA.") },
        { question: t('features.aiAutomation.faqs.2.question', "L'IA peut-elle se tromper ?"), answer: t('features.aiAutomation.faqs.2.answer', "Oui. L'IA est un outil d'assistance, pas de décision. Chaque sortie IA (narratif, prédiction, recommandation) est clairement marquée comme générée par l'IA et doit être validée par un humain avant publication. Les sources sont citées pour vérification.") },
        { question: t('features.aiAutomation.faqs.3.question', "L'OCR fonctionne-t-il avec tous les formats de factures ?"), answer: t('features.aiAutomation.faqs.3.answer', "L'OCR prend en charge les formats PDF, JPEG et PNG. Il est optimisé pour les factures des principaux fournisseurs d'énergie français (EDF, Enedis, Engie, TotalEnergies) et les certifications ISO standards. Pour les formats non reconnus, un mapping manuel est proposé.") },
      ]}
      relatedModules={[
        { name: t('features.aiAutomation.related.0.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.aiAutomation.related.1.name', "Bilan Carbone"), path: '/features/bilan-carbone', icon: Flame, color: '#ea580c' },
        { name: t('features.aiAutomation.related.2.name', "Double Matérialité"), path: '/features/double-materialite', icon: Target, color: '#7c3aed' },
        { name: t('features.aiAutomation.related.3.name', "Piste d'Audit"), path: '/features/audit-trail', icon: ClipboardList, color: '#374151' },
      ]}
    />
  );
}
