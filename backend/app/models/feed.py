import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Numeric, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class FeedType(str, enum.Enum):
    STARTER = "starter"  # Démarrage (0-10 days)
    GROWER = "grower"  # Croissance (11-24 days)
    FINISHER = "finisher"  # Finition (25+ days)
    PRE_LAYER = "pre_layer"  # Pré-ponte
    LAYER = "layer"  # Ponte
    BREEDER = "breeder"  # Reproducteurs


class StockMovementType(str, enum.Enum):
    RESTOCK = "restock"  # Réapprovisionnement
    CONSUMPTION = "consumption"  # Consommation
    ADJUSTMENT = "adjustment"  # Ajustement inventaire
    TRANSFER = "transfer"  # Transfert entre sites/bâtiments


class FeedConsumption(Base):
    """Daily feed consumption records."""
    __tablename__ = "feed_consumptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    # Soit lot_id (mode lots) soit building_id (mode direct)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    date = Column(Date, nullable=False)

    feed_type = Column(Enum(FeedType), nullable=True)
    brand = Column(String(100), nullable=True)
    batch_number = Column(String(50), nullable=True)

    quantity_kg = Column(Numeric(10, 2), nullable=False)
    price_per_kg = Column(Numeric(10, 2), nullable=True)
    total_cost = Column(Numeric(12, 2), nullable=True)

    supplier_id = Column(GUID(), ForeignKey("suppliers.id"), nullable=True)

    # Bird count at time of feeding (for calculating feed/bird)
    bird_count = Column(Integer, nullable=True)
    feed_per_bird_g = Column(Numeric(8, 2), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="feed_consumptions")
    supplier = relationship("Supplier")


class WaterConsumption(Base):
    """Daily water consumption records."""
    __tablename__ = "water_consumptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    # Soit lot_id (mode lots) soit building_id (mode direct)
    lot_id = Column(GUID(), ForeignKey("lots.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    date = Column(Date, nullable=False)

    quantity_liters = Column(Numeric(10, 2), nullable=False)

    # Water treatment
    treatment_product = Column(String(100), nullable=True)
    treatment_dose = Column(String(50), nullable=True)

    # Bird count at time
    bird_count = Column(Integer, nullable=True)
    water_per_bird_ml = Column(Numeric(8, 2), nullable=True)

    # Water/Feed ratio (important health indicator)
    water_feed_ratio = Column(Numeric(4, 2), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="water_consumptions")


class FeedStock(Base):
    """Feed inventory at site level."""
    __tablename__ = "feed_stocks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    site_id = Column(GUID(), ForeignKey("sites.id", ondelete="CASCADE"), nullable=True)
    building_id = Column(GUID(), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=True)

    # Location type: 'global' (org level), 'site', or 'building'
    location_type = Column(String(20), default='site')

    feed_type = Column(Enum(FeedType), nullable=False)
    brand = Column(String(100), nullable=True)

    quantity_kg = Column(Numeric(12, 2), nullable=False, default=0)
    min_quantity_kg = Column(Numeric(12, 2), nullable=True, default=100)  # Alert threshold

    price_per_kg = Column(Numeric(10, 2), nullable=True)

    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(Date, nullable=True)

    last_restock_date = Column(Date, nullable=True)
    supplier_name = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    site = relationship("Site", backref="feed_stocks")
    building = relationship("Building", backref="feed_stocks")


class FeedStockMovement(Base):
    """Track all stock movements (restock, consumption, transfers)."""
    __tablename__ = "feed_stock_movements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    stock_id = Column(GUID(), ForeignKey("feed_stocks.id", ondelete="CASCADE"), nullable=False)

    movement_type = Column(Enum(StockMovementType), nullable=False)
    quantity_kg = Column(Numeric(12, 2), nullable=False)  # Positive for restock, negative for consumption

    # For restock
    supplier_name = Column(String(100), nullable=True)
    invoice_number = Column(String(50), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=True)

    # For consumption
    lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    date = Column(Date, default=date.today)

    # Relationships
    stock = relationship("FeedStock", backref="movements")
    lot = relationship("Lot")
