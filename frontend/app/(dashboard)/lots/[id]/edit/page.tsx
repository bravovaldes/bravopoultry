'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { ArrowLeft, Bird, Egg, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { SuccessScreen } from '@/components/ui/success-screen'

const lotUpdateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['broiler', 'layer']),
  building_id: z.string().uuid('Sélectionnez un bâtiment'),
  breed: z.string().optional(),
  supplier: z.string().optional(),
  initial_quantity: z.number().min(1, 'Minimum 1 oiseau'),
  current_quantity: z.number().min(0, 'Minimum 0'),
  placement_date: z.string().min(1, 'Date requise'),
  age_at_placement: z.number().min(1).default(1),
  chick_price_unit: z.number().optional().nullable(),
  transport_cost: z.number().optional().nullable(),
  expected_end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'preparation', 'suspended']).optional(),
  notes: z.string().optional().nullable(),
})

type LotUpdateForm = z.infer<typeof lotUpdateSchema>

const breeds = {
  broiler: ['Cobb 500', 'Ross 308', 'Ross 708', 'Arbor Acres', 'Hubbard', 'Autre'],
  layer: ['Isa Brown', 'Lohmann Brown', 'Hy-Line Brown', 'Bovans Brown', 'Shaver Brown', 'Autre'],
}

const statusOptions = [
  { value: 'active', label: 'Actif' },
  { value: 'completed', label: 'Terminé' },
  { value: 'preparation', label: 'En préparation' },
  { value: 'suspended', label: 'Suspendu' },
]

export default function EditLotPage() {
  const router = useRouter()
  const params = useParams()
  const lotId = params.id as string
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<'broiler' | 'layer'>('broiler')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Fetch lot data
  const { data: lot, isLoading: lotLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const response = await api.get('/buildings')
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: LotUpdateForm) => {
      const response = await api.patch(`/lots/${lotId}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Lot mis à jour avec succès!')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      setSuccess(true)
      setError('')
      setTimeout(() => {
        router.push(`/lots/${lotId}`)
      }, 1000)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la mise à jour'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<LotUpdateForm>({
    resolver: zodResolver(lotUpdateSchema),
  })

  // Populate form when lot data is loaded
  useEffect(() => {
    if (lot) {
      setSelectedType(lot.type || 'broiler')
      reset({
        name: lot.name || '',
        type: lot.type || 'broiler',
        building_id: lot.building_id || '',
        breed: lot.breed || '',
        supplier: lot.supplier || '',
        initial_quantity: lot.initial_quantity || 0,
        current_quantity: lot.current_quantity || 0,
        placement_date: lot.placement_date || '',
        age_at_placement: lot.age_at_placement || 1,
        chick_price_unit: lot.chick_price_unit || null,
        transport_cost: lot.transport_cost || null,
        expected_end_date: lot.expected_end_date || null,
        status: lot.status || 'active',
        notes: lot.notes || '',
      })
    }
  }, [lot, reset])

  const onSubmit = (data: LotUpdateForm) => {
    updateMutation.mutate(data)
  }

  if (lotLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lot non trouvé</p>
        <Link href="/lots" className="text-orange-500 hover:underline mt-2 inline-block">
          Retour à la liste des lots
        </Link>
      </div>
    )
  }

  if (success) {
    return <SuccessScreen title="Lot mis à jour avec succès!" />
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href={`/lots/${lotId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Modifier le lot</h1>
          <p className="text-sm sm:text-base text-gray-500 truncate">{lot.name || 'Sans nom'} ({lot.code})</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        {/* Type selection + Status in same row on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Type selection (read-only for existing lots) */}
          <div className="bg-white rounded-xl border p-4 sm:p-5 lg:col-span-2">
            <h2 className="font-semibold mb-3 text-sm sm:text-base">Type de lot</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div
                className={cn(
                  'p-3 rounded-xl border-2 transition text-left',
                  selectedType === 'broiler'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bird className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Poulet de Chair</h3>
                    <p className="text-xs text-gray-500 hidden sm:block">Élevage pour la viande</p>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'p-3 rounded-xl border-2 transition text-left',
                  selectedType === 'layer'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Egg className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Pondeuses</h3>
                    <p className="text-xs text-gray-500 hidden sm:block">Production d'oeufs</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Le type ne peut pas être modifié.</p>
          </div>

          {/* Status card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold mb-3 text-sm sm:text-base">Statut</h2>
            <select
              {...register('status')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom du lot</label>
              <input
                type="text"
                {...register('name')}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Nom optionnel"
              />
            </div>
          </div>
        </div>

        {/* Basic info - compact layout */}
        <div className="bg-white rounded-xl border p-4 sm:p-5">
          <h2 className="font-semibold mb-3 text-sm sm:text-base">Informations générales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Bâtiment - spans 2 cols on mobile, 1 on large */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Bâtiment *</label>
              <select
                {...register('building_id')}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionnez un bâtiment</option>
                {buildings.map((building: any) => (
                  <option key={building.id} value={building.id}>
                    {building.name} ({building.capacity || '?'} places)
                  </option>
                ))}
              </select>
              {errors.building_id && (
                <p className="text-red-500 text-xs mt-1">{errors.building_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Souche</label>
              <select
                {...register('breed')}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionner</option>
                {breeds[selectedType].map((breed) => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur</label>
              <input
                type="text"
                {...register('supplier')}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Couvoir"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Effectif initial</label>
              <input
                type="number"
                {...register('initial_quantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Effectif actuel</label>
              <input
                type="number"
                {...register('current_quantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              {errors.current_quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.current_quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mise en place</label>
              <input
                type="date"
                {...register('placement_date')}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date fin prévue</label>
              <Controller
                name="expected_end_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value || ''}
                    onChange={field.onChange}
                    showShortcuts={false}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Âge réception (j)</label>
              <input
                type="number"
                {...register('age_at_placement', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prix poussin (FCFA)</label>
              <input
                type="number"
                {...register('chick_price_unit', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transport (FCFA)</label>
              <input
                type="number"
                {...register('transport_cost', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="50000"
              />
            </div>
          </div>
        </div>

        {/* Notes - compact */}
        <div className="bg-white rounded-xl border p-4 sm:p-5">
          <h2 className="font-semibold mb-3 text-sm sm:text-base">Notes</h2>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
            placeholder="Notes supplémentaires..."
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-4">
          <Link
            href={`/lots/${lotId}`}
            className="px-5 py-2 text-center border rounded-lg font-medium hover:bg-gray-50 transition text-sm"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 text-sm"
          >
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
