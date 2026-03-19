"""
INSEE API service - French company data integration.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import os
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from sqlalchemy.ext.asyncio import AsyncSession


class INSEEService:
    """Service for INSEE Sirene API integration."""
    
    BASE_URL = "https://api.insee.fr/api-sirene/3.11"
    
    # Mode démo avec données mockées
    DEMO_MODE = os.getenv('INSEE_DEMO_MODE', 'true').lower() == 'true'
    
    # Codes APE principaux pour secteurs ESG-sensibles
    SECTEURS_ESG = {
        'energie': ['35.11Z', '35.12Z', '35.13Z', '35.14Z', '35.21Z', '35.22Z'],
        'dechets': ['38.11Z', '38.12Z', '38.21Z', '38.22Z', '38.31Z', '38.32Z'],
        'chimie': ['20.11Z', '20.12Z', '20.13Z', '20.14Z', '20.15Z', '20.16Z'],
        'transport': ['49.10Z', '49.20Z', '49.31Z', '49.32Z', '49.39Z', '49.41Z'],
        'construction': ['41.10A', '41.10B', '41.10C', '41.10D', '41.20A', '41.20B'],
        'agriculture': ['01.11Z', '01.12Z', '01.13Z', '01.14Z', '01.15Z', '01.16Z'],
    }
    
    # Base de données de démonstration complète
    DEMO_ENTREPRISES = [
        # SECTEUR ÉNERGIE
        {
            'siren': '552081317',
            'siret': '55208131700011',
            'denomination': 'ELECTRICITE DE FRANCE',
            'activite_principale': '35.11Z',
            'secteur': 'energie',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '22-30 Avenue de Wagram, 75008 Paris',
                'code_postal': '75008',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '542107651',
            'siret': '54210765100042',
            'denomination': 'ENGIE',
            'activite_principale': '35.12Z',
            'secteur': 'energie',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '1 Place Samuel de Champlain, 92400 Courbevoie',
                'code_postal': '92400',
                'commune': 'Courbevoie',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '542051180',
            'siret': '54205118000047',
            'denomination': 'TOTALENERGIES SE',
            'activite_principale': '35.13Z',
            'secteur': 'energie',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '2 Place Jean Millier, 92400 Courbevoie',
                'code_postal': '92400',
                'commune': 'Courbevoie',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '433455042',
            'siret': '43345504200045',
            'denomination': 'VOLTALIA',
            'activite_principale': '35.11Z',
            'secteur': 'energie',
            'tranche_effectifs': '31',
            'adresse': {
                'adresse_complete': '84 Boulevard de Sébastopol, 75003 Paris',
                'code_postal': '75003',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '384974402',
            'siret': '38497440200039',
            'denomination': 'NEOEN',
            'activite_principale': '35.11Z',
            'secteur': 'energie',
            'tranche_effectifs': '22',
            'adresse': {
                'adresse_complete': '6 Rue Ménars, 75002 Paris',
                'code_postal': '75002',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        
        # SECTEUR DÉCHETS
        {
            'siren': '050207502',
            'siret': '05020750200066',
            'denomination': 'VEOLIA ENVIRONNEMENT',
            'activite_principale': '38.11Z',
            'secteur': 'dechets',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '21 Rue de la Boétie, 75008 Paris',
                'code_postal': '75008',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '572025526',
            'siret': '57202552600011',
            'denomination': 'SUEZ',
            'activite_principale': '38.11Z',
            'secteur': 'dechets',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '16 Place de l\'Iris, 92400 Courbevoie',
                'code_postal': '92400',
                'commune': 'Courbevoie',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '775684018',
            'siret': '77568401800025',
            'denomination': 'PAPREC GROUP',
            'activite_principale': '38.32Z',
            'secteur': 'dechets',
            'tranche_effectifs': '52',
            'adresse': {
                'adresse_complete': '7-9 Rue du Docteur Lancereaux, 75008 Paris',
                'code_postal': '75008',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '428283304',
            'siret': '42828330400036',
            'denomination': 'NICOLLIN',
            'activite_principale': '38.11Z',
            'secteur': 'dechets',
            'tranche_effectifs': '32',
            'adresse': {
                'adresse_complete': '155 Avenue de la Pompignane, 34000 Montpellier',
                'code_postal': '34000',
                'commune': 'Montpellier',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        
        # SECTEUR CHIMIE
        {
            'siren': '542013296',
            'siret': '54201329600010',
            'denomination': 'AIR LIQUIDE',
            'activite_principale': '20.11Z',
            'secteur': 'chimie',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '75 Quai d\'Orsay, 75007 Paris',
                'code_postal': '75007',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '562100785',
            'siret': '56210078500047',
            'denomination': 'ARKEMA',
            'activite_principale': '20.14Z',
            'secteur': 'chimie',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '420 Rue d\'Estienne d\'Orves, 92700 Colombes',
                'code_postal': '92700',
                'commune': 'Colombes',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '301775165',
            'siret': '30177516500033',
            'denomination': 'SOLVAY',
            'activite_principale': '20.13Z',
            'secteur': 'chimie',
            'tranche_effectifs': '42',
            'adresse': {
                'adresse_complete': '52 Rue de la Haie Coq, 93300 Aubervilliers',
                'code_postal': '93300',
                'commune': 'Aubervilliers',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '775672351',
            'siret': '77567235100028',
            'denomination': 'AXENS',
            'activite_principale': '20.14Z',
            'secteur': 'chimie',
            'tranche_effectifs': '31',
            'adresse': {
                'adresse_complete': '87 Avenue de la Liberté, 92000 Nanterre',
                'code_postal': '92000',
                'commune': 'Nanterre',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        
        # SECTEUR TRANSPORT
        {
            'siren': '542065479',
            'siret': '54206547900047',
            'denomination': 'RENAULT S.A.S.',
            'activite_principale': '49.10Z',
            'secteur': 'transport',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '122-122 Avenue du Général Leclerc, 92100 Boulogne-Billancourt',
                'code_postal': '92100',
                'commune': 'Boulogne-Billancourt',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '775670417',
            'siret': '77567041700037',
            'denomination': 'GROUPE PSA',
            'activite_principale': '49.10Z',
            'secteur': 'transport',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '7 Rue Henri Sainte-Claire Deville, 92500 Rueil-Malmaison',
                'code_postal': '92500',
                'commune': 'Rueil-Malmaison',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '552032534',
            'siret': '55203253400028',
            'denomination': 'SNCF VOYAGEURS',
            'activite_principale': '49.10Z',
            'secteur': 'transport',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '9 Rue Jean-Philippe Rameau, 93200 Saint-Denis',
                'code_postal': '93200',
                'commune': 'Saint-Denis',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '552008011',
            'siret': '55200801100015',
            'denomination': 'RATP',
            'activite_principale': '49.31Z',
            'secteur': 'transport',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '54 Quai de la Râpée, 75012 Paris',
                'code_postal': '75012',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '343059564',
            'siret': '34305956400028',
            'denomination': 'TRANSDEV',
            'activite_principale': '49.31Z',
            'secteur': 'transport',
            'tranche_effectifs': '52',
            'adresse': {
                'adresse_complete': '6 Avenue Raymond Poincaré, 75116 Paris',
                'code_postal': '75116',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        
        # SECTEUR CONSTRUCTION
        {
            'siren': '542032277',
            'siret': '54203227700015',
            'denomination': 'VINCI',
            'activite_principale': '41.10A',
            'secteur': 'construction',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '1 Cours Ferdinand de Lesseps, 92500 Rueil-Malmaison',
                'code_postal': '92500',
                'commune': 'Rueil-Malmaison',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '775684143',
            'siret': '77568414300055',
            'denomination': 'BOUYGUES CONSTRUCTION',
            'activite_principale': '41.10A',
            'secteur': 'construction',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '1 Avenue Eugène Freyssinet, 78280 Guyancourt',
                'code_postal': '78280',
                'commune': 'Guyancourt',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '572093296',
            'siret': '57209329600047',
            'denomination': 'EIFFAGE',
            'activite_principale': '41.10B',
            'secteur': 'construction',
            'tranche_effectifs': '53',
            'adresse': {
                'adresse_complete': '3-7 Place de l\'Europe, 78140 Vélizy-Villacoublay',
                'code_postal': '78140',
                'commune': 'Vélizy-Villacoublay',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '487624777',
            'siret': '48762477700039',
            'denomination': 'NGE',
            'activite_principale': '41.10C',
            'secteur': 'construction',
            'tranche_effectifs': '42',
            'adresse': {
                'adresse_complete': '2 Rue Paul Vaillant-Couturier, 92300 Levallois-Perret',
                'code_postal': '92300',
                'commune': 'Levallois-Perret',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        
        # SECTEUR AGRICULTURE
        {
            'siren': '552018944',
            'siret': '55201894400017',
            'denomination': 'TERRENA',
            'activite_principale': '01.11Z',
            'secteur': 'agriculture',
            'tranche_effectifs': '42',
            'adresse': {
                'adresse_complete': 'La Noëlle, 44150 Ancenis',
                'code_postal': '44150',
                'commune': 'Ancenis',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '542025332',
            'siret': '54202533200041',
            'denomination': 'VIVESCIA',
            'activite_principale': '01.11Z',
            'secteur': 'agriculture',
            'tranche_effectifs': '41',
            'adresse': {
                'adresse_complete': '23 Rue Baltet, 51100 Reims',
                'code_postal': '51100',
                'commune': 'Reims',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '444610593',
            'siret': '44461059300028',
            'denomination': 'AXEREAL',
            'activite_principale': '01.11Z',
            'secteur': 'agriculture',
            'tranche_effectifs': '31',
            'adresse': {
                'adresse_complete': '32 Rue Emile Zola, 45000 Orléans',
                'code_postal': '45000',
                'commune': 'Orléans',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
        {
            'siren': '552120435',
            'siret': '55212043500033',
            'denomination': 'IN VIVO',
            'activite_principale': '01.11Z',
            'secteur': 'agriculture',
            'tranche_effectifs': '42',
            'adresse': {
                'adresse_complete': '83 Avenue de la Grande Armée, 75116 Paris',
                'code_postal': '75116',
                'commune': 'Paris',
            },
            'etablissement_siege': True,
            'etat_administratif': 'A',
        },
    ]
    
    def __init__(self, db: AsyncSession, api_key: Optional[str] = None):
        self.db = db
        self.api_key = api_key or os.getenv('INSEE_API_KEY', '')
    
    async def rechercher_entreprise(
        self,
        query: str,
        nombre_resultats: int = 20,
    ) -> Dict[str, Any]:
        """Rechercher une entreprise par nom, SIREN ou SIRET."""
        
        if self.DEMO_MODE or not self.api_key:
            return self._recherche_demo(query)
        
        return await self._recherche_api(query, nombre_resultats)
    
    def _recherche_demo(self, query: str) -> Dict[str, Any]:
        """Recherche en mode démonstration."""
        
        query_lower = query.lower()
        results = []
        
        for entreprise in self.DEMO_ENTREPRISES:
            if (query_lower in entreprise.get('denomination', '').lower() or
                query in entreprise.get('siren', '') or
                query in entreprise.get('siret', '')):
                results.append(entreprise)
        
        if not results and len(query) < 3:
            results = self.DEMO_ENTREPRISES[:20]
        
        return {
            'total': len(results),
            'entreprises': results,
        }
    
    async def obtenir_details_entreprise(self, siren: str) -> Dict[str, Any]:
        """Obtenir les détails complets d'une entreprise par SIREN."""
        
        if self.DEMO_MODE or not self.api_key:
            for entreprise in self.DEMO_ENTREPRISES:
                if entreprise.get('siren') == siren:
                    return entreprise
            raise ValueError(f"Entreprise {siren} non trouvée")
        
        # API réelle...
        return {}
    
    async def lister_etablissements(
        self,
        siren: str,
        actifs_seulement: bool = True,
    ) -> List[Dict[str, Any]]:
        """Lister tous les établissements d'une entreprise."""
        
        if self.DEMO_MODE or not self.api_key:
            for entreprise in self.DEMO_ENTREPRISES:
                if entreprise.get('siren') == siren:
                    return [entreprise]
            return []
        
        return []
    
    async def rechercher_par_secteur(
        self,
        secteur: str,
        departement: Optional[str] = None,
        nombre_resultats: int = 100,
    ) -> List[Dict[str, Any]]:
        """Rechercher des entreprises par secteur d'activité."""
        
        if secteur.lower() not in self.SECTEURS_ESG:
            raise ValueError(f"Secteur inconnu: {secteur}. Choix: {list(self.SECTEURS_ESG.keys())}")
        
        if self.DEMO_MODE or not self.api_key:
            results = [
                e for e in self.DEMO_ENTREPRISES 
                if e.get('secteur') == secteur.lower()
            ]
            
            if departement:
                results = [
                    e for e in results
                    if e.get('adresse', {}).get('code_postal', '').startswith(departement)
                ]
            
            return results[:nombre_resultats]
        
        return []
    
    async def _recherche_api(self, query: str, nombre_resultats: int) -> Dict[str, Any]:
        """Recherche via API réelle INSEE."""
        # Implementation API réelle ici...
        return {'total': 0, 'entreprises': []}
