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
import { Check, Users, Sparkles, Mail, ArrowLeft, Loader2, AlertCircle, X } from 'lucide-react'

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
  const [loading, setLoading] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  // Show verification message after registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Branding (hidden on mobile) */}
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
            <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mb-8">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Compte cree avec succes!
            </h2>
            <p className="text-gray-600 text-lg">
              Une derniere etape: verifiez votre email pour activer votre compte et acceder a toutes les fonctionnalites.
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} BravoPoultry. Tous droits reserves.
            </p>
          </div>
        </div>

        {/* Right side - Verification Message */}
        <div className="flex-1 flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md text-center">
            <Link href="/" className="inline-flex items-center gap-3 mb-8 lg:hidden">
              <Image
                src="/logo.png"
                alt="BravoPoultry"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">BravoPoultry</span>
            </Link>

            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-orange-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifiez votre email</h1>
            <p className="text-gray-600 mb-2">
              Nous avons envoye un lien de verification a:
            </p>
            <p className="font-medium text-gray-900 mb-6">{registeredEmail}</p>

            <div className="bg-orange-50 rounded-xl p-6 text-left mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Prochaines etapes:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <span className="text-gray-700">Ouvrez votre boite mail</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <span className="text-gray-700">Cliquez sur le lien de verification</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <span className="text-gray-700">Commencez a utiliser BravoPoultry!</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Vous n'avez pas recu l'email? Verifiez votre dossier spam ou
            </p>

            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Renvoyer le lien'
              )}
            </button>

            <div className="mt-8 pt-6 border-t">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour a la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding & Social Proof (hidden on mobile) */}
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
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-orange-600 font-medium">Gratuit pour commencer</span>
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Creez votre compte en quelques minutes
          </h2>
          <p className="text-gray-600 text-lg mb-10">
            Rejoignez la communaute d'eleveurs qui transforment leur exploitation grace a nos outils.
          </p>

          {/* Benefits */}
          <div className="space-y-4 mb-10">
            {[
              'Suivi de production en temps reel',
              'Gestion financiere complete',
              'Alertes et rappels automatiques',
              'Predictions IA intelligentes',
              'Support technique inclus',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5">
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
            <p className="text-gray-700 text-sm italic">
              "BravoPoultry a transforme la gestion de ma ferme. Je recommande a tous les eleveurs !"
            </p>
            <p className="text-gray-500 text-sm mt-2">— Jean D., Eleveur au Cameroun</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BravoPoultry. Tous droits reserves.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-white py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Creer un compte</h1>
            <p className="text-gray-500 mt-2">
              Commencez gratuitement
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Alert */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">Erreur</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prenom
                </label>
                <input
                  type="text"
                  {...register('first_name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="Jean"
                />
                {errors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  {...register('last_name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="Dupont"
                />
                {errors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la ferme
              </label>
              <input
                type="text"
                {...register('organization_name')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="Ferme Avicole du Centre"
              />
              {errors.organization_name && (
                <p className="text-red-500 text-xs mt-1">{errors.organization_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telephone <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="+237 6XX XXX XXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer
                </label>
                <input
                  type="password"
                  {...register('confirm_password')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="••••••••"
                />
                {errors.confirm_password && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? 'Creation...' : 'Creer mon compte'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              En creant un compte, vous acceptez nos{' '}
              <Link href="/terms" className="text-orange-600 hover:underline">conditions d'utilisation</Link>
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Deja un compte?{' '}
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
