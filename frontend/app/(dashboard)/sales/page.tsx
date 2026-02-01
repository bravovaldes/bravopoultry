'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  ShoppingCart,
  Filter,
  Plus,
  Pencil,
  Eye,
  BarChart3,
  ChevronDown,
  DollarSign,
  Package,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Mail,
  Trash2,
} from 'lucide-react'
import { openInvoiceWindow, createSaleInvoiceData } from '@/lib/invoice-generator'
import { cn, formatDate, formatCurrency, formatCurrencyCompact, safeNumber, roundDecimal, multiply } from '@/lib/utils'
import { DatePicker, DatePickerCompact } from '@/components/ui/date-picker'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

const SALE_TYPES = [
  { value: 'eggs_tray', label: 'Oeufs (plateau)' },
  { value: 'eggs_carton', label: 'Oeufs (carton)' },
  { value: 'live_birds', label: 'Poulets vifs' },
  { value: 'dressed_birds', label: 'Poulets abattus' },
  { value: 'culled_hens', label: 'Poules de reforme' },
  { value: 'manure', label: 'Fiente' },
  { value: 'other', label: 'Autre' },
]

// Get correct unit based on sale type
const getUnitLabel = (saleType: string, storedUnit?: string) => {
  const unitMap: Record<string, string> = {
    'eggs_tray': 'plateau',
    'eggs_carton': 'carton',
    'live_birds': 'tete',
    'dressed_birds': 'tete',
    'culled_hens': 'tete',
    'manure': 'kg',
  }
  return unitMap[saleType] || storedUnit || 'pcs'
}

const PAYMENT_STATUS = [
  { value: 'all', label: 'Tous' },
  { value: 'paid', label: 'Paye', color: 'text-green-600 bg-green-100' },
  { value: 'pending', label: 'En attente', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'partial', label: 'Partiel', color: 'text-blue-600 bg-blue-100' },
  { value: 'overdue', label: 'En retard', color: 'text-red-600 bg-red-100' },
]

