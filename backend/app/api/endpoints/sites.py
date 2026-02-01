from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.site import Site, SiteMember
from app.models.building import Building
from app.models.lot import Lot, LotStatus
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse, SiteWithStats, SiteMemberAdd, SiteMemberResponse

router = APIRouter()


@router.get("", response_model=List[SiteResponse])
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
        Lot.status == LotStatus.ACTIVE
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


@router.post("", response_model=SiteResponse)
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

    # Get buildings for this site (only active ones)
    buildings = db.query(Building).filter(
        Building.site_id == site_id,
        Building.is_active == True
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
            Lot.status == LotStatus.ACTIVE
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
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un site (soft delete).

    Si le site contient des batiments avec des lots actifs, la suppression est bloquee.
    Vous devez d'abord terminer ou deplacer les lots, puis supprimer les batiments.

    Args:
        force: Si True, supprime meme avec des batiments/lots termines.
               Les lots ACTIFS bloquent toujours la suppression.
    """
    from app.models.lot import Lot, LotStatus

    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check for active buildings
    active_buildings = db.query(Building).filter(
        Building.site_id == site_id,
        Building.is_active == True
    ).all()

    # Check for active lots in these buildings
    building_ids = [b.id for b in active_buildings]
    active_lots = []
    other_lots = []

    if building_ids:
        lots = db.query(Lot).filter(
            Lot.building_id.in_(building_ids),
            Lot.status != LotStatus.DELETED
        ).all()
        active_lots = [l for l in lots if l.status == LotStatus.ACTIVE]
        other_lots = [l for l in lots if l.status != LotStatus.ACTIVE]

    # Block if there are active lots
    if active_lots:
        # Group lots by building for clearer display
        lots_by_building = {}
        for lot in active_lots:
            building = next((b for b in active_buildings if b.id == lot.building_id), None)
            building_name = building.name if building else "Inconnu"
            if building_name not in lots_by_building:
                lots_by_building[building_name] = []
            lots_by_building[building_name].append({
                "id": str(lot.id),
                "code": lot.code,
                "current_quantity": lot.current_quantity
            })

        raise HTTPException(
            status_code=400,
            detail={
                "error": "site_has_active_lots",
                "message": f"Ce site contient {len(active_lots)} lot(s) actif(s) dans {len(active_buildings)} batiment(s). Vous devez d'abord les terminer ou les deplacer.",
                "active_lots_by_building": lots_by_building,
                "total_active_lots": len(active_lots),
                "total_active_buildings": len(active_buildings),
                "actions_requises": [
                    "1. Terminer tous les lots actifs (PATCH /api/v1/lots/{id} avec status='completed')",
                    "2. Ou deplacer les lots vers un autre site/batiment",
                    "3. Puis supprimer les batiments si necessaire",
                    "4. Enfin supprimer le site"
                ]
            }
        )

    # Warn if there are buildings or non-active lots
    if (active_buildings or other_lots) and not force:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "site_has_data",
                "message": f"Ce site contient {len(active_buildings)} batiment(s) et {len(other_lots)} lot(s) non-actif(s). Tout sera masque si vous supprimez le site.",
                "buildings": [
                    {"id": str(b.id), "name": b.name}
                    for b in active_buildings
                ],
                "lots_count": len(other_lots),
                "recommendation": "Verifiez que ces donnees n'ont plus besoin d'etre consultees.",
                "alternatives": [
                    {
                        "action": "Supprimer les batiments un par un",
                        "description": "Permet de garder le site et reorganiser",
                        "endpoint": "DELETE /api/v1/buildings/{id}"
                    },
                    {
                        "action": "Modifier le site",
                        "description": "Renommer ou mettre a jour les informations",
                        "endpoint": f"PATCH /api/v1/sites/{site_id}"
                    },
                    {
                        "action": "Confirmer la suppression",
                        "description": "Supprimer le site et masquer tous les batiments/lots",
                        "endpoint": f"DELETE /api/v1/sites/{site_id}?force=true"
                    }
                ],
                "force_delete": "Ajoutez ?force=true pour confirmer la suppression"
            }
        )

    # Soft delete site and all its buildings
    site.is_active = False

    # Also soft delete all active buildings in this site
    for building in active_buildings:
        building.is_active = False

    db.commit()

    message = "Site supprime avec succes"
    if active_buildings:
        message += f" ({len(active_buildings)} batiment(s) et {len(other_lots)} lot(s) associes seront masques)"

    return {"message": message, "deleted_site": site.name}


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
