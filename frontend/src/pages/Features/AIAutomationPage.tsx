import { Brain, MessageSquare, AlertTriangle, TrendingUp, FileText, Flame, ClipboardList, Target } from 'lucide-react';
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
      description={t('features.aiAutomation.description', "Accélérez votre démarche ESG avec l'IA : assistant réglementaire, détection d'anomalies statistiques, prévisions de tendances et génération d'ébauches de narratifs CSRD. Chaque sortie est une aide à valider par un humain.")}
      frameworks={['Modèles de langage', 'Détection statistique (Z-score)', 'Prévision (ARIMA / Holt-Winters)', 'Règles métier']}
      appPath="/app/intelligence"
      benefits={[
        {
          icon: MessageSquare,
          title: t('features.aiAutomation.benefits.0.title', "Chatbot ESG expert"),
          description: t('features.aiAutomation.benefits.0.description', "Posez vos questions en langage naturel : réglementation CSRD, interprétation ESRS, bonnes pratiques sectorielles. Réponses contextualisées avec vos derniers scores ESG."),
        },
        {
          icon: AlertTriangle,
          title: t('features.aiAutomation.benefits.2.title', "Détection d'anomalies"),
          description: t('features.aiAutomation.benefits.2.description', "Une analyse statistique (Z-score) repère les valeurs aberrantes dans vos indicateurs ESG."),
        },
        {
          icon: TrendingUp,
          title: t('features.aiAutomation.benefits.3.title', "Prédictions et tendances"),
          description: t('features.aiAutomation.benefits.3.description', "Anticipez l'évolution de vos KPIs ESG grâce à des modèles de prévision (ARIMA, Holt-Winters, régression). Projections avec intervalles de confiance à 95 %."),
        },
      ]}
      capabilities={[
        { title: t('features.aiAutomation.capabilities.0.title', "Chatbot réglementaire"), description: t('features.aiAutomation.capabilities.0.description', "Assistant IA qui répond sur la CSRD, les ESRS, la Taxonomie UE, la loi Sapin II et le Devoir de vigilance, avec le contexte de vos scores. Vérifiez toujours les références citées.") },
        { title: t('features.aiAutomation.capabilities.1.title', "Génération de narratifs CSRD"), description: t('features.aiAutomation.capabilities.1.description', "L'IA génère des ébauches de sections narratives pour votre rapport CSRD conformes à la terminologie ESRS. Politique, actions, métriques et cibles par standard.") },
        { title: t('features.aiAutomation.capabilities.3.title', "Détection d'anomalies"), description: t('features.aiAutomation.capabilities.3.description', "Détection statistique des valeurs aberrantes (Z-score) sur vos indicateurs ESG, avec la valeur observée et l'écart constaté.") },
        { title: t('features.aiAutomation.capabilities.4.title', "Prédictions ML"), description: t('features.aiAutomation.capabilities.4.description', "Prévision statistique (ARIMA, Holt-Winters ou régression) sur l'historique de vos indicateurs, à partir de 3 points de données, avec intervalle de confiance à 95 %.") },
        { title: t('features.aiAutomation.capabilities.5.title', "Recommandations d'amélioration"), description: t('features.aiAutomation.capabilities.5.description', "L'IA analyse vos gaps de conformité et vos scores par pilier pour proposer des actions d'amélioration priorisées par impact et facilité de mise en oeuvre.") },
        { title: t('features.aiAutomation.capabilities.6.title', "Résumé exécutif automatique"), description: t('features.aiAutomation.capabilities.6.description', "Génération automatique d'un résumé exécutif de votre situation ESG pour le comité de direction : faits marquants, alertes, progression et prochaines étapes.") },
      ]}
      steps={[
        { step: 1, title: t('features.aiAutomation.steps.0.title', "Activez l'IA"), description: t('features.aiAutomation.steps.0.description', "L'IA s'active dès que vos données ESG sont importées. Aucune configuration requise. L'assistant chatbot est disponible immédiatement.") },
        { step: 2, title: t('features.aiAutomation.steps.1.title', "Importez vos données"), description: t('features.aiAutomation.steps.1.description', "Saisissez ou importez vos données ESG : les analyses s'appuient sur votre historique.") },
        { step: 3, title: t('features.aiAutomation.steps.2.title', "Exploitez les insights"), description: t('features.aiAutomation.steps.2.description', "Consultez les anomalies détectées, les prédictions et les recommandations. Utilisez le chatbot pour approfondir tout sujet ESG.") },
      ]}
      faqs={[
        { question: t('features.aiAutomation.faqs.0.question', "Quels modèles d'IA sont utilisés ?"), answer: t('features.aiAutomation.faqs.0.answer', "Un modèle de langage de type GPT est utilisé pour l'assistant et la génération de texte ; la détection d'anomalies et les prévisions reposent sur des méthodes statistiques classiques (Z-score, ARIMA, Holt-Winters).") },
        { question: t('features.aiAutomation.faqs.1.question', "Mes données sont-elles utilisées pour entraîner les modèles ?"), answer: t('features.aiAutomation.faqs.1.answer', "ESGFlow n'entraîne ni ne affine aucun modèle avec vos données. Pour l'assistant et la rédaction, le texte nécessaire est envoyé à un fournisseur de modèle de langage via une API chiffrée (HTTPS) ; consultez ses conditions d'utilisation des données.") },
        { question: t('features.aiAutomation.faqs.2.question', "L'IA peut-elle se tromper ?"), answer: t('features.aiAutomation.faqs.2.answer', "Oui. L'IA est un outil d'assistance, pas de décision. Chaque sortie IA (narratif, prédiction, recommandation) est clairement marquée comme générée par l'IA et doit être validée par un humain avant publication. Les sources sont citées pour vérification.") },
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
