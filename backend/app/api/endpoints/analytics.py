from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.lot import Lot, LotStats, LotStatus
from app.models.production import EggProduction, WeightRecord, Mortality
from app.models.feed import FeedConsumption
from app.models.finance import Sale, Expense
from app.schemas.finance import FinancialSummary, LotProfitability
from app.services.financial_service import get_financial_service

router = APIRouter()


@router.get("/lot/{lot_id}/performance")
async def get_lot_performance(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive performance data for a lot."""
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Get all data
    mortalities = db.query(Mortality).filter(Mortality.lot_id == lot_id).all()
    feed = db.query(FeedConsumption).filter(FeedConsumption.lot_id == lot_id).all()
    weights = db.query(WeightRecord).filter(WeightRecord.lot_id == lot_id).order_by(WeightRecord.date).all()
    eggs = db.query(EggProduction).filter(EggProduction.lot_id == lot_id).order_by(EggProduction.date).all()
    sales = db.query(Sale).filter(Sale.lot_id == lot_id).all()
    expenses = db.query(Expense).filter(Expense.lot_id == lot_id).all()

    # Calculate metrics
    total_mortality = sum(m.quantity for m in mortalities)
    mortality_rate = (total_mortality / lot.initial_quantity * 100) if lot.initial_quantity else 0

    total_feed_kg = sum((Decimal(str(f.quantity_kg)) if f.quantity_kg else Decimal(0)) for f in feed)
    total_eggs = sum(e.total_eggs for e in eggs) if eggs else 0

    total_sales = sum((Decimal(str(s.total_amount)) if s.total_amount else Decimal(0)) for s in sales)
    total_expenses = sum((Decimal(str(e.amount)) if e.amount else Decimal(0)) for e in expenses)

    # Initial costs
    initial_cost = Decimal(0)
    if lot.chick_price_unit and lot.initial_quantity:
        initial_cost += Decimal(str(lot.chick_price_unit)) * lot.initial_quantity
    if lot.transport_cost:
        initial_cost += Decimal(str(lot.transport_cost))

    total_cost = total_expenses + initial_cost

    # Weight progression for broilers
    weight_data = [
        {"date": w.date.isoformat(), "weight": float(round(Decimal(str(w.average_weight_g)), 2)), "age_days": w.age_days}
        for w in weights
    ]

    # Egg production for layers
    egg_data = [
        {"date": e.date.isoformat(), "total": e.total_eggs, "rate": float(round(Decimal(str(e.laying_rate or 0)), 2))}
        for e in eggs
    ]

    # Feed conversion ratio (for broilers)
    fcr = None
    if lot.type == "broiler" and weights and total_feed_kg > 0:
        latest_weight = weights[-1].average_weight_g if weights else Decimal(0)
        total_weight_gain_kg = (Decimal(str(latest_weight)) * (lot.current_quantity or 0)) / 1000
        if total_weight_gain_kg > 0:
            fcr = float(total_feed_kg / total_weight_gain_kg)

    # Average laying rate (for layers)
    avg_laying_rate = None
    if lot.type == "layer" and eggs:
        rates = [Decimal(str(e.laying_rate)) for e in eggs if e.laying_rate]
        if rates:
            avg_laying_rate = float(sum(rates) / len(rates))

    return {
        "lot": {
            "id": str(lot.id),
            "code": lot.code,
            "type": lot.type,
            "breed": lot.breed,
            "initial_quantity": lot.initial_quantity,
            "current_quantity": lot.current_quantity,
            "age_days": lot.age_days,
            "status": lot.status
        },
        "mortality": {
            "total": total_mortality,
            "rate": round(mortality_rate, 2),
            "by_cause": {}  # TODO: Group by cause
        },
        "feed": {
            "total_kg": float(round(total_feed_kg, 2)),
            "fcr": round(fcr, 2) if fcr else None
        },
        "production": {
            "total_eggs": total_eggs,
            "average_laying_rate": round(avg_laying_rate, 2) if avg_laying_rate else None,
            "eggs_per_hen": float(round(Decimal(total_eggs) / lot.initial_quantity, 2)) if lot.initial_quantity else 0
        },
        "financial": {
            "total_sales": float(round(total_sales, 2)),
            "total_expenses": float(round(total_cost, 2)),
            "gross_margin": float(round(total_sales - total_cost, 2)),
            "cost_per_bird": float(round(total_cost / lot.initial_quantity, 2)) if lot.initial_quantity else 0
        },
        "charts": {
            "weight_progression": weight_data,
            "egg_production": egg_data
        }
    }


@router.get("/site/{site_id}/summary")
async def get_site_summary(
    site_id: UUID,
    period_days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary statistics for a site using optimized queries."""
    from app.models.site import Site
    from app.models.building import Building

    site = db.query(Site).filter(Site.id == site_id, Site.is_active == True).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    start_date = date.today() - timedelta(days=period_days)

    # Get all active lots for this site
    lots = db.query(Lot).join(Building).filter(
        Building.site_id == site_id,
        Building.is_active == True,
        Lot.status == LotStatus.ACTIVE
    ).all()

    lot_ids = [lot.id for lot in lots]

    # Aggregate data
    total_birds = sum(lot.current_quantity or 0 for lot in lots)

    # Eggs in period
    total_eggs = db.query(func.sum(EggProduction.total_eggs)).filter(
        EggProduction.lot_id.in_(lot_ids),
        EggProduction.date >= start_date
    ).scalar() or 0 if lot_ids else 0

    # Mortality in period
    total_mortality = db.query(func.sum(Mortality.quantity)).filter(
        Mortality.lot_id.in_(lot_ids),
        Mortality.date >= start_date
    ).scalar() or 0 if lot_ids else 0

    # Use centralized financial service for optimized calculations
    financial_service = get_financial_service(db)
    financial_summary = financial_service.get_site_financial_summary(
        site_id=site_id,
        lot_ids=lot_ids,
        start_date=start_date
    )

    return {
        "site_id": str(site_id),
        "site_name": site.name,
        "period_days": period_days,
        "summary": {
            "active_lots": len(lots),
            "total_birds": total_birds,
            "total_eggs": total_eggs,
            "total_mortality": total_mortality,
            "total_sales": float(round(financial_summary['total_sales'], 2)),
            "total_expenses": float(round(financial_summary['total_expenses'], 2)),
            "gross_margin": float(round(financial_summary['gross_margin'], 2))
        },
        "lots": [
            {
                "id": str(lot.id),
                "code": lot.code,
                "type": lot.type,
                "current_quantity": lot.current_quantity,
                "age_days": lot.age_days
            }
            for lot in lots
        ]
    }


@router.get("/comparison")
async def compare_lots(
    lot_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compare performance between multiple lots."""
    comparisons = []

    for lot_id in lot_ids:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
        if not lot:
            continue

        stats = lot.stats

        comparisons.append({
            "lot_id": str(lot.id),
            "code": lot.code,
            "type": lot.type,
            "breed": lot.breed,
            "initial_quantity": lot.initial_quantity,
            "age_days": lot.age_days,
            "mortality_rate": round(float(stats.mortality_rate), 2) if stats else 0,
            "fcr": round(float(stats.feed_conversion_ratio), 2) if stats and stats.feed_conversion_ratio else None,
            "laying_rate": round(float(stats.average_laying_rate), 2) if stats else 0,
            "gross_margin": round(float(stats.gross_margin), 2) if stats else 0,
            "performance_score": round(float(stats.performance_score), 2) if stats and stats.performance_score else None
        })

    return {"lots": comparisons}
