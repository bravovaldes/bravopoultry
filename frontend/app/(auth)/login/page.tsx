'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { BarChart3, TrendingUp, Zap, Mail, Loader2, AlertCircle, X } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setShowResendVerification(false)
    setErrorMessage(null)
    try {
      const formData = new FormData()
      formData.append('username', data.email)
      formData.append('password', data.password)

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setAuth(response.data.access_token, response.data.user, rememberMe)
      toast.success('Connexion reussie!')
      router.push('/overview')
    } catch (error: any) {
      const detail = error.response?.data?.detail

      // Check if email is not verified (handle both old and new message format)
      if (detail?.includes('verifier votre email') || detail === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email)
        setShowResendVerification(true)
        setErrorMessage(null) // Don't show error alert, show verification prompt instead
        toast.error('Veuillez verifier votre email avant de vous connecter.')
      } else {
        const message = detail || 'Une erreur est survenue lors de la connexion. Veuillez reessayer.'
        setErrorMessage(message)
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const email = unverifiedEmail || getValues('email')
    if (!email) {
      toast.error('Veuillez entrer votre email')
      return
    }

    setResendingEmail(true)
    try {
      await api.post('/auth/resend-verification', { email })
      toast.success('Un lien de verification a ete envoye a votre email!')
    } catch (error: any) {
      const detail = error.response?.data?.detail
      if (detail?.includes('attendre')) {
        toast.error('Veuillez attendre 1 minute avant de reessayer.')
      } else {
        toast.error('Erreur lors de l\'envoi.')
      }
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Features & Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-orange-50 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-gray-900">BravoPoultry</span>
          </Link>
        </div>

        <div className="max-w-lg">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            La plateforme avicole la plus complete
          </h2>
          <p className="text-gray-600 text-lg mb-10">
            Rejoignez des centaines d'eleveurs qui optimisent leur production avec nos outils intelligents.
          </p>

          {/* Features list */}
          <div className="space-y-5">
            <div className="flex items-start gap-4 bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics en temps reel</h3>
                <p className="text-sm text-gray-600">Suivez vos performances avec des tableaux de bord detailles</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">+30% de productivite</h3>
                <p className="text-sm text-gray-600">Nos utilisateurs ameliorent leurs resultats rapidement</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Predictions IA</h3>
                <p className="text-sm text-gray-600">Anticipez les problemes avant qu'ils n'arrivent</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BravoPoultry. Tous droits reserves.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 lg:hidden">
              <Image
                src="/logo.png"
                alt="BravoPoultry"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">BravoPoultry</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Bon retour !</h1>
            <p className="text-gray-500 mt-2">
              Connectez-vous a votre compte
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 text-sm font-medium">Erreur de connexion</p>
                <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Email not verified warning */}
          {showResendVerification && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Email non verifie
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Veuillez verifier votre email avant de vous connecter.
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="mt-3 text-sm font-medium text-amber-800 hover:text-amber-900 flex items-center gap-2"
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Renvoyer le lien de verification'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                Mot de passe oublie?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Pas encore de compte?{' '}
              <Link href="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Creer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
