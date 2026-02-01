'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Package,
  DollarSign,
  X,
  Pencil,
  Eye,
  Wheat,
  Pill,
  Bird,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

const SUPPLIER_TYPES = [
  { value: 'feed', label: 'Aliment', icon: Wheat, color: 'bg-amber-100 text-amber-700' },
  { value: 'chicks', label: 'Poussins', icon: Bird, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'veterinary', label: 'Veterinaire', icon: Pill, color: 'bg-red-100 text-red-700' },
  { value: 'equipment', label: 'Equipement', icon: Wrench, color: 'bg-blue-100 text-blue-700' },
  { value: 'other', label: 'Autre', icon: Package, color: 'bg-gray-100 text-gray-700' },
]

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)

  // Fetch suppliers
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/expenses/suppliers')
      return response.data
    },
  })

  // Filter suppliers
  const filteredSuppliers = suppliers?.filter((supplier: any) => {
    const matchesSearch = searchQuery === '' ||
      supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || supplier.supplier_type === selectedType
    return matchesSearch && matchesType
  }) || []

  const getTypeInfo = (type: string) => {
    return SUPPLIER_TYPES.find(t => t.value === type) || SUPPLIER_TYPES[4]
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400 text-xs">Non note</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500">Gestion de vos fournisseurs</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau fournisseur
        </button>
      </div>

      {/* Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {SUPPLIER_TYPES.map((type) => {
          const count = suppliers?.filter((s: any) => s.supplier_type === type.value).length || 0
          return (
            <button
              key={type.value}
              onClick={() => setSelectedType(selectedType === type.value ? 'all' : type.value)}
              className={cn(
                "p-4 rounded-xl border transition text-left",
                selectedType === type.value ? "ring-2 ring-indigo-500" : "hover:bg-gray-50"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", type.color.split(' ')[0])}>
                <type.icon className={cn("w-5 h-5", type.color.split(' ')[1])} />
              </div>
              <p className="font-medium">{type.label}</p>
              <p className="text-sm text-gray-500">{count} fournisseur{count > 1 ? 's' : ''}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Liste des fournisseurs ({filteredSuppliers.length})</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun fournisseur trouve</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:underline"
            >
              Ajouter votre premier fournisseur
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredSuppliers.map((supplier: any) => {
              const typeInfo = getTypeInfo(supplier.supplier_type)

              return (
                <div key={supplier.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", typeInfo.color.split(' ')[0])}>
                      <typeInfo.icon className={cn("w-6 h-6", typeInfo.color.split(' ')[1])} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{supplier.name}</p>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        {supplier.company && (
                          <span>{supplier.company}</span>
                        )}
                        {supplier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </span>
                        )}
                        {supplier.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {supplier.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <p className="text-gray-500">Qualite</p>
                          {renderStars(supplier.quality_rating)}
                        </div>
                        <div>
                          <p className="text-gray-500">Prix</p>
                          {renderStars(supplier.price_rating)}
                        </div>
                        <div>
                          <p className="text-gray-500">Livraison</p>
                          {renderStars(supplier.delivery_rating)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button className="p-2 hover:bg-blue-100 rounded-lg" title="Voir">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSupplier(supplier)
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

      {/* Add Modal */}
      {showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowEditModal(false)
            setEditingSupplier(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingSupplier(null)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}
    </div>
  )
}

// Add Supplier Modal
function AddSupplierModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    phone_2: '',
    email: '',
    address: '',
    city: '',
    supplier_type: 'feed',
    quality_rating: '',
    price_rating: '',
    delivery_rating: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.post('/expenses/suppliers', {
        ...formData,
        quality_rating: formData.quality_rating ? parseFloat(formData.quality_rating) : null,
        price_rating: formData.price_rating ? parseFloat(formData.price_rating) : null,
        delivery_rating: formData.delivery_rating ? parseFloat(formData.delivery_rating) : null,
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la creation du fournisseur'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Nouveau fournisseur</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.supplier_type}
                onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {SUPPLIER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Evaluation (1-5)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Qualite</label>
                <select
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix</label>
                <select
                  value={formData.price_rating}
                  onChange={(e) => setFormData({ ...formData, price_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Livraison</label>
                <select
                  value={formData.delivery_rating}
                  onChange={(e) => setFormData({ ...formData, delivery_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
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
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Supplier Modal
function EditSupplierModal({ supplier, onClose, onSuccess }: { supplier: any; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: supplier.name || '',
    company: supplier.company || '',
    phone: supplier.phone || '',
    phone_2: supplier.phone_2 || '',
    email: supplier.email || '',
    address: supplier.address || '',
    city: supplier.city || '',
    supplier_type: supplier.supplier_type || 'feed',
    quality_rating: supplier.quality_rating?.toString() || '',
    price_rating: supplier.price_rating?.toString() || '',
    delivery_rating: supplier.delivery_rating?.toString() || '',
    notes: supplier.notes || '',
    is_active: supplier.is_active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.patch(`/expenses/suppliers/${supplier.id}`, {
        ...formData,
        quality_rating: formData.quality_rating ? parseFloat(formData.quality_rating) : null,
        price_rating: formData.price_rating ? parseFloat(formData.price_rating) : null,
        delivery_rating: formData.delivery_rating ? parseFloat(formData.delivery_rating) : null,
      })
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la mise a jour du fournisseur'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Modifier le fournisseur</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.supplier_type}
                onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {SUPPLIER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Evaluation (1-5)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Qualite</label>
                <select
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix</label>
                <select
                  value={formData.price_rating}
                  onChange={(e) => setFormData({ ...formData, price_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Livraison</label>
                <select
                  value={formData.delivery_rating}
                  onChange={(e) => setFormData({ ...formData, delivery_rating: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
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
              {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
