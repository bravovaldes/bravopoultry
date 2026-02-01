import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Numeric, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class EggSize(str, enum.Enum):
    S = "S"  # Small < 53g
    M = "M"  # Medium 53-63g
    L = "L"  # Large 63-73g
    XL = "XL"  # Extra Large > 73g


class EggProduction(Base):
    """Daily egg production for layers."""
    __tablename__ = "egg_productions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    # Soit lot_id (mode lots) soit building_id (mode direct)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    date = Column(Date, nullable=False)

    # Production counts
    normal_eggs = Column(Integer, default=0)
    cracked_eggs = Column(Integer, default=0)
    dirty_eggs = Column(Integer, default=0)
    small_eggs = Column(Integer, default=0)
    double_yolk_eggs = Column(Integer, default=0)
    soft_shell_eggs = Column(Integer, default=0)

    # Size distribution (optional detailed tracking)
    eggs_size_s = Column(Integer, default=0)
    eggs_size_m = Column(Integer, default=0)
    eggs_size_l = Column(Integer, default=0)
    eggs_size_xl = Column(Integer, default=0)

    # Calculated
    total_eggs = Column(Integer, default=0)
    sellable_eggs = Column(Integer, default=0)

    # Flock info at time of recording
    hen_count = Column(Integer, nullable=True)
    laying_rate = Column(Numeric(5, 2), nullable=True)  # %

    # Average egg weight (if measured)
    avg_egg_weight_g = Column(Numeric(6, 2), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="egg_productions")

    def calculate_totals(self):
        """Calculate total and sellable eggs."""
        self.total_eggs = (
            (self.normal_eggs or 0) +
            (self.cracked_eggs or 0) +
            (self.dirty_eggs or 0) +
            (self.small_eggs or 0) +
            (self.double_yolk_eggs or 0) +
            (self.soft_shell_eggs or 0)
        )
        self.sellable_eggs = (
            (self.normal_eggs or 0) +
            (self.dirty_eggs or 0) +  # Can be cleaned
            (self.double_yolk_eggs or 0)
        )


class WeightRecord(Base):
    """Weight/growth records for broilers."""
    __tablename__ = "weight_records"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    # Soit lot_id (mode lots) soit building_id (mode direct)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    date = Column(Date, nullable=False)
    age_days = Column(Integer, nullable=True)

    # Weight data
    average_weight_g = Column(Numeric(10, 2), nullable=False)
    sample_size = Column(Integer, nullable=True)  # Number of birds weighed

    min_weight_g = Column(Numeric(10, 2), nullable=True)
    max_weight_g = Column(Numeric(10, 2), nullable=True)
    std_deviation = Column(Numeric(8, 2), nullable=True)

    # Uniformity (CV% = std_dev / avg * 100)
    uniformity_cv = Column(Numeric(5, 2), nullable=True)

    # Comparison to standard
    standard_weight_g = Column(Numeric(10, 2), nullable=True)  # Expected weight at this age
    weight_vs_standard = Column(Numeric(6, 2), nullable=True)  # % difference

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="weight_records")


class MortalityCause(str, enum.Enum):
    DISEASE = "disease"
    HEAT_STRESS = "heat_stress"
    COLD_STRESS = "cold_stress"
    CRUSHING = "crushing"
    CULLING = "culling"
    PREDATOR = "predator"
    ACCIDENT = "accident"
    LAYING_ACCIDENT = "laying_accident"
    DEHYDRATION = "dehydration"
    UNKNOWN = "unknown"
    OTHER = "other"


class Mortality(Base):
    """Daily mortality records."""
    __tablename__ = "mortalities"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    # Soit lot_id (mode lots) soit building_id (mode direct)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    date = Column(Date, nullable=False)

    quantity = Column(Integer, nullable=False)
    cause = Column(
        Enum(MortalityCause, values_callable=lambda obj: [e.value for e in obj]),
        default=MortalityCause.UNKNOWN
    )

    symptoms = Column(Text, nullable=True)
    suspected_disease = Column(String(200), nullable=True)

    # Photos of dead birds/symptoms
    photo_urls = Column(Text, nullable=True)  # JSON array of URLs

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="mortalities")
