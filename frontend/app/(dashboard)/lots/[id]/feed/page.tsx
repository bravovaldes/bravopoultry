'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Wheat, Bird, CheckCircle, AlertCircle, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, getTodayInTimezone } from '@/lib/utils'
import { FEED_TYPES } from '@/lib/constants'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'

export default function FeedPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string
  const timezone = useTimezone()

  const initialDate = searchParams.get('date') || getTodayInTimezone(timezone)

  const [formData, setFormData] = useState({
    date: initialDate,
    feed_quantity_kg: '',
    feed_type: '',
    feed_stock_id: '',
    deduct_from_stock: false,
  })

  const [success, setSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState('')

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
  })

  // Check if data exists for selected date
  const { data: existingEntry } = useQuery({
    queryKey: ['daily-entry', lotId, formData.date],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/daily-entry/${formData.date}`)
      return response.data
    },
    enabled: !!lotId && !!formData.date,
  })

  // Fetch available feed stocks for this lot's building
  const { data: feedStocks } = useQuery({
    queryKey: ['feed-stocks-for-lot', lot?.building_id],
    queryFn: async () => {
      const response = await api.get('/feed/stock/all', {
        params: { building_id: lot?.building_id }
      })
      return response.data
    },
    enabled: !!lot?.building_id,
  })

  // Load existing data when found
  useEffect(() => {
    if (existingEntry?.exists && existingEntry?.data?.feed) {
      const feed = existingEntry.data.feed
      setFormData(prev => ({
        ...prev,
        feed_quantity_kg: feed.quantity_kg?.toString() || '',
        feed_type: feed.feed_type || '',
      }))
      setIsEditMode(true)
    } else {
      setIsEditMode(false)
    }
  }, [existingEntry])

  const submitEntry = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        date: data.date,
        feed_quantity_kg: parseFloat(data.feed_quantity_kg),
        feed_type: data.feed_type || null,
      }

      // Add stock deduction fields if enabled
      if (data.deduct_from_stock && data.feed_stock_id) {
        payload.deduct_from_stock = true
        payload.feed_stock_id = data.feed_stock_id
      }

      if (isEditMode) {
        const response = await api.put(`/lots/${lotId}/daily-entry`, payload)
        return response.data
      } else {
        const response = await api.post(`/lots/${lotId}/daily-entry`, payload)
        return response.data
      }
    },
    onSuccess: () => {
      setSuccess(true)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lot-history', lotId] })
      queryClient.invalidateQueries({ queryKey: ['feed-stocks'] })
      queryClient.invalidateQueries({ queryKey: ['feed-stocks-for-lot'] })
      toast.success(isEditMode ? 'Consommation modifiee' : 'Consommation enregistree')
      setTimeout(() => {
        router.push(`/lots/${lotId}`)
      }, 1000)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  // Check if stock is sufficient
  const selectedStock = feedStocks?.find((s: any) => s.id === formData.feed_stock_id)
  const availableStockQty = selectedStock ? parseFloat(selectedStock.quantity_kg) : 0
  const isStockInsufficient = formData.deduct_from_stock && formData.feed_stock_id &&
    parseFloat(formData.feed_quantity_kg || '0') > availableStockQty

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.feed_quantity_kg) {
      toast.error('Entrez la quantite d\'aliment')
      return
    }
    if (formData.deduct_from_stock && !formData.feed_stock_id) {
      toast.error('Selectionnez un stock source')
      return
    }
    if (isStockInsufficient) {
      toast.error('Stock insuffisant pour cette quantite')
      return
    }
    submitEntry.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-medium text-gray-900">Consommation enregistree!</p>
        <p className="text-gray-500">Redirection...</p>
      </div>
    )
  }

  const feedKg = parseFloat(formData.feed_quantity_kg) || 0
  const feedPerBird = lot?.current_quantity && lot.current_quantity > 0
    ? (feedKg * 1000) / lot.current_quantity
    : 0

  return (
    <div className="space-y-4 lg:space-y-3 max-w-4xl">
      {/* Header compact */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/lots/${lotId}`}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alimentation</h1>
            <p className="text-sm text-gray-500">{lot?.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg">
          <Bird className="w-5 h-5 text-yellow-600" />
          <span className="text-base font-medium text-gray-900">
            {lot?.current_quantity?.toLocaleString()} - J{lot?.age_days}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-3">
        {/* Date + Quantite en ligne sur desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3">
          {/* Date */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <DatePicker
              value={formData.date}
              onChange={(newDate) => {
                setFormData({
                  date: newDate,
                  feed_quantity_kg: '',
                  feed_type: '',
                  feed_stock_id: '',
                  deduct_from_stock: false,
                })
                setIsEditMode(false)
              }}
              showShortcuts={true}
              maxDate={new Date()}
            />
            {isEditMode && (
              <div className="mt-1.5 flex items-center gap-1.5 text-yellow-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Modification</span>
              </div>
            )}
          </div>

          {/* Quantite */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wheat className="w-5 h-5 text-yellow-600" />
              <label className="text-sm font-medium text-gray-700">
                Quantite (kg)
              </label>
            </div>
            <input
              type="number"
              value={formData.feed_quantity_kg}
              onChange={(e) => setFormData(prev => ({ ...prev, feed_quantity_kg: e.target.value }))}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              step="any"
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-2xl font-bold text-center"
              required
            />
            {feedKg > 0 && (
              <p className="text-sm text-yellow-600 mt-1 text-center">
                {feedPerBird.toFixed(0)} g/oiseau
              </p>
            )}
          </div>
        </div>

        {/* Type d'aliment */}
        <div className="bg-white rounded-lg border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type d'aliment
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {FEED_TYPES.filter(f =>
              lot?.type === 'layer'
                ? ['layer', 'pre-layer'].includes(f.value)
                : ['starter', 'grower', 'finisher'].includes(f.value)
            ).map((feed) => (
              <button
                key={feed.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, feed_type: feed.value }))}
                className={cn(
                  'p-2 rounded-lg border-2 transition text-left',
                  formData.feed_type === feed.value
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="font-medium text-sm block">{feed.label}</span>
                <span className="text-xs text-gray-500 truncate block">{feed.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deduction de stock */}
        <div className="bg-white rounded-lg border p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.deduct_from_stock}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                deduct_from_stock: e.target.checked,
                feed_stock_id: e.target.checked ? prev.feed_stock_id : ''
              }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Retirer du stock</span>
          </label>

          {formData.deduct_from_stock && (
            <div className="mt-3 space-y-2">
              <select
                value={formData.feed_stock_id}
                onChange={(e) => setFormData(prev => ({ ...prev, feed_stock_id: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required={formData.deduct_from_stock}
              >
                <option value="">Selectionnez un stock source</option>
                {feedStocks?.map((stock: any) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.feed_type} - {parseFloat(stock.quantity_kg).toFixed(1)} kg
                    {stock.building_name ? ` (${stock.building_name})` : ''}
                  </option>
                ))}
              </select>

              {formData.feed_stock_id && feedKg > 0 && (() => {
                const selectedStock = feedStocks?.find((s: any) => s.id === formData.feed_stock_id)
                const availableQty = selectedStock ? parseFloat(selectedStock.quantity_kg) : 0
                const isInsufficient = feedKg > availableQty

                return (
                  <div className={cn(
                    "p-2 rounded-lg flex items-center gap-2 text-sm",
                    isInsufficient ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  )}>
                    {isInsufficient ? (
                      <>
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Insuffisant: {availableQty.toFixed(0)} kg dispo</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>OK: {availableQty.toFixed(0)} kg dispo, restera {(availableQty - feedKg).toFixed(0)} kg</span>
                      </>
                    )}
                  </div>
                )
              })()}

              {(!feedStocks || feedStocks.length === 0) && (
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-700 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Aucun stock disponible</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/lots/${lotId}`}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitEntry.isPending || !formData.feed_quantity_kg || isStockInsufficient || (formData.deduct_from_stock && !formData.feed_stock_id)}
            className="inline-flex items-center gap-2 bg-yellow-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-yellow-600 transition disabled:opacity-50"
          >
            {submitEntry.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                {isEditMode ? 'Modification...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditMode ? 'Modifier' : 'Enregistrer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
