import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class OrganizationType(str, enum.Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"
    COOPERATIVE = "cooperative"
    GROUP = "group"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    name = Column(String(200), nullable=False)
    type = Column(Enum(OrganizationType), default=OrganizationType.INDIVIDUAL)

    registration_number = Column(String(100), nullable=True)  # RCCM, etc.
    tax_id = Column(String(50), nullable=True)

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), default="Cameroun")

    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)

    logo_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization")
    sites = relationship("Site", back_populates="organization")
