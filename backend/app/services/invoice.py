"""Invoice generation service using ReportLab."""
import os
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# Directory for storing invoices
INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "invoices")
os.makedirs(INVOICES_DIR, exist_ok=True)


def generate_invoice_number(sale_id: str, date: datetime) -> str:
    """Generate a unique invoice number."""
    prefix = "FAC"
    date_part = date.strftime("%Y%m%d")
    short_id = sale_id[:8].upper()
    return f"{prefix}-{date_part}-{short_id}"


def format_currency(amount: Decimal) -> str:
    """Format amount as FCFA currency."""
    return f"{int(amount):,} FCFA".replace(",", " ")


def generate_invoice_pdf(
    sale_id: str,
    invoice_number: str,
    sale_date: datetime,
    client_name: str,
    client_phone: str = None,
    client_address: str = None,
    items: list = None,  # [{name, quantity, unit, unit_price, total}]
    total_amount: Decimal = Decimal("0"),
    amount_paid: Decimal = Decimal("0"),
    payment_status: str = "pending",
    organization_name: str = "BravoPoultry",
    organization_phone: str = None,
    organization_address: str = None,
    notes: str = None,
) -> str:
    """
    Generate a PDF invoice and return the file path.
    """
    filename = f"{invoice_number}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)

    # Create PDF
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#16a34a'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151'),
    )
    bold_style = ParagraphStyle(
        'Bold',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
    )

    elements = []

    # Header with company name
    elements.append(Paragraph(organization_name, title_style))
    elements.append(Spacer(1, 10))

    # Company info
    if organization_phone or organization_address:
        company_info = []
        if organization_address:
            company_info.append(organization_address)
        if organization_phone:
            company_info.append(f"Tel: {organization_phone}")
        elements.append(Paragraph("<br/>".join(company_info), ParagraphStyle(
            'CompanyInfo',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#6b7280'),
        )))
        elements.append(Spacer(1, 20))

    # Invoice title and number
    elements.append(Paragraph(f"<b>FACTURE N° {invoice_number}</b>", ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading2'],
        fontSize=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937'),
    )))
    elements.append(Spacer(1, 20))

    # Date and client info in two columns
    info_data = [
        [
            Paragraph(f"<b>Date:</b> {sale_date.strftime('%d/%m/%Y')}", header_style),
            Paragraph(f"<b>Client:</b> {client_name}", header_style),
        ],
    ]
    if client_phone:
        info_data.append([
            Paragraph("", header_style),
            Paragraph(f"<b>Tel:</b> {client_phone}", header_style),
        ])
    if client_address:
        info_data.append([
            Paragraph("", header_style),
            Paragraph(f"<b>Adresse:</b> {client_address}", header_style),
        ])

    info_table = Table(info_data, colWidths=[9*cm, 9*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Items table
    if items:
        table_data = [
            [
                Paragraph("<b>Description</b>", bold_style),
                Paragraph("<b>Qte</b>", bold_style),
                Paragraph("<b>Unite</b>", bold_style),
                Paragraph("<b>P.U.</b>", bold_style),
                Paragraph("<b>Total</b>", bold_style),
            ]
        ]
        for item in items:
            table_data.append([
                Paragraph(item.get('name', ''), header_style),
                Paragraph(str(item.get('quantity', 0)), header_style),
                Paragraph(item.get('unit', ''), header_style),
                Paragraph(format_currency(item.get('unit_price', 0)), header_style),
                Paragraph(format_currency(item.get('total', 0)), header_style),
            ])

        items_table = Table(table_data, colWidths=[6*cm, 2*cm, 2*cm, 4*cm, 4*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 20))

    # Totals
    balance_due = total_amount - amount_paid
    totals_data = [
        ["", "", "", Paragraph("<b>Total:</b>", bold_style), Paragraph(f"<b>{format_currency(total_amount)}</b>", bold_style)],
    ]
    if amount_paid > 0:
        totals_data.append(["", "", "", Paragraph("Paye:", header_style), Paragraph(format_currency(amount_paid), header_style)])
        totals_data.append(["", "", "", Paragraph("<b>Reste a payer:</b>", bold_style), Paragraph(f"<b>{format_currency(balance_due)}</b>", bold_style)])

    totals_table = Table(totals_data, colWidths=[6*cm, 2*cm, 2*cm, 4*cm, 4*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 20))

    # Payment status badge
    status_colors = {
        'paid': ('#16a34a', 'PAYE'),
        'pending': ('#f59e0b', 'EN ATTENTE'),
        'partial': ('#3b82f6', 'PARTIEL'),
        'overdue': ('#ef4444', 'EN RETARD'),
    }
    status_color, status_text = status_colors.get(payment_status, ('#6b7280', payment_status.upper()))

    elements.append(Paragraph(
        f"<b>Statut: {status_text}</b>",
        ParagraphStyle(
            'Status',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor(status_color),
            alignment=TA_CENTER,
        )
    ))

    # Notes
    if notes:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("<b>Notes:</b>", bold_style))
        elements.append(Paragraph(notes, header_style))

    # Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph(
        f"Facture generee le {datetime.now().strftime('%d/%m/%Y a %H:%M')}",
        ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#9ca3af'),
            alignment=TA_CENTER,
        )
    ))

    # Build PDF
    doc.build(elements)

    return filepath


def get_invoice_path(invoice_number: str) -> str:
    """Get the path to an invoice file."""
    filepath = os.path.join(INVOICES_DIR, f"{invoice_number}.pdf")
    if os.path.exists(filepath):
        return filepath
    return None
