'use client'

import Link from 'next/link'
import { Bird, ChevronRight, MapPin } from 'lucide-react'

interface Site {
  id: string
  name: string
  city?: string
  active_lots: number
  total_birds: number
  broiler_lots?: number
  layer_lots?: number
  broiler_birds?: number
  layer_birds?: number
}

interface ActiveLotsProps {
  sites: Site[]
  lotFilter?: 'all' | 'broiler' | 'layer'
}

export function ActiveLots({ sites, lotFilter = 'all' }: ActiveLotsProps) {
  // Filter sites based on lot type
  const filteredSites = sites?.filter(site => {
    if (lotFilter === 'all') return true
    if (lotFilter === 'broiler') return (site.broiler_lots || 0) > 0
    if (lotFilter === 'layer') return (site.layer_lots || 0) > 0
    return true
  }) || []

  // Get stats based on filter
  const getSiteStats = (site: Site) => {
    if (lotFilter === 'broiler') {
      return {
        lots: site.broiler_lots || 0,
        birds: site.broiler_birds || site.total_birds || 0,
      }
    } else if (lotFilter === 'layer') {
      return {
        lots: site.layer_lots || 0,
        birds: site.layer_birds || site.total_birds || 0,
      }
    }
    return {
      lots: site.active_lots || 0,
      birds: site.total_birds || 0,
    }
  }

  if (!filteredSites || filteredSites.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Bird className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">
          {lotFilter === 'broiler' ? 'Aucune bande de chair active' :
           lotFilter === 'layer' ? 'Aucune bande de pondeuses active' :
           'Aucun site configure'}
        </p>
        <Link
          href="/lots"
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Voir les bandes
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
      {filteredSites.map((site) => {
        const stats = getSiteStats(site)
        return (
          <Link
            key={site.id}
            href={`/sites/${site.id}`}
            className="block p-3 rounded-lg border hover:border-blue-200 hover:bg-blue-50/50 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 text-sm truncate">{site.name}</h3>
                {site.city && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{site.city}</span>
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <Bird className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {stats.birds.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 font-medium text-xs">
                    {stats.lots}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">bandes</p>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
