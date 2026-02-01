'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  Banknote,
  PiggyBank,
  AlertCircle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, safeNumber, multiply } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Entree', icon: ArrowUpRight, color: 'text-green-600 bg-green-100' },
  { value: 'expense', label: 'Sortie', icon: ArrowDownRight, color: 'text-red-600 bg-red-100' },
]

const CATEGORIES = {
  income: [
    { value: 'sales', label: 'Ventes' },
    { value: 'loan', label: 'Pret' },
    { value: 'subsidy', label: 'Subvention' },
    { value: 'other_income', label: 'Autres revenus' },
  ],
  expense: [
    { value: 'feed', label: 'Alimentation' },
    { value: 'chicks', label: 'Poussins' },
    { value: 'medicine', label: 'Medicaments' },
    { value: 'salary', label: 'Salaires' },
    { value: 'utilities', label: 'Electricite/Eau' },
    { value: 'transport', label: 'Transport' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other_expense', label: 'Autres depenses' },
  ],
}

// Mock data
const mockTransactions = [
  { id: '1', date: '2024-01-20', type: 'income', category: 'sales', description: 'Vente poulets - Client Mbarga', amount: 850000, account: 'principal' },
  { id: '2', date: '2024-01-19', type: 'expense', category: 'feed', description: 'Achat aliment croissance', amount: 450000, account: 'principal' },
  { id: '3', date: '2024-01-18', type: 'expense', category: 'salary', description: 'Salaire employes Janvier', amount: 280000, account: 'principal' },
  { id: '4', date: '2024-01-17', type: 'income', category: 'sales', description: 'Vente oeufs - Marche central', amount: 125000, account: 'principal' },
  { id: '5', date: '2024-01-16', type: 'expense', category: 'medicine', description: 'Vaccins et medicaments', amount: 95000, account: 'principal' },
  { id: '6', date: '2024-01-15', type: 'expense', category: 'utilities', description: 'Facture electricite', amount: 45000, account: 'principal' },
  { id: '7', date: '2024-01-14', type: 'income', category: 'sales', description: 'Vente poulets en gros', amount: 1200000, account: 'principal' },
]

const mockCashflowForecast = [
  { month: 'Jan', income: 2500000, expenses: 1800000, balance: 700000 },
  { month: 'Fev', income: 2800000, expenses: 2000000, balance: 800000 },
  { month: 'Mar', income: 3200000, expenses: 2200000, balance: 1000000 },
  { month: 'Avr', income: 2900000, expenses: 2100000, balance: 800000 },
  { month: 'Mai', income: 3500000, expenses: 2400000, balance: 1100000 },
  { month: 'Jun', income: 3800000, expenses: 2600000, balance: 1200000 },
]

const mockAccounts = [
  { id: 'principal', name: 'Compte Principal', type: 'bank', balance: 2450000, bank: 'BICEC' },
  { id: 'cash', name: 'Caisse', type: 'cash', balance: 350000, bank: null },
  { id: 'mobile', name: 'Mobile Money', type: 'mobile', balance: 125000, bank: 'Orange Money' },
]

export default function TreasuryPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Lock body scroll when modal is open
  useBodyScrollLock(showAddModal)

  // Get date range for current month
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]

  // Fetch sales (income)
  const { data: salesData } = useQuery({
    queryKey: ['sales', startOfMonth, endOfMonth],
    queryFn: async () => {
      const response = await api.get(`/sales?start_date=${startOfMonth}&end_date=${endOfMonth}`)
      return response.data
    },
  })

  // Fetch expenses
  const { data: expensesData } = useQuery({
    queryKey: ['expenses', startOfMonth, endOfMonth],
    queryFn: async () => {
      const response = await api.get(`/expenses?start_date=${startOfMonth}&end_date=${endOfMonth}`)
      return response.data
    },
  })

  // Transform sales and expenses into transactions
  const salesTransactions = (salesData || []).map((sale: any) => ({
    id: `sale-${sale.id}`,
    date: sale.date,
    type: 'income',
    category: 'sales',
    description: `Vente ${sale.sale_type} - ${sale.client_name || 'Client comptant'}`,
    amount: safeNumber(sale.total_amount) || multiply(sale.quantity, sale.unit_price),
    account: 'principal',
  }))

  const expenseTransactions = (expensesData || []).map((expense: any) => ({
    id: `expense-${expense.id}`,
    date: expense.date,
    type: 'expense',
    category: expense.category || 'other_expense',
    description: expense.description || `Depense ${expense.category}`,
    amount: safeNumber(expense.amount),
    account: 'principal',
  }))

  // Combine and sort transactions
  const transactions = [...salesTransactions, ...expenseTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Use mock accounts for now (would need a separate accounts endpoint)
  const accounts = mockAccounts

  // Calculate totals from real data
  const monthIncome = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0)
  const monthExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0)
  const monthNet = monthIncome - monthExpenses

  // Calculate estimated balance (based on transactions)
  const estimatedBalance = monthNet > 0 ? monthNet : 0
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0) + estimatedBalance

  // Expense breakdown by category
  const expensesByCategory = CATEGORIES.expense.map(cat => {
    const total = transactions
      .filter((t: any) => t.type === 'expense' && t.category === cat.value)
      .reduce((sum: number, t: any) => sum + t.amount, 0)
    return { ...cat, total }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const getTypeInfo = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0]
  }

  const getCategoryLabel = (type: string, category: string) => {
    const cats = type === 'income' ? CATEGORIES.income : CATEGORIES.expense
    return cats.find(c => c.value === category)?.label || category
  }

  const formatMonth = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tresorerie</h1>
          <p className="text-gray-500">Gestion des flux de tresorerie</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Nouvelle transaction
        </button>
      </div>

      {/* Accounts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-white/80">Solde Total</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          <p className="text-sm text-white/70 mt-1">{accounts.length} comptes actifs</p>
        </div>

        {/* Individual Accounts */}
        {accounts.map((account) => (
          <div key={account.id} className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                account.type === 'bank' ? 'bg-blue-100' : account.type === 'cash' ? 'bg-green-100' : 'bg-orange-100'
              )}>
                {account.type === 'bank' ? (
                  <CreditCard className="w-4 h-4 text-blue-600" />
                ) : account.type === 'cash' ? (
                  <Banknote className="w-4 h-4 text-green-600" />
                ) : (
                  <DollarSign className="w-4 h-4 text-orange-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{account.name}</p>
                {account.bank && <p className="text-xs text-gray-500">{account.bank}</p>}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(account.balance)}</p>
          </div>
        ))}
      </div>

      {/* Monthly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Entrees du mois</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(monthIncome)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="font-medium">Sorties du mois</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(monthExpenses)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <PiggyBank className="w-5 h-5" />
            <span className="font-medium">Solde net</span>
          </div>
          <p className={cn("text-2xl font-bold", monthNet >= 0 ? "text-green-600" : "text-red-600")}>
            {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Forecast */}
        <div className="bg-white p-4 rounded-xl border">
          <h3 className="font-semibold mb-4">Prevision de tresorerie</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mockCashflowForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${v / 1000000}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="income" name="Entrees" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              <Area type="monotone" dataKey="expenses" name="Sorties" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
              <Line type="monotone" dataKey="balance" name="Solde" stroke="#6366f1" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-4 rounded-xl border">
          <h3 className="font-semibold mb-4">Repartition des depenses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expensesByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${v / 1000}K`} />
              <YAxis dataKey="label" type="category" width={100} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" name="Montant" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Transactions recentes</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {formatMonth(currentMonth)}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="all">Tous les comptes</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="divide-y">
          {transactions.map((transaction) => {
            const typeInfo = getTypeInfo(transaction.type)
            const TypeIcon = typeInfo.icon

            return (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", typeInfo.color.split(' ')[1])}>
                    <TypeIcon className={cn("w-5 h-5", typeInfo.color.split(' ')[0])} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{formatDate(transaction.date)}</span>
                      <span>•</span>
                      <span>{getCategoryLabel(transaction.type, transaction.category)}</span>
                    </div>
                  </div>
                </div>
                <p className={cn(
                  "font-semibold text-lg",
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                )}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t text-center">
          <button className="text-indigo-600 hover:underline text-sm">
            Voir toutes les transactions
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Rappels de paiement</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              <li>• Facture fournisseur Agri Feed - 450,000 FCFA (echeance: 25 Jan)</li>
              <li>• Salaires employes Fevrier - 280,000 FCFA (echeance: 5 Fev)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          accounts={accounts}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

// Add Transaction Modal
function AddTransactionModal({
  accounts,
  onClose,
  onSuccess,
}: {
  accounts: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account: 'principal',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categories = formData.type === 'income' ? CATEGORIES.income : CATEGORIES.expense

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      // API call would go here
      console.log('Creating transaction:', formData)
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la creation de la transaction'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nouvelle transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            {TRANSACTION_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value, category: '' })}
                  className={cn(
                    "p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition",
                    formData.type === type.value
                      ? type.value === 'income'
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn("w-5 h-5", type.value === 'income' ? 'text-green-600' : 'text-red-600')} />
                  <span className="font-medium">{type.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label>
            <div className="relative">
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-lg font-semibold"
                placeholder="0"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">FCFA</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Selectionner...</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Description de la transaction"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                showShortcuts={false}
                maxDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
              <select
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50",
                formData.type === 'income'
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
