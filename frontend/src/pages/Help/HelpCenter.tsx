/**
 * HelpCenter — Searchable user documentation & knowledge base.
 * Public page accessible at /help (no auth required).
 */
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Leaf, BookOpen, BarChart3, Shield, Zap, FileText,
  Settings, ChevronRight, ChevronDown, HelpCircle, Mail,
  MessageSquare, ExternalLink, Play, CheckCircle, ArrowLeft,
  Globe, Lock, Users, Database, Truck, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  desc: string;
  articles: Article[];
}

// ─── Knowledge base ───────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    icon: Play,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Démarrage rapide',
    desc: 'Tout ce qu\'il faut pour être opérationnel en 30 minutes.',
    articles: [
      {
        id: 'gs-1',
        title: 'Créer votre compte et configurer votre organisation',
        tags: ['compte', 'organisation', 'onboarding'],
        content: `
## Créer votre compte

1. Rendez-vous sur [app.esgflow.com/register](/register) et renseignez votre e-mail professionnel.
2. Choisissez un mot de passe (min. 8 caractères, 1 majuscule, 1 chiffre).
3. Vérifiez votre e-mail et cliquez sur le lien de confirmation.

## Configurer votre organisation

Lors du premier accès, l'assistant d'onboarding vous guide en 4 étapes :
- **Secteur d'activité** — code NAF / NACE pour le benchmarking sectoriel.
- **Effectif** — détermine les seuils CSRD applicables.
- **Périmètre géographique** — pour les indicateurs régionaux.
- **Référentiels** — sélectionnez les normes cibles (CSRD, GRI, TCFD…).

> **Conseil** : vous pouvez modifier ces paramètres à tout moment dans **Paramètres › Organisation**.
        `,
      },
      {
        id: 'gs-2',
        title: 'Importer vos premières données ESG',
        tags: ['import', 'csv', 'données', 'excel'],
        content: `
## Formats acceptés

- **CSV / Excel** (xlsx, xls) — colonnes: indicateur, valeur, unité, période, source.
- **API REST** — endpoint \`POST /api/v1/indicators/bulk\`.
- **Connecteurs natifs** — SAP, Sage, Oracle (plan Business+).

## Procédure d'import CSV

1. Téléchargez le **modèle CSV** depuis *Données › Importer*.
2. Remplissez vos données en respectant les colonnes.
3. Glissez le fichier dans la zone de dépôt.
4. Vérifiez l'aperçu et corrigez les erreurs signalées.
5. Cliquez sur **Valider l'import**.

Les erreurs courantes : mauvais séparateur décimal (utilisez le point \`.\`), dates au format ISO 8601 (AAAA-MM-JJ), unités non reconnues (consultez la bibliothèque d'unités).
        `,
      },
      {
        id: 'gs-3',
        title: 'Comprendre votre tableau de bord ESG',
        tags: ['dashboard', 'score', 'kpi'],
        content: `
## Anatomie du dashboard exécutif

Le tableau de bord présente trois zones :

1. **Score global /100** — agrégat pondéré des piliers E, S, G.
2. **Tendances** — évolution sur 12 mois, comparé au secteur.
3. **Alertes IA** — anomalies et recommandations prioritaires.

## Comprendre votre score

| Plage | Niveau | Signification |
|-------|--------|---------------|
| 80–100 | Leader | Performance ESG exemplaire |
| 60–79 | Avancé | Bonne trajectoire, quelques axes d'amélioration |
| 40–59 | En progression | Actions correctives à initier |
| < 40 | Débutant | Plan de progrès recommandé |

## Personnaliser les poids

Allez dans **Paramètres › Méthodologie** pour ajuster la pondération des piliers E/S/G selon votre stratégie.
        `,
      },
    ],
  },
  {
    id: 'carbon',
    icon: TrendingUp,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Bilan Carbone & Scope 3',
    desc: 'Calculez vos émissions Scope 1, 2 et 3 selon le GHG Protocol.',
    articles: [
      {
        id: 'c-1',
        title: 'Différence entre Scope 1, 2 et 3',
        tags: ['scope1', 'scope2', 'scope3', 'ghg', 'carbone'],
        content: `
## Les trois périmètres d'émissions

**Scope 1 — Émissions directes** : combustion dans vos propres installations et véhicules.

**Scope 2 — Émissions indirectes liées à l'énergie** : électricité, vapeur, chaleur achetées.

**Scope 3 — Autres émissions indirectes** (15 catégories GHG Protocol) :
- *En amont* : achats de biens & services, capital goods, déplacements professionnels…
- *En aval* : utilisation des produits vendus, fin de vie, franchises…

> **Attention CSRD** : la directive impose la déclaration des Scopes 1, 2 et des catégories Scope 3 pertinentes.

## Facteurs d'émission intégrés

ESGFlow embarque la base ADEME (France) et les facteurs IEA pour 80+ pays. Ils sont mis à jour automatiquement chaque trimestre.
        `,
      },
      {
        id: 'c-2',
        title: 'Configurer votre plan de décarbonation SBTi',
        tags: ['sbti', 'décarbonation', 'trajectoire', '1.5°C'],
        content: `
## Qu'est-ce que SBTi ?

L'initiative *Science Based Targets* (SBTi) permet aux entreprises de définir des objectifs de réduction d'émissions alignés sur une trajectoire +1,5 °C ou +2 °C.

## Dans ESGFlow

1. Accédez à **Décarbonation › Plan SBTi**.
2. Définissez votre **année de référence** et votre **horizon cible** (2030, 2050).
3. L'outil calcule automatiquement la trajectoire annuelle requise.
4. Ajoutez vos **actions** (efficacité énergétique, achats verts, mobilité…) avec leur impact estimé.
5. Suivez l'avancement en temps réel sur le graphique de convergence.
        `,
      },
    ],
  },
  {
    id: 'csrd',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Conformité CSRD & Rapports',
    desc: 'Générez vos rapports ESRS, GRI, TCFD en un clic.',
    articles: [
      {
        id: 'r-1',
        title: 'Générer votre rapport CSRD / ESRS',
        tags: ['csrd', 'esrs', 'rapport', 'conformité'],
        content: `
## La CSRD en bref

La Corporate Sustainability Reporting Directive (CSRD) s'applique progressivement à partir de 2024. Elle impose la publication d'informations de durabilité selon les normes ESRS.

## Dans ESGFlow — CSRD Report Builder

1. Allez dans **Rapports › Constructeur CSRD**.
2. Sélectionnez vos **ESRS applicables** (auto-détectés selon votre secteur et taille).
3. Les données déjà saisies sont **pré-remplies** automatiquement.
4. Complétez les champs manquants (signalés en orange).
5. Cliquez sur **Générer le rapport** — format Word, PDF ou XBRL iXBRL.

## Piste d'audit certifiable

Chaque donnée porte un horodatage SHA-256 et une traçabilité source → calcul → rapport, compatible ISAE 3000.
        `,
      },
      {
        id: 'r-2',
        title: 'Programmer des rapports automatiques',
        tags: ['rapport', 'automatique', 'planification', 'email'],
        content: `
## Rapports planifiés

Dans **Rapports › Rapports planifiés**, configurez :

- **Fréquence** : mensuel, trimestriel, annuel.
- **Format** : PDF, Excel, Word.
- **Destinataires** : ajoutez les e-mails des parties prenantes.
- **Référentiel** : CSRD, GRI, TCFD, PRI ou personnalisé.

Les rapports sont générés la nuit (00h00 UTC) et envoyés par e-mail avec lien de téléchargement sécurisé valable 30 jours.
        `,
      },
    ],
  },
  {
    id: 'supply-chain',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Supply Chain ESG',
    desc: 'Évaluez et pilotez la performance ESG de vos fournisseurs.',
    articles: [
      {
        id: 'sc-1',
        title: 'Envoyer des questionnaires à vos fournisseurs',
        tags: ['fournisseur', 'questionnaire', 'supply chain', 'due diligence'],
        content: `
## Module Supply Chain

ESGFlow permet d'évaluer vos fournisseurs sur 6 dimensions ESG : environnement, droit du travail, éthique, diversité, gouvernance, chaîne d'approvisionnement.

## Envoyer un questionnaire

1. Accédez à **Supply Chain › Fournisseurs**.
2. Ajoutez vos fournisseurs (import CSV ou saisie manuelle).
3. Sélectionnez le **template** de questionnaire (CSRD Tier 1, Devoir de Vigilance, personnalisé).
4. Cliquez sur **Envoyer** — le fournisseur reçoit un lien unique sécurisé.
5. Suivez les réponses et les scores dans le tableau de bord Supply Chain.

## Plan de vigilance

Conformément à la loi 2017-399 (Devoir de Vigilance), le module génère automatiquement le plan de vigilance avec les actions correctives identifiées.
        `,
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    title: 'Sécurité & Confidentialité',
    desc: 'Authentification, 2FA, RGPD et gestion des accès.',
    articles: [
      {
        id: 'sec-1',
        title: 'Activer l\'authentification à deux facteurs (2FA)',
        tags: ['2fa', 'sécurité', 'totp', 'authentification'],
        content: `
## Pourquoi activer la 2FA ?

La 2FA ajoute une couche de sécurité en demandant, en plus de votre mot de passe, un code à 6 chiffres généré par une application sur votre smartphone.

## Applications compatibles

Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden.

## Activation

1. Allez dans **Paramètres › Sécurité**.
2. Cliquez sur **Activer la 2FA**.
3. Scannez le QR code avec votre application.
4. Entrez le code à 6 chiffres affiché pour confirmer.
5. **Sauvegardez vos 8 codes de secours** dans un endroit sûr (gestionnaire de mots de passe).

> En cas de perte de votre téléphone, utilisez un code de secours pour vous connecter.
        `,
      },
      {
        id: 'sec-2',
        title: 'Gérer les rôles et permissions utilisateurs',
        tags: ['rôles', 'permissions', 'utilisateurs', 'accès'],
        content: `
## Rôles disponibles

| Rôle | Droits |
|------|--------|
| **Admin** | Accès complet, gestion des utilisateurs et facturation |
| **Manager** | Lecture + écriture sur toutes les données, pas d'accès facturation |
| **Contributeur** | Saisie et modification des données de son périmètre uniquement |
| **Lecteur** | Consultation seule, export autorisé |

## Inviter un utilisateur

1. Accédez à **Paramètres › Utilisateurs**.
2. Cliquez sur **Inviter**.
3. Renseignez l'e-mail et le rôle souhaité.
4. L'utilisateur reçoit un e-mail d'invitation valable 7 jours.
        `,
      },
    ],
  },
  {
    id: 'api',
    icon: Database,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'API & Intégrations',
    desc: 'Connectez ESGFlow à vos outils métier via l\'API REST.',
    articles: [
      {
        id: 'api-1',
        title: 'Authentification API — Bearer Token',
        tags: ['api', 'token', 'authentification', 'rest'],
        content: `
## Obtenir votre clé API

1. Accédez à **Paramètres › Intégrations › API**.
2. Cliquez sur **Générer une nouvelle clé**.
3. Copiez la clé — elle ne sera affichée qu'une seule fois.

## Utilisation

\`\`\`http
GET /api/v1/indicators
Authorization: Bearer <votre_clé_api>
Content-Type: application/json
\`\`\`

## Limites de débit

| Plan | Appels / min | Appels / jour |
|------|-------------|---------------|
| Starter | 60 | 10 000 |
| Business | 300 | 100 000 |
| Enterprise | Illimité | Illimité |
        `,
      },
      {
        id: 'api-2',
        title: 'Configurer un webhook',
        tags: ['webhook', 'notification', 'intégration'],
        content: `
## À quoi servent les webhooks ?

Les webhooks permettent à ESGFlow de notifier votre système en temps réel lors d'événements : nouveau score calculé, rapport généré, alerte déclenchée, etc.

## Configuration

1. Accédez à **Paramètres › Webhooks**.
2. Cliquez sur **Ajouter un endpoint**.
3. Renseignez votre URL HTTPS (obligatoire).
4. Sélectionnez les événements à écouter.
5. Sauvegardez — un secret de signature est généré.

## Vérification de signature

Chaque appel inclut l'en-tête \`X-ESGFlow-Signature: sha256=<hmac>\`. Vérifiez-le côté serveur pour sécuriser votre endpoint.
        `,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HelpCenter() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Flatten all articles for search
  const allArticles = useMemo(() =>
    CATEGORIES.flatMap(cat => cat.articles.map(a => ({ ...a, catId: cat.id, catTitle: cat.title }))),
    []
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q)) ||
      a.content.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allArticles]);

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory);

  // Simple markdown renderer (bold, h2, h3, lists, tables, code blocks)
  function renderMarkdown(md: string) {
    const lines = md.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (!tableRows.length) return;
      const header = tableRows[0];
      const body = tableRows.slice(2); // skip separator row
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {header.map((h, i) => <th key={i} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{h.trim()}</th>)}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  {row.map((cell, ci) => <td key={ci} className="border border-gray-200 px-3 py-2 text-gray-600">{cell.trim()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true; codeLines = [];
        } else {
          elements.push(<pre key={i} className="bg-slate-900 text-green-300 rounded-xl p-4 overflow-x-auto text-sm font-mono my-4"><code>{codeLines.join('\n')}</code></pre>);
          inCodeBlock = false;
        }
        return;
      }
      if (inCodeBlock) { codeLines.push(line); return; }

      if (line.startsWith('|')) {
        inTable = true;
        tableRows.push(line.split('|').filter(Boolean));
        return;
      }
      if (inTable) flushTable();

      if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={i} className="border-l-4 border-green-400 pl-4 py-1 bg-green-50 rounded-r-xl text-sm text-green-800 my-3">{line.slice(2)}</blockquote>);
      } else if (line.match(/^[0-9]+\. /)) {
        elements.push(<li key={i} className="list-decimal list-inside text-gray-600 text-sm mb-1 ml-2">{line.replace(/^[0-9]+\. /, '')}</li>);
      } else if (line.startsWith('- ')) {
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<li key={i} className="list-disc list-inside text-gray-600 text-sm mb-1 ml-2" dangerouslySetInnerHTML={{ __html: text }} />);
      } else if (line.trim()) {
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-600 underline hover:text-green-700">$1</a>');
        elements.push(<p key={i} className="text-gray-600 text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: html }} />);
      }
    });
    if (inTable) flushTable();
    return elements;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-green-950 to-emerald-900 text-white px-8 py-10 shadow-xl">
        <div>
          {/* Top bar: back button + logo */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </button>
            <Link to="/app/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-3.5 w-3.5 text-white" />
              </div>
              ESGFlow
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold mb-3">Centre d'aide</h1>
          <p className="text-slate-300 mb-8">Guides, tutoriels et réponses à toutes vos questions.</p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveArticle(null); setActiveCategory(null); }}
              placeholder="Rechercher un article, une fonctionnalité…"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all text-sm backdrop-blur-sm"
            />
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setActiveArticle(a); setQuery(''); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <BookOpen className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                    <div className="text-xs text-gray-400">{(a as any).catTitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">Aucun résultat pour « {query} ».</p>
          )}
        </div>
      </div>

      <div>

        {/* Article view */}
        {activeArticle ? (
          <div>
            <button
              onClick={() => setActiveArticle(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">{activeArticle.title}</h1>
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(activeArticle.content)}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
                <p className="text-sm text-gray-500">Cet article vous a-t-il aidé ?</p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-green-50 hover:border-green-300 transition-colors text-gray-600">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Oui
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-red-50 hover:border-red-200 transition-colors text-gray-600">
                  Pas vraiment
                </button>
              </div>
            </div>
          </div>

        ) : activeCategory && currentCategory ? (
          /* Category articles list */
          <div>
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Toutes les catégories
            </button>
            <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${currentCategory.bg}`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <currentCategory.icon className={`h-5 w-5 ${currentCategory.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{currentCategory.title}</h2>
                <p className="text-sm text-gray-600">{currentCategory.desc}</p>
              </div>
            </div>
            <div className="space-y-3">
              {currentCategory.articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{article.title}</div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {article.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>

        ) : (
          /* Category grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="group flex flex-col items-start p-5 bg-white rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-11 h-11 ${cat.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">{cat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    {cat.articles.length} article{cat.articles.length > 1 ? 's' : ''} <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>

            {/* Popular articles */}
            <div className="mb-12">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Articles populaires</h2>
              <div className="space-y-2">
                {allArticles.slice(0, 5).map(a => (
                  <button
                    key={a.id}
                    onClick={() => setActiveArticle(a)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-green-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 transition-colors">{a.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Contact support */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="mailto:support@esgflow.com" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-blue-300 transition-all text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">E-mail</div>
                  <div className="text-xs text-gray-500">Réponse sous 4h ouvrées</div>
                </div>
              </a>
              <Link to="/support" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-green-300 transition-all text-center">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Support en ligne</div>
                  <div className="text-xs text-gray-500">Ticketing & live chat</div>
                </div>
              </Link>
              <Link to="/app/api-docs" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-300 transition-all text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ExternalLink className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Documentation API</div>
                  <div className="text-xs text-gray-500">Référence technique complète</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
