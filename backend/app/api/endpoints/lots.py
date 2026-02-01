from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
import logging

logger = logging.getLogger(__name__)

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.building import Building
from app.models.lot import Lot, LotStats, LotStatus, LotType
from app.schemas.lot import LotCreate, LotUpdate, LotResponse, LotSummary, LotStatsResponse, LotDailyEntry, LotSplitRequest, LotSplitResponse
from app.core.permissions import Permission, has_permission, can_write

router = APIRouter()


def generate_lot_code(db: Session, lot_type: str) -> str:
    """Generate a unique lot code."""
    from datetime import datetime
    year = datetime.now().year
    prefix = "LC" if lot_type == "broiler" else "LP"  # LC=Chair, LP=Pondeuse

    # Get count of lots this year
    count = db.query(Lot).filter(
        Lot.code.like(f"{prefix}-{year}-%")
    ).count()

    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"


def update_lot_stats(db: Session, lot_id: UUID) -> None:
    """Update pre-calculated statistics for a lot."""
    from sqlalchemy import func
    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption
    from app.models.finance import Sale, Expense

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        return

    stats = lot.stats
    if not stats:
        stats = LotStats(lot_id=lot_id)
        db.add(stats)

    # Mortality stats
    mortality_sum = db.query(func.coalesce(func.sum(Mortality.quantity), 0)).filter(
        Mortality.lot_id == lot_id
    ).scalar()
    stats.total_mortality = mortality_sum
    if lot.initial_quantity and lot.initial_quantity > 0:
        stats.mortality_rate = (mortality_sum / lot.initial_quantity) * 100

    # Egg stats (for layers)
    if lot.type and lot.type.value == "layer":
        egg_totals = db.query(
            func.coalesce(func.sum(EggProduction.total_eggs), 0),
            func.coalesce(func.avg(EggProduction.laying_rate), 0),
            func.coalesce(func.max(EggProduction.laying_rate), 0)  # Peak laying rate
        ).filter(EggProduction.lot_id == lot_id).first()

        stats.total_eggs = egg_totals[0] if egg_totals else 0
        stats.average_laying_rate = egg_totals[1] if egg_totals else 0
        stats.peak_laying_rate = egg_totals[2] if egg_totals else 0

    # Weight stats (for broilers)
    latest_weight = db.query(WeightRecord).filter(
        WeightRecord.lot_id == lot_id
    ).order_by(WeightRecord.date.desc()).first()

    if latest_weight:
        stats.current_weight_g = latest_weight.average_weight_g

    # Feed stats
    feed_sum = db.query(func.coalesce(func.sum(FeedConsumption.quantity_kg), 0)).filter(
        FeedConsumption.lot_id == lot_id
    ).scalar()
    stats.total_feed_kg = feed_sum

    # Calculate FCR for broilers
    if lot.type and lot.type.value == "broiler" and stats.current_weight_g and lot.current_quantity:
        total_weight_kg = (float(stats.current_weight_g) / 1000) * lot.current_quantity
        if total_weight_kg > 0 and feed_sum > 0:
            stats.feed_conversion_ratio = float(feed_sum) / total_weight_kg

    # Financial stats
    sales_sum = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
        Sale.lot_id == lot_id
    ).scalar()
    expenses_sum = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.lot_id == lot_id
    ).scalar()

    stats.total_sales = sales_sum
    stats.total_expenses = expenses_sum
    stats.gross_margin = sales_sum - expenses_sum

    db.commit()


