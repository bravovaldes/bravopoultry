'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Egg,
  Bird,
  Scale,
  Skull,
  Wheat,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Target,
  Percent,
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react'
import { cn, formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts'

type PeriodFilter = '7d' | '30d' | '90d' | '365d'

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedLotId, setSelectedLotId] = useState<string>('all')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch all lots
  const { data: lots } = useQuery({
    queryKey: ['lots-analytics', selectedSiteId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      const response = await api.get(`/lots?${params.toString()}`)
      return response.data
    },
  })

  // Get selected lot details
  const selectedLot = lots?.find((l: any) => l.id === selectedLotId)

  // Fetch lot financial summary when a specific lot is selected
  const { data: lotFinancialSummary } = useQuery({
    queryKey: ['lot-financial-summary', selectedLotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${selectedLotId}/financial-summary`)
      return response.data
    },
    enabled: selectedLotId !== 'all'
  })

  // Fetch feed monitoring stats
  const { data: feedMonitoringStats } = useQuery({
    queryKey: ['feed-monitoring-stats', period, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const params = new URLSearchParams()
      params.append('days', days.toString())
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      const response = await api.get(`/feed/monitoring/stats?${params.toString()}`)
      return response.data
    },
  })

  // Fetch detailed feed consumption for specific lot
  const { data: feedData } = useQuery({
    queryKey: ['feed-consumption', period, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString().split('T')[0])
      params.append('lot_id', selectedLotId)
      const response = await api.get(`/feed/consumption?${params.toString()}`)
      return response.data
    },
    enabled: selectedLotId !== 'all'
  })

  // Get period days
  const getPeriodDays = () => {
    switch (period) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '365d': return 365
      default: return 30
    }
  }

  // Fetch dashboard data
  const { data: dashboardData, isLoading: loadingDashboard, isFetching: fetchingDashboard } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await api.get('/dashboard/overview')
      return response.data
    },
  })

  // Fetch production data
  const { data: eggs, isLoading: loadingEggs } = useQuery({
    queryKey: ['eggs-analytics', period, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString().split('T')[0])
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      const response = await api.get(`/production/eggs?${params.toString()}`)
      return response.data
    },
  })

  // Fetch weights
  const { data: weights, isLoading: loadingWeights } = useQuery({
    queryKey: ['weights-analytics', period, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString().split('T')[0])
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      const response = await api.get(`/production/weights?${params.toString()}`)
      return response.data
    },
  })

  // Fetch sales
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-analytics', period, selectedSiteId, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString().split('T')[0])
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      const response = await api.get(`/sales?${params.toString()}`)
      return response.data
    },
  })

  // Fetch expenses
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-analytics', period, selectedSiteId, selectedLotId],
    queryFn: async () => {
      const days = getPeriodDays()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString().split('T')[0])
      if (selectedSiteId !== 'all') params.append('site_id', selectedSiteId)
      if (selectedLotId !== 'all') params.append('lot_id', selectedLotId)
      const response = await api.get(`/expenses?${params.toString()}`)
      return response.data
    },
  })

  // Global loading state for initial data fetch
  const isInitialLoading = loadingDashboard || loadingEggs || loadingSales || loadingExpenses

  // Get period start date for filtering
  const getPeriodStartDate = () => {
    const days = getPeriodDays()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    return startDate
  }

  // Check if a lot was created within the selected period
  const isLotInPeriod = (lot: any) => {
    if (!lot.placement_date) return false
    const lotDate = new Date(lot.placement_date)
    const periodStart = getPeriodStartDate()
    return lotDate >= periodStart
  }

  // Calculate expenses with lot field costs (chicks, transport) included
  const calculateTotalExpenses = () => {
    // Base expenses from expense table
    let total = expenses?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0

    // If a specific lot is selected
    if (selectedLotId !== 'all') {
      // Try to use financial summary total first (it's in summary.total_expenses)
      if (lotFinancialSummary?.summary?.total_expenses) {
        return lotFinancialSummary.summary.total_expenses
      }

      // Fallback: add lot field costs directly from selectedLot (only if in period)
      if (selectedLot && isLotInPeriod(selectedLot)) {
        const chickCost = (selectedLot.chick_price_unit || 0) * (selectedLot.initial_quantity || 0)
        const transportCost = selectedLot.transport_cost || 0
        const otherCosts = selectedLot.other_initial_costs || 0
        const lotFieldsTotal = chickCost + transportCost + otherCosts
        if (lotFieldsTotal > 0) {
          return total + lotFieldsTotal
        }
      }
      return total
    }

    // For global view, add lot field costs for lots created within the period
    if (lots) {
      lots.forEach((lot: any) => {
        // Only add costs for lots created within the selected period
        if (!isLotInPeriod(lot)) return

        // Add chick costs
        const chickCost = (parseFloat(lot.chick_price_unit) || 0) * (lot.initial_quantity || 0)
        if (chickCost > 0) {
          total += chickCost
        }
        // Add transport costs
        if (lot.transport_cost) {
          total += parseFloat(lot.transport_cost) || 0
        }
        // Add other initial costs
        if (lot.other_initial_costs) {
          total += parseFloat(lot.other_initial_costs) || 0
        }
      })
    }

    return total
  }

  // Default egg price per tray (30 eggs) in FCFA - can be adjusted
  const DEFAULT_EGG_TRAY_PRICE = 2500

  // Calculate total sales
  const calculateTotalSales = () => {
    let total = sales?.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0) || 0

    // If a specific lot is selected, use the financial summary (it's in summary.total_revenue)
    if (selectedLotId !== 'all' && lotFinancialSummary?.summary?.total_revenue) {
      return lotFinancialSummary.summary.total_revenue
    }

    return total
  }

  // Calculate estimated egg revenue for layer lots
  const estimatedEggRevenue = (() => {
    if (!eggs || eggs.length === 0) return 0

    const totalEggsProduced = eggs.reduce((sum: number, e: any) => sum + (e.total_eggs || 0), 0)

    // Check if eggs are already in sales
    const eggSalesRecorded = sales?.some((s: any) =>
      s.sale_type === 'eggs_tray' || s.sale_type === 'eggs_carton'
    ) || false

    // If no egg sales recorded, estimate revenue
    if (!eggSalesRecorded && totalEggsProduced > 0) {
      const trays = totalEggsProduced / 30
      return trays * DEFAULT_EGG_TRAY_PRICE
    }

    return 0
  })()

  // Calculate feed consumption - use monitoring stats for total, or sum from individual records
  const totalFeedKg = feedMonitoringStats?.summary?.total_feed_kg ||
    feedData?.reduce((sum: number, f: any) => sum + parseFloat(f.quantity_kg || 0), 0) || 0

  // Calculate KPIs
  const totalExpensesCalc = calculateTotalExpenses()
  const totalSalesCalc = calculateTotalSales()

  const kpis = {
    totalSales: totalSalesCalc,
    totalExpenses: totalExpensesCalc,
    totalEggs: eggs?.reduce((sum: number, e: any) => sum + (e.total_eggs || 0), 0) || 0,
    avgLayingRate: eggs?.length > 0
      ? eggs.reduce((sum: number, e: any) => sum + parseFloat(e.laying_rate || 0), 0) / eggs.length
      : 0,
    totalBirds: selectedLotId !== 'all' && selectedLot
      ? selectedLot.current_quantity || 0
      : dashboardData?.summary?.total_birds || 0,
    activeLots: selectedLotId !== 'all' ? 1 : lots?.filter((l: any) => l.status === 'active').length || 0,
    totalFeedKg,
    // New metrics
    initialBirds: selectedLotId !== 'all' && selectedLot
      ? selectedLot.initial_quantity || 0
      : lots?.reduce((sum: number, l: any) => sum + (l.initial_quantity || 0), 0) || 0,
  }

  const profitMargin = kpis.totalSales - kpis.totalExpenses
  const profitMarginPercent = kpis.totalSales > 0 ? (profitMargin / kpis.totalSales) * 100 : 0

  // Expense breakdown by category
  const expensesByCategory = (() => {
    const categories: Record<string, number> = {}

    // For a specific lot, use the financial summary breakdown (includes chicks, transport, etc.)
    if (selectedLotId !== 'all' && lotFinancialSummary?.expenses_breakdown) {
      Object.entries(lotFinancialSummary.expenses_breakdown).forEach(([cat, data]: [string, any]) => {
        const categoryName = cat.toLowerCase()
        categories[categoryName] = (categories[categoryName] || 0) + (data.total || 0)
      })
      return categories
    }

    // For a specific lot without financial summary, use fallback
    if (selectedLotId !== 'all') {
      // Add expenses from expense table
      expenses?.forEach((e: any) => {
        const cat = e.category || 'autres'
        categories[cat] = (categories[cat] || 0) + parseFloat(e.amount || 0)
      })

      // Add lot field costs directly (only if lot is in period)
      if (selectedLot && isLotInPeriod(selectedLot)) {
        const chickCost = (selectedLot.chick_price_unit || 0) * (selectedLot.initial_quantity || 0)
        if (chickCost > 0) {
          categories['poussins'] = (categories['poussins'] || 0) + chickCost
        }
        if (selectedLot.transport_cost) {
          categories['transport'] = (categories['transport'] || 0) + selectedLot.transport_cost
        }
        if (selectedLot.other_initial_costs) {
          categories['autres'] = (categories['autres'] || 0) + selectedLot.other_initial_costs
        }
      }
      return categories
    }

    // For global view (all lots), sum from expense table
    expenses?.forEach((e: any) => {
      const cat = e.category || 'autres'
      categories[cat] = (categories[cat] || 0) + parseFloat(e.amount || 0)
    })

    // Add lot field costs for lots created within the period
    if (lots) {
      lots.forEach((lot: any) => {
        // Only add costs for lots created within the selected period
        if (!isLotInPeriod(lot)) return

        const chickCost = (lot.chick_price_unit || 0) * (lot.initial_quantity || 0)
        if (chickCost > 0) {
          categories['poussins'] = (categories['poussins'] || 0) + chickCost
        }
        if (lot.transport_cost) {
          categories['transport'] = (categories['transport'] || 0) + lot.transport_cost
        }
        if (lot.other_initial_costs) {
          categories['autres'] = (categories['autres'] || 0) + lot.other_initial_costs
        }
      })
    }

    return categories
  })()

  // Sales vs Expenses trend
  const financialTrend = (() => {
    const dateMap: any = {}

    sales?.forEach((s: any) => {
      const date = s.date
      if (!dateMap[date]) dateMap[date] = { date, ventes: 0, depenses: 0 }
      dateMap[date].ventes += parseFloat(s.total_amount || 0)
    })

    expenses?.forEach((e: any) => {
      const date = e.date
      if (!dateMap[date]) dateMap[date] = { date, ventes: 0, depenses: 0 }
      dateMap[date].depenses += parseFloat(e.amount || 0)
    })

    return Object.values(dateMap)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d: any) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        marge: d.ventes - d.depenses,
      }))
  })()

  // Egg production trend
  const eggTrend = eggs
    ?.slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc: any[], e: any) => {
      const date = new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      const existing = acc.find(d => d.date === date)
      if (existing) {
        existing.oeufs += e.total_eggs || 0
        existing.taux = (existing.taux + parseFloat(e.laying_rate || 0)) / 2
      } else {
        acc.push({ date, oeufs: e.total_eggs || 0, taux: parseFloat(e.laying_rate || 0) })
      }
      return acc
    }, []) || []

  // Weight progression
  const weightTrend = weights
    ?.slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((w: any) => ({
      date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      poids: parseFloat(w.average_weight_g) / 1000,
      age: w.age_days,
    })) || []

  // Sales by type distribution
  const salesByType = sales?.reduce((acc: any, s: any) => {
    const type = s.sale_type
    if (!acc[type]) acc[type] = 0
    acc[type] += parseFloat(s.total_amount || 0)
    return acc
  }, {}) || {}

  const salesTypeData = Object.entries(salesByType).map(([name, value], index) => ({
    name: name === 'eggs_tray' ? 'Oeufs (plateau)' :
          name === 'eggs_carton' ? 'Oeufs (carton)' :
          name === 'live_birds' ? 'Poulets vifs' :
          name === 'dressed_birds' ? 'Poulets abattus' :
          name === 'culled_hens' ? 'Reforme' : name,
    value: value as number,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  // Build expense category data for chart (using the already calculated expensesByCategory)
  const expenseCategoryData = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name: name === 'feed' ? 'Aliment' :
          name === 'veterinary' ? 'Veterinaire' :
          name === 'labor' ? 'Main d\'oeuvre' :
          name === 'energy' ? 'Energie' :
          name === 'chicks' ? 'Poussins' : name,
    value: value as number,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  // Export functions
  const generateCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => row[h] ?? '').join(';'))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf', reportType: 'financial' | 'production' | 'complete') => {
    setExporting(`${format}-${reportType}`)

    try {
      // Prepare data based on report type
      let data: any[] = []
      let filename = ''

      switch (reportType) {
        case 'financial':
          filename = 'rapport_financier'
          data = financialTrend.map((d: any) => ({
            'Date': d.date,
            'Ventes (FCFA)': d.ventes,
            'Depenses (FCFA)': d.depenses,
            'Marge (FCFA)': d.marge,
          }))
          break
        case 'production':
          filename = 'rapport_production'
          data = eggTrend.map((d: any) => ({
            'Date': d.date,
            'Oeufs produits': d.oeufs,
            'Taux de ponte (%)': d.taux?.toFixed(1),
          }))
          break
        case 'complete':
          filename = 'rapport_complet'
          // Combine financial and production data
          const dateMap: any = {}
          financialTrend.forEach((d: any) => {
            dateMap[d.date] = { ...dateMap[d.date], date: d.date, ventes: d.ventes, depenses: d.depenses, marge: d.marge }
          })
          eggTrend.forEach((d: any) => {
            dateMap[d.date] = { ...dateMap[d.date], date: d.date, oeufs: d.oeufs, tauxPonte: d.taux }
          })
          data = Object.values(dateMap).map((d: any) => ({
            'Date': d.date,
            'Oeufs': d.oeufs || 0,
            'Taux ponte (%)': d.tauxPonte?.toFixed(1) || '-',
            'Ventes (FCFA)': d.ventes || 0,
            'Depenses (FCFA)': d.depenses || 0,
            'Marge (FCFA)': d.marge || 0,
          }))
          break
      }

      if (format === 'csv') {
        generateCSV(data, filename)
      } else if (format === 'excel') {
        // For Excel, we'll use CSV with .xlsx extension (basic)
        // In production, you'd use a library like xlsx
        generateCSV(data, filename.replace('.csv', '.xlsx'))
      } else if (format === 'pdf') {
        // For PDF, create a printable view
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          const siteName = selectedSiteId === 'all'
            ? 'Tous les sites'
            : sites?.find((s: any) => s.id === selectedSiteId)?.name || 'Site'

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${filename}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
                h2 { color: #374151; margin-top: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                th { background: #f3f4f6; font-weight: 600; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                .summary-card { background: #f9fafb; padding: 15px; border-radius: 8px; }
                .summary-card h3 { margin: 0; font-size: 14px; color: #6b7280; }
                .summary-card p { margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #111827; }
                .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <h1>BravoPoultry - ${reportType === 'financial' ? 'Rapport Financier' : reportType === 'production' ? 'Rapport Production' : 'Rapport Complet'}</h1>
              <p><strong>Periode:</strong> ${period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : period === '90d' ? '90 derniers jours' : '12 derniers mois'}</p>
              <p><strong>Site:</strong> ${siteName}</p>
              <p><strong>Date du rapport:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>

              <div class="summary">
                <div class="summary-card">
                  <h3>Chiffre d'affaires</h3>
                  <p>${formatCurrency(kpis.totalSales)}</p>
                </div>
                <div class="summary-card">
                  <h3>Depenses</h3>
                  <p>${formatCurrency(kpis.totalExpenses)}</p>
                </div>
                <div class="summary-card">
                  <h3>Marge brute</h3>
                  <p style="color: ${profitMargin >= 0 ? '#10b981' : '#ef4444'}">${formatCurrency(profitMargin)}</p>
                </div>
                <div class="summary-card">
                  <h3>Production oeufs</h3>
                  <p>${kpis.totalEggs.toLocaleString()}</p>
                </div>
              </div>

              <h2>Donnees detaillees</h2>
              <table>
                <thead>
                  <tr>
                    ${Object.keys(data[0] || {}).map(h => `<th>${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${data.map(row => `
                    <tr>
                      ${Object.values(row).map(v => `<td>${v}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="footer">
                <p>Genere par BravoPoultry - ${new Date().toLocaleString('fr-FR')}</p>
              </div>
            </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
        }
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(null)
      setShowExportMenu(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm sm:text-base text-gray-500">Analyse detaillee des performances</p>
          </div>

          {/* Export dropdown - visible on desktop */}
          <div className="hidden sm:block relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exporter
              <ChevronDown className={cn("w-4 h-4 transition", showExportMenu && "rotate-180")} />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border shadow-lg z-20 py-2">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Type de rapport</p>
                  </div>

                  {/* Financial Report */}
                  <div className="px-2 py-1">
                    <p className="px-2 py-1 text-xs font-medium text-gray-500">Rapport Financier</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExport('csv', 'financial')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'csv-financial' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-green-600" />}
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel', 'financial')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'excel-financial' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                        Excel
                      </button>
                      <button
                        onClick={() => handleExport('pdf', 'financial')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'pdf-financial' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Production Report */}
                  <div className="px-2 py-1">
                    <p className="px-2 py-1 text-xs font-medium text-gray-500">Rapport Production</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExport('csv', 'production')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'csv-production' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-green-600" />}
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel', 'production')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'excel-production' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                        Excel
                      </button>
                      <button
                        onClick={() => handleExport('pdf', 'production')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'pdf-production' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Complete Report */}
                  <div className="px-2 py-1 border-t mt-1 pt-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-500">Rapport Complet</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExport('csv', 'complete')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'csv-complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-green-600" />}
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel', 'complete')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'excel-complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                        Excel
                      </button>
                      <button
                        onClick={() => handleExport('pdf', 'complete')}
                        disabled={!!exporting}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        {exporting === 'pdf-complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters row - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value)
              setSelectedLotId('all') // Reset lot when site changes
            }}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites?.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          {/* Lot filter */}
          <select
            value={selectedLotId}
            onChange={(e) => setSelectedLotId(e.target.value)}
            className={cn(
              "w-full sm:w-auto px-3 py-2 border rounded-lg text-sm bg-white sm:min-w-[150px]",
              selectedLotId !== 'all' && "border-orange-300 bg-orange-50"
            )}
          >
            <option value="all">Tous les lots</option>
            {(lots || []).map((lot: any) => (
              <option key={lot.id} value={lot.id}>
                {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} {lot.site_name ? `· ${lot.site_name}` : ''} - J{lot.age_days || 0}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Period filter */}
            <div className="flex flex-1 sm:flex-none bg-gray-100 rounded-lg p-1">
              {[
                { value: '7d', label: '7j' },
                { value: '30d', label: '30j' },
                { value: '90d', label: '90j' },
                { value: '365d', label: '1an' },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value as PeriodFilter)}
                  className={cn(
                    "flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition",
                    period === p.value
                      ? "bg-white shadow text-gray-900 font-medium"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Export button - mobile version */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center justify-center w-10 h-10 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                <Download className="w-5 h-5" />
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border shadow-lg z-20 py-2">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs font-semibold text-gray-400 uppercase">Type de rapport</p>
                    </div>

                    {/* Financial Report */}
                    <div className="px-2 py-1">
                      <p className="px-2 py-1 text-xs font-medium text-gray-500">Financier</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleExport('csv', 'financial')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'csv-financial' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-green-600" />}
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport('excel', 'financial')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'excel-financial' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
                          Excel
                        </button>
                        <button
                          onClick={() => handleExport('pdf', 'financial')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'pdf-financial' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-red-600" />}
                          PDF
                        </button>
                      </div>
                    </div>

                    {/* Production Report */}
                    <div className="px-2 py-1">
                      <p className="px-2 py-1 text-xs font-medium text-gray-500">Production</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleExport('csv', 'production')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'csv-production' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-green-600" />}
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport('excel', 'production')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'excel-production' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
                          Excel
                        </button>
                        <button
                          onClick={() => handleExport('pdf', 'production')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'pdf-production' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-red-600" />}
                          PDF
                        </button>
                      </div>
                    </div>

                    {/* Complete Report */}
                    <div className="px-2 py-1 border-t mt-1 pt-2">
                      <p className="px-2 py-1 text-xs font-medium text-gray-500">Complet</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleExport('csv', 'complete')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'csv-complete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-green-600" />}
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport('excel', 'complete')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'excel-complete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
                          Excel
                        </button>
                        <button
                          onClick={() => handleExport('pdf', 'complete')}
                          disabled={!!exporting}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {exporting === 'pdf-complete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-red-600" />}
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected lot info banner - simplified, no duplicate financial info */}
      {selectedLotId !== 'all' && selectedLot && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "p-1.5 sm:p-2 rounded-lg shrink-0",
                selectedLot.type === 'broiler' ? "bg-blue-100" : "bg-amber-100"
              )}>
                {selectedLot.type === 'broiler'
                  ? <Bird className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  : <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                }
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedLot.name || selectedLot.code}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {selectedLot.type === 'broiler' ? 'Poulet de chair' : 'Pondeuse'} • J{selectedLot.age_days || 0} • {(selectedLot.current_quantity || 0).toLocaleString()} oiseaux
                  {selectedLot.site_name && ` • ${selectedLot.site_name}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedLotId('all')}
              className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-medium px-2 sm:px-3 py-1 rounded-lg hover:bg-orange-100 transition self-end sm:self-auto"
            >
              Voir tous les lots
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500">Chiffre d'affaires</p>
              {loadingSales ? (
                <div className="h-7 sm:h-8 flex items-center mt-0.5 sm:mt-1">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : (
                <p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate" title={formatCurrency(kpis.totalSales)}>
                  {formatCurrencyCompact(kpis.totalSales)}
                </p>
              )}
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 mt-2 text-xs">
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-400">vs periode prec.</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500">Depenses</p>
              {loadingExpenses ? (
                <div className="h-7 sm:h-8 flex items-center mt-0.5 sm:mt-1">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : (
                <p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate" title={formatCurrency(kpis.totalExpenses)}>
                  {formatCurrencyCompact(kpis.totalExpenses)}
                </p>
              )}
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 mt-2 text-xs">
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-600 font-medium">-5%</span>
            <span className="text-gray-400">vs periode prec.</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500">Marge brute</p>
              {loadingSales || loadingExpenses ? (
                <div className="h-7 sm:h-8 flex items-center mt-0.5 sm:mt-1">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : (
                <p className={cn("text-base sm:text-xl font-bold mt-0.5 sm:mt-1 truncate", profitMargin >= 0 ? "text-green-600" : "text-red-600")} title={formatCurrency(profitMargin)}>
                  {formatCurrencyCompact(profitMargin)}
                </p>
              )}
            </div>
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
              profitMargin >= 0 ? "bg-green-100" : "bg-red-100")}>
              <Calculator className={cn("w-4 h-4 sm:w-5 sm:h-5", profitMargin >= 0 ? "text-green-600" : "text-red-600")} />
            </div>
          </div>
          {!loadingSales && !loadingExpenses && (
            <div className="flex items-center gap-1 mt-1.5 text-xs">
              <Percent className="w-3.5 h-3.5 text-gray-400" />
              <span className={cn("font-medium", profitMargin >= 0 ? "text-green-600" : "text-red-600")}>
                {profitMarginPercent.toFixed(1)}%
              </span>
              <span className="text-gray-400 hidden sm:inline">de marge</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500">Production oeufs</p>
              {loadingEggs ? (
                <div className="h-7 sm:h-8 flex items-center mt-0.5 sm:mt-1">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : (
                <p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                  {kpis.totalEggs >= 1000000
                    ? `${(kpis.totalEggs / 1000000).toFixed(1)}M`
                    : kpis.totalEggs >= 10000
                      ? `${Math.round(kpis.totalEggs / 1000)}K`
                      : kpis.totalEggs.toLocaleString()}
                </p>
              )}
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
          </div>
          {!loadingEggs && (
            <div className="flex items-center gap-1 mt-1.5 text-xs">
              <Target className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-amber-600 font-medium">{kpis.avgLayingRate.toFixed(1)}%</span>
              <span className="text-gray-400 hidden sm:inline">taux ponte moy.</span>
            </div>
          )}
        </div>
      </div>

      {/* Estimated Revenue Notice */}
      {estimatedEggRevenue > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg shrink-0">
              <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm sm:text-base">Revenu estimatif des oeufs</p>
              <p className="text-xs sm:text-sm text-amber-700 mt-1">
                <span className="hidden sm:inline">Production de {kpis.totalEggs.toLocaleString()} oeufs detectee sans ventes enregistrees.</span>
                <span className="sm:hidden">{kpis.totalEggs.toLocaleString()} oeufs produits.</span>
                {' '}Revenu estime: <strong>{formatCurrency(estimatedEggRevenue)}</strong>
                <span className="hidden sm:inline"> (base: {formatCurrency(DEFAULT_EGG_TRAY_PRICE)}/plateau)</span>
              </p>
              <p className="text-xs text-amber-600 mt-1 sm:mt-2 hidden sm:block">
                Ce montant n'est pas inclus dans le chiffre d'affaires. Enregistrez vos ventes d'oeufs pour un suivi precis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Financial Trend */}
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            Evolution financiere
          </h3>
          <div className="h-56 sm:h-72">
            {loadingSales || loadingExpenses ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : financialTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={35} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="ventes" name="Ventes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" name="Depenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="marge" name="Marge" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Pas de donnees pour cette periode
              </div>
            )}
          </div>
        </div>

        {/* Egg Production Trend */}
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Egg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            Production d'oeufs
          </h3>
          <div className="h-56 sm:h-72">
            {loadingEggs ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : eggTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={eggTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={{ fontSize: 9 }} width={35} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={[0, 100]} width={30} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="oeufs" name="Oeufs" fill="#fbbf24" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="taux" name="Taux (%)" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Pas de donnees pour cette periode
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Weight Progression */}
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Progression du poids
          </h3>
          <div className="h-44 sm:h-56">
            {loadingWeights ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <span className="text-xs">Chargement...</span>
              </div>
            ) : weightTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Poids']} />
                  <Area type="monotone" dataKey="poids" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Pas de donnees
              </div>
            )}
          </div>
        </div>

        {/* Sales Distribution */}
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            Repartition des ventes
          </h3>
          <div className="h-44 sm:h-56 flex flex-col sm:flex-row items-center">
            {loadingSales ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <span className="text-xs">Chargement...</span>
              </div>
            ) : salesTypeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120} className="sm:!w-1/2 sm:!h-full">
                  <PieChart>
                    <Pie
                      data={salesTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {salesTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full sm:flex-1 space-y-0.5 sm:space-y-1 mt-2 sm:mt-0">
                  {salesTypeData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-medium shrink-0">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                Pas de ventes
              </div>
            )}
          </div>
        </div>

        {/* Expenses Distribution */}
        <div className="bg-white rounded-xl border p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            Repartition des depenses
          </h3>
          <div className="h-44 sm:h-56 flex flex-col sm:flex-row items-center">
            {loadingExpenses ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <span className="text-xs">Chargement...</span>
              </div>
            ) : expenseCategoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120} className="sm:!w-1/2 sm:!h-full">
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full sm:flex-1 space-y-0.5 sm:space-y-1 mt-2 sm:mt-0">
                  {expenseCategoryData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-medium shrink-0">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                Pas de depenses
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-4 text-white">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Bird className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            <span className="text-xs sm:text-sm opacity-80">Effectif total</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold">
            {kpis.totalBirds >= 1000000
              ? `${(kpis.totalBirds / 1000000).toFixed(1)}M`
              : kpis.totalBirds >= 10000
                ? `${Math.round(kpis.totalBirds / 1000)}K`
                : kpis.totalBirds.toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1">{kpis.activeLots} lots actifs</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 sm:p-4 text-white">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Egg className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            <span className="text-xs sm:text-sm opacity-80">Oeufs / jour</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold">
            {(() => {
              const avgEggs = eggTrend.length > 0
                ? Math.round(eggTrend.reduce((sum: number, d: any) => sum + d.oeufs, 0) / eggTrend.length)
                : 0
              return avgEggs >= 1000000
                ? `${(avgEggs / 1000000).toFixed(1)}M`
                : avgEggs >= 10000
                  ? `${Math.round(avgEggs / 1000)}K`
                  : avgEggs.toLocaleString()
            })()}
          </p>
          <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1">{kpis.avgLayingRate.toFixed(1)}% <span className="hidden sm:inline">taux moyen</span></p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-4 text-white">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            <span className="text-xs sm:text-sm opacity-80">CA / jour</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold">
            <span className="sm:hidden">
              {formatCurrencyCompact(financialTrend.length > 0
                ? financialTrend.reduce((sum: number, d: any) => sum + d.ventes, 0) / financialTrend.length
                : 0)}
            </span>
            <span className="hidden sm:inline">
              {formatCurrency(financialTrend.length > 0
                ? financialTrend.reduce((sum: number, d: any) => sum + d.ventes, 0) / financialTrend.length
                : 0)}
            </span>
          </p>
          <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1">sur {getPeriodDays()} jours</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 sm:p-4 text-white">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            <span className="text-xs sm:text-sm opacity-80">Rentabilite</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold">{profitMarginPercent.toFixed(1)}%</p>
          <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1">marge brute</p>
        </div>
      </div>
    </div>
  )
}
