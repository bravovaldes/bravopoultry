from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class HealthEventBase(BaseModel):
    date: date
    event_type: str
    product_name: Optional[str] = None
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    route: Optional[str] = None
    dose: Optional[str] = None
    duration_days: Optional[int] = None
    target_disease: Optional[str] = None
    withdrawal_days_meat: Optional[int] = None
    withdrawal_days_eggs: Optional[int] = None
    veterinarian_name: Optional[str] = None
    veterinarian_phone: Optional[str] = None
    cost: Optional[Decimal] = None
    reminder_date: Optional[date] = None
    reminder_note: Optional[str] = None
    notes: Optional[str] = None


class HealthEventCreate(HealthEventBase):
    lot_id: UUID


class HealthEventUpdate(BaseModel):
    event_type: Optional[str] = None
    product_name: Optional[str] = None
    route: Optional[str] = None
    dose: Optional[str] = None
    cost: Optional[Decimal] = None
    reminder_date: Optional[date] = None
    notes: Optional[str] = None


class HealthEventResponse(HealthEventBase):
    id: UUID
    lot_id: UUID
    withdrawal_end_date: Optional[date] = None
    document_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Vaccination Schedule
class VaccinationScheduleBase(BaseModel):
    vaccine_name: str
    target_disease: str
    day_from: int
    day_to: Optional[int] = None
    route: Optional[str] = None
    dose: Optional[str] = None
    is_mandatory: bool = True
    notes: Optional[str] = None


class VaccinationScheduleCreate(VaccinationScheduleBase):
    breed: Optional[str] = None
    lot_type: Optional[str] = None
    lot_id: Optional[UUID] = None
    program_id: Optional[str] = None
    organization_id: Optional[UUID] = None


class VaccinationScheduleUpdate(BaseModel):
    vaccine_name: Optional[str] = None
    target_disease: Optional[str] = None
    day_from: Optional[int] = None
    day_to: Optional[int] = None
    route: Optional[str] = None
    dose: Optional[str] = None
    is_mandatory: Optional[bool] = None
    notes: Optional[str] = None


class VaccinationScheduleResponse(VaccinationScheduleBase):
    id: UUID
    lot_id: Optional[UUID] = None
    breed: Optional[str] = None
    lot_type: Optional[str] = None
    program_id: Optional[str] = None
    is_system: bool
    organization_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Apply program to lot
class ApplyProgramRequest(BaseModel):
    lot_id: UUID
    program_id: str  # e.g., "broiler_standard"
    vaccinations: list[VaccinationScheduleBase]  # The vaccinations from the program


# Upcoming vaccinations
class UpcomingVaccination(BaseModel):
    lot_id: UUID
    lot_name: Optional[str] = None
    lot_code: Optional[str] = None
    vaccine_name: str
    target_disease: str
    due_date: date
    day_from: int
    day_to: Optional[int] = None
    is_overdue: bool = False
    schedule_id: Optional[UUID] = None
    route: Optional[str] = None