@router.get("", response_model=List[LotSummary])
async def get_lots(
    site_id: Optional[UUID] = None,
    building_id: Optional[UUID] = None,
    status: Optional[str] = Query(None, regex="^(active|completed|preparation|suspended|deleted)$"),
    lot_type: Optional[str] = Query(None, regex="^(broiler|layer)$"),
    include_deleted: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les lots avec filtres."""
    from sqlalchemy.orm import outerjoin

    # Utiliser outerjoin pour inclure les lots sans bâtiment
    # Filter by active sites and buildings only
    query = db.query(Lot).outerjoin(Building).outerjoin(Site).filter(
        (
            (Site.organization_id == current_user.organization_id) &
            (Site.is_active == True) &
            (Building.is_active == True)
        ) | (Lot.building_id.is_(None))
    )

    # Exclude deleted lots by default
    if not include_deleted and not status:
        query = query.filter(Lot.status != LotStatus.DELETED)

    if site_id:
        query = query.filter(Site.id == site_id)
    if building_id:
        query = query.filter(Lot.building_id == building_id)
    if status:
        # Convert string to enum for PostgreSQL compatibility
        status_enum = LotStatus(status)
        query = query.filter(Lot.status == status_enum)
    if lot_type:
        # Convert string to enum for PostgreSQL compatibility
        type_enum = LotType(lot_type)
        query = query.filter(Lot.type == type_enum)

    lots = query.order_by(Lot.placement_date.desc()).all()

    result = []
    for lot in lots:
        building = lot.building
        site = building.site if building else None
        data = LotSummary(
            id=lot.id,
            code=lot.code,
            name=lot.name,
            type=lot.type.value if lot.type else "broiler",
            breed=lot.breed,
            current_quantity=lot.current_quantity,
            initial_quantity=lot.initial_quantity,
            age_days=lot.age_days,
            status=lot.status.value if lot.status else "active",
            building_id=lot.building_id,
            building_name=building.name if building else None,
            site_id=site.id if site else None,
            site_name=site.name if site else None,
            # Financial fields for analytics
            chick_price_unit=lot.chick_price_unit,
            transport_cost=lot.transport_cost,
            other_initial_costs=lot.other_initial_costs,
            # Date for period filtering
            placement_date=lot.placement_date
        )
        result.append(data)

    return result


@router.post("", response_model=LotResponse)
async def create_lot(
    lot_data: LotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new lot."""
    # Permission check: only owner and manager can create lots
    if not has_permission(current_user, Permission.CREATE_LOT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent creer des lots.")

    # Verify building access
    if lot_data.building_id:
        building = db.query(Building).filter(Building.id == lot_data.building_id, Building.is_active == True).first()
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")

        site = db.query(Site).filter(Site.id == building.site_id, Site.is_active == True).first()
        if not site or str(site.organization_id) != str(current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Generate code
    code = generate_lot_code(db, lot_data.type)

    lot = Lot(
        **lot_data.model_dump(),
        code=code,
        current_quantity=lot_data.initial_quantity,
        created_by=current_user.id
    )
    db.add(lot)
    db.flush()

    # Create stats record
    stats = LotStats(lot_id=lot.id)
    db.add(stats)

    db.commit()
    db.refresh(lot)

    response = LotResponse.model_validate(lot)
    response.age_days = lot.age_days
    response.age_weeks = lot.age_weeks
    if lot.building:
        response.building_name = lot.building.name
        response.site_name = lot.building.site.name if lot.building.site else None

    return response


@router.get("/{lot_id}", response_model=LotResponse)
async def get_lot(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific lot with stats."""
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Verify access
    if lot.building:
        site = lot.building.site
        if str(site.organization_id) != str(current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    response = LotResponse.model_validate(lot)
    response.age_days = lot.age_days
    response.age_weeks = lot.age_weeks
    if lot.building:
        response.building_name = lot.building.name
        response.site_name = lot.building.site.name if lot.building.site else None
    if lot.stats:
        response.stats = LotStatsResponse.model_validate(lot.stats)

    return response


@router.patch("/{lot_id}", response_model=LotResponse)
async def update_lot(
    lot_id: UUID,
    lot_data: LotUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a lot."""
    # Permission check: only owner and manager can edit lots
    if not has_permission(current_user, Permission.EDIT_LOT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent modifier les lots.")

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    update_data = lot_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lot, field, value)

    db.commit()
    db.refresh(lot)

    response = LotResponse.model_validate(lot)
    response.age_days = lot.age_days
    response.age_weeks = lot.age_weeks

    return response


@router.post("/{lot_id}/daily-entry")
async def record_daily_entry(
    lot_id: UUID,
    entry: LotDailyEntry,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record all daily data in one call (eggs, mortality, feed, water, weight)."""
    # Permission check: owner, manager, and technician can record daily entries
    if not has_permission(current_user, Permission.RECORD_PRODUCTION):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et techniciens peuvent enregistrer les saisies quotidiennes.")

    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption, WaterConsumption

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Mortality
    if entry.mortality_count and entry.mortality_count > 0:
        mortality = Mortality(
            lot_id=lot_id,
            date=entry.date,
            quantity=entry.mortality_count,
            cause=entry.mortality_cause or "unknown",
            recorded_by=current_user.id
        )
        db.add(mortality)

        # Update current quantity
        lot.current_quantity = (lot.current_quantity or lot.initial_quantity) - entry.mortality_count

    # Eggs (for layers)
    if lot.type == "layer" and entry.eggs_normal is not None:
        egg_prod = EggProduction(
            lot_id=lot_id,
            date=entry.date,
            normal_eggs=entry.eggs_normal or 0,
            cracked_eggs=entry.eggs_cracked or 0,
            dirty_eggs=entry.eggs_dirty or 0,
            small_eggs=entry.eggs_small or 0,
            hen_count=lot.current_quantity,
            recorded_by=current_user.id
        )
        egg_prod.calculate_totals()

        # Calculate laying rate
        if lot.current_quantity and lot.current_quantity > 0:
            egg_prod.laying_rate = (egg_prod.total_eggs / lot.current_quantity) * 100

        db.add(egg_prod)

    # Weight (for broilers mainly)
    if entry.average_weight_g is not None:
        weight = WeightRecord(
            lot_id=lot_id,
            date=entry.date,
            average_weight_g=entry.average_weight_g,
            sample_size=entry.sample_size,
            age_days=lot.age_days,
            recorded_by=current_user.id
        )
        db.add(weight)

    # Feed
    if entry.feed_quantity_kg is not None:
        from app.models.feed import FeedStock, FeedStockMovement, StockMovementType

        feed = FeedConsumption(
            lot_id=lot_id,
            date=entry.date,
            quantity_kg=entry.feed_quantity_kg,
            feed_type=entry.feed_type,
            bird_count=lot.current_quantity,
            recorded_by=current_user.id
        )
        if lot.current_quantity and lot.current_quantity > 0:
            feed.feed_per_bird_g = (float(entry.feed_quantity_kg) * 1000) / lot.current_quantity
        db.add(feed)

        # Deduct from stock if requested
        if entry.deduct_from_stock and entry.feed_stock_id:
            stock = db.query(FeedStock).filter(FeedStock.id == entry.feed_stock_id).first()
            if not stock:
                raise HTTPException(status_code=404, detail="Stock non trouve")

            # Check if enough stock
            current_qty = round(float(stock.quantity_kg or 0), 2)
            requested_qty = round(float(entry.feed_quantity_kg), 2)
            if current_qty < requested_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuffisant: {current_qty:.1f} kg disponibles, {requested_qty:.1f} kg demandes"
                )

            # Deduct from stock
            stock.quantity_kg = round(current_qty - requested_qty, 2)

            # Record movement
            movement = FeedStockMovement(
                stock_id=stock.id,
                movement_type=StockMovementType.CONSUMPTION,
                quantity_kg=-requested_qty,  # Negative for consumption
                lot_id=lot_id,
                notes=f"Consommation lot {lot.code} - {entry.date}",
                recorded_by=current_user.id,
                date=entry.date
            )
            db.add(movement)

    # Water
    if entry.water_liters is not None:
        water = WaterConsumption(
            lot_id=lot_id,
            date=entry.date,
            quantity_liters=entry.water_liters,
            bird_count=lot.current_quantity,
            recorded_by=current_user.id
        )
        if lot.current_quantity and lot.current_quantity > 0:
            water.water_per_bird_ml = (float(entry.water_liters) * 1000) / lot.current_quantity
        db.add(water)

    db.commit()

    # Update lot stats
    update_lot_stats(db, lot_id)

    return {"message": "Daily entry recorded successfully", "date": entry.date}


@router.get("/{lot_id}/daily-entry/{entry_date}")
async def get_daily_entry(
    lot_id: UUID,
    entry_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a daily entry exists for a specific date."""
    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption, WaterConsumption

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Get existing data for this date
    eggs = db.query(EggProduction).filter(
        EggProduction.lot_id == lot_id,
        EggProduction.date == entry_date
    ).first()

    mortality = db.query(Mortality).filter(
        Mortality.lot_id == lot_id,
        Mortality.date == entry_date
    ).first()

    feed = db.query(FeedConsumption).filter(
        FeedConsumption.lot_id == lot_id,
        FeedConsumption.date == entry_date
    ).first()

    water = db.query(WaterConsumption).filter(
        WaterConsumption.lot_id == lot_id,
        WaterConsumption.date == entry_date
    ).first()

    weight = db.query(WeightRecord).filter(
        WeightRecord.lot_id == lot_id,
        WeightRecord.date == entry_date
    ).first()

    has_data = any([eggs, mortality, feed, water, weight])

    return {
        "exists": has_data,
        "date": entry_date,
        "data": {
            "eggs": {
                "id": str(eggs.id) if eggs else None,
                "eggs_normal": eggs.normal_eggs if eggs else None,
                "eggs_cracked": eggs.cracked_eggs if eggs else None,
                "eggs_dirty": eggs.dirty_eggs if eggs else None,
                "eggs_small": eggs.small_eggs if eggs else None,
                "total_eggs": eggs.total_eggs if eggs else None,
                "laying_rate": round(float(eggs.laying_rate), 2) if eggs and eggs.laying_rate else None
            } if eggs else None,
            "mortality": {
                "id": str(mortality.id) if mortality else None,
                "count": mortality.quantity if mortality else None,
                "cause": mortality.cause if mortality else None
            } if mortality else None,
            "feed": {
                "id": str(feed.id) if feed else None,
                "quantity_kg": round(float(feed.quantity_kg), 2) if feed else None,
                "feed_type": feed.feed_type if feed else None
            } if feed else None,
            "water": {
                "id": str(water.id) if water else None,
                "liters": round(float(water.quantity_liters), 2) if water else None
            } if water else None,
            "weight": {
                "id": str(weight.id) if weight else None,
                "average_weight_g": round(float(weight.average_weight_g), 2) if weight else None,
                "sample_size": weight.sample_size if weight else None
            } if weight else None
        }
    }


@router.put("/{lot_id}/daily-entry")
async def update_daily_entry(
    lot_id: UUID,
    entry: LotDailyEntry,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update existing daily entry data."""
    # Permission check: owner, manager, and technician can update daily entries
    if not has_permission(current_user, Permission.RECORD_PRODUCTION):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et techniciens peuvent modifier les saisies quotidiennes.")

    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption, WaterConsumption

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Update eggs
    if lot.type == "layer" and entry.eggs_normal is not None:
        existing_eggs = db.query(EggProduction).filter(
            EggProduction.lot_id == lot_id,
            EggProduction.date == entry.date
        ).first()

        if existing_eggs:
            existing_eggs.normal_eggs = entry.eggs_normal or 0
            existing_eggs.cracked_eggs = entry.eggs_cracked or 0
            existing_eggs.dirty_eggs = entry.eggs_dirty or 0
            existing_eggs.small_eggs = entry.eggs_small or 0
            existing_eggs.hen_count = lot.current_quantity
            existing_eggs.calculate_totals()
            if lot.current_quantity and lot.current_quantity > 0:
                existing_eggs.laying_rate = (existing_eggs.total_eggs / lot.current_quantity) * 100
        else:
            # Create new if doesn't exist
            egg_prod = EggProduction(
                lot_id=lot_id,
                date=entry.date,
                normal_eggs=entry.eggs_normal or 0,
                cracked_eggs=entry.eggs_cracked or 0,
                dirty_eggs=entry.eggs_dirty or 0,
                small_eggs=entry.eggs_small or 0,
                hen_count=lot.current_quantity,
                recorded_by=current_user.id
            )
            egg_prod.calculate_totals()
            if lot.current_quantity and lot.current_quantity > 0:
                egg_prod.laying_rate = (egg_prod.total_eggs / lot.current_quantity) * 100
            db.add(egg_prod)

    # Update feed
    if entry.feed_quantity_kg is not None:
        existing_feed = db.query(FeedConsumption).filter(
            FeedConsumption.lot_id == lot_id,
            FeedConsumption.date == entry.date
        ).first()

        if existing_feed:
            existing_feed.quantity_kg = entry.feed_quantity_kg
            existing_feed.feed_type = entry.feed_type
            existing_feed.bird_count = lot.current_quantity
            if lot.current_quantity and lot.current_quantity > 0:
                existing_feed.feed_per_bird_g = (float(entry.feed_quantity_kg) * 1000) / lot.current_quantity
        else:
            feed = FeedConsumption(
                lot_id=lot_id,
                date=entry.date,
                quantity_kg=entry.feed_quantity_kg,
                feed_type=entry.feed_type,
                bird_count=lot.current_quantity,
                recorded_by=current_user.id
            )
            if lot.current_quantity and lot.current_quantity > 0:
                feed.feed_per_bird_g = (float(entry.feed_quantity_kg) * 1000) / lot.current_quantity
            db.add(feed)

    # Update water
    if entry.water_liters is not None:
        existing_water = db.query(WaterConsumption).filter(
            WaterConsumption.lot_id == lot_id,
            WaterConsumption.date == entry.date
        ).first()

        if existing_water:
            existing_water.quantity_liters = entry.water_liters
            existing_water.bird_count = lot.current_quantity
            if lot.current_quantity and lot.current_quantity > 0:
                existing_water.water_per_bird_ml = (float(entry.water_liters) * 1000) / lot.current_quantity
        else:
            water = WaterConsumption(
                lot_id=lot_id,
                date=entry.date,
                quantity_liters=entry.water_liters,
                bird_count=lot.current_quantity,
                recorded_by=current_user.id
            )
            if lot.current_quantity and lot.current_quantity > 0:
                water.water_per_bird_ml = (float(entry.water_liters) * 1000) / lot.current_quantity
            db.add(water)

    # Update weight
    if entry.average_weight_g is not None:
        existing_weight = db.query(WeightRecord).filter(
            WeightRecord.lot_id == lot_id,
            WeightRecord.date == entry.date
        ).first()

        if existing_weight:
            existing_weight.average_weight_g = entry.average_weight_g
            existing_weight.sample_size = entry.sample_size
            existing_weight.age_days = lot.age_days
        else:
            weight = WeightRecord(
                lot_id=lot_id,
                date=entry.date,
                average_weight_g=entry.average_weight_g,
                sample_size=entry.sample_size,
                age_days=lot.age_days,
                recorded_by=current_user.id
            )
            db.add(weight)

    # Note: Mortality is not updated here - we don't modify past mortality records
    # as it would mess up the current_quantity tracking

    db.commit()
    update_lot_stats(db, lot_id)

    return {"message": "Daily entry updated successfully", "date": entry.date}


@router.get("/{lot_id}/history")
async def get_lot_history(
    lot_id: UUID,
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get history of all entries for a lot - optimized: 5 queries instead of 150."""
    from sqlalchemy import func
    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption, WaterConsumption

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Fetch all data upfront in 5 queries (instead of 5 × N queries)
    all_eggs = db.query(EggProduction).filter(
        EggProduction.lot_id == lot_id
    ).all()
    eggs_by_date = {e.date: e for e in all_eggs}

    all_mortality = db.query(Mortality).filter(
        Mortality.lot_id == lot_id
    ).all()
    # Group mortality by date and sum quantities
    mortality_by_date = {}
    for m in all_mortality:
        mortality_by_date[m.date] = mortality_by_date.get(m.date, 0) + (m.quantity or 0)

    all_feed = db.query(FeedConsumption).filter(
        FeedConsumption.lot_id == lot_id
    ).all()
    feed_by_date = {f.date: f for f in all_feed}

    all_water = db.query(WaterConsumption).filter(
        WaterConsumption.lot_id == lot_id
    ).all()
    water_by_date = {w.date: w for w in all_water}

    all_weight = db.query(WeightRecord).filter(
        WeightRecord.lot_id == lot_id
    ).all()
    weight_by_date = {w.date: w for w in all_weight}

    # Get unique dates from all sources
    all_dates = set()
    all_dates.update(eggs_by_date.keys())
    all_dates.update(mortality_by_date.keys())
    all_dates.update(feed_by_date.keys())
    all_dates.update(water_by_date.keys())
    all_dates.update(weight_by_date.keys())

    # Sort and limit
    unique_dates = sorted(all_dates, reverse=True)[:limit]

    # Build history from pre-fetched data
    history = []
    for entry_date in unique_dates:
        eggs = eggs_by_date.get(entry_date)
        total_mortality = mortality_by_date.get(entry_date, 0)
        feed = feed_by_date.get(entry_date)
        water = water_by_date.get(entry_date)
        weight = weight_by_date.get(entry_date)

        history.append({
            "date": entry_date,
            "eggs": eggs.total_eggs if eggs else None,
            "laying_rate": round(float(eggs.laying_rate), 2) if eggs and eggs.laying_rate else None,
            "mortality": total_mortality if total_mortality > 0 else None,
            "feed_kg": round(float(feed.quantity_kg), 2) if feed else None,
            "water_liters": round(float(water.quantity_liters), 2) if water else None,
            "weight_g": round(float(weight.average_weight_g), 2) if weight else None
        })

    return {
        "lot_id": str(lot_id),
        "lot_code": lot.code,
        "lot_type": lot.type,
        "history": history
    }


@router.post("/{lot_id}/close")
async def close_lot(
    lot_id: UUID,
    end_date: date = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close/complete a lot."""
    # Permission check: only owner and manager can close lots
    if not has_permission(current_user, Permission.EDIT_LOT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent cloturer les lots.")

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    lot.status = "completed"
    lot.actual_end_date = end_date or date.today()
    db.commit()

    return {"message": "Lot closed successfully"}


@router.delete("/{lot_id}")
async def delete_lot(
    lot_id: UUID,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Soft delete a lot.

    IMPORTANT: La suppression est reservee aux corrections d'erreurs.
    Si le lot a des donnees de production/ventes, utilisez plutot "Terminer" (status=completed).

    - Terminer (COMPLETED): Le lot reste visible dans l'historique, les donnees sont conservees
      pour les rapports et analyses. Recommande pour les lots qui ont eu une activite reelle.

    - Supprimer (DELETED): Le lot disparait completement de l'application, exclu de tous les
      calculs et rapports. A utiliser uniquement pour corriger des erreurs de saisie.

    Args:
        force: Si True, supprime meme si le lot contient des donnees. Sinon, retourne un
               avertissement avec les donnees trouvees.
    """
    from app.models.production import EggProduction, WeightRecord, Mortality
    from app.models.feed import FeedConsumption, WaterConsumption
    from app.models.health import HealthEvent
    from app.models.finance import Sale, Expense

    # Permission check: only owner and manager can delete lots
    if not has_permission(current_user, Permission.DELETE_LOT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent supprimer les lots.")

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # CRITICAL: Block deletion of active lots - must close them first
    if lot.status == LotStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "lot_is_active",
                "message": f"Ce lot est encore actif avec {lot.current_quantity or 0} oiseaux. Vous devez d'abord le clôturer avant de pouvoir le supprimer.",
                "lot_code": lot.code,
                "lot_name": lot.name,
                "current_quantity": lot.current_quantity,
                "status": "active",
                "recommendation": "Clôturez d'abord le lot en utilisant le bouton 'Clôturer' ou changez son statut en 'completed'.",
                "alternatives": [
                    {
                        "action": "Clôturer le lot",
                        "description": "Marque le lot comme terminé. Les données sont conservées pour l'historique et les rapports.",
                        "endpoint": f"POST /api/v1/lots/{lot_id}/close"
                    },
                    {
                        "action": "Modifier le statut",
                        "description": "Changez manuellement le statut du lot.",
                        "endpoint": f"PATCH /api/v1/lots/{lot_id}",
                        "body": {"status": "completed"}
                    }
                ]
            }
        )

    # Verify authorization through building -> site -> organization
    building = db.query(Building).filter(Building.id == lot.building_id, Building.is_active == True).first()
    if building:
        site = db.query(Site).filter(Site.id == building.site_id, Site.is_active == True).first()
        if site and str(site.organization_id) != str(current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Check if lot has any associated data
    data_counts = {
        "ventes": db.query(Sale).filter(Sale.lot_id == lot_id).count(),
        "depenses": db.query(Expense).filter(Expense.lot_id == lot_id).count(),
        "production_oeufs": db.query(EggProduction).filter(EggProduction.lot_id == lot_id).count(),
        "pesees": db.query(WeightRecord).filter(WeightRecord.lot_id == lot_id).count(),
        "mortalites": db.query(Mortality).filter(Mortality.lot_id == lot_id).count(),
        "consommation_aliment": db.query(FeedConsumption).filter(FeedConsumption.lot_id == lot_id).count(),
        "consommation_eau": db.query(WaterConsumption).filter(WaterConsumption.lot_id == lot_id).count(),
        "evenements_sante": db.query(HealthEvent).filter(HealthEvent.lot_id == lot_id).count(),
    }

    has_data = any(count > 0 for count in data_counts.values())
    total_records = sum(data_counts.values())

    # If lot has data and force is not set, return warning
    if has_data and not force:
        non_empty = {k: v for k, v in data_counts.items() if v > 0}
        raise HTTPException(
            status_code=400,
            detail={
                "error": "lot_has_data",
                "message": f"Ce lot contient {total_records} enregistrement(s). La suppression effacera definitivement ces donnees des rapports et calculs financiers.",
                "data_found": non_empty,
                "recommendation": "Avant de supprimer, considerez ces alternatives:",
                "alternatives": [
                    {
                        "action": "Modifier le lot",
                        "description": "Si vous avez fait une erreur de saisie (nom, quantite, date...), modifiez simplement les informations du lot.",
                        "endpoint": f"PATCH /api/v1/lots/{lot_id}",
                        "quand_utiliser": "Erreur dans les informations du lot"
                    },
                    {
                        "action": "Terminer le lot",
                        "description": "Marque le lot comme termine. Il reste visible dans l'historique et les rapports.",
                        "endpoint": f"PATCH /api/v1/lots/{lot_id} avec status='completed'",
                        "quand_utiliser": "Le lot a reellement existe et est termine (vendu, reforme...)"
                    },
                    {
                        "action": "Supprimer le lot",
                        "description": "Efface le lot de tous les rapports et calculs. Reserve aux erreurs de creation.",
                        "endpoint": f"DELETE /api/v1/lots/{lot_id}?force=true",
                        "quand_utiliser": "Le lot n'aurait jamais du etre cree (doublon, test, erreur complete)"
                    }
                ],
                "implications": {
                    "modifier": [
                        "Corrige les erreurs sans perdre l'historique",
                        "Les donnees associees restent intactes",
                        "Aucun impact sur les rapports"
                    ],
                    "terminer": [
                        "Le lot reste visible dans l'historique",
                        "Les donnees sont conservees pour les rapports",
                        "Les ventes et depenses restent dans les calculs financiers",
                        "Vous pouvez consulter les performances du lot"
                    ],
                    "supprimer": [
                        "Le lot disparait completement",
                        "Les donnees ne seront plus visibles",
                        "Exclu de tous les calculs et rapports",
                        "Action irreversible"
                    ]
                },
                "force_delete": "Ajoutez ?force=true pour confirmer la suppression"
            }
        )

    # Proceed with soft delete
    lot.status = LotStatus.DELETED
    db.commit()

    message = "Lot supprime avec succes"
    if has_data:
        message += f" ({total_records} enregistrement(s) associes seront exclus des rapports)"

    return {"message": message, "deleted_lot_code": lot.code}


@router.get("/{lot_id}/financial-summary")
async def get_lot_financial_summary(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed financial summary for a lot with expenses breakdown and sales list."""
    from sqlalchemy import func
    from app.models.finance import Sale, Expense
    from app.models.production import EggProduction

    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    is_layer = lot.type and lot.type.value.lower() == 'layer'

    # Get expenses grouped by category
    expenses_by_category = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.lot_id == lot_id
    ).group_by(Expense.category).all()

    expenses_breakdown = {}
    total_expenses = 0
    # Use a set of lowercase category names for case-insensitive duplicate checking
    expense_categories_lower = set()
    for category, total, count in expenses_by_category:
        cat_total = float(total or 0)
        # Normalize category name to lowercase for consistency
        cat_lower = category.lower() if category else 'other'
        expense_categories_lower.add(cat_lower)
        # Store with normalized lowercase key
        if cat_lower in expenses_breakdown:
            # Merge if same category with different case exists
            expenses_breakdown[cat_lower]['total'] += cat_total
            expenses_breakdown[cat_lower]['count'] += count
        else:
            expenses_breakdown[cat_lower] = {
                'total': cat_total,
                'count': count
            }
        total_expenses += cat_total

    # Check if this lot has been split (has child lots)
    child_lots_exist = db.query(Lot).filter(Lot.parent_lot_id == lot_id, Lot.status != LotStatus.DELETED).first() is not None

    # DEBUG: Log lot financial fields
    logger.warning(f"[FINANCIAL DEBUG] lot_id={lot_id}, code={lot.code}")
    logger.warning(f"[FINANCIAL DEBUG] chick_price_unit={lot.chick_price_unit}, initial_quantity={lot.initial_quantity}")
    logger.warning(f"[FINANCIAL DEBUG] current_quantity={lot.current_quantity}, has_children={child_lots_exist}")
    logger.warning(f"[FINANCIAL DEBUG] transport_cost={lot.transport_cost}")
    logger.warning(f"[FINANCIAL DEBUG] expense_categories_lower={expense_categories_lower}")

    # Add chick cost from lot fields ONLY if not already in expenses table
    # This prevents double counting
    if lot.chick_price_unit and lot.initial_quantity:
        # For lots that have been split (have children), use current_quantity
        # because part of the chick cost has been transferred to child lots
        # For unsplit lots or child lots, use initial_quantity
        if child_lots_exist and lot.current_quantity:
            # This lot has been split, calculate cost based on remaining birds
            chick_quantity_for_cost = lot.current_quantity
            logger.warning(f"[FINANCIAL DEBUG] Lot has children, using current_quantity={chick_quantity_for_cost} for chick cost")
        else:
            chick_quantity_for_cost = lot.initial_quantity
            logger.warning(f"[FINANCIAL DEBUG] Using initial_quantity={chick_quantity_for_cost} for chick cost")

        chick_cost = float(lot.chick_price_unit) * chick_quantity_for_cost
        logger.warning(f"[FINANCIAL DEBUG] chick_cost calculated={chick_cost}, 'chicks' in categories: {'chicks' in expense_categories_lower}")
        if 'chicks' not in expense_categories_lower:
            # Only add if not already recorded as expense
            expenses_breakdown['chicks'] = {'total': chick_cost, 'count': 1, 'source': 'lot'}
            total_expenses += chick_cost
            logger.warning(f"[FINANCIAL DEBUG] Added chick_cost to total_expenses, new total={total_expenses}")

    # Add transport cost from lot fields ONLY if not already in expenses table
    if lot.transport_cost:
        transport_cost = float(lot.transport_cost)
        logger.warning(f"[FINANCIAL DEBUG] transport_cost calculated={transport_cost}, 'transport' in categories: {'transport' in expense_categories_lower}")
        if 'transport' not in expense_categories_lower:
            # Only add if not already recorded as expense
            expenses_breakdown['transport'] = {'total': transport_cost, 'count': 1, 'source': 'lot'}
            total_expenses += transport_cost
            logger.warning(f"[FINANCIAL DEBUG] Added transport_cost to total_expenses, new total={total_expenses}")

    # Add other initial costs if available
    if lot.other_initial_costs:
        other_cost = float(lot.other_initial_costs)
        if 'other' not in expense_categories_lower:
            expenses_breakdown['other'] = {'total': other_cost, 'count': 1, 'source': 'lot'}
        else:
            expenses_breakdown['other']['total'] += other_cost
        total_expenses += other_cost

    # Get all sales for this lot with details
    sales = db.query(Sale).filter(Sale.lot_id == lot_id).order_by(Sale.created_at.desc()).all()

    sales_list = []
    total_revenue = 0
    total_quantity_sold = 0

    for sale in sales:
        sale_amount = float(sale.total_amount or 0)
        sale_qty = float(sale.quantity or 0)
        total_revenue += sale_amount
        total_quantity_sold += sale_qty

        # Calculate cost per unit at time of sale
        cost_per_unit = total_expenses / lot.initial_quantity if lot.initial_quantity else 0
        profit_per_unit = (sale_amount / sale_qty) - cost_per_unit if sale_qty > 0 else 0

        sales_list.append({
            'id': str(sale.id),
            'date': sale.date.isoformat() if sale.date else None,
            'sale_type': sale.sale_type.value if sale.sale_type else 'other',
            'quantity': sale_qty,
            'unit': sale.unit,
            'unit_price': float(sale.unit_price or 0),
            'total_amount': sale_amount,
            'client_name': sale.client_name,
            'payment_status': sale.payment_status.value if sale.payment_status else 'pending',
            'total_weight_kg': float(sale.total_weight_kg) if sale.total_weight_kg else None,
            'average_weight_kg': float(sale.average_weight_kg) if sale.average_weight_kg else None,
        })

    # For LAYER lots: Calculate estimated revenue from egg production
    eggs_revenue_estimate = None
    eggs_produced_trays = 0
    avg_price_per_tray = 0

    logger.warning(f"[EGGS DEBUG] lot_type={lot.type}, is_layer={is_layer}")

    if is_layer:
        # Get total eggs produced by this lot
        total_eggs_produced = db.query(func.sum(EggProduction.sellable_eggs)).filter(
            EggProduction.lot_id == lot_id
        ).scalar() or 0

        # Convert eggs to trays (1 tray = 30 eggs)
        eggs_produced_trays = total_eggs_produced / 30
        logger.warning(f"[EGGS DEBUG] total_eggs={total_eggs_produced}, trays={eggs_produced_trays}")

        # Get average price per tray from recent egg sales
        from app.models.finance import SaleType
        from app.models.site import Site

        site_id = lot.building.site_id if lot.building else None
        org_id = lot.building.site.organization_id if lot.building and lot.building.site else None

        avg_price_result = None

        # 1) Try site-level first (fast)
        if site_id:
            avg_price_result = db.query(
                func.avg(Sale.unit_price)
            ).filter(
                Sale.site_id == site_id,
                Sale.sale_type == SaleType.EGGS_TRAY,
                Sale.unit_price > 0
            ).scalar()
            logger.warning(f"[EGGS DEBUG] site_id={site_id}, site_avg_price={avg_price_result}")

        # 2) Fallback: organization-level if no site sales
        if (not avg_price_result or avg_price_result <= 0) and org_id:
            org_site_ids = db.query(Site.id).filter(Site.organization_id == org_id, Site.is_active == True).all()
            org_site_ids = [s[0] for s in org_site_ids]
            if org_site_ids:
                avg_price_result = db.query(
                    func.avg(Sale.unit_price)
                ).filter(
                    Sale.site_id.in_(org_site_ids),
                    Sale.sale_type == SaleType.EGGS_TRAY,
                    Sale.unit_price > 0
                ).scalar()
                logger.warning(f"[EGGS DEBUG] org fallback, org_avg_price={avg_price_result}")

        if avg_price_result and avg_price_result > 0:
            avg_price_per_tray = float(avg_price_result)
        else:
            # Default price per tray if no sales history
            avg_price_per_tray = 1500
            logger.warning(f"[EGGS DEBUG] using default price={avg_price_per_tray}")

        # Calculate estimated revenue
        eggs_revenue_estimate = eggs_produced_trays * avg_price_per_tray
        logger.warning(f"[EGGS DEBUG] avg_price={avg_price_per_tray}, eggs_revenue_estimate={eggs_revenue_estimate}")

        # Add estimated egg revenue to total revenue for layer lots
        total_revenue += eggs_revenue_estimate

    # Calculate profit metrics
    gross_profit = total_revenue - total_expenses
    profit_margin_percent = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

    # Per unit metrics
    current_birds = lot.current_quantity or 0
    birds_sold = total_quantity_sold if lot.type and lot.type.value == 'broiler' else 0
    cost_per_bird = total_expenses / lot.initial_quantity if lot.initial_quantity else 0
    revenue_per_bird = total_revenue / birds_sold if birds_sold > 0 else 0
    profit_per_bird = gross_profit / birds_sold if birds_sold > 0 else 0

    # Check if this lot was split from another (inherited expenses indicator)
    is_split_lot = lot.parent_lot_id is not None
    inherited_expenses = 0
    if is_split_lot:
        # Count expenses that came from split
        inherited_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.lot_id == lot_id,
            Expense.from_split_lot_id.isnot(None)
        ).scalar() or 0
        inherited_expenses = float(inherited_expenses)

    # Check if this lot has been split (has child lots)
    child_lots_count = db.query(Lot).filter(Lot.parent_lot_id == lot_id, Lot.status != LotStatus.DELETED).count()

    # Build response
    response = {
        'lot_id': str(lot_id),
        'lot_code': lot.code,
        'lot_type': lot.type.value if lot.type else 'broiler',
        'initial_quantity': lot.initial_quantity,
        'current_quantity': current_birds,
        'split_info': {
            'is_split_lot': is_split_lot,
            'parent_lot_id': str(lot.parent_lot_id) if lot.parent_lot_id else None,
            'split_date': lot.split_date.isoformat() if lot.split_date else None,
            'split_ratio': float(lot.split_ratio) if lot.split_ratio else None,
            'inherited_expenses': round(inherited_expenses, 2),
            'has_child_lots': child_lots_count > 0,
            'child_lots_count': child_lots_count
        },
        'summary': {
            'total_expenses': round(total_expenses, 2),
            'total_revenue': round(total_revenue, 2),
            'gross_profit': round(gross_profit, 2),
            'profit_margin_percent': round(profit_margin_percent, 1),
            'profit_status': 'profit' if gross_profit > 0 else 'loss' if gross_profit < 0 else 'break_even'
        },
        'expenses_breakdown': expenses_breakdown,
        'per_unit': {
            'cost_per_bird': round(cost_per_bird, 2),
            'revenue_per_bird': round(revenue_per_bird, 2),
            'profit_per_bird': round(profit_per_bird, 2),
            'birds_sold': int(birds_sold)
        },
        'sales': sales_list,
        'sales_count': len(sales_list)
    }

    # Add egg production info for layer lots
    if is_layer and eggs_revenue_estimate is not None:
        response['eggs_production'] = {
            'total_trays_produced': round(eggs_produced_trays, 1),
            'avg_price_per_tray': round(avg_price_per_tray, 2),
            'estimated_revenue': round(eggs_revenue_estimate, 2),
            'is_estimate': True,
            'note': 'Revenus estimés basés sur la production et le prix moyen de vente'
        }
        # Update summary to indicate estimate
        response['summary']['revenue_is_estimate'] = True

    return response


@router.post("/{lot_id}/split", response_model=LotSplitResponse)
async def split_lot(
    lot_id: UUID,
    split_data: LotSplitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Split a lot into two lots.

    This endpoint allows splitting a portion of a lot into a new lot in a different building.
    Useful when chicks are moved from heating room to different production buildings.

    - The original lot keeps (current_quantity - split_quantity) birds
    - A new lot is created with split_quantity birds
    - Past expenses are distributed proportionally if distribute_expenses is True
    - Historical production data stays with the original lot
    """
    # Permission check: only owner and manager can split lots
    if not has_permission(current_user, Permission.EDIT_LOT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent diviser les lots.")

    from decimal import Decimal
    from app.models.finance import Expense

    # Get the original lot
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Verify access
    if lot.building:
        site = lot.building.site
        if str(site.organization_id) != str(current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Validate split quantity
    if split_data.quantity >= lot.current_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot split {split_data.quantity} birds. Lot only has {lot.current_quantity} birds. Must leave at least 1 bird in original lot."
        )

    if split_data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Split quantity must be greater than 0")

    # Verify target building exists and belongs to same organization
    target_building = db.query(Building).filter(Building.id == split_data.target_building_id, Building.is_active == True).first()
    if not target_building:
        raise HTTPException(status_code=404, detail="Target building not found")

    target_site = db.query(Site).filter(Site.id == target_building.site_id, Site.is_active == True).first()
    if not target_site or str(target_site.organization_id) != str(current_user.organization_id):
        raise HTTPException(status_code=403, detail="Target building not in your organization")

    # Calculate split ratio
    split_ratio = Decimal(str(split_data.quantity)) / Decimal(str(lot.current_quantity))

    # Generate new lot code
    new_lot_code = generate_lot_code(db, lot.type.value if lot.type else "broiler")

    # Calculate proportional initial quantity for cost tracking
    # This is important: we use the ratio of current birds being moved
    # But for cost calculations, we track the initial equivalent
    initial_qty_ratio = Decimal(str(split_data.quantity)) / Decimal(str(lot.initial_quantity))

    # DEBUG: Log parent lot financial values before split
    logger.warning(f"[SPLIT DEBUG] Parent lot {lot.code}:")
    logger.warning(f"[SPLIT DEBUG]   chick_price_unit = {lot.chick_price_unit}")
    logger.warning(f"[SPLIT DEBUG]   transport_cost = {lot.transport_cost}")
    logger.warning(f"[SPLIT DEBUG]   initial_quantity = {lot.initial_quantity}")
    logger.warning(f"[SPLIT DEBUG]   split_quantity = {split_data.quantity}")
    logger.warning(f"[SPLIT DEBUG]   initial_qty_ratio = {initial_qty_ratio}")

    # Calculate proportional costs for the new lot
    # chick_price_unit stays the same (it's per-unit price)
    # transport_cost and other_initial_costs are split proportionally
    new_transport_cost = None
    new_other_initial_costs = None

    if lot.transport_cost:
        original_transport = Decimal(str(lot.transport_cost))
        new_transport_cost = original_transport * initial_qty_ratio
        # Update original lot's transport cost
        lot.transport_cost = original_transport - new_transport_cost

    if lot.other_initial_costs:
        original_other = Decimal(str(lot.other_initial_costs))
        new_other_initial_costs = original_other * initial_qty_ratio
        # Update original lot's other costs
        lot.other_initial_costs = original_other - new_other_initial_costs

    # Create the new (child) lot
    new_lot = Lot(
        building_id=split_data.target_building_id,
        code=new_lot_code,
        name=split_data.new_lot_name or f"{lot.name or lot.code} - Split",
        type=lot.type,
        status=lot.status,
        breed=lot.breed,
        supplier=lot.supplier,
        initial_quantity=split_data.quantity,  # For the new lot, initial = what we're transferring
        current_quantity=split_data.quantity,
        placement_date=lot.placement_date,
        age_at_placement=lot.age_at_placement,
        expected_end_date=lot.expected_end_date,
        transfer_to_laying_date=lot.transfer_to_laying_date,
        first_egg_date=lot.first_egg_date,
        # Copy per-unit chick price (stays the same)
        chick_price_unit=lot.chick_price_unit,
        # Proportional transport and other costs
        transport_cost=new_transport_cost,
        other_initial_costs=new_other_initial_costs,
        target_weight_g=lot.target_weight_g,
        target_fcr=lot.target_fcr,
        target_laying_rate=lot.target_laying_rate,
        notes=f"Split from lot {lot.code}. {split_data.notes or ''}".strip(),
        # Split tracking fields
        parent_lot_id=lot.id,
        split_date=date.today(),
        split_ratio=split_ratio,
        created_by=current_user.id
    )
    db.add(new_lot)
    db.flush()  # Get the new lot ID

    # DEBUG: Log new lot financial values after creation
    logger.warning(f"[SPLIT DEBUG] New lot {new_lot.code} created:")
    logger.warning(f"[SPLIT DEBUG]   chick_price_unit = {new_lot.chick_price_unit}")
    logger.warning(f"[SPLIT DEBUG]   transport_cost = {new_lot.transport_cost}")
    logger.warning(f"[SPLIT DEBUG]   initial_quantity = {new_lot.initial_quantity}")

    # Create stats record for new lot
    new_stats = LotStats(lot_id=new_lot.id)
    db.add(new_stats)

    # Distribute expenses if requested
    total_expenses_transferred = Decimal('0')

    if split_data.distribute_expenses:
        # Get all expenses for the original lot
        original_expenses = db.query(Expense).filter(
            Expense.lot_id == lot_id,
            Expense.from_split_lot_id.is_(None)  # Don't re-split already split expenses
        ).all()

        for expense in original_expenses:
            # Calculate proportional amount
            original_amount = Decimal(str(expense.amount or 0))
            transferred_amount = original_amount * initial_qty_ratio

            if transferred_amount > 0:
                # Create new expense for child lot
                new_expense = Expense(
                    lot_id=new_lot.id,
                    site_id=expense.site_id,
                    date=expense.date,
                    category=expense.category,
                    description=f"{expense.description or ''} (split from {lot.code})".strip(),
                    quantity=float(expense.quantity * initial_qty_ratio) if expense.quantity else None,
                    unit=expense.unit,
                    unit_price=expense.unit_price,
                    amount=transferred_amount,
                    supplier_id=expense.supplier_id,
                    supplier_name=expense.supplier_name,
                    is_paid=expense.is_paid,
                    payment_date=expense.payment_date,
                    payment_method=expense.payment_method,
                    notes=f"Proportional split ({float(initial_qty_ratio)*100:.1f}%) from expense in lot {lot.code}",
                    from_split_lot_id=lot.id,
                    original_expense_id=expense.id,
                    recorded_by=current_user.id
                )
                db.add(new_expense)
                total_expenses_transferred += transferred_amount

                # Reduce original expense amount
                expense.amount = original_amount - transferred_amount
                expense.quantity = float(expense.quantity) * float(1 - initial_qty_ratio) if expense.quantity else None

    # Copy health events (vaccines, treatments) to the new lot
    # These are copied (not split) because all birds in the new lot received the same treatment
    from app.models.health import HealthEvent

    health_events = db.query(HealthEvent).filter(
        HealthEvent.lot_id == lot_id
    ).all()

    for event in health_events:
        # Create a copy of the health event for the new lot
        new_event = HealthEvent(
            lot_id=new_lot.id,
            inherited_from_lot_id=lot.id,
            original_event_id=event.id,
            date=event.date,
            event_type=event.event_type,
            product_name=event.product_name,
            manufacturer=event.manufacturer,
            batch_number=event.batch_number,
            expiry_date=event.expiry_date,
            route=event.route,
            dose=event.dose,
            duration_days=event.duration_days,
            target_disease=event.target_disease,
            withdrawal_days_meat=event.withdrawal_days_meat,
            withdrawal_days_eggs=event.withdrawal_days_eggs,
            withdrawal_end_date=event.withdrawal_end_date,
            veterinarian_name=event.veterinarian_name,
            veterinarian_phone=event.veterinarian_phone,
            cost=None,  # Cost stays with original lot
            reminder_date=event.reminder_date,
            reminder_note=event.reminder_note,
            document_url=event.document_url,
            notes=f"Inherited from lot {lot.code}. {event.notes or ''}".strip() if event.notes else f"Inherited from lot {lot.code}",
            recorded_by=current_user.id
        )
        db.add(new_event)

    logger.info(f"[SPLIT] Copied {len(health_events)} health events to new lot {new_lot.code}")

    # Copy lot-specific vaccination schedules to the new lot
    from app.models.health import VaccinationSchedule

    vaccination_schedules = db.query(VaccinationSchedule).filter(
        VaccinationSchedule.lot_id == lot_id
    ).all()

    for schedule in vaccination_schedules:
        new_schedule = VaccinationSchedule(
            lot_id=new_lot.id,
            breed=schedule.breed,
            lot_type=schedule.lot_type,
            vaccine_name=schedule.vaccine_name,
            target_disease=schedule.target_disease,
            day_from=schedule.day_from,
            day_to=schedule.day_to,
            route=schedule.route,
            dose=schedule.dose,
            is_mandatory=schedule.is_mandatory,
            notes=f"Inherited from lot {lot.code}. {schedule.notes or ''}".strip() if schedule.notes else f"Inherited from lot {lot.code}",
            program_id=schedule.program_id,
            is_system=False,  # User-copied, not system
            organization_id=schedule.organization_id
        )
        db.add(new_schedule)

    logger.info(f"[SPLIT] Copied {len(vaccination_schedules)} vaccination schedules to new lot {new_lot.code}")

    # Update original lot quantity
    original_remaining = lot.current_quantity - split_data.quantity
    lot.current_quantity = original_remaining

    # Add note to original lot
    split_note = f"\n[{date.today()}] Split: {split_data.quantity} birds transferred to lot {new_lot_code}"
    lot.notes = (lot.notes or '') + split_note

    db.commit()
    db.refresh(new_lot)
    db.refresh(lot)

    # Update stats for both lots
    update_lot_stats(db, lot_id)
    update_lot_stats(db, new_lot.id)

    logger.info(f"Lot {lot.code} split: {split_data.quantity} birds to new lot {new_lot_code}")

    return LotSplitResponse(
        original_lot_id=lot.id,
        original_lot_code=lot.code,
        original_lot_remaining_quantity=original_remaining,
        new_lot_id=new_lot.id,
        new_lot_code=new_lot_code,
        new_lot_quantity=split_data.quantity,
        split_ratio=split_ratio,
        expenses_transferred=total_expenses_transferred,
        message=f"Lot split successfully. {split_data.quantity} birds transferred to {new_lot_code}"
    )


@router.get("/{lot_id}/split-history")
async def get_lot_split_history(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the split history of a lot.
    Shows both parent lot (if this lot was split from another) and child lots (lots split from this one).
    """
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Verify access
    if lot.building:
        site = lot.building.site
        if str(site.organization_id) != str(current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    result = {
        'lot_id': str(lot_id),
        'lot_code': lot.code,
        'parent_lot': None,
        'child_lots': []
    }

    # Get parent lot info if exists
    if lot.parent_lot_id:
        parent = db.query(Lot).filter(Lot.id == lot.parent_lot_id, Lot.status != LotStatus.DELETED).first()
        if parent:
            result['parent_lot'] = {
                'id': str(parent.id),
                'code': parent.code,
                'name': parent.name,
                'split_date': lot.split_date.isoformat() if lot.split_date else None,
                'split_ratio': float(lot.split_ratio) if lot.split_ratio else None,
                'current_quantity': parent.current_quantity,
                'building_name': parent.building.name if parent.building else None
            }

    # Get child lots
    child_lots = db.query(Lot).filter(Lot.parent_lot_id == lot_id, Lot.status != LotStatus.DELETED).order_by(Lot.split_date.desc()).all()
    for child in child_lots:
        result['child_lots'].append({
            'id': str(child.id),
            'code': child.code,
            'name': child.name,
            'split_date': child.split_date.isoformat() if child.split_date else None,
            'split_ratio': float(child.split_ratio) if child.split_ratio else None,
            'initial_quantity': child.initial_quantity,
            'current_quantity': child.current_quantity,
            'building_name': child.building.name if child.building else None,
            'status': child.status.value if child.status else 'active'
        })

    return result
