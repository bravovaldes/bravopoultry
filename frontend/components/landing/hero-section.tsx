'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative overflow-hidden">
      {/* Floating decorative elements - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-[5%] w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 left-[30%] w-64 h-64 bg-orange-100/30 rounded-full blur-3xl animate-float-slower" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28 xl:py-36">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100/80 border border-orange-200/50 mb-6 sm:mb-8 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm font-medium text-orange-700">
              Plateforme #1 de gestion avicole
            </span>
          </div>

          {/* Title */}
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 leading-tight transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Le SaaS Avicole le Plus{' '}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Complet
            </span>{' '}
            au Monde
          </h1>

          {/* Subtitle */}
          <p
            className={`text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto px-2 transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Gerez vos elevages de poulets de chair et de pondeuses avec une plateforme
            intelligente. Suivi de production, analytics en temps reel, et predictions IA.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-6 px-4 sm:px-0 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              href="/register"
              className="w-full sm:w-auto bg-orange-500 text-white px-6 py-3.5 sm:px-8 lg:px-10 lg:py-4 rounded-xl font-semibold text-base sm:text-lg lg:text-xl hover:bg-orange-600 transition-all hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5 animate-pulse-glow"
            >
              Demarrer Gratuitement
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto border-2 border-gray-200 text-gray-700 px-6 py-3.5 sm:px-8 lg:px-10 lg:py-4 rounded-xl font-semibold text-base sm:text-lg lg:text-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Voir les Fonctionnalites
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
