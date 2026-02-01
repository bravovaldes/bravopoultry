'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Shield,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Search,
  Filter,
  CheckCircle,
  Clock,
  UserCog,
  Crown,
  Eye,
  Building2,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

const ROLES = [
  { value: 'owner', label: 'Proprietaire', color: 'bg-purple-100 text-purple-700', icon: Crown },
  { value: 'manager', label: 'Gestionnaire', color: 'bg-blue-100 text-blue-700', icon: UserCog },
  { value: 'technician', label: 'Technicien', color: 'bg-green-100 text-green-700', icon: Users },
  { value: 'viewer', label: 'Observateur', color: 'bg-gray-100 text-gray-700', icon: Eye },
]

export default function TeamPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')

  // Lock body scroll when any modal is open
  useBodyScrollLock(showAddModal || showEditModal)

  // Fetch team members
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const response = await api.get('/invitations')
      return response.data
    },
  })

  const pendingInvitations = invitations?.filter((i: any) => i.status === 'pending') || []

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.post(`/invitations/${invitationId}/resend`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/invitations/${invitationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })

  // Filter users
  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = searchQuery === '' ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  }) || []

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[3]
  }

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDelete = async (userId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce membre ?')) {
      deleteMutation.mutate(userId)
    }
  }

  const isOwner = currentUser?.role === 'owner'
  const isManager = currentUser?.role === 'manager'
  const canManageTeam = isOwner || isManager

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-500">Gerez les membres de votre organisation</p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un membre
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{users?.length || 0}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Membres</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {users?.filter((u: any) => u.role === 'owner').length || 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Proprio.</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {users?.filter((u: any) => u.is_active).length || 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {pendingInvitations.length}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Attente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Role filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les roles</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Invitations */}
      {canManageTeam && pendingInvitations.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-500" />
              Invitations en attente ({pendingInvitations.length})
            </h3>
          </div>
          <div className="divide-y">
            {pendingInvitations.map((invitation: any) => {
              const roleInfo = getRoleInfo(invitation.role)
              return (
                <div key={invitation.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 truncate">
                            {invitation.first_name && invitation.last_name
                              ? `${invitation.first_name} ${invitation.last_name}`
                              : invitation.email}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{invitation.email}</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className={cn("px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1", roleInfo.color)}>
                            <roleInfo.icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{roleInfo.label}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => resendMutation.mutate(invitation.id)}
                              disabled={resendMutation.isPending}
                              className="p-1.5 sm:p-2 hover:bg-blue-100 rounded-lg"
                              title="Renvoyer"
                            >
                              <RefreshCw className={cn("w-4 h-4 text-blue-500", resendMutation.isPending && "animate-spin")} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Annuler cette invitation ?')) {
                                  cancelMutation.mutate(invitation.id)
                                }
                              }}
                              className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg"
                              title="Annuler"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Membres ({filteredUsers.length})</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun membre trouve</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user: any) => {
              const roleInfo = getRoleInfo(user.role)
              const isCurrentUser = user.id === currentUser?.id

              return (
                <div key={user.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-semibold text-base sm:text-lg">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </span>
                    </div>

                    {/* Info + Actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {/* Name and badges */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                                Vous
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-sm text-gray-500 sm:hidden">
                              {user.phone}
                            </p>
                          )}
                        </div>

                        {/* Right side - badges and actions */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          {/* Role Badge */}
                          <span className={cn("px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1", roleInfo.color)}>
                            <roleInfo.icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{roleInfo.label}</span>
                            <span className="sm:hidden">{roleInfo.label.slice(0, 4)}.</span>
                          </span>

                          {/* Status */}
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>

                          {/* Actions */}
                          {canManageTeam && !isCurrentUser && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </button>
                              {(isOwner || (isManager && user.role !== 'owner' && user.role !== 'manager')) && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Roles Legend */}
      <div className="bg-white rounded-xl border p-3 sm:p-4">
        <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          Roles et permissions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {ROLES.map((role) => (
            <div key={role.value} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <span className={cn("px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium flex items-center gap-1", role.color)}>
                  <role.icon className="w-3 h-3" />
                  {role.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">
                {role.value === 'owner' && "Acces complet, gestion equipe"}
                {role.value === 'manager' && "Gestion bandes, ventes, depenses"}
                {role.value === 'technician' && "Saisie quotidienne"}
                {role.value === 'viewer' && "Consultation uniquement"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedUser && (
        <EditMemberModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}
    </div>
  )
}

// Add Member Modal (Invitation)
function AddMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'technician',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.post('/invitations', formData)
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Invitation envoyee!</h2>
          <p className="text-gray-600">
            Un email d'invitation a ete envoye a <strong>{formData.email}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Inviter un membre</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Un email d'invitation sera envoye a cette adresse. Le membre pourra creer son compte en cliquant sur le lien.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Optionnel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="+237 6... (Optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {ROLES.filter(r => r.value !== 'owner').map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {/* Message d'erreur - pres du bouton */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Member Modal
function EditMemberModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const { user: currentUser } = useAuthStore()
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    role: user.role || 'technician',
    is_active: user.is_active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isOwner = currentUser?.role === 'owner'
  const isManager = currentUser?.role === 'manager'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/users/${user.id}`, formData)
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Modifier le membre</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={isManager && (user.role === 'owner' || user.role === 'manager')}
            >
              {/* Managers cannot assign owner role */}
              {ROLES.filter(role => isOwner || role.value !== 'owner').map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {isManager && (user.role === 'owner' || user.role === 'manager') && (
              <p className="text-xs text-gray-500 mt-1">Vous ne pouvez pas modifier le role d'un proprietaire ou gestionnaire.</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Compte actif</span>
            </label>
          </div>

          {/* Message d'erreur - pres du bouton */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
