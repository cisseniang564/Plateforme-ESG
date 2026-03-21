import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/common/Button';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Button
          variant="secondary"
          onClick={() => navigate('/app/organizations')}
          className="mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('legal.back')}
        </Button>

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
              <strong>ESGFlow SAS</strong><br />
              Siège social : 123 Avenue des Champs-Élysées, 75008 Paris, France<br />
              SIRET : 123 456 789 00012<br />
              Email : dpo@esgflow.com<br />
              Téléphone : +33 1 23 45 67 89
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
              <li><strong>Personnel autorisé d'ESGFlow</strong> : accès strictement limité aux besoins</li>
              <li><strong>Hébergeur</strong> : OVH Cloud (France) - certifié ISO 27001, HDS</li>
              <li><strong>Sous-traitants techniques</strong> : services d'envoi d'emails, analytics (avec DPA)</li>
              <li><strong>Autorités</strong> : sur réquisition judiciaire uniquement</li>
            </ul>

            <p className="font-semibold">
              ⚠️ ESGFlow ne vend jamais vos données à des tiers.
            </p>

            <h2>6. Transferts Hors UE</h2>
            <p>
              Vos données sont hébergées exclusivement en France (datacenter OVH à Roubaix).
              Aucun transfert hors Union Européenne n'est effectué.
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
              Pour exercer vos droits, contactez notre DPO :<br />
              Email : <a href="mailto:dpo@esgflow.com" className="text-primary-600 hover:underline">dpo@esgflow.com</a><br />
              Courrier : ESGFlow SAS - DPO, 123 Avenue des Champs-Élysées, 75008 Paris<br />
              <br />
              Réponse sous 1 mois maximum.
            </p>

            <h2>9. Sécurité des Données</h2>
            <p>ESGFlow met en œuvre les mesures de sécurité suivantes :</p>
            <ul>
              <li>✅ Chiffrement TLS 1.3 (transit)</li>
              <li>✅ Chiffrement AES-256 (stockage)</li>
              <li>✅ Authentification multi-facteurs (MFA) disponible</li>
              <li>✅ Contrôle d'accès basé sur les rôles (RBAC)</li>
              <li>✅ Sauvegardes quotidiennes chiffrées</li>
              <li>✅ Surveillance 24/7 des intrusions</li>
              <li>✅ Tests d'intrusion annuels</li>
              <li>✅ Journalisation des accès</li>
            </ul>

            <h2>10. Cookies et Traceurs</h2>
            <p>ESGFlow utilise les cookies suivants :</p>
            
            <h3>Cookies strictement nécessaires (pas de consentement requis)</h3>
            <ul>
              <li>Session utilisateur (auth_token)</li>
              <li>Préférences de langue</li>
            </ul>

            <h3>Cookies analytiques (consentement requis)</h3>
            <ul>
              <li>Google Analytics (anonymisé)</li>
              <li>Statistiques d'usage</li>
            </ul>

            <p>
              Vous pouvez gérer vos préférences cookies via le bandeau de consentement ou dans les
              paramètres de votre navigateur.
            </p>

            <h2>11. Violations de Données</h2>
            <p>
              En cas de violation de données susceptible de présenter un risque pour vos droits et libertés,
              ESGFlow s'engage à :
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

            <h2>14. Contact DPO</h2>
            <p>
              Pour toute question relative à la protection de vos données personnelles :<br />
              <br />
              <strong>Délégué à la Protection des Données (DPO)</strong><br />
              Email : <a href="mailto:dpo@esgflow.com" className="text-primary-600 hover:underline">dpo@esgflow.com</a><br />
              Courrier : ESGFlow SAS - DPO, 123 Avenue des Champs-Élysées, 75008 Paris, France
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
