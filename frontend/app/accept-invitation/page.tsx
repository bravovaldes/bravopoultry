'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { CheckCircle, XCircle, Loader2, Building2, User, Shield, Mail } from 'lucide-react'
import Link from 'next/link'

interface InvitationInfo {
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  organization_name: string
  inviter_name: string
  expires_at: string
  is_valid: boolean
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietaire',
  manager: 'Gestionnaire',
  technician: 'Technicien',
  accountant: 'Comptable',
  viewer: 'Observateur',
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { setAuth } = useAuthStore()

  useEffect(() => {
    if (!token) {
      setError('Token d\'invitation manquant')
      setLoading(false)
      return
    }

    checkInvitation()
  }, [token])

  const checkInvitation = async () => {
    try {
      const response = await api.get(`/invitations/check/${token}`)
      setInvitation(response.data)

      if (response.data.first_name) {
        setFormData((prev) => ({ ...prev, first_name: response.data.first_name }))
      }
      if (response.data.last_name) {
        setFormData((prev) => ({ ...prev, last_name: response.data.last_name }))
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invitation introuvable')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await api.post('/invitations/accept', {
        token,
        password: formData.password,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
      })

      // Store auth data
      setAuth(response.data.access_token, response.data.user)
      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/overview')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'acceptation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Verification de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue!</h1>
          <p className="text-gray-600 mb-4">
            Votre compte a ete cree avec succes. Vous allez etre redirige vers le tableau de bord...
          </p>
          <div className="animate-pulse">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation invalide</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Retour a la connexion
          </Link>
        </div>
      </div>
    )
  }

  if (invitation && !invitation.is_valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation expiree</h1>
          <p className="text-gray-600 mb-6">
            Cette invitation n'est plus valide. Veuillez demander une nouvelle invitation a l'administrateur.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Retour a la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vous etes invite!</h1>
          <p className="text-gray-600 mt-2">
            <strong>{invitation?.inviter_name}</strong> vous invite a rejoindre
          </p>
        </div>

        {/* Invitation Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Organisation</p>
              <p className="font-medium text-gray-900">{invitation?.organization_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-medium text-gray-900">{ROLE_LABELS[invitation?.role || ''] || invitation?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{invitation?.email}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
              minLength={8}
              placeholder="Minimum 8 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création du compte...
              </>
            ) : (
              'Accepter et creer mon compte'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Vous avez deja un compte?{' '}
          <Link href="/login" className="text-orange-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
