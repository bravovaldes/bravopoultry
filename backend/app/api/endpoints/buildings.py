from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.building import Building, Section
from app.models.lot import Lot, LotStatus
from app.schemas.building import (
    BuildingCreate, BuildingUpdate, BuildingResponse,
    SectionCreate, SectionUpdate, SectionResponse,
    SiteBasic, LotBasic
)

router = APIRouter()


def build_building_response(
    building: Building,
    include_lots: bool = True,
    lot_stats: Optional[Dict] = None
) -> BuildingResponse:
    """Construit la réponse pour un bâtiment avec tous les champs.

    Args:
        building: The building object
        include_lots: Whether to include lot details
        lot_stats: Pre-fetched lot stats dict with 'active_lots' and 'current_birds' keys
                   If None, will calculate from building.lots (triggers lazy load)
    """
    # Use pre-fetched stats if available, otherwise calculate from lots
    if lot_stats is not None:
        active_lots_count = lot_stats.get('active_lots', 0)
        current_birds = lot_stats.get('current_birds', 0)
    else:
        # Fallback to Python-level calculation (for single building queries)
        active_lots = [lot for lot in building.lots if lot.status == LotStatus.ACTIVE]
        active_lots_count = len(active_lots)
        current_birds = sum(lot.current_quantity or 0 for lot in active_lots)

    data = BuildingResponse(
        id=building.id,
        site_id=building.site_id,
        name=building.name,
        code=building.code,
        building_type=building.building_type.value if building.building_type else "mixed",
        capacity=building.capacity,
        surface_m2=building.surface_m2,
        ventilation_type=building.ventilation_type.value if building.ventilation_type else "natural",
        has_electricity=building.has_electricity,
        has_water=building.has_water,
        has_generator=building.has_generator,
        feeder_type=building.feeder_type,
        feeder_count=building.feeder_count,
        drinker_type=building.drinker_type,
        drinker_count=building.drinker_count,
        notes=building.notes,
        is_active=building.is_active,
        created_at=building.created_at,
        sections_count=len(building.sections) if building.sections else 0,
        active_lots_count=active_lots_count,
        current_birds=current_birds,
    )

    # Ajouter le site
    if building.site:
        data.site = SiteBasic(id=building.site.id, name=building.site.name)

    # Ajouter les lots si demandé (exclure les lots supprimés)
    if include_lots:
        data.lots = [
            LotBasic(
                id=lot.id,
                code=lot.code,
                name=lot.name,
                type=lot.type.value if lot.type else "broiler",
                breed=lot.breed,
                status=lot.status.value if lot.status else "active",
                initial_quantity=lot.initial_quantity,
                current_quantity=lot.current_quantity,
                placement_date=lot.placement_date,
                age_days=lot.age_days,
                age_weeks=lot.age_weeks,
            )
            for lot in building.lots
            if lot.status != LotStatus.DELETED
        ]

    return data


