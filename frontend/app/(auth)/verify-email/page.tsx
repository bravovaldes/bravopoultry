'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'no-token'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const token = searchParams.get('token')

  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await api.post('/auth/verify-email', {
        token: verificationToken
      })

      // Save auth data
      setAuth(response.data.access_token, response.data.user)
      setStatus('success')
      toast.success('Email verifie avec succes!')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/overview')
      }, 2000)
    } catch (error: any) {
      const detail = error.response?.data?.detail || ''

      if (detail.includes('expire')) {
        setStatus('expired')
        setErrorMessage('Ce lien de verification a expire.')
      } else if (detail.includes('deja ete utilise')) {
        setStatus('error')
        setErrorMessage('Ce lien a deja ete utilise. Vous pouvez vous connecter.')
      } else {
        setStatus('error')
        setErrorMessage(detail || 'Erreur lors de la verification.')
      }
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Veuillez entrer votre email')
      return
    }

    setResending(true)
    try {
      await api.post('/auth/resend-verification', { email })
      toast.success('Un nouveau lien de verification a ete envoye!')
    } catch (error: any) {
      const detail = error.response?.data?.detail
      if (detail?.includes('attendre')) {
        toast.error('Veuillez attendre 1 minute avant de reessayer.')
      } else if (detail?.includes('deja verifie')) {
        toast.info('Cet email est deja verifie. Vous pouvez vous connecter.')
        router.push('/login')
      } else {
        toast.error('Erreur lors de l\'envoi. Verifiez votre email.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 p-12 flex-col justify-between relative">
        {/* Decorative elements */}
        <div className="absolute top-32 right-16 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-16 w-56 h-56 bg-amber-200/40 rounded-full blur-2xl"></div>

        <div className="relative z-10">
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

        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-8">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Verification de votre email
          </h2>
          <p className="text-gray-600 text-lg">
            Une derniere etape avant d'acceder a toutes les fonctionnalites de BravoPoultry.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BravoPoultry. Tous droits reserves.
          </p>
        </div>
      </div>

      {/* Right side - Verification Status */}
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

          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification en cours...</h1>
              <p className="text-gray-600">
                Veuillez patienter pendant que nous verifions votre email.
              </p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verifie!</h1>
              <p className="text-gray-600 mb-6">
                Votre compte a ete active avec succes. Vous allez etre redirige vers le tableau de bord...
              </p>
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirection...</span>
              </div>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Erreur de verification</h1>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Link
                href="/login"
                className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition"
              >
                Aller a la connexion
              </Link>
            </>
          )}

          {/* Expired State */}
          {status === 'expired' && (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Lien expire</h1>
              <p className="text-gray-600 mb-6">
                Ce lien de verification a expire. Entrez votre email pour recevoir un nouveau lien.
              </p>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                />
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Renvoyer le lien
                    </>
                  )}
                </button>
              </div>

              <p className="mt-6 text-gray-500 text-sm">
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                  Retour a la connexion
                </Link>
              </p>
            </>
          )}

          {/* No Token State */}
          {status === 'no-token' && (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification requise</h1>
              <p className="text-gray-600 mb-6">
                Vous devez cliquer sur le lien envoye par email pour verifier votre compte.
              </p>

              <div className="bg-orange-50 rounded-xl p-6 text-left mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Vous n'avez pas recu l'email?</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Verifiez votre dossier spam</li>
                  <li>• Assurez-vous d'avoir entre la bonne adresse</li>
                  <li>• L'email peut prendre quelques minutes a arriver</li>
                </ul>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                />
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Renvoyer le lien de verification
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t">
                <p className="text-gray-600">
                  Deja verifie?{' '}
                  <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                    Se connecter
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
