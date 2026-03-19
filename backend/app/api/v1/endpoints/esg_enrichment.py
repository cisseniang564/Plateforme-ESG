"""
ESG Data Enrichment endpoints.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.services.esg_data_enrichment_service import ESGDataEnrichmentService

router = APIRouter()


class EnrichOrganizationRequest(BaseModel):
    organization_id: UUID
    siren: str
    generer_donnees: bool = True


class ImportSecteurRequest(BaseModel):
    secteur: str
    departement: Optional[str] = None


class GenerateDemoDataRequest(BaseModel):
    organization_id: UUID


@router.post("/enrichir-organisation")
async def enrichir_organisation(
    data: EnrichOrganizationRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Enrichir une organisation avec les données INSEE et générer des données ESG.
    
    **Workflow:**
    1. Récupère les infos INSEE (SIREN)
    2. Met à jour les métadonnées de l'organisation
    3. Génère automatiquement 12 mois de données ESG basées sur le secteur
    """
    
    # Get user's tenant
    from sqlalchemy import select
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ESGDataEnrichmentService(db)
    
    try:
        result = await service.lier_organisation_a_siren(
            tenant_id=user.tenant_id,
            organization_id=data.organization_id,
            siren=data.siren,
            generer_donnees=data.generer_donnees,
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")


@router.post("/importer-secteur")
async def importer_secteur(
    data: ImportSecteurRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Importer automatiquement des organisations depuis un secteur INSEE.
    
    **Exemple:** Importer toutes les entreprises du secteur énergie en Île-de-France
    """
    
    from sqlalchemy import select
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ESGDataEnrichmentService(db)
    
    try:
        result = await service.importer_indicateurs_depuis_secteur(
            tenant_id=user.tenant_id,
            secteur=data.secteur,
            departement=data.departement,
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/generer-donnees-demo")
async def generer_donnees_demo(
    data: GenerateDemoDataRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Générer des données de démonstration ESG pour une organisation.
    
    **Note:** Génère 12 mois de données basées sur le secteur et la taille de l'entreprise
    """
    
    from sqlalchemy import select
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ESGDataEnrichmentService(db)
    
    try:
        result = await service.generer_donnees_indicateurs_demo(
            tenant_id=user.tenant_id,
            organization_id=data.organization_id,
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
