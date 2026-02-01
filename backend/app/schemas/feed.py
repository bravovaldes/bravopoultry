from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, date as date_type
from decimal import Decimal


# Feed Consumption
class FeedConsumptionBase(BaseModel):
    date: date_type
    feed_type: Optional[str] = None
    brand: Optional[str] = None
    batch_number: Optional[str] = None
    quantity_kg: Decimal
    price_per_kg: Optional[Decimal] = None
    bird_count: Optional[int] = None
    notes: Optional[str] = None


class FeedConsumptionCreate(FeedConsumptionBase):
    lot_id: UUID
    supplier_id: Optional[UUID] = None


class FeedConsumptionResponse(FeedConsumptionBase):
    id: UUID
    lot_id: UUID
    total_cost: Optional[Decimal] = None
    feed_per_bird_g: Optional[Decimal] = None
    supplier_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Water Consumption
class WaterConsumptionBase(BaseModel):
    date: date_type
    quantity_liters: Decimal
    treatment_product: Optional[str] = None
    treatment_dose: Optional[str] = None
    bird_count: Optional[int] = None
    notes: Optional[str] = None


class WaterConsumptionCreate(WaterConsumptionBase):
    lot_id: UUID


class WaterConsumptionResponse(WaterConsumptionBase):
    id: UUID
    lot_id: UUID
    water_per_bird_ml: Optional[Decimal] = None
    water_feed_ratio: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Feed Stock
class FeedStockBase(BaseModel):
    feed_type: str
    brand: Optional[str] = None
    quantity_kg: Decimal = Decimal("0")
    min_quantity_kg: Optional[Decimal] = Decimal("100")
    price_per_kg: Optional[Decimal] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date_type] = None


class FeedStockCreate(FeedStockBase):
    location_type: str = "site"  # global, site, building
    organization_id: Optional[UUID] = None
    site_id: Optional[UUID] = None
    building_id: Optional[UUID] = None
    supplier_name: Optional[str] = None


class FeedStockUpdate(BaseModel):
    quantity_kg: Optional[Decimal] = None
    min_quantity_kg: Optional[Decimal] = None
    price_per_kg: Optional[Decimal] = None
    supplier_name: Optional[str] = None


class FeedStockResponse(FeedStockBase):
    id: UUID
    location_type: str = "site"
    organization_id: Optional[UUID] = None
    site_id: Optional[UUID] = None
    building_id: Optional[UUID] = None
    last_restock_date: Optional[date_type] = None
    supplier_name: Optional[str] = None
    updated_at: datetime

    # Computed fields for display
    site_name: Optional[str] = None
    building_name: Optional[str] = None

    class Config:
        from_attributes = True


# Stock Movement
class FeedStockMovementBase(BaseModel):
    movement_type: str  # restock, consumption, adjustment, transfer
    quantity_kg: Decimal
    supplier_name: Optional[str] = None
    invoice_number: Optional[str] = None
    unit_price: Optional[Decimal] = None
    notes: Optional[str] = None
    date: Optional[date_type] = None


class FeedStockMovementCreate(FeedStockMovementBase):
    stock_id: Optional[UUID] = None
    lot_id: Optional[UUID] = None

    # For creating stock + movement in one call (restock)
    feed_type: Optional[str] = None
    location_type: Optional[str] = None
    site_id: Optional[UUID] = None
    building_id: Optional[UUID] = None


class FeedStockMovementResponse(BaseModel):
    id: UUID
    stock_id: UUID
    movement_type: str
    quantity_kg: Decimal
    supplier_name: Optional[str] = None
    invoice_number: Optional[str] = None
    unit_price: Optional[Decimal] = None
    notes: Optional[str] = None
    date: Optional[date_type] = None
    total_amount: Optional[Decimal] = None
    lot_id: Optional[UUID] = None
    created_at: datetime

    # For display
    feed_type: Optional[str] = None
    lot_code: Optional[str] = None

    class Config:
        from_attributes = True


# Restock request
class RestockRequest(BaseModel):
    feed_type: str
    quantity_kg: Decimal
    unit_price: Optional[Decimal] = None
    supplier_name: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

    # Location
    location_type: str = "global"  # global, site, building
    site_id: Optional[UUID] = None
    building_id: Optional[UUID] = None
