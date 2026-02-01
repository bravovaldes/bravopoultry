'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import {
  Wheat,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Package,
  Gauge,
  Clock,
  X,
  Plus,
  Settings,
  PackagePlus,
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts'

// Environment data (no backend sensors yet - using defaults)
const defaultEnvironmentData = {
  current: {
    temperature: 28.5,
    humidity: 62,
    nh3: 18,
    co2: 2100,
    lightIntensity: 85,
  },
  optimal: {
    temperature: { min: 26, max: 30 },
    humidity: { min: 50, max: 70 },
    nh3: { max: 25 },
    co2: { max: 3000 },
  },
  hourlyTrend: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    temperature: 26 + Math.random() * 4,
    humidity: 55 + Math.random() * 15,
  })),
  lightProgram: {
    lightOn: '05:00',
    lightOff: '21:00',
    intensity: 85,
    duration: 16,
  },
}

const TEMP_GUIDE = [
  { age: '0-3 jours', temp: '32-33°C' },
  { age: '4-7 jours', temp: '30-31°C' },
  { age: '2 semaines', temp: '28-29°C' },
  { age: '3 semaines', temp: '26-27°C' },
  { age: '4+ semaines', temp: '22-24°C' },
]

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('feed')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all')
  const [selectedLot, setSelectedLot] = useState<string>('all')
  const [showAddFeedModal, setShowAddFeedModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showLightProgramModal, setShowLightProgramModal] = useState(false)
  const [lotSearch, setLotSearch] = useState('')

  // Lock body scroll when any modal is open
  useBodyScrollLock(showAddFeedModal || showRestockModal || showLightProgramModal)

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch buildings (filtered by site)
  const { data: buildings } = useQuery({
    queryKey: ['buildings', selectedSiteId],
    queryFn: async () => {
      const url = selectedSiteId !== 'all'
        ? `/buildings?site_id=${selectedSiteId}`
        : '/buildings'
      const response = await api.get(url)
      return response.data
    },
  })

  // Fetch lots (filtered by site/building)
  const { data: lots } = useQuery({
    queryKey: ['lots', selectedSiteId, selectedBuildingId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('status', 'active')
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedBuildingId !== 'all') params.append('building_id', selectedBuildingId)
      const response = await api.get(`/lots?${params.toString()}`)
      return response.data
    },
  })

  // Filter lots based on search
  const filteredLots = (lots || []).filter((lot: any) => {
    if (!lotSearch) return true
    const search = lotSearch.toLowerCase()
    return (
      lot.code?.toLowerCase().includes(search) ||
      lot.name?.toLowerCase().includes(search) ||
      lot.breed?.toLowerCase().includes(search) ||
      lot.building_name?.toLowerCase().includes(search) ||
      lot.site_name?.toLowerCase().includes(search)
    )
  })

  // Fetch monitoring stats from backend
  const { data: monitoringStats, isLoading: statsLoading } = useQuery({
    queryKey: ['monitoring-stats', selectedLot],
    queryFn: async () => {
      const params = selectedLot !== 'all' ? { lot_id: selectedLot, days: 7 } : { days: 7 }
      const response = await api.get('/feed/monitoring/stats', { params })
      return response.data
    },
  })

  // Fetch stock stats
  const { data: stockStats } = useQuery({
    queryKey: ['feed-stock-stats'],
    queryFn: async () => {
      const response = await api.get('/feed/stock/stats')
      return response.data
    },
  })

  // Build feed data from backend - optimal is now dynamic based on lot age
  const optimalFeedG = monitoringStats?.summary?.optimal_feed_g || 138
  const optimalWaterMl = monitoringStats?.summary?.optimal_water_ml || 276
  const lotAgeDays = monitoringStats?.summary?.lot_age_days
  const lotType = monitoringStats?.summary?.lot_type || 'broiler'

  const feed = {
    dailyConsumption: monitoringStats?.summary?.daily_feed_per_bird_g || 0,
    optimalConsumption: optimalFeedG,
    totalStock: stockStats?.total_quantity_kg || 0,
    stockAlert: 500,
    conversionRate: 1.72, // TODO: Calculate from weights
    weeklyTrend: monitoringStats?.daily_trend?.map((d: any) => ({
      day: d.day,
      consumption: d.feed_g_bird || 0,
      optimal: d.optimal_feed_g || optimalFeedG,
    })) || [],
    byType: monitoringStats?.stock_by_type?.map((s: any) => ({
      name: s.name === 'Starter' ? 'Demarrage' :
            s.name === 'Grower' ? 'Croissance' :
            s.name === 'Finisher' ? 'Finition' :
            s.name === 'Layer' ? 'Pondeuse' : s.name,
      stock: s.stock_kg || 0,
      consumption: 0,
      unit: 'kg'
    })) || [],
    daysAutonomy: monitoringStats?.summary?.days_autonomy || 0,
    lotAgeDays,
    lotType,
  }

  // Build water data from backend
  const water = {
    dailyConsumption: monitoringStats?.summary?.daily_water_per_bird_ml || 0,
    optimalConsumption: optimalWaterMl,
    waterFeedRatio: monitoringStats?.summary?.water_feed_ratio || 0,
    optimalRatio: monitoringStats?.summary?.optimal_ratio || { min: 1.8, max: 2.1 },
    weeklyTrend: monitoringStats?.daily_trend?.map((d: any) => ({
      day: d.day,
      water: d.water_ml_bird || 0,
      feed: d.feed_g_bird || 0,
      ratio: d.ratio || 0,
      optimalWater: d.optimal_water_ml || optimalWaterMl,
      optimalFeed: d.optimal_feed_g || optimalFeedG,
    })) || [],
  }

  const environment = defaultEnvironmentData

  // Status checks
  const isRatioNormal = water.waterFeedRatio >= water.optimalRatio.min && water.waterFeedRatio <= water.optimalRatio.max
  const isTempNormal = environment.current.temperature >= environment.optimal.temperature.min && environment.current.temperature <= environment.optimal.temperature.max
  const isHumidityNormal = environment.current.humidity >= environment.optimal.humidity.min && environment.current.humidity <= environment.optimal.humidity.max
  const isNH3Normal = environment.current.nh3 <= environment.optimal.nh3.max
  const isCO2Normal = environment.current.co2 <= environment.optimal.co2.max

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi technique</h1>
          <p className="text-gray-500">Alimentation, eau et environnement</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedBuildingId('all')
              setSelectedLot('all')
            }}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          {/* Building filter */}
          <select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value)
              setSelectedLot('all')
            }}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les batiments</option>
            {buildings?.filter((b: any) => selectedSiteId === 'all' || b.site_id === selectedSiteId)
              .map((building: any) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>

          {/* Lot filter with search */}
          <div className="flex items-center gap-2">
            {lots?.length > 5 && (
              <input
                type="text"
                placeholder="Rechercher lot..."
                value={lotSearch}
                onChange={(e) => setLotSearch(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm w-32"
              />
            )}
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              size={filteredLots.length > 5 ? 3 : 1}
            >
              <option value="all">Tous les lots</option>
              {filteredLots.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} {lot.building_name ? `· ${lot.building_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feed" onChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="feed" icon={Wheat}>Alimentation</TabsTrigger>
          <TabsTrigger value="water" icon={Droplets}>Eau</TabsTrigger>
          <TabsTrigger value="environment" icon={Thermometer}>Environnement</TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
            </div>
          ) : (
          <>
          {/* Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              title="Consommation/jour"
              value={`${feed.dailyConsumption.toFixed(0)} g/sujet`}
              subtitle={`Optimal: ${feed.optimalConsumption}g${feed.lotAgeDays ? ` (J${feed.lotAgeDays})` : ''}`}
              icon={Wheat}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Stock total"
              value={`${formatNumber(feed.totalStock)} kg`}
              subtitle={feed.totalStock < feed.stockAlert ? 'Stock bas!' : `${feed.daysAutonomy.toFixed(0)} jours autonomie`}
              icon={Package}
              iconBg={feed.totalStock < feed.stockAlert ? 'bg-red-100' : 'bg-green-100'}
              iconColor={feed.totalStock < feed.stockAlert ? 'text-red-600' : 'text-green-600'}
            />
            <StatCard
              title="Autonomie"
              value={`${feed.daysAutonomy.toFixed(0)} jours`}
              subtitle="Basee sur conso moyenne"
              icon={Clock}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Efficacite"
              value={feed.dailyConsumption > 0 ? `${((feed.dailyConsumption / feed.optimalConsumption) * 100).toFixed(0)}%` : '-'}
              subtitle={feed.dailyConsumption > feed.optimalConsumption ? 'Surconsommation' : feed.dailyConsumption > 0 ? 'Sous la cible' : 'Aucune donnee'}
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </StatCardGrid>

          {/* Charts & Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Consumption Trend */}
            <div className="bg-white p-4 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Consommation hebdomadaire</h3>
                  {feed.lotAgeDays && (
                    <p className="text-xs text-gray-500">
                      Cible: {feed.optimalConsumption}g/jour ({feed.lotType === 'layer' ? 'Pondeuse' : 'Chair'} J{feed.lotAgeDays})
                    </p>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={feed.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="consumption" name="Consommation (g)" fill="#f59e0b" />
                  <Line type="monotone" dataKey="optimal" name="Optimal" stroke="#22c55e" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Stock by Type */}
            <div className="bg-white p-4 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Stock par type d'aliment</h3>
                <Link
                  href="/monitoring/stock"
                  className="flex items-center gap-1 text-sm text-green-600 hover:underline font-medium"
                >
                  <PackagePlus className="w-4 h-4" /> Gerer le stock
                </Link>
              </div>
              <div className="space-y-4">
                {feed.byType.map((type: { name: string; stock: number; consumption: number }) => {
                  const percentage = (type.stock / feed.totalStock) * 100
                  const isLow = type.stock < 300
                  return (
                    <div key={type.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{type.name}</span>
                        <span className={cn("text-sm", isLow ? "text-red-600" : "text-gray-600")}>
                          {formatNumber(type.stock)} kg
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", isLow ? "bg-red-500" : "bg-amber-500")}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {type.consumption > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Consommation: {type.consumption} kg/jour - Autonomie: {Math.floor(type.stock / type.consumption)} jours
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </>
          )}
        </TabsContent>

        {/* Water Tab */}
        <TabsContent value="water" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
          ) : (
          <>
          {/* Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              title="Consommation eau"
              value={`${water.dailyConsumption.toFixed(0)} ml/sujet`}
              icon={Droplets}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Ratio eau/aliment"
              value={water.waterFeedRatio > 0 ? water.waterFeedRatio.toFixed(2) : '-'}
              subtitle={`Normal: ${water.optimalRatio.min}-${water.optimalRatio.max}`}
              icon={Gauge}
              iconBg={isRatioNormal ? "bg-green-100" : "bg-amber-100"}
              iconColor={isRatioNormal ? "text-green-600" : "text-amber-600"}
            />
            <StatCard
              title="Statut"
              value={water.waterFeedRatio === 0 ? "Pas de donnees" : isRatioNormal ? "Normal" : "A surveiller"}
              icon={isRatioNormal ? CheckCircle : AlertTriangle}
              iconBg={isRatioNormal ? "bg-green-100" : "bg-amber-100"}
              iconColor={isRatioNormal ? "text-green-600" : "text-amber-600"}
            />
            <StatCard
              title="Consommation aliment"
              value={`${feed.dailyConsumption.toFixed(0)} g/sujet`}
              icon={Wheat}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </StatCardGrid>

          {/* Chart */}
          <div className="bg-white p-4 rounded-xl border">
            <h3 className="font-semibold mb-4">Evolution eau/aliment</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={water.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[1.5, 2.5]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="water" name="Eau (ml)" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="feed" name="Aliment (g)" fill="#f59e0b" />
                <Line yAxisId="right" type="monotone" dataKey="ratio" name="Ratio" stroke="#22c55e" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Guide d'interpretation du ratio</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white rounded-lg">
                <p className="font-medium text-green-700">Ratio 1.8 - 2.1</p>
                <p className="text-gray-600">Normal - Bonne hydratation</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="font-medium text-amber-700">Ratio &gt; 2.1</p>
                <p className="text-gray-600">Surconsommation - Verifier temperature, stress</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="font-medium text-red-700">Ratio &lt; 1.8</p>
                <p className="text-gray-600">Sous-consommation - Verifier acces eau, maladie</p>
              </div>
            </div>
          </div>
          </>
          )}
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="environment" className="space-y-6">
          {/* Info banner - no sensors connected */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Donnees de demonstration</p>
                <p className="text-sm text-amber-700 mt-1">
                  Les capteurs d'environnement (temperature, humidite, NH3, CO2) ne sont pas encore connectes au systeme.
                  Les valeurs affichees sont des exemples. Contactez le support pour integrer vos capteurs IoT.
                </p>
              </div>
            </div>
          </div>

          {/* Current Stats */}
          <StatCardGrid columns={5}>
            <StatCard
              title="Temperature"
              value={`${environment.current.temperature}°C`}
              subtitle={`${environment.optimal.temperature.min}-${environment.optimal.temperature.max}°C`}
              icon={Thermometer}
              iconBg={isTempNormal ? "bg-green-100" : "bg-red-100"}
              iconColor={isTempNormal ? "text-green-600" : "text-red-600"}
            />
            <StatCard
              title="Humidite"
              value={`${environment.current.humidity}%`}
              subtitle={`${environment.optimal.humidity.min}-${environment.optimal.humidity.max}%`}
              icon={Droplets}
              iconBg={isHumidityNormal ? "bg-green-100" : "bg-amber-100"}
              iconColor={isHumidityNormal ? "text-green-600" : "text-amber-600"}
            />
            <StatCard
              title="NH3"
              value={`${environment.current.nh3} ppm`}
              subtitle={`Max: ${environment.optimal.nh3.max} ppm`}
              icon={Wind}
              iconBg={isNH3Normal ? "bg-green-100" : "bg-red-100"}
              iconColor={isNH3Normal ? "text-green-600" : "text-red-600"}
            />
            <StatCard
              title="CO2"
              value={`${environment.current.co2} ppm`}
              subtitle={`Max: ${environment.optimal.co2.max} ppm`}
              icon={Wind}
              iconBg={isCO2Normal ? "bg-green-100" : "bg-amber-100"}
              iconColor={isCO2Normal ? "text-green-600" : "text-amber-600"}
            />
            <StatCard
              title="Eclairage"
              value={`${environment.current.lightIntensity}%`}
              subtitle={`${environment.lightProgram.duration}h/jour`}
              icon={Sun}
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
            />
          </StatCardGrid>

          {/* Charts & Light Program */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 24h Trend */}
            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Evolution sur 24h</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={environment.hourlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="temp" domain={[20, 35]} />
                  <YAxis yAxisId="humidity" orientation="right" domain={[40, 80]} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#ef4444" />
                  <Line yAxisId="humidity" type="monotone" dataKey="humidity" name="Humidite (%)" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Light Program & Temp Guide */}
            <div className="space-y-4">
              {/* Light Program */}
              <div className="bg-white p-4 rounded-xl border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Programme lumineux</h3>
                  <button
                    onClick={() => setShowLightProgramModal(true)}
                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-4 h-4" /> Modifier
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Sun className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Allumage</p>
                    <p className="font-semibold">{environment.lightProgram.lightOn}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-100 rounded-lg">
                    <Clock className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Duree</p>
                    <p className="font-semibold">{environment.lightProgram.duration}h</p>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <Sun className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Extinction</p>
                    <p className="font-semibold">{environment.lightProgram.lightOff}</p>
                  </div>
                </div>
              </div>

              {/* Temperature Guide */}
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="font-semibold mb-3">Guide temperatures par age</h3>
                <div className="space-y-2">
                  {TEMP_GUIDE.map((guide, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-600">{guide.age}</span>
                      <span className="font-medium text-red-600">{guide.temp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(!isTempNormal || !isNH3Normal) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Alertes environnement</p>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {!isTempNormal && <li>• Temperature hors limites - Verifier la ventilation</li>}
                    {!isNH3Normal && <li>• NH3 eleve - Ameliorer la ventilation ou changer la litiere</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Feed Modal */}
      {showAddFeedModal && (
        <AddFeedModal onClose={() => setShowAddFeedModal(false)} />
      )}

      {/* Light Program Modal */}
      {showLightProgramModal && (
        <LightProgramModal
          currentProgram={environment.lightProgram}
          onClose={() => setShowLightProgramModal(false)}
        />
      )}
    </div>
  )
}

// Add Feed Modal
function AddFeedModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: 'growth',
    quantity: '',
    lot_id: '',
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Enregistrer consommation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type d'aliment</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="starter">Demarrage</option>
              <option value="growth">Croissance</option>
              <option value="finisher">Finition</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantite (kg)</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Light Program Modal
function LightProgramModal({ currentProgram, onClose }: { currentProgram: any; onClose: () => void }) {
  const [program, setProgram] = useState(currentProgram)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Programme lumineux</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Allumage</label>
              <input
                type="time"
                value={program.lightOn}
                onChange={(e) => setProgram({ ...program, lightOn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Extinction</label>
              <input
                type="time"
                value={program.lightOff}
                onChange={(e) => setProgram({ ...program, lightOff: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Intensite ({program.intensity}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={program.intensity}
              onChange={(e) => setProgram({ ...program, intensity: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
