from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class LotBase(BaseModel):
    name: Optional[str] = None
    type: str  # "broiler" or "layer"
    breed: Optional[str] = None
    supplier: Optional[str] = None
    initial_quantity: int = Field(..., gt=0)
    placement_date: date
    age_at_placement: int = 1
    expected_end_date: Optional[date] = None
    chick_price_unit: Optional[Decimal] = None
    transport_cost: Optional[Decimal] = None
    target_weight_g: Optional[int] = None
    target_fcr: Optional[Decimal] = None
    target_laying_rate: Optional[Decimal] = None
    notes: Optional[str] = None


class LotCreate(LotBase):
    building_id: Optional[UUID] = None
    section_id: Optional[UUID] = None


class LotUpdate(BaseModel):
    name: Optional[str] = None
    building_id: Optional[UUID] = None
    breed: Optional[str] = None
    supplier: Optional[str] = None
    current_quantity: Optional[int] = None
    age_at_placement: Optional[int] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    transfer_to_laying_date: Optional[date] = None
    first_egg_date: Optional[date] = None
    chick_price_unit: Optional[Decimal] = None
    transport_cost: Optional[Decimal] = None
    target_weight_g: Optional[int] = None
    target_fcr: Optional[Decimal] = None
    target_laying_rate: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LotStatsResponse(BaseModel):
    # Mortality
    total_mortality: int = 0
    mortality_rate: Decimal = Decimal("0")

    # Eggs (layers)
    total_eggs: int = 0
    average_laying_rate: Decimal = Decimal("0")
    peak_laying_rate: Decimal = Decimal("0")
    eggs_per_hen_housed: Decimal = Decimal("0")

    # Weight (broilers)
    current_weight_g: Optional[Decimal] = None
    daily_gain_g: Optional[Decimal] = None
    uniformity: Optional[Decimal] = None

    # Feed
    total_feed_kg: Decimal = Decimal("0")
    feed_conversion_ratio: Optional[Decimal] = None
    feed_per_egg: Optional[Decimal] = None

    # Financial
    total_expenses: Decimal = Decimal("0")
    total_sales: Decimal = Decimal("0")
    gross_margin: Decimal = Decimal("0")
    cost_per_kg: Optional[Decimal] = None
    cost_per_egg: Optional[Decimal] = None

    # Score
    performance_score: Optional[Decimal] = None

    class Config:
        from_attributes = True


class LotResponse(LotBase):
    id: UUID
    code: Optional[str] = None
    building_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    building_name: Optional[str] = None
    site_name: Optional[str] = None
    current_quantity: Optional[int] = None
    status: str
    age_days: int
    age_weeks: int
    created_at: datetime
    stats: Optional[LotStatsResponse] = None
    # Split lot info
    parent_lot_id: Optional[UUID] = None
    split_date: Optional[date] = None
    split_ratio: Optional[Decimal] = None

    class Config:
        from_attributes = True


class LotSummary(BaseModel):
    """Lightweight lot info for lists."""
    id: UUID
    code: Optional[str] = None
    name: Optional[str] = None
    type: str
    breed: Optional[str] = None
    current_quantity: Optional[int] = None
    initial_quantity: Optional[int] = None
    age_days: int
    status: str
    building_id: Optional[UUID] = None
    building_name: Optional[str] = None
    site_id: Optional[UUID] = None
    site_name: Optional[str] = None
    # Financial fields for analytics
    chick_price_unit: Optional[Decimal] = None
    transport_cost: Optional[Decimal] = None
    other_initial_costs: Optional[Decimal] = None
    # Date for period filtering
    placement_date: Optional[date] = None

    class Config:
        from_attributes = True


class LotDailyEntry(BaseModel):
    """Combined daily entry for quick data input."""
    date: date

    # Mortality
    mortality_count: Optional[int] = 0
    mortality_cause: Optional[str] = None

    # Eggs (layers)
    eggs_normal: Optional[int] = 0
    eggs_cracked: Optional[int] = 0
    eggs_dirty: Optional[int] = 0
    eggs_small: Optional[int] = 0

    # Weight (broilers)
    average_weight_g: Optional[Decimal] = None
    sample_size: Optional[int] = None

    # Feed
    feed_quantity_kg: Optional[Decimal] = None
    feed_type: Optional[str] = None
    feed_stock_id: Optional[UUID] = None  # Stock to deduct from (optional)
    deduct_from_stock: bool = False  # Whether to deduct feed from stock

    # Water
    water_liters: Optional[Decimal] = None

    notes: Optional[str] = None


class LotSplitRequest(BaseModel):
    """Request to split a lot into a new lot."""
    quantity: int = Field(..., gt=0, description="Number of birds to transfer to new lot")
    target_building_id: UUID = Field(..., description="Building ID for the new split lot")
    new_lot_name: Optional[str] = Field(None, description="Optional name for the new lot")
    distribute_expenses: bool = Field(True, description="Whether to distribute past expenses proportionally")
    notes: Optional[str] = Field(None, description="Notes about the split")


class LotSplitResponse(BaseModel):
    """Response after splitting a lot."""
    original_lot_id: UUID
    original_lot_code: str
    original_lot_remaining_quantity: int
    new_lot_id: UUID
    new_lot_code: str
    new_lot_quantity: int
    split_ratio: Decimal
    expenses_transferred: Decimal
    message: str
