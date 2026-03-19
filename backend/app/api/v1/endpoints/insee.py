"""
INSEE API endpoints - French company data.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.services.insee_service import INSEEService

router = APIRouter()


class EntrepriseRecherche(BaseModel):
    query: str
    nombre_resultats: int = 20


class SecteurRecherche(BaseModel):
    secteur: str
    departement: Optional[str] = None
    nombre_resultats: int = 100


@router.get("/rechercher")
async def rechercher_entreprise(
    q: str = Query(..., description="Nom, SIREN (9 chiffres) ou SIRET (14 chiffres)"),
    nombre: int = Query(20, ge=1, le=100, description="Nombre de résultats"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Rechercher une entreprise française dans la base Sirene.
    
    **Exemples:**
    - Par nom: `?q=Renault`
    - Par SIREN: `?q=542065479`
    - Par SIRET: `?q=54206547900047`
    """
    
    service = INSEEService(db)
    
    try:
        result = await service.rechercher_entreprise(q, nombre)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur API INSEE: {str(e)}")


@router.get("/entreprise/{siren}")
async def obtenir_entreprise(
    siren: str,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtenir les détails complets d'une entreprise par SIREN.
    
    **Paramètre:**
    - siren: Numéro SIREN à 9 chiffres (ex: 542065479)
    """
    
    if not siren.isdigit() or len(siren) != 9:
        raise HTTPException(status_code=400, detail="SIREN doit contenir 9 chiffres")
    
    service = INSEEService(db)
    
    try:
        result = await service.obtenir_details_entreprise(siren)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur API INSEE: {str(e)}")


@router.get("/entreprise/{siren}/etablissements")
async def lister_etablissements(
    siren: str,
    actifs_seulement: bool = Query(True, description="Uniquement les établissements actifs"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Lister tous les établissements d'une entreprise.
    
    **Paramètre:**
    - siren: Numéro SIREN à 9 chiffres
    """
    
    if not siren.isdigit() or len(siren) != 9:
        raise HTTPException(status_code=400, detail="SIREN doit contenir 9 chiffres")
    
    service = INSEEService(db)
    
    try:
        result = await service.lister_etablissements(siren, actifs_seulement)
        return {
            'siren': siren,
            'total': len(result),
            'etablissements': result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur API INSEE: {str(e)}")


@router.get("/secteurs")
async def lister_secteurs():
    """Liste les secteurs ESG disponibles pour la recherche."""
    
    return {
        'secteurs': [
            {'id': 'energie', 'nom': 'Énergie', 'description': 'Production et distribution d\'énergie'},
            {'id': 'dechets', 'nom': 'Gestion des déchets', 'description': 'Collecte et traitement des déchets'},
            {'id': 'chimie', 'nom': 'Industrie chimique', 'description': 'Fabrication de produits chimiques'},
            {'id': 'transport', 'nom': 'Transport', 'description': 'Transport de marchandises et de voyageurs'},
            {'id': 'construction', 'nom': 'Construction', 'description': 'Construction de bâtiments'},
            {'id': 'agriculture', 'nom': 'Agriculture', 'description': 'Cultures et élevage'},
        ]
    }


@router.get("/secteur/{secteur}")
async def rechercher_par_secteur(
    secteur: str,
    departement: Optional[str] = Query(None, description="Code département (ex: 75)"),
    nombre: int = Query(100, ge=1, le=1000),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Rechercher des entreprises par secteur d'activité ESG-sensible.
    
    **Secteurs disponibles:**
    - energie
    - dechets
    - chimie
    - transport
    - construction
    - agriculture
    """
    
    service = INSEEService(db)
    
    try:
        result = await service.rechercher_par_secteur(secteur, departement, nombre)
        return {
            'secteur': secteur,
            'departement': departement,
            'total': len(result),
            'entreprises': result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur API INSEE: {str(e)}")
