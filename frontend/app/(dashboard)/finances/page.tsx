'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Receipt,
  Filter,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  DollarSign,
  TrendingDown,
  Building2,
  Pill,
  Truck,
  Zap,
  Wrench,
  X,
  Package,
  Bird,
  Users,
  Droplet,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDate, formatCurrency, safeNumber, roundDecimal, multiply } from '@/lib/utils'
import { DatePicker, DatePickerCompact } from '@/components/ui/date-picker'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

const EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Aliment', color: '#f59e0b' },
  { value: 'chicks', label: 'Poussins', color: '#eab308' },
  { value: 'veterinary', label: 'Veterinaire', color: '#ef4444' },
  { value: 'labor', label: 'Main d\'oeuvre', color: '#3b82f6' },
  { value: 'energy', label: 'Energie', color: '#f97316' },
  { value: 'water', label: 'Eau', color: '#06b6d4' },
  { value: 'transport', label: 'Transport', color: '#8b5cf6' },
  { value: 'packaging', label: 'Emballage', color: '#ec4899' },
  { value: 'equipment', label: 'Equipement', color: '#6366f1' },
  { value: 'maintenance', label: 'Maintenance', color: '#14b8a6' },
  { value: 'rent', label: 'Loyer', color: '#84cc16' },
  { value: 'other', label: 'Autre', color: '#6b7280' },
]

const CHART_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#84cc16']

export default function FinancesPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)

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

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', period, customStartDate, customEndDate, selectedSiteId, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      const response = await api.get(`/expenses?${params.toString()}`)
      return response.data
    },
  })

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  // Calculate stats
  const stats = expenses ? {
    totalExpenses: roundDecimal(expenses.reduce((sum: number, e: any) => sum + safeNumber(e.amount), 0), 2),
    paidExpenses: roundDecimal(expenses.filter((e: any) => e.is_paid).reduce((sum: number, e: any) => sum + safeNumber(e.amount), 0), 2),
    unpaidExpenses: roundDecimal(expenses.filter((e: any) => !e.is_paid).reduce((sum: number, e: any) => sum + safeNumber(e.amount), 0), 2),
    expenseCount: expenses.length,
  } : null

  // Chart data - expenses by day
  const chartData = expenses
    ?.reduce((acc: any[], e: any) => {
      const date = new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      const existing = acc.find(d => d.date === date)
      if (existing) {
        existing.montant = roundDecimal(existing.montant + safeNumber(e.amount), 2)
      } else {
        acc.push({ date, montant: safeNumber(e.amount) })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) || []

  // Expenses by category for pie chart
  const expensesByCategory = expenses?.reduce((acc: any, e: any) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)
    const label = cat?.label || e.category
    if (!acc[label]) acc[label] = { value: 0, color: cat?.color || '#6b7280' }
    acc[label].value = roundDecimal(acc[label].value + safeNumber(e.amount), 2)
    return acc
  }, {}) || {}

  const pieChartData = Object.entries(expensesByCategory)
    .map(([name, data]: [string, any]) => ({
      name,
      value: data.value,
      color: data.color,
    }))
    .sort((a, b) => b.value - a.value)

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depenses</h1>
          <p className="text-gray-500">Suivi des depenses et charges</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle depense
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

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Toutes categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                    ? "bg-red-100 text-red-700 font-medium"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <p className="text-sm text-gray-500">Total depenses</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-500">Payees</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-gray-500">Non payees</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.unpaidExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-500">Transactions</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.expenseCount}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {(chartData.length > 1 || pieChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expenses trend */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">Evolution des depenses</h3>
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
                    <Bar dataKey="montant" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Expenses by category */}
          {pieChartData.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">Repartition par categorie</h3>
              </div>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieChartData.slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses History Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Historique des depenses ({expenses?.length || 0})</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500"></div>
          </div>
        ) : expenses?.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune depense enregistree</p>
            <p className="text-sm text-gray-400 mt-1">Commencez par ajouter une depense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Categorie</th>
                  <th className="text-left p-3 font-medium text-gray-600">Description</th>
                  <th className="text-left p-3 font-medium text-gray-600">Fournisseur</th>
                  <th className="text-right p-3 font-medium text-gray-600">Montant</th>
                  <th className="text-center p-3 font-medium text-gray-600">Paye</th>
                  <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses?.map((expense: any) => {
                  const catInfo = getCategoryInfo(expense.category)
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{formatDate(expense.date)}</td>
                      <td className="p-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${catInfo.color}20`, color: catInfo.color }}
                        >
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate">{expense.description || '-'}</td>
                      <td className="p-3">{expense.supplier_name || '-'}</td>
                      <td className="p-3 text-right font-bold text-red-600">
                        {formatCurrency(safeNumber(expense.amount))}
                      </td>
                      <td className="p-3 text-center">
                        {expense.is_paid ? (
                          <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">Oui</span>
                        ) : (
                          <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full text-xs">Non</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExpense(expense)
                              setShowEditModal(true)
                            }}
                            className="p-1.5 hover:bg-amber-100 rounded transition"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4 text-amber-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Supprimer cette depense ?')) {
                                deleteMutation.mutate(expense.id)
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          sites={sites}
          lots={lots}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
          }}
        />
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => {
            setShowEditModal(false)
            setEditingExpense(null)
          }}
          sites={sites}
          lots={lots}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingExpense(null)
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
          }}
        />
      )}
    </div>
  )
}

