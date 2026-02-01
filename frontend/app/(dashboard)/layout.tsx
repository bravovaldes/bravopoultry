'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  Warehouse,
  MapPin,
  Egg,
  Activity,
  Syringe,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  Brain,
  BookOpen,
  Bird,
} from 'lucide-react'
import { useState } from 'react'

// Navigation simplifiee - 10 items au lieu de 22
const navGroups = [
  {
    title: null,
    items: [
      { name: 'Dashboard', href: '/overview', icon: LayoutDashboard },
      { name: 'Mes Lots', href: '/lots', icon: Bird },
      { name: 'Sites', href: '/sites', icon: MapPin },
    ],
  },
  {
    title: 'Elevage',
    items: [
      { name: 'Production', href: '/production', icon: Egg },
      { name: 'Suivi technique', href: '/monitoring', icon: Activity },
      { name: 'Sante', href: '/health', icon: Syringe },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { name: 'Commercial', href: '/commercial', icon: ShoppingCart },
      { name: 'Finances', href: '/gestion-finances', icon: Wallet },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'IA',
    items: [
      { name: 'Predictions', href: '/predictions', icon: Brain },
      { name: 'Connaissances', href: '/knowledge', icon: BookOpen },
    ],
  },
]

const secondaryNav = [
  { name: 'Equipe', href: '/team', icon: Users },
  { name: 'Parametres', href: '/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, logout, _hasHydrated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Only check auth after hydration is complete
    if (_hasHydrated && !token) {
      router.push('/login')
    }
  }, [token, router, _hasHydrated])

  // Show loading while waiting for hydration or if no token
  if (!_hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/overview" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="BravoPoultry"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
              />
              <span className="font-semibold text-gray-900">BravoPoultry</span>
            </Link>
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {navGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.title && (
                    <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group.title}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              isActive
                                ? 'bg-orange-50 text-orange-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}

              <div className="pt-4 border-t">
                <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Configuration
                </p>
                <ul className="space-y-1">
                  {secondaryNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            isActive
                              ? 'bg-orange-50 text-orange-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-medium">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 px-4 lg:px-0">
              {/* Breadcrumb or search could go here */}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
