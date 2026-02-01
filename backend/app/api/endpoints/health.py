from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from datetime import date, timedelta

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.lot import Lot, LotStatus
from app.models.health import HealthEvent, VaccinationSchedule, HealthEventType
from app.models.finance import Expense
from app.schemas.health import (
    HealthEventCreate, HealthEventUpdate, HealthEventResponse,
    VaccinationScheduleCreate, VaccinationScheduleUpdate, VaccinationScheduleResponse,
    UpcomingVaccination, ApplyProgramRequest
)

router = APIRouter()


@router.get("/events", response_model=List[HealthEventResponse])
async def get_health_events(
    lot_id: UUID,
    event_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get health events for a lot."""
    query = db.query(HealthEvent).filter(HealthEvent.lot_id == lot_id)

    if event_type:
        query = query.filter(HealthEvent.event_type == event_type)

    events = query.order_by(HealthEvent.created_at.desc()).all()
    return [HealthEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=HealthEventResponse)
async def create_health_event(
    data: HealthEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a health event."""
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    event = HealthEvent(**data.model_dump(), recorded_by=current_user.id)

    # Calculate withdrawal end date
    if data.withdrawal_days_meat:
        event.withdrawal_end_date = data.date + timedelta(days=data.withdrawal_days_meat)

    db.add(event)
    db.commit()
    db.refresh(event)

    # Create expense record if cost > 0 for accounting purposes
    if data.cost and data.cost > 0:
        # Build description based on event type
        if data.event_type == "vaccination":
            description = f"Vaccination: {data.product_name}" if data.product_name else "Vaccination"
        elif data.event_type == "treatment":
            description = f"Traitement: {data.product_name}" if data.product_name else "Traitement médical"
        elif data.event_type == "medication":
            description = f"Médicament: {data.product_name}" if data.product_name else "Médicament"
        else:
            description = f"Santé: {data.product_name}" if data.product_name else f"Événement santé ({data.event_type})"

        # Add lot info to description
        description += f" - Lot {lot.code}"

        expense = Expense(
            lot_id=data.lot_id,
            site_id=lot.building.site_id if lot.building else None,
            date=data.date,
            category="veterinary",
            description=description,
            quantity=1,  # Single health event
            unit=data.dose if data.dose else None,  # Use dose as unit info
            amount=data.cost,
            is_paid=True,
            recorded_by=current_user.id,
            notes=data.notes
        )
        db.add(expense)
        db.commit()

    return HealthEventResponse.model_validate(event)


@router.get("/upcoming-vaccinations", response_model=List[UpcomingVaccination])
async def get_upcoming_vaccinations(
    site_id: UUID = None,
    days_ahead: int = 14,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming vaccinations for active lots."""
    from app.models.site import Site
    from app.models.building import Building

    # Get active lots
    query = db.query(Lot).join(Building).join(Site).filter(
        Site.organization_id == current_user.organization_id,
        Site.is_active == True,
        Building.is_active == True,
        Lot.status == LotStatus.ACTIVE
    )

    if site_id:
        query = query.filter(Site.id == site_id)

    lots = query.all()

    upcoming = []
    today = date.today()

    for lot in lots:
        lot_age = lot.age_days

        # First check for lot-specific schedules
        lot_schedules = db.query(VaccinationSchedule).filter(
            VaccinationSchedule.lot_id == lot.id
        ).all()

        # If lot has specific schedules, use those
        if lot_schedules:
            schedules = lot_schedules
        else:
            # Otherwise use global schedules (organization or system)
            schedules = db.query(VaccinationSchedule).filter(
                VaccinationSchedule.lot_id == None,
                (VaccinationSchedule.organization_id == current_user.organization_id) |
                (VaccinationSchedule.is_system == True)
            ).all()

        for schedule in schedules:
            # Check if this schedule applies to this lot type (only for global schedules)
            if schedule.lot_id is None and schedule.lot_type and schedule.lot_type != lot.type.value:
                continue

            # Check if vaccination is due
            if schedule.day_from <= lot_age + days_ahead:
                # Check if already done (case-insensitive matching)
                existing = db.query(HealthEvent).filter(
                    HealthEvent.lot_id == lot.id,
                    HealthEvent.event_type == HealthEventType.VACCINATION,
                    func.lower(HealthEvent.product_name) == func.lower(schedule.vaccine_name)
                ).first()

                if not existing:
                    due_date = lot.placement_date + timedelta(days=schedule.day_from - lot.age_at_placement)

                    upcoming.append(UpcomingVaccination(
                        lot_id=lot.id,
                        lot_name=lot.name,
                        lot_code=lot.code,
                        vaccine_name=schedule.vaccine_name,
                        target_disease=schedule.target_disease,
                        due_date=due_date,
                        day_from=schedule.day_from,
                        day_to=schedule.day_to,
                        is_overdue=due_date < today,
                        schedule_id=schedule.id,
                        route=schedule.route
                    ))

    # Sort by due date
    upcoming.sort(key=lambda x: x.due_date)

    return upcoming


# Vaccination Schedules
@router.get("/vaccination-schedules", response_model=List[VaccinationScheduleResponse])
async def get_vaccination_schedules(
    lot_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vaccination schedules."""
    query = db.query(VaccinationSchedule).filter(
        (VaccinationSchedule.organization_id == current_user.organization_id) |
        (VaccinationSchedule.is_system == True)
    )

    if lot_type:
        query = query.filter(
            (VaccinationSchedule.lot_type == lot_type) |
            (VaccinationSchedule.lot_type == None)
        )

    schedules = query.order_by(VaccinationSchedule.day_from).all()
    return [VaccinationScheduleResponse.model_validate(s) for s in schedules]


@router.post("/vaccination-schedules", response_model=VaccinationScheduleResponse)
async def create_vaccination_schedule(
    data: VaccinationScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom vaccination schedule."""
    schedule = VaccinationSchedule(
        **data.model_dump(),
        organization_id=current_user.organization_id,
        is_system=False
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return VaccinationScheduleResponse.model_validate(schedule)


@router.post("/vaccination-schedules/apply-program", response_model=List[VaccinationScheduleResponse])
async def apply_program_to_lot(
    data: ApplyProgramRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply a vaccination program template to a lot."""
    # Verify lot exists and belongs to user's organization
    lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != LotStatus.DELETED).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Delete existing schedules for this lot (if any)
    db.query(VaccinationSchedule).filter(
        VaccinationSchedule.lot_id == data.lot_id
    ).delete()

    # Create new schedules from the program
    created_schedules = []
    for vacc in data.vaccinations:
        schedule = VaccinationSchedule(
            lot_id=data.lot_id,
            lot_type=lot.type.value if lot.type else None,
            program_id=data.program_id,
            vaccine_name=vacc.vaccine_name,
            target_disease=vacc.target_disease,
            day_from=vacc.day_from,
            day_to=vacc.day_to,
            route=vacc.route,
            dose=vacc.dose,
            is_mandatory=vacc.is_mandatory,
            notes=vacc.notes,
            organization_id=current_user.organization_id,
            is_system=False
        )
        db.add(schedule)
        created_schedules.append(schedule)

    db.commit()
    for s in created_schedules:
        db.refresh(s)

    return [VaccinationScheduleResponse.model_validate(s) for s in created_schedules]


@router.get("/lots/{lot_id}/vaccination-schedules", response_model=List[VaccinationScheduleResponse])
async def get_lot_vaccination_schedules(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vaccination schedules for a specific lot."""
    schedules = db.query(VaccinationSchedule).filter(
        VaccinationSchedule.lot_id == lot_id
    ).order_by(VaccinationSchedule.day_from).all()

    return [VaccinationScheduleResponse.model_validate(s) for s in schedules]


@router.put("/vaccination-schedules/{schedule_id}", response_model=VaccinationScheduleResponse)
async def update_vaccination_schedule(
    schedule_id: UUID,
    data: VaccinationScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a vaccination schedule."""
    schedule = db.query(VaccinationSchedule).filter(
        VaccinationSchedule.id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Update fields
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)

    return VaccinationScheduleResponse.model_validate(schedule)


@router.delete("/vaccination-schedules/{schedule_id}")
async def delete_vaccination_schedule(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a vaccination schedule."""
    schedule = db.query(VaccinationSchedule).filter(
        VaccinationSchedule.id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()

    return {"message": "Schedule deleted"}


@router.delete("/lots/{lot_id}/vaccination-schedules")
async def delete_lot_vaccination_schedules(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all vaccination schedules for a lot (remove program)."""
    db.query(VaccinationSchedule).filter(
        VaccinationSchedule.lot_id == lot_id
    ).delete()
    db.commit()

    return {"message": "All schedules deleted for lot"}
