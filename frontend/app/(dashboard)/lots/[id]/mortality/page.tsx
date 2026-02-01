'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Skull, Bird, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { MORTALITY_CAUSES } from '@/lib/constants'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import { getTodayInTimezone } from '@/lib/utils'

export default function MortalityPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string
  const timezone = useTimezone()

  const initialDate = searchParams.get('date') || getTodayInTimezone(timezone)

  const [formData, setFormData] = useState({
    date: initialDate,
    mortality_count: '',
    mortality_cause: 'unknown',
  })

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  // Check if mortality already recorded for this date
  const { data: existingEntry } = useQuery({
    queryKey: ['daily-entry', lotId, formData.date],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/daily-entry/${formData.date}`)
      return response.data
    },
    enabled: !!lotId && !!formData.date,
  })

  const existingMortality = existingEntry?.data?.mortality?.count || 0

  const submitEntry = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/lots/${lotId}/daily-entry`, {
        date: data.date,
        mortality_count: parseInt(data.mortality_count),
        mortality_cause: data.mortality_cause,
      })
      return response.data
    },
    onSuccess: () => {
      setSuccess(true)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      toast.success('Mortalite enregistree')
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
    if (!formData.mortality_count || parseInt(formData.mortality_count) <= 0) {
      toast.error('Entrez le nombre de morts')
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
        <p className="text-lg font-medium text-gray-900">Mortalite enregistree!</p>
        <p className="text-gray-500">Redirection...</p>
      </div>
    )
  }

  const mortalityCount = parseInt(formData.mortality_count) || 0
  const newQuantity = (lot?.current_quantity || 0) - mortalityCount

  return (
    <div className="space-y-4 lg:space-y-3">
      {/* Header compact */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/lots/${lotId}`}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mortalite</h1>
            <p className="text-sm text-gray-500">{lot?.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
            <Bird className="w-5 h-5 text-orange-600" />
            <span className="text-base font-medium text-gray-900">
              {lot?.current_quantity?.toLocaleString()}
            </span>
          </div>
          {mortalityCount > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Apres</p>
              <p className="text-lg font-bold text-gray-700">{newQuantity.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-3">
        {/* Date + Nombre en ligne sur desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3">
          {/* Date */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <DatePicker
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date, mortality_count: '', mortality_cause: 'unknown' }))}
              showShortcuts={true}
              maxDate={new Date()}
            />
            {existingMortality > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-blue-600 text-sm">
                <Info className="w-4 h-4" />
                <span>Deja enregistre: {existingMortality} mort(s)</span>
              </div>
            )}
          </div>

          {/* Nombre de morts */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Skull className="w-5 h-5 text-red-500" />
              <label className="text-sm font-medium text-gray-700">
                Nombre de morts
              </label>
            </div>
            <input
              type="number"
              value={formData.mortality_count}
              onChange={(e) => setFormData(prev => ({ ...prev, mortality_count: e.target.value }))}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-2xl font-bold text-center"
              required
            />
          </div>
        </div>

        {/* Warning compact */}
        {mortalityCount > 0 && mortalityCount > (lot?.current_quantity || 0) * 0.05 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-700 text-sm">
                Mortalite elevee: {((mortalityCount / (lot?.current_quantity || 1)) * 100).toFixed(1)}% de l'effectif
              </p>
            </div>
          </div>
        )}

        {/* Cause */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium text-gray-700">
              Cause probable
            </label>
            <HelpTooltip
              title="Cause de mortalite"
              content="Selectionnez la cause la plus probable. Cela vous aidera a identifier les problemes recurrents."
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {MORTALITY_CAUSES.map((cause) => (
              <button
                key={cause.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, mortality_cause: cause.value }))}
                className={`p-2 rounded-lg border-2 transition text-left ${
                  formData.mortality_cause === cause.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{cause.icon}</span>
                  <span className="text-xs font-medium">{cause.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate">{cause.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/lots/${lotId}`}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitEntry.isPending || !formData.mortality_count}
            className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {submitEntry.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
