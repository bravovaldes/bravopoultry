'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { PeriodFilter, getDateRangeFromPeriod } from '@/components/ui/period-filter'
import {
  Receipt,
  Truck,
  Package,
  Wallet,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Download,
  Star,
  Building,
  AlertTriangle,
  AlertCircle,
  Bird,
  UserPlus,
  User,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { cn, formatCurrency, formatCurrencyCompact, formatDate, safeNumber, roundDecimal } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts'

const EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Alimentation', color: '#f59e0b' },
  { value: 'chicks', label: 'Poussins', color: '#22c55e' },
  { value: 'veterinary', label: 'Veterinaire', color: '#ef4444' },
  { value: 'labor', label: 'Main d\'oeuvre', color: '#6366f1' },
  { value: 'energy', label: 'Electricite', color: '#06b6d4' },
  { value: 'water', label: 'Eau', color: '#0ea5e9' },
  { value: 'transport', label: 'Transport', color: '#8b5cf6' },
  { value: 'packaging', label: 'Emballage', color: '#f97316' },
  { value: 'equipment', label: 'Equipement', color: '#14b8a6' },
  { value: 'maintenance', label: 'Maintenance', color: '#ec4899' },
  { value: 'rent', label: 'Loyer', color: '#a855f7' },
  { value: 'other', label: 'Autres', color: '#64748b' },
]

const SUPPLIER_TYPES = [
  { value: 'feed', label: 'Aliments' },
  { value: 'chicks', label: 'Poussins' },
  { value: 'veterinary', label: 'Veterinaire' },
  { value: 'equipment', label: 'Equipements' },
]

const ORDER_STATUS = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmee', color: 'bg-blue-100 text-blue-700' },
  { value: 'shipped', label: 'Expediee', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Livree', color: 'bg-green-100 text-green-700' },
]

// Comptes - fonctionnalité à venir
const staticAccounts = [
  { id: 'principal', name: 'Compte Principal', type: 'bank', balance: 0, bank: 'BICEC' },
  { id: 'cash', name: 'Caisse', type: 'cash', balance: 0, bank: null },
  { id: 'mobile', name: 'Mobile Money', type: 'mobile', balance: 0, bank: 'Orange Money' },
]

