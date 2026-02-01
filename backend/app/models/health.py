import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Numeric, Text, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class HealthEventType(str, enum.Enum):
    VACCINATION = "vaccination"
    TREATMENT = "treatment"
    VET_VISIT = "vet_visit"
    LAB_ANALYSIS = "lab_analysis"
    PROPHYLAXIS = "prophylaxis"
    DEWORMING = "deworming"
    VITAMIN = "vitamin"


class AdministrationRoute(str, enum.Enum):
    WATER = "water"
    FEED = "feed"
    INJECTION = "injection"
    SPRAY = "spray"
    EYE_DROP = "eye_drop"
    ORAL = "oral"


class HealthEvent(Base):
    """Health/veterinary events for a lot."""
    __tablename__ = "health_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=False)

    # Track inheritance from parent lot during split
    inherited_from_lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="SET NULL"), nullable=True)
    original_event_id = Column(GUID(), ForeignKey("health_events.id", ondelete="SET NULL"), nullable=True)

    date = Column(Date, nullable=False)
    event_type = Column(Enum(HealthEventType), nullable=False)

    # Product/vaccine info
    product_name = Column(String(200), nullable=True)
    manufacturer = Column(String(200), nullable=True)
    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(Date, nullable=True)

    # Administration
    route = Column(Enum(AdministrationRoute), nullable=True)
    dose = Column(String(100), nullable=True)
    duration_days = Column(Integer, nullable=True)

    # Target disease
    target_disease = Column(String(200), nullable=True)

    # Withdrawal period (temps d'attente)
    withdrawal_days_meat = Column(Integer, nullable=True)
    withdrawal_days_eggs = Column(Integer, nullable=True)
    withdrawal_end_date = Column(Date, nullable=True)

    # Veterinarian
    veterinarian_name = Column(String(200), nullable=True)
    veterinarian_phone = Column(String(20), nullable=True)

    # Cost
    cost = Column(Numeric(12, 2), nullable=True)

    # Next action
    reminder_date = Column(Date, nullable=True)
    reminder_note = Column(String(500), nullable=True)

    # Documents
    document_url = Column(String(500), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="health_events", foreign_keys=[lot_id])


class VaccinationSchedule(Base):
    """Predefined vaccination schedules by breed or per lot."""
    __tablename__ = "vaccination_schedules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Target - can be global (lot_id=NULL) or per-lot
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    breed = Column(String(100), nullable=True)  # NULL = all breeds
    lot_type = Column(String(20), nullable=True)  # "broiler", "layer", or NULL for all

    # Vaccine info
    vaccine_name = Column(String(200), nullable=False)
    target_disease = Column(String(200), nullable=False)

    # When to administer
    day_from = Column(Integer, nullable=False)  # Day of age
    day_to = Column(Integer, nullable=True)  # Range (optional)

    # How
    route = Column(Enum(AdministrationRoute), nullable=True)
    dose = Column(String(100), nullable=True)

    # Is it mandatory?
    is_mandatory = Column(Boolean, default=True)

    notes = Column(Text, nullable=True)

    # Program info (for lot-specific schedules)
    program_id = Column(String(50), nullable=True)  # e.g., "broiler_standard"

    # System vs user-defined
    is_system = Column(Boolean, default=False)  # System = predefined
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="vaccination_schedules")
