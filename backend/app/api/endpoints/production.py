from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.lot import Lot, LotStatus
from app.models.production import EggProduction, WeightRecord, Mortality
from app.schemas.production import (
    EggProductionCreate, EggProductionResponse,
    WeightRecordCreate, WeightRecordResponse,
    MortalityCreate, MortalityResponse
)
from app.services.laying_curve import (
    get_laying_phase, get_phase_label, get_expected_laying_rate,
    analyze_laying_performance, get_full_laying_curve,
    estimate_peak_date, get_feed_recommendation_by_phase,
    get_age_weeks, LayingPhase
)

router = APIRouter()


# Egg Production
@router.get("/eggs", response_model=List[EggProductionResponse])
async def get_egg_productions(
    lot_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get egg production records. If lot_id is not provided, returns all lots."""
    query = db.query(EggProduction).options(joinedload(EggProduction.lot))

    # Filter out records without lot_id (building-mode records) and exclude deleted lots
    query = query.join(Lot).filter(
        EggProduction.lot_id.isnot(None),
        Lot.status != LotStatus.DELETED
    )

    if lot_id:
        query = query.filter(EggProduction.lot_id == lot_id)

    if start_date:
        query = query.filter(EggProduction.date >= start_date)
    if end_date:
        query = query.filter(EggProduction.date <= end_date)

    productions = query.order_by(EggProduction.created_at.desc()).limit(500).all()
    return [EggProductionResponse.model_validate(p) for p in productions]


@router.post("/eggs", response_model=EggProductionResponse)
async def create_egg_production(
    data: EggProductionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record egg production."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Check for duplicate date
    existing = db.query(EggProduction).filter(
        EggProduction.lot_id == data.lot_id,
        EggProduction.date == data.date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Production already recorded for this date")

    production = EggProduction(**data.model_dump(), recorded_by=current_user.id)
    production.calculate_totals()

    # Calculate laying rate
    if data.hen_count and data.hen_count > 0:
        production.laying_rate = (production.total_eggs / data.hen_count) * 100

    db.add(production)
    db.commit()
    db.refresh(production)

    return EggProductionResponse.model_validate(production)


# Weight Records
@router.get("/weights", response_model=List[WeightRecordResponse])
async def get_weight_records(
    lot_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weight records. If lot_id is not provided, returns all lots."""
    query = db.query(WeightRecord).options(joinedload(WeightRecord.lot))

    # Filter out records without lot_id (building-mode records) and exclude deleted lots
    query = query.join(Lot).filter(
        WeightRecord.lot_id.isnot(None),
        Lot.status != LotStatus.DELETED
    )

    if lot_id:
        query = query.filter(WeightRecord.lot_id == lot_id)

    if start_date:
        query = query.filter(WeightRecord.date >= start_date)
    if end_date:
        query = query.filter(WeightRecord.date <= end_date)

    records = query.order_by(WeightRecord.created_at.desc()).limit(500).all()
    return [WeightRecordResponse.model_validate(r) for r in records]


@router.post("/weights", response_model=WeightRecordResponse)
async def create_weight_record(
    data: WeightRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record weight measurement."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    record = WeightRecord(**data.model_dump(), recorded_by=current_user.id)

    # Calculate age in days
    if lot.placement_date:
        record.age_days = (data.date - lot.placement_date).days + lot.age_at_placement

    # Calculate uniformity (CV%)
    if data.std_deviation and data.average_weight_g:
        record.uniformity_cv = (Decimal(str(data.std_deviation)) / Decimal(str(data.average_weight_g))) * 100

    db.add(record)
    db.commit()
    db.refresh(record)

    return WeightRecordResponse.model_validate(record)


# Mortality
@router.get("/mortalities", response_model=List[MortalityResponse])
async def get_mortalities(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mortality records for a lot."""
    # Verify lot exists and isn't deleted
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    records = db.query(Mortality).filter(
        Mortality.lot_id == lot_id
    ).order_by(Mortality.created_at.desc()).all()

    return [MortalityResponse.model_validate(r) for r in records]


@router.post("/mortalities", response_model=MortalityResponse)
async def create_mortality(
    data: MortalityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record mortality."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    record = Mortality(**data.model_dump(), recorded_by=current_user.id)
    db.add(record)

    # Update lot current quantity
    lot.current_quantity = (lot.current_quantity or lot.initial_quantity) - data.quantity

    db.commit()
    db.refresh(record)

    return MortalityResponse.model_validate(record)


# Laying Curve Analysis
@router.get("/laying-curve/standard")
async def get_standard_laying_curve(
    current_user: User = Depends(get_current_user)
):
    """Get the standard laying curve for charting (week 16-72)."""
    return {
        "curve": get_full_laying_curve(),
        "description": "Courbe de ponte standard basee sur les souches commerciales (ISA Brown, Lohmann, etc.)"
    }


@router.get("/laying-curve/analysis/{lot_id}")
async def analyze_lot_laying_performance(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get laying performance analysis for a layer lot."""
    lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    if lot.type != "layer":
        raise HTTPException(status_code=400, detail="This analysis is only for layer lots")

    age_days = lot.age_days or 0
    age_weeks = get_age_weeks(age_days)

    # Get current phase
    phase = get_laying_phase(age_weeks)
    expected = get_expected_laying_rate(age_weeks)

    # Get recent laying data (last 7 days)
    week_ago = date.today() - timedelta(days=7)
    recent_eggs = db.query(EggProduction).filter(
        EggProduction.lot_id == lot_id,
        EggProduction.date >= week_ago
    ).order_by(EggProduction.created_at.desc()).all()

    # Calculate current average laying rate
    if recent_eggs:
        avg_laying_rate = float(sum((Decimal(str(e.laying_rate)) if e.laying_rate else Decimal(0)) for e in recent_eggs) / len(recent_eggs))
    else:
        avg_laying_rate = 0

    # Get laying history for chart
    all_eggs = db.query(EggProduction).filter(
        EggProduction.lot_id == lot_id
    ).order_by(EggProduction.date).all()

    laying_history = []
    for e in all_eggs:
        if lot.placement_date:
            egg_age_days = (e.date - lot.placement_date).days + lot.age_at_placement
            egg_age_weeks = egg_age_days // 7
        else:
            egg_age_weeks = 0

        # Get expected for this week
        exp = get_expected_laying_rate(egg_age_weeks)

        laying_history.append({
            "date": e.date.isoformat(),
            "age_weeks": egg_age_weeks,
            "actual_rate": float(round(Decimal(str(e.laying_rate or 0)), 2)),
            "expected_min": exp["min_expected"],
            "expected_max": exp["max_expected"],
            "expected_optimal": exp["optimal_expected"],
            "total_eggs": e.total_eggs
        })

    # Perform analysis
    analysis = analyze_laying_performance(age_days, avg_laying_rate)

    # Get feed recommendation and format as string
    feed_rec_data = get_feed_recommendation_by_phase(phase)
    feed_rec = f"{feed_rec_data['feed_type_label']} - {feed_rec_data['note']}"

    # Estimate peak date if not yet reached
    peak_info = None
    if lot.placement_date and phase in [LayingPhase.PRE_LAY, LayingPhase.ONSET, LayingPhase.RISING]:
        peak_info = estimate_peak_date(lot.placement_date, lot.age_at_placement or 1)
        peak_info = {
            "onset_date": peak_info["onset_date"].isoformat(),
            "peak_start_date": peak_info["peak_start_date"].isoformat(),
            "peak_end_date": peak_info["peak_end_date"].isoformat(),
            "weeks_to_onset": peak_info["weeks_to_onset"],
            "weeks_to_peak": peak_info["weeks_to_peak"]
        }

    # Detect if peak was reached (find max laying rate)
    peak_rate = Decimal(0)
    peak_date_found = None
    peak_age_weeks = None
    for e in all_eggs:
        rate = Decimal(str(e.laying_rate or 0))
        if rate > peak_rate:
            peak_rate = rate
            peak_date_found = e.date
            if lot.placement_date:
                peak_age_weeks = ((e.date - lot.placement_date).days + lot.age_at_placement) // 7
    peak_rate = float(peak_rate)

    return {
        "lot": {
            "id": str(lot.id),
            "code": lot.code,
            "type": lot.type,
            "breed": lot.breed,
            "age_days": age_days,
            "age_weeks": age_weeks,
            "current_quantity": lot.current_quantity,
            "placement_date": lot.placement_date.isoformat() if lot.placement_date else None
        },
        "current_phase": {
            "phase": phase.value,
            "label": get_phase_label(phase),
            "description": _get_phase_description(phase)
        },
        "expected_rate": expected,
        "actual_rate": round(avg_laying_rate, 1),
        "analysis": analysis,
        "peak_info": {
            "peak_rate_achieved": round(peak_rate, 1),
            "peak_date": peak_date_found.isoformat() if peak_date_found else None,
            "peak_age_weeks": peak_age_weeks,
            "prediction": peak_info
        },
        "feed_recommendation": feed_rec,
        "laying_history": laying_history[-60:],  # Last 60 records
        "alerts": _generate_laying_alerts(phase, avg_laying_rate, expected, age_weeks, peak_rate)
    }


def _get_phase_description(phase: LayingPhase) -> str:
    """Get description for each laying phase."""
    descriptions = {
        LayingPhase.PRE_LAY: "Periode de croissance avant la premiere ponte. Preparez l'aliment pondeuse et le programme lumineux.",
        LayingPhase.ONSET: "Les premieres oeufs apparaissent. La production va augmenter rapidement dans les prochaines semaines.",
        LayingPhase.RISING: "Phase de montee en ponte. La production augmente vers le pic. Phase critique pour l'alimentation.",
        LayingPhase.PEAK: "Pic de production atteint. Maintenir les conditions optimales pour maximiser les performances.",
        LayingPhase.POST_PEAK: "La production decline progressivement. Ajuster l'alimentation selon les performances.",
        LayingPhase.END_OF_CYCLE: "Fin du cycle de ponte. Envisager la reforme ou la mue forcee selon la rentabilite."
    }
    return descriptions.get(phase, "")


def _generate_laying_alerts(phase: LayingPhase, actual_rate: float, expected: dict, age_weeks: int, peak_rate: float) -> list:
    """Generate alerts based on laying performance."""
    alerts = []

    # Pre-lay alerts
    if phase == LayingPhase.PRE_LAY:
        if age_weeks >= 16:
            alerts.append({
                "type": "info",
                "title": "Preparation ponte",
                "message": f"La ponte devrait debuter dans {18 - age_weeks} semaines. Verifiez le programme lumineux (stimulation a partir de 17 semaines)."
            })

    # Onset alerts
    elif phase == LayingPhase.ONSET:
        if actual_rate < 5 and age_weeks >= 19:
            alerts.append({
                "type": "warning",
                "title": "Debut de ponte tardif",
                "message": "La ponte semble demarrer tard. Verifiez l'eclairage (16h/jour) et l'alimentation."
            })

    # Rising phase alerts
    elif phase == LayingPhase.RISING:
        if actual_rate < expected["min_expected"]:
            alerts.append({
                "type": "warning",
                "title": "Montee en ponte lente",
                "message": f"Taux actuel ({actual_rate:.0f}%) inferieur au minimum attendu ({expected['min_expected']:.0f}%). Verifiez stress, alimentation, maladies."
            })

    # Peak alerts
    elif phase == LayingPhase.PEAK:
        if actual_rate < expected["min_expected"]:
            alerts.append({
                "type": "alert",
                "title": "Pic de ponte faible",
                "message": f"Le taux de ponte ({actual_rate:.0f}%) est sous les standards ({expected['min_expected']:.0f}%-{expected['max_expected']:.0f}%). Consultez un veterinaire."
            })
        if peak_rate < 85 and age_weeks >= 28:
            alerts.append({
                "type": "warning",
                "title": "Pic non atteint",
                "message": f"Le pic maximum enregistre ({peak_rate:.0f}%) est inferieur a 85%. Analysez les causes."
            })

    # Post-peak alerts
    elif phase == LayingPhase.POST_PEAK:
        # Check for rapid decline
        if actual_rate < expected["min_expected"]:
            alerts.append({
                "type": "warning",
                "title": "Declin rapide",
                "message": "La production decline plus vite que la normale. Verifiez la sante du troupeau."
            })

    # End of cycle
    elif phase == LayingPhase.END_OF_CYCLE:
        if actual_rate < 50:
            alerts.append({
                "type": "info",
                "title": "Fin de cycle",
                "message": "Production faible en fin de cycle. Evaluez la rentabilite vs reforme."
            })

    return alerts

