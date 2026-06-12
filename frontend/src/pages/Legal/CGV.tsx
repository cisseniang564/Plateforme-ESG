import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import type { ReactNode } from 'react';
import { usePageSeo } from '@/hooks/usePageSeo';

const UPDATED = '2 mai 2026';
const COMPANY  = 'GreenConnect SAS';
const DOMAIN   = 'greenconnect.cloud';
const EMAIL_BILLING = 'billing@greenconnect.cloud';
const EMAIL_LEGAL   = 'legal@greenconnect.cloud';

// Cast an i18next interpolation object so it type-checks as a <Trans> child.
// Runtime is unchanged: <Trans> consumes these via nodesToString and never renders them as React nodes.
const tv = (o: Record<string, string>): ReactNode => o as unknown as ReactNode;

export default function CGV() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageSeo({ id: 'cgv', title: t('legal.cgv.seo.title', 'Conditions Générales de Vente — ESG Flow'), description: t('legal.cgv.seo.desc', 'Conditions générales de vente de la plateforme ESG Flow. Tarifs, abonnements, facturation et résiliation.'), url: 'https://greenconnect.cloud/cgv', robots: 'noindex,follow', ogImage: 'https://greenconnect.cloud/og/cgv.png' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <button
         
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 tap-target"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('legal.cgv.back', 'Retour')}
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3">
              <ShoppingCart className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('legal.cgv.title', 'Conditions Générales de Vente')}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('legal.cgv.updated', 'Dernière mise à jour : {{date}}', { date: UPDATED })}
              </p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">

            {/* ─── Préambule ─────────────────────────────────────────────── */}
            <h2>{t('legal.cgv.preamble.title', 'Préambule')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.preamble.p1">
                Les présentes Conditions Générales de Vente (ci-après «&nbsp;CGV&nbsp;») régissent la souscription et l'utilisation des abonnements à la plateforme <strong>ESG Flow</strong>, éditée par <strong>{tv({ company: COMPANY })}</strong> (ci-après «&nbsp;l'Éditeur&nbsp;»), accessible à l'adresse <a href={`https://${DOMAIN}`}>{tv({ domain: DOMAIN })}</a>.
              </Trans>
            </p>
            <p>
              {t('legal.cgv.preamble.p2', "Toute souscription à un abonnement implique l'acceptation pleine et entière des présentes CGV. Le client reconnaît les avoir lues avant toute commande.")}
            </p>

            {/* ─── 1. Éditeur ────────────────────────────────────────────── */}
            <h2>{t('legal.cgv.s1.title', "1. Informations sur l'Éditeur")}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s1.body">
                <strong>{tv({ company: COMPANY })}</strong><br />
                Siège social : 12 Vieux chemin de meaux, 93190 Livry-Gargan, France<br />
                SIRET : <em>[À compléter]</em><br />
                N° TVA intracommunautaire : <em>[À compléter]</em><br />
                Email commercial : <a href={`mailto:${EMAIL_BILLING}`}>{tv({ emailBilling: EMAIL_BILLING })}</a>
              </Trans>
            </p>

            {/* ─── 2. Offres ─────────────────────────────────────────────── */}
            <h2>{t('legal.cgv.s2.title', '2. Description des Offres')}</h2>
            <p>
              {t('legal.cgv.s2.intro', "ESG Flow propose les formules d'abonnement suivantes, dont les prix sont indiqués en euros (€) HT, à la date d'entrée en vigueur des présentes :")}
            </p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">{t('legal.cgv.s2.th.plan', 'Formule')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">{t('legal.cgv.s2.th.monthly', 'Mensuel (HT)')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">{t('legal.cgv.s2.th.annual', 'Annuel (HT)')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">{t('legal.cgv.s2.th.users', 'Utilisateurs')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Free</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.free.monthly', '0 €/mois')}</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.free.annual', '0 €/an')}</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.free.users', "Jusqu'à 3")}</td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="px-4 py-3 font-medium">PME</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.pme.monthly', '249 €/mois')}</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.pme.annual', '2 544 €/an (212 €/mois)')} <span className="text-xs text-emerald-600 font-medium">{t('legal.cgv.s2.discount', '(−15 %)')}</span></td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.pme.users', "Jusqu'à 25")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">ETI</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.eti.monthly', '599 €/mois')}</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.eti.annual', '6 108 €/an (509 €/mois)')} <span className="text-xs text-emerald-600 font-medium">{t('legal.cgv.s2.discount', '(−15 %)')}</span></td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.eti.users', "Jusqu'à 100")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Groupe</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.groupe.monthly', '1 199 €/mois')}</td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.groupe.annual', '12 228 €/an (1 019 €/mois)')} <span className="text-xs text-emerald-600 font-medium">{t('legal.cgv.s2.discount', '(−15 %)')}</span></td>
                    <td className="px-4 py-3">{t('legal.cgv.s2.groupe.users', "Jusqu'à 500")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Enterprise</td>
                    <td className="px-4 py-3" colSpan={3}>
                      <Trans i18nKey="legal.cgv.s2.enterprise.quote">
                        Sur devis — <a href={`mailto:${EMAIL_BILLING}`}>contact commercial</a>
                      </Trans>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <Trans i18nKey="legal.cgv.s2.p2">
                Les prix sont susceptibles d'être modifiés. Toute modification tarifaire est notifiée au client avec un préavis d'au moins <strong>30 jours</strong> avant son entrée en vigueur. Le client peut résilier sans frais pendant ce délai.
              </Trans>
            </p>

            <p>
              <Trans i18nKey="legal.cgv.s2.p3">
                Un <strong>essai gratuit de 14 jours</strong> est proposé à toute nouvelle inscription, sans obligation d'achat ni saisie de coordonnées bancaires. À l'issue de la période d'essai, l'accès est suspendu si aucun abonnement n'est souscrit.
              </Trans>
            </p>

            {/* ─── 3. Commande ───────────────────────────────────────────── */}
            <h2>{t('legal.cgv.s3.title', '3. Commande et Formation du Contrat')}</h2>
            <p>
              {t('legal.cgv.s3.p1', "La souscription à un abonnement s'effectue exclusivement en ligne, via la page de facturation de la plateforme. La commande est ferme et définitive à réception du paiement ou de la confirmation de la mise en place du prélèvement récurrent.")}
            </p>
            <p>
              {t('legal.cgv.s3.p2', "Un email de confirmation récapitulant les conditions de l'abonnement souscrit est envoyé à l'adresse renseignée lors de l'inscription, dans les 24 heures suivant la commande.")}
            </p>

            {/* ─── 4. Paiement ───────────────────────────────────────────── */}
            <h2>{t('legal.cgv.s4.title', '4. Modalités de Paiement')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s4.p1">
                Le paiement est effectué par carte bancaire (Visa, Mastercard, American Express) via notre prestataire de paiement sécurisé <strong>Stripe, Inc.</strong> Les coordonnées bancaires ne sont jamais stockées sur les serveurs de l'Éditeur.
              </Trans>
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s4.p2">
                Pour les abonnements <strong>mensuels</strong>, le paiement est prélevé automatiquement chaque mois à la date anniversaire de la souscription.<br />Pour les abonnements <strong>annuels</strong>, le paiement est prélevé en une seule fois à la date de souscription, puis à chaque date anniversaire annuelle.
              </Trans>
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s4.p3">
                En cas d'échec de paiement, l'accès à la plateforme est suspendu après un délai de grâce de <strong>7 jours</strong>. L'Éditeur procède à 3 tentatives de prélèvement supplémentaires à 3, 5 et 7 jours. À défaut, le compte est désactivé.
              </Trans>
            </p>

            {/* ─── 5. Droit de rétractation ──────────────────────────────── */}
            <h2>{t('legal.cgv.s5.title', '5. Droit de Rétractation')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s5.p1">
                Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation <strong>ne s'applique pas</strong> aux contrats de fourniture de contenu numérique non fourni sur support matériel dont l'exécution a commencé après accord exprès du consommateur.
              </Trans>
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s5.p2">
                Cependant, l'Éditeur accorde à titre commercial un droit de remboursement intégral dans les <strong>14 jours suivant la première souscription payante</strong>, sur simple demande adressée à <a href={`mailto:${EMAIL_BILLING}`}>{tv({ emailBilling: EMAIL_BILLING })}</a>, sans justification requise.
              </Trans>
            </p>

            {/* ─── 6. Durée et résiliation ───────────────────────────────── */}
            <h2>{t('legal.cgv.s6.title', '6. Durée et Résiliation')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s6.p1">
                L'abonnement est conclu pour une durée mensuelle ou annuelle, renouvelable tacitement. Le client peut résilier son abonnement à tout moment depuis l'espace «&nbsp;Facturation&nbsp;» de la plateforme ou en contactant <a href={`mailto:${EMAIL_BILLING}`}>{tv({ emailBilling: EMAIL_BILLING })}</a>.
              </Trans>
            </p>
            <p>
              {t('legal.cgv.s6.p2', "La résiliation prend effet à la fin de la période en cours déjà réglée. Aucun remboursement proratisé n'est effectué pour la période restante, sauf dans le cadre du droit de remboursement commercial visé à l'article 5.")}
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s6.p3">
                L'Éditeur se réserve le droit de résilier l'abonnement en cas de violation caractérisée des CGU, avec notification préalable de <strong>48 heures</strong> sauf en cas de mise en péril manifeste de la sécurité de la plateforme.
              </Trans>
            </p>

            {/* ─── 7. Disponibilité ──────────────────────────────────────── */}
            <h2>{t('legal.cgv.s7.title', '7. Disponibilité et Niveau de Service')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s7.p1">
                L'Éditeur s'engage à fournir un niveau de disponibilité de <strong>99,5 %</strong> mesuré sur un mois calendaire hors maintenances planifiées. Les maintenances planifiées sont notifiées au moins <strong>48 heures</strong> à l'avance.
              </Trans>
            </p>
            <p>
              {t('legal.cgv.s7.p2', "En cas de dépassement de l'indisponibilité contractuelle sur un mois, le client peut demander un avoir calculé prorata temporis sur sa facturation mensuelle.")}
            </p>

            {/* ─── 8. Données & confidentialité ─────────────────────────── */}
            <h2>{t('legal.cgv.s8.title', '8. Données Personnelles')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s8.body">
                Le traitement des données personnelles est régi par la <a href="/privacy-policy">Politique de Confidentialité</a> d'ESG Flow, conforme au Règlement (UE) 2016/679 (RGPD). L'Éditeur agit en qualité de responsable de traitement pour les données de compte et de sous-traitant pour les données ESG saisies par le client.
              </Trans>
            </p>

            {/* ─── 9. Propriété intellectuelle ──────────────────────────── */}
            <h2>{t('legal.cgv.s9.title', '9. Propriété Intellectuelle')}</h2>
            <p>
              {t('legal.cgv.s9.p1', 'La plateforme ESG Flow, son code source, ses interfaces, ses algorithmes de scoring et ses méthodologies ESG sont la propriété exclusive de {{company}} et sont protégés par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation non autorisée est strictement interdite.', { company: COMPANY })}
            </p>
            <p>
              {t('legal.cgv.s9.p2', "Le client conserve l'intégralité des droits sur les données ESG qu'il saisit dans la plateforme. Il bénéficie d'un droit d'export de ses données à tout moment, y compris en cas de résiliation.")}
            </p>

            {/* ─── 10. Responsabilité ────────────────────────────────────── */}
            <h2>{t('legal.cgv.s10.title', '10. Limitation de Responsabilité')}</h2>
            <p>
              {t('legal.cgv.s10.body', "La responsabilité de l'Éditeur est limitée aux dommages directs et ne peut excéder le montant des sommes versées par le client au cours des 12 derniers mois précédant le fait générateur. L'Éditeur n'est pas responsable des décisions réglementaires, de reporting ou d'investissement prises sur la base des données et scores produits par la plateforme.")}
            </p>

            {/* ─── 11. Loi applicable ────────────────────────────────────── */}
            <h2>{t('legal.cgv.s11.title', '11. Loi Applicable et Juridiction')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s11.p1">
                Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut de résolution amiable dans un délai de <strong>30 jours</strong>, les tribunaux compétents de Paris seront seuls compétents.
              </Trans>
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s11.p2">
                Pour tout litige de consommation, le client peut recourir gratuitement au médiateur de la consommation MEDICYS (<a href="https://www.medicys.fr" target="_blank" rel="noopener noreferrer">www.medicys.fr</a>).
              </Trans>
            </p>

            {/* ─── 12. Contact ───────────────────────────────────────────── */}
            <h2>{t('legal.cgv.s12.title', '12. Contact')}</h2>
            <p>
              <Trans i18nKey="legal.cgv.s12.p1">
                Pour toute question relative aux présentes CGV :<br /><a href={`mailto:${EMAIL_LEGAL}`}>{tv({ emailLegal: EMAIL_LEGAL })}</a>
              </Trans>
            </p>
            <p>
              <Trans i18nKey="legal.cgv.s12.p2">
                Pour toute question relative à la facturation :<br /><a href={`mailto:${EMAIL_BILLING}`}>{tv({ emailBilling: EMAIL_BILLING })}</a>
              </Trans>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