@router.get("", response_model=List[BuildingResponse])
async def get_buildings(
    site_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les bâtiments, avec filtre optionnel par site - optimized with batch fetch."""
    query = db.query(Building).join(Site).filter(
        Site.organization_id == current_user.organization_id,
        Site.is_active == True,
        Building.is_active == True
    )

    if site_id:
        query = query.filter(Building.site_id == site_id)

    buildings = query.all()

    if not buildings:
        return []

    # Batch fetch lot stats per building using SQL aggregation
    building_ids = [b.id for b in buildings]
    lot_stats = db.query(
        Lot.building_id,
        func.count(Lot.id).label('active_lots'),
        func.coalesce(func.sum(Lot.current_quantity), 0).label('current_birds')
    ).filter(
        Lot.building_id.in_(building_ids),
        Lot.status == LotStatus.ACTIVE
    ).group_by(Lot.building_id).all()

    lot_stats_map = {
        row.building_id: {'active_lots': row.active_lots, 'current_birds': int(row.current_birds)}
        for row in lot_stats
    }

    return [
        build_building_response(b, include_lots=False, lot_stats=lot_stats_map.get(b.id))
        for b in buildings
    ]


@router.post("", response_model=BuildingResponse)
async def create_building(
    building_data: BuildingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau bâtiment."""
    # Vérifier l'accès au site
    site = db.query(Site).filter(Site.id == building_data.site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    building = Building(**building_data.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)

    return build_building_response(building)


@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building(
    building_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère un bâtiment avec ses lots."""
    building = db.query(Building).filter(Building.id == building_id, Building.is_active == True).first()
    if not building:
        raise HTTPException(status_code=404, detail="Bâtiment non trouvé")

    site = db.query(Site).filter(Site.id == building.site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    return build_building_response(building, include_lots=True)


@router.patch("/{building_id}", response_model=BuildingResponse)
async def update_building(
    building_id: UUID,
    building_data: BuildingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Met à jour un bâtiment."""
    building = db.query(Building).filter(Building.id == building_id, Building.is_active == True).first()
    if not building:
        raise HTTPException(status_code=404, detail="Bâtiment non trouvé")

    site = db.query(Site).filter(Site.id == building.site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = building_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(building, field, value)

    db.commit()
    db.refresh(building)

    return build_building_response(building)


# Sections
@router.get("/{building_id}/sections", response_model=List[SectionResponse])
async def get_sections(
    building_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sections in a building."""
    building = db.query(Building).filter(Building.id == building_id, Building.is_active == True).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    sections = db.query(Section).filter(
        Section.building_id == building_id,
        Section.is_active == True
    ).order_by(Section.position).all()

    return [SectionResponse.model_validate(s) for s in sections]


@router.post("/{building_id}/sections", response_model=SectionResponse)
async def create_section(
    building_id: UUID,
    section_data: SectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a section in a building."""
    building = db.query(Building).filter(Building.id == building_id, Building.is_active == True).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    section = Section(building_id=building_id, **section_data.model_dump(exclude={'building_id'}))
    db.add(section)
    db.commit()
    db.refresh(section)

    return SectionResponse.model_validate(section)


@router.delete("/{building_id}")
async def delete_building(
    building_id: UUID,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un batiment (soft delete).

    Si le batiment contient des lots actifs, la suppression est bloquee.
    Vous devez d'abord terminer ou deplacer les lots.

    Args:
        force: Si True, supprime meme avec des lots termines/en preparation.
               Les lots ACTIFS bloquent toujours la suppression.
    """
    building = db.query(Building).filter(Building.id == building_id, Building.is_active == True).first()
    if not building:
        raise HTTPException(status_code=404, detail="Batiment non trouve")

    site = db.query(Site).filter(Site.id == building.site_id, Site.is_active == True).first()
    if not site or str(site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Acces non autorise")

    # Check for lots in this building
    lots_in_building = db.query(Lot).filter(
        Lot.building_id == building_id,
        Lot.status != LotStatus.DELETED
    ).all()

    # Count lots by status
    active_lots = [l for l in lots_in_building if l.status == LotStatus.ACTIVE]
    other_lots = [l for l in lots_in_building if l.status != LotStatus.ACTIVE]

    # Block if there are active lots
    if active_lots:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "building_has_active_lots",
                "message": f"Ce batiment contient {len(active_lots)} lot(s) actif(s). Vous devez d'abord les terminer ou les deplacer.",
                "active_lots": [
                    {
                        "id": str(lot.id),
                        "code": lot.code,
                        "name": lot.name,
                        "current_quantity": lot.current_quantity,
                        "age_days": lot.age_days
                    }
                    for lot in active_lots
                ],
                "actions_requises": [
                    "Terminer les lots (PATCH /api/v1/lots/{id} avec status='completed')",
                    "Ou deplacer les lots vers un autre batiment (PATCH /api/v1/lots/{id} avec building_id=...)"
                ]
            }
        )

    # Warn if there are other lots (completed, preparation, suspended)
    if other_lots and not force:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "building_has_lots",
                "message": f"Ce batiment contient {len(other_lots)} lot(s) non-actif(s). Ces lots seront masques si vous supprimez le batiment.",
                "lots": [
                    {
                        "id": str(lot.id),
                        "code": lot.code,
                        "status": lot.status.value if lot.status else "unknown"
                    }
                    for lot in other_lots
                ],
                "recommendation": "Verifiez que ces lots n'ont plus besoin d'etre consultes.",
                "force_delete": "Ajoutez ?force=true pour confirmer la suppression"
            }
        )

    # Soft delete
    building.is_active = False
    db.commit()

    message = "Batiment supprime avec succes"
    if other_lots:
        message += f" ({len(other_lots)} lot(s) associe(s) seront masques)"

    return {"message": message, "deleted_building": building.name}
