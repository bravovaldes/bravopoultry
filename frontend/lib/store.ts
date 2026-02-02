import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserTimezone, DEFAULT_TIMEZONE } from './timezone'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  organization_id?: string
  role: string
  language: string
  currency: string
  timezone?: string
  is_superuser?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  rememberMe: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: User, rememberMe?: boolean) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

// Custom storage that switches between localStorage and sessionStorage
const createAuthStorage = () => {
  return {
    getItem: (name: string) => {
      if (typeof window === 'undefined') return null
      // Check localStorage first, then sessionStorage
      const str = localStorage.getItem(name) || sessionStorage.getItem(name)
      if (!str) return null
      try {
        return JSON.parse(str)
      } catch {
        return null
      }
    },
    setItem: (name: string, value: { state: AuthState }) => {
      if (typeof window === 'undefined') return
      const stringValue = JSON.stringify(value)
      const rememberMe = value?.state?.rememberMe ?? true

      if (rememberMe) {
        // Clear sessionStorage and use localStorage
        sessionStorage.removeItem(name)
        localStorage.setItem(name, stringValue)
      } else {
        // Clear localStorage and use sessionStorage
        localStorage.removeItem(name)
        sessionStorage.setItem(name, stringValue)
      }
    },
    removeItem: (name: string) => {
      if (typeof window === 'undefined') return
      localStorage.removeItem(name)
      sessionStorage.removeItem(name)
    },
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      rememberMe: true,
      _hasHydrated: false,
      setAuth: (token, user, rememberMe = true) => {
        // Also store token separately for API interceptor
        if (rememberMe) {
          localStorage.setItem('token', token)
          sessionStorage.removeItem('token')
        } else {
          sessionStorage.setItem('token', token)
          localStorage.removeItem('token')
        }
        set({ token, user, rememberMe })
      },
      logout: () => {
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')
        set({ token: null, user: null, rememberMe: true })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'auth-storage',
      storage: createAuthStorage(),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// Site selection store
interface SiteState {
  selectedSiteId: string | null
  setSelectedSite: (siteId: string | null) => void
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      selectedSiteId: null,
      setSelectedSite: (siteId) => set({ selectedSiteId: siteId }),
    }),
    {
      name: 'site-storage',
    }
  )
)

/**
 * Hook to get user's timezone
 * Priority: user profile > browser detection > default (Africa/Douala)
 */
export function useTimezone(): string {
  const user = useAuthStore((state) => state.user)
  return getUserTimezone(user?.timezone)
}
