'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

export function FinancialChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['financial-trend'],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts/financial-trend?months=6')
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
        <Wallet className="w-12 h-12 text-gray-300" />
        <p>Pas encore de donnees financieres</p>
        <p className="text-sm">Enregistrez vos ventes et depenses</p>
      </div>
    )
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label: string, index: number) => ({
    mois: label,
    ventes: data.datasets[0]?.data[index] || 0,
    depenses: data.datasets[1]?.data[index] || 0,
    marge: data.datasets[2]?.data[index] || 0,
  }))

  // Calculate totals
  const totalSales = chartData.reduce((sum: number, d: any) => sum + d.ventes, 0)
  const totalExpenses = chartData.reduce((sum: number, d: any) => sum + d.depenses, 0)
  const totalMargin = totalSales - totalExpenses

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const ventes = payload.find((p: any) => p.dataKey === 'ventes')?.value || 0
      const depenses = payload.find((p: any) => p.dataKey === 'depenses')?.value || 0
      const marge = ventes - depenses

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-green-600">Ventes:</span>
              <span className="font-bold">{ventes.toLocaleString()} XAF</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-red-600">Depenses:</span>
              <span className="font-bold">{depenses.toLocaleString()} XAF</span>
            </div>
            <div className="border-t pt-1 mt-1 flex justify-between gap-4">
              <span className={marge >= 0 ? 'text-green-700' : 'text-red-700'}>Marge:</span>
              <span className={`font-bold ${marge >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {marge >= 0 ? '+' : ''}{marge.toLocaleString()} XAF
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Total ventes</p>
          <p className="text-sm font-bold text-green-600">{formatYAxis(totalSales)} XAF</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Total depenses</p>
          <p className="text-sm font-bold text-red-600">{formatYAxis(totalExpenses)} XAF</p>
        </div>
        <div className={`rounded-lg p-2 ${totalMargin >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <p className="text-xs text-gray-500">Marge</p>
          <div className="flex items-center justify-center gap-1">
            {totalMargin >= 0 ? (
              <TrendingUp className="w-3 h-3 text-blue-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-orange-600" />
            )}
            <p className={`text-sm font-bold ${totalMargin >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {totalMargin >= 0 ? '+' : ''}{formatYAxis(totalMargin)} XAF
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={0} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="mois"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Bar
            dataKey="ventes"
            name="Ventes"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="depenses"
            name="Depenses"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-600">Ventes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600">Depenses</span>
        </div>
      </div>
    </div>
  )
}
