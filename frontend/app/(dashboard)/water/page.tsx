'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Droplet,
  Plus,
  Filter,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  X,
  Pencil,
  Beaker,
  Thermometer,
} from 'lucide-react'
import { cn, formatDate, getTodayInTimezone } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
} from 'recharts'

type FilterPeriod = '7d' | '30d' | '90d' | 'all'

export default function WaterPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedLotId, setSelectedLotId] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)

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
      default: return {}
    }
    return { start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0] }
  }

  // Mock water data (in real app, fetch from API)
  const waterData = [
    { date: '2026-01-20', lot_code: 'BC-2026-001', consumption_liters: 850, feed_kg: 420, ratio: 2.02 },
    { date: '2026-01-21', lot_code: 'BC-2026-001', consumption_liters: 870, feed_kg: 430, ratio: 2.02 },
    { date: '2026-01-22', lot_code: 'BC-2026-001', consumption_liters: 920, feed_kg: 440, ratio: 2.09 },
    { date: '2026-01-23', lot_code: 'BC-2026-001', consumption_liters: 880, feed_kg: 445, ratio: 1.98 },
    { date: '2026-01-24', lot_code: 'BC-2026-001', consumption_liters: 950, feed_kg: 450, ratio: 2.11 },
    { date: '2026-01-25', lot_code: 'BC-2026-001', consumption_liters: 980, feed_kg: 460, ratio: 2.13 },
    { date: '2026-01-26', lot_code: 'BC-2026-001', consumption_liters: 900, feed_kg: 455, ratio: 1.98 },
    { date: '2026-01-27', lot_code: 'BC-2026-001', consumption_liters: 1020, feed_kg: 470, ratio: 2.17 },
    { date: '2026-01-28', lot_code: 'BC-2026-001', consumption_liters: 1050, feed_kg: 480, ratio: 2.19 },
  ]

  // Calculate stats
  const stats = {
    totalConsumption: waterData.reduce((sum, w) => sum + w.consumption_liters, 0),
    avgDaily: waterData.length > 0 ? waterData.reduce((sum, w) => sum + w.consumption_liters, 0) / waterData.length : 0,
    avgRatio: waterData.length > 0 ? waterData.reduce((sum, w) => sum + w.ratio, 0) / waterData.length : 0,
    alertCount: waterData.filter(w => w.ratio > 2.1 || w.ratio < 1.8).length,
  }

  // Chart data
  const chartData = waterData.map(w => ({
    date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    eau: w.consumption_liters,
    aliment: w.feed_kg,
    ratio: w.ratio,
  }))

  // Check for abnormal consumption
  const hasAbnormalConsumption = stats.avgRatio > 2.1 || stats.avgRatio < 1.8

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consommation d'eau</h1>
          <p className="text-gray-500">Suivi de la consommation et ratio eau/aliment</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter releve
        </button>
      </div>

      {/* Alert */}
      {hasAbnormalConsumption && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Attention</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            Le ratio eau/aliment ({stats.avgRatio.toFixed(2)}) est hors de la plage normale (1.8 - 2.1).
            Cela peut indiquer un probleme de sante ou de temperature.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedLotId('all')
            }}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          <select
            value={selectedLotId}
            onChange={(e) => setSelectedLotId(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les lots</option>
            {lots?.map((lot: any) => (
              <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            {(['7d', '30d', '90d', 'all'] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition",
                  period === p
                    ? "bg-cyan-100 text-cyan-700 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {p === '7d' ? '7j' : p === '30d' ? '30j' : p === '90d' ? '90j' : 'Tout'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-5 h-5 text-cyan-600" />
            <p className="text-sm text-gray-500">Consommation totale</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalConsumption.toLocaleString()} L</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Moyenne/jour</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.avgDaily.toFixed(0)} L</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Beaker className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-500">Ratio eau/aliment</p>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            stats.avgRatio >= 1.8 && stats.avgRatio <= 2.1 ? "text-green-600" : "text-amber-600"
          )}>
            {stats.avgRatio.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">Normal: 1.8 - 2.1</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-500">Alertes</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.alertCount}</p>
          <p className="text-xs text-gray-400">jours hors norme</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consumption & Feed */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Consommation eau vs aliment
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="eau" name="Eau (L)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="aliment" name="Aliment (kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratio Evolution */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-purple-600" />
            Evolution du ratio eau/aliment
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1.5, 2.5]} tick={{ fontSize: 11 }} />
                <Tooltip />
                {/* Reference lines for normal range */}
                <Line type="monotone" dataKey="ratio" name="Ratio" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="text-green-600">Zone normale: 1.8 - 2.1</span>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-gray-400" />
          Guide du ratio eau/aliment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="font-medium text-red-700">Ratio &lt; 1.8</p>
            <p className="text-sm text-red-600 mt-1">
              Consommation d'eau insuffisante. Verifier:
            </p>
            <ul className="text-xs text-red-600 mt-2 space-y-1">
              <li>• Abreuvoirs fonctionnels</li>
              <li>• Pression d'eau suffisante</li>
              <li>• Qualite de l'eau</li>
            </ul>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="font-medium text-green-700">Ratio 1.8 - 2.1</p>
            <p className="text-sm text-green-600 mt-1">
              Consommation normale. Les volailles sont en bonne sante.
            </p>
            <ul className="text-xs text-green-600 mt-2 space-y-1">
              <li>• Hydratation optimale</li>
              <li>• Bonne digestion</li>
              <li>• Temperature normale</li>
            </ul>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="font-medium text-amber-700">Ratio &gt; 2.1</p>
            <p className="text-sm text-amber-600 mt-1">
              Consommation excessive. Causes possibles:
            </p>
            <ul className="text-xs text-amber-600 mt-2 space-y-1">
              <li>• Temperature elevee</li>
              <li>• Stress thermique</li>
              <li>• Probleme de sante</li>
              <li>• Fuite d'eau</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Historique des releves ({waterData.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Date</th>
                <th className="text-left p-3 font-medium text-gray-600">Lot</th>
                <th className="text-right p-3 font-medium text-gray-600">Eau (L)</th>
                <th className="text-right p-3 font-medium text-gray-600">Aliment (kg)</th>
                <th className="text-right p-3 font-medium text-gray-600">Ratio</th>
                <th className="text-center p-3 font-medium text-gray-600">Statut</th>
                <th className="text-center p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {waterData.map((w, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{formatDate(w.date)}</td>
                  <td className="p-3">{w.lot_code}</td>
                  <td className="p-3 text-right">{w.consumption_liters.toLocaleString()}</td>
                  <td className="p-3 text-right">{w.feed_kg.toLocaleString()}</td>
                  <td className="p-3 text-right font-medium">{w.ratio.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    {w.ratio >= 1.8 && w.ratio <= 2.1 ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Normal</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">Anormal</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      <button className="p-1.5 hover:bg-gray-100 rounded" title="Modifier">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddWaterModal
          lots={lots}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['water'] })
          }}
        />
      )}
    </div>
  )
}

// Add Water Modal
function AddWaterModal({ lots, onClose, onSuccess }: { lots: any[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    lot_id: '',
    consumption_liters: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // API call would go here
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ajouter releve d'eau</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Selectionner</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>{lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consommation (litres)</label>
            <input
              type="number"
              value={formData.consumption_liters}
              onChange={(e) => setFormData({ ...formData, consumption_liters: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
