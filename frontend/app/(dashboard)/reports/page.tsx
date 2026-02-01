'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Printer,
  Mail,
  ChevronRight,
  FileSpreadsheet,
  FilePieChart,
  FileBarChart,
  Clock,
  CheckCircle,
  Building2,
  Bird,
  Egg,
  DollarSign,
  TrendingDown,
  Scale,
  Skull,
  Eye,
  X,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'

type ReportType = 'production' | 'financial' | 'inventory' | 'lot' | 'site'

interface ReportConfig {
  id: string
  name: string
  description: string
  icon: any
  type: ReportType
  color: string
}

const REPORT_TYPES: ReportConfig[] = [
  {
    id: 'daily-production',
    name: 'Rapport de production journalier',
    description: 'Production d\'oeufs, pesees et mortalites du jour',
    icon: Egg,
    type: 'production',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'weekly-summary',
    name: 'Resume hebdomadaire',
    description: 'Synthese de la semaine: production, ventes, depenses',
    icon: FileBarChart,
    type: 'production',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'monthly-financial',
    name: 'Rapport financier mensuel',
    description: 'Ventes, depenses, marges et tresorerie',
    icon: DollarSign,
    type: 'financial',
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'lot-performance',
    name: 'Performance par lot',
    description: 'Analyse detaillee d\'un lot: mortalite, IC, rentabilite',
    icon: Bird,
    type: 'lot',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'site-summary',
    name: 'Resume par site',
    description: 'Vue d\'ensemble d\'un site: lots, production, finances',
    icon: Building2,
    type: 'site',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'mortality-report',
    name: 'Rapport de mortalite',
    description: 'Analyse des mortalites par cause et par lot',
    icon: Skull,
    type: 'production',
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'feed-consumption',
    name: 'Consommation alimentaire',
    description: 'Suivi de la consommation et indice de conversion',
    icon: Scale,
    type: 'production',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'sales-report',
    name: 'Rapport des ventes',
    description: 'Detail des ventes par type, client et periode',
    icon: DollarSign,
    type: 'financial',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'expense-report',
    name: 'Rapport des depenses',
    description: 'Analyse des depenses par categorie',
    icon: TrendingDown,
    type: 'financial',
    color: 'bg-rose-100 text-rose-600',
  },
]

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType | 'all'>('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get('/sites')
      return response.data
    },
  })

  // Fetch lots
  const { data: lots } = useQuery({
    queryKey: ['lots'],
    queryFn: async () => {
      const response = await api.get('/lots')
      return response.data
    },
  })

  // Recent reports (mock data for now)
  const recentReports = [
    { id: 1, name: 'Rapport production - Janvier 2026', date: '2026-01-28', type: 'production', status: 'completed' },
    { id: 2, name: 'Resume financier - Semaine 4', date: '2026-01-27', type: 'financial', status: 'completed' },
    { id: 3, name: 'Performance lot LP-2025-001', date: '2026-01-25', type: 'lot', status: 'completed' },
  ]

  const filteredReports = selectedType === 'all'
    ? REPORT_TYPES
    : REPORT_TYPES.filter(r => r.type === selectedType)

  const handleGenerateReport = (report: ReportConfig) => {
    setSelectedReport(report)
    setShowGenerateModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500">Generez et exportez vos rapports</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{REPORT_TYPES.length}</p>
              <p className="text-sm text-gray-500">Types de rapports</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{recentReports.length}</p>
              <p className="text-sm text-gray-500">Rapports generes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sites?.length || 0}</p>
              <p className="text-sm text-gray-500">Sites</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bird className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lots?.filter((l: any) => l.status === 'active').length || 0}</p>
              <p className="text-sm text-gray-500">Lots actifs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'production', label: 'Production' },
          { value: 'financial', label: 'Financier' },
          { value: 'lot', label: 'Lots' },
          { value: 'site', label: 'Sites' },
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value as ReportType | 'all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition",
              selectedType === type.value
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-xl border p-4 hover:shadow-md transition cursor-pointer group"
            onClick={() => handleGenerateReport(report)}
          >
            <div className="flex items-start gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", report.color)}>
                <report.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Rapports recents
          </h3>
        </div>
        <div className="divide-y">
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    report.type === 'production' ? "bg-amber-100" :
                    report.type === 'financial' ? "bg-green-100" :
                    report.type === 'lot' ? "bg-purple-100" : "bg-blue-100"
                  )}>
                    <FileText className={cn(
                      "w-5 h-5",
                      report.type === 'production' ? "text-amber-600" :
                      report.type === 'financial' ? "text-green-600" :
                      report.type === 'lot' ? "text-purple-600" : "text-blue-600"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(report.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Complete
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Telecharger">
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Voir">
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              Aucun rapport genere recemment
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && selectedReport && (
        <GenerateReportModal
          report={selectedReport}
          sites={sites}
          lots={lots}
          onClose={() => {
            setShowGenerateModal(false)
            setSelectedReport(null)
          }}
          onPreview={(data) => {
            setPreviewData(data)
            setShowPreview(true)
            setShowGenerateModal(false)
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <ReportPreviewModal
          data={previewData}
          report={selectedReport}
          onClose={() => {
            setShowPreview(false)
            setPreviewData(null)
            setSelectedReport(null)
          }}
        />
      )}
    </div>
  )
}

// Generate Report Modal
function GenerateReportModal({
  report,
  sites,
  lots,
  onClose,
  onPreview,
}: {
  report: ReportConfig
  sites: any[]
  lots: any[]
  onClose: () => void
  onPreview: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    siteId: 'all',
    lotId: 'all',
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      // Fetch data based on report type
      const params = new URLSearchParams()
      params.append('start_date', formData.startDate)
      params.append('end_date', formData.endDate)
      if (formData.siteId !== 'all') params.append('site_id', formData.siteId)
      if (formData.lotId !== 'all') params.append('lot_id', formData.lotId)

      let data: any = { report, params: formData }

      // Fetch relevant data based on report type
      if (report.type === 'production' || report.id === 'daily-production') {
        const [eggsRes, weightsRes] = await Promise.all([
          api.get(`/production/eggs?${params.toString()}`),
          api.get(`/production/weights?${params.toString()}`),
        ])
        data.eggs = eggsRes.data
        data.weights = weightsRes.data
      }

      if (report.type === 'financial' || report.id === 'monthly-financial') {
        const [salesRes, expensesRes] = await Promise.all([
          api.get(`/sales?${params.toString()}`),
          api.get(`/expenses?${params.toString()}`),
        ])
        data.sales = salesRes.data
        data.expenses = expensesRes.data
      }

      if (report.id === 'lot-performance' && formData.lotId !== 'all') {
        const perfRes = await api.get(`/analytics/lot/${formData.lotId}/performance`)
        data.performance = perfRes.data
      }

      onPreview(data)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const needsLotSelection = report.id === 'lot-performance'
  const needsSiteSelection = report.id === 'site-summary'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", report.color)}>
              <report.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">{report.name}</h2>
              <p className="text-sm text-gray-500">Configurer le rapport</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date debut</label>
              <DatePicker
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <DatePicker
                value={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>
          </div>

          {/* Site Selection */}
          {!needsLotSelection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value, lotId: 'all' })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required={needsSiteSelection}
              >
                <option value="all">Tous les sites</option>
                {sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lot Selection */}
          {needsLotSelection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot *</label>
              <select
                value={formData.lotId}
                onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              >
                <option value="all">Selectionner un lot</option>
                {lots?.map((lot: any) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name || lot.code} - {lot.type === 'layer' ? 'Pondeuse' : 'Chair'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <div className="flex gap-2">
              {[
                { value: 'pdf', label: 'PDF', icon: FileText },
                { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setFormData({ ...formData, format: format.value })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition",
                    formData.format === format.value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <format.icon className="w-4 h-4" />
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.includeCharts}
                onChange={(e) => setFormData({ ...formData, includeCharts: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Inclure les graphiques</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.includeDetails}
                onChange={(e) => setFormData({ ...formData, includeDetails: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Inclure les details</span>
            </label>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (needsLotSelection && formData.lotId === 'all')}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generation...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Apercu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Report Preview Modal
function ReportPreviewModal({
  data,
  report,
  onClose,
}: {
  data: any
  report: ReportConfig | null
  onClose: () => void
}) {
  const handleDownload = () => {
    // Generate CSV for now
    let csvContent = ''

    if (data.eggs) {
      csvContent += 'Production d\'oeufs\n'
      csvContent += 'Date,Lot,Total,Taux ponte\n'
      data.eggs.forEach((e: any) => {
        csvContent += `${e.date},${e.lot?.code || '-'},${e.total_eggs},${e.laying_rate}%\n`
      })
      csvContent += '\n'
    }

    if (data.sales) {
      csvContent += 'Ventes\n'
      csvContent += 'Date,Type,Client,Quantite,Total\n'
      data.sales.forEach((s: any) => {
        csvContent += `${s.date},${s.sale_type},${s.client_name || '-'},${s.quantity},${s.total_amount}\n`
      })
      csvContent += '\n'
    }

    if (data.expenses) {
      csvContent += 'Depenses\n'
      csvContent += 'Date,Categorie,Description,Montant\n'
      data.expenses.forEach((e: any) => {
        csvContent += `${e.date},${e.category},${e.description || '-'},${e.amount}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapport_${report?.id}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate totals
  const totalEggs = data.eggs?.reduce((sum: number, e: any) => sum + (e.total_eggs || 0), 0) || 0
  const avgLayingRate = data.eggs?.length > 0
    ? data.eggs.reduce((sum: number, e: any) => sum + parseFloat(e.laying_rate || 0), 0) / data.eggs.length
    : 0
  const totalSales = data.sales?.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0) || 0
  const totalExpenses = data.expenses?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", report?.color)}>
              {report && <report.icon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-semibold">{report?.name}</h2>
              <p className="text-sm text-gray-500">
                {data.params?.startDate} - {data.params?.endDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Imprimer"
            >
              <Printer className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Telecharger
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {data.eggs && (
              <>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-600">Total oeufs</p>
                  <p className="text-2xl font-bold text-amber-700">{totalEggs.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-600">Taux ponte moy.</p>
                  <p className="text-2xl font-bold text-amber-700">{avgLayingRate.toFixed(1)}%</p>
                </div>
              </>
            )}
            {data.sales && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Total ventes</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalSales)}</p>
              </div>
            )}
            {data.expenses && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600">Total depenses</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
              </div>
            )}
            {data.sales && data.expenses && (
              <div className={cn("rounded-lg p-4", totalSales - totalExpenses >= 0 ? "bg-blue-50" : "bg-red-50")}>
                <p className={cn("text-sm", totalSales - totalExpenses >= 0 ? "text-blue-600" : "text-red-600")}>
                  Marge brute
                </p>
                <p className={cn("text-2xl font-bold", totalSales - totalExpenses >= 0 ? "text-blue-700" : "text-red-700")}>
                  {formatCurrency(totalSales - totalExpenses)}
                </p>
              </div>
            )}
          </div>

          {/* Eggs Table */}
          {data.eggs && data.eggs.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Egg className="w-5 h-5 text-amber-600" />
                Production d'oeufs ({data.eggs.length} enregistrements)
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Lot</th>
                      <th className="text-right p-3 font-medium">Total oeufs</th>
                      <th className="text-right p-3 font-medium">Taux ponte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.eggs.slice(0, 10).map((egg: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3">{formatDate(egg.date)}</td>
                        <td className="p-3">{egg.lot?.code || '-'}</td>
                        <td className="p-3 text-right font-medium">{egg.total_eggs?.toLocaleString()}</td>
                        <td className="p-3 text-right">{parseFloat(egg.laying_rate).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.eggs.length > 10 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                    ... et {data.eggs.length - 10} autres enregistrements
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sales Table */}
          {data.sales && data.sales.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Ventes ({data.sales.length} transactions)
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-right p-3 font-medium">Quantite</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.sales.slice(0, 10).map((sale: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3">{formatDate(sale.date)}</td>
                        <td className="p-3">{sale.sale_type}</td>
                        <td className="p-3">{sale.client_name || '-'}</td>
                        <td className="p-3 text-right">{parseFloat(sale.quantity).toLocaleString()}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(parseFloat(sale.total_amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.sales.length > 10 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                    ... et {data.sales.length - 10} autres transactions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expenses Table */}
          {data.expenses && data.expenses.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Depenses ({data.expenses.length} transactions)
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Categorie</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.expenses.slice(0, 10).map((expense: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3">{formatDate(expense.date)}</td>
                        <td className="p-3">{expense.category}</td>
                        <td className="p-3">{expense.description || '-'}</td>
                        <td className="p-3 text-right font-medium text-red-600">
                          {formatCurrency(parseFloat(expense.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.expenses.length > 10 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                    ... et {data.expenses.length - 10} autres transactions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lot Performance */}
          {data.performance && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Bird className="w-5 h-5 text-purple-600" />
                Performance du lot {data.performance.lot?.code}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Effectif initial</p>
                  <p className="text-xl font-bold">{data.performance.lot?.initial_quantity?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Effectif actuel</p>
                  <p className="text-xl font-bold">{data.performance.lot?.current_quantity?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="text-xl font-bold">J{data.performance.lot?.age_days}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Taux mortalite</p>
                  <p className={cn("text-xl font-bold",
                    data.performance.mortality?.rate > 5 ? "text-red-600" : "text-green-600"
                  )}>
                    {data.performance.mortality?.rate}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-600">Total oeufs</p>
                  <p className="text-xl font-bold text-amber-700">
                    {data.performance.production?.total_eggs?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Ventes</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(data.performance.financial?.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Marge brute</p>
                  <p className={cn("text-xl font-bold",
                    data.performance.financial?.gross_margin >= 0 ? "text-blue-700" : "text-red-700"
                  )}>
                    {formatCurrency(data.performance.financial?.gross_margin || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500 print:hidden">
          Rapport genere le {new Date().toLocaleDateString('fr-FR')} a {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </div>
    </div>
  )
}
