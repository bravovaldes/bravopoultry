import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Boolean, Numeric, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class BuildingType(str, enum.Enum):
    BROILER = "broiler"  # Poulet de chair
    LAYER = "layer"  # Pondeuses
    BREEDER = "breeder"  # Reproducteurs
    PULLET = "pullet"  # Poulettes
    HATCHERY = "hatchery"  # Couvoir
    FEED_STORAGE = "feed_storage"  # Stockage aliment
    EGG_STORAGE = "egg_storage"  # Stockage oeufs
    MIXED = "mixed"  # Mixte


class VentilationType(str, enum.Enum):
    NATURAL = "natural"
    TUNNEL = "tunnel"
    STATIC = "static"
    MIXED = "mixed"


class TrackingMode(str, enum.Enum):
    LOTS = "lots"  # Suivi par lots (poulet de chair, élevage industriel)
    DIRECT = "direct"  # Suivi direct sur bâtiment (pondeuses en continu, petite ferme)


class Building(Base):
    __tablename__ = "buildings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    site_id = Column(GUID(), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)

    building_type = Column(Enum(BuildingType), nullable=False)

    # Mode de suivi : "lots" ou "direct"
    tracking_mode = Column(Enum(TrackingMode), default=TrackingMode.LOTS)

    capacity = Column(Integer, nullable=True)
    surface_m2 = Column(Numeric(10, 2), nullable=True)

    ventilation_type = Column(Enum(VentilationType), default=VentilationType.NATURAL)
    has_electricity = Column(Boolean, default=True)
    has_water = Column(Boolean, default=True)
    has_generator = Column(Boolean, default=False)

    # Equipment
    feeder_type = Column(String(50), nullable=True)
    feeder_count = Column(Integer, nullable=True)
    drinker_type = Column(String(50), nullable=True)
    drinker_count = Column(Integer, nullable=True)

    construction_year = Column(Integer, nullable=True)
    last_renovation = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    # === Champs pour le mode DIRECT (suivi sans lots) ===
    # Ces champs sont utilisés quand tracking_mode = "direct"
    current_quantity = Column(Integer, nullable=True)  # Effectif actuel
    breed = Column(String(100), nullable=True)  # Souche (Isa Brown, Cobb 500, etc.)
    supplier = Column(String(200), nullable=True)  # Fournisseur poussins
    placement_date = Column(Date, nullable=True)  # Date mise en place
    age_at_placement = Column(Integer, default=1)  # Age à l'arrivée (jours)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    site = relationship("Site", back_populates="buildings")
    sections = relationship("Section", back_populates="building")
    lots = relationship("Lot", back_populates="building")

    @property
    def age_days(self) -> int:
        """Calcule l'âge en jours (pour mode direct)."""
        if self.placement_date and self.tracking_mode == TrackingMode.DIRECT:
            delta = date.today() - self.placement_date
            return delta.days + (self.age_at_placement or 1)
        return 0

    @property
    def age_weeks(self) -> int:
        """Calcule l'âge en semaines (pour mode direct)."""
        return self.age_days // 7


class Section(Base):
    """Sections/compartments within a building."""
    __tablename__ = "sections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(50), nullable=False)
    code = Column(String(20), nullable=True)

    capacity = Column(Integer, nullable=True)
    position = Column(Integer, nullable=True)  # Order in building

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    building = relationship("Building", back_populates="sections")
    lots = relationship("Lot", back_populates="section")
