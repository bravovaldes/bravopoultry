'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Syringe, Pill, Stethoscope, Calendar, CheckCircle, AlertTriangle, Clock, FileText, CalendarDays, ChevronRight, X, Sparkles, PenLine, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  HEALTH_EVENT_TYPES,
  ADMINISTRATION_ROUTES,
  COMMON_DISEASES,
  COMMON_VACCINES,
  COMMON_SYMPTOMS,
  VACCINATION_PROGRAMS,
} from '@/lib/constants'

type TabType = 'calendar' | 'vaccination' | 'treatment' | 'observation'

export default function HealthPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const lotId = params.id as string

  const [activeTab, setActiveTab] = useState<TabType>('calendar')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<string>('')

  // Lock body scroll when form modal is open
  useBodyScrollLock(showForm)

  const { data: lot, isLoading: lotLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  const { data: healthEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['health-events', lotId],
    queryFn: async () => {
      const response = await api.get(`/health/events?lot_id=${lotId}`)
      return response.data
    },
  })

  const { data: upcomingVaccinations } = useQuery({
    queryKey: ['upcoming-vaccinations', lotId],
    queryFn: async () => {
      const response = await api.get(`/health/upcoming-vaccinations`)
      return response.data.filter((v: any) => v.lot_id === lotId)
    },
  })

  const tabs = [
    { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { id: 'vaccination', label: 'Vaccinations', icon: Syringe },
    { id: 'treatment', label: 'Traitements', icon: Pill },
    { id: 'observation', label: 'Observations', icon: Stethoscope },
  ]

  const openForm = (type: string) => {
    setFormType(type)
    setShowForm(true)
  }

  if (lotLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-3 max-w-5xl">
      {/* Header compact */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/lots/${lotId}`}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sante & Vaccinations</h1>
            <p className="text-sm text-gray-500">{lot?.code} - J{lot?.age_days}</p>
          </div>
        </div>
      </div>

      {/* Upcoming Vaccinations Alert */}
      {upcomingVaccinations && upcomingVaccinations.length > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-yellow-800 text-sm">Vaccinations a venir</p>
              <div className="mt-1.5 space-y-1">
                {upcomingVaccinations.slice(0, 3).map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-700">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{v.vaccine_name}</span>
                    <span>-</span>
                    <span>{v.target_disease}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      v.is_overdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    )}>
                      {v.is_overdue ? 'En retard!' : `J${v.day_from}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-lg border p-1.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType)
              setShowForm(false)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap text-sm",
              activeTab === tab.id
                ? "bg-orange-100 text-orange-700"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'calendar' && (
        <CalendarTab
          lotId={lotId}
          lot={lot}
          events={healthEvents?.filter((e: any) => e.event_type === 'vaccination') || []}
          loading={eventsLoading}
          onSwitchToVaccination={() => {
            setActiveTab('vaccination')
            setShowForm(true)
            setFormType('vaccination')
          }}
        />
      )}

      {activeTab === 'vaccination' && (
        <VaccinationTab
          lotId={lotId}
          lot={lot}
          events={healthEvents?.filter((e: any) => e.event_type === 'vaccination') || []}
        />
      )}

      {activeTab === 'treatment' && (
        <TreatmentTab
          lotId={lotId}
          lot={lot}
          events={healthEvents?.filter((e: any) => ['treatment', 'deworming', 'vitamin'].includes(e.event_type)) || []}
          showForm={showForm && formType === 'treatment'}
          onOpenForm={() => openForm('treatment')}
          onCloseForm={() => setShowForm(false)}
        />
      )}

      {activeTab === 'observation' && (
        <ObservationTab
          lotId={lotId}
          lot={lot}
          events={healthEvents?.filter((e: any) => e.event_type === 'vet_visit') || []}
          showForm={showForm && formType === 'observation'}
          onOpenForm={() => openForm('observation')}
          onCloseForm={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// Calendar Tab Component - Shows vaccination schedule
function CalendarTab({
  lotId,
  lot,
  events,
  loading,
  onSwitchToVaccination
}: {
  lotId: string
  lot: any
  events: any[]
  loading: boolean
  onSwitchToVaccination: () => void
}) {
  const queryClient = useQueryClient()
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [customMode, setCustomMode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    day_from: '',
    vaccine_name: '',
    target_disease: '',
    route: 'water',
    notes: '',
  })
  const router = useRouter()

  // Fetch lot's vaccination schedules from database
  const { data: lotSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['lot-vaccination-schedules', lotId],
    queryFn: async () => {
      const response = await api.get(`/health/lots/${lotId}/vaccination-schedules`)
      return response.data
    },
  })

  // Get programs for this lot type
  const availablePrograms = VACCINATION_PROGRAMS.filter(
    p => p.lot_type === lot?.type
  )

  // Get current program from database schedules
  const currentProgramId = lotSchedules?.[0]?.program_id || null

  // Find the selected program details
  const selectedProgram = currentProgramId ? VACCINATION_PROGRAMS.find(p => p.id === currentProgramId) : null

  // Apply program mutation
  const applyProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      const program = VACCINATION_PROGRAMS.find(p => p.id === programId)
      if (!program) throw new Error('Programme non trouve')

      const vaccinations = program.vaccinations.map(v => ({
        vaccine_name: v.vaccine,
        target_disease: v.disease,
        day_from: v.day,
        route: v.route,
        notes: v.note,
        is_mandatory: true,
      }))

      const response = await api.post('/health/vaccination-schedules/apply-program', {
        lot_id: lotId,
        program_id: programId,
        vaccinations,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-vaccination-schedules', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      toast.success('Programme applique')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    },
  })

  // Remove program mutation
  const removeProgramMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/health/lots/${lotId}/vaccination-schedules`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-vaccination-schedules', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      toast.success('Programme supprime')
    },
  })

  // Delete single schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await api.delete(`/health/vaccination-schedules/${scheduleId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-vaccination-schedules', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      toast.success('Vaccination supprimee du programme')
    },
  })

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, data }: { scheduleId: string; data: any }) => {
      const response = await api.put(`/health/vaccination-schedules/${scheduleId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-vaccination-schedules', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      setEditingSchedule(null)
      toast.success('Vaccination modifiee')
    },
  })

  // Add single schedule mutation (for custom programs)
  const addScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/health/vaccination-schedules', {
        ...data,
        lot_id: lotId,
        lot_type: lot?.type || null,
        program_id: 'custom',
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-vaccination-schedules', lotId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-vaccinations'] })
      setShowAddForm(false)
      setNewSchedule({
        day_from: '',
        vaccine_name: '',
        target_disease: '',
        route: 'water',
        notes: '',
      })
      toast.success('Vaccination planifiee ajoutee')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    },
  })

  // Find which vaccines have been done
  const getVaccineStatus = (vaccine: string, day: number) => {
    const done = events.find((e: any) =>
      e.product_name?.toLowerCase().includes(vaccine.toLowerCase())
    )
    if (done) return 'done'
    if (lot?.age_days >= day) return 'overdue'
    if (lot?.age_days >= day - 3) return 'due'
    return 'upcoming'
  }

  // Calculate date from placement date + day
  const getVaccinationDate = (day: number) => {
    if (!lot?.placement_date) return null
    const date = new Date(lot.placement_date)
    date.setDate(date.getDate() + day - (lot.age_at_placement || 1))
    return date
  }

  if (loading || schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  // No program selected yet AND not in custom mode - show choice screen
  if ((!lotSchedules || lotSchedules.length === 0) && !customMode) {
    return (
      <div className="space-y-4 lg:space-y-3">
        {/* Welcome message */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4 text-center">
          <CalendarDays className="w-10 h-10 text-blue-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Planifiez vos vaccinations
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Choisissez un programme predefini ou creez votre propre calendrier.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Option 1: Choose a predefined program */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Choisir un programme</h3>
                <p className="text-xs text-gray-500">Programmes predefinis</p>
              </div>
            </div>

            <div className="space-y-2">
              {availablePrograms.map((program) => (
                <button
                  key={program.id}
                  onClick={() => applyProgramMutation.mutate(program.id)}
                  disabled={applyProgramMutation.isPending}
                  className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition text-left disabled:opacity-50"
                >
                  <p className="font-medium text-gray-900 text-sm">{program.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{program.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                      {program.vaccinations.length} vaccinations
                    </span>
                    <span className="text-xs text-gray-400">
                      J1 - J{Math.max(...program.vaccinations.map(v => v.day))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Option 2: Create manually */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <PenLine className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Creer manuellement</h3>
                <p className="text-xs text-gray-500">Gerez vos vaccinations</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Ajoutez vos vaccinations une par une selon vos besoins.
            </p>

            <button
              onClick={() => setCustomMode(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-purple-600 transition"
            >
              <Plus className="w-5 h-5" />
              Creer mon calendrier
            </button>

            <p className="text-xs text-gray-400 text-center mt-2">
              Planifiez manuellement
            </p>
          </div>
        </div>

        {/* Already have vaccinations? */}
        {events.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-sm">Vaccinations effectuees ({events.length})</h3>
              </div>
              <button
                onClick={onSwitchToVaccination}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Voir tout
              </button>
            </div>
            <div className="divide-y">
              {events.slice(0, 5).map((event: any) => (
                <div key={event.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{event.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {COMMON_DISEASES.find(d => d.value === event.target_disease)?.label || event.target_disease || 'Non specifie'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Program selected OR custom mode - show calendar
  const schedules = lotSchedules || []
  const isCustomProgram = customMode || currentProgramId === 'custom'

  return (
    <div className="space-y-4 lg:space-y-3">
      {/* Add vaccination form modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Planifier une vaccination</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jour (age du lot)</label>
                <input
                  type="number"
                  value={newSchedule.day_from}
                  onChange={(e) => setNewSchedule({ ...newSchedule, day_from: e.target.value })}
                  placeholder="Ex: 7"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du vaccin</label>
                <input
                  type="text"
                  value={newSchedule.vaccine_name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, vaccine_name: e.target.value })}
                  placeholder="Ex: Hitchner B1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maladie ciblee</label>
                <select
                  value={newSchedule.target_disease}
                  onChange={(e) => setNewSchedule({ ...newSchedule, target_disease: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Selectionner...</option>
                  {COMMON_DISEASES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voie d'administration</label>
                <select
                  value={newSchedule.route}
                  onChange={(e) => setNewSchedule({ ...newSchedule, route: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {ADMINISTRATION_ROUTES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input
                  type="text"
                  value={newSchedule.notes}
                  onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                  placeholder="Ex: Rappel"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!newSchedule.day_from || !newSchedule.vaccine_name || !newSchedule.target_disease) {
                    toast.error('Veuillez remplir tous les champs obligatoires')
                    return
                  }
                  addScheduleMutation.mutate({
                    day_from: parseInt(newSchedule.day_from),
                    vaccine_name: newSchedule.vaccine_name,
                    target_disease: newSchedule.target_disease,
                    route: newSchedule.route,
                    notes: newSchedule.notes || null,
                    is_mandatory: true,
                  })
                }}
                disabled={addScheduleMutation.isPending}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {addScheduleMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program header */}
      <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Programme actif</p>
          <p className="font-semibold text-gray-900 text-sm">
            {selectedProgram?.name || 'Programme personnalise'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
          <button
            onClick={() => {
              if (isCustomProgram && schedules.length === 0) {
                setCustomMode(false)
              } else {
                removeProgramMutation.mutate()
              }
            }}
            disabled={removeProgramMutation.isPending}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isCustomProgram && schedules.length === 0 ? 'Retour' : 'Changer'}
          </button>
        </div>
      </div>

      {/* Vaccination Timeline - uses lotSchedules from database */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Calendrier de vaccination</h3>
          <span className="text-xs text-gray-500">{schedules.length} vaccinations</span>
        </div>

        {schedules.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-3">Aucune vaccination planifiee</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm"
            >
              <Plus className="w-5 h-5" />
              Ajouter une vaccination
            </button>
          </div>
        ) : (
        <div className="divide-y">
          {schedules.map((schedule: any) => {
            const status = getVaccineStatus(schedule.vaccine_name, schedule.day_from)
            const vaccinationDate = getVaccinationDate(schedule.day_from)
            const doneEvent = events.find((e: any) =>
              e.product_name?.toLowerCase().includes(schedule.vaccine_name.toLowerCase())
            )

            return (
              <div
                key={schedule.id}
                className={cn(
                  "p-3 flex items-center gap-3",
                  status === 'done' && "bg-green-50",
                  status === 'overdue' && "bg-red-50",
                  status === 'due' && "bg-yellow-50"
                )}
              >
                {/* Status indicator */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  status === 'done' && "bg-green-100",
                  status === 'overdue' && "bg-red-100",
                  status === 'due' && "bg-yellow-100",
                  status === 'upcoming' && "bg-gray-100"
                )}>
                  {status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : status === 'overdue' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <span className={cn(
                      "text-xs font-bold",
                      status === 'due' ? "text-yellow-600" : "text-gray-400"
                    )}>
                      J{schedule.day_from}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{schedule.vaccine_name}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">
                      {COMMON_DISEASES.find(d => d.value === schedule.target_disease)?.label || schedule.target_disease}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ADMINISTRATION_ROUTES.find(r => r.value === schedule.route)?.label}
                    {schedule.notes && ` - ${schedule.notes}`}
                  </p>
                  {vaccinationDate && (
                    <p className="text-xs text-gray-400">
                      {status === 'done' && doneEvent
                        ? `Fait le ${formatDate(doneEvent.date)}`
                        : `Prevu: ${formatDate(vaccinationDate.toISOString())}`
                      }
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {status === 'done' ? (
                    <span className="text-green-600 text-sm font-medium">Fait</span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            schedule_id: schedule.id,
                            vaccine: schedule.vaccine_name,
                            disease: schedule.target_disease,
                            route: schedule.route || 'water',
                            day: String(schedule.day_from),
                          })
                          router.push(`/lots/${lotId}/health/record-vaccination?${params.toString()}`)
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition",
                          status === 'overdue'
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : status === 'due'
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        Vacciner
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Supprimer cette vaccination du programme?')) {
                            deleteScheduleMutation.mutate(schedule.id)
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* Stats - only show when there are schedules */}
      {schedules.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border p-3 text-center">
            <p className="text-xl lg:text-2xl font-bold text-green-600">
              {schedules.filter((s: any) => getVaccineStatus(s.vaccine_name, s.day_from) === 'done').length}
            </p>
            <p className="text-xs text-gray-500">Realisees</p>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <p className="text-xl lg:text-2xl font-bold text-yellow-600">
              {schedules.filter((s: any) => ['due', 'upcoming'].includes(getVaccineStatus(s.vaccine_name, s.day_from))).length}
            </p>
            <p className="text-xs text-gray-500">A venir</p>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <p className="text-xl lg:text-2xl font-bold text-red-600">
              {schedules.filter((s: any) => getVaccineStatus(s.vaccine_name, s.day_from) === 'overdue').length}
            </p>
            <p className="text-xs text-gray-500">En retard</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Vaccination Tab Component - Historique des vaccinations effectuees
function VaccinationTab({
  lotId,
  lot,
  events,
}: {
  lotId: string
  lot: any
  events: any[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Historique des vaccinations</h3>
          <p className="text-xs text-gray-500">{events.length} vaccination(s) effectuee(s)</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Syringe className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune vaccination enregistree</p>
          <p className="text-xs text-gray-400 mt-1">
            Utilisez l'onglet Calendrier pour enregistrer vos vaccinations
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="font-medium">{event.product_name}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {COMMON_DISEASES.find(d => d.value === event.target_disease)?.label || event.target_disease || 'Non specifie'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                      {ADMINISTRATION_ROUTES.find(r => r.value === event.route)?.label || event.route}
                    </span>
                    {event.dose && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {event.dose}
                      </span>
                    )}
                    {event.batch_number && (
                      <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full">
                        Lot: {event.batch_number}
                      </span>
                    )}
                  </div>
                  {event.notes && (
                    <p className="text-xs text-gray-400 mt-2">{event.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">{formatDate(event.date)}</p>
                  {event.cost && (
                    <p className="text-sm text-orange-600">{Number(event.cost).toLocaleString()} FCFA</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Treatment Tab Component
function TreatmentTab({
  lotId,
  lot,
  events,
  showForm,
  onOpenForm,
  onCloseForm
}: {
  lotId: string
  lot: any
  events: any[]
  showForm: boolean
  onOpenForm: () => void
  onCloseForm: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    event_type: 'treatment',
    product_name: '',
    target_disease: '',
    route: 'water',
    dose: '',
    duration_days: '',
    withdrawal_days_meat: '',
    withdrawal_days_eggs: '',
    cost: '',
    notes: '',
  })

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/health/events', {
        lot_id: lotId,
        ...data,
        duration_days: data.duration_days ? parseInt(data.duration_days) : null,
        withdrawal_days_meat: data.withdrawal_days_meat ? parseInt(data.withdrawal_days_meat) : null,
        withdrawal_days_eggs: data.withdrawal_days_eggs ? parseInt(data.withdrawal_days_eggs) : null,
        cost: data.cost ? parseFloat(data.cost) : null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-events', lotId] })
      queryClient.invalidateQueries({ queryKey: ['recent-health-events'] })
      toast.success('Traitement enregistre')
      onCloseForm()
      setFormData({
        date: new Date().toISOString().split('T')[0],
        event_type: 'treatment',
        product_name: '',
        target_disease: '',
        route: 'water',
        dose: '',
        duration_days: '',
        withdrawal_days_meat: '',
        withdrawal_days_eggs: '',
        cost: '',
        notes: '',
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.product_name) {
      toast.error('Entrez le nom du produit')
      return
    }
    submitMutation.mutate(formData)
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-500" />
            Nouveau traitement
          </h3>

          {/* Type de traitement */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {HEALTH_EVENT_TYPES.filter(t => ['treatment', 'deworming', 'vitamin'].includes(t.value)).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, event_type: type.value }))}
                  className={cn(
                    "px-4 py-2 rounded-lg border transition flex items-center gap-2",
                    formData.event_type === type.value
                      ? "bg-purple-50 border-purple-300 text-purple-700"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date debut *</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Nom du medicament"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maladie traitee</label>
              <select
                value={formData.target_disease}
                onChange={(e) => setFormData(prev => ({ ...prev, target_disease: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Selectionnez</option>
                {COMMON_DISEASES.map((disease) => (
                  <option key={disease.value} value={disease.value}>
                    {disease.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voie d'administration</label>
              <select
                value={formData.route}
                onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {ADMINISTRATION_ROUTES.map((route) => (
                  <option key={route.value} value={route.value}>
                    {route.icon} {route.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posologie</label>
              <input
                type="text"
                value={formData.dose}
                onChange={(e) => setFormData(prev => ({ ...prev, dose: e.target.value }))}
                placeholder="Ex: 1ml/L pendant 5j"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duree (jours)</label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                min="1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delai viande (jours)</label>
              <input
                type="number"
                value={formData.withdrawal_days_meat}
                onChange={(e) => setFormData(prev => ({ ...prev, withdrawal_days_meat: e.target.value }))}
                min="0"
                placeholder="Temps d'attente"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delai oeufs (jours)</label>
              <input
                type="number"
                value={formData.withdrawal_days_eggs}
                onChange={(e) => setFormData(prev => ({ ...prev, withdrawal_days_eggs: e.target.value }))}
                min="0"
                placeholder="Temps d'attente"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cout (FCFA)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Symptomes observes, evolution..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCloseForm}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 bg-purple-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Enregistrer
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{events.length} traitement(s) enregistre(s)</p>
        <button
          onClick={onOpenForm}
          className="inline-flex items-center gap-2 bg-purple-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-600 text-sm"
        >
          <Plus className="w-5 h-5" />
          Ajouter traitement
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Pill className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun traitement enregistre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{HEALTH_EVENT_TYPES.find(t => t.value === event.event_type)?.icon}</span>
                    <p className="font-medium">{event.product_name}</p>
                  </div>
                  {event.target_disease && (
                    <p className="text-sm text-gray-500">
                      {COMMON_DISEASES.find(d => d.value === event.target_disease)?.label}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {event.duration_days && `${event.duration_days}j - `}
                    {event.dose}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                  {event.cost && (
                    <p className="text-sm font-medium">{Number(event.cost).toLocaleString()} FCFA</p>
                  )}
                </div>
              </div>
              {event.withdrawal_end_date && new Date(event.withdrawal_end_date) > new Date() && (
                <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2 text-orange-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Delai d'attente jusqu'au {formatDate(event.withdrawal_end_date)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Observation Tab Component
function ObservationTab({
  lotId,
  lot,
  events,
  showForm,
  onOpenForm,
  onCloseForm
}: {
  lotId: string
  lot: any
  events: any[]
  showForm: boolean
  onOpenForm: () => void
  onCloseForm: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    veterinarian_name: '',
    veterinarian_phone: '',
    target_disease: '',
    cost: '',
    notes: '',
    reminder_date: '',
  })
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const notes = selectedSymptoms.length > 0
        ? `Symptomes: ${selectedSymptoms.map(s => COMMON_SYMPTOMS.find(cs => cs.value === s)?.label).join(', ')}. ${data.notes || ''}`
        : data.notes

      const response = await api.post('/health/events', {
        lot_id: lotId,
        event_type: 'vet_visit',
        product_name: 'Visite veterinaire',
        ...data,
        notes,
        cost: data.cost ? parseFloat(data.cost) : null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-events', lotId] })
      queryClient.invalidateQueries({ queryKey: ['recent-health-events'] })
      toast.success('Visite enregistree')
      onCloseForm()
      setFormData({
        date: new Date().toISOString().split('T')[0],
        veterinarian_name: '',
        veterinarian_phone: '',
        target_disease: '',
        cost: '',
        notes: '',
        reminder_date: '',
      })
      setSelectedSymptoms([])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate(formData)
  }

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-500" />
            Visite veterinaire / Observation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veterinaire</label>
              <input
                type="text"
                value={formData.veterinarian_name}
                onChange={(e) => setFormData(prev => ({ ...prev, veterinarian_name: e.target.value }))}
                placeholder="Nom du veterinaire"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input
                type="tel"
                value={formData.veterinarian_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, veterinarian_phone: e.target.value }))}
                placeholder="Numero"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic</label>
              <select
                value={formData.target_disease}
                onChange={(e) => setFormData(prev => ({ ...prev, target_disease: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selectionnez</option>
                {COMMON_DISEASES.map((disease) => (
                  <option key={disease.value} value={disease.value}>
                    {disease.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cout consultation (FCFA)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine visite</label>
              <DatePicker
                value={formData.reminder_date}
                onChange={(date) => setFormData(prev => ({ ...prev, reminder_date: date }))}
                showShortcuts={false}
              />
            </div>
          </div>

          {/* Symptoms */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Symptomes observes</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <button
                  key={symptom.value}
                  type="button"
                  onClick={() => toggleSymptom(symptom.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm transition flex items-center gap-1",
                    selectedSymptoms.includes(symptom.value)
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span>{symptom.icon}</span>
                  <span>{symptom.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Recommandations</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Observations, recommandations du veterinaire..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCloseForm}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Enregistrer
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{events.length} visite(s) enregistree(s)</p>
        <button
          onClick={onOpenForm}
          className="inline-flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 text-sm"
        >
          <Plus className="w-5 h-5" />
          Ajouter visite
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune visite enregistree</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">Visite veterinaire</p>
                  {event.veterinarian_name && (
                    <p className="text-sm text-gray-500">Dr. {event.veterinarian_name}</p>
                  )}
                  {event.target_disease && (
                    <p className="text-sm text-blue-600 mt-1">
                      Diagnostic: {COMMON_DISEASES.find(d => d.value === event.target_disease)?.label}
                    </p>
                  )}
                  {event.notes && (
                    <p className="text-sm text-gray-500 mt-2">{event.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                  {event.cost && (
                    <p className="text-sm font-medium">{Number(event.cost).toLocaleString()} FCFA</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
