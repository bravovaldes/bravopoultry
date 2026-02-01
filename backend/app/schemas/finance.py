from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


# Sales
class SaleLineItem(BaseModel):
    """A single line item in a multi-price sale."""
    quantity: Decimal
    unit_price: Decimal
    subtotal: Optional[Decimal] = None  # Calculated: quantity * unit_price


class SaleBase(BaseModel):
    date: date
    sale_type: str
    quantity: Decimal
    unit: Optional[str] = None
    unit_price: Decimal
    total_weight_kg: Optional[Decimal] = None
    average_weight_kg: Optional[Decimal] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    payment_status: str = "pending"
    amount_paid: Decimal = Decimal("0")
    payment_method: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    line_items: Optional[List[SaleLineItem]] = None  # For multi-price sales


class SaleCreate(SaleBase):
    lot_id: Optional[UUID] = None
    site_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    deduct_from_stock: bool = False  # Whether to deduct quantity from egg production


class SaleUpdate(BaseModel):
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    payment_status: Optional[str] = None
    amount_paid: Optional[Decimal] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class SaleResponse(SaleBase):
    id: UUID
    lot_id: Optional[UUID] = None
    lot_code: Optional[str] = None  # For display
    site_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    total_amount: Decimal
    payment_date: Optional[date] = None
    delivery_note_number: Optional[str] = None
    created_at: datetime
    line_items: Optional[List[SaleLineItem]] = None  # For multi-price sales

    class Config:
        from_attributes = True


# Expenses
class ExpenseBase(BaseModel):
    date: date
    category: str
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    amount: Decimal
    supplier_name: Optional[str] = None
    is_paid: bool = True
    payment_method: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    lot_id: Optional[UUID] = None
    site_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    is_paid: Optional[bool] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    lot_id: Optional[UUID] = None
    lot_code: Optional[str] = None  # For display
    site_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    payment_date: Optional[date] = None
    receipt_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Clients
class ClientCreate(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    client_type: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[int] = 0
    notes: Optional[str] = None
    organization_id: Optional[UUID] = None  # Will be set from current_user if not provided


class ClientBase(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    client_type: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: int = 0
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    client_type: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    id: UUID
    organization_id: UUID
    is_active: bool
    created_at: datetime
    total_purchases: Optional[Decimal] = None
    outstanding_balance: Optional[Decimal] = None

    class Config:
        from_attributes = True


# Suppliers
class SupplierBase(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    supplier_type: Optional[str] = None
    quality_rating: Optional[Decimal] = None
    delivery_rating: Optional[Decimal] = None
    price_rating: Optional[Decimal] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    organization_id: Optional[UUID] = None  # Will be set from current_user if not provided


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    phone_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    supplier_type: Optional[str] = None
    quality_rating: Optional[Decimal] = None
    delivery_rating: Optional[Decimal] = None
    price_rating: Optional[Decimal] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: UUID
    organization_id: UUID
    is_active: bool
    created_at: datetime
    total_purchases: Optional[Decimal] = None

    class Config:
        from_attributes = True


# Financial Summary
class FinancialSummary(BaseModel):
    period_start: date
    period_end: date

    total_sales: Decimal = Decimal("0")
    total_expenses: Decimal = Decimal("0")
    gross_margin: Decimal = Decimal("0")
    margin_percentage: Optional[Decimal] = None

    # Breakdown
    sales_by_type: Optional[dict] = None
    expenses_by_category: Optional[dict] = None

    # Receivables
    total_receivables: Decimal = Decimal("0")
    overdue_receivables: Decimal = Decimal("0")

    # Payables
    total_payables: Decimal = Decimal("0")


class LotProfitability(BaseModel):
    lot_id: UUID
    lot_code: Optional[str] = None
    lot_type: str

    # Revenue
    total_sales: Decimal
    sales_quantity: Decimal

    # Costs
    chick_cost: Decimal
    feed_cost: Decimal
    health_cost: Decimal
    labor_cost: Decimal
    other_costs: Decimal
    total_costs: Decimal

    # Profit
    gross_profit: Decimal
    profit_margin: Optional[Decimal] = None

    # Unit economics
    cost_per_bird: Optional[Decimal] = None
    cost_per_kg: Optional[Decimal] = None
    cost_per_egg: Optional[Decimal] = None
    revenue_per_bird: Optional[Decimal] = None
