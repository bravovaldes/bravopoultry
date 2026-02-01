from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date, timedelta
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.building import Building
from app.models.lot import Lot, LotType, LotStatus
from app.models.production import EggProduction, Mortality, WeightRecord
from app.models.finance import Sale, Expense, SaleType
from app.models.alert import Alert, AlertStatus
from app.services.financial_service import get_financial_service

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get main dashboard overview data."""
    org_id = current_user.organization_id

    # Get sites
    sites = db.query(Site).filter(
        Site.organization_id == org_id,
        Site.is_active == True
    ).all()

    site_ids = [s.id for s in sites]

    # Get active lots (including lots without buildings)
    active_lots = db.query(Lot).outerjoin(Building).outerjoin(Site).filter(
        or_(
            Building.site_id.in_(site_ids),
            Lot.building_id.is_(None)
        ),
        or_(Building.is_active == True, Lot.building_id.is_(None)),
        Lot.status == LotStatus.ACTIVE
    ).all()

    lot_ids = [lot.id for lot in active_lots]

    # Calculate totals
    total_birds = sum(lot.current_quantity or 0 for lot in active_lots)
    broiler_lots_list = [l for l in active_lots if l.type == LotType.BROILER]
    layer_lots = [l for l in active_lots if l.type == LotType.LAYER]
    broiler_birds = sum(lot.current_quantity or 0 for lot in broiler_lots_list)
    layer_birds = sum(lot.current_quantity or 0 for lot in layer_lots)

    # Broiler-specific metrics - OPTIMIZED: batch fetch all data upfront
    broiler_lot_ids = [lot.id for lot in broiler_lots_list]

    # Batch fetch latest weights using subquery for max date per lot
    from sqlalchemy import and_
    latest_weights_map = {}
    if broiler_lot_ids:
        # Subquery to get max date per lot
        max_date_subq = db.query(
            WeightRecord.lot_id,
            func.max(WeightRecord.date).label('max_date')
        ).filter(
            WeightRecord.lot_id.in_(broiler_lot_ids)
        ).group_by(WeightRecord.lot_id).subquery()

        # Get weight records matching the max date for each lot
        latest_weights = db.query(WeightRecord).join(
            max_date_subq,
            and_(
                WeightRecord.lot_id == max_date_subq.c.lot_id,
                WeightRecord.date == max_date_subq.c.max_date
            )
        ).all()
        latest_weights_map = {w.lot_id: w for w in latest_weights}

    # Batch fetch sales aggregated by lot
    sales_map = {}
    if broiler_lot_ids:
        sales_query = db.query(
            Sale.lot_id,
            func.sum(Sale.quantity).label('total_quantity'),
            func.sum(Sale.total_amount).label('total_amount')
        ).filter(
            Sale.lot_id.in_(broiler_lot_ids),
            Sale.sale_type.in_([SaleType.LIVE_BIRDS, SaleType.DRESSED_BIRDS, SaleType.CULLED_HENS])
        ).group_by(Sale.lot_id).all()
        sales_map = {
            row.lot_id: {'quantity': int(row.total_quantity or 0), 'amount': float(row.total_amount or 0)}
            for row in sales_query
        }

    # Batch fetch mortality aggregated by lot
    mortality_map = {}
    if broiler_lot_ids:
        mortality_query = db.query(
            Mortality.lot_id,
            func.sum(Mortality.quantity).label('total')
        ).filter(
            Mortality.lot_id.in_(broiler_lot_ids)
        ).group_by(Mortality.lot_id).all()
        mortality_map = {row.lot_id: int(row.total or 0) for row in mortality_query}

    # Build broiler data using pre-fetched maps
    broiler_data = []
    for lot in broiler_lots_list:
        latest_weight = latest_weights_map.get(lot.id)
        current_weight = round(float(latest_weight.average_weight_g), 2) if latest_weight else 0
        target_weight = round(float(lot.target_weight_g or 2500), 2)
        age_days = lot.age_days or 0

        # Calculate GMQ (daily weight gain)
        gmq = current_weight / age_days if age_days > 0 else 0

        # Estimate days to target weight
        if gmq > 0 and current_weight < target_weight:
            days_to_target = int((target_weight - current_weight) / gmq)
            estimated_sale_date = (date.today() + timedelta(days=days_to_target)).isoformat()
        else:
            days_to_target = 0
            estimated_sale_date = None

        # Progress percentage
        progress = min(100, int((current_weight / target_weight) * 100)) if target_weight > 0 else 0

        # Check if ready for sale (>= 90% of target)
        ready_for_sale = progress >= 90

        # Get pre-fetched sales and mortality data
        sales_data = sales_map.get(lot.id, {'quantity': 0, 'amount': 0})
        lot_mortality = mortality_map.get(lot.id, 0)

        broiler_data.append({
            "lot_id": str(lot.id),
            "lot_code": lot.code or lot.name,
            "age_days": age_days,
            "current_weight_g": current_weight,
            "target_weight_g": target_weight,
            "gmq": round(gmq, 1),
            "progress_percent": progress,
            "days_to_target": days_to_target,
            "estimated_sale_date": estimated_sale_date,
            "ready_for_sale": ready_for_sale,
            "initial_quantity": lot.initial_quantity or 0,
            "quantity": lot.current_quantity or 0,
            "sold": sales_data['quantity'],
            "mortality": lot_mortality,
            "sales_amount": sales_data['amount']
        })

    # Today's data
    today = date.today()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Today's eggs
    today_eggs = db.query(func.sum(EggProduction.total_eggs)).filter(
        EggProduction.lot_id.in_(lot_ids),
        EggProduction.date == today
    ).scalar() or 0

    yesterday_eggs = db.query(func.sum(EggProduction.total_eggs)).filter(
        EggProduction.lot_id.in_(lot_ids),
        EggProduction.date == yesterday
    ).scalar() or 0

    # Week's mortality
    week_mortality = db.query(func.sum(Mortality.quantity)).filter(
        Mortality.lot_id.in_(lot_ids),
        Mortality.date >= week_ago
    ).scalar() or 0

    # Use centralized financial service for optimized calculations
    financial_service = get_financial_service(db)
    month_sales = financial_service.get_total_sales(site_ids, start_date=month_ago)
    month_expenses = financial_service.get_total_expenses(site_ids, start_date=month_ago, include_lot_costs=True)

    # Active alerts
    active_alerts = db.query(Alert).filter(
        Alert.organization_id == org_id,
        Alert.status == AlertStatus.ACTIVE
    ).count()

    # Pending payments - use centralized service
    pending_payments = financial_service.get_pending_receivables(site_ids)

    # Broiler summary stats
    avg_broiler_weight = sum(b["current_weight_g"] for b in broiler_data) / len(broiler_data) if broiler_data else 0
    avg_broiler_age = sum(b["age_days"] for b in broiler_data) / len(broiler_data) if broiler_data else 0
    lots_ready_for_sale = sum(1 for b in broiler_data if b["ready_for_sale"])

    return {
        "summary": {
            "total_sites": len(sites),
            "active_lots": len(active_lots),
            "broiler_lots": len(broiler_lots_list),
            "layer_lots": len(layer_lots),
            "total_birds": total_birds,
            "broiler_birds": broiler_birds,
            "layer_birds": layer_birds,
            "active_alerts": active_alerts
        },
        "broiler_summary": {
            "avg_weight_g": round(avg_broiler_weight, 0),
            "avg_age_days": round(avg_broiler_age, 0),
            "lots_ready_for_sale": lots_ready_for_sale,
            "lots": broiler_data
        },
        "today": {
            "eggs_produced": today_eggs,
            "eggs_change": today_eggs - yesterday_eggs if yesterday_eggs else 0,
            "date": today.isoformat()
        },
        "week": {
            "mortality": week_mortality,
            "mortality_rate": round(week_mortality / total_birds * 100, 2) if total_birds else 0
        },
        "month": {
            "sales": float(round(Decimal(str(month_sales or 0)), 2)),
            "expenses": float(round(Decimal(str(month_expenses or 0)), 2)),
            "margin": float(round(Decimal(str(month_sales or 0)) - Decimal(str(month_expenses or 0)), 2)),
            "pending_payments": float(round(Decimal(str(pending_payments or 0)), 2))
        },
        "sites": [
            {
                "id": str(site.id),
                "name": site.name,
                "city": site.city,
                "buildings_count": len(site.buildings),
                "active_lots": sum(1 for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE),
                "broiler_lots": sum(1 for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE and l.type == LotType.BROILER),
                "layer_lots": sum(1 for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE and l.type == LotType.LAYER),
                "total_birds": sum(
                    l.current_quantity or 0
                    for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE
                ),
                "broiler_birds": sum(
                    l.current_quantity or 0
                    for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE and l.type == LotType.BROILER
                ),
                "layer_birds": sum(
                    l.current_quantity or 0
                    for b in site.buildings for l in b.lots if l.status == LotStatus.ACTIVE and l.type == LotType.LAYER
                )
            }
            for site in sites
        ]
    }


@router.get("/charts/eggs-trend")
async def get_eggs_trend(
    days: int = 30,
    site_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get egg production trend for charts."""
    from uuid import UUID as UUIDType

    org_id = current_user.organization_id
    start_date = date.today() - timedelta(days=days)

    # Get lot IDs
    query = db.query(Lot.id).join(Building).join(Site).filter(
        Site.organization_id == org_id,
        Site.is_active == True,
        Building.is_active == True,
        Lot.type == LotType.LAYER,
        Lot.status != "deleted"
    )

    if site_id:
        query = query.filter(Site.id == UUIDType(site_id))

    lot_ids = [r[0] for r in query.all()]

    # Get daily production
    results = db.query(
        EggProduction.date,
        func.sum(EggProduction.total_eggs).label('total'),
        func.avg(EggProduction.laying_rate).label('avg_rate')
    ).filter(
        EggProduction.lot_id.in_(lot_ids),
        EggProduction.date >= start_date
    ).group_by(EggProduction.date).order_by(EggProduction.date).all()

    return {
        "labels": [r.date.isoformat() for r in results],
        "datasets": [
            {
                "label": "Total Eggs",
                "data": [r.total for r in results]
            },
            {
                "label": "Avg Laying Rate %",
                "data": [round(float(r.avg_rate), 1) if r.avg_rate else 0 for r in results]
            }
        ]
    }


