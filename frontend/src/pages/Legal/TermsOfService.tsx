import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Button
          variant="secondary"
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-primary-100 p-3">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Conditions Générales d'Utilisation</h1>
              <p className="mt-1 text-sm text-gray-600">Dernière mise à jour : 17 mars 2026</p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2>1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités
              et conditions dans lesquelles ESGFlow met à disposition sa plateforme de gestion ESG
              (Environnementale, Sociale et de Gouvernance).
            </p>

            <h2>2. Définitions</h2>
            <ul>
              <li><strong>Plateforme</strong> : désigne la solution SaaS ESGFlow accessible via l'URL https://esgflow.com</li>
              <li><strong>Utilisateur</strong> : toute personne physique ou morale accédant et utilisant la Plateforme</li>
              <li><strong>Données ESG</strong> : ensemble des données environnementales, sociales et de gouvernance collectées et traitées</li>
              <li><strong>Organisation</strong> : entité juridique pour laquelle les données ESG sont collectées</li>
            </ul>

            <h2>3. Acceptation des CGU</h2>
            <p>
              L'accès et l'utilisation de la Plateforme impliquent l'acceptation pleine et entière des présentes CGU.
              L'Utilisateur reconnaît avoir pris connaissance des CGU et les accepte sans réserve.
            </p>

            <h2>4. Accès à la Plateforme</h2>
            <h3>4.1 Inscription</h3>
            <p>
              L'accès à la Plateforme nécessite la création d'un compte utilisateur. L'Utilisateur s'engage à
              fournir des informations exactes, complètes et à jour.
            </p>

            <h3>4.2 Identifiants</h3>
            <p>
              L'Utilisateur est seul responsable de la confidentialité de ses identifiants de connexion.
              Toute connexion effectuée avec ses identifiants est présumée avoir été effectuée par lui.
            </p>

            <h2>5. Services Proposés</h2>
            <p>La Plateforme propose les services suivants :</p>
            <ul>
              <li>Collecte et saisie de données ESG (manuelle et via import CSV)</li>
              <li>Calcul automatique d'indicateurs ESG</li>
              <li>Génération de rapports conformes aux standards (GRI, ESRS, TCFD, CSRD)</li>
              <li>Analyse de matérialité et gestion des risques ESG</li>
              <li>Tableau de bord et visualisation de données</li>
              <li>Scoring et notation ESG</li>
            </ul>

            <h2>6. Obligations de l'Utilisateur</h2>
            <p>L'Utilisateur s'engage à :</p>
            <ul>
              <li>Utiliser la Plateforme de manière conforme à sa destination</li>
              <li>Ne pas porter atteinte aux droits de tiers</li>
              <li>Respecter les lois et règlements en vigueur</li>
              <li>Fournir des données ESG exactes et vérifiables</li>
              <li>Ne pas tenter d'accéder aux données d'autres Organisations</li>
              <li>Ne pas surcharger ou perturber le fonctionnement de la Plateforme</li>
            </ul>

            <h2>7. Propriété Intellectuelle</h2>
            <p>
              La Plateforme, son code source, sa structure, son design et tous les éléments qui la composent
              sont la propriété exclusive d'ESGFlow. Toute reproduction, représentation, modification ou
              exploitation non autorisée est interdite.
            </p>

            <h3>7.1 Données de l'Utilisateur</h3>
            <p>
              L'Utilisateur conserve l'entière propriété de ses données ESG. ESGFlow s'engage à ne pas
              utiliser ces données à des fins autres que la fourniture du service.
            </p>

            <h2>8. Protection des Données Personnelles</h2>
            <p>
              Le traitement des données personnelles est régi par notre{' '}
              <a href="/privacy-policy" className="text-primary-600 hover:underline">
                Politique de Confidentialité
              </a>
              , conforme au Règlement Général sur la Protection des Données (RGPD).
            </p>

            <h2>9. Sécurité</h2>
            <p>ESGFlow met en œuvre les mesures de sécurité suivantes :</p>
            <ul>
              <li>Chiffrement des données en transit (TLS/SSL)</li>
              <li>Chiffrement des données au repos</li>
              <li>Authentification sécurisée</li>
              <li>Contrôle d'accès basé sur les rôles (RBAC)</li>
              <li>Sauvegardes régulières</li>
              <li>Hébergement sur infrastructure certifiée (ISO 27001)</li>
            </ul>

            <h2>10. Disponibilité du Service</h2>
            <p>
              ESGFlow s'efforce d'assurer une disponibilité de 99,5% de la Plateforme. Des interruptions
              peuvent survenir pour maintenance, mises à jour ou cas de force majeure.
            </p>

            <h2>11. Limitation de Responsabilité</h2>
            <p>
              ESGFlow ne saurait être tenu responsable :
            </p>
            <ul>
              <li>De l'inexactitude des données fournies par l'Utilisateur</li>
              <li>Des décisions prises sur la base des rapports générés</li>
              <li>Des dommages indirects ou consécutifs</li>
              <li>De la perte de données due à un cas de force majeure</li>
            </ul>

            <h2>12. Résiliation</h2>
            <p>
              L'Utilisateur peut résilier son compte à tout moment depuis les paramètres de son compte.
              ESGFlow se réserve le droit de suspendre ou résilier un compte en cas de violation des CGU.
            </p>

            <h2>13. Modifications des CGU</h2>
            <p>
              ESGFlow se réserve le droit de modifier les présentes CGU. Les Utilisateurs seront informés
              de toute modification substantielle par email et/ou notification dans la Plateforme.
            </p>

            <h2>14. Loi Applicable et Juridiction</h2>
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige sera porté devant les
              tribunaux compétents de Paris, France.
            </p>

            <h2>15. Contact</h2>
            <p>
              Pour toute question concernant les CGU :<br />
              Email : legal@esgflow.com<br />
              Adresse : ESGFlow SAS, 123 Avenue des Champs-Élysées, 75008 Paris, France
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
