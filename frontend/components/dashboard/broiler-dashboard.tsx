'use client'

import Link from 'next/link'
import { Scale, Calendar, TrendingUp, AlertTriangle, ChevronRight, ShoppingCart, Skull } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BroilerLot {
  lot_id: string
  lot_code: string
  age_days: number
  current_weight_g: number
  target_weight_g: number
  gmq: number
  progress_percent: number
  days_to_target: number
  estimated_sale_date: string | null
  ready_for_sale: boolean
  initial_quantity: number
  quantity: number
  sold: number
  mortality: number
  sales_amount: number
}

interface BroilerSummary {
  avg_weight_g: number
  avg_age_days: number
  lots_ready_for_sale: number
  lots: BroilerLot[]
}

interface BroilerDashboardProps {
  broilerSummary: BroilerSummary
}

export function BroilerDashboard({ broilerSummary }: BroilerDashboardProps) {
  const { avg_weight_g, avg_age_days, lots_ready_for_sale, lots } = broilerSummary || {}

  if (!lots || lots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Aucune bande de chair active</p>
        <Link
          href="/lots/create"
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Creer une bande
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{Math.round(avg_weight_g)}g</p>
          <p className="text-xs text-blue-600">Poids moyen</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">J{Math.round(avg_age_days)}</p>
          <p className="text-xs text-green-600">Age moyen</p>
        </div>
        <div className={cn(
          "rounded-lg p-3 text-center",
          lots_ready_for_sale > 0 ? "bg-amber-50" : "bg-gray-50"
        )}>
          <p className={cn(
            "text-2xl font-bold",
            lots_ready_for_sale > 0 ? "text-amber-700" : "text-gray-700"
          )}>
            {lots_ready_for_sale}
          </p>
          <p className={cn(
            "text-xs",
            lots_ready_for_sale > 0 ? "text-amber-600" : "text-gray-600"
          )}>
            Prets a vendre
          </p>
        </div>
      </div>

      {/* Liste des lots */}
      <div className="space-y-3">
        {lots.map((lot) => (
          <Link
            key={lot.lot_id}
            href={`/lots/${lot.lot_id}`}
            className={cn(
              "block p-4 rounded-lg border transition",
              lot.ready_for_sale
                ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                : "hover:border-blue-200 hover:bg-blue-50/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{lot.lot_code}</h3>
                {lot.ready_for_sale && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Pret
                  </span>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{lot.current_weight_g}g</span>
                <span>{lot.target_weight_g}g cible</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    lot.progress_percent >= 90 ? "bg-amber-500" :
                    lot.progress_percent >= 70 ? "bg-green-500" :
                    "bg-blue-500"
                  )}
                  style={{ width: `${lot.progress_percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">{lot.progress_percent}%</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Calendar className="w-3 h-3" />
                </div>
                <p className="text-sm font-medium">J{lot.age_days}</p>
                <p className="text-xs text-gray-500">Age</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Scale className="w-3 h-3" />
                </div>
                <p className="text-sm font-medium">{lot.current_weight_g}g</p>
                <p className="text-xs text-gray-500">Poids</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <p className="text-sm font-medium">{lot.gmq}g/j</p>
                <p className="text-xs text-gray-500">GMQ</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Calendar className="w-3 h-3" />
                </div>
                <p className="text-sm font-medium">
                  {lot.days_to_target > 0 ? `${lot.days_to_target}j` : '-'}
                </p>
                <p className="text-xs text-gray-500">Reste</p>
              </div>
            </div>

            {/* Estimated sale date */}
            {lot.estimated_sale_date && !lot.ready_for_sale && (
              <div className="mt-3 pt-3 border-t text-center">
                <p className="text-xs text-gray-500">
                  Vente estimee: <span className="font-medium text-gray-700">
                    {new Date(lot.estimated_sale_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </p>
              </div>
            )}

            {/* Stock & Sales info */}
            <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="font-medium text-gray-700">{(lot.initial_quantity || lot.quantity || 0).toLocaleString()}</p>
                <p className="text-gray-500">Initial</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">{(lot.quantity || 0).toLocaleString()}</p>
                <p className="text-gray-500">Restant</p>
              </div>
              <div>
                <p className={cn(
                  "font-medium flex items-center justify-center gap-1",
                  (lot.sold || 0) > 0 ? "text-green-600" : "text-gray-400"
                )}>
                  <ShoppingCart className="w-3 h-3" />
                  {(lot.sold || 0).toLocaleString()}
                </p>
                <p className="text-gray-500">Vendus</p>
              </div>
              <div>
                <p className={cn(
                  "font-medium flex items-center justify-center gap-1",
                  (lot.mortality || 0) > 0 ? "text-red-500" : "text-gray-400"
                )}>
                  <Skull className="w-3 h-3" />
                  {lot.mortality || 0}
                </p>
                <p className="text-gray-500">Pertes</p>
              </div>
            </div>

            {/* Sales amount if any */}
            {(lot.sales_amount || 0) > 0 && (
              <div className="mt-2 text-right">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {(lot.sales_amount || 0).toLocaleString()} XAF vendus
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
