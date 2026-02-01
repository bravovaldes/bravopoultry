from fastapi import APIRouter
from app.api.endpoints import auth, users, organizations, sites, buildings, lots, production, feed, health, sales, expenses, analytics, dashboard, invitations

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(sites.router, prefix="/sites", tags=["Sites"])
api_router.include_router(buildings.router, prefix="/buildings", tags=["Buildings"])
api_router.include_router(lots.router, prefix="/lots", tags=["Lots"])
api_router.include_router(production.router, prefix="/production", tags=["Production"])
api_router.include_router(feed.router, prefix="/feed", tags=["Feed & Water"])
api_router.include_router(health.router, prefix="/health", tags=["Health & Veterinary"])
api_router.include_router(sales.router, prefix="/sales", tags=["Sales"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
