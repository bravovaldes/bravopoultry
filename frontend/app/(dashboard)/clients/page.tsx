'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  DollarSign,
  X,
  Pencil,
  Trash2,
  Eye,
  Filter,
  Building,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

const CLIENT_TYPES = [
  { value: 'individual', label: 'Particulier', color: 'bg-blue-100 text-blue-700' },
  { value: 'retailer', label: 'Detaillant', color: 'bg-green-100 text-green-700' },
  { value: 'wholesaler', label: 'Grossiste', color: 'bg-purple-100 text-purple-700' },
  { value: 'restaurant', label: 'Restaurant', color: 'bg-orange-100 text-orange-700' },
  { value: 'supermarket', label: 'Supermarche', color: 'bg-pink-100 text-pink-700' },
]

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/sales/clients')
      return response.data
    },
  })

  // Fetch sales for stats
  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await api.get('/sales')
      return response.data
    },
  })

  // Filter clients
  const filteredClients = clients?.filter((client: any) => {
    const matchesSearch = searchQuery === '' ||
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)
    const matchesType = selectedType === 'all' || client.client_type === selectedType
    return matchesSearch && matchesType
  }) || []

  // Calculate client stats from sales
  const getClientStats = (clientId: string) => {
    const clientSales = sales?.filter((s: any) => s.client_id === clientId) || []
    return {
      totalSales: clientSales.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0),
      totalPaid: clientSales.reduce((sum: number, s: any) => sum + parseFloat(s.amount_paid || 0), 0),
      orderCount: clientSales.length,
      lastOrder: clientSales[0]?.date,
    }
  }

  // Global stats
  const globalStats = {
    totalClients: clients?.length || 0,
    activeClients: clients?.filter((c: any) => c.is_active).length || 0,
    totalCredit: clients?.reduce((sum: number, c: any) => {
      const stats = getClientStats(c.id)
      return sum + (stats.totalSales - stats.totalPaid)
    }, 0) || 0,
  }

  const getTypeInfo = (type: string) => {
    return CLIENT_TYPES.find(t => t.value === type) || CLIENT_TYPES[0]
  }

  const handleViewClient = (client: any) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">Gestion de votre portefeuille clients</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau client
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Total clients</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{globalStats.totalClients}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-500">Clients actifs</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{globalStats.activeClients}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-500">Creances totales</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(globalStats.totalCredit)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-500">Types</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{CLIENT_TYPES.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, entreprise ou telephone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les types</option>
            {CLIENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Liste des clients ({filteredClients.length})</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun client trouve</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Ajouter votre premier client
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredClients.map((client: any) => {
              const typeInfo = getTypeInfo(client.client_type)
              const stats = getClientStats(client.id)
              const hasCredit = stats.totalSales > stats.totalPaid

              return (
                <div key={client.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {client.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                        {hasCredit && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                            Credit
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        {client.company && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {client.company}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
                      <p className="text-xs text-gray-500">{stats.orderCount} commandes</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="p-2 hover:bg-blue-100 rounded-lg"
                        title="Voir details"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingClient(client)
                          setShowEditModal(true)
                        }}
                        className="p-2 hover:bg-amber-100 rounded-lg"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4 text-amber-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}

      {/* Client Detail Modal */}
      {showDetailModal && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          stats={getClientStats(selectedClient.id)}
          sales={sales?.filter((s: any) => s.client_id === selectedClient.id) || []}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedClient(null)
          }}
        />
      )}

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => {
            setShowEditModal(false)
            setEditingClient(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingClient(null)
            queryClient.invalidateQueries({ queryKey: ['clients'] })
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
    company: '',
    phone: '',
    phone_2: '',
    email: '',
    address: '',
    city: '',
    client_type: 'individual',
    credit_limit: '',
    payment_terms_days: '0',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.post('/sales/clients', {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        payment_terms_days: parseInt(formData.payment_terms_days),
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la creation du client'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouveau client</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone 2</label>
              <input
                type="tel"
                value={formData.phone_2}
                onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.client_type}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CLIENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite credit</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delai paiement (jours)</label>
              <select
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="0">Comptant</option>
                <option value="7">7 jours</option>
                <option value="15">15 jours</option>
                <option value="30">30 jours</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
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

// Client Detail Modal
function ClientDetailModal({ client, stats, sales, onClose }: { client: any; stats: any; sales: any[]; onClose: () => void }) {
  const typeInfo = CLIENT_TYPES.find(t => t.value === client.client_type) || CLIENT_TYPES[0]
  const credit = stats.totalSales - stats.totalPaid

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {client.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{client.name}</h2>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeInfo.color)}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {client.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-gray-400" />
                <span>{client.company}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{client.email}</span>
              </div>
            )}
            {client.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{client.city}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSales)}</p>
              <p className="text-sm text-gray-500">Total achats</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-sm text-gray-500">Total paye</p>
            </div>
            <div className={cn("p-4 rounded-lg text-center", credit > 0 ? "bg-amber-50" : "bg-gray-50")}>
              <p className={cn("text-2xl font-bold", credit > 0 ? "text-amber-600" : "text-gray-600")}>
                {formatCurrency(credit)}
              </p>
              <p className="text-sm text-gray-500">Creance</p>
            </div>
          </div>

          {/* Recent Sales */}
          <div>
            <h3 className="font-semibold mb-3">Historique des achats ({sales.length})</h3>
            {sales.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Montant</th>
                      <th className="text-center p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.slice(0, 10).map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="p-3">{formatDate(sale.date)}</td>
                        <td className="p-3">{sale.sale_type}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(parseFloat(sale.total_amount))}</td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            sale.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {sale.payment_status === 'paid' ? 'Paye' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Aucun achat</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Client Modal
function EditClientModal({ client, onClose, onSuccess }: { client: any; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: client.name || '',
    company: client.company || '',
    phone: client.phone || '',
    phone_2: client.phone_2 || '',
    email: client.email || '',
    address: client.address || '',
    city: client.city || '',
    client_type: client.client_type || 'individual',
    credit_limit: client.credit_limit?.toString() || '',
    payment_terms_days: client.payment_terms_days?.toString() || '0',
    notes: client.notes || '',
    is_active: client.is_active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.patch(`/sales/clients/${client.id}`, {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        payment_terms_days: parseInt(formData.payment_terms_days),
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la mise a jour du client'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Modifier le client</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone 2</label>
              <input
                type="tel"
                value={formData.phone_2}
                onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.client_type}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CLIENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite credit</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delai paiement (jours)</label>
              <select
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="0">Comptant</option>
                <option value="7">7 jours</option>
                <option value="15">15 jours</option>
                <option value="30">30 jours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
