/**
 * Timezone utilities for BravoPoultry
 *
 * Handles timezone conversion for users across different countries.
 * Stores dates in UTC, displays in user's local timezone.
 */

// Common African timezones
export const AFRICAN_TIMEZONES = [
  { value: 'Africa/Douala', label: 'Cameroun (UTC+1)', offset: 1 },
  { value: 'Africa/Lagos', label: 'Nigeria (UTC+1)', offset: 1 },
  { value: 'Africa/Kinshasa', label: 'RDC - Kinshasa (UTC+1)', offset: 1 },
  { value: 'Africa/Lubumbashi', label: 'RDC - Lubumbashi (UTC+2)', offset: 2 },
  { value: 'Africa/Dakar', label: 'Sénégal (UTC+0)', offset: 0 },
  { value: 'Africa/Abidjan', label: "Côte d'Ivoire (UTC+0)", offset: 0 },
  { value: 'Africa/Bamako', label: 'Mali (UTC+0)', offset: 0 },
  { value: 'Africa/Ouagadougou', label: 'Burkina Faso (UTC+0)', offset: 0 },
  { value: 'Africa/Niamey', label: 'Niger (UTC+1)', offset: 1 },
  { value: 'Africa/Conakry', label: 'Guinée (UTC+0)', offset: 0 },
  { value: 'Africa/Lome', label: 'Togo (UTC+0)', offset: 0 },
  { value: 'Africa/Cotonou', label: 'Bénin (UTC+1)', offset: 1 },
  { value: 'Africa/Libreville', label: 'Gabon (UTC+1)', offset: 1 },
  { value: 'Africa/Brazzaville', label: 'Congo (UTC+1)', offset: 1 },
  { value: 'Africa/Bangui', label: 'Centrafrique (UTC+1)', offset: 1 },
  { value: 'Africa/Ndjamena', label: 'Tchad (UTC+1)', offset: 1 },
  { value: 'Africa/Kigali', label: 'Rwanda (UTC+2)', offset: 2 },
  { value: 'Africa/Bujumbura', label: 'Burundi (UTC+2)', offset: 2 },
  { value: 'Africa/Nairobi', label: 'Kenya (UTC+3)', offset: 3 },
  { value: 'Africa/Johannesburg', label: 'Afrique du Sud (UTC+2)', offset: 2 },
] as const

// Default timezone (Cameroon)
export const DEFAULT_TIMEZONE = 'Africa/Douala'

/**
 * Get user's timezone from profile or browser
 */
export function getUserTimezone(profileTimezone?: string | null): string {
  // Priority: profile > browser detection > default
  if (profileTimezone) {
    return profileTimezone
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Format a UTC datetime to user's local timezone
 */
export function formatDateTimeLocal(
  utcDate: string | Date | null | undefined,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDate) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(date)
  } catch {
    return '-'
  }
}

/**
 * Format a UTC datetime to user's local date only (no time)
 */
export function formatDateLocal(
  utcDate: string | Date | null | undefined,
  timezone: string
): string {
  if (!utcDate) return '-'

  // Handle date-only strings (YYYY-MM-DD) - no timezone conversion needed
  if (typeof utcDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(utcDate)) {
    const [year, month, day] = utcDate.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day))
  }

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
    }).format(date)
  } catch {
    return '-'
  }
}

/**
 * Format a UTC datetime to user's local short date (day + month only)
 */
export function formatDateShortLocal(
  utcDate: string | Date | null | undefined,
  timezone: string
): string {
  if (!utcDate) return '-'

  // Handle date-only strings (YYYY-MM-DD) - no timezone conversion needed
  if (typeof utcDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(utcDate)) {
    const [year, month, day] = utcDate.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(year, month - 1, day))
  }

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      timeZone: timezone,
    }).format(date)
  } catch {
    return '-'
  }
}

/**
 * Get current date in user's timezone (for default date inputs)
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  })
  return formatter.format(now) // Returns YYYY-MM-DD format
}

/**
 * Get current datetime in user's timezone
 */
export function getNowInTimezone(timezone: string): Date {
  const now = new Date()
  const localString = now.toLocaleString('en-US', { timeZone: timezone })
  return new Date(localString)
}

/**
 * Convert a local date to UTC for API submission
 */
export function localDateToUTC(localDate: string, timezone: string): string {
  // For date-only values (YYYY-MM-DD), no conversion needed
  // The backend stores dates without time component
  if (/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return localDate
  }

  // For datetime values, convert to UTC
  const date = new Date(localDate)
  return date.toISOString()
}

/**
 * Format relative time (e.g., "il y a 2 heures")
 */
export function formatRelativeTime(
  utcDate: string | Date | null | undefined,
  timezone: string
): string {
  if (!utcDate) return '-'

  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "à l'instant"
    if (diffMins < 60) return `il y a ${diffMins} min`
    if (diffHours < 24) return `il y a ${diffHours}h`
    if (diffDays < 7) return `il y a ${diffDays}j`

    return formatDateLocal(utcDate, timezone)
  } catch {
    return '-'
  }
}
