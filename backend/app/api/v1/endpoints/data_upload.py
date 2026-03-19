"""
Data Upload API endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.data_upload import DataUpload
from app.services.data_import_service import DataImportService

router = APIRouter()


def serialize_upload(upload: DataUpload) -> dict:
    """Serialize DataUpload to dict to avoid recursion."""
    return {
        "id": str(upload.id),
        "filename": upload.filename,
        "file_size": upload.file_size,
        "status": upload.status,
        "total_rows": upload.total_rows,
        "valid_rows": upload.valid_rows,
        "invalid_rows": upload.invalid_rows,
        "data_preview": upload.data_preview,
        "validation_errors": upload.validation_errors,
        "file_metadata": upload.file_metadata,
        "error_message": upload.error_message,
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Upload and parse CSV/Excel file."""
    
    allowed_types = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if file.content_type not in allowed_types and not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV and Excel files are allowed."
        )
    
    max_size = 10 * 1024 * 1024
    content = await file.read()
    
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {max_size / (1024*1024):.0f}MB"
        )
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = DataImportService(db)
    upload = await service.parse_file(
        file_content=content,
        filename=file.filename,
        tenant_id=user.tenant_id,
        user_id=user_id,
    )
    
    return serialize_upload(upload)


@router.get("/uploads")
async def get_uploads(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get list of uploads."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(DataUpload).where(DataUpload.tenant_id == user.tenant_id)
    
    if status:
        query = query.where(DataUpload.status == status)
    
    query = query.order_by(DataUpload.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    uploads = result.scalars().all()
    
    from sqlalchemy import func
    count_query = select(func.count()).select_from(DataUpload).where(
        DataUpload.tenant_id == user.tenant_id
    )
    if status:
        count_query = count_query.where(DataUpload.status == status)
    
    total = await db.scalar(count_query)
    
    items = [{
        "id": str(u.id),
        "filename": u.filename,
        "file_size": u.file_size,
        "status": u.status,
        "total_rows": u.total_rows,
        "valid_rows": u.valid_rows,
        "invalid_rows": u.invalid_rows,
        "success_rate": u.success_rate,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in uploads]
    
    return {
        "items": items,
        "total": total or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/uploads/{upload_id}")
async def get_upload_detail(
    upload_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get upload details."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(DataUpload).where(
        DataUpload.id == upload_id,
        DataUpload.tenant_id == user.tenant_id
    )
    
    result = await db.execute(query)
    upload = result.scalar_one_or_none()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return {
        "id": str(upload.id),
        "filename": upload.filename,
        "file_size": upload.file_size,
        "file_type": upload.file_type,
        "status": upload.status,
        "total_rows": upload.total_rows,
        "valid_rows": upload.valid_rows,
        "invalid_rows": upload.invalid_rows,
        "success_rate": upload.success_rate,
        "data_preview": upload.data_preview,
        "validation_errors": upload.validation_errors,
        "file_metadata": upload.file_metadata,
        "error_message": upload.error_message,
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
        "processing_started_at": upload.processing_started_at.isoformat() if upload.processing_started_at else None,
        "processing_completed_at": upload.processing_completed_at.isoformat() if upload.processing_completed_at else None,
    }


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an upload record."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(DataUpload).where(
        DataUpload.id == upload_id,
        DataUpload.tenant_id == user.tenant_id
    )
    
    result = await db.execute(query)
    upload = result.scalar_one_or_none()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    await db.delete(upload)
    await db.commit()
    
    return {"message": "Upload deleted successfully"}
