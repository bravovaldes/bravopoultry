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
      router.push('/sites')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
    }
  })

  const deleteBuilding = useMutation({
    mutationFn: async (buildingId: string) => {
      await api.delete(`/buildings/${buildingId}`)
    },
    onSuccess: () => {
      toast.success('Bâtiment supprimé avec succès')
      queryClient.invalidateQueries({ queryKey: ['site', siteId] })
      setBuildingToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
      setBuildingToDelete(null)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/sites"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
              {site.code && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                  {site.code}
                </span>
              )}
            </div>
            <p className="text-gray-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {[site.city, site.region, site.country].filter(Boolean).join(', ') || 'Emplacement non défini'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/sites/${siteId}/edit`}
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
            Supprimer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bâtiments</p>
              <p className="text-xl font-bold">{site.buildings?.length || 0}</p>
            </div>
          </div>
        </div>

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
              <Bird className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Capacité</p>
              <p className="text-xl font-bold">{totalCapacity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Créé le</p>
              <p className="text-xl font-bold">
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
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Détails du site</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {site.address && (
              <div>
                <p className="text-gray-500">Adresse</p>
                <p className="font-medium">{site.address}</p>
              </div>
            )}
            {site.gps_latitude && site.gps_longitude && (
              <div>
                <p className="text-gray-500">Coordonnées GPS</p>
                <p className="font-medium">{site.gps_latitude}, {site.gps_longitude}</p>
              </div>
            )}
            {site.notes && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium">{site.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buildings Section */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Bâtiments ({site.buildings?.length || 0})
          </h2>
          <Link
            href={`/sites/${siteId}/buildings/new`}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter un bâtiment
          </Link>
        </div>

        {site.buildings && site.buildings.length > 0 ? (
          <div className="divide-y">
            {site.buildings.map((building) => (
              <div
                key={building.id}
                className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
              >
                <Link
                  href={`/buildings/${building.id}`}
                  className="flex-1 flex items-center gap-4"
                >
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{building.name}</h3>
                      {building.code && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {building.code}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getBuildingStatusColor(building.status)}`}>
                        {building.status === 'active' ? 'Actif' : building.status === 'maintenance' ? 'Maintenance' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {getBuildingTypeLabel(building.type)} • {building.current_occupancy?.toLocaleString() || 0} / {building.capacity?.toLocaleString() || 0} oiseaux
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{building.active_lots || 0} lots actifs</p>
                    <p className="text-xs text-gray-500">{building.sections_count || 0} sections</p>
                  </div>
                </Link>
                <div className="ml-4 flex items-center gap-2">
                  <Link
                    href={`/buildings/${building.id}/edit`}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </Link>
                  <button
                    onClick={() => setBuildingToDelete(building.id)}
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
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bâtiment</h3>
            <p className="text-gray-500 mb-4">
              Ce site n'a pas encore de bâtiments. Ajoutez-en un pour commencer.
            </p>
            <Link
              href={`/sites/${siteId}/buildings/new`}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
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
            <p className="text-gray-500 mb-6">
              Cette action est irréversible. Tous les bâtiments, sections et lots associés seront également supprimés.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteSite.mutate()}
                disabled={deleteSite.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleteSite.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Building Confirmation Modal */}
      {buildingToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer le bâtiment ?
            </h3>
            <p className="text-gray-500 mb-6">
              Cette action est irréversible. Toutes les sections et lots associés seront également supprimés.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBuildingToDelete(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteBuilding.mutate(buildingToDelete)}
                disabled={deleteBuilding.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
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
