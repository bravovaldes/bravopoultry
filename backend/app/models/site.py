import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Numeric, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.types import GUID


class MemberRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


class Site(Base):
    __tablename__ = "sites"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)

    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=True)  # Site code (e.g., "DLA-01")

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    country = Column(String(100), default="Cameroun")

    gps_latitude = Column(Numeric(10, 8), nullable=True)
    gps_longitude = Column(Numeric(11, 8), nullable=True)

    total_capacity = Column(Numeric(10, 0), nullable=True)
    surface_hectares = Column(Numeric(10, 2), nullable=True)

    is_active = Column(Boolean, default=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="sites")
    members = relationship("SiteMember", back_populates="site")
    buildings = relationship("Building", back_populates="site")
    sales = relationship("Sale", back_populates="site")
    expenses = relationship("Expense", back_populates="site")


class SiteMember(Base):
    __tablename__ = "site_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    site_id = Column(GUID(), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    role = Column(Enum(MemberRole), default=MemberRole.VIEWER)

    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_manage_users = Column(Boolean, default=False)

    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    site = relationship("Site", back_populates="members")
    user = relationship("User", back_populates="site_memberships")
