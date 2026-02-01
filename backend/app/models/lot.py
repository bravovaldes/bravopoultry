import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Boolean, Numeric, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class LotType(str, enum.Enum):
    BROILER = "broiler"  # Chair
    LAYER = "layer"  # Pondeuse


class LotStatus(str, enum.Enum):
    PREPARATION = "preparation"  # Building being prepared
    ACTIVE = "active"  # Lot in progress
    COMPLETED = "completed"  # Lot finished (sold/reformed)
    SUSPENDED = "suspended"  # Health issue
    DELETED = "deleted"  # Soft deleted


class Lot(Base):
    __tablename__ = "lots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Location - either building OR section
    building_id = Column(GUID(), ForeignKey("buildings.id"), nullable=True)
    section_id = Column(GUID(), ForeignKey("sections.id"), nullable=True)

    # Basic info
    code = Column(String(50), nullable=True)  # "LOT-2025-001"
    name = Column(String(100), nullable=True)
    type = Column(Enum(LotType), nullable=False)
    status = Column(Enum(LotStatus), default=LotStatus.ACTIVE)

    # Breed/strain
    breed = Column(String(100), nullable=True)  # "Cobb 500", "Ross 308", "Isa Brown"
    supplier = Column(String(200), nullable=True)  # Chick supplier

    # Quantities
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=True)

    # Dates
    placement_date = Column(Date, nullable=False)  # Date mise en place
    age_at_placement = Column(Integer, default=1)  # Age in days
    expected_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)

    # Layer specific
    transfer_to_laying_date = Column(Date, nullable=True)  # When moved to laying house
    first_egg_date = Column(Date, nullable=True)

    # Costs
    chick_price_unit = Column(Numeric(10, 2), nullable=True)
    transport_cost = Column(Numeric(12, 2), nullable=True)
    other_initial_costs = Column(Numeric(12, 2), nullable=True)

    # Target performance (from breed standards)
    target_weight_g = Column(Integer, nullable=True)  # Target final weight
    target_fcr = Column(Numeric(4, 2), nullable=True)  # Target feed conversion
    target_laying_rate = Column(Numeric(5, 2), nullable=True)  # Target laying %

    notes = Column(Text, nullable=True)

    # Split lot tracking
    parent_lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)
    split_date = Column(Date, nullable=True)  # Date when this lot was split from parent
    split_ratio = Column(Numeric(5, 4), nullable=True)  # Ratio of parent (e.g., 0.4000 = 40%)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)

    # Relationships
    building = relationship("Building", back_populates="lots")
    section = relationship("Section", back_populates="lots")

    # Split relationships
    parent_lot = relationship("Lot", remote_side="Lot.id", backref="child_lots", foreign_keys=[parent_lot_id])

    egg_productions = relationship("EggProduction", back_populates="lot", cascade="all, delete-orphan")
    weight_records = relationship("WeightRecord", back_populates="lot", cascade="all, delete-orphan")
    mortalities = relationship("Mortality", back_populates="lot", cascade="all, delete-orphan")
    feed_consumptions = relationship("FeedConsumption", back_populates="lot", cascade="all, delete-orphan")
    water_consumptions = relationship("WaterConsumption", back_populates="lot", cascade="all, delete-orphan")
    health_events = relationship("HealthEvent", back_populates="lot", cascade="all, delete-orphan", foreign_keys="[HealthEvent.lot_id]")
    vaccination_schedules = relationship("VaccinationSchedule", back_populates="lot", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="lot")
    expenses = relationship("Expense", back_populates="lot", foreign_keys="[Expense.lot_id]")

    stats = relationship("LotStats", back_populates="lot", uselist=False, cascade="all, delete-orphan")

    @property
    def age_days(self) -> int:
        """Calculate current age in days."""
        if self.placement_date:
            delta = date.today() - self.placement_date
            return delta.days + self.age_at_placement
        return 0

    @property
    def age_weeks(self) -> int:
        """Calculate current age in weeks."""
        return self.age_days // 7


class LotStats(Base):
    """Pre-calculated statistics for a lot (for performance)."""
    __tablename__ = "lot_stats"

    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), primary_key=True)

    # Mortality
    total_mortality = Column(Integer, default=0)
    mortality_rate = Column(Numeric(5, 2), default=0)

    # Eggs (layers)
    total_eggs = Column(Integer, default=0)
    average_laying_rate = Column(Numeric(5, 2), default=0)
    peak_laying_rate = Column(Numeric(5, 2), default=0)
    eggs_per_hen_housed = Column(Numeric(8, 2), default=0)

    # Weight (broilers)
    current_weight_g = Column(Numeric(10, 2), nullable=True)
    daily_gain_g = Column(Numeric(8, 2), nullable=True)  # GMQ
    uniformity = Column(Numeric(5, 2), nullable=True)

    # Feed
    total_feed_kg = Column(Numeric(12, 2), default=0)
    feed_conversion_ratio = Column(Numeric(5, 2), nullable=True)  # IC
    feed_per_egg = Column(Numeric(6, 3), nullable=True)

    # Water
    total_water_liters = Column(Numeric(12, 2), default=0)
    water_feed_ratio = Column(Numeric(4, 2), nullable=True)

    # Financial
    total_expenses = Column(Numeric(14, 2), default=0)
    total_sales = Column(Numeric(14, 2), default=0)
    gross_margin = Column(Numeric(14, 2), default=0)
    cost_per_kg = Column(Numeric(10, 2), nullable=True)
    cost_per_egg = Column(Numeric(10, 4), nullable=True)

    # Performance score (0-100)
    performance_score = Column(Numeric(5, 2), nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="stats")
