from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.lot import Lot, LotStatus
from app.models.site import Site
from app.models.building import Building
from app.models.feed import FeedConsumption, WaterConsumption, FeedStock, FeedStockMovement, FeedType, StockMovementType
from app.schemas.feed import (
    FeedConsumptionCreate, FeedConsumptionResponse,
    WaterConsumptionCreate, WaterConsumptionResponse,
    FeedStockCreate, FeedStockUpdate, FeedStockResponse,
    FeedStockMovementCreate, FeedStockMovementResponse,
    RestockRequest
)

router = APIRouter()


def get_optimal_feed_consumption(age_days: int, lot_type: str = "broiler") -> int:
    """
    Calculate optimal feed consumption (g/bird/day) based on age and lot type.
    Based on Ross 308 performance objectives for broilers.
    """
    if lot_type == "layer":
        # Layers in production phase: ~110-120g/day
        if age_days < 126:  # Before 18 weeks (growing phase)
            if age_days <= 14:
                return 20
            elif age_days <= 28:
                return 35
            elif age_days <= 42:
                return 50
            elif age_days <= 56:
                return 60
            elif age_days <= 84:
                return 75
            else:
                return 90
        else:  # Production phase
            return 115
    else:
        # Broilers - Ross 308 standard
        if age_days <= 7:
            return 20  # 15-25g average
        elif age_days <= 14:
            return 45  # 35-55g average
        elif age_days <= 21:
            return 80  # 65-95g average
        elif age_days <= 28:
            return 115  # 100-135g average
        elif age_days <= 35:
            return 155  # 140-170g average
        elif age_days <= 42:
            return 178  # 165-190g average
        else:
            return 190  # 180-200g


def get_optimal_water_consumption(age_days: int, lot_type: str = "broiler") -> int:
    """
    Calculate optimal water consumption (ml/bird/day) based on age.
    Water is typically 1.8-2.1x feed consumption.
    """
    optimal_feed = get_optimal_feed_consumption(age_days, lot_type)
    return int(optimal_feed * 2.0)  # Water = ~2x feed


