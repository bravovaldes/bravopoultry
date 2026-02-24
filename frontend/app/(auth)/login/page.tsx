'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  BarChart3,
  TrendingUp,
  Zap,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => { setMounted(true) }, [])

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

      if (detail?.includes('verifier votre email') || detail === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email)
        setShowResendVerification(true)
        setErrorMessage(null)
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

  const stagger = (i: number) => ({
    className: `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDelay: `${i * 100}ms` },
  })

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-b from-orange-50 via-white to-white lg:from-white lg:to-white">
      {/* Left side - Desktop branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-200/30 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BravoPoultry" width={48} height={48} className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-gray-900">BravoPoultry</span>
          </Link>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            La plateforme avicole la plus complete
          </h2>
          <p className="text-gray-600 text-lg mb-10">
            Rejoignez des centaines d&apos;eleveurs qui optimisent leur production avec nos outils intelligents.
          </p>

          <div className="space-y-4">
            {[
              { icon: BarChart3, color: 'bg-orange-500', title: 'Analytics en temps reel', desc: 'Suivez vos performances avec des tableaux de bord detailles' },
              { icon: TrendingUp, color: 'bg-green-500', title: '+30% de productivite', desc: 'Nos utilisateurs ameliorent leurs resultats rapidement' },
              { icon: Zap, color: 'bg-blue-500', title: 'Predictions IA', desc: "Anticipez les problemes avant qu'ils n'arrivent" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile Header with gradient */}
        <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 pt-12 pb-20 px-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div {...stagger(0)} className={`relative text-center ${stagger(0).className}`} style={stagger(0).style}>
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Image src="/logo.png" alt="BravoPoultry" width={40} height={40} className="w-10 h-10 object-contain" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">Bon retour !</h1>
            <p className="text-orange-100 mt-1">Connectez-vous a votre compte</p>
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 lg:px-8 -mt-6 lg:mt-0">
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none pt-8 pb-6 px-6 sm:p-8 lg:p-0">
            {/* Desktop header */}
            <div className="hidden lg:block text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Bon retour !</h1>
              <p className="text-gray-500 mt-2">Connectez-vous a votre compte</p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-[fade-in_0.3s_ease-out]">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">Erreur de connexion</p>
                  <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                </div>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Email not verified warning */}
            {showResendVerification && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-5 animate-[fade-in_0.3s_ease-out]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Verifiez votre email</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Un email de verification a ete envoye a <strong>{unverifiedEmail}</strong>.
                      Cliquez sur le lien dans l&apos;email pour activer votre compte.
                    </p>
                    <p className="text-sm text-amber-600 mt-2">Pensez a verifier votre dossier spam.</p>
                    <button
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      className="mt-4 w-full bg-amber-100 text-amber-800 py-2.5 px-4 rounded-lg font-medium hover:bg-amber-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resendingEmail ? (<><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours...</>) : 'Renvoyer le lien de verification'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div {...stagger(1)}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="votre@email.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1.5">{errors.email.message}</p>}
              </div>

              <div {...stagger(2)}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1.5">{errors.password.message}</p>}
              </div>

              <div {...stagger(3)} className={`flex items-center justify-between ${stagger(3).className}`} style={stagger(3).style}>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition">Se souvenir de moi</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium transition">
                  Mot de passe oublie?
                </Link>
              </div>

              <div {...stagger(4)}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Connexion...</>
                  ) : (
                    <>Se connecter<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                  )}
                </button>
              </div>
            </form>

            <div {...stagger(5)} className={`mt-8 text-center ${stagger(5).className}`} style={stagger(5).style}>
              <p className="text-gray-500">
                Pas encore de compte?{' '}
                <Link href="/register" className="text-orange-600 hover:text-orange-700 font-semibold transition">
                  Creer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden py-4 text-center">
          <p className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} BravoPoultry</p>
        </div>
      </div>
    </div>
  )
}
