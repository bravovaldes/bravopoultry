// Invoice Generator Utility
// Generates printable HTML invoices that can be converted to PDF via browser print

import { safeNumber, roundDecimal, multiply } from './utils'

export interface InvoiceData {
  invoiceNumber: string
  date: string
  dueDate?: string

  // Seller info
  companyName: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string

  // Client info
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddress?: string

  // Items
  items: {
    description: string
    quantity: number
    unit: string
    unitPrice: number
    total: number
  }[]

  // Totals
  subtotal: number
  tax?: number
  taxRate?: number
  total: number
  amountPaid?: number
  amountDue?: number

  // Notes
  notes?: string
  paymentTerms?: string
}

export function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `FAC-${year}${month}${day}-${random}`
}

export function formatCurrencyXAF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.unit}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrencyXAF(item.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrencyXAF(item.total)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facture ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.5; }
        .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: 700; color: #f59e0b; }
        .logo span { color: #1f2937; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 24px; font-weight: 700; color: #1f2937; }
        .invoice-date { color: #6b7280; margin-top: 4px; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .party { flex: 1; }
        .party-title { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .party-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
        .party-details { color: #6b7280; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f9fafb; padding: 12px 10px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
        .totals-table { width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .totals-row.total { font-size: 20px; font-weight: 700; color: #f59e0b; border-bottom: none; padding-top: 12px; }
        .notes { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .notes-title { font-weight: 600; margin-bottom: 8px; }
        .notes-content { color: #6b7280; font-size: 14px; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #dcfce7; color: #16a34a; }
        .status-pending { background: #fef3c7; color: #d97706; }
        .status-partial { background: #dbeafe; color: #2563eb; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .invoice { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div>
            <div class="logo">Bravo<span>Poultry</span></div>
            <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Gestion avicole professionnelle</div>
          </div>
          <div class="invoice-info">
            <div class="invoice-number">FACTURE</div>
            <div class="invoice-number" style="font-size: 16px; color: #6b7280;">${data.invoiceNumber}</div>
            <div class="invoice-date">Date: ${data.date}</div>
            ${data.dueDate ? `<div class="invoice-date">Echeance: ${data.dueDate}</div>` : ''}
          </div>
        </div>

        <div class="parties">
          <div class="party">
            <div class="party-title">De</div>
            <div class="party-name">${data.companyName}</div>
            <div class="party-details">
              ${data.companyAddress ? `${data.companyAddress}<br>` : ''}
              ${data.companyPhone ? `Tel: ${data.companyPhone}<br>` : ''}
              ${data.companyEmail ? `Email: ${data.companyEmail}` : ''}
            </div>
          </div>
          <div class="party" style="text-align: right;">
            <div class="party-title">Facture a</div>
            <div class="party-name">${data.clientName}</div>
            <div class="party-details">
              ${data.clientAddress ? `${data.clientAddress}<br>` : ''}
              ${data.clientPhone ? `Tel: ${data.clientPhone}<br>` : ''}
              ${data.clientEmail ? `Email: ${data.clientEmail}` : ''}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantite</th>
              <th style="text-align: right;">Prix unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-table">
            <div class="totals-row">
              <span>Sous-total</span>
              <span>${formatCurrencyXAF(data.subtotal)}</span>
            </div>
            ${data.tax && data.taxRate ? `
            <div class="totals-row">
              <span>TVA (${data.taxRate}%)</span>
              <span>${formatCurrencyXAF(data.tax)}</span>
            </div>
            ` : ''}
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrencyXAF(data.total)}</span>
            </div>
            ${data.amountPaid !== undefined ? `
            <div class="totals-row" style="color: #16a34a;">
              <span>Montant paye</span>
              <span>${formatCurrencyXAF(data.amountPaid)}</span>
            </div>
            ` : ''}
            ${data.amountDue !== undefined && data.amountDue > 0 ? `
            <div class="totals-row" style="color: #d97706; font-weight: 600;">
              <span>Reste a payer</span>
              <span>${formatCurrencyXAF(data.amountDue)}</span>
            </div>
            ` : ''}
          </div>
        </div>

        ${data.notes || data.paymentTerms ? `
        <div class="notes">
          ${data.notes ? `
          <div class="notes-title">Notes</div>
          <div class="notes-content">${data.notes}</div>
          ` : ''}
          ${data.paymentTerms ? `
          <div class="notes-title" style="margin-top: 12px;">Conditions de paiement</div>
          <div class="notes-content">${data.paymentTerms}</div>
          ` : ''}
        </div>
        ` : ''}

        <div class="footer">
          <p>Merci pour votre confiance!</p>
          <p style="margin-top: 8px;">BravoPoultry - Votre partenaire en aviculture</p>
        </div>
      </div>

      <div class="no-print" style="text-align: center; margin: 20px;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          Imprimer / Telecharger PDF
        </button>
      </div>
    </body>
    </html>
  `
}

export function openInvoiceWindow(data: InvoiceData): void {
  const html = generateInvoiceHTML(data)
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(html)
    newWindow.document.close()
  }
}

export function createSaleInvoiceData(sale: any, companyInfo: { name: string; address?: string; phone?: string; email?: string }): InvoiceData {
  const SALE_TYPE_LABELS: Record<string, string> = {
    'eggs_tray': 'Oeufs (plateau)',
    'eggs_carton': 'Oeufs (carton)',
    'live_birds': 'Poulets vifs',
    'dressed_birds': 'Poulets abattus',
    'culled_hens': 'Poules de reforme',
    'manure': 'Fiente',
    'other': 'Autre',
  }

  const UNIT_LABELS: Record<string, string> = {
    'tray': 'plateau(x)',
    'carton': 'carton(s)',
    'kg': 'kg',
    'bird': 'oiseau(x)',
    'bag': 'sac(s)',
  }

  const quantity = safeNumber(sale.quantity)
  const unitPrice = safeNumber(sale.unit_price)
  const total = multiply(quantity, unitPrice)
  const amountPaid = safeNumber(sale.amount_paid)

  return {
    invoiceNumber: sale.invoice_number || generateInvoiceNumber(),
    date: new Date(sale.date).toLocaleDateString('fr-FR'),
    dueDate: sale.due_date ? new Date(sale.due_date).toLocaleDateString('fr-FR') : undefined,

    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
    companyPhone: companyInfo.phone,
    companyEmail: companyInfo.email,

    clientName: sale.client_name || 'Client comptant',
    clientPhone: sale.client_phone,
    clientEmail: sale.client_email,
    clientAddress: sale.client_address,

    items: [{
      description: SALE_TYPE_LABELS[sale.sale_type] || sale.sale_type,
      quantity: quantity,
      unit: UNIT_LABELS[sale.unit] || sale.unit || '',
      unitPrice: unitPrice,
      total: total,
    }],

    subtotal: total,
    total: sale.total_amount ? safeNumber(sale.total_amount) : total,
    amountPaid: amountPaid,
    amountDue: roundDecimal(total - amountPaid, 2),

    notes: sale.notes,
    paymentTerms: sale.payment_status === 'pending' ? 'Paiement a reception' :
                  sale.payment_status === 'partial' ? 'Paiement partiel recu' : undefined,
  }
}
