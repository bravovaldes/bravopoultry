'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Shield, Lock, KeyRound, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Email envoye!')
    } catch (error: any) {
      const detail = error.response?.data?.detail
      if (detail?.includes('attendre')) {
        setErrorMessage('Veuillez attendre 1 minute avant de reessayer.')
      } else {
        // For security, we show success even if email doesn't exist
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
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
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Email envoyé avec succès
            </h2>
            <p className="text-gray-600 text-lg">
              Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} BravoPoultry. Tous droits réservés.
            </p>
          </div>
        </div>

        {/* Right side - Confirmation */}
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

            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Email envoyé!</h1>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              Nous avons envoyé un lien de réinitialisation à <span className="font-medium text-gray-900">{email}</span>
            </p>

            <p className="text-sm text-gray-500 mb-8">
              Vous n'avez pas reçu l'email? Vérifiez votre dossier spam ou{' '}
              <button
                onClick={() => setSent(false)}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                réessayez
              </button>
            </p>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding & Security Info (hidden on mobile) */}
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
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-8">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Récupérez votre accès en toute sécurité
          </h2>
          <p className="text-gray-600 text-lg mb-10">
            Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
          </p>

          {/* Security features */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lien sécurisé</h3>
                <p className="text-sm text-gray-600">Le lien expire après 1 heure pour votre sécurité</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Protection des données</h3>
                <p className="text-sm text-gray-600">Vos informations sont chiffrées et protégées</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BravoPoultry. Tous droits réservés.
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
            <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié?</h1>
            <p className="text-gray-500 mt-2">
              Entrez votre email pour réinitialiser votre mot de passe
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="votre@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
