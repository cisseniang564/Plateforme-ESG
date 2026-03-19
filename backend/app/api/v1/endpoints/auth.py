"""
Authentication endpoints
"""
from datetime import timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings
from app.dependencies import get_db
from app.models.user import User
from app.models.organization import Organization

router = APIRouter()


# Schémas Pydantic
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    tokens: Token
    user: dict


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_name: str


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    email: str


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint"""
    
    # Chercher l'utilisateur
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Créer les tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id)}
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return {
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        },
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": "admin",  # À adapter selon votre modèle
            "tenant_id": str(user.tenant_id)
        }
    }


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and create their organization (tenant)
    """
    
    # Vérifier si l'email existe déjà
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Créer une nouvelle organisation (tenant)
    new_org = Organization(
        id=uuid4(),
        name=data.company_name,
        industry="General",
        country="FR",
        size="medium",
        is_active=True
    )
    db.add(new_org)
    await db.flush()  # Pour obtenir l'ID
    
    # Créer l'utilisateur
    new_user = User(
        id=uuid4(),
        tenant_id=new_org.id,
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        is_active=True,
        email_verified_at=None  # À vérifier par email plus tard
    )
    db.add(new_user)
    
    await db.commit()
    
    return RegisterResponse(
        message="Account created successfully. Please check your email to verify your account.",
        user_id=str(new_user.id),
        email=new_user.email
    )


@router.post("/forgot-password")
async def forgot_password(
    email: EmailStr,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset
    """
    
    # Chercher l'utilisateur
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    # Toujours retourner succès (sécurité - ne pas révéler si email existe)
    # En production, envoyer un vrai email ici
    
    return {
        "message": "If this email is registered, you will receive password reset instructions."
    }