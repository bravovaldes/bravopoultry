'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Bird, Egg, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Lot {
  id: string
  code: string
  name?: string
  breed?: string
  type?: 'broiler' | 'layer'
  site_name?: string
  building_name?: string
  age_days?: number
  current_quantity?: number
}

interface LotSelectorProps {
  lots: Lot[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showAll?: boolean
  allLabel?: string
  maxVisible?: number
  className?: string
  lotType?: 'broiler' | 'layer' | 'all'
  showSearch?: boolean
}

export function LotSelector({
  lots = [],
  value,
  onChange,
  placeholder = 'Selectionner un lot',
  showAll = true,
  allLabel = 'Tous les lots',
  maxVisible = 5,
  className,
  lotType = 'all',
  showSearch = true
}: LotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showMore, setShowMore] = useState(false)

  // Filter lots by type
  const filteredByType = useMemo(() => {
    if (lotType === 'all') return lots
    return lots.filter(lot => lot.type === lotType)
  }, [lots, lotType])

  // Filter lots by search
  const filteredLots = useMemo(() => {
    if (!search) return filteredByType
    const searchLower = search.toLowerCase()
    return filteredByType.filter(lot =>
      lot.code?.toLowerCase().includes(searchLower) ||
      lot.name?.toLowerCase().includes(searchLower) ||
      lot.breed?.toLowerCase().includes(searchLower) ||
      lot.site_name?.toLowerCase().includes(searchLower) ||
      lot.building_name?.toLowerCase().includes(searchLower)
    )
  }, [filteredByType, search])

  // Limit visible lots
  const visibleLots = showMore ? filteredLots : filteredLots.slice(0, maxVisible)
  const hasMore = filteredLots.length > maxVisible

  // Get selected lot
  const selectedLot = lots.find(lot => lot.id === value)

  const getDisplayLabel = () => {
    if (!value || value === 'all') return showAll ? allLabel : placeholder
    if (selectedLot) {
      return `${selectedLot.name || selectedLot.code}${selectedLot.site_name ? ` (${selectedLot.site_name})` : ''}`
    }
    return placeholder
  }

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm",
          "hover:border-gray-400 transition",
          isOpen && "border-orange-500 ring-1 ring-orange-500"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedLot?.type === 'broiler' && <Bird className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          {selectedLot?.type === 'layer' && <Egg className="w-4 h-4 text-orange-500 flex-shrink-0" />}
          <span className={cn(!value && "text-gray-400")}>{getDisplayLabel()}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
              setShowMore(false)
            }}
          />

          {/* Dropdown Content */}
          <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border shadow-lg max-h-80 overflow-hidden">
            {/* Search */}
            {showSearch && filteredByType.length > 5 && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un lot..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                    autoFocus
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-56 overflow-y-auto">
              {/* All option */}
              {showAll && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('all')
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition flex items-center gap-2",
                    value === 'all' && "bg-orange-50 text-orange-600"
                  )}
                >
                  <span className="font-medium">{allLabel}</span>
                  <span className="text-xs text-gray-400">({filteredByType.length})</span>
                </button>
              )}

              {/* Lot options */}
              {visibleLots.length > 0 ? (
                <>
                  {visibleLots.map((lot) => (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => {
                        onChange(lot.id)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition flex items-center gap-2",
                        value === lot.id && "bg-orange-50 text-orange-600"
                      )}
                    >
                      {lot.type === 'broiler' && <Bird className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      {lot.type === 'layer' && <Egg className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{lot.name || lot.code}</span>
                        {lot.site_name && (
                          <span className="text-xs text-gray-400 ml-1">({lot.site_name})</span>
                        )}
                      </div>
                      {lot.age_days !== undefined && (
                        <span className="text-xs text-gray-400">J{lot.age_days}</span>
                      )}
                    </button>
                  ))}

                  {/* Show more button */}
                  {hasMore && !search && (
                    <button
                      type="button"
                      onClick={() => setShowMore(!showMore)}
                      className="w-full text-center py-2 text-sm text-orange-600 hover:bg-orange-50 transition font-medium flex items-center justify-center gap-1"
                    >
                      {showMore ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Voir plus ({filteredLots.length - maxVisible} autres)
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  {search ? `Aucun lot pour "${search}"` : 'Aucun lot disponible'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
