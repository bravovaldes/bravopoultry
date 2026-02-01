from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.finance import Expense, Supplier
from app.models.lot import Lot, LotStatus
from app.models.building import Building
from app.schemas.finance import ExpenseCreate, ExpenseUpdate, ExpenseResponse, SupplierCreate, SupplierUpdate, SupplierResponse
from app.core.permissions import Permission, has_permission

router = APIRouter()


@router.get("", response_model=List[ExpenseResponse])
async def get_expenses(
    lot_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses with filters."""
    query = db.query(Expense)

    if lot_id:
        query = query.filter(Expense.lot_id == lot_id)
    if site_id:
        # Include expenses with this site_id OR expenses linked to lots in this site
        # Get lot IDs for this site
        lot_ids_in_site = db.query(Lot.id).join(Building).filter(
            Building.site_id == site_id
        ).all()
        lot_ids_in_site = [l[0] for l in lot_ids_in_site]

        if lot_ids_in_site:
            query = query.filter(
                or_(
                    Expense.site_id == site_id,
                    Expense.lot_id.in_(lot_ids_in_site)
                )
            )
        else:
            query = query.filter(Expense.site_id == site_id)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.order_by(Expense.created_at.desc()).limit(500).all()

    # Get all lot codes in a single query to avoid N+1
    lot_ids = [e.lot_id for e in expenses if e.lot_id]
    lot_codes_map = {}
    if lot_ids:
        lots_data = db.query(Lot.id, Lot.code).filter(
            Lot.id.in_(lot_ids),
            Lot.status != LotStatus.DELETED
        ).all()
        lot_codes_map = {lot_id: code for lot_id, code in lots_data}

    result = []
    for e in expenses:
        expense_data = ExpenseResponse.model_validate(e)
        # Add lot code from pre-fetched map
        if e.lot_id and e.lot_id in lot_codes_map:
            expense_data.lot_code = lot_codes_map[e.lot_id]
        result.append(expense_data)

    return result


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record an expense."""
    # Permission check: owner, manager, and accountant can create expenses
    if not has_permission(current_user, Permission.CREATE_EXPENSE):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent enregistrer des depenses.")

    expense_data = data.model_dump()

    # If supplier_id is provided, fetch supplier name automatically
    if expense_data.get('supplier_id'):
        supplier = db.query(Supplier).filter(Supplier.id == expense_data['supplier_id']).first()
        if supplier:
            expense_data['supplier_name'] = supplier.name

    expense = Expense(**expense_data, recorded_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)

    response = ExpenseResponse.model_validate(expense)
    # Add lot code if linked
    if expense.lot_id:
        lot = db.query(Lot).filter(Lot.id == expense.lot_id, Lot.status != LotStatus.DELETED).first()
        if lot:
            response.lot_code = lot.code

    return response


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an expense."""
    # Permission check: owner, manager, and accountant can edit expenses
    if not has_permission(current_user, Permission.EDIT_EXPENSE):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent modifier les depenses.")

    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    return ExpenseResponse.model_validate(expense)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an expense."""
    # Permission check: owner and manager can delete expenses
    if not has_permission(current_user, Permission.DELETE_EXPENSE):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires et gestionnaires peuvent supprimer des depenses.")

    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted"}


# Suppliers
@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    supplier_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all suppliers."""
    query = db.query(Supplier).filter(
        Supplier.organization_id == current_user.organization_id,
        Supplier.is_active == True
    )

    if supplier_type:
        query = query.filter(Supplier.supplier_type == supplier_type)

    suppliers = query.order_by(Supplier.name).all()
    return [SupplierResponse.model_validate(s) for s in suppliers]


@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier."""
    # Permission check: owner, manager, and accountant can manage suppliers
    if not has_permission(current_user, Permission.MANAGE_SUPPLIERS):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent gerer les fournisseurs.")

    supplier_data = data.model_dump()
    # Set organization_id from current_user if not provided
    if not supplier_data.get('organization_id'):
        supplier_data['organization_id'] = current_user.organization_id
    supplier = Supplier(**supplier_data)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return SupplierResponse.model_validate(supplier)


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    data: SupplierUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a supplier."""
    # Permission check: owner, manager, and accountant can manage suppliers
    if not has_permission(current_user, Permission.MANAGE_SUPPLIERS):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent gerer les fournisseurs.")

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.organization_id == current_user.organization_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)

    return SupplierResponse.model_validate(supplier)
