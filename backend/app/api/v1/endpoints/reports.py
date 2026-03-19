"""
Reports API - Generate ESG Reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
import io

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()


class ReportGenerateRequest(BaseModel):
    report_type: str  # executive, detailed, csrd, gri, tcfd
    organization_id: Optional[UUID] = None
    period: str = 'annual'  # monthly, quarterly, annual
    year: Optional[int] = None
    format: str = 'pdf'  # pdf, excel, word


@router.post("/generate")
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate ESG report and return as download"""
    
    service = ReportService(db)
    
    try:
        # Générer le rapport
        report_bytes = await service.generate_report(
            tenant_id=current_user.tenant_id,
            report_type=request.report_type,
            organization_id=request.organization_id,
            period=request.period,
            year=request.year,
            format=request.format
        )
        
        # Déterminer le nom du fichier
        from datetime import datetime
        year = request.year or datetime.now().year
        filename = f"rapport_{request.report_type}_{year}.{request.format}"
        
        # Déterminer le content-type
        content_types = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'word': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        content_type = content_types.get(request.format, 'application/octet-stream')
        
        # Retourner en streaming
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/types")
async def get_report_types():
    """Get available report types"""
    return ReportService.REPORT_TYPES


@router.get("/preview/{report_type}")
async def preview_report(
    report_type: str,
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get preview data for report (metadata, not full PDF)"""
    
    service = ReportService(db)
    
    # Collecter les données pour le preview
    data = await service._collect_data(
        tenant_id=current_user.tenant_id,
        organization_id=None,
        year=year
    )
    
    return {
        'report_type': report_type,
        'year': year,
        'stats': data['stats'],
        'data_points': {
            'environmental': len(data['entries']['environmental']),
            'social': len(data['entries']['social']),
            'governance': len(data['entries']['governance']),
        }
    }
