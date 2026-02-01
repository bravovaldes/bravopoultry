'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Plus,
  Filter,
  AlertTriangle,
  BarChart3,
  X,
  Pencil,
  Clock,
  Moon,
} from 'lucide-react'
import { cn, formatDate, getTodayInTimezone } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'

type FilterPeriod = '24h' | '7d' | '30d'

export default function EnvironmentPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<FilterPeriod>('7d')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLightModal, setShowLightModal] = useState(false)

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch buildings
  const { data: buildings } = useQuery({
    queryKey: ['buildings', selectedSiteId],
    queryFn: async () => {
      const url = selectedSiteId !== 'all' ? `/buildings?site_id=${selectedSiteId}` : '/buildings'
      const response = await api.get(url)
      return response.data
    },
  })

  // Mock environment data
  const envData = [
    { date: '2026-01-22', time: '06:00', temp: 28, humidity: 65, nh3: 12, co2: 2100 },
    { date: '2026-01-22', time: '12:00', temp: 32, humidity: 55, nh3: 15, co2: 2400 },
    { date: '2026-01-22', time: '18:00', temp: 30, humidity: 60, nh3: 18, co2: 2600 },
    { date: '2026-01-23', time: '06:00', temp: 27, humidity: 68, nh3: 10, co2: 2000 },
    { date: '2026-01-23', time: '12:00', temp: 33, humidity: 52, nh3: 16, co2: 2500 },
    { date: '2026-01-23', time: '18:00', temp: 31, humidity: 58, nh3: 19, co2: 2700 },
    { date: '2026-01-24', time: '06:00', temp: 26, humidity: 70, nh3: 11, co2: 1900 },
    { date: '2026-01-24', time: '12:00', temp: 34, humidity: 50, nh3: 20, co2: 2800 },
    { date: '2026-01-24', time: '18:00', temp: 29, humidity: 62, nh3: 17, co2: 2500 },
    { date: '2026-01-25', time: '06:00', temp: 28, humidity: 66, nh3: 13, co2: 2100 },
    { date: '2026-01-25', time: '12:00', temp: 31, humidity: 54, nh3: 14, co2: 2300 },
    { date: '2026-01-25', time: '18:00', temp: 30, humidity: 59, nh3: 16, co2: 2400 },
  ]

  // Current conditions (latest reading)
  const current = envData[envData.length - 1]

  // Calculate stats
  const stats = {
    avgTemp: envData.reduce((sum, e) => sum + e.temp, 0) / envData.length,
    minTemp: Math.min(...envData.map(e => e.temp)),
    maxTemp: Math.max(...envData.map(e => e.temp)),
    avgHumidity: envData.reduce((sum, e) => sum + e.humidity, 0) / envData.length,
    avgNh3: envData.reduce((sum, e) => sum + e.nh3, 0) / envData.length,
    avgCo2: envData.reduce((sum, e) => sum + e.co2, 0) / envData.length,
  }

  // Alerts
  const alerts = []
  if (stats.maxTemp > 32) alerts.push({ type: 'temp', message: 'Temperature elevee detectee' })
  if (stats.avgNh3 > 20) alerts.push({ type: 'nh3', message: 'Niveau NH3 eleve' })
  if (stats.avgCo2 > 3000) alerts.push({ type: 'co2', message: 'Niveau CO2 eleve' })

  // Chart data
  const chartData = envData.map(e => ({
    datetime: `${e.date.slice(5)} ${e.time}`,
    temperature: e.temp,
    humidite: e.humidity,
  }))

  const airQualityData = envData.map(e => ({
    datetime: `${e.date.slice(5)} ${e.time}`,
    nh3: e.nh3,
    co2: e.co2 / 100, // Scale down for display
  }))

  // Lighting program
  const lightProgram = {
    current_phase: 'Croissance',
    light_hours: 18,
    dark_hours: 6,
    intensity: 20, // lux
    schedule: [
      { start: '05:00', end: '23:00', intensity: 20 },
    ],
  }

  const getTempStatus = (temp: number) => {
    if (temp < 20) return { status: 'cold', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (temp > 32) return { status: 'hot', color: 'text-red-600', bg: 'bg-red-100' }
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-100' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environnement & Ambiance</h1>
          <p className="text-gray-500">Suivi temperature, humidite et qualite de l'air</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowLightModal(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Sun className="w-4 h-4" />
            Programme lumineux
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Ajouter releve
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Alertes environnement</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert, idx) => (
              <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                {alert.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedBuildingId('all')
            }}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les batiments</option>
            {buildings?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            {(['24h', '7d', '30d'] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition",
                  period === p
                    ? "bg-teal-100 text-teal-700 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn("rounded-xl border p-4", getTempStatus(current.temp).bg)}>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className={cn("w-5 h-5", getTempStatus(current.temp).color)} />
            <p className="text-sm text-gray-600">Temperature</p>
          </div>
          <p className={cn("text-3xl font-bold", getTempStatus(current.temp).color)}>{current.temp}°C</p>
          <p className="text-xs text-gray-500 mt-1">Min: {stats.minTemp}° | Max: {stats.maxTemp}°</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Humidite</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{current.humidity}%</p>
          <p className="text-xs text-gray-500 mt-1">Moyenne: {stats.avgHumidity.toFixed(0)}%</p>
        </div>

        <div className={cn("rounded-xl border p-4", current.nh3 > 20 ? "bg-amber-50" : "bg-white")}>
          <div className="flex items-center gap-2 mb-2">
            <Wind className={cn("w-5 h-5", current.nh3 > 20 ? "text-amber-600" : "text-gray-600")} />
            <p className="text-sm text-gray-500">Ammoniac (NH3)</p>
          </div>
          <p className={cn("text-3xl font-bold", current.nh3 > 20 ? "text-amber-600" : "text-gray-900")}>
            {current.nh3} ppm
          </p>
          <p className="text-xs text-gray-500 mt-1">Seuil: &lt; 20 ppm</p>
        </div>

        <div className={cn("rounded-xl border p-4", current.co2 > 3000 ? "bg-amber-50" : "bg-white")}>
          <div className="flex items-center gap-2 mb-2">
            <Wind className={cn("w-5 h-5", current.co2 > 3000 ? "text-amber-600" : "text-gray-600")} />
            <p className="text-sm text-gray-500">CO2</p>
          </div>
          <p className={cn("text-3xl font-bold", current.co2 > 3000 ? "text-amber-600" : "text-gray-900")}>
            {current.co2} ppm
          </p>
          <p className="text-xs text-gray-500 mt-1">Seuil: &lt; 3000 ppm</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Temperature & Humidity */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-teal-600" />
            Temperature & Humidite
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="datetime" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="temp" tick={{ fontSize: 11 }} domain={[20, 40]} />
                <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 11 }} domain={[40, 80]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="hum" type="monotone" dataKey="humidite" name="Humidite (%)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Air Quality */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5 text-purple-600" />
            Qualite de l'air
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={airQualityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="datetime" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number, name: string) => [
                  name === 'co2' ? `${(value * 100).toFixed(0)} ppm` : `${value} ppm`,
                  name === 'co2' ? 'CO2' : 'NH3'
                ]} />
                <Legend />
                <Area type="monotone" dataKey="nh3" name="NH3 (ppm)" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" />
                <Area type="monotone" dataKey="co2" name="CO2 (x100 ppm)" fill="#8b5cf6" fillOpacity={0.3} stroke="#8b5cf6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lighting Program Card */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-500" />
          Programme lumineux actuel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <Sun className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{lightProgram.light_hours}h</p>
            <p className="text-sm text-gray-500">Lumiere</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg text-center">
            <Moon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-700">{lightProgram.dark_hours}h</p>
            <p className="text-sm text-gray-500">Obscurite</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg text-center">
            <Sun className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{lightProgram.intensity} lux</p>
            <p className="text-sm text-gray-500">Intensite</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-blue-600">05:00 - 23:00</p>
            <p className="text-sm text-gray-500">Horaires</p>
          </div>
        </div>
      </div>

      {/* Temperature Guidelines */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold mb-4">Recommandations temperature par age</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Age</th>
                <th className="text-center p-3 font-medium">Temp. recommandee</th>
                <th className="text-center p-3 font-medium">Humidite</th>
                <th className="text-left p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-3 font-medium">J1-J3</td>
                <td className="p-3 text-center">32-34°C</td>
                <td className="p-3 text-center">60-70%</td>
                <td className="p-3 text-gray-500">Chauffage maximal</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">J4-J7</td>
                <td className="p-3 text-center">30-32°C</td>
                <td className="p-3 text-center">60-65%</td>
                <td className="p-3 text-gray-500">Reduction progressive</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">J8-J14</td>
                <td className="p-3 text-center">28-30°C</td>
                <td className="p-3 text-center">55-65%</td>
                <td className="p-3 text-gray-500">-</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">J15-J21</td>
                <td className="p-3 text-center">26-28°C</td>
                <td className="p-3 text-center">55-65%</td>
                <td className="p-3 text-gray-500">-</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">J22+</td>
                <td className="p-3 text-center">22-26°C</td>
                <td className="p-3 text-center">50-60%</td>
                <td className="p-3 text-gray-500">Temperature ambiante</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddEnvModal
          buildings={buildings}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
          }}
        />
      )}

      {/* Light Modal */}
      {showLightModal && (
        <LightProgramModal
          program={lightProgram}
          onClose={() => setShowLightModal(false)}
        />
      )}
    </div>
  )
}

