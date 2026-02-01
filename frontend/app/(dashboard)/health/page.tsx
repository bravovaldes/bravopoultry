'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  Syringe,
  AlertTriangle,
  Clock,
  Calendar,
  Bird,
  CheckCircle,
  ChevronRight,
  Pill,
  Stethoscope,
  FileText,
  Plus,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  HEALTH_EVENT_TYPES,
  COMMON_DISEASES,
} from '@/lib/constants'

export default function HealthPage() {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)

  // Get all active lots
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots'],
    queryFn: async () => {
      const response = await api.get('/lots?status=active')
      return response.data
    },
  })

  // Get upcoming vaccinations
  const { data: upcomingVaccinations, isLoading: vaccinationsLoading } = useQuery({
    queryKey: ['upcoming-vaccinations'],
    queryFn: async () => {
      const response = await api.get('/health/upcoming-vaccinations?days_ahead=30')
      return response.data
    },
  })

  // Get recent health events (we'll fetch for all lots)
  const lotIds = lots?.map((l: any) => l.id).join(',') || ''
  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['recent-health-events', lotIds],
    queryFn: async () => {
      // Fetch events for each active lot and combine
      if (!lots || lots.length === 0) return []

      const allEvents = await Promise.all(
        lots.slice(0, 10).map(async (lot: any) => {
          try {
            const response = await api.get(`/health/events?lot_id=${lot.id}`)
            return response.data.map((event: any) => ({
              ...event,
              lot_code: lot.code,
              lot_name: lot.name,
            }))
          } catch {
            return []
          }
        })
      )

      return allEvents
        .flat()
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    },
    enabled: !!lots && lots.length > 0,
  })

  // Separate overdue and upcoming
  const overdueVaccinations = upcomingVaccinations?.filter((v: any) => v.is_overdue) || []
  const scheduledVaccinations = upcomingVaccinations?.filter((v: any) => !v.is_overdue) || []

  // Get active withdrawal periods
  const activeWithdrawals = recentEvents?.filter((e: any) =>
    e.withdrawal_end_date && new Date(e.withdrawal_end_date) > new Date()
  ) || []

  if (lotsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sante & Vaccinations</h1>
          <p className="text-gray-500">Vue d'ensemble de la sante de vos elevages</p>
        </div>
      </div>

      {/* Alerts Section */}
      {(overdueVaccinations.length > 0 || activeWithdrawals.length > 0) && (
        <div className="space-y-3">
          {/* Overdue Vaccinations */}
          {overdueVaccinations.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Vaccinations en retard!</p>
                  <div className="mt-2 space-y-2">
                    {overdueVaccinations.map((v: any, i: number) => (
                      <Link
                        key={i}
                        href={`/lots/${v.lot_id}/health/record-vaccination?schedule_id=${v.schedule_id || ''}&vaccine=${encodeURIComponent(v.vaccine_name || '')}&disease=${encodeURIComponent(v.target_disease || '')}&route=${encodeURIComponent(v.route || 'water')}&day=${v.day_from || ''}`}
                        className="flex items-center justify-between bg-white/50 hover:bg-white rounded-lg p-2 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-red-700">{v.lot_code}</span>
                          <span className="text-red-600">-</span>
                          <span className="text-red-600">{v.vaccine_name}</span>
                          <span className="text-xs text-red-500">({v.target_disease})</span>
                        </div>
                        <span className="text-sm text-red-600 hover:text-red-700 font-medium">
                          Vacciner maintenant →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Withdrawals */}
          {activeWithdrawals.length > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Delais d'attente en cours</p>
                  <div className="mt-2 space-y-1">
                    {activeWithdrawals.map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-orange-700">
                        <span className="font-medium">{e.lot_code}</span>
                        <span>-</span>
                        <span>{e.product_name}</span>
                        <span className="text-orange-500">jusqu'au {formatDate(e.withdrawal_end_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Syringe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vaccinations a faire</p>
              <p className="text-2xl font-bold">{scheduledVaccinations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En retard</p>
              <p className="text-2xl font-bold text-red-600">{overdueVaccinations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Delais d'attente</p>
              <p className="text-2xl font-bold">{activeWithdrawals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bird className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bandes actives</p>
              <p className="text-2xl font-bold">{lots?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Vaccinations */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold">Vaccinations a venir</h2>
            </div>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {vaccinationsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500 mx-auto"></div>
              </div>
            ) : scheduledVaccinations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <p>Toutes les vaccinations sont a jour!</p>
              </div>
            ) : (
              scheduledVaccinations.map((v: any, i: number) => (
                <Link
                  key={i}
                  href={`/lots/${v.lot_id}/health/record-vaccination?schedule_id=${v.schedule_id || ''}&vaccine=${encodeURIComponent(v.vaccine_name || '')}&disease=${encodeURIComponent(v.target_disease || '')}&route=${encodeURIComponent(v.route || 'water')}&day=${v.day_from || ''}`}
                  className="block p-4 hover:bg-blue-50 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{v.vaccine_name}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          J{v.day_from}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {v.lot_code} - {v.target_disease}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 font-medium">Enregistrer</span>
                      <ChevronRight className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Health Events */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold">Evenements recents</h2>
            </div>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {eventsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mx-auto"></div>
              </div>
            ) : !recentEvents || recentEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Aucun evenement recent</p>
              </div>
            ) : (
              recentEvents.map((event: any, i: number) => {
                const eventType = HEALTH_EVENT_TYPES.find(t => t.value === event.event_type)
                return (
                  <div key={i} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{eventType?.icon || '📋'}</span>
                        <div>
                          <p className="font-medium">{event.product_name || eventType?.label}</p>
                          <p className="text-sm text-gray-500">
                            {event.lot_code}
                            {event.target_disease && ` - ${COMMON_DISEASES.find(d => d.value === event.target_disease)?.label || event.target_disease}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                        {event.cost && (
                          <p className="text-xs text-gray-400">{Number(event.cost).toLocaleString()} XAF</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Lots Quick Access */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Acces rapide par bande</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          {lots?.map((lot: any) => (
            <Link
              key={lot.id}
              href={`/lots/${lot.id}/health`}
              className="flex flex-col items-center gap-2 p-4 border rounded-xl hover:bg-orange-50 hover:border-orange-200 transition text-center"
            >
              <div className={cn(
                "p-2 rounded-lg",
                lot.type === 'broiler' ? 'bg-blue-100' : 'bg-orange-100'
              )}>
                <Bird className={cn(
                  "w-5 h-5",
                  lot.type === 'broiler' ? 'text-blue-600' : 'text-orange-600'
                )} />
              </div>
              <div>
                <p className="font-medium text-sm">{lot.name || lot.code}</p>
                <p className="text-xs text-gray-500">J{lot.age_days}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
