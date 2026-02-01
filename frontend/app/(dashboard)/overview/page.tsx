'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Egg,
  Bird,
  Wallet,
  Warehouse,
  Scale,
  TrendingUp,
  Skull,
  Activity
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { EggsChart } from '@/components/charts/eggs-chart'
import { FinancialChart } from '@/components/charts/financial-chart'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { ActiveLots } from '@/components/dashboard/active-lots'

export default function OverviewPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard/overview')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  const summary = dashboard?.summary || {}
  const today = dashboard?.today || {}
  const week = dashboard?.week || {}
  const month = dashboard?.month || {}
  const broilerSummary = dashboard?.broiler_summary || {}

  const margin = (month.sales || 0) - (month.expenses || 0)

  // Check if both lot types exist
  const hasBroilers = (summary.broiler_lots || 0) > 0
  const hasLayers = (summary.layer_lots || 0) > 0

  // Build subtitle showing lot breakdown
  const getLotsSubtitle = () => {
    if (hasBroilers && hasLayers) {
      return `${summary.layer_lots || 0} pond., ${summary.broiler_lots || 0} chair`
    } else if (hasBroilers) {
      return 'Poulets de chair'
    } else if (hasLayers) {
      return 'Pondeuses'
    }
    return null
  }

  return (
    <div className="w-full px-4 sm:px-6 space-y-4 lg:space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Vue d'ensemble de votre ferme</p>
      </div>

      {/* Stats grid - 6 KPIs on large screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard
          title="Bandes"
          value={summary.active_lots || 0}
          subtitle={getLotsSubtitle() || undefined}
          icon={Warehouse}
          color="blue"
        />
        <StatCard
          title="Oiseaux"
          value={(summary.total_birds || 0).toLocaleString()}
          icon={Bird}
          color="green"
        />
        {hasLayers ? (
          <StatCard
            title="Oeufs/jour"
            value={(today.eggs_produced || 0).toLocaleString()}
            trend={today.eggs_change}
            trendLabel="vs hier"
            icon={Egg}
            color="orange"
          />
        ) : hasBroilers ? (
          <StatCard
            title="Poids moy."
            value={`${Math.round(broilerSummary.avg_weight_g || 0)}g`}
            subtitle={broilerSummary.lots_ready_for_sale > 0 ? `${broilerSummary.lots_ready_for_sale} prêts` : undefined}
            icon={Scale}
            color="orange"
          />
        ) : (
          <StatCard
            title="Oeufs/jour"
            value="0"
            icon={Egg}
            color="gray"
          />
        )}
        <StatCard
          title="Mortalité"
          value={week.mortality || 0}
          subtitle={`7 jours${week.mortality_rate ? ` · ${week.mortality_rate.toFixed(1)}%` : ''}`}
          icon={Skull}
          color="red"
        />
        <StatCard
          title="Dépenses"
          value={`${Math.abs(month.expenses || 0) >= 1000000 ? ((month.expenses || 0) / 1000000).toFixed(1) + 'M' : ((month.expenses || 0) / 1000).toFixed(0) + 'K'} F`}
          subtitle="30 jours"
          icon={TrendingUp}
          color="gray"
        />
        <StatCard
          title="Bénéfice"
          value={`${margin >= 0 ? '+' : ''}${Math.abs(margin) >= 1000000 ? (margin / 1000000).toFixed(1) + 'M' : (margin / 1000).toFixed(0) + 'K'} F`}
          subtitle="30 jours"
          icon={Wallet}
          color={margin >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Charts and Alerts - 3 columns on very large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Graphique oeufs ou placeholder */}
        {hasLayers && (
          <div className="bg-white rounded-xl border p-3 lg:p-4 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Production d'oeufs (14 jours)</h2>
            <EggsChart />
          </div>
        )}

        {/* Graphique financier */}
        <div className={`bg-white rounded-xl border p-3 lg:p-4 ${!hasLayers ? 'lg:col-span-2' : ''}`}>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Evolution financière (6 mois)</h2>
          <FinancialChart />
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl border p-3 lg:p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Alertes</h2>
            {summary.active_alerts > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                {summary.active_alerts}
              </span>
            )}
          </div>
          <AlertsList compact />
        </div>
      </div>

      {/* Bandes en cours */}
      <div className="bg-white rounded-xl border p-3 lg:p-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Mes bandes en cours</h2>
        <ActiveLots sites={dashboard?.sites || []} lotFilter="all" />
      </div>
    </div>
  )
}
