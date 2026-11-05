import { useEffect } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageSeo } from '@/hooks/usePageSeo';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hash } = useLocation();
  // Lien d'ancre (ex. /privacy-policy#cookies) : le routeur ne fait pas défiler seul.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  usePageSeo({ id: 'privacy', title: 'Politique de Confidentialité — ESGFlow', description: 'Politique de confidentialité et protection des données personnelles de la plateforme ESGFlow. Hébergement France, RGPD.', url: 'https://greenconnect.cloud/privacy-policy', ogImage: 'https://greenconnect.cloud/og/privacy-policy.png' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <button
         
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 tap-target"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('legal.back')}
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-blue-100 p-3">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('legal.privacyTitle')}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('legal.privacySubtitle')}
              </p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <div className="rounded-lg bg-blue-50 p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium">
                ℹ️ {t('legal.privacyGdprNote')}
              </p>
            </div>

            <h2>1. Responsable du Traitement</h2>
            <p>
              <strong>GreenConnect SAS</strong><br />
              Siège social : 12 Vieux chemin de meaux, 93190 Livry-Gargan, France<br />
              SIRET : [À renseigner]<br />
              Email : privacy@greenconnect.cloud
            </p>

            <h2>2. Données Collectées</h2>
            
            <h3>2.1 Données d'Identification</h3>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email professionnelle</li>
              <li>Fonction et organisation</li>
              <li>Numéro de téléphone (optionnel)</li>
            </ul>

            <h3>2.2 Données de Connexion</h3>
            <ul>
              <li>Adresse IP</li>
              <li>Logs de connexion</li>
              <li>Type de navigateur et version</li>
              <li>Système d'exploitation</li>
            </ul>

            <h3>2.3 Données ESG</h3>
            <ul>
              <li>Indicateurs environnementaux (émissions, énergie, eau, déchets)</li>
              <li>Indicateurs sociaux (emploi, diversité, formation, santé/sécurité)</li>
              <li>Indicateurs de gouvernance (composition CA, éthique, conformité)</li>
              <li>Documents et fichiers importés</li>
            </ul>

            <h2>3. Finalités du Traitement</h2>
            <p>Vos données sont collectées et traitées pour :</p>
            <ul>
              <li>Gestion des comptes utilisateurs et authentification</li>
              <li>Fourniture des services de la plateforme ESGFlow</li>
              <li>Génération de rapports ESG conformes aux réglementations</li>
              <li>Calcul automatique d'indicateurs et scores ESG</li>
              <li>Support client et assistance technique</li>
              <li>Amélioration de la plateforme</li>
              <li>Respect des obligations légales et réglementaires</li>
            </ul>

            <h2>4. Bases Légales du Traitement</h2>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Traitement</th>
                  <th className="text-left">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gestion du compte</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Fourniture du service</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Support client</td>
                  <td>Intérêt légitime</td>
                </tr>
                <tr>
                  <td>Amélioration du service</td>
                  <td>Intérêt légitime</td>
                </tr>
                <tr>
                  <td>Respect obligations légales</td>
                  <td>Obligation légale</td>
                </tr>
                <tr>
                  <td>Marketing (si accepté)</td>
                  <td>Consentement</td>
                </tr>
              </tbody>
            </table>

            <h2>5. Destinataires des Données</h2>
            <p>Vos données peuvent être transmises à :</p>
            <ul>
              <li><strong>Personnel autorisé de GreenConnect SAS</strong> : accès strictement limité aux besoins</li>
              <li><strong>Hébergeur</strong> : IONOS (serveur privé virtuel, région France)</li>
              <li><strong>Sous-traitants techniques</strong> : Resend (envoi d'emails), Stripe (paiement) et, uniquement lorsque vous soumettez un document à l'analyse par IA, OpenAI</li>
              <li><strong>Autorités</strong> : sur réquisition judiciaire uniquement</li>
            </ul>

            <p className="font-semibold">
              ⚠️ GreenConnect SAS ne vend jamais vos données à des tiers.
            </p>

            <h2>6. Transferts Hors UE</h2>
            <p>
              Vos données sont stockées sur un serveur IONOS situé en France. Certains sous-traitants listés ci-dessus
              (Stripe, Resend, OpenAI) peuvent être établis hors de l'Union Européenne : le cas échéant,
              les transferts s'appuient sur les garanties prévues par le RGPD (clauses contractuelles types
              ou décision d'adéquation). L'analyse par IA n'est déclenchée que lorsque vous soumettez
              vous-même un document, et le fichier n'est pas conservé par le prestataire d'IA.
            </p>

            <h2>7. Durée de Conservation</h2>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Type de données</th>
                  <th className="text-left">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Compte actif</td>
                  <td>Durée de l'abonnement + 3 ans</td>
                </tr>
                <tr>
                  <td>Données ESG</td>
                  <td>10 ans (obligation légale CSRD)</td>
                </tr>
                <tr>
                  <td>Logs de connexion</td>
                  <td>1 an</td>
                </tr>
                <tr>
                  <td>Données de facturation</td>
                  <td>10 ans (obligation comptable)</td>
                </tr>
                <tr>
                  <td>Compte supprimé</td>
                  <td>Suppression sous 30 jours</td>
                </tr>
              </tbody>
            </table>

            <h2>8. Vos Droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>

            <h3>✅ Droit d'accès</h3>
            <p>Obtenir une copie de vos données personnelles</p>

            <h3>✏️ Droit de rectification</h3>
            <p>Corriger des données inexactes ou incomplètes</p>

            <h3>🗑️ Droit à l'effacement ("droit à l'oubli")</h3>
            <p>Demander la suppression de vos données (sauf obligation légale de conservation)</p>

            <h3>⏸️ Droit à la limitation</h3>
            <p>Demander le gel temporaire du traitement de vos données</p>

            <h3>📤 Droit à la portabilité</h3>
            <p>Recevoir vos données dans un format structuré (CSV, JSON)</p>

            <h3>🚫 Droit d'opposition</h3>
            <p>Vous opposer au traitement pour motif légitime</p>

            <h3>🤖 Décisions automatisées</h3>
            <p>
              Les scores ESG sont calculés automatiquement. Vous pouvez demander une révision manuelle
              et contester un résultat.
            </p>

            <h3>📧 Exercer vos droits</h3>
            <p>
              Pour exercer vos droits, contactez notre contact protection des données :<br />
              Email : <a href="mailto:privacy@greenconnect.cloud" className="text-primary-600 hover:underline">privacy@greenconnect.cloud</a><br />
              Courrier : GreenConnect SAS - Protection des données, 12 Vieux chemin de meaux, 93190 Livry-Gargan, France<br />
              <br />
              Réponse sous 1 mois maximum.
            </p>

            <h2>9. Sécurité des Données</h2>
            <p>GreenConnect SAS met en œuvre les mesures de sécurité suivantes :</p>
            <ul>
              <li>✅ Chiffrement TLS 1.3 (transit)</li>
              <li>✅ Identifiants de connecteurs chiffrés avant stockage</li>
              <li>✅ Authentification multi-facteurs (MFA) disponible</li>
              <li>✅ Contrôle d'accès basé sur les rôles (RBAC)</li>
              <li>✅ Sauvegardes quotidiennes (conservées 30 jours)</li>
              <li>✅ Journalisation des accès</li>
            </ul>

            <h2 id="cookies">10. Cookies et Traceurs</h2>
            <p>
              ESGFlow n'utilise aucun cookie publicitaire ni outil de profilage. Aucun outil de mesure
              d'audience n'est actif à ce jour ; si un tel outil était ajouté, cette page serait mise à jour
              avant son activation.
            </p>

            <h3>Données stockées dans votre navigateur (strictement nécessaires)</h3>
            <ul>
              <li>Session de connexion</li>
              <li>Préférence de langue</li>
              <li>Votre choix sur le bandeau de consentement</li>
            </ul>

            <h3>Services tiers chargés par le site</h3>
            <ul>
              <li>
                Polices de caractères (Inter) : chargées depuis les serveurs de Google Fonts, ce qui
                transmet votre adresse IP à Google.
              </li>
              <li>
                Suivi des erreurs techniques (Sentry), le cas échéant : utilisé uniquement pour corriger
                les bogues.
              </li>
            </ul>

            <p>
              Vous pouvez gérer vos préférences via le bandeau de consentement ou dans les paramètres de
              votre navigateur.
            </p>

            <h2>11. Violations de Données</h2>
            <p>
              En cas de violation de données susceptible de présenter un risque pour vos droits et libertés,
              GreenConnect SAS s'engage à :
            </p>
            <ul>
              <li>Notifier la CNIL sous 72h</li>
              <li>Vous informer dans les meilleurs délais</li>
              <li>Prendre toutes mesures correctrices nécessaires</li>
            </ul>

            <h2>12. Modifications de la Politique</h2>
            <p>
              Cette politique peut être modifiée. Vous serez informé par email de toute modification
              substantielle 30 jours avant son entrée en vigueur.
            </p>

            <h2>13. Réclamation</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
              auprès de la CNIL :
            </p>
            <p>
              <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong><br />
              3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07<br />
              Téléphone : 01 53 73 22 22<br />
              Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">www.cnil.fr</a>
            </p>

            <h2>14. Contact protection des données</h2>
            <p>
              Pour toute question relative à la protection de vos données personnelles :<br />
              <br />
              <strong>Contact protection des données</strong><br />
              Email : <a href="mailto:privacy@greenconnect.cloud" className="text-primary-600 hover:underline">privacy@greenconnect.cloud</a><br />
              Courrier : GreenConnect SAS - Protection des données, 12 Vieux chemin de meaux, 93190 Livry-Gargan, France
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
