import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Re-export timezone utilities for convenience
export {
  formatDateTimeLocal,
  formatDateLocal,
  formatDateShortLocal,
  formatRelativeTime,
  getTodayInTimezone,
  getUserTimezone,
  AFRICAN_TIMEZONES,
  DEFAULT_TIMEZONE,
} from './timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCurrency(value: number, currency = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.0', '')}M F`
  }
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 1000)}K F`
  }
  return `${formatNumber(value)} F`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  // Handle date-only strings (YYYY-MM-DD) to avoid timezone shift
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day))
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-'
  // Handle date-only strings (YYYY-MM-DD) to avoid timezone shift
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(year, month - 1, day))
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date))
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function getAgeInDays(placementDate: string, ageAtPlacement = 1): number {
  const placement = new Date(placementDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - placement.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + ageAtPlacement
}

export function getAgeInWeeks(placementDate: string, ageAtPlacement = 1): number {
  return Math.floor(getAgeInDays(placementDate, ageAtPlacement) / 7)
}

/**
 * Safely parse a number value, handling strings, numbers, null, and undefined
 * Handles both comma (French) and period (English) as decimal separators
 * Returns a number that can be used for calculations
 */
export function safeNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  // Replace comma with period for French decimal format (1219,7 -> 1219.7)
  const normalizedValue = value.replace(',', '.')
  const num = parseFloat(normalizedValue)
  return isNaN(num) ? 0 : num
}

/**
 * Round a number to a specified number of decimal places
 * Uses integer math to avoid floating-point precision issues
 */
export function roundDecimal(value: number, decimals = 2): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Sum an array of values with precision handling
 */
export function sumValues(values: (string | number | null | undefined)[]): number {
  const sum = values.reduce((acc: number, val) => acc + safeNumber(val), 0)
  return roundDecimal(sum, 2)
}

/**
 * Multiply two values with precision handling
 */
export function multiply(a: string | number | null | undefined, b: string | number | null | undefined): number {
  return roundDecimal(safeNumber(a) * safeNumber(b), 2)
}
