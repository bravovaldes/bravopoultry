'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Egg,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Plus,
  Pencil,
  Eye,
  BarChart3,
  Bird,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { DatePickerCompact } from '@/components/ui/date-picker'

type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

export default function ProductionPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all')
  const [selectedLotId, setSelectedLotId] = useState<string>('all')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [lotSearch, setLotSearch] = useState('')

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch buildings (filtered by site)
  const { data: buildings } = useQuery({
    queryKey: ['buildings', selectedSiteId],
    queryFn: async () => {
      const url = selectedSiteId !== 'all'
        ? `/buildings?site_id=${selectedSiteId}`
        : '/buildings'
      const response = await api.get(url)
      return response.data
    },
  })

  // Fetch lots (filtered by site/building, layers only)
  const { data: lots } = useQuery({
    queryKey: ['lots', selectedSiteId, selectedBuildingId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('lot_type', 'layer')
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedBuildingId !== 'all') params.append('building_id', selectedBuildingId)
      const response = await api.get(`/lots?${params.toString()}`)
      return response.data
    },
  })

  // Filter lots based on search
  const filteredLots = (lots || []).filter((lot: any) => {
    if (!lotSearch) return true
    const search = lotSearch.toLowerCase()
    return (
      lot.code?.toLowerCase().includes(search) ||
      lot.name?.toLowerCase().includes(search) ||
      lot.breed?.toLowerCase().includes(search) ||
      lot.building_name?.toLowerCase().includes(search) ||
      lot.site_name?.toLowerCase().includes(search)
    )
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

  // Fetch all egg productions
  const { data: productions, isLoading } = useQuery({
    queryKey: ['all-egg-productions', period, customStartDate, customEndDate, selectedLotId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      const response = await api.get(`/production/eggs?${params.toString()}`)
      return response.data
    },
  })

  // Calculate global stats
  const stats = productions?.length > 0 ? {
    totalEggs: productions.reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0),
    avgLayingRate: productions.reduce((sum: number, p: any) => sum + (parseFloat(p.laying_rate) || 0), 0) / productions.length,
    sellableEggs: productions.reduce((sum: number, p: any) => sum + (p.sellable_eggs || 0), 0),
    crackedEggs: productions.reduce((sum: number, p: any) => sum + (p.cracked_eggs || 0), 0),
    totalCartons: Math.floor(productions.reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0) / 30),
  } : null

  // Calculate trend (compare last 7 days vs previous 7 days)
  const trend = productions?.length >= 14 ? (() => {
    const sorted = [...productions].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const recent = sorted.slice(0, 7).reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0)
    const previous = sorted.slice(7, 14).reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0)
    return previous === 0 ? 0 : ((recent - previous) / previous) * 100
  })() : null

  // Prepare chart data (aggregate by date, sorted chronologically)
  const chartData = productions?.length > 0 ? (() => {
    const byDate: Record<string, { date: string; totalEggs: number; avgRate: number; count: number }> = {}
    productions.forEach((p: any) => {
      const d = p.date
      if (!byDate[d]) {
        byDate[d] = { date: d, totalEggs: 0, avgRate: 0, count: 0 }
      }
      byDate[d].totalEggs += p.total_eggs || 0
      byDate[d].avgRate += parseFloat(p.laying_rate) || 0
      byDate[d].count++
    })
    return Object.values(byDate)
      .map(d => ({
        date: d.date,
        totalEggs: d.totalEggs,
        tauxPonte: d.count > 0 ? Math.round((d.avgRate / d.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })() : []

  // Handle quick add
  const handleQuickAdd = (lotId: string) => {
    setShowAddMenu(false)
    router.push(`/lots/${lotId}/daily-entry`)
  }

  // Check if there are any active layer lots
  const hasLayerLots = lots && lots.length > 0
  const activeLayerLots = lots?.filter((lot: any) => lot.status === 'active') || []
  const hasActiveLayerLots = activeLayerLots.length > 0

  // If no layer lots at all, show empty state with preview
  if (!isLoading && !hasLayerLots) {
    return (
      <div className="space-y-4 lg:space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg border p-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Production d'oeufs</h1>
            <p className="text-sm text-gray-500">Vue globale de la production</p>
          </div>
          <Link
            href="/lots/new?type=layer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Creer un lot pondeuses</span>
            <span className="sm:hidden">Creer</span>
          </Link>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Egg className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">
                Commencez a suivre votre production
              </h2>
              <p className="text-orange-100 text-sm sm:text-base">
                Creez un lot de type "Pondeuses" pour debloquer le suivi complet : collecte quotidienne,
                taux de ponte, analyse par phase et graphiques d'evolution.
              </p>
            </div>
            <Link
              href="/lots/new?type=layer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              Creer un lot
            </Link>
          </div>
        </div>

        {/* Preview Stats Cards - Disabled/Preview mode */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg px-4 py-2 border flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">Apercu - Creez un lot pour voir vos donnees</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 opacity-60">
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Total oeufs</p>
                <span className="text-xs flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  +5.2%
                </span>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">12,450</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-sm text-gray-500">Taux moyen</p>
              <p className="text-xl lg:text-2xl font-bold text-green-600">85.3%</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-sm text-gray-500">Plateaux</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">415</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-sm text-gray-500">Vendables</p>
              <p className="text-xl lg:text-2xl font-bold text-green-600">12,180</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-sm text-gray-500">Casses/Feles</p>
              <p className="text-xl lg:text-2xl font-bold text-red-600">270</p>
            </div>
          </div>
        </div>

        {/* Preview Chart */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-lg"></div>
          <div className="bg-white rounded-lg border p-3 opacity-60">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold">Evolution de la production</h3>
            </div>
            <div className="h-48 lg:h-56 flex items-end justify-around gap-2 px-4">
              {/* Fake bar chart visualization */}
              {[65, 72, 68, 80, 85, 78, 82, 88, 84, 90, 86, 92].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-[10px] text-gray-400">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span>Production journaliere</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>Taux de ponte</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-lg"></div>
          <div className="bg-white rounded-lg border opacity-60">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Historique detaille</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Date</th>
                    <th className="text-left p-3 font-medium text-gray-600">Lot</th>
                    <th className="text-right p-3 font-medium text-gray-600">Normaux</th>
                    <th className="text-right p-3 font-medium text-gray-600">Feles</th>
                    <th className="text-right p-3 font-medium text-gray-600">Total</th>
                    <th className="text-right p-3 font-medium text-gray-600">Taux</th>
                    <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { date: '31/01/2026', lot: 'LOT-001', normal: 850, feles: 12, total: 862, taux: 86.2 },
                    { date: '30/01/2026', lot: 'LOT-001', normal: 842, feles: 8, total: 850, taux: 85.0 },
                    { date: '29/01/2026', lot: 'LOT-001', normal: 865, feles: 15, total: 880, taux: 88.0 },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{row.date}</td>
                      <td className="p-3 text-orange-600">{row.lot}</td>
                      <td className="p-3 text-right">{row.normal}</td>
                      <td className="p-3 text-right text-red-600">{row.feles}</td>
                      <td className="p-3 text-right font-medium">{row.total}</td>
                      <td className="p-3 text-right">
                        <span className="font-medium text-green-600">{row.taux}%</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <span className="p-1.5 text-gray-300"><Pencil className="w-4 h-4" /></span>
                          <span className="p-1.5 text-gray-300"><Eye className="w-4 h-4" /></span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-medium text-orange-800 mb-1">Comment commencer ?</h3>
              <p className="text-sm text-orange-700">
                1. <Link href="/lots/new?type=layer" className="underline font-medium">Creez un lot pondeuses</Link> en selectionnant le type "Pondeuses"<br />
                2. Une fois le lot actif, enregistrez la collecte quotidienne d'oeufs<br />
                3. Suivez vos performances avec les graphiques et analyses automatiques
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-3">
      {/* Header compact */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production d'oeufs</h1>
          <p className="text-sm text-gray-500">Vue globale de la production</p>
        </div>

        {/* Quick Add Button */}
        <div className="relative">
          {hasActiveLayerLots ? (
            <>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                <Plus className="w-5 h-5" />
                Ajouter
              </button>

              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-2 border-b">
                    <p className="text-xs text-gray-500 font-medium">Choisir un lot actif</p>
                  </div>
                  {activeLayerLots.length > 5 && (
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        placeholder="Rechercher un lot..."
                        value={lotSearch}
                        onChange={(e) => setLotSearch(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto">
                    {activeLayerLots.filter((lot: any) => {
                      if (!lotSearch) return true
                      const search = lotSearch.toLowerCase()
                      return (
                        lot.code?.toLowerCase().includes(search) ||
                        lot.name?.toLowerCase().includes(search) ||
                        lot.building_name?.toLowerCase().includes(search)
                      )
                    }).map((lot: any) => (
                      <button
                        key={lot.id}
                        onClick={() => handleQuickAdd(lot.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Egg className="w-4 h-4 text-orange-500" />
                        <div>
                          <span className="text-sm font-medium">{lot.name || lot.code}</span>
                          {lot.building_name && <span className="text-xs text-gray-400 ml-1">({lot.building_name})</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/lots/new?type=layer"
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-5 h-5" />
              Creer un lot
            </Link>
          )}
        </div>
      </div>

      {/* Warning banner when no active lots */}
      {hasLayerLots && !hasActiveLayerLots && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800">
              <strong>Aucun lot pondeuses actif.</strong>{' '}
              <span className="hidden sm:inline">Vous avez {lots?.length} lot(s) pondeuses mais aucun n'est actif.</span>
            </p>
          </div>
          <Link
            href="/lots?type=layer"
            className="flex-shrink-0 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition"
          >
            Gerer
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedBuildingId('all')
              setSelectedLotId('all')
            }}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          {/* Building filter */}
          <select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value)
              setSelectedLotId('all')
            }}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les batiments</option>
            {buildings?.filter((b: any) => selectedSiteId === 'all' || b.site_id === selectedSiteId)
              .map((building: any) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>

          {/* Lot filter with search */}
          <div className="flex items-center gap-2">
            {lots?.length > 5 && (
              <input
                type="text"
                placeholder="Rechercher lot..."
                value={lotSearch}
                onChange={(e) => setLotSearch(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm w-32"
              />
            )}
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              size={filteredLots.length > 5 ? 3 : 1}
            >
              <option value="all">Tous les lots</option>
              {filteredLots.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} {lot.building_name ? `· ${lot.building_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
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

          {period === 'custom' && (
            <>
              <DatePickerCompact
                value={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                placeholder="Debut"
                maxDate={new Date()}
              />
              <span className="text-gray-400">-</span>
              <DatePickerCompact
                value={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                placeholder="Fin"
                maxDate={new Date()}
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total oeufs</p>
              {trend !== null && (
                <span className={cn(
                  "text-xs flex items-center gap-1",
                  trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"
                )}>
                  {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalEggs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-sm text-gray-500">Taux moyen</p>
            <p className={cn(
              "text-xl lg:text-2xl font-bold",
              stats.avgLayingRate >= 80 ? "text-green-600" : stats.avgLayingRate >= 60 ? "text-orange-600" : "text-red-600"
            )}>
              {stats.avgLayingRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-sm text-gray-500">Plateaux</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalCartons.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-sm text-gray-500">Vendables</p>
            <p className="text-xl lg:text-2xl font-bold text-green-600">{stats.sellableEggs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-sm text-gray-500">Casses/Feles</p>
            <p className="text-xl lg:text-2xl font-bold text-red-600">{stats.crackedEggs.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold">Evolution de la production</h3>
          </div>
          <div className="h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const d = new Date(value)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalEggs') return [value.toLocaleString(), 'Oeufs']
                    if (name === 'tauxPonte') return [`${value}%`, 'Taux de ponte']
                    return [value, name]
                  }}
                />
                <Legend
                  formatter={(value) => {
                    if (value === 'totalEggs') return 'Oeufs'
                    if (value === 'tauxPonte') return 'Taux de ponte'
                    return value
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalEggs"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tauxPonte"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Production History Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Historique detaille ({productions?.length || 0})</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
          </div>
        ) : productions?.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Egg className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune production enregistree</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-4">
              {hasActiveLayerLots
                ? "Commencez a enregistrer la collecte d'oeufs quotidienne pour suivre vos performances."
                : "Vous avez des lots pondeuses mais aucun n'est actif. Activez un lot pour commencer la saisie."
              }
            </p>
            {hasActiveLayerLots ? (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {activeLayerLots.slice(0, 3).map((lot: any) => (
                  <Link
                    key={lot.id}
                    href={`/lots/${lot.id}/daily-entry`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Saisir pour {lot.name || lot.code}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                href="/lots"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Gerer les lots
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Lot</th>
                  <th className="text-right p-3 font-medium text-gray-600">Normaux</th>
                  <th className="text-right p-3 font-medium text-gray-600">Feles</th>
                  <th className="text-right p-3 font-medium text-gray-600">Total</th>
                  <th className="text-right p-3 font-medium text-gray-600">Taux</th>
                  <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productions?.map((prod: any) => (
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{formatDate(prod.date)}</td>
                    <td className="p-3">
                      <Link href={`/lots/${prod.lot_id}`} className="text-orange-600 hover:underline">
                        {prod.lot?.code || '-'}
                      </Link>
                    </td>
                    <td className="p-3 text-right">{prod.normal_eggs?.toLocaleString()}</td>
                    <td className="p-3 text-right text-red-600">{prod.cracked_eggs || '-'}</td>
                    <td className="p-3 text-right font-medium">{prod.total_eggs?.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      {prod.laying_rate ? (
                        <span className={cn(
                          "font-medium",
                          parseFloat(prod.laying_rate) >= 80 ? "text-green-600" :
                          parseFloat(prod.laying_rate) >= 60 ? "text-orange-600" : "text-red-600"
                        )}>
                          {parseFloat(prod.laying_rate).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/lots/${prod.lot_id}/daily-entry?date=${prod.date}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/lots/${prod.lot_id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
                          title="Voir le lot"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAddMenu(false)}
        />
      )}
    </div>
  )
}