export default function SalesPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSale, setEditingSale] = useState<any>(null)

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch lots
  const { data: lots } = useQuery({
    queryKey: ['lots', selectedSiteId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('status', 'active')
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      const response = await api.get(`/lots?${params.toString()}`)
      return response.data
    },
  })

  // Get date range
  const getDateRange = () => {
    const end = new Date()
    let start = new Date()
    switch (period) {
      case '7d': start.setDate(end.getDate() - 7); break
      case '30d': start.setDate(end.getDate() - 30); break
      case '90d': start.setDate(end.getDate() - 90); break
      case 'custom': return { start_date: customStartDate || undefined, end_date: customEndDate || undefined }
      default: return {}
    }
    return { start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0] }
  }

  const dateRange = getDateRange()

  // Fetch sales
  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', period, customStartDate, customEndDate, selectedSiteId, selectedPaymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedPaymentStatus !== 'all') params.append('payment_status', selectedPaymentStatus)
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      const response = await api.get(`/sales?${params.toString()}`)
      return response.data
    },
  })

  // Delete sale mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  // Company info for invoices
  const companyInfo = {
    name: 'BravoPoultry',
    address: 'Cameroun',
    phone: '+237 6XX XXX XXX',
    email: 'contact@bravopoultry.com',
  }

  // Generate invoice for a sale
  const handleGenerateInvoice = (sale: any) => {
    const invoiceData = createSaleInvoiceData(sale, companyInfo)
    openInvoiceWindow(invoiceData)
  }

  // Calculate stats
  const stats = sales ? {
    totalSales: roundDecimal(sales.reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0), 2),
    totalPaid: roundDecimal(sales.reduce((sum: number, s: any) => sum + safeNumber(s.amount_paid), 0), 2),
    totalPending: roundDecimal(sales.reduce((sum: number, s: any) => {
      return sum + (safeNumber(s.total_amount) - safeNumber(s.amount_paid))
    }, 0), 2),
    salesCount: sales.length,
    paidCount: sales.filter((s: any) => s.payment_status === 'paid').length,
    pendingCount: sales.filter((s: any) => s.payment_status === 'pending' || s.payment_status === 'partial').length,
  } : null

  // Chart data - sales by day
  const chartData = sales
    ?.reduce((acc: any[], s: any) => {
      const date = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      const existing = acc.find(d => d.date === date)
      if (existing) {
        existing.montant = roundDecimal(existing.montant + safeNumber(s.total_amount), 2)
        existing.count += 1
      } else {
        acc.push({ date, montant: safeNumber(s.total_amount), count: 1 })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) || []

  // Sales by type for pie chart
  const salesByType = sales?.reduce((acc: any, s: any) => {
    const type = SALE_TYPES.find(t => t.value === s.sale_type)?.label || s.sale_type
    if (!acc[type]) acc[type] = 0
    acc[type] = roundDecimal(acc[type] + safeNumber(s.total_amount), 2)
    return acc
  }, {}) || {}

  const typeChartData = Object.entries(salesByType).map(([name, value]) => ({
    name,
    value: value as number,
  })).sort((a, b) => b.value - a.value)

  const getPaymentStatusBadge = (status: string) => {
    const config = PAYMENT_STATUS.find(p => p.value === status)
    return config ? (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.color)}>
        {config.label}
      </span>
    ) : status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
          <p className="text-gray-500">Gestion des ventes et encaissements</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle vente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          {/* Payment status filter */}
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            {PAYMENT_STATUS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500">Periode:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7d', label: '7 jours' },
              { value: '30d', label: '30 jours' },
              { value: '90d', label: '3 mois' },
              { value: 'all', label: 'Tout' },
              { value: 'custom', label: 'Personnalise' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as FilterPeriod)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition",
                  period === p.value
                    ? "bg-orange-100 text-orange-700 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date debut</label>
              <DatePickerCompact
                value={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                placeholder="Debut"
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date fin</label>
              <DatePickerCompact
                value={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                placeholder="Fin"
                maxDate={new Date()}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl border p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500 truncate">Chiffre d'affaires</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate" title={formatCurrency(stats.totalSales)}>
              {formatCurrencyCompact(stats.totalSales)}
            </p>
            <p className="text-xs text-gray-400 hidden sm:block">{stats.salesCount} ventes</p>
          </div>
          <div className="bg-white rounded-xl border p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500 truncate">Encaisse</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-600 truncate" title={formatCurrency(stats.totalPaid)}>
              {formatCurrencyCompact(stats.totalPaid)}
            </p>
            <p className="text-xs text-gray-400">{stats.paidCount} payees</p>
          </div>
          <div className="bg-white rounded-xl border p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500 truncate">Vente moyenne</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-amber-600 truncate" title={formatCurrency(stats.salesCount > 0 ? stats.totalSales / stats.salesCount : 0)}>
              {formatCurrencyCompact(stats.salesCount > 0 ? stats.totalSales / stats.salesCount : 0)}
            </p>
            <p className="text-xs text-gray-400 hidden sm:block">par transaction</p>
          </div>
          <div className="bg-white rounded-xl border p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500 truncate">Credits en cours</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-purple-600 truncate" title={formatCurrency(stats.totalPending)}>
              {formatCurrencyCompact(stats.totalPending)}
            </p>
            <p className="text-xs text-gray-400">{stats.pendingCount} en attente</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales trend */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold">Evolution des ventes</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Montant']}
                  />
                  <Bar dataKey="montant" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by type */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold">Ventes par type</h3>
            </div>
            <div className="space-y-3">
              {typeChartData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{item.name}</div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${(item.value / typeChartData[0].value) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-medium">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sales History Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Historique des ventes ({sales?.length || 0})</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
          </div>
        ) : sales?.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune vente enregistree</p>
            <p className="text-sm text-gray-400 mt-1">Commencez par ajouter une vente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Client</th>
                  <th className="text-right p-3 font-medium text-gray-600">Quantite</th>
                  <th className="text-right p-3 font-medium text-gray-600">Prix unit.</th>
                  <th className="text-right p-3 font-medium text-gray-600">Total</th>
                  <th className="text-center p-3 font-medium text-gray-600">Statut</th>
                  <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales?.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{formatDate(sale.date)}</td>
                    <td className="p-3">
                      {SALE_TYPES.find(t => t.value === sale.sale_type)?.label || sale.sale_type}
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{sale.client_name || '-'}</p>
                        {sale.client_phone && (
                          <p className="text-xs text-gray-500">{sale.client_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {safeNumber(sale.quantity).toLocaleString()} {getUnitLabel(sale.sale_type, sale.unit)}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(safeNumber(sale.unit_price))}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(safeNumber(sale.total_amount))}</td>
                    <td className="p-3 text-center">{getPaymentStatusBadge(sale.payment_status)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleGenerateInvoice(sale)}
                          className="p-1.5 hover:bg-green-100 rounded transition"
                          title="Generer facture"
                        >
                          <FileText className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSale(sale)
                            setShowEditModal(true)
                          }}
                          className="p-1.5 hover:bg-amber-100 rounded transition"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette vente ?')) {
                              deleteMutation.mutate(sale.id)
                            }
                          }}
                          className="p-1.5 hover:bg-red-100 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      {showAddModal && (
        <AddSaleModal
          onClose={() => setShowAddModal(false)}
          sites={sites}
          lots={lots}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['sales'] })
          }}
        />
      )}

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => {
            setShowEditModal(false)
            setEditingSale(null)
          }}
          sites={sites}
          lots={lots}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingSale(null)
            queryClient.invalidateQueries({ queryKey: ['sales'] })
          }}
        />
      )}
    </div>
  )
}

