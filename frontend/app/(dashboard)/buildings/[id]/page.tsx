'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  Building2,
  Plus,
  Edit,
  Trash2,
  Bird,
  Calendar,
  Layers,
  ThermometerSun,
  Droplets,
  Wind,
  Egg
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/help-tooltip'

interface Lot {
  id: string
  name: string
  code: string
  type: string
  status: string
  initial_quantity: number
  current_quantity: number
  placement_date: string
  age_days: number
  age_weeks: number
  breed: string | null
}

interface Building {
  id: string
  name: string
  code: string
  building_type: string
  capacity: number
  surface_m2: number | null
  ventilation_type: string
  has_electricity: boolean
  has_water: boolean
  has_generator: boolean
  feeder_type: string | null
  drinker_type: string | null
  notes: string
  created_at: string
  is_active: boolean
  site_id: string
  site: {
    id: string
    name: string
  } | null
  sections_count: number
  active_lots_count: number
  current_birds: number
  lots: Lot[]
}

export default function BuildingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lotToDelete, setLotToDelete] = useState<string | null>(null)

  const buildingId = params.id as string

  const { data: building, isLoading, error } = useQuery<Building>({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const response = await api.get(`/buildings/${buildingId}`)
      return response.data
    },
    enabled: !!buildingId
  })

  const deleteBuilding = useMutation({
    mutationFn: async () => {
      await api.delete(`/buildings/${buildingId}`)
    },
    onSuccess: () => {
      toast.success('Batiment supprime')
      router.push(building?.site ? `/sites/${building.site.id}` : '/sites')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  })

  const deleteLot = useMutation({
    mutationFn: async (lotId: string) => {
      await api.delete(`/lots/${lotId}`)
    },
    onSuccess: () => {
      toast.success('Bande supprimee')
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] })
      setLotToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
      setLotToDelete(null)
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !building) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Batiment non trouve</p>
        <Link href="/sites" className="text-orange-500 hover:underline mt-2 inline-block">
          Retour aux sites
        </Link>
      </div>
    )
  }

  const getBuildingTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'layer': 'Pondeuses',
      'broiler': 'Poulet de chair',
      'breeder': 'Reproducteurs',
      'pullet': 'Poulettes',
      'mixed': 'Mixte'
    }
    return types[type] || type
  }

  const getLotStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'preparation': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getLotTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'layer': 'Pondeuses',
      'broiler': 'Poulet de chair',
      'breeder': 'Reproducteurs',
      'pullet': 'Poulettes'
    }
    return types[type] || type
  }

  const getVentilationLabel = (type: string) => {
    const types: Record<string, string> = {
      'natural': 'Naturelle',
      'tunnel': 'Tunnel',
      'static': 'Statique',
      'mixed': 'Mixte'
    }
    return types[type] || type
  }

  const allLots = building.lots || []
  const activeLots = allLots.filter(l => l.status === 'active')
  const totalBirds = building.current_birds || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={building.site ? `/sites/${building.site.id}` : '/sites'}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
              {building.code && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                  {building.code}
                </span>
              )}
            </div>
            <p className="text-gray-500">
              {building.site?.name || 'Site'} • {getBuildingTypeLabel(building.building_type)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/buildings/${buildingId}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bird className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Oiseaux</p>
              <p className="text-xl font-bold">{totalBirds.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Capacite</p>
              <p className="text-xl font-bold">{(building.capacity || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-500">Bandes actives</p>
                <HelpTooltip
                  title="Bandes actives"
                  content="Nombre de bandes actuellement en cours d'elevage dans ce batiment."
                />
              </div>
              <p className="text-xl font-bold">{activeLots.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupation</p>
              <p className="text-xl font-bold">
                {building.capacity ? Math.round(totalBirds / building.capacity * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Caracteristiques et Equipements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Caracteristiques</h2>
          <div className="space-y-3 text-sm">
            {building.surface_m2 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Surface</span>
                <span className="font-medium">{Number(building.surface_m2).toFixed(0)} m2</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Ventilation</span>
              <span className="font-medium">{getVentilationLabel(building.ventilation_type)}</span>
            </div>
            {building.feeder_type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Mangeoires</span>
                <span className="font-medium">{building.feeder_type}</span>
              </div>
            )}
            {building.drinker_type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Abreuvoirs</span>
                <span className="font-medium">{building.drinker_type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Equipements</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              building.has_electricity ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
            )}>
              <ThermometerSun className="w-4 h-4" />
              <span className="text-sm">Electricite</span>
            </div>
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              building.has_water ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
            )}>
              <Droplets className="w-4 h-4" />
              <span className="text-sm">Eau courante</span>
            </div>
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              building.has_generator ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
            )}>
              <Wind className="w-4 h-4" />
              <span className="text-sm">Groupe electrogene</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {building.notes && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-600">{building.notes}</p>
        </div>
      )}

      {/* Section Bandes */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">
              Bandes ({allLots.length})
            </h2>
            <HelpTooltip
              title="Bandes"
              content="Une bande est un groupe d'oiseaux eleves ensemble. Creez une nouvelle bande a chaque arrivee de poussins."
              example="Bande de 500 poulets arrives le 15 janvier"
            />
          </div>
          <Link
            href={`/lots/new?building_id=${buildingId}`}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle bande
          </Link>
        </div>

        {allLots.length > 0 ? (
          <div className="divide-y">
            {allLots.map((lot) => (
              <div
                key={lot.id}
                className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
              >
                <Link
                  href={`/lots/${lot.id}`}
                  className="flex-1 flex items-center gap-4"
                >
                  <div className={cn(
                    'p-3 rounded-lg',
                    lot.type === 'layer' ? 'bg-orange-50' : 'bg-blue-50'
                  )}>
                    {lot.type === 'layer' ? (
                      <Egg className="w-6 h-6 text-orange-600" />
                    ) : (
                      <Bird className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{lot.code || lot.name || 'Bande'}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getLotStatusColor(lot.status))}>
                        {lot.status === 'active' ? 'En cours' : lot.status === 'completed' ? 'Terminee' : lot.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {lot.breed || getLotTypeLabel(lot.type)} • {(lot.current_quantity || 0).toLocaleString()} oiseaux • J{lot.age_days || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {lot.placement_date ? new Date(lot.placement_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      }) : '-'}
                    </p>
                    <p className="text-xs text-gray-500">Mise en place</p>
                  </div>
                </Link>
                <div className="ml-4 flex items-center gap-2">
                  <Link
                    href={`/lots/${lot.id}`}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </Link>
                  <button
                    onClick={() => setLotToDelete(lot.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bird className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune bande</h3>
            <p className="text-gray-500 mb-4">
              Ce batiment n'a pas encore de bandes. Creez-en une pour commencer le suivi.
            </p>
            <Link
              href={`/lots/new?building_id=${buildingId}`}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
            >
              <Plus className="w-4 h-4" />
              Creer une bande
            </Link>
          </div>
        )}
      </div>

      {/* Modal suppression batiment */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer ce batiment ?
            </h3>
            <p className="text-gray-500 mb-6">
              Toutes les donnees seront perdues. Cette action est irreversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteBuilding.mutate()}
                disabled={deleteBuilding.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleteBuilding.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression lot */}
      {lotToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer cette bande ?
            </h3>
            <p className="text-gray-500 mb-6">
              Toutes les donnees de production seront perdues.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLotToDelete(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteLot.mutate(lotToDelete)}
                disabled={deleteLot.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleteLot.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