@router.get("/charts/financial-trend")
async def get_financial_trend(
    months: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly financial trend using optimized centralized service."""
    org_id = current_user.organization_id

    # Get site IDs
    site_ids = [s.id for s in db.query(Site.id).filter(Site.organization_id == org_id, Site.is_active == True).all()]

    # Use centralized financial service for optimized monthly data
    financial_service = get_financial_service(db)
    results = financial_service.get_monthly_financial_data(site_ids, months, include_lot_costs=True)

    return {
        "labels": [r["month"] for r in results],
        "datasets": [
            {"label": "Sales", "data": [r["sales"] for r in results]},
            {"label": "Expenses", "data": [r["expenses"] for r in results]},
            {"label": "Margin", "data": [r["margin"] for r in results]}
        ]
    }


@router.get("/alerts")
async def get_active_alerts(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active alerts for dashboard."""
    alerts = db.query(Alert).filter(
        Alert.organization_id == current_user.organization_id,
        Alert.status == AlertStatus.ACTIVE
    ).order_by(Alert.created_at.desc()).limit(limit).all()

    return [
        {
            "id": str(a.id),
            "type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "created_at": a.created_at.isoformat()
        }
        for a in alerts
    ]


@router.get("/financial-summary")
async def get_financial_summary(
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial summary with transactions for the finance page."""
    org_id = current_user.organization_id

    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get site IDs
    site_ids = [s.id for s in db.query(Site.id).filter(Site.organization_id == org_id, Site.is_active == True).all()]

    # Use centralized financial service for optimized calculations
    financial_service = get_financial_service(db)

    # Get financial summary using optimized queries
    total_sales = financial_service.get_total_sales(site_ids, start_date, end_date)
    total_expenses = financial_service.get_total_expenses(site_ids, start_date, end_date, include_lot_costs=True)
    pending_receivables = financial_service.get_pending_receivables(site_ids, start_date, end_date)
    expenses_by_category = financial_service.get_expenses_by_category(site_ids, start_date, end_date, include_lot_costs=True)

    net_profit = total_sales - total_expenses
    profit_margin = (net_profit / total_sales * 100) if total_sales > 0 else Decimal(0)

    # Get recent transactions for display (still need to load objects for this)
    sales_query = db.query(Sale).filter(
        or_(Sale.site_id.in_(site_ids), Sale.site_id.is_(None)),
        Sale.date >= start_date,
        Sale.date <= end_date
    ).order_by(Sale.created_at.desc()).limit(20).all()

    expenses_query = db.query(Expense).filter(
        or_(Expense.site_id.in_(site_ids), Expense.site_id.is_(None)),
        Expense.date >= start_date,
        Expense.date <= end_date
    ).order_by(Expense.created_at.desc()).limit(20).all()

    # Build transactions list
    transactions = []
    for s in sales_query:
        transactions.append({
            "id": str(s.id),
            "date": s.date.isoformat(),
            "created_at": s.created_at.isoformat() if s.created_at else s.date.isoformat(),
            "type": "income",
            "category": "sales",
            "description": f"Vente {s.sale_type.value if hasattr(s.sale_type, 'value') else s.sale_type}",
            "amount": float(round(Decimal(str(s.total_amount or 0)), 2)),
            "client_name": s.client_name
        })

    for e in expenses_query:
        transactions.append({
            "id": str(e.id),
            "date": e.date.isoformat(),
            "created_at": e.created_at.isoformat() if e.created_at else e.date.isoformat(),
            "type": "expense",
            "category": e.category or 'other',
            "description": e.description or f"Depense {e.category}",
            "amount": float(round(Decimal(str(e.amount or 0)), 2)),
            "supplier_name": e.supplier_name
        })

    # Sort transactions by created_at timestamp (most recent first)
    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    # Cashflow by month using optimized service
    monthly_data = financial_service.get_monthly_financial_data(site_ids, months=6, include_lot_costs=True)
    cashflow = [
        {"month": m["month_short"], "income": m["sales"], "expenses": m["expenses"]}
        for m in monthly_data
    ]

    return {
        "summary": {
            "total_sales": float(round(total_sales, 2)),
            "total_expenses": float(round(total_expenses, 2)),
            "net_profit": float(round(net_profit, 2)),
            "profit_margin": float(round(profit_margin, 1)),
            "pending_receivables": float(round(pending_receivables, 2))
        },
        "expenses_by_category": expenses_by_category,
        "transactions": transactions[:15],
        "cashflow": cashflow
    }


@router.get("/ai-insights")
async def get_ai_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered insights based on farm data."""
    from app.models.production import WeightRecord
    from app.models.feed import FeedConsumption
    from app.models.lot import LotType, LotStatus
    from app.services.laying_curve import (
        get_laying_phase, get_phase_label, get_expected_laying_rate,
        get_age_weeks, LayingPhase
    )

    org_id = current_user.organization_id
    insights = []
    today = date.today()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    # Get active lots
    sites = db.query(Site).filter(Site.organization_id == org_id, Site.is_active == True).all()
    site_ids = [s.id for s in sites]

    if not site_ids:
        return {"insights": []}

    active_lots = db.query(Lot).join(Building).filter(
        Building.site_id.in_(site_ids),
        Building.is_active == True,
        Lot.status == LotStatus.ACTIVE
    ).all()

    for lot in active_lots:
        lot_code = lot.code or lot.name or "Bande"

        # === LAYER INSIGHTS ===
        if lot.type == LotType.LAYER:
            # Get recent egg production
            recent_eggs = db.query(EggProduction).filter(
                EggProduction.lot_id == lot.id,
                EggProduction.date >= week_ago
            ).order_by(EggProduction.date.desc()).all()

            if recent_eggs:
                # Check for laying rate drop
                if len(recent_eggs) >= 2:
                    latest_rate = float(recent_eggs[0].laying_rate or 0)
                    prev_rate = float(recent_eggs[1].laying_rate or 0)
                    drop = prev_rate - latest_rate

                    if drop > 5:  # More than 5% drop
                        insights.append({
                            "type": "alert",
                            "priority": "high",
                            "icon": "egg",
                            "title": "Chute de ponte detectee",
                            "message": f"Le taux de ponte a baisse de {drop:.1f}% en 24h. Verifiez l'alimentation et la sante.",
                            "value": f"{latest_rate:.1f}%",
                            "trend": "down",
                            "lot_id": str(lot.id),
                            "lot_code": lot_code,
                            "action": {
                                "label": "Voir le lot",
                                "href": f"/lots/{lot.id}"
                            }
                        })

                # Check laying rate performance using age-based expected rate
                avg_rate = sum(float(e.laying_rate or 0) for e in recent_eggs) / len(recent_eggs)
                age_weeks = get_age_weeks(lot.age_days) if lot.age_days else 0
                phase = get_laying_phase(age_weeks)
                expected = get_expected_laying_rate(age_weeks)

                # Use age-based expected rate instead of static target
                target_rate = expected["optimal_expected"]
                min_expected = expected["min_expected"]
                max_expected = expected["max_expected"]

                # Add phase info to insights
                if phase == LayingPhase.PRE_LAY and age_weeks >= 16:
                    weeks_to_onset = 18 - age_weeks
                    insights.append({
                        "type": "info",
                        "priority": "low",
                        "icon": "egg",
                        "title": f"Ponte dans ~{weeks_to_onset} semaines",
                        "message": f"Lot en pre-ponte (S{age_weeks}). Preparez l'aliment pondeuse et le programme lumineux.",
                        "value": f"S{age_weeks}",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "phase": get_phase_label(phase)
                    })
                elif phase == LayingPhase.ONSET:
                    insights.append({
                        "type": "info",
                        "priority": "medium",
                        "icon": "egg",
                        "title": "Debut de ponte",
                        "message": f"Le lot demarre la ponte (S{age_weeks}). Taux actuel: {avg_rate:.0f}%, attendu: {min_expected:.0f}-{max_expected:.0f}%.",
                        "value": f"{avg_rate:.1f}%",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "phase": get_phase_label(phase)
                    })
                elif avg_rate >= min_expected and avg_rate <= max_expected:
                    insights.append({
                        "type": "performance",
                        "priority": "low",
                        "icon": "egg",
                        "title": "Ponte dans les standards",
                        "message": f"Taux {avg_rate:.1f}% (S{age_weeks}) dans la fourchette attendue ({min_expected:.0f}-{max_expected:.0f}%).",
                        "value": f"{avg_rate:.1f}%",
                        "trend": "up",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "phase": get_phase_label(phase)
                    })
                elif avg_rate < min_expected and min_expected > 0:
                    gap = min_expected - avg_rate
                    insights.append({
                        "type": "alert",
                        "priority": "high" if gap > 15 else "medium",
                        "icon": "egg",
                        "title": "Ponte sous les standards",
                        "message": f"Taux {avg_rate:.1f}% (S{age_weeks}) inferieur au minimum attendu ({min_expected:.0f}%). -{gap:.0f}% vs normal.",
                        "value": f"{avg_rate:.1f}%",
                        "trend": "down",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "phase": get_phase_label(phase),
                        "action": {
                            "label": "Analyser",
                            "href": f"/lots/{lot.id}"
                        }
                    })
                elif avg_rate > max_expected:
                    insights.append({
                        "type": "performance",
                        "priority": "low",
                        "icon": "egg",
                        "title": "Excellente ponte",
                        "message": f"Taux {avg_rate:.1f}% (S{age_weeks}) superieur aux standards ({max_expected:.0f}% max). Bravo!",
                        "value": f"{avg_rate:.1f}%",
                        "trend": "up",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "phase": get_phase_label(phase)
                    })

                # Egg production prediction
                if len(recent_eggs) >= 5:
                    daily_avg = sum(e.total_eggs or 0 for e in recent_eggs[:5]) / 5
                    weekly_prediction = int(daily_avg * 7)
                    insights.append({
                        "type": "prediction",
                        "priority": "low",
                        "icon": "prediction",
                        "title": "Prevision production",
                        "message": f"Estimation semaine prochaine: environ {weekly_prediction:,} oeufs.",
                        "value": f"~{weekly_prediction:,}",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code
                    })

        # === BROILER INSIGHTS ===
        if lot.type == LotType.BROILER:
            # Get recent weights
            recent_weights = db.query(WeightRecord).filter(
                WeightRecord.lot_id == lot.id
            ).order_by(WeightRecord.date.desc()).limit(3).all()

            if recent_weights:
                current_weight = float(recent_weights[0].average_weight_g or 0)
                target_weight = float(lot.target_weight_g or 2500)
                age_days = lot.age_days

                # Check if ready for sale (>= 90% of target weight)
                progress_percent = (current_weight / target_weight * 100) if target_weight > 0 else 0
                if progress_percent >= 90:
                    insights.append({
                        "type": "alert",
                        "priority": "high",
                        "icon": "sale",
                        "title": "Pret pour la vente!",
                        "message": f"Lot {lot_code} a atteint {progress_percent:.0f}% du poids cible ({current_weight:.0f}g/{target_weight:.0f}g). Planifiez la vente.",
                        "value": f"{current_weight:.0f}g",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code,
                        "action": {
                            "label": "Planifier vente",
                            "href": f"/commercial?lot={lot.id}"
                        }
                    })

                # Weight vs target analysis
                if age_days > 0:
                    expected_weight = (target_weight / 42) * age_days  # Linear approximation for 42-day cycle
                    weight_ratio = current_weight / expected_weight if expected_weight > 0 else 1

                    if weight_ratio >= 1.05:
                        insights.append({
                            "type": "performance",
                            "priority": "low",
                            "icon": "bird",
                            "title": "Croissance excellente",
                            "message": f"Poids actuel {current_weight:.0f}g, +{((weight_ratio - 1) * 100):.0f}% vs standard J{age_days}.",
                            "value": f"{current_weight:.0f}g",
                            "trend": "up",
                            "lot_id": str(lot.id),
                            "lot_code": lot_code
                        })
                    elif weight_ratio < 0.9:
                        insights.append({
                            "type": "alert",
                            "priority": "high",
                            "icon": "bird",
                            "title": "Retard de croissance",
                            "message": f"Poids {current_weight:.0f}g, -{((1 - weight_ratio) * 100):.0f}% vs standard. Verifiez l'aliment.",
                            "value": f"{current_weight:.0f}g",
                            "trend": "down",
                            "lot_id": str(lot.id),
                            "lot_code": lot_code,
                            "action": {
                                "label": "Ajouter pesee",
                                "href": f"/lots/{lot.id}/weight"
                            }
                        })

                # GMQ calculation if multiple weights
                if len(recent_weights) >= 2:
                    weight_diff = float(recent_weights[0].average_weight_g or 0) - float(recent_weights[1].average_weight_g or 0)
                    days_diff = (recent_weights[0].date - recent_weights[1].date).days or 1
                    gmq = weight_diff / days_diff

                    if gmq >= 50:  # Good daily gain
                        insights.append({
                            "type": "performance",
                            "priority": "low",
                            "icon": "bird",
                            "title": "GMQ satisfaisant",
                            "message": f"Gain moyen quotidien de {gmq:.0f}g/jour.",
                            "value": f"{gmq:.0f}g/j",
                            "trend": "up",
                            "lot_id": str(lot.id),
                            "lot_code": lot_code
                        })

                # Predict final weight
                if age_days < 42 and current_weight > 0:
                    days_remaining = 42 - age_days
                    avg_gmq = current_weight / age_days if age_days > 0 else 50
                    predicted_final = current_weight + (avg_gmq * days_remaining)
                    insights.append({
                        "type": "prediction",
                        "priority": "low",
                        "icon": "prediction",
                        "title": "Poids final estime",
                        "message": f"A J42, poids prevu: ~{predicted_final:.0f}g ({predicted_final/1000:.2f}kg).",
                        "value": f"~{predicted_final/1000:.2f}kg",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code
                    })

        # === MORTALITY INSIGHTS (ALL LOTS) ===
        recent_mortality = db.query(Mortality).filter(
            Mortality.lot_id == lot.id,
            Mortality.date >= week_ago
        ).all()

        if recent_mortality:
            total_mort = sum(m.quantity or 0 for m in recent_mortality)
            mort_rate = (total_mort / (lot.initial_quantity or 1)) * 100

            if mort_rate > 2:  # More than 2% weekly mortality
                insights.append({
                    "type": "alert",
                    "priority": "high",
                    "icon": "mortality",
                    "title": "Mortalite elevee",
                    "message": f"{total_mort} pertes cette semaine ({mort_rate:.1f}%). Consultez un veterinaire.",
                    "value": f"{total_mort}",
                    "trend": "down",
                    "lot_id": str(lot.id),
                    "lot_code": lot_code,
                    "action": {
                        "label": "Voir mortalites",
                        "href": f"/lots/{lot.id}/mortality"
                    }
                })

        # === FEED INSIGHTS ===
        recent_feed = db.query(FeedConsumption).filter(
            FeedConsumption.lot_id == lot.id,
            FeedConsumption.date >= week_ago
        ).all()

        if recent_feed and lot.current_quantity:
            total_feed_kg = sum((Decimal(str(f.quantity_kg)) if f.quantity_kg else Decimal(0)) for f in recent_feed)
            daily_per_bird = float((total_feed_kg * 1000 / 7) / lot.current_quantity)

            # Check feed consumption anomaly
            if lot.type == LotType.BROILER:
                expected_feed = lot.age_days * 8  # Rough approximation: 8g/day/day of age
                if daily_per_bird > expected_feed * 1.3:
                    insights.append({
                        "type": "alert",
                        "priority": "medium",
                        "icon": "feed",
                        "title": "Consommation aliment elevee",
                        "message": f"{daily_per_bird:.0f}g/oiseau/jour, superieur a la normale. Verifiez le gaspillage.",
                        "value": f"{daily_per_bird:.0f}g",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code
                    })
                elif daily_per_bird < expected_feed * 0.7:
                    insights.append({
                        "type": "alert",
                        "priority": "high",
                        "icon": "feed",
                        "title": "Consommation aliment faible",
                        "message": f"{daily_per_bird:.0f}g/oiseau/jour, anormalement bas. Les oiseaux mangent-ils?",
                        "value": f"{daily_per_bird:.0f}g",
                        "lot_id": str(lot.id),
                        "lot_code": lot_code
                    })

    # === GLOBAL INSIGHTS ===

    # Check for lots without recent data
    for lot in active_lots:
        last_entry = None
        if lot.type == LotType.LAYER:
            last_entry = db.query(EggProduction.date).filter(
                EggProduction.lot_id == lot.id
            ).order_by(EggProduction.date.desc()).first()
        else:
            last_entry = db.query(WeightRecord.date).filter(
                WeightRecord.lot_id == lot.id
            ).order_by(WeightRecord.date.desc()).first()

        if last_entry:
            days_since = (today - last_entry[0]).days
            if days_since >= 3:
                insights.append({
                    "type": "recommendation",
                    "priority": "medium",
                    "icon": "tip",
                    "title": "Donnees non mises a jour",
                    "message": f"Aucune saisie depuis {days_since} jours. Mettez a jour vos donnees.",
                    "lot_id": str(lot.id),
                    "lot_code": lot.code or lot.name,
                    "action": {
                        "label": "Saisir maintenant",
                        "href": f"/lots/{lot.id}/daily-entry"
                    }
                })

    # Financial insight - include sales/expenses with NULL site_id
    month_ago = today - timedelta(days=30)
    month_sales = db.query(func.sum(Sale.total_amount)).filter(
        or_(Sale.site_id.in_(site_ids), Sale.site_id.is_(None)),
        Sale.date >= month_ago
    ).scalar() or 0

    month_expenses = db.query(func.sum(Expense.amount)).filter(
        or_(Expense.site_id.in_(site_ids), Expense.site_id.is_(None)),
        Expense.date >= month_ago
    ).scalar() or 0

    margin = float(Decimal(str(month_sales or 0)) - Decimal(str(month_expenses or 0)))

    if margin > 0:
        insights.append({
            "type": "performance",
            "priority": "low",
            "icon": "performance",
            "title": "Rentabilite positive",
            "message": f"Marge de +{margin:,.0f} FCFA ce mois. Continuez ainsi!",
            "value": f"+{margin:,.0f} F",
            "trend": "up"
        })
    elif margin < -50000:  # Significant loss
        insights.append({
            "type": "alert",
            "priority": "high",
            "icon": "alert",
            "title": "Marge negative",
            "message": f"Perte de {abs(margin):,.0f} FCFA ce mois. Reduisez les couts ou augmentez les ventes.",
            "value": f"{margin:,.0f} F",
            "trend": "down"
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    insights.sort(key=lambda x: priority_order.get(x["priority"], 2))

    return {"insights": insights[:10]}
