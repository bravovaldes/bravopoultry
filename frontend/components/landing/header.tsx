'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100/50'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={44}
              height={44}
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
            />
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              BravoPoultry
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <Link
              href="/login"
              className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium lg:text-lg transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="bg-orange-500 text-white px-3 py-1.5 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 rounded-xl font-semibold text-sm sm:text-base lg:text-lg hover:bg-orange-600 transition-all hover:shadow-lg hover:shadow-orange-500/25"
            >
              <span className="hidden sm:inline">Commencer Gratuitement</span>
              <span className="sm:hidden">S&apos;inscrire</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