export default function GestionFinancesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('30d')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // Lock body scroll when any modal is open
  useBodyScrollLock(showAddExpenseModal || showAddTransactionModal || showAddSupplierModal)

  const { startDate, endDate } = getDateRangeFromPeriod(period)

  // Fetch financial summary (includes cashflow and transactions)
  const { data: financialSummary, isLoading: financialLoading } = useQuery({
    queryKey: ['financial-summary', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/dashboard/financial-summary?start_date=${startDate}&end_date=${endDate}`)
      return response.data
    },
  })

  // Fetch suppliers from backend
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/expenses/suppliers')
      return response.data
    },
  })

  const suppliers = suppliersData || []

  // Fetch expenses for detailed view
  const { data: expensesData } = useQuery({
    queryKey: ['expenses', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/expenses?start_date=${startDate}&end_date=${endDate}`)
      return response.data
    },
  })

  // Fetch sales for comparison
  const { data: salesData } = useQuery({
    queryKey: ['sales', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/sales?start_date=${startDate}&end_date=${endDate}`)
      return response.data
    },
  })

  // Fetch active lots for linking expenses/transactions
  const { data: lotsData } = useQuery({
    queryKey: ['lots-for-finance'],
    queryFn: async () => {
      const response = await api.get('/lots')
      return response.data
    },
  })

  const activeLots = (lotsData || []).filter((lot: any) => lot.status === 'active')

  const expenses = Array.isArray(expensesData) ? expensesData : []
  const sales = Array.isArray(salesData) ? salesData : []

  // Use data from financial summary or calculate from raw data
  const totalExpenses = financialSummary?.summary?.total_expenses ?? expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
  const totalRevenue = financialSummary?.summary?.total_sales ?? sales.reduce((sum: number, s: any) => sum + s.total_amount, 0)
  const netProfit = financialSummary?.summary?.net_profit ?? (totalRevenue - totalExpenses)
  const profitMargin = financialSummary?.summary?.profit_margin ?? (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0)
  const pendingReceivables = financialSummary?.summary?.pending_receivables ?? 0

  // Cashflow from backend
  const cashflowData = financialSummary?.cashflow || []

  // Transactions from backend (combined sales + expenses)
  const transactions = financialSummary?.transactions || []

  // Calculate total balance (placeholder - accounts feature coming)
  const totalBalance = netProfit > 0 ? netProfit : 0

  // Expenses by category - calculate amount per category
  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => {
    const amount = roundDecimal(expenses.filter((e: any) => e.category === cat.value).reduce((sum: number, e: any) => sum + safeNumber(e.amount), 0), 2)
    return {
      categoryCode: cat.value,
      label: cat.label,
      color: cat.color,
      amount: amount
    }
  }).filter(c => c.amount > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
          <p className="text-gray-500">Vue complete de vos finances</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <TrendingDown className="w-4 h-4" />
            Depense
          </button>
          <button
            onClick={() => setShowAddTransactionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <TrendingUp className="w-4 h-4" />
            Entree
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="overview" icon={Wallet}>Vue globale</TabsTrigger>
            <TabsTrigger value="expenses" icon={Receipt}>Depenses</TabsTrigger>
            <TabsTrigger value="suppliers" icon={Truck}>Fournisseurs</TabsTrigger>
            <TabsTrigger value="purchases" icon={Package}>Achats</TabsTrigger>
          </TabsList>

          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {/* Overview Tab - Treasury + Summary */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <StatCardGrid columns={5}>
            <StatCard
              title="Solde total"
              value={formatCurrencyCompact(totalBalance)}
              icon={Wallet}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
            />
            <StatCard
              title="Revenus"
              value={formatCurrencyCompact(totalRevenue)}
              subtitle={`${period === '30d' ? 'ce mois' : ''}`}
              icon={TrendingUp}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Depenses"
              value={formatCurrencyCompact(totalExpenses)}
              icon={TrendingDown}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
            <StatCard
              title="Profit net"
              value={formatCurrencyCompact(netProfit)}
              icon={DollarSign}
              iconBg={netProfit >= 0 ? "bg-green-100" : "bg-red-100"}
              iconColor={netProfit >= 0 ? "text-green-600" : "text-red-600"}
            />
            <StatCard
              title="Marge"
              value={`${profitMargin.toFixed(1)}%`}
              icon={CreditCard}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </StatCardGrid>

          {/* Accounts + Cash Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Cards */}
            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Resume financier</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-700">Revenus (periode)</p>
                    <p className="text-xs text-green-600">{period === '30d' ? 'Ce mois' : period === '7d' ? 'Cette semaine' : 'Periode selectionnee'}</p>
                  </div>
                  <p className="font-bold text-lg text-green-700">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-700">Depenses (periode)</p>
                    <p className="text-xs text-red-600">{expenses.length} transactions</p>
                  </div>
                  <p className="font-bold text-lg text-red-700">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  netProfit >= 0 ? "bg-blue-50" : "bg-orange-50"
                )}>
                  <div>
                    <p className={cn("font-medium", netProfit >= 0 ? "text-blue-700" : "text-orange-700")}>Marge nette</p>
                    <p className={cn("text-xs", netProfit >= 0 ? "text-blue-600" : "text-orange-600")}>{profitMargin.toFixed(1)}% de marge</p>
                  </div>
                  <p className={cn("font-bold text-lg", netProfit >= 0 ? "text-blue-700" : "text-orange-700")}>
                    {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                  </p>
                </div>
                {pendingReceivables > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="font-medium text-amber-700">Creances clients</p>
                      <p className="text-xs text-amber-600">A recouvrer</p>
                    </div>
                    <p className="font-bold text-lg text-amber-700">{formatCurrency(pendingReceivables)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Flux de tresorerie</h3>
              {financialLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                  <span className="text-sm">Chargement...</span>
                </div>
              ) : cashflowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="income" name="Revenus" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="expenses" name="Depenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>Pas encore de donnees financieres</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Transactions recentes</h3>
              {transactions.length > 8 && (
                <button
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {showAllTransactions ? 'Voir moins' : `Voir tout (${transactions.length})`}
                </button>
              )}
            </div>
            {financialLoading ? (
              <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {transactions.slice(0, showAllTransactions ? transactions.length : 8).map((t: any) => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === t.category)
                  return (
                    <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                        )}>
                          {t.type === 'income' ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{t.description}</p>
                            {t.lot_code && (
                              <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                                <Bird className="w-3 h-3" />
                                {t.lot_code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatDate(t.date)}</span>
                            {t.client_name && <span className="text-green-600">• {t.client_name}</span>}
                            {t.supplier_name && <span className="text-red-600">• {t.supplier_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold text-sm",
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                        {cat && t.type === 'expense' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                            {cat.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Aucune transaction pour cette periode</p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {pendingReceivables > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Creances en attente</p>
                <p className="text-sm text-amber-700">
                  {formatCurrency(pendingReceivables)} de ventes en attente de paiement
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <StatCardGrid columns={4}>
            <StatCard
              title="Total depenses"
              value={formatCurrencyCompact(totalExpenses)}
              icon={Receipt}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
            <StatCard
              title="Alimentation"
              value={formatCurrencyCompact(expensesByCategory.find(c => c.label === 'Alimentation')?.amount || 0)}
              icon={Receipt}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Main d'oeuvre"
              value={formatCurrencyCompact(expensesByCategory.find(c => c.label === "Main d'oeuvre")?.amount || 0)}
              icon={Receipt}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
            />
            <StatCard
              title="Veterinaire"
              value={formatCurrencyCompact(expensesByCategory.find(c => c.label === 'Veterinaire')?.amount || 0)}
              icon={Receipt}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
          </StatCardGrid>

          {/* Expense Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Repartition par categorie</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expensesByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Evolution des depenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expensesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" name="Montant">
                    {expensesByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Depenses recentes</h3>
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <Download className="w-4 h-4" /> Exporter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Categorie</th>
                    <th className="px-4 py-3">Bande</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.slice(0, 10).map((expense: any) => {
                    const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category)
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(expense.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{expense.description}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}>
                            {cat?.label || expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {expense.lot_code ? (
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1 w-fit">
                              <Bird className="w-3 h-3" />
                              {expense.lot_code}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          -{formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <StatCardGrid columns={4}>
            <StatCard
              title="Total fournisseurs"
              value={suppliers.length}
              icon={Truck}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Fournisseurs actifs"
              value={suppliers.filter((s: any) => s.is_active).length}
              icon={CheckCircle}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Volume achats"
              value={formatCurrencyCompact(roundDecimal(suppliers.reduce((s: number, f: any) => s + safeNumber(f.total_purchases), 0), 2))}
              icon={DollarSign}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              title="Note moyenne"
              value={suppliers.length > 0 ? `${roundDecimal(suppliers.reduce((s: number, f: any) => {
                const q = safeNumber(f.quality_rating)
                const p = safeNumber(f.price_rating)
                const d = safeNumber(f.delivery_rating)
                const count = (q > 0 ? 1 : 0) + (p > 0 ? 1 : 0) + (d > 0 ? 1 : 0)
                return s + (count > 0 ? (q + p + d) / count : 0)
              }, 0) / suppliers.length, 1)}/5` : '-'}
              icon={Star}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </StatCardGrid>

          {/* Suppliers List */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Liste des fournisseurs ({suppliers.length})</h3>
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Nouveau fournisseur
              </button>
            </div>
            {suppliersLoading ? (
              <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Aucun fournisseur enregistre</p>
                <p className="text-sm">Ajoutez vos fournisseurs pour mieux gerer vos achats</p>
              </div>
            ) : (
              <div className="divide-y">
                {suppliers.map((supplier: any) => {
                  const q = safeNumber(supplier.quality_rating)
                  const p = safeNumber(supplier.price_rating)
                  const d = safeNumber(supplier.delivery_rating)
                  const count = (q > 0 ? 1 : 0) + (p > 0 ? 1 : 0) + (d > 0 ? 1 : 0)
                  const avgRating = count > 0 ? roundDecimal((q + p + d) / count, 1) : 0
                  const typeInfo = SUPPLIER_TYPES.find(t => t.value === supplier.supplier_type)
                  return (
                    <div key={supplier.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-gray-500">
                            {supplier.company || typeInfo?.label || 'Fournisseur'}
                            {supplier.city && ` • ${supplier.city}`}
                          </p>
                          {avgRating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn("w-3 h-3", i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
                              ))}
                              <span className="text-xs text-gray-500 ml-1">{avgRating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(safeNumber(supplier.total_purchases))}</p>
                        {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Purchases Tab - shows expenses with supplier */}
        <TabsContent value="purchases" className="space-y-6">
          <StatCardGrid columns={4}>
            <StatCard
              title="Total achats"
              value={expenses.filter((e: any) => e.supplier_name).length}
              icon={Package}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Ce mois"
              value={expenses.length}
              icon={Receipt}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              title="Fournisseurs actifs"
              value={suppliers.length}
              icon={Truck}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Volume total"
              value={formatCurrencyCompact(totalExpenses)}
              icon={CreditCard}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </StatCardGrid>

          {/* Purchases List - based on expenses */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Achats recents ({expenses.length})</h3>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Nouvel achat
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Aucun achat enregistre pour cette periode</p>
                <p className="text-sm">Enregistrez vos depenses pour suivre vos achats</p>
              </div>
            ) : (
              <div className="divide-y">
                {expenses.slice(0, 10).map((expense: any) => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category)
                  return (
                    <div key={expense.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${cat?.color}20` }}>
                          <Package className="w-5 h-5" style={{ color: cat?.color || '#6366f1' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{expense.description}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}>
                              {cat?.label || expense.category}
                            </span>
                            {expense.lot_code && (
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                                <Bird className="w-3 h-3" />
                                {expense.lot_code}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{expense.supplier_name || 'Fournisseur non specifie'}</p>
                          <p className="text-xs text-gray-400">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(expense.date)}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-red-600">-{formatCurrency(expense.amount)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <AddExpenseModal
          suppliers={suppliers}
          lots={activeLots}
          onClose={() => setShowAddExpenseModal(false)}
          onSuccess={() => {
            setShowAddExpenseModal(false)
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
          }}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <AddTransactionModal
          accounts={staticAccounts}
          lots={activeLots}
          onClose={() => setShowAddTransactionModal(false)}
          onSuccess={() => {
            setShowAddTransactionModal(false)
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
          }}
        />
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <AddSupplierModal
          onClose={() => setShowAddSupplierModal(false)}
          onSuccess={() => {
            setShowAddSupplierModal(false)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}
    </div>
  )
}

// Add Expense Modal
function AddExpenseModal({ suppliers, lots, onClose, onSuccess }: { suppliers: any[]; lots: any[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'feed',
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    lot_id: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [lotSearch, setLotSearch] = useState('')

  // Filter lots based on search
  const filteredLots = lots.filter((lot: any) => {
    if (!lotSearch) return true
    const search = lotSearch.toLowerCase()
    return (
      lot.code?.toLowerCase().includes(search) ||
      lot.breed?.toLowerCase().includes(search) ||
      lot.building_name?.toLowerCase().includes(search) ||
      lot.site_name?.toLowerCase().includes(search)
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.post('/expenses', {
        ...formData,
        amount: safeNumber(formData.amount),
        supplier_id: formData.supplier_id || null,
        lot_id: formData.lot_id || null,
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle depense</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Depense enregistree avec succes !
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Ex: Aliment poulet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Montant *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="XAF"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Categorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fournisseur</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Aucun</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1">
                <Bird className="w-4 h-4 text-orange-500" />
                Lier a une bande
              </span>
            </label>
            {lots.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  placeholder="Rechercher une bande..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
            <select
              value={formData.lot_id}
              onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              size={lots.length > 5 ? Math.min(filteredLots.length + 1, 5) : 1}
            >
              <option value="">-- Aucune bande --</option>
              {filteredLots.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} {lot.building_name ? `· ${lot.building_name}` : ''} · {lot.current_quantity?.toLocaleString()} oiseaux
                </option>
              ))}
            </select>
            {lotSearch && filteredLots.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">Aucune bande pour "{lotSearch}"</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <DatePicker
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              showShortcuts={false}
              maxDate={new Date()}
              className="w-full"
            />
          </div>
          {/* Message d'erreur - pres du bouton */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Sale types for income
const SALE_TYPES = [
  { value: 'eggs_tray', label: 'Oeufs (plateaux)', unit: 'plateau' },
  { value: 'eggs_carton', label: 'Oeufs (cartons)', unit: 'carton' },
  { value: 'live_birds', label: 'Poulets vifs', unit: 'tete' },
  { value: 'dressed_birds', label: 'Poulets abattus', unit: 'kg' },
  { value: 'culled_hens', label: 'Poules de reforme', unit: 'tete' },
  { value: 'manure', label: 'Fiente', unit: 'sac' },
  { value: 'other', label: 'Autre', unit: 'unite' },
]

// Add Transaction Modal (Income/Sales)
function AddTransactionModal({ accounts, lots, onClose, onSuccess }: { accounts: any[]; lots: any[]; onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    sale_type: 'eggs_tray',
    quantity: '',
    unit_price: '',
    client_id: '',
    lot_id: '',
    date: new Date().toISOString().split('T')[0],
    payment_status: 'paid',
    payment_method: 'cash',
    amount_paid: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [lotSearch, setLotSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showQuickAddClient, setShowQuickAddClient] = useState(false)

  // Fetch clients
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/sales/clients')
      return response.data
    },
  })
  const clients = clientsData || []

  // Filter clients based on search
  const filteredClients = clients.filter((client: any) => {
    if (!clientSearch) return true
    const search = clientSearch.toLowerCase()
    return (
      client.name?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search) ||
      client.company?.toLowerCase().includes(search)
    )
  })

  // Get selected client info
  const selectedClient = clients.find((c: any) => c.id === formData.client_id)

  const totalAmount = safeNumber(formData.quantity) * safeNumber(formData.unit_price)
  const selectedSaleType = SALE_TYPES.find(t => t.value === formData.sale_type)

  // Filter lots based on search
  const filteredLots = lots.filter((lot: any) => {
    if (!lotSearch) return true
    const search = lotSearch.toLowerCase()
    return (
      lot.code?.toLowerCase().includes(search) ||
      lot.breed?.toLowerCase().includes(search) ||
      lot.building_name?.toLowerCase().includes(search) ||
      lot.site_name?.toLowerCase().includes(search)
    )
  })

  // Calculate amount paid based on status
  const calculatedAmountPaid = formData.payment_status === 'paid'
    ? totalAmount
    : formData.payment_status === 'pending'
      ? 0
      : safeNumber(formData.amount_paid)

  const remainingToPay = roundDecimal(totalAmount - calculatedAmountPaid, 2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const saleData: Record<string, any> = {
        date: formData.date,
        sale_type: formData.sale_type,
        quantity: safeNumber(formData.quantity),
        unit: selectedSaleType?.unit || 'unite',
        unit_price: safeNumber(formData.unit_price),
        lot_id: formData.lot_id || null,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        amount_paid: calculatedAmountPaid,
        notes: formData.notes || null,
      }

      // Add client info from selected client
      if (formData.client_id) {
        saleData.client_id = formData.client_id
        saleData.client_name = selectedClient?.name
        saleData.client_phone = selectedClient?.phone
      }

      await api.post('/sales', saleData)
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle vente / entree</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Vente enregistree avec succes !
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Type de vente *</label>
            <select
              value={formData.sale_type}
              onChange={(e) => setFormData({ ...formData, sale_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {SALE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Quantite *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={`Nb ${selectedSaleType?.unit || 'unites'}`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prix unit. *</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="XAF"
                required
              />
            </div>
          </div>
          {totalAmount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">Total: <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span></p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1">
                <Bird className="w-4 h-4 text-orange-500" />
                Lier a une bande
              </span>
            </label>
            {lots.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  placeholder="Rechercher une bande..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
            <select
              value={formData.lot_id}
              onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              size={lots.length > 5 ? Math.min(filteredLots.length + 1, 6) : 1}
            >
              <option value="">-- Aucune bande (vente generale) --</option>
              {filteredLots.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name || lot.code}{lot.name && lot.code ? ` (${lot.code})` : ''} · {lot.type === 'layer' ? 'Pondeuses' : 'Chair'} · {lot.current_quantity?.toLocaleString()} {lot.building_name ? `· ${lot.building_name}` : ''}
                </option>
              ))}
            </select>
            {lotSearch && filteredLots.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">Aucune bande trouvee pour "{lotSearch}"</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Liez cette vente a une bande pour calculer la rentabilite</p>
          </div>
          {/* Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <User className="w-4 h-4 text-blue-500" />
                Client
              </label>
              <button
                type="button"
                onClick={() => setShowQuickAddClient(true)}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                title="Ajouter un nouveau client"
              >
                <UserPlus className="w-4 h-4" />
                Nouveau client
              </button>
            </div>
            <div className="space-y-2">
              {clients.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Rechercher un client..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              )}
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                size={clients.length > 5 ? Math.min(filteredClients.length + 1, 5) : 1}
              >
                <option value="">-- Aucun client (anonyme) --</option>
                {filteredClients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.phone ? `• ${client.phone}` : ''} {client.company ? `(${client.company})` : ''}
                  </option>
                ))}
              </select>
              {clientSearch && filteredClients.length === 0 && (
                <p className="text-xs text-orange-500">
                  Aucun client pour "{clientSearch}" -
                  <button type="button" onClick={() => setShowQuickAddClient(true)} className="text-green-600 hover:underline ml-1">
                    Creer ce client
                  </button>
                </p>
              )}
              {selectedClient && (
                <p className="text-xs text-gray-500">
                  {selectedClient.phone && `Tel: ${selectedClient.phone}`}
                  {selectedClient.address && ` • ${selectedClient.address}`}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut paiement</label>
              <select
                value={formData.payment_status}
                onChange={(e) => {
                  const newStatus = e.target.value
                  let newAmountPaid = formData.amount_paid
                  if (newStatus === 'paid') {
                    newAmountPaid = String(totalAmount)
                  } else if (newStatus === 'pending') {
                    newAmountPaid = '0'
                  }
                  setFormData({ ...formData, payment_status: newStatus, amount_paid: newAmountPaid })
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="paid">Paye</option>
                <option value="pending">En attente</option>
                <option value="partial">Partiel</option>
              </select>
            </div>
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Mode de paiement</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="cash">Especes</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Virement bancaire</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Montant paye
                {formData.payment_status === 'partial' && <span className="text-amber-600 ml-1">(acompte)</span>}
              </label>
              <input
                type="number"
                value={formData.payment_status === 'paid' ? totalAmount : formData.payment_status === 'pending' ? 0 : formData.amount_paid}
                onChange={(e) => {
                  const value = safeNumber(e.target.value)
                  if (value > totalAmount) {
                    setFormData({ ...formData, amount_paid: String(totalAmount) })
                  } else {
                    setFormData({ ...formData, amount_paid: e.target.value })
                  }
                }}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg text-sm",
                  formData.payment_status !== 'partial' && "bg-gray-100 text-gray-500"
                )}
                min="0"
                max={totalAmount}
                disabled={formData.payment_status !== 'partial'}
                placeholder={formData.payment_status === 'partial' ? 'Montant acompte' : ''}
              />
            </div>
          </div>

          {/* Total display */}
          {totalAmount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Total</span>
                <span className="font-bold text-green-700">{formatCurrency(totalAmount)}</span>
              </div>
              {formData.payment_status === 'partial' && remainingToPay > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-amber-600">Reste a payer</span>
                  <span className="font-medium text-amber-600">{formatCurrency(remainingToPay)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Notes additionnelles..."
            />
          </div>
          {/* Message d'erreur - pres du bouton */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.quantity || !formData.unit_price}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Add Client Modal */}
      {showQuickAddClient && (
        <QuickAddClientModal
          initialName={clientSearch}
          onClose={() => setShowQuickAddClient(false)}
          onSuccess={(newClient) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            setFormData({ ...formData, client_id: newClient.id })
            setClientSearch('')
            setShowQuickAddClient(false)
          }}
        />
      )}
    </div>
  )
}

// Client types constant
const CLIENT_TYPES = [
  { value: 'individual', label: 'Particulier' },
  { value: 'retailer', label: 'Detaillant' },
  { value: 'wholesaler', label: 'Grossiste' },
  { value: 'restaurant', label: 'Restaurant' },
]

// Quick Add Client Modal (same fields as commercial page for consistency)
function QuickAddClientModal({
  initialName = '',
  onClose,
  onSuccess
}: {
  initialName?: string
  onClose: () => void
  onSuccess: (client: any) => void
}) {
  const [formData, setFormData] = useState({
    name: initialName,
    client_type: 'individual',
    phone: '',
    city: '',
    email: '',
    address: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Le nom est requis')
      return
    }
    if (!formData.phone.trim()) {
      setError('Le telephone est requis')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const cleanData: Record<string, any> = {
        name: formData.name,
        phone: formData.phone,
        client_type: formData.client_type,
        payment_terms_days: 0,
      }
      if (formData.city) cleanData.city = formData.city
      if (formData.email) cleanData.email = formData.email
      if (formData.address) cleanData.address = formData.address

      const response = await api.post('/sales/clients', cleanData)
      onSuccess(response.data)
    } catch (err: any) {
      console.error('Error creating client:', err)
      const detail = err.response?.data?.detail
      let message = 'Erreur lors de la creation'
      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-600" />
            Nouveau client
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Nom du client"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.client_type}
              onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telephone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="699 00 00 00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Douala, Yaounde..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="client@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Quartier, rue..."
            />
          </div>
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creation...' : 'Creer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Supplier Modal
function AddSupplierModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    supplier_type: 'feed',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.post('/expenses/suppliers', formData)
      onSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.detail || 'Erreur lors de la creation du fournisseur')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouveau fournisseur</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Nom du fournisseur"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Nom de l'entreprise"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tel.</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="699 00 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="email@ex.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type de fournisseur</label>
            <select
              value={formData.supplier_type}
              onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {SUPPLIER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Douala"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Quartier..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Informations supplementaires..."
            />
          </div>

          {/* Message d'erreur - pres du bouton */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
