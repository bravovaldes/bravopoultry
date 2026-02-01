from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


# Nested Lot info for responses
class LotInfo(BaseModel):
    id: UUID
    code: str
    type: Optional[str] = None

    class Config:
        from_attributes = True


# Egg Production
class EggProductionBase(BaseModel):
    date: date
    normal_eggs: int = 0
    cracked_eggs: int = 0
    dirty_eggs: int = 0
    small_eggs: int = 0
    double_yolk_eggs: int = 0
    soft_shell_eggs: int = 0
    eggs_size_s: int = 0
    eggs_size_m: int = 0
    eggs_size_l: int = 0
    eggs_size_xl: int = 0
    hen_count: Optional[int] = None
    avg_egg_weight_g: Optional[Decimal] = None
    notes: Optional[str] = None


class EggProductionCreate(EggProductionBase):
    lot_id: UUID


class EggProductionUpdate(BaseModel):
    normal_eggs: Optional[int] = None
    cracked_eggs: Optional[int] = None
    dirty_eggs: Optional[int] = None
    small_eggs: Optional[int] = None
    double_yolk_eggs: Optional[int] = None
    soft_shell_eggs: Optional[int] = None
    hen_count: Optional[int] = None
    notes: Optional[str] = None


class EggProductionResponse(EggProductionBase):
    id: UUID
    lot_id: UUID
    total_eggs: int
    sellable_eggs: int
    laying_rate: Optional[Decimal] = None
    created_at: datetime
    lot: Optional[LotInfo] = None

    class Config:
        from_attributes = True


# Weight Records
class WeightRecordBase(BaseModel):
    date: date
    average_weight_g: Decimal
    sample_size: Optional[int] = None
    min_weight_g: Optional[Decimal] = None
    max_weight_g: Optional[Decimal] = None
    std_deviation: Optional[Decimal] = None
    notes: Optional[str] = None


class WeightRecordCreate(WeightRecordBase):
    lot_id: UUID


class WeightRecordResponse(WeightRecordBase):
    id: UUID
    lot_id: UUID
    age_days: Optional[int] = None
    uniformity_cv: Optional[Decimal] = None
    standard_weight_g: Optional[Decimal] = None
    weight_vs_standard: Optional[Decimal] = None
    created_at: datetime
    lot: Optional[LotInfo] = None

    class Config:
        from_attributes = True


# Mortality
class MortalityBase(BaseModel):
    date: date
    quantity: int
    cause: str = "unknown"
    symptoms: Optional[str] = None
    suspected_disease: Optional[str] = None
    notes: Optional[str] = None


class MortalityCreate(MortalityBase):
    lot_id: UUID


class MortalityResponse(MortalityBase):
    id: UUID
    lot_id: UUID
    photo_urls: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
