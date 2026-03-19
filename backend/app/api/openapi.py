"""
OpenAPI schema configuration for professional API documentation.
"""
from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI


def custom_openapi(app: FastAPI):
    """Generate custom OpenAPI schema with detailed documentation."""
    
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="ESGFlow API",
        version="1.0.0",
        description="""
# ESGFlow API Documentation

Professional ESG (Environmental, Social, Governance) Data Management Platform API.

## Features

* **Authentication**: OAuth2 with JWT tokens
* **Multi-tenant**: Secure data isolation per organization
* **Real-time**: Webhook notifications for events
* **Scalable**: Built for enterprise workloads
* **Compliant**: GDPR, SOC2 ready

## Authentication

All endpoints require authentication via Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.esgflow.com/v1/indicators
```

To obtain a token, use the `/auth/login` endpoint.

## Rate Limits

* **Free tier**: 1,000 requests/hour
* **Pro tier**: 10,000 requests/hour
* **Enterprise**: Custom limits

## Webhooks

Configure webhooks to receive real-time notifications when:
* New data is uploaded
* Scores are calculated
* Thresholds are exceeded

## Support

* Documentation: https://docs.esgflow.com
* Support: support@esgflow.com
* Status: https://status.esgflow.com
        """,
        routes=app.routes,
        contact={
            "name": "ESGFlow Support",
            "url": "https://esgflow.com/support",
            "email": "support@esgflow.com",
        },
        license_info={
            "name": "Proprietary",
            "url": "https://esgflow.com/terms",
        },
        servers=[
            {
                "url": "https://api.esgflow.com",
                "description": "Production server"
            },
            {
                "url": "https://staging-api.esgflow.com",
                "description": "Staging server"
            },
            {
                "url": "http://localhost:8000",
                "description": "Development server"
            }
        ],
        tags=[
            {
                "name": "Authentication",
                "description": "User authentication and authorization endpoints"
            },
            {
                "name": "Indicators",
                "description": "ESG indicators management"
            },
            {
                "name": "Scores",
                "description": "ESG score calculation and retrieval"
            },
            {
                "name": "Data",
                "description": "Data upload and management"
            },
            {
                "name": "Users",
                "description": "User management (Admin only)"
            },
            {
                "name": "Webhooks",
                "description": "Webhook configuration and management"
            },
            {
                "name": "Integrations",
                "description": "Third-party integrations (Google Sheets, BI tools)"
            }
        ]
    )

    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token"
        },
        "APIKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API Key for server-to-server authentication"
        }
    }

    # Add global security
    openapi_schema["security"] = [
        {"BearerAuth": []},
        {"APIKeyAuth": []}
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema
