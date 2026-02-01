'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Syringe, CheckCircle, CalendarDays, Building2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, getTodayInTimezone } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import { SuccessScreen } from '@/components/ui/success-screen'
import {
  ADMINISTRATION_ROUTES,
  COMMON_DISEASES,
  COMMON_VACCINES,
} from '@/lib/constants'

export default function RecordVaccinationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string

  // Get pre-filled data from URL params (coming from calendar)
  const scheduleId = searchParams.get('schedule_id')
  const prefilledVaccine = searchParams.get('vaccine') || ''
  const prefilledDisease = searchParams.get('disease') || ''
  const prefilledRoute = searchParams.get('route') || 'water'
  const prefilledDay = searchParams.get('day') || ''
  const timezone = useTimezone()

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    date: getTodayInTimezone(timezone),
    product_name: prefilledVaccine,
    target_disease: prefilledDisease,
    route: prefilledRoute,
    dose: '',
    batch_number: '',
    manufacturer: '',
    cost: '',
    reminder_date: '',
    notes: '',
  })

  // Update form when URL params change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      product_name: prefilledVaccine || prev.product_name,
      target_disease: prefilledDisease || prev.target_disease,
      route: prefilledRoute || prev.route,
    }))
  }, [prefilledVaccine, prefilledDisease, prefilledRoute])

  const { data: lot, isLoading: lotLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  // Record vaccination mutation
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/health/events', {
        lot_id: lotId,
        event_type: 'vaccination',
        date: data.date,
        product_name: data.product_name,
        target_disease: data.target_disease,
        route: data.route,
        dose: data.dose || null,
        batch_number: data.batch_number || null,
        manufacturer: data.manufacturer || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        reminder_date: data.reminder_date || null,
        notes: data.notes || null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-events', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      queryClient.invalidateQueries({ queryKey: ['recent-health-events'] })
      toast.success('Vaccination enregistree avec succes')
      setSuccess(true)
      setError('')
      setTimeout(() => {
        router.push(`/lots/${lotId}/health`)
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
    if (!formData.product_name) {
      toast.error('Veuillez entrer le nom du vaccin')
      return
    }
    if (!formData.target_disease) {
      toast.error('Veuillez selectionner la maladie ciblee')
      return
    }
    submitMutation.mutate(formData)
  }

  if (lotLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  if (success) {
    return <SuccessScreen title="Vaccination enregistrée!" />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/lots/${lotId}/health`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enregistrer une vaccination</h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
            <span>{lot?.code}</span>
            <span>-</span>
            <span>J{lot?.age_days}</span>
            {prefilledDay && (
              <>
                <span>-</span>
                <span className="text-orange-600 font-medium">Planifiee J{prefilledDay}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Syringe className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Traçabilite complete</p>
            <p className="text-sm text-green-700 mt-1">
              Enregistrez tous les details de la vaccination pour un suivi optimal et une meilleure traçabilite sanitaire.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400" />
            Informations de base
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de vaccination *
              </label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                showShortcuts={true}
                maxDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du vaccin *
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Ex: Hitchner B1, La Sota..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                list="vaccines-list"
                required
              />
              <datalist id="vaccines-list">
                {COMMON_VACCINES.map((v) => (
                  <option key={v.value} value={v.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maladie ciblee *
              </label>
              <select
                value={formData.target_disease}
                onChange={(e) => setFormData(prev => ({ ...prev, target_disease: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Selectionner...</option>
                {COMMON_DISEASES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voie d'administration
              </label>
              <select
                value={formData.route}
                onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {ADMINISTRATION_ROUTES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            Details du vaccin
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dose administree
              </label>
              <input
                type="text"
                value={formData.dose}
                onChange={(e) => setFormData(prev => ({ ...prev, dose: e.target.value }))}
                placeholder="Ex: 0.5ml/oiseau, 1 dose/1000"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero de lot du vaccin
              </label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
                placeholder="Ex: VAC-2024-001"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fabricant / Laboratoire
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Ex: CEVA, MSD, Boehringer..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cout (XAF)
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Informations complementaires</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de rappel (optionnel)
              </label>
              <DatePicker
                value={formData.reminder_date}
                onChange={(date) => setFormData(prev => ({ ...prev, reminder_date: date }))}
                showShortcuts={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                Si ce vaccin necessite un rappel, indiquez la date prevue
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes / Observations
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Conditions de conservation, reactions observees, remarques particulieres..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Message d'erreur - pres du bouton */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/lots/${lotId}/health`}
            className="px-6 py-2.5 border rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition"
          >
            {submitMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Enregistrer la vaccination
          </button>
        </div>
      </form>
    </div>
  )
}
