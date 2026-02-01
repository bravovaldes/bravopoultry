from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# Building info for site detail (avoid circular import)
class BuildingInSite(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    type: str  # building_type mapped to type
    capacity: int = 0
    current_occupancy: int = 0
    status: str = "active"
    sections_count: int = 0
    active_lots: int = 0

    class Config:
        from_attributes = True


class SiteBase(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: str = "Cameroun"
    gps_latitude: Optional[Decimal] = None
    gps_longitude: Optional[Decimal] = None
    total_capacity: Optional[int] = None
    notes: Optional[str] = None


class SiteCreate(SiteBase):
    organization_id: UUID


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    gps_latitude: Optional[Decimal] = None
    gps_longitude: Optional[Decimal] = None
    total_capacity: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SiteMemberAdd(BaseModel):
    user_id: UUID
    role: str = "viewer"
    can_edit: bool = False
    can_delete: bool = False


class SiteMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role: str
    can_edit: bool
    can_delete: bool
    added_at: datetime

    class Config:
        from_attributes = True


class SiteResponse(SiteBase):
    id: UUID
    organization_id: UUID
    is_active: bool
    created_at: datetime
    buildings_count: Optional[int] = 0
    active_lots_count: Optional[int] = 0
    total_birds: Optional[int] = 0

    class Config:
        from_attributes = True


class SiteWithStats(SiteResponse):
    total_eggs_today: Optional[int] = 0
    mortality_rate: Optional[Decimal] = None
    active_alerts: Optional[int] = 0
    buildings: List[BuildingInSite] = []