// Add Sale Modal Component
function AddSaleModal({ onClose, sites, lots, onSuccess }: {
  onClose: () => void
  sites: any[]
  lots: any[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sale_type: 'eggs_tray',
    quantity: '',
    unit: 'tray',
    unit_price: '',
    client_name: '',
    client_phone: '',
    payment_status: 'pending',
    amount_paid: '0',
    notes: '',
    site_id: '',
    lot_id: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const total = multiply(formData.quantity, formData.unit_price)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.post('/sales', {
        ...formData,
        quantity: safeNumber(formData.quantity),
        unit_price: safeNumber(formData.unit_price),
        amount_paid: safeNumber(formData.amount_paid),
        site_id: formData.site_id || null,
        lot_id: formData.lot_id || null,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'enregistrement de la vente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle vente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de vente</label>
              <select
                value={formData.sale_type}
                onChange={(e) => setFormData({ ...formData, sale_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                {SALE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site (optionnel)</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Aucun</option>
                {sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot (optionnel)</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Aucun</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantite</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unite</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="tray">Plateau</option>
                <option value="carton">Carton</option>
                <option value="kg">Kg</option>
                <option value="bird">Oiseau</option>
                <option value="bag">Sac</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom client</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="+237 6..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut paiement</label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pending">En attente</option>
                <option value="paid">Paye</option>
                <option value="partial">Partiel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant paye</label>
              <input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Error message - displayed near the button */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Sale Modal Component
function EditSaleModal({ sale, onClose, sites, lots, onSuccess }: {
  sale: any
  onClose: () => void
  sites: any[]
  lots: any[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: sale.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    sale_type: sale.sale_type || 'eggs_tray',
    quantity: sale.quantity?.toString() || '',
    unit: sale.unit || 'tray',
    unit_price: sale.unit_price?.toString() || '',
    client_name: sale.client_name || '',
    client_phone: sale.client_phone || '',
    payment_status: sale.payment_status || 'pending',
    amount_paid: sale.amount_paid?.toString() || '0',
    notes: sale.notes || '',
    site_id: sale.site_id || '',
    lot_id: sale.lot_id || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const total = multiply(formData.quantity, formData.unit_price)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/sales/${sale.id}`, {
        ...formData,
        quantity: safeNumber(formData.quantity),
        unit_price: safeNumber(formData.unit_price),
        amount_paid: safeNumber(formData.amount_paid),
        site_id: formData.site_id || null,
        lot_id: formData.lot_id || null,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification de la vente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Modifier la vente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de vente</label>
              <select
                value={formData.sale_type}
                onChange={(e) => setFormData({ ...formData, sale_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                {SALE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site (optionnel)</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Aucun</option>
                {sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot (optionnel)</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Aucun</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantite</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unite</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="tray">Plateau</option>
                <option value="carton">Carton</option>
                <option value="kg">Kg</option>
                <option value="bird">Oiseau</option>
                <option value="bag">Sac</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom client</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="+237 6..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut paiement</label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pending">En attente</option>
                <option value="paid">Paye</option>
                <option value="partial">Partiel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant paye</label>
              <input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Error message - displayed near the button */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
