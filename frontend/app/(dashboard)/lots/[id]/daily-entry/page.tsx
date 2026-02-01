'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Bird, Egg, Wheat, Droplets, Scale, Skull, CheckCircle, AlertCircle, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, safeNumber, roundDecimal, getTodayInTimezone } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { MORTALITY_CAUSES, FEED_TYPES } from '@/lib/constants'
import { DatePicker } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'

export default function DailyEntryPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const lotId = params.id as string
  const timezone = useTimezone()

  const initialDate = searchParams.get('date') || getTodayInTimezone(timezone)

  const [formData, setFormData] = useState({
    date: initialDate,
    // Mortalite
    mortality_count: '',
    mortality_cause: 'unknown',
    // Oeufs
    eggs_normal: '',
    eggs_cracked: '',
    eggs_dirty: '',
    eggs_small: '',
    // Poids
    average_weight_g: '',
    sample_size: '',
    // Aliment
    feed_quantity_kg: '',
    feed_type: '',
    feed_stock_id: '',
    deduct_from_stock: false,
    // Eau
    water_liters: '',
  })
  const [error, setError] = useState('')

  // Fetch available stocks for feed
  const { data: feedStocks = [] } = useQuery({
    queryKey: ['feed-stocks-for-consumption'],
    queryFn: async () => {
      const response = await api.get('/feed/stock/all')
      return response.data
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })

  const [success, setSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const dataLoadedRef = useRef(false)  // Track if data was already loaded to prevent re-overwriting
  const userHasEditedRef = useRef(false)  // Track if user has started editing (don't overwrite their input)

  // Get lot info
  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}`)
      return response.data
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })

  // Check if data exists for selected date
  const { data: existingEntry } = useQuery({
    queryKey: ['daily-entry', lotId, formData.date],
    queryFn: async () => {
      const response = await api.get(`/lots/${lotId}/daily-entry/${formData.date}`)
      return response.data
    },
    enabled: !!lotId && !!formData.date,
    // Prevent auto-refetch which causes form values to be overwritten
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - data won't refetch automatically
  })

  // Load existing data when found - only once per date to avoid overwriting user edits
  useEffect(() => {
    // Skip if user has started editing - never overwrite their input
    if (userHasEditedRef.current) {
      return
    }
    // Skip if already loaded data for this date (prevents re-overwriting on refetch)
    if (dataLoadedRef.current) {
      return
    }

    if (existingEntry?.exists) {
      const { eggs, feed, water, weight } = existingEntry.data
      setFormData(prev => ({
        ...prev,
        eggs_normal: eggs?.eggs_normal?.toString() || '',
        eggs_cracked: eggs?.eggs_cracked?.toString() || '',
        eggs_dirty: eggs?.eggs_dirty?.toString() || '',
        eggs_small: eggs?.eggs_small?.toString() || '',
        // Round values to avoid floating-point precision display issues
        feed_quantity_kg: feed?.quantity_kg ? String(roundDecimal(safeNumber(feed.quantity_kg), 2)) : '',
        feed_type: feed?.feed_type || '',
        water_liters: water?.liters ? String(roundDecimal(safeNumber(water.liters), 2)) : '',
        average_weight_g: weight?.average_weight_g ? String(roundDecimal(safeNumber(weight.average_weight_g), 2)) : '',
        sample_size: weight?.sample_size?.toString() || '',
        // Note: don't load mortality - it's cumulative
      }))
      setIsEditMode(true)
      dataLoadedRef.current = true  // Mark as loaded
    } else if (existingEntry && !existingEntry.exists) {
      setIsEditMode(false)
      dataLoadedRef.current = true  // Mark as loaded (no data exists)
    }
  }, [existingEntry])

  const submitEntry = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        date: data.date,
      }

      // Mortalite
      if (data.mortality_count) {
        payload.mortality_count = parseInt(data.mortality_count) || 0
        payload.mortality_cause = data.mortality_cause || 'unknown'
      }

      // Oeufs
      if (data.eggs_normal || data.eggs_cracked || data.eggs_dirty || data.eggs_small) {
        payload.eggs_normal = parseInt(data.eggs_normal) || 0
        payload.eggs_cracked = parseInt(data.eggs_cracked) || 0
        payload.eggs_dirty = parseInt(data.eggs_dirty) || 0
        payload.eggs_small = parseInt(data.eggs_small) || 0
      }

      // Poids
      if (data.average_weight_g) {
        payload.average_weight_g = safeNumber(data.average_weight_g)
        payload.sample_size = parseInt(data.sample_size) || 10
      }

      // Aliment
      if (data.feed_quantity_kg) {
        payload.feed_quantity_kg = safeNumber(data.feed_quantity_kg)
        payload.feed_type = data.feed_type || null
        payload.deduct_from_stock = data.deduct_from_stock || false
        payload.feed_stock_id = data.feed_stock_id || null
      }

      // Eau
      if (data.water_liters) {
        payload.water_liters = safeNumber(data.water_liters)
      }

      // Use PUT for update, POST for create
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
      // Reset refs so new data can be loaded
      dataLoadedRef.current = false
      userHasEditedRef.current = false
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['lot', lotId] })
      queryClient.invalidateQueries({ queryKey: ['lot-history', lotId] })
      queryClient.invalidateQueries({ queryKey: ['daily-entry', lotId] })  // Important: refresh daily entry data
      queryClient.invalidateQueries({ queryKey: ['feed-stocks'] })
      queryClient.invalidateQueries({ queryKey: ['feed-stock-stats'] })
      queryClient.invalidateQueries({ queryKey: ['feed-stocks-for-consumption'] })
      toast.success(isEditMode ? 'Donnees modifiees!' : 'Donnees enregistrees!')
      setTimeout(() => {
        router.push(`/lots/${lotId}`)
      }, 1000)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.detail || 'Erreur lors de la sauvegarde'
      setError(errorMessage)
      toast.error(errorMessage)
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Reset loaded flag when date changes to allow loading new data
    if (name === 'date') {
      dataLoadedRef.current = false
      userHasEditedRef.current = false  // Reset edit flag when date changes
    } else {
      // Mark that user has started editing - don't overwrite their input
      userHasEditedRef.current = true
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation: deduct_from_stock requires feed_stock_id
    if (formData.deduct_from_stock && !formData.feed_stock_id) {
      const msg = 'Veuillez selectionner un stock source pour le retrait'
      setError(msg)
      toast.error(msg)
      return
    }

    // Validation: at least one field must be filled (excluding date)
    const hasData = formData.mortality_count ||
      formData.eggs_normal || formData.eggs_cracked || formData.eggs_dirty || formData.eggs_small ||
      formData.average_weight_g ||
      formData.feed_quantity_kg ||
      formData.water_liters

    if (!hasData) {
      const msg = 'Veuillez remplir au moins un champ avant de soumettre'
      setError(msg)
      toast.error(msg)
      return
    }

    submitEntry.mutate(formData)
  }

  const isLayer = lot?.type === 'layer'
  const isBroiler = lot?.type === 'broiler'

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
        <p className="text-lg font-medium text-gray-900">Donnees enregistrees!</p>
        <p className="text-gray-500">Redirection...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-3">
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
            <h1 className="text-xl font-bold text-gray-900">Saisie du jour</h1>
            <p className="text-sm text-gray-500">{lot?.code} - {lot?.breed || 'Bande'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
          <Bird className="w-5 h-5 text-orange-600" />
          <span className="text-base font-medium text-gray-900">
            {lot?.current_quantity?.toLocaleString()} - J{lot?.age_days}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-3">
        {/* Date + Mortalite + Eau en ligne sur desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-3">
          {/* Date */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date de la saisie
            </label>
            <DatePicker
              value={formData.date}
              onChange={(newDate) => {
                dataLoadedRef.current = false
                userHasEditedRef.current = false
                setFormData({
                  date: newDate,
                  mortality_count: '',
                  mortality_cause: 'unknown',
                  eggs_normal: '',
                  eggs_cracked: '',
                  eggs_dirty: '',
                  eggs_small: '',
                  average_weight_g: '',
                  sample_size: '',
                  feed_quantity_kg: '',
                  feed_type: '',
                  feed_stock_id: '',
                  deduct_from_stock: false,
                  water_liters: '',
                })
                setIsEditMode(false)
              }}
              showShortcuts={true}
              maxDate={new Date()}
            />
            {isEditMode && (
              <div className="mt-1.5 flex items-center gap-1.5 text-orange-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Modification</span>
              </div>
            )}
          </div>

          {/* Mortalite compact */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Skull className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Mortalite</span>
            </div>
            <input
              type="number"
              name="mortality_count"
              value={formData.mortality_count}
              onChange={handleChange}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border rounded-lg text-base font-semibold text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Eau compact */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Eau (L)</span>
            </div>
            <input
              type="number"
              name="water_liters"
              value={formData.water_liters}
              onChange={handleChange}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              step="any"
              min="0"
              className="w-full px-3 py-2 border rounded-lg text-base font-semibold text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            {formData.water_liters && lot?.current_quantity && lot.current_quantity > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {roundDecimal((safeNumber(formData.water_liters) * 1000) / lot.current_quantity, 0)} ml/oiseau
              </p>
            )}
          </div>
        </div>

        {/* Cause mortalite si necessaire */}
        {formData.mortality_count && parseInt(formData.mortality_count) > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cause probable</label>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
              {MORTALITY_CAUSES.map((cause) => (
                <button
                  key={cause.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, mortality_cause: cause.value }))}
                  className={cn(
                    'p-2 rounded-lg border-2 transition text-center',
                    formData.mortality_cause === cause.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className="text-base block">{cause.icon}</span>
                  <span className="text-xs text-gray-600 truncate block">{cause.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Oeufs - Pondeuses seulement */}
        {isLayer && (
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Egg className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900">Production d'oeufs</h2>
              {(formData.eggs_normal || formData.eggs_cracked || formData.eggs_dirty || formData.eggs_small) && (
                <span className="ml-auto text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  Total: {(parseInt(formData.eggs_normal || '0') +
                    parseInt(formData.eggs_cracked || '0') +
                    parseInt(formData.eggs_dirty || '0') +
                    parseInt(formData.eggs_small || '0')).toLocaleString()}
                  {lot?.current_quantity && lot.current_quantity > 0 && (
                    <span className="ml-1">
                      ({((parseInt(formData.eggs_normal || '0') +
                          parseInt(formData.eggs_cracked || '0') +
                          parseInt(formData.eggs_dirty || '0') +
                          parseInt(formData.eggs_small || '0')) / lot.current_quantity * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Normaux</label>
                <input
                  type="number"
                  name="eggs_normal"
                  value={formData.eggs_normal}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Feles</label>
                <input
                  type="number"
                  name="eggs_cracked"
                  value={formData.eggs_cracked}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sales</label>
                <input
                  type="number"
                  name="eggs_dirty"
                  value={formData.eggs_dirty}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Petits</label>
                <input
                  type="number"
                  name="eggs_small"
                  value={formData.eggs_small}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Poids + Aliment cote a cote sur desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Poids */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-green-500" />
              <h2 className="text-base font-semibold text-gray-900">Pesee</h2>
              {isLayer && <span className="text-xs text-gray-400">(optionnel)</span>}
              {formData.average_weight_g && (
                <span className="ml-auto text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  {roundDecimal(safeNumber(formData.average_weight_g) / 1000, 2)} kg
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Poids moyen (g)</label>
                <input
                  type="number"
                  name="average_weight_g"
                  value={formData.average_weight_g}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="1500"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Echantillon</label>
                <input
                  type="number"
                  name="sample_size"
                  value={formData.sample_size}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="10"
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Aliment */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wheat className="w-5 h-5 text-yellow-600" />
              <h2 className="text-base font-semibold text-gray-900">Alimentation</h2>
              {formData.feed_quantity_kg && lot?.current_quantity && lot.current_quantity > 0 && (
                <span className="ml-auto text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                  {roundDecimal((safeNumber(formData.feed_quantity_kg) * 1000) / lot.current_quantity, 0)} g/oiseau
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantite (kg)</label>
                <input
                  type="number"
                  name="feed_quantity_kg"
                  value={formData.feed_quantity_kg}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="50"
                  step="any"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={formData.feed_type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    feed_type: e.target.value,
                    feed_stock_id: prev.feed_type !== e.target.value ? '' : prev.feed_stock_id
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Selectionner...</option>
                  {FEED_TYPES.filter(f =>
                    lot?.type === 'layer'
                      ? ['layer', 'pre-layer'].includes(f.value)
                      : ['starter', 'grower', 'finisher'].includes(f.value)
                  ).map((feed) => (
                    <option key={feed.value} value={feed.value}>{feed.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock deduction compact */}
            {formData.feed_quantity_kg && safeNumber(formData.feed_quantity_kg) > 0 && (
              <div className="border-t pt-3 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deduct_from_stock}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deduct_from_stock: e.target.checked,
                      feed_stock_id: e.target.checked ? prev.feed_stock_id : ''
                    }))}
                    className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Retirer du stock
                  </span>
                </label>

                {formData.deduct_from_stock && (
                  <select
                    value={formData.feed_stock_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, feed_stock_id: e.target.value }))}
                    className="w-full mt-2 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required={formData.deduct_from_stock}
                  >
                    <option value="">Selectionner un stock...</option>
                    {feedStocks
                      .filter((stock: any) => !formData.feed_type || stock.feed_type === formData.feed_type)
                      .map((stock: any) => {
                        const qty = safeNumber(stock.quantity_kg)
                        const hasEnough = qty >= safeNumber(formData.feed_quantity_kg)
                        const locationLabel = stock.location_type === 'global'
                          ? 'General'
                          : stock.location_type === 'site'
                            ? stock.site_name || 'Site'
                            : stock.building_name || 'Batiment'
                        const feedTypeLabels: Record<string, string> = {
                          starter: 'Dem.',
                          grower: 'Crois.',
                          finisher: 'Fin.',
                          layer: 'Pond.',
                          'pre-layer': 'Pre-p.'
                        }
                        return (
                          <option key={stock.id} value={stock.id} disabled={!hasEnough}>
                            {feedTypeLabels[stock.feed_type] || stock.feed_type} - {locationLabel} ({qty.toFixed(0)} kg)
                            {!hasEnough && ' - Insuffisant'}
                          </option>
                        )
                      })}
                  </select>
                )}

                {formData.feed_stock_id && (() => {
                  const selectedStock = feedStocks.find((s: any) => s.id === formData.feed_stock_id)
                  if (selectedStock) {
                    const available = safeNumber(selectedStock.quantity_kg)
                    const needed = safeNumber(formData.feed_quantity_kg)
                    if (available < needed) {
                      return (
                        <div className="flex items-center gap-1.5 text-red-600 text-sm mt-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Insuffisant: {available.toFixed(0)} kg dispo</span>
                        </div>
                      )
                    } else {
                      return (
                        <div className="flex items-center gap-1.5 text-green-600 text-sm mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>OK: {available.toFixed(0)} kg dispo</span>
                        </div>
                      )
                    }
                  }
                  return null
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Error message - displayed near the button */}
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
            disabled={submitEntry.isPending}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
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
