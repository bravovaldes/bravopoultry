'use client'

import * as React from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { useTimezone } from '@/lib/store'
import { getTodayInTimezone } from '@/lib/timezone'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

interface DatePickerProps {
  value?: string  // YYYY-MM-DD format
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showShortcuts?: boolean
  maxDate?: Date
  minDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  disabled = false,
  className,
  showShortcuts = true,
  maxDate,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const timezone = useTimezone()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Lock body scroll on mobile when open
  useBodyScrollLock(open && isMobile)

  // Parse value to Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [value])

  // Get today in user's timezone
  const today = React.useMemo(() => {
    const todayStr = getTodayInTimezone(timezone)
    const [year, month, day] = todayStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [timezone])

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    }
    setOpen(false)
  }

  // Shortcut buttons
  const shortcuts = [
    { label: "Aujourd'hui", date: today },
    { label: 'Hier', date: subDays(today, 1) },
    { label: 'Avant-hier', date: subDays(today, 2) },
  ]

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!selectedDate) return ''
    if (isToday(selectedDate)) return `Aujourd'hui, ${format(selectedDate, 'd MMM', { locale: fr })}`
    if (isYesterday(selectedDate)) return `Hier, ${format(selectedDate, 'd MMM', { locale: fr })}`
    return format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
  }, [selectedDate])

  // Determine if calendar should open upward
  const checkPosition = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Calendar height is approximately 350px
      setOpenUpward(spaceBelow < 350 && spaceAbove > spaceBelow)
    }
  }, [])

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      checkPosition()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, checkPosition])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left border rounded-lg transition',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400',
          !selectedDate && 'text-gray-400'
        )}
      >
        <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="flex-1 truncate capitalize">
          {displayValue || placeholder}
        </span>
      </button>

      {/* Mobile: Fixed modal overlay */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Calendar container - Modal on mobile, dropdown on desktop */}
          <div className={cn(
            // Mobile: centered modal
            "fixed sm:absolute z-50 bg-white rounded-xl shadow-lg p-3",
            "inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-auto",
            // Desktop: dropdown positioning
            "sm:w-[300px] sm:left-0",
            openUpward ? "sm:bottom-full sm:mb-1 sm:top-auto" : "sm:top-full sm:mt-1"
          )}>
            {/* Shortcuts */}
            {showShortcuts && (
              <div className="flex gap-1.5 mb-3 pb-3 border-b">
                {shortcuts.map((shortcut) => {
                  const isSelected = selectedDate &&
                    shortcut.date.getTime() === selectedDate.getTime()
                  return (
                    <button
                      key={shortcut.label}
                      type="button"
                      onClick={() => handleSelect(shortcut.date)}
                      className={cn(
                        'flex-1 px-2 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap',
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
                      )}
                    >
                      {shortcut.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Calendar */}
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={fr}
              showOutsideDays
              disabled={(date) => {
                if (maxDate && date > maxDate) return true
                if (minDate && date < minDate) return true
                return false
              }}
              modifiers={{
                today: today,
              }}
              modifiersStyles={{
                today: {
                  fontWeight: 'bold',
                  color: '#ea580c',
                },
              }}
              classNames={{
                months: 'flex flex-col',
                month: 'space-y-2',
                caption: 'flex justify-between items-center px-1 mb-2',
                caption_label: 'text-sm font-semibold capitalize',
                nav: 'flex gap-1',
                nav_button: cn(
                  'p-1.5 rounded-lg transition',
                  'hover:bg-gray-100 focus:bg-gray-100'
                ),
                nav_button_previous: '',
                nav_button_next: '',
                table: 'w-full border-collapse',
                head_row: 'flex justify-around',
                head_cell: cn(
                  'flex-1 text-[11px] font-medium text-gray-500 uppercase',
                  'flex items-center justify-center'
                ),
                row: 'flex justify-around w-full mt-1',
                cell: cn(
                  'relative p-0.5 text-center focus-within:relative flex-1',
                  'first:[&:has([aria-selected])]:rounded-l-md',
                  'last:[&:has([aria-selected])]:rounded-r-md'
                ),
                day: cn(
                  'w-9 h-9 sm:w-10 sm:h-10 p-0 font-normal text-sm rounded-lg transition',
                  'hover:bg-orange-100 focus:bg-orange-100 focus:outline-none',
                  'aria-selected:bg-orange-500 aria-selected:text-white aria-selected:font-medium',
                  'disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                ),
                day_selected: 'bg-orange-500 text-white hover:bg-orange-600',
                day_today: 'ring-1 ring-orange-300',
                day_outside: 'text-gray-400',
                day_disabled: 'text-gray-300',
                day_hidden: 'invisible',
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-5 h-5" />,
                IconRight: () => <ChevronRight className="w-5 h-5" />,
              }}
            />

            {/* Selected date info */}
            {selectedDate && (
              <div className="mt-3 pt-3 border-t text-center">
                <p className="text-xs text-gray-500">
                  Date sélectionnée
                </p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}

            {/* Close button for mobile */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="sm:hidden w-full mt-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Fermer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for forms
export function DatePickerCompact({
  value,
  onChange,
  placeholder = 'Date',
  disabled = false,
  className,
  maxDate,
}: Omit<DatePickerProps, 'showShortcuts'>) {
  const [open, setOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const timezone = useTimezone()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Lock body scroll on mobile when open
  useBodyScrollLock(open && isMobile)

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [value])

  const today = React.useMemo(() => {
    const todayStr = getTodayInTimezone(timezone)
    const [year, month, day] = todayStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [timezone])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    }
    setOpen(false)
  }

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return ''
    return format(selectedDate, 'd MMM yyyy', { locale: fr })
  }, [selectedDate])

  // Determine if calendar should open upward
  const checkPosition = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenUpward(spaceBelow < 300 && spaceAbove > spaceBelow)
    }
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      checkPosition()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, checkPosition])

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg transition',
          'focus:outline-none focus:ring-2 focus:ring-orange-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400',
          !selectedDate && 'text-gray-400'
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>{displayValue || placeholder}</span>
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Calendar container - Modal on mobile, dropdown on desktop */}
          <div className={cn(
            // Mobile: centered modal
            "fixed sm:absolute z-50 bg-white border rounded-xl shadow-lg p-3",
            "inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-auto",
            // Desktop: dropdown positioning
            "sm:w-[280px] sm:left-0",
            openUpward ? "sm:bottom-full sm:mb-1 sm:top-auto" : "sm:top-full sm:mt-1"
          )}>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={fr}
              showOutsideDays
              defaultMonth={selectedDate || today}
              disabled={(date: Date) => Boolean(maxDate && date > maxDate)}
              modifiersStyles={{
                today: { fontWeight: 'bold', color: '#ea580c' },
              }}
              classNames={{
                months: 'flex flex-col',
                month: 'space-y-2',
                caption: 'flex justify-between items-center px-1 mb-2',
                caption_label: 'text-sm font-semibold capitalize',
                nav: 'flex gap-1',
                nav_button: 'p-1.5 rounded-lg hover:bg-gray-100',
                table: 'w-full border-collapse',
                head_row: 'flex justify-around',
                head_cell: 'flex-1 text-[11px] font-medium text-gray-500 uppercase flex items-center justify-center',
                row: 'flex justify-around w-full mt-1',
                cell: 'relative p-0.5 text-center flex-1',
                day: cn(
                  'w-9 h-9 p-0 text-sm rounded-lg transition',
                  'hover:bg-orange-100 focus:outline-none',
                  'aria-selected:bg-orange-500 aria-selected:text-white',
                  'disabled:text-gray-300 disabled:hover:bg-transparent'
                ),
                day_selected: 'bg-orange-500 text-white',
                day_today: 'ring-1 ring-orange-300',
                day_outside: 'text-gray-400',
                day_disabled: 'text-gray-300',
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-5 h-5" />,
                IconRight: () => <ChevronRight className="w-5 h-5" />,
              }}
            />

            {/* Close button for mobile */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="sm:hidden w-full mt-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Fermer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
