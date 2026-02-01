'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  Search,
  Bird,
  ChevronRight,
  Filter,
  MapPin,
  Building2,
  Egg,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LotsPage() {
  const [search, setSearch] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')

  // Fetch all lots (avec site_id, building_id, site_name maintenant inclus)
  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['all-lots'],
    queryFn: async () => {
      const response = await api.get('/lots')
      return response.data
    },
  })

  // Fetch sites for filter
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Extract unique buildings from lots data for the filter
  // This ensures we only show buildings that have lots
  const availableBuildings = useMemo(() => {
    const buildingsMap = new Map<string, { id: string; name: string; site_id: string }>()
    lots.forEach((lot: any) => {
      if (lot.building_id && lot.building_name) {
        buildingsMap.set(lot.building_id, {
          id: lot.building_id,
          name: lot.building_name,
          site_id: lot.site_id
        })
      }
    })
    return Array.from(buildingsMap.values())
  }, [lots])

  // Filter buildings based on selected site
  const filteredBuildings = useMemo(() => {
    if (selectedSiteId === 'all') {
      return availableBuildings
    }
    return availableBuildings.filter(b => b.site_id === selectedSiteId)
  }, [availableBuildings, selectedSiteId])

  // Filter lots
  const filteredLots = useMemo(() => {
    return lots.filter((lot: any) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !lot.code?.toLowerCase().includes(searchLower) &&
          !lot.name?.toLowerCase().includes(searchLower) &&
          !lot.breed?.toLowerCase().includes(searchLower) &&
          !lot.building_name?.toLowerCase().includes(searchLower) &&
          !lot.site_name?.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Site filter - use site_id from lot data (convert to string for comparison)
      if (selectedSiteId !== 'all') {
        const lotSiteId = lot.site_id ? String(lot.site_id) : null
        if (lotSiteId !== selectedSiteId) {
          return false
        }
      }

      // Building filter - use building_id from lot data (convert to string for comparison)
      if (selectedBuildingId !== 'all') {
        const lotBuildingId = lot.building_id ? String(lot.building_id) : null
        if (lotBuildingId !== selectedBuildingId) {
          return false
        }
      }

      // Type filter
      if (selectedType !== 'all' && lot.type !== selectedType) {
        return false
      }

      // Status filter
      if (selectedStatus === 'active' && lot.status !== 'active') {
        return false
      }
      if (selectedStatus === 'closed' && lot.status !== 'closed' && lot.status !== 'completed') {
        return false
      }

      return true
    })
  }, [lots, search, selectedSiteId, selectedBuildingId, selectedType, selectedStatus])

  // Stats
  const stats = useMemo(() => {
    const activeLots = lots.filter((l: any) => l.status === 'active')
    return {
      total: lots.length,
      active: activeLots.length,
      totalBirds: activeLots.reduce((sum: number, l: any) => sum + (l.current_quantity || 0), 0),
      layers: activeLots.filter((l: any) => l.type === 'layer').length,
      broilers: activeLots.filter((l: any) => l.type === 'broiler').length,
    }
  }, [lots])

  // Check if any filter is active
  const hasActiveFilters = selectedSiteId !== 'all' || selectedBuildingId !== 'all' || selectedType !== 'all' || search

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setSelectedSiteId('all')
    setSelectedBuildingId('all')
    setSelectedType('all')
  }

  return (
    <div className="space-y-4 lg:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-lg border p-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Lots</h1>
          <p className="text-sm text-gray-500">Acces rapide a tous vos lots</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            <p className="text-xs text-gray-500">lots actifs</p>
          </div>
          <Link
            href="/lots/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouveau Lot</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm text-gray-500">Total oiseaux</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalBirds.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm text-gray-500">Pondeuses</p>
          <p className="text-xl lg:text-2xl font-bold text-orange-600">{stats.layers}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm text-gray-500">Poulets de chair</p>
          <p className="text-xl lg:text-2xl font-bold text-blue-600">{stats.broilers}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm text-gray-500">Lots termines</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-400">{stats.total - stats.active}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border p-3">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par code, race, batiment, site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedBuildingId('all') // Reset building when site changes
            }}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Tous les sites</option>
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          {/* Building filter */}
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            disabled={filteredBuildings.length === 0}
          >
            <option value="all">Tous les batiments</option>
            {filteredBuildings.map((building) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Tous types</option>
            <option value="layer">Pondeuses</option>
            <option value="broiler">Poulets de chair</option>
          </select>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {[
              { value: 'active', label: 'Actifs' },
              { value: 'closed', label: 'Termines' },
              { value: 'all', label: 'Tous' },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                  selectedStatus === status.value
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Lots list */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto"></div>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bird className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Aucun lot trouve</p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="text-orange-500 hover:text-orange-600 text-sm font-medium mt-2"
              >
                Effacer les filtres
              </button>
            ) : (
              <Link
                href="/lots/new"
                className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium mt-2"
              >
                <Plus className="w-4 h-4" />
                Creer votre premier lot
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredLots.map((lot: any) => (
              <Link
                key={lot.id}
                href={`/lots/${lot.id}`}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 transition"
              >
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  lot.type === 'layer' ? "bg-orange-100" : "bg-blue-100"
                )}>
                  {lot.type === 'layer' ? (
                    <Egg className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Bird className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">
                      {lot.name || lot.code}
                    </h3>
                    {lot.name && (
                      <span className="text-xs text-gray-400">{lot.code}</span>
                    )}
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      lot.status === 'active'
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {lot.status === 'active' ? 'Actif' : 'Termine'}
                    </span>
                    <span className="text-xs text-gray-500">J{lot.age_days}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    {lot.site_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {lot.site_name}
                      </span>
                    )}
                    {lot.building_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {lot.building_name}
                      </span>
                    )}
                    {lot.breed && (
                      <span className="text-xs">{lot.breed}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">
                    {lot.current_quantity?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-gray-500">oiseaux</p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredLots.length > 0 && (
          <div className="p-3 border-t bg-gray-50 text-center text-sm text-gray-500">
            {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} affiche{filteredLots.length > 1 ? 's' : ''}
            {hasActiveFilters && ` sur ${lots.length} total`}
          </div>
        )}
      </div>
    </div>
  )
}
