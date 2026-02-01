'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { ArrowLeft, MapPin, Save, Building2, Navigation, FileText, Tag, Users, Globe, Map, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SuccessScreen } from '@/components/ui/success-screen'

export default function NewSitePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    region: '',
    country: 'Cameroun',
    gps_latitude: '',
    gps_longitude: '',
    total_capacity: '',
    notes: '',
  })

  const createSite = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/sites', {
        ...data,
        organization_id: user?.organization_id,
        gps_latitude: data.gps_latitude ? parseFloat(data.gps_latitude) : null,
        gps_longitude: data.gps_longitude ? parseFloat(data.gps_longitude) : null,
        total_capacity: data.total_capacity ? parseInt(data.total_capacity) : null,
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Site cree avec succes!')
      setSuccess(true)
      setError('')
      setTimeout(() => {
        router.push(`/sites/${data.id}`)
      }, 1000)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la creation'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Le nom du site est requis')
      return
    }
    createSite.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (success) {
    return <SuccessScreen title="Site créé avec succès!" />
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/sites"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau Site</h1>
            <p className="text-sm text-gray-500">Ajoutez un nouveau site de production</p>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center font-medium">1</div>
            <span className="font-medium text-gray-900">Informations</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-medium">2</div>
            <span className="text-gray-500">Localisation</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-medium">3</div>
            <span className="text-gray-500">Validation</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-orange-50 px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              Informations generales
            </h2>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Nom du site <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Ferme Douala Nord"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  Code interne
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Ex: FDN-01"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  Capacite totale
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="total_capacity"
                    value={formData.total_capacity}
                    onChange={handleChange}
                    placeholder="10000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">oiseaux</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-blue-50 px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Localisation
            </h2>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Map className="w-3.5 h-3.5 text-gray-400" />
                Adresse complete
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Numero, rue, quartier..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Douala"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Region
                </label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Littoral"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  Pays
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors text-sm"
                >
                  <option value="Cameroun">Cameroun</option>
                  <option value="Senegal">Senegal</option>
                  <option value="Cote d'Ivoire">Cote d'Ivoire</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Mali">Mali</option>
                  <option value="Niger">Niger</option>
                  <option value="Benin">Benin</option>
                  <option value="Togo">Togo</option>
                  <option value="Gabon">Gabon</option>
                  <option value="Congo">Congo</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Coordonnees GPS</span>
                <span className="text-xs text-gray-400">(optionnel)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Latitude</label>
                  <input
                    type="text"
                    name="gps_latitude"
                    value={formData.gps_latitude}
                    onChange={handleChange}
                    placeholder="4.0511"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Longitude</label>
                  <input
                    type="text"
                    name="gps_longitude"
                    value={formData.gps_longitude}
                    onChange={handleChange}
                    placeholder="9.7679"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-colors text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              Notes supplementaires
            </h2>
          </div>

          <div className="p-5">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Informations complementaires sur le site (equipements, acces, contacts...)..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 focus:bg-white transition-colors resize-none"
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

        {/* Actions */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="text-red-500">*</span> Champs obligatoires
            </p>
            <div className="flex gap-3">
              <Link
                href="/sites"
                className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-600"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={createSite.isPending}
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition shadow-sm disabled:opacity-50"
              >
                {createSite.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creation...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Creer le site
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
