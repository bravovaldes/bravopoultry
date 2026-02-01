'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { PeriodFilter, getDateRangeFromPeriod } from '@/components/ui/period-filter'
import {
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Plus,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  X,
  Download,
  AlertCircle,
  UserPlus,
  Pencil,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, safeNumber, roundDecimal, multiply } from '@/lib/utils'
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
} from 'recharts'

const CLIENT_TYPES = [
  { value: 'individual', label: 'Particulier', color: '#6366f1' },
  { value: 'retailer', label: 'Detaillant', color: '#22c55e' },
  { value: 'wholesaler', label: 'Grossiste', color: '#f59e0b' },
  { value: 'restaurant', label: 'Restaurant', color: '#ef4444' },
  { value: 'supermarket', label: 'Supermarche', color: '#8b5cf6' },
]

const PRODUCT_TYPES = [
  { value: 'eggs_tray', label: 'Oeufs (plateaux)' },
  { value: 'eggs_carton', label: 'Oeufs (cartons)' },
  { value: 'live_birds', label: 'Volailles vivantes' },
  { value: 'dressed_birds', label: 'Volailles abattues' },
  { value: 'culled_hens', label: 'Poules de reforme' },
  { value: 'manure', label: 'Fiente' },
]

// Get correct unit based on sale type
const getUnitLabel = (saleType: string, storedUnit?: string) => {
  const unitMap: Record<string, string> = {
    'eggs_tray': 'plateau',
    'eggs_carton': 'carton',
    'live_birds': 'tete',
    'dressed_birds': 'tete',
    'culled_hens': 'tete',
    'manure': 'kg',
  }
  return unitMap[saleType] || storedUnit || 'pcs'
}


