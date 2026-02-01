'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn, getTodayInTimezone } from '@/lib/utils'
import { DatePickerCompact } from '@/components/ui/date-picker'
import { useTimezone } from '@/lib/store'

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: 'year', label: 'Cette annee' },
  { value: 'all', label: 'Tout' },
]

interface PeriodFilterProps {
  value: string
  onChange: (value: string) => void
  showCustom?: boolean
  customStart?: string
  customEnd?: string
  onCustomChange?: (start: string, end: string) => void
  className?: string
}

export function PeriodFilter({
  value,
  onChange,
  showCustom = false,
  customStart,
  customEnd,
  onCustomChange,
  className,
}: PeriodFilterProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const timezone = useTimezone()
  const today = getTodayInTimezone(timezone)

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="flex bg-gray-100 rounded-lg p-1">
        {PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition",
              value === period.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg",
              value === 'custom' ? "border-indigo-500 bg-indigo-50" : "hover:bg-gray-50"
            )}
          >
            <Calendar className="w-4 h-4" />
            {value === 'custom' && customStart && customEnd
              ? `${customStart} - ${customEnd}`
              : 'Personnalise'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showDatePicker && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border p-4 z-50">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date debut</label>
                  <DatePickerCompact
                    value={customStart || ''}
                    onChange={(date) => {
                      onCustomChange?.(date, customEnd || today)
                      onChange('custom')
                    }}
                    placeholder="Debut"
                    maxDate={new Date()}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date fin</label>
                  <DatePickerCompact
                    value={customEnd || ''}
                    onChange={(date) => {
                      onCustomChange?.(customStart || '', date)
                      onChange('custom')
                    }}
                    placeholder="Fin"
                    maxDate={new Date()}
                  />
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to calculate dates from period
export function getDateRangeFromPeriod(period: string, customStart?: string, customEnd?: string) {
  const now = new Date()
  let startDate: Date
  let endDate = now

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      endDate = customEnd ? new Date(customEnd) : now
      break
    default:
      startDate = new Date(2020, 0, 1) // All time
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}
