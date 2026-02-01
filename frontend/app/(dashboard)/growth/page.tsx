'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  Scale,
  Filter,
  TrendingUp,
  ChevronRight,
  Bird,
  Plus,
  Pencil,
  Eye,
  BarChart3,
  ChevronDown,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { DatePickerCompact } from '@/components/ui/date-picker'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

export default function GrowthPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<FilterPeriod>('all')
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

  // Fetch lots (broilers only, filtered by site/building)
  const { data: lots } = useQuery({
    queryKey: ['lots', selectedSiteId, selectedBuildingId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('lot_type', 'broiler')
      params.append('status', 'active')
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

  // Fetch all weight records
  const { data: weights, isLoading } = useQuery({
    queryKey: ['all-weight-records', period, customStartDate, customEndDate, selectedLotId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      const response = await api.get(`/production/weights?${params.toString()}`)
      return response.data
    },
  })

  // Group weights by lot and calculate stats
  const lotStats = weights?.reduce((acc: any, w: any) => {
    const lotId = w.lot_id
    if (!acc[lotId]) {
      acc[lotId] = {
        lot_id: lotId,
        lot_code: w.lot?.code || 'Lot inconnu',
        lot_age: w.lot?.age_days || 0,
        records: [],
      }
    }
    acc[lotId].records.push(w)
    return acc
  }, {})

  const lotSummaries = lotStats ? Object.values(lotStats).map((s: any) => {
    const sorted = s.records.sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    let gmq = 0
    let totalGain = 0
    if (sorted.length >= 2) {
      const daysDiff = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))
      totalGain = parseFloat(last.average_weight_g) - parseFloat(first.average_weight_g)
      gmq = totalGain / daysDiff
    }

    return {
      lot_id: s.lot_id,
      lot_code: s.lot_code,
      lot_age: s.lot_age,
      currentWeight: parseFloat(last?.average_weight_g) || 0,
      gmq,
      totalGain,
      recordCount: s.records.length,
    }
  }).sort((a: any, b: any) => b.currentWeight - a.currentWeight) : []

  // Global stats
  const globalStats = lotSummaries.length > 0 ? {
    avgWeight: lotSummaries.reduce((sum: number, s: any) => sum + s.currentWeight, 0) / lotSummaries.length,
    avgGmq: lotSummaries.reduce((sum: number, s: any) => sum + s.gmq, 0) / lotSummaries.length,
    totalRecords: weights?.length || 0,
    activeLots: lotSummaries.length,
  } : null

  // Chart data - weight progression over time
  const chartData = weights
    ?.slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((w: any) => ({
      date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      poids: parseFloat(w.average_weight_g) / 1000,
      gmq: w.age_days && parseFloat(w.average_weight_g) / w.age_days,
    })) || []

  // Navigate to lot weight entry
  const handleQuickAdd = (lotId: string) => {
    router.push(`/lots/${lotId}/weight`)
    setShowAddMenu(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Croissance & Pesees</h1>
          <p className="text-gray-500">Suivi du poids de tous les lots chairs</p>
        </div>

        {/* Quick Add Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter pesee
            <ChevronDown className={cn("w-4 h-4 transition", showAddMenu && "rotate-180")} />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50">
              <div className="p-2">
                <p className="text-xs text-gray-500 px-2 py-1">Selectionner un lot</p>
                {lots?.length > 5 && (
                  <div className="px-2 py-1">
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
                {filteredLots.length > 0 ? (
                  filteredLots.map((lot: any) => (
                    <button
                      key={lot.id}
                      onClick={() => handleQuickAdd(lot.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center gap-2"
                    >
                      <Bird className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <span className="font-medium">{lot.name || lot.code}</span>
                        {lot.site_name && <span className="text-xs text-gray-400 ml-1">({lot.site_name})</span>}
                      </div>
                      <span className="text-xs text-gray-400">J{lot.age_days || 0}</span>
                    </button>
                  ))
                ) : lotSearch ? (
                  <p className="text-sm text-gray-500 px-3 py-2">Aucun lot trouve pour "{lotSearch}"</p>
                ) : (
                  <p className="text-sm text-gray-500 px-3 py-2">Aucun lot chair actif</p>
                )}
              </div>
            </div>
          )}
        </div>
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
                  {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} {lot.site_name ? `· ${lot.site_name}` : ''}
                </option>
              ))}
            </select>
          </div>
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
                    ? "bg-green-100 text-green-700 font-medium"
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
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Poids moyen</p>
            <p className="text-2xl font-bold text-gray-900">{(globalStats.avgWeight / 1000).toFixed(2)} kg</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">GMQ moyen</p>
            <p className="text-2xl font-bold text-green-600">{globalStats.avgGmq.toFixed(1)} g/j</p>
            <p className="text-xs text-gray-400">Gain Moyen Quotidien</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total pesees</p>
            <p className="text-2xl font-bold text-gray-900">{globalStats.totalRecords}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Lots actifs</p>
            <p className="text-2xl font-bold text-blue-600">{globalStats.activeLots}</p>
          </div>
        </div>
      )}

      {/* Weight Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Evolution du poids</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'poids' ? `${value.toFixed(2)} kg` : `${value?.toFixed(1)} g/j`,
                    name === 'poids' ? 'Poids' : 'GMQ'
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="poids"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                  name="Poids"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lot Summary */}
      {selectedLotId === 'all' && lotSummaries.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Performance par lot</h3>
          </div>
          <div className="divide-y">
            {lotSummaries.map((lot: any) => (
              <div
                key={lot.lot_id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <Link
                  href={`/lots/${lot.lot_id}/weight?view=history`}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Bird className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{lot.lot_code}</p>
                    <p className="text-sm text-gray-500">J{lot.lot_age} - {lot.recordCount} pesees</p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{(lot.currentWeight / 1000).toFixed(2)} kg</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {lot.gmq.toFixed(1)} g/j
                      </span>
                      {lot.totalGain > 0 && (
                        <span className="text-gray-400">
                          (+{(lot.totalGain / 1000).toFixed(2)} kg)
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/lots/${lot.lot_id}/weight`)}
                      className="p-2 hover:bg-green-100 rounded-lg transition"
                      title="Ajouter pesee"
                    >
                      <Plus className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                      onClick={() => router.push(`/lots/${lot.lot_id}/weight?view=history`)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition"
                      title="Voir historique"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <Link href={`/lots/${lot.lot_id}`}>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weight History Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Historique des pesees ({weights?.length || 0})</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500"></div>
          </div>
        ) : weights?.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune pesee enregistree</p>
            <p className="text-sm text-gray-400 mt-1">Commencez par ajouter des pesees dans un lot</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Lot</th>
                  <th className="text-right p-3 font-medium text-gray-600">Age</th>
                  <th className="text-right p-3 font-medium text-gray-600">Poids (g)</th>
                  <th className="text-right p-3 font-medium text-gray-600">Poids (kg)</th>
                  <th className="text-right p-3 font-medium text-gray-600">vs Standard</th>
                  <th className="text-right p-3 font-medium text-gray-600">Echantillon</th>
                  <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weights?.map((w: any) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{formatDate(w.date)}</td>
                    <td className="p-3">
                      <Link href={`/lots/${w.lot_id}`} className="text-green-600 hover:underline">
                        {w.lot?.code || '-'}
                      </Link>
                    </td>
                    <td className="p-3 text-right">J{w.age_days || '-'}</td>
                    <td className="p-3 text-right font-medium">{parseFloat(w.average_weight_g).toLocaleString()}</td>
                    <td className="p-3 text-right">{(parseFloat(w.average_weight_g) / 1000).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      {w.weight_vs_standard ? (
                        <span className={cn(
                          "font-medium",
                          parseFloat(w.weight_vs_standard) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {parseFloat(w.weight_vs_standard) >= 0 ? '+' : ''}{parseFloat(w.weight_vs_standard).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-500">{w.sample_size || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => router.push(`/lots/${w.lot_id}/weight?edit=${w.id}`)}
                          className="p-1.5 hover:bg-amber-100 rounded transition"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => router.push(`/lots/${w.lot_id}/weight?view=history`)}
                          className="p-1.5 hover:bg-blue-100 rounded transition"
                          title="Voir lot"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
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
    </div>
  )
}