export default function CommercialPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('sales')
  const [period, setPeriod] = useState('30d')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddSaleModal, setShowAddSaleModal] = useState(false)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedClientIdForSale, setSelectedClientIdForSale] = useState<string>('')

  const { startDate, endDate } = getDateRangeFromPeriod(period)

  // Fetch sales
  const { data: salesData } = useQuery({
    queryKey: ['sales', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/sales?start_date=${startDate}&end_date=${endDate}`)
      return response.data
    },
  })

  const sales = salesData || []

  // Fetch clients from API
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/sales/clients')
      return response.data
    },
  })

  const clients = clientsData || []

  // Calculate stats
  const totalRevenue = roundDecimal(sales.reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0), 2)
  const avgSale = sales.length > 0 ? roundDecimal(totalRevenue / sales.length, 2) : 0
  const clientCount = clients.length
  const totalCredit = roundDecimal(clients.reduce((sum: number, c: any) => sum + safeNumber(c.outstanding_balance), 0), 2)

  // Group sales by date for chart
  const salesByDate = sales.reduce((acc: any, sale: any) => {
    const date = sale.date?.split('T')[0]
    if (!date) return acc
    if (!acc[date]) acc[date] = { date, total: 0, count: 0 }
    acc[date].total = roundDecimal(acc[date].total + safeNumber(sale.total_amount), 2)
    acc[date].count += 1
    return acc
  }, {})
  const salesChartData = Object.values(salesByDate)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(-14)

  // Group by product type (sale_type field from API)
  const salesByProduct = PRODUCT_TYPES.map(type => ({
    name: type.label,
    value: roundDecimal(sales.filter((s: any) => s.sale_type === type.value)
      .reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0), 2)
  })).filter(p => p.value > 0)

  // Group clients by type
  const clientsByType = CLIENT_TYPES.map(type => ({
    name: type.label,
    value: clients.filter((c: any) => c.client_type === type.value).length,
    color: type.color
  })).filter(c => c.value > 0)

  // Calculate client stats from sales
  const getClientStats = (clientId: string) => {
    const clientSales = sales.filter((s: any) => s.client_id === clientId)
    const totalSales = roundDecimal(clientSales.reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0), 2)
    const totalPaid = roundDecimal(clientSales.reduce((sum: number, s: any) => sum + safeNumber(s.amount_paid), 0), 2)
    return {
      total_purchases: totalSales,
      current_balance: roundDecimal(totalSales - totalPaid, 2),
      last_purchase: clientSales[0]?.date,
    }
  }

  // Filter clients
  const filteredClients = clients.filter((c: any) =>
    searchQuery === '' ||
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commercial</h1>
          <p className="text-gray-500">Ventes et gestion des clients</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sales' ? (
            <button
              onClick={() => setShowAddSaleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Nouvelle vente
            </button>
          ) : (
            <button
              onClick={() => setShowAddClientModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Nouveau client
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" onChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="sales" icon={ShoppingCart}>Ventes</TabsTrigger>
            <TabsTrigger value="clients" icon={Users}>Clients</TabsTrigger>
          </TabsList>

          {activeTab === 'sales' && (
            <PeriodFilter value={period} onChange={setPeriod} />
          )}
        </div>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          {/* Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              title="Chiffre d'affaires"
              value={formatCurrency(totalRevenue)}
              icon={DollarSign}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Nombre de ventes"
              value={sales.length}
              icon={ShoppingCart}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Vente moyenne"
              value={formatCurrency(avgSale)}
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              title="Credits en cours"
              value={formatCurrency(totalCredit)}
              icon={CreditCard}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </StatCardGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Evolution des ventes</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="total" name="Montant" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Ventes par produit</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={salesByProduct}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {salesByProduct.map((_, i) => (
                      <Cell key={i} fill={['#22c55e', '#6366f1', '#f59e0b', '#ef4444'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales List */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Ventes recentes</h3>
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <Download className="w-4 h-4" /> Exporter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3 text-right">Quantite</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.slice(0, 10).map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(sale.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{sale.client_name || 'Client anonyme'}</td>
                      <td className="px-4 py-3 text-sm">
                        {PRODUCT_TYPES.find(p => p.value === sale.sale_type)?.label || sale.sale_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{sale.quantity} {getUnitLabel(sale.sale_type, sale.unit)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(sale.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          {/* Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              title="Total clients"
              value={clientCount}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="CA total clients"
              value={formatCurrency(roundDecimal(clients.reduce((s: number, c: any) => s + safeNumber(c.total_purchases), 0), 2))}
              icon={DollarSign}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Credits en cours"
              value={formatCurrency(totalCredit)}
              icon={CreditCard}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Panier moyen"
              value={formatCurrency(clientCount > 0 ? roundDecimal(clients.reduce((s: number, c: any) => s + safeNumber(c.total_purchases), 0) / clientCount, 2) : 0)}
              icon={ShoppingCart}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </StatCardGrid>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Repartition par type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={clientsByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {clientsByType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {clientsByType.map((type) => (
                  <span key={type.name} className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                    {type.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-4 rounded-xl border">
              <h3 className="font-semibold mb-4">Top clients par CA</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[...clients].sort((a: any, b: any) => safeNumber(b.total_purchases) - safeNumber(a.total_purchases)).slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v / 1000000}M`} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total_purchases" name="CA Total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clients List */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Liste des clients ({filteredClients.length})</h3>
            </div>
            {clientsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun client trouve</p>
              </div>
            ) : (
            <div className="divide-y">
              {filteredClients.map((client: any) => {
                const typeInfo = CLIENT_TYPES.find(t => t.value === client.client_type)
                const clientStats = getClientStats(client.id)
                return (
                  <div key={client.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: typeInfo?.color || '#6366f1' }}>
                        {client.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.phone}
                            </span>
                          )}
                          {(client.city || client.address) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {client.city || client.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(clientStats.total_purchases)}</p>
                      <p className="text-xs text-gray-500">
                        {clientStats.current_balance > 0 && (
                          <span className="text-amber-600">Credit: {formatCurrency(clientStats.current_balance)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="ml-4 p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Sale Modal */}
      {showAddSaleModal && (
        <AddSaleModal
          clients={clients}
          initialClientId={selectedClientIdForSale}
          onClose={() => {
            setShowAddSaleModal(false)
            setSelectedClientIdForSale('')
          }}
          onSuccess={() => {
            setShowAddSaleModal(false)
            setSelectedClientIdForSale('')
            queryClient.invalidateQueries({ queryKey: ['sales'] })
          }}
        />
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSuccess={() => {
            setShowAddClientModal(false)
            queryClient.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          sales={sales}
          clients={clients}
          onClose={() => setSelectedClient(null)}
          onClientUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
          }}
          onNewSale={(clientId) => {
            setSelectedClientIdForSale(clientId)
            setSelectedClient(null)
            setShowAddSaleModal(true)
          }}
        />
      )}
    </div>
  )
}

// Add Sale Modal
function AddSaleModal({ clients, onClose, onSuccess, initialClientId = '' }: { clients: any[]; onClose: () => void; onSuccess: () => void; initialClientId?: string }) {
  const queryClient = useQueryClient()
  const initialClient = initialClientId ? clients.find(c => c.id === initialClientId) : null
  const [formData, setFormData] = useState({
    client_id: initialClientId,
    client_email: initialClient?.email || '',
    product_type: 'eggs_tray',
    site_id: '',
    lot_id: '',
    quantity: '',
    unit_price: '',
    unit: 'plateau',
    payment_status: 'pending',
    amount_paid: '',
    payment_method: 'cash',
    deduct_from_stock: true,
    send_invoice_email: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSale, setCreatedSale] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lotSearch, setLotSearch] = useState('')
  const [showAddClientModal, setShowAddClientModal] = useState(false)

  // Multi-price line items
  const [useMultipleLines, setUseMultipleLines] = useState(false)
  const [lineItems, setLineItems] = useState<Array<{quantity: string, unit_price: string}>>([
    { quantity: '', unit_price: '' }
  ])

  // Auto-send email after sale creation if checkbox was checked
  useEffect(() => {
    const autoSendEmail = async () => {
      if (createdSale && createdSale.send_email && createdSale.client_email && !emailSent) {
        setEmailSending(true)
        try {
          await api.post(`/sales/invoice/${createdSale.invoice_number}/send-email`, {
            email: createdSale.client_email
          })
          setEmailSent(true)
          toast.success('Facture envoyee par email avec succes !', {
            description: `Email envoye a ${createdSale.client_email}`
          })
        } catch (err: any) {
          console.error('Error sending email:', err)
          const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email'
          toast.error('Erreur envoi email', { description: errorMessage })
        } finally {
          setEmailSending(false)
        }
      }
    }
    autoSendEmail()
  }, [createdSale, emailSent])

  // Add a new line item
  const addLineItem = () => {
    setLineItems([...lineItems, { quantity: '', unit_price: '' }])
  }

  // Remove a line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  // Update a line item
  const updateLineItem = (index: number, field: 'quantity' | 'unit_price', value: string) => {
    const newItems = [...lineItems]
    newItems[index][field] = value
    setLineItems(newItems)
  }

  // Calculate total from line items
  const lineItemsTotal = lineItems.reduce((sum, item) => {
    const qty = safeNumber(item.quantity)
    const price = safeNumber(item.unit_price)
    return sum + (qty * price)
  }, 0)

  const lineItemsQuantity = lineItems.reduce((sum, item) => sum + safeNumber(item.quantity), 0)

  // Fetch sites with eggs stock - combined endpoint
  const { data: sitesWithStock } = useQuery({
    queryKey: ['sites-eggs-stock'],
    queryFn: async () => {
      // Fetch both endpoints in parallel
      const [sitesRes, stockRes] = await Promise.all([
        api.get('/sites'),
        api.get('/sales/eggs-stock')
      ])

      const sites = sitesRes.data || []
      const stocks = stockRes.data || []

      // Create a map of stock data by site_id
      const stockMap = new Map()
      stocks.forEach((s: any) => stockMap.set(String(s.site_id), s))

      // Merge: for each site with stock, add the site name
      return stocks.map((stock: any) => {
        const site = sites.find((s: any) => String(s.id) === String(stock.site_id))
        return {
          ...stock,
          site_name: site?.name || stock.site_name || `Site ${stock.site_id?.slice(0, 8)}`,
        }
      })
    },
  })

  // Fetch all active lots for bird sales (broiler for live/dressed birds, layer for culled hens)
  const { data: activeLots } = useQuery({
    queryKey: ['active-lots-for-sales'],
    queryFn: async () => {
      // Fetch all active lots and sites with buildings
      const [lotsRes, sitesRes] = await Promise.all([
        api.get('/lots?status=active'),
        api.get('/sites')
      ])
      const lots = lotsRes.data || []
      const sites = sitesRes.data || []

      // Create a map of building_id -> site for faster lookup
      const buildingToSite = new Map()
      sites.forEach((site: any) => {
        (site.buildings || []).forEach((building: any) => {
          buildingToSite.set(String(building.id), { site, building })
        })
      })

      // Enrich lots with site/building info
      return lots.map((lot: any) => {
        const info = buildingToSite.get(String(lot.building_id))
        return {
          ...lot,
          site_name: info?.site?.name || lot.site_name || 'Site',
          building_name: info?.building?.name || lot.building_name || 'Batiment',
          available_birds: lot.current_quantity ?? lot.initial_quantity ?? 0,
          lot_type: lot.type, // broiler or layer
        }
      })
    },
  })

  // Filter lots based on product type and search
  const filteredLots = (activeLots || []).filter((lot: any) => {
    // Filtre par type de produit
    const typeMatch = formData.product_type === 'culled_hens'
      ? (lot.lot_type === 'layer' || lot.type === 'layer')
      : (lot.lot_type === 'broiler' || lot.type === 'broiler')

    if (!typeMatch) return false

    // Filtre par recherche
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

  const eggsStock = sitesWithStock || []
  const isEggsSale = formData.product_type === 'eggs_tray' || formData.product_type === 'eggs_carton'
  const isCartonSale = formData.product_type === 'eggs_carton'
  const isBirdSale = ['live_birds', 'dressed_birds', 'culled_hens'].includes(formData.product_type)
  const selectedSite = eggsStock.find((s: any) => String(s.site_id) === String(formData.site_id))
  const availableStock = selectedSite?.available_trays ?? 0

  // For bird sales
  const selectedLot = activeLots?.find((l: any) => String(l.id) === String(formData.lot_id))
  const availableBirds = selectedLot?.available_birds ?? 0
  const birdsAfterSale = availableBirds - safeNumber(formData.quantity)
  const hasEnoughBirds = safeNumber(formData.quantity) <= availableBirds

  // Calcul du stock: 1 carton = 12 plateaux
  const TRAYS_PER_CARTON = 12
  const quantityNum = safeNumber(formData.quantity)
  const requestedTrays = isCartonSale ? quantityNum * TRAYS_PER_CARTON : quantityNum
  const availableCartons = Math.floor(availableStock / TRAYS_PER_CARTON)
  const stockAfterSale = availableStock - requestedTrays
  const hasEnoughStock = requestedTrays <= availableStock

  // Calculate total based on single price or multiple lines
  const totalAmount = useMultipleLines ? lineItemsTotal : multiply(formData.quantity, formData.unit_price)
  const totalQuantity = useMultipleLines ? lineItemsQuantity : safeNumber(formData.quantity)
  const remainingToPay = roundDecimal(totalAmount - safeNumber(formData.amount_paid), 2)

  // Get client info when selected
  const selectedClient = clients.find(c => c.id === formData.client_id)

  // Check if this is a credit sale (pending or partial payment)
  const isCreditSale = formData.payment_status === 'pending' || formData.payment_status === 'partial'
  const needsRegisteredClient = isCreditSale && !formData.client_id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validate: credit sales require a registered client
    if (isCreditSale && !formData.client_id) {
      setError('Pour une vente a credit, vous devez selectionner un client enregistre. Cela permet de suivre les creances et de les recouvrer.')
      setIsSubmitting(false)
      return
    }

    // Validate line items when using multiple prices
    if (useMultipleLines) {
      const validLines = lineItems.filter(item => safeNumber(item.quantity) > 0 && safeNumber(item.unit_price) > 0)
      if (validLines.length === 0) {
        setError('Veuillez ajouter au moins une ligne de vente avec une quantite et un prix valides.')
        setIsSubmitting(false)
        return
      }
    } else {
      // Validate single price mode
      if (safeNumber(formData.quantity) <= 0) {
        setError('Veuillez entrer une quantite valide.')
        setIsSubmitting(false)
        return
      }
      if (safeNumber(formData.unit_price) <= 0) {
        setError('Veuillez entrer un prix unitaire valide.')
        setIsSubmitting(false)
        return
      }
    }

    // Validate payment amount based on status
    const amountPaid = safeNumber(formData.amount_paid)

    // General validation: amount paid cannot exceed total
    if (amountPaid > totalAmount) {
      setError(`Le montant paye (${formatCurrency(amountPaid)}) ne peut pas depasser le total de la vente (${formatCurrency(totalAmount)}).`)
      setIsSubmitting(false)
      return
    }

    if (formData.payment_status === 'partial') {
      if (amountPaid <= 0) {
        setError('Pour un paiement partiel, le montant paye doit etre superieur a 0.')
        setIsSubmitting(false)
        return
      }
      if (amountPaid >= totalAmount) {
        setError(`Pour un paiement partiel, le montant paye (${formatCurrency(amountPaid)}) doit etre inferieur au total (${formatCurrency(totalAmount)}). Utilisez "Paye" si le montant est complet.`)
        setIsSubmitting(false)
        return
      }
    }

    if (formData.payment_status === 'pending' && amountPaid > 0) {
      setError('Pour un paiement "En attente", le montant paye doit etre 0. Utilisez "Partiel" si un acompte a ete verse.')
      setIsSubmitting(false)
      return
    }

    // Validate stock (1 carton = 12 plateaux)
    if (isEggsSale && formData.deduct_from_stock && formData.site_id) {
      if (!hasEnoughStock) {
        const msg = isCartonSale
          ? `Stock insuffisant. Vous demandez ${requestedTrays} plateaux (${quantityNum} cartons x 12). Disponible: ${availableStock} plateaux (${availableCartons} cartons)`
          : `Stock insuffisant. Disponible: ${availableStock} plateaux`
        setError(msg)
        setIsSubmitting(false)
        return
      }
    }

    // Validate bird stock
    if (isBirdSale && formData.deduct_from_stock && formData.lot_id) {
      if (!hasEnoughBirds) {
        setError(`Stock insuffisant. Vous demandez ${quantityNum} poulets. Disponible: ${availableBirds} poulets`)
        setIsSubmitting(false)
        return
      }
    }

    try {
      const saleData: Record<string, any> = {
        date: new Date().toISOString().split('T')[0],
        sale_type: formData.product_type,
        quantity: useMultipleLines ? totalQuantity : safeNumber(formData.quantity),
        unit_price: useMultipleLines ? (totalAmount / totalQuantity || 0) : safeNumber(formData.unit_price),
        unit: formData.unit,
        payment_status: formData.payment_status,
        amount_paid: safeNumber(formData.amount_paid),
        payment_method: formData.payment_method,
        deduct_from_stock: formData.deduct_from_stock,
      }

      // Add line items for multi-price sales
      if (useMultipleLines && lineItems.length > 0) {
        saleData.line_items = lineItems
          .filter(item => safeNumber(item.quantity) > 0 && safeNumber(item.unit_price) > 0)
          .map(item => ({
            quantity: safeNumber(item.quantity),
            unit_price: safeNumber(item.unit_price),
          }))
      }

      if (formData.client_id) {
        saleData.client_id = formData.client_id
        saleData.client_name = selectedClient?.name
        saleData.client_phone = selectedClient?.phone
      }

      if (formData.site_id) {
        saleData.site_id = formData.site_id
      }

      if (formData.lot_id) {
        saleData.lot_id = formData.lot_id
      }

      const response = await api.post('/sales', saleData)
      setCreatedSale({
        ...response.data,
        send_email: formData.send_invoice_email,
        client_email: formData.client_email || selectedClient?.email,
      })
    } catch (err: any) {
      console.error('Error:', err)
      let message = 'Erreur lors de la creation de la vente'
      if (err.response?.data?.detail) {
        message = typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail)
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Download invoice with authentication
  const downloadInvoice = async (invoiceNumber: string) => {
    try {
      const response = await api.get(`/sales/invoice/${invoiceNumber}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading invoice:', err)
      setError('Erreur lors du telechargement de la facture')
    }
  }

  // Send invoice by email (manual)
  const sendInvoiceByEmail = async (invoiceNumber: string, email: string) => {
    setEmailSending(true)
    try {
      await api.post(`/sales/invoice/${invoiceNumber}/send-email`, { email })
      setEmailSent(true)
      toast.success('Facture envoyee par email avec succes !', {
        description: `Email envoye a ${email}`
      })
    } catch (err: any) {
      console.error('Error sending email:', err)
      const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email'
      toast.error('Erreur envoi email', { description: errorMessage })
    } finally {
      setEmailSending(false)
    }
  }

  // Success view with invoice download
  if (createdSale) {
    const clientEmail = createdSale.client_email || selectedClient?.email
    const showEmailButton = clientEmail && !emailSent && !createdSale.send_email
    const isAutoSending = createdSale.send_email && emailSending && !emailSent

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Vente enregistree !</h2>
          <p className="text-gray-600 mb-4">
            Facture N° {createdSale.invoice_number}
          </p>
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(createdSale.total_amount)}</p>
          </div>

          {/* Email status */}
          {isAutoSending && (
            <div className="flex items-center justify-center gap-2 p-3 bg-indigo-50 rounded-lg mb-4 text-indigo-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Envoi de la facture par email...</span>
            </div>
          )}
          {emailSent && (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg mb-4 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>Facture envoyee a {clientEmail}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => downloadInvoice(createdSale.invoice_number)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
                  showEmailButton ? "flex-1" : "w-full"
                )}
              >
                <Download className="w-4 h-4" />
                Telecharger
              </button>
              {showEmailButton && (
                <button
                  onClick={() => sendInvoiceByEmail(createdSale.invoice_number, clientEmail)}
                  disabled={emailSending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {emailSending ? 'Envoi...' : 'Envoyer par email'}
                </button>
              )}
            </div>
            <button
              onClick={() => { onSuccess(); setEmailSent(false); }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle vente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Client */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Client</label>
              <button
                type="button"
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Nouveau client
              </button>
            </div>
            <select
              value={formData.client_id}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value)
                setFormData({
                  ...formData,
                  client_id: e.target.value,
                  client_email: client?.email || ''
                })
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">-- Aucun client (anonyme) --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `- ${c.phone}` : ''}</option>
              ))}
            </select>
            {formData.client_id && selectedClient && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedClient.phone && `Tel: ${selectedClient.phone}`}
                {selectedClient.email && ` • Email: ${selectedClient.email}`}
              </p>
            )}
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type de produit</label>
            <select
              value={formData.product_type}
              onChange={(e) => {
              const newType = e.target.value
              // Set unit based on product type
              const unitMap: Record<string, string> = {
                'eggs_tray': 'plateau',
                'eggs_carton': 'carton',
                'live_birds': 'tete',
                'dressed_birds': 'tete',
                'culled_hens': 'tete',
                'manure': 'kg',
              }
              setFormData({ ...formData, product_type: newType, site_id: '', lot_id: '', unit: unitMap[newType] || 'pcs' })
            }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="eggs_tray">Oeufs (plateaux)</option>
              <option value="eggs_carton">Oeufs (cartons)</option>
              <option value="live_birds">Volailles vivantes</option>
              <option value="dressed_birds">Volailles abattues</option>
              <option value="culled_hens">Poules de reforme</option>
              <option value="manure">Fiente</option>
            </select>
          </div>

          {/* Site selection for eggs */}
          {isEggsSale && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Site source (optionnel)</label>
                <select
                  value={formData.site_id}
                  onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Selectionner un site</option>
                  {eggsStock?.map((site: any) => {
                    const siteCartons = Math.floor((site.available_trays || 0) / 12)
                    return (
                      <option key={site.site_id} value={site.site_id}>
                        {site.site_name} - {site.available_trays || 0} plateaux ({siteCartons} cartons)
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Feedback visuel du stock disponible */}
              {formData.site_id && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">Stock disponible:</span>
                    <span className="text-sm font-bold text-blue-900">
                      {availableStock} plateaux ({availableCartons} cartons)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deduct_stock"
                      checked={formData.deduct_from_stock}
                      onChange={(e) => setFormData({ ...formData, deduct_from_stock: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="deduct_stock" className="text-sm text-blue-700">
                      Deduire du stock apres la vente
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Lot selection for birds */}
          {isBirdSale && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Lot source (optionnel)</label>
                {activeLots && activeLots.length > 5 && (
                  <input
                    type="text"
                    placeholder="Rechercher un lot..."
                    value={lotSearch}
                    onChange={(e) => setLotSearch(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
                  />
                )}
                <select
                  value={formData.lot_id}
                  onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  size={filteredLots?.length > 5 ? 4 : 1}
                >
                  <option value="">Selectionner un lot</option>
                  {filteredLots?.map((lot: any) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.name || lot.code || `Lot ${lot.id?.slice(0, 8)}`} - {lot.site_name} / {lot.building_name} - {lot.available_birds} {formData.product_type === 'culled_hens' ? 'poules' : 'poulets'}
                    </option>
                  ))}
                </select>
                {(!filteredLots || filteredLots.length === 0) && activeLots && activeLots.length > 0 && lotSearch && (
                  <p className="text-sm text-gray-500 mt-1">
                    Aucun lot ne correspond a "{lotSearch}"
                  </p>
                )}
                {(!activeLots || activeLots.length === 0) && (
                  <p className="text-sm text-amber-600 mt-1">
                    Aucun lot {formData.product_type === 'culled_hens' ? 'de pondeuses' : 'de poulets de chair'} actif trouve
                  </p>
                )}
              </div>

              {/* Feedback visuel du stock de poulets */}
              {formData.lot_id && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">Stock disponible:</span>
                    <span className="text-sm font-bold text-blue-900">
                      {availableBirds} poulets
                    </span>
                  </div>
                  <div className="text-xs text-blue-600">
                    {selectedLot?.site_name} / {selectedLot?.building_name}
                    {selectedLot?.breed && ` - ${selectedLot.breed}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deduct_bird_stock"
                      checked={formData.deduct_from_stock}
                      onChange={(e) => setFormData({ ...formData, deduct_from_stock: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="deduct_bird_stock" className="text-sm text-blue-700">
                      Deduire du stock apres la vente
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Toggle for multiple prices */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Prix multiples</p>
              <p className="text-xs text-gray-500">Activer si vous vendez a des prix differents</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUseMultipleLines(!useMultipleLines)
                if (!useMultipleLines) {
                  // Reset line items when enabling
                  setLineItems([{ quantity: '', unit_price: '' }])
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                useMultipleLines ? "bg-green-500" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  useMultipleLines ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Single Price Mode */}
          {!useMultipleLines && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantite ({isCartonSale ? 'cartons' : isEggsSale ? 'plateaux' : isBirdSale ? 'poulets' : 'unites'})
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg",
                    (isEggsSale && formData.site_id && formData.deduct_from_stock && quantityNum > 0 && !hasEnoughStock)
                      ? "border-red-500 bg-red-50"
                      : (isBirdSale && formData.lot_id && formData.deduct_from_stock && quantityNum > 0 && !hasEnoughBirds)
                        ? "border-red-500 bg-red-50"
                        : ""
                  )}
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prix unitaire (FCFA)</label>
                <input
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  required
                />
              </div>
            </div>
          )}

          {/* Multiple Prices Mode */}
          {useMultipleLines && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lignes de vente</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="Quantite"
                        min="0"
                      />
                    </div>
                    <span className="text-gray-400">×</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="Prix unitaire"
                        min="0"
                      />
                    </div>
                    <span className="text-gray-400">=</span>
                    <div className="w-24 text-right font-medium text-sm">
                      {formatCurrency(safeNumber(item.quantity) * safeNumber(item.unit_price))}
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary for multi-line */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Quantite totale:</span>
                  <span className="font-medium text-blue-800">{lineItemsQuantity} {isEggsSale ? 'plateaux' : 'unites'}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-blue-700">Total:</span>
                  <span className="font-bold text-blue-800">{formatCurrency(lineItemsTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback visuel en temps reel pour les oeufs */}
          {isEggsSale && formData.site_id && formData.deduct_from_stock && quantityNum > 0 && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              hasEnoughStock ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              {isCartonSale && (
                <div className="flex justify-between mb-1">
                  <span className={hasEnoughStock ? "text-green-700" : "text-red-700"}>
                    {quantityNum} carton{quantityNum > 1 ? 's' : ''} = {requestedTrays} plateaux
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={hasEnoughStock ? "text-green-700" : "text-red-700"}>
                  {hasEnoughStock ? '✓' : '✗'} Stock demande: {requestedTrays} plateaux
                </span>
                {hasEnoughStock ? (
                  <span className="text-green-700 font-medium">
                    Reste apres vente: {stockAfterSale} plateaux
                  </span>
                ) : (
                  <span className="text-red-700 font-medium">
                    Manque: {Math.abs(stockAfterSale)} plateaux
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Feedback visuel en temps reel pour les poulets */}
          {isBirdSale && formData.lot_id && formData.deduct_from_stock && quantityNum > 0 && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              hasEnoughBirds ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              <div className="flex justify-between">
                <span className={hasEnoughBirds ? "text-green-700" : "text-red-700"}>
                  {hasEnoughBirds ? '✓' : '✗'} Stock demande: {quantityNum} poulets
                </span>
                {hasEnoughBirds ? (
                  <span className="text-green-700 font-medium">
                    Reste apres vente: {birdsAfterSale} poulets
                  </span>
                ) : (
                  <span className="text-red-700 font-medium">
                    Manque: {Math.abs(birdsAfterSale)} poulets
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Statut paiement</label>
              <select
                value={formData.payment_status}
                onChange={(e) => {
                  const newStatus = e.target.value
                  // Auto-fill amount based on status
                  let newAmountPaid = formData.amount_paid
                  if (newStatus === 'paid') {
                    // Auto-fill with total amount
                    newAmountPaid = String(totalAmount)
                  } else if (newStatus === 'pending') {
                    // Clear amount paid
                    newAmountPaid = '0'
                  }
                  // For 'partial', keep current value
                  setFormData({ ...formData, payment_status: newStatus, amount_paid: newAmountPaid })
                }}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg",
                  needsRegisteredClient && "border-amber-500 bg-amber-50"
                )}
              >
                <option value="paid">Paye</option>
                <option value="pending">En attente</option>
                <option value="partial">Partiel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Montant paye
                {formData.payment_status === 'partial' && <span className="text-amber-600 ml-1">(acompte)</span>}
              </label>
              <input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => {
                  const value = safeNumber(e.target.value)
                  // Cap the value at total amount
                  if (value > totalAmount) {
                    setFormData({ ...formData, amount_paid: String(totalAmount) })
                  } else {
                    setFormData({ ...formData, amount_paid: e.target.value })
                  }
                }}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg",
                  formData.payment_status !== 'partial' && "bg-gray-100 text-gray-500",
                  safeNumber(formData.amount_paid) > totalAmount && "border-red-500 bg-red-50"
                )}
                min="0"
                max={totalAmount}
                disabled={formData.payment_status !== 'partial'}
                placeholder={formData.payment_status === 'partial' ? 'Entrez le montant de l\'acompte' : ''}
              />
              {formData.payment_status === 'paid' && (
                <p className="text-xs text-green-600 mt-1">Total paye automatiquement</p>
              )}
              {formData.payment_status === 'pending' && (
                <p className="text-xs text-gray-500 mt-1">Aucun paiement recu</p>
              )}
              {formData.payment_status === 'partial' && totalAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(totalAmount - 1)}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mode de paiement</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="cash">Especes</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Virement bancaire</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Warning for credit sales without registered client */}
          {needsRegisteredClient && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
              <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Client enregistre requis</p>
                <p className="text-xs text-amber-700 mt-1">
                  Pour une vente a credit (paiement en attente ou partiel), vous devez selectionner un client enregistre dans la liste ci-dessus.
                  Cela permet de suivre les creances et facilite le recouvrement.
                </p>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_status: 'paid' })}
                  className="mt-2 text-xs text-amber-700 underline hover:text-amber-900"
                >
                  Ou changer le statut en "Paye"
                </button>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(totalAmount)}</span>
            </div>
            {safeNumber(formData.amount_paid) > 0 && remainingToPay > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reste a payer</span>
                <span className="text-amber-600 font-medium">{formatCurrency(remainingToPay)}</span>
              </div>
            )}
          </div>

          {/* Email option */}
          {(formData.client_email || selectedClient?.email) && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
              <input
                type="checkbox"
                id="send_email"
                checked={formData.send_invoice_email}
                onChange={(e) => setFormData({ ...formData, send_invoice_email: e.target.checked })}
                className="w-4 h-4 text-indigo-600"
              />
              <label htmlFor="send_email" className="text-sm">
                <Mail className="w-4 h-4 inline mr-1" />
                Envoyer la facture par email a {formData.client_email || selectedClient?.email}
              </label>
            </div>
          )}

          {/* Error message - near the button */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer et generer facture'}
            </button>
          </div>
        </form>
      </div>

      {/* Inline Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            setShowAddClientModal(false)
          }}
        />
      )}
    </div>
  )
}

// Add Client Modal
function AddClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    client_type: 'individual',
    phone: '',
    email: '',
    address: '',
    city: '',
    credit_limit: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      // Build clean data - only include non-empty fields
      const cleanData: Record<string, any> = {
        name: formData.name,
      }
      if (formData.client_type) cleanData.client_type = formData.client_type
      if (formData.phone) cleanData.phone = formData.phone
      if (formData.email) cleanData.email = formData.email
      if (formData.address) cleanData.address = formData.address
      if (formData.city) cleanData.city = formData.city
      if (formData.credit_limit) cleanData.credit_limit = safeNumber(formData.credit_limit)
      cleanData.payment_terms_days = 0

      console.log('Sending client data:', cleanData)
      await api.post('/sales/clients', cleanData)
      onSuccess()
    } catch (err: any) {
      console.error('Error creating client:', err)
      let message = 'Erreur lors de la creation du client'
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          message = detail
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors
          message = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
        } else if (typeof detail === 'object') {
          message = detail.msg || detail.message || JSON.stringify(detail)
        }
      } else if (err.message) {
        message = err.message
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouveau client</h2>
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limite de credit (FCFA)</label>
            <input
              type="number"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              min="0"
            />
          </div>

          {/* Error message - near the button */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Client Modal
function EditClientModal({ client, onClose, onSuccess }: { client: any; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: client.name || '',
    client_type: client.client_type || 'individual',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    city: client.city || '',
    credit_limit: client.credit_limit || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const cleanData: Record<string, any> = {
        name: formData.name,
      }
      if (formData.client_type) cleanData.client_type = formData.client_type
      if (formData.phone) cleanData.phone = formData.phone
      if (formData.email) cleanData.email = formData.email
      if (formData.address) cleanData.address = formData.address
      if (formData.city) cleanData.city = formData.city
      if (formData.credit_limit) cleanData.credit_limit = safeNumber(formData.credit_limit)

      await api.patch(`/sales/clients/${client.id}`, cleanData)
      onSuccess()
    } catch (err: any) {
      console.error('Error updating client:', err)
      let message = 'Erreur lors de la modification'
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          message = detail
        } else if (Array.isArray(detail)) {
          message = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
        }
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Modifier le client</h2>
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
              <label className="block text-sm font-medium mb-1">Telephone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limite de credit (FCFA)</label>
            <input
              type="number"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              min="0"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Client Detail Modal with payment functionality
function ClientDetailModal({ client, sales, onClose, onClientUpdated, clients, onNewSale }: { client: any; sales: any[]; onClose: () => void; onClientUpdated?: () => void; clients?: any[]; onNewSale?: (clientId: string) => void }) {
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)
  const typeInfo = CLIENT_TYPES.find(t => t.value === client.client_type)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastPaymentResult, setLastPaymentResult] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Calculate client stats from all sales
  const clientSales = sales?.filter((s: any) => s.client_id === client.id) || []
  const totalPurchases = roundDecimal(clientSales.reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0), 2)
  const totalPaid = roundDecimal(clientSales.reduce((sum: number, s: any) => sum + safeNumber(s.amount_paid), 0), 2)
  const currentBalance = roundDecimal(totalPurchases - totalPaid, 2)

  // Fetch client's unpaid sales
  const { data: unpaidSales } = useQuery({
    queryKey: ['client-unpaid-sales', client.id],
    queryFn: async () => {
      const response = await api.get(`/sales?client_id=${client.id}&payment_status=pending`)
      const pending = response.data || []
      const partialResponse = await api.get(`/sales?client_id=${client.id}&payment_status=partial`)
      const partial = partialResponse.data || []
      return [...pending, ...partial]
    },
  })

  const totalUnpaid = roundDecimal(unpaidSales?.reduce((sum: number, s: any) => {
    const remaining = safeNumber(s.total_amount) - safeNumber(s.amount_paid)
    return sum + remaining
  }, 0) || 0, 2)

  // Download invoice
  const downloadInvoice = async (invoiceNumber: string) => {
    try {
      const response = await api.get(`/sales/invoice/${invoiceNumber}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading invoice:', err)
      toast.error('Erreur lors du telechargement de la facture')
    }
  }

  // Send updated invoice by email
  const sendInvoiceEmail = async (invoiceNumber: string) => {
    if (!client.email) {
      toast.error('Le client n\'a pas d\'adresse email')
      return
    }
    setEmailSending(true)
    try {
      await api.post(`/sales/invoice/${invoiceNumber}/send-email`, { email: client.email })
      setEmailSent(true)
      toast.success('Facture envoyee par email', {
        description: `Email envoye a ${client.email}`
      })
    } catch (err: any) {
      console.error('Error sending email:', err)
      const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email'
      toast.error(errorMessage)
    } finally {
      setEmailSending(false)
    }
  }

  const handleRecordPayment = async (saleId: string, amount: number, invoiceNumber?: string) => {
    setIsSubmitting(true)
    setLastPaymentResult(null)
    setEmailSent(false) // Reset email sent state for new payment
    try {
      const response = await api.post(`/sales/${saleId}/payment?amount=${amount}&payment_method=${paymentMethod}`)
      const result = response.data
      queryClient.invalidateQueries({ queryKey: ['client-unpaid-sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setPaymentAmount('')
      setShowPaymentForm(false)

      // Show success with invoice download option
      setLastPaymentResult({
        success: true,
        amount: amount,
        invoiceNumber: result.invoice_number || invoiceNumber,
        status: result.status,
        remaining: result.remaining,
      })
      toast.success('Paiement enregistre avec succes')
    } catch (err: any) {
      console.error('Error recording payment:', err)
      const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'enregistrement du paiement'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Details client</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Modifier le client"
            >
              <Pencil className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: typeInfo?.color || '#6366f1' }}>
              {client.name?.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-semibold">{client.name}</p>
              <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: `${typeInfo?.color}20`, color: typeInfo?.color }}>
                {typeInfo?.label || 'Client'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">CA Total</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalPurchases)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Solde du</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(currentBalance)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                {client.phone}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                {client.email}
              </div>
            )}
            {(client.city || client.address) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                {client.city || client.address}
              </div>
            )}
            {client.credit_limit && (
              <div className="text-sm text-gray-500">
                Limite de credit: {formatCurrency(safeNumber(client.credit_limit))}
              </div>
            )}
          </div>

          {/* Payment success feedback */}
          {lastPaymentResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">Paiement enregistre !</p>
                  <p className="text-sm text-green-600">
                    {formatCurrency(lastPaymentResult.amount)} - {lastPaymentResult.status === 'paid' ? 'Solde' : 'Partiel'}
                  </p>
                </div>
              </div>
              {lastPaymentResult.remaining > 0 && (
                <p className="text-sm text-amber-600 mb-2">
                  Reste a payer: {formatCurrency(lastPaymentResult.remaining)}
                </p>
              )}

              {/* Email sent confirmation */}
              {emailSent && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg mb-2 text-indigo-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Facture envoyee a {client.email}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadInvoice(lastPaymentResult.invoiceNumber)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Telecharger
                  </button>
                  {client.email && !emailSent && (
                    <button
                      onClick={() => sendInvoiceEmail(lastPaymentResult.invoiceNumber)}
                      disabled={emailSending}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {emailSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Envoyer par email
                        </>
                      )}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setLastPaymentResult(null); setEmailSent(false); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Unpaid invoices section */}
          {unpaidSales && unpaidSales.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Factures impayees ({unpaidSales.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unpaidSales.map((sale: any) => {
                  const remaining = roundDecimal(safeNumber(sale.total_amount) - safeNumber(sale.amount_paid), 2)
                  return (
                    <div key={sale.id} className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{sale.invoice_number}</p>
                          <p className="text-xs text-gray-500">{formatDate(sale.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-600">{formatCurrency(remaining)}</p>
                          <p className="text-xs text-gray-500">sur {formatCurrency(sale.total_amount)}</p>
                        </div>
                      </div>
                      {/* Progress bar for partial payments */}
                      {safeNumber(sale.amount_paid) > 0 && (
                        <div className="mt-2 mb-2">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${roundDecimal((safeNumber(sale.amount_paid) / safeNumber(sale.total_amount)) * 100, 1)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Deja paye: {formatCurrency(sale.amount_paid)}
                          </p>
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => downloadInvoice(sale.invoice_number)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          title="Telecharger la facture"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRecordPayment(sale.id, remaining, sale.invoice_number)}
                          disabled={isSubmitting}
                          className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Payer tout
                        </button>
                        <button
                          onClick={() => {
                            const amount = prompt(`Montant a payer (max ${formatCurrency(remaining)}):`)
                            if (amount && safeNumber(amount) > 0) {
                              handleRecordPayment(sale.id, Math.min(safeNumber(amount), remaining), sale.invoice_number)
                            }
                          }}
                          disabled={isSubmitting}
                          className="flex-1 px-2 py-1 text-xs border border-green-600 text-green-600 rounded hover:bg-green-50 disabled:opacity-50"
                        >
                          Partiel
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Membre depuis: {client.created_at ? formatDate(client.created_at) : '-'}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onNewSale?.(client.id)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Nouvelle vente
              </button>
              {totalUnpaid > 0 && (
                <button
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Enregistrer paiement
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <EditClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            onClientUpdated?.()
          }}
        />
      )}
    </div>
  )
}
