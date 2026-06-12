import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Lock, Globe, Server, CheckCircle, ArrowRight,
  Key, FileText, Eye, RefreshCw, AlertTriangle, Users,
  Database, Zap, ArrowLeft, Clock, Download, ExternalLink,
  Mail, Building, Activity, ListChecks, Code2,
} from 'lucide-react';

// Last update — bump this anytime the page content materially changes.
// Buyers' DPO/security teams expect this signal.
const LAST_UPDATED = '23 mai 2026';

// ─── Section component ────────────────────────────────────────────────────────
function SecurityCard({
  icon: Icon, color, title, children,
}: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
    blue:    { bg: 'bg-blue-100',    text: 'text-blue-600',    ring: 'ring-blue-200'    },
    violet:  { bg: 'bg-violet-100',  text: 'text-violet-600',  ring: 'ring-violet-200'  },
    amber:   { bg: 'bg-amber-100',   text: 'text-amber-600',   ring: 'ring-amber-200'   },
    slate:   { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200'   },
    red:     { bg: 'bg-red-100',     text: 'text-red-600',     ring: 'ring-red-200'     },
  };
  const c = colorMap[color] ?? colorMap['emerald'];
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all">
      <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4 ring-4 ring-offset-2 ${c.ring}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {ok
        ? <CheckCircle className="h-3.5 w-3.5" />
        : <Clock className="h-3.5 w-3.5" />}
      {label}
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('security.page.navHome', 'Accueil')}
          </Link>
          <span className="text-sm font-bold text-gray-900">{t('security.page.navTitle', 'ESG Flow — Sécurité')}</span>
          <Link to="/register" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
            {t('security.page.navFreeTrial', 'Essai gratuit →')}
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/8 rounded-full blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            {t('security.page.heroTitle', 'Sécurité, conformité & souveraineté')}
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-4">
            {t('security.page.heroSubtitle', 'Vos données ESG sont aussi sensibles que vos données financières. Voici comment ESG Flow les protège.')}
          </p>
          <p className="text-xs text-slate-400 mb-10 inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {t('security.page.lastUpdated', 'Dernière mise à jour :')} <span className="text-slate-300 font-medium">{LAST_UPDATED}</span>
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge ok label={t('security.page.badgeHostedFrance', 'Hébergé en France')} />
            <Badge ok label={t('security.page.badgeGdpr', 'RGPD natif')} />
            <Badge ok label="TLS 1.3 + AES-256" />
            <Badge ok label="SHA-256 audit trail" />
            <Badge ok label="RLS PostgreSQL" />
            <Badge ok={false} label={t('security.page.badgeIso27001', 'ISO 27001 — en cours')} />
            <Badge ok={false} label={t('security.page.badgeSoc2', 'SOC 2 Type 2 — roadmap')} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Summary table ──────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-slate-400 text-sm font-mono">security-posture.yml</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-2">
              {[
                { key: 'hosting',         value: t('security.page.posture.hosting',        'France (OVHcloud / Scaleway)'),                     ok: true },
                { key: 'encryption_rest', value: t('security.page.posture.encryptionRest', 'AES-256 (PostgreSQL + S3)'),                         ok: true },
                { key: 'encryption_tls',  value: t('security.page.posture.encryptionTls',  "TLS 1.3 (nginx + Let's Encrypt)"),                   ok: true },
                { key: 'audit_trail',     value: t('security.page.posture.auditTrail',     'Journal détaillé + empreintes SHA-256 par entrée'),   ok: true },
                { key: 'db_isolation',    value: t('security.page.posture.dbIsolation',    'Row-Level Security PostgreSQL (RLS)'),                ok: true },
                { key: 'auth',            value: t('security.page.posture.auth',           'JWT RS256 + 2FA TOTP + SSO SAML 2.0'),               ok: true },
                { key: 'secrets',         value: t('security.page.posture.secrets',        'Env variables chiffrées, pas de secrets en code'),    ok: true },
                { key: 'backups',         value: t('security.page.posture.backups',        'Quotidiens chiffrés, rétention 30 jours'),            ok: true },
                { key: 'iso_27001',       value: t('security.page.posture.iso27001',       "En cours d'obtention (2026)"),                       ok: false },
                { key: 'soc2_type2',      value: t('security.page.posture.soc2',           'Roadmap 2026–2027'),                                  ok: false },
              ].map(row => (
                <div key={row.key} className="flex items-center gap-3">
                  <span className={`text-xs ${row.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {row.ok ? '✓' : '○'}
                  </span>
                  <span className="text-slate-400">{row.key}:</span>
                  <span className={row.ok ? 'text-white' : 'text-slate-400'}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main security cards ────────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.secArchTitle', 'Architecture de sécurité')}</h2>
          <p className="text-gray-500 mb-8">{t('security.page.secArchSubtitle', "Une sécurité en couches, sans compromis sur l'accessibilité.")}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <SecurityCard icon={Globe} color="emerald" title={t('security.page.card1Title', 'Hébergement souverain en France')}>
              <p>{t('security.page.card1p1', 'Infrastructure 100 % en France chez')} <strong>OVHcloud</strong> {t('security.page.card1p1b', 'et')} <strong>Scaleway</strong> — {t('security.page.card1p1c', 'deux acteurs certifiés HDS et SecNumCloud.')}</p>
              <p>{t('security.page.card1p2', "Aucun sous-traitant américain. Aucun transfert de données hors UE. Conformité RGPD garantie contractuellement par notre DPA.")}</p>
            </SecurityCard>

            <SecurityCard icon={Lock} color="violet" title={t('security.page.card2Title', 'Chiffrement bout en bout')}>
              <p><strong>{t('security.page.card2transit', 'En transit :')}</strong> {t('security.page.card2transitDesc', "TLS 1.3 uniquement sur toutes les connexions (nginx + Let's Encrypt). HSTS activé, HTTPS forcé.")}</p>
              <p><strong>{t('security.page.card2rest', 'Au repos :')}</strong> {t('security.page.card2restDesc', 'AES-256 pour la base PostgreSQL et le stockage objets (S3-compatible). Clés de chiffrement gérées par notre infrastructure.')}</p>
            </SecurityCard>

            <SecurityCard icon={Database} color="blue" title={t('security.page.card3Title', 'Isolation multi-tenant RLS')}>
              <p>{t('security.page.card3p1a', 'Chaque organisation est')} <strong>{t('security.page.card3p1b', 'isolée au niveau base de données')}</strong> {t('security.page.card3p1c', 'via PostgreSQL Row-Level Security (RLS) sur 19 tables.')}</p>
              <p>{t('security.page.card3p2', "Même en cas de bug applicatif, aucune fuite de données croisée entre tenants n'est possible. Les politiques RLS sont forcées (")} <code>FORCE ROW LEVEL SECURITY</code>).</p>
            </SecurityCard>

            <SecurityCard icon={Key} color="amber" title={t('security.page.card4Title', 'Authentification & sessions')}>
              <p><strong>JWT RS256</strong> {t('security.page.card4p1', '(clés asymétriques) avec rotation automatique et révocation par')} <code className="text-xs">jti</code>.</p>
              <p><strong>2FA TOTP</strong> {t('security.page.card4p2', 'disponible sur tous les comptes (Google Authenticator, Authy, 1Password).')}</p>
              <p><strong>SSO SAML 2.0</strong> {t('security.page.card4p3', 'pour les plans Groupe & Enterprise (Azure AD, Okta, Google Workspace).')}</p>
              <p>{t('security.page.card4p4', "Verrouillage après 5 tentatives échouées · sessions expirées automatiquement à 8h d'inactivité · rate limiting par IP & user.")}</p>
            </SecurityCard>

            <SecurityCard icon={FileText} color="emerald" title={t('security.page.card5Title', 'Auditabilité & journal détaillé')}>
              <p><strong>{t('security.page.card5p1a', 'Séparation des pouvoirs (4-eyes)')}</strong> : {t('security.page.card5p1b', "l'auteur d'une saisie ne peut pas l'approuver lui-même — bloqué côté serveur.")}</p>
              <p><strong>{t('security.page.card5p2a', 'Empreinte SHA-256 par entrée')}</strong> {t('security.page.card5p2b', 'à chaque approbation, liant approbateur + valeur + horodatage + IP — recalculable pour vos revues internes.')}</p>
              <p><strong>{t('security.page.card5p3a', 'Verrouillage après validation')}</strong> : {t('security.page.card5p3b', 'les entrées vérifiées ne peuvent plus être modifiées ou supprimées sans révocation explicite.')}</p>
              <p>{t('security.page.card5p4', "Export complet du journal d'audit pour vos commissaires aux comptes et auditeurs.")}</p>
            </SecurityCard>

            <SecurityCard icon={Eye} color="slate" title={t('security.page.card6Title', "Monitoring & détection d'anomalies")}>
              <p>{t('security.page.card6p1a', 'Surveillance en temps réel via')} <strong>Sentry</strong> {t('security.page.card6p1b', '(erreurs front + back) et alertes automatiques sur comportements suspects.')}</p>
              <p>{t('security.page.card6p2', 'Logs centralisés, rate limiting sur toutes les API, protection CSRF et injection SQL.')}</p>
              <p>{t('security.page.card6p3', 'Uptime monitoring 24/7 avec alertes PagerDuty.')}</p>
            </SecurityCard>

          </div>
        </section>

        {/* ── Data privacy ──────────────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.privacyTitle', 'Protection des données personnelles')}</h2>
          <p className="text-gray-500 mb-8">{t('security.page.privacySubtitle', 'Conformité RGPD par conception (')} <em>Privacy by Design</em>).</p>

          <div className="grid sm:grid-cols-2 gap-5">
            <SecurityCard icon={Users} color="blue" title={t('security.page.card7Title', 'RGPD & Privacy by Design')}>
              <p>{t('security.page.card7p1', 'GreenConnect SAS est responsable de traitement. Un DPO est désigné.')}</p>
              <p>{t('security.page.card7p2', 'Accord de traitement des données (DPA) signé avec chaque client Pro/Enterprise.')}</p>
              <p>{t('security.page.card7p3', 'Droits RGPD exercés via')} <a href="mailto:privacy@greenconnect.cloud" className="text-emerald-600 hover:underline">privacy@greenconnect.cloud</a> : {t('security.page.card7p3b', 'accès, rectification, effacement, portabilité sous 30 jours.')}</p>
            </SecurityCard>

            <SecurityCard icon={RefreshCw} color="emerald" title={t('security.page.card8Title', 'Sauvegardes & continuité')}>
              <p><strong>{t('security.page.card8p1a', 'Sauvegardes quotidiennes')}</strong> {t('security.page.card8p1b', 'chiffrées (AES-256), rétention 30 jours, stockées dans une région géographique distincte.')}</p>
              <p><strong>{t('security.page.card8p2a', 'RTO cible')}</strong> : {t('security.page.card8p2b', '4 heures')} · <strong>{t('security.page.card8p2c', 'RPO cible')}</strong> : {t('security.page.card8p2d', '24 heures.')}</p>
              <p>{t('security.page.card8p3', 'Tests de restauration trimestriels documentés.')}</p>
            </SecurityCard>

            <SecurityCard icon={Zap} color="amber" title={t('security.page.card9Title', 'Gestion des secrets & dépendances')}>
              <p>{t('security.page.card9p1', "Aucun secret (clés API, mots de passe) en dur dans le code source. Variables d'environnement chiffrées au déploiement.")}</p>
              <p>{t('security.page.card9p2a', 'Dépendances npm et Python analysées automatiquement (')} <strong>Dependabot + pip-audit</strong>) {t('security.page.card9p2b', 'à chaque push. Patches de sécurité en moins de 48h.')}</p>
            </SecurityCard>

            <SecurityCard icon={AlertTriangle} color="red" title={t('security.page.card10Title', 'Divulgation responsable (Bug Bounty)')}>
              <p>{t('security.page.card10p1', 'Vous avez découvert une vulnérabilité ? Signalez-la à')} <a href="mailto:security@greenconnect.cloud" className="text-emerald-600 hover:underline">security@greenconnect.cloud</a>.</p>
              <p>{t('security.page.card10p2', 'Nous accusons réception sous 48h, évaluons sous 7 jours et corrigeons en moins de 30 jours pour les vulnérabilités critiques.')}</p>
              <p>{t('security.page.card10p3', 'Politique de divulgation coordonnée — aucune poursuite judiciaire pour les chercheurs de bonne foi.')}</p>
            </SecurityCard>
          </div>
        </section>

        {/* ── Certifications roadmap ────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.certsTitle', 'Certifications & conformité')}</h2>
          <p className="text-gray-500 mb-8">{t('security.page.certsSubtitle', 'Statut actuel et roadmap de certification.')}</p>

          <div className="overflow-hidden rounded-2xl border border-gray-200">
            {[
              {
                cert:   t('security.page.cert1Name',   'RGPD (Règlement européen 2016/679)'),
                status: t('security.page.cert1Status', 'Conforme'),
                statusColor: 'emerald',
                detail: t('security.page.cert1Detail', 'DPA disponible, DPO désigné, traitements documentés dans le registre CNIL'),
              },
              {
                cert:   t('security.page.cert2Name',   'Hébergement HDS (OVHcloud)'),
                status: t('security.page.cert2Status', 'Actif'),
                statusColor: 'emerald',
                detail: t('security.page.cert2Detail', 'Données hébergées chez un opérateur certifié HDS pour les données de santé'),
              },
              {
                cert:   t('security.page.cert3Name',   'TLS 1.3 + HSTS'),
                status: t('security.page.cert3Status', 'Actif'),
                statusColor: 'emerald',
                detail: t('security.page.cert3Detail', 'Score A+ SSL Labs sur tous les domaines de production'),
              },
              {
                cert:   t('security.page.cert4Name',   'Pentest externe'),
                status: t('security.page.cert4Status', 'Réalisé T1 2026'),
                statusColor: 'emerald',
                detail: t('security.page.cert4Detail', 'Test de pénétration par cabinet spécialisé indépendant — rapport disponible sur demande (NDA)'),
              },
              {
                cert:   t('security.page.cert5Name',   'ISO 27001'),
                status: t('security.page.cert5Status', "En cours d'obtention"),
                statusColor: 'amber',
                detail: t('security.page.cert5Detail', 'Audit de certification prévu H2 2026 — gap analysis réalisée, politique SMSI rédigée'),
              },
              {
                cert:   t('security.page.cert6Name',   'SOC 2 Type 2'),
                status: t('security.page.cert6Status', 'Roadmap 2026–2027'),
                statusColor: 'amber',
                detail: t('security.page.cert6Detail', "Démarrage de la période d'observation T4 2026 — partenaire d'audit sélectionné"),
              },
            ].map((row, i, arr) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{row.cert}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{row.detail}</div>
                </div>
                <div className={`ml-6 flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  row.statusColor === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {row.statusColor === 'emerald'
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : <Clock className="h-3.5 w-3.5" />}
                  {row.status}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sub-processors ──────────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.subprocTitle', 'Sous-traitants (sub-processors)')}</h2>
          <p className="text-gray-500 mb-8">
            {t('security.page.subprocSubtitle', "Liste exhaustive des prestataires ayant un accès potentiel à vos données. Tous sont liés contractuellement (DPA) et opèrent dans l'UE ou sous garanties équivalentes.")}
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('security.page.colVendor', 'Fournisseur')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('security.page.colService', 'Service')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('security.page.colLocation', 'Localisation')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{t('security.page.colDataProcessed', 'Données traitées')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { vendor: 'OVHcloud',   service: t('security.page.proc1Service',  'Hébergement infra + base de données'),            location: t('security.page.proc1Location',  '🇫🇷 France'),        data: t('security.page.proc1Data',  'Toutes les données applicatives (PII, métriques ESG)') },
                  { vendor: 'Scaleway',   service: t('security.page.proc2Service',  'Stockage objets (S3-compatible)'),                location: t('security.page.proc2Location',  '🇫🇷 France'),        data: t('security.page.proc2Data',  'Pièces justificatives, exports PDF') },
                  { vendor: 'Stripe',     service: t('security.page.proc3Service',  'Facturation & paiements'),                        location: t('security.page.proc3Location',  '🇮🇪 Irlande (UE)'),  data: t('security.page.proc3Data',  'Email de facturation, numéro TVA — jamais les données ESG') },
                  { vendor: 'Resend',     service: t('security.page.proc4Service',  'Délivrabilité email transactionnel'),             location: t('security.page.proc4Location',  '🇮🇪 Irlande (UE)'),  data: t('security.page.proc4Data',  'Email destinataire + contenu transactionnel') },
                  { vendor: 'Sentry',     service: t('security.page.proc5Service',  'Monitoring erreurs (auto-hosted EU)'),            location: t('security.page.proc5Location',  '🇩🇪 Allemagne'),     data: t('security.page.proc5Data',  'Stack traces, user_id pseudonymisé — pas de données métier') },
                  { vendor: 'Cloudflare', service: t('security.page.proc6Service',  'CDN + protection DDoS'),                         location: t('security.page.proc6Location',  '🇪🇺 Edge UE'),       data: t('security.page.proc6Data',  'Métadonnées de requêtes (IP, user-agent) — pas le contenu') },
                  { vendor: 'OpenAI',     service: t('security.page.proc7Service',  'Génération de narratifs ESG (opt-in)'),           location: t('security.page.proc7Location',  '🇺🇸 États-Unis ⚠'), data: t('security.page.proc7Data',  'Uniquement les snippets envoyés via /generate-narrative (option désactivable)') },
                ].map((row, i) => (
                  <tr key={row.vendor} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{row.vendor}</td>
                    <td className="px-6 py-3.5 text-gray-700">{row.service}</td>
                    <td className="px-6 py-3.5 text-gray-700 whitespace-nowrap">{row.location}</td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs">{row.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <ExternalLink className="h-3 w-3 inline mr-1" />
            {t('security.page.subprocNotice', "Toute modification de cette liste fait l'objet d'une notification 30 jours avant — droit d'opposition contractuel.")}
          </p>
        </section>

        {/* ── Code transparency ───────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.codeQualityTitle', 'Qualité du code & ingénierie')}</h2>
          <p className="text-gray-500 mb-8">
            {t('security.page.codeQualitySubtitle', "Les chiffres qu'un acheteur grand groupe demande systématiquement en RFP.")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: ListChecks, color: 'emerald', value: '32+',    label: t('security.page.kpi1Label', 'Tests automatisés'), sub: t('security.page.kpi1Sub', 'pytest · couverture critique 100%') },
              { icon: Code2,      color: 'blue',    value: '< 48 h', label: t('security.page.kpi2Label', 'Patch de sécurité'), sub: t('security.page.kpi2Sub', 'CVE critique · Dependabot + pip-audit') },
              { icon: Activity,   color: 'violet',  value: '99,9 %', label: t('security.page.kpi3Label', 'SLA contractuel'),   sub: t('security.page.kpi3Sub', 'plan Groupe & Enterprise') },
              { icon: Shield,     color: 'amber',   value: '0',      label: t('security.page.kpi4Label', 'Incidents majeurs'), sub: t('security.page.kpi4Sub', '12 derniers mois — voir status.greenconnect.cloud') },
            ].map((kpi) => {
              const Icon = kpi.icon;
              const colorMap: Record<string, { bg: string; text: string }> = {
                emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
                blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
                violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
                amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
              };
              const c = colorMap[kpi.color];
              return (
                <div key={kpi.label} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{kpi.value}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">{kpi.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Incident response ───────────────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.incidentTitle', 'Réponse aux incidents')}</h2>
          <p className="text-gray-500 mb-8">{t('security.page.incidentSubtitle', 'Procédure documentée, testée trimestriellement.')}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', title: t('security.page.incident1Title', 'Détection'),    delay: t('security.page.incident1Delay', '< 5 min'),   detail: t('security.page.incident1Detail', 'Monitoring automatique 24/7 + alertes PagerDuty sur indicateurs critiques (uptime, latence, erreurs 5xx).') },
              { step: '02', title: t('security.page.incident2Title', 'Triage'),       delay: t('security.page.incident2Delay', '< 30 min'),  detail: t('security.page.incident2Detail', "Sévérité S1-S4 attribuée selon impact (données / disponibilité / sécurité). Équipe d'astreinte mobilisée.") },
              { step: '03', title: t('security.page.incident3Title', 'Notification'), delay: t('security.page.incident3Delay', '< 24 h'),    detail: t('security.page.incident3Detail', 'Pour les violations de données : notification CNIL sous 72h (RGPD Art. 33). Clients impactés notifiés par email.') },
              { step: '04', title: t('security.page.incident4Title', 'Post-mortem'),  delay: t('security.page.incident4Delay', '< 5 jours'), detail: t('security.page.incident4Detail', 'Rapport public sur status.greenconnect.cloud avec timeline, root cause, mesures correctives.') },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-mono text-gray-400 mb-2">{s.step}</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{s.title}</p>
                <p className="text-xs font-semibold text-emerald-600 mb-2">{s.delay}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Documents téléchargeables ───────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('security.page.docsTitle', 'Documents disponibles')}</h2>
          <p className="text-gray-500 mb-8">{t('security.page.docsSubtitle', 'À transmettre à votre DPO ou DSI pour validation.')}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: t('security.page.doc1Name', 'Accord de traitement (DPA)'),          desc: t('security.page.doc1Desc', 'Conforme RGPD Art. 28 — adapté à votre juridiction'),           ndaRequired: false, contact: true },
              { name: t('security.page.doc2Name', 'Questionnaire sécurité pré-rempli'),   desc: t('security.page.doc2Desc', 'Format VSAQ ou SIG Lite — réponses certifiées'),               ndaRequired: false, contact: true },
              { name: t('security.page.doc3Name', 'Rapport de pentest 2026'),             desc: t('security.page.doc3Desc', 'Cabinet indépendant, méthodologie OWASP ASVS L2'),             ndaRequired: true,  contact: true },
              { name: t('security.page.doc4Name', 'Architecture sécurité (1-pager PDF)'), desc: t('security.page.doc4Desc', 'Diagramme infra + flux de données chiffrés'),                  ndaRequired: false, contact: true },
              { name: t('security.page.doc5Name', 'Politique de continuité (BCP/DRP)'),   desc: t('security.page.doc5Desc', "Plan de continuité d'activité — RTO 4h, RPO 24h"),             ndaRequired: false, contact: true },
              { name: t('security.page.doc6Name', 'Liste des sous-traitants (CSV)'),      desc: t('security.page.doc6Desc', 'Export à jour avec localisations et finalités de traitement'), ndaRequired: false, contact: true },
            ].map((doc) => (
              <a
                key={doc.name}
                href="mailto:security@greenconnect.cloud?subject=Demande de document sécurité"
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 bg-gray-50 group-hover:bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                  <Download className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                    {doc.ndaRequired && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        {t('security.page.ndaRequired', 'NDA requis')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                  <p className="text-[11px] text-emerald-600 mt-1.5 inline-flex items-center gap-1">
                    {t('security.page.docRequest', 'Demander à security@greenconnect.cloud')} <ArrowRight className="h-3 w-3" />
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Contact & CTA ─────────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">{t('security.page.contactTitle', 'Questions de sécurité')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('security.page.contactSubtitle', "Notre équipe répond sous 48h aux demandes de sécurité, d'audit et de conformité.")}</p>
            <div className="space-y-2 text-sm">
              <a href="mailto:security@greenconnect.cloud" className="flex items-center gap-2 text-emerald-600 hover:underline font-medium">
                <Shield className="h-4 w-4" /> security@greenconnect.cloud
              </a>
              <a href="mailto:privacy@greenconnect.cloud" className="flex items-center gap-2 text-emerald-600 hover:underline font-medium">
                <Lock className="h-4 w-4" /> privacy@greenconnect.cloud
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">{t('security.page.pentestNote', 'Rapport de pentest disponible sur demande sous NDA (clients Enterprise).')}</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #134e4a 100%)' }} className="rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2">{t('security.page.ctaTitle', 'Prêt à démarrer ?')}</h3>
              <p className="text-sm text-slate-300 mb-6">{t('security.page.ctaSubtitle', '14 jours gratuits, données hébergées en France, RGPD garanti. Sans carte bancaire.')}</p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 text-sm"
            >
              {t('security.page.ctaButton', 'Démarrer gratuitement')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400 mt-16">
        <p>
          © 2026 GreenConnect SAS · <Link to="/privacy-policy" className="hover:text-gray-600">{t('security.page.footerPrivacy', 'Politique de confidentialité')}</Link>
          {' · '}<Link to="/legal-notice" className="hover:text-gray-600">{t('security.page.footerLegal', 'Mentions légales')}</Link>
          {' · '}<Link to="/status" className="hover:text-gray-600">Status</Link>
          {' · '}<a href="mailto:security@greenconnect.cloud" className="hover:text-gray-600">security@greenconnect.cloud</a>
        </p>
        <p className="mt-2">{t('security.page.footerAddress', '12 Vieux chemin de meaux, 93190 Livry-Gargan, France')}</p>
      </footer>
    </div>
  );
}
