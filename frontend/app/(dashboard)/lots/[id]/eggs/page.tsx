'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Egg, Bird, CheckCircle, Package, AlertCircle, Filter, TrendingUp, TrendingDown, Minus, History, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, formatDate, getTodayInTimezone } from '@/lib/utils'
import { DatePicker, DatePickerCompact } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { EGGS_PER_CARTON } from '@/lib/constants'

type ViewMode = 'entry' | 'history'
type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

export default function EggsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string

  const timezone = useTimezone()
  const initialDate = searchParams.get('date') || getTodayInTimezone(timezone)
  const initialView = searchParams.get('view') as ViewMode || 'entry'

  const [viewMode, setViewMode] = useState<ViewMode>(initialView)
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [inputMode, setInputMode] = useState<'eggs' | 'cartons'>('eggs')
  const [formData, setFormData] = useState({
    date: initialDate,
    eggs_normal: '',
    eggs_cracked: '',
    eggs_dirty: '',
    eggs_small: '',
    cartons: '',
    extra_eggs: '',
  })

  const [success, setSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState('')

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  // Check if data exists for the selected date
  const { data: existingEntry } = useQuery({
    queryKey: ['daily-entry', lotId, formData.date],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/daily-entry/${formData.date}`)
      return response.data
    },
    enabled: !!lotId && !!formData.date,
  })

  // Get date range for history
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
  const { data: productions, isLoading: historyLoading } = useQuery({
    queryKey: ['egg-productions', lotId, period, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({ lot_id: lotId })
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      const response = await api.get(`/production/eggs?${params.toString()}`)
      return response.data
    },
    enabled: viewMode === 'history',
  })

  // Calculate stats for history
  const historyStats = productions?.length > 0 ? {
    totalEggs: productions.reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0),
    avgLayingRate: productions.reduce((sum: number, p: any) => sum + (parseFloat(p.laying_rate) || 0), 0) / productions.length,
    avgDaily: productions.reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0) / productions.length,
    sellableEggs: productions.reduce((sum: number, p: any) => sum + (p.sellable_eggs || 0), 0),
    crackedTotal: productions.reduce((sum: number, p: any) => sum + (p.cracked_eggs || 0), 0),
  } : null

  const trend = productions?.length >= 14 ? (() => {
    const recent = productions.slice(0, 7).reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0)
    const previous = productions.slice(7, 14).reduce((sum: number, p: any) => sum + (p.total_eggs || 0), 0)
    return previous === 0 ? 0 : ((recent - previous) / previous) * 100
  })() : null

  // Load existing data when found
  useEffect(() => {
    if (existingEntry?.exists && existingEntry?.data?.eggs) {
      const eggs = existingEntry.data.eggs
      setFormData(prev => ({
        ...prev,
        eggs_normal: eggs.eggs_normal?.toString() || '',
        eggs_cracked: eggs.eggs_cracked?.toString() || '',
        eggs_dirty: eggs.eggs_dirty?.toString() || '',
        eggs_small: eggs.eggs_small?.toString() || '',
      }))
      setIsEditMode(true)
    } else {
      setIsEditMode(false)
    }
  }, [existingEntry])

  const submitEntry = useMutation({
    mutationFn: async (data: any) => {
      let eggsNormal = parseInt(data.eggs_normal) || 0
      if (inputMode === 'cartons') {
        const cartons = parseInt(data.cartons) || 0
        const extra = parseInt(data.extra_eggs) || 0
        eggsNormal = (cartons * EGGS_PER_CARTON) + extra
      }

      const payload = {
        date: data.date,
        eggs_normal: eggsNormal,
        eggs_cracked: parseInt(data.eggs_cracked) || 0,
        eggs_dirty: parseInt(data.eggs_dirty) || 0,
        eggs_small: parseInt(data.eggs_small) || 0,
      }

      // Use PUT for update, POST for create
      if (isEditMode) {
        const response = await api.put(`/lots/${lotId}/daily-entry`, payload)
        return response.data
      } else {
        const response = await api.post(`/lots/${lotId}/daily-entry`, payload)
        return response.data
      }
    },
    onSuccess: () => {
      setSuccess(true)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lot-history', lotId] })
      toast.success(isEditMode ? 'Production modifiee' : 'Production enregistree')
      setTimeout(() => {
        router.push(`/lots/${lotId}`)
      }, 1000)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totalEggs === 0) {
      toast.error('Entrez au moins une valeur')
      return
    }
    submitEntry.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-medium text-gray-900">Production enregistree!</p>
        <p className="text-gray-500">Redirection...</p>
      </div>
    )
  }

  let normal = 0
  if (inputMode === 'eggs') {
    normal = parseInt(formData.eggs_normal) || 0
  } else {
    const cartons = parseInt(formData.cartons) || 0
    const extra = parseInt(formData.extra_eggs) || 0
    normal = (cartons * EGGS_PER_CARTON) + extra
  }

  const cracked = parseInt(formData.eggs_cracked) || 0
  const dirty = parseInt(formData.eggs_dirty) || 0
  const small = parseInt(formData.eggs_small) || 0
  const totalEggs = normal + cracked + dirty + small
  const totalCartons = Math.floor(totalEggs / EGGS_PER_CARTON)
  const remainingEggs = totalEggs % EGGS_PER_CARTON
  const layingRate = lot?.current_quantity && lot.current_quantity > 0
    ? (totalEggs / lot.current_quantity) * 100
    : 0
  const qualityRate = totalEggs > 0 ? (normal / totalEggs) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/lots/${lotId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Production d'oeufs</h1>
            <p className="text-sm text-gray-500">{lot?.code} - {lot?.current_quantity?.toLocaleString()} poules</p>
          </div>
        </div>
        {lot?.stats?.average_laying_rate > 0 && (
          <div className="text-right bg-orange-50 px-3 py-1 rounded-lg">
            <p className="text-xs text-gray-500">Taux moyen</p>
            <p className="font-bold text-orange-600">{Number(lot.stats.average_laying_rate).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode('entry')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2",
            viewMode === 'entry' ? "bg-white shadow text-orange-600" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Plus className="w-4 h-4" />
          Saisie
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2",
            viewMode === 'history' ? "bg-white shadow text-orange-600" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <History className="w-4 h-4" />
          Historique
        </button>
      </div>

      {/* History View */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Periode:</span>
              </div>
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

          {/* Stats */}
          {historyStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
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
                <p className="text-2xl font-bold text-gray-900">{historyStats.totalEggs.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Taux moyen</p>
                <p className="text-2xl font-bold text-orange-600">{historyStats.avgLayingRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Moyenne/jour</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(historyStats.avgDaily).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Vendables</p>
                <p className="text-2xl font-bold text-green-600">{historyStats.sellableEggs.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Historique ({productions?.length || 0})</h3>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
              </div>
            ) : productions?.length === 0 ? (
              <div className="text-center py-12">
                <Egg className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune production enregistree</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-right p-3 font-medium text-gray-600">Normaux</th>
                      <th className="text-right p-3 font-medium text-gray-600">Feles</th>
                      <th className="text-right p-3 font-medium text-gray-600">Sales</th>
                      <th className="text-right p-3 font-medium text-gray-600">Total</th>
                      <th className="text-right p-3 font-medium text-gray-600">Taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productions?.map((prod: any) => (
                      <tr key={prod.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{formatDate(prod.date)}</td>
                        <td className="p-3 text-right">{prod.normal_eggs?.toLocaleString()}</td>
                        <td className="p-3 text-right text-red-600">{prod.cracked_eggs || '-'}</td>
                        <td className="p-3 text-right text-yellow-600">{prod.dirty_eggs || '-'}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Form View */}
      {viewMode === 'entry' && (

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Colonne gauche */}
          <div className="space-y-4">
            {/* Date */}
            <div className="bg-white rounded-xl border p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(newDate) => {
                  setFormData({
                    date: newDate,
                    eggs_normal: '',
                    eggs_cracked: '',
                    eggs_dirty: '',
                    eggs_small: '',
                    cartons: '',
                    extra_eggs: '',
                  })
                  setIsEditMode(false)
                }}
                showShortcuts={true}
                maxDate={new Date()}
              />
              {isEditMode && (
                <div className="mt-2 flex items-center gap-2 text-orange-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Donnees existantes - modification</span>
                </div>
              )}
            </div>

            {/* Mode de saisie */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">Mode de comptage</span>
                <HelpTooltip title="Mode" content="1 plateau = 30 oeufs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('eggs')}
                  className={cn(
                    'p-3 rounded-lg border-2 transition flex items-center justify-center gap-2',
                    inputMode === 'eggs'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Egg className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Oeufs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('cartons')}
                  className={cn(
                    'p-3 rounded-lg border-2 transition flex items-center justify-center gap-2',
                    inputMode === 'cartons'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Package className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Plateaux</span>
                </button>
              </div>
            </div>

            {/* Oeufs vendables */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Egg className="w-4 h-4 text-green-500" />
                <label className="text-sm font-medium text-gray-700">Oeufs vendables</label>
              </div>

              {inputMode === 'eggs' ? (
                <input
                  type="number"
                  value={formData.eggs_normal}
                  onChange={(e) => setFormData(prev => ({ ...prev, eggs_normal: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-2xl font-bold text-center"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.cartons}
                      onChange={(e) => setFormData(prev => ({ ...prev, cartons: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xl font-bold text-center"
                    />
                    <span className="text-sm text-gray-500 w-16">plateaux</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.extra_eggs}
                      onChange={(e) => setFormData(prev => ({ ...prev, extra_eggs: e.target.value }))}
                      placeholder="0"
                      min="0"
                      max="29"
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg text-center"
                    />
                    <span className="text-sm text-gray-500 w-16">+ oeufs</span>
                  </div>
                  {normal > 0 && (
                    <p className="text-center text-green-600 font-medium text-sm">
                      = {normal.toLocaleString()} oeufs
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Oeufs de mauvaise qualite */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">Oeufs abimes</span>
                <HelpTooltip title="Non vendables" content="Coquille cassee, salete, trop petits" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Casses</label>
                  <input
                    type="number"
                    value={formData.eggs_cracked}
                    onChange={(e) => setFormData(prev => ({ ...prev, eggs_cracked: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-2 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Sales</label>
                  <input
                    type="number"
                    value={formData.eggs_dirty}
                    onChange={(e) => setFormData(prev => ({ ...prev, eggs_dirty: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-2 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Petits</label>
                  <input
                    type="number"
                    value={formData.eggs_small}
                    onChange={(e) => setFormData(prev => ({ ...prev, eggs_small: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-2 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - Resume */}
          <div className="space-y-4">
            {totalEggs > 0 ? (
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 h-full">
                <h3 className="font-medium text-gray-700 mb-4">Resume</h3>

                <div className="bg-white rounded-lg p-4 mb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-orange-500" />
                    <span className="text-gray-500">Total</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalCartons} <span className="text-lg font-normal">plateaux</span>
                  </p>
                  {remainingEggs > 0 && (
                    <p className="text-gray-600">+ {remainingEggs} oeufs</p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">
                    = {totalEggs.toLocaleString()} oeufs
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Taux de ponte</p>
                    <p className={cn(
                      'text-xl font-bold',
                      layingRate >= 80 ? 'text-green-600' : layingRate >= 60 ? 'text-orange-600' : 'text-red-600'
                    )}>
                      {layingRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Qualite</p>
                    <p className={cn(
                      'text-xl font-bold',
                      qualityRate >= 95 ? 'text-green-600' : qualityRate >= 90 ? 'text-orange-600' : 'text-red-600'
                    )}>
                      {qualityRate.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Actions dans le resume sur desktop */}
                <div className="mt-6 flex gap-2">
                  <Link
                    href={`/lots/${lotId}`}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-white transition text-center"
                  >
                    Annuler
                  </Link>
                  <button
                    type="submit"
                    disabled={submitEntry.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    {submitEntry.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isEditMode ? 'Modifier' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border p-6 h-full flex flex-col items-center justify-center text-gray-400">
                <Egg className="w-12 h-12 mb-3" />
                <p>Entrez vos donnees</p>
                <p className="text-sm">Le resume s'affichera ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2 mt-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions sur mobile */}
        <div className="lg:hidden flex justify-end gap-3 mt-4">
          <Link
            href={`/lots/${lotId}`}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitEntry.isPending || totalEggs === 0}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
          >
            {submitEntry.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isEditMode ? 'Modifier' : 'Enregistrer'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
