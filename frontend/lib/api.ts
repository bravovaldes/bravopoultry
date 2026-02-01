import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Check localStorage first, then sessionStorage (for "remember me" feature)
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - but NOT on login page (login returns 401 for bad credentials)
      if (typeof window !== 'undefined') {
        const isLoginPage = window.location.pathname === '/login'
        const isAuthEndpoint = error.config?.url?.includes('/auth/login')

        // Only redirect if not already on login page and not a login attempt
        if (!isLoginPage && !isAuthEndpoint) {
          localStorage.removeItem('token')
          sessionStorage.removeItem('token')
          localStorage.removeItem('auth-storage')
          sessionStorage.removeItem('auth-storage')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
