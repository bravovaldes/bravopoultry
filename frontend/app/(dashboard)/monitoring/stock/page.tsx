'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import Link from 'next/link'
import {
  Package,
  Plus,
  ArrowLeft,
  Wheat,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  X,
  CheckCircle,
  History,
  PackagePlus,
  PackageMinus,
  MapPin,
  Building2,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn, formatNumber, formatDate } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

const FEED_TYPES = [
  { value: 'starter', label: 'Demarrage', color: '#22c55e', description: '0-10 jours' },
  { value: 'grower', label: 'Croissance', color: '#f59e0b', description: '11-24 jours' },
  { value: 'finisher', label: 'Finition', color: '#6366f1', description: '25+ jours' },
  { value: 'layer', label: 'Pondeuse', color: '#ec4899', description: 'Pondeuses' },
  { value: 'pre_layer', label: 'Pre-ponte', color: '#8b5cf6', description: '16-18 sem' },
]

const STOCK_LOCATIONS = [
  { value: 'global', label: 'Stock general', icon: Globe, description: 'Toute la ferme' },
  { value: 'site', label: 'Par site', icon: MapPin, description: 'Stock par site' },
  { value: 'building', label: 'Par batiment', icon: Building2, description: 'Stock par batiment' },
]

export default function StockPage() {
  const queryClient = useQueryClient()
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [filterType, setFilterType] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterSite, setFilterSite] = useState('all')

  // Fetch sites
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch all stocks
  const { data: stocks = [], isLoading: loadingStocks } = useQuery({
    queryKey: ['feed-stocks', filterLocation, filterSite, filterType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterLocation !== 'all') params.append('location_type', filterLocation)
      if (filterSite !== 'all') params.append('site_id', filterSite)
      if (filterType !== 'all') params.append('feed_type', filterType)
      const response = await api.get(`/feed/stock/all?${params.toString()}`)
      return response.data
    },
  })

  // Fetch stock stats
  const { data: stats } = useQuery({
    queryKey: ['feed-stock-stats'],
    queryFn: async () => {
      const response = await api.get('/feed/stock/stats')
      return response.data
    },
  })

  // Fetch history
  const { data: history = [] } = useQuery({
    queryKey: ['feed-stock-history'],
    queryFn: async () => {
      const response = await api.get('/feed/stock/movements/all?limit=20')
      return response.data
    },
  })

  // Fetch consumption trend
  const { data: consumptionTrend = [] } = useQuery({
    queryKey: ['feed-consumption-trend'],
    queryFn: async () => {
      const response = await api.get('/feed/stock/consumption-trend?days=7')
      return response.data
    },
  })

  // Calculate stats from API data
  const totalStock = stats?.total_quantity_kg || 0
  const avgDailyConsumption = stats?.avg_daily_consumption || 0
  const lowStockItems = stocks.filter((s: any) =>
    s.quantity_kg && s.min_quantity_kg && parseFloat(s.quantity_kg) <= parseFloat(s.min_quantity_kg)
  )

  const getTypeInfo = (type: string) => {
    return FEED_TYPES.find(t => t.value === type) || FEED_TYPES[0]
  }

  const getLocationLabel = (stock: any) => {
    if (stock.location_type === 'global') return 'Stock general'
    if (stock.location_type === 'site') return stock.site_name || 'Site'
    if (stock.location_type === 'building') return stock.building_name || 'Batiment'
    return ''
  }

  if (loadingStocks) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/monitoring"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
            <p className="text-gray-500">Stock d'aliments et reapprovisionnement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <AlertTriangle className="w-4 h-4" />
            Alertes
          </button>
          <button
            onClick={() => {
              setSelectedStock(null)
              setShowRestockModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PackagePlus className="w-4 h-4" />
            Reapprovisionner
          </button>
        </div>
      </div>

      {/* Stats - Stock/Quantities only (financial data in Finance module) */}
      <StatCardGrid columns={3}>
        <StatCard
          title="Stock total"
          value={`${formatNumber(totalStock)} kg`}
          subtitle={avgDailyConsumption > 0 ? `Autonomie: ${Math.floor(totalStock / avgDailyConsumption)} jours` : 'Pas de donnees'}
          icon={Package}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Consommation/jour"
          value={`${formatNumber(avgDailyConsumption)} kg`}
          icon={TrendingDown}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Alertes stock"
          value={lowStockItems.length}
          subtitle={lowStockItems.length > 0 ? 'Stock bas!' : 'Tout OK'}
          icon={AlertTriangle}
          iconBg={lowStockItems.length > 0 ? "bg-red-100" : "bg-green-100"}
          iconColor={lowStockItems.length > 0 ? "text-red-600" : "text-green-600"}
        />
      </StatCardGrid>

      {/* Filter + Stock Grid */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-semibold">Stock par type d'aliment</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">Tous emplacements</option>
                <option value="global">Stock general</option>
                <option value="site">Par site</option>
                <option value="building">Par batiment</option>
              </select>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">Tous les sites</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">Tous les types</option>
                {FEED_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {stocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun stock enregistre</p>
            <button
              onClick={() => setShowRestockModal(true)}
              className="mt-3 text-green-600 hover:underline font-medium"
            >
              + Ajouter un premier stock
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {stocks.map((stock: any) => {
              const typeInfo = getTypeInfo(stock.feed_type)
              const quantity = parseFloat(stock.quantity_kg) || 0
              const threshold = parseFloat(stock.min_quantity_kg) || 100
              const isLow = quantity <= threshold
              const percentage = Math.min((quantity / (threshold * 5)) * 100, 100)

              return (
                <div
                  key={stock.id}
                  className={cn(
                    "p-4 rounded-xl border-2 transition",
                    isLow ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${typeInfo.color}20` }}
                      >
                        <Wheat className="w-5 h-5" style={{ color: typeInfo.color }} />
                      </div>
                      <div>
                        <p className="font-semibold">{typeInfo.label}</p>
                        <p className="text-xs text-gray-500">{typeInfo.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isLow && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Stock bas
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {stock.location_type === 'global' && <Globe className="w-3 h-3" />}
                        {stock.location_type === 'site' && <MapPin className="w-3 h-3" />}
                        {stock.location_type === 'building' && <Building2 className="w-3 h-3" />}
                        {getLocationLabel(stock)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-2xl font-bold">{formatNumber(quantity)}</span>
                      <span className="text-gray-500">kg</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: isLow ? '#ef4444' : typeInfo.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Seuil alerte: {formatNumber(threshold)} kg
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stock.last_restock_date ? formatDate(stock.last_restock_date) : 'Jamais'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedStock(stock)
                        setShowRestockModal(true)
                      }}
                      className="text-green-600 hover:underline font-medium"
                    >
                      + Reapprovisionner
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Charts & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Trend */}
        <div className="bg-white p-4 rounded-xl border">
          <h3 className="font-semibold mb-4">Consommation journaliere (7 jours)</h3>
          {consumptionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={consumptionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="starter" name="Demarrage" fill="#22c55e" stackId="a" />
                <Bar dataKey="grower" name="Croissance" fill="#f59e0b" stackId="a" />
                <Bar dataKey="finisher" name="Finition" fill="#6366f1" stackId="a" />
                <Bar dataKey="layer" name="Pondeuse" fill="#ec4899" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              Pas de donnees de consommation
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Historique recent</h3>
            <button className="text-sm text-indigo-600 hover:underline">Voir tout</button>
          </div>
          <div className="divide-y max-h-[320px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Aucun mouvement enregistre
              </div>
            ) : (
              history.map((entry: any) => {
                const typeInfo = getTypeInfo(entry.feed_type)
                const isRestock = entry.movement_type === 'restock'
                const quantity = parseFloat(entry.quantity_kg) || 0

                return (
                  <div key={entry.id} className="p-3 hover:bg-gray-50 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isRestock ? "bg-green-100" : "bg-amber-100"
                    )}>
                      {isRestock ? (
                        <PackagePlus className="w-4 h-4 text-green-600" />
                      ) : (
                        <PackageMinus className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{typeInfo.label}</span>
                        <span className={cn(
                          "text-sm font-semibold",
                          isRestock ? "text-green-600" : "text-amber-600"
                        )}>
                          {isRestock ? '+' : ''}{formatNumber(quantity)} kg
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {isRestock ? entry.supplier_name || 'Fournisseur' : entry.lot_code || 'Consommation'} - {formatDate(entry.date)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Stock bas - Reapprovisionnement necessaire</p>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {lowStockItems.map((item: { id: string; type: string; quantity: number; alert_threshold: number }) => {
                  const typeInfo = getTypeInfo(item.type)
                  return (
                    <li key={item.id}>
                      • {typeInfo.label}: {item.quantity} kg restants (seuil: {item.alert_threshold} kg)
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <RestockModal
          stock={selectedStock}
          feedTypes={FEED_TYPES}
          sites={sites}
          onClose={() => {
            setShowRestockModal(false)
            setSelectedStock(null)
          }}
          onSuccess={() => {
            setShowRestockModal(false)
            setSelectedStock(null)
            queryClient.invalidateQueries({ queryKey: ['feed-stocks'] })
            queryClient.invalidateQueries({ queryKey: ['feed-stock-stats'] })
            queryClient.invalidateQueries({ queryKey: ['feed-stock-history'] })
          }}
        />
      )}

      {/* Alert Settings Modal */}
      {showAlertModal && (
        <AlertSettingsModal
          stock={stocks}
          feedTypes={FEED_TYPES}
          onClose={() => setShowAlertModal(false)}
          onSave={async (thresholds) => {
            // Update thresholds via API
            for (const [stockId, threshold] of Object.entries(thresholds)) {
              try {
                await api.patch(`/feed/stock/${stockId}`, { min_quantity_kg: threshold })
              } catch (error) {
                console.error('Error updating threshold:', error)
              }
            }
            queryClient.invalidateQueries({ queryKey: ['feed-stocks'] })
          }}
        />
      )}
    </div>
  )
}

// Restock Modal
function RestockModal({
  stock,
  feedTypes,
  sites,
  onClose,
  onSuccess,
}: {
  stock: any
  feedTypes: any[]
  sites: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    feed_type: stock?.feed_type || 'grower',
    quantity_kg: '',
    supplier_name: stock?.supplier_name || '',
    invoice_number: '',
    notes: '',
    location_type: stock?.location_type || 'global',
    site_id: stock?.site_id || '',
    building_id: stock?.building_id || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [loadingBuildings, setLoadingBuildings] = useState(false)

  // Fetch buildings when site changes
  const fetchBuildings = async (siteId: string) => {
    if (!siteId) {
      setBuildings([])
      return
    }
    setLoadingBuildings(true)
    try {
      const response = await api.get(`/sites/${siteId}`)
      setBuildings(response.data.buildings || [])
    } catch (err) {
      console.error('Error fetching buildings:', err)
      setBuildings([])
    } finally {
      setLoadingBuildings(false)
    }
  }

  // Load buildings when site_id changes
  useEffect(() => {
    if (formData.site_id && formData.location_type === 'building') {
      fetchBuildings(formData.site_id)
    }
  }, [formData.site_id, formData.location_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await api.post('/feed/stock/restock', {
        feed_type: formData.feed_type,
        quantity_kg: parseFloat(formData.quantity_kg),
        supplier_name: formData.supplier_name || null,
        invoice_number: formData.invoice_number || null,
        notes: formData.notes || null,
        location_type: formData.location_type,
        site_id: formData.site_id || null,
        building_id: formData.building_id || null,
      })
      onSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.detail || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-green-600" />
            Reapprovisionner le stock
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destination du stock *</label>
            <div className="grid grid-cols-3 gap-2">
              {STOCK_LOCATIONS.map((loc) => {
                const Icon = loc.icon
                const isSelected = formData.location_type === loc.value
                return (
                  <button
                    key={loc.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      location_type: loc.value,
                      site_id: loc.value === 'global' ? '' : formData.site_id,
                      building_id: loc.value !== 'building' ? '' : formData.building_id,
                    })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition",
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mx-auto mb-1", isSelected ? "text-green-600" : "text-gray-400")} />
                    <p className={cn("text-sm font-medium", isSelected ? "text-green-700" : "text-gray-700")}>
                      {loc.label}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Site Selection */}
          {(formData.location_type === 'site' || formData.location_type === 'building') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value, building_id: '' })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Selectionner un site...</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Building Selection */}
          {formData.location_type === 'building' && formData.site_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batiment *</label>
              <select
                value={formData.building_id}
                onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                disabled={loadingBuildings}
              >
                <option value="">
                  {loadingBuildings ? 'Chargement...' : 'Selectionner un batiment...'}
                </option>
                {buildings.map((building: any) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'aliment *</label>
            <select
              value={formData.feed_type}
              onChange={(e) => setFormData({ ...formData, feed_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              {feedTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantite (kg) *</label>
            <input
              type="number"
              value={formData.quantity_kg}
              onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0"
              min="1"
              step="0.01"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Pour enregistrer les couts d'achat, utilisez le module Finances
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Nom du fournisseur"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="FAC-2024-XXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Notes optionnelles..."
            />
          </div>

          {/* Message d'erreur - pres du bouton */}
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Alert Settings Modal
function AlertSettingsModal({
  stock,
  feedTypes,
  onClose,
  onSave,
}: {
  stock: any[]
  feedTypes: any[]
  onClose: () => void
  onSave: (thresholds: Record<string, number>) => Promise<void>
}) {
  const [thresholds, setThresholds] = useState<Record<string, number>>(
    stock.reduce((acc, s) => ({ ...acc, [s.id]: parseFloat(s.min_quantity_kg) || 100 }), {})
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(thresholds)
      onClose()
    } catch (error) {
      console.error('Error saving thresholds:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Seuils d'alerte</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500">
            Definissez le seuil minimum pour chaque type d'aliment. Une alerte sera declenchee quand le stock passe en dessous.
          </p>

          {stock.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Aucun stock enregistre</p>
          ) : (
            stock.map((s: any) => {
              const typeInfo = feedTypes.find(t => t.value === s.feed_type)
              const quantity = parseFloat(s.quantity_kg) || 0
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{typeInfo?.label || s.feed_type}</p>
                    <p className="text-xs text-gray-500">Stock actuel: {formatNumber(quantity)} kg</p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={thresholds[s.id] || 0}
                      onChange={(e) => setThresholds({ ...thresholds, [s.id]: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-right"
                      min="0"
                    />
                  </div>
                  <span className="text-sm text-gray-500">kg</span>
                </div>
              )
            })
          )}
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || stock.length === 0}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
