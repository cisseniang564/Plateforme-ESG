import {
  Code2,
  Tags,
  ShieldCheck,
  FileDown,
  AlertTriangle,
  FileSearch,
  FileText,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeaturePageLayout from './FeaturePageLayout';

export default function IXBRLPage() {
  const { t } = useTranslation();
  return (
    <FeaturePageLayout
      icon={Code2}
      color="#0891b2"
      colorLight="#ecfeff"
      title={t('features.ixbrl.title', "Reporting Structuré iXBRL & Validation Arelle")}
      subtitle={t('features.ixbrl.subtitle', "Générez et validez votre rapport de durabilité au format numérique ESEF, prêt pour le dépôt réglementaire")}
      description={t('features.ixbrl.description', "Transformez votre rapport CSRD en document numérique structuré au format iXBRL conforme à la taxonomie ESRS, avec balisage automatisé de vos indicateurs et de vos données narratives. Validez la conformité technique de votre fichier grâce au moteur open-source Arelle, intégré nativement, et obtenez un rapport d'erreurs détaillé avant tout dépôt officiel.")}
      frameworks={['ESEF', 'iXBRL', 'Arelle', 'Taxonomie ESRS']}
      appPath="/app/compliance/ixbrl"
      benefits={[
        {
          icon: Tags,
          title: t('features.ixbrl.benefits.0.title', "Balisage automatique selon la taxonomie ESRS"),
          description: t('features.ixbrl.benefits.0.description', "Vos indicateurs et textes de rapport sont automatiquement associés (« tagués ») aux éléments correspondants de la taxonomie XBRL ESRS, avec proposition de mapping et possibilité de révision manuelle."),
        },
        {
          icon: ShieldCheck,
          title: t('features.ixbrl.benefits.1.title', "Validation Arelle intégrée"),
          description: t('features.ixbrl.benefits.1.description', "Le moteur de validation open-source Arelle, référence du marché pour les contrôles XBRL/iXBRL, est intégré nativement pour vérifier la conformité technique de votre fichier avant dépôt."),
        },
        {
          icon: FileDown,
          title: t('features.ixbrl.benefits.2.title', "Export ESEF prêt au dépôt"),
          description: t('features.ixbrl.benefits.2.description', "Générez un package iXBRL/XHTML conforme au format européen unique d'information électronique (ESEF), prêt à être transmis à votre mécanisme officiellement désigné (OAM) ou à votre auditeur."),
        },
        {
          icon: AlertTriangle,
          title: t('features.ixbrl.benefits.3.title', "Rapport d'erreurs détaillé"),
          description: t('features.ixbrl.benefits.3.description', "En cas d'anomalie de balisage ou de non-conformité à la taxonomie, un rapport détaillé localise précisément chaque erreur ou avertissement pour correction avant la génération finale."),
        },
      ]}
      capabilities={[
        { title: t('features.ixbrl.capabilities.0.title', "Mapping automatique vers la taxonomie ESRS"), description: t('features.ixbrl.capabilities.0.description', "Chaque indicateur quantitatif et chaque section narrative de votre rapport CSRD est associé à l'élément correspondant de la taxonomie XBRL ESRS publiée par l'EFRAG, avec suggestions de correspondance basées sur votre structure de données.") },
        { title: t('features.ixbrl.capabilities.1.title', "Édition et révision manuelle des balises"), description: t('features.ixbrl.capabilities.1.description', "Visualisez et ajustez manuellement chaque balise XBRL appliquée à vos données : élément de taxonomie, contexte, unité, période et dimensions, avant la génération du fichier final.") },
        { title: t('features.ixbrl.capabilities.2.title', "Génération du package iXBRL/XHTML"), description: t('features.ixbrl.capabilities.2.description', "Produisez automatiquement un document XHTML balisé en iXBRL intégrant à la fois la version lisible (mise en forme) et la version structurée (données XBRL) de votre rapport, conformément au format ESEF.") },
        { title: t('features.ixbrl.capabilities.3.title', "Validation technique via Arelle"), description: t('features.ixbrl.capabilities.3.description', "Le moteur Arelle exécute l'ensemble des règles de validation de la taxonomie ESRS sur votre fichier (cohérence des contextes, unités, calculs, dimensions) et produit un journal de validation détaillé.") },
        { title: t('features.ixbrl.capabilities.4.title', "Rapport d'erreurs et d'avertissements localisés"), description: t('features.ixbrl.capabilities.4.description', "Chaque anomalie détectée est localisée précisément dans le document (élément, contexte, ligne) avec une description de la règle de validation concernée, facilitant la correction ciblée.") },
        { title: t('features.ixbrl.capabilities.5.title', "Versioning des packages générés"), description: t('features.ixbrl.capabilities.5.description', "Conservez l'historique des versions de votre package iXBRL généré au fil des itérations de correction, avec accès aux rapports de validation associés à chaque version.") },
        { title: t('features.ixbrl.capabilities.6.title', "Export multi-formats"), description: t('features.ixbrl.capabilities.6.description', "En complément du package iXBRL/ESEF, exportez votre rapport balisé au format PDF ou Excel pour vos besoins internes de relecture, de gouvernance ou de présentation aux instances dirigeantes.") },
        { title: t('features.ixbrl.capabilities.7.title', "Traçabilité complète du balisage"), description: t('features.ixbrl.capabilities.7.description', "Chaque opération de balisage, de modification ou de validation est enregistrée dans la piste d'audit de la plateforme, garantissant la traçabilité requise pour l'assurance par votre commissaire aux comptes.") },
      ]}
      steps={[
        { step: 1, title: t('features.ixbrl.steps.0.title', "Importez votre rapport CSRD"), description: t('features.ixbrl.steps.0.description', "Sélectionnez le rapport de durabilité finalisé (issu du module Reporting CSRD) que vous souhaitez convertir au format numérique structuré ESEF.") },
        { step: 2, title: t('features.ixbrl.steps.1.title', "Balisage automatique et révision"), description: t('features.ixbrl.steps.1.description', "La plateforme propose un mapping automatique de vos données vers la taxonomie ESRS. Révisez et ajustez les balises si nécessaire à l'aide de l'éditeur intégré.") },
        { step: 3, title: t('features.ixbrl.steps.2.title', "Validation Arelle et export"), description: t('features.ixbrl.steps.2.description', "Lancez la validation technique via Arelle, corrigez les éventuelles anomalies signalées, puis générez le package iXBRL/ESEF prêt pour le dépôt officiel.") },
      ]}
      faqs={[
        { question: t('features.ixbrl.faqs.0.question', "Qu'est-ce que l'iXBRL et pourquoi est-ce obligatoire ?"), answer: t('features.ixbrl.faqs.0.answer', "L'iXBRL (Inline XBRL) est un format de document combinant une présentation lisible par un humain et des données structurées lisibles par une machine. Il est requis dans le cadre du format européen unique d'information électronique (ESEF) pour le dépôt des rapports annuels, y compris la déclaration de durabilité CSRD, balisée selon la taxonomie ESRS.") },
        { question: t('features.ixbrl.faqs.1.question', "Qu'est-ce que le moteur Arelle ?"), answer: t('features.ixbrl.faqs.1.answer', "Arelle est un moteur open-source de référence pour le traitement et la validation de fichiers XBRL et iXBRL. Il vérifie la conformité d'un document à une taxonomie donnée (cohérence des balises, des contextes, des calculs) et produit un rapport de validation détaillé. Il est utilisé par de nombreux régulateurs et cabinets d'audit dans le monde.") },
        { question: t('features.ixbrl.faqs.2.question', "Puis-je corriger les erreurs de balisage avant le dépôt final ?"), answer: t('features.ixbrl.faqs.2.answer', "Oui. Le rapport de validation Arelle localise précisément chaque erreur ou avertissement. Vous pouvez ajuster les balises concernées dans l'éditeur intégré, puis relancer la validation autant de fois que nécessaire jusqu'à obtenir un fichier conforme.") },
        { question: t('features.ixbrl.faqs.3.question', "Le balisage couvre-t-il l'ensemble des points de données ESRS ?"), answer: t('features.ixbrl.faqs.3.answer', "Le module s'appuie sur la taxonomie ESRS publiée par l'EFRAG et couvre les points de données quantitatifs et les éléments narratifs structurés selon le principe de double matérialité. Le périmètre de balisage suit les évolutions de la taxonomie officielle.") },
        { question: t('features.ixbrl.faqs.4.question', "Le fichier généré est-il accepté par les mécanismes de dépôt nationaux ?"), answer: t('features.ixbrl.faqs.4.answer', "Le package généré est conforme au format ESEF (iXBRL/XHTML) attendu par les mécanismes officiellement désignés (OAM) des États membres pour le dépôt des rapports annuels. Nous vous recommandons de vérifier les modalités de transmission spécifiques à votre mécanisme national avant le dépôt final.") },
      ]}
      relatedModules={[
        { name: t('features.ixbrl.related.0.name', "Reporting CSRD"), path: '/features/csrd-reporting', icon: FileText, color: '#0369a1' },
        { name: t('features.ixbrl.related.1.name', "Analyse ESRS"), path: '/app/esrs-gap', icon: BookOpen, color: '#7c3aed' },
        { name: t('features.ixbrl.related.2.name', "Multi-référentiels"), path: '/app/reports/multi-standards', icon: FileSearch, color: '#059669' },
        { name: t('features.ixbrl.related.3.name', "Piste d'Audit"), path: '/features/audit-trail', icon: ClipboardList, color: '#374151' },
      ]}
    />
  );
}
