"""
Sectoral Templates endpoints.

  GET    /templates/sectoral             — Gallery (list available templates)
  GET    /templates/sectoral/{sector_id} — Preview entries before applying
  POST   /templates/sectoral/apply       — Crée les indicateurs du template (aucune valeur)
  POST   /templates/sectoral/revert      — Supprime les valeurs créées par les anciennes versions
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.permissions import Roles
from app.dependencies import get_current_user, require_any_role
from app.models.user import User
from app.services.template_apply_service import TemplateApplyService

router = APIRouter(prefix="/templates", tags=["Sectoral Templates"])


class ApplyTemplateRequest(BaseModel):
    sector_id: str = Field(..., description="One of: industry, retail, services, agro, finance, pharma, technology, immo, vsme")
    organization_id: Optional[UUID] = Field(default=None, description="Target organization (defaults to first org)")
    year: Optional[int] = Field(default=None, description="Reporting year (defaults to N-1)")
    mode: str = Field(default="merge", pattern="^(merge|replace)$",
                      description="merge = skip existing; replace = delete prior template entries first")


class RevertTemplateRequest(BaseModel):
    organization_id: Optional[UUID] = None
    year: Optional[int] = None


@router.get("/sectoral", summary="Liste des templates sectoriels disponibles")
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Galerie des 9 templates (8 sectoriels + norme VSME) avec décompte d'entrées par pilier."""
    service = TemplateApplyService(db, current_user.tenant_id)
    return await service.list_templates()


@router.get("/sectoral/{sector_id}", summary="Aperçu détaillé d'un template")
async def preview_template(
    sector_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste complète des entrées que le template créera."""
    service = TemplateApplyService(db, current_user.tenant_id)
    preview = await service.preview(sector_id)
    if preview.get("error"):
        raise HTTPException(status_code=404, detail=preview["error"])
    return preview


@router.post("/sectoral/apply", summary="Appliquer un template (crée les indicateurs, aucune valeur)")
async def apply_template(
    body: ApplyTemplateRequest,
    current_user: User = Depends(require_any_role(*Roles.MANAGER_OR_ABOVE)),
    db: AsyncSession = Depends(get_db),
):
    """Crée les indicateurs du template (nom, unité, pilier, méthode). Aucune valeur n'est saisie."""
    service = TemplateApplyService(db, current_user.tenant_id)
    result = await service.apply(
        sector_id=body.sector_id,
        organization_id=body.organization_id,
        year=body.year,
        mode=body.mode,
        created_by_id=current_user.id,
    )
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/sectoral/revert", summary="Supprimer les valeurs créées par les anciennes versions des templates")
async def revert_template(
    body: RevertTemplateRequest,
    current_user: User = Depends(require_any_role(*Roles.MANAGER_OR_ABOVE)),
    db: AsyncSession = Depends(get_db),
):
    """Supprime les valeurs de template (jamais les valeurs saisies par l'utilisateur)."""
    service = TemplateApplyService(db, current_user.tenant_id)
    return await service.revert(
        organization_id=body.organization_id,
        year=body.year,
    )
