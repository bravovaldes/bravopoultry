from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class SiteBasic(BaseModel):
    """Infos minimales du site."""
    id: UUID
    name: str

    class Config:
        from_attributes = True


class LotBasic(BaseModel):
    """Infos minimales d'un lot (pour affichage dans bâtiment)."""
    id: UUID
    code: Optional[str] = None
    name: Optional[str] = None
    type: str
    breed: Optional[str] = None
    status: str
    initial_quantity: int
    current_quantity: Optional[int] = None
    placement_date: date
    age_days: int = 0
    age_weeks: int = 0

    class Config:
        from_attributes = True


class BuildingBase(BaseModel):
    name: str
    code: Optional[str] = None
    building_type: str
    tracking_mode: str = "lots"  # Toujours en mode bandes
    capacity: Optional[int] = None
    surface_m2: Optional[Decimal] = None
    ventilation_type: str = "natural"
    has_electricity: bool = True
    has_water: bool = True
    has_generator: bool = False
    feeder_type: Optional[str] = None
    feeder_count: Optional[int] = None
    drinker_type: Optional[str] = None
    drinker_count: Optional[int] = None
    notes: Optional[str] = None


class BuildingCreate(BuildingBase):
    site_id: UUID


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    building_type: Optional[str] = None
    capacity: Optional[int] = None
    surface_m2: Optional[Decimal] = None
    ventilation_type: Optional[str] = None
    has_electricity: Optional[bool] = None
    has_water: Optional[bool] = None
    has_generator: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class BuildingResponse(BuildingBase):
    id: UUID
    site_id: UUID
    is_active: bool
    created_at: datetime
    sections_count: Optional[int] = 0
    active_lots_count: Optional[int] = 0
    current_birds: Optional[int] = 0
    site: Optional[SiteBasic] = None
    lots: List[LotBasic] = []

    class Config:
        from_attributes = True


# Sections
class SectionBase(BaseModel):
    name: str
    code: Optional[str] = None
    capacity: Optional[int] = None
    position: Optional[int] = None


class SectionCreate(SectionBase):
    building_id: UUID


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None


class SectionResponse(SectionBase):
    id: UUID
    building_id: UUID
    is_active: bool
    created_at: datetime
    current_lot_id: Optional[UUID] = None

    class Config:
        from_attributes = True
