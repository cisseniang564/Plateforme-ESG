import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/common/Button';

export default function LegalNotice() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('legal.back')}
        </Button>

        <div className="rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-gray-100 p-3">
              <Info className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('legal.legalNoticeTitle')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('legal.legalNoticeSubtitle')}</p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2>1. Éditeur du Site</h2>
            <p>
              <strong>Raison sociale :</strong> ESGFlow SAS<br />
              <strong>Forme juridique :</strong> Société par Actions Simplifiée<br />
              <strong>Capital social :</strong> 100 000 €<br />
              <strong>SIRET :</strong> 123 456 789 00012<br />
              <strong>RCS :</strong> Paris B 123 456 789<br />
              <strong>TVA intracommunautaire :</strong> FR 12 123456789<br />
              <strong>Siège social :</strong> 123 Avenue des Champs-Élysées, 75008 Paris, France<br />
              <strong>Téléphone :</strong> +33 1 23 45 67 89<br />
              <strong>Email :</strong> contact@greenconnect.cloud
            </p>

            <h3>Directeur de la publication</h3>
            <p>
              M. Jean Dupont, Président<br />
              Email : direction@greenconnect.cloud
            </p>

            <h2>2. Hébergement</h2>
            <p>
              <strong>Hébergeur :</strong> OVH SAS<br />
              <strong>Siège social :</strong> 2 rue Kellermann, 59100 Roubaix, France<br />
              <strong>Téléphone :</strong> 1007 (service client)<br />
              <strong>Site web :</strong> <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">www.ovhcloud.com</a>
            </p>

            <h2>3. Propriété Intellectuelle</h2>
            <p>
              L'ensemble du site ESGFlow (structure, graphismes, textes, images, logos, icônes, etc.)
              est la propriété exclusive d'ESGFlow SAS, sauf mentions particulières.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie
              des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans
              autorisation écrite préalable d'ESGFlow SAS.
            </p>

            <h3>Marques</h3>
            <p>
              Les marques "ESGFlow" et les logos associés sont des marques déposées. Toute utilisation
              non autorisée constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants
              du Code de la Propriété Intellectuelle.
            </p>

            <h2>4. Protection des Données Personnelles</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
              d'un droit d'accès, de rectification, de suppression et d'opposition aux données vous concernant.
            </p>
            <p>
              Pour plus d'informations, consultez notre{' '}
              <a href="/privacy-policy" className="text-primary-600 hover:underline">
                {t('legal.privacyLink')}
              </a>.
            </p>

            <h3>Délégué à la Protection des Données (DPO)</h3>
            <p>
              Email : privacy@greenconnect.cloud<br />
              Courrier : ESGFlow SAS - DPO, 123 Avenue des Champs-Élysées, 75008 Paris, France
            </p>

            <h2>5. Cookies</h2>
            <p>
              Le site utilise des cookies pour améliorer l'expérience utilisateur. Vous pouvez gérer
              vos préférences via le bandeau de consentement ou les paramètres de votre navigateur.
            </p>

            <h2>6. Liens Hypertextes</h2>
            <p>
              Le site peut contenir des liens vers des sites tiers. ESGFlow ne peut être tenu responsable
              du contenu de ces sites externes.
            </p>

            <h2>7. Limitation de Responsabilité</h2>
            <p>
              ESGFlow s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur
              ce site. Toutefois, ESGFlow ne peut garantir l'exactitude, la précision ou l'exhaustivité
              des informations mises à disposition.
            </p>

            <h2>8. Droit Applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. Tout litige sera porté
              devant les tribunaux compétents de Paris.
            </p>

            <h2>9. Crédits</h2>
            <p>
              <strong>Conception et développement :</strong> ESGFlow SAS<br />
              <strong>Icônes :</strong> Lucide Icons (MIT License)<br />
              <strong>Illustrations :</strong> Propriété ESGFlow SAS
            </p>

            <h2>10. Contact</h2>
            <p>
              Pour toute question concernant ces mentions légales :<br />
              Email : legal@greenconnect.cloud<br />
              Téléphone : +33 1 23 45 67 89<br />
              Courrier : ESGFlow SAS, 12 Vieux chemin de meaux, 93190 Livry-Gargan, France
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
