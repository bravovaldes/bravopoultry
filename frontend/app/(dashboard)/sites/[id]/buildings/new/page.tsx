'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Building2, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SuccessScreen } from '@/components/ui/success-screen'
import { HelpTooltip } from '@/components/ui/help-tooltip'

export default function NewBuildingPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    building_type: 'layer',
    capacity: '',
    length_m: '',
    width_m: '',
    ventilation_type: 'natural',
    has_electricity: true,
    has_water: true,
    has_generator: false,
    feeder_type: '',
    drinker_type: '',
    notes: '',
  })

  // Get site info
  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await api.get(`/sites/${siteId}`)
      return response.data
    },
    enabled: !!siteId
  })

  const createBuilding = useMutation({
    mutationFn: async (data: any) => {
      // Calculate surface from length and width if provided
      const length = data.length_m ? parseFloat(data.length_m) : null
      const width = data.width_m ? parseFloat(data.width_m) : null
      const surface = length && width ? length * width : null

      const payload = {
        name: data.name,
        code: data.code || null,
        building_type: data.building_type,
        tracking_mode: 'lots', // Toujours en mode bandes
        site_id: siteId,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        surface_m2: surface,
        ventilation_type: data.ventilation_type,
        has_electricity: data.has_electricity,
        has_water: data.has_water,
        has_generator: data.has_generator,
        feeder_type: data.feeder_type || null,
        drinker_type: data.drinker_type || null,
        notes: data.notes || null,
      }

      const response = await api.post('/buildings', payload)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Batiment cree!')
      setSuccess(true)
      setError('')
      setTimeout(() => {
        router.push(`/buildings/${data.id}`)
      }, 1000)
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      let errorMessage = 'Erreur lors de la creation'
      if (Array.isArray(detail)) {
        errorMessage = detail.map((e: any) => e.msg).join(', ') || errorMessage
      } else if (typeof detail === 'string') {
        errorMessage = detail
      }
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Le nom du batiment est requis')
      return
    }
    createBuilding.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (success) {
    return <SuccessScreen title="Bâtiment créé avec succès!" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/sites/${siteId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau Batiment</h1>
          <p className="text-gray-500">
            {site ? `Ajouter un batiment a ${site.name}` : 'Chargement...'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Informations du batiment
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du batiment *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Batiment A"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code (optionnel)
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ex: BAT-A1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Type de production
                </label>
                <HelpTooltip
                  title="Type de production"
                  content="Choisissez selon le type d'elevage que vous faites dans ce batiment."
                  example="Pondeuses = production d'oeufs, Chair = production de viande"
                />
              </div>
              <select
                name="building_type"
                value={formData.building_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="layer">Pondeuses</option>
                <option value="broiler">Poulet de chair</option>
                <option value="breeder">Reproducteurs</option>
                <option value="pullet">Poulettes</option>
                <option value="mixed">Mixte</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Capacite maximale
                </label>
                <HelpTooltip
                  title="Capacite"
                  content="Le nombre maximum d'oiseaux que ce batiment peut accueillir. Utile pour calculer le taux d'occupation."
                />
              </div>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="Ex: 5000"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Dimensions (optionnel)</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longueur (m)
              </label>
              <input
                type="number"
                step="any"
                name="length_m"
                value={formData.length_m}
                onChange={handleChange}
                placeholder="Ex: 50"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largeur (m)
              </label>
              <input
                type="number"
                step="any"
                name="width_m"
                value={formData.width_m}
                onChange={handleChange}
                placeholder="Ex: 12"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Equipements</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ventilation
            </label>
            <select
              name="ventilation_type"
              value={formData.ventilation_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="natural">Naturelle</option>
              <option value="tunnel">Tunnel</option>
              <option value="static">Statique</option>
              <option value="mixed">Mixte</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                name="has_electricity"
                checked={formData.has_electricity}
                onChange={handleChange}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm">Electricite</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                name="has_water"
                checked={formData.has_water}
                onChange={handleChange}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm">Eau courante</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                name="has_generator"
                checked={formData.has_generator}
                onChange={handleChange}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm">Groupe electrogene</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mangeoires
              </label>
              <select
                name="feeder_type"
                value={formData.feeder_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Non precise</option>
                <option value="manual">Manuel</option>
                <option value="automatic">Automatique</option>
                <option value="chain">Chaine</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abreuvoirs
              </label>
              <select
                name="drinker_type"
                value={formData.drinker_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Non precise</option>
                <option value="manual">Manuel</option>
                <option value="nipple">Pipettes</option>
                <option value="cup">Godets</option>
                <option value="bell">Cloche</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Informations supplementaires..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
            href={`/sites/${siteId}`}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={createBuilding.isPending}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
          >
            {createBuilding.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                Creation...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Creer le batiment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
