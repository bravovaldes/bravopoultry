'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Truck,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  AlertCircle,
  X,
  Eye,
  FileText,
  Filter,
  Download,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'

const ORDER_STATUS = [
  { value: 'pending', label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmee', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  { value: 'shipped', label: 'Expediee', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Livree', icon: Package, color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Annulee', icon: XCircle, color: 'bg-red-100 text-red-700' },
]

const PRODUCT_CATEGORIES = [
  { value: 'feed', label: 'Aliments' },
  { value: 'chicks', label: 'Poussins' },
  { value: 'medicine', label: 'Medicaments' },
  { value: 'equipment', label: 'Equipements' },
  { value: 'other', label: 'Autres' },
]

// Mock data for purchases
const mockPurchases = [
  {
    id: '1',
    order_number: 'PO-2024-001',
    supplier: { id: '1', name: 'Agri Feed Plus', company: 'Agri Feed SARL' },
    category: 'feed',
    items: [
      { name: 'Aliment Demarrage', quantity: 50, unit: 'sacs', unit_price: 15000 },
      { name: 'Aliment Croissance', quantity: 100, unit: 'sacs', unit_price: 14000 },
    ],
    total_amount: 2150000,
    status: 'delivered',
    order_date: '2024-01-15',
    expected_date: '2024-01-20',
    delivery_date: '2024-01-19',
    payment_status: 'paid',
    notes: 'Livraison matinale preferee',
  },
  {
    id: '2',
    order_number: 'PO-2024-002',
    supplier: { id: '2', name: 'VetPharma', company: 'VetPharma Cameroun' },
    category: 'medicine',
    items: [
      { name: 'Vaccin Newcastle', quantity: 20, unit: 'flacons', unit_price: 5000 },
      { name: 'Antibiotique', quantity: 10, unit: 'boites', unit_price: 8000 },
    ],
    total_amount: 180000,
    status: 'shipped',
    order_date: '2024-01-18',
    expected_date: '2024-01-25',
    delivery_date: null,
    payment_status: 'partial',
    notes: '',
  },
  {
    id: '3',
    order_number: 'PO-2024-003',
    supplier: { id: '3', name: 'Poussins Elite', company: 'Elite Chicks Ltd' },
    category: 'chicks',
    items: [
      { name: 'Poussins Chair 1 jour', quantity: 5000, unit: 'unites', unit_price: 500 },
    ],
    total_amount: 2500000,
    status: 'pending',
    order_date: '2024-01-20',
    expected_date: '2024-01-28',
    delivery_date: null,
    payment_status: 'unpaid',
    notes: 'Confirmer disponibilite 48h avant',
  },
  {
    id: '4',
    order_number: 'PO-2024-004',
    supplier: { id: '4', name: 'Agri Equip', company: 'Agri Equipment' },
    category: 'equipment',
    items: [
      { name: 'Mangeoires automatiques', quantity: 10, unit: 'unites', unit_price: 25000 },
      { name: 'Abreuvoirs', quantity: 15, unit: 'unites', unit_price: 18000 },
    ],
    total_amount: 520000,
    status: 'confirmed',
    order_date: '2024-01-22',
    expected_date: '2024-02-01',
    delivery_date: null,
    payment_status: 'unpaid',
    notes: '',
  },
]

export default function PurchasesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Fetch suppliers for dropdown
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/expenses/suppliers')
      return response.data
    },
  })

  // For now, use mock data (API endpoints to be created)
  const purchases = mockPurchases
  const isLoading = false

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch = searchQuery === '' ||
      purchase.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || purchase.status === selectedStatus
    const matchesCategory = selectedCategory === 'all' || purchase.category === selectedCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Stats
  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending').length,
    inTransit: purchases.filter(p => ['confirmed', 'shipped'].includes(p.status)).length,
    delivered: purchases.filter(p => p.status === 'delivered').length,
    totalAmount: purchases.reduce((sum, p) => sum + p.total_amount, 0),
    unpaidAmount: purchases.filter(p => p.payment_status !== 'paid').reduce((sum, p) => sum + p.total_amount, 0),
  }

  const getStatusInfo = (status: string) => {
    return ORDER_STATUS.find(s => s.value === status) || ORDER_STATUS[0]
  }

  const getCategoryLabel = (category: string) => {
    return PRODUCT_CATEGORIES.find(c => c.value === category)?.label || category
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Paye</span>
      case 'partial':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Partiel</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Non paye</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achats</h1>
          <p className="text-gray-500">Gestion des commandes fournisseurs</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Nouvelle commande
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total commandes</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En transit</p>
              <p className="text-xl font-bold">{stats.inTransit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Impaye</p>
              <p className="text-xl font-bold">{formatCurrency(stats.unpaidAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numero ou fournisseur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              {ORDER_STATUS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Toutes categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Commandes ({filteredPurchases.length})</h3>
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande trouvee</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:underline"
            >
              Creer votre premiere commande
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPurchases.map((order) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.color.split(' ')[0])}>
                        <StatusIcon className={cn("w-5 h-5", statusInfo.color.split(' ')[1])} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{order.order_number}</p>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                          {getPaymentBadge(order.payment_status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {order.supplier.name} - {order.supplier.company}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Commande: {formatDate(order.order_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Prevue: {formatDate(order.expected_date)}
                          </span>
                          {order.delivery_date && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Livree: {formatDate(order.delivery_date)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            {order.items.length} article{order.items.length > 1 ? 's' : ''}: {order.items.map(i => i.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                      <p className="text-xs text-gray-500">{getCategoryLabel(order.category)}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 hover:bg-blue-100 rounded-lg"
                          title="Voir details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Bon de commande">
                          <FileText className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddPurchaseModal
          suppliers={suppliers || []}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

// Add Purchase Modal
function AddPurchaseModal({
  suppliers,
  onClose,
  onSuccess,
}: {
  suppliers: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    category: 'feed',
    expected_date: '',
    notes: '',
  })
  const [items, setItems] = useState([
    { name: '', quantity: '', unit: 'sacs', unit_price: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => {
    setItems([...items, { name: '', quantity: '', unit: 'sacs', unit_price: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      // API call would go here
      console.log('Creating purchase order:', { ...formData, items })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la creation de la commande'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouvelle commande</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Selectionner...</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} - {s.company}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date livraison prevue</label>
              <DatePicker
                value={formData.expected_date}
                onChange={(date) => setFormData({ ...formData, expected_date: date })}
                showShortcuts={false}
              />
            </div>
          </div>

          {/* Items */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">Articles</p>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-indigo-600 hover:underline"
              >
                + Ajouter article
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Nom article"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qte"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    >
                      <option value="sacs">Sacs</option>
                      <option value="unites">Unites</option>
                      <option value="kg">Kg</option>
                      <option value="litres">Litres</option>
                      <option value="boites">Boites</option>
                      <option value="flacons">Flacons</option>
                    </select>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Prix unit."
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    disabled={items.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t flex justify-end">
              <p className="text-lg font-semibold">
                Total: {formatCurrency(calculateTotal())}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creation...' : 'Creer commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Order Detail Modal
function OrderDetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  const statusInfo = ORDER_STATUS.find(s => s.value === order.status) || ORDER_STATUS[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Supplier Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Fournisseur</p>
            <p className="font-medium">{order.supplier.name}</p>
            <p className="text-sm text-gray-600">{order.supplier.company}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500">Date commande</p>
              <p className="font-medium text-sm">{formatDate(order.order_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Livraison prevue</p>
              <p className="font-medium text-sm">{formatDate(order.expected_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Livraison effective</p>
              <p className="font-medium text-sm">{order.delivery_date ? formatDate(order.delivery_date) : '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-gray-50">
              <p className="font-medium text-sm">Articles commandes</p>
            </div>
            <div className="divide-y">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="p-3 flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-between">
              <p className="font-semibold">Total</p>
              <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-sm bg-yellow-50 p-2 rounded">{order.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {order.status === 'pending' && (
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Confirmer
              </button>
            )}
            {order.status === 'shipped' && (
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Marquer livree
              </button>
            )}
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
