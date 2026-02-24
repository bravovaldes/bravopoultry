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
import {
  Check,
  Users,
  Sparkles,
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  User,
  Lock,
  Phone,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react'

const registerSchema = z.object({
  first_name: z.string().min(2, 'Minimum 2 caracteres'),
  last_name: z.string().min(2, 'Minimum 2 caracteres'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 caracteres'),
  confirm_password: z.string(),
  organization_name: z.string().min(2, 'Nom de la ferme requis'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      await api.post('/auth/register', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        organization_name: data.organization_name,
      })

      setRegisteredEmail(data.email)
      setRegistrationComplete(true)
      toast.success('Compte cree! Verifiez votre email.')
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Une erreur est survenue lors de l\'inscription. Veuillez reessayer.'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!registeredEmail) return

    setResending(true)
    try {
      await api.post('/auth/resend-verification', { email: registeredEmail })
      toast.success('Un nouveau lien a ete envoye!')
    } catch (error: any) {
      const detail = error.response?.data?.detail
      if (detail?.includes('attendre')) {
        toast.error('Veuillez attendre 1 minute avant de reessayer.')
      } else {
        toast.error('Erreur lors de l\'envoi.')
      }
    } finally {
      setResending(false)
    }
  }

  const stagger = (i: number) => ({
    className: `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDelay: `${i * 80}ms` },
  })

  // Show verification message after registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-b from-green-50 via-white to-white lg:from-white lg:to-white">
        {/* Left side - Desktop */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-200/30 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

          <div className="relative">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="BravoPoultry" width={48} height={48} className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-gray-900">BravoPoultry</span>
            </Link>
          </div>
          <div className="relative max-w-lg">
            <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-green-500/25">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Compte cree avec succes!</h2>
            <p className="text-gray-600 text-lg">Une derniere etape: verifiez votre email pour activer votre compte.</p>
          </div>
          <div className="relative">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.</p>
          </div>
        </div>

        {/* Mobile + Desktop right */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Mobile header */}
          <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-green-500 via-green-500 to-emerald-500 pt-12 pb-20 px-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-[scale-in_0.3s_ease-out]">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Compte cree!</h1>
              <p className="text-green-100 mt-1">Verifiez votre email</p>
            </div>
          </div>

          <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 lg:px-8 -mt-12 lg:mt-0">
            <div className="w-full max-w-md mx-auto bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none pt-8 pb-6 px-6 sm:p-8 lg:p-0 text-center">
              <div className="hidden lg:block w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-[scale-in_0.3s_ease-out]">
                <Mail className="w-10 h-10 text-orange-600" />
              </div>

              <div className="lg:hidden w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail className="w-8 h-8 text-orange-600" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 lg:hidden">Verifiez votre email</h2>
              <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-3">Verifiez votre email</h2>
              <p className="text-gray-600 mb-1">Nous avons envoye un lien de verification a:</p>
              <p className="font-semibold text-gray-900 mb-6">{registeredEmail}</p>

              <div className="bg-orange-50 rounded-xl p-5 text-left mb-6 border border-orange-100">
                <h3 className="font-medium text-gray-900 mb-3">Prochaines etapes:</h3>
                <ul className="space-y-3">
                  {['Ouvrez votre boite mail', 'Cliquez sur le lien de verification', 'Commencez a utiliser BravoPoultry!'].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-white text-xs font-bold">{i + 1}</span>
                      </div>
                      <span className="text-gray-700 text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-500 mb-4">Vous n&apos;avez pas recu l&apos;email? Verifiez votre dossier spam ou</p>

              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {resending ? (<><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours...</>) : 'Renvoyer le lien'}
              </button>

              <div className="mt-6 pt-5 border-t">
                <Link href="/login" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition">
                  <ArrowLeft className="w-4 h-4" />Retour a la connexion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-orange-600 font-medium">Gratuit pour commencer</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Creez votre compte en quelques minutes</h2>
          <p className="text-gray-600 text-lg mb-10">Rejoignez la communaute d&apos;eleveurs qui transforment leur exploitation grace a nos outils.</p>

          <div className="space-y-3 mb-10">
            {['Suivi de production en temps reel', 'Gestion financiere complete', 'Alertes et rappels automatiques', 'Predictions IA intelligentes', 'Support technique inclus'].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-orange-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium">JD</div>
                <div className="w-8 h-8 bg-blue-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium">MK</div>
                <div className="w-8 h-8 bg-green-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium">AB</div>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">+500 eleveurs actifs</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm italic">&quot;BravoPoultry a transforme la gestion de ma ferme. Je recommande a tous les eleveurs !&quot;</p>
            <p className="text-gray-500 text-sm mt-2">&mdash; Jean D., Eleveur au Cameroun</p>
          </div>
        </div>

        <div className="relative">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile Header */}
        <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 pt-10 pb-20 px-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div {...stagger(0)} className={`relative text-center ${stagger(0).className}`} style={stagger(0).style}>
            <Link href="/" className="inline-flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Image src="/logo.png" alt="BravoPoultry" width={40} height={40} className="w-10 h-10 object-contain" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">Creer un compte</h1>
            <p className="text-orange-100 mt-1">Commencez gratuitement</p>
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 lg:px-8 -mt-12 lg:mt-0 pb-6">
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none pt-8 pb-5 px-5 sm:p-7 lg:p-0">
            {/* Desktop header */}
            <div className="hidden lg:block text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Creer un compte</h1>
              <p className="text-gray-500 mt-2">Commencez gratuitement</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-[fade-in_0.3s_ease-out]">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-800 text-sm font-medium">Erreur</p>
                    <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                  </div>
                  <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div {...stagger(1)} className={`grid grid-cols-2 gap-3 ${stagger(1).className}`} style={stagger(1).style}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" {...register('first_name')} className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm" placeholder="Jean" />
                  </div>
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" {...register('last_name')} className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm" placeholder="Dupont" />
                  </div>
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                </div>
              </div>

              <div {...stagger(2)}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la ferme</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" {...register('organization_name')} className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Ferme Avicole du Centre" />
                </div>
                {errors.organization_name && <p className="text-red-500 text-xs mt-1">{errors.organization_name.message}</p>}
              </div>

              <div {...stagger(3)}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" {...register('email')} className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="votre@email.com" />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div {...stagger(4)}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone <span className="text-gray-400">(optionnel)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" {...register('phone')} className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="+237 6XX XXX XXX" />
                </div>
              </div>

              <div {...stagger(5)} className={`grid grid-cols-2 gap-3 ${stagger(5).className}`} style={stagger(5).style}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} {...register('password')} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} {...register('confirm_password')} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm" placeholder="••••••••" />
                  </div>
                  {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>
              </div>

              <div {...stagger(6)}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Creation...</>) : (<>Creer mon compte<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>)}
                </button>
              </div>

              <div {...stagger(7)} className={`text-center ${stagger(7).className}`} style={stagger(7).style}>
                <p className="text-xs text-gray-500">
                  En creant un compte, vous acceptez nos{' '}
                  <Link href="/terms" className="text-orange-600 hover:underline">Conditions d&apos;utilisation</Link>
                  {' '}et notre{' '}
                  <Link href="/privacy" className="text-orange-600 hover:underline">Politique de confidentialite</Link>
                </p>
              </div>
            </form>

            <div {...stagger(8)} className={`mt-5 text-center ${stagger(8).className}`} style={stagger(8).style}>
              <p className="text-gray-500">
                Deja un compte?{' '}
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-semibold transition">Se connecter</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="lg:hidden py-4 text-center">
          <p className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} BravoPoultry</p>
        </div>
      </div>
    </div>
  )
}
