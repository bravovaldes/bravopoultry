'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  Bird,
  Egg,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  Scale,
  Droplets,
  Wheat,
  Skull,
  Building2,
  History,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Target,
  Info,
  Wallet,
  Receipt,
  PiggyBank,
  ShoppingCart,
  Split,
  GitBranch,
  X,
  Search,
  MapPin,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn, formatDate, formatDateShort } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

interface LotStats {
  total_mortality: number
  mortality_rate: number
  total_eggs: number
  average_laying_rate: number
  peak_laying_rate: number
  current_weight_g: number | null
  daily_gain_g: number | null
  total_feed_kg: number
  feed_conversion_ratio: number | null
  total_sales: number
  total_expenses: number
  gross_margin: number
  performance_score: number | null
}

interface Lot {
  id: string
  code: string
  name: string | null
  type: 'broiler' | 'layer'
  status: 'active' | 'completed' | 'preparation' | 'suspended'
  breed: string | null
  supplier: string | null
  initial_quantity: number
  current_quantity: number | null
  placement_date: string
  age_at_placement: number
  expected_end_date: string | null
  actual_end_date: string | null
  chick_price_unit: number | null
  transport_cost: number | null
  target_weight_g: number | null
  target_fcr: number | null
  target_laying_rate: number | null
  notes: string | null
  age_days: number
  age_weeks: number
  building_id: string | null
  building_name: string | null
  site_name: string | null
  stats: LotStats | null
}

interface HistoryEntry {
  date: string
  eggs: number | null
  laying_rate: number | null
  mortality: number | null
  feed_kg: number | null
  water_liters: number | null
  weight_g: number | null
}

