from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
import os

from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.finance import Sale, Client, SaleType
from app.models.production import EggProduction
from app.models.lot import Lot
from app.models.building import Building
from app.schemas.finance import SaleCreate, SaleUpdate, SaleResponse, ClientCreate, ClientUpdate, ClientResponse
from app.core.permissions import Permission, has_permission

router = APIRouter()


# Request model for sending invoice email
class SendInvoiceEmailRequest(BaseModel):
    email: Optional[str] = None


# Stock d'oeufs disponible par site - retourne le nom du site
@router.get("/eggs-stock")
async def get_eggs_stock(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available eggs stock per site (produced - sold) - optimized with aggregated queries."""
    from app.models.lot import LotType, LotStatus
    from app.models.site import Site

    # Get all sites for the organization
    sites = db.query(Site).filter(
        Site.organization_id == current_user.organization_id,
        Site.is_active == True
    ).all()

    if not sites:
        return []

    site_ids = [s.id for s in sites]

    # Get layer lots count per site in a single query
    lots_count_query = db.query(
        Building.site_id,
        func.count(Lot.id).label('lots_count')
    ).join(Lot, Lot.building_id == Building.id).filter(
        Building.site_id.in_(site_ids),
        Building.is_active == True,
        Lot.type == LotType.LAYER,
        Lot.status == LotStatus.ACTIVE
    ).group_by(Building.site_id).all()

    lots_count_map = {row.site_id: row.lots_count for row in lots_count_query}

    # Get egg production totals grouped by site (via lot -> building -> site)
    prod_query = db.query(
        Building.site_id,
        func.coalesce(func.sum(EggProduction.sellable_eggs), 0).label('total_produced')
    ).join(Lot, Lot.id == EggProduction.lot_id).join(
        Building, Building.id == Lot.building_id
    ).filter(
        Building.site_id.in_(site_ids),
        Building.is_active == True,
        Lot.type == LotType.LAYER,
        Lot.status == LotStatus.ACTIVE
    ).group_by(Building.site_id).all()

    production_by_site = {row.site_id: int(row.total_produced) for row in prod_query}

    # Get egg sales totals grouped by site - use SQL CASE for carton conversion
    sales_by_site = db.query(
        Sale.site_id,
        func.sum(
            case(
                (Sale.sale_type == SaleType.EGGS_CARTON, Sale.quantity * 12),  # 1 carton = 12 trays
                else_=Sale.quantity
            )
        ).label('total_trays')
    ).filter(
        Sale.site_id.in_(site_ids),
        Sale.sale_type.in_([SaleType.EGGS_TRAY, SaleType.EGGS_CARTON])
    ).group_by(Sale.site_id).all()

    sales_map = {row.site_id: int(row.total_trays or 0) for row in sales_by_site}

    # Build results
    result = []
    for site in sites:
        lots_count = lots_count_map.get(site.id, 0)
        if lots_count == 0:
            continue

        total_produced = production_by_site.get(site.id, 0)
        total_sold_trays = sales_map.get(site.id, 0)
        total_sold_eggs = total_sold_trays * 30

        available_eggs = total_produced - total_sold_eggs
        available_trays = available_eggs // 30

        result.append({
            "site_id": str(site.id),
            "site_name": site.name or f"Site {site.code or str(site.id)[:8]}",
            "total_produced": total_produced,
            "total_sold_eggs": total_sold_eggs,
            "available_eggs": available_eggs,
            "available_trays": available_trays,
            "lots_count": lots_count,
        })

    return result


@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    lot_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    payment_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sales with filters."""
    from app.models.site import Site
    from app.models.lot import Lot
    from app.models.building import Building

    query = db.query(Sale)

    if lot_id:
        query = query.filter(Sale.lot_id == lot_id)
    if site_id:
        # Include sales with this site_id OR sales linked to lots in this site
        lot_ids_in_site = db.query(Lot.id).join(Building).filter(
            Building.site_id == site_id
        ).all()
        lot_ids_in_site = [l[0] for l in lot_ids_in_site]

        if lot_ids_in_site:
            query = query.filter(
                or_(
                    Sale.site_id == site_id,
                    Sale.lot_id.in_(lot_ids_in_site)
                )
            )
        else:
            query = query.filter(Sale.site_id == site_id)
    if client_id:
        query = query.filter(Sale.client_id == client_id)
    if start_date:
        query = query.filter(Sale.date >= start_date)
    if end_date:
        query = query.filter(Sale.date <= end_date)
    if payment_status:
        query = query.filter(Sale.payment_status == payment_status)

    sales = query.order_by(Sale.created_at.desc()).limit(500).all()

    # Get all lot codes in a single query to avoid N+1
    lot_ids = [s.lot_id for s in sales if s.lot_id]
    lot_codes_map = {}
    if lot_ids:
        lots_data = db.query(Lot.id, Lot.code).filter(
            Lot.id.in_(lot_ids),
            Lot.status != "deleted"
        ).all()
        lot_codes_map = {lot_id: code for lot_id, code in lots_data}

    result = []
    for s in sales:
        sale_data = SaleResponse.model_validate(s)
        # Add lot code from pre-fetched map
        if s.lot_id and s.lot_id in lot_codes_map:
            sale_data.lot_code = lot_codes_map[s.lot_id]
        result.append(sale_data)

    return result


@router.post("/", response_model=SaleResponse)
async def create_sale(
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a sale with invoice generation and optional stock deduction."""
    # Permission check: owner, manager, and accountant can create sales
    if not has_permission(current_user, Permission.CREATE_SALE):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent enregistrer des ventes.")

    from app.services.invoice import generate_invoice_pdf, generate_invoice_number
    from app.models.organization import Organization
    import uuid as uuid_module

    # Generate sale ID upfront for invoice number
    sale_id = uuid_module.uuid4()

    # Prepare sale data (exclude deduct_from_stock which is not a model field)
    # Also handle line_items separately as it needs to be converted to dict list
    sale_data = data.model_dump(exclude={'deduct_from_stock', 'line_items'})
    sale = Sale(id=sale_id, **sale_data, recorded_by=current_user.id)

    # Handle line items for multi-price sales
    if data.line_items and len(data.line_items) > 0:
        # Calculate subtotals and total from line items
        line_items_dict = []
        total_from_lines = Decimal(0)
        total_quantity = Decimal(0)

        for item in data.line_items:
            subtotal = item.quantity * item.unit_price
            line_items_dict.append({
                'quantity': float(item.quantity),
                'unit_price': float(item.unit_price),
                'subtotal': float(subtotal)
            })
            total_from_lines += subtotal
            total_quantity += item.quantity

        sale.line_items = line_items_dict
        sale.total_amount = total_from_lines
        sale.quantity = total_quantity
        # Set unit_price as weighted average for reference
        sale.unit_price = total_from_lines / total_quantity if total_quantity > 0 else data.unit_price
    else:
        # Standard single-price sale
        sale.total_amount = data.quantity * data.unit_price

    # Generate invoice number
    sale_date = datetime.combine(data.date, datetime.min.time())
    invoice_number = generate_invoice_number(str(sale_id), sale_date)
    sale.invoice_number = invoice_number

    # Stock deduction for egg sales (1 carton = 12 plateaux, 1 plateau = 30 oeufs)
    if data.deduct_from_stock and data.site_id and data.sale_type in ['eggs_tray', 'eggs_carton']:
        from app.models.lot import LotType, LotStatus

        # Get all layer lots in this site
        buildings = db.query(Building).filter(Building.site_id == data.site_id, Building.is_active == True).all()
        building_ids = [b.id for b in buildings]

        if building_ids:
            lots = db.query(Lot).filter(
                Lot.building_id.in_(building_ids),
                Lot.type == LotType.LAYER,
                Lot.status == LotStatus.ACTIVE
            ).all()
            lot_ids = [lot.id for lot in lots]

            if lot_ids:
                # Total eggs produced
                total_produced = db.query(func.sum(EggProduction.sellable_eggs)).filter(
                    EggProduction.lot_id.in_(lot_ids)
                ).scalar() or 0

                # Calculate total sold: consider cartons vs trays
                # Query previous sales to calculate properly
                previous_sales = db.query(Sale).filter(
                    Sale.site_id == data.site_id,
                    Sale.sale_type.in_([SaleType.EGGS_TRAY, SaleType.EGGS_CARTON])
                ).all()

                total_sold_trays = Decimal(0)
                for s in previous_sales:
                    if s.sale_type == SaleType.EGGS_CARTON:
                        total_sold_trays += Decimal(str(s.quantity)) * 12  # 1 carton = 12 plateaux
                    else:
                        total_sold_trays += Decimal(str(s.quantity))

                available_trays = int(Decimal(str(total_produced)) / 30) - int(total_sold_trays)

                # Calculate requested trays
                if data.sale_type == 'eggs_carton':
                    requested_trays = int(data.quantity * 12)  # 1 carton = 12 plateaux
                else:
                    requested_trays = int(data.quantity)

                if requested_trays > available_trays:
                    available_cartons = available_trays // 12
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuffisant. Disponible: {available_trays} plateaux ({available_cartons} cartons)"
                    )

    # Stock deduction for bird sales
    if data.deduct_from_stock and data.lot_id and data.sale_type in ['live_birds', 'dressed_birds', 'culled_hens']:
        lot = db.query(Lot).filter(Lot.id == data.lot_id, Lot.status != "deleted").first()
        if lot:
            available_birds = lot.current_quantity or lot.initial_quantity or 0
            requested_birds = int(data.quantity)

            if requested_birds > available_birds:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuffisant. Disponible: {available_birds} poulets"
                )

            # Deduct from lot stock
            lot.current_quantity = available_birds - requested_birds

    db.add(sale)
    db.commit()
    db.refresh(sale)

    # Get organization info for invoice
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    org_name = org.name if org else "BravoPoultry"

    # Get client info
    client = None
    if data.client_id:
        client = db.query(Client).filter(Client.id == data.client_id).first()

    client_name = data.client_name or (client.name if client else "Client anonyme")
    client_phone = data.client_phone or (client.phone if client else None)
    client_address = client.address if client else None

    # Get sale type label
    sale_type_labels = {
        'eggs_tray': 'Plateaux d\'oeufs (30 oeufs)',
        'eggs_carton': 'Cartons d\'oeufs',
        'live_birds': 'Volailles vivantes',
        'dressed_birds': 'Volailles abattues',
        'culled_hens': 'Poules de reforme',
        'manure': 'Fiente',
        'other': 'Autre',
    }

    # Build invoice items - use line_items if available for multi-price sales
    invoice_items = []
    if sale.line_items and len(sale.line_items) > 0:
        # Multi-price sale: create one item per line
        for i, line in enumerate(sale.line_items, 1):
            invoice_items.append({
                'name': f"{sale_type_labels.get(data.sale_type, data.sale_type)} (Ligne {i})",
                'quantity': float(line.get('quantity', 0)),
                'unit': data.unit or 'unite',
                'unit_price': float(line.get('unit_price', 0)),
                'total': float(line.get('subtotal', 0)),
            })
    else:
        # Single-price sale: one item
        invoice_items.append({
            'name': sale_type_labels.get(data.sale_type, data.sale_type),
            'quantity': float(round(Decimal(str(data.quantity)), 2)),
            'unit': data.unit or 'unite',
            'unit_price': float(round(Decimal(str(data.unit_price)), 2)),
            'total': float(round(Decimal(str(sale.total_amount)), 2)),
        })

    # Generate invoice PDF
    try:
        generate_invoice_pdf(
            sale_id=str(sale.id),
            invoice_number=invoice_number,
            sale_date=sale_date,
            client_name=client_name,
            client_phone=client_phone,
            client_address=client_address,
            items=invoice_items,
            total_amount=Decimal(str(sale.total_amount)),
            amount_paid=data.amount_paid,
            payment_status=data.payment_status,
            organization_name=org_name,
            notes=data.notes,
        )
    except Exception as e:
        print(f"Error generating invoice: {e}")
        # Continue even if invoice generation fails

    response = SaleResponse.model_validate(sale)
    # Add lot code if linked
    if sale.lot_id:
        lot = db.query(Lot).filter(Lot.id == sale.lot_id, Lot.status != "deleted").first()
        if lot:
            response.lot_code = lot.code

    return response


@router.get("/invoice/{invoice_number}")
async def download_invoice(
    invoice_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an invoice PDF."""
    from app.services.invoice import get_invoice_path

    # Verify the sale exists and belongs to user's organization
    sale = db.query(Sale).filter(Sale.invoice_number == invoice_number).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Facture non trouvee")

    filepath = get_invoice_path(invoice_number)
    if not filepath:
        raise HTTPException(status_code=404, detail="Fichier de facture non trouve")

    return FileResponse(
        filepath,
        media_type='application/pdf',
        filename=f"{invoice_number}.pdf"
    )


@router.post("/invoice/{invoice_number}/send-email")
async def send_invoice_email(
    invoice_number: str,
    request: SendInvoiceEmailRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an invoice by email with PDF attachment."""
    from app.services.invoice import get_invoice_path
    from app.services.email import email_service
    from app.models.organization import Organization

    # Get email from request body
    email = request.email if request else None

    # Verify the sale exists
    sale = db.query(Sale).filter(Sale.invoice_number == invoice_number).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Facture non trouvee")

    filepath = get_invoice_path(invoice_number)
    if not filepath:
        raise HTTPException(status_code=404, detail="Fichier de facture non trouve")

    # Get client info
    client = None
    client_name = sale.client_name or "Client"
    if sale.client_id:
        client = db.query(Client).filter(Client.id == sale.client_id).first()
        if client:
            client_name = client.name
            if not email:
                email = client.email

    if not email:
        raise HTTPException(status_code=400, detail="Aucune adresse email fournie")

    # Get organization name
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    organization_name = organization.name if organization else "BravoPoultry"

    # Format amount
    total_amount = f"{int(sale.total_amount or 0):,} FCFA".replace(",", " ")

    # Send email with invoice
    success = email_service.send_invoice_email(
        to_email=email,
        client_name=client_name,
        invoice_number=invoice_number,
        invoice_filepath=filepath,
        total_amount=total_amount,
        payment_status=sale.payment_status.value if sale.payment_status else "pending",
        organization_name=organization_name
    )

    if not success:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")

    return {
        "message": "Facture envoyee par email avec succes",
        "invoice_number": invoice_number,
        "email": email
    }


@router.patch("/{sale_id}", response_model=SaleResponse)
async def update_sale(
    sale_id: UUID,
    data: SaleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a sale."""
    # Permission check: owner, manager, and accountant can edit sales
    if not has_permission(current_user, Permission.EDIT_SALE):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent modifier les ventes.")

    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sale, field, value)

    # Recalculate total if quantity or price changed
    if 'quantity' in update_data or 'unit_price' in update_data:
        sale.total_amount = Decimal(str(sale.quantity)) * Decimal(str(sale.unit_price))

    db.commit()
    db.refresh(sale)

    return SaleResponse.model_validate(sale)


@router.post("/{sale_id}/payment")
async def record_payment(
    sale_id: UUID,
    amount: Decimal,
    payment_method: str = "cash",
    regenerate_invoice: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a payment for a sale and optionally regenerate the invoice."""
    # Permission check: owner, manager, and accountant can record payments
    if not has_permission(current_user, Permission.RECORD_PAYMENT):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent enregistrer des paiements.")

    from app.services.invoice import generate_invoice_pdf
    from app.models.organization import Organization

    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    sale.amount_paid = Decimal(str(sale.amount_paid or 0)) + Decimal(str(amount))
    sale.payment_method = payment_method
    sale.payment_date = date.today()

    # Update status
    if sale.amount_paid >= sale.total_amount:
        sale.payment_status = "paid"
    elif sale.amount_paid > 0:
        sale.payment_status = "partial"

    db.commit()
    db.refresh(sale)

    # Regenerate invoice with updated payment info
    if regenerate_invoice and sale.invoice_number:
        try:
            # Get organization info
            org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
            org_name = org.name if org else "BravoPoultry"

            # Get client info
            client = None
            if sale.client_id:
                client = db.query(Client).filter(Client.id == sale.client_id).first()

            client_name = sale.client_name or (client.name if client else "Client anonyme")
            client_phone = sale.client_phone or (client.phone if client else None)
            client_address = client.address if client else None

            # Sale type labels
            sale_type_labels = {
                'eggs_tray': 'Plateaux d\'oeufs (30 oeufs)',
                'eggs_carton': 'Cartons d\'oeufs (12 plateaux)',
                'live_birds': 'Volailles vivantes',
                'dressed_birds': 'Volailles abattues',
                'culled_hens': 'Poules de reforme',
                'manure': 'Fiente',
                'other': 'Autre',
            }

            sale_date = datetime.combine(sale.date, datetime.min.time())

            # Build invoice items - use line_items if available for multi-price sales
            invoice_items = []
            sale_type_value = sale.sale_type.value if hasattr(sale.sale_type, 'value') else sale.sale_type
            if sale.line_items and len(sale.line_items) > 0:
                # Multi-price sale: create one item per line
                for i, line in enumerate(sale.line_items, 1):
                    invoice_items.append({
                        'name': f"{sale_type_labels.get(sale_type_value, str(sale.sale_type))} (Ligne {i})",
                        'quantity': float(line.get('quantity', 0)),
                        'unit': sale.unit or 'unite',
                        'unit_price': float(line.get('unit_price', 0)),
                        'total': float(line.get('subtotal', 0)),
                    })
            else:
                # Single-price sale: one item
                invoice_items.append({
                    'name': sale_type_labels.get(sale_type_value, str(sale.sale_type)),
                    'quantity': float(round(Decimal(str(sale.quantity)), 2)),
                    'unit': sale.unit or 'unite',
                    'unit_price': float(round(Decimal(str(sale.unit_price)), 2)),
                    'total': float(round(Decimal(str(sale.total_amount)), 2)),
                })

            # Regenerate the PDF
            generate_invoice_pdf(
                sale_id=str(sale.id),
                invoice_number=sale.invoice_number,
                sale_date=sale_date,
                client_name=client_name,
                client_phone=client_phone,
                client_address=client_address,
                items=invoice_items,
                total_amount=Decimal(str(sale.total_amount)),
                amount_paid=Decimal(str(sale.amount_paid)),
                payment_status=sale.payment_status,
                organization_name=org_name,
                notes=sale.notes,
            )
        except Exception as e:
            # Log error but continue
            print(f"Error regenerating invoice: {e}")
            # Continue even if invoice regeneration fails

    return {
        "message": "Paiement enregistre",
        "amount_paid": float(round(Decimal(str(sale.amount_paid)), 2)),
        "total_amount": float(round(Decimal(str(sale.total_amount)), 2)),
        "remaining": float(round(Decimal(str(sale.total_amount)) - Decimal(str(sale.amount_paid)), 2)),
        "status": sale.payment_status,
        "invoice_number": sale.invoice_number,
        "invoice_regenerated": regenerate_invoice
    }


# Clients
@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all clients with their purchase statistics using optimized query."""
    clients = db.query(Client).filter(
        Client.organization_id == current_user.organization_id,
        Client.is_active == True
    ).order_by(Client.name).all()

    # Get all client stats in a single aggregated query
    client_ids = [c.id for c in clients]
    stats_map = {}
    if client_ids:
        stats_query = db.query(
            Sale.client_id,
            func.coalesce(func.sum(Sale.total_amount), 0).label('total_purchases'),
            func.coalesce(func.sum(Sale.amount_paid), 0).label('total_paid')
        ).filter(
            Sale.client_id.in_(client_ids)
        ).group_by(Sale.client_id).all()

        stats_map = {
            row.client_id: {
                'total_purchases': Decimal(str(row.total_purchases)),
                'total_paid': Decimal(str(row.total_paid))
            }
            for row in stats_query
        }

    # Build responses with pre-fetched stats
    results = []
    for client in clients:
        stats = stats_map.get(client.id, {'total_purchases': Decimal(0), 'total_paid': Decimal(0)})
        total_purchases = stats['total_purchases']
        outstanding_balance = total_purchases - stats['total_paid']

        response = ClientResponse.model_validate(client)
        response.total_purchases = total_purchases
        response.outstanding_balance = outstanding_balance
        results.append(response)

    return results


@router.post("/clients", response_model=ClientResponse)
async def create_client(
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new client."""
    # Permission check: owner, manager, and accountant can manage clients
    if not has_permission(current_user, Permission.MANAGE_CLIENTS):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent gerer les clients.")

    client_data = data.model_dump()
    # Set organization_id from current_user if not provided
    if not client_data.get('organization_id'):
        client_data['organization_id'] = current_user.organization_id
    client = Client(**client_data)
    db.add(client)
    db.commit()
    db.refresh(client)

    return ClientResponse.model_validate(client)


@router.patch("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a client."""
    # Permission check: owner, manager, and accountant can manage clients
    if not has_permission(current_user, Permission.MANAGE_CLIENTS):
        raise HTTPException(status_code=403, detail="Acces refuse. Seuls les proprietaires, gestionnaires et comptables peuvent gerer les clients.")

    client = db.query(Client).filter(
        Client.id == client_id,
        Client.organization_id == current_user.organization_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    return ClientResponse.model_validate(client)
