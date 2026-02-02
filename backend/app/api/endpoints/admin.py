"""
Admin endpoints for superusers to monitor the platform.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.site import Site
from app.models.building import Building
from app.models.lot import Lot, LotStatus
from app.models.finance import Sale, Expense
from app.models.production import EggProduction, Mortality

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class PlatformStats(BaseModel):
    """Global platform statistics."""
    total_users: int
    active_users: int
    verified_users: int
    total_organizations: int
    total_sites: int
    total_buildings: int
    total_lots: int
    active_lots: int
    total_sales_amount: float
    total_expenses_amount: float
    users_last_24h: int
    users_last_7d: int
    users_last_30d: int


class UserAdminView(BaseModel):
    """User data for admin view."""
    id: str
    email: str
    phone: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    is_superuser: bool
    organization_id: Optional[str]
    organization_name: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class OrganizationAdminView(BaseModel):
    """Organization data for admin view."""
    id: str
    name: str
    type: Optional[str]
    city: Optional[str]
    country: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime
    user_count: int
    site_count: int
    lot_count: int

    class Config:
        from_attributes = True


class ActivityLog(BaseModel):
    """Activity log entry."""
    timestamp: datetime
    user_email: str
    user_name: str
    organization_name: Optional[str]
    action: str
    details: str


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def require_superuser(current_user: User):
    """Check if user is superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé. Réservé aux administrateurs."
        )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get global platform statistics. Superuser only."""
    require_superuser(current_user)

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)

    # User stats
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar()

    # Users by period
    users_last_24h = db.query(func.count(User.id)).filter(User.created_at >= last_24h).scalar()
    users_last_7d = db.query(func.count(User.id)).filter(User.created_at >= last_7d).scalar()
    users_last_30d = db.query(func.count(User.id)).filter(User.created_at >= last_30d).scalar()

    # Organization stats
    total_organizations = db.query(func.count(Organization.id)).scalar()

    # Infrastructure stats
    total_sites = db.query(func.count(Site.id)).scalar()
    total_buildings = db.query(func.count(Building.id)).scalar()
    total_lots = db.query(func.count(Lot.id)).filter(Lot.status != LotStatus.DELETED).scalar()
    active_lots = db.query(func.count(Lot.id)).filter(Lot.status == LotStatus.ACTIVE).scalar()

    # Financial stats
    total_sales = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    total_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).scalar()

    return PlatformStats(
        total_users=total_users or 0,
        active_users=active_users or 0,
        verified_users=verified_users or 0,
        total_organizations=total_organizations or 0,
        total_sites=total_sites or 0,
        total_buildings=total_buildings or 0,
        total_lots=total_lots or 0,
        active_lots=active_lots or 0,
        total_sales_amount=float(total_sales or 0),
        total_expenses_amount=float(total_expenses or 0),
        users_last_24h=users_last_24h or 0,
        users_last_7d=users_last_7d or 0,
        users_last_30d=users_last_30d or 0,
    )


@router.get("/users", response_model=List[UserAdminView])
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
):
    """Get all users across all organizations. Superuser only."""
    require_superuser(current_user)

    query = db.query(User).outerjoin(Organization, User.organization_id == Organization.id)

    # Filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.phone.ilike(search_filter))
        )

    if role:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if is_verified is not None:
        query = query.filter(User.is_verified == is_verified)

    # Order by most recent first
    query = query.order_by(desc(User.created_at))

    # Pagination
    users = query.offset(skip).limit(limit).all()

    # Build response with organization names
    result = []
    for user in users:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first() if user.organization_id else None

        result.append(UserAdminView(
            id=str(user.id),
            email=user.email,
            phone=user.phone,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value if user.role else "viewer",
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            organization_id=str(user.organization_id) if user.organization_id else None,
            organization_name=org.name if org else None,
            created_at=user.created_at,
            last_login=None,  # TODO: Add last_login tracking
        ))

    return result


@router.get("/organizations", response_model=List[OrganizationAdminView])
async def get_all_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
):
    """Get all organizations. Superuser only."""
    require_superuser(current_user)

    query = db.query(Organization)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Organization.name.ilike(search_filter)) |
            (Organization.city.ilike(search_filter)) |
            (Organization.email.ilike(search_filter))
        )

    query = query.order_by(desc(Organization.created_at))
    organizations = query.offset(skip).limit(limit).all()

    result = []
    for org in organizations:
        # Count related entities
        user_count = db.query(func.count(User.id)).filter(User.organization_id == org.id).scalar()
        site_count = db.query(func.count(Site.id)).filter(Site.organization_id == org.id).scalar()

        # Count lots through sites and buildings
        site_ids = [s.id for s in db.query(Site.id).filter(Site.organization_id == org.id).all()]
        building_ids = [b.id for b in db.query(Building.id).filter(Building.site_id.in_(site_ids)).all()] if site_ids else []
        lot_count = db.query(func.count(Lot.id)).filter(
            Lot.building_id.in_(building_ids),
            Lot.status != LotStatus.DELETED
        ).scalar() if building_ids else 0

        result.append(OrganizationAdminView(
            id=str(org.id),
            name=org.name,
            type=org.type.value if org.type else None,
            city=org.city,
            country=org.country,
            phone=org.phone,
            email=org.email,
            created_at=org.created_at,
            user_count=user_count or 0,
            site_count=site_count or 0,
            lot_count=lot_count or 0,
        ))

    return result


@router.get("/activity", response_model=List[ActivityLog])
async def get_recent_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
):
    """Get recent platform activity. Superuser only."""
    require_superuser(current_user)

    activities = []

    # Recent user registrations
    recent_users = db.query(User).order_by(desc(User.created_at)).limit(20).all()
    for user in recent_users:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first() if user.organization_id else None
        activities.append(ActivityLog(
            timestamp=user.created_at,
            user_email=user.email,
            user_name=f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
            organization_name=org.name if org else None,
            action="Inscription",
            details=f"Nouvel utilisateur inscrit ({user.role.value if user.role else 'viewer'})"
        ))

    # Recent sales
    recent_sales = db.query(Sale).order_by(desc(Sale.created_at)).limit(20).all()
    for sale in recent_sales:
        user = db.query(User).filter(User.id == sale.recorded_by).first() if sale.recorded_by else None
        org = db.query(Organization).filter(Organization.id == user.organization_id).first() if user and user.organization_id else None
        if user:
            activities.append(ActivityLog(
                timestamp=sale.created_at,
                user_email=user.email if user else "inconnu",
                user_name=f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Inconnu",
                organization_name=org.name if org else None,
                action="Vente",
                details=f"Vente de {sale.quantity} {sale.sale_type.value if sale.sale_type else 'produits'} - {int(sale.total_amount or 0):,} FCFA".replace(",", " ")
            ))

    # Recent lots created
    recent_lots = db.query(Lot).filter(Lot.status != LotStatus.DELETED).order_by(desc(Lot.created_at)).limit(20).all()
    for lot in recent_lots:
        user = db.query(User).filter(User.id == lot.created_by).first() if lot.created_by else None
        org = db.query(Organization).filter(Organization.id == user.organization_id).first() if user and user.organization_id else None
        if user:
            activities.append(ActivityLog(
                timestamp=lot.created_at,
                user_email=user.email if user else "inconnu",
                user_name=f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Inconnu",
                organization_name=org.name if org else None,
                action="Nouvelle bande",
                details=f"Bande {lot.code} créée - {lot.initial_quantity} sujets ({lot.type.value if lot.type else 'inconnu'})"
            ))

    # Sort by timestamp and limit
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:limit]


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle user active status. Superuser only."""
    require_superuser(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Cannot deactivate yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous désactiver vous-même")

    user.is_active = not user.is_active
    db.commit()

    return {"message": f"Utilisateur {'activé' if user.is_active else 'désactivé'}", "is_active": user.is_active}


@router.patch("/users/{user_id}/toggle-superuser")
async def toggle_user_superuser(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle user superuser status. Superuser only."""
    require_superuser(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Cannot remove your own superuser status
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut admin")

    user.is_superuser = not user.is_superuser
    db.commit()

    return {"message": f"Statut admin {'accordé' if user.is_superuser else 'retiré'}", "is_superuser": user.is_superuser}


@router.delete("/users/{user_id}")
async def delete_user_admin(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user. Superuser only."""
    require_superuser(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Cannot delete yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer vous-même")

    # Cannot delete other superusers
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un autre administrateur")

    db.delete(user)
    db.commit()

    return {"message": "Utilisateur supprimé"}