export default function BandeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [closeConfirmInput, setCloseConfirmInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showLayingAnalysis, setShowLayingAnalysis] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitQuantity, setSplitQuantity] = useState<number>(0)
  const [splitBuildingId, setSplitBuildingId] = useState<string>('')
  const [splitLotName, setSplitLotName] = useState<string>('')
  const [distributeExpenses, setDistributeExpenses] = useState(true)
  const [splitSiteFilter, setSplitSiteFilter] = useState<string>('')
  const [splitBuildingSearch, setSplitBuildingSearch] = useState<string>('')

  // Lock body scroll when any modal is open
  useBodyScrollLock(showDeleteConfirm || showCloseConfirm || showSplitModal)

  const lotId = params.id as string

  const { data: lot, isLoading, error } = useQuery<Lot>({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
    enabled: !!lotId
  })

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['lot-history', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/history?limit=14`)
      return response.data
    },
    enabled: !!lotId && showHistory
  })

  // Laying analysis for layer lots
  const { data: layingAnalysis } = useQuery({
    queryKey: ['laying-analysis', lotId],
    queryFn: async () => {
      const response = await api.get(`/production/laying-curve/analysis/${lotId}`)
      return response.data
    },
    enabled: !!lotId && lot?.type === 'layer'
  })

  // Financial summary
  const { data: financialSummary, isLoading: isLoadingFinancial, error: financialError } = useQuery({
    queryKey: ['lot-financial-summary', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/financial-summary`)
      return response.data
    },
    enabled: !!lotId
  })

  const [showFinancialDetails, setShowFinancialDetails] = useState(false)
  const [customTrayPrice, setCustomTrayPrice] = useState<number | null>(null)

  // Fetch sites for split modal
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
    enabled: showSplitModal
  })

  // Fetch buildings for split modal
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const response = await api.get('/buildings')
      return response.data
    },
    enabled: showSplitModal
  })

  // Filter buildings based on site and search
  const filteredBuildings = (buildings || []).filter((building: any) => {
    // Filter by site
    if (splitSiteFilter && building.site?.id !== splitSiteFilter) {
      return false
    }
    // Filter by search
    if (splitBuildingSearch) {
      const search = splitBuildingSearch.toLowerCase()
      return (
        building.name?.toLowerCase().includes(search) ||
        building.code?.toLowerCase().includes(search) ||
        building.site?.name?.toLowerCase().includes(search)
      )
    }
    return true
  })

  // Fetch split history
  const { data: splitHistory } = useQuery({
    queryKey: ['lot-split-history', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/split-history`)
      return response.data
    },
    enabled: !!lotId
  })

  const splitLot = useMutation({
    mutationFn: async (data: { quantity: number; target_building_id: string; new_lot_name?: string; distribute_expenses: boolean }) => {
      const response = await api.post(`/lots/${lotId}/split`, data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Bande scindee avec succes. Nouvelle bande: ${data.new_lot_code}`)
      setShowSplitModal(false)
      setSplitQuantity(0)
      setSplitBuildingId('')
      setSplitLotName('')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lot-split-history', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lot-financial-summary', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors du split')
    }
  })

  const deleteLot = useMutation({
    mutationFn: async () => {
      // Use force=true to delete lots with historical data (not active lots - those are always blocked)
      await api.delete(`/lots/${lotId}?force=true`)
    },
    onSuccess: () => {
      toast.success('Bande supprimée')
      router.push('/lots')
    },
    onError: (error: any) => {
      try {
        const errorData = error.response?.data?.detail
        if (typeof errorData === 'object' && errorData?.error === 'lot_is_active') {
          toast.error(`Impossible de supprimer cette bande. Elle est encore active avec ${errorData.current_quantity || 0} oiseaux en elevage. Veuillez d'abord cloturer la bande avant de la supprimer.`)
        } else {
          const message = typeof errorData === 'string' ? errorData : errorData?.message || 'Erreur lors de la suppression'
          toast.error(message)
        }
      } catch {
        toast.error('Erreur lors de la suppression')
      }
    }
  })

  const closeLot = useMutation({
    mutationFn: async () => {
      await api.post(`/lots/${lotId}/close`)
    },
    onSuccess: () => {
      toast.success('Bande cloturee')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !lot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Bande non trouvee</p>
        <Link href="/lots" className="text-orange-500 hover:underline mt-2 inline-block">
          Retour aux bandes
        </Link>
      </div>
    )
  }

  const isBroiler = lot.type === 'broiler'
  const isLayer = lot.type === 'layer'
  const isActive = lot.status === 'active'
  const stats = lot.stats

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'En cours',
      'completed': 'Terminee',
      'preparation': 'Preparation',
      'suspended': 'Suspendue'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'preparation': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lots"
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                isBroiler ? 'bg-blue-100' : 'bg-orange-100'
              )}>
                {isBroiler ? (
                  <Bird className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                ) : (
                  <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {lot.name || lot.code || 'Bande sans nom'}
                  </h1>
                  {lot.name && lot.code && (
                    <span className="text-xs sm:text-sm text-gray-400">{lot.code}</span>
                  )}
                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap', getStatusColor(lot.status))}>
                    {getStatusLabel(lot.status)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-gray-500 truncate">
                  {isBroiler ? 'Poulet de chair' : 'Pondeuses'} • {lot.breed || 'Souche non specifiee'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-10 sm:pl-0">
          {isActive && (lot.current_quantity || 0) > 1 && (
            <button
              onClick={() => {
                setShowSplitModal(true)
                setSplitQuantity(Math.floor((lot.current_quantity || 0) / 2))
                setSplitSiteFilter('')
                setSplitBuildingSearch('')
                setSplitBuildingId('')
                setSplitLotName('')
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition"
            >
              <Split className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Scinder</span>
            </button>
          )}
          {isActive && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="sm:hidden">Fin</span>
              <span className="hidden sm:inline">Cloturer</span>
            </button>
          )}
          <Link
            href={`/lots/${lotId}/edit`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm border rounded-lg hover:bg-gray-50 transition"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Modifier</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Split Info Banners - Compact on same row for large screens */}
      {(splitHistory?.parent_lot || splitHistory?.child_lots?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {splitHistory?.parent_lot && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-purple-800">Issu d'un split</p>
                  <p className="text-xs text-purple-600 truncate">
                    Depuis{' '}
                    <Link href={`/lots/${splitHistory.parent_lot.id}`} className="underline hover:text-purple-800">
                      {splitHistory.parent_lot.code}
                    </Link>
                    {' '}({((splitHistory.parent_lot.split_ratio || 0) * 100).toFixed(0)}%)
                  </p>
                </div>
              </div>
            </div>
          )}
          {splitHistory?.child_lots?.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-indigo-800 mb-1">
                    {splitHistory.child_lots.length} lot(s) issu(s)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {splitHistory.child_lots.map((child: any) => (
                      <Link
                        key={child.id}
                        href={`/lots/${child.id}`}
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                      >
                        {child.code}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Bar */}
      <div className="bg-white rounded-xl border p-2.5 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 block leading-tight">Mise en place</span>
              <span className="text-sm font-medium">{formatDate(lot.placement_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bird className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 block leading-tight">Age</span>
              <span className="text-sm font-medium">J{lot.age_days} ({lot.age_weeks} sem)</span>
            </div>
          </div>
          {lot.building_name && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block leading-tight">Bâtiment</span>
                <span className="text-sm font-medium truncate">{lot.building_name}</span>
              </div>
            </div>
          )}
          {lot.supplier && (
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block leading-tight">Fournisseur</span>
                <span className="text-sm font-medium truncate">{lot.supplier}</span>
              </div>
            </div>
          )}
          {lot.site_name && (
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block leading-tight">Site</span>
                <span className="text-sm font-medium truncate">{lot.site_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bird className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500 leading-tight">Effectif</p>
              <p className="text-base font-bold leading-tight">
                {(lot.current_quantity || 0).toLocaleString()}
                <span className="text-[10px] font-normal text-gray-400">/{lot.initial_quantity.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Skull className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500 leading-tight">Mortalité</p>
              <p className="text-base font-bold leading-tight">
                {Number(stats?.mortality_rate || 0).toFixed(1)}%
                <span className="text-[10px] font-normal text-gray-400"> ({stats?.total_mortality || 0})</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Wheat className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500 leading-tight">Aliment</p>
              <p className="text-base font-bold leading-tight">
                {(stats?.total_feed_kg || 0).toLocaleString()} kg
              </p>
            </div>
          </div>
        </div>

        {isBroiler && (
          <>
            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Scale className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">Poids moy.</p>
                  <p className="text-base font-bold leading-tight">
                    {stats?.current_weight_g ? `${(Number(stats.current_weight_g) / 1000).toFixed(2)} kg` : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">IC</p>
                  <p className="text-base font-bold leading-tight">
                    {stats?.feed_conversion_ratio ? Number(stats.feed_conversion_ratio).toFixed(2) : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">GMQ</p>
                  <p className="text-base font-bold leading-tight">
                    {stats?.daily_gain_g ? `${Number(stats.daily_gain_g).toFixed(0)} g/j` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {isLayer && (
          <>
            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Egg className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">Taux ponte</p>
                  <p className="text-base font-bold leading-tight">
                    {Number(stats?.average_laying_rate || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Egg className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">Total oeufs</p>
                  <p className="text-base font-bold leading-tight">
                    {(stats?.total_eggs || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 leading-tight">Pic ponte</p>
                  <p className="text-base font-bold leading-tight">
                    {Number(layingAnalysis?.peak_info?.peak_rate_achieved || stats?.peak_laying_rate || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions - Primary section for daily tasks */}
      {isActive && (
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
            <h2 className="font-semibold text-gray-900 text-xs sm:text-sm">Saisie rapide</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 lg:gap-3">
            <Link
              href={`/lots/${lotId}/daily-entry`}
              className="flex flex-col items-center gap-1 p-2 sm:p-3 border-2 border-dashed rounded-lg sm:rounded-xl hover:border-orange-500 hover:bg-orange-50 transition"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Saisie</span>
            </Link>

            {isBroiler && (
              <Link
                href={`/lots/${lotId}/weight`}
                className="flex flex-col items-center gap-1 p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
              >
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Pesée</span>
              </Link>
            )}

            {isLayer && (
              <Link
                href={`/lots/${lotId}/eggs`}
                className="flex flex-col items-center gap-1 p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
              >
                <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Oeufs</span>
              </Link>
            )}

            <Link
              href={`/lots/${lotId}/feed`}
              className="flex flex-col items-center gap-1 p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
            >
              <Wheat className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Aliment</span>
            </Link>

            <Link
              href={`/lots/${lotId}/mortality`}
              className="flex flex-col items-center gap-1 p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Mortal.</span>
            </Link>

            <Link
              href={`/lots/${lotId}/health`}
              className="flex flex-col items-center gap-1 p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
            >
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Santé</span>
            </Link>
          </div>
        </div>
      )}

      {/* Laying Phase Analysis - Collapsible for Layers */}
      {isLayer && layingAnalysis && (
        <div className="bg-white rounded-xl border">
          <button
            onClick={() => setShowLayingAnalysis(!showLayingAnalysis)}
            className="w-full p-2.5 sm:p-3 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Phase de ponte</h2>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {layingAnalysis.current_phase?.label} (S{lot.age_weeks}) • Attendu: {layingAnalysis.expected_rate?.optimal_expected?.toFixed(0) || 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className={cn(
                'px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap',
                layingAnalysis.analysis?.status === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                layingAnalysis.analysis?.status === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                layingAnalysis.analysis?.status === 'BELOW_EXPECTED' ? 'bg-orange-100 text-orange-700' :
                layingAnalysis.analysis?.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {layingAnalysis.analysis?.status === 'EXCELLENT' ? 'Excellente' :
                 layingAnalysis.analysis?.status === 'GOOD' ? 'Bonne' :
                 layingAnalysis.analysis?.status === 'BELOW_EXPECTED' ? 'Sous att.' :
                 layingAnalysis.analysis?.status === 'CRITICAL' ? 'Critique' :
                 'Pre-ponte'}
              </span>
              {showLayingAnalysis ? (
                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              )}
            </div>
          </button>

          {showLayingAnalysis && (
            <div className="border-t p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
              {/* Phase Description */}
              {layingAnalysis.current_phase?.description && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {layingAnalysis.current_phase.description}
                </p>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Attendu</p>
                  <p className="text-base font-bold">{layingAnalysis.expected_rate?.optimal_expected?.toFixed(0) || 0}%</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Actuel</p>
                  <p className="text-base font-bold">{layingAnalysis.actual_rate?.toFixed(1) || 0}%</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Écart</p>
                  {layingAnalysis.analysis?.status !== 'PRE_LAY' && layingAnalysis.expected_rate?.optimal_expected > 0 ? (
                    <p className={cn(
                      'text-base font-bold',
                      layingAnalysis.analysis?.deviation >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {layingAnalysis.analysis?.deviation >= 0 ? '+' : ''}{layingAnalysis.analysis?.deviation?.toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-base font-bold text-gray-400">-</p>
                  )}
                </div>
              </div>

              {/* Peak Prediction */}
              {layingAnalysis.peak_info?.prediction && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-purple-800">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Prevision pic:</span>
                    <span>
                      {layingAnalysis.peak_info.prediction.weeks_to_peak > 0
                        ? `Dans ${layingAnalysis.peak_info.prediction.weeks_to_peak} semaines`
                        : 'En cours'}
                    </span>
                  </div>
                </div>
              )}

              {/* Peak Achieved */}
              {layingAnalysis.peak_info?.peak_rate_achieved > 0 &&
               layingAnalysis.peak_info?.peak_rate_achieved <= 100 &&
               layingAnalysis.peak_info?.peak_age_weeks >= 18 &&
               layingAnalysis.peak_info?.peak_date && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Pic atteint:</span>
                    <span>{layingAnalysis.peak_info.peak_rate_achieved.toFixed(1)}% (S{layingAnalysis.peak_info.peak_age_weeks})</span>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {layingAnalysis.alerts && layingAnalysis.alerts.length > 0 && (
                <div className="space-y-2">
                  {layingAnalysis.alerts.map((alert: any, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-lg text-sm',
                        alert.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                        alert.type === 'critical' ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      )}
                    >
                      {alert.type === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        {alert.title && <span className="font-medium">{alert.title}: </span>}
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feed Recommendation */}
              {layingAnalysis.feed_recommendation && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <Wheat className="w-4 h-4" />
                    <span className="font-medium">Aliment:</span>
                    <span>{layingAnalysis.feed_recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Financial Summary - Detailed */}
      <div className="bg-white rounded-xl border">
        <button
          onClick={() => setShowFinancialDetails(!showFinancialDetails)}
          className="w-full p-2.5 sm:p-3 lg:p-4 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Bilan financier</h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {financialSummary?.summary?.profit_status === 'profit' ? 'Rentable' :
                 financialSummary?.summary?.profit_status === 'loss' ? 'Deficit' : 'En cours'}
                {financialSummary?.sales_count ? ` • ${financialSummary.sales_count} vente(s)` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={cn(
              'text-right',
              (financialSummary?.summary?.gross_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <p className="text-sm sm:text-lg md:text-xl font-bold">
                {(financialSummary?.summary?.gross_profit || 0) >= 0 ? '+' : ''}
                {(financialSummary?.summary?.gross_profit || 0).toLocaleString()} XAF
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">Profit</p>
            </div>
            {showFinancialDetails ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            )}
          </div>
        </button>

        {showFinancialDetails && (
          <div className="border-t p-2.5 sm:p-3 lg:p-4 space-y-3 sm:space-y-4">
            {isLoadingFinancial && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
                <span className="ml-2 text-gray-500">Chargement...</span>
              </div>
            )}
            {financialError && (
              <div className="text-center py-4 text-red-500">
                Erreur lors du chargement des données financières
              </div>
            )}
            {financialSummary && (<>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <div className="p-2.5 bg-red-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <p className="text-xs text-gray-500">Dépenses</p>
                </div>
                <p className="text-base font-bold text-red-600">
                  {(financialSummary.summary?.total_expenses || 0).toLocaleString()} XAF
                </p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <p className="text-xs text-gray-500">Revenus</p>
                </div>
                <p className="text-base font-bold text-green-600">
                  {(financialSummary.summary?.total_revenue || 0).toLocaleString()} XAF
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-xs text-gray-500">Profit</p>
                </div>
                <p className={cn(
                  'text-base font-bold',
                  (financialSummary.summary?.gross_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {(financialSummary.summary?.gross_profit || 0).toLocaleString()} XAF
                </p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                  <p className="text-xs text-gray-500">Marge</p>
                </div>
                <p className="text-base font-bold text-purple-600">
                  {financialSummary.summary?.profit_margin_percent || 0}%
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <Bird className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-xs text-gray-500">Profit/oiseau</p>
                </div>
                <p className={cn(
                  'text-base font-bold',
                  (financialSummary.per_unit?.profit_per_bird || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
                )}>
                  {(financialSummary.per_unit?.profit_per_bird || 0).toLocaleString()} XAF
                </p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs text-gray-500">Ventes</p>
                </div>
                <p className="text-base font-bold text-amber-600">
                  {financialSummary.sales_count || 0}
                </p>
              </div>
            </div>

            {/* Expenses Breakdown */}
            {Object.keys(financialSummary.expenses_breakdown || {}).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Detail des depenses
                </h3>
                <div className="space-y-2">
                  {Object.entries(financialSummary.expenses_breakdown).map(([category, data]: [string, any]) => {
                    const categoryLabels: Record<string, string> = {
                      'feed': 'Alimentation',
                      'chicks': 'Poussins',
                      'veterinary': 'Veterinaire',
                      'medicine': 'Medicaments',
                      'labor': 'Main d\'oeuvre',
                      'energy': 'Energie',
                      'transport': 'Transport',
                      'equipment': 'Equipement',
                      'other': 'Autres'
                    }
                    const label = categoryLabels[category] || category
                    const percent = financialSummary.summary?.total_expenses > 0
                      ? (data.total / financialSummary.summary.total_expenses * 100).toFixed(0)
                      : 0

                    return (
                      <div key={category} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">{label}</span>
                            <span className="text-sm font-medium">{data.total.toLocaleString()} XAF</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Eggs Production (Layer lots only) */}
            {financialSummary.eggs_production && (() => {
              const traysProduced = financialSummary.eggs_production.total_trays_produced || 0
              const defaultPrice = financialSummary.eggs_production.avg_price_per_tray || 1500
              const effectivePrice = customTrayPrice !== null ? customTrayPrice : defaultPrice
              const calculatedRevenue = traysProduced * effectivePrice

              return (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1">
                    <Egg className="w-3.5 h-3.5" />
                    Production d'oeufs (estimation)
                  </h3>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Plateaux</p>
                      <p className="font-bold text-amber-700">{traysProduced.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Prix/plateau</p>
                      <input
                        type="number"
                        value={effectivePrice}
                        onChange={(e) => setCustomTrayPrice(Number(e.target.value) || 0)}
                        className="w-20 px-1.5 py-0.5 text-sm font-bold text-amber-700 bg-white border border-amber-300 rounded"
                        min="0"
                        step="100"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Revenus est.</p>
                      <p className="font-bold text-green-600">{Math.round(calculatedRevenue).toLocaleString()} XAF</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Sales List */}
            {financialSummary.sales?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Ventes ({financialSummary.sales_count})
                </h3>
                <div className="space-y-2">
                  {financialSummary.sales.slice(0, 5).map((sale: any) => {
                    const saleTypeLabels: Record<string, string> = {
                      'live_birds': 'Poulets vifs',
                      'dressed_birds': 'Poulets abattus',
                      'eggs_tray': 'Oeufs (plateau)',
                      'eggs_carton': 'Oeufs (carton)',
                      'culled_hens': 'Poules reforme',
                      'manure': 'Fiente',
                      'other': 'Autre'
                    }
                    // Get correct unit based on sale type (not the stored unit which might be wrong)
                    const getUnitLabel = (saleType: string, storedUnit?: string) => {
                      const unitMap: Record<string, string> = {
                        'eggs_tray': 'plateau',
                        'eggs_carton': 'carton',
                        'live_birds': 'tete',
                        'dressed_birds': 'tete',
                        'culled_hens': 'tete',
                        'manure': 'kg',
                      }
                      return unitMap[saleType] || storedUnit || 'pcs'
                    }
                    return (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            {saleTypeLabels[sale.sale_type] || sale.sale_type}
                            {sale.quantity && <span className="text-gray-500 ml-1">({sale.quantity} {getUnitLabel(sale.sale_type, sale.unit)})</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sale.date ? new Date(sale.date).toLocaleDateString('fr-FR') : '-'}
                            {sale.client_name && <span> • {sale.client_name}</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">
                            +{(sale.total_amount || 0).toLocaleString()} XAF
                          </p>
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            sale.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {sale.payment_status === 'paid' ? 'Paye' : sale.payment_status === 'pending' ? 'En attente' : sale.payment_status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {financialSummary.sales.length > 5 && (
                    <p className="text-sm text-center text-gray-500 py-2">
                      + {financialSummary.sales.length - 5} autres ventes
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* No sales yet */}
            {(!financialSummary.sales || financialSummary.sales.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucune vente enregistree pour cette bande</p>
                <Link
                  href="/commercial"
                  className="text-orange-500 hover:underline text-sm mt-1 inline-block"
                >
                  Enregistrer une vente
                </Link>
              </div>
            )}
            </>
            )}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="bg-white rounded-xl border">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-2.5 sm:p-3 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Historique des saisies</h2>
          </div>
          {showHistory ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          )}
        </button>

        {showHistory && (
          <div className="border-t">
            {isLoadingHistory ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Chargement de l'historique...</p>
              </div>
            ) : historyData?.history?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      {isLayer && (
                        <>
                          <th className="text-right p-3 font-medium text-gray-600">Oeufs</th>
                          <th className="text-right p-3 font-medium text-gray-600">Taux</th>
                        </>
                      )}
                      {isBroiler && (
                        <th className="text-right p-3 font-medium text-gray-600">Poids (g)</th>
                      )}
                      <th className="text-right p-3 font-medium text-gray-600">Mortalite</th>
                      <th className="text-right p-3 font-medium text-gray-600">Aliment</th>
                      <th className="text-right p-3 font-medium text-gray-600">Eau</th>
                      <th className="text-center p-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyData.history.map((entry: HistoryEntry) => (
                      <tr key={entry.date} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">
                          {formatDateShort(entry.date)}
                        </td>
                        {isLayer && (
                          <>
                            <td className="p-3 text-right">
                              {entry.eggs !== null ? entry.eggs.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right">
                              {entry.laying_rate !== null ? (
                                <span className={cn(
                                  'font-medium',
                                  entry.laying_rate >= 80 ? 'text-green-600' :
                                  entry.laying_rate >= 60 ? 'text-orange-600' : 'text-red-600'
                                )}>
                                  {entry.laying_rate.toFixed(1)}%
                                </span>
                              ) : '-'}
                            </td>
                          </>
                        )}
                        {isBroiler && (
                          <td className="p-3 text-right">
                            {entry.weight_g !== null ? `${entry.weight_g.toLocaleString()}` : '-'}
                          </td>
                        )}
                        <td className="p-3 text-right">
                          {entry.mortality !== null ? (
                            <span className="text-red-600">{entry.mortality}</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-right">
                          {entry.feed_kg !== null ? `${entry.feed_kg} kg` : '-'}
                        </td>
                        <td className="p-3 text-right">
                          {entry.water_liters !== null ? `${entry.water_liters} L` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/lots/${lotId}/daily-entry?date=${entry.date}`}
                            className="text-orange-500 hover:text-orange-600 text-xs font-medium"
                          >
                            Modifier
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune donnee enregistree</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {lot.notes && (
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <h2 className="font-semibold text-gray-900 text-xs sm:text-sm mb-2">Notes</h2>
          <p className="text-gray-600 text-xs sm:text-sm">{lot.notes}</p>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && lot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cloturer cette bande ?
            </h3>
            <p className="text-gray-500 mb-4">
              La bande sera marquee comme terminee. Vous ne pourrez plus ajouter de donnees de production. Les donnees existantes seront conservees.
            </p>
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                Pour confirmer, tapez l'identifiant de la bande: <span className="font-mono font-bold">{lot.code || lot.id}</span>
              </p>
            </div>
            <input
              type="text"
              value={closeConfirmInput}
              onChange={(e) => setCloseConfirmInput(e.target.value)}
              placeholder="Entrez l'identifiant"
              className="w-full px-3 py-2 border rounded-lg mb-4 font-mono"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCloseConfirm(false)
                  setCloseConfirmInput('')
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  closeLot.mutate()
                  setShowCloseConfirm(false)
                  setCloseConfirmInput('')
                }}
                disabled={closeLot.isPending || closeConfirmInput !== (lot.code || lot.id)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closeLot.isPending ? 'Cloture...' : 'Confirmer la cloture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && lot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer cette bande ?
            </h3>
            <p className="text-gray-500 mb-4">
              Toutes les donnees (production, mortalite, alimentation) seront perdues. Cette action est irreversible.
            </p>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Pour confirmer, tapez l'identifiant de la bande: <span className="font-mono font-bold">{lot.code || lot.id}</span>
              </p>
            </div>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Entrez l'identifiant"
              className="w-full px-3 py-2 border rounded-lg mb-4 font-mono"
            />
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
                onClick={() => {
                  deleteLot.mutate()
                  setDeleteConfirmInput('')
                }}
                disabled={deleteLot.isPending || deleteConfirmInput !== (lot.code || lot.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLot.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Lot Modal */}
      {showSplitModal && lot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                  <Split className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Scinder la bande
                </h3>
              </div>
              <button
                onClick={() => setShowSplitModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              Transferer une partie des oiseaux vers une nouvelle bande dans un autre batiment.
            </p>

            <div className="space-y-3 sm:space-y-4">
              {/* Current lot info + inherited fields */}
              <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg text-xs sm:text-sm space-y-2">
                <p className="font-medium text-gray-700 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate">Bande source: {lot.code}</span>
                </p>
                <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs pl-5 sm:pl-6">
                  <p className="text-gray-500">Effectif actuel:</p>
                  <p className="font-medium text-gray-800">{(lot.current_quantity || 0).toLocaleString()}</p>

                  <p className="text-gray-500">Type:</p>
                  <p className="font-medium text-gray-800">{lot.type === 'broiler' ? 'Chair' : 'Pondeuse'}</p>

                  <p className="text-gray-500">Souche:</p>
                  <p className="font-medium text-gray-800 truncate">{lot.breed || 'Non spécifiée'}</p>

                  <p className="text-gray-500">Âge:</p>
                  <p className="font-medium text-gray-800">J{lot.age_days} ({lot.age_weeks} sem)</p>

                  <p className="text-gray-500">Mise en place:</p>
                  <p className="font-medium text-gray-800">{formatDate(lot.placement_date)}</p>
                </div>
                <p className="text-xs text-blue-600 italic pl-5 sm:pl-6 pt-1">
                  Ces infos seront heritees par la nouvelle bande
                </p>
              </div>

              {/* Quantity to split */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nombre d'oiseaux à transférer
                </label>
                <input
                  type="number"
                  value={splitQuantity}
                  onChange={(e) => setSplitQuantity(Math.min(Number(e.target.value) || 0, (lot.current_quantity || 1) - 1))}
                  min={1}
                  max={(lot.current_quantity || 1) - 1}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Restera: {((lot.current_quantity || 0) - splitQuantity).toLocaleString()} oiseaux
                  ({(((lot.current_quantity || 0) - splitQuantity) / (lot.current_quantity || 1) * 100).toFixed(0)}%)
                </p>
              </div>

              {/* Site filter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Filtrer par site
                  </label>
                  <Link
                    href="/sites/new"
                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Créer un site
                  </Link>
                </div>
                {(!sites || sites.length === 0) ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">Aucun site disponible. Créez d'abord un site.</p>
                  </div>
                ) : (
                  <select
                    value={splitSiteFilter}
                    onChange={(e) => {
                      setSplitSiteFilter(e.target.value)
                      setSplitBuildingId('') // Reset building selection when site changes
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Tous les sites</option>
                    {sites?.map((site: any) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target building */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Bâtiment de destination
                  </label>
                  <Link
                    href="/sites"
                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Créer un bâtiment
                  </Link>
                </div>

                {(!buildings || buildings.length === 0) ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">Aucun bâtiment disponible. Créez d'abord un bâtiment.</p>
                  </div>
                ) : (
                  <>
                    {/* Search input if more than 5 buildings */}
                    {(buildings?.length || 0) > 5 && (
                      <div className="relative mb-2">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={splitBuildingSearch}
                          onChange={(e) => setSplitBuildingSearch(e.target.value)}
                          placeholder="Rechercher..."
                          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    <select
                      value={splitBuildingId}
                      onChange={(e) => setSplitBuildingId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      size={filteredBuildings.length > 5 ? 5 : 1}
                    >
                      <option value="">Sélectionner un bâtiment</option>
                      {filteredBuildings.map((building: any) => (
                        <option
                          key={building.id}
                          value={building.id}
                        >
                          {building.name} {building.site?.name ? `(${building.site.name})` : ''} {building.id === lot.building_id ? '• actuel' : ''}
                        </option>
                      ))}
                    </select>
                    {splitBuildingSearch && filteredBuildings.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">Aucun bâtiment trouvé</p>
                    )}
                  </>
                )}
              </div>

              {/* New lot name (optional) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nom de la nouvelle bande (optionnel)
                </label>
                <input
                  type="text"
                  value={splitLotName}
                  onChange={(e) => setSplitLotName(e.target.value)}
                  placeholder={`${lot.name || lot.code} - Split`}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Distribute expenses checkbox */}
              <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-amber-50 rounded-lg">
                <input
                  type="checkbox"
                  id="distributeExpenses"
                  checked={distributeExpenses}
                  onChange={(e) => setDistributeExpenses(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="distributeExpenses" className="text-xs sm:text-sm">
                  <span className="font-medium text-amber-800">Répartir les dépenses</span>
                  <p className="text-amber-600 text-xs mt-0.5">
                    Repartition proportionnelle ({((splitQuantity / (lot.current_quantity || 1)) * 100).toFixed(0)}% vers la nouvelle bande)
                  </p>
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => splitLot.mutate({
                  quantity: splitQuantity,
                  target_building_id: splitBuildingId,
                  new_lot_name: splitLotName || undefined,
                  distribute_expenses: distributeExpenses
                })}
                disabled={splitLot.isPending || !splitBuildingId || splitQuantity <= 0 || splitQuantity >= (lot.current_quantity || 0)}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {splitLot.isPending ? 'Creation...' : 'Scinder la bande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
