import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Numeric, Text, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class SaleType(str, enum.Enum):
    EGGS_TRAY = "eggs_tray"  # Plateau 30 oeufs
    EGGS_CARTON = "eggs_carton"  # Carton
    LIVE_BIRDS = "live_birds"  # Poulets vifs
    DRESSED_BIRDS = "dressed_birds"  # Poulets abattus
    CULLED_HENS = "culled_hens"  # Poules de réforme
    MANURE = "manure"  # Fiente
    OTHER = "other"


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    PARTIAL = "partial"
    OVERDUE = "overdue"


class Sale(Base):
    """Sales records."""
    __tablename__ = "sales"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)
    site_id = Column(GUID(), ForeignKey("sites.id"), nullable=True)

    date = Column(Date, nullable=False)
    sale_type = Column(Enum(SaleType), nullable=False)

    quantity = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(20), nullable=True)  # "tray", "carton", "kg", "bird"
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=True)

    # Line items for multi-price sales: [{"quantity": 5, "unit_price": 1900, "subtotal": 9500}, ...]
    line_items = Column(JSON, nullable=True)

    # For birds: weight info
    total_weight_kg = Column(Numeric(10, 2), nullable=True)
    average_weight_kg = Column(Numeric(6, 2), nullable=True)

    # Client
    client_id = Column(GUID(), ForeignKey("clients.id"), nullable=True)
    client_name = Column(String(200), nullable=True)  # If no client record
    client_phone = Column(String(20), nullable=True)

    # Payment
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    amount_paid = Column(Numeric(14, 2), default=0)
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)  # "cash", "mobile_money", "bank"

    # Documents
    invoice_number = Column(String(50), nullable=True)
    delivery_note_number = Column(String(50), nullable=True)

    notes = Column(Text, nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="sales")
    site = relationship("Site", back_populates="sales")
    client = relationship("Client", back_populates="sales")


class ExpenseCategory(str, enum.Enum):
    FEED = "feed"
    CHICKS = "chicks"
    VETERINARY = "veterinary"
    MEDICINE = "medicine"  # Legacy alias for veterinary
    LABOR = "labor"
    SALARY = "salary"  # Legacy alias for labor
    ENERGY = "energy"
    UTILITIES = "utilities"  # Legacy alias for energy
    WATER = "water"
    TRANSPORT = "transport"
    PACKAGING = "packaging"
    EQUIPMENT = "equipment"
    MAINTENANCE = "maintenance"
    RENT = "rent"
    INSURANCE = "insurance"
    TAXES = "taxes"
    OTHER = "other"


class Expense(Base):
    """Expense records."""
    __tablename__ = "expenses"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)  # NULL = site-level
    site_id = Column(GUID(), ForeignKey("sites.id"), nullable=True)

    date = Column(Date, nullable=False)
    category = Column(String(50), nullable=False)  # Using String for flexibility with legacy values

    description = Column(String(500), nullable=True)
    quantity = Column(Numeric(12, 2), nullable=True)
    unit = Column(String(20), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)

    supplier_id = Column(GUID(), ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String(200), nullable=True)

    # Payment
    is_paid = Column(Boolean, default=True)
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)

    # Receipt/invoice
    invoice_number = Column(String(50), nullable=True)
    receipt_url = Column(String(500), nullable=True)

    notes = Column(Text, nullable=True)

    # Split tracking - if this expense was created from splitting another lot
    from_split_lot_id = Column(GUID(), ForeignKey("lots.id"), nullable=True)
    original_expense_id = Column(GUID(), ForeignKey("expenses.id"), nullable=True)

    recorded_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lot = relationship("Lot", back_populates="expenses", foreign_keys=[lot_id])
    site = relationship("Site", back_populates="expenses")
    supplier = relationship("Supplier", back_populates="expenses")


class Client(Base):
    """Client/customer records."""
    __tablename__ = "clients"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)

    name = Column(String(200), nullable=False)
    company = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    phone_2 = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)

    client_type = Column(String(50), nullable=True)  # "retailer", "wholesaler", "restaurant", "individual"

    credit_limit = Column(Numeric(14, 2), nullable=True)
    payment_terms_days = Column(Integer, default=0)  # 0 = cash, 30 = net 30, etc.

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sales = relationship("Sale", back_populates="client")


class Supplier(Base):
    """Supplier records."""
    __tablename__ = "suppliers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)

    name = Column(String(200), nullable=False)
    company = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    phone_2 = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)

    supplier_type = Column(String(50), nullable=True)  # "feed", "chicks", "veterinary", "equipment"

    # Rating
    quality_rating = Column(Numeric(3, 1), nullable=True)  # 1-5
    delivery_rating = Column(Numeric(3, 1), nullable=True)
    price_rating = Column(Numeric(3, 1), nullable=True)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    expenses = relationship("Expense", back_populates="supplier")
