'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Site } from '@/types'
import {
  Plus,
  Search,
  MapPin,
  Building2,
  Bird,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SitesPage() {
  const [search, setSearch] = useState('')

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  const filteredSites = sites.filter((site: Site) =>
    site.name?.toLowerCase().includes(search.toLowerCase()) ||
    site.city?.toLowerCase().includes(search.toLowerCase()) ||
    site.code?.toLowerCase().includes(search.toLowerCase())
  )

  // Calculate totals
  const totalBuildings = sites.reduce((sum: number, s: Site) => sum + (s.buildings_count || 0), 0)
  const totalBirds = sites.reduce((sum: number, s: Site) => sum + (s.total_birds || 0), 0)
  const totalActiveLots = sites.reduce((sum: number, s: Site) => sum + (s.active_lots_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-500 mt-1">Gerez vos sites de production</p>
        </div>
        <Link
          href="/sites/new"
          className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
        >
          <Plus className="w-5 h-5" />
          Nouveau Site
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Sites</p>
          <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Batiments</p>
          <p className="text-2xl font-bold text-gray-900">{totalBuildings}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Lots Actifs</p>
          <p className="text-2xl font-bold text-gray-900">{totalActiveLots}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Oiseaux</p>
          <p className="text-2xl font-bold text-gray-900">{totalBirds.toLocaleString()}</p>
        </div>
      </div>

      {/* Sites list */}
      <div className="bg-white rounded-xl border">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto"></div>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun site trouve</p>
            <Link
              href="/sites/new"
              className="text-orange-500 hover:text-orange-600 text-sm font-medium"
            >
              Creer votre premier site
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {filteredSites.map((site: Site) => (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {site.name}
                    </h3>
                    {site.code && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {site.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    {site.city && <span>{site.city}</span>}
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {site.buildings_count || 0} batiments
                    </span>
                    <span className="flex items-center gap-1">
                      <Bird className="w-4 h-4" />
                      {(site.total_birds || 0).toLocaleString()} oiseaux
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {site.active_lots_count || 0} lots actifs
                  </p>
                  <p className="text-xs text-gray-500">
                    Capacite: {site.total_capacity?.toLocaleString() || '-'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