// Add Environment Modal
function AddEnvModal({ buildings, onClose, onSuccess }: { buildings: any[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    building_id: '',
    temperature: '',
    humidity: '',
    nh3: '',
    co2: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ajouter releve environnement</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker value={formData.date} onChange={(date) => setFormData({ ...formData, date })} showShortcuts={false} maxDate={new Date()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batiment</label>
            <select value={formData.building_id} onChange={(e) => setFormData({ ...formData, building_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
              <option value="">Selectionner</option>
              {buildings?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input type="number" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required step="any" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Humidite (%)</label>
              <input type="number" value={formData.humidity} onChange={(e) => setFormData({ ...formData, humidity: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required min="0" max="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NH3 (ppm) - opt.</label>
              <input type="number" value={formData.nh3} onChange={(e) => setFormData({ ...formData, nh3: e.target.value })} className="w-full px-3 py-2 border rounded-lg" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CO2 (ppm) - opt.</label>
              <input type="number" value={formData.co2} onChange={(e) => setFormData({ ...formData, co2: e.target.value })} className="w-full px-3 py-2 border rounded-lg" min="0" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Light Program Modal
function LightProgramModal({ program, onClose }: { program: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Programme lumineux</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium mb-3">Programme recommande par phase</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>J1-J3 (Demarrage)</span>
                <span className="font-medium">23h lumiere / 1h obscurite - 30 lux</span>
              </div>
              <div className="flex justify-between">
                <span>J4-J7</span>
                <span className="font-medium">20h lumiere / 4h obscurite - 20 lux</span>
              </div>
              <div className="flex justify-between">
                <span>J8-J21 (Croissance)</span>
                <span className="font-medium">18h lumiere / 6h obscurite - 15 lux</span>
              </div>
              <div className="flex justify-between">
                <span>J22+ (Finition)</span>
                <span className="font-medium">18h lumiere / 6h obscurite - 10 lux</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Pondeuses</h3>
            <p className="text-sm text-gray-600">
              16-17h de lumiere pour stimuler la ponte. Augmenter progressivement a partir de la semaine 18.
            </p>
          </div>
        </div>
        <div className="p-4 border-t">
          <button onClick={onClose} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
