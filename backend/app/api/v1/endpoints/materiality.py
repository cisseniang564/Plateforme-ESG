from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.materiality import MaterialityIssue, ESGRisk
from app.models.user import User

router = APIRouter()

# ============= SCHEMAS =============

class MaterialityIssueCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    financial_impact: float = Field(50.0, ge=0, le=100)
    esg_impact: float = Field(50.0, ge=0, le=100)
    stakeholders: Optional[str] = None
    data_sources: Optional[str] = None

class MaterialityIssueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    financial_impact: Optional[float] = Field(None, ge=0, le=100)
    esg_impact: Optional[float] = Field(None, ge=0, le=100)
    stakeholders: Optional[str] = None
    data_sources: Optional[str] = None

class MaterialityIssueResponse(BaseModel):
    id: str | UUID
    name: str
    description: Optional[str]
    category: str
    financial_impact: float
    esg_impact: float
    is_material: bool
    priority: Optional[str]
    stakeholders: Optional[str]
    data_sources: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ESGRiskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    probability: int = Field(3, ge=1, le=5)
    impact: int = Field(3, ge=1, le=5)
    mitigation_plan: Optional[str] = None
    responsible_person: Optional[str] = None
    target_date: Optional[datetime] = None
    materiality_issue_id: Optional[str] = None

class ESGRiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[int] = Field(None, ge=1, le=5)
    impact: Optional[int] = Field(None, ge=1, le=5)
    mitigation_plan: Optional[str] = None
    mitigation_status: Optional[str] = None
    responsible_person: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None

class ESGRiskResponse(BaseModel):
    id: str | UUID
    title: str
    description: Optional[str]
    category: str
    probability: int
    impact: int
    risk_score: int
    severity: str
    status: str
    mitigation_plan: Optional[str]
    mitigation_status: Optional[str]
    responsible_person: Optional[str]
    target_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============= MATERIALITY ENDPOINTS =============

@router.post("/issues", response_model=MaterialityIssueResponse)
async def create_materiality_issue(
    issue: MaterialityIssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new materiality issue"""
    
    # Calculate if material (threshold: both > 60)
    is_material = issue.financial_impact > 60 and issue.esg_impact > 60
    
    # Calculate priority
    avg_score = (issue.financial_impact + issue.esg_impact) / 2
    if avg_score >= 75:
        priority = "high"
    elif avg_score >= 50:
        priority = "medium"
    else:
        priority = "low"
    
    db_issue = MaterialityIssue(
        tenant_id=current_user.tenant_id,
        is_material=is_material,
        priority=priority,
        **issue.dict()
    )
    
    db.add(db_issue)
    await db.commit()
    await db.refresh(db_issue)
    
    return db_issue

@router.get("/issues", response_model=List[MaterialityIssueResponse])
async def get_materiality_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all materiality issues"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    issues = result.scalars().all()
    
    return issues

@router.get("/issues/{issue_id}", response_model=MaterialityIssueResponse)
async def get_materiality_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    return issue

@router.put("/issues/{issue_id}", response_model=MaterialityIssueResponse)
async def update_materiality_issue(
    issue_id: str,
    issue_update: MaterialityIssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    db_issue = result.scalar_one_or_none()
    
    if not db_issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    update_data = issue_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_issue, field, value)
    
    # Recalculate materiality
    if db_issue.financial_impact and db_issue.esg_impact:
        db_issue.is_material = db_issue.financial_impact > 60 and db_issue.esg_impact > 60
        avg_score = (db_issue.financial_impact + db_issue.esg_impact) / 2
        db_issue.priority = "high" if avg_score >= 75 else "medium" if avg_score >= 50 else "low"
    
    await db.commit()
    await db.refresh(db_issue)
    
    return db_issue

@router.delete("/issues/{issue_id}")
async def delete_materiality_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    db_issue = result.scalar_one_or_none()
    
    if not db_issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    await db.delete(db_issue)
    await db.commit()
    
    return {"message": "Materiality issue deleted"}

# ============= RISKS ENDPOINTS =============

@router.post("/risks", response_model=ESGRiskResponse)
async def create_risk(
    risk: ESGRiskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ESG risk"""
    
    # Calculate risk score
    risk_score = risk.probability * risk.impact
    
    # Determine severity
    if risk_score >= 20:
        severity = "critical"
    elif risk_score >= 12:
        severity = "high"
    elif risk_score >= 6:
        severity = "medium"
    else:
        severity = "low"
    
    db_risk = ESGRisk(
        tenant_id=current_user.tenant_id,
        risk_score=risk_score,
        severity=severity,
        mitigation_status="not_started",
        status="active",
        **risk.dict()
    )
    
    db.add(db_risk)
    await db.commit()
    await db.refresh(db_risk)
    
    return db_risk

@router.get("/risks", response_model=List[ESGRiskResponse])
async def get_risks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all ESG risks"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    risks = result.scalars().all()
    
    return risks

@router.get("/risks/{risk_id}", response_model=ESGRiskResponse)
async def get_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    risk = result.scalar_one_or_none()
    
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    return risk

@router.put("/risks/{risk_id}", response_model=ESGRiskResponse)
async def update_risk(
    risk_id: str,
    risk_update: ESGRiskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    db_risk = result.scalar_one_or_none()
    
    if not db_risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    update_data = risk_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_risk, field, value)
    
    # Recalculate risk score
    if db_risk.probability and db_risk.impact:
        db_risk.risk_score = db_risk.probability * db_risk.impact
        if db_risk.risk_score >= 20:
            db_risk.severity = "critical"
        elif db_risk.risk_score >= 12:
            db_risk.severity = "high"
        elif db_risk.risk_score >= 6:
            db_risk.severity = "medium"
        else:
            db_risk.severity = "low"
    
    await db.commit()
    await db.refresh(db_risk)
    
    return db_risk

@router.delete("/risks/{risk_id}")
async def delete_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    db_risk = result.scalar_one_or_none()
    
    if not db_risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    await db.delete(db_risk)
    await db.commit()
    
    return {"message": "Risk deleted"}