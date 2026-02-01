'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Plus,
  Edit,
  Trash2,
  Bird,
  Calendar,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

interface Building {
  id: string
  name: string
  code: string
  type: string
  capacity: number
  current_occupancy: number
  status: string
  sections_count: number
  active_lots: number
}

interface Site {
  id: string
  name: string
  code: string
  address: string
  city: string
  region: string
  country: string
  gps_latitude: number | null
  gps_longitude: number | null
  total_capacity: number | null
  notes: string
  is_active: boolean
  created_at: string
  buildings: Building[]
}

export default function SiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [buildingToDelete, setBuildingToDelete] = useState<string | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [buildingDeleteConfirmInput, setBuildingDeleteConfirmInput] = useState('')

  // Lock body scroll when any modal is open
  useBodyScrollLock(showDeleteConfirm || !!buildingToDelete)

  const siteId = params.id as string

  const { data: site, isLoading, error } = useQuery<Site>({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await api.get(`/sites/${siteId}`)
      return response.data
    },
    enabled: !!siteId
  })

  const deleteSite = useMutation({
    mutationFn: async () => {
      await api.delete(`/sites/${siteId}`)
    },
    onSuccess: () => {
      toast.success('Site supprimé avec succès')
      setShowDeleteConfirm(false)
      setDeleteConfirmInput('')
      router.push('/sites')
    },
    onError: (error: any) => {
      try {
        // FastAPI wraps errors in 'detail' field
        const errorData = error.response?.data?.detail
        if (typeof errorData === 'object' && errorData?.error === 'site_has_active_lots') {
          toast.error(`Impossible de supprimer ce site. Vous avez ${errorData.total_active_lots || 0} lot(s) actif(s) en cours. Veuillez d'abord clôturer ou déplacer tous les lots actifs avant de supprimer le site.`)
        } else {
          const message = typeof errorData === 'string' ? errorData : errorData?.message || 'Erreur lors de la suppression'
          toast.error(message)
        }
      } catch {
        toast.error('Erreur lors de la suppression')
      }
    }
  })

  const deleteBuilding = useMutation({
    mutationFn: async (buildingId: string) => {
      await api.delete(`/buildings/${buildingId}`)
    },
    onSuccess: () => {
      toast.success('Bâtiment supprimé avec succès')
      queryClient.invalidateQueries({ queryKey: ['site', siteId] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setBuildingToDelete(null)
      setBuildingDeleteConfirmInput('')
    },
    onError: (error: any) => {
      try {
        // FastAPI wraps errors in 'detail' field
        const errorData = error.response?.data?.detail
        if (typeof errorData === 'object' && errorData?.error === 'building_has_active_lots') {
          toast.error(`Impossible de supprimer ce bâtiment. Il contient ${errorData.active_lots?.length || 0} lot(s) actif(s) en cours d'élevage. Veuillez d'abord clôturer ou déplacer ces lots.`)
        } else {
          const message = typeof errorData === 'string' ? errorData : errorData?.message || 'Erreur lors de la suppression'
          toast.error(message)
        }
      } catch {
        toast.error('Erreur lors de la suppression')
      }
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Site non trouvé</p>
        <Link href="/sites" className="text-orange-500 hover:underline mt-2 inline-block">
          Retour aux sites
        </Link>
      </div>
    )
  }

  const totalBirds = site.buildings?.reduce((sum, b) => sum + (b.current_occupancy || 0), 0) || 0
  const totalCapacity = site.buildings?.reduce((sum, b) => sum + (b.capacity || 0), 0) || site.total_capacity || 0

  // Get the building data for deletion modal
  const buildingToDeleteData = buildingToDelete
    ? site.buildings?.find(b => b.id === buildingToDelete)
    : null

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

  const getBuildingStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href="/sites"
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{site.name}</h1>
              {site.code && (
                <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded">
                  {site.code}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{[site.city, site.region, site.country].filter(Boolean).join(', ') || 'Emplacement non défini'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <Link
            href={`/sites/${siteId}/edit`}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-sm"
          >
            <Edit className="w-4 h-4" />
            <span>Modifier</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xs:inline">Suppr</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500">Bâtiments</p>
              <p className="text-lg sm:text-xl font-bold">{site.buildings?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <Bird className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500">Oiseaux</p>
              <p className="text-lg sm:text-xl font-bold">{totalBirds.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <Bird className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500">Capacité</p>
              <p className="text-lg sm:text-xl font-bold">{totalCapacity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500">Créé le</p>
              <p className="text-base sm:text-xl font-bold">
                {new Date(site.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Site Details */}
      {(site.address || site.notes || site.gps_latitude) && (
        <div className="bg-white rounded-xl border p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Détails du site</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            {site.address && (
              <div>
                <p className="text-gray-500">Adresse</p>
                <p className="font-medium">{site.address}</p>
              </div>
            )}
            {site.gps_latitude && site.gps_longitude && (
              <div>
                <p className="text-gray-500">Coordonnées GPS</p>
                <p className="font-medium text-xs sm:text-sm break-all">{site.gps_latitude}, {site.gps_longitude}</p>
              </div>
            )}
            {site.notes && (
              <div className="sm:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium">{site.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buildings Section */}
      <div className="bg-white rounded-xl border">
        <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
            Bâtiments ({site.buildings?.length || 0})
          </h2>
          <Link
            href={`/sites/${siteId}/buildings/new`}
            className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un bâtiment</span>
          </Link>
        </div>

        {site.buildings && site.buildings.length > 0 ? (
          <div className="divide-y">
            {site.buildings.map((building) => (
              <div
                key={building.id}
                className="p-3 sm:p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <Link
                    href={`/buildings/${building.id}`}
                    className="flex-1 flex items-start sm:items-center gap-3 sm:gap-4 min-w-0"
                  >
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-lg flex-shrink-0">
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{building.name}</h3>
                        {building.code && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {building.code}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getBuildingStatusColor(building.status)}`}>
                          {building.status === 'active' ? 'Actif' : building.status === 'maintenance' ? 'Maint.' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {getBuildingTypeLabel(building.type)} • {building.current_occupancy?.toLocaleString() || 0} / {building.capacity?.toLocaleString() || 0}
                      </p>
                      <div className="sm:hidden mt-1 text-xs text-gray-500">
                        {building.active_lots || 0} lots • {building.sections_count || 0} sections
                      </div>
                    </div>
                    <div className="text-right hidden sm:block flex-shrink-0">
                      <p className="text-sm font-medium">{building.active_lots || 0} lots actifs</p>
                      <p className="text-xs text-gray-500">{building.sections_count || 0} sections</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Link
                      href={`/buildings/${building.id}/edit`}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Link>
                    <button
                      onClick={() => setBuildingToDelete(building.id)}
                      className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center">
            <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun bâtiment</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ce site n'a pas encore de bâtiments.
            </p>
            <Link
              href={`/sites/${siteId}/buildings/new`}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter un bâtiment
            </Link>
          </div>
        )}
      </div>

      {/* Delete Site Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer le site ?
            </h3>
            <p className="text-gray-500 mb-4">
              Cette action est irréversible. Tous les bâtiments et données associées seront supprimés.
            </p>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Pour confirmer, tapez le nom du site: <span className="font-mono font-bold">{site.name}</span>
              </p>
            </div>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Entrez le nom du site"
              className="w-full px-3 py-2 border rounded-lg mb-4 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mb-4">
              Si c'est une erreur de saisie, vous pouvez <Link href={`/sites/${siteId}/edit`} className="text-orange-500 hover:underline font-medium">modifier le site</Link> à la place.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmInput('')
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteSite.mutate()}
                disabled={deleteSite.isPending || deleteConfirmInput !== site.name}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteSite.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Building Confirmation Modal */}
      {buildingToDelete && buildingToDeleteData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer le bâtiment ?
            </h3>
            <p className="text-gray-500 mb-4">
              Cette action est irréversible. Toutes les sections et données associées seront supprimées.
            </p>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Pour confirmer, tapez le nom du bâtiment: <span className="font-mono font-bold">{buildingToDeleteData.name}</span>
              </p>
            </div>
            <input
              type="text"
              value={buildingDeleteConfirmInput}
              onChange={(e) => setBuildingDeleteConfirmInput(e.target.value)}
              placeholder="Entrez le nom du bâtiment"
              className="w-full px-3 py-2 border rounded-lg mb-4 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mb-4">
              Si c'est une erreur de saisie, vous pouvez <Link href={`/buildings/${buildingToDelete}/edit`} className="text-orange-500 hover:underline font-medium">modifier le bâtiment</Link> à la place.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setBuildingToDelete(null)
                  setBuildingDeleteConfirmInput('')
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteBuilding.mutate(buildingToDelete)}
                disabled={deleteBuilding.isPending || buildingDeleteConfirmInput !== buildingToDeleteData.name}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteBuilding.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
