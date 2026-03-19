"""
Integrations API endpoints with OAuth support.
"""
from uuid import UUID
from typing import Optional
from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.integration import Integration, IntegrationType
from app.services.google_sheets_service import GoogleSheetsService
from app.services.google_oauth_service import GoogleOAuthService

router = APIRouter()


class IntegrationCreate(BaseModel):
    name: str
    type: IntegrationType
    config: dict


class GoogleSheetsImport(BaseModel):
    integration_id: UUID
    spreadsheet_id: str
    sheet_name: str = "Sheet1"


class GoogleSheetsExport(BaseModel):
    integration_id: UUID
    spreadsheet_id: str
    sheet_name: str = "ESG Data"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# OAuth state storage (in production, use Redis)
oauth_states = {}


@router.get("/types")
async def list_integration_types():
    """List available integration types."""
    
    return {
        "types": [
            {
                "id": IntegrationType.GOOGLE_SHEETS,
                "name": "Google Sheets",
                "description": "Import and export data from Google Sheets",
                "features": ["import", "export", "real-time sync"],
                "requires_oauth": True,
            },
            {
                "id": IntegrationType.POWER_BI,
                "name": "Microsoft Power BI",
                "description": "Connect to Power BI for visualization",
                "features": ["export", "dashboard embedding"],
                "requires_oauth": True,
            },
            {
                "id": IntegrationType.TABLEAU,
                "name": "Tableau",
                "description": "Connect to Tableau for analytics",
                "features": ["export", "live connection"],
                "requires_oauth": False,
            },
            {
                "id": IntegrationType.EXCEL_ONLINE,
                "name": "Excel Online",
                "description": "Sync with Excel Online",
                "features": ["import", "export"],
                "requires_oauth": True,
            },
        ]
    }


@router.get("/")
async def list_integrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all integrations for current tenant."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(Integration).where(Integration.tenant_id == user.tenant_id)
    
    count_query = select(func.count()).select_from(Integration).where(
        Integration.tenant_id == user.tenant_id
    )
    total = await db.scalar(count_query) or 0
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Integration.created_at.desc())
    
    result = await db.execute(query)
    integrations = result.scalars().all()
    
    return {
        "items": [{
            "id": str(i.id),
            "name": i.name,
            "type": i.type.value,
            "is_active": i.is_active,
            "last_sync_at": i.last_sync_at.isoformat() if i.last_sync_at else None,
            "last_error": i.last_error,
            "user_email": i.config.get('credentials', {}).get('user_email') if i.config else None,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        } for i in integrations],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/google/authorize")
async def google_authorize(
    integration_name: str = Query(..., description="Name for the integration"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Start Google OAuth flow.
    
    Returns a redirect URL to Google's consent screen.
    """
    
    # Get user to verify tenant
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate state token
    state = secrets.token_urlsafe(32)
    
    # Store state with user/tenant info (in production, use Redis with TTL)
    oauth_states[state] = {
        'user_id': str(user_id),
        'tenant_id': str(user.tenant_id),
        'integration_name': integration_name,
        'created_at': datetime.utcnow().isoformat(),
    }
    
    # Generate authorization URL
    oauth_service = GoogleOAuthService(db)
    auth_url = oauth_service.get_authorization_url(state)
    
    return {
        "authorization_url": auth_url,
        "state": state,
    }


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Google OAuth callback.
    
    This endpoint is called by Google after user authorizes.
    """
    
    # Verify state
    state_data = oauth_states.get(state)
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired state token")
    
    # Clean up state
    del oauth_states[state]
    
    tenant_id = state_data['tenant_id']
    integration_name = state_data['integration_name']
    
    # Handle callback and create integration
    oauth_service = GoogleOAuthService(db)
    
    try:
        result = await oauth_service.handle_callback(
            code=code,
            state=state,
            tenant_id=tenant_id,
            integration_name=integration_name,
        )
        
        # Redirect to frontend with success
        return RedirectResponse(
            url=f"http://localhost:3000/settings/integrations?success=true&integration_id={result['id']}"
        )
    
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"http://localhost:3000/settings/integrations?error={str(e)}"
        )


@router.post("/google-sheets/import")
async def import_from_google_sheets(
    data: GoogleSheetsImport,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Import data from Google Sheets with validation and retry."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = GoogleSheetsService(db)
    
    try:
        result = await service.import_from_sheet(
            tenant_id=user.tenant_id,
            integration_id=data.integration_id,
            spreadsheet_id=data.spreadsheet_id,
            sheet_name=data.sheet_name,
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/google-sheets/export")
async def export_to_google_sheets(
    data: GoogleSheetsExport,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Export data to Google Sheets with filters."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = GoogleSheetsService(db)
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(data.start_date) if data.start_date else None
    end_date = datetime.fromisoformat(data.end_date) if data.end_date else None
    
    try:
        result = await service.export_to_sheet(
            tenant_id=user.tenant_id,
            integration_id=data.integration_id,
            spreadsheet_id=data.spreadsheet_id,
            sheet_name=data.sheet_name,
            start_date=start_date,
            end_date=end_date,
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/{integration_id}/test")
async def test_integration(
    integration_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Test an integration connection."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get integration
    integration_query = select(Integration).where(
        Integration.id == integration_id,
        Integration.tenant_id == user.tenant_id
    )
    integration_result = await db.execute(integration_query)
    integration = integration_result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Test based on type
    if integration.type == IntegrationType.GOOGLE_SHEETS:
        oauth_service = GoogleOAuthService(db)
        try:
            creds = await oauth_service.refresh_credentials(str(integration_id))
            
            # Try to list files
            from googleapiclient.discovery import build
            service = build('drive', 'v3', credentials=creds)
            results = service.files().list(pageSize=1).execute()
            
            return {
                "status": "success",
                "message": "Connection successful",
                "user_email": integration.config.get('credentials', {}).get('user_email'),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection failed: {str(e)}",
            }
    
    return {
        "status": "not_implemented",
        "message": f"Test not implemented for {integration.type}",
    }


@router.patch("/{integration_id}")
async def update_integration(
    integration_id: UUID,
    is_active: Optional[bool] = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update integration settings."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    integration_query = select(Integration).where(
        Integration.id == integration_id,
        Integration.tenant_id == user.tenant_id
    )
    integration_result = await db.execute(integration_query)
    integration = integration_result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    if is_active is not None:
        integration.is_active = is_active
    
    await db.commit()
    
    return {"message": "Integration updated successfully"}


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an integration."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    integration_query = select(Integration).where(
        Integration.id == integration_id,
        Integration.tenant_id == user.tenant_id
    )
    integration_result = await db.execute(integration_query)
    integration = integration_result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    await db.delete(integration)
    await db.commit()
    
    return {"message": "Integration deleted successfully"}
