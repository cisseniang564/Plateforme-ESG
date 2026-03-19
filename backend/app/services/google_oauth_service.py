"""
Google OAuth service for Google Sheets integration.
"""
from typing import Dict, Any, Optional
import secrets
from datetime import datetime, timedelta

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration, IntegrationType


class GoogleOAuthService:
    """Service for Google OAuth flow."""
    
    # OAuth 2.0 scopes
    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
    ]
    
    # OAuth client config (vous devrez créer un projet Google Cloud)
    CLIENT_CONFIG = {
        "web": {
            "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
            "project_id": "esgflow",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "YOUR_CLIENT_SECRET",
            "redirect_uris": ["http://localhost:8000/api/v1/integrations/google/callback"]
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Args:
            state: Random state token for CSRF protection
            
        Returns:
            Authorization URL to redirect user to
        """
        flow = Flow.from_client_config(
            self.CLIENT_CONFIG,
            scopes=self.SCOPES,
            redirect_uri=self.CLIENT_CONFIG["web"]["redirect_uris"][0]
        )
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Force consent screen to get refresh token
        )
        
        return authorization_url
    
    async def handle_callback(
        self,
        code: str,
        state: str,
        tenant_id: str,
        integration_name: str,
    ) -> Dict[str, Any]:
        """
        Handle OAuth callback and create integration.
        
        Args:
            code: Authorization code from Google
            state: State token for verification
            tenant_id: Tenant ID
            integration_name: Name for the integration
            
        Returns:
            Created integration details
        """
        # Exchange code for tokens
        flow = Flow.from_client_config(
            self.CLIENT_CONFIG,
            scopes=self.SCOPES,
            redirect_uri=self.CLIENT_CONFIG["web"]["redirect_uris"][0]
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info
        service = build('drive', 'v3', credentials=credentials)
        about = service.about().get(fields="user").execute()
        user_email = about['user']['emailAddress']
        
        # Store credentials
        creds_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes,
            'user_email': user_email,
        }
        
        # Create integration
        integration = Integration(
            tenant_id=tenant_id,
            name=integration_name,
            type=IntegrationType.GOOGLE_SHEETS,
            config={'credentials': creds_data},
            is_active=True,
        )
        
        self.db.add(integration)
        await self.db.commit()
        await self.db.refresh(integration)
        
        return {
            'id': str(integration.id),
            'name': integration.name,
            'user_email': user_email,
            'scopes': credentials.scopes,
        }
    
    async def refresh_credentials(self, integration_id: str) -> Credentials:
        """
        Refresh Google credentials if expired.
        
        Args:
            integration_id: Integration ID
            
        Returns:
            Refreshed credentials
        """
        query = select(Integration).where(Integration.id == integration_id)
        result = await self.db.execute(query)
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise ValueError("Integration not found")
        
        creds_data = integration.config.get('credentials')
        if not creds_data:
            raise ValueError("No credentials found")
        
        # Create credentials object
        credentials = Credentials(
            token=creds_data['token'],
            refresh_token=creds_data['refresh_token'],
            token_uri=creds_data['token_uri'],
            client_id=creds_data['client_id'],
            client_secret=creds_data['client_secret'],
            scopes=creds_data['scopes'],
        )
        
        # Refresh if expired
        if credentials.expired:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())
            
            # Update stored credentials
            creds_data['token'] = credentials.token
            integration.config = {'credentials': creds_data}
            await self.db.commit()
        
        return credentials
