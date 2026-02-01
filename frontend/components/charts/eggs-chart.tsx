'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatDateShort } from '@/lib/utils'
import { Egg, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function EggsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['eggs-trend'],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts/eggs-trend?days=14')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  if (!data?.labels?.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Egg className="w-12 h-12 text-gray-300" />
        <p>Pas encore de donnees</p>
        <p className="text-sm">Commencez a enregistrer votre production</p>
      </div>
    )
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label: string, index: number) => ({
    date: formatDateShort(label),
    oeufs: data.datasets[0]?.data[index] || 0,
    taux: data.datasets[1]?.data[index] || 0,
  }))

  // Calculate summary stats
  const totalEggs = chartData.reduce((sum: number, d: any) => sum + d.oeufs, 0)
  const avgRate = chartData.reduce((sum: number, d: any) => sum + d.taux, 0) / chartData.length
  const lastRate = chartData[chartData.length - 1]?.taux || 0
  const prevRate = chartData[chartData.length - 2]?.taux || 0
  const rateChange = lastRate - prevRate

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">Oeufs:</span>
              <span className="font-bold">{payload[0]?.value?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Taux:</span>
              <span className="font-bold">{payload[1]?.value?.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">14 derniers jours</p>
          <p className="text-xl font-bold text-orange-600">{totalEggs.toLocaleString()}</p>
          <p className="text-xs text-gray-600">oeufs produits</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Taux moyen</p>
          <p className="text-xl font-bold text-green-600">{avgRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-600">de ponte</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${rateChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 mb-1">Evolution</p>
          <div className="flex items-center justify-center gap-1">
            {rateChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : rateChange < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <Minus className="w-4 h-4 text-gray-600" />
            )}
            <p className={`text-xl font-bold ${rateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rateChange > 0 ? '+' : ''}{rateChange.toFixed(1)}%
            </p>
          </div>
          <p className="text-xs text-gray-600">vs hier</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorEggs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="oeufs"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#colorEggs)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="taux"
            stroke="#22c55e"
            strokeWidth={2}
            fill="none"
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-orange-500 rounded"></div>
          <span className="text-gray-600">Nombre d'oeufs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500 rounded" style={{ borderStyle: 'dashed' }}></div>
          <span className="text-gray-600">Taux de ponte (%)</span>
        </div>
      </div>
    </div>
  )
}
