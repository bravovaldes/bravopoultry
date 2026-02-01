'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Scale, Bird, CheckCircle, TrendingUp, TrendingDown, AlertCircle, Filter, History, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, formatDate, getTodayInTimezone } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import { HelpTooltip } from '@/components/ui/help-tooltip'

type ViewMode = 'entry' | 'history'
type FilterPeriod = '7d' | '30d' | '90d' | 'all' | 'custom'

export default function WeightPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string

  const timezone = useTimezone()
  const initialDate = searchParams.get('date') || getTodayInTimezone(timezone)
  const initialView = searchParams.get('view') as ViewMode || 'entry'

  const [viewMode, setViewMode] = useState<ViewMode>(initialView)
  const [period, setPeriod] = useState<FilterPeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [formData, setFormData] = useState({
    date: initialDate,
    average_weight_g: '',
    sample_size: '10',
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

  // Check if data exists for selected date
  const { data: existingEntry } = useQuery({
    queryKey: ['daily-entry', lotId, formData.date],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/daily-entry/${formData.date}`)
      return response.data
    },
    enabled: !!lotId && !!formData.date,
  })

  // Load existing data when found
  useEffect(() => {
    if (existingEntry?.exists && existingEntry?.data?.weight) {
      const weight = existingEntry.data.weight
      setFormData(prev => ({
        ...prev,
        average_weight_g: weight.average_weight_g?.toString() || '',
        sample_size: weight.sample_size?.toString() || '10',
      }))
      setIsEditMode(true)
    } else {
      setIsEditMode(false)
    }
  }, [existingEntry])

  // Weight history query
  const { data: weightRecords, isLoading: historyLoading } = useQuery({
    queryKey: ['weight-records', lotId],
    queryFn: async () => {
      const response = await api.get(`/production/weights?lot_id=${lotId}`)
      return response.data
    },
    enabled: viewMode === 'history',
  })

  // Calculate growth stats
  const growthStats = weightRecords?.length >= 2 ? (() => {
    const sorted = [...weightRecords].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const daysDiff = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))
    const weightGain = parseFloat(last.average_weight_g) - parseFloat(first.average_weight_g)
    const gmq = weightGain / daysDiff

    return {
      currentWeight: parseFloat(last.average_weight_g),
      totalGain: weightGain,
      gmq: gmq, // Gain Moyen Quotidien
      records: weightRecords.length,
    }
  })() : null

  const submitEntry = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        date: data.date,
        average_weight_g: parseFloat(data.average_weight_g),
        sample_size: parseInt(data.sample_size),
      }

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
      toast.success(isEditMode ? 'Pesee modifiee' : 'Pesee enregistree')
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
    if (!formData.average_weight_g) {
      toast.error('Entrez le poids moyen')
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
        <p className="text-lg font-medium text-gray-900">
          {isEditMode ? 'Pesee modifiee!' : 'Pesee enregistree!'}
        </p>
        <p className="text-gray-500">Redirection...</p>
      </div>
    )
  }

  const weightG = parseFloat(formData.average_weight_g) || 0
  const weightKg = weightG / 1000
  const lastWeight = lot?.stats?.current_weight_g || 0
  const weightGain = weightG - lastWeight

  // Objectif de poids selon l'age (approximatif pour Cobb 500)
  const getTargetWeight = (age: number) => {
    if (age <= 7) return age * 25 + 40
    if (age <= 14) return age * 50
    if (age <= 21) return age * 70
    if (age <= 28) return age * 80
    if (age <= 35) return age * 85
    return age * 60 + 900
  }
  const targetWeight = getTargetWeight(lot?.age_days || 0)
  const vsTarget = ((weightG / targetWeight) * 100) - 100

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/lots/${lotId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Croissance & Pesees</h1>
          <p className="text-gray-500">{lot?.code} - J{lot?.age_days}</p>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode('entry')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2",
            viewMode === 'entry' ? "bg-white shadow text-green-600" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Plus className="w-4 h-4" />
          Nouvelle pesee
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2",
            viewMode === 'history' ? "bg-white shadow text-green-600" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <History className="w-4 h-4" />
          Courbe de croissance
        </button>
      </div>

      {/* History View */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Stats */}
          {growthStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Poids actuel</p>
                <p className="text-2xl font-bold text-gray-900">{(growthStats.currentWeight / 1000).toFixed(2)} kg</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">GMQ</p>
                <p className="text-2xl font-bold text-green-600">{growthStats.gmq.toFixed(1)} g/j</p>
                <p className="text-xs text-gray-400">Gain Moyen Quotidien</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Gain total</p>
                <p className="text-2xl font-bold text-blue-600">+{(growthStats.totalGain / 1000).toFixed(2)} kg</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500">Pesees</p>
                <p className="text-2xl font-bold text-gray-900">{growthStats.records}</p>
              </div>
            </div>
          )}

          {/* Weight Table */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Historique des pesees</h3>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500"></div>
              </div>
            ) : weightRecords?.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune pesee enregistree</p>
                <button onClick={() => setViewMode('entry')} className="text-green-500 hover:underline mt-2">
                  Ajouter une pesee
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-right p-3 font-medium text-gray-600">Age</th>
                      <th className="text-right p-3 font-medium text-gray-600">Poids (g)</th>
                      <th className="text-right p-3 font-medium text-gray-600">Poids (kg)</th>
                      <th className="text-right p-3 font-medium text-gray-600">vs Standard</th>
                      <th className="text-right p-3 font-medium text-gray-600">Echantillon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {weightRecords?.map((record: any, index: number) => {
                      const prevRecord = weightRecords[index + 1]
                      const gain = prevRecord ? parseFloat(record.average_weight_g) - parseFloat(prevRecord.average_weight_g) : 0
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{formatDate(record.date)}</td>
                          <td className="p-3 text-right">J{record.age_days || '-'}</td>
                          <td className="p-3 text-right font-medium">
                            {parseFloat(record.average_weight_g).toLocaleString()}
                            {gain > 0 && (
                              <span className="text-green-600 text-xs ml-2">+{gain}g</span>
                            )}
                          </td>
                          <td className="p-3 text-right">{(parseFloat(record.average_weight_g) / 1000).toFixed(2)}</td>
                          <td className="p-3 text-right">
                            {record.weight_vs_standard ? (
                              <span className={cn(
                                "font-medium",
                                parseFloat(record.weight_vs_standard) >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {parseFloat(record.weight_vs_standard) >= 0 ? '+' : ''}{parseFloat(record.weight_vs_standard).toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-500">{record.sample_size || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Form View */}
      {viewMode === 'entry' && (
      <>
      {/* Info Card */}
      <div className="bg-green-50 rounded-xl border border-green-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bird className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">J{lot?.age_days}</p>
              <p className="text-sm text-green-700">
                Objectif: ~{(targetWeight / 1000).toFixed(2)} kg
              </p>
            </div>
          </div>
          {lastWeight > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Dernier poids</p>
              <p className="text-lg font-bold">{(lastWeight / 1000).toFixed(2)} kg</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div className="bg-white rounded-xl border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de la pesee
          </label>
          <DatePicker
            value={formData.date}
            onChange={(newDate) => {
              setFormData({
                date: newDate,
                average_weight_g: '',
                sample_size: '10',
              })
              setIsEditMode(false)
            }}
            showShortcuts={true}
            maxDate={new Date()}
          />
          {isEditMode && (
            <div className="mt-2 flex items-center gap-2 text-yellow-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Donnees existantes - modification</span>
            </div>
          )}
        </div>

        {/* Poids moyen */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-green-500" />
            <label className="block text-sm font-medium text-gray-700">
              Poids moyen
            </label>
            <HelpTooltip
              title="Poids moyen"
              content="Pesez 10-20 oiseaux au hasard et calculez la moyenne. Prenez des oiseaux de differentes zones."
            />
          </div>
          <input
            type="number"
            value={formData.average_weight_g}
            onChange={(e) => setFormData(prev => ({ ...prev, average_weight_g: e.target.value }))}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="0"
            min="0"
            className="w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-3xl font-bold text-center"
            required
          />
          <p className="text-center text-gray-500 mt-2">grammes</p>

          {weightG > 0 && (
            <div className="bg-green-50 rounded-lg p-4 mt-4 text-center">
              <p className="text-3xl font-bold text-green-700">{weightKg.toFixed(2)} kg</p>
              {lastWeight > 0 && weightGain > 0 && (
                <p className="text-sm text-green-600 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4" />
                  +{weightGain} g depuis derniere pesee
                </p>
              )}
              <p className={`text-sm mt-2 ${vsTarget >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(1)}% vs objectif
              </p>
            </div>
          )}
        </div>

        {/* Taille echantillon */}
        <div className="bg-white rounded-xl border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre d'oiseaux peses
          </label>
          <input
            type="number"
            value={formData.sample_size}
            onChange={(e) => setFormData(prev => ({ ...prev, sample_size: e.target.value }))}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="10"
            min="1"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg text-center"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/lots/${lotId}`}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitEntry.isPending || !formData.average_weight_g}
            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
          >
            {submitEntry.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                {isEditMode ? 'Modification...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditMode ? 'Modifier' : 'Enregistrer'}
              </>
            )}
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  )
}