// Add Expense Modal Component
function AddExpenseModal({ onClose, sites, lots, onSuccess }: {
  onClose: () => void
  sites: any[]
  lots: any[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'feed',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
    amount: '',
    supplier_name: '',
    is_paid: true,
    payment_method: 'cash',
    notes: '',
    site_id: '',
    lot_id: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-calculate amount
  const calculatedAmount = formData.quantity && formData.unit_price
    ? multiply(formData.quantity, formData.unit_price)
    : safeNumber(formData.amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.post('/expenses', {
        ...formData,
        quantity: formData.quantity ? safeNumber(formData.quantity) : null,
        unit_price: formData.unit_price ? safeNumber(formData.unit_price) : null,
        amount: calculatedAmount,
        site_id: formData.site_id || null,
        lot_id: formData.lot_id || null,
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la creation de la depense'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle depense</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Description de la depense"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Aucun</option>
                {sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Aucun</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qte</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unite</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">P.U.</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant total</label>
            <input
              type="number"
              value={formData.quantity && formData.unit_price ? calculatedAmount : formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="0"
              min="0"
              required
              disabled={!!(formData.quantity && formData.unit_price)}
            />
            {formData.quantity && formData.unit_price && (
              <p className="text-xs text-gray-500 mt-1">Calcule automatiquement</p>
            )}
          </div>

          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">Total:</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(calculatedAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Nom du fournisseur"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.is_paid ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_paid: e.target.value === 'true' })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="true">Paye</option>
                <option value="false">Non paye</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="cash">Especes</option>
                <option value="mobile_money">Mobile</option>
                <option value="bank">Virement</option>
                <option value="check">Cheque</option>
              </select>
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

          {/* Error message */}
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Expense Modal Component
function EditExpenseModal({ expense, onClose, sites, lots, onSuccess }: {
  expense: any
  onClose: () => void
  sites: any[]
  lots: any[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    date: expense.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    category: expense.category || 'feed',
    description: expense.description || '',
    quantity: expense.quantity?.toString() || '',
    unit: expense.unit || '',
    unit_price: expense.unit_price?.toString() || '',
    amount: expense.amount?.toString() || '',
    supplier_name: expense.supplier_name || '',
    is_paid: expense.is_paid ?? true,
    payment_method: expense.payment_method || 'cash',
    notes: expense.notes || '',
    site_id: expense.site_id || '',
    lot_id: expense.lot_id || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const calculatedAmount = formData.quantity && formData.unit_price
    ? multiply(formData.quantity, formData.unit_price)
    : safeNumber(formData.amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/expenses/${expense.id}`, {
        ...formData,
        quantity: formData.quantity ? safeNumber(formData.quantity) : null,
        unit_price: formData.unit_price ? safeNumber(formData.unit_price) : null,
        amount: calculatedAmount,
        site_id: formData.site_id || null,
        lot_id: formData.lot_id || null,
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la modification de la depense'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Modifier la depense</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Description de la depense"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Aucun</option>
                {sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Aucun</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qte</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unite</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">P.U.</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant total</label>
            <input
              type="number"
              value={formData.quantity && formData.unit_price ? calculatedAmount : formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="0"
              min="0"
              required
              disabled={!!(formData.quantity && formData.unit_price)}
            />
          </div>

          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">Total:</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(calculatedAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Nom du fournisseur"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.is_paid ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_paid: e.target.value === 'true' })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="true">Paye</option>
                <option value="false">Non paye</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="cash">Especes</option>
                <option value="mobile_money">Mobile</option>
                <option value="bank">Virement</option>
                <option value="check">Cheque</option>
              </select>
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

          {/* Error message */}
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
