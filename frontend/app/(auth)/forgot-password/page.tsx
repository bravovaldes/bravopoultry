'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Shield, Lock, KeyRound, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

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
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const stagger = (i: number) => ({
    className: `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDelay: `${i * 100}ms` },
  })

  if (sent) {
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
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Email envoye avec succes</h2>
            <p className="text-gray-600 text-lg">Verifiez votre boite de reception et suivez les instructions pour reinitialiser votre mot de passe.</p>
          </div>
          <div className="relative">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Mobile header */}
          <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-green-500 via-green-500 to-emerald-500 pt-12 pb-20 px-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-[scale-in_0.3s_ease-out]">
                <Mail className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Email envoye!</h1>
              <p className="text-green-100 mt-1">Verifiez votre boite mail</p>
            </div>
          </div>

          <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 lg:px-8 -mt-12 lg:mt-0">
            <div className="w-full max-w-md mx-auto bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none pt-8 pb-6 px-6 sm:p-8 lg:p-0 text-center">
              <div className="hidden lg:flex w-20 h-20 bg-green-100 rounded-full items-center justify-center mx-auto mb-6 animate-[scale-in_0.3s_ease-out]">
                <Mail className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-3">Email envoye!</h2>
              <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                Nous avons envoye un lien de reinitialisation a <span className="font-semibold text-gray-900">{email}</span>
              </p>

              <p className="text-sm text-gray-500 mb-8">
                Vous n&apos;avez pas recu l&apos;email? Verifiez votre dossier spam ou{' '}
                <button onClick={() => setSent(false)} className="text-orange-600 hover:text-orange-700 font-medium transition">reessayez</button>
              </p>

              <Link href="/login" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition">
                <ArrowLeft className="w-4 h-4" />Retour a la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-b from-orange-50 via-white to-white lg:from-white lg:to-white">
      {/* Left side - Desktop */}
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
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-orange-500/25">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Recuperez votre acces en toute securite</h2>
          <p className="text-gray-600 text-lg mb-10">Nous vous enverrons un lien securise pour reinitialiser votre mot de passe.</p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lien securise</h3>
                <p className="text-sm text-gray-600">Le lien expire apres 1 heure pour votre securite</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Protection des donnees</h3>
                <p className="text-sm text-gray-600">Vos informations sont chiffrees et protegees</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile Header */}
        <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 pt-12 pb-20 px-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div {...stagger(0)} className={`relative text-center ${stagger(0).className}`} style={stagger(0).style}>
            <Link href="/" className="inline-block mb-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                <KeyRound className="w-7 h-7 text-orange-500" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">Mot de passe oublie?</h1>
            <p className="text-orange-100 mt-1">Reinitialiser votre mot de passe</p>
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 lg:px-8 -mt-12 lg:mt-0">
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none pt-8 pb-6 px-6 sm:p-8 lg:p-0">
            {/* Desktop header */}
            <div className="hidden lg:block text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <KeyRound className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Mot de passe oublie?</h1>
              <p className="text-gray-500 mt-2">Entrez votre email pour reinitialiser votre mot de passe</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-[fade-in_0.3s_ease-out]">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div {...stagger(1)}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div {...stagger(2)}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Envoi...</>) : (<>Envoyer le lien<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>)}
                </button>
              </div>
            </form>

            <div {...stagger(3)} className={`mt-8 text-center ${stagger(3).className}`} style={stagger(3).style}>
              <Link href="/login" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition">
                <ArrowLeft className="w-4 h-4" />Retour a la connexion
              </Link>
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
