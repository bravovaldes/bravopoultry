'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import {
  Users, Building2, MapPin, TrendingUp, Activity, Shield,
  UserCheck, UserX, Search, RefreshCw, ChevronDown, Trash2,
  Eye, AlertTriangle, CheckCircle2, Clock, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface PlatformStats {
  total_users: number
  active_users: number
  verified_users: number
  total_organizations: number
  total_sites: number
  total_buildings: number
  total_lots: number
  active_lots: number
  total_sales_amount: number
  total_expenses_amount: number
  users_last_24h: number
  users_last_7d: number
  users_last_30d: number
}

interface UserAdminView {
  id: string
  email: string
  phone: string | null
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  organization_id: string | null
  organization_name: string | null
  created_at: string
  last_login: string | null
}

interface OrganizationAdminView {
  id: string
  name: string
  type: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  created_at: string
  user_count: number
  site_count: number
  lot_count: number
}

interface ActivityLog {
  timestamp: string
  user_email: string
  user_name: string
  organization_name: string | null
  action: string
  details: string
}

function StatCard({ title, value, icon: Icon, color, subtext }: {
  title: string
  value: number | string
  icon: any
  color: string
  subtext?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'organizations' | 'activity'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  // Check if user is superuser
  useEffect(() => {
    if (user && !user.is_superuser) {
      toast.error('Accès refusé. Réservé aux administrateurs.')
      router.push('/dashboard')
    }
  }, [user, router])

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats')
      return response.data
    },
    enabled: user?.is_superuser === true,
  })

  // Fetch users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<UserAdminView[]>({
    queryKey: ['admin-users', searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter) params.append('role', roleFilter)
      const response = await api.get(`/admin/users?${params.toString()}`)
      return response.data
    },
    enabled: user?.is_superuser === true && activeTab === 'users',
  })

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading } = useQuery<OrganizationAdminView[]>({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const response = await api.get('/admin/organizations')
      return response.data
    },
    enabled: user?.is_superuser === true && activeTab === 'organizations',
  })

  // Fetch activity
  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/activity')
      return response.data
    },
    enabled: user?.is_superuser === true && (activeTab === 'activity' || activeTab === 'overview'),
  })

  // Toggle user active
  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.patch(`/admin/users/${userId}/toggle-active`)
    },
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  })

  // Toggle superuser
  const toggleSuperuserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.patch(`/admin/users/${userId}/toggle-superuser`)
    },
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  })

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      toast.success('Utilisateur supprimé')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  })

  if (!user?.is_superuser) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Accès refusé</h2>
          <p className="text-gray-500 mt-2">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-orange-600" />
            Administration
          </h1>
          <p className="text-gray-500">Tableau de bord administrateur - Vue globale de la plateforme</p>
        </div>
        <button
          onClick={() => {
            refetchStats()
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
            queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
            { id: 'users', label: 'Utilisateurs', icon: Users },
            { id: 'organizations', label: 'Organisations', icon: Building2 },
            { id: 'activity', label: 'Activité', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total utilisateurs"
                  value={stats.total_users}
                  icon={Users}
                  color="bg-blue-500"
                  subtext={`${stats.users_last_24h} dernières 24h`}
                />
                <StatCard
                  title="Utilisateurs actifs"
                  value={stats.active_users}
                  icon={UserCheck}
                  color="bg-green-500"
                  subtext={`${stats.verified_users} vérifiés`}
                />
                <StatCard
                  title="Organisations"
                  value={stats.total_organizations}
                  icon={Building2}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Sites"
                  value={stats.total_sites}
                  icon={MapPin}
                  color="bg-indigo-500"
                />
                <StatCard
                  title="Bâtiments"
                  value={stats.total_buildings}
                  icon={Building2}
                  color="bg-cyan-500"
                />
                <StatCard
                  title="Bandes actives"
                  value={stats.active_lots}
                  icon={Activity}
                  color="bg-orange-500"
                  subtext={`${stats.total_lots} total`}
                />
                <StatCard
                  title="Ventes totales"
                  value={formatMoney(stats.total_sales_amount)}
                  icon={DollarSign}
                  color="bg-emerald-500"
                />
                <StatCard
                  title="Dépenses totales"
                  value={formatMoney(stats.total_expenses_amount)}
                  icon={TrendingUp}
                  color="bg-red-500"
                />
              </div>

              {/* Growth Stats */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Croissance des inscriptions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{stats.users_last_24h}</p>
                    <p className="text-sm text-gray-500">Dernières 24h</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{stats.users_last_7d}</p>
                    <p className="text-sm text-gray-500">7 derniers jours</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{stats.users_last_30d}</p>
                    <p className="text-sm text-gray-500">30 derniers jours</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Activity Preview */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Activité récente</h3>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {activity?.slice(0, 10).map((log, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-full ${
                      log.action === 'Inscription' ? 'bg-blue-100 text-blue-600' :
                      log.action === 'Vente' ? 'bg-green-100 text-green-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {log.action === 'Inscription' ? <UserCheck className="w-4 h-4" /> :
                       log.action === 'Vente' ? <DollarSign className="w-4 h-4" /> :
                       <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}: {log.user_name}</p>
                      <p className="text-xs text-gray-500">{log.details}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par email, nom, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Tous les rôles</option>
              <option value="owner">Propriétaire</option>
              <option value="manager">Gestionnaire</option>
              <option value="technician">Technicien</option>
              <option value="accountant">Comptable</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organisation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscription</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : users?.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                          {u.is_superuser && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Admin</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {u.organization_name || <span className="text-gray-400">Aucune</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'technician' ? 'bg-green-100 text-green-700' :
                        u.role === 'accountant' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role === 'owner' ? 'Propriétaire' :
                         u.role === 'manager' ? 'Gestionnaire' :
                         u.role === 'technician' ? 'Technicien' :
                         u.role === 'accountant' ? 'Comptable' : 'Observateur'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" /> Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <UserX className="w-3 h-3" /> Inactif
                          </span>
                        )}
                        {u.is_verified ? (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <CheckCircle2 className="w-3 h-3" /> Vérifié
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <Clock className="w-3 h-3" /> Non vérifié
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleActiveMutation.mutate(u.id)}
                          className={`p-2 rounded-lg transition ${
                            u.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={u.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => toggleSuperuserMutation.mutate(u.id)}
                          className={`p-2 rounded-lg transition ${
                            u.is_superuser
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-purple-600 hover:bg-purple-50'
                          }`}
                          title={u.is_superuser ? 'Retirer admin' : 'Rendre admin'}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ${u.email} ?`)) {
                              deleteUserMutation.mutate(u.id)
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organisation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localisation</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Utilisateurs</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sites</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bandes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Création</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orgsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : organizations?.map(org => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{org.name}</p>
                      {org.email && <p className="text-sm text-gray-500">{org.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                      {org.type || 'Non défini'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {org.city}{org.country && `, ${org.country}`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {org.user_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {org.site_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {org.lot_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(org.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Journal d'activité</h3>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activity?.map((log, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    log.action === 'Inscription' ? 'bg-blue-100 text-blue-600' :
                    log.action === 'Vente' ? 'bg-green-100 text-green-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {log.action === 'Inscription' ? <UserCheck className="w-5 h-5" /> :
                     log.action === 'Vente' ? <DollarSign className="w-5 h-5" /> :
                     <Activity className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{log.action}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{log.user_name}</span>
                      {log.organization_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{log.organization_name}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-1">{log.user_email}</p>
                  </div>
                  <div className="text-sm text-gray-400 flex-shrink-0">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
