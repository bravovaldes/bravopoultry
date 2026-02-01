from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.site import Site, SiteMember
from app.models.building import Building
from app.models.lot import Lot
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse, SiteWithStats, SiteMemberAdd, SiteMemberResponse

router = APIRouter()


@router.get("/", response_model=List[SiteResponse])
async def get_sites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sites for current user's organization - optimized with SQL aggregation."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User has no organization")

    sites = db.query(Site).filter(
        Site.organization_id == current_user.organization_id,
        Site.is_active == True
    ).all()

    if not sites:
        return []

    site_ids = [s.id for s in sites]

    # Batch fetch building stats per site using SQL aggregation
    building_stats = db.query(
        Building.site_id,
        func.count(Building.id).label('buildings_count'),
        func.coalesce(func.sum(Building.capacity), 0).label('total_capacity')
    ).filter(
        Building.site_id.in_(site_ids),
        Building.is_active == True
    ).group_by(Building.site_id).all()

    building_stats_map = {
        row.site_id: {'buildings_count': row.buildings_count, 'total_capacity': int(row.total_capacity)}
        for row in building_stats
    }

    # Batch fetch lot stats per site using SQL aggregation
    lot_stats = db.query(
        Building.site_id,
        func.count(Lot.id).label('active_lots'),
        func.coalesce(func.sum(Lot.current_quantity), 0).label('total_birds')
    ).join(Lot, Lot.building_id == Building.id).filter(
        Building.site_id.in_(site_ids),
        Building.is_active == True,
        Lot.status == "active"
    ).group_by(Building.site_id).all()

    lot_stats_map = {
        row.site_id: {'active_lots': row.active_lots, 'total_birds': int(row.total_birds)}
        for row in lot_stats
    }

    # Build response using pre-fetched stats
    result = []
    for site in sites:
        site_data = SiteResponse.model_validate(site)
        b_stats = building_stats_map.get(site.id, {'buildings_count': 0, 'total_capacity': 0})
        l_stats = lot_stats_map.get(site.id, {'active_lots': 0, 'total_birds': 0})

        site_data.buildings_count = b_stats['buildings_count']
        site_data.active_lots_count = l_stats['active_lots']
        site_data.total_birds = l_stats['total_birds']

        # Use site's total_capacity if defined, otherwise sum of buildings
        if not site.total_capacity and b_stats['total_capacity'] > 0:
            site_data.total_capacity = b_stats['total_capacity']

        result.append(site_data)

    return result


@router.post("/", response_model=SiteResponse)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new site."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User has no organization")

    # Verify organization access
    if str(site_data.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    site = Site(**site_data.model_dump())
    db.add(site)
    db.flush()

    # Add creator as admin
    member = SiteMember(
        site_id=site.id,
        user_id=current_user.id,
        role="admin",
        can_edit=True,
        can_delete=True,
        can_manage_users=True
    )
    db.add(member)
    db.commit()
    db.refresh(site)

    return SiteResponse.model_validate(site)


@router.get("/{site_id}", response_model=SiteWithStats)
async def get_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific site with stats - optimized with SQL aggregation."""
    site = db.query(Site).filter(Site.id == site_id, Site.is_active == True).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get buildings for this site
    buildings = db.query(Building).filter(
        Building.site_id == site_id
    ).all()

    building_ids = [b.id for b in buildings]

    # Batch fetch lot stats per building using SQL aggregation
    lot_stats_per_building = {}
    if building_ids:
        lot_stats = db.query(
            Lot.building_id,
            func.count(Lot.id).label('active_lots'),
            func.coalesce(func.sum(Lot.current_quantity), 0).label('total_birds')
        ).filter(
            Lot.building_id.in_(building_ids),
            Lot.status == "active"
        ).group_by(Lot.building_id).all()

        lot_stats_per_building = {
            row.building_id: {'active_lots': row.active_lots, 'total_birds': int(row.total_birds)}
            for row in lot_stats
        }

    # Build buildings list using pre-fetched stats
    buildings_list = []
    total_birds = 0
    active_lots = 0

    for building in buildings:
        stats = lot_stats_per_building.get(building.id, {'active_lots': 0, 'total_birds': 0})

        buildings_list.append({
            "id": building.id,
            "name": building.name,
            "code": building.code,
            "type": building.building_type,
            "capacity": building.capacity or 0,
            "current_occupancy": stats['total_birds'],
            "status": "active" if building.is_active else "inactive",
            "sections_count": len(building.sections) if hasattr(building, 'sections') else 0,
            "active_lots": stats['active_lots']
        })

        if building.is_active:
            total_birds += stats['total_birds']
            active_lots += stats['active_lots']

    # Build response
    site_data = SiteWithStats(
        id=site.id,
        organization_id=site.organization_id,
        name=site.name,
        code=site.code,
        address=site.address,
        city=site.city,
        region=site.region,
        country=site.country,
        gps_latitude=site.gps_latitude,
        gps_longitude=site.gps_longitude,
        total_capacity=site.total_capacity,
        notes=site.notes,
        is_active=site.is_active,
        created_at=site.created_at,
        buildings_count=len(buildings),
        active_lots_count=active_lots,
        total_birds=total_birds,
        buildings=buildings_list
    )

    return site_data


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: UUID,
    site_data: SiteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a site."""
    site = db.query(Site).filter(Site.id == site_id, Site.is_active == True).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = site_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(site, field, value)

    db.commit()
    db.refresh(site)

    return SiteResponse.model_validate(site)


@router.delete("/{site_id}")
async def delete_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a site."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    site.is_active = False
    db.commit()

    return {"message": "Site deleted successfully"}


# Site Members
@router.get("/{site_id}/members", response_model=List[SiteMemberResponse])
async def get_site_members(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get site members."""
    site = db.query(Site).filter(Site.id == site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=404, detail="Site not found")

    members = db.query(SiteMember).filter(SiteMember.site_id == site_id).all()

    result = []
    for m in members:
        data = SiteMemberResponse.model_validate(m)
        data.user_name = m.user.full_name if m.user else None
        data.user_email = m.user.email if m.user else None
        result.append(data)

    return result


@router.post("/{site_id}/members", response_model=SiteMemberResponse)
async def add_site_member(
    site_id: UUID,
    member_data: SiteMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a site."""
    site = db.query(Site).filter(Site.id == site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=404, detail="Site not found")

    # Check if already member
    existing = db.query(SiteMember).filter(
        SiteMember.site_id == site_id,
        SiteMember.user_id == member_data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = SiteMember(
        site_id=site_id,
        **member_data.model_dump()
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return SiteMemberResponse.model_validate(member)