# Feed Consumption
@router.get("/consumption", response_model=List[FeedConsumptionResponse])
async def get_feed_consumptions(
    lot_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feed consumption records."""
    query = db.query(FeedConsumption).filter(FeedConsumption.lot_id == lot_id)

    if start_date:
        query = query.filter(FeedConsumption.date >= start_date)
    if end_date:
        query = query.filter(FeedConsumption.date <= end_date)

    records = query.order_by(FeedConsumption.created_at.desc()).all()
    return [FeedConsumptionResponse.model_validate(r) for r in records]


@router.post("/consumption", response_model=FeedConsumptionResponse)
async def create_feed_consumption(
    data: FeedConsumptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record feed consumption."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != "deleted").first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    record = FeedConsumption(**data.model_dump(), recorded_by=current_user.id)

    # Calculate total cost
    if data.quantity_kg and data.price_per_kg:
        record.total_cost = data.quantity_kg * data.price_per_kg

    # Calculate feed per bird
    bird_count = data.bird_count or lot.current_quantity
    if bird_count and bird_count > 0:
        record.feed_per_bird_g = (data.quantity_kg * 1000) / Decimal(bird_count)

    db.add(record)
    db.commit()
    db.refresh(record)

    return FeedConsumptionResponse.model_validate(record)


# Water Consumption
@router.get("/water", response_model=List[WaterConsumptionResponse])
async def get_water_consumptions(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get water consumption records."""
    records = db.query(WaterConsumption).filter(
        WaterConsumption.lot_id == lot_id
    ).order_by(WaterConsumption.created_at.desc()).all()

    return [WaterConsumptionResponse.model_validate(r) for r in records]


@router.post("/water", response_model=WaterConsumptionResponse)
async def create_water_consumption(
    data: WaterConsumptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record water consumption."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != "deleted").first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    record = WaterConsumption(**data.model_dump(), recorded_by=current_user.id)

    # Calculate water per bird
    bird_count = data.bird_count or lot.current_quantity
    if bird_count and bird_count > 0:
        record.water_per_bird_ml = (data.quantity_liters * 1000) / Decimal(bird_count)

    db.add(record)
    db.commit()
    db.refresh(record)

    return WaterConsumptionResponse.model_validate(record)


# Feed Stock - Enhanced endpoints
@router.get("/stock/all")
async def get_all_feed_stocks(
    location_type: Optional[str] = None,
    site_id: Optional[UUID] = None,
    building_id: Optional[UUID] = None,
    feed_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all feed stocks for the user's organization."""
    query = db.query(FeedStock).filter(
        FeedStock.organization_id == current_user.organization_id
    )

    if location_type:
        query = query.filter(FeedStock.location_type == location_type)
    if site_id:
        query = query.filter(FeedStock.site_id == site_id)
    if building_id:
        query = query.filter(FeedStock.building_id == building_id)
    if feed_type:
        query = query.filter(FeedStock.feed_type == feed_type)

    stocks = query.order_by(FeedStock.feed_type).all()

    # Enrich with site/building names
    result = []
    for stock in stocks:
        data = FeedStockResponse.model_validate(stock).model_dump()

        # Add names for display
        if stock.site_id:
            site = db.query(Site).filter(Site.id == stock.site_id, Site.is_active == True).first()
            data['site_name'] = site.name if site else None
        if stock.building_id:
            building = db.query(Building).filter(Building.id == stock.building_id, Building.is_active == True).first()
            data['building_name'] = building.name if building else None

        result.append(data)

    return result


@router.get("/stock", response_model=List[FeedStockResponse])
async def get_feed_stocks(
    site_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feed stock for a site or all organization stocks."""
    if site_id:
        stocks = db.query(FeedStock).filter(FeedStock.site_id == site_id).all()
    else:
        stocks = db.query(FeedStock).filter(
            FeedStock.organization_id == current_user.organization_id
        ).all()

    return [FeedStockResponse.model_validate(s) for s in stocks]


@router.post("/stock", response_model=FeedStockResponse)
async def create_feed_stock(
    data: FeedStockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create feed stock entry."""
    stock_data = data.model_dump()
    stock_data['organization_id'] = current_user.organization_id

    stock = FeedStock(**stock_data)
    db.add(stock)
    db.commit()
    db.refresh(stock)

    return FeedStockResponse.model_validate(stock)


@router.post("/stock/restock")
async def restock_feed(
    data: RestockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restock feed - create or update stock and record movement."""

    # Find or create stock entry
    query = db.query(FeedStock).filter(
        FeedStock.organization_id == current_user.organization_id,
        FeedStock.feed_type == data.feed_type,
        FeedStock.location_type == data.location_type
    )

    if data.location_type == 'site' and data.site_id:
        query = query.filter(FeedStock.site_id == data.site_id)
    elif data.location_type == 'building' and data.building_id:
        query = query.filter(FeedStock.building_id == data.building_id)
    elif data.location_type == 'global':
        query = query.filter(
            FeedStock.site_id.is_(None),
            FeedStock.building_id.is_(None)
        )

    stock = query.first()

    if stock:
        # Update existing stock
        stock.quantity_kg = Decimal(str(stock.quantity_kg or 0)) + Decimal(str(data.quantity_kg))
        if data.unit_price:
            stock.price_per_kg = data.unit_price
        stock.last_restock_date = date.today()
        if data.supplier_name:
            stock.supplier_name = data.supplier_name
    else:
        # Create new stock entry
        stock = FeedStock(
            organization_id=current_user.organization_id,
            site_id=data.site_id if data.location_type in ['site', 'building'] else None,
            building_id=data.building_id if data.location_type == 'building' else None,
            location_type=data.location_type,
            feed_type=data.feed_type,
            quantity_kg=data.quantity_kg,
            price_per_kg=data.unit_price,
            supplier_name=data.supplier_name,
            last_restock_date=date.today()
        )
        db.add(stock)
        db.flush()

    # Calculate total amount
    total_amount = None
    if data.quantity_kg and data.unit_price:
        total_amount = data.quantity_kg * data.unit_price

    # Record movement
    movement = FeedStockMovement(
        stock_id=stock.id,
        movement_type=StockMovementType.RESTOCK,
        quantity_kg=data.quantity_kg,
        supplier_name=data.supplier_name,
        invoice_number=data.invoice_number,
        unit_price=data.unit_price,
        total_amount=total_amount,
        notes=data.notes,
        recorded_by=current_user.id,
        date=date.today()
    )
    db.add(movement)
    db.commit()
    db.refresh(stock)
    db.refresh(movement)

    return {
        "stock": FeedStockResponse.model_validate(stock).model_dump(),
        "movement": FeedStockMovementResponse.model_validate(movement).model_dump(),
        "message": f"Stock de {data.feed_type} mis à jour: +{data.quantity_kg} kg"
    }


# Stock Stats - MUST be before {stock_id} routes
@router.get("/stock/stats")
async def get_stock_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get stock statistics - optimized with SQL aggregation."""
    from sqlalchemy import func, case

    org_id = current_user.organization_id

    # Get aggregate stock stats in a single query
    stock_stats = db.query(
        func.coalesce(func.sum(FeedStock.quantity_kg), 0).label('total_quantity'),
        func.coalesce(func.sum(FeedStock.quantity_kg * FeedStock.price_per_kg), 0).label('total_value'),
        func.count(FeedStock.id).label('stock_count'),
        func.sum(
            case(
                (FeedStock.quantity_kg <= FeedStock.min_quantity_kg, 1),
                else_=0
            )
        ).label('low_stock_count')
    ).filter(
        FeedStock.organization_id == org_id
    ).first()

    total_quantity = Decimal(str(stock_stats.total_quantity or 0))
    total_value = Decimal(str(stock_stats.total_value or 0))
    low_stock_count = int(stock_stats.low_stock_count or 0)
    stock_count = int(stock_stats.stock_count or 0)

    # Get consumption in last 7 days with SQL aggregation
    seven_days_ago = date.today() - timedelta(days=7)
    consumption_sum = db.query(
        func.coalesce(func.sum(FeedConsumption.quantity_kg), 0)
    ).filter(
        FeedConsumption.date >= seven_days_ago
    ).scalar()

    total_consumption_7d = Decimal(str(consumption_sum or 0))
    avg_daily_consumption = total_consumption_7d / Decimal(7) if total_consumption_7d else Decimal(0)

    # Days of autonomy
    days_autonomy = total_quantity / avg_daily_consumption if avg_daily_consumption > 0 else Decimal(0)

    # Stock by type using SQL GROUP BY
    by_type_query = db.query(
        FeedStock.feed_type,
        func.coalesce(func.sum(FeedStock.quantity_kg), 0).label('total')
    ).filter(
        FeedStock.organization_id == org_id
    ).group_by(FeedStock.feed_type).all()

    by_type = {
        (row.feed_type.value if row.feed_type else 'other'): float(round(Decimal(str(row.total)), 2))
        for row in by_type_query
    }

    return {
        "total_quantity_kg": float(round(total_quantity, 2)),
        "total_value": float(round(total_value, 2)),
        "low_stock_count": low_stock_count,
        "avg_daily_consumption": float(round(avg_daily_consumption, 2)),
        "days_autonomy": float(round(days_autonomy, 1)),
        "by_type": by_type,
        "stock_count": stock_count
    }


# Consumption trend - MUST be before {stock_id} routes
@router.get("/stock/consumption-trend")
async def get_consumption_trend(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get consumption trend by day - optimized with SQL GROUP BY."""
    from sqlalchemy import func

    start_date = date.today() - timedelta(days=days)

    # Get consumption grouped by date and type using SQL GROUP BY
    consumptions = db.query(
        FeedConsumption.date,
        FeedConsumption.feed_type,
        func.coalesce(func.sum(FeedConsumption.quantity_kg), 0).label('total_kg')
    ).filter(
        FeedConsumption.date >= start_date
    ).group_by(FeedConsumption.date, FeedConsumption.feed_type).all()

    # Build trend from aggregated data
    trend = {}
    for row in consumptions:
        d = row.date.strftime('%d %b')
        if d not in trend:
            trend[d] = {'date': d, 'starter': Decimal(0), 'grower': Decimal(0), 'finisher': Decimal(0), 'layer': Decimal(0)}
        feed_type = row.feed_type.value if row.feed_type else 'other'
        if feed_type in trend[d]:
            trend[d][feed_type] += Decimal(str(row.total_kg or 0))

    # Convert Decimals to float for JSON
    result = []
    for item in trend.values():
        result.append({
            'date': item['date'],
            'starter': float(round(item['starter'], 2)),
            'grower': float(round(item['grower'], 2)),
            'finisher': float(round(item['finisher'], 2)),
            'layer': float(round(item['layer'], 2))
        })
    return result


# Monitoring stats - aggregated feed and water data
@router.get("/monitoring/stats")
async def get_monitoring_stats(
    lot_id: Optional[UUID] = None,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get aggregated monitoring statistics for feed and water."""
    start_date = date.today() - timedelta(days=days)

    # Build base query filters
    feed_query = db.query(FeedConsumption).filter(FeedConsumption.date >= start_date)
    water_query = db.query(WaterConsumption).filter(WaterConsumption.date >= start_date)

    if lot_id:
        feed_query = feed_query.filter(FeedConsumption.lot_id == lot_id)
        water_query = water_query.filter(WaterConsumption.lot_id == lot_id)
    else:
        # Filter by organization's lots
        from app.models.building import Building
        lot_ids = db.query(Lot.id).join(Building).join(Site).filter(
            Site.organization_id == current_user.organization_id,
            Site.is_active == True,
            Building.is_active == True,
            Lot.status != "deleted"
        ).all()
        lot_ids = [l[0] for l in lot_ids]
        feed_query = feed_query.filter(FeedConsumption.lot_id.in_(lot_ids))
        water_query = water_query.filter(WaterConsumption.lot_id.in_(lot_ids))

    feed_records = feed_query.all()
    water_records = water_query.all()

    # Calculate totals
    total_feed_kg = sum((Decimal(str(f.quantity_kg)) if f.quantity_kg else Decimal(0)) for f in feed_records)
    total_water_liters = sum((Decimal(str(w.quantity_liters)) if w.quantity_liters else Decimal(0)) for w in water_records)

    # Count actual days with data (not just the period parameter)
    feed_dates = set(f.date for f in feed_records if f.quantity_kg)
    water_dates = set(w.date for w in water_records if w.quantity_liters)
    actual_feed_days = len(feed_dates) if feed_dates else 1
    actual_water_days = len(water_dates) if water_dates else 1

    # Average per day - use actual days with data, not the period parameter
    avg_feed_per_day = total_feed_kg / Decimal(actual_feed_days) if actual_feed_days > 0 else Decimal(0)
    avg_water_per_day = total_water_liters / Decimal(actual_water_days) if actual_water_days > 0 else Decimal(0)

    # Get total active birds and lot info for optimal calculation
    lot_age = None
    lot_type = "broiler"
    if lot_id:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != "deleted").first()
        total_birds = lot.current_quantity or 0 if lot else 0
        if lot:
            lot_age = lot.age_days
            lot_type = lot.type.value if lot.type else "broiler"
    else:
        from app.models.building import Building
        active_lots = db.query(Lot).join(Building).join(Site).filter(
            Site.organization_id == current_user.organization_id,
            Site.is_active == True,
            Building.is_active == True,
            Lot.status == LotStatus.ACTIVE
        ).all()
        total_birds = sum(l.current_quantity or 0 for l in active_lots)
        # For multiple lots, use average age (weighted by bird count)
        if active_lots:
            total_weight = sum(l.current_quantity or 0 for l in active_lots)
            if total_weight > 0:
                lot_age = sum((l.age_days or 0) * (l.current_quantity or 0) for l in active_lots) // total_weight
            # Use broiler if any broiler lot exists, otherwise layer
            lot_type = "broiler" if any(l.type and l.type.value == "broiler" for l in active_lots) else "layer"

    # Calculate optimal consumption based on age
    # Note: lot_age can be 0 which is valid, so use "is not None" instead of truthy check
    if lot_age is not None:
        optimal_feed_g = get_optimal_feed_consumption(lot_age, lot_type)
        optimal_water_ml = get_optimal_water_consumption(lot_age, lot_type)
    else:
        # Default fallback when no lot age is available
        optimal_feed_g = 138
        optimal_water_ml = 276

    # Per bird calculations
    daily_feed_per_bird_g = (avg_feed_per_day * 1000 / Decimal(total_birds)) if total_birds > 0 else Decimal(0)
    daily_water_per_bird_ml = (avg_water_per_day * 1000 / Decimal(total_birds)) if total_birds > 0 else Decimal(0)

    # Water/Feed ratio
    water_feed_ratio = (total_water_liters / total_feed_kg) if total_feed_kg > 0 else Decimal(0)

    # Build daily trend
    daily_trend = {}
    day_labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

    for f in feed_records:
        d = f.date.strftime('%d/%m')
        day_name = day_labels[f.date.weekday()]
        key = f"{day_name}"
        if key not in daily_trend:
            daily_trend[key] = {'day': day_name, 'date': d, 'feed_kg': Decimal(0), 'water_liters': Decimal(0), 'feed_g_bird': Decimal(0), 'water_ml_bird': Decimal(0)}
        daily_trend[key]['feed_kg'] += Decimal(str(f.quantity_kg or 0))
        if f.feed_per_bird_g:
            daily_trend[key]['feed_g_bird'] = Decimal(str(f.feed_per_bird_g))

    for w in water_records:
        d = w.date.strftime('%d/%m')
        day_name = day_labels[w.date.weekday()]
        key = f"{day_name}"
        if key not in daily_trend:
            daily_trend[key] = {'day': day_name, 'date': d, 'feed_kg': Decimal(0), 'water_liters': Decimal(0), 'feed_g_bird': Decimal(0), 'water_ml_bird': Decimal(0)}
        daily_trend[key]['water_liters'] += Decimal(str(w.quantity_liters or 0))
        if w.water_per_bird_ml:
            daily_trend[key]['water_ml_bird'] = Decimal(str(w.water_per_bird_ml))

    # Calculate ratio for each day
    for key in daily_trend:
        if daily_trend[key]['feed_kg'] > 0:
            daily_trend[key]['ratio'] = daily_trend[key]['water_liters'] / daily_trend[key]['feed_kg']
        else:
            daily_trend[key]['ratio'] = Decimal(0)

    # Get stock stats
    stocks = db.query(FeedStock).filter(
        FeedStock.organization_id == current_user.organization_id
    ).all()

    total_stock_kg = sum((Decimal(str(s.quantity_kg)) if s.quantity_kg else Decimal(0)) for s in stocks)
    stock_by_type = {}
    for s in stocks:
        t = s.feed_type.value if s.feed_type else 'other'
        if t not in stock_by_type:
            stock_by_type[t] = {'stock_kg': Decimal(0), 'name': t.capitalize()}
        stock_by_type[t]['stock_kg'] += Decimal(str(s.quantity_kg or 0))

    # Days of autonomy
    days_autonomy = total_stock_kg / avg_feed_per_day if avg_feed_per_day > 0 else Decimal(0)

    # Convert daily_trend Decimals to float and add optimal values
    daily_trend_list = []
    for item in daily_trend.values():
        daily_trend_list.append({
            'day': item['day'],
            'date': item['date'],
            'feed_kg': float(round(item['feed_kg'], 2)),
            'water_liters': float(round(item['water_liters'], 2)),
            'feed_g_bird': float(round(item['feed_g_bird'], 1)),
            'water_ml_bird': float(round(item['water_ml_bird'], 1)),
            'ratio': float(round(item['ratio'], 2)),
            'optimal_feed_g': optimal_feed_g,
            'optimal_water_ml': optimal_water_ml
        })

    # Convert stock_by_type Decimals to float
    stock_by_type_list = [{'stock_kg': float(round(v['stock_kg'], 2)), 'name': v['name']} for v in stock_by_type.values()]

    return {
        "summary": {
            "total_birds": total_birds,
            "period_days": days,
            "actual_feed_days": actual_feed_days,
            "actual_water_days": actual_water_days,
            "lot_age_days": lot_age,
            "lot_type": lot_type,
            "total_feed_kg": float(round(total_feed_kg, 2)),
            "total_water_liters": float(round(total_water_liters, 2)),
            "avg_feed_per_day_kg": float(round(avg_feed_per_day, 2)),
            "avg_water_per_day_liters": float(round(avg_water_per_day, 2)),
            "daily_feed_per_bird_g": float(round(daily_feed_per_bird_g, 1)),
            "daily_water_per_bird_ml": float(round(daily_water_per_bird_ml, 1)),
            "optimal_feed_g": optimal_feed_g,
            "optimal_water_ml": optimal_water_ml,
            "water_feed_ratio": float(round(water_feed_ratio, 2)),
            "optimal_ratio": {"min": 1.8, "max": 2.1},
            "total_stock_kg": float(round(total_stock_kg, 2)),
            "days_autonomy": float(round(days_autonomy, 1))
        },
        "daily_trend": daily_trend_list,
        "stock_by_type": stock_by_type_list
    }


# Stock Movements - MUST be before {stock_id} routes
@router.get("/stock/movements/all")
async def get_all_stock_movements(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    movement_type: Optional[str] = None,
    feed_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get stock movement history."""
    query = db.query(FeedStockMovement).join(FeedStock).filter(
        FeedStock.organization_id == current_user.organization_id
    )

    if start_date:
        query = query.filter(FeedStockMovement.date >= start_date)
    if end_date:
        query = query.filter(FeedStockMovement.date <= end_date)
    if movement_type:
        query = query.filter(FeedStockMovement.movement_type == movement_type)
    if feed_type:
        query = query.filter(FeedStock.feed_type == feed_type)

    movements = query.order_by(FeedStockMovement.created_at.desc()).limit(limit).all()

    result = []
    for m in movements:
        data = FeedStockMovementResponse.model_validate(m).model_dump()
        data['feed_type'] = m.stock.feed_type.value if m.stock else None
        if m.lot_id:
            lot = db.query(Lot).filter(Lot.id == m.lot_id, Lot.status != "deleted").first()
            data['lot_code'] = lot.code if lot else None
        result.append(data)

    return result


# Dynamic routes with {stock_id} - MUST be after static routes
@router.get("/stock/{stock_id}", response_model=FeedStockResponse)
async def get_feed_stock(
    stock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific feed stock."""
    stock = db.query(FeedStock).filter(FeedStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    return FeedStockResponse.model_validate(stock)


@router.patch("/stock/{stock_id}", response_model=FeedStockResponse)
async def update_feed_stock(
    stock_id: UUID,
    data: FeedStockUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update feed stock."""
    stock = db.query(FeedStock).filter(FeedStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(stock, field, value)

    db.commit()
    db.refresh(stock)

    return FeedStockResponse.model_validate(stock)


@router.delete("/stock/{stock_id}")
async def delete_feed_stock(
    stock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a feed stock entry."""
    stock = db.query(FeedStock).filter(FeedStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    db.delete(stock)
    db.commit()

    return {"message": "Stock deleted"}


@router.get("/stock/{stock_id}/movements")
async def get_stock_movements(
    stock_id: UUID,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get movements for a specific stock."""
    movements = db.query(FeedStockMovement).filter(
        FeedStockMovement.stock_id == stock_id
    ).order_by(FeedStockMovement.created_at.desc()).limit(limit).all()

    return [FeedStockMovementResponse.model_validate(m).model_dump() for m in movements]
