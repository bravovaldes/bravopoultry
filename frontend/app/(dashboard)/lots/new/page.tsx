'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { ArrowLeft, Bird, Egg, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { SuccessScreen } from '@/components/ui/success-screen'

const lotSchema = z.object({
  type: z.enum(['broiler', 'layer']),
  name: z.string().optional(),
  building_id: z.string().uuid('Sélectionnez un bâtiment'),
  breed: z.string().optional(),
  supplier: z.string().optional(),
  initial_quantity: z.number().min(1, 'Minimum 1 oiseau'),
  placement_date: z.string().min(1, 'Date requise'),
  age_at_placement: z.number().min(1).default(1),
  chick_price_unit: z.number().optional(),
  transport_cost: z.number().optional(),
  notes: z.string().optional(),
})

type LotForm = z.infer<typeof lotSchema>

const breeds = {
  broiler: ['Cobb 500', 'Ross 308', 'Ross 708', 'Arbor Acres', 'Hubbard', 'Autre'],
  layer: ['Isa Brown', 'Lohmann Brown', 'Hy-Line Brown', 'Bovans Brown', 'Shaver Brown', 'Autre'],
}

export default function NewLotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const buildingIdFromUrl = searchParams.get('building_id')
  const typeFromUrl = searchParams.get('type') as 'broiler' | 'layer' | null
  const defaultType = typeFromUrl === 'broiler' ? 'broiler' : 'layer' // Default to 'layer'
  const [selectedType, setSelectedType] = useState<'broiler' | 'layer'>(defaultType)
  const [success, setSuccess] = useState(false)

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const response = await api.get('/buildings')
      return response.data
    },
  })

  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: async (data: LotForm) => {
      const response = await api.post('/lots', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Bande creee avec succes!')
      setSuccess(true)
      setError('')
      // Invalider le cache pour rafraîchir les listes
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setTimeout(() => {
        router.push(`/lots/${data.id}`)
      }, 1000)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la création'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<LotForm>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      type: defaultType,
      age_at_placement: 1,
      placement_date: new Date().toISOString().split('T')[0],
      building_id: buildingIdFromUrl || '',
    },
  })

  // Pre-select building if building_id is provided in URL
  // Also re-apply when buildings are loaded to ensure the select updates
  useEffect(() => {
    if (buildingIdFromUrl && buildings.length > 0) {
      // Verify the building exists before setting
      const buildingExists = buildings.some((b: any) => b.id === buildingIdFromUrl)
      if (buildingExists) {
        setValue('building_id', buildingIdFromUrl)
      }
    }
  }, [buildingIdFromUrl, buildings, setValue])

  const onSubmit = (data: LotForm) => {
    createMutation.mutate(data)
  }

  if (success) {
    return <SuccessScreen title="Bande creee avec succes!" />
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/lots"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nouvelle Bande</h1>
          <p className="text-sm sm:text-base text-gray-500">Creez une nouvelle bande de volailles</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        {/* Type selection */}
        <div className="bg-white rounded-xl border p-4 sm:p-5">
          <h2 className="font-semibold mb-3 text-sm sm:text-base">Type de bande</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedType('broiler')
                setValue('type', 'broiler')
              }}
              className={cn(
                'p-3 rounded-xl border-2 transition text-left',
                selectedType === 'broiler'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
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
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedType('layer')
                setValue('type', 'layer')
              }}
              className={cn(
                'p-3 rounded-xl border-2 transition text-left',
                selectedType === 'layer'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
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
            </button>
          </div>
        </div>

        {/* Basic info - compact layout */}
        <div className="bg-white rounded-xl border p-4 sm:p-5">
          <h2 className="font-semibold mb-3 text-sm sm:text-base">Informations générales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Nom du lot - spans full width */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nom de la bande <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="text"
                {...register('name')}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Ex: Pondeuses Mars 2025, Batch A, etc."
              />
              <p className="text-xs text-gray-400 mt-1">
                Un code unique sera généré automatiquement (ex: LP-2025-0001)
              </p>
            </div>

            {/* Bâtiment - spans 2 cols on mobile, 2 on large */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Bâtiment *</label>
                <Link
                  href="/sites"
                  className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Créer un bâtiment
                </Link>
              </div>
              {buildings.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">Aucun bâtiment disponible. Créez d'abord un site avec un bâtiment.</p>
                </div>
              ) : (
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
              )}
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Effectif initial *</label>
              <input
                type="number"
                {...register('initial_quantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="1000"
              />
              {errors.initial_quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.initial_quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mise en place *</label>
              <Controller
                name="placement_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    showShortcuts={true}
                    maxDate={new Date()}
                  />
                )}
              />
              {errors.placement_date && (
                <p className="text-red-500 text-xs mt-1">{errors.placement_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Âge réception (j)</label>
              <input
                type="number"
                {...register('age_at_placement', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                defaultValue={1}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prix poussin (XAF)</label>
              <input
                type="number"
                {...register('chick_price_unit', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transport (XAF)</label>
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

        {/* Error message - displayed near the button */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-4">
          <Link
            href="/lots"
            className="px-5 py-2 text-center border rounded-lg font-medium hover:bg-gray-50 transition text-sm"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 text-sm"
          >
            {createMutation.isPending ? 'Creation...' : 'Creer la bande'}
          </button>
        </div>
      </form>
    </div>
  )
}
